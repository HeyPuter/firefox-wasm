// libxul.js — embeddable Gecko (the Firefox engine) compiled to WebAssembly.
//
// `new Gecko({ canvas })`, `await g.init()`, `await g.load(url)`. The engine runs
// on a pthread; the page <canvas> receives software-composited frames and forwards
// mouse/keyboard/wheel input. GRE resources are split: the minimal set needed to
// render a web page is baked into gecko.data; anything else (chrome UI, etc.) is
// supplied by the consumer through an `fs` provider (readFile/readdir).

// gecko.js (emscripten glue) + gecko.worker.js (pthread worker) are inlined into
// this bundle as source strings and run from Blob URLs, so consumers never serve
// them -- only gecko.wasm + gecko.data are assets (see GeckoOptions.assetBase).
import geckoSource from '../wasm/gecko.js?source';
import workerSource from '../wasm/gecko.worker.js?source';
import { ZSTDDecoder } from 'zstddec';
// gecko.data is baked into this bundle, zstd-compressed (decoded at load with
// zstddec), so consumers serve only the wasm. gecko-assets.json (also inlined) says
// whether the wasm is compressed (RELEASE builds) and its uncompressed size.
import geckoDataZst from '../wasm/gecko.data.zst?inline';
import assets from '../wasm/gecko-assets.json';

// ---- public API -----------------------------------------------------------

/**
 * Supplies GRE files that are NOT baked into the shipped gecko.data. The provider
 * root is mounted at GRE_DIR (/gre). `readdir` MUST suffix directory names with
 * "/" so the walk can recurse without a separate stat call.
 */
export interface FsProvider {
  readdir(path: string): Promise<string[]>;
  readFile(path: string): Promise<Uint8Array>;
  /**
   * Optional fast path for lazy mounts. When present, libxul.js can build a
   * filesystem tree from names + File metadata and read bytes only when Gecko
   * opens a file. Providers without this keep the older eager readFile path.
   */
  getFile?(path: string): Promise<Blob>;
}

export interface GeckoOptions {
  /**
   * The page canvas the engine composites into. In software mode it receives
   * BGRA frames blitted via a 2D context. In GPU mode (env.GECKO_GPU set) the
   * engine instead creates a WebGL2 context on it directly — it must be free of
   * any other context and is forced to id="screen" (the engine's hardcoded GL
   * target selector); WebRender presents through an overlaid #glout canvas.
   */
  canvas: HTMLCanvasElement;
  width?: number;
  height?: number;
  /** Extra engine env vars (e.g. MOZ_LOG, GECKO_WASMJIT, GECKO_STYLO_THREADS). */
  env?: Record<string, string>;
  /** WISP websocket endpoint; Necko fetches http(s):// over it. */
  wispUrl?: string;
  /** Supplies GRE files beyond the baked-in minimal set (mounted under /gre). */
  fs?: FsProvider;
  /** Where gecko.wasm + gecko.data are served (URL prefix; default './', relative to the page). */
  assetBase?: string;
  /** Full override of engine-asset location (file -> url); takes precedence over assetBase. */
  locateFile?: (file: string) => string;
  print?: (s: string) => void;
  printErr?: (s: string) => void;
  /** Forward mouse/keyboard/wheel from the canvas to the engine (default true). */
  forwardInput?: boolean;
}

// ---- command struct (mirror embed-xul.cpp XulCmd) -------------------------
// state@0 w@4 h@8 result(ptr)@12 len@16 url@20[8192], then input fields after url.
const ST = 0, W = 4, H = 8, RES = 12, LEN = 16, URLOFF = 20;
const OP = URLOFF + 8192,
  EVTYPE = OP + 4, EX = OP + 8, EY = OP + 12, BTN = OP + 16, BTNS = OP + 20,
  CLICKS = OP + 24, MODS = OP + 28, KEYCODE = OP + 32, CHARCODE = OP + 36,
  DX = OP + 40, DY = OP + 44, KEYVAL = OP + 48, CURSOR = KEYVAL + 64;

const OP_LOAD = 0, OP_MOUSE = 1, OP_KEY = 2, OP_WHEEL = 3, OP_PAINT = 4, OP_EVAL = 5;
const OP_CLIP_SET = 9;
const MOD_ALT = 0x1, MOD_CTRL = 0x2, MOD_SHIFT = 0x4, MOD_META = 0x8;

// StyleCursorKind index -> CSS cursor keyword (ServoStyleConsts.h order).
const CURSORS = ['none', 'default', 'pointer', 'context-menu', 'help', 'progress',
  'wait', 'cell', 'crosshair', 'text', 'vertical-text', 'alias', 'copy', 'move',
  'no-drop', 'not-allowed', 'grab', 'grabbing', 'e-resize', 'n-resize', 'ne-resize',
  'nw-resize', 's-resize', 'se-resize', 'sw-resize', 'w-resize', 'ew-resize',
  'ns-resize', 'nesw-resize', 'nwse-resize', 'col-resize', 'row-resize',
  'all-scroll', 'zoom-in', 'zoom-out', 'auto'];

interface GeckoModule {
  HEAPU8: Uint8Array;
  HEAP32: Int32Array;
  ENV: Record<string, string>;
  FS: any;
  _xul_cmd_ptr(): number;
  addRunDependency(id: string): void;
  removeRunDependency(id: string): void;
}
type GeckoFactory = (opts: Record<string, unknown>) => Promise<GeckoModule>;
type ProviderFsEntry = {
  name: string;
  path: string;
  isDir: boolean;
  size: number;
  timestamp: number;
  blob?: Blob;
  children?: Map<string, ProviderFsEntry>;
  node?: any;
};

// The engine glue is a classic emscripten MODULARIZE build (EXPORT_ES6 + pthread is
// unreliable in this emsdk). Both it and the pthread worker are inlined as source
// (asset/source) and run from Blob URLs, so nothing has to be served for them.
const toBlobUrl = (src: string) => URL.createObjectURL(new Blob([src], { type: 'text/javascript' }));
let _geckoUrl: string | undefined;
let _workerUrl: string | undefined;
const geckoBlobUrl = () => (_geckoUrl ??= toBlobUrl(geckoSource));
const workerBlobUrl = () => (_workerUrl ??= toBlobUrl(workerSource));

let _engine: Promise<GeckoFactory> | undefined;
function loadEngine(): Promise<GeckoFactory> {
  return (_engine ??= new Promise<GeckoFactory>((resolve, reject) => {
    const have = (globalThis as Record<string, unknown>).createGecko as GeckoFactory | undefined;
    if (have) return resolve(have);
    const s = document.createElement('script');
    s.src = geckoBlobUrl(); s.async = true;
    s.onload = () => {
      const f = (globalThis as Record<string, unknown>).createGecko as GeckoFactory | undefined;
      f ? resolve(f) : reject(new Error('libxul.js: engine evaluated but createGecko is missing'));
    };
    s.onerror = () => reject(new Error('libxul.js: failed to evaluate the bundled engine'));
    document.head.appendChild(s);
  }));
}

interface Cmd {
  op: number; evType?: number; x?: number; y?: number; button?: number;
  buttons?: number; clickCount?: number; modifiers?: number; keyCode?: number;
  charCode?: number; deltaX?: number; deltaY?: number; key?: string; url?: string;
  resolve?: (v: number | string | null) => void;
}

export class Gecko {
  private opts: GeckoOptions;
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D | null = null;
  private gpu = false;
  private W: number;
  private H: number;
  private mod: GeckoModule | null = null;
  private cmd = 0;
  private queue: Cmd[] = [];
  private running = false;
  private painting = false;
  private enc = new TextEncoder();
  private dec = new TextDecoder();
  private blitImg: ImageData | null = null;
  private blitDst32: Uint32Array | null = null;
  private detach: Array<() => void> = [];

  constructor(opts: GeckoOptions) {
    this.opts = opts;
    this.canvas = opts.canvas;
    this.W = opts.width ?? this.canvas.width ?? 800;
    this.H = opts.height ?? this.canvas.height ?? 600;
    this.canvas.width = this.W;
    this.canvas.height = this.H;
    this.gpu = !!this.opts.env?.GECKO_GPU;
    if (this.gpu) {
      // GPU mode: the engine creates a WebGL2 compositor context on this canvas
      // (selector "#screen", hardcoded in GLContextProviderEmscripten) and presents
      // through a #glout overlay. A canvas can hold only one context type, so the
      // page must NOT grab a 2D context here (doing so makes the engine's
      // emscripten_webgl_create_context("#screen") fail -> WebRenderAPI::Create
      // dereferences a null GL context and traps). There's no software blit.
      if (this.canvas.id !== 'screen') this.canvas.id = 'screen';
    } else {
      const ctx = this.canvas.getContext('2d');
      if (!ctx) throw new Error('libxul.js: canvas already has a non-2d context');
      this.ctx = ctx;
    }
  }

  /** Instantiate the engine, mount GRE files, and wait until it is ready. */
  async init(): Promise<void> {
    this.ensureGlDummy();
    if (this.gpu) this.setupGpuPresent();
    const print = this.opts.print ?? ((s) => console.log(s));
    const printErr = this.opts.printErr ?? ((s) => console.warn(s));

    const createGecko = await loadEngine();
    // Only gecko.wasm + gecko.data are served by the consumer; default page-relative.
    const assetBase = this.opts.assetBase ?? './';

    let resolveReady!: () => void;
    const ready = new Promise<void>((r) => (resolveReady = r));

    const moduleOpts: Record<string, unknown> = {
      print: (t: string) => {
        if (typeof t === 'string' && t.includes('READY cmd=')) resolveReady();
        print(t);
      },
      printErr,
      onAbort: (w: unknown) => printErr('[libxul] abort: ' + w),
      preRun: [(m: GeckoModule) => {
        m.ENV['GRE_DIR'] = '/gre';
        m.ENV['MOZ_FORCE_DISABLE_E10S'] = '1';
        for (const [k, v] of Object.entries(this.opts.env ?? {})) m.ENV[k] = v;
        const wisp = this.opts.wispUrl;
        if (wisp && typeof (globalThis as any).WISP !== 'undefined') {
          (globalThis as any).WISP.install(m, wisp);
        }
        if (this.opts.fs) {
          m.addRunDependency('libxul-fs');
          this.mountFsProvider(m, this.opts.fs)
            .then(() => m.removeRunDependency('libxul-fs'))
            .catch((e) => { printErr('[libxul] fs provider failed: ' + e); m.removeRunDependency('libxul-fs'); });
        }
      }],
    };
    // The pthread worker loads the (bundled) runtime from this Blob; the wasm reaches
    // workers as a compiled module, so locateFile only resolves assets on the main thread.
    moduleOpts.mainScriptUrlOrBlob = geckoBlobUrl();
    moduleOpts.locateFile = this.opts.locateFile ??
      ((f: string) => (f === 'gecko.worker.js' ? workerBlobUrl() : assetBase + f));

    // Decode the inlined gecko.data.zst with zstddec and feed it to emscripten via
    // getPreloadedPackage (so the .data is never fetched). In RELEASE the wasm is
    // zstd too: fetch gecko.wasm.zst, decode, and provide it via instantiateWasm;
    // otherwise emscripten fetches the raw gecko.wasm through locateFile.
    {
      const decoder = new ZSTDDecoder();
      await decoder.init();
      const dataZst = new Uint8Array(await (await fetch(geckoDataZst)).arrayBuffer());
      // emscripten passes the uncompressed package size; decode is synchronous.
      moduleOpts.getPreloadedPackage = (_name: string, size: number): ArrayBuffer => {
        const u = decoder.decode(dataZst, size);
        return u.byteLength === u.buffer.byteLength
          ? (u.buffer as ArrayBuffer)
          : (u.slice().buffer as ArrayBuffer);
      };
      if (assets.wasmCompressed && assets.wasmSize) {
        const wasmZst = new Uint8Array(
          await (await fetch(assetBase + 'gecko.wasm.zst')).arrayBuffer());
        const wasmBytes = decoder.decode(wasmZst, assets.wasmSize);
        moduleOpts.instantiateWasm = (imports: any, success: any) => {
          WebAssembly.instantiate(wasmBytes as BufferSource, imports)
            .then((r: any) => success(r.instance, r.module))
            .catch((e) => printErr('[libxul] wasm instantiate failed: ' + e));
          return {};
        };
      }
    }

    this.mod = await createGecko(moduleOpts);
    await ready;
    this.cmd = this.mod._xul_cmd_ptr();

    if (this.opts.forwardInput !== false) this.attachInput();
    this.startPaintLoop();
  }

  /** Navigate the embedded engine to a URL (http(s):// fetched over WISP). */
  async load(url: string): Promise<void> {
    await this.run({ op: OP_LOAD, url });
  }

  /**
   * Resize the rendering surface. The engine reads the new dimensions from the
   * next command and reflows/recomposites to fit. Software mode resizes the 2D
   * canvas backing; GPU mode resizes the canvas box (the transferred #screen
   * drawing buffer is owned by the engine, so only its CSS size is set here) and
   * the #glout overlay follows. Safe to call repeatedly at runtime.
   */
  async resize(width: number, height: number): Promise<void> {
    this.W = Math.max(1, Math.round(width));
    this.H = Math.max(1, Math.round(height));
    if (this.gpu) {
      this.syncGpuSize();
    } else {
      this.canvas.width = this.W;
      this.canvas.height = this.H;
      this.blitImg = null;
      this.blitDst32 = null;
    }
    await this.run({ op: OP_PAINT });
  }

  /** Evaluate JS in the chrome context; returns the stringified result. */
  async evalChrome(js: string): Promise<string> {
    const r = await this.run({ op: OP_EVAL, url: js });
    return typeof r === 'string' ? r : '';
  }

  /** Stop loops, detach input handlers. (The wasm module is not torn down.) */
  destroy(): void {
    this.running = false;
    for (const d of this.detach) d();
    this.detach = [];
  }

  // ---- GRE file provider --------------------------------------------------

  private async mountFsProvider(m: GeckoModule, fs: FsProvider): Promise<void> {
    if (fs.getFile) {
      await this.mountLazyFsProvider(m, fs);
    } else {
      await this.populateFs(m, fs);
    }
  }

  private async populateFs(m: GeckoModule, fs: FsProvider, rel = ''): Promise<void> {
    const entries = await fs.readdir(rel);
    for (const name of entries) {
      const isDir = name.endsWith('/');
      const child = rel + name;
      const dest = '/gre/' + (isDir ? child.slice(0, -1) : child);
      if (isDir) {
        m.FS.mkdirTree(dest);
        await this.populateFs(m, fs, child);
      } else {
        const slash = dest.lastIndexOf('/');
        if (slash > 0) m.FS.mkdirTree(dest.slice(0, slash));
        m.FS.writeFile(dest, await fs.readFile(child));
      }
    }
  }

  private async buildProviderTree(fs: FsProvider, rel = ''): Promise<ProviderFsEntry> {
    const root: ProviderFsEntry = {
      name: rel ? rel.replace(/\/$/, '').split('/').pop() || '' : '',
      path: rel,
      isDir: true,
      size: 4096,
      timestamp: Date.now(),
      children: new Map(),
    };
    const entries = await fs.readdir(rel);
    for (const name of entries) {
      const isDir = name.endsWith('/');
      const childPath = rel + name;
      const cleanName = isDir ? name.slice(0, -1) : name;
      if (isDir) {
        const child = await this.buildProviderTree(fs, childPath);
        child.name = cleanName;
        root.children!.set(cleanName, child);
      } else {
        const blob = await fs.getFile!(childPath);
        root.children!.set(cleanName, {
          name: cleanName,
          path: childPath,
          isDir: false,
          size: blob.size,
          timestamp: Date.now(),
          blob,
        });
      }
    }
    return root;
  }

  private async mountLazyFsProvider(m: GeckoModule, fs: FsProvider): Promise<void> {
    const tree = await this.buildProviderTree(fs);
    const FS = m.FS;
    const DIR_MODE = 0o040555;
    const FILE_MODE = 0o100444;
    const now = Date.now();

    const createNode = (parent: any, entry: ProviderFsEntry): any => {
      if (entry.node) return entry.node;
      const node = FS.createNode(parent, entry.name || '/', entry.isDir ? DIR_MODE : FILE_MODE, 0);
      node.providerEntry = entry;
      node.timestamp = entry.timestamp || now;
      node.usedBytes = entry.isDir ? 4096 : entry.size;
      node.node_ops = entry.isDir ? dirNodeOps : fileNodeOps;
      node.stream_ops = entry.isDir ? dirStreamOps : fileStreamOps;
      entry.node = node;
      return node;
    };

    const getattr = (node: any) => {
      const entry = node.providerEntry as ProviderFsEntry;
      const size = entry.isDir ? 4096 : entry.size;
      return {
        dev: 1,
        ino: node.id,
        mode: node.mode,
        nlink: 1,
        uid: 0,
        gid: 0,
        rdev: node.rdev,
        size,
        atime: new Date(node.timestamp),
        mtime: new Date(node.timestamp),
        ctime: new Date(node.timestamp),
        blksize: 4096,
        blocks: Math.ceil(size / 4096),
      };
    };

    const setReadOnlyAttr = (node: any, attr: any) => {
      if (attr.timestamp !== undefined) node.timestamp = attr.timestamp;
      if (attr.mode !== undefined) node.mode = attr.mode;
    };

    const dirNodeOps = {
      getattr,
      setattr: setReadOnlyAttr,
      lookup(parent: any, name: string) {
        const entry = (parent.providerEntry as ProviderFsEntry).children?.get(name);
        if (!entry) throw FS.genericErrors[44];
        return createNode(parent, entry);
      },
      readdir(node: any) {
        const children = (node.providerEntry as ProviderFsEntry).children ?? new Map();
        return ['.', '..', ...children.keys()];
      },
    };

    const fileNodeOps = {
      getattr,
      setattr: setReadOnlyAttr,
    };

    const dirStreamOps = {
      llseek(_stream: any, offset: number, whence: number) {
        if (whence === 1) return offset + _stream.position;
        if (whence === 2) return offset + 4096;
        if (offset < 0) throw new FS.ErrnoError(28);
        return offset;
      },
    };

    const readBlobSync = (blob: Blob, position: number, length: number): Uint8Array => {
      const readerCtor = (globalThis as unknown as { FileReaderSync?: typeof FileReaderSync }).FileReaderSync;
      const slice = blob.slice(position, position + length);
      if (readerCtor) {
        return new Uint8Array(new readerCtor().readAsArrayBuffer(slice));
      }
      const xhr = new XMLHttpRequest();
      const url = URL.createObjectURL(slice);
      try {
        xhr.open('GET', url, false);
        xhr.overrideMimeType('text/plain; charset=x-user-defined');
        xhr.send(null);
        if (xhr.status && (xhr.status < 200 || xhr.status >= 300)) {
          throw new Error(`libxul.js: lazy FsProvider read failed with HTTP ${xhr.status}`);
        }
        const text = xhr.responseText;
        const bytes = new Uint8Array(text.length);
        for (let i = 0; i < text.length; i++) bytes[i] = text.charCodeAt(i) & 0xff;
        return bytes;
      } finally {
        URL.revokeObjectURL(url);
      }
    };

    const fileStreamOps = {
      llseek(stream: any, offset: number, whence: number) {
        const entry = stream.node.providerEntry as ProviderFsEntry;
        let position = offset;
        if (whence === 1) position += stream.position;
        if (whence === 2) position += entry.size;
        if (position < 0) throw new FS.ErrnoError(28);
        return position;
      },
      read(stream: any, buffer: Uint8Array, offset: number, length: number, position: number) {
        const entry = stream.node.providerEntry as ProviderFsEntry;
        if (!entry.blob || position >= entry.size) return 0;
        const size = Math.min(entry.size - position, length);
        if (size <= 0) return 0;
        buffer.set(readBlobSync(entry.blob, position, size), offset);
        return size;
      },
      mmap(stream: any, length: number, position: number) {
        const ptr = (m as any)._malloc?.(length);
        if (!ptr) throw new FS.ErrnoError(48);
        const entry = stream.node.providerEntry as ProviderFsEntry;
        const size = Math.min(Math.max(entry.size - position, 0), length);
        if (size < length) m.HEAPU8.fill(0, ptr + size, ptr + length);
        if (entry.blob && size > 0) m.HEAPU8.set(readBlobSync(entry.blob, position, size), ptr);
        return { ptr, allocated: true };
      },
    };

    const providerFs = {
      mount() {
        return createNode(null, tree);
      },
    };

    try {
      FS.unmount('/gre');
    } catch {
      // /gre is normally a plain MEMFS directory from gecko.data, not a mountpoint.
    }
    try {
      FS.rmdir('/gre');
    } catch {
      // Keep the existing directory if it is not empty; mounting over it is valid.
    }
    try {
      FS.mkdir('/gre');
    } catch (e: any) {
      if (e?.errno !== 20) throw e;
    }
    FS.mount(providerFs, {}, '/gre');
  }

  // ---- command protocol --------------------------------------------------

  private run(item: Cmd): Promise<number | string | null> {
    return new Promise((resolve) => {
      item.resolve = resolve;
      // coalesce consecutive mouse-moves so fast motion can't back up the queue.
      const last = this.queue[this.queue.length - 1];
      if (item.op === OP_MOUSE && item.evType === 0 && last &&
          last.op === OP_MOUSE && last.evType === 0) {
        this.queue[this.queue.length - 1] = item;
      } else {
        this.queue.push(item);
      }
      this.pump();
    });
  }

  private async pump(): Promise<void> {
    if (this.running) return;
    this.running = true;
    while (this.queue.length) {
      const item = this.queue.shift()!;
      const r = await this.runCmd(item);
      item.resolve?.(r);
    }
    this.running = false;
  }

  private async runCmd(item: Cmd): Promise<number | string | null> {
    const m = this.mod!;
    const i32 = () => m.HEAP32, u8 = () => m.HEAPU8;
    const set = (off: number, v: number) => { i32()[(this.cmd + off) >> 2] = v | 0; };
    set(W, this.W); set(H, this.H);
    set(OP, item.op);
    set(EVTYPE, item.evType || 0);
    set(EX, item.x || 0); set(EY, item.y || 0);
    set(BTN, item.button || 0);
    set(BTNS, item.buttons == null ? -1 : item.buttons);
    set(CLICKS, item.clickCount || 0);
    set(MODS, item.modifiers || 0);
    set(KEYCODE, item.keyCode || 0);
    set(CHARCODE, item.charCode || 0);
    set(DX, item.deltaX || 0); set(DY, item.deltaY || 0);
    if (item.op === OP_LOAD || item.op === OP_EVAL || item.op === OP_CLIP_SET) {
      const bytes = this.enc.encode(item.url || '');
      if (bytes.length >= 8190) return null;
      u8().set(bytes, this.cmd + URLOFF); u8()[this.cmd + URLOFF + bytes.length] = 0;
    }
    if (item.op === OP_KEY) {
      const kb = this.enc.encode(item.key || '');
      const n = Math.min(kb.length, 63);
      u8().set(kb.subarray(0, n), this.cmd + KEYVAL); u8()[this.cmd + KEYVAL + n] = 0;
    }
    Atomics.store(i32(), (this.cmd + ST) >> 2, 1);
    const start = performance.now();
    let st = 1;
    while (performance.now() - start < 120000) {
      st = Atomics.load(i32(), (this.cmd + ST) >> 2);
      if (st === 3 || st === -1) break;
      await new Promise((r) => setTimeout(r, item.op === OP_LOAD ? 20 : 4));
    }
    if (st !== 3) return null;
    if (item.op >= 5 && item.op <= 8) {
      const resPtr = i32()[(this.cmd + RES) >> 2], len = i32()[(this.cmd + LEN) >> 2];
      return (resPtr && len)
        ? this.dec.decode(new Uint8Array(u8().subarray(resPtr, resPtr + len)))
        : '';
    }
    const n = this.blit();
    if (item.op === OP_MOUSE) {
      const ck = i32()[(this.cmd + CURSOR) >> 2];
      this.canvas.style.cursor = CURSORS[ck] || 'auto';
    }
    return n;
  }

  // BGRA (engine) -> RGBA (canvas), a 32-bit word at a time, reusing one ImageData.
  private blit(): number {
    if (!this.ctx) return 0;  // GPU mode: WebRender presents to #screen via WebGL (#glout overlay)
    const m = this.mod!;
    const i32 = m.HEAP32, u8 = m.HEAPU8;
    const resPtr = i32[(this.cmd + RES) >> 2], len = i32[(this.cmd + LEN) >> 2];
    if (!resPtr || !len) return 0;
    if (!this.blitImg) {
      this.blitImg = this.ctx.createImageData(this.W, this.H);
      this.blitDst32 = new Uint32Array(this.blitImg.data.buffer);
    }
    const n = len >>> 2;
    const src32 = new Uint32Array(u8.buffer, resPtr, n);
    const dst = this.blitDst32!;
    let nonWhite = 0;
    for (let i = 0; i < n; i++) {
      const p = src32[i];
      dst[i] = ((p >>> 16) & 0xFF) | (p & 0x0000FF00) | ((p & 0xFF) << 16) | 0xFF000000;
      if ((p & 0x00FFFFFF) !== 0x00FFFFFF) nonWhite++;
    }
    this.ctx.putImageData(this.blitImg, 0, 0);
    return nonWhite;
  }

  private startPaintLoop(): void {
    const tick = async () => {
      if (!this.mod) return;
      await this.run({ op: OP_PAINT });
      if (this.mod) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  }

  // ---- input -------------------------------------------------------------

  private ensureGlDummy(): void {
    // OFFSCREENCANVASES_TO_PTHREAD=#gldummy: the app pthread transfers this canvas
    // at startup; it must exist or startup aborts.
    if (!document.getElementById('gldummy')) {
      const c = document.createElement('canvas');
      c.id = 'gldummy'; c.width = 1; c.height = 1; c.style.display = 'none';
      document.body.appendChild(c);
    }
  }

  // GPU mode presents the rendered frame into a #glout bitmaprenderer overlay
  // (GLContextProviderEmscripten). The engine creates #glout sized to the viewport
  // if absent; we pre-create it sized to OUR canvas instead, inside a relative
  // wrapper, so the overlay tracks the canvas box at whatever size the embedder
  // picks (and resize() changes). The engine reuses our #glout (it only creates
  // one when none exists) and attaches the bitmaprenderer context to it.
  private setupGpuPresent(): void {
    const c = this.canvas;
    let wrap = c.parentElement;
    if (!wrap || wrap.dataset.libxulGlwrap !== '1') {
      wrap = document.createElement('div');
      wrap.dataset.libxulGlwrap = '1';
      c.parentNode!.insertBefore(wrap, c);
      wrap.appendChild(c);
    }
    wrap.style.position = 'relative';
    wrap.style.display = 'inline-block';
    wrap.style.lineHeight = '0';
    c.style.display = 'block';
    if (!document.getElementById('glout')) {
      const glout = document.createElement('canvas');
      glout.id = 'glout';
      glout.style.position = 'absolute';
      glout.style.left = '0';
      glout.style.top = '0';
      glout.style.outline = 'none';
      glout.style.pointerEvents = 'none';  // let mouse/keyboard reach #screen beneath
      wrap.appendChild(glout);
    }
    this.syncGpuSize();
  }

  // Set every surface to the real pixel size (no CSS down/upscaling): the wrapper
  // box, the #screen box, and the #glout overlay's backing AND css both equal W*H.
  private syncGpuSize(): void {
    const c = this.canvas;
    const wrap = c.parentElement;
    if (wrap && wrap.dataset.libxulGlwrap === '1') {
      wrap.style.width = this.W + 'px';
      wrap.style.height = this.H + 'px';
    }
    c.style.width = this.W + 'px';
    c.style.height = this.H + 'px';
    const glout = document.getElementById('glout') as HTMLCanvasElement | null;
    if (glout) {
      glout.width = this.W;
      glout.height = this.H;
      glout.style.width = this.W + 'px';
      glout.style.height = this.H + 'px';
    }
  }

  private mods(e: MouseEvent | KeyboardEvent | WheelEvent): number {
    return (e.altKey ? MOD_ALT : 0) | (e.ctrlKey ? MOD_CTRL : 0) |
           (e.shiftKey ? MOD_SHIFT : 0) | (e.metaKey ? MOD_META : 0);
  }

  private xy(e: MouseEvent | WheelEvent): { x: number; y: number } {
    const r = this.canvas.getBoundingClientRect();
    return {
      x: Math.round((e.clientX - r.left) * (this.W / r.width)),
      y: Math.round((e.clientY - r.top) * (this.H / r.height)),
    };
  }

  private attachInput(): void {
    const c = this.canvas;
    const on = <K extends keyof HTMLElementEventMap>(t: K, h: (e: HTMLElementEventMap[K]) => void) => {
      c.addEventListener(t, h as EventListener);
      this.detach.push(() => c.removeEventListener(t, h as EventListener));
    };
    on('mousemove', (e) => { const p = this.xy(e); this.run({ op: OP_MOUSE, evType: 0, x: p.x, y: p.y, buttons: e.buttons, modifiers: this.mods(e) }); });
    on('mousedown', (e) => { c.focus(); const p = this.xy(e); this.run({ op: OP_MOUSE, evType: 1, x: p.x, y: p.y, button: e.button, buttons: e.buttons, clickCount: e.detail, modifiers: this.mods(e) }); });
    on('mouseup', (e) => { const p = this.xy(e); this.run({ op: OP_MOUSE, evType: 2, x: p.x, y: p.y, button: e.button, buttons: e.buttons, clickCount: e.detail, modifiers: this.mods(e) }); });
    on('contextmenu', (e) => e.preventDefault());
    on('wheel', (e) => { const p = this.xy(e); this.run({ op: OP_WHEEL, x: p.x, y: p.y, deltaX: e.deltaX, deltaY: e.deltaY, modifiers: this.mods(e) }); e.preventDefault(); });
    // Printable keys carry their char code (matches the original embed-xul loader).
    // The engine doesn't insert text for Ctrl/Meta combos anyway (the editor's
    // IsInputtingText() is false when a command modifier is held), and sending the
    // char keeps the keypress shape the shortcut handler expects.
    const keyItem = (e: KeyboardEvent, evType: number): Cmd => ({
      op: OP_KEY, evType, key: e.key, keyCode: e.keyCode,
      charCode: e.key.length === 1 ? e.key.codePointAt(0)! : 0,
      modifiers: this.mods(e),
    });
    on('keydown', (e) => {
      // Paste needs the real system clipboard, which is async (navigator.clipboard
      // .readText) while the engine's paste is synchronous. So intercept Ctrl/Cmd+V,
      // read the clipboard, push it into the engine's clipboard, THEN forward the
      // key so the engine pastes natively. Copy/cut stay fully native (the engine's
      // headless clipboard mirrors out to navigator.clipboard on SetData).
      if ((e.ctrlKey || e.metaKey) && !e.altKey && !e.shiftKey &&
          (e.key === 'v' || e.key === 'V')) {
        e.preventDefault();
        void this.pasteThenKey(keyItem(e, 0));
        return;
      }
      this.run(keyItem(e, 0));
      e.preventDefault();
    });
    on('keyup', (e) => { this.run(keyItem(e, 1)); e.preventDefault(); });
    if (!c.hasAttribute('tabindex')) c.setAttribute('tabindex', '0');
  }

  // Prime the engine's clipboard from the system clipboard, then forward the paste
  // key. The serial command queue guarantees the OP_CLIP_SET lands before the key,
  // so the engine's native cmd_paste reads the just-written text.
  private async pasteThenKey(key: Cmd): Promise<void> {
    try {
      const text = navigator.clipboard?.readText ? await navigator.clipboard.readText() : '';
      if (text) await this.run({ op: OP_CLIP_SET, url: text });
    } catch (e) {
      (this.opts.printErr ?? ((s: string) => console.warn(s)))(
        '[libxul] clipboard read: ' + (e instanceof Error ? e.message : String(e)));
    }
    this.run(key);
  }
}

export default Gecko;
