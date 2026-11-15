import hashlib
import io
import json
import os
from collections import OrderedDict
from pathlib import Path

from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.gzip import GZipMiddleware
from fastapi.responses import Response

from ignis import analytics, geo, hotspots
from ignis.harmonize import month_index, month_label
from ignis.models import ActivityRequest, ActivityResponse, SearchRequest, SearchResponse
from ignis.store import DataStore

DATA_DIR = Path(os.getenv("DATA_DIR", Path(__file__).resolve().parent.parent / "data" / "processed"))
MAX_CELL_ROWS = 200_000
HOTSPOTS_MAX_ROWS = 300_000  # rows of the individual-hotspots CSV; past it the download asks for a smaller area or month
HOTSPOTS_MAX_MONTHS = 12

app = FastAPI(title="IgnisSync API", version="0.1.0")
origins = [o.strip() for o in os.getenv("ALLOWED_ORIGINS", "http://localhost:5173").split(",") if o.strip()]
app.add_middleware(CORSMiddleware, allow_origins=origins, allow_origin_regex=r"https://.*\.vercel\.app",
                   allow_methods=["*"], allow_headers=["*"], expose_headers=["Content-Disposition"])
app.add_middleware(GZipMiddleware, minimum_size=1024)  # the hexagon maps are several MB of JSON

_store: DataStore | None = None


def store() -> DataStore:
    global _store
    if _store is None:
        if not (DATA_DIR / "monthly.parquet").exists():
            raise HTTPException(503, f"No processed data in {DATA_DIR}. Run data/build_demo.py or data/build_from_firms.py")
        _store = DataStore(DATA_DIR)
    return _store


def _ym(s: str | None) -> int | None:
    return None if s is None else month_index(int(s[:4]), int(s[5:7]))


def _run(req: SearchRequest):
    st = store()
    try:
        rings = geo.extract_rings(req.geojson)
    except (ValueError, KeyError, TypeError, IndexError) as e:
        raise HTTPException(422, str(e))
    m_lo = max(_ym(req.start) if req.start else st.m_min, st.m_min)
    m_hi = min(_ym(req.end) if req.end else st.m_max, st.m_max)
    if m_lo > m_hi:
        raise HTTPException(422, "start must be <= end")
    # Select the full history so the baseline is stable, then trim to the requested range.
    sel_all = st.select(rings, None, None)
    # Default baseline end: the one the pipeline delivery used (info.json baseline_years), else the last complete year.
    delivered = st.info.get("baseline_years")
    b_end = req.baseline_end if req.baseline_end is not None else (delivered[1] if delivered else None)
    series, clim, base = analytics.timeline(sel_all, st.months, m_lo, m_hi, req.baseline_start, b_end)
    in_range = sel_all[(sel_all["m"] >= m_lo) & (sel_all["m"] <= m_hi)]
    return st, rings, sel_all, in_range, series, clim, base


@app.get("/health")
def health():
    return {"status": "ok"}


@app.get("/api/meta")
def meta():
    st = store()
    return {"first_month": month_label(st.m_min), "last_month": month_label(st.m_max),
            "hotspots_available": hotspots.hotspots_dir(DATA_DIR) is not None, **st.info}


@app.post("/api/search", response_model=SearchResponse)
def search(req: SearchRequest):
    st, rings, _, in_range, series, clim, base = _run(req)
    x0, y0, x1, y1 = geo.bbox(rings)
    return SearchResponse(
        area=dict(bbox=[x0, y0, x1, y1], area_km2=round(geo.area_km2(rings), 1)),
        kpis=analytics.kpis(series, clim, in_range["cell_id"].nunique()),
        series=series, climatology=clim, baseline=base,
        harmonization=st.info.get("harmonization", {}), synthetic=bool(st.info.get("synthetic", False)),
    )


_activity_cache: OrderedDict = OrderedDict()  # (store, area hash, month) -> response; repeated clicks do not recompute
ACTIVITY_CACHE_SIZE = 32


@app.post("/api/activity", response_model=ActivityResponse)
def activity(req: ActivityRequest):
    """Hexagons with fire in one month inside the area, to paint on the map.

    Only harmonized, complete months: a month outside the delivery or still in progress answers 422, the same rule the
    calendar uses to decide which months can be selected.
    """
    st = store()
    m = _ym(req.month)
    if not st.m_min <= m <= st.m_max:
        raise HTTPException(422, f"{req.month} has no harmonized data ({month_label(st.m_min)} to {month_label(st.m_max)})")
    info = analytics.month_info(st.months, m)
    if info is None:
        raise HTTPException(422, f"{req.month} has no harmonized data")
    if info["is_partial"]:
        raise HTTPException(422, f"{req.month} is still in progress (incomplete month)")
    try:
        rings = geo.extract_rings(req.geojson)
    except (ValueError, KeyError, TypeError, IndexError) as e:
        raise HTTPException(422, str(e))
    key = (id(st), hashlib.sha1(json.dumps(req.geojson, sort_keys=True).encode()).hexdigest(), m)
    if key in _activity_cache:
        _activity_cache.move_to_end(key)
        return _activity_cache[key]
    sel = st.select(rings, m, m)
    feats = analytics.hex_features(sel, st.cells)
    result = ActivityResponse(
        month=req.month, source=info["source"],
        is_nrt=bool(sel["is_nrt"].any()) if "is_nrt" in sel.columns and len(sel) else False,
        n_cells=len(feats), total=round(float(sel.loc[sel["value"] > 0, "value"].sum()), 1), features=feats)  # exact sum, not of the rounded hexagons
    _activity_cache[key] = result
    if len(_activity_cache) > ACTIVITY_CACHE_SIZE:
        _activity_cache.popitem(last=False)
    return result


MONTHLY_COLUMNS = {
    "month": "month", "count": "harmonized_burn_days", "count_ci_lower": "ci95_lower", "count_ci_upper": "ci95_upper",
    "source": "source", "is_partial": "is_partial", "is_nrt": "is_preliminary", "raw_modis": "raw_modis_burn_days",
    "raw_viirs": "raw_viirs_burn_days", "frp_mw": "frp_mw", "median": "baseline_median", "anomaly_ratio": "anomaly_ratio",
    "anomaly_z": "anomaly_z", "percentile": "percentile",
}


def _csv_name(level: str, req: SearchRequest) -> str:
    when = "" if not req.start else f"_{req.start}" + (f"_{req.end}" if req.end and req.end != req.start else "")
    return f"ignissync_{level}{when}.csv"


@app.post("/api/export.csv")
def export_csv(req: SearchRequest, level: str = Query("monthly", pattern="^(monthly|cells|hotspots)$")):
    """monthly: harmonized series with its 95% interval, source and anomaly. cells: one row per H3 cell-month (lat/lon of cell
    centre). hotspots: the individual FIRMS detections inside the area for a month or a short range (start and end required)."""
    import pandas as pd

    if level == "hotspots":
        return _export_hotspots(req)

    st, _, _, in_range, series, _, _ = _run(req)
    if level == "monthly":
        df = pd.DataFrame(series)
        df = df[[c for c in MONTHLY_COLUMNS if c in df.columns]].rename(columns=MONTHLY_COLUMNS)
    else:
        in_range = in_range[in_range["value"] > 0]  # the hexagons with fire: the same ones /api/activity draws on the map
        if len(in_range) > MAX_CELL_ROWS:
            raise HTTPException(413, f"{len(in_range)} rows; shrink the area/date range or use level=monthly")
        c = st.cells.set_index("cell_id")
        df = in_range.assign(month=in_range["m"].map(month_label), h3=in_range["cell_id"].map(c["h3"]),
                             lat=in_range["cell_id"].map(c["lat"]), lon=in_range["cell_id"].map(c["lon"]))
        df = df[["month", "h3", "lat", "lon", "value", "modis_ta", "viirs"]].rename(
            columns={"value": "harmonized_burn_days", "modis_ta": "raw_modis_burn_days", "viirs": "raw_viirs_burn_days"})
    buf = io.StringIO()
    if st.info.get("synthetic"):
        buf.write("# SYNTHETIC DEMO DATA - not real fire observations\n")
    df.to_csv(buf, index=False)
    return Response(buf.getvalue(), media_type="text/csv",
                    headers={"Content-Disposition": f'attachment; filename="{_csv_name(level, req)}"'})


def _hotspot_query(req: SearchRequest):
    """Validate a hotspots request (folder present, bounded range, valid polygon): (folder, rings, first day, last day)."""
    folder = hotspots.hotspots_dir(DATA_DIR)
    if folder is None:
        raise HTTPException(503, "Individual hotspots are not available on this server")
    if not req.start or not req.end:
        raise HTTPException(422, "Hotspots need a month or a date range: send start and end (YYYY-MM)")
    try:
        d0, d1 = hotspots.month_bounds(req.start, req.end)
        rings = geo.extract_rings(req.geojson)
    except (ValueError, KeyError, TypeError, IndexError) as e:
        raise HTTPException(422, str(e))
    if d1 < d0:
        raise HTTPException(422, "start must be <= end")
    if (d1.year - d0.year) * 12 + d1.month - d0.month >= HOTSPOTS_MAX_MONTHS:
        raise HTTPException(422, f"Choose at most {HOTSPOTS_MAX_MONTHS} months of hotspots")
    return folder, rings, d0, d1


_count_cache: OrderedDict = OrderedDict()  # (area hash, start, end) -> count
COUNT_CACHE_SIZE = 64


@app.post("/api/hotspots/count")
def hotspot_count(req: SearchRequest):
    """Number of individual hotspots (FIRMS detections) inside the area for a month or a range of up to 12 months.

    The calendar counts burning cell-days (the harmonized unit); this is the literal count of detections, the same rows the
    hotspots CSV would contain, so a user can quote both.
    """
    folder, rings, d0, d1 = _hotspot_query(req)
    key = (hashlib.sha1(json.dumps(req.geojson, sort_keys=True).encode()).hexdigest(), req.start, req.end)
    if key not in _count_cache:
        _count_cache[key] = hotspots.count_hotspots(folder, rings, d0, d1)
        if len(_count_cache) > COUNT_CACHE_SIZE:
            _count_cache.popitem(last=False)
    else:
        _count_cache.move_to_end(key)
    return {"start": req.start, "end": req.end, "count": _count_cache[key]}


def _export_hotspots(req: SearchRequest):
    folder, rings, d0, d1 = _hotspot_query(req)
    try:
        df = hotspots.read_hotspots(folder, rings, d0, d1, HOTSPOTS_MAX_ROWS)
    except hotspots.TooManyHotspots as e:
        raise HTTPException(413, f"More than {HOTSPOTS_MAX_ROWS} hotspots ({e}); choose a smaller area or a single month")
    buf = io.StringIO()
    df.to_csv(buf, index=False)
    return Response(buf.getvalue(), media_type="text/csv",
                    headers={"Content-Disposition": f'attachment; filename="{_csv_name("hotspots", req)}"'})
