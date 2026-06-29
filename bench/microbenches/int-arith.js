// Tight int32 arithmetic incl. overflow-prone mul: fallible Add/Mul i64 guards.
class Benchmark {
  setup() { this.n = 1000000; }
  runIteration() {
    let h = 0 | 0;
    for (let i = 0; i < this.n; i++) {
      h = (h * 31 + i) | 0; h ^= h >> 13; h = (h * 0x5bd1e995) | 0; h ^= h >>> 15;
    }
    this.h = h | 0;
  }
  result() { return this.h | 0; }
}
