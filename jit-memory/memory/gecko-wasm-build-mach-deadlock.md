---
name: gecko-wasm-build-mach-deadlock
description: ./mach build deadlocks in the Claude Code Bash tool; compile/link libxul via plain make instead.
metadata: 
  node_type: memory
  type: project
  originSessionId: d2f741b0-a9a8-4dd9-b382-40d7988d83d6
---

`./mach build` **reliably deadlocks** when launched from the Claude Code Bash tool
(both foreground-ish and `run_in_background`, with or without `dangerouslyDisableSandbox`).
Symptom: mach's python sits in `do_wait` using ~0 CPU for many minutes while one of
its worker children is a `<defunct>` zombie (a fork-in-multithreaded-python style
hang in mach's process pool). It NEVER compiles anything (empty output, no clang
subprocesses). It works fine in a normal interactive terminal (that's why builds were
"2-3 min" before) — the breakage is specific to this tool's subprocess environment.

**Workaround — drive the RecursiveMake backend directly (no python):**
The objdir is `/home/velzie/src/gecko-wasm/obj-full-emscripten` (release:
`...-release`). Backend is RecursiveMake; `GMAKE=/usr/bin/make`. After editing a
`firefox/` C++ file:
1. `make -C obj-full-emscripten/<dir>` recompiles that subtree (detects the changed
   source vs its unified blob; e.g. `widget/PuppetWidget.cpp` lives in
   `widget/Unified_cpp_widget1.cpp` -> `Unified_cpp_widget1.o`). rc=0 + check the .o
   mtime updated.
2. `make -C obj-full-emscripten/toolkit/library` relinks `dist/bin/libxul.so`
   (check its mtime/size changed).
3. `cd embed-xul && bash restrip-relink-web.sh` stages `dist/bin/libxul.so` ->
   `libxul.stripped.so` and relinks `gecko.wasm` (~25s, look for `link rc=0`).

`emcc`/`clang`/the `build-embed-full.sh` relink all work fine from the Bash tool —
only mach's python wrapper hangs. The `make` subtree build is the substitute for
`./mach build` here. See [[gecko-wasm-toolchain]] for the mozconfig env.

## STALE-OBJECT GOTCHA (silent, cost hours; 2026-06-18)
`make -C js/src` SOMETIMES does NOT recompile an edited source even though its .o is
older than the .cpp — the RecursiveMake dep tracking misses it. Observed twice in one
session: after editing, `Unified_cpp_js_src_wasm4.o` was simply MISSING (deleted by a
prior failed compile, never rebuilt) and `vm/PortableBaselineInterpret.o` stayed at its
OLD mtime (never recompiled). The link still "succeeds" (rc=0) using the STALE/old .o,
so libxul builds clean but the WASM has a stale TU. Concretely: changing the signature
of `js::wasm::WasmJitRunCall` (added a JSObject* param) recompiled the DEFINITION
(WasmJS.cpp) + Interpreter.o but NOT PortableBaselineInterpret.o -> at runtime the guest
aborts with `RuntimeError: Aborted(missing function: _ZN2js4wasm14WasmJitRunCall...)`
(the OLD mangled symbol the stale PBL.o still imports). The JIT then silently no-ops
(every entry traps -> falls back to interpreter), so benches still produce scores but
jit==off -> looks like "the feature did nothing" when really the build is broken.
LESSON: after editing a firefox/ C++ file, VERIFY each affected .o mtime > source mtime;
if not, `rm obj-full-emscripten/<dir>/<Object>.o && make -C obj-full-emscripten/<dir>
<Object>.o` to force it (PBL + WasmJS are standalone .o, not unified). Then relink
libjs_static (`make -C js/src/build`), libxul, embedder. A "missing function" RuntimeError
at runtime == a stale caller TU with an out-of-date signature. CHECK THIS FIRST when a
JIT change appears to "do nothing" -- don't trust bench numbers until the guest runs
WITHOUT a missing-function/abort pageerror (probe via embed-xul/bench/_t_crashprobe.cjs,
which logs pageerror/crash/RuntimeError with full text -- never filter that output away).
