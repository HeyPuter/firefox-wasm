// Adversarial: SIGNED-ZERO (-0) preservation + NaN handling. Prior String()-based
// checksums collapse -0 -> "0", missing -0-vs-+0 divergences (Object.is(-0,0)===false,
// 1/-0===-Infinity). Historical -0 bugs: negzero-mul, mod-copysign, Math.round(-0.5).
// enc() distinguishes -0/+0/NaN precisely so any divergence changes the checksum.
function enc(r){
  if (typeof r !== "number") return "x"+r;
  if (r !== r) return "NaN";
  if (r === 0) return Object.is(r, -0) ? "n0" : "p0";
  return "" + r;
}
function h(x,s){ s=String(s); for(let i=0;i<s.length;i++){x=(Math.imul(x,31)+s.charCodeAt(i))|0;} return x; }
function ops(a,b){
  var r=0;
  r=h(r, enc(a*b)); r=h(r, enc(a/b)); r=h(r, enc(a%b)); r=h(r, enc(b%a));
  r=h(r, enc(-a)); r=h(r, enc(a+b)); r=h(r, enc(a-b));
  r=h(r, enc(Math.floor(a))); r=h(r, enc(Math.ceil(a))); r=h(r, enc(Math.round(a)));
  r=h(r, enc(Math.trunc(a))); r=h(r, enc(Math.abs(a))); r=h(r, enc(Math.sign(a)));
  r=h(r, enc(Math.min(a,b))); r=h(r, enc(Math.max(a,b))); r=h(r, enc(Math.min(a,-0)));
  r=h(r, enc(Math.max(-0,a))); r=h(r, enc(a**b)); r=h(r, enc(Math.pow(a,b)));
  r=h(r, enc(a|0)); r=h(r, enc(a>>>0)); r=h(r, enc(~~a)); r=h(r, enc(a*1));
  r=h(r, enc(0*a)); r=h(r, enc(a*0)); r=h(r, enc(-1*a)); r=h(r, enc(a/-1));
  r=h(r, enc(+String(a))); r=h(r, enc(parseFloat(enc(a)==="n0"?"-0":String(a))));
  r=h(r, enc((a<b)?a:b)); r=h(r, enc(Math.fround(a))); r=h(r, enc(Math.cbrt(a)));
  return r;
}
// values chosen to PRODUCE -0 / NaN across the ops
var vals=[0, -0, 1, -1, 0.5, -0.5, 2, -2, 1.5, -1.5, 5, -5, NaN, Infinity, -Infinity,
  0.1, -0.1, 100, -100, 2.5, -2.5, 1e-10, -1e-10, 3, -3];
var acc=0;
for(var it=0; it<150; it++){
  for(var i=0;i<vals.length;i++) for(var j=0;j<vals.length;j++){ acc=h(acc, ops(vals[i], vals[j])); }
}
print("15-signedzero-nan checksum="+acc);
