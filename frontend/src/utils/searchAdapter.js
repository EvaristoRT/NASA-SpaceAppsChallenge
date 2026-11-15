// Adaptador de la respuesta de POST /api/search (backend/ignis/models.py::SearchResponse) a la forma que usa
// AnalysisView (la misma que devuelve buildDemoAnalysis en utils/demoAnalysis.js). Ver pipeline/PLAN_INTEGRACION_WEB.md, sección 4.
//
// Todavía NO está conectado: falta decidir con el equipo de datos el formato de entrega (opción A o B) y dónde se
// despliega el backend. Cuando se conecte, AnalysisView llama a esta función en lugar de buildDemoAnalysis.
// Los campos nuevos del plan (source, count_ci_lower/upper, is_nrt) son opcionales: si no vienen, se ignoran.

const ELEVATED = 1.25; // mismo umbral que la demostración
const LOW = 0.75;

const parseMonth = (text) => {
  const [y, m] = text.split('-').map(Number);
  return { year: y, month: m - 1 }; // el panel cuenta los meses desde 0
};

export function adaptSearchResponse(response) {
  const { series = [], kpis = {}, synthetic = false } = response;
  if (!series.length) return null; // sin datos: quien llama debe mostrar el aviso de cobertura, no una serie en cero

  const points = series.map((p) => ({ ...p, ...parseMonth(p.month) }));
  const firstYear = Math.min(...points.map((p) => p.year));
  const lastYear = Math.max(...points.map((p) => p.year));

  const calendar = {};
  const source = {};
  const ci = {};
  const nrt = {};
  const partial = {};
  for (let y = firstYear; y <= lastYear; y++) {
    calendar[y] = new Array(12).fill(null); // null = sin dato (meses futuros o fuera del rango)
    source[y] = new Array(12).fill(null);
    ci[y] = new Array(12).fill(null);
    nrt[y] = new Array(12).fill(false);
    partial[y] = new Array(12).fill(false);
  }

  const yearTotals = {};
  const monthTotals = new Array(12).fill(0);
  let total = 0;
  let peak = { value: -1, year: firstYear, month: 0 };
  for (const p of points) {
    const value = Math.round(p.count);
    calendar[p.year][p.month] = value;
    source[p.year][p.month] = p.source ?? null;
    if (p.count_ci_lower != null && p.count_ci_upper != null) ci[p.year][p.month] = [p.count_ci_lower, p.count_ci_upper];
    if (p.is_nrt) nrt[p.year][p.month] = true;
    if (p.is_partial) partial[p.year][p.month] = true; // mes en curso: no se puede elegir para el mapa
    total += value;
    monthTotals[p.month] += value;
    yearTotals[p.year] = (yearTotals[p.year] ?? 0) + value;
    if (value > peak.value) peak = { value, year: p.year, month: p.month };
  }

  const peakYear =
    kpis.peak_year ?? Number(Object.keys(yearTotals).reduce((a, b) => (yearTotals[a] >= yearTotals[b] ? a : b)));
  const riskMonth =
    kpis.peak_calendar_month != null ? kpis.peak_calendar_month - 1 : monthTotals.indexOf(Math.max(...monthTotals));
  const latest = kpis.latest_month ? parseMonth(kpis.latest_month) : { year: lastYear, month: points[points.length - 1].month };
  const ratio = kpis.latest_vs_median ?? null;

  return {
    synthetic,
    firstYear,
    lastYear,
    currentMonth: latest.month,
    calendar,
    max: Math.max(120, peak.value), // mismo piso que la demostración para la escala de color
    peak,
    total: kpis.total != null ? Math.round(kpis.total) : total,
    peakYear,
    riskMonth,
    ratio,
    status: ratio === null ? 'normal' : ratio >= ELEVATED ? 'elevated' : ratio <= LOW ? 'low' : 'normal',
    // Fuente por mes, banda de incertidumbre y meses preliminares (los usan el calendario y la gráfica de la estimación)
    source,
    ci,
    nrt,
    partial,
    // Serie mensual para la gráfica de la estimación del modelo: valor, intervalo al 95 %, fuente y estado de cada mes
    points: series.map((p) => ({
      month: p.month,
      count: p.count,
      lo: p.count_ci_lower ?? null,
      hi: p.count_ci_upper ?? null,
      source: p.source ?? null,
      nrt: Boolean(p.is_nrt),
      partial: Boolean(p.is_partial)
    }))
  };
}
