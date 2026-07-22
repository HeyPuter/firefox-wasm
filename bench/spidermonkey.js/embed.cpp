// Minimal SpiderMonkey-only embedder for fast JS->wasm JIT iteration in node.
// Links libjs_static.a (no libxul/Gecko). Two roles:
//   1. octane/bench harness: each bare-path argv is a JS file, eval'd in order.
//   2. jit-test shell: understands the subset of the js-shell CLI that
//      jit_test.py emits (-e expr, -f file, -p prologue, --module, etc.) plus the
//      shell/testing builtins the suite relies on (assertEq, load, evaluate,
//      quit, gc, gczeal, newGlobal, inIon/inJit, ...). This lets the upstream
//      jit-test corpus validate the JS->wasm JIT for correctness AND for the
//      "stay in JIT" goal: the `do { f(); } while (!inIon())` warm-up loops only
//      terminate once `f` is wasm-JIT-compiled (inIon/inJit are backed by
//      js::wasm::WasmJitInWasm()).
#include <cstdio>
#include <cstdlib>
#include <cstring>
#include <cerrno>
#include <string>
#include <vector>

#include "jsapi.h"
#include "jsfriendapi.h"

#include "builtin/TestingFunctions.h"
#include "wasm/WasmJit.h"

#include "js/ArrayBuffer.h"
#include "js/CharacterEncoding.h"
#include "js/CompilationAndEvaluation.h"
#include "js/Conversions.h"
#include "js/Equality.h"
#include "js/Exception.h"
#include "js/GCAPI.h"
#include "js/GlobalObject.h"
#include "js/Initialization.h"
#include "js/PropertyAndElement.h"
#include "js/Realm.h"
#include "js/RealmOptions.h"
#include "js/SourceText.h"
#include "js/Warnings.h"

namespace js {
void DisableExtraThreads();  // vm/Runtime.h (non-public): run single-threaded
}

// quit([status]) sets these and returns false with NO pending exception, which
// SpiderMonkey treats as an uncatchable error that unwinds straight to main.
static bool gQuitting = false;
static int gExitCode = 0;
// Directory of the file currently being eval'd, for loadRelativeToScript().
static std::string gScriptDir;

extern "C" void WJTraceDumpNow();
static bool WjTraceDump(JSContext* cx, unsigned argc, JS::Value* vp) {
  JS::CallArgs args = JS::CallArgsFromVp(argc, vp);
  WJTraceDumpNow();
  args.rval().setUndefined();
  return true;
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

// readWasm(path) -> ArrayBuffer: read a (possibly huge) file into an ArrayBuffer
// so tests can decode real modules (e.g. the 247MB gecko.wasm) without embedding
// them as JS array literals.
static bool ReadWasmImpl(JSContext* cx, unsigned argc, JS::Value* vp) {
  JS::CallArgs args = JS::CallArgsFromVp(argc, vp);
  if (args.length() < 1) { JS_ReportErrorASCII(cx, "readWasm: need path"); return false; }
  JS::RootedString s(cx, JS::ToString(cx, args[0]));
  if (!s) return false;
  JS::UniqueChars path = JS_EncodeStringToUTF8(cx, s);
  if (!path) return false;
  FILE* f = fopen(path.get(), "rb");
  if (!f) { JS_ReportErrorASCII(cx, "readWasm: cannot open %s", path.get()); return false; }
  fseek(f, 0, SEEK_END);
  long n = ftell(f);
  fseek(f, 0, SEEK_SET);
  if (n < 0) { fclose(f); JS_ReportErrorASCII(cx, "readWasm: ftell failed"); return false; }
  // Allocate with JS_malloc so the buffer is JS_free-compatible (the ArrayBuffer
  // takes ownership and frees it with the JS allocator).
  void* buf = JS_malloc(cx, size_t(n) ? size_t(n) : 1);
  if (!buf) { fclose(f); return false; }
  if (fread(buf, 1, size_t(n), f) != size_t(n)) {
    fclose(f); JS_free(cx, buf); JS_ReportErrorASCII(cx, "readWasm: short read"); return false;
  }
  fclose(f);
  JS::RootedObject ab(cx, JS::NewArrayBufferWithContents(
                             cx, size_t(n), buf,
                             JS::NewArrayBufferOutOfMemory::CallerMustFreeMemory));
  if (!ab) { JS_free(cx, buf); return false; }  // ownership transferred on success
  args.rval().setObject(*ab);
  return true;
}

static bool ReportError(JSContext* cx) {
  if (JS_IsExceptionPending(cx)) {
    JS::ExceptionStack stack(cx);
    if (JS::StealPendingExceptionStack(cx, &stack)) {
      JS::RootedValue exn(cx, stack.exception());
      JS::RootedString s(cx, JS::ToString(cx, exn));
      if (s) {
        JS::UniqueChars c = JS_EncodeStringToUTF8(cx, s);
        if (c) { fprintf(stderr, "[embed] uncaught: %s\n", c.get()); return false; }
      }
      // ToString threw / failed: still report SOMETHING (class + value tag) --
      // a silent exit-1 is undebuggable.
      JS_ClearPendingException(cx);
      const char* what = exn.isObject() ? JS::GetClass(&exn.toObject())->name
                        : exn.isString() ? "string"
                        : exn.isNumber() ? "number" : "other";
      fprintf(stderr, "[embed] uncaught (unstringifiable): kind=%s\n", what);
    } else {
      fprintf(stderr, "[embed] uncaught: <uncatchable/OOM — StealPendingExceptionStack failed>\n");
    }
  } else {
    fprintf(stderr, "[embed] script failed with NO pending exception (quit()/uncatchable)\n");
  }
  return false;
}

// --- shell builtins the jit-test suite needs (mirroring js/src/shell/js.cpp) ---

static bool AssertEq(JSContext* cx, unsigned argc, JS::Value* vp) {
  JS::CallArgs args = JS::CallArgsFromVp(argc, vp);
  if (args.length() < 2) {
    JS_ReportErrorASCII(cx, "assertEq requires at least 2 arguments");
    return false;
  }
  bool equal;
  if (!JS::SameValue(cx, args[0], args[1], &equal)) return false;
  if (!equal) {
    JS::RootedString a(cx, JS::ToString(cx, args[0]));
    JS::RootedString b(cx, JS::ToString(cx, args[1]));
    JS::UniqueChars ac = a ? JS_EncodeStringToUTF8(cx, a) : nullptr;
    JS::UniqueChars bc = b ? JS_EncodeStringToUTF8(cx, b) : nullptr;
    JS::UniqueChars msg;
    if (args.length() >= 3) {
      JS::RootedString m(cx, JS::ToString(cx, args[2]));
      if (m) msg = JS_EncodeStringToUTF8(cx, m);
    }
    JS_ReportErrorUTF8(cx, "Assertion failed: got %s, expected %s%s%s",
                       ac ? ac.get() : "?", bc ? bc.get() : "?",
                       msg ? ": " : "", msg ? msg.get() : "");
    return false;
  }
  args.rval().setUndefined();
  return true;
}

static bool EvalUtf8(JSContext* cx, const char* bytes, size_t len,
                     const char* file, JS::MutableHandleValue rval) {
  JS::SourceText<mozilla::Utf8Unit> src;
  if (!src.init(cx, bytes, len, JS::SourceOwnership::Borrowed)) return false;
  JS::CompileOptions options(cx);
  options.setFileAndLine(file, 1);
  return JS::Evaluate(cx, options, src, rval);
}

static bool ReadFile(const char* path, std::vector<char>& out) {
  FILE* f = fopen(path, "rb");
  if (!f) return false;
  fseek(f, 0, SEEK_END);
  long n = ftell(f);
  fseek(f, 0, SEEK_SET);
  out.resize(size_t(n) + 1);
  bool ok = fread(out.data(), 1, size_t(n), f) == size_t(n);
  fclose(f);
  if (!ok) return false;
  out[size_t(n)] = 0;
  return true;
}

static std::string DirOf(const char* path) {
  const char* slash = strrchr(path, '/');
  return slash ? std::string(path, slash - path + 1) : std::string();
}

// Eval a file, tracking gScriptDir (for loadRelativeToScript) across nesting.
static bool EvalFileTracked(JSContext* cx, const char* path,
                            JS::MutableHandleValue rval) {
  std::vector<char> buf;
  if (!ReadFile(path, buf)) {
    JS_ReportErrorUTF8(cx, "cannot open %s", path);
    return false;
  }
  std::string saved = gScriptDir;
  gScriptDir = DirOf(path);
  bool ok = EvalUtf8(cx, buf.data(), buf.size() - 1, path, rval);
  gScriptDir = saved;
  return ok;
}

static bool Load(JSContext* cx, unsigned argc, JS::Value* vp) {
  JS::CallArgs args = JS::CallArgsFromVp(argc, vp);
  for (unsigned i = 0; i < args.length(); i++) {
    JS::RootedString s(cx, JS::ToString(cx, args[i]));
    if (!s) return false;
    JS::UniqueChars path = JS_EncodeStringToUTF8(cx, s);
    if (!path) return false;
    JS::RootedValue rval(cx);
    if (!EvalFileTracked(cx, path.get(), &rval)) return false;
  }
  args.rval().setUndefined();
  return true;
}

// read(path) -> file contents as a string (shell `read`/`snarf` primitive). Used by
// ubo-bench to load filter-list data. UTF-8 decoded (cosmetic filters carry unicode).
static bool Read(JSContext* cx, unsigned argc, JS::Value* vp) {
  JS::CallArgs args = JS::CallArgsFromVp(argc, vp);
  if (args.length() < 1) {
    JS_ReportErrorASCII(cx, "read: need a path");
    return false;
  }
  JS::RootedString s(cx, JS::ToString(cx, args[0]));
  if (!s) return false;
  JS::UniqueChars path = JS_EncodeStringToUTF8(cx, s);
  if (!path) return false;
  std::vector<char> buf;
  if (!ReadFile(path.get(), buf)) {
    JS_ReportErrorUTF8(cx, "read: cannot open %s", path.get());
    return false;
  }
  JSString* str =
      JS_NewStringCopyUTF8N(cx, JS::UTF8Chars(buf.data(), buf.size() - 1));
  if (!str) return false;
  args.rval().setString(str);
  return true;
}

// loadRelativeToScript(path): load a file resolved against the directory of the
// script currently executing (the shared jit-test helper-include mechanism).
static bool LoadRelativeToScript(JSContext* cx, unsigned argc, JS::Value* vp) {
  JS::CallArgs args = JS::CallArgsFromVp(argc, vp);
  for (unsigned i = 0; i < args.length(); i++) {
    JS::RootedString s(cx, JS::ToString(cx, args[i]));
    if (!s) return false;
    JS::UniqueChars rel = JS_EncodeStringToUTF8(cx, s);
    if (!rel) return false;
    std::string full = (rel.get()[0] == '/') ? rel.get() : gScriptDir + rel.get();
    JS::RootedValue rval(cx);
    if (!EvalFileTracked(cx, full.c_str(), &rval)) return false;
  }
  args.rval().setUndefined();
  return true;
}

// evaluate(code, [opts]) -- supports the common opts: global, fileName,
// lineNumber, noScriptRval. Enough for the bulk of the corpus.
static bool Evaluate(JSContext* cx, unsigned argc, JS::Value* vp) {
  JS::CallArgs args = JS::CallArgsFromVp(argc, vp);
  if (args.length() < 1 || !args[0].isString()) {
    JS_ReportErrorASCII(cx, "evaluate: first argument must be a string");
    return false;
  }
  JS::RootedString code(cx, args[0].toString());
  JS::UniqueChars bytes = JS_EncodeStringToUTF8(cx, code);
  if (!bytes) return false;

  JS::RootedObject targetGlobal(cx);
  const char* fileName = "@evaluate";
  int lineNumber = 1;
  if (args.length() >= 2 && args[1].isObject()) {
    JS::RootedObject opts(cx, &args[1].toObject());
    JS::RootedValue v(cx);
    if (!JS_GetProperty(cx, opts, "global", &v)) return false;
    if (v.isObject()) targetGlobal = &v.toObject();
    if (!JS_GetProperty(cx, opts, "lineNumber", &v)) return false;
    if (v.isInt32()) lineNumber = v.toInt32();
  }

  auto doEval = [&](JS::HandleObject g) -> bool {
    JS::SourceText<mozilla::Utf8Unit> src;
    if (!src.init(cx, bytes.get(), strlen(bytes.get()),
                  JS::SourceOwnership::Borrowed))
      return false;
    JS::CompileOptions o(cx);
    o.setFileAndLine(fileName, lineNumber);
    return JS::Evaluate(cx, o, src, args.rval());
  };

  if (targetGlobal) {
    targetGlobal = JS::GetNonCCWObjectGlobal(targetGlobal);
    JSAutoRealm ar(cx, targetGlobal);
    if (!doEval(targetGlobal)) return false;
    return JS_WrapValue(cx, args.rval());
  }
  JS::RootedObject self(cx, JS::CurrentGlobalOrNull(cx));
  return doEval(self);
}

static bool Quit(JSContext* cx, unsigned argc, JS::Value* vp) {
  JS::CallArgs args = JS::CallArgsFromVp(argc, vp);
  gQuitting = true;
  gExitCode = 0;
  if (args.length() > 0) {
    int32_t code = 0;
    if (JS::ToInt32(cx, args[0], &code)) gExitCode = code;
  }
  return false;  // uncatchable: no pending exception -> unwinds to main
}

// inIon()/inJit()/inWasmJit(): true while the caller is running wasm-JIT'd code.
static bool InWasmJit(JSContext* cx, unsigned argc, JS::Value* vp) {
  JS::CallArgs args = JS::CallArgsFromVp(argc, vp);
  args.rval().setBoolean(js::wasm::WasmJitInWasm());
  return true;
}

// __drainJit(): compile any functions deferred by GECKO_WJ_DEFERCOMPILE. Models a
// browser event-loop task boundary (where compile happens off the load critical
// path). Harnesses call it between iterations to validate throughput preservation.
static bool DrainJit(JSContext* cx, unsigned argc, JS::Value* vp) {
  JS::CallArgs args = JS::CallArgsFromVp(argc, vp);
  js::wasm::WasmJitDrainDeferred();
  args.rval().setUndefined();
  return true;
}

// __wjStats(): return a JSON string of the JIT's always-on counters (entry
// states, JIT/deopt totals + rate, top deopt fns, deopt-by-op). Printf-free
// introspection (task #57) -- queryable mid-run from JS / browser DevTools.
static bool WjStats(JSContext* cx, unsigned argc, JS::Value* vp) {
  JS::CallArgs args = JS::CallArgsFromVp(argc, vp);
  static char buf[8192];
  js::wasm::WJStatsJSON(buf, sizeof(buf));
  JSString* str = JS_NewStringCopyZ(cx, buf);
  if (!str) return false;
  args.rval().setString(str);
  return true;
}

// version()/options(): accepted no-op stubs (used by a handful of tests).
static bool NoopUndef(JSContext* cx, unsigned argc, JS::Value* vp) {
  JS::CallArgs args = JS::CallArgsFromVp(argc, vp);
  args.rval().setUndefined();
  return true;
}

static const JSClassOps kGlobalOps = {
    .trace = JS_GlobalObjectTraceHook,
};
static const JSClass kGlobalClass = {"global", JSCLASS_GLOBAL_FLAGS, &kGlobalOps};

static bool NewGlobal(JSContext* cx, unsigned argc, JS::Value* vp);

// Register the shell + testing builtins on `global` (its realm must be current).
// Shared by the main global and newGlobal()-created globals.
static bool DefineShellGlobal(JSContext* cx, JS::HandleObject global) {
  if (!js::DefineTestingFunctions(cx, global, /*fuzzingSafe=*/false,
                                  /*disableOOMFunctions=*/false))
    return false;
  return JS_DefineFunction(cx, global, "wjTraceDump", WjTraceDump, 0, 0) &&
         JS_DefineFunction(cx, global, "__drainJit", DrainJit, 0, 0) &&
         JS_DefineFunction(cx, global, "__wjStats", WjStats, 0, 0) &&
         JS_DefineFunction(cx, global, "print", PrintImpl, 1, 0) &&
         JS_DefineFunction(cx, global, "readWasm", ReadWasmImpl, 1, 0) &&
         JS_DefineFunction(cx, global, "assertEq", AssertEq, 2, 0) &&
         JS_DefineFunction(cx, global, "load", Load, 1, 0) &&
         JS_DefineFunction(cx, global, "read", Read, 1, 0) &&
         JS_DefineFunction(cx, global, "snarf", Read, 1, 0) &&
         JS_DefineFunction(cx, global, "loadRelativeToScript", LoadRelativeToScript, 1, 0) &&
         JS_DefineFunction(cx, global, "setJitCompilerOption", NoopUndef, 2, 0) &&
         JS_DefineFunction(cx, global, "evaluate", Evaluate, 2, 0) &&
         JS_DefineFunction(cx, global, "quit", Quit, 0, 0) &&
         JS_DefineFunction(cx, global, "version", NoopUndef, 0, 0) &&
         JS_DefineFunction(cx, global, "options", NoopUndef, 0, 0) &&
         // Ion-recovery / profiler introspection: accepted as no-ops so the
         // test bodies' value assertions still run (the Ion-internal recovery
         // property they check does not apply to the wasm JIT).
         JS_DefineFunction(cx, global, "assertRecoveredOnBailout", NoopUndef, 2, 0) &&
         JS_DefineFunction(cx, global, "enableGeckoProfiling", NoopUndef, 0, 0) &&
         JS_DefineFunction(cx, global, "enableGeckoProfilingWithSlowAssertions", NoopUndef, 0, 0) &&
         JS_DefineFunction(cx, global, "disableGeckoProfiling", NoopUndef, 0, 0) &&
         // Ion is disabled in this build; back inIon/inJit with the wasm JIT.
         JS_DefineFunction(cx, global, "inIon", InWasmJit, 0, 0) &&
         JS_DefineFunction(cx, global, "inJit", InWasmJit, 0, 0) &&
         JS_DefineFunction(cx, global, "inWasmJit", InWasmJit, 0, 0) &&
         JS_DefineFunction(cx, global, "newGlobal", NewGlobal, 0, 0);
}

// newGlobal([options]) -- creates a fresh global with standard classes and the
// shell/testing builtins. Options are accepted but ignored (sufficient for the
// bulk of the corpus, which only needs an isolated global to eval in).
static bool NewGlobal(JSContext* cx, unsigned argc, JS::Value* vp) {
  JS::CallArgs args = JS::CallArgsFromVp(argc, vp);
  JS::RealmOptions options;
  JS::RootedObject g(cx, JS_NewGlobalObject(cx, &kGlobalClass, nullptr,
                                            JS::FireOnNewGlobalHook, options));
  if (!g) return false;
  {
    JSAutoRealm ar(cx, g);
    if (!JS::InitRealmStandardClasses(cx)) return false;
    if (!DefineShellGlobal(cx, g)) return false;
  }
  args.rval().setObject(*g);
  return JS_WrapValue(cx, args.rval());
}

static bool EvalFile(JSContext* cx, const char* path) {
  std::vector<char> buf;
  if (!ReadFile(path, buf)) {
    fprintf(stderr, "[embed] cannot open %s\n", path);
    return false;
  }
  std::string saved = gScriptDir;
  gScriptDir = DirOf(path);
  JS::RootedValue rval(cx);
  bool ok = EvalUtf8(cx, buf.data(), buf.size() - 1, path, &rval);
  gScriptDir = saved;
  // Top-level script finished == a task boundary (JS stack empty). Compile any
  // functions GECKO_WJ_DEFERCOMPILE deferred off this task's critical path. Models
  // the browser event loop draining between tasks. No-op unless deferral queued.
  js::wasm::WasmJitDrainDeferred();
  if (!ok) {
    if (gQuitting) return false;
    return ReportError(cx);
  }
  return true;
}

static bool EvalExpr(JSContext* cx, const char* expr) {
  JS::RootedValue rval(cx);
  if (!EvalUtf8(cx, expr, strlen(expr), "-e", &rval)) {
    if (gQuitting) return false;
    return ReportError(cx);
  }
  return true;
}

int main(int argc, char** argv) {
  if (argc < 2) {
    fprintf(stderr, "usage: embed <script.js | -e expr | -f file | -p file> ...\n");
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
  JS_SetGCParameter(cx, JSGC_MAX_BYTES, 0xffffffff);
  // Quota is FAR below the wasm -sSTACK_SIZE (64MB) for two reasons: (1) the huge
  // headroom means deep JS recursion throws a catchable "too much recursion" long
  // before the native wasm stack overflows into an uncatchable `unreachable` trap
  // (the web-tooling init bug); (2) under the JIT, recursion bounces wasm->JS->wasm
  // through the call bridge and is bounded by the OUTER V8 stack (~node --stack-size,
  // ~8MB) -- a quota larger than that overflows V8 uncatchably (regressed cdjs). 8MB
  // satisfies both: catchable-before-trap AND within the V8 bridge budget.
  JS_SetNativeStackQuota(cx, 8 * 1024 * 1024);
  // Diagnostic: disable generational GC (nursery) entirely -> all objects are
  // tenured and never moved by a minor GC. Used to confirm whether a mid-render
  // minor GC moving a nursery object held stale in a wasm local is the raytrace
  // mega correctness bug. Leak the guard so GGC stays disabled for the whole run.
  if (getenv("GECKO_NO_NURSERY")) {
    new JS::AutoDisableGenerationalGC(cx);
    fprintf(stderr, "[embed] generational GC (nursery) DISABLED via GECKO_NO_NURSERY\n");
  }
  if (const char* nb = getenv("GECKO_NURSERY_MB")) {
    uint32_t bytes = uint32_t(atoi(nb)) * 1024u * 1024u;
    JS_SetGCParameter(cx, JSGC_MAX_NURSERY_BYTES, bytes);
    fprintf(stderr, "[embed] nursery max set to %s MB\n", nb);
  }
#ifdef JS_GC_ZEAL
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

    if (!DefineShellGlobal(cx, global)) {
      fprintf(stderr, "[embed] DefineShellGlobal failed\n");
      return 1;
    }
    const char* shim =
        "var console = { log: print, error: print, warn: print };\n"
        "var performance = { now: function(){ return Date.now(); } };\n";
    if (!EvalExpr(cx, shim)) { return 1; }

    // Walk argv as a js-shell-style command line.
    for (int i = 1; i < argc && !gQuitting; i++) {
      const char* a = argv[i];
      bool ok = true;
      if (strcmp(a, "-e") == 0 && i + 1 < argc) {
        ok = EvalExpr(cx, argv[++i]);
      } else if ((strcmp(a, "-f") == 0 || strcmp(a, "-p") == 0) && i + 1 < argc) {
        ok = EvalFile(cx, argv[++i]);
      } else if (strcmp(a, "--module") == 0 && i + 1 < argc) {
        ok = EvalFile(cx, argv[++i]);  // best-effort: eval module as script
      } else if ((strcmp(a, "--module-load-path") == 0 ||
                  strcmp(a, "--selfhosted-xdr-path") == 0 ||
                  strcmp(a, "--selfhosted-xdr-mode") == 0 ||
                  strcmp(a, "-P") == 0) &&
                 i + 1 < argc) {
        i++;  // value-taking flag we ignore
      } else if (a[0] == '-') {
        // Unknown valueless flag (jitflags like --ion-eager, --no-baseline,
        // --setpref=..., --suppress-minidump): ignore.
      } else {
        ok = EvalFile(cx, a);  // bare path (test file / octane bench)
      }
      if (!ok) { rc = 1; break; }
    }
    if (gQuitting) rc = gExitCode;
  }

  JS_DestroyContext(cx);
  JS_ShutDown();
  return rc;
}
