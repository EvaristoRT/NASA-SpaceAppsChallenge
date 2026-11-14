import React, { useState, useRef } from 'react';
import Globe from './components/Globe';
import Navbar from './components/Navbar';
import SidebarZones from './components/SidebarZones';
import ZoneDrawer from './components/ZoneDrawer';
import DrawnAreaDrawer from './components/DrawnAreaDrawer';
import DrawToolbar from './components/DrawToolbar';
import MapControls from './components/MapControls';
import CoordinatesHUD from './components/CoordinatesHUD';
import TokenModal from './components/TokenModal';
import { MAP_STYLES, DEFAULT_MAPBOX_TOKEN } from './data/zonesData';
import { AlertCircle, KeyRound, X } from 'lucide-react';
import './App.css';

export default function App() {
  const globeRef = useRef(null);

  // Estado del Token de Mapbox (lee desde VITE_MAPBOX_TOKEN o localStorage)
  const [token, setToken] = useState(() => {
    return import.meta.env.VITE_MAPBOX_TOKEN || localStorage.getItem('mapbox_token') || DEFAULT_MAPBOX_TOKEN;
  });
  const [isTokenModalOpen, setIsTokenModalOpen] = useState(false);
  const isCustomToken = Boolean(token && token.trim());

  // Estado de Cartografía y Proyección
  const [currentStyleId, setCurrentStyleId] = useState('satellite');
  const [projection, setProjection] = useState('globe'); // 'globe' | 'mercator'

  // Estado de Navegación y Selección de Zonas
  const [selectedZone, setSelectedZone] = useState(null);
  const [autoSpin, setAutoSpin] = useState(true);
  const [orbitMode, setOrbitMode] = useState(false);
  const [isTilted, setIsTilted] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  // --- ESTADO DE LA HERRAMIENTA DE DIBUJO MANUAL (PAINT / AOI) ---
  const [isDrawOpen, setIsDrawOpen] = useState(false);
  const [drawMode, setDrawMode] = useState(null); // 'polygon' | 'freehand' | 'rectangle' | null
  const [polygonPointsCount, setPolygonPointsCount] = useState(0);
  const [drawnArea, setDrawnArea] = useState(null); // { type, coords, area, perimeter, bounds, center, coveredCountries }

  // Estado del HUD (Coordenadas, Zoom, Inclinación)
  const [hudData, setHudData] = useState({
    cursorCoords: null,
    zoom: 1.6,
    pitch: 0,
    bearing: 0
  });

  // Notificación de error de Mapbox
  const [mapError, setMapError] = useState(null);

  const activeStyle = MAP_STYLES.find((s) => s.id === currentStyleId) || MAP_STYLES[0];

  // Guardar nuevo Token
  const handleSaveToken = (newToken) => {
    localStorage.setItem('mapbox_token', newToken);
    setToken(newToken);
    setMapError(null);
  };

  // Seleccionar una zona
  const handleSelectZone = (zone) => {
    setSelectedZone(zone);
    setOrbitMode(false);
  };

  // Alternar rotación continua
  const handleToggleAutoSpin = () => {
    setAutoSpin((prev) => {
      const next = !prev;
      if (next) {
        if (projection !== 'globe') {
          setProjection('globe');
        }
        setSelectedZone(null);
        setDrawnArea(null);
        setOrbitMode(false);
      }
      return next;
    });
  };

  // Alternar modo órbita
  const handleToggleOrbit = () => {
    if (!selectedZone) {
      setIsSidebarOpen(true);
      return;
    }
    setOrbitMode((prev) => !prev);
  };

  // Alternar proyección 3D / 2D
  const handleToggleProjection = () => {
    setProjection((prev) => (prev === 'globe' ? 'mercator' : 'globe'));
  };

  // --- GESTORES DE DIBUJO ---
  const handleToggleDraw = () => {
    if (isDrawOpen) {
      setIsDrawOpen(false);
      setDrawMode(null);
      setPolygonPointsCount(0);
      globeRef.current?.clearPolygonPoints();
    } else {
      setIsDrawOpen(true);
      setDrawMode('polygon'); // Polígono por defecto para precisión por vértices
    }
  };

  const handleSelectDrawMode = (mode) => {
    setDrawMode(mode);
    setPolygonPointsCount(0);
    globeRef.current?.clearPolygonPoints();
  };

  const handleFinishDrawing = (data) => {
    setDrawnArea(data);
    setSelectedZone(null); // Priorizar vista de la zona dibujada
    setPolygonPointsCount(0);
  };

  const handleClearDrawing = () => {
    setDrawnArea(null);
    setPolygonPointsCount(0);
    globeRef.current?.clearPolygonPoints();
  };

  const handleFocusDrawnArea = () => {
    if (drawnArea?.bounds) {
      globeRef.current?.focusArea(drawnArea.bounds);
    }
  };

  // Controles de cámara delegados al componente Globe
  const handleZoomIn = () => globeRef.current?.zoomIn();
  const handleZoomOut = () => globeRef.current?.zoomOut();
  const handleResetNorth = () => globeRef.current?.resetNorth();
  const handleResetView = () => {
    setSelectedZone(null);
    setDrawnArea(null);
    setOrbitMode(false);
    setAutoSpin(true);
    globeRef.current?.resetView();
  };
  const handleDeepZoom = (zone) => globeRef.current?.deepZoom(zone);

  return (
    <div className="app-container">
      {/* Barra de navegación superior */}
      <Navbar
        currentStyleId={currentStyleId}
        onSelectStyle={setCurrentStyleId}
        projection={projection}
        onToggleProjection={handleToggleProjection}
        onOpenTokenModal={() => setIsTokenModalOpen(true)}
        isCustomToken={isCustomToken}
        onSelectZone={handleSelectZone}
        onToggleSidebar={() => setIsSidebarOpen((prev) => !prev)}
        isSidebarOpen={isSidebarOpen}
        isDrawOpen={isDrawOpen}
        onToggleDraw={handleToggleDraw}
      />

      {/* Visor principal del Globo 3D con Mapbox GL */}
      <Globe
        ref={globeRef}
        token={token}
        styleUrl={activeStyle.styleUrl}
        projection={projection}
        selectedZone={selectedZone}
        onSelectZone={handleSelectZone}
        autoSpin={autoSpin}
        orbitMode={orbitMode}
        isTilted={isTilted}
        drawMode={drawMode}
        drawnArea={drawnArea}
        onFinishDrawing={handleFinishDrawing}
        onDrawPointsChange={setPolygonPointsCount}
        onUpdateHUD={(data) => setHudData((prev) => ({ ...prev, ...data }))}
        onMapError={(err) => setMapError(err)}
      />

      {/* Barra de herramientas flotante de dibujo (tipo Paint) */}
      {isDrawOpen && (
        <DrawToolbar
          drawMode={drawMode}
          onSelectDrawMode={handleSelectDrawMode}
          onClearDrawing={handleClearDrawing}
          hasDrawing={Boolean(drawnArea)}
          polygonPointsCount={polygonPointsCount}
          onFinishPolygon={() => globeRef.current?.finishPolygon()}
          onUndoVertex={() => globeRef.current?.undoPolygonVertex()}
          onClose={() => {
            setIsDrawOpen(false);
            setDrawMode(null);
            setPolygonPointsCount(0);
            globeRef.current?.clearPolygonPoints();
          }}
        />
      )}

      {/* Explorador lateral de zonas y países */}
      <SidebarZones
        isOpen={isSidebarOpen}
        onClose={() => setIsSidebarOpen(false)}
        selectedZone={selectedZone}
        onSelectZone={handleSelectZone}
      />

      {/* Tarjeta flotante con detalles de la zona de catálogo seleccionada */}
      {!drawnArea && (
        <ZoneDrawer
          zone={selectedZone}
          onClose={() => {
            setSelectedZone(null);
            setOrbitMode(false);
          }}
          onDeepZoom={handleDeepZoom}
          onStartOrbit={() => setOrbitMode((prev) => !prev)}
          isOrbiting={orbitMode}
        />
      )}

      {/* Tarjeta de detalles del Área Dibujada Manualmente */}
      {drawnArea && (
        <DrawnAreaDrawer
          drawnData={drawnArea}
          onClose={() => setDrawnArea(null)}
          onFocusArea={handleFocusDrawnArea}
          onClear={handleClearDrawing}
        />
      )}

      {/* Controles de cámara flotantes */}
      <MapControls
        onZoomIn={handleZoomIn}
        onZoomOut={handleZoomOut}
        onResetNorth={handleResetNorth}
        onResetView={handleResetView}
        autoSpin={autoSpin}
        onToggleAutoSpin={handleToggleAutoSpin}
        orbitMode={orbitMode}
        onToggleOrbit={handleToggleOrbit}
        onTogglePitch={() => setIsTilted((prev) => !prev)}
        isTilted={isTilted}
        selectedZone={selectedZone}
      />

      {/* HUD de coordenadas y métricas en tiempo real */}
      <CoordinatesHUD
        cursorCoords={hudData.cursorCoords}
        zoom={hudData.zoom}
        pitch={hudData.pitch}
        bearing={hudData.bearing}
        projection={projection}
      />

      {/* Modal de configuración de Token */}
      <TokenModal
        isOpen={isTokenModalOpen}
        onClose={() => setIsTokenModalOpen(false)}
        currentToken={token}
        onSaveToken={handleSaveToken}
      />

      {/* Alerta flotante en caso de error de Mapbox */}
      {mapError && (
        <div className="error-toast glass-panel">
          <AlertCircle size={18} className="text-amber-400" />
          <div className="error-text">
            <strong>Aviso de Mapbox:</strong> {mapError}
          </div>
          <button
            className="btn-tiny btn-action"
            onClick={() => setIsTokenModalOpen(true)}
          >
            <KeyRound size={12} /> Configurar Token
          </button>
          <button
            className="btn-close-sm"
            onClick={() => setMapError(null)}
            aria-label="Descartar"
          >
            <X size={14} />
          </button>
        </div>
      )}
    </div>
  );
}
