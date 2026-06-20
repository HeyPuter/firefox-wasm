// Faithful mini of richards schedule: object-field loop var (this.cur), a mono
// method with `||` (isHeldOrSusp), and a poly run() returning the next TCB or null.
// Counts processed nodes so ON must equal OFF.
var HELD = 4, SUSP = 2;
function Sched(){ this.cur=null; this.list=null; this.cid=0; this.work=0; }
function TCB(link, task, state, id){ this.link=link; this.task=task; this.state=state; this.id=id; }
TCB.prototype.isHeldOrSusp = function(){ return (this.state & HELD) != 0 || (this.state == SUSP); };
TCB.prototype.run = function(){ return this.task.go(this); };
function TaskA(s){ this.s=s; }
TaskA.prototype.go = function(tcb){ this.s.work += 1; return tcb.link; };   // advance, count
function TaskB(s){ this.s=s; }
TaskB.prototype.go = function(tcb){ this.s.work += 2; return tcb.link; };
Sched.prototype.schedule = function(){
  this.cur = this.list;
  while (this.cur != null) {
    if (this.cur.isHeldOrSusp()) {
      this.cur = this.cur.link;
    } else {
      this.cid = this.cur.id;
      this.cur = this.cur.run();
    }
  }
};
function build(s, n){
  var head = null;
  for (var i=0;i<n;i++){
    var st = (i % 3 == 0) ? HELD : 0;          // some held (skipped via link)
    head = new TCB(head, (i&1)?new TaskA(s):new TaskB(s), st, i);
  }
  s.list = head;
}
var total = 0;
for (var r=0;r<300;r++){ var s = new Sched(); build(s, 9); s.schedule(); total += s.work + s.cid; }
print("sched3=" + total);
