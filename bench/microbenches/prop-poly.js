// Polymorphic property access over 4 shapes: GuardShapeList / shape-hybrid IC.
class Benchmark {
  setup() {
    this.objs = [{ kind: 0, v: 1 }, { kind: 1, w: 2, v: 3 },
      { kind: 2, x: 4, y: 5, v: 6 }, { kind: 3, v: 7, z: 8 }];
    this.n = 200000;
  }
  runIteration() {
    let s = 0;
    for (let i = 0; i < this.n; i++) { const o = this.objs[i & 3]; s = (s + o.v + o.kind) | 0; }
    this.s = s | 0;
  }
  result() { return this.s | 0; }
}
