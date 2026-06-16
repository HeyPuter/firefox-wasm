// Drive the on-demand render loop (embed-xul.cpp main): wait for READY, write a
// URL + size into the shared XulCmd struct, set state=1, poll for done(3), then
// read the BGRA result from the wasm heap. Validates the real LoadURI->render
// path (no DOM injection) before the browser/address-bar UI.
const path = require('path');
const fs = require('fs');
const createGecko = require(path.join(__dirname, 'gecko.js'));

let markReady;
const readyP = new Promise((r) => (markReady = r));
function onLine(t, s) {
  console.log('[' + s + ']', t);
  if (typeof t === 'string' && t.includes('READY cmd=')) markReady();
}

// XulCmd offsets: 0 state, 4 width, 8 height, 12 result(ptr), 16 resultLen, 20 url.
const ST = 0, W = 4, H = 8, RES = 12, LEN = 16, URL = 20;

createGecko({
  preRun: [(m) => {
    m.ENV['MOZ_FORCE_DISABLE_E10S'] = '1';
    if (process.env.MOZ_LOG) m.ENV['MOZ_LOG'] = process.env.MOZ_LOG;
  }],
  print: (t) => onLine(t, 'out'),
  printErr: (t) => onLine(t, 'err'),
})
  .then(async (mod) => {
    await Promise.race([readyP, new Promise((r) => setTimeout(r, 90000))]);
    const cmd = mod._xul_cmd_ptr();
    console.log('[runner] cmd =', cmd);
    if (!cmd) { console.log('[runner] no cmd ptr (not ready)'); process.exit(7); }

    const i32 = () => mod.HEAP32;            // re-fetch (views change on heap growth)
    const u8 = () => mod.HEAPU8;
    const width = 800, height = 600;
    const url = process.env.URL ||
      'data:text/html;charset=utf-8,' +
      '<!DOCTYPE html><html><head></head><body style="margin:0;background:white">' +
      '<div style="width:400px;height:300px;background:rgb(0,102,204)"></div>' +
      '<div style="width:200px;height:150px;background:rgb(204,0,0);margin-left:120px"></div>' +
      '</body></html>';

    // Fill the request.
    const ub = u8();
    for (let i = 0; i < url.length; i++) ub[cmd + URL + i] = url.charCodeAt(i);
    ub[cmd + URL + url.length] = 0;
    i32()[(cmd + W) >> 2] = width;
    i32()[(cmd + H) >> 2] = height;
    Atomics.store(i32(), (cmd + ST) >> 2, 1);  // state = request
    console.log('[runner] submitted render request for:', url.slice(0, 50));

    const start = Date.now();
    let st = 1;
    while (Date.now() - start < 120000) {
      st = Atomics.load(i32(), (cmd + ST) >> 2);
      if (st === 3 || st === -1) break;
      await new Promise((r) => setTimeout(r, 50));
    }
    console.log('[runner] final state =', st);
    if (st !== 3) { console.log('[runner] render failed/timeout'); process.exit(6); }

    const resPtr = i32()[(cmd + RES) >> 2];
    const len = i32()[(cmd + LEN) >> 2];
    const px = u8().subarray(resPtr, resPtr + len);
    let nonWhite = 0;
    for (let i = 0; i + 3 < len; i += 4)
      if (px[i] !== 255 || px[i + 1] !== 255 || px[i + 2] !== 255) nonWhite++;
    fs.writeFileSync(path.join(__dirname, 'render-main.bgra'), Buffer.from(px));
    console.log(`[runner] RENDER RESULT: ${nonWhite}/${width * height} non-white (resPtr=${resPtr} len=${len})`);
    console.log(nonWhite > 0 ? 'RENDER_OK content painted' : 'RENDER_EMPTY all white');
    process.exit(nonWhite > 0 ? 0 : 5);
  })
  .catch((e) => {
    console.error('[runner] failed:', e && e.message ? e.message : e);
    if (e && e.stack) console.error(e.stack);
    process.exit(1);
  });
