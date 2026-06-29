// Math.sin/cos/sqrt/exp/log loop: MMathFunction (currently a JIT bail -> PBL;
// a probe for the MathFunction helper landing).
class Benchmark {
  setup() { this.n = 200000; }
  runIteration() {
    let s = 0;
    for (let i = 0; i < this.n; i++) {
      const x = i * 1e-4;
      s += Math.sin(x) * Math.cos(x) + Math.sqrt(x) - Math.log(x + 1) + Math.exp(-x * 1e-3);
    }
    this.s = s;
  }
  result() { return Math.round(this.s * 1000) | 0; }
}
