"""Load the pre-aggregated parquet files once and answer polygon queries from memory."""
from __future__ import annotations

import json
from pathlib import Path

import numpy as np
import pandas as pd

from . import geo


def write_processed(outdir: Path, cells: pd.DataFrame, monthly_h: pd.DataFrame, meta: pd.DataFrame, info: dict):
    outdir.mkdir(parents=True, exist_ok=True)
    cells[["cell_id", "h3", "lat", "lon"]].to_parquet(outdir / "cells.parquet", index=False)
    monthly_h.sort_values(["cell_id", "m"]).to_parquet(outdir / "monthly.parquet", index=False)
    meta.to_parquet(outdir / "months.parquet", index=False)
    (outdir / "info.json").write_text(json.dumps(info, indent=2), encoding="utf-8")


class DataStore:
    def __init__(self, folder: Path):
        self.cells = pd.read_parquet(folder / "cells.parquet")
        monthly = pd.read_parquet(folder / "monthly.parquet").sort_values(["cell_id", "m"], kind="stable")
        self.monthly = monthly.reset_index(drop=True)
        self.months = pd.read_parquet(folder / "months.parquet")
        self.info = json.loads((folder / "info.json").read_text(encoding="utf-8"))
        self._lon = self.cells["lon"].to_numpy()
        self._lat = self.cells["lat"].to_numpy()
        self._cid = self.cells["cell_id"].to_numpy()
        self._mcid = self.monthly["cell_id"].to_numpy()
        self.m_min, self.m_max = int(self.months["m"].min()), int(self.months["m"].max())

    def select(self, rings, m_start: int | None, m_end: int | None) -> pd.DataFrame:
        x0, y0, x1, y1 = geo.bbox(rings)
        cand = (self._lon >= x0) & (self._lon <= x1) & (self._lat >= y0) & (self._lat <= y1)
        idx = np.nonzero(cand)[0]
        if idx.size:
            idx = idx[geo.points_in_rings(self._lon[idx], self._lat[idx], rings)]
        ids = self._cid[idx]  # cell_ids are sorted ascending (== position) in the files we write
        starts = np.searchsorted(self._mcid, ids, "left")
        ends = np.searchsorted(self._mcid, ids, "right")
        lens = ends - starts
        if lens.sum() == 0:
            return self.monthly.iloc[0:0]
        offs = np.repeat(starts - (np.cumsum(lens) - lens), lens) + np.arange(lens.sum())
        sel = self.monthly.iloc[offs]
        if m_start is not None:
            sel = sel[sel["m"] >= m_start]
        if m_end is not None:
            sel = sel[sel["m"] <= m_end]
        return sel
