"""Build SYNTHETIC demo parquet so the app runs before real FIRMS data is processed.

    cd backend && .venv\\Scripts\\python ..\\data\\build_demo.py
"""
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent / "backend"))

from ignis import synth
from ignis.harmonize import harmonize
from ignis.store import write_processed

cells, monthly, meta, _ = synth.make()
out, summary = harmonize(monthly, cells, meta)
write_processed(Path(__file__).parent / "processed", cells, out, meta,
                {"synthetic": True, "harmonization": summary, "note": "Generated demo data, not FIRMS."})
print("rows:", len(out), "| validation:", summary["validation"])
