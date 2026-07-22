// APP-LIKE: a small expression-language interpreter (tokenizer -> Pratt parser ->
// tree-walk evaluator with variables, functions, closures). Real app control flow:
// polymorphic AST nodes, recursion, object graphs, string scanning, Maps.
function mix(h, s){ s = String(s); for (var i=0;i<s.length;i++){ h=(Math.imul(h,31)+s.charCodeAt(i))|0; } return h; }
function tokenize(src){
  var toks=[], i=0;
  while(i<src.length){
    var c=src[i];
    if(c===' '||c==='\n'||c==='\t'){i++;continue;}
    if(c>='0'&&c<='9'||c==='.'){ var j=i; while(j<src.length&&(src[j]>='0'&&src[j]<='9'||src[j]==='.'))j++; toks.push({t:"num",v:parseFloat(src.slice(i,j))}); i=j; continue; }
    if(c>='a'&&c<='z'||c>='A'&&c<='Z'||c==='_'){ var j=i; while(j<src.length&&/[a-zA-Z0-9_]/.test(src[j]))j++; toks.push({t:"id",v:src.slice(i,j)}); i=j; continue; }
    if("+-*/%(),=<>!&|?:".indexOf(c)>=0){ var two=src.slice(i,i+2); if(["==","!=","<=",">=","&&","||"].indexOf(two)>=0){toks.push({t:"op",v:two});i+=2;continue;} toks.push({t:"op",v:c}); i++; continue; }
    i++;
  }
  toks.push({t:"eof",v:null}); return toks;
}
function Parser(toks){ this.toks=toks; this.p=0; }
Parser.prototype.peek=function(){return this.toks[this.p];};
Parser.prototype.next=function(){return this.toks[this.p++];};
var PREC={"||":1,"&&":2,"==":3,"!=":3,"<":4,">":4,"<=":4,">=":4,"+":5,"-":5,"*":6,"/":6,"%":6};
Parser.prototype.parseExpr=function(min){
  var left=this.parseUnary();
  while(true){ var t=this.peek(); if(t.t!=="op"||!(t.v in PREC)||PREC[t.v]<min)break; this.next();
    var right=this.parseExpr(PREC[t.v]+1); left={k:"bin",op:t.v,l:left,r:right}; }
  return left;
};
Parser.prototype.parseUnary=function(){ var t=this.peek(); if(t.t==="op"&&(t.v==="-"||t.v==="!")){ this.next(); return {k:"un",op:t.v,e:this.parseUnary()}; } return this.parsePrimary(); };
Parser.prototype.parsePrimary=function(){ var t=this.next();
  if(t.t==="num")return {k:"num",v:t.v};
  if(t.t==="id"){ if(this.peek().t==="op"&&this.peek().v==="("){ this.next(); var args=[]; while(this.peek().v!==")"){ args.push(this.parseExpr(1)); if(this.peek().v===",")this.next(); } this.next(); return {k:"call",name:t.v,args:args}; } return {k:"var",name:t.v}; }
  if(t.t==="op"&&t.v==="("){ var e=this.parseExpr(1); this.next(); return e; }
  return {k:"num",v:0};
};
function evalNode(n,env){
  switch(n.k){
    case "num": return n.v;
    case "var": return env[n.name]!==undefined?env[n.name]:0;
    case "un": { var v=evalNode(n.e,env); return n.op==="-"?-v:(v?0:1); }
    case "call": { var a=n.args.map(function(x){return evalNode(x,env);});
      if(n.name==="max")return Math.max.apply(null,a); if(n.name==="min")return Math.min.apply(null,a);
      if(n.name==="abs")return Math.abs(a[0]); if(n.name==="mod")return a[0]%a[1];
      if(n.name==="pow")return Math.pow(a[0],a[1]); if(n.name==="floor")return Math.floor(a[0]);
      return 0; }
    case "bin": { var l=evalNode(n.l,env),r=evalNode(n.r,env);
      switch(n.op){ case "+":return l+r; case "-":return l-r; case "*":return l*r; case "/":return l/r; case "%":return l%r;
        case "<":return l<r?1:0; case ">":return l>r?1:0; case "<=":return l<=r?1:0; case ">=":return l>=r?1:0;
        case "==":return l===r?1:0; case "!=":return l!==r?1:0; case "&&":return l&&r; case "||":return l||r; } }
  }
  return 0;
}
var exprs=[
  "3 + 4 * 2 - (1 + 1)","pow(2, 10) % 1000","max(1, min(9, 3 * x)) + abs(-y)",
  "(x > 5 && y < 3) || x == y","floor(x / 3) * 3 + mod(y, 7)","-x * -y + 2 / (x - x + 1)",
  "1 + 2 + 3 + 4 + 5 * 6 * 7 - 8 / 4","x % 3 == 0 && y % 5 == 0","pow(x, 2) + pow(y, 2) - 2*x*y"
];
var acc=0;
for(var it=0; it<15000; it++){
  var env={x: it%17, y:(it*3)%23};
  for(var e=0;e<exprs.length;e++){
    var toks=tokenize(exprs[e]);
    var ast=new Parser(toks).parseExpr(1);
    var val=evalNode(ast,env);
    acc=mix(acc, exprs[e]+"@"+env.x+","+env.y+"="+val);
  }
}
print("APP-INTERP checksum="+acc);
