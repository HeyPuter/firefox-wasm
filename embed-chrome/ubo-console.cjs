// Capture uBlock's background console (via ?contentconsole) and find REPEATED
// messages -> reveals the continuous loop (e.g. a failing IndexedDB write retry).
const { chromium } = require('/home/velzie/src/puter/node_modules/playwright');
const { server } = require('./server.cjs');
const PORT = 9015;
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
  console.error("UBOCON installed state=" + install.state);
} catch(e){ console.error("UBOCON install err "+e); } })();
`;
(async () => {
  await new Promise((r) => server.listen(PORT, '127.0.0.1', r));
  const browser = await chromium.launch({ headless: true, args: ['--no-sandbox','--use-gl=swiftshader','--enable-unsafe-swiftshader','--ignore-gpu-blocklist','--disable-dev-shm-usage'] });
  const page = await browser.newPage({ viewport: { width: 1100, height: 760 } });
  const freq = new Map(); let capturing = false;
  const norm = (t) => t.replace(/\d+/g,'N').replace(/0x[0-9a-f]+/gi,'P').replace(/moz-extension:\/\/[0-9a-f-]+/gi,'EXT').slice(0,120);
  page.on('console', m => { const t=m.text(); if(/UBOCON/i.test(t)) console.log(t.slice(0,120)); if(capturing){ const k=norm(t); freq.set(k,(freq.get(k)||0)+1); } });
  page.on('pageerror', e => { if(capturing){ const k='PAGEERR:'+norm(String(e)); freq.set(k,(freq.get(k)||0)+1);} });
  try {
    await page.goto(`http://127.0.0.1:${PORT}/?gpu=1&glpass=1&contentconsole`, { waitUntil: 'load', timeout: 240000 });
    await page.waitForFunction(() => window.__geckoReady === true, undefined, { timeout: 180000 });
    await sleep(7000);
    await page.evaluate((j) => window.geckoEval(j), INSTALL);
    await sleep(32000);   // install + auto-reload + initial compile/serialize
    console.log('--- capturing console 15s (idle, uBlock active) ---');
    freq.clear(); capturing = true;
    await sleep(15000);
    capturing = false;
    const top = [...freq.entries()].sort((a,b)=>b[1]-a[1]).slice(0,20);
    console.log('=== most frequent console messages in 15s idle ===');
    for (const [msg, n] of top) console.log(n + 'x  ' + msg);
  } catch (e) { console.log('exc', e.message); }
  finally { await browser.close(); server.close(); }
  process.exit(0);
})();
