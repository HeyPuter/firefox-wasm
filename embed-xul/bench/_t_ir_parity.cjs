// Phase A IR parity: arm A = JIT on, IR off; arm B = JIT on, IR on (GECKO_WJVS_IR=1).
// Both should be byte-identical wasm (parity by construction) -> scores within noise and
// no crash. Also captures the [wasm-jit] heartbeat to confirm the IR path actually fired
// (phaseA ir-regions > 0). Browser-per-arm, min+median of N. Optional NOUNBOX via UNBOX=0.
const {chromium}=require("playwright-core");
const {startBenchServer}=require("./bench-server.cjs");
const sleep=(ms)=>new Promise(r=>setTimeout(r,ms));
const BENCHES=(process.env.BENCHES||"richards,deltablue,crypto,raytrace,navier-stokes,splay").split(",");
const N=parseInt(process.env.N||"4",10);
const NOUNBOX=process.env.UNBOX==="0";
async function once(port, bench, irOn, debug){
 const b=await chromium.launch({headless:true,executablePath:"/usr/bin/chromium",args:["--no-sandbox","--disable-dev-shm-usage"]});
 let heartbeat="";
 try{
  const p=await b.newPage();
  let crash=false; p.on('crash',()=>crash=true);
  p.on('console',m=>{const t=m.text(); if(t.indexOf("phaseA ir-regions")>=0) heartbeat=t;});
  let qs="?";
  const knobs=[];
  if(irOn) knobs.push("env.GECKO_WJVS_IR=1");
  if(NOUNBOX) knobs.push("env.GECKO_WJVS_NOUNBOX=1");
  if(debug) knobs.push("env.GECKO_DEBUG_JIT=1");  // diagnostic only — NOT in the perf arms
  qs+=knobs.map(k=>k+"&").join("");
  await p.goto("http://127.0.0.1:"+port+"/index.html"+qs,{waitUntil:"load",timeout:120000});
  await p.waitForFunction(()=>window.__geckoReady===true,{timeout:150000});
  await p.evaluate((u)=>window.geckoRender(u),"http://127.0.0.1:"+port+"/bench/octane.html?b="+bench);
  let t="";
  for(let i=0;i<120;i++){ await sleep(1000);
    try{ t=(await p.evaluate(()=>window.geckoEval("document.title")))||""; }catch(e){}
    if(t.indexOf("OCTSCORE=")>=0||t.indexOf("ERR=")>=0) break;
    if(crash) return {score:-1,err:"crash",heartbeat};
  }
  const m=t.match(/OCTSCORE=(\d+)/); const e=t.match(/ERR=([^ ]+)/);
  return {score:m?parseInt(m[1],10):-1, err:e?e[1]:null, heartbeat};
 } finally { await b.close(); }
}
function stats(a){a=a.filter(x=>x>0).sort((x,y)=>x-y); if(!a.length)return{min:-1,med:-1};
 return {min:a[0],med:a[Math.floor(a.length/2)]};}
(async()=>{
 const {server,port}=await startBenchServer(0);
 console.log("unbox="+(NOUNBOX?"OFF":"ON")+"  N="+N+"\n");
 for(const bench of BENCHES){
  const A=[],B=[];
  for(let i=0;i<N;i++){ const r=await once(port,bench,false,false); A.push(r.score); if(r.err)console.log(bench+" A ERR="+r.err);}
  for(let i=0;i<N;i++){ const r=await once(port,bench,true,false); B.push(r.score); if(r.err)console.log(bench+" B ERR="+r.err);}
  const sA=stats(A), sB=stats(B);
  const ratio=(sA.min>0)?(sB.min/sA.min).toFixed(3):"?";
  // one extra IR-on run WITH debug logging to confirm the IR path fired (not timed)
  const d=await once(port,bench,true,true);
  console.log(bench+"  IRoff min="+sA.min+" med="+sA.med+"  | IRon min="+sB.min+" med="+sB.med+"  | ratio(on/off)="+ratio+(d.heartbeat?("   ["+d.heartbeat.trim().replace(/.*phaseA/,"phaseA")+"]"):""));
 }
 await server.close(); process.exit(0);
})();
