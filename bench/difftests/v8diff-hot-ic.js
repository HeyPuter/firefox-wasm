// HOT JIT-vs-V8 differential #2: IC-heavy paths (megamorphic prop access, accessors,
// proto chains, shape transitions) -- run in 40k-iter hot loops to force tier-up.
// These are where past JIT bugs lived (prop-IC key, store-IC dyn-key, megacache, poly-getter).
var out=[]; function rec(l,v){ out.push(l+"="+String(v)); }
var N=40000;

// ---- megamorphic property READ (12 distinct shapes at one site) ----
function mkShapes(){ var s=[];
  s.push({a:1}); s.push({a:2,b:1}); s.push({a:3,c:1}); s.push({a:4,b:2,c:3});
  s.push({x:1,a:5}); s.push({a:6,b:2,c:3,d:4}); s.push({a:7,e:1}); s.push({f:1,a:8});
  s.push({a:9,b:2,c:3,d:4,e:5}); s.push({a:10,g:1}); s.push({a:11,h:1,i:2}); s.push({a:12,b:2});
  return s; }
var shapes=mkShapes();
function readA(o){ return o.a|0; }
(function(){ var acc=0; for(var i=0;i<N;i++){ acc=(acc + readA(shapes[i%shapes.length]))|0; } rec("megaRead",acc); })();

// ---- megamorphic property WRITE (existing slot, many shapes) ----
function writeA(o,v){ o.a=v; return o.a|0; }
(function(){ var acc=0; for(var i=0;i<N;i++){ var o=shapes[i%shapes.length]; acc=(acc + writeA(o, (i^o.a)&0xffff))|0; } rec("megaWrite",acc); })();

// ---- dynamic-key (by-value) property access (the setpropic dyn-key bug area) ----
var keys=["a","b","c","d","x","y","z"];
function dynGet(o,k){ return (o[k]|0); }
function dynSet(o,k,v){ o[k]=v; return o[k]|0; }
(function(){ var acc=0; var o={a:0,b:0,c:0,d:0,x:0,y:0,z:0}; for(var i=0;i<N;i++){ var k=keys[i%keys.length]; dynSet(o,k,(i*3)&0xff); acc=(acc + dynGet(o,keys[(i*5)%keys.length]))|0; } rec("dynKey",acc); })();

// ---- accessor properties (getters/setters) ----
function mkAcc(base){ var _v=base; return { get v(){ return _v*2+1; }, set v(x){ _v=x&0xffff; }, plain:base }; }
function accGet(o){ return (o.v + o.plain)|0; }
(function(){ var objs=[]; for(var i=0;i<8;i++) objs.push(mkAcc(i)); var acc=0;
  for(var i=0;i<N;i++){ var o=objs[i%objs.length]; o.v=(i^o.plain)&0x7fff; acc=(acc + accGet(o))|0; } rec("accessor",acc); })();

// ---- prototype-chain lookups (inherited data + method) ----
function Base(n){ this.n=n; } Base.prototype.getN=function(){ return this.n*3; }; Base.prototype.k=7;
function Derived(n,m){ Base.call(this,n); this.m=m; } Derived.prototype=Object.create(Base.prototype);
Derived.prototype.getM=function(){ return this.m+this.k; };
function protoUse(o){ return (o.getN() + o.k + (o.getM?o.getM():0))|0; }
(function(){ var objs=[]; for(var i=0;i<6;i++) objs.push(i%2? new Derived(i,i*2): new Base(i)); var acc=0;
  for(var i=0;i<N;i++){ acc=(acc + protoUse(objs[i%objs.length]))|0; } rec("proto",acc); })();

// ---- shape transitions: add + delete properties in hot loop ----
function transition(i){ var o={a:i}; o.b=i*2; o.c=i*3; if(i&1){ delete o.b; } o.d=i*4; if(i&2){ delete o.a; } var s=0; for(var k in o) s=(s + (o[k]|0))|0; return s|0; }
(function(){ var acc=0; for(var i=0;i<N;i++){ acc=(acc + transition(i))|0; } rec("transition",acc); })();

// ---- polymorphic method dispatch (different impls per shape) ----
var impls=[{f:function(){return 1;},v:10},{f:function(){return 2;},v:20},{f:function(){return 3;},v:30}];
function dispatch(o){ return (o.f()*o.v)|0; }
(function(){ var acc=0; for(var i=0;i<N;i++){ acc=(acc + dispatch(impls[i%impls.length]))|0; } rec("dispatch",acc); })();

// ---- 'in' operator + hasOwnProperty (hasowncache area) ----
function hasChecks(o){ return (("a" in o)?1:0) + (o.hasOwnProperty("b")?2:0) + (("toString" in o)?4:0) + (o.hasOwnProperty("toString")?8:0); }
(function(){ var acc=0; for(var i=0;i<N;i++){ acc=(acc + hasChecks(shapes[i%shapes.length]))|0; } rec("hasChecks",acc); })();

var acc=0,j=out.join(";"); for(var i=0;i<j.length;i++) acc=(Math.imul(acc,31)+j.charCodeAt(i))|0;
print("hotic checksum="+acc+" lines="+out.length);
if (typeof __wjStats==="function") print(__wjStats());
