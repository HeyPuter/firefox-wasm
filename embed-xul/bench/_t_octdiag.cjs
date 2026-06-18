const {chromium}=require("playwright-core");
const {startBenchServer}=require("./bench-server.cjs");
const sleep=(ms)=>new Promise(r=>setTimeout(r,ms));
(async()=>{
 const {server,port}=await startBenchServer(0);
 const b=await chromium.launch({headless:true,executablePath:"/usr/bin/chromium",args:["--no-sandbox","--disable-dev-shm-usage"]});
 const p=await b.newPage();
 const cap=(m)=>{const t=(m&&m.text&&m.text())||String(m); if(/wasm-jit/.test(t))console.log(t.replace(/^\[err\]\s*/,''));};
 p.on('console',cap); p.on('worker',w=>w.on('console',cap));
 await p.goto("http://127.0.0.1:"+port+"/index.html?env.GECKO_DEBUG_JIT=1",{waitUntil:"load",timeout:120000});
 await p.waitForFunction(()=>window.__geckoReady===true,{timeout:150000});
 await p.evaluate((u)=>window.geckoRender(u),"http://127.0.0.1:"+port+"/bench/octane.html?b=richards,deltablue");
 let t="",prev="";
 for(let i=0;i<150;i++){ await sleep(2000);
   try{ t=(await p.evaluate(()=>window.geckoEval("document.title")))||""; }catch(e){}
   if(t!==prev){ console.log("TITLE "+t); prev=t; }
   if(t.indexOf("OCTSCORE=")>=0) break;
 }
 await b.close(); server.close(); process.exit(0);
})().catch(e=>{console.error("fatal",e.message);process.exit(1);});
