// Integer bit-twiddling lowers to native i32 ops (a hash-mix kernel).
// FN: mix
// CHECK-COMPILES
// CHECK: i32.add
// CHECK: i32.xor
function mix(a, b) { let h = (a ^ b) | 0; h = (h + (h << 5)) | 0; h ^= h >> 7; return h | 0; }
let s = 0 | 0;
for (let i = 0; i < 400000; i++) s = mix(s, i) | 0;
print('s=' + s);
