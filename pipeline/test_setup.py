import sys
from pathlib import Path
from loguru import logger
import pandas as pd

# Añadir raíz de data-pipeline al PYTHONPATH
sys.path.insert(0, str(Path(__file__).resolve().parent))

from config.settings import settings
from src.ingestion.loader import RemoteFirmsLoader


def test_environment_and_loader():
    logger.info("=== 1. Verificando Configuración y Entorno ===")
    logger.info(f"Entorno: {settings.ENVIRONMENT}")
    logger.info(f"Proveedor de almacenamiento configurado: {settings.STORAGE_PROVIDER}")
    logger.info(f"Resolución H3: {settings.H3_RESOLUTION}")
    logger.info(
        f"AOI BBox: Lat [{settings.AOI_BBOX_MIN_LAT}, {settings.AOI_BBOX_MAX_LAT}], "
        f"Lon [{settings.AOI_BBOX_MIN_LON}, {settings.AOI_BBOX_MAX_LON}]"
    )

    logger.info("\n=== 2. Creando datos de prueba locales para validar el motor de streaming ===")
    cache_dir = settings.BASE_DIR / "data" / "cache"
    cache_dir.mkdir(parents=True, exist_ok=True)
    sample_csv = cache_dir / "sample_modis_test.csv"

    # Datos mock representativos de NASA FIRMS MODIS
    mock_data = pd.DataFrame(
        [
            {
                "latitude": -41.13,
                "longitude": -71.30,
                "brightness": 325.5,
                "scan": 1.1,
                "track": 1.0,
                "acq_date": "2026-07-15",
                "acq_time": "1430",
                "satellite": "Terra",
                "instrument": "MODIS",
                "confidence": 85,
                "version": "6.1NRT",
                "bright_t31": 290.0,
                "frp": 45.2,
                "daynight": "D",
            },
            # Punto fuera del AOI (debe ser filtrado automáticamente)
            {
                "latitude": 10.0,
                "longitude": -10.0,
                "brightness": 310.0,
                "scan": 1.0,
                "track": 1.0,
                "acq_date": "2026-07-15",
                "acq_time": "1430",
                "satellite": "Terra",
                "instrument": "MODIS",
                "confidence": 90,
                "version": "6.1NRT",
                "bright_t31": 285.0,
                "frp": 20.0,
                "daynight": "D",
            },
        ]
    )
    mock_data.to_csv(sample_csv, index=False)
    logger.info(f"Archivo de prueba generado en: {sample_csv}")

    logger.info("\n=== 3. Probando Ingesta y Pushdown Filter con DuckDB ===")
    loader = RemoteFirmsLoader()
    relation = loader.load_stream(
        file_paths=[str(sample_csv).replace("\\", "/")],
        sensor="modis",
        filter_aoi=True,
    )

    df_result = relation.df()
    logger.info("Resultado de la consulta streaming filtrada:")
    print(df_result)

    assert len(df_result) == 1, "El filtro de AOI debería haber retenido exactamente 1 registro."
    logger.success("✔ Todas las verificaciones del Paso 1 pasaron exitosamente.")


if __name__ == "__main__":
    test_environment_and_loader()
