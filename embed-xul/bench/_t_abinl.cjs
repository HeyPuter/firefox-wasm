// 3-arm A/B: inline (GECKO_WJVS_INLINE), plain JIT, JIT-off. Medians + ratios.
const {chromium}=require("playwright-core");
const {startBenchServer}=require("./bench-server.cjs");
const SUB=process.env.OCT||"deltablue"; const N=parseInt(process.env.N||"5",10);
const sleep=(ms)=>new Promise(r=>setTimeout(r,ms));
async function one(port,qs){
 const b=await chromium.launch({headless:true,executablePath:"/usr/bin/chromium",args:["--no-sandbox","--disable-dev-shm-usage"]});
 const p=await b.newPage();
 try{
  await p.goto("http://127.0.0.1:"+port+"/index.html"+qs,{waitUntil:"load",timeout:60000});
  await p.waitForFunction(()=>window.__geckoReady===true,{timeout:60000});
  await p.evaluate((u)=>window.geckoRender(u),"http://127.0.0.1:"+port+"/bench/octane.html?b="+SUB);
  let t="";for(let i=0;i<40;i++){await sleep(1000);try{t=(await p.evaluate(()=>window.geckoEval("document.title")))||"";}catch(e){}if(t.indexOf("OCTSCORE=")>=0)break;}
  const m=/DeltaBlue=(\d+)/.exec(t)||/Richards=(\d+)/.exec(t)||/OCTSCORE=(\d+)/.exec(t); return m?parseInt(m[1]):0;
 } finally { await b.close().catch(()=>{}); }
}
(async()=>{
 const {server,port}=await startBenchServer(0);
 const med=a=>{const s=[...a].sort((x,y)=>x-y);return s[Math.floor(s.length/2)];};
 const inl=[],jit=[],off=[];
 for(let i=0;i<N;i++){
   const a=await one(port,"?env.GECKO_WJVS_INLINE=1"); inl.push(a);
   const j=await one(port,"?x=0"); jit.push(j);
   const f=await one(port,"?env.GECKO_NOWASMJIT=1"); off.push(f);
   console.log("pair"+i+" inline="+a+" jit="+j+" off="+f);
 }
 console.log("INLINE med="+med(inl)+" ["+inl.join(",")+"]");
 console.log("JIT    med="+med(jit)+" ["+jit.join(",")+"]");
 console.log("OFF    med="+med(off)+" ["+off.join(",")+"]");
 console.log("inline/off="+(med(inl)/med(off)).toFixed(2)+"  inline/jit="+(med(inl)/med(jit)).toFixed(2)+"  jit/off="+(med(jit)/med(off)).toFixed(2)+" load="+require('fs').readFileSync('/proc/loadavg','utf8').trim());
 server.close();process.exit(0);
})().catch(e=>{console.error("fatal",e.message);process.exit(1);});
