var MARKED = globalThis.marked || marked;
var parse = MARKED.parse || MARKED;
var MD = "";
for (var i = 0; i < 40; i++) MD += "# Heading " + i + "\n\nSome **bold** and *italic* and `code` text with [a link](http://x.com/" + i + ").\n\n- item one\n- item two\n\n> quote\n\n```js\nfn" + i + "(x){return x*" + i + "}\n```\n\n1. a\n2. b\n\n| c | d |\n|---|---|\n| " + i + " | v |\n\n";
var expect = null;
for (var it = 0; it < 40; it++) {
  try {
    var len = parse(MD).length;
    if (expect === null) expect = len;
    if (len !== expect) { print("MISMATCH at iter " + it + ": " + len + " vs " + expect); break; }
  } catch (e) {
    print("THROW at iter " + it + ": " + e + (e && e.stack ? " | stack: " + String(e.stack).split("\n").slice(0,3).join(" ;; ") : ""));
    break;
  }
}
print("DONE expect=" + expect);
