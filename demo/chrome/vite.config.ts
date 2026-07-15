import { defineConfig, type Plugin } from 'vite';
import { createRequire } from 'node:module';
import path from 'node:path';
import fs from 'node:fs';
import { server as wisp } from '@mercuryworkshop/wisp-js/server';

const require = createRequire(import.meta.url);
const libDist = path.join(path.dirname(require.resolve('gecko.js/package.json')), 'dist');
// gecko.js inlines gecko.js + gecko.worker.js + gecko.data; chrome-demo serves
// whichever wasm artifact the current gecko.js build produced.
const ENGINE = ['gecko.wasm', 'gecko.wasm.zst'];
const mime = (n: string) =>
  n.endsWith('.wasm') ? 'application/wasm' :
    n.endsWith('.js') ? 'text/javascript' : 'application/octet-stream';

// gecko.data is intentionally stripped to stay minimal, so chrome-demo ships the
// non-binary GRE resource set plus the Firefox browser/ app dir in
// public/chrome-assets.tar.zst. The archive is staged from the engine objdir by
// the root Makefile's `chrome-assets` target (run automatically by `make
// chrome-demo`); the runtime downloads and decompresses it into memory on every
// page load and serves it to the engine as an in-memory FsProvider (see
// src/chrome-fs.ts).
const PUBLIC_DIR = path.resolve(__dirname, 'public');
const ASSET_ARCHIVE = path.join(PUBLIC_DIR, 'chrome-assets.tar.zst');
const ASSET_MANIFEST = path.join(PUBLIC_DIR, 'chrome-assets.json');

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

// The archive is a build input, not something vite stages: just fail fast with a
// pointer at the Makefile if it hasn't been generated (or is missing its manifest).
function ensureChromeAssetsArchive(): void {
  if (!fs.existsSync(ASSET_ARCHIVE) || !fs.existsSync(ASSET_MANIFEST)) {
    throw new Error(
      'chrome-demo: missing public/chrome-assets.tar.zst (or its .json manifest); ' +
      'stage it with `make chrome-assets` (run automatically by `make chrome-demo`)',
    );
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
// `wasm` option in main.ts. The url is RELATIVE to the page (main.ts absolutizes it).
const wasmCompressed = fs.existsSync(path.join(libDist, 'gecko.wasm.zst'));
const GECKO_WASM = { url: wasmCompressed ? 'gecko.wasm.zst' : 'gecko.wasm', compressed: wasmCompressed };

export default defineConfig({
  // Relative asset paths, so the built dist/ works served from any
  // subdirectory, not just the site root (runtime-fetched assets -- the wasm,
  // chrome-assets.tar.zst, the default wisp endpoint -- are resolved against
  // the page URL in main.ts/chrome-fs.ts to match).
  base: './',
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
