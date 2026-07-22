// Typed arrays / DataView: clamping, wraparound, endianness, float store/load, OOB.
function h(x,s){ s=String(s); for(let i=0;i<s.length;i++){x=(x*31+s.charCodeAt(i))|0;} return x; }
function fold(seed){
  let r=0;
  const i8=new Int8Array(8), u8=new Uint8Array(8), u8c=new Uint8ClampedArray(8);
  const i16=new Int16Array(4), u32=new Uint32Array(4), f32=new Float32Array(4), f64=new Float64Array(4);
  for(let i=0;i<8;i++){ const v=seed*(i+1)*37 - 500; i8[i]=v; u8[i]=v; u8c[i]=v; }
  for(let i=0;i<4;i++){ const v=seed*(i+1)*1000 - 100000; i16[i]=v; u32[i]=v; f32[i]=v*0.5; f64[i]=v*0.5; }
  r=h(r, i8.join(",")); r=h(r, u8.join(",")); r=h(r, u8c.join(","));
  r=h(r, i16.join(",")); r=h(r, u32.join(",")); r=h(r, f32.join(",")); r=h(r, f64.join(","));
  r=h(r, i8[100]===undefined?1:0); r=h(r, u8[-1]===undefined?1:0);
  // DataView endianness
  const dv=new DataView(new ArrayBuffer(16));
  dv.setInt32(0, seed*123456, true); dv.setInt32(4, seed*123456, false);
  dv.setFloat64(8, seed*3.14159, true);
  r=h(r, dv.getInt32(0,true)); r=h(r, dv.getInt32(0,false));
  r=h(r, dv.getInt32(4,true)); r=h(r, dv.getUint16(0,true)); r=h(r, dv.getUint8(1));
  r=h(r, dv.getFloat64(8,true)); r=h(r, dv.getFloat32(8,true));
  // subarray/set
  const sub=u32.subarray(1,3); r=h(r, sub.length); r=h(r, sub[0]);
  const big=new Float64Array([seed,seed*0.1,-seed,NaN,Infinity]); r=h(r, big.reduce((p,c)=>p+ (c===c?c:99),0));
  return r;
}
let acc=0;
for(let it=0;it<20000;it++){ acc=h(acc, fold(it%29)); }
print("10-typedarrays checksum="+acc);
