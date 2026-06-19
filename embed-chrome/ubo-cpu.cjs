// Measure idle CPU of the chrome build before vs after uBlock enables, to tell
// whether uBlock causes a continuous CPU drain (busy-loop / repeated work) or only
// costs on interaction. /proc utime+stime of all chromium procs over a window.
const fs = require('fs');
const { chromium } = require('/home/velzie/src/puter/node_modules/playwright');
const { server } = require('./server.cjs');
const PORT = 9009;
const HZ = 100;
const sleep = (ms) => new Promise(r => setTimeout(r, ms));
function chromePids() { const p=[]; for (const pid of fs.readdirSync('/proc')) { if(!/^\d+$/.test(pid))continue; try{ if(/chrome|chromium|headless_shell/i.test(fs.readFileSync(`/proc/${pid}/cmdline`,'utf8'))) p.push(pid);}catch(e){} } return p; }
function cpuTicks(pids){ let t=0; for(const pid of pids){ try{ const st=fs.readFileSync(`/proc/${pid}/stat`,'utf8'); const rest=st.slice(st.lastIndexOf(')')+2).split(' '); t+=(+rest[11]||0)+(+rest[12]||0);}catch(e){} } return t; }
async function measure(label, ms){ const pids=chromePids(); const t0=cpuTicks(pids),w0=Date.now(); await sleep(ms); const t1=cpuTicks(pids),w1=Date.now(); const cores=((t1-t0)/HZ)/((w1-w0)/1000); console.log(label+': '+cores.toFixed(2)+' cores ('+pids.length+' procs)'); return cores; }

const INSTALL = `
(async () => { try {
  const { AddonManager } = ChromeUtils.importESModule("resource://gre/modules/AddonManager.sys.mjs");
  if (!AddonManager.isReady) { try { await AddonManager.readyPromise; } catch (e) {} }
  const resp = await fetch("http://127.0.0.1:${PORT}/ubo.xpi");
  await IOUtils.write("/ubo.xpi", new Uint8Array(await resp.arrayBuffer()));
  const f = Cc["@mozilla.org/file/local;1"].createInstance(Ci.nsIFile); f.initWithPath("/ubo.xpi");
  const install = await AddonManager.getInstallForFile(f, "application/x-xpinstall");
  await install.install().catch(()=>{});
  console.error("UBOCPU installed state=" + install.state);
} catch(e){ console.error("UBOCPU install err "+e); } })();
`;

(async () => {
  await new Promise((r) => server.listen(PORT, '127.0.0.1', r));
  const browser = await chromium.launch({ headless: true, args: ['--no-sandbox','--use-gl=swiftshader','--enable-unsafe-swiftshader','--ignore-gpu-blocklist','--disable-dev-shm-usage'] });
  const page = await browser.newPage({ viewport: { width: 1100, height: 760 } });
  page.on('console', m => { const t=m.text(); if(/UBOCPU|reloaded uBlock|BackgroundPage.build ENTER|context loaded/i.test(t)) console.log('C| '+t.slice(0,150)); });
  try {
    await page.goto(`http://127.0.0.1:${PORT}/?gpu=1&glpass=1`, { waitUntil: 'load', timeout: 240000 });
    const ready = await page.waitForFunction(() => window.__geckoReady === true, undefined, { timeout: 180000 }).then(()=>true).catch(()=>false);
    console.log('READY=' + ready); if (!ready) throw new Error('not ready');
    await sleep(8000);
    await measure('BASELINE idle (no uBlock)', 8000);
    console.log('--- install uBlock + wait for auto-reload enable ---');
    await page.evaluate((j) => window.geckoEval(j), INSTALL);
    await sleep(25000);   // install + auto-reload + uBlock init/compile
    await measure('IDLE with uBlock (just enabled)', 10000);
    await sleep(15000);   // let any one-time compile settle
    await measure('IDLE with uBlock (settled)', 10000);
  } catch (e) { console.log('exc', e.message); }
  finally { await browser.close(); server.close(); }
  process.exit(0);
})();
