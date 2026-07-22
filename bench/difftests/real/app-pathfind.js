// APP-LIKE: A* pathfinding on a weighted grid with a binary-heap priority queue.
// Real-app patterns: typed-ish arrays, a heap data structure, Map for came-from,
// heavy integer arithmetic on indices, comparators, Manhattan/heuristic math.
function mix(h, s){ s = String(s); for (var i=0;i<s.length;i++){ h=(Math.imul(h,31)+s.charCodeAt(i))|0; } return h; }
function Heap(){ this.a=[]; }
Heap.prototype.push=function(node,pri){ this.a.push({node:node,pri:pri}); var i=this.a.length-1;
  while(i>0){ var p=(i-1)>>1; if(this.a[p].pri<=this.a[i].pri)break; var t=this.a[p]; this.a[p]=this.a[i]; this.a[i]=t; i=p; } };
Heap.prototype.pop=function(){ var top=this.a[0], last=this.a.pop(); if(this.a.length){ this.a[0]=last; var i=0,n=this.a.length;
  while(true){ var l=2*i+1,r=2*i+2,s=i; if(l<n&&this.a[l].pri<this.a[s].pri)s=l; if(r<n&&this.a[r].pri<this.a[s].pri)s=r; if(s===i)break; var t=this.a[s];this.a[s]=this.a[i];this.a[i]=t; i=s; } } return top; };
Heap.prototype.size=function(){ return this.a.length; };
function makeGrid(W,H,seed){
  var g=new Array(W*H);
  for(var i=0;i<W*H;i++){ var v=((i*2654435761 ^ (seed*40503))>>>0)%10; g[i]= v===0?0:v; } // 0 = wall
  g[0]=1; g[W*H-1]=1; return g;
}
function astar(g,W,H){
  var start=0, goal=W*H-1;
  var open=new Heap(); open.push(start,0);
  var gScore=new Map(); gScore.set(start,0);
  var came=new Map();
  function hx(idx){ var x=idx%W,y=(idx/W)|0, gx=goal%W,gy=(goal/W)|0; return Math.abs(x-gx)+Math.abs(y-gy); }
  var visited=0;
  while(open.size()){
    var cur=open.pop().node; visited++;
    if(cur===goal)break;
    var cx=cur%W, cy=(cur/W)|0;
    var nbrs=[[cx+1,cy],[cx-1,cy],[cx,cy+1],[cx,cy-1]];
    for(var k=0;k<4;k++){ var nx=nbrs[k][0], ny=nbrs[k][1]; if(nx<0||ny<0||nx>=W||ny>=H)continue;
      var ni=ny*W+nx; if(g[ni]===0)continue;
      var tentative=gScore.get(cur)+g[ni];
      if(!gScore.has(ni)||tentative<gScore.get(ni)){ gScore.set(ni,tentative); came.set(ni,cur); open.push(ni, tentative+hx(ni)); }
    }
  }
  // reconstruct
  var path=[], c=goal, plen=0, cost=gScore.has(goal)?gScore.get(goal):-1;
  while(came.has(c)){ path.push(c); c=came.get(c); plen++; if(plen>W*H)break; }
  return {visited:visited, cost:cost, plen:plen, reachable:gScore.has(goal)?1:0};
}
var acc=0;
for(var it=0; it<1500; it++){
  var W=12+(it%5), H=12+(it%3);
  var g=makeGrid(W,H,it);
  var r=astar(g,W,H);
  acc=mix(acc, W+"x"+H+":"+r.visited+"|"+r.cost+"|"+r.plen+"|"+r.reachable);
}
print("APP-PATHFIND checksum="+acc);
