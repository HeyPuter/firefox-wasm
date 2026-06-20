// Ion OBJECT-REFERENCE + linked-list traversal gate -- the core shape of richards'
// queue/scheduler hot path. Exercises: object-or-null reference fields (this.next),
// null comparison (c !== null), object-pointer locals across a loop, int field read.
//   GECKO_WJVS_IONFE_TARGET=<sumlist lineno>  GECKO_WJVS_IONFE=<trigger lineno>
function Node(v, next) { this.v = v; this.next = next; }
function sumlist(head) {                       // line 6
  var s = 0.0;
  var c = head;
  while (c !== null) { s = s + c.v; c = c.next; }
  return s;
}
function trigger(z) { return z + 1.0; }        // line 12

var head = null;
for (var i = 5; i >= 1; i--) { head = new Node(i, head); }  // list 1->2->3->4->5
var acc = 0.0;
for (var k = 0; k < 200000; k++) { acc = acc + sumlist(head); }
for (var k = 0; k < 200000; k++) { acc = acc + trigger(k); }
print("sumlist=" + sumlist(head));   // 1+2+3+4+5 = 15
print("acc=" + acc);
