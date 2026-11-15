// Relación entre países y continentes.
//
// En los datos, los países llevan `continent: 'América'` (36, norte y sur juntos). Para poder entrar a un continente y
// elegir uno de sus países hace falta separar América del Sur de América del Norte (que incluye Centroamérica y el Caribe).

const SOUTH_AMERICA = new Set([
  'argentina', 'bolivia', 'brasil', 'chile', 'colombia', 'ecuador', 'guyana', 'paraguay', 'peru', 'surinam', 'uruguay', 'venezuela'
]);

/** Id del continente de una zona (un continente devuelve el suyo); null si no se conoce. */
export function continentIdOf(zone) {
  if (!zone) return null;
  if (zone.category === 'Continente') return zone.id;
  switch (zone.continent) {
    case 'América':
      return SOUTH_AMERICA.has(zone.id) ? 'america-del-sur' : 'america-del-norte';
    case 'Europa':
      return 'europa';
    case 'Asia':
      return 'asia';
    case 'África':
      return 'africa';
    case 'Oceanía':
      return 'oceania';
    case 'Antártida':
      return 'antartida';
    default:
      return null;
  }
}
