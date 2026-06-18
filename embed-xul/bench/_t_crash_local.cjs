const {chromium}=require("playwright-core");
const {startBenchServer}=require("./bench-server.cjs");
const sleep=(ms)=>new Promise(r=>setTimeout(r,ms));
const SUB = process.env.OCT || "deltablue";
(async()=>{
 const {server,port}=await startBenchServer(0);
 const b=await chromium.launch({headless:true,executablePath:"/usr/bin/chromium",args:["--no-sandbox","--disable-dev-shm-usage"]});
 const p=await b.newPage();
 // Print EVERY console/worker/error line IMMEDIATELY (not buffered) so a hard
 // renderer crash can't swallow the preceding abort/trap messages.
 const show=(pfx)=>(m)=>{ try{ const t=(m&&m.text&&m.text())||String(m);
   if(/compile failed|RuntimeError|out of bounds|trap|abort|unreachable|memory access|\[wasm|VS-recompile|too much recursion|Aborted/i.test(t))
     console.log(pfx+" "+t.slice(0,240)); }catch(e){} };
 p.on('console',show("CON")); p.on('worker',w=>w.on('console',show("WRK")));
 p.on('pageerror',e=>console.log("PAGEERR "+String(e).slice(0,240)));
 p.on('crash',()=>console.log("*** PAGE CRASH ***"));
 await p.goto("http://127.0.0.1:"+port+"/index.html?env.GECKO_DEBUG_JIT=1"+(process.env.QS?"&"+process.env.QS:"")+"",{waitUntil:"load",timeout:120000});
 await p.waitForFunction(()=>window.__geckoReady===true,{timeout:150000});
 await p.evaluate((u)=>window.geckoRender(u),"http://127.0.0.1:"+port+"/bench/octane.html?b="+SUB);
 let t="";
 for(let i=0;i<60;i++){ await sleep(1000);
   try{ t=await Promise.race([p.evaluate(()=>window.geckoEval("document.title")),
        new Promise((_,rej)=>setTimeout(()=>rej(new Error("evaltimeout")),2000))]); }
   catch(e){ console.log("EVAL "+e.message.slice(0,60)); }
   if((t||"").indexOf("OCTSCORE=")>=0||(t||"").indexOf("ERR=")>=0){ console.log("DONE "+t.slice(0,90)); break; }
 }
 console.log("LASTTITLE "+(t||"").slice(0,90));
 await b.close().catch(()=>{}); server.close();
 process.exit(0);
})().catch(e=>{console.error("fatal",e.message);process.exit(1);});
