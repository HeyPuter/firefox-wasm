const {chromium}=require("/home/velzie/src/puter/node_modules/playwright");
const {startBenchServer}=require("./bench-server.cjs");
const sleep=(ms)=>new Promise(r=>setTimeout(r,ms));
const L=(...a)=>console.log(...a);
const URL=process.env.SITE||"https://en.wikipedia.org/wiki/WebAssembly";
(async()=>{
 const {server,port}=await startBenchServer(0);
 const b=await chromium.launch({headless:true,args:["--no-sandbox","--disable-dev-shm-usage"]});
 const p=await b.newPage();
 await p.goto("http://127.0.0.1:"+port+"/index.html?mirror=1",{waitUntil:"load",timeout:120000});
 await p.waitForFunction(()=>window.__geckoReady===true,{timeout:150000});
 await p.evaluate((u)=>window.geckoRender(u),URL);
 await sleep(6000);
 // time each op individually, median of 5
 const timeOp=async(op,arg)=>{
   const samples=[];
   for(let i=0;i<5;i++){
     const t=await p.evaluate(async({op,arg})=>{
       const t0=performance.now();
       const r=await window.geckoInput(arg?{op,url:arg}:{op});
       return [performance.now()-t0, (r||"").length];
     },{op,arg});
     samples.push(t);
   }
   samples.sort((a,b)=>a[0]-b[0]);
   const med=samples[2];
   return {ms:+med[0].toFixed(1), bytes:med[1]};
 };
 // op5 needs the serialize script
 const SER = await p.evaluate(()=>typeof MIRROR_SERIALIZE!=='undefined'?MIRROR_SERIALIZE:null);
 L("op5 serialize :", JSON.stringify(await timeOp(5, SER||"document.documentElement.outerHTML")));
 L("op6 images    :", JSON.stringify(await timeOp(6)));
 L("op7 css       :", JSON.stringify(await timeOp(7)));
 L("op8 canvas    :", JSON.stringify(await timeOp(8)));
 await b.close();server.close();process.exit(0);
})().catch(e=>{console.error("fatal",e.message);process.exit(1);});
