// REAL LIB: tweetnacl (NaCl crypto). curve25519/ed25519 = heavy MODULAR FIELD ARITHMETIC on
// typed arrays + salsa20/poly1305 bit ops -- a distinct integer/bit pattern (EC field math) vs
// SHA/MD5. Bit-exact deterministic with fixed seeds/keys/nonces -> strong oracle. JIT vs PBL vs V8.
var nacl = (typeof self!=="undefined" && self.nacl) || (typeof nacl!=="undefined"?nacl:null);
function mix(h, a){ h=h|0; if(typeof a==="string"){for(var i=0;i<a.length;i++)h=(Math.imul(h,31)+a.charCodeAt(i))|0;} else {for(var i=0;i<a.length;i++)h=(Math.imul(h,31)+(a[i]|0))|0;} return h|0; }
function fixed(n, seed){ var a=new Uint8Array(n); for(var i=0;i<n;i++) a[i]=(i*seed+seed*seed+13)&0xff; return a; }

var h = 0;
// SHA-512 over varied inputs
for (var s=1; s<=20; s++){ h = mix(h, nacl.hash(fixed(s*13, s))); }
// ed25519 sign/verify with fixed seeds (heavy modular arithmetic)
for (var s=1; s<=8; s++){
  var kp = nacl.sign.keyPair.fromSeed(fixed(32, s+100));
  h = mix(h, kp.publicKey); h = mix(h, kp.secretKey);
  var msg = fixed(40+s, s+7);
  var sig = nacl.sign.detached(msg, kp.secretKey);
  h = mix(h, sig);
  h = mix(h, nacl.sign.detached.verify(msg, sig, kp.publicKey) ? "V_OK" : "V_FAIL");
  // tamper -> must fail
  var bad = sig.slice(); bad[0]^=1;
  h = mix(h, nacl.sign.detached.verify(msg, bad, kp.publicKey) ? "T_BAD" : "T_OK");
}
// curve25519 scalarMult (the core field arithmetic) + box shared secret
for (var s=1; s<=8; s++){
  var sk1 = fixed(32, s+200), sk2 = fixed(32, s+300);
  var pk1 = nacl.scalarMult.base(sk1), pk2 = nacl.scalarMult.base(sk2);
  h = mix(h, pk1); h = mix(h, pk2);
  var shared1 = nacl.scalarMult(sk1, pk2), shared2 = nacl.scalarMult(sk2, pk1);
  h = mix(h, shared1);
  h = mix(h, mix(0,shared1)===mix(0,shared2) ? "DH_OK" : "DH_FAIL");  // ECDH agreement
}
// secretbox (xsalsa20-poly1305) with fixed key/nonce
for (var s=1; s<=8; s++){
  var key = fixed(32, s+400), nonce = fixed(24, s+500), msg = fixed(50+s, s+3);
  var ct = nacl.secretbox(msg, nonce, key);
  h = mix(h, ct);
  var pt = nacl.secretbox.open(ct, nonce, key);
  var ok = pt && pt.length===msg.length; if(ok){for(var i=0;i<msg.length;i++)if(pt[i]!==msg[i]){ok=false;break;}}
  h = mix(h, ok ? "SB_OK" : "SB_FAIL");
}
print("TWEETNACL checksum=" + h);
if (typeof __wjStats==="function"){ var mm=/"compiled":([0-9]+)/.exec(__wjStats()); print("compiled="+(mm?mm[1]:"?")); }
