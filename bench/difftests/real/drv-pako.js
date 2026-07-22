// REAL LIB: pako (zlib deflate/inflate/gzip) -- heavy bit manipulation + Huffman tables +
// LZ77 window matching + Adler32/CRC32 checksums. Bit-exact deterministic -> a strong oracle
// for integer/bit/shift/coercion miscompiles (one wrong bit corrupts the whole stream).
// Full-output checksum: compressed bytes + round-trip verification. JIT vs PBL vs V8.
var pako = (typeof globalThis!=="undefined" && globalThis.pako) || (typeof pako!=="undefined" ? pako : null);
function mix(h, v){ h=h|0; if(typeof v==="string"){ for(var i=0;i<v.length;i++) h=(Math.imul(h,31)+v.charCodeAt(i))|0; } else { for(var i=0;i<v.length;i++) h=(Math.imul(h,31)+ (v[i]|0))|0; } return h|0; }

// deterministic byte inputs of varied structure (compressibility spectrum)
function mkInput(kind, n){
  var a = new Uint8Array(n);
  for(var i=0;i<n;i++){
    if(kind===0) a[i] = 65 + (i%26);                 // repetitive text (high compress)
    else if(kind===1) a[i] = (i*2654435761)>>>24;     // pseudo-random (low compress)
    else if(kind===2) a[i] = (i%7===0)?255:0;         // sparse
    else if(kind===3) a[i] = (i&1)? (i%13) : (i%251); // mixed
    else a[i] = (i*i + i*7 + 13) & 0xff;              // quadratic pattern
  }
  return a;
}

var h = 0;
var sizes = [0, 1, 5, 63, 64, 255, 1000, 4096, 10000];
for(var k=0;k<5;k++){
  for(var si=0; si<sizes.length; si++){
    var input = mkInput(k, sizes[si]);
    for(var lvl=0; lvl<=9; lvl+=3){
      try {
        var comp = pako.deflate(input, {level: lvl});
        h = mix(h, comp);                     // bit-exact compressed bytes
        h = mix(h, "len"+comp.length);
        var back = pako.inflate(comp);
        // verify round-trip
        var ok = back.length===input.length;
        if(ok){ for(var i=0;i<input.length;i++){ if(back[i]!==input[i]){ ok=false; break; } } }
        h = mix(h, ok?"RT_OK":"RT_FAIL");
      } catch(e){ h = mix(h, "deflateErr:"+(e&&e.message)); }
    }
    // gzip round-trip (adds header/CRC32)
    try {
      var gz = pako.gzip(input);
      h = mix(h, gz); h = mix(h, "gzlen"+gz.length);
      var ugz = pako.ungzip(gz);
      var ok2 = ugz.length===input.length;
      if(ok2){ for(var i=0;i<input.length;i++){ if(ugz[i]!==input[i]){ ok2=false; break; } } }
      h = mix(h, ok2?"GZ_OK":"GZ_FAIL");
    } catch(e){ h = mix(h, "gzErr:"+(e&&e.message)); }
  }
}
print("PAKO checksum=" + h);
