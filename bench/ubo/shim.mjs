// Minimal globals the uBlock SNFE dependency graph touches. Imported first so
// these exist before the uBlock module bodies evaluate.
const g = globalThis;
if ( typeof g.self === 'undefined' ) { g.self = g; }
if ( typeof g.vAPI === 'undefined' ) {
    g.vAPI = {
        canWASM: false,   // force the pure-JS tries (no .wasm fetch in a shell) -> all interpreted/JIT-able
        localStorage: { getItem() { return null; }, setItem() {}, removeItem() {} },
        webextFlavor: { env: [], soup: new Set(['firefox', 'webext']) },
    };
}
// static-filtering-parser.compileXpathExpression guards `document instanceof Object`,
// so leaving document undefined is fine. CSS.supports provided defensively.
if ( typeof g.CSS === 'undefined' ) { g.CSS = { supports() { return false; } }; }
