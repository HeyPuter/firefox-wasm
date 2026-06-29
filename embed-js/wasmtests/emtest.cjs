#!/usr/bin/env node
// Compile a real C program with emscripten (the same toolchain SQLite WASM uses)
// and run it through the in-process wasm interpreter. Exercises real emscripten
// codegen: malloc/dlmalloc, call_indirect (function pointers), stack memory, the
// emscripten_resize_heap import callback, and __wasm_call_ctors.
//   node embed-js/wasmtests/emtest.cjs
const fs = require("fs");
const os = require("os");
const path = require("path");
const { execFileSync } = require("child_process");

const ROOT = path.resolve(__dirname, "..", "..");
const EMSDK = path.join(ROOT, "emsdk");
const EMCC = path.join(EMSDK, "upstream", "emscripten", "emcc");
const TMP = fs.mkdtempSync(path.join(os.tmpdir(), "emtest-"));

const C = `
#include <stdlib.h>
typedef int (*op_t)(int,int);
static int add_(int a,int b){return a+b;}
static int mul_(int a,int b){return a*b;}
__attribute__((export_name("compute")))
int compute(int n){
  int* a=(int*)malloc(n*sizeof(int));
  for(int i=0;i<n;i++) a[i]=(int)(((unsigned)i*2654435761u)%1000u);
  for(int i=0;i<n;i++) for(int j=0;j<n-1-i;j++) if(a[j]>a[j+1]){int t=a[j];a[j]=a[j+1];a[j+1]=t;}
  op_t ops[2]={add_,mul_};
  int acc=0;
  for(int i=0;i<n;i++) acc=ops[i&1](acc,a[i]);
  free(a);
  return acc;
}`;
fs.writeFileSync(path.join(TMP, "t.c"), C);
execFileSync(EMCC, [path.join(TMP, "t.c"), "-O2", "-sEXPORTED_FUNCTIONS=_compute",
  "-sENVIRONMENT=web,worker", "-sALLOW_MEMORY_GROWTH=1", "-o", path.join(TMP, "t.js")],
  { env: Object.assign({}, process.env, { EMSDK }) });
const wasm = fs.readFileSync(path.join(TMP, "t.wasm"));

// node reference of compute().
const u32 = (x) => x >>> 0;
function compute(n) {
  const a = [];
  for (let i = 0; i < n; i++) a.push(u32(Math.imul(i, u32(2654435761))) % 1000);
  a.sort((x, y) => x - y);
  let acc = 0;
  for (let i = 0; i < n; i++) acc = (i & 1) ? Math.imul(acc, a[i]) | 0 : (acc + a[i]) | 0;
  return acc | 0;
}

const sp = path.join(TMP, "run.js");
fs.writeFileSync(sp, `var b=new Uint8Array([${Array.from(wasm).join(",")}]);
var em=new WebAssembly.Instance(new WebAssembly.Module(b),{env:{emscripten_resize_heap:function(){return 0;}}});
if(em.exports.__wasm_call_ctors)em.exports.__wasm_call_ctors();
print("compute64="+em.exports.compute(64));
print("compute200="+em.exports.compute(200));
print("compute500="+em.exports.compute(500));`);

const env = Object.assign({}, process.env, { EMSDK, GECKO_WASM_INTERP: "1" });
let out = "";
try { out = execFileSync("node", [path.join(ROOT, "embed-js", "run.cjs"), sp], { env, encoding: "utf8" }); }
catch (e) { out = (e.stdout || "").toString(); console.error(e.stderr || ""); }
const map = {};
for (const l of out.split("\n")) { const m = l.match(/^(\w+)=(.*)$/); if (m) map[m[1]] = m[2]; }

const checks = [["compute64", 64], ["compute200", 200], ["compute500", 500]];
let pass = 0, fail = 0;
for (const [name, n] of checks) {
  const exp = String(compute(n));
  if (map[name] === exp) { pass++; console.log(`PASS ${name} = ${map[name]}`); }
  else { fail++; console.log(`FAIL ${name}: got=${map[name]} expected=${exp}`); }
}
console.log(`\n${pass}/${pass + fail} real-emscripten-wasm checks passed (interpreter)`);
process.exit(fail ? 1 : 0);
