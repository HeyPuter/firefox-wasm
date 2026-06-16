const {chromium}=require("/home/velzie/src/puter/node_modules/playwright");
const {startBenchServer}=require("./bench-server.cjs");
const sleep=(ms)=>new Promise(r=>setTimeout(r,ms));
const L=(...a)=>console.log(...a);
const URL=process.env.SITE||"https://en.wikipedia.org/wiki/WebAssembly";
(async()=>{
 const {server,port}=await startBenchServer(0);
 const b=await chromium.launch({headless:true,args:["--no-sandbox","--disable-dev-shm-usage"]});
 const p=await b.newPage();
 await p.goto("http://127.0.0.1:"+port+"/index.html?mirror=1",{waitUntil:"load",timeout:120000});
 await p.waitForFunction(()=>window.__geckoReady===true,{timeout:150000});
 await p.evaluate((u)=>window.geckoRender(u),URL);
 await sleep(6000);
 const ser=async()=>p.evaluate(async()=>{const t=performance.now();const r=await window.geckoEval(window.geckoMirrorScript);return [performance.now()-t, (r||'').length];});
 // first call: DOM is dirty (initial) -> full serialize
 L("serialize #1 (dirty):", JSON.stringify(await ser()));
 // subsequent calls: clean (no DOM change) -> should early-return '' and be cheap
 for(let i=2;i<=5;i++) L("serialize #"+i+" (clean):", JSON.stringify(await ser()));
 // now mutate the DOM -> next serialize should be dirty/full again
 await p.evaluate(()=>window.geckoEval("document.body.appendChild(document.createElement('span'))"));
 await sleep(100);
 L("serialize after mutation (dirty):", JSON.stringify(await ser()));
 await b.close();server.close();process.exit(0);
})().catch(e=>{console.error("fatal",e.message);process.exit(1);});
