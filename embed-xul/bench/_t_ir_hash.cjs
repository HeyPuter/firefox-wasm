// Phase A bit-for-bit parity proof: run a bench with GECKO_WJ_HASH=1, capture the per-
// function emitted-module hashes, with IR off and IR on. If the IR layer is byte-identical
// (parity by construction), the two hash sets are identical for every compiled function.
const {chromium}=require("playwright-core");
const {startBenchServer}=require("./bench-server.cjs");
const sleep=(ms)=>new Promise(r=>setTimeout(r,ms));
const BENCH=process.env.BENCH||"richards";
async function run(port, irOn){
 const b=await chromium.launch({headless:true,executablePath:"/usr/bin/chromium",args:["--no-sandbox","--disable-dev-shm-usage"]});
 const hashes=new Map();  // "file:line modeVS" -> "len h"
 try{
  const p=await b.newPage();
  p.on('console',m=>{const t=m.text(); const i=t.indexOf("[wj-hash]"); if(i>=0){
    const mm=t.slice(i).match(/\[wj-hash\] (\S+) modeVS=(\d) len=(\d+) h=([0-9a-f]+)/);
    if(mm) hashes.set(mm[1]+" modeVS="+mm[2], "len="+mm[3]+" h="+mm[4]);
  }});
  const knobs=["env.GECKO_WJ_HASH=1"]; if(irOn) knobs.push("env.GECKO_WJVS_IR=1");
  const qs="?"+knobs.map(k=>k+"&").join("");
  await p.goto("http://127.0.0.1:"+port+"/index.html"+qs,{waitUntil:"load",timeout:120000});
  await p.waitForFunction(()=>window.__geckoReady===true,{timeout:150000});
  await p.evaluate((u)=>window.geckoRender(u),"http://127.0.0.1:"+port+"/bench/octane.html?b="+BENCH);
  let t="";
  for(let i=0;i<120;i++){ await sleep(1000);
    try{ t=(await p.evaluate(()=>window.geckoEval("document.title")))||""; }catch(e){}
    if(t.indexOf("OCTSCORE=")>=0||t.indexOf("ERR=")>=0) break;
  }
  return hashes;
 } finally { await b.close(); }
}
(async()=>{
 const {server,port}=await startBenchServer(0);
 const arms=(process.env.ARMS||"off,on").split(",");
 const off=await run(port,arms[0]==="on");
 const on=await run(port,arms[1]==="on");
 const keys=new Set([...off.keys(),...on.keys()]);
 let nVS=0, mismatch=0, onlyOff=0, onlyOn=0;
 const diffs=[];
 for(const k of [...keys].sort()){
   const a=off.get(k), b=on.get(k);
   if(k.endsWith("modeVS=1")) nVS++;
   if(a&&!b){ onlyOff++; diffs.push("ONLY-OFF "+k+"  "+a); }
   else if(b&&!a){ onlyOn++; diffs.push("ONLY-ON  "+k+"  "+b); }
   else if(a!==b){ mismatch++; diffs.push("MISMATCH "+k+"  off["+a+"] on["+b+"]"); }
 }
 console.log(BENCH+": functions="+keys.size+" (modeVS="+nVS+")  mismatch="+mismatch+" onlyOff="+onlyOff+" onlyOn="+onlyOn);
 if(diffs.length){ console.log("--- differences ---"); for(const d of diffs.slice(0,40)) console.log(d); }
 else console.log("BIT-FOR-BIT IDENTICAL across all compiled functions.");
 await server.close(); process.exit(0);
})();
