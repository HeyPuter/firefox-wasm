const {chromium}=require("playwright-core");
const {startBenchServer}=require("./bench-server.cjs");
const SUB = process.env.OCT || "richards,deltablue";
const REPS = parseInt(process.env.REPS||"2",10);
const sleep=(ms)=>new Promise(r=>setTimeout(r,ms));
async function run(port, qs, tag){
 const b=await chromium.launch({headless:true,executablePath:"/usr/bin/chromium",args:["--no-sandbox","--disable-dev-shm-usage"]});
 const p=await b.newPage();
 p.on('crash',()=>console.log(tag+" *** CRASH ***"));
 p.on('pageerror',e=>{if(/bounds|RuntimeError/.test(String(e)))console.log(tag+" PAGEERR")});
 await p.goto("http://127.0.0.1:"+port+"/index.html"+qs,{waitUntil:"load",timeout:120000});
 await p.waitForFunction(()=>window.__geckoReady===true,{timeout:150000});
 await p.evaluate((u)=>window.geckoRender(u),"http://127.0.0.1:"+port+"/bench/octane.html?b="+SUB);
 let t="";
 for(let i=0;i<90;i++){ await sleep(2000); try{ t=(await p.evaluate(()=>window.geckoEval("document.title")))||""; }catch(e){}
   if(t.indexOf("OCTSCORE=")>=0) break; }
 console.log(tag+" "+t); await b.close(); return t;
}
(async()=>{
 const {server,port}=await startBenchServer(0);
 console.log("loadavg:", require('fs').readFileSync('/proc/loadavg','utf8').trim());
 for(let r=0;r<REPS;r++){
   await run(port,"?env.GECKO_WJVS_HASCALL=1","[hasCall]");
   await run(port,"?env.GECKO_WJVS_X=0","[default ]");
   await run(port,"?env.GECKO_NOWASMJIT=1","[off     ]");
 }
 server.close();process.exit(0);
})().catch(e=>{console.error("fatal",e.message);process.exit(1);});
