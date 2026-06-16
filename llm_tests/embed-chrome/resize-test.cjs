// Verify the chrome re-lays-out to the live window size on resize. Load at one
// size, screenshot; resize the viewport (twice), and confirm the canvas backing +
// the rendered chrome track the new size. Screenshots resize-{a,b,c}.png.
const { chromium } = require('/home/velzie/src/puter/node_modules/playwright');
const { server } = require('./server.cjs');
const PORT = Number(process.env.PORT || 8947);

async function geo(page) {
  return page.evaluate(() => {
    const c = document.getElementById('screen');
    const r = c.getBoundingClientRect();
    return { vw: innerWidth, vh: innerHeight, backW: c.width, backH: c.height,
             cssW: Math.round(r.width), cssH: Math.round(r.height),
             lastRender: window.__lastRender || null };
  });
}

(async () => {
  await new Promise((r) => server.listen(PORT, '127.0.0.1', r));
  const browser = await chromium.launch({ headless: true, args: ['--no-sandbox', '--window-size=1100,700'] });
  const page = await browser.newPage({ viewport: { width: 1100, height: 700 } });
  try {
    await page.goto(`http://127.0.0.1:${PORT}/`, { waitUntil: 'load', timeout: 240000 });
    await page.waitForFunction(() => window.__geckoReady === true, { timeout: 240000 });
    await page.waitForFunction(() => document.getElementById('loader').classList.contains('hidden'), { timeout: 120000 });
    await new Promise((r) => setTimeout(r, 4000));
    console.log('[A 1100x700]', JSON.stringify(await geo(page)));
    await page.screenshot({ path: require('path').join(__dirname, 'resize-a.png') });

    // Grow the window.
    await page.setViewportSize({ width: 1600, height: 1000 });
    await new Promise((r) => setTimeout(r, 5000));
    console.log('[B 1600x1000]', JSON.stringify(await geo(page)));
    await page.screenshot({ path: require('path').join(__dirname, 'resize-b.png') });

    // Shrink the window.
    await page.setViewportSize({ width: 820, height: 560 });
    await new Promise((r) => setTimeout(r, 5000));
    console.log('[C 820x560]', JSON.stringify(await geo(page)));
    await page.screenshot({ path: require('path').join(__dirname, 'resize-c.png') });

    const g = await geo(page);
    const ok = g.backW === g.vw && g.backH === g.vh;
    console.log(ok ? '[PASS] canvas backing tracks viewport (' + g.backW + 'x' + g.backH + ')'
                   : '[FAIL] backing ' + g.backW + 'x' + g.backH + ' != viewport ' + g.vw + 'x' + g.vh);
  } catch (e) { console.log('[test] exception:', e && e.message ? e.message : e); }
  finally { await browser.close(); server.close(); }
  process.exit(0);
})();
