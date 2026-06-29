// Runner for the gecko-wasm SpiderMonkey `js` shell. Run from this directory:
//
//     js bench-shell.js                       # easylist.txt, 5 iters
//     js bench-shell.js easylist.txt 8
//     js bench-shell.js easylist.txt,easyprivacy.txt,filters.min.txt 5
//
// Loads the IIFE bundle (defines globalThis.uboBench), reads a dataset, and
// times uBlock's static-network-filter compile+load loop. This is the
// interpreted hot path -- profile/optimize the JIT against it.

load('build/compile-bundle.iife.js');   // -> globalThis.uboBench

function readText(path) {
    if ( typeof os !== 'undefined' && os.file && os.file.readFile ) { return os.file.readFile(path); }
    if ( typeof read === 'function' ) { return read(path); }
    if ( typeof snarf === 'function' ) { return snarf(path); }
    throw new Error('no file-read primitive in this shell (need read/os.file.readFile/snarf)');
}

var args = (typeof scriptArgs !== 'undefined') ? scriptArgs : [];
var lists = (args[0] || 'easylist.txt').split(',');
var iters = parseInt(args[1] || '5', 10);

var raw = lists.map(function(n) { return readText('data/' + n); });
var bytes = raw.reduce(function(a, s) { return a + s.length; }, 0);
print('lists: ' + lists.join(', ') + '  (' + bytes + ' bytes)  iters: ' + iters);

var runs = uboBench.bench(raw, iters);
runs.forEach(function(r, i) {
    print('run ' + i + ': compile ' + r.compileMs + 'ms  load ' + r.loadMs + 'ms  total ' + r.totalMs +
          'ms  (net ' + r.netFilters + ', ext ' + r.extFilters + ', accepted ' + r.acceptedCount + ')');
});
var warm = runs.slice(1);
if ( warm.length ) {
    var avg = function(k) { var s = 0; warm.forEach(function(r) { s += r[k]; }); return (s / warm.length).toFixed(1); };
    print('warm avg (runs 1..' + (runs.length - 1) + '): compile ' + avg('compileMs') + 'ms  load ' + avg('loadMs') + 'ms  total ' + avg('totalMs') + 'ms');
}
