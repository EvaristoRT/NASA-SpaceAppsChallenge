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
  Grid
} from 'lucide-react';
import { formatCoords } from '../utils/geoUtils';

export default function ZoneDrawer({
  zone,
  onClose,
  onDeepZoom,
  onStartOrbit,
  isOrbiting
}) {
  const [copied, setCopied] = useState(false);

  if (!zone) return null;

  const handleCopyCoords = () => {
    if (!zone.coords) return;
    const text = `${zone.coords[1]}, ${zone.coords[0]}`;
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  return (
    <div className="zone-drawer glass-panel">
      <div className="zone-drawer-header">
        <div className="zone-title-box">
          <span className="zone-icon-hero">{zone.icon || '📍'}</span>
          <div>
            <div className="zone-category-badge">{zone.category}</div>
            <h2 className="zone-title">{zone.name}</h2>
            {zone.nativeName && zone.nativeName !== zone.name && (
              <span className="zone-native-title">{zone.nativeName}</span>
            )}
          </div>
        </div>
        <button className="btn-close" onClick={onClose} aria-label="Cerrar panel">
          <X size={18} />
        </button>
      </div>

      <div className="zone-drawer-body">
        {/* Coordenadas & Copiar */}
        <div className="zone-coords-bar">
          <div className="coords-info">
            <MapPin size={14} className="accent" />
            <span className="font-mono text-sm">
              {formatCoords(zone.coords[1], zone.coords[0])}
            </span>
          </div>
          <button
            className="btn-tiny"
            onClick={handleCopyCoords}
            title="Copiar latitud y longitud"
          >
            {copied ? <Check size={12} className="text-emerald-400" /> : <Copy size={12} />}
            <span>{copied ? 'Copiado' : 'Copiar'}</span>
          </button>
        </div>

        {/* Resumen de Métricas */}
        <div className="metrics-grid">
          <div className="metric-card">
            <div className="metric-header">
              <Grid size={13} />
              <span>Superficie</span>
            </div>
            <div className="metric-value">{zone.area || 'N/A'}</div>
          </div>

          <div className="metric-card">
            <div className="metric-header">
              <Users size={13} />
              <span>Población</span>
            </div>
            <div className="metric-value">{zone.population || 'N/A'}</div>
          </div>

          <div className="metric-card full-width">
            <div className="metric-header">
              <Thermometer size={13} />
              <span>Clima / Entorno</span>
            </div>
            <div className="metric-value text-sm">{zone.climate || 'Variable'}</div>
          </div>
        </div>

        {/* Descripción */}
        <div className="zone-section">
          <h4 className="section-title">Acerca de esta zona</h4>
          <p className="zone-description">{zone.description}</p>
        </div>

        {/* Puntos destacados / Highlights */}
        {zone.highlights && zone.highlights.length > 0 && (
          <div className="zone-section">
            <h4 className="section-title flex-center">
              <Sparkles size={14} className="accent mr-1" />
              Puntos Destacados
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
            <span>Zoom Detallado</span>
          </button>

          <button
            className={`action-btn ${isOrbiting ? 'active-orbit' : 'secondary'}`}
            onClick={() => onStartOrbit(zone)}
          >
            <Orbit size={15} />
            <span>{isOrbiting ? 'Detener Órbita' : 'Orbitar en 3D'}</span>
          </button>
        </div>
      </div>
    </div>
  );
}
