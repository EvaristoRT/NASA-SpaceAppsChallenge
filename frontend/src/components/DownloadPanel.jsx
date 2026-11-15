import React, { useEffect, useRef, useState } from 'react';
import { ChevronDown, Download } from 'lucide-react';
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
  const [open, setOpen] = useState(false);
  // Último resultado de una descarga: { loading, message, error }
  const [status, setStatus] = useState(null);
  const rootRef = useRef(null);

  // El menú se cierra con Esc o al hacer clic fuera
  useEffect(() => {
    if (!open) return undefined;
    const onKey = (e) => e.key === 'Escape' && setOpen(false);
    const onDown = (e) => rootRef.current && !rootRef.current.contains(e.target) && setOpen(false);
    document.addEventListener('keydown', onKey);
    document.addEventListener('pointerdown', onDown);
    return () => {
      document.removeEventListener('keydown', onKey);
      document.removeEventListener('pointerdown', onDown);
    };
  }, [open]);

  const months = t('analysis.monthsShort');
  const monthLabelOf = (key) => `${months[Number(key.slice(5)) - 1]} ${key.slice(0, 4)}`;
  const periodLabel = range ? (range.from === range.to ? monthLabelOf(range.from) : `${monthLabelOf(range.from)} – ${monthLabelOf(range.to)}`) : '';

  const monthKey = selectedMonth ? `${selectedMonth.year}-${String(selectedMonth.month + 1).padStart(2, '0')}` : null;
  const monthLabel = selectedMonth ? `${t('analysis.monthsLong')[selectedMonth.month]} ${selectedMonth.year}` : '';
  const hotspotsAvailable = meta ? meta.hotspots_available !== false : true;
  // Focos: el mes elegido o, si no hay, el periodo cuando cabe en 12 meses (el límite del servidor)
  const shortRange = range ? spanMonths(range.from, range.to) <= 12 : false;

  const run = async (action) => {
    setOpen(false);
    setStatus({ loading: true });
    try {
      await action();
      setStatus({ message: t('download.done') });
    } catch (error) {
      const message =
        error.status === 413 ? t('download.tooMany') : error.status === 503 ? t('download.unavailable') : t('download.error');
      setStatus({ message, error: true });
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

  const renderItems = (rows) =>
    rows.map((row) => (
      <button key={row.id} type="button" role="menuitem" className="download-item" disabled={Boolean(row.disabledReason)} onClick={() => run(row.action)}>
        <span>{row.label}</span>
        {row.disabledReason && <small>{row.disabledReason}</small>}
      </button>
    ));

  return (
    <div className="download-menu" ref={rootRef}>
      <button type="button" className="download-trigger" aria-haspopup="menu" aria-expanded={open} onClick={() => setOpen((v) => !v)}>
        <Download size={15} aria-hidden="true" />
        <span>{t('download.title')}</span>
        <ChevronDown size={14} aria-hidden="true" />
      </button>

      {open && (
        <div className="download-popover" role="menu" aria-label={t('download.title')}>
          <p className="download-group">{t('download.csvTitle')}</p>
          {renderItems(csvRows)}
          <p className="download-group">{t('download.imagesTitle')}</p>
          {renderItems(imageRows)}
        </div>
      )}

      {status && (
        <p className={`download-status${status.error ? ' error' : ''}`} role="status">
          {status.loading ? t('download.working') : status.message}
        </p>
      )}
    </div>
  );
}
