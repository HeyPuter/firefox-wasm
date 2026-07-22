// Float/Math edge cases. Hash the STRINGIFIED result so any value divergence
// (precision, -0, NaN, Inf) changes the checksum. Primitive return -> verifier-safe.
function h(x,s){ s=String(s); for(let i=0;i<s.length;i++){x=(x*31+s.charCodeAt(i))|0;} return x; }
function fold(x){
  let r=0;
  r+=Math.floor(x); r+=Math.ceil(x); r+=Math.round(x); r+=Math.trunc(x);
  r+=Math.abs(x); r+=Math.sign(x); r+=Math.sqrt(x<0?-x:x);
  r+=Math.min(x,0.5); r+=Math.max(x,-0.5);
  r+=(x<0?-x:x)**0.5; r+=Math.cbrt(x); r+=Math.hypot(x,1);
  r+=Math.log2(x<0?-x:x+1); r+=Math.expm1(x*1e-3); r+=Math.log1p(x<0?0:x);
  r+=Math.fround(x); r+=Math.clz32(x|0); r+=Math.imul(x|0, 3);
  r+=(x%2); r+=(x%3.5); r+=(1/x); r+=(-1/x); r+=(x*0);
  return r;
}
const vals=[0,-0,0.5,-0.5,1.5,-1.5,2.5,-2.5,3.49999999,-3.5,1e-8,-1e-8,1e8,1e15,1e16,
  2**31,2**52,2**53+1,0.1,0.2,0.3,123.456,-999.999,NaN,Infinity,-Infinity];
let acc=0;
for(let it=0;it<15000;it++) for(const x of vals){ acc=h(acc, fold(x)); }
print("02-float-math checksum="+acc);
