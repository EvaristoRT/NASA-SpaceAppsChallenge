import io
import os
from pathlib import Path

from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import Response

from ignis import analytics, geo
from ignis.harmonize import month_index, month_label
from ignis.models import SearchRequest, SearchResponse
from ignis.store import DataStore

DATA_DIR = Path(os.getenv("DATA_DIR", Path(__file__).resolve().parent.parent / "data" / "processed"))
MAX_CELL_ROWS = 200_000

app = FastAPI(title="IgnisSync API", version="0.1.0")
origins = [o.strip() for o in os.getenv("ALLOWED_ORIGINS", "http://localhost:5173").split(",") if o.strip()]
app.add_middleware(CORSMiddleware, allow_origins=origins, allow_origin_regex=r"https://.*\.vercel\.app",
                   allow_methods=["*"], allow_headers=["*"])

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
    series, clim, base = analytics.timeline(sel_all, st.months, m_lo, m_hi, req.baseline_start, req.baseline_end)
    in_range = sel_all[(sel_all["m"] >= m_lo) & (sel_all["m"] <= m_hi)]
    return st, rings, sel_all, in_range, series, clim, base


@app.get("/health")
def health():
    return {"status": "ok"}


@app.get("/api/meta")
def meta():
    st = store()
    return {"first_month": month_label(st.m_min), "last_month": month_label(st.m_max), **st.info}


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


@app.post("/api/export.csv")
def export_csv(req: SearchRequest, level: str = Query("monthly", pattern="^(monthly|cells)$")):
    """monthly: harmonized series + anomaly. cells: one row per H3 cell-month (lat/lon of cell centre)."""
    import pandas as pd

    st, _, _, in_range, series, _, _ = _run(req)
    if level == "monthly":
        df = pd.DataFrame(series)
    else:
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
                    headers={"Content-Disposition": f'attachment; filename="ignissync_{level}.csv"'})
