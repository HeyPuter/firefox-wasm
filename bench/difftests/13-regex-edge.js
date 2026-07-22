// Adversarial: regex VALUE-op edge cases (the JIT'd regexp op family). Stresses
// lastIndex mutation, /g and /y (sticky), named groups, replace-with-callback,
// matchAll, split-with-captures, backreferences, exec-loop state. Primitive/string
// results -> checksum -> diffcheck JIT vs PBL.
function h(x,s){ s=String(s); for(let i=0;i<s.length;i++){x=(Math.imul(x,31)+s.charCodeAt(i))|0;} return x; }
function fold(seed){
  let r=0;
  const s = "a1b22c333 K=9 V=42 foo:7 bar:88 " + "xY".repeat(seed%5) + " 2024-03-15";
  // global exec loop with lastIndex
  { const re=/(\d+)/g; let m,acc=0,cnt=0; while((m=re.exec(s))!==null){ acc+=(+m[1])%100; cnt++; if(cnt>50)break; } r=h(r, acc+"/"+cnt+"/"+re.lastIndex); }
  // sticky /y
  { const re=/\w+/y; re.lastIndex=seed%s.length; const m=re.exec(s); r=h(r, (m?m[0]:"null")+"/"+re.lastIndex); }
  // named groups
  { const m=s.match(/(?<key>\w+)[:=](?<val>\d+)/); r=h(r, m?(m.groups.key+"="+m.groups.val+"@"+m.index):"none"); }
  // matchAll
  { let out=""; for(const mm of s.matchAll(/(\w)(\d)/g)){ out+=mm[1]+mm[2]+","; } r=h(r,out); }
  // replace with callback (captures + offset)
  { r=h(r, s.replace(/(\w+):(\d+)/g, (m,k,v,off)=> k.toUpperCase()+"["+off+"]"+(+v*2))); }
  // replace with $ patterns + named
  { r=h(r, s.replace(/(?<k>\w+)=(?<v>\d+)/g, "$<v>-$<k>-$&")); }
  // split with capturing group (includes captures in result)
  { const parts=s.split(/(\s+)/); r=h(r, parts.length+"|"+parts.join("#")); }
  // backreference
  { r=h(r, /(\w)\1/.test("aabb"+seed)?1:0); r=h(r, "aXbXc".replace(/(.)X/g,"$1_")); }
  // test/search with flags + lastIndex side effects
  { const re=/\d/g; r=h(r, (re.test(s)?1:0)+"/"+re.lastIndex+"/"+s.search(/[A-Z]=/)); }
  // dotAll, unicode-ish, alternation
  { r=h(r, s.replace(/(\d+)|([a-z]+)/g, (m,d,a)=> d?("D"+d.length):("A"+a.length))); }
  return r;
}
let acc=0;
for(let it=0; it<20000; it++) acc=h(acc, fold(it%23));
print("13-regex-edge checksum="+acc);
