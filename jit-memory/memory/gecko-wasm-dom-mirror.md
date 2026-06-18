---
name: gecko-wasm-dom-mirror
description: "DOM-mirror mode (GECKO_MIRROR / index.html ?mirror=1) — headless Gecko, DOM serialized to a native iframe; mouse+keyboard input now work (refresh-driver compositor sync-IPC hang fixed)."
metadata: 
  node_type: memory
  type: project
  originSessionId: d2f741b0-a9a8-4dd9-b382-40d7988d83d6
---

DOM-mirror mode (flag `GECKO_MIRROR=1`, host `index.html?mirror=1`): Gecko runs
**headless and never paints**; the host periodically pulls the live, self-contained DOM
via op=5 (`mirrorSerializerFn` — inlines same-origin stylesheets as `<style>`, drops
`<script>`/`<link rel=stylesheet>`) and sets it as the `srcdoc` of a sandboxed `#mirror`
iframe that renders natively. `#screen` canvas stays on top as a transparent input
layer. Started by `startMirrorLoop()` (~5fps re-mirror). Goal (2026-06-16): headless
mirror to native DOM; mouse/keyboard forwarded as usual; `<canvas>` via normal pipeline;
CSS/images as data URLs; verify on complex sites.

## Mouse + keyboard input — WORKS (verified 2026-06-16)
`window.geckoInput(item)` enqueues raw events: op=1 mouse {evType 0/1/2 = move/down/up,
x,y,button,buttons,clickCount}, op=2 key {evType 0/1 = down/up, key,keyCode,charCode}.
A click = down+up on the same element with `clickCount:1`. Verified end-to-end on
bench/mirror-click.html: click -> `#o`="CLICKED-1", typing -> input.value="hi" /
`#o2`="TYPED:hi", and the mirror srcdoc reflects both. Tests: bench/_t_io.cjs (full),
_t_which.cjs (per-op), _t_focus.cjs (target matrix).

### The hang that blocked this (root cause + fix)
Any *interactive* click (button activation, or an element with a click listener) HUNG
the engine thread forever (mouseup/up timed out; move+down were fine; clicks on
non-interactive elements were fine). It deadlocked in BOTH mirror and software-canvas
modes, NOT in GPU mode. Profiling all pthread workers during the hang (bench/profile.cjs
pattern; the engine thread was blocked in futex, filtered out until I searched for the
event-dispatch stack) showed the exact chain: the click dirties layout -> a refresh-driver
tick reaches `nsRefreshDriver::PaintIfNeeded()` -> `PuppetWidget::GetWindowRenderer()` ->
`CreateCompositor()` -> `WebRenderBridgeChild::SendEnsureConnected()` = a **sync IPC**
(`MessageChannel::WaitForSyncNotify`) that never returns because the in-process compositor
threads run only in GPU mode.

FIX (two parts):
1. `firefox/widget/PuppetWidget.cpp` `GetWindowRenderer()`: the `#if __EMSCRIPTEN__`
   block only does `CreateCompositor()` when **`getenv("GECKO_GPU")`** is set (the
   RenderThread that answers the sync IPC starts only in GPU mode). Otherwise it falls
   back to `CreateFallbackRenderer()` (in-process software, no IPC) -> no hang. This was
   the real fix; it covers BOTH `PaintIfNeeded`'s direct `GetWindowRenderer` call (the
   `mCompositionPayloads` branch, NOT gated by IsNeverPainting) and PaintSynchronously.
2. `embed-xul/embed-xul.cpp` `xul_load()`: in mirror mode `ps->SetNeverPainting(true)`
   so `PaintSynchronously` is a no-op (we never composite; the tick still advances
   layout/JS/animations, which the serializer needs). Defensive/cleaner, but #1 is what
   unblocks it. `g_gpu`/`g_mirror` declarations moved above `xul_load`.

Building the PuppetWidget fix required the make-based workaround in
[[gecko-wasm-build-mach-deadlock]] (./mach build hangs in the agent shell). The op=6
work below is embedder-only (build-embed-full.sh relink, ~25s).

## CSS + image + canvas data-URL inlining (2026-06-16) -- all via privileged C++ ops
The serializer (op=5, content JS) builds the DOM skeleton; three privileged C++ ops then
supply resources the content JS can't read cross-origin. The mirror tick runs op5 then
op6/7/8 and merges into the srcdoc string (token replace for img/canvas, marker for css).
- **All CSS as data URLs: WORKS (op=7, `mirror_collect_css`).** `mirrorSerializerFn` now
  DROPS every `<style>`/`<link rel=stylesheet>` and leaves a `<!--MIRRORCSS-->` marker.
  C++ walks `doc->SheetCount()`/`SheetAt(i)`, calls the privileged
  `StyleSheet::GetCssRulesInternal()` (NO security check -> cross-origin sheets included),
  concatenates each rule's `css::Rule::GetCssText()`, base64s to `data:text/css;charset=utf-8`,
  returns a JSON array in cascade order; JS injects `<link rel=stylesheet href=data:...>`
  at the marker. Wikipedia renders identically to the old same-origin `<style>` path.
  (Known gaps: `@import`-nested sheets and `url(...)` resources inside CSS aren't inlined.)
- **Canvas as data URLs: WORKS (op=8, `mirror_collect_canvases`).** A `<canvas>` has no
  serializable markup, so the serializer swaps each for an `<img src=#MIRRORCANVAS{n}#>`
  (preserving width/height/style/class/id). C++ `HTMLCanvasElement::GetSurfaceSnapshot()`
  (privileged readback -> WebGL/tainted canvases OK) ->
  `gfxUtils::EncodeSourceSurfaceAsBytes(surf, ImageType::PNG)` -> base64 -> data:image/png.
  Verified: a 2D canvas (blue bg + red circle + "CANVAS-OK" text) renders pixel-perfect in
  the mirror. Refreshes at the ~5fps mirror tick (fine for animations).
- **Images as data URLs: WORKS for raster (incl. cross-origin), via op=6.** Content JS can't
  toDataURL a cross-origin image (canvas taint), but Gecko already downloaded+decoded them
  with the page's privileges, so a C++ op reads the bytes CORS-free. `embed-xul.cpp`
  `mirror_collect_images()` (op=6): `doc->QuerySelectorAll("img"_ns)` ->
  per img `do_QueryInterface(nsIImageLoadingContent)` -> `GetRequest(CURRENT_REQUEST)` ->
  `imgIRequest::GetImage` (imgIContainer) -> `imgITools::EncodeImage(container,"image/png")`
  -> `Base64EncodeInputStream` -> `data:image/png;base64,...`. Returns a JSON array in
  document order. The serializer tokenizes each `<img src>` as `#MIRRORIMG{n}#` (and strips
  srcset/sizes/loading); the mirror tick calls op5 then op6 and does one regex pass to swap
  tokens for data URLs. Verified: Wikipedia's cross-origin WA logo (upload.wikimedia.org)
  renders in the mirror.
- **KNOWN GAP - viewBox-only SVGs.** True SVG `<img>` (VectorImage) with no intrinsic
  width/height (e.g. Wikipedia's `enwiki-25.svg` chrome logo) yield nothing from
  EncodeImage AND from the `EncodeScaledImage(container,png,iw,ih)` fallback (GetWidth/Height
  return 0). PNG thumbnails of SVGs (.svg.png from the server) inline fine. Fix ideas: emit
  `data:image/svg+xml` from the cached source bytes, or rasterize at the element's layout box
  size. Available headers in dist/include: mozilla/dom/NodeList.h, imgITools/imgIRequest/
  imgIContainer.h, nsIImageLoadingContent.h, mozilla/Base64.h (nsContentList.h is NOT exported
  -> use nsINode::QuerySelectorAll returning mozilla::dom::NodeList).

## Performance (2026-06-16) -- mirror beats software paint, and is cheap in both static + dynamic cases
Measured steady-state engine CPU on static Wikipedia (DEBUG, 6s window, profile.cjs load
--settle): **mirror ~931ms active (~0.15 cores), software-canvas ~1636ms (~0.27 cores)** --
mirror ~1.75x cheaper, and its cost is mostly `(program)`/logging noise (software's is real
`blit`/`rect_memset32`/`blit_mask` paint every frame). The gap widens on complex pages: the
host browser does all compositing/scroll/text-AA natively (free; not even in the profile),
while software paint scales with page complexity.
Two optimizations made the mirror cheap:
- **Dirty-skip (JS, index.html).** A persistent `MutationObserver` on the content window
  (installed once inside `mirrorSerializerFn`, lives across op=5 calls) flips
  `window.__mirrorDirty`. The serializer early-returns `''` when clean AND no `<canvas>`
  present -> the mirror tick reuses the current iframe and skips op5-body + op6/7/8 entirely.
  CSS animations replay natively in the iframe, so a static-DOM page truly needs no re-mirror.
- **Resource caches (C++, embed-xul.cpp).** `g_mirrorImgCache` (key=image URL spec via
  `imgIRequest::GetURI()->GetSpec`) and `g_mirrorCssCache` (key=`(uintptr_t)StyleSheet*`),
  cleared in `xul_load` on navigation (`mirror_clear_caches()`). A dirty tick (SPA/dynamic
  page) then re-encodes ONLY new/changed resources. Measured per-op on a dirty tick:
  op7 css 17ms->4.6ms, op6 img 8->4ms (the ~4ms floor is the JS 4ms shared-buffer poll, not
  CPU). Only successful (non-empty) encodes are cached, so async-loading resources retry.
- **JS-side resource cache (index.html mirror loop).** Even with the C++ caches, the loop
  was re-pulling op6/op7 (hundreds of KB of data: URLs) over the shared buffer every dirty
  tick. Now the loop caches `cImgs`/`cCss` and refreshes them at most every 2s; the per-tick
  path only re-runs op5 (DOM, the thing that changes) + op8 (live canvas pixels). Cuts
  per-dirty-tick IPC ~10x on dynamic pages.
Verified dynamic page (bench/dynamic.html: 100ms text+canvas churn + a data: img): the mirror
advances live (tick2->tick4), canvas re-snapshots each tick, image stays cached, no regression
on Wikipedia. Remaining per-dirty-tick cost is op5's full clone+outerHTML re-serialize (~30ms)
-- true incremental diffing is blocked by the sandboxed (unscriptable) srcdoc iframe; a
hand-rolled one-pass serializer could ~halve it but risks HTML-escaping bugs (not worth it
vs. the browser's bulletproof outerHTML, given the dirty-skip already makes static pages free).

## INTERACTIVE-load fix + real-site catalog (2026-06-16)
`xul_load` used to SpinEventLoopUntil `READYSTATE_COMPLETE`. Heavy SPAs with long-lived
connections / endless subresource loads NEVER reach COMPLETE, so the load spun to the 500k
cap (minutes) and blocked the engine -> BBC/GitHub/Verge/Yahoo all hung. Changed to return
at `READYSTATE_INTERACTIVE` for ALL modes (the DOM + frame tree exist there; the mirror loop
keeps re-serializing and the paint loop keeps repainting as the page hydrates -- progressive
load like a real browser). Also a logging win: the per-resource `xul_render: load stop`
printf fired for EVERY subresource (112/192 console lines on a load; ~10% of load CPU went to
`_flushLog`); now gated to the overall network STOP (`STATE_IS_NETWORK`) + all failures.
Real heavy/high-mutation sites verified in mirror mode (DOM nodes / mutations-per-4s after
settle / mirror srcdoc size), all rendering correctly incl. cross-origin images+CSS:
- COVID-19 pandemic (wiki): 22955 nodes, **250 mut/4s**, 8.5MB -- heavy + high mutation.
- Yahoo Finance: 4777 nodes, 252 sheets, **117 mut/4s**, 7.4MB (live tickers) -- needed the fix.
- The Verge: 3156 nodes, 114 imgs, **336 mut/4s**, 1.25MB (React SPA) -- needed the fix.
- NYT: 3777 nodes, 78 sheets, 72 mut/4s (live "Xm ago") -- needed the fix.
- Barack_Obama / United_States (wiki): 23138 / 19623 nodes (heaviest DOM), load fine.
- GitHub torvalds/linux: 2348 nodes -- needed the fix. old.reddit: 1460 nodes, 24 x-origin imgs.
- Light/static: HN (817), lite.cnn (236). Still-stuck: bbc.com/news doesn't even reach
  INTERACTIVE over WISP (render-blocking resource it can't fetch). Heavy real-site bench:
  bench/_t_sites.cjs (SITES=comma,list; prints dom/imgs/sheets/mut-4s/mirrorKB + screenshots).

## Shadow DOM + iframes (2026-06-16) -- recursive serializer
`cloneNode(true)+outerHTML` can't reach shadow roots or iframe documents, so
`mirrorSerializerFn` is now a hand-rolled RECURSIVE serializer (read-only walk of the live
tree; no clone). A `top` flag is true only for the MAIN document's light DOM -- the tree the
C++ ops walk via querySelectorAll -- where it tokenizes `<img>`/`<canvas>` (#MIRRORIMG/
#MIRRORCANVAS, op6/op8 index order) and strips `<style>`/`<link>` (op7 re-supplies them).
- **Shadow DOM:** an element's open `shadowRoot` is emitted as a
  `<template shadowrootmode="open">...</template>` (declarative shadow DOM); the host's srcdoc
  parser reconstructs the real shadow root. Shadow-internal `<style>` is KEPT (scoped styling
  works). Verified: a web component with scoped CSS renders correctly (purple box).
- **iframes:** for a same-origin `<iframe>` (contentDocument accessible) the nested document
  is serialized recursively and emitted as `srcdoc=`. Cross-origin iframes (contentDocument
  null/throws) emit no src -> blank box (no real-internet load via the host). Verified: a
  srcdoc iframe's content renders in the mirror.
- Escaping: eA() for attrs (& " <), eT() for text (& < >); RAW set {style,script,xmp,noframes}
  emits textContent unescaped; VOID set for self-closing; `<script>`/`<noscript>` dropped.

## Composed-tree resource inlining (2026-06-16) -- shadow/iframe imgs/canvas/CSS now inlined
op6 (images) + op8 (canvas) now walk the COMPOSED tree via `mirror_walk()` (embed-xul.cpp)
instead of querySelectorAll, in the EXACT order the serializer visits nodes, so the
#MIRRORIMG{n}#/#MIRRORCANVAS{n}# indices line up across shadow roots and iframes:
- At each element: descend the OPEN shadow root (`Element::GetShadowRootForBindings()` =
  open, non-UA -- exactly what JS `element.shadowRoot` exposes) FIRST, then a same-origin
  iframe's doc (`OwnerDoc()->GetSubDocumentFor(el)` + `NodePrincipal()->Equals` check --
  matching JS `iframe.contentDocument`), then light children. Skip
  script/noscript/style/link/template subtrees (matches the serializer's drop/raw-emit).
- Serializer now tokenizes `<img>`/`<canvas>` EVERYWHERE (dropped the top-only gate), and
  inlines constructable/ADOPTED stylesheets (`root.adoptedStyleSheets[i].cssRules`, always
  same-origin/readable) as `<style>` -- in `<head>` for the document and inside each shadow
  `<template>`. (Avoid HTMLIFrameElement.h -- it drags in IPC headers the embedder build
  lacks; use Document::GetSubDocumentFor.)
- VERIFIED (bench/composedtest.html + _t_composed.cjs): a page with distinct images in light
  DOM, a web-component shadow root (+ a canvas + a constructable stylesheet), and a srcdoc
  iframe -- all images/canvas appear in their correct slots and the adopted CSS applies (no
  index misalignment). No regression on Wikipedia/dynamic/canvas/input.
- REMAINING gaps: closed shadow roots (invisible to JS + GetShadowRootForBindings); cross-origin
  iframes (blank, by design); cross-origin `<link rel=stylesheet>` inside shadow/iframe (rare;
  inline `<style>` + adopted are covered); shadow-only DOM mutations may not trip the
  document-level MutationObserver dirty flag.

## Op map (DOM-mirror)
op5 = serialize DOM (content JS), op6 = `<img>` data URLs, op7 = stylesheet data URLs,
op8 = `<canvas>` snapshots. ops 5-8 all return a UTF-8 string via result/resultLen; the
JS `runCmd` handles `op>=5 && op<=8` as string results, `window.geckoInput({op})` exposes
them for tests.

## Still TODO / known gaps
viewBox-only SVG `<img>` (no intrinsic size -> blank; see above), `@import`-nested
stylesheets + `url(...)` resources inside CSS (fonts/bg-images not inlined), incremental
diffing (currently full re-serialize at ~5fps). Builds on [[gecko-wasm-full-chrome]] /
[[gecko-wasm-canvas-passthrough]].
