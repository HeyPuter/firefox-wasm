import { Gecko } from 'libxul.js';
import { chromeFs, prepareChromeFs, type ChromeAssetsProgress } from './chrome-fs';

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

await prepareChromeFs(setProgress);
setProgress({ phase: 'ready', percent: 1, message: 'Starting Gecko' });
console.log('[chrome-demo] chrome assets ready');

const BROWSER_CHROME_URL = 'chrome://browser/content/browser.xhtml';

// GECKO_CHROME=1 makes the engine use /gre/browser as its APP dir and register
// the browser chrome package. We still explicitly load browser.xhtml after init;
// that load is what creates the top-level Firefox chrome window.
// The chrome assets are installed into OPFS by prepareChromeFs() before this point,
// so gecko.init() only reads them from local browser storage.
const gecko = new Gecko({
  canvas,
  width: 1024,
  height: 768,
  assetBase: '/',
  env: { GECKO_CHROME: '1' },
  fs: chromeFs,
  // The chrome UI itself boots from local files; loading sites in tabs needs a
  // WISP endpoint -- set `wispUrl` and run one (e.g. wisp-server-node) for that.
  // wispUrl: 'ws://localhost:8787/',
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
} catch (e) {
  console.error('[chrome-demo] startup failed', e);
  status.textContent = e instanceof Error ? e.message : String(e);
  phase.textContent = 'Failed';
  percent.textContent = '';
}
