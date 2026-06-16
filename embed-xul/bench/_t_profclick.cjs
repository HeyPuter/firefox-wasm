// Profile the engine WHILE a click is hanging, to find the spin location.
const http = require('http');
const { chromium } = require('/home/velzie/src/puter/node_modules/playwright');
const { startBenchServer } = require('./bench-server.cjs');
const CDP_PORT = 9355;
function httpJson(url){return new Promise((res,rej)=>{http.get(url,(r)=>{let b='';r.on('data',c=>b+=c);r.on('end',()=>{try{res(JSON.parse(b))}catch(e){rej(e)}})}).on('error',rej)})}
class CDP{constructor(ws){this.ws=ws;this.id=0;this.cbs=new Map();this.listeners=[];ws.onmessage=(ev)=>{const m=JSON.parse(ev.data);if(m.id&&this.cbs.has(m.id)){const{resolve,reject}=this.cbs.get(m.id);this.cbs.delete(m.id);m.error?reject(new Error(m.error.message)):resolve(m.result)}else if(m.method)for(const l of this.listeners)l(m)}}
 send(method,params={},sessionId){const id=++this.id;return new Promise((resolve,reject)=>{this.cbs.set(id,{resolve,reject});this.ws.send(JSON.stringify(sessionId?{id,method,params,sessionId}:{id,method,params}))})}
 on(fn){this.listeners.push(fn)}}
(async()=>{
 const {server,port}=await startBenchServer(0);
 const browser=await chromium.launch({headless:true,args:['--no-sandbox','--disable-dev-shm-usage',`--remote-debugging-port=${CDP_PORT}`]});
 const page=await browser.newPage();
 await page.goto(`http://127.0.0.1:${port}/index.html?mirror=1`,{waitUntil:'load',timeout:120000});
 await page.waitForFunction(()=>window.__geckoReady===true,{timeout:150000});
 console.error('[p] ready');
 await page.evaluate((u)=>window.geckoRender(u),`http://127.0.0.1:${port}/bench/clicktargets.html`);
 await new Promise(r=>setTimeout(r,2000));
 const ver=await httpJson(`http://127.0.0.1:${CDP_PORT}/json/version`);
 const ws=new WebSocket(ver.webSocketDebuggerUrl);await new Promise(r=>{ws.onopen=r});
 const cdp=new CDP(ws);
 const profSessions=[];const sidInfo=new Map();const seen=new Set();
 const attached=new Promise((resolve)=>{let settle=setTimeout(resolve,4000);
   cdp.on(async(m)=>{if(m.method==='Target.attachedToTarget'){const sid=m.params.sessionId,type=m.params.targetInfo.type;if(seen.has(sid))return;seen.add(sid);
     sidInfo.set(sid,{type,url:m.params.targetInfo.url||''});
     try{await cdp.send('Target.setAutoAttach',{autoAttach:true,waitForDebuggerOnStart:false,flatten:true},sid)}catch(e){}
     try{await cdp.send('Profiler.enable',{},sid);await cdp.send('Profiler.setSamplingInterval',{interval:500},sid);profSessions.push(sid)}catch(e){}
     clearTimeout(settle);settle=setTimeout(resolve,2000)}})});
 await cdp.send('Target.setAutoAttach',{autoAttach:true,waitForDebuggerOnStart:false,flatten:true});
 await attached;
 console.error('[p] attached',profSessions.length);
 // Fire the hanging click on the button (do NOT await; it never resolves).
 await page.evaluate(()=>{const gi=window.geckoInput;
   gi({op:1,evType:1,x:80,y:160,button:0,buttons:1,clickCount:1});
   gi({op:1,evType:2,x:80,y:160,button:0,buttons:0,clickCount:1});});
 await new Promise(r=>setTimeout(r,800)); // let it get into the hang
 for(const sid of profSessions){try{await cdp.send('Profiler.start',{},sid)}catch(e){}}
 console.error('[p] profiling 6s during hang');
 await new Promise(r=>setTimeout(r,6000));
 const withTimeout=(p,ms)=>Promise.race([p,new Promise((_,rej)=>setTimeout(()=>rej(new Error('to')),ms))]);
 const stopped=await Promise.all(profSessions.map(sid=>withTimeout(cdp.send('Profiler.stop',{},sid),8000).then(r=>r).catch(()=>null)));
 const IDLE=new Set(['__timedwait_cp','emscripten_futex_wait','(idle)','__emscripten_thread_mailbox_await','_emscripten_yield','pthread_cond_wait','__pthread_cond_timedwait','sched_yield','___syscall__newselect','__syscall__newselect','poll','__syscall_poll']);
 // For each target: total active (non-idle) ms and the deepest hot inclusive stack frames.
 const out=[];
 for(let ti=0;ti<stopped.length;ti++){const prof=stopped[ti];if(!prof||!prof.profile||!prof.profile.nodes)continue;
   const p=prof.profile;const info=sidInfo.get(profSessions[ti])||{};
   const byId=new Map(p.nodes.map(n=>[n.id,n]));const parent=new Map();
   for(const n of p.nodes)for(const c of(n.children||[]))parent.set(c,n.id);
   const fnOf=(id)=>{const n=byId.get(id);return n?(n.callFrame.functionName||'(anon)'):null};
   const samples=p.samples||p.nodes.flatMap(n=>Array(n.hitCount||0).fill(n.id));
   const deltas=p.timeDeltas||samples.map(()=>500);
   const self=new Map();const incl=new Map();let active=0;
   for(let i=0;i<samples.length;i++){const leaf=samples[i];const n=byId.get(leaf);if(!n)continue;const us=Math.max(0,deltas[i]||0);
     const lf=n.callFrame.functionName||'(anon)';self.set(lf,(self.get(lf)||0)+us);
     if(!IDLE.has(lf))active+=us;
     const onStack=new Set();let id=leaf;while(id!=null){const f=fnOf(id);if(f)onStack.add(f);id=parent.get(id)}
     for(const f of onStack)incl.set(f,(incl.get(f)||0)+us);}
   // Find the thread whose stack went through the input/event-dispatch path.
   const EVKEYS=['do_mouse','SynthesizeMouse','HandleEvent','EventStateManager','EventDispatcher','DispatchEvent','PresShell','nsContentUtils','EventListenerManager','CallEventHandler','PumpEvents','nsFocusManager','FlushPendingNotifications'];
   const inclKeys=[...incl.keys()];
   const isEvent=inclKeys.some(k=>EVKEYS.some(e=>k.includes(e)));
   if(!isEvent && active<300)continue; // keep the event thread even if "idle"
   const topSelf=[...self.entries()].sort((a,b)=>b[1]-a[1]).slice(0,8).map(([f,u])=>f.slice(0,55)+':'+Math.round(u/1000));
   const GEN=new Set(['(program)','(root)','(idle)','wasm-to-js','nsThread::ProcessNextEvent(bool, bool*)','NS_ProcessNextEvent(nsIThread*, bool)','MessageLoop::Run()','nsThread::ThreadFunc(void*)','invokeEntryPoint','handleMessage','__original_main','_main_thread','main','__main_argc_argv','emscripten_proxy_main','MessageLoop::RunInternal()','MessageLoop::RunHandler()','mozilla::ipc::MessagePumpForNonMainThreads::Run(base::Messag']);
   const topIncl=[...incl.entries()].filter(([f])=>!GEN.has(f)&&!f.startsWith('js-to-wasm')).sort((a,b)=>b[1]-a[1]).slice(0,30).map(([f,u])=>f.slice(0,68)+':'+Math.round(u/1000));
   out.push({type:info.type,url:info.url.slice(0,36),activeMs:Math.round(active/1000),isEvent,topSelf,topIncl});}
 ws.close();await browser.close();server.close();
 out.sort((a,b)=>(b.isEvent?1:0)-(a.isEvent?1:0)||b.activeMs-a.activeMs);
 console.log(JSON.stringify(out.slice(0,4),null,1));
 process.exit(0);
})().catch(e=>{console.error('[p] fatal',e);process.exit(1)});
