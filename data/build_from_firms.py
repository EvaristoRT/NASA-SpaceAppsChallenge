"""Real data: data/raw/*modis*.csv + *viirs*.csv  ->  data/processed/*.parquet

    cd backend && .venv\\Scripts\\python ..\\data\\build_from_firms.py
"""
import sys
from pathlib import Path

HERE = Path(__file__).resolve().parent
sys.path.insert(0, str(HERE.parent / "backend"))

from ignis import firms
from ignis.harmonize import harmonize
from ignis.store import write_processed

cells, monthly, meta = firms.build(HERE / "raw")
out, summary = harmonize(monthly, cells, meta)
write_processed(HERE / "processed", cells, out, meta,
                {"synthetic": False, "harmonization": summary, "source": "NASA FIRMS archive (MODIS C6.1, VIIRS S-NPP/NOAA-20/NOAA-21)"})
print("cells:", len(cells), "rows:", len(out))
print("validation:", summary["validation"])
