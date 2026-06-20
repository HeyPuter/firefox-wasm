// Ion DYNAMIC-SLOT field gate: an object with more properties than fit in fixed
// slots spills later fields to the dynamic slots_ vector. getPropField must load
// those via slots_ (= *(recv+8)) + offset.   TARGET=<getwide lineno> trigger after
function Wide() {
  this.a=1.0; this.b=2.0; this.c=3.0; this.d=4.0; this.e=5.0; this.f=6.0;
  this.g=7.0; this.h=8.0; this.i=9.0; this.j=10.0; this.k=11.0; this.l=12.0;
  this.m=13.0; this.n=14.0; this.o=15.0; this.p=16.0; this.q=17.0; this.r=18.0;
  this.s=19.0; this.t=20.0; this.u=21.0; this.v=22.0; this.w=23.0; this.x=24.0;
}
function getwide(o) { return o.t + o.x; }   // late fields -> dynamic slots; 20+24=44
function trigger(z) { return z + 1.0; }

var o = new Wide();
var acc = 0.0;
for (var k = 0; k < 200000; k++) { acc = acc + getwide(o); }
for (var k = 0; k < 200000; k++) { acc = acc + trigger(k); }
print("getwide=" + getwide(o));   // 44
print("acc=" + acc);
