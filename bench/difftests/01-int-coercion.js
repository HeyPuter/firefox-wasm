// Adversarial: integer/double coercion fault lines (ToInt32, >>>0, -0, shifts).
// Hot loop forces JIT tier-up; verifier double-checks each call; checksum prints.
function h(s){ // string hash so a single divergent value changes the output
  let x=0; s=String(s); for(let i=0;i<s.length;i++){x=(x*31+s.charCodeAt(i))|0;} return x;
}
let acc="";
function bit(a,b){
  return [a|b, a&b, a^b, ~a, a<<b, a>>b, a>>>b, a<<(b&31), a>>>(b&31)];
}
function coerce(x){
  return [x|0, x>>>0, x&0xffffffff, (x*1)|0, ~~x, x%1, x%-1, 1%x, -x%1];
}
function pow(a,b){ return [Math.pow(a,b), a**b, (Math.pow(a,b))|0]; }
const ints=[0,1,-1,31,32,33,-32,0x7fffffff,-0x80000000,0xffffffff,255,-255,65535];
const dbls=[0,-0,0.5,-0.5,1.5,-1.5,1e10,-1e10,2**31,2**32,2**53,-(2**53),NaN,Infinity,-Infinity,3.14,1e-10,4294967296.7];
for(let iter=0;iter<1200;iter++){
  for(const a of ints) for(const b of ints){ acc=h(acc+h(bit(a,b))); }
  for(const x of dbls){ acc=h(acc+h(coerce(x))); }
  for(const a of dbls) for(const b of [0,1,2,3,-1,0.5,31,32]){ acc=h(acc+h(pow(a,b))); }
}
print("01-int-coercion checksum: "+acc);
