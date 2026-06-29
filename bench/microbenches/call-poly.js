// Polymorphic indirect call dispatch (the call IC / wjhelp fallback path).
class Benchmark {
  setup() {
    this.fns = [(a) => a + 1, (a) => a * 2, (a) => a - 3, (a) => (a ^ 5) | 0];
    this.n = 400000;
  }
  runIteration() {
    let a = 1 | 0;
    for (let i = 0; i < this.n; i++) a = this.fns[i & 3](a) | 0;
    this.a = a | 0;
  }
  result() { return this.a | 0; }
}
