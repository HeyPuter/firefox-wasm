// REAL APP: render Markdown to HTML with marked and checksum the ENTIRE HTML
// output (not just length). Exercises heavy string building, regex, state machines.
// Load: marked.min.js drv-marked.js
var MARKED = (typeof globalThis !== "undefined" && globalThis.marked) || marked;
var parse = MARKED.parse || MARKED;
function mix(h, s){ s = String(s); for (var i=0;i<s.length;i++){ h = (Math.imul(h,31) + s.charCodeAt(i))|0; } return h; }
function makeMd(i){
  return "# Doc " + i + "\n\n" +
    "Paragraph with **bold**, *italic*, ~~strike~~, `code`, and [link](http://x/" + i + ").\n\n" +
    "> Blockquote level one\n>> nested " + i + "\n\n" +
    "- unordered " + i + "\n  - sub item with `inline` and _em_\n- second\n\n" +
    "1. ordered\n2. list with [ref][r]\n\n[r]: http://ref/" + i + "\n\n" +
    "```js\nfunction f" + i + "(x) {\n  return x * " + i + " + (x % 3);\n}\n```\n\n" +
    "| Name | Val |\n|:---|---:|\n| a" + i + " | " + (i*7) + " |\n| b | " + (i%5) + " |\n\n" +
    "Text with <em>raw html</em> & entities &amp; &lt;tag&gt; and auto http://auto/" + i + " link.\n\n" +
    "---\n\nFinal line " + i + " with escape \\* and hard break  \nnext.\n\n";
}
var big = "";
for (var i = 0; i < 30; i++) big += makeMd(i);
var acc = 0, totalLen = 0;
for (var it = 0; it < 800; it++){
  var html = parse(big);
  acc = mix(acc, html);
  totalLen = html.length;
}
print("MARKED-HTML checksum=" + acc + " len=" + totalLen);
