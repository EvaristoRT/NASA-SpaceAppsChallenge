import React, { useMemo, useState } from 'react';
import { useLanguage } from '../context/LanguageContext';

const W = 340;
const H = 150;
const GAP = 14;
const TOP = 42;
const BASE = 120;

const quantile = (sorted, q) => sorted[Math.min(sorted.length - 1, Math.floor(q * sorted.length))];

// Por qué se espera lo que se espera, en lo más simple: para cada uno de los próximos meses, una barra por año (ese mismo mes en
// 2003–2020) y una línea punteada en la mediana, que es el valor esperado. Todas con la misma escala.
export default function ExpectedBasisChart({ data }) {
  const { lang, t } = useLanguage();
  const [hover, setHover] = useState(null);
  const fmt = (n) => Math.round(n).toLocaleString(lang === 'en' ? 'en-US' : 'es-MX');
  const monthsLong = t('analysis.monthsLong');

  const chart = useMemo(() => {
    const next = data.nextMonths || [];
    const base = data.baseline;
    if (!next.length || !base) return null;
    const panels = next.map((n) => {
      const bars = [];
      for (let y = base.start_year; y <= base.end_year; y++) {
        const v = data.calendar[y]?.[n.month];
        if (v != null) bars.push({ year: y, value: v });
      }
      return { n, bars };
    });
    const all = panels.flatMap((p) => p.bars.map((b) => b.value)).sort((a, b) => a - b);
    // Escala común, recortada: un año extremo (por ejemplo 2017 en Chile) aplastaría a todos los demás
    const cap = Math.max(1, quantile(all, 0.92), ...next.map((n) => n.median * 1.5));
    return { panels, cap, base };
  }, [data]);

  if (!chart) return null;
  const { panels, cap, base } = chart;
  const pw = (W - GAP * (panels.length - 1)) / panels.length;
  const y = (v) => BASE - (Math.min(v, cap) / cap) * (BASE - TOP);
  const clipped = panels.some((p) => p.bars.some((b) => b.value > cap));

  const summary = panels
    .map((p) => t('prediction.chartSummary', { month: monthsLong[p.n.month], median: fmt(p.n.median), years: p.bars.length }))
    .join(' ');

  return (
    <figure className="analysis-figure estimate-figure">
      <svg className="estimate-chart" viewBox={`0 0 ${W} ${H}`} role="img" aria-label={summary} onPointerLeave={() => setHover(null)}>
        {panels.map((p, i) => {
          const x0 = i * (pw + GAP);
          const step = pw / p.bars.length;
          return (
            <g key={p.n.month}>
              <text x={x0} y={12} className="basis-month">
                {monthsLong[p.n.month]}
              </text>
              <text x={x0} y={28} className="basis-value">
                {t('prediction.expectedShort', { n: fmt(p.n.median) })}
              </text>
              <line x1={x0} x2={x0 + pw} y1={BASE} y2={BASE} className="estimate-axis" />
              {p.bars.map((b, k) => (
                <rect
                  key={b.year}
                  x={x0 + k * step + step * 0.15}
                  y={y(b.value)}
                  width={step * 0.7}
                  height={Math.max(1, BASE - y(b.value))}
                  className={`basis-bar${b.value > cap ? ' clipped' : ''}${hover && hover.year === b.year && hover.month === p.n.month ? ' hover' : ''}`}
                  onPointerEnter={() => setHover({ year: b.year, month: p.n.month, value: b.value })}
                />
              ))}
              <line x1={x0} x2={x0 + pw} y1={y(p.n.median)} y2={y(p.n.median)} className="basis-median" />
              <text x={x0} y={BASE + 14} className="estimate-label">
                {base.start_year}
              </text>
              <text x={x0 + pw} y={BASE + 14} textAnchor="end" className="estimate-label">
                {base.end_year}
              </text>
            </g>
          );
        })}
      </svg>

      <p className="estimate-tip" aria-live="polite">
        {hover ? t('prediction.pointTip', { year: hover.year, n: fmt(hover.value) }) : ''}
      </p>
      <figcaption className="analysis-caption">
        {t('prediction.valueCaption')}
        {clipped ? ` ${t('prediction.clippedNote')}` : ''}
      </figcaption>
    </figure>
  );
}
