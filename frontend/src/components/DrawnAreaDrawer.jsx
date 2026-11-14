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

export default function DrawnAreaDrawer({
  drawnData, // { type, coords, area, perimeter, bounds, center, coveredCountries }
  onClose,
  onFocusArea,
  onClear
}) {
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

  const handleCopyGeoJSON = () => {
    const geojson = {
      type: 'Feature',
      properties: {
        name: 'Área Personalizada',
        tipo: type,
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
    <div className="zone-drawer glass-panel drawn-area-drawer">
      <div className="zone-drawer-header">
        <div className="zone-title-box">
          <span className="zone-icon-hero">📐</span>
          <div>
            <div className="zone-category-badge text-amber-400">
              Área de Interés Manual ({type === 'rectangle' ? 'Rectángulo' : 'Forma Libre'})
            </div>
            <h2 className="zone-title">Zona Trazada</h2>
          </div>
        </div>
        <button className="btn-close" onClick={onClose} aria-label="Cerrar detalles del área">
          <X size={18} />
        </button>
      </div>

      <div className="zone-drawer-body">
        {/* Coordenadas del Centro */}
        <div className="zone-coords-bar">
          <div className="coords-info">
            <MapPin size={14} className="text-amber-400" />
            <span className="font-mono text-sm">
              Centro: {formatCoords(center[1], center[0])}
            </span>
          </div>
          <button
            className="btn-tiny"
            onClick={handleCopyCoords}
            title="Copiar coordenadas del centro y Bounding Box"
          >
            {copiedCoords ? <Check size={12} className="text-emerald-400" /> : <Copy size={12} />}
            <span>{copiedCoords ? 'Copiado' : 'Copiar'}</span>
          </button>
        </div>

        {/* Métricas Calculadas */}
        <div className="metrics-grid">
          <div className="metric-card">
            <div className="metric-header">
              <Grid size={13} />
              <span>Superficie Total</span>
            </div>
            <div className="metric-value font-mono text-amber-300">{formattedArea}</div>
          </div>

          <div className="metric-card">
            <div className="metric-header">
              <Ruler size={13} />
              <span>Perímetro</span>
            </div>
            <div className="metric-value font-mono">{formattedPerimeter}</div>
          </div>

          <div className="metric-card full-width">
            <div className="metric-header">
              <Compass size={13} />
              <span>Límites Geográficos (Bounding Box)</span>
            </div>
            <div className="bbox-grid font-mono text-xs">
              <div><strong>N:</strong> {bounds.maxLat.toFixed(2)}°</div>
              <div><strong>S:</strong> {bounds.minLat.toFixed(2)}°</div>
              <div><strong>E:</strong> {bounds.maxLng.toFixed(2)}°</div>
              <div><strong>O:</strong> {bounds.minLng.toFixed(2)}°</div>
            </div>
          </div>
        </div>

        {/* Regiones y Países Abarcados */}
        <div className="zone-section">
          <h4 className="section-title flex-center">
            <Globe2 size={14} className="text-amber-400 mr-1" />
            Países / Regiones Abarcadas ({coveredCountries.length})
          </h4>
          {coveredCountries.length > 0 ? (
            <div className="tags-container">
              {coveredCountries.map((c) => (
                <span key={c.id} className="tag-pill country-pill">
                  {c.icon} {c.name}
                </span>
              ))}
            </div>
          ) : (
            <p className="zone-description italic text-xs text-slate-400">
              No se detectaron capitales o centros de países reconocidos dentro del trazado (posible zona marítima, polar o desértica).
            </p>
          )}
        </div>

        {/* Acciones */}
        <div className="zone-actions-grid">
          <button className="action-btn primary" onClick={onFocusArea}>
            <Maximize2 size={15} />
            <span>Enfocar Área</span>
          </button>

          <button className="action-btn secondary" onClick={handleCopyGeoJSON}>
            {copiedGeoJSON ? <Check size={15} className="text-emerald-400" /> : <Share2 size={15} />}
            <span>{copiedGeoJSON ? 'GeoJSON Copiado' : 'Exportar GeoJSON'}</span>
          </button>
        </div>

        <button className="btn-delete-drawing" onClick={onClear}>
          <Trash2 size={14} />
          <span>Borrar este dibujo</span>
        </button>
      </div>
    </div>
  );
}
