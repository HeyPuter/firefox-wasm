import { defineConfig, type Plugin } from 'vite';
import { createRequire } from 'node:module';
import { spawnSync } from 'node:child_process';
import path from 'node:path';
import fs from 'node:fs';
import os from 'node:os';
import { server as wisp } from '@mercuryworkshop/wisp-js/server';

const require = createRequire(import.meta.url);
const libDist = path.join(path.dirname(require.resolve('gecko.js/package.json')), 'dist');
// gecko.js inlines gecko.js + gecko.worker.js + gecko.data; chrome-demo serves
// whichever wasm artifact the current gecko.js build produced.
const ENGINE = ['gecko.wasm', 'gecko.wasm.zst'];
const mime = (n: string) =>
  n.endsWith('.wasm') ? 'application/wasm' :
    n.endsWith('.js') ? 'text/javascript' : 'application/octet-stream';

// The GRE files live in the engine objdir's dist/bin. gecko.data is intentionally
// stripped to stay minimal, so chrome-demo ships the same non-binary GRE resource
// set that the old unstripped preload used, plus the Firefox browser/ app dir,
// in public/chrome-assets.tar.zst. The runtime expands it into OPFS on first load
// (see src/chrome-fs.ts).
// The engine objdir's dist/bin. Defaults to the local debug objdir, but honors
// $GECKO_OBJDIR so a RELEASE build (CI: obj-full-emscripten-release) can point here.
const GRE_SRC = process.env.GECKO_OBJDIR
  ? path.resolve(process.env.GECKO_OBJDIR, 'dist/bin')
  : path.resolve(__dirname, '../../obj-full-emscripten/dist/bin');
const FONT_SRC = path.resolve(__dirname, '../../firefox/toolkit/components/pdfjs/content/web/standard_fonts');
const PUBLIC_DIR = path.resolve(__dirname, 'public');
const ASSET_ARCHIVE = path.join(PUBLIC_DIR, 'chrome-assets.tar.zst');
const ASSET_MANIFEST = path.join(PUBLIC_DIR, 'chrome-assets.json');
const CLOBBER_FILE = path.join(PUBLIC_DIR, 'chrome-assets.clobber');
const GRE_EXCLUDES = [
  '*.so',
  '*.wasm',
  '*.a',
  '*.data',
  '*.dbg',
  '*.symbols',
  // Anchor the executable names to the rsync transfer ROOT (leading slash) so they
  // drop only dist/bin/<exe>, NOT nested directories that share the name. A bare
  // `firefox` matched any path component and wrongly excluded the devtools
  // debugger's client/firefox/ (commands.js, create.js) and netmonitor's
  // src/utils/firefox/ -> the debugger devtools panel was blank with "Missing chrome
  // or resource URL: resource://devtools/client/debugger/src/client/firefox/commands.js".
  '/firefox',
  '/firefox-bin',
  '/pingsender',
  '/nsinstall',
  '/nsinstall_real',
];

// Trim heavy, optional feature trees from the chrome bundle unless CHROME_FULL=1
// (which ships the complete Firefox asset set). None are needed to boot or render
// pages: hyphenation dicts (cosmetic line breaks), spellcheck dicts, and the Remote
// Agent / CDP+WebDriver (chrome/remote -- dev-tooling, not used at runtime).
// For pdf.js, keep the small integration modules in chrome/pdfjs/content/*.sys.mjs
// (PdfjsContextMenu/PdfStreamConverter/PdfJs are eagerly imported -- e.g. by the
// context-menu actor; dropping all of pdfjs broke right-click) and only drop the
// heavy viewer UI + engine (content/web ~4.6 MB + content/build ~3 MB). PDF *viewing*
// is disabled; PDFs download instead. (Excluded chrome.manifest entries remain, so a
// feature only errors if actually invoked.) Together ~15 MB uncompressed off the tar.
if (!process.env.CHROME_FULL) {
  GRE_EXCLUDES.push(
    '/chrome/pdfjs/content/web', '/chrome/pdfjs/content/build',
    '/hyphenation', '/dictionaries', '/chrome/remote',
  );
}

function serveEngine(): Plugin {
  return {
    name: 'libxul-engine',
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        const name = (req.url || '').split('?')[0].replace(/^\//, '');
        if (ENGINE.includes(name) && fs.existsSync(path.join(libDist, name))) {
          res.setHeader('Content-Type', mime(name));
          res.setHeader('Cache-Control', 'no-store');  // always serve the freshly-built wasm
          fs.createReadStream(path.join(libDist, name)).pipe(res);
          return;
        }
        next();
      });
    },
    generateBundle() {
      for (const name of ENGINE) {
        const p = path.join(libDist, name);
        if (fs.existsSync(p)) {
          this.emitFile({ type: 'asset', fileName: name, source: fs.readFileSync(p) });
        }
      }
    },
  };
}

function newestMtimeMs(abs: string): number {
  const st = fs.statSync(abs);
  if (!st.isDirectory()) return st.mtimeMs;
  let newest = st.mtimeMs;
  for (const name of fs.readdirSync(abs)) {
    newest = Math.max(newest, newestMtimeMs(path.join(abs, name)));
  }
  return newest;
}

function ensureChromeAssetsArchive(): void {
  fs.mkdirSync(PUBLIC_DIR, { recursive: true });
  if (!fs.existsSync(CLOBBER_FILE)) fs.writeFileSync(CLOBBER_FILE, '1\n');
  if (!fs.existsSync(GRE_SRC)) {
    throw new Error(`chrome-demo: missing ${GRE_SRC}; build the full emscripten objdir before starting chrome-demo`);
  }
  if (!fs.existsSync(FONT_SRC)) {
    throw new Error(`chrome-demo: missing ${FONT_SRC}; Firefox source checkout is required for bundled fonts`);
  }

  const newestSource = Math.max(newestMtimeMs(GRE_SRC), newestMtimeMs(FONT_SRC));
  const archiveMtime = fs.existsSync(ASSET_ARCHIVE) ? fs.statSync(ASSET_ARCHIVE).mtimeMs : 0;
  const manifestMtime = fs.existsSync(ASSET_MANIFEST) ? fs.statSync(ASSET_MANIFEST).mtimeMs : 0;
  const clobberMtime = fs.statSync(CLOBBER_FILE).mtimeMs;
  if (archiveMtime >= newestSource && archiveMtime >= clobberMtime &&
    manifestMtime >= newestSource && manifestMtime >= clobberMtime) return;

  const stage = fs.mkdtempSync(path.join(os.tmpdir(), 'chrome-assets-'));
  const tarPath = path.join(stage, 'chrome-assets.tar');
  const tmp = `${ASSET_ARCHIVE}.tmp`;
  try {
    fs.rmSync(tmp, { force: true });
    const rsync = spawnSync('rsync', [
      '-aL',
      ...GRE_EXCLUDES.flatMap((pattern) => [`--exclude=${pattern}`]),
      `${GRE_SRC}/`,
      `${stage}/`,
    ], { stdio: 'inherit' });
    if (rsync.status !== 0) throw new Error('chrome-demo: failed to stage GRE resources with rsync');

    for (const dest of ['fonts', 'browser/fonts']) {
      fs.mkdirSync(path.join(stage, dest), { recursive: true });
      for (const name of fs.readdirSync(FONT_SRC)) {
        if (name.endsWith('.ttf')) fs.copyFileSync(path.join(FONT_SRC, name), path.join(stage, dest, name));
      }
    }

    const roots = fs.readdirSync(stage);
    if (!roots.length) throw new Error('chrome-demo: staged asset tree is empty');
    const tar = spawnSync('tar', ['-cf', tarPath, '-C', stage, ...roots], { stdio: 'inherit' });
    if (tar.status !== 0) throw new Error('chrome-demo: failed to create chrome asset tar');
    const uncompressedSize = fs.statSync(tarPath).size;
    const zstd = spawnSync('zstd', ['-q', '-f', '-19', tarPath, '-o', tmp], { stdio: 'inherit' });
    if (zstd.status !== 0) throw new Error('chrome-demo: failed to compress public/chrome-assets.tar.zst; install zstd');
    fs.writeFileSync(ASSET_MANIFEST, JSON.stringify({ uncompressedSize }) + '\n');
    fs.renameSync(tmp, ASSET_ARCHIVE);
  } catch (e) {
    fs.rmSync(tmp, { force: true });
    throw e;
  } finally {
    fs.rmSync(stage, { recursive: true, force: true });
  }
}

function packageGreExtra(): Plugin {
  return {
    name: 'libxul-gre-extra-package',
    buildStart: ensureChromeAssetsArchive,
    configureServer: ensureChromeAssetsArchive,
  };
}

// Run a WISP proxy (wisp-js) on the dev server itself, at ws(s)://<host>/wisp/.
// The chrome front-end loads sites in tabs over it; main.ts defaults its wispUrl
// to this endpoint. Only /wisp upgrades are claimed -- Vite's HMR socket passes
// through. (Same plugin as embed-demo.)
function wispProxy(): Plugin {
  return {
    name: 'wisp-proxy',
    configureServer(server) {
      wisp.options.allow_loopback_ips = true;
      server.httpServer?.on('upgrade', (req, socket, head) => {
        if ((req.url || '').startsWith('/wisp')) {
          wisp.routeRequest(req, socket as any, head);
        }
      });
    },
    configurePreviewServer(server) {
      server.httpServer?.on('upgrade', (req, socket, head) => {
        if ((req.url || '').startsWith('/wisp')) {
          wisp.routeRequest(req, socket as any, head);
        }
      });
    },
  };
}

const coop = {
  'Cross-Origin-Opener-Policy': 'same-origin',
  'Cross-Origin-Embedder-Policy': 'require-corp',
};

// The served engine wasm -- whichever gecko.js built (raw gecko.wasm in debug, or
// gecko.wasm.zst in release). Injected as __GECKO_WASM__ and passed to Gecko's required
// `wasm` option in main.ts.
const wasmCompressed = fs.existsSync(path.join(libDist, 'gecko.wasm.zst'));
const GECKO_WASM = { url: wasmCompressed ? '/gecko.wasm.zst' : '/gecko.wasm', compressed: wasmCompressed };

export default defineConfig({
  plugins: [serveEngine(), packageGreExtra(), wispProxy()],
  define: { __GECKO_WASM__: JSON.stringify(GECKO_WASM) },
  // gecko.js is a workspace package under active rebuild; don't pre-bundle/cache
  // it, so a plain reload picks up a fresh dist/gecko.js (no `vite --force`).
  optimizeDeps: { exclude: ['gecko.js'] },
  // main.ts uses top-level await (await gecko.init()); keep the build target
  // modern so `vite build` doesn't reject it (dev already uses esnext).
  build: { target: 'esnext' },
  server: { headers: coop },
  preview: { headers: coop },
});
