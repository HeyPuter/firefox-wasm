// Monomorphic property read+write: LoadFixedSlot / StoreFixedSlot / AddSlot IC.
class Benchmark {
  setup() { this.n = 200000; }
  runIteration() {
    let sum = 0;
    for (let i = 0; i < this.n; i++) {
      const o = { a: i, b: i + 1, c: i + 2 };
      o.a = o.b + o.c; o.b = o.a - o.c;
      sum = (sum + o.a + o.b + o.c) | 0;
    }
    this.sum = sum | 0;
  }
  result() { return this.sum | 0; }
}
