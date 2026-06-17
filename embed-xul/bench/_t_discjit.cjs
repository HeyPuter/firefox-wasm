const {chromium}=require("/home/velzie/src/puter/node_modules/playwright");
const {startBenchServer}=require("./bench-server.cjs");
const sleep=(ms)=>new Promise(r=>setTimeout(r,ms));
const PROBE="(function(){try{var d=document;var n=d.querySelector('input[name=email],input[type=email],input[name=password]');if(n)return 'box';var t=d.body?d.body.innerText:'';if(/Welcome back|Log ?In|Email or Phone Number/i.test(t))return 'text';return d.readyState;}catch(e){return 'err:'+e.message;}})()";
async function run(port, off){
 const b=await chromium.launch({headless:true,args:["--no-sandbox","--disable-dev-shm-usage"]});
 const p=await b.newPage();
 const errs=[]; p.on('pageerror',e=>{}); // host page errors ignored
 const qs = off?"?env.GECKO_NOWASMJIT=1":"";
 await p.goto("http://127.0.0.1:"+port+"/index.html"+qs,{waitUntil:"load",timeout:120000});
 await p.waitForFunction(()=>window.__geckoReady===true,{timeout:150000});
 const t0=Date.now();
 const interactive = await p.evaluate(async(u)=>{const t=performance.now();await window.geckoRender(u);return Math.round(performance.now()-t);},"https://discord.com/login");
 let boxMs=-1, last="";
 for(let i=0;i<180;i++){ await sleep(500);
   try{ last=(await p.evaluate((s)=>window.geckoEval(s),PROBE))||""; }catch(e){ last="evalthrow"; }
   if(last==='box'||last==='text'){ boxMs=Date.now()-t0; break; }
 }
 await b.close();
 return {interactive, boxMs, last};
}
(async()=>{
 const {server,port}=await startBenchServer(0);
 const on=await run(port,false);
 console.log("DISCORD JIT ON : interactive="+on.interactive+"ms  loginbox="+(on.boxMs<0?("NONE/90s last="+on.last):on.boxMs+"ms"));
 const off=await run(port,true);
 console.log("DISCORD JIT OFF: interactive="+off.interactive+"ms  loginbox="+(off.boxMs<0?("NONE/90s last="+off.last):off.boxMs+"ms"));
 server.close();process.exit(0);
})().catch(e=>{console.error("fatal",e.message);process.exit(1);});
