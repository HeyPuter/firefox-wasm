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
 await p.evaluate((u)=>window.geckoRender(u),"http://127.0.0.1:"+port+"/bench/plainbtn.html");
 await sleep(2000);
 const fire=(item,label)=>p.evaluate((item)=>{
   const gi=window.geckoInput(item);
   return Promise.race([gi.then(()=>"resolved"), new Promise(r=>setTimeout(()=>r("TIMEOUT"),7000))]);
 }, item).then(r=>L((label+"").padEnd(34),":",r,"@",ts()));
 // empty space (no element under cursor)
 await fire({op:1,evType:1,x:400,y:400,button:0,buttons:1,clickCount:1},"down empty cc1");
 await fire({op:1,evType:2,x:400,y:400,button:0,buttons:0,clickCount:1},"up   empty cc1");
 // on plain button, no handler
 await fire({op:1,evType:1,x:90,y:45,button:0,buttons:1,clickCount:1},"down btn   cc1");
 await fire({op:1,evType:2,x:90,y:45,button:0,buttons:0,clickCount:0},"up   btn   cc0 (no click)");
 await fire({op:1,evType:2,x:90,y:45,button:0,buttons:0,clickCount:1},"up   btn   cc1 (click)");
 await b.close();server.close();process.exit(0);
})().catch(e=>{console.error("fatal",e.message,"@",ts());process.exit(1);});
