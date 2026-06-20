// Ion method-call inlining gate.
function Tcb(v) { this.v = v; }
Tcb.prototype.bump = function () { return this.v + 1.0; };   // line 3: straight-line method
function caller(t) { return t.v + t.bump() + t.bump(); }      // line 4: 5 + 6 + 6 = 17
function trigger(z) { return z + 1.0; }                       // line 5

var t = new Tcb(5.0);
var acc = 0.0;
for (var k = 0; k < 200000; k++) { acc = acc + caller(t); }
for (var k = 0; k < 200000; k++) { acc = acc + trigger(k); }
print("caller(t)=" + caller(t));   // expect 17
print("acc=" + acc);
