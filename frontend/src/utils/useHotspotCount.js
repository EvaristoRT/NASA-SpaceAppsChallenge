import { useEffect, useMemo, useState } from 'react';
import { API_URL, geometryFor } from './useAnalysis';

// Número de focos (detecciones individuales de FIRMS) dentro de la zona o el área trazada en un mes o un periodo de hasta 12 meses
// (POST /api/hotspots/count). `enabled` es falso en demostración y en servidores sin la carpeta de focos.
// Estado: 'off' | 'loading' | 'ready' | 'error'.
export function useHotspotCount(zone, drawnArea, start, end, enabled) {
  const geometry = useMemo(() => (enabled && API_URL ? geometryFor(zone, drawnArea) : null), [enabled, zone, drawnArea]);
  // El resultado guarda lo que se preguntó: si ya no coincide con lo actual, sigue "cargando"
  const [result, setResult] = useState({ geometry: null, start: null, end: null, status: 'loading', count: null });

  useEffect(() => {
    if (!geometry || !start || !end) return undefined;
    const controller = new AbortController();
    // Una pequeña espera evita una consulta por cada cambio mientras se mueve el periodo
    const timer = setTimeout(() => {
      fetch(`${API_URL}/api/hotspots/count`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ geojson: geometry, start, end }),
        signal: controller.signal
      })
        .then((response) => {
          if (!response.ok) throw new Error(`HTTP ${response.status}`);
          return response.json();
        })
        .then((json) => setResult({ geometry, start, end, status: 'ready', count: json.count }))
        .catch((error) => {
          if (error.name !== 'AbortError') setResult({ geometry, start, end, status: 'error', count: null });
        });
    }, 250);
    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [geometry, start, end]);

  if (!geometry || !start || !end) return { status: 'off', count: null };
  const fresh = result.geometry === geometry && result.start === start && result.end === end;
  return fresh ? { status: result.status, count: result.count } : { status: 'loading', count: null };
}
