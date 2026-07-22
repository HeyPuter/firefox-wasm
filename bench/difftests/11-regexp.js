// RegExp: exec/match/replace/split/groups, flags, lastIndex, unicode.
function h(x,s){ s=String(s); for(let i=0;i<s.length;i++){x=(x*31+s.charCodeAt(i))|0;} return x; }
function fold(s){
  let r=0;
  r=h(r, /\d+/.test(s)?1:0); r=h(r, (s.match(/[a-z]+/g)||[]).join("|"));
  r=h(r, s.replace(/(\w)(\w)/g,"$2$1")); r=h(r, s.split(/\s+/).length);
  r=h(r, s.replace(/\d/g, d=>String((+d+1)%10))); r=h(r, (s.match(/(\d)(\d)/)||[]).join(","));
  const re=/(\w+)=(\d+)/g; let m, cnt=0, sum=0; while((m=re.exec(s))!==null){ cnt++; sum+=(+m[2]||0); if(cnt>20)break; }
  r=h(r, cnt); r=h(r, sum);
  r=h(r, s.replace(/(?<k>\w+):(?<v>\d+)/g, "$<v>$<k>"));
  r=h(r, s.search(/\d/)); r=h(r, [...s.matchAll(/[aeiou]/g)].length);
  r=h(r, s.replace(/^\s+|\s+$/g,"").length); r=h(r, /^[A-Z]/.test(s)?1:0);
  return r;
}
const strs=["abc123 def456","x=1 y=22 z=333","Hello World","  trim me  ","a1b2c3d4",
  "key:9 foo:88 bar:7","NO DIGITS HERE","2024-01-15","email@test.com","aeiou AEIOU","",
  "The quick brown fox 42"];
let acc=0;
for(let it=0;it<15000;it++) for(const s of strs){ acc=h(acc, fold(s)); }
print("11-regexp checksum="+acc);
