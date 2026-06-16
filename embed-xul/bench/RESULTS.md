# gecko-wasm performance results (debug build)

Reproducible benchmarks live in `embed-xul/bench/`. All numbers are the **debug**
(non-release) build: engine `--enable-optimize` but no LTO, emcc link `-O0`.
Run via `node bench/run-page.cjs <page>` (loads the engine headless, navigates it
over WISP to a bench page that POSTs results back) and `node bench/profile.cjs`.

Lower = better for `*Ms`; higher = better for `fps` and Octane `score`.

## Baselines (commit before perf work)

### microjs (pure-JS, JIT-less PBL interpreter) — `/bench/microjs.html`
| kernel | ms |
|---|---|
| calls_fib | 3282 |
| props | 1335 |
| strings | 705 |
| arrays | 243 |
| gc_churn | 155 |
| **total** | **5720** |
Raw interpreter throughput; mostly fundamental to no-JIT. `calls_fib` (call dispatch) dominates.

### raf-fps (refresh-driver / animation throughput) — `/bench/raf-fps.html`
| mode | fps | gap median (ms) |
|---|---|---|
| software (baseline) | **0.5** | 4000 |
| GPU (`?gpu=1`, sets top-level-always-active) | 60.3 | 17 |
Software-mode rAF was throttled to background rate because the windowless browser
is "inactive". Fix: set `layout.testing.top-level-always-active` unconditionally.

### css-stress (style recalc / stylo) — `/bench/css-stress.html`
2400 elements, ~1200 rules, 20 full restyles+reflows.
| metric | ms |
|---|---|
| buildMs (build + first layout) | 382 |
| recalcAvgMs (per full restyle+reflow) | 193 |
Single-threaded stylo (`stylo-threads=1`). Candidate for parallel stylo.

### startup
engine READY (xul_init done): ~2.2–2.5s.

## Profiles (active time, idle pool-thread frames excluded)
- micro: PBL interpret dominates; `_emscripten_get_now` (wasm→JS perf.now crossing)
  is a large systemic cost even in pure JS; `js::Interpret` (slow C++ interp) ~35%
  of PBL self-time; `emscripten_thread_mailbox_send` = proxied-syscall tax.

## Changes

### 1. Refresh-driver always-active (rAF 0.5fps -> 60fps) — VERIFIED
`embed-xul.cpp` xul_init: set `layout.testing.top-level-always-active=true`
unconditionally (was gated on GECKO_GPU). The windowless browser was treated as
inactive, so the refresh driver throttled to the background rate.
| raf-fps (software) | before | after |
|---|---|---|
| fps | 0.5 | **60.5** |
| gap median (ms) | 4000 | 17 |
121x animation/transition/scroll/video throughput for the default software path.
No regression (css-stress 193->212ms within noise; microjs unchanged). Embedder
relink only (~24s), no engine rebuild.

### 2. Parallel stylo — INVESTIGATED, REVERTED (no win on this target)
build-std+atomics makes parallel stylo *work* (threads spawn, no abort). But on a
style-bound page (css-stress, 2400 elems, ~91% style recalc) it regresses with
thread count:
| stylo-threads | styleAvgMs (per restyle) |
|---|---|
| 1 | 170 |
| 4 | 174 |
| 8 | 188 |
The emscripten cross-thread sync tax (Atomics futex wake/wait + rayon work-steal
spin contention) exceeds the parallelism benefit for fine-grained style traversal.
Kept sequential (default 1); knob retained via `GECKO_STYLO_THREADS`. Finding: the
**cross-thread synchronization tax is the real bottleneck** for threaded subsystems
on this target — the lever is reducing that tax, not adding threads.

### 3. Socket/network process disabled (correctness cleanup, no measured perf change)
`embed-xul.cpp`: `network.process.enabled=false` +
`network.http.network_access_on_socket_process.enabled=false`. Single-process has no
subprocess support; the desktop default (true) makes Gecko repeatedly fail to launch
the socket subprocess ("Failed to launch socket subprocess"). Removes that error
spam. Did NOT change idle CPU (the spin below is not socket-process-related).

## MAJOR FINDING — idle CPU ≈ 2 cores (characterized; no safe fix yet)

Ground truth (`bench/idle-cpu.cjs`): the engine burns **~2.0 cores while completely
idle** (no page loaded). A real browser idles at ~0%. The same loops run during real
loads, so this also steals main-thread capacity from real work.

Root cause (traced with `bench/profile.cjs` per-target + caller attribution + a
`select()` rate probe):
- NSPR `PR_Poll` maps to `select()` here (emscripten `poll()` routes through
  `select()` — the `__syscall_poll` override is dead code; everything is select).
- `___syscall__newselect` is in emscripten's built-in **proxiedFunctionTable**, so
  every `select()` from a Necko worker is force-proxied to the runtime **main**
  thread. There `ENVIRONMENT_IS_PTHREAD=false`, so the wisp wrapper takes the
  non-pthread fast path and **cannot `Atomics.wait`** → returns immediately.
- So the socket-transport poll loop and libevent's IPC select backend **busy-spin**:
  measured ~**100,000 select/s** on the main thread (one thread, infinite timeout),
  pinning ~2 cores between the spinning worker(s) and the main thread servicing the
  proxied scans.

Attempted fix: un-proxy select (`__syscall__newselect__proxy: ''` — empty string is
the only value that survives emscripten's `=== undefined → 'sync'` re-default AND is
falsy so the jsifier skips proxy-wrapping) so the wrapper runs on the calling worker
and `Atomics.wait`s there. **Result: idle CPU 2.0 → 0.26 cores (8x) — but it BROKE
networking** (microjs/page loads stall; select genuinely needs to run where SOCKFS
is). **Reverted.** A real fix needs either the readiness scan's wakeups to cover all
fds these loops wait on (libevent self-pipe etc.) so a worker-side block is safe, or
to stop the self-reposting event that keeps the socket thread's queue non-empty
(→ `PR_INTERVAL_NO_WAIT`). Left as the top open structural target.

## Profiling findings (active time; idle pool-thread frames excluded)
- `_emscripten_get_now` (wasm->JS performance.now crossing) is the #1 active cost
  cross-cutting: ~14% on a css load, ~18% on a real wikipedia load, ~24% idle.
  Callers: `mozilla::TimeStamp::Now` (67% of the clock-gettime path) + NSPR
  `PR_IntervalNow` (32%), plus thread/proxy timed-wait deadlines and libevent.
  Natively clock_gettime is a ~20ns vDSO call; here it's a JS boundary crossing.
  (Reducing it needs a cheaper/shared clock — risky for timer correctness — or fewer
  reads, which is gated by the spin above. Open.)
- Proxy/cross-thread tax (`emscripten_thread_mailbox_send` + `futex_wake` +
  `checkMailbox`/`receive_on_main_thread`) ≈ 22% on a real load — largely the same
  select-spin proxying.
- JS (microjs/Octane): `PortableBaselineInterpret` dominates; `js::Interpret` (slow
  C++ interp) ~35% of PBL self-time. Fundamental to no-JIT; deep SpiderMonkey work.

## Tooling added (embed-xul/bench/)
- `bench-server.cjs` — static + WISP + `/bench-result` POST sink (ephemeral port).
- `run-page.cjs` — load engine headless, navigate over WISP to a bench page, collect
  its POSTed JSON. `--gpu`, `--qs=stylo=N`, `--timeout=`.
- `profile.cjs` — CPU profiler across ALL pthread workers (raw CDP, recursive
  auto-attach, idle-frame filtering, `--callers=FN`, `--per-target`).
- `idle-cpu.cjs` — ground-truth idle CPU via /proc.
- `microjs.{html,js}`, `css-stress.html`, `raf-fps.html`, `octane.html` (+ octane/).
