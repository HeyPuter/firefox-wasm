const {chromium}=require("/home/velzie/src/puter/node_modules/playwright");
const {startBenchServer}=require("./bench-server.cjs");
const sleep=(ms)=>new Promise(r=>setTimeout(r,ms));
(async()=>{
 const {server,port}=await startBenchServer(0);
 const b=await chromium.launch({headless:true,args:["--no-sandbox","--disable-dev-shm-usage"]});
 const p=await b.newPage();
 const grab=(m)=>{ const t=(m.text&&m.text())||String(m); if(/wasm-host|compile|instantiate|abort|trap|RuntimeError|out of bounds|unreachable/i.test(t)) console.log("C:",t.slice(0,200)); };
 p.on('console', grab);
 p.on('pageerror', e=>console.log("PAGEERR:",String(e).slice(0,200)));
 p.on('crash', ()=>console.log("PAGE CRASHED"));
 p.on('worker', w=>w.on('console',grab));
 await p.goto("http://127.0.0.1:"+port+"/index.html?mirror=1",{waitUntil:"load",timeout:120000});
 await p.waitForFunction(()=>window.__geckoReady===true,{timeout:150000});
 await p.evaluate((u)=>window.geckoRender(u),"http://127.0.0.1:"+port+"/bench/jittest.html");
 let title="";
 for(let i=0;i<100;i++){ await sleep(500);
   try{ title=(await p.evaluate(()=>window.geckoEval("document.title")))||""; }catch(e){ console.log("EVALERR:",e.message.slice(0,80)); }
   if(title.indexOf("propms=")>=0||title.indexOf("BAD")>=0) break;
 }
 console.log("TITLE:", title);
 await b.close(); server.close(); process.exit(0);
})().catch(e=>{console.error("fatal",e.message);process.exit(1);});
