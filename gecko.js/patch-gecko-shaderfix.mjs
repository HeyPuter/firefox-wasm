#!/usr/bin/env node
// Post-link patch for wasm/gecko.js (the emscripten glue, regenerated on every
// link). WebRender's GLSL declares some `out` varyings AFTER main() (pattern
// code is #included after the framework that defines main). That is legal for a
// native GL driver, but when the compositor's GL context is a *host browser's*
// WebGL2 (our emscripten passthrough) some implementations -- notably Firefox --
// run ANGLE's "initialize output variables" pass, which injects `out = 0` at the
// top of main() and then references the varying before its later declaration ->
// "undeclared", so the shader fails to compile and GPU mode shows nothing.
//
// Fix: in _glShaderSource, for vertex sources, hoist global `varying`/`out`
// declarations that appear after main() up to just after the prefix's feature
// defines (preserving any #ifdef guard), expanding the `varying` macro to `out`.
// Chrome tolerates the original order, so this is a no-op there.
//
// Idempotent: re-running on an already-patched file does nothing.
import { readFileSync, writeFileSync } from 'node:fs';

const path = process.argv[2];
if (!path) { console.error('usage: patch-gecko-shaderfix.mjs <gecko.js>'); process.exit(1); }

let src = readFileSync(path, 'utf8');

// Match the _glShaderSource body whitespace-tolerantly (emscripten's codegen
// indentation has changed across versions, e.g. 1 -> 2 spaces in 6.0.1).
const CALL_RE = /var source = GL\.getSource\(shader, count, string, length\);\s*\n\s*GLctx\.shaderSource\(GL\.shaders\[shader\], source\);/;
const CALL_TO = 'var source = GL.getSource(shader, count, string, length);\n  try { source = __wrHoistVaryings(source); } catch(e){}\n  GLctx.shaderSource(GL.shaders[shader], source);';

const FN = `
function __wrHoistVaryings(src) {
 if (!/^#define WR_VERTEX_SHADER\\s*$/m.test(src)) return src;
 var lines = src.split('\\n');
 var declRe = /^\\s*(?:flat\\s+|smooth\\s+)?(?:varying|out)\\s+(?:(?:highp|mediump|lowp)\\s+)?(?:float|int|uint|vec[234]|ivec[234]|uvec[234]|mat[234])\\s+\\w+\\s*;\\s*$/;
 var condStack = [], braceDepth = 0, pastMain = false, insertIdx = -1, hoist = [];
 for (var j = 0; j < lines.length; j++) {
  var L = lines[j], t = L.trim();
  if (insertIdx < 0 && !(/^#version/.test(t) || /^\\/\\/ shader:/.test(t) || t === '' ||
      /^#define (WR_VERTEX_SHADER|WR_FRAGMENT_SHADER|PLATFORM_\\w+|WR_MAX_VERTEX_TEXTURE_WIDTH\\b|WR_FEATURE_\\w+)/.test(t))) insertIdx = j;
  if (/^#\\s*(if|ifdef|ifndef)\\b/.test(t)) { condStack.push({ line: t, isElse: false }); continue; }
  if (/^#\\s*(else|elif)\\b/.test(t)) { if (condStack.length) condStack[condStack.length - 1].isElse = true; continue; }
  if (/^#\\s*endif\\b/.test(t)) { condStack.pop(); continue; }
  if (!pastMain && /\\bvoid\\s+main\\s*\\(/.test(L)) pastMain = true;
  if (pastMain && braceDepth === 0 && declRe.test(L) && !condStack.some(function (f) { return f.isElse; })) {
   hoist.push({ decl: t.replace(/\\bvarying\\b/, 'out'), guards: condStack.map(function (f) { return f.line; }) });
   lines[j] = '';
  }
  for (var k = 0; k < L.length; k++) { var c = L[k]; if (c === '{') braceDepth++; else if (c === '}') { if (braceDepth > 0) braceDepth--; } }
 }
 if (!hoist.length) return src;
 if (insertIdx < 0) insertIdx = 1;
 var block = [];
 for (var h = 0; h < hoist.length; h++) {
  var g = hoist[h].guards;
  for (var a = 0; a < g.length; a++) block.push(g[a]);
  block.push(hoist[h].decl);
  for (var b2 = 0; b2 < g.length; b2++) block.push('#endif');
 }
 lines.splice(insertIdx, 0, block.join('\\n'));
 return lines.join('\\n');
}
`;

// --- Patch 1: WebRender shader hoist (host WebGL) ---
if (!src.includes('__wrHoistVaryings')) {
  if (!CALL_RE.test(src)) {
    console.error('patch-gecko-shaderfix: could not find the _glShaderSource call site; emscripten output may have changed -- update this patch.');
    process.exit(1);
  }
  src = src.replace(CALL_RE, FN + '\n' + CALL_TO);
  console.log('patch-gecko-shaderfix: injected __wrHoistVaryings into ' + path);
}

// --- Patch 2: proxied-JS completion (emscripten 6.0.x) ---
// _emscripten_receive_on_main_thread_js runs a proxied JS function on the main
// thread and, when a completion ctx is present, does `rtn.then(...)` -- assuming
// the proxied function returned a Promise. Our `__proxy:'sync'` library functions
// (wisp-syscalls.js socket/select/poll/lookup_name) and MAIN_THREAD_EM_ASM calls
// return plain values, so `.then` throws ("rtn.then is not a function") and the
// proxied syscall never completes -> WISP networking hangs. Wrap in Promise.resolve
// so both sync values and real Promises complete correctly.
const PROXY_FROM = 'rtn.then(rtn => __emscripten_run_js_on_main_thread_done(ctx, ctxArgs, rtn));';
const PROXY_TO = 'Promise.resolve(rtn).then(rtn => __emscripten_run_js_on_main_thread_done(ctx, ctxArgs, rtn));';
if (!src.includes(PROXY_TO)) {
  if (!src.includes(PROXY_FROM)) {
    console.error('patch-gecko-shaderfix: could not find the proxied-JS completion call site; emscripten output may have changed -- update this patch.');
    process.exit(1);
  }
  src = src.replace(PROXY_FROM, PROXY_TO);
  console.log('patch-gecko-shaderfix: wrapped proxied-JS completion in Promise.resolve in ' + path);
}

// --- Patch 3: scoped (manual) JSPI for the GPU present-yield ---
// We deliberately do NOT build with -sJSPI: global JSPI makes EVERY async op (the
// OPFS backend, image decode, proxy waits) suspend, and those die ("SuspendError:
// trying to suspend JS frames") under Gecko's pervasive JS frames -- the xptcall
// trampoline (WasmInvoke) on every JS->XPCOM call, DOM binding entrypoints, EM_ASM.
// JSPI's WebAssembly.Suspending/promising are raw browser APIs (Chromium 137+) that
// work on a plain wasm; -sJSPI just auto-wraps everything. So we wire JSPI for ONLY
// gl_present_yield, in two surgical spots:
//
//  (a) the gl_present_yield IMPORT becomes WebAssembly.Suspending, so calling it from
//      wasm suspends the calling stack until its Promise (a setTimeout(0) macrotask)
//      resolves; and
//  (b) the pthread ENTRY (invokeEntryPoint) becomes WebAssembly.promising, so the
//      thread runs on a JSPI stack that the suspend can unwind to.
//
// (b) is the correct boundary: the actual SwapBuffers stack is
//   onmessage('run') -> invokeEntryPoint -> nsThread::ThreadFunc
//     -> MessagePumpForNonMainThreads::Run -> NS_ProcessNextEvent
//     -> RenderThread::HandleWrNotifierEvents -> ... -> SwapBuffers -> gl_present_yield.
// i.e. the Renderer thread reaches the present through its own blocking message loop,
// which lives inside invokeEntryPoint -- NOT through the emscripten proxy/mailbox
// executors. Wrapping the entry is exactly what -sJSPI auto-does for pthread entries.
// When gl_present_yield suspends, invokeEntryPoint returns a pending Promise back to
// onmessage, freeing the worker's event loop -- THAT is when the browser implicit-
// presents the Renderer thread's transferred OffscreenCanvas to the #screen placeholder
// -- then the setTimeout(0) resumes the thread. Every other thread's entry is also
// promising but never hits a Suspending import, so it runs straight through (returning
// an already-resolved Promise); no collateral, no other op changes its block model.
const SUSP_FROM = 'gl_present_yield: _gl_present_yield,';
const SUSP_TO = 'gl_present_yield: new WebAssembly.Suspending(_gl_present_yield),';
if (!src.includes(SUSP_TO)) {
  if (!src.includes(SUSP_FROM)) {
    console.error('patch-gecko-shaderfix: gl_present_yield import site not found; emscripten output may have changed -- update this patch.');
    process.exit(1);
  }
  src = src.replace(SUSP_FROM, SUSP_TO);
  console.log('patch-gecko-shaderfix: wrapped gl_present_yield import with WebAssembly.Suspending in ' + path);
}
// invokeEntryPoint: run the thread main on a promising stack. The thread main may
// suspend (RenderThread) and run forever (its message loop), so finish() -- which
// exits the pthread -- must wait for the returned Promise instead of running inline.
const ENTRY_FROM =
  '  var result = getWasmTableEntry(ptr)(arg);\n' +
  '  checkStackCookie();\n' +
  '  function finish(result) {\n' +
  '    // In MINIMAL_RUNTIME the noExitRuntime concept does not apply to\n' +
  '    // pthreads. To exit a pthread with live runtime, use the function\n' +
  '    // emscripten_unwind_to_js_event_loop() in the pthread body.\n' +
  '    if (keepRuntimeAlive()) {\n' +
  '      EXITSTATUS = result;\n' +
  '      return;\n' +
  '    }\n' +
  '    __emscripten_thread_exit(result);\n' +
  '  }\n' +
  '  finish(result);\n';
const ENTRY_TO =
  '  // [manual JSPI] promising entry so gl_present_yield (SwapBuffers) can suspend.\n' +
  '  var result = WebAssembly.promising(getWasmTableEntry(ptr))(arg);\n' +
  '  function finish(result) {\n' +
  '    checkStackCookie();\n' +
  '    if (keepRuntimeAlive()) {\n' +
  '      EXITSTATUS = result;\n' +
  '      return;\n' +
  '    }\n' +
  '    __emscripten_thread_exit(result);\n' +
  '  }\n' +
  '  // Mirror the onmessage(\'run\') try/catch: WebAssembly.promising turns a\n' +
  '  // synchronous throw inside the entry into a Promise rejection, so the try/catch\n' +
  '  // around invokeEntryPoint no longer sees it. \'unwind\' (thrown by\n' +
  '  // emscripten_unwind_to_js_event_loop -- the normal keep-the-thread-alive signal,\n' +
  '  // a real throw here because we are NOT global -sJSPI) must be swallowed; anything\n' +
  '  // else is re-thrown so the worker still surfaces real pthread crashes.\n' +
  '  result.then(finish, (ex) => { if (ex != "unwind") throw ex; });\n';
if (!src.includes('[manual JSPI] promising entry')) {
  if (!src.includes(ENTRY_FROM)) {
    console.error('patch-gecko-shaderfix: invokeEntryPoint body not found; emscripten output may have changed -- update this patch.');
    process.exit(1);
  }
  src = src.replace(ENTRY_FROM, ENTRY_TO);
  console.log('patch-gecko-shaderfix: made the pthread entry (invokeEntryPoint) promising in ' + path);
}

writeFileSync(path, src);
