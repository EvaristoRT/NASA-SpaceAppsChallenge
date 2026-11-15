from pathlib import Path
from typing import Optional, Literal
from pydantic_settings import BaseSettings, SettingsConfigDict


class PipelineSettings(BaseSettings):
    """Configuración central del pipeline de armonización."""

    # Entorno
    ENVIRONMENT: str = "development"
    LOG_LEVEL: str = "INFO"

    # Proveedor de almacenamiento en la nube
    # Opciones: "gdrive" | "s3" | "gcs" | "azure" | "http" | "local"
    STORAGE_PROVIDER: Literal["gdrive", "s3", "gcs", "azure", "http", "local"] = "gdrive"

    # Google Drive API
    GDRIVE_AUTH_TYPE: Literal["service_account", "oauth"] = "oauth"
    GDRIVE_SERVICE_ACCOUNT_FILE: Optional[str] = "credentials/service_account.json"
    GDRIVE_CLIENT_SECRETS_FILE: Optional[str] = "credentials/client_secrets.json"
    GDRIVE_TOKEN_FILE: Optional[str] = "credentials/token.json"
    GDRIVE_MODIS_FOLDER_ID: Optional[str] = None
    GDRIVE_VIIRS_FOLDER_ID: Optional[str] = None

    # AWS S3 / MinIO / S3-compatible
    AWS_ACCESS_KEY_ID: Optional[str] = None
    AWS_SECRET_ACCESS_KEY: Optional[str] = None
    AWS_DEFAULT_REGION: str = "us-east-1"
    AWS_S3_ENDPOINT_URL: Optional[str] = None
    S3_BUCKET_NAME: Optional[str] = None

    # Google Cloud Storage
    GCS_BUCKET_NAME: Optional[str] = None
    GOOGLE_APPLICATION_CREDENTIALS: Optional[str] = None

    # Rutas remotas o locales de entrada
    REMOTE_MODIS_PATH: str = "data/raw/modis/"
    REMOTE_VIIRS_PATH: str = "data/raw/viirs/"

    # Rutas locales
    BASE_DIR: Path = Path(__file__).resolve().parent.parent
    CACHE_DIR: Path = BASE_DIR / "data" / "cache"
    OUTPUT_DIR: Path = BASE_DIR / "data" / "output"

    # Parámetros espaciales
    H3_RESOLUTION: int = 6
    AOI_BBOX_MIN_LON: float = -75.0
    AOI_BBOX_MIN_LAT: float = -56.0
    AOI_BBOX_MAX_LON: float = -53.0
    AOI_BBOX_MAX_LAT: float = -21.0

    model_config = SettingsConfigDict(
        env_file=str(Path(__file__).resolve().parent.parent / ".env"),
        env_file_encoding="utf-8",
        extra="ignore",
    )


settings = PipelineSettings()
