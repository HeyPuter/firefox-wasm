// Identify the busy scroll fiber: scroll a tall page with MOZ_LOG (RenderThread + refresh
// driver + compositor) on, and tally which THREAD-NAME prefixes appear in console lines
// during the scroll burst. MOZ_LOG prefixes each line with the PR thread name (which survives
// even though OS-level pthread_setname_np fails here), so the flooding thread = the busy fiber.
const { chromium } = require('/home/velzie/src/puter/node_modules/playwright');
const { server } = require('/home/velzie/src/gecko-wasm/embed-xul/server-stj.cjs');
const PORT = 9167;
setTimeout(() => process.exit(7), 110000);
const lines = []; let interactive = false; let scrolling = false;
const scrollLines = [];
function note(t) { lines.push(t); if (/doc INTERACTIVE/.test(t)) interactive = true; if (scrolling) scrollLines.push(t); }
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const ev = async (p, f) => { try { return await Promise.race([p.evaluate(f), new Promise(r=>setTimeout(()=>r('H'),1500))]); } catch(e){ return 'e'; } };
const TALL = "data:text/html,<body style='margin:0'>" + Array.from({length:60},(_,i)=>`<div style='height:90px;background:hsl(${i*6},70%,60%)'>row ${i}</div>`).join('') + "</body>";
const MOZLOG = 'nsRefreshDriver:4,RenderThread:5,apz.controller:4';

(async () => {
  await new Promise((r) => server.listen(PORT, '127.0.0.1', r));
  const browser = await chromium.launch({ headless: true, args: ['--no-sandbox'] });
  const page = await browser.newPage({ viewport: { width: 980, height: 820 } });
  page.on('console', (m) => note(m.text()));
  try {
    await page.goto(`http://127.0.0.1:${PORT}/?mozlog=${encodeURIComponent(MOZLOG)}&url=${encodeURIComponent(TALL)}`, { waitUntil:'commit', timeout:60000 });
    const t0 = Date.now(); while(!interactive && Date.now()-t0<60000) await sleep(300);
    console.log('loaded; scrolling...');
    const r = await ev(page, () => { const c=document.getElementById('screen'); const b=c.getBoundingClientRect(); return {x:b.left+b.width/2,y:b.top+b.height/2}; });
    await page.mouse.move(r.x, r.y).catch(()=>{});
    await sleep(300);
    scrolling = true;
    for (let i=0;i<15;i++){ await page.mouse.wheel(0,120).catch(()=>{}); await sleep(80); }
    await sleep(500); scrolling = false;
    // tally thread-name prefixes seen in MOZ_LOG lines during scroll. MOZ_LOG format:
    // "[ThreadName 12345: Level/Module msg]" -> grab the leading [Name ...] token.
    const tally = {};
    for (const l of scrollLines) {
      const m = /^\[([A-Za-z][A-Za-z0-9 _#]*?)[ ]+\d+:/.exec(l) || /^\[([A-Za-z][A-Za-z0-9 _#]*?)\]/.exec(l);
      if (m) tally[m[1]] = (tally[m[1]] || 0) + 1;
    }
    console.log('scroll-window log lines: ' + scrollLines.length);
    console.log('thread-name prefix tally during scroll: ' + JSON.stringify(tally));
    console.log('sample scroll lines:');
    console.log('  ' + scrollLines.slice(0, 15).join('\n  '));
  } catch (e) { console.log('exc ' + e.message); }
  finally { await browser.close().catch(()=>{}); server.close(); process.exit(0); }
})();
