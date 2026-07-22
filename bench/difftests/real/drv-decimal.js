// REAL LIB: decimal.js arbitrary-precision arithmetic + TRANSCENDENTALS (ln/exp/sin/cos/tan/
// atan/pow/sqrt via Taylor series + argument reduction). Heavy integer+float digit-array algos
// -> strong oracle for arith/coercion miscompiles beyond big.js. Deterministic at fixed precision.
var Decimal = (typeof globalThis!=="undefined" && globalThis.Decimal) || (typeof Decimal!=="undefined"?Decimal:null);
Decimal.set({ precision: 30, rounding: 4, toExpNeg: -20, toExpPos: 40 });
function mix(h, s){ s=String(s); h=h|0; for(var i=0;i<s.length;i++) h=(Math.imul(h,31)+s.charCodeAt(i))|0; return h|0; }

var ops = ["0","1","-1","2","0.5","-0.5","3.14159265358979","2.718281828459045","123.456",
  "-789.012","0.0001","1000000","0.1","0.2","10","-2.5","7","0.333333333333","1.5","-0.75","42","0.9999"];
var h = 0;
function D(s){ return new Decimal(s); }
for (var i=0;i<ops.length;i++){
  var a = D(ops[i]);
  var b = D(ops[(i+5)%ops.length]);
  // basic arithmetic
  h = mix(h, a.plus(b)); h = mix(h, a.minus(b)); h = mix(h, a.times(b));
  try{ h = mix(h, a.div(b)); }catch(e){ h = mix(h,"div0"); }
  try{ h = mix(h, a.mod(b)); }catch(e){ h = mix(h,"mod0"); }
  h = mix(h, a.abs()); h = mix(h, a.neg());
  h = mix(h, a.floor()); h = mix(h, a.ceil()); h = mix(h, a.round());
  h = mix(h, a.cmp(b)+"/"+a.eq(b)+"/"+a.gt(b));
  // pow (integer + fractional exponent)
  try{ h = mix(h, a.pow(3)); }catch(e){ h = mix(h,"pow"); }
  try{ h = mix(h, a.abs().pow(D("0.5"))); }catch(e){ h = mix(h,"powf"); }
  // TRANSCENDENTALS (the rich algorithmic surface)
  try{ if(a.gte(0)) h = mix(h, a.sqrt()); }catch(e){ h = mix(h,"sqrt"); }
  try{ if(a.gt(0)) h = mix(h, a.ln()); }catch(e){ h = mix(h,"ln"); }
  try{ h = mix(h, a.exp()); }catch(e){ h = mix(h,"exp"); }
  try{ h = mix(h, a.sin()); }catch(e){ h = mix(h,"sin"); }
  try{ h = mix(h, a.cos()); }catch(e){ h = mix(h,"cos"); }
  try{ h = mix(h, a.tan()); }catch(e){ h = mix(h,"tan"); }
  try{ h = mix(h, a.atan()); }catch(e){ h = mix(h,"atan"); }
  try{ if(a.gt(0)) h = mix(h, a.log(10)); }catch(e){ h = mix(h,"log10"); }
  // formatting
  h = mix(h, a.toFixed(8)); h = mix(h, a.toPrecision(12)); h = mix(h, a.toExponential(6));
}
print("DECIMAL checksum=" + h);
