// Runtime correctness of `||`/`&&` returning a boolean used in a branch, in a
// compiled loop-bearing method (mirrors richards isHeldOrSuspended).
var HELD = 4, SUSP = 2;
function T(state){ this.state = state; this.n = 0; }
T.prototype.isHeldOrSusp = function(){ return (this.state & HELD) != 0 || (this.state == SUSP); };
T.prototype.drive = function(iters){
  var acc = 0;
  for (var i = 0; i < iters; i++) {
    if (this.isHeldOrSusp()) acc += 1; else acc += 10;
    this.state = (this.state + 1) & 7;   // cycle 0..7
  }
  return acc;
};
var sum = 0;
for (var k = 0; k < 400; k++){ var t = new T(k & 7); sum += t.drive(8); }
print("or_sum=" + sum);
