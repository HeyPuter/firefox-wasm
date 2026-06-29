var MARKED = (typeof globalThis !== "undefined" && globalThis.marked) || marked;
var parse = MARKED.parse || MARKED;
var MD = "";
for (var i = 0; i < 40; i++) MD += "# Heading " + i + "\n\nSome **bold** and *italic* and `code` text with [a link](http://x.com/" + i + ").\n\n- item one\n- item two with `inline`\n- item three\n\n> a blockquote with **emphasis**\n\n```js\nfunction f" + i + "(x) { return x * " + i + "; }\n```\n\n1. first\n2. second\n\n| col a | col b |\n|---|---|\n| " + i + " | val |\n\n";
class Benchmark {
  setup() { this.md = MD; this.len = 0; }
  runIteration() { var html = parse(this.md); this.len = html.length; }
  validate() {
    if (typeof globalThis.MARKED_EXPECT === "undefined") globalThis.MARKED_EXPECT = this.len;
    if (this.len !== globalThis.MARKED_EXPECT) throw new Error("marked len mismatch: " + this.len + " vs " + globalThis.MARKED_EXPECT);
    print("HTMLLEN=" + this.len);
  }
}
