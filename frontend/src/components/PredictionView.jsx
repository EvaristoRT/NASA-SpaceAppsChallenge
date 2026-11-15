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
  const { start_year: from, end_year: to } = data.baseline;

  return shell(
    <>
      <section className="panel-section">
        <h3 className="panel-section-title">{t('prediction.listTitle')}</h3>
        <ul className="pred-months">
          {next.map((n) => (
            <li key={`${n.year}-${n.month}`}>
              <span className="pred-month-name">
                {monthsLong[n.month]}
                {n.month === 0 ? ` ${n.year}` : ''}
              </span>
              <span className="pred-month-value">
                <strong>{fmt(n.median)}</strong> {t('analysis.unitCellDays')}
              </span>
            </li>
          ))}
        </ul>
        <p className="analysis-note">{t('prediction.reason', { from, to })}</p>
      </section>

      <section className="panel-section">
        <h3 className="panel-section-title">{t('prediction.valueTitle')}</h3>
        <ExpectedBasisChart data={data} />
      </section>
    </>
  );
}
