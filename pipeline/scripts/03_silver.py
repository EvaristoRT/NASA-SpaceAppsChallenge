"""Paso 03 - Capa silver: focos limpios, con celdas H3, filtrados a la región.

RESPONSABLE: Paco            ESTADO: implementado

Entrada
    bronze/**/*.parquet                    (paso 01)
    aux/static_mask.parquet                (lo genera este mismo paso, ver abajo)

Salida
    silver/region=<region>/year=<año>/silver.parquet      un registro por foco limpio
    aux/static_mask.parquet                               celdas h3_r8 con fuentes estáticas

Columnas de silver (las de bronze, más):
    h3_r8  UBIGINT    celda de la unidad de conteo (día-celda)
    h3_r6  UBIGINT    celda del producto final
    h3_r5  UBIGINT    celda de calibración
    h3_r3  UBIGINT    región del modelo (estrato)

Reglas (las constantes están en config.py, no las repitas aquí):
    1. Región: bbox de config.REGIONS[--region]. Por defecto argentina_chile.
    2. Fuera confianza 'low' (config.DROP_CONFIDENCE).
    3. Con `type` (archive): se queda solo type = 0 (config.KEEP_TYPES).
    4. Sin `type` (NRT): se quita el foco si su h3_r8 está en aux/static_mask.parquet.
       La máscara se arma con el archive: celdas h3_r8 que tienen focos type 1, 2 o 3
       en al menos 3 años distintos. Así los mecheros de gas no entran por la cola NRT.
    5. Duplicados exactos (satellite, acq_date, acq_time, latitude, longitude): se deja uno.
    6. Si un mismo día existe en archive y en NRT para el mismo satélite, gana archive.

Cómo calcular H3 rápido (NO usar una función de Python fila por fila: son >300 millones de filas):
    con.execute("INSTALL h3 FROM community"); con.execute("LOAD h3")
    h3_latlng_to_cell(latitude, longitude, 8)          -> h3_r8
    h3_cell_to_parent(h3_r8, 5)                        -> h3_r5      (ídem 6 y 3)
Probado con DuckDB 2.0: la extensión se instala sola la primera vez (necesita internet).

Uso previsto:
    python pipeline/scripts/03_silver.py                       # región por defecto
    python pipeline/scripts/03_silver.py --region sudamerica
"""
from __future__ import annotations

import argparse
import sys
import time
from pathlib import Path

import duckdb

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
import config  # noqa: E402


def init_duckdb() -> duckdb.DuckDBPyConnection:
    """Inicia conexión DuckDB y carga la extensión comunitaria h3."""
    con = duckdb.connect()
    try:
        con.execute("LOAD h3")
    except Exception:
        try:
            con.execute("INSTALL h3 FROM community")
            con.execute("LOAD h3")
        except Exception as e:
            raise SystemExit(
                f"Error al cargar la extensión DuckDB 'h3': {e}\n"
                "Asegúrate de tener conexión a internet en la primera ejecución o instalarla previamente."
            )
    return con


def parse_year_range(s: str) -> list[int]:
    """Interpreta '2026' o '2018-2026'."""
    if "-" in s:
        start, end = s.split("-", 1)
        return list(range(int(start), int(end) + 1))
    return [int(s)]


def ensure_static_mask(
    con: duckdb.DuckDBPyConnection,
    bronze_dir: Path,
    aux_dir: Path,
    rebuild: bool = False,
) -> Path:
    """Genera o reutiliza aux/static_mask.parquet.
    
    Celdas h3_r8 con focos type 1 (volcán), 2 (fuente estática) o 3 (offshore)
    en al menos 3 años distintos en los datos de archive (o los años disponibles si hay < 3).
    """
    mask_file = aux_dir / "static_mask.parquet"
    if mask_file.exists() and not rebuild:
        return mask_file

    aux_dir.mkdir(parents=True, exist_ok=True)
    bronze_glob = (bronze_dir / "**" / "*.parquet").as_posix()

    # Verificar años de archive disponibles
    check_sql = f"""
        SELECT count(DISTINCT year)
        FROM read_parquet('{bronze_glob}', hive_partitioning=true)
        WHERE type IS NOT NULL AND type IN (1, 2, 3) AND source = 'archive'
    """
    try:
        available_years = con.execute(check_sql).fetchone()[0] or 0
    except Exception:
        available_years = 0

    min_years = 3 if available_years >= 3 else max(1, available_years)

    print(f"Generando máscara de fuentes estáticas ({mask_file.name})... (criterio: >= {min_years} año(s))")
    t0 = time.time()

    tmp_file = mask_file.with_suffix(".parquet.partial")
    build_sql = f"""
        COPY (
            SELECT
                h3_latlng_to_cell(latitude, longitude, 8) AS h3_r8,
                count(DISTINCT year) AS n_years,
                count(*) AS n_points
            FROM read_parquet('{bronze_glob}', hive_partitioning=true)
            WHERE type IS NOT NULL AND type IN (1, 2, 3)
            GROUP BY h3_r8
            HAVING count(DISTINCT year) >= {min_years}
        ) TO '{tmp_file.as_posix()}' (FORMAT parquet, COMPRESSION zstd)
    """
    con.execute(build_sql)
    tmp_file.replace(mask_file)

    count = con.execute(f"SELECT count(*) FROM read_parquet('{mask_file.as_posix()}')").fetchone()[0]
    dt = time.time() - t0
    print(f"Máscara lista: {count:,} celdas h3_r8 estáticas identificadas ({dt:.1f}s)")
    return mask_file


def process_silver_for_year(
    con: duckdb.DuckDBPyConnection,
    bronze_dir: Path,
    target_file: Path,
    region: str,
    bbox: tuple[float, float, float, float],
    year: int,
    mask_file: Path,
) -> int:
    """Limpia los focos de bronze para un año, calcula H3 y genera silver.parquet."""
    target_file.parent.mkdir(parents=True, exist_ok=True)
    tmp_target = target_file.with_suffix(".parquet.partial")

    min_lon, min_lat, max_lon, max_lat = bbox
    drop_conf = ", ".join(f"'{c}'" for c in config.DROP_CONFIDENCE)
    keep_types = ", ".join(str(t) for t in config.KEEP_TYPES)

    bronze_year_glob = (bronze_dir / f"**/year={year}/*.parquet").as_posix()
    mask_path = mask_file.as_posix()

    # Prevalencia de archive sobre NRT: días con archive para cada satélite
    con.execute(f"""
        CREATE OR REPLACE TEMP TABLE archive_days_{year} AS
        SELECT DISTINCT satellite, acq_date
        FROM read_parquet('{bronze_year_glob}', hive_partitioning=true)
        WHERE source = 'archive'
    """)

    sql = f"""
        COPY (
            WITH base AS (
                SELECT
                    b.sensor,
                    b.satellite,
                    b.source,
                    b.origin,
                    b.version,
                    b.country,
                    b.acq_date,
                    b.acq_time,
                    b.acq_datetime_utc,
                    b.latitude,
                    b.longitude,
                    b.bright_mir,
                    b.bright_tir,
                    b.frp,
                    b.confidence_raw,
                    b.confidence_level,
                    b.scan,
                    b.track,
                    b.daynight,
                    b.type,
                    b.year,
                    h3_latlng_to_cell(b.latitude, b.longitude, 8) AS h3_r8
                FROM read_parquet('{bronze_year_glob}', hive_partitioning=true) b
                WHERE b.latitude BETWEEN {min_lat} AND {max_lat}
                  AND b.longitude BETWEEN {min_lon} AND {max_lon}
                  AND (b.confidence_level IS NULL OR b.confidence_level NOT IN ({drop_conf}))
                  -- Regla 6: Si el mismo día existe en archive para el mismo satélite, gana archive
                  AND NOT (
                      b.source = 'nrt' AND EXISTS (
                          SELECT 1 FROM archive_days_{year} a
                          WHERE a.satellite = b.satellite AND a.acq_date = b.acq_date
                      )
                  )
            ),
            clean AS (
                SELECT
                    sensor,
                    satellite,
                    source,
                    origin,
                    version,
                    country,
                    acq_date,
                    acq_time,
                    acq_datetime_utc,
                    latitude,
                    longitude,
                    bright_mir,
                    bright_tir,
                    frp,
                    confidence_raw,
                    confidence_level,
                    scan,
                    track,
                    daynight,
                    type,
                    year,
                    h3_r8,
                    h3_cell_to_parent(h3_r8, 6) AS h3_r6,
                    h3_cell_to_parent(h3_r8, 5) AS h3_r5,
                    h3_cell_to_parent(h3_r8, 3) AS h3_r3
                FROM base
                WHERE (
                    -- Regla 3: Archive con type: solo vegetación (type = 0)
                    (type IS NOT NULL AND type IN ({keep_types}))
                    OR
                    -- Regla 4: NRT sin type: descartar si cae en celda de la máscara estática
                    (type IS NULL AND h3_r8 NOT IN (SELECT h3_r8 FROM read_parquet('{mask_path}')))
                )
                -- Regla 5: Duplicados exactos -> se deja uno (priorizando archive si existiera empate)
                QUALIFY ROW_NUMBER() OVER (
                    PARTITION BY satellite, acq_date, acq_time, latitude, longitude
                    ORDER BY CASE WHEN source = 'archive' THEN 0 ELSE 1 END, frp DESC NULLS LAST
                ) = 1
            )
            SELECT * FROM clean ORDER BY acq_date, acq_time
        ) TO '{tmp_target.as_posix()}' (FORMAT parquet, COMPRESSION zstd, ROW_GROUP_SIZE 500000)
    """

    con.execute(sql)
    tmp_target.replace(target_file)
    count = con.execute(f"SELECT count(*) FROM read_parquet('{target_file.as_posix()}')").fetchone()[0]
    return count


def main() -> int:
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--data-dir", help="Carpeta de datos (por defecto: FIRE_DATA_DIR de config.py)")
    ap.add_argument("--region", default=config.DEFAULT_REGION, choices=list(config.REGIONS.keys()),
                    help=f"Región a filtrar (por defecto: {config.DEFAULT_REGION})")
    ap.add_argument("--years", help="Año o rango de años: 2026 o 2018-2026")
    ap.add_argument("--overwrite", action="store_true", help="Rehacer los archivos silver existentes")
    ap.add_argument("--rebuild-mask", action="store_true", help="Forzar regeneración de aux/static_mask.parquet")
    args = ap.parse_args()

    data_dir = config.data_dir(args.data_dir)
    bronze_dir = config.layer("bronze", str(data_dir))
    silver_dir = config.layer("silver", str(data_dir))
    aux_dir = config.layer("aux", str(data_dir))

    if not bronze_dir.exists():
        sys.exit(f"No existe la capa bronze en: {bronze_dir}. Ejecuta primero scripts/01_to_parquet.py.")

    con = init_duckdb()

    # Descubrir años disponibles en bronze
    available_years_sql = f"""
        SELECT DISTINCT year
        FROM read_parquet('{(bronze_dir / "**" / "*.parquet").as_posix()}', hive_partitioning=true)
        ORDER BY year
    """
    try:
        available_years = [r[0] for r in con.execute(available_years_sql).fetchall()]
    except Exception as e:
        sys.exit(f"Error al leer bronze en {bronze_dir}: {e}")

    if not available_years:
        sys.exit(f"No se encontraron archivos parquet en bronze: {bronze_dir}")

    target_years = parse_year_range(args.years) if args.years else available_years
    years_to_process = [y for y in target_years if y in available_years]

    if not years_to_process:
        print(f"Ninguno de los años especificados ({target_years}) está presente en bronze ({available_years}).")
        return 0

    bbox = config.REGIONS[args.region]
    print(f"Paso 03 - Silver: región '{args.region}' {bbox}")
    print(f"Años a procesar: {years_to_process}")

    # Asegurar máscara de fuentes estáticas
    mask_file = ensure_static_mask(con, bronze_dir, aux_dir, rebuild=args.rebuild_mask)

    total_clean = 0
    t_start = time.time()

    for idx, year in enumerate(years_to_process, 1):
        target_file = silver_dir / f"region={args.region}" / f"year={year}" / "silver.parquet"

        if target_file.exists() and not args.overwrite:
            count = con.execute(f"SELECT count(*) FROM read_parquet('{target_file.as_posix()}')").fetchone()[0]
            print(f"[{idx}/{len(years_to_process)}] Año {year}: ya existe ({count:,} focos) -> omitiendo (--overwrite para rehacer)")
            total_clean += count
            continue

        t0 = time.time()
        print(f"[{idx}/{len(years_to_process)}] Procesando año {year}...", end=" ", flush=True)
        count = process_silver_for_year(con, bronze_dir, target_file, args.region, bbox, year, mask_file)
        dt = time.time() - t0
        mb = target_file.stat().st_size / (1024 * 1024)
        print(f"{count:,} focos limpios, {mb:.1f} MB en {dt:.1f}s")
        total_clean += count

    total_time = time.time() - t_start
    print(f"\nListo: {total_clean:,} focos limpios en total ({total_time:.1f}s).")
    print(f"Archivos guardados en: {silver_dir / f'region={args.region}'}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
