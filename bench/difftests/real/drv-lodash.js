// REAL APP: lodash utility functions (edge-case-heavy real library). Exercises deep
// object/array traversal, string transforms, number coercion, comparators, cloning,
// equality -- lots of branchy real code the microbenches miss. Deterministic subset
// only (no random/uniqueId/now/debounce). Full-result checksum, JIT vs PBL.
// Load: lodash.min.js drv-lodash.js
function mix(h, s){ s=String(s); for (var i=0;i<s.length;i++){ h=(Math.imul(h,31)+s.charCodeAt(i))|0; } return h; }
function J(x){ try { return JSON.stringify(x); } catch(e){ return "cyc"; } }
function fold(seed){
  var h = 0;
  var nums = []; for (var i=0;i<9;i++) nums.push(((seed*(i+3)*37) % 97) - 48);
  var strs = ["fooBar","kebab-case","snake_case string","  Trim Me  ","UPPER","123.45","héllo Wörld", "a"+seed];
  var objs = []; for (var i=0;i<6;i++) objs.push({ id:i, v:(seed+i)%11, tag: strs[i%strs.length], nested:{k:(i*seed)%7} });
  // arrays
  h = mix(h, J(_.chunk(nums, 2 + (seed%3))));
  h = mix(h, J(_.uniq(nums.map(function(x){return x%5;}))));
  h = mix(h, J(_.difference(nums, [nums[0], nums[3], 0])));
  h = mix(h, J(_.intersection(nums, nums.slice(2).concat([1,2,3]))));
  h = mix(h, J(_.flattenDeep([nums, [nums.slice(0,2)], [[seed]]])));
  h = mix(h, J(_.without(nums, nums[1], nums[4])));
  h = mix(h, J(_.zip(nums.slice(0,3), strs.slice(0,3))));
  h = mix(h, J(_.chunk(_.compact([0, nums[0], "", nums[1], null, nums[2], undefined, NaN]), 2)));
  h = mix(h, J(_.take(_.orderBy(objs, ["v","id"], ["asc","desc"]), 4).map(function(o){return o.id+":"+o.v;})));
  // collection
  h = mix(h, J(_.groupBy(nums, function(x){ return x % 3; })));
  h = mix(h, J(_.countBy(strs, "length")));
  h = mix(h, J(_.partition(objs, function(o){ return o.v > 4; }).map(function(g){return g.length;})));
  h = mix(h, J(_.keyBy(objs, "id")));
  h = mix(h, J(_.sumBy(objs, "v") + "/" + _.meanBy(objs, function(o){return o.v;})));
  // string
  h = mix(h, _.camelCase(strs[1]) + _.kebabCase(strs[0]) + _.snakeCase(strs[0]));
  h = mix(h, _.capitalize(strs[4]) + _.deburr(strs[6]) + _.startCase(strs[2]));
  h = mix(h, _.padStart(strs[7], 10, "*") + _.truncate(strs.join(" "), {length: 12}));
  h = mix(h, J(_.words(strs[2] + " " + strs[0])));
  // number / math / lang
  h = mix(h, _.clamp(seed - 3, 0, 5) + "/" + (_.inRange(seed, 2, 8)?1:0) + "/" + _.round(seed/7, 2));
  h = mix(h, _.sum(nums) + "/" + _.max(nums) + "/" + _.min(nums));
  h = mix(h, _.toNumber("  " + strs[5] + " ") + "/" + _.toInteger("42px") + "/" + _.parseInt("0x1F", 16));
  h = mix(h, (_.isEqual(objs[0], _.cloneDeep(objs[0]))?1:0) + "/" + (_.isEmpty({})?1:0) + "/" + (_.isEqual(nums, nums.slice())?1:0));
  // object
  h = mix(h, J(_.mapValues({a: seed, b: seed*2}, function(x){ return x % 6; })));
  h = mix(h, J(_.omit(objs[0], ["nested"])) + J(_.pick(objs[1], ["id","v"])));
  h = mix(h, J(_.invert({x:seed, y:seed+1})) + J(_.merge({}, {a:{b:1}}, {a:{c:seed}})));
  h = mix(h, _.get(objs[2], "nested.k", -1) + "/" + J(_.defaults({v:1}, {v:9, w:seed})));
  return h;
}
var acc = 0;
for (var it = 0; it < 4000; it++) acc = mix(acc, fold(it % 41));
print("LODASH checksum=" + acc);
