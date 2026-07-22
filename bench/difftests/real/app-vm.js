// APP-LIKE: a tiny stack-based bytecode VM (like a template/rules engine backend).
// Real-app patterns: a dispatch loop over an opcode switch (tableswitch), a value
// stack, integer/float mixed arithmetic, comparisons, jumps, call frames.
function mix(h, s){ s = String(s); for (var i=0;i<s.length;i++){ h=(Math.imul(h,31)+s.charCodeAt(i))|0; } return h; }
// opcodes
var PUSH=0,ADD=1,SUB=2,MUL=3,DIV=4,MOD=5,NEG=6,DUP=7,SWAP=8,DROP=9,
    LT=10,GT=11,EQ=12,JMP=13,JZ=14,LOAD=15,STORE=16,PRINT=17,AND=18,OR=19,
    SHL=20,SHR=21,BAND=22,BXOR=23,HALT=24;
function run(code, input){
  var sp=[], pc=0, locals=[input, 0, 0, 0], out=0, steps=0;
  while(pc<code.length && steps<100000){
    steps++;
    var op=code[pc++];
    switch(op){
      case PUSH: sp.push(code[pc++]); break;
      case ADD: { var b=sp.pop(),a=sp.pop(); sp.push(a+b); break; }
      case SUB: { var b=sp.pop(),a=sp.pop(); sp.push(a-b); break; }
      case MUL: { var b=sp.pop(),a=sp.pop(); sp.push(a*b); break; }
      case DIV: { var b=sp.pop(),a=sp.pop(); sp.push(b===0?0:a/b); break; }
      case MOD: { var b=sp.pop(),a=sp.pop(); sp.push(b===0?0:a%b); break; }
      case NEG: sp.push(-sp.pop()); break;
      case DUP: { var t=sp[sp.length-1]; sp.push(t); break; }
      case SWAP: { var b=sp.pop(),a=sp.pop(); sp.push(b); sp.push(a); break; }
      case DROP: sp.pop(); break;
      case LT: { var b=sp.pop(),a=sp.pop(); sp.push(a<b?1:0); break; }
      case GT: { var b=sp.pop(),a=sp.pop(); sp.push(a>b?1:0); break; }
      case EQ: { var b=sp.pop(),a=sp.pop(); sp.push(a===b?1:0); break; }
      case JMP: pc=code[pc]; break;
      case JZ: { var c=sp.pop(); if(c===0)pc=code[pc]; else pc++; break; }
      case LOAD: sp.push(locals[code[pc++]]); break;
      case STORE: locals[code[pc++]]=sp.pop(); break;
      case PRINT: out=mix(out, "v="+sp[sp.length-1]); break;
      case AND: { var b=sp.pop(),a=sp.pop(); sp.push(a&&b); break; }
      case OR: { var b=sp.pop(),a=sp.pop(); sp.push(a||b); break; }
      case SHL: { var b=sp.pop(),a=sp.pop(); sp.push((a|0)<<(b|0)); break; }
      case SHR: { var b=sp.pop(),a=sp.pop(); sp.push((a|0)>>>(b|0)); break; }
      case BAND: { var b=sp.pop(),a=sp.pop(); sp.push((a|0)&(b|0)); break; }
      case BXOR: { var b=sp.pop(),a=sp.pop(); sp.push((a|0)^(b|0)); break; }
      case HALT: return mix(out, "top="+(sp.length?sp[sp.length-1]:"none")+"|steps="+steps);
    }
  }
  return mix(out, "end|steps="+steps+"|sp="+sp.length);
}
// program: compute a little numeric routine with a loop (sum of i*i for i in 0..n while masking)
// locals: [0]=input n, [1]=i, [2]=acc
var prog=[
  PUSH,0, STORE,1,        // i=0
  PUSH,0, STORE,2,        // acc=0
  // loop: (pc=8)
  LOAD,1, LOAD,0, LT, JZ, 37,   // if !(i<n) jump end (pc=37)
  LOAD,2, LOAD,1, LOAD,1, MUL, ADD, // acc += i*i
  PUSH,255, BAND, STORE,2,       // acc &= 255
  LOAD,1, PUSH,1, ADD, STORE,1,  // i++
  JMP, 8,
  // end (pc=34)
  LOAD,2, PRINT, LOAD,2, HALT
];
var acc=0;
for(var it=0; it<40000; it++){
  var n=it%40;
  var r=run(prog, n);
  acc=mix(acc, n+"->"+r);
}
print("APP-VM checksum="+acc);
