// Phase F soundness test. Boxed path (NOUNBOX). Baseline = no forced deopt; candidate =
// GECKO_WJVS_FDEOPT=BLK forces every Mode VS body to bail to the interpreter at the top of
// block BLK (when control reaches it, depth 0) and resume there. Octane self-validates its
// results, so a correct score + no ERR means the resume reconstructed state correctly.
// Reports deopt-resumes (must be > 0 to prove the path actually fired).
const {chromium}=require("playwright-core");
const {startBenchServer}=require("./bench-server.cjs");
const sleep=(ms)=>new Promise(r=>setTimeout(r,ms));
const BENCHES=(process.env.BENCHES||"richards,deltablue,raytrace").split(",");
const BLK=process.env.BLK||"1";
async function once(port, bench, fdeopt){
 const b=await chromium.launch({headless:true,executablePath:"/usr/bin/chromium",args:["--no-sandbox","--disable-dev-shm-usage"]});
 let hb="", crash=false;
 try{
  const p=await b.newPage();
  p.on('crash',()=>crash=true);
  p.on('pageerror',()=>{});
  p.on('console',m=>{const t=m.text(); if(t.indexOf("deopt-resumes")>=0) hb=t;});
  const knobs=["env.GECKO_WJVS_NOUNBOX=1"];
  if(fdeopt!==null){ knobs.push("env.GECKO_WJVS_FDEOPT="+fdeopt); knobs.push("env.GECKO_DEBUG_JIT=1"); }
  const qs="?"+knobs.map(k=>k+"&").join("");
  await p.goto("http://127.0.0.1:"+port+"/index.html"+qs,{waitUntil:"load",timeout:120000});
  await p.waitForFunction(()=>window.__geckoReady===true,{timeout:150000});
  await p.evaluate((u)=>window.geckoRender(u),"http://127.0.0.1:"+port+"/bench/octane.html?b="+bench);
  let t="";
  for(let i=0;i<120;i++){ await sleep(1000);
    try{ t=(await p.evaluate(()=>window.geckoEval("document.title")))||""; }catch(e){}
    if(t.indexOf("OCTSCORE=")>=0||t.indexOf("ERR=")>=0) break;
    if(crash) return {score:-1,err:"CRASH",hb};
  }
  const m=t.match(/OCTSCORE=(\d+)/); const e=t.match(/ERR=([^ ]+)/);
  return {score:m?parseInt(m[1],10):-1, err:e?e[1]:null, hb};
 } finally { await b.close(); }
}
(async()=>{
 const {server,port}=await startBenchServer(0);
 console.log("boxed path (NOUNBOX), force-deopt at block "+BLK+"\n");
 for(const bench of BENCHES){
  const base=await once(port,bench,null);
  const cand=await once(port,bench,BLK);
  let res=""; if(cand.hb){const mm=cand.hb.match(/deopt-resumes=(\d+)/); if(mm) res=mm[1];}
  const ok = cand.score>0 && !cand.err && !cand.err;
  console.log(bench+"  baseline="+base.score+(base.err?(" ERR="+base.err):"")
    +"   force-deopt="+cand.score+(cand.err?(" ERR="+cand.err):"")
    +"   resumes="+res+"   "+(cand.score>0&&!cand.err?"OK":"*** FAIL ***"));
 }
 await server.close(); process.exit(0);
})();
