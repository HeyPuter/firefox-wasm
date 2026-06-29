// Minimal repro of hash-map's _createHashedEntry: new + StoreElementHole grow.
function Node(v) { this.v = v; this.next = null; }
function mk(arr, i) {
  var o = new Node(i);          // construct (like new Entry)
  o.next = arr[i];              // read arr[i] (like entry._next = elementData[index])
  arr[i] = o;                   // StoreElementHole grow (deopts) -- like elementData[index]=entry
  return o;
}
function run() {
  var N = 50000;
  var arr = new Array(16);      // holes -> grow path
  for (var i = 0; i < N; i++) {
    var o = mk(arr, i);
    o.v = i + 100;              // set value AFTER (like put: entry._value = value)
  }
  var count = 0, orphan = 0;
  for (var i = 0; i < arr.length; i++) {
    for (var e = arr[i]; e; e = e.next) { count++; if (e.v < 100) orphan++; }
  }
  return count + " orphans=" + orphan + " (expect " + N + " orphans=0)";
}
print("SEH=" + run());
