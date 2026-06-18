// 3-way octane runner: JIT-on/locals, JIT-on/frame, JIT-off. Reps via REPS env.
const {chromium}=require("playwright-core");
const {startBenchServer}=require("./bench-server.cjs");
const SUB = process.env.OCT || "richards,deltablue";
const REPS = parseInt(process.env.REPS||"1",10);
const sleep=(ms)=>new Promise(r=>setTimeout(r,ms));
async function run(port, mode, tag){
 const b=await chromium.launch({headless:true,executablePath:"/usr/bin/chromium",args:["--no-sandbox","--disable-dev-shm-usage"]});
 const p=await b.newPage();
 p.on('crash',()=>console.log(tag+" *** PAGE CRASH ***"));
 p.on('pageerror',e=>console.log(tag+" PAGEERR "+String(e).slice(0,120)));
 let qs;
 if(mode==="off") qs="?env.GECKO_NOWASMJIT=1";
 else if(mode==="frame") qs="?env.GECKO_WJVS_FRAME=1";
 else qs="?env.GECKO_WJVS_X=0"; // locals = default; harmless param to keep URL shape
 await p.goto("http://127.0.0.1:"+port+"/index.html"+qs,{waitUntil:"load",timeout:120000});
 await p.waitForFunction(()=>window.__geckoReady===true,{timeout:150000});
 await p.evaluate((u)=>window.geckoRender(u),"http://127.0.0.1:"+port+"/bench/octane.html?b="+SUB);
 let t="",prev="";
 for(let i=0;i<150;i++){ await sleep(2000);
   try{ t=(await p.evaluate(()=>window.geckoEval("document.title")))||""; }catch(e){ t="(evalthrow)"; }
   if(t!==prev){ prev=t; }
   if(t.indexOf("OCTSCORE=")>=0||t.indexOf("ERR=")>=0||t.indexOf("evalthrow")>=0) break;
 }
 console.log(tag+" "+t);
 await b.close(); return t;
}
(async()=>{
 const {server,port}=await startBenchServer(0);
 console.log("Octane:", SUB, "reps:", REPS, "loadavg:", require('fs').readFileSync('/proc/loadavg','utf8').trim());
 for(let r=0;r<REPS;r++){
   await run(port,"locals","[locals]");
   await run(port,"frame ","[frame ]");
   await run(port,"off   ","[off   ]");
 }
 server.close();process.exit(0);
})().catch(e=>{console.error("fatal",e.message);process.exit(1);});
