import React, { useMemo, useState } from 'react';
import { useLanguage } from '../context/LanguageContext';

const W = 340;
const H = 150;
const PAD = { l: 40, r: 8, t: 10, b: 22 };
const MEASURED_FROM = '2018-04'; // desde aquí hay NOAA-20 medido; antes, el valor es una estimación del modelo

const compact = (n) => (n >= 1000 ? `${(n / 1000).toFixed(n >= 10000 ? 0 : 1)}k` : String(Math.round(n)));

// Estimación del modelo: serie mensual armonizada (equivalente NOAA-20) con su intervalo al 95 %. La banda solo se ensancha donde
// no hubo NOAA-20 y el valor es una estimación; desde abril de 2018 es medido y la banda se cierra sobre la línea.
export default function EstimateChart({ points }) {
  const { lang, t } = useLanguage();
  const [hover, setHover] = useState(null);

  const chart = useMemo(() => {
    // El mes en curso está incompleto: no se dibuja para no mostrar una caída falsa
    const pts = points.filter((p) => !p.partial);
    if (pts.length < 2) return null;
    const n = pts.length;
    const x = (i) => PAD.l + (i / (n - 1)) * (W - PAD.l - PAD.r);
    const maxV = Math.max(...pts.map((p) => p.hi ?? p.count), 1);
    const y = (v) => PAD.t + (1 - v / maxV) * (H - PAD.t - PAD.b);
    const f = (v) => v.toFixed(1);
    const line = pts.map((p, i) => `${i ? 'L' : 'M'}${f(x(i))},${f(y(p.count))}`).join('');
    const upper = pts.map((p, i) => `${i ? 'L' : 'M'}${f(x(i))},${f(y(p.hi ?? p.count))}`).join('');
    const lower = pts
      .map((p, i) => `L${f(x(n - 1 - i))},${f(y(pts[n - 1 - i].lo ?? pts[n - 1 - i].count))}`)
      .join('');
    const firstMeasured = pts.findIndex((p) => p.month >= MEASURED_FROM);
    const ticks = pts
      .map((p, i) => ({ i, year: Number(p.month.slice(0, 4)), first: p.month.endsWith('-01') }))
      .filter((p) => p.first && p.year % 5 === 0);
    return { pts, n, x, y, maxV, line, band: `${upper}${lower}Z`, firstMeasured: firstMeasured < 0 ? n : firstMeasured, ticks };
  }, [points]);

  if (!chart) return null;
  const { pts, n, x, y, maxV } = chart;
  const months = t('analysis.monthsShort');
  const fmt = (v) => Math.round(v).toLocaleString(lang === 'en' ? 'en-US' : 'es-MX');
  const label = (p) => `${months[Number(p.month.slice(5)) - 1]} ${p.month.slice(0, 4)}`;

  const onMove = (event) => {
    const rect = event.currentTarget.getBoundingClientRect();
    const px = ((event.clientX - rect.left) / rect.width) * W;
    const i = Math.round(((px - PAD.l) / (W - PAD.l - PAD.r)) * (n - 1));
    setHover(Math.max(0, Math.min(n - 1, i)));
  };

  const hp = hover === null ? null : pts[hover];
  const estimated = (p) => p.source !== 'NOAA-20';
  const tip = hp
    ? [
        `${label(hp)}: ${fmt(hp.count)}`,
        hp.hi > hp.lo ? `${t('estimate.interval')} ${fmt(hp.lo)}–${fmt(hp.hi)}` : null,
        estimated(hp) ? t('estimate.estimated') : null,
        hp.nrt ? t('estimate.preliminary') : null
      ]
        .filter(Boolean)
        .join(' · ')
    : null;

  const peak = pts.reduce((a, p) => (p.count > a.count ? p : a), pts[0]);
  const summary = t('estimate.summary', { from: label(pts[0]), to: label(pts[n - 1]), peak: `${label(peak)} (${fmt(peak.count)})` });

  return (
    <figure className="analysis-figure estimate-figure">
      <svg
        className="estimate-chart"
        viewBox={`0 0 ${W} ${H}`}
        role="img"
        aria-label={summary}
        onPointerMove={onMove}
        onPointerLeave={() => setHover(null)}
      >
        {/* tramo estimado (antes de NOAA-20) */}
        <rect x={PAD.l} y={PAD.t} width={x(chart.firstMeasured) - PAD.l} height={H - PAD.t - PAD.b} className="estimate-zone" />
        <line x1={PAD.l} x2={W - PAD.r} y1={y(0)} y2={y(0)} className="estimate-axis" />
        <text x={PAD.l - 6} y={y(maxV) + 4} textAnchor="end" className="estimate-label">
          {compact(maxV)}
        </text>
        <text x={PAD.l - 6} y={y(0) + 3} textAnchor="end" className="estimate-label">
          0
        </text>
        {chart.ticks.map((tk) => (
          <text key={tk.year} x={x(tk.i)} y={H - 6} textAnchor="middle" className="estimate-label">
            {tk.year}
          </text>
        ))}
        {/* rótulos directos en lugar de una leyenda aparte */}
        {chart.firstMeasured > 0 && (
          <text x={PAD.l + 4} y={PAD.t + 10} className="estimate-label estimate-zone-label">
            {t('estimate.estimated')}
          </text>
        )}
        {chart.firstMeasured < n - 1 && (
          <text x={x(chart.firstMeasured) + 4} y={PAD.t + 10} className="estimate-label estimate-zone-label">
            {t('estimate.measured')}
          </text>
        )}
        <path d={chart.band} className="estimate-band" />
        <path d={chart.line} className="estimate-line" />
        {hp && (
          <g>
            <line x1={x(hover)} x2={x(hover)} y1={PAD.t} y2={y(0)} className="estimate-cursor" />
            <circle cx={x(hover)} cy={y(hp.count)} r={3} className="estimate-dot" />
          </g>
        )}
      </svg>

      <p className="estimate-tip" aria-live="polite">
        {tip}
      </p>
      <figcaption className="analysis-caption">
        <b>{t('estimate.fig')}</b>
        {t('estimate.caption')}
      </figcaption>
    </figure>
  );
}
