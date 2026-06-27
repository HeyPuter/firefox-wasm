import { defineConfig, type Plugin } from 'vite';
import { createRequire } from 'node:module';
import path from 'node:path';
import fs from 'node:fs';
import { server as wisp } from '@mercuryworkshop/wisp-js/server';

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
      server.httpServer?.on('upgrade', (req, socket, head) => {
        if ((req.url || '').startsWith('/wisp')) {
          wisp.routeRequest(req, socket as any, head);
        }
      });
    },
  };
}

// SharedArrayBuffer (pthreads) requires cross-origin isolation.
const coop = {
  'Cross-Origin-Opener-Policy': 'same-origin',
  'Cross-Origin-Embedder-Policy': 'require-corp',
};

export default defineConfig({
  plugins: [libxulEngine(), wispProxy()],
  // gecko.js is a workspace package under active rebuild; don't pre-bundle/cache
  // it, so a plain reload picks up a fresh dist/gecko.js (no `vite --force`).
  optimizeDeps: { exclude: ['gecko.js'] },
  // main.ts uses top-level await (await gecko.init()/load()); keep the build target
  // modern so `vite build` doesn't reject it (dev already uses esnext).
  build: { target: 'esnext' },
  server: { headers: coop },
  preview: { headers: coop },
});
