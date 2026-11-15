import React from 'react';
import { X } from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';
import { FIRE_MAX, rampGradient } from '../utils/fireRamp';

// Leyenda de la capa de actividad: qué mes se ve, cómo leer el color y de qué calidad son los datos de ese mes.
export default function ActivityLegend({ month, activity, onClear }) {
  const { lang, t } = useLanguage();
  if (!month) return null;

  const { status, data } = activity;
  const monthName = t('analysis.monthsLong')[month.month];
  const estimated = data && data.source !== 'NOAA-20';
  const fmt = (n) => Math.round(n).toLocaleString(lang === 'en' ? 'en-US' : 'es-MX');

  return (
    <div className="activity-legend panel" role="status" aria-live="polite">
      <div className="activity-legend-head">
        <b>
          {monthName} {month.year}
        </b>
        <button className="btn-close-sm" onClick={onClear} aria-label={t('activity.close')} title={t('activity.close')}>
          <X size={14} />
        </button>
      </div>

      {status === 'loading' && <p className="activity-note">{t('activity.loading')}</p>}
      {status === 'error' && <p className="activity-note">{t('activity.error')}</p>}
      {status === 'empty' && <p className="activity-note">{t('activity.empty')}</p>}

      {status === 'ready' && (
        <>
          <div className="activity-scale">
            <span>0</span>
            <div className="activity-ramp" style={{ background: rampGradient() }} />
            <span>{FIRE_MAX}+</span>
          </div>
          <p className="activity-note">{t('activity.unit')}</p>
          <p className="activity-note">{t('activity.summary', { cells: fmt(data.n_cells), total: fmt(data.total) })}</p>
          {(estimated || data.is_nrt) && (
            <p className="activity-flags">
              {estimated && <span>{t('activity.estimated')}</span>}
              {data.is_nrt && <span>{t('activity.preliminary')}</span>}
            </p>
          )}
        </>
      )}
    </div>
  );
}
