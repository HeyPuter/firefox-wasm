// Dump GECKO_DEBUG_JIT typedloc lines + any crash, for one octane bench under tloc.
const {chromium}=require("playwright-core");
const {startBenchServer}=require("./bench-server.cjs");
const SUB=process.env.OCT||"richards";
const QS=process.env.QS||"?x=0&env.GECKO_WJVS_UNBOX=1&env.GECKO_WJVS_TYPEDLOC=1&env.GECKO_DEBUG_JIT=1";
const sleep=(ms)=>new Promise(r=>setTimeout(r,ms));
const out=[];
const grab=(src,t)=>{ if(/typedloc|wasm-jit|RuntimeError|out of bounds|unreachable|abort|trap|Aborted/i.test(t)) out.push(src+": "+t.slice(0,240)); };
(async()=>{
 const {server,port}=await startBenchServer(0);
 const b=await chromium.launch({headless:true,executablePath:"/usr/bin/chromium",args:["--no-sandbox","--disable-dev-shm-usage"]});
 const p=await b.newPage();
 let crashed=false;
 p.on("crash",()=>{crashed=true;out.push("EVENT page.crash");});
 p.on("pageerror",e=>out.push("pageerror: "+String(e).slice(0,240)));
 p.on("console",m=>grab("C["+m.type()+"]",m.text()));
 p.on("worker",w=>w.on("console",m=>grab("W["+m.type()+"]",m.text())));
 try{
  await p.goto("http://127.0.0.1:"+port+"/index.html"+QS,{waitUntil:"load",timeout:60000});
  await p.waitForFunction(()=>window.__geckoReady===true,{timeout:60000});
  out.push("geckoReady; rendering "+SUB);
  await p.evaluate((u)=>window.geckoRender(u),"http://127.0.0.1:"+port+"/bench/octane.html?b="+SUB);
  for(let i=0;i<40 && !crashed;i++){
    await sleep(1000);
    let t="";try{t=(await p.evaluate(()=>window.geckoEval("document.title")))||"";}catch(e){}
    if(t.indexOf("OCTSCORE")>=0){out.push("RESULT "+t);break;}
  }
  out.push(crashed?"FINAL: CRASHED":"FINAL: done");
 }catch(e){out.push("THROW: "+e.message.slice(0,150));}
 finally{
   require("fs").writeFileSync("/tmp/tlocdump.txt",out.join("\n")+"\n");
   await p.close().catch(()=>{});await b.close().catch(()=>{});server.close();process.exit(0);
 }
})().catch(e=>{require("fs").writeFileSync("/tmp/tlocdump.txt","FATAL "+e.message+"\n");process.exit(1);});
