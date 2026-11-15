import React, { useMemo, useState } from 'react';
import { useLanguage } from '../context/LanguageContext';
import { useAnalysis } from '../utils/useAnalysis';
import { applyRange, shiftMonth } from '../utils/searchAdapter';
import { useHotspotCount } from '../utils/useHotspotCount';
import { useMeta } from '../utils/useMeta';
import { localizeZone } from '../i18n/zoneText';
import EstimateChart from './EstimateChart';
import DownloadPanel from './DownloadPanel';

import { getFloor, ramp, rampGradient, textColorAt, isAccessible, setRampId, useRampId } from '../utils/fireRamp';

// Raíz cuadrada para que los meses con pocos focos no desaparezcan frente al pico
const cellColor = (value, max) => (value <= 0 ? 'var(--no-fire)' : ramp(getFloor() + (1 - getFloor()) * Math.sqrt(Math.min(value / max, 1))));
const textOn = (value, max) => textColorAt(getFloor() + (1 - getFloor()) * Math.sqrt(Math.min(value / max, 1)));

// Panel de análisis de la zona o el área trazada. Por ahora con DATOS DE DEMOSTRACIÓN (ver utils/demoAnalysis.js):
// sirve para ir definiendo cómo se despliega el calendario de quemas y el resto de los datos.
export default function AnalysisView({ zone, drawnArea, selectedMonth, onSelectMonth }) {
  const { lang, t } = useLanguage();

  const seed = drawnArea ? `area:${Math.round(drawnArea.center?.[0] ?? 0)}:${Math.round(drawnArea.center?.[1] ?? 0)}` : zone?.id;
  const { status, data: fullData } = useAnalysis(zone, drawnArea, seed);
  const meta = useMeta();
  useRampId(); // vuelve a pintar el calendario al cambiar a los colores accesibles
  const [yearPick, setYearPick] = useState({ source: null, year: null });
  const [yearDraft, setYearDraft] = useState(null); // lo que se está escribiendo en el año, antes de ser válido

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
  // Calendario de un año: se ven los 12 meses del año elegido y se cambia de año con las flechas o escribiéndolo
  const shownYear =
    yearPick.source === fullData && yearPick.year >= data.firstYear && yearPick.year <= data.lastYear ? yearPick.year : data.lastYear;
  const yearRow = data.calendar[shownYear];
  const goToYear = (y) => {
    if (y >= data.firstYear && y <= data.lastYear) setYearPick({ source: fullData, year: y });
  };
  const onYearTyped = (e) => {
    const text = e.target.value.replace(/\D/g, '').slice(0, 4);
    setYearDraft(text);
    const y = Number(text);
    if (text.length === 4 && y >= data.firstYear && y <= data.lastYear) goToYear(y);
  };
  const onYearKey = (e) => {
    const delta = { ArrowUp: 1, ArrowDown: -1 }[e.key];
    if (!delta) return;
    e.preventDefault();
    setYearDraft(null);
    goToYear(shownYear + delta);
  };

  // Con datos reales los meses con dato armonizado y completos se pueden elegir (con la demostración no hay mapa que pintar)
  const interactive = !data.synthetic && typeof onSelectMonth === 'function';
  const selectableMonth = (m) => yearRow[m] !== null && !data.partial?.[shownYear]?.[m];
  // Un solo punto de tabulación en el calendario: el mes elegido o, si no hay, el último mes elegible del año
  let tabM = null;
  if (interactive) {
    if (selectedMonth && selectedMonth.year === shownYear && selectableMonth(selectedMonth.month)) {
      tabM = selectedMonth.month;
    } else {
      for (let m = 0; m < 12; m++) if (selectableMonth(m)) tabM = m;
    }
  }
  // Flechas para moverse entre los meses elegibles: izquierda y derecha de uno en uno, arriba y abajo de cuatro en cuatro
  const moveFocus = (e) => {
    const step = { ArrowLeft: -1, ArrowRight: 1, ArrowUp: -4, ArrowDown: 4 }[e.key];
    const from = e.target.closest?.('[data-m]');
    if (!step || !from) return;
    e.preventDefault();
    for (let m = Number(from.dataset.m) + step; m >= 0 && m < 12; m += step) {
      const next = e.currentTarget.querySelector(`button[data-m="${m}"]:not(:disabled)`);
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
      <section className="panel-section">
        <div className="panel-section-head">
          <h3 className="panel-section-title">{t('analysis.sectionSummary')}</h3>
          {range && (
            <div className="analysis-range" role="group" aria-label={t('analysis.rangeLabel')}>
              <input type="month" aria-label={t('analysis.rangeFrom')} value={rangeFrom} min={bounds.from} max={bounds.to} onChange={(e) => changeFrom(e.target.value)} />
              <span aria-hidden="true">–</span>
              <input type="month" aria-label={t('analysis.rangeTo')} value={rangeTo} min={bounds.from} max={bounds.to} onChange={(e) => changeTo(e.target.value)} />
              {ranged && (
                <button type="button" className="analysis-range-reset" onClick={() => setRange(bounds.from, bounds.to)}>
                  {t('analysis.rangeReset')}
                </button>
              )}
            </div>
          )}
        </div>

        <p className="analysis-statement">{statement}</p>

        <dl className="analysis-facts">
          <div>
            <dt>{t('analysis.factTotal', { from: data.firstYear, to: data.lastYear })}</dt>
            <dd>
              {fmt(data.total)} <small>{t('analysis.unitCellDays')}</small>
            </dd>
          </div>
          <div>
            <dt>{t('analysis.factPeakYear')}</dt>
            <dd>{data.peakYear}</dd>
          </div>
          <div>
            <dt>{t('analysis.factStatus')}</dt>
            <dd>
              <span className={`analysis-status analysis-status-${data.status}`}>{t(`analysis.status.${data.status}`)}</span>
              {data.ratio !== null && <small> {ratioText}×</small>}
            </dd>
          </div>
        </dl>

        {hotspotsOn && hotspotCount.status !== 'off' && (
          <p className="analysis-note" aria-live="polite">
            {t('analysis.hotspotsLine', { period: hotspotPeriod, n: hotspotCount.status === 'ready' ? fmt(hotspotCount.count) : '…' })}
          </p>
        )}

        {data.synthetic ? (
          <p className="analysis-note">
            <b>{t('analysis.demoTitle')}</b> {t('analysis.demoText')}
          </p>
        ) : (
          <details className="analysis-explain">
            <summary>{t('analysis.explainTitle')}</summary>
            <p>{t('analysis.explainText')}</p>
          </details>
        )}
      </section>

      <section className="panel-section">
        <div className="panel-section-head">
          <h3 className="panel-section-title">{t('analysis.sectionCalendar')}</h3>
          <label className="access-toggle" title={t('analysis.accessibleHint')}>
            <input type="checkbox" role="switch" checked={isAccessible()} onChange={(e) => setRampId(e.target.checked ? 'cividis' : 'inferno')} />
            <span>{t('analysis.accessibleLabel')}</span>
          </label>
        </div>
        <figure className="analysis-figure">
          <div className="mcal-head">
            <button type="button" aria-label={t('analysis.yearPrev')} disabled={shownYear <= data.firstYear} onClick={() => goToYear(shownYear - 1)}>
              ‹
            </button>
            <input
              type="text"
              inputMode="numeric"
              className="mcal-year"
              aria-label={t('analysis.yearInput', { from: data.firstYear, to: data.lastYear })}
              value={yearDraft ?? String(shownYear)}
              onChange={onYearTyped}
              onBlur={() => setYearDraft(null)}
              onKeyDown={onYearKey}
            />
            <button type="button" aria-label={t('analysis.yearNext')} disabled={shownYear >= data.lastYear} onClick={() => goToYear(shownYear + 1)}>
              ›
            </button>
            <span className="mcal-span">{data.firstYear}–{data.lastYear}</span>
          </div>

          <div className="mcal" role={interactive ? 'group' : 'img'} aria-label={t('analysis.calendarYearLabel', { year: shownYear })} onKeyDown={interactive ? moveFocus : undefined}>
            {monthsLong.map((name, m) => {
              const v = yearRow[m];
              if (v === null) {
                // Mes futuro del último año: se pinta tenue con el valor esperado (mediana histórica), no medido
                const ex = data.expected?.[shownYear]?.[m];
                if (ex) {
                  const text = `${name} ${shownYear}: ${t('analysis.cellExpected', { median: fmt(Math.round(ex.median)), low: fmt(Math.round(ex.p25)), high: fmt(Math.round(ex.p75)) })}`;
                  return (
                    <span key={m} className="mcal-tile expected" role="img" aria-label={text} title={text} style={{ background: cellColor(ex.median, data.max), color: textOn(ex.median, data.max) }}>
                      <b>{name}</b>
                      <span className="mcal-value">{t('analysis.expectedShort', { n: fmt(Math.round(ex.median)) })}</span>
                    </span>
                  );
                }
                return (
                  <span key={m} className="mcal-tile empty" title={interactive ? t('analysis.noMonthData') : undefined}>
                    <b>{name}</b>
                    <span className="mcal-value">—</span>
                  </span>
                );
              }
              const title = `${name} ${shownYear}: ${t('analysis.cellTitle', { days: v })}`;
              const style = { background: cellColor(v, data.max), color: textOn(v, data.max) };
              const content = (
                <>
                  <b>{name}</b>
                  <span className="mcal-value">{fmt(v)}</span>
                </>
              );
              if (!interactive) {
                return (
                  <span key={m} className="mcal-tile" style={style} title={title}>
                    {content}
                  </span>
                );
              }
              // Mes en curso incompleto: se ve, pero no se puede elegir
              const locked = Boolean(data.partial?.[shownYear]?.[m]);
              const picked = selectedMonth && selectedMonth.year === shownYear && selectedMonth.month === m;
              return (
                <button
                  key={m}
                  type="button"
                  data-m={m}
                  className={`mcal-tile${locked ? ' locked' : ' pick'}${picked ? ' picked' : ''}`}
                  style={style}
                  title={locked ? `${name} ${shownYear}: ${t('analysis.monthIncomplete')}` : title}
                  disabled={locked}
                  aria-pressed={locked ? undefined : Boolean(picked)}
                  tabIndex={m === tabM ? 0 : -1}
                  onClick={() => onSelectMonth(shownYear, m)}
                >
                  {content}
                </button>
              );
            })}
          </div>

          <div className="cal-scale">
            <span className="cal-axis">0</span>
            <div className="cal-ramp" style={{ background: rampGradient() }} />
            <span className="cal-axis">{fmt(data.max)}</span>
          </div>

          {interactive && !selectedMonth && <p className="analysis-pick">{t('analysis.pickHint')}</p>}
          {!interactive && data.synthetic && <p className="analysis-pick">{t('analysis.pickNeedsApi')}</p>}

        </figure>
      </section>

      {!data.synthetic && (
        <>
          <section className="panel-section">
            <h3 className="panel-section-title">{t('analysis.sectionSeries')}</h3>
            <EstimateChart points={data.points} />
          </section>
          <section className="panel-section">
            <DownloadPanel
              zone={zone}
              drawnArea={drawnArea}
              zoneName={drawnArea ? t('analysis.customArea') : localizeZone(zone, lang).name}
              selectedMonth={activeMonth}
              data={data}
              range={range}
              ranged={ranged}
            />
          </section>
        </>
      )}
    </div>
  );
}
