import { ZONES } from '../data/zonesData';
import { continentIdOf } from './continents';
import { localizeZone } from '../i18n/zoneText';

// Un punto por país (en su `coords`), con el nombre en el idioma activo y el continente al que pertenece.
// El mapa los muestra solo para el continente elegido, para poder elegir un país tocando su punto.
export function buildCountryDots(lang) {
  return {
    type: 'FeatureCollection',
    features: ZONES.filter((z) => z.category === 'País' && z.coords).map((z) => ({
      type: 'Feature',
      properties: { id: z.id, name: localizeZone(z, lang).name, continent: continentIdOf(z) },
      geometry: { type: 'Point', coordinates: z.coords }
    }))
  };
}
