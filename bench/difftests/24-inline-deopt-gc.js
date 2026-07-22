// Regression: multi-frame INLINED deopt (gWJResumeNFrames>1) + GC churn, directly stressing
// WJH_RESUME's per-frame JitScript-recreate loop (gcstress-01-03-rooting-lead fix). Run under
// GECKO_GCZEAL=7,1 GECKO_NURSERY_MB=1 for the resume-after-JitScript-discard path.
// Multi-frame INLINED deopt + GC: hot outer fn inlines callees; type instability causes
// deopts with inline chains (gWJResumeNFrames>1), stressing WJH_RESUME's per-frame recreate.
function h(s){let x=0;s=String(s);for(let i=0;i<s.length;i++){x=(x*31+s.charCodeAt(i))|0;}return x;}
function leaf(x){ return x*2 + 1; }                        // inlined into mid
function mid(x, flip){ var a=[x, leaf(x)]; if(flip) throw {c:x}; return a[0]+a[1]+leaf(x+1); }  // inlines leaf
function outer(x, flip){ var o={a:x}; return mid(x, flip) + o.a + leaf(x); }  // inlines mid+leaf
var out=[];
function run(){ var r=0;
  for(var i=0;i<12000;i++){
    // mostly stable ints (inline+JIT), occasional type change / throw (deopt across inline chain)
    var flip = (i%37==0);
    try{
      var arg = (i%50==0) ? ("s"+i) : (i%23==0 ? i+0.5 : i);  // type instability -> deopt
      r = h(r + outer(arg, flip));
    }catch(e){ r = h(r + (e.c!=null? e.c*7 : 0)); }
  }
  return r;
}
for(var it=0;it<3;it++){ out.push(run()); }
print("inlinedeopt checksum: "+out.join(","));
