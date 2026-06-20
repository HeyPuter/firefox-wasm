// Deeper mini: schedule -> TCB.run -> task.go (poly) -> scheduler.give (returns
// the next TCB). Mirrors richards run()->task.run()->scheduler.queue/release chain.
var HELD = 4;
function Sched(){ this.cur=null; this.list=null; this.cid=0; this.work=0; }
Sched.prototype.give = function(tcb){ this.work += 1; return tcb.link; };  // method returning a TCB
function TCB(link, task, state, id){ this.link=link; this.task=task; this.state=state; this.id=id; }
TCB.prototype.isHeld = function(){ return (this.state & HELD) != 0; };
TCB.prototype.run = function(){ return this.task.go(this); };
function TaskA(s){ this.s=s; }
TaskA.prototype.go = function(tcb){ return this.s.give(tcb); };   // calls scheduler method
function TaskB(s){ this.s=s; }
TaskB.prototype.go = function(tcb){ return this.s.give(tcb); };
Sched.prototype.schedule = function(){
  this.cur = this.list;
  while (this.cur != null) {
    if (this.cur.isHeld()) { this.cur = this.cur.link; }
    else { this.cid = this.cur.id; this.cur = this.cur.run(); }
  }
};
function build(s, n){
  var head = null;
  for (var i=0;i<n;i++){ head = new TCB(head, (i&1)?new TaskA(s):new TaskB(s), (i%3==0)?HELD:0, i); }
  s.list = head;
}
var total = 0;
for (var r=0;r<300;r++){ var s = new Sched(); build(s, 9); s.schedule(); total += s.work + s.cid; }
print("sched4=" + total);
