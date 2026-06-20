// Ion callee-CONTROL-FLOW inlining gate: inline callees that have if/else and
// loops (not just straight-line expressions). Warm callers so ICs fill, then the
// trigger fires the FE test on the target.
//   GECKO_WJVS_IONFE_TARGET=8  GECKO_WJVS_IONFE=9  GECKO_WJVS_IONFE_ARGS="3,5"
function mx(a, b) { if (a > b) return a; return b; }          // branch -> 2 returns
function clamp(x) {                                            // multi-branch
  if (x < 0.0) return 0.0;
  if (x > 10.0) return 10.0;
  return x;
}
function sumto(n) {                                            // loop in callee
  var s = 0.0; var i = 0.0;
  while (i < n) { s = s + i; i = i + 1.0; }
  return s;
}
function caller(a, b) { return mx(a, b) + clamp(a) + sumto(b); }  // line 14
function trigger(z) { return z + 1.0; }                          // line 15

// caller(3,5) = mx(3,5)=5 + clamp(3)=3 + sumto(5)=(0+1+2+3+4)=10 => 18
var acc = 0.0;
for (var k = 0; k < 200000; k++) { acc = acc + caller(3.0, 5.0); }
for (var k = 0; k < 200000; k++) { acc = acc + trigger(k); }
print("caller(3,5)=" + caller(3.0, 5.0));   // expect 18
print("acc=" + acc);
