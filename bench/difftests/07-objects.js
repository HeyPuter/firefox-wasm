// Object/property access: polymorphic shapes, getters, proto chains, megamorphic keys.
function h(x,s){ s=String(s); for(let i=0;i<s.length;i++){x=(x*31+s.charCodeAt(i))|0;} return x; }
class Base{ constructor(v){this.v=v;} get doubled(){return this.v*2;} m(){return this.v+1;} }
class Sub extends Base{ get doubled(){return this.v*3;} m(){return this.v-1;} }
function mk(i){
  const t=i%4;
  if(t===0) return {a:i,b:i+1,c:i+2};
  if(t===1) return {a:i,b:i+1};
  if(t===2) return new Base(i);
  return new Sub(i);
}
const keys=["a","b","c","v"];
function fold(i){
  let r=0; const o=mk(i);
  for(const k of keys){ r=h(r, (k in o)?o[k]:-1); }
  r=h(r, o.a!==undefined?o.a:-9);
  if(o instanceof Base){ r=h(r, o.doubled); r=h(r, o.m()); }
  r=h(r, typeof o); r=h(r, Object.keys(o).join(",")); r=h(r, Object.keys(o).length);
  const dyn=keys[i%keys.length]; r=h(r, o[dyn]===undefined?0:o[dyn]);
  o[dyn]= (o[dyn]||0)+1; r=h(r, o[dyn]);
  r=h(r, JSON.stringify(o).length);
  r=h(r, o.hasOwnProperty("a")?1:0); r=h(r, "toString" in o?1:0);
  return r;
}
let acc=0;
for(let it=0;it<60000;it++){ acc=h(acc, fold(it)); }
print("07-objects checksum="+acc);
