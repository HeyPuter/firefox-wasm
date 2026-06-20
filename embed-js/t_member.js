// Minimal repro of earley sc_member: linked-list membership that returns the node
// (object) on hit and `false` (boolean) on miss, calling a sibling sc_isEqual.
function makeLib() {
  function sc_isEqual(a, b) { return a === b; }
  function sc_member(o, l) {
    while (l !== null) {
      if (sc_isEqual(l.car, o)) return l;
      l = l.cdr;
    }
    return false;
  }
  return { member: sc_member, isEqual: sc_isEqual };
}

var lib = makeLib();

function makeList(vals) {
  var l = null;
  for (var i = vals.length - 1; i >= 0; i--) l = { car: vals[i], cdr: l };
  return l;
}

function run() {
  var vals = [];
  for (var i = 0; i < 40; i++) vals.push(i);
  var l = makeList(vals);
  var hits = 0, misses = 0;
  for (var t = 0; t < 200; t++) {
    for (var q = 0; q < 60; q++) {
      var r = lib.member(q, l);
      if (r === false) misses++; else hits++;
    }
  }
  return hits * 100000 + misses;
}

var acc = 0;
for (var n = 0; n < 8; n++) acc += run();
print("member_acc=" + acc);
