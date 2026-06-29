// Object + array literal allocation in a loop: inline nursery bump-alloc + GC.
class Benchmark {
  setup() { this.n = 200000; }
  runIteration() {
    let s = 0;
    for (let i = 0; i < this.n; i++) {
      const p = { x: i, y: i + 1, tag: 'p' };
      const arr = [p.x, p.y, p.x + p.y];
      s = (s + arr[0] + arr[1] + arr[2]) | 0;
    }
    this.s = s | 0;
  }
  result() { return this.s | 0; }
}
