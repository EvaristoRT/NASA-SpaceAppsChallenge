import { ALL_COUNTRIES } from '../data/allCountries';
import worldZonesGeoJSON from '../data/worldZonesGeoJSON.json';

/**
 * Retorna la FeatureCollection GeoJSON con las geometrías y límites reales
 * (polígonos y multipolígonos de alta precisión) de todos los países y zonas del mundo.
 */
export function generateZonesGeoJSON() {
  return worldZonesGeoJSON;
}

/**
 * Formatea coordenadas en formato grados, minutos o decimal legible
 */
export function formatCoords(lat, lng) {
  if (lat === null || lat === undefined || lng === null || lng === undefined) return '--';
  const latDir = lat >= 0 ? 'N' : 'S';
  const lngDir = lng >= 0 ? 'E' : 'O';
  return `${Math.abs(lat).toFixed(2)}° ${latDir}, ${Math.abs(lng).toFixed(2)}° ${lngDir}`;
}

/**
 * Algoritmo Ray-Casting: Verifica si un punto [lng, lat] está dentro de un polígono
 */
export function pointInPolygon(point, vs) {
  const x = point[0];
  const y = point[1];
  let inside = false;
  for (let i = 0, j = vs.length - 1; i < vs.length; j = i++) {
    const xi = vs[i][0];
    const yi = vs[i][1];
    const xj = vs[j][0];
    const yj = vs[j][1];
    const intersect = yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi;
    if (intersect) inside = !inside;
  }
  return inside;
}

/**
 * Distancia Haversine entre dos coordenadas en km
 */
export function haversineDistance(coord1, coord2) {
  const R = 6371; // Radio de la Tierra en km
  const toRad = Math.PI / 180;
  const dLat = (coord2[1] - coord1[1]) * toRad;
  const dLng = (coord2[0] - coord1[0]) * toRad;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(coord1[1] * toRad) * Math.cos(coord2[1] * toRad) * Math.sin(dLng / 2) * Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

/**
 * Calcula la superficie de un polígono esférico en km²
 */
export function calculatePolygonArea(coords) {
  if (!coords || coords.length < 3) return 0;
  const R = 6371; // Radio medio de la Tierra en km
  const toRad = Math.PI / 180;
  let total = 0;
  const len = coords.length;

  for (let i = 0; i < len; i++) {
    const p1 = coords[i];
    const p2 = coords[(i + 1) % len];
    total += (p2[0] * toRad - p1[0] * toRad) * (2 + Math.sin(p1[1] * toRad) + Math.sin(p2[1] * toRad));
  }

  const area = Math.abs((total * R * R) / 2);
  return area;
}

/**
 * Calcula el perímetro de un polígono en km
 */
export function calculatePolygonPerimeter(coords) {
  if (!coords || coords.length < 2) return 0;
  let perimeter = 0;
  for (let i = 0; i < coords.length - 1; i++) {
    perimeter += haversineDistance(coords[i], coords[i + 1]);
  }
  return perimeter;
}

/**
 * Calcula el Bounding Box [minLng, minLat, maxLng, maxLat] y centroide
 */
export function getPolygonBoundsAndCenter(coords) {
  if (!coords || coords.length === 0) return null;
  let minLng = Infinity;
  let maxLng = -Infinity;
  let minLat = Infinity;
  let maxLat = -Infinity;

  coords.forEach(([lng, lat]) => {
    if (lng < minLng) minLng = lng;
    if (lng > maxLng) maxLng = lng;
    if (lat < minLat) minLat = lat;
    if (lat > maxLat) maxLat = lat;
  });

  const center = [(minLng + maxLng) / 2, (minLat + maxLat) / 2];

  return {
    minLng,
    maxLng,
    minLat,
    maxLat,
    center
  };
}

/**
 * Detecta qué países o regiones se encuentran dentro o intersectan con el polígono dibujado
 * utilizando sus geometrías y límites territoriales reales.
 */
export function findCoveredCountries(polygonCoords) {
  if (!polygonCoords || polygonCoords.length < 3) return [];

  const bounds = getPolygonBoundsAndCenter(polygonCoords);
  if (!bounds) return [];

  const covered = ALL_COUNTRIES.filter((country) => {
    const [lng, lat] = country.coords;
    // 1. Verificación directa si el centroide del país está dentro del área dibujada
    if (pointInPolygon([lng, lat], polygonCoords)) {
      return true;
    }

    // 2. Filtro rápido de Bounding Box antes de evaluar la geometría real
    if (
      lng < bounds.minLng - 15 ||
      lng > bounds.maxLng + 15 ||
      lat < bounds.minLat - 15 ||
      lat > bounds.maxLat + 15
    ) {
      return false;
    }

    // 3. Verificación de intersección con la geometría real del país
    const feature = worldZonesGeoJSON.features.find((f) => f.id === country.id);
    if (!feature || !feature.geometry) return false;

    const geom = feature.geometry;
    if (geom.type === 'Polygon') {
      for (const ring of geom.coordinates) {
        for (let i = 0; i < ring.length; i += 2) {
          if (pointInPolygon(ring[i], polygonCoords)) return true;
        }
      }
    } else if (geom.type === 'MultiPolygon') {
      for (const poly of geom.coordinates) {
        for (const ring of poly) {
          for (let i = 0; i < ring.length; i += 2) {
            if (pointInPolygon(ring[i], polygonCoords)) return true;
          }
        }
      }
    }

    return false;
  });

  return covered;
}
