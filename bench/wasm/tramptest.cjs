#!/usr/bin/env node
// Reproduction matrix for emscripten's addFunction path under the interp.
// Each case: convertJsFunctionToWasm builds a tiny module re-exporting an
// imported JS callback as "f"; the wrapper goes into module B's table and is
// reached via call_indirect (emscripten's invoke_* shape). Some callbacks
// reenter wasm (call back into B) to mimic libcurl's websocket callbacks.
const fs = require("fs");
const os = require("os");
const path = require("path");
const { execFileSync } = require("child_process");

const ROOT = path.resolve(__dirname, "..", "..");
const TMP = fs.mkdtempSync(path.join(os.tmpdir(), "tramp-"));

// wabt wat2wasm if present, else binaryen wasm-as (from emsdk).
const ASM = (() => {
  try { execFileSync("wat2wasm", ["--version"], { stdio: "ignore" });
        return { bin: "wat2wasm", feats: ["--enable-all"] }; }
  catch { return { bin: path.join(process.env.EMSDK || "/home/claude/emsdk", "upstream", "bin", "wasm-as"),
                   feats: ["-all"] }; }
})();

// emscripten convertJsFunctionToWasm module-build fallback (verbatim).
function tramp(sig) {
  var typeSection = [1, 0, 1, 96];
  var sigRet = sig.slice(0, 1), sigParam = sig.slice(1);
  var tc = { i: 127, j: 126, f: 125, d: 124 };
  typeSection.push(sigParam.length);
  for (var i = 0; i < sigParam.length; i++) typeSection.push(tc[sigParam[i]]);
  if (sigRet == "v") typeSection.push(0);
  else typeSection = typeSection.concat([1, tc[sigRet]]);
  typeSection[1] = typeSection.length - 2;
  return new Uint8Array([0, 97, 115, 109, 1, 0, 0, 0].concat(typeSection,
    [2, 7, 1, 1, 101, 1, 102, 0, 0, 7, 5, 1, 1, 102, 0, 0]));
}

// wasm value-type token per emscripten sig char
const VTWAT = { i: "i32", j: "i64", f: "f32", d: "f64" };
function watType(sig) {
  const ret = sig[0], params = sig.slice(1);
  const p = params.split("").map((c) => "(param " + VTWAT[c] + ")").join(" ");
  const r = ret === "v" ? "" : "(result " + VTWAT[ret] + ")";
  return { p, r };
}

// Build module B for a given sig: exported table + trigger() that pushes default
// args then call_indirects table[0]. Also exports a `helper` B can be reentered
// through (an exported i32->i32 add-one) so callbacks can call back into wasm.
function moduleB(sig) {
  const { p, r } = watType(sig);
  const params = sig.slice(1);
  const pushArgs = params.split("").map((c) =>
    c === "i" ? "(i32.const 7)" : c === "j" ? "(i64.const 7)" :
    c === "f" ? "(f32.const 7)" : "(f64.const 7)").join("\n    ");
  const dropRet = r ? "drop" : "";
  const wat = `(module
  (type $sig (func ${p} ${r}))
  (table (export "tbl") 1 funcref)
  (func (export "helper") (param i32) (result i32) local.get 0 i32.const 1 i32.add)
  (func (export "trigger")
    ${pushArgs}
    i32.const 0
    call_indirect (type $sig)
    ${dropRet}))`;
  const wp = path.join(TMP, "b.wat"), op = path.join(TMP, "b.wasm");
  fs.writeFileSync(wp, wat);
  execFileSync(ASM.bin, [wp, ...ASM.feats, "-o", op]);
  return fs.readFileSync(op);
}

const CASES = [
  { sig: "vi", reenter: false },
  { sig: "vii", reenter: false },
  { sig: "viii", reenter: false },
  { sig: "iii", reenter: false },
  { sig: "ii", reenter: true },   // callback reenters B.helper
  { sig: "vi", reenter: true },
  { sig: "ji", reenter: false },  // i64 return
  { sig: "vj", reenter: false },  // i64 param
];

let script = "var fails=0;\n";
for (let ci = 0; ci < CASES.length; ci++) {
  const { sig, reenter } = CASES[ci];
  const ta = tramp(sig);
  const wb = moduleB(sig);
  const retsVal = sig[0] !== "v";
  const retLit = sig[0] === "j" ? "1n" : "1";  // i64 return must be a BigInt
  const cbBody = reenter
    ? `binst.exports.helper(3); ` + (retsVal ? `return ${retLit};` : "")
    : (retsVal ? `return ${retLit};` : "");
  script += `
(function(){
  try {
    var tbytes=new Uint8Array([${Array.from(ta).join(",")}]);
    var binst; // forward
    var cb=function(){ ${cbBody} };
    var tinst=new WebAssembly.Instance(new WebAssembly.Module(tbytes),{e:{f:cb}});
    var bbytes=new Uint8Array([${Array.from(wb).join(",")}]);
    binst=new WebAssembly.Instance(new WebAssembly.Module(bbytes),{});
    binst.exports.tbl.set(0, tinst.exports.f);
    binst.exports.trigger();
    print("case ${ci} sig=${sig} reenter=${reenter}: OK");
  } catch(e) {
    fails++;
    print("case ${ci} sig=${sig} reenter=${reenter}: THREW "+e);
    if(e&&e.stack) print("  STACK "+String(e.stack).replace(/\\n/g,"\\n  "));
  }
})();`;
}
script += `\nprint("fails="+fails);`;

const sp = path.join(TMP, "run.js");
fs.writeFileSync(sp, script);
const env = Object.assign({}, process.env, { GECKO_WASM_INTERP: "1" });
try {
  const out = execFileSync("node", [path.join(ROOT, "bench", "main.ts"), "__exec", sp], { env, encoding: "utf8" });
  process.stdout.write(out);
  const m = out.match(/fails=(\d+)/);
  const fails = m ? +m[1] : 1;
  console.log(`${CASES.length - fails}/${CASES.length} trampoline cases passed`);
  process.exit(fails ? 1 : 0);
} catch (e) {
  process.stdout.write("[stdout]\n" + (e.stdout || ""));
  process.stdout.write("[stderr]\n" + (e.stderr || ""));
  process.exit(1);
}
