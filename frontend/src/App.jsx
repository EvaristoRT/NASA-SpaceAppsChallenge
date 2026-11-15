import React, { useState, useRef, useEffect } from 'react';
import Globe from './components/Globe';
import Navbar from './components/Navbar';
import SidebarZones from './components/SidebarZones';
import InfoPanel from './components/InfoPanel';
import DrawToolbar from './components/DrawToolbar';
import MapControls from './components/MapControls';
import CoordinatesHUD from './components/CoordinatesHUD';
import ActivityLegend from './components/ActivityLegend';
import { useActivity } from './utils/useActivity';
import { MAP_STYLES, ZONES } from './data/zonesData';
import { continentIdOf } from './utils/continents';
import { AlertCircle, X } from 'lucide-react';
import { LanguageProvider, useLanguage } from './context/LanguageContext';
import './App.css';

// El token de Mapbox sale SOLO de la variable de entorno VITE_MAPBOX_TOKEN: del archivo .env (o .env.local) en
// desarrollo y de las variables del proyecto en Vercel. Vite la incrusta al compilar, así que si se cambia hay que
// volver a compilar o desplegar. No se puede escribir desde la interfaz ni se guarda en el navegador.
const MAPBOX_TOKEN = (import.meta.env.VITE_MAPBOX_TOKEN || '').trim();

function MainApp() {
  const { t } = useLanguage();
  const globeRef = useRef(null);

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

  // Mes elegido en el calendario para pintar su actividad en el mapa: { key, year, month (0-11) }. `key` identifica la zona o el área
  // para la que se eligió; si la zona cambia, el mes se descarta (el calendario y la capa siempre hablan de lo mismo).
  const [activeMonth, setActiveMonth] = useState(null);
  const monthScope = drawnArea ? `area:${(drawnArea.center || []).join(',')}` : selectedZone?.id ?? null;
  // Pestaña del panel: cada zona o área nueva abre SIEMPRE en Información (el análisis, sobre todo el de un continente, tarda en
  // calcularse y en modo datos el mapa no resalta la selección). Solo se pasa a Análisis cuando el usuario lo pide.
  const [tabState, setTabState] = useState({ key: null, tab: 'main' });
  const panelTab = tabState.key === monthScope ? tabState.tab : 'main';
  // Al cambiar de zona (o quitarla) se olvida la pestaña: la misma zona elegida más tarde también abre en Información
  if (tabState.key !== monthScope && tabState.tab !== 'main') setTabState({ key: monthScope, tab: 'main' });
  const setPanelTab = (tab) => setTabState({ key: monthScope, tab });
  if (activeMonth && activeMonth.key !== monthScope) setActiveMonth(null);
  const selectedMonth = activeMonth && activeMonth.key === monthScope ? activeMonth : null;
  const activity = useActivity(selectedZone, drawnArea, selectedMonth);
  // Modo "datos": con una zona elegida y la pestaña Análisis abierta (o un mes encendido) el mapa deja de resaltar al pasar el cursor
  // y quita los rellenos de selección, para que los hexágonos se lean limpios. Al salir vuelve el comportamiento normal.
  const dataMode = Boolean(selectedZone || drawnArea) && (panelTab === 'analysis' || Boolean(selectedMonth));
  const handleSelectMonth = (year, month) =>
    setActiveMonth((prev) => (prev && prev.year === year && prev.month === month && prev.key === monthScope ? null : { key: monthScope, year, month }));

  // Notificación de error de Mapbox
  const [mapError, setMapError] = useState(null);

  // El panel de información de una zona aparece cuando la cámara termina de volar
  const [panelReady, setPanelReady] = useState(true);
  // true mientras vuela la cámara: se ocultan los controles y las coordenadas para que el movimiento se aprecie
  const [isFlying, setIsFlying] = useState(false);
  const panelTimerRef = useRef(null);

  const activeStyle = MAP_STYLES.find((s) => s.id === currentStyleId) || MAP_STYLES[0];

  // Cambiar estilo de cartografía (si es modo topografía, activar inclinación para apreciar relieve 3D)
  const handleSelectStyle = (styleId) => {
    setCurrentStyleId(styleId);
    if (styleId === 'outdoors' && !isTilted) {
      setIsTilted(true);
    }
  };

  // Seleccionar una zona
  const handleSelectZone = (zone) => {
    // El panel de información espera a que la cámara termine de volar, para que el movimiento se aprecie
    if (zone?.id !== selectedZone?.id) {
      setPanelReady(false);
      if (panelTimerRef.current) clearTimeout(panelTimerRef.current);
      panelTimerRef.current = setTimeout(() => setPanelReady(true), 1500); // respaldo si la cámara no avisa (el vuelo dura 1 s)
    }
    setSelectedZone(zone);
    setOrbitMode(false);
    // Al elegir un país el explorador se cierra y deja el mapa libre
    if (zone?.category === 'País') setIsSidebarOpen(false);
    // Al elegir un continente se abre el explorador para poder elegir uno de sus países
    if (zone?.category === 'Continente') setIsSidebarOpen(true);
  };

  // Subir un nivel: país -> su continente -> sin selección. Lo usan el botón de cerrar, la tecla Esc y el clic en el océano.
  const handleGoUp = () => {
    if (!selectedZone) return;
    if (selectedZone.category === 'País') {
      const parent = ZONES.find((z) => z.id === continentIdOf(selectedZone));
      if (parent) {
        handleSelectZone(parent);
        return;
      }
    }
    setSelectedZone(null);
    setOrbitMode(false);
  };

  // "Mundo" en la ruta del panel: limpia la selección y vuelve a la vista global
  const handleGoWorld = () => {
    setSelectedZone(null);
    setOrbitMode(false);
    globeRef.current?.resetView();
  };

  // Esc sube un nivel (no actúa mientras se dibuja ni si el foco está en un campo de texto)
  useEffect(() => {
    const onKeyDown = (e) => {
      if (e.key !== 'Escape' || isDrawOpen || drawMode) return;
      const tag = e.target?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA') return;
      handleGoUp();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  });

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
    const next = projection === 'globe' ? 'mercator' : 'globe';
    // El mapa plano no se inclina, no rota y no tiene órbita: se apagan esos modos
    if (next === 'mercator') {
      setIsTilted(false);
      setOrbitMode(false);
      setAutoSpin(false);
    }
    setProjection(next);
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
    <div className={`app-container${isFlying ? ' is-flying' : ''}`}>
      {/* Barra de navegación superior */}
      <Navbar
        currentStyleId={currentStyleId}
        onSelectStyle={handleSelectStyle}
        projection={projection}
        onToggleProjection={handleToggleProjection}
        onSelectZone={handleSelectZone}
        onToggleSidebar={() => setIsSidebarOpen((prev) => !prev)}
        isSidebarOpen={isSidebarOpen}
        isDrawOpen={isDrawOpen}
        onToggleDraw={handleToggleDraw}
      />

      {/* Visor principal del Globo 3D con Mapbox GL */}
      <Globe
        ref={globeRef}
        token={MAPBOX_TOKEN}
        styleUrl={activeStyle.styleUrl}
        currentStyleId={currentStyleId}
        projection={projection}
        selectedZone={selectedZone}
        onSelectZone={handleSelectZone}
        onGoUp={handleGoUp}
        autoSpin={autoSpin}
        orbitMode={orbitMode}
        isTilted={isTilted}
        drawMode={drawMode}
        drawnArea={drawnArea}
        onFinishDrawing={handleFinishDrawing}
        onDrawPointsChange={setPolygonPointsCount}
        onUpdateHUD={(data) => setHudData((prev) => ({ ...prev, ...data }))}
        onMapError={(err) => setMapError(err)}
        onCameraSettled={() => setPanelReady(true)}
        onFlightChange={setIsFlying}
        activity={activity}
        dataMode={dataMode}
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

      {/* Panel único de información: resumen (o área trazada) y análisis, en pestañas. Una zona del catálogo espera a que la cámara termine */}
      {(drawnArea || (selectedZone && panelReady)) && (
        <InfoPanel
          key={drawnArea ? 'area' : selectedZone.id}
          zone={selectedZone}
          drawnArea={drawnArea}
          onCloseZone={() => {
            setSelectedZone(null);
            setOrbitMode(false);
          }}
          onNavigate={handleSelectZone}
          onGoWorld={handleGoWorld}
          onCloseArea={() => setDrawnArea(null)}
          onDeepZoom={handleDeepZoom}
          onStartOrbit={() => setOrbitMode((prev) => !prev)}
          isOrbiting={orbitMode}
          onFocusArea={handleFocusDrawnArea}
          onClearArea={handleClearDrawing}
          selectedMonth={selectedMonth}
          onSelectMonth={handleSelectMonth}
          tab={panelTab}
          onTabChange={setPanelTab}
        />
      )}

      {/* Leyenda de la capa de actividad del mes elegido */}
      <ActivityLegend month={selectedMonth} activity={activity} onClear={() => setActiveMonth(null)} />

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
        isFlat={projection === 'mercator'}
      />

      {/* HUD de coordenadas y métricas en tiempo real */}
      <CoordinatesHUD
        cursorCoords={hudData.cursorCoords}
        zoom={hudData.zoom}
        pitch={hudData.pitch}
        bearing={hudData.bearing}
        projection={projection}
      />

      {/* Alerta flotante en caso de error de Mapbox */}
      {mapError && (
        <div className="error-toast panel">
          <AlertCircle size={18} className="text-amber-400" />
          <div className="error-text">
            <strong>{t('errorToast.mapboxNotice')}</strong> {mapError}
          </div>
          <button
            className="btn-close-sm"
            onClick={() => setMapError(null)}
            aria-label={t('errorToast.dismiss')}
          >
            <X size={14} />
          </button>
        </div>
      )}
    </div>
  );
}

export default function App() {
  return (
    <LanguageProvider>
      <MainApp />
    </LanguageProvider>
  );
}
