// Front-end targets. GECKO_WJVS_IONFE=<lineno> runs that fn through the Ion path.
function poly(a, b) {
  return (a + b) * 3.0 - b * 2.0;          // poly(10,20)=50
}
function mx(a, b) {
  if (a > b) { return a; }
  return b;                                 // mx(10,20)=20, mx(30,5)=30
}
function sumto(n) {
  var s = 0.0;
  var i = 0.0;
  while (i < n) { s = s + i; i = i + 1.0; }
  return s;                                 // sumto(100)=4950
}

var acc = 0;
for (var k = 0; k < 400; k++) {
  acc = acc + poly(k, k + 1) + mx(k, 7) + sumto(50);
}
print("poly(10,20)=" + poly(10, 20));
print("mx(10,20)=" + mx(10, 20) + " mx(30,5)=" + mx(30, 5));
print("sumto(100)=" + sumto(100));
print("acc=" + acc);
