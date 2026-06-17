const {chromium}=require("/home/velzie/src/puter/node_modules/playwright");
const {startBenchServer}=require("./bench-server.cjs");
const SUB = process.env.OCT || "navier-stokes,crypto,richards,deltablue";
const sleep=(ms)=>new Promise(r=>setTimeout(r,ms));
async function run(port, nextResult, off){
 const b=await chromium.launch({headless:true,args:["--no-sandbox","--disable-dev-shm-usage"]});
 const p=await b.newPage();
 const qs=off?"?env.GECKO_NOWASMJIT=1":"";
 await p.goto("http://127.0.0.1:"+port+"/index.html"+qs,{waitUntil:"load",timeout:120000});
 await p.waitForFunction(()=>window.__geckoReady===true,{timeout:150000});
 await p.evaluate((u)=>window.geckoRender(u),"http://127.0.0.1:"+port+"/bench/octane.html?b="+SUB);
 const res = await Promise.race([ nextResult(), sleep(360000).then(()=>({timeout:true})) ]);
 await b.close();
 return res;
}
function fmt(r){
 if(!r||r.timeout) return "TIMEOUT(360s)";
 if(r.error) return "ERROR "+r.error;
 var parts=[]; for(var k in (r.results||{})) parts.push(k+"="+Math.round(r.results[k]));
 var errs=[]; for(var k in (r.errors||{})) errs.push(k+":"+r.errors[k]);
 return "SCORE="+r.score+" wall="+r.wallMs+"ms  ["+parts.join(" ")+"]"+(errs.length?(" ERRORS["+errs.join(";")+"]"):"");
}
(async()=>{
 const {server,port,nextResult}=await startBenchServer(0);
 console.log("Octane subset:", SUB);
 const on=await run(port,nextResult,false); console.log("JIT ON : "+fmt(on));
 const off=await run(port,nextResult,true); console.log("JIT OFF: "+fmt(off));
 if(on&&off&&on.score&&off.score) console.log("RATIO (on/off): "+(on.score/off.score).toFixed(2)+"x");
 server.close();process.exit(0);
})().catch(e=>{console.error("fatal",e.message);process.exit(1);});
