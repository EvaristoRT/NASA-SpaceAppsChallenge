import numpy as np

from ignis import synth
from ignis.harmonize import harmonize, month_index


def _yearly(monthly, col, year):
    sel = (monthly["m"] // 12 + 2000) == year
    return monthly.loc[sel, col].sum()


def test_harmonization_removes_sensor_steps():
    cells, monthly, meta, truth = synth.make(n_cells=2500, year_noise=0.0)
    out, summary = harmonize(monthly, cells, meta)

    # Raw: the VIIRS count jumps >2x vs MODIS when it starts -> fake "fire increase".
    raw = _yearly(monthly, "viirs", 2014) / _yearly(monthly, "modis_ta", 2014)
    assert raw > 1.8

    # Harmonized: with constant true activity, every era must give the same yearly total.
    years = [2001, 2008, 2014, 2020, 2025]
    tot = np.array([_yearly(out, "value", y) for y in years])
    spread = (tot.max() - tot.min()) / tot.mean()
    assert spread < 0.08, (years, tot, spread)

    v = summary["validation"]
    assert v["pearson_r_region_month"] > 0.9
    assert abs(v["bias_pct_total"]) < 5


def test_terra_only_years_are_scaled_up():
    cells, monthly, meta, _ = synth.make(n_cells=1500, year_noise=0.0)
    out, _ = harmonize(monthly, cells, meta)
    m = month_index(2001, 4)
    raw = out.loc[out["m"] == m, "modis_ta"].sum()
    harm = out.loc[out["m"] == m, "value"].sum()
    assert 1.7 < harm / raw < 2.3  # Terra alone sees ~half of Terra+Aqua
