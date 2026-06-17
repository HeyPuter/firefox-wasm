const {chromium}=require("/home/velzie/src/puter/node_modules/playwright");
const {startBenchServer}=require("./bench-server.cjs");
const sleep=(ms)=>new Promise(r=>setTimeout(r,ms));
(async()=>{
 const {server,port}=await startBenchServer(0);
 const b=await chromium.launch({headless:true,args:["--no-sandbox","--disable-dev-shm-usage"]});
 const p=await b.newPage();
 const seen={};
 var grab=m=>{const t=(m.text&&m.text())||'';if(/wjdbg/.test(t)){if(!seen[t]){seen[t]=1;console.log(t.slice(0,140));}}};p.on('console',grab);p.on('worker',w=>w.on('console',grab));
 await p.goto("http://127.0.0.1:"+port+"/index.html?mirror=1&env.WJDBG=1",{waitUntil:"load",timeout:120000});
 await p.waitForFunction(()=>window.__geckoReady===true,{timeout:150000});
 await p.evaluate((u)=>window.geckoRender(u),"http://127.0.0.1:"+port+"/bench/jimeth.html");
 let t="";
 for(let i=0;i<60;i++){ await sleep(500); try{t=(await p.evaluate(()=>window.geckoEval("document.title")))||"";}catch(e){} if(t.indexOf("methms=")>=0)break; }
 console.log("TITLE:", t);
 await b.close(); server.close(); process.exit(0);
})().catch(e=>{console.error("fatal",e.message);process.exit(1);});
