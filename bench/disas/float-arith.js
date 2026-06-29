// f64 arithmetic must lower to native wasm float ops, not boxed-value helpers.
// FN: fma
// CHECK-COMPILES
// CHECK: f64.add
// CHECK-COUNT-2: f64.mul
function fma(a, b) { return a * 0.5 + b * 0.25; }
let s = 0.0;
for (let i = 0; i < 300000; i++) s = fma(s, i) * 0.999;
print('s=' + s);
