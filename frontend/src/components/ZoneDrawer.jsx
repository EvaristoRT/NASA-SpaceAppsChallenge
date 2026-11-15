import React, { useState } from 'react';
import {
  X,
  Maximize2,
  Orbit,
  Copy,
  Check,
  Sparkles,
  MapPin,
  Thermometer,
  Users,
  Grid,
  Landmark,
  Globe
} from 'lucide-react';
import { formatCoords } from '../utils/geoUtils';
import { useLanguage } from '../context/LanguageContext';
import { localizeZone } from '../i18n/zoneText';

export default function ZoneDrawer({
  zone: rawZone,
  onClose,
  onDeepZoom,
  onStartOrbit,
  isOrbiting
}) {
  const { lang, t } = useLanguage();
  const [copied, setCopied] = useState(false);

  if (!rawZone) return null;

  const zone = localizeZone(rawZone, lang);
  const displayName = zone.name;

  const handleCopyCoords = () => {
    if (!zone.coords) return;
    const text = `${zone.coords[1]}, ${zone.coords[0]}`;
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  return (
    <div className="zone-drawer panel">
      <div className="zone-drawer-header">
        <div className="zone-title-box">
          <div>
            <div className="zone-category-badge" data-category={rawZone.category}>{zone.category}</div>
            <h2 className="zone-title">{displayName}</h2>
            {zone.nativeName && zone.nativeName !== displayName && (
              <span className="zone-native-title">{zone.nativeName}</span>
            )}
          </div>
        </div>
        <button className="btn-close" onClick={onClose} aria-label={t('zoneDrawer.close')}>
          <X size={18} />
        </button>
      </div>

      <div className="zone-drawer-body">
        {/* Coordenadas & Copiar */}
        <div className="zone-coords-bar">
          <div className="coords-info">
            <MapPin size={14} className="accent" />
            <span className="font-mono text-sm">
              {formatCoords(zone.coords[1], zone.coords[0], lang)}
            </span>
          </div>
          <button
            className="btn-tiny"
            onClick={handleCopyCoords}
            title={t('zoneDrawer.copyCoords')}
          >
            {copied ? <Check size={12} className="text-emerald-400" /> : <Copy size={12} />}
            <span>{copied ? t('zoneDrawer.copied') : t('zoneDrawer.copy')}</span>
          </button>
        </div>

        {/* Resumen de Métricas */}
        <div className="metrics-grid">
          {zone.capital && (
            <div className="metric-card">
              <div className="metric-header">
                <Landmark size={13} />
                <span>{t('zoneDrawer.capital')}</span>
              </div>
              <div className="metric-value">{zone.capital}</div>
            </div>
          )}

          {zone.continent && rawZone.category !== 'Continente' && (
            <div className="metric-card">
              <div className="metric-header">
                <Globe size={13} />
                <span>{t('zoneDrawer.continent')}</span>
              </div>
              <div className="metric-value">{zone.continent}</div>
            </div>
          )}

          <div className="metric-card">
            <div className="metric-header">
              <Grid size={13} />
              <span>{t('zoneDrawer.area')}</span>
            </div>
            <div className="metric-value">{zone.area || 'N/A'}</div>
          </div>

          <div className="metric-card">
            <div className="metric-header">
              <Users size={13} />
              <span>{t('zoneDrawer.population')}</span>
            </div>
            <div className="metric-value">{zone.population || 'N/A'}</div>
          </div>

          <div className="metric-card full-width">
            <div className="metric-header">
              <Thermometer size={13} />
              <span>{t('zoneDrawer.climate')}</span>
            </div>
            <div className="metric-value text-sm">{zone.climate || t('zoneDrawer.variable')}</div>
          </div>
        </div>

        {/* Descripción */}
        <div className="zone-section">
          <h4 className="section-title">{t('zoneDrawer.about')}</h4>
          <p className="zone-description">{zone.description}</p>
        </div>

        {/* Puntos destacados / Highlights */}
        {zone.highlights && zone.highlights.length > 0 && (
          <div className="zone-section">
            <h4 className="section-title flex-center">
              <Sparkles size={14} className="accent mr-1" />
              {t('zoneDrawer.highlights')}
            </h4>
            <div className="tags-container">
              {zone.highlights.map((highlight, idx) => (
                <span key={idx} className="tag-pill">
                  {highlight}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Acciones interactivas */}
        <div className="zone-actions-grid">
          <button className="action-btn primary" onClick={() => onDeepZoom(zone)}>
            <Maximize2 size={15} />
            <span>{t('zoneDrawer.detailedZoom')}</span>
          </button>

          <button
            className={`action-btn ${isOrbiting ? 'active-orbit' : 'secondary'}`}
            onClick={() => onStartOrbit(zone)}
          >
            <Orbit size={15} />
            <span>{isOrbiting ? t('zoneDrawer.stopOrbit') : t('zoneDrawer.orbit3D')}</span>
          </button>
        </div>
      </div>
    </div>
  );
}
