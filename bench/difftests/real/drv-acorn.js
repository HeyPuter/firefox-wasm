// REAL APP: parse feature-rich JS with Acorn and checksum the ENTIRE AST
// (every node type + every primitive field), not just a node count. Any parser
// miscompile (string scanning, number parsing, recursion, poly property access)
// changes the checksum. Load with: acorn.js drv-acorn.js
var A = (typeof globalThis !== "undefined" && globalThis.acorn) || acorn;
function mix(h, s){ s = String(s); for (var i=0;i<s.length;i++){ h = (Math.imul(h,31) + s.charCodeAt(i))|0; } return h; }
// Iterative (explicit-stack) walk -- deep recursion overflows the wasm stack.
// Deterministic: on pop, hash the node's own primitive fields in key order and
// push object/array children (order fixed => same traversal in JIT and PBL).
function checksum(root){
  var h = 0, stack = [root];
  while (stack.length){
    var node = stack.pop();
    if (node === null) { h = mix(h, "null"); continue; }
    if (typeof node !== "object") { h = mix(h, typeof node + ":" + node); continue; }
    if (Array.isArray(node)) { h = mix(h, "[" + node.length);
      for (var i = node.length - 1; i >= 0; i--) stack.push(node[i]); continue; }
    var keys = Object.keys(node); h = mix(h, "{" + keys.length);
    for (var k=0;k<keys.length;k++){ var key = keys[k]; var v = node[key];
      if (v && typeof v === "object") { h = mix(h, key + "#"); stack.push(v); }
      else h = mix(h, key + "=" + typeof v + ":" + v); }
  }
  return h;
}
// Source built as array-joined lines (no outer template literal -> no escaping hazards).
// Still exercises: classes/private fields/static, async/await, generators, destructuring,
// spread/rest, regex, numeric separators/bigint/hex/octal/binary, optional chaining,
// nullish, labels, try/catch, computed props, arrow fns, template literals (as content).
var UNIT = [
  'class Store {',
  '  #state = new Map(); static VERSION = 2.1e3;',
  '  constructor(init = {}, ...rest) { for (const [k, v] of Object.entries(init)) this.#state.set(k, v); this.rest = rest; }',
  '  get size() { return this.#state.size; }',
  '  *entries() { for (const e of this.#state) yield e; }',
  '  async load(id = 0) { return await Promise.resolve(id ?? -1); }',
  '  update(key, fn = (x) => x) { const prev = this.#state.get(key) ?? null; const next = fn(prev); this.#state.set(key, next); return next !== prev; }',
  '}',
  'const pattern = /(?<year>\\d{4})-(?<mon>\\d{2})-(?<day>\\d{2})(?:T(?<h>\\d{2}):(?<m>\\d{2}))?/gu;',
  'function parseDates(text) { const out = []; let m; while ((m = pattern.exec(text))) { const { year, mon, day } = m.groups; out.push(+year * 372 + +mon * 31 + +day); } return out; }',
  'const pipeline = (xs) => xs.filter((x) => x != null).map((x) => x?.value ?? 0).reduce((a, b) => a + b, 0);',
  'const config = { retries: 3, backoff: [100, 200, 400], flags: { verbose: false, ["dyn" + "amic"]: true }, handler: async ({ id } = {}) => id ?? -1 };',
  'label: for (let i = 0; i < 10; i++) { for (let j = 0; j < 10; j++) { if (i * j > 20) continue label; if (i + j === 7) break label; } }',
  'const tpl = `path/to/${config.retries}/file and ${pipeline([])}`;',
  'try { throw new TypeError("x"); } catch ({ message }) { void message; } finally { void 0; }',
  'const { a = 1, b: { c = 2 } = {}, ...others } = config;',
  'const nums = [0b1010, 0o17, 0xFF, 1_000_000, 3.14e-2, .5, 6n, 0xABCDEFn];',
  'function* gen() { yield* [1, 2, 3]; return (a ?? c) || (nums && others); }',
  'switch (config.retries) { case 1: case 2: break; case 3: { const z = a > 0 ? a : -a; void z; } default: ; }'
].join("\n");
var parts = [];
for (var i = 0; i < 5; i++) parts.push("{\n" + UNIT.replace(/Store/g, "Store" + i) + "\n}");
var src = parts.join("\n");
var opts = { ecmaVersion: 2022, sourceType: "script" };
var sum = 0;
for (var it = 0; it < 30; it++) {
  var ast = A.parse(src, opts);
  sum = (Math.imul(sum, 1000003) ^ checksum(ast)) | 0;
}
print("ACORN-AST checksum=" + sum);
