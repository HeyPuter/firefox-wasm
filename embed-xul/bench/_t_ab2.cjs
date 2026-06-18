const {chromium}=require("playwright-core");
const {startBenchServer}=require("./bench-server.cjs");
const SUB=process.env.OCT||"deltablue"; const K=parseInt(process.env.K||"5",10);
const sleep=(ms)=>new Promise(r=>setTimeout(r,ms));
async function session(port,off,label){
 const b=await chromium.launch({headless:true,executablePath:"/usr/bin/chromium",args:["--no-sandbox","--disable-dev-shm-usage"]});
 const p=await b.newPage();
 await p.goto("http://127.0.0.1:"+port+"/index.html"+(off?"?env.GECKO_NOWASMJIT=1":"?x=0"),{waitUntil:"load",timeout:120000});
 await p.waitForFunction(()=>window.__geckoReady===true,{timeout:150000});
 const out=[];
 for(let k=0;k<K;k++){
   await p.evaluate((u)=>window.geckoRender(u),"http://127.0.0.1:"+port+"/bench/octane.html?b="+SUB+"&n="+k);
   let t="";for(let i=0;i<40;i++){await sleep(1000);try{t=(await p.evaluate(()=>window.geckoEval("document.title")))||"";}catch(e){}if(t.indexOf("OCTSCORE=")>=0)break;}
   const m=/DeltaBlue=(\d+)/.exec(t)||/OCTSCORE=(\d+)/.exec(t); out.push(m?parseInt(m[1]):0);
   console.log(label+" run"+k+"="+(m?m[1]:"?")); 
 }
 await b.close(); return out;
}
(async()=>{
 const {server,port}=await startBenchServer(0);
 const med=a=>{const s=[...a].sort((x,y)=>x-y);return s[Math.floor(s.length/2)];};
 const on=await session(port,false,"ON"); 
 const off=await session(port,true,"OFF");
 console.log("ON median="+med(on)+" OFF median="+med(off)+" ratio="+(med(on)/med(off)).toFixed(2)+" load="+require('fs').readFileSync('/proc/loadavg','utf8').trim());
 server.close();process.exit(0);
})().catch(e=>{console.error("fatal",e.message);process.exit(1);});
