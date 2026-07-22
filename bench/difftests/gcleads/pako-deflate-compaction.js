var pako=(typeof globalThis!=="undefined"&&globalThis.pako)||(typeof pako!=="undefined"?pako:null);
function ck(a){var h=0;for(var i=0;i<a.length;i++)h=(Math.imul(h,31)+a[i])|0;return h|0;}
var input=new Uint8Array(1000); for(var i=0;i<1000;i++) input[i]=65+(i%26);  // compressible text
var hd=0, hi=0;
for(var it=0;it<8;it++){
  var comp=pako.deflate(input,{level:6});
  hd=(Math.imul(hd,31)+ck(comp))|0;
  var back=pako.inflate(comp);
  hi=(Math.imul(hi,31)+ck(back))|0;
}
print("deflate="+hd+" inflate="+hi);
