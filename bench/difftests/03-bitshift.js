// Integer/bit-shift edges: variable shift counts, >=32, negative, ToInt32 of doubles.
function h(x,s){ s=String(s); for(let i=0;i<s.length;i++){x=(x*31+s.charCodeAt(i))|0;} return x; }
function fold(a,b){
  let r=0;
  r=h(r, a<<b); r=h(r, a>>b); r=h(r, a>>>b);
  r=h(r, a<<(b|0)); r=h(r, (a|0)>>>(b|0));
  r=h(r, (a*2)|0); r=h(r, (a+0.5)|0); r=h(r, (a-0.5)>>>0);
  r=h(r, ~a); r=h(r, a&b); r=h(r, a|b); r=h(r, a^b);
  r=h(r, Math.imul(a,b)); r=h(r, Math.clz32(a>>>0));
  r=h(r, (a/b)|0); r=h(r, (a>>>0)/(b>>>0)|0);
  return r;
}
const ints=[0,1,-1,2,31,32,33,63,64,-32,-33,255,256,0x7fffffff,-0x80000000,
  0xffffffff|0,0x12345678,-123456789,65535,-65535,7,-7,1000000000,-1000000000];
let acc=0;
for(let it=0;it<3000;it++) for(const a of ints) for(const b of ints){ acc=h(acc, fold(a,b)); }
print("03-bitshift checksum="+acc);
