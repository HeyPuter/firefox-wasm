const {chromium}=require("/home/velzie/src/puter/node_modules/playwright");
const {startBenchServer}=require("./bench-server.cjs");
const sleep=(ms)=>new Promise(r=>setTimeout(r,ms));
const t0=Date.now(); const ts=()=>((Date.now()-t0)/1000).toFixed(1)+"s";
function L(...a){ console.log(...a); }
(async()=>{
 const {server,port}=await startBenchServer(0);
 const b=await chromium.launch({headless:true,args:["--no-sandbox","--disable-dev-shm-usage"]});
 const p=await b.newPage();
 await p.goto("http://127.0.0.1:"+port+"/index.html",{waitUntil:"load",timeout:120000});
 await p.waitForFunction(()=>window.__geckoReady===true,{timeout:150000});
 L("ready @",ts());
 await p.evaluate((u)=>window.geckoRender(u),"http://127.0.0.1:"+port+"/bench/mirror-click.html");
 await sleep(2000);
 // Await each input op individually with an 8s race. resolved=true means C++ set state=3.
 const fire=(item)=>p.evaluate((item)=>{
   const gi=window.geckoInput(item);
   return Promise.race([gi.then(()=>"resolved"), new Promise(r=>setTimeout(()=>r("TIMEOUT"),8000))]);
 }, item);
 L("move :", await fire({op:1,evType:0,x:90,y:45,buttons:0}), "@",ts());
 L("down :", await fire({op:1,evType:1,x:90,y:45,button:0,buttons:1,clickCount:1}), "@",ts());
 L("up   :", await fire({op:1,evType:2,x:90,y:45,button:0,buttons:0,clickCount:1}), "@",ts());
 await b.close();server.close();process.exit(0);
})().catch(e=>{console.error("fatal",e.message,"@",ts());process.exit(1);});
