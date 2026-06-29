// Dense element load/store + growth: StoreElementHole, bounds, dense fast path.
class Benchmark {
  setup() { this.n = 4000; }
  runIteration() {
    const a = [];
    for (let i = 0; i < this.n; i++) a[i] = (i * 1103515245 + 12345) & 0x7fffffff;
    let s = 0;
    for (let i = 0; i < this.n; i++) { a[i] = (a[i] ^ (a[i] >> 3)) >>> 0; s = (s + a[i]) >>> 0; }
    this.s = s >>> 0;
  }
  result() { return this.s >>> 0; }
}
