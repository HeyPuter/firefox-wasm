// Run one octane bench under the default JIT + GECKO_DEBUG_JIT, collecting ALL
// [wasm-jit] diagnostic lines (heartbeat helper-histogram, ModeV/VS, inlining,
// deopts) for a fixed window. Does NOT stop on score -> captures heartbeats.
const {chromium}=require("playwright-core");
const {startBenchServer}=require("./bench-server.cjs");
const SUB=process.env.OCT||"richards";
const SECS=parseInt(process.env.SECS||"50",10);
const EXTRA=process.env.EXTRA||"";   // extra env query, e.g. &env.GECKO_WJVS_NOTYPEDLOC=1
const QS="?x=0&env.GECKO_DEBUG_JIT=1"+EXTRA;
const sleep=(ms)=>new Promise(r=>setTimeout(r,ms));
const out=[];
const grab=(t)=>{ if(/\[wasm-jit\]|\[wj-inline\]|\[wj-compile\]|\[wj-observe\]|\[wj-enter\]|typedloc|RuntimeError|unreachable|abort/i.test(t)) out.push(t.replace(/^\[err\]\s*/,"").slice(0,300)); };
(async()=>{
 const {server,port}=await startBenchServer(0);
 const b=await chromium.launch({headless:true,executablePath:"/usr/bin/chromium",args:["--no-sandbox","--disable-dev-shm-usage"]});
 const p=await b.newPage();
 p.on("console",m=>grab(m.text()));
 p.on("worker",w=>w.on("console",m=>grab(m.text())));
 try{
  await p.goto("http://127.0.0.1:"+port+"/index.html"+QS,{waitUntil:"load",timeout:60000});
  await p.waitForFunction(()=>window.__geckoReady===true,{timeout:60000});
  out.push("geckoReady; rendering "+SUB+" for "+SECS+"s");
  await p.evaluate((u)=>window.geckoRender(u),"http://127.0.0.1:"+port+"/bench/octane.html?b="+SUB);
  let score="";
  for(let i=0;i<SECS;i++){ await sleep(1000); try{const t=(await p.evaluate(()=>window.geckoEval("document.title")))||""; if(t.indexOf("OCTSCORE")>=0)score=t;}catch(e){} }
  out.push("SCORE: "+score);
 }catch(e){out.push("THROW: "+e.message.slice(0,150));}
 finally{ require("fs").writeFileSync("/tmp/jitdbg_"+SUB+".txt",out.join("\n")+"\n"); await p.close().catch(()=>{});await b.close().catch(()=>{});server.close();process.exit(0); }
})().catch(e=>{require("fs").writeFileSync("/tmp/jitdbg_"+SUB+".txt","FATAL "+e.message+"\n");process.exit(1);});
