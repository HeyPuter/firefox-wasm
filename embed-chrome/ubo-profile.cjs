// Profile the IDLE chrome engine WITH uBlock enabled (no requests) to find the
// continuous main-thread drain the user sees "immediately after activate".
// Reuses the cross-worker CDP profiling approach from embed-xul/bench/profile.cjs.
const http = require('http');
const { chromium } = require('/home/velzie/src/puter/node_modules/playwright');
const { server } = require('./server.cjs');
const PORT = 9011, CDP_PORT = 9335;
const sleep = (ms) => new Promise(r => setTimeout(r, ms));
function httpJson(url){ return new Promise((res,rej)=>{ http.get(url,(r)=>{let b='';r.on('data',c=>b+=c);r.on('end',()=>{try{res(JSON.parse(b))}catch(e){rej(e)}})}).on('error',rej); }); }
class CDP { constructor(ws){ this.ws=ws;this.id=0;this.cbs=new Map();this.listeners=[];
  ws.onmessage=(ev)=>{const m=JSON.parse(ev.data); if(m.id&&this.cbs.has(m.id)){const{resolve,reject}=this.cbs.get(m.id);this.cbs.delete(m.id);m.error?reject(new Error(m.error.message)):resolve(m.result);} else if(m.method) for(const l of this.listeners) l(m);}; }
  send(method,params={},sessionId){ const id=++this.id; return new Promise((resolve,reject)=>{this.cbs.set(id,{resolve,reject}); this.ws.send(JSON.stringify(sessionId?{id,method,params,sessionId}:{id,method,params}));}); }
  on(fn){ this.listeners.push(fn); } }
const IDLE = new Set(['__timedwait_cp','emscripten_futex_wait','(idle)','__emscripten_thread_mailbox_await','_emscripten_yield','pthread_cond_wait','__pthread_cond_timedwait','sched_yield','___syscall__newselect','__syscall__newselect','nanosleep','emscripten_thread_sleep']);

const INSTALL = `
(async () => { try {
  const { AddonManager } = ChromeUtils.importESModule("resource://gre/modules/AddonManager.sys.mjs");
  if (!AddonManager.isReady) { try { await AddonManager.readyPromise; } catch (e) {} }
  const resp = await fetch("http://127.0.0.1:${PORT}/ubo.xpi");
  await IOUtils.write("/ubo.xpi", new Uint8Array(await resp.arrayBuffer()));
  const f = Cc["@mozilla.org/file/local;1"].createInstance(Ci.nsIFile); f.initWithPath("/ubo.xpi");
  const install = await AddonManager.getInstallForFile(f, "application/x-xpinstall");
  await install.install().catch(()=>{});
  console.error("UBOPROF installed state=" + install.state);
} catch(e){ console.error("UBOPROF install err "+e); } })();
`;

(async () => {
  await new Promise((r) => server.listen(PORT, '127.0.0.1', r));
  const browser = await chromium.launch({ headless: true, args: ['--no-sandbox','--disable-dev-shm-usage','--use-gl=swiftshader','--enable-unsafe-swiftshader','--ignore-gpu-blocklist',`--remote-debugging-port=${CDP_PORT}`] });
  const page = await browser.newPage({ viewport: { width: 1100, height: 760 } });
  page.on('console', m => { const t=m.text(); if(/UBOPROF|reloaded uBlock|context loaded/i.test(t)) console.error('  '+t.slice(0,140)); });
  try {
    await page.goto(`http://127.0.0.1:${PORT}/?gpu=1&glpass=1`, { waitUntil: 'load', timeout: 240000 });
    await page.waitForFunction(() => window.__geckoReady === true, undefined, { timeout: 180000 });
    await sleep(7000);
    console.error('[prof] installing uBlock + waiting for enable');
    await page.evaluate((j) => window.geckoEval(j), INSTALL);
    await sleep(28000);  // install + auto-reload + uBlock init

    const ver = await httpJson(`http://127.0.0.1:${CDP_PORT}/json/version`);
    const ws = new WebSocket(ver.webSocketDebuggerUrl);
    await new Promise((r) => { ws.onopen = r; });
    const cdp = new CDP(ws);
    const profSessions = []; const sidInfo = new Map(); const seen = new Set();
    const attached = new Promise((resolve) => {
      let settle = setTimeout(resolve, 4000);
      cdp.on(async (m) => { if (m.method === 'Target.attachedToTarget') {
        const sid = m.params.sessionId; if (seen.has(sid)) return; seen.add(sid);
        sidInfo.set(sid, { type: m.params.targetInfo.type, url: m.params.targetInfo.url||'' });
        try { await cdp.send('Target.setAutoAttach', { autoAttach:true, waitForDebuggerOnStart:false, flatten:true }, sid); } catch(e){}
        try { await cdp.send('Profiler.enable', {}, sid); await cdp.send('Profiler.setSamplingInterval', { interval:1000 }, sid); profSessions.push(sid); } catch(e){}
        clearTimeout(settle); settle = setTimeout(resolve, 2000);
      }});
    });
    await cdp.send('Target.setAutoAttach', { autoAttach:true, waitForDebuggerOnStart:false, flatten:true });
    await attached;
    console.error(`[prof] attached ${profSessions.length} targets; profiling idle 12s (no requests)`);
    for (const sid of profSessions) { try { await cdp.send('Profiler.start', {}, sid); } catch(e){} }
    await sleep(12000);
    const withTimeout=(p,ms)=>Promise.race([p,new Promise((_,rej)=>setTimeout(()=>rej(new Error('to')),ms))]);
    const stopped = await Promise.all(profSessions.map(sid => withTimeout(cdp.send('Profiler.stop',{},sid),8000).then(r=>r).catch(()=>null)));

    const self = new Map(); let activeUs = 0;
    const perTgt = [];
    for (let ti=0; ti<stopped.length; ti++){ const prof=stopped[ti]; const p=prof&&prof.profile; if(!p||!p.nodes) continue;
      const byId=new Map(p.nodes.map(n=>[n.id,n])); let tActive=0; const tSelf=new Map();
      const samples=p.samples||p.nodes.flatMap(n=>Array(n.hitCount||0).fill(n.id));
      const deltas=p.timeDeltas||samples.map(()=>1000);
      for(let i=0;i<samples.length;i++){ const n=byId.get(samples[i]); if(!n) continue; const fn=n.callFrame.functionName||'(anonymous)'; const us=Math.max(0,deltas[i]||0);
        if(!IDLE.has(fn)){ self.set(fn,(self.get(fn)||0)+us); activeUs+=us; tActive+=us; tSelf.set(fn,(tSelf.get(fn)||0)+us); } }
      const top=[...tSelf.entries()].sort((a,b)=>b[1]-a[1]).slice(0,6).map(([f,u])=>f.slice(0,46)+':'+Math.round(u/1000));
      if(tActive>500) perTgt.push({ url:(sidInfo.get(profSessions[ti])||{}).url.slice(0,40), activeMs:Math.round(tActive/1000), top });
    }
    ws.close();
    const sorted=[...self.entries()].sort((a,b)=>b[1]-a[1]).slice(0,30);
    console.log(JSON.stringify({ activeMs:Math.round(activeUs/1000), targets:profSessions.length,
      top: sorted.map(([fn,us])=>({fn:fn.slice(0,72),ms:Math.round(us/1000),pct:+(us/activeUs*100).toFixed(1)})),
      perTarget: perTgt.sort((a,b)=>b.activeMs-a.activeMs).slice(0,8) }, null, 2));
  } catch (e) { console.log('exc', e.message); }
  finally { await browser.close(); server.close(); }
  process.exit(0);
})();
