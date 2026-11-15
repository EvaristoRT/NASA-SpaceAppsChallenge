"""Convert FIRMS yearly-by-country zips (MODIS and VIIRS) into the bronze Parquet layer.

Reads every ``*_all_countries.zip`` found (recursively) under the raw folder, without
unpacking it permanently: each zip is extracted to a temporary folder, converted with
DuckDB to a common schema, and the temporary CSVs are deleted.

Output (one file per zip, so a re-run simply replaces it):

    <out>/sensor=MODIS/year=2005/modis.parquet
    <out>/sensor=VIIRS/year=2015/viirs-snpp.parquet
    <out>/sensor=VIIRS/year=2020/viirs-jpss1.parquet

Read it back with:
    duckdb.sql("SELECT * FROM read_parquet('<out>/**/*.parquet', hive_partitioning=true)")

Usage:
    set FIRE_DATA_DIR=C:\\NASA            (once; the folder that holds the zips)
    python pipeline/scripts/01_to_parquet.py                     # everything
    python pipeline/scripts/01_to_parquet.py --sensor MODIS --years 2000
    python pipeline/scripts/01_to_parquet.py --overwrite         # redo existing files
"""
from __future__ import annotations

import argparse
import os
import re
import sys
import tempfile
import time
import zipfile
from dataclasses import dataclass
from pathlib import Path

import duckdb

# File name -> (sensor, product). Product is also the output file name.
ZIP_PATTERN = re.compile(r"^(modis|viirs-snpp|viirs-jpss1|viirs-jpss2)_(\d{4})_all_countries\.zip$", re.I)
SENSOR_OF = {"modis": "MODIS", "viirs-snpp": "VIIRS", "viirs-jpss1": "VIIRS", "viirs-jpss2": "VIIRS"}

# Raw satellite codes found in FIRMS files -> one readable name.
SATELLITE_SQL = """
    CASE upper(trim(satellite))
        WHEN 'T' THEN 'Terra' WHEN 'TERRA' THEN 'Terra'
        WHEN 'A' THEN 'Aqua'  WHEN 'AQUA'  THEN 'Aqua'
        WHEN 'N' THEN 'S-NPP' WHEN 'NPP'   THEN 'S-NPP' WHEN 'SUOMI NPP' THEN 'S-NPP'
        WHEN 'N20' THEN 'NOAA-20' WHEN '1' THEN 'NOAA-20' WHEN 'NOAA-20' THEN 'NOAA-20'
        WHEN 'N21' THEN 'NOAA-21' WHEN '2' THEN 'NOAA-21' WHEN 'NOAA-21' THEN 'NOAA-21'
        ELSE trim(satellite)
    END"""

# MODIS confidence is 0-100; VIIRS is l / n / h. Both end up as low / nominal / high.
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
# Mid-infrared and thermal-infrared brightness columns have different names per sensor.
BRIGHTNESS_COLS = {"MODIS": ("brightness", "bright_t31"), "VIIRS": ("bright_ti4", "bright_ti5")}


@dataclass
class RawZip:
    path: Path
    product: str  # modis | viirs-snpp | viirs-jpss1 | viirs-jpss2
    sensor: str   # MODIS | VIIRS
    year: int


def find_zips(raw_dir: Path) -> list[RawZip]:
    found = []
    for p in sorted(raw_dir.rglob("*.zip")):
        m = ZIP_PATTERN.match(p.name)
        if m:
            product = m.group(1).lower()
            found.append(RawZip(p, product, SENSOR_OF[product], int(m.group(2))))
    return found


def select_sql(csv_glob: str, sensor: str) -> str:
    mir, tir = BRIGHTNESS_COLS[sensor]
    # The country comes from the CSV name: viirs-snpp_2025_Argentina.csv -> Argentina
    country = r"replace(regexp_extract(filename, '_\d{4}_(.+)\.csv$', 1), '_', ' ')"
    return f"""
        SELECT
            '{sensor}'                                        AS sensor,
            {SATELLITE_SQL}                                   AS satellite,
            CASE WHEN upper(version) LIKE '%NRT%' THEN 'nrt' ELSE 'archive' END AS source,
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
            TRY_CAST(type AS TINYINT)                         AS type
        FROM read_csv('{csv_glob}', header=true, all_varchar=true,
                      union_by_name=true, filename=true)
        WHERE latitude IS NOT NULL AND longitude IS NOT NULL AND acq_date IS NOT NULL
    """


def convert(con: duckdb.DuckDBPyConnection, rz: RawZip, out_dir: Path, tmp_root: Path | None) -> int:
    target = out_dir / f"sensor={rz.sensor}" / f"year={rz.year}" / f"{rz.product}.parquet"
    target.parent.mkdir(parents=True, exist_ok=True)
    partial = target.with_suffix(".parquet.partial")

    with tempfile.TemporaryDirectory(dir=tmp_root, prefix="firms_") as tmp:
        with zipfile.ZipFile(rz.path) as z:
            csvs = [m for m in z.namelist() if m.lower().endswith(".csv")]
            for member in csvs:
                # Flatten into tmp/ so one glob reads them all; names are unique per zip.
                with z.open(member) as src, open(Path(tmp) / Path(member).name, "wb") as dst:
                    while chunk := src.read(1 << 20):
                        dst.write(chunk)
        csv_glob = (Path(tmp) / "*.csv").as_posix()
        con.execute(f"""
            COPY ({select_sql(csv_glob, rz.sensor)} ORDER BY acq_date, acq_time)
            TO '{partial.as_posix()}' (FORMAT parquet, COMPRESSION zstd, ROW_GROUP_SIZE 500000)
        """)

    # Replace the old file only once the new one is complete (safe if interrupted).
    partial.replace(target)
    return con.execute(f"SELECT count(*) FROM read_parquet('{target.as_posix()}')").fetchone()[0]


def main() -> int:
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--data-dir", default=os.environ.get("FIRE_DATA_DIR"),
                    help="Folder with the FIRMS zips (default: FIRE_DATA_DIR environment variable)")
    ap.add_argument("--out", help="Bronze output folder (default: <data-dir>/bronze)")
    ap.add_argument("--sensor", choices=["MODIS", "VIIRS", "all"], default="all")
    ap.add_argument("--product", help="Only one product, e.g. viirs-snpp or viirs-jpss1")
    ap.add_argument("--years", help="Year or range, e.g. 2005 or 2001-2011")
    ap.add_argument("--overwrite", action="store_true", help="Redo files that already exist")
    ap.add_argument("--tmp-dir", help="Where to unpack each zip temporarily (default: system temp)")
    args = ap.parse_args()

    if not args.data_dir:
        ap.error("set FIRE_DATA_DIR or pass --data-dir")
    data_dir = Path(args.data_dir)
    out_dir = Path(args.out) if args.out else data_dir / "bronze"

    zips = find_zips(data_dir)
    if args.sensor != "all":
        zips = [z for z in zips if z.sensor == args.sensor]
    if args.product:
        zips = [z for z in zips if z.product == args.product.lower()]
    if args.years:
        lo, _, hi = args.years.partition("-")
        zips = [z for z in zips if int(lo) <= z.year <= int(hi or lo)]
    if not zips:
        print(f"No FIRMS zips matched in {data_dir}")
        return 1

    print(f"{len(zips)} zip(s) -> {out_dir}")
    con = duckdb.connect()
    con.execute("SET preserve_insertion_order = false")
    total_rows, t_all = 0, time.time()
    for i, rz in enumerate(zips, 1):
        target = out_dir / f"sensor={rz.sensor}" / f"year={rz.year}" / f"{rz.product}.parquet"
        if target.exists() and not args.overwrite:
            print(f"[{i}/{len(zips)}] skip {rz.path.name} (already converted)")
            continue
        t0 = time.time()
        rows = convert(con, rz, out_dir, Path(args.tmp_dir) if args.tmp_dir else None)
        total_rows += rows
        mb = target.stat().st_size / 1e6
        print(f"[{i}/{len(zips)}] {rz.path.name}: {rows:,} rows, {mb:.1f} MB, {time.time() - t0:.0f}s")
    print(f"Done: {total_rows:,} rows in {time.time() - t_all:.0f}s")
    return 0


if __name__ == "__main__":
    sys.exit(main())
