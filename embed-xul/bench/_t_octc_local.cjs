const {chromium}=require("playwright-core");
const {startBenchServer}=require("./bench-server.cjs");
const SUB = process.env.OCT || "navier-stokes";
const sleep=(ms)=>new Promise(r=>setTimeout(r,ms));
const CRASH=/abort|RuntimeError|out of bounds|unreachable|memory access|trap|table index|null function|segmentation|Aborted|wasm/i;
async function run(port, off, tag){
 const b=await chromium.launch({headless:true,executablePath:"/usr/bin/chromium",args:["--no-sandbox","--disable-dev-shm-usage"]});
 const p=await b.newPage();
 const grab=(src)=>(m)=>{const t=(m&&m.text&&m.text())||String(m); if(CRASH.test(t)) console.log(tag+" "+src+": "+t.slice(0,160));};
 p.on('console',grab('con')); p.on('pageerror',e=>console.log(tag+" PAGEERR: "+String(e).slice(0,160)));
 p.on('crash',()=>console.log(tag+" *** PAGE CRASH ***"));
 p.on('worker',w=>{ w.on('console',grab('wrk')); });
 const qs=off?"?env.GECKO_NOWASMJIT=1":"";
 await p.goto("http://127.0.0.1:"+port+"/index.html"+qs,{waitUntil:"load",timeout:120000});
 await p.waitForFunction(()=>window.__geckoReady===true,{timeout:150000});
 await p.evaluate((u)=>window.geckoRender(u),"http://127.0.0.1:"+port+"/bench/octane.html?b="+SUB);
 let t="",prev="";
 for(let i=0;i<150;i++){ await sleep(2000);
   try{ t=(await p.evaluate(()=>window.geckoEval("document.title")))||""; }catch(e){ t="(evalthrow:"+e.message.slice(0,40)+")"; }
   if(t!==prev){ console.log(tag+" ["+(i*2)+"s] "+t); prev=t; }
   if(t.indexOf("OCTSCORE=")>=0||t.indexOf("ERR=")>=0||t.indexOf("evalthrow")>=0) break;
 }
 await b.close(); return t;
}
(async()=>{
 const {server,port}=await startBenchServer(0);
 console.log("Octane subset:", SUB);
 await run(port,false,"ON");
 await run(port,true,"OFF");
 server.close();process.exit(0);
})().catch(e=>{console.error("fatal",e.message);process.exit(1);});
