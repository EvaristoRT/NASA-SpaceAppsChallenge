import sys
from pathlib import Path
from loguru import logger
import pandas as pd

# Añadir raíz de data-pipeline al PYTHONPATH
sys.path.insert(0, str(Path(__file__).resolve().parent))

from config.settings import settings
from src.ingestion.loader import RemoteFirmsLoader
from src.storage.gdrive_client import GoogleDriveClient
from indexing.h3_indexer import H3SpatialIndexer


def test_h3_indexing_with_real_data():
    logger.info("=== 1. Iniciando Prueba del Módulo de Indexación Hexagonal Uber H3 ===")
    logger.info(f"Resolución configurada: {settings.H3_RESOLUTION} (~36 km² por celda)")

    # 1. Obtener un archivo real de MODIS desde Google Drive (o desde caché local si ya existe)
    cache_dir = settings.CACHE_DIR / "gdrive"
    target_file = cache_dir / "modis_2024_Argentina.csv"

    if not target_file.exists():
        logger.info("Descargando muestra real de Google Drive: 'modis_2024_Argentina.csv'...")
        client = GoogleDriveClient()
        files = client.list_files_in_folder(
            folder_id=settings.GDRIVE_MODIS_FOLDER_ID,
            extension=".csv",
            name_filter="modis_2024_Argentina.csv",
            recursive=True,
        )

        if not files:
            raise FileNotFoundError("No se encontró 'modis_2024_Argentina.csv' en la carpeta de Drive.")

        file_meta = files[0]
        target_file = client.download_file_to_cache(file_meta["id"], file_meta["name"])
    else:
        logger.info(f"Usando archivo ya disponible en caché: {target_file}")

    # 2. Cargar datos aplicando el filtro de Bounding Box con DuckDB
    logger.info("\n=== 2. Ingesta y filtrado espacial temprano con DuckDB ===")
    loader = RemoteFirmsLoader()
    raw_relation = loader.load_stream(
        file_paths=[str(target_file).replace("\\", "/")],
        sensor="modis",
        filter_aoi=True,
    )

    total_filtered_rows = raw_relation.count("*").fetchall()[0][0]
    logger.info(f"Total de detecciones crudas retenidas tras filtro AOI: {total_filtered_rows:,}")

    # 3. Indexar en Grilla Hexagonal H3 y agregar espacio-temporalmente
    logger.info("\n=== 3. Proyectando a celdas hexagonales H3 y calculando decadias ===")
    indexer = H3SpatialIndexer(resolution=settings.H3_RESOLUTION)
    aggregated_relation = indexer.aggregate_hotspots(raw_relation, db_conn=loader.conn)

    # 4. Obtener resultados consolidados
    df_result = aggregated_relation.limit(10).df()

    logger.info("\nTop 10 celdas H3 con mayor actividad de quemas:")
    print(df_result[["h3_index", "date", "year", "month", "dekad", "modis_raw_count", "raw_frp_mw"]])

    # 5. Probar utilidades de geometría para mapas (Deck.gl / MapLibre)
    top_cell = df_result.iloc[0]["h3_index"]
    centroid = indexer.get_hexagon_centroid(top_cell)
    geojson_poly = indexer.get_hexagon_geojson_polygon(top_cell)

    logger.info(f"\nHexágono con mayor actividad: {top_cell}")
    logger.info(f"Centroide (Lat, Lon): {centroid}")
    logger.info(f"GeoJSON Polygon para visualización: {geojson_poly['coordinates'][0][:3]} ... (cerrado)")

    logger.success("\n✔ ¡Módulo de Indexación Hexagonal Uber H3 validado con éxito!")


if __name__ == "__main__":
    test_h3_indexing_with_real_data()
