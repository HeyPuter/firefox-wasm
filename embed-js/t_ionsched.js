// Mini-scheduler matching richards' real shape: a MONOMORPHIC linked list of TCB
// nodes, each holding a POLYMORPHIC task whose method is dispatched. Returns a
// number so the FE harness can validate the whole boxed pipeline.
//   GECKO_WJVS_IONFE_TARGET=<run lineno>  GECKO_WJVS_IONFE=<trigger lineno>
function A(x) { this.x = x; }
A.prototype.go = function () { return this.x * 2.0; };       // A: x*2
function B(x) { this.x = x; }
B.prototype.go = function () { return this.x + 10.0; };      // B: x+10
function TCB(task, next) { this.task = task; this.next = next; }  // mono node
function S(head) { this.head = head; }
S.prototype.run = function () {                              // line 12
  var s = 0.0;
  var c = this.head;
  while (c !== null) { s = s + c.task.go(); c = c.next; }   // c mono; c.task poly
  return s;
};
function trigger(z) { return z + 1.0; }                      // line 18

// nodes: A(3), B(2), A(1) -> go = 3*2 + 2+10 + 1*2 = 6+12+2 = 20
var list = new TCB(new A(3.0), new TCB(new B(2.0), new TCB(new A(1.0), null)));
var sched = new S(list);
var acc = 0.0;
for (var k = 0; k < 200000; k++) { acc = acc + sched.run(); }
for (var k = 0; k < 200000; k++) { acc = acc + trigger(k); }
print("run=" + sched.run());   // expect 20
print("acc=" + acc);
