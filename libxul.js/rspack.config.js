// Bundles the TypeScript library (src/index.ts) into an ESM dist/libxul.js and
// ships the emscripten engine artifacts (gecko.mjs/.wasm/.data/.worker.js, built
// by build/build-lib.sh into wasm/) alongside it.
//
// gecko.js (the emscripten glue) and gecko.worker.js (the pthread worker) are
// INLINED into the bundle as source strings (imported with `?source` ->
// asset/source) and loaded from Blob URLs at runtime, so consumers never serve
// them. Only the two big binaries -- gecko.wasm and gecko.data -- ship next to the
// bundle as assets the consumer serves (see GeckoOptions.assetBase).
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import rspack from '@rspack/core';

const here = path.dirname(fileURLToPath(import.meta.url));
const wasm = (f) => path.resolve(here, 'wasm', f);

export default {
  target: 'web',
  mode: 'production',
  entry: './src/index.ts',
  experiments: { outputModule: true },
  output: {
    path: path.resolve(here, 'dist'),
    filename: 'libxul.js',
    library: { type: 'module' },
    module: true,
    clean: false,
  },
  resolve: { extensions: ['.ts', '.js', '.mjs'] },
  module: {
    rules: [
      {
        test: /\.ts$/,
        use: {
          loader: 'builtin:swc-loader',
          options: { jsc: { parser: { syntax: 'typescript' }, target: 'es2022' } },
        },
      },
      // `import x from './gecko.js?source'` -> the file's text, inlined in the bundle.
      { resourceQuery: /source/, type: 'asset/source' },
      // `import uri from './gecko.data.zst?inline'` -> base64 data: URI, inlined.
      // .zst has no entry in the mimetype DB, so set one explicitly (the value is
      // irrelevant -- the loader fetch()es the data: URI for its bytes).
      { resourceQuery: /inline/, type: 'asset/inline', generator: { dataUrl: { mimetype: 'application/octet-stream', encoding: 'base64' } } },
    ],
  },
  plugins: [
    new rspack.CopyRspackPlugin({
      patterns: [
        // gecko.js + gecko.worker.js (asset/source) and gecko.data.zst (asset/inline,
        // zstd) + gecko-assets.json (JSON import) are all INLINED into the bundle.
        // The only artifact the consumer serves is the wasm: raw gecko.wasm in debug,
        // or gecko.wasm.zst in RELEASE (still too big to inline; decoded by the loader).
        ...(process.env.GECKO_RELEASE === '1'
          ? [{ from: wasm('gecko.wasm.zst'), to: 'gecko.wasm.zst', noErrorOnMissing: true }]
          : [{ from: wasm('gecko.wasm'), to: 'gecko.wasm', noErrorOnMissing: true }]),
      ],
    }),
  ],
  optimization: { minimize: false },
};
