// Control flow: switch/tableswitch in loops, try/catch/finally, labeled break/continue,
// short-circuit, ternary chains, do-while, for-in/for-of ordering.
function h(x,s){ s=String(s); for(let i=0;i<s.length;i++){x=(x*31+s.charCodeAt(i))|0;} return x; }
function sw(k){ // dense switch -> tableswitch
  switch(k){ case 0:return"a"; case 1:return"b"; case 2:return"c"; case 3:return"d";
    case 4:return"e"; case 5:return"f"; case -1:return"neg"; case 100:return"big";
    default:return"def"; }
}
function fold(i){
  let r=0;
  for(let j=-2;j<8;j++){ r=h(r, sw((i+j)%7)); r=h(r, sw(i*j)); }
  // try/catch/finally
  try{ if(i%5===0) throw new Error("e"+i); r=h(r, 1/(i%3)); }
  catch(e){ r=h(r, "caught:"+e.message); }
  finally{ r=h(r, "fin"); }
  // labeled loops
  let cnt=0; outer: for(let a=0;a<5;a++){ for(let b=0;b<5;b++){ if(a*b>i%6){ cnt++; continue outer; } if(a+b>i%4){ break outer; } } }
  r=h(r, cnt);
  // short-circuit + ternary
  r=h(r, (i%2 && i%3)||"z"); r=h(r, i>3?(i>6?"hi":"mid"):"lo");
  // for-in ordering on an object
  const o={x:1,"2":2,y:3,"1":4,z:5}; let ord=""; for(const k in o) ord+=k; r=h(r,ord);
  return r;
}
let acc=0;
for(let it=0;it<50000;it++){ acc=h(acc, fold(it%17)); }
print("09-controlflow checksum="+acc);
