// DATOS DE DEMOSTRACIÓN para maquetar el panel de análisis. No son observaciones de incendios.
//
// Cuando el backend esté conectado (POST /api/search), el panel debe recibir un objeto con esta misma forma y esta
// función se puede borrar. `calendar[año][mes]` es el número de días con fuego (equivalentes a MODIS) y `null` en los
// meses que todavía no han ocurrido.

const MONTHS = 12;

// Generador pseudoaleatorio reproducible a partir de un texto: la misma zona siempre da el mismo calendario
function seeded(text) {
  let h = 1779033703 ^ text.length;
  for (let i = 0; i < text.length; i++) {
    h = Math.imul(h ^ text.charCodeAt(i), 3432918353);
    h = (h << 13) | (h >>> 19);
  }
  return () => {
    h = Math.imul(h ^ (h >>> 16), 2246822507);
    h = Math.imul(h ^ (h >>> 13), 3266489909);
    h ^= h >>> 16;
    return (h >>> 0) / 4294967296;
  };
}

const median = (values) => {
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
};

export function buildDemoAnalysis(seedText, now = new Date()) {
  const rand = seeded(seedText || 'demo');
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth();
  const firstYear = currentYear - 10;

  // Temporada de quemas: un mes pico propio de la zona, y años más o menos activos
  const peakMonth = 2 + Math.floor(rand() * 4);
  const width = 1.2 + rand() * 1.2;
  const yearFactor = {};
  for (let y = firstYear; y <= currentYear; y++) yearFactor[y] = 0.55 + rand() * 0.9;

  const calendar = {};
  for (let y = firstYear; y <= currentYear; y++) {
    calendar[y] = [];
    for (let m = 0; m < MONTHS; m++) {
      if (y === currentYear && m > currentMonth) {
        calendar[y].push(null);
        continue;
      }
      const season = Math.exp(-(((m - peakMonth) / width) ** 2));
      const value = 120 * season * yearFactor[y] * (0.75 + rand() * 0.5) - 3;
      calendar[y].push(Math.max(0, Math.round(value)));
    }
  }

  // Mes en curso contra la mediana de ese mismo mes en los años anteriores
  const history = [];
  for (let y = firstYear; y < currentYear; y++) history.push(calendar[y][currentMonth]);
  const base = median(history);
  const nowValue = calendar[currentYear][currentMonth];
  const ratio = base > 0 ? nowValue / base : null;

  let total = 0;
  let peak = { value: -1, year: firstYear, month: 0 };
  const monthTotals = new Array(MONTHS).fill(0);
  const yearTotals = {};
  for (let y = firstYear; y <= currentYear; y++) {
    yearTotals[y] = 0;
    calendar[y].forEach((v, m) => {
      if (v === null) return;
      total += v;
      monthTotals[m] += v;
      yearTotals[y] += v;
      if (v > peak.value) peak = { value: v, year: y, month: m };
    });
  }
  const peakYear = Number(Object.keys(yearTotals).reduce((a, b) => (yearTotals[a] >= yearTotals[b] ? a : b)));
  const riskMonth = monthTotals.indexOf(Math.max(...monthTotals));

  return {
    synthetic: true,
    firstYear,
    lastYear: currentYear,
    currentMonth,
    calendar,
    max: Math.max(120, peak.value),
    peak,
    total,
    peakYear,
    riskMonth,
    ratio,
    status: ratio === null ? 'normal' : ratio >= 1.25 ? 'elevated' : ratio <= 0.75 ? 'low' : 'normal'
  };
}
