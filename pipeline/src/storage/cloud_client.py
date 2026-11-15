from typing import List
from loguru import logger
import fsspec
import duckdb

from config.settings import settings
from .base import BaseStorageClient


class CloudStorageClient(BaseStorageClient):
    """Cliente unificado para acceso a datos en la nube (S3, GCS, HTTP) o local."""

    def __init__(self):
        self.provider = settings.STORAGE_PROVIDER
        self.fs = self._init_filesystem()

    def _init_filesystem(self):
        if self.provider == "s3":
            storage_options = {}
            if settings.AWS_ACCESS_KEY_ID and settings.AWS_SECRET_ACCESS_KEY:
                storage_options["key"] = settings.AWS_ACCESS_KEY_ID
                storage_options["secret"] = settings.AWS_SECRET_ACCESS_KEY
            if settings.AWS_DEFAULT_REGION:
                storage_options["client_kwargs"] = {"region_name": settings.AWS_DEFAULT_REGION}
            if settings.AWS_S3_ENDPOINT_URL:
                storage_options["endpoint_url"] = settings.AWS_S3_ENDPOINT_URL
            return fsspec.filesystem("s3", **storage_options)

        elif self.provider == "gcs":
            storage_options = {}
            if settings.GOOGLE_APPLICATION_CREDENTIALS:
                storage_options["token"] = settings.GOOGLE_APPLICATION_CREDENTIALS
            return fsspec.filesystem("gcs", **storage_options)

        elif self.provider == "http":
            return fsspec.filesystem("http")

        else:
            return fsspec.filesystem("file")

    def list_files(self, prefix: str, extension: str = ".csv") -> List[str]:
        """Lista las rutas de los archivos en el prefijo dado."""
        try:
            files = self.fs.glob(f"{prefix}*{extension}")
            # Si el protocolo no viene en la ruta glob, agregarlo para DuckDB
            if self.provider == "s3":
                files = [f if f.startswith("s3://") else f"s3://{f}" for f in files]
            elif self.provider == "gcs":
                files = [f if f.startswith("gcs://") else f"gcs://{f}" for f in files]
            logger.info(f"Encontrados {len(files)} archivos bajo el prefijo: {prefix}")
            return files
        except Exception as e:
            logger.error(f"Error al listar archivos bajo {prefix}: {e}")
            return []

    def configure_duckdb(self, conn: duckdb.DuckDBPyConnection) -> None:
        """
        Configura DuckDB con extensiones 'httpfs' y credenciales para lectura
        out-of-core directa desde buckets en la nube.
        """
        try:
            conn.execute("INSTALL httpfs; LOAD httpfs;")
            if self.provider == "s3":
                if settings.AWS_ACCESS_KEY_ID and settings.AWS_SECRET_ACCESS_KEY:
                    conn.execute(f"SET s3_access_key_id='{settings.AWS_ACCESS_KEY_ID}';")
                    conn.execute(f"SET s3_secret_access_key='{settings.AWS_SECRET_ACCESS_KEY}';")
                if settings.AWS_DEFAULT_REGION:
                    conn.execute(f"SET s3_region='{settings.AWS_DEFAULT_REGION}';")
                if settings.AWS_S3_ENDPOINT_URL:
                    conn.execute(f"SET s3_endpoint='{settings.AWS_S3_ENDPOINT_URL}';")
                    conn.execute("SET s3_url_style='path';")
                logger.info("DuckDB configurado exitosamente para acceso remoto S3/HTTP.")
        except Exception as e:
            logger.warning(f"No se pudo inicializar la extensión httpfs en DuckDB: {e}")
