// GC-stress regression: megamorphic property access + prop-IC cache churn (many shapes,
// dynamic keys, by-value access, cache eviction). Exercises gWJPropShape/Holder rooting under
// GC. JIT==PBL under GECKO_GCZEAL=2,1 AND 7,1 (checksum -487182794 / it=8000: 451394448).
// Megamorphic property access + cache churn under GC. Exercises the prop-IC caches
// (gWJPropShape/Holder/Name) + megamorphic path -- a DIFFERENT rooting path than call-roots.
function h(s){let x=0;s=String(s);for(let i=0;i<s.length;i++){x=(x*31+s.charCodeAt(i))|0;}return x;}
// many distinct shapes (megamorphic sites)
function mk(i){
  var o={};
  o["p"+(i%13)] = i; o.common = i*2; o["q"+(i%7)] = "s"+i;
  if(i%3===0) o.extra = {inner:i};
  if(i%5===0) o.arr = [i, i+1];
  return o;
}
function access(o, k){ return o[k]; }              // megamorphic by-value
function getCommon(o){ return o.common; }          // poly named access
function getP(o,i){ return o["p"+(i%13)]; }        // dynamic key
function run(){
  var acc=0;
  var objs=[]; for(var i=0;i<50;i++) objs.push(mk(i));
  for(var it=0;it<8000;it++){
    for(var j=0;j<objs.length;j++){
      var o=objs[j];
      acc = h(acc + getCommon(o));
      acc = h(acc + (access(o, "q"+(j%7))||"").length);
      acc = h(acc + (getP(o, j)|0));
      if(o.extra) acc = h(acc + o.extra.inner);
      if(o.arr) acc = h(acc + o.arr[0]);
    }
    // churn: replace some objects (new shapes) -> cache eviction + alloc
    if(it%4===0){ objs[it%objs.length] = mk(it+1000); }
  }
  return acc;
}
print("megaprop checksum="+run());
