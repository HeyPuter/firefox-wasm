const {chromium}=require("/home/velzie/src/puter/node_modules/playwright");
const {startBenchServer}=require("./bench-server.cjs");
const sleep=(ms)=>new Promise(r=>setTimeout(r,ms));
const URL=process.env.SITE||"https://en.wikipedia.org/wiki/United_States";
async function run(port, off){
 const b=await chromium.launch({headless:true,args:["--no-sandbox","--disable-dev-shm-usage"]});
 const p=await b.newPage();
 const qs="mirror=1"+(off?"&env.GECKO_NOWASMJIT=1":"");
 await p.goto("http://127.0.0.1:"+port+"/index.html?"+qs,{waitUntil:"load",timeout:120000});
 await p.waitForFunction(()=>window.__geckoReady===true,{timeout:150000});
 const t0=Date.now();
 await p.evaluate((u)=>window.geckoRender(u),URL);
 // wait until the content document is fully loaded (readyState complete)
 let rs="";
 for(let i=0;i<60;i++){ await sleep(500);
   rs=await p.evaluate(()=>{try{return window.geckoEval("document.readyState");}catch(e){return "";}})||"";
   if(rs==="complete") break;
 }
 const ms=Date.now()-t0;
 await b.close();
 return {ms, rs};
}
(async()=>{
 const {server,port}=await startBenchServer(0);
 const on=await run(port,false), off=await run(port,true);
 console.log("real-site load (United_States wiki):");
 console.log("  JIT ON : "+on.ms+"ms (readyState="+on.rs+")");
 console.log("  JIT OFF: "+off.ms+"ms (readyState="+off.rs+")");
 server.close();process.exit(0);
})().catch(e=>{console.error("fatal",e.message);process.exit(1);});
