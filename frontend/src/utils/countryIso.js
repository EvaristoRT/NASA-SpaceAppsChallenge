import { ZONES } from '../data/zonesData';
import { continentIdOf } from './continents';

// Puente entre nuestras zonas (países y continentes) y los límites de Mapbox (`mapbox.country-boundaries-v1`), que traen cada país
// con su código ISO 3166-1 de dos letras en la propiedad `iso_3166_1`.
// Nuestros países no llevan el código, pero sí la bandera en `icon`, y la bandera son dos símbolos regionales que lo codifican.

/** Código ISO de dos letras que codifica una bandera (dos símbolos regionales), o null. */
export function isoFromFlag(flag) {
  const points = [...(flag || '')].map((c) => c.codePointAt(0) - 0x1f1e6);
  if (points.length !== 2 || points.some((p) => p < 0 || p > 25)) return null;
  return String.fromCharCode(65 + points[0], 65 + points[1]);
}

const ANTARCTICA_ISO = 'AQ';

/** Zona (país, o la Antártida) a partir del código ISO de un polígono de Mapbox; undefined si no es una de las nuestras. */
export const zoneByIso = new Map();
const isosByContinent = {};

ZONES.filter((z) => z.category === 'País').forEach((zone) => {
  const iso = isoFromFlag(zone.icon);
  if (!iso) return;
  zoneByIso.set(iso, zone);
  const cid = continentIdOf(zone);
  (isosByContinent[cid] = isosByContinent[cid] || []).push(iso);
});

// La Antártida es un continente sin países: su polígono de Mapbox se asigna directamente al continente
const antarctica = ZONES.find((z) => z.id === 'antartida');
if (antarctica) {
  zoneByIso.set(ANTARCTICA_ISO, antarctica);
  isosByContinent[antarctica.id] = [ANTARCTICA_ISO];
}

/** Códigos ISO que cubre una zona: el del país, o los de todos los países del continente. */
export function isoListOf(zone) {
  if (!zone) return [];
  if (zone.category === 'Continente') return isosByContinent[zone.id] || [];
  const iso = isoFromFlag(zone.icon);
  return iso ? [iso] : [];
}

// Los polígonos de Mapbox vienen una vez por "visión del mundo" (límites en disputa): solo se usan los comunes y los de la visión de EE. UU.
export const WORLDVIEW_FILTER = ['any', ['==', 'all', ['get', 'worldview']], ['in', 'US', ['get', 'worldview']]];

/** Filtro de capa que deja solo los polígonos de una zona (ninguno si zone es null). */
export function zoneFilter(zone) {
  return ['all', WORLDVIEW_FILTER, ['in', ['get', 'iso_3166_1'], ['literal', isoListOf(zone)]]];
}
