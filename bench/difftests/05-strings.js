// String ops: charCodeAt, indexOf, slice, comparison, concat/ropes, parseInt/Float.
function h(x,s){ s=String(s); for(let i=0;i<s.length;i++){x=(x*31+s.charCodeAt(i))|0;} return x; }
function fold(s,t){
  let r=0;
  r=h(r, s.length); r=h(r, s.charCodeAt(0)); r=h(r, s.charCodeAt(s.length-1));
  r=h(r, s.indexOf(t)); r=h(r, s.lastIndexOf(t)); r=h(r, s.includes(t)?1:0);
  r=h(r, s.slice(1,3)); r=h(r, s.substring(0,2)); r=h(r, s.substr(1,2));
  r=h(r, (s<t)?1:0); r=h(r, (s===t)?1:0); r=h(r, s.localeCompare?0:0);
  r=h(r, (s+t).length); r=h(r, (s+"_"+t)); r=h(r, s.repeat(2));
  r=h(r, s.toUpperCase()); r=h(r, s.toLowerCase()); r=h(r, s.trim());
  r=h(r, parseInt(s,10)); r=h(r, parseFloat(s)); r=h(r, Number(s));
  r=h(r, s.charAt(1)); r=h(r, s.codePointAt(0)); r=h(r, s.padStart(5,"x"));
  return r;
}
const strs=["","a","abc","hello world","  42.5  ","0x1F","123","-45.6","1e3",
  "é中","ABCabc","aaaa","zzz","3.14159","NaN","Infinity","  ","x","longishstring123"];
let acc=0;
for(let it=0;it<3000;it++) for(const s of strs) for(const t of strs){ acc=h(acc, fold(s,t)); }
print("05-strings checksum="+acc);
