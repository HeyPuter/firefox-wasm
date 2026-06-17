const {chromium}=require("/home/velzie/src/puter/node_modules/playwright");
const {startBenchServer}=require("./bench-server.cjs");
const sleep=(ms)=>new Promise(r=>setTimeout(r,ms));
async function run(port, off){
 const b=await chromium.launch({headless:true,args:["--no-sandbox","--disable-dev-shm-usage"]});
 const p=await b.newPage();
 const errs=[]; p.on('console',m=>{const t=(m.text&&m.text())||'';if(/compile failed|RuntimeError|out of bounds|unreachable|trap|abort|WebAssembly/i.test(t))errs.push(t.slice(0,150));});
 const qs="mirror=1"+(off?"&env.GECKO_NOWASMJIT=1":"");
 await p.goto("http://127.0.0.1:"+port+"/index.html?"+qs,{waitUntil:"load",timeout:120000});
 await p.waitForFunction(()=>window.__geckoReady===true,{timeout:150000});
 await p.evaluate((u)=>window.geckoRender(u),"http://127.0.0.1:"+port+"/bench/jisetp.html");
 let title="";
 for(let i=0;i<160;i++){ await sleep(500); try{title=(await p.evaluate(()=>window.geckoEval("document.title")))||"";}catch(e){} if(title.indexOf("bumpms=")>=0)break; }
 await b.close(); return title+(errs.length?(" |ERR "+errs[0]):"");
}
(async()=>{
 const {server,port}=await startBenchServer(0);
 console.log("SETP JIT ON :", await run(port,false));
 console.log("SETP JIT OFF:", await run(port,true));
 server.close();process.exit(0);
})().catch(e=>{console.error("fatal",e.message);process.exit(1);});
