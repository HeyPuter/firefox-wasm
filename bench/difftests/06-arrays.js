// Array ops returning PRIMITIVES: sum/indexOf/length after push/pop/splice/holes/sort.
function h(x,s){ s=String(s); for(let i=0;i<s.length;i++){x=(x*31+s.charCodeAt(i))|0;} return x; }
function fold(seed){
  let r=0;
  const a=[]; for(let i=0;i<8;i++) a.push((seed*(i+1))%7 - 3);
  r=h(r,a.length); r=h(r,a.indexOf(0)); r=h(r,a.join(","));
  a.sort((x,y)=>x-y); r=h(r,a.join(","));
  r=h(r,a.reduce((p,c)=>p+c,0)); r=h(r,a.filter(x=>x>0).length);
  r=h(r,a.map(x=>x*2).join(",")); r=h(r,a.slice(2,5).join(","));
  const b=a.concat([9,8,7]); r=h(r,b.length); r=h(r,b.pop()); r=h(r,b.shift());
  b.splice(1,2,100); r=h(r,b.join(","));
  const holey=[1,,3,,5]; r=h(r,holey.length); r=h(r,holey.indexOf(undefined));
  r=h(r,holey.join(",")); r=h(r,String(holey[1])); r=h(r,3 in holey?1:0);
  r=h(r,a.find(x=>x>0)); r=h(r,a.findIndex(x=>x>1)); r=h(r,a.includes(-3)?1:0);
  r=h(r,a.every(x=>x<10)?1:0); r=h(r,a.some(x=>x===0)?1:0); r=h(r,a.lastIndexOf(0));
  return r;
}
let acc=0;
for(let it=0;it<40000;it++){ acc=h(acc, fold(it%13)); }
print("06-arrays checksum="+acc);
