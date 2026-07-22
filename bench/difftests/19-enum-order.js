// Adversarial: property enumeration order (for-in / Object.keys) — spec order is
// integer-index keys ascending, then string keys in insertion order, then proto chain.
// Tests dynamic add/delete, integer-vs-string keys, inherited props, delete-during-iter.
function h(x,s){ s=String(s); for(let i=0;i<s.length;i++){x=(Math.imul(x,31)+s.charCodeAt(i))|0;} return x; }
function fold(seed){
  var r=0;
  // mixed integer + string keys (spec: ints ascending first, then strings by insertion)
  var o={}; o["b"]=1; o["10"]=2; o["2"]=3; o["a"]=4; o["1"]=5; o["z"]=6; o[0]=7; o["005"]=8;
  var order=""; for(var k in o) order+=k+","; r=h(r, order);
  r=h(r, Object.keys(o).join("|"));
  // add during construction with holes
  var m={}; for(var i=0;i<10;i++){ if((seed+i)%3) m["k"+i]= i; } m[100]="x"; m[5]="y"; m["k"+seed%4]=99;
  var mo=""; for(var k in m) mo+=k; r=h(r, mo);
  // delete a key then re-add (insertion order semantics)
  var d={a:1,b:2,c:3,d:4}; delete d.b; d.b=9; d.e=5; var do2=""; for(var k in d) do2+=k; r=h(r, do2);
  // delete DURING for-in (deleted-not-yet-visited key must be skipped)
  var e={p:1,q:2,r:3,s:4,t:5}; var eo=""; for(var k in e){ eo+=k; if(k==="q") delete e.s; } r=h(r, eo);
  // add DURING for-in (added key must NOT be visited)
  var g={x:1,y:2}; var go=""; var cnt=0; for(var k in g){ go+=k; if(cnt++<3) g["new"+cnt]=cnt; } r=h(r, go);
  // inherited props via prototype chain (own first, then proto)
  var proto={pa:1,pb:2}; var child=Object.create(proto); child.ca=3; child.cb=4;
  var co=""; for(var k in child) co+=k; r=h(r, co);
  // integer-like string keys ordering
  var n={}; n["4294967295"]=1; n["4294967294"]=2; n["4294967296"]=3; n["0"]=4; var no=""; for(var k in n) no+=k+";"; r=h(r, no);
  // Object.values / entries order consistency
  r=h(r, Object.values(o).join(",")); r=h(r, Object.entries(o).map(function(x){return x[0]+"="+x[1];}).join(","));
  return r;
}
var acc=0;
for (var it=0; it<50000; it++) acc=h(acc, fold(it % 37));
print("19-enum-order checksum="+acc);
