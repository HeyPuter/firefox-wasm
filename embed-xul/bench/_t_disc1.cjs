const {chromium}=require("/home/velzie/src/puter/node_modules/playwright");
const {startBenchServer}=require("./bench-server.cjs");
const sleep=(ms)=>new Promise(r=>setTimeout(r,ms));
const OFF=process.env.OFF==="1";
(async()=>{
 const {server,port}=await startBenchServer(0);
 const b=await chromium.launch({headless:true,args:["--no-sandbox","--disable-dev-shm-usage"]});
 const p=await b.newPage();
 await p.goto("http://127.0.0.1:"+port+"/index.html"+(OFF?"?env.GECKO_NOWASMJIT=1":""),{waitUntil:"load",timeout:120000});
 await p.waitForFunction(()=>window.__geckoReady===true,{timeout:150000});
 const t0=Date.now();
 // bounded: geckoRender resolves at INTERACTIVE; cap at 90s so it can't hang.
 const rendered = await p.evaluate(async(u)=>{
   const r = window.geckoRender(u);
   const to = new Promise(res=>setTimeout(()=>res("TIMEOUT"),90000));
   const v = await Promise.race([r.then(()=>"ok"), to]);
   return v;
 },"https://discord.com/login");
 const renderMs = Date.now()-t0;
 console.log("JIT "+(OFF?"OFF":"ON")+": geckoRender("+rendered+") @ "+renderMs+"ms");
 await sleep(6000);  // let a few software-paint frames land
 await p.screenshot({path:"/tmp/discord_"+(OFF?"off":"on")+".png"});
 console.log("  screenshot -> /tmp/discord_"+(OFF?"off":"on")+".png");
 await b.close();server.close();process.exit(0);
})().catch(e=>{console.error("fatal",e.message);process.exit(1);});
