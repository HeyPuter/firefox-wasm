// Host (node) runner -- validates correctness + gives a native baseline.
// Usage: node run-node.mjs [list1.txt,list2.txt] [iters]
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { bench } from './driver.mjs';

const __dir = dirname(fileURLToPath(import.meta.url));
const args = process.argv.slice(2);
const lists = (args[0] || 'easylist.txt').split(',');
const iters = parseInt(args[1] || '5', 10);

const rawTexts = lists.map(n => readFileSync(join(__dir, 'data', n), 'utf8'));
const bytes = rawTexts.reduce((a, s) => a + s.length, 0);
console.log(`lists: ${lists.join(', ')}  (${bytes} bytes)  iters: ${iters}`);

const runs = bench(rawTexts, iters);
runs.forEach((r, i) => console.log(
    `run ${i}: compile ${r.compileMs}ms  load ${r.loadMs}ms  total ${r.totalMs}ms` +
    `  (net ${r.netFilters}, ext ${r.extFilters}, accepted ${r.acceptedCount}, ${r.compiledBytes}B compiled)`));

const warm = runs.slice(1);
if ( warm.length ) {
    const avg = k => +(warm.reduce((a, r) => a + r[k], 0) / warm.length).toFixed(1);
    console.log(`warm avg (runs 1..${runs.length - 1}): compile ${avg('compileMs')}ms  load ${avg('loadMs')}ms  total ${avg('totalMs')}ms`);
}
