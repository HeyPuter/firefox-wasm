// Closures/scoping + destructuring/spread/rest/defaults/recursion.
function h(x,s){ s=String(s); for(let i=0;i<s.length;i++){x=(x*31+s.charCodeAt(i))|0;} return x; }
function makeCounter(start){ let n=start; return ()=>++n; }
function fib(n){ return n<2?n:fib(n-1)+fib(n-2); }
function sumRest(first,...rest){ return first + rest.reduce((p,c)=>p+c,0); }
function withDefaults(a, b=a*2, {c=a+b, d=10}={}){ return a+b+c+d; }
function fold(i){
  let r=0;
  // closures capturing loop vars (let vs the classic var bug)
  const fns=[]; for(let j=0;j<5;j++){ fns.push(()=>j*i); } r=h(r, fns.map(f=>f()).join(","));
  const vfns=[]; for(var k=0;k<5;k++){ vfns.push(()=>k); } r=h(r, vfns.map(f=>f()).join(","));
  // counter closure
  const c=makeCounter(i); r=h(r, c()+c()+c());
  // destructuring
  const [a,b,...tail]=[i,i+1,i+2,i+3,i+4]; r=h(r, a+b+tail.length+tail.join(""));
  const {x=1,y=2,z=3}={x:i,z:i*2}; r=h(r, x+y+z);
  const {p:{q=9}={}}= i%2? {p:{q:i}} : {}; r=h(r, q);
  // spread
  const arr=[...Array(4).keys()].map(n=>n+i); r=h(r, Math.max(...arr)); r=h(r, sumRest(...arr));
  const merged={...{a:1,b:2}, ...{b:i,c:3}}; r=h(r, merged.a+merged.b+merged.c);
  // recursion + defaults
  r=h(r, fib(i%15)); r=h(r, withDefaults(i)); r=h(r, withDefaults(i, 5)); r=h(r, withDefaults(i,5,{c:1}));
  // swap via destructuring
  let m=i, n=i*3; [m,n]=[n,m]; r=h(r, m+"-"+n);
  return r;
}
let acc=0;
for(let it=0;it<40000;it++){ acc=h(acc, fold(it%23)); }
print("12-closures-destructure checksum="+acc);
