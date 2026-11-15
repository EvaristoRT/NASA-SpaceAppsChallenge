import React, { useState } from 'react';
import { Download } from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';
import { geometryFor } from '../utils/useAnalysis';
import { downloadCsv } from '../utils/downloadCsv';
import { useMeta } from '../utils/useMeta';

// Descargas de la zona o el área trazada: la serie mensual, los hexágonos del mes elegido y los focos individuales de ese mes.
export default function DownloadPanel({ zone, drawnArea, zoneName, selectedMonth }) {
  const { t } = useLanguage();
  const meta = useMeta();
  // Estado por fila: { loading, message }
  const [state, setState] = useState({});

  const monthKey = selectedMonth ? `${selectedMonth.year}-${String(selectedMonth.month + 1).padStart(2, '0')}` : null;
  const monthLabel = selectedMonth ? `${t('analysis.monthsLong')[selectedMonth.month]} ${selectedMonth.year}` : '';
  const hotspotsAvailable = meta ? meta.hotspots_available !== false : true;

  const run = async (id, level, month) => {
    const geometry = geometryFor(zone, drawnArea);
    if (!geometry) return;
    setState((s) => ({ ...s, [id]: { loading: true } }));
    try {
      await downloadCsv(level, geometry, month);
      setState((s) => ({ ...s, [id]: { message: t('download.done') } }));
    } catch (error) {
      const message =
        error.status === 413 ? t('download.tooMany') : error.status === 503 ? t('download.unavailable') : t('download.error');
      setState((s) => ({ ...s, [id]: { message, error: true } }));
    }
  };

  const rows = [
    {
      id: 'monthly',
      level: 'monthly',
      label: t('download.monthly', { zone: zoneName }),
      hint: t('download.monthlyHint'),
      month: null,
      disabledReason: ''
    },
    {
      id: 'cells',
      level: 'cells',
      label: monthLabel ? t('download.cells', { month: monthLabel }) : t('download.cellsAny'),
      hint: t('download.cellsHint'),
      month: monthKey,
      disabledReason: monthKey ? '' : t('download.pickMonth')
    },
    {
      id: 'hotspots',
      level: 'hotspots',
      label: monthLabel ? t('download.hotspots', { month: monthLabel }) : t('download.hotspotsAny'),
      hint: t('download.hotspotsHint'),
      month: monthKey,
      disabledReason: !monthKey ? t('download.pickMonth') : !hotspotsAvailable ? t('download.unavailable') : ''
    }
  ];

  return (
    <section className="analysis-downloads" aria-label={t('download.title')}>
      <h3 className="analysis-section-title">{t('download.title')}</h3>
      <ul>
        {rows.map((row) => {
          const s = state[row.id] || {};
          const disabled = Boolean(row.disabledReason) || Boolean(s.loading);
          return (
            <li key={row.id}>
              <button type="button" className="download-row" disabled={disabled} onClick={() => run(row.id, row.level, row.month)}>
                <Download size={15} aria-hidden="true" />
                <span className="download-text">
                  <b>{row.label}</b>
                  <small>{row.disabledReason || row.hint}</small>
                </span>
              </button>
              {(s.loading || s.message) && (
                <p className={`download-status${s.error ? ' error' : ''}`} role="status">
                  {s.loading ? t('download.working') : s.message}
                </p>
              )}
            </li>
          );
        })}
      </ul>
    </section>
  );
}
