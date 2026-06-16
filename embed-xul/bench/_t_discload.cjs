const {chromium}=require("/home/velzie/src/puter/node_modules/playwright");
const {startBenchServer}=require("./bench-server.cjs");
const sleep=(ms)=>new Promise(r=>setTimeout(r,ms));
async function run(port, off){
 const b=await chromium.launch({headless:true,args:["--no-sandbox","--disable-dev-shm-usage"]});
 const p=await b.newPage();
 const qs = off?"?env.GECKO_NOWASMJIT=1":"";
 await p.goto("http://127.0.0.1:"+port+"/index.html"+qs,{waitUntil:"load",timeout:120000});
 await p.waitForFunction(()=>window.__geckoReady===true,{timeout:150000});
 const t0=Date.now();
 // geckoRender returns when the doc reaches INTERACTIVE (our load gate); time it,
 // then poll readyState->complete. Both are clean engine-side signals.
 const interactiveMs = await p.evaluate(async(u)=>{const t=performance.now(); await window.geckoRender(u); return performance.now()-t;},"https://discord.com/login");
 let completeMs=-1;
 for(let i=0;i<80;i++){ await sleep(500);
   const rs=await p.evaluate(()=>{try{return window.geckoEval("document.readyState");}catch(e){return "";}})||"";
   if(rs==="complete"){ completeMs=Date.now()-t0; break; }
 }
 await b.close(); return {interactiveMs:Math.round(interactiveMs), completeMs};
}
(async()=>{
 const {server,port}=await startBenchServer(0);
 console.log("discord.com/login load (CANVAS mode):");
 const on=await run(port,false); console.log("  JIT ON : interactive="+on.interactiveMs+"ms complete="+(on.completeMs<0?"NONE(40s)":on.completeMs+"ms"));
 const off=await run(port,true); console.log("  JIT OFF: interactive="+off.interactiveMs+"ms complete="+(off.completeMs<0?"NONE(40s)":off.completeMs+"ms"));
 server.close();process.exit(0);
})().catch(e=>{console.error("fatal",e.message);process.exit(1);});
