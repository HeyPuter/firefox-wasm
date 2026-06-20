// Ion `this`-receiver gate: a method compiled standalone that reads its own fields
// via `this` (no explicit receiver arg). `this` is passed as a trailing object param.
//   GECKO_WJVS_IONFE_TARGET=<get lineno>  GECKO_WJVS_IONFE=<trigger lineno>
function Pt(a, b) { this.a = a; this.b = b; }
Pt.prototype.get = function () { return this.a + this.b; };   // this.a + this.b
function trigger(z) { return z + 1.0; }

var p = new Pt(3.5, 4.25);
var acc = 0.0;
for (var k = 0; k < 200000; k++) { acc = acc + p.get(); }
for (var k = 0; k < 200000; k++) { acc = acc + trigger(k); }
print("p.get()=" + p.get());   // 7.75
print("acc=" + acc);
