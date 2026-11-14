import React from 'react';
import { Compass, Eye, Navigation2 } from 'lucide-react';
import { formatCoords } from '../utils/geoUtils';

export default function CoordinatesHUD({ cursorCoords, zoom, pitch, bearing, projection }) {
  const normalizedBearing = bearing !== null && bearing !== undefined ? Math.round(((bearing % 360) + 360) % 360) : 0;

  return (
    <div className="coordinates-hud panel">
      <div className="hud-item">
        <Navigation2 size={13} className="hud-icon accent" />
        <span className="hud-label">Coord:</span>
        <span className="hud-value font-mono">
          {cursorCoords ? formatCoords(cursorCoords.lat, cursorCoords.lng) : 'Pasa el cursor sobre el globo'}
        </span>
      </div>

      <div className="hud-divider" />

      <div className="hud-item">
        <Eye size={13} className="hud-icon" />
        <span className="hud-label">Zoom:</span>
        <span className="hud-value font-mono">{zoom !== null ? zoom.toFixed(1) + 'x' : '1.5x'}</span>
      </div>

      <div className="hud-divider" />

      <div className="hud-item">
        <Compass size={13} className="hud-icon" />
        <span className="hud-label">Rumbo:</span>
        <span className="hud-value font-mono">{normalizedBearing}° / {pitch !== null ? Math.round(pitch) + '°' : '0°'}</span>
      </div>

      <div className="hud-divider" />

      <div className="hud-item projection-badge">
        <span className="projection-tag">{projection === 'globe' ? 'Globo 3D' : 'Mercator 2D'}</span>
      </div>
    </div>
  );
}
