const {chromium}=require("playwright-core");
const {startBenchServer}=require("./bench-server.cjs");
const sleep=(ms)=>new Promise(r=>setTimeout(r,ms));
(async()=>{
 const {server,port}=await startBenchServer(0);
 const b=await chromium.launch({headless:true,executablePath:"/usr/bin/chromium",args:["--no-sandbox","--disable-dev-shm-usage"]});
 const p=await b.newPage();
 const show=(pfx)=>(m)=>{ try{ const t=(m&&m.text&&m.text())||String(m);
   if(/RuntimeError|out of bounds|TraceJit|Activation|Nursery|GC|collect|wasm-function|trace/i.test(t))
     console.log(pfx+"| "+t); }catch(e){} };
 p.on('console',show("CON")); p.on('worker',w=>w.on('console',show("WRK")));
 p.on('pageerror',e=>console.log("PAGEERR| "+(e&&e.stack||String(e))));
 p.on('crash',()=>console.log("*** PAGE CRASH ***"));
 await p.goto("http://127.0.0.1:"+port+"/index.html?env.GECKO_DEBUG_JIT=1&env.GECKO_WJVS_HASCALL=1",{waitUntil:"load",timeout:120000});
 await p.waitForFunction(()=>window.__geckoReady===true,{timeout:150000});
 await p.evaluate((u)=>window.geckoRender(u),"http://127.0.0.1:"+port+"/bench/octane.html?b=deltablue");
 for(let i=0;i<25;i++){ await sleep(1000);
   try{ const t=await Promise.race([p.evaluate(()=>window.geckoEval("document.title")),new Promise((_,r)=>setTimeout(()=>r(new Error("to")),2000))]);
     if((t||"").indexOf("OCTSCORE=")>=0){ console.log("DONE "+t); break; } }catch(e){} }
 await b.close().catch(()=>{}); server.close(); process.exit(0);
})().catch(e=>{console.error("fatal",e.message);process.exit(1);});
