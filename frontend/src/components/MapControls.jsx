import React, { useState, useEffect } from 'react';
import {
  Plus,
  Minus,
  Compass,
  RotateCw,
  Orbit,
  Maximize2,
  Minimize2,
  Layers3,
  Globe2
} from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';

export default function MapControls({
  onZoomIn,
  onZoomOut,
  onResetNorth,
  onResetView,
  autoSpin,
  onToggleAutoSpin,
  orbitMode,
  onToggleOrbit,
  onTogglePitch,
  isTilted,
  selectedZone
}) {
  const { t } = useLanguage();
  const [isFullscreen, setIsFullscreen] = useState(false);

  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, []);

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(() => {});
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen().catch(() => {});
      }
    }
  };

  const orbitTitle = selectedZone
    ? t('mapControls.orbitAround', { name: selectedZone.name })
    : t('mapControls.selectZoneToOrbit');

  return (
    <div className="map-controls-container">
      {/* Zoom Controls */}
      <div className="control-group panel">
        <button
          className="control-btn"
          onClick={onZoomIn}
          title={t('mapControls.zoomIn')}
          aria-label={t('mapControls.zoomInAria')}
        >
          <Plus size={18} />
        </button>
        <div className="control-btn-divider" />
        <button
          className="control-btn"
          onClick={onZoomOut}
          title={t('mapControls.zoomOut')}
          aria-label={t('mapControls.zoomOutAria')}
        >
          <Minus size={18} />
        </button>
      </div>

      {/* Navigation Controls */}
      <div className="control-group panel">
        <button
          className="control-btn"
          onClick={onResetNorth}
          title={t('mapControls.resetNorth')}
          aria-label={t('mapControls.resetNorthAria')}
        >
          <Compass size={18} />
        </button>
        <div className="control-btn-divider" />
        <button
          className={`control-btn ${isTilted ? 'active' : ''}`}
          onClick={onTogglePitch}
          title={isTilted ? t('mapControls.zenithView') : t('mapControls.perspective3D')}
          aria-label={t('mapControls.togglePitchAria')}
        >
          <Layers3 size={18} />
        </button>
        <div className="control-btn-divider" />
        <button
          className="control-btn"
          onClick={onResetView}
          title={t('mapControls.resetView')}
          aria-label={t('mapControls.resetViewAria')}
        >
          <Globe2 size={18} />
        </button>
      </div>

      {/* Rotation & Orbit Controls */}
      <div className="control-group panel">
        <button
          className={`control-btn ${autoSpin ? 'active' : ''}`}
          onClick={onToggleAutoSpin}
          title={autoSpin ? t('mapControls.stopAutoSpin') : t('mapControls.startAutoSpin')}
          aria-label={t('mapControls.autoSpinAria')}
        >
          <RotateCw size={18} className={autoSpin ? 'spinning' : ''} />
        </button>
        <div className="control-btn-divider" />
        <button
          className={`control-btn ${orbitMode ? 'active' : ''}`}
          onClick={onToggleOrbit}
          title={orbitTitle}
          aria-label={t('mapControls.orbitAria')}
        >
          <Orbit size={18} className={orbitMode ? 'pulsing' : ''} />
        </button>
        <div className="control-btn-divider" />
        <button
          className="control-btn"
          onClick={toggleFullscreen}
          title={isFullscreen ? t('mapControls.exitFullscreen') : t('mapControls.fullscreen')}
          aria-label={t('mapControls.fullscreenAria')}
        >
          {isFullscreen ? <Minimize2 size={18} /> : <Maximize2 size={18} />}
        </button>
      </div>
    </div>
  );
}
