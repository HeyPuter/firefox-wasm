// Runtime-under-compaction differential #2: callback-heavy + higher-order patterns.
function hh(x){x=x|0;x=(x^0x85ebca6b)+((x<<5)|0)+(x>>3)|0;return x|0;}
let acc=0;
// higher-order array methods with JIT'd callbacks (tenured arrays/closures move)
for(let i=0;i<1200;i++){
  let a=[]; for(let k=0;k<20;k++) a.push((i*7+k)%53);
  let m=a.map(x=>x*3+1);
  let f=m.filter(x=>(x&1)===0);
  let r=f.reduce((s,x)=>(s+x)|0, i);
  a.forEach(x=>{ acc=hh(acc+x); });
  let sorted=a.slice().sort((x,y)=>x-y);
  acc=hh(acc + r + f.length + sorted[0] + sorted[sorted.length-1]);
}
// JSON round-trip (parse/stringify with reviver/replacer callbacks)
for(let i=0;i<800;i++){
  let obj={id:i, tags:["a"+(i%5),"b"+(i%3)], nested:{v:i*2, ok:(i%2)===0}};
  let s=JSON.stringify(obj, (k,v)=> typeof v==="number"? v+1 : v);
  let p=JSON.parse(s, (k,v)=> typeof v==="number"? v-1 : v);
  acc=hh(acc + p.id + p.tags.length + p.nested.v + (p.nested.ok?1:0));
}
// Set + entries/keys/values iterators
for(let i=0;i<1000;i++){
  let st=new Set(); for(let k=0;k<15;k++) st.add((i+k)%40);
  let sum=0; for(const v of st.values()) sum=(sum+v)|0;
  for(const v of st) sum=(sum^v)|0;
  acc=hh(acc+sum+st.size);
}
print("rt-compaction2 checksum="+(acc>>>0));
