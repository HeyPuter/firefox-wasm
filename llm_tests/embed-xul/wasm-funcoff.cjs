// Parse a wasm module to find which function body contains a given module-relative
// file offset (as reported by V8 stack traces: wasm-function[idx]:0xOFFSET), and
// report the function's module index + body start so we can compute an in-function
// offset for offline DWARF symbolization.
const fs = require('fs');
const path = process.argv[2];
const target = parseInt(process.argv[3], 16);
const buf = fs.readFileSync(path);
let p = 8; // skip magic+version
function leb() { let r = 0, s = 0, b; do { b = buf[p++]; r |= (b & 0x7f) << s; s += 7; } while (b & 0x80); return r >>> 0; }
let numImportFuncs = 0;
let codeStart = -1, codeFuncs = [];
while (p < buf.length) {
  const id = buf[p++];
  const size = leb();
  const secEnd = p + size;
  if (id === 2) { // import
    const n = leb();
    for (let i = 0; i < n; i++) {
      const mlen = leb(); p += mlen;
      const nlen = leb(); p += nlen;
      const kind = buf[p++];
      if (kind === 0x00) { numImportFuncs++; leb(); }       // func: typeidx
      else if (kind === 0x01) { p++; const f = buf[p++]; leb(); if (f & 1) leb(); } // table
      else if (kind === 0x02) { const f = buf[p++]; leb(); if (f & 1) leb(); }      // mem
      else if (kind === 0x03) { p++; p++; }                 // global: valtype + mut
      else { throw new Error('importkind ' + kind); }
    }
  } else if (id === 10) { // code
    const n = leb();
    for (let i = 0; i < n; i++) {
      const bsize = leb();
      const bodyStart = p;          // file offset of this function body
      codeFuncs.push({ defIdx: i, modIdx: numImportFuncs + i, start: bodyStart, end: bodyStart + bsize });
      p += bsize;
    }
  }
  p = secEnd;
}
console.log('numImportFuncs =', numImportFuncs, ' definedFuncs =', codeFuncs.length);
const hit = codeFuncs.find((f) => target >= f.start && target < f.end);
if (!hit) { console.log('offset 0x' + target.toString(16) + ' not in any function body'); process.exit(2); }
console.log('target 0x' + target.toString(16) + ' is in module func #' + hit.modIdx +
  ' (defined #' + hit.defIdx + ')');
console.log('  body file range: 0x' + hit.start.toString(16) + ' .. 0x' + hit.end.toString(16) +
  '  size=' + (hit.end - hit.start));
console.log('  in-function offset = 0x' + (target - hit.start).toString(16) + ' (' + (target - hit.start) + ')');
