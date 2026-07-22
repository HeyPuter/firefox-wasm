// Adversarial: string COMPARISON on DYNAMICALLY-BUILT (rope/non-interned) strings.
// Historical fragility: STRCMP/Compare_String gave wrong results on dynamically-built
// strings (pdfjs "Malformed PDF"). Tests ===,!==,<,>,<=,>= + sort ordering across
// ropes, equal-value-different-object, prefixes, unicode, empty. Boolean/order results.
function h(x,s){ s=String(s); for(let i=0;i<s.length;i++){x=(Math.imul(x,31)+s.charCodeAt(i))|0;} return x; }
function build(seed){
  // produce non-interned strings various ways so the JIT sees ropes/dependent strings
  var base = "key" + (seed % 50);
  var rope = "" + base + "_" + (seed*7 % 100) + "_val";     // concat -> rope
  var same = "key" + (seed % 50) + ("_" + (seed*7 % 100)) + "_val"; // equal-value, different construction
  var sliced = (rope + "XYZ").slice(0, rope.length);         // dependent string, equal to rope
  var rep = "ab".repeat(1 + seed % 4);
  var uni = "é中" + (seed % 10) + String.fromCharCode(65 + seed % 26);
  var pre = rope.slice(0, 3 + seed % 5);                     // a prefix of rope
  return [rope, same, sliced, rep, uni, pre, "", base];
}
function fold(seed){
  var r=0;
  var A = build(seed), B = build(seed + 1);
  for (var i=0;i<A.length;i++){
    for (var j=0;j<B.length;j++){
      var a=A[i], b=B[j];
      r=h(r, (a===b?1:0)); r=h(r, (a!==b?1:0)); r=h(r, (a<b?1:0)); r=h(r, (a>b?1:0));
      r=h(r, (a<=b?1:0)); r=h(r, (a>=b?1:0)); r=h(r, (a==b?1:0));
    }
    // equal-value-different-object must be === true and compare equal
    r=h(r, (A[0]===A[1]?1:0)); r=h(r, (A[0]===A[2]?1:0)); r=h(r, (A[0]<A[2]?1:0));
  }
  // sort an array of dynamic strings (sort comparator uses < internally / default lexicographic)
  var arr = A.concat(B).concat(build(seed*3));
  arr.sort();
  r=h(r, arr.join("|"));
  arr.sort(function(x,y){ return x<y?-1:x>y?1:0; });
  r=h(r, arr.join("#"));
  // indexOf / includes on the dynamic set
  r=h(r, arr.indexOf(A[0]) + "/" + (arr.includes(B[2])?1:0) + "/" + arr.lastIndexOf(""));
  return r;
}
var acc=0;
for (var it=0; it<25000; it++) acc=h(acc, fold(it % 61));
print("16-string-compare checksum="+acc);
