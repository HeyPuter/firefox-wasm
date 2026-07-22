// GC-stress regression for the dangling-root fix (gc-marking-oob-rootguard): object-graph
// churn (mini-AST build + property stores into live slots + recursive walk). JIT==PBL under
// GECKO_GCZEAL=2,1 (checksum -1506401866). Guards WJTraceValueRoot dangling-root skip.
// Object-graph churn (mini-AST-like): build nested node objects, store into parent
// slots, walk + hash. The pattern that surfaced the dangling-root bug. Under marking GC.
function mkNode(type, depth, tag){
  var n = {type:type, depth:depth, tag:"t"+tag, kids:[], meta:{a:tag, b:"m"+tag}};
  if(depth>0){ for(var i=0;i<3;i++){ n.kids.push(mkNode(type+i, depth-1, tag*3+i)); } }
  return n;
}
function walk(n, acc){
  acc = (Math.imul(acc,31) + n.depth + n.type.length + n.tag.length + n.meta.a)|0;
  for(var k=0;k<n.kids.length;k++) acc = walk(n.kids[k], acc);
  return acc;
}
function run(){
  var sum = 0;
  for(var it=0; it<400; it++){
    var root = mkNode("R", 4, it);        // ~121 nodes/tree, heavy alloc
    sum = (Math.imul(sum,1000003) ^ walk(root, 0))|0;
    // mutate: reassign slots, push more kids (object churn + stores into live objects)
    root.kids[0].meta = {a:it, b:root.kids[1]};  // store object into slot
    root.extra = root.kids[2];
    sum = (sum + walk(root, 7))|0;
  }
  return sum;
}
print("treegc checksum="+run());
