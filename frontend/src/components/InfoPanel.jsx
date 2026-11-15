import React, { useState } from 'react';
import { X } from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';
import { localizeZone } from '../i18n/zoneText';
import { ZONES } from '../data/zonesData';
import { continentIdOf } from '../utils/continents';
import ZoneSummary from './ZoneSummary';
import AreaSummary from './AreaSummary';
import AnalysisView from './AnalysisView';

// Panel único de información (a la derecha): cabecera con el nombre, pestañas y el contenido de la pestaña activa.
// Para una zona del catálogo: Resumen | Análisis. Para un área trazada: Área | Análisis.
// El padre lo monta con `key` distinta por zona, así que al cambiar de zona vuelve a la primera pestaña.
export default function InfoPanel({
  zone,
  drawnArea,
  onCloseZone,
  onNavigate,
  onGoWorld,
  onCloseArea,
  onDeepZoom,
  onStartOrbit,
  isOrbiting,
  onFocusArea,
  onClearArea,
  selectedMonth,
  onSelectMonth
}) {
  const { lang, t } = useLanguage();
  const [tab, setTab] = useState('main');
  const isArea = Boolean(drawnArea);

  const localized = !isArea && zone ? localizeZone(zone, lang) : null;
  // Ruta: Mundo > continente > país. Cada tramo anterior al actual es un botón.
  const parent = !isArea && zone && zone.category === 'País' ? ZONES.find((z) => z.id === continentIdOf(zone)) : null;
  const parentName = parent ? localizeZone(parent, lang).name : '';
  const typeLabel = isArea
    ? t(
        drawnArea.type === 'rectangle'
          ? 'drawnAreaDrawer.types.rectangle'
          : drawnArea.type === 'polygon'
          ? 'drawnAreaDrawer.types.polygon'
          : 'drawnAreaDrawer.types.freehand'
      )
    : '';

  const tabs = [
    { id: 'main', label: t(isArea ? 'panel.tabArea' : 'panel.tabSummary') },
    { id: 'analysis', label: t('panel.tabAnalysis') }
  ];

  return (
    <aside className={`zone-drawer panel info-panel ${isArea ? 'drawn-area-drawer' : ''} tab-${tab}`}>
      <div className="zone-drawer-header">
        <div className="zone-title-box">
          {isArea ? (
            <div>
              <div className="zone-category-badge">
                {t('drawnAreaDrawer.aoiTitle')} ({typeLabel})
              </div>
              <h2 className="zone-title">{t('drawnAreaDrawer.drawnZone')}</h2>
            </div>
          ) : (
            <div>
              <nav className="zone-crumbs" aria-label={t('zoneDrawer.path')}>
                <button type="button" onClick={onGoWorld}>{t('zoneDrawer.world')}</button>
                {parent && (
                  <>
                    <span aria-hidden="true">›</span>
                    <button type="button" onClick={() => onNavigate(parent)}>{parentName}</button>
                  </>
                )}
                <span aria-hidden="true">›</span>
                <span aria-current="location">{localized.name}</span>
              </nav>
              <div className="zone-category-badge" data-category={zone.category}>{localized.category}</div>
              <h2 className="zone-title">{localized.name}</h2>
              {localized.nativeName && localized.nativeName !== localized.name && (
                <span className="zone-native-title">{localized.nativeName}</span>
              )}
            </div>
          )}
        </div>
        <button
          className="btn-close"
          onClick={isArea ? onCloseArea : onCloseZone}
          aria-label={
            isArea ? t('drawnAreaDrawer.close') : parent ? t('zoneDrawer.closeToContinent', { continent: parentName }) : t('zoneDrawer.close')
          }
        >
          <X size={18} />
        </button>
      </div>

      <div className="info-tabs" role="tablist">
        {tabs.map((item) => (
          <button
            key={item.id}
            role="tab"
            aria-selected={tab === item.id}
            className={`info-tab ${tab === item.id ? 'active' : ''}`}
            onClick={() => setTab(item.id)}
          >
            {item.label}
          </button>
        ))}
      </div>

      {tab === 'analysis' ? (
        <AnalysisView zone={zone} drawnArea={drawnArea} selectedMonth={selectedMonth} onSelectMonth={onSelectMonth} />
      ) : isArea ? (
        <AreaSummary drawnData={drawnArea} onFocusArea={onFocusArea} onClear={onClearArea} />
      ) : (
        <ZoneSummary zone={zone} onDeepZoom={onDeepZoom} onStartOrbit={onStartOrbit} isOrbiting={isOrbiting} />
      )}
    </aside>
  );
}
