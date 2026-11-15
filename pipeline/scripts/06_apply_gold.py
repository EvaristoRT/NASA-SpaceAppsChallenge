"""Paso 06 - Aplica el modelo y arma la serie armonizada (capa gold).

RESPONSABLE: Evaristo        ESTADO: implementado (nivel 1)

Entrada
    silver/region=<region>/**/*.parquet        (paso 03)
    models/factores.parquet                    (paso 05)

Salida
    gold/region=<region>/harmonized.parquet    una fila por (h3_r6, date)

Para cada (h3_r6, día) se elige UNA fuente según la fecha (nunca se suman satélites):
    desde config.NOAA20_START                      NOAA-20            primary_source = 'NOAA-20'
    de config.SNPP_START a NOAA20_START            S-NPP x k_snpp     primary_source = 'S-NPP'
    de config.AQUA_START a SNPP_START              MODIS x k_modis    primary_source = 'MODIS'
    antes de config.AQUA_START                     Terra x f_terra x k_modis   primary_source = 'Terra'
El factor se busca por el h3_r3 de la celda y el mes calendario; si no hay, el global.

Columnas (contrato con el front; no quitar los crudos: son la trazabilidad):
    h3_index VARCHAR, date DATE, year INT, month INT, dekad INT
    modis_raw_count INT, viirs_raw_count INT            focos crudos del día (VIIRS = solo el satélite usado)
    harmonized_count DOUBLE                             días-celda en equivalente NOAA-20
    harmonized_ci_lower DOUBLE, harmonized_ci_upper DOUBLE     IC 95% del factor (paso 05, bootstrap). En la era
                                                        NOAA-20 son iguales al valor (es medido). Si factores.parquet
                                                        no trae factor_lo/factor_hi, también son iguales al valor.
    harmonized_frp_mw DOUBLE
    primary_source VARCHAR, is_nrt BOOLEAN
    fire_regime VARCHAR                                 'wildfire' por ahora

`dekad`: 1 = días 1-10, 2 = días 11-20, 3 = del 21 al fin de mes.

Cómo se cuenta:
    - Día-celda (config.H3_RES_UNIT): número de celdas h3_r8 distintas dentro del h3_r6 con >= 1 foco
      de la fuente de ese día. Para MODIS, Terra y Aqua se unen (una celda vista por los dos cuenta una vez).
    - harmonized_frp_mw = FRP de la fuente x factor de la métrica `frp`.
    - Hay fila si CUALQUIER satélite vio algo ese día en esa celda. Si la fuente elegida no vio nada,
      harmonized_count = 0 y los crudos quedan como registro (p. ej. un foco MODIS en 2020).
    - viirs_raw_count = 0 antes de config.SNPP_START. is_nrt = algún foco de la fuente es NRT.
    - Las anomalías (median_same_month, anomaly_pct) las agrega el paso 07.

Uso:
    python pipeline/scripts/06_apply_gold.py
    python pipeline/scripts/06_apply_gold.py --region sudamerica
"""
from __future__ import annotations

import argparse
import sys
import time
from pathlib import Path

import duckdb

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
import config  # noqa: E402

# Factores que usa cada fuente: (origen en factores.parquet). Terra lleva f_terra y k_modis encadenados.
ORIGINS = ("modis", "snpp", "terra")
METRICS = ("cd", "frp")


def init_duckdb() -> duckdb.DuckDBPyConnection:
    con = duckdb.connect()
    try:
        con.execute("LOAD h3")
    except Exception:
        con.execute("INSTALL h3 FROM community")
        con.execute("LOAD h3")
    con.execute("SET preserve_insertion_order = false")
    return con


def sat_cols(name: str, sats: tuple[str, ...]) -> str:
    cond = "satellite IN (" + ", ".join(f"'{s}'" for s in sats) + ")"
    return f"""
        count(DISTINCT h3_r8) FILTER (WHERE {cond})          AS {name}_cd,
        count(*) FILTER (WHERE {cond})                       AS {name}_n,
        coalesce(sum(frp) FILTER (WHERE {cond}), 0)          AS {name}_frp,
        coalesce(bool_or(source = 'nrt') FILTER (WHERE {cond}), false) AS {name}_nrt"""


def gold_sql(silver_glob: str, factors: str, has_ci: bool) -> str:
    # Una columna por (origen, métrica, variante), con el factor regional y el global de respaldo.
    # Variantes: '' = factor central; '_lo' / '_hi' = límites del IC 95% (paso 05, bootstrap).
    # Si factores.parquet no trae IC, los límites son el mismo factor central.
    variants = {"": "factor", "_lo": "factor_lo" if has_ci else "factor", "_hi": "factor_hi" if has_ci else "factor"}
    fac_cols = ",\n".join(
        f"max({col}) FILTER (WHERE origen = '{o}' AND metrica = '{m}') AS k_{o}_{m}{v}"
        for v, col in variants.items() for o in ORIGINS for m in METRICS)
    glob_cols = ",\n".join(
        f"max({col.replace('factor', 'factor_global')}) FILTER (WHERE origen = '{o}' AND metrica = '{m}') AS g_{o}_{m}{v}"
        for v, col in variants.items() for o in ORIGINS for m in METRICS)
    k = {f"{o}_{m}{v}": f"coalesce(f.k_{o}_{m}{v}, g.g_{o}_{m}{v})"
         for v in variants for o in ORIGINS for m in METRICS}

    def chain(m: str, v: str = "") -> str:
        # Fuente elegida x su factor, para la métrica m (cd o frp). NOAA-20 es medido: sin incertidumbre de modelo.
        return f"""CASE d.era
            WHEN 'NOAA-20' THEN d.n20_{m}
            WHEN 'S-NPP'   THEN d.snpp_{m} * {k[f'snpp_{m}{v}']}
            WHEN 'MODIS'   THEN d.modis_{m} * {k[f'modis_{m}{v}']}
            WHEN 'Terra'   THEN d.terra_{m} * {k[f'terra_{m}{v}']} * {k[f'modis_{m}{v}']}
        END"""

    return f"""
        WITH s AS (
            SELECT satellite, source, h3_r8, h3_r6, h3_r3, acq_date, frp
            FROM read_parquet('{silver_glob}', hive_partitioning = true)
            WHERE h3_r8 IS NOT NULL
        ),
        daily AS (
            SELECT h3_r6, acq_date AS date, any_value(h3_r3) AS h3_r3,
                   {sat_cols('modis', ('Terra', 'Aqua'))},
                   {sat_cols('terra', ('Terra',))},
                   {sat_cols('snpp', ('S-NPP',))},
                   {sat_cols('n20', ('NOAA-20',))}
            FROM s GROUP BY h3_r6, acq_date
        ),
        d AS (
            SELECT *, CASE
                    WHEN date >= DATE '{config.NOAA20_START}' THEN 'NOAA-20'
                    WHEN date >= DATE '{config.SNPP_START}'   THEN 'S-NPP'
                    WHEN date >= DATE '{config.AQUA_START}'   THEN 'MODIS'
                    ELSE 'Terra' END AS era
            FROM daily
        ),
        f AS (SELECT h3_r3, mes, {fac_cols} FROM read_parquet('{factors}') GROUP BY h3_r3, mes),
        g AS (SELECT {glob_cols} FROM read_parquet('{factors}'))
        SELECT
            h3_h3_to_string(d.h3_r6)                       AS h3_index,
            d.date,
            year(d.date)::INTEGER                          AS year,
            month(d.date)::INTEGER                         AS month,
            CASE WHEN day(d.date) <= 10 THEN 1 WHEN day(d.date) <= 20 THEN 2 ELSE 3 END::INTEGER AS dekad,
            d.modis_n::INTEGER                             AS modis_raw_count,
            (CASE d.era WHEN 'NOAA-20' THEN d.n20_n WHEN 'S-NPP' THEN d.snpp_n ELSE 0 END)::INTEGER
                                                           AS viirs_raw_count,
            ({chain('cd')})::DOUBLE                        AS harmonized_count,
            ({chain('cd', '_lo')})::DOUBLE                 AS harmonized_ci_lower,
            ({chain('cd', '_hi')})::DOUBLE                 AS harmonized_ci_upper,
            ({chain('frp')})::DOUBLE                       AS harmonized_frp_mw,
            d.era                                          AS primary_source,
            CASE d.era WHEN 'NOAA-20' THEN d.n20_nrt WHEN 'S-NPP' THEN d.snpp_nrt
                       WHEN 'MODIS' THEN d.modis_nrt ELSE d.terra_nrt END AS is_nrt,
            'wildfire'                                     AS fire_regime
        FROM d
        LEFT JOIN f ON f.h3_r3 = d.h3_r3 AND f.mes = month(d.date)
        CROSS JOIN g
        ORDER BY d.date, h3_index
    """


def summary(con: duckdb.DuckDBPyConnection, path: Path) -> None:
    t = f"read_parquet('{path.as_posix()}')"
    rows, cells, d0, d1 = con.execute(
        f"SELECT count(*), count(DISTINCT h3_index), min(date), max(date) FROM {t}").fetchone()
    print(f"  {rows:,} filas · {cells:,} hexágonos r6 · {d0} a {d1}")
    # Serie anual: harmonized_count debe verse continua en 2002, 2012 y 2018 (los cambios de fuente).
    print(con.execute(f"""
        SELECT year, string_agg(DISTINCT primary_source, '+' ORDER BY primary_source) AS fuente,
               round(sum(harmonized_count))::BIGINT AS armonizado_cd,
               sum(modis_raw_count)::BIGINT AS focos_modis, sum(viirs_raw_count)::BIGINT AS focos_viirs,
               round(sum(harmonized_frp_mw))::BIGINT AS armonizado_frp,
               round(100 * avg(is_nrt::INTEGER), 1) AS pct_nrt
        FROM {t} GROUP BY year ORDER BY year""").df().to_string(index=False))


def main() -> int:
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--data-dir", help="Carpeta de datos (por defecto: FIRE_DATA_DIR)")
    ap.add_argument("--region", default=config.DEFAULT_REGION, choices=list(config.REGIONS))
    args = ap.parse_args()

    silver_dir = config.layer("silver", args.data_dir) / f"region={args.region}"
    # Factores de esta región (models/region=<r>/, paso 05). La región por defecto puede usar todavía la copia en
    # models/ de versiones anteriores del 05; las demás no, para no aplicar factores de otra región sin darse cuenta.
    models = config.layer("models", args.data_dir)
    factors = models / f"region={args.region}" / "factores.parquet"
    if not factors.exists() and args.region == config.DEFAULT_REGION:
        factors = models / "factores.parquet"
    if not silver_dir.is_dir() or not any(silver_dir.rglob("*.parquet")):
        print(f"No hay silver en {silver_dir}. Corre antes el paso 03 con --region {args.region}")
        return 1
    if not factors.exists():
        print(f"No existe {factors}. Corre antes el paso 05")
        return 1
    out = config.layer("gold", args.data_dir) / f"region={args.region}" / "harmonized.parquet"
    out.parent.mkdir(parents=True, exist_ok=True)
    partial = out.with_suffix(".parquet.partial")

    print(f"Paso 06 - Gold: región '{args.region}' · factores {factors}")
    t0 = time.time()
    con = init_duckdb()
    fac_cols = {r[0] for r in con.execute(f"DESCRIBE SELECT * FROM read_parquet('{factors.as_posix()}')").fetchall()}
    has_ci = {"factor_lo", "factor_hi", "factor_global_lo", "factor_global_hi"} <= fac_cols
    print("  IC 95%: " + ("del bootstrap del paso 05" if has_ci else "factores sin IC -> límites = valor central"))
    con.execute(f"""
        COPY ({gold_sql((silver_dir / '**' / '*.parquet').as_posix(), factors.as_posix(), has_ci)})
        TO '{partial.as_posix()}' (FORMAT parquet, COMPRESSION zstd, ROW_GROUP_SIZE 500000)
    """)
    partial.replace(out)  # reemplaza el anterior solo cuando el nuevo está completo
    print(f"Listo en {time.time() - t0:.1f}s -> {out}")
    summary(con, out)
    return 0


if __name__ == "__main__":
    sys.exit(main())
