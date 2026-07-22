// REAL APP: big.js arbitrary-precision decimal arithmetic. Internally does heavy
// integer arithmetic on digit arrays + rounding-mode logic + string<->number
// conversion -- a strong oracle for integer/coercion miscompiles. Full-result
// checksum, JIT vs PBL. Load: big.min.js drv-big.js
function mix(h, s){ s=String(s); for (var i=0;i<s.length;i++){ h=(Math.imul(h,31)+s.charCodeAt(i))|0; } return h; }
var operands = ["0","1","-1","2","0.5","-0.5","123.456","-789.012","1000000","0.0001",
  "9999999999.9999999999","3.14159265358979","-0.00000001","42","7","-13.37","2.5","100",
  "0.1","0.2","0.3","987654321","1e-9","55.55"];
function fold(seed){
  var h = 0;
  var Big = (typeof globalThis !== "undefined" && globalThis.Big) || Big;
  for (var i = 0; i < operands.length; i++) {
    var j = (i + 1 + (seed % 7)) % operands.length;
    var a, b;
    try { a = new Big(operands[i]); b = new Big(operands[j]); } catch(e){ h = mix(h, "ctor:"+e); continue; }
    h = mix(h, a.plus(b).toString());
    h = mix(h, a.minus(b).toString());
    h = mix(h, a.times(b).toString());
    try { h = mix(h, a.div(b).toString()); } catch(e){ h = mix(h, "div0"); }
    try { h = mix(h, a.mod(b).toString()); } catch(e){ h = mix(h, "mod0"); }
    h = mix(h, a.abs().toString());
    h = mix(h, a.cmp(b) + "/" + a.eq(b) + "/" + a.gt(b) + "/" + a.lte(b));
    // rounding modes 0..3 (down, half-up, half-even, up)
    for (var rm = 0; rm <= 3; rm++) { try { h = mix(h, a.round(2 + (seed % 4), rm).toString()); } catch(e){ h = mix(h, "rnd"); } }
    // pow (integer exponent) + sqrt
    try { h = mix(h, a.pow((seed % 5)).toString()); } catch(e){ h = mix(h, "pow"); }
    try { if (a.gte(0)) h = mix(h, a.sqrt().toString()); } catch(e){ h = mix(h, "sqrt"); }
    // formatting
    try { h = mix(h, a.toFixed(3) + "|" + a.toPrecision(6) + "|" + a.toExponential(2)); } catch(e){ h = mix(h, "fmt"); }
  }
  return h;
}
var acc = 0;
for (var it = 0; it < 1500; it++) acc = mix(acc, fold(it % 29));
print("BIGJS checksum=" + acc);
