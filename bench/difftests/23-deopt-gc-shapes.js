// Regression: diverse DEOPT-triggering shapes (poly prop access, closures, string ropes,
// poly method calls) + heavy alloc. Guards the WJH_RESUME JitScript-recreate fix
// (gcstress-01-03-rooting-lead): run under GECKO_GCZEAL=7,1 to stress resume-after-JitScript-discard.
// Diverse DEOPT-triggering shapes + heavy allocation, to stress the resume-under-GC path
// (WJH_RESUME) across code shapes DIFFERENT from 01/03's int/pow. Each fn deopts on type
// instability while allocating objects/arrays/strings (nursery churn moves things under GC).
function h(s){let x=0;s=String(s);for(let i=0;i<s.length;i++){x=(x*31+s.charCodeAt(i))|0;}return x;}
// 1: polymorphic property access (shape-change deopt) + object alloc
function poly(o){ var a={p:o.x, q:o.y}; return a.p+a.q; }
// 2: closure capture + type-unstable arg deopt + array alloc
function mkAdder(n){ return function(v){ var arr=[n,v,n+v]; return arr[0]+arr[1]+arr[2]; }; }
// 3: string rope building with type-changing concat (deopt) 
function rope(a,b){ return (""+a)+":"+(""+b)+"|"+(a+b); }
// 4: method call on polymorphic receiver + object alloc
function callm(o){ return o.f()+({v:o.f()}).v; }
var out=[];
function run(){ var r=0;
  var shapes=[{x:1,y:2},{x:1,y:2,z:3},{y:5,x:6},{x:"s",y:"t"},{x:1.5,y:2.5}];
  var add=mkAdder(10), add2=mkAdder("p");
  var objs=[{f:function(){return 1;}},{f:function(){return "two";}},{f:function(){return 3.5;}}];
  for(var i=0;i<8000;i++){
    r=h(r+poly(shapes[i%shapes.length]));
    r=h(r+add(i%3==0?"str":i));
    r=h(r+add2(i));
    r=h(r+rope(i%2?i:"x"+i, i%3?i*1.5:"y"));
    r=h(r+h(callm(objs[i%objs.length])));
  }
  return r;
}
for(var it=0;it<3;it++){ out.push(run()); }
print("deoptgc checksum: "+out.join(","));
