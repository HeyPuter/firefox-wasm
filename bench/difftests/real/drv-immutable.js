// REAL LIB: immutable.js persistent data structures (List/Map/Set/OrderedMap). Every op
// returns a NEW structure via STRUCTURAL SHARING -> heavy tenured node allocation + rich
// reference graphs = the object-graph-under-GC class where the marking-OOB crash lived.
// Also a hash-array-mapped-trie (HAMT) stress. Full-result checksum: JIT vs PBL vs V8, and
// under gczeal to surface rooting hazards on the persistent-node graphs.
var Immutable = (typeof globalThis!=="undefined" && globalThis.Immutable) || (typeof Immutable!=="undefined"?Immutable:null);
var List=Immutable.List, Map=Immutable.Map, Set=Immutable.Set, OrderedMap=Immutable.OrderedMap;
function mix(h, s){ s=String(s); h=h|0; for(var i=0;i<s.length;i++) h=(Math.imul(h,31)+s.charCodeAt(i))|0; return h|0; }

var h = 0;
// ---- List: build via push (structural sharing), then transform ----
var l = List();
for (var i=0;i<400;i++){ l = l.push((i*7+3)%101); if(i%50===49) l = l.set(i>>1, -i); }
h = mix(h, l.size + "|" + l.get(0) + "|" + l.get(200) + "|" + l.last());
var l2 = l.map(function(x){return x*2;}).filter(function(x){return x%3===0;});
h = mix(h, l2.size + "|" + l2.reduce(function(a,b){return (a+b)|0;},0));
var l3 = l.slice(50,150).concat(l.slice(300,350));
h = mix(h, l3.size + "|" + l3.toArray().join(","));
var lsorted = l.slice(0,60).sort(function(a,b){return a-b;});
h = mix(h, lsorted.toArray().join(","));

// ---- Map (HAMT): set many keys (deep trie), update/merge/delete ----
var m = Map();
for (var i=0;i<500;i++){ m = m.set("k"+(i%137), i); }
h = mix(h, m.size + "|" + m.get("k0") + "|" + m.get("k100"));
var m2 = m.merge(Map({"k0":999, "extra":42})).filter(function(v){return v%2===0;});
h = mix(h, m2.size + "|" + m2.get("k0") + "|" + m2.get("extra"));
var m3 = m; for (var i=0;i<50;i++) m3 = m3.update("k"+i, function(v){return (v||0)+1;});
h = mix(h, m3.get("k10") + "|" + m3.get("k49"));
// sorted entries for deterministic serialization
var ents = m.entrySeq().sort().toArray();
for (var i=0;i<ents.length;i+=17) h = mix(h, ents[i][0]+"="+ents[i][1]);

// ---- Set: union/intersect/subtract ----
var s1 = Set(); for(var i=0;i<200;i++) s1 = s1.add(i%80);
var s2 = Set(); for(var i=0;i<200;i++) s2 = s2.add((i*3)%80);
h = mix(h, s1.size + "|" + s2.size + "|" + s1.union(s2).size + "|" + s1.intersect(s2).size + "|" + s1.subtract(s2).size);

// ---- withMutations (batch mutation on transient) ----
var lm = List().withMutations(function(list){ for(var i=0;i<300;i++) list.push(i*i%97); });
h = mix(h, lm.size + "|" + lm.reduce(function(a,b){return (a^b)|0;},0));

// ---- fromJS (deep nested graph) + getIn/setIn/updateIn ----
var deep = Immutable.fromJS({a:{b:{c:[1,2,{d:5}]}}, list:[{x:1},{x:2},{x:3}]});
deep = deep.setIn(["a","b","c",2,"d"], 99).updateIn(["list",1,"x"], function(v){return v*10;});
h = mix(h, deep.getIn(["a","b","c",2,"d"]) + "|" + deep.getIn(["list",1,"x"]) + "|" + deep.getIn(["a","b","c",0]));

// ---- equality/hashCode (structural) ----
h = mix(h, List([1,2,3]).equals(List([1,2,3])) + "|" + Map({a:1}).equals(Map({a:1})) + "|" + (List([1,2]).hashCode()===List([1,2]).hashCode()));

print("IMMUTABLE checksum=" + h);
if (typeof __wjStats==="function"){ var mm=/"compiled":([0-9]+)/.exec(__wjStats()); print("compiled="+(mm?mm[1]:"?")); }
