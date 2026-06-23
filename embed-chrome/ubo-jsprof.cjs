// Find uBlock's idle hot JS function via the Gecko (JS-aware) profiler.
// Trick: uBlock pegs the command loop, starving geckoEval. So: start the profiler
// BEFORE uBlock pegs, let it capture the busy period, then DISABLE uBlock to free
// the engine, then read+parse the profile while responsive.
const { chromium } = require('/home/velzie/src/puter/node_modules/playwright');
const { server } = require('./server.cjs');
const PORT = 9017;
const sleep = (ms) => new Promise(r => setTimeout(r, ms));

const INSTALL = `
(async () => { try {
  const { AddonManager } = ChromeUtils.importESModule("resource://gre/modules/AddonManager.sys.mjs");
  if (!AddonManager.isReady) { try { await AddonManager.readyPromise; } catch (e) {} }
  const resp = await fetch("http://127.0.0.1:${PORT}/ubo.xpi");
  await IOUtils.write("/ubo.xpi", new Uint8Array(await resp.arrayBuffer()));
  const f = Cc["@mozilla.org/file/local;1"].createInstance(Ci.nsIFile); f.initWithPath("/ubo.xpi");
  const install = await AddonManager.getInstallForFile(f, "application/x-xpinstall");
  await install.install().catch(()=>{});
  console.error("JSPROF installed state=" + install.state);
} catch(e){ console.error("JSPROF install err "+e); } })();
`;
const START = `try { Services.profiler.StartProfiler(1<<20, 2, ["js","leaf"], ["GeckoMain"]); console.error("JSPROF started=" + Services.profiler.IsActive()); } catch(e){ console.error("JSPROF start err "+e); }`;
const DISABLE = `(async()=>{try{const {AddonManager}=ChromeUtils.importESModule("resource://gre/modules/AddonManager.sys.mjs");const a=await AddonManager.getAddonByID("uBlock0@raymondhill.net");await a.disable();console.error("JSPROF uBlock disabled");}catch(e){console.error("JSPROF disable err "+e);}})();`;
const REPORT = `
(async () => { try {
  const p = await Services.profiler.getProfileDataAsync();
  Services.profiler.StopProfiler();
  const counts = new Map(); const all=[p].concat(p.processes||[]);
  for (const proc of all) for (const t of (proc.threads||[])) {
    const S=t.stringTable||[]; const ss=t.samples, st=t.stackTable, ft=t.frameTable, fnt=t.funcTable;
    if(!ss||!st||!ft) continue;
    const sStack=ss.schema.stack, stFrame=st.schema.frame, ftFunc=(ft.schema.func!=null?ft.schema.func:ft.schema.location), fnName=fnt?fnt.schema.name:null;
    for (const row of ss.data){ let si=row[sStack]; if(si==null)continue; const fr=ft.data[st.data[si][stFrame]]; if(!fr)continue;
      let ni; if(fnt&&fr[ftFunc]!=null){const fn=fnt.data[fr[ftFunc]]; ni=fn?fn[fnName]:fr[ftFunc];} else ni=fr[ftFunc];
      const nm=(typeof ni==='number')?(S[ni]||('#'+ni)):String(ni); counts.set(nm,(counts.get(nm)||0)+1); }
  }
  const top=[...counts.entries()].sort((a,b)=>b[1]-a[1]).slice(0,25);
  console.error("JSPROF TOP "+JSON.stringify(top));
} catch(e){ console.error("JSPROF report err "+(e&&e.stack||e)); } })();
`;

(async () => {
  await new Promise((r) => server.listen(PORT, '127.0.0.1', r));
  const browser = await chromium.launch({ headless: true, args: ['--no-sandbox','--use-gl=swiftshader','--enable-unsafe-swiftshader','--ignore-gpu-blocklist','--disable-dev-shm-usage'] });
  const page = await browser.newPage({ viewport: { width: 1100, height: 760 } });
  page.on('console', m => { const t=m.text(); if(/JSPROF/i.test(t)) console.log(t.slice(0,1400)); });
  const evalIn = (j) => page.evaluate((s) => window.geckoEval(s), j).catch(()=>{});
  try {
    await page.goto(`http://127.0.0.1:${PORT}/?gpu=1&glpass=1`, { waitUntil: 'load', timeout: 240000 });
    await page.waitForFunction(() => window.__geckoReady === true, undefined, { timeout: 180000 });
    await sleep(6000);
    await evalIn(START); await sleep(2000);
    console.log('--- install uBlock (profiler running) ---');
    await evalIn(INSTALL);
    await sleep(35000);   // uBlock enables + pegs; profiler captures
    console.log('--- disable uBlock to free the engine ---');
    await evalIn(DISABLE);
    await sleep(20000);   // wait for uBlock to actually stop + engine to recover
    console.log('--- report ---');
    await evalIn(REPORT);
    await sleep(20000);
  } catch (e) { console.log('exc', e.message); }
  finally { await browser.close(); server.close(); }
  process.exit(0);
})();
