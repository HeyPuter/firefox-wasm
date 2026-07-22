// Differential: spec-EXACT number->string formatting (toFixed/toExponential/toPrecision/
// toString(10)/parseInt/parseFloat/Number) over edge values. Excludes toString(radix)
// FRACTIONAL output (implementation-defined trailing digits, legitimately SM!=V8).
var nums=[0,-0,1,-1,0.1,0.2,0.3,1.5,2.5,-2.5,123.456,1e21,1e-7,1e-21,255,256,65535,
         3.14159265358979,2.718281828,1/3,2/3,9007199254740991,9007199254740993,
         0.000001,123456789,-123456789,100,1000000,0.5,12345.6789,1e100,1e-100];
function T(f){try{return f();}catch(e){return "E:"+e.name;}}
var out=[];
for(var w=0;w<20000;w++){ var n=nums[w%nums.length]; T(function(){return n.toFixed(w%9);}); T(function(){return n.toPrecision((w%21)+1);}); }
for(var i=0;i<nums.length;i++){var n=nums[i];
  for(var d=0;d<=8;d++){ out.push(T(function(){return n.toFixed(d);})); out.push(T(function(){return n.toExponential(d);})); }
  for(var p=1;p<=21;p++){ out.push(T(function(){return n.toPrecision(p);})); }
  out.push(n.toString()); out.push(String(n));
}
var strs=["0","10","0xff","  42  ","3.14abc","1e3","-0","Infinity","  -12.5e2","1_000","4294967296","99999999999999999999",".5","5.","+7","0x1p4","  0b101"];
for(var j=0;j<strs.length;j++){ out.push(parseInt(strs[j])); out.push(parseInt(strs[j],16)); out.push(parseInt(strs[j],10)); out.push(parseFloat(strs[j])); out.push(Number(strs[j])); }
var str=out.join("\n"); var h=2166136261>>>0; for(var c=0;c<str.length;c++){h^=str.charCodeAt(c);h=Math.imul(h,16777619);}
print("checksum="+(h>>>0));
