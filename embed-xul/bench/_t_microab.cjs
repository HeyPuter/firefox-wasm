const {chromium}=require("/home/velzie/src/puter/node_modules/playwright");
const {startBenchServer}=require("./bench-server.cjs");
const sleep=(ms)=>new Promise(r=>setTimeout(r,ms));
async function run(port, off){
 const b=await chromium.launch({headless:true,args:["--no-sandbox","--disable-dev-shm-usage"]});
 const p=await b.newPage();
 const qs="mirror=1"+(off?"&env.GECKO_NOWASMJIT=1":"");
 await p.goto("http://127.0.0.1:"+port+"/index.html?"+qs,{waitUntil:"load",timeout:120000});
 await p.waitForFunction(()=>window.__geckoReady===true,{timeout:150000});
 await p.evaluate((u)=>window.geckoRender(u),"http://127.0.0.1:"+port+"/bench/microjs.html");
 await sleep(2000);
 // run the bench inside the engine and read JSON
 const r=await p.evaluate(()=>window.geckoEval("JSON.stringify(MICRO_BENCH())"));
 await b.close(); return r;
}
(async()=>{
 const {server,port}=await startBenchServer(0);
 const on=JSON.parse(await run(port,false)), off=JSON.parse(await run(port,true));
 const keys=Object.keys(off);
 console.log("kernel        JIToff   JITon   speedup");
 for(const k of keys){ const f=off[k],n=on[k]; console.log(k.padEnd(12), String(f).padStart(7), String(n).padStart(7), (f/n).toFixed(2)+"x"); }
 server.close();process.exit(0);
})().catch(e=>{console.error("fatal",e.message);process.exit(1);});
