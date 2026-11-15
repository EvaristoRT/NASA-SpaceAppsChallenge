import React, { useMemo, useState } from 'react';
import { useLanguage } from '../context/LanguageContext';
import { useAnalysis } from '../utils/useAnalysis';
import { applyRange, shiftMonth } from '../utils/searchAdapter';
import { useHotspotCount } from '../utils/useHotspotCount';
import { useMeta } from '../utils/useMeta';
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
  const { status, data: fullData } = useAnalysis(zone, drawnArea, seed);
  const meta = useMeta();

  // Periodo (desde, hasta): por defecto toda la serie; cambia con la zona porque guarda a qué resultado pertenece
  const bounds =
    fullData && !fullData.synthetic && fullData.points?.length
      ? { from: fullData.points[0].month, to: fullData.points[fullData.points.length - 1].month }
      : null;
  const [picked, setPicked] = useState({ source: null, from: null, to: null });
  const range = bounds ? (picked.source === fullData ? { from: picked.from, to: picked.to } : bounds) : null;
  const rangeFrom = range ? range.from : null;
  const rangeTo = range ? range.to : null;
  const ranged = Boolean(range && (rangeFrom !== bounds.from || rangeTo !== bounds.to));
  const data = useMemo(() => (rangeFrom ? applyRange(fullData, rangeFrom, rangeTo) : fullData), [fullData, rangeFrom, rangeTo]);

  // Mes elegido: solo cuenta si cae dentro del periodo
  const monthKey = selectedMonth ? `${selectedMonth.year}-${String(selectedMonth.month + 1).padStart(2, '0')}` : null;
  const activeMonth = range && monthKey && monthKey >= rangeFrom && monthKey <= rangeTo ? selectedMonth : null;
  // Focos detectados: el mes elegido o, si no hay, los últimos 12 meses del periodo (el límite del servidor)
  const hotspotsOn = Boolean(range && meta && meta.hotspots_available !== false);
  const countFrom = !range ? null : activeMonth ? monthKey : shiftMonth(rangeTo, -11) > rangeFrom ? shiftMonth(rangeTo, -11) : rangeFrom;
  const countTo = !range ? null : activeMonth ? monthKey : rangeTo;
  const hotspotCount = useHotspotCount(zone, drawnArea, countFrom, countTo, hotspotsOn);

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
  // Con un periodo que termina antes del último mes hay que decir de qué año se habla
  const monthName = monthsLong[data.currentMonth] + (ranged && rangeTo < bounds.to ? ` ${data.currentYear}` : '');
  const monthShort = (key) => `${months[Number(key.slice(5)) - 1]} ${key.slice(0, 4)}`;
  const hotspotPeriod = countFrom === countTo ? monthShort(countFrom || '2000-01') : `${monthShort(countFrom || '2000-01')} – ${monthShort(countTo || '2000-01')}`;
  const setRange = (from, to) => setPicked({ source: fullData, from, to });
  const changeFrom = (value) => {
    if (!value) return;
    setRange(value, value > rangeTo ? value : rangeTo);
  };
  const changeTo = (value) => {
    if (!value) return;
    setRange(value < rangeFrom ? value : rangeFrom, value);
  };
  const statement =
    data.status === 'elevated'
      ? t('analysis.statementAbove', { month: monthName, ratio: ratioText })
      : data.status === 'low'
      ? t('analysis.statementBelow', { month: monthName, ratio: ratioText })
      : t('analysis.statementNormal', { month: monthName });

  return (
    <div className="zone-drawer-body analysis-view" aria-label={t('analysis.title')}>
      <p className="analysis-statement">{statement}</p>

      {range && (
        <div className="analysis-range" role="group" aria-label={t('analysis.rangeLabel')}>
          <label>
            {t('analysis.rangeFrom')}
            <input type="month" value={rangeFrom} min={bounds.from} max={bounds.to} onChange={(e) => changeFrom(e.target.value)} />
          </label>
          <label>
            {t('analysis.rangeTo')}
            <input type="month" value={rangeTo} min={bounds.from} max={bounds.to} onChange={(e) => changeTo(e.target.value)} />
          </label>
          {ranged && (
            <button type="button" className="analysis-range-reset" onClick={() => setRange(bounds.from, bounds.to)}>
              {t('analysis.rangeReset')}
            </button>
          )}
        </div>
      )}

      <dl className="analysis-facts">
        <div>
          <dt>{t('analysis.factTotal', { from: data.firstYear, to: data.lastYear })}</dt>
          <dd>{fmt(data.total)}</dd>
        </div>
        {hotspotsOn && hotspotCount.status !== 'off' && (
          <div>
            <dt>{t('analysis.factHotspots', { period: hotspotPeriod })}</dt>
            <dd aria-live="polite">{hotspotCount.status === 'ready' ? fmt(hotspotCount.count) : '…'}</dd>
          </div>
        )}
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

      <p className="analysis-note">
        {data.synthetic ? (
          <>
            <b>{t('analysis.demoTitle')}</b> {t('analysis.demoText')}
          </>
        ) : (
          t('analysis.realText')
        )}
      </p>

      {data.nextMonths?.length > 0 && (
        <section className="analysis-next" aria-label={t('analysis.nextTitle')}>
          <h3 className="analysis-section-title">{t('analysis.nextTitle')}</h3>
          <ul>
            {data.nextMonths.map((n) => (
              <li key={`${n.year}-${n.month}`}>
                <span>{monthsLong[n.month]}{n.month === 0 ? ` ${n.year}` : ''}</span>
                <b className={`analysis-level analysis-level-${n.level}`}>{t(`analysis.level.${n.level}`)}</b>
                <small>{t('analysis.cellExpected', { median: fmt(Math.round(n.median)), low: fmt(Math.round(n.p25)), high: fmt(Math.round(n.p75)) })}</small>
              </li>
            ))}
          </ul>
          <p className="analysis-pick">{t('analysis.nextNote')}</p>
        </section>
      )}

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
                if (v === null) {
                  // Mes futuro del último año: se pinta tenue con el valor esperado (mediana histórica), no medido
                  const ex = data.expected?.[y]?.[m];
                  if (ex) {
                    const text = `${months[m]} ${y}: ${t('analysis.cellExpected', { median: fmt(Math.round(ex.median)), low: fmt(Math.round(ex.p25)), high: fmt(Math.round(ex.p75)) })}`;
                    return <span key={m} className="cal-cell expected" role="img" aria-label={text} title={text} style={{ background: cellColor(ex.median, data.max) }} />;
                  }
                  return <span key={m} className="cal-cell" title={interactive ? t('analysis.noMonthData') : undefined} />;
                }
                const isPeak = y === data.peak.year && m === data.peak.month;
                const title = `${months[m]} ${y}: ${t('analysis.cellTitle', { days: v })}`;
                const style = { background: cellColor(v, data.max), color: textOn(v, data.max) };
                if (!interactive) {
                  return (
                    <span key={m} className="cal-cell filled" style={style} title={title}>
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
                    className={`cal-cell filled${locked ? ' locked' : ' pick'}${picked ? ' picked' : ''}`}
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
          <div className="cal-ramp" style={{ background: rampGradient() }} />
          <span className="cal-axis">{fmt(data.max)}</span>
        </div>

        {data.nextMonths?.length > 0 && <p className="analysis-pick">{t('analysis.expectedNote')}</p>}
        {interactive && !selectedMonth && <p className="analysis-pick">{t('analysis.pickHint')}</p>}
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
            selectedMonth={activeMonth}
            data={data}
            range={range}
            ranged={ranged}
          />
        </>
      )}
    </div>
  );
}
