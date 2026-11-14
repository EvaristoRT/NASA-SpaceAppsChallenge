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

  return (
    <div className="map-controls-container">
      {/* Zoom Controls */}
      <div className="control-group glass-panel">
        <button
          className="control-btn"
          onClick={onZoomIn}
          title="Acercar zoom (+)"
          aria-label="Acercar"
        >
          <Plus size={18} />
        </button>
        <div className="control-btn-divider" />
        <button
          className="control-btn"
          onClick={onZoomOut}
          title="Alejar zoom (-)"
          aria-label="Alejar"
        >
          <Minus size={18} />
        </button>
      </div>

      {/* Navigation Controls */}
      <div className="control-group glass-panel">
        <button
          className="control-btn"
          onClick={onResetNorth}
          title="Orientar al Norte (0°)"
          aria-label="Orientar al Norte"
        >
          <Compass size={18} />
        </button>
        <div className="control-btn-divider" />
        <button
          className={`control-btn ${isTilted ? 'active' : ''}`}
          onClick={onTogglePitch}
          title={isTilted ? 'Vista Cenital Plana (0°)' : 'Vista Perspectiva 3D (60°)'}
          aria-label="Alternar inclinación 3D"
        >
          <Layers3 size={18} />
        </button>
        <div className="control-btn-divider" />
        <button
          className="control-btn"
          onClick={onResetView}
          title="Vista Global Completa"
          aria-label="Restaurar vista global"
        >
          <Globe2 size={18} />
        </button>
      </div>

      {/* Rotation & Orbit Controls */}
      <div className="control-group glass-panel">
        <button
          className={`control-btn ${autoSpin ? 'active' : ''}`}
          onClick={onToggleAutoSpin}
          title={autoSpin ? 'Detener rotación automática' : 'Iniciar rotación continua'}
          aria-label="Rotación automática"
        >
          <RotateCw size={18} className={autoSpin ? 'spinning' : ''} />
        </button>
        <div className="control-btn-divider" />
        <button
          className={`control-btn ${orbitMode ? 'active' : ''}`}
          onClick={onToggleOrbit}
          title={
            selectedZone
              ? `Orbitar alrededor de ${selectedZone.name}`
              : 'Selecciona una zona para orbitar alrededor de ella'
          }
          aria-label="Modo órbita cinemática"
        >
          <Orbit size={18} className={orbitMode ? 'pulsing' : ''} />
        </button>
        <div className="control-btn-divider" />
        <button
          className="control-btn"
          onClick={toggleFullscreen}
          title={isFullscreen ? 'Salir de pantalla completa' : 'Pantalla completa'}
          aria-label="Pantalla completa"
        >
          {isFullscreen ? <Minimize2 size={18} /> : <Maximize2 size={18} />}
        </button>
      </div>
    </div>
  );
}
