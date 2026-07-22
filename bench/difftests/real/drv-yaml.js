// REAL LIB: js-yaml parser/dumper -- heavy REGEX (token scanning) + STRING manipulation +
// state-machine + OBJECT/ARRAY GRAPH building. Combines the regex path (history: ubo isArray
// collision, regex-under-GC rooting OOB) with parser object graphs. Parse/dump/round-trip,
// full-structure checksum. JIT vs PBL vs V8, and under gczeal for regex+graph rooting.
var jsyaml = (typeof globalThis!=="undefined" && globalThis.jsyaml) || (typeof jsyaml!=="undefined"?jsyaml:null);
function mix(h, s){ s=String(s); h=h|0; for(var i=0;i<s.length;i++) h=(Math.imul(h,31)+s.charCodeAt(i))|0; return h|0; }
// stable stringify (sorted keys) so the checksum is order-independent
function stable(v){
  if(v===null||typeof v!=="object") return JSON.stringify(v);
  if(Array.isArray(v)) return "["+v.map(stable).join(",")+"]";
  var ks=Object.keys(v).sort(); return "{"+ks.map(function(k){return JSON.stringify(k)+":"+stable(v[k]);}).join(",")+"}";
}

var docs = [
  "name: test\nversion: 1.2\nactive: true\nnothing: null\ncount: 42\npi: 3.14159\n",
  "items:\n  - apple\n  - banana\n  - cherry\nnested:\n  a: 1\n  b:\n    c: 2\n    d: [3, 4, 5]\n",
  "matrix:\n  - [1, 2, 3]\n  - [4, 5, 6]\nflags: {x: true, y: false, z: null}\ntext: |\n  line one\n  line two\n",
  "scalars:\n  int: 100\n  neg: -50\n  float: 2.5e3\n  hex: 0xFF\n  oct: 0o17\n  str: 'quoted'\n  dq: \"double\"\n  empty: \n",
  "list:\n- id: 1\n  tags: [a, b]\n- id: 2\n  tags: [c, d, e]\n- id: 3\n  meta: {k: v, n: 7}\n",
  "deep:\n  l1:\n    l2:\n      l3:\n        l4: [{p: 1}, {p: 2}, {q: [9, 8, 7]}]\n"
];

var h = 0;
for (var iter=0; iter<200; iter++){
  for (var d=0; d<docs.length; d++){
    try {
      var obj = jsyaml.load(docs[d]);           // parse (regex+state-machine+graph build)
      h = mix(h, stable(obj));
      var dumped = jsyaml.dump(obj, {sortKeys: true});  // serialize back to YAML string
      h = mix(h, dumped);
      var obj2 = jsyaml.load(dumped);            // round-trip parse
      h = mix(h, stable(obj2));
      h = mix(h, stable(obj)===stable(obj2) ? "RT_OK" : "RT_FAIL");
    } catch(e){ h = mix(h, "err:"+(e&&e.name)); }
  }
}
print("YAML checksum=" + h);
if (typeof __wjStats==="function"){ var mm=/"compiled":([0-9]+)/.exec(__wjStats()); print("compiled="+(mm?mm[1]:"?")); }
