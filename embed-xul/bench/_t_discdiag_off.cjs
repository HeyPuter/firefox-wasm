const {chromium}=require("/home/velzie/src/puter/node_modules/playwright");
const {startBenchServer}=require("./bench-server.cjs");
const sleep=(ms)=>new Promise(r=>setTimeout(r,ms));
(async()=>{
 const {server,port}=await startBenchServer(0);
 const b=await chromium.launch({headless:true,args:["--no-sandbox","--disable-dev-shm-usage"]});
 const p=await b.newPage();
 await p.goto("http://127.0.0.1:"+port+"/index.html?mirror=1&env.GECKO_NOWASMJIT=1",{waitUntil:"load",timeout:120000});
 await p.waitForFunction(()=>window.__geckoReady===true,{timeout:150000});
 const t0=Date.now();
 await p.evaluate((u)=>window.geckoRender(u),"https://discord.com/login");
 console.log("geckoRender returned @"+(Date.now()-t0)+"ms");
 for (let i=1;i<=6;i++){
   await sleep(5000);
   const s=await p.evaluate(()=>{try{return window.geckoEval(
     "JSON.stringify({rs:document.readyState,url:location.href,title:document.title,inputs:document.querySelectorAll('input').length,forms:document.querySelectorAll('form').length,btns:document.querySelectorAll('button').length,txt:(document.body?document.body.innerText:'').replace(/\\s+/g,' ').slice(0,120)})"
   );}catch(e){return '{\"err\":\"'+e+'\"}';}});
   console.log("@"+(Date.now()-t0)+"ms "+s);
 }
 await b.close();server.close();process.exit(0);
})().catch(e=>{console.error("fatal",e.message);process.exit(1);});
