// Rampa térmica (Inferno) para los días con fuego, compartida por el calendario, la capa del mapa y la leyenda.
// Cero = "sin fuego" (color propio, no el primer color de la rampa).
export const INFERNO = ['#000004', '#1b0c41', '#4a0c6b', '#781c6d', '#a52c60', '#cf4446', '#ed6925', '#fb9b06', '#f7d13d', '#fcffa4'];
export const FLOOR = 0.45; // las rampas oscuras empiezan más arriba: sobre el fondo atenuado de la zona los valores bajos no se hunden

// Escala fija del mapa (días-celda por hexágono y mes): la misma para todos los meses, para poder compararlos.
// 40 cubre el percentil 99 medido en Argentina y Chile (37.5); lo que pasa de ahí se pinta con el color máximo.
export const FIRE_MAX = 40;

function hexToRgb(hex) {
  const n = parseInt(hex.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

export function ramp(t) {
  const x = Math.min(1, Math.max(0, t)) * (INFERNO.length - 1);
  const i = Math.min(INFERNO.length - 2, Math.floor(x));
  const a = hexToRgb(INFERNO[i]);
  const b = hexToRgb(INFERNO[i + 1]);
  const f = x - i;
  return `rgb(${a.map((v, k) => Math.round(v + (b[k] - v) * f)).join(',')})`;
}

// Gradiente de la leyenda (de 0 al máximo de la escala)
export const rampGradient = () =>
  `linear-gradient(90deg, ${Array.from({ length: 12 }, (_, i) => ramp(FLOOR + ((1 - FLOOR) * i) / 11)).join(',')})`;

// Expresión de Mapbox con el mismo color que el calendario: raíz cuadrada del valor sobre FIRE_MAX, sobre la rampa Inferno
export const fireColorExpression = [
  'interpolate',
  ['linear'],
  ['+', FLOOR, ['*', 1 - FLOOR, ['sqrt', ['min', ['/', ['get', 'v'], FIRE_MAX], 1]]]],
  ...INFERNO.flatMap((color, i) => [i / (INFERNO.length - 1), color])
];
