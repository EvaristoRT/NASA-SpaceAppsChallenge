"""THE CONTRACT. Frontend types are generated from /openapi.json (see GUIA_DESPLIEGUE paso 9).
Change only by agreement of all three devs."""
from __future__ import annotations

from typing import Literal, Optional

from pydantic import BaseModel, Field

MonthStr = Field(None, pattern=r"^\d{4}-\d{2}$", description="YYYY-MM")


class SearchRequest(BaseModel):
    geojson: dict = Field(description="Polygon/MultiPolygon geometry, Feature or FeatureCollection (WGS84 lon/lat)")
    start: Optional[str] = MonthStr
    end: Optional[str] = MonthStr
    baseline_start: int = Field(2003, description="First year of the climatological baseline")
    baseline_end: Optional[int] = Field(None, description="Last year of baseline (default: last complete year)")


class MonthPoint(BaseModel):
    month: str = Field(description="YYYY-MM")
    count: float = Field(description="Harmonized MODIS-equivalent burning cell-days")
    raw_modis: int
    raw_viirs: int
    source: Literal["MODIS", "MODIS Terra-only (scaled)", "VIIRS (scaled to MODIS)"]
    median: Optional[float] = Field(None, description="Baseline median for this calendar month")
    anomaly_ratio: Optional[float] = Field(None, description="count / median")
    anomaly_z: Optional[float] = Field(None, description="Robust z-score (MAD based)")
    percentile: Optional[float] = Field(None, description="Rank 0-100 vs baseline years, same calendar month")


class ClimatologyMonth(BaseModel):
    month: int = Field(ge=1, le=12)
    median: float
    p25: float
    p75: float
    p90: float
    mean: float


class KPIs(BaseModel):
    total: float
    peak_year: Optional[int]
    peak_year_total: float
    peak_calendar_month: Optional[int] = Field(description="Calendar month (1-12) with highest baseline median")
    latest_month: Optional[str]
    latest_count: Optional[float]
    latest_vs_median: Optional[float]
    n_cells_with_fire: int


class AreaInfo(BaseModel):
    bbox: list[float] = Field(description="[min_lon, min_lat, max_lon, max_lat]")
    area_km2: float


class SearchResponse(BaseModel):
    area: AreaInfo
    kpis: KPIs
    series: list[MonthPoint]
    climatology: list[ClimatologyMonth]
    baseline: dict
    harmonization: dict
    synthetic: bool = Field(description="True when running on generated demo data, not FIRMS")
