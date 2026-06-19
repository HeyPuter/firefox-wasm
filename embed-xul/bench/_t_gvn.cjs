// Phase B GVN A/B + correctness. Both arms use the boxed path (GECKO_WJVS_NOUNBOX=1, since
// GVN is boxed-only for now). Baseline = GVN off; candidate = GVN on. Octane self-validates
// correctness internally, so a miscompile shows up as a missing/zero score or ERR. A final
// debug run per bench captures the gvn-hits counter (not timed). Browser-per-arm, min+median.
const {chromium}=require("playwright-core");
const {startBenchServer}=require("./bench-server.cjs");
const sleep=(ms)=>new Promise(r=>setTimeout(r,ms));
const BENCHES=(process.env.BENCHES||"richards,deltablue,raytrace,crypto").split(",");
const N=parseInt(process.env.N||"4",10);
async function once(port, bench, gvn, debug){
 const b=await chromium.launch({headless:true,executablePath:"/usr/bin/chromium",args:["--no-sandbox","--disable-dev-shm-usage"]});
 let hb="";
 try{
  const p=await b.newPage();
  let crash=false; p.on('crash',()=>crash=true);
  p.on('console',m=>{const t=m.text(); if(t.indexOf("phaseB gvn-hits")>=0||t.indexOf("phaseA ir-regions")>=0) hb=t;});
  const knobs=["env.GECKO_WJVS_NOUNBOX=1"];
  if(gvn) knobs.push("env.GECKO_WJVS_GVN=1");
  if(debug) knobs.push("env.GECKO_DEBUG_JIT=1");
  const qs="?"+knobs.map(k=>k+"&").join("");
  await p.goto("http://127.0.0.1:"+port+"/index.html"+qs,{waitUntil:"load",timeout:120000});
  await p.waitForFunction(()=>window.__geckoReady===true,{timeout:150000});
  await p.evaluate((u)=>window.geckoRender(u),"http://127.0.0.1:"+port+"/bench/octane.html?b="+bench);
  let t="";
  for(let i=0;i<120;i++){ await sleep(1000);
    try{ t=(await p.evaluate(()=>window.geckoEval("document.title")))||""; }catch(e){}
    if(t.indexOf("OCTSCORE=")>=0||t.indexOf("ERR=")>=0) break;
    if(crash) return {score:-1,err:"crash",hb};
  }
  const m=t.match(/OCTSCORE=(\d+)/); const e=t.match(/ERR=([^ ]+)/);
  return {score:m?parseInt(m[1],10):-1, err:e?e[1]:null, hb};
 } finally { await b.close(); }
}
function stats(a){a=a.filter(x=>x>0).sort((x,y)=>x-y); if(!a.length)return{min:-1,med:-1};
 return {min:a[0],med:a[Math.floor(a.length/2)]};}
(async()=>{
 const {server,port}=await startBenchServer(0);
 console.log("boxed path (NOUNBOX), N="+N+"\n");
 for(const bench of BENCHES){
  const A=[],B=[];
  for(let i=0;i<N;i++){ const r=await once(port,bench,false,false); A.push(r.score); if(r.err)console.log(bench+" baseline ERR="+r.err);}
  for(let i=0;i<N;i++){ const r=await once(port,bench,true,false); B.push(r.score); if(r.err)console.log(bench+" GVN ERR="+r.err);}
  const sA=stats(A), sB=stats(B);
  const ratio=(sA.min>0)?(sB.min/sA.min).toFixed(3):"?";
  const d=await once(port,bench,true,true);
  let g=""; if(d.hb){const mm=d.hb.match(/gvn-hits=(\d+)/); if(mm) g=" gvn-hits="+mm[1];}
  console.log(bench+"  GVNoff min="+sA.min+" med="+sA.med+"  | GVNon min="+sB.min+" med="+sB.med+"  | ratio="+ratio+g);
 }
 await server.close(); process.exit(0);
})();
