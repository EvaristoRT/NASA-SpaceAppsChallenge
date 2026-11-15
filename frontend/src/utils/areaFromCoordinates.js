// Área de interés a partir de coordenadas escritas (en lugar de dibujarla): un centro con radio, o un rectángulo por sus límites.
// Devuelve { coords, type } con los vértices [lon, lat] cerrados (igual que el dibujo), o { error } con la clave del mensaje.

const EARTH_KM = 6371;
const CIRCLE_VERTICES = 48;
const MAX_RADIUS_KM = 1500;

const num = (text) => {
  const raw = String(text ?? '').trim();
  const value = Number(raw.replace(',', '.'));
  return raw === '' || !Number.isFinite(value) ? null : value;
};

const validLat = (v) => v !== null && v >= -90 && v <= 90;
const validLon = (v) => v !== null && v >= -180 && v <= 180;

// mode: 'center' (lat, lon, radius en km) o 'box' (south, north, west, east)
export function areaFromCoordinates(mode, values) {
  if (mode === 'center') {
    const lat = num(values.lat);
    const lon = num(values.lon);
    const radius = num(values.radius);
    if (!validLat(lat) || !validLon(lon)) return { error: 'coordsInvalid' };
    if (radius === null || radius <= 0 || radius > MAX_RADIUS_KM) return { error: 'coordsRadius' };
    const phi = (lat * Math.PI) / 180;
    const lambda = (lon * Math.PI) / 180;
    const delta = radius / EARTH_KM;
    const coords = [];
    for (let i = 0; i < CIRCLE_VERTICES; i++) {
      const theta = (2 * Math.PI * i) / CIRCLE_VERTICES;
      const phi2 = Math.asin(Math.sin(phi) * Math.cos(delta) + Math.cos(phi) * Math.sin(delta) * Math.cos(theta));
      const lambda2 =
        lambda + Math.atan2(Math.sin(theta) * Math.sin(delta) * Math.cos(phi), Math.cos(delta) - Math.sin(phi) * Math.sin(phi2));
      const lat2 = (phi2 * 180) / Math.PI;
      const lon2 = (lambda2 * 180) / Math.PI;
      // Un círculo que cruza el antimeridiano o llega a un polo no cabe en un polígono plano
      if (Math.abs(lon2) > 180 || Math.abs(lat2) >= 89.5) return { error: 'coordsEdge' };
      coords.push([Number(lon2.toFixed(5)), Number(lat2.toFixed(5))]);
    }
    return { coords: [...coords, coords[0]], type: 'polygon' };
  }

  const south = num(values.south);
  const north = num(values.north);
  const west = num(values.west);
  const east = num(values.east);
  if (!validLat(south) || !validLat(north) || !validLon(west) || !validLon(east)) return { error: 'coordsInvalid' };
  if (south >= north || west >= east) return { error: 'coordsOrder' };
  return {
    coords: [[west, south], [east, south], [east, north], [west, north], [west, south]],
    type: 'rectangle'
  };
}
