// Small store-heavy driver for pre-barrier verification (gczeal 4). Exercises the
// JIT's emitted pre-write barrier on many object/array/slot stores of GC values.
function hh(x){x=x|0;return ((x^0x9e3779b9)+((x<<6)|0)+(x>>2))|0;}
let acc=0;
let objs=[];
for(let i=0;i<120;i++){
  let o={p:null, q:null, r:i};
  o.p={v:i};            // store GC obj into slot (pre-barrier on overwrite)
  o.q=[i,i+1,i+2];      // store GC array
  o.p={v:i*2};          // overwrite (pre-barrier fires on old value)
  objs.push(o);
  if(objs.length>15){ let d=objs.shift(); d.p=null; d.q=null; }  // null-out (barrier on old)
  for(const x of objs){ acc=hh(acc + x.r + x.p.v + x.q[0]); }
}
// array element stores of GC values (element pre-barrier)
let arr=new Array(20).fill(null);
for(let i=0;i<120;i++){
  arr[i%20]={n:i};      // overwrite element (pre-barrier on old element)
  let s=0; for(const e of arr){ if(e) s=(s+e.n)|0; } acc=hh(acc+s);
}
print("store-heavy checksum="+(acc>>>0));
