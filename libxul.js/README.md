# libxul.js

Embeddable **Gecko** — Firefox's rendering engine — compiled to WebAssembly, as an
ESM library with a small API class. It lays out and paints real web content into a
`<canvas>` entirely in the browser tab and forwards mouse/keyboard/wheel input.

```ts
import { Gecko } from 'libxul.js';

const gecko = new Gecko({ canvas: document.querySelector('canvas')! });
await gecko.init();
await gecko.load('data:text/html,<h1>hello from Gecko</h1>');
```

## What it ships

The library bundle (`dist/libxul.js`) **inlines** the emscripten glue (`gecko.js`)
and the pthread worker (`gecko.worker.js`) — they run from Blob URLs, so you never
serve them. The only assets you serve are the two large binaries, **`gecko.wasm`**
and **`gecko.data`** (they ship in `dist/`; point libxul at where you serve them
with `assetBase`). Because pthreads need `SharedArrayBuffer`, the page must be
**cross-origin isolated** (`Cross-Origin-Opener-Policy: same-origin` +
`Cross-Origin-Embedder-Policy: require-corp`).

`gecko.data` contains only the **minimal GRE** needed to render a web page. Larger
trees that a basic embed doesn't need — notably the Firefox front-end (`browser/`)
— are left out; supply them yourself with an `fs` provider.

## `GeckoOptions`

| option | meaning |
| --- | --- |
| `canvas` | the page `<canvas>` to paint into (software composited) |
| `env` | extra engine env vars (e.g. `{ GECKO_CHROME: '1' }`) |
| `fs` | `{ readFile, readdir }` supplying GRE files beyond the baked set (mounted under `/gre`) |
| `wispUrl` | WISP websocket endpoint; Necko fetches `http(s)://` over it |
| `assetBase` | URL prefix where you serve `gecko.wasm` + `gecko.data` (default `./`, relative to the page) |
| `locateFile`, `print`, `printErr`, `width`, `height`, `forwardInput` | as named |

### The `fs` provider

`readdir(path)` returns child names (directories **suffixed with `/`**); `readFile(path)`
returns the bytes. The provider root maps to `/gre`. See `chrome-demo` for a provider
that serves the Firefox front-end so the full browser UI boots (`GECKO_CHROME=1`).

## Building

`gecko.*` is produced by `build/build-lib.sh` (stages the engine libs + a minimal
GRE, then emcc-links), and `dist/` by rspack (`rspack.config.js`). Both run via:

```
make libxul        # from the repo root: builds the engine then the bundle
# or, with the engine already built (obj-full-emscripten/dist/bin/libxul.so):
pnpm --filter libxul.js build
```
