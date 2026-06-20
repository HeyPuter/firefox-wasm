// Ion POLYMORPHIC method-dispatch gate: a megamorphic call site t.run() where t
// is one of several types, each with a different prototype run method. The FE
// builder must guard the receiver shape and inline the matching body.
//   GECKO_WJVS_IONFE_TARGET=<caller lineno>  GECKO_WJVS_IONFE=<trigger lineno>
function A(x) { this.x = x; }
A.prototype.run = function () { return this.x + 1.0; };   // A: x+1
function B(x) { this.x = x; }
B.prototype.run = function () { return this.x * 2.0; };   // B: x*2
function C(x) { this.x = x; }
C.prototype.run = function () { return this.x - 3.0; };   // C: x-3

function caller(t) { return t.x + t.run(); }   // caller: own field + poly method
function trigger(z) { return z + 1.0; }

var a = new A(5.0), b = new B(5.0), c = new C(5.0);
var acc = 0.0;
// Warm with ALL THREE types so the call site records 3 dispatch ways.
for (var k = 0; k < 200000; k++) { acc = acc + caller(a) + caller(b) + caller(c); }
for (var k = 0; k < 200000; k++) { acc = acc + trigger(k); }
print("caller(a)=" + caller(a));   // 5 + (5+1) = 11
print("caller(b)=" + caller(b));   // 5 + (5*2) = 15
print("caller(c)=" + caller(c));   // 5 + (5-3) = 7
print("acc=" + acc);
