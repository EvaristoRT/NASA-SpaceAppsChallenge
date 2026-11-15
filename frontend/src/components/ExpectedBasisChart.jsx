import React, { useMemo, useState } from 'react';
import { useLanguage } from '../context/LanguageContext';

const W = 340;
const H = 180;
const PAD = { l: 38, r: 8, t: 14, b: 24 };

const compact = (n) => (n >= 1000 ? `${(n / 1000).toFixed(n >= 10000 ? 0 : 1)}k` : String(Math.round(n)));
const quantile = (sorted, q) => sorted[Math.min(sorted.length - 1, Math.floor(q * sorted.length))];

// Por qué se espera lo que se espera: para cada uno de los próximos meses, el mismo mes en cada año (un punto por año), el rango normal
// (caja de p25 a p75) y la mediana, que es el valor esperado. Los años recientes van en otro color para ver si se alejan de lo normal.
export default function ExpectedBasisChart({ data }) {
  const { lang, t } = useLanguage();
  const [hover, setHover] = useState(null);
  const fmt = (n) => Math.round(n).toLocaleString(lang === 'en' ? 'en-US' : 'es-MX');
  const monthsLong = t('analysis.monthsLong');

  const chart = useMemo(() => {
    const next = data.nextMonths || [];
    const base = data.baseline;
    if (!next.length || !base) return null;
    const colW = (W - PAD.l - PAD.r) / next.length;
    const cols = next.map((n, i) => {
      const dots = [];
      for (let y = base.start_year; y <= data.lastYear; y++) {
        const v = data.calendar[y]?.[n.month];
        if (v == null || data.partial?.[y]?.[n.month]) continue;
        dots.push({ year: y, value: v, recent: y > base.end_year });
      }
      return { n, dots, cx: PAD.l + (i + 0.5) * colW };
    });
    const all = cols.flatMap((c) => c.dots.map((d) => d.value)).sort((a, b) => a - b);
    // Escala común, recortada: un año extremo (por ejemplo 2017 en Chile) aplastaría a todos los demás
    const cap = Math.max(1, quantile(all, 0.92), ...cols.map((c) => c.n.p75 * 1.25));
    const y = (v) => PAD.t + (1 - Math.min(v, cap) / cap) * (H - PAD.t - PAD.b);
    const points = [];
    cols.forEach((c, i) => {
      c.dots.forEach((d, k) => {
        const dx = (((k * 7 + i * 3) % 11) - 5) * 2.4;
        d.x = c.cx + dx;
        d.y = y(d.value);
        d.clipped = d.value > cap;
        points.push(d);
      });
    });
    return { cols, cap, y, points, base };
  }, [data]);

  if (!chart) return null;
  const { cols, cap, y, points, base } = chart;

  const onMove = (event) => {
    const rect = event.currentTarget.getBoundingClientRect();
    const px = ((event.clientX - rect.left) / rect.width) * W;
    const py = ((event.clientY - rect.top) / rect.height) * H;
    let best = null;
    let bestD = 14 * 14;
    for (const p of points) {
      const d = (p.x - px) ** 2 + (p.y - py) ** 2;
      if (d < bestD) {
        best = p;
        bestD = d;
      }
    }
    setHover(best);
  };

  const summary = cols
    .map((c) => t('prediction.chartSummary', { month: monthsLong[c.n.month], median: fmt(c.n.median), years: c.dots.filter((d) => !d.recent).length }))
    .join(' ');
  const tip = hover ? t('prediction.pointTip', { year: hover.year, n: fmt(hover.value) }) : '';

  return (
    <figure className="analysis-figure estimate-figure">
      <svg className="estimate-chart" viewBox={`0 0 ${W} ${H}`} role="img" aria-label={summary} onPointerMove={onMove} onPointerLeave={() => setHover(null)}>
        <line x1={PAD.l} x2={W - PAD.r} y1={y(0)} y2={y(0)} className="estimate-axis" />
        <text x={PAD.l - 6} y={y(cap) + 4} textAnchor="end" className="estimate-label">
          {compact(cap)}+
        </text>
        <text x={PAD.l - 6} y={y(0) + 3} textAnchor="end" className="estimate-label">
          0
        </text>
        {cols.map((c) => (
          <g key={c.n.month}>
            <rect x={c.cx - 28} y={y(c.n.p75)} width={56} height={Math.max(1, y(c.n.p25) - y(c.n.p75))} className="basis-box" />
            {c.dots.map((d) => (
              <circle key={d.year} cx={d.x} cy={d.y} r={d.recent ? 3.4 : 2.6} className={d.recent ? 'basis-dot recent' : 'basis-dot'} />
            ))}
            <line x1={c.cx - 32} x2={c.cx + 32} y1={y(c.n.median)} y2={y(c.n.median)} className="basis-median" />
            <text x={c.cx} y={H - 6} textAnchor="middle" className="estimate-label basis-month">
              {monthsLong[c.n.month]}
            </text>
          </g>
        ))}
        {hover && <circle cx={hover.x} cy={hover.y} r={5.5} className="basis-hover" />}
      </svg>

      <p className="estimate-tip" aria-live="polite">
        {tip}
      </p>
      <ul className="basis-legend" aria-label={t('prediction.legendLabel')}>
        <li>
          <span className="basis-key base" />
          {t('prediction.legendBase', { from: base.start_year, to: base.end_year })}
        </li>
        {data.lastYear > base.end_year && (
          <li>
            <span className="basis-key recent" />
            {t('prediction.legendRecent', { from: base.end_year + 1 })}
          </li>
        )}
        <li>
          <span className="basis-key box" />
          {t('prediction.legendBox')}
        </li>
        <li>
          <span className="basis-key median" />
          {t('prediction.legendMedian')}
        </li>
      </ul>
      <figcaption className="analysis-caption">
        <b>{t('prediction.fig')}</b>
        {t('prediction.chartCaption')}
      </figcaption>
    </figure>
  );
}
