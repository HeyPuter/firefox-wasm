// JIT-vs-V8 differential #2: array methods / regexp / string-regex / typed arrays / JSON /
// Object ops -- heavily self-hosted+CacheIR (shared JIT+PBL), the shared-miscompile-prone zone.
// Avoids benign classes: no astral chars in printed output, no hypot, no normalize/Intl.
var out=[]; function rec(l,v){ out.push(l+"="+String(v)); }
function J(v){ return JSON.stringify(v); }

// ---- Array methods ----
var base=[3,1,4,1,5,9,2,6,5,3];
rec("slice1", J(base.slice(2,7))); rec("slice2", J(base.slice(-3))); rec("slice3", J(base.slice(-100,-2)));
rec("concat", J([1,2].concat([3,4],5,[[6]])));
rec("flat1", J([1,[2,[3,[4]]]].flat())); rec("flat2", J([1,[2,[3,[4]]]].flat(2))); rec("flatI", J([1,[2,[3,[4]]]].flat(Infinity)));
rec("flatMap", J([1,2,3].flatMap(function(x){return [x,x*2];})));
for(var i=0;i<3;i++){ var a=base.slice(); a.splice(i*2, 2, 99, 98); rec("splice"+i, J(a)); }
rec("spliceDel", J((function(){var a=base.slice();var r=a.splice(3,4);return [a,r];})()));
var nanArr=[1,NaN,3,-0,0,NaN];
rec("idxNaN", nanArr.indexOf(NaN)); rec("incNaN", nanArr.includes(NaN));
rec("idxN0", nanArr.indexOf(-0)); rec("lidxN0", nanArr.lastIndexOf(0));
rec("fill1", J(new Array(6).fill(7))); rec("fill2", J([1,2,3,4,5].fill(0,1,3)));
rec("copyW", J([1,2,3,4,5].copyWithin(0,3))); rec("copyW2", J([1,2,3,4,5].copyWithin(1,3,4)));
rec("findIdx", [5,12,8,130,44].findIndex(function(x){return x>10;}));
rec("findLast", [5,12,8,130,44].findLastIndex ? [5,12,8,130,44].findLastIndex(function(x){return x<50;}) : "n/a");
rec("reduce", [1,2,3,4].reduce(function(a,b){return a*10+b;},0));
rec("reduceR", [1,2,3,4].reduceRight(function(a,b){return a*10+b;},0));
rec("every", [2,4,6].every(function(x){return x%2===0;})); rec("some", [1,3,5].some(function(x){return x%2===0;}));
rec("fromIter", J(Array.from("abc"))); rec("fromMap", J(Array.from([1,2,3], function(x){return x*x;})));
rec("fromLen", J(Array.from({length:3}, function(_,i){return i*2;})));
rec("of", J(Array.of(7,8,9))); rec("joinS", [1,2,3].join("-")); rec("keysArr", J([...[10,20,30].keys()]));
rec("entriesArr", J([...["a","b"].entries()]));

// ---- Regexp ----
rec("exec1", J("2024-01-15".match(/(\d+)-(\d+)-(\d+)/).slice(0,4)));
rec("named", J((function(){var m=/(?<y>\d+)-(?<m>\d+)/.exec("2024-05");return [m.groups.y,m.groups.m];})()));
rec("global", J("a1b2c3".match(/\d/g)));
rec("matchAll", J([..."a1b2c3".matchAll(/([a-z])(\d)/g)].map(function(m){return m[1]+m[2];})));
rec("lookbehind", J("$5 and £3".match(/(?<=\$)\d+/g)));
rec("lookahead", J("1px 2em 3px".match(/\d+(?=px)/g)));
rec("repl1", "2024-01-15".replace(/(\d+)-(\d+)-(\d+)/, "$3/$2/$1"));
rec("replFn", "a1b2".replace(/(\d)/g, function(m,d){return "["+(d*2)+"]";}));
rec("replNamed", "2024-05".replace(/(?<y>\d+)-(?<m>\d+)/, "$<m>/$<y>"));
rec("replAll", "a.b.c.d".replaceAll(".", "_"));
rec("split1", J("a1b2c3d".split(/\d/))); rec("split2", J("a,b,c,d".split(",",2)));
rec("splitCap", J("a1b2c".split(/(\d)/)));
rec("sticky", J((function(){var re=/\d/y; re.lastIndex=1; return [re.test("a1"), re.lastIndex];})()));
rec("lastIdx", J((function(){var re=/\d/g; var r=[]; var m; while((m=re.exec("1a2b3"))) r.push(m.index); return r;})()));
rec("testFlags", J([/abc/i.test("ABC"), /^x/m.test("y\nx"), /a.b/s.test("a\nb")]));

// ---- String (regex-ish + misc) ----
var s="The Quick Brown Fox";
rec("at", [s.at(0), s.at(-1)]); rec("sw", s.startsWith("The")); rec("ew", s.endsWith("Fox"));
rec("inc", s.includes("Brown")); rec("matchS", J(s.match(/\w+/g)));
rec("replSpace", s.replace(/\s+/g, "_")); rec("trimVar", ("  x y  ".trim())+"|"+("  x  ".trimStart())+"|"+("  x  ".trimEnd()));

// ---- TypedArray + DataView ----
var i32=new Int32Array([1,-2,3,-4,5]);
rec("taSub", J(Array.from(i32.subarray(1,4)))); rec("taMap", J(Array.from(i32.map(function(x){return x*10;}))));
rec("taFilter", J(Array.from(i32.filter(function(x){return x>0;})))); rec("taReduce", i32.reduce(function(a,b){return a+b;},0));
rec("taSet", (function(){var t=new Int32Array(5); t.set([9,8],2); return J(Array.from(t));})());
var u8=new Uint8Array([255,128,1,0]); rec("u8", J(Array.from(u8)));
var f64=new Float64Array([1.5,-2.25,3.125]); rec("f64", J(Array.from(f64)));
var i8=new Int8Array([200,-200,127,-128,255]); rec("i8coerce", J(Array.from(i8)));
var u8c=new Uint8ClampedArray([300,-5,128,127.6]); rec("u8clamp", J(Array.from(u8c)));
var dv=new DataView(new ArrayBuffer(8));
dv.setInt32(0, 0x12345678, false); dv.setInt32(4, 0x9abcdef0|0, true);
rec("dvBE", dv.getInt32(0,false)); rec("dvLE", dv.getInt32(4,true));
rec("dvU16", (function(){var d=new DataView(new ArrayBuffer(4)); d.setUint16(0,0xABCD,false); return [d.getUint16(0,false), d.getUint8(0), d.getUint8(1)];})());
rec("dvF32", (function(){var d=new DataView(new ArrayBuffer(4)); d.setFloat32(0,1.5,true); return d.getFloat32(0,true);})());

// ---- Object ops (enumeration order incl integer keys) ----
var o={b:2,a:1,2:"two",10:"ten",1:"one",c:3}; o.d=4;
rec("okeys", J(Object.keys(o))); rec("ovals", J(Object.values(o))); rec("oentries", J(Object.entries(o)));
rec("oassign", J(Object.assign({},{x:1},{y:2},{x:3}))); rec("ospread", J({...{p:1},...{q:2}}));
rec("ogopn", J(Object.getOwnPropertyNames({z:1,0:0,y:2,1:1})));

// ---- JSON edge cases ----
rec("jStr1", J({a:undefined, b:function(){}, c:null, d:NaN, e:Infinity, f:[undefined,function(){}]}));
rec("jStr2", JSON.stringify({x:1,y:{z:[1,2,3]}}, null, 2));
rec("jNum", JSON.stringify([0,-0,1e21,1e-7,1.5,-1.5]));
rec("jParse", J(JSON.parse('{"a":[1,2,{"b":true,"c":null}],"d":-0}')));

var acc=0; var joined=out.join(";");
for(var i=0;i<joined.length;i++){ acc=(Math.imul(acc,31)+joined.charCodeAt(i))|0; }
print("v8diff3 checksum="+acc+" lines="+out.length);
