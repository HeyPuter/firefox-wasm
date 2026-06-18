const {chromium}=require("playwright-core");
const {startBenchServer}=require("./bench-server.cjs");
const SUB=process.env.OCT||"deltablue"; const N=parseInt(process.env.N||"6",10);
const sleep=(ms)=>new Promise(r=>setTimeout(r,ms));
async function one(port,off){
 const b=await chromium.launch({headless:true,executablePath:"/usr/bin/chromium",args:["--no-sandbox","--disable-dev-shm-usage"]});
 const p=await b.newPage();
 try{
  await p.goto("http://127.0.0.1:"+port+"/index.html"+(off?"?env.GECKO_NOWASMJIT=1":"?x=0"),{waitUntil:"load",timeout:60000});
  await p.waitForFunction(()=>window.__geckoReady===true,{timeout:60000});
  await p.evaluate((u)=>window.geckoRender(u),"http://127.0.0.1:"+port+"/bench/octane.html?b="+SUB);
  let t="";for(let i=0;i<30;i++){await sleep(1000);try{t=(await p.evaluate(()=>window.geckoEval("document.title")))||"";}catch(e){}if(t.indexOf("OCTSCORE=")>=0)break;}
  const m=/DeltaBlue=(\d+)/.exec(t)||/OCTSCORE=(\d+)/.exec(t); return m?parseInt(m[1]):0;
 } finally { await b.close().catch(()=>{}); }
}
(async()=>{
 const {server,port}=await startBenchServer(0);
 const med=a=>{const s=[...a].sort((x,y)=>x-y);return s[Math.floor(s.length/2)];};
 const on=[],off=[];
 for(let i=0;i<N;i++){ const o=await one(port,false); on.push(o); const f=await one(port,true); off.push(f);
   console.log("pair"+i+" on="+o+" off="+f); }
 console.log("ON med="+med(on)+" ["+on.join(",")+"]");
 console.log("OFF med="+med(off)+" ["+off.join(",")+"]");
 console.log("RATIO="+(med(on)/med(off)).toFixed(2)+" load="+require('fs').readFileSync('/proc/loadavg','utf8').trim());
 server.close();process.exit(0);
})().catch(e=>{console.error("fatal",e.message);process.exit(1);});
