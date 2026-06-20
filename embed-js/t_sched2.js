// Mini-scheduler mirroring richards schedule: object-field loop variable, a mono
// method (isHeld) returning a boolean, and a poly method (run) returning the next
// TCB or null. Drains a finite chain so a correct JIT terminates; a miscompiled
// loop condition / dispatch result hangs.
var STATE_HELD = 4, STATE_RUN = 0;
function TCB(link, task, state){ this.link=link; this.task=task; this.state=state; this.id=0; }
TCB.prototype.isHeld = function(){ return (this.state & STATE_HELD) != 0; };
TCB.prototype.run = function(){ return this.task.go(this); };  // task decides next
function TaskA(){ this.k=1; }
TaskA.prototype.go = function(tcb){ tcb.state = STATE_RUN; return tcb.link; };   // advance
function TaskB(){ this.k=2; }
TaskB.prototype.go = function(tcb){ tcb.state = STATE_HELD; return tcb.link; };   // advance
function Sched(){ this.cur=null; this.list=null; this.cid=0; }
Sched.prototype.schedule = function(){
  this.cur = this.list;
  while (this.cur != null) {
    if (this.cur.isHeld()) {
      this.cur = this.cur.link;
    } else {
      this.cid = this.cur.id;
      this.cur = this.cur.run();
    }
  }
};
function build(n){
  var s = new Sched();
  var head = null;
  for (var i=0;i<n;i++){ head = new TCB(head, (i&1)?new TaskA():new TaskB(), (i&2)?STATE_HELD:STATE_RUN); head.id=i; }
  s.list = head;
  return s;
}
var done = 0;
for (var r=0;r<400;r++){ var s = build(8); s.schedule(); done += s.cid; }
print("done="+done);
