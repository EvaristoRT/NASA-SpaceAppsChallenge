"""Timeline, climatology and anomalies for a selected set of cell-month rows."""
from __future__ import annotations

import numpy as np
import pandas as pd

from .harmonize import SOURCE_LABELS, month_label

# Label per `source` value of the pipeline delivery (months.parquet); only NOAA-20 is measured as is.
DELIVERY_LABELS = {"NOAA-20": "NOAA-20", "S-NPP": "S-NPP (escalado)", "MODIS": "MODIS (escalado)", "Terra": "Terra (escalado)"}


def _src_label(months: pd.DataFrame, m: int) -> str:
    r = months.loc[months["m"] == m]
    if r.empty:
        return SOURCE_LABELS[0]
    r = r.iloc[0]
    if "source" in r.index and r["source"] in DELIVERY_LABELS:
        return DELIVERY_LABELS[r["source"]]
    if r["viirs_sats"] > 0:
        return SOURCE_LABELS[2]
    return SOURCE_LABELS[1] if r["terra_only"] else SOURCE_LABELS[0]


def _is_partial(months: pd.DataFrame, m: int) -> bool | None:
    if "is_partial" not in months.columns:
        return None
    r = months.loc[months["m"] == m]
    return bool(r.iloc[0]["is_partial"]) if not r.empty else None


def timeline(sel: pd.DataFrame, months: pd.DataFrame, m_lo: int, m_hi: int,
             baseline_start: int, baseline_end: int | None):
    all_m = np.arange(int(months["m"].min()), int(months["m"].max()) + 1)
    g = sel.groupby("m")[["value", "modis_ta", "viirs"]].sum().reindex(all_m, fill_value=0)

    years = 2000 + all_m // 12
    first_full = int(years[all_m % 12 == 0].min()) if (all_m % 12 == 0).any() else int(years.min())
    complete = [y for y in np.unique(years) if (years == y).sum() == 12]
    b_end = baseline_end if baseline_end is not None else (complete[-1] if complete else int(years.max()))
    b_start = max(baseline_start, first_full)
    in_base = (years >= b_start) & (years <= b_end)

    # matrix: baseline years x 12 calendar months
    base = pd.DataFrame({"y": years[in_base], "mon": all_m[in_base] % 12 + 1, "v": g["value"].to_numpy()[in_base]})
    piv = base.pivot_table(index="y", columns="mon", values="v", aggfunc="sum").reindex(columns=range(1, 13))

    clim, med, mad, cols = [], {}, {}, {}
    for mon in range(1, 13):
        col = piv[mon].dropna().to_numpy()
        cols[mon] = col
        if col.size == 0:
            med[mon] = mad[mon] = 0.0
            clim.append(dict(month=mon, median=0.0, p25=0.0, p75=0.0, p90=0.0, mean=0.0))
            continue
        med[mon] = float(np.median(col))
        mad[mon] = float(np.median(np.abs(col - med[mon])))
        clim.append(dict(month=mon, median=med[mon], p25=float(np.percentile(col, 25)), p75=float(np.percentile(col, 75)),
                         p90=float(np.percentile(col, 90)), mean=float(col.mean())))

    series = []
    for m in range(m_lo, m_hi + 1):
        if m not in g.index:
            continue
        mon = m % 12 + 1
        v = float(g.at[m, "value"])
        md, mdev, col = med[mon], mad[mon], cols[mon]
        series.append(dict(
            month=month_label(m), count=round(v, 2),
            raw_modis=int(g.at[m, "modis_ta"]), raw_viirs=int(g.at[m, "viirs"]),
            source=_src_label(months, m), is_partial=_is_partial(months, m), median=round(md, 2),
            anomaly_ratio=round(v / md, 3) if md > 0 else None,
            anomaly_z=round((v - md) / (1.4826 * mdev), 2) if mdev > 0 else None,
            percentile=round(float((col <= v).mean() * 100), 1) if col.size else None,
        ))
    return series, clim, dict(start_year=int(b_start), end_year=int(b_end), method="median / MAD over same calendar month")


def month_info(months: pd.DataFrame, m: int) -> dict | None:
    """Row of months.parquet for month index m (None if the month is not in the delivery)."""
    r = months.loc[months["m"] == m]
    if r.empty:
        return None
    r = r.iloc[0]
    return dict(source=_src_label(months, m), is_partial=bool(r["is_partial"]) if "is_partial" in r.index else False)


def hex_features(sel_month: pd.DataFrame, cells: pd.DataFrame) -> list[dict]:
    """One H3 hexagon polygon per cell with fire in the month (lon/lat, 4 decimals, closed ring)."""
    import h3

    rows = sel_month[sel_month["value"] > 0]
    h3_ids = cells["h3"].to_numpy()[rows["cell_id"].to_numpy()]  # cell_id == row position in cells.parquet
    feats = []
    for cell, v in zip(h3_ids, rows["value"].to_numpy()):
        ring = [[round(lng, 4), round(lat, 4)] for lat, lng in h3.cell_to_boundary(cell)]
        ring.append(ring[0])
        feats.append({"type": "Feature", "properties": {"v": round(float(v), 1)},
                      "geometry": {"type": "Polygon", "coordinates": [ring]}})
    return feats


def kpis(series: list[dict], clim: list[dict], n_cells: int) -> dict:
    total = float(sum(p["count"] for p in series))
    by_year: dict[int, float] = {}
    for p in series:
        by_year[int(p["month"][:4])] = by_year.get(int(p["month"][:4]), 0.0) + p["count"]
    peak_year = max(by_year, key=by_year.get) if by_year and total > 0 else None
    peak_cm = max(clim, key=lambda c: c["median"])["month"] if any(c["median"] > 0 for c in clim) else None
    # The month in progress is not compared whole against the median: latest_* use the last complete month.
    complete = [p for p in series if not p.get("is_partial")]
    last = complete[-1] if complete else (series[-1] if series else None)
    return dict(
        total=round(total, 1), peak_year=peak_year, peak_year_total=round(by_year.get(peak_year, 0.0), 1),
        peak_calendar_month=peak_cm,
        latest_month=last["month"] if last else None, latest_count=last["count"] if last else None,
        latest_vs_median=last["anomaly_ratio"] if last else None, n_cells_with_fire=int(n_cells),
    )
