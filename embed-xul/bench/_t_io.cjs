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
 await p.evaluate((u)=>window.geckoRender(u),"http://127.0.0.1:"+port+"/bench/mirror-click.html");
 await sleep(2000);
 const ev=(s)=>p.evaluate((s)=>window.geckoEval(s),s);
 const gi=(items)=>p.evaluate(async(items)=>{ for(const it of items){ await window.geckoInput(it);} return "ok"; }, items);
 // --- CLICK the button at (90,45) ---
 L("o before  :", JSON.stringify(await ev("document.getElementById('o').textContent")));
 await gi([
   {op:1,evType:0,x:90,y:45,buttons:0},
   {op:1,evType:1,x:90,y:45,button:0,buttons:1,clickCount:1},
   {op:1,evType:2,x:90,y:45,button:0,buttons:0,clickCount:1},
 ]);
 await sleep(400);
 const oAfter = await ev("document.getElementById('o').textContent");
 L("o after   :", JSON.stringify(oAfter), oAfter==="CLICKED-1" ? "  <-- CLICK OK" : "  <-- CLICK FAIL");
 // --- focus the input (click it) then TYPE "hi" ---
 await gi([
   {op:1,evType:1,x:110,y:140,button:0,buttons:1,clickCount:1},
   {op:1,evType:2,x:110,y:140,button:0,buttons:0,clickCount:1},
 ]);
 await sleep(300);
 // key h then i (op=2 keyboard; evType 0=down,1=up). keyValue is the char.
 const typeKey=(ch,code)=>gi([
   {op:2,evType:0,key:ch,keyCode:code,charCode:ch.charCodeAt(0)},
   {op:2,evType:1,key:ch,keyCode:code,charCode:ch.charCodeAt(0)},
 ]);
 await typeKey("h",72); await typeKey("i",73);
 await sleep(400);
 const o2 = await ev("document.getElementById('o2').textContent");
 const inpVal = await ev("document.getElementById('inp').value");
 L("inp value :", JSON.stringify(inpVal));
 L("o2 after  :", JSON.stringify(o2), o2==="TYPED:hi" ? "  <-- TYPE OK" : "  <-- TYPE FAIL");
 // --- confirm the mirror iframe srcdoc reflects Gecko's DOM ---
 await sleep(400);
 const mir = await p.evaluate(()=>(document.getElementById("mirror")||{}).srcdoc||"");
 L("mirror has CLICKED-1:", /CLICKED-1/.test(mir), " has TYPED:hi:", /TYPED:hi/.test(mir));
 await b.close();server.close();process.exit(0);
})().catch(e=>{console.error("fatal",e.message,"@",ts());process.exit(1);});
