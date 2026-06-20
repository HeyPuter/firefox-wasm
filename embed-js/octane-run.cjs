#!/usr/bin/env node
// Run one octane benchmark through the embed-js node harness: concatenate base.js +
// (deps) + bench.js + a driver that does Setup -> timed run loop -> TearDown, prints
// "BENCH <name> ok score=<usec/run> err=<msg>". Lower usec = faster. Compares JIT
// on/off externally. Usage: node octane-run.cjs <benchName>
const fs = require('fs'), path = require('path'), cp = require('child_process');
const OCT = path.join(__dirname, '..', 'embed-xul', 'bench', 'octane');
const name = process.argv[2];
// Multi-file benches.
const DEPS = {
  'typescript': ['typescript-compiler.js', 'typescript-input.js'],
  'gbemu': ['gbemu-part1.js', 'gbemu-part2.js'],
  'zlib': ['zlib-data.js'],
};
const files = [];
files.push('base.js');
if (DEPS[name]) for (const d of DEPS[name]) files.push(d);
files.push(name + '.js');
let src = '';
// shim a few host globals octane/base.js may touch
src += 'var performance = undefined;\n';
for (const f of files) {
  const p = path.join(OCT, f);
  if (!fs.existsSync(p)) { console.log('BENCH ' + name + ' MISSING ' + f); process.exit(2); }
  src += '\n//=== ' + f + ' ===\n' + fs.readFileSync(p, 'utf8');
}
src += `
//=== DRIVER ===
(function(){
  var suites = BenchmarkSuite.suites;
  if (!suites || !suites.length) { print("BENCH ${name} NOSUITE"); return; }
  for (var s = 0; s < suites.length; s++) {
    var suite = suites[s];
    var bms = suite.benchmarks;
    for (var b = 0; b < bms.length; b++) {
      var bm = bms[b];
      var label = suite.name + "/" + bm.name;
      try {
        if (bm.Setup) bm.Setup();
        // warm
        for (var w = 0; w < 5; w++) bm.run();
        var t0 = Date.now(), iters = 0;
        while (Date.now() - t0 < 800) { bm.run(); iters++; }
        var dt = Date.now() - t0;
        var rms = bm.rmsResult ? bm.rmsResult() : 0;
        if (bm.TearDown) bm.TearDown();
        print("BENCH " + label + " ok score_us=" + ((dt*1000)/iters).toFixed(1) + " iters=" + iters + " rms=" + rms);
      } catch (e) {
        print("BENCH " + label + " ERR " + (e && e.stack ? e.stack.split("\\n")[0] : e));
      }
    }
  }
})();
`;
const tmp = path.join(require('os').tmpdir(), 'octrun_' + name + '.js');
fs.writeFileSync(tmp, src);
const env = Object.assign({}, process.env);
const r = cp.spawnSync('node', [path.join(__dirname, 'run.cjs'), tmp], {encoding:'utf8', env, timeout: 60000});
process.stdout.write((r.stdout||'') );
if (r.stderr) process.stderr.write(r.stderr.split('\n').filter(l=>/BENCH|ERR|ion-|uncaught|Error|abort/i.test(l)).join('\n'));
