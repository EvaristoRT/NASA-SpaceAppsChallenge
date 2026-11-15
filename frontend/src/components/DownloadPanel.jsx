import React, { useState } from 'react';
import { useLanguage } from '../context/LanguageContext';
import { geometryFor } from '../utils/useAnalysis';
import { downloadCsv } from '../utils/downloadCsv';
import { exportCalendarPng, exportChartPng } from '../utils/exportFigure';
import { useMeta } from '../utils/useMeta';

const spanMonths = (from, to) => (Number(to.slice(0, 4)) - Number(from.slice(0, 4))) * 12 + Number(to.slice(5)) - Number(from.slice(5)) + 1;

// Descargas de la zona o el área trazada: CSV (serie del periodo, hexágonos y focos del mes o del periodo) e imágenes PNG del
// calendario y de la gráfica. `range` es el periodo elegido ({from, to}, "YYYY-MM"); `ranged` indica que no es toda la serie.
export default function DownloadPanel({ zone, drawnArea, zoneName, selectedMonth, data, range, ranged }) {
  const { t } = useLanguage();
  const meta = useMeta();
  // Estado por fila: { loading, message }
  const [state, setState] = useState({});

  const months = t('analysis.monthsShort');
  const monthLabelOf = (key) => `${months[Number(key.slice(5)) - 1]} ${key.slice(0, 4)}`;
  const periodLabel = range ? (range.from === range.to ? monthLabelOf(range.from) : `${monthLabelOf(range.from)} – ${monthLabelOf(range.to)}`) : '';

  const monthKey = selectedMonth ? `${selectedMonth.year}-${String(selectedMonth.month + 1).padStart(2, '0')}` : null;
  const monthLabel = selectedMonth ? `${t('analysis.monthsLong')[selectedMonth.month]} ${selectedMonth.year}` : '';
  const hotspotsAvailable = meta ? meta.hotspots_available !== false : true;
  // Focos: el mes elegido o, si no hay, el periodo cuando cabe en 12 meses (el límite del servidor)
  const shortRange = range ? spanMonths(range.from, range.to) <= 12 : false;

  const run = async (id, action) => {
    setState((s) => ({ ...s, [id]: { loading: true } }));
    try {
      await action();
      setState((s) => ({ ...s, [id]: { message: t('download.done') } }));
    } catch (error) {
      const message =
        error.status === 413 ? t('download.tooMany') : error.status === 503 ? t('download.unavailable') : t('download.error');
      setState((s) => ({ ...s, [id]: { message, error: true } }));
    }
  };

  const csv = (level, start, end) => () => {
    const geometry = geometryFor(zone, drawnArea);
    if (!geometry) return Promise.resolve();
    return downloadCsv(level, geometry, start, end);
  };

  const slug = (zoneName || 'zone').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'zone';
  const labels = (kind) => ({
    title: t(kind === 'calendar' ? 'download.imageTitleCalendar' : 'download.imageTitleChart', { zone: zoneName }),
    subtitle: t('download.imageSubtitle', { period: periodLabel }),
    footer: t('download.imageFooter'),
    monthsShort: months,
    scaleLabel: t('download.imageScale')
  });
  const chartSvg = () => document.querySelector('.estimate-chart');

  const csvRows = [
    {
      id: 'monthly',
      label: ranged ? t('download.monthlyRange', { zone: zoneName, period: periodLabel }) : t('download.monthly', { zone: zoneName }),
      action: csv('monthly', ranged ? range.from : null, ranged ? range.to : null),
      disabledReason: ''
    },
    {
      id: 'cells',
      label: monthLabel ? t('download.cells', { month: monthLabel }) : t('download.cellsAny'),
      action: csv('cells', monthKey),
      disabledReason: monthKey ? '' : t('download.pickMonth')
    },
    {
      id: 'hotspots',
      label: monthLabel
        ? t('download.hotspots', { month: monthLabel })
        : shortRange
        ? t('download.hotspotsRange', { period: periodLabel })
        : t('download.hotspotsAny'),
      action: monthKey ? csv('hotspots', monthKey) : csv('hotspots', range?.from, range?.to),
      disabledReason: !hotspotsAvailable ? t('download.unavailable') : monthKey || shortRange ? '' : t('download.pickMonthOrShort')
    }
  ];

  const imageRows = [
    {
      id: 'calendarImg',
      label: t('download.calendarImage'),
      action: () => exportCalendarPng(data, labels('calendar'), `ignissync_calendar_${slug}.png`),
      disabledReason: ''
    },
    {
      id: 'chartImg',
      label: t('download.chartImage'),
      action: () => {
        const svg = chartSvg();
        if (!svg) return Promise.reject(new Error('chart'));
        return exportChartPng(svg, labels('chart'), `ignissync_series_${slug}.png`);
      },
      disabledReason: data.points.filter((p) => !p.partial).length >= 2 ? '' : t('download.error')
    }
  ];

  const renderRows = (rows) =>
    rows.map((row) => {
      const s = state[row.id] || {};
      const disabled = Boolean(row.disabledReason) || Boolean(s.loading);
      return (
        <li key={row.id}>
          <button type="button" className="download-row" disabled={disabled} onClick={() => run(row.id, row.action)}>
            <span className="download-text">
              <b>{row.label}</b>
              {row.disabledReason && <small>{row.disabledReason}</small>}
            </span>
          </button>
          {(s.loading || s.message) && (
            <p className={`download-status${s.error ? ' error' : ''}`} role="status">
              {s.loading ? t('download.working') : s.message}
            </p>
          )}
        </li>
      );
    });

  return (
    <details className="analysis-fold">
      <summary>{t('download.title')}</summary>
      <section className="analysis-downloads" aria-label={t('download.csvTitle')}>
        <h3 className="analysis-section-title">{t('download.csvTitle')}</h3>
        <ul>{renderRows(csvRows)}</ul>
      </section>
      <section className="analysis-downloads" aria-label={t('download.imagesTitle')}>
        <h3 className="analysis-section-title">{t('download.imagesTitle')}</h3>
        <ul>{renderRows(imageRows)}</ul>
      </section>
    </details>
  );
}
