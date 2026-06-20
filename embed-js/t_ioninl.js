// Ion front-end inlining gate. Warm callers, then trigger fires the FE test.
function add0(x) { return x + 10.0; }                 // line 2: leaf
function add1(x) { return add0(x) + 1.0; }            // line 3: non-leaf (calls add0)
function caller(a) { return add1(a) + add1(a); }      // line 4: 2-level chain; caller(5)=32
function chain(a) { return add1(add0(a)); }           // line 5: nested-arg chain; chain(5)=26
function trigger(z) { return z + 1.0; }               // line 6

var acc = 0.0;
for (var k = 0; k < 200000; k++) { acc = acc + caller(k) + chain(k); }
for (var k = 0; k < 200000; k++) { acc = acc + trigger(k); }
print("caller(5)=" + caller(5));
print("chain(5)=" + chain(5));
print("acc=" + acc);
