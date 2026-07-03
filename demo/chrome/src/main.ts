import { Gecko } from "gecko.js";
import {
  prepareChromeFs,
  GRE_OPFS_PATH,
  PROFILE_OPFS_PATH,
  type ChromeAssetsProgress,
} from "./chrome-fs";

// Injected by vite.config (define): the served engine wasm { url, compressed }.
declare const __GECKO_WASM__: { url: string; compressed: boolean };

const canvas = document.getElementById("screen") as HTMLCanvasElement;
const splash = document.getElementById("splash") as HTMLElement;
const status = document.getElementById("splash-status") as HTMLElement;
const phase = document.getElementById("progress-phase") as HTMLElement;
const percent = document.getElementById("progress-percent") as HTMLElement;
const fill = document.getElementById("progress-fill") as HTMLElement;
const progressbar = document.querySelector(".progress-track") as HTMLElement;
const consoleOutput = document.getElementById("console-output") as HTMLElement;

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
// front-end can load sites in tabs out of the box.
const defaultWisp = `${location.protocol === "https:" ? "wss" : "ws"}://${location.host}/wisp/`;

// Engine options are consumed when the engine boots (GECKO_GPU / GECKO_NOWASMJIT
// are read once at init, WISP installs in preRun), so they're persisted and
// applied on reload rather than live -- mirroring embed-demo.
const LS_KEY = "chrome-demo-opts";
interface Opts {
  gpu: boolean;
  jit: boolean;
  wisp: string;
}
const saved: Partial<Opts> = JSON.parse(localStorage.getItem(LS_KEY) || "{}");
const opts: Opts = {
  gpu: saved.gpu ?? true, // GPU acceleration on by default
  jit: saved.jit ?? false, // wasm JIT off by default (GECKO_NOWASMJIT set)
  wisp: saved.wisp ?? defaultWisp,
};

const gpuToggle = document.getElementById("opt-gpu") as HTMLInputElement;
const jitToggle = document.getElementById("opt-jit") as HTMLInputElement;
const wispInput = document.getElementById("opt-wisp") as HTMLInputElement;
gpuToggle.checked = opts.gpu;
jitToggle.checked = opts.jit;
wispInput.value = opts.wisp;

// Persist the current control values and restart the engine to apply them.
function applyAndReload(): void {
  const next: Opts = {
    gpu: gpuToggle.checked,
    jit: jitToggle.checked,
    wisp: wispInput.value.trim(),
  };
  localStorage.setItem(LS_KEY, JSON.stringify(next));
  location.reload();
}
gpuToggle.addEventListener("change", applyAndReload);
jitToggle.addEventListener("change", applyAndReload);
wispInput.addEventListener("change", applyAndReload); // fires on commit (Enter/blur), not per keystroke

// GPU is presence-gated; with GPU on, also route content WebGL to a real host GL
// context (GECKO_GL_PASSTHROUGH). The wasm JIT is on unless GECKO_NOWASMJIT is set.
const optEnv: Record<string, string> = { GECKO_CHROME: "1" };
if (opts.gpu) {
  optEnv.GECKO_GPU = "1";
  optEnv.GECKO_GL_PASSTHROUGH = "1";
  // In-process WebRender display-list handoff (skip the content->compositor IPDL
  // Pickle round-trip). Opt-in engine flag (GECKO_WR_DIRECT).
  optEnv.GECKO_WR_DIRECT = "1";
  // Async pan/zoom (correctly targets nested scroll containers via the
  // GetDocument/SetTargetAPZC fix).
  optEnv.GECKO_APZ = "1";
}
if (!opts.jit) optEnv.GECKO_NOWASMJIT = "1";

// Generic `?env.FOO=bar` knob (mirrors embed-demo): forward arbitrary engine env
// vars from the URL, e.g. ?env.GECKO_WASM_INTERP=1 to run content WebAssembly in
// the in-process interpreter instead of the host passthrough.
for (const [k, v] of new URLSearchParams(location.search)) {
  if (k.startsWith("env.")) optEnv[k.slice(4)] = v;
}

// --- Eager asset prep, explicit-Start engine init -------------------------
// Chrome assets download + extract into OPFS EAGERLY on page load (driving the
// progress bar). Only the emscripten/Gecko init is gated behind Start: it spins
// up the audio AudioWorklet, and the click is the user gesture browsers require
// before audio (and other gesture-gated APIs) can start.
const startBtn = document.getElementById("start-btn") as HTMLButtonElement;

function fail(e: unknown): void {
  console.error("[chrome-demo] startup failed", e);
  status.textContent = e instanceof Error ? e.message : String(e);
  phase.textContent = "Failed";
  percent.textContent = "";
  startBtn.disabled = false;
  startBtn.textContent = "Retry";
  startBtn.onclick = () => location.reload();
}

startBtn.disabled = true;
startBtn.textContent = "Preparing…";

// Eager: kicks off at module load, before any click.
prepareChromeFs(setProgress)
  .then(() => {
    console.log("[chrome-demo] chrome assets ready");
    setProgress({
      phase: "ready",
      percent: 1,
      message: "Ready — click Start to launch",
    });
    startBtn.disabled = false;
    startBtn.textContent = "Start";
    startBtn.onclick = () => void start(); // engine init only happens on this click
  })
  .catch(fail);

async function start(): Promise<void> {
  startBtn.disabled = true;
  startBtn.textContent = "Starting…";
  setProgress({ phase: "ready", percent: 1, message: "Starting Gecko" });

  // GECKO_CHROME=1 makes the engine use /gre/browser as its APP dir and register
  // the browser chrome package. We still explicitly load browser.xhtml after init;
  // that load is what creates the top-level Firefox chrome window.
  // The chrome assets are already installed into OPFS (eager prep above), so
  // gecko.init() only reads them from local browser storage.
  const gecko = new Gecko({
    canvas,
    // Fill the viewport; a debounced window-resize listener keeps it in sync (below).
    width: window.innerWidth,
    height: window.innerHeight,
    // __GECKO_WASM__ (injected by vite.config) is { url, compressed } for the served wasm.
    wasm: __GECKO_WASM__,
    env: optEnv,
    // GRE: the extracted tar lives at OPFS `${GRE_OPFS_PATH}`; libxul builds its
    // built-in OPFS provider over it (consulted provider-first for /gre, baked
    // gecko.data as fallback). Profile: persistent OPFS at `${PROFILE_OPFS_PATH}`.
    fs: GRE_OPFS_PATH,
    profile: PROFILE_OPFS_PATH,
    // The chrome UI itself boots from local files; loading sites in tabs goes
    // through the WISP endpoint (defaults to the dev server's /wisp/ proxy).
    wispUrl: opts.wisp.trim() || undefined,
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
        title: "Firefox WASM Github Repository",
        url: "https://github.com/HeyPuter/firefox-wasm",
        guid: "chromedemo01",
        favicon: "https://github.githubassets.com/favicons/favicon.svg",
        faviconURL:
          "data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMzIiIGhlaWdodD0iMzIiIHZpZXdCb3g9IjAgMCAzMiAzMiIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPHBhdGggZmlsbC1ydWxlPSJldmVub2RkIiBjbGlwLXJ1bGU9ImV2ZW5vZGQiIGQ9Ik0xNiAwQzcuMTYgMCAwIDcuMTYgMCAxNkMwIDIzLjA4IDQuNTggMjkuMDYgMTAuOTQgMzEuMThDMTEuNzQgMzEuMzIgMTIuMDQgMzAuODQgMTIuMDQgMzAuNDJDMTIuMDQgMzAuMDQgMTIuMDIgMjguNzggMTIuMDIgMjcuNDRDOCAyOC4xOCA2Ljk2IDI2LjQ2IDYuNjQgMjUuNTZDNi40NiAyNS4xIDUuNjggMjMuNjggNSAyMy4zQzQuNDQgMjMgMy42NCAyMi4yNiA0Ljk4IDIyLjI0QzYuMjQgMjIuMjIgNy4xNCAyMy40IDcuNDQgMjMuODhDOC44OCAyNi4zIDExLjE4IDI1LjYyIDEyLjEgMjUuMkMxMi4yNCAyNC4xNiAxMi42NiAyMy40NiAxMy4xMiAyMy4wNkM5LjU2IDIyLjY2IDUuODQgMjEuMjggNS44NCAxNS4xNkM1Ljg0IDEzLjQyIDYuNDYgMTEuOTggNy40OCAxMC44NkM3LjMyIDEwLjQ2IDYuNzYgOC44MiA3LjY0IDYuNjJDNy42NCA2LjYyIDguOTggNi4yIDEyLjA0IDguMjZDMTMuMzIgNy45IDE0LjY4IDcuNzIgMTYuMDQgNy43MkMxNy40IDcuNzIgMTguNzYgNy45IDIwLjA0IDguMjZDMjMuMSA2LjE4IDI0LjQ0IDYuNjIgMjQuNDQgNi42MkMyNS4zMiA4LjgyIDI0Ljc2IDEwLjQ2IDI0LjYgMTAuODZDMjUuNjIgMTEuOTggMjYuMjQgMTMuNCAyNi4yNCAxNS4xNkMyNi4yNCAyMS4zIDIyLjUgMjIuNjYgMTguOTQgMjMuMDZDMTkuNTIgMjMuNTYgMjAuMDIgMjQuNTIgMjAuMDIgMjYuMDJDMjAuMDIgMjguMTYgMjAgMjkuODggMjAgMzAuNDJDMjAgMzAuODQgMjAuMyAzMS4zNCAyMS4xIDMxLjE4QzI3LjQyIDI5LjA2IDMyIDIzLjA2IDMyIDE2QzMyIDcuMTYgMjQuODQgMCAxNiAwVjBaIiBmaWxsPSIjMjQyOTJFIi8+Cjwvc3ZnPgo=",
      },
      {
        title: "Puter",
        url: "https://puter.com/",
        guid: "chromedemo02",
        favicon: "https://puter.com/dist/favicons/favicon-32x32.png",
        faviconURL:
          "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAACAAAAAgCAYAAABzenr0AAAABGdBTUEAALGPC/xhBQAAACBjSFJNAAB6JgAAgIQAAPoAAACA6AAAdTAAAOpgAAA6mAAAF3CculE8AAAABmJLR0QA/wD/AP+gvaeTAAAACXBIWXMAAAsTAAALEwEAmpwYAAAAB3RJTUUH5gUVACYT5I64GAAABTxJREFUWMPtl1tsFGUUx3/fzOyl7XZ3WyiFFpGGAEFQBAQpBF/wAkRQjIRLMDbBcFMJGuVBghIw3AXUVKIhES+AAikFgRAjCVikJERuVrRcWlp7s9fd7XZ3Z2Z3xodpoYRuF4gGHziPM/Od73/O+Z//OSPw/mlyH026n5c/APC/AKDc9QkDMNp5KwkQ7c/MDi4LK6w7DC0xgFi7cwFCwKiRdnJHJwExis8E+KNUMO7JJIYMciBL0NAU4fjJNqqqFJBFQvcibhua4LDBhPFORo+w4fVEUWQb06Z4aW4xiEYFHo9KRWWU4Y+6Ka+IEggYDMhRCLQGWbW+icM/mpii+1Qo8S5P90q893Yas2ek8tsljYrKKP0eUjhwxMeHmwKkeRT278wmOyvKwrfqOH5SRdNM+mbZWLo4nc1rexOOVHPshNRtOboEIAQsWZDG9GkpLFvxNwWHwoTD4EwSCNMgHITJE5NITtZ5dWEtxcUGKBYfyq7rLFtRT6ork8WveSk67UPT41f6dmwGDBviYO6sFDZurWXn9yHCEevLiGoSDgs86YLnnk6m5PcQ5y9oVq3FTY+RsEHhoSCPDU2if3YUYuJuAJiMGeWkrS1E4eHQrc4NyB3joODbPkydlMK4sR7yP3KT01+HzkwSgopKneTkZBbOc+H2aLe+7xYAkOyU8PlUWts6nTIhK0th85oMgm06L82tZuHSJvr19TIh19GpDS2vl8s0lq/2MeXZPizIs9/6PhEH6hqiZGY6ye5tcPkaVgZMyOghU1YeYtWGBkpLZZBUiorbCEVMSxNuZABCYZMdX/no00th4lMpfPpFCxHNdgcZkAVFp0I0NzuYn5eMTdEtLQAulKjMW9LMlTIZZOt0U7NJOGwBtASpky8TNM3AbpeQJLosw+0ZEFBXF2P9Vh9b1mZhdzSwe1+YymqBrkNTM7hcApcLME38rSaGIeH1WN0TChkEghI90+HxoU5mz3Bx7EQzobByk0uJSoAMB48GQcDSRRm8+CWoqklVTZC58xuZOb0Hi+alYpgGK9dW4G91s2l1OnabYM/+erbk6+zIz2TE8CSKTgXJ3x4EU3QJQMb5xkriWOlljcLDQX4p1pBkhbFP2Nm1N0BtvUxNrcGE3BQulvgoOi1RVW2Q0cOBougUHlFp8Ql272vls+0BGhpFXDHqfhZI4A8YFP0cwu2SeH6SCyHg3FmVa1c1XpmViiQLKso0vr6q07+vnQE5EAqZHDjUZkWcYDB1L9Qdk0+BwYPsCAGxmHVKKJ1ZL0CGaAxy+tvJ7h1tZ1zibS9+BkwYPdLB1Ek2PG6JqZPdfPNdE9V1StewJcGRn4JMm5LB5x9ncqFEp+x6iD2FGq1BW5f1jw/AhF49Zbas6YkejZHRw8mFkgDrtgTQdet2YViB3whUgvPnImz8xM+ObRlAGy+/4MVur2HbdiPuaJbiAUhPk8nOkig4UMeZs2H8/ihhFRAgKzBnpovBA51MfiaNgYP1GyBaQwYtvgi79tTyV7VgyGBP3OjjA5CgvFKn4IcIy5c9zITxdo4eU61WMuCRQQ7eedPLzr2NpKZ6mJ/ntaRWEvx6LkLRKYOtG3LolWFSeMhPdwjickBVTd5f00jBQQf+1hiXSjVLbmNW6g3DwO9T0VQXNqVdYgU0Ncd4/d16hg9zUFOjcaXc7Jbqotsfkw557WinDtQyLMjzkjfHTU2tygfr6jl/sdNFJlb3CJFwNxT3+mckAe5UCVUzrFlwj/v13W/F7WYAvoBxW3buJZB7t8RL738M4F+wBwD+AfCAE+6E0NWUAAAAJXRFWHRkYXRlOmNyZWF0ZQAyMDIyLTA1LTIxVDAwOjM4OjE0KzAwOjAw1MIh5gAAACV0RVh0ZGF0ZTptb2RpZnkAMjAyMi0wNS0yMVQwMDozODoxNCswMDowMKWfmVoAAAAgdEVYdHNvZnR3YXJlAGh0dHBzOi8vaW1hZ2VtYWdpY2sub3JnvM8dnQAAABh0RVh0VGh1bWI6OkRvY3VtZW50OjpQYWdlcwAxp/+7LwAAABh0RVh0VGh1bWI6OkltYWdlOjpIZWlnaHQAMTkyQF1xVQAAABd0RVh0VGh1bWI6OkltYWdlOjpXaWR0aAAxOTLTrCEIAAAAGXRFWHRUaHVtYjo6TWltZXR5cGUAaW1hZ2UvcG5nP7JWTgAAABd0RVh0VGh1bWI6Ok1UaW1lADE2NTMwOTM0OTS1BHGJAAAAD3RFWHRUaHVtYjo6U2l6ZQAwQkKUoj7sAAAAVnRFWHRUaHVtYjo6VVJJAGZpbGU6Ly8vbW50bG9nL2Zhdmljb25zLzIwMjItMDUtMjEvYzE2ZjMwY2FjYmRiYzdiNzg5NTg4N2RhNGM5YmY5MGMuaWNvLnBuZxxhfMMAAAAASUVORK5CYII=",
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
