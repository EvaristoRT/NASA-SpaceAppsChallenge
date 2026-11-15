"""Paso 04 - Tabla de calibración: una fila por hexágono r5 x mes, con cada satélite por separado.

RESPONSABLE: Evaristo        ESTADO: implementado

Entrada
    silver/region=<region>/**/*.parquet    (paso 03)

Salida
    calibration/region=<region>/calibration.parquet

Una fila por (h3_r5, year, month). Para cada satélite S en {terra, aqua, modis, snpp, n20, n21}:
    cd_<S>     INT      días-celda: número de pares (h3_r8, acq_date) distintos con >= 1 foco de S
    n_<S>      INT      focos crudos de S
    frp_<S>    DOUBLE   suma de FRP de S (MW)
`modis` = Terra y Aqua juntos (la unión de sus días-celda, NO la suma de cd_terra + cd_aqua).
Más:  h3_r3 (región del modelo), lat, lon (centro del hexágono r5).

Por qué cada satélite va en su columna:
    La referencia es NOAA-20 (config.REFERENCE_SATELLITE). Si se suman los VIIRS en una
    sola columna, el conteo "sube" en 2018 y 2023 sin que haya más fuego, y la cola
    degradada de S-NPP contamina la serie. Con columnas separadas, el modelo (paso 05)
    ajusta un factor por satélite y no hace falta el concepto de "era".

Importante:
    - Incluye también los meses SIN traslape (2000-2017): el paso 06 los necesita para aplicar el modelo.
    - Meses sin ningún foco en un hexágono no generan fila (se interpretan como 0 al leer).
      Si un satélite no vio nada en una fila que sí existe, sus columnas quedan en 0 (no NULL).
    - cd_* se cuenta sobre h3_r8 (config.H3_RES_UNIT), agrupado por su padre h3_r5.
    - year y month salen de acq_date (fecha UTC de la observación).

Uso:
    python pipeline/scripts/04_calibration_set.py
    python pipeline/scripts/04_calibration_set.py --region sudamerica
"""
from __future__ import annotations

import argparse
import sys
import time
from pathlib import Path

import duckdb

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
import config  # noqa: E402

# Nombre del satélite en silver (config.SATELLITES) -> sufijo de columna.
SAT_COL = {"Terra": "terra", "Aqua": "aqua", "S-NPP": "snpp", "NOAA-20": "n20", "NOAA-21": "n21"}
# Sufijo -> satélites que lo forman. `modis` es la unión de Terra y Aqua.
GROUPS = {"terra": ("Terra",), "aqua": ("Aqua",), "modis": ("Terra", "Aqua"),
          "snpp": ("S-NPP",), "n20": ("NOAA-20",), "n21": ("NOAA-21",)}


def init_duckdb() -> duckdb.DuckDBPyConnection:
    con = duckdb.connect()
    try:
        con.execute("LOAD h3")
    except Exception:
        con.execute("INSTALL h3 FROM community")
        con.execute("LOAD h3")
    con.execute("SET preserve_insertion_order = false")
    return con


def calibration_sql(silver_glob: str) -> str:
    cols = []
    for suffix, sats in GROUPS.items():
        cond = "satellite IN (" + ", ".join(f"'{s}'" for s in sats) + ")"
        # Un día-celda = un par (h3_r8, acq_date). Para `modis` el DISTINCT une Terra y Aqua.
        cols.append(f"coalesce(count(DISTINCT (h3_r8, acq_date)) FILTER (WHERE {cond}), 0)::INTEGER AS cd_{suffix}")
        cols.append(f"coalesce(count(*) FILTER (WHERE {cond}), 0)::INTEGER AS n_{suffix}")
        cols.append(f"coalesce(sum(frp) FILTER (WHERE {cond}), 0)::DOUBLE AS frp_{suffix}")
    known = ", ".join(f"'{s}'" for s in SAT_COL)
    return f"""
        WITH s AS (
            SELECT satellite, h3_r8, h3_r5, h3_r3, acq_date, frp,
                   year(acq_date)::INTEGER AS y, month(acq_date)::INTEGER AS mo
            FROM read_parquet('{silver_glob}', hive_partitioning = true)
            WHERE satellite IN ({known}) AND h3_r8 IS NOT NULL
        ),
        agg AS (
            SELECT h3_r5, any_value(h3_r3) AS h3_r3, y AS year, mo AS month,
                   {', '.join(cols)}
            FROM s
            GROUP BY h3_r5, y, mo
        )
        SELECT h3_r5, h3_r3, year, month,
               h3_cell_to_lat(h3_r5) AS lat, h3_cell_to_lng(h3_r5) AS lon,
               * EXCLUDE (h3_r5, h3_r3, year, month)
        FROM agg
        ORDER BY year, month, h3_r5
    """


def summary(con: duckdb.DuckDBPyConnection, path: Path) -> None:
    t = f"read_parquet('{path.as_posix()}')"
    rows, cells, y0, y1 = con.execute(
        f"SELECT count(*), count(DISTINCT h3_r5), min(year), max(year) FROM {t}").fetchone()
    print(f"  {rows:,} filas · {cells:,} hexágonos r5 · {y0}-{y1}")
    # Control rápido: razones globales en los años de ajuste (el paso 05 hace el cálculo de verdad).
    lo, hi = config.TRAIN_YEARS
    r = con.execute(f"""
        SELECT sum(cd_n20) / nullif(sum(cd_modis), 0), sum(frp_n20) / nullif(sum(frp_modis), 0),
               sum(cd_terra) / nullif(sum(cd_aqua), 0)
        FROM {t} WHERE year BETWEEN {lo} AND {hi}""").fetchone()
    print(f"  Control {lo}-{hi}: cd_n20/cd_modis = {r[0]:.2f} · frp_n20/frp_modis = {r[1]:.2f} · "
          f"cd_terra/cd_aqua = {r[2]:.2f}")
    print(con.execute(f"""
        SELECT year, sum(cd_terra)::BIGINT AS cd_terra, sum(cd_aqua)::BIGINT AS cd_aqua, sum(cd_modis)::BIGINT AS cd_modis,
               sum(cd_snpp)::BIGINT AS cd_snpp, sum(cd_n20)::BIGINT AS cd_n20, sum(cd_n21)::BIGINT AS cd_n21
        FROM {t} GROUP BY year ORDER BY year""").df().to_string(index=False))


def main() -> int:
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--data-dir", help="Carpeta de datos (por defecto: FIRE_DATA_DIR)")
    ap.add_argument("--region", default=config.DEFAULT_REGION, choices=list(config.REGIONS))
    args = ap.parse_args()

    silver_dir = config.layer("silver", args.data_dir) / f"region={args.region}"
    if not silver_dir.is_dir() or not any(silver_dir.rglob("*.parquet")):
        print(f"No hay silver en {silver_dir}. Corre antes el paso 03 con --region {args.region}")
        return 1
    out = config.layer("calibration", args.data_dir) / f"region={args.region}" / "calibration.parquet"
    out.parent.mkdir(parents=True, exist_ok=True)
    partial = out.with_suffix(".parquet.partial")

    print(f"Paso 04 - Calibración: región '{args.region}'")
    t0 = time.time()
    con = init_duckdb()
    con.execute(f"""
        COPY ({calibration_sql((silver_dir / '**' / '*.parquet').as_posix())})
        TO '{partial.as_posix()}' (FORMAT parquet, COMPRESSION zstd)
    """)
    partial.replace(out)  # reemplaza el anterior solo cuando el nuevo está completo
    print(f"Listo en {time.time() - t0:.1f}s -> {out}")
    summary(con, out)
    return 0


if __name__ == "__main__":
    sys.exit(main())
