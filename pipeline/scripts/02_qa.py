"""Paso 02 - Revisión de calidad de la capa bronze. No modifica nada: solo reporta.

Qué revisa (cada punto es una trampa real de estos datos, ver PLAN_EQUIPO.md):

  1. Cobertura: filas y rango de fechas por satélite y año. Detecta años o productos faltantes.
  2. Entrada y salida de satélites: primer y último mes de cada uno. Debe verse
     Terra desde 2000-11, Aqua desde 2002-07, S-NPP 2012-01 a 2026-11, NOAA-20 desde 2018.
  3. Mezcla archive / NRT por año (los NRT no traen `type`).
  4. Nulos en columnas clave y distribución de `type` y de confianza.
  5. Duplicados exactos (mismo satélite, fecha, hora, lat, lon).
  6. Razón Terra/Aqua por año: si cae con los años, Terra se está degradando.

Salida: imprime el reporte y guarda las tablas en <FIRE_DATA_DIR>/qa/*.csv

Uso:
    python pipeline/scripts/02_qa.py
    python pipeline/scripts/02_qa.py --years 2018-2026
"""
from __future__ import annotations

import argparse
import sys
from pathlib import Path

import duckdb

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
import config  # noqa: E402

CHECKS = {
    "1_cobertura_por_satelite_y_anio": """
        SELECT satellite, year, count(*) AS filas, min(acq_date) AS desde, max(acq_date) AS hasta,
               count(DISTINCT acq_date) AS dias_con_focos
        FROM b GROUP BY ALL ORDER BY satellite, year""",
    "2_vida_de_cada_satelite": """
        SELECT satellite, strftime(min(acq_date), '%Y-%m') AS primer_mes, strftime(max(acq_date), '%Y-%m') AS ultimo_mes,
               count(*) AS filas
        FROM b GROUP BY ALL ORDER BY primer_mes""",
    "3_archive_vs_nrt": """
        SELECT year, sensor, source, origin, count(*) AS filas, count(type) AS filas_con_type
        FROM b GROUP BY ALL ORDER BY year, sensor, source""",
    "4_nulos_y_categorias": """
        SELECT sensor,
               count(*) AS filas,
               count(*) FILTER (WHERE frp IS NULL) AS frp_nulo,
               count(*) FILTER (WHERE confidence_level IS NULL) AS confianza_nula,
               count(*) FILTER (WHERE confidence_level = 'low') AS confianza_low,
               count(*) FILTER (WHERE type = 0) AS type_0_vegetacion,
               count(*) FILTER (WHERE type = 1) AS type_1_volcan,
               count(*) FILTER (WHERE type = 2) AS type_2_estatica,
               count(*) FILTER (WHERE type = 3) AS type_3_offshore,
               count(*) FILTER (WHERE type IS NULL) AS type_nulo
        FROM b GROUP BY ALL ORDER BY sensor""",
    "5_duplicados_exactos": """
        SELECT satellite, year, sum(n - 1) AS filas_duplicadas
        FROM (SELECT satellite, year, count(*) AS n FROM b
              GROUP BY satellite, year, acq_date, acq_time, latitude, longitude HAVING count(*) > 1)
        GROUP BY ALL ORDER BY satellite, year""",
    "6_razon_terra_aqua": """
        SELECT year,
               count(*) FILTER (WHERE satellite = 'Terra') AS terra,
               count(*) FILTER (WHERE satellite = 'Aqua')  AS aqua,
               round(count(*) FILTER (WHERE satellite = 'Terra') / nullif(count(*) FILTER (WHERE satellite = 'Aqua'), 0), 3) AS terra_sobre_aqua
        FROM b WHERE sensor = 'MODIS' AND type = 0 GROUP BY ALL ORDER BY year""",
}


def main() -> int:
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--data-dir", help="Carpeta de datos (por defecto: FIRE_DATA_DIR)")
    ap.add_argument("--years", help="Año o rango: 2005 o 2018-2026")
    args = ap.parse_args()

    bronze = config.layer("bronze", args.data_dir)
    if not any(bronze.rglob("*.parquet")):
        print(f"No hay bronze en {bronze}. Corre primero 01_to_parquet.py")
        return 1
    out = config.layer("qa", args.data_dir)
    out.mkdir(exist_ok=True)

    where = ""
    if args.years:
        lo, _, hi = args.years.partition("-")
        where = f"WHERE year BETWEEN {int(lo)} AND {int(hi or lo)}"

    con = duckdb.connect()
    con.execute(f"""CREATE VIEW b AS SELECT * FROM read_parquet('{(bronze / '**' / '*.parquet').as_posix()}',
                    hive_partitioning=true, union_by_name=true) {where}""")
    for name, sql in CHECKS.items():
        print(f"\n=== {name} ===")
        rel = con.sql(sql)
        rel.show(max_rows=200, max_width=160)
        rel.write_csv((out / f"{name}.csv").as_posix())
    print(f"\nTablas guardadas en {out}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
