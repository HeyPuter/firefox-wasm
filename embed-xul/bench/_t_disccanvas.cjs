const {chromium}=require("/home/velzie/src/puter/node_modules/playwright");
const {startBenchServer}=require("./bench-server.cjs");
const sleep=(ms)=>new Promise(r=>setTimeout(r,ms));
const PROBE="(function(){try{return (document.querySelector('input[name=email],input[type=email],input[name=password]')?1:0)||(/Email or Phone|Welcome back/i.test(document.body?document.body.innerText:'')?1:0);}catch(e){return 0;}})()";
async function run(port, off){
 const b=await chromium.launch({headless:true,args:["--no-sandbox","--disable-dev-shm-usage"]});
 const p=await b.newPage();
 // CANVAS mode (no ?mirror) -> software paint, no DOM-mirror serialization tax
 const qs = off?"?env.GECKO_NOWASMJIT=1":"";
 await p.goto("http://127.0.0.1:"+port+"/index.html"+qs,{waitUntil:"load",timeout:120000});
 await p.waitForFunction(()=>window.__geckoReady===true,{timeout:150000});
 const t0=Date.now();
 await p.evaluate((u)=>window.geckoRender(u),"https://discord.com/login");
 let ms=-1;
 for(let i=0;i<120;i++){ await sleep(500);
   const f=+(await p.evaluate((s)=>{try{return window.geckoEval(s);}catch(e){return "0";}},PROBE)||0);
   if(f){ ms=Date.now()-t0; break; }
 }
 await b.close(); return ms;
}
(async()=>{
 const {server,port}=await startBenchServer(0);
 console.log("discord.com/login time-to-login-box (CANVAS mode):");
 const on=await run(port,false); console.log("  JIT ON : "+(on<0?"NOT FOUND(60s)":on+"ms"));
 const off=await run(port,true); console.log("  JIT OFF: "+(off<0?"NOT FOUND(60s)":off+"ms"));
 server.close();process.exit(0);
})().catch(e=>{console.error("fatal",e.message);process.exit(1);});
