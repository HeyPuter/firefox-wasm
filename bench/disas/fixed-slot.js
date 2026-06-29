// Monomorphic property reads compile and load slots directly (i64.load), no bail.
// FN: read3
// CHECK-COMPILES
// CHECK: i64.load
function read3(o) { return (o.x + o.y + o.z) | 0; }
let s = 0;
const objs = [];
for (let i = 0; i < 64; i++) objs.push({ x: i, y: i + 1, z: i + 2 });
for (let i = 0; i < 300000; i++) s = (s + read3(objs[i & 63])) | 0;
print('s=' + s);
