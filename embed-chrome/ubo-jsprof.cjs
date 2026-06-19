// Use Gecko's own profiler (JS-aware) to find which JS function uBlock spins in
// while idle. CDP only shows C++ (PBIInterpret); this shows the JS frames.
const { chromium } = require('/home/velzie/src/puter/node_modules/playwright');
const { server } = require('./server.cjs');
const PORT = 9013;
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

const START = `
try {
  Services.profiler.StartProfiler(1<<22, 1, ["js","leaf","stackwalk"], ["GeckoMain"]);
  console.error("JSPROF profiler started=" + Services.profiler.IsActive());
} catch(e){ console.error("JSPROF start err "+e); }
`;

// Parse the gecko-format profile, aggregate self-time by leaf JS function name.
const REPORT = `
(async () => { try {
  const p = await Services.profiler.getProfileDataAsync();
  Services.profiler.StopProfiler();
  const flat = (prof) => { let out=[prof]; for (const sp of (prof.processes||[])) out=out.concat(flat(sp)); return out; };
  const procs = flat(p);
  const counts = new Map();
  for (const proc of procs) {
    for (const t of (proc.threads||[])) {
      const S = proc.stringTable || t.stringTable || [];
      const ss = t.samples, st = t.stackTable, ft = t.frameTable, fnt = t.funcTable;
      if (!ss || !st || !ft) continue;
      const sStack = ss.schema.stack;
      const stFrame = st.schema.frame, stPrefix = st.schema.prefix;
      const ftFunc = (ft.schema.func != null) ? ft.schema.func : ft.schema.location;
      const fnName = fnt ? fnt.schema.name : null;
      for (const row of ss.data) {
        let si = row[sStack]; if (si==null) continue;
        const frameIdx = st.data[si][stFrame];
        const fr = ft.data[frameIdx]; if (!fr) continue;
        let nameIdx;
        if (fnt && fr[ftFunc]!=null) { const fn=fnt.data[fr[ftFunc]]; nameIdx = fn ? fn[fnName] : fr[ftFunc]; }
        else nameIdx = fr[ftFunc];
        const name = (typeof nameIdx==='number') ? (S[nameIdx]||('#'+nameIdx)) : String(nameIdx);
        counts.set(name, (counts.get(name)||0)+1);
      }
    }
  }
  const top = [...counts.entries()].sort((a,b)=>b[1]-a[1]).slice(0,25);
  console.error("JSPROF TOP " + JSON.stringify(top));
} catch(e){ console.error("JSPROF report err "+(e&&e.stack||e)); } })();
`;

(async () => {
  await new Promise((r) => server.listen(PORT, '127.0.0.1', r));
  const browser = await chromium.launch({ headless: true, args: ['--no-sandbox','--use-gl=swiftshader','--enable-unsafe-swiftshader','--ignore-gpu-blocklist','--disable-dev-shm-usage'] });
  const page = await browser.newPage({ viewport: { width: 1100, height: 760 } });
  page.on('console', m => { const t=m.text(); if(/JSPROF/i.test(t)) console.log(t.slice(0,1200)); });
  try {
    await page.goto(`http://127.0.0.1:${PORT}/?gpu=1&glpass=1`, { waitUntil: 'load', timeout: 240000 });
    await page.waitForFunction(() => window.__geckoReady === true, undefined, { timeout: 180000 });
    await sleep(7000);
    await page.evaluate((j) => window.geckoEval(j), INSTALL);
    await sleep(30000);  // install + auto-reload + initial compile/serialize done
    console.log('--- start profiler, idle 6s, report ---');
    await page.evaluate((j) => window.geckoEval(j), START);
    await sleep(6000);
    await page.evaluate((j) => window.geckoEval(j), REPORT);
    await sleep(4000);
  } catch (e) { console.log('exc', e.message); }
  finally { await browser.close(); server.close(); }
  process.exit(0);
})();
