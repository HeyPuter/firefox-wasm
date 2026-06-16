const {chromium}=require("/home/velzie/src/puter/node_modules/playwright");
const {startBenchServer}=require("./bench-server.cjs");
const sleep=(ms)=>new Promise(r=>setTimeout(r,ms));
// Detect discord's login box: an email/password input or the login form heading.
const PROBE = "(function(){try{return (document.querySelector('input[name=email],input[type=email],input[name=password],form input')?1:0) || (/Welcome back|Log ?In|Email or Phone/i.test(document.body?document.body.innerText:'')?1:0);}catch(e){return 0;}})()";
async function run(port, off){
 const b=await chromium.launch({headless:true,args:["--no-sandbox","--disable-dev-shm-usage"]});
 const p=await b.newPage();
 const qs="mirror=1"+(off?"&env.GECKO_NOWASMJIT=1":"");
 await p.goto("http://127.0.0.1:"+port+"/index.html?"+qs,{waitUntil:"load",timeout:120000});
 await p.waitForFunction(()=>window.__geckoReady===true,{timeout:150000});
 const t0=Date.now();
 await p.evaluate((u)=>window.geckoRender(u),"https://discord.com/login");
 let found=0, ms=-1;
 for(let i=0;i<120;i++){ await sleep(500);
   found = +(await p.evaluate((s)=>{try{return window.geckoEval(s);}catch(e){return "0";}}, PROBE)||0);
   if(found){ ms=Date.now()-t0; break; }
 }
 // also grab a snippet of body text for sanity
 const txt=(await p.evaluate(()=>{try{return window.geckoEval("(document.body?document.body.innerText:'').slice(0,80)");}catch(e){return "";}})||"").replace(/\n/g," ");
 await b.close();
 return {ms, txt};
}
(async()=>{
 const {server,port}=await startBenchServer(0);
 const on=await run(port,false), off=await run(port,true);
 console.log("discord.com/login time-to-login-box:");
 console.log("  JIT ON : "+(on.ms<0?"NOT FOUND":on.ms+"ms")+"  body=\""+on.txt+"\"");
 console.log("  JIT OFF: "+(off.ms<0?"NOT FOUND":off.ms+"ms")+"  body=\""+off.txt+"\"");
 server.close();process.exit(0);
})().catch(e=>{console.error("fatal",e.message);process.exit(1);});
