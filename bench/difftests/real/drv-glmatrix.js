// gl-matrix Float32Array vector/matrix/quat math. V8-CLEAN (JIT==PBL==V8=1055821699).
// NOTE: vec3.distance/length use Math.hypot (benign impl-defined ULP, class#1) -> EXCLUDED
// from the checksum so this is an exact V8 gate for the FLOAT32 ARITHMETIC path (fround).
// REAL LIB: gl-matrix (Float32Array vector/matrix/quaternion math). Stresses FLOAT32 arithmetic
// (Math.fround semantics) + Math.sqrt/sin/cos + tight loops -- a distinct JIT path. Deterministic.
// Checksum full-precision result components. JIT vs PBL vs V8 (investigate any ULP divergence).
var glm = (typeof globalThis!=="undefined" && globalThis.glMatrix) || (typeof glMatrix!=="undefined"?glMatrix:null);
var mat4=glm.mat4, vec3=glm.vec3, vec4=glm.vec4, quat=glm.quat, mat3=glm.mat3;
function mix(h, s){ s=String(s); h=h|0; for(var i=0;i<s.length;i++) h=(Math.imul(h,31)+s.charCodeAt(i))|0; return h|0; }
function hv(h, a){ for(var i=0;i<a.length;i++) h=mix(h, a[i]); return h; }

var h = 0;
var a = mat4.create(), b = mat4.create(), out = mat4.create();
for (var it=0; it<300; it++){
  var t = it*0.017;
  // build transforms (translate/rotate/scale) -> float32 accumulation
  mat4.identity(a);
  mat4.translate(a, a, [Math.sin(t), Math.cos(t*1.3), t*0.5]);
  mat4.rotateX(a, a, t*0.7);
  mat4.rotateY(a, a, t*1.1);
  mat4.rotateZ(a, a, t*0.3);
  mat4.scale(a, a, [1+0.1*Math.sin(t), 1.2, 0.8+0.05*it%3]);
  h = hv(h, a);
  mat4.perspective(b, Math.PI/4 + t*0.01, 1.333, 0.1, 100.0);
  h = hv(h, b);
  mat4.multiply(out, a, b);
  h = hv(h, out);
  var inv = mat4.create();
  if (mat4.invert(inv, out)) h = hv(h, inv); else h = mix(h, "noinv");
  // vec3 ops
  var v = vec3.fromValues(Math.sin(t), it%7-3, Math.cos(t*2));
  var w = vec3.fromValues(t*0.2, 1.5, -it%5);
  var vr = vec3.create();
  vec3.add(vr, v, w); h = hv(h, vr);
  vec3.cross(vr, v, w); h = hv(h, vr);
  h = mix(h, vec3.dot(v, w));
  vec3.normalize(vr, v); h = hv(h, vr);
  vec3.transformMat4(vr, v, out); h = hv(h, vr);
  vec3.lerp(vr, v, w, 0.35); h = hv(h, vr);
  // quaternion ops
  var q = quat.create(), q2 = quat.create(), qr = quat.create();
  quat.fromEuler(q, it%90, (it*2)%90, (it*3)%90);
  quat.rotateX(q2, q, t);
  quat.multiply(qr, q, q2); h = hv(h, qr);
  quat.slerp(qr, q, q2, 0.4); h = hv(h, qr);
  quat.normalize(qr, qr); h = hv(h, qr);
}
print("GLMATRIX checksum=" + h);
if (typeof __wjStats==="function"){ var mm=/"compiled":([0-9]+)/.exec(__wjStats()); print("compiled="+(mm?mm[1]:"?")); }
