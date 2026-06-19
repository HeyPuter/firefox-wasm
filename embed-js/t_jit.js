// Minimal deterministic JIT/Phase-F correctness test. A hot OO workload (mutating methods +
// nested method calls) drives Mode VS compilation; with GECKO_WJVS_FDEOPT=N it also drives
// mid-execution bailout + resume. The final checksum is compared to a known-good value, so a
// miscompile (wrong resume state, etc.) shows up as a mismatch -- no browser/octane needed.

function Cell(v) { this.v = v; this.next = null; }
Cell.prototype.bump = function (k) {        // leaf, mutating
  this.v = (this.v + k) | 0;
  return this.v;
};
Cell.prototype.run = function (k) {          // NON-LEAF: calls bump (cross-frame deopt path)
  var s = this.bump(k);
  if (this.next != null) s = (s + this.next.bump(k)) | 0;
  return s;
};

function build(n) {
  var head = null;
  for (var i = 0; i < n; i++) { var c = new Cell(i); c.next = head; head = c; }
  return head;
}

function drive(head, iters) {
  var acc = 0;
  for (var it = 0; it < iters; it++) {
    var c = head;
    while (c != null) {
      acc = (acc + c.run(it & 7)) | 0;
      c = c.next;
    }
  }
  return acc | 0;
}

var head = build(40);
var EXPECT = drive(build(40), 50);   // reference (same inputs, fresh list) computed first-run
var got = 0;
var REPS = 300;   // hot enough to trigger JIT compile + many forced-deopt resumes; ~1-2s
for (var rep = 0; rep < REPS; rep++) {
  got = drive(head, 50);
  // reset the list's mutated state each rep so every rep is identical and comparable
  var c = head, i = 39;
  while (c != null) { c.v = i; c = c.next; i--; }
}

print("RESULT got=" + got + " expect=" + EXPECT + " " + (got === EXPECT ? "OK" : "*** MISMATCH ***"));
