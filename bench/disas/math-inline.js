// Math.sqrt / Math.floor must stay INLINE (f64.sqrt / f64.floor), not regress to
// a MathFunction helper bail.
// FN: mathy
// CHECK: f64.sqrt
// CHECK: f64.floor
function mathy(x) { return Math.sqrt(x) + Math.floor(x * 0.5); }
let s = 0.0;
for (let i = 0; i < 300000; i++) s += mathy(i * 0.5);
print('s=' + s);
