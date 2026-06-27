import { Gecko } from 'gecko.js';
import { prepareChromeFs, GRE_OPFS_PATH, PROFILE_OPFS_PATH, type ChromeAssetsProgress } from './chrome-fs';

const canvas = document.getElementById('screen') as HTMLCanvasElement;
const splash = document.getElementById('splash') as HTMLElement;
const status = document.getElementById('splash-status') as HTMLElement;
const phase = document.getElementById('progress-phase') as HTMLElement;
const percent = document.getElementById('progress-percent') as HTMLElement;
const fill = document.getElementById('progress-fill') as HTMLElement;
const progressbar = document.querySelector('.progress-track') as HTMLElement;
const consoleOutput = document.getElementById('console-output') as HTMLElement;

const nativeConsole = {
  log: console.log.bind(console),
  warn: console.warn.bind(console),
  error: console.error.bind(console),
};
const MAX_CONSOLE_LINES = 300;

function stringifyConsoleArg(arg: unknown): string {
  if (arg instanceof Error) return arg.stack || arg.message;
  if (typeof arg === 'string') return arg;
  try {
    return JSON.stringify(arg);
  } catch {
    return String(arg);
  }
}

function appendConsoleLine(level: 'log' | 'warn' | 'error', args: unknown[]): void {
  const line = document.createElement('div');
  line.className = `console-line ${level}`;

  const prefix = document.createElement('span');
  prefix.className = 'console-prefix';
  prefix.textContent = `[${level}] `;
  line.append(prefix, args.map(stringifyConsoleArg).join(' '));

  consoleOutput.appendChild(line);
  while (consoleOutput.childElementCount > MAX_CONSOLE_LINES) {
    consoleOutput.firstElementChild?.remove();
  }
  consoleOutput.scrollTop = consoleOutput.scrollHeight;
}

console.log = (...args: unknown[]) => {
  appendConsoleLine('log', args);
  nativeConsole.log(...args);
};
console.warn = (...args: unknown[]) => {
  appendConsoleLine('warn', args);
  nativeConsole.warn(...args);
};
console.error = (...args: unknown[]) => {
  appendConsoleLine('error', args);
  nativeConsole.error(...args);
};

function formatBytes(n: number): string {
  const units = ['B', 'KB', 'MB', 'GB'];
  let value = n;
  let unit = 0;
  while (value >= 1024 && unit < units.length - 1) {
    value /= 1024;
    unit++;
  }
  return `${value >= 10 || unit === 0 ? value.toFixed(0) : value.toFixed(1)} ${units[unit]}`;
}

function setProgress(p: ChromeAssetsProgress): void {
  const pct = p.percent == null ? undefined : Math.max(0, Math.min(1, p.percent));
  status.textContent = p.loaded && p.total
    ? `${p.message} · ${formatBytes(p.loaded)} / ${formatBytes(p.total)}`
    : p.message;
  phase.textContent = p.phase[0].toUpperCase() + p.phase.slice(1);
  if (pct == null) {
    progressbar.removeAttribute('aria-valuenow');
    percent.textContent = '';
    return;
  }
  const rounded = Math.round(pct * 100);
  fill.style.width = `${rounded}%`;
  progressbar.setAttribute('aria-valuenow', String(rounded));
  percent.textContent = `${rounded}%`;
}

const BROWSER_CHROME_URL = 'chrome://browser/content/browser.xhtml';

// The Vite dev/preview server runs a WISP proxy at /wisp/ on this same origin
// (see vite.config.ts). Default the engine's WISP endpoint to it so the chrome
// front-end can load sites in tabs out of the box.
const defaultWisp = `${location.protocol === 'https:' ? 'wss' : 'ws'}://${location.host}/wisp/`;

// Engine options are consumed when the engine boots (GECKO_GPU / GECKO_NOWASMJIT
// are read once at init, WISP installs in preRun), so they're persisted and
// applied on reload rather than live -- mirroring embed-demo.
const LS_KEY = 'chrome-demo-opts';
interface Opts { gpu: boolean; jit: boolean; wisp: string; }
const saved: Partial<Opts> = JSON.parse(localStorage.getItem(LS_KEY) || '{}');
const opts: Opts = {
  gpu: saved.gpu ?? true,    // GPU acceleration on by default
  jit: saved.jit ?? false,   // wasm JIT off by default (GECKO_NOWASMJIT set)
  wisp: saved.wisp ?? defaultWisp,
};

const gpuToggle = document.getElementById('opt-gpu') as HTMLInputElement;
const jitToggle = document.getElementById('opt-jit') as HTMLInputElement;
const wispInput = document.getElementById('opt-wisp') as HTMLInputElement;
gpuToggle.checked = opts.gpu;
jitToggle.checked = opts.jit;
wispInput.value = opts.wisp;

// Persist the current control values and restart the engine to apply them.
function applyAndReload(): void {
  const next: Opts = { gpu: gpuToggle.checked, jit: jitToggle.checked, wisp: wispInput.value.trim() };
  localStorage.setItem(LS_KEY, JSON.stringify(next));
  location.reload();
}
gpuToggle.addEventListener('change', applyAndReload);
jitToggle.addEventListener('change', applyAndReload);
wispInput.addEventListener('change', applyAndReload);  // fires on commit (Enter/blur), not per keystroke

// GPU is presence-gated; with GPU on, also route content WebGL to a real host GL
// context (GECKO_GL_PASSTHROUGH). The wasm JIT is on unless GECKO_NOWASMJIT is set.
const optEnv: Record<string, string> = { GECKO_CHROME: '1' };
if (opts.gpu) {
  optEnv.GECKO_GPU = '1';
  optEnv.GECKO_GL_PASSTHROUGH = '1';
}
if (!opts.jit) optEnv.GECKO_NOWASMJIT = '1';

await prepareChromeFs(setProgress);
setProgress({ phase: 'ready', percent: 1, message: 'Starting Gecko' });
console.log('[chrome-demo] chrome assets ready');

// GECKO_CHROME=1 makes the engine use /gre/browser as its APP dir and register
// the browser chrome package. We still explicitly load browser.xhtml after init;
// that load is what creates the top-level Firefox chrome window.
// The chrome assets are installed into OPFS by prepareChromeFs() before this point,
// so gecko.init() only reads them from local browser storage.
const gecko = new Gecko({
  canvas,
  // Fill the viewport; a debounced window-resize listener keeps it in sync (below).
  width: window.innerWidth,
  height: window.innerHeight,
  assetBase: '/',
  env: optEnv,
  // GRE: the extracted tar lives at OPFS `${GRE_OPFS_PATH}`; libxul builds its
  // built-in OPFS provider over it (consulted provider-first for /gre, baked
  // gecko.data as fallback). Profile: persistent OPFS at `${PROFILE_OPFS_PATH}`.
  fs: GRE_OPFS_PATH,
  profile: PROFILE_OPFS_PATH,
  // The chrome UI itself boots from local files; loading sites in tabs goes
  // through the WISP endpoint (defaults to the dev server's /wisp/ proxy).
  wispUrl: opts.wisp.trim() || undefined,
  print: (s) => console.log('[gecko]', s),
  printErr: (s) => console.warn('[gecko]', s),
});

try {
  await gecko.init();
  console.log("init done");
  setProgress({ phase: 'ready', percent: 1, message: 'Loading browser chrome' });
  console.log('[chrome-demo] loading browser chrome');
  await gecko.load(BROWSER_CHROME_URL);
  console.log('[chrome-demo] Firefox front-end booted');
  canvas.classList.add('ready');
  splash.classList.add('done');
  canvas.focus();

  // Debug/test hook: open a site in a tab from the console (mirrors embed-demo's
  // window.geckoLoad). The chrome's own address bar is the normal way in.
  (window as unknown as { geckoLoad: (u: string) => unknown }).geckoLoad = (u) => gecko.load(u);

  // Keep the engine sized to the viewport. The window may have changed during the
  // (slow) boot, so correct once now, then track resizes with a ~200ms debounce
  // (resize reflows + recomposites the whole chrome, so coalesce bursts).
  await gecko.resize(window.innerWidth, window.innerHeight);
  let resizeTimer: ReturnType<typeof setTimeout> | undefined;
  window.addEventListener('resize', () => {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(() => gecko.resize(window.innerWidth, window.innerHeight), 200);
  });
} catch (e) {
  console.error('[chrome-demo] startup failed', e);
  status.textContent = e instanceof Error ? e.message : String(e);
  phase.textContent = 'Failed';
  percent.textContent = '';
}
