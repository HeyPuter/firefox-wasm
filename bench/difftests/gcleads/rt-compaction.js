// Runtime-under-compaction differential: diverse JIT'd runtime patterns at LOW iters
// so both JIT and PBL finish under gczeal 14,2. Any stale-ptr-after-tenured-move in
// EXECUTED code (not compile) diverges vs PBL. Compile bug already fixed.
function hh(x){x=x|0;x=(x^0x9e3779b9)+((x<<6)|0)+(x>>2)|0;return x|0;}
let acc=0;
function mko(i){ return {a:i, b:i*2, c:"s"+(i%7), d:[i,i+1]}; }
let keep=[];
for(let i=0;i<1500;i++){ let o=mko(i); keep.push(o); if(keep.length>50) keep.shift();
  for(const o2 of keep){ acc=hh(acc + o2.a + o2.b + o2.c.length + o2.d[0]); } }
let arr=[];
for(let i=0;i<1500;i++){ arr.push(i%13); if(arr.length>40) arr.splice(0,5);
  let s=0; for(const v of arr) s=(s+v)|0; acc=hh(acc+s+arr.length); }
let str="";
for(let i=0;i<1200;i++){ str+=String.fromCharCode(65+(i%26)); if(str.length>60) str=str.slice(10);
  let t=0; for(let k=0;k<str.length;k++) t=(t*31+str.charCodeAt(k))|0; acc=hh(acc+t); }
let m=new Map();
for(let i=0;i<1500;i++){ let cap={n:i}; let f=()=>cap.n*3-i; m.set(i%30, f());
  let sum=0; for(const kv of m) sum=(sum+kv[0]+kv[1])|0; acc=hh(acc+sum); }
print("rt-compaction checksum="+(acc>>>0));
