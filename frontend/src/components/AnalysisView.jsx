import React from 'react';
import { useLanguage } from '../context/LanguageContext';
import { useAnalysis } from '../utils/useAnalysis';
import { localizeZone } from '../i18n/zoneText';
import EstimateChart from './EstimateChart';
import DownloadPanel from './DownloadPanel';

import { FLOOR, ramp, rampGradient } from '../utils/fireRamp';

// Raíz cuadrada para que los meses con pocos focos no desaparezcan frente al pico
const cellColor = (value, max) => (value <= 0 ? 'var(--no-fire)' : ramp(FLOOR + (1 - FLOOR) * Math.sqrt(Math.min(value / max, 1))));
const textOn = (value, max) => (FLOOR + (1 - FLOOR) * Math.sqrt(Math.min(value / max, 1)) > 0.62 ? '#000000' : '#ffffff');

// Panel de análisis de la zona o el área trazada. Por ahora con DATOS DE DEMOSTRACIÓN (ver utils/demoAnalysis.js):
// sirve para ir definiendo cómo se despliega el calendario de quemas y el resto de los datos.
export default function AnalysisView({ zone, drawnArea, selectedMonth, onSelectMonth }) {
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

  // Con datos reales los meses con dato armonizado y completos se pueden elegir (con la demostración no hay mapa que pintar)
  const interactive = !data.synthetic && typeof onSelectMonth === 'function';
  // Un solo punto de tabulación en el calendario: el mes elegido o, si no hay, el último mes elegible
  let tabY = null;
  let tabM = null;
  if (interactive) {
    if (selectedMonth) {
      tabY = selectedMonth.year;
      tabM = selectedMonth.month;
    } else {
      for (const y of years) {
        data.calendar[y].forEach((v, m) => {
          if (v !== null && !data.partial?.[y]?.[m]) {
            tabY = y;
            tabM = m;
          }
        });
      }
    }
  }
  // Flechas para moverse entre los meses elegibles
  const moveFocus = (e) => {
    const step = { ArrowLeft: [0, -1], ArrowRight: [0, 1], ArrowUp: [-1, 0], ArrowDown: [1, 0] }[e.key];
    const from = e.target.closest?.('[data-y]');
    if (!step || !from) return;
    e.preventDefault();
    let y = Number(from.dataset.y);
    let m = Number(from.dataset.m);
    for (let i = 0; i < 400; i++) {
      m += step[1];
      y += step[0];
      if (m < 0) { m = 11; y -= 1; }
      if (m > 11) { m = 0; y += 1; }
      if (y < data.firstYear || y > data.lastYear) return;
      const next = e.currentTarget.querySelector(`button[data-y="${y}"][data-m="${m}"]:not(:disabled)`);
      if (next) {
        next.focus();
        return;
      }
    }
  };

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
            <div className="cal" role={interactive ? 'group' : 'img'} aria-label={t('analysis.calendarLabel')} onKeyDown={interactive ? moveFocus : undefined}>
              <span />
              {months.map((m) => (
                <span key={m} className="cal-axis">{m}</span>
              ))}
              {years.map((y) => (
                <React.Fragment key={y}>
                  <span className="cal-axis">{y}</span>
                  {data.calendar[y].map((v, m) => {
                    // Sin dato armonizado (antes de nov. 2000, meses futuros): apagado y sin clic
                    if (v === null) return <span key={m} className="cal-cell" title={interactive ? t('analysis.noMonthData') : undefined} />;
                    const now = y === data.lastYear && m === data.currentMonth;
                    const isPeak = y === data.peak.year && m === data.peak.month;
                    const title = `${months[m]} ${y}: ${t('analysis.cellTitle', { days: v })}`;
                    const style = { background: cellColor(v, data.max), color: textOn(v, data.max) };
                    if (!interactive) {
                      return (
                        <span key={m} className={`cal-cell filled${now ? ' now' : ''}`} style={style} title={title}>
                          {isPeak ? v : ''}
                        </span>
                      );
                    }
                    // Mes en curso incompleto: se ve, pero no se puede elegir
                    const locked = Boolean(data.partial?.[y]?.[m]);
                    const picked = selectedMonth && selectedMonth.year === y && selectedMonth.month === m;
                    return (
                      <button
                        key={m}
                        type="button"
                        data-y={y}
                        data-m={m}
                        className={`cal-cell filled${now ? ' now' : ''}${locked ? ' locked' : ' pick'}${picked ? ' picked' : ''}`}
                        style={style}
                        title={locked ? `${months[m]} ${y}: ${t('analysis.monthIncomplete')}` : title}
                        disabled={locked}
                        aria-pressed={locked ? undefined : Boolean(picked)}
                        tabIndex={y === tabY && m === tabM ? 0 : -1}
                        onClick={() => onSelectMonth(y, m)}
                      >
                        {isPeak ? v : ''}
                      </button>
                    );
                  })}
                </React.Fragment>
              ))}
            </div>

            <div className="cal-scale">
              <span className="cal-axis">0</span>
              <div
                className="cal-ramp"
                style={{ background: rampGradient() }}
              />
              <span className="cal-axis">
                {data.max}+ ({t('analysis.maxLabel')}: {data.peak.value}, {months[data.peak.month]} {data.peak.year})
              </span>
            </div>

            {interactive && (
              <p className="analysis-pick">
                {selectedMonth
                  ? t('analysis.pickShown', { month: monthsLong[selectedMonth.month], year: selectedMonth.year })
                  : t('analysis.pickHint')}
              </p>
            )}

            {!interactive && data.synthetic && <p className="analysis-pick">{t('analysis.pickNeedsApi')}</p>}

            <figcaption className="analysis-caption">
              <b>{t('analysis.fig1')}</b>
              {t('analysis.fig1Text')}
            </figcaption>
          </figure>

          {!data.synthetic && (
            <>
              <EstimateChart points={data.points} />
              <DownloadPanel
                zone={zone}
                drawnArea={drawnArea}
                zoneName={drawnArea ? t('analysis.customArea') : localizeZone(zone, lang).name}
                selectedMonth={selectedMonth}
              />
            </>
          )}
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
