// Ion property-access gate (loads + stores). Warm fns so their ICs fill, then a
// trigger fn (compiled last) fires the Ion FE test on a captured live receiver.
//   GECKO_WJVS_IONFE_TARGET=<lineno>  GECKO_WJVS_IONFE=<trigger lineno>
//   GECKO_WJVS_IONFE_ARGS="<numeric args>"   GECKO_WJVS_IONFE_DUMP=1
function fadd(o) { return o.x + o.y; }              // line 5: 1 shared guard, 2 loads -> 7.75
function gvn3(o) { return o.x + o.x + o.x; }         // line 6: CSE -> 1 guard, 1 load -> 10.5
function loopget(o, n) {                             // line 7: read-only loop -> LICM hoists
  var s = 0.0; var i = 0.0;
  while (i < n) { s = s + o.x; i = i + 1.0; }
  return s;                                          // loopget(o,100) = 350
}
function setget2(p, v) {                             // line 12: store then read same slot
  p.x = v + 1.0;
  return p.x;                                        // setget2(p,5) = 6 (CSE reuses stored val)
}
function mutloop(p, n) {                             // line 16: read+write same slot in loop
  var i = 0.0;
  while (i < n) { p.x = p.x + 1.0; i = i + 1.0; }    // store blocks load hoist (correct)
  return p.x;
}
function trigger(z) { return z + 1.0; }              // line 21

var o = { x: 3.5, y: 4.25 };
var p = { x: 0.0, y: 1.0 };
var acc = 0.0;
for (var k = 0; k < 200000; k++) {
  acc = acc + fadd(o) + gvn3(o) + loopget(o, 20) + setget2(p, k) + mutloop(p, 3);
}
for (var k = 0; k < 200000; k++) { acc = acc + trigger(k); }
print("fadd(o)=" + fadd(o));
print("gvn3(o)=" + gvn3(o));
print("loopget(o,100)=" + loopget(o, 100));
print("setget2(p,5)=" + setget2(p, 5));
print("acc=" + acc);
