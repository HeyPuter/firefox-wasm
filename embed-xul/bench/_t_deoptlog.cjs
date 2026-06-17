const {chromium}=require("/home/velzie/src/puter/node_modules/playwright");
const {startBenchServer}=require("./bench-server.cjs");
const sleep=(ms)=>new Promise(r=>setTimeout(r,ms));
const SUB = process.env.OCT || "richards,deltablue,raytrace,navier-stokes";
(async()=>{
 const {server,port}=await startBenchServer(0);
 const b=await chromium.launch({headless:true,args:["--no-sandbox","--disable-dev-shm-usage"]});
 const p=await b.newPage();
 const hb=[];
 const grab=(m)=>{const t=(m&&m.text&&m.text())||String(m); if(t.indexOf('[wasm-jit]')>=0){hb.push(t.trim()); console.log("  "+t.trim());}};
 p.on('console',grab); p.on('worker',w=>w.on('console',grab));
 // GECKO_DEBUG_JIT enables the periodic deopt log inside the wasm engine.
 await p.goto("http://127.0.0.1:"+port+"/index.html?env.GECKO_DEBUG_JIT=1",{waitUntil:"load",timeout:120000});
 await p.waitForFunction(()=>window.__geckoReady===true,{timeout:150000});
 await p.evaluate((u)=>window.geckoRender(u),"http://127.0.0.1:"+port+"/bench/octane.html?b="+SUB);
 let t="",prev="";
 for(let i=0;i<60;i++){ await sleep(2000);
   try{ t=(await p.evaluate(()=>window.geckoEval("document.title")))||""; }catch(e){ t="(evalthrow:"+e.message.slice(0,40)+")"; }
   if(t!==prev){ console.log("  ["+(i*2)+"s] "+t.slice(0,90)); prev=t; }
   if(t.indexOf("OCTSCORE=")>=0||t.indexOf("ERR=")>=0||t.indexOf("evalthrow")>=0) break;
 }
 await b.close(); server.close();
 console.log("heartbeats="+hb.length);
 process.exit(0);
})().catch(e=>{console.error("fatal",e.message);process.exit(1);});
