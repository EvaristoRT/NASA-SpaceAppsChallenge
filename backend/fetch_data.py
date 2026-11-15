"""Download the pipeline delivery into DATA_DIR before the API starts (used by the deployed backend).

The data files are not in git. The data team publishes them as a GitHub Release asset
(pipeline/scripts/07_export.py --zip), and this script fetches that zip on start-up:

    DATA_URL  zip with cells.parquet, monthly.parquet, months.parquet, info.json
              e.g. https://github.com/<owner>/<repo>/releases/latest/download/ignis-backend-argentina_chile.zip
    DATA_DIR  where to unpack it (same variable main.py reads)

If DATA_DIR already has monthly.parquet it does nothing (set FORCE_DOWNLOAD=1 to refresh).
If DATA_URL is not set it does nothing, so local runs and the demo data keep working.

    python fetch_data.py && uvicorn main:app --host 0.0.0.0 --port $PORT
"""
from __future__ import annotations

import os
import shutil
import sys
import tempfile
import time
import urllib.request
import zipfile
from pathlib import Path

DATA_DIR = Path(os.getenv("DATA_DIR", Path(__file__).resolve().parent.parent / "data" / "processed"))
REQUIRED = ("cells.parquet", "monthly.parquet", "months.parquet", "info.json")


def main() -> int:
    url = os.getenv("DATA_URL")
    if not url:
        print("fetch_data: DATA_URL not set, using whatever is in DATA_DIR")
        return 0
    if (DATA_DIR / "monthly.parquet").exists() and os.getenv("FORCE_DOWNLOAD") != "1":
        print(f"fetch_data: {DATA_DIR} already has the data, skipping download")
        return 0

    t0 = time.time()
    DATA_DIR.mkdir(parents=True, exist_ok=True)
    with tempfile.TemporaryDirectory() as tmp:
        zpath = Path(tmp) / "delivery.zip"
        print(f"fetch_data: downloading {url}")
        req = urllib.request.Request(url, headers={"User-Agent": "ignissync-backend"})
        with urllib.request.urlopen(req, timeout=300) as r, open(zpath, "wb") as f:
            shutil.copyfileobj(r, f, 1 << 20)
        with zipfile.ZipFile(zpath) as z:
            names = z.namelist()
            missing = [n for n in REQUIRED if n not in names]
            if missing:
                print(f"fetch_data: the zip is missing {missing}", file=sys.stderr)
                return 1
            root = DATA_DIR.resolve()
            for n in names:
                # never write outside DATA_DIR, whatever the zip contains
                if not (root / n).resolve().is_relative_to(root):
                    print(f"fetch_data: unsafe path in zip: {n}", file=sys.stderr)
                    return 1
            z.extractall(DATA_DIR)
    mb = sum(f.stat().st_size for f in DATA_DIR.rglob("*") if f.is_file()) / 1e6
    print(f"fetch_data: {len(names)} files, {mb:.1f} MB in {DATA_DIR} ({time.time() - t0:.1f}s)")
    return 0


if __name__ == "__main__":
    sys.exit(main())
