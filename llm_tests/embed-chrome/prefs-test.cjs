// Reproduce: open about:preferences in a tab, switch a sidebar category, capture
// the JS error. Screenshots prefs-load.png (initial) and prefs-click.png (after).
const { chromium } = require('/home/velzie/src/puter/node_modules/playwright');
const { startCDPCapture } = require('./cdp-capture.cjs');
const { server } = require('./server.cjs');
const PORT = Number(process.env.PORT || 8949);
const VW = 1280, VH = 900;

const OPEN_PREFS = `
setTimeout(function(){ try {
  var sp = Services.scriptSecurityManager.getSystemPrincipal();
  var t = gBrowser.addTab("about:preferences", { triggeringPrincipal: sp, forceNotRemote: true, inBackground: false });
  gBrowser.selectedTab = t;
  void t.linkedBrowser.docShell;
  console.error("PREFS tab opened");
} catch(e){ console.error("PREFS open err: " + (e&&e.stack||e)); } }, 0);
`;

// Runs in the chrome global; reaches into the in-process about:preferences content
// window to list sidebar categories and switch to one (the way a click does).
const SWITCH_CAT = `
(function(){ try {
  var b = gBrowser.selectedBrowser;
  var w = b.contentWindow;
  if (!w) { console.error("PREFS no contentWindow"); return; }
  console.error("PREFS content url=" + (w.location && w.location.href) + " ready=" + w.document.readyState);
  var cats = [...w.document.querySelectorAll("#categories > .category")].map(c => c.id);
  console.error("PREFS categories=" + cats.join(","));
  var sel = w.document.querySelector(".category[selected], .category[aria-selected='true']");
  console.error("PREFS selected before=" + (sel && sel.id));
  // Switch via the front-end's gotoPref (what a sidebar click triggers).
  if (typeof w.gotoPref === "function") {
    console.error("PREFS calling gotoPref(paneSearch)");
    w.gotoPref("paneSearch");
  } else {
    var el = w.document.getElementById("category-search") || w.document.getElementById("category-privacy");
    console.error("PREFS gotoPref missing; clicking " + (el && el.id));
    if (el) el.click();
  }
  setTimeout(function(){
    var sel2 = w.document.querySelector(".category[selected], .category[aria-selected='true']");
    console.error("PREFS selected after=" + (sel2 && sel2.id) + " hash=" + w.location.hash);
    // is the search pane actually shown?
    var pane = w.document.getElementById("paneSearch");
    console.error("PREFS paneSearch hidden=" + (pane ? pane.hidden : "no-pane") + " display=" + (pane ? w.getComputedStyle(pane).display : "?"));
  }, 1500);
} catch(e){ console.error("PREFS switch err: " + (e&&e.stack||e)); } })();
`;

(async () => {
  await new Promise((r) => server.listen(PORT, '127.0.0.1', r));
  const browser = await chromium.launch({ headless: true, args: ['--no-sandbox', '--remote-debugging-port=9367'] });
  const stopCdp = await startCDPCapture(9367, (l) => {
    if (/PREFS|JavaScript error|Error:|exception|gotoPref|preferences|NS_ERROR|TypeError|is not/i.test(l) && !/setsockopt|CSM /.test(l))
      console.log('  ' + l.slice(0, 320));
  });
  const page = await browser.newPage({ viewport: { width: VW, height: VH } });
  page.on('pageerror', (e) => console.log('  [PAGEERROR] ' + ((e.stack||e.message)+'').slice(0,200)));
  try {
    await page.goto(`http://127.0.0.1:${PORT}/`, { waitUntil: 'load', timeout: 240000 });
    await page.waitForFunction(() => window.__geckoReady === true, { timeout: 240000 });
    await page.waitForFunction(() => document.getElementById('loader').classList.contains('hidden'), { timeout: 120000 });
    await new Promise((r) => setTimeout(r, 3000));
    console.log('[test] opening about:preferences...');
    await page.evaluate((js) => window.geckoEval(js), OPEN_PREFS);
    await new Promise((r) => setTimeout(r, 16000));
    await page.screenshot({ path: require('path').join(__dirname, 'prefs-load.png') });
    console.log('[test] switching category...');
    await page.evaluate((js) => window.geckoEval(js), SWITCH_CAT);
    await new Promise((r) => setTimeout(r, 6000));
    await page.screenshot({ path: require('path').join(__dirname, 'prefs-click.png') });
    console.log('[test] screenshots -> prefs-load.png, prefs-click.png');
  } catch (e) { console.log('[test] exception:', e && e.message ? e.message : e); }
  finally { try { stopCdp(); } catch {} await browser.close(); server.close(); }
  process.exit(0);
})();
