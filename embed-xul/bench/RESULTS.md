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

## MAJOR WIN — un-proxy select(): idle CPU 2.0 → 0.26 cores (~8x), VERIFIED

The engine was burning **~2.0 cores while completely idle** (ground truth via
`bench/idle-cpu.cjs`), and the same loops stole main-thread capacity during loads.

Root cause (traced with `bench/profile.cjs` per-target + caller attribution + a
`select()` rate probe): NSPR `PR_Poll` maps to `select()` here, and
`___syscall__newselect` is in emscripten's built-in **proxiedFunctionTable**, so every
`select()` from a Necko worker was force-proxied to the runtime **main** thread, where
`ENVIRONMENT_IS_PTHREAD=false` → the wrapper can't `Atomics.wait` → returns immediately
→ the socket-transport poll loop + libevent IPC select backend **busy-spin ~100k/s**.

FIX (`wisp-syscalls.js`): `__syscall__newselect__proxy: ''` un-proxies select so the
wrapper runs on the calling worker and blocks in `Atomics.wait` (woken by the
wakeword). Empty string is the one opt-out that works: a string (the decorator
validator rejects a boolean), defined (survives library.js's `=== undefined → 'sync'`
re-default), and falsy (jsifier skips proxy-wrapping). The first attempt *seemed* to
break networking — that was a red herring: a worker-side `ReferenceError:
WISP_POLL_FALLBACK_MS is not defined`, because a top-level `var` in a `--js-library`
is only emitted into the main module, not `gecko.worker.js`. Making it a `$`-prefixed
library symbol (`$WISP_POLL_FALLBACK_MS`, listed in the wrappers' `__deps`) fixed it.

Verified (final binary):
| metric | before | after |
|---|---|---|
| idle CPU (ground truth) | ~2.0 cores | **0.26 cores** |
| idle active CPU (profiled) | 8.8 s / 8 s | **0.77 s / 8 s** |
| load: `_emscripten_get_now` (clock) | ~18% | **0.1–1.8%** (60x less idle) |
| load: proxy `mailbox_send` | ~10% | **0.1%** |
| microjs (HTTP/WISP + JS) | works | works (5.4 s) |
| rAF / css / wikipedia HTTPS render | ok | ok (wiki 154k non-white px) |

This single fix resolved the idle-spin, the #1 clock-crossing cost, AND the proxy tax
— all symptoms of the same spin. NSPR's poll-timeout/PollableEvent path turned out to
work fine (self-pipe `PR_Write`/`PR_Read` seen in MOZ_LOG); the only problem was that
select couldn't block. The 50 ms fallback is just a safety net for missed wakeups
(libevent's self-pipe writes don't bump the wakeword); the wakeword handles the common
case. Idle could go lower with a longer fallback, kept at 50 ms for wakeup latency.

## WIN — software blit (BGRA→RGBA present path), ~20% → ~15% of load active
`index.html` `blit()` ran a per-pixel byte loop + `createImageData(W,H)` every paint
(every frame at the full refresh rate now). Rewrote it to swizzle a 32-bit WORD at a
time (~4x fewer ops) and reuse ONE ImageData (no per-frame alloc/GC). Verified
color-correct (`bench/sw-pixel-check.cjs`) + wikipedia renders identically. blit
852→571 ms; `createImageData` gone from the profile. Harness-only (no rebuild).

## WIN — GPU-mode: OffscreenCanvas, compositor GL local on the Renderer thread (no proxy)

The compositor's WebGL2 context was created with `proxyContextToMainThread=ALWAYS`, so
EVERY GL call WebRender issued from its Renderer pthread was marshalled to the main
thread (where the #screen DOM canvas lived). On a GL-heavy page this dominates the main
thread. Fix: transfer #screen to the Renderer thread as an OffscreenCanvas so the context
is created LOCAL there (no per-call proxy), and present each frame explicitly.

Implementation (engine + embedder, no emsdk source edits):
- NSPR `ptthread.c`: one-shot `PR_SetTransferredCanvasForNextThread()` -> sets emscripten's
  transferred-canvas pthread attr; consumed by the next `_PR_CreateThread`.
- `RenderThread::Start`: calls it just before `NS_NewNamedThread("Renderer")` (GPU mode),
  so #screen is transferred to that thread at spawn (rides the `run` message -> reliable,
  no "worker can't receive while blocked" race).
- `GLContextProviderEmscripten`: `PROXY_FALLBACK` (local if transferred, else safe proxy),
  `renderViaOffscreenBackBuffer=false` (render straight to the OffscreenCanvas FB0).
- Present: the WebGL implicit swap can't fire on a blocking emscripten pthread (it never
  yields to its JS event loop) and `gl.commit()` was removed from browsers, so present
  EXPLICITLY: `OffscreenCanvas.transferToImageBitmap()` -> worker->main `postMessage`
  (zero-copy transfer) -> a `bitmaprenderer` overlay (#glout, pointer-events:none, over
  #screen) displays it. #screen stays in the DOM for input.
- Build: `-sOFFSCREENCANVAS_SUPPORT=1` + `OFFSCREENCANVASES_TO_PTHREAD=#gldummy` (a throwaway
  1x1 canvas the PROXY_TO_PTHREAD app thread harmlessly owns; emscripten's crt1_proxy_main
  forces a default transfer that aborts on the nonexistent "#canvas").

Verified (GL-heavy `gpu-heavy.html`, 300 layered/blended/shadowed animated elements):
| main thread (`[page]`) GL+proxy | before (PROXY_ALWAYS) | after (OffscreenCanvas) |
|---|---|---|
| active over 10s | **4354ms** (`getError` 663, `futex_wake` 443) | **484ms** (`transferFromImageBitmap` 16) |
The per-GL-call proxy is ELIMINATED from the main thread (~9x). Renders correctly (wiki
62644 non-white px, == proxied baseline), animations present per-frame, `glpass=1` content
WebGL works, input preserved.

FOLLOW-UP DONE — eliminated the local glGetError GPU syncs. Moving the GL local exposed a
cost the proxy had masked: WebRender's `Renderer::check_gl_errors()` does a `glGetError` OOM
probe per texture-cache-update-list (frequent on texture-heavy pages); locally each is a real
GPU sync. It's NOT debug-gated (runs in release too). Made it a no-op on wasm
(`renderer/mod.rs check_gl_errors`: `if cfg!(target_arch="wasm32") return`). Also set
`gfx.webrender.panic-on-gl-error=false` (Nightly default would wrap the GL in gleam's
per-call ErrorReactingGl). Result on `gpu-heavy.html`: Renderer-thread GL worker 3300ms ->
1491ms (`getError` 1849 -> 0; what remains is real GL: bufferData/bindFramebuffer/texSubImage2D).

NET (proxied baseline -> OffscreenCanvas + no glGetError syncs), GL-heavy scene over 10s:
| | before | after |
|---|---|---|
| main thread (`[page]`) | 4354ms | **514ms** (~8.5x) |
| Renderer-thread GL | (on main, proxied) | **1491ms** local, no getError |
| total active (all threads) | ~21900ms | **19099ms** |
Per-GL-call proxy eliminated + redundant glGetError GPU syncs eliminated. Renders identical
(wiki 62644 nonWhite, velzie.rip glpass pink-noise renders), animations + input intact.

## ATTEMPTED, REVERTED — recomposite-skip (froze continuous animations)

Skipping `gpu_present`'s paint when nothing changed (gate via `HasInvalidFrameInSubtree` +
`SetNeverPainting`) cut static-page steady-state 0.21->0.07 cores and was briefly documented
as a win. But verification (prompted by the glpass/WebGL-sites check) showed it FREEZES
continuous animations: the frame-invalidation bits miss transform/opacity (layer-tree) and
content canvas/WebGL/video redraws, and `SetNeverPainting(true)` (needed to suppress the
autonomous recomposite) also throttles CSS animations. `HasReasonsToTick` catches everything
but is contaminated by our own scheduled Paint phase (perpetually true). No clean gate exists,
so REVERTED to always-paint. (Finding: the windowless PuppetWidget reports `NeedsPaint()`
always-true, so the refresh driver recomposites every vsync; the OffscreenCanvas work above
makes each such composite cheap instead, which is the safer fix.)

## (superseded) earlier recomposite-skip writeup

In GPU mode (`?gpu=1`, in-process WebRender -> WebGL2 -> canvas) the engine was
**rebuilding the WebRender display list and recompositing the full scene on every
vsync even when nothing on the page changed**. Traced (per-target profiler +
instrumented `nsRefreshDriver::Tick`/`PresShell::PaintSynchronously`/
`CompositorVsyncScheduler::Composite`, RenderReasons `0x10001` = VSYNC|SCENE every
frame): the refresh driver's Paint phase runs each tick -> `PaintSynchronously()`,
whose only "is a repaint needed" gate is `widget->NeedsPaint()`. The content's
**PuppetWidget hardcodes `NeedsPaint()` to `mVisible` (always true)**, so a fresh
display list + composite happened ~60x/s for a static page (the proxied per-GL-call
tax applies to each of those recomposites).

FIX (`embed-xul.cpp` `gpu_present`, embedder-only — no engine change): detect real
change via the display root's frame invalidation bits (`HasInvalidFrameInSubtree()`,
which a change sets and only a display-list build clears, so they survive the op=4
polling cadence) and, when nothing changed, set `PresShell::SetNeverPainting(true)`.
`PaintSynchronously()` early-returns on `IsNeverPainting()`, so the autonomous
per-vsync repaint is suppressed and the refresh driver goes fully idle (tick reasons
-> `<none>`). A 2-frame grace (re-armed every animating frame) covers explicit-swap
present latency and keeps animation at full rate.

Verified (clean final binary, static `gpu-static.html`):
| metric | before | after |
|---|---|---|
| steady-state active (profiler, gecko-internal) | ~0.21 cores | **0.07 cores** (~3x) |
| static CPU (/proc, headed all-procs) | ~0.35 cores | **0.17 cores** (~2x) |
| rAF animation (raf-fps, GPU) | 60.5 fps | **60.5 fps** (no throttle) |
| static render | 290789 non-white px | 290789 (identical) |
| delayed one-shot change composites | yes | yes |
| wikipedia GPU render | 62044 px | 62044 (identical) |

The win helps every mostly-static page (the common case) and removes the wasted
per-vsync proxied-GL recomposite. Tools added: `gpu-static.html`, `gpu-delayed.html`,
`gpu-paint-check.cjs` (correctness+cpu), `profile.cjs --settle=N` (isolate
steady-state from load) / `--engineqs=` (engine URL query for env A/B).

NOTE (negative finding from the same investigation): `HeadlessWidget::NeedsPaint()`
is *also* hardcoded always-true, but the **main content paints through PuppetWidget,
not HeadlessWidget** (confirmed: HeadlessWidget::NeedsPaint never called on the
content path), so fixing HeadlessWidget is inert here. The gpu_present-side gate is
the correct, widget-agnostic fix. Also: `./mach build` piped through `grep`/`tail`
can hide a compile error so the stale libxul keeps getting staged ("link rc=0" from
the embedder relink against the old lib) — always check `build rc` + grep the wasm
for your probe strings to confirm an engine change actually landed.

## INVESTIGATED, NOT A WIN — PBL first-call tier-up (disproven by measurement)
A wiki/microjs load profile showed `js::Interpret` (the slow C++ interpreter) at ~13%
of JS self-time alongside PBL. Hypothesis: functions called once but with hot internal
loops never tier up to PBL (no JIT/OSR; `CanEnterPortableBaselineInterpreter` gates on
warm-up count, default threshold 10). Changed `<=`→`<` (engine rebuild) AND forced the
threshold to 0 via the `JIT_OPTION_portableBaselineInterpreterWarmUpThreshold` env
override. Result: **microjs got SLOWER, 5321→5956 ms** (props 1247→1620, strings
696→943). PBL's per-script JitScript + IC setup isn't amortized for cold/once-called
code, so `js::Interpret` is genuinely the faster tier there — SpiderMonkey's threshold
of 10 is correctly tuned. Reverted the threshold override; left the inert `<` (with the
default threshold it's just a 1-invocation-earlier tier-up for hot functions). The JS
tier split is near-optimal; the no-JIT interpreter cost is fundamental. (Also note: a
single .cpp edit triggered a full ~40-min Gecko rebuild — the objdir invalidates broadly.)

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
