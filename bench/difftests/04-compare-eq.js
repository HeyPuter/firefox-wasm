// Comparison & equality across mixed types: ===, ==, <, >, <=, NaN, -0, coercions.
function h(x,s){ s=String(s); for(let i=0;i<s.length;i++){x=(x*31+s.charCodeAt(i))|0;} return x; }
function cmp(a,b){
  let r=0;
  r=h(r,(a===b)?1:0); r=h(r,(a==b)?1:0); r=h(r,(a<b)?1:0); r=h(r,(a>b)?1:0);
  r=h(r,(a<=b)?1:0); r=h(r,(a>=b)?1:0); r=h(r,(a!=b)?1:0); r=h(r,(a!==b)?1:0);
  r=h(r,(a||b)); r=h(r,(a&&b)); r=h(r,(a??b)); r=h(r,!a?1:0);
  return r;
}
const vals=[0,-0,1,-1,NaN,Infinity,-Infinity,0.5,"0","1","","a","b",true,false,null,undefined,
  "0.5",2,"2",100,"100","10",1e21,"1e21"];
let acc=0;
for(let it=0;it<2500;it++) for(const a of vals) for(const b of vals){ acc=h(acc, cmp(a,b)); }
print("04-compare-eq checksum="+acc);
