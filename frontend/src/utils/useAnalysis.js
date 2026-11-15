import { useEffect, useMemo, useState } from 'react';
import worldZones from '../data/worldZonesGeoJSON.json';
import { buildDemoAnalysis } from './demoAnalysis';
import { adaptSearchResponse } from './searchAdapter';

// URL del backend (por ejemplo http://localhost:8000). Sin ella el panel sigue con los datos de demostración.
export const API_URL = (import.meta.env.VITE_API_URL || '').replace(/\/$/, '');

const closeRing = (coords) => {
  const first = coords[0];
  const last = coords[coords.length - 1];
  return first[0] === last[0] && first[1] === last[1] ? coords : [...coords, first];
};

// Geometría GeoJSON (lon/lat) de lo que el usuario eligió: el área trazada o el país; el continente usa su polígono aproximado.
export function geometryFor(zone, drawnArea) {
  if (drawnArea?.coords?.length >= 3) return { type: 'Polygon', coordinates: [closeRing(drawnArea.coords)] };
  if (!zone) return null;
  const feature = worldZones.features.find((f) => f.id === zone.id || f.properties?.id === zone.id);
  if (feature) return feature.geometry;
  if (zone.polygon?.length >= 3) return { type: 'Polygon', coordinates: [closeRing(zone.polygon)] };
  return null;
}

// Respuestas ya pedidas, por geometría: las pestañas Análisis y Predicción usan la misma llamada y volver a una zona es inmediato.
const CACHE_SIZE = 8;
const cache = new Map();
const cacheGet = (key) => {
  const hit = cache.get(key);
  if (hit) {
    cache.delete(key); // se vuelve a insertar al final: los más recientes se quedan
    cache.set(key, hit);
  }
  return hit;
};
const cachePut = (key, value) => {
  cache.set(key, value);
  if (cache.size > CACHE_SIZE) cache.delete(cache.keys().next().value);
};

// Estado del análisis: 'demo' | 'loading' | 'ready' | 'nodata' | 'error' y los datos con la forma que usa AnalysisView.
export function useAnalysis(zone, drawnArea, seed) {
  const demo = useMemo(() => (API_URL ? null : buildDemoAnalysis(seed)), [seed]);
  const geometry = useMemo(() => (API_URL ? geometryFor(zone, drawnArea) : null), [zone, drawnArea]);
  const cacheKey = useMemo(() => (geometry ? JSON.stringify(geometry) : null), [geometry]);
  // El resultado se guarda junto con la geometría que lo originó: si ya no coincide, sigue "cargando"
  const [result, setResult] = useState({ geometry: null, status: 'loading', data: null });

  useEffect(() => {
    if (!API_URL || !geometry) return undefined;
    if (cacheGet(cacheKey)) return undefined; // ya se pidió: se lee al renderizar
    const controller = new AbortController();
    fetch(`${API_URL}/api/search`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ geojson: geometry }),
      signal: controller.signal
    })
      .then((response) => {
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        return response.json();
      })
      .then((json) => {
        const data = adaptSearchResponse(json);
        // Fuera de la cobertura (hoy Argentina y Chile) no hay celdas con datos: se avisa, no se muestra una serie en cero
        const next = data && json.kpis?.n_cells_with_fire > 0 ? { status: 'ready', data } : { status: 'nodata', data: null };
        cachePut(cacheKey, next);
        setResult({ geometry, ...next });
      })
      .catch((error) => {
        if (error.name !== 'AbortError') setResult({ geometry, status: 'error', data: null });
      });
    return () => controller.abort();
  }, [geometry, cacheKey]);

  if (!API_URL) return { status: 'demo', data: demo };
  if (!geometry) return { status: 'nodata', data: null };
  const cached = cacheGet(cacheKey);
  if (cached) return cached;
  return result.geometry === geometry ? result : { status: 'loading', data: null };
}
