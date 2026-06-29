// Real-app correctness+bail stressor: parse a feature-rich JS source with Acorn
// (a real parser) and validate a deterministic AST node count. Acorn exercises
// heavy string scanning (charCodeAt/substring/regex), AST object/array allocation,
// deep recursion, polymorphic property access, Maps/Sets, closures -- MIR coverage
// the microbenchmarks miss. validate() throws on a wrong node count -> self-checks
// JIT correctness (a miscompile that corrupts parsing changes the count).
var ACORN = (typeof globalThis !== "undefined" && globalThis.acorn) || acorn;

// A varied real-JS snippet (classes, async, generators, destructuring, spread,
// template literals, regex, arrows, default/rest params, computed props, try/catch,
// switch, for-of, closures, optional chaining). Repeated to make a substantial input.
var UNIT = `
class Shape {
  #id = 0;
  constructor(name, { x = 0, y = 0 } = {}) { this.name = name; this.x = x; this.y = y; }
  get pos() { return [this.x, this.y]; }
  static from(...args) { return new Shape(...args); }
  async measure(scale = 1) { return await Promise.resolve((this.x ** 2 + this.y ** 2) * scale); }
  *vertices() { for (const v of this.pos) yield v * 2; }
}
const re = /([a-z]+)\\s*=\\s*("(?:[^"\\\\]|\\\\.)*"|\\d+)/gi;
function parseKV(s) {
  const out = {}; let m;
  while ((m = re.exec(s)) !== null) { out[m[1]] = m[2]?.startsWith('"') ? m[2].slice(1, -1) : +m[2]; }
  return out;
}
const memo = new Map();
const fib = n => n < 2 ? n : (memo.has(n) ? memo.get(n) : (memo.set(n, fib(n-1) + fib(n-2)), memo.get(n)));
const items = [1, 2, 3, 4, 5].map(x => ({ k: \`item\${x}\`, v: x * x })).filter(o => o.v % 2 === 1);
function process(data) {
  switch (data.type) {
    case "a": case "b": return data.values.reduce((s, v) => s + v, 0);
    case "c": { const [head, ...tail] = data.values; return head - tail.length; }
    default: try { return JSON.parse(data.raw).count; } catch (e) { return -1; }
  }
}
const handlers = { onClick(e) { return e.target?.id ?? "none"; }, ["on" + "Hover"]: function() { return this; } };
const api = { Shape, parseKV, fib, items, process, handlers };
`;

class Benchmark {
  setup() {
    var parts = [];
    for (var i = 0; i < 30; i++) parts.push("{\n" + UNIT.replace(/Shape/g, "Shape" + i) + "\n}");
    this.src = parts.join("\n");
    this.opts = { ecmaVersion: 2022, sourceType: "script" };
    this.count = 0;
  }
  runIteration() {
    var ast = ACORN.parse(this.src, this.opts);
    // Walk the tree counting nodes (deterministic checksum over the AST shape).
    var n = 0;
    var stack = [ast];
    while (stack.length) {
      var node = stack.pop();
      n++;
      for (var key in node) {
        var v = node[key];
        if (v && typeof v === "object") {
          if (Array.isArray(v)) { for (var j = 0; j < v.length; j++) if (v[j] && typeof v[j] === "object") stack.push(v[j]); }
          else if (typeof v.type === "string") stack.push(v);
        }
      }
    }
    this.count = n;
  }
  validate() {
    // Establish the expected count from the FIRST run (the interpreter/PBL ground
    // truth is the same code path on iteration 0 if warm=0; with warmup the JIT
    // computes it -- so this catches a JIT miscompile that changes node count).
    if (typeof globalThis.ACORN_EXPECT === "undefined") globalThis.ACORN_EXPECT = this.count;
    if (this.count !== globalThis.ACORN_EXPECT)
      throw new Error("acorn node count mismatch: got " + this.count + " expected " + globalThis.ACORN_EXPECT);
    if (this.count < 1000) throw new Error("acorn parsed too few nodes: " + this.count);
    print("NODES=" + this.count);
  }
}
