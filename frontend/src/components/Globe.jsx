import React, { useEffect, useRef, forwardRef, useImperativeHandle, useCallback } from 'react';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import { ZONES } from '../data/zonesData';
import {
  generateZonesGeoJSON,
  calculatePolygonArea,
  calculatePolygonPerimeter,
  getPolygonBoundsAndCenter,
  findCoveredCountries
} from '../utils/geoUtils';

const Globe = forwardRef(function Globe(
  {
    token,
    styleUrl,
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
  const mapContainerRef = useRef(null);
  const mapRef = useRef(null);
  const markersRef = useRef([]);
  const selectedMarkerRef = useRef(null);
  const animFrameRef = useRef(null);
  const isFirstRender = useRef(true);

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

  // Atmósfera y estrellas espaciales
  const applyAtmosphereAndFog = (map) => {
    if (!map) return;
    try {
      map.setFog({
        range: [0.5, 10],
        color: '#1e293b',
        'high-color': '#0f172a',
        'space-color': '#030712',
        'horizon-blend': 0.03,
        'star-intensity': 0.75
      });
    } catch (e) {
      console.warn('Atmosphere fog notice:', e);
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

  // Marcadores de referencia para continentes y maravillas
  const renderZoneMarkers = (map) => {
    clearMarkers();
    if (!map) return;

    const primaryZones = ZONES.filter(
      (z) => z.category === 'Continente' || z.category.includes('Zona')
    );

    primaryZones.forEach((zone) => {
      const el = document.createElement('div');
      el.className = 'custom-zone-marker';
      el.innerHTML = `
        <div class="marker-pin">
          <span class="marker-icon">${zone.icon || '📍'}</span>
        </div>
        <div class="marker-label">${zone.name}</div>
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
      <div class="marker-pin active-pin">
        <span class="marker-icon">${zone.icon || '📍'}</span>
      </div>
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

    map.addSource('zones-geojson', {
      type: 'geojson',
      data: geojsonData
    });

    map.addLayer({
      id: 'zones-fill',
      type: 'fill',
      source: 'zones-geojson',
      paint: {
        'fill-color': [
          'match',
          ['get', 'category'],
          'Continente', '#38bdf8',
          'País', '#a855f7',
          'Zona Ecológica', '#10b981',
          'Zona Marina', '#06b6d4',
          'Zona Geológica', '#f97316',
          '#6366f1'
        ],
        'fill-opacity': 0.08
      }
    });

    map.addLayer({
      id: 'zones-line',
      type: 'line',
      source: 'zones-geojson',
      paint: {
        'line-color': [
          'match',
          ['get', 'category'],
          'Continente', 'rgba(56, 189, 248, 0.75)',
          'País', 'rgba(168, 85, 247, 0.55)',
          'Zona Ecológica', 'rgba(16, 185, 129, 0.75)',
          'Zona Marina', 'rgba(6, 182, 212, 0.75)',
          'Zona Geológica', 'rgba(249, 115, 22, 0.75)',
          'rgba(99, 102, 241, 0.55)'
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
        'fill-color': '#38bdf8',
        'fill-opacity': 0.18
      }
    });

    map.addLayer({
      id: 'zones-hover-line',
      type: 'line',
      source: 'zones-geojson',
      filter: ['==', ['get', 'id'], ''],
      paint: {
        'line-color': '#38bdf8',
        'line-width': 2.0,
        'line-opacity': 0.95
      }
    });

    map.addLayer({
      id: 'zones-highlight-fill',
      type: 'fill',
      source: 'zones-geojson',
      filter: ['==', ['get', 'id'], selectedZoneRef.current ? selectedZoneRef.current.id : ''],
      paint: {
        'fill-color': '#0ea5e9',
        'fill-opacity': 0.32
      }
    });

    map.addLayer({
      id: 'zones-highlight-line',
      type: 'line',
      source: 'zones-geojson',
      filter: ['==', ['get', 'id'], selectedZoneRef.current ? selectedZoneRef.current.id : ''],
      paint: {
        'line-color': '#38bdf8',
        'line-width': 2.8,
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
        'fill-color': '#f59e0b',
        'fill-opacity': 0.25
      }
    });

    map.addLayer({
      id: 'draw-line',
      type: 'line',
      source: 'draw-source',
      filter: ['any', ['==', '$type', 'Polygon'], ['==', '$type', 'LineString']],
      paint: {
        'line-color': '#fbbf24',
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
          '#10b981',
          '#f59e0b'
        ],
        'circle-stroke-width': 2.5,
        'circle-stroke-color': '#ffffff'
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

    // 3. Recrear capas de zonas y dibujo
    setupZoneLayers(map);
    setupDrawLayers(map);
    renderZoneMarkers(map);

    // 4. Restaurar trazado manual si existía
    if (drawnAreaRef.current && drawnAreaRef.current.coords) {
      updateDrawSource(drawnAreaRef.current.coords);
    }

    // 5. Restaurar pin y resaltado de zona seleccionada si existía
    if (selectedZoneRef.current) {
      renderSelectedZoneMarker(map, selectedZoneRef.current);
      if (map.getLayer('zones-highlight-fill')) {
        map.setFilter('zones-highlight-fill', ['==', ['get', 'id'], selectedZoneRef.current.id]);
      }
      if (map.getLayer('zones-highlight-line')) {
        map.setFilter('zones-highlight-line', ['==', ['get', 'id'], selectedZoneRef.current.id]);
      }
    }
  };

  // Inicialización de Mapbox GL
  useEffect(() => {
    if (!mapContainerRef.current) return;
    if (!token) {
      if (onMapError) {
        onMapError('Mapbox Access Token no configurado. Haz clic en "Configurar Token" para activarlo.');
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
          if (onMapError) onMapError(e.error.message || 'Token no válido o no autorizado.');
        }
      });

      // Configurar atmósfera, capas y marcadores al cargar cualquier estilo (inicial o cambiado)
      map.on('style.load', () => {
        applyMapConfiguration(map);
      });

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

        if (mapRef.current) {
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
          // Rotación majestuosa continua del globo (si está en proyección globo y sin inspección activa)
          else if (
            autoSpinActiveRef.current &&
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

  // Cambiar estilo de cartografía de manera reactiva
  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }
    if (mapRef.current) {
      mapRef.current.setStyle(styleUrl);
    }
  }, [styleUrl]);

  // Cambiar proyección entre Globo 3D y Mercator 2D
  useEffect(() => {
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
      } catch (err) {
        console.warn('Error setting projection:', err);
      }
    };

    if (mapRef.current.isStyleLoaded()) {
      updateProjection();
    } else {
      mapRef.current.once('style.load', updateProjection);
    }
  }, [projection, isTilted]);

  // Cambiar inclinación
  useEffect(() => {
    if (mapRef.current) {
      mapRef.current.easeTo({
        pitch: isTilted ? 55 : 0,
        duration: 900
      });
    }
  }, [isTilted]);

  // Vuelo y selección de zona
  useEffect(() => {
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
    </div>
  );
});

export default Globe;
