const {chromium}=require("/home/velzie/src/puter/node_modules/playwright");
const {startBenchServer}=require("./bench-server.cjs");
const sleep=(ms)=>new Promise(r=>setTimeout(r,ms));
const PAGE = process.env.PAGE || "jipoly.html";
const MARK = process.env.MARK || "POLY ";
(async()=>{
 const {server,port}=await startBenchServer(0);
 const b=await chromium.launch({headless:true,args:["--no-sandbox","--disable-dev-shm-usage"]});
 const p=await b.newPage();
 p.on('console',m=>{const t=(m.text&&m.text())||'';if(/compile failed|RuntimeError|out of bounds|unreachable|trap|abort|\[wasm/i.test(t))console.log("CON "+t.slice(0,160));});
 p.on('worker',w=>w.on('console',m=>{const t=(m.text&&m.text())||'';if(/compile failed|RuntimeError|out of bounds|unreachable|trap|abort|\[wasm/i.test(t))console.log("WRK "+t.slice(0,160));}));
 const jitqs = process.env.NOJIT ? "" : "&jit=1";  // JIT is opt-in now; default on for these benches
 await p.goto("http://127.0.0.1:"+port+"/index.html?env.GECKO_DEBUG_JIT=1"+jitqs,{waitUntil:"load",timeout:120000});
 await p.waitForFunction(()=>window.__geckoReady===true,{timeout:150000});
 await p.evaluate((u)=>window.geckoRender(u),"http://127.0.0.1:"+port+"/bench/"+PAGE);
 let t="";
 for(let i=0;i<120;i++){ await sleep(1000);
   try{ t=await Promise.race([p.evaluate(()=>window.geckoEval("document.title")),
        new Promise((_,rej)=>setTimeout(()=>rej(new Error("to")),2500))]); }catch(e){}
   if((t||"").indexOf(MARK)>=0){ console.log("DONE "+t.slice(0,140)); break; } }
 console.log("LAST "+(t||"").slice(0,140));
 await b.close().catch(()=>{}); server.close(); process.exit(0);
})().catch(e=>{console.error("fatal",e.message);process.exit(1);});
