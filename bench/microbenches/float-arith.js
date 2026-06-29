// f64 arithmetic loop (navier/raytrace): unboxed-double arith fast path.
class Benchmark {
  setup() { this.n = 500000; }
  runIteration() {
    let x = 0.0, y = 1.0;
    for (let i = 0; i < this.n; i++) { x = x + y * 0.5; y = y - x * 0.25; x *= 0.999999; y *= 1.000001; }
    this.x = x; this.y = y;
  }
  result() { return Math.round((this.x + this.y) * 1e6) | 0; }
}
