// 3-arm A/B (inline / plain-JIT / off), one browser reused, progress -> stderr (no pipe).
const {chromium}=require("playwright-core");
const {startBenchServer}=require("./bench-server.cjs");
const SUB=process.env.OCT||"deltablue"; const N=parseInt(process.env.N||"4",10);
const RE=new RegExp("(?:"+SUB.replace(/[^a-z]/gi,"")+"|OCTSCORE)=(\\d+)","i");
const sleep=(ms)=>new Promise(r=>setTimeout(r,ms));
async function one(port,qs){
 const b=await chromium.launch({headless:true,executablePath:"/usr/bin/chromium",args:["--no-sandbox","--disable-dev-shm-usage"]});
 const p=await b.newPage();
 let crashed=false; p.on("crash",()=>{crashed=true;});
 p.on("pageerror",e=>{if(/out of bounds|RuntimeError/i.test(String(e)))console.error("  PAGEERR",String(e).slice(0,90));});
 try{
  await p.goto("http://127.0.0.1:"+port+"/index.html"+qs,{waitUntil:"load",timeout:60000});
  await p.waitForFunction(()=>window.__geckoReady===true,{timeout:60000});
  await p.evaluate((u)=>window.geckoRender(u),"http://127.0.0.1:"+port+"/bench/octane.html?b="+SUB);
  for(let i=0;i<40 && !crashed;i++){await sleep(1000);let t="";try{t=(await p.evaluate(()=>window.geckoEval("document.title")))||"";}catch(e){}
    const m=RE.exec(t); if(m)return parseInt(m[1]);}
  if(crashed)console.error("  *** CRASH ***");
  return 0;
 } catch(e){ console.error("  ERR",e.message.slice(0,60)); return 0; }
 finally { await p.close().catch(()=>{}); await b.close().catch(()=>{}); }
}
(async()=>{
 const {server,port}=await startBenchServer(0);
 const med=a=>{const s=[...a].sort((x,y)=>x-y);return s[Math.floor(s.length/2)];};
 const arms={inline:"?env.GECKO_WJVS_INLINE=1", inlineNoCF:"?env.GECKO_WJVS_INLINE=1&env.GECKO_WJVS_NOCF=1", jit:"?x=0", mono:"?x=0&env.GECKO_WJVS_NOPOLYCALL=1", monoprop:"?x=0&env.GECKO_WJVS_NOPOLYPROP=1", nolen:"?x=0&env.GECKO_WJVS_NOLEN=1", unbox:"?x=0&env.GECKO_WJVS_UNBOX=1", tloc:"?x=0&env.GECKO_WJVS_UNBOX=1&env.GECKO_WJVS_TYPEDLOC=1", off:"?env.GECKO_NOWASMJIT=1"};
 const which=(process.env.ARMS||"inline,inlineNoCF,jit,off").split(",");
 const res={}; which.forEach(k=>res[k]=[]);
 for(let i=0;i<N;i++){ let line="iter"+i;
   for(const k of which){ const v=await one(port,arms[k]); res[k].push(v); line+=" "+k+"="+v; }
   console.error(line);
 }
 for(const k of which) console.error(k.padEnd(11)+" med="+med(res[k])+" ["+res[k].join(",")+"]");
 const base=res[which[which.length-1]]; const bm=med(base);
 for(const k of which) console.error(k.padEnd(11)+"/"+which[which.length-1]+"="+(med(res[k])/bm).toFixed(2));
 console.error("load="+require("fs").readFileSync("/proc/loadavg","utf8").trim());
 server.close(); process.exit(0);
})().catch(e=>{console.error("fatal",e.message);process.exit(1);});
