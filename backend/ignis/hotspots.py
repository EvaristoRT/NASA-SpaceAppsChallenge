"""Individual hotspots (FIRMS detections) of the data delivery, filtered by polygon and dates for the CSV download.

The delivery ships them as a Hive-partitioned Parquet dataset (`hotspots/year=YYYY/data_0.parquet`, ~1.3 GB for the Americas).
They are never loaded whole: a filtered scan reads only the years, dates and bounding box asked for.
"""
from __future__ import annotations

import calendar
import datetime as dt
import os
from pathlib import Path

import pandas as pd
import pyarrow.dataset as ds

from . import geo

# `sensor` repeats `satellite` and `type` carries nothing after the cleaning (data team's advice); `source` stays so that
# whoever downloads knows which detections are archive and which are preliminary near-real-time.
COLUMNS = ["acq_date", "acq_time", "latitude", "longitude", "satellite", "source", "frp", "confidence_level", "daynight", "h3_r6"]


class TooManyHotspots(Exception):
    """The query matched more rows than the download allows."""


def hotspots_dir(data_dir: Path) -> Path | None:
    """HOTSPOTS_DIR if set, else <data_dir>/hotspots; None when the folder is not there (e.g. a deployed server without hotspots)."""
    folder = Path(os.getenv("HOTSPOTS_DIR") or (data_dir / "hotspots"))
    return folder if folder.is_dir() else None


def month_bounds(start: str, end: str) -> tuple[dt.date, dt.date]:
    """First day of `start` (YYYY-MM) to last day of `end`."""
    y0, m0 = int(start[:4]), int(start[5:7])
    y1, m1 = int(end[:4]), int(end[5:7])
    return dt.date(y0, m0, 1), dt.date(y1, m1, calendar.monthrange(y1, m1)[1])


def read_hotspots(folder: Path, rings, d0: dt.date, d1: dt.date, max_rows: int) -> pd.DataFrame:
    """Hotspots inside the polygon between d0 and d1 (inclusive), oldest first. Raises TooManyHotspots past max_rows."""
    x0, y0, x1, y1 = geo.bbox(rings)
    dataset = ds.dataset(folder, format="parquet", partitioning="hive")
    flt = ((ds.field("year") >= d0.year) & (ds.field("year") <= d1.year)
           & (ds.field("acq_date") >= d0) & (ds.field("acq_date") <= d1)
           & (ds.field("latitude") >= y0) & (ds.field("latitude") <= y1)
           & (ds.field("longitude") >= x0) & (ds.field("longitude") <= x1))
    parts, total = [], 0
    for batch in dataset.scanner(columns=COLUMNS, filter=flt).to_batches():
        if batch.num_rows == 0:
            continue
        df = batch.to_pandas()
        inside = geo.points_in_rings(df["longitude"].to_numpy(dtype="float64"), df["latitude"].to_numpy(dtype="float64"), rings)
        df = df[inside]
        total += len(df)
        if total > max_rows:
            raise TooManyHotspots(total)
        if len(df):
            parts.append(df)
    if not parts:
        return pd.DataFrame(columns=COLUMNS)
    out = pd.concat(parts, ignore_index=True)
    return out.sort_values(["acq_date", "acq_time"], kind="stable").reset_index(drop=True)


def count_hotspots(folder: Path, rings, d0: dt.date, d1: dt.date) -> int:
    """How many hotspots fall inside the polygon between d0 and d1 (inclusive). Reads only the coordinates, never keeps rows."""
    x0, y0, x1, y1 = geo.bbox(rings)
    dataset = ds.dataset(folder, format="parquet", partitioning="hive")
    flt = ((ds.field("year") >= d0.year) & (ds.field("year") <= d1.year)
           & (ds.field("acq_date") >= d0) & (ds.field("acq_date") <= d1)
           & (ds.field("latitude") >= y0) & (ds.field("latitude") <= y1)
           & (ds.field("longitude") >= x0) & (ds.field("longitude") <= x1))
    total = 0
    for batch in dataset.scanner(columns=["latitude", "longitude"], filter=flt).to_batches():
        if batch.num_rows == 0:
            continue
        df = batch.to_pandas()
        total += int(geo.points_in_rings(df["longitude"].to_numpy(dtype="float64"), df["latitude"].to_numpy(dtype="float64"), rings).sum())
    return total
