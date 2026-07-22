// Adversarial: typed-array / ArrayBuffer / DataView bounds + detachment edges. OOB views,
// subarray/set/copyWithin/fill bounds, DataView OOB reads (must throw), byteOffset/length,
// buffer detachment (transfer if supported). Real-site-relevant (binary data). enc-safe fold.
function h(x,s){ s=String(s); for(let i=0;i<s.length;i++){x=(Math.imul(x,31)+s.charCodeAt(i))|0;} return x; }
function tryv(f){ try { return "ok:"+f(); } catch(e){ return "throw:"+(e&&e.name||e); } }
function fold(seed){
  var r=0;
  var buf=new ArrayBuffer(32);
  var i32=new Int32Array(buf); for(var i=0;i<8;i++) i32[i]=seed*(i+1)-100;
  var u8=new Uint8Array(buf);
  // OOB index reads/writes (typed arrays silently ignore OOB writes, return undefined for OOB reads)
  r=h(r, String(i32[100])+"/"+String(i32[-1])+"/"+String(u8[1000]));
  i32[100]=5; i32[-1]=9; r=h(r, i32.length+"/"+i32[0]);   // OOB writes no-op
  // subarray with out-of-range / negative bounds (clamped)
  r=h(r, i32.subarray(2,100).length+"/"+i32.subarray(-3,-1).length+"/"+i32.subarray(5,2).length);
  // set with offset overflow (must throw RangeError)
  r=h(r, tryv(function(){ var t=new Int32Array(4); t.set(i32, 2); return t.join(","); }));
  r=h(r, tryv(function(){ var t=new Int32Array(10); t.set(i32, 3); return t[5]; }));
  // copyWithin / fill bounds (clamped, no throw)
  var c=new Int32Array([1,2,3,4,5,6,7,8]); c.copyWithin(2, 5, 100); r=h(r, c.join(","));
  var fa=new Int32Array([0,0,0,0,0]); fa.fill(seed%9, 1, 100); fa.fill(7, -2); r=h(r, fa.join(","));
  // DataView OOB read must throw RangeError
  var dv=new DataView(buf);
  r=h(r, tryv(function(){ return dv.getInt32(30); }));    // 30+4>32 -> throw
  r=h(r, tryv(function(){ return dv.getInt32(28); }));    // ok
  r=h(r, tryv(function(){ return dv.getFloat64(28); }));  // throw
  r=h(r, dv.getUint8(31)+"/"+dv.getInt16(0,true));
  // byteOffset/byteLength of a sub-view
  var sub=new Int32Array(buf, 8, 3); r=h(r, sub.byteOffset+"/"+sub.byteLength+"/"+sub.length+"/"+sub[0]);
  r=h(r, tryv(function(){ return new Int32Array(buf, 8, 100); }));  // length overflow -> throw
  r=h(r, tryv(function(){ return new Int32Array(buf, 30); }));      // unaligned/overflow offset -> throw
  // detachment (transfer) if supported
  r=h(r, tryv(function(){ var b2=new ArrayBuffer(16); var v=new Int32Array(b2); v[0]=42;
    if (typeof b2.transfer==="function"){ b2.transfer(); return v[0]===undefined?"detached":("live:"+v[0]); }
    return "no-transfer"; }));
  return r;
}
var acc=0;
for (var it=0; it<25000; it++) acc=h(acc, fold(it % 47));
print("20-typedarray-bounds checksum="+acc);
