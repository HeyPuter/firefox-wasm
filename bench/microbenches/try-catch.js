// try/catch in a hot loop + occasional throw: the try-body-in-JIT / catch-in-PBL
// deopt-in-error path.
class Benchmark {
  setup() { this.n = 200000; }
  runIteration() {
    let s = 0;
    for (let i = 0; i < this.n; i++) {
      try {
        if ((i & 4095) === 0) throw i;
        s = (s + (i % 7)) | 0;
      } catch (e) { s = (s - 1) | 0; }
    }
    this.s = s | 0;
  }
  result() { return this.s | 0; }
}
