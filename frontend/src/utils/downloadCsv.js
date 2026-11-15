import { API_URL } from './useAnalysis';

// Error de una descarga: `status` es el código HTTP (413 demasiados focos, 503 sin focos en el servidor, 0 sin conexión).
export class DownloadError extends Error {
  constructor(status, detail) {
    super(detail || `HTTP ${status}`);
    this.status = status;
  }
}

// Pide un CSV al backend (POST /api/export.csv?level=...) y lo descarga con el nombre que propone el servidor.
// level: 'monthly' (serie mensual), 'cells' (hexágonos de un mes) o 'hotspots' (focos individuales).
export async function downloadCsv(level, geojson, month) {
  const body = { geojson };
  if (month) {
    body.start = month;
    body.end = month;
  }
  let response;
  try {
    response = await fetch(`${API_URL}/api/export.csv?level=${level}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    });
  } catch {
    throw new DownloadError(0, 'network');
  }
  if (!response.ok) {
    let detail = '';
    try {
      detail = (await response.json()).detail;
    } catch {
      // sin cuerpo JSON
    }
    throw new DownloadError(response.status, detail);
  }
  const blob = await response.blob();
  const match = /filename="?([^";]+)"?/.exec(response.headers.get('Content-Disposition') || '');
  const name = match ? match[1] : `ignissync_${level}.csv`;
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = name;
  document.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
  return { name, bytes: blob.size };
}
