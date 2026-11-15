// Textos de países y continentes en inglés.
//
// Los datos (zonesData.js, allCountries.js) están en español y no se duplican: `localizeZone(zone, 'en')` devuelve una copia
// traducida al vuelo. Con 'es' devuelve los textos de los datos; solo a los países se les precisa el continente
// (América del Sur / del Norte, ver utils/continents.js).
// - Nombres de país: Intl.DisplayNames con el código ISO que se deduce de la bandera (campo `icon`).
// - Capitales: tabla `CAPITALS_EN` (solo las que cambian de nombre en inglés).
// - Descripción, puntos destacados, clima y población de los países: plantillas (en los datos son siempre iguales).
// - Los 7 continentes llevan texto escrito a mano en `CONTINENTS_EN`.

import { continentIdOf } from '../utils/continents';

const CONTINENT_NAMES_EN = {
  'América': 'Americas',
  Europa: 'Europe',
  Asia: 'Asia',
  'África': 'Africa',
  'Oceanía': 'Oceania',
  'Antártida': 'Antarctica'
};

const CAPITALS_EN = {
  'Abu Dabi': 'Abu Dhabi', Abuya: 'Abuja', Acra: 'Accra', 'Adís Abeba': 'Addis Ababa', 'Amán': 'Amman',
  'Andorra la Vieja': 'Andorra la Vella', Argel: 'Algiers', Asjabad: 'Ashgabat', 'Astaná': 'Astana', Atenas: 'Athens',
  Bagdad: 'Baghdad', 'Bakú': 'Baku', Belgrado: 'Belgrade', 'Belmopán': 'Belmopan', 'Berlín': 'Berlin', Berna: 'Bern',
  Biskek: 'Bishkek', 'Bisáu': 'Bissau', Bruselas: 'Brussels', Bucarest: 'Bucharest', Camberra: 'Canberra',
  'Chisináu': 'Chișinău', 'Ciudad de Guatemala': 'Guatemala City', 'Ciudad de México': 'Mexico City',
  'Ciudad de Panamá': 'Panama City', 'Ciudad del Vaticano': 'Vatican City', Conakri: 'Conakry', Copenhague: 'Copenhagen',
  Daca: 'Dhaka', Damasco: 'Damascus', 'Dublín': 'Dublin', 'Dusambé': 'Dushanbe', 'El Cairo': 'Cairo', 'Ereván': 'Yerevan',
  Estocolmo: 'Stockholm', 'Hanói': 'Hanoi', Jartum: 'Khartoum', 'Jerusalén': 'Jerusalem',
  'Jerusalén Este / Ramala': 'East Jerusalem / Ramallah', 'Katmandú': 'Kathmandu', Kiev: 'Kyiv', Kinsasa: 'Kinshasa',
  Kuwait: 'Kuwait City', 'La Habana': 'Havana', 'La Valeta': 'Valletta', 'Lilongüe': 'Lilongwe', Lisboa: 'Lisbon',
  Liubliana: 'Ljubljana', Londres: 'London', Luxemburgo: 'Luxembourg', Mascate: 'Muscat', Mogadiscio: 'Mogadishu',
  'Moscú': 'Moscow', 'Mónaco': 'Monaco', 'Naipyidó': 'Naypyidaw', 'Nasáu': 'Nassau', 'Nom Pen': 'Phnom Penh',
  Nuakchot: 'Nouakchott', 'Nueva Delhi': 'New Delhi', Nukualofa: "Nuku'alofa", 'París': 'Paris', 'Pekín': 'Beijing',
  Pionyang: 'Pyongyang', Praga: 'Prague', 'Porto Novo': 'Porto-Novo', 'Puerto España': 'Port of Spain',
  'Puerto Príncipe': 'Port-au-Prince', Reikiavik: 'Reykjavik', Riad: 'Riyadh', Roma: 'Rome',
  'Saint George': "St. George's", 'Saint John': "St. John's", 'Santo Tomé': 'São Tomé', 'Saná': 'Sanaa', 'Seúl': 'Seoul',
  Singapur: 'Singapore', Skopie: 'Skopje', 'Sofía': 'Sofia', 'Sri Jayawardenapura Kotte': 'Sri Jayawardenepura Kotte',
  'Taipéi': 'Taipei', Tallin: 'Tallinn', 'Tarawa Sur': 'South Tarawa', Taskent: 'Tashkent', 'Teherán': 'Tehran',
  Tiflis: 'Tbilisi', Timbu: 'Thimphu', Tokio: 'Tokyo', 'Trípoli': 'Tripoli', 'Túnez': 'Tunis', 'Uagadugú': 'Ouagadougou',
  'Ulán Bator': 'Ulaanbaatar', Varsovia: 'Warsaw', Viena: 'Vienna', 'Vientián': 'Vientiane', Vilna: 'Vilnius',
  Yakarta: 'Jakarta', Yamena: "N'Djamena", Yamusukro: 'Yamoussoukro', 'Yaundé': 'Yaoundé', Yibuti: 'Djibouti', Yuba: 'Juba',
  'Ámsterdam': 'Amsterdam'
};

const CONTINENTS_EN = {
  'america-del-sur': {
    name: 'South America',
    climate: 'Tropical, Equatorial, Desert, Glacial',
    description: "A continent defined by the majestic Andes mountain range, the planet's largest river basin and rainforest, and extraordinary biodiversity.",
    highlights: ['Amazon Rainforest', 'Andes Mountains', 'Iguazú Falls', 'Atacama Desert', 'Patagonia']
  },
  'america-del-norte': {
    name: 'North America',
    climate: 'Arctic, Temperate, Desert, Subtropical',
    description: 'Stretches from the Arctic tundra of Canada and Alaska to the tropical coasts of southern Mexico and the Caribbean.',
    highlights: ['Rocky Mountains', 'Grand Canyon', 'Great Lakes', 'Canadian Boreal Forests', 'Yucatán Peninsula']
  },
  europa: {
    name: 'Europe',
    climate: 'Mediterranean, Oceanic, Continental, Subpolar',
    description: 'Cradle of modern Western civilization, with a dense network of ancient cultures, the Alps, fertile plains and long coastlines.',
    highlights: ['The Alps', 'Mediterranean Sea', 'Norwegian Fjords', 'Danube River', 'Iberian Peninsula']
  },
  africa: {
    name: 'Africa',
    climate: 'Equatorial, Savanna, Desert (Sahara), Mediterranean',
    description: "The world's second-largest continent and the cradle of humankind, home to the largest hot desert and iconic wildlife on its savannas.",
    highlights: ['Sahara Desert', 'Nile River', 'Great Rift Valley', 'Mount Kilimanjaro', 'Congo Rainforest', 'Okavango Delta']
  },
  asia: {
    name: 'Asia',
    climate: 'Polar Siberian, Desert, Monsoon, Humid Tropical',
    description: "Earth's largest and most populous continent, home to the planet's highest peak (Everest) and ancient cultures with global influence.",
    highlights: ['Himalayas', 'Tibetan Plateau', 'Gobi Desert', 'Japanese Archipelago', 'Southeast Asia']
  },
  oceania: {
    name: 'Oceania',
    climate: 'Arid, Temperate, Marine, Tropical island',
    description: "An island continent dominated by Australia's landmass, the alpine and glacial landscapes of New Zealand, and thousands of Polynesian and Melanesian islands.",
    highlights: ['Great Barrier Reef', 'Australian Outback', 'Southern Alps of New Zealand', 'Fiji Archipelago', 'Blue Mountains']
  },
  antartida: {
    name: 'Antarctica',
    population: '1,000 to 5,000 (scientists)',
    climate: 'Extreme polar (the coldest and windiest place on Earth)',
    description: 'The white continent holds more than 70% of the üworld\'s fresh water as ice. It is an international sanctuary for science and peace.'.replace('ü', ''),
    highlights: ['Antarctic Plateau', 'Antarctic Peninsula', 'Ross Ice Shelf', 'Mount Erebus', 'Thwaites Glacier']
  }
};

const regionNames = typeof Intl !== 'undefined' && Intl.DisplayNames ? new Intl.DisplayNames(['en'], { type: 'region' }) : null;

// La bandera (dos símbolos regionales) codifica el código ISO del país
function isoFromFlag(flag) {
  const points = [...(flag || '')].map((c) => c.codePointAt(0) - 0x1f1e6);
  if (points.length !== 2 || points.some((p) => p < 0 || p > 25)) return null;
  return String.fromCharCode(65 + points[0], 65 + points[1]);
}

const COUNTRY_FIXES = {
  'Congo - Brazzaville': 'Republic of the Congo',
  'Congo - Kinshasa': 'Democratic Republic of the Congo',
  'Palestinian Territories': 'Palestine'
};

function countryNameEn(zone) {
  const iso = isoFromFlag(zone.icon);
  let name = iso && regionNames ? regionNames.of(iso) : null;
  if (!name || name === iso) return zone.name;
  name = COUNTRY_FIXES[name] || name;
  return name.replace(/ & /g, ' and ').replace(/^St\. /, 'Saint ');
}

const continentEn = (name) => CONTINENT_NAMES_EN[name] || name;
const populationEn = (p) => (p ? p.replace(/\s*millones$/, ' million') : p);

const CONTINENT_NAMES_ES = {
  'america-del-sur': 'América del Sur',
  'america-del-norte': 'América del Norte',
  europa: 'Europa',
  africa: 'África',
  asia: 'Asia',
  oceania: 'Oceanía',
  antartida: 'Antártida'
};

const cache = new Map();

/** Devuelve la zona con sus textos en el idioma pedido ('es' = sin cambios). */
export function localizeZone(zone, lang) {
  if (!zone) return zone;
  if (lang !== 'en' && zone.category === 'Continente') return zone;
  const key = `${lang}:${zone.id}`;
  const hit = cache.get(key);
  if (hit) return hit;

  let out;
  if (zone.category === 'Continente') {
    const t = CONTINENTS_EN[zone.id] || {};
    out = {
      ...zone,
      name: t.name || zone.name,
      nativeName: t.name || zone.name,
      category: 'Continent',
      continent: continentEn(zone.continent),
      population: t.population || populationEn(zone.population),
      climate: t.climate || zone.climate,
      description: t.description || zone.description,
      highlights: t.highlights || zone.highlights
    };
  } else {
    if (lang !== 'en') {
      // español: se conservan los textos de los datos y solo se precisa el continente (América del Sur / del Norte)
      const cid = continentIdOf(zone);
      out = { ...zone, continent: (cid && CONTINENT_NAMES_ES[cid]) || zone.continent };
      cache.set(key, out);
      return out;
    }
    const name = countryNameEn(zone);
    const capital = CAPITALS_EN[zone.capital] || zone.capital;
    const cid = continentIdOf(zone);
    const continent = (cid && CONTINENTS_EN[cid]?.name) || continentEn(zone.continent);
    out = {
      ...zone,
      name,
      nativeName: name,
      category: 'Country',
      capital,
      continent,
      population: populationEn(zone.population),
      climate: zone.climate === 'Variable según región y estacionalidad' ? 'Varies by region and season' : zone.climate,
      description: `Sovereign nation located in ${continent}, whose capital is ${capital}. It covers an area of ${zone.area} and has an approximate population of ${populationEn(zone.population)}.`,
      highlights: [`Capital: ${capital}`, `Region: ${continent}`, `Area: ${zone.area}`]
    };
  }
  cache.set(key, out);
  return out;
}

/** Nombre del continente en el idioma pedido (para etiquetas sueltas). */
export function localizeContinentName(name, lang) {
  return lang === 'en' ? continentEn(name) : name;
}

/** Texto sin acentos ni mayúsculas, para que "mexico" encuentre "México". */
export function normalizeSearch(text) {
  return String(text ?? '')
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase();
}
