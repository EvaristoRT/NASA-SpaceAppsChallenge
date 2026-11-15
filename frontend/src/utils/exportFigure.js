import { getFloor, ramp } from './fireRamp';

// Exportar las figuras del panel como imagen PNG: el calendario (se dibuja en un lienzo con los mismos colores) y la gráfica de la
// serie (se copia el SVG de la pantalla con sus estilos). Cada imagen lleva título, periodo y fuente para que se entienda sola.

const BG = '#151622';
const FG = '#ffffff';
const MUTED = '#a9aebb';
const NO_FIRE = '#20233b';
const NO_DATA = '#1a1c2e';
const SCALE = 2; // píxeles por unidad: nítido al imprimir o pegar en un informe

const fontFamily = () => getComputedStyle(document.body).fontFamily || 'sans-serif';

const cellColor = (value, max) => (value <= 0 ? NO_FIRE : ramp(getFloor() + (1 - getFloor()) * Math.sqrt(Math.min(value / max, 1))));

// Lienzo con fondo, título, subtítulo y pie. `draw(ctx, top)` pinta la figura desde `top` y devuelve su altura.
function compose(width, { title, subtitle, footer }, bodyHeight, draw) {
  const head = 62;
  const foot = 34;
  const height = head + bodyHeight + foot;
  const canvas = document.createElement('canvas');
  canvas.width = width * SCALE;
  canvas.height = height * SCALE;
  const ctx = canvas.getContext('2d');
  ctx.scale(SCALE, SCALE);
  ctx.fillStyle = BG;
  ctx.fillRect(0, 0, width, height);
  const family = fontFamily();
  ctx.textBaseline = 'alphabetic';
  ctx.fillStyle = FG;
  ctx.font = `700 18px ${family}`;
  ctx.fillText(title, 16, 28);
  ctx.fillStyle = MUTED;
  ctx.font = `400 12px ${family}`;
  ctx.fillText(subtitle, 16, 47);
  const done = draw(ctx, head, family);
  ctx.fillStyle = MUTED;
  ctx.font = `400 11px ${family}`;
  ctx.fillText(footer, 16, height - 12);
  return { canvas, done };
}

function saveCanvas(canvas, name) {
  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (!blob) {
        reject(new Error('png'));
        return;
      }
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = name;
      document.body.appendChild(link);
      link.click();
      link.remove();
      setTimeout(() => URL.revokeObjectURL(url), 2000);
      resolve({ name, bytes: blob.size });
    }, 'image/png');
  });
}

// labels: { title, subtitle, footer, monthsShort, scaleLabel }
export function exportCalendarPng(data, labels, fileName) {
  const years = [];
  for (let y = data.firstYear; y <= data.lastYear; y++) years.push(y);
  const cell = 20;
  const gap = 2;
  const left = 48;
  const gridW = 12 * (cell + gap);
  const width = Math.max(left + gridW + 16, 480); // más ancho que la rejilla para que quepan el título y el pie
  const gridH = 18 + years.length * (cell + gap);
  const scaleH = 36;

  const { canvas } = compose(width, labels, gridH + scaleH, (ctx, top, family) => {
    ctx.font = `400 11px ${family}`;
    ctx.fillStyle = MUTED;
    ctx.textAlign = 'center';
    labels.monthsShort.forEach((m, i) => ctx.fillText(m, left + i * (cell + gap) + cell / 2, top + 10));
    ctx.textAlign = 'right';
    years.forEach((y, r) => {
      const yy = top + 18 + r * (cell + gap);
      ctx.fillStyle = MUTED;
      ctx.fillText(String(y), left - 8, yy + cell / 2 + 4);
      data.calendar[y].forEach((v, m) => {
        ctx.fillStyle = v === null ? NO_DATA : cellColor(v, data.max);
        ctx.fillRect(left + m * (cell + gap), yy, cell, cell);
      });
    });
    // Escala de color: de 0 al máximo
    const sy = top + gridH + 10;
    const sw = gridW - 56;
    const gradient = ctx.createLinearGradient(left + 28, 0, left + 28 + sw, 0);
    for (let i = 0; i <= 11; i += 1) gradient.addColorStop(i / 11, ramp(getFloor() + ((1 - getFloor()) * i) / 11));
    ctx.fillStyle = gradient;
    ctx.fillRect(left + 28, sy, sw, 10);
    ctx.fillStyle = MUTED;
    ctx.textAlign = 'right';
    ctx.fillText('0', left + 22, sy + 9);
    ctx.textAlign = 'left';
    ctx.fillText(Math.round(data.max).toLocaleString(), left + 28 + sw + 6, sy + 9);
    ctx.textAlign = 'left';
    ctx.fillText(labels.scaleLabel, left, sy + 26);
  });
  return saveCanvas(canvas, fileName);
}

// Propiedades que el SVG necesita llevar en línea porque sus clases CSS no viajan con la imagen
const SVG_PROPS = [
  'fill', 'fill-opacity', 'stroke', 'stroke-width', 'stroke-opacity', 'stroke-dasharray', 'stroke-linejoin', 'stroke-linecap',
  'opacity', 'font-size', 'font-family', 'font-weight', 'text-anchor'
];

function inlineSvg(svg) {
  const clone = svg.cloneNode(true);
  const from = [svg, ...svg.querySelectorAll('*')];
  const to = [clone, ...clone.querySelectorAll('*')];
  from.forEach((el, i) => {
    const style = getComputedStyle(el);
    to[i].setAttribute('style', SVG_PROPS.map((p) => `${p}:${style.getPropertyValue(p)}`).join(';'));
  });
  clone.querySelectorAll('.estimate-cursor, .estimate-dot').forEach((el) => el.remove()); // marcas del puntero
  const box = svg.viewBox.baseVal;
  clone.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
  clone.setAttribute('width', String(box.width));
  clone.setAttribute('height', String(box.height));
  return { markup: new XMLSerializer().serializeToString(clone), width: box.width, height: box.height };
}

// svg: el elemento de la gráfica (EstimateChart); labels: { title, subtitle, footer }
export async function exportChartPng(svg, labels, fileName) {
  const { markup, width, height } = inlineSvg(svg);
  const image = new Image();
  await new Promise((resolve, reject) => {
    image.onload = resolve;
    image.onerror = () => reject(new Error('svg'));
    image.src = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(markup)}`;
  });
  const zoom = 1.6; // la gráfica es angosta en pantalla; así queda más legible
  const w = Math.round(width * zoom) + 32;
  const { canvas } = compose(w, labels, Math.round(height * zoom) + 8, (ctx, top) => {
    ctx.drawImage(image, 16, top, width * zoom, height * zoom);
  });
  return saveCanvas(canvas, fileName);
}
