// Comprueba que los contornos generados no contienen aristas artificiales.   node tools/check_outlines.mjs
import { readFileSync } from 'node:fs';
import { isArtificialEdge, buildOutlineCollection } from '../src/utils/outlines.js';

const fc = JSON.parse(readFileSync(new URL('../src/data/worldZonesGeoJSON.json', import.meta.url), 'utf8'));
const out = buildOutlineCollection(fc);

let kept = 0;
let bad = 0;
let removedTotal = 0;
const removedBy = {};
for (const f of fc.features) {
  const polys = f.geometry.type === 'Polygon' ? [f.geometry.coordinates] : f.geometry.coordinates;
  for (const poly of polys) {
    for (const ring of poly) {
      for (let i = 0; i < ring.length - 1; i++) {
        if (isArtificialEdge(ring[i], ring[i + 1])) {
          removedTotal++;
          removedBy[f.id] = (removedBy[f.id] ?? 0) + 1;
        }
      }
    }
  }
}
for (const f of out.features) {
  for (const line of f.geometry.coordinates) {
    for (let i = 0; i < line.length - 1; i++) {
      kept++;
      if (isArtificialEdge(line[i], line[i + 1]) || Math.abs(line[i][0] - line[i + 1][0]) > 180) bad++;
    }
  }
}
console.log(`features de entrada: ${fc.features.length} | de salida: ${out.features.length}`);
console.log(`aristas conservadas: ${kept} | aristas artificiales quitadas: ${removedTotal}`);
console.log('quitadas por zona:', removedBy);
console.log(`aristas artificiales que siguen en los contornos: ${bad}`);
const ant = out.features.find((f) => f.id === 'antartida');
console.log(`Antártida: ${ant.geometry.coordinates.length} líneas (la costa abierta, sin trazo por el polo ni por ±180°)`);
process.exit(bad === 0 ? 0 : 1);
