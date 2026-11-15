from typing import List, Dict, Any, Tuple, Optional
import h3
import duckdb
import pandas as pd
from loguru import logger

from config.settings import settings


class H3SpatialIndexer:
    """
    Módulo para la indexación espacial en grilla hexagonal Uber H3
    y agregación espacio-temporal de focos de calor (MODIS y VIIRS).
    """

    def __init__(self, resolution: Optional[int] = None):
        # Resolución por defecto: 6 (~36 km² por hexágono)
        self.resolution = resolution or settings.H3_RESOLUTION

    @staticmethod
    def latlng_to_h3(lat: float, lon: float, resolution: int = 6) -> str:
        """Convierte coordenadas geográficas WGS84 a un índice H3 (v4)."""
        return h3.latlng_to_cell(lat, lon, resolution)

    @staticmethod
    def compute_dekad(day: int) -> int:
        """
        Calcula la década mensual (1 a 3):
        - Días 1 a 10: 1
        - Días 11 a 20: 2
        - Días 21 al fin de mes: 3
        """
        if day <= 10:
            return 1
        elif day <= 20:
            return 2
        return 3

    @staticmethod
    def compute_annual_dekad(month: int, day: int) -> int:
        """Calcula la década anual continua (1 a 36)."""
        dekad_in_month = 1 if day <= 10 else (2 if day <= 20 else 3)
        return (month - 1) * 3 + dekad_in_month

    def get_hexagon_centroid(self, h3_index: str) -> Tuple[float, float]:
        """Retorna el centroide de la celda (latitud, longitud)."""
        return h3.cell_to_latlng(h3_index)

    def get_hexagon_geojson_polygon(self, h3_index: str) -> Dict[str, Any]:
        """
        Retorna la geometría en formato GeoJSON Polygon (coordenadas [lon, lat])
        para su renderizado en MapLibre / Deck.gl.
        """
        boundary = h3.cell_to_boundary(h3_index)
        # H3 retorna (lat, lng), GeoJSON requiere [lng, lat] cerrado
        coordinates = [[lng, lat] for lat, lng in boundary]
        if coordinates:
            coordinates.append(coordinates[0])  # Cerrar el anillo
        return {
            "type": "Polygon",
            "coordinates": [coordinates],
        }

    def index_dataframe(self, df: pd.DataFrame) -> pd.DataFrame:
        """
        Asigna el índice H3 y las variables temporales a un DataFrame de pandas.
        """
        if df.empty:
            return df

        df = df.copy()
        res = self.resolution

        # Vectorización rápida de H3
        df["h3_index"] = [
            h3.latlng_to_cell(lat, lon, res)
            for lat, lon in zip(df["latitude"].values, df["longitude"].values)
        ]

        # Asegurar formato de fecha
        if not pd.api.types.is_datetime64_any_dtype(df["date"]):
            df["date"] = pd.to_datetime(df["date"])

        df["day"] = df["date"].dt.day
        df["dekad"] = df["day"].apply(self.compute_dekad)
        df["annual_dekad"] = [
            self.compute_annual_dekad(m, d)
            for m, d in zip(df["month"].values, df["day"].values)
        ]
        return df

    def aggregate_hotspots(
        self,
        duckdb_relation: duckdb.DuckDBPyRelation,
        db_conn: Optional[duckdb.DuckDBPyConnection] = None,
    ) -> duckdb.DuckDBPyRelation:
        """
        Ejecuta la agregación espacio-temporal sobre una relación de DuckDB.
        Agrupa por celda H3, fecha diaria, mes y década, calculando conteos crudos y FRP.
        """
        conn = db_conn or duckdb.connect(database=":memory:")
        res = self.resolution

        # Registrar la función UDF en DuckDB para vectorización directa con tipo de retorno explícito
        def h3_func(lat, lon):
            if lat is None or lon is None:
                return None
            return h3.latlng_to_cell(float(lat), float(lon), res)

        try:
            conn.create_function("latlng_to_h3_udf", h3_func, return_type="VARCHAR")
        except Exception:
            pass  # Ya registrada en la conexión

        # Registrar relación como vista en la conexión DuckDB
        conn.register("raw_stream_view", duckdb_relation)

        query = f"""
            WITH points_with_h3 AS (
                SELECT 
                    latlng_to_h3_udf(latitude, longitude) AS h3_index,
                    date,
                    year,
                    month,
                    day(date) AS day,
                    CASE 
                        WHEN day(date) <= 10 THEN 1
                        WHEN day(date) <= 20 THEN 2
                        ELSE 3
                    END AS dekad,
                    ((month - 1) * 3 + CASE 
                        WHEN day(date) <= 10 THEN 1
                        WHEN day(date) <= 20 THEN 2
                        ELSE 3
                    END) AS annual_dekad,
                    sensor,
                    frp,
                    confidence
                FROM raw_stream_view
            )
            SELECT 
                h3_index,
                date,
                year,
                month,
                dekad,
                annual_dekad,
                COUNT(*) FILTER (WHERE lower(sensor) = 'modis') AS modis_raw_count,
                COUNT(*) FILTER (WHERE lower(sensor) = 'viirs') AS viirs_raw_count,
                COUNT(*) AS total_raw_count,
                ROUND(COALESCE(SUM(frp), 0.0), 2) AS raw_frp_mw,
                ROUND(COALESCE(AVG(frp), 0.0), 2) AS raw_frp_avg,
                ROUND(COALESCE(MAX(frp), 0.0), 2) AS raw_frp_max
            FROM points_with_h3
            GROUP BY h3_index, date, year, month, dekad, annual_dekad
            ORDER BY year DESC, month DESC, date DESC, total_raw_count DESC
        """

        logger.info(f"Agregando detecciones a nivel H3 (Resolución {res})...")
        return conn.sql(query)
