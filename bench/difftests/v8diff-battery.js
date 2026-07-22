// JIT-vs-V8 differential: catches bugs SHARED by JIT+PBL (invisible to diffcheck).
// Runs in the gecko.wasm embed (print) AND in node (V8, print=console.log shim).
// Covers number formatting, Math, int/bit boundaries, parse, string, sort — the
// shared-miscompile-prone areas (cf. mathfn-int32-saturate found only vs V8).
var out = [];
function rec(label, v){ out.push(label+"="+String(v)); }

// Number formatting
var nums=[0,-0,1,-1,0.5,-0.5,255,256,65535,1e10,-1e10,1e21,1e-7,123.456,0.1,0.2,0.3,
  9007199254740991,9007199254740993,3.141592653589793,2.718281828459045,1/3,2/3,1e-300,1e300];
for(var i=0;i<nums.length;i++){ var n=nums[i];
  rec("tS"+i, n.toString());
  for(var r=2;r<=16;r+=2) rec("tR"+i+"_"+r, (Math.floor(Math.abs(n))>>>0).toString(r));
  for(var f=0;f<=8;f++){ try{ rec("tF"+i+"_"+f, n.toFixed(f)); }catch(e){ rec("tF"+i+"_"+f,"E"); } }
  for(var p=1;p<=10;p++){ try{ rec("tP"+i+"_"+p, n.toPrecision(p)); }catch(e){ rec("tP"+i+"_"+p,"E"); } }
  try{ rec("tE"+i, n.toExponential(4)); }catch(e){ rec("tE"+i,"E"); }
}
// Math family (incl the once-buggy Int32 conversions + transcendentals)
var mv=[0,-0,0.1,-0.1,0.5,-0.5,0.9,-0.9,1.5,2.5,-1.5,9e11,-9e11,1e21,NaN,Infinity,-Infinity,
  3.14159,2**53,-(2**53),1e-10,123456.789];
for(var i=0;i<mv.length;i++){ var x=mv[i];
  rec("fl"+i, Math.floor(x)); rec("ce"+i, Math.ceil(x)); rec("ro"+i, Math.round(x));
  rec("tr"+i, Math.trunc(x)); rec("sg"+i, Math.sign(x)); rec("ab"+i, Math.abs(x));
  rec("sq"+i, Math.sqrt(Math.abs(x))); rec("cb"+i, Math.cbrt(x)); rec("fr"+i, Math.fround(x));
  rec("l2"+i, Math.log2(Math.abs(x)+1)); rec("e1"+i, Math.expm1(x)); rec("hy"+i, Math.hypot(x,x+1).toPrecision(10));
  rec("i32_"+i, x|0); rec("u32_"+i, x>>>0); rec("clz"+i, Math.clz32(x>>>0));
  rec("at2"+i, Math.atan2(x, 2));
}
// bit ops at boundaries
var iv=[0,1,-1,31,32,33,63,64,0x7fffffff,-0x80000000,0xffffffff|0,0x12345678,-0x12345678];
for(var i=0;i<iv.length;i++)for(var j=0;j<iv.length;j++){ var a=iv[i],b=iv[j];
  rec("sh"+i+"_"+j,(a<<(b&31))+"|"+(a>>(b&31))+"|"+(a>>>(b&31))+"|"+(a&b)+"|"+(a|b)+"|"+(a^b)); }
// parseInt/parseFloat
var ps=["0x1f","  42  ","3.14abc","0b101","1e3","0.0001","-0","  -0xFF","Infinity","999999999999999999999","1.7976931348623157e308","",".5","5.","0o17"];
for(var i=0;i<ps.length;i++){ rec("pi"+i, parseInt(ps[i])); rec("pi16_"+i, parseInt(ps[i],16)); rec("pf"+i, parseFloat(ps[i])); rec("nm"+i, Number(ps[i])); }
// string methods
var ss=["abc","","héllo","zyx9","  pad  ","aAbBcC","12345"];
for(var i=0;i<ss.length;i++){ var s=ss[i];
  rec("len"+i, s.length); rec("rev"+i, s.split("").reverse().join(""));
  rec("ps"+i, s.padStart(10,"*")); rec("pe"+i, s.padEnd(10,"-")); rec("rp"+i, s.repeat(3));
  rec("uc"+i, s.toUpperCase()); rec("lc"+i, s.toLowerCase()); rec("cp"+i, s.codePointAt(0));
  rec("sl"+i, s.slice(1,-1)); rec("idx"+i, s.indexOf("b")); }
// sort (numeric + default + stability)
var arrs=[[3,1,4,1,5,9,2,6],[10,9,8,7,6,5,4,3,2,1],[-5,3,-2,8,0,-1],[100,20,3,40000,5]];
for(var i=0;i<arrs.length;i++){ var a=arrs[i];
  rec("sn"+i, a.slice().sort(function(x,y){return x-y;}).join(","));
  rec("sd"+i, a.slice().sort().join(","));
  rec("sr"+i, a.slice().sort(function(x,y){return y-x;}).join(",")); }

// checksum of the whole transcript
var acc=0; var joined=out.join(";");
for(var i=0;i<joined.length;i++){ acc=(Math.imul(acc,31)+joined.charCodeAt(i))|0; }
print("v8diff checksum="+acc+" lines="+out.length);
