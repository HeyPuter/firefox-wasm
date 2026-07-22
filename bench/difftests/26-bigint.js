// BigInt differential: arithmetic, bitwise, comparison, coercion edges
function h(s){let x=0n;for(let i=0;i<s.length;i++){x=(x*131n+BigInt(s.charCodeAt(i)))% (2n**64n);}return x;}
let acc=0n;
for(let i=0;i<4000;i++){
  let a=BigInt(i)*0x1_0000_0001n - 7n;
  let b=BigInt(i%97)+1n;
  acc+= (a*b) ^ (a>>3n) ;
  acc+= (a % b);
  acc+= (a / b);
  acc+= (a << (BigInt(i)%13n)) & 0xffffffffn;
  acc+= (a | b) ^ (b & a);
  acc-= (-a) + (~b);
  if(a<b) acc+=1n; else acc-=1n;
  acc = acc % (2n**80n);
  // mixed asIntN / asUintN
  acc += BigInt.asIntN(32, a);
  acc += BigInt.asUintN(16, a*b);
}
let s="checksum:"+h(acc.toString());
print(s);
