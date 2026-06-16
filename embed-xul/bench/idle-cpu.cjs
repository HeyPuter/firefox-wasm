// Ground-truth idle CPU: load the engine, let it sit with NO page loaded, and
// measure the actual CPU time consumed by all chromium processes over a window
// (from /proc/<pid>/stat utime+stime). Reports cores used. An idle browser engine
// should be ~0.
const path = require('path');
const fs = require('fs');
const { chromium } = require('/home/velzie/src/puter/node_modules/playwright');
const { startBenchServer } = require('./bench-server.cjs');

const HZ = 100; // USER_HZ (clock ticks/sec) on Linux

function chromePids() {
  const pids = [];
  for (const pid of fs.readdirSync('/proc')) {
    if (!/^\d+$/.test(pid)) continue;
    try {
      const cmd = fs.readFileSync(`/proc/${pid}/cmdline`, 'utf8');
      if (/chrome|chromium|headless_shell/i.test(cmd)) pids.push(pid);
    } catch (e) {}
  }
  return pids;
}
function cpuTicks(pids) {
  let t = 0;
  for (const pid of pids) {
    try {
      const st = fs.readFileSync(`/proc/${pid}/stat`, 'utf8');
      // fields after the (comm) which may contain spaces: split on last ')'
      const rest = st.slice(st.lastIndexOf(')') + 2).split(' ');
      // utime=field14 (index 11 in rest), stime=field15 (index 12)
      t += (+rest[11] || 0) + (+rest[12] || 0);
    } catch (e) {}
  }
  return t;
}

(async () => {
  const WINDOW = +((process.argv.find((a) => a.startsWith('--ms=')) || '').split('=')[1]) || 8000;
  const { server, port } = await startBenchServer(0);
  const browser = await chromium.launch({ headless: true, args: ['--no-sandbox', '--disable-dev-shm-usage'] });
  const page = await browser.newPage();
  await page.goto(`http://127.0.0.1:${port}/index.html`, { waitUntil: 'load', timeout: 120000 });
  await page.waitForFunction(() => window.__geckoReady === true, { timeout: 180000 });
  // settle a moment so startup work finishes
  await new Promise((r) => setTimeout(r, 2000));

  const pids = chromePids();
  const t0 = cpuTicks(pids), w0 = Date.now();
  await new Promise((r) => setTimeout(r, WINDOW));
  const t1 = cpuTicks(pids), w1 = Date.now();

  const cpuSec = (t1 - t0) / HZ;
  const wallSec = (w1 - w0) / 1000;
  console.log(JSON.stringify({
    bench: 'idle-cpu', windowMs: WINDOW, chromeProcs: pids.length,
    cpuSeconds: +cpuSec.toFixed(2), wallSeconds: +wallSec.toFixed(2),
    coresUsed: +(cpuSec / wallSec).toFixed(2),
  }));
  await browser.close(); server.close(); process.exit(0);
})().catch((e) => { console.error('idle-cpu fatal', e); process.exit(1); });
