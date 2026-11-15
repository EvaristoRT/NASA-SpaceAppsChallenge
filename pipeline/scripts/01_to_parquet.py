"""Paso 01 - Convierte los datos crudos de FIRMS a la capa bronze (Parquet).

Dos tipos de entrada, los dos se buscan dentro de FIRE_DATA_DIR:

  a) Zips anuales por país (archivo histórico):  <producto>_<año>_all_countries.zip
     Se buscan recursivamente. Cada zip se descomprime a una carpeta temporal,
     se convierte con DuckDB y los CSV temporales se borran.

  b) Bloques CSV de la API (año en curso):       datos_2026/api/<SENSOR>/<SENSOR>_<SP|NRT>_<fecha>.csv
     Los baja scripts/00b_descargar_2026.sh. Cubren solo el bbox pedido (Sudamérica).

Salida (un archivo por producto y año; volver a correr lo reemplaza):

    bronze/sensor=MODIS/year=2005/modis.parquet
    bronze/sensor=VIIRS/year=2015/viirs-snpp.parquet
    bronze/sensor=VIIRS/year=2026/viirs-jpss1_api.parquet

Bronze NO filtra nada: guarda todos los focos, con nombres y códigos unificados.
La limpieza se hace en silver (paso 03).

Para leerlo:
    duckdb.sql("SELECT * FROM read_parquet('<bronze>/**/*.parquet', hive_partitioning=true)")

Uso:
    python pipeline/scripts/01_to_parquet.py                       # todo lo que falte
    python pipeline/scripts/01_to_parquet.py --sensor MODIS --years 2000
    python pipeline/scripts/01_to_parquet.py --years 2026          # solo los bloques de la API
    python pipeline/scripts/01_to_parquet.py --overwrite           # rehacer lo existente
"""
from __future__ import annotations

import argparse
import re
import sys
import tempfile
import time
import zipfile
from dataclasses import dataclass, field
from pathlib import Path

import duckdb

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
import config  # noqa: E402

# Nombre de archivo -> producto. El producto es también el nombre del parquet.
ZIP_PATTERN = re.compile(r"^(modis|viirs-snpp|viirs-jpss1|viirs-jpss2)_(\d{4})_all_countries\.zip$", re.I)
API_PATTERN = re.compile(r"^(MODIS|VIIRS_SNPP|VIIRS_NOAA20|VIIRS_NOAA21)_(SP|NRT)_(\d{4})-\d{2}-\d{2}\.csv$")
API_PRODUCT = {"MODIS": "modis", "VIIRS_SNPP": "viirs-snpp", "VIIRS_NOAA20": "viirs-jpss1", "VIIRS_NOAA21": "viirs-jpss2"}
SENSOR_OF = {"modis": "MODIS", "viirs-snpp": "VIIRS", "viirs-jpss1": "VIIRS", "viirs-jpss2": "VIIRS"}

# Códigos de satélite que aparecen en FIRMS -> un solo nombre (config.SATELLITES).
SATELLITE_SQL = """
    CASE upper(trim(satellite))
        WHEN 'T' THEN 'Terra' WHEN 'TERRA' THEN 'Terra'
        WHEN 'A' THEN 'Aqua'  WHEN 'AQUA'  THEN 'Aqua'
        WHEN 'N' THEN 'S-NPP' WHEN 'NPP'   THEN 'S-NPP' WHEN 'SUOMI NPP' THEN 'S-NPP'
        WHEN 'N20' THEN 'NOAA-20' WHEN '1' THEN 'NOAA-20' WHEN 'NOAA-20' THEN 'NOAA-20'
        WHEN 'N21' THEN 'NOAA-21' WHEN '2' THEN 'NOAA-21' WHEN 'NOAA-21' THEN 'NOAA-21'
        ELSE trim(satellite)
    END"""

# MODIS trae confianza 0-100; VIIRS trae l / n / h (o low / nominal / high en los CSV de 7 días).
CONFIDENCE_SQL = {
    "MODIS": """CASE WHEN TRY_CAST(confidence AS INTEGER) IS NULL THEN NULL
                     WHEN TRY_CAST(confidence AS INTEGER) < 30 THEN 'low'
                     WHEN TRY_CAST(confidence AS INTEGER) < 80 THEN 'nominal'
                     ELSE 'high' END""",
    "VIIRS": """CASE lower(trim(confidence))
                     WHEN 'l' THEN 'low' WHEN 'low' THEN 'low'
                     WHEN 'n' THEN 'nominal' WHEN 'nominal' THEN 'nominal'
                     WHEN 'h' THEN 'high' WHEN 'high' THEN 'high' END""",
}
# Las bandas de infrarrojo medio y térmico se llaman distinto en cada sensor.
BRIGHTNESS_COLS = {"MODIS": ("brightness", "bright_t31"), "VIIRS": ("bright_ti4", "bright_ti5")}


@dataclass
class RawInput:
    kind: str     # zip | api
    product: str  # modis | viirs-snpp | viirs-jpss1 | viirs-jpss2
    sensor: str   # MODIS | VIIRS
    year: int
    paths: list[Path] = field(default_factory=list)

    @property
    def label(self) -> str:
        return self.paths[0].name if self.kind == "zip" else f"{self.product} {self.year} (API, {len(self.paths)} bloques)"

    def target(self, out_dir: Path) -> Path:
        name = self.product if self.kind == "zip" else f"{self.product}_api"
        return out_dir / f"sensor={self.sensor}" / f"year={self.year}" / f"{name}.parquet"

    def newest_input(self) -> float:
        return max(p.stat().st_mtime for p in self.paths)


def find_inputs(raw_dir: Path) -> list[RawInput]:
    found: list[RawInput] = []
    for p in sorted(raw_dir.rglob("*.zip")):
        m = ZIP_PATTERN.match(p.name)
        if m:
            product = m.group(1).lower()
            found.append(RawInput("zip", product, SENSOR_OF[product], int(m.group(2)), [p]))

    groups: dict[tuple[str, int], RawInput] = {}
    api_dir = raw_dir / "datos_2026" / "api"
    if api_dir.is_dir():
        for p in sorted(api_dir.rglob("*.csv")):
            m = API_PATTERN.match(p.name)
            if m:
                product, year = API_PRODUCT[m.group(1)], int(m.group(3))
                groups.setdefault((product, year), RawInput("api", product, SENSOR_OF[product], year)).paths.append(p)
    return found + list(groups.values())


def select_sql(con: duckdb.DuckDBPyConnection, source: str, sensor: str, origin: str) -> str:
    """`source` es la expresión de lectura: un glob entre comillas o una lista de archivos."""
    reader = f"read_csv({source}, header=true, all_varchar=true, union_by_name=true, filename=true)"
    cols = {r[0].lower() for r in con.execute(f"DESCRIBE SELECT * FROM {reader}").fetchall()}
    mir, tir = BRIGHTNESS_COLS[sensor]
    # Los CSV en modo NRT no traen `type`; si todo el lote es NRT la columna ni existe.
    type_sql = "TRY_CAST(type AS TINYINT)" if "type" in cols else "CAST(NULL AS TINYINT)"
    # El país sale del nombre del CSV: viirs-snpp_2025_Argentina.csv -> Argentina. La API no lo trae.
    country = r"nullif(replace(regexp_extract(filename, '_\d{4}_([^\\/]+)\.csv$', 1), '_', ' '), '')"
    return f"""
        SELECT
            '{sensor}'                                        AS sensor,
            {SATELLITE_SQL}                                   AS satellite,
            CASE WHEN upper(version) LIKE '%NRT%' THEN 'nrt' ELSE 'archive' END AS source,
            '{origin}'                                        AS origin,
            trim(version)                                     AS version,
            {country}                                         AS country,
            CAST(acq_date AS DATE)                            AS acq_date,
            lpad(trim(acq_time), 4, '0')                      AS acq_time,
            strptime(acq_date || ' ' || lpad(trim(acq_time), 4, '0'), '%Y-%m-%d %H%M') AS acq_datetime_utc,
            CAST(latitude AS DOUBLE)                          AS latitude,
            CAST(longitude AS DOUBLE)                         AS longitude,
            TRY_CAST({mir} AS DOUBLE)                         AS bright_mir,
            TRY_CAST({tir} AS DOUBLE)                         AS bright_tir,
            TRY_CAST(frp AS DOUBLE)                           AS frp,
            trim(confidence)                                  AS confidence_raw,
            {CONFIDENCE_SQL[sensor]}                          AS confidence_level,
            TRY_CAST(scan AS DOUBLE)                          AS scan,
            TRY_CAST(track AS DOUBLE)                         AS track,
            upper(trim(daynight))                             AS daynight,
            {type_sql}                                        AS type
        FROM {reader}
        WHERE latitude IS NOT NULL AND longitude IS NOT NULL AND acq_date IS NOT NULL
    """


def write_parquet(con: duckdb.DuckDBPyConnection, sql: str, target: Path) -> int:
    target.parent.mkdir(parents=True, exist_ok=True)
    partial = target.with_suffix(".parquet.partial")
    con.execute(f"""
        COPY ({sql} ORDER BY acq_date, acq_time)
        TO '{partial.as_posix()}' (FORMAT parquet, COMPRESSION zstd, ROW_GROUP_SIZE 500000)
    """)
    partial.replace(target)  # el archivo viejo solo se reemplaza cuando el nuevo está completo
    return con.execute(f"SELECT count(*) FROM read_parquet('{target.as_posix()}')").fetchone()[0]


def convert(con: duckdb.DuckDBPyConnection, ri: RawInput, out_dir: Path, tmp_root: Path | None) -> int:
    target = ri.target(out_dir)
    if ri.kind == "api":
        files = "[" + ", ".join(f"'{p.as_posix()}'" for p in ri.paths) + "]"
        return write_parquet(con, select_sql(con, files, ri.sensor, "api_bbox"), target)

    with tempfile.TemporaryDirectory(dir=tmp_root, prefix="firms_") as tmp:
        with zipfile.ZipFile(ri.paths[0]) as z:
            for member in (m for m in z.namelist() if m.lower().endswith(".csv")):
                # Todo plano en tmp/ para leerlo con un solo glob; los nombres son únicos por zip.
                with z.open(member) as src, open(Path(tmp) / Path(member).name, "wb") as dst:
                    while chunk := src.read(1 << 20):
                        dst.write(chunk)
        csv_glob = "'" + (Path(tmp) / "*.csv").as_posix() + "'"
        return write_parquet(con, select_sql(con, csv_glob, ri.sensor, "country_zip"), target)


def main() -> int:
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--data-dir", help="Carpeta de datos (por defecto: FIRE_DATA_DIR)")
    ap.add_argument("--out", help="Carpeta bronze de salida (por defecto: <data-dir>/bronze)")
    ap.add_argument("--sensor", choices=["MODIS", "VIIRS", "all"], default="all")
    ap.add_argument("--product", help="Un solo producto: modis, viirs-snpp, viirs-jpss1, viirs-jpss2")
    ap.add_argument("--years", help="Año o rango: 2005 o 2001-2011")
    ap.add_argument("--overwrite", action="store_true", help="Rehacer los archivos que ya existen")
    ap.add_argument("--tmp-dir", help="Dónde descomprimir cada zip temporalmente (por defecto: temp del sistema)")
    args = ap.parse_args()

    data_dir = config.data_dir(args.data_dir)
    out_dir = Path(args.out) if args.out else data_dir / "bronze"

    inputs = find_inputs(data_dir)
    if args.sensor != "all":
        inputs = [i for i in inputs if i.sensor == args.sensor]
    if args.product:
        inputs = [i for i in inputs if i.product == args.product.lower()]
    if args.years:
        lo, _, hi = args.years.partition("-")
        inputs = [i for i in inputs if int(lo) <= i.year <= int(hi or lo)]
    if not inputs:
        print(f"No hay zips ni bloques de la API que coincidan en {data_dir}")
        return 1

    print(f"{len(inputs)} entrada(s) -> {out_dir}")
    con = duckdb.connect()
    con.execute("SET preserve_insertion_order = false")
    total_rows, t_all = 0, time.time()
    for n, ri in enumerate(inputs, 1):
        target = ri.target(out_dir)
        # Los bloques de la API se rehacen solos si llegó un bloque más nuevo (la cola NRT se refresca).
        fresh = target.exists() and (ri.kind == "zip" or target.stat().st_mtime >= ri.newest_input())
        if fresh and not args.overwrite:
            print(f"[{n}/{len(inputs)}] ya convertido: {ri.label}")
            continue
        t0 = time.time()
        rows = convert(con, ri, out_dir, Path(args.tmp_dir) if args.tmp_dir else None)
        total_rows += rows
        print(f"[{n}/{len(inputs)}] {ri.label}: {rows:,} filas, {target.stat().st_size / 1e6:.1f} MB, {time.time() - t0:.0f}s")
    print(f"Listo: {total_rows:,} filas en {time.time() - t_all:.0f}s")
    return 0


if __name__ == "__main__":
    sys.exit(main())
