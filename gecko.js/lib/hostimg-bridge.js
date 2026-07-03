// Repo-local emscripten --js-library: route Gecko's still-image decode to the
// HOST browser's WebCodecs `ImageDecoder` (wired in via build-lib.sh with
// `--js-library`).
//
// WHY: the wasm build CAN decode images in-process (libjpeg/libpng/libwebp/dav1d
// all compile to wasm), but that burns wasm-thread CPU. The host browser has
// real, often GPU-backed image decoders exposed as WebCodecs `ImageDecoder`. A
// new Gecko image Decoder (image/decoders/nsHostProxyImageDecoder) intercepts the
// full single-frame decode path (DecoderFactory::CreateDecoder) for PNG/JPEG/
// WebP/AVIF when GECKO_IMG_PASSTHROUGH is set, accumulates the encoded bytes, and
// calls `hostimg_decode` to decode on the host.
//
// MECHANISM (mirrors the WebCodecs video bridge): `hostimg_decode` runs proxied
// on the browser main thread (__proxy:'sync'), so it returns immediately after
// copying the encoded bytes out of the shared heap and kicking off an async
// `ImageDecoder.decode()`. The Gecko decode-pool worker that called it blocks in
// `emscripten_futex_wait` on the control block's IMG_STATUS word. When the host
// finishes it mallocs a packed BGRA buffer on the shared heap, copies the pixels
// in via `VideoFrame.copyTo`, fills the control block, and `Atomics.notify`s the
// worker -- which then pushes the rows through the SurfacePipe and frees the
// buffer.
//
// Single-shot control block (int32 indices) -- MUST match nsHostProxyImageDecoder.cpp:
//   IMG_STATUS=0 (0 pending / 1 done / 2 error; also the futex word)
//   IMG_W=1  IMG_H=2  IMG_STRIDE=3 (bytes/row)  IMG_PTR=4 (BGRA buffer)  IMG_FRAMES=5

mergeInto(LibraryManager.library, {
  hostimg_decode__proxy: 'sync',
  hostimg_decode__deps: ['$UTF8ToString'],
  hostimg_decode: function (ctrl, mimePtr, dataPtr, dataLen) {
    var c = ctrl >> 2;  // int32 index of the control block

    function finish(status) {
      Atomics.store(HEAP32, c + 0 /* IMG_STATUS */, status);
      Atomics.notify(HEAP32, c + 0);
    }

    if (typeof ImageDecoder === 'undefined') {
      console.warn('[hostimg] ImageDecoder unavailable in this browser');
      finish(2);
      return;
    }

    var mime = UTF8ToString(mimePtr);
    // Copy the encoded bytes out of the shared heap now (synchronously, before
    // the worker proceeds): the worker stays blocked but its buffer is its own.
    var enc = HEAPU8.slice(dataPtr, dataPtr + dataLen);

    var dec;
    try {
      dec = new ImageDecoder({ data: enc, type: mime });
    } catch (e) {
      console.warn('[hostimg] ctor failed:', e && e.message ? e.message : e);
      finish(2);
      return;
    }

    dec.decode({ frameIndex: 0, completeFramesOnly: true }).then(function (res) {
      var frame = res.image;
      var w = frame.displayWidth | 0;
      var h = frame.displayHeight | 0;
      var stride = w * 4;
      var size = stride * h;
      var ptr = Module._malloc(size);
      var frames = 1;
      try {
        frames = (dec.tracks && dec.tracks.selectedTrack &&
                  dec.tracks.selectedTrack.frameCount) || 1;
      } catch (_) {}

      // Ask copyTo to hand us packed BGRA so the SurfacePipe input format is
      // OS_RGBA (B8G8R8A8 on little-endian) with a known w*4 stride.
      frame.copyTo(HEAPU8.subarray(ptr, ptr + size),
                   { format: 'BGRA', layout: [{ offset: 0, stride: stride }] })
        .then(function () {
          HEAP32[c + 1 /* IMG_W */] = w;
          HEAP32[c + 2 /* IMG_H */] = h;
          HEAP32[c + 3 /* IMG_STRIDE */] = stride;
          HEAP32[c + 4 /* IMG_PTR */] = ptr;
          HEAP32[c + 5 /* IMG_FRAMES */] = frames;
          finish(1);
          try { frame.close(); } catch (_) {}
          try { dec.close(); } catch (_) {}
        })
        .catch(function (e) {
          console.warn('[hostimg] copyTo failed:', e && e.message ? e.message : e);
          Module._free(ptr);
          try { frame.close(); } catch (_) {}
          try { dec.close(); } catch (_) {}
          finish(2);
        });
    }).catch(function (e) {
      console.warn('[hostimg] decode failed:', e && e.message ? e.message : e);
      try { dec.close(); } catch (_) {}
      finish(2);
    });
  },

  // === GPU fast path ======================================================
  // (main thread) Decode with the host ImageDecoder, then TRANSFER the decoded
  // VideoFrame to WebRender's Renderer thread, where it is uploaded into WR's GL
  // context as a texture (see hostimg_renderer_install). No CPU readback. The
  // Renderer worker writes the result (status/w/h) into the control block + wakes
  // the blocked image decode-pool thread.
  hostimg_gpu_decode__proxy: 'sync',
  hostimg_gpu_decode__deps: ['$UTF8ToString'],
  hostimg_gpu_decode: function (ctrl, idLo, idHi, mimePtr, dataPtr, dataLen) {
    var c = ctrl >> 2;
    function fail() {
      Atomics.store(HEAP32, c + 0 /* IMG_STATUS */, 2);
      Atomics.notify(HEAP32, c + 0);
    }
    if (typeof ImageDecoder === 'undefined') {
      console.warn('[hostimg-gpu] ImageDecoder unavailable');
      fail();
      return;
    }
    var tid = _hostimg_renderer_tid();
    var rworker = (typeof PThread !== 'undefined' && PThread.pthreads)
        ? PThread.pthreads[tid] : null;
    if (!tid || !rworker) {
      console.warn('[hostimg-gpu] renderer worker not found (tid=' + tid + ')');
      fail();
      return;
    }
    var mime = UTF8ToString(mimePtr);
    var enc = HEAPU8.slice(dataPtr, dataPtr + dataLen);
    var dec;
    try {
      dec = new ImageDecoder({ data: enc, type: mime });
    } catch (e) {
      console.warn('[hostimg-gpu] ctor failed:', e && e.message ? e.message : e);
      fail();
      return;
    }
    dec.decode({ frameIndex: 0, completeFramesOnly: true }).then(function (res) {
      var frame = res.image;
      try {
        // The Renderer worker finishes the control block after the GL upload.
        rworker.postMessage({
          __hostimg: 1, ctrl: ctrl, idLo: idLo, idHi: idHi,
          w: frame.displayWidth | 0, h: frame.displayHeight | 0, frame: frame
        }, [frame]);
      } catch (e) {
        console.warn('[hostimg-gpu] transfer failed:', e && e.message ? e.message : e);
        try { frame.close(); } catch (_) {}
        fail();
      }
      try { dec.close(); } catch (_) {}
    }).catch(function (e) {
      console.warn('[hostimg-gpu] decode failed:', e && e.message ? e.message : e);
      try { dec.close(); } catch (_) {}
      fail();
    });
  },

  // (Renderer thread) Install the message handler that receives transferred
  // VideoFrames and uploads them into WebRender's GL context as textures keyed by
  // external image id. Called once from C++ when the compositor GL context is
  // created on the Renderer thread. Also records this thread's id for the bridge.
  hostimg_renderer_install: function () {
    if (globalThis.__geckoHostImgInstalled) { return; }
    globalThis.__geckoHostImgInstalled = true;
    globalThis.geckoHostImgTex = globalThis.geckoHostImgTex || new Map();
    self.addEventListener('message', function (e) {
      var d = e.data;
      if (!d || !d.__hostimg) { return; }
      var c = d.ctrl >> 2;
      var frame = d.frame;
      function done(status) {
        HEAP32[c + 1 /* IMG_W */] = d.w;
        HEAP32[c + 2 /* IMG_H */] = d.h;
        Atomics.store(HEAP32, c + 0 /* IMG_STATUS */, status);
        Atomics.notify(HEAP32, c + 0);
      }
      try {
        var t = GLctx.createTexture();
        var id = GL.getNewId(GL.textures);
        t.name = id;
        GL.textures[id] = t;
        GLctx.bindTexture(GLctx.TEXTURE_2D, t);
        // WebRender composites premultiplied; the host frame has straight alpha.
        GLctx.pixelStorei(GLctx.UNPACK_PREMULTIPLY_ALPHA_WEBGL, true);
        GLctx.texImage2D(GLctx.TEXTURE_2D, 0, GLctx.RGBA, GLctx.RGBA,
                         GLctx.UNSIGNED_BYTE, frame);
        GLctx.pixelStorei(GLctx.UNPACK_PREMULTIPLY_ALPHA_WEBGL, false);
        GLctx.texParameteri(GLctx.TEXTURE_2D, GLctx.TEXTURE_MIN_FILTER, GLctx.LINEAR);
        GLctx.texParameteri(GLctx.TEXTURE_2D, GLctx.TEXTURE_MAG_FILTER, GLctx.LINEAR);
        GLctx.texParameteri(GLctx.TEXTURE_2D, GLctx.TEXTURE_WRAP_S, GLctx.CLAMP_TO_EDGE);
        GLctx.texParameteri(GLctx.TEXTURE_2D, GLctx.TEXTURE_WRAP_T, GLctx.CLAMP_TO_EDGE);
        var id64 = d.idHi * 4294967296 + (d.idLo >>> 0);
        globalThis.geckoHostImgTex.set(id64, { tex: id, w: d.w, h: d.h, ready: true });
        try { frame.close(); } catch (_) {}
        done(1);
      } catch (err) {
        console.warn('[hostimg-gpu] upload failed:', err && err.message ? err.message : err);
        try { frame.close(); } catch (_) {}
        done(2);
      }
    });
  },
});
