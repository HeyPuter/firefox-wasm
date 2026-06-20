// Minimal repro of navier lin_solve complex branch, with width/height/rowSize/
// iterations CLOSED OVER (aliased vars) as in navier, plus a set_bnd-like call.
function makeSolver() {
  var width = 128, height = 128, rowSize = width + 2, iterations = 20;
  var size = (width + 2) * (height + 2);

  function set_bnd(b, x) {
    for (var i = 1; i <= width; i++) {
      x[i] = x[i + rowSize];
      x[i + (height + 1) * rowSize] = x[i + height * rowSize];
    }
    for (var j = 1; j <= height; j++) {
      x[j * rowSize] = x[1 + j * rowSize];
      x[(width + 1) + j * rowSize] = x[width + j * rowSize];
    }
  }

  function lin_solve(b, x, x0, a, c) {
    var invC = 1 / c;
    for (var k = 0; k < iterations; k++) {
      for (var j = 1; j <= height; j++) {
        var lastRow = (j - 1) * rowSize;
        var currentRow = j * rowSize;
        var nextRow = (j + 1) * rowSize;
        var lastX = x[currentRow];
        ++currentRow;
        for (var i = 1; i <= width; i++)
          lastX = x[currentRow] = (x0[currentRow] + a * (lastX + x[++currentRow] + x[++lastRow] + x[++nextRow])) * invC;
      }
      set_bnd(b, x);
    }
  }

  return function run() {
    var x = new Array(size), x0 = new Array(size);
    for (var i = 0; i < size; i++) { x[i] = 0; x0[i] = (i * 7 % 13) * 0.5; }
    for (var t = 0; t < 5; t++) lin_solve(0, x, x0, 1, 4);
    var s = 0;
    for (var i = 0; i < size; i++) s += x[i];
    return s;
  };
}

var run = makeSolver();
var acc = 0;
for (var n = 0; n < 5; n++) acc += run();
print("linsolve_acc=" + acc.toFixed(6));
