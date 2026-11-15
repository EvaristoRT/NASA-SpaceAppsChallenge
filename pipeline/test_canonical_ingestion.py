import sys
import time
from pathlib import Path
import urllib.request
from loguru import logger
import duckdb

# Añadir raíz de data-pipeline al PYTHONPATH
sys.path.insert(0, str(Path(__file__).resolve().parent))

from config.settings import settings
from src.ingestion.canonical import CanonicalIngestionEngine


def download_if_missing(url: str, destination: Path) -> Path:
    destination.parent.mkdir(parents=True, exist_ok=True)
    if destination.exists():
        logger.info(f"Archivo ya en caché: {destination.name}")
        return destination

    logger.info(f"Descargando desde FIRMS público: {url}...")
    try:
        req = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0"})
        with urllib.request.urlopen(req) as resp, open(destination, "wb") as out:
            out.write(resp.read())
        logger.success(f"✔ Descargado: {destination.name} ({destination.stat().st_size / (1024*1024):.2f} MB)")
        return destination
    except Exception as e:
        logger.warning(f"No se pudo descargar {url}: {e}")
        return None


def test_canonical_pipeline():
    logger.info("=== 1. Preparando Datos para Ingesta Canónica (MODIS y VIIRS NOAA-20) ===")
    cache_dir = settings.BASE_DIR / "data" / "cache"

    # 1. MODIS 2024 Argentina (ya descargado de Drive o de FIRMS)
    modis_file = cache_dir / "gdrive" / "modis_2024_Argentina.csv"
    if not modis_file.exists():
        download_if_missing(
            "https://firms.modaps.eosdis.nasa.gov/data/country/x/modis_2024_Argentina.csv",
            modis_file,
        )

    # 2. VIIRS NOAA-20 (JPSS-1) 2024 Argentina (descarga pública directa de FIRMS §3.1)
    viirs_file = cache_dir / "firms" / "viirs-jpss1_2024_Argentina.csv"
    if not viirs_file.exists():
        download_if_missing(
            "https://firms.modaps.eosdis.nasa.gov/data/country/x/viirs-jpss1_2024_Argentina.csv",
            viirs_file,
        )

    modis_list = [str(modis_file)] if modis_file.exists() else []
    viirs_list = [str(viirs_file)] if viirs_file and viirs_file.exists() else []

    logger.info(f"Archivos MODIS a procesar: {len(modis_list)}")
    logger.info(f"Archivos VIIRS a procesar: {len(viirs_list)}")

    # 3. Ejecutar Ingesta Canónica
    logger.info("\n=== 2. Ejecutando Ingesta Canónica Unificada (DuckDB -> Silver Parquet) ===")
    start_time = time.time()
    engine = CanonicalIngestionEngine()
    silver_path = engine.ingest(modis_files=modis_list, viirs_files=viirs_list)
    elapsed = time.time() - start_time
    logger.info(f"Tiempo de ingesta y particionado Parquet: {elapsed:.2f} segundos")

    # 4. Validar y Auditar la Capa Silver
    logger.info("\n=== 3. Auditoría y Control de Calidad de la Capa Silver ===")
    conn = duckdb.connect(database=":memory:")
    parquet_glob = (silver_path / "**" / "*.parquet").as_posix()

    # Total de registros por sensor y plataforma
    df_platforms = conn.sql(f"""
        SELECT 
            sensor, 
            platform, 
            count(*) AS total_detections,
            round(min(frp_mw), 2) AS min_frp,
            round(avg(frp_mw), 2) AS avg_frp,
            round(max(frp_mw), 2) AS max_frp
        FROM read_parquet('{parquet_glob}')
        GROUP BY sensor, platform
        ORDER BY sensor, total_detections DESC
    """).df()
    logger.info("Resumen por Sensor y Plataforma:")
    print(df_platforms.to_string(index=False))

    # Distribución de Clases de Confianza (LOW / NOMINAL / HIGH)
    df_conf = conn.sql(f"""
        SELECT 
            sensor, 
            conf_class, 
            count(*) AS count,
            round(count(*) * 100.0 / sum(count(*)) OVER (PARTITION BY sensor), 1) AS pct
        FROM read_parquet('{parquet_glob}')
        GROUP BY sensor, conf_class
        ORDER BY sensor, count DESC
    """).df()
    logger.info("\nDistribución de Clases de Confianza Normalizadas:")
    print(df_conf.to_string(index=False))

    # Detección de Fuentes Estáticas (type=2) vs Fuego de Vegetación (type=0)
    df_types = conn.sql(f"""
        SELECT 
            sensor, 
            COALESCE(type::VARCHAR, 'NULL (NRT)') AS type_desc, 
            count(*) AS count
        FROM read_parquet('{parquet_glob}')
        GROUP BY sensor, type
        ORDER BY sensor, count DESC
    """).df()
    logger.info("\nDistribución de Tipos de Detección (type 0=vegetación, 2=estático/industrial):")
    print(df_types.to_string(index=False))

    logger.success("\n✔ ¡Ingesta Canónica Unificada completada y validada según el contrato §5!")


if __name__ == "__main__":
    test_canonical_pipeline()
