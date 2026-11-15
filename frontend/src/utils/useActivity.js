import { useEffect, useMemo, useState } from 'react';
import { API_URL, geometryFor } from './useAnalysis';

// Hexágonos con fuego de un mes dentro de la zona o el área elegida (POST /api/activity).
// month = { year, month (0-11) } o null. Estados: 'idle' | 'loading' | 'ready' | 'empty' | 'error'.
export function useActivity(zone, drawnArea, month) {
  const monthKey = month ? `${month.year}-${String(month.month + 1).padStart(2, '0')}` : null;
  const geometry = useMemo(() => (API_URL && monthKey ? geometryFor(zone, drawnArea) : null), [zone, drawnArea, monthKey]);
  // El resultado se guarda con lo que lo originó: si ya no coincide con lo pedido, sigue "cargando"
  const [result, setResult] = useState({ geometry: null, monthKey: null, status: 'idle', data: null });

  useEffect(() => {
    if (!geometry || !monthKey) return undefined;
    const controller = new AbortController();
    fetch(`${API_URL}/api/activity`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ geojson: geometry, month: monthKey }),
      signal: controller.signal
    })
      .then((response) => {
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        return response.json();
      })
      .then((data) => setResult({ geometry, monthKey, status: data.n_cells > 0 ? 'ready' : 'empty', data }))
      .catch((error) => {
        if (error.name !== 'AbortError') setResult({ geometry, monthKey, status: 'error', data: null });
      });
    return () => controller.abort();
  }, [geometry, monthKey]);

  if (!monthKey || !geometry) return { status: 'idle', data: null };
  return result.geometry === geometry && result.monthKey === monthKey ? result : { status: 'loading', data: null };
}
