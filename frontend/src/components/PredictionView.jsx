import React from 'react';
import { useLanguage } from '../context/LanguageContext';
import { useAnalysis } from '../utils/useAnalysis';
import ExpectedBasisChart from './ExpectedBasisChart';

// Pestaña Predicción: qué se espera para los próximos meses de la zona y, sobre todo, por qué. Es una referencia histórica
// (mediana del mismo mes en los años de la línea base), no un pronóstico: no usa el clima ni los focos de este año.
export default function PredictionView({ zone, drawnArea }) {
  const { lang, t } = useLanguage();
  const seed = drawnArea ? `area:${Math.round(drawnArea.center?.[0] ?? 0)}:${Math.round(drawnArea.center?.[1] ?? 0)}` : zone?.id;
  const { status, data } = useAnalysis(zone, drawnArea, seed);

  const shell = (children) => (
    <div className="zone-drawer-body analysis-view" aria-label={t('prediction.title')}>
      {children}
    </div>
  );

  if (!data) {
    return shell(<p className="analysis-statement">{t(`analysis.${status === 'loading' ? 'loading' : status === 'error' ? 'error' : 'noData'}`)}</p>);
  }
  if (data.synthetic) return shell(<p className="analysis-statement">{t('prediction.needsApi')}</p>);

  const next = data.nextMonths || [];
  if (!next.length || !data.baseline) return shell(<p className="analysis-statement">{t('prediction.none')}</p>);

  const monthsLong = t('analysis.monthsLong');
  const fmt = (n) => Math.round(n).toLocaleString(lang === 'en' ? 'en-US' : 'es-MX');
  const list = next.map((n) => `${lang === 'en' ? monthsLong[n.month] : monthsLong[n.month].toLowerCase()} ${t(`prediction.levelWord.${n.level}`)}`).join(', ');
  const { start_year: from, end_year: to } = data.baseline;

  return shell(
    <>
      <section className="panel-section">
        <p className="analysis-statement">{t('prediction.statement', { list })}</p>
      </section>

      <section className="panel-section" aria-label={t('prediction.listTitle')}>
        <h3 className="panel-section-title">{t('prediction.listTitle')}</h3>
        <ul className="analysis-next">
          {next.map((n) => (
            <li key={`${n.year}-${n.month}`}>
              <span>
                {monthsLong[n.month]}
                {n.month === 0 ? ` ${n.year}` : ''}
              </span>
              <b className={`analysis-level analysis-level-${n.level}`}>{t(`analysis.level.${n.level}`)}</b>
              <small>{t('analysis.cellExpected', { median: fmt(n.median), low: fmt(n.p25), high: fmt(n.p75) })}</small>
            </li>
          ))}
        </ul>
        <p className="analysis-note">{t('prediction.peakMonth', { month: monthsLong[data.riskMonth] })}</p>
      </section>

      <section className="panel-section">
        <h3 className="panel-section-title">{t('prediction.chartTitle')}</h3>
        <ExpectedBasisChart data={data} />
      </section>

      <section className="panel-section pred-how" aria-label={t('prediction.howTitle')}>
        <h3 className="panel-section-title">{t('prediction.howTitle')}</h3>
        <ol>
          <li>{t('prediction.how1', { from, to })}</li>
          <li>{t('prediction.how2')}</li>
          <li>{t('prediction.how3')}</li>
        </ol>
      </section>
    </>
  );
}
