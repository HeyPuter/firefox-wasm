// Inline-debug runner: logs ALL worker/page console output (no filter) so the
// [wj-inline] compile-time dump + any trap message is visible.
const {chromium}=require("playwright-core");
const {startBenchServer}=require("./bench-server.cjs");
const sleep=(ms)=>new Promise(r=>setTimeout(r,ms));
const PAGE = process.env.PAGE || "jiinline.html";
const MARK = process.env.MARK || "INLINE ";
const QS = process.env.QS || "";
(async()=>{
 const {server,port}=await startBenchServer(0);
 const b=await chromium.launch({headless:true,executablePath:"/usr/bin/chromium",args:["--no-sandbox","--disable-dev-shm-usage"]});
 const p=await b.newPage();
 const grab=(src)=>(m)=>{const t=(m&&m.text&&m.text())||String(m);
   if(/wj-inline|\[wasm|trap|unreachable|out of bounds|memory access|abort|RuntimeError|compile failed/i.test(t))
     console.log(src+" "+t.slice(0,200));};
 p.on('console',grab('CON')); p.on('pageerror',e=>console.log("PAGEERR "+String(e).slice(0,200)));
 p.on('crash',()=>console.log("*** PAGE CRASH ***"));
 p.on('worker',w=>w.on('console',grab('WRK')));
 let qs="?env.GECKO_DEBUG_JIT=1&jit=1";
 if(QS) qs+="&"+QS;
 await p.goto("http://127.0.0.1:"+port+"/index.html"+qs,{waitUntil:"load",timeout:120000});
 await p.waitForFunction(()=>window.__geckoReady===true,{timeout:150000});
 await p.evaluate((u)=>window.geckoRender(u),"http://127.0.0.1:"+port+"/bench/"+PAGE);
 let t="";
 for(let i=0;i<90;i++){ await sleep(1000);
   try{ t=await Promise.race([p.evaluate(()=>window.geckoEval("document.title")),
        new Promise((_,rej)=>setTimeout(()=>rej(new Error("to")),2500))]); }catch(e){}
   if((t||"").indexOf(MARK)>=0){ console.log("DONE "+t.slice(0,160)); break; } }
 console.log("LAST "+(t||"").slice(0,160));
 await b.close().catch(()=>{}); server.close(); process.exit(0);
})().catch(e=>{console.error("fatal",e.message);process.exit(1);});
