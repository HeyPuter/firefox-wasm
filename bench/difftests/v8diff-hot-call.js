// HOT JIT-vs-V8 differential #3: call/arg semantics + exceptions + recursion -- areas with
// historical JIT bugs (argc-ABI, variadic >8, args-object, deopt-in-error). 40k-iter hot loops.
var out=[]; function rec(l,v){ out.push(l+"="+String(v)); }
var N=40000;

// ---- underflow/overflow arg counts (argc-ABI: missing args -> undefined; extra ignored) ----
function f3(a,b,c){ return ((a|0) + (b|0)*2 + (c|0)*3 + (arguments.length))|0; }
(function(){ var acc=0; for(var i=0;i<N;i++){ var m=i%4;
  var r = m===0? f3(i) : m===1? f3(i,i+1) : m===2? f3(i,i+1,i+2) : f3(i,i+1,i+2,i+3,i+4);
  acc=(acc + r)|0; } rec("argcount",acc); })();

// ---- >8 args (wide-calls guard area) ----
function f10(a,b,c,d,e,f,g,h,i,j){ return ((a+b+c+d+e+f+g+h+i+j)|0); }
(function(){ var acc=0; for(var k=0;k<N;k++){ acc=(acc + f10(k,1,2,3,4,5,6,7,8, k&7))|0; } rec("wide",acc); })();

// ---- rest parameters ----
function frest(first, ...rest){ var s=first|0; for(var i=0;i<rest.length;i++) s=(s + (rest[i]|0)*(i+1))|0; return (s + rest.length)|0; }
(function(){ var acc=0; for(var i=0;i<N;i++){ var m=i%5; var r;
  if(m===0) r=frest(i); else if(m===1) r=frest(i,1); else if(m===2) r=frest(i,1,2,3); else if(m===3) r=frest(i,1,2,3,4,5); else r=frest(i,1,2,3,4,5,6,7,8,9);
  acc=(acc + r)|0; } rec("rest",acc); })();

// ---- spread calls ----
function fsum(){ var s=0; for(var i=0;i<arguments.length;i++) s=(s + (arguments[i]|0))|0; return s; }
var spreadArrs=[[1,2],[3,4,5],[6],[7,8,9,10],[]];
(function(){ var acc=0; for(var i=0;i<N;i++){ var a=spreadArrs[i%spreadArrs.length]; acc=(acc + fsum(...a, i&15))|0; } rec("spread",acc); })();

// ---- default parameters ----
function fdef(a, b=10, c=a*2){ return ((a|0) + (b|0) + (c|0))|0; }
(function(){ var acc=0; for(var i=0;i<N;i++){ var m=i%3; var r = m===0? fdef(i) : m===1? fdef(i, i&7) : fdef(i, i&7, i&15); acc=(acc + r)|0; } rec("default",acc); })();

// ---- destructuring params ----
function fdes({x=1, y=2}, [p, q=9]=[]){ return ((x|0)+(y|0)*2+(p|0)*3+(q|0)*4)|0; }
(function(){ var acc=0; for(var i=0;i<N;i++){ var m=i%3; var r = m===0? fdes({}) : m===1? fdes({x:i&7},[i&3]) : fdes({x:i,y:i+1},[i,i+2]); acc=(acc + r)|0; } rec("destructure",acc); })();

// ---- exceptions thrown+caught in hot loop (deopt-in-error path) ----
function mayThrow(i){ if((i%7)===0) throw {code:i&255}; if((i%13)===0) throw new Error("e"+(i&15)); return (i*3)|0; }
function tryer(i){ try{ return mayThrow(i); }catch(e){ if(e instanceof Error) return -(e.message.length); return -(e.code|0); } finally{ /* no return */ } }
(function(){ var acc=0; for(var i=0;i<N;i++){ acc=(acc + tryer(i))|0; } rec("exc",acc); })();

// ---- nested try/finally with control flow ----
function tf(i){ var r=0; try{ if(i&1) throw i; r=1; }catch(e){ r=2; }finally{ r+=10; if((i%9)===0) return (r+100)|0; } return (r + (i&7))|0; }
(function(){ var acc=0; for(var i=0;i<N;i++){ acc=(acc + tf(i))|0; } rec("tryfin",acc); })();

// ---- recursion (moderate depth, JIT'd) ----
function fib(n){ return n<2? n : (fib(n-1)+fib(n-2))|0; }
(function(){ var acc=0; for(var i=0;i<N;i++){ acc=(acc + fib((i%18)))|0; } rec("fib",acc); })();
function sumTo(n,a){ return n<=0? a : sumTo(n-1, (a+n)|0); }  // tail-ish
(function(){ var acc=0; for(var i=0;i<N;i++){ acc=(acc + sumTo(i%60, 0))|0; } rec("rec2",acc); })();
// mutual recursion
function isEven(n){ return n===0? true : isOdd(n-1); }
function isOdd(n){ return n===0? false : isEven(n-1); }
(function(){ var acc=0; for(var i=0;i<N;i++){ acc=(acc + (isEven(i%40)?1:0))|0; } rec("mutual",acc); })();

// ---- closures capturing mutable state (counter pattern) ----
function mkCounter(){ var c=0; return function(d){ c=(c+d)|0; return c; }; }
(function(){ var acc=0; var ctr=mkCounter(); for(var i=0;i<N;i++){ acc=(acc + ctr(i&7))|0; if((i%1000)===0) ctr=mkCounter(); } rec("closure",acc); })();

var acc=0,j=out.join(";"); for(var i=0;i<j.length;i++) acc=(Math.imul(acc,31)+j.charCodeAt(i))|0;
print("hotcall checksum="+acc+" lines="+out.length);
if (typeof __wjStats==="function") print(__wjStats());
