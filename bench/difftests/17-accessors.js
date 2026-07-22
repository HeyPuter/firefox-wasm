// Adversarial: accessor properties (get/set) — polymorphic call sites, inherited
// accessors, getters with side effects, transforming setters. JIT'd area (polymorphic
// getter/method history). Primitive-fold checksum, diffcheck JIT vs PBL.
function h(x,s){ s=String(s); for(let i=0;i<s.length;i++){x=(Math.imul(x,31)+s.charCodeAt(i))|0;} return x; }
var sideCounter = 0;
// class hierarchy with overridden accessors
class Base { constructor(v){ this._v=v; } get val(){ return this._v*2; } set val(x){ this._v = x+1; } get kind(){ return "base"; } }
class Sub extends Base { get val(){ return this._v*3 + super.val; } get kind(){ return "sub"; } }
class Other { constructor(v){ this._v=v; } get val(){ sideCounter++; return this._v - 5; } set val(x){ this._v = x*2; } get kind(){ return "other"; } }
// object-literal accessors + defineProperty accessors
function litObj(n){ return { _n:n, get val(){ return this._n + 100; }, set val(x){ this._n = x; }, get kind(){ return "lit"; } }; }
function dpObj(n){ var o={_n:n}; Object.defineProperty(o,"val",{ get:function(){ return this._n*this._n; }, set:function(x){ this._n=x-1; }, configurable:true }); o.kind="dp"; return o; }
// inherited accessor via a prototype object
var proto = { get val(){ return this._n + 7; } };
function protoObj(n){ var o=Object.create(proto); o._n=n; o.kind="proto"; return o; }
function mk(t, n){ switch(t){ case 0:return new Base(n); case 1:return new Sub(n); case 2:return new Other(n); case 3:return litObj(n); case 4:return dpObj(n); default:return protoObj(n); } }
function fold(seed){
  var r=0;
  // polymorphic accessor call site: read .val across all shapes
  for (var t=0;t<6;t++){ var o=mk(t, seed+t); r=h(r, o.val + "/" + o.kind); }
  // setter round-trips (setters that transform)
  var b=new Base(seed); b.val = seed%10; r=h(r, b.val + "/" + b._v);
  var ot=new Other(seed); ot.val = seed%10; r=h(r, ot.val + "/" + ot._v);
  var l=litObj(seed); l.val = seed%7; r=h(r, l.val);
  var d=dpObj(seed); d.val = seed%7; r=h(r, d.val);
  // getter with side effect (Other.val bumps sideCounter) called repeatedly
  var acc2=0; for (var k=0;k<5;k++){ var oo=new Other(seed+k); acc2 += oo.val; } r=h(r, acc2);
  // super-accessor chain (Sub.val calls super.val)
  var s=new Sub(seed); r=h(r, s.val);
  // 'in' + hasOwnProperty on accessor props
  r=h(r, ("val" in b?1:0) + "/" + (b.hasOwnProperty("val")?1:0) + "/" + (protoObj(seed).hasOwnProperty("val")?1:0));
  return r;
}
var acc=0;
for (var it=0; it<40000; it++) acc=h(acc, fold(it % 53));
print("17-accessors checksum="+acc+" side="+sideCounter);
