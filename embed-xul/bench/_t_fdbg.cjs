// Phase F crash-visible diagnostic. Runs ONE bench with the boxed path + forced deopt at
// block BLK, dumping ALL console output, page errors, and worker crashes so a wasm trap /
// abort is visible (the perf harness swallowed these). Hard-exits after TIMEOUT seconds.
const {chromium}=require("playwright-core");
const {startBenchServer}=require("./bench-server.cjs");
const sleep=(ms)=>new Promise(r=>setTimeout(r,ms));
const BENCH=process.env.BENCH||"richards";
const BLK=process.env.BLK; // undefined => no forced deopt (baseline)
const TIMEOUT=parseInt(process.env.TIMEOUT||"60",10);
(async()=>{
 const {server,port}=await startBenchServer(0);
 const b=await chromium.launch({headless:true,executablePath:"/usr/bin/chromium",args:["--no-sandbox","--disable-dev-shm-usage"]});
 const p=await b.newPage();
 p.on('console',m=>{const t=m.text();
   if(/abort|Abort|RuntimeError|MOZ_|CRASH|assert|trap|out of bounds|unreachable|deopt|resume|fdeopt|FAIL/i.test(t)) console.log("[con] "+t.slice(0,2000));});
 p.on('pageerror',e=>console.log("[pageerror] "+(e&&e.stack?e.stack:String(e)).slice(0,4000)));
 p.on('crash',()=>console.log("[PAGE CRASH]"));
 p.on('worker',w=>{ w.on('close',()=>{}); });
 const knobs=["env.GECKO_WJVS_NOUNBOX=1","env.GECKO_DEBUG_JIT=1"];
 if(BLK!==undefined) knobs.push("env.GECKO_WJVS_FDEOPT="+BLK);
 const qs="?"+knobs.map(k=>k+"&").join("");
 console.log("loading "+BENCH+" knobs="+JSON.stringify(knobs));
 try{
  await p.goto("http://127.0.0.1:"+port+"/index.html"+qs,{waitUntil:"load",timeout:60000});
  await p.waitForFunction(()=>window.__geckoReady===true,{timeout:60000});
  await p.evaluate((u)=>window.geckoRender(u),"http://127.0.0.1:"+port+"/bench/octane.html?b="+BENCH);
  let t="";
  for(let i=0;i<TIMEOUT;i++){ await sleep(1000);
    try{ t=(await p.evaluate(()=>window.geckoEval("document.title")))||""; }catch(e){ console.log("[eval-fail] "+String(e).slice(0,200)); }
    if(t.indexOf("OCTSCORE=")>=0||t.indexOf("ERR=")>=0){ console.log("TITLE: "+t); break; }
  }
  if(t.indexOf("OCTSCORE=")<0 && t.indexOf("ERR=")<0) console.log("TIMEOUT/NO-RESULT last-title="+JSON.stringify(t));
 }catch(e){ console.log("[exception] "+String(e).slice(0,400)); }
 await b.close(); await server.close(); process.exit(0);
})();
