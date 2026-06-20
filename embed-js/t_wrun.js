// Focused test of WorkerTask.run's for-loop + array write + branch + method call.
var DATA_SIZE = 4;
var ID_HANDLER_A = 2, ID_HANDLER_B = 3;
function Sched(){ this.n=0; }
Sched.prototype.queue = function(p){ this.n++; return p; };
function Packet(){ this.id=0; this.a1=0; this.a2=new Array(DATA_SIZE); this.link=null; }
function WorkerTask(s){ this.scheduler=s; this.v1=ID_HANDLER_A; this.v2=0; }
WorkerTask.prototype.run = function (packet) {
  if (packet == null) return null;
  if (this.v1 == ID_HANDLER_A) { this.v1 = ID_HANDLER_B; } else { this.v1 = ID_HANDLER_A; }
  packet.id = this.v1;
  packet.a1 = 0;
  for (var i = 0; i < DATA_SIZE; i++) {
    this.v2++;
    if (this.v2 > 26) this.v2 = 1;
    packet.a2[i] = this.v2;
  }
  return this.scheduler.queue(packet);
};
var s = new Sched();
var w = new WorkerTask(s);
var acc = 0;
for (var k = 0; k < 500; k++) {
  var p = new Packet();
  var r = w.run(p);
  acc += r.a2[3] + r.id;
}
print("wrun_acc=" + acc);
print("queued=" + s.n);
