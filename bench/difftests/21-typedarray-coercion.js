// Differential: TypedArray element-WRITE coercion across all 9 element types x 44 edge
// values (ToInt8/ToUint8 wrap, Uint8Clamped clamp+round-half-even, Float32 round, int32 overflow).
// TypedArray element-write coercion across all element types, in JIT-compiled setters.
// Covers ToInt8/ToUint8 wrap, Uint8Clamped clamp+round-half-even, Float32 round, int32 overflow.
var vals = [0,-0,1,-1,127,128,255,256,-128,-129,32767,32768,65535,65536,
            2147483647,2147483648,-2147483648,-2147483649,4294967295,4294967296,
            0.5,1.5,2.5,-0.5,-1.5,127.5,128.5,255.5,254.5,0.49999,0.50001,
            255.99,256.5,-0.9,3.4e38,1e39,-1e39,1e300,Infinity,-Infinity,NaN,
            1.9999999,255.4999999,127.50000001];
function mkSetGet(ctor){ var a=new ctor(1);
  return function(v){ a[0]=v; return a[0]; }; }
var types=[Int8Array,Uint8Array,Uint8ClampedArray,Int16Array,Uint16Array,Int32Array,Uint32Array,Float32Array,Float64Array];
var names=["I8","U8","U8C","I16","U16","I32","U32","F32","F64"];
var out=[];
for(var ti=0;ti<types.length;ti++){
  var sg=mkSetGet(types[ti]);
  // warmup for JIT
  for(var k=0;k<50000;k++){ sg(k&0xff); }
  var line=names[ti]+":";
  for(var i=0;i<vals.length;i++){ var r=sg(vals[i]); line += (Object.is(r,-0)?"-0":r)+","; }
  out.push(line);
}
var str=out.join("\n");
var h=2166136261>>>0; for(var c=0;c<str.length;c++){h^=str.charCodeAt(c);h=Math.imul(h,16777619);}
print("checksum="+(h>>>0)+" len="+str.length);
