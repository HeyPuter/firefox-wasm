const {chromium}=require("/home/velzie/src/puter/node_modules/playwright");
const {startBenchServer}=require("./bench-server.cjs");
const sleep=(ms)=>new Promise(r=>setTimeout(r,ms));
const t0=Date.now(); const ts=()=>((Date.now()-t0)/1000).toFixed(1)+"s";
const L=(...a)=>console.log(...a);
const URL=process.env.SITE||"https://en.wikipedia.org/wiki/WebAssembly";
(async()=>{
 const {server,port}=await startBenchServer(0);
 const b=await chromium.launch({headless:true,args:["--no-sandbox","--disable-dev-shm-usage"]});
 const p=await b.newPage();
 await p.goto("http://127.0.0.1:"+port+"/index.html?mirror=1",{waitUntil:"load",timeout:120000});
 await p.waitForFunction(()=>window.__geckoReady===true,{timeout:150000});
 L("ready @",ts());
 L("loading",URL);
 const n=await p.evaluate((u)=>window.geckoRender(u),URL);
 L("geckoRender returned",JSON.stringify(n),"@",ts());
 // let it load + the mirror loop run a few cycles
 await sleep(9000);
 const stats=await p.evaluate(()=>{
   const f=document.getElementById("mirror");
   const sd=(f&&f.srcdoc)||"";
   const m=(re)=>{let c=0,x;const r=new RegExp(re,"g");while(x=r.exec(sd))c++;return c;};
   return {
     srcdocLen: sd.length,
     styleTags: m("<style"),
     cssDataLinks: m("<link[^>]+href=[\"']data:text/css"),
     imgTags: m("<img"),
     imgHttp: m("<img[^>]+src=[\"']https?:"),
     imgData: m("<img[^>]+src=[\"']data:"),
     title: (sd.match(/<title>([^<]*)<\/title>/)||[])[1]||"",
   };
 });
 L("mirror stats:", JSON.stringify(stats,null,1));
 await p.screenshot({path:"/tmp/mirror_site.png",fullPage:false});
 L("screenshot -> /tmp/mirror_site.png @",ts());
 await b.close();server.close();process.exit(0);
})().catch(e=>{console.error("fatal",e.message,"@",ts());process.exit(1);});
