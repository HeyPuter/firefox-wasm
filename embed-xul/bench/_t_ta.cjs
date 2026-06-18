// Run ta_bench.html (typed-array numeric kernel) under several JIT modes, read
// TASCORE (element-iters/ms; higher=faster) + correctness flags. Arms via ARMS env.
const {chromium}=require("playwright-core");
const {startBenchServer}=require("./bench-server.cjs");
const sleep=(ms)=>new Promise(r=>setTimeout(r,ms));
const N=parseInt(process.env.N||"5",10);
async function one(port,qs){
 const b=await chromium.launch({headless:true,executablePath:"/usr/bin/chromium",args:["--no-sandbox","--disable-dev-shm-usage"]});
 const p=await b.newPage(); let crashed=false; p.on("crash",()=>crashed=true);
 try{
  await p.goto("http://127.0.0.1:"+port+"/index.html"+qs,{waitUntil:"load",timeout:60000});
  await p.waitForFunction(()=>window.__geckoReady===true,{timeout:60000});
  await p.evaluate((u)=>window.geckoRender(u),"http://127.0.0.1:"+port+"/bench/ta_bench.html");
  for(let i=0;i<50 && !crashed;i++){await sleep(1000);let t="";try{t=(await p.evaluate(()=>window.geckoEval("document.title")))||"";}catch(e){}
    const m=/TASCORE=(\d+) f=(\d+) i=(\d+) okf=(\w+) oki=(\w+)/.exec(t);
    if(m)return {tot:+m[1],f:+m[2],i:+m[3],okf:m[4],oki:m[5]};}
  return {tot:crashed?-2:0,f:0,i:0,okf:"?",oki:"?"};
 }catch(e){return {tot:-3,f:0,i:0,okf:"err",oki:e.message.slice(0,40)};}
 finally{await p.close().catch(()=>{});await b.close().catch(()=>{});}
}
(async()=>{
 const {server,port}=await startBenchServer(0);
 const med=a=>{const s=[...a].filter(x=>x>0).sort((x,y)=>x-y);return s.length?s[Math.floor(s.length/2)]:0;};
 const arms={jit:"?x=0", tloc:"?x=0&env.GECKO_WJVS_UNBOX=1&env.GECKO_WJVS_TYPEDLOC=1", off:"?env.GECKO_NOWASMJIT=1"};
 const which=(process.env.ARMS||"jit,tloc,off").split(",");
 const res={}; which.forEach(k=>res[k]=[]);
 for(let it=0;it<N;it++){ let line="iter"+it;
   for(const k of which){ const r=await one(port,arms[k]); res[k].push(r.tot);
     line+=" "+k+"="+r.tot+"(f"+r.f+"/i"+r.i+",okf="+r.okf+",oki="+r.oki+")"; }
   console.error(line);
 }
 for(const k of which) console.error(k.padEnd(6)+" med="+med(res[k])+" ["+res[k].join(",")+"]");
 const base=med(res[which[which.length-1]]);
 for(const k of which) console.error(k.padEnd(6)+"/"+which[which.length-1]+"="+(base>0?(med(res[k])/base).toFixed(2):"?"));
 server.close(); process.exit(0);
})().catch(e=>{console.error("fatal",e.message);process.exit(1);});
