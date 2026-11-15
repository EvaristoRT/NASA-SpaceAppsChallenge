import sys
from pathlib import Path
from loguru import logger

# Añadir raíz de data-pipeline al PYTHONPATH
sys.path.insert(0, str(Path(__file__).resolve().parent))

from config.settings import settings
from src.storage.gdrive_client import GoogleDriveClient


def test_gdrive_connection():
    logger.info("=== Probando Conexión con Google Drive API ===")
    logger.info(f"MODIS Folder ID: {settings.GDRIVE_MODIS_FOLDER_ID}")
    logger.info(f"VIIRS Folder ID: {settings.GDRIVE_VIIRS_FOLDER_ID}")

    client = GoogleDriveClient()

    # 1. Explorar Carpeta MODIS (Buscando archivos de Argentina y Chile como caso de estudio)
    if settings.GDRIVE_MODIS_FOLDER_ID:
        logger.info("\nConsultando archivos en carpeta MODIS (recursivo por subcarpetas de años)...")
        modis_files = client.list_files_in_folder(
            settings.GDRIVE_MODIS_FOLDER_ID,
            extension=".csv",
            name_filter="Argentina",
            recursive=True,
        )
        logger.info(f"Total archivos de MODIS para Argentina encontrados: {len(modis_files)}")
        for f in modis_files[:8]:
            size_mb = int(f.get("size", 0)) / (1024 * 1024)
            logger.info(f" - {f['name']} ({size_mb:.2f} MB)")
        if len(modis_files) > 8:
            logger.info(f" ... y {len(modis_files) - 8} archivos más.")

    # 2. Explorar Carpeta VIIRS
    if settings.GDRIVE_VIIRS_FOLDER_ID:
        logger.info("\nConsultando archivos en carpeta VIIRS...")
        viirs_files = client.list_files_in_folder(
            settings.GDRIVE_VIIRS_FOLDER_ID,
            extension=".csv",
            recursive=True,
        )
        logger.info(f"Total archivos CSV encontrados en VIIRS: {len(viirs_files)}")
        for f in viirs_files[:5]:
            size_mb = int(f.get("size", 0)) / (1024 * 1024)
            logger.info(f" - {f['name']} ({size_mb:.2f} MB)")

    logger.success("✔ Conexión con Google Drive verificada exitosamente.")


if __name__ == "__main__":
    test_gdrive_connection()
