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
    onMapError
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
          duration: 2000
        });
      }
    },
    deepZoom: (zone) => {
      if (mapRef.current && zone) {
        mapRef.current.flyTo({
          center: zone.coords,
          zoom: Math.min((zone.zoom || 4) + 3.5, 14),
          pitch: 68,
          bearing: (zone.bearing || 0) + 25,
          duration: 2500,
          curve: 1.4,
          speed: 1.1
        });
      }
    },
    focusArea: (bounds) => {
      if (mapRef.current && bounds) {
        mapRef.current.fitBounds(
          [
            [bounds.minLng, bounds.minLat],
            [bounds.maxLng, bounds.maxLat]
          ],
          { padding: 100, duration: 2200, maxZoom: 8 }
        );
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
        const exaggeration = isTopography ? 1.95 : 1.35;
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

  // Al cambiar de idioma, volver a dibujar las etiquetas de los continentes
  useEffect(() => {
    if (mapRef.current && markersRef.current.length > 0) renderZoneMarkers(mapRef.current);
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
    if (map.getLayer('zones-line-countries')) map.removeLayer('zones-line-countries');
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

    // Fronteras de los 196 países: finas y casi invisibles de lejos, para que el globo no se llene de líneas; se
    // van marcando al acercarse. Uniones y extremos redondeados para que no se vean quebradas.
    map.addLayer({
      id: 'zones-line-countries',
      type: 'line',
      source: 'zones-outline',
      filter: ['==', ['get', 'category'], 'País'],
      layout: { 'line-join': 'round', 'line-cap': 'round' },
      paint: {
        'line-color': '#dfe1e2',
        'line-width': ['interpolate', ['linear'], ['zoom'], 1, 0.5, 4, 0.9, 7, 1.4],
        'line-opacity': ['interpolate', ['linear'], ['zoom'], 1.5, 0.12, 3.5, 0.3, 6, 0.5]
      }
    });

    // Continentes y zonas especiales: el trazo principal
    map.addLayer({
      id: 'zones-line',
      type: 'line',
      source: 'zones-outline',
      filter: ['!=', ['get', 'category'], 'País'],
      layout: { 'line-join': 'round', 'line-cap': 'round' },
      paint: {
        'line-color': [
          'match',
          ['get', 'category'],
          'Continente', '#2491ff',
          '#6a76bd'
        ],
        'line-width': ['interpolate', ['linear'], ['zoom'], 1, 1, 4, 1.5, 7, 2.2],
        'line-opacity': 0.75
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

    // 3. Configurar relieve 3D de terreno (montañas y valles)
    applyTerrain(map);

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

        const features = map.queryRenderedFeatures(e.point, { layers: ['zones-fill'] });
        if (features && features.length > 0) {
          const featureId = features[0].properties.id;
          const found = ZONES.find((z) => z.id === featureId);
          if (found) {
            onSelectZone(found);
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
          const features = map.queryRenderedFeatures(e.point, { layers: ['zones-fill'] });
          const hoverId = features && features.length > 0 ? features[0].properties.id : '';
          map.getCanvas().style.cursor = hoverId ? 'pointer' : '';

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
      if (isTopography && mapRef.current.getPitch() < 35) {
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
          mapRef.current.easeTo({ pitch: 0, duration: 600 });
        }
        mapRef.current.resize();
      } catch (err) {
        console.warn('Error setting projection:', err);
      }
    };

    if (mapRef.current.isStyleLoaded()) {
      updateProjection();
    } else {
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
        pitch: selectedZone.pitch || 45,
        bearing: selectedZone.bearing || 0,
        essential: true,
        duration: 2500,
        curve: 1.4,
        speed: 1.1
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
