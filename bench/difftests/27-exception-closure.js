function h(x){x=x|0;x=(x^0x9e3779b9)+((x<<6)|0)+(x>>2);return x|0;}
let acc=0;
// per-iteration closure capture (let) + mutation
let fns=[];
for(let i=0;i<50;i++){ let cap=i; fns.push(function(){ return cap*3 - i; }); if(i%7===0) cap+=100; }
for(let k=0;k<fns.length;k++) acc=h(acc+fns[k]());
// nested try/catch/finally with finally-return override + throw-in-catch
function tricky(n){
  try{
    try{ if(n%3===0) throw {code:n}; return n*2; }
    catch(e){ if(n%9===0) throw new Error("re"+e.code); return n+1; }
    finally{ if(n%5===0) return 777; }
  }catch(e2){ return -(e2.message.length); }
}
for(let n=0;n<3000;n++){ acc=h(acc + tricky(n)); }
// closure over mutable var captured by multiple, updated after JIT warmup
function make(){ let s=0; return {add:function(v){s+=v;return s;}, get:function(){return s;}}; }
let m=make();
for(let i=0;i<3000;i++){ m.add(i%13); if(i%100===0) acc=h(acc+m.get()); }
acc=h(acc+m.get());
// exception across recursion + finally side effects
let sidefx=0;
function rec(d){ try{ if(d<=0) throw d; return rec(d-1)+1; } finally{ sidefx+=1; } }
for(let t=0;t<400;t++){ try{ rec(t%20); }catch(e){ acc=h(acc+e+sidefx); } }
print("checksum:"+(acc>>>0)+"|sidefx:"+sidefx);
