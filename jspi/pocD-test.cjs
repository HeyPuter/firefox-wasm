// Node harness: patch pocD.wasm memory shared->non-shared, then prove per-"fiber" TLS
// via save/restore of the ACTIVE TLS region. Key facts learned:
//   - active TLS base = &t1 (the access base; 0 here, uninitialized without -pthread)
//   - template (initial values) lives at __builtin_wasm_tls_base() (the .tdata copy)
//   - thread_locals are contiguous, span = __builtin_wasm_tls_size()
const fs = require('fs'); const path = require('path');
const HERE = __dirname;

function patchMemoryNonShared(bytes) {
  let o = 8;
  const rd = () => { let r = 0, s = 0, b; do { b = bytes[o++]; r |= (b & 0x7f) << s; s += 7; } while (b & 0x80); return r >>> 0; };
  while (o < bytes.length) {
    const id = bytes[o++]; const size = rd(); const start = o;
    if (id === 5) { let p = o; const r2 = () => { let r = 0, s = 0, b; do { b = bytes[p++]; r |= (b & 0x7f) << s; s += 7; } while (b & 0x80); return r >>> 0; };
      r2(); const fp = p; const f = bytes[fp]; if (f & 2) { bytes[fp] = f & ~2; return { patched: true, from: f, to: bytes[fp] }; } return { patched: false, f }; }
    o = start + size;
  }
  return { notfound: true };
}

(async () => {
  const wasm = new Uint8Array(fs.readFileSync(path.join(HERE, 'pocD.wasm')));
  console.log('memory patch:', JSON.stringify(patchMemoryNonShared(wasm)));
  let INST = null;
  await require('./pocD.js')({
    instantiateWasm: (info, receive) => { WebAssembly.instantiate(wasm, info).then(({ instance, module }) => { INST = instance; receive(instance, module); }); return {}; },
  });
  const ex = INST.exports;
  const activeBase = ex.a1();              // where thread_locals actually live
  const templBase = ex.tls_base();         // .tdata template
  const size = ex.tls_size();
  const H = () => new Uint8Array(ex.memory.buffer);
  const snap = (at) => H().slice(at, at + size);
  const load = (buf) => H().set(buf, activeBase);
  console.log(`buffer=${ex.memory.buffer.constructor.name} activeBase=${activeBase} templBase=${templBase} size=${size}`);

  const template = snap(templBase);
  console.log('template bytes (expect 11,22,33):', new Int32Array(template.buffer, 0, 3).join(','));

  // Initialize main/fiber-A TLS from the template (emulates __wasm_init_tls).
  load(template);
  console.log('after template init, rd =', ex.rd1(), ex.rd2(), ex.rd3());

  // Fiber A writes, save.
  ex.wr(100, 200, 300);
  const A = snap(activeBase);

  // Switch to fresh fiber B: load template, confirm fresh, write, save.
  load(template);
  const bInit = [ex.rd1(), ex.rd2(), ex.rd3()];
  ex.wr(7, 8, 9);
  const B = snap(activeBase);

  // Switch back to A: restore, must see 100/200/300.
  load(A);
  const aBack = [ex.rd1(), ex.rd2(), ex.rd3()];

  // And B is intact when restored.
  load(B);
  const bBack = [ex.rd1(), ex.rd2(), ex.rd3()];

  console.log('B fresh:', bInit.join(','), '| A restored:', aBack.join(','), '| B restored:', bBack.join(','));
  const ok = bInit.join() === '11,22,33' && aBack.join() === '100,200,300' && bBack.join() === '7,8,9';
  console.log('\n=== RESULT ===');
  console.log(ok ? 'PoC D PASS: single-threaded per-fiber TLS via region save/restore works (no SAB)'
                 : 'PoC D FAIL');
  process.exit(ok ? 0 : 1);
})();
