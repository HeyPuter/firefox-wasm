import { defineConfig, type Plugin } from 'vite';
import { createRequire } from 'node:module';
import path from 'node:path';
import fs from 'node:fs';
import { server as wisp, logging as wispLogging } from '@mercuryworkshop/wisp-js/server';

// gecko.js ships the emscripten engine artifacts next to its bundle (dist/).
const require = createRequire(import.meta.url);
const libDist = path.join(path.dirname(require.resolve('gecko.js/package.json')), 'dist');
// gecko.js inlines gecko.js + gecko.worker.js + the zstd gecko.data + the manifest;
// the ONLY artifact the consumer serves is the wasm -- raw gecko.wasm (debug) or
// gecko.wasm.zst (release). Serve/emit whichever gecko.js actually built.
const ENGINE = ['gecko.wasm', 'gecko.wasm.zst'];
const mime = (n: string) =>
  n.endsWith('.wasm') ? 'application/wasm' :
    n.endsWith('.js') ? 'text/javascript' : 'application/octet-stream';

// Serve the engine artifacts at the server root (/gecko.*) in dev, and emit them
// into the build output. (gecko.js's loadEngine injects <script src="/gecko.js">
// and locateFile resolves /gecko.wasm etc. relative to it.)
function libxulEngine(): Plugin {
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

// Run a WISP proxy (wisp-js) on the dev server itself, at ws(s)://<host>/wisp/.
// The engine fetches http(s):// over it; the demo defaults its WISP field to this
// endpoint. Only /wisp/ upgrades are claimed — Vite's HMR socket passes through.
function wispProxy(): Plugin {
  return {
    name: 'wisp-proxy',
    configureServer(server) {
      // Headless tests (libcurltest.cjs) serve assets on a loopback port and
      // load them in the embedded engine over WISP; wisp-js blocks loopback /
      // private IPs by default, so opt in when explicitly testing.
      // if (process.env.GECKO_WISP_ALLOW_LOOPBACK) {
      wisp.options.allow_loopback_ips = true;
      wisp.options.allow_private_ips = true;
      if (process.env.GECKO_WISP_DEBUG) wispLogging.set_level(wispLogging.DEBUG);
      // }
      server.httpServer?.on('upgrade', (req, socket, head) => {
        if ((req.url || '').startsWith('/wisp')) {
          wisp.routeRequest(req, socket as any, head);
        }
      });
    },
  };
}

// SharedArrayBuffer (pthreads) requires cross-origin isolation. The
// single-threaded build (GECKO_ST=1) has no SAB and deliberately serves
// WITHOUT these headers, proving it runs non-cross-origin-isolated.
const coop = process.env.GECKO_ST === '1'
  ? {}
  : {
      'Cross-Origin-Opener-Policy': 'same-origin',
      'Cross-Origin-Embedder-Policy': 'require-corp',
    };

// The served engine wasm -- whichever gecko.js built (raw gecko.wasm in debug, or
// gecko.wasm.zst in release). Injected as __GECKO_WASM__ and passed to Gecko's required
// `wasm` option in main.ts.
const wasmCompressed = fs.existsSync(path.join(libDist, 'gecko.wasm.zst'));
const GECKO_WASM = { url: wasmCompressed ? '/gecko.wasm.zst' : '/gecko.wasm', compressed: wasmCompressed };

export default defineConfig({
  plugins: [libxulEngine(), wispProxy()],
  define: { __GECKO_WASM__: JSON.stringify(GECKO_WASM) },
  // gecko.js is a workspace package under active rebuild; don't pre-bundle/cache
  // it, so a plain reload picks up a fresh dist/gecko.js (no `vite --force`).
  optimizeDeps: { exclude: ['gecko.js'] },
  // main.ts uses top-level await (await gecko.init()/load()); keep the build target
  // modern so `vite build` doesn't reject it (dev already uses esnext).
  build: { target: 'esnext' },
  server: { headers: coop, allowedHosts: ["gooner"] },
  preview: { headers: coop },
});
