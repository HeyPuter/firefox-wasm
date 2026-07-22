// APP-LIKE: a records data-processing pipeline (the kind of business logic real
// apps run): generate records, filter/map/group-by/aggregate/sort/join, serialize.
// Exercises object shapes, arrays of objects, Map/Set, string keys, sort comparators.
function mix(h, s){ s = String(s); for (var i=0;i<s.length;i++){ h=(Math.imul(h,31)+s.charCodeAt(i))|0; } return h; }
var DEPTS=["eng","sales","ops","hr","exec"];
var CITIES=["nyc","sf","lon","tok","ber"];
function genRecords(seed, n){
  var recs=[];
  for(var i=0;i<n;i++){
    var id=(seed*1000+i);
    recs.push({
      id:id, name:"user"+id, dept:DEPTS[(seed+i)%DEPTS.length], city:CITIES[(i*7+seed)%CITIES.length],
      salary: 40000 + ((id*2654435761)>>>0)%90000, age: 22 + (id % 43),
      active: (id % 3)!==0, tags:[ "t"+(i%4), "t"+((i+seed)%6) ], score: ((id%100)/7)
    });
  }
  return recs;
}
function pipeline(recs){
  // filter active, map to projection
  var active=recs.filter(function(r){return r.active && r.age>=25;})
    .map(function(r){return {dept:r.dept, city:r.city, salary:r.salary, bonus: Math.round(r.salary*0.15) + (r.score%1000|0), key:r.dept+":"+r.city};});
  // group by dept -> aggregate
  var byDept=new Map();
  for(var i=0;i<active.length;i++){ var r=active[i]; var g=byDept.get(r.dept);
    if(!g){ g={dept:r.dept, count:0, totalSalary:0, totalBonus:0, cities:new Set()}; byDept.set(r.dept, g); }
    g.count++; g.totalSalary+=r.salary; g.totalBonus+=r.bonus; g.cities.add(r.city);
  }
  // to sorted array of summaries
  var summaries=[];
  byDept.forEach(function(g){ summaries.push({dept:g.dept, count:g.count, avg: Math.floor(g.totalSalary/g.count), bonus:g.totalBonus, nCities:g.cities.size}); });
  summaries.sort(function(a,b){ return b.avg-a.avg || (a.dept<b.dept?-1:a.dept>b.dept?1:0); });
  return summaries;
}
var acc=0;
for(var it=0; it<6000; it++){
  var recs=genRecords(it, 60);
  var out=pipeline(recs);
  // serialize the whole result deterministically
  var s="";
  for(var i=0;i<out.length;i++){ var o=out[i]; s+=o.dept+"|"+o.count+"|"+o.avg+"|"+o.bonus+"|"+o.nCities+";"; }
  acc=mix(acc, s);
}
print("APP-PIPELINE checksum="+acc);
