// Crash-vs-hang probe: load gecko, render one octane bench with a given env query,
// and log EVERY page crash / pageerror / error-console line with full text. Distinguishes
// a wasm trap (RuntimeError / out of bounds / "unreachable") from a benign hang.
const {chromium}=require("playwright-core");
const {startBenchServer}=require("./bench-server.cjs");
const SUB=process.env.OCT||"richards";
const QS=process.env.QS||"?x=0";  // e.g. ?x=0&env.GECKO_WJVS_UNBOX=1&env.GECKO_WJVS_TYPEDLOC=1
const sleep=(ms)=>new Promise(r=>setTimeout(r,ms));
(async()=>{
 const {server,port}=await startBenchServer(0);
 const b=await chromium.launch({headless:true,executablePath:"/usr/bin/chromium",args:["--no-sandbox","--disable-dev-shm-usage"]});
 const p=await b.newPage();
 let crashed=false;
 p.on("crash",()=>{crashed=true;console.log("EVENT page.crash");});
 p.on("pageerror",e=>console.log("EVENT pageerror:",String(e).slice(0,200)));
 p.on("console",m=>{const t=m.text();if(/error|RuntimeError|out of bounds|unreachable|abort|trap/i.test(t))console.log("CONSOLE["+m.type()+"]:",t.slice(0,200));});
 p.on("worker",w=>w.on("console",m=>{const t=m.text();if(/error|RuntimeError|out of bounds|unreachable|abort|trap/i.test(t))console.log("WCONSOLE["+m.type()+"]:",t.slice(0,200));}));
 try{
  console.log("goto index"+QS);
  await p.goto("http://127.0.0.1:"+port+"/index.html"+QS,{waitUntil:"load",timeout:60000});
  await p.waitForFunction(()=>window.__geckoReady===true,{timeout:60000});
  console.log("geckoReady; rendering "+SUB);
  await p.evaluate((u)=>window.geckoRender(u),"http://127.0.0.1:"+port+"/bench/octane.html?b="+SUB);
  for(let i=0;i<60 && !crashed;i++){
    await sleep(1000);
    let t="";try{t=(await p.evaluate(()=>window.geckoEval("document.title")))||"";}catch(e){console.log("evalfail@"+i+":",e.message.slice(0,80));}
    if(i%5===0||t.indexOf("OCTSCORE")>=0)console.log("t="+i+"s title="+JSON.stringify(t).slice(0,80));
    if(t.indexOf("OCTSCORE")>=0){console.log("RESULT "+t);break;}
  }
  if(crashed)console.log("FINAL: CRASHED");
  else console.log("FINAL: no-score-no-crash (hang or slow)");
 }catch(e){console.log("THROW:",e.message.slice(0,150));}
 finally{await p.close().catch(()=>{});await b.close().catch(()=>{});server.close();process.exit(0);}
})().catch(e=>{console.log("FATAL",e.message);process.exit(1);});
