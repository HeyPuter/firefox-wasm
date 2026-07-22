// REAL APP: cryptographic hashing (SHA-1 + MD5). Hash digests are EXTREMELY
// sensitive differential oracles -- one wrong bit from any shift/add/xor/mask/
// modulo miscompile flips the entire hex digest. Load: lib-crypto.js drv-crypto.js
function mix(h, s){ s = String(s); for (var i=0;i<s.length;i++){ h = (Math.imul(h,31) + s.charCodeAt(i))|0; } return h; }
// Build varied real-ish messages (JSON-like payloads, unicode, long/short).
function makeMsg(i){
  var kinds = [
    '{"user":"u'+i+'","ts":'+(i*1000003)+',"roles":["admin","dev"],"nested":{"a":'+i+',"b":'+(i*i)+'}}',
    'The quick brown fox '+i+' jumps over '+(i%13)+' lazy dogs. '.repeat(1 + (i%5)),
    'a'.repeat(i % 137) + 'Z' + String.fromCharCode(65 + (i%26)),
    'email'+i+'@example.com|token='+((i*2654435761)>>>0).toString(16)+'|nonce='+(i^0x5bd1e995),
    'é中文'+i+' mixed 😀 unicode '+i
  ];
  return kinds[i % kinds.length];
}
var acc = 0, n = 0;
for (var it = 0; it < 4000; it++){
  var s = makeMsg(it);
  var h1 = hex_sha1(s);        // real SHA-1 (bit ops, rotates, adds)
  var h2 = hex_md5(s);         // real MD5 (adds, shifts, &|^, per-round funcs)
  var hk = hex_hmac_sha1("key" + (it % 7), s);
  acc = mix(acc, h1); acc = mix(acc, h2); acc = mix(acc, hk); n++;
}
print("CRYPTO-DIGEST checksum=" + acc + " n=" + n);
