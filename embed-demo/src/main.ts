import { Gecko } from 'gecko.js';

const canvas = document.getElementById('screen') as HTMLCanvasElement;
const urlInput = document.getElementById('url') as HTMLInputElement;
const wispInput = document.getElementById('wisp') as HTMLInputElement;
const gpuToggle = document.getElementById('gpu') as HTMLInputElement;
const jitToggle = document.getElementById('jit') as HTMLInputElement;

// Engine options are consumed when the engine boots (GECKO_GPU / GECKO_NOWASMJIT
// are read once at init, WISP installs in preRun), so they're persisted and
// applied on reload rather than live. The Vite dev server runs a WISP proxy at
// /wisp/ on this same origin; default the endpoint to it.
const LS_KEY = 'libxul-demo-opts';
const defaultWisp = `${location.protocol === 'https:' ? 'wss' : 'ws'}://${location.host}/wisp/`;
interface Opts { gpu: boolean; jit: boolean; wisp: string; }
const saved: Partial<Opts> = JSON.parse(localStorage.getItem(LS_KEY) || '{}');
const opts: Opts = {
  gpu: saved.gpu ?? false,   // default software (GECKO_GPU absent)
  jit: saved.jit ?? true,    // wasm JIT on unless GECKO_NOWASMJIT is set
  wisp: saved.wisp ?? defaultWisp,
};

wispInput.value = opts.wisp;
gpuToggle.checked = opts.gpu;
jitToggle.checked = opts.jit;

// GPU is presence-gated; the wasm JIT is on by default and disabled by GECKO_NOWASMJIT.
// With GPU on, also route content WebGL to a real host GL context (GECKO_GL_PASSTHROUGH).
const env: Record<string, string> = {};
if (opts.gpu) {
  env.GECKO_GPU = '1';
  env.GECKO_GL_PASSTHROUGH = '1';
}
if (!opts.jit) env.GECKO_NOWASMJIT = '1';

const gecko = new Gecko({
  canvas,
  // The vite plugin serves gecko.wasm + gecko.data at the server root.
  assetBase: '/',
  wispUrl: opts.wisp.trim() || undefined,
  env,
  print: (s) => console.log('[gecko]', s),
  printErr: (s) => console.warn('[gecko]', s),
});

await gecko.init();
console.log('[demo] engine ready');

// Persist the current control values and restart the engine to apply them.
function applyAndReload(): void {
  const next: Opts = { gpu: gpuToggle.checked, jit: jitToggle.checked, wisp: wispInput.value.trim() };
  localStorage.setItem(LS_KEY, JSON.stringify(next));
  location.reload();
}
gpuToggle.addEventListener('change', applyAndReload);
jitToggle.addEventListener('change', applyAndReload);
wispInput.addEventListener('change', applyAndReload);  // fires on commit (Enter/blur), not per keystroke

// Keep an explicit scheme (http:, data:, about:, …); otherwise treat as host → https://.
function normalizeUrl(input: string): string {
  const s = input.trim();
  if (!s) return '';
  if (/^[a-z][a-z0-9+.-]*:/i.test(s)) return s;
  return 'https://' + s;
}

urlInput.addEventListener('keydown', (e) => {
  if (e.key !== 'Enter') return;
  const url = normalizeUrl(urlInput.value);
  if (url) gecko.load(url);
});

// Initial page: an inline welcome doc (renders with no proxy).
const page = `<!doctype html><meta charset="utf-8">
<body style="font-family:sans-serif;padding:2rem;line-height:1.5">
  <h1 style="color:#b5179e;margin-top:0">gecko.js</h1>
  <p>This page is being laid out and painted by <b>Gecko</b> — Firefox's engine,
     compiled to WebAssembly — entirely inside your browser tab.</p>
  <p>Type a URL above and press Enter. <code>about:</code>/<code>data:</code> URLs
     work out of the box; <code>https://</code> sites go through the dev server's
     WISP proxy.</p>
  <input placeholder="type here (input is forwarded to the engine)" style="padding:.4rem;width:60%">
</body>`;
await gecko.load('data:text/html,' + encodeURIComponent(page));
console.log('[demo] page loaded');
