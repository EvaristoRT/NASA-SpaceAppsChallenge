import os
import subprocess
import sys
from pathlib import Path

from fastapi.testclient import TestClient

ROOT = Path(__file__).resolve().parents[2]
os.environ["DATA_DIR"] = str(ROOT / "data" / "processed")


def _client():
    if not (ROOT / "data" / "processed" / "monthly.parquet").exists():
        subprocess.check_call([sys.executable, str(ROOT / "data" / "build_demo.py")])
    import main
    return TestClient(main.app)


POLY = {"type": "Polygon", "coordinates": [[[-97.5, 18.0], [-95.0, 18.0], [-95.0, 20.5], [-97.5, 20.5], [-97.5, 18.0]]]}


def test_search_and_export():
    c = _client()
    r = c.post("/api/search", json={"geojson": POLY})
    assert r.status_code == 200, r.text
    j = r.json()
    assert j["synthetic"] is True
    assert len(j["climatology"]) == 12 and j["kpis"]["total"] > 0
    assert j["kpis"]["peak_calendar_month"] in (4, 5)  # synthetic season peaks Apr-May
    r2 = c.post("/api/export.csv?level=monthly", json={"geojson": POLY, "start": "2020-01", "end": "2020-12"})
    assert r2.status_code == 200 and r2.text.count("\n") >= 13


def test_bad_geometry():
    c = _client()
    assert c.post("/api/search", json={"geojson": {"type": "Point", "coordinates": [0, 0]}}).status_code == 422
