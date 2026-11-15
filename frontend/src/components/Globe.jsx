import React, { useEffect, useRef, useState, forwardRef, useImperativeHandle, useCallback } from 'react';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import { ZONES } from '../data/zonesData';
import { useLanguage } from '../context/LanguageContext';
import { localizeZone } from '../i18n/zoneText';
import {
  generateZonesGeoJSON,
  generateZonesOutlineGeoJSON,
  calculatePolygonArea,
  calculatePolygonPerimeter,
  getPolygonBoundsAndCenter,
  findCoveredCountries
} from '../utils/geoUtils';

// Duración de los vuelos de cámara (ms). Antes eran de 2 a 2.5 s; se acortaron (1.4 s y luego 1 s) para que la navegación se sienta ágil.
const FLY_MS = 1000;
const FLY_CURVE = 1.2;

// En el mapa plano el mundo se repite al desplazarse (como cualquier mapa web): el arrastre es libre. Con `false` el mapa queda en un
// solo mundo, pero Mapbox obliga a que llene el ancho de la pantalla y al alejar el arrastre queda bloqueado en horizontal.
const FLAT_WORLD_COPIES = true;

const Globe = forwardRef(function Globe(
  {
    token,
    styleUrl,
    currentStyleId,
    projection,
    selectedZone,
    onSelectZone,
    autoSpin,
    orbitMode,
    isTilted,
    drawMode,
    drawnArea,
    onFinishDrawing,
    onDrawPointsChange,
    onUpdateHUD,
    onMapError,
    onCameraSettled,
    onFlightChange
  },
  ref
) {
  const { lang, t } = useLanguage();
  const mapContainerRef = useRef(null);
  const mapRef = useRef(null);
  const markersRef = useRef([]);
  const selectedMarkerRef = useRef(null);
  const animFrameRef = useRef(null);

  const currentStyleIdRef = useRef(currentStyleId);
  useEffect(() => {
    currentStyleIdRef.current = currentStyleId;
  }, [currentStyleId]);

  // Estado de carga inicial para evitar parpadeos y desalineaciones de canvas
  const [isMapLoaded, setIsMapLoaded] = useState(false);
  const mapLoadedRef = useRef(false);
  const canAutoSpinRef = useRef(false);
  const initialSpinTimeoutRef = useRef(null);

  // Seguimiento de valores previos para no disparar animaciones easeTo en el montaje inicial
  const prevStyleUrlRef = useRef(styleUrl);
  const prevProjectionRef = useRef(projection);
  const prevTiltedRef = useRef(isTilted);
  const prevSelectedZoneRef = useRef(selectedZone);

  // Referencias para interacción del usuario y rotación automática
  const userInteractingRef = useRef(false);
  const spinResumeTimeoutRef = useRef(null);
  const autoSpinActiveRef = useRef(autoSpin);
  const orbitActiveRef = useRef(orbitMode);
  const selectedZoneRef = useRef(selectedZone);
  const drawnAreaRef = useRef(drawnArea);
  const projectionRef = useRef(projection);
  const orbitBearingRef = useRef(0);
  const hoveredZoneIdRef = useRef('');
  const hoverPopupRef = useRef(null);

  // Referencias para el modo dibujo
  const drawModeRef = useRef(drawMode);
  const isDrawingRef = useRef(false);
  const drawPointsRef = useRef([]);
  const rectangleStartRef = useRef(null);
  const polygonPointsRef = useRef([]);

  // Sincronizar referencias cuando cambian los props
  useEffect(() => {
    autoSpinActiveRef.current = autoSpin;
  }, [autoSpin]);

  useEffect(() => {
    orbitActiveRef.current = orbitMode;
  }, [orbitMode]);

  useEffect(() => {
    selectedZoneRef.current = selectedZone;
  }, [selectedZone]);

  useEffect(() => {
    drawnAreaRef.current = drawnArea;
  }, [drawnArea]);

  useEffect(() => {
    projectionRef.current = projection;
  }, [projection]);

  useEffect(() => {
    drawModeRef.current = drawMode;
    if (mapRef.current) {
      if (drawMode) {
        mapRef.current.dragPan.disable();
        mapRef.current.doubleClickZoom.disable();
        mapRef.current.getCanvas().style.cursor = 'crosshair';
      } else {
        mapRef.current.dragPan.enable();
        mapRef.current.doubleClickZoom.enable();
        mapRef.current.getCanvas().style.cursor = '';
        isDrawingRef.current = false;
        polygonPointsRef.current = [];
        if (onDrawPointsChange) onDrawPointsChange(0);
      }
    }
  }, [drawMode, onDrawPointsChange]);

  // Manejadores para pausar y reanudar rotación automática en interacciones del usuario
  const handleInteractionStart = () => {
    if (spinResumeTimeoutRef.current) {
      clearTimeout(spinResumeTimeoutRef.current);
      spinResumeTimeoutRef.current = null;
    }
    userInteractingRef.current = true;
  };

  const handleInteractionEnd = () => {
    if (isDrawingRef.current) return;
    if (spinResumeTimeoutRef.current) {
      clearTimeout(spinResumeTimeoutRef.current);
    }
    // Pausa breve de 1.2s tras soltar el cursor antes de reanudar el giro suave
    spinResumeTimeoutRef.current = setTimeout(() => {
      userInteractingRef.current = false;
    }, 1200);
  };

  // Finalizar y calcular métricas del polígono manual por vértices
  const completePolygon = useCallback((points) => {
    if (!points || points.length < 3) return;
    const finalCoords = [...points, points[0]];
    updateDrawSource(finalCoords, []);
    const area = calculatePolygonArea(finalCoords);
    const perimeter = calculatePolygonPerimeter(finalCoords);
    const bounds = getPolygonBoundsAndCenter(finalCoords);
    const coveredCountries = findCoveredCountries(finalCoords);

    polygonPointsRef.current = [];
    if (onDrawPointsChange) onDrawPointsChange(0);

    if (onFinishDrawing) {
      onFinishDrawing({
        type: 'polygon',
        coords: finalCoords,
        area,
        perimeter,
        bounds,
        center: bounds ? bounds.center : [0, 0],
        coveredCountries
      });
    }
  }, [onDrawPointsChange, onFinishDrawing]);

  // Exponer métodos para los controles flotantes
  useImperativeHandle(ref, () => ({
    zoomIn: () => {
      if (mapRef.current) mapRef.current.zoomIn({ duration: 400 });
    },
    zoomOut: () => {
      if (mapRef.current) mapRef.current.zoomOut({ duration: 400 });
    },
    resetNorth: () => {
      if (mapRef.current) mapRef.current.resetNorthPitch({ duration: 800 });
    },
    resetView: () => {
      if (mapRef.current) {
        mapRef.current.flyTo({
          center: [0, 20],
          zoom: 1.6,
          pitch: 0,
          bearing: 0,
          duration: FLY_MS
        });
        trackFlight(mapRef.current);
      }
    },
    deepZoom: (zone) => {
      if (mapRef.current && zone) {
        mapRef.current.flyTo({
          center: zone.coords,
          zoom: Math.min((zone.zoom || 4) + 3.5, 14),
          pitch: projectionRef.current === 'mercator' ? 0 : 68,
          bearing: projectionRef.current === 'mercator' ? 0 : (zone.bearing || 0) + 25,
          duration: FLY_MS,
          curve: FLY_CURVE
        });
        trackFlight(mapRef.current);
      }
    },
    focusArea: (bounds) => {
      if (mapRef.current && bounds) {
        mapRef.current.fitBounds(
          [
            [bounds.minLng, bounds.minLat],
            [bounds.maxLng, bounds.maxLat]
          ],
          { padding: 100, duration: FLY_MS, maxZoom: 8 }
        );
        trackFlight(mapRef.current);
      }
    },
    finishPolygon: () => {
      if (polygonPointsRef.current.length >= 3) {
        completePolygon(polygonPointsRef.current);
      }
    },
    undoPolygonVertex: () => {
      if (polygonPointsRef.current.length > 0) {
        polygonPointsRef.current.pop();
        const pts = polygonPointsRef.current;
        if (onDrawPointsChange) onDrawPointsChange(pts.length);
        if (pts.length >= 3) {
          updateDrawSource([...pts, pts[0]], pts);
        } else if (pts.length === 2) {
          updateDrawSource(pts, pts);
        } else {
          updateDrawSource(null, pts);
        }
      }
    },
    clearPolygonPoints: () => {
      polygonPointsRef.current = [];
      if (onDrawPointsChange) onDrawPointsChange(0);
      updateDrawSource(null, []);
    }
  }));

  // Atajos de teclado para el modo polígono por vértices
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (drawModeRef.current === 'polygon') {
        if (e.key === 'Enter') {
          if (polygonPointsRef.current.length >= 3) {
            e.preventDefault();
            completePolygon(polygonPointsRef.current);
          }
        } else if (e.key === 'Backspace' || e.key === 'Delete') {
          if (polygonPointsRef.current.length > 0) {
            e.preventDefault();
            polygonPointsRef.current.pop();
            const pts = polygonPointsRef.current;
            if (onDrawPointsChange) onDrawPointsChange(pts.length);
            if (pts.length >= 3) {
              updateDrawSource([...pts, pts[0]], pts);
            } else if (pts.length === 2) {
              updateDrawSource(pts, pts);
            } else {
              updateDrawSource(null, pts);
            }
          }
        } else if (e.key === 'Escape') {
          polygonPointsRef.current = [];
          if (onDrawPointsChange) onDrawPointsChange(0);
          updateDrawSource(null, []);
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [completePolygon, onDrawPointsChange]);

  // Actualizar fuente del trazado en tiempo real (polígono, línea elástica y vértices)
  const updateDrawSource = (coords, vertexPoints = []) => {
    if (!mapRef.current) return;
    const source = mapRef.current.getSource('draw-source');
    if (!source) return;

    const features = [];

    // Polígono o línea de trazado
    if (coords && coords.length >= 3) {
      features.push({
        type: 'Feature',
        properties: { type: 'area' },
        geometry: {
          type: 'Polygon',
          coordinates: [coords]
        }
      });
    } else if (coords && coords.length === 2) {
      features.push({
        type: 'Feature',
        properties: { type: 'line' },
        geometry: {
          type: 'LineString',
          coordinates: coords
        }
      });
    }

    // Puntos de vértices para polígono manual
    if (vertexPoints && vertexPoints.length > 0) {
      vertexPoints.forEach((pt, index) => {
        features.push({
          type: 'Feature',
          properties: {
            type: 'vertex',
            index: index + 1,
            isFirst: index === 0
          },
          geometry: {
            type: 'Point',
            coordinates: pt
          }
        });
      });
    }

    source.setData({
      type: 'FeatureCollection',
      features
    });
  };

  // Reflejar polígono dibujado cuando cambie externamente
  useEffect(() => {
    if (drawnArea && drawnArea.coords) {
      updateDrawSource(drawnArea.coords);
    } else {
      updateDrawSource(null);
    }
  }, [drawnArea]);

  // Relieve 3D para modo Topografía y Satélite (usando Mapbox Terrain-DEM)
  const applyTerrain = (map) => {
    if (!map) return;
    try {
      const activeId = currentStyleIdRef.current || '';
      const isTopography = activeId === 'outdoors' || (styleUrl && styleUrl.includes('outdoors'));
      const isSatellite = activeId === 'satellite' || (styleUrl && styleUrl.includes('satellite'));

      if (isTopography || isSatellite) {
        if (!map.getSource('mapbox-dem')) {
          map.addSource('mapbox-dem', {
            type: 'raster-dem',
            url: 'mapbox://mapbox.mapbox-terrain-dem-v1',
            tileSize: 512,
            maxzoom: 14
          });
        }
        // Exageración de 1.95 en modo topografía para que las cordilleras, valles y picos montañosos resalten claramente en 3D
        // En satélite, un relieve natural de 1.35
        // Algo más que en view_tests (1.95 / 1.35) para que se note a escala de país
        const exaggeration = isTopography ? 2.8 : 1.8;
        map.setTerrain({ source: 'mapbox-dem', exaggeration });
      } else {
        if (map.getTerrain()) {
          map.setTerrain(null);
        }
      }
    } catch (err) {
      console.warn('Error configuring 3D terrain:', err);
    }
  };

  // Atmósfera y estrellas espaciales
  const applyAtmosphereAndFog = useCallback((map) => {
    if (!map) return;
    try {
      const activeId = currentStyleIdRef.current || '';
      const isTopography = activeId === 'outdoors' || (styleUrl && styleUrl.includes('outdoors'));

      if (isTopography) {
        map.setFog({
          range: [0.5, 10],
          // Bruma y horizonte natural para apreciar la silueta tridimensional de las montañas
          color: '#dbeafe',
          'high-color': '#1e3a8a',
          'space-color': '#151622',
          'horizon-blend': 0.08,
          'star-intensity': 0.4
        });
      } else {
        map.setFog({
          range: [0.5, 10],
          // Atmósfera con los azules de la marca Space Apps
          color: '#1b2b85',
          'high-color': '#151622',
          'space-color': '#151622',
          'horizon-blend': 0.03,
          'star-intensity': 0.75
        });
      }
    } catch (e) {
      console.warn('Atmosphere fog notice:', e);
    }
  }, [styleUrl]);

  // Idioma de las etiquetas del mapa (países, ciudades, ríos, mares...). Los estilos de Mapbox usan `name_en` con respaldo a
  // `name`; aquí se cambia por `name_<idioma>` en cada capa de texto. Se guarda el texto original de cada capa para poder
  // volver al inglés, y se vuelve a calcular en cada estilo nuevo (setStyle borra las capas).
  const applyMapLanguage = (map) => {
    if (!map) return;
    try {
      const lang = langRef.current;
      const walk = (node) => {
        if (!Array.isArray(node)) return node;
        if (node[0] === 'get' && node[1] === 'name_en') {
          return lang === 'en' ? node : ['coalesce', ['get', `name_${lang}`], ['get', 'name_en'], ['get', 'name']];
        }
        return node.map(walk);
      };
      const originals = labelOriginalsRef.current;
      for (const layer of map.getStyle().layers) {
        if (layer.type !== 'symbol') continue;
        const field = layer.layout && layer.layout['text-field'];
        if (!field) continue;
        if (!originals.has(layer.id)) {
          if (!JSON.stringify(field).includes('name_en')) continue;
          originals.set(layer.id, field);
        }
        map.setLayoutProperty(layer.id, 'text-field', walk(originals.get(layer.id)));
      }
    } catch (e) {
      console.warn('No se pudo cambiar el idioma de las etiquetas del mapa:', e);
    }
  };

  // Limpiar marcadores
  const clearMarkers = () => {
    markersRef.current.forEach((marker) => marker.remove());
    markersRef.current = [];
    if (selectedMarkerRef.current) {
      selectedMarkerRef.current.remove();
      selectedMarkerRef.current = null;
    }
  };

  // Idioma activo para las etiquetas de los marcadores (se leen al crearlos; ver el efecto de abajo)
  const langRef = useRef(lang);
  langRef.current = lang;
  const labelOriginalsRef = useRef(new Map());
  const onCameraSettledRef = useRef(onCameraSettled);
  onCameraSettledRef.current = onCameraSettled;
  const onSelectZoneRef = useRef(onSelectZone);
  onSelectZoneRef.current = onSelectZone;
  const onFlightChangeRef = useRef(onFlightChange);
  onFlightChangeRef.current = onFlightChange;
  const flightIdRef = useRef(0);

  // Mapa plano (Mercator 2D): sin rotación ni inclinación. Las copias del mundo dependen de FLAT_WORLD_COPIES. En el globo todo es libre.
  const applyFlatConstraints = (map, flat) => {
    if (!map) return;
    try {
      if (flat) {
        map.dragRotate.disable();
        map.touchZoomRotate.disableRotation();
        map.setMaxPitch(0);
        map.setRenderWorldCopies(FLAT_WORLD_COPIES);
        if (map.getPitch() !== 0 || map.getBearing() !== 0) map.easeTo({ pitch: 0, bearing: 0, duration: 400 });
      } else {
        map.dragRotate.enable();
        map.touchZoomRotate.enableRotation();
        map.setMaxPitch(85);
        map.setRenderWorldCopies(true);
      }
    } catch (e) {
      console.warn('No se pudieron ajustar los límites del mapa plano:', e);
    }
  };

  // Avisa al padre mientras la cámara vuela (para ocultar controles y coordenadas). Si un vuelo interrumpe a otro, solo el
  // último avisa del final, para que los controles no reaparezcan a mitad del segundo vuelo.
  const trackFlight = (map) => {
    const id = ++flightIdRef.current;
    if (onFlightChangeRef.current) onFlightChangeRef.current(true);
    map.once('moveend', () => {
      if (id === flightIdRef.current && onFlightChangeRef.current) onFlightChangeRef.current(false);
    });
  };

  // Marcadores de referencia para los continentes
  const renderZoneMarkers = (map) => {
    clearMarkers();
    if (!map) return;

    const primaryZones = ZONES.filter((z) => z.category === 'Continente');

    primaryZones.forEach((zone) => {
      const el = document.createElement('div');
      el.className = 'custom-zone-marker';
      el.innerHTML = `
        <div class="marker-dot"></div>
        <div class="marker-label">${localizeZone(zone, langRef.current).name}</div>
      `;

      el.addEventListener('click', (e) => {
        if (drawModeRef.current) return;
        e.stopPropagation();
        onSelectZone(zone);
      });

      const marker = new mapboxgl.Marker({
        element: el,
        anchor: 'bottom'
      })
        .setLngLat(zone.coords)
        .addTo(map);

      markersRef.current.push(marker);
    });
  };

  // Bajo el cursor hay a la vez un país y su continente (los continentes están al final de los datos, así que Mapbox los devuelve primero).
  // Siempre se prefiere el país; el continente solo si no hay ninguno debajo (por ejemplo, la Antártida).
  const pickZoneFeature = (features) =>
    features && features.length > 0 ? features.find((f) => f.properties.category === 'País') || features[0] : null;

  // Etiqueta con el nombre de la zona bajo el cursor (en el idioma activo). Sigue al cursor.
  const showHoverLabel = (map, lngLat, zoneId) => {
    const zone = zoneId ? ZONES.find((z) => z.id === zoneId) : null;
    if (!zone) {
      if (hoverPopupRef.current) hoverPopupRef.current.remove();
      return;
    }
    if (!hoverPopupRef.current) {
      hoverPopupRef.current = new mapboxgl.Popup({
        closeButton: false,
        closeOnClick: false,
        focusAfterOpen: false,
        offset: 14,
        anchor: 'bottom',
        className: 'hover-label'
      });
    }
    const popup = hoverPopupRef.current;
    popup.setLngLat(lngLat).setText(localizeZone(zone, langRef.current).name);
    if (!popup.isOpen()) popup.addTo(map);
  };

  // Al cambiar de idioma, volver a dibujar las etiquetas de los continentes
  useEffect(() => {
    if (mapRef.current && markersRef.current.length > 0) renderZoneMarkers(mapRef.current);
    if (mapRef.current && mapRef.current.isStyleLoaded()) applyMapLanguage(mapRef.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lang]);

  // Marcador dinámico para el país o zona seleccionada
  const renderSelectedZoneMarker = (map, zone) => {
    if (!map || !zone) return;
    if (selectedMarkerRef.current) {
      selectedMarkerRef.current.remove();
      selectedMarkerRef.current = null;
    }

    const el = document.createElement('div');
    el.className = 'custom-zone-marker selected-active-marker';
    el.innerHTML = `
      <div class="marker-dot active"></div>
      <div class="marker-label">${zone.name}</div>
    `;

    const marker = new mapboxgl.Marker({
      element: el,
      anchor: 'bottom'
    })
      .setLngLat(zone.coords)
      .addTo(map);

    selectedMarkerRef.current = marker;
  };

  // Capas poligonales de países y zonas
  const setupZoneLayers = (map) => {
    if (!map) return;
    const geojsonData = generateZonesGeoJSON();

    if (map.getLayer('zones-highlight-line')) map.removeLayer('zones-highlight-line');
    if (map.getLayer('zones-highlight-fill')) map.removeLayer('zones-highlight-fill');
    if (map.getLayer('zones-hover-line')) map.removeLayer('zones-hover-line');
    if (map.getLayer('zones-hover-fill')) map.removeLayer('zones-hover-fill');
    if (map.getLayer('zones-line')) map.removeLayer('zones-line');
    if (map.getLayer('zones-fill')) map.removeLayer('zones-fill');
    if (map.getSource('zones-geojson')) map.removeSource('zones-geojson');
    if (map.getSource('zones-outline')) map.removeSource('zones-outline');

    map.addSource('zones-geojson', {
      type: 'geojson',
      data: geojsonData
    });

    // Los contornos salen de una fuente propia, sin las aristas artificiales del antimeridiano y el polo
    map.addSource('zones-outline', {
      type: 'geojson',
      data: generateZonesOutlineGeoJSON()
    });

    map.addLayer({
      id: 'zones-fill',
      type: 'fill',
      source: 'zones-geojson',
      paint: {
        'fill-color': [
          'match',
          ['get', 'category'],
          'Continente', '#2491ff',
          'País', '#dfe1e2',
          '#6a76bd'
        ],
        'fill-opacity': 0.08
      }
    });

    // Contornos de países y continentes (colores, anchos y opacidad originales); uniones y extremos redondeados
    map.addLayer({
      id: 'zones-line',
      type: 'line',
      source: 'zones-outline',
      layout: { 'line-join': 'round', 'line-cap': 'round' },
      paint: {
        'line-color': [
          'match',
          ['get', 'category'],
          'Continente', 'rgba(36, 145, 255, 0.75)',
          'País', 'rgba(223, 225, 226, 0.45)',
          'rgba(106, 118, 189, 0.55)'
        ],
        'line-width': [
          'interpolate',
          ['linear'],
          ['zoom'],
          1, 0.9,
          4, 1.4,
          7, 2.0
        ],
        'line-opacity': 0.8
      }
    });

    // Capa de hover interactivo al pasar el cursor sobre cualquier país o territorio
    map.addLayer({
      id: 'zones-hover-fill',
      type: 'fill',
      source: 'zones-geojson',
      filter: ['==', ['get', 'id'], ''],
      paint: {
        'fill-color': '#ffffff',
        'fill-opacity': 0.14
      }
    });

    map.addLayer({
      id: 'zones-hover-line',
      type: 'line',
      source: 'zones-outline',
      filter: ['==', ['get', 'id'], ''],
      layout: { 'line-join': 'round', 'line-cap': 'round' },
      paint: {
        'line-color': '#ffffff',
        'line-width': 2.0,
        'line-opacity': 0.9
      }
    });

    map.addLayer({
      id: 'zones-highlight-fill',
      type: 'fill',
      source: 'zones-geojson',
      filter: ['==', ['get', 'id'], selectedZoneRef.current ? selectedZoneRef.current.id : ''],
      paint: {
        // Selección = amarillo neón de la marca
        'fill-color': '#e7f434',
        'fill-opacity': 0.2
      }
    });

    map.addLayer({
      id: 'zones-highlight-line',
      type: 'line',
      source: 'zones-outline',
      filter: ['==', ['get', 'id'], selectedZoneRef.current ? selectedZoneRef.current.id : ''],
      layout: { 'line-join': 'round', 'line-cap': 'round' },
      paint: {
        'line-color': '#e7f434',
        'line-width': 3,
        'line-opacity': 1.0
      }
    });
  };

  // Capas para el trazado de dibujo manual (polígono, líneas guía y vértices)
  const setupDrawLayers = (map) => {
    if (!map) return;
    if (map.getLayer('draw-points')) map.removeLayer('draw-points');
    if (map.getLayer('draw-line')) map.removeLayer('draw-line');
    if (map.getLayer('draw-fill')) map.removeLayer('draw-fill');
    if (map.getSource('draw-source')) map.removeSource('draw-source');

    map.addSource('draw-source', {
      type: 'geojson',
      data: {
        type: 'FeatureCollection',
        features: []
      }
    });

    map.addLayer({
      id: 'draw-fill',
      type: 'fill',
      source: 'draw-source',
      filter: ['==', '$type', 'Polygon'],
      paint: {
        'fill-color': '#e7f434',
        'fill-opacity': 0.2
      }
    });

    map.addLayer({
      id: 'draw-line',
      type: 'line',
      source: 'draw-source',
      filter: ['any', ['==', '$type', 'Polygon'], ['==', '$type', 'LineString']],
      paint: {
        'line-color': '#e7f434',
        'line-width': 2.8,
        'line-dasharray': [2, 1]
      }
    });

    map.addLayer({
      id: 'draw-points',
      type: 'circle',
      source: 'draw-source',
      filter: ['==', ['get', 'type'], 'vertex'],
      paint: {
        'circle-radius': [
          'case',
          ['get', 'isFirst'],
          7,
          5
        ],
        'circle-color': [
          'case',
          ['get', 'isFirst'],
          '#4fd1a1',
          '#e7f434'
        ],
        'circle-stroke-width': 2.5,
        'circle-stroke-color': '#151622'
      }
    });
  };

  // Configuración integral tras carga de cualquier estilo cartográfico
  const applyMapConfiguration = (map) => {
    if (!map) return;

    // 1. Reaplicar proyección deseada (evita que setStyle devuelva el mapa a mercator plano)
    try {
      map.setProjection(projectionRef.current);
    } catch (e) {
      console.warn('Set projection error on style load:', e);
    }

    // 2. Reaplicar atmósfera o limpiar según corresponda
    if (projectionRef.current === 'globe') {
      applyAtmosphereAndFog(map);
    } else {
      try {
        map.setFog(null);
      } catch {
        // no-op
      }
    }

    // 2b. Restricciones del mapa plano (sin rotación, un solo mundo) o libres en el globo
    applyFlatConstraints(map, projectionRef.current === 'mercator');

    // 3. Configurar relieve 3D de terreno (montañas y valles)
    applyTerrain(map);

    // 3b. Etiquetas del mapa en el idioma activo (el estilo nuevo trae sus textos originales)
    labelOriginalsRef.current = new Map();
    applyMapLanguage(map);

    // 4. Recrear capas de zonas y dibujo con protección de errores
    try {
      setupZoneLayers(map);
    } catch (err) {
      console.warn('Error setting up zone layers:', err);
    }

    try {
      setupDrawLayers(map);
    } catch (err) {
      console.warn('Error setting up draw layers:', err);
    }

    try {
      renderZoneMarkers(map);
    } catch (err) {
      console.warn('Error rendering zone markers:', err);
    }

    // 4. Restaurar trazado manual si existía
    if (drawnAreaRef.current && drawnAreaRef.current.coords) {
      try {
        updateDrawSource(drawnAreaRef.current.coords);
      } catch (err) {
        console.warn('Error updating draw source:', err);
      }
    }

    // 5. Restaurar pin y resaltado de zona seleccionada si existía
    if (selectedZoneRef.current) {
      try {
        renderSelectedZoneMarker(map, selectedZoneRef.current);
        if (map.getLayer('zones-highlight-fill')) {
          map.setFilter('zones-highlight-fill', ['==', ['get', 'id'], selectedZoneRef.current.id]);
        }
        if (map.getLayer('zones-highlight-line')) {
          map.setFilter('zones-highlight-line', ['==', ['get', 'id'], selectedZoneRef.current.id]);
        }
      } catch (err) {
        console.warn('Error rendering selected zone highlight:', err);
      }
    }
  };

  // Inicialización de Mapbox GL
  useEffect(() => {
    if (!mapContainerRef.current) return;
    if (!token) {
      if (onMapError) {
        onMapError(t('errorToast.missingToken'));
      }
      return;
    }

    mapboxgl.accessToken = token;

    try {
      const map = new mapboxgl.Map({
        container: mapContainerRef.current,
        style: styleUrl,
        center: [0, 20],
        zoom: 1.6,
        projection: projection,
        pitch: isTilted ? 55 : 0,
        bearing: 0,
        maxPitch: 85,
        attributionControl: true
      });

      mapRef.current = map;

      // Observer para reaccionar a cambios de dimensiones del contenedor en el DOM
      let resizeObserver = null;
      if (typeof ResizeObserver !== 'undefined' && mapContainerRef.current) {
        resizeObserver = new ResizeObserver(() => {
          if (mapRef.current) {
            mapRef.current.resize();
          }
        });
        resizeObserver.observe(mapContainerRef.current);
      }

      // En el mapa plano el rumbo siempre es norte arriba
      map.on('rotate', () => {
        if (projectionRef.current === 'mercator' && map.getBearing() !== 0) map.setBearing(0);
      });

      // Eventos de error de token o red
      map.on('error', (e) => {
        console.warn('Mapbox error:', e);
        if (
          e &&
          e.error &&
          (e.error.status === 401 ||
            e.error.message?.includes('token') ||
            e.error.message?.includes('Forbidden') ||
            e.error.message?.includes('Unauthorized'))
        ) {
          if (onMapError) onMapError(e.error.message || t('errorToast.invalidToken'));
        }
      });

      // Configurar atmósfera, capas y marcadores al cargar cualquier estilo (inicial o cambiado)
      map.on('style.load', () => {
        applyMapConfiguration(map);
        map.resize();
      });

      // Evento de carga completa de tiles y recursos iniciales
      map.on('load', () => {
        mapLoadedRef.current = true;
        setIsMapLoaded(true);
        map.resize();

        // Si por sincronía no se hubieran cargado las capas, asegurar su configuración
        if (!map.getLayer('zones-fill')) {
          applyMapConfiguration(map);
        }

        // Breve pausa para asentar texturas y shaders antes de habilitar la rotación continua
        if (initialSpinTimeoutRef.current) clearTimeout(initialSpinTimeoutRef.current);
        initialSpinTimeoutRef.current = setTimeout(() => {
          canAutoSpinRef.current = true;
          if (mapRef.current) {
            mapRef.current.resize();
          }
        }, 1200);
      });

      // Si tras cargar el estilo falta el terreno 3D (el orden de los eventos cambia con el navegador y la red), se vuelve a
      // aplicar al entrar en reposo, con un tope de intentos. Silencioso: no muestra nada.
      let terrainRetries = 0;
      map.on('idle', () => {
        const id = currentStyleIdRef.current;
        if (id !== 'outdoors' && id !== 'satellite') {
          terrainRetries = 0;
          return;
        }
        if (map.isStyleLoaded() && !map.getTerrain() && terrainRetries < 5) {
          terrainRetries += 1;
          applyTerrain(map);
        }
      });

      // Asegurar redimensionamiento al entrar en reposo
      map.once('idle', () => {
        if (mapRef.current) {
          mapRef.current.resize();
        }
      });

      // Forzar resize en frames clave para neutralizar desalineaciones del layout al montar
      const rAF = requestAnimationFrame(() => {
        if (mapRef.current) mapRef.current.resize();
      });
      const t1 = setTimeout(() => { if (mapRef.current) mapRef.current.resize(); }, 150);
      const t2 = setTimeout(() => { if (mapRef.current) mapRef.current.resize(); }, 500);
      const t3 = setTimeout(() => { if (mapRef.current) mapRef.current.resize(); }, 1200);

      // Selección de zonas por clic o colocación de vértices en modo polígono
      map.on('click', (e) => {
        if (drawModeRef.current === 'polygon') {
          const clickedPt = [e.lngLat.lng, e.lngLat.lat];
          const pts = polygonPointsRef.current;

          // Si ya hay al menos 3 vértices y se hace clic sobre/cerca del primer vértice, cerrar polígono
          if (pts.length >= 3) {
            const firstPtScreen = map.project(pts[0]);
            const distPixels = Math.hypot(e.point.x - firstPtScreen.x, e.point.y - firstPtScreen.y);
            if (distPixels < 25) {
              completePolygon(pts);
              return;
            }
          }

          // Añadir nuevo vértice
          pts.push(clickedPt);
          if (onDrawPointsChange) onDrawPointsChange(pts.length);

          if (pts.length >= 3) {
            updateDrawSource([...pts, pts[0]], pts);
          } else if (pts.length === 2) {
            updateDrawSource(pts, pts);
          } else {
            updateDrawSource(null, pts);
          }
          return;
        }

        if (drawModeRef.current) return;

        if (!map.getLayer('zones-fill')) return;

        const picked = pickZoneFeature(map.queryRenderedFeatures(e.point, { layers: ['zones-fill'] }));
        if (picked) {
          const found = ZONES.find((z) => z.id === picked.properties.id);
          if (found) {
            onSelectZoneRef.current(found);
          }
        }
      });

      // Doble clic para finalizar polígono por vértices
      map.on('dblclick', (e) => {
        if (drawModeRef.current === 'polygon') {
          e.preventDefault();
          if (polygonPointsRef.current.length >= 3) {
            completePolygon(polygonPointsRef.current);
          }
        }
      });

      // --- GESTIÓN DE EVENTOS DE DIBUJO Y NAVEGACIÓN ---
      map.on('mousedown', (e) => {
        handleInteractionStart();
        if (drawModeRef.current === 'freehand' || drawModeRef.current === 'rectangle') {
          isDrawingRef.current = true;
          const point = [e.lngLat.lng, e.lngLat.lat];
          if (drawModeRef.current === 'freehand') {
            drawPointsRef.current = [point];
          } else if (drawModeRef.current === 'rectangle') {
            rectangleStartRef.current = point;
          }
        }
      });

      map.on('touchstart', (e) => {
        handleInteractionStart();
        if (
          (drawModeRef.current === 'freehand' || drawModeRef.current === 'rectangle') &&
          e.lngLat
        ) {
          isDrawingRef.current = true;
          const point = [e.lngLat.lng, e.lngLat.lat];
          if (drawModeRef.current === 'freehand') {
            drawPointsRef.current = [point];
          } else if (drawModeRef.current === 'rectangle') {
            rectangleStartRef.current = point;
          }
        }
      });

      map.on('dragstart', handleInteractionStart);
      map.on('rotatestart', handleInteractionStart);
      map.on('pitchstart', handleInteractionStart);
      map.on('wheel', handleInteractionStart);
      map.on('boxzoomstart', handleInteractionStart);

      map.on('mousemove', (e) => {
        // Previsualización elástica dinámica para modo polígono por vértices
        if (drawModeRef.current === 'polygon') {
          const pts = polygonPointsRef.current;
          if (pts.length > 0) {
            const currentPt = [e.lngLat.lng, e.lngLat.lat];
            if (pts.length === 1) {
              updateDrawSource([pts[0], currentPt], pts);
            } else if (pts.length >= 2) {
              updateDrawSource([...pts, currentPt, pts[0]], pts);
            }
          }

          // Si el cursor está cerca del primer vértice (verde), mostrar cursor puntero de cierre
          if (pts.length >= 3) {
            const firstPtScreen = map.project(pts[0]);
            const dist = Math.hypot(e.point.x - firstPtScreen.x, e.point.y - firstPtScreen.y);
            map.getCanvas().style.cursor = dist < 25 ? 'pointer' : 'crosshair';
          } else {
            map.getCanvas().style.cursor = 'crosshair';
          }
        }

        // Modo dibujo libre y rectángulo activo
        if (drawModeRef.current && isDrawingRef.current) {
          if (drawModeRef.current === 'freehand') {
            const pts = drawPointsRef.current;
            const last = pts[pts.length - 1];
            const dist = Math.hypot(e.lngLat.lng - last[0], e.lngLat.lat - last[1]);
            if (dist > 0.04) {
              pts.push([e.lngLat.lng, e.lngLat.lat]);
              if (pts.length >= 3) {
                updateDrawSource([...pts, pts[0]]);
              }
            }
          } else if (drawModeRef.current === 'rectangle') {
            const s = rectangleStartRef.current;
            if (s) {
              const cLng = e.lngLat.lng;
              const cLat = e.lngLat.lat;
              const rectCoords = [
                [s[0], s[1]],
                [cLng, s[1]],
                [cLng, cLat],
                [s[0], cLat],
                [s[0], s[1]]
              ];
              updateDrawSource(rectCoords);
            }
          }
        }

        // Puntero y realce interactivo al posar el cursor sobre cualquier país
        if (!drawModeRef.current && map.getLayer('zones-fill')) {
          const picked = pickZoneFeature(map.queryRenderedFeatures(e.point, { layers: ['zones-fill'] }));
          const hoverId = picked ? picked.properties.id : '';
          map.getCanvas().style.cursor = hoverId ? 'pointer' : '';
          showHoverLabel(map, e.lngLat, hoverId);

          if (hoverId !== hoveredZoneIdRef.current) {
            hoveredZoneIdRef.current = hoverId;
            if (map.getLayer('zones-hover-fill')) {
              map.setFilter('zones-hover-fill', ['==', ['get', 'id'], hoverId]);
            }
            if (map.getLayer('zones-hover-line')) {
              map.setFilter('zones-hover-line', ['==', ['get', 'id'], hoverId]);
            }
          }
        }

        // Actualizar HUD
        if (onUpdateHUD) {
          onUpdateHUD({
            cursorCoords: { lat: e.lngLat.lat, lng: e.lngLat.lng },
            zoom: map.getZoom(),
            pitch: map.getPitch(),
            bearing: map.getBearing()
          });
        }
      });

      map.on('mouseleave', () => {
        if (hoverPopupRef.current) hoverPopupRef.current.remove();
        if (hoveredZoneIdRef.current) {
          hoveredZoneIdRef.current = '';
          if (map.getLayer('zones-hover-fill')) {
            map.setFilter('zones-hover-fill', ['==', ['get', 'id'], '']);
          }
          if (map.getLayer('zones-hover-line')) {
            map.setFilter('zones-hover-line', ['==', ['get', 'id'], '']);
          }
        }
      });

      map.on('mouseup', (e) => {
        if (drawModeRef.current && isDrawingRef.current) {
          isDrawingRef.current = false;
          handleInteractionEnd();

          let finalCoords = null;
          if (drawModeRef.current === 'freehand') {
            const pts = drawPointsRef.current;
            if (pts.length >= 3) {
              finalCoords = [...pts, pts[0]];
            }
          } else if (drawModeRef.current === 'rectangle') {
            const s = rectangleStartRef.current;
            if (s) {
              const cLng = e.lngLat.lng;
              const cLat = e.lngLat.lat;
              if (Math.abs(cLng - s[0]) > 0.05 && Math.abs(cLat - s[1]) > 0.05) {
                finalCoords = [
                  [s[0], s[1]],
                  [cLng, s[1]],
                  [cLng, cLat],
                  [s[0], cLat],
                  [s[0], s[1]]
                ];
              }
            }
          }

          if (finalCoords) {
            updateDrawSource(finalCoords);
            const area = calculatePolygonArea(finalCoords);
            const perimeter = calculatePolygonPerimeter(finalCoords);
            const bounds = getPolygonBoundsAndCenter(finalCoords);
            const coveredCountries = findCoveredCountries(finalCoords);

            if (onFinishDrawing) {
              onFinishDrawing({
                type: drawModeRef.current,
                coords: finalCoords,
                area,
                perimeter,
                bounds,
                center: bounds ? bounds.center : [0, 0],
                coveredCountries
              });
            }
          }
          return;
        }

        handleInteractionEnd();
      });

      map.on('touchend', () => {
        isDrawingRef.current = false;
        handleInteractionEnd();
      });

      map.on('touchcancel', () => {
        isDrawingRef.current = false;
        handleInteractionEnd();
      });

      map.on('dragend', handleInteractionEnd);
      map.on('rotateend', handleInteractionEnd);
      map.on('pitchend', handleInteractionEnd);
      map.on('zoomend', handleInteractionEnd);
      map.on('boxzoomend', handleInteractionEnd);

      map.on('moveend', () => {
        if (userInteractingRef.current) {
          handleInteractionEnd();
        }
      });

      map.on('zoom', () => {
        if (onUpdateHUD) {
          onUpdateHUD({
            zoom: map.getZoom(),
            pitch: map.getPitch(),
            bearing: map.getBearing()
          });
        }
      });

      map.on('pitch', () => {
        if (onUpdateHUD) {
          onUpdateHUD({
            pitch: map.getPitch(),
            bearing: map.getBearing()
          });
        }
      });

      // Eventos globales en ventana para capturar soltados de ratón fuera del canvas
      const handleGlobalPointerUp = () => {
        if (userInteractingRef.current && !isDrawingRef.current) {
          handleInteractionEnd();
        }
      };

      window.addEventListener('mouseup', handleGlobalPointerUp);
      window.addEventListener('touchend', handleGlobalPointerUp);

      // Bucle de animación suave (Auto-rotación y Modo Órbita)
      let lastTime = performance.now();
      const animateLoop = (now) => {
        const delta = Math.min((now - lastTime) / 1000, 0.1);
        lastTime = now;

        if (mapRef.current && mapLoadedRef.current) {
          // Órbita cinematográfica alrededor de la zona seleccionada
          if (orbitActiveRef.current && selectedZoneRef.current) {
            orbitBearingRef.current = (orbitBearingRef.current + 12 * delta) % 360;
            const targetCoords = selectedZoneRef.current.coords;
            mapRef.current.easeTo({
              center: targetCoords,
              bearing: orbitBearingRef.current,
              pitch: 62,
              duration: 0,
              easing: (t) => t
            });
          }
          // Rotación majestuosa continua del globo (solo si ya cargó, superó la pausa inicial y no hay interacción)
          else if (
            autoSpinActiveRef.current &&
            canAutoSpinRef.current &&
            !userInteractingRef.current &&
            !drawModeRef.current &&
            !selectedZoneRef.current &&
            !drawnAreaRef.current &&
            projectionRef.current === 'globe'
          ) {
            const currentZoom = mapRef.current.getZoom();
            if (currentZoom < 6) {
              const degreesPerSecond = 3.0;
              const center = mapRef.current.getCenter();
              let newLng = center.lng - degreesPerSecond * delta;
              // Normalizar longitud para que se mantenga en el rango [-180, 180]
              while (newLng < -180) newLng += 360;
              while (newLng > 180) newLng -= 360;
              center.lng = newLng;
              mapRef.current.setCenter(center);
            }
          }
        }

        animFrameRef.current = requestAnimationFrame(animateLoop);
      };

      animFrameRef.current = requestAnimationFrame(animateLoop);

      return () => {
        if (resizeObserver) resizeObserver.disconnect();
        cancelAnimationFrame(rAF);
        clearTimeout(t1);
        clearTimeout(t2);
        clearTimeout(t3);
        if (initialSpinTimeoutRef.current) clearTimeout(initialSpinTimeoutRef.current);
        window.removeEventListener('mouseup', handleGlobalPointerUp);
        window.removeEventListener('touchend', handleGlobalPointerUp);
        if (spinResumeTimeoutRef.current) clearTimeout(spinResumeTimeoutRef.current);
        if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
        clearMarkers();
        map.remove();
        mapRef.current = null;
      };
    } catch (err) {
      console.error('Error inicializando Mapbox:', err);
      if (onMapError) onMapError(err.message);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  // Cambiar estilo de cartografía de manera reactiva (solo si cambia tras el montaje)
  useEffect(() => {
    if (prevStyleUrlRef.current === styleUrl) return;
    prevStyleUrlRef.current = styleUrl;
    if (mapRef.current) {
      mapRef.current.setStyle(styleUrl);
      const isTopography = currentStyleId === 'outdoors' || (styleUrl && styleUrl.includes('outdoors'));
      if (isTopography && projectionRef.current !== 'mercator' && mapRef.current.getPitch() < 35) {
        mapRef.current.easeTo({ pitch: 58, duration: 1200 });
      }
    }
  }, [styleUrl, currentStyleId]);

  // Cambiar proyección entre Globo 3D y Mercator 2D (solo si cambia tras el montaje)
  useEffect(() => {
    if (prevProjectionRef.current === projection) return;
    prevProjectionRef.current = projection;
    projectionRef.current = projection;
    if (!mapRef.current) return;

    const updateProjection = () => {
      try {
        mapRef.current.setProjection(projection);
        applyFlatConstraints(mapRef.current, projection === 'mercator');
        if (projection === 'globe') {
          applyAtmosphereAndFog(mapRef.current);
          if (isTilted) {
            mapRef.current.easeTo({ pitch: 55, duration: 600 });
          }
        } else {
          try {
            mapRef.current.setFog(null);
          } catch {
            // no-op
          }
        }
        mapRef.current.resize();
      } catch (err) {
        console.warn('Error setting projection:', err);
      }
    };

    // Se aplica de inmediato: `isStyleLoaded()` es falso mientras se cargan teselas y entonces 'style.load' ya no volvía a llegar,
    // así que el cambio a 2D no se hacía si se pulsaba justo al cargar. Si el estilo aún no está listo, se repite al cargarlo.
    updateProjection();
    if (!mapRef.current.isStyleLoaded()) {
      mapRef.current.once('style.load', updateProjection);
    }
  }, [projection, isTilted, applyAtmosphereAndFog]);

  // Cambiar inclinación (solo si cambia tras el montaje)
  useEffect(() => {
    if (prevTiltedRef.current === isTilted) return;
    prevTiltedRef.current = isTilted;
    if (mapRef.current && mapLoadedRef.current) {
      mapRef.current.easeTo({
        pitch: isTilted ? 55 : 0,
        duration: 900
      });
    }
  }, [isTilted]);

  // Vuelo y selección de zona
  useEffect(() => {
    if (prevSelectedZoneRef.current === selectedZone && !selectedZone) return;
    prevSelectedZoneRef.current = selectedZone;
    selectedZoneRef.current = selectedZone;
    if (!mapRef.current) return;

    if (selectedMarkerRef.current) {
      selectedMarkerRef.current.remove();
      selectedMarkerRef.current = null;
    }

    if (selectedZone) {
      mapRef.current.flyTo({
        center: selectedZone.coords,
        zoom: selectedZone.zoom || 4,
        pitch: projectionRef.current === 'mercator' ? 0 : selectedZone.pitch || 45,
        bearing: projectionRef.current === 'mercator' ? 0 : selectedZone.bearing || 0,
        essential: true,
        duration: FLY_MS,
        curve: FLY_CURVE
      });
      trackFlight(mapRef.current);
      // Avisar cuando la cámara se detiene (o la interrumpe el usuario): ahí aparece el panel de información
      mapRef.current.once('moveend', () => {
        if (onCameraSettledRef.current) onCameraSettledRef.current();
      });

      renderSelectedZoneMarker(mapRef.current, selectedZone);

      if (mapRef.current.isStyleLoaded()) {
        if (mapRef.current.getLayer('zones-highlight-fill')) {
          mapRef.current.setFilter('zones-highlight-fill', ['==', ['get', 'id'], selectedZone.id]);
        }
        if (mapRef.current.getLayer('zones-highlight-line')) {
          mapRef.current.setFilter('zones-highlight-line', ['==', ['get', 'id'], selectedZone.id]);
        }
      }
    } else {
      if (mapRef.current.isStyleLoaded()) {
        if (mapRef.current.getLayer('zones-highlight-fill')) {
          mapRef.current.setFilter('zones-highlight-fill', ['==', ['get', 'id'], '']);
        }
        if (mapRef.current.getLayer('zones-highlight-line')) {
          mapRef.current.setFilter('zones-highlight-line', ['==', ['get', 'id'], '']);
        }
      }
    }
  }, [selectedZone]);

  return (
    <div className="globe-viewport">
      <div ref={mapContainerRef} className="mapbox-map-container" />
      {Boolean(token) && !isMapLoaded && (
        <div className="globe-loading-overlay">
          <div className="globe-loading-spinner" />
          <span className="globe-loading-text">
            {lang === 'es' ? 'Cargando cartografía satelital...' : 'Loading satellite cartography...'}
          </span>
        </div>
      )}
    </div>
  );
});

export default Globe;
