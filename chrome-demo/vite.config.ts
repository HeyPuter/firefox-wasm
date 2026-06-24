import { defineConfig, type Plugin } from 'vite';
import { createRequire } from 'node:module';
import path from 'node:path';
import fs from 'node:fs';

const require = createRequire(import.meta.url);
const libDist = path.join(path.dirname(require.resolve('libxul.js/package.json')), 'dist');
// libxul.js inlines gecko.js + gecko.worker.js; only the two binaries are served.
const ENGINE = ['gecko.wasm', 'gecko.data'];
const mime = (n: string) =>
  n.endsWith('.wasm') ? 'application/wasm' :
  n.endsWith('.js') ? 'text/javascript' : 'application/octet-stream';

// The chrome files NOT baked into libxul.js's minimal gecko.data live in the
// engine objdir's dist/bin; chrome-demo supplies them to the engine at runtime
// (see src/chrome-fs.ts). This plugin serves them under /gre-extra/, with a
// directory listing when the request ends in "/" (dir names get a trailing "/").
const GRE_SRC = path.resolve(__dirname, '../obj-full-emscripten/dist/bin');

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
        this.emitFile({ type: 'asset', fileName: name, source: fs.readFileSync(path.join(libDist, name)) });
      }
    },
  };
}

function serveGreExtra(): Plugin {
  return {
    name: 'libxul-gre-extra',
    configureServer(server) {
      server.middlewares.use('/gre-extra', (req, res, next) => {
        const rel = decodeURIComponent((req.url || '/').split('?')[0]).replace(/^\//, '');
        const abs = path.join(GRE_SRC, rel);
        if (!abs.startsWith(GRE_SRC)) { res.statusCode = 403; res.end(); return; }
        let st: fs.Stats;
        try { st = fs.statSync(abs); } catch { res.statusCode = 404; res.end(); return; }
        if (st.isDirectory()) {
          const entries = fs.readdirSync(abs, { withFileTypes: true })
            .map((d) => d.isDirectory() ? d.name + '/' : d.name);
          res.setHeader('Content-Type', 'application/json');
          res.end(JSON.stringify(entries));
        } else {
          res.setHeader('Content-Type', 'application/octet-stream');
          fs.createReadStream(abs).pipe(res);
        }
      });
    },
  };
}

const coop = {
  'Cross-Origin-Opener-Policy': 'same-origin',
  'Cross-Origin-Embedder-Policy': 'require-corp',
};

export default defineConfig({
  plugins: [serveEngine(), serveGreExtra()],
  // libxul.js is a workspace package under active rebuild; don't pre-bundle/cache
  // it, so a plain reload picks up a fresh dist/libxul.js (no `vite --force`).
  optimizeDeps: { exclude: ['libxul.js'] },
  server: { headers: coop },
  preview: { headers: coop },
});
