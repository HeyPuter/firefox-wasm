---
name: gecko-wasm-perf
description: "Performance optimization of the gecko-wasm port — wasm-specific hotspots found by CPU profiling, fixes shipped, and remaining levers (proxy tax, stylo, JS tiering)."
metadata: 
  node_type: memory
  type: project
  originSessionId: d2f741b0-a9a8-4dd9-b382-40d7988d83d6
---

Goal (2026-06-15): optimize the wasm Gecko port — initial load, content rendering, JS. Builds on [[gecko-wasm-gpu-integration]], [[gecko-wasm-runtime-frontier]], [[gecko-wasm-toolchain]].

PROFILING TOOL: `embed-xul/perf-profile.cjs` + `embed-xul/bench.html`. Loads a heavy realistic page over http-over-WISP and captures a CDP CPU profile across ALL emscripten pthread workers via RAW CDP (remote-debugging-port; Playwright's newCDPSession rejects Worker targets). `--profiling-funcs` (already in build-embed-full.sh) keeps wasm function names so the profile shows real C++/Rust names. Aggregates self-time per function + caller chains. NOTE the big `__timedwait_cp`/`emscripten_futex_wait`/`(idle)` numbers are 20 pool threads SLEEPING — not real cost; look at the active functions below those. The CDP worker-attach is flaky (intermittent hangs); gpu-test.cjs / gecko-net-test.cjs are the reliable correctness checks.

KEY WASM PERF FACTS:
- JS: NO native JIT possible in wasm. Already using the Portable Baseline Interpreter (PBL: `--enable-portable-baseline-interp[-force]`, see [[gecko-wasm-source-patches]]/mozconfig) — the best JIT-less tier. PBIInterpret is the JS hot path; `js::Interpret` (slow C++ interp) still runs alongside it (~25% of JS self-time) — a possible future lever but deep/risky.
- The dominant wasm-specific OVERHEAD on a network load is the PER-PROXIED-SYSCALL TAX: every socket syscall is sync-proxied to the runtime main thread (SOCKFS+WISP live there), costing `emscripten_thread_mailbox_send` + a proxy-queue `__pthread_mutex_lock` + a `__pthread_cond_timedwait` whose deadline calls `_emscripten_get_now` (a wasm->JS `performance.now()` crossing). Clock reads (`_emscripten_get_now` ~545ms/load) come from: proxy-wait deadlines, the socket-transport poll loop, and libevent's `event_base_loop`. Reducing further needs FEWER proxied syscalls.

SHIPPED FIX 1 — FindFreeAddressSpace (biggest single win, ipc/glue/SharedMemoryPlatform_posix.cpp): emscripten `mmap(PROT_NONE, MAP_ANONYMOUS)` does NOT cheaply reserve address space like a real OS — it ALLOCATES + ZERO-FILLS the region. `GlobalStyleSheetCache` (UA sheet cache) calls `FindFreeAddressSpace(2*kOffset)` = 2×512MiB = 1 GiB on wasm32 → ~552ms of `emscripten_memset_bulkmem` + a 1GiB transient heap spike, EVERY startup. The result is only a placement HINT and our single-process `Platform::Map` ignores fixed addresses anyway. FIX: `Platform::FindFreeAddressSpace` returns nullptr under `#if defined(__EMSCRIPTEN__)` → caller maps at any address (calloc-zeroed, satisfying the zeroed-memory expectation). Verified: memset_bulkmem gone from the profile.

SHIPPED FIX 2 — socket poll() busy-spin -> event-driven. emscripten poll()/select() are NON-blocking (scan fd readiness, ignore the timeout — they're proxied to the main thread which must stay free for WISP messages), AND `PollableEvent` fails to build (pipe2 unsupported -> mPollableEvent is null -> the socket thread is never woken on dispatch). So Necko's `nsSocketTransportService` poll loop BUSY-SPINS during every network wait, flooding the main thread with proxied scans. Fix spans 3 files:
- `embed-xul/wisp-syscalls.js`: split each into a main-thread-proxied readiness SCAN (`wisp_poll_scan`/`wisp_select_scan`, `__proxy:'sync'`) + a worker-side wrapper (NO __proxy key — runs on the caller; `__proxy:'none'` is WRONG, the jsifier treats any truthy __proxy incl. 'none' as ASYNC-proxy) that sleeps in `Atomics.wait` on a shared futex word. Uses a per-thread generation check (`globalThis.__wispGen`) so a wakeword bump since the last return forces an immediate return (drain the event queue) — avoids the lost-wakeup race (the scan can't see the event queue). select() snapshots/restores the fd_sets (the scan rewrites them). Large fallback slice (250ms) is just a safety net. Math.min(timeout, FALLBACK) still respects Necko's finite poll timeouts (timers).
- `embed-xul/wisp-bridge.js`: `wakePoll()` bumps + `Atomics.notify`s the wakeword on every WISP socket state change (data in `_push`, open, close `_eof`).
- `netwerk/base/nsSocketTransportService2.cpp`: `WispWakeSocketPoll()` (`__atomic_fetch_add` + `emscripten_futex_wake`) called wherever it would `mPollableEvent->Signal()` (OnDispatchedEvent + shutdown + offline), so a cross-thread Dispatch wakes the poll loop immediately. References the embedder's `wisp_wakeword` as a WEAK symbol (degrades to the fallback slice if absent). `emscripten_futex_wake` (wasm) and `Atomics.notify` (JS) interoperate — both wake JS `Atomics.wait` on the same shared address.
- `embed-xul/embed-xul.cpp`: `extern "C" int32_t* wisp_wakeword()` (function-local static = one fixed shared-heap address across threads); exported via EXPORTED_FUNCTIONS `_wisp_wakeword`.
Verified: gecko-net-test.cjs WISP_RENDER_OK, bench.html renders correctly on GPU. Local bench gain modest (mutex 429->279ms; near-zero local latency under-represents it); the win scales with real network latency.

VALIDATED ON discord.com/login (2026-06-15, the heavy-JS target): profiled the real https SPA loading over WISP (perf-profile.cjs BENCH_URL=https://discord.com/login NOGPU=1 PROFILE_MS=18000 -- fixed-window mode since SPAs never "complete"). Confirms both fixes HOLD on the real target: (1) emscripten_memset_bulkmem is ABSENT from the profile (FindFreeAddressSpace fix -- was ~552ms), (2) the socket poll is event-driven, NOT spinning (nsSocketTransportService DoPollIteration 56ms / Run 56ms / PR_Poll 51ms over a full 18s many-connection load -- modest, vs the old unbounded busy-spin). TLS over WISP works (rijndael_encryptBlock128 + gcm_HashMult crypto present = discord's https decrypted). The dominant remaining ACTIVE cost is emscripten_thread_mailbox_send (~1984ms/18s) = the per-proxied-syscall tax from discord's many concurrent connections (the deep proxy-tax below). discord.com/login itself does a client-side redirect (documentchannel NS_BINDING_ABORTED, benign) so its heavy JS doesn't fully execute in-engine -> JS-interpreter perf is validated via the synthetic bench (PBL ~520ms) not discord. NOTE software-mode load->READY ~4s vs GPU-mode ~2.2s: software index.html gives #screen a 2D context, so WebRender's GL compositor creation fails -> ~2s SW-WR fallback cost (software-mode artifact only; GPU mode unaffected).

DEFERRED CANDIDATES (not done):
- JS tiering: route the `js::Interpret` portion fully to PBL; remove wasted `MaybeEnterJit` checks. Deep SpiderMonkey work. (js::Interpret is ~35% of PBL self-time on microjs/Octane.)

=== SESSION 2026-06-16 (chase-perf goal): reproducible bench/profiler harness + findings ===
TOOLING (all in embed-xul/bench/, reusable, no rebuild to run): bench-server.cjs (static+WISP+/bench-result POST sink, ephemeral port — avoids the old fixed-port EADDRINUSE), run-page.cjs (load engine headless, navigate it over WISP to a bench page that POSTs results back; --gpu, --qs=stylo=N, --timeout=), profile.cjs (CPU profiler across ALL pthread workers via RAW CDP — REBUILT after the old perf-profile.cjs was deleted; key fixes vs old: RECURSIVE Target.setAutoAttach per session to reach nested workers, idle-frame denylist + ACTIVE-time renormalization, --callers=FN caller attribution skipping wasm-to-js trampolines, --per-target with inclusive frames to name threads, parallel Profiler.stop with per-target timeout so one hung worker can't stall), idle-cpu.cjs (ground-truth idle CPU via /proc utime+stime), microjs.{html,js}/css-stress.html/raf-fps.html/octane.html(+octane/). Results log: embed-xul/bench/RESULTS.md.

WIN #1 SHIPPED + VERIFIED — refresh-driver throttle (rAF 0.5fps -> 60fps, 121x):
the windowless browser is "inactive" by default, so the refresh driver throttles to
the background rate -> content requestAnimationFrame / CSS anim / transitions /
smooth-scroll / <video> run at ~0.5fps in SOFTWARE mode (setTimeout is unaffected,
which is why pages "worked" but animation was dead). FIX: set
`layout.testing.top-level-always-active=true` UNCONDITIONALLY in embed-xul.cpp xul_init
(it was gated on GECKO_GPU). Verified software-mode raf-fps 0.5->60.5fps, gap
4000ms->17ms, no regression. (See [[gecko-wasm-gpu-integration]].)

INVESTIGATED, REVERTED — parallel stylo: build-std+atomics makes it WORK (no abort),
but it REGRESSES with thread count on a style-bound page (css-stress 2400 elems:
1 thread 170ms/restyle, 4->174, 8->188). The emscripten cross-thread sync tax
(Atomics futex wake/wait + rayon work-steal spin) exceeds the gain for fine-grained
traversal. Kept stylo-threads=1 (default); added GECKO_STYLO_THREADS env knob to re-measure.

WIN #2 SHIPPED + VERIFIED — UN-PROXY select(): idle CPU 2.0 -> 0.26 cores (~8x), and
the load-time clock + proxy tax CRATERED (they were symptoms of the SAME spin).
ROOT CAUSE: NSPR PR_Poll -> poll() routes through select() (emscripten poll()=>select();
the wisp __syscall_poll override is DEAD CODE). `___syscall__newselect` is in emscripten's
built-in proxiedFunctionTable, so every select() from a Necko worker was force-proxied to
the runtime MAIN thread, where ENVIRONMENT_IS_PTHREAD=false -> the wrapper can't
Atomics.wait -> returns immediately -> socket-transport + libevent IPC select loops
BUSY-SPIN ~100k/s (~2 idle cores; saturates main during loads). FIX (wisp-syscalls.js):
`__syscall__newselect__proxy: ''` -> select runs on the CALLING worker and blocks in
Atomics.wait (woken by the wakeword). Empty string is the one opt-out that works: a
string (decorator validator rejects boolean), defined (survives library.js's
`=== undefined -> 'sync'` re-default), falsy (jsifier's `if(proxyingMode)` skips
proxy-wrapping). The "breaks networking" from last session was a RED HERRING: a
worker-side `ReferenceError: WISP_POLL_FALLBACK_MS is not defined` -- a top-level `var`
in a --js-library is only emitted into the MAIN module, NOT gecko.worker.js. Making it a
`$`-prefixed library symbol (`$WISP_POLL_FALLBACK_MS`, in the wrappers' __deps) fixed it.
GENERAL LESSON: anything a worker-run library function references must be a `$`-library
symbol (or inlined), never a bare top-level var/function. VERIFIED on final binary: idle
2.0->0.26 cores; idle active CPU 8.8s->0.77s/8s; load _emscripten_get_now ~18%->~0.1%,
mailbox_send ~10%->0.1%; microjs + rAF(60fps) + css + wikipedia-HTTPS-render all intact.
NSPR's PollableEvent self-pipe actually WORKS (PR_Write/PR_Read in MOZ_LOG) -- the only
problem was select couldn't block. 50ms fallback is a safety net for missed wakeups
(libevent self-pipe writes don't bump the wakeword). profile.cjs IDLE set now excludes
`___syscall__newselect` (a worker blocked in select's Atomics.wait samples there = sleep,
not CPU). Also network.process.enabled=false (single-process correctness; no CPU change).

WIN #3 — software blit (index.html, BGRA->RGBA present path): was a per-pixel byte loop
+ createImageData(W,H) PER PAINT (every frame at full refresh rate). Rewrote to swizzle
a 32-bit WORD at a time (~4x fewer ops, B<->R swap: dst=((p>>>16)&0xFF)|(p&0xFF00)|
((p&0xFF)<<16)|0xFF000000) + reuse ONE ImageData (no per-frame alloc/GC). blit 852->571ms
(~20%->15% of load active); createImageData gone. Verified color-correct + wiki renders.
Harness-only, no rebuild. NOTE the self-kill trap: `pkill -f chrome` matches the parent
bash (its cmdline contains "chrome") and kills it -> empty output; use `pkill -x` or a
non-matching pattern, or don't pkill in the same command as the test.

POST-WIN LOAD PROFILE: with the spin gone, a real load's active CPU is now ~38%
`(program)` (V8 catch-all = Gecko layout/parse/style as unattributed wasm; fundamental
at -O2) + ~15% blit (software present) + small GC. The old #1 costs (clock, proxy) are
gone. Remaining big lever is the no-JIT JS interpreter (microjs calls_fib ~3.2s = PBL
call dispatch; js::Interpret ~35% of PBL self-time) -- deep SpiderMonkey work.

CLOCK CROSSING is the #1 active cost everywhere (_emscripten_get_now = wasm->JS
performance.now: ~14% css load, ~18% wiki load, ~24% idle). Callers: TimeStamp::Now
(67% of clock_gettime) + NSPR PR_IntervalNow (32%). Native clock_gettime is a ~20ns
vDSO call; here a JS boundary crossing. Reducing it needs a cheaper/shared clock
(risky for timer/anim correctness) or fewer reads (gated by the spin above).

DEFERRED still: proxy-tax reduction (shared-memory socket ring so recv/send/select
don't proxy per-call — big project, and the select-spin above is the acute case).

## WIN 2026-06-16 — GPU-mode: stop recompositing unchanged content every vsync
GPU mode (?gpu=1) recomposited the FULL WebRender scene every vsync even on a static
page: refresh driver Paint phase -> PresShell::PaintSynchronously, gated only by
widget->NeedsPaint(), and the content's PuppetWidget hardcodes NeedsPaint()=mVisible
(always true) -> ~60 display-list rebuilds + proxied-GL recomposites/sec for nothing
(~0.18 cores; RenderReasons 0x10001=VSYNC|SCENE每frame). FIX (embed-xul.cpp gpu_present,
EMBEDDER-ONLY): detect change via root->HasInvalidFrameInSubtree() (frame-invalidation
bits persist until a real paint, surviving the op=4 polling race), and when nothing
changed ps->SetNeverPainting(true) so PaintSynchronously early-returns -> refresh
driver goes idle (tick reasons <none>). 2-frame grace (re-armed each animating frame)
keeps animation full-rate. Static GPU 0.21->0.07 cores gecko-internal (~3x), /proc
0.35->0.17, rAF unchanged 60.5fps, renders identical (static/delayed-change/wiki). See
[[gecko-wasm-gpu-integration]]. Negative: HeadlessWidget::NeedsPaint() is ALSO always-
true but content paints via PuppetWidget not HeadlessWidget, so fixing it is inert.
META: `./mach build` piped through grep/tail HID a compile error for several iterations
-> stale libxul kept getting staged while the embedder relink reported "link rc=0";
always check build rc + grep the wasm for your probe strings. Incremental engine build
is ~45-60s (mach) + ~28s (restrip-relink), NOT 40min.
