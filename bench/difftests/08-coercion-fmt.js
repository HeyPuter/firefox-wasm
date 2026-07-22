// Mixed-type coercion + Number formatting (toString radix, toFixed, exponential).
function h(x,s){ s=String(s); for(let i=0;i<s.length;i++){x=(x*31+s.charCodeAt(i))|0;} return x; }
function fold(n,x){
  let r=0;
  // mixed arithmetic coercions
  r=h(r, n+"x"); r=h(r, "x"+n); r=h(r, n+x); r=h(r, n-x); r=h(r, n*x);
  r=h(r, +("  "+n+"  ")); r=h(r, n+true); r=h(r, n+null); r=h(r, n+[]); r=h(r, n+[n]);
  r=h(r, {}+n); r=h(r, [n,x].join("")); r=h(r, `${n}-${x}`);
  // number formatting
  r=h(r, n.toString(2)); r=h(r, n.toString(16)); r=h(r, n.toString(8)); r=h(r, n.toString(36));
  r=h(r, (n>>>0).toString(2)); r=h(r, x.toString());
  r=h(r, x.toFixed(3)); r=h(r, x.toFixed(0)); r=h(r, x.toPrecision(5));
  r=h(r, x.toExponential(2)); r=h(r, Number(n).toLocaleString?0:0);
  r=h(r, parseInt(x.toString(16),16)); r=h(r, (n|0).toString());
  return r;
}
const ns=[0,1,-1,255,256,-256,1000,65535,0x7fffffff,-0x80000000,42,-42,7,100000];
const xs=[0,-0,0.5,-0.5,3.14159,-3.14159,1e-7,1e7,123.456,999.9995,0.00012345,-1.5,2.5,1e21];
let acc=0;
for(let it=0;it<2500;it++) for(const n of ns) for(const x of xs){ acc=h(acc, fold(n,x)); }
print("08-coercion-fmt checksum="+acc);
