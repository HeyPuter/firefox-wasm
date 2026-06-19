// Minimal SpiderMonkey-only embedder for fast JS->wasm JIT iteration in node.
// Links libjs_static.a (no libxul/Gecko), evaluates a JS file passed as argv[1].
// The JIT (js/src/wasm/WasmJS.cpp) drives the wasmhost_* bridge (embed-js/wasm-host-bridge.js,
// shared with embed-xul) to compile/run its emitted modules on node's WebAssembly engine.
#include <cstdio>
#include <cstdlib>
#include <cstring>
#include <cerrno>
#include <vector>

#include "jsapi.h"
#include "jsfriendapi.h"

#include "js/CharacterEncoding.h"
#include "js/CompilationAndEvaluation.h"
#include "js/Conversions.h"
#include "js/Exception.h"
#include "js/GCAPI.h"
#include "js/Initialization.h"
#include "js/Realm.h"
#include "js/RealmOptions.h"
#include "js/SourceText.h"
#include "js/Warnings.h"

namespace js {
void DisableExtraThreads();  // vm/Runtime.h (non-public): run single-threaded
}

static bool PrintImpl(JSContext* cx, unsigned argc, JS::Value* vp) {
  JS::CallArgs args = JS::CallArgsFromVp(argc, vp);
  for (unsigned i = 0; i < args.length(); i++) {
    JS::RootedString s(cx, JS::ToString(cx, args[i]));
    if (!s) return false;
    JS::UniqueChars c = JS_EncodeStringToUTF8(cx, s);
    if (!c) return false;
    fprintf(stdout, "%s%s", i ? " " : "", c.get());
  }
  fprintf(stdout, "\n");
  fflush(stdout);
  args.rval().setUndefined();
  return true;
}

// dateNow(): milliseconds, for benchmark self-timing (octane uses Date.now; provide a
// monotonic-ish counter via the host through a JS shim instead -- here we expose performanceNow
// backed by the host clock injected from node as globalThis.__now set before eval).
static bool ReportError(JSContext* cx) {
  if (JS_IsExceptionPending(cx)) {
    JS::ExceptionStack stack(cx);
    if (JS::StealPendingExceptionStack(cx, &stack)) {
      JS::RootedValue exn(cx, stack.exception());
      JS::RootedString s(cx, JS::ToString(cx, exn));
      if (s) {
        JS::UniqueChars c = JS_EncodeStringToUTF8(cx, s);
        if (c) fprintf(stderr, "[embed] uncaught: %s\n", c.get());
      }
    }
  }
  return false;
}

static const JSClassOps kGlobalOps = {
    .trace = JS_GlobalObjectTraceHook,
};
static const JSClass kGlobalClass = {"global", JSCLASS_GLOBAL_FLAGS, &kGlobalOps};

static bool EvalFile(JSContext* cx, JS::HandleObject global, const char* path) {
  FILE* f = fopen(path, "rb");
  if (!f) {
    fprintf(stderr, "[embed] cannot open %s\n", path);
    return false;
  }
  fseek(f, 0, SEEK_END);
  long n = ftell(f);
  fseek(f, 0, SEEK_SET);
  std::vector<char> buf(size_t(n) + 1);
  if (fread(buf.data(), 1, size_t(n), f) != size_t(n)) {
    fclose(f);
    return false;
  }
  fclose(f);
  buf[size_t(n)] = 0;

  JS::SourceText<mozilla::Utf8Unit> src;
  if (!src.init(cx, buf.data(), size_t(n), JS::SourceOwnership::Borrowed)) return false;
  JS::CompileOptions options(cx);
  options.setFileAndLine(path, 1);
  JS::RootedValue rval(cx);
  if (!JS::Evaluate(cx, options, src, &rval)) return ReportError(cx);
  return true;
}

int main(int argc, char** argv) {
  if (argc < 2) {
    fprintf(stderr, "usage: embed <script.js> [more.js ...]\n");
    return 2;
  }
  if (!JS_Init()) {
    fprintf(stderr, "[embed] JS_Init failed\n");
    return 1;
  }
  js::DisableExtraThreads();  // this standalone build has no -pthread; run single-threaded
  JSContext* cx = JS_NewContext(JS::DefaultHeapMaxBytes);
  if (!cx) { fprintf(stderr, "[embed] NewContext failed errno=%d\n", errno); return 1; }
  if (!JS::InitSelfHostedCode(cx)) { fprintf(stderr, "[embed] InitSelfHostedCode failed\n"); return 1; }
  // Raise the GC heap limit (default is small) so memory-heavy benchmarks (splay) don't OOM.
  // Matches the js shell.
  JS_SetGCParameter(cx, JSGC_MAX_BYTES, 0xffffffff);
  JS_SetNativeStackQuota(cx, 8 * 1024 * 1024);
#ifdef JS_GC_ZEAL
  // GECKO_GCZEAL=<mode>[,<freq>]: force a GC zeal mode to VALIDATE JIT GC-barrier correctness
  // (mode 4 = VerifierPre, catches a missing pre-write barrier such as inline InitProp's shape
  // transition; mode 2 = Alloc, GC on every allocation). Needs --enable-gczeal build.
  if (const char* z = getenv("GECKO_GCZEAL")) {
    int mode = atoi(z);
    int freq = 1;
    if (const char* comma = strchr(z, ',')) freq = atoi(comma + 1);
    JS::SetGCZeal(cx, uint8_t(mode), uint32_t(freq < 1 ? 1 : freq));
    fprintf(stderr, "[embed] GC zeal mode=%d freq=%d\n", mode, freq);
  }
#endif

  JS::RealmOptions options;
  JS::RootedObject global(
      cx, JS_NewGlobalObject(cx, &kGlobalClass, nullptr, JS::FireOnNewGlobalHook, options));
  if (!global) { fprintf(stderr, "[embed] NewGlobalObject failed\n"); return 1; }

  int rc = 0;
  {
    JSAutoRealm ar(cx, global);
    if (!JS::InitRealmStandardClasses(cx)) { fprintf(stderr, "[embed] stdclasses failed\n"); return 1; }
    if (!JS_DefineFunction(cx, global, "print", PrintImpl, 1, 0)) return 1;
    // octane/base.js uses console.log; alias it to print via a tiny shim object.
    const char* shim =
        "var console = { log: print, error: print, warn: print };\n"
        "var performance = { now: function(){ return Date.now(); } };\n";
    {
      JS::SourceText<mozilla::Utf8Unit> s;
      if (!s.init(cx, shim, strlen(shim), JS::SourceOwnership::Borrowed)) return 1;
      JS::CompileOptions o(cx);
      o.setFileAndLine("<shim>", 1);
      JS::RootedValue r(cx);
      if (!JS::Evaluate(cx, o, s, &r)) {
        ReportError(cx);
        return 1;
      }
    }
    for (int i = 1; i < argc; i++) {
      if (!EvalFile(cx, global, argv[i])) {
        rc = 1;
        break;
      }
    }
  }

  JS_DestroyContext(cx);
  JS_ShutDown();
  return rc;
}
