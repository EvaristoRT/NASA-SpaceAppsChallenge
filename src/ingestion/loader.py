from typing import List, Optional
import duckdb
from loguru import logger

from config.settings import settings
from src.storage.cloud_client import CloudStorageClient
from src.storage.gdrive_client import GoogleDriveClient
from .schemas import MODIS_COLUMNS, VIIRS_COLUMNS


class RemoteFirmsLoader:
    """
    Cargador de datos FIRMS con soporte para streaming y ejecución out-of-core
    directamente desde Google Drive API, S3, GCS o disco local.
    """

    def __init__(self, db_conn: Optional[duckdb.DuckDBPyConnection] = None):
        self.conn = db_conn or duckdb.connect(database=":memory:")
        self.provider = settings.STORAGE_PROVIDER
        
        if self.provider == "gdrive":
            self.gdrive_client = None
            self.storage_client = None
        else:
            self.gdrive_client = None
            self.storage_client = CloudStorageClient()
            self.storage_client.configure_duckdb(self.conn)

    def load_from_gdrive_folder(
        self,
        folder_id: str,
        sensor: str,
        filter_aoi: bool = True,
    ) -> duckdb.DuckDBPyRelation:
        """
        Lista y descarga en caché los CSVs de una carpeta de Google Drive,
        y los carga directamente a DuckDB aplicando filtros espaciales.
        """
        if not self.gdrive_client:
            self.gdrive_client = GoogleDriveClient()

        files_meta = self.gdrive_client.list_files_in_folder(folder_id, extension=".csv")
        if not files_meta:
            raise FileNotFoundError(f"No se encontraron archivos CSV en la carpeta de Drive {folder_id}")

        cached_paths = []
        for f in files_meta:
            local_path = self.gdrive_client.download_file_to_cache(f["id"], f["name"])
            cached_paths.append(str(local_path).replace("\\", "/"))

        return self.load_stream(cached_paths, sensor=sensor, filter_aoi=filter_aoi)

    def load_stream(
        self,
        file_paths: List[str],
        sensor: str,
        filter_aoi: bool = True,
    ) -> duckdb.DuckDBPyRelation:
        """
        Crea una relación streaming en DuckDB sobre una lista de archivos remotos o locales,
        filtrando por la ventana geográfica de interés (Bounding Box) en el momento de lectura.
        """
        if not file_paths:
            raise ValueError(f"No se proporcionaron archivos para cargar del sensor {sensor}.")

        # Formatear lista de archivos para DuckDB
        paths_str = ", ".join([f"'{p}'" for p in file_paths])
        cols_schema = MODIS_COLUMNS if sensor.lower() == "modis" else VIIRS_COLUMNS

        # Construir filtro espacial temprano (Bounding Box pushdown)
        where_clauses = []
        if filter_aoi:
            where_clauses.append(
                f"latitude BETWEEN {settings.AOI_BBOX_MIN_LAT} AND {settings.AOI_BBOX_MAX_LAT}"
            )
            where_clauses.append(
                f"longitude BETWEEN {settings.AOI_BBOX_MIN_LON} AND {settings.AOI_BBOX_MAX_LON}"
            )

        # Filtro de calidad/confianza básico
        if sensor.lower() == "modis":
            where_clauses.append("confidence >= 30")  # Descartar muy baja confianza
        else:
            where_clauses.append("confidence != 'l'")  # Descartar 'low' confidence en VIIRS

        where_stmt = f"WHERE {' AND '.join(where_clauses)}" if where_clauses else ""

        query = f"""
            SELECT 
                latitude,
                longitude,
                acq_date AS date,
                year(acq_date) AS year,
                month(acq_date) AS month,
                frp,
                confidence,
                '{sensor.lower()}' AS sensor
            FROM read_csv(
                [{paths_str}],
                header=True,
                auto_detect=True
            )
            {where_stmt}
        """

        logger.info(f"Registrando vista remota para {sensor.upper()} con {len(file_paths)} fuentes.")
        return self.conn.sql(query)
