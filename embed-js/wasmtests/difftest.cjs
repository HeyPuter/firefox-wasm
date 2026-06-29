#!/usr/bin/env node
// Differential test harness for the in-process wasm interpreter.
// Compiles a set of .wat modules with wat2wasm, embeds them in a generated
// in-engine test script, runs it under the SpiderMonkey embedder both with
// GECKO_WASM_INTERP=1 (interpreter) and without (host passthrough), and
// compares the results + checks them against expected values.
//
//   node embed-js/wasmtests/difftest.cjs
const fs = require("fs");
const os = require("os");
const path = require("path");
const { execFileSync } = require("child_process");

const ROOT = path.resolve(__dirname, "..", "..");
const TMP = fs.mkdtempSync(path.join(os.tmpdir(), "wasmtest-"));

function wat2wasm(name, wat) {
  const watPath = path.join(TMP, name + ".wat");
  const wasmPath = path.join(TMP, name + ".wasm");
  fs.writeFileSync(watPath, wat);
  execFileSync("wat2wasm", [watPath, "-o", wasmPath]);
  return Array.from(fs.readFileSync(wasmPath));
}

// Each test: { name, wat, run } where run is in-engine JS source (string) using
// `bytes` (the module) and `print` to emit one line "name=<value>".
const TESTS = [];
function T(name, wat, runBody) { TESTS.push({ name, wat, runBody }); }

T("arith", `(module (func (export "f") (param i32 i32) (result i32)
  local.get 0 local.get 1 i32.add local.get 0 i32.mul))`,
  `var i=new WebAssembly.Instance(new WebAssembly.Module(bytes),{});
   print("arith="+i.exports.f(7,3));`); // (7+3)*7=70

T("loop_sum", `(module (func (export "f") (param i32) (result i32)
  (local i32 i32)
  (local.set 1 (i32.const 0)) (local.set 2 (i32.const 1))
  (block $b (loop $l
    (br_if $b (i32.gt_s (local.get 2) (local.get 0)))
    (local.set 1 (i32.add (local.get 1) (local.get 2)))
    (local.set 2 (i32.add (local.get 2) (i32.const 1)))
    (br $l)))
  (local.get 1)))`,
  `var i=new WebAssembly.Instance(new WebAssembly.Module(bytes),{});
   print("loop_sum="+i.exports.f(100));`); // 5050

T("fib", `(module (func $fib (export "f") (param i32) (result i32)
  (if (result i32) (i32.lt_s (local.get 0) (i32.const 2))
    (then (local.get 0))
    (else (i32.add (call $fib (i32.sub (local.get 0)(i32.const 1)))
                   (call $fib (i32.sub (local.get 0)(i32.const 2))))))))`,
  `var i=new WebAssembly.Instance(new WebAssembly.Module(bytes),{});
   print("fib="+i.exports.f(20));`); // 6765

T("brtable", `(module (func (export "f") (param i32) (result i32)
  (block $d (block $c (block $b (block $a
    (br_table $a $b $c $d (local.get 0)))
    (return (i32.const 10))) (return (i32.const 20)))
    (return (i32.const 30))) (i32.const 99)))`,
  `var i=new WebAssembly.Instance(new WebAssembly.Module(bytes),{});
   print("brtable="+[i.exports.f(0),i.exports.f(1),i.exports.f(2),i.exports.f(5)].join(","));`);
   // 10,20,30,99

T("mem", `(module (memory (export "mem") 1)
  (func (export "store") (param i32 i32) (local.get 0)(local.get 1)(i32.store))
  (func (export "load") (param i32)(result i32)(local.get 0)(i32.load))
  (func (export "grow") (param i32)(result i32)(local.get 0)(memory.grow))
  (func (export "size")(result i32)(memory.size)))`,
  `var i=new WebAssembly.Instance(new WebAssembly.Module(bytes),{});
   i.exports.store(16,0xdeadbeef|0);
   var u=new Uint32Array(i.exports.mem.buffer); var before=u[4];
   var g=i.exports.grow(2);
   print("mem="+i.exports.load(16)+","+before+",grow="+g+",size="+i.exports.size());`);
   // load=-559038737, u[4]=3735928559, grow=1, size=3

T("i64", `(module (func (export "f") (param i64 i64) (result i64)
  (i64.add (i64.mul (local.get 0)(local.get 1)) (i64.const 1))))`,
  `var i=new WebAssembly.Instance(new WebAssembly.Module(bytes),{});
   print("i64="+i.exports.f(1000000000000n, 7n));`); // 7000000000001n

T("float", `(module (func (export "f") (param f64) (result f64)
  (f64.sqrt (f64.add (local.get 0) (f64.const 0.0))))
  (func (export "g") (param f32) (result i32) (i32.trunc_f32_s (local.get 0))))`,
  `var i=new WebAssembly.Instance(new WebAssembly.Module(bytes),{});
   print("float="+i.exports.f(144)+","+i.exports.g(3.9));`); // 12, 3

T("import", `(module (import "env" "add" (func $add (param i32 i32)(result i32)))
  (func (export "f") (param i32)(result i32)
    (call $add (local.get 0)(i32.const 100))))`,
  `var i=new WebAssembly.Instance(new WebAssembly.Module(bytes),{env:{add:(a,b)=>a+b}});
   print("import="+i.exports.f(23));`); // 123

T("global", `(module (global $g (mut i32) (i32.const 5))
  (func (export "f") (param i32)(result i32)
    (global.set $g (i32.add (global.get $g) (local.get 0)))
    (global.get $g)))`,
  `var i=new WebAssembly.Instance(new WebAssembly.Module(bytes),{});
   print("global="+i.exports.f(10)+","+i.exports.f(10));`); // 15,25

T("callind", `(module (type $t (func (param i32)(result i32)))
  (table 2 funcref) (elem (i32.const 0) $a $b)
  (func $a (param i32)(result i32)(i32.add (local.get 0)(i32.const 1)))
  (func $b (param i32)(result i32)(i32.mul (local.get 0)(i32.const 2)))
  (func (export "f") (param i32 i32)(result i32)
    (call_indirect (type $t) (local.get 0) (local.get 1))))`,
  `var i=new WebAssembly.Instance(new WebAssembly.Module(bytes),{});
   print("callind="+i.exports.f(10,0)+","+i.exports.f(10,1));`); // 11,20

T("bulk", `(module (memory (export "mem") 1)
  (data (i32.const 0) "\\01\\02\\03\\04")
  (func (export "f") (result i32)
    (memory.copy (i32.const 8) (i32.const 0) (i32.const 4))
    (memory.fill (i32.const 100) (i32.const 0xAB) (i32.const 3))
    (i32.load (i32.const 8))))`,
  `var i=new WebAssembly.Instance(new WebAssembly.Module(bytes),{});
   var b=new Uint8Array(i.exports.mem.buffer);
   print("bulk="+i.exports.f()+","+b[10]+","+b[101]);`); // 0x04030201=67305985,3,171

T("signext", `(module (func (export "f") (param i32)(result i32)
  (i32.extend8_s (local.get 0))))`,
  `var i=new WebAssembly.Instance(new WebAssembly.Module(bytes),{});
   print("signext="+i.exports.f(0xFF));`); // -1

T("truncsat", `(module (func (export "f") (param f64)(result i32)
  (i32.trunc_sat_f64_s (local.get 0))))`,
  `var i=new WebAssembly.Instance(new WebAssembly.Module(bytes),{});
   print("truncsat="+i.exports.f(1e30)+","+i.exports.f(-1e30)+","+i.exports.f(NaN));`);
   // 2147483647,-2147483648,0

T("fmath", `(module (func (export "f") (param f64)(result f64)
  (f64.add (f64.add (f64.ceil (local.get 0)) (f64.floor (local.get 0)))
    (f64.add (f64.nearest (local.get 0))
      (f64.add (f64.min (local.get 0)(f64.const 2.5))
               (f64.max (local.get 0)(f64.const 2.5)))))))`,
  `var i=new WebAssembly.Instance(new WebAssembly.Module(bytes),{});
   print("fmath="+i.exports.f(3.5));`); // 4+3+4+2.5+3.5=17

T("conv", `(module (func (export "a")(param f64)(result i32)(i32.trunc_f64_u (local.get 0)))
  (func (export "b")(param i32)(result i64)(i64.extend_i32_u (local.get 0)))
  (func (export "c")(param f32)(result f64)(f64.promote_f32 (local.get 0)))
  (func (export "d")(param i32)(result f32)(f32.convert_i32_u (local.get 0))))`,
  `var i=new WebAssembly.Instance(new WebAssembly.Module(bytes),{});
   print("conv="+i.exports.a(3000000000)+","+i.exports.b(-1)+","+i.exports.c(0.5)+","+i.exports.d(-1));`);
   // 3000000000, 4294967295n, 0.5, 4294967296

T("divrem", `(module
  (func (export "a")(param i32 i32)(result i32)(i32.div_s (local.get 0)(local.get 1)))
  (func (export "b")(param i32 i32)(result i32)(i32.rem_s (local.get 0)(local.get 1)))
  (func (export "c")(param i32 i32)(result i32)(i32.div_u (local.get 0)(local.get 1))))`,
  `var i=new WebAssembly.Instance(new WebAssembly.Module(bytes),{});
   var dz=""; try{i.exports.a(1,0);}catch(e){dz=e.constructor.name;}
   print("divrem="+i.exports.a(-7,2)+","+i.exports.b(-7,2)+","+i.exports.c(-2,2)+","+dz);`);
   // -3,-1,2147483647,RuntimeError

T("select", `(module (func (export "f")(param i32 i32 i32)(result i32)
  (select (local.get 0)(local.get 1)(local.get 2))))`,
  `var i=new WebAssembly.Instance(new WebAssembly.Module(bytes),{});
   print("select="+i.exports.f(11,22,1)+","+i.exports.f(11,22,0));`); // 11,22

T("trap", `(module (memory 1)(func (export "f")(param i32)(result i32)(i32.load (local.get 0))))`,
  `var i=new WebAssembly.Instance(new WebAssembly.Module(bytes),{});
   var t=""; try{i.exports.f(1000000);}catch(e){t=e.constructor.name;}
   print("trap="+t);`); // RuntimeError (OOB)

T("unreachable", `(module (func (export "f")(result i32)(unreachable)))`,
  `var i=new WebAssembly.Instance(new WebAssembly.Module(bytes),{});
   var t=""; try{i.exports.f();}catch(e){t=e.constructor.name+":"+e.message;}
   print("unreachable="+t);`); // RuntimeError:unreachable executed

// Build the in-engine test script.
let script = "";
for (const t of TESTS) {
  const arr = wat2wasm(t.name, t.wat);
  script += `(function(){try{var bytes=new Uint8Array([${arr.join(",")}]);${t.runBody}}catch(e){print(${JSON.stringify(t.name)}+"=ERR:"+(e&&e.message?e.message:e));}})();\n`;
}
const scriptPath = path.join(TMP, "all.js");
fs.writeFileSync(scriptPath, script);

function runMode(interp) {
  const env = Object.assign({}, process.env, { EMSDK: path.join(ROOT, "emsdk") });
  if (interp) env.GECKO_WASM_INTERP = "1"; else delete env.GECKO_WASM_INTERP;
  let out = "";
  try {
    out = execFileSync("node", [path.join(ROOT, "embed-js", "run.cjs"), scriptPath],
      { env, encoding: "utf8" });
  } catch (e) {
    out = (e.stdout || "").toString();  // capture partial output (passthrough aborts)
  }
  const map = {};
  for (const line of out.split("\n")) {
    const m = line.match(/^([a-z0-9_]+)=(.*)$/);
    if (m) map[m[1]] = m[2];
  }
  return map;
}

const EXPECT = {
  arith: "70", loop_sum: "5050", fib: "6765", brtable: "10,20,30,99",
  mem: "-559038737,3735928559,grow=1,size=3", i64: "7000000000001",
  float: "12,3", import: "123", global: "15,25", callind: "11,20",
  bulk: "67305985,3,171", signext: "-1", truncsat: "2147483647,-2147483648,0",
  fmath: "17", conv: "-1294967296,4294967295,0.5,4294967296",
  divrem: "-3,-1,2147483647,RuntimeError", select: "11,22",
  trap: "RuntimeError", unreachable: "RuntimeError:unreachable executed",
};

const passthrough = runMode(false);
const interp = runMode(true);

let pass = 0, fail = 0;
for (const t of TESTS) {
  const n = t.name;
  const pv = passthrough[n], iv = interp[n], ev = EXPECT[n];
  if (iv === ev) {
    pass++;
    const xcheck = pv === iv ? "" : ` (passthrough: ${pv === undefined ? "n/a" : pv})`;
    console.log(`PASS ${n} = ${iv}${xcheck}`);
  } else {
    fail++;
    console.log(`FAIL ${n}: interp=${iv} expected=${ev} (passthrough=${pv})`);
  }
}
console.log(`\n${pass}/${pass + fail} interp tests passed`);
process.exit(fail ? 1 : 0);
