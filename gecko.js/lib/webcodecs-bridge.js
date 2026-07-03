// Repo-local emscripten --js-library: route Gecko's H.264 video decode to the
// HOST browser's WebCodecs VideoDecoder (wired in via build-embed-full.sh with
// `--js-library`).
//
// WHY: our wasm32 build has no in-process H.264 decoder (ffvpx on wasm is
// audio-only; libavcodec's H.264 isn't compiled). The host browser HAS a real,
// GPU-backed H.264 decoder exposed as WebCodecs `VideoDecoder`. A new Gecko
// PlatformDecoderModule (dom/media/platforms/wasm/WebCodecsProxyDecoderModule)
// drives this bridge to decode AVCC samples and receive I420 frames back.
//
// THREADING: Gecko runs each MediaDataDecoder on a PLATFORM_DECODER TaskQueue,
// i.e. a pthread (Web Worker). WebCodecs `VideoDecoder` only exists on the
// runtime MAIN (window) thread. So the 5 entrypoints below are `__proxy:'sync'`:
// the calling decoder worker blocks while the body runs on main (where the
// VideoDecoder lives), exactly like wisp_select_scan. The decoder worker and
// main communicate through a per-decoder CONTROL BLOCK (a shared-heap int32
// array, alloc'd C++-side) holding atomics + a frame ring.
//
//   control block (int32 indices; see $wcOff):
//     [WC_WRITE] producer count  (main bumps after publishing a frame)
//     [WC_READ]  consumer count  (worker bumps after consuming a frame)
//     [WC_FLUSH] flush-done count (main bumps when host flush() completes)
//     [WC_ERROR] sticky error flag (main sets on decode/configure error)
//     [WC_FUTEX] wake word        (main Atomics.add+notify; worker futex-waits)
//     [WC_HDR..] frame ring: RING_N slots x SLOT_INTS ints (see SL_* offsets)
//
// FRAME PATH: VideoDecoder emits a VideoFrame on main -> onFrame() reads it in its
// NATIVE pixel format and writes 3-plane I420 into a freshly malloc'd shared-heap
// buffer (the C++ side / DrainRing is hardcoded to 3-plane 4:2:0, skip=0):
//   - I420/I420A          : copied plane-wise (alpha ignored).
//   - NV12                : interleaved UV plane deinterleaved into separate U/V.
//   - RGBA/RGBX/BGRA/BGRX : packed RGB (what Chrome's GPU H.264 decoder emits here,
//     as BGRX) converted to full-range BT.601 I420 (Y per pixel; U/V from 2x2-box-
//     averaged RGB), tagged to Gecko as matrix=BT.601, range=full.
// We do NOT request a copyTo({format:'I420'}) conversion -- Chrome rejects it for its
// native GPU formats ("pixel format conversion is not supported"). onFrame then
// publishes a descriptor into the ring, bumps WC_WRITE and wakes the worker. The
// worker (C++ DrainRing) hands the planes to VideoData::CreateAndCopyData (which
// COPIES them), frees the buffer, and bumps WC_READ.
//
// LIFECYCLE / RACES: malloc happens on main, free happens on whichever thread
// finishes with the buffer (shared dlmalloc under -pthread -> safe). A `gen`
// counter on each decoder is bumped on reset()/destroy(); an async onFrame that
// finishes its copyTo AFTER a reset re-checks gen and, if stale, frees only its
// own (never-published) buffer and drops the frame -- it never touches the
// control block, which the worker may have freed. reset()/destroy() run on main
// while the worker is blocked inside the sync proxy call, so they never race the
// worker's ring access.

mergeInto(LibraryManager.library, {
  // Control-block + ring-slot layout. Shared with the C++ side
  // (WebCodecsProxyDecoderModule.cpp must use identical values).
  $wcOff: {
    WC_WRITE: 0, WC_READ: 1, WC_FLUSH: 2, WC_ERROR: 3, WC_FUTEX: 4,
    WC_HDR: 5,
    RING_N: 64, SLOT_INTS: 14,
    // ring-slot int32 fields:
    SL_PTR: 0,   // shared-heap pointer to the I420 buffer (malloc'd on main)
    SL_LEN: 1,   // buffer byte length (allocationSize)
    SL_W: 2,     // visible width
    SL_H: 3,     // visible height
    SL_SY: 4,    // Y stride
    SL_SU: 5,    // U stride
    SL_SV: 6,    // V stride
    SL_OY: 7,    // Y plane offset within the buffer
    SL_OU: 8,    // U plane offset
    SL_OV: 9,    // V plane offset
    SL_TSLO: 10, // timestamp (microseconds) low 32 bits
    SL_TSHI: 11, // timestamp high 32 bits
    SL_MTX: 12,  // matrix coefficients code (see matrixCode / C++ MatrixToColorSpace)
    SL_RANGE: 13 // color range: 1 = full, 0 = limited
  },

  $wcRT__deps: ['$wcOff'],
  $wcRT: {
    decoders: null,   // Map<handle, reg> (lazy)
    nextId: 1,
    warnedFmt: false, // one-shot guard for the unsupported-format warning

    ensure: function () {
      if (!wcRT.decoders) wcRT.decoders = new Map();
    },

    // VideoColorSpace.matrix string -> code consumed by C++ MatrixToColorSpace:
    //   0 = BT.601, 1 = BT.709 (default), 2 = BT.2020, 3 = Identity/RGB.
    matrixCode: function (s) {
      if (s === 'rgb') return 3;
      if (s === 'bt470bg' || s === 'smpte170m') return 0;
      if (s === 'bt2020-ncl') return 2;
      return 1;
    },

    // Bump the per-decoder wake word and wake the (possibly blocked) worker.
    // Atomics.notify is allowed on the main thread (Atomics.wait is not).
    wake: function (reg) {
      var fi = (reg.ctrl >> 2) + wcOff.WC_FUTEX;
      Atomics.add(HEAP32, fi, 1);
      Atomics.notify(HEAP32, fi, 1);
    },

    setError: function (reg) {
      Atomics.store(HEAP32, (reg.ctrl >> 2) + wcOff.WC_ERROR, 1);
      wcRT.wake(reg);
    },

    // Async VideoDecoder output callback. Reads the frame in its NATIVE format and
    // writes 3-plane I420 into a private shared-heap buffer, then publishes it into
    // the ring. We never request copyTo({format:'I420'}): Chrome rejects conversion
    // from its native GPU formats, so we read native (I420/NV12/packed-RGB) and build
    // I420 ourselves. All per-frame data is captured into locals BEFORE the first
    // await -- during a flush burst the next callback runs before this copy resolves.
    onFrame: async function (reg, frame) {
      var myGen = reg.gen;
      var ptr = 0;
      try {
        var fmt = frame.format;
        var isI420 = (fmt === 'I420' || fmt === 'I420A');
        var isNV12 = (fmt === 'NV12');
        // RGB family -> [rOff, gOff, bOff] within each 4-byte packed pixel.
        var rgb = (fmt === 'RGBA' || fmt === 'RGBX') ? [0, 1, 2]
                : (fmt === 'BGRA' || fmt === 'BGRX') ? [2, 1, 0]
                : null;
        if (!isI420 && !isNV12 && !rgb) {
          if (!wcRT.warnedFmt) {
            wcRT.warnedFmt = true;
            console.warn('[webcodecs] unsupported VideoFrame format:', fmt);
          }
          frame.close();
          return;
        }

        var vr = frame.visibleRect;
        var opts = {};
        if (vr) opts.rect = vr;
        var w = vr ? vr.width : frame.codedWidth;
        var h = vr ? vr.height : frame.codedHeight;
        var ts = frame.timestamp; // microseconds
        var mtx = 1, range = 0;
        if (frame.colorSpace) {
          mtx = wcRT.matrixCode(frame.colorSpace.matrix);
          range = frame.colorSpace.fullRange ? 1 : 0;
        }

        // Y/U/V strides + offsets within the published buffer (filled per format).
        var sy, su, sv, oy, ou, ov, size;

        if (isI420) {
          // Native planar: copy straight into the shared buffer and report the
          // implementation's own layout (strides may be padded; alpha ignored).
          size = frame.allocationSize(opts);
          ptr = Module._malloc(size);
          if (!ptr) { frame.close(); return; }
          var layout;
          var copy = frame.copyTo(HEAPU8.subarray(ptr, ptr + size), opts)
            .then(function (lay) { layout = lay; });
          reg.pending = reg.pending.then(function () { return copy; });
          await copy;
          frame.close();
          frame = null;
          sy = layout[0].stride; oy = layout[0].offset;
          su = layout[1].stride; ou = layout[1].offset;
          sv = layout[2].stride; ov = layout[2].offset;
        } else if (isNV12) {
          // NV12: copy native (Y + interleaved CbCr) into a temp, then build a tight
          // I420 in the shared buffer by deinterleaving the UV plane into U,V.
          var cw = (w + 1) >> 1, ch = (h + 1) >> 1;
          var nsize = frame.allocationSize(opts);
          var tmp = new Uint8Array(nsize);
          var nlayout;
          var copyN = frame.copyTo(tmp, opts)
            .then(function (lay) { nlayout = lay; });
          reg.pending = reg.pending.then(function () { return copyN; });
          await copyN;
          frame.close();
          frame = null;

          sy = w; oy = 0;
          su = cw; ou = w * h;
          sv = cw; ov = w * h + cw * ch;
          size = w * h + 2 * cw * ch;
          ptr = Module._malloc(size);
          if (!ptr) return;

          var dst = HEAPU8; // re-acquire post-await (heap may have grown)
          var yOff = nlayout[0].offset, yStride = nlayout[0].stride;
          var uvOff = nlayout[1].offset, uvStride = nlayout[1].stride;
          for (var y = 0; y < h; y++) {
            var ysrc = yOff + y * yStride;
            dst.set(tmp.subarray(ysrc, ysrc + w), ptr + oy + y * w);
          }
          for (var cy = 0; cy < ch; cy++) {
            var srow = uvOff + cy * uvStride;
            var urow = ptr + ou + cy * cw;
            var vrow = ptr + ov + cy * cw;
            for (var cx = 0; cx < cw; cx++) {
              dst[urow + cx] = tmp[srow + 2 * cx];
              dst[vrow + cx] = tmp[srow + 2 * cx + 1];
            }
          }
        } else {
          // RGB family (Chrome's GPU H.264 emits BGRX here). Convert packed RGB ->
          // full-range BT.601 I420: Y per pixel, U/V from 2x2-box-averaged RGB. We
          // tag matrix=BT.601(0)/range=full(1) so Gecko's inverse recovers the same
          // RGB (chroma subsampling aside).
          var cw = (w + 1) >> 1, ch = (h + 1) >> 1;
          var nsize = frame.allocationSize(opts);
          var tmp = new Uint8Array(nsize);
          var rlayout;
          var copyR = frame.copyTo(tmp, opts)
            .then(function (lay) { rlayout = lay; });
          reg.pending = reg.pending.then(function () { return copyR; });
          await copyR;
          frame.close();
          frame = null;

          sy = w; oy = 0;
          su = cw; ou = w * h;
          sv = cw; ov = w * h + cw * ch;
          size = w * h + 2 * cw * ch;
          ptr = Module._malloc(size);
          if (!ptr) return;
          mtx = 0; range = 1; // produced as BT.601 full-range

          var dst = HEAPU8; // re-acquire post-await/malloc
          var pOff = rlayout[0].offset, pStride = rlayout[0].stride;
          var rO = rgb[0], gO = rgb[1], bO = rgb[2];
          for (var y = 0; y < h; y++) {
            var prow = pOff + y * pStride, yd = ptr + y * w;
            for (var x = 0; x < w; x++) {
              var px = prow + (x << 2);
              dst[yd + x] = (0.299 * tmp[px + rO] + 0.587 * tmp[px + gO] +
                             0.114 * tmp[px + bO] + 0.5) | 0;
            }
          }
          for (var cy = 0; cy < ch; cy++) {
            var y0 = cy << 1, y1 = (y0 + 1 < h) ? y0 + 1 : y0;
            var o0 = pOff + y0 * pStride, o1 = pOff + y1 * pStride;
            var ud = ptr + ou + cy * cw, vd = ptr + ov + cy * cw;
            for (var cx = 0; cx < cw; cx++) {
              var x0 = cx << 1, x1 = (x0 + 1 < w) ? x0 + 1 : x0;
              var p00 = o0 + (x0 << 2), p01 = o0 + (x1 << 2),
                  p10 = o1 + (x0 << 2), p11 = o1 + (x1 << 2);
              var r = (tmp[p00 + rO] + tmp[p01 + rO] + tmp[p10 + rO] + tmp[p11 + rO] + 2) >> 2;
              var g = (tmp[p00 + gO] + tmp[p01 + gO] + tmp[p10 + gO] + tmp[p11 + gO] + 2) >> 2;
              var b = (tmp[p00 + bO] + tmp[p01 + bO] + tmp[p10 + bO] + tmp[p11 + bO] + 2) >> 2;
              var u = (-0.168736 * r - 0.331264 * g + 0.5 * b + 128.5) | 0;
              var v = (0.5 * r - 0.418688 * g - 0.081312 * b + 128.5) | 0;
              dst[ud + cx] = u < 0 ? 0 : (u > 255 ? 255 : u);
              dst[vd + cx] = v < 0 ? 0 : (v > 255 ? 255 : v);
            }
          }
        }

        // A reset()/destroy() may have happened during the await. If so this frame
        // is stale: free our own buffer and drop it WITHOUT touching the control
        // block (the worker may already have freed it).
        if (myGen !== reg.gen || reg.dead) { Module._free(ptr); return; }

        var ci = reg.ctrl >> 2;
        // Ring full? (worker is RING_N frames behind.) Drop this frame.
        var readCount = Atomics.load(HEAP32, ci + wcOff.WC_READ);
        if (reg.writeCount - readCount >= wcOff.RING_N) {
          console.warn('[webcodecs] ring overflow; frame dropped');
          Module._free(ptr);
          return;
        }

        var tsHi = Math.floor(ts / 4294967296);
        var tsLo = ts - tsHi * 4294967296;

        var slot = ci + wcOff.WC_HDR + (reg.writeCount % wcOff.RING_N) * wcOff.SLOT_INTS;
        HEAP32[slot + wcOff.SL_PTR] = ptr;
        HEAP32[slot + wcOff.SL_LEN] = size;
        HEAP32[slot + wcOff.SL_W] = w;
        HEAP32[slot + wcOff.SL_H] = h;
        HEAP32[slot + wcOff.SL_SY] = sy;
        HEAP32[slot + wcOff.SL_SU] = su;
        HEAP32[slot + wcOff.SL_SV] = sv;
        HEAP32[slot + wcOff.SL_OY] = oy;
        HEAP32[slot + wcOff.SL_OU] = ou;
        HEAP32[slot + wcOff.SL_OV] = ov;
        HEAP32[slot + wcOff.SL_TSLO] = tsLo | 0;
        HEAP32[slot + wcOff.SL_TSHI] = tsHi | 0;
        HEAP32[slot + wcOff.SL_MTX] = mtx;
        HEAP32[slot + wcOff.SL_RANGE] = range;

        reg.writeCount++;
        Atomics.store(HEAP32, ci + wcOff.WC_WRITE, reg.writeCount);
        wcRT.wake(reg);
      } catch (e) {
        console.warn('[webcodecs] onFrame failed:', e && e.message ? e.message : e);
        if (ptr) Module._free(ptr);
        if (frame) { try { frame.close(); } catch (_) {} }
        if (myGen === reg.gen && !reg.dead) wcRT.setError(reg);
      }
    }
  },

  // ---- proxied entrypoints (run on the runtime MAIN thread) ------------------

  // Create + configure a VideoDecoder. codecPtr -> UTF8 codec string built by
  // the C++ side ("avc1.<hex>", "vp8", or "vp09.00.10.08"). descPtr/descLen ->
  // optional codec description (the mp4 avcC box for H.264; absent for VPx).
  // Returns an opaque handle (>=0) or -1 on failure (e.g. no WebCodecs).
  webcodecs_create__proxy: 'sync',
  webcodecs_create__deps: ['$wcRT', '$UTF8ToString'],
  webcodecs_create: function (ctrl, codecPtr, descPtr, descLen, width, height) {
    wcRT.ensure();
    if (typeof VideoDecoder === 'undefined') {
      console.warn('[webcodecs] VideoDecoder unavailable in this browser');
      return -1;
    }
    var codec = codecPtr ? UTF8ToString(codecPtr) : 'avc1.42E01E';
    var description = descLen >= 1 ? HEAPU8.slice(descPtr, descPtr + descLen) : null;

    var id = wcRT.nextId++;
    var reg = {
      id: id, ctrl: ctrl, gen: 0, dead: false,
      writeCount: 0, width: width, height: height,
      pending: Promise.resolve(), decoder: null, config: null
    };
    var config = {
      codec: codec, codedWidth: width, codedHeight: height,
      optimizeForLatency: true
    };
    if (description) config.description = description;
    reg.config = config;

    try {
      var dec = new VideoDecoder({
        output: function (frame) { wcRT.onFrame(reg, frame); },
        error: function (e) {
          console.warn('[webcodecs] decoder error:', e && e.message ? e.message : e);
          wcRT.setError(reg);
        }
      });
      dec.configure(config);
      reg.decoder = dec;
    } catch (e) {
      console.warn('[webcodecs] configure failed:', e && e.message ? e.message : e);
      return -1;
    }
    wcRT.decoders.set(id, reg);
    return id;
  },

  // Feed one AVCC sample. ts split into lo/hi 32-bit halves (microseconds).
  webcodecs_feed__proxy: 'sync',
  webcodecs_feed__deps: ['$wcRT'],
  webcodecs_feed: function (handle, dataPtr, dataLen, isKey, tsLo, tsHi) {
    var reg = wcRT.decoders && wcRT.decoders.get(handle);
    if (!reg || reg.dead || !reg.decoder) return;
    var ts = (tsHi | 0) * 4294967296 + (tsLo >>> 0);
    try {
      var chunk = new EncodedVideoChunk({
        type: isKey ? 'key' : 'delta',
        timestamp: ts,
        data: HEAPU8.slice(dataPtr, dataPtr + dataLen)
      });
      reg.decoder.decode(chunk);
    } catch (e) {
      console.warn('[webcodecs] decode() threw:', e && e.message ? e.message : e);
      wcRT.setError(reg);
    }
  },

  // End-of-stream drain (maps to MediaDataDecoder::Drain). flush() emits every
  // buffered frame (output callbacks run), then resolves; we wait for all those
  // copies (reg.pending), bump WC_FLUSH and wake the blocked worker.
  webcodecs_flush__proxy: 'sync',
  webcodecs_flush__deps: ['$wcRT'],
  webcodecs_flush: function (handle) {
    var reg = wcRT.decoders && wcRT.decoders.get(handle);
    if (!reg || reg.dead || !reg.decoder) return;
    var ci = reg.ctrl >> 2;
    var done = function () {
      if (reg.dead) return;
      Atomics.add(HEAP32, ci + wcOff.WC_FLUSH, 1);
      wcRT.wake(reg);
    };
    reg.decoder.flush()
      .then(function () { return reg.pending; })
      .then(done)
      .catch(function () { done(); }); // reset() can reject a pending flush; still unblock
  },

  // Seek/discard (maps to MediaDataDecoder::Flush). Runs while the worker is
  // blocked in the sync proxy, so the ring can be torn down race-free.
  webcodecs_reset__proxy: 'sync',
  webcodecs_reset__deps: ['$wcRT'],
  webcodecs_reset: function (handle) {
    var reg = wcRT.decoders && wcRT.decoders.get(handle);
    if (!reg || reg.dead) return;
    reg.gen++; // invalidate in-flight onFrame stragglers
    try { reg.decoder.reset(); } catch (_) {}
    var ci = reg.ctrl >> 2;
    var readCount = Atomics.load(HEAP32, ci + wcOff.WC_READ);
    for (var c = readCount; c < reg.writeCount; c++) {
      var slot = ci + wcOff.WC_HDR + (c % wcOff.RING_N) * wcOff.SLOT_INTS;
      var p = HEAP32[slot + wcOff.SL_PTR];
      if (p) Module._free(p);
    }
    reg.writeCount = 0;
    Atomics.store(HEAP32, ci + wcOff.WC_WRITE, 0);
    Atomics.store(HEAP32, ci + wcOff.WC_READ, 0);
    Atomics.store(HEAP32, ci + wcOff.WC_ERROR, 0);
    reg.pending = Promise.resolve();
    try { reg.decoder.configure(reg.config); } catch (_) {} // reset() -> unconfigured
  },

  // Tear down (maps to MediaDataDecoder::Shutdown). After this returns the C++
  // side frees the control block; stragglers see reg.dead and never touch it.
  webcodecs_destroy__proxy: 'sync',
  webcodecs_destroy__deps: ['$wcRT'],
  webcodecs_destroy: function (handle) {
    var reg = wcRT.decoders && wcRT.decoders.get(handle);
    if (!reg) return;
    reg.gen++;
    reg.dead = true;
    try { reg.decoder.close(); } catch (_) {}
    var ci = reg.ctrl >> 2;
    var readCount = Atomics.load(HEAP32, ci + wcOff.WC_READ);
    for (var c = readCount; c < reg.writeCount; c++) {
      var slot = ci + wcOff.WC_HDR + (c % wcOff.RING_N) * wcOff.SLOT_INTS;
      var p = HEAP32[slot + wcOff.SL_PTR];
      if (p) Module._free(p);
    }
    wcRT.decoders.delete(handle);
  },

  // ===== AUDIO: route AAC decode to the host WebCodecs AudioDecoder ===========
  //
  // Mirrors the video path, but simpler: AudioData.copyTo() is SYNCHRONOUS (it
  // returns undefined, not a Promise) and converts to the requested interleaved
  // float32 ('f32') format in place. So onAudioData runs to completion inside the
  // decoder's output callback -- there is no await, no straggler copy, and hence
  // no `gen` counter. reset()/destroy() run on main while the worker is blocked
  // inside the sync proxy call, so they never race the worker's ring access.
  // Each ring slot carries one block of interleaved f32 PCM.
  //
  //   audio control block (int32 indices; see $wcaOff): same atomic header as the
  //   video block (WC_WRITE..WC_FUTEX); ring is RING_N slots x SLOT_INTS ints.
  $wcaOff: {
    WC_WRITE: 0, WC_READ: 1, WC_FLUSH: 2, WC_ERROR: 3, WC_FUTEX: 4,
    WC_HDR: 5,
    RING_N: 64, SLOT_INTS: 7,
    // ring-slot int32 fields:
    AL_PTR: 0,    // shared-heap pointer to interleaved f32 PCM (malloc'd on main)
    AL_BYTES: 1,  // buffer byte length
    AL_FRAMES: 2, // frames per channel
    AL_CH: 3,     // channel count
    AL_RATE: 4,   // sample rate
    AL_TSLO: 5,   // timestamp (microseconds) low 32 bits
    AL_TSHI: 6    // timestamp high 32 bits
  },

  $wcaRT__deps: ['$wcaOff'],
  $wcaRT: {
    decoders: null, // Map<handle, reg> (lazy)
    nextId: 1,
    ctx: null,
    sink: null,
    sinkReady: null,
    ringCtrl: null,
    ringPcm: null,
    ringFrames: 0,
    ringChannels: 2,
    resumeBound: false,
    playing: true,
    preferredRate: 0,
    mediaClockUs: 0,
    mediaClockWall: 0,
    audioGen: 0,
    justResumed: false,
    justSeeked: false,
    pending: [],
    pendingTimer: 0,
    lastWriteL: 0,
    lastWriteR: 0,
    haveLastWrite: false,

    ensure: function () {
      if (!wcaRT.decoders) wcaRT.decoders = new Map();
      wcaRT.ensureAudioContext();
    },

    ensureAudioContext: function () {
      if (wcaRT.ctx || typeof window === 'undefined') return;
      var Ctor = window.AudioContext || window.webkitAudioContext;
      if (!Ctor) {
        console.warn('[webcodecs-audio] AudioContext unavailable');
        return;
      }
      try {
        var opts = { latencyHint: 'playback' };
        if (wcaRT.preferredRate) opts.sampleRate = wcaRT.preferredRate;
        wcaRT.ctx = new Ctor(opts);
      } catch (_) {
        try { wcaRT.ctx = new Ctor(); } catch (e) {
          console.warn('[webcodecs-audio] AudioContext create failed:', e && e.message ? e.message : e);
          return;
        }
      }
      if (!wcaRT.resumeBound) {
        wcaRT.resumeBound = true;
        var resume = function () {
          if (!wcaRT.ctx || wcaRT.ctx.state === 'running') return;
          wcaRT.ctx.resume().catch(function () {});
        };
        ['pointerdown', 'mousedown', 'touchstart', 'keydown'].forEach(function (type) {
          window.addEventListener(type, resume, { passive: true });
        });
      }
      wcaRT.ensureSink();
    },

    ensureSink: function () {
      if (wcaRT.sink || wcaRT.sinkReady || !wcaRT.ctx || !wcaRT.ctx.audioWorklet) return;
      var code = "class HostAudioSink extends AudioWorkletProcessor {" +
        "constructor(o){super();this.ctrl=new Int32Array(o.processorOptions.ctrl);this.pcm=new Float32Array(o.processorOptions.pcm);this.started=false;this.fade=0;this.prebuffer=Math.floor(sampleRate*0.06);}" +
        "process(i,o){var out=o[0];if(!out||!out.length)return true;var n=out[0].length;for(var c=0;c<out.length;c++)out[c].fill(0);if(!Atomics.load(this.ctrl,4))return true;var cap=Atomics.load(this.ctrl,2),ch=Atomics.load(this.ctrl,3),w=Atomics.load(this.ctrl,0),r=Atomics.load(this.ctrl,1),avail=w-r;if(!this.started){if(avail<this.prebuffer)return true;this.started=true;this.fade=0;}for(var f=0;f<n&&r<w;f++,r++){var base=(r%cap)*ch;for(var c=0;c<out.length;c++){var srcCh=ch===1?0:Math.min(c,ch-1),g=this.fade<128?this.fade/128:1;out[c][f]=this.pcm[base+srcCh]*g;}if(this.fade<128)this.fade++;}Atomics.store(this.ctrl,1,r);if(r>=w){this.started=false;this.fade=0;}return true;}} registerProcessor('host-audio-sink', HostAudioSink);";
      var url = 'data:application/javascript;charset=utf-8,' + encodeURIComponent(code);
      wcaRT.ringFrames = Math.max(8192, Math.floor(wcaRT.ctx.sampleRate * 2));
      wcaRT.ringCtrl = new Int32Array(new SharedArrayBuffer(8 * 4));
      wcaRT.ringPcm = new Float32Array(new SharedArrayBuffer(wcaRT.ringFrames * wcaRT.ringChannels * 4));
      Atomics.store(wcaRT.ringCtrl, 2, wcaRT.ringFrames);
      Atomics.store(wcaRT.ringCtrl, 3, wcaRT.ringChannels);
      Atomics.store(wcaRT.ringCtrl, 4, wcaRT.playing ? 1 : 0);
      wcaRT.sinkReady = wcaRT.ctx.audioWorklet.addModule(url).then(function () {
        wcaRT.sink = new AudioWorkletNode(wcaRT.ctx, 'host-audio-sink', {
          outputChannelCount: [2],
          processorOptions: { ctrl: wcaRT.ringCtrl.buffer, pcm: wcaRT.ringPcm.buffer }
        });
        wcaRT.sink.connect(wcaRT.ctx.destination);
      }).catch(function (e) {
        console.warn('[webcodecs-audio] AudioWorklet create failed:', e && e.message ? e.message : e);
      });
    },

    enqueueToHostAudio: function (reg, data, ptr, bytes) {
      var ctx = wcaRT.ctx;
      if (!ctx || !data || !bytes) return false;
      if (!wcaRT.playing) return false;
      if (!wcaRT.sink) return false;
      if (ctx.state === 'suspended') ctx.resume().catch(function () {});
      var frames = data.numberOfFrames;
      var channels = data.numberOfChannels;
      var rate = data.sampleRate;
      var ts = data.timestamp;
      if (!frames || !channels || !rate) return false;
      if (reg.lastScheduledTs != null && ts <= reg.lastScheduledTs) return false;

      var src = HEAPF32.subarray(ptr >> 2, (ptr + bytes) >> 2);
      var outFrames = frames;
      var samples;
      if (rate === ctx.sampleRate) {
        samples = new Float32Array(src);
      } else {
        outFrames = Math.max(1, Math.round(frames * ctx.sampleRate / rate));
        samples = new Float32Array(outFrames * channels);
        var scale = rate / ctx.sampleRate;
        for (var i = 0; i < outFrames; i++) {
          var pos = i * scale;
          var i0 = Math.min(frames - 1, pos | 0);
          var i1 = Math.min(frames - 1, i0 + 1);
          var frac = pos - i0;
          for (var ch = 0; ch < channels; ch++) {
            var a = src[i0 * channels + ch];
            var b = src[i1 * channels + ch];
            samples[i * channels + ch] = a + (b - a) * frac;
          }
        }
      }
      reg.lastScheduledTs = ts;
      wcaRT.queueTimedSamples(ts, samples, outFrames, channels, wcaRT.audioGen);
      return true;
    },

    currentMediaUs: function () {
      if (!wcaRT.mediaClockWall) return 0;
      return wcaRT.mediaClockUs + (performance.now() - wcaRT.mediaClockWall) * 1000;
    },

    queueTimedSamples: function (ts, samples, frames, channels, gen) {
      if (!wcaRT.sink || !wcaRT.playing || gen !== wcaRT.audioGen) return;
      wcaRT.pending.push({ ts: ts, samples: samples, frames: frames, channels: channels, gen: gen });
      if (!wcaRT.pendingTimer) wcaRT.pendingTimer = setTimeout(wcaRT.drainPending, 0);
    },

    drainPending: function () {
      wcaRT.pendingTimer = 0;
      if (!wcaRT.sink) {
        wcaRT.pending.length = 0;
        return;
      }
      if (!wcaRT.playing) return;
      wcaRT.pending.sort(function (a, b) { return a.ts - b.ts; });
      var nowUs = wcaRT.currentMediaUs();
      while (wcaRT.pending.length) {
        var p = wcaRT.pending[0];
        if (p.gen !== wcaRT.audioGen) {
          wcaRT.pending.shift();
          continue;
        }
        var leadUs = p.ts - nowUs;
        var maxLeadUs = (wcaRT.justResumed || wcaRT.justSeeked) ? 90000 : 420000;
        if (leadUs > maxLeadUs) break;
        wcaRT.pending.shift();
        wcaRT.writeRing(p.samples, p.frames, p.channels, p.ts);
        wcaRT.justResumed = false;
        wcaRT.justSeeked = false;
      }
      if (wcaRT.pending.length) {
        var targetLeadUs = (wcaRT.justResumed || wcaRT.justSeeked) ? 40000 : 300000;
        var wait = Math.min(100, Math.max(5, (wcaRT.pending[0].ts - wcaRT.currentMediaUs() - targetLeadUs) / 1000));
        wcaRT.pendingTimer = setTimeout(wcaRT.drainPending, wait);
      }
    },

    writeRing: function (samples, frames, channels, ts) {
      var ctrl = wcaRT.ringCtrl, pcm = wcaRT.ringPcm;
      if (!ctrl || !pcm || !frames) return;
      var cap = wcaRT.ringFrames, outCh = wcaRT.ringChannels;
      var w = Atomics.load(ctrl, 0), r = Atomics.load(ctrl, 1);
      if (frames > cap) {
        var skip = frames - cap;
        samples = samples.subarray(skip * channels);
        frames = cap;
      }
      var overflow = (w - r) + frames - cap;
      if (overflow > 0) {
        r += overflow;
        Atomics.store(ctrl, 1, r);
      }
      if (wcaRT.haveLastWrite && frames > 0) {
        var firstL = samples[0];
        var firstR = channels > 1 ? samples[1] : firstL;
        var jump = Math.max(Math.abs(firstL - wcaRT.lastWriteL), Math.abs(firstR - wcaRT.lastWriteR));
        if (jump > 0.35) {
          var n = Math.min(frames, 64);
          for (var j = 0; j < n; j++) {
            var t = (j + 1) / (n + 1);
            samples[j * channels] = wcaRT.lastWriteL + (samples[j * channels] - wcaRT.lastWriteL) * t;
            if (channels > 1) {
              samples[j * channels + 1] = wcaRT.lastWriteR + (samples[j * channels + 1] - wcaRT.lastWriteR) * t;
            }
          }
        }
      }
      for (var i = 0; i < frames; i++) {
        var dst = ((w + i) % cap) * outCh;
        var src = i * channels;
        pcm[dst] = samples[src];
        pcm[dst + 1] = channels > 1 ? samples[src + 1] : samples[src];
      }
      var tail = (frames - 1) * channels;
      wcaRT.lastWriteL = samples[tail];
      wcaRT.lastWriteR = channels > 1 ? samples[tail + 1] : samples[tail];
      wcaRT.haveLastWrite = true;
      Atomics.store(ctrl, 0, w + frames);
    },

    stopPlayback: function (reg) {
      if (reg) reg.lastScheduledTs = null;
      wcaRT.audioGen++;
      wcaRT.pending.length = 0;
      if (wcaRT.pendingTimer) {
        clearTimeout(wcaRT.pendingTimer);
        wcaRT.pendingTimer = 0;
      }
      wcaRT.haveLastWrite = false;
      if (wcaRT.ringCtrl) {
        var w = Atomics.load(wcaRT.ringCtrl, 0);
        Atomics.store(wcaRT.ringCtrl, 1, w);
      }
    },

    stopAllPlayback: function () {
      if (wcaRT.decoders) {
        wcaRT.decoders.forEach(function (reg) { wcaRT.stopPlayback(reg); });
      }
      wcaRT.pending.length = 0;
      if (wcaRT.pendingTimer) {
        clearTimeout(wcaRT.pendingTimer);
        wcaRT.pendingTimer = 0;
      }
      wcaRT.haveLastWrite = false;
      if (wcaRT.ringCtrl) {
        var w = Atomics.load(wcaRT.ringCtrl, 0);
        Atomics.store(wcaRT.ringCtrl, 1, w);
      }
    },

    setPlaying: function (playing) {
      wcaRT.playing = !!playing;
      wcaRT.justResumed = wcaRT.playing;
      wcaRT.mediaClockWall = performance.now();
      wcaRT.ensureAudioContext();
      if (!wcaRT.ctx) return;
      if (wcaRT.ringCtrl) Atomics.store(wcaRT.ringCtrl, 4, wcaRT.playing ? 1 : 0);
      if (wcaRT.playing) {
        if (wcaRT.pending.length && !wcaRT.pendingTimer) {
          wcaRT.pendingTimer = setTimeout(wcaRT.drainPending, 0);
        }
        wcaRT.ctx.resume().catch(function () {});
      }
    },

    wake: function (reg) {
      var fi = (reg.ctrl >> 2) + wcaOff.WC_FUTEX;
      Atomics.add(HEAP32, fi, 1);
      Atomics.notify(HEAP32, fi, 1);
    },

    setError: function (reg) {
      Atomics.store(HEAP32, (reg.ctrl >> 2) + wcaOff.WC_ERROR, 1);
      wcaRT.wake(reg);
    },

    // Synchronous AudioDecoder output callback: copy interleaved f32 PCM into a
    // private shared-heap buffer, publish a descriptor into the ring, bump
    // WC_WRITE and wake the (possibly blocked) worker.
    onAudioData: function (reg, data) {
      var ptr = 0;
      try {
        if (reg.dead) { data.close(); return; }
        wcaRT.ensureAudioContext();
        var frames = data.numberOfFrames;
        var channels = data.numberOfChannels;
        if (!frames || !channels) { data.close(); return; }
        var bytes = frames * channels * 4; // interleaved float32
        ptr = Module._malloc(bytes);
        if (!ptr) { data.close(); return; }
        // Synchronous; converts to interleaved f32 regardless of the decoder's
        // native sample format. planeIndex 0 is the only plane for interleaved.
        data.copyTo(HEAPU8.subarray(ptr, ptr + bytes),
                    { planeIndex: 0, format: 'f32' });
        var ts = data.timestamp; // microseconds
        var rate = data.sampleRate;
        try {
          wcaRT.enqueueToHostAudio(reg, data, ptr, bytes);
        } catch (e) {
          console.warn('[webcodecs-audio] host playback failed:', e && e.message ? e.message : e);
        }
        data.close();

        var ci = reg.ctrl >> 2;
        var readCount = Atomics.load(HEAP32, ci + wcaOff.WC_READ);
        if (reg.writeCount - readCount >= wcaOff.RING_N) {
          console.warn('[webcodecs-audio] ring overflow; block dropped');
          Module._free(ptr);
          return;
        }

        var tsHi = Math.floor(ts / 4294967296);
        var tsLo = ts - tsHi * 4294967296;

        var slot = ci + wcaOff.WC_HDR + (reg.writeCount % wcaOff.RING_N) * wcaOff.SLOT_INTS;
        HEAP32[slot + wcaOff.AL_PTR] = ptr;
        HEAP32[slot + wcaOff.AL_BYTES] = bytes;
        HEAP32[slot + wcaOff.AL_FRAMES] = frames;
        HEAP32[slot + wcaOff.AL_CH] = channels;
        HEAP32[slot + wcaOff.AL_RATE] = rate;
        HEAP32[slot + wcaOff.AL_TSLO] = tsLo | 0;
        HEAP32[slot + wcaOff.AL_TSHI] = tsHi | 0;

        reg.writeCount++;
        Atomics.store(HEAP32, ci + wcaOff.WC_WRITE, reg.writeCount);
        wcaRT.wake(reg);
      } catch (e) {
        console.warn('[webcodecs-audio] onAudioData failed:', e && e.message ? e.message : e);
        if (ptr) Module._free(ptr);
        try { data.close(); } catch (_) {}
        var msg = e && e.message ? e.message : e;
        if (!reg.dead && msg !== 'unwind') wcaRT.setError(reg);
      }
    }
  },

  // ---- proxied audio entrypoints (run on the runtime MAIN thread) ------------

  // Create + configure an AudioDecoder. codecPtr -> "mp4a.40.<AOT>"; descPtr/
  // descLen -> the AudioSpecificConfig (mp4 esds), REQUIRED for raw (non-ADTS)
  // AAC. rate/channels seed the config. Returns a handle (>=0) or -1 on failure.
  audiodecoder_create__proxy: 'sync',
  audiodecoder_create__deps: ['$wcaRT', '$UTF8ToString'],
  audiodecoder_create: function (ctrl, codecPtr, descPtr, descLen, rate, channels) {
    if (rate > 0) wcaRT.preferredRate = rate;
    wcaRT.ensure();
    if (typeof AudioDecoder === 'undefined') {
      console.warn('[webcodecs-audio] AudioDecoder unavailable in this browser');
      return -1;
    }
    var codec = codecPtr ? UTF8ToString(codecPtr) : 'mp4a.40.2';
    var description = descLen >= 1 ? HEAPU8.slice(descPtr, descPtr + descLen) : null;

    var id = wcaRT.nextId++;
    var reg = {
      id: id, ctrl: ctrl, dead: false,
      writeCount: 0, decoder: null, config: null, lastScheduledTs: null
    };
    var config = { codec: codec, sampleRate: rate, numberOfChannels: channels };
    if (description) config.description = description;
    reg.config = config;

    try {
      var dec = new AudioDecoder({
        output: function (data) { wcaRT.onAudioData(reg, data); },
        error: function (e) {
          console.warn('[webcodecs-audio] decoder error:', e && e.message ? e.message : e);
          wcaRT.setError(reg);
        }
      });
      dec.configure(config);
      reg.decoder = dec;
    } catch (e) {
      console.warn('[webcodecs-audio] configure failed:', e && e.message ? e.message : e);
      return -1;
    }
    wcaRT.decoders.set(id, reg);
    return id;
  },

  // Feed one raw AAC access unit. ts split into lo/hi 32-bit halves (microseconds).
  audiodecoder_feed__proxy: 'sync',
  audiodecoder_feed__deps: ['$wcaRT'],
  audiodecoder_feed: function (handle, dataPtr, dataLen, isKey, tsLo, tsHi) {
    var reg = wcaRT.decoders && wcaRT.decoders.get(handle);
    if (!reg || reg.dead || !reg.decoder) return;
    var ts = (tsHi | 0) * 4294967296 + (tsLo >>> 0);
    try {
      var chunk = new EncodedAudioChunk({
        type: isKey ? 'key' : 'delta',
        timestamp: ts,
        data: HEAPU8.slice(dataPtr, dataPtr + dataLen)
      });
      reg.decoder.decode(chunk);
    } catch (e) {
      console.warn('[webcodecs-audio] decode() threw:', e && e.message ? e.message : e);
      wcaRT.setError(reg);
    }
  },

  // End-of-stream drain. flush() emits every buffered AudioData (sync output
  // callbacks run), then resolves; we bump WC_FLUSH and wake the blocked worker.
  audiodecoder_flush__proxy: 'sync',
  audiodecoder_flush__deps: ['$wcaRT'],
  audiodecoder_flush: function (handle) {
    var reg = wcaRT.decoders && wcaRT.decoders.get(handle);
    if (!reg || reg.dead || !reg.decoder) return;
    var ci = reg.ctrl >> 2;
    var done = function () {
      if (reg.dead) return;
      Atomics.add(HEAP32, ci + wcaOff.WC_FLUSH, 1);
      wcaRT.wake(reg);
    };
    reg.decoder.flush().then(done).catch(function () { done(); });
  },

  // Seek/discard. Runs while the worker is blocked in the sync proxy, so the ring
  // can be torn down race-free.
  audiodecoder_reset__proxy: 'sync',
  audiodecoder_reset__deps: ['$wcaRT'],
    audiodecoder_reset: function (handle) {
      var reg = wcaRT.decoders && wcaRT.decoders.get(handle);
      if (!reg || reg.dead) return;
      wcaRT.justSeeked = true;
      wcaRT.stopPlayback(reg);
    try { reg.decoder.reset(); } catch (_) {}
    var ci = reg.ctrl >> 2;
    var readCount = Atomics.load(HEAP32, ci + wcaOff.WC_READ);
    for (var c = readCount; c < reg.writeCount; c++) {
      var slot = ci + wcaOff.WC_HDR + (c % wcaOff.RING_N) * wcaOff.SLOT_INTS;
      var p = HEAP32[slot + wcaOff.AL_PTR];
      if (p) Module._free(p);
    }
    reg.writeCount = 0;
    reg.lastScheduledTs = null;
    Atomics.store(HEAP32, ci + wcaOff.WC_WRITE, 0);
    Atomics.store(HEAP32, ci + wcaOff.WC_READ, 0);
    Atomics.store(HEAP32, ci + wcaOff.WC_ERROR, 0);
    try { reg.decoder.configure(reg.config); } catch (_) {} // reset() -> unconfigured
  },

  // Tear down. After this returns the C++ side frees the control block.
  audiodecoder_destroy__proxy: 'sync',
  audiodecoder_destroy__deps: ['$wcaRT'],
  audiodecoder_destroy: function (handle) {
    var reg = wcaRT.decoders && wcaRT.decoders.get(handle);
    if (!reg) return;
    reg.dead = true;
    wcaRT.stopPlayback(reg);
    try { reg.decoder.close(); } catch (_) {}
    var ci = reg.ctrl >> 2;
    var readCount = Atomics.load(HEAP32, ci + wcaOff.WC_READ);
    for (var c = readCount; c < reg.writeCount; c++) {
      var slot = ci + wcaOff.WC_HDR + (c % wcaOff.RING_N) * wcaOff.SLOT_INTS;
      var p = HEAP32[slot + wcaOff.AL_PTR];
      if (p) Module._free(p);
    }
    wcaRT.decoders.delete(handle);
  },

  hostaudio_set_playing__proxy: 'sync',
  hostaudio_set_playing__deps: ['$wcaRT'],
  hostaudio_set_playing: function (playing) {
    wcaRT.setPlaying(!!playing);
  },

  hostaudio_set_media_time__proxy: 'sync',
  hostaudio_set_media_time__deps: ['$wcaRT'],
  hostaudio_set_media_time: function (seconds) {
    wcaRT.mediaClockUs = seconds * 1000000;
    wcaRT.mediaClockWall = performance.now();
  }
});
