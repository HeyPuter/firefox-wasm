// GC-ROOTING LEAD (2026-07-12): deterministic JIT-ONLY crash under GECKO_GCZEAL=7,1
// GECKO_NURSERY_MB=1 ("script failed with NO pending exception"); PBL + JIT-no-gczeal + gczeal7,10
// all PASS. Reduced from bench/difftests/01-int-coercion.js. Needs coerce(int-coerce/modulo) +
// pow(Math.pow/**) both present, ~4800 iters (cumulative GC collections). RSS flat ~248MB (NOT a
// leak). See memory gcstress-01-03-rooting-lead-2026-07-12. Repro:
//   GECKO_GCZEAL=7,1 GECKO_NURSERY_MB=1 node bench/main.ts __exec bench/difftests/gcleads/coerce-pow-gczeal-crash.js
function h(s){let x=0;s=String(s);for(let i=0;i<s.length;i++){x=(x*31+s.charCodeAt(i))|0;}return x;}
function coerce(x){return [x|0,x>>>0,x&0xffffffff,(x*1)|0,~~x,x%1,x%-1,1%x,-x%1];}
function pow(a,b){return [Math.pow(a,b),a**b,(Math.pow(a,b))|0];}
let acc="";
const dbls=[0,-0,0.5,-0.5,1.5,-1.5,1e10,-1e10,2**31,2**32,2**53,-(2**53),NaN,Infinity,-Infinity,3.14,1e-10,4294967296.7];
for(let it=0;it<4800;it++){
  for(const x of dbls){ acc=h(acc+h(coerce(x))); }
  for(const a of dbls) for(const b of [0,1,2,3,-1,0.5,31,32]){ acc=h(acc+h(pow(a,b))); }
}
print("coerce-pow checksum: "+acc);
