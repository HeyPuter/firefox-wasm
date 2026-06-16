// Probe a list of real sites in DOM-mirror mode: does it load over WISP, how big is the
// DOM, and how much does it KEEP mutating after settling (the case that stresses the
// dirty-tick re-serialize path). Prints a table + screenshots each to /tmp/site_<i>.png.
const {chromium}=require("/home/velzie/src/puter/node_modules/playwright");
const {startBenchServer}=require("./bench-server.cjs");
const sleep=(ms)=>new Promise(r=>setTimeout(r,ms));
const L=(...a)=>console.log(...a);
const SITES = (process.env.SITES||[
  "https://en.wikipedia.org/wiki/Web_browser",
  "https://news.ycombinator.com/",
  "https://old.reddit.com/",
  "https://www.bbc.com/news",
  "https://github.com/torvalds/linux",
  "https://www.theverge.com/",
  "https://finance.yahoo.com/",
  "https://www.youtube.com/",
].join(",")).split(",");

(async()=>{
 const {server,port}=await startBenchServer(0);
 const b=await chromium.launch({headless:true,args:["--no-sandbox","--disable-dev-shm-usage"]});
 const p=await b.newPage();
 await p.goto("http://127.0.0.1:"+port+"/index.html?mirror=1",{waitUntil:"load",timeout:120000});
 await p.waitForFunction(()=>window.__geckoReady===true,{timeout:150000});
 const ev=(s)=>p.evaluate((s)=>window.geckoEval(s),s);
 const withTo=(pr,ms,d)=>Promise.race([pr,sleep(ms).then(()=>d)]);
 const results=[];
 for(let i=0;i<SITES.length;i++){
   const url=SITES[i]; const row={url:url.replace(/^https?:\/\//,"").slice(0,38)};
   try{
     await withTo(p.evaluate((u)=>window.geckoRender(u),url), 30000, null);
     await sleep(7000); // settle
     // install a mutation counter in the content page
     await ev("(function(){if(!window.__mo){window.__mc=0;window.__mo=new MutationObserver(function(ms){for(var i=0;i<ms.length;i++)window.__mc++;});window.__mo.observe(document,{subtree:true,childList:true,attributes:true,characterData:true});}return 1;})()");
     const mc0=+(await ev("window.__mc")||0);
     row.dom=+(await ev("document.querySelectorAll('*').length")||0);
     row.imgs=+(await ev("document.querySelectorAll('img').length")||0);
     row.sheets=+(await ev("document.styleSheets.length")||0);
     row.title=((await ev("document.title"))||"").slice(0,30);
     await sleep(4000); // measure mutation over 4s
     const mc1=+(await ev("window.__mc")||0);
     row.mut4s=mc1-mc0;
     const mir=await p.evaluate(()=>((document.getElementById('mirror')||{}).srcdoc||"").length);
     row.mirrorKB=Math.round(mir/1024);
     await p.screenshot({path:"/tmp/site_"+i+".png"});
   }catch(e){ row.err=(e.message||"").slice(0,40); }
   results.push(row); L("done", i, JSON.stringify(row));
 }
 L("=== SUMMARY ===");
 L("url".padEnd(40), "dom".padStart(7), "imgs".padStart(5), "sheets".padStart(7), "mut/4s".padStart(7), "mirKB".padStart(6), "  title");
 for(const r of results) L((r.url||"").padEnd(40), String(r.dom??r.err??"-").padStart(7), String(r.imgs??"-").padStart(5), String(r.sheets??"-").padStart(7), String(r.mut4s??"-").padStart(7), String(r.mirrorKB??"-").padStart(6), "  "+(r.title||r.err||""));
 await b.close();server.close();process.exit(0);
})().catch(e=>{console.error("fatal",e.message);process.exit(1);});
