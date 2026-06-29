// Web Audio output bridge for the wasm cubeb backend (firefox cubeb_wasmaudio.c).
//
// The cubeb backend pulls PCM on a fill thread into a lock-free SPSC ring in the
// shared wasm heap; this library hands that ring's SharedArrayBuffer to a host
// AudioWorklet that drains it into a Web Audio AudioContext. AudioContext only
// exists on the page main thread, so the emaudio_* entry points run __proxy:'sync'
// (the cubeb backend calls them from Gecko worker threads). Output only.
//
// Ring layout (must match cubeb_wasmaudio.c struct em_ring): int32 write, int32
// read (absolute frame counters, uint32 modular), then float data[cap*channels].
// cap is a power of two so the index wraps cleanly.
//
// NOTE: the AudioWorklet processor source is built as a STRING *inside* the
// function bodies. An emscripten library `$var` whose value is a string is emitted
// as CODE (not a string literal), which would evaluate `class ... extends
// AudioWorkletProcessor` at module load and throw ReferenceError.
mergeInto(LibraryManager.library, {
  // Create (lazily) the AudioContext + worklet and return its sample rate, which
  // the backend advertises as cubeb's preferred rate (so Gecko resamples content
  // to it and no resampling is needed here). Returns 0 if Web Audio is absent.
  emaudio_get_rate__proxy: 'sync',
  emaudio_get_rate: function () {
    try {
      var A = globalThis.__emAudio || (globalThis.__emAudio = {});
      if (!A.ctx) {
        var AC = globalThis.AudioContext || globalThis.webkitAudioContext;
        if (!AC) return 0;
        A.ctx = new AC();
        var src = [
          'class GeckoOut extends AudioWorkletProcessor {',
          '  constructor() {',
          '    super();',
          '    this.i32 = null;',
          '    this.port.onmessage = (e) => {',
          '      const d = e.data;',
          '      if (d.stop) { this.i32 = null; return; }',
          '      this.i32 = new Int32Array(d.sab);',
          '      this.f32 = new Float32Array(d.sab);',
          '      this.wIdx = d.ring >> 2;',
          '      this.rIdx = (d.ring + 4) >> 2;',
          '      this.dataF = (d.ring + 8) >> 2;',
          '      this.cap = d.cap;',
          '      this.ch = d.channels;',
          '    };',
          '  }',
          '  process(inputs, outputs) {',
          '    const out = outputs[0];',
          '    const frames = out[0].length;',
          '    if (!this.i32) { for (let c = 0; c < out.length; c++) out[c].fill(0); return true; }',
          '    const w = Atomics.load(this.i32, this.wIdx);',
          '    const r = Atomics.load(this.i32, this.rIdx);',
          '    const avail = (w - r) >>> 0;',
          '    const n = avail < frames ? avail : frames;',
          '    const ch = this.ch, cap = this.cap, dataF = this.dataF, f32 = this.f32;',
          '    for (let i = 0; i < n; i++) {',
          '      const pos = dataF + (((r + i) & (cap - 1)) * ch);',
          '      for (let c = 0; c < out.length; c++) out[c][i] = f32[pos + (c < ch ? c : ch - 1)];',
          '    }',
          '    for (let i = n; i < frames; i++) { for (let c = 0; c < out.length; c++) out[c][i] = 0; }',
          '    Atomics.store(this.i32, this.rIdx, (r + n) >>> 0);',
          '    return true;',
          '  }',
          '}',
          'registerProcessor("gecko-out", GeckoOut);',
        ].join('\n');
        var url = URL.createObjectURL(new Blob([src], { type: 'text/javascript' }));
        A.ctx.audioWorklet.addModule(url).then(function () {
          A.node = new AudioWorkletNode(A.ctx, 'gecko-out', {
            numberOfInputs: 0, numberOfOutputs: 1, outputChannelCount: [2],
          });
          A.node.connect(A.ctx.destination);
          A.ready = true;
          if (A.pending) A.node.port.postMessage(A.pending);
        }).catch(function (e) {
          console.error('[emaudio] worklet addModule failed:', e && e.message ? e.message : e);
        });
        // Autoplay policy: an AudioContext stays suspended until a user gesture.
        var resume = function () { if (A.ctx && A.ctx.state !== 'running') A.ctx.resume(); };
        ['pointerdown', 'keydown', 'touchstart'].forEach(function (ev) {
          addEventListener(ev, resume, { capture: true });
        });
      }
      return A.ctx.sampleRate | 0;
    } catch (e) {
      console.error('[emaudio] get_rate failed:', e && e.message ? e.message : e);
      return 0;
    }
  },

  // Point the worklet at the ring (shared wasm memory + offsets) and start it.
  emaudio_start__proxy: 'sync',
  emaudio_start: function (ring, capFrames, channels, rate) {
    try {
      var A = globalThis.__emAudio;
      if (!A || !A.ctx) return -1;
      var msg = { sab: wasmMemory.buffer, ring: ring, cap: capFrames, channels: channels };
      A.pending = msg;
      if (A.ready && A.node) A.node.port.postMessage(msg);
      if (A.ctx.state !== 'running') A.ctx.resume(); // best-effort; real start needs a gesture
      return 0;
    } catch (e) {
      console.error('[emaudio] start failed:', e && e.message ? e.message : e);
      return -1;
    }
  },

  emaudio_stop__proxy: 'sync',
  emaudio_stop: function () {
    try {
      var A = globalThis.__emAudio;
      if (A && A.node) A.node.port.postMessage({ stop: true });
      if (A) A.pending = null;
    } catch (e) {}
  },
});
