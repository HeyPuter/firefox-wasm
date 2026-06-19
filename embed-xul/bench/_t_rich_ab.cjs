// Reliable richards A/B: fresh browser per run, kill between, min+median of N.
const {chromium}=require("playwright-core");
const {startBenchServer}=require("./bench-server.cjs");
const sleep=(ms)=>new Promise(r=>setTimeout(r,ms));
const BENCH=process.env.BENCH||"richards";
const N=parseInt(process.env.N||"5",10);
async function once(port, off){
 const b=await chromium.launch({headless:true,executablePath:"/usr/bin/chromium",args:["--no-sandbox","--disable-dev-shm-usage"]});
 try{
  const p=await b.newPage();
  let crash=false; p.on('crash',()=>crash=true);
  const extra=process.env.EXTRA||"";  // extra env knobs for the ON arm, e.g. "env.GECKO_WJVS_INLINE=1&"
  const qs=off?"?env.GECKO_NOWASMJIT=1":("?"+extra);
  await p.goto("http://127.0.0.1:"+port+"/index.html"+qs,{waitUntil:"load",timeout:120000});
  await p.waitForFunction(()=>window.__geckoReady===true,{timeout:150000});
  await p.evaluate((u)=>window.geckoRender(u),"http://127.0.0.1:"+port+"/bench/octane.html?b="+BENCH);
  let t="";
  for(let i=0;i<120;i++){ await sleep(1000);
    try{ t=(await p.evaluate(()=>window.geckoEval("document.title")))||""; }catch(e){}
    if(t.indexOf("OCTSCORE=")>=0||t.indexOf("ERR=")>=0) break;
    if(crash) return {score:-1,err:"crash"};
  }
  const m=t.match(/OCTSCORE=(\d+)/); const e=t.match(/ERR=([^ ]+)/);
  return {score:m?parseInt(m[1],10):-1, err:e?e[1]:null};
 } finally { await b.close(); }
}
function stats(a){a=a.filter(x=>x>0).sort((x,y)=>x-y); if(!a.length)return{min:-1,med:-1,max:-1};
 return {min:a[0],med:a[Math.floor(a.length/2)],max:a[a.length-1],n:a.length};}
(async()=>{
 const {server,port}=await startBenchServer(0);
 const on=[],off=[];
 for(let i=0;i<N;i++){
   const r=await once(port,false); on.push(r.score); console.log("ON  run"+i+" = "+r.score+(r.err?(" ERR="+r.err):""));
 }
 for(let i=0;i<N;i++){
   const r=await once(port,true); off.push(r.score); console.log("OFF run"+i+" = "+r.score+(r.err?(" ERR="+r.err):""));
 }
 const so=stats(on), sf=stats(off);
 console.log("\n"+BENCH+"  ON  min="+so.min+" med="+so.med+" max="+so.max);
 console.log(BENCH+"  OFF min="+sf.min+" med="+sf.med+" max="+sf.max);
 console.log(BENCH+"  ratio(min on/min off)="+(so.min/sf.min).toFixed(3)+"  ratio(med)="+(so.med/sf.med).toFixed(3));
 server.close();process.exit(0);
})().catch(e=>{console.error("fatal",e.message);process.exit(1);});
