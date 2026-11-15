import { useEffect, useState } from 'react';
import { API_URL } from './useAnalysis';

// Datos del servidor (GET /api/meta), una sola vez por sesión: sirve para saber, por ejemplo, si hay focos individuales para descargar.
let cached = null;
let pending = null;

export function useMeta() {
  const [meta, setMeta] = useState(cached);
  useEffect(() => {
    if (!API_URL || cached) return undefined;
    let alive = true;
    pending =
      pending ||
      fetch(`${API_URL}/api/meta`)
        .then((response) => (response.ok ? response.json() : null))
        .catch(() => null);
    pending.then((value) => {
      if (value) cached = value;
      if (alive) setMeta(value);
    });
    return () => {
      alive = false;
    };
  }, []);
  return meta;
}
