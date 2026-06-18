// Sweep octane sub-benchmarks: for each, run JIT-on (?x=0) vs JIT-off and report
// the per-benchmark score + jit/off ratio. Finds the best 5-10x candidate.
// Env: BENCHES (comma list of octane file names), REPS (runs per arm, median).
const {chromium}=require("playwright-core");
const {startBenchServer}=require("./bench-server.cjs");
const sleep=(ms)=>new Promise(r=>setTimeout(r,ms));
const BENCHES=(process.env.BENCHES||"richards,deltablue,crypto,raytrace,navier-stokes,splay,regexp,earley-boyer").split(",");
const REPS=parseInt(process.env.REPS||"2",10);
async function run(port,bench,qs){
 const b=await chromium.launch({headless:true,executablePath:"/usr/bin/chromium",args:["--no-sandbox","--disable-dev-shm-usage"]});
 const p=await b.newPage(); let crashed=false; p.on("crash",()=>crashed=true);
 try{
  await p.goto("http://127.0.0.1:"+port+"/index.html"+qs,{waitUntil:"load",timeout:60000});
  await p.waitForFunction(()=>window.__geckoReady===true,{timeout:60000});
  await p.evaluate((u)=>window.geckoRender(u),"http://127.0.0.1:"+port+"/bench/octane.html?b="+bench);
  for(let i=0;i<60 && !crashed;i++){await sleep(1000);let t="";try{t=(await p.evaluate(()=>window.geckoEval("document.title")))||"";}catch(e){}
    const m=/OCTSCORE=(\d+)/.exec(t); if(m)return parseInt(m[1]);
    if(/ERR=/.test(t)) return -1;}
  return crashed?-2:0;
 }catch(e){return -3;}
 finally{await p.close().catch(()=>{});await b.close().catch(()=>{});}
}
(async()=>{
 const {server,port}=await startBenchServer(0);
 const med=a=>{const s=[...a].filter(x=>x>0).sort((x,y)=>x-y);return s.length?s[Math.floor(s.length/2)]:0;};
 const rows=[];
 for(const bench of BENCHES){
   const jit=[],off=[],ub=[];
   for(let r=0;r<REPS;r++){ jit.push(await run(port,bench,"?x=0")); }
   for(let r=0;r<REPS;r++){ ub.push(await run(port,bench,"?x=0&env.GECKO_WJVS_UNBOX=1")); }
   for(let r=0;r<REPS;r++){ off.push(await run(port,bench,"?env.GECKO_NOWASMJIT=1")); }
   const jm=med(jit),om=med(off),um=med(ub); const ratio=om>0?(jm/om):0; const uratio=om>0?(um/om):0;
   const line=bench.padEnd(16)+" jit="+jm+" unbox="+um+" off="+om+" jit/off="+ratio.toFixed(2)+" unbox/off="+uratio.toFixed(2)+"  jit["+jit.join(",")+"] unbox["+ub.join(",")+"] off["+off.join(",")+"]";
   console.error(line); rows.push({bench,jm,um,om,ratio,uratio});
 }
 rows.sort((a,b)=>b.uratio-a.uratio);
 console.error("=== ranked by unbox/off ===");
 for(const r of rows) console.error(r.bench.padEnd(16)+" unbox/off="+r.uratio.toFixed(2)+" jit/off="+r.ratio.toFixed(2)+" (unbox="+r.um+" jit="+r.jm+" off="+r.om+")");
 server.close(); process.exit(0);
})().catch(e=>{console.error("fatal",e.message);process.exit(1);});
