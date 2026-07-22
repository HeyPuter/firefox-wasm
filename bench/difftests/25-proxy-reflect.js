// Differential: Proxy trap dispatch (get/set/has/delete/ownKeys/apply/construct), revocable,
// nested proxies, Reflect.* parity. Distinct codepath. JIT==PBL==V8 + clean under GECKO_GCZEAL=7,1.
// Proxy/Reflect differential: get/set/has/deleteProperty/ownKeys/getOwnPropertyDescriptor/
// apply/construct traps, revocable, nested proxies, Reflect.* parity. Distinct codepath.
function h(s){let x=0;s=String(s);for(let i=0;i<s.length;i++){x=(x*31+s.charCodeAt(i))|0;}return x;}
var out=[];
function run(){ var r=[];
  var log=[];
  var target={a:1,b:2,f:function(x){return x*2;}};
  var p=new Proxy(target,{
    get(t,k,recv){ log.push("g:"+String(k)); return k==="c"?99:Reflect.get(t,k,recv); },
    set(t,k,v,recv){ log.push("s:"+String(k)); return Reflect.set(t,k,v,recv); },
    has(t,k){ log.push("h:"+String(k)); return Reflect.has(t,k); },
    deleteProperty(t,k){ log.push("d:"+String(k)); return Reflect.deleteProperty(t,k); },
    ownKeys(t){ log.push("ok"); return Reflect.ownKeys(t); },
    getOwnPropertyDescriptor(t,k){ return Reflect.getOwnPropertyDescriptor(t,k); }
  });
  r.push(p.a+","+p.c);           // get (own + trap-synthesized)
  p.d=5; r.push(target.d);       // set through
  r.push(("a" in p)+","+("z" in p)); // has
  r.push(JSON.stringify(Object.keys(p)));  // ownKeys+getOwnPropDesc
  delete p.b; r.push("b" in target);       // delete
  // apply/construct traps
  var fp=new Proxy(function(x){return x+1;},{ apply(t,thiz,args){ return Reflect.apply(t,thiz,args)*10; }, construct(t,args){ return {built:args[0]}; } });
  r.push(fp(5)+"");                 // apply trap
  r.push(JSON.stringify(new fp(7))); // construct trap
  // revocable
  var rv=Proxy.revocable({x:1},{}); r.push(rv.proxy.x+""); rv.revoke();
  try{ rv.proxy.x; r.push("noThrow"); }catch(e){ r.push("revoked:"+e.name); }
  // nested + Reflect parity
  var inner={v:10}; var pp=new Proxy(new Proxy(inner,{}),{}); r.push(pp.v+"");
  r.push(Reflect.ownKeys({a:1,[Symbol.iterator]:2}).length+"");
  r.push(h(log.join(",")) + "");
  return r.join(";");
}
for(var w=0;w<30000;w++){ var pp=new Proxy({n:w},{get(t,k){return t[k];}}); pp.n; }
var s=run();
var hh=2166136261>>>0;for(var c=0;c<s.length;c++){hh^=s.charCodeAt(c);hh=Math.imul(hh,16777619);}
print("checksum="+(hh>>>0)+" | "+s.slice(0,70));
