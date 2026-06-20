// Focused test of richards addTo: append `this` to end of queue's link chain.
function Packet(link) { this.link = link; this.id = 0; }
Packet.prototype.addTo = function (queue) {
  this.link = null;
  if (queue == null) return this;
  var peek, next = queue;
  while ((peek = next.link) != null)
    next = peek;
  next.link = this;
  return queue;
};
function len(q){ var n=0; while(q!=null){ n++; q=q.link; } return n; }

var acc = 0;
for (var i = 0; i < 300; i++) {
  var q = null;
  for (var j = 0; j < 6; j++) {
    var p = new Packet(null);
    q = p.addTo(q);   // q starts null -> returns p; then appends each new p to tail
  }
  acc += len(q);      // each inner loop builds a chain of 6
}
print("addto_acc=" + acc);
print("expect=" + (300*6));
