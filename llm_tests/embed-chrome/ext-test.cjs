// Test whether WebExtensions work in the full-chrome embed.
// 1. Load the chrome. 2. Write an unpacked MV2 extension (content script that
//    paints the page magenta + injects an "EXTENSION ACTIVE" banner) to /ext via
//    IOUtils, install it as a temporary addon via AddonManager. 3. Load example.com
//    in a tab. 4. Screenshot + check the content script modified the page.
const { chromium } = require('/home/velzie/src/puter/node_modules/playwright');
const { startCDPCapture } = require('./cdp-capture.cjs');
const { server } = require('./server.cjs');
const PORT = Number(process.env.PORT || 8944);

// Runs in the chrome (system) global via geckoEval.
const INSTALL_JS = `
(async () => {
  try {
    const { AddonManager } = ChromeUtils.importESModule("resource://gre/modules/AddonManager.sys.mjs");
    console.error("EXT AddonManager isReady=" + AddonManager.isReady);
    if (!AddonManager.isReady) {
      try { await AddonManager.readyPromise; } catch (e) {}
      console.error("EXT after-wait isReady=" + AddonManager.isReady);
    }
    console.error("EXT step makeDir");
    await IOUtils.makeDirectory("/ext", { ignoreExisting: true });
    const manifest = {
      manifest_version: 2, name: "EmbedTest", version: "1.0",
      browser_specific_settings: { gecko: { id: "embedtest@local" } },
      content_scripts: [{ matches: ["<all_urls>"], js: ["c.js"], run_at: "document_idle" }]
    };
    console.error("EXT step writeManifest");
    await IOUtils.writeUTF8("/ext/manifest.json", JSON.stringify(manifest));
    console.error("EXT step writeCS");
    await IOUtils.writeUTF8("/ext/c.js",
      "document.documentElement.style.setProperty('background','#ff00ff','important');" +
      "var d=document.createElement('div');d.textContent='EXTENSION ACTIVE';" +
      "d.style.cssText='position:fixed;top:0;left:0;right:0;z-index:99999;background:lime;color:#000;font:bold 34px sans-serif;padding:14px;text-align:center';" +
      "(document.body||document.documentElement).appendChild(d);" +
      "console.error('EXT CONTENT-SCRIPT RAN on '+location.href);");
    const f = Cc["@mozilla.org/file/local;1"].createInstance(Ci.nsIFile);
    f.initWithPath("/ext");
    console.error("EXT step install (file exists=" + f.exists() + ")");
    const addon = await AddonManager.installTemporaryAddon(f);
    console.error("EXT INSTALLED id=" + addon.id + " active=" + addon.isActive + " type=" + addon.type);
    globalThis.__extOk = true;
  } catch (e) {
    console.error("EXT ERROR: " + (e && e.stack ? e.stack : e));
    globalThis.__extOk = false;
  }
})();
`;

(async () => {
  await new Promise((r) => server.listen(PORT, '127.0.0.1', r));
  const browser = await chromium.launch({ headless: true, args: ['--no-sandbox', '--remote-debugging-port=9364'] });
  const stopCdp = await startCDPCapture(9364, (l) => {
    if (/EXT |AddonManager|extension|content-script|installTemporary/i.test(l) && !/setsockopt/.test(l))
      console.log('  ' + l.slice(0, 320));
  });
  const page = await browser.newPage();
  page.on('pageerror', (e) => console.log('  [PAGEERROR] ' + ((e.stack||e.message)+'').slice(0,200)));
  try {
    await page.goto(`http://127.0.0.1:${PORT}/`, { waitUntil: 'load', timeout: 240000 });
    await page.waitForFunction(() => window.__geckoReady === true, { timeout: 240000 });
    console.log('[test] engine READY; settling chrome...');
    await new Promise((r) => setTimeout(r, 12000));
    console.log('[test] installing extension...');
    await page.evaluate((js) => window.geckoEval(js), INSTALL_JS);
    await new Promise((r) => setTimeout(r, 10000));
    console.log('[test] loading example.com (content script should run)...');
    await page.evaluate(() => window.geckoRender('https://example.com'));
    await new Promise((r) => setTimeout(r, 30000));
    await page.screenshot({ path: require('path').join(__dirname, 'ext-test.png'), fullPage: true });
    console.log('[test] screenshot -> embed-chrome/ext-test.png');
    // magenta (#ff00ff) from the content script => pixels with R high, G ~0, B high
    const m = await page.evaluate(() => {
      const c = document.getElementById('screen');
      const d = c.getContext('2d').getImageData(0, 300, c.width, 400).data;
      let magenta = 0, lime = 0;
      for (let i = 0; i + 3 < d.length; i += 4) {
        const r = d[i], g = d[i+1], b = d[i+2];
        if (r > 200 && g < 80 && b > 200) magenta++;
        if (r < 120 && g > 200 && b < 120) lime++;
      }
      return { magenta, lime };
    }).catch((e) => 'err:' + e.message);
    console.log('[test] content-area magenta/lime pixel counts:', JSON.stringify(m));
  } catch (e) { console.log('[test] exception:', e && e.message ? e.message : e); }
  finally { try { stopCdp(); } catch {} await browser.close(); server.close(); }
  process.exit(0);
})();
