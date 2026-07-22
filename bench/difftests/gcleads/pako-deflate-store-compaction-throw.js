var pako=(typeof globalThis!=="undefined"&&globalThis.pako)||(typeof pako!=="undefined"?pako:null);
var input=new Uint8Array(1000); for(var i=0;i<1000;i++) input[i]=65+(i%26);
var errs=0, vals=[];
for(var it=0;it<80;it++){
  try{ var c=pako.deflate(input,{level:0}); var h=0; for(var i=0;i<c.length;i++)h=(Math.imul(h,31)+c[i])|0; vals.push(h); }
  catch(e){ errs++; }
}
print("errs="+errs+"/80");
