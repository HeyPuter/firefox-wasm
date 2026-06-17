const {chromium}=require("/home/velzie/src/puter/node_modules/playwright");
const {startBenchServer}=require("./bench-server.cjs");
const SUB = process.env.OCT || "richards";
const sleep=(ms)=>new Promise(r=>setTimeout(r,ms));
(async()=>{
 const {server,port}=await startBenchServer(0);
 const b=await chromium.launch({headless:true,args:["--no-sandbox","--disable-dev-shm-usage"]});
 const p=await b.newPage();
 const seen={}; let n=0;
 const grab=(m)=>{ const t=(m&&m.text&&m.text())||String(m);
   if(/compile failed|WebAssembly|RuntimeError|instantiate|abort|trap|unreachable|type mismatch|validat/i.test(t)){
     const key=t.slice(0,90); if(!seen[key]&&n<25){seen[key]=1;n++;console.log("ERR:",t.slice(0,200));}
   }};
 p.on('console',grab); p.on('pageerror',e=>grab(String(e))); p.on('crash',()=>console.log("*** PAGE CRASH ***"));
 p.on('worker',w=>w.on('console',grab));
 await p.goto("http://127.0.0.1:"+port+"/index.html?mirror=1",{waitUntil:"load",timeout:120000});
 await p.waitForFunction(()=>window.__geckoReady===true,{timeout:150000});
 await p.evaluate((u)=>window.geckoRender(u),"http://127.0.0.1:"+port+"/bench/octane.html?b="+SUB);
 for(let i=0;i<40;i++){ await sleep(1000); let t=""; try{t=(await p.evaluate(()=>window.geckoEval("document.title")))||"";}catch(e){} if(t.indexOf("OCTSCORE=")>=0||t.indexOf("ERR=")>=0){console.log("TITLE:",t);break;} }
 console.log("distinct error lines:", n);
 await b.close(); server.close(); process.exit(0);
})().catch(e=>{console.error("fatal",e.message);process.exit(1);});
