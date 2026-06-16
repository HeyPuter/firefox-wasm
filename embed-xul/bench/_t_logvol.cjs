const {chromium}=require("/home/velzie/src/puter/node_modules/playwright");
const {startBenchServer}=require("./bench-server.cjs");
const sleep=(ms)=>new Promise(r=>setTimeout(r,ms));
(async()=>{
 const {server,port}=await startBenchServer(0);
 const b=await chromium.launch({headless:true,args:["--no-sandbox","--disable-dev-shm-usage"]});
 const p=await b.newPage();
 const counts={}; let total=0;
 p.on("console",m=>{ total++; const t=m.text().slice(0,70); counts[t]=(counts[t]||0)+1; });
 await p.goto("http://127.0.0.1:"+port+"/index.html?mirror=1",{waitUntil:"load",timeout:120000});
 await p.waitForFunction(()=>window.__geckoReady===true,{timeout:150000});
 const t0=Date.now();
 await p.evaluate((u)=>window.geckoRender(u),"http://127.0.0.1:"+port+"/bench/dynamic.html");
 await sleep(8000);
 console.log("TOTAL console lines during load+8s:", total, "elapsed", Date.now()-t0);
 const top=Object.entries(counts).sort((a,b)=>b[1]-a[1]).slice(0,15);
 for(const [msg,n] of top) console.log(n+"\t"+msg);
 await b.close();server.close();process.exit(0);
})().catch(e=>{console.error("fatal",e.message);process.exit(1);});
