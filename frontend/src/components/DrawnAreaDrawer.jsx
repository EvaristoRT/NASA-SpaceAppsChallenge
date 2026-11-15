import React, { useState } from 'react';
import {
  X,
  Maximize2,
  Copy,
  Check,
  Grid,
  MapPin,
  Ruler,
  Globe2,
  Share2,
  Trash2,
  Compass
} from 'lucide-react';
import { formatCoords } from '../utils/geoUtils';
import { useLanguage } from '../context/LanguageContext';

export default function DrawnAreaDrawer({
  drawnData, // { type, coords, area, perimeter, bounds, center, coveredCountries }
  onClose,
  onFocusArea,
  onClear
}) {
  const { lang, t } = useLanguage();
  const [copiedCoords, setCopiedCoords] = useState(false);
  const [copiedGeoJSON, setCopiedGeoJSON] = useState(false);

  if (!drawnData) return null;

  const {
    type,
    area,
    perimeter,
    bounds,
    center,
    coveredCountries = []
  } = drawnData;

  // Formato legible de área
  const formattedArea =
    area > 10000
      ? `${Math.round(area).toLocaleString()} km²`
      : `${area.toFixed(2)} km² (${Math.round(area * 100).toLocaleString()} ha)`;

  // Formato legible de perímetro
  const formattedPerimeter = `${Math.round(perimeter).toLocaleString()} km`;

  const handleCopyCoords = () => {
    if (!center) return;
    const text = `Centro: ${center[1].toFixed(4)}, ${center[0].toFixed(4)} | BBox: [${bounds.minLng.toFixed(2)}, ${bounds.minLat.toFixed(2)}, ${bounds.maxLng.toFixed(2)}, ${bounds.maxLat.toFixed(2)}]`;
    navigator.clipboard.writeText(text);
    setCopiedCoords(true);
    setTimeout(() => setCopiedCoords(false), 1600);
  };

  const typeLabel =
    type === 'rectangle'
      ? t('drawnAreaDrawer.types.rectangle')
      : type === 'polygon'
      ? t('drawnAreaDrawer.types.polygon')
      : t('drawnAreaDrawer.types.freehand');

  const handleCopyGeoJSON = () => {
    const geojson = {
      type: 'Feature',
      properties: {
        name: lang === 'es' ? 'Área Personalizada' : 'Custom Area',
        tipo: typeLabel,
        superficie_km2: Math.round(area),
        perimetro_km: Math.round(perimeter),
        paises_detectados: coveredCountries.map((c) => c.name)
      },
      geometry: {
        type: 'Polygon',
        coordinates: [drawnData.coords]
      }
    };
    navigator.clipboard.writeText(JSON.stringify(geojson, null, 2));
    setCopiedGeoJSON(true);
    setTimeout(() => setCopiedGeoJSON(false), 1600);
  };

  return (
    <div className="zone-drawer panel drawn-area-drawer">
      <div className="zone-drawer-header">
        <div className="zone-title-box">
          <div>
            <div className="zone-category-badge text-amber-400">
              {t('drawnAreaDrawer.aoiTitle')} ({typeLabel})
            </div>
            <h2 className="zone-title">{t('drawnAreaDrawer.drawnZone')}</h2>
          </div>
        </div>
        <button className="btn-close" onClick={onClose} aria-label={t('drawnAreaDrawer.close')}>
          <X size={18} />
        </button>
      </div>

      <div className="zone-drawer-body">
        {/* Coordenadas del Centro */}
        <div className="zone-coords-bar">
          <div className="coords-info">
            <MapPin size={14} className="text-amber-400" />
            <span className="font-mono text-sm">
              {t('drawnAreaDrawer.center')}: {formatCoords(center[1], center[0])}
            </span>
          </div>
          <button
            className="btn-tiny"
            onClick={handleCopyCoords}
            title={t('drawnAreaDrawer.copyCoords')}
          >
            {copiedCoords ? <Check size={12} className="text-emerald-400" /> : <Copy size={12} />}
            <span>{copiedCoords ? t('zoneDrawer.copied') : t('zoneDrawer.copy')}</span>
          </button>
        </div>

        {/* Métricas Calculadas */}
        <div className="metrics-grid">
          <div className="metric-card">
            <div className="metric-header">
              <Grid size={13} />
              <span>{t('drawnAreaDrawer.estimatedArea')}</span>
            </div>
            <div className="metric-value font-mono text-amber-300">{formattedArea}</div>
          </div>

          <div className="metric-card">
            <div className="metric-header">
              <Ruler size={13} />
              <span>{t('drawnAreaDrawer.perimeter')}</span>
            </div>
            <div className="metric-value font-mono">{formattedPerimeter}</div>
          </div>

          <div className="metric-card full-width">
            <div className="metric-header">
              <Compass size={13} />
              <span>{lang === 'es' ? 'Límites Geográficos (Bounding Box)' : 'Geographic Limits (Bounding Box)'}</span>
            </div>
            <div className="bbox-grid font-mono text-xs">
              <div><strong>N:</strong> {bounds.maxLat.toFixed(2)}°</div>
              <div><strong>S:</strong> {bounds.minLat.toFixed(2)}°</div>
              <div><strong>E:</strong> {bounds.maxLng.toFixed(2)}°</div>
              <div><strong>{lang === 'es' ? 'O:' : 'W:'}</strong> {bounds.minLng.toFixed(2)}°</div>
            </div>
          </div>
        </div>

        {/* Regiones y Países Abarcados */}
        <div className="zone-section">
          <h4 className="section-title flex-center">
            <Globe2 size={14} className="text-amber-400 mr-1" />
            {t('drawnAreaDrawer.coveredCountries')} ({coveredCountries.length})
          </h4>
          {coveredCountries.length > 0 ? (
            <div className="tags-container">
              {coveredCountries.map((c) => (
                <span key={c.id} className="tag-pill country-pill">
                  {c.name}
                </span>
              ))}
            </div>
          ) : (
            <p className="zone-description italic text-xs text-slate-400">
              {t('drawnAreaDrawer.noCountriesDetected')}
            </p>
          )}
        </div>

        {/* Acciones */}
        <div className="zone-actions-grid">
          <button className="action-btn primary" onClick={onFocusArea}>
            <Maximize2 size={15} />
            <span>{t('drawnAreaDrawer.focusArea')}</span>
          </button>

          <button className="action-btn secondary" onClick={handleCopyGeoJSON}>
            {copiedGeoJSON ? <Check size={15} className="text-emerald-400" /> : <Share2 size={15} />}
            <span>{copiedGeoJSON ? (lang === 'es' ? 'GeoJSON Copiado' : 'GeoJSON Copied') : (lang === 'es' ? 'Exportar GeoJSON' : 'Export GeoJSON')}</span>
          </button>
        </div>

        <button className="btn-delete-drawing" onClick={onClear}>
          <Trash2 size={14} />
          <span>{t('drawnAreaDrawer.clearArea')}</span>
        </button>
      </div>
    </div>
  );
}
