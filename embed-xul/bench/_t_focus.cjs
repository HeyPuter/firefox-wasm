const {chromium}=require("/home/velzie/src/puter/node_modules/playwright");
const {startBenchServer}=require("./bench-server.cjs");
const sleep=(ms)=>new Promise(r=>setTimeout(r,ms));
const t0=Date.now(); const ts=()=>((Date.now()-t0)/1000).toFixed(1)+"s";
const L=(...a)=>console.log(...a);
(async()=>{
 const {server,port}=await startBenchServer(0);
 const b=await chromium.launch({headless:true,args:["--no-sandbox","--disable-dev-shm-usage"]});
 const p=await b.newPage();
 await p.goto("http://127.0.0.1:"+port+"/index.html?mirror=1",{waitUntil:"load",timeout:120000});
 await p.waitForFunction(()=>window.__geckoReady===true,{timeout:150000});
 L("ready @",ts());
 await p.evaluate((u)=>window.geckoRender(u),"http://127.0.0.1:"+port+"/bench/clicktargets.html");
 await sleep(2000);
 const click=(x,y,label)=>p.evaluate(({x,y})=>{
   const gi=window.geckoInput;
   const seq=(async()=>{ await gi({op:1,evType:1,x,y,button:0,buttons:1,clickCount:1});
                         await gi({op:1,evType:2,x,y,button:0,buttons:0,clickCount:1}); })();
   return Promise.race([seq.then(()=>"resolved"), new Promise(r=>setTimeout(()=>r("TIMEOUT"),7000))]);
 },{x,y}).then(r=>L(label.padEnd(14),":",r,"@",ts()));
 await click(80,40, "plaindiv");   // non-focusable, no handler
 await click(80,100,"focusdiv");   // focusable (tabindex=0)
 await click(80,160,"button");     // focusable
 await click(80,220,"clickdiv");   // non-focusable, has onclick
 await b.close();server.close();process.exit(0);
})().catch(e=>{console.error("fatal",e.message,"@",ts());process.exit(1);});
