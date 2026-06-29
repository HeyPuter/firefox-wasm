// charCodeAt + concat + compare: CharCodeAt inline, rope concat, string compare.
class Benchmark {
  setup() { this.base = 'the quick brown fox jumps over the lazy dog 0123456789'; this.n = 40000; }
  runIteration() {
    let s = 0, acc = '';
    for (let i = 0; i < this.n; i++) {
      const str = this.base + (i & 255);
      let h = 0;
      for (let j = 0; j < str.length; j++) h = (h * 31 + str.charCodeAt(j)) | 0;
      if ((i & 1023) === 0) acc = str;
      s = (s + h + (acc < str ? 1 : 0)) | 0;
    }
    this.s = s | 0;
  }
  result() { return this.s | 0; }
}
