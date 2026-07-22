// Adversarial: invocation forms + this-binding + argc-ABI. call/apply/bind, method vs
// free calls, new, arrow this-capture, >8-arg calls (variadic ABI), spread. Results depend
// on this + args being passed correctly. Primitive-fold checksum, diffcheck JIT vs PBL.
function h(x,s){ s=String(s); for(let i=0;i<s.length;i++){x=(Math.imul(x,31)+s.charCodeAt(i))|0;} return x; }
function sum9(a,b,c,d,e,f,g,i,j){ return ((this&&this.base)||0) + a+b*2+c*3+d*4+e*5+f*6+g*7+i*8+j*9; }
function usesThis(x){ return ((this&&this.k)||-1) + x; }
function variadic(){ var s=0; for(var i=0;i<arguments.length;i++) s+=arguments[i]*(i+1); return s + arguments.length*100; }
function Ctor(a,b){ this.a=a; this.b=b; this.s=a+b; }
function fold(seed){
  var r=0;
  var ctx={base: seed%10, k: seed%7};
  var args=[seed%3, seed%4, seed%5, seed%6, seed%7, seed%8, seed%9, seed%10, seed%11];
  // direct vs call vs apply
  r=h(r, sum9(args[0],args[1],args[2],args[3],args[4],args[5],args[6],args[7],args[8]));
  r=h(r, sum9.call(ctx, args[0],args[1],args[2],args[3],args[4],args[5],args[6],args[7],args[8]));
  r=h(r, sum9.apply(ctx, args));
  r=h(r, sum9.apply(null, args));
  // bind (partial + full)
  var b1=sum9.bind(ctx); r=h(r, b1(args[0],args[1],args[2],args[3],args[4],args[5],args[6],args[7],args[8]));
  var b2=sum9.bind(ctx, args[0], args[1]); r=h(r, b2(args[2],args[3],args[4],args[5],args[6],args[7],args[8]));
  // method call vs extracted free call (this loss)
  var obj={k: seed%13, m: usesThis}; r=h(r, obj.m(seed%5));
  var free=obj.m; r=h(r, free(seed%5));       // this=undefined -> -1 branch
  // arrow this-capture inside a method
  var o2={k: seed%17, run:function(n){ var arrow=()=>((this&&this.k)||-2)+n; return arrow(); }}; r=h(r, o2.run(seed%6));
  // new (constructor this)
  var inst=new Ctor(seed%5, seed%9); r=h(r, inst.a+"/"+inst.b+"/"+inst.s);
  // variadic / arguments with varying argc (crosses the argc-ABI flag boundary at 8)
  r=h(r, variadic(1,2,3));
  r=h(r, variadic(1,2,3,4,5,6,7,8,9,10,11,12));   // >8 args
  r=h(r, variadic.apply(null, args));
  // spread call
  r=h(r, sum9(...args));
  r=h(r, Math.max(...args) + Math.min(...args));
  // call with primitive this (boxed)
  r=h(r, usesThis.call(5, seed%4));
  return r;
}
var acc=0;
for (var it=0; it<40000; it++) acc=h(acc, fold(it % 43));
print("18-call-this checksum="+acc);
