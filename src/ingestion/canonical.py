from pathlib import Path
from typing import List, Optional, Union
import duckdb
from loguru import logger

from config.settings import settings


class CanonicalIngestionEngine:
    """
    Motor de ingesta canónica de NASA FIRMS (MODIS y VIIRS).
    Unifica los esquemas heterogéneos (15 y 13 columnas) en una tabla 'Silver'
    estandarizada en formato Parquet particionado por (year, month).
    """

    def __init__(self, db_conn: Optional[duckdb.DuckDBPyConnection] = None):
        self.conn = db_conn or duckdb.connect(database=":memory:")
        self.silver_dir = settings.BASE_DIR / "data" / "silver"
        self.silver_dir.mkdir(parents=True, exist_ok=True)

    def ingest(
        self,
        modis_files: Optional[List[str]] = None,
        viirs_files: Optional[List[str]] = None,
        output_dir: Optional[Union[str, Path]] = None,
    ) -> Path:
        """
        Ejecuta la ingesta unificada y guarda el resultado en Parquet particionado.
        """
        target_dir = Path(output_dir) if output_dir else self.silver_dir
        target_dir.mkdir(parents=True, exist_ok=True)

        select_queries = []

        # 1. Ingesta de MODIS
        if modis_files:
            modis_paths_str = ", ".join([f"'{Path(p).as_posix()}'" for p in modis_files])
            logger.info(f"Configurando vista canónica para {len(modis_files)} archivo(s) de MODIS...")
            modis_query = f"""
                SELECT
                    latitude AS lat,
                    longitude AS lon,
                    strptime(acq_date::VARCHAR || lpad(acq_time::VARCHAR, 4, '0'), '%Y-%m-%d%H%M') AS acq_ts,
                    'MODIS' AS sensor,
                    CASE 
                        WHEN satellite IN ('Terra', 'T') THEN 'TERRA'
                        WHEN satellite IN ('Aqua', 'A') THEN 'AQUA'
                        ELSE UPPER(satellite::VARCHAR)
                    END AS platform,
                    CASE 
                        WHEN TRY_CAST(confidence AS INT) < 30 THEN 'LOW'
                        WHEN TRY_CAST(confidence AS INT) < 80 THEN 'NOMINAL'
                        ELSE 'HIGH'
                    END AS conf_class,
                    TRY_CAST(confidence AS INT) AS conf_num,
                    TRY_CAST(frp AS DOUBLE) AS frp_mw,
                    TRY_CAST(brightness AS DOUBLE) AS bright_k,
                    TRY_CAST(bright_t31 AS DOUBLE) AS bright2_k,
                    TRY_CAST(scan AS DOUBLE) AS scan_km,
                    TRY_CAST(track AS DOUBLE) AS track_km,
                    (TRY_CAST(scan AS DOUBLE) * TRY_CAST(track AS DOUBLE)) AS px_area_km2,
                    daynight::VARCHAR AS daynight,
                    TRY_CAST(type AS INT) AS type,
                    (version::VARCHAR LIKE '%NRT%') AS is_nrt,
                    version::VARCHAR AS collection,
                    filename AS src_file
                FROM read_csv_auto(
                    [{modis_paths_str}],
                    filename=true,
                    union_by_name=true
                )
            """
            select_queries.append(modis_query)

        # 2. Ingesta de VIIRS (S-NPP, NOAA-20, NOAA-21)
        if viirs_files:
            viirs_paths_str = ", ".join([f"'{Path(p).as_posix()}'" for p in viirs_files])
            logger.info(f"Configurando vista canónica para {len(viirs_files)} archivo(s) de VIIRS...")
            viirs_query = f"""
                SELECT
                    latitude AS lat,
                    longitude AS lon,
                    strptime(acq_date::VARCHAR || lpad(acq_time::VARCHAR, 4, '0'), '%Y-%m-%d%H%M') AS acq_ts,
                    'VIIRS' AS sensor,
                    CASE 
                        WHEN satellite = 'N' THEN 'SNPP'
                        WHEN satellite IN ('N20', 'NOAA-20') THEN 'NOAA20'
                        WHEN satellite IN ('N21', 'NOAA-21') THEN 'NOAA21'
                        ELSE UPPER(satellite::VARCHAR)
                    END AS platform,
                    CASE LOWER(confidence::VARCHAR)
                        WHEN 'l' THEN 'LOW'
                        WHEN 'low' THEN 'LOW'
                        WHEN 'n' THEN 'NOMINAL'
                        WHEN 'nominal' THEN 'NOMINAL'
                        WHEN 'h' THEN 'HIGH'
                        WHEN 'high' THEN 'HIGH'
                        ELSE 'NOMINAL'
                    END AS conf_class,
                    NULL::INT AS conf_num,
                    TRY_CAST(frp AS DOUBLE) AS frp_mw,
                    TRY_CAST(bright_ti4 AS DOUBLE) AS bright_k,
                    TRY_CAST(bright_ti5 AS DOUBLE) AS bright2_k,
                    TRY_CAST(scan AS DOUBLE) AS scan_km,
                    TRY_CAST(track AS DOUBLE) AS track_km,
                    (TRY_CAST(scan AS DOUBLE) * TRY_CAST(track AS DOUBLE)) AS px_area_km2,
                    daynight::VARCHAR AS daynight,
                    TRY_CAST(type AS INT) AS type,
                    (version::VARCHAR LIKE '%NRT%') AS is_nrt,
                    version::VARCHAR AS collection,
                    filename AS src_file
                FROM read_csv_auto(
                    [{viirs_paths_str}],
                    filename=true,
                    union_by_name=true
                )
            """
            select_queries.append(viirs_query)

        if not select_queries:
            raise ValueError("Debes proporcionar al menos un archivo de MODIS o VIIRS para ingerir.")

        unified_sql = " UNION ALL ".join(select_queries)

        export_sql = f"""
            COPY (
                SELECT 
                    *,
                    year(acq_ts) AS year,
                    month(acq_ts) AS month
                FROM ({unified_sql})
            ) TO '{target_dir.as_posix()}' (
                FORMAT PARQUET, 
                PARTITION_BY (year, month), 
                OVERWRITE_OR_IGNORE
            );
        """

        logger.info(f"Escribiendo tabla Silver particionada en: {target_dir}")
        self.conn.execute(export_sql)
        logger.success(f"✔ Ingesta canónica completada exitosamente en {target_dir}")
        return target_dir

    def get_silver_relation(self, silver_path: Optional[Union[str, Path]] = None) -> duckdb.DuckDBPyRelation:
        """
        Retorna una relación de DuckDB sobre los archivos Parquet particionados.
        """
        path = Path(silver_path) if silver_path else self.silver_dir
        pattern = (path / "**" / "*.parquet").as_posix()
        return self.conn.sql(f"SELECT * FROM read_parquet('{pattern}')")
