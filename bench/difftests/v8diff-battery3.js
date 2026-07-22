var out=[]; function rec(l,v){ out.push(l+"="+String(v)); }
// FRACTIONAL toString(radix) -- notoriously implementation-varying, spec-precise
var fv=[0.1,0.2,0.3,0.5,0.25,0.125,255.5,3.14159,1/3,2/3,0.9999,1e-5,123.456,-0.1,1023.75,0.0001];
for(var i=0;i<fv.length;i++)for(var r=2;r<=36;r+=(r<8?1:7)){ rec("fr"+i+"_"+r, fv[i].toString(r).slice(0,10)); }
// toFixed / toPrecision at exact .5 and tie boundaries (rounding mode)
var rv=[0.5,1.5,2.5,3.5,0.05,0.15,0.25,0.35,0.45,0.125,0.135,1.005,1.015,2.675,8.575,0.000001,1234.5678,-2.5,-0.5];
for(var i=0;i<rv.length;i++){ for(var f=0;f<=4;f++) rec("tf"+i+"_"+f, rv[i].toFixed(f));
  for(var p=1;p<=6;p++) rec("tp"+i+"_"+p, rv[i].toPrecision(p)); }
// parseInt across radixes + edge strings
var pv=["ff","0xFF","777","zz","10","3.9","  -42","1010","g","Z","+15","0b11","  0o17  ","1e2","4294967296","-0"];
for(var i=0;i<pv.length;i++)for(var r=0;r<=36;r+=(r===0?2:(r<10?4:9))){ rec("pi"+i+"_"+r, parseInt(pv[i], r)); }
// Number edge coercions
var nv=["0x1p4","1_000","0b1010","0o777","1.5e3","  ","\t\n5\r","Infinity","-Infinity","1e309","5e-324","."];
for(var i=0;i<nv.length;i++){ rec("num"+i, Number(nv[i])); rec("pf"+i, parseFloat(nv[i])); }
var acc=0,j=out.join(";"); for(var i=0;i<j.length;i++) acc=(Math.imul(acc,31)+j.charCodeAt(i))|0;
print("v8diff4 checksum="+acc+" lines="+out.length);
