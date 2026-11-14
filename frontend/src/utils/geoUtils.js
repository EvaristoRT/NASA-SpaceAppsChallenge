import { ZONES } from '../data/zonesData';

/**
 * Convierte el catálogo de zonas en una FeatureCollection GeoJSON
 * para renderizar polígonos interactivos en el globo.
 */
export function generateZonesGeoJSON() {
  const features = ZONES.map((zone) => {
    // Si la zona tiene un polígono definido, lo usamos; si no, creamos un bounding box alrededor de sus coordenadas
    let coordinates = [];
    if (zone.polygon && zone.polygon.length > 0) {
      coordinates = [zone.polygon];
    } else {
      const [lng, lat] = zone.coords;
      const delta = 4;
      coordinates = [[
        [lng - delta, lat - delta],
        [lng + delta, lat - delta],
        [lng + delta, lat + delta],
        [lng - delta, lat + delta],
        [lng - delta, lat - delta]
      ]];
    }

    return {
      type: 'Feature',
      id: zone.id,
      properties: {
        id: zone.id,
        name: zone.name,
        category: zone.category,
        icon: zone.icon,
        area: zone.area,
        population: zone.population,
        climate: zone.climate
      },
      geometry: {
        type: 'Polygon',
        coordinates: coordinates
      }
    };
  });

  return {
    type: 'FeatureCollection',
    features
  };
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
