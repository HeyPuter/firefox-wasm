const {chromium}=require("/home/velzie/src/puter/node_modules/playwright");
const {startBenchServer}=require("./bench-server.cjs");
const sleep=(ms)=>new Promise(r=>setTimeout(r,ms));
(async()=>{
 const {server,port}=await startBenchServer(0);
 const b=await chromium.launch({headless:true,args:["--no-sandbox","--disable-dev-shm-usage"]});
 const p=await b.newPage();
 const seen={};
 const grab=(m)=>{ const t=(m.text&&m.text())||String(m); if(/wasm-host|compile failed|instantiate failed|WJ|jit/i.test(t)){ if(!seen[t]){seen[t]=1; console.log("CONSOLE:",t.slice(0,200));} } };
 p.on('console', grab);
 p.on('worker', w=>{ w.on('console', grab); });
 await p.goto("http://127.0.0.1:"+port+"/index.html?mirror=1",{waitUntil:"load",timeout:120000});
 await p.waitForFunction(()=>window.__geckoReady===true,{timeout:150000});
 await p.evaluate((u)=>window.geckoRender(u),"http://127.0.0.1:"+port+"/bench/jittest.html");
 let title="";
 for(let i=0;i<80;i++){ await sleep(500); title=(await p.evaluate(()=>{try{return window.geckoEval("document.title");}catch(e){return "";}}))||""; if(title.indexOf("sum=")>=0) break; }
 console.log("TITLE:", title);
 await b.close(); server.close(); process.exit(0);
})().catch(e=>{console.error("fatal",e.message);process.exit(1);});
