const {chromium}=require("/home/velzie/src/puter/node_modules/playwright");
const {startBenchServer}=require("./bench-server.cjs");
const sleep=(ms)=>new Promise(r=>setTimeout(r,ms));
const t0=Date.now(); const ts=()=>((Date.now()-t0)/1000).toFixed(1)+"s";
function L(...a){ console.log(...a); }
(async()=>{
 const {server,port}=await startBenchServer(0);
 const b=await chromium.launch({headless:true,args:["--no-sandbox","--disable-dev-shm-usage"]});
 const p=await b.newPage();
 p.on("console",m=>{ const t=m.text(); if(/\[mirror\]|cmd error|harness/.test(t)) L("  page:",t); });
 await p.goto("http://127.0.0.1:"+port+"/index.html?mirror=1",{waitUntil:"load",timeout:120000});
 await p.waitForFunction(()=>window.__geckoReady===true,{timeout:150000});
 L("ready @",ts());
 await p.evaluate((u)=>window.geckoRender(u),"http://127.0.0.1:"+port+"/bench/mirror-click.html");
 L("rendered @",ts());
 await sleep(2500);
 const evalIn=(s)=>p.evaluate((s)=>window.geckoEval(s),s);
 L("BEFORE o:", JSON.stringify(await evalIn("document.getElementById('o').textContent")), "@",ts());
 L("btn rect:", await evalIn("var r=document.getElementById('btn').getBoundingClientRect(); JSON.stringify([r.left,r.top,r.width,r.height])"), "@",ts());
 L("elem@90,45:", JSON.stringify(await evalIn("(document.elementFromPoint(90,45)||{}).id")), "@",ts());
 await p.evaluate(()=>{const gi=window.geckoInput;
   gi({op:1,evType:0,x:90,y:45,buttons:0});
   gi({op:1,evType:1,x:90,y:45,button:0,buttons:1,clickCount:1});
   gi({op:1,evType:2,x:90,y:45,button:0,buttons:0,clickCount:1});});
 L("input fired @",ts());
 await sleep(1500);
 L("AFTER o:", JSON.stringify(await evalIn("document.getElementById('o').textContent")), "@",ts());
 await b.close();server.close();process.exit(0);
})().catch(e=>{console.error("fatal",e.message,"@",ts());process.exit(1);});
