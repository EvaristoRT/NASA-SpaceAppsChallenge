// Contornos (líneas) de las zonas a partir de sus polígonos.
//
// GeoJSON necesita aristas que el ojo no debe ver: los cortes de los polígonos que cruzan el antimeridiano (±180°),
// las aristas sobre el polo (Antártida) y los saltos que dan la vuelta al mundo. Dibujadas como línea, aparecen como
// trazos rectos a través de todo el mapa. Aquí se quitan solo en la capa de contorno; el relleno usa los polígonos originales.

const NEAR = 1e-6;
const atAntimeridian = (p) => Math.abs(Math.abs(p[0]) - 180) < NEAR;
const atPole = (p) => Math.abs(p[1]) > 90 - 1e-4;

/** True si la arista a→b es un artefacto del formato y no parte del contorno real. */
export function isArtificialEdge(a, b) {
  if (Math.abs(a[0] - b[0]) > 180) return true; // da la vuelta al globo
  if (atAntimeridian(a) && atAntimeridian(b)) return true; // corte a lo largo de ±180°
  if (atPole(a) && atPole(b)) return true; // arista sobre el polo
  return false;
}

/** Anillo → lista de líneas continuas, partiendo donde haya una arista artificial. */
export function ringToLines(ring) {
  const n = ring.length;
  const lines = [];
  let current = [];
  for (let i = 0; i < n - 1; i++) {
    const a = ring[i];
    const b = ring[i + 1];
    if (isArtificialEdge(a, b)) {
      if (current.length > 1) lines.push(current);
      current = [];
      continue;
    }
    if (current.length === 0) current.push(a);
    current.push(b);
  }
  if (current.length > 1) lines.push(current);

  // Si el anillo empezaba y terminaba en tramo válido, la última línea continúa en la primera.
  const keptFirst = !isArtificialEdge(ring[0], ring[1]);
  const keptLast = !isArtificialEdge(ring[n - 2], ring[n - 1]);
  if (lines.length > 1 && keptFirst && keptLast) {
    const last = lines.pop();
    lines[0] = last.concat(lines[0].slice(1));
  }
  return lines;
}

/**
 * Suaviza una línea cortando esquinas (Chaikin): cada tramo se reemplaza por dos puntos a 1/4 y 3/4. Redondea el
 * aspecto "poligonal" de los contornos sin inventar detalle. Las líneas abiertas conservan sus extremos; las cerradas
 * (el primer punto igual al último) se suavizan también en la costura.
 */
export function smoothLine(line, iterations = 2) {
  let pts = line;
  for (let it = 0; it < iterations; it++) {
    if (pts.length < 3) break;
    const closed = pts[0][0] === pts[pts.length - 1][0] && pts[0][1] === pts[pts.length - 1][1];
    const out = [];
    const last = pts.length - 1;
    if (!closed) out.push(pts[0]);
    for (let i = 0; i < last; i++) {
      const a = pts[i];
      const b = pts[i + 1];
      out.push([0.75 * a[0] + 0.25 * b[0], 0.75 * a[1] + 0.25 * b[1]]);
      out.push([0.25 * a[0] + 0.75 * b[0], 0.25 * a[1] + 0.75 * b[1]]);
    }
    if (closed) out.push(out[0]);
    else out.push(pts[last]);
    pts = out;
  }
  return pts;
}

/**
 * FeatureCollection de polígonos → FeatureCollection de MultiLineString con las mismas propiedades `id` y `category`.
 * Con `smooth` los contornos se redondean; las zonas con pocos vértices (formas muy angulosas) reciben una pasada más.
 */
export function buildOutlineCollection(collection, { smooth = false } = {}) {
  const features = [];
  for (const f of collection.features) {
    const g = f.geometry;
    if (!g || (g.type !== 'Polygon' && g.type !== 'MultiPolygon')) continue;
    const polygons = g.type === 'Polygon' ? [g.coordinates] : g.coordinates;
    let lines = polygons.flatMap((poly) => poly.flatMap(ringToLines));
    if (lines.length === 0) continue;
    if (smooth) {
      const vertices = lines.reduce((n, l) => n + l.length, 0);
      const passes = vertices < 150 ? 3 : 2;
      lines = lines.map((l) => smoothLine(l, passes));
    }
    features.push({
      type: 'Feature',
      id: f.id,
      properties: { id: f.properties?.id ?? f.id, category: f.properties?.category },
      geometry: { type: 'MultiLineString', coordinates: lines },
    });
  }
  return { type: 'FeatureCollection', features };
}
