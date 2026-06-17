const {chromium}=require("/home/velzie/src/puter/node_modules/playwright");
const {startBenchServer}=require("./bench-server.cjs");
const sleep=(ms)=>new Promise(r=>setTimeout(r,ms));
(async()=>{
 const {server,port}=await startBenchServer(0);
 const b=await chromium.launch({headless:true,args:["--no-sandbox","--disable-dev-shm-usage"]});
 const p=await b.newPage();
 await p.goto("http://127.0.0.1:"+port+"/index.html?mirror=1",{waitUntil:"load",timeout:120000});
 await p.waitForFunction(()=>window.__geckoReady===true,{timeout:150000});
 await p.evaluate((u)=>window.geckoRender(u),"http://127.0.0.1:"+port+"/bench/octane.html?b=richards");
 let log="";
 for(let i=0;i<40;i++){ await sleep(1000); try{log=(await p.evaluate(()=>window.geckoEval("document.getElementById('log').textContent")))||"";}catch(e){} if(/SCORE|ERROR/.test(log))break; }
 console.log("LOG:\n"+log);
 await b.close(); server.close(); process.exit(0);
})().catch(e=>{console.error("fatal",e.message);process.exit(1);});
