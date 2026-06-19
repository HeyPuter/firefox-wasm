const {chromium}=require("playwright-core");
const {startBenchServer}=require("./bench-server.cjs");
const sleep=(ms)=>new Promise(r=>setTimeout(r,ms));
async function run(port, off, dbg, tag){
 const b=await chromium.launch({headless:true,executablePath:"/usr/bin/chromium",args:["--no-sandbox","--disable-dev-shm-usage"]});
 const p=await b.newPage();
 const want=/wj-compile|wj-enter|richards|schedule|wasm-jit\]/i;
 const grab=(m)=>{const t=(m&&m.text&&m.text())||String(m); if(want.test(t)) console.log(tag+": "+t.slice(0,200));};
 p.on('console',grab); p.on('pageerror',e=>console.log(tag+" PAGEERR "+String(e).slice(0,160)));
 p.on('worker',w=>w.on('console',grab));
 let qs="?"; if(off) qs+="env.GECKO_NOWASMJIT=1&"; if(dbg) qs+="env.GECKO_DEBUG_JIT=1&";
 await p.goto("http://127.0.0.1:"+port+"/index.html"+qs,{waitUntil:"load",timeout:120000});
 await p.waitForFunction(()=>window.__geckoReady===true,{timeout:150000});
 await p.evaluate((u)=>window.geckoRender(u),"http://127.0.0.1:"+port+"/bench/octane.html?b=richards");
 let t="",prev="";
 for(let i=0;i<120;i++){ await sleep(1000);
   try{ t=(await p.evaluate(()=>window.geckoEval("document.title")))||""; }catch(e){ t="(evalthrow)"; }
   if(t!==prev){ console.log(tag+" ["+i+"s] "+t); prev=t; }
   if(t.indexOf("OCTSCORE=")>=0||t.indexOf("ERR=")>=0) break;
 }
 await b.close(); return t;
}
(async()=>{
 const {server,port}=await startBenchServer(0);
 await run(port,false,true,"ON-DBG");
 server.close();process.exit(0);
})().catch(e=>{console.error("fatal",e.message);process.exit(1);});
