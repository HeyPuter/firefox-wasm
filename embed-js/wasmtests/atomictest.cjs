#!/usr/bin/env node
// Atomics correctness for the in-process interpreter. Defines a shared memory +
// the full atomic opcode set (load/store/rmw/cmpxchg/fence, i32+i64+subwidths)
// and checks results against a JS reference. Single-threaded: validates opcode
// semantics + decode; cross-thread behaviour is exercised by the nested test.
//   node embed-js/wasmtests/atomictest.cjs
const fs = require("fs");
const os = require("os");
const path = require("path");
const { execFileSync } = require("child_process");

const ROOT = path.resolve(__dirname, "..", "..");
const TMP = fs.mkdtempSync(path.join(os.tmpdir(), "atomic-"));

const wat = `(module
  (memory (export "mem") 1 1 shared)
  (func (export "load32") (param i32) (result i32) local.get 0 i32.atomic.load)
  (func (export "store32") (param i32 i32) local.get 0 local.get 1 i32.atomic.store)
  (func (export "load64") (param i32) (result i64) local.get 0 i64.atomic.load)
  (func (export "store64") (param i32 i64) local.get 0 local.get 1 i64.atomic.store)
  (func (export "load8u") (param i32) (result i32) local.get 0 i32.atomic.load8_u)
  (func (export "store8") (param i32 i32) local.get 0 local.get 1 i32.atomic.store8)
  (func (export "add") (param i32 i32) (result i32) local.get 0 local.get 1 i32.atomic.rmw.add)
  (func (export "sub") (param i32 i32) (result i32) local.get 0 local.get 1 i32.atomic.rmw.sub)
  (func (export "and") (param i32 i32) (result i32) local.get 0 local.get 1 i32.atomic.rmw.and)
  (func (export "or")  (param i32 i32) (result i32) local.get 0 local.get 1 i32.atomic.rmw.or)
  (func (export "xor") (param i32 i32) (result i32) local.get 0 local.get 1 i32.atomic.rmw.xor)
  (func (export "xchg") (param i32 i32) (result i32) local.get 0 local.get 1 i32.atomic.rmw.xchg)
  (func (export "cmpxchg") (param i32 i32 i32) (result i32)
    local.get 0 local.get 1 local.get 2 i32.atomic.rmw.cmpxchg)
  (func (export "add64") (param i32 i64) (result i64) local.get 0 local.get 1 i64.atomic.rmw.add)
  (func (export "add8u") (param i32 i32) (result i32) local.get 0 local.get 1 i32.atomic.rmw8.add_u)
  (func (export "fence") atomic.fence))`;
fs.writeFileSync(path.join(TMP, "a.wat"), wat);
execFileSync("wat2wasm", [path.join(TMP, "a.wat"), "--enable-threads",
  "-o", path.join(TMP, "a.wasm")]);
const wb = fs.readFileSync(path.join(TMP, "a.wasm"));

const sp = path.join(TMP, "run.js");
fs.writeFileSync(sp, `
var bytes=new Uint8Array([${Array.from(wb).join(",")}]);
var inst=new WebAssembly.Instance(new WebAssembly.Module(bytes),{});
var e=inst.exports;
var fails=0;
function eq(name,got,want){ if(got!==want){fails++;print("FAIL "+name+" got="+got+" want="+want);} else print("PASS "+name+"="+got); }
// store/load roundtrip
e.store32(0, 0x12345678|0); eq("load32", e.load32(0), 0x12345678|0);
e.store8(4, 0xAB); eq("load8u", e.load8u(4), 0xAB);
e.store64(8, 0x1122334455667788n); eq("load64", e.load64(8), 0x1122334455667788n);
// rmw (returns OLD value)
e.store32(16, 100);
eq("add.old", e.add(16, 5), 100); eq("add.new", e.load32(16), 105);
eq("sub.old", e.sub(16, 10), 105); eq("sub.new", e.load32(16), 95);
e.store32(16, 0xF0|0); eq("and", e.and(16, 0x3C), 0xF0|0); eq("and.new", e.load32(16), 0x30);
eq("or", e.or(16, 0x0F), 0x30); eq("or.new", e.load32(16), 0x3F);
eq("xor", e.xor(16, 0xFF), 0x3F); eq("xor.new", e.load32(16), 0xC0);
eq("xchg", e.xchg(16, 777), 0xC0); eq("xchg.new", e.load32(16), 777);
// cmpxchg: expected matches -> swaps; mismatch -> no-op, both return OLD
e.store32(20, 50);
eq("cx.match.old", e.cmpxchg(20, 50, 60), 50); eq("cx.match.new", e.load32(20), 60);
eq("cx.miss.old", e.cmpxchg(20, 999, 70), 60); eq("cx.miss.new", e.load32(20), 60);
// i64 rmw
e.store64(24, 1000n); eq("add64.old", e.add64(24, 1n), 1000n); eq("add64.new", e.load64(24), 1001n);
// subword rmw with wrap
e.store8(28, 250); eq("add8u.old", e.add8u(28, 10), 250); eq("add8u.new", e.load8u(28), (250+10)&0xFF);
e.fence();
print("fails="+fails);
`);

const env = Object.assign({}, process.env, { GECKO_WASM_INTERP: "1" });
try {
  const out = execFileSync("node", [path.join(ROOT, "embed-js", "run.cjs"), sp], { env, encoding: "utf8" });
  process.stdout.write(out);
} catch (e) {
  process.stdout.write("[stdout]\n" + (e.stdout || "") + "\n[stderr]\n" + (e.stderr || ""));
}
