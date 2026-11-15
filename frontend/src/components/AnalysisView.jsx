import React from 'react';
import { useLanguage } from '../context/LanguageContext';
import { useAnalysis } from '../utils/useAnalysis';

// Rampa térmica (Inferno) para los días con fuego. Cero = "sin fuego" (color propio, no el primer color de la rampa).
const INFERNO = ['#000004', '#1b0c41', '#4a0c6b', '#781c6d', '#a52c60', '#cf4446', '#ed6925', '#fb9b06', '#f7d13d', '#fcffa4'];
const FLOOR = 0.2; // las rampas oscuras empiezan más arriba para no confundirse con el fondo azul oscuro

function hexToRgb(hex) {
  const n = parseInt(hex.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

function ramp(t) {
  const x = Math.min(1, Math.max(0, t)) * (INFERNO.length - 1);
  const i = Math.min(INFERNO.length - 2, Math.floor(x));
  const a = hexToRgb(INFERNO[i]);
  const b = hexToRgb(INFERNO[i + 1]);
  const f = x - i;
  return `rgb(${a.map((v, k) => Math.round(v + (b[k] - v) * f)).join(',')})`;
}

// Raíz cuadrada para que los meses con pocos focos no desaparezcan frente al pico
const cellColor = (value, max) => (value <= 0 ? 'var(--no-fire)' : ramp(FLOOR + (1 - FLOOR) * Math.sqrt(Math.min(value / max, 1))));
const textOn = (value, max) => (FLOOR + (1 - FLOOR) * Math.sqrt(Math.min(value / max, 1)) > 0.62 ? '#000000' : '#ffffff');

// Panel de análisis de la zona o el área trazada. Por ahora con DATOS DE DEMOSTRACIÓN (ver utils/demoAnalysis.js):
// sirve para ir definiendo cómo se despliega el calendario de quemas y el resto de los datos.
export default function AnalysisView({ zone, drawnArea }) {
  const { lang, t } = useLanguage();

  const seed = drawnArea ? `area:${Math.round(drawnArea.center?.[0] ?? 0)}:${Math.round(drawnArea.center?.[1] ?? 0)}` : zone?.id;
  const { status, data } = useAnalysis(zone, drawnArea, seed);

  if (!data) {
    return (
      <div className="zone-drawer-body analysis-view" aria-label={t('analysis.title')}>
        <p className="analysis-statement">{t(`analysis.${status === 'loading' ? 'loading' : status === 'error' ? 'error' : 'noData'}`)}</p>
      </div>
    );
  }

  const months = t('analysis.monthsShort');
  const monthsLong = t('analysis.monthsLong');
  const years = [];
  for (let y = data.firstYear; y <= data.lastYear; y++) years.push(y);

  const fmt = (n) => n.toLocaleString(lang === 'en' ? 'en-US' : 'es-MX');
  const ratioText = data.ratio === null ? '—' : data.ratio.toFixed(1);
  const monthName = monthsLong[data.currentMonth];
  const statement =
    data.status === 'elevated'
      ? t('analysis.statementAbove', { month: monthName, ratio: ratioText })
      : data.status === 'low'
      ? t('analysis.statementBelow', { month: monthName, ratio: ratioText })
      : t('analysis.statementNormal', { month: monthName });

  return (
    <div className="zone-drawer-body analysis-view" aria-label={t('analysis.title')}>
      <div className="analysis-demo">
        {data.synthetic ? (
          <>
            <b>{t('analysis.demoTitle')}</b> {t('analysis.demoText')}
          </>
        ) : (
          <>
            <b>{t('analysis.realTitle')}</b> {t('analysis.realText')}
          </>
        )}
      </div>

      <div className="analysis-body">
        <div className="analysis-main">
          <p className="analysis-statement">{statement}</p>

          <figure className="analysis-figure">
            <div className="cal" role="img" aria-label={t('analysis.calendarLabel')}>
              <span />
              {months.map((m) => (
                <span key={m} className="cal-axis">{m}</span>
              ))}
              {years.map((y) => (
                <React.Fragment key={y}>
                  <span className="cal-axis">{y}</span>
                  {data.calendar[y].map((v, m) => {
                    if (v === null) return <span key={m} className="cal-cell" />;
                    const now = y === data.lastYear && m === data.currentMonth;
                    const isPeak = y === data.peak.year && m === data.peak.month;
                    return (
                      <span
                        key={m}
                        className={`cal-cell filled${now ? ' now' : ''}`}
                        style={{ background: cellColor(v, data.max), color: textOn(v, data.max) }}
                        title={`${months[m]} ${y}: ${t('analysis.cellTitle', { days: v })}`}
                      >
                        {isPeak ? v : ''}
                      </span>
                    );
                  })}
                </React.Fragment>
              ))}
            </div>

            <div className="cal-scale">
              <span className="cal-axis">0</span>
              <div
                className="cal-ramp"
                style={{ background: `linear-gradient(90deg, ${Array.from({ length: 12 }, (_, i) => ramp(FLOOR + ((1 - FLOOR) * i) / 11)).join(',')})` }}
              />
              <span className="cal-axis">
                {data.max}+ ({t('analysis.maxLabel')}: {data.peak.value}, {months[data.peak.month]} {data.peak.year})
              </span>
            </div>

            <figcaption className="analysis-caption">
              <b>{t('analysis.fig1')}</b>
              {t('analysis.fig1Text')}
            </figcaption>
          </figure>
        </div>

        <dl className="analysis-facts">
          <div>
            <dt>{t('analysis.factTotal', { from: data.firstYear, to: data.lastYear })}</dt>
            <dd>
              {fmt(data.total)}
              <small>{t('analysis.factTotalUnit')}</small>
            </dd>
          </div>
          <div>
            <dt>{t('analysis.factPeakYear')}</dt>
            <dd>{data.peakYear}</dd>
          </div>
          <div>
            <dt>{t('analysis.factRiskMonth')}</dt>
            <dd>{monthsLong[data.riskMonth]}</dd>
          </div>
          <div>
            <dt>{t('analysis.factStatus')}</dt>
            <dd>
              <span className={`analysis-status analysis-status-${data.status}`}>{t(`analysis.status.${data.status}`)}</span>
            </dd>
          </div>
        </dl>
      </div>
    </div>
  );
}
