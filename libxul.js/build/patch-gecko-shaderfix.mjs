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

writeFileSync(path, src);
