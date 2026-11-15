"""Paso 07 - Entrega de datos al equipo web.

RESPONSABLE: Paco            ESTADO: implementado

Entrada
    gold/region=<region>/harmonized.parquet    (paso 06, una fila h3 r6 x día)
    silver/region=<region>/**/*.parquet        (paso 03, focos limpios)
    models/metrics.json                        (paso 05, metadatos del modelo)

Salida (en <FIRE_DATA_DIR>/gold/entrega/)
    harmonized.parquet     serie diaria con median_same_month y anomaly_pct.
    hotspots/              dataset Parquet particionado por year para el CSV de focos.
    LEEME_ENTREGA.md       contrato, unidades, corte y meses NRT.

También escribe cells.parquet, monthly.parquet, months.parquet e info.json.
Es la opción B de PLAN_INTEGRACION_WEB.md: conserva el formato que el backend
ya sabe leer para que Manuel pueda apuntar DATA_DIR a esta carpeta.

Las anomalías de harmonized.parquet son mensuales por hexágono r6: primero se
suman los días de cada mes, se calcula la mediana de ese mes calendario en
config.BASELINE_YEARS y el resultado se une a cada fila diaria. La anomalía de
un polígono completo la sigue calculando el backend; no se deben sumar estas
anomalías por celda.

Uso:
    python pipeline/scripts/07_export.py
    python pipeline/scripts/07_export.py --region sudamerica
    python pipeline/scripts/07_export.py --data-dir D:\\datos_fuego
"""
from __future__ import annotations

import argparse
import json
import shutil
import sys
import time
from pathlib import Path

import duckdb
import h3
import pandas as pd

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
import config  # noqa: E402


DELIVERY_MODEL_VERSION = "nivel_1"


def init_duckdb() -> duckdb.DuckDBPyConnection:
    """Abre DuckDB y carga H3, instalado previamente por el paso 03."""
    con = duckdb.connect()
    try:
        con.execute("LOAD h3")
    except Exception as exc:
        raise SystemExit(
            "No se pudo cargar la extensión h3 de DuckDB. "
            "Ejecuta primero el paso 03 en esta máquina.\n"
            f"Detalle: {exc}"
        )
    return con


def sql_path(path: Path) -> str:
    """Ruta para una cadena SQL de DuckDB (Windows usa / en las rutas)."""
    return path.as_posix().replace("'", "''")


def copy_query(con: duckdb.DuckDBPyConnection, query: str, destination: Path) -> None:
    """Escribe un Parquet de forma atómica: el destino solo cambia al completar."""
    destination.parent.mkdir(parents=True, exist_ok=True)
    partial = destination.with_suffix(destination.suffix + ".partial")
    if partial.exists():
        partial.unlink()
    con.execute(
        f"COPY ({query}) TO '{sql_path(partial)}' "
        "(FORMAT parquet, COMPRESSION zstd, ROW_GROUP_SIZE 500000)"
    )
    partial.replace(destination)


def create_harmonized_export(con: duckdb.DuckDBPyConnection, source: Path, destination: Path) -> None:
    """Añade a cada día la anomalía mensual de su celda H3 r6."""
    src = sql_path(source)
    y0, y1 = config.BASELINE_YEARS
    # gold solo tiene filas en días con fuego. Un año base sin fuego en ese mes vale 0 y tiene que
    # entrar a la mediana; si no, la mediana solo ve los años con fuego y sale inflada.
    # Si la mediana es 0 (el mes casi nunca tiene fuego), anomaly_pct queda NULL.
    query = f"""
        WITH monthly AS (
            SELECT h3_index, year, month, sum(harmonized_count) AS month_value
            FROM read_parquet('{src}', hive_partitioning = false)
            GROUP BY h3_index, year, month
        ),
        base_years AS (SELECT range::INTEGER AS year FROM range({y0}, {y1} + 1)),
        keys AS (SELECT DISTINCT h3_index, month FROM monthly),
        baseline AS (
            SELECT k.h3_index, k.month, median(coalesce(m.month_value, 0)) AS median_same_month
            FROM keys k
            CROSS JOIN base_years y
            LEFT JOIN monthly m ON m.h3_index = k.h3_index AND m.month = k.month AND m.year = y.year
            GROUP BY k.h3_index, k.month
        ),
        anomalies AS (
            SELECT m.h3_index, m.year, m.month, b.median_same_month,
                   CASE WHEN b.median_same_month > 0
                        THEN 100.0 * (m.month_value - b.median_same_month) / b.median_same_month
                   END AS anomaly_pct
            FROM monthly m
            LEFT JOIN baseline b USING (h3_index, month)
        )
        SELECT h.*, a.median_same_month, a.anomaly_pct
        FROM read_parquet('{src}', hive_partitioning = false) h
        LEFT JOIN anomalies a USING (h3_index, year, month)
        ORDER BY h.h3_index, h.date
    """
    copy_query(con, query, destination)


def create_cell_map(con: duckdb.DuckDBPyConnection, source: Path, silver_glob: str) -> pd.DataFrame:
    """Asigna identificadores estables y centros a los hexágonos r6 de gold."""
    src = sql_path(source)
    con.execute(f"""
        CREATE OR REPLACE TEMP TABLE cell_map AS
        WITH regions AS (
            SELECT h3_h3_to_string(h3_r6) AS h3, any_value(h3_r3) AS region
            FROM read_parquet('{silver_glob}', hive_partitioning = true)
            WHERE h3_r6 IS NOT NULL
            GROUP BY h3_r6
        ),
        active AS (SELECT DISTINCT h3_index AS h3 FROM read_parquet('{src}', hive_partitioning = false))
        SELECT row_number() OVER (ORDER BY active.h3)::INTEGER - 1 AS cell_id,
               active.h3, regions.region
        FROM active
        JOIN regions USING (h3)
        ORDER BY cell_id
    """)
    cells = con.execute("SELECT cell_id, h3, region FROM cell_map ORDER BY cell_id").df()
    if cells.empty:
        raise SystemExit("La serie gold no contiene hexágonos para exportar.")
    try:
        centers = [h3.cell_to_latlng(value) for value in cells["h3"]]
    except Exception as exc:
        raise SystemExit(f"No se pudieron calcular los centros H3 r6: {exc}")
    cells["lat"] = [lat for lat, _ in centers]
    cells["lon"] = [lon for _, lon in centers]
    return cells[["cell_id", "h3", "lat", "lon", "region"]]


def create_backend_files(
    con: duckdb.DuckDBPyConnection,
    source: Path,
    silver_glob: str,
    cells: pd.DataFrame,
    delivery: Path,
    metrics: dict,
    region: str,
) -> None:
    """Genera el formato mensual ya consumido por backend/ignis/store.py."""
    con.register("delivery_cells", cells)
    copy_query(con, "SELECT * FROM delivery_cells ORDER BY cell_id", delivery / "cells.parquet")

    src = sql_path(source)
    # Los crudos se vuelven a contar como días-celda r8 desde silver. Así no se
    # confunden con los conteos de focos que conserva gold como trazabilidad.
    monthly_query = f"""
        WITH raw_daily AS (
            SELECT h3_h3_to_string(h3_r6) AS h3_index, acq_date AS date,
                   count(DISTINCT h3_r8) FILTER (WHERE satellite IN ('Terra', 'Aqua')) AS modis_ta,
                   count(DISTINCT h3_r8) FILTER (WHERE satellite = 'Terra') AS modis_t,
                   count(DISTINCT h3_r8) FILTER (WHERE satellite = 'S-NPP') AS snpp,
                   count(DISTINCT h3_r8) FILTER (WHERE satellite = 'NOAA-20') AS n20
            FROM read_parquet('{silver_glob}', hive_partitioning = true)
            WHERE h3_r6 IS NOT NULL
            GROUP BY h3_r6, acq_date
        ),
        daily AS (
            SELECT g.h3_index, g.date, g.year, g.month, g.primary_source,
                   g.harmonized_count,
                   coalesce(r.modis_ta, 0) AS modis_ta,
                   coalesce(r.modis_t, 0) AS modis_t,
                   CASE g.primary_source
                       WHEN 'S-NPP' THEN coalesce(r.snpp, 0)
                       WHEN 'NOAA-20' THEN coalesce(r.n20, 0)
                       ELSE 0
                   END AS viirs,
                   g.harmonized_ci_lower, g.harmonized_ci_upper,
                   g.harmonized_frp_mw, g.is_nrt
            FROM read_parquet('{src}', hive_partitioning = false) g
            LEFT JOIN raw_daily r USING (h3_index, date)
        )
        SELECT c.cell_id,
               ((d.year - 2000) * 12 + d.month - 1)::INTEGER AS m,
               sum(d.harmonized_count)::DOUBLE AS value,
               sum(d.modis_ta)::INTEGER AS modis_ta,
               sum(d.modis_t)::INTEGER AS modis_t,
               sum(d.viirs)::INTEGER AS viirs,
               max(d.primary_source) AS src,
               sum(d.harmonized_ci_lower)::DOUBLE AS value_ci_lower,
               sum(d.harmonized_ci_upper)::DOUBLE AS value_ci_upper,
               sum(d.harmonized_frp_mw)::DOUBLE AS frp_mw,
               bool_or(d.is_nrt) AS is_nrt
        FROM daily d
        JOIN cell_map c ON c.h3 = d.h3_index
        GROUP BY c.cell_id, m
        ORDER BY c.cell_id, m
    """
    copy_query(con, monthly_query, delivery / "monthly.parquet")

    cutoff = con.execute(f"SELECT max(date)::DATE FROM read_parquet('{src}', hive_partitioning = false)").fetchone()[0]
    if cutoff is None:
        raise SystemExit("La serie gold está vacía.")
    cutoff_text = str(cutoff)
    y, m, d = cutoff_text.split("-")
    cutoff_m = (int(y) - 2000) * 12 + int(m) - 1
    # El mes del corte casi siempre está incompleto: el backend no debe compararlo entero contra la mediana.
    cutoff_day = int(d)
    months_query = f"""
        WITH months AS (SELECT range::INTEGER AS m FROM range(10, {cutoff_m + 1})),
        dated AS (
            SELECT m, (2000 + m // 12)::INTEGER AS year, (m % 12 + 1)::INTEGER AS month
            FROM months
        )
        SELECT m,
               CASE WHEN year > 2018 OR (year = 2018 AND month >= 4) THEN 1
                    WHEN year > 2012 OR (year = 2012 AND month >= 1) THEN 1 ELSE 0 END::INTEGER AS viirs_sats,
               (year < 2002 OR (year = 2002 AND month < 7)) AS terra_only,
               (year > 2002 OR (year = 2002 AND month >= 7)) AS modis_full,
               CASE WHEN year > 2018 OR (year = 2018 AND month >= 4) THEN 'NOAA-20'
                    WHEN year > 2012 OR (year = 2012 AND month >= 1) THEN 'S-NPP'
                    WHEN year > 2002 OR (year = 2002 AND month >= 7) THEN 'MODIS'
                    ELSE 'Terra' END AS source,
               day(last_day(make_date(year, month, 1)))::INTEGER AS days_in_month,
               CASE WHEN m = {cutoff_m} THEN {cutoff_day}
                    ELSE day(last_day(make_date(year, month, 1))) END::INTEGER AS days_observed,
               (m = {cutoff_m} AND {cutoff_day} < day(last_day(make_date(year, month, 1)))) AS is_partial
        FROM dated
        ORDER BY m
    """
    copy_query(con, months_query, delivery / "months.parquet")
    last_complete = con.execute(
        f"SELECT max(m) FROM read_parquet('{sql_path(delivery / 'months.parquet')}') WHERE NOT is_partial"
    ).fetchone()[0]

    info = {
        "synthetic": False,
        "reference_satellite": config.REFERENCE_SATELLITE,
        "harmonization": metrics,
        "cutoff_date": cutoff_text,
        "last_complete_month": f"{2000 + last_complete // 12}-{last_complete % 12 + 1:02d}",
        "partial_month": None if last_complete == cutoff_m else f"{y}-{m}",
        "region": region,
        "model_version": metrics.get("model_version", DELIVERY_MODEL_VERSION),
        "baseline_years": list(config.BASELINE_YEARS),
    }
    (delivery / "info.json").write_text(json.dumps(info, indent=2, ensure_ascii=False), encoding="utf-8")


def create_hotspots(con: duckdb.DuckDBPyConnection, silver_glob: str, delivery: Path) -> Path:
    """Escribe los focos limpios en un dataset Hive, una partición por año."""
    target = delivery / "hotspots"
    partial = delivery / "hotspots.partial"
    if partial.exists():
        shutil.rmtree(partial)
    partial.mkdir(parents=True)
    query = f"""
        SELECT h3_h3_to_string(h3_r6) AS h3_r6, acq_date, acq_time,
               latitude, longitude, sensor, satellite, source, frp,
               confidence_level, daynight, type, year
        FROM read_parquet('{silver_glob}', hive_partitioning = true)
        WHERE h3_r6 IS NOT NULL
        ORDER BY h3_r6, acq_date, acq_time
    """
    con.execute(
        f"COPY ({query}) TO '{sql_path(partial)}' "
        "(FORMAT parquet, COMPRESSION zstd, PARTITION_BY (year))"
    )
    if target.exists():
        shutil.rmtree(target)
    partial.replace(target)
    return target


def write_readme(con: duckdb.DuckDBPyConnection, harmonized: Path, delivery: Path, metrics: dict) -> None:
    """Documenta la entrega con los valores concretos que se acaban de exportar."""
    hpath = sql_path(harmonized)
    rows, cells, start, cutoff = con.execute(
        f"SELECT count(*), count(DISTINCT h3_index), min(date), max(date) FROM read_parquet('{hpath}', hive_partitioning = false)"
    ).fetchone()
    nrt = con.execute(f"""
        SELECT string_agg(DISTINCT strftime(date, '%Y-%m'), ', ' ORDER BY strftime(date, '%Y-%m'))
        FROM read_parquet('{hpath}', hive_partitioning = false) WHERE is_nrt
    """).fetchone()[0] or "ninguno"
    model_version = metrics.get("model_version", DELIVERY_MODEL_VERSION)
    info = json.loads((delivery / "info.json").read_text(encoding="utf-8"))
    partial_note = (f"{info['partial_month']}, datos hasta {cutoff}" if info.get("partial_month")
                    else "no: el corte cae en el último día del mes")
    text = f"""# Entrega de datos — armonización MODIS / VIIRS

Fecha de corte: **{cutoff}**

Región: **{metrics.get('region', config.DEFAULT_REGION)}**

Modelo: **{model_version}**, referencia **{config.REFERENCE_SATELLITE}**
Línea base de anomalías: **{config.BASELINE_YEARS[0]}–{config.BASELINE_YEARS[1]}**

`harmonized.parquet` contiene {rows:,} filas diarias, desde {start} hasta {cutoff},
en {cells:,} hexágonos H3 resolución 6. La unidad de `harmonized_count` es
**días-celda con fuego, equivalente NOAA-20**; no es número de incendios ni de focos.

## Archivos

| Archivo | Contenido |
|---|---|
| `harmonized.parquet` | `h3_index`, `date`, `year`, `month`, `dekad`, `modis_raw_count`, `viirs_raw_count`, `harmonized_count`, `harmonized_ci_lower`, `harmonized_ci_upper`, `harmonized_frp_mw`, `primary_source`, `is_nrt`, `fire_regime`, `median_same_month`, `anomaly_pct` |
| `hotspots/` | Dataset Parquet Hive, particionado por `year`; columnas `h3_r6`, `acq_date`, `acq_time`, `latitude`, `longitude`, `sensor`, `satellite`, `source`, `frp`, `confidence_level`, `daynight`, `type`. Está ordenado por H3 y fecha dentro de cada partición. |
| `cells.parquet`, `monthly.parquet`, `months.parquet`, `info.json` | Formato de compatibilidad para `backend/ignis/store.py`; apunta `DATA_DIR` del backend a esta carpeta. |

`median_same_month` y `anomaly_pct` se calculan por hexágono y mes calendario.
Los años base sin fuego en ese mes cuentan como 0; si la mediana es 0 (mes que casi nunca
tiene fuego en ese hexágono), `anomaly_pct` queda vacío.
No deben sumarse para obtener la anomalía de un polígono: el backend recalcula su
mediana sobre la serie agregada del área.

**El mes del corte está incompleto** ({partial_note}). `months.parquet` lo marca con
`is_partial = true` y `days_observed`; no debe compararse entero contra la mediana del mes.

Meses que incluyen datos NRT: {nrt}. NASA reemplaza esos datos preliminares por
archive aproximadamente cinco meses después.
"""
    (delivery / "LEEME_ENTREGA.md").write_text(text, encoding="utf-8")


def main() -> int:
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--data-dir", help="Carpeta de datos (por defecto: FIRE_DATA_DIR)")
    ap.add_argument("--region", default=config.DEFAULT_REGION, choices=sorted(config.REGIONS))
    args = ap.parse_args()

    gold = config.layer("gold", args.data_dir)
    source = gold / f"region={args.region}" / "harmonized.parquet"
    silver = config.layer("silver", args.data_dir) / f"region={args.region}"
    metrics_path = config.layer("models", args.data_dir) / "metrics.json"
    missing = [p for p in (source, silver, metrics_path) if not p.exists()]
    if missing:
        print("Faltan entradas requeridas:\n" + "\n".join(f"  - {p}" for p in missing))
        return 1

    delivery = gold / "entrega"
    delivery.mkdir(parents=True, exist_ok=True)
    silver_glob = sql_path(silver / "**" / "*.parquet")
    metrics = json.loads(metrics_path.read_text(encoding="utf-8"))

    print(f"Paso 07 - Entrega: región '{args.region}'")
    t0 = time.time()
    con = init_duckdb()
    harmonized = delivery / "harmonized.parquet"
    create_harmonized_export(con, source, harmonized)
    cells = create_cell_map(con, source, silver_glob)
    create_backend_files(con, source, silver_glob, cells, delivery, metrics, args.region)
    hotspots = create_hotspots(con, silver_glob, delivery)
    write_readme(con, harmonized, delivery, metrics)

    print(f"Listo en {time.time() - t0:.1f}s -> {delivery}")
    print(f"  {harmonized.name}: serie diaria con anomalías")
    print(f"  {hotspots.name}/: focos limpios por año")
    print("  cells/monthly/months/info: formato para backend")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
