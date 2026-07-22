// Adversarial: DEOPT-RESUME correctness under type instability. Each fn tiers up
// monomorphic (JIT speculates a type), then gets speculation-BREAKING inputs -> forces
// deopt-to-PBL mid-function; the resumed value must match PBL. Primitive returns so the
// per-call verifier works too. diffcheck compares JIT vs PBL.
function h(x,s){ s=String(s); for(let i=0;i<s.length;i++){x=(Math.imul(x,31)+s.charCodeAt(i))|0;} return x; }
// (1) arith speculated int32 -> break with double/string/bool/null
function fadd(a,b){ return a + b; }
// (2) property access speculated one shape -> break with other shapes / missing
function fprop(o){ return (o.x|0) + (o.y|0) * 2; }
// (3) array element speculated packed-int -> break with holes/doubles/strings
function felem(a,i){ return a[i]; }
// (4) deopt INSIDE try/catch: speculation break in try, result used after
function ftry(a,b){ try { var r = a * b + a; return r < 1000 ? r : r - 1000; } catch(e){ return -1; } }
// (5) bitwise speculated int -> break with big double (ToInt32 path)
function fbit(x){ return (x << 3) | (x >>> 2); }
// (6) comparison speculated int -> break with mixed
function fcmp(a,b){ return (a < b) ? (a + 1) : (b - 1); }
let acc=0;
// tier-up phase: monomorphic (all small ints / one shape / packed)
for(let i=0;i<40000;i++){
  acc=h(acc, fadd(i%100, (i*3)%50));
  acc=h(acc, fprop({x:i%10, y:i%7}));
  acc=h(acc, felem([1,2,3,4,5], i%5));
  acc=h(acc, ftry(i%30, i%20));
  acc=h(acc, fbit(i%1000));
  acc=h(acc, fcmp(i%50, i%40));
}
// break phase: speculation-breaking inputs (force deopt-resume)
const breakA=[3.14159, -2.5, "42", "hello", true, false, null, undefined, 1e12, -0, NaN, Infinity, 2**52];
const breakO=[{x:1,y:2}, {x:1}, {y:2}, {x:1,y:2,z:3}, {}, {x:"s",y:[1]}, {x:1.5,y:-2.5}, Object.create({x:9})];
const breakArr=[[1,2,3], [1,,3], [1.5,2.5], ["a","b"], [1,2,3,4,5,6], [], [1,2,{}], new Array(5)];
for(let it=0;it<3000;it++){
  for(const a of breakA) for(const b of breakA){ acc=h(acc, fadd(a,b)); acc=h(acc, ftry(a,b)); acc=h(acc, fcmp(a,b)); }
  for(const o of breakO){ acc=h(acc, fprop(o)); }
  for(const arr of breakArr) for(let i=-1;i<7;i++){ acc=h(acc, String(felem(arr,i))); }
  for(const x of breakA){ acc=h(acc, fbit(x)); }
}
print("14-deopt-resume checksum="+acc);
