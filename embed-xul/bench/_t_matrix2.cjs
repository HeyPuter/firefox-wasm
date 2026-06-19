// Test many env configs on one bench, min+median of N each. Fresh browser per run.
const {chromium}=require("playwright-core");
const {startBenchServer}=require("./bench-server.cjs");
const sleep=(ms)=>new Promise(r=>setTimeout(r,ms));
const BENCH=process.env.BENCH||"richards";
const N=parseInt(process.env.N||"3",10);
// label -> query string (after the leading ?)
const CONFIGS = {
 "OFF":           "env.GECKO_NOWASMJIT=1",
 "ON(sc)":        "",
 "ON-noSC":       "env.GECKO_WJVS_NOSHORTCIRCUIT=1",
 "ON+unbox":      "env.GECKO_WJVS_UNBOX=1",
 "ON+unbox+tloc": "env.GECKO_WJVS_UNBOX=1&env.GECKO_WJVS_TYPEDLOC=1",
 "ON+objset":     "env.GECKO_WJVS_OBJSET=1",
 "ON+inline":     "env.GECKO_WJVS_INLINE=1",
};
async function once(port, qs){
 const b=await chromium.launch({headless:true,executablePath:"/usr/bin/chromium",args:["--no-sandbox","--disable-dev-shm-usage"]});
 try{
  const p=await b.newPage(); let crash=false; p.on('crash',()=>crash=true);
  await p.goto("http://127.0.0.1:"+port+"/index.html"+(qs?("?"+qs):""),{waitUntil:"load",timeout:120000});
  await p.waitForFunction(()=>window.__geckoReady===true,{timeout:150000});
  await p.evaluate((u)=>window.geckoRender(u),"http://127.0.0.1:"+port+"/bench/octane.html?b="+BENCH);
  let t="";
  for(let i=0;i<100;i++){ await sleep(1000);
    try{ t=(await p.evaluate(()=>window.geckoEval("document.title")))||""; }catch(e){}
    if(t.indexOf("OCTSCORE=")>=0||t.indexOf("ERR=")>=0) break;
    if(crash) return -2;
  }
  const m=t.match(/OCTSCORE=(\d+)/); return m?parseInt(m[1],10):-1;
 } finally { await b.close(); }
}
function med(a){a=a.filter(x=>x>0).sort((x,y)=>x-y); return a.length?a[Math.floor(a.length/2)]:-1;}
function mn(a){a=a.filter(x=>x>0).sort((x,y)=>x-y); return a.length?a[0]:-1;}
(async()=>{
 const {server,port}=await startBenchServer(0);
 const res={};
 for(const [label,qs] of Object.entries(CONFIGS)){
   const arr=[]; for(let i=0;i<N;i++){ arr.push(await once(port,qs)); }
   res[label]={min:mn(arr),med:med(arr),raw:arr};
   console.log(label.padEnd(16)+" min="+res[label].min+" med="+res[label].med+"  raw="+arr.join(","));
 }
 const off=res["OFF"]?res["OFF"].med:-1;
 console.log("\n=== "+BENCH+" jit/off ratios (median) vs OFF="+off+" ===");
 for(const [label,r] of Object.entries(res)){ if(label==="OFF")continue;
   console.log(label.padEnd(16)+" ratio="+(r.med/off).toFixed(3)); }
 server.close();process.exit(0);
})().catch(e=>{console.error("fatal",e.message);process.exit(1);});
