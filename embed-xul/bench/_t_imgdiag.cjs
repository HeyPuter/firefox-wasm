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
 await sleep(9000);
 const ev=(s)=>p.evaluate((s)=>window.geckoEval(s),s);
 // live doc img info
 const info = await ev(`JSON.stringify([].map.call(document.querySelectorAll('img'),function(im){return{cs:(im.currentSrc||im.src||'').slice(0,60),w:im.naturalWidth,h:im.naturalHeight,svg:/\\.svg/i.test(im.currentSrc||im.src||'')};}))`);
 const arr = JSON.parse(await p.evaluate(()=>window.geckoEval ? null : null) || "null") ; // placeholder
 // op6 array
 const imgs = JSON.parse(await p.evaluate(async()=>{ return await window.__op6 ? null : null; })||"null")||null;
 // call op6 via the queue directly
 const op6 = await p.evaluate(async()=>{ const enq = window.geckoInput; return null; });
 L("LIVE IMGS:", info);
 // fetch op6 through geckoEval is not it; use a tiny hook: enqueue op6
 const dataUrls = await p.evaluate(async()=>{
   // reach the internal enqueue via geckoEval? no. Use geckoInput? It's enqueue.
   return await window.geckoInput({op:6});
 });
 const parsed = JSON.parse(dataUrls||"[]");
 L("OP6 lengths:", JSON.stringify(parsed.map(s=>s?s.length:0)));
 await b.close();server.close();process.exit(0);
})().catch(e=>{console.error("fatal",e.message);process.exit(1);});
