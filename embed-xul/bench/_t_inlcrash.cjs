// Loop a benchmark N times under inline, report any wasm OOB / crash. Env: OCT, ITERS, QS.
const {chromium}=require("playwright-core");
const {startBenchServer}=require("./bench-server.cjs");
const sleep=(ms)=>new Promise(r=>setTimeout(r,ms));
const SUB=process.env.OCT||"deltablue"; const ITERS=parseInt(process.env.ITERS||"8",10);
const QS=process.env.QS||"env.GECKO_WJVS_INLINE=1";
(async()=>{
 const {server,port}=await startBenchServer(0);
 let oob=0, ok=0, crash=0;
 for(let i=0;i<ITERS;i++){
   const b=await chromium.launch({headless:true,executablePath:"/usr/bin/chromium",args:["--no-sandbox","--disable-dev-shm-usage"]});
   const p=await b.newPage(); let c=false;
   p.on("crash",()=>{c=true;});
   p.on("pageerror",e=>{const s=String(e); if(/out of bounds|unreachable|RuntimeError/i.test(s)){oob++; console.error("iter"+i+" OOB "+s.slice(0,90));}});
   try{
     await p.goto("http://127.0.0.1:"+port+"/index.html?"+QS,{waitUntil:"load",timeout:60000});
     await p.waitForFunction(()=>window.__geckoReady===true,{timeout:60000});
     await p.evaluate((u)=>window.geckoRender(u),"http://127.0.0.1:"+port+"/bench/octane.html?b="+SUB);
     let t="";for(let j=0;j<30 && !c;j++){await sleep(1000);try{t=(await p.evaluate(()=>window.geckoEval("document.title")))||"";}catch(e){c=true;}if(t.indexOf("OCTSCORE=")>=0)break;}
     if(c){crash++;console.error("iter"+i+" CRASH");}
     else if(t.indexOf("OCTSCORE=")>=0){ok++;console.error("iter"+i+" "+t.slice(0,40));}
     else console.error("iter"+i+" timeout t="+t.slice(0,40));
   }catch(e){crash++;console.error("iter"+i+" ERR "+e.message.slice(0,60));}
   await p.close().catch(()=>{}); await b.close().catch(()=>{});
 }
 console.error("RESULT ok="+ok+" oob="+oob+" crash="+crash+" of "+ITERS);
 server.close(); process.exit(0);
})().catch(e=>{console.error("fatal",e.message);process.exit(1);});
