// HOT JIT-vs-V8 differential: each op runs in a function called 40k times so it TIERS UP
// to wasm-JIT, then the accumulated result is compared vs V8. This actually exercises the
// JIT's specialized code (Int32 speculation, coercion, element/prop ICs) -- unlike the
// one-shot batteries which mostly stayed in PBL. Precisely-specified ops only (no radix tail).
var out=[]; function rec(l,v){ out.push(l+"="+String(v)); }
var N=40000;

// integer arithmetic + Int32 speculation/overflow
function iarith(a,b){ return ((a+b)|0) ^ ((a-b)|0) ^ (Math.imul(a,b)) ^ ((a/ (b||1))|0) ^ (a%(b||1) |0); }
var ia=[0,1,-1,2,-2,127,-128,32767,-32768,0x7fffffff,-0x80000000,0x40000000,65535,-65536,3,7];
(function(){ var acc=0; for(var i=0;i<N;i++){ var a=ia[i%ia.length], b=ia[(i*7+3)%ia.length]; acc=(acc + iarith(a,b))|0; } rec("iarith",acc); })();

// coercion fault-lines (|0, >>>0, ~~, +, *1, unary-)
function coerce(x){ return ((x|0) + (x>>>0) + (~~x) + ((x*1)|0) + ((-x)|0) + ((x&0xffff))) |0; }
var cv=[0,-0,0.5,-0.5,1.5,-1.5,1e10,-1e10,2**31,2**32,2**53,-(2**53),NaN,Infinity,-Infinity,4294967296.7,-1.9,255.9];
(function(){ var acc=0; for(var i=0;i<N;i++){ acc=(acc + coerce(cv[i%cv.length]))|0; } rec("coerce",acc); })();

// float arithmetic
function farith(a,b){ return a+b - a*b + a/(b+0.5) + (a%b); }
var fa=[0.1,0.2,0.5,1.5,-1.5,3.14159,2.71828,1e-10,1e10,-0.0,100.25,0.333333];
(function(){ var acc=0; for(var i=0;i<N;i++){ acc += farith(fa[i%fa.length], fa[(i*3+1)%fa.length]); } rec("farith",acc); rec("farithI", (acc*1000)|0); })();

// Math funcs (Int32-returning: the saturate/-0 class)
function mfn(x){ return (Math.floor(x)|0) ^ (Math.ceil(x)|0) ^ (Math.round(x)|0) ^ (Math.trunc(x)|0) ^ (Math.abs(x)|0) ^ (Math.sign(x)|0) ^ (Math.min(x,3)|0) ^ (Math.max(x,-3)|0); }
(function(){ var acc=0; for(var i=0;i<N;i++){ acc=(acc + mfn(cv[i%cv.length]))|0; } rec("mfn",acc); })();

// bit shifts (negative/overflow shift amounts)
function bits(a,b){ return (a<<(b&31)) ^ (a>>(b&31)) ^ (a>>>(b&31)) ^ (a<<b) ^ (a>>>b); }
(function(){ var acc=0; for(var i=0;i<N;i++){ acc=(acc + bits(ia[i%ia.length], ia[(i*5)%ia.length]))|0; } rec("bits",acc); })();

// comparisons (mixed int/double/-0/NaN)
function cmp(a,b){ return (a<b?1:0)+(a<=b?2:0)+(a>b?4:0)+(a>=b?8:0)+(a==b?16:0)+(a===b?32:0)+((a!=b)?64:0); }
(function(){ var acc=0; for(var i=0;i<N;i++){ acc=(acc + cmp(cv[i%cv.length], cv[(i*11+2)%cv.length]))|0; } rec("cmp",acc); })();

// dense array element access + write
function elem(arr,i){ arr[i%arr.length]=(arr[(i*3)%arr.length]+i)|0; return arr[(i*7)%arr.length]|0; }
(function(){ var arr=[1,2,3,4,5,6,7,8]; var acc=0; for(var i=0;i<N;i++){ acc=(acc + elem(arr,i))|0; } rec("elem",acc); })();

// property access mono + poly
function prop(o){ return (o.a + o.b*2 + (o.c|0))|0; }
var shapes=[{a:1,b:2,c:3},{a:4,b:5,c:6},{a:7,b:8,c:9,d:10},{a:1,b:2,c:3}];
(function(){ var acc=0; for(var i=0;i<N;i++){ acc=(acc + prop(shapes[i%shapes.length]))|0; } rec("prop",acc); })();

// string charCodeAt/length in hot loop
function strh(s){ var x=0; for(var k=0;k<s.length;k++) x=(x*31 + s.charCodeAt(k))|0; return x; }
var strs=["abc","hello world","JIT","","x","1234567890"];
(function(){ var acc=0; for(var i=0;i<N;i++){ acc=(acc + strh(strs[i%strs.length]))|0; } rec("strh",acc); })();

// Math.pow / ** (Int32-speculation historical bug area)
function powf(a,b){ return (Math.pow(a,b)|0) ^ ((a**b)|0); }
var pb=[0,1,2,3,-1,-2];
(function(){ var acc=0; for(var i=0;i<N;i++){ acc=(acc + powf(ia[i%ia.length]&7, pb[i%pb.length]))|0; } rec("powf",acc); })();

var acc=0,j=out.join(";"); for(var i=0;i<j.length;i++) acc=(Math.imul(acc,31)+j.charCodeAt(i))|0;
print("hotv8 checksum="+acc+" lines="+out.length);
if (typeof __wjStats === "function") print("__wjStats="+__wjStats());
