import { Gecko, type FsProvider } from "gecko.js";
import "./styles.css";
import {
  prepareChromeFs,
  PROFILE_OPFS_PATH,
  type ChromeAssetsProgress,
} from "./chrome-fs";

// Injected by vite.config (define): the served engine wasm { url, compressed }.
declare const __GECKO_WASM__: { url: string; compressed: boolean };
declare const __GECKO_ST__: boolean;
declare global {
  interface ImportMeta {
    env: {
      VITE_PUTER_BRANDING?: string;
      VITE_DISABLE_BRANDING?: string;
    };
  }
}

// VITE_DISABLE_BRANDING strips the Firefox logo: the hero tile (and the "×"
// connector, leaving just the WebAssembly mark) plus the favicon, which uses
// the same artwork.
if (import.meta.env.VITE_DISABLE_BRANDING) {
  document.querySelector(".firefox-tile")?.remove();
  document.querySelector(".logo-x")?.remove();
  document.getElementById("favicon")?.remove();
}

const canvas = document.getElementById("screen") as HTMLCanvasElement;
const splash = document.getElementById("splash") as HTMLElement;
const splashShell = document.getElementById("splash-shell") as HTMLElement;
const stageCard = document.getElementById("stage-card") as HTMLElement;
const stage = document.querySelector(".stage") as HTMLElement;
const status = document.getElementById("splash-status") as HTMLElement;
const phase = document.getElementById("progress-phase") as HTMLElement;
const percent = document.getElementById("progress-percent") as HTMLElement;
const fill = document.getElementById("progress-fill") as HTMLElement;
const progressbar = document.querySelector(".progress-track") as HTMLElement;
const consoleOutput = document.getElementById("console-output") as HTMLElement;

type UiPhase = "loading" | "ready" | "console";
function setUiPhase(next: UiPhase): void {
  splashShell.dataset.phase = next;
  stageCard.dataset.phase = next;
  stage.dataset.phase = next;
}

const nativeConsole = {
  log: console.log.bind(console),
  warn: console.warn.bind(console),
  error: console.error.bind(console),
};
const MAX_CONSOLE_LINES = 300;

function stringifyConsoleArg(arg: unknown): string {
  if (arg instanceof Error) return arg.stack || arg.message;
  if (typeof arg === "string") return arg;
  try {
    return JSON.stringify(arg);
  } catch {
    return String(arg);
  }
}

function appendConsoleLine(
  level: "log" | "warn" | "error",
  args: unknown[],
): void {
  const line = document.createElement("div");
  line.className = `console-line ${level}`;

  const prefix = document.createElement("span");
  prefix.className = "console-prefix";
  prefix.textContent = `[${level}] `;
  line.append(prefix, args.map(stringifyConsoleArg).join(" "));

  consoleOutput.appendChild(line);
  while (consoleOutput.childElementCount > MAX_CONSOLE_LINES) {
    consoleOutput.firstElementChild?.remove();
  }
  consoleOutput.scrollTop = consoleOutput.scrollHeight;
}

console.log = (...args: unknown[]) => {
  appendConsoleLine("log", args);
  nativeConsole.log(...args);
};
console.warn = (...args: unknown[]) => {
  appendConsoleLine("warn", args);
  nativeConsole.warn(...args);
};
console.error = (...args: unknown[]) => {
  appendConsoleLine("error", args);
  nativeConsole.error(...args);
};

function formatBytes(n: number): string {
  const units = ["B", "KB", "MB", "GB"];
  let value = n;
  let unit = 0;
  while (value >= 1024 && unit < units.length - 1) {
    value /= 1024;
    unit++;
  }
  return `${value >= 10 || unit === 0 ? value.toFixed(0) : value.toFixed(1)} ${units[unit]}`;
}

function setProgress(p: ChromeAssetsProgress): void {
  const pct =
    p.percent == null ? undefined : Math.max(0, Math.min(1, p.percent));
  status.textContent =
    p.loaded && p.total
      ? `${p.message} · ${formatBytes(p.loaded)} / ${formatBytes(p.total)}`
      : p.message;
  phase.textContent = p.phase[0].toUpperCase() + p.phase.slice(1);
  if (pct == null) {
    progressbar.removeAttribute("aria-valuenow");
    percent.textContent = "";
    return;
  }
  const rounded = Math.round(pct * 100);
  fill.style.width = `${rounded}%`;
  progressbar.setAttribute("aria-valuenow", String(rounded));
  percent.textContent = `${rounded}%`;
}

const BROWSER_CHROME_URL = "chrome://browser/content/browser.xhtml";

// The Vite dev/preview server runs a WISP proxy at /wisp/ on this same origin
// (see vite.config.ts). Default the engine's WISP endpoint to it so the chrome
// front-end can load sites in tabs out of the box. Resolved RELATIVE to the
// page URL (the build uses vite base './' so a deploy can live in any
// subdirectory, with its wisp proxy next to it).
const wispUrl = new URL("wisp/", location.href);
wispUrl.protocol = location.protocol === "https:" ? "wss:" : "ws:";
let defaultWisp = wispUrl.href;
const puterBranding = Boolean(import.meta.env.VITE_PUTER_BRANDING);

if (puterBranding) {
  await fetch("https://sensible-ship-8305.puter.work/")
    .then((r) => r.text())
    .then((t) => {
      defaultWisp = t.trim();
    });
}

// Engine options are consumed when the engine boots (GECKO_GPU / GECKO_NOWASMJIT
// are read once at init, WISP installs in preRun). Init only happens on the
// Start click, so the controls are read (and persisted) right then -- no reload.
const LS_KEY = "chrome-demo-opts";
interface Opts {
  gpu: boolean;
  jit: boolean;
  wisp: string;
}
const saved: Partial<Opts> = JSON.parse(localStorage.getItem(LS_KEY) || "{}");
const opts: Opts = {
  // Single-threaded build: GPU/WebRender present needs a compositor/Renderer
  // thread + JSPI suspension, neither available under ST -- force the software
  // RenderDocument+blit path (same as the content embed).
  gpu: __GECKO_ST__ ? false : (saved.gpu ?? true),
  jit: saved.jit ?? false, // wasm JIT off by default (GECKO_NOWASMJIT set)
  wisp: puterBranding ? defaultWisp : (saved.wisp ?? defaultWisp),
};

const gpuToggle = document.getElementById("opt-gpu") as HTMLInputElement;
const jitToggle = document.getElementById("opt-jit") as HTMLInputElement;
const wispInput = document.getElementById("opt-wisp") as HTMLInputElement;
const advanced = document.querySelector(".advanced") as HTMLDetailsElement;
if (puterBranding) {
  stageCard.classList.add("puter-branded");
  wispInput.disabled = true;
}
gpuToggle.checked = opts.gpu;
jitToggle.checked = opts.jit;
wispInput.value = opts.wisp;

// Read the current control values, persisting them for the next visit.
function collectOpts(): Opts {
  const next: Opts = {
    gpu: gpuToggle.checked,
    jit: jitToggle.checked,
    wisp: puterBranding ? defaultWisp : wispInput.value.trim(),
  };
  localStorage.setItem(LS_KEY, JSON.stringify(next));
  return next;
}

// GPU is presence-gated; with GPU on, also route content WebGL to a real host GL
// context (GECKO_GL_PASSTHROUGH). The wasm JIT is on unless GECKO_NOWASMJIT is set.
function buildEnv(o: Opts): Record<string, string> {
  const optEnv: Record<string, string> = { GECKO_CHROME: "1" };
  if (o.gpu) {
    optEnv.GECKO_GPU = "1";
    optEnv.GECKO_GL_PASSTHROUGH = "1";
    // In-process WebRender display-list handoff (skip the content->compositor IPDL
    // Pickle round-trip). Opt-in engine flag (GECKO_WR_DIRECT).
    optEnv.GECKO_WR_DIRECT = "1";
    // Async pan/zoom (correctly targets nested scroll containers via the
    // GetDocument/SetTargetAPZC fix).
    optEnv.GECKO_APZ = "1";
  }
  if (!o.jit) optEnv.GECKO_NOWASMJIT = "1";

  // Generic `?env.FOO=bar` knob (mirrors embed-demo): forward arbitrary engine env
  // vars from the URL, e.g. ?env.GECKO_WASM_INTERP=1 to run content WebAssembly in
  // the in-process interpreter instead of the host passthrough.
  for (const [k, v] of new URLSearchParams(location.search)) {
    if (k.startsWith("env.")) optEnv[k.slice(4)] = v;
  }
  return optEnv;
}

// --- Auto asset prep on load, explicit-Launch engine init -----------------
// The browser assets start downloading + decompressing immediately on page
// load (no gating click). Once they're ready the panel shows a single Launch
// button: the emscripten/Gecko init stays gated behind that click because it
// spins up the audio AudioWorklet, and the click is the user gesture browsers
// require before audio (and other gesture-gated APIs) can start.
const startBtn = document.getElementById("start-btn") as HTMLButtonElement;

// The engine needs WebAssembly JSPI (the GPU present path suspends on it, wired
// into the glue at link time) -- without it the wasm won't run. Feature-detect
// and keep Launch greyed out when it's missing; Firefox has JSPI behind an
// about:config flag, so give Firefox users the recipe.
// The single-threaded engine build (GECKO_ST=1) uses NO JSPI at all -- it runs
// entirely on the main thread with a JS-driven tick, so the JSPI requirement
// (which only applied to the threaded GPU-present path) does not apply.
const isSingleThreaded = __GECKO_ST__;
const hasJspi = isSingleThreaded ||
  (typeof (WebAssembly as { Suspending?: unknown }).Suspending === "function" &&
   typeof (WebAssembly as { promising?: unknown }).promising === "function");
if (!hasJspi) {
  const note = document.getElementById("jspi-note") as HTMLElement;
  note.textContent =
    "This browser doesn't support WebAssembly JSPI, which Firefox WASM needs to run.";
  if (navigator.userAgent.includes("Firefox")) {
    const hint = document.createElement("span");
    hint.append(
      " To enable it in Firefox: open ",
      Object.assign(document.createElement("code"), {
        textContent: "about:config",
      }),
      ", set ",
      Object.assign(document.createElement("code"), {
        textContent: "javascript.options.wasm_js_promise_integration",
      }),
      " to ",
      Object.assign(document.createElement("code"), { textContent: "true" }),
      ", then reload this page.",
    );
    note.append(hint);
  }
  note.hidden = false;
}

function fail(e: unknown): void {
  console.error("[chrome-demo] startup failed", e);
  setUiPhase("console");
  startBtn.disabled = false;
  startBtn.textContent = "Retry";
  startBtn.onclick = () => location.reload();
}

// Launch is only actionable once the assets have finished loading.
startBtn.onclick = () => void start();
startBtn.disabled = true;
setUiPhase("loading");

// --- combined download progress --------------------------------------------
// The chrome-assets archive and the engine wasm download concurrently and share
// the single progress bar (summed bytes across both). Non-download updates from
// the assets side (decompressing/ready) pass through only once the wasm is also
// in; until then the bar keeps tracking the combined download.
const dl = {
  assets: { loaded: 0, total: 0 },
  wasm: { loaded: 0, total: 0, done: false },
};

function renderDownloads(): void {
  const loaded = dl.assets.loaded + dl.wasm.loaded;
  const total =
    dl.assets.total && dl.wasm.total
      ? dl.assets.total + dl.wasm.total
      : undefined;
  setProgress({
    phase: "downloading",
    loaded,
    total,
    percent: total ? loaded / total : undefined,
    message: "Downloading Firefox",
  });
}

function assetsProgress(p: ChromeAssetsProgress): void {
  if (p.phase === "downloading") {
    dl.assets.loaded = p.loaded ?? dl.assets.loaded;
    dl.assets.total = p.total ?? dl.assets.total;
  } else {
    // The assets download is over (decompress/install underway): count it fully.
    if (dl.assets.total) dl.assets.loaded = dl.assets.total;
    if (dl.wasm.done) {
      setProgress(p);
      return;
    }
  }
  renderDownloads();
}

// Optimistic engine-wasm prefetch, started at page load in parallel with the
// chrome assets: stream it down with progress, then hand gecko.init() a blob:
// URL so the loader's own wasm fetch resolves instantly from memory. The blob
// is typed application/wasm so instantiateStreaming still accepts it (the
// release .zst goes through the loader's arrayBuffer+zstd path regardless).
async function fetchWasmBlob(): Promise<string> {
  const url = new URL(__GECKO_WASM__.url, location.href).href;
  const r = await fetch(url);
  if (!r.ok || !r.body)
    throw new Error(`engine wasm fetch failed (${r.status}) for ${url}`);
  dl.wasm.total = Number(r.headers.get("Content-Length")) || 0;
  const reader = r.body.getReader();
  const chunks: Uint8Array[] = [];
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    chunks.push(value);
    dl.wasm.loaded += value.byteLength;
    renderDownloads();
  }
  dl.wasm.done = true;
  if (!dl.wasm.total) dl.wasm.total = dl.wasm.loaded;
  renderDownloads();
  return URL.createObjectURL(
    new Blob(chunks as BlobPart[], { type: "application/wasm" }),
  );
}

// Both kicked off immediately so the big downloads (~18 MB assets + the engine
// wasm) overlap the time the user spends reading the page. chromeFsReady
// resolves to the in-memory tar FsProvider handed to gecko.init() on Launch;
// wasmBlobReady to the blob: URL for the engine wasm.
const chromeFsReady: Promise<FsProvider> = prepareChromeFs(assetsProgress);
const wasmBlobReady: Promise<string> = fetchWasmBlob();
Promise.all([chromeFsReady, wasmBlobReady])
  .then(() => {
    console.log("[chrome-demo] chrome assets + engine wasm ready");
    setUiPhase("ready");
    // Stays greyed out (never enabled) when the browser lacks JSPI.
    startBtn.disabled = !hasJspi;
  })
  .catch(fail);

async function start(): Promise<void> {
  setUiPhase("console");
  startBtn.disabled = true;
  gpuToggle.disabled = true;
  jitToggle.disabled = true;
  wispInput.disabled = true;
  // Collapse the advanced options so the startup log has room without scrolling.
  advanced.open = false;
  startBtn.textContent = "Starting…";

  const chosen = collectOpts();
  const optEnv = buildEnv(chosen);

  // GECKO_CHROME=1 makes the engine use /gre/browser as its APP dir and register
  // the browser chrome package. We still explicitly load browser.xhtml after init;
  // that load is what creates the top-level Firefox chrome window.
  // The chrome assets are already downloaded + decompressed into memory (the
  // Download phase above), so gecko.init() reads them straight from the
  // in-memory tar.
  const gecko = new Gecko({
    canvas,
    // Fill the viewport; a debounced window-resize listener keeps it in sync (below).
    width: window.innerWidth,
    height: window.innerHeight,
    // The engine wasm was prefetched into memory at page load (its download is
    // part of the progress bar); hand the loader the blob: URL so its own
    // fetch resolves instantly. Launch is only enabled once wasmBlobReady
    // resolved, so this await is instant.
    wasm: {
      url: await wasmBlobReady,
      compressed: __GECKO_WASM__.compressed,
    },
    env: optEnv,
    // GRE: an FsProvider over the in-memory decompressed tar (consulted
    // provider-first for /gre, baked gecko.data as fallback). Profile:
    // persistent OPFS at `${PROFILE_OPFS_PATH}`.
    // Launch is only enabled once chromeFsReady resolved, so this is instant.
    fs: await chromeFsReady,
    profile: PROFILE_OPFS_PATH,
    // The chrome UI itself boots from local files; loading sites in tabs goes
    // through the WISP endpoint (defaults to the dev server's /wisp/ proxy).
    wispUrl: chosen.wisp.trim() || undefined,
    print: (s) => console.log("[gecko]", s),
    printErr: (s) => console.warn("[gecko]", s),
  });

  try {
    await gecko.init();
    console.log("init done");
    setProgress({
      phase: "ready",
      percent: 1,
      message: "Loading browser chrome",
    });
    console.log("[chrome-demo] loading browser chrome");
    await gecko.load(BROWSER_CHROME_URL);
    console.log("[chrome-demo] Firefox front-end booted");
    const PRELOADED_BOOKMARKS = [
      {
        title: "Puter Developer",
        url: "https://developer.puter.com/",
        guid: "chromedemo02",
        favicon: "https://puter.com/dist/favicons/favicon-32x32.png",
        faviconURL:
          "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAACAAAAAgCAYAAABzenr0AAAABGdBTUEAALGPC/xhBQAAACBjSFJNAAB6JgAAgIQAAPoAAACA6AAAdTAAAOpgAAA6mAAAF3CculE8AAAABmJLR0QA/wD/AP+gvaeTAAAACXBIWXMAAAsTAAALEwEAmpwYAAAAB3RJTUUH5gUVACYT5I64GAAABTxJREFUWMPtl1tsFGUUx3/fzOyl7XZ3WyiFFpGGAEFQBAQpBF/wAkRQjIRLMDbBcFMJGuVBghIw3AXUVKIhES+AAikFgRAjCVikJERuVrRcWlp7s9fd7XZ3Z2Z3xodpoYRuF4gGHziPM/Od73/O+Z//OSPw/mlyH026n5c/APC/AKDc9QkDMNp5KwkQ7c/MDi4LK6w7DC0xgFi7cwFCwKiRdnJHJwExis8E+KNUMO7JJIYMciBL0NAU4fjJNqqqFJBFQvcibhua4LDBhPFORo+w4fVEUWQb06Z4aW4xiEYFHo9KRWWU4Y+6Ka+IEggYDMhRCLQGWbW+icM/mpii+1Qo8S5P90q893Yas2ek8tsljYrKKP0eUjhwxMeHmwKkeRT278wmOyvKwrfqOH5SRdNM+mbZWLo4nc1rexOOVHPshNRtOboEIAQsWZDG9GkpLFvxNwWHwoTD4EwSCNMgHITJE5NITtZ5dWEtxcUGKBYfyq7rLFtRT6ork8WveSk67UPT41f6dmwGDBviYO6sFDZurWXn9yHCEevLiGoSDgs86YLnnk6m5PcQ5y9oVq3FTY+RsEHhoSCPDU2if3YUYuJuAJiMGeWkrS1E4eHQrc4NyB3joODbPkydlMK4sR7yP3KT01+HzkwSgopKneTkZBbOc+H2aLe+7xYAkOyU8PlUWts6nTIhK0th85oMgm06L82tZuHSJvr19TIh19GpDS2vl8s0lq/2MeXZPizIs9/6PhEH6hqiZGY6ye5tcPkaVgZMyOghU1YeYtWGBkpLZZBUiorbCEVMSxNuZABCYZMdX/no00th4lMpfPpFCxHNdgcZkAVFp0I0NzuYn5eMTdEtLQAulKjMW9LMlTIZZOt0U7NJOGwBtASpky8TNM3AbpeQJLosw+0ZEFBXF2P9Vh9b1mZhdzSwe1+YymqBrkNTM7hcApcLME38rSaGIeH1WN0TChkEghI90+HxoU5mz3Bx7EQzobByk0uJSoAMB48GQcDSRRm8+CWoqklVTZC58xuZOb0Hi+alYpgGK9dW4G91s2l1OnabYM/+erbk6+zIz2TE8CSKTgXJ3x4EU3QJQMb5xkriWOlljcLDQX4p1pBkhbFP2Nm1N0BtvUxNrcGE3BQulvgoOi1RVW2Q0cOBougUHlFp8Ql272vls+0BGhpFXDHqfhZI4A8YFP0cwu2SeH6SCyHg3FmVa1c1XpmViiQLKso0vr6q07+vnQE5EAqZHDjUZkWcYDB1L9Qdk0+BwYPsCAGxmHVKKJ1ZL0CGaAxy+tvJ7h1tZ1zibS9+BkwYPdLB1Ek2PG6JqZPdfPNdE9V1StewJcGRn4JMm5LB5x9ncqFEp+x6iD2FGq1BW5f1jw/AhF49Zbas6YkejZHRw8mFkgDrtgTQdet2YViB3whUgvPnImz8xM+ObRlAGy+/4MVur2HbdiPuaJbiAUhPk8nOkig4UMeZs2H8/ihhFRAgKzBnpovBA51MfiaNgYP1GyBaQwYtvgi79tTyV7VgyGBP3OjjA5CgvFKn4IcIy5c9zITxdo4eU61WMuCRQQ7eedPLzr2NpKZ6mJ/ntaRWEvx6LkLRKYOtG3LolWFSeMhPdwjickBVTd5f00jBQQf+1hiXSjVLbmNW6g3DwO9T0VQXNqVdYgU0Ncd4/d16hg9zUFOjcaXc7Jbqotsfkw557WinDtQyLMjzkjfHTU2tygfr6jl/sdNFJlb3CJFwNxT3+mckAe5UCVUzrFlwj/v13W/F7WYAvoBxW3buJZB7t8RL738M4F+wBwD+AfCAE+6E0NWUAAAAJXRFWHRkYXRlOmNyZWF0ZQAyMDIyLTA1LTIxVDAwOjM4OjE0KzAwOjAw1MIh5gAAACV0RVh0ZGF0ZTptb2RpZnkAMjAyMi0wNS0yMVQwMDozODoxNCswMDowMKWfmVoAAAAgdEVYdHNvZnR3YXJlAGh0dHBzOi8vaW1hZ2VtYWdpY2sub3JnvM8dnQAAABh0RVh0VGh1bWI6OkRvY3VtZW50OjpQYWdlcwAxp/+7LwAAABh0RVh0VGh1bWI6OkltYWdlOjpIZWlnaHQAMTkyQF1xVQAAABd0RVh0VGh1bWI6OkltYWdlOjpXaWR0aAAxOTLTrCEIAAAAGXRFWHRUaHVtYjo6TWltZXR5cGUAaW1hZ2UvcG5nP7JWTgAAABd0RVh0VGh1bWI6Ok1UaW1lADE2NTMwOTM0OTS1BHGJAAAAD3RFWHRUaHVtYjo6U2l6ZQAwQkKUoj7sAAAAVnRFWHRUaHVtYjo6VVJJAGZpbGU6Ly8vbW50bG9nL2Zhdmljb25zLzIwMjItMDUtMjEvYzE2ZjMwY2FjYmRiYzdiNzg5NTg4N2RhNGM5YmY5MGMuaWNvLnBuZxxhfMMAAAAASUVORK5CYII=",
      },
      {
        title: "Firefox WASM Github",
        url: "https://github.com/HeyPuter/firefox-wasm",
        guid: "chromedemo01",
        favicon: "https://github.githubassets.com/favicons/favicon.svg",
        faviconURL:
          "data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMzIiIGhlaWdodD0iMzIiIHZpZXdCb3g9IjAgMCAzMiAzMiIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPHBhdGggZmlsbC1ydWxlPSJldmVub2RkIiBjbGlwLXJ1bGU9ImV2ZW5vZGQiIGQ9Ik0xNiAwQzcuMTYgMCAwIDcuMTYgMCAxNkMwIDIzLjA4IDQuNTggMjkuMDYgMTAuOTQgMzEuMThDMTEuNzQgMzEuMzIgMTIuMDQgMzAuODQgMTIuMDQgMzAuNDJDMTIuMDQgMzAuMDQgMTIuMDIgMjguNzggMTIuMDIgMjcuNDRDOCAyOC4xOCA2Ljk2IDI2LjQ2IDYuNjQgMjUuNTZDNi40NiAyNS4xIDUuNjggMjMuNjggNSAyMy4zQzQuNDQgMjMgMy42NCAyMi4yNiA0Ljk4IDIyLjI0QzYuMjQgMjIuMjIgNy4xNCAyMy40IDcuNDQgMjMuODhDOC44OCAyNi4zIDExLjE4IDI1LjYyIDEyLjEgMjUuMkMxMi4yNCAyNC4xNiAxMi42NiAyMy40NiAxMy4xMiAyMy4wNkM5LjU2IDIyLjY2IDUuODQgMjEuMjggNS44NCAxNS4xNkM1Ljg0IDEzLjQyIDYuNDYgMTEuOTggNy40OCAxMC44NkM3LjMyIDEwLjQ2IDYuNzYgOC44MiA3LjY0IDYuNjJDNy42NCA2LjYyIDguOTggNi4yIDEyLjA0IDguMjZDMTMuMzIgNy45IDE0LjY4IDcuNzIgMTYuMDQgNy43MkMxNy40IDcuNzIgMTguNzYgNy45IDIwLjA0IDguMjZDMjMuMSA2LjE4IDI0LjQ0IDYuNjIgMjQuNDQgNi42MkMyNS4zMiA4LjgyIDI0Ljc2IDEwLjQ2IDI0LjYgMTAuODZDMjUuNjIgMTEuOTggMjYuMjQgMTMuNCAyNi4yNCAxNS4xNkMyNi4yNCAyMS4zIDIyLjUgMjIuNjYgMTguOTQgMjMuMDZDMTkuNTIgMjMuNTYgMjAuMDIgMjQuNTIgMjAuMDIgMjYuMDJDMjAuMDIgMjguMTYgMjAgMjkuODggMjAgMzAuNDJDMjAgMzAuODQgMjAuMyAzMS4zNCAyMS4xIDMxLjE4QzI3LjQyIDI5LjA2IDMyIDIzLjA2IDMyIDE2QzMyIDcuMTYgMjQuODQgMCAxNiAwVjBaIiBmaWxsPSIjMjQyOTJFIi8+Cjwvc3ZnPgo=",
      },
    ];

    await gecko.evalChrome(`(() => {
      const seed = async () => {
        const SEEDED_PREF = 'chrome-demo.bookmarks.seeded';
        if (Services.prefs.getBoolPref(SEEDED_PREF, false)) return;
        const bookmarks = ${JSON.stringify(PRELOADED_BOOKMARKS)};
        await PlacesUtils.bookmarks.insertTree({
          guid: PlacesUtils.bookmarks.toolbarGuid,
          children: bookmarks.map(bm => ({ title: bm.title, url: bm.url, guid: bm.guid })),
        });
        for (const bm of bookmarks) {
          const pageURI = Services.io.newURI(bm.url);
          const faviconURI = Services.io.newURI(bm.favicon);
          const faviconURL = Services.io.newURI(bm.faviconURL);
          await PlacesUtils.favicons.setFaviconForPage(
            pageURI,
            faviconURI,
            faviconURL,
            Date.now() * 1000 + 365 * 24 * 3600 * 1e6
          );
        };
        Services.prefs.setBoolPref(SEEDED_PREF, true);
        setTimeout(() => BookmarkingUI.updateEmptyToolbarMessage().catch(() => {}), 250);
      };
      const { PlacesBrowserStartup } = ChromeUtils.importESModule(
        'moz-src:///browser/components/places/PlacesBrowserStartup.sys.mjs');
      if (PlacesBrowserStartup._placesBrowserInitComplete) { seed(); return 'seeded-now'; }
      const o = () => {
        Services.obs.removeObserver(o, 'places-browser-init-complete');
        seed();
      };
      Services.obs.addObserver(o, 'places-browser-init-complete');
      return 'seed-deferred';
    })()`);

    await gecko.evalChrome(
      `setToolbarVisibility(document.getElementById('PersonalToolbar'), 'always'); 'ok'`,
    );

    // Default the search engine to DuckDuckGo. Seeded once (localStorage-gated)
    // so a user picking a different engine later isn't overridden on the next
    // visit. This Firefox has no Services.search (the search service is a plain
    // ESM singleton now); import it via moz-src. Fire-and-forget behind its
    // async init(). (Key is -v2: v1 was burned by a broken seed attempt.)
    const SEARCH_SEEDED_KEY = "chrome-demo-search-seeded-v2";
    if (!localStorage.getItem(SEARCH_SEEDED_KEY)) {
      localStorage.setItem(SEARCH_SEEDED_KEY, "1");
      void gecko.evalChrome(`(() => {
        (async () => {
          const { SearchService } = ChromeUtils.importESModule(
            'moz-src:///toolkit/components/search/SearchService.sys.mjs');
          await SearchService.init();
          const engine = SearchService.getEngineByName('DuckDuckGo');
          if (!engine) throw new Error('DuckDuckGo engine not found');
          await SearchService.setDefault(engine, SearchService.CHANGE_REASON.USER);
          console.log('search seed: default is now ' + (await SearchService.getDefault()).name);
        })().catch(e => console.error('search seed: ' + e));
        return 'search-seed-started';
      })()`);
    }

    // Autoload the default page into the FIRST tab (the one browser.xhtml opened
    // at startup, still selected at this point). Only this initial tab is driven;
    // new tabs (Ctrl+T / +) keep the regular about:newtab. Not awaited so the
    // chrome appears immediately while the page loads.
    void gecko.evalChrome(
      `openTrustedLinkIn('https://developer.puter.com/', 'current'); 'ok'`,
    );

    canvas.classList.add("ready");
    splash.classList.add("done");
    canvas.focus();

    // Debug/test hook: open a site in a tab from the console (mirrors embed-demo's
    // window.geckoLoad). The chrome's own address bar is the normal way in.
    (window as unknown as { geckoLoad: (u: string) => unknown }).geckoLoad = (
      u,
    ) => gecko.load(u);
    (
      window as unknown as { geckoEvalChrome: (js: string) => Promise<string> }
    ).geckoEvalChrome = (js) => gecko.evalChrome(js);

    // Keep the engine sized to the viewport. The window may have changed during the
    // (slow) boot, so correct once now, then track resizes with a ~200ms debounce
    // (resize reflows + recomposites the whole chrome, so coalesce bursts).
    await gecko.resize(window.innerWidth, window.innerHeight);
    let resizeTimer: ReturnType<typeof setTimeout> | undefined;
    window.addEventListener("resize", () => {
      clearTimeout(resizeTimer);
      resizeTimer = setTimeout(
        () => gecko.resize(window.innerWidth, window.innerHeight),
        200,
      );
    });
  } catch (e) {
    fail(e);
  }
}
