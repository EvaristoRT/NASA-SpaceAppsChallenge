import React, { useEffect, useRef, forwardRef, useImperativeHandle } from 'react';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import { ZONES } from '../data/zonesData';
import { generateZonesGeoJSON } from '../utils/geoUtils';

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
  const userInteractingRef = useRef(false);
  const autoSpinActiveRef = useRef(autoSpin);
  const orbitActiveRef = useRef(orbitMode);
  const selectedZoneRef = useRef(selectedZone);
  const orbitBearingRef = useRef(0);

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
    }
  }));

  // Mantener referencias sincronizadas para la animación
  useEffect(() => {
    autoSpinActiveRef.current = autoSpin;
  }, [autoSpin]);

  useEffect(() => {
    orbitActiveRef.current = orbitMode;
  }, [orbitMode]);

  useEffect(() => {
    selectedZoneRef.current = selectedZone;
  }, [selectedZone]);

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

      // Configurar atmósfera y capas al cargar estilo
      map.on('style.load', () => {
        applyAtmosphereAndFog(map);
        setupZoneLayers(map);
        renderZoneMarkers(map);
      });

      // Detectar interacciones directas del usuario
      const startInteract = () => { userInteractingRef.current = true; };
      const endInteract = () => { userInteractingRef.current = false; };

      map.on('mousedown', startInteract);
      map.on('dragstart', startInteract);
      map.on('touchstart', startInteract);

      map.on('mouseup', endInteract);
      map.on('touchend', endInteract);
      map.on('moveend', endInteract);

      // Actualizar el HUD en tiempo real
      map.on('mousemove', (e) => {
        if (onUpdateHUD) {
          onUpdateHUD({
            cursorCoords: { lat: e.lngLat.lat, lng: e.lngLat.lng },
            zoom: map.getZoom(),
            pitch: map.getPitch(),
            bearing: map.getBearing()
          });
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

      // Bucle de animación suave (Auto-rotación y Modo Órbita)
      let lastTime = performance.now();
      const animateLoop = (now) => {
        const delta = (now - lastTime) / 1000;
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
          // Rotación majestuosa continua del globo terráqueo
          else if (autoSpinActiveRef.current && !userInteractingRef.current) {
            const currentZoom = mapRef.current.getZoom();
            if (currentZoom < 5) {
              const degreesPerSecond = 3.5;
              const center = mapRef.current.getCenter();
              center.lng -= degreesPerSecond * delta;
              mapRef.current.setCenter(center);
            }
          }
        }

        animFrameRef.current = requestAnimationFrame(animateLoop);
      };

      animFrameRef.current = requestAnimationFrame(animateLoop);

      return () => {
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

  // Cambiar proyección entre Globo 3D y Mercator 2D
  useEffect(() => {
    if (mapRef.current && mapRef.current.isStyleLoaded()) {
      mapRef.current.setProjection(projection);
    }
  }, [projection]);

  // Cambiar estilo de cartografía
  useEffect(() => {
    if (mapRef.current) {
      mapRef.current.setStyle(styleUrl);
      mapRef.current.once('style.load', () => {
        applyAtmosphereAndFog(mapRef.current);
        setupZoneLayers(mapRef.current);
        renderZoneMarkers(mapRef.current);
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [styleUrl]);

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
    if (!mapRef.current) return;

    // Limpiar marcador activo anterior
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

      // Añadir marcador destacado para el país/zona seleccionado
      const el = document.createElement('div');
      el.className = 'custom-zone-marker selected-active-marker';
      el.innerHTML = `
        <div class="marker-pin active-pin">
          <span class="marker-icon">${selectedZone.icon || '📍'}</span>
        </div>
        <div class="marker-label">${selectedZone.name}</div>
      `;
      const marker = new mapboxgl.Marker({
        element: el,
        anchor: 'bottom'
      })
        .setLngLat(selectedZone.coords)
        .addTo(mapRef.current);

      selectedMarkerRef.current = marker;

      // Actualizar filtros de resaltado
      if (mapRef.current.getLayer('zones-highlight-fill')) {
        mapRef.current.setFilter('zones-highlight-fill', ['==', ['get', 'id'], selectedZone.id]);
      }
      if (mapRef.current.getLayer('zones-highlight-line')) {
        mapRef.current.setFilter('zones-highlight-line', ['==', ['get', 'id'], selectedZone.id]);
      }
    } else {
      if (mapRef.current.getLayer('zones-highlight-fill')) {
        mapRef.current.setFilter('zones-highlight-fill', ['==', ['get', 'id'], '']);
      }
      if (mapRef.current.getLayer('zones-highlight-line')) {
        mapRef.current.setFilter('zones-highlight-line', ['==', ['get', 'id'], '']);
      }
    }
  }, [selectedZone]);

  // Atmósfera y estrellas espaciales
  const applyAtmosphereAndFog = (map) => {
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

  // Capas poligonales interactivas
  const setupZoneLayers = (map) => {
    const geojsonData = generateZonesGeoJSON();

    if (map.getLayer('zones-highlight-line')) map.removeLayer('zones-highlight-line');
    if (map.getLayer('zones-highlight-fill')) map.removeLayer('zones-highlight-fill');
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
        'fill-opacity': 0.12
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
          'Continente', '#38bdf8',
          'País', '#c084fc',
          'Zona Ecológica', '#34d399',
          'Zona Marina', '#22d3ee',
          'Zona Geológica', '#fb923c',
          '#818cf8'
        ],
        'line-width': 1.8,
        'line-dasharray': [2, 1],
        'line-opacity': 0.7
      }
    });

    map.addLayer({
      id: 'zones-highlight-fill',
      type: 'fill',
      source: 'zones-geojson',
      filter: ['==', ['get', 'id'], selectedZoneRef.current ? selectedZoneRef.current.id : ''],
      paint: {
        'fill-color': '#38bdf8',
        'fill-opacity': 0.28
      }
    });

    map.addLayer({
      id: 'zones-highlight-line',
      type: 'line',
      source: 'zones-geojson',
      filter: ['==', ['get', 'id'], selectedZoneRef.current ? selectedZoneRef.current.id : ''],
      paint: {
        'line-color': '#38bdf8',
        'line-width': 3.5,
        'line-opacity': 1.0
      }
    });

    map.on('mouseenter', 'zones-fill', () => {
      map.getCanvas().style.cursor = 'pointer';
    });
    map.on('mouseleave', 'zones-fill', () => {
      map.getCanvas().style.cursor = '';
    });

    map.on('click', 'zones-fill', (e) => {
      if (e.features && e.features.length > 0) {
        const featureId = e.features[0].properties.id;
        const found = ZONES.find((z) => z.id === featureId);
        if (found) {
          onSelectZone(found);
        }
      }
    });
  };

  const clearMarkers = () => {
    markersRef.current.forEach((marker) => marker.remove());
    markersRef.current = [];
    if (selectedMarkerRef.current) {
      selectedMarkerRef.current.remove();
      selectedMarkerRef.current = null;
    }
  };

  const renderZoneMarkers = (map) => {
    clearMarkers();

    // Renderizar marcadores de referencia principales (continentes y maravillas naturales)
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

  return (
    <div className="globe-viewport">
      <div ref={mapContainerRef} className="mapbox-map-container" />
    </div>
  );
});

export default Globe;
