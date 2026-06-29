var __defProp = Object.defineProperty;
var __name = (target, value) => __defProp(target, "name", { value, configurable: true });

// shim.mjs
var g = globalThis;
if (typeof g.self === "undefined") {
  g.self = g;
}
if (typeof g.vAPI === "undefined") {
  g.vAPI = {
    canWASM: false,
    // force the pure-JS tries (no .wasm fetch in a shell) -> all interpreted/JIT-able
    localStorage: { getItem() {
      return null;
    }, setItem() {
    }, removeItem() {
    } },
    webextFlavor: { env: [], soup: /* @__PURE__ */ new Set(["firefox", "webext"]) }
  };
}
if (typeof g.CSS === "undefined") {
  g.CSS = { supports() {
    return false;
  } };
}

// ubo-src/lib/csstree/css-tree.js
var ts = Object.create;
var nr = Object.defineProperty;
var rs = Object.getOwnPropertyDescriptor;
var ns = Object.getOwnPropertyNames;
var os = Object.getPrototypeOf;
var is = Object.prototype.hasOwnProperty;
var Oe = /* @__PURE__ */ __name((e, t) => () => (t || e((t = { exports: {} }).exports, t), t.exports), "Oe");
var b = /* @__PURE__ */ __name((e, t) => {
  for (var r in t) nr(e, r, { get: t[r], enumerable: true });
}, "b");
var as = /* @__PURE__ */ __name((e, t, r, n) => {
  if (t && typeof t == "object" || typeof t == "function") for (let o of ns(t)) !is.call(e, o) && o !== r && nr(e, o, { get: /* @__PURE__ */ __name(() => t[o], "get"), enumerable: !(n = rs(t, o)) || n.enumerable });
  return e;
}, "as");
var ss = /* @__PURE__ */ __name((e, t, r) => (r = e != null ? ts(os(e)) : {}, as(t || !e || !e.__esModule ? nr(r, "default", { value: e, enumerable: true }) : r, e)), "ss");
var Zo = Oe((hr) => {
  var $o = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/".split("");
  hr.encode = function(e) {
    if (0 <= e && e < $o.length) return $o[e];
    throw new TypeError("Must be between 0 and 63: " + e);
  };
  hr.decode = function(e) {
    var t = 65, r = 90, n = 97, o = 122, i = 48, s = 57, u = 43, c = 47, a = 26, l = 52;
    return t <= e && e <= r ? e - t : n <= e && e <= o ? e - n + a : i <= e && e <= s ? e - i + l : e == u ? 62 : e == c ? 63 : -1;
  };
});
var ni = Oe((fr) => {
  var Jo = Zo(), mr = 5, ei = 1 << mr, ti = ei - 1, ri = ei;
  function ys(e) {
    return e < 0 ? (-e << 1) + 1 : (e << 1) + 0;
  }
  __name(ys, "ys");
  function ks(e) {
    var t = (e & 1) === 1, r = e >> 1;
    return t ? -r : r;
  }
  __name(ks, "ks");
  fr.encode = function(t) {
    var r = "", n, o = ys(t);
    do
      n = o & ti, o >>>= mr, o > 0 && (n |= ri), r += Jo.encode(n);
    while (o > 0);
    return r;
  };
  fr.decode = function(t, r, n) {
    var o = t.length, i = 0, s = 0, u, c;
    do {
      if (r >= o) throw new Error("Expected more digits in base 64 VLQ value.");
      if (c = Jo.decode(t.charCodeAt(r++)), c === -1) throw new Error("Invalid base64 digit: " + t.charAt(r - 1));
      u = !!(c & ri), c &= ti, i = i + (c << s), s += mr;
    } while (u);
    n.value = ks(i), n.rest = r;
  };
});
var Lt = Oe((K) => {
  function ws(e, t, r) {
    if (t in e) return e[t];
    if (arguments.length === 3) return r;
    throw new Error('"' + t + '" is a required argument.');
  }
  __name(ws, "ws");
  K.getArg = ws;
  var oi = /^(?:([\w+\-.]+):)?\/\/(?:(\w+:\w+)@)?([\w.-]*)(?::(\d+))?(.*)$/, vs = /^data:.+\,.+$/;
  function ot(e) {
    var t = e.match(oi);
    return t ? { scheme: t[1], auth: t[2], host: t[3], port: t[4], path: t[5] } : null;
  }
  __name(ot, "ot");
  K.urlParse = ot;
  function Ue(e) {
    var t = "";
    return e.scheme && (t += e.scheme + ":"), t += "//", e.auth && (t += e.auth + "@"), e.host && (t += e.host), e.port && (t += ":" + e.port), e.path && (t += e.path), t;
  }
  __name(Ue, "Ue");
  K.urlGenerate = Ue;
  var Ss = 32;
  function Cs(e) {
    var t = [];
    return function(r) {
      for (var n = 0; n < t.length; n++) if (t[n].input === r) {
        var o = t[0];
        return t[0] = t[n], t[n] = o, t[0].result;
      }
      var i = e(r);
      return t.unshift({ input: r, result: i }), t.length > Ss && t.pop(), i;
    };
  }
  __name(Cs, "Cs");
  var dr = Cs(function(t) {
    var r = t, n = ot(t);
    if (n) {
      if (!n.path) return t;
      r = n.path;
    }
    for (var o = K.isAbsolute(r), i = [], s = 0, u = 0; ; ) if (s = u, u = r.indexOf("/", s), u === -1) {
      i.push(r.slice(s));
      break;
    } else for (i.push(r.slice(s, u)); u < r.length && r[u] === "/"; ) u++;
    for (var c, a = 0, u = i.length - 1; u >= 0; u--) c = i[u], c === "." ? i.splice(u, 1) : c === ".." ? a++ : a > 0 && (c === "" ? (i.splice(u + 1, a), a = 0) : (i.splice(u, 2), a--));
    return r = i.join("/"), r === "" && (r = o ? "/" : "."), n ? (n.path = r, Ue(n)) : r;
  });
  K.normalize = dr;
  function ii(e, t) {
    e === "" && (e = "."), t === "" && (t = ".");
    var r = ot(t), n = ot(e);
    if (n && (e = n.path || "/"), r && !r.scheme) return n && (r.scheme = n.scheme), Ue(r);
    if (r || t.match(vs)) return t;
    if (n && !n.host && !n.path) return n.host = t, Ue(n);
    var o = t.charAt(0) === "/" ? t : dr(e.replace(/\/+$/, "") + "/" + t);
    return n ? (n.path = o, Ue(n)) : o;
  }
  __name(ii, "ii");
  K.join = ii;
  K.isAbsolute = function(e) {
    return e.charAt(0) === "/" || oi.test(e);
  };
  function As(e, t) {
    e === "" && (e = "."), e = e.replace(/\/$/, "");
    for (var r = 0; t.indexOf(e + "/") !== 0; ) {
      var n = e.lastIndexOf("/");
      if (n < 0 || (e = e.slice(0, n), e.match(/^([^\/]+:\/)?\/*$/))) return t;
      ++r;
    }
    return Array(r + 1).join("../") + t.substr(e.length + 1);
  }
  __name(As, "As");
  K.relative = As;
  var ai = (function() {
    var e = /* @__PURE__ */ Object.create(null);
    return !("__proto__" in e);
  })();
  function si(e) {
    return e;
  }
  __name(si, "si");
  function Ts(e) {
    return li(e) ? "$" + e : e;
  }
  __name(Ts, "Ts");
  K.toSetString = ai ? si : Ts;
  function Es(e) {
    return li(e) ? e.slice(1) : e;
  }
  __name(Es, "Es");
  K.fromSetString = ai ? si : Es;
  function li(e) {
    if (!e) return false;
    var t = e.length;
    if (t < 9 || e.charCodeAt(t - 1) !== 95 || e.charCodeAt(t - 2) !== 95 || e.charCodeAt(t - 3) !== 111 || e.charCodeAt(t - 4) !== 116 || e.charCodeAt(t - 5) !== 111 || e.charCodeAt(t - 6) !== 114 || e.charCodeAt(t - 7) !== 112 || e.charCodeAt(t - 8) !== 95 || e.charCodeAt(t - 9) !== 95) return false;
    for (var r = t - 10; r >= 0; r--) if (e.charCodeAt(r) !== 36) return false;
    return true;
  }
  __name(li, "li");
  function Ls(e, t, r) {
    var n = be(e.source, t.source);
    return n !== 0 || (n = e.originalLine - t.originalLine, n !== 0) || (n = e.originalColumn - t.originalColumn, n !== 0 || r) || (n = e.generatedColumn - t.generatedColumn, n !== 0) || (n = e.generatedLine - t.generatedLine, n !== 0) ? n : be(e.name, t.name);
  }
  __name(Ls, "Ls");
  K.compareByOriginalPositions = Ls;
  function Ps(e, t, r) {
    var n;
    return n = e.originalLine - t.originalLine, n !== 0 || (n = e.originalColumn - t.originalColumn, n !== 0 || r) || (n = e.generatedColumn - t.generatedColumn, n !== 0) || (n = e.generatedLine - t.generatedLine, n !== 0) ? n : be(e.name, t.name);
  }
  __name(Ps, "Ps");
  K.compareByOriginalPositionsNoSource = Ps;
  function Is(e, t, r) {
    var n = e.generatedLine - t.generatedLine;
    return n !== 0 || (n = e.generatedColumn - t.generatedColumn, n !== 0 || r) || (n = be(e.source, t.source), n !== 0) || (n = e.originalLine - t.originalLine, n !== 0) || (n = e.originalColumn - t.originalColumn, n !== 0) ? n : be(e.name, t.name);
  }
  __name(Is, "Is");
  K.compareByGeneratedPositionsDeflated = Is;
  function Ds(e, t, r) {
    var n = e.generatedColumn - t.generatedColumn;
    return n !== 0 || r || (n = be(e.source, t.source), n !== 0) || (n = e.originalLine - t.originalLine, n !== 0) || (n = e.originalColumn - t.originalColumn, n !== 0) ? n : be(e.name, t.name);
  }
  __name(Ds, "Ds");
  K.compareByGeneratedPositionsDeflatedNoLine = Ds;
  function be(e, t) {
    return e === t ? 0 : e === null ? 1 : t === null ? -1 : e > t ? 1 : -1;
  }
  __name(be, "be");
  function Os(e, t) {
    var r = e.generatedLine - t.generatedLine;
    return r !== 0 || (r = e.generatedColumn - t.generatedColumn, r !== 0) || (r = be(e.source, t.source), r !== 0) || (r = e.originalLine - t.originalLine, r !== 0) || (r = e.originalColumn - t.originalColumn, r !== 0) ? r : be(e.name, t.name);
  }
  __name(Os, "Os");
  K.compareByGeneratedPositionsInflated = Os;
  function Ns(e) {
    return JSON.parse(e.replace(/^\)]}'[^\n]*\n/, ""));
  }
  __name(Ns, "Ns");
  K.parseSourceMapInput = Ns;
  function zs(e, t, r) {
    if (t = t || "", e && (e[e.length - 1] !== "/" && t[0] !== "/" && (e += "/"), t = e + t), r) {
      var n = ot(r);
      if (!n) throw new Error("sourceMapURL could not be parsed");
      if (n.path) {
        var o = n.path.lastIndexOf("/");
        o >= 0 && (n.path = n.path.substring(0, o + 1));
      }
      t = ii(Ue(n), t);
    }
    return dr(t);
  }
  __name(zs, "zs");
  K.computeSourceURL = zs;
});
var ui = Oe((ci) => {
  var gr = Lt(), br = Object.prototype.hasOwnProperty, Le = typeof Map < "u";
  function xe() {
    this._array = [], this._set = Le ? /* @__PURE__ */ new Map() : /* @__PURE__ */ Object.create(null);
  }
  __name(xe, "xe");
  xe.fromArray = function(t, r) {
    for (var n = new xe(), o = 0, i = t.length; o < i; o++) n.add(t[o], r);
    return n;
  };
  xe.prototype.size = function() {
    return Le ? this._set.size : Object.getOwnPropertyNames(this._set).length;
  };
  xe.prototype.add = function(t, r) {
    var n = Le ? t : gr.toSetString(t), o = Le ? this.has(t) : br.call(this._set, n), i = this._array.length;
    (!o || r) && this._array.push(t), o || (Le ? this._set.set(t, i) : this._set[n] = i);
  };
  xe.prototype.has = function(t) {
    if (Le) return this._set.has(t);
    var r = gr.toSetString(t);
    return br.call(this._set, r);
  };
  xe.prototype.indexOf = function(t) {
    if (Le) {
      var r = this._set.get(t);
      if (r >= 0) return r;
    } else {
      var n = gr.toSetString(t);
      if (br.call(this._set, n)) return this._set[n];
    }
    throw new Error('"' + t + '" is not in the set.');
  };
  xe.prototype.at = function(t) {
    if (t >= 0 && t < this._array.length) return this._array[t];
    throw new Error("No element indexed by " + t);
  };
  xe.prototype.toArray = function() {
    return this._array.slice();
  };
  ci.ArraySet = xe;
});
var mi = Oe((hi) => {
  var pi = Lt();
  function Ms(e, t) {
    var r = e.generatedLine, n = t.generatedLine, o = e.generatedColumn, i = t.generatedColumn;
    return n > r || n == r && i >= o || pi.compareByGeneratedPositionsInflated(e, t) <= 0;
  }
  __name(Ms, "Ms");
  function Pt() {
    this._array = [], this._sorted = true, this._last = { generatedLine: -1, generatedColumn: 0 };
  }
  __name(Pt, "Pt");
  Pt.prototype.unsortedForEach = function(t, r) {
    this._array.forEach(t, r);
  };
  Pt.prototype.add = function(t) {
    Ms(this._last, t) ? (this._last = t, this._array.push(t)) : (this._sorted = false, this._array.push(t));
  };
  Pt.prototype.toArray = function() {
    return this._sorted || (this._array.sort(pi.compareByGeneratedPositionsInflated), this._sorted = true), this._array;
  };
  hi.MappingList = Pt;
});
var di = Oe((fi) => {
  var it = ni(), H = Lt(), It = ui().ArraySet, Rs = mi().MappingList;
  function oe(e) {
    e || (e = {}), this._file = H.getArg(e, "file", null), this._sourceRoot = H.getArg(e, "sourceRoot", null), this._skipValidation = H.getArg(e, "skipValidation", false), this._sources = new It(), this._names = new It(), this._mappings = new Rs(), this._sourcesContents = null;
  }
  __name(oe, "oe");
  oe.prototype._version = 3;
  oe.fromSourceMap = function(t) {
    var r = t.sourceRoot, n = new oe({ file: t.file, sourceRoot: r });
    return t.eachMapping(function(o) {
      var i = { generated: { line: o.generatedLine, column: o.generatedColumn } };
      o.source != null && (i.source = o.source, r != null && (i.source = H.relative(r, i.source)), i.original = { line: o.originalLine, column: o.originalColumn }, o.name != null && (i.name = o.name)), n.addMapping(i);
    }), t.sources.forEach(function(o) {
      var i = o;
      r !== null && (i = H.relative(r, o)), n._sources.has(i) || n._sources.add(i);
      var s = t.sourceContentFor(o);
      s != null && n.setSourceContent(o, s);
    }), n;
  };
  oe.prototype.addMapping = function(t) {
    var r = H.getArg(t, "generated"), n = H.getArg(t, "original", null), o = H.getArg(t, "source", null), i = H.getArg(t, "name", null);
    this._skipValidation || this._validateMapping(r, n, o, i), o != null && (o = String(o), this._sources.has(o) || this._sources.add(o)), i != null && (i = String(i), this._names.has(i) || this._names.add(i)), this._mappings.add({ generatedLine: r.line, generatedColumn: r.column, originalLine: n != null && n.line, originalColumn: n != null && n.column, source: o, name: i });
  };
  oe.prototype.setSourceContent = function(t, r) {
    var n = t;
    this._sourceRoot != null && (n = H.relative(this._sourceRoot, n)), r != null ? (this._sourcesContents || (this._sourcesContents = /* @__PURE__ */ Object.create(null)), this._sourcesContents[H.toSetString(n)] = r) : this._sourcesContents && (delete this._sourcesContents[H.toSetString(n)], Object.keys(this._sourcesContents).length === 0 && (this._sourcesContents = null));
  };
  oe.prototype.applySourceMap = function(t, r, n) {
    var o = r;
    if (r == null) {
      if (t.file == null) throw new Error(`SourceMapGenerator.prototype.applySourceMap requires either an explicit source file, or the source map's "file" property. Both were omitted.`);
      o = t.file;
    }
    var i = this._sourceRoot;
    i != null && (o = H.relative(i, o));
    var s = new It(), u = new It();
    this._mappings.unsortedForEach(function(c) {
      if (c.source === o && c.originalLine != null) {
        var a = t.originalPositionFor({ line: c.originalLine, column: c.originalColumn });
        a.source != null && (c.source = a.source, n != null && (c.source = H.join(n, c.source)), i != null && (c.source = H.relative(i, c.source)), c.originalLine = a.line, c.originalColumn = a.column, a.name != null && (c.name = a.name));
      }
      var l = c.source;
      l != null && !s.has(l) && s.add(l);
      var p = c.name;
      p != null && !u.has(p) && u.add(p);
    }, this), this._sources = s, this._names = u, t.sources.forEach(function(c) {
      var a = t.sourceContentFor(c);
      a != null && (n != null && (c = H.join(n, c)), i != null && (c = H.relative(i, c)), this.setSourceContent(c, a));
    }, this);
  };
  oe.prototype._validateMapping = function(t, r, n, o) {
    if (r && typeof r.line != "number" && typeof r.column != "number") throw new Error("original.line and original.column are not numbers -- you probably meant to omit the original mapping entirely and only map the generated position. If so, pass null for the original mapping instead of an object with empty or null values.");
    if (!(t && "line" in t && "column" in t && t.line > 0 && t.column >= 0 && !r && !n && !o)) {
      if (t && "line" in t && "column" in t && r && "line" in r && "column" in r && t.line > 0 && t.column >= 0 && r.line > 0 && r.column >= 0 && n) return;
      throw new Error("Invalid mapping: " + JSON.stringify({ generated: t, source: n, original: r, name: o }));
    }
  };
  oe.prototype._serializeMappings = function() {
    for (var t = 0, r = 1, n = 0, o = 0, i = 0, s = 0, u = "", c, a, l, p, m = this._mappings.toArray(), f = 0, P = m.length; f < P; f++) {
      if (a = m[f], c = "", a.generatedLine !== r) for (t = 0; a.generatedLine !== r; ) c += ";", r++;
      else if (f > 0) {
        if (!H.compareByGeneratedPositionsInflated(a, m[f - 1])) continue;
        c += ",";
      }
      c += it.encode(a.generatedColumn - t), t = a.generatedColumn, a.source != null && (p = this._sources.indexOf(a.source), c += it.encode(p - s), s = p, c += it.encode(a.originalLine - 1 - o), o = a.originalLine - 1, c += it.encode(a.originalColumn - n), n = a.originalColumn, a.name != null && (l = this._names.indexOf(a.name), c += it.encode(l - i), i = l)), u += c;
    }
    return u;
  };
  oe.prototype._generateSourcesContent = function(t, r) {
    return t.map(function(n) {
      if (!this._sourcesContents) return null;
      r != null && (n = H.relative(r, n));
      var o = H.toSetString(n);
      return Object.prototype.hasOwnProperty.call(this._sourcesContents, o) ? this._sourcesContents[o] : null;
    }, this);
  };
  oe.prototype.toJSON = function() {
    var t = { version: this._version, sources: this._sources.toArray(), names: this._names.toArray(), mappings: this._serializeMappings() };
    return this._file != null && (t.file = this._file), this._sourceRoot != null && (t.sourceRoot = this._sourceRoot), this._sourcesContents && (t.sourcesContent = this._generateSourcesContent(t.sources, t.sourceRoot)), t;
  };
  oe.prototype.toString = function() {
    return JSON.stringify(this.toJSON());
  };
  fi.SourceMapGenerator = oe;
});
var Ze = {};
b(Ze, { AtKeyword: /* @__PURE__ */ __name(() => D, "AtKeyword"), BadString: /* @__PURE__ */ __name(() => Ae, "BadString"), BadUrl: /* @__PURE__ */ __name(() => Y, "BadUrl"), CDC: /* @__PURE__ */ __name(() => j, "CDC"), CDO: /* @__PURE__ */ __name(() => ue, "CDO"), Colon: /* @__PURE__ */ __name(() => O, "Colon"), Comma: /* @__PURE__ */ __name(() => G, "Comma"), Comment: /* @__PURE__ */ __name(() => E, "Comment"), Delim: /* @__PURE__ */ __name(() => g2, "Delim"), Dimension: /* @__PURE__ */ __name(() => y, "Dimension"), EOF: /* @__PURE__ */ __name(() => $e, "EOF"), Function: /* @__PURE__ */ __name(() => x, "Function"), Hash: /* @__PURE__ */ __name(() => v, "Hash"), Ident: /* @__PURE__ */ __name(() => h, "Ident"), LeftCurlyBracket: /* @__PURE__ */ __name(() => M, "LeftCurlyBracket"), LeftParenthesis: /* @__PURE__ */ __name(() => T, "LeftParenthesis"), LeftSquareBracket: /* @__PURE__ */ __name(() => U, "LeftSquareBracket"), Number: /* @__PURE__ */ __name(() => d, "Number"), Percentage: /* @__PURE__ */ __name(() => A, "Percentage"), RightCurlyBracket: /* @__PURE__ */ __name(() => W, "RightCurlyBracket"), RightParenthesis: /* @__PURE__ */ __name(() => w, "RightParenthesis"), RightSquareBracket: /* @__PURE__ */ __name(() => V, "RightSquareBracket"), Semicolon: /* @__PURE__ */ __name(() => _, "Semicolon"), String: /* @__PURE__ */ __name(() => q, "String"), Url: /* @__PURE__ */ __name(() => F, "Url"), WhiteSpace: /* @__PURE__ */ __name(() => k, "WhiteSpace") });
var $e = 0;
var h = 1;
var x = 2;
var D = 3;
var v = 4;
var q = 5;
var Ae = 6;
var F = 7;
var Y = 8;
var g2 = 9;
var d = 10;
var A = 11;
var y = 12;
var k = 13;
var ue = 14;
var j = 15;
var O = 16;
var _ = 17;
var G = 18;
var U = 19;
var V = 20;
var T = 21;
var w = 22;
var M = 23;
var W = 24;
var E = 25;
function B(e) {
  return e >= 48 && e <= 57;
}
__name(B, "B");
function ee(e) {
  return B(e) || e >= 65 && e <= 70 || e >= 97 && e <= 102;
}
__name(ee, "ee");
function kt(e) {
  return e >= 65 && e <= 90;
}
__name(kt, "kt");
function ls(e) {
  return e >= 97 && e <= 122;
}
__name(ls, "ls");
function cs(e) {
  return kt(e) || ls(e);
}
__name(cs, "cs");
function us(e) {
  return e >= 128;
}
__name(us, "us");
function yt(e) {
  return cs(e) || us(e) || e === 95;
}
__name(yt, "yt");
function Ne(e) {
  return yt(e) || B(e) || e === 45;
}
__name(Ne, "Ne");
function ps(e) {
  return e >= 0 && e <= 8 || e === 11 || e >= 14 && e <= 31 || e === 127;
}
__name(ps, "ps");
function Je(e) {
  return e === 10 || e === 13 || e === 12;
}
__name(Je, "Je");
function pe(e) {
  return Je(e) || e === 32 || e === 9;
}
__name(pe, "pe");
function $(e, t) {
  return !(e !== 92 || Je(t) || t === 0);
}
__name($, "$");
function ze(e, t, r) {
  return e === 45 ? yt(t) || t === 45 || $(t, r) : yt(e) ? true : e === 92 ? $(e, t) : false;
}
__name(ze, "ze");
function wt(e, t, r) {
  return e === 43 || e === 45 ? B(t) ? 2 : t === 46 && B(r) ? 3 : 0 : e === 46 ? B(t) ? 2 : 0 : B(e) ? 1 : 0;
}
__name(wt, "wt");
function vt(e) {
  return e === 65279 || e === 65534 ? 1 : 0;
}
__name(vt, "vt");
var or = new Array(128);
var hs = 128;
var et = 130;
var ir = 131;
var St = 132;
var ar = 133;
for (let e = 0; e < or.length; e++) or[e] = pe(e) && et || B(e) && ir || yt(e) && St || ps(e) && ar || e || hs;
function Ct(e) {
  return e < 128 ? or[e] : St;
}
__name(Ct, "Ct");
function Me(e, t) {
  return t < e.length ? e.charCodeAt(t) : 0;
}
__name(Me, "Me");
function At(e, t, r) {
  return r === 13 && Me(e, t + 1) === 10 ? 2 : 1;
}
__name(At, "At");
function de(e, t, r) {
  let n = e.charCodeAt(t);
  return kt(n) && (n = n | 32), n === r;
}
__name(de, "de");
function ge(e, t, r, n) {
  if (r - t !== n.length || t < 0 || r > e.length) return false;
  for (let o = t; o < r; o++) {
    let i = n.charCodeAt(o - t), s = e.charCodeAt(o);
    if (kt(s) && (s = s | 32), s !== i) return false;
  }
  return true;
}
__name(ge, "ge");
function _o(e, t) {
  for (; t >= 0 && pe(e.charCodeAt(t)); t--) ;
  return t + 1;
}
__name(_o, "_o");
function tt(e, t) {
  for (; t < e.length && pe(e.charCodeAt(t)); t++) ;
  return t;
}
__name(tt, "tt");
function sr(e, t) {
  for (; t < e.length && B(e.charCodeAt(t)); t++) ;
  return t;
}
__name(sr, "sr");
function se(e, t) {
  if (t += 2, ee(Me(e, t - 1))) {
    for (let n = Math.min(e.length, t + 5); t < n && ee(Me(e, t)); t++) ;
    let r = Me(e, t);
    pe(r) && (t += At(e, t, r));
  }
  return t;
}
__name(se, "se");
function rt(e, t) {
  for (; t < e.length; t++) {
    let r = e.charCodeAt(t);
    if (!Ne(r)) {
      if ($(r, Me(e, t + 1))) {
        t = se(e, t) - 1;
        continue;
      }
      break;
    }
  }
  return t;
}
__name(rt, "rt");
function Te(e, t) {
  let r = e.charCodeAt(t);
  if ((r === 43 || r === 45) && (r = e.charCodeAt(t += 1)), B(r) && (t = sr(e, t + 1), r = e.charCodeAt(t)), r === 46 && B(e.charCodeAt(t + 1)) && (t += 2, t = sr(e, t)), de(e, t, 101)) {
    let n = 0;
    r = e.charCodeAt(t + 1), (r === 45 || r === 43) && (n = 1, r = e.charCodeAt(t + 2)), B(r) && (t = sr(e, t + 1 + n + 1));
  }
  return t;
}
__name(Te, "Te");
function Tt(e, t) {
  for (; t < e.length; t++) {
    let r = e.charCodeAt(t);
    if (r === 41) {
      t++;
      break;
    }
    $(r, Me(e, t + 1)) && (t = se(e, t));
  }
  return t;
}
__name(Tt, "Tt");
function Re(e) {
  if (e.length === 1 && !ee(e.charCodeAt(0))) return e[0];
  let t = parseInt(e, 16);
  return (t === 0 || t >= 55296 && t <= 57343 || t > 1114111) && (t = 65533), String.fromCodePoint(t);
}
__name(Re, "Re");
var Fe = ["EOF-token", "ident-token", "function-token", "at-keyword-token", "hash-token", "string-token", "bad-string-token", "url-token", "bad-url-token", "delim-token", "number-token", "percentage-token", "dimension-token", "whitespace-token", "CDO-token", "CDC-token", "colon-token", "semicolon-token", "comma-token", "[-token", "]-token", "(-token", ")-token", "{-token", "}-token"];
function Be(e = null, t) {
  return e === null || e.length < t ? new Uint32Array(Math.max(t + 1024, 16384)) : e;
}
__name(Be, "Be");
var Uo = 10;
var ms = 12;
var jo = 13;
function Ho(e) {
  let t = e.source, r = t.length, n = t.length > 0 ? vt(t.charCodeAt(0)) : 0, o = Be(e.lines, r), i = Be(e.columns, r), s = e.startLine, u = e.startColumn;
  for (let c = n; c < r; c++) {
    let a = t.charCodeAt(c);
    o[c] = s, i[c] = u++, (a === Uo || a === jo || a === ms) && (a === jo && c + 1 < r && t.charCodeAt(c + 1) === Uo && (c++, o[c] = s, i[c] = u), s++, u = 1);
  }
  o[r] = s, i[r] = u, e.lines = o, e.columns = i, e.computed = true;
}
__name(Ho, "Ho");
var Et = class {
  static {
    __name(this, "Et");
  }
  constructor() {
    this.lines = null, this.columns = null, this.computed = false;
  }
  setSource(t, r = 0, n = 1, o = 1) {
    this.source = t, this.startOffset = r, this.startLine = n, this.startColumn = o, this.computed = false;
  }
  getLocation(t, r) {
    return this.computed || Ho(this), { source: r, offset: this.startOffset + t, line: this.lines[t], column: this.columns[t] };
  }
  getLocationRange(t, r, n) {
    return this.computed || Ho(this), { source: n, start: { offset: this.startOffset + t, line: this.lines[t], column: this.columns[t] }, end: { offset: this.startOffset + r, line: this.lines[r], column: this.columns[r] } };
  }
};
var ne = 16777215;
var we = 24;
var fs = /* @__PURE__ */ new Map([[2, 22], [21, 22], [19, 20], [23, 24]]);
var nt = class {
  static {
    __name(this, "nt");
  }
  constructor(t, r) {
    this.setSource(t, r);
  }
  reset() {
    this.eof = false, this.tokenIndex = -1, this.tokenType = 0, this.tokenStart = this.firstCharOffset, this.tokenEnd = this.firstCharOffset;
  }
  setSource(t = "", r = () => {
  }) {
    t = String(t || "");
    let n = t.length, o = Be(this.offsetAndType, t.length + 1), i = Be(this.balance, t.length + 1), s = 0, u = 0, c = 0, a = -1;
    for (this.offsetAndType = null, this.balance = null, r(t, (l, p, m) => {
      switch (l) {
        default:
          i[s] = n;
          break;
        case u: {
          let f = c & ne;
          for (c = i[f], u = c >> we, i[s] = f, i[f++] = s; f < s; f++) i[f] === n && (i[f] = s);
          break;
        }
        case 21:
        case 2:
        case 19:
        case 23:
          i[s] = c, u = fs.get(l), c = u << we | s;
          break;
      }
      o[s++] = l << we | m, a === -1 && (a = p);
    }), o[s] = 0 << we | n, i[s] = n, i[n] = n; c !== 0; ) {
      let l = c & ne;
      c = i[l], i[l] = n;
    }
    this.source = t, this.firstCharOffset = a === -1 ? 0 : a, this.tokenCount = s, this.offsetAndType = o, this.balance = i, this.reset(), this.next();
  }
  lookupType(t) {
    return t += this.tokenIndex, t < this.tokenCount ? this.offsetAndType[t] >> we : 0;
  }
  lookupOffset(t) {
    return t += this.tokenIndex, t < this.tokenCount ? this.offsetAndType[t - 1] & ne : this.source.length;
  }
  lookupValue(t, r) {
    return t += this.tokenIndex, t < this.tokenCount ? ge(this.source, this.offsetAndType[t - 1] & ne, this.offsetAndType[t] & ne, r) : false;
  }
  getTokenStart(t) {
    return t === this.tokenIndex ? this.tokenStart : t > 0 ? t < this.tokenCount ? this.offsetAndType[t - 1] & ne : this.offsetAndType[this.tokenCount] & ne : this.firstCharOffset;
  }
  substrToCursor(t) {
    return this.source.substring(t, this.tokenStart);
  }
  isBalanceEdge(t) {
    return this.balance[this.tokenIndex] < t;
  }
  isDelim(t, r) {
    return r ? this.lookupType(r) === 9 && this.source.charCodeAt(this.lookupOffset(r)) === t : this.tokenType === 9 && this.source.charCodeAt(this.tokenStart) === t;
  }
  skip(t) {
    let r = this.tokenIndex + t;
    r < this.tokenCount ? (this.tokenIndex = r, this.tokenStart = this.offsetAndType[r - 1] & ne, r = this.offsetAndType[r], this.tokenType = r >> we, this.tokenEnd = r & ne) : (this.tokenIndex = this.tokenCount, this.next());
  }
  next() {
    let t = this.tokenIndex + 1;
    t < this.tokenCount ? (this.tokenIndex = t, this.tokenStart = this.tokenEnd, t = this.offsetAndType[t], this.tokenType = t >> we, this.tokenEnd = t & ne) : (this.eof = true, this.tokenIndex = this.tokenCount, this.tokenType = 0, this.tokenStart = this.tokenEnd = this.source.length);
  }
  skipSC() {
    for (; this.tokenType === 13 || this.tokenType === 25; ) this.next();
  }
  skipUntilBalanced(t, r) {
    let n = t, o, i;
    e: for (; n < this.tokenCount; n++) {
      if (o = this.balance[n], o < t) break e;
      switch (i = n > 0 ? this.offsetAndType[n - 1] & ne : this.firstCharOffset, r(this.source.charCodeAt(i))) {
        case 1:
          break e;
        case 2:
          n++;
          break e;
        default:
          this.balance[o] === n && (n = o);
      }
    }
    this.skip(n - this.tokenIndex);
  }
  forEachToken(t) {
    for (let r = 0, n = this.firstCharOffset; r < this.tokenCount; r++) {
      let o = n, i = this.offsetAndType[r], s = i & ne, u = i >> we;
      n = s, t(u, o, s, r);
    }
  }
  dump() {
    let t = new Array(this.tokenCount);
    return this.forEachToken((r, n, o, i) => {
      t[i] = { idx: i, type: Fe[r], chunk: this.source.substring(n, o), balance: this.balance[i] };
    }), t;
  }
};
function ve(e, t) {
  function r(p) {
    return p < u ? e.charCodeAt(p) : 0;
  }
  __name(r, "r");
  function n() {
    if (a = Te(e, a), ze(r(a), r(a + 1), r(a + 2))) {
      l = 12, a = rt(e, a);
      return;
    }
    if (r(a) === 37) {
      l = 11, a++;
      return;
    }
    l = 10;
  }
  __name(n, "n");
  function o() {
    let p = a;
    if (a = rt(e, a), ge(e, p, a, "url") && r(a) === 40) {
      if (a = tt(e, a + 1), r(a) === 34 || r(a) === 39) {
        l = 2, a = p + 4;
        return;
      }
      s();
      return;
    }
    if (r(a) === 40) {
      l = 2, a++;
      return;
    }
    l = 1;
  }
  __name(o, "o");
  function i(p) {
    for (p || (p = r(a++)), l = 5; a < e.length; a++) {
      let m = e.charCodeAt(a);
      switch (Ct(m)) {
        case p:
          a++;
          return;
        case et:
          if (Je(m)) {
            a += At(e, a, m), l = 6;
            return;
          }
          break;
        case 92:
          if (a === e.length - 1) break;
          let f = r(a + 1);
          Je(f) ? a += At(e, a + 1, f) : $(m, f) && (a = se(e, a) - 1);
          break;
      }
    }
  }
  __name(i, "i");
  function s() {
    for (l = 7, a = tt(e, a); a < e.length; a++) {
      let p = e.charCodeAt(a);
      switch (Ct(p)) {
        case 41:
          a++;
          return;
        case et:
          if (a = tt(e, a), r(a) === 41 || a >= e.length) {
            a < e.length && a++;
            return;
          }
          a = Tt(e, a), l = 8;
          return;
        case 34:
        case 39:
        case 40:
        case ar:
          a = Tt(e, a), l = 8;
          return;
        case 92:
          if ($(p, r(a + 1))) {
            a = se(e, a) - 1;
            break;
          }
          a = Tt(e, a), l = 8;
          return;
      }
    }
  }
  __name(s, "s");
  e = String(e || "");
  let u = e.length, c = vt(r(0)), a = c, l;
  for (; a < u; ) {
    let p = e.charCodeAt(a);
    switch (Ct(p)) {
      case et:
        l = 13, a = tt(e, a + 1);
        break;
      case 34:
        i();
        break;
      case 35:
        Ne(r(a + 1)) || $(r(a + 1), r(a + 2)) ? (l = 4, a = rt(e, a + 1)) : (l = 9, a++);
        break;
      case 39:
        i();
        break;
      case 40:
        l = 21, a++;
        break;
      case 41:
        l = 22, a++;
        break;
      case 43:
        wt(p, r(a + 1), r(a + 2)) ? n() : (l = 9, a++);
        break;
      case 44:
        l = 18, a++;
        break;
      case 45:
        wt(p, r(a + 1), r(a + 2)) ? n() : r(a + 1) === 45 && r(a + 2) === 62 ? (l = 15, a = a + 3) : ze(p, r(a + 1), r(a + 2)) ? o() : (l = 9, a++);
        break;
      case 46:
        wt(p, r(a + 1), r(a + 2)) ? n() : (l = 9, a++);
        break;
      case 47:
        r(a + 1) === 42 ? (l = 25, a = e.indexOf("*/", a + 2), a = a === -1 ? e.length : a + 2) : (l = 9, a++);
        break;
      case 58:
        l = 16, a++;
        break;
      case 59:
        l = 17, a++;
        break;
      case 60:
        r(a + 1) === 33 && r(a + 2) === 45 && r(a + 3) === 45 ? (l = 14, a = a + 4) : (l = 9, a++);
        break;
      case 64:
        ze(r(a + 1), r(a + 2), r(a + 3)) ? (l = 3, a = rt(e, a + 1)) : (l = 9, a++);
        break;
      case 91:
        l = 19, a++;
        break;
      case 92:
        $(p, r(a + 1)) ? o() : (l = 9, a++);
        break;
      case 93:
        l = 20, a++;
        break;
      case 123:
        l = 23, a++;
        break;
      case 125:
        l = 24, a++;
        break;
      case ir:
        n();
        break;
      case St:
        o();
        break;
      default:
        l = 9, a++;
    }
    t(l, c, c = a);
  }
}
__name(ve, "ve");
var _e = null;
var I = class {
  static {
    __name(this, "I");
  }
  static createItem(t) {
    return { prev: null, next: null, data: t };
  }
  constructor() {
    this.head = null, this.tail = null, this.cursor = null;
  }
  createItem(t) {
    return I.createItem(t);
  }
  allocateCursor(t, r) {
    let n;
    return _e !== null ? (n = _e, _e = _e.cursor, n.prev = t, n.next = r, n.cursor = this.cursor) : n = { prev: t, next: r, cursor: this.cursor }, this.cursor = n, n;
  }
  releaseCursor() {
    let { cursor: t } = this;
    this.cursor = t.cursor, t.prev = null, t.next = null, t.cursor = _e, _e = t;
  }
  updateCursors(t, r, n, o) {
    let { cursor: i } = this;
    for (; i !== null; ) i.prev === t && (i.prev = r), i.next === n && (i.next = o), i = i.cursor;
  }
  *[Symbol.iterator]() {
    for (let t = this.head; t !== null; t = t.next) yield t.data;
  }
  get size() {
    let t = 0;
    for (let r = this.head; r !== null; r = r.next) t++;
    return t;
  }
  get isEmpty() {
    return this.head === null;
  }
  get first() {
    return this.head && this.head.data;
  }
  get last() {
    return this.tail && this.tail.data;
  }
  fromArray(t) {
    let r = null;
    this.head = null;
    for (let n of t) {
      let o = I.createItem(n);
      r !== null ? r.next = o : this.head = o, o.prev = r, r = o;
    }
    return this.tail = r, this;
  }
  toArray() {
    return [...this];
  }
  toJSON() {
    return [...this];
  }
  forEach(t, r = this) {
    let n = this.allocateCursor(null, this.head);
    for (; n.next !== null; ) {
      let o = n.next;
      n.next = o.next, t.call(r, o.data, o, this);
    }
    this.releaseCursor();
  }
  forEachRight(t, r = this) {
    let n = this.allocateCursor(this.tail, null);
    for (; n.prev !== null; ) {
      let o = n.prev;
      n.prev = o.prev, t.call(r, o.data, o, this);
    }
    this.releaseCursor();
  }
  reduce(t, r, n = this) {
    let o = this.allocateCursor(null, this.head), i = r, s;
    for (; o.next !== null; ) s = o.next, o.next = s.next, i = t.call(n, i, s.data, s, this);
    return this.releaseCursor(), i;
  }
  reduceRight(t, r, n = this) {
    let o = this.allocateCursor(this.tail, null), i = r, s;
    for (; o.prev !== null; ) s = o.prev, o.prev = s.prev, i = t.call(n, i, s.data, s, this);
    return this.releaseCursor(), i;
  }
  some(t, r = this) {
    for (let n = this.head; n !== null; n = n.next) if (t.call(r, n.data, n, this)) return true;
    return false;
  }
  map(t, r = this) {
    let n = new I();
    for (let o = this.head; o !== null; o = o.next) n.appendData(t.call(r, o.data, o, this));
    return n;
  }
  filter(t, r = this) {
    let n = new I();
    for (let o = this.head; o !== null; o = o.next) t.call(r, o.data, o, this) && n.appendData(o.data);
    return n;
  }
  nextUntil(t, r, n = this) {
    if (t === null) return;
    let o = this.allocateCursor(null, t);
    for (; o.next !== null; ) {
      let i = o.next;
      if (o.next = i.next, r.call(n, i.data, i, this)) break;
    }
    this.releaseCursor();
  }
  prevUntil(t, r, n = this) {
    if (t === null) return;
    let o = this.allocateCursor(t, null);
    for (; o.prev !== null; ) {
      let i = o.prev;
      if (o.prev = i.prev, r.call(n, i.data, i, this)) break;
    }
    this.releaseCursor();
  }
  clear() {
    this.head = null, this.tail = null;
  }
  copy() {
    let t = new I();
    for (let r of this) t.appendData(r);
    return t;
  }
  prepend(t) {
    return this.updateCursors(null, t, this.head, t), this.head !== null ? (this.head.prev = t, t.next = this.head) : this.tail = t, this.head = t, this;
  }
  prependData(t) {
    return this.prepend(I.createItem(t));
  }
  append(t) {
    return this.insert(t);
  }
  appendData(t) {
    return this.insert(I.createItem(t));
  }
  insert(t, r = null) {
    if (r !== null) if (this.updateCursors(r.prev, t, r, t), r.prev === null) {
      if (this.head !== r) throw new Error("before doesn't belong to list");
      this.head = t, r.prev = t, t.next = r, this.updateCursors(null, t);
    } else r.prev.next = t, t.prev = r.prev, r.prev = t, t.next = r;
    else this.updateCursors(this.tail, t, null, t), this.tail !== null ? (this.tail.next = t, t.prev = this.tail) : this.head = t, this.tail = t;
    return this;
  }
  insertData(t, r) {
    return this.insert(I.createItem(t), r);
  }
  remove(t) {
    if (this.updateCursors(t, t.prev, t, t.next), t.prev !== null) t.prev.next = t.next;
    else {
      if (this.head !== t) throw new Error("item doesn't belong to list");
      this.head = t.next;
    }
    if (t.next !== null) t.next.prev = t.prev;
    else {
      if (this.tail !== t) throw new Error("item doesn't belong to list");
      this.tail = t.prev;
    }
    return t.prev = null, t.next = null, t;
  }
  push(t) {
    this.insert(I.createItem(t));
  }
  pop() {
    return this.tail !== null ? this.remove(this.tail) : null;
  }
  unshift(t) {
    this.prepend(I.createItem(t));
  }
  shift() {
    return this.head !== null ? this.remove(this.head) : null;
  }
  prependList(t) {
    return this.insertList(t, this.head);
  }
  appendList(t) {
    return this.insertList(t);
  }
  insertList(t, r) {
    return t.head === null ? this : (r != null ? (this.updateCursors(r.prev, t.tail, r, t.head), r.prev !== null ? (r.prev.next = t.head, t.head.prev = r.prev) : this.head = t.head, r.prev = t.tail, t.tail.next = r) : (this.updateCursors(this.tail, t.tail, null, t.head), this.tail !== null ? (this.tail.next = t.head, t.head.prev = this.tail) : this.head = t.head, this.tail = t.tail), t.head = null, t.tail = null, this);
  }
  replace(t, r) {
    "head" in r ? this.insertList(r, t) : this.insert(r, t), this.remove(t);
  }
};
function Ee(e, t) {
  let r = Object.create(SyntaxError.prototype), n = new Error();
  return Object.assign(r, { name: e, message: t, get stack() {
    return (n.stack || "").replace(/^(.+\n){1,3}/, `${e}: ${t}
`);
  } });
}
__name(Ee, "Ee");
var lr = 100;
var qo = 60;
var Wo = "    ";
function Yo({ source: e, line: t, column: r }, n) {
  function o(l, p) {
    return i.slice(l, p).map((m, f) => String(l + f + 1).padStart(c) + " |" + m).join(`
`);
  }
  __name(o, "o");
  let i = e.split(/\r\n?|\n|\f/), s = Math.max(1, t - n) - 1, u = Math.min(t + n, i.length + 1), c = Math.max(4, String(u).length) + 1, a = 0;
  r += (Wo.length - 1) * (i[t - 1].substr(0, r - 1).match(/\t/g) || []).length, r > lr && (a = r - qo + 3, r = qo - 2);
  for (let l = s; l <= u; l++) l >= 0 && l < i.length && (i[l] = i[l].replace(/\t/g, Wo), i[l] = (a > 0 && i[l].length > a ? "\u2026" : "") + i[l].substr(a, lr - 2) + (i[l].length > a + lr - 1 ? "\u2026" : ""));
  return [o(s, t), new Array(r + c + 2).join("-") + "^", o(t, u)].filter(Boolean).join(`
`);
}
__name(Yo, "Yo");
function cr(e, t, r, n, o) {
  return Object.assign(Ee("SyntaxError", e), { source: t, offset: r, line: n, column: o, sourceFragment(s) {
    return Yo({ source: t, line: n, column: o }, isNaN(s) ? 0 : s);
  }, get formattedMessage() {
    return `Parse error: ${e}
` + Yo({ source: t, line: n, column: o }, 2);
  } });
}
__name(cr, "cr");
function Go(e) {
  let t = this.createList(), r = false, n = { recognizer: e };
  for (; !this.eof; ) {
    switch (this.tokenType) {
      case 25:
        this.next();
        continue;
      case 13:
        r = true, this.next();
        continue;
    }
    let o = e.getNode.call(this, n);
    if (o === void 0) break;
    r && (e.onWhiteSpace && e.onWhiteSpace.call(this, o, t, n), r = false), t.push(o);
  }
  return r && e.onWhiteSpace && e.onWhiteSpace.call(this, null, t, n), t;
}
__name(Go, "Go");
var Vo = /* @__PURE__ */ __name(() => {
}, "Vo");
var ds = 33;
var gs = 35;
var ur = 59;
var Ko = 123;
var Qo = 0;
function bs(e) {
  return function() {
    return this[e]();
  };
}
__name(bs, "bs");
function pr(e) {
  let t = /* @__PURE__ */ Object.create(null);
  for (let r in e) {
    let n = e[r], o = n.parse || n;
    o && (t[r] = o);
  }
  return t;
}
__name(pr, "pr");
function xs(e) {
  let t = { context: /* @__PURE__ */ Object.create(null), scope: Object.assign(/* @__PURE__ */ Object.create(null), e.scope), atrule: pr(e.atrule), pseudo: pr(e.pseudo), node: pr(e.node) };
  for (let r in e.parseContext) switch (typeof e.parseContext[r]) {
    case "function":
      t.context[r] = e.parseContext[r];
      break;
    case "string":
      t.context[r] = bs(e.parseContext[r]);
      break;
  }
  return { config: t, ...t, ...t.node };
}
__name(xs, "xs");
function Xo(e) {
  let t = "", r = "<unknown>", n = false, o = Vo, i = false, s = new Et(), u = Object.assign(new nt(), xs(e || {}), { parseAtrulePrelude: true, parseRulePrelude: true, parseValue: true, parseCustomProperty: false, readSequence: Go, consumeUntilBalanceEnd: /* @__PURE__ */ __name(() => 0, "consumeUntilBalanceEnd"), consumeUntilLeftCurlyBracket(a) {
    return a === Ko ? 1 : 0;
  }, consumeUntilLeftCurlyBracketOrSemicolon(a) {
    return a === Ko || a === ur ? 1 : 0;
  }, consumeUntilExclamationMarkOrSemicolon(a) {
    return a === ds || a === ur ? 1 : 0;
  }, consumeUntilSemicolonIncluded(a) {
    return a === ur ? 2 : 0;
  }, createList() {
    return new I();
  }, createSingleNodeList(a) {
    return new I().appendData(a);
  }, getFirstListNode(a) {
    return a && a.first;
  }, getLastListNode(a) {
    return a && a.last;
  }, parseWithFallback(a, l) {
    let p = this.tokenIndex;
    try {
      return a.call(this);
    } catch (m) {
      if (i) throw m;
      let f = l.call(this, p);
      return i = true, o(m, f), i = false, f;
    }
  }, lookupNonWSType(a) {
    let l;
    do
      if (l = this.lookupType(a++), l !== 13) return l;
    while (l !== Qo);
    return Qo;
  }, charCodeAt(a) {
    return a >= 0 && a < t.length ? t.charCodeAt(a) : 0;
  }, substring(a, l) {
    return t.substring(a, l);
  }, substrToCursor(a) {
    return this.source.substring(a, this.tokenStart);
  }, cmpChar(a, l) {
    return de(t, a, l);
  }, cmpStr(a, l, p) {
    return ge(t, a, l, p);
  }, consume(a) {
    let l = this.tokenStart;
    return this.eat(a), this.substrToCursor(l);
  }, consumeFunctionName() {
    let a = t.substring(this.tokenStart, this.tokenEnd - 1);
    return this.eat(2), a;
  }, consumeNumber(a) {
    let l = t.substring(this.tokenStart, Te(t, this.tokenStart));
    return this.eat(a), l;
  }, eat(a) {
    if (this.tokenType !== a) {
      let l = Fe[a].slice(0, -6).replace(/-/g, " ").replace(/^./, (f) => f.toUpperCase()), p = `${/[[\](){}]/.test(l) ? `"${l}"` : l} is expected`, m = this.tokenStart;
      switch (a) {
        case 1:
          this.tokenType === 2 || this.tokenType === 7 ? (m = this.tokenEnd - 1, p = "Identifier is expected but function found") : p = "Identifier is expected";
          break;
        case 4:
          this.isDelim(gs) && (this.next(), m++, p = "Name is expected");
          break;
        case 11:
          this.tokenType === 10 && (m = this.tokenEnd, p = "Percent sign is expected");
          break;
      }
      this.error(p, m);
    }
    this.next();
  }, eatIdent(a) {
    (this.tokenType !== 1 || this.lookupValue(0, a) === false) && this.error(`Identifier "${a}" is expected`), this.next();
  }, eatDelim(a) {
    this.isDelim(a) || this.error(`Delim "${String.fromCharCode(a)}" is expected`), this.next();
  }, getLocation(a, l) {
    return n ? s.getLocationRange(a, l, r) : null;
  }, getLocationFromList(a) {
    if (n) {
      let l = this.getFirstListNode(a), p = this.getLastListNode(a);
      return s.getLocationRange(l !== null ? l.loc.start.offset - s.startOffset : this.tokenStart, p !== null ? p.loc.end.offset - s.startOffset : this.tokenStart, r);
    }
    return null;
  }, error(a, l) {
    let p = typeof l < "u" && l < t.length ? s.getLocation(l) : this.eof ? s.getLocation(_o(t, t.length - 1)) : s.getLocation(this.tokenStart);
    throw new cr(a || "Unexpected input", t, p.offset, p.line, p.column);
  } });
  return Object.assign(function(a, l) {
    t = a, l = l || {}, u.setSource(t, ve), s.setSource(t, l.offset, l.line, l.column), r = l.filename || "<unknown>", n = Boolean(l.positions), o = typeof l.onParseError == "function" ? l.onParseError : Vo, i = false, u.parseAtrulePrelude = "parseAtrulePrelude" in l ? Boolean(l.parseAtrulePrelude) : true, u.parseRulePrelude = "parseRulePrelude" in l ? Boolean(l.parseRulePrelude) : true, u.parseValue = "parseValue" in l ? Boolean(l.parseValue) : true, u.parseCustomProperty = "parseCustomProperty" in l ? Boolean(l.parseCustomProperty) : false;
    let { context: p = "default", onComment: m } = l;
    if (!(p in u.context)) throw new Error("Unknown context `" + p + "`");
    typeof m == "function" && u.forEachToken((P, te, X) => {
      if (P === 25) {
        let S = u.getLocation(te, X), R = ge(t, X - 2, X, "*/") ? t.slice(te + 2, X - 2) : t.slice(te + 2, X);
        m(R, S);
      }
    });
    let f = u.context[p].call(u, l);
    return u.eof || u.error(), f;
  }, { SyntaxError: cr, config: u.config });
}
__name(Xo, "Xo");
var bi = ss(di(), 1);
var gi = /* @__PURE__ */ new Set(["Atrule", "Selector", "Declaration"]);
function xi(e) {
  let t = new bi.SourceMapGenerator(), r = { line: 1, column: 0 }, n = { line: 0, column: 0 }, o = { line: 1, column: 0 }, i = { generated: o }, s = 1, u = 0, c = false, a = e.node;
  e.node = function(m) {
    if (m.loc && m.loc.start && gi.has(m.type)) {
      let f = m.loc.start.line, P = m.loc.start.column - 1;
      (n.line !== f || n.column !== P) && (n.line = f, n.column = P, r.line = s, r.column = u, c && (c = false, (r.line !== o.line || r.column !== o.column) && t.addMapping(i)), c = true, t.addMapping({ source: m.loc.source, original: n, generated: r }));
    }
    a.call(this, m), c && gi.has(m.type) && (o.line = s, o.column = u);
  };
  let l = e.emit;
  e.emit = function(m, f, P) {
    for (let te = 0; te < m.length; te++) m.charCodeAt(te) === 10 ? (s++, u = 0) : u++;
    l(m, f, P);
  };
  let p = e.result;
  return e.result = function() {
    return c && t.addMapping(i), { css: p(), map: t };
  }, e;
}
__name(xi, "xi");
var Dt = {};
b(Dt, { safe: /* @__PURE__ */ __name(() => yr, "safe"), spec: /* @__PURE__ */ __name(() => Us, "spec") });
var Fs = 43;
var Bs = 45;
var xr = /* @__PURE__ */ __name((e, t) => {
  if (e === 9 && (e = t), typeof e == "string") {
    let r = e.charCodeAt(0);
    return r > 127 ? 32768 : r << 8;
  }
  return e;
}, "xr");
var yi = [[1, 1], [1, 2], [1, 7], [1, 8], [1, "-"], [1, 10], [1, 11], [1, 12], [1, 15], [1, 21], [3, 1], [3, 2], [3, 7], [3, 8], [3, "-"], [3, 10], [3, 11], [3, 12], [3, 15], [4, 1], [4, 2], [4, 7], [4, 8], [4, "-"], [4, 10], [4, 11], [4, 12], [4, 15], [12, 1], [12, 2], [12, 7], [12, 8], [12, "-"], [12, 10], [12, 11], [12, 12], [12, 15], ["#", 1], ["#", 2], ["#", 7], ["#", 8], ["#", "-"], ["#", 10], ["#", 11], ["#", 12], ["#", 15], ["-", 1], ["-", 2], ["-", 7], ["-", 8], ["-", "-"], ["-", 10], ["-", 11], ["-", 12], ["-", 15], [10, 1], [10, 2], [10, 7], [10, 8], [10, 10], [10, 11], [10, 12], [10, "%"], [10, 15], ["@", 1], ["@", 2], ["@", 7], ["@", 8], ["@", "-"], ["@", 15], [".", 10], [".", 11], [".", 12], ["+", 10], ["+", 11], ["+", 12], ["/", "*"]];
var _s = yi.concat([[1, 4], [12, 4], [4, 4], [3, 21], [3, 5], [3, 16], [11, 11], [11, 12], [11, 2], [11, "-"], [22, 1], [22, 2], [22, 11], [22, 12], [22, 4], [22, "-"]]);
function ki(e) {
  let t = new Set(e.map(([r, n]) => xr(r) << 16 | xr(n)));
  return function(r, n, o) {
    let i = xr(n, o), s = o.charCodeAt(0);
    return (s === Bs && n !== 1 && n !== 2 && n !== 15 || s === Fs ? t.has(r << 16 | s << 8) : t.has(r << 16 | i)) && this.emit(" ", 13, true), i;
  };
}
__name(ki, "ki");
var Us = ki(yi);
var yr = ki(_s);
var js = 92;
function Hs(e, t) {
  if (typeof t == "function") {
    let r = null;
    e.children.forEach((n) => {
      r !== null && t.call(this, r), this.node(n), r = n;
    });
    return;
  }
  e.children.forEach(this.node, this);
}
__name(Hs, "Hs");
function qs(e) {
  ve(e, (t, r, n) => {
    this.token(t, e.slice(r, n));
  });
}
__name(qs, "qs");
function wi(e) {
  let t = /* @__PURE__ */ new Map();
  for (let r in e.node) {
    let n = e.node[r];
    typeof (n.generate || n) == "function" && t.set(r, n.generate || n);
  }
  return function(r, n) {
    let o = "", i = 0, s = { node(c) {
      if (t.has(c.type)) t.get(c.type).call(u, c);
      else throw new Error("Unknown node type: " + c.type);
    }, tokenBefore: yr, token(c, a) {
      i = this.tokenBefore(i, c, a), this.emit(a, c, false), c === 9 && a.charCodeAt(0) === js && this.emit(`
`, 13, true);
    }, emit(c) {
      o += c;
    }, result() {
      return o;
    } };
    n && (typeof n.decorator == "function" && (s = n.decorator(s)), n.sourceMap && (s = xi(s)), n.mode in Dt && (s.tokenBefore = Dt[n.mode]));
    let u = { node: /* @__PURE__ */ __name((c) => s.node(c), "node"), children: Hs, token: /* @__PURE__ */ __name((c, a) => s.token(c, a), "token"), tokenize: qs };
    return s.node(r), s.result();
  };
}
__name(wi, "wi");
function vi(e) {
  return { fromPlainObject(t) {
    return e(t, { enter(r) {
      r.children && !(r.children instanceof I) && (r.children = new I().fromArray(r.children));
    } }), t;
  }, toPlainObject(t) {
    return e(t, { leave(r) {
      r.children && r.children instanceof I && (r.children = r.children.toArray());
    } }), t;
  } };
}
__name(vi, "vi");
var { hasOwnProperty: kr } = Object.prototype;
var at = /* @__PURE__ */ __name(function() {
}, "at");
function Si(e) {
  return typeof e == "function" ? e : at;
}
__name(Si, "Si");
function Ci(e, t) {
  return function(r, n, o) {
    r.type === t && e.call(this, r, n, o);
  };
}
__name(Ci, "Ci");
function Ws(e, t) {
  let r = t.structure, n = [];
  for (let o in r) {
    if (kr.call(r, o) === false) continue;
    let i = r[o], s = { name: o, type: false, nullable: false };
    Array.isArray(i) || (i = [i]);
    for (let u of i) u === null ? s.nullable = true : typeof u == "string" ? s.type = "node" : Array.isArray(u) && (s.type = "list");
    s.type && n.push(s);
  }
  return n.length ? { context: t.walkContext, fields: n } : null;
}
__name(Ws, "Ws");
function Ys(e) {
  let t = {};
  for (let r in e.node) if (kr.call(e.node, r)) {
    let n = e.node[r];
    if (!n.structure) throw new Error("Missed `structure` field in `" + r + "` node type definition");
    t[r] = Ws(r, n);
  }
  return t;
}
__name(Ys, "Ys");
function Ai(e, t) {
  let r = e.fields.slice(), n = e.context, o = typeof n == "string";
  return t && r.reverse(), function(i, s, u, c) {
    let a;
    o && (a = s[n], s[n] = i);
    for (let l of r) {
      let p = i[l.name];
      if (!l.nullable || p) {
        if (l.type === "list") {
          if (t ? p.reduceRight(c, false) : p.reduce(c, false)) return true;
        } else if (u(p)) return true;
      }
    }
    o && (s[n] = a);
  };
}
__name(Ai, "Ai");
function Ti({ StyleSheet: e, Atrule: t, Rule: r, Block: n, DeclarationList: o }) {
  return { Atrule: { StyleSheet: e, Atrule: t, Rule: r, Block: n }, Rule: { StyleSheet: e, Atrule: t, Rule: r, Block: n }, Declaration: { StyleSheet: e, Atrule: t, Rule: r, Block: n, DeclarationList: o } };
}
__name(Ti, "Ti");
function Ei(e) {
  let t = Ys(e), r = {}, n = {}, o = /* @__PURE__ */ Symbol("break-walk"), i = /* @__PURE__ */ Symbol("skip-node");
  for (let a in t) kr.call(t, a) && t[a] !== null && (r[a] = Ai(t[a], false), n[a] = Ai(t[a], true));
  let s = Ti(r), u = Ti(n), c = /* @__PURE__ */ __name(function(a, l) {
    function p(S, R, ke) {
      let z = m.call(X, S, R, ke);
      return z === o ? true : z === i ? false : !!(P.hasOwnProperty(S.type) && P[S.type](S, X, p, te) || f.call(X, S, R, ke) === o);
    }
    __name(p, "p");
    let m = at, f = at, P = r, te = /* @__PURE__ */ __name((S, R, ke, z) => S || p(R, ke, z), "te"), X = { break: o, skip: i, root: a, stylesheet: null, atrule: null, atrulePrelude: null, rule: null, selector: null, block: null, declaration: null, function: null };
    if (typeof l == "function") m = l;
    else if (l && (m = Si(l.enter), f = Si(l.leave), l.reverse && (P = n), l.visit)) {
      if (s.hasOwnProperty(l.visit)) P = l.reverse ? u[l.visit] : s[l.visit];
      else if (!t.hasOwnProperty(l.visit)) throw new Error("Bad value `" + l.visit + "` for `visit` option (should be: " + Object.keys(t).sort().join(", ") + ")");
      m = Ci(m, l.visit), f = Ci(f, l.visit);
    }
    if (m === at && f === at) throw new Error("Neither `enter` nor `leave` walker handler is set or both aren't a function");
    p(a);
  }, "c");
  return c.break = o, c.skip = i, c.find = function(a, l) {
    let p = null;
    return c(a, function(m, f, P) {
      if (l.call(this, m, f, P)) return p = m, o;
    }), p;
  }, c.findLast = function(a, l) {
    let p = null;
    return c(a, { reverse: true, enter(m, f, P) {
      if (l.call(this, m, f, P)) return p = m, o;
    } }), p;
  }, c.findAll = function(a, l) {
    let p = [];
    return c(a, function(m, f, P) {
      l.call(this, m, f, P) && p.push(m);
    }), p;
  }, c;
}
__name(Ei, "Ei");
function Gs(e) {
  return e;
}
__name(Gs, "Gs");
function Vs(e) {
  let { min: t, max: r, comma: n } = e;
  return t === 0 && r === 0 ? n ? "#?" : "*" : t === 0 && r === 1 ? "?" : t === 1 && r === 0 ? n ? "#" : "+" : t === 1 && r === 1 ? "" : (n ? "#" : "") + (t === r ? "{" + t + "}" : "{" + t + "," + (r !== 0 ? r : "") + "}");
}
__name(Vs, "Vs");
function Ks(e) {
  switch (e.type) {
    case "Range":
      return " [" + (e.min === null ? "-\u221E" : e.min) + "," + (e.max === null ? "\u221E" : e.max) + "]";
    default:
      throw new Error("Unknown node type `" + e.type + "`");
  }
}
__name(Ks, "Ks");
function Qs(e, t, r, n) {
  let o = e.combinator === " " || n ? e.combinator : " " + e.combinator + " ", i = e.terms.map((s) => wr(s, t, r, n)).join(o);
  return e.explicit || r ? (n || i[0] === "," ? "[" : "[ ") + i + (n ? "]" : " ]") : i;
}
__name(Qs, "Qs");
function wr(e, t, r, n) {
  let o;
  switch (e.type) {
    case "Group":
      o = Qs(e, t, r, n) + (e.disallowEmpty ? "!" : "");
      break;
    case "Multiplier":
      return wr(e.term, t, r, n) + t(Vs(e), e);
    case "Type":
      o = "<" + e.name + (e.opts ? t(Ks(e.opts), e.opts) : "") + ">";
      break;
    case "Property":
      o = "<'" + e.name + "'>";
      break;
    case "Keyword":
      o = e.name;
      break;
    case "AtKeyword":
      o = "@" + e.name;
      break;
    case "Function":
      o = e.name + "(";
      break;
    case "String":
    case "Token":
      o = e.value;
      break;
    case "Comma":
      o = ",";
      break;
    default:
      throw new Error("Unknown node type `" + e.type + "`");
  }
  return t(o, e);
}
__name(wr, "wr");
function Pe(e, t) {
  let r = Gs, n = false, o = false;
  return typeof t == "function" ? r = t : t && (n = Boolean(t.forceBraces), o = Boolean(t.compact), typeof t.decorate == "function" && (r = t.decorate)), wr(e, r, n, o);
}
__name(Pe, "Pe");
var Li = { offset: 0, line: 1, column: 1 };
function Xs(e, t) {
  let r = e.tokens, n = e.longestMatch, o = n < r.length && r[n].node || null, i = o !== t ? o : null, s = 0, u = 0, c = 0, a = "", l, p;
  for (let m = 0; m < r.length; m++) {
    let f = r[m].value;
    m === n && (u = f.length, s = a.length), i !== null && r[m].node === i && (m <= n ? c++ : c = 0), a += f;
  }
  return n === r.length || c > 1 ? (l = Ot(i || t, "end") || st(Li, a), p = st(l)) : (l = Ot(i, "start") || st(Ot(t, "start") || Li, a.slice(0, s)), p = Ot(i, "end") || st(l, a.substr(s, u))), { css: a, mismatchOffset: s, mismatchLength: u, start: l, end: p };
}
__name(Xs, "Xs");
function Ot(e, t) {
  let r = e && e.loc && e.loc[t];
  return r ? "line" in r ? st(r) : r : null;
}
__name(Ot, "Ot");
function st({ offset: e, line: t, column: r }, n) {
  let o = { offset: e, line: t, column: r };
  if (n) {
    let i = n.split(/\n|\r\n?|\f/);
    o.offset += n.length, o.line += i.length - 1, o.column = i.length === 1 ? o.column + n.length : i.pop().length + 1;
  }
  return o;
}
__name(st, "st");
var je = /* @__PURE__ */ __name(function(e, t) {
  let r = Ee("SyntaxReferenceError", e + (t ? " `" + t + "`" : ""));
  return r.reference = t, r;
}, "je");
var Pi = /* @__PURE__ */ __name(function(e, t, r, n) {
  let o = Ee("SyntaxMatchError", e), { css: i, mismatchOffset: s, mismatchLength: u, start: c, end: a } = Xs(n, r);
  return o.rawMessage = e, o.syntax = t ? Pe(t) : "<generic>", o.css = i, o.mismatchOffset = s, o.mismatchLength = u, o.message = e + `
  syntax: ` + o.syntax + `
   value: ` + (i || "<empty string>") + `
  --------` + new Array(o.mismatchOffset + 1).join("-") + "^", Object.assign(o, c), o.loc = { source: r && r.loc && r.loc.source || "<unknown>", start: c, end: a }, o;
}, "Pi");
var Nt = /* @__PURE__ */ new Map();
var He = /* @__PURE__ */ new Map();
var zt = 45;
var Mt = $s;
var vr = Zs;
function Rt(e, t) {
  return t = t || 0, e.length - t >= 2 && e.charCodeAt(t) === zt && e.charCodeAt(t + 1) === zt;
}
__name(Rt, "Rt");
function Sr(e, t) {
  if (t = t || 0, e.length - t >= 3 && e.charCodeAt(t) === zt && e.charCodeAt(t + 1) !== zt) {
    let r = e.indexOf("-", t + 2);
    if (r !== -1) return e.substring(t, r + 1);
  }
  return "";
}
__name(Sr, "Sr");
function $s(e) {
  if (Nt.has(e)) return Nt.get(e);
  let t = e.toLowerCase(), r = Nt.get(t);
  if (r === void 0) {
    let n = Rt(t, 0), o = n ? "" : Sr(t, 0);
    r = Object.freeze({ basename: t.substr(o.length), name: t, prefix: o, vendor: o, custom: n });
  }
  return Nt.set(e, r), r;
}
__name($s, "$s");
function Zs(e) {
  if (He.has(e)) return He.get(e);
  let t = e, r = e[0];
  r === "/" ? r = e[1] === "/" ? "//" : "/" : r !== "_" && r !== "*" && r !== "$" && r !== "#" && r !== "+" && r !== "&" && (r = "");
  let n = Rt(t, r.length);
  if (!n && (t = t.toLowerCase(), He.has(t))) {
    let u = He.get(t);
    return He.set(e, u), u;
  }
  let o = n ? "" : Sr(t, r.length), i = t.substr(0, r.length + o.length), s = Object.freeze({ basename: t.substr(i.length), name: t.substr(r.length), hack: r, vendor: o, prefix: i, custom: n });
  return He.set(e, s), s;
}
__name(Zs, "Zs");
var Ft = ["initial", "inherit", "unset", "revert", "revert-layer"];
var ct = 43;
var he = 45;
var Cr = 110;
var qe = true;
var el = false;
function Tr(e, t) {
  return e !== null && e.type === 9 && e.value.charCodeAt(0) === t;
}
__name(Tr, "Tr");
function lt(e, t, r) {
  for (; e !== null && (e.type === 13 || e.type === 25); ) e = r(++t);
  return t;
}
__name(lt, "lt");
function Se(e, t, r, n) {
  if (!e) return 0;
  let o = e.value.charCodeAt(t);
  if (o === ct || o === he) {
    if (r) return 0;
    t++;
  }
  for (; t < e.value.length; t++) if (!B(e.value.charCodeAt(t))) return 0;
  return n + 1;
}
__name(Se, "Se");
function Ar(e, t, r) {
  let n = false, o = lt(e, t, r);
  if (e = r(o), e === null) return t;
  if (e.type !== 10) if (Tr(e, ct) || Tr(e, he)) {
    if (n = true, o = lt(r(++o), o, r), e = r(o), e === null || e.type !== 10) return 0;
  } else return t;
  if (!n) {
    let i = e.value.charCodeAt(0);
    if (i !== ct && i !== he) return 0;
  }
  return Se(e, n ? 0 : 1, n, o);
}
__name(Ar, "Ar");
function Er(e, t) {
  let r = 0;
  if (!e) return 0;
  if (e.type === 10) return Se(e, 0, el, r);
  if (e.type === 1 && e.value.charCodeAt(0) === he) {
    if (!de(e.value, 1, Cr)) return 0;
    switch (e.value.length) {
      case 2:
        return Ar(t(++r), r, t);
      case 3:
        return e.value.charCodeAt(2) !== he ? 0 : (r = lt(t(++r), r, t), e = t(r), Se(e, 0, qe, r));
      default:
        return e.value.charCodeAt(2) !== he ? 0 : Se(e, 3, qe, r);
    }
  } else if (e.type === 1 || Tr(e, ct) && t(r + 1).type === 1) {
    if (e.type !== 1 && (e = t(++r)), e === null || !de(e.value, 0, Cr)) return 0;
    switch (e.value.length) {
      case 1:
        return Ar(t(++r), r, t);
      case 2:
        return e.value.charCodeAt(1) !== he ? 0 : (r = lt(t(++r), r, t), e = t(r), Se(e, 0, qe, r));
      default:
        return e.value.charCodeAt(1) !== he ? 0 : Se(e, 2, qe, r);
    }
  } else if (e.type === 12) {
    let n = e.value.charCodeAt(0), o = n === ct || n === he ? 1 : 0, i = o;
    for (; i < e.value.length && B(e.value.charCodeAt(i)); i++) ;
    return i === o || !de(e.value, i, Cr) ? 0 : i + 1 === e.value.length ? Ar(t(++r), r, t) : e.value.charCodeAt(i + 1) !== he ? 0 : i + 2 === e.value.length ? (r = lt(t(++r), r, t), e = t(r), Se(e, 0, qe, r)) : Se(e, i + 2, qe, r);
  }
  return 0;
}
__name(Er, "Er");
var tl = 43;
var Ii = 45;
var Di = 63;
var rl = 117;
function Lr(e, t) {
  return e !== null && e.type === 9 && e.value.charCodeAt(0) === t;
}
__name(Lr, "Lr");
function nl(e, t) {
  return e.value.charCodeAt(0) === t;
}
__name(nl, "nl");
function ut(e, t, r) {
  let n = 0;
  for (let o = t; o < e.value.length; o++) {
    let i = e.value.charCodeAt(o);
    if (i === Ii && r && n !== 0) return ut(e, t + n + 1, false), 6;
    if (!ee(i) || ++n > 6) return 0;
  }
  return n;
}
__name(ut, "ut");
function Bt(e, t, r) {
  if (!e) return 0;
  for (; Lr(r(t), Di); ) {
    if (++e > 6) return 0;
    t++;
  }
  return t;
}
__name(Bt, "Bt");
function Pr(e, t) {
  let r = 0;
  if (e === null || e.type !== 1 || !de(e.value, 0, rl) || (e = t(++r), e === null)) return 0;
  if (Lr(e, tl)) return e = t(++r), e === null ? 0 : e.type === 1 ? Bt(ut(e, 0, true), ++r, t) : Lr(e, Di) ? Bt(1, ++r, t) : 0;
  if (e.type === 10) {
    let n = ut(e, 1, true);
    return n === 0 ? 0 : (e = t(++r), e === null ? r : e.type === 12 || e.type === 10 ? !nl(e, Ii) || !ut(e, 1, false) ? 0 : r + 1 : Bt(n, r, t));
  }
  return e.type === 12 ? Bt(ut(e, 1, true), ++r, t) : 0;
}
__name(Pr, "Pr");
var ol = ["calc(", "-moz-calc(", "-webkit-calc("];
var Ir = /* @__PURE__ */ new Map([[2, 22], [21, 22], [19, 20], [23, 24]]);
var il = ["cm", "mm", "q", "in", "pt", "pc", "px", "em", "rem", "ex", "rex", "cap", "rcap", "ch", "rch", "ic", "ric", "lh", "rlh", "vw", "svw", "lvw", "dvw", "vh", "svh", "lvh", "dvh", "vi", "svi", "lvi", "dvi", "vb", "svb", "lvb", "dvb", "vmin", "svmin", "lvmin", "dvmin", "vmax", "svmax", "lvmax", "dvmax", "cqw", "cqh", "cqi", "cqb", "cqmin", "cqmax"];
var al = ["deg", "grad", "rad", "turn"];
var sl = ["s", "ms"];
var ll = ["hz", "khz"];
var cl = ["dpi", "dpcm", "dppx", "x"];
var ul = ["fr"];
var pl = ["db"];
var hl = ["st"];
function le(e, t) {
  return t < e.length ? e.charCodeAt(t) : 0;
}
__name(le, "le");
function Ni(e, t) {
  return ge(e, 0, e.length, t);
}
__name(Ni, "Ni");
function zi(e, t) {
  for (let r = 0; r < t.length; r++) if (Ni(e, t[r])) return true;
  return false;
}
__name(zi, "zi");
function Mi(e, t) {
  return t !== e.length - 2 ? false : le(e, t) === 92 && B(le(e, t + 1));
}
__name(Mi, "Mi");
function _t(e, t, r) {
  if (e && e.type === "Range") {
    let n = Number(r !== void 0 && r !== t.length ? t.substr(0, r) : t);
    if (isNaN(n) || e.min !== null && n < e.min && typeof e.min != "string" || e.max !== null && n > e.max && typeof e.max != "string") return true;
  }
  return false;
}
__name(_t, "_t");
function ml(e, t) {
  let r = 0, n = [], o = 0;
  e: do {
    switch (e.type) {
      case 24:
      case 22:
      case 20:
        if (e.type !== r) break e;
        if (r = n.pop(), n.length === 0) {
          o++;
          break e;
        }
        break;
      case 2:
      case 21:
      case 19:
      case 23:
        n.push(r), r = Ir.get(e.type);
        break;
    }
    o++;
  } while (e = t(o));
  return o;
}
__name(ml, "ml");
function ie(e) {
  return function(t, r, n) {
    return t === null ? 0 : t.type === 2 && zi(t.value, ol) ? ml(t, r) : e(t, r, n);
  };
}
__name(ie, "ie");
function N(e) {
  return function(t) {
    return t === null || t.type !== e ? 0 : 1;
  };
}
__name(N, "N");
function fl(e) {
  if (e === null || e.type !== 1) return 0;
  let t = e.value.toLowerCase();
  return zi(t, Ft) || Ni(t, "default") ? 0 : 1;
}
__name(fl, "fl");
function dl(e) {
  return e === null || e.type !== 1 || le(e.value, 0) !== 45 || le(e.value, 1) !== 45 ? 0 : 1;
}
__name(dl, "dl");
function gl(e) {
  if (e === null || e.type !== 4) return 0;
  let t = e.value.length;
  if (t !== 4 && t !== 5 && t !== 7 && t !== 9) return 0;
  for (let r = 1; r < t; r++) if (!ee(le(e.value, r))) return 0;
  return 1;
}
__name(gl, "gl");
function bl(e) {
  return e === null || e.type !== 4 || !ze(le(e.value, 1), le(e.value, 2), le(e.value, 3)) ? 0 : 1;
}
__name(bl, "bl");
function xl(e, t) {
  if (!e) return 0;
  let r = 0, n = [], o = 0;
  e: do {
    switch (e.type) {
      case 6:
      case 8:
        break e;
      case 24:
      case 22:
      case 20:
        if (e.type !== r) break e;
        r = n.pop();
        break;
      case 17:
        if (r === 0) break e;
        break;
      case 9:
        if (r === 0 && e.value === "!") break e;
        break;
      case 2:
      case 21:
      case 19:
      case 23:
        n.push(r), r = Ir.get(e.type);
        break;
    }
    o++;
  } while (e = t(o));
  return o;
}
__name(xl, "xl");
function yl(e, t) {
  if (!e) return 0;
  let r = 0, n = [], o = 0;
  e: do {
    switch (e.type) {
      case 6:
      case 8:
        break e;
      case 24:
      case 22:
      case 20:
        if (e.type !== r) break e;
        r = n.pop();
        break;
      case 2:
      case 21:
      case 19:
      case 23:
        n.push(r), r = Ir.get(e.type);
        break;
    }
    o++;
  } while (e = t(o));
  return o;
}
__name(yl, "yl");
function ye(e) {
  return e && (e = new Set(e)), function(t, r, n) {
    if (t === null || t.type !== 12) return 0;
    let o = Te(t.value, 0);
    if (e !== null) {
      let i = t.value.indexOf("\\", o), s = i === -1 || !Mi(t.value, i) ? t.value.substr(o) : t.value.substring(o, i);
      if (e.has(s.toLowerCase()) === false) return 0;
    }
    return _t(n, t.value, o) ? 0 : 1;
  };
}
__name(ye, "ye");
function kl(e, t, r) {
  return e === null || e.type !== 11 || _t(r, e.value, e.value.length - 1) ? 0 : 1;
}
__name(kl, "kl");
function Oi(e) {
  return typeof e != "function" && (e = /* @__PURE__ */ __name(function() {
    return 0;
  }, "e")), function(t, r, n) {
    return t !== null && t.type === 10 && Number(t.value) === 0 ? 1 : e(t, r, n);
  };
}
__name(Oi, "Oi");
function wl(e, t, r) {
  if (e === null) return 0;
  let n = Te(e.value, 0);
  return !(n === e.value.length) && !Mi(e.value, n) || _t(r, e.value, n) ? 0 : 1;
}
__name(wl, "wl");
function vl(e, t, r) {
  if (e === null || e.type !== 10) return 0;
  let n = le(e.value, 0) === 43 || le(e.value, 0) === 45 ? 1 : 0;
  for (; n < e.value.length; n++) if (!B(le(e.value, n))) return 0;
  return _t(r, e.value, n) ? 0 : 1;
}
__name(vl, "vl");
var Dr = { "ident-token": N(1), "function-token": N(2), "at-keyword-token": N(3), "hash-token": N(4), "string-token": N(5), "bad-string-token": N(6), "url-token": N(7), "bad-url-token": N(8), "delim-token": N(9), "number-token": N(10), "percentage-token": N(11), "dimension-token": N(12), "whitespace-token": N(13), "CDO-token": N(14), "CDC-token": N(15), "colon-token": N(16), "semicolon-token": N(17), "comma-token": N(18), "[-token": N(19), "]-token": N(20), "(-token": N(21), ")-token": N(22), "{-token": N(23), "}-token": N(24), string: N(5), ident: N(1), "custom-ident": fl, "custom-property-name": dl, "hex-color": gl, "id-selector": bl, "an-plus-b": Er, urange: Pr, "declaration-value": xl, "any-value": yl, dimension: ie(ye(null)), angle: ie(ye(al)), decibel: ie(ye(pl)), frequency: ie(ye(ll)), flex: ie(ye(ul)), length: ie(Oi(ye(il))), resolution: ie(ye(cl)), semitones: ie(ye(hl)), time: ie(ye(sl)), percentage: ie(kl), zero: Oi(), number: ie(wl), integer: ie(vl) };
var Qi = {};
b(Qi, { SyntaxError: /* @__PURE__ */ __name(() => Ut, "SyntaxError"), generate: /* @__PURE__ */ __name(() => Pe, "generate"), parse: /* @__PURE__ */ __name(() => Ge, "parse"), walk: /* @__PURE__ */ __name(() => Vt, "walk") });
function Ut(e, t, r) {
  return Object.assign(Ee("SyntaxError", e), { input: t, offset: r, rawMessage: e, message: e + `
  ` + t + `
--` + new Array((r || t.length) + 1).join("-") + "^" });
}
__name(Ut, "Ut");
var Sl = 9;
var Cl = 10;
var Al = 12;
var Tl = 13;
var El = 32;
var jt = class {
  static {
    __name(this, "jt");
  }
  constructor(t) {
    this.str = t, this.pos = 0;
  }
  charCodeAt(t) {
    return t < this.str.length ? this.str.charCodeAt(t) : 0;
  }
  charCode() {
    return this.charCodeAt(this.pos);
  }
  nextCharCode() {
    return this.charCodeAt(this.pos + 1);
  }
  nextNonWsCode(t) {
    return this.charCodeAt(this.findWsEnd(t));
  }
  findWsEnd(t) {
    for (; t < this.str.length; t++) {
      let r = this.str.charCodeAt(t);
      if (r !== Tl && r !== Cl && r !== Al && r !== El && r !== Sl) break;
    }
    return t;
  }
  substringToPos(t) {
    return this.str.substring(this.pos, this.pos = t);
  }
  eat(t) {
    this.charCode() !== t && this.error("Expect `" + String.fromCharCode(t) + "`"), this.pos++;
  }
  peek() {
    return this.pos < this.str.length ? this.str.charAt(this.pos++) : "";
  }
  error(t) {
    throw new Ut(t, this.str, this.pos);
  }
};
var Ll = 9;
var Pl = 10;
var Il = 12;
var Dl = 13;
var Ol = 32;
var qi = 33;
var zr = 35;
var Ri = 38;
var Ht = 39;
var Wi = 40;
var Nl = 41;
var Yi = 42;
var Mr = 43;
var Rr = 44;
var Fi = 45;
var Fr = 60;
var Gi = 62;
var Nr = 63;
var zl = 64;
var Gt = 91;
var Br = 93;
var qt = 123;
var Bi = 124;
var _i = 125;
var Ui = 8734;
var pt = new Uint8Array(128).map((e, t) => /[a-zA-Z0-9\-]/.test(String.fromCharCode(t)) ? 1 : 0);
var ji = { " ": 1, "&&": 2, "||": 3, "|": 4 };
function Wt(e) {
  return e.substringToPos(e.findWsEnd(e.pos));
}
__name(Wt, "Wt");
function We(e) {
  let t = e.pos;
  for (; t < e.str.length; t++) {
    let r = e.str.charCodeAt(t);
    if (r >= 128 || pt[r] === 0) break;
  }
  return e.pos === t && e.error("Expect a keyword"), e.substringToPos(t);
}
__name(We, "We");
function Yt(e) {
  let t = e.pos;
  for (; t < e.str.length; t++) {
    let r = e.str.charCodeAt(t);
    if (r < 48 || r > 57) break;
  }
  return e.pos === t && e.error("Expect a number"), e.substringToPos(t);
}
__name(Yt, "Yt");
function Ml(e) {
  let t = e.str.indexOf("'", e.pos + 1);
  return t === -1 && (e.pos = e.str.length, e.error("Expect an apostrophe")), e.substringToPos(t + 1);
}
__name(Ml, "Ml");
function Hi(e) {
  let t = null, r = null;
  return e.eat(qt), t = Yt(e), e.charCode() === Rr ? (e.pos++, e.charCode() !== _i && (r = Yt(e))) : r = t, e.eat(_i), { min: Number(t), max: r ? Number(r) : 0 };
}
__name(Hi, "Hi");
function Rl(e) {
  let t = null, r = false;
  switch (e.charCode()) {
    case Yi:
      e.pos++, t = { min: 0, max: 0 };
      break;
    case Mr:
      e.pos++, t = { min: 1, max: 0 };
      break;
    case Nr:
      e.pos++, t = { min: 0, max: 1 };
      break;
    case zr:
      e.pos++, r = true, e.charCode() === qt ? t = Hi(e) : e.charCode() === Nr ? (e.pos++, t = { min: 0, max: 0 }) : t = { min: 1, max: 0 };
      break;
    case qt:
      t = Hi(e);
      break;
    default:
      return null;
  }
  return { type: "Multiplier", comma: r, min: t.min, max: t.max, term: null };
}
__name(Rl, "Rl");
function Ye(e, t) {
  let r = Rl(e);
  return r !== null ? (r.term = t, e.charCode() === zr && e.charCodeAt(e.pos - 1) === Mr ? Ye(e, r) : r) : t;
}
__name(Ye, "Ye");
function Or(e) {
  let t = e.peek();
  return t === "" ? null : { type: "Token", value: t };
}
__name(Or, "Or");
function Fl(e) {
  let t;
  return e.eat(Fr), e.eat(Ht), t = We(e), e.eat(Ht), e.eat(Gi), Ye(e, { type: "Property", name: t });
}
__name(Fl, "Fl");
function Bl(e) {
  let t = null, r = null, n = 1;
  return e.eat(Gt), e.charCode() === Fi && (e.peek(), n = -1), n == -1 && e.charCode() === Ui ? e.peek() : (t = n * Number(Yt(e)), pt[e.charCode()] !== 0 && (t += We(e))), Wt(e), e.eat(Rr), Wt(e), e.charCode() === Ui ? e.peek() : (n = 1, e.charCode() === Fi && (e.peek(), n = -1), r = n * Number(Yt(e)), pt[e.charCode()] !== 0 && (r += We(e))), e.eat(Br), { type: "Range", min: t, max: r };
}
__name(Bl, "Bl");
function _l(e) {
  let t, r = null;
  return e.eat(Fr), t = We(e), e.charCode() === Wi && e.nextCharCode() === Nl && (e.pos += 2, t += "()"), e.charCodeAt(e.findWsEnd(e.pos)) === Gt && (Wt(e), r = Bl(e)), e.eat(Gi), Ye(e, { type: "Type", name: t, opts: r });
}
__name(_l, "_l");
function Ul(e) {
  let t = We(e);
  return e.charCode() === Wi ? (e.pos++, { type: "Function", name: t }) : Ye(e, { type: "Keyword", name: t });
}
__name(Ul, "Ul");
function jl(e, t) {
  function r(o, i) {
    return { type: "Group", terms: o, combinator: i, disallowEmpty: false, explicit: false };
  }
  __name(r, "r");
  let n;
  for (t = Object.keys(t).sort((o, i) => ji[o] - ji[i]); t.length > 0; ) {
    n = t.shift();
    let o = 0, i = 0;
    for (; o < e.length; o++) {
      let s = e[o];
      s.type === "Combinator" && (s.value === n ? (i === -1 && (i = o - 1), e.splice(o, 1), o--) : (i !== -1 && o - i > 1 && (e.splice(i, o - i, r(e.slice(i, o), n)), o = i + 1), i = -1));
    }
    i !== -1 && t.length && e.splice(i, o - i, r(e.slice(i, o), n));
  }
  return n;
}
__name(jl, "jl");
function Vi(e) {
  let t = [], r = {}, n, o = null, i = e.pos;
  for (; n = ql(e); ) n.type !== "Spaces" && (n.type === "Combinator" ? ((o === null || o.type === "Combinator") && (e.pos = i, e.error("Unexpected combinator")), r[n.value] = true) : o !== null && o.type !== "Combinator" && (r[" "] = true, t.push({ type: "Combinator", value: " " })), t.push(n), o = n, i = e.pos);
  return o !== null && o.type === "Combinator" && (e.pos -= i, e.error("Unexpected combinator")), { type: "Group", terms: t, combinator: jl(t, r) || " ", disallowEmpty: false, explicit: false };
}
__name(Vi, "Vi");
function Hl(e) {
  let t;
  return e.eat(Gt), t = Vi(e), e.eat(Br), t.explicit = true, e.charCode() === qi && (e.pos++, t.disallowEmpty = true), t;
}
__name(Hl, "Hl");
function ql(e) {
  let t = e.charCode();
  if (t < 128 && pt[t] === 1) return Ul(e);
  switch (t) {
    case Br:
      break;
    case Gt:
      return Ye(e, Hl(e));
    case Fr:
      return e.nextCharCode() === Ht ? Fl(e) : _l(e);
    case Bi:
      return { type: "Combinator", value: e.substringToPos(e.pos + (e.nextCharCode() === Bi ? 2 : 1)) };
    case Ri:
      return e.pos++, e.eat(Ri), { type: "Combinator", value: "&&" };
    case Rr:
      return e.pos++, { type: "Comma" };
    case Ht:
      return Ye(e, { type: "String", value: Ml(e) });
    case Ol:
    case Ll:
    case Pl:
    case Dl:
    case Il:
      return { type: "Spaces", value: Wt(e) };
    case zl:
      return t = e.nextCharCode(), t < 128 && pt[t] === 1 ? (e.pos++, { type: "AtKeyword", name: We(e) }) : Or(e);
    case Yi:
    case Mr:
    case Nr:
    case zr:
    case qi:
      break;
    case qt:
      if (t = e.nextCharCode(), t < 48 || t > 57) return Or(e);
      break;
    default:
      return Or(e);
  }
}
__name(ql, "ql");
function Ge(e) {
  let t = new jt(e), r = Vi(t);
  return t.pos !== e.length && t.error("Unexpected input"), r.terms.length === 1 && r.terms[0].type === "Group" ? r.terms[0] : r;
}
__name(Ge, "Ge");
var ht = /* @__PURE__ */ __name(function() {
}, "ht");
function Ki(e) {
  return typeof e == "function" ? e : ht;
}
__name(Ki, "Ki");
function Vt(e, t, r) {
  function n(s) {
    switch (o.call(r, s), s.type) {
      case "Group":
        s.terms.forEach(n);
        break;
      case "Multiplier":
        n(s.term);
        break;
      case "Type":
      case "Property":
      case "Keyword":
      case "AtKeyword":
      case "Function":
      case "String":
      case "Token":
      case "Comma":
        break;
      default:
        throw new Error("Unknown type: " + s.type);
    }
    i.call(r, s);
  }
  __name(n, "n");
  let o = ht, i = ht;
  if (typeof t == "function" ? o = t : t && (o = Ki(t.enter), i = Ki(t.leave)), o === ht && i === ht) throw new Error("Neither `enter` nor `leave` walker handler is set or both aren't a function");
  n(e, r);
}
__name(Vt, "Vt");
var Wl = { decorator(e) {
  let t = [], r = null;
  return { ...e, node(n) {
    let o = r;
    r = n, e.node.call(this, n), r = o;
  }, emit(n, o, i) {
    t.push({ type: o, value: n, node: i ? null : r });
  }, result() {
    return t;
  } };
} };
function Yl(e) {
  let t = [];
  return ve(e, (r, n, o) => t.push({ type: r, value: e.slice(n, o), node: null })), t;
}
__name(Yl, "Yl");
function Xi(e, t) {
  return typeof e == "string" ? Yl(e) : t.generate(e, Wl);
}
__name(Xi, "Xi");
var C = { type: "Match" };
var L = { type: "Mismatch" };
var Kt = { type: "DisallowEmpty" };
var Gl = 40;
var Vl = 41;
function Z(e, t, r) {
  return t === C && r === L || e === C && t === C && r === C ? e : (e.type === "If" && e.else === L && t === C && (t = e.then, e = e.match), { type: "If", match: e, then: t, else: r });
}
__name(Z, "Z");
function Zi(e) {
  return e.length > 2 && e.charCodeAt(e.length - 2) === Gl && e.charCodeAt(e.length - 1) === Vl;
}
__name(Zi, "Zi");
function $i(e) {
  return e.type === "Keyword" || e.type === "AtKeyword" || e.type === "Function" || e.type === "Type" && Zi(e.name);
}
__name($i, "$i");
function _r(e, t, r) {
  switch (e) {
    case " ": {
      let n = C;
      for (let o = t.length - 1; o >= 0; o--) {
        let i = t[o];
        n = Z(i, n, L);
      }
      return n;
    }
    case "|": {
      let n = L, o = null;
      for (let i = t.length - 1; i >= 0; i--) {
        let s = t[i];
        if ($i(s) && (o === null && i > 0 && $i(t[i - 1]) && (o = /* @__PURE__ */ Object.create(null), n = Z({ type: "Enum", map: o }, C, n)), o !== null)) {
          let u = (Zi(s.name) ? s.name.slice(0, -1) : s.name).toLowerCase();
          if (!(u in o)) {
            o[u] = s;
            continue;
          }
        }
        o = null, n = Z(s, C, n);
      }
      return n;
    }
    case "&&": {
      if (t.length > 5) return { type: "MatchOnce", terms: t, all: true };
      let n = L;
      for (let o = t.length - 1; o >= 0; o--) {
        let i = t[o], s;
        t.length > 1 ? s = _r(e, t.filter(function(u) {
          return u !== i;
        }), false) : s = C, n = Z(i, s, n);
      }
      return n;
    }
    case "||": {
      if (t.length > 5) return { type: "MatchOnce", terms: t, all: false };
      let n = r ? C : L;
      for (let o = t.length - 1; o >= 0; o--) {
        let i = t[o], s;
        t.length > 1 ? s = _r(e, t.filter(function(u) {
          return u !== i;
        }), true) : s = C, n = Z(i, s, n);
      }
      return n;
    }
  }
}
__name(_r, "_r");
function Kl(e) {
  let t = C, r = Ur(e.term);
  if (e.max === 0) r = Z(r, Kt, L), t = Z(r, null, L), t.then = Z(C, C, t), e.comma && (t.then.else = Z({ type: "Comma", syntax: e }, t, L));
  else for (let n = e.min || 1; n <= e.max; n++) e.comma && t !== C && (t = Z({ type: "Comma", syntax: e }, t, L)), t = Z(r, Z(C, C, t), L);
  if (e.min === 0) t = Z(C, C, t);
  else for (let n = 0; n < e.min - 1; n++) e.comma && t !== C && (t = Z({ type: "Comma", syntax: e }, t, L)), t = Z(r, t, L);
  return t;
}
__name(Kl, "Kl");
function Ur(e) {
  if (typeof e == "function") return { type: "Generic", fn: e };
  switch (e.type) {
    case "Group": {
      let t = _r(e.combinator, e.terms.map(Ur), false);
      return e.disallowEmpty && (t = Z(t, Kt, L)), t;
    }
    case "Multiplier":
      return Kl(e);
    case "Type":
    case "Property":
      return { type: e.type, name: e.name, syntax: e };
    case "Keyword":
      return { type: e.type, name: e.name.toLowerCase(), syntax: e };
    case "AtKeyword":
      return { type: e.type, name: "@" + e.name.toLowerCase(), syntax: e };
    case "Function":
      return { type: e.type, name: e.name.toLowerCase() + "(", syntax: e };
    case "String":
      return e.value.length === 3 ? { type: "Token", value: e.value.charAt(1), syntax: e } : { type: e.type, value: e.value.substr(1, e.value.length - 2).replace(/\\'/g, "'"), syntax: e };
    case "Token":
      return { type: e.type, value: e.value, syntax: e };
    case "Comma":
      return { type: e.type, syntax: e };
    default:
      throw new Error("Unknown node type:", e.type);
  }
}
__name(Ur, "Ur");
function Qt(e, t) {
  return typeof e == "string" && (e = Ge(e)), { type: "MatchGraph", match: Ur(e), syntax: t || null, source: e };
}
__name(Qt, "Qt");
var { hasOwnProperty: Ji } = Object.prototype;
var Ql = 0;
var Xl = 1;
var Hr = 2;
var oa = 3;
var ea = "Match";
var $l = "Mismatch";
var Zl = "Maximum iteration number exceeded (please fill an issue on https://github.com/csstree/csstree/issues)";
var ta = 15e3;
var Jl = 0;
function ec(e) {
  let t = null, r = null, n = e;
  for (; n !== null; ) r = n.prev, n.prev = t, t = n, n = r;
  return t;
}
__name(ec, "ec");
function jr(e, t) {
  if (e.length !== t.length) return false;
  for (let r = 0; r < e.length; r++) {
    let n = t.charCodeAt(r), o = e.charCodeAt(r);
    if (o >= 65 && o <= 90 && (o = o | 32), o !== n) return false;
  }
  return true;
}
__name(jr, "jr");
function tc(e) {
  return e.type !== 9 ? false : e.value !== "?";
}
__name(tc, "tc");
function ra(e) {
  return e === null ? true : e.type === 18 || e.type === 2 || e.type === 21 || e.type === 19 || e.type === 23 || tc(e);
}
__name(ra, "ra");
function na(e) {
  return e === null ? true : e.type === 22 || e.type === 20 || e.type === 24 || e.type === 9 && e.value === "/";
}
__name(na, "na");
function rc(e, t, r) {
  function n() {
    do
      R++, S = R < e.length ? e[R] : null;
    while (S !== null && (S.type === 13 || S.type === 25));
  }
  __name(n, "n");
  function o(ae) {
    let fe = R + ae;
    return fe < e.length ? e[fe] : null;
  }
  __name(o, "o");
  function i(ae, fe) {
    return { nextState: ae, matchStack: z, syntaxStack: p, thenStack: m, tokenIndex: R, prev: fe };
  }
  __name(i, "i");
  function s(ae) {
    m = { nextState: ae, matchStack: z, syntaxStack: p, prev: m };
  }
  __name(s, "s");
  function u(ae) {
    f = i(ae, f);
  }
  __name(u, "u");
  function c() {
    z = { type: Xl, syntax: t.syntax, token: S, prev: z }, n(), P = null, R > ke && (ke = R);
  }
  __name(c, "c");
  function a() {
    p = { syntax: t.syntax, opts: t.syntax.opts || p !== null && p.opts || null, prev: p }, z = { type: Hr, syntax: t.syntax, token: z.token, prev: z };
  }
  __name(a, "a");
  function l() {
    z.type === Hr ? z = z.prev : z = { type: oa, syntax: p.syntax, token: z.token, prev: z }, p = p.prev;
  }
  __name(l, "l");
  let p = null, m = null, f = null, P = null, te = 0, X = null, S = null, R = -1, ke = 0, z = { type: Ql, syntax: null, token: null, prev: null };
  for (n(); X === null && ++te < ta; ) switch (t.type) {
    case "Match":
      if (m === null) {
        if (S !== null && (R !== e.length - 1 || S.value !== "\\0" && S.value !== "\\9")) {
          t = L;
          break;
        }
        X = ea;
        break;
      }
      if (t = m.nextState, t === Kt) if (m.matchStack === z) {
        t = L;
        break;
      } else t = C;
      for (; m.syntaxStack !== p; ) l();
      m = m.prev;
      break;
    case "Mismatch":
      if (P !== null && P !== false) (f === null || R > f.tokenIndex) && (f = P, P = false);
      else if (f === null) {
        X = $l;
        break;
      }
      t = f.nextState, m = f.thenStack, p = f.syntaxStack, z = f.matchStack, R = f.tokenIndex, S = R < e.length ? e[R] : null, f = f.prev;
      break;
    case "MatchGraph":
      t = t.match;
      break;
    case "If":
      t.else !== L && u(t.else), t.then !== C && s(t.then), t = t.match;
      break;
    case "MatchOnce":
      t = { type: "MatchOnceBuffer", syntax: t, index: 0, mask: 0 };
      break;
    case "MatchOnceBuffer": {
      let Q = t.syntax.terms;
      if (t.index === Q.length) {
        if (t.mask === 0 || t.syntax.all) {
          t = L;
          break;
        }
        t = C;
        break;
      }
      if (t.mask === (1 << Q.length) - 1) {
        t = C;
        break;
      }
      for (; t.index < Q.length; t.index++) {
        let J = 1 << t.index;
        if ((t.mask & J) === 0) {
          u(t), s({ type: "AddMatchOnce", syntax: t.syntax, mask: t.mask | J }), t = Q[t.index++];
          break;
        }
      }
      break;
    }
    case "AddMatchOnce":
      t = { type: "MatchOnceBuffer", syntax: t.syntax, index: 0, mask: t.mask };
      break;
    case "Enum":
      if (S !== null) {
        let Q = S.value.toLowerCase();
        if (Q.indexOf("\\") !== -1 && (Q = Q.replace(/\\[09].*$/, "")), Ji.call(t.map, Q)) {
          t = t.map[Q];
          break;
        }
      }
      t = L;
      break;
    case "Generic": {
      let Q = p !== null ? p.opts : null, J = R + Math.floor(t.fn(S, o, Q));
      if (!isNaN(J) && J > R) {
        for (; R < J; ) c();
        t = C;
      } else t = L;
      break;
    }
    case "Type":
    case "Property": {
      let Q = t.type === "Type" ? "types" : "properties", J = Ji.call(r, Q) ? r[Q][t.name] : null;
      if (!J || !J.match) throw new Error("Bad syntax reference: " + (t.type === "Type" ? "<" + t.name + ">" : "<'" + t.name + "'>"));
      if (P !== false && S !== null && t.type === "Type" && (t.name === "custom-ident" && S.type === 1 || t.name === "length" && S.value === "0")) {
        P === null && (P = i(t, f)), t = L;
        break;
      }
      a(), t = J.match;
      break;
    }
    case "Keyword": {
      let Q = t.name;
      if (S !== null) {
        let J = S.value;
        if (J.indexOf("\\") !== -1 && (J = J.replace(/\\[09].*$/, "")), jr(J, Q)) {
          c(), t = C;
          break;
        }
      }
      t = L;
      break;
    }
    case "AtKeyword":
    case "Function":
      if (S !== null && jr(S.value, t.name)) {
        c(), t = C;
        break;
      }
      t = L;
      break;
    case "Token":
      if (S !== null && S.value === t.value) {
        c(), t = C;
        break;
      }
      t = L;
      break;
    case "Comma":
      S !== null && S.type === 18 ? ra(z.token) ? t = L : (c(), t = na(S) ? L : C) : t = ra(z.token) || na(S) ? C : L;
      break;
    case "String":
      let ae = "", fe = R;
      for (; fe < e.length && ae.length < t.value.length; fe++) ae += e[fe].value;
      if (jr(ae, t.value)) {
        for (; R < fe; ) c();
        t = C;
      } else t = L;
      break;
    default:
      throw new Error("Unknown node type: " + t.type);
  }
  switch (Jl += te, X) {
    case null:
      console.warn("[csstree-match] BREAK after " + ta + " iterations"), X = Zl, z = null;
      break;
    case ea:
      for (; p !== null; ) l();
      break;
    default:
      z = null;
  }
  return { tokens: e, reason: X, iterations: te, match: z, longestMatch: ke };
}
__name(rc, "rc");
function qr(e, t, r) {
  let n = rc(e, t, r || {});
  if (n.match === null) return n;
  let o = n.match, i = n.match = { syntax: t.syntax || null, match: [] }, s = [i];
  for (o = ec(o).prev; o !== null; ) {
    switch (o.type) {
      case Hr:
        i.match.push(i = { syntax: o.syntax, match: [] }), s.push(i);
        break;
      case oa:
        s.pop(), i = s[s.length - 1];
        break;
      default:
        i.match.push({ syntax: o.syntax || null, token: o.token.value, node: o.token.node });
    }
    o = o.prev;
  }
  return n;
}
__name(qr, "qr");
var Yr = {};
b(Yr, { getTrace: /* @__PURE__ */ __name(() => ia, "getTrace"), isKeyword: /* @__PURE__ */ __name(() => ic, "isKeyword"), isProperty: /* @__PURE__ */ __name(() => oc, "isProperty"), isType: /* @__PURE__ */ __name(() => nc, "isType") });
function ia(e) {
  function t(o) {
    return o === null ? false : o.type === "Type" || o.type === "Property" || o.type === "Keyword";
  }
  __name(t, "t");
  function r(o) {
    if (Array.isArray(o.match)) {
      for (let i = 0; i < o.match.length; i++) if (r(o.match[i])) return t(o.syntax) && n.unshift(o.syntax), true;
    } else if (o.node === e) return n = t(o.syntax) ? [o.syntax] : [], true;
    return false;
  }
  __name(r, "r");
  let n = null;
  return this.matched !== null && r(this.matched), n;
}
__name(ia, "ia");
function nc(e, t) {
  return Wr(this, e, (r) => r.type === "Type" && r.name === t);
}
__name(nc, "nc");
function oc(e, t) {
  return Wr(this, e, (r) => r.type === "Property" && r.name === t);
}
__name(oc, "oc");
function ic(e) {
  return Wr(this, e, (t) => t.type === "Keyword");
}
__name(ic, "ic");
function Wr(e, t, r) {
  let n = ia.call(e, t);
  return n === null ? false : n.some(r);
}
__name(Wr, "Wr");
function aa(e) {
  return "node" in e ? e.node : aa(e.match[0]);
}
__name(aa, "aa");
function sa(e) {
  return "node" in e ? e.node : sa(e.match[e.match.length - 1]);
}
__name(sa, "sa");
function Gr(e, t, r, n, o) {
  function i(u) {
    if (u.syntax !== null && u.syntax.type === n && u.syntax.name === o) {
      let c = aa(u), a = sa(u);
      e.syntax.walk(t, function(l, p, m) {
        if (l === c) {
          let f = new I();
          do {
            if (f.appendData(p.data), p.data === a) break;
            p = p.next;
          } while (p !== null);
          s.push({ parent: m, nodes: f });
        }
      });
    }
    Array.isArray(u.match) && u.match.forEach(i);
  }
  __name(i, "i");
  let s = [];
  return r.matched !== null && i(r.matched), s;
}
__name(Gr, "Gr");
var { hasOwnProperty: mt } = Object.prototype;
function Vr(e) {
  return typeof e == "number" && isFinite(e) && Math.floor(e) === e && e >= 0;
}
__name(Vr, "Vr");
function la(e) {
  return Boolean(e) && Vr(e.offset) && Vr(e.line) && Vr(e.column);
}
__name(la, "la");
function ac(e, t) {
  return function(n, o) {
    if (!n || n.constructor !== Object) return o(n, "Type of node should be an Object");
    for (let i in n) {
      let s = true;
      if (mt.call(n, i) !== false) {
        if (i === "type") n.type !== e && o(n, "Wrong node type `" + n.type + "`, expected `" + e + "`");
        else if (i === "loc") {
          if (n.loc === null) continue;
          if (n.loc && n.loc.constructor === Object) if (typeof n.loc.source != "string") i += ".source";
          else if (!la(n.loc.start)) i += ".start";
          else if (!la(n.loc.end)) i += ".end";
          else continue;
          s = false;
        } else if (t.hasOwnProperty(i)) {
          s = false;
          for (let u = 0; !s && u < t[i].length; u++) {
            let c = t[i][u];
            switch (c) {
              case String:
                s = typeof n[i] == "string";
                break;
              case Boolean:
                s = typeof n[i] == "boolean";
                break;
              case null:
                s = n[i] === null;
                break;
              default:
                typeof c == "string" ? s = n[i] && n[i].type === c : Array.isArray(c) && (s = n[i] instanceof I);
            }
          }
        } else o(n, "Unknown field `" + i + "` for " + e + " node type");
        s || o(n, "Bad value for `" + e + "." + i + "`");
      }
    }
    for (let i in t) mt.call(t, i) && mt.call(n, i) === false && o(n, "Field `" + e + "." + i + "` is missed");
  };
}
__name(ac, "ac");
function sc(e, t) {
  let r = t.structure, n = { type: String, loc: true }, o = { type: '"' + e + '"' };
  for (let i in r) {
    if (mt.call(r, i) === false) continue;
    let s = [], u = n[i] = Array.isArray(r[i]) ? r[i].slice() : [r[i]];
    for (let c = 0; c < u.length; c++) {
      let a = u[c];
      if (a === String || a === Boolean) s.push(a.name);
      else if (a === null) s.push("null");
      else if (typeof a == "string") s.push("<" + a + ">");
      else if (Array.isArray(a)) s.push("List");
      else throw new Error("Wrong value `" + a + "` in `" + e + "." + i + "` structure definition");
    }
    o[i] = s.join(" | ");
  }
  return { docs: o, check: ac(e, n) };
}
__name(sc, "sc");
function ca(e) {
  let t = {};
  if (e.node) {
    for (let r in e.node) if (mt.call(e.node, r)) {
      let n = e.node[r];
      if (n.structure) t[r] = sc(r, n);
      else throw new Error("Missed `structure` field in `" + r + "` node type definition");
    }
  }
  return t;
}
__name(ca, "ca");
var lc = Qt(Ft.join(" | "));
function Kr(e, t, r) {
  let n = {};
  for (let o in e) e[o].syntax && (n[o] = r ? e[o].syntax : Pe(e[o].syntax, { compact: t }));
  return n;
}
__name(Kr, "Kr");
function cc(e, t, r) {
  let n = {};
  for (let [o, i] of Object.entries(e)) n[o] = { prelude: i.prelude && (r ? i.prelude.syntax : Pe(i.prelude.syntax, { compact: t })), descriptors: i.descriptors && Kr(i.descriptors, t, r) };
  return n;
}
__name(cc, "cc");
function uc(e) {
  for (let t = 0; t < e.length; t++) if (e[t].value.toLowerCase() === "var(") return true;
  return false;
}
__name(uc, "uc");
function ce(e, t, r) {
  return { matched: e, iterations: r, error: t, ...Yr };
}
__name(ce, "ce");
function Ve(e, t, r, n) {
  let o = Xi(r, e.syntax), i;
  return uc(o) ? ce(null, new Error("Matching for a tree with var() is not supported")) : (n && (i = qr(o, e.cssWideKeywordsSyntax, e)), (!n || !i.match) && (i = qr(o, t.match, e), !i.match) ? ce(null, new Pi(i.reason, t.syntax, r, i), i.iterations) : ce(i.match, null, i.iterations));
}
__name(Ve, "Ve");
var Ke = class {
  static {
    __name(this, "Ke");
  }
  constructor(t, r, n) {
    if (this.cssWideKeywordsSyntax = lc, this.syntax = r, this.generic = false, this.atrules = /* @__PURE__ */ Object.create(null), this.properties = /* @__PURE__ */ Object.create(null), this.types = /* @__PURE__ */ Object.create(null), this.structure = n || ca(t), t) {
      if (t.types) for (let o in t.types) this.addType_(o, t.types[o]);
      if (t.generic) {
        this.generic = true;
        for (let o in Dr) this.addType_(o, Dr[o]);
      }
      if (t.atrules) for (let o in t.atrules) this.addAtrule_(o, t.atrules[o]);
      if (t.properties) for (let o in t.properties) this.addProperty_(o, t.properties[o]);
    }
  }
  checkStructure(t) {
    function r(i, s) {
      o.push({ node: i, message: s });
    }
    __name(r, "r");
    let n = this.structure, o = [];
    return this.syntax.walk(t, function(i) {
      n.hasOwnProperty(i.type) ? n[i.type].check(i, r) : r(i, "Unknown node type `" + i.type + "`");
    }), o.length ? o : false;
  }
  createDescriptor(t, r, n, o = null) {
    let i = { type: r, name: n }, s = { type: r, name: n, parent: o, serializable: typeof t == "string" || t && typeof t.type == "string", syntax: null, match: null };
    return typeof t == "function" ? s.match = Qt(t, i) : (typeof t == "string" ? Object.defineProperty(s, "syntax", { get() {
      return Object.defineProperty(s, "syntax", { value: Ge(t) }), s.syntax;
    } }) : s.syntax = t, Object.defineProperty(s, "match", { get() {
      return Object.defineProperty(s, "match", { value: Qt(s.syntax, i) }), s.match;
    } })), s;
  }
  addAtrule_(t, r) {
    !r || (this.atrules[t] = { type: "Atrule", name: t, prelude: r.prelude ? this.createDescriptor(r.prelude, "AtrulePrelude", t) : null, descriptors: r.descriptors ? Object.keys(r.descriptors).reduce((n, o) => (n[o] = this.createDescriptor(r.descriptors[o], "AtruleDescriptor", o, t), n), /* @__PURE__ */ Object.create(null)) : null });
  }
  addProperty_(t, r) {
    !r || (this.properties[t] = this.createDescriptor(r, "Property", t));
  }
  addType_(t, r) {
    !r || (this.types[t] = this.createDescriptor(r, "Type", t));
  }
  checkAtruleName(t) {
    if (!this.getAtrule(t)) return new je("Unknown at-rule", "@" + t);
  }
  checkAtrulePrelude(t, r) {
    let n = this.checkAtruleName(t);
    if (n) return n;
    let o = this.getAtrule(t);
    if (!o.prelude && r) return new SyntaxError("At-rule `@" + t + "` should not contain a prelude");
    if (o.prelude && !r && !Ve(this, o.prelude, "", false).matched) return new SyntaxError("At-rule `@" + t + "` should contain a prelude");
  }
  checkAtruleDescriptorName(t, r) {
    let n = this.checkAtruleName(t);
    if (n) return n;
    let o = this.getAtrule(t), i = Mt(r);
    if (!o.descriptors) return new SyntaxError("At-rule `@" + t + "` has no known descriptors");
    if (!o.descriptors[i.name] && !o.descriptors[i.basename]) return new je("Unknown at-rule descriptor", r);
  }
  checkPropertyName(t) {
    if (!this.getProperty(t)) return new je("Unknown property", t);
  }
  matchAtrulePrelude(t, r) {
    let n = this.checkAtrulePrelude(t, r);
    if (n) return ce(null, n);
    let o = this.getAtrule(t);
    return o.prelude ? Ve(this, o.prelude, r || "", false) : ce(null, null);
  }
  matchAtruleDescriptor(t, r, n) {
    let o = this.checkAtruleDescriptorName(t, r);
    if (o) return ce(null, o);
    let i = this.getAtrule(t), s = Mt(r);
    return Ve(this, i.descriptors[s.name] || i.descriptors[s.basename], n, false);
  }
  matchDeclaration(t) {
    return t.type !== "Declaration" ? ce(null, new Error("Not a Declaration node")) : this.matchProperty(t.property, t.value);
  }
  matchProperty(t, r) {
    if (vr(t).custom) return ce(null, new Error("Lexer matching doesn't applicable for custom properties"));
    let n = this.checkPropertyName(t);
    return n ? ce(null, n) : Ve(this, this.getProperty(t), r, true);
  }
  matchType(t, r) {
    let n = this.getType(t);
    return n ? Ve(this, n, r, false) : ce(null, new je("Unknown type", t));
  }
  match(t, r) {
    return typeof t != "string" && (!t || !t.type) ? ce(null, new je("Bad syntax")) : ((typeof t == "string" || !t.match) && (t = this.createDescriptor(t, "Type", "anonymous")), Ve(this, t, r, false));
  }
  findValueFragments(t, r, n, o) {
    return Gr(this, r, this.matchProperty(t, r), n, o);
  }
  findDeclarationValueFragments(t, r, n) {
    return Gr(this, t.value, this.matchDeclaration(t), r, n);
  }
  findAllFragments(t, r, n) {
    let o = [];
    return this.syntax.walk(t, { visit: "Declaration", enter: /* @__PURE__ */ __name((i) => {
      o.push.apply(o, this.findDeclarationValueFragments(i, r, n));
    }, "enter") }), o;
  }
  getAtrule(t, r = true) {
    let n = Mt(t);
    return (n.vendor && r ? this.atrules[n.name] || this.atrules[n.basename] : this.atrules[n.name]) || null;
  }
  getAtrulePrelude(t, r = true) {
    let n = this.getAtrule(t, r);
    return n && n.prelude || null;
  }
  getAtruleDescriptor(t, r) {
    return this.atrules.hasOwnProperty(t) && this.atrules.declarators && this.atrules[t].declarators[r] || null;
  }
  getProperty(t, r = true) {
    let n = vr(t);
    return (n.vendor && r ? this.properties[n.name] || this.properties[n.basename] : this.properties[n.name]) || null;
  }
  getType(t) {
    return hasOwnProperty.call(this.types, t) ? this.types[t] : null;
  }
  validate() {
    function t(o, i, s, u) {
      if (s.has(i)) return s.get(i);
      s.set(i, false), u.syntax !== null && Vt(u.syntax, function(c) {
        if (c.type !== "Type" && c.type !== "Property") return;
        let a = c.type === "Type" ? o.types : o.properties, l = c.type === "Type" ? r : n;
        (!hasOwnProperty.call(a, c.name) || t(o, c.name, l, a[c.name])) && s.set(i, true);
      }, this);
    }
    __name(t, "t");
    let r = /* @__PURE__ */ new Map(), n = /* @__PURE__ */ new Map();
    for (let o in this.types) t(this, o, r, this.types[o]);
    for (let o in this.properties) t(this, o, n, this.properties[o]);
    return r = [...r.keys()].filter((o) => r.get(o)), n = [...n.keys()].filter((o) => n.get(o)), r.length || n.length ? { types: r, properties: n } : null;
  }
  dump(t, r) {
    return { generic: this.generic, types: Kr(this.types, !r, t), properties: Kr(this.properties, !r, t), atrules: cc(this.atrules, !r, t) };
  }
  toString() {
    return JSON.stringify(this.dump());
  }
};
var { hasOwnProperty: Qe } = Object.prototype;
var pc = { generic: true, types: Qr, atrules: { prelude: pa, descriptors: pa }, properties: Qr, parseContext: hc, scope: ma, atrule: ["parse"], pseudo: ["parse"], node: ["name", "structure", "parse", "generate", "walkContext"] };
function Xt(e) {
  return e && e.constructor === Object;
}
__name(Xt, "Xt");
function ha(e) {
  return Xt(e) ? { ...e } : e;
}
__name(ha, "ha");
function hc(e, t) {
  return Object.assign(e, t);
}
__name(hc, "hc");
function ma(e, t) {
  for (let r in t) Qe.call(t, r) && (Xt(e[r]) ? ma(e[r], t[r]) : e[r] = ha(t[r]));
  return e;
}
__name(ma, "ma");
function ua(e, t) {
  return typeof t == "string" && /^\s*\|/.test(t) ? typeof e == "string" ? e + t : t.replace(/^\s*\|\s*/, "") : t || null;
}
__name(ua, "ua");
function Qr(e, t) {
  if (typeof t == "string") return ua(e, t);
  let r = { ...e };
  for (let n in t) Qe.call(t, n) && (r[n] = ua(Qe.call(e, n) ? e[n] : void 0, t[n]));
  return r;
}
__name(Qr, "Qr");
function pa(e, t) {
  let r = Qr(e, t);
  return !Xt(r) || Object.keys(r).length ? r : null;
}
__name(pa, "pa");
function ft(e, t, r) {
  for (let n in r) if (Qe.call(r, n) !== false) {
    if (r[n] === true) Qe.call(t, n) && (e[n] = ha(t[n]));
    else if (r[n]) {
      if (typeof r[n] == "function") {
        let o = r[n];
        e[n] = o({}, e[n]), e[n] = o(e[n] || {}, t[n]);
      } else if (Xt(r[n])) {
        let o = {};
        for (let i in e[n]) o[i] = ft({}, e[n][i], r[n]);
        for (let i in t[n]) o[i] = ft(o[i] || {}, t[n][i], r[n]);
        e[n] = o;
      } else if (Array.isArray(r[n])) {
        let o = {}, i = r[n].reduce(function(s, u) {
          return s[u] = true, s;
        }, {});
        for (let [s, u] of Object.entries(e[n] || {})) o[s] = {}, u && ft(o[s], u, i);
        for (let s in t[n]) Qe.call(t[n], s) && (o[s] || (o[s] = {}), t[n] && t[n][s] && ft(o[s], t[n][s], i));
        e[n] = o;
      }
    }
  }
  return e;
}
__name(ft, "ft");
var $t = /* @__PURE__ */ __name((e, t) => ft(e, t, pc), "$t");
function fa(e) {
  let t = Xo(e), r = Ei(e), n = wi(e), { fromPlainObject: o, toPlainObject: i } = vi(r), s = { lexer: null, createLexer: /* @__PURE__ */ __name((u) => new Ke(u, s, s.lexer.structure), "createLexer"), tokenize: ve, parse: t, generate: n, walk: r, find: r.find, findLast: r.findLast, findAll: r.findAll, fromPlainObject: o, toPlainObject: i, fork(u) {
    let c = $t({}, e);
    return fa(typeof u == "function" ? u(c, Object.assign) : $t(c, u));
  } };
  return s.lexer = new Ke({ generic: true, types: e.types, atrules: e.atrules, properties: e.properties, node: e.node }, s), s;
}
__name(fa, "fa");
var Xr = /* @__PURE__ */ __name((e) => fa($t({}, e)), "Xr");
var da = { generic: true, types: { "absolute-size": "xx-small|x-small|small|medium|large|x-large|xx-large|xxx-large", "alpha-value": "<number>|<percentage>", "angle-percentage": "<angle>|<percentage>", "angular-color-hint": "<angle-percentage>", "angular-color-stop": "<color>&&<color-stop-angle>?", "angular-color-stop-list": "[<angular-color-stop> [, <angular-color-hint>]?]# , <angular-color-stop>", "animateable-feature": "scroll-position|contents|<custom-ident>", attachment: "scroll|fixed|local", "attr()": "attr( <attr-name> <type-or-unit>? [, <attr-fallback>]? )", "attr-matcher": "['~'|'|'|'^'|'$'|'*']? '='", "attr-modifier": "i|s", "attribute-selector": "'[' <wq-name> ']'|'[' <wq-name> <attr-matcher> [<string-token>|<ident-token>] <attr-modifier>? ']'", "auto-repeat": "repeat( [auto-fill|auto-fit] , [<line-names>? <fixed-size>]+ <line-names>? )", "auto-track-list": "[<line-names>? [<fixed-size>|<fixed-repeat>]]* <line-names>? <auto-repeat> [<line-names>? [<fixed-size>|<fixed-repeat>]]* <line-names>?", "baseline-position": "[first|last]? baseline", "basic-shape": "<inset()>|<circle()>|<ellipse()>|<polygon()>|<path()>", "bg-image": "none|<image>", "bg-layer": "<bg-image>||<bg-position> [/ <bg-size>]?||<repeat-style>||<attachment>||<box>||<box>", "bg-position": "[[left|center|right|top|bottom|<length-percentage>]|[left|center|right|<length-percentage>] [top|center|bottom|<length-percentage>]|[center|[left|right] <length-percentage>?]&&[center|[top|bottom] <length-percentage>?]]", "bg-size": "[<length-percentage>|auto]{1,2}|cover|contain", "blur()": "blur( <length> )", "blend-mode": "normal|multiply|screen|overlay|darken|lighten|color-dodge|color-burn|hard-light|soft-light|difference|exclusion|hue|saturation|color|luminosity", box: "border-box|padding-box|content-box", "brightness()": "brightness( <number-percentage> )", "calc()": "calc( <calc-sum> )", "calc-sum": "<calc-product> [['+'|'-'] <calc-product>]*", "calc-product": "<calc-value> ['*' <calc-value>|'/' <number>]*", "calc-value": "<number>|<dimension>|<percentage>|( <calc-sum> )", "cf-final-image": "<image>|<color>", "cf-mixing-image": "<percentage>?&&<image>", "circle()": "circle( [<shape-radius>]? [at <position>]? )", "clamp()": "clamp( <calc-sum>#{3} )", "class-selector": "'.' <ident-token>", "clip-source": "<url>", color: "<rgb()>|<rgba()>|<hsl()>|<hsla()>|<hwb()>|<lab()>|<lch()>|<hex-color>|<named-color>|currentcolor|<deprecated-system-color>", "color-stop": "<color-stop-length>|<color-stop-angle>", "color-stop-angle": "<angle-percentage>{1,2}", "color-stop-length": "<length-percentage>{1,2}", "color-stop-list": "[<linear-color-stop> [, <linear-color-hint>]?]# , <linear-color-stop>", combinator: "'>'|'+'|'~'|['||']", "common-lig-values": "[common-ligatures|no-common-ligatures]", "compat-auto": "searchfield|textarea|push-button|slider-horizontal|checkbox|radio|square-button|menulist|listbox|meter|progress-bar|button", "composite-style": "clear|copy|source-over|source-in|source-out|source-atop|destination-over|destination-in|destination-out|destination-atop|xor", "compositing-operator": "add|subtract|intersect|exclude", "compound-selector": "[<type-selector>? <subclass-selector>* [<pseudo-element-selector> <pseudo-class-selector>*]*]!", "compound-selector-list": "<compound-selector>#", "complex-selector": "<compound-selector> [<combinator>? <compound-selector>]*", "complex-selector-list": "<complex-selector>#", "conic-gradient()": "conic-gradient( [from <angle>]? [at <position>]? , <angular-color-stop-list> )", "contextual-alt-values": "[contextual|no-contextual]", "content-distribution": "space-between|space-around|space-evenly|stretch", "content-list": "[<string>|contents|<image>|<counter>|<quote>|<target>|<leader()>|<attr()>]+", "content-position": "center|start|end|flex-start|flex-end", "content-replacement": "<image>", "contrast()": "contrast( [<number-percentage>] )", counter: "<counter()>|<counters()>", "counter()": "counter( <counter-name> , <counter-style>? )", "counter-name": "<custom-ident>", "counter-style": "<counter-style-name>|symbols( )", "counter-style-name": "<custom-ident>", "counters()": "counters( <counter-name> , <string> , <counter-style>? )", "cross-fade()": "cross-fade( <cf-mixing-image> , <cf-final-image>? )", "cubic-bezier-timing-function": "ease|ease-in|ease-out|ease-in-out|cubic-bezier( <number [0,1]> , <number> , <number [0,1]> , <number> )", "deprecated-system-color": "ActiveBorder|ActiveCaption|AppWorkspace|Background|ButtonFace|ButtonHighlight|ButtonShadow|ButtonText|CaptionText|GrayText|Highlight|HighlightText|InactiveBorder|InactiveCaption|InactiveCaptionText|InfoBackground|InfoText|Menu|MenuText|Scrollbar|ThreeDDarkShadow|ThreeDFace|ThreeDHighlight|ThreeDLightShadow|ThreeDShadow|Window|WindowFrame|WindowText", "discretionary-lig-values": "[discretionary-ligatures|no-discretionary-ligatures]", "display-box": "contents|none", "display-inside": "flow|flow-root|table|flex|grid|ruby", "display-internal": "table-row-group|table-header-group|table-footer-group|table-row|table-cell|table-column-group|table-column|table-caption|ruby-base|ruby-text|ruby-base-container|ruby-text-container", "display-legacy": "inline-block|inline-list-item|inline-table|inline-flex|inline-grid", "display-listitem": "<display-outside>?&&[flow|flow-root]?&&list-item", "display-outside": "block|inline|run-in", "drop-shadow()": "drop-shadow( <length>{2,3} <color>? )", "east-asian-variant-values": "[jis78|jis83|jis90|jis04|simplified|traditional]", "east-asian-width-values": "[full-width|proportional-width]", "element()": "element( <custom-ident> , [first|start|last|first-except]? )|element( <id-selector> )", "ellipse()": "ellipse( [<shape-radius>{2}]? [at <position>]? )", "ending-shape": "circle|ellipse", "env()": "env( <custom-ident> , <declaration-value>? )", "explicit-track-list": "[<line-names>? <track-size>]+ <line-names>?", "family-name": "<string>|<custom-ident>+", "feature-tag-value": "<string> [<integer>|on|off]?", "feature-type": "@stylistic|@historical-forms|@styleset|@character-variant|@swash|@ornaments|@annotation", "feature-value-block": "<feature-type> '{' <feature-value-declaration-list> '}'", "feature-value-block-list": "<feature-value-block>+", "feature-value-declaration": "<custom-ident> : <integer>+ ;", "feature-value-declaration-list": "<feature-value-declaration>", "feature-value-name": "<custom-ident>", "fill-rule": "nonzero|evenodd", "filter-function": "<blur()>|<brightness()>|<contrast()>|<drop-shadow()>|<grayscale()>|<hue-rotate()>|<invert()>|<opacity()>|<saturate()>|<sepia()>", "filter-function-list": "[<filter-function>|<url>]+", "final-bg-layer": "<'background-color'>||<bg-image>||<bg-position> [/ <bg-size>]?||<repeat-style>||<attachment>||<box>||<box>", "fit-content()": "fit-content( [<length>|<percentage>] )", "fixed-breadth": "<length-percentage>", "fixed-repeat": "repeat( [<integer [1,\u221E]>] , [<line-names>? <fixed-size>]+ <line-names>? )", "fixed-size": "<fixed-breadth>|minmax( <fixed-breadth> , <track-breadth> )|minmax( <inflexible-breadth> , <fixed-breadth> )", "font-stretch-absolute": "normal|ultra-condensed|extra-condensed|condensed|semi-condensed|semi-expanded|expanded|extra-expanded|ultra-expanded|<percentage>", "font-variant-css21": "[normal|small-caps]", "font-weight-absolute": "normal|bold|<number [1,1000]>", "frequency-percentage": "<frequency>|<percentage>", "general-enclosed": "[<function-token> <any-value> )]|( <ident> <any-value> )", "generic-family": "serif|sans-serif|cursive|fantasy|monospace|-apple-system", "generic-name": "serif|sans-serif|cursive|fantasy|monospace", "geometry-box": "<shape-box>|fill-box|stroke-box|view-box", gradient: "<linear-gradient()>|<repeating-linear-gradient()>|<radial-gradient()>|<repeating-radial-gradient()>|<conic-gradient()>|<repeating-conic-gradient()>|<-legacy-gradient>", "grayscale()": "grayscale( <number-percentage> )", "grid-line": "auto|<custom-ident>|[<integer>&&<custom-ident>?]|[span&&[<integer>||<custom-ident>]]", "historical-lig-values": "[historical-ligatures|no-historical-ligatures]", "hsl()": "hsl( <hue> <percentage> <percentage> [/ <alpha-value>]? )|hsl( <hue> , <percentage> , <percentage> , <alpha-value>? )", "hsla()": "hsla( <hue> <percentage> <percentage> [/ <alpha-value>]? )|hsla( <hue> , <percentage> , <percentage> , <alpha-value>? )", hue: "<number>|<angle>", "hue-rotate()": "hue-rotate( <angle> )", "hwb()": "hwb( [<hue>|none] [<percentage>|none] [<percentage>|none] [/ [<alpha-value>|none]]? )", image: "<url>|<image()>|<image-set()>|<element()>|<paint()>|<cross-fade()>|<gradient>", "image()": "image( <image-tags>? [<image-src>? , <color>?]! )", "image-set()": "image-set( <image-set-option># )", "image-set-option": "[<image>|<string>] [<resolution>||type( <string> )]", "image-src": "<url>|<string>", "image-tags": "ltr|rtl", "inflexible-breadth": "<length>|<percentage>|min-content|max-content|auto", "inset()": "inset( <length-percentage>{1,4} [round <'border-radius'>]? )", "invert()": "invert( <number-percentage> )", "keyframes-name": "<custom-ident>|<string>", "keyframe-block": "<keyframe-selector># { <declaration-list> }", "keyframe-block-list": "<keyframe-block>+", "keyframe-selector": "from|to|<percentage>", "layer()": "layer( <layer-name> )", "layer-name": "<ident> ['.' <ident>]*", "leader()": "leader( <leader-type> )", "leader-type": "dotted|solid|space|<string>", "length-percentage": "<length>|<percentage>", "line-names": "'[' <custom-ident>* ']'", "line-name-list": "[<line-names>|<name-repeat>]+", "line-style": "none|hidden|dotted|dashed|solid|double|groove|ridge|inset|outset", "line-width": "<length>|thin|medium|thick", "linear-color-hint": "<length-percentage>", "linear-color-stop": "<color> <color-stop-length>?", "linear-gradient()": "linear-gradient( [<angle>|to <side-or-corner>]? , <color-stop-list> )", "mask-layer": "<mask-reference>||<position> [/ <bg-size>]?||<repeat-style>||<geometry-box>||[<geometry-box>|no-clip]||<compositing-operator>||<masking-mode>", "mask-position": "[<length-percentage>|left|center|right] [<length-percentage>|top|center|bottom]?", "mask-reference": "none|<image>|<mask-source>", "mask-source": "<url>", "masking-mode": "alpha|luminance|match-source", "matrix()": "matrix( <number>#{6} )", "matrix3d()": "matrix3d( <number>#{16} )", "max()": "max( <calc-sum># )", "media-and": "<media-in-parens> [and <media-in-parens>]+", "media-condition": "<media-not>|<media-and>|<media-or>|<media-in-parens>", "media-condition-without-or": "<media-not>|<media-and>|<media-in-parens>", "media-feature": "( [<mf-plain>|<mf-boolean>|<mf-range>] )", "media-in-parens": "( <media-condition> )|<media-feature>|<general-enclosed>", "media-not": "not <media-in-parens>", "media-or": "<media-in-parens> [or <media-in-parens>]+", "media-query": "<media-condition>|[not|only]? <media-type> [and <media-condition-without-or>]?", "media-query-list": "<media-query>#", "media-type": "<ident>", "mf-boolean": "<mf-name>", "mf-name": "<ident>", "mf-plain": "<mf-name> : <mf-value>", "mf-range": "<mf-name> ['<'|'>']? '='? <mf-value>|<mf-value> ['<'|'>']? '='? <mf-name>|<mf-value> '<' '='? <mf-name> '<' '='? <mf-value>|<mf-value> '>' '='? <mf-name> '>' '='? <mf-value>", "mf-value": "<number>|<dimension>|<ident>|<ratio>", "min()": "min( <calc-sum># )", "minmax()": "minmax( [<length>|<percentage>|min-content|max-content|auto] , [<length>|<percentage>|<flex>|min-content|max-content|auto] )", "name-repeat": "repeat( [<integer [1,\u221E]>|auto-fill] , <line-names>+ )", "named-color": "transparent|aliceblue|antiquewhite|aqua|aquamarine|azure|beige|bisque|black|blanchedalmond|blue|blueviolet|brown|burlywood|cadetblue|chartreuse|chocolate|coral|cornflowerblue|cornsilk|crimson|cyan|darkblue|darkcyan|darkgoldenrod|darkgray|darkgreen|darkgrey|darkkhaki|darkmagenta|darkolivegreen|darkorange|darkorchid|darkred|darksalmon|darkseagreen|darkslateblue|darkslategray|darkslategrey|darkturquoise|darkviolet|deeppink|deepskyblue|dimgray|dimgrey|dodgerblue|firebrick|floralwhite|forestgreen|fuchsia|gainsboro|ghostwhite|gold|goldenrod|gray|green|greenyellow|grey|honeydew|hotpink|indianred|indigo|ivory|khaki|lavender|lavenderblush|lawngreen|lemonchiffon|lightblue|lightcoral|lightcyan|lightgoldenrodyellow|lightgray|lightgreen|lightgrey|lightpink|lightsalmon|lightseagreen|lightskyblue|lightslategray|lightslategrey|lightsteelblue|lightyellow|lime|limegreen|linen|magenta|maroon|mediumaquamarine|mediumblue|mediumorchid|mediumpurple|mediumseagreen|mediumslateblue|mediumspringgreen|mediumturquoise|mediumvioletred|midnightblue|mintcream|mistyrose|moccasin|navajowhite|navy|oldlace|olive|olivedrab|orange|orangered|orchid|palegoldenrod|palegreen|paleturquoise|palevioletred|papayawhip|peachpuff|peru|pink|plum|powderblue|purple|rebeccapurple|red|rosybrown|royalblue|saddlebrown|salmon|sandybrown|seagreen|seashell|sienna|silver|skyblue|slateblue|slategray|slategrey|snow|springgreen|steelblue|tan|teal|thistle|tomato|turquoise|violet|wheat|white|whitesmoke|yellow|yellowgreen|<-non-standard-color>", "namespace-prefix": "<ident>", "ns-prefix": "[<ident-token>|'*']? '|'", "number-percentage": "<number>|<percentage>", "numeric-figure-values": "[lining-nums|oldstyle-nums]", "numeric-fraction-values": "[diagonal-fractions|stacked-fractions]", "numeric-spacing-values": "[proportional-nums|tabular-nums]", nth: "<an-plus-b>|even|odd", "opacity()": "opacity( [<number-percentage>] )", "overflow-position": "unsafe|safe", "outline-radius": "<length>|<percentage>", "page-body": "<declaration>? [; <page-body>]?|<page-margin-box> <page-body>", "page-margin-box": "<page-margin-box-type> '{' <declaration-list> '}'", "page-margin-box-type": "@top-left-corner|@top-left|@top-center|@top-right|@top-right-corner|@bottom-left-corner|@bottom-left|@bottom-center|@bottom-right|@bottom-right-corner|@left-top|@left-middle|@left-bottom|@right-top|@right-middle|@right-bottom", "page-selector-list": "[<page-selector>#]?", "page-selector": "<pseudo-page>+|<ident> <pseudo-page>*", "page-size": "A5|A4|A3|B5|B4|JIS-B5|JIS-B4|letter|legal|ledger", "path()": "path( [<fill-rule> ,]? <string> )", "paint()": "paint( <ident> , <declaration-value>? )", "perspective()": "perspective( <length> )", "polygon()": "polygon( <fill-rule>? , [<length-percentage> <length-percentage>]# )", position: "[[left|center|right]||[top|center|bottom]|[left|center|right|<length-percentage>] [top|center|bottom|<length-percentage>]?|[[left|right] <length-percentage>]&&[[top|bottom] <length-percentage>]]", "pseudo-class-selector": "':' <ident-token>|':' <function-token> <any-value> ')'", "pseudo-element-selector": "':' <pseudo-class-selector>", "pseudo-page": ": [left|right|first|blank]", quote: "open-quote|close-quote|no-open-quote|no-close-quote", "radial-gradient()": "radial-gradient( [<ending-shape>||<size>]? [at <position>]? , <color-stop-list> )", "relative-selector": "<combinator>? <complex-selector>", "relative-selector-list": "<relative-selector>#", "relative-size": "larger|smaller", "repeat-style": "repeat-x|repeat-y|[repeat|space|round|no-repeat]{1,2}", "repeating-conic-gradient()": "repeating-conic-gradient( [from <angle>]? [at <position>]? , <angular-color-stop-list> )", "repeating-linear-gradient()": "repeating-linear-gradient( [<angle>|to <side-or-corner>]? , <color-stop-list> )", "repeating-radial-gradient()": "repeating-radial-gradient( [<ending-shape>||<size>]? [at <position>]? , <color-stop-list> )", "rgb()": "rgb( <percentage>{3} [/ <alpha-value>]? )|rgb( <number>{3} [/ <alpha-value>]? )|rgb( <percentage>#{3} , <alpha-value>? )|rgb( <number>#{3} , <alpha-value>? )", "rgba()": "rgba( <percentage>{3} [/ <alpha-value>]? )|rgba( <number>{3} [/ <alpha-value>]? )|rgba( <percentage>#{3} , <alpha-value>? )|rgba( <number>#{3} , <alpha-value>? )", "rotate()": "rotate( [<angle>|<zero>] )", "rotate3d()": "rotate3d( <number> , <number> , <number> , [<angle>|<zero>] )", "rotateX()": "rotateX( [<angle>|<zero>] )", "rotateY()": "rotateY( [<angle>|<zero>] )", "rotateZ()": "rotateZ( [<angle>|<zero>] )", "saturate()": "saturate( <number-percentage> )", "scale()": "scale( <number> , <number>? )", "scale3d()": "scale3d( <number> , <number> , <number> )", "scaleX()": "scaleX( <number> )", "scaleY()": "scaleY( <number> )", "scaleZ()": "scaleZ( <number> )", "self-position": "center|start|end|self-start|self-end|flex-start|flex-end", "shape-radius": "<length-percentage>|closest-side|farthest-side", "skew()": "skew( [<angle>|<zero>] , [<angle>|<zero>]? )", "skewX()": "skewX( [<angle>|<zero>] )", "skewY()": "skewY( [<angle>|<zero>] )", "sepia()": "sepia( <number-percentage> )", shadow: "inset?&&<length>{2,4}&&<color>?", "shadow-t": "[<length>{2,3}&&<color>?]", shape: "rect( <top> , <right> , <bottom> , <left> )|rect( <top> <right> <bottom> <left> )", "shape-box": "<box>|margin-box", "side-or-corner": "[left|right]||[top|bottom]", "single-animation": "<time>||<easing-function>||<time>||<single-animation-iteration-count>||<single-animation-direction>||<single-animation-fill-mode>||<single-animation-play-state>||[none|<keyframes-name>]", "single-animation-direction": "normal|reverse|alternate|alternate-reverse", "single-animation-fill-mode": "none|forwards|backwards|both", "single-animation-iteration-count": "infinite|<number>", "single-animation-play-state": "running|paused", "single-animation-timeline": "auto|none|<timeline-name>", "single-transition": "[none|<single-transition-property>]||<time>||<easing-function>||<time>", "single-transition-property": "all|<custom-ident>", size: "closest-side|farthest-side|closest-corner|farthest-corner|<length>|<length-percentage>{2}", "step-position": "jump-start|jump-end|jump-none|jump-both|start|end", "step-timing-function": "step-start|step-end|steps( <integer> [, <step-position>]? )", "subclass-selector": "<id-selector>|<class-selector>|<attribute-selector>|<pseudo-class-selector>", "supports-condition": "not <supports-in-parens>|<supports-in-parens> [and <supports-in-parens>]*|<supports-in-parens> [or <supports-in-parens>]*", "supports-in-parens": "( <supports-condition> )|<supports-feature>|<general-enclosed>", "supports-feature": "<supports-decl>|<supports-selector-fn>", "supports-decl": "( <declaration> )", "supports-selector-fn": "selector( <complex-selector> )", symbol: "<string>|<image>|<custom-ident>", target: "<target-counter()>|<target-counters()>|<target-text()>", "target-counter()": "target-counter( [<string>|<url>] , <custom-ident> , <counter-style>? )", "target-counters()": "target-counters( [<string>|<url>] , <custom-ident> , <string> , <counter-style>? )", "target-text()": "target-text( [<string>|<url>] , [content|before|after|first-letter]? )", "time-percentage": "<time>|<percentage>", "timeline-name": "<custom-ident>|<string>", "easing-function": "linear|<cubic-bezier-timing-function>|<step-timing-function>", "track-breadth": "<length-percentage>|<flex>|min-content|max-content|auto", "track-list": "[<line-names>? [<track-size>|<track-repeat>]]+ <line-names>?", "track-repeat": "repeat( [<integer [1,\u221E]>] , [<line-names>? <track-size>]+ <line-names>? )", "track-size": "<track-breadth>|minmax( <inflexible-breadth> , <track-breadth> )|fit-content( [<length>|<percentage>] )", "transform-function": "<matrix()>|<translate()>|<translateX()>|<translateY()>|<scale()>|<scaleX()>|<scaleY()>|<rotate()>|<skew()>|<skewX()>|<skewY()>|<matrix3d()>|<translate3d()>|<translateZ()>|<scale3d()>|<scaleZ()>|<rotate3d()>|<rotateX()>|<rotateY()>|<rotateZ()>|<perspective()>", "transform-list": "<transform-function>+", "translate()": "translate( <length-percentage> , <length-percentage>? )", "translate3d()": "translate3d( <length-percentage> , <length-percentage> , <length> )", "translateX()": "translateX( <length-percentage> )", "translateY()": "translateY( <length-percentage> )", "translateZ()": "translateZ( <length> )", "type-or-unit": "string|color|url|integer|number|length|angle|time|frequency|cap|ch|em|ex|ic|lh|rlh|rem|vb|vi|vw|vh|vmin|vmax|mm|Q|cm|in|pt|pc|px|deg|grad|rad|turn|ms|s|Hz|kHz|%", "type-selector": "<wq-name>|<ns-prefix>? '*'", "var()": "var( <custom-property-name> , <declaration-value>? )", "viewport-length": "auto|<length-percentage>", "visual-box": "content-box|padding-box|border-box", "wq-name": "<ns-prefix>? <ident-token>", "-legacy-gradient": "<-webkit-gradient()>|<-legacy-linear-gradient>|<-legacy-repeating-linear-gradient>|<-legacy-radial-gradient>|<-legacy-repeating-radial-gradient>", "-legacy-linear-gradient": "-moz-linear-gradient( <-legacy-linear-gradient-arguments> )|-webkit-linear-gradient( <-legacy-linear-gradient-arguments> )|-o-linear-gradient( <-legacy-linear-gradient-arguments> )", "-legacy-repeating-linear-gradient": "-moz-repeating-linear-gradient( <-legacy-linear-gradient-arguments> )|-webkit-repeating-linear-gradient( <-legacy-linear-gradient-arguments> )|-o-repeating-linear-gradient( <-legacy-linear-gradient-arguments> )", "-legacy-linear-gradient-arguments": "[<angle>|<side-or-corner>]? , <color-stop-list>", "-legacy-radial-gradient": "-moz-radial-gradient( <-legacy-radial-gradient-arguments> )|-webkit-radial-gradient( <-legacy-radial-gradient-arguments> )|-o-radial-gradient( <-legacy-radial-gradient-arguments> )", "-legacy-repeating-radial-gradient": "-moz-repeating-radial-gradient( <-legacy-radial-gradient-arguments> )|-webkit-repeating-radial-gradient( <-legacy-radial-gradient-arguments> )|-o-repeating-radial-gradient( <-legacy-radial-gradient-arguments> )", "-legacy-radial-gradient-arguments": "[<position> ,]? [[[<-legacy-radial-gradient-shape>||<-legacy-radial-gradient-size>]|[<length>|<percentage>]{2}] ,]? <color-stop-list>", "-legacy-radial-gradient-size": "closest-side|closest-corner|farthest-side|farthest-corner|contain|cover", "-legacy-radial-gradient-shape": "circle|ellipse", "-non-standard-font": "-apple-system-body|-apple-system-headline|-apple-system-subheadline|-apple-system-caption1|-apple-system-caption2|-apple-system-footnote|-apple-system-short-body|-apple-system-short-headline|-apple-system-short-subheadline|-apple-system-short-caption1|-apple-system-short-footnote|-apple-system-tall-body", "-non-standard-color": "-moz-ButtonDefault|-moz-ButtonHoverFace|-moz-ButtonHoverText|-moz-CellHighlight|-moz-CellHighlightText|-moz-Combobox|-moz-ComboboxText|-moz-Dialog|-moz-DialogText|-moz-dragtargetzone|-moz-EvenTreeRow|-moz-Field|-moz-FieldText|-moz-html-CellHighlight|-moz-html-CellHighlightText|-moz-mac-accentdarkestshadow|-moz-mac-accentdarkshadow|-moz-mac-accentface|-moz-mac-accentlightesthighlight|-moz-mac-accentlightshadow|-moz-mac-accentregularhighlight|-moz-mac-accentregularshadow|-moz-mac-chrome-active|-moz-mac-chrome-inactive|-moz-mac-focusring|-moz-mac-menuselect|-moz-mac-menushadow|-moz-mac-menutextselect|-moz-MenuHover|-moz-MenuHoverText|-moz-MenuBarText|-moz-MenuBarHoverText|-moz-nativehyperlinktext|-moz-OddTreeRow|-moz-win-communicationstext|-moz-win-mediatext|-moz-activehyperlinktext|-moz-default-background-color|-moz-default-color|-moz-hyperlinktext|-moz-visitedhyperlinktext|-webkit-activelink|-webkit-focus-ring-color|-webkit-link|-webkit-text", "-non-standard-image-rendering": "optimize-contrast|-moz-crisp-edges|-o-crisp-edges|-webkit-optimize-contrast", "-non-standard-overflow": "-moz-scrollbars-none|-moz-scrollbars-horizontal|-moz-scrollbars-vertical|-moz-hidden-unscrollable", "-non-standard-width": "fill-available|min-intrinsic|intrinsic|-moz-available|-moz-fit-content|-moz-min-content|-moz-max-content|-webkit-min-content|-webkit-max-content", "-webkit-gradient()": "-webkit-gradient( <-webkit-gradient-type> , <-webkit-gradient-point> [, <-webkit-gradient-point>|, <-webkit-gradient-radius> , <-webkit-gradient-point>] [, <-webkit-gradient-radius>]? [, <-webkit-gradient-color-stop>]* )", "-webkit-gradient-color-stop": "from( <color> )|color-stop( [<number-zero-one>|<percentage>] , <color> )|to( <color> )", "-webkit-gradient-point": "[left|center|right|<length-percentage>] [top|center|bottom|<length-percentage>]", "-webkit-gradient-radius": "<length>|<percentage>", "-webkit-gradient-type": "linear|radial", "-webkit-mask-box-repeat": "repeat|stretch|round", "-webkit-mask-clip-style": "border|border-box|padding|padding-box|content|content-box|text", "-ms-filter-function-list": "<-ms-filter-function>+", "-ms-filter-function": "<-ms-filter-function-progid>|<-ms-filter-function-legacy>", "-ms-filter-function-progid": "'progid:' [<ident-token> '.']* [<ident-token>|<function-token> <any-value>? )]", "-ms-filter-function-legacy": "<ident-token>|<function-token> <any-value>? )", "-ms-filter": "<string>", age: "child|young|old", "attr-name": "<wq-name>", "attr-fallback": "<any-value>", "bg-clip": "<box>|border|text", "border-radius": "<length-percentage>{1,2}", bottom: "<length>|auto", "generic-voice": "[<age>? <gender> <integer>?]", gender: "male|female|neutral", "lab()": "lab( [<percentage>|<number>|none] [<percentage>|<number>|none] [<percentage>|<number>|none] [/ [<alpha-value>|none]]? )", "lch()": "lch( [<percentage>|<number>|none] [<percentage>|<number>|none] [<hue>|none] [/ [<alpha-value>|none]]? )", left: "<length>|auto", "mask-image": "<mask-reference>#", paint: "none|<color>|<url> [none|<color>]?|context-fill|context-stroke", ratio: "<number [0,\u221E]> [/ <number [0,\u221E]>]?", "reversed-counter-name": "reversed( <counter-name> )", right: "<length>|auto", "svg-length": "<percentage>|<length>|<number>", "svg-writing-mode": "lr-tb|rl-tb|tb-rl|lr|rl|tb", top: "<length>|auto", "track-group": "'(' [<string>* <track-minmax> <string>*]+ ')' ['[' <positive-integer> ']']?|<track-minmax>", "track-list-v0": "[<string>* <track-group> <string>*]+|none", "track-minmax": "minmax( <track-breadth> , <track-breadth> )|auto|<track-breadth>|fit-content", x: "<number>", y: "<number>", declaration: "<ident-token> : <declaration-value>? ['!' important]?", "declaration-list": "[<declaration>? ';']* <declaration>?", url: "url( <string> <url-modifier>* )|<url-token>", "url-modifier": "<ident>|<function-token> <any-value> )", "number-zero-one": "<number [0,1]>", "number-one-or-greater": "<number [1,\u221E]>", "positive-integer": "<integer [0,\u221E]>", "-non-standard-display": "-ms-inline-flexbox|-ms-grid|-ms-inline-grid|-webkit-flex|-webkit-inline-flex|-webkit-box|-webkit-inline-box|-moz-inline-stack|-moz-box|-moz-inline-box" }, properties: { "--*": "<declaration-value>", "-ms-accelerator": "false|true", "-ms-block-progression": "tb|rl|bt|lr", "-ms-content-zoom-chaining": "none|chained", "-ms-content-zooming": "none|zoom", "-ms-content-zoom-limit": "<'-ms-content-zoom-limit-min'> <'-ms-content-zoom-limit-max'>", "-ms-content-zoom-limit-max": "<percentage>", "-ms-content-zoom-limit-min": "<percentage>", "-ms-content-zoom-snap": "<'-ms-content-zoom-snap-type'>||<'-ms-content-zoom-snap-points'>", "-ms-content-zoom-snap-points": "snapInterval( <percentage> , <percentage> )|snapList( <percentage># )", "-ms-content-zoom-snap-type": "none|proximity|mandatory", "-ms-filter": "<string>", "-ms-flow-from": "[none|<custom-ident>]#", "-ms-flow-into": "[none|<custom-ident>]#", "-ms-grid-columns": "none|<track-list>|<auto-track-list>", "-ms-grid-rows": "none|<track-list>|<auto-track-list>", "-ms-high-contrast-adjust": "auto|none", "-ms-hyphenate-limit-chars": "auto|<integer>{1,3}", "-ms-hyphenate-limit-lines": "no-limit|<integer>", "-ms-hyphenate-limit-zone": "<percentage>|<length>", "-ms-ime-align": "auto|after", "-ms-overflow-style": "auto|none|scrollbar|-ms-autohiding-scrollbar", "-ms-scrollbar-3dlight-color": "<color>", "-ms-scrollbar-arrow-color": "<color>", "-ms-scrollbar-base-color": "<color>", "-ms-scrollbar-darkshadow-color": "<color>", "-ms-scrollbar-face-color": "<color>", "-ms-scrollbar-highlight-color": "<color>", "-ms-scrollbar-shadow-color": "<color>", "-ms-scrollbar-track-color": "<color>", "-ms-scroll-chaining": "chained|none", "-ms-scroll-limit": "<'-ms-scroll-limit-x-min'> <'-ms-scroll-limit-y-min'> <'-ms-scroll-limit-x-max'> <'-ms-scroll-limit-y-max'>", "-ms-scroll-limit-x-max": "auto|<length>", "-ms-scroll-limit-x-min": "<length>", "-ms-scroll-limit-y-max": "auto|<length>", "-ms-scroll-limit-y-min": "<length>", "-ms-scroll-rails": "none|railed", "-ms-scroll-snap-points-x": "snapInterval( <length-percentage> , <length-percentage> )|snapList( <length-percentage># )", "-ms-scroll-snap-points-y": "snapInterval( <length-percentage> , <length-percentage> )|snapList( <length-percentage># )", "-ms-scroll-snap-type": "none|proximity|mandatory", "-ms-scroll-snap-x": "<'-ms-scroll-snap-type'> <'-ms-scroll-snap-points-x'>", "-ms-scroll-snap-y": "<'-ms-scroll-snap-type'> <'-ms-scroll-snap-points-y'>", "-ms-scroll-translation": "none|vertical-to-horizontal", "-ms-text-autospace": "none|ideograph-alpha|ideograph-numeric|ideograph-parenthesis|ideograph-space", "-ms-touch-select": "grippers|none", "-ms-user-select": "none|element|text", "-ms-wrap-flow": "auto|both|start|end|maximum|clear", "-ms-wrap-margin": "<length>", "-ms-wrap-through": "wrap|none", "-moz-appearance": "none|button|button-arrow-down|button-arrow-next|button-arrow-previous|button-arrow-up|button-bevel|button-focus|caret|checkbox|checkbox-container|checkbox-label|checkmenuitem|dualbutton|groupbox|listbox|listitem|menuarrow|menubar|menucheckbox|menuimage|menuitem|menuitemtext|menulist|menulist-button|menulist-text|menulist-textfield|menupopup|menuradio|menuseparator|meterbar|meterchunk|progressbar|progressbar-vertical|progresschunk|progresschunk-vertical|radio|radio-container|radio-label|radiomenuitem|range|range-thumb|resizer|resizerpanel|scale-horizontal|scalethumbend|scalethumb-horizontal|scalethumbstart|scalethumbtick|scalethumb-vertical|scale-vertical|scrollbarbutton-down|scrollbarbutton-left|scrollbarbutton-right|scrollbarbutton-up|scrollbarthumb-horizontal|scrollbarthumb-vertical|scrollbartrack-horizontal|scrollbartrack-vertical|searchfield|separator|sheet|spinner|spinner-downbutton|spinner-textfield|spinner-upbutton|splitter|statusbar|statusbarpanel|tab|tabpanel|tabpanels|tab-scroll-arrow-back|tab-scroll-arrow-forward|textfield|textfield-multiline|toolbar|toolbarbutton|toolbarbutton-dropdown|toolbargripper|toolbox|tooltip|treeheader|treeheadercell|treeheadersortarrow|treeitem|treeline|treetwisty|treetwistyopen|treeview|-moz-mac-unified-toolbar|-moz-win-borderless-glass|-moz-win-browsertabbar-toolbox|-moz-win-communicationstext|-moz-win-communications-toolbox|-moz-win-exclude-glass|-moz-win-glass|-moz-win-mediatext|-moz-win-media-toolbox|-moz-window-button-box|-moz-window-button-box-maximized|-moz-window-button-close|-moz-window-button-maximize|-moz-window-button-minimize|-moz-window-button-restore|-moz-window-frame-bottom|-moz-window-frame-left|-moz-window-frame-right|-moz-window-titlebar|-moz-window-titlebar-maximized", "-moz-binding": "<url>|none", "-moz-border-bottom-colors": "<color>+|none", "-moz-border-left-colors": "<color>+|none", "-moz-border-right-colors": "<color>+|none", "-moz-border-top-colors": "<color>+|none", "-moz-context-properties": "none|[fill|fill-opacity|stroke|stroke-opacity]#", "-moz-float-edge": "border-box|content-box|margin-box|padding-box", "-moz-force-broken-image-icon": "0|1", "-moz-image-region": "<shape>|auto", "-moz-orient": "inline|block|horizontal|vertical", "-moz-outline-radius": "<outline-radius>{1,4} [/ <outline-radius>{1,4}]?", "-moz-outline-radius-bottomleft": "<outline-radius>", "-moz-outline-radius-bottomright": "<outline-radius>", "-moz-outline-radius-topleft": "<outline-radius>", "-moz-outline-radius-topright": "<outline-radius>", "-moz-stack-sizing": "ignore|stretch-to-fit", "-moz-text-blink": "none|blink", "-moz-user-focus": "ignore|normal|select-after|select-before|select-menu|select-same|select-all|none", "-moz-user-input": "auto|none|enabled|disabled", "-moz-user-modify": "read-only|read-write|write-only", "-moz-window-dragging": "drag|no-drag", "-moz-window-shadow": "default|menu|tooltip|sheet|none", "-webkit-appearance": "none|button|button-bevel|caps-lock-indicator|caret|checkbox|default-button|inner-spin-button|listbox|listitem|media-controls-background|media-controls-fullscreen-background|media-current-time-display|media-enter-fullscreen-button|media-exit-fullscreen-button|media-fullscreen-button|media-mute-button|media-overlay-play-button|media-play-button|media-seek-back-button|media-seek-forward-button|media-slider|media-sliderthumb|media-time-remaining-display|media-toggle-closed-captions-button|media-volume-slider|media-volume-slider-container|media-volume-sliderthumb|menulist|menulist-button|menulist-text|menulist-textfield|meter|progress-bar|progress-bar-value|push-button|radio|scrollbarbutton-down|scrollbarbutton-left|scrollbarbutton-right|scrollbarbutton-up|scrollbargripper-horizontal|scrollbargripper-vertical|scrollbarthumb-horizontal|scrollbarthumb-vertical|scrollbartrack-horizontal|scrollbartrack-vertical|searchfield|searchfield-cancel-button|searchfield-decoration|searchfield-results-button|searchfield-results-decoration|slider-horizontal|slider-vertical|sliderthumb-horizontal|sliderthumb-vertical|square-button|textarea|textfield|-apple-pay-button", "-webkit-border-before": "<'border-width'>||<'border-style'>||<color>", "-webkit-border-before-color": "<color>", "-webkit-border-before-style": "<'border-style'>", "-webkit-border-before-width": "<'border-width'>", "-webkit-box-reflect": "[above|below|right|left]? <length>? <image>?", "-webkit-line-clamp": "none|<integer>", "-webkit-mask": "[<mask-reference>||<position> [/ <bg-size>]?||<repeat-style>||[<box>|border|padding|content|text]||[<box>|border|padding|content]]#", "-webkit-mask-attachment": "<attachment>#", "-webkit-mask-clip": "[<box>|border|padding|content|text]#", "-webkit-mask-composite": "<composite-style>#", "-webkit-mask-image": "<mask-reference>#", "-webkit-mask-origin": "[<box>|border|padding|content]#", "-webkit-mask-position": "<position>#", "-webkit-mask-position-x": "[<length-percentage>|left|center|right]#", "-webkit-mask-position-y": "[<length-percentage>|top|center|bottom]#", "-webkit-mask-repeat": "<repeat-style>#", "-webkit-mask-repeat-x": "repeat|no-repeat|space|round", "-webkit-mask-repeat-y": "repeat|no-repeat|space|round", "-webkit-mask-size": "<bg-size>#", "-webkit-overflow-scrolling": "auto|touch", "-webkit-tap-highlight-color": "<color>", "-webkit-text-fill-color": "<color>", "-webkit-text-stroke": "<length>||<color>", "-webkit-text-stroke-color": "<color>", "-webkit-text-stroke-width": "<length>", "-webkit-touch-callout": "default|none", "-webkit-user-modify": "read-only|read-write|read-write-plaintext-only", "accent-color": "auto|<color>", "align-content": "normal|<baseline-position>|<content-distribution>|<overflow-position>? <content-position>", "align-items": "normal|stretch|<baseline-position>|[<overflow-position>? <self-position>]", "align-self": "auto|normal|stretch|<baseline-position>|<overflow-position>? <self-position>", "align-tracks": "[normal|<baseline-position>|<content-distribution>|<overflow-position>? <content-position>]#", all: "initial|inherit|unset|revert|revert-layer", animation: "<single-animation>#", "animation-delay": "<time>#", "animation-direction": "<single-animation-direction>#", "animation-duration": "<time>#", "animation-fill-mode": "<single-animation-fill-mode>#", "animation-iteration-count": "<single-animation-iteration-count>#", "animation-name": "[none|<keyframes-name>]#", "animation-play-state": "<single-animation-play-state>#", "animation-timing-function": "<easing-function>#", "animation-timeline": "<single-animation-timeline>#", appearance: "none|auto|textfield|menulist-button|<compat-auto>", "aspect-ratio": "auto|<ratio>", azimuth: "<angle>|[[left-side|far-left|left|center-left|center|center-right|right|far-right|right-side]||behind]|leftwards|rightwards", "backdrop-filter": "none|<filter-function-list>", "backface-visibility": "visible|hidden", background: "[<bg-layer> ,]* <final-bg-layer>", "background-attachment": "<attachment>#", "background-blend-mode": "<blend-mode>#", "background-clip": "<bg-clip>#", "background-color": "<color>", "background-image": "<bg-image>#", "background-origin": "<box>#", "background-position": "<bg-position>#", "background-position-x": "[center|[[left|right|x-start|x-end]? <length-percentage>?]!]#", "background-position-y": "[center|[[top|bottom|y-start|y-end]? <length-percentage>?]!]#", "background-repeat": "<repeat-style>#", "background-size": "<bg-size>#", "block-overflow": "clip|ellipsis|<string>", "block-size": "<'width'>", border: "<line-width>||<line-style>||<color>", "border-block": "<'border-top-width'>||<'border-top-style'>||<color>", "border-block-color": "<'border-top-color'>{1,2}", "border-block-style": "<'border-top-style'>", "border-block-width": "<'border-top-width'>", "border-block-end": "<'border-top-width'>||<'border-top-style'>||<color>", "border-block-end-color": "<'border-top-color'>", "border-block-end-style": "<'border-top-style'>", "border-block-end-width": "<'border-top-width'>", "border-block-start": "<'border-top-width'>||<'border-top-style'>||<color>", "border-block-start-color": "<'border-top-color'>", "border-block-start-style": "<'border-top-style'>", "border-block-start-width": "<'border-top-width'>", "border-bottom": "<line-width>||<line-style>||<color>", "border-bottom-color": "<'border-top-color'>", "border-bottom-left-radius": "<length-percentage>{1,2}", "border-bottom-right-radius": "<length-percentage>{1,2}", "border-bottom-style": "<line-style>", "border-bottom-width": "<line-width>", "border-collapse": "collapse|separate", "border-color": "<color>{1,4}", "border-end-end-radius": "<length-percentage>{1,2}", "border-end-start-radius": "<length-percentage>{1,2}", "border-image": "<'border-image-source'>||<'border-image-slice'> [/ <'border-image-width'>|/ <'border-image-width'>? / <'border-image-outset'>]?||<'border-image-repeat'>", "border-image-outset": "[<length>|<number>]{1,4}", "border-image-repeat": "[stretch|repeat|round|space]{1,2}", "border-image-slice": "<number-percentage>{1,4}&&fill?", "border-image-source": "none|<image>", "border-image-width": "[<length-percentage>|<number>|auto]{1,4}", "border-inline": "<'border-top-width'>||<'border-top-style'>||<color>", "border-inline-end": "<'border-top-width'>||<'border-top-style'>||<color>", "border-inline-color": "<'border-top-color'>{1,2}", "border-inline-style": "<'border-top-style'>", "border-inline-width": "<'border-top-width'>", "border-inline-end-color": "<'border-top-color'>", "border-inline-end-style": "<'border-top-style'>", "border-inline-end-width": "<'border-top-width'>", "border-inline-start": "<'border-top-width'>||<'border-top-style'>||<color>", "border-inline-start-color": "<'border-top-color'>", "border-inline-start-style": "<'border-top-style'>", "border-inline-start-width": "<'border-top-width'>", "border-left": "<line-width>||<line-style>||<color>", "border-left-color": "<color>", "border-left-style": "<line-style>", "border-left-width": "<line-width>", "border-radius": "<length-percentage>{1,4} [/ <length-percentage>{1,4}]?", "border-right": "<line-width>||<line-style>||<color>", "border-right-color": "<color>", "border-right-style": "<line-style>", "border-right-width": "<line-width>", "border-spacing": "<length> <length>?", "border-start-end-radius": "<length-percentage>{1,2}", "border-start-start-radius": "<length-percentage>{1,2}", "border-style": "<line-style>{1,4}", "border-top": "<line-width>||<line-style>||<color>", "border-top-color": "<color>", "border-top-left-radius": "<length-percentage>{1,2}", "border-top-right-radius": "<length-percentage>{1,2}", "border-top-style": "<line-style>", "border-top-width": "<line-width>", "border-width": "<line-width>{1,4}", bottom: "<length>|<percentage>|auto", "box-align": "start|center|end|baseline|stretch", "box-decoration-break": "slice|clone", "box-direction": "normal|reverse|inherit", "box-flex": "<number>", "box-flex-group": "<integer>", "box-lines": "single|multiple", "box-ordinal-group": "<integer>", "box-orient": "horizontal|vertical|inline-axis|block-axis|inherit", "box-pack": "start|center|end|justify", "box-shadow": "none|<shadow>#", "box-sizing": "content-box|border-box", "break-after": "auto|avoid|always|all|avoid-page|page|left|right|recto|verso|avoid-column|column|avoid-region|region", "break-before": "auto|avoid|always|all|avoid-page|page|left|right|recto|verso|avoid-column|column|avoid-region|region", "break-inside": "auto|avoid|avoid-page|avoid-column|avoid-region", "caption-side": "top|bottom|block-start|block-end|inline-start|inline-end", "caret-color": "auto|<color>", clear: "none|left|right|both|inline-start|inline-end", clip: "<shape>|auto", "clip-path": "<clip-source>|[<basic-shape>||<geometry-box>]|none", color: "<color>", "print-color-adjust": "economy|exact", "color-scheme": "normal|[light|dark|<custom-ident>]+&&only?", "column-count": "<integer>|auto", "column-fill": "auto|balance|balance-all", "column-gap": "normal|<length-percentage>", "column-rule": "<'column-rule-width'>||<'column-rule-style'>||<'column-rule-color'>", "column-rule-color": "<color>", "column-rule-style": "<'border-style'>", "column-rule-width": "<'border-width'>", "column-span": "none|all", "column-width": "<length>|auto", columns: "<'column-width'>||<'column-count'>", contain: "none|strict|content|[size||layout||style||paint]", content: "normal|none|[<content-replacement>|<content-list>] [/ [<string>|<counter>]+]?", "content-visibility": "visible|auto|hidden", "counter-increment": "[<counter-name> <integer>?]+|none", "counter-reset": "[<counter-name> <integer>?|<reversed-counter-name> <integer>?]+|none", "counter-set": "[<counter-name> <integer>?]+|none", cursor: "[[<url> [<x> <y>]? ,]* [auto|default|none|context-menu|help|pointer|progress|wait|cell|crosshair|text|vertical-text|alias|copy|move|no-drop|not-allowed|e-resize|n-resize|ne-resize|nw-resize|s-resize|se-resize|sw-resize|w-resize|ew-resize|ns-resize|nesw-resize|nwse-resize|col-resize|row-resize|all-scroll|zoom-in|zoom-out|grab|grabbing|hand|-webkit-grab|-webkit-grabbing|-webkit-zoom-in|-webkit-zoom-out|-moz-grab|-moz-grabbing|-moz-zoom-in|-moz-zoom-out]]", direction: "ltr|rtl", display: "[<display-outside>||<display-inside>]|<display-listitem>|<display-internal>|<display-box>|<display-legacy>|<-non-standard-display>", "empty-cells": "show|hide", filter: "none|<filter-function-list>|<-ms-filter-function-list>", flex: "none|[<'flex-grow'> <'flex-shrink'>?||<'flex-basis'>]", "flex-basis": "content|<'width'>", "flex-direction": "row|row-reverse|column|column-reverse", "flex-flow": "<'flex-direction'>||<'flex-wrap'>", "flex-grow": "<number>", "flex-shrink": "<number>", "flex-wrap": "nowrap|wrap|wrap-reverse", float: "left|right|none|inline-start|inline-end", font: "[[<'font-style'>||<font-variant-css21>||<'font-weight'>||<'font-stretch'>]? <'font-size'> [/ <'line-height'>]? <'font-family'>]|caption|icon|menu|message-box|small-caption|status-bar", "font-family": "[<family-name>|<generic-family>]#", "font-feature-settings": "normal|<feature-tag-value>#", "font-kerning": "auto|normal|none", "font-language-override": "normal|<string>", "font-optical-sizing": "auto|none", "font-variation-settings": "normal|[<string> <number>]#", "font-size": "<absolute-size>|<relative-size>|<length-percentage>", "font-size-adjust": "none|[ex-height|cap-height|ch-width|ic-width|ic-height]? [from-font|<number>]", "font-smooth": "auto|never|always|<absolute-size>|<length>", "font-stretch": "<font-stretch-absolute>", "font-style": "normal|italic|oblique <angle>?", "font-synthesis": "none|[weight||style||small-caps]", "font-variant": "normal|none|[<common-lig-values>||<discretionary-lig-values>||<historical-lig-values>||<contextual-alt-values>||stylistic( <feature-value-name> )||historical-forms||styleset( <feature-value-name># )||character-variant( <feature-value-name># )||swash( <feature-value-name> )||ornaments( <feature-value-name> )||annotation( <feature-value-name> )||[small-caps|all-small-caps|petite-caps|all-petite-caps|unicase|titling-caps]||<numeric-figure-values>||<numeric-spacing-values>||<numeric-fraction-values>||ordinal||slashed-zero||<east-asian-variant-values>||<east-asian-width-values>||ruby]", "font-variant-alternates": "normal|[stylistic( <feature-value-name> )||historical-forms||styleset( <feature-value-name># )||character-variant( <feature-value-name># )||swash( <feature-value-name> )||ornaments( <feature-value-name> )||annotation( <feature-value-name> )]", "font-variant-caps": "normal|small-caps|all-small-caps|petite-caps|all-petite-caps|unicase|titling-caps", "font-variant-east-asian": "normal|[<east-asian-variant-values>||<east-asian-width-values>||ruby]", "font-variant-ligatures": "normal|none|[<common-lig-values>||<discretionary-lig-values>||<historical-lig-values>||<contextual-alt-values>]", "font-variant-numeric": "normal|[<numeric-figure-values>||<numeric-spacing-values>||<numeric-fraction-values>||ordinal||slashed-zero]", "font-variant-position": "normal|sub|super", "font-weight": "<font-weight-absolute>|bolder|lighter", "forced-color-adjust": "auto|none", gap: "<'row-gap'> <'column-gap'>?", grid: "<'grid-template'>|<'grid-template-rows'> / [auto-flow&&dense?] <'grid-auto-columns'>?|[auto-flow&&dense?] <'grid-auto-rows'>? / <'grid-template-columns'>", "grid-area": "<grid-line> [/ <grid-line>]{0,3}", "grid-auto-columns": "<track-size>+", "grid-auto-flow": "[row|column]||dense", "grid-auto-rows": "<track-size>+", "grid-column": "<grid-line> [/ <grid-line>]?", "grid-column-end": "<grid-line>", "grid-column-gap": "<length-percentage>", "grid-column-start": "<grid-line>", "grid-gap": "<'grid-row-gap'> <'grid-column-gap'>?", "grid-row": "<grid-line> [/ <grid-line>]?", "grid-row-end": "<grid-line>", "grid-row-gap": "<length-percentage>", "grid-row-start": "<grid-line>", "grid-template": "none|[<'grid-template-rows'> / <'grid-template-columns'>]|[<line-names>? <string> <track-size>? <line-names>?]+ [/ <explicit-track-list>]?", "grid-template-areas": "none|<string>+", "grid-template-columns": "none|<track-list>|<auto-track-list>|subgrid <line-name-list>?", "grid-template-rows": "none|<track-list>|<auto-track-list>|subgrid <line-name-list>?", "hanging-punctuation": "none|[first||[force-end|allow-end]||last]", height: "auto|<length>|<percentage>|min-content|max-content|fit-content|fit-content( <length-percentage> )", "hyphenate-character": "auto|<string>", hyphens: "none|manual|auto", "image-orientation": "from-image|<angle>|[<angle>? flip]", "image-rendering": "auto|crisp-edges|pixelated|optimizeSpeed|optimizeQuality|<-non-standard-image-rendering>", "image-resolution": "[from-image||<resolution>]&&snap?", "ime-mode": "auto|normal|active|inactive|disabled", "initial-letter": "normal|[<number> <integer>?]", "initial-letter-align": "[auto|alphabetic|hanging|ideographic]", "inline-size": "<'width'>", "input-security": "auto|none", inset: "<'top'>{1,4}", "inset-block": "<'top'>{1,2}", "inset-block-end": "<'top'>", "inset-block-start": "<'top'>", "inset-inline": "<'top'>{1,2}", "inset-inline-end": "<'top'>", "inset-inline-start": "<'top'>", isolation: "auto|isolate", "justify-content": "normal|<content-distribution>|<overflow-position>? [<content-position>|left|right]", "justify-items": "normal|stretch|<baseline-position>|<overflow-position>? [<self-position>|left|right]|legacy|legacy&&[left|right|center]", "justify-self": "auto|normal|stretch|<baseline-position>|<overflow-position>? [<self-position>|left|right]", "justify-tracks": "[normal|<content-distribution>|<overflow-position>? [<content-position>|left|right]]#", left: "<length>|<percentage>|auto", "letter-spacing": "normal|<length-percentage>", "line-break": "auto|loose|normal|strict|anywhere", "line-clamp": "none|<integer>", "line-height": "normal|<number>|<length>|<percentage>", "line-height-step": "<length>", "list-style": "<'list-style-type'>||<'list-style-position'>||<'list-style-image'>", "list-style-image": "<image>|none", "list-style-position": "inside|outside", "list-style-type": "<counter-style>|<string>|none", margin: "[<length>|<percentage>|auto]{1,4}", "margin-block": "<'margin-left'>{1,2}", "margin-block-end": "<'margin-left'>", "margin-block-start": "<'margin-left'>", "margin-bottom": "<length>|<percentage>|auto", "margin-inline": "<'margin-left'>{1,2}", "margin-inline-end": "<'margin-left'>", "margin-inline-start": "<'margin-left'>", "margin-left": "<length>|<percentage>|auto", "margin-right": "<length>|<percentage>|auto", "margin-top": "<length>|<percentage>|auto", "margin-trim": "none|in-flow|all", mask: "<mask-layer>#", "mask-border": "<'mask-border-source'>||<'mask-border-slice'> [/ <'mask-border-width'>? [/ <'mask-border-outset'>]?]?||<'mask-border-repeat'>||<'mask-border-mode'>", "mask-border-mode": "luminance|alpha", "mask-border-outset": "[<length>|<number>]{1,4}", "mask-border-repeat": "[stretch|repeat|round|space]{1,2}", "mask-border-slice": "<number-percentage>{1,4} fill?", "mask-border-source": "none|<image>", "mask-border-width": "[<length-percentage>|<number>|auto]{1,4}", "mask-clip": "[<geometry-box>|no-clip]#", "mask-composite": "<compositing-operator>#", "mask-image": "<mask-reference>#", "mask-mode": "<masking-mode>#", "mask-origin": "<geometry-box>#", "mask-position": "<position>#", "mask-repeat": "<repeat-style>#", "mask-size": "<bg-size>#", "mask-type": "luminance|alpha", "masonry-auto-flow": "[pack|next]||[definite-first|ordered]", "math-style": "normal|compact", "max-block-size": "<'max-width'>", "max-height": "none|<length-percentage>|min-content|max-content|fit-content|fit-content( <length-percentage> )", "max-inline-size": "<'max-width'>", "max-lines": "none|<integer>", "max-width": "none|<length-percentage>|min-content|max-content|fit-content|fit-content( <length-percentage> )|<-non-standard-width>", "min-block-size": "<'min-width'>", "min-height": "auto|<length>|<percentage>|min-content|max-content|fit-content|fit-content( <length-percentage> )", "min-inline-size": "<'min-width'>", "min-width": "auto|<length>|<percentage>|min-content|max-content|fit-content|fit-content( <length-percentage> )|<-non-standard-width>", "mix-blend-mode": "<blend-mode>|plus-lighter", "object-fit": "fill|contain|cover|none|scale-down", "object-position": "<position>", offset: "[<'offset-position'>? [<'offset-path'> [<'offset-distance'>||<'offset-rotate'>]?]?]! [/ <'offset-anchor'>]?", "offset-anchor": "auto|<position>", "offset-distance": "<length-percentage>", "offset-path": "none|ray( [<angle>&&<size>&&contain?] )|<path()>|<url>|[<basic-shape>||<geometry-box>]", "offset-position": "auto|<position>", "offset-rotate": "[auto|reverse]||<angle>", opacity: "<alpha-value>", order: "<integer>", orphans: "<integer>", outline: "[<'outline-color'>||<'outline-style'>||<'outline-width'>]", "outline-color": "<color>|invert", "outline-offset": "<length>", "outline-style": "auto|<'border-style'>", "outline-width": "<line-width>", overflow: "[visible|hidden|clip|scroll|auto]{1,2}|<-non-standard-overflow>", "overflow-anchor": "auto|none", "overflow-block": "visible|hidden|clip|scroll|auto", "overflow-clip-box": "padding-box|content-box", "overflow-clip-margin": "<visual-box>||<length [0,\u221E]>", "overflow-inline": "visible|hidden|clip|scroll|auto", "overflow-wrap": "normal|break-word|anywhere", "overflow-x": "visible|hidden|clip|scroll|auto", "overflow-y": "visible|hidden|clip|scroll|auto", "overscroll-behavior": "[contain|none|auto]{1,2}", "overscroll-behavior-block": "contain|none|auto", "overscroll-behavior-inline": "contain|none|auto", "overscroll-behavior-x": "contain|none|auto", "overscroll-behavior-y": "contain|none|auto", padding: "[<length>|<percentage>]{1,4}", "padding-block": "<'padding-left'>{1,2}", "padding-block-end": "<'padding-left'>", "padding-block-start": "<'padding-left'>", "padding-bottom": "<length>|<percentage>", "padding-inline": "<'padding-left'>{1,2}", "padding-inline-end": "<'padding-left'>", "padding-inline-start": "<'padding-left'>", "padding-left": "<length>|<percentage>", "padding-right": "<length>|<percentage>", "padding-top": "<length>|<percentage>", "page-break-after": "auto|always|avoid|left|right|recto|verso", "page-break-before": "auto|always|avoid|left|right|recto|verso", "page-break-inside": "auto|avoid", "paint-order": "normal|[fill||stroke||markers]", perspective: "none|<length>", "perspective-origin": "<position>", "place-content": "<'align-content'> <'justify-content'>?", "place-items": "<'align-items'> <'justify-items'>?", "place-self": "<'align-self'> <'justify-self'>?", "pointer-events": "auto|none|visiblePainted|visibleFill|visibleStroke|visible|painted|fill|stroke|all|inherit", position: "static|relative|absolute|sticky|fixed|-webkit-sticky", quotes: "none|auto|[<string> <string>]+", resize: "none|both|horizontal|vertical|block|inline", right: "<length>|<percentage>|auto", rotate: "none|<angle>|[x|y|z|<number>{3}]&&<angle>", "row-gap": "normal|<length-percentage>", "ruby-align": "start|center|space-between|space-around", "ruby-merge": "separate|collapse|auto", "ruby-position": "[alternate||[over|under]]|inter-character", scale: "none|<number>{1,3}", "scrollbar-color": "auto|<color>{2}", "scrollbar-gutter": "auto|stable&&both-edges?", "scrollbar-width": "auto|thin|none", "scroll-behavior": "auto|smooth", "scroll-margin": "<length>{1,4}", "scroll-margin-block": "<length>{1,2}", "scroll-margin-block-start": "<length>", "scroll-margin-block-end": "<length>", "scroll-margin-bottom": "<length>", "scroll-margin-inline": "<length>{1,2}", "scroll-margin-inline-start": "<length>", "scroll-margin-inline-end": "<length>", "scroll-margin-left": "<length>", "scroll-margin-right": "<length>", "scroll-margin-top": "<length>", "scroll-padding": "[auto|<length-percentage>]{1,4}", "scroll-padding-block": "[auto|<length-percentage>]{1,2}", "scroll-padding-block-start": "auto|<length-percentage>", "scroll-padding-block-end": "auto|<length-percentage>", "scroll-padding-bottom": "auto|<length-percentage>", "scroll-padding-inline": "[auto|<length-percentage>]{1,2}", "scroll-padding-inline-start": "auto|<length-percentage>", "scroll-padding-inline-end": "auto|<length-percentage>", "scroll-padding-left": "auto|<length-percentage>", "scroll-padding-right": "auto|<length-percentage>", "scroll-padding-top": "auto|<length-percentage>", "scroll-snap-align": "[none|start|end|center]{1,2}", "scroll-snap-coordinate": "none|<position>#", "scroll-snap-destination": "<position>", "scroll-snap-points-x": "none|repeat( <length-percentage> )", "scroll-snap-points-y": "none|repeat( <length-percentage> )", "scroll-snap-stop": "normal|always", "scroll-snap-type": "none|[x|y|block|inline|both] [mandatory|proximity]?", "scroll-snap-type-x": "none|mandatory|proximity", "scroll-snap-type-y": "none|mandatory|proximity", "shape-image-threshold": "<alpha-value>", "shape-margin": "<length-percentage>", "shape-outside": "none|[<shape-box>||<basic-shape>]|<image>", "tab-size": "<integer>|<length>", "table-layout": "auto|fixed", "text-align": "start|end|left|right|center|justify|match-parent", "text-align-last": "auto|start|end|left|right|center|justify", "text-combine-upright": "none|all|[digits <integer>?]", "text-decoration": "<'text-decoration-line'>||<'text-decoration-style'>||<'text-decoration-color'>||<'text-decoration-thickness'>", "text-decoration-color": "<color>", "text-decoration-line": "none|[underline||overline||line-through||blink]|spelling-error|grammar-error", "text-decoration-skip": "none|[objects||[spaces|[leading-spaces||trailing-spaces]]||edges||box-decoration]", "text-decoration-skip-ink": "auto|all|none", "text-decoration-style": "solid|double|dotted|dashed|wavy", "text-decoration-thickness": "auto|from-font|<length>|<percentage>", "text-emphasis": "<'text-emphasis-style'>||<'text-emphasis-color'>", "text-emphasis-color": "<color>", "text-emphasis-position": "[over|under]&&[right|left]", "text-emphasis-style": "none|[[filled|open]||[dot|circle|double-circle|triangle|sesame]]|<string>", "text-indent": "<length-percentage>&&hanging?&&each-line?", "text-justify": "auto|inter-character|inter-word|none", "text-orientation": "mixed|upright|sideways", "text-overflow": "[clip|ellipsis|<string>]{1,2}", "text-rendering": "auto|optimizeSpeed|optimizeLegibility|geometricPrecision", "text-shadow": "none|<shadow-t>#", "text-size-adjust": "none|auto|<percentage>", "text-transform": "none|capitalize|uppercase|lowercase|full-width|full-size-kana", "text-underline-offset": "auto|<length>|<percentage>", "text-underline-position": "auto|from-font|[under||[left|right]]", top: "<length>|<percentage>|auto", "touch-action": "auto|none|[[pan-x|pan-left|pan-right]||[pan-y|pan-up|pan-down]||pinch-zoom]|manipulation", transform: "none|<transform-list>", "transform-box": "content-box|border-box|fill-box|stroke-box|view-box", "transform-origin": "[<length-percentage>|left|center|right|top|bottom]|[[<length-percentage>|left|center|right]&&[<length-percentage>|top|center|bottom]] <length>?", "transform-style": "flat|preserve-3d", transition: "<single-transition>#", "transition-delay": "<time>#", "transition-duration": "<time>#", "transition-property": "none|<single-transition-property>#", "transition-timing-function": "<easing-function>#", translate: "none|<length-percentage> [<length-percentage> <length>?]?", "unicode-bidi": "normal|embed|isolate|bidi-override|isolate-override|plaintext|-moz-isolate|-moz-isolate-override|-moz-plaintext|-webkit-isolate|-webkit-isolate-override|-webkit-plaintext", "user-select": "auto|text|none|contain|all", "vertical-align": "baseline|sub|super|text-top|text-bottom|middle|top|bottom|<percentage>|<length>", visibility: "visible|hidden|collapse", "white-space": "normal|pre|nowrap|pre-wrap|pre-line|break-spaces", widows: "<integer>", width: "auto|<length>|<percentage>|min-content|max-content|fit-content|fit-content( <length-percentage> )|fill|stretch|intrinsic|-moz-max-content|-webkit-max-content|-moz-fit-content|-webkit-fit-content", "will-change": "auto|<animateable-feature>#", "word-break": "normal|break-all|keep-all|break-word", "word-spacing": "normal|<length>", "word-wrap": "normal|break-word", "writing-mode": "horizontal-tb|vertical-rl|vertical-lr|sideways-rl|sideways-lr|<svg-writing-mode>", "z-index": "auto|<integer>", zoom: "normal|reset|<number>|<percentage>", "-moz-background-clip": "padding|border", "-moz-border-radius-bottomleft": "<'border-bottom-left-radius'>", "-moz-border-radius-bottomright": "<'border-bottom-right-radius'>", "-moz-border-radius-topleft": "<'border-top-left-radius'>", "-moz-border-radius-topright": "<'border-bottom-right-radius'>", "-moz-control-character-visibility": "visible|hidden", "-moz-osx-font-smoothing": "auto|grayscale", "-moz-user-select": "none|text|all|-moz-none", "-ms-flex-align": "start|end|center|baseline|stretch", "-ms-flex-item-align": "auto|start|end|center|baseline|stretch", "-ms-flex-line-pack": "start|end|center|justify|distribute|stretch", "-ms-flex-negative": "<'flex-shrink'>", "-ms-flex-pack": "start|end|center|justify|distribute", "-ms-flex-order": "<integer>", "-ms-flex-positive": "<'flex-grow'>", "-ms-flex-preferred-size": "<'flex-basis'>", "-ms-interpolation-mode": "nearest-neighbor|bicubic", "-ms-grid-column-align": "start|end|center|stretch", "-ms-grid-row-align": "start|end|center|stretch", "-ms-hyphenate-limit-last": "none|always|column|page|spread", "-webkit-background-clip": "[<box>|border|padding|content|text]#", "-webkit-column-break-after": "always|auto|avoid", "-webkit-column-break-before": "always|auto|avoid", "-webkit-column-break-inside": "always|auto|avoid", "-webkit-font-smoothing": "auto|none|antialiased|subpixel-antialiased", "-webkit-mask-box-image": "[<url>|<gradient>|none] [<length-percentage>{4} <-webkit-mask-box-repeat>{2}]?", "-webkit-print-color-adjust": "economy|exact", "-webkit-text-security": "none|circle|disc|square", "-webkit-user-drag": "none|element|auto", "-webkit-user-select": "auto|none|text|all", "alignment-baseline": "auto|baseline|before-edge|text-before-edge|middle|central|after-edge|text-after-edge|ideographic|alphabetic|hanging|mathematical", "baseline-shift": "baseline|sub|super|<svg-length>", behavior: "<url>+", "clip-rule": "nonzero|evenodd", cue: "<'cue-before'> <'cue-after'>?", "cue-after": "<url> <decibel>?|none", "cue-before": "<url> <decibel>?|none", "dominant-baseline": "auto|use-script|no-change|reset-size|ideographic|alphabetic|hanging|mathematical|central|middle|text-after-edge|text-before-edge", fill: "<paint>", "fill-opacity": "<number-zero-one>", "fill-rule": "nonzero|evenodd", "glyph-orientation-horizontal": "<angle>", "glyph-orientation-vertical": "<angle>", kerning: "auto|<svg-length>", marker: "none|<url>", "marker-end": "none|<url>", "marker-mid": "none|<url>", "marker-start": "none|<url>", pause: "<'pause-before'> <'pause-after'>?", "pause-after": "<time>|none|x-weak|weak|medium|strong|x-strong", "pause-before": "<time>|none|x-weak|weak|medium|strong|x-strong", rest: "<'rest-before'> <'rest-after'>?", "rest-after": "<time>|none|x-weak|weak|medium|strong|x-strong", "rest-before": "<time>|none|x-weak|weak|medium|strong|x-strong", "shape-rendering": "auto|optimizeSpeed|crispEdges|geometricPrecision", src: "[<url> [format( <string># )]?|local( <family-name> )]#", speak: "auto|none|normal", "speak-as": "normal|spell-out||digits||[literal-punctuation|no-punctuation]", stroke: "<paint>", "stroke-dasharray": "none|[<svg-length>+]#", "stroke-dashoffset": "<svg-length>", "stroke-linecap": "butt|round|square", "stroke-linejoin": "miter|round|bevel", "stroke-miterlimit": "<number-one-or-greater>", "stroke-opacity": "<number-zero-one>", "stroke-width": "<svg-length>", "text-anchor": "start|middle|end", "unicode-range": "<urange>#", "voice-balance": "<number>|left|center|right|leftwards|rightwards", "voice-duration": "auto|<time>", "voice-family": "[[<family-name>|<generic-voice>] ,]* [<family-name>|<generic-voice>]|preserve", "voice-pitch": "<frequency>&&absolute|[[x-low|low|medium|high|x-high]||[<frequency>|<semitones>|<percentage>]]", "voice-range": "<frequency>&&absolute|[[x-low|low|medium|high|x-high]||[<frequency>|<semitones>|<percentage>]]", "voice-rate": "[normal|x-slow|slow|medium|fast|x-fast]||<percentage>", "voice-stress": "normal|strong|moderate|none|reduced", "voice-volume": "silent|[[x-soft|soft|medium|loud|x-loud]||<decibel>]" }, atrules: { charset: { prelude: "<string>", descriptors: null }, "counter-style": { prelude: "<counter-style-name>", descriptors: { "additive-symbols": "[<integer>&&<symbol>]#", fallback: "<counter-style-name>", negative: "<symbol> <symbol>?", pad: "<integer>&&<symbol>", prefix: "<symbol>", range: "[[<integer>|infinite]{2}]#|auto", "speak-as": "auto|bullets|numbers|words|spell-out|<counter-style-name>", suffix: "<symbol>", symbols: "<symbol>+", system: "cyclic|numeric|alphabetic|symbolic|additive|[fixed <integer>?]|[extends <counter-style-name>]" } }, document: { prelude: "[<url>|url-prefix( <string> )|domain( <string> )|media-document( <string> )|regexp( <string> )]#", descriptors: null }, "font-face": { prelude: null, descriptors: { "ascent-override": "normal|<percentage>", "descent-override": "normal|<percentage>", "font-display": "[auto|block|swap|fallback|optional]", "font-family": "<family-name>", "font-feature-settings": "normal|<feature-tag-value>#", "font-variation-settings": "normal|[<string> <number>]#", "font-stretch": "<font-stretch-absolute>{1,2}", "font-style": "normal|italic|oblique <angle>{0,2}", "font-weight": "<font-weight-absolute>{1,2}", "font-variant": "normal|none|[<common-lig-values>||<discretionary-lig-values>||<historical-lig-values>||<contextual-alt-values>||stylistic( <feature-value-name> )||historical-forms||styleset( <feature-value-name># )||character-variant( <feature-value-name># )||swash( <feature-value-name> )||ornaments( <feature-value-name> )||annotation( <feature-value-name> )||[small-caps|all-small-caps|petite-caps|all-petite-caps|unicase|titling-caps]||<numeric-figure-values>||<numeric-spacing-values>||<numeric-fraction-values>||ordinal||slashed-zero||<east-asian-variant-values>||<east-asian-width-values>||ruby]", "line-gap-override": "normal|<percentage>", "size-adjust": "<percentage>", src: "[<url> [format( <string># )]?|local( <family-name> )]#", "unicode-range": "<urange>#" } }, "font-feature-values": { prelude: "<family-name>#", descriptors: null }, import: { prelude: "[<string>|<url>] [layer|layer( <layer-name> )]? [supports( [<supports-condition>|<declaration>] )]? <media-query-list>?", descriptors: null }, keyframes: { prelude: "<keyframes-name>", descriptors: null }, layer: { prelude: "[<layer-name>#|<layer-name>?]", descriptors: null }, media: { prelude: "<media-query-list>", descriptors: null }, namespace: { prelude: "<namespace-prefix>? [<string>|<url>]", descriptors: null }, page: { prelude: "<page-selector-list>", descriptors: { bleed: "auto|<length>", marks: "none|[crop||cross]", size: "<length>{1,2}|auto|[<page-size>||[portrait|landscape]]" } }, property: { prelude: "<custom-property-name>", descriptors: { syntax: "<string>", inherits: "true|false", "initial-value": "<string>" } }, "scroll-timeline": { prelude: "<timeline-name>", descriptors: null }, supports: { prelude: "<supports-condition>", descriptors: null }, viewport: { prelude: null, descriptors: { height: "<viewport-length>{1,2}", "max-height": "<viewport-length>", "max-width": "<viewport-length>", "max-zoom": "auto|<number>|<percentage>", "min-height": "<viewport-length>", "min-width": "<viewport-length>", "min-zoom": "auto|<number>|<percentage>", orientation: "auto|portrait|landscape", "user-zoom": "zoom|fixed", "viewport-fit": "auto|contain|cover", width: "<viewport-length>{1,2}", zoom: "auto|<number>|<percentage>" } } } };
var bt = {};
b(bt, { AnPlusB: /* @__PURE__ */ __name(() => Jr, "AnPlusB"), Atrule: /* @__PURE__ */ __name(() => tn, "Atrule"), AtrulePrelude: /* @__PURE__ */ __name(() => nn, "AtrulePrelude"), AttributeSelector: /* @__PURE__ */ __name(() => sn, "AttributeSelector"), Block: /* @__PURE__ */ __name(() => cn, "Block"), Brackets: /* @__PURE__ */ __name(() => pn, "Brackets"), CDC: /* @__PURE__ */ __name(() => mn, "CDC"), CDO: /* @__PURE__ */ __name(() => dn, "CDO"), ClassSelector: /* @__PURE__ */ __name(() => bn, "ClassSelector"), Combinator: /* @__PURE__ */ __name(() => yn, "Combinator"), Comment: /* @__PURE__ */ __name(() => wn, "Comment"), Declaration: /* @__PURE__ */ __name(() => Sn, "Declaration"), DeclarationList: /* @__PURE__ */ __name(() => An, "DeclarationList"), Dimension: /* @__PURE__ */ __name(() => En, "Dimension"), Function: /* @__PURE__ */ __name(() => Pn, "Function"), Hash: /* @__PURE__ */ __name(() => Dn, "Hash"), IdSelector: /* @__PURE__ */ __name(() => Mn, "IdSelector"), Identifier: /* @__PURE__ */ __name(() => Nn, "Identifier"), MediaFeature: /* @__PURE__ */ __name(() => Fn, "MediaFeature"), MediaQuery: /* @__PURE__ */ __name(() => _n, "MediaQuery"), MediaQueryList: /* @__PURE__ */ __name(() => jn, "MediaQueryList"), Nth: /* @__PURE__ */ __name(() => qn, "Nth"), Number: /* @__PURE__ */ __name(() => Yn, "Number"), Operator: /* @__PURE__ */ __name(() => Vn, "Operator"), Parentheses: /* @__PURE__ */ __name(() => Qn, "Parentheses"), Percentage: /* @__PURE__ */ __name(() => $n, "Percentage"), PseudoClassSelector: /* @__PURE__ */ __name(() => Jn, "PseudoClassSelector"), PseudoElementSelector: /* @__PURE__ */ __name(() => to, "PseudoElementSelector"), Ratio: /* @__PURE__ */ __name(() => no, "Ratio"), Raw: /* @__PURE__ */ __name(() => io, "Raw"), Rule: /* @__PURE__ */ __name(() => so, "Rule"), Selector: /* @__PURE__ */ __name(() => co, "Selector"), SelectorList: /* @__PURE__ */ __name(() => po, "SelectorList"), String: /* @__PURE__ */ __name(() => bo, "String"), StyleSheet: /* @__PURE__ */ __name(() => yo, "StyleSheet"), TypeSelector: /* @__PURE__ */ __name(() => vo, "TypeSelector"), UnicodeRange: /* @__PURE__ */ __name(() => Ao, "UnicodeRange"), Url: /* @__PURE__ */ __name(() => Do, "Url"), Value: /* @__PURE__ */ __name(() => No, "Value"), WhiteSpace: /* @__PURE__ */ __name(() => Mo, "WhiteSpace") });
var Jr = {};
b(Jr, { generate: /* @__PURE__ */ __name(() => gc, "generate"), name: /* @__PURE__ */ __name(() => fc, "name"), parse: /* @__PURE__ */ __name(() => Zr, "parse"), structure: /* @__PURE__ */ __name(() => dc, "structure") });
var me = 43;
var re = 45;
var Zt = 110;
var Ie = true;
var mc = false;
function Jt(e, t) {
  let r = this.tokenStart + e, n = this.charCodeAt(r);
  for ((n === me || n === re) && (t && this.error("Number sign is not allowed"), r++); r < this.tokenEnd; r++) B(this.charCodeAt(r)) || this.error("Integer is expected", r);
}
__name(Jt, "Jt");
function Xe(e) {
  return Jt.call(this, 0, e);
}
__name(Xe, "Xe");
function Ce(e, t) {
  if (!this.cmpChar(this.tokenStart + e, t)) {
    let r = "";
    switch (t) {
      case Zt:
        r = "N is expected";
        break;
      case re:
        r = "HyphenMinus is expected";
        break;
    }
    this.error(r, this.tokenStart + e);
  }
}
__name(Ce, "Ce");
function $r() {
  let e = 0, t = 0, r = this.tokenType;
  for (; r === 13 || r === 25; ) r = this.lookupType(++e);
  if (r !== 10) if (this.isDelim(me, e) || this.isDelim(re, e)) {
    t = this.isDelim(me, e) ? me : re;
    do
      r = this.lookupType(++e);
    while (r === 13 || r === 25);
    r !== 10 && (this.skip(e), Xe.call(this, Ie));
  } else return null;
  return e > 0 && this.skip(e), t === 0 && (r = this.charCodeAt(this.tokenStart), r !== me && r !== re && this.error("Number sign is expected")), Xe.call(this, t !== 0), t === re ? "-" + this.consume(10) : this.consume(10);
}
__name($r, "$r");
var fc = "AnPlusB";
var dc = { a: [String, null], b: [String, null] };
function Zr() {
  let e = this.tokenStart, t = null, r = null;
  if (this.tokenType === 10) Xe.call(this, mc), r = this.consume(10);
  else if (this.tokenType === 1 && this.cmpChar(this.tokenStart, re)) switch (t = "-1", Ce.call(this, 1, Zt), this.tokenEnd - this.tokenStart) {
    case 2:
      this.next(), r = $r.call(this);
      break;
    case 3:
      Ce.call(this, 2, re), this.next(), this.skipSC(), Xe.call(this, Ie), r = "-" + this.consume(10);
      break;
    default:
      Ce.call(this, 2, re), Jt.call(this, 3, Ie), this.next(), r = this.substrToCursor(e + 2);
  }
  else if (this.tokenType === 1 || this.isDelim(me) && this.lookupType(1) === 1) {
    let n = 0;
    switch (t = "1", this.isDelim(me) && (n = 1, this.next()), Ce.call(this, 0, Zt), this.tokenEnd - this.tokenStart) {
      case 1:
        this.next(), r = $r.call(this);
        break;
      case 2:
        Ce.call(this, 1, re), this.next(), this.skipSC(), Xe.call(this, Ie), r = "-" + this.consume(10);
        break;
      default:
        Ce.call(this, 1, re), Jt.call(this, 2, Ie), this.next(), r = this.substrToCursor(e + n + 1);
    }
  } else if (this.tokenType === 12) {
    let n = this.charCodeAt(this.tokenStart), o = n === me || n === re, i = this.tokenStart + o;
    for (; i < this.tokenEnd && B(this.charCodeAt(i)); i++) ;
    i === this.tokenStart + o && this.error("Integer is expected", this.tokenStart + o), Ce.call(this, i - this.tokenStart, Zt), t = this.substring(e, i), i + 1 === this.tokenEnd ? (this.next(), r = $r.call(this)) : (Ce.call(this, i - this.tokenStart + 1, re), i + 2 === this.tokenEnd ? (this.next(), this.skipSC(), Xe.call(this, Ie), r = "-" + this.consume(10)) : (Jt.call(this, i - this.tokenStart + 2, Ie), this.next(), r = this.substrToCursor(i + 1)));
  } else this.error();
  return t !== null && t.charCodeAt(0) === me && (t = t.substr(1)), r !== null && r.charCodeAt(0) === me && (r = r.substr(1)), { type: "AnPlusB", loc: this.getLocation(e, this.tokenStart), a: t, b: r };
}
__name(Zr, "Zr");
function gc(e) {
  if (e.a) {
    let t = e.a === "+1" && "n" || e.a === "1" && "n" || e.a === "-1" && "-n" || e.a + "n";
    if (e.b) {
      let r = e.b[0] === "-" || e.b[0] === "+" ? e.b : "+" + e.b;
      this.tokenize(t + r);
    } else this.tokenize(t);
  } else this.tokenize(e.b);
}
__name(gc, "gc");
var tn = {};
b(tn, { generate: /* @__PURE__ */ __name(() => wc, "generate"), name: /* @__PURE__ */ __name(() => xc, "name"), parse: /* @__PURE__ */ __name(() => en, "parse"), structure: /* @__PURE__ */ __name(() => kc, "structure"), walkContext: /* @__PURE__ */ __name(() => yc, "walkContext") });
function ga(e) {
  return this.Raw(e, this.consumeUntilLeftCurlyBracketOrSemicolon, true);
}
__name(ga, "ga");
function bc() {
  for (let e = 1, t; t = this.lookupType(e); e++) {
    if (t === 24) return true;
    if (t === 23 || t === 3) return false;
  }
  return false;
}
__name(bc, "bc");
var xc = "Atrule";
var yc = "atrule";
var kc = { name: String, prelude: ["AtrulePrelude", "Raw", null], block: ["Block", null] };
function en() {
  let e = this.tokenStart, t, r, n = null, o = null;
  switch (this.eat(3), t = this.substrToCursor(e + 1), r = t.toLowerCase(), this.skipSC(), this.eof === false && this.tokenType !== 23 && this.tokenType !== 17 && (this.parseAtrulePrelude ? n = this.parseWithFallback(this.AtrulePrelude.bind(this, t), ga) : n = ga.call(this, this.tokenIndex), this.skipSC()), this.tokenType) {
    case 17:
      this.next();
      break;
    case 23:
      hasOwnProperty.call(this.atrule, r) && typeof this.atrule[r].block == "function" ? o = this.atrule[r].block.call(this) : o = this.Block(bc.call(this));
      break;
  }
  return { type: "Atrule", loc: this.getLocation(e, this.tokenStart), name: t, prelude: n, block: o };
}
__name(en, "en");
function wc(e) {
  this.token(3, "@" + e.name), e.prelude !== null && this.node(e.prelude), e.block ? this.node(e.block) : this.token(17, ";");
}
__name(wc, "wc");
var nn = {};
b(nn, { generate: /* @__PURE__ */ __name(() => Ac, "generate"), name: /* @__PURE__ */ __name(() => vc, "name"), parse: /* @__PURE__ */ __name(() => rn, "parse"), structure: /* @__PURE__ */ __name(() => Cc, "structure"), walkContext: /* @__PURE__ */ __name(() => Sc, "walkContext") });
var vc = "AtrulePrelude";
var Sc = "atrulePrelude";
var Cc = { children: [[]] };
function rn(e) {
  let t = null;
  return e !== null && (e = e.toLowerCase()), this.skipSC(), hasOwnProperty.call(this.atrule, e) && typeof this.atrule[e].prelude == "function" ? t = this.atrule[e].prelude.call(this) : t = this.readSequence(this.scope.AtrulePrelude), this.skipSC(), this.eof !== true && this.tokenType !== 23 && this.tokenType !== 17 && this.error("Semicolon or block is expected"), { type: "AtrulePrelude", loc: this.getLocationFromList(t), children: t };
}
__name(rn, "rn");
function Ac(e) {
  this.children(e);
}
__name(Ac, "Ac");
var sn = {};
b(sn, { generate: /* @__PURE__ */ __name(() => Nc, "generate"), name: /* @__PURE__ */ __name(() => Dc, "name"), parse: /* @__PURE__ */ __name(() => an, "parse"), structure: /* @__PURE__ */ __name(() => Oc, "structure") });
var Tc = 36;
var ba = 42;
var er = 61;
var Ec = 94;
var on = 124;
var Lc = 126;
function Pc() {
  this.eof && this.error("Unexpected end of input");
  let e = this.tokenStart, t = false;
  return this.isDelim(ba) ? (t = true, this.next()) : this.isDelim(on) || this.eat(1), this.isDelim(on) ? this.charCodeAt(this.tokenStart + 1) !== er ? (this.next(), this.eat(1)) : t && this.error("Identifier is expected", this.tokenEnd) : t && this.error("Vertical line is expected"), { type: "Identifier", loc: this.getLocation(e, this.tokenStart), name: this.substrToCursor(e) };
}
__name(Pc, "Pc");
function Ic() {
  let e = this.tokenStart, t = this.charCodeAt(e);
  return t !== er && t !== Lc && t !== Ec && t !== Tc && t !== ba && t !== on && this.error("Attribute selector (=, ~=, ^=, $=, *=, |=) is expected"), this.next(), t !== er && (this.isDelim(er) || this.error("Equal sign is expected"), this.next()), this.substrToCursor(e);
}
__name(Ic, "Ic");
var Dc = "AttributeSelector";
var Oc = { name: "Identifier", matcher: [String, null], value: ["String", "Identifier", null], flags: [String, null] };
function an() {
  let e = this.tokenStart, t, r = null, n = null, o = null;
  return this.eat(19), this.skipSC(), t = Pc.call(this), this.skipSC(), this.tokenType !== 20 && (this.tokenType !== 1 && (r = Ic.call(this), this.skipSC(), n = this.tokenType === 5 ? this.String() : this.Identifier(), this.skipSC()), this.tokenType === 1 && (o = this.consume(1), this.skipSC())), this.eat(20), { type: "AttributeSelector", loc: this.getLocation(e, this.tokenStart), name: t, matcher: r, value: n, flags: o };
}
__name(an, "an");
function Nc(e) {
  this.token(9, "["), this.node(e.name), e.matcher !== null && (this.tokenize(e.matcher), this.node(e.value)), e.flags !== null && this.token(1, e.flags), this.token(9, "]");
}
__name(Nc, "Nc");
var cn = {};
b(cn, { generate: /* @__PURE__ */ __name(() => _c, "generate"), name: /* @__PURE__ */ __name(() => Rc, "name"), parse: /* @__PURE__ */ __name(() => ln, "parse"), structure: /* @__PURE__ */ __name(() => Bc, "structure"), walkContext: /* @__PURE__ */ __name(() => Fc, "walkContext") });
function ya(e) {
  return this.Raw(e, null, true);
}
__name(ya, "ya");
function zc() {
  return this.parseWithFallback(this.Rule, ya);
}
__name(zc, "zc");
function xa(e) {
  return this.Raw(e, this.consumeUntilSemicolonIncluded, true);
}
__name(xa, "xa");
function Mc() {
  if (this.tokenType === 17) return xa.call(this, this.tokenIndex);
  let e = this.parseWithFallback(this.Declaration, xa);
  return this.tokenType === 17 && this.next(), e;
}
__name(Mc, "Mc");
var Rc = "Block";
var Fc = "block";
var Bc = { children: [["Atrule", "Rule", "Declaration"]] };
function ln(e) {
  let t = e ? Mc : zc, r = this.tokenStart, n = this.createList();
  this.eat(23);
  e: for (; !this.eof; ) switch (this.tokenType) {
    case 24:
      break e;
    case 13:
    case 25:
      this.next();
      break;
    case 3:
      n.push(this.parseWithFallback(this.Atrule, ya));
      break;
    default:
      n.push(t.call(this));
  }
  return this.eof || this.eat(24), { type: "Block", loc: this.getLocation(r, this.tokenStart), children: n };
}
__name(ln, "ln");
function _c(e) {
  this.token(23, "{"), this.children(e, (t) => {
    t.type === "Declaration" && this.token(17, ";");
  }), this.token(24, "}");
}
__name(_c, "_c");
var pn = {};
b(pn, { generate: /* @__PURE__ */ __name(() => Hc, "generate"), name: /* @__PURE__ */ __name(() => Uc, "name"), parse: /* @__PURE__ */ __name(() => un, "parse"), structure: /* @__PURE__ */ __name(() => jc, "structure") });
var Uc = "Brackets";
var jc = { children: [[]] };
function un(e, t) {
  let r = this.tokenStart, n = null;
  return this.eat(19), n = e.call(this, t), this.eof || this.eat(20), { type: "Brackets", loc: this.getLocation(r, this.tokenStart), children: n };
}
__name(un, "un");
function Hc(e) {
  this.token(9, "["), this.children(e), this.token(9, "]");
}
__name(Hc, "Hc");
var mn = {};
b(mn, { generate: /* @__PURE__ */ __name(() => Yc, "generate"), name: /* @__PURE__ */ __name(() => qc, "name"), parse: /* @__PURE__ */ __name(() => hn, "parse"), structure: /* @__PURE__ */ __name(() => Wc, "structure") });
var qc = "CDC";
var Wc = [];
function hn() {
  let e = this.tokenStart;
  return this.eat(15), { type: "CDC", loc: this.getLocation(e, this.tokenStart) };
}
__name(hn, "hn");
function Yc() {
  this.token(15, "-->");
}
__name(Yc, "Yc");
var dn = {};
b(dn, { generate: /* @__PURE__ */ __name(() => Kc, "generate"), name: /* @__PURE__ */ __name(() => Gc, "name"), parse: /* @__PURE__ */ __name(() => fn, "parse"), structure: /* @__PURE__ */ __name(() => Vc, "structure") });
var Gc = "CDO";
var Vc = [];
function fn() {
  let e = this.tokenStart;
  return this.eat(14), { type: "CDO", loc: this.getLocation(e, this.tokenStart) };
}
__name(fn, "fn");
function Kc() {
  this.token(14, "<!--");
}
__name(Kc, "Kc");
var bn = {};
b(bn, { generate: /* @__PURE__ */ __name(() => Zc, "generate"), name: /* @__PURE__ */ __name(() => Xc, "name"), parse: /* @__PURE__ */ __name(() => gn, "parse"), structure: /* @__PURE__ */ __name(() => $c, "structure") });
var Qc = 46;
var Xc = "ClassSelector";
var $c = { name: String };
function gn() {
  return this.eatDelim(Qc), { type: "ClassSelector", loc: this.getLocation(this.tokenStart - 1, this.tokenEnd), name: this.consume(1) };
}
__name(gn, "gn");
function Zc(e) {
  this.token(9, "."), this.token(1, e.name);
}
__name(Zc, "Zc");
var yn = {};
b(yn, { generate: /* @__PURE__ */ __name(() => ou, "generate"), name: /* @__PURE__ */ __name(() => ru, "name"), parse: /* @__PURE__ */ __name(() => xn, "parse"), structure: /* @__PURE__ */ __name(() => nu, "structure") });
var Jc = 43;
var ka = 47;
var eu = 62;
var tu = 126;
var ru = "Combinator";
var nu = { name: String };
function xn() {
  let e = this.tokenStart, t;
  switch (this.tokenType) {
    case 13:
      t = " ";
      break;
    case 9:
      switch (this.charCodeAt(this.tokenStart)) {
        case eu:
        case Jc:
        case tu:
          this.next();
          break;
        case ka:
          this.next(), this.eatIdent("deep"), this.eatDelim(ka);
          break;
        default:
          this.error("Combinator is expected");
      }
      t = this.substrToCursor(e);
      break;
  }
  return { type: "Combinator", loc: this.getLocation(e, this.tokenStart), name: t };
}
__name(xn, "xn");
function ou(e) {
  this.tokenize(e.name);
}
__name(ou, "ou");
var wn = {};
b(wn, { generate: /* @__PURE__ */ __name(() => cu, "generate"), name: /* @__PURE__ */ __name(() => su, "name"), parse: /* @__PURE__ */ __name(() => kn, "parse"), structure: /* @__PURE__ */ __name(() => lu, "structure") });
var iu = 42;
var au = 47;
var su = "Comment";
var lu = { value: String };
function kn() {
  let e = this.tokenStart, t = this.tokenEnd;
  return this.eat(25), t - e + 2 >= 2 && this.charCodeAt(t - 2) === iu && this.charCodeAt(t - 1) === au && (t -= 2), { type: "Comment", loc: this.getLocation(e, this.tokenStart), value: this.substring(e + 2, t) };
}
__name(kn, "kn");
function cu(e) {
  this.token(25, "/*" + e.value + "*/");
}
__name(cu, "cu");
var Sn = {};
b(Sn, { generate: /* @__PURE__ */ __name(() => wu, "generate"), name: /* @__PURE__ */ __name(() => xu, "name"), parse: /* @__PURE__ */ __name(() => vn, "parse"), structure: /* @__PURE__ */ __name(() => ku, "structure"), walkContext: /* @__PURE__ */ __name(() => yu, "walkContext") });
var va = 33;
var uu = 35;
var pu = 36;
var hu = 38;
var mu = 42;
var fu = 43;
var wa = 47;
function du(e) {
  return this.Raw(e, this.consumeUntilExclamationMarkOrSemicolon, true);
}
__name(du, "du");
function gu(e) {
  return this.Raw(e, this.consumeUntilExclamationMarkOrSemicolon, false);
}
__name(gu, "gu");
function bu() {
  let e = this.tokenIndex, t = this.Value();
  return t.type !== "Raw" && this.eof === false && this.tokenType !== 17 && this.isDelim(va) === false && this.isBalanceEdge(e) === false && this.error(), t;
}
__name(bu, "bu");
var xu = "Declaration";
var yu = "declaration";
var ku = { important: [Boolean, String], property: String, value: ["Value", "Raw"] };
function vn() {
  let e = this.tokenStart, t = this.tokenIndex, r = vu.call(this), n = Rt(r), o = n ? this.parseCustomProperty : this.parseValue, i = n ? gu : du, s = false, u;
  this.skipSC(), this.eat(16);
  let c = this.tokenIndex;
  if (n || this.skipSC(), o ? u = this.parseWithFallback(bu, i) : u = i.call(this, this.tokenIndex), n && u.type === "Value" && u.children.isEmpty) {
    for (let a = c - this.tokenIndex; a <= 0; a++) if (this.lookupType(a) === 13) {
      u.children.appendData({ type: "WhiteSpace", loc: null, value: " " });
      break;
    }
  }
  return this.isDelim(va) && (s = Su.call(this), this.skipSC()), this.eof === false && this.tokenType !== 17 && this.isBalanceEdge(t) === false && this.error(), { type: "Declaration", loc: this.getLocation(e, this.tokenStart), important: s, property: r, value: u };
}
__name(vn, "vn");
function wu(e) {
  this.token(1, e.property), this.token(16, ":"), this.node(e.value), e.important && (this.token(9, "!"), this.token(1, e.important === true ? "important" : e.important));
}
__name(wu, "wu");
function vu() {
  let e = this.tokenStart;
  if (this.tokenType === 9) switch (this.charCodeAt(this.tokenStart)) {
    case mu:
    case pu:
    case fu:
    case uu:
    case hu:
      this.next();
      break;
    case wa:
      this.next(), this.isDelim(wa) && this.next();
      break;
  }
  return this.tokenType === 4 ? this.eat(4) : this.eat(1), this.substrToCursor(e);
}
__name(vu, "vu");
function Su() {
  this.eat(9), this.skipSC();
  let e = this.consume(1);
  return e === "important" ? true : e;
}
__name(Su, "Su");
var An = {};
b(An, { generate: /* @__PURE__ */ __name(() => Eu, "generate"), name: /* @__PURE__ */ __name(() => Au, "name"), parse: /* @__PURE__ */ __name(() => Cn, "parse"), structure: /* @__PURE__ */ __name(() => Tu, "structure") });
function Cu(e) {
  return this.Raw(e, this.consumeUntilSemicolonIncluded, true);
}
__name(Cu, "Cu");
var Au = "DeclarationList";
var Tu = { children: [["Declaration"]] };
function Cn() {
  let e = this.createList();
  e: for (; !this.eof; ) switch (this.tokenType) {
    case 13:
    case 25:
    case 17:
      this.next();
      break;
    default:
      e.push(this.parseWithFallback(this.Declaration, Cu));
  }
  return { type: "DeclarationList", loc: this.getLocationFromList(e), children: e };
}
__name(Cn, "Cn");
function Eu(e) {
  this.children(e, (t) => {
    t.type === "Declaration" && this.token(17, ";");
  });
}
__name(Eu, "Eu");
var En = {};
b(En, { generate: /* @__PURE__ */ __name(() => Iu, "generate"), name: /* @__PURE__ */ __name(() => Lu, "name"), parse: /* @__PURE__ */ __name(() => Tn, "parse"), structure: /* @__PURE__ */ __name(() => Pu, "structure") });
var Lu = "Dimension";
var Pu = { value: String, unit: String };
function Tn() {
  let e = this.tokenStart, t = this.consumeNumber(12);
  return { type: "Dimension", loc: this.getLocation(e, this.tokenStart), value: t, unit: this.substring(e + t.length, this.tokenStart) };
}
__name(Tn, "Tn");
function Iu(e) {
  this.token(12, e.value + e.unit);
}
__name(Iu, "Iu");
var Pn = {};
b(Pn, { generate: /* @__PURE__ */ __name(() => zu, "generate"), name: /* @__PURE__ */ __name(() => Du, "name"), parse: /* @__PURE__ */ __name(() => Ln, "parse"), structure: /* @__PURE__ */ __name(() => Nu, "structure"), walkContext: /* @__PURE__ */ __name(() => Ou, "walkContext") });
var Du = "Function";
var Ou = "function";
var Nu = { name: String, children: [[]] };
function Ln(e, t) {
  let r = this.tokenStart, n = this.consumeFunctionName(), o = n.toLowerCase(), i;
  return i = t.hasOwnProperty(o) ? t[o].call(this, t) : e.call(this, t), this.eof || this.eat(22), { type: "Function", loc: this.getLocation(r, this.tokenStart), name: n, children: i };
}
__name(Ln, "Ln");
function zu(e) {
  this.token(2, e.name + "("), this.children(e), this.token(22, ")");
}
__name(zu, "zu");
var Dn = {};
b(Dn, { generate: /* @__PURE__ */ __name(() => Bu, "generate"), name: /* @__PURE__ */ __name(() => Ru, "name"), parse: /* @__PURE__ */ __name(() => In, "parse"), structure: /* @__PURE__ */ __name(() => Fu, "structure"), xxx: /* @__PURE__ */ __name(() => Mu, "xxx") });
var Mu = "XXX";
var Ru = "Hash";
var Fu = { value: String };
function In() {
  let e = this.tokenStart;
  return this.eat(4), { type: "Hash", loc: this.getLocation(e, this.tokenStart), value: this.substrToCursor(e + 1) };
}
__name(In, "In");
function Bu(e) {
  this.token(4, "#" + e.value);
}
__name(Bu, "Bu");
var Nn = {};
b(Nn, { generate: /* @__PURE__ */ __name(() => ju, "generate"), name: /* @__PURE__ */ __name(() => _u, "name"), parse: /* @__PURE__ */ __name(() => On, "parse"), structure: /* @__PURE__ */ __name(() => Uu, "structure") });
var _u = "Identifier";
var Uu = { name: String };
function On() {
  return { type: "Identifier", loc: this.getLocation(this.tokenStart, this.tokenEnd), name: this.consume(1) };
}
__name(On, "On");
function ju(e) {
  this.token(1, e.name);
}
__name(ju, "ju");
var Mn = {};
b(Mn, { generate: /* @__PURE__ */ __name(() => Wu, "generate"), name: /* @__PURE__ */ __name(() => Hu, "name"), parse: /* @__PURE__ */ __name(() => zn, "parse"), structure: /* @__PURE__ */ __name(() => qu, "structure") });
var Hu = "IdSelector";
var qu = { name: String };
function zn() {
  let e = this.tokenStart;
  return this.eat(4), { type: "IdSelector", loc: this.getLocation(e, this.tokenStart), name: this.substrToCursor(e + 1) };
}
__name(zn, "zn");
function Wu(e) {
  this.token(9, "#" + e.name);
}
__name(Wu, "Wu");
var Fn = {};
b(Fn, { generate: /* @__PURE__ */ __name(() => Vu, "generate"), name: /* @__PURE__ */ __name(() => Yu, "name"), parse: /* @__PURE__ */ __name(() => Rn, "parse"), structure: /* @__PURE__ */ __name(() => Gu, "structure") });
var Yu = "MediaFeature";
var Gu = { name: String, value: ["Identifier", "Number", "Dimension", "Ratio", null] };
function Rn() {
  let e = this.tokenStart, t, r = null;
  if (this.eat(21), this.skipSC(), t = this.consume(1), this.skipSC(), this.tokenType !== 22) {
    switch (this.eat(16), this.skipSC(), this.tokenType) {
      case 10:
        this.lookupNonWSType(1) === 9 ? r = this.Ratio() : r = this.Number();
        break;
      case 12:
        r = this.Dimension();
        break;
      case 1:
        r = this.Identifier();
        break;
      default:
        this.error("Number, dimension, ratio or identifier is expected");
    }
    this.skipSC();
  }
  return this.eat(22), { type: "MediaFeature", loc: this.getLocation(e, this.tokenStart), name: t, value: r };
}
__name(Rn, "Rn");
function Vu(e) {
  this.token(21, "("), this.token(1, e.name), e.value !== null && (this.token(16, ":"), this.node(e.value)), this.token(22, ")");
}
__name(Vu, "Vu");
var _n = {};
b(_n, { generate: /* @__PURE__ */ __name(() => Xu, "generate"), name: /* @__PURE__ */ __name(() => Ku, "name"), parse: /* @__PURE__ */ __name(() => Bn, "parse"), structure: /* @__PURE__ */ __name(() => Qu, "structure") });
var Ku = "MediaQuery";
var Qu = { children: [["Identifier", "MediaFeature", "WhiteSpace"]] };
function Bn() {
  let e = this.createList(), t = null;
  this.skipSC();
  e: for (; !this.eof; ) {
    switch (this.tokenType) {
      case 25:
      case 13:
        this.next();
        continue;
      case 1:
        t = this.Identifier();
        break;
      case 21:
        t = this.MediaFeature();
        break;
      default:
        break e;
    }
    e.push(t);
  }
  return t === null && this.error("Identifier or parenthesis is expected"), { type: "MediaQuery", loc: this.getLocationFromList(e), children: e };
}
__name(Bn, "Bn");
function Xu(e) {
  this.children(e);
}
__name(Xu, "Xu");
var jn = {};
b(jn, { generate: /* @__PURE__ */ __name(() => Ju, "generate"), name: /* @__PURE__ */ __name(() => $u, "name"), parse: /* @__PURE__ */ __name(() => Un, "parse"), structure: /* @__PURE__ */ __name(() => Zu, "structure") });
var $u = "MediaQueryList";
var Zu = { children: [["MediaQuery"]] };
function Un() {
  let e = this.createList();
  for (this.skipSC(); !this.eof && (e.push(this.MediaQuery()), this.tokenType === 18); ) this.next();
  return { type: "MediaQueryList", loc: this.getLocationFromList(e), children: e };
}
__name(Un, "Un");
function Ju(e) {
  this.children(e, () => this.token(18, ","));
}
__name(Ju, "Ju");
var qn = {};
b(qn, { generate: /* @__PURE__ */ __name(() => rp, "generate"), name: /* @__PURE__ */ __name(() => ep, "name"), parse: /* @__PURE__ */ __name(() => Hn, "parse"), structure: /* @__PURE__ */ __name(() => tp, "structure") });
var ep = "Nth";
var tp = { nth: ["AnPlusB", "Identifier"], selector: ["SelectorList", null] };
function Hn() {
  this.skipSC();
  let e = this.tokenStart, t = e, r = null, n;
  return this.lookupValue(0, "odd") || this.lookupValue(0, "even") ? n = this.Identifier() : n = this.AnPlusB(), t = this.tokenStart, this.skipSC(), this.lookupValue(0, "of") && (this.next(), r = this.SelectorList(), t = this.tokenStart), { type: "Nth", loc: this.getLocation(e, t), nth: n, selector: r };
}
__name(Hn, "Hn");
function rp(e) {
  this.node(e.nth), e.selector !== null && (this.token(1, "of"), this.node(e.selector));
}
__name(rp, "rp");
var Yn = {};
b(Yn, { generate: /* @__PURE__ */ __name(() => ip, "generate"), name: /* @__PURE__ */ __name(() => np, "name"), parse: /* @__PURE__ */ __name(() => Wn, "parse"), structure: /* @__PURE__ */ __name(() => op, "structure") });
var np = "Number";
var op = { value: String };
function Wn() {
  return { type: "Number", loc: this.getLocation(this.tokenStart, this.tokenEnd), value: this.consume(10) };
}
__name(Wn, "Wn");
function ip(e) {
  this.token(10, e.value);
}
__name(ip, "ip");
var Vn = {};
b(Vn, { generate: /* @__PURE__ */ __name(() => lp, "generate"), name: /* @__PURE__ */ __name(() => ap, "name"), parse: /* @__PURE__ */ __name(() => Gn, "parse"), structure: /* @__PURE__ */ __name(() => sp, "structure") });
var ap = "Operator";
var sp = { value: String };
function Gn() {
  let e = this.tokenStart;
  return this.next(), { type: "Operator", loc: this.getLocation(e, this.tokenStart), value: this.substrToCursor(e) };
}
__name(Gn, "Gn");
function lp(e) {
  this.tokenize(e.value);
}
__name(lp, "lp");
var Qn = {};
b(Qn, { generate: /* @__PURE__ */ __name(() => pp, "generate"), name: /* @__PURE__ */ __name(() => cp, "name"), parse: /* @__PURE__ */ __name(() => Kn, "parse"), structure: /* @__PURE__ */ __name(() => up, "structure") });
var cp = "Parentheses";
var up = { children: [[]] };
function Kn(e, t) {
  let r = this.tokenStart, n = null;
  return this.eat(21), n = e.call(this, t), this.eof || this.eat(22), { type: "Parentheses", loc: this.getLocation(r, this.tokenStart), children: n };
}
__name(Kn, "Kn");
function pp(e) {
  this.token(21, "("), this.children(e), this.token(22, ")");
}
__name(pp, "pp");
var $n = {};
b($n, { generate: /* @__PURE__ */ __name(() => fp, "generate"), name: /* @__PURE__ */ __name(() => hp, "name"), parse: /* @__PURE__ */ __name(() => Xn, "parse"), structure: /* @__PURE__ */ __name(() => mp, "structure") });
var hp = "Percentage";
var mp = { value: String };
function Xn() {
  return { type: "Percentage", loc: this.getLocation(this.tokenStart, this.tokenEnd), value: this.consumeNumber(11) };
}
__name(Xn, "Xn");
function fp(e) {
  this.token(11, e.value + "%");
}
__name(fp, "fp");
var Jn = {};
b(Jn, { generate: /* @__PURE__ */ __name(() => xp, "generate"), name: /* @__PURE__ */ __name(() => dp, "name"), parse: /* @__PURE__ */ __name(() => Zn, "parse"), structure: /* @__PURE__ */ __name(() => bp, "structure"), walkContext: /* @__PURE__ */ __name(() => gp, "walkContext") });
var dp = "PseudoClassSelector";
var gp = "function";
var bp = { name: String, children: [["Raw"], null] };
function Zn() {
  let e = this.tokenStart, t = null, r, n;
  return this.eat(16), this.tokenType === 2 ? (r = this.consumeFunctionName(), n = r.toLowerCase(), hasOwnProperty.call(this.pseudo, n) ? (this.skipSC(), t = this.pseudo[n].call(this), this.skipSC()) : (t = this.createList(), t.push(this.Raw(this.tokenIndex, null, false))), this.eat(22)) : r = this.consume(1), { type: "PseudoClassSelector", loc: this.getLocation(e, this.tokenStart), name: r, children: t };
}
__name(Zn, "Zn");
function xp(e) {
  this.token(16, ":"), e.children === null ? this.token(1, e.name) : (this.token(2, e.name + "("), this.children(e), this.token(22, ")"));
}
__name(xp, "xp");
var to = {};
b(to, { generate: /* @__PURE__ */ __name(() => vp, "generate"), name: /* @__PURE__ */ __name(() => yp, "name"), parse: /* @__PURE__ */ __name(() => eo, "parse"), structure: /* @__PURE__ */ __name(() => wp, "structure"), walkContext: /* @__PURE__ */ __name(() => kp, "walkContext") });
var yp = "PseudoElementSelector";
var kp = "function";
var wp = { name: String, children: [["Raw"], null] };
function eo() {
  let e = this.tokenStart, t = null, r, n;
  return this.eat(16), this.eat(16), this.tokenType === 2 ? (r = this.consumeFunctionName(), n = r.toLowerCase(), hasOwnProperty.call(this.pseudo, n) ? (this.skipSC(), t = this.pseudo[n].call(this), this.skipSC()) : (t = this.createList(), t.push(this.Raw(this.tokenIndex, null, false))), this.eat(22)) : r = this.consume(1), { type: "PseudoElementSelector", loc: this.getLocation(e, this.tokenStart), name: r, children: t };
}
__name(eo, "eo");
function vp(e) {
  this.token(16, ":"), this.token(16, ":"), e.children === null ? this.token(1, e.name) : (this.token(2, e.name + "("), this.children(e), this.token(22, ")"));
}
__name(vp, "vp");
var no = {};
b(no, { generate: /* @__PURE__ */ __name(() => Ep, "generate"), name: /* @__PURE__ */ __name(() => Ap, "name"), parse: /* @__PURE__ */ __name(() => ro, "parse"), structure: /* @__PURE__ */ __name(() => Tp, "structure") });
var Sp = 47;
var Cp = 46;
function Sa() {
  this.skipSC();
  let e = this.consume(10);
  for (let t = 0; t < e.length; t++) {
    let r = e.charCodeAt(t);
    !B(r) && r !== Cp && this.error("Unsigned number is expected", this.tokenStart - e.length + t);
  }
  return Number(e) === 0 && this.error("Zero number is not allowed", this.tokenStart - e.length), e;
}
__name(Sa, "Sa");
var Ap = "Ratio";
var Tp = { left: String, right: String };
function ro() {
  let e = this.tokenStart, t = Sa.call(this), r;
  return this.skipSC(), this.eatDelim(Sp), r = Sa.call(this), { type: "Ratio", loc: this.getLocation(e, this.tokenStart), left: t, right: r };
}
__name(ro, "ro");
function Ep(e) {
  this.token(10, e.left), this.token(9, "/"), this.token(10, e.right);
}
__name(Ep, "Ep");
var io = {};
b(io, { generate: /* @__PURE__ */ __name(() => Dp, "generate"), name: /* @__PURE__ */ __name(() => Pp, "name"), parse: /* @__PURE__ */ __name(() => oo, "parse"), structure: /* @__PURE__ */ __name(() => Ip, "structure") });
function Lp() {
  return this.tokenIndex > 0 && this.lookupType(-1) === 13 ? this.tokenIndex > 1 ? this.getTokenStart(this.tokenIndex - 1) : this.firstCharOffset : this.tokenStart;
}
__name(Lp, "Lp");
var Pp = "Raw";
var Ip = { value: String };
function oo(e, t, r) {
  let n = this.getTokenStart(e), o;
  return this.skipUntilBalanced(e, t || this.consumeUntilBalanceEnd), r && this.tokenStart > n ? o = Lp.call(this) : o = this.tokenStart, { type: "Raw", loc: this.getLocation(n, o), value: this.substring(n, o) };
}
__name(oo, "oo");
function Dp(e) {
  this.tokenize(e.value);
}
__name(Dp, "Dp");
var so = {};
b(so, { generate: /* @__PURE__ */ __name(() => Rp, "generate"), name: /* @__PURE__ */ __name(() => Np, "name"), parse: /* @__PURE__ */ __name(() => ao, "parse"), structure: /* @__PURE__ */ __name(() => Mp, "structure"), walkContext: /* @__PURE__ */ __name(() => zp, "walkContext") });
function Ca(e) {
  return this.Raw(e, this.consumeUntilLeftCurlyBracket, true);
}
__name(Ca, "Ca");
function Op() {
  let e = this.SelectorList();
  return e.type !== "Raw" && this.eof === false && this.tokenType !== 23 && this.error(), e;
}
__name(Op, "Op");
var Np = "Rule";
var zp = "rule";
var Mp = { prelude: ["SelectorList", "Raw"], block: ["Block"] };
function ao() {
  let e = this.tokenIndex, t = this.tokenStart, r, n;
  return this.parseRulePrelude ? r = this.parseWithFallback(Op, Ca) : r = Ca.call(this, e), n = this.Block(true), { type: "Rule", loc: this.getLocation(t, this.tokenStart), prelude: r, block: n };
}
__name(ao, "ao");
function Rp(e) {
  this.node(e.prelude), this.node(e.block);
}
__name(Rp, "Rp");
var co = {};
b(co, { generate: /* @__PURE__ */ __name(() => _p, "generate"), name: /* @__PURE__ */ __name(() => Fp, "name"), parse: /* @__PURE__ */ __name(() => lo, "parse"), structure: /* @__PURE__ */ __name(() => Bp, "structure") });
var Fp = "Selector";
var Bp = { children: [["TypeSelector", "IdSelector", "ClassSelector", "AttributeSelector", "PseudoClassSelector", "PseudoElementSelector", "Combinator", "WhiteSpace"]] };
function lo() {
  let e = this.readSequence(this.scope.Selector);
  return this.getFirstListNode(e) === null && this.error("Selector is expected"), { type: "Selector", loc: this.getLocationFromList(e), children: e };
}
__name(lo, "lo");
function _p(e) {
  this.children(e);
}
__name(_p, "_p");
var po = {};
b(po, { generate: /* @__PURE__ */ __name(() => qp, "generate"), name: /* @__PURE__ */ __name(() => Up, "name"), parse: /* @__PURE__ */ __name(() => uo, "parse"), structure: /* @__PURE__ */ __name(() => Hp, "structure"), walkContext: /* @__PURE__ */ __name(() => jp, "walkContext") });
var Up = "SelectorList";
var jp = "selector";
var Hp = { children: [["Selector", "Raw"]] };
function uo() {
  let e = this.createList();
  for (; !this.eof; ) {
    if (e.push(this.Selector()), this.tokenType === 18) {
      this.next();
      continue;
    }
    break;
  }
  return { type: "SelectorList", loc: this.getLocationFromList(e), children: e };
}
__name(uo, "uo");
function qp(e) {
  this.children(e, () => this.token(18, ","));
}
__name(qp, "qp");
var bo = {};
b(bo, { generate: /* @__PURE__ */ __name(() => Gp, "generate"), name: /* @__PURE__ */ __name(() => Wp, "name"), parse: /* @__PURE__ */ __name(() => go, "parse"), structure: /* @__PURE__ */ __name(() => Yp, "structure") });
var fo = {};
b(fo, { decode: /* @__PURE__ */ __name(() => dt, "decode"), encode: /* @__PURE__ */ __name(() => mo, "encode") });
var ho = 92;
var Aa = 34;
var Ta = 39;
function dt(e) {
  let t = e.length, r = e.charCodeAt(0), n = r === Aa || r === Ta ? 1 : 0, o = n === 1 && t > 1 && e.charCodeAt(t - 1) === r ? t - 2 : t - 1, i = "";
  for (let s = n; s <= o; s++) {
    let u = e.charCodeAt(s);
    if (u === ho) {
      if (s === o) {
        s !== t - 1 && (i = e.substr(s + 1));
        break;
      }
      if (u = e.charCodeAt(++s), $(ho, u)) {
        let c = s - 1, a = se(e, c);
        s = a - 1, i += Re(e.substring(c + 1, a));
      } else u === 13 && e.charCodeAt(s + 1) === 10 && s++;
    } else i += e[s];
  }
  return i;
}
__name(dt, "dt");
function mo(e, t) {
  let r = t ? "'" : '"', n = t ? Ta : Aa, o = "", i = false;
  for (let s = 0; s < e.length; s++) {
    let u = e.charCodeAt(s);
    if (u === 0) {
      o += "\uFFFD";
      continue;
    }
    if (u <= 31 || u === 127) {
      o += "\\" + u.toString(16), i = true;
      continue;
    }
    u === n || u === ho ? (o += "\\" + e.charAt(s), i = false) : (i && (ee(u) || pe(u)) && (o += " "), o += e.charAt(s), i = false);
  }
  return r + o + r;
}
__name(mo, "mo");
var Wp = "String";
var Yp = { value: String };
function go() {
  return { type: "String", loc: this.getLocation(this.tokenStart, this.tokenEnd), value: dt(this.consume(5)) };
}
__name(go, "go");
function Gp(e) {
  this.token(5, mo(e.value));
}
__name(Gp, "Gp");
var yo = {};
b(yo, { generate: /* @__PURE__ */ __name(() => $p, "generate"), name: /* @__PURE__ */ __name(() => Kp, "name"), parse: /* @__PURE__ */ __name(() => xo, "parse"), structure: /* @__PURE__ */ __name(() => Xp, "structure"), walkContext: /* @__PURE__ */ __name(() => Qp, "walkContext") });
var Vp = 33;
function Ea(e) {
  return this.Raw(e, null, false);
}
__name(Ea, "Ea");
var Kp = "StyleSheet";
var Qp = "stylesheet";
var Xp = { children: [["Comment", "CDO", "CDC", "Atrule", "Rule", "Raw"]] };
function xo() {
  let e = this.tokenStart, t = this.createList(), r;
  e: for (; !this.eof; ) {
    switch (this.tokenType) {
      case 13:
        this.next();
        continue;
      case 25:
        if (this.charCodeAt(this.tokenStart + 2) !== Vp) {
          this.next();
          continue;
        }
        r = this.Comment();
        break;
      case 14:
        r = this.CDO();
        break;
      case 15:
        r = this.CDC();
        break;
      case 3:
        r = this.parseWithFallback(this.Atrule, Ea);
        break;
      default:
        r = this.parseWithFallback(this.Rule, Ea);
    }
    t.push(r);
  }
  return { type: "StyleSheet", loc: this.getLocation(e, this.tokenStart), children: t };
}
__name(xo, "xo");
function $p(e) {
  this.children(e);
}
__name($p, "$p");
var vo = {};
b(vo, { generate: /* @__PURE__ */ __name(() => th, "generate"), name: /* @__PURE__ */ __name(() => Jp, "name"), parse: /* @__PURE__ */ __name(() => wo, "parse"), structure: /* @__PURE__ */ __name(() => eh, "structure") });
var Zp = 42;
var La = 124;
function ko() {
  this.tokenType !== 1 && this.isDelim(Zp) === false && this.error("Identifier or asterisk is expected"), this.next();
}
__name(ko, "ko");
var Jp = "TypeSelector";
var eh = { name: String };
function wo() {
  let e = this.tokenStart;
  return this.isDelim(La) ? (this.next(), ko.call(this)) : (ko.call(this), this.isDelim(La) && (this.next(), ko.call(this))), { type: "TypeSelector", loc: this.getLocation(e, this.tokenStart), name: this.substrToCursor(e) };
}
__name(wo, "wo");
function th(e) {
  this.tokenize(e.name);
}
__name(th, "th");
var Ao = {};
b(Ao, { generate: /* @__PURE__ */ __name(() => ah, "generate"), name: /* @__PURE__ */ __name(() => oh, "name"), parse: /* @__PURE__ */ __name(() => Co, "parse"), structure: /* @__PURE__ */ __name(() => ih, "structure") });
var Pa = 43;
var Ia = 45;
var So = 63;
function gt(e, t) {
  let r = 0;
  for (let n = this.tokenStart + e; n < this.tokenEnd; n++) {
    let o = this.charCodeAt(n);
    if (o === Ia && t && r !== 0) return gt.call(this, e + r + 1, false), -1;
    ee(o) || this.error(t && r !== 0 ? "Hyphen minus" + (r < 6 ? " or hex digit" : "") + " is expected" : r < 6 ? "Hex digit is expected" : "Unexpected input", n), ++r > 6 && this.error("Too many hex digits", n);
  }
  return this.next(), r;
}
__name(gt, "gt");
function tr(e) {
  let t = 0;
  for (; this.isDelim(So); ) ++t > e && this.error("Too many question marks"), this.next();
}
__name(tr, "tr");
function rh(e) {
  this.charCodeAt(this.tokenStart) !== e && this.error((e === Pa ? "Plus sign" : "Hyphen minus") + " is expected");
}
__name(rh, "rh");
function nh() {
  let e = 0;
  switch (this.tokenType) {
    case 10:
      if (e = gt.call(this, 1, true), this.isDelim(So)) {
        tr.call(this, 6 - e);
        break;
      }
      if (this.tokenType === 12 || this.tokenType === 10) {
        rh.call(this, Ia), gt.call(this, 1, false);
        break;
      }
      break;
    case 12:
      e = gt.call(this, 1, true), e > 0 && tr.call(this, 6 - e);
      break;
    default:
      if (this.eatDelim(Pa), this.tokenType === 1) {
        e = gt.call(this, 0, true), e > 0 && tr.call(this, 6 - e);
        break;
      }
      if (this.isDelim(So)) {
        this.next(), tr.call(this, 5);
        break;
      }
      this.error("Hex digit or question mark is expected");
  }
}
__name(nh, "nh");
var oh = "UnicodeRange";
var ih = { value: String };
function Co() {
  let e = this.tokenStart;
  return this.eatIdent("u"), nh.call(this), { type: "UnicodeRange", loc: this.getLocation(e, this.tokenStart), value: this.substrToCursor(e) };
}
__name(Co, "Co");
function ah(e) {
  this.tokenize(e.value);
}
__name(ah, "ah");
var Do = {};
b(Do, { generate: /* @__PURE__ */ __name(() => mh, "generate"), name: /* @__PURE__ */ __name(() => ph, "name"), parse: /* @__PURE__ */ __name(() => Io, "parse"), structure: /* @__PURE__ */ __name(() => hh, "structure") });
var Po = {};
b(Po, { decode: /* @__PURE__ */ __name(() => Eo, "decode"), encode: /* @__PURE__ */ __name(() => Lo, "encode") });
var sh = 32;
var To = 92;
var lh = 34;
var ch = 39;
var uh = 40;
var Da = 41;
function Eo(e) {
  let t = e.length, r = 4, n = e.charCodeAt(t - 1) === Da ? t - 2 : t - 1, o = "";
  for (; r < n && pe(e.charCodeAt(r)); ) r++;
  for (; r < n && pe(e.charCodeAt(n)); ) n--;
  for (let i = r; i <= n; i++) {
    let s = e.charCodeAt(i);
    if (s === To) {
      if (i === n) {
        i !== t - 1 && (o = e.substr(i + 1));
        break;
      }
      if (s = e.charCodeAt(++i), $(To, s)) {
        let u = i - 1, c = se(e, u);
        i = c - 1, o += Re(e.substring(u + 1, c));
      } else s === 13 && e.charCodeAt(i + 1) === 10 && i++;
    } else o += e[i];
  }
  return o;
}
__name(Eo, "Eo");
function Lo(e) {
  let t = "", r = false;
  for (let n = 0; n < e.length; n++) {
    let o = e.charCodeAt(n);
    if (o === 0) {
      t += "\uFFFD";
      continue;
    }
    if (o <= 31 || o === 127) {
      t += "\\" + o.toString(16), r = true;
      continue;
    }
    o === sh || o === To || o === lh || o === ch || o === uh || o === Da ? (t += "\\" + e.charAt(n), r = false) : (r && ee(o) && (t += " "), t += e.charAt(n), r = false);
  }
  return "url(" + t + ")";
}
__name(Lo, "Lo");
var ph = "Url";
var hh = { value: String };
function Io() {
  let e = this.tokenStart, t;
  switch (this.tokenType) {
    case 7:
      t = Eo(this.consume(7));
      break;
    case 2:
      this.cmpStr(this.tokenStart, this.tokenEnd, "url(") || this.error("Function name must be `url`"), this.eat(2), this.skipSC(), t = dt(this.consume(5)), this.skipSC(), this.eof || this.eat(22);
      break;
    default:
      this.error("Url or Function is expected");
  }
  return { type: "Url", loc: this.getLocation(e, this.tokenStart), value: t };
}
__name(Io, "Io");
function mh(e) {
  this.token(7, Lo(e.value));
}
__name(mh, "mh");
var No = {};
b(No, { generate: /* @__PURE__ */ __name(() => gh, "generate"), name: /* @__PURE__ */ __name(() => fh, "name"), parse: /* @__PURE__ */ __name(() => Oo, "parse"), structure: /* @__PURE__ */ __name(() => dh, "structure") });
var fh = "Value";
var dh = { children: [[]] };
function Oo() {
  let e = this.tokenStart, t = this.readSequence(this.scope.Value);
  return { type: "Value", loc: this.getLocation(e, this.tokenStart), children: t };
}
__name(Oo, "Oo");
function gh(e) {
  this.children(e);
}
__name(gh, "gh");
var Mo = {};
b(Mo, { generate: /* @__PURE__ */ __name(() => kh, "generate"), name: /* @__PURE__ */ __name(() => xh, "name"), parse: /* @__PURE__ */ __name(() => zo, "parse"), structure: /* @__PURE__ */ __name(() => yh, "structure") });
var bh = Object.freeze({ type: "WhiteSpace", loc: null, value: " " });
var xh = "WhiteSpace";
var yh = { value: String };
function zo() {
  return this.eat(13), bh;
}
__name(zo, "zo");
function kh(e) {
  this.token(13, e.value);
}
__name(kh, "kh");
var Oa = { generic: true, ...da, node: bt };
var Ro = {};
b(Ro, { AtrulePrelude: /* @__PURE__ */ __name(() => za, "AtrulePrelude"), Selector: /* @__PURE__ */ __name(() => Ra, "Selector"), Value: /* @__PURE__ */ __name(() => Ua, "Value") });
var wh = 35;
var vh = 42;
var Na = 43;
var Sh = 45;
var Ch = 47;
var Ah = 117;
function xt(e) {
  switch (this.tokenType) {
    case 4:
      return this.Hash();
    case 18:
      return this.Operator();
    case 21:
      return this.Parentheses(this.readSequence, e.recognizer);
    case 19:
      return this.Brackets(this.readSequence, e.recognizer);
    case 5:
      return this.String();
    case 12:
      return this.Dimension();
    case 11:
      return this.Percentage();
    case 10:
      return this.Number();
    case 2:
      return this.cmpStr(this.tokenStart, this.tokenEnd, "url(") ? this.Url() : this.Function(this.readSequence, e.recognizer);
    case 7:
      return this.Url();
    case 1:
      return this.cmpChar(this.tokenStart, Ah) && this.cmpChar(this.tokenStart + 1, Na) ? this.UnicodeRange() : this.Identifier();
    case 9: {
      let t = this.charCodeAt(this.tokenStart);
      if (t === Ch || t === vh || t === Na || t === Sh) return this.Operator();
      t === wh && this.error("Hex or identifier is expected", this.tokenStart + 1);
      break;
    }
  }
}
__name(xt, "xt");
var za = { getNode: xt };
var Th = 35;
var Eh = 42;
var Lh = 43;
var Ph = 47;
var Ma = 46;
var Ih = 62;
var Dh = 124;
var Oh = 126;
function Nh(e, t) {
  t.last !== null && t.last.type !== "Combinator" && e !== null && e.type !== "Combinator" && t.push({ type: "Combinator", loc: null, name: " " });
}
__name(Nh, "Nh");
function zh() {
  switch (this.tokenType) {
    case 19:
      return this.AttributeSelector();
    case 4:
      return this.IdSelector();
    case 16:
      return this.lookupType(1) === 16 ? this.PseudoElementSelector() : this.PseudoClassSelector();
    case 1:
      return this.TypeSelector();
    case 10:
    case 11:
      return this.Percentage();
    case 12:
      this.charCodeAt(this.tokenStart) === Ma && this.error("Identifier is expected", this.tokenStart + 1);
      break;
    case 9: {
      switch (this.charCodeAt(this.tokenStart)) {
        case Lh:
        case Ih:
        case Oh:
        case Ph:
          return this.Combinator();
        case Ma:
          return this.ClassSelector();
        case Eh:
        case Dh:
          return this.TypeSelector();
        case Th:
          return this.IdSelector();
      }
      break;
    }
  }
}
__name(zh, "zh");
var Ra = { onWhiteSpace: Nh, getNode: zh };
function Fa() {
  return this.createSingleNodeList(this.Raw(this.tokenIndex, null, false));
}
__name(Fa, "Fa");
function Ba() {
  let e = this.createList();
  if (this.skipSC(), e.push(this.Identifier()), this.skipSC(), this.tokenType === 18) {
    e.push(this.Operator());
    let t = this.tokenIndex, r = this.parseCustomProperty ? this.Value(null) : this.Raw(this.tokenIndex, this.consumeUntilExclamationMarkOrSemicolon, false);
    if (r.type === "Value" && r.children.isEmpty) {
      for (let n = t - this.tokenIndex; n <= 0; n++) if (this.lookupType(n) === 13) {
        r.children.appendData({ type: "WhiteSpace", loc: null, value: " " });
        break;
      }
    }
    e.push(r);
  }
  return e;
}
__name(Ba, "Ba");
function _a(e) {
  return e !== null && e.type === "Operator" && (e.value[e.value.length - 1] === "-" || e.value[e.value.length - 1] === "+");
}
__name(_a, "_a");
var Ua = { getNode: xt, onWhiteSpace(e, t) {
  _a(e) && (e.value = " " + e.value), _a(t.last) && (t.last.value += " ");
}, expression: Fa, var: Ba };
var ja = { parse: { prelude: null, block() {
  return this.Block(true);
} } };
var Ha = { parse: { prelude() {
  let e = this.createList();
  switch (this.skipSC(), this.tokenType) {
    case 5:
      e.push(this.String());
      break;
    case 7:
    case 2:
      e.push(this.Url());
      break;
    default:
      this.error("String or url() is expected");
  }
  return (this.lookupNonWSType(0) === 1 || this.lookupNonWSType(0) === 21) && e.push(this.MediaQueryList()), e;
}, block: null } };
var qa = { parse: { prelude() {
  return this.createSingleNodeList(this.MediaQueryList());
}, block() {
  return this.Block(false);
} } };
var Wa = { parse: { prelude() {
  return this.createSingleNodeList(this.SelectorList());
}, block() {
  return this.Block(true);
} } };
function Mh() {
  return this.createSingleNodeList(this.Raw(this.tokenIndex, null, false));
}
__name(Mh, "Mh");
function Rh() {
  return this.skipSC(), this.tokenType === 1 && this.lookupNonWSType(1) === 16 ? this.createSingleNodeList(this.Declaration()) : Ya.call(this);
}
__name(Rh, "Rh");
function Ya() {
  let e = this.createList(), t;
  this.skipSC();
  e: for (; !this.eof; ) {
    switch (this.tokenType) {
      case 25:
      case 13:
        this.next();
        continue;
      case 2:
        t = this.Function(Mh, this.scope.AtrulePrelude);
        break;
      case 1:
        t = this.Identifier();
        break;
      case 21:
        t = this.Parentheses(Rh, this.scope.AtrulePrelude);
        break;
      default:
        break e;
    }
    e.push(t);
  }
  return e;
}
__name(Ya, "Ya");
var Ga = { parse: { prelude() {
  let e = Ya.call(this);
  return this.getFirstListNode(e) === null && this.error("Condition is expected"), e;
}, block() {
  return this.Block(false);
} } };
var Va = { "font-face": ja, import: Ha, media: qa, page: Wa, supports: Ga };
var De = { parse() {
  return this.createSingleNodeList(this.SelectorList());
} };
var Fh = { parse() {
  return this.createSingleNodeList(this.Selector());
} };
var Ka = { parse() {
  return this.createSingleNodeList(this.Identifier());
} };
var rr = { parse() {
  return this.createSingleNodeList(this.Nth());
} };
var Qa = { dir: Ka, has: De, lang: Ka, matches: De, is: De, "-moz-any": De, "-webkit-any": De, where: De, not: De, "nth-child": rr, "nth-last-child": rr, "nth-last-of-type": rr, "nth-of-type": rr, slotted: Fh };
var Fo = {};
b(Fo, { AnPlusB: /* @__PURE__ */ __name(() => Zr, "AnPlusB"), Atrule: /* @__PURE__ */ __name(() => en, "Atrule"), AtrulePrelude: /* @__PURE__ */ __name(() => rn, "AtrulePrelude"), AttributeSelector: /* @__PURE__ */ __name(() => an, "AttributeSelector"), Block: /* @__PURE__ */ __name(() => ln, "Block"), Brackets: /* @__PURE__ */ __name(() => un, "Brackets"), CDC: /* @__PURE__ */ __name(() => hn, "CDC"), CDO: /* @__PURE__ */ __name(() => fn, "CDO"), ClassSelector: /* @__PURE__ */ __name(() => gn, "ClassSelector"), Combinator: /* @__PURE__ */ __name(() => xn, "Combinator"), Comment: /* @__PURE__ */ __name(() => kn, "Comment"), Declaration: /* @__PURE__ */ __name(() => vn, "Declaration"), DeclarationList: /* @__PURE__ */ __name(() => Cn, "DeclarationList"), Dimension: /* @__PURE__ */ __name(() => Tn, "Dimension"), Function: /* @__PURE__ */ __name(() => Ln, "Function"), Hash: /* @__PURE__ */ __name(() => In, "Hash"), IdSelector: /* @__PURE__ */ __name(() => zn, "IdSelector"), Identifier: /* @__PURE__ */ __name(() => On, "Identifier"), MediaFeature: /* @__PURE__ */ __name(() => Rn, "MediaFeature"), MediaQuery: /* @__PURE__ */ __name(() => Bn, "MediaQuery"), MediaQueryList: /* @__PURE__ */ __name(() => Un, "MediaQueryList"), Nth: /* @__PURE__ */ __name(() => Hn, "Nth"), Number: /* @__PURE__ */ __name(() => Wn, "Number"), Operator: /* @__PURE__ */ __name(() => Gn, "Operator"), Parentheses: /* @__PURE__ */ __name(() => Kn, "Parentheses"), Percentage: /* @__PURE__ */ __name(() => Xn, "Percentage"), PseudoClassSelector: /* @__PURE__ */ __name(() => Zn, "PseudoClassSelector"), PseudoElementSelector: /* @__PURE__ */ __name(() => eo, "PseudoElementSelector"), Ratio: /* @__PURE__ */ __name(() => ro, "Ratio"), Raw: /* @__PURE__ */ __name(() => oo, "Raw"), Rule: /* @__PURE__ */ __name(() => ao, "Rule"), Selector: /* @__PURE__ */ __name(() => lo, "Selector"), SelectorList: /* @__PURE__ */ __name(() => uo, "SelectorList"), String: /* @__PURE__ */ __name(() => go, "String"), StyleSheet: /* @__PURE__ */ __name(() => xo, "StyleSheet"), TypeSelector: /* @__PURE__ */ __name(() => wo, "TypeSelector"), UnicodeRange: /* @__PURE__ */ __name(() => Co, "UnicodeRange"), Url: /* @__PURE__ */ __name(() => Io, "Url"), Value: /* @__PURE__ */ __name(() => Oo, "Value"), WhiteSpace: /* @__PURE__ */ __name(() => zo, "WhiteSpace") });
var Xa = { parseContext: { default: "StyleSheet", stylesheet: "StyleSheet", atrule: "Atrule", atrulePrelude(e) {
  return this.AtrulePrelude(e.atrule ? String(e.atrule) : null);
}, mediaQueryList: "MediaQueryList", mediaQuery: "MediaQuery", rule: "Rule", selectorList: "SelectorList", selector: "Selector", block() {
  return this.Block(true);
}, declarationList: "DeclarationList", declaration: "Declaration", value: "Value" }, scope: Ro, atrule: Va, pseudo: Qa, node: Fo };
var $a = { node: bt };
var Za = Xr({ ...Oa, ...Xa, ...$a });
var es = {};
b(es, { decode: /* @__PURE__ */ __name(() => Bh, "decode"), encode: /* @__PURE__ */ __name(() => _h, "encode") });
var Ja = 92;
function Bh(e) {
  let t = e.length - 1, r = "";
  for (let n = 0; n < e.length; n++) {
    let o = e.charCodeAt(n);
    if (o === Ja) {
      if (n === t) break;
      if (o = e.charCodeAt(++n), $(Ja, o)) {
        let i = n - 1, s = se(e, i);
        n = s - 1, r += Re(e.substring(i + 1, s));
      } else o === 13 && e.charCodeAt(n + 1) === 10 && n++;
    } else r += e[n];
  }
  return r;
}
__name(Bh, "Bh");
function _h(e) {
  let t = "";
  if (e.length === 1 && e.charCodeAt(0) === 45) return "\\-";
  for (let r = 0; r < e.length; r++) {
    let n = e.charCodeAt(r);
    if (n === 0) {
      t += "\uFFFD";
      continue;
    }
    if (n <= 31 || n === 127 || n >= 48 && n <= 57 && (r === 0 || r === 1 && e.charCodeAt(0) === 45)) {
      t += "\\" + n.toString(16) + " ";
      continue;
    }
    Ne(n) ? t += e.charAt(r) : t += "\\" + e.charAt(r);
  }
  return t;
}
__name(_h, "_h");
var { tokenize: ob, parse: ib, generate: ab, lexer: sb, createLexer: lb, walk: cb, find: ub, findLast: pb, findAll: hb, toPlainObject: mb, fromPlainObject: fb, fork: db } = Za;

// ubo-src/js/arglist-parser.js
var ArglistParser = class {
  static {
    __name(this, "ArglistParser");
  }
  constructor(separatorChar = ",", mustQuote = false) {
    this.separatorChar = this.actualSeparatorChar = separatorChar;
    this.separatorCode = this.actualSeparatorCode = separatorChar.charCodeAt(0);
    this.mustQuote = mustQuote;
    this.quoteBeg = 0;
    this.quoteEnd = 0;
    this.argBeg = 0;
    this.argEnd = 0;
    this.separatorBeg = 0;
    this.separatorEnd = 0;
    this.transform = false;
    this.failed = false;
    this.reWhitespaceStart = /^\s+/;
    this.reWhitespaceEnd = /(?:^|\S)(\s+)$/;
    this.reOddTrailingEscape = /(?:^|[^\\])(?:\\\\)*\\$/;
    this.reTrailingEscapeChars = /\\+$/;
  }
  nextArg(pattern, beg = 0) {
    const len = pattern.length;
    this.quoteBeg = beg + this.leftWhitespaceCount(pattern.slice(beg));
    this.failed = false;
    const qc2 = pattern.charCodeAt(this.quoteBeg);
    if (qc2 === 34 || qc2 === 39 || qc2 === 96) {
      this.indexOfNextArgSeparator(pattern, qc2);
      if (this.argEnd !== len) {
        this.quoteEnd = this.argEnd + 1;
        this.separatorBeg = this.separatorEnd = this.quoteEnd;
        this.separatorEnd += this.leftWhitespaceCount(pattern.slice(this.quoteEnd));
        if (this.separatorEnd === len) {
          return this;
        }
        if (pattern.charCodeAt(this.separatorEnd) === this.separatorCode) {
          this.separatorEnd += 1;
          return this;
        }
      }
    }
    this.indexOfNextArgSeparator(pattern, this.separatorCode);
    this.separatorBeg = this.separatorEnd = this.argEnd;
    if (this.separatorBeg < len) {
      this.separatorEnd += 1;
    }
    this.argEnd -= this.rightWhitespaceCount(pattern.slice(0, this.separatorBeg));
    this.quoteEnd = this.argEnd;
    if (this.mustQuote) {
      this.failed = true;
    }
    return this;
  }
  normalizeArg(s, char = "") {
    if (char === "") {
      char = this.actualSeparatorChar;
    }
    let out = "";
    let pos = 0;
    while ((pos = s.lastIndexOf(char)) !== -1) {
      out = s.slice(pos) + out;
      s = s.slice(0, pos);
      const match = this.reTrailingEscapeChars.exec(s);
      if (match === null) {
        continue;
      }
      const tail = (match[0].length & 1) !== 0 ? match[0].slice(0, -1) : match[0];
      out = tail + out;
      s = s.slice(0, -match[0].length);
    }
    if (out === "") {
      return s;
    }
    return s + out;
  }
  leftWhitespaceCount(s) {
    const match = this.reWhitespaceStart.exec(s);
    return match === null ? 0 : match[0].length;
  }
  rightWhitespaceCount(s) {
    const match = this.reWhitespaceEnd.exec(s);
    return match === null ? 0 : match[1].length;
  }
  indexOfNextArgSeparator(pattern, separatorCode) {
    this.argBeg = this.argEnd = separatorCode !== this.separatorCode ? this.quoteBeg + 1 : this.quoteBeg;
    this.transform = false;
    if (separatorCode !== this.actualSeparatorCode) {
      this.actualSeparatorCode = separatorCode;
      this.actualSeparatorChar = String.fromCharCode(separatorCode);
    }
    while (this.argEnd < pattern.length) {
      const pos = pattern.indexOf(this.actualSeparatorChar, this.argEnd);
      if (pos === -1) {
        return this.argEnd = pattern.length;
      }
      if (this.reOddTrailingEscape.test(pattern.slice(0, pos)) === false) {
        return this.argEnd = pos;
      }
      this.transform = true;
      this.argEnd = pos + 1;
    }
  }
};

// ubo-src/js/jsonpath.js
var JSONPath = class _JSONPath {
  static {
    __name(this, "JSONPath");
  }
  static create(query) {
    const jsonp = new _JSONPath();
    jsonp.compile(query);
    return jsonp;
  }
  static toJSON(obj, stringifier, ...args) {
    return (stringifier || JSON.stringify)(obj, ...args).replace(/\//g, "\\/");
  }
  get value() {
    return this.#compiled && this.#compiled.rval;
  }
  set value(v2) {
    if (this.#compiled === void 0) {
      return;
    }
    this.#compiled.rval = v2;
  }
  get valid() {
    return this.#compiled !== void 0;
  }
  compile(query) {
    this.#compiled = void 0;
    const r = this.#compile(query, 0);
    if (r === void 0) {
      return;
    }
    if (r.i !== query.length) {
      let val;
      if (query.startsWith("=", r.i)) {
        if (/^=repl\(.+\)$/.test(query.slice(r.i))) {
          r.modify = "repl";
          val = query.slice(r.i + 6, -1);
        } else {
          val = query.slice(r.i + 1);
        }
      } else if (query.startsWith("+=", r.i)) {
        r.modify = "+";
        val = query.slice(r.i + 2);
      }
      try {
        r.rval = JSON.parse(val);
      } catch {
        return;
      }
    }
    this.#compiled = r;
  }
  evaluate(root) {
    if (this.valid === false) {
      return [];
    }
    this.#root = root;
    const paths = this.#evaluate(this.#compiled.steps, []);
    this.#root = null;
    return paths;
  }
  apply(root) {
    if (this.valid === false) {
      return;
    }
    const { rval } = this.#compiled;
    this.#root = { "$": root };
    const paths = this.#evaluate(this.#compiled.steps, []);
    let i = paths.length;
    if (i === 0) {
      this.#root = null;
      return;
    }
    while (i--) {
      const { obj, key } = this.#resolvePath(paths[i]);
      if (rval !== void 0) {
        this.#modifyVal(obj, key);
      } else if (Array.isArray(obj) && typeof key === "number") {
        obj.splice(key, 1);
      } else {
        delete obj[key];
      }
    }
    const result = this.#root["$"] ?? null;
    this.#root = null;
    return result;
  }
  dump() {
    return JSON.stringify(this.#compiled);
  }
  toJSON(obj, ...args) {
    return _JSONPath.toJSON(obj, null, ...args);
  }
  get [Symbol.toStringTag]() {
    return "JSONPath";
  }
  #UNDEFINED = 0;
  #ROOT = 1;
  #CURRENT = 2;
  #CHILDREN = 3;
  #DESCENDANTS = 4;
  #reUnquotedIdentifier = /^[A-Za-z_][\w]*|^\*/;
  #reExpr = /^([!=^$*]=|[<>]=?)(.+?)\]/;
  #reIndice = /^-?\d+/;
  #root;
  #compiled;
  #compile(query, i) {
    if (query.length === 0) {
      return;
    }
    const steps = [];
    let c = query.charCodeAt(i);
    if (c === 36) {
      steps.push({ mv: this.#ROOT });
      i += 1;
    } else if (c === 64) {
      steps.push({ mv: this.#CURRENT });
      i += 1;
    } else {
      steps.push({ mv: i === 0 ? this.#ROOT : this.#CURRENT });
    }
    let mv = this.#UNDEFINED;
    for (; ; ) {
      if (i === query.length) {
        break;
      }
      c = query.charCodeAt(i);
      if (c === 32) {
        i += 1;
        continue;
      }
      if (c === 46) {
        if (mv !== this.#UNDEFINED) {
          return;
        }
        if (query.startsWith("..", i)) {
          mv = this.#DESCENDANTS;
          i += 2;
        } else {
          mv = this.#CHILDREN;
          i += 1;
        }
        continue;
      }
      if (c !== 91) {
        if (mv === this.#UNDEFINED) {
          const step = steps.at(-1);
          if (step === void 0) {
            return;
          }
          i = this.#compileExpr(query, step, i);
          break;
        }
        const s = this.#consumeUnquotedIdentifier(query, i);
        if (s === void 0) {
          return;
        }
        steps.push({ mv, k: s });
        i += s.length;
        mv = this.#UNDEFINED;
        continue;
      }
      if (query.startsWith("[?", i)) {
        const not = query.charCodeAt(i + 2) === 33;
        const j2 = i + 2 + (not ? 1 : 0);
        const r2 = this.#compile(query, j2);
        if (r2 === void 0) {
          return;
        }
        if (query.startsWith("]", r2.i) === false) {
          return;
        }
        if (not) {
          r2.steps.at(-1).not = true;
        }
        steps.push({ mv: mv || this.#CHILDREN, steps: r2.steps });
        i = r2.i + 1;
        mv = this.#UNDEFINED;
        continue;
      }
      if (query.startsWith("[*]", i)) {
        mv ||= this.#CHILDREN;
        steps.push({ mv, k: "*" });
        i += 3;
        mv = this.#UNDEFINED;
        continue;
      }
      const r = this.#consumeIdentifier(query, i + 1);
      if (r === void 0) {
        return;
      }
      mv ||= this.#CHILDREN;
      steps.push({ mv, k: r.s });
      i = r.i + 1;
      mv = this.#UNDEFINED;
    }
    if (steps.length === 0) {
      return;
    }
    if (mv !== this.#UNDEFINED) {
      return;
    }
    return { steps, i };
  }
  #evaluate(steps, pathin) {
    let resultset = [];
    if (Array.isArray(steps) === false) {
      return resultset;
    }
    for (const step of steps) {
      switch (step.mv) {
        case this.#ROOT:
          resultset = [["$"]];
          break;
        case this.#CURRENT:
          resultset = [pathin];
          break;
        case this.#CHILDREN:
        case this.#DESCENDANTS:
          resultset = this.#getMatches(resultset, step);
          break;
        default:
          break;
      }
    }
    return resultset;
  }
  #getMatches(listin, step) {
    const listout = [];
    for (const pathin of listin) {
      const { value: owner } = this.#resolvePath(pathin);
      if (step.k === "*") {
        this.#getMatchesFromAll(pathin, step, owner, listout);
      } else if (step.k !== void 0) {
        this.#getMatchesFromKeys(pathin, step, owner, listout);
      } else if (step.steps) {
        this.#getMatchesFromExpr(pathin, step, owner, listout);
      }
    }
    return listout;
  }
  #getMatchesFromAll(pathin, step, owner, out) {
    const recursive = step.mv === this.#DESCENDANTS;
    for (const { path } of this.#getDescendants(owner, recursive)) {
      out.push([...pathin, ...path]);
    }
  }
  #getMatchesFromKeys(pathin, step, owner, out) {
    const kk = Array.isArray(step.k) ? step.k : [step.k];
    for (const k2 of kk) {
      const normalized = this.#evaluateExpr(step, owner, k2);
      if (normalized === void 0) {
        continue;
      }
      out.push([...pathin, normalized]);
    }
    if (step.mv !== this.#DESCENDANTS) {
      return;
    }
    for (const { obj, key, path } of this.#getDescendants(owner, true)) {
      for (const k2 of kk) {
        const normalized = this.#evaluateExpr(step, obj[key], k2);
        if (normalized === void 0) {
          continue;
        }
        out.push([...pathin, ...path, normalized]);
      }
    }
  }
  #getMatchesFromExpr(pathin, step, owner, out) {
    const recursive = step.mv === this.#DESCENDANTS;
    if (Array.isArray(owner) === false) {
      const r = this.#evaluate(step.steps, pathin);
      if (r.length !== 0) {
        out.push(pathin);
      }
      if (recursive !== true) {
        return;
      }
    }
    for (const { obj, key, path } of this.#getDescendants(owner, recursive)) {
      if (Array.isArray(obj[key])) {
        continue;
      }
      const q2 = [...pathin, ...path];
      const r = this.#evaluate(step.steps, q2);
      if (r.length === 0) {
        continue;
      }
      out.push(q2);
    }
  }
  #normalizeKey(owner, key) {
    if (typeof key === "number") {
      if (Array.isArray(owner)) {
        return key >= 0 ? key : owner.length + key;
      }
    }
    return key;
  }
  #getDescendants(v2, recursive) {
    const iterator = {
      next() {
        const n = this.stack.length;
        if (n === 0) {
          this.value = void 0;
          this.done = true;
          return this;
        }
        const details = this.stack[n - 1];
        const entry = details.keys.next();
        if (entry.done) {
          this.stack.pop();
          this.path.pop();
          return this.next();
        }
        this.path[n - 1] = entry.value;
        this.value = {
          obj: details.obj,
          key: entry.value,
          path: this.path.slice()
        };
        const v3 = this.value.obj[this.value.key];
        if (recursive) {
          if (Array.isArray(v3)) {
            this.stack.push({ obj: v3, keys: v3.keys() });
          } else if (typeof v3 === "object" && v3 !== null) {
            this.stack.push({ obj: v3, keys: Object.keys(v3).values() });
          }
        }
        return this;
      },
      path: [],
      value: void 0,
      done: false,
      stack: [],
      [Symbol.iterator]() {
        return this;
      }
    };
    if (Array.isArray(v2)) {
      iterator.stack.push({ obj: v2, keys: v2.keys() });
    } else if (typeof v2 === "object" && v2 !== null) {
      iterator.stack.push({ obj: v2, keys: Object.keys(v2).values() });
    }
    return iterator;
  }
  #consumeIdentifier(query, i) {
    const keys = [];
    for (; ; ) {
      const c0 = query.charCodeAt(i);
      if (c0 === 93) {
        break;
      }
      if (c0 === 44) {
        i += 1;
        continue;
      }
      if (c0 === 39) {
        const r = this.#untilChar(query, 39, i + 1);
        if (r === void 0) {
          return;
        }
        keys.push(r.s);
        i = r.i;
        continue;
      }
      if (c0 === 45 || c0 >= 48 && c0 <= 57) {
        const match = this.#reIndice.exec(query.slice(i));
        if (match === null) {
          return;
        }
        const indice = parseInt(query.slice(i), 10);
        keys.push(indice);
        i += match[0].length;
        continue;
      }
      const s = this.#consumeUnquotedIdentifier(query, i);
      if (s === void 0) {
        return;
      }
      keys.push(s);
      i += s.length;
    }
    return { s: keys.length === 1 ? keys[0] : keys, i };
  }
  #consumeUnquotedIdentifier(query, i) {
    const match = this.#reUnquotedIdentifier.exec(query.slice(i));
    if (match === null) {
      return;
    }
    return match[0];
  }
  #untilChar(query, targetCharCode, i) {
    const len = query.length;
    const parts = [];
    let beg = i, end = i;
    for (; ; ) {
      if (end === len) {
        return;
      }
      const c = query.charCodeAt(end);
      if (c === targetCharCode) {
        parts.push(query.slice(beg, end));
        end += 1;
        break;
      }
      if (c === 92 && end + 1 < len) {
        const d2 = query.charCodeAt(end + 1);
        if (d2 === targetCharCode) {
          parts.push(query.slice(beg, end));
          end += 1;
          beg = end;
        }
      }
      end += 1;
    }
    return { s: parts.join(""), i: end };
  }
  #compileExpr(query, step, i) {
    if (query.startsWith("=/", i)) {
      const r = this.#untilChar(query, 47, i + 2);
      if (r === void 0) {
        return i;
      }
      const match2 = /^[i]/.exec(query.slice(r.i));
      try {
        step.rval = new RegExp(r.s, match2 && match2[0] || void 0);
      } catch {
        return i;
      }
      step.op = "re";
      if (match2) {
        r.i += match2[0].length;
      }
      return r.i;
    }
    const match = this.#reExpr.exec(query.slice(i));
    if (match === null) {
      return i;
    }
    try {
      step.rval = JSON.parse(match[2]);
      step.op = match[1];
    } catch {
    }
    return i + match[1].length + match[2].length;
  }
  #resolvePath(path) {
    if (path.length === 0) {
      return { value: this.#root };
    }
    const key = path.at(-1);
    let obj = this.#root;
    for (let i = 0, n = path.length - 1; i < n; i++) {
      obj = obj[path[i]];
    }
    return { obj, key, value: obj[key] };
  }
  #evaluateExpr(step, owner, key) {
    if (owner === void 0 || owner === null) {
      return;
    }
    if (typeof key === "number") {
      if (Array.isArray(owner) === false) {
        return;
      }
    }
    const k2 = this.#normalizeKey(owner, key);
    const hasOwn = Object.hasOwn(owner, k2);
    if (step.op !== void 0 && hasOwn === false) {
      return;
    }
    const target = step.not !== true;
    const v2 = owner[k2];
    let outcome = false;
    switch (step.op) {
      case "==":
        outcome = v2 === step.rval === target;
        break;
      case "!=":
        outcome = v2 !== step.rval === target;
        break;
      case "<":
        outcome = v2 < step.rval === target;
        break;
      case "<=":
        outcome = v2 <= step.rval === target;
        break;
      case ">":
        outcome = v2 > step.rval === target;
        break;
      case ">=":
        outcome = v2 >= step.rval === target;
        break;
      case "^=":
        outcome = `${v2}`.startsWith(step.rval) === target;
        break;
      case "$=":
        outcome = `${v2}`.endsWith(step.rval) === target;
        break;
      case "*=":
        outcome = `${v2}`.includes(step.rval) === target;
        break;
      case "re":
        outcome = step.rval.test(`${v2}`);
        break;
      default:
        outcome = hasOwn === target;
        break;
    }
    if (outcome) {
      return k2;
    }
  }
  #modifyVal(obj, key) {
    let { modify, rval } = this.#compiled;
    if (typeof rval === "string") {
      rval = rval.replace("${now}", `${Date.now()}`);
    }
    switch (modify) {
      case void 0:
        obj[key] = rval;
        break;
      case "+": {
        if (rval instanceof Object === false) {
          return;
        }
        const lval = obj[key];
        if (lval instanceof Object === false) {
          return;
        }
        if (Array.isArray(lval)) {
          return;
        }
        for (const [k2, v2] of Object.entries(rval)) {
          lval[k2] = v2;
        }
        break;
      }
      case "repl": {
        const lval = obj[key];
        if (typeof lval !== "string") {
          return;
        }
        if (this.#compiled.re === void 0) {
          this.#compiled.re = null;
          try {
            this.#compiled.re = rval.regex !== void 0 ? new RegExp(rval.regex, rval.flags) : new RegExp(rval.pattern.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"));
          } catch {
          }
        }
        if (this.#compiled.re === null) {
          return;
        }
        obj[key] = lval.replace(this.#compiled.re, rval.replacement);
        break;
      }
      default:
        break;
    }
  }
};

// ubo-src/js/static-filtering-parser.js
var iota = 0;
iota = 0;
var AST_TYPE_NONE = iota++;
var AST_TYPE_UNKNOWN = iota++;
var AST_TYPE_COMMENT = iota++;
var AST_TYPE_NETWORK = iota++;
var AST_TYPE_EXTENDED = iota++;
iota = 0;
var AST_TYPE_NETWORK_PATTERN_ANY = iota++;
var AST_TYPE_NETWORK_PATTERN_HOSTNAME = iota++;
var AST_TYPE_NETWORK_PATTERN_PLAIN = iota++;
var AST_TYPE_NETWORK_PATTERN_REGEX = iota++;
var AST_TYPE_NETWORK_PATTERN_GENERIC = iota++;
var AST_TYPE_NETWORK_PATTERN_BAD = iota++;
var AST_TYPE_EXTENDED_COSMETIC = iota++;
var AST_TYPE_EXTENDED_SCRIPTLET = iota++;
var AST_TYPE_EXTENDED_HTML = iota++;
var AST_TYPE_EXTENDED_RESPONSEHEADER = iota++;
var AST_TYPE_COMMENT_PREPARSER = iota++;
iota = 0;
var AST_FLAG_UNSUPPORTED = 1 << iota++;
var AST_FLAG_IGNORE = 1 << iota++;
var AST_FLAG_HAS_ERROR = 1 << iota++;
var AST_FLAG_IS_EXCEPTION = 1 << iota++;
var AST_FLAG_EXT_STRONG = 1 << iota++;
var AST_FLAG_EXT_STYLE = 1 << iota++;
var AST_FLAG_EXT_SCRIPTLET_ADG = 1 << iota++;
var AST_FLAG_NET_PATTERN_LEFT_HNANCHOR = 1 << iota++;
var AST_FLAG_NET_PATTERN_RIGHT_PATHANCHOR = 1 << iota++;
var AST_FLAG_NET_PATTERN_LEFT_ANCHOR = 1 << iota++;
var AST_FLAG_NET_PATTERN_RIGHT_ANCHOR = 1 << iota++;
var AST_FLAG_HAS_OPTIONS = 1 << iota++;
iota = 0;
var AST_ERROR_NONE = 1 << iota++;
var AST_ERROR_REGEX = 1 << iota++;
var AST_ERROR_PATTERN = 1 << iota++;
var AST_ERROR_DOMAIN_NAME = 1 << iota++;
var AST_ERROR_OPTION_DUPLICATE = 1 << iota++;
var AST_ERROR_OPTION_UNKNOWN = 1 << iota++;
var AST_ERROR_OPTION_BADVALUE = 1 << iota++;
var AST_ERROR_OPTION_EXCLUDED = 1 << iota++;
var AST_ERROR_IF_TOKEN_UNKNOWN = 1 << iota++;
var AST_ERROR_UNTRUSTED_SOURCE = 1 << iota++;
iota = 0;
var NODE_RIGHT_INDEX = iota++;
var NOOP_NODE_SIZE = iota;
var NODE_TYPE_INDEX = iota++;
var NODE_DOWN_INDEX = iota++;
var NODE_BEG_INDEX = iota++;
var NODE_END_INDEX = iota++;
var NODE_FLAGS_INDEX = iota++;
var NODE_TRANSFORM_INDEX = iota++;
var FULL_NODE_SIZE = iota;
iota = 0;
var NODE_TYPE_NOOP = iota++;
var NODE_TYPE_LINE_RAW = iota++;
var NODE_TYPE_LINE_BODY = iota++;
var NODE_TYPE_WHITESPACE = iota++;
var NODE_TYPE_COMMENT = iota++;
var NODE_TYPE_IGNORE = iota++;
var NODE_TYPE_EXT_RAW = iota++;
var NODE_TYPE_EXT_OPTIONS_ANCHOR = iota++;
var NODE_TYPE_EXT_OPTIONS = iota++;
var NODE_TYPE_EXT_DECORATION = iota++;
var NODE_TYPE_EXT_PATTERN_RAW = iota++;
var NODE_TYPE_EXT_PATTERN_COSMETIC = iota++;
var NODE_TYPE_EXT_PATTERN_HTML = iota++;
var NODE_TYPE_EXT_PATTERN_RESPONSEHEADER = iota++;
var NODE_TYPE_EXT_PATTERN_SCRIPTLET = iota++;
var NODE_TYPE_EXT_PATTERN_SCRIPTLET_TOKEN = iota++;
var NODE_TYPE_EXT_PATTERN_SCRIPTLET_ARGS = iota++;
var NODE_TYPE_EXT_PATTERN_SCRIPTLET_ARG = iota++;
var NODE_TYPE_NET_RAW = iota++;
var NODE_TYPE_NET_EXCEPTION = iota++;
var NODE_TYPE_NET_PATTERN_RAW = iota++;
var NODE_TYPE_NET_PATTERN = iota++;
var NODE_TYPE_NET_PATTERN_PART = iota++;
var NODE_TYPE_NET_PATTERN_PART_SPECIAL = iota++;
var NODE_TYPE_NET_PATTERN_PART_UNICODE = iota++;
var NODE_TYPE_NET_PATTERN_LEFT_HNANCHOR = iota++;
var NODE_TYPE_NET_PATTERN_LEFT_ANCHOR = iota++;
var NODE_TYPE_NET_PATTERN_RIGHT_ANCHOR = iota++;
var NODE_TYPE_NET_OPTIONS_ANCHOR = iota++;
var NODE_TYPE_NET_OPTIONS = iota++;
var NODE_TYPE_NET_OPTION_SEPARATOR = iota++;
var NODE_TYPE_NET_OPTION_SENTINEL = iota++;
var NODE_TYPE_NET_OPTION_RAW = iota++;
var NODE_TYPE_NET_OPTION_NAME_NOT = iota++;
var NODE_TYPE_NET_OPTION_NAME_UNKNOWN = iota++;
var NODE_TYPE_NET_OPTION_NAME_1P = iota++;
var NODE_TYPE_NET_OPTION_NAME_STRICT1P = iota++;
var NODE_TYPE_NET_OPTION_NAME_3P = iota++;
var NODE_TYPE_NET_OPTION_NAME_STRICT3P = iota++;
var NODE_TYPE_NET_OPTION_NAME_ALL = iota++;
var NODE_TYPE_NET_OPTION_NAME_BADFILTER = iota++;
var NODE_TYPE_NET_OPTION_NAME_CNAME = iota++;
var NODE_TYPE_NET_OPTION_NAME_CSP = iota++;
var NODE_TYPE_NET_OPTION_NAME_CSS = iota++;
var NODE_TYPE_NET_OPTION_NAME_DENYALLOW = iota++;
var NODE_TYPE_NET_OPTION_NAME_DOC = iota++;
var NODE_TYPE_NET_OPTION_NAME_EHIDE = iota++;
var NODE_TYPE_NET_OPTION_NAME_EMPTY = iota++;
var NODE_TYPE_NET_OPTION_NAME_FONT = iota++;
var NODE_TYPE_NET_OPTION_NAME_FRAME = iota++;
var NODE_TYPE_NET_OPTION_NAME_FROM = iota++;
var NODE_TYPE_NET_OPTION_NAME_GENERICBLOCK = iota++;
var NODE_TYPE_NET_OPTION_NAME_GHIDE = iota++;
var NODE_TYPE_NET_OPTION_NAME_RESPONSEHEADER = iota++;
var NODE_TYPE_NET_OPTION_NAME_IMAGE = iota++;
var NODE_TYPE_NET_OPTION_NAME_IMPORTANT = iota++;
var NODE_TYPE_NET_OPTION_NAME_INLINEFONT = iota++;
var NODE_TYPE_NET_OPTION_NAME_INLINESCRIPT = iota++;
var NODE_TYPE_NET_OPTION_NAME_IPADDRESS = iota++;
var NODE_TYPE_NET_OPTION_NAME_MATCHCASE = iota++;
var NODE_TYPE_NET_OPTION_NAME_MEDIA = iota++;
var NODE_TYPE_NET_OPTION_NAME_METHOD = iota++;
var NODE_TYPE_NET_OPTION_NAME_MP4 = iota++;
var NODE_TYPE_NET_OPTION_NAME_NOOP = iota++;
var NODE_TYPE_NET_OPTION_NAME_OBJECT = iota++;
var NODE_TYPE_NET_OPTION_NAME_OTHER = iota++;
var NODE_TYPE_NET_OPTION_NAME_PERMISSIONS = iota++;
var NODE_TYPE_NET_OPTION_NAME_PING = iota++;
var NODE_TYPE_NET_OPTION_NAME_POPUNDER = iota++;
var NODE_TYPE_NET_OPTION_NAME_POPUP = iota++;
var NODE_TYPE_NET_OPTION_NAME_REASON = iota++;
var NODE_TYPE_NET_OPTION_NAME_REDIRECT = iota++;
var NODE_TYPE_NET_OPTION_NAME_REDIRECTRULE = iota++;
var NODE_TYPE_NET_OPTION_NAME_REMOVEPARAM = iota++;
var NODE_TYPE_NET_OPTION_NAME_REPLACE = iota++;
var NODE_TYPE_NET_OPTION_NAME_REQUESTHEADER = iota++;
var NODE_TYPE_NET_OPTION_NAME_SCRIPT = iota++;
var NODE_TYPE_NET_OPTION_NAME_SHIDE = iota++;
var NODE_TYPE_NET_OPTION_NAME_TO = iota++;
var NODE_TYPE_NET_OPTION_NAME_TOP = iota++;
var NODE_TYPE_NET_OPTION_NAME_URLSKIP = iota++;
var NODE_TYPE_NET_OPTION_NAME_URLTRANSFORM = iota++;
var NODE_TYPE_NET_OPTION_NAME_XHR = iota++;
var NODE_TYPE_NET_OPTION_NAME_WEBRTC = iota++;
var NODE_TYPE_NET_OPTION_NAME_WEBSOCKET = iota++;
var NODE_TYPE_NET_OPTION_ASSIGN = iota++;
var NODE_TYPE_NET_OPTION_QUOTE = iota++;
var NODE_TYPE_NET_OPTION_VALUE = iota++;
var NODE_TYPE_OPTION_VALUE_DOMAIN_LIST = iota++;
var NODE_TYPE_OPTION_VALUE_DOMAIN_RAW = iota++;
var NODE_TYPE_OPTION_VALUE_NOT = iota++;
var NODE_TYPE_OPTION_VALUE_DOMAIN = iota++;
var NODE_TYPE_OPTION_VALUE_SEPARATOR = iota++;
var NODE_TYPE_PREPARSE_DIRECTIVE = iota++;
var NODE_TYPE_PREPARSE_DIRECTIVE_VALUE = iota++;
var NODE_TYPE_PREPARSE_DIRECTIVE_IF = iota++;
var NODE_TYPE_PREPARSE_DIRECTIVE_IF_VALUE = iota++;
var NODE_TYPE_COMMENT_URL = iota++;
var NODE_TYPE_COUNT = iota;
iota = 0;
var NODE_FLAG_IGNORE = 1 << iota++;
var NODE_FLAG_ERROR = 1 << iota++;
var NODE_FLAG_IS_NEGATED = 1 << iota++;
var NODE_FLAG_OPTION_HAS_VALUE = 1 << iota++;
var NODE_FLAG_PATTERN_UNTOKENIZABLE = 1 << iota++;
var nodeTypeFromOptionName = /* @__PURE__ */ new Map([
  ["", NODE_TYPE_NET_OPTION_NAME_UNKNOWN],
  ["1p", NODE_TYPE_NET_OPTION_NAME_1P],
  /* synonym */
  ["first-party", NODE_TYPE_NET_OPTION_NAME_1P],
  ["strict1p", NODE_TYPE_NET_OPTION_NAME_STRICT1P],
  /* synonym */
  ["strict-first-party", NODE_TYPE_NET_OPTION_NAME_STRICT1P],
  ["3p", NODE_TYPE_NET_OPTION_NAME_3P],
  /* synonym */
  ["third-party", NODE_TYPE_NET_OPTION_NAME_3P],
  ["strict3p", NODE_TYPE_NET_OPTION_NAME_STRICT3P],
  /* synonym */
  ["strict-third-party", NODE_TYPE_NET_OPTION_NAME_STRICT3P],
  ["all", NODE_TYPE_NET_OPTION_NAME_ALL],
  ["badfilter", NODE_TYPE_NET_OPTION_NAME_BADFILTER],
  ["cname", NODE_TYPE_NET_OPTION_NAME_CNAME],
  ["csp", NODE_TYPE_NET_OPTION_NAME_CSP],
  ["css", NODE_TYPE_NET_OPTION_NAME_CSS],
  /* synonym */
  ["stylesheet", NODE_TYPE_NET_OPTION_NAME_CSS],
  ["denyallow", NODE_TYPE_NET_OPTION_NAME_DENYALLOW],
  ["doc", NODE_TYPE_NET_OPTION_NAME_DOC],
  /* synonym */
  ["document", NODE_TYPE_NET_OPTION_NAME_DOC],
  ["ehide", NODE_TYPE_NET_OPTION_NAME_EHIDE],
  /* synonym */
  ["elemhide", NODE_TYPE_NET_OPTION_NAME_EHIDE],
  ["empty", NODE_TYPE_NET_OPTION_NAME_EMPTY],
  ["font", NODE_TYPE_NET_OPTION_NAME_FONT],
  ["frame", NODE_TYPE_NET_OPTION_NAME_FRAME],
  /* synonym */
  ["subdocument", NODE_TYPE_NET_OPTION_NAME_FRAME],
  ["from", NODE_TYPE_NET_OPTION_NAME_FROM],
  /* synonym */
  ["domain", NODE_TYPE_NET_OPTION_NAME_FROM],
  ["genericblock", NODE_TYPE_NET_OPTION_NAME_GENERICBLOCK],
  ["ghide", NODE_TYPE_NET_OPTION_NAME_GHIDE],
  /* synonym */
  ["generichide", NODE_TYPE_NET_OPTION_NAME_GHIDE],
  ["image", NODE_TYPE_NET_OPTION_NAME_IMAGE],
  ["important", NODE_TYPE_NET_OPTION_NAME_IMPORTANT],
  ["inline-font", NODE_TYPE_NET_OPTION_NAME_INLINEFONT],
  ["inline-script", NODE_TYPE_NET_OPTION_NAME_INLINESCRIPT],
  ["ipaddress", NODE_TYPE_NET_OPTION_NAME_IPADDRESS],
  ["match-case", NODE_TYPE_NET_OPTION_NAME_MATCHCASE],
  ["media", NODE_TYPE_NET_OPTION_NAME_MEDIA],
  ["method", NODE_TYPE_NET_OPTION_NAME_METHOD],
  ["mp4", NODE_TYPE_NET_OPTION_NAME_MP4],
  ["_", NODE_TYPE_NET_OPTION_NAME_NOOP],
  ["object", NODE_TYPE_NET_OPTION_NAME_OBJECT],
  /* synonym */
  ["object-subrequest", NODE_TYPE_NET_OPTION_NAME_OBJECT],
  ["other", NODE_TYPE_NET_OPTION_NAME_OTHER],
  ["permissions", NODE_TYPE_NET_OPTION_NAME_PERMISSIONS],
  ["ping", NODE_TYPE_NET_OPTION_NAME_PING],
  /* synonym */
  ["beacon", NODE_TYPE_NET_OPTION_NAME_PING],
  ["popunder", NODE_TYPE_NET_OPTION_NAME_POPUNDER],
  ["popup", NODE_TYPE_NET_OPTION_NAME_POPUP],
  ["reason", NODE_TYPE_NET_OPTION_NAME_REASON],
  ["redirect", NODE_TYPE_NET_OPTION_NAME_REDIRECT],
  /* synonym */
  ["rewrite", NODE_TYPE_NET_OPTION_NAME_REDIRECT],
  ["redirect-rule", NODE_TYPE_NET_OPTION_NAME_REDIRECTRULE],
  ["removeparam", NODE_TYPE_NET_OPTION_NAME_REMOVEPARAM],
  ["replace", NODE_TYPE_NET_OPTION_NAME_REPLACE],
  /* synonym */
  ["queryprune", NODE_TYPE_NET_OPTION_NAME_REMOVEPARAM],
  ["requestheader", NODE_TYPE_NET_OPTION_NAME_REQUESTHEADER],
  ["responseheader", NODE_TYPE_NET_OPTION_NAME_RESPONSEHEADER],
  /* synonym */
  ["header", NODE_TYPE_NET_OPTION_NAME_RESPONSEHEADER],
  ["script", NODE_TYPE_NET_OPTION_NAME_SCRIPT],
  ["shide", NODE_TYPE_NET_OPTION_NAME_SHIDE],
  /* synonym */
  ["specifichide", NODE_TYPE_NET_OPTION_NAME_SHIDE],
  ["to", NODE_TYPE_NET_OPTION_NAME_TO],
  ["top", NODE_TYPE_NET_OPTION_NAME_TOP],
  ["urlskip", NODE_TYPE_NET_OPTION_NAME_URLSKIP],
  ["uritransform", NODE_TYPE_NET_OPTION_NAME_URLTRANSFORM],
  ["xhr", NODE_TYPE_NET_OPTION_NAME_XHR],
  /* synonym */
  ["xmlhttprequest", NODE_TYPE_NET_OPTION_NAME_XHR],
  ["webrtc", NODE_TYPE_NET_OPTION_NAME_WEBRTC],
  ["websocket", NODE_TYPE_NET_OPTION_NAME_WEBSOCKET]
]);
var nodeNameFromNodeType = /* @__PURE__ */ new Map([
  [NODE_TYPE_NOOP, "noop"],
  [NODE_TYPE_LINE_RAW, "lineRaw"],
  [NODE_TYPE_LINE_BODY, "lineBody"],
  [NODE_TYPE_WHITESPACE, "whitespace"],
  [NODE_TYPE_COMMENT, "comment"],
  [NODE_TYPE_IGNORE, "ignore"],
  [NODE_TYPE_EXT_RAW, "extRaw"],
  [NODE_TYPE_EXT_OPTIONS_ANCHOR, "extOptionsAnchor"],
  [NODE_TYPE_EXT_OPTIONS, "extOptions"],
  [NODE_TYPE_EXT_DECORATION, "extDecoration"],
  [NODE_TYPE_EXT_PATTERN_RAW, "extPatternRaw"],
  [NODE_TYPE_EXT_PATTERN_COSMETIC, "extPatternCosmetic"],
  [NODE_TYPE_EXT_PATTERN_HTML, "extPatternHtml"],
  [NODE_TYPE_EXT_PATTERN_RESPONSEHEADER, "extPatternResponseheader"],
  [NODE_TYPE_EXT_PATTERN_SCRIPTLET, "extPatternScriptlet"],
  [NODE_TYPE_EXT_PATTERN_SCRIPTLET_TOKEN, "extPatternScriptletToken"],
  [NODE_TYPE_EXT_PATTERN_SCRIPTLET_ARGS, "extPatternScriptletArgs"],
  [NODE_TYPE_EXT_PATTERN_SCRIPTLET_ARG, "extPatternScriptletArg"],
  [NODE_TYPE_NET_RAW, "netRaw"],
  [NODE_TYPE_NET_EXCEPTION, "netException"],
  [NODE_TYPE_NET_PATTERN_RAW, "netPatternRaw"],
  [NODE_TYPE_NET_PATTERN, "netPattern"],
  [NODE_TYPE_NET_PATTERN_PART, "netPatternPart"],
  [NODE_TYPE_NET_PATTERN_PART_SPECIAL, "netPatternPartSpecial"],
  [NODE_TYPE_NET_PATTERN_PART_UNICODE, "netPatternPartUnicode"],
  [NODE_TYPE_NET_PATTERN_LEFT_HNANCHOR, "netPatternLeftHnanchor"],
  [NODE_TYPE_NET_PATTERN_LEFT_ANCHOR, "netPatternLeftAnchor"],
  [NODE_TYPE_NET_PATTERN_RIGHT_ANCHOR, "netPatternRightAnchor"],
  [NODE_TYPE_NET_OPTIONS_ANCHOR, "netOptionsAnchor"],
  [NODE_TYPE_NET_OPTIONS, "netOptions"],
  [NODE_TYPE_NET_OPTION_RAW, "netOptionRaw"],
  [NODE_TYPE_NET_OPTION_SEPARATOR, "netOptionSeparator"],
  [NODE_TYPE_NET_OPTION_SENTINEL, "netOptionSentinel"],
  [NODE_TYPE_NET_OPTION_NAME_NOT, "netOptionNameNot"],
  [NODE_TYPE_NET_OPTION_ASSIGN, "netOptionAssign"],
  [NODE_TYPE_NET_OPTION_VALUE, "netOptionValue"],
  [NODE_TYPE_OPTION_VALUE_DOMAIN_LIST, "netOptionValueDomainList"],
  [NODE_TYPE_OPTION_VALUE_DOMAIN_RAW, "netOptionValueDomainRaw"],
  [NODE_TYPE_OPTION_VALUE_NOT, "netOptionValueNot"],
  [NODE_TYPE_OPTION_VALUE_DOMAIN, "netOptionValueDomain"],
  [NODE_TYPE_OPTION_VALUE_SEPARATOR, "netOptionsValueSeparator"]
]);
{
  for (const [name, type] of nodeTypeFromOptionName) {
    nodeNameFromNodeType.set(type, name);
  }
}
var DOMAIN_CAN_USE_WILDCARD = 1;
var DOMAIN_CAN_USE_ENTITY = 2;
var DOMAIN_CAN_USE_SINGLE_WILDCARD = 4;
var DOMAIN_CAN_BE_NEGATED = 8;
var DOMAIN_CAN_BE_REGEX = 16;
var DOMAIN_CAN_BE_ANCESTOR = 32;
var DOMAIN_CAN_HAVE_PATH = 64;
var DOMAIN_FROM_FROMTO_LIST = DOMAIN_CAN_USE_ENTITY | DOMAIN_CAN_BE_NEGATED | DOMAIN_CAN_BE_REGEX;
var DOMAIN_FROM_DENYALLOW_LIST = 0;
var DOMAIN_FROM_EXT_LIST = DOMAIN_CAN_USE_ENTITY | DOMAIN_CAN_USE_SINGLE_WILDCARD | DOMAIN_CAN_BE_NEGATED | DOMAIN_CAN_BE_REGEX | DOMAIN_CAN_BE_ANCESTOR | DOMAIN_CAN_HAVE_PATH;
var astTemplates = {
  // ||example.com^
  netHnAnchoredHostnameAscii: {
    flags: AST_FLAG_NET_PATTERN_LEFT_HNANCHOR | AST_FLAG_NET_PATTERN_RIGHT_PATHANCHOR,
    type: NODE_TYPE_LINE_BODY,
    beg: 0,
    end: 0,
    children: [{
      type: NODE_TYPE_NET_RAW,
      beg: 0,
      end: 0,
      children: [{
        type: NODE_TYPE_NET_PATTERN_RAW,
        beg: 0,
        end: 0,
        register: true,
        children: [{
          type: NODE_TYPE_NET_PATTERN_LEFT_HNANCHOR,
          beg: 0,
          end: 2
        }, {
          type: NODE_TYPE_NET_PATTERN,
          beg: 2,
          end: -1,
          register: true
        }, {
          type: NODE_TYPE_NET_PATTERN_PART_SPECIAL,
          beg: -1,
          end: 0
        }]
      }]
    }]
  },
  // ||example.com^$third-party
  net3pHnAnchoredHostnameAscii: {
    flags: AST_FLAG_NET_PATTERN_LEFT_HNANCHOR | AST_FLAG_NET_PATTERN_RIGHT_PATHANCHOR | AST_FLAG_HAS_OPTIONS,
    type: NODE_TYPE_LINE_BODY,
    beg: 0,
    end: 0,
    children: [{
      type: NODE_TYPE_NET_RAW,
      beg: 0,
      end: 0,
      children: [{
        type: NODE_TYPE_NET_PATTERN_RAW,
        beg: 0,
        end: 0,
        register: true,
        children: [{
          type: NODE_TYPE_NET_PATTERN_LEFT_HNANCHOR,
          beg: 0,
          end: 2
        }, {
          type: NODE_TYPE_NET_PATTERN,
          beg: 2,
          end: -13,
          register: true
        }, {
          type: NODE_TYPE_NET_PATTERN_PART_SPECIAL,
          beg: -13,
          end: -12
        }]
      }, {
        type: NODE_TYPE_NET_OPTIONS_ANCHOR,
        beg: -12,
        end: -11
      }, {
        type: NODE_TYPE_NET_OPTIONS,
        beg: -11,
        end: 0,
        register: true,
        children: [{
          type: NODE_TYPE_NET_OPTION_RAW,
          beg: 0,
          end: 0,
          children: [{
            type: NODE_TYPE_NET_OPTION_NAME_3P,
            beg: 0,
            end: 0,
            register: true
          }]
        }]
      }]
    }]
  },
  // ||example.com/path/to/resource
  netHnAnchoredPlainAscii: {
    flags: AST_FLAG_NET_PATTERN_LEFT_HNANCHOR,
    type: NODE_TYPE_LINE_BODY,
    beg: 0,
    end: 0,
    children: [{
      type: NODE_TYPE_NET_RAW,
      beg: 0,
      end: 0,
      children: [{
        type: NODE_TYPE_NET_PATTERN_RAW,
        beg: 0,
        end: 0,
        register: true,
        children: [{
          type: NODE_TYPE_NET_PATTERN_LEFT_HNANCHOR,
          beg: 0,
          end: 2
        }, {
          type: NODE_TYPE_NET_PATTERN,
          beg: 2,
          end: 0,
          register: true
        }]
      }]
    }]
  },
  // example.com
  // -resource.
  netPlainAscii: {
    type: NODE_TYPE_LINE_BODY,
    beg: 0,
    end: 0,
    children: [{
      type: NODE_TYPE_NET_RAW,
      beg: 0,
      end: 0,
      children: [{
        type: NODE_TYPE_NET_PATTERN_RAW,
        beg: 0,
        end: 0,
        register: true,
        children: [{
          type: NODE_TYPE_NET_PATTERN,
          beg: 0,
          end: 0,
          register: true
        }]
      }]
    }]
  },
  // 127.0.0.1 example.com
  netHosts1: {
    type: NODE_TYPE_LINE_BODY,
    beg: 0,
    end: 0,
    children: [{
      type: NODE_TYPE_NET_RAW,
      beg: 0,
      end: 0,
      children: [{
        type: NODE_TYPE_NET_PATTERN_RAW,
        beg: 0,
        end: 0,
        register: true,
        children: [{
          type: NODE_TYPE_IGNORE,
          beg: 0,
          end: 10
        }, {
          type: NODE_TYPE_NET_PATTERN,
          beg: 10,
          end: 0,
          register: true
        }]
      }]
    }]
  },
  // 0.0.0.0 example.com
  netHosts2: {
    type: NODE_TYPE_LINE_BODY,
    beg: 0,
    end: 0,
    children: [{
      type: NODE_TYPE_NET_RAW,
      beg: 0,
      end: 0,
      children: [{
        type: NODE_TYPE_NET_PATTERN_RAW,
        beg: 0,
        end: 0,
        register: true,
        children: [{
          type: NODE_TYPE_IGNORE,
          beg: 0,
          end: 8
        }, {
          type: NODE_TYPE_NET_PATTERN,
          beg: 8,
          end: 0,
          register: true
        }]
      }]
    }]
  },
  // ##.ads-container
  extPlainGenericSelector: {
    type: NODE_TYPE_LINE_BODY,
    beg: 0,
    end: 0,
    children: [{
      type: NODE_TYPE_EXT_RAW,
      beg: 0,
      end: 0,
      children: [{
        type: NODE_TYPE_EXT_OPTIONS_ANCHOR,
        beg: 0,
        end: 2,
        register: true
      }, {
        type: NODE_TYPE_EXT_PATTERN_RAW,
        beg: 2,
        end: 0,
        register: true,
        children: [{
          type: NODE_TYPE_EXT_PATTERN_COSMETIC,
          beg: 0,
          end: 0,
          register: true
        }]
      }]
    }]
  }
};
var removableHTTPHeaders = /* @__PURE__ */ new Set([
  "location",
  "refresh",
  "report-to",
  "set-cookie"
]);
var exCharCodeAt = /* @__PURE__ */ __name((s, i) => {
  const pos = i >= 0 ? i : s.length + i;
  return pos >= 0 ? s.charCodeAt(pos) : -1;
}, "exCharCodeAt");
var escapeForRegex = /* @__PURE__ */ __name((s) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "escapeForRegex");
var AstWalker = class {
  static {
    __name(this, "AstWalker");
  }
  constructor(parser, from = 0) {
    this.parser = parser;
    this.stack = [];
    this.reset(from);
  }
  get depth() {
    return this.stackPtr;
  }
  reset(from = 0) {
    this.nodes = this.parser.nodes;
    this.stackPtr = 0;
    return this.current = from || this.parser.rootNode;
  }
  next() {
    const current = this.current;
    if (current === 0) {
      return 0;
    }
    const down = this.nodes[current + NODE_DOWN_INDEX];
    if (down !== 0) {
      this.stack[this.stackPtr++] = this.current;
      return this.current = down;
    }
    const right = this.nodes[current + NODE_RIGHT_INDEX];
    if (right !== 0 && this.stackPtr !== 0) {
      return this.current = right;
    }
    while (this.stackPtr !== 0) {
      const parent = this.stack[--this.stackPtr];
      const right2 = this.nodes[parent + NODE_RIGHT_INDEX];
      if (right2 !== 0) {
        return this.current = right2;
      }
    }
    return this.current = 0;
  }
  right() {
    const current = this.current;
    if (current === 0) {
      return 0;
    }
    const right = this.nodes[current + NODE_RIGHT_INDEX];
    if (right !== 0 && this.stackPtr !== 0) {
      return this.current = right;
    }
    while (this.stackPtr !== 0) {
      const parent = this.stack[--this.stackPtr];
      const right2 = this.nodes[parent + NODE_RIGHT_INDEX];
      if (right2 !== 0) {
        return this.current = right2;
      }
    }
    return this.current = 0;
  }
  until(which) {
    let node = this.next();
    while (node !== 0) {
      if (this.nodes[node + NODE_TYPE_INDEX] === which) {
        return node;
      }
      node = this.next();
    }
    return 0;
  }
  canGoDown() {
    return this.nodes[this.current + NODE_DOWN_INDEX] !== 0;
  }
  dispose() {
    this.parser.walkerJunkyard.push(this);
  }
};
var DomainListIterator = class {
  static {
    __name(this, "DomainListIterator");
  }
  constructor(parser, root) {
    this.parser = parser;
    this.walker = parser.getWalker();
    this.value = void 0;
    this.item = { hn: "", not: false, bad: false };
    this.reuse(root);
  }
  next() {
    if (this.done) {
      return this.value;
    }
    let node = this.walker.current;
    let ready = false;
    while (node !== 0) {
      switch (this.parser.getNodeType(node)) {
        case NODE_TYPE_OPTION_VALUE_DOMAIN_RAW:
          this.item.hn = "";
          this.item.not = false;
          this.item.bad = this.parser.getNodeFlags(node, NODE_FLAG_ERROR) !== 0;
          break;
        case NODE_TYPE_OPTION_VALUE_NOT:
          this.item.not = true;
          break;
        case NODE_TYPE_OPTION_VALUE_DOMAIN:
          this.item.hn = this.parser.getNodeTransform(node);
          this.value = this.item;
          ready = true;
          break;
        default:
          break;
      }
      node = this.walker.next();
      if (ready) {
        return this;
      }
    }
    return this.stop();
  }
  reuse(root) {
    this.walker.reset(root);
    this.done = false;
    return this;
  }
  stop() {
    this.done = true;
    this.value = void 0;
    this.parser.domainListIteratorJunkyard.push(this);
    return this;
  }
  [Symbol.iterator]() {
    return this;
  }
};
var AstFilterParser = class {
  static {
    __name(this, "AstFilterParser");
  }
  constructor(options = {}) {
    this.raw = "";
    this.rawEnd = 0;
    this.nodes = new Uint32Array(16384);
    this.nodePoolPtr = FULL_NODE_SIZE;
    this.nodePoolEnd = this.nodes.length;
    this.astTransforms = [null];
    this.astTransformPtr = 1;
    this.rootNode = 0;
    this.astType = AST_TYPE_NONE;
    this.astTypeFlavor = AST_TYPE_NONE;
    this.astFlags = 0;
    this.astError = 0;
    this.nodeTypeRegister = [];
    this.nodeTypeRegisterPtr = 0;
    this.nodeTypeLookupTable = new Uint32Array(NODE_TYPE_COUNT);
    this.punycoder = new URL("https://ublock0.invalid/");
    this.domainListIteratorJunkyard = [];
    this.walkerJunkyard = [];
    this.hasWhitespace = false;
    this.hasUnicode = false;
    this.hasUppercase = false;
    this.options = options;
    this.interactive = options.interactive || false;
    this.badTypes = new Set(options.badTypes || []);
    this.maxTokenLength = options.maxTokenLength || 7;
    this.result = { exception: false, raw: "", compiled: "", error: void 0 };
    this.selectorCompiler = new ExtSelectorCompiler(options);
    this.reWhitespaceStart = /^\s+/;
    this.reWhitespaceEnd = /(?:^|\S)(\s+)$/;
    this.reCommentLine = /^(?:!|#\s|####|\[adblock)/i;
    this.reExtAnchor = /(#@?(?:\$\?|\$|%|\?)?#).{1,2}/;
    this.reInlineComment = /(?:\s+#).*?$/;
    this.reNetException = /^@@/;
    this.reNetAnchor = /(?:)\$[^,\w~]/;
    this.reHnAnchoredPlainAscii = /^\|\|[0-9a-z%&,\-./:;=?_]+$/;
    this.reHnAnchoredHostnameAscii = /^\|\|(?:[\da-z][\da-z_-]*\.)*[\da-z_-]*[\da-z]\^$/;
    this.reHnAnchoredHostnameUnicode = /^\|\|(?:[\p{L}\p{N}][\p{L}\p{N}\u{2d}]*\.)*[\p{L}\p{N}\u{2d}]*[\p{L}\p{N}]\^$/u;
    this.reHn3pAnchoredHostnameAscii = /^\|\|(?:[\da-z][\da-z_-]*\.)*[\da-z_-]*[\da-z]\^\$third-party$/;
    this.rePlainAscii = /^[0-9a-z%&\-./:;=?_]{2,}$/;
    this.reNetHosts1 = /^127\.0\.0\.1 (?:[\da-z][\da-z_-]*\.)+[\da-z-]*[a-z]$/;
    this.reNetHosts2 = /^0\.0\.0\.0 (?:[\da-z][\da-z_-]*\.)+[\da-z-]*[a-z]$/;
    this.rePlainGenericCosmetic = /^##[.#][A-Za-z_][\w-]*$/;
    this.reHostnameAscii = /^(?:[\da-z][\da-z_-]*\.)*[\da-z][\da-z-]*[\da-z]$/;
    this.rePlainEntity = /^(?:[\da-z][\da-z_-]*\.)+\*$/;
    this.reHostsSink = /^[\w%.:[\]-]+\s+/;
    this.reHostsRedirect = /(?:0\.0\.0\.0|broadcasthost|local|localhost(?:\.localdomain)?|ip6-\w+)(?:[^\w.-]|$)/;
    this.reNetOptionComma = /,(?:~?[13a-z-]+(?:=.*?)?|_+)(?:,|$)/;
    this.rePointlessLeftAnchor = /^\|\|?\*+/;
    this.rePointlessLeadingWildcards = /^(\*+)[^%0-9A-Za-z\u{a0}-\u{10FFFF}]/u;
    this.rePointlessTrailingSeparator = /\*(\^\**)$/;
    this.rePointlessTrailingWildcards = /(?:[^%0-9A-Za-z]|[%0-9A-Za-z]{7,})(\*+)$/;
    this.reHasWhitespaceChar = /\s/;
    this.reHasUppercaseChar = /[A-Z]/;
    this.reHasUnicodeChar = /[^\x00-\x7F]/;
    this.reUnicodeChars = /\P{ASCII}/gu;
    this.reBadHostnameChars = /[\x00-\x24\x26-\x29\x2b\x2c\x2f\x3b-\x40\x5c\x5e\x60\x7b-\x7f]/;
    this.reIsEntity = /^[^*]+\.\*$/;
    this.rePreparseDirectiveIf = /^!#if /;
    this.rePreparseDirectiveAny = /^!#(?:else|endif|if |include )/;
    this.reURL = /\bhttps?:\/\/\S+/;
    this.reHasPatternSpecialChars = /[*^]/;
    this.rePatternAllSpecialChars = /[*^]+|[^\x00-\x7f]+/g;
    this.reHasInvalidChar = /[\x00-\x1F\x7F-\x9F\xAD\u061C\u200B-\u200F\u2028\u2029\uFEFF\uFFF9-\uFFFC]/;
    this.reHostnamePatternPart = /^[^\x00-\x24\x26-\x29\x2B\x2C\x2F\x3A-\x40\x5B-\x5E\x60\x7B-\x7F]+/;
    this.reHostnameLabel = /[^.]+/g;
    this.reResponseheaderPattern = /^\^responseheader\(.*\)$/;
    this.rePatternScriptletJsonArgs = /^\{.*\}$/;
    this.reBadCSP = /(?:^|[;,])\s*report-(?:to|uri)\b/i;
    this.reBadPP = /(?:^|[;,])\s*report-to\b/i;
    this.reNetOption = /^(~?)([134a-z_-]+)(=?)/;
    this.reNoopOption = /^_+$/;
    this.reAdvancedDomainSyntax = /^([^>]+?)(>>)?(\/.*)?$/;
    this.netOptionValueParser = new ArglistParser(",");
    this.scriptletArgListParser = new ArglistParser(",");
    this.domainRegexValueParser = new ArglistParser("/");
    this.reNetOptionTokens = new RegExp(
      `^~?(${Array.from(netOptionTokenDescriptors.keys()).map((s) => escapeForRegex(s)).join("|")})\\b`
    );
  }
  finish() {
    this.selectorCompiler.finish();
  }
  parse(raw) {
    this.raw = raw;
    this.rawEnd = raw.length;
    this.nodePoolPtr = FULL_NODE_SIZE;
    this.nodeTypeRegisterPtr = 0;
    this.astTransformPtr = 1;
    this.astType = AST_TYPE_NONE;
    this.astTypeFlavor = AST_TYPE_NONE;
    this.astFlags = 0;
    this.astError = 0;
    this.rootNode = this.allocTypedNode(NODE_TYPE_LINE_RAW, 0, this.rawEnd);
    if (this.rawEnd === 0) {
      return;
    }
    const c1st = this.raw.charCodeAt(0);
    const clast = exCharCodeAt(this.raw, -1);
    if (c1st === 124) {
      if (clast === 94 && this.reHnAnchoredHostnameAscii.test(this.raw)) {
        this.astType = AST_TYPE_NETWORK;
        this.astTypeFlavor = AST_TYPE_NETWORK_PATTERN_HOSTNAME;
        const node = this.astFromTemplate(
          this.rootNode,
          astTemplates.netHnAnchoredHostnameAscii
        );
        this.linkDown(this.rootNode, node);
        return;
      }
      if (this.raw.endsWith("$third-party") && this.reHn3pAnchoredHostnameAscii.test(this.raw)) {
        this.astType = AST_TYPE_NETWORK;
        this.astTypeFlavor = AST_TYPE_NETWORK_PATTERN_HOSTNAME;
        const node = this.astFromTemplate(
          this.rootNode,
          astTemplates.net3pHnAnchoredHostnameAscii
        );
        this.linkDown(this.rootNode, node);
        return;
      }
      if (this.reHnAnchoredPlainAscii.test(this.raw)) {
        this.astType = AST_TYPE_NETWORK;
        this.astTypeFlavor = AST_TYPE_NETWORK_PATTERN_PLAIN;
        const node = this.astFromTemplate(
          this.rootNode,
          astTemplates.netHnAnchoredPlainAscii
        );
        this.linkDown(this.rootNode, node);
        return;
      }
    } else if (c1st === 35) {
      if (this.rePlainGenericCosmetic.test(this.raw)) {
        this.astType = AST_TYPE_EXTENDED;
        this.astTypeFlavor = AST_TYPE_EXTENDED_COSMETIC;
        const node = this.astFromTemplate(
          this.rootNode,
          astTemplates.extPlainGenericSelector
        );
        this.linkDown(this.rootNode, node);
        this.result.exception = false;
        this.result.raw = this.raw.slice(2);
        this.result.compiled = this.raw.slice(2);
        return;
      }
    } else if (c1st === 49) {
      if (this.reNetHosts1.test(this.raw)) {
        this.astType = AST_TYPE_NETWORK;
        this.astTypeFlavor = AST_TYPE_NETWORK_PATTERN_HOSTNAME;
        const node = this.astFromTemplate(
          this.rootNode,
          astTemplates.netHosts1
        );
        this.linkDown(this.rootNode, node);
        return;
      }
    } else if (c1st === 48) {
      if (this.reNetHosts2.test(this.raw)) {
        this.astType = AST_TYPE_NETWORK;
        this.astTypeFlavor = AST_TYPE_NETWORK_PATTERN_HOSTNAME;
        const node = this.astFromTemplate(
          this.rootNode,
          astTemplates.netHosts2
        );
        this.linkDown(this.rootNode, node);
        return;
      }
    } else if ((c1st !== 47 || clast !== 47) && this.rePlainAscii.test(this.raw)) {
      this.astType = AST_TYPE_NETWORK;
      this.astTypeFlavor = this.reHostnameAscii.test(this.raw) ? AST_TYPE_NETWORK_PATTERN_HOSTNAME : AST_TYPE_NETWORK_PATTERN_PLAIN;
      const node = this.astFromTemplate(
        this.rootNode,
        astTemplates.netPlainAscii
      );
      this.linkDown(this.rootNode, node);
      return;
    }
    this.hasWhitespace = this.reHasWhitespaceChar.test(raw);
    this.linkDown(this.rootNode, this.parseRaw(this.rootNode));
  }
  astFromTemplate(parent, template) {
    const parentBeg = this.nodes[parent + NODE_BEG_INDEX];
    const parentEnd = this.nodes[parent + NODE_END_INDEX];
    const beg = template.beg + (template.beg >= 0 ? parentBeg : parentEnd);
    const end = template.end + (template.end <= 0 ? parentEnd : parentBeg);
    const node = this.allocTypedNode(template.type, beg, end);
    if (template.register) {
      this.addNodeToRegister(template.type, node);
    }
    if (template.flags) {
      this.addFlags(template.flags);
    }
    if (template.nodeFlags) {
      this.addNodeFlags(node, template.nodeFlags);
    }
    const children = template.children;
    if (children === void 0) {
      return node;
    }
    const head = this.astFromTemplate(node, children[0]);
    this.linkDown(node, head);
    const n = children.length;
    if (n === 1) {
      return node;
    }
    let prev = head;
    for (let i = 1; i < n; i++) {
      prev = this.linkRight(prev, this.astFromTemplate(node, children[i]));
    }
    return node;
  }
  getType() {
    return this.astType;
  }
  isComment() {
    return this.astType === AST_TYPE_COMMENT;
  }
  isFilter() {
    return this.isNetworkFilter() || this.isExtendedFilter();
  }
  isNetworkFilter() {
    return this.astType === AST_TYPE_NETWORK;
  }
  isExtendedFilter() {
    return this.astType === AST_TYPE_EXTENDED;
  }
  isCosmeticFilter() {
    return this.astType === AST_TYPE_EXTENDED && this.astTypeFlavor === AST_TYPE_EXTENDED_COSMETIC;
  }
  isScriptletFilter() {
    return this.astType === AST_TYPE_EXTENDED && this.astTypeFlavor === AST_TYPE_EXTENDED_SCRIPTLET;
  }
  isHtmlFilter() {
    return this.astType === AST_TYPE_EXTENDED && this.astTypeFlavor === AST_TYPE_EXTENDED_HTML;
  }
  isResponseheaderFilter() {
    return this.astType === AST_TYPE_EXTENDED && this.astTypeFlavor === AST_TYPE_EXTENDED_RESPONSEHEADER;
  }
  getFlags(flags = 4294967295) {
    return this.astFlags & flags;
  }
  addFlags(flags) {
    this.astFlags |= flags;
  }
  parseRaw(parent) {
    const head = this.allocHeadNode();
    let prev = head, next = 0;
    const parentBeg = this.nodes[parent + NODE_BEG_INDEX];
    const parentEnd = this.nodes[parent + NODE_END_INDEX];
    const l1 = this.hasWhitespace ? this.leftWhitespaceCount(this.getNodeString(parent)) : 0;
    if (l1 !== 0) {
      next = this.allocTypedNode(
        NODE_TYPE_WHITESPACE,
        parentBeg,
        parentBeg + l1
      );
      prev = this.linkRight(prev, next);
      if (l1 === parentEnd) {
        return this.throwHeadNode(head);
      }
    }
    const r0 = this.hasWhitespace ? parentEnd - this.rightWhitespaceCount(this.getNodeString(parent)) : parentEnd;
    if (r0 !== l1) {
      next = this.allocTypedNode(
        NODE_TYPE_LINE_BODY,
        parentBeg + l1,
        parentBeg + r0
      );
      this.linkDown(next, this.parseFilter(next));
      prev = this.linkRight(prev, next);
    }
    if (r0 !== parentEnd) {
      next = this.allocTypedNode(
        NODE_TYPE_WHITESPACE,
        parentBeg + r0,
        parentEnd
      );
      this.linkRight(prev, next);
    }
    return this.throwHeadNode(head);
  }
  parseFilter(parent) {
    const parentBeg = this.nodes[parent + NODE_BEG_INDEX];
    const parentEnd = this.nodes[parent + NODE_END_INDEX];
    const parentStr = this.getNodeString(parent);
    if (this.reCommentLine.test(parentStr)) {
      const head2 = this.allocTypedNode(NODE_TYPE_COMMENT, parentBeg, parentEnd);
      this.astType = AST_TYPE_COMMENT;
      if (this.interactive) {
        this.linkDown(head2, this.parseComment(head2));
      }
      return head2;
    }
    if (this.reExtAnchor.test(parentStr)) {
      const match = this.reExtAnchor.exec(parentStr);
      const matchLen = match[1].length;
      const head2 = this.allocTypedNode(NODE_TYPE_EXT_RAW, parentBeg, parentEnd);
      this.linkDown(head2, this.parseExt(head2, parentBeg + match.index, matchLen));
      return head2;
    } else if (parentStr.charCodeAt(0) === 35) {
      const head2 = this.allocTypedNode(NODE_TYPE_COMMENT, parentBeg, parentEnd);
      this.astType = AST_TYPE_COMMENT;
      return head2;
    }
    this.hasUppercase = this.reHasUppercaseChar.test(parentStr);
    this.hasUnicode = this.reHasUnicodeChar.test(parentStr);
    this.astType = AST_TYPE_NETWORK;
    let tail = 0, tailStart = parentEnd;
    if (this.hasWhitespace && this.reInlineComment.test(parentStr)) {
      const match = this.reInlineComment.exec(parentStr);
      tailStart = parentBeg + match.index;
      tail = this.allocTypedNode(NODE_TYPE_COMMENT, tailStart, parentEnd);
    }
    const head = this.allocTypedNode(NODE_TYPE_NET_RAW, parentBeg, tailStart);
    if (this.linkDown(head, this.parseNet(head)) === 0) {
      this.astType = AST_TYPE_UNKNOWN;
      this.addFlags(AST_FLAG_UNSUPPORTED | AST_FLAG_HAS_ERROR);
    }
    if (tail !== 0) {
      this.linkRight(head, tail);
    }
    return head;
  }
  parseComment(parent) {
    const parentStr = this.getNodeString(parent);
    if (this.rePreparseDirectiveAny.test(parentStr)) {
      this.astTypeFlavor = AST_TYPE_COMMENT_PREPARSER;
      return this.parsePreparseDirective(parent, parentStr);
    }
    if (this.reURL.test(parentStr) === false) {
      return 0;
    }
    const parentBeg = this.nodes[parent + NODE_BEG_INDEX];
    const parentEnd = this.nodes[parent + NODE_END_INDEX];
    const match = this.reURL.exec(parentStr);
    const urlBeg = parentBeg + match.index;
    const urlEnd = urlBeg + match[0].length;
    const head = this.allocTypedNode(NODE_TYPE_COMMENT, parentBeg, urlBeg);
    let next = this.allocTypedNode(NODE_TYPE_COMMENT_URL, urlBeg, urlEnd);
    let prev = this.linkRight(head, next);
    if (urlEnd !== parentEnd) {
      next = this.allocTypedNode(NODE_TYPE_COMMENT, urlEnd, parentEnd);
      this.linkRight(prev, next);
    }
    return head;
  }
  parsePreparseDirective(parent, s) {
    const parentBeg = this.nodes[parent + NODE_BEG_INDEX];
    const parentEnd = this.nodes[parent + NODE_END_INDEX];
    const match = this.rePreparseDirectiveAny.exec(s);
    const directiveEnd = parentBeg + match[0].length;
    const head = this.allocTypedNode(
      NODE_TYPE_PREPARSE_DIRECTIVE,
      parentBeg,
      directiveEnd
    );
    if (directiveEnd !== parentEnd) {
      const type = s.startsWith("!#if ") ? NODE_TYPE_PREPARSE_DIRECTIVE_IF_VALUE : NODE_TYPE_PREPARSE_DIRECTIVE_VALUE;
      const next = this.allocTypedNode(type, directiveEnd, parentEnd);
      this.addNodeToRegister(type, next);
      this.linkRight(head, next);
      if (type === NODE_TYPE_PREPARSE_DIRECTIVE_IF_VALUE) {
        const rawToken = this.getNodeString(next).trim();
        if (utils.preparser.evaluateExpr(rawToken) === void 0) {
          this.addNodeFlags(next, NODE_FLAG_ERROR);
          this.addFlags(AST_FLAG_HAS_ERROR);
          this.astError = AST_ERROR_IF_TOKEN_UNKNOWN;
        }
      }
    }
    return head;
  }
  // Very common, look into fast-tracking such plain pattern:
  // /^[^!#\$\*\^][^#\$\*\^]*[^\$\*\|]$/
  parseNet(parent) {
    const parentBeg = this.nodes[parent + NODE_BEG_INDEX];
    const parentEnd = this.nodes[parent + NODE_END_INDEX];
    const parentStr = this.getNodeString(parent);
    const head = this.allocHeadNode();
    let patternBeg = parentBeg;
    let prev = head, next = 0, tail = 0;
    if (this.reNetException.test(parentStr)) {
      this.addFlags(AST_FLAG_IS_EXCEPTION);
      next = this.allocTypedNode(NODE_TYPE_NET_EXCEPTION, parentBeg, parentBeg + 2);
      prev = this.linkRight(prev, next);
      patternBeg += 2;
    }
    let anchorBeg = this.indexOfNetAnchor(parentStr);
    if (anchorBeg === -1) {
      return 0;
    }
    anchorBeg += parentBeg;
    if (anchorBeg !== parentEnd) {
      tail = this.allocTypedNode(
        NODE_TYPE_NET_OPTIONS_ANCHOR,
        anchorBeg,
        anchorBeg + 1
      );
      next = this.allocTypedNode(
        NODE_TYPE_NET_OPTIONS,
        anchorBeg + 1,
        parentEnd
      );
      this.addFlags(AST_FLAG_HAS_OPTIONS);
      this.addNodeToRegister(NODE_TYPE_NET_OPTIONS, next);
      this.linkDown(next, this.parseNetOptions(next));
      this.linkRight(tail, next);
    }
    next = this.allocTypedNode(
      NODE_TYPE_NET_PATTERN_RAW,
      patternBeg,
      anchorBeg
    );
    this.addNodeToRegister(NODE_TYPE_NET_PATTERN_RAW, next);
    this.linkDown(next, this.parseNetPattern(next));
    prev = this.linkRight(prev, next);
    if (tail !== 0) {
      this.linkRight(prev, tail);
    }
    if (this.astType === AST_TYPE_NETWORK) {
      this.validateNet();
    }
    return this.throwHeadNode(head);
  }
  validateNet() {
    const isException = this.isException();
    let bad = false, realBad = false;
    let abstractTypeCount = 0;
    let behaviorTypeCount = 0;
    let docTypeCount = 0;
    let modifierType = 0;
    let requestTypeCount = 0;
    let unredirectableTypeCount = 0;
    let isBadfilter = false;
    for (let i = 0, n = this.nodeTypeRegisterPtr; i < n; i++) {
      const type = this.nodeTypeRegister[i];
      const targetNode = this.nodeTypeLookupTable[type];
      if (targetNode === 0) {
        continue;
      }
      if (this.badTypes.has(type)) {
        this.addNodeFlags(NODE_FLAG_ERROR);
        this.addFlags(AST_FLAG_HAS_ERROR);
        this.astError = AST_ERROR_OPTION_EXCLUDED;
      }
      const flags = this.getNodeFlags(targetNode);
      if ((flags & NODE_FLAG_ERROR) !== 0) {
        continue;
      }
      const isNegated = (flags & NODE_FLAG_IS_NEGATED) !== 0;
      const hasValue = (flags & NODE_FLAG_OPTION_HAS_VALUE) !== 0;
      bad = false;
      realBad = false;
      switch (type) {
        case NODE_TYPE_NET_OPTION_NAME_ALL:
          realBad = isNegated || hasValue || modifierType !== 0;
          break;
        case NODE_TYPE_NET_OPTION_NAME_1P:
        case NODE_TYPE_NET_OPTION_NAME_3P:
          realBad = hasValue;
          break;
        case NODE_TYPE_NET_OPTION_NAME_BADFILTER:
          isBadfilter = true;
        /* falls through */
        case NODE_TYPE_NET_OPTION_NAME_NOOP:
          realBad = isNegated || hasValue;
          break;
        case NODE_TYPE_NET_OPTION_NAME_CSS:
        case NODE_TYPE_NET_OPTION_NAME_FONT:
        case NODE_TYPE_NET_OPTION_NAME_IMAGE:
        case NODE_TYPE_NET_OPTION_NAME_MEDIA:
        case NODE_TYPE_NET_OPTION_NAME_OTHER:
        case NODE_TYPE_NET_OPTION_NAME_SCRIPT:
        case NODE_TYPE_NET_OPTION_NAME_XHR:
          realBad = hasValue;
          if (realBad) {
            break;
          }
          requestTypeCount += 1;
          break;
        case NODE_TYPE_NET_OPTION_NAME_CNAME:
          realBad = isException === false || isNegated || hasValue;
          if (realBad) {
            break;
          }
          modifierType = type;
          break;
        case NODE_TYPE_NET_OPTION_NAME_CSP:
          realBad = (hasValue || isException) === false || modifierType !== 0 || this.reBadCSP.test(
            this.getNetOptionValue(NODE_TYPE_NET_OPTION_NAME_CSP)
          );
          if (realBad) {
            break;
          }
          modifierType = type;
          break;
        case NODE_TYPE_NET_OPTION_NAME_DENYALLOW:
          realBad = isNegated || hasValue === false || this.getBranchFromType(NODE_TYPE_NET_OPTION_NAME_FROM) === 0;
          break;
        case NODE_TYPE_NET_OPTION_NAME_DOC:
        case NODE_TYPE_NET_OPTION_NAME_FRAME:
        case NODE_TYPE_NET_OPTION_NAME_OBJECT:
          realBad = hasValue;
          if (realBad) {
            break;
          }
          docTypeCount += 1;
          break;
        case NODE_TYPE_NET_OPTION_NAME_EHIDE:
        case NODE_TYPE_NET_OPTION_NAME_GHIDE:
        case NODE_TYPE_NET_OPTION_NAME_SHIDE:
          realBad = isNegated || hasValue || modifierType !== 0;
          if (realBad) {
            break;
          }
          behaviorTypeCount += 1;
          unredirectableTypeCount += 1;
          break;
        case NODE_TYPE_NET_OPTION_NAME_EMPTY:
        case NODE_TYPE_NET_OPTION_NAME_MP4:
          realBad = isNegated || hasValue || modifierType !== 0;
          if (realBad) {
            break;
          }
          modifierType = type;
          break;
        case NODE_TYPE_NET_OPTION_NAME_FROM:
        case NODE_TYPE_NET_OPTION_NAME_METHOD:
        case NODE_TYPE_NET_OPTION_NAME_TO:
        case NODE_TYPE_NET_OPTION_NAME_TOP:
          realBad = isNegated || hasValue === false;
          break;
        case NODE_TYPE_NET_OPTION_NAME_GENERICBLOCK:
          bad = true;
          realBad = isException === false || isNegated || hasValue;
          break;
        case NODE_TYPE_NET_OPTION_NAME_IMPORTANT:
          realBad = isException || isNegated || hasValue;
          break;
        case NODE_TYPE_NET_OPTION_NAME_INLINEFONT:
        case NODE_TYPE_NET_OPTION_NAME_INLINESCRIPT:
          realBad = hasValue;
          if (realBad) {
            break;
          }
          modifierType = type;
          unredirectableTypeCount += 1;
          break;
        case NODE_TYPE_NET_OPTION_NAME_IPADDRESS: {
          const value = this.getNetOptionValue(NODE_TYPE_NET_OPTION_NAME_IPADDRESS);
          if (/^\/.+\/$/.test(value)) {
            try {
              void new RegExp(value);
            } catch {
              realBad = true;
            }
          }
          break;
        }
        case NODE_TYPE_NET_OPTION_NAME_MATCHCASE:
          realBad = this.isRegexPattern() === false;
          break;
        case NODE_TYPE_NET_OPTION_NAME_PERMISSIONS:
          realBad = modifierType !== 0 || (hasValue || isException) === false || this.reBadPP.test(
            this.getNetOptionValue(NODE_TYPE_NET_OPTION_NAME_PERMISSIONS)
          );
          if (realBad) {
            break;
          }
          modifierType = type;
          break;
        case NODE_TYPE_NET_OPTION_NAME_PING:
        case NODE_TYPE_NET_OPTION_NAME_WEBSOCKET:
          realBad = hasValue;
          if (realBad) {
            break;
          }
          requestTypeCount += 1;
          if ((flags & NODE_FLAG_IS_NEGATED) === 0) {
            unredirectableTypeCount += 1;
          }
          break;
        case NODE_TYPE_NET_OPTION_NAME_POPUNDER:
        case NODE_TYPE_NET_OPTION_NAME_POPUP:
          realBad = hasValue;
          if (realBad) {
            break;
          }
          abstractTypeCount += 1;
          unredirectableTypeCount += 1;
          break;
        case NODE_TYPE_NET_OPTION_NAME_REASON:
          realBad = hasValue === false;
          break;
        case NODE_TYPE_NET_OPTION_NAME_REDIRECT:
        case NODE_TYPE_NET_OPTION_NAME_REDIRECTRULE:
        case NODE_TYPE_NET_OPTION_NAME_REPLACE:
        case NODE_TYPE_NET_OPTION_NAME_URLSKIP:
        case NODE_TYPE_NET_OPTION_NAME_URLTRANSFORM:
          realBad = isNegated || (isException || hasValue) === false || modifierType !== 0;
          if (realBad) {
            break;
          }
          modifierType = type;
          break;
        case NODE_TYPE_NET_OPTION_NAME_REMOVEPARAM:
          realBad = isNegated || modifierType !== 0;
          if (realBad) {
            break;
          }
          modifierType = type;
          break;
        case NODE_TYPE_NET_OPTION_NAME_REQUESTHEADER:
        case NODE_TYPE_NET_OPTION_NAME_RESPONSEHEADER:
          realBad = isNegated || hasValue === false;
          break;
        case NODE_TYPE_NET_OPTION_NAME_STRICT1P:
        case NODE_TYPE_NET_OPTION_NAME_STRICT3P:
          realBad = isNegated || hasValue;
          break;
        case NODE_TYPE_NET_OPTION_NAME_UNKNOWN:
          this.astError = AST_ERROR_OPTION_UNKNOWN;
          realBad = true;
          break;
        case NODE_TYPE_NET_OPTION_NAME_WEBRTC:
          realBad = true;
          break;
        case NODE_TYPE_NET_PATTERN_RAW:
          realBad = this.hasOptions() === false && this.getNetPattern().length <= 1;
          break;
        default:
          break;
      }
      if (bad || realBad) {
        this.addNodeFlags(targetNode, NODE_FLAG_ERROR);
      }
      if (realBad) {
        this.addFlags(AST_FLAG_HAS_ERROR);
      }
    }
    switch (modifierType) {
      case NODE_TYPE_NET_OPTION_NAME_CNAME:
        realBad = abstractTypeCount || behaviorTypeCount || requestTypeCount;
        break;
      case NODE_TYPE_NET_OPTION_NAME_CSP:
      case NODE_TYPE_NET_OPTION_NAME_PERMISSIONS:
        realBad = abstractTypeCount || behaviorTypeCount || requestTypeCount;
        break;
      case NODE_TYPE_NET_OPTION_NAME_INLINEFONT:
      case NODE_TYPE_NET_OPTION_NAME_INLINESCRIPT:
        realBad = behaviorTypeCount;
        break;
      case NODE_TYPE_NET_OPTION_NAME_EMPTY:
        realBad = abstractTypeCount || behaviorTypeCount;
        break;
      case NODE_TYPE_NET_OPTION_NAME_MEDIA:
      case NODE_TYPE_NET_OPTION_NAME_MP4:
        realBad = abstractTypeCount || behaviorTypeCount || docTypeCount || requestTypeCount;
        break;
      case NODE_TYPE_NET_OPTION_NAME_REDIRECT:
      case NODE_TYPE_NET_OPTION_NAME_REDIRECTRULE: {
        realBad = abstractTypeCount || behaviorTypeCount || unredirectableTypeCount;
        break;
      }
      case NODE_TYPE_NET_OPTION_NAME_REPLACE: {
        realBad = abstractTypeCount || behaviorTypeCount || unredirectableTypeCount;
        if (realBad) {
          break;
        }
        if (isException || isBadfilter) {
          break;
        }
        if (this.options.trustedSource !== true) {
          this.astError = AST_ERROR_UNTRUSTED_SOURCE;
          realBad = true;
          break;
        }
        const value = this.getNetOptionValue(NODE_TYPE_NET_OPTION_NAME_REPLACE);
        if (parseReplaceValue(value) === void 0) {
          this.astError = AST_ERROR_OPTION_BADVALUE;
          realBad = true;
        }
        break;
      }
      case NODE_TYPE_NET_OPTION_NAME_URLSKIP: {
        realBad = abstractTypeCount || behaviorTypeCount || unredirectableTypeCount;
        if (realBad) {
          break;
        }
        if (isException || isBadfilter) {
          break;
        }
        if (this.options.trustedSource !== true) {
          this.astError = AST_ERROR_UNTRUSTED_SOURCE;
          realBad = true;
          break;
        }
        const value = this.getNetOptionValue(NODE_TYPE_NET_OPTION_NAME_URLSKIP);
        if (value.length < 2) {
          this.astError = AST_ERROR_OPTION_BADVALUE;
          realBad = true;
        }
        break;
      }
      case NODE_TYPE_NET_OPTION_NAME_URLTRANSFORM: {
        realBad = abstractTypeCount || behaviorTypeCount || unredirectableTypeCount;
        if (realBad) {
          break;
        }
        if (isException || isBadfilter) {
          break;
        }
        if (this.options.trustedSource !== true) {
          this.astError = AST_ERROR_UNTRUSTED_SOURCE;
          realBad = true;
          break;
        }
        const value = this.getNetOptionValue(NODE_TYPE_NET_OPTION_NAME_URLTRANSFORM);
        if (value !== "" && parseReplaceByRegexValue(value) === void 0) {
          this.astError = AST_ERROR_OPTION_BADVALUE;
          realBad = true;
        }
        break;
      }
      case NODE_TYPE_NET_OPTION_NAME_REMOVEPARAM:
        realBad = abstractTypeCount || behaviorTypeCount;
        break;
      default:
        break;
    }
    if (realBad) {
      const targetNode = this.getBranchFromType(modifierType);
      this.addNodeFlags(targetNode, NODE_FLAG_ERROR);
      this.addFlags(AST_FLAG_HAS_ERROR);
    }
  }
  indexOfNetAnchor(s) {
    const end = s.length;
    if (end === 0) {
      return end;
    }
    let j2 = s.lastIndexOf("$");
    if (j2 === -1) {
      return end;
    }
    if (j2 + 1 === end) {
      return end;
    }
    for (; ; ) {
      const before = s.charAt(j2 - 1);
      if (before === "$") {
        return -1;
      }
      if (this.reNetOptionTokens.test(s.slice(j2 + 1))) {
        return j2;
      }
      if (j2 === 0) {
        break;
      }
      j2 = s.lastIndexOf("$", j2 - 1);
      if (j2 === -1) {
        break;
      }
    }
    return end;
  }
  parseNetPattern(parent) {
    const parentBeg = this.nodes[parent + NODE_BEG_INDEX];
    const parentEnd = this.nodes[parent + NODE_END_INDEX];
    if (parentEnd === parentBeg) {
      this.astTypeFlavor = AST_TYPE_NETWORK_PATTERN_ANY;
      const node = this.allocTypedNode(
        NODE_TYPE_NET_PATTERN,
        parentBeg,
        parentEnd
      );
      this.addNodeToRegister(NODE_TYPE_NET_PATTERN, node);
      this.setNodeTransform(node, "*");
      return node;
    }
    const head = this.allocHeadNode();
    let prev = head, next = 0, tail = 0;
    let pattern = this.getNodeString(parent);
    const hasWildcard = pattern.includes("*");
    const c1st = pattern.charCodeAt(0);
    const c2nd = pattern.charCodeAt(1) || 0;
    const clast = exCharCodeAt(pattern, -1);
    if (hasWildcard === false && c1st === 124 && c2nd === 124 && clast === 94 && this.isAdblockHostnamePattern(pattern)) {
      this.astTypeFlavor = AST_TYPE_NETWORK_PATTERN_HOSTNAME;
      this.addFlags(
        AST_FLAG_NET_PATTERN_LEFT_HNANCHOR | AST_FLAG_NET_PATTERN_RIGHT_PATHANCHOR
      );
      next = this.allocTypedNode(
        NODE_TYPE_NET_PATTERN_LEFT_HNANCHOR,
        parentBeg,
        parentBeg + 2
      );
      prev = this.linkRight(prev, next);
      next = this.allocTypedNode(
        NODE_TYPE_NET_PATTERN,
        parentBeg + 2,
        parentEnd - 1
      );
      pattern = pattern.slice(2, -1);
      const normal2 = this.hasUnicode ? this.normalizeHostnameValue(pattern) : pattern;
      if (normal2 !== void 0 && normal2 !== pattern) {
        this.setNodeTransform(next, normal2);
      }
      this.addNodeToRegister(NODE_TYPE_NET_PATTERN, next);
      prev = this.linkRight(prev, next);
      next = this.allocTypedNode(
        NODE_TYPE_NET_PATTERN_PART_SPECIAL,
        parentEnd - 1,
        parentEnd
      );
      this.linkRight(prev, next);
      return this.throwHeadNode(head);
    }
    let patternBeg = parentBeg;
    let patternEnd = parentEnd;
    if (this.hasWhitespace && this.isException() === false && this.hasOptions() === false && this.reHostsSink.test(pattern)) {
      const match = this.reHostsSink.exec(pattern);
      patternBeg += match[0].length;
      pattern = pattern.slice(patternBeg);
      next = this.allocTypedNode(NODE_TYPE_IGNORE, parentBeg, patternBeg);
      prev = this.linkRight(prev, next);
      if (this.reHostsRedirect.test(pattern) || this.reHostnameAscii.test(pattern) === false) {
        this.astType = AST_TYPE_NONE;
        this.addFlags(AST_FLAG_IGNORE);
        next = this.allocTypedNode(NODE_TYPE_IGNORE, patternBeg, parentEnd);
        prev = this.linkRight(prev, next);
        return this.throwHeadNode(head);
      }
      this.astTypeFlavor = AST_TYPE_NETWORK_PATTERN_HOSTNAME;
      this.addFlags(
        AST_FLAG_NET_PATTERN_LEFT_HNANCHOR | AST_FLAG_NET_PATTERN_RIGHT_PATHANCHOR
      );
      next = this.allocTypedNode(
        NODE_TYPE_NET_PATTERN,
        patternBeg,
        parentEnd
      );
      this.addNodeToRegister(NODE_TYPE_NET_PATTERN, next);
      this.linkRight(prev, next);
      return this.throwHeadNode(head);
    }
    if (c1st === 47 && clast === 47 && pattern.length > 2) {
      this.astTypeFlavor = AST_TYPE_NETWORK_PATTERN_REGEX;
      const normal2 = this.normalizeRegexPattern(pattern);
      next = this.allocTypedNode(
        NODE_TYPE_NET_PATTERN,
        patternBeg,
        patternEnd
      );
      this.addNodeToRegister(NODE_TYPE_NET_PATTERN, next);
      if (normal2 !== "") {
        if (normal2 !== pattern) {
          this.setNodeTransform(next, normal2);
        }
      } else {
        this.astTypeFlavor = AST_TYPE_NETWORK_PATTERN_BAD;
        this.astError = AST_ERROR_REGEX;
        this.addFlags(AST_FLAG_HAS_ERROR);
        this.addNodeFlags(next, NODE_FLAG_ERROR);
      }
      this.linkRight(prev, next);
      return this.throwHeadNode(head);
    }
    if (c1st === 124) {
      if (c2nd === 124) {
        const type = this.isTokenCharCode(pattern.charCodeAt(2) || 0) ? NODE_TYPE_NET_PATTERN_LEFT_HNANCHOR : NODE_TYPE_IGNORE;
        next = this.allocTypedNode(type, patternBeg, patternBeg + 2);
        if (type === NODE_TYPE_NET_PATTERN_LEFT_HNANCHOR) {
          this.addFlags(AST_FLAG_NET_PATTERN_LEFT_HNANCHOR);
        }
        patternBeg += 2;
        pattern = pattern.slice(2);
      } else {
        const type = this.isTokenCharCode(c2nd) ? NODE_TYPE_NET_PATTERN_LEFT_ANCHOR : NODE_TYPE_IGNORE;
        next = this.allocTypedNode(type, patternBeg, patternBeg + 1);
        if (type === NODE_TYPE_NET_PATTERN_LEFT_ANCHOR) {
          this.addFlags(AST_FLAG_NET_PATTERN_LEFT_ANCHOR);
        }
        patternBeg += 1;
        pattern = pattern.slice(1);
      }
      prev = this.linkRight(prev, next);
      if (patternBeg === patternEnd) {
        this.addNodeFlags(next, NODE_FLAG_IGNORE);
      }
    }
    if (exCharCodeAt(pattern, -1) === 124) {
      const type = exCharCodeAt(pattern, -2) !== 42 ? NODE_TYPE_NET_PATTERN_RIGHT_ANCHOR : NODE_TYPE_IGNORE;
      tail = this.allocTypedNode(type, patternEnd - 1, patternEnd);
      if (type === NODE_TYPE_NET_PATTERN_RIGHT_ANCHOR) {
        this.addFlags(AST_FLAG_NET_PATTERN_RIGHT_ANCHOR);
      }
      patternEnd -= 1;
      pattern = pattern.slice(0, -1);
      if (patternEnd === patternBeg) {
        this.addNodeFlags(tail, NODE_FLAG_IGNORE);
      }
    }
    if (hasWildcard && this.rePointlessLeadingWildcards.test(pattern)) {
      const match = this.rePointlessLeadingWildcards.exec(pattern);
      const ignoreLen = match[1].length;
      next = this.allocTypedNode(
        NODE_TYPE_IGNORE,
        patternBeg,
        patternBeg + ignoreLen
      );
      prev = this.linkRight(prev, next);
      patternBeg += ignoreLen;
      pattern = pattern.slice(ignoreLen);
    }
    if (this.rePointlessTrailingSeparator.test(pattern)) {
      const match = this.rePointlessTrailingSeparator.exec(pattern);
      const ignoreLen = match[1].length;
      next = this.allocTypedNode(
        NODE_TYPE_IGNORE,
        patternEnd - ignoreLen,
        patternEnd
      );
      patternEnd -= ignoreLen;
      pattern = pattern.slice(0, -ignoreLen);
      if (tail !== 0) {
        this.linkRight(next, tail);
      }
      tail = next;
    }
    if (hasWildcard && this.rePointlessTrailingWildcards.test(pattern)) {
      const match = this.rePointlessTrailingWildcards.exec(pattern);
      const ignoreLen = match[1].length;
      const needWildcard = pattern.charCodeAt(0) === 47 && exCharCodeAt(pattern, -ignoreLen - 1) === 47;
      const goodWildcardBeg = patternEnd - ignoreLen;
      const badWildcardBeg = goodWildcardBeg + (needWildcard ? 1 : 0);
      if (badWildcardBeg !== patternEnd) {
        next = this.allocTypedNode(
          NODE_TYPE_IGNORE,
          badWildcardBeg,
          patternEnd
        );
        if (tail !== 0) {
          this.linkRight(next, tail);
        }
        tail = next;
      }
      if (goodWildcardBeg !== badWildcardBeg) {
        next = this.allocTypedNode(
          NODE_TYPE_NET_PATTERN_PART_SPECIAL,
          goodWildcardBeg,
          badWildcardBeg
        );
        if (tail !== 0) {
          this.linkRight(next, tail);
        }
        tail = next;
      }
      patternEnd -= ignoreLen;
      pattern = pattern.slice(0, -ignoreLen);
    }
    const patternHasWhitespace = this.hasWhitespace && this.reHasWhitespaceChar.test(pattern);
    const needNormalization = this.needPatternNormalization(pattern);
    const normal = needNormalization ? this.normalizePattern(pattern) : pattern;
    next = this.allocTypedNode(NODE_TYPE_NET_PATTERN, patternBeg, patternEnd);
    if (patternHasWhitespace || normal === void 0) {
      this.astTypeFlavor = AST_TYPE_NETWORK_PATTERN_BAD;
      this.addFlags(AST_FLAG_HAS_ERROR);
      this.astError = AST_ERROR_PATTERN;
      this.addNodeFlags(next, NODE_FLAG_ERROR);
    } else if (normal === "*") {
      this.astTypeFlavor = AST_TYPE_NETWORK_PATTERN_ANY;
    } else if (this.reHostnameAscii.test(normal)) {
      this.astTypeFlavor = AST_TYPE_NETWORK_PATTERN_HOSTNAME;
    } else if (this.reHasPatternSpecialChars.test(normal)) {
      this.astTypeFlavor = AST_TYPE_NETWORK_PATTERN_GENERIC;
    } else {
      this.astTypeFlavor = AST_TYPE_NETWORK_PATTERN_PLAIN;
    }
    this.addNodeToRegister(NODE_TYPE_NET_PATTERN, next);
    if (needNormalization && normal !== void 0) {
      this.setNodeTransform(next, normal);
    }
    if (this.interactive) {
      this.linkDown(next, this.parsePatternParts(next, pattern));
    }
    prev = this.linkRight(prev, next);
    if (tail !== 0) {
      this.linkRight(prev, tail);
    }
    return this.throwHeadNode(head);
  }
  isAdblockHostnamePattern(pattern) {
    if (this.hasUnicode) {
      return this.reHnAnchoredHostnameUnicode.test(pattern);
    }
    return this.reHnAnchoredHostnameAscii.test(pattern);
  }
  parsePatternParts(parent, pattern) {
    if (pattern.length === 0) {
      return 0;
    }
    const parentBeg = this.nodes[parent + NODE_BEG_INDEX];
    const matches = pattern.matchAll(this.rePatternAllSpecialChars);
    const head = this.allocHeadNode();
    let prev = head, next = 0;
    let plainPartBeg = 0;
    for (const match of matches) {
      const plainPartEnd = match.index;
      if (plainPartEnd !== plainPartBeg) {
        next = this.allocTypedNode(
          NODE_TYPE_NET_PATTERN_PART,
          parentBeg + plainPartBeg,
          parentBeg + plainPartEnd
        );
        prev = this.linkRight(prev, next);
      }
      plainPartBeg = plainPartEnd + match[0].length;
      const type = match[0].charCodeAt(0) < 128 ? NODE_TYPE_NET_PATTERN_PART_SPECIAL : NODE_TYPE_NET_PATTERN_PART_UNICODE;
      next = this.allocTypedNode(
        type,
        parentBeg + plainPartEnd,
        parentBeg + plainPartBeg
      );
      prev = this.linkRight(prev, next);
    }
    if (plainPartBeg !== pattern.length) {
      next = this.allocTypedNode(
        NODE_TYPE_NET_PATTERN_PART,
        parentBeg + plainPartBeg,
        parentBeg + pattern.length
      );
      this.linkRight(prev, next);
    }
    return this.throwHeadNode(head);
  }
  // https://github.com/uBlockOrigin/uBlock-issues/issues/1118#issuecomment-650730158
  //   Be ready to deal with non-punycode-able Unicode characters.
  // https://github.com/uBlockOrigin/uBlock-issues/issues/772
  //   Encode Unicode characters beyond the hostname part.
  // Prepend with '*' character to prevent the browser API from refusing to
  // punycode -- this occurs when the extracted label starts with a dash.
  needPatternNormalization(pattern) {
    return pattern.length === 0 || this.hasUppercase || this.hasUnicode;
  }
  normalizePattern(pattern) {
    if (pattern.length === 0) {
      return "*";
    }
    if (this.reHasInvalidChar.test(pattern)) {
      return;
    }
    let normal = pattern.toLowerCase();
    if (this.hasUnicode === false) {
      return normal;
    }
    if (this.reHostnamePatternPart.test(normal)) {
      const match = this.reHostnamePatternPart.exec(normal);
      const hn2 = match[0].replace(this.reHostnameLabel, (s) => {
        if (this.reHasUnicodeChar.test(s) === false) {
          return s;
        }
        if (s.charCodeAt(0) === 45) {
          s = "*" + s;
        }
        return this.normalizeHostnameValue(s, DOMAIN_CAN_USE_WILDCARD) || s;
      });
      normal = hn2 + normal.slice(match.index + match[0].length);
    }
    if (this.reHasUnicodeChar.test(normal) === false) {
      return normal;
    }
    try {
      normal = normal.replace(
        this.reUnicodeChars,
        (s) => encodeURIComponent(s).toLowerCase()
      );
    } catch {
      return;
    }
    return normal;
  }
  getNetPattern() {
    const node = this.nodeTypeLookupTable[NODE_TYPE_NET_PATTERN];
    return this.getNodeTransform(node);
  }
  isAnyPattern() {
    return this.astTypeFlavor === AST_TYPE_NETWORK_PATTERN_ANY;
  }
  isHostnamePattern() {
    return this.astTypeFlavor === AST_TYPE_NETWORK_PATTERN_HOSTNAME;
  }
  isRegexPattern() {
    return this.astTypeFlavor === AST_TYPE_NETWORK_PATTERN_REGEX;
  }
  isPlainPattern() {
    return this.astTypeFlavor === AST_TYPE_NETWORK_PATTERN_PLAIN;
  }
  isGenericPattern() {
    return this.astTypeFlavor === AST_TYPE_NETWORK_PATTERN_GENERIC;
  }
  isBadPattern() {
    return this.astTypeFlavor === AST_TYPE_NETWORK_PATTERN_BAD;
  }
  parseNetOptions(parent) {
    const parentBeg = this.nodes[parent + NODE_BEG_INDEX];
    const parentEnd = this.nodes[parent + NODE_END_INDEX];
    if (parentEnd === parentBeg) {
      return 0;
    }
    const s = this.getNodeString(parent);
    const optionsEnd = s.length;
    const parseDetails = { node: 0, len: 0 };
    const head = this.allocHeadNode();
    let prev = head, next = 0;
    let optionBeg = 0, optionEnd = 0;
    while (optionBeg !== optionsEnd) {
      next = this.allocTypedNode(
        NODE_TYPE_NET_OPTION_RAW,
        parentBeg + optionBeg,
        parentBeg + optionsEnd
        // open ended
      );
      this.parseNetOption(next, parseDetails);
      optionEnd += parseDetails.len;
      this.nodes[next + NODE_END_INDEX] = parentBeg + optionEnd;
      this.linkDown(next, parseDetails.node);
      prev = this.linkRight(prev, next);
      if (optionEnd === optionsEnd) {
        break;
      }
      optionBeg = optionEnd + 1;
      next = this.allocTypedNode(
        NODE_TYPE_NET_OPTION_SEPARATOR,
        parentBeg + optionEnd,
        parentBeg + optionBeg
      );
      if (parseDetails.len === 0 || optionBeg === optionsEnd) {
        this.addNodeFlags(next, NODE_FLAG_ERROR);
        this.addFlags(AST_FLAG_HAS_ERROR);
      }
      prev = this.linkRight(prev, next);
      optionEnd = optionBeg;
    }
    this.linkRight(
      prev,
      this.allocSentinelNode(NODE_TYPE_NET_OPTION_SENTINEL, parentEnd)
    );
    return this.throwHeadNode(head);
  }
  parseNetOption(parent, parseDetails) {
    const parentBeg = this.nodes[parent + NODE_BEG_INDEX];
    const s = this.getNodeString(parent);
    const match = this.reNetOption.exec(s) || [];
    if (match.length === 0) {
      this.addNodeFlags(parent, NODE_FLAG_ERROR);
      this.addFlags(AST_FLAG_HAS_ERROR);
      this.astError = AST_ERROR_OPTION_UNKNOWN;
      parseDetails.node = 0;
      parseDetails.len = s.length;
      return;
    }
    const head = this.allocHeadNode();
    let prev = head, next = 0;
    const matchEnd = match && match[0].length || 0;
    const negated = match[1] === "~";
    if (negated) {
      this.addNodeFlags(parent, NODE_FLAG_IS_NEGATED);
      next = this.allocTypedNode(
        NODE_TYPE_NET_OPTION_NAME_NOT,
        parentBeg,
        parentBeg + 1
      );
      prev = this.linkRight(prev, next);
    }
    const nameBeg = negated ? 1 : 0;
    const assigned = match[3] === "=";
    const nameEnd = matchEnd - (assigned ? 1 : 0);
    const name = match[2] || "";
    let nodeOptionType = nodeTypeFromOptionName.get(name);
    if (nodeOptionType === void 0) {
      nodeOptionType = this.reNoopOption.test(name) ? NODE_TYPE_NET_OPTION_NAME_NOOP : NODE_TYPE_NET_OPTION_NAME_UNKNOWN;
    }
    next = this.allocTypedNode(
      nodeOptionType,
      parentBeg + nameBeg,
      parentBeg + nameEnd
    );
    if (nodeOptionType !== NODE_TYPE_NET_OPTION_NAME_NOOP && this.getBranchFromType(nodeOptionType) !== 0) {
      this.addNodeFlags(parent, NODE_FLAG_ERROR);
      this.addFlags(AST_FLAG_HAS_ERROR);
      this.astError = AST_ERROR_OPTION_DUPLICATE;
    } else {
      this.addNodeToRegister(nodeOptionType, parent);
    }
    prev = this.linkRight(prev, next);
    if (assigned === false) {
      parseDetails.node = this.throwHeadNode(head);
      parseDetails.len = matchEnd;
      return;
    }
    next = this.allocTypedNode(
      NODE_TYPE_NET_OPTION_ASSIGN,
      parentBeg + matchEnd - 1,
      parentBeg + matchEnd
    );
    prev = this.linkRight(prev, next);
    this.addNodeFlags(parent, NODE_FLAG_OPTION_HAS_VALUE);
    const details = this.netOptionValueParser.nextArg(s, matchEnd);
    if (details.quoteBeg !== details.argBeg) {
      next = this.allocTypedNode(
        NODE_TYPE_NET_OPTION_QUOTE,
        parentBeg + details.quoteBeg,
        parentBeg + details.argBeg
      );
      prev = this.linkRight(prev, next);
    } else {
      const argEnd = this.endOfNetOption(s, matchEnd);
      if (argEnd !== details.argEnd) {
        details.argEnd = details.quoteEnd = argEnd;
      }
    }
    next = this.allocTypedNode(
      NODE_TYPE_NET_OPTION_VALUE,
      parentBeg + details.argBeg,
      parentBeg + details.argEnd
    );
    if (details.argBeg === details.argEnd) {
      this.addNodeFlags(parent, NODE_FLAG_ERROR);
      this.addFlags(AST_FLAG_HAS_ERROR);
      this.astError = AST_ERROR_OPTION_BADVALUE;
    } else if (details.transform) {
      const arg = s.slice(details.argBeg, details.argEnd);
      this.setNodeTransform(next, this.netOptionValueParser.normalizeArg(arg));
    }
    switch (nodeOptionType) {
      case NODE_TYPE_NET_OPTION_NAME_DENYALLOW:
        this.linkDown(next, this.parseDomainList(next, "|"), DOMAIN_FROM_DENYALLOW_LIST);
        break;
      case NODE_TYPE_NET_OPTION_NAME_FROM:
      case NODE_TYPE_NET_OPTION_NAME_TO:
      case NODE_TYPE_NET_OPTION_NAME_TOP:
        this.linkDown(next, this.parseDomainList(next, "|", DOMAIN_FROM_FROMTO_LIST));
        break;
      default:
        break;
    }
    prev = this.linkRight(prev, next);
    if (details.quoteEnd !== details.argEnd) {
      next = this.allocTypedNode(
        NODE_TYPE_NET_OPTION_QUOTE,
        parentBeg + details.argEnd,
        parentBeg + details.quoteEnd
      );
      this.linkRight(prev, next);
    }
    parseDetails.node = this.throwHeadNode(head);
    parseDetails.len = details.quoteEnd;
  }
  endOfNetOption(s, beg) {
    const match = this.reNetOptionComma.exec(s.slice(beg));
    return match !== null ? beg + match.index : s.length;
  }
  getNetOptionValue(type) {
    if (this.nodeTypeRegister.includes(type) === false) {
      return "";
    }
    const optionNode = this.nodeTypeLookupTable[type];
    if (optionNode === 0) {
      return "";
    }
    const valueNode = this.findDescendantByType(optionNode, NODE_TYPE_NET_OPTION_VALUE);
    if (valueNode === 0) {
      return "";
    }
    return this.getNodeTransform(valueNode);
  }
  parseDomainList(parent, separator, mode = 0) {
    const parentBeg = this.nodes[parent + NODE_BEG_INDEX];
    const parentEnd = this.nodes[parent + NODE_END_INDEX];
    const containerNode = this.allocTypedNode(
      NODE_TYPE_OPTION_VALUE_DOMAIN_LIST,
      parentBeg,
      parentEnd
    );
    if (parentEnd === parentBeg) {
      return containerNode;
    }
    const separatorCode = separator.charCodeAt(0);
    const parseDetails = { separator, mode, node: 0, len: 0 };
    const listNode = this.allocHeadNode();
    let prev = listNode;
    let domainNode = 0;
    let separatorNode = 0;
    const s = this.getNodeString(parent);
    const listEnd = s.length;
    let beg = 0, end = 0;
    while (beg < listEnd) {
      const next = this.allocTypedNode(
        NODE_TYPE_OPTION_VALUE_DOMAIN_RAW,
        parentBeg + beg,
        parentBeg + listEnd
        // open ended
      );
      this.parseDomain(next, parseDetails);
      end = beg + parseDetails.len;
      const badSeparator = end < listEnd && s.charCodeAt(end) !== separatorCode;
      if (badSeparator) {
        end = s.indexOf(separator, end);
        if (end === -1) {
          end = listEnd;
        }
      }
      this.nodes[next + NODE_END_INDEX] = parentBeg + end;
      if (end !== beg) {
        domainNode = next;
        this.linkDown(domainNode, parseDetails.node);
        prev = this.linkRight(prev, domainNode);
        if (badSeparator) {
          this.addNodeFlags(domainNode, NODE_FLAG_ERROR);
          this.addFlags(AST_FLAG_HAS_ERROR);
        }
      } else {
        domainNode = 0;
        if (separatorNode !== 0) {
          this.addNodeFlags(separatorNode, NODE_FLAG_ERROR);
          this.addFlags(AST_FLAG_HAS_ERROR);
        }
      }
      if (s.charCodeAt(end) === separatorCode) {
        beg = end;
        end += 1;
        separatorNode = this.allocTypedNode(
          NODE_TYPE_OPTION_VALUE_SEPARATOR,
          parentBeg + beg,
          parentBeg + end
        );
        prev = this.linkRight(prev, separatorNode);
        if (domainNode === 0) {
          this.addNodeFlags(separatorNode, NODE_FLAG_ERROR);
          this.addFlags(AST_FLAG_HAS_ERROR);
        }
      } else {
        separatorNode = 0;
      }
      beg = end;
    }
    if (separatorNode !== 0) {
      this.addNodeFlags(separatorNode, NODE_FLAG_ERROR);
      this.addFlags(AST_FLAG_HAS_ERROR);
    }
    this.linkDown(containerNode, this.throwHeadNode(listNode));
    return containerNode;
  }
  parseDomain(parent, parseDetails) {
    const parentBeg = this.nodes[parent + NODE_BEG_INDEX];
    const parentEnd = this.nodes[parent + NODE_END_INDEX];
    const not = this.charCodeAt(parentBeg) === 126;
    let head = 0, next = 0;
    let beg = parentBeg;
    if (not) {
      this.addNodeFlags(parent, NODE_FLAG_IS_NEGATED);
      head = this.allocTypedNode(NODE_TYPE_OPTION_VALUE_NOT, beg, beg + 1);
      if ((parseDetails.mode & DOMAIN_CAN_BE_NEGATED) === 0) {
        this.addNodeFlags(parent, NODE_FLAG_ERROR);
      }
      beg += 1;
    }
    const c0 = this.charCodeAt(beg);
    let end = beg;
    let isRegex = false;
    if (c0 === 47) {
      this.domainRegexValueParser.nextArg(this.raw, beg + 1);
      end = this.domainRegexValueParser.separatorEnd;
      isRegex = true;
    } else if (c0 === 91 && this.startsWith("[$domain=/", beg)) {
      end = this.indexOf("/]", beg + 10, parentEnd);
      if (end !== -1) {
        end += 2;
      }
      isRegex = true;
    } else {
      end = this.indexOf(parseDetails.separator, end, parentEnd);
    }
    if (end === -1) {
      end = parentEnd;
    }
    if (beg !== end) {
      next = this.allocTypedNode(NODE_TYPE_OPTION_VALUE_DOMAIN, beg, end);
      const hn2 = this.normalizeDomainValue(next, isRegex, parseDetails.mode);
      if (hn2 !== void 0) {
        if (hn2 !== "") {
          this.setNodeTransform(next, hn2);
        } else {
          this.addNodeFlags(parent, NODE_FLAG_ERROR);
          this.addFlags(AST_FLAG_HAS_ERROR);
          this.astError = AST_ERROR_DOMAIN_NAME;
        }
      }
      if (head === 0) {
        head = next;
      } else {
        this.linkRight(head, next);
      }
    } else {
      this.addNodeFlags(parent, NODE_FLAG_ERROR);
      this.addFlags(AST_FLAG_HAS_ERROR);
    }
    parseDetails.node = head;
    parseDetails.len = end - parentBeg;
  }
  normalizeDomainValue(node, isRegex, modeBits) {
    const raw = this.getNodeString(node);
    if (isRegex) {
      if ((modeBits & DOMAIN_CAN_BE_REGEX) === 0) {
        return "";
      }
      return this.normalizeDomainRegexValue(raw);
    }
    const r1 = this.normalizeHostnameValue(raw, modeBits);
    if (r1 === void 0) {
      return;
    }
    if (r1 !== "") {
      return r1;
    }
    const match = this.reAdvancedDomainSyntax.exec(raw);
    if (match === null) {
      return "";
    }
    ;
    const isAncestor = match[2] !== void 0;
    if (isAncestor && (modeBits & DOMAIN_CAN_BE_ANCESTOR) === 0) {
      return "";
    }
    const hasPath = match[3] !== void 0;
    if (hasPath && (modeBits & DOMAIN_CAN_HAVE_PATH) === 0) {
      return "";
    }
    if (isAncestor && hasPath) {
      return "";
    }
    const r2 = this.normalizeHostnameValue(match[1], modeBits);
    if (r2 === void 0) {
      return;
    }
    if (r2 === "") {
      return "";
    }
    return `${r2}${match[2] ?? ""}${match[3] ?? ""}`;
  }
  normalizeDomainRegexValue(before) {
    const regex = before.startsWith("[$domain=/") ? `${before.slice(9, -1)}` : before;
    const source = this.normalizeRegexPattern(regex.replace(/\\\|/g, "|"));
    if (source === "") {
      return "";
    }
    const after = `/${source}/`;
    if (after === before) {
      return;
    }
    return after;
  }
  parseExt(parent, anchorBeg, anchorLen) {
    const parentBeg = this.nodes[parent + NODE_BEG_INDEX];
    const parentEnd = this.nodes[parent + NODE_END_INDEX];
    const head = this.allocHeadNode();
    let prev = head, next = 0;
    this.astType = AST_TYPE_EXTENDED;
    this.addFlags(this.extFlagsFromAnchor(anchorBeg));
    if (anchorBeg > parentBeg) {
      next = this.allocTypedNode(
        NODE_TYPE_EXT_OPTIONS,
        parentBeg,
        anchorBeg
      );
      this.addFlags(AST_FLAG_HAS_OPTIONS);
      this.addNodeToRegister(NODE_TYPE_EXT_OPTIONS, next);
      const down2 = this.parseDomainList(next, ",", DOMAIN_FROM_EXT_LIST);
      this.linkDown(next, down2);
      prev = this.linkRight(prev, next);
    }
    next = this.allocTypedNode(
      NODE_TYPE_EXT_OPTIONS_ANCHOR,
      anchorBeg,
      anchorBeg + anchorLen
    );
    this.addNodeToRegister(NODE_TYPE_EXT_OPTIONS_ANCHOR, next);
    prev = this.linkRight(prev, next);
    next = this.allocTypedNode(
      NODE_TYPE_EXT_PATTERN_RAW,
      anchorBeg + anchorLen,
      parentEnd
    );
    this.addNodeToRegister(NODE_TYPE_EXT_PATTERN_RAW, next);
    const down = this.parseExtPattern(next);
    if (down !== 0) {
      this.linkDown(next, down);
    } else {
      this.addNodeFlags(next, NODE_FLAG_ERROR);
      this.addFlags(AST_FLAG_HAS_ERROR);
    }
    this.linkRight(prev, next);
    this.validateExt();
    return this.throwHeadNode(head);
  }
  extFlagsFromAnchor(anchorBeg) {
    let c = this.charCodeAt(anchorBeg + 1);
    if (c === 35) {
      return 0;
    }
    if (c === 37) {
      return AST_FLAG_EXT_SCRIPTLET_ADG;
    }
    if (c === 63) {
      return AST_FLAG_EXT_STRONG;
    }
    if (c === 36) {
      c = this.charCodeAt(anchorBeg + 2);
      if (c === 35) {
        return AST_FLAG_EXT_STYLE;
      }
      if (c === 63) {
        return AST_FLAG_EXT_STYLE | AST_FLAG_EXT_STRONG;
      }
    }
    if (c === 64) {
      return AST_FLAG_IS_EXCEPTION | this.extFlagsFromAnchor(anchorBeg + 1);
    }
    return AST_FLAG_UNSUPPORTED | AST_FLAG_HAS_ERROR;
  }
  validateExt() {
    const isException = this.isException();
    let realBad = false;
    for (let i = 0, n = this.nodeTypeRegisterPtr; i < n; i++) {
      const type = this.nodeTypeRegister[i];
      const targetNode = this.nodeTypeLookupTable[type];
      if (targetNode === 0) {
        continue;
      }
      const flags = this.getNodeFlags(targetNode);
      if ((flags & NODE_FLAG_ERROR) !== 0) {
        continue;
      }
      realBad = false;
      switch (type) {
        case NODE_TYPE_EXT_PATTERN_RESPONSEHEADER: {
          const pattern = this.getNodeString(targetNode);
          realBad = pattern !== "" && removableHTTPHeaders.has(pattern) === false || pattern === "" && isException === false;
          break;
        }
        case NODE_TYPE_EXT_PATTERN_SCRIPTLET_TOKEN: {
          if (this.interactive !== true) {
            break;
          }
          if (isException) {
            break;
          }
          const { trustedSource, trustedScriptletTokens } = this.options;
          if (trustedScriptletTokens instanceof Set === false) {
            break;
          }
          const token = this.getNodeString(targetNode);
          if (trustedScriptletTokens.has(token) && trustedSource !== true) {
            this.astError = AST_ERROR_UNTRUSTED_SOURCE;
            realBad = true;
          }
          break;
        }
        default:
          break;
      }
      if (realBad) {
        this.addNodeFlags(targetNode, NODE_FLAG_ERROR);
        this.addFlags(AST_FLAG_HAS_ERROR);
      }
    }
  }
  parseExtPattern(parent) {
    const c = this.charCodeAt(this.nodes[parent + NODE_BEG_INDEX]);
    if (c === 43) {
      const s = this.getNodeString(parent);
      if (/^\+js\(.*\)$/.exec(s) !== null) {
        this.astTypeFlavor = AST_TYPE_EXTENDED_SCRIPTLET;
        return this.parseExtPatternScriptlet(parent);
      }
    }
    if (this.getFlags(AST_FLAG_EXT_SCRIPTLET_ADG)) {
      const s = this.getNodeString(parent);
      if (/^\/\/scriptlet\(.*\)$/.exec(s) !== null) {
        this.astTypeFlavor = AST_TYPE_EXTENDED_SCRIPTLET;
        return this.parseExtPatternScriptlet(parent);
      }
      return 0;
    }
    if (c === 94) {
      const s = this.getNodeString(parent);
      if (this.reResponseheaderPattern.test(s)) {
        this.astTypeFlavor = AST_TYPE_EXTENDED_RESPONSEHEADER;
        return this.parseExtPatternResponseheader(parent);
      }
      this.astTypeFlavor = AST_TYPE_EXTENDED_HTML;
      return this.parseExtPatternHtml(parent);
    }
    this.astTypeFlavor = AST_TYPE_EXTENDED_COSMETIC;
    return this.parseExtPatternCosmetic(parent);
  }
  parseExtPatternScriptlet(parent) {
    const beg = this.nodes[parent + NODE_BEG_INDEX];
    const end = this.nodes[parent + NODE_END_INDEX];
    const s = this.getNodeString(parent);
    const rawArg0 = beg + (s.startsWith("+js") ? 4 : 12);
    const rawArg1 = end - 1;
    const head = this.allocTypedNode(NODE_TYPE_EXT_DECORATION, beg, rawArg0);
    let prev = head, next = 0;
    next = this.allocTypedNode(NODE_TYPE_EXT_PATTERN_SCRIPTLET, rawArg0, rawArg1);
    this.addNodeToRegister(NODE_TYPE_EXT_PATTERN_SCRIPTLET, next);
    this.linkDown(next, this.parseExtPatternScriptletArgs(next));
    prev = this.linkRight(prev, next);
    next = this.allocTypedNode(NODE_TYPE_EXT_DECORATION, rawArg1, end);
    this.linkRight(prev, next);
    return head;
  }
  parseExtPatternScriptletArgs(parent) {
    const parentBeg = this.nodes[parent + NODE_BEG_INDEX];
    const parentEnd = this.nodes[parent + NODE_END_INDEX];
    if (parentEnd === parentBeg) {
      return 0;
    }
    const head = this.allocHeadNode();
    let prev = head, next = 0;
    const s = this.getNodeString(parent);
    const argsEnd = s.length;
    this.scriptletArgListParser.mustQuote = this.getFlags(AST_FLAG_EXT_SCRIPTLET_ADG) !== 0;
    const details = this.scriptletArgListParser.nextArg(s, 0);
    if (details.argBeg > 0) {
      next = this.allocTypedNode(
        NODE_TYPE_EXT_DECORATION,
        parentBeg,
        parentBeg + details.argBeg
      );
      prev = this.linkRight(prev, next);
    }
    const token = s.slice(details.argBeg, details.argEnd);
    const tokenEnd = details.argEnd - (token.endsWith(".js") ? 3 : 0);
    next = this.allocTypedNode(
      NODE_TYPE_EXT_PATTERN_SCRIPTLET_TOKEN,
      parentBeg + details.argBeg,
      parentBeg + tokenEnd
    );
    this.addNodeToRegister(NODE_TYPE_EXT_PATTERN_SCRIPTLET_TOKEN, next);
    if (details.failed) {
      this.addNodeFlags(next, NODE_FLAG_ERROR);
      this.addFlags(AST_FLAG_HAS_ERROR);
    }
    prev = this.linkRight(prev, next);
    if (tokenEnd < details.argEnd) {
      next = this.allocTypedNode(
        NODE_TYPE_IGNORE,
        parentBeg + tokenEnd,
        parentBeg + details.argEnd
      );
      prev = this.linkRight(prev, next);
    }
    if (details.quoteEnd < argsEnd) {
      next = this.allocTypedNode(
        NODE_TYPE_EXT_DECORATION,
        parentBeg + details.argEnd,
        parentBeg + details.separatorEnd
      );
      prev = this.linkRight(prev, next);
    }
    next = this.allocTypedNode(
      NODE_TYPE_EXT_PATTERN_SCRIPTLET_ARGS,
      parentBeg + details.separatorEnd,
      parentBeg + argsEnd
    );
    this.linkDown(next, this.parseExtPatternScriptletArglist(next));
    this.linkRight(prev, next);
    return this.throwHeadNode(head);
  }
  parseExtPatternScriptletArglist(parent) {
    const parentBeg = this.nodes[parent + NODE_BEG_INDEX];
    const parentEnd = this.nodes[parent + NODE_END_INDEX];
    if (parentEnd === parentBeg) {
      return 0;
    }
    const s = this.getNodeString(parent);
    const argsEnd = s.length;
    const head = this.allocHeadNode();
    let prev = head, next = 0;
    let decorationBeg = 0;
    let i = 0;
    for (; ; ) {
      const details = this.scriptletArgListParser.nextArg(s, i);
      if (decorationBeg < details.argBeg) {
        next = this.allocTypedNode(
          NODE_TYPE_EXT_DECORATION,
          parentBeg + decorationBeg,
          parentBeg + details.argBeg
        );
        prev = this.linkRight(prev, next);
      }
      if (i === argsEnd) {
        break;
      }
      next = this.allocTypedNode(
        NODE_TYPE_EXT_PATTERN_SCRIPTLET_ARG,
        parentBeg + details.argBeg,
        parentBeg + details.argEnd
      );
      if (details.transform) {
        const arg = s.slice(details.argBeg, details.argEnd);
        this.setNodeTransform(
          next,
          this.scriptletArgListParser.normalizeArg(arg)
        );
      }
      prev = this.linkRight(prev, next);
      if (details.failed) {
        this.addNodeFlags(next, NODE_FLAG_ERROR);
        this.addFlags(AST_FLAG_HAS_ERROR);
      }
      decorationBeg = details.argEnd;
      i = details.separatorEnd;
    }
    return this.throwHeadNode(head);
  }
  getScriptletArgs() {
    const args = [];
    if (this.isScriptletFilter() === false) {
      return args;
    }
    const root = this.getBranchFromType(NODE_TYPE_EXT_PATTERN_SCRIPTLET);
    const walker = this.getWalker(root);
    for (let node = walker.next(); node !== 0; node = walker.next()) {
      switch (this.getNodeType(node)) {
        case NODE_TYPE_EXT_PATTERN_SCRIPTLET_TOKEN:
        case NODE_TYPE_EXT_PATTERN_SCRIPTLET_ARG:
          args.push(this.getNodeTransform(node));
          break;
        default:
          break;
      }
    }
    walker.dispose();
    return args;
  }
  parseExtPatternResponseheader(parent) {
    const beg = this.nodes[parent + NODE_BEG_INDEX];
    const end = this.nodes[parent + NODE_END_INDEX];
    const s = this.getNodeString(parent);
    const rawArg0 = beg + 16;
    const rawArg1 = end - 1;
    const head = this.allocTypedNode(NODE_TYPE_EXT_DECORATION, beg, rawArg0);
    let prev = head, next = 0;
    const trimmedArg0 = rawArg0 + this.leftWhitespaceCount(s);
    const trimmedArg1 = rawArg1 - this.rightWhitespaceCount(s);
    if (trimmedArg0 !== rawArg0) {
      next = this.allocTypedNode(NODE_TYPE_WHITESPACE, rawArg0, trimmedArg0);
      prev = this.linkRight(prev, next);
    }
    next = this.allocTypedNode(NODE_TYPE_EXT_PATTERN_RESPONSEHEADER, rawArg0, rawArg1);
    this.addNodeToRegister(NODE_TYPE_EXT_PATTERN_RESPONSEHEADER, next);
    if (rawArg1 === rawArg0 && this.isException() === false) {
      this.addNodeFlags(parent, NODE_FLAG_ERROR);
      this.addFlags(AST_FLAG_HAS_ERROR);
    }
    prev = this.linkRight(prev, next);
    if (trimmedArg1 !== rawArg1) {
      next = this.allocTypedNode(NODE_TYPE_WHITESPACE, trimmedArg1, rawArg1);
      prev = this.linkRight(prev, next);
    }
    next = this.allocTypedNode(NODE_TYPE_EXT_DECORATION, rawArg1, end);
    this.linkRight(prev, next);
    return head;
  }
  getResponseheaderName() {
    if (this.isResponseheaderFilter() === false) {
      return "";
    }
    const root = this.getBranchFromType(NODE_TYPE_EXT_PATTERN_RESPONSEHEADER);
    return this.getNodeString(root);
  }
  parseExtPatternHtml(parent) {
    const beg = this.nodes[parent + NODE_BEG_INDEX];
    const end = this.nodes[parent + NODE_END_INDEX];
    const head = this.allocTypedNode(NODE_TYPE_EXT_DECORATION, beg, beg + 1);
    let prev = head, next = 0;
    next = this.allocTypedNode(NODE_TYPE_EXT_PATTERN_HTML, beg + 1, end);
    this.linkRight(prev, next);
    if ((this.hasOptions() || this.isException()) === false) {
      this.addNodeFlags(parent, NODE_FLAG_ERROR);
      this.addFlags(AST_FLAG_HAS_ERROR);
      return head;
    }
    this.result.exception = this.isException();
    this.result.raw = this.getNodeString(next);
    this.result.compiled = void 0;
    const success = this.selectorCompiler.compile(
      this.result.raw,
      this.result,
      {
        asProcedural: this.getFlags(AST_FLAG_EXT_STRONG) !== 0
      }
    );
    if (success !== true) {
      this.addNodeFlags(next, NODE_FLAG_ERROR);
      this.addFlags(AST_FLAG_HAS_ERROR);
    }
    return head;
  }
  parseExtPatternCosmetic(parent) {
    const parentBeg = this.nodes[parent + NODE_BEG_INDEX];
    const parentEnd = this.nodes[parent + NODE_END_INDEX];
    const head = this.allocTypedNode(
      NODE_TYPE_EXT_PATTERN_COSMETIC,
      parentBeg,
      parentEnd
    );
    this.addNodeToRegister(NODE_TYPE_EXT_PATTERN_COSMETIC, head);
    this.result.exception = this.isException();
    this.result.raw = this.getNodeString(head);
    this.result.compiled = void 0;
    const success = this.selectorCompiler.compile(
      this.result.raw,
      this.result,
      {
        asProcedural: this.getFlags(AST_FLAG_EXT_STRONG) !== 0,
        adgStyleSyntax: this.getFlags(AST_FLAG_EXT_STYLE) !== 0
      }
    );
    if (success !== true) {
      this.addNodeFlags(head, NODE_FLAG_ERROR);
      this.addFlags(AST_FLAG_HAS_ERROR);
    }
    return head;
  }
  hasError() {
    return (this.astFlags & AST_FLAG_HAS_ERROR) !== 0;
  }
  isUnsupported() {
    return (this.astFlags & AST_FLAG_UNSUPPORTED) !== 0;
  }
  hasOptions() {
    return (this.astFlags & AST_FLAG_HAS_OPTIONS) !== 0;
  }
  isNegatedOption(type) {
    const node = this.nodeTypeLookupTable[type];
    const flags = this.nodes[node + NODE_FLAGS_INDEX];
    return (flags & NODE_FLAG_IS_NEGATED) !== 0;
  }
  isException() {
    return (this.astFlags & AST_FLAG_IS_EXCEPTION) !== 0;
  }
  isLeftHnAnchored() {
    return (this.astFlags & AST_FLAG_NET_PATTERN_LEFT_HNANCHOR) !== 0;
  }
  isLeftAnchored() {
    return (this.astFlags & AST_FLAG_NET_PATTERN_LEFT_ANCHOR) !== 0;
  }
  isRightAnchored() {
    return (this.astFlags & AST_FLAG_NET_PATTERN_RIGHT_ANCHOR) !== 0;
  }
  linkRight(prev, next) {
    return this.nodes[prev + NODE_RIGHT_INDEX] = next;
  }
  linkDown(node, down) {
    return this.nodes[node + NODE_DOWN_INDEX] = down;
  }
  makeChain(nodes) {
    for (let i = 1; i < nodes.length; i++) {
      this.nodes[nodes[i - 1] + NODE_RIGHT_INDEX] = nodes[i];
    }
    return nodes[0];
  }
  allocHeadNode() {
    const node = this.nodePoolPtr;
    this.nodePoolPtr += NOOP_NODE_SIZE;
    if (this.nodePoolPtr > this.nodePoolEnd) {
      this.growNodePool(this.nodePoolPtr);
    }
    this.nodes[node + NODE_RIGHT_INDEX] = 0;
    return node;
  }
  throwHeadNode(head) {
    return this.nodes[head + NODE_RIGHT_INDEX];
  }
  allocTypedNode(type, beg, end) {
    const node = this.nodePoolPtr;
    this.nodePoolPtr += FULL_NODE_SIZE;
    if (this.nodePoolPtr > this.nodePoolEnd) {
      this.growNodePool(this.nodePoolPtr);
    }
    this.nodes[node + NODE_RIGHT_INDEX] = 0;
    this.nodes[node + NODE_TYPE_INDEX] = type;
    this.nodes[node + NODE_DOWN_INDEX] = 0;
    this.nodes[node + NODE_BEG_INDEX] = beg;
    this.nodes[node + NODE_END_INDEX] = end;
    this.nodes[node + NODE_TRANSFORM_INDEX] = 0;
    this.nodes[node + NODE_FLAGS_INDEX] = 0;
    return node;
  }
  allocSentinelNode(type, beg) {
    return this.allocTypedNode(type, beg, beg);
  }
  growNodePool(min) {
    const oldSize = this.nodes.length;
    const newSize = min + 16383 & ~16383;
    if (newSize === oldSize) {
      return;
    }
    const newArray = new Uint32Array(newSize);
    newArray.set(this.nodes);
    this.nodes = newArray;
    this.nodePoolEnd = newSize;
  }
  getNodeTypes() {
    return this.nodeTypeRegister.slice(0, this.nodeTypeRegisterPtr);
  }
  getNodeType(node) {
    return node !== 0 ? this.nodes[node + NODE_TYPE_INDEX] : 0;
  }
  getNodeFlags(node, flags = 4294967295) {
    return this.nodes[node + NODE_FLAGS_INDEX] & flags;
  }
  setNodeFlags(node, flags) {
    this.nodes[node + NODE_FLAGS_INDEX] = flags;
  }
  addNodeFlags(node, flags) {
    if (node === 0) {
      return;
    }
    this.nodes[node + NODE_FLAGS_INDEX] |= flags;
  }
  removeNodeFlags(node, flags) {
    this.nodes[node + NODE_FLAGS_INDEX] &= ~flags;
  }
  addNodeToRegister(type, node) {
    this.nodeTypeRegister[this.nodeTypeRegisterPtr++] = type;
    this.nodeTypeLookupTable[type] = node;
  }
  getBranchFromType(type) {
    const ptr = this.nodeTypeRegisterPtr;
    if (ptr === 0) {
      return 0;
    }
    return this.nodeTypeRegister.lastIndexOf(type, ptr - 1) !== -1 ? this.nodeTypeLookupTable[type] : 0;
  }
  nodeIsEmptyString(node) {
    return this.nodes[node + NODE_END_INDEX] === this.nodes[node + NODE_BEG_INDEX];
  }
  getNodeString(node) {
    const beg = this.nodes[node + NODE_BEG_INDEX];
    const end = this.nodes[node + NODE_END_INDEX];
    if (end === beg) {
      return "";
    }
    if (beg === 0 && end === this.rawEnd) {
      return this.raw;
    }
    return this.raw.slice(beg, end);
  }
  getNodeStringBeg(node) {
    return this.nodes[node + NODE_BEG_INDEX];
  }
  getNodeStringEnd(node) {
    return this.nodes[node + NODE_END_INDEX];
  }
  getNodeStringLen(node) {
    if (node === 0) {
      return "";
    }
    return this.nodes[node + NODE_END_INDEX] - this.nodes[node + NODE_BEG_INDEX];
  }
  isNodeTransformed(node) {
    return this.nodes[node + NODE_TRANSFORM_INDEX] !== 0;
  }
  getNodeTransform(node) {
    if (node === 0) {
      return "";
    }
    const slot = this.nodes[node + NODE_TRANSFORM_INDEX];
    return slot !== 0 ? this.astTransforms[slot] : this.getNodeString(node);
  }
  setNodeTransform(node, value) {
    const slot = this.astTransformPtr++;
    this.astTransforms[slot] = value;
    this.nodes[node + NODE_TRANSFORM_INDEX] = slot;
  }
  getTypeString(type) {
    const node = this.getBranchFromType(type);
    if (node === 0) {
      return;
    }
    return this.getNodeString(node);
  }
  leftWhitespaceCount(s) {
    const match = this.reWhitespaceStart.exec(s);
    return match === null ? 0 : match[0].length;
  }
  rightWhitespaceCount(s) {
    const match = this.reWhitespaceEnd.exec(s);
    return match === null ? 0 : match[1].length;
  }
  nextCommaInCommaSeparatedListString(s, start) {
    const n = s.length;
    if (n === 0) {
      return -1;
    }
    const ilastchar = n - 1;
    let i = start;
    while (i < n) {
      const c = s.charCodeAt(i);
      if (c === 44) {
        return i + 1;
      }
      if (c === 92) {
        if (i < ilastchar) {
          i += 1;
        }
      }
    }
    return -1;
  }
  endOfLiteralRegex(s, start) {
    const n = s.length;
    if (n === 0) {
      return -1;
    }
    const ilastchar = n - 1;
    let i = start + 1;
    while (i < n) {
      const c = s.charCodeAt(i);
      if (c === 47) {
        return i + 1;
      }
      if (c === 92) {
        if (i < ilastchar) {
          i += 1;
        }
      }
      i += 1;
    }
    return -1;
  }
  charCodeAt(pos) {
    return pos < this.rawEnd ? this.raw.charCodeAt(pos) : -1;
  }
  indexOf(needle, beg, end = 0) {
    const haystack = end === 0 ? this.raw : this.raw.slice(0, end);
    return haystack.indexOf(needle, beg);
  }
  startsWith(s, pos) {
    return pos < this.rawEnd && this.raw.startsWith(s, pos);
  }
  isTokenCharCode(c) {
    return c === 37 || c >= 48 && c <= 57 || c >= 65 && c <= 90 || c >= 97 && c <= 122;
  }
  // Ultimately, let the browser API do the hostname normalization, after
  // making some other trivial checks.
  //
  // returns:
  //   undefined: no normalization needed, use original hostname
  //   empty string: hostname is invalid
  //   non-empty string: normalized hostname
  normalizeHostnameValue(s, modeBits = 0) {
    if (this.reHostnameAscii.test(s)) {
      return;
    }
    if (this.reBadHostnameChars.test(s)) {
      return "";
    }
    let hn2 = s;
    const hasWildcard = hn2.includes("*");
    if (hasWildcard) {
      if (modeBits === 0) {
        return "";
      }
      if (hn2.length === 1) {
        if ((modeBits & DOMAIN_CAN_USE_SINGLE_WILDCARD) === 0) {
          return "";
        }
        return;
      }
      if ((modeBits & DOMAIN_CAN_USE_ENTITY) !== 0) {
        if (this.rePlainEntity.test(hn2)) {
          return;
        }
        if (this.reIsEntity.test(hn2) === false) {
          return "";
        }
      } else if ((modeBits & DOMAIN_CAN_USE_WILDCARD) === 0) {
        return "";
      }
      hn2 = hn2.replace(/\*/g, "__asterisk__");
    }
    this.punycoder.hostname = "_";
    try {
      this.punycoder.hostname = hn2;
      hn2 = this.punycoder.hostname;
    } catch {
      return "";
    }
    if (hn2 === "_" || hn2 === "") {
      return "";
    }
    if (hasWildcard) {
      hn2 = this.punycoder.hostname.replace(/__asterisk__/g, "*");
    }
    if ((modeBits & DOMAIN_CAN_USE_WILDCARD) === 0 && (hn2.charCodeAt(0) === 46 || exCharCodeAt(hn2, -1) === 46)) {
      return "";
    }
    return hn2;
  }
  normalizeRegexPattern(s) {
    try {
      const source = /^\/.+\/$/.test(s) ? s.slice(1, -1) : s;
      const regex = new RegExp(source);
      return regex.source;
    } catch (ex) {
      this.normalizeRegexPattern.message = ex.toString();
    }
    return "";
  }
  getDomainListIterator(root) {
    const iter = this.domainListIteratorJunkyard.length !== 0 ? this.domainListIteratorJunkyard.pop().reuse(root) : new DomainListIterator(this, root);
    return root !== 0 ? iter : iter.stop();
  }
  getNetFilterFromOptionIterator() {
    return this.getDomainListIterator(
      this.getBranchFromType(NODE_TYPE_NET_OPTION_NAME_FROM)
    );
  }
  getNetFilterTopOptionIterator() {
    return this.getDomainListIterator(
      this.getBranchFromType(NODE_TYPE_NET_OPTION_NAME_TOP)
    );
  }
  getNetFilterToOptionIterator() {
    return this.getDomainListIterator(
      this.getBranchFromType(NODE_TYPE_NET_OPTION_NAME_TO)
    );
  }
  getNetFilterDenyallowOptionIterator() {
    return this.getDomainListIterator(
      this.getBranchFromType(NODE_TYPE_NET_OPTION_NAME_DENYALLOW)
    );
  }
  getExtFilterDomainIterator() {
    return this.getDomainListIterator(
      this.getBranchFromType(NODE_TYPE_EXT_OPTIONS)
    );
  }
  getWalker(from) {
    if (this.walkerJunkyard.length === 0) {
      return new AstWalker(this, from);
    }
    const walker = this.walkerJunkyard.pop();
    walker.reset(from);
    return walker;
  }
  findDescendantByType(from, type) {
    const walker = this.getWalker(from);
    let node = walker.next();
    while (node !== 0) {
      if (this.getNodeType(node) === type) {
        return node;
      }
      node = walker.next();
    }
    return 0;
  }
  dump() {
    if (this.astType === AST_TYPE_COMMENT) {
      return;
    }
    const walker = this.getWalker();
    for (let node = walker.reset(); node !== 0; node = walker.next()) {
      const type = this.nodes[node + NODE_TYPE_INDEX];
      const value = this.getNodeString(node);
      const name = nodeNameFromNodeType.get(type) || `${type}`;
      const bits = this.getNodeFlags(node).toString(2).padStart(4, "0");
      const indent = "  ".repeat(walker.depth);
      console.log(`${indent}type=${name} "${value}" 0b${bits}`);
      if (this.isNodeTransformed(node)) {
        console.log(`${indent}    transform="${this.getNodeTransform(node)}"`);
      }
    }
  }
};
function parseRedirectValue(arg) {
  let token = arg.trim();
  let priority = 0;
  const asDataURI = token.charCodeAt(0) === 37;
  if (asDataURI) {
    token = token.slice(1);
  }
  const match = /:-?\d+$/.exec(token);
  if (match !== null) {
    priority = parseInt(token.slice(match.index + 1), 10);
    token = token.slice(0, match.index);
  }
  return { token, priority, asDataURI };
}
__name(parseRedirectValue, "parseRedirectValue");
function parseQueryPruneValue(arg) {
  let s = arg.trim();
  if (s === "") {
    return { all: true };
  }
  const out = {};
  out.not = s.charCodeAt(0) === 126;
  if (out.not) {
    s = s.slice(1);
  }
  const match = /^\/(.+)\/(i)?$/.exec(s);
  if (match !== null) {
    try {
      out.re = new RegExp(match[1], match[2] || "");
    } catch {
      out.bad = true;
    }
    return out;
  }
  if (s.startsWith("|")) {
    try {
      out.re = new RegExp("^" + s.slice(1), "i");
    } catch {
      out.bad = true;
    }
    return out;
  }
  if (s.includes("|")) {
    out.bad = true;
    return out;
  }
  out.name = s;
  return out;
}
__name(parseQueryPruneValue, "parseQueryPruneValue");
function parseHeaderValue(arg) {
  let s = arg.trim();
  const out = {};
  let pos = s.indexOf(":");
  if (pos === -1) {
    pos = s.length;
  }
  out.name = s.slice(0, pos).toLowerCase();
  out.bad = out.name === "";
  s = s.slice(pos + 1);
  out.not = s.charCodeAt(0) === 126;
  if (out.not) {
    s = s.slice(1);
  }
  out.value = s;
  if (s === "") {
    return out;
  }
  const match = /^\/(.+)\/(i)?$/.exec(s);
  out.isRegex = match !== null;
  if (out.isRegex) {
    out.reStr = match[1];
    out.reFlags = match[2] || "";
    try {
      new RegExp(out.reStr, out.reFlags);
    } catch {
      out.bad = true;
    }
    return out;
  }
  out.reFlags = "i";
  if (/[*?]/.test(s) === false) {
    out.reStr = escapeForRegex(s);
    return out;
  }
  const reConstruct = /(?<!\\)[*?]/g;
  const reParts = [];
  let beg = 0;
  for (; ; ) {
    const match2 = reConstruct.exec(s);
    if (match2 === null) {
      break;
    }
    reParts.push(
      escapeForRegex(s.slice(beg, match2.index)),
      match2[0] === "*" ? ".*" : ".?"
    );
    beg = reConstruct.lastIndex;
  }
  reParts.push(escapeForRegex(s.slice(beg)));
  out.reStr = reParts.join("");
  return out;
}
__name(parseHeaderValue, "parseHeaderValue");
function parseReplaceByRegexValue(s) {
  if (s.charCodeAt(0) !== 47) {
    return;
  }
  const parser = new ArglistParser("/");
  parser.nextArg(s, 1);
  let pattern = s.slice(parser.argBeg, parser.argEnd);
  if (parser.transform) {
    pattern = parser.normalizeArg(pattern);
  }
  if (pattern !== "") {
    pattern = parser.normalizeArg(pattern, "$");
    pattern = parser.normalizeArg(pattern, ",");
  }
  parser.nextArg(s, parser.separatorEnd);
  let replacement = s.slice(parser.argBeg, parser.argEnd);
  if (parser.separatorEnd === parser.separatorBeg) {
    return;
  }
  if (parser.transform) {
    replacement = parser.normalizeArg(replacement);
  }
  replacement = parser.normalizeArg(replacement, "$");
  replacement = parser.normalizeArg(replacement, ",");
  const flags = s.slice(parser.separatorEnd);
  if (pattern === "") {
    return { flags, replacement };
  }
  try {
    return { re: new RegExp(pattern, flags), replacement };
  } catch {
  }
}
__name(parseReplaceByRegexValue, "parseReplaceByRegexValue");
function parseReplaceValue(s) {
  if (s.startsWith("/")) {
    const r = parseReplaceByRegexValue(s);
    if (r) {
      if (r.re === void 0) {
        return;
      }
      r.type = "text";
    }
    return r;
  }
  const pos = s.indexOf(":");
  if (pos === -1) {
    return;
  }
  const type = s.slice(0, pos);
  if (type === "json" || type === "jsonl") {
    const query = s.slice(pos + 1);
    const jsonp = JSONPath.create(query);
    if (jsonp.valid === false) {
      return;
    }
    return { type, jsonp };
  }
}
__name(parseReplaceValue, "parseReplaceValue");
var netOptionTokenDescriptors = /* @__PURE__ */ new Map([
  ["1p", { canNegate: true }],
  /* synonym */
  ["first-party", { canNegate: true }],
  ["strict1p", {}],
  /* synonym */
  ["strict-first-party", {}],
  ["3p", { canNegate: true }],
  /* synonym */
  ["third-party", { canNegate: true }],
  ["strict3p", {}],
  /* synonym */
  ["strict-third-party", {}],
  ["all", {}],
  ["badfilter", {}],
  ["cname", { allowOnly: true }],
  ["csp", { mustAssign: true }],
  ["css", { canNegate: true }],
  /* synonym */
  ["stylesheet", { canNegate: true }],
  ["denyallow", { mustAssign: true }],
  ["doc", { canNegate: true }],
  /* synonym */
  ["document", { canNegate: true }],
  ["ehide", {}],
  /* synonym */
  ["elemhide", {}],
  ["empty", { blockOnly: true }],
  ["frame", { canNegate: true }],
  /* synonym */
  ["subdocument", { canNegate: true }],
  ["from", { mustAssign: true }],
  /* synonym */
  ["domain", { mustAssign: true }],
  ["font", { canNegate: true }],
  ["genericblock", {}],
  ["ghide", {}],
  /* synonym */
  ["generichide", {}],
  ["image", { canNegate: true }],
  ["important", { blockOnly: true }],
  ["inline-font", { canNegate: true }],
  ["inline-script", { canNegate: true }],
  ["ipaddress", { mustAssign: true }],
  ["match-case", {}],
  ["media", { canNegate: true }],
  ["method", { mustAssign: true }],
  ["mp4", { blockOnly: true }],
  ["_", {}],
  ["object", { canNegate: true }],
  /* synonym */
  ["object-subrequest", { canNegate: true }],
  ["other", { canNegate: true }],
  ["permissions", { mustAssign: true }],
  ["ping", { canNegate: true }],
  /* synonym */
  ["beacon", { canNegate: true }],
  ["popunder", {}],
  ["popup", { canNegate: true }],
  ["reason", { mustAssign: true }],
  ["redirect", { mustAssign: true }],
  /* synonym */
  ["rewrite", { mustAssign: true }],
  ["redirect-rule", { mustAssign: true }],
  ["removeparam", {}],
  /* synonym */
  ["queryprune", {}],
  ["replace", { mustAssign: true }],
  ["requestheader", { mustAssign: true }],
  ["responseheader", { mustAssign: true }],
  /* synonym */
  ["header", { mustAssign: true }],
  ["script", { canNegate: true }],
  ["shide", {}],
  /* synonym */
  ["specifichide", {}],
  ["to", { mustAssign: true }],
  ["top", { mustAssign: true }],
  ["urlskip", { mustAssign: true }],
  ["uritransform", { mustAssign: true }],
  ["xhr", { canNegate: true }],
  /* synonym */
  ["xmlhttprequest", { canNegate: true }],
  ["webrtc", {}],
  ["websocket", { canNegate: true }]
]);
var ExtSelectorCompiler = class {
  static {
    __name(this, "ExtSelectorCompiler");
  }
  constructor(instanceOptions = {}) {
    this.reParseRegexLiteral = /^\/(.+)\/([imu]+)?$/;
    const cssIdentifier = "[A-Za-z_][\\w-]*";
    const cssClassOrId = `[.#]${cssIdentifier}`;
    const cssAttribute = `\\[${cssIdentifier}(?:[*^$]?="[^"\\]\\\\\\x09-\\x0D]+")?\\]`;
    const cssSimple = `(?:${cssIdentifier}(?:${cssClassOrId})*(?:${cssAttribute})*|${cssClassOrId}(?:${cssClassOrId})*(?:${cssAttribute})*|${cssAttribute}(?:${cssAttribute})*)`;
    const cssCombinator = "(?: | [+>~] )";
    this.reCommonSelector = new RegExp(
      `^${cssSimple}(?:${cssCombinator}${cssSimple})*$`
    );
    this.reEatBackslashes = /\\([()])/g;
    this.knownPseudoClasses = /* @__PURE__ */ new Set([
      "active",
      "any-link",
      "autofill",
      "blank",
      "checked",
      "current",
      "default",
      "defined",
      "dir",
      "disabled",
      "empty",
      "enabled",
      "first",
      "first-child",
      "first-of-type",
      "fullscreen",
      "future",
      "focus",
      "focus-visible",
      "focus-within",
      "has",
      "host",
      "host-context",
      "hover",
      "indeterminate",
      "in-range",
      "invalid",
      "is",
      "lang",
      "last-child",
      "last-of-type",
      "left",
      "link",
      "local-link",
      "modal",
      "not",
      "nth-child",
      "nth-col",
      "nth-last-child",
      "nth-last-col",
      "nth-last-of-type",
      "nth-of-type",
      "only-child",
      "only-of-type",
      "optional",
      "out-of-range",
      "past",
      "picture-in-picture",
      "placeholder-shown",
      "paused",
      "playing",
      "read-only",
      "read-write",
      "required",
      "right",
      "root",
      "scope",
      "state",
      "target",
      "target-within",
      "user-invalid",
      "valid",
      "visited",
      "where"
    ]);
    this.knownPseudoClassesWithArgs = /* @__PURE__ */ new Set([
      "dir",
      "has",
      "host-context",
      "is",
      "lang",
      "not",
      "nth-child",
      "nth-col",
      "nth-last-child",
      "nth-last-col",
      "nth-last-of-type",
      "nth-of-type",
      "state",
      "where"
    ]);
    this.knownPseudoElements = /* @__PURE__ */ new Set([
      "after",
      "backdrop",
      "before",
      "cue",
      "cue-region",
      "first-letter",
      "first-line",
      "file-selector-button",
      "grammar-error",
      "marker",
      "part",
      "placeholder",
      "selection",
      "slotted",
      "spelling-error",
      "target-text"
    ]);
    this.knownPseudoElementsWithArgs = /* @__PURE__ */ new Set([
      "part",
      "slotted"
    ]);
    this.normalizedOperators = /* @__PURE__ */ new Map([
      ["-abp-has", "has"],
      ["-abp-contains", "has-text"],
      ["contains", "has-text"],
      ["nth-ancestor", "upward"],
      ["watch-attrs", "watch-attr"]
    ]);
    this.actionOperators = /* @__PURE__ */ new Set([
      ":remove",
      ":style"
    ]);
    this.proceduralOperatorNames = /* @__PURE__ */ new Set([
      "has-text",
      "if",
      "if-not",
      "matches-attr",
      "matches-css",
      "matches-css-after",
      "matches-css-before",
      "matches-media",
      "matches-path",
      "matches-prop",
      "min-text-length",
      "others",
      "shadow",
      "upward",
      "watch-attr",
      "xpath"
    ]);
    this.maybeProceduralOperatorNames = /* @__PURE__ */ new Set([
      "has",
      "not"
    ]);
    this.proceduralActionNames = /* @__PURE__ */ new Set([
      "remove",
      "remove-attr",
      "remove-class",
      "style"
    ]);
    this.normalizedExtendedSyntaxOperators = /* @__PURE__ */ new Map([
      ["contains", "has-text"],
      ["has", "has"]
    ]);
    this.reIsRelativeSelector = /^\s*[+>~]/;
    this.reExtendedSyntax = /\[-(?:abp|ext)-[a-z-]+=(['"])(?:.+?)(?:\1)\]/;
    this.reExtendedSyntaxReplacer = /\[-(?:abp|ext)-([a-z-]+)=(['"])(.+?)\2\]/g;
    this.abpProceduralOpReplacer = /:-abp-(?:[a-z]+)\(/g;
    this.nativeCssHas = instanceOptions.nativeCssHas === true;
    this.reInvalidIdentifier = /^\d/;
    this.error = void 0;
  }
  // CSSTree library holds onto last string parsed, and this is problematic
  // when the string is a slice of a huge parent string (typically a whole
  // filter list), it causes the huge parent string to stay in memory.
  // Asking CSSTree to parse an empty string resolves this issue.
  finish() {
    ib("");
  }
  compile(raw, out, compileOptions = {}) {
    this.asProcedural = compileOptions.asProcedural === true;
    if (this.isStyleInjectionFilter(raw)) {
      const translated = this.translateStyleInjectionFilter(raw);
      if (translated === void 0) {
        return false;
      }
      raw = translated;
    } else if (compileOptions.adgStyleSyntax === true) {
      return false;
    }
    if (this.asProcedural) {
      if (this.reExtendedSyntax.test(raw)) {
        raw = raw.replace(this.reExtendedSyntaxReplacer, (a, a1, a2, a3) => {
          const op2 = this.normalizedExtendedSyntaxOperators.get(a1);
          if (op2 === void 0) {
            return a;
          }
          return `:${op2}(${a3})`;
        });
      } else {
        let asProcedural = false;
        raw = raw.replace(this.abpProceduralOpReplacer, (match) => {
          if (match === ":-abp-contains(") {
            return ":has-text(";
          }
          if (match === ":-abp-has(") {
            return ":has(";
          }
          asProcedural = true;
          return match;
        });
        this.asProcedural = asProcedural;
      }
    }
    if (this.reIsRelativeSelector.test(raw)) {
      return false;
    }
    if (this.reCommonSelector.test(raw)) {
      out.compiled = raw;
      return true;
    }
    this.error = void 0;
    out.compiled = this.compileSelector(raw);
    if (out.compiled === void 0) {
      out.error = this.error;
      return false;
    }
    if (out.compiled instanceof Object) {
      out.compiled.raw = raw;
      out.compiled = JSON.stringify(out.compiled);
    }
    return true;
  }
  compileSelector(raw) {
    const parts = this.astFromRaw(raw, "selectorList");
    if (parts === void 0) {
      return;
    }
    if (this.astHasType(parts, "Error")) {
      return;
    }
    if (this.astHasType(parts, "Selector") === false) {
      return;
    }
    if (this.astIsValidSelectorList(parts) === false) {
      return;
    }
    if (this.astHasType(parts, "ProceduralSelector")) {
      if (this.astHasType(parts, "PseudoElementSelector")) {
        return;
      }
    } else if (this.astHasType(parts, "ActionSelector") === false) {
      return this.astSerialize(parts);
    }
    const r = this.astCompile(parts);
    if (this.isCssable(r)) {
      r.cssable = true;
    }
    return r;
  }
  isCssable(r) {
    if (r instanceof Object === false) {
      return false;
    }
    if (Array.isArray(r.action) && r.action[0] !== "style") {
      return false;
    }
    if (Array.isArray(r.tasks) === false) {
      return true;
    }
    if (r.tasks[0][0] === "matches-media") {
      if (r.tasks.length === 1) {
        return true;
      }
      if (r.tasks.length === 2) {
        if (r.selector !== "") {
          return false;
        }
        if (r.tasks[1][0] === "spath") {
          return true;
        }
      }
    }
    return false;
  }
  astFromRaw(raw, type) {
    let ast;
    try {
      ast = ib(raw, {
        context: type,
        parseValue: false
      });
    } catch (reason) {
      const lines = [reason.message];
      const extra = reason.sourceFragment().split("\n");
      if (extra.length !== 0) {
        lines.push("");
      }
      const match = /^[^|]+\|/.exec(extra[0]);
      const beg = match !== null ? match[0].length : 0;
      lines.push(...extra.map((a) => a.slice(beg)));
      this.error = lines.join("\n");
      return;
    }
    const parts = [];
    this.astFlatten(ast, parts);
    return parts;
  }
  astFlatten(data, out) {
    const head = data.children && data.children.head;
    let args;
    switch (data.type) {
      case "AttributeSelector":
      case "ClassSelector":
      case "Combinator":
      case "IdSelector":
      case "MediaFeature":
      case "Nth":
      case "Raw":
      case "TypeSelector":
        out.push({ data });
        break;
      case "Declaration":
        if (data.value) {
          this.astFlatten(data.value, args = []);
        }
        out.push({ data, args });
        args = void 0;
        break;
      case "DeclarationList":
      case "Identifier":
      case "MediaQueryList":
      case "Selector":
      case "SelectorList":
        args = out;
        out.push({ data });
        break;
      case "MediaQuery":
      case "PseudoClassSelector":
      case "PseudoElementSelector":
        if (head) {
          args = [];
        }
        out.push({ data, args });
        break;
      case "Value":
        args = out;
        break;
      default:
        break;
    }
    if (head) {
      if (args) {
        this.astFlatten(head.data, args);
      }
      let next = head.next;
      while (next) {
        this.astFlatten(next.data, args);
        next = next.next;
      }
    }
    if (data.type !== "PseudoClassSelector") {
      return;
    }
    if (data.name.startsWith("-abp-") && this.asProcedural === false) {
      this.error = `${data.name} requires '#?#' separator syntax`;
      return;
    }
    data.name = this.normalizedOperators.get(data.name) || data.name;
    if (this.proceduralOperatorNames.has(data.name)) {
      data.type = "ProceduralSelector";
    } else if (this.proceduralActionNames.has(data.name)) {
      data.type = "ActionSelector";
    } else if (data.name.startsWith("-abp-")) {
      data.type = "Error";
      this.error = `${data.name} is not supported`;
      return;
    }
    if (this.maybeProceduralOperatorNames.has(data.name) === false) {
      return;
    }
    if (this.astHasType(args, "ActionSelector")) {
      data.type = "Error";
      this.error = "invalid use of action operator";
      return;
    }
    if (this.astHasType(args, "ProceduralSelector")) {
      data.type = "ProceduralSelector";
      return;
    }
    switch (data.name) {
      case "has":
        if (this.asProcedural || this.nativeCssHas !== true || this.astHasName(args, "has")) {
          data.type = "ProceduralSelector";
        } else if (this.astHasType(args, "PseudoElementSelector")) {
          data.type = "Error";
        }
        break;
      case "not": {
        if (this.astHasType(args, "Combinator", 0) === false) {
          break;
        }
        if (this.astIsValidSelectorList(args) !== true) {
          data.type = "Error";
        }
        break;
      }
      default:
        break;
    }
  }
  // https://github.com/uBlockOrigin/uBlock-issues/issues/2300
  //   Unquoted attribute values are parsed as Identifier instead of String.
  // https://github.com/uBlockOrigin/uBlock-issues/issues/3127
  //   Escape [\t\n\v\f\r]
  astSerializePart(part) {
    const out = [];
    const { data } = part;
    switch (data.type) {
      case "AttributeSelector": {
        const name = data.name.name;
        if (this.reInvalidIdentifier.test(name)) {
          return;
        }
        if (data.matcher === null) {
          out.push(`[${name}]`);
          break;
        }
        let value = data.value.value;
        if (typeof value !== "string") {
          value = data.value.name;
        }
        if (/["\\]/.test(value)) {
          value = value.replace(/["\\]/g, "\\$&");
        }
        if (/[\x09-\x0D]/.test(value)) {
          value = value.replace(
            /[\x09-\x0D]/g,
            (s) => `\\${s.charCodeAt(0).toString(16).toUpperCase()} `
          );
        }
        let flags = "";
        if (typeof data.flags === "string") {
          if (/^(is?|si?)$/.test(data.flags) === false) {
            return;
          }
          flags = ` ${data.flags}`;
        }
        out.push(`[${name}${data.matcher}"${value}"${flags}]`);
        break;
      }
      case "ClassSelector":
        if (this.reInvalidIdentifier.test(data.name)) {
          return;
        }
        out.push(`.${data.name}`);
        break;
      case "Combinator":
        out.push(data.name);
        break;
      case "Identifier":
        if (this.reInvalidIdentifier.test(data.name)) {
          return;
        }
        out.push(data.name);
        break;
      case "IdSelector":
        if (this.reInvalidIdentifier.test(data.name)) {
          return;
        }
        out.push(`#${data.name}`);
        break;
      case "Nth": {
        if (data.selector !== null) {
          return;
        }
        if (data.nth.type === "AnPlusB") {
          const a = parseInt(data.nth.a, 10) || null;
          const b2 = parseInt(data.nth.b, 10) || null;
          if (a !== null) {
            out.push(`${a}n`);
            if (b2 === null) {
              break;
            }
            if (b2 < 0) {
              out.push(`${b2}`);
            } else {
              out.push(`+${b2}`);
            }
          } else if (b2 !== null) {
            out.push(`${b2}`);
          }
        } else if (data.nth.type === "Identifier") {
          out.push(data.nth.name);
        }
        break;
      }
      case "PseudoElementSelector": {
        const hasArgs = Array.isArray(part.args);
        if (data.name.charCodeAt(0) !== 45) {
          if (this.knownPseudoElements.has(data.name) === false) {
            return;
          }
          if (this.knownPseudoElementsWithArgs.has(data.name) && hasArgs === false) {
            return;
          }
        }
        out.push(`::${data.name}`);
        if (hasArgs) {
          const arg = this.astSerialize(part.args);
          if (typeof arg !== "string") {
            return;
          }
          out.push(`(${arg})`);
        }
        break;
      }
      case "PseudoClassSelector": {
        const hasArgs = Array.isArray(part.args);
        if (data.name.charCodeAt(0) !== 45) {
          if (this.knownPseudoClasses.has(data.name) === false) {
            return;
          }
          if (this.knownPseudoClassesWithArgs.has(data.name) && hasArgs === false) {
            return;
          }
        }
        out.push(`:${data.name}`);
        if (hasArgs) {
          const arg = this.astSerialize(part.args);
          if (typeof arg !== "string") {
            return;
          }
          out.push(`(${arg.trim()})`);
        }
        break;
      }
      case "Raw":
        out.push(data.value);
        break;
      case "TypeSelector":
        if (this.reInvalidIdentifier.test(data.name)) {
          return;
        }
        out.push(data.name);
        break;
      default:
        break;
    }
    return out.join("");
  }
  astSerialize(parts, plainCSS = true) {
    const out = [];
    for (const part of parts) {
      const { data } = part;
      switch (data.type) {
        case "AttributeSelector":
        case "ClassSelector":
        case "Identifier":
        case "IdSelector":
        case "Nth":
        case "PseudoClassSelector":
        case "PseudoElementSelector": {
          const s = this.astSerializePart(part);
          if (s === void 0) {
            return;
          }
          out.push(s);
          break;
        }
        case "Combinator": {
          const s = this.astSerializePart(part);
          if (s === void 0) {
            return;
          }
          if (out.length !== 0) {
            out.push(" ");
          }
          if (s !== " ") {
            out.push(s, " ");
          }
          break;
        }
        case "TypeSelector": {
          const s = this.astSerializePart(part);
          if (s === void 0) {
            return;
          }
          if (s === "*" && out.length !== 0) {
            const before = out[out.length - 1];
            if (before.endsWith(" ") === false) {
              return;
            }
          }
          out.push(s);
          break;
        }
        case "Raw":
          if (plainCSS) {
            return;
          }
          out.push(this.astSerializePart(part));
          break;
        case "Selector":
          if (out.length !== 0) {
            out.push(", ");
          }
          break;
        case "SelectorList":
          break;
        default:
          return;
      }
    }
    return out.join("");
  }
  astCompile(parts, details = {}) {
    if (Array.isArray(parts) === false) {
      return;
    }
    if (parts.length === 0) {
      return;
    }
    if (parts[0].data.type !== "SelectorList") {
      return;
    }
    const out = { selector: "" };
    const prelude = [];
    const tasks = [];
    let startOfSelector = true;
    for (const part of parts) {
      if (out.action !== void 0) {
        return;
      }
      const { data } = part;
      switch (data.type) {
        case "ActionSelector": {
          if (details.noaction) {
            return;
          }
          if (prelude.length !== 0) {
            if (tasks.length === 0) {
              out.selector = prelude.join("");
            } else {
              tasks.push(this.createSpathTask(prelude.join("")));
            }
            prelude.length = 0;
          }
          const args = this.compileArgumentAst(data.name, part.args);
          if (args === void 0) {
            return;
          }
          out.action = [data.name, args];
          break;
        }
        case "AttributeSelector":
        case "ClassSelector":
        case "IdSelector":
        case "PseudoClassSelector":
        case "PseudoElementSelector":
        case "TypeSelector": {
          const s = this.astSerializePart(part);
          if (s === void 0) {
            return;
          }
          prelude.push(s);
          startOfSelector = false;
          break;
        }
        case "Combinator": {
          const s = this.astSerializePart(part);
          if (s === void 0) {
            return;
          }
          if (startOfSelector === false || prelude.length !== 0) {
            prelude.push(" ");
          }
          if (s !== " ") {
            prelude.push(s, " ");
          }
          startOfSelector = false;
          break;
        }
        case "ProceduralSelector": {
          if (prelude.length !== 0) {
            let spath = prelude.join("");
            prelude.length = 0;
            if (spath.endsWith(" ")) {
              spath += "*";
            }
            if (tasks.length === 0) {
              out.selector = spath;
            } else {
              tasks.push(this.createSpathTask(spath));
            }
          }
          const args = this.compileArgumentAst(data.name, part.args);
          if (args === void 0) {
            return;
          }
          tasks.push([data.name, args]);
          startOfSelector = false;
          break;
        }
        case "Selector":
          if (prelude.length !== 0) {
            prelude.push(", ");
          }
          startOfSelector = true;
          break;
        case "SelectorList":
          startOfSelector = true;
          break;
        default:
          return;
      }
    }
    if (tasks.length === 0 && out.action === void 0) {
      if (prelude.length === 0) {
        return;
      }
      return prelude.join("").trim();
    }
    if (prelude.length !== 0) {
      tasks.push(this.createSpathTask(prelude.join("")));
    }
    if (tasks.length !== 0) {
      out.tasks = tasks;
    }
    return out;
  }
  astHasType(parts, type, depth = 2147483647) {
    if (Array.isArray(parts) === false) {
      return false;
    }
    for (const part of parts) {
      if (part.data.type === type) {
        return true;
      }
      if (Array.isArray(part.args) && depth !== 0 && this.astHasType(part.args, type, depth - 1)) {
        return true;
      }
    }
    return false;
  }
  astHasName(parts, name) {
    if (Array.isArray(parts) === false) {
      return false;
    }
    for (const part of parts) {
      if (part.data.name === name) {
        return true;
      }
      if (Array.isArray(part.args) && this.astHasName(part.args, name)) {
        return true;
      }
    }
    return false;
  }
  astSelectorsFromSelectorList(args) {
    if (Array.isArray(args) === false) {
      return;
    }
    if (args.length < 3) {
      return;
    }
    if (args[0].data instanceof Object === false) {
      return;
    }
    if (args[0].data.type !== "SelectorList") {
      return;
    }
    if (args[1].data instanceof Object === false) {
      return;
    }
    if (args[1].data.type !== "Selector") {
      return;
    }
    const out = [];
    let beg = 1, end = 0, i = 2;
    for (; ; ) {
      if (i < args.length) {
        const type = args[i].data instanceof Object && args[i].data.type;
        if (type === "Selector") {
          end = i;
        }
      } else {
        end = args.length;
      }
      if (end !== 0) {
        const components = args.slice(beg + 1, end);
        if (components.length === 0) {
          return;
        }
        out.push(components);
        if (end === args.length) {
          break;
        }
        beg = end;
        end = 0;
      }
      if (i === args.length) {
        break;
      }
      i += 1;
    }
    return out;
  }
  astIsValidSelector(components) {
    const len = components.length;
    if (len === 0) {
      return false;
    }
    if (components[0].data.type === "Combinator") {
      return false;
    }
    if (len === 1) {
      return true;
    }
    if (components[len - 1].data.type === "Combinator") {
      return false;
    }
    return true;
  }
  astIsValidSelectorList(args) {
    const selectors = this.astSelectorsFromSelectorList(args);
    if (Array.isArray(selectors) === false || selectors.length === 0) {
      return false;
    }
    for (const selector of selectors) {
      if (this.astIsValidSelector(selector) !== true) {
        return false;
      }
    }
    return true;
  }
  isStyleInjectionFilter(selector) {
    const len = selector.length;
    return len !== 0 && selector.charCodeAt(len - 1) === 125;
  }
  translateStyleInjectionFilter(raw) {
    const matches = /^(.+)\s*\{([^}]+)\}$/.exec(raw);
    if (matches === null) {
      return;
    }
    const selector = matches[1].trim();
    const style = matches[2].trim();
    if (/^\s*remove:\s*true[; ]*$/.test(style)) {
      return `${selector}:remove()`;
    }
    return /display\s*:\s*none\s*!important;?$/.test(style) ? selector : `${selector}:style(${style})`;
  }
  createSpathTask(selector) {
    return ["spath", selector];
  }
  compileArgumentAst(operator, parts) {
    switch (operator) {
      case "has": {
        let r = this.astCompile(parts, { noaction: true });
        if (typeof r === "string") {
          r = { selector: r.replace(/^\s*:scope\s*/, "") };
        }
        return r;
      }
      case "not": {
        return this.astCompile(parts, { noaction: true });
      }
      default:
        break;
    }
    if (Array.isArray(parts) === false || parts.length === 0) {
      return;
    }
    const arg = this.astSerialize(parts, false);
    if (arg === void 0) {
      return;
    }
    switch (operator) {
      case "has-text":
        return this.compileText(arg);
      case "if":
        return this.compileSelector(arg);
      case "if-not":
        return this.compileSelector(arg);
      case "matches-attr":
      case "matches-prop":
        return this.compileMatchAttrArgument(arg);
      case "matches-css":
        return this.compileCSSDeclaration(arg);
      case "matches-css-after":
        return this.compileCSSDeclaration(`after, ${arg}`);
      case "matches-css-before":
        return this.compileCSSDeclaration(`before, ${arg}`);
      case "matches-media":
        return this.compileMediaQuery(arg);
      case "matches-path":
        return this.compileText(arg);
      case "min-text-length":
        return this.compileInteger(arg);
      case "others":
        return this.compileNoArgument(arg);
      case "remove":
        return this.compileNoArgument(arg);
      case "remove-attr":
        return this.compileText(arg);
      case "remove-class":
        return this.compileText(arg);
      case "shadow":
        return this.compileSelector(arg);
      case "style":
        return this.compileStyleProperties(arg);
      case "upward":
        return this.compileUpwardArgument(arg);
      case "watch-attr":
        return this.compileAttrList(arg);
      case "xpath":
        return this.compileXpathExpression(arg);
      default:
        break;
    }
  }
  isBadRegex(s) {
    try {
      void new RegExp(s);
    } catch (ex) {
      this.isBadRegex.message = ex.toString();
      return true;
    }
    return false;
  }
  unquoteString(s) {
    const end = s.length;
    if (end === 0) {
      return { s: "", end };
    }
    if (/^['"]/.test(s) === false) {
      return { s, i: end };
    }
    const quote = s.charCodeAt(0);
    const out = [];
    let i = 1, c = 0;
    for (; ; ) {
      c = s.charCodeAt(i);
      if (c === quote) {
        i += 1;
        break;
      }
      if (c === 92) {
        i += 1;
        if (i === end) {
          break;
        }
        c = s.charCodeAt(i);
        if (c !== 92 && c !== quote) {
          out.push(92);
        }
      }
      out.push(c);
      i += 1;
      if (i === end) {
        break;
      }
    }
    return { s: String.fromCharCode(...out), i };
  }
  compileMatchAttrArgument(s) {
    if (s === "") {
      return;
    }
    let attr = "", value = "";
    let r = this.unquoteString(s);
    if (r.i === s.length) {
      const pos = r.s.indexOf("=");
      if (pos === -1) {
        attr = r.s;
      } else {
        attr = r.s.slice(0, pos);
        value = r.s.slice(pos + 1);
      }
    } else {
      attr = r.s;
      if (s.charCodeAt(r.i) !== 61) {
        return;
      }
      value = s.slice(r.i + 1);
    }
    if (attr === "") {
      return;
    }
    if (value.length !== 0) {
      r = this.unquoteString(value);
      if (r.i !== value.length) {
        return;
      }
      value = r.s;
    }
    return { attr, value };
  }
  // Remove potentially present quotes before processing.
  compileText(s) {
    if (s === "") {
      this.error = "argument missing";
      return;
    }
    const r = this.unquoteString(s);
    if (r.i !== s.length) {
      return;
    }
    return r.s;
  }
  compileCSSDeclaration(s) {
    let pseudo;
    {
      const match2 = /^[a-z-]+,/.exec(s);
      if (match2 !== null) {
        pseudo = match2[0].slice(0, -1);
        s = s.slice(match2[0].length).trim();
      }
    }
    const pos = s.indexOf(":");
    if (pos === -1) {
      return;
    }
    const name = s.slice(0, pos).trim();
    const value = s.slice(pos + 1).trim();
    const match = this.reParseRegexLiteral.exec(value);
    let regexDetails;
    if (match !== null) {
      regexDetails = match[1];
      if (this.isBadRegex(regexDetails)) {
        return;
      }
      if (match[2]) {
        regexDetails = [regexDetails, match[2]];
      }
    } else {
      regexDetails = `^${escapeForRegex(value)}$`;
    }
    return { name, pseudo, value: regexDetails };
  }
  compileInteger(s, min = 0, max = 2147483647) {
    if (/^\d+$/.test(s) === false) {
      return;
    }
    const n = parseInt(s, 10);
    if (n < min || n >= max) {
      return;
    }
    return n;
  }
  compileMediaQuery(s) {
    const parts = this.astFromRaw(s, "mediaQueryList");
    if (parts === void 0) {
      return;
    }
    if (this.astHasType(parts, "Raw")) {
      return;
    }
    if (this.astHasType(parts, "MediaQuery") === false) {
      return;
    }
    return s;
  }
  compileUpwardArgument(s) {
    const i = this.compileInteger(s, 1, 256);
    if (i !== void 0) {
      return i;
    }
    return this.compilePlainSelector(s);
  }
  compilePlainSelector(s) {
    const parts = this.astFromRaw(s, "selectorList");
    if (this.astIsValidSelectorList(parts) !== true) {
      return;
    }
    if (this.astHasType(parts, "ProceduralSelector")) {
      return;
    }
    if (this.astHasType(parts, "ActionSelector")) {
      return;
    }
    if (this.astHasType(parts, "Error")) {
      return;
    }
    return s;
  }
  compileNoArgument(s) {
    if (s === "") {
      return s;
    }
  }
  // https://github.com/uBlockOrigin/uBlock-issues/issues/668
  // https://github.com/uBlockOrigin/uBlock-issues/issues/1693
  // https://github.com/uBlockOrigin/uBlock-issues/issues/1811
  //   Forbid instances of:
  //   - `image-set(`
  //   - `url(`
  //   - any instance of `//`
  //   - backslashes `\`
  //   - opening comment `/*`
  compileStyleProperties(s) {
    if (/image-set\(|url\(|\/\s*\/|\\|\/\*/i.test(s)) {
      return;
    }
    const parts = this.astFromRaw(s, "declarationList");
    if (parts === void 0) {
      return;
    }
    if (this.astHasType(parts, "Declaration") === false) {
      return;
    }
    return s;
  }
  compileAttrList(s) {
    if (s === "") {
      return s;
    }
    const attrs = s.split(/\s*,\s*/);
    const out = [];
    for (const attr of attrs) {
      if (attr !== "") {
        out.push(attr);
      }
    }
    return out;
  }
  compileXpathExpression(s) {
    const r = this.unquoteString(s);
    if (r.i !== s.length) {
      return;
    }
    const doc = globalThis.document;
    if (doc instanceof Object === false) {
      return r.s;
    }
    try {
      const expr = doc.createExpression(r.s, null);
      expr.evaluate(doc, XPathResult.ANY_UNORDERED_NODE_TYPE);
    } catch {
      return;
    }
    return r.s;
  }
};
var utils = /* @__PURE__ */ (() => {
  const preparserTokens = /* @__PURE__ */ new Map([
    ["ext_ublock", "ublock"],
    ["ext_ubol", "ubol"],
    ["ext_devbuild", "devbuild"],
    ["env_chromium", "chromium"],
    ["env_edge", "edge"],
    ["env_firefox", "firefox"],
    ["env_legacy", "legacy"],
    ["env_mobile", "mobile"],
    ["env_mv3", "mv3"],
    ["env_safari", "safari"],
    ["cap_html_filtering", "html_filtering"],
    ["cap_user_stylesheet", "user_stylesheet"],
    ["cap_ipaddress", "ipaddress"],
    ["false", "false"],
    // Hoping ABP-only list maintainers can at least make use of it to
    // help non-ABP content blockers better deal with filters benefiting
    // only ABP.
    ["ext_abp", "false"],
    // Compatibility with other blockers
    // https://adguard.com/kb/general/ad-filtering/create-own-filters/#conditions-directive
    ["adguard", "adguard"],
    ["adguard_app_android", "false"],
    ["adguard_app_cli", "false"],
    ["adguard_app_ios", "false"],
    ["adguard_app_mac", "false"],
    ["adguard_app_windows", "false"],
    ["adguard_ext_android_cb", "false"],
    ["adguard_ext_chromium", "chromium"],
    ["adguard_ext_chromium_mv3", "mv3"],
    ["adguard_ext_edge", "edge"],
    ["adguard_ext_firefox", "firefox"],
    ["adguard_ext_opera", "chromium"],
    ["adguard_ext_safari", "false"]
  ]);
  const toURL = /* @__PURE__ */ __name((url) => {
    try {
      return new URL(url.trim());
    } catch {
    }
  }, "toURL");
  class preparser {
    static {
      __name(this, "preparser");
    }
    static evaluateExprToken(token, env = []) {
      const not = token.charCodeAt(0) === 33;
      if (not) {
        token = token.slice(1);
      }
      let state = preparserTokens.get(token);
      if (state === void 0) {
        if (token.startsWith("cap_") === false) {
          return;
        }
        state = "false";
      }
      return state === "false" && not || env.includes(state) !== not;
    }
    static evaluateExpr(expr, env = []) {
      if (expr.startsWith("(") && expr.endsWith(")")) {
        expr = expr.slice(1, -1);
      }
      const matches = Array.from(expr.matchAll(/(?:(?:&&|\|\|)\s+)?\S+/g));
      if (matches.length === 0) {
        return;
      }
      if (matches[0][0].startsWith("|") || matches[0][0].startsWith("&")) {
        return;
      }
      let result = this.evaluateExprToken(matches[0][0], env);
      for (let i = 1; i < matches.length; i++) {
        const parts = matches[i][0].split(/ +/);
        if (parts.length !== 2) {
          return;
        }
        const state = this.evaluateExprToken(parts[1], env);
        if (state === void 0) {
          return;
        }
        if (parts[0] === "||") {
          result = result || state;
        } else if (parts[0] === "&&") {
          result = result && state;
        } else {
          return;
        }
      }
      return result;
    }
    // This method returns an array of indices, corresponding to position in
    // the content string which should alternatively be parsed and discarded.
    static splitter(content, env = []) {
      const reIf = /^!#(if|else|endif)\b([^\n]*)(?:[\n\r]+|$)/gm;
      const stack = [];
      const parts = [0];
      let discard = false;
      const shouldDiscard = /* @__PURE__ */ __name(() => stack.some((v2) => v2.known && v2.discard), "shouldDiscard");
      const begif = /* @__PURE__ */ __name((details) => {
        if (discard === false && details.known && details.discard) {
          parts.push(details.pos);
          discard = true;
        }
        stack.push(details);
      }, "begif");
      const endif = /* @__PURE__ */ __name((match) => {
        stack.pop();
        const stopDiscard = shouldDiscard() === false;
        if (discard && stopDiscard) {
          parts.push(match.index + match[0].length);
          discard = false;
        }
      }, "endif");
      for (; ; ) {
        const match = reIf.exec(content);
        if (match === null) {
          break;
        }
        switch (match[1]) {
          case "if": {
            const result = this.evaluateExpr(match[2].trim(), env);
            begif({
              known: result !== void 0,
              discard: result === false,
              pos: match.index
            });
            break;
          }
          case "else": {
            if (stack.length === 0) {
              break;
            }
            const details = stack[stack.length - 1];
            endif(match);
            details.discard = details.discard === false;
            details.pos = match.index;
            begif(details);
            break;
          }
          case "endif": {
            endif(match);
            break;
          }
          default:
            break;
        }
      }
      parts.push(content.length);
      return parts;
    }
    static expandIncludes(parts, env = []) {
      const out = [];
      const reInclude = /^!#include +(\S+)[^\n\r]*(?:[\n\r]+|$)/gm;
      for (const part of parts) {
        if (typeof part === "string") {
          out.push(part);
          continue;
        }
        if (part instanceof Object === false) {
          continue;
        }
        const content = part.content;
        const slices = this.splitter(content, env);
        for (let i = 0, n = slices.length - 1; i < n; i++) {
          const slice = content.slice(slices[i + 0], slices[i + 1]);
          if ((i & 1) !== 0) {
            out.push(slice);
            continue;
          }
          let lastIndex = 0;
          for (; ; ) {
            const match = reInclude.exec(slice);
            if (match === null) {
              break;
            }
            if (toURL(match[1]) !== void 0) {
              continue;
            }
            if (match[1].indexOf("..") !== -1) {
              continue;
            }
            const pos = part.url.lastIndexOf("/");
            if (pos === -1) {
              continue;
            }
            const subURL = part.url.slice(0, pos + 1) + match[1].trim();
            out.push(
              slice.slice(lastIndex, match.index + match[0].length),
              `! >>>>>>>> ${subURL}
`,
              { url: subURL },
              `! <<<<<<<< ${subURL}
`
            );
            lastIndex = reInclude.lastIndex;
          }
          out.push(lastIndex === 0 ? slice : slice.slice(lastIndex));
        }
      }
      return out;
    }
    static prune(content, env) {
      const parts = this.splitter(content, env);
      const out = [];
      for (let i = 0, n = parts.length - 1; i < n; i += 2) {
        const beg = parts[i + 0];
        const end = parts[i + 1];
        out.push(content.slice(beg, end));
      }
      return out.join("\n");
    }
    static getHints() {
      const out = [];
      const vals = /* @__PURE__ */ new Set();
      for (const [key, val] of preparserTokens) {
        if (vals.has(val)) {
          continue;
        }
        vals.add(val);
        out.push(key);
      }
      return out;
    }
    static getTokens(env) {
      const out = /* @__PURE__ */ new Map();
      for (const [key, val] of preparserTokens) {
        out.set(key, val !== "false" && env.includes(val));
      }
      return Array.from(out);
    }
  }
  return {
    preparser
  };
})();

// ubo-src/js/tasks.js
function queueTask(func, timeout = 5e3) {
  if (typeof requestIdleCallback === "undefined") {
    return setTimeout(func, 1);
  }
  return requestIdleCallback(func, { timeout });
}
__name(queueTask, "queueTask");
function dropTask(id) {
  if (typeof cancelIdleCallback === "undefined") {
    return clearTimeout(id);
  }
  return cancelIdleCallback(id);
}
__name(dropTask, "dropTask");

// ubo-src/lib/regexanalyzer/regex.js
var regex_default = (function(root, name, factory) {
  "use strict";
  var __version__ = "1.2.0", PROTO = "prototype", OP = Object[PROTO], AP = Array[PROTO], Keys = Object.keys, to_string = OP.toString, HAS = OP.hasOwnProperty, fromCharCode = String.fromCharCode, fromCodePoint = String.fromCodePoint || String.fromCharCode, CHAR = "charAt", CHARCODE = "charCodeAt", CODEPOINT = String.prototype.codePointAt ? "codePointAt" : CHARCODE, toJSON = JSON.stringify, INF = Infinity, ESC = "\\", specialChars = {
    ".": "MatchAnyChar",
    "|": "MatchEither",
    "?": "MatchZeroOrOne",
    "*": "MatchZeroOrMore",
    "+": "MatchOneOrMore",
    "^": "MatchStart",
    "$": "MatchEnd",
    "{": "StartRepeats",
    "}": "EndRepeats",
    "(": "StartGroup",
    ")": "EndGroup",
    "[": "StartCharGroup",
    "]": "EndCharGroup"
  }, specialCharsEscaped = {
    "\\": "ESC",
    "/": "/",
    "0": "NULChar",
    "f": "FormFeed",
    "n": "LineFeed",
    "r": "CarriageReturn",
    "t": "HorizontalTab",
    "v": "VerticalTab",
    "b": "MatchWordBoundary",
    "B": "MatchNonWordBoundary",
    "s": "MatchSpaceChar",
    "S": "MatchNonSpaceChar",
    "w": "MatchWordChar",
    "W": "MatchNonWordChar",
    "d": "MatchDigitChar",
    "D": "MatchNonDigitChar"
  }, T_SEQUENCE = 1, T_ALTERNATION = 2, T_GROUP = 4, T_CHARGROUP = 8, T_QUANTIFIER = 16, T_UNICODECHAR = 32, T_HEXCHAR = 64, T_SPECIAL = 128, T_CHARS = 256, T_CHARRANGE = 512, T_STRING = 1024, T_COMMENT = 2048;
  function is_array(x2) {
    return x2 instanceof Array || "[object Array]" === to_string.call(x2);
  }
  __name(is_array, "is_array");
  function is_string(x2) {
    return x2 instanceof String || "[object String]" === to_string.call(x2);
  }
  __name(is_string, "is_string");
  function is_regexp(x2) {
    return x2 instanceof RegExp || "[object RegExp]" === to_string.call(x2);
  }
  __name(is_regexp, "is_regexp");
  function array(x2) {
    return is_array(x2) ? x2 : [x2];
  }
  __name(array, "array");
  function clone(obj, cloned) {
    cloned = cloned || {};
    for (var p in obj) if (HAS.call(obj, p)) cloned[p] = obj[p];
    return cloned;
  }
  __name(clone, "clone");
  function RE_OBJ(re2, flags, flavor) {
    var self2 = this;
    self2.re = re2;
    self2.flags = flags;
    self2.flavor = flavor;
    self2.len = re2.length;
    self2.pos = 0;
    self2.index = 0;
    self2.groupIndex = 0;
    self2.group = {};
    self2.inGroup = 0;
  }
  __name(RE_OBJ, "RE_OBJ");
  RE_OBJ[PROTO] = {
    constructor: RE_OBJ,
    re: null,
    flags: null,
    flavor: "",
    len: null,
    pos: null,
    index: null,
    groupIndex: null,
    inGroup: null,
    groups: null,
    dispose: /* @__PURE__ */ __name(function() {
      var self2 = this;
      self2.re = null;
      self2.flags = null;
      self2.flavor = null;
      self2.len = null;
      self2.pos = null;
      self2.index = null;
      self2.groupIndex = null;
      self2.group = null;
      self2.inGroup = null;
    }, "dispose")
  };
  function Node(type, value, flags) {
    var self2 = this;
    if (!(self2 instanceof Node)) return new Node(type, value, flags);
    self2.type = type;
    self2.val = value;
    self2.flags = flags || {};
    switch (type) {
      case T_SEQUENCE:
        self2.typeName = "Sequence";
        break;
      case T_ALTERNATION:
        self2.typeName = "Alternation";
        break;
      case T_GROUP:
        self2.typeName = "Group";
        break;
      case T_CHARGROUP:
        self2.typeName = "CharacterGroup";
        break;
      case T_CHARS:
        self2.typeName = "Characters";
        break;
      case T_CHARRANGE:
        self2.typeName = "CharacterRange";
        break;
      case T_STRING:
        self2.typeName = "String";
        break;
      case T_QUANTIFIER:
        self2.typeName = "Quantifier";
        break;
      case T_UNICODECHAR:
        self2.typeName = "UnicodeChar";
        break;
      case T_HEXCHAR:
        self2.typeName = "HexChar";
        break;
      case T_SPECIAL:
        self2.typeName = "Special";
        break;
      case T_COMMENT:
        self2.typeName = "Comment";
        break;
      default:
        self2.typeName = "unspecified";
        break;
    }
  }
  __name(Node, "Node");
  ;
  Node.toObjectStatic = /* @__PURE__ */ __name(function toObject(v2) {
    if (v2 instanceof Node) {
      return v2.flags && Object.keys(v2.flags).length ? {
        type: v2.typeName,
        value: toObject(v2.val),
        flags: v2.flags
      } : {
        type: v2.typeName,
        value: toObject(v2.val)
      };
    } else if (is_array(v2)) {
      return v2.map(toObject);
    }
    return v2;
  }, "toObject");
  Node[PROTO] = {
    constructor: Node,
    type: null,
    typeName: null,
    val: null,
    flags: null,
    dispose: /* @__PURE__ */ __name(function() {
      var self2 = this;
      self2.val = null;
      self2.flags = null;
      self2.type = null;
      self2.typeName = null;
      return self2;
    }, "dispose"),
    toObject: /* @__PURE__ */ __name(function() {
      return Node.toObjectStatic(this);
    }, "toObject")
  };
  var rnd = /* @__PURE__ */ __name(function(a, b2) {
    return Math.round((b2 - a) * Math.random() + a);
  }, "rnd"), RE = /* @__PURE__ */ __name(function(re2, fl2) {
    return new RegExp(re2, fl2 || "");
  }, "RE"), slice = /* @__PURE__ */ __name(function(a) {
    return AP.slice.apply(a, AP.slice.call(arguments, 1));
  }, "slice"), flatten = /* @__PURE__ */ __name(function(a) {
    var r = [], i = 0;
    while (i < a.length) r = r.concat(a[i++]);
    return r;
  }, "flatten"), getArgs = /* @__PURE__ */ __name(function(args, asArray) {
    return flatten(slice(args));
  }, "getArgs"), esc_re = /* @__PURE__ */ __name(function(s, esc, chargroup2) {
    var es2 = "", l = s.length, i = 0, c;
    if (chargroup2) {
      while (i < l) {
        c = s[CHAR](i++);
        es2 += /*('?' === c) || ('*' === c) || ('+' === c) ||*/
        ("-" === c || /*('.' === c) ||*/
        "^" === c || "$" === c || "|" === c || "{" === c || "}" === c || "(" === c || ")" === c || "[" === c || "]" === c || "/" === c || esc === c ? esc : "") + c;
      }
    } else {
      while (i < l) {
        c = s[CHAR](i++);
        es2 += ("?" === c || "*" === c || "+" === c || /*('-' === c) ||*/
        "." === c || "^" === c || "$" === c || "|" === c || "{" === c || "}" === c || "(" === c || ")" === c || "[" === c || "]" === c || "/" === c || esc === c ? esc : "") + c;
      }
    }
    return es2;
  }, "esc_re"), pad = /* @__PURE__ */ __name(function(s, n, z) {
    var ps2 = String(s);
    z = z || "0";
    while (ps2.length < n) ps2 = z + ps2;
    return ps2;
  }, "pad"), char_code = /* @__PURE__ */ __name(function(c) {
    return c[CODEPOINT](0);
  }, "char_code"), char_code_range = /* @__PURE__ */ __name(function(s) {
    return [s[CODEPOINT](0), s[CODEPOINT](s.length - 1)];
  }, "char_code_range"), character_range = /* @__PURE__ */ __name(function(first, last) {
    if (first && is_array(first)) {
      last = first[1];
      first = first[0];
    }
    var ch2, chars, start = first[CODEPOINT](0), end = last[CODEPOINT](0);
    if (end === start) return [fromCodePoint(start)];
    chars = [];
    for (ch2 = start; ch2 <= end; ++ch2) chars.push(fromCodePoint(ch2));
    return chars;
  }, "character_range"), concat = /* @__PURE__ */ __name(function(p1, p2) {
    if (p2) {
      var p, l;
      if (is_array(p2)) {
        for (p = 0, l = p2.length; p < l; ++p) p1[p2[p]] = 1;
      } else {
        for (p in p2) if (HAS.call(p2, p)) p1[p] = 1;
      }
    }
    return p1;
  }, "concat"), BSPACES = "\r\n", SPACES = " 	\v", PUNCTS = "~!@#$%^&*()-+=[]{}\\|;:,./<>?", DIGITS = "0123456789", DIGITS_RANGE = char_code_range(DIGITS), HEXDIGITS_RANGES = [DIGITS_RANGE, [char_code("a"), char_code("f")], [char_code("A"), char_code("F")]], ALPHAS = "_" + character_range("a", "z").join("") + character_range("A", "Z").join(""), ALL = SPACES + PUNCTS + DIGITS + ALPHAS, ALL_ARY = ALL.split(""), match_chars = /* @__PURE__ */ __name(function(CHARS, s, pos, minlen, maxlen) {
    pos = pos || 0;
    minlen = minlen || 1;
    maxlen = maxlen || INF;
    var lp2 = pos, l = 0, sl2 = s.length, ch2;
    while (lp2 < sl2 && l <= maxlen && -1 < CHARS.indexOf(ch2 = s[CHAR](lp2))) {
      ++lp2;
      ++l;
    }
    return l >= minlen ? l : false;
  }, "match_chars"), match_char_range = /* @__PURE__ */ __name(function(RANGE, s, pos, minlen, maxlen) {
    pos = pos || 0;
    minlen = minlen || 1;
    maxlen = maxlen || INF;
    var lp2 = pos, l = 0, sl2 = s.length, ch2;
    while (lp2 < sl2 && l <= maxlen && ((ch2 = s[CHARCODE](lp2)) >= RANGE[0] && ch2 <= RANGE[1])) {
      ++lp2;
      ++l;
    }
    return l >= minlen ? l : false;
  }, "match_char_range"), match_char_ranges = /* @__PURE__ */ __name(function(RANGES, s, pos, minlen, maxlen) {
    pos = pos || 0;
    minlen = minlen || 1;
    maxlen = maxlen || INF;
    var lp2 = pos, l = 0, sl2 = s.length, ch2, i, Rl2 = RANGES.length, RANGE, found = true;
    while (lp2 < sl2 && l <= maxlen && found) {
      ch2 = s[CHARCODE](lp2);
      found = false;
      for (i = 0; i < Rl2; ++i) {
        RANGE = RANGES[i];
        if (ch2 >= RANGE[0] && ch2 <= RANGE[1]) {
          ++lp2;
          ++l;
          found = true;
          break;
        }
      }
    }
    return l >= minlen ? l : false;
  }, "match_char_ranges"), punct = /* @__PURE__ */ __name(function() {
    return PUNCTS[CHAR](rnd(0, PUNCTS.length - 1));
  }, "punct"), space = /* @__PURE__ */ __name(function(positive) {
    return false !== positive ? SPACES[CHAR](rnd(0, SPACES.length - 1)) : (punct() + digit() + alpha())[CHAR](rnd(0, 2));
  }, "space"), digit = /* @__PURE__ */ __name(function(positive) {
    return false !== positive ? DIGITS[CHAR](rnd(0, DIGITS.length - 1)) : (punct() + space() + alpha())[CHAR](rnd(0, 2));
  }, "digit"), alpha = /* @__PURE__ */ __name(function(positive) {
    return false !== positive ? ALPHAS[CHAR](rnd(0, ALPHAS.length - 1)) : (punct() + space() + digit())[CHAR](rnd(0, 2));
  }, "alpha"), word = /* @__PURE__ */ __name(function(positive) {
    return false !== positive ? (ALPHAS + DIGITS)[CHAR](rnd(0, ALPHAS.length + DIGITS.length - 1)) : (punct() + space())[CHAR](rnd(0, 1));
  }, "word"), any = /* @__PURE__ */ __name(function() {
    return ALL[CHAR](rnd(0, ALL.length - 1));
  }, "any"), character = /* @__PURE__ */ __name(function(chars, positive) {
    if (false !== positive) return chars.length ? chars[rnd(0, chars.length - 1)] : "";
    var choices = ALL_ARY.filter(function(c) {
      return 0 > chars.indexOf(c);
    });
    return choices.length ? choices[rnd(0, choices.length - 1)] : "";
  }, "character"), random_upper_or_lower = /* @__PURE__ */ __name(function(c) {
    return 0.5 < Math.random() ? c.toLowerCase() : c.toUpperCase();
  }, "random_upper_or_lower"), case_insensitive = /* @__PURE__ */ __name(function(chars, asArray) {
    if (asArray) {
      if (chars[CHAR]) chars = chars.split("");
      chars = chars.map(random_upper_or_lower);
      return chars;
    } else {
      return random_upper_or_lower(chars);
    }
  }, "case_insensitive"), walk = /* @__PURE__ */ __name(function walk2(ret, node, state) {
    if (null == node || !state) return ret;
    var i, l, r, type = node instanceof Node ? node.type : null;
    if (null === type) {
      ret = state.reduce(ret, node, state);
    } else if (state.IGNORE & type) {
    } else if (state.MAP & type) {
      r = state.map(ret, node, state);
      if (null != state.ret) {
        ret = state.reduce(ret, node, state);
        state.ret = null;
      } else if (null != r) {
        r = array(r);
        for (i = 0, l = r ? r.length : 0; i < l; ++i) {
          state.node = node;
          ret = walk2(ret, r[i], state);
          if (state.stop) {
            state.stop = null;
            return ret;
          }
        }
      }
    } else if (state.REDUCE & type) {
      ret = state.reduce(ret, node, state);
    }
    state.node = null;
    return ret;
  }, "walk"), map_src = /* @__PURE__ */ __name(function map_src2(ret, node, state) {
    var type = node.type;
    if (T_ALTERNATION === type) {
      var r = [];
      for (var i = 0, l = node.val.length - 1; i < l; ++i) r.push(node.val[i], "|");
      r.push(node.val[l]);
      return r;
    } else if (T_CHARGROUP === type) {
      return [].concat("[" + (node.flags.NegativeMatch ? "^" : "")).concat(array(node.val)).concat("]");
    } else if (T_QUANTIFIER === type) {
      var q2 = "";
      if (node.flags.MatchZeroOrOne) q2 = "?";
      else if (node.flags.MatchZeroOrMore) q2 = "*";
      else if (node.flags.MatchOneOrMore) q2 = "+";
      else q2 = node.flags.min === node.flags.max ? "{" + node.flags.min + "}" : "{" + node.flags.min + "," + (-1 === node.flags.max ? "" : node.flags.max) + "}";
      if (node.flags.min !== node.flags.max && !node.flags.isGreedy) q2 += "?";
      return [].concat(array(node.val)).concat(q2);
    } else if (T_GROUP === type) {
      var g3 = null;
      if (node.flags.NotCaptured) {
        g3 = [].concat("(?:").concat(array(node.val)).concat(")");
      } else if (node.flags.LookAhead) {
        g3 = [].concat("(?=").concat(array(node.val)).concat(")");
      } else if (node.flags.NegativeLookAhead) {
        g3 = [].concat("(?!").concat(array(node.val)).concat(")");
      } else if (node.flags.LookBehind) {
        g3 = [].concat("(?<=").concat(array(node.val)).concat(")");
      } else if (node.flags.NegativeLookBehind) {
        g3 = [].concat("(?<!").concat(array(node.val)).concat(")");
      } else if (node.flags.NamedGroup && !state.compatibility) {
        g3 = [].concat("(?<" + node.flags.GroupName + ">").concat(array(node.val)).concat(")");
      } else {
        g3 = [].concat("(").concat(array(node.val)).concat(")");
      }
      if (null != node.flags.GroupIndex) {
        ret.group[node.flags.GroupIndex] = node.flags.GroupIndex;
        if (node.flags.GroupName) ret.group[node.flags.GroupName] = node.flags.GroupIndex;
      }
      return g3;
    }
    return node.val;
  }, "map_src"), map_any = /* @__PURE__ */ __name(function map_any2(ret, node, state) {
    var type = node.type;
    if (T_ALTERNATION === type || T_CHARGROUP === type) {
      return node.val.length ? node.val[rnd(0, node.val.length - 1)] : null;
    } else if (T_QUANTIFIER === type) {
      var numrepeats, mmin, mmax, repeats;
      if (ret.length >= state.maxLength) {
        numrepeats = node.flags.min;
      } else {
        mmin = node.flags.min;
        mmax = -1 === node.flags.max ? mmin + 1 + 2 * state.maxLength : node.flags.max;
        numrepeats = rnd(mmin, mmax);
      }
      if (numrepeats) {
        repeats = new Array(numrepeats);
        for (var i = 0; i < numrepeats; ++i) repeats[i] = node.val;
        return repeats;
      } else {
        return null;
      }
    } else if (T_GROUP === type && node.flags.GroupIndex) {
      var sample = walk("", node.val, state);
      state.group[node.flags.GroupIndex] = sample;
      state.ret = sample;
      return null;
    } else {
      return node.val;
    }
  }, "map_any"), map_min = /* @__PURE__ */ __name(function map_min2(ret, node, state) {
    var type = node.type;
    if (T_ALTERNATION === type) {
      var i, l = node.val.length, cur, min = l ? walk(0, node.val[0], state) : 0;
      for (i = 1; i < l; ++i) {
        cur = walk(0, node.val[i], state);
        if (cur < min) min = cur;
      }
      if (l) state.ret = min;
      return null;
    } else if (T_CHARGROUP === type) {
      return node.val.length ? node.val[0] : null;
    } else if (T_QUANTIFIER === type) {
      if (0 === node.flags.min) return null;
      var i, nrepeats = node.flags.min, repeats = new Array(nrepeats);
      for (i = 0; i < nrepeats; ++i) repeats[i] = node.val;
      return repeats;
    } else if (T_GROUP === type && node.flags.GroupIndex) {
      var min = walk(0, node.val, state);
      state.group[node.flags.GroupIndex] = min;
      state.ret = min;
      return null;
    } else {
      return node.val;
    }
  }, "map_min"), map_max = /* @__PURE__ */ __name(function map_max2(ret, node, state) {
    var type = node.type;
    if (T_ALTERNATION === type) {
      var i, l = node.val.length, cur, max = l ? walk(0, node.val[0], state) : 0;
      if (-1 !== max) {
        for (i = 1; i < l; ++i) {
          cur = walk(0, node.val[i], state);
          if (-1 === cur) {
            max = -1;
            break;
          } else if (cur > max) {
            max = cur;
          }
        }
      }
      if (l) state.ret = max;
      return null;
    } else if (T_CHARGROUP === type) {
      return node.val.length ? node.val[0] : null;
    } else if (T_QUANTIFIER === type) {
      max = walk(0, node.val, state);
      if (-1 === max) {
        state.ret = -1;
      } else if (0 < max) {
        if (-1 === node.flags.max) {
          state.ret = -1;
        } else if (0 < node.flags.max) {
          state.ret = node.flags.max * max;
        } else {
          state.ret = max;
        }
      }
      return null;
    } else if (T_GROUP === type && node.flags.GroupIndex) {
      var max = walk(0, node.val, state);
      state.group[node.flags.GroupIndex] = max;
      state.ret = max;
      return null;
    } else {
      return node.val;
    }
  }, "map_max"), map_1st = /* @__PURE__ */ __name(function map_1st2(ret, node, state) {
    var type = node.type;
    if (T_SEQUENCE === type) {
      var seq = [], i = 0, l = node.val.length, n;
      for (i = 0; i < l; ++i) {
        n = node.val[i];
        seq.push(n);
        if (T_QUANTIFIER === n.type && 0 === n.flags.min)
          continue;
        else if (T_SPECIAL === n.type && (n.flags.MatchStart || n.flags.MatchEnd))
          continue;
        break;
      }
      return seq.length ? seq : null;
    } else {
      return node.val;
    }
  }, "map_1st"), reduce_len = /* @__PURE__ */ __name(function reduce_len2(ret, node, state) {
    if (null != state.ret) {
      if (-1 === state.ret) ret = -1;
      else ret += state.ret;
      return ret;
    }
    if (-1 === ret) return ret;
    if (node === +node) {
      ret += node;
      return ret;
    }
    if (T_SPECIAL === node.type && node.flags.MatchEnd) {
      state.stop = 1;
      return ret;
    }
    var type = node.type;
    if (T_CHARS === type || T_CHARRANGE === type || T_UNICODECHAR === type || T_HEXCHAR === type || T_SPECIAL === type && !node.flags.MatchStart && !node.flags.MatchEnd) {
      ret += node.flags.BackReference ? state.group[node.flags.GroupIndex] || 0 : 1;
    } else if (T_STRING === type) {
      ret += node.val.length;
    }
    return ret;
  }, "reduce_len"), reduce_str = /* @__PURE__ */ __name(function reduce_str2(ret, node, state) {
    if (null != state.ret) {
      ret += state.ret;
      return ret;
    }
    if (is_string(node)) {
      ret += node;
      return ret;
    }
    if (T_SPECIAL === node.type && node.flags.MatchEnd) {
      state.stop = 1;
      return ret;
    }
    var type = node.type, sample = null;
    if (T_CHARS === type) {
      sample = node.val;
    } else if (T_CHARRANGE === type) {
      var range = [node.val[0], node.val[1]];
      if (T_UNICODECHAR === range[0].type || T_HEXCHAR === range[0].type) range[0] = range[0].flags.Char;
      if (T_UNICODECHAR === range[1].type || T_HEXCHAR === range[1].type) range[1] = range[1].flags.Char;
      sample = character_range(range);
    } else if (T_UNICODECHAR === type || T_HEXCHAR === type) {
      sample = [node.flags.Char];
    } else if (T_SPECIAL === type && !node.flags.MatchStart && !node.flags.MatchEnd) {
      var part = node.val;
      if (node.flags.BackReference) {
        part = node.flags.GroupIndex;
        ret += HAS.call(state.group, part) ? state.group[part] : "";
        return ret;
      } else if ("D" === part) {
        sample = [digit(false)];
      } else if ("W" === part) {
        sample = [word(false)];
      } else if ("S" === part) {
        sample = [space(false)];
      } else if ("d" === part) {
        sample = [digit()];
      } else if ("w" === part) {
        sample = [word()];
      } else if ("s" === part) {
        sample = [space()];
      } else if ("." === part && node.flags.MatchAnyChar) {
        sample = [any()];
      } else {
        sample = [ESC + part];
      }
    } else if (T_STRING === type) {
      sample = node.val;
    }
    if (sample) {
      ret += T_STRING === type ? state.isCaseInsensitive ? case_insensitive(sample) : sample : character(state.isCaseInsensitive ? case_insensitive(sample, true) : sample, !state.node || !state.node.flags.NegativeMatch);
    }
    return ret;
  }, "reduce_str"), reduce_src = /* @__PURE__ */ __name(function reduce_src2(ret, node, state) {
    if (null != state.ret) {
      if (state.ret.src) ret.src += state.ret.src;
      if (state.ret.group) ret.group = clone(state.ret.group, ret.group);
      return ret;
    }
    if (is_string(node)) {
      ret.src += node;
      return ret;
    }
    var type = node.type;
    if (T_CHARS === type) {
      ret.src += state.escaped ? esc_re(node.val.join(""), ESC, 1) : node.val.join("");
    } else if (T_CHARRANGE === type) {
      var range = [node.val[0], node.val[1]];
      if (state.escaped) {
        if (T_UNICODECHAR === range[0].type) range[0] = range[0].flags.UnicodePoint ? ESC + "u{" + range[0].flags.Code + "}" : ESC + "u" + pad(range[0].flags.Code, 4);
        else if (T_HEXCHAR === range[0].type) range[0] = ESC + "x" + pad(range[0].flags.Code, 2);
        else range[0] = esc_re(range[0], ESC, 1);
        if (T_UNICODECHAR === range[1].type) range[1] = range[1].flags.UnicodePoint ? ESC + "u{" + range[1].flags.Code + "}" : ESC + "u" + pad(range[1].flags.Code, 4);
        else if (T_HEXCHAR === range[1].type) range[1] = ESC + "x" + pad(range[1].flags.Code, 2);
        else range[1] = esc_re(range[1], ESC, 1);
      } else {
        if (T_UNICODECHAR === range[0].type || T_HEXCHAR === range[0].type) range[0] = range[0].flags.Char;
        if (T_UNICODECHAR === range[1].type || T_HEXCHAR === range[1].type) range[1] = range[1].flags.Char;
      }
      ret.src += range[0] + "-" + range[1];
    } else if (T_UNICODECHAR === type) {
      ret.src += node.flags.UnicodePoint ? ESC + "u{" + node.flags.Code + "}" : state.escaped ? ESC + "u" + pad(node.flags.Code, 4) : node.flags.Char;
    } else if (T_HEXCHAR === type) {
      ret.src += state.escaped ? ESC + "x" + pad(node.flags.Code, 2) : node.flags.Char;
    } else if (T_SPECIAL === type) {
      if (node.flags.BackReference) {
        if (state.compatibility || node.flags.GroupIndex === node.flags.GroupName) {
          ret.src += ESC + node.flags.GroupIndex;
        } else {
          ret.src += ESC + "k<" + node.flags.GroupName + ">";
        }
      } else {
        ret.src += node.flags.MatchAnyChar || node.flags.MatchStart || node.flags.MatchEnd ? "" + node.val : ESC + node.val;
      }
    } else if (T_STRING === type) {
      ret.src += state.escaped ? esc_re(node.val, ESC) : node.val;
    }
    return ret;
  }, "reduce_src"), reduce_peek = /* @__PURE__ */ __name(function reduce_peek2(ret, node, state) {
    if (null != state.ret) {
      ret.positive = concat(ret.positive, state.ret.positive);
      ret.negative = concat(ret.negative, state.ret.negative);
      return ret;
    }
    if (T_SPECIAL === node.type && node.flags.MatchEnd) {
      state.stop = 1;
      return ret;
    }
    var type = node.type, inCharGroup = state.node && T_CHARGROUP === state.node.type, inNegativeCharGroup = inCharGroup && state.node.flags.NegativeMatch, peek = inNegativeCharGroup ? "negative" : "positive";
    if (T_CHARS === type) {
      ret[peek] = concat(ret[peek], node.val);
    } else if (T_CHARRANGE === type) {
      var range = [node.val[0], node.val[1]];
      if (T_UNICODECHAR === range[0].type || T_HEXCHAR === range[0].type) range[0] = range[0].flags.Char;
      if (T_UNICODECHAR === range[1].type || T_HEXCHAR === range[1].type) range[1] = range[1].flags.Char;
      ret[peek] = concat(ret[peek], character_range(range));
    } else if (T_UNICODECHAR === type || T_HEXCHAR === type) {
      ret[peek][node.flags.Char] = 1;
    } else if (T_SPECIAL === type && !node.flags.BackReference && !node.flags.MatchStart && !node.flags.MatchEnd) {
      var part = node.val;
      if ("D" === part) {
        ret[inNegativeCharGroup ? "positive" : "negative"]["\\d"] = 1;
      } else if ("W" === part) {
        ret[inNegativeCharGroup ? "positive" : "negative"]["\\w"] = 1;
      } else if ("S" === part) {
        ret[inNegativeCharGroup ? "positive" : "negative"]["\\s"] = 1;
      } else if ("B" === part) {
        ret[inNegativeCharGroup ? "positive" : "negative"]["\\b"] = 1;
      } else {
        ret[peek][ESC + part] = 1;
      }
    } else if (T_STRING === type) {
      ret["positive"][node.val[CHAR](0)] = 1;
    }
    return ret;
  }, "reduce_peek"), match_hex = /* @__PURE__ */ __name(function(s) {
    var m = false;
    if (s.length > 2 && "x" === s[CHAR](0)) {
      if (match_char_ranges(HEXDIGITS_RANGES, s, 1, 2, 2)) return [m = s.slice(0, 3), m.slice(1)];
    }
    return false;
  }, "match_hex"), match_unicode = /* @__PURE__ */ __name(function(s, flags) {
    var m = false, l;
    if (s.length > 3 && "u" === s[CHAR](0)) {
      if (flags.u && "{" === s[CHAR](1) && (l = match_char_ranges(HEXDIGITS_RANGES, s, 2, 1, 6)) && "}" === s[CHAR](l + 2)) {
        return [m = s.slice(0, l + 3), m.slice(2, -1), 1];
      } else if (l = match_char_ranges(HEXDIGITS_RANGES, s, 1, 4, 4)) {
        return [m = s.slice(0, l + 1), m.slice(1), 0];
      }
    }
    return false;
  }, "match_unicode"), match_repeats = /* @__PURE__ */ __name(function(s) {
    var l, sl2 = s.length, pos = 0, m = false, hasComma = false;
    if (sl2 > 2 && "{" === s[CHAR](pos)) {
      m = ["", "", null];
      ++pos;
      if (l = match_chars(SPACES, s, pos)) pos += l;
      if (l = match_char_range(DIGITS_RANGE, s, pos)) {
        m[1] = s.slice(pos, pos + l);
        pos += l;
      } else {
        return false;
      }
      if (l = match_chars(SPACES, s, pos)) pos += l;
      if (pos < sl2 && "," === s[CHAR](pos)) {
        pos += 1;
        hasComma = true;
      }
      if (l = match_chars(SPACES, s, pos)) pos += l;
      if (l = match_char_range(DIGITS_RANGE, s, pos)) {
        m[2] = s.slice(pos, pos + l);
        pos += l;
      }
      if (l = match_chars(SPACES, s, pos)) pos += l;
      if (pos < sl2 && "}" === s[CHAR](pos)) {
        pos++;
        m[0] = s.slice(0, pos);
        if (!hasComma) m[2] = m[1];
        return m;
      } else {
        return false;
      }
    }
    return false;
  }, "match_repeats"), chargroup = /* @__PURE__ */ __name(function chargroup2(re_obj) {
    var sequence = [], chars = [], allchars = [], flags = {}, flag, ch2, lre, prevch = null, range, isRange = false, m, isUnicode, isHex, isSpecial, escaped = false;
    if ("^" === re_obj.re[CHAR](re_obj.pos)) {
      flags["NegativeMatch"] = 1;
      ++re_obj.pos;
    }
    lre = re_obj.len;
    while (re_obj.pos < lre) {
      isUnicode = false;
      isHex = false;
      isSpecial = false;
      m = null;
      prevch = ch2;
      ch2 = re_obj.re[CHAR](re_obj.pos++);
      escaped = ESC === ch2;
      if (escaped) ch2 = re_obj.re[CHAR](re_obj.pos++);
      if (escaped) {
        if ("u" === ch2) {
          m = match_unicode(re_obj.re.substr(re_obj.pos - 1), re_obj.flags);
          if (m) {
            re_obj.pos += m[0].length - 1;
            ch2 = Node(T_UNICODECHAR, m[0], { "Char": m[2] ? fromCodePoint(parseInt(m[1], 16)) : fromCharCode(parseInt(m[1], 16)), "Code": m[1], "UnicodePoint": !!m[2] });
            isUnicode = true;
            isHex = false;
          }
        } else if ("x" === ch2) {
          m = match_hex(re_obj.re.substr(re_obj.pos - 1));
          if (m) {
            re_obj.pos += m[0].length - 1;
            ch2 = Node(T_HEXCHAR, m[0], { "Char": fromCharCode(parseInt(m[1], 16)), "Code": m[1] });
            isUnicode = true;
            isHex = true;
          }
        } else if (HAS.call(specialCharsEscaped, ch2) && "/" !== ch2) {
          isSpecial = true;
          flag = {};
          flag[specialCharsEscaped[ch2]] = 1;
          ch2 = Node(T_SPECIAL, ch2, flag);
        }
      }
      if (isRange) {
        if (ch2 instanceof Node && ch2.type === T_SPECIAL && -1 !== ["s", "S", "d", "D", "w", "W"].indexOf(ch2.val)) {
          if (range[0] instanceof Node) {
            sequence.push(range[0]);
          } else {
            chars.push(range[0]);
          }
          chars.push("-");
          sequence.push(ch2);
        } else {
          if (chars.length) {
            allchars = allchars.concat(chars);
            chars = [];
          }
          range[1] = ch2;
          sequence.push(Node(T_CHARRANGE, range));
        }
        isRange = false;
      } else {
        if (escaped) {
          if (isUnicode) {
            if (chars.length) {
              allchars = allchars.concat(chars);
              chars = [];
            }
            sequence.push(ch2);
          } else if (isSpecial) {
            if (chars.length) {
              allchars = allchars.concat(chars);
              chars = [];
            }
            sequence.push(ch2);
          } else {
            chars.push(ch2);
          }
        } else {
          if ("]" === ch2) {
            if (chars.length) {
              allchars = allchars.concat(chars);
              chars = [];
            }
            if (allchars.length) sequence.push(Node(T_CHARS, allchars));
            return Node(T_CHARGROUP, sequence, flags);
          } else if ("-" === ch2) {
            if (null == prevch || "]" === re_obj.re[CHAR](re_obj.pos) || prevch instanceof Node && prevch.type === T_SPECIAL && -1 !== ["s", "S", "d", "D", "w", "W"].indexOf(prevch.val)) {
              chars.push(ch2);
            } else {
              range = [prevch, ""];
              if (prevch instanceof Node) sequence.pop();
              else chars.pop();
              isRange = true;
            }
          } else {
            chars.push(ch2);
          }
        }
      }
    }
    if (chars.length) {
      allchars = allchars.concat(chars);
      chars = [];
    }
    if (allchars.length) sequence.push(Node(T_CHARS, allchars));
    return Node(T_CHARGROUP, sequence, flags);
  }, "chargroup"), analyze_re = /* @__PURE__ */ __name(function analyze_re2(re_obj) {
    var lre, ch2, m, word2 = "", wordlen = 0, alternation = [], sequence = [], flags = {}, flag, escaped = false, pre, pre3, captured;
    if (re_obj.inGroup > 0) {
      pre = re_obj.re.substr(re_obj.pos, 2);
      pre3 = re_obj.re.substr(re_obj.pos, 3);
      captured = 1;
      if ("?P=" === pre3) {
        flags["BackReference"] = 1;
        flags["GroupName"] = "";
        re_obj.pos += 3;
        lre = re_obj.len;
        while (re_obj.pos < lre) {
          ch2 = re_obj.re[CHAR](re_obj.pos++);
          if (")" === ch2) break;
          flags["GroupName"] += ch2;
        }
        flags["GroupIndex"] = HAS.call(re_obj.group, flags["GroupName"]) ? re_obj.group[flags["GroupName"]] : null;
        return Node(T_SPECIAL, flags["GroupName"], flags);
      } else if ("?#" === pre) {
        flags["Comment"] = 1;
        re_obj.pos += 2;
        word2 = "";
        lre = re_obj.len;
        while (re_obj.pos < lre) {
          ch2 = re_obj.re[CHAR](re_obj.pos++);
          if (")" === ch2) break;
          word2 += ch2;
        }
        return Node(T_COMMENT, word2);
      } else if ("?:" === pre) {
        flags["NotCaptured"] = 1;
        re_obj.pos += 2;
        captured = 0;
      } else if ("?=" === pre) {
        flags["LookAhead"] = 1;
        re_obj.pos += 2;
        captured = 0;
      } else if ("?!" === pre) {
        flags["NegativeLookAhead"] = 1;
        re_obj.pos += 2;
        captured = 0;
      } else if ("?<=" === pre3) {
        flags["LookBehind"] = 1;
        re_obj.pos += 3;
        captured = 0;
      } else if ("?<!" === pre3) {
        flags["NegativeLookBehind"] = 1;
        re_obj.pos += 3;
        captured = 0;
      } else if ("?<" === pre || "?P<" === pre3) {
        flags["NamedGroup"] = 1;
        flags["GroupName"] = "";
        re_obj.pos += "?<" === pre ? 2 : 3;
        lre = re_obj.len;
        while (re_obj.pos < lre) {
          ch2 = re_obj.re[CHAR](re_obj.pos++);
          if (">" === ch2) break;
          flags["GroupName"] += ch2;
        }
      }
      ++re_obj.index;
      if (captured) {
        ++re_obj.groupIndex;
        flags["GroupIndex"] = re_obj.groupIndex;
        re_obj.group[flags["GroupIndex"]] = flags["GroupIndex"];
        if (flags["GroupName"]) re_obj.group[flags["GroupName"]] = flags["GroupIndex"];
      }
    }
    lre = re_obj.len;
    while (re_obj.pos < lre) {
      ch2 = re_obj.re[CHAR](re_obj.pos++);
      escaped = ESC === ch2;
      if (escaped) ch2 = re_obj.re[CHAR](re_obj.pos++);
      if (escaped) {
        if ("u" === ch2) {
          m = match_unicode(re_obj.re.substr(re_obj.pos - 1), re_obj.flags);
          if (m) {
            if (wordlen) {
              sequence.push(Node(T_STRING, word2));
              word2 = "";
              wordlen = 0;
            }
            re_obj.pos += m[0].length - 1;
            sequence.push(Node(T_UNICODECHAR, m[0], { "Char": m[2] ? fromCodePoint(parseInt(m[1], 16)) : fromCharCode(parseInt(m[1], 16)), "Code": m[1], "UnicodePoint": !!m[2] }));
          } else {
            word2 += ch2;
            wordlen += 1;
          }
        } else if ("x" === ch2) {
          m = match_hex(re_obj.re.substr(re_obj.pos - 1));
          if (m) {
            if (wordlen) {
              sequence.push(Node(T_STRING, word2));
              word2 = "";
              wordlen = 0;
            }
            re_obj.pos += m[0].length - 1;
            sequence.push(Node(T_HEXCHAR, m[0], { "Char": fromCharCode(parseInt(m[1], 16)), "Code": m[1] }));
          } else {
            word2 += ch2;
            wordlen += 1;
          }
        } else if ("k" === ch2 && "<" === re_obj.re[CHAR](re_obj.pos)) {
          if (wordlen) {
            sequence.push(Node(T_STRING, word2));
            word2 = "";
            wordlen = 0;
          }
          re_obj.pos++;
          word2 = "";
          while (re_obj.pos < lre) {
            ch2 = re_obj.re[CHAR](re_obj.pos);
            if (">" === ch2) {
              re_obj.pos++;
              break;
            } else {
              word2 += ch2;
              re_obj.pos++;
            }
          }
          flag = {};
          flag["BackReference"] = 1;
          flag["GroupName"] = word2;
          flag["GroupIndex"] = HAS.call(re_obj.group, word2) ? re_obj.group[word2] : null;
          sequence.push(Node(T_SPECIAL, word2, flag));
          word2 = "";
        } else if (HAS.call(specialCharsEscaped, ch2) && "/" !== ch2) {
          if (wordlen) {
            sequence.push(Node(T_STRING, word2));
            word2 = "";
            wordlen = 0;
          }
          flag = {};
          flag[specialCharsEscaped[ch2]] = 1;
          sequence.push(Node(T_SPECIAL, ch2, flag));
        } else if ("1" <= ch2 && "9" >= ch2) {
          if (wordlen) {
            sequence.push(Node(T_STRING, word2));
            word2 = "";
            wordlen = 0;
          }
          word2 = ch2;
          while (re_obj.pos < lre) {
            ch2 = re_obj.re[CHAR](re_obj.pos);
            if ("0" <= ch2 && "9" >= ch2) {
              word2 += ch2;
              re_obj.pos++;
            } else break;
          }
          flag = {};
          flag["BackReference"] = 1;
          flag["GroupName"] = word2;
          flag["GroupIndex"] = parseInt(word2, 10);
          sequence.push(Node(T_SPECIAL, word2, flag));
          word2 = "";
        } else {
          word2 += ch2;
          wordlen += 1;
        }
      } else {
        if (re_obj.inGroup > 0 && ")" === ch2) {
          if (wordlen) {
            sequence.push(Node(T_STRING, word2));
            word2 = "";
            wordlen = 0;
          }
          if (alternation.length) {
            alternation.push(Node(T_SEQUENCE, sequence));
            sequence = [];
            flag = {};
            flag[specialChars["|"]] = 1;
            return Node(T_GROUP, Node(T_ALTERNATION, alternation, flag), flags);
          } else {
            return Node(T_GROUP, Node(T_SEQUENCE, sequence), flags);
          }
        } else if ("|" === ch2) {
          if (wordlen) {
            sequence.push(Node(T_STRING, word2));
            word2 = "";
            wordlen = 0;
          }
          alternation.push(Node(T_SEQUENCE, sequence));
          sequence = [];
        } else if ("[" === ch2) {
          if (wordlen) {
            sequence.push(Node(T_STRING, word2));
            word2 = "";
            wordlen = 0;
          }
          sequence.push(chargroup(re_obj));
        } else if ("(" === ch2) {
          if (wordlen) {
            sequence.push(Node(T_STRING, word2));
            word2 = "";
            wordlen = 0;
          }
          re_obj.inGroup += 1;
          sequence.push(analyze_re2(re_obj));
          re_obj.inGroup -= 1;
        } else if ("{" === ch2) {
          if (wordlen) {
            sequence.push(Node(T_STRING, word2));
            word2 = "";
            wordlen = 0;
          }
          m = match_repeats(re_obj.re.substr(re_obj.pos - 1));
          re_obj.pos += m[0].length - 1;
          flag = { val: m[0], "MatchMinimum": m[1], "MatchMaximum": m[2] || "unlimited", "min": parseInt(m[1], 10), "max": m[2] ? parseInt(m[2], 10) : -1 };
          flag[specialChars[ch2]] = 1;
          if (re_obj.pos < lre && "?" === re_obj.re[CHAR](re_obj.pos)) {
            flag["isGreedy"] = 0;
            re_obj.pos++;
          } else {
            flag["isGreedy"] = 1;
          }
          var prev = sequence.pop();
          if (T_STRING === prev.type && prev.val.length > 1) {
            sequence.push(Node(T_STRING, prev.val.slice(0, -1)));
            prev.val = prev.val.slice(-1);
          }
          sequence.push(Node(T_QUANTIFIER, prev, flag));
        } else if ("*" === ch2 || "+" === ch2 || "?" === ch2) {
          if (wordlen) {
            sequence.push(Node(T_STRING, word2));
            word2 = "";
            wordlen = 0;
          }
          flag = {};
          flag[specialChars[ch2]] = 1;
          flag["min"] = "+" === ch2 ? 1 : 0;
          flag["max"] = "?" === ch2 ? 1 : -1;
          if (re_obj.pos < lre && "?" === re_obj.re[CHAR](re_obj.pos)) {
            flag["isGreedy"] = 0;
            re_obj.pos++;
          } else {
            flag["isGreedy"] = 1;
          }
          var prev = sequence.pop();
          if (T_STRING === prev.type && prev.val.length > 1) {
            sequence.push(Node(T_STRING, prev.val.slice(0, -1)));
            prev.val = prev.val.slice(-1);
          }
          sequence.push(Node(T_QUANTIFIER, prev, flag));
        } else if (HAS.call(specialChars, ch2)) {
          if (wordlen) {
            sequence.push(Node(T_STRING, word2));
            word2 = "";
            wordlen = 0;
          }
          flag = {};
          flag[specialChars[ch2]] = 1;
          sequence.push(Node(T_SPECIAL, ch2, flag));
        } else {
          word2 += ch2;
          wordlen += 1;
        }
      }
    }
    if (wordlen) {
      sequence.push(Node(T_STRING, word2));
      word2 = "";
      wordlen = 0;
    }
    if (alternation.length) {
      alternation.push(Node(T_SEQUENCE, sequence));
      sequence = [];
      flag = {};
      flags[specialChars["|"]] = 1;
      return Node(T_ALTERNATION, alternation, flag);
    }
    return Node(T_SEQUENCE, sequence);
  }, "analyze_re");
  function Analyzer(re2, delim, flavor) {
    if (!(this instanceof Analyzer)) return new Analyzer(re2, delim, flavor);
    if (re2) this.input(re2, delim, flavor);
  }
  __name(Analyzer, "Analyzer");
  Analyzer.VERSION = __version__;
  Analyzer[PROTO] = {
    constructor: Analyzer,
    ast: null,
    flavor: "",
    re: null,
    fl: null,
    src: null,
    grp: null,
    min: null,
    max: null,
    ch: null,
    bc: true,
    dispose: /* @__PURE__ */ __name(function() {
      var self2 = this;
      self2.ast = null;
      self2.flavor = null;
      self2.re = null;
      self2.fl = null;
      self2.src = null;
      self2.grp = null;
      self2.min = null;
      self2.max = null;
      self2.ch = null;
      return self2;
    }, "dispose"),
    reset: /* @__PURE__ */ __name(function() {
      var self2 = this;
      self2.ast = null;
      self2.src = null;
      self2.grp = null;
      self2.min = null;
      self2.max = null;
      self2.ch = null;
      return self2;
    }, "reset"),
    backwardsCompatible: /* @__PURE__ */ __name(function(enable) {
      this.bc = !!enable;
      return this;
    }, "backwardsCompatible"),
    input: /* @__PURE__ */ __name(function(re2, delim, flavor) {
      var self2 = this;
      if (!arguments.length) return self2.re;
      if (re2) {
        delim = false === delim ? false : delim || "/";
        var l, ch2, fl2 = {};
        re2 = re2.toString();
        l = re2.length;
        if (delim) {
          while (0 < l) {
            ch2 = re2[CHAR](l - 1);
            if (delim === ch2) break;
            else {
              fl2[ch2] = 1;
              --l;
            }
          }
          if (0 < l) {
            if (delim === re2[CHAR](0) && delim === re2[CHAR](l - 1)) re2 = re2.slice(1, l - 1);
            else re2 = re2.slice(0, l);
          } else {
            re2 = "";
          }
        }
        if (self2.re !== re2) self2.reset();
        self2.re = re2;
        self2.fl = fl2;
        self2.flavor = String(flavor || "");
      }
      return self2;
    }, "input"),
    analyze: /* @__PURE__ */ __name(function() {
      var self2 = this;
      if (null != self2.re && null === self2.ast) {
        var re2 = new RE_OBJ(self2.re, self2.fl, self2.flavor);
        self2.ast = analyze_re(re2);
        re2.dispose();
      }
      return self2;
    }, "analyze"),
    synthesize: /* @__PURE__ */ __name(function(escaped) {
      var self2 = this, state, re2;
      if (null == self2.re) return self2;
      if (null === self2.ast) {
        self2.analyze();
        self2.src = null;
        self2.grp = null;
      }
      if (null === self2.src) {
        state = {
          MAP: T_SEQUENCE | T_ALTERNATION | T_GROUP | T_CHARGROUP | T_QUANTIFIER,
          REDUCE: T_UNICODECHAR | T_HEXCHAR | T_SPECIAL | T_CHARS | T_CHARRANGE | T_STRING,
          IGNORE: T_COMMENT,
          map: map_src,
          reduce: reduce_src,
          escaped: false !== escaped,
          compatibility: self2.bc,
          group: {}
        };
        re2 = walk({ src: "", group: {} }, self2.ast, state);
        self2.src = re2.src;
        self2.grp = re2.group;
      }
      return self2;
    }, "synthesize"),
    source: /* @__PURE__ */ __name(function() {
      var self2 = this;
      if (null == self2.re) return null;
      if (null === self2.src) self2.synthesize();
      return self2.src;
    }, "source"),
    groups: /* @__PURE__ */ __name(function(raw) {
      var self2 = this;
      if (null == self2.re) return null;
      if (null === self2.grp) self2.synthesize();
      return true === raw ? sel.grp : clone(self2.grp);
    }, "groups"),
    compile: /* @__PURE__ */ __name(function(flags, notBackwardsCompatible) {
      var self2 = this;
      if (null == self2.re) return null;
      flags = flags || self2.fl || {};
      return new RegExp(self2.source(), (flags.g || flags.G ? "g" : "") + (flags.i || flags.I ? "i" : "") + (flags.m || flags.M ? "m" : "") + (flags.y || flags.Y ? "y" : "") + (flags.u ? "u" : "") + (flags.d ? "d" : "") + (flags.s ? "s" : ""));
    }, "compile"),
    tree: /* @__PURE__ */ __name(function(flat) {
      var self2 = this;
      if (null == self2.re) return null;
      if (null === self2.ast) self2.analyze();
      return true === flat ? self2.ast.toObject() : self2.ast;
    }, "tree"),
    // experimental feature
    sample: /* @__PURE__ */ __name(function(maxlen, numsamples) {
      var self2 = this, state;
      if (null == self2.re) return null;
      if (null === self2.ast) self2.analyze();
      state = {
        MAP: T_SEQUENCE | T_ALTERNATION | T_GROUP | T_CHARGROUP | T_QUANTIFIER,
        REDUCE: T_UNICODECHAR | T_HEXCHAR | T_SPECIAL | T_CHARS | T_CHARRANGE | T_STRING,
        IGNORE: T_COMMENT,
        map: map_any,
        reduce: reduce_str,
        maxLength: maxlen | 0 || 1,
        isCaseInsensitive: null != self2.fl.i,
        group: {}
      };
      numsamples = numsamples | 0 || 1;
      if (1 < numsamples) {
        var samples = new Array(numsamples);
        for (var i = 0; i < numsamples; ++i) samples[i] = walk("", self2.ast, state);
        return samples;
      }
      return walk("", self2.ast, state);
    }, "sample"),
    // experimental feature
    minimum: /* @__PURE__ */ __name(function() {
      var self2 = this, state;
      if (null == self2.re) return 0;
      if (null === self2.ast) {
        self2.analyze();
        self2.min = null;
      }
      if (null === self2.min) {
        state = {
          MAP: T_SEQUENCE | T_ALTERNATION | T_GROUP | T_CHARGROUP | T_QUANTIFIER,
          REDUCE: T_UNICODECHAR | T_HEXCHAR | T_SPECIAL | T_CHARS | T_CHARRANGE | T_STRING,
          IGNORE: T_COMMENT,
          map: map_min,
          reduce: reduce_len,
          group: {}
        };
        self2.min = walk(0, self2.ast, state) | 0;
      }
      return self2.min;
    }, "minimum"),
    // experimental feature
    maximum: /* @__PURE__ */ __name(function() {
      var self2 = this, state;
      if (null == self2.re) return 0;
      if (null === self2.ast) {
        self2.analyze();
        self2.max = null;
      }
      if (null === self2.max) {
        state = {
          MAP: T_SEQUENCE | T_ALTERNATION | T_GROUP | T_CHARGROUP | T_QUANTIFIER,
          REDUCE: T_UNICODECHAR | T_HEXCHAR | T_SPECIAL | T_CHARS | T_CHARRANGE | T_STRING,
          IGNORE: T_COMMENT,
          map: map_max,
          reduce: reduce_len,
          group: {}
        };
        self2.max = walk(0, self2.ast, state);
      }
      return self2.max;
    }, "maximum"),
    // experimental feature
    peek: /* @__PURE__ */ __name(function() {
      var self2 = this, state, isCaseInsensitive, peek, n, c, p, cases;
      if (null == self2.re) return null;
      if (null === self2.ast) {
        self2.analyze();
        self2.ch = null;
      }
      if (null === self2.ch) {
        state = {
          MAP: T_SEQUENCE | T_ALTERNATION | T_GROUP | T_CHARGROUP | T_QUANTIFIER,
          REDUCE: T_UNICODECHAR | T_HEXCHAR | T_SPECIAL | T_CHARS | T_CHARRANGE | T_STRING,
          IGNORE: T_COMMENT,
          map: map_1st,
          reduce: reduce_peek,
          group: {}
        };
        self2.ch = walk({ positive: {}, negative: {} }, self2.ast, state);
      }
      peek = { positive: clone(self2.ch.positive), negative: clone(self2.ch.negative) };
      isCaseInsensitive = null != self2.fl.i;
      for (n in peek) {
        cases = {};
        p = peek[n];
        for (c in p) {
          if ("\\d" === c) {
            delete p[c];
            cases = concat(cases, character_range("0", "9"));
          } else if ("\\s" === c) {
            delete p[c];
            cases = concat(cases, ["\f", "\n", "\r", "	", "\v", "\xA0", "\u2028", "\u2029"]);
          } else if ("\\w" === c) {
            delete p[c];
            cases = concat(cases, ["_"].concat(character_range("0", "9")).concat(character_range("a", "z")).concat(character_range("A", "Z")));
          } else if ("\\b" === c) {
            delete p[c];
            cases[specialChars["b"]] = 1;
          } else if ("\\." === c) {
            delete p[c];
            cases[specialChars["."]] = 1;
          } else if (ESC !== c[CHAR](0) && isCaseInsensitive) {
            cases[c.toLowerCase()] = 1;
            cases[c.toUpperCase()] = 1;
          } else if (ESC === c[CHAR](0)) {
            delete p[c];
          }
        }
        peek[n] = concat(p, cases);
      }
      return peek;
    }, "peek")
  };
  Analyzer[PROTO].set = Analyzer[PROTO].input;
  function Composer() {
    var self2 = this;
    if (!(self2 instanceof Composer)) return new Composer();
    self2.re = null;
    self2.reset();
  }
  __name(Composer, "Composer");
  Composer.VERSION = __version__;
  Composer[PROTO] = {
    constructor: Composer,
    re: null,
    g: 0,
    grp: null,
    level: 0,
    ast: null,
    dispose: /* @__PURE__ */ __name(function() {
      var self2 = this;
      self2.re = null;
      self2.g = null;
      self2.grp = null;
      self2.level = null;
      self2.ast = null;
      return self2;
    }, "dispose"),
    reset: /* @__PURE__ */ __name(function() {
      var self2 = this;
      self2.g = 0;
      self2.grp = {};
      self2.level = 0;
      self2.ast = [{ node: [], type: T_SEQUENCE, flag: "" }];
      return self2;
    }, "reset"),
    compose: /* @__PURE__ */ __name(function() {
      var self2 = this, fl2 = slice(arguments).join(""), src = self2.ast[0].node.join("");
      self2.re = {
        source: src,
        flags: fl2,
        groups: self2.grp,
        pattern: RE(src, fl2)
      };
      self2.reset();
      return self2.re;
    }, "compose"),
    partial: /* @__PURE__ */ __name(function(reset) {
      var self2 = this, re2 = self2.ast[0].node.join("");
      if (false !== reset) self2.reset();
      return re2;
    }, "partial"),
    token: /* @__PURE__ */ __name(function(token, escaped) {
      var self2 = this;
      if (null != token)
        self2.ast[self2.level].node.push(escaped ? esc_re(String(token), ESC) : String(token));
      return self2;
    }, "token"),
    literal: /* @__PURE__ */ __name(function(literal) {
      return this.token(String(literal), true);
    }, "literal"),
    regexp: /* @__PURE__ */ __name(function(re2) {
      return this.token(String(re2), false);
    }, "regexp"),
    SOL: /* @__PURE__ */ __name(function() {
      var self2 = this;
      self2.ast[self2.level].node.push("^");
      return self2;
    }, "SOL"),
    SOF: /* @__PURE__ */ __name(function() {
      return this.SOL();
    }, "SOF"),
    EOL: /* @__PURE__ */ __name(function() {
      var self2 = this;
      self2.ast[self2.level].node.push("$");
      return self2;
    }, "EOL"),
    EOF: /* @__PURE__ */ __name(function() {
      return this.EOL();
    }, "EOF"),
    LF: /* @__PURE__ */ __name(function() {
      var self2 = this;
      self2.ast[self2.level].node.push(ESC + "n");
      return self2;
    }, "LF"),
    CR: /* @__PURE__ */ __name(function() {
      var self2 = this;
      self2.ast[self2.level].node.push(ESC + "r");
      return self2;
    }, "CR"),
    TAB: /* @__PURE__ */ __name(function() {
      var self2 = this;
      self2.ast[self2.level].node.push(ESC + "t");
      return self2;
    }, "TAB"),
    CTRL: /* @__PURE__ */ __name(function(code) {
      var self2 = this;
      self2.ast[self2.level].node.push(ESC + "c" + (code || 0));
      return self2;
    }, "CTRL"),
    HEX: /* @__PURE__ */ __name(function(code) {
      var self2 = this;
      self2.ast[self2.level].node.push(ESC + "x" + pad(code || 0, 2));
      return self2;
    }, "HEX"),
    UNICODE: /* @__PURE__ */ __name(function(code, uni) {
      var self2 = this;
      self2.ast[self2.level].node.push(true === uni ? ESC + "u{" + String(code || 0) + "}" : ESC + "u" + pad(code || 0, 4));
      return self2;
    }, "UNICODE"),
    backSpace: /* @__PURE__ */ __name(function() {
      var self2 = this;
      self2.ast[self2.level].node.push("[" + ESC + "b]");
      return self2;
    }, "backSpace"),
    any: /* @__PURE__ */ __name(function(multiline) {
      var self2 = this;
      self2.ast[self2.level].node.push(multiline ? "[" + ESC + "s" + ESC + "S]" : ".");
      return self2;
    }, "any"),
    space: /* @__PURE__ */ __name(function(positive) {
      var self2 = this;
      if (arguments.length < 1) positive = true;
      self2.ast[self2.level].node.push(!positive ? ESC + "S" : ESC + "s");
      return self2;
    }, "space"),
    digit: /* @__PURE__ */ __name(function(positive) {
      var self2 = this;
      if (arguments.length < 1) positive = true;
      self2.ast[self2.level].node.push(!positive ? ESC + "D" : ESC + "d");
      return self2;
    }, "digit"),
    word: /* @__PURE__ */ __name(function(positive) {
      var self2 = this;
      if (arguments.length < 1) positive = true;
      self2.ast[self2.level].node.push(!positive ? ESC + "W" : ESC + "w");
      return self2;
    }, "word"),
    boundary: /* @__PURE__ */ __name(function(positive) {
      var self2 = this;
      if (arguments.length < 1) positive = true;
      self2.ast[self2.level].node.push(!positive ? ESC + "B" : ESC + "b");
      return self2;
    }, "boundary"),
    characters: /* @__PURE__ */ __name(function() {
      var self2 = this;
      if (T_CHARGROUP === self2.ast[self2.level].type)
        self2.ast[self2.level].node.push(getArgs(arguments, 1).map(function(c) {
          return esc_re(String(c), ESC, 1);
        }).join(""));
      return self2;
    }, "characters"),
    range: /* @__PURE__ */ __name(function(start, end) {
      var self2 = this;
      if (null != start && null != end && T_CHARGROUP === self2.ast[self2.level].type)
        self2.ast[self2.level].node.push(esc_re(String(start), ESC, 1) + "-" + esc_re(String(end), ESC, 1));
      return self2;
    }, "range"),
    backReference: /* @__PURE__ */ __name(function(n) {
      var self2 = this;
      self2.ast[self2.level].node.push(ESC + (HAS.call(self2.grp, n) ? self2.grp[n] : n | 0));
      return self2;
    }, "backReference"),
    repeat: /* @__PURE__ */ __name(function(min, max, greedy) {
      var self2 = this;
      if (null == min) return self2;
      if (arguments.length < 3) greedy = true;
      var repeat = (null == max || min === max ? "{" + String(min) + "}" : "{" + String(min) + "," + String(max) + "}") + (!greedy ? "?" : "");
      self2.ast[self2.level].node[self2.ast[self2.level].node.length - 1] += repeat;
      return self2;
    }, "repeat"),
    zeroOrOne: /* @__PURE__ */ __name(function(greedy) {
      var self2 = this;
      if (arguments.length < 1) greedy = true;
      self2.ast[self2.level].node[self2.ast[self2.level].node.length - 1] += !greedy ? "??" : "?";
      return self2;
    }, "zeroOrOne"),
    zeroOrMore: /* @__PURE__ */ __name(function(greedy) {
      var self2 = this;
      if (arguments.length < 1) greedy = true;
      self2.ast[self2.level].node[self2.ast[self2.level].node.length - 1] += !greedy ? "*?" : "*";
      return self2;
    }, "zeroOrMore"),
    oneOrMore: /* @__PURE__ */ __name(function(greedy) {
      var self2 = this;
      if (arguments.length < 1) greedy = true;
      self2.ast[self2.level].node[self2.ast[self2.level].node.length - 1] += !greedy ? "+?" : "+";
      return self2;
    }, "oneOrMore"),
    alternate: /* @__PURE__ */ __name(function() {
      var self2 = this;
      self2.level++;
      self2.ast.push({ node: [], type: T_ALTERNATION, flag: "", sequences: [] });
      return self2;
    }, "alternate"),
    either: /* @__PURE__ */ __name(function() {
      return this.alternate();
    }, "either"),
    or_: /* @__PURE__ */ __name(function() {
      var self2 = this, ast = self2.ast[self2.level];
      if (T_ALTERNATION === ast.type && ast.node.length) {
        ast.sequences.push(ast.node.join(""));
        ast.node = [];
      }
      return self2;
    }, "or_"),
    group: /* @__PURE__ */ __name(function(opts, v2) {
      var self2 = this, type = T_GROUP, fl2 = "";
      if (is_string(opts)) {
        fl2 = opts;
        opts = {};
        opts[fl2] = v2;
        fl2 = "";
      } else {
        opts = opts || {};
      }
      if (!!opts["name"] || !!opts["named"]) {
        self2.g++;
        self2.grp[self2.g] = self2.g;
        self2.grp[opts.name || opts.named] = self2.g;
      } else if (true === opts["lookahead"] || false === opts["lookahead"]) {
        fl2 = false === opts["lookahead"] ? "?!" : "?=";
      } else if (true === opts["lookbehind"] || false === opts["lookbehind"]) {
        fl2 = false === opts["lookbehind"] ? "?<!" : "?<=";
      } else if (true === opts["nocapture"]) {
        fl2 = "?:";
      } else if (true === opts["characters"] || false === opts["characters"]) {
        type = T_CHARGROUP;
        fl2 = false === opts["characters"] ? "^" : "";
      } else {
        self2.g++;
        self2.grp[self2.g] = self2.g;
      }
      self2.level++;
      self2.ast.push({ node: [], type, flag: fl2 });
      return self2;
    }, "group"),
    subGroup: /* @__PURE__ */ __name(function(opts) {
      return this.group(opts);
    }, "subGroup"),
    characterGroup: /* @__PURE__ */ __name(function(positive) {
      return this.group({ "characters": false !== positive });
    }, "characterGroup"),
    namedGroup: /* @__PURE__ */ __name(function(name2) {
      return this.group({ "name": name2 });
    }, "namedGroup"),
    nonCaptureGroup: /* @__PURE__ */ __name(function() {
      return this.group({ "nocapture": true });
    }, "nonCaptureGroup"),
    lookAheadGroup: /* @__PURE__ */ __name(function(positive) {
      return this.group({ "lookahead": false !== positive });
    }, "lookAheadGroup"),
    lookBehindGroup: /* @__PURE__ */ __name(function(positive) {
      return this.group({ "lookbehind": false !== positive });
    }, "lookBehindGroup"),
    end: /* @__PURE__ */ __name(function(n) {
      var self2 = this, prev, type, flag, part, sequences;
      n = (arguments.length ? n | 0 : 1) || 1;
      while (n--) {
        prev = self2.ast.length ? self2.ast.pop() : null;
        type = prev ? prev.type : 0;
        flag = prev ? prev.flag : "";
        part = prev ? prev.node : [];
        if (T_ALTERNATION === type) {
          sequences = prev ? prev.sequences : [];
          part = !part.length ? sequences : sequences.concat(part.join(""));
        }
        if (0 < self2.level) {
          --self2.level;
          if (T_ALTERNATION === type)
            self2.ast[self2.level].node.push(part.join("|"));
          else if (T_GROUP === type)
            self2.ast[self2.level].node.push("(" + flag + part.join("") + ")");
          else if (T_CHARGROUP === type)
            self2.ast[self2.level].node.push("[" + flag + part.join("") + "]");
          else
            self2.ast[self2.level].node.push(part.join(""));
        }
      }
      return self2;
    }, "end")
  };
  var CP = Composer[PROTO];
  CP.startOfLine = CP.SOL;
  CP.endOfLine = CP.EOL;
  CP.startOfInput = CP.SOF;
  CP.endOfInput = CP.EOF;
  CP.match = CP.token;
  CP.sub = CP.regexp;
  CP.lineFeed = CP.LF;
  CP.carriageReturn = CP.CR;
  CP.tabulate = CP.TAB;
  CP.wordBoundary = CP.boundary;
  CP.chars = CP.characters;
  CP.charGroup = CP.characterGroup;
  CP.namedSubGroup = CP.namedGroup;
  CP.nonCaptureSubGroup = CP.nonCaptureGroup;
  CP.lookAheadSubGroup = CP.lookAheadGroup;
  CP.lookBehindSubGroup = CP.lookBehindGroup;
  var Regex = {
    VERSION: __version__,
    Node,
    Analyzer,
    Composer
  };
  return Regex;
})();

// ubo-src/js/regex-analyzer.js
var RegexAnalyzer = regex_default && regex_default.Analyzer || null;
function isRE2(reStr) {
  if (RegexAnalyzer === null) {
    return true;
  }
  try {
    return _isRE2(RegexAnalyzer(reStr, false).tree());
  } catch {
  }
  return false;
}
__name(isRE2, "isRE2");
function tokenizableStrFromRegex(reStr) {
  return _literalStrFromRegex(reStr);
}
__name(tokenizableStrFromRegex, "tokenizableStrFromRegex");
function _isRE2(node) {
  if (node instanceof Object === false) {
    return true;
  }
  if (node.flags instanceof Object) {
    if (node.flags.LookAhead === 1) {
      return false;
    }
    if (node.flags.NegativeLookAhead === 1) {
      return false;
    }
    if (node.flags.LookBehind === 1) {
      return false;
    }
    if (node.flags.NegativeLookBehind === 1) {
      return false;
    }
  }
  if (Array.isArray(node.val)) {
    for (const entry of node.val) {
      if (_isRE2(entry) === false) {
        return false;
      }
    }
  }
  if (node.val instanceof Object) {
    return _isRE2(node.val);
  }
  return true;
}
__name(_isRE2, "_isRE2");
function _literalStrFromRegex(reStr) {
  if (RegexAnalyzer === null) {
    return "";
  }
  let s = "";
  try {
    s = tokenizableStrFromNode(
      RegexAnalyzer(reStr, false).tree()
    );
  } catch {
  }
  const reOptional = /[\x02\x03]+/;
  for (; ; ) {
    const match = reOptional.exec(s);
    if (match === null) {
      break;
    }
    const left = s.slice(0, match.index);
    const middle = match[0];
    const right = s.slice(match.index + middle.length);
    s = left;
    s += firstCharCodeClass(right) === 1 || firstCharCodeClass(middle) === 1 ? "" : "\0";
    s += lastCharCodeClass(left) === 1 || lastCharCodeClass(middle) === 1 ? "" : "\0";
    s += right;
  }
  return s;
}
__name(_literalStrFromRegex, "_literalStrFromRegex");
function firstCharCodeClass(s) {
  if (s.length === 0) {
    return 0;
  }
  const c = s.charCodeAt(0);
  if (c === 1 || c === 3) {
    return 1;
  }
  return reCharCodeClass.test(s.charAt(0)) ? 1 : 0;
}
__name(firstCharCodeClass, "firstCharCodeClass");
function lastCharCodeClass(s) {
  const i = s.length - 1;
  if (i === -1) {
    return 0;
  }
  const c = s.charCodeAt(i);
  if (c === 1 || c === 3) {
    return 1;
  }
  return reCharCodeClass.test(s.charAt(i)) ? 1 : 0;
}
__name(lastCharCodeClass, "lastCharCodeClass");
var reCharCodeClass = /[%0-9A-Za-z]/;
function tokenizableStrFromNode(node) {
  switch (node.type) {
    case 1: {
      let s = "";
      for (let i = 0; i < node.val.length; i++) {
        s += tokenizableStrFromNode(node.val[i]);
      }
      return s;
    }
    case 2:
    /* T_ALTERNATION, 'Alternation' */
    case 8: {
      if (node.flags.NegativeMatch) {
        return "";
      }
      let firstChar = 0;
      let lastChar = 0;
      for (let i = 0; i < node.val.length; i++) {
        const s = tokenizableStrFromNode(node.val[i]);
        if (firstChar === 0 && firstCharCodeClass(s) === 1) {
          firstChar = 1;
        }
        if (lastChar === 0 && lastCharCodeClass(s) === 1) {
          lastChar = 1;
        }
        if (firstChar === 1 && lastChar === 1) {
          break;
        }
      }
      return String.fromCharCode(firstChar, lastChar);
    }
    case 4: {
      if (node.flags.NegativeLookAhead === 1 || node.flags.NegativeLookBehind === 1) {
        return "";
      }
      return tokenizableStrFromNode(node.val);
    }
    case 16: {
      if (node.flags.max === 0) {
        return "";
      }
      const s = tokenizableStrFromNode(node.val);
      const first = firstCharCodeClass(s);
      const last = lastCharCodeClass(s);
      if (node.flags.min !== 0) {
        return String.fromCharCode(first, last);
      }
      return String.fromCharCode(first + 2, last + 2);
    }
    case 64: {
      if (node.flags.Code === "01" || node.flags.Code === "02" || node.flags.Code === "03") {
        return "\0";
      }
      return node.flags.Char;
    }
    case 128: {
      const flags = node.flags;
      if (flags.EndCharGroup === 1 || // dangling `]`
      flags.EndGroup === 1 || // dangling `)`
      flags.EndRepeats === 1) {
        throw new Error("Unmatched bracket");
      }
      return flags.MatchEnd === 1 || flags.MatchStart === 1 || flags.MatchWordBoundary === 1 ? "\0" : "";
    }
    case 256: {
      for (let i = 0; i < node.val.length; i++) {
        if (firstCharCodeClass(node.val[i]) === 1) {
          return "";
        }
      }
      return "\0";
    }
    // Ranges are assumed to always involve token-related characters.
    case 512: {
      return "";
    }
    case 1024: {
      return node.val;
    }
    case 2048: {
      return "";
    }
    default:
      break;
  }
  return "";
}
__name(tokenizableStrFromNode, "tokenizableStrFromNode");
function toHeaderPattern(reStr) {
  if (RegexAnalyzer === null) {
    return;
  }
  try {
    return _toHeaderPattern(RegexAnalyzer(reStr, false).tree());
  } catch {
  }
}
__name(toHeaderPattern, "toHeaderPattern");
function _toHeaderPattern(branch, depth = 0) {
  switch (branch.type) {
    case 1: {
      let s = "";
      for (const node of branch.val) {
        const t = _toHeaderPattern(node, depth + 1);
        if (t === void 0) {
          return;
        }
        s += t;
      }
      if (depth === 0 && branch.val.length !== 0) {
        const first = branch.val[0];
        if (first.type !== 128 || first.val !== "^") {
          s = `*${s}`;
        }
        const last = branch.val.at(-1);
        if (last.type !== 128 || last.val !== "$") {
          s = `${s}*`;
        }
      }
      return s;
    }
    case 4: {
      if (branch.flags.NegativeLookAhead === 1 || branch.flags.NegativeLookBehind === 1) {
        return;
      }
      return _toHeaderPattern(branch.val, depth + 1);
    }
    case 64:
      return branch.flags.Char;
    case 128: {
      if (branch.val === "^") {
        return "";
      }
      if (branch.val === "$") {
        return "";
      }
      return;
    }
    case 1024:
      return branch.val;
    case 2048:
      return "";
    default:
      break;
  }
}
__name(_toHeaderPattern, "_toHeaderPattern");

// ubo-src/js/biditrie.js
var VERSION = 2;
var PAGE_SIZE = 65536 * 2;
var HAYSTACK_START = 0;
var HAYSTACK_SIZE = 8192;
var HAYSTACK_SIZE_SLOT = HAYSTACK_SIZE >>> 2;
var TRIE0_SLOT = HAYSTACK_SIZE_SLOT + 1;
var TRIE1_SLOT = HAYSTACK_SIZE_SLOT + 2;
var CHAR0_SLOT = HAYSTACK_SIZE_SLOT + 3;
var CHAR1_SLOT = HAYSTACK_SIZE_SLOT + 4;
var RESULT_L_SLOT = HAYSTACK_SIZE_SLOT + 5;
var RESULT_R_SLOT = HAYSTACK_SIZE_SLOT + 6;
var RESULT_IU_SLOT = HAYSTACK_SIZE_SLOT + 7;
var TRIE0_START = HAYSTACK_SIZE_SLOT + 8 << 2;
var CELL_BYTE_LENGTH = 12;
var MIN_FREE_CELL_BYTE_LENGTH = CELL_BYTE_LENGTH * 8;
var CELL_AND = 0;
var CELL_OR = 1;
var SEGMENT_INFO = 2;
var BCELL_NEXT_AND = 0;
var BCELL_ALT_AND = 1;
var BCELL_EXTRA = 2;
var BCELL_EXTRA_MAX = 16777215;
var toSegmentInfo = /* @__PURE__ */ __name((aL, l, r) => r - l << 24 | aL + l, "toSegmentInfo");
var roundToPageSize = /* @__PURE__ */ __name((v2) => v2 + PAGE_SIZE - 1 & ~(PAGE_SIZE - 1), "roundToPageSize");
var i32Checksum = /* @__PURE__ */ __name((buf32) => {
  const n = buf32.length;
  let hash = 177573 ^ n;
  for (let i = 0; i < n; i++) {
    hash = (hash << 5) + hash ^ buf32[i];
  }
  return hash;
}, "i32Checksum");
var BidiTrieContainer = class {
  static {
    __name(this, "BidiTrieContainer");
  }
  constructor(extraHandler) {
    const len = PAGE_SIZE * 4;
    this.buf8 = new Uint8Array(len);
    this.buf32 = new Uint32Array(this.buf8.buffer);
    this.buf32[TRIE0_SLOT] = TRIE0_START;
    this.buf32[TRIE1_SLOT] = this.buf32[TRIE0_SLOT];
    this.buf32[CHAR0_SLOT] = len >>> 1;
    this.buf32[CHAR1_SLOT] = this.buf32[CHAR0_SLOT];
    this.haystack = this.buf8.subarray(
      HAYSTACK_START,
      HAYSTACK_START + HAYSTACK_SIZE
    );
    this.extraHandler = extraHandler;
    this.textDecoder = null;
    this.wasmMemory = null;
    this.lastStored = "";
    this.lastStoredLen = this.lastStoredIndex = 0;
  }
  //--------------------------------------------------------------------------
  // Public methods
  //--------------------------------------------------------------------------
  getHaystackLen() {
    return this.buf32[HAYSTACK_SIZE_SLOT];
  }
  setHaystackLen(v2) {
    if (v2 > HAYSTACK_SIZE) {
      v2 = HAYSTACK_SIZE;
    }
    this.buf32[HAYSTACK_SIZE_SLOT] = v2;
    return v2;
  }
  reset() {
    this.buf32[TRIE1_SLOT] = this.buf32[TRIE0_SLOT];
    this.buf32[CHAR1_SLOT] = this.buf32[CHAR0_SLOT];
    this.lastStored = "";
    this.lastStoredLen = this.lastStoredIndex = 0;
  }
  createTrie() {
    if (this.buf32[CHAR0_SLOT] - this.buf32[TRIE1_SLOT] < CELL_BYTE_LENGTH) {
      this.growBuf(CELL_BYTE_LENGTH, 0);
    }
    const iroot = this.buf32[TRIE1_SLOT] >>> 2;
    this.buf32[TRIE1_SLOT] += CELL_BYTE_LENGTH;
    this.buf32[iroot + CELL_OR] = 0;
    this.buf32[iroot + CELL_AND] = 0;
    this.buf32[iroot + SEGMENT_INFO] = 0;
    return iroot;
  }
  matches(icell, ai) {
    const buf32 = this.buf32;
    const buf8 = this.buf8;
    const char0 = buf32[CHAR0_SLOT];
    const aR = buf32[HAYSTACK_SIZE_SLOT];
    let al2 = ai, x2 = 0, y2 = 0;
    for (; ; ) {
      x2 = buf8[al2];
      al2 += 1;
      for (; ; ) {
        y2 = buf32[icell + SEGMENT_INFO];
        let bl2 = char0 + (y2 & 16777215);
        if (buf8[bl2] === x2) {
          y2 = (y2 >>> 24) - 1;
          if (y2 !== 0) {
            x2 = al2 + y2;
            if (x2 > aR) {
              return 0;
            }
            for (; ; ) {
              bl2 += 1;
              if (buf8[bl2] !== buf8[al2]) {
                return 0;
              }
              al2 += 1;
              if (al2 === x2) {
                break;
              }
            }
          }
          break;
        }
        icell = buf32[icell + CELL_OR];
        if (icell === 0) {
          return 0;
        }
      }
      icell = buf32[icell + CELL_AND];
      x2 = buf32[icell + BCELL_EXTRA];
      if (x2 <= BCELL_EXTRA_MAX) {
        if (x2 !== 0 && this.matchesExtra(ai, al2, x2) !== 0) {
          return 1;
        }
        x2 = buf32[icell + BCELL_ALT_AND];
        if (x2 !== 0 && this.matchesLeft(x2, ai, al2) !== 0) {
          return 1;
        }
        icell = buf32[icell + BCELL_NEXT_AND];
        if (icell === 0) {
          return 0;
        }
      }
      if (al2 === aR) {
        return 0;
      }
    }
    return 0;
  }
  matchesLeft(icell, ar2, r) {
    const buf32 = this.buf32;
    const buf8 = this.buf8;
    const char0 = buf32[CHAR0_SLOT];
    let x2 = 0, y2 = 0;
    for (; ; ) {
      if (ar2 === 0) {
        return 0;
      }
      ar2 -= 1;
      x2 = buf8[ar2];
      for (; ; ) {
        y2 = buf32[icell + SEGMENT_INFO];
        let br = char0 + (y2 & 16777215);
        y2 = (y2 >>> 24) - 1;
        br += y2;
        if (buf8[br] === x2) {
          if (y2 !== 0) {
            x2 = ar2 - y2;
            if (x2 < 0) {
              return 0;
            }
            for (; ; ) {
              ar2 -= 1;
              br -= 1;
              if (buf8[ar2] !== buf8[br]) {
                return 0;
              }
              if (ar2 === x2) {
                break;
              }
            }
          }
          break;
        }
        icell = buf32[icell + CELL_OR];
        if (icell === 0) {
          return 0;
        }
      }
      icell = buf32[icell + CELL_AND];
      x2 = buf32[icell + BCELL_EXTRA];
      if (x2 <= BCELL_EXTRA_MAX) {
        if (x2 !== 0 && this.matchesExtra(ar2, r, x2) !== 0) {
          return 1;
        }
        icell = buf32[icell + BCELL_NEXT_AND];
        if (icell === 0) {
          return 0;
        }
      }
    }
    return 0;
  }
  matchesExtra(l, r, ix) {
    let iu2 = 0;
    if (ix !== 1) {
      iu2 = this.extraHandler(l, r, ix);
      if (iu2 === 0) {
        return 0;
      }
    } else {
      iu2 = -1;
    }
    this.buf32[RESULT_IU_SLOT] = iu2;
    this.buf32[RESULT_L_SLOT] = l;
    this.buf32[RESULT_R_SLOT] = r;
    return 1;
  }
  get $l() {
    return this.buf32[RESULT_L_SLOT] | 0;
  }
  get $r() {
    return this.buf32[RESULT_R_SLOT] | 0;
  }
  get $iu() {
    return this.buf32[RESULT_IU_SLOT] | 0;
  }
  add(iroot, aL0, n, pivot = 0) {
    const aR = n;
    if (aR === 0) {
      return 0;
    }
    if (this.buf32[CHAR0_SLOT] - this.buf32[TRIE1_SLOT] < MIN_FREE_CELL_BYTE_LENGTH) {
      this.growBuf(MIN_FREE_CELL_BYTE_LENGTH, 0);
    }
    const buf32 = this.buf32;
    const char0 = buf32[CHAR0_SLOT];
    let icell = iroot;
    let aL = char0 + aL0;
    if (buf32[icell + SEGMENT_INFO] === 0) {
      buf32[icell + SEGMENT_INFO] = toSegmentInfo(aL0, pivot, aR);
      return this.addLeft(icell, aL0, pivot);
    }
    const buf8 = this.buf8;
    let al2 = pivot;
    let inext;
    for (; ; ) {
      const binfo = buf32[icell + SEGMENT_INFO];
      const bR = binfo >>> 24;
      if (bR === 0) {
        icell = buf32[icell + BCELL_NEXT_AND];
        continue;
      }
      let bl2 = char0 + (binfo & 16777215);
      if (buf8[bl2] !== buf8[aL + al2]) {
        inext = buf32[icell + CELL_OR];
        if (inext === 0) {
          inext = this.addCell(0, 0, toSegmentInfo(aL0, al2, aR));
          buf32[icell + CELL_OR] = inext;
          return this.addLeft(inext, aL0, pivot);
        }
        icell = inext;
        continue;
      }
      let bi2 = 1;
      al2 += 1;
      if (bR !== 1) {
        for (; ; ) {
          if (bi2 === bR) {
            break;
          }
          if (al2 === aR) {
            break;
          }
          if (buf8[bl2 + bi2] !== buf8[aL + al2]) {
            break;
          }
          bi2 += 1;
          al2 += 1;
        }
      }
      if (bi2 === bR) {
        if (al2 === aR) {
          return this.addLeft(icell, aL0, pivot);
        }
        inext = buf32[icell + CELL_AND];
        if (buf32[inext + CELL_AND] !== 0) {
          icell = inext;
          continue;
        }
        icell = this.addCell(0, 0, toSegmentInfo(aL0, al2, aR));
        buf32[inext + CELL_AND] = icell;
        return this.addLeft(icell, aL0, pivot);
      }
      bl2 -= char0;
      buf32[icell + SEGMENT_INFO] = bi2 << 24 | bl2;
      inext = this.addCell(
        buf32[icell + CELL_AND],
        0,
        bR - bi2 << 24 | bl2 + bi2
      );
      buf32[icell + CELL_AND] = inext;
      if (al2 === aR) {
        return this.addLeft(icell, aL0, pivot);
      }
      icell = this.addCell(0, 0, toSegmentInfo(aL0, al2, aR));
      buf32[inext + CELL_OR] = icell;
      return this.addLeft(icell, aL0, pivot);
    }
  }
  addLeft(icell, aL0, pivot) {
    const buf32 = this.buf32;
    const char0 = buf32[CHAR0_SLOT];
    let aL = aL0 + char0;
    let iboundary = buf32[icell + CELL_AND];
    if (iboundary === 0 || buf32[iboundary + SEGMENT_INFO] > BCELL_EXTRA_MAX) {
      const inext2 = iboundary;
      iboundary = this.allocateCell();
      buf32[icell + CELL_AND] = iboundary;
      buf32[iboundary + BCELL_NEXT_AND] = inext2;
      if (pivot === 0) {
        return iboundary;
      }
    }
    if (buf32[iboundary + BCELL_EXTRA] === 1) {
      return iboundary;
    }
    if (pivot === 0) {
      return iboundary;
    }
    icell = buf32[iboundary + BCELL_ALT_AND];
    if (icell === 0) {
      icell = this.allocateCell();
      buf32[iboundary + BCELL_ALT_AND] = icell;
    }
    if (buf32[icell + SEGMENT_INFO] === 0) {
      buf32[icell + SEGMENT_INFO] = toSegmentInfo(aL0, 0, pivot);
      iboundary = this.allocateCell();
      buf32[icell + CELL_AND] = iboundary;
      return iboundary;
    }
    const buf8 = this.buf8;
    let ar2 = pivot, inext;
    for (; ; ) {
      const binfo = buf32[icell + SEGMENT_INFO];
      if (binfo <= BCELL_EXTRA_MAX) {
        inext = buf32[icell + CELL_AND];
        if (inext !== 0) {
          icell = inext;
          continue;
        }
        iboundary = this.allocateCell();
        buf32[icell + CELL_AND] = this.addCell(iboundary, 0, toSegmentInfo(aL0, 0, ar2));
        return iboundary;
      }
      const bL = char0 + (binfo & 16777215);
      const bR = bL + (binfo >>> 24);
      let br = bR;
      if (buf8[br - 1] !== buf8[aL + ar2 - 1]) {
        inext = buf32[icell + CELL_OR];
        if (inext === 0) {
          iboundary = this.allocateCell();
          inext = this.addCell(
            iboundary,
            0,
            toSegmentInfo(aL0, 0, ar2)
          );
          buf32[icell + CELL_OR] = inext;
          return iboundary;
        }
        icell = inext;
        continue;
      }
      br -= 1;
      ar2 -= 1;
      if (br !== bL) {
        for (; ; ) {
          if (br === bL) {
            break;
          }
          if (ar2 === 0) {
            break;
          }
          if (buf8[br - 1] !== buf8[aL + ar2 - 1]) {
            break;
          }
          br -= 1;
          ar2 -= 1;
        }
      }
      if (br === bL) {
        inext = buf32[icell + CELL_AND];
        if (ar2 === 0) {
          if (buf32[inext + BCELL_EXTRA] <= BCELL_EXTRA_MAX) {
            return inext;
          }
          iboundary = this.allocateCell();
          buf32[iboundary + CELL_AND] = inext;
          buf32[icell + CELL_AND] = iboundary;
          return iboundary;
        } else {
          if (inext !== 0) {
            icell = inext;
            continue;
          }
          debugger;
          inext = this.addCell(0, 0, 0);
          buf32[icell + CELL_AND] = inext;
          buf32[inext + CELL_AND] = this.addCell(0, 0, toSegmentInfo(aL0, 0, ar2));
        }
      } else {
        buf32[icell + SEGMENT_INFO] = bR - br << 24 | br - char0;
        inext = this.addCell(
          buf32[icell + CELL_AND],
          0,
          br - bL << 24 | bL - char0
        );
        if (ar2 === 0) {
          iboundary = this.allocateCell();
          buf32[icell + CELL_AND] = iboundary;
          buf32[iboundary + CELL_AND] = inext;
          return iboundary;
        } else {
          buf32[icell + CELL_AND] = inext;
          iboundary = this.allocateCell();
          buf32[inext + CELL_OR] = this.addCell(
            iboundary,
            0,
            toSegmentInfo(aL0, 0, ar2)
          );
          return iboundary;
        }
      }
    }
  }
  getExtra(iboundary) {
    return this.buf32[iboundary + BCELL_EXTRA];
  }
  setExtra(iboundary, v2) {
    this.buf32[iboundary + BCELL_EXTRA] = v2;
  }
  optimize() {
    this.shrinkBuf();
  }
  toSelfie() {
    const buf32 = this.buf32.subarray(0, this.buf32[CHAR1_SLOT] + 3 >>> 2);
    return {
      version: VERSION,
      buf32,
      checksum: i32Checksum(buf32)
    };
  }
  fromSelfie(selfie) {
    if (typeof selfie !== "object" || selfie === null) {
      return false;
    }
    if (selfie.version !== VERSION) {
      return false;
    }
    if (selfie.buf32 instanceof Uint32Array === false) {
      return false;
    }
    if (selfie.checksum !== i32Checksum(selfie.buf32)) {
      return false;
    }
    const byteLength = selfie.buf32.length << 2;
    if (byteLength === 0) {
      return false;
    }
    this.reallocateBuf(byteLength);
    this.buf32.set(selfie.buf32);
    return true;
  }
  storeString(s) {
    const n = s.length;
    if (n === this.lastStoredLen && s === this.lastStored) {
      return this.lastStoredIndex;
    }
    this.lastStored = s;
    this.lastStoredLen = n;
    if (this.buf8.length - this.buf32[CHAR1_SLOT] < n) {
      this.growBuf(0, n);
    }
    const offset = this.buf32[CHAR1_SLOT];
    this.buf32[CHAR1_SLOT] = offset + n;
    const buf8 = this.buf8;
    for (let i = 0; i < n; i++) {
      buf8[offset + i] = s.charCodeAt(i);
    }
    return this.lastStoredIndex = offset - this.buf32[CHAR0_SLOT];
  }
  extractString(i, n) {
    if (this.textDecoder === null) {
      this.textDecoder = new TextDecoder();
    }
    const offset = this.buf32[CHAR0_SLOT] + i;
    return this.textDecoder.decode(
      this.buf8.subarray(offset, offset + n)
    );
  }
  // WASMable.
  startsWith(haystackLeft, haystackRight, needleLeft, needleLen) {
    if (haystackLeft < 0 || haystackLeft + needleLen > haystackRight) {
      return 0;
    }
    const charCodes = this.buf8;
    needleLeft += this.buf32[CHAR0_SLOT];
    const needleRight = needleLeft + needleLen;
    while (charCodes[haystackLeft] === charCodes[needleLeft]) {
      needleLeft += 1;
      if (needleLeft === needleRight) {
        return 1;
      }
      haystackLeft += 1;
    }
    return 0;
  }
  // Find the left-most instance of substring in main string
  // WASMable.
  indexOf(haystackLeft, haystackEnd, needleLeft, needleLen) {
    if (needleLen === 0) {
      return haystackLeft;
    }
    haystackEnd -= needleLen;
    if (haystackEnd < haystackLeft) {
      return -1;
    }
    needleLeft += this.buf32[CHAR0_SLOT];
    const needleRight = needleLeft + needleLen;
    const charCodes = this.buf8;
    for (; ; ) {
      let i = haystackLeft;
      let j2 = needleLeft;
      while (charCodes[i] === charCodes[j2]) {
        j2 += 1;
        if (j2 === needleRight) {
          return haystackLeft;
        }
        i += 1;
      }
      haystackLeft += 1;
      if (haystackLeft > haystackEnd) {
        break;
      }
    }
    return -1;
  }
  // Find the right-most instance of substring in main string.
  // WASMable.
  lastIndexOf(haystackBeg, haystackEnd, needleLeft, needleLen) {
    if (needleLen === 0) {
      return haystackBeg;
    }
    let haystackLeft = haystackEnd - needleLen;
    if (haystackLeft < haystackBeg) {
      return -1;
    }
    needleLeft += this.buf32[CHAR0_SLOT];
    const needleRight = needleLeft + needleLen;
    const charCodes = this.buf8;
    for (; ; ) {
      let i = haystackLeft;
      let j2 = needleLeft;
      while (charCodes[i] === charCodes[j2]) {
        j2 += 1;
        if (j2 === needleRight) {
          return haystackLeft;
        }
        i += 1;
      }
      if (haystackLeft === haystackBeg) {
        break;
      }
      haystackLeft -= 1;
    }
    return -1;
  }
  dumpTrie(iroot) {
    for (const s of this.trieIterator(iroot)) {
      console.log(s);
    }
  }
  trieIterator(iroot) {
    return {
      value: void 0,
      done: false,
      next() {
        if (this.icell === 0) {
          if (this.forks.length === 0) {
            this.value = void 0;
            this.done = true;
            return this;
          }
          this.pattern = this.forks.pop();
          this.dir = this.forks.pop();
          this.icell = this.forks.pop();
        }
        const buf32 = this.container.buf32;
        const buf8 = this.container.buf8;
        for (; ; ) {
          const ialt = buf32[this.icell + CELL_OR];
          const v2 = buf32[this.icell + SEGMENT_INFO];
          const offset = v2 & 16777215;
          let i0 = buf32[CHAR0_SLOT] + offset;
          const len = v2 >>> 24;
          for (let i = 0; i < len; i++) {
            this.charBuf[i] = buf8[i0 + i];
          }
          if (len !== 0 && ialt !== 0) {
            this.forks.push(ialt, this.dir, this.pattern);
          }
          const inext = buf32[this.icell + CELL_AND];
          if (len !== 0) {
            const s = this.textDecoder.decode(
              new Uint8Array(this.charBuf.buffer, 0, len)
            );
            if (this.dir > 0) {
              this.pattern += s;
            } else if (this.dir < 0) {
              this.pattern = s + this.pattern;
            }
          }
          this.icell = inext;
          if (len !== 0) {
            continue;
          }
          if (ialt !== 0) {
            if (inext === 0) {
              this.icell = ialt;
              this.dir = -1;
            } else {
              this.forks.push(ialt, -1, this.pattern);
            }
          }
          if (offset !== 0) {
            this.value = { pattern: this.pattern, iextra: offset };
            return this;
          }
        }
      },
      container: this,
      icell: iroot,
      charBuf: new Uint8Array(256),
      pattern: "",
      dir: 1,
      forks: [],
      textDecoder: new TextDecoder(),
      [Symbol.iterator]() {
        return this;
      }
    };
  }
  async enableWASM(wasmModuleFetcher, path) {
    if (typeof WebAssembly !== "object") {
      return false;
    }
    if (this.wasmMemory instanceof WebAssembly.Memory) {
      return true;
    }
    const module = await getWasmModule(wasmModuleFetcher, path);
    if (module instanceof WebAssembly.Module === false) {
      return false;
    }
    const memory = new WebAssembly.Memory({
      initial: roundToPageSize(this.buf8.length) >>> 16
    });
    const instance = await WebAssembly.instantiate(module, {
      imports: { memory, extraHandler: this.extraHandler }
    });
    if (instance instanceof WebAssembly.Instance === false) {
      return false;
    }
    this.wasmMemory = memory;
    const curPageCount = memory.buffer.byteLength >>> 16;
    const newPageCount = roundToPageSize(this.buf8.byteLength) >>> 16;
    if (newPageCount > curPageCount) {
      memory.grow(newPageCount - curPageCount);
    }
    const buf8 = new Uint8Array(memory.buffer);
    buf8.set(this.buf8);
    this.buf8 = buf8;
    this.buf32 = new Uint32Array(this.buf8.buffer);
    this.haystack = this.buf8.subarray(
      HAYSTACK_START,
      HAYSTACK_START + HAYSTACK_SIZE
    );
    this.matches = instance.exports.matches;
    this.startsWith = instance.exports.startsWith;
    this.indexOf = instance.exports.indexOf;
    this.lastIndexOf = instance.exports.lastIndexOf;
    return true;
  }
  dumpInfo() {
    return [
      `Buffer size (Uint8Array): ${this.buf32[CHAR1_SLOT].toLocaleString("en")}`,
      `WASM: ${this.wasmMemory === null ? "disabled" : "enabled"}`
    ].join("\n");
  }
  //--------------------------------------------------------------------------
  // Private methods
  //--------------------------------------------------------------------------
  allocateCell() {
    let icell = this.buf32[TRIE1_SLOT];
    this.buf32[TRIE1_SLOT] = icell + CELL_BYTE_LENGTH;
    icell >>>= 2;
    this.buf32[icell + 0] = 0;
    this.buf32[icell + 1] = 0;
    this.buf32[icell + 2] = 0;
    return icell;
  }
  addCell(iand, ior, v2) {
    const icell = this.allocateCell();
    this.buf32[icell + CELL_AND] = iand;
    this.buf32[icell + CELL_OR] = ior;
    this.buf32[icell + SEGMENT_INFO] = v2;
    return icell;
  }
  growBuf(trieGrow, charGrow) {
    const char0 = Math.max(
      roundToPageSize(this.buf32[TRIE1_SLOT] + trieGrow),
      this.buf32[CHAR0_SLOT]
    );
    const char1 = char0 + this.buf32[CHAR1_SLOT] - this.buf32[CHAR0_SLOT];
    const bufLen = Math.max(
      roundToPageSize(char1 + charGrow),
      this.buf8.length
    );
    if (bufLen > this.buf8.length) {
      this.reallocateBuf(bufLen);
    }
    if (char0 !== this.buf32[CHAR0_SLOT]) {
      this.buf8.copyWithin(
        char0,
        this.buf32[CHAR0_SLOT],
        this.buf32[CHAR1_SLOT]
      );
      this.buf32[CHAR0_SLOT] = char0;
      this.buf32[CHAR1_SLOT] = char1;
    }
  }
  shrinkBuf() {
    const char0 = this.buf32[TRIE1_SLOT] + MIN_FREE_CELL_BYTE_LENGTH;
    const char1 = char0 + this.buf32[CHAR1_SLOT] - this.buf32[CHAR0_SLOT];
    const bufLen = char1 + 256;
    if (char0 !== this.buf32[CHAR0_SLOT]) {
      this.buf8.copyWithin(
        char0,
        this.buf32[CHAR0_SLOT],
        this.buf32[CHAR1_SLOT]
      );
      this.buf32[CHAR0_SLOT] = char0;
      this.buf32[CHAR1_SLOT] = char1;
    }
    if (bufLen < this.buf8.length) {
      this.reallocateBuf(bufLen);
    }
  }
  reallocateBuf(newSize) {
    newSize = roundToPageSize(newSize);
    if (newSize === this.buf8.length) {
      return;
    }
    if (this.wasmMemory === null) {
      const newBuf = new Uint8Array(newSize);
      newBuf.set(
        newBuf.length < this.buf8.length ? this.buf8.subarray(0, newBuf.length) : this.buf8
      );
      this.buf8 = newBuf;
    } else {
      const growBy = (newSize + 65535 >>> 16) - (this.buf8.length >>> 16);
      if (growBy <= 0) {
        return;
      }
      this.wasmMemory.grow(growBy);
      this.buf8 = new Uint8Array(this.wasmMemory.buffer);
    }
    this.buf32 = new Uint32Array(this.buf8.buffer);
    this.haystack = this.buf8.subarray(
      HAYSTACK_START,
      HAYSTACK_START + HAYSTACK_SIZE
    );
  }
};
var getWasmModule = /* @__PURE__ */ (() => {
  let wasmModulePromise;
  return async function(wasmModuleFetcher, path) {
    if (wasmModulePromise instanceof Promise) {
      return wasmModulePromise;
    }
    if (typeof WebAssembly !== "object") {
      return;
    }
    if (typeof vAPI === "object" && vAPI.canWASM !== true) {
      return;
    }
    const uint32s = new Uint32Array(1);
    const uint8s = new Uint8Array(uint32s.buffer);
    uint32s[0] = 1;
    if (uint8s[0] !== 1) {
      return;
    }
    wasmModulePromise = wasmModuleFetcher(`${path}biditrie`).catch((reason) => {
      console.info(reason);
    });
    return wasmModulePromise;
  };
})();
var biditrie_default = BidiTrieContainer;

// ubo-src/js/static-filtering-io.js
var serialize = JSON.stringify;
var unserialize = JSON.parse;
var blockStartPrefix = "#block-start-";
var blockEndPrefix = "#block-end-";
var CompiledListWriter = class {
  static {
    __name(this, "CompiledListWriter");
  }
  constructor() {
    this.blockId = void 0;
    this.block = void 0;
    this.blocks = /* @__PURE__ */ new Map();
    this.properties = /* @__PURE__ */ new Map();
  }
  push(args) {
    this.block.push(serialize(args));
  }
  pushMany(many) {
    for (const args of many) {
      this.block.push(serialize(args));
    }
  }
  last() {
    if (Array.isArray(this.block) && this.block.length !== 0) {
      return this.block[this.block.length - 1];
    }
  }
  select(blockId) {
    if (blockId === this.blockId) {
      return;
    }
    this.blockId = blockId;
    this.block = this.blocks.get(blockId);
    if (this.block === void 0) {
      this.blocks.set(blockId, this.block = []);
    }
    return this;
  }
  toString() {
    const result = [];
    const sortedBlocks = Array.from(this.blocks).sort((a, b2) => a[0] - b2[0]);
    for (const [id, lines] of sortedBlocks) {
      if (lines.length === 0) {
        continue;
      }
      result.push(
        blockStartPrefix + id,
        lines.join("\n"),
        blockEndPrefix + id
      );
    }
    return result.join("\n");
  }
  static serialize(arg) {
    return serialize(arg);
  }
};
var CompiledListReader = class {
  static {
    __name(this, "CompiledListReader");
  }
  constructor(raw, blockId) {
    this.block = "";
    this.len = 0;
    this.offset = 0;
    this.line = "";
    this.blocks = /* @__PURE__ */ new Map();
    this.properties = /* @__PURE__ */ new Map();
    const reBlockStart = new RegExp(`^${blockStartPrefix}([\\w:]+)\\n`, "gm");
    let match = reBlockStart.exec(raw);
    while (match !== null) {
      const sectionId = match[1];
      const beg = match.index + match[0].length;
      const end = raw.indexOf(blockEndPrefix + sectionId, beg);
      this.blocks.set(sectionId, raw.slice(beg, end));
      reBlockStart.lastIndex = end;
      match = reBlockStart.exec(raw);
    }
    if (blockId !== void 0) {
      this.select(blockId);
    }
  }
  next() {
    if (this.offset === this.len) {
      this.line = "";
      return false;
    }
    let pos = this.block.indexOf("\n", this.offset);
    if (pos !== -1) {
      this.line = this.block.slice(this.offset, pos);
      this.offset = pos + 1;
    } else {
      this.line = this.block.slice(this.offset);
      this.offset = this.len;
    }
    return true;
  }
  select(blockId) {
    this.block = this.blocks.get(blockId) || "";
    this.len = this.block.length;
    this.offset = 0;
    return this;
  }
  fingerprint() {
    return this.line;
  }
  args() {
    return unserialize(this.line);
  }
  static unserialize(arg) {
    return unserialize(arg);
  }
};

// ubo-src/lib/publicsuffixlist/publicsuffixlist.js
var publicsuffixlist_default = /* @__PURE__ */ (function() {
  const HOSTNAME_SLOT = 0;
  const LABEL_INDICES_SLOT = 256;
  const RULES_PTR_SLOT = 100;
  const SUFFIX_NOT_FOUND_SLOT = 399;
  const CHARDATA_PTR_SLOT = 101;
  const EMPTY_STRING = "";
  const SELFIE_MAGIC = 3;
  let wasmMemory;
  let pslBuffer32;
  let pslBuffer8;
  let pslByteLength = 0;
  let hostnameArg = EMPTY_STRING;
  const fireChangedEvent = /* @__PURE__ */ __name(function() {
    if (typeof window !== "object") {
      return;
    }
    if (window instanceof Object === false) {
      return;
    }
    if (window.dispatchEvent instanceof Function === false) {
      return;
    }
    if (window.CustomEvent instanceof Function === false) {
      return;
    }
    window.dispatchEvent(new CustomEvent("publicSuffixListChanged"));
  }, "fireChangedEvent");
  const allocateBuffers = /* @__PURE__ */ __name(function(byteLength) {
    pslByteLength = byteLength + 3 & ~3;
    if (pslBuffer32 !== void 0 && pslBuffer32.byteLength >= pslByteLength) {
      return;
    }
    if (wasmMemory !== void 0) {
      const newPageCount = pslByteLength + 65535 >>> 16;
      const curPageCount = wasmMemory.buffer.byteLength >>> 16;
      const delta = newPageCount - curPageCount;
      if (delta > 0) {
        wasmMemory.grow(delta);
        pslBuffer32 = new Uint32Array(wasmMemory.buffer);
        pslBuffer8 = new Uint8Array(wasmMemory.buffer);
      }
    } else {
      pslBuffer8 = new Uint8Array(pslByteLength);
      pslBuffer32 = new Uint32Array(pslBuffer8.buffer);
    }
    hostnameArg = EMPTY_STRING;
    pslBuffer8[LABEL_INDICES_SLOT] = 0;
  }, "allocateBuffers");
  const parse = /* @__PURE__ */ __name(function(text, toAscii) {
    const rootRule = {
      l: EMPTY_STRING,
      // l => label
      f: 0,
      // f => flags
      c: void 0
      // c => children
    };
    {
      const compareLabels = /* @__PURE__ */ __name(function(a, b2) {
        let n = a.length;
        let d2 = n - b2.length;
        if (d2 !== 0) {
          return d2;
        }
        for (let i = 0; i < n; i++) {
          d2 = a.charCodeAt(i) - b2.charCodeAt(i);
          if (d2 !== 0) {
            return d2;
          }
        }
        return 0;
      }, "compareLabels");
      const addToTree = /* @__PURE__ */ __name(function(rule, exception) {
        let node = rootRule;
        let end = rule.length;
        while (end > 0) {
          const beg = rule.lastIndexOf(".", end - 1);
          const label = rule.slice(beg + 1, end);
          end = beg;
          if (Array.isArray(node.c) === false) {
            const child = { l: label, f: 0, c: void 0 };
            node.c = [child];
            node = child;
            continue;
          }
          let left = 0;
          let right = node.c.length;
          while (left < right) {
            const i = left + right >>> 1;
            const d2 = compareLabels(label, node.c[i].l);
            if (d2 < 0) {
              right = i;
              if (right === left) {
                const child = {
                  l: label,
                  f: 0,
                  c: void 0
                };
                node.c.splice(left, 0, child);
                node = child;
                break;
              }
              continue;
            }
            if (d2 > 0) {
              left = i + 1;
              if (left === right) {
                const child = {
                  l: label,
                  f: 0,
                  c: void 0
                };
                node.c.splice(right, 0, child);
                node = child;
                break;
              }
              continue;
            }
            node = node.c[i];
            break;
          }
        }
        node.f |= 1;
        if (exception) {
          node.f |= 2;
        }
      }, "addToTree");
      addToTree("*", false);
      const mustPunycode = /[^a-z0-9.-]/;
      const textEnd = text.length;
      let lineBeg = 0;
      while (lineBeg < textEnd) {
        let lineEnd = text.indexOf("\n", lineBeg);
        if (lineEnd === -1) {
          lineEnd = text.indexOf("\r", lineBeg);
          if (lineEnd === -1) {
            lineEnd = textEnd;
          }
        }
        let line = text.slice(lineBeg, lineEnd).trim();
        lineBeg = lineEnd + 1;
        const pos = line.indexOf("//");
        if (pos !== -1) {
          line = line.slice(0, pos);
        }
        line = line.trim();
        if (line.length === 0) {
          continue;
        }
        const exception = line.charCodeAt(0) === 33;
        if (exception) {
          line = line.slice(1);
        }
        if (mustPunycode.test(line)) {
          line = toAscii(line.toLowerCase());
        }
        addToTree(line, exception);
      }
    }
    {
      const labelToOffsetMap = /* @__PURE__ */ new Map();
      const treeData = [];
      const charData = [];
      const allocate = /* @__PURE__ */ __name(function(n) {
        const ibuf = treeData.length;
        for (let i = 0; i < n; i++) {
          treeData.push(0);
        }
        return ibuf;
      }, "allocate");
      const storeNode = /* @__PURE__ */ __name(function(ibuf, node) {
        const nChars = node.l.length;
        const nChildren = node.c !== void 0 ? node.c.length : 0;
        treeData[ibuf + 0] = nChildren << 16 | node.f << 8 | nChars;
        if (nChars <= 4) {
          let v2 = 0;
          if (nChars > 0) {
            v2 |= node.l.charCodeAt(0);
            if (nChars > 1) {
              v2 |= node.l.charCodeAt(1) << 8;
              if (nChars > 2) {
                v2 |= node.l.charCodeAt(2) << 16;
                if (nChars > 3) {
                  v2 |= node.l.charCodeAt(3) << 24;
                }
              }
            }
          }
          treeData[ibuf + 1] = v2;
        } else {
          let offset = labelToOffsetMap.get(node.l);
          if (offset === void 0) {
            offset = charData.length;
            for (let i = 0; i < nChars; i++) {
              charData.push(node.l.charCodeAt(i));
            }
            labelToOffsetMap.set(node.l, offset);
          }
          treeData[ibuf + 1] = offset;
        }
        if (Array.isArray(node.c) === false) {
          treeData[ibuf + 2] = 0;
          return;
        }
        const iarray = allocate(nChildren * 3);
        treeData[ibuf + 2] = iarray;
        for (let i = 0; i < nChildren; i++) {
          storeNode(iarray + i * 3, node.c[i]);
        }
      }, "storeNode");
      allocate(512 >> 2);
      const iRootRule = allocate(3);
      storeNode(iRootRule, rootRule);
      treeData[RULES_PTR_SLOT] = iRootRule;
      const iCharData = treeData.length << 2;
      treeData[CHARDATA_PTR_SLOT] = iCharData;
      const byteLength = (treeData.length << 2) + (charData.length + 3 & ~3);
      allocateBuffers(byteLength);
      pslBuffer32.set(treeData);
      pslBuffer8.set(charData, treeData.length << 2);
    }
    fireChangedEvent();
  }, "parse");
  const setHostnameArg = /* @__PURE__ */ __name(function(hostname) {
    const buf = pslBuffer8;
    if (hostname === hostnameArg) {
      return buf[LABEL_INDICES_SLOT];
    }
    if (hostname === null || hostname.length === 0) {
      hostnameArg = EMPTY_STRING;
      return buf[LABEL_INDICES_SLOT] = 0;
    }
    hostname = hostname.toLowerCase();
    hostnameArg = hostname;
    let n = hostname.length;
    if (n > 255) {
      n = 255;
    }
    buf[LABEL_INDICES_SLOT] = n;
    let i = n;
    let j2 = LABEL_INDICES_SLOT + 1;
    while (i--) {
      const c = hostname.charCodeAt(i);
      if (c === 46) {
        buf[j2 + 0] = i + 1;
        buf[j2 + 1] = i;
        j2 += 2;
      }
      buf[i] = c;
    }
    buf[j2] = 0;
    return n;
  }, "setHostnameArg");
  const getPublicSuffixPosJS = /* @__PURE__ */ __name(function() {
    const buf8 = pslBuffer8;
    const buf32 = pslBuffer32;
    const iCharData = buf32[CHARDATA_PTR_SLOT];
    let iNode = pslBuffer32[RULES_PTR_SLOT];
    let cursorPos = -1;
    let iLabel = LABEL_INDICES_SLOT;
    for (; ; ) {
      const labelBeg = buf8[iLabel + 1];
      const labelLen = buf8[iLabel + 0] - labelBeg;
      let r = buf32[iNode + 0] >>> 16;
      if (r === 0) {
        break;
      }
      const iCandidates = buf32[iNode + 2];
      let l = 0;
      let iFound = 0;
      while (l < r) {
        const iCandidate = l + r >>> 1;
        const iCandidateNode = iCandidates + iCandidate + (iCandidate << 1);
        const candidateLen = buf32[iCandidateNode + 0] & 255;
        let d2 = labelLen - candidateLen;
        if (d2 === 0) {
          const iCandidateChar = candidateLen <= 4 ? iCandidateNode + 1 << 2 : iCharData + buf32[iCandidateNode + 1];
          for (let i = 0; i < labelLen; i++) {
            d2 = buf8[labelBeg + i] - buf8[iCandidateChar + i];
            if (d2 !== 0) {
              break;
            }
          }
        }
        if (d2 < 0) {
          r = iCandidate;
        } else if (d2 > 0) {
          l = iCandidate + 1;
        } else {
          iFound = iCandidateNode;
          break;
        }
      }
      if (iFound === 0) {
        if (buf32[iCandidates + 1] !== 42) {
          break;
        }
        buf8[SUFFIX_NOT_FOUND_SLOT] = 1;
        iFound = iCandidates;
      }
      iNode = iFound;
      if ((buf32[iNode + 0] & 512) !== 0) {
        if (iLabel > LABEL_INDICES_SLOT) {
          return iLabel - 2;
        }
        break;
      }
      if ((buf32[iNode + 0] & 256) !== 0) {
        cursorPos = iLabel;
      }
      if (labelBeg === 0) {
        break;
      }
      iLabel += 2;
    }
    return cursorPos;
  }, "getPublicSuffixPosJS");
  let getPublicSuffixPosWASM;
  let getPublicSuffixPos = getPublicSuffixPosJS;
  const getPublicSuffix = /* @__PURE__ */ __name(function(hostname) {
    if (pslBuffer32 === void 0) {
      return EMPTY_STRING;
    }
    const hostnameLen = setHostnameArg(hostname);
    const buf8 = pslBuffer8;
    if (hostnameLen === 0 || buf8[0] === 46) {
      return EMPTY_STRING;
    }
    const cursorPos = getPublicSuffixPos();
    if (cursorPos === -1) {
      return EMPTY_STRING;
    }
    const beg = buf8[cursorPos + 1];
    return beg === 0 ? hostnameArg : hostnameArg.slice(beg);
  }, "getPublicSuffix");
  const getDomain = /* @__PURE__ */ __name(function(hostname) {
    if (pslBuffer32 === void 0) {
      return EMPTY_STRING;
    }
    const hostnameLen = setHostnameArg(hostname);
    const buf8 = pslBuffer8;
    if (hostnameLen === 0 || buf8[0] === 46) {
      return EMPTY_STRING;
    }
    const cursorPos = getPublicSuffixPos();
    if (cursorPos === -1 || buf8[cursorPos + 1] === 0) {
      return EMPTY_STRING;
    }
    const beg = buf8[cursorPos + 3];
    return beg === 0 ? hostnameArg : hostnameArg.slice(beg);
  }, "getDomain");
  const suffixInPSL = /* @__PURE__ */ __name(function(hostname) {
    if (pslBuffer32 === void 0) {
      return false;
    }
    const hostnameLen = setHostnameArg(hostname);
    const buf8 = pslBuffer8;
    if (hostnameLen === 0 || buf8[0] === 46) {
      return false;
    }
    buf8[SUFFIX_NOT_FOUND_SLOT] = 0;
    const cursorPos = getPublicSuffixPos();
    return cursorPos !== -1 && buf8[cursorPos + 1] === 0 && buf8[SUFFIX_NOT_FOUND_SLOT] !== 1;
  }, "suffixInPSL");
  const toSelfie = /* @__PURE__ */ __name(function(encoder) {
    if (pslBuffer8 === void 0) {
      return "";
    }
    if (encoder instanceof Object) {
      const bufferStr = encoder.encode(pslBuffer8.buffer, pslByteLength);
      return `${SELFIE_MAGIC}	${bufferStr}`;
    }
    return {
      magic: SELFIE_MAGIC,
      buf32: pslBuffer32.subarray(0, pslByteLength >> 2)
    };
  }, "toSelfie");
  const fromSelfie = /* @__PURE__ */ __name(function(selfie, decoder) {
    let byteLength = 0;
    if (typeof selfie === "string" && selfie.length !== 0 && decoder instanceof Object) {
      const pos = selfie.indexOf("	");
      if (pos === -1 || selfie.slice(0, pos) !== `${SELFIE_MAGIC}`) {
        return false;
      }
      const bufferStr = selfie.slice(pos + 1);
      byteLength = decoder.decodeSize(bufferStr);
      if (byteLength === 0) {
        return false;
      }
      allocateBuffers(byteLength);
      decoder.decode(bufferStr, pslBuffer8.buffer);
    } else if (selfie instanceof Object && selfie.magic === SELFIE_MAGIC && selfie.buf32 instanceof Uint32Array) {
      byteLength = selfie.buf32.length << 2;
      allocateBuffers(byteLength);
      pslBuffer32.set(selfie.buf32);
    } else {
      return false;
    }
    hostnameArg = EMPTY_STRING;
    pslBuffer8[LABEL_INDICES_SLOT] = 0;
    fireChangedEvent();
    return true;
  }, "fromSelfie");
  const enableWASM = /* @__PURE__ */ (() => {
    let wasmPromise;
    const getWasmInstance = /* @__PURE__ */ __name(async function(wasmModuleFetcher, path) {
      if (typeof WebAssembly !== "object") {
        return false;
      }
      const uint32s = new Uint32Array(1);
      const uint8s = new Uint8Array(uint32s.buffer);
      uint32s[0] = 1;
      if (uint8s[0] !== 1) {
        return false;
      }
      try {
        const module = await wasmModuleFetcher(`${path}publicsuffixlist`);
        if (module instanceof WebAssembly.Module === false) {
          return false;
        }
        const pageCount = pslBuffer8 !== void 0 ? pslBuffer8.byteLength + 65535 >>> 16 : 1;
        const memory = new WebAssembly.Memory({ initial: pageCount });
        const instance = await WebAssembly.instantiate(module, {
          imports: { memory }
        });
        if (instance instanceof WebAssembly.Instance === false) {
          return false;
        }
        const curPageCount = memory.buffer.byteLength >>> 16;
        const newPageCount = pslBuffer8 !== void 0 ? pslBuffer8.byteLength + 65535 >>> 16 : 0;
        if (newPageCount > curPageCount) {
          memory.grow(newPageCount - curPageCount);
        }
        if (pslBuffer32 !== void 0) {
          const buf8 = new Uint8Array(memory.buffer);
          const buf32 = new Uint32Array(memory.buffer);
          buf32.set(pslBuffer32);
          pslBuffer8 = buf8;
          pslBuffer32 = buf32;
        }
        wasmMemory = memory;
        getPublicSuffixPosWASM = instance.exports.getPublicSuffixPos;
        getPublicSuffixPos = getPublicSuffixPosWASM;
        return true;
      } catch (reason) {
        console.info(reason);
      }
      return false;
    }, "getWasmInstance");
    return async function(wasmModuleFetcher, path) {
      if (getPublicSuffixPosWASM instanceof Function) {
        return true;
      }
      if (wasmPromise instanceof Promise === false) {
        wasmPromise = getWasmInstance(wasmModuleFetcher, path);
      }
      return wasmPromise;
    };
  })();
  const disableWASM = /* @__PURE__ */ __name(function() {
    if (getPublicSuffixPosWASM instanceof Function) {
      getPublicSuffixPos = getPublicSuffixPosJS;
      getPublicSuffixPosWASM = void 0;
    }
    if (wasmMemory === void 0) {
      return;
    }
    if (pslBuffer32 !== void 0) {
      const buf8 = new Uint8Array(pslByteLength);
      const buf32 = new Uint32Array(buf8.buffer);
      buf32.set(pslBuffer32);
      pslBuffer8 = buf8;
      pslBuffer32 = buf32;
    }
    wasmMemory = void 0;
  }, "disableWASM");
  return {
    version: "2.0",
    parse,
    getDomain,
    suffixInPSL,
    getPublicSuffix,
    toSelfie,
    fromSelfie,
    disableWASM,
    enableWASM
  };
})();

// ubo-src/lib/punycode.js
var punycode_default = (function() {
  var punycode, maxInt = 2147483647, base = 36, tMin = 1, tMax = 26, skew = 38, damp = 700, initialBias = 72, initialN = 128, delimiter = "-", regexPunycode = /^xn--/, regexNonASCII = /[^\x20-\x7E]/, regexSeparators = /[\x2E\u3002\uFF0E\uFF61]/g, errors = {
    "overflow": "Overflow: input needs wider integers to process",
    "not-basic": "Illegal input >= 0x80 (not a basic code point)",
    "invalid-input": "Invalid input"
  }, baseMinusTMin = base - tMin, floor = Math.floor, stringFromCharCode = String.fromCharCode, key;
  function error(type) {
    throw new RangeError(errors[type]);
  }
  __name(error, "error");
  function map(array, fn2) {
    var length = array.length;
    var result = [];
    while (length--) {
      result[length] = fn2(array[length]);
    }
    return result;
  }
  __name(map, "map");
  function mapDomain(string, fn2) {
    var parts = string.split("@");
    var result = "";
    if (parts.length > 1) {
      result = parts[0] + "@";
      string = parts[1];
    }
    string = string.replace(regexSeparators, ".");
    var labels = string.split(".");
    var encoded = map(labels, fn2).join(".");
    return result + encoded;
  }
  __name(mapDomain, "mapDomain");
  function ucs2decode(string) {
    var output = [], counter = 0, length = string.length, value, extra;
    while (counter < length) {
      value = string.charCodeAt(counter++);
      if (value >= 55296 && value <= 56319 && counter < length) {
        extra = string.charCodeAt(counter++);
        if ((extra & 64512) == 56320) {
          output.push(((value & 1023) << 10) + (extra & 1023) + 65536);
        } else {
          output.push(value);
          counter--;
        }
      } else {
        output.push(value);
      }
    }
    return output;
  }
  __name(ucs2decode, "ucs2decode");
  function ucs2encode(array) {
    return map(array, function(value) {
      var output = "";
      if (value > 65535) {
        value -= 65536;
        output += stringFromCharCode(value >>> 10 & 1023 | 55296);
        value = 56320 | value & 1023;
      }
      output += stringFromCharCode(value);
      return output;
    }).join("");
  }
  __name(ucs2encode, "ucs2encode");
  function basicToDigit(codePoint) {
    if (codePoint - 48 < 10) {
      return codePoint - 22;
    }
    if (codePoint - 65 < 26) {
      return codePoint - 65;
    }
    if (codePoint - 97 < 26) {
      return codePoint - 97;
    }
    return base;
  }
  __name(basicToDigit, "basicToDigit");
  function digitToBasic(digit, flag) {
    return digit + 22 + 75 * (digit < 26) - ((flag != 0) << 5);
  }
  __name(digitToBasic, "digitToBasic");
  function adapt(delta, numPoints, firstTime) {
    var k2 = 0;
    delta = firstTime ? floor(delta / damp) : delta >> 1;
    delta += floor(delta / numPoints);
    for (; delta > baseMinusTMin * tMax >> 1; k2 += base) {
      delta = floor(delta / baseMinusTMin);
    }
    return floor(k2 + (baseMinusTMin + 1) * delta / (delta + skew));
  }
  __name(adapt, "adapt");
  function decode(input) {
    var output = [], inputLength = input.length, out, i = 0, n = initialN, bias = initialBias, basic, j2, index, oldi, w2, k2, digit, t, baseMinusT;
    basic = input.lastIndexOf(delimiter);
    if (basic < 0) {
      basic = 0;
    }
    for (j2 = 0; j2 < basic; ++j2) {
      if (input.charCodeAt(j2) >= 128) {
        error("not-basic");
      }
      output.push(input.charCodeAt(j2));
    }
    for (index = basic > 0 ? basic + 1 : 0; index < inputLength; ) {
      for (oldi = i, w2 = 1, k2 = base; ; k2 += base) {
        if (index >= inputLength) {
          error("invalid-input");
        }
        digit = basicToDigit(input.charCodeAt(index++));
        if (digit >= base || digit > floor((maxInt - i) / w2)) {
          error("overflow");
        }
        i += digit * w2;
        t = k2 <= bias ? tMin : k2 >= bias + tMax ? tMax : k2 - bias;
        if (digit < t) {
          break;
        }
        baseMinusT = base - t;
        if (w2 > floor(maxInt / baseMinusT)) {
          error("overflow");
        }
        w2 *= baseMinusT;
      }
      out = output.length + 1;
      bias = adapt(i - oldi, out, oldi == 0);
      if (floor(i / out) > maxInt - n) {
        error("overflow");
      }
      n += floor(i / out);
      i %= out;
      output.splice(i++, 0, n);
    }
    return ucs2encode(output);
  }
  __name(decode, "decode");
  function encode(input) {
    var n, delta, handledCPCount, basicLength, bias, j2, m, q2, k2, t, currentValue, output = [], inputLength, handledCPCountPlusOne, baseMinusT, qMinusT;
    input = ucs2decode(input);
    inputLength = input.length;
    n = initialN;
    delta = 0;
    bias = initialBias;
    for (j2 = 0; j2 < inputLength; ++j2) {
      currentValue = input[j2];
      if (currentValue < 128) {
        output.push(stringFromCharCode(currentValue));
      }
    }
    handledCPCount = basicLength = output.length;
    if (basicLength) {
      output.push(delimiter);
    }
    while (handledCPCount < inputLength) {
      for (m = maxInt, j2 = 0; j2 < inputLength; ++j2) {
        currentValue = input[j2];
        if (currentValue >= n && currentValue < m) {
          m = currentValue;
        }
      }
      handledCPCountPlusOne = handledCPCount + 1;
      if (m - n > floor((maxInt - delta) / handledCPCountPlusOne)) {
        error("overflow");
      }
      delta += (m - n) * handledCPCountPlusOne;
      n = m;
      for (j2 = 0; j2 < inputLength; ++j2) {
        currentValue = input[j2];
        if (currentValue < n && ++delta > maxInt) {
          error("overflow");
        }
        if (currentValue == n) {
          for (q2 = delta, k2 = base; ; k2 += base) {
            t = k2 <= bias ? tMin : k2 >= bias + tMax ? tMax : k2 - bias;
            if (q2 < t) {
              break;
            }
            qMinusT = q2 - t;
            baseMinusT = base - t;
            output.push(
              stringFromCharCode(digitToBasic(t + qMinusT % baseMinusT, 0))
            );
            q2 = floor(qMinusT / baseMinusT);
          }
          output.push(stringFromCharCode(digitToBasic(q2, 0)));
          bias = adapt(delta, handledCPCountPlusOne, handledCPCount == basicLength);
          delta = 0;
          ++handledCPCount;
        }
      }
      ++delta;
      ++n;
    }
    return output.join("");
  }
  __name(encode, "encode");
  function toUnicode(input) {
    return mapDomain(input, function(string) {
      return regexPunycode.test(string) ? decode(string.slice(4).toLowerCase()) : string;
    });
  }
  __name(toUnicode, "toUnicode");
  function toASCII(input) {
    return mapDomain(input, function(string) {
      return regexNonASCII.test(string) ? "xn--" + encode(string) : string;
    });
  }
  __name(toASCII, "toASCII");
  punycode = {
    /**
     * A string representing the current Punycode.js version number.
     * @memberOf punycode
     * @type String
     */
    "version": "1.3.2",
    /**
     * An object of methods to convert from JavaScript's internal character
     * representation (UCS-2) to Unicode code points, and back.
     * @see <https://mathiasbynens.be/notes/javascript-encoding>
     * @memberOf punycode
     * @type Object
     */
    "ucs2": {
      "decode": ucs2decode,
      "encode": ucs2encode
    },
    "decode": decode,
    "encode": encode,
    "toASCII": toASCII,
    "toUnicode": toUnicode
  };
  return punycode;
})();

// ubo-src/js/uri-utils.js
var reHostnameFromCommonURL = /^https:\/\/[0-9a-z._-]+[0-9a-z]\//;
var reAuthorityFromURI = /^(?:[^:/?#]+:)?(\/\/[^/?#]+)/;
var reHostFromNakedAuthority = /^[0-9a-z._-]+[0-9a-z]$/i;
var reHostFromAuthority = /^(?:[^@]*@)?([^:]+)(?::\d*)?$/;
var reIPv6FromAuthority = /^(?:[^@]*@)?(\[[0-9a-f:]+\])(?::\d*)?$/i;
var reMustNormalizeHostname = /[^0-9a-z._-]/;
var reOriginFromURI = /^[^:/?#]+:\/\/[^/?#]+/;
var reIPAddressNaive = /^\d+\.\d+\.\d+\.\d+$|^\[[\da-zA-Z:]+\]$/;
function domainFromHostname(hostname) {
  return reIPAddressNaive.test(hostname) ? hostname : publicsuffixlist_default.getDomain(hostname);
}
__name(domainFromHostname, "domainFromHostname");
function hostnameFromURI(uri) {
  let match = reHostnameFromCommonURL.exec(uri);
  if (match !== null) {
    return match[0].slice(8, -1);
  }
  match = reAuthorityFromURI.exec(uri);
  if (match === null) {
    return "";
  }
  const authority = match[1].slice(2);
  if (reHostFromNakedAuthority.test(authority)) {
    return authority.toLowerCase();
  }
  match = reHostFromAuthority.exec(authority);
  if (match === null) {
    match = reIPv6FromAuthority.exec(authority);
    if (match === null) {
      return "";
    }
  }
  let hostname = match[1];
  while (hostname.endsWith(".")) {
    hostname = hostname.slice(0, -1);
  }
  if (reMustNormalizeHostname.test(hostname)) {
    hostname = punycode_default.toASCII(hostname.toLowerCase());
  }
  return hostname;
}
__name(hostnameFromURI, "hostnameFromURI");
function originFromURI(uri) {
  let match = reHostnameFromCommonURL.exec(uri);
  if (match !== null) {
    return match[0].slice(0, -1);
  }
  match = reOriginFromURI.exec(uri);
  return match !== null ? match[0].toLowerCase() : "";
}
__name(originFromURI, "originFromURI");

// ubo-src/js/filtering-context.js
var NO_TYPE = 0;
var BEACON = 1 << 0;
var CSP_REPORT = 1 << 1;
var FONT = 1 << 2;
var IMAGE = 1 << 4;
var IMAGESET = 1 << 4;
var MAIN_FRAME = 1 << 5;
var MEDIA = 1 << 6;
var OBJECT = 1 << 7;
var OBJECT_SUBREQUEST = 1 << 7;
var PING = 1 << 8;
var SCRIPT = 1 << 9;
var STYLESHEET = 1 << 10;
var SUB_FRAME = 1 << 11;
var WEBSOCKET = 1 << 12;
var XMLHTTPREQUEST = 1 << 13;
var INLINE_FONT = 1 << 14;
var INLINE_SCRIPT = 1 << 15;
var OTHER = 1 << 16;
var FRAME_ANY = MAIN_FRAME | SUB_FRAME | OBJECT;
var FONT_ANY = FONT | INLINE_FONT;
var INLINE_ANY = INLINE_FONT | INLINE_SCRIPT;
var PING_ANY = BEACON | CSP_REPORT | PING;
var SCRIPT_ANY = SCRIPT | INLINE_SCRIPT;
var typeStrToIntMap = {
  "no_type": NO_TYPE,
  "beacon": BEACON,
  "csp_report": CSP_REPORT,
  "font": FONT,
  "image": IMAGE,
  "imageset": IMAGESET,
  "main_frame": MAIN_FRAME,
  "media": MEDIA,
  "object": OBJECT,
  "object_subrequest": OBJECT_SUBREQUEST,
  "ping": PING,
  "script": SCRIPT,
  "stylesheet": STYLESHEET,
  "sub_frame": SUB_FRAME,
  "websocket": WEBSOCKET,
  "xmlhttprequest": XMLHTTPREQUEST,
  "inline-font": INLINE_FONT,
  "inline-script": INLINE_SCRIPT,
  "other": OTHER
};
var METHOD_NONE = 0;
var METHOD_CONNECT = 1 << 1;
var METHOD_DELETE = 1 << 2;
var METHOD_GET = 1 << 3;
var METHOD_HEAD = 1 << 4;
var METHOD_OPTIONS = 1 << 5;
var METHOD_PATCH = 1 << 6;
var METHOD_POST = 1 << 7;
var METHOD_PUT = 1 << 8;
var methodStrToBitMap = {
  "": METHOD_NONE,
  "connect": METHOD_CONNECT,
  "delete": METHOD_DELETE,
  "get": METHOD_GET,
  "head": METHOD_HEAD,
  "options": METHOD_OPTIONS,
  "patch": METHOD_PATCH,
  "post": METHOD_POST,
  "put": METHOD_PUT,
  "CONNECT": METHOD_CONNECT,
  "DELETE": METHOD_DELETE,
  "GET": METHOD_GET,
  "HEAD": METHOD_HEAD,
  "OPTIONS": METHOD_OPTIONS,
  "PATCH": METHOD_PATCH,
  "POST": METHOD_POST,
  "PUT": METHOD_PUT
};
var methodBitToStrMap = /* @__PURE__ */ new Map([
  [METHOD_NONE, ""],
  [METHOD_CONNECT, "connect"],
  [METHOD_DELETE, "delete"],
  [METHOD_GET, "get"],
  [METHOD_HEAD, "head"],
  [METHOD_OPTIONS, "options"],
  [METHOD_PATCH, "patch"],
  [METHOD_POST, "post"],
  [METHOD_PUT, "put"]
]);
var reIPv4 = /^\d+\.\d+\.\d+\.\d+$/;
var FilteringContext = class {
  static {
    __name(this, "FilteringContext");
  }
  constructor(other) {
    if (other instanceof FilteringContext) {
      return this.fromFilteringContext(other);
    }
    this.tstamp = 0;
    this.realm = "";
    this.method = 0;
    this.itype = NO_TYPE;
    this.stype = void 0;
    this.url = void 0;
    this.aliasURL = void 0;
    this.hostname = void 0;
    this.domain = void 0;
    this.ipaddress = void 0;
    this.docId = -1;
    this.frameId = -1;
    this.docOrigin = void 0;
    this.docHostname = void 0;
    this.docDomain = void 0;
    this.tabId = void 0;
    this.tabOrigin = void 0;
    this.tabHostname = void 0;
    this.tabDomain = void 0;
    this.redirectURL = void 0;
    this.filter = void 0;
  }
  get type() {
    return this.stype;
  }
  set type(a) {
    this.itype = typeStrToIntMap[a] || NO_TYPE;
    this.stype = a;
  }
  isRootDocument() {
    return (this.itype & MAIN_FRAME) !== 0;
  }
  isDocument() {
    return (this.itype & FRAME_ANY) !== 0;
  }
  isFont() {
    return (this.itype & FONT_ANY) !== 0;
  }
  fromFilteringContext(other) {
    this.realm = other.realm;
    this.type = other.type;
    this.method = other.method;
    this.url = other.url;
    this.hostname = other.hostname;
    this.domain = other.domain;
    this.ipaddress = other.ipaddress;
    this.docId = other.docId;
    this.frameId = other.frameId;
    this.docOrigin = other.docOrigin;
    this.docHostname = other.docHostname;
    this.docDomain = other.docDomain;
    this.tabId = other.tabId;
    this.tabOrigin = other.tabOrigin;
    this.tabHostname = other.tabHostname;
    this.tabDomain = other.tabDomain;
    this.redirectURL = other.redirectURL;
    this.filter = void 0;
    return this;
  }
  fromDetails({ originURL, url, type }) {
    this.setDocOriginFromURL(originURL).setURL(url).setType(type);
    return this;
  }
  duplicate() {
    return new FilteringContext(this);
  }
  setRealm(a) {
    this.realm = a;
    return this;
  }
  setType(a) {
    this.type = a;
    return this;
  }
  setURL(a) {
    if (a !== this.url) {
      this.hostname = this.domain = this.ipaddress = void 0;
      this.url = a;
    }
    return this;
  }
  getHostname() {
    if (this.hostname === void 0) {
      this.hostname = hostnameFromURI(this.url);
    }
    return this.hostname;
  }
  setHostname(a) {
    if (a !== this.hostname) {
      this.domain = void 0;
      this.hostname = a;
    }
    return this;
  }
  getDomain() {
    if (this.domain === void 0) {
      this.domain = domainFromHostname(this.getHostname());
    }
    return this.domain;
  }
  setDomain(a) {
    this.domain = a;
    return this;
  }
  getIPAddress() {
    if (this.ipaddress !== void 0) {
      return this.ipaddress;
    }
    const ipaddr = this.getHostname();
    const c0 = ipaddr.charCodeAt(0);
    if (c0 === 91) {
      return this.ipaddress = ipaddr.slice(1, -1);
    } else if (c0 <= 57 && c0 >= 48) {
      if (reIPv4.test(ipaddr)) {
        return this.ipaddress = ipaddr;
      }
    }
    return this.ipaddress = "";
  }
  // Must always be called *after* setURL()
  setIPAddress(ipaddr) {
    this.ipaddress = ipaddr || void 0;
    return this;
  }
  getDocOrigin() {
    if (this.docOrigin === void 0) {
      this.docOrigin = this.tabOrigin;
    }
    return this.docOrigin;
  }
  setDocOrigin(a) {
    if (a !== this.docOrigin) {
      this.docHostname = this.docDomain = void 0;
      this.docOrigin = a;
    }
    return this;
  }
  setDocOriginFromURL(a) {
    return this.setDocOrigin(originFromURI(a));
  }
  getDocHostname() {
    if (this.docHostname === void 0) {
      this.docHostname = hostnameFromURI(this.getDocOrigin());
    }
    return this.docHostname;
  }
  setDocHostname(a) {
    if (a !== this.docHostname) {
      this.docDomain = void 0;
      this.docHostname = a;
    }
    return this;
  }
  getDocDomain() {
    if (this.docDomain === void 0) {
      this.docDomain = domainFromHostname(this.getDocHostname());
    }
    return this.docDomain;
  }
  setDocDomain(a) {
    this.docDomain = a;
    return this;
  }
  // The idea is to minimize the amount of work done to figure out whether
  // the resource is 3rd-party to the document.
  is3rdPartyToDoc() {
    let docDomain = this.getDocDomain();
    if (docDomain === "") {
      docDomain = this.docHostname;
    }
    if (this.domain !== void 0 && this.domain !== "") {
      return this.domain !== docDomain;
    }
    const hostname = this.getHostname();
    if (hostname.endsWith(docDomain) === false) {
      return true;
    }
    const i = hostname.length - docDomain.length;
    if (i === 0) {
      return false;
    }
    return hostname.charCodeAt(i - 1) !== 46;
  }
  setTabId(a) {
    this.tabId = a;
    return this;
  }
  getTabOrigin() {
    return this.tabOrigin;
  }
  setTabOrigin(a) {
    if (a !== this.tabOrigin) {
      this.tabHostname = this.tabDomain = void 0;
      this.tabOrigin = a;
    }
    return this;
  }
  setTabOriginFromURL(a) {
    return this.setTabOrigin(originFromURI(a));
  }
  getTabHostname() {
    if (this.tabHostname === void 0) {
      this.tabHostname = hostnameFromURI(this.getTabOrigin());
    }
    return this.tabHostname;
  }
  setTabHostname(a) {
    if (a !== this.tabHostname) {
      this.tabDomain = void 0;
      this.tabHostname = a;
    }
    return this;
  }
  getTabDomain() {
    if (this.tabDomain === void 0) {
      this.tabDomain = domainFromHostname(this.getTabHostname());
    }
    return this.tabDomain;
  }
  setTabDomain(a) {
    this.docDomain = a;
    return this;
  }
  // The idea is to minimize the amount of work done to figure out whether
  // the resource is 3rd-party to the top document.
  is3rdPartyToTab() {
    let tabDomain = this.getTabDomain();
    if (tabDomain === "") {
      tabDomain = this.tabHostname;
    }
    if (this.domain !== void 0 && this.domain !== "") {
      return this.domain !== tabDomain;
    }
    const hostname = this.getHostname();
    if (hostname.endsWith(tabDomain) === false) {
      return true;
    }
    const i = hostname.length - tabDomain.length;
    if (i === 0) {
      return false;
    }
    return hostname.charCodeAt(i - 1) !== 46;
  }
  setFilter(a) {
    this.filter = a;
    return this;
  }
  pushFilter(a) {
    if (this.filter === void 0) {
      return this.setFilter(a);
    }
    if (Array.isArray(this.filter)) {
      this.filter.push(a);
    } else {
      this.filter = [this.filter, a];
    }
    return this;
  }
  pushFilters(a) {
    if (this.filter === void 0) {
      return this.setFilter(a);
    }
    if (Array.isArray(this.filter)) {
      this.filter.push(...a);
    } else {
      this.filter = [this.filter, ...a];
    }
    return this;
  }
  setMethod(a) {
    this.method = methodStrToBitMap[a] || 0;
    return this;
  }
  getMethodName() {
    return FilteringContext.getMethodName(this.method);
  }
  static getMethod(a) {
    return methodStrToBitMap[a] || 0;
  }
  static getMethodName(a) {
    return methodBitToStrMap.get(a) || "";
  }
  BEACON = BEACON;
  CSP_REPORT = CSP_REPORT;
  FONT = FONT;
  IMAGE = IMAGE;
  IMAGESET = IMAGESET;
  MAIN_FRAME = MAIN_FRAME;
  MEDIA = MEDIA;
  OBJECT = OBJECT;
  OBJECT_SUBREQUEST = OBJECT_SUBREQUEST;
  PING = PING;
  SCRIPT = SCRIPT;
  STYLESHEET = STYLESHEET;
  SUB_FRAME = SUB_FRAME;
  WEBSOCKET = WEBSOCKET;
  XMLHTTPREQUEST = XMLHTTPREQUEST;
  INLINE_FONT = INLINE_FONT;
  INLINE_SCRIPT = INLINE_SCRIPT;
  OTHER = OTHER;
  FRAME_ANY = FRAME_ANY;
  FONT_ANY = FONT_ANY;
  INLINE_ANY = INLINE_ANY;
  PING_ANY = PING_ANY;
  SCRIPT_ANY = SCRIPT_ANY;
  METHOD_NONE = METHOD_NONE;
  METHOD_CONNECT = METHOD_CONNECT;
  METHOD_DELETE = METHOD_DELETE;
  METHOD_GET = METHOD_GET;
  METHOD_HEAD = METHOD_HEAD;
  METHOD_OPTIONS = METHOD_OPTIONS;
  METHOD_PATCH = METHOD_PATCH;
  METHOD_POST = METHOD_POST;
  METHOD_PUT = METHOD_PUT;
  static BEACON = BEACON;
  static CSP_REPORT = CSP_REPORT;
  static FONT = FONT;
  static IMAGE = IMAGE;
  static IMAGESET = IMAGESET;
  static MAIN_FRAME = MAIN_FRAME;
  static MEDIA = MEDIA;
  static OBJECT = OBJECT;
  static OBJECT_SUBREQUEST = OBJECT_SUBREQUEST;
  static PING = PING;
  static SCRIPT = SCRIPT;
  static STYLESHEET = STYLESHEET;
  static SUB_FRAME = SUB_FRAME;
  static WEBSOCKET = WEBSOCKET;
  static XMLHTTPREQUEST = XMLHTTPREQUEST;
  static INLINE_FONT = INLINE_FONT;
  static INLINE_SCRIPT = INLINE_SCRIPT;
  static OTHER = OTHER;
  static FRAME_ANY = FRAME_ANY;
  static FONT_ANY = FONT_ANY;
  static INLINE_ANY = INLINE_ANY;
  static PING_ANY = PING_ANY;
  static SCRIPT_ANY = SCRIPT_ANY;
  static METHOD_NONE = METHOD_NONE;
  static METHOD_CONNECT = METHOD_CONNECT;
  static METHOD_DELETE = METHOD_DELETE;
  static METHOD_GET = METHOD_GET;
  static METHOD_HEAD = METHOD_HEAD;
  static METHOD_OPTIONS = METHOD_OPTIONS;
  static METHOD_PATCH = METHOD_PATCH;
  static METHOD_POST = METHOD_POST;
  static METHOD_PUT = METHOD_PUT;
};

// ubo-src/js/hntrie.js
var PAGE_SIZE2 = 65536;
var TRIE0_SLOT2 = 256 >>> 2;
var TRIE1_SLOT2 = TRIE0_SLOT2 + 1;
var CHAR0_SLOT2 = TRIE0_SLOT2 + 2;
var CHAR1_SLOT2 = TRIE0_SLOT2 + 3;
var TRIE0_START2 = TRIE0_SLOT2 + 4 << 2;
var roundToPageSize2 = /* @__PURE__ */ __name((v2) => v2 + PAGE_SIZE2 - 1 & ~(PAGE_SIZE2 - 1), "roundToPageSize");
var i32Checksum2 = /* @__PURE__ */ __name((buf32) => {
  const n = buf32.length;
  let hash = 177573 ^ n;
  for (let i = 0; i < n; i++) {
    hash = (hash << 5) + hash ^ buf32[i];
  }
  return hash;
}, "i32Checksum");
var HNTrieContainer = class {
  static {
    __name(this, "HNTrieContainer");
  }
  constructor() {
    const len = PAGE_SIZE2 * 2;
    this.buf = new Uint8Array(len);
    this.buf32 = new Uint32Array(this.buf.buffer);
    this.needle = "";
    this.buf32[TRIE0_SLOT2] = TRIE0_START2;
    this.buf32[TRIE1_SLOT2] = this.buf32[TRIE0_SLOT2];
    this.buf32[CHAR0_SLOT2] = len >>> 1;
    this.buf32[CHAR1_SLOT2] = this.buf32[CHAR0_SLOT2];
    this.wasmMemory = null;
    this.lastStored = "";
    this.lastStoredLen = this.lastStoredIndex = 0;
  }
  //--------------------------------------------------------------------------
  // Public methods
  //--------------------------------------------------------------------------
  reset(details) {
    if (details instanceof Object && typeof details.byteLength === "number" && typeof details.char0 === "number") {
      if (details.byteLength > this.buf.byteLength) {
        this.reallocateBuf(details.byteLength);
      }
      this.buf32[CHAR0_SLOT2] = details.char0;
    }
    this.buf32[TRIE1_SLOT2] = this.buf32[TRIE0_SLOT2];
    this.buf32[CHAR1_SLOT2] = this.buf32[CHAR0_SLOT2];
    this.lastStored = "";
    this.lastStoredLen = this.lastStoredIndex = 0;
  }
  setNeedle(needle) {
    if (needle !== this.needle) {
      const buf = this.buf;
      let i = needle.length;
      if (i > 255) {
        i = 255;
      }
      buf[255] = i;
      while (i--) {
        buf[i] = needle.charCodeAt(i);
      }
      this.needle = needle;
    }
    return this;
  }
  matchesJS(iroot) {
    const buf32 = this.buf32;
    const buf8 = this.buf;
    const char0 = buf32[CHAR0_SLOT2];
    let ineedle = buf8[255];
    let icell = buf32[iroot + 0];
    if (icell === 0) {
      return -1;
    }
    let c = 0, v2 = 0, i0 = 0, n = 0;
    for (; ; ) {
      if (ineedle === 0) {
        return -1;
      }
      ineedle -= 1;
      c = buf8[ineedle];
      for (; ; ) {
        v2 = buf32[icell + 2];
        i0 = char0 + (v2 >>> 8);
        if (buf8[i0] === c) {
          break;
        }
        icell = buf32[icell + 0];
        if (icell === 0) {
          return -1;
        }
      }
      n = v2 & 127;
      if (n > 1) {
        n -= 1;
        if (n > ineedle) {
          return -1;
        }
        i0 += 1;
        const i1 = i0 + n;
        do {
          ineedle -= 1;
          if (buf8[i0] !== buf8[ineedle]) {
            return -1;
          }
          i0 += 1;
        } while (i0 < i1);
      }
      if ((v2 & 128) !== 0) {
        if (ineedle === 0 || buf8[ineedle - 1] === 46) {
          return ineedle;
        }
      }
      icell = buf32[icell + 1];
      if (icell === 0) {
        break;
      }
    }
    return -1;
  }
  createTrie() {
    if (this.buf32[CHAR0_SLOT2] - this.buf32[TRIE1_SLOT2] < 12) {
      this.growBuf(12, 0);
    }
    const iroot = this.buf32[TRIE1_SLOT2] >>> 2;
    this.buf32[TRIE1_SLOT2] += 12;
    this.buf32[iroot + 0] = 0;
    this.buf32[iroot + 1] = 0;
    this.buf32[iroot + 2] = 0;
    return iroot;
  }
  createTrieFromIterable(hostnames) {
    const itrie = this.createTrie();
    for (const hn2 of hostnames) {
      if (hn2 === "") {
        continue;
      }
      this.setNeedle(hn2).add(itrie);
    }
    return itrie;
  }
  createTrieFromStoredDomainOpt(i, n) {
    const itrie = this.createTrie();
    const jend = i + n;
    let j2 = i, offset = 0, k2 = 0, c = 0;
    while (j2 !== jend) {
      offset = this.buf32[CHAR0_SLOT2];
      k2 = 0;
      for (; ; ) {
        if (j2 === jend) {
          break;
        }
        c = this.buf[offset + j2];
        j2 += 1;
        if (c === 124) {
          break;
        }
        if (k2 === 255) {
          continue;
        }
        this.buf[k2] = c;
        k2 += 1;
      }
      if (k2 !== 0) {
        this.buf[255] = k2;
        this.add(itrie);
      }
    }
    this.needle = "";
    this.buf[255] = 0;
    return itrie;
  }
  dumpTrie(iroot) {
    let hostnames = Array.from(this.trieIterator(iroot));
    if (String.prototype.padStart instanceof Function) {
      const maxlen = Math.min(
        hostnames.reduce((maxlen2, hn2) => Math.max(maxlen2, hn2.length), 0),
        64
      );
      hostnames = hostnames.map((hn2) => hn2.padStart(maxlen));
    }
    for (const hn2 of hostnames) {
      console.log(hn2);
    }
  }
  trieIterator(iroot) {
    return {
      value: void 0,
      done: false,
      next() {
        if (this.icell === 0) {
          if (this.forks.length === 0) {
            this.value = void 0;
            this.done = true;
            return this;
          }
          this.charPtr = this.forks.pop();
          this.icell = this.forks.pop();
        }
        for (; ; ) {
          const idown = this.container.buf32[this.icell + 0];
          if (idown !== 0) {
            this.forks.push(idown, this.charPtr);
          }
          const v2 = this.container.buf32[this.icell + 2];
          let i0 = this.container.buf32[CHAR0_SLOT2] + (v2 >>> 8);
          const i1 = i0 + (v2 & 127);
          while (i0 < i1) {
            this.charPtr -= 1;
            this.charBuf[this.charPtr] = this.container.buf[i0];
            i0 += 1;
          }
          this.icell = this.container.buf32[this.icell + 1];
          if ((v2 & 128) !== 0) {
            return this.toHostname();
          }
        }
      },
      toHostname() {
        this.value = this.textDecoder.decode(
          new Uint8Array(this.charBuf.buffer, this.charPtr)
        );
        return this;
      },
      container: this,
      icell: this.buf32[iroot],
      charBuf: new Uint8Array(256),
      charPtr: 256,
      forks: [],
      textDecoder: new TextDecoder(),
      [Symbol.iterator]() {
        return this;
      }
    };
  }
  // TODO:
  //   Rework code to add from a string already present in the character
  //   buffer, i.e. not having to go through setNeedle() when adding a new
  //   hostname to a trie. This will require much work though, and probably
  //   changing the order in which string segments are stored in the
  //   character buffer.
  addJS(iroot) {
    let lhnchar = this.buf[255];
    if (lhnchar === 0) {
      return 0;
    }
    if (this.buf32[CHAR0_SLOT2] - this.buf32[TRIE1_SLOT2] < 24 || this.buf.length - this.buf32[CHAR1_SLOT2] < 256) {
      this.growBuf(24, 256);
    }
    let icell = this.buf32[iroot + 0];
    if (icell === 0) {
      this.buf32[iroot + 0] = this.addLeafCell(lhnchar);
      return 1;
    }
    const char0 = this.buf32[CHAR0_SLOT2];
    let isegchar, lsegchar, boundaryBit, inext;
    for (; ; ) {
      const v2 = this.buf32[icell + 2];
      let isegchar0 = char0 + (v2 >>> 8);
      if (this.buf[isegchar0] !== this.buf[lhnchar - 1]) {
        inext = this.buf32[icell + 0];
        if (inext === 0) {
          this.buf32[icell + 0] = this.addLeafCell(lhnchar);
          return 1;
        }
        icell = inext;
        continue;
      }
      isegchar = 1;
      lhnchar -= 1;
      lsegchar = v2 & 127;
      if (lsegchar !== 1) {
        for (; ; ) {
          if (isegchar === lsegchar) {
            break;
          }
          if (lhnchar === 0) {
            break;
          }
          if (this.buf[isegchar0 + isegchar] !== this.buf[lhnchar - 1]) {
            break;
          }
          isegchar += 1;
          lhnchar -= 1;
        }
      }
      boundaryBit = v2 & 128;
      if (isegchar === lsegchar) {
        if (lhnchar === 0) {
          if (boundaryBit !== 0) {
            return 0;
          }
          this.buf32[icell + 2] = v2 | 128;
        } else {
          if (boundaryBit !== 0) {
            if (this.buf[lhnchar - 1] === 46) {
              return -1;
            }
          }
          inext = this.buf32[icell + 1];
          if (inext !== 0) {
            icell = inext;
            continue;
          }
          this.buf32[icell + 1] = this.addLeafCell(lhnchar);
        }
      } else {
        isegchar0 -= char0;
        this.buf32[icell + 2] = isegchar0 << 8 | isegchar;
        inext = this.addCell(
          0,
          this.buf32[icell + 1],
          isegchar0 + isegchar << 8 | boundaryBit | lsegchar - isegchar
        );
        this.buf32[icell + 1] = inext;
        if (lhnchar !== 0) {
          this.buf32[inext + 0] = this.addLeafCell(lhnchar);
        } else {
          this.buf32[icell + 2] |= 128;
        }
      }
      return 1;
    }
  }
  optimize() {
    this.shrinkBuf();
    return {
      byteLength: this.buf.byteLength,
      char0: this.buf32[CHAR0_SLOT2]
    };
  }
  toSelfie() {
    const buf32 = this.buf32.subarray(0, this.buf32[CHAR1_SLOT2] + 3 >>> 2);
    return { buf32, checksum: i32Checksum2(buf32) };
  }
  fromSelfie(selfie) {
    if (typeof selfie !== "object" || selfie === null) {
      return false;
    }
    if (selfie.buf32 instanceof Uint32Array === false) {
      return false;
    }
    if (selfie.checksum !== i32Checksum2(selfie.buf32)) {
      return false;
    }
    this.needle = "";
    let byteLength = selfie.buf32.length << 2;
    if (byteLength === 0) {
      return false;
    }
    byteLength = roundToPageSize2(byteLength);
    if (this.wasmMemory !== null) {
      const pageCountBefore = this.buf.length >>> 16;
      const pageCountAfter = byteLength >>> 16;
      if (pageCountAfter > pageCountBefore) {
        this.wasmMemory.grow(pageCountAfter - pageCountBefore);
        this.buf = new Uint8Array(this.wasmMemory.buffer);
        this.buf32 = new Uint32Array(this.buf.buffer);
      }
      this.buf32.set(selfie.buf32);
    } else {
      this.buf32 = selfie.buf32;
      this.buf = new Uint8Array(this.buf32.buffer);
    }
    this.buf[255] = 0;
    return true;
  }
  // The following *Hostname() methods can be used to store hostname strings
  // outside the trie. This is useful to store/match hostnames which are
  // not part of a collection, and yet still benefit from storing the strings
  // into a trie container's character buffer.
  // TODO: WASM version of matchesHostname()
  storeHostname(hn2) {
    let n = hn2.length;
    if (n > 255) {
      hn2 = hn2.slice(-255);
      n = 255;
    }
    if (n === this.lastStoredLen && hn2 === this.lastStored) {
      return this.lastStoredIndex;
    }
    this.lastStored = hn2;
    this.lastStoredLen = n;
    if (this.buf.length - this.buf32[CHAR1_SLOT2] < n) {
      this.growBuf(0, n);
    }
    const offset = this.buf32[CHAR1_SLOT2];
    this.buf32[CHAR1_SLOT2] = offset + n;
    const buf8 = this.buf;
    for (let i = 0; i < n; i++) {
      buf8[offset + i] = hn2.charCodeAt(i);
    }
    return this.lastStoredIndex = offset - this.buf32[CHAR0_SLOT2];
  }
  extractHostname(i, n) {
    const textDecoder = new TextDecoder();
    const offset = this.buf32[CHAR0_SLOT2] + i;
    return textDecoder.decode(this.buf.subarray(offset, offset + n));
  }
  storeDomainOpt(s) {
    let n = s.length;
    if (n === this.lastStoredLen && s === this.lastStored) {
      return this.lastStoredIndex;
    }
    this.lastStored = s;
    this.lastStoredLen = n;
    if (this.buf.length - this.buf32[CHAR1_SLOT2] < n) {
      this.growBuf(0, n);
    }
    const offset = this.buf32[CHAR1_SLOT2];
    this.buf32[CHAR1_SLOT2] = offset + n;
    const buf8 = this.buf;
    for (let i = 0; i < n; i++) {
      buf8[offset + i] = s.charCodeAt(i);
    }
    return this.lastStoredIndex = offset - this.buf32[CHAR0_SLOT2];
  }
  extractDomainOpt(i, n) {
    const textDecoder = new TextDecoder();
    const offset = this.buf32[CHAR0_SLOT2] + i;
    return textDecoder.decode(this.buf.subarray(offset, offset + n));
  }
  matchesHostname(hn2, i, n) {
    this.setNeedle(hn2);
    const buf8 = this.buf;
    const hr = buf8[255];
    if (n > hr) {
      return false;
    }
    const hl2 = hr - n;
    const nl2 = this.buf32[CHAR0_SLOT2] + i;
    for (let j2 = 0; j2 < n; j2++) {
      if (buf8[nl2 + j2] !== buf8[hl2 + j2]) {
        return false;
      }
    }
    return n === hr || hn2.charCodeAt(hl2 - 1) === 46;
  }
  async enableWASM(wasmModuleFetcher, path) {
    if (typeof WebAssembly === "undefined") {
      return false;
    }
    if (this.wasmMemory instanceof WebAssembly.Memory) {
      return true;
    }
    const module = await getWasmModule2(wasmModuleFetcher, path);
    if (module instanceof WebAssembly.Module === false) {
      return false;
    }
    const memory = new WebAssembly.Memory({ initial: 2 });
    const instance = await WebAssembly.instantiate(module, {
      imports: {
        memory,
        growBuf: this.growBuf.bind(this, 24, 256)
      }
    });
    if (instance instanceof WebAssembly.Instance === false) {
      return false;
    }
    this.wasmMemory = memory;
    const curPageCount = memory.buffer.byteLength >>> 16;
    const newPageCount = roundToPageSize2(this.buf.byteLength) >>> 16;
    if (newPageCount > curPageCount) {
      memory.grow(newPageCount - curPageCount);
    }
    const buf = new Uint8Array(memory.buffer);
    buf.set(this.buf);
    this.buf = buf;
    this.buf32 = new Uint32Array(this.buf.buffer);
    this.matches = this.matchesWASM = instance.exports.matches;
    this.add = this.addWASM = instance.exports.add;
    return true;
  }
  dumpInfo() {
    return [
      `Buffer size (Uint8Array): ${this.buf32[CHAR1_SLOT2].toLocaleString("en")}`,
      `  Char segment size: ${(this.buf32[CHAR1_SLOT2] - this.buf32[CHAR0_SLOT2]).toLocaleString("en")}`,
      `WASM: ${this.wasmMemory === null ? "disabled" : "enabled"}`
    ].join("\n");
  }
  //--------------------------------------------------------------------------
  // Private methods
  //--------------------------------------------------------------------------
  addCell(idown, iright, v2) {
    let icell = this.buf32[TRIE1_SLOT2];
    this.buf32[TRIE1_SLOT2] = icell + 12;
    icell >>>= 2;
    this.buf32[icell + 0] = idown;
    this.buf32[icell + 1] = iright;
    this.buf32[icell + 2] = v2;
    return icell;
  }
  addLeafCell(lsegchar) {
    const r = this.buf32[TRIE1_SLOT2] >>> 2;
    let i = r;
    while (lsegchar > 127) {
      this.buf32[i + 0] = 0;
      this.buf32[i + 1] = i + 3;
      this.buf32[i + 2] = this.addSegment(lsegchar, lsegchar - 127);
      lsegchar -= 127;
      i += 3;
    }
    this.buf32[i + 0] = 0;
    this.buf32[i + 1] = 0;
    this.buf32[i + 2] = this.addSegment(lsegchar, 0) | 128;
    this.buf32[TRIE1_SLOT2] = i + 3 << 2;
    return r;
  }
  addSegment(lsegchar, lsegend) {
    if (lsegchar === 0) {
      return 0;
    }
    let char1 = this.buf32[CHAR1_SLOT2];
    const isegchar = char1 - this.buf32[CHAR0_SLOT2];
    let i = lsegchar;
    do {
      this.buf[char1++] = this.buf[--i];
    } while (i !== lsegend);
    this.buf32[CHAR1_SLOT2] = char1;
    return isegchar << 8 | lsegchar - lsegend;
  }
  growBuf(trieGrow, charGrow) {
    const char0 = Math.max(
      roundToPageSize2(this.buf32[TRIE1_SLOT2] + trieGrow),
      this.buf32[CHAR0_SLOT2]
    );
    const char1 = char0 + this.buf32[CHAR1_SLOT2] - this.buf32[CHAR0_SLOT2];
    const bufLen = Math.max(
      roundToPageSize2(char1 + charGrow),
      this.buf.length
    );
    this.resizeBuf(bufLen, char0);
  }
  shrinkBuf() {
    if (this.wasmMemory !== null) {
      return;
    }
    const char0 = this.buf32[TRIE1_SLOT2] + 24;
    const char1 = char0 + this.buf32[CHAR1_SLOT2] - this.buf32[CHAR0_SLOT2];
    const bufLen = char1 + 256;
    this.resizeBuf(bufLen, char0);
  }
  resizeBuf(bufLen, char0) {
    bufLen = roundToPageSize2(bufLen);
    if (bufLen === this.buf.length && char0 === this.buf32[CHAR0_SLOT2]) {
      return;
    }
    const charDataLen = this.buf32[CHAR1_SLOT2] - this.buf32[CHAR0_SLOT2];
    if (this.wasmMemory !== null) {
      const pageCount = (bufLen >>> 16) - (this.buf.byteLength >>> 16);
      if (pageCount > 0) {
        this.wasmMemory.grow(pageCount);
        this.buf = new Uint8Array(this.wasmMemory.buffer);
        this.buf32 = new Uint32Array(this.wasmMemory.buffer);
      }
    } else if (bufLen !== this.buf.length) {
      const newBuf = new Uint8Array(bufLen);
      newBuf.set(
        new Uint8Array(
          this.buf.buffer,
          0,
          this.buf32[TRIE1_SLOT2]
        ),
        0
      );
      newBuf.set(
        new Uint8Array(
          this.buf.buffer,
          this.buf32[CHAR0_SLOT2],
          charDataLen
        ),
        char0
      );
      this.buf = newBuf;
      this.buf32 = new Uint32Array(this.buf.buffer);
      this.buf32[CHAR0_SLOT2] = char0;
      this.buf32[CHAR1_SLOT2] = char0 + charDataLen;
    }
    if (char0 !== this.buf32[CHAR0_SLOT2]) {
      this.buf.set(
        new Uint8Array(
          this.buf.buffer,
          this.buf32[CHAR0_SLOT2],
          charDataLen
        ),
        char0
      );
      this.buf32[CHAR0_SLOT2] = char0;
      this.buf32[CHAR1_SLOT2] = char0 + charDataLen;
    }
  }
  reallocateBuf(newSize) {
    newSize = roundToPageSize2(newSize);
    if (newSize === this.buf.length) {
      return;
    }
    if (this.wasmMemory === null) {
      const newBuf = new Uint8Array(newSize);
      newBuf.set(
        newBuf.length < this.buf.length ? this.buf.subarray(0, newBuf.length) : this.buf
      );
      this.buf = newBuf;
    } else {
      const growBy = (newSize + 65535 >>> 16) - (this.buf.length >>> 16);
      if (growBy <= 0) {
        return;
      }
      this.wasmMemory.grow(growBy);
      this.buf = new Uint8Array(this.wasmMemory.buffer);
    }
    this.buf32 = new Uint32Array(this.buf.buffer);
  }
};
HNTrieContainer.prototype.matches = HNTrieContainer.prototype.matchesJS;
HNTrieContainer.prototype.matchesWASM = null;
HNTrieContainer.prototype.add = HNTrieContainer.prototype.addJS;
HNTrieContainer.prototype.addWASM = null;
var getWasmModule2 = /* @__PURE__ */ (() => {
  let wasmModulePromise;
  return async function(wasmModuleFetcher, path) {
    if (wasmModulePromise instanceof Promise) {
      return wasmModulePromise;
    }
    const uint32s = new Uint32Array(1);
    const uint8s = new Uint8Array(uint32s.buffer);
    uint32s[0] = 1;
    if (uint8s[0] !== 1) {
      return;
    }
    wasmModulePromise = wasmModuleFetcher(`${path}hntrie`).catch((reason) => {
      console.info(reason);
    });
    return wasmModulePromise;
  };
})();
var hntrie_default = HNTrieContainer;

// ubo-src/js/urlskip.js
function urlSkip(url, blocked, steps) {
  try {
    let redirectBlocked = false;
    let urlout = url;
    for (const step of steps) {
      const urlin = urlout;
      const c0 = step.charCodeAt(0);
      if (c0 === 35 && step === "#") {
        const pos = urlin.indexOf("#");
        urlout = pos !== -1 ? urlin.slice(pos + 1) : "";
        continue;
      }
      if (c0 === 38) {
        const i = (parseInt(step.slice(1)) || 0) - 1;
        if (i < 0) {
          return;
        }
        const url2 = new URL(urlin);
        if (i >= url2.searchParams.size) {
          return;
        }
        const params = Array.from(url2.searchParams.keys());
        urlout = decodeURIComponent(params[i]);
        continue;
      }
      if (c0 === 43 && step === "+https") {
        const s = urlin.replace(/^https?:\/\//, "");
        if (/^[\w-]:\/\//.test(s)) {
          return;
        }
        urlout = `https://${s}`;
        continue;
      }
      if (c0 === 45) {
        if (step === "-base64") {
          urlout = self.atob(urlin);
          continue;
        }
        if (step === "-safebase64") {
          if (urlSkip.safeBase64Replacer === void 0) {
            urlSkip.safeBase64Map = { "-": "+", "_": "/" };
            urlSkip.safeBase64Replacer = (s) => urlSkip.safeBase64Map[s];
          }
          urlout = urlin.replace(/[-_]/g, urlSkip.safeBase64Replacer);
          urlout = self.atob(urlout);
          continue;
        }
        if (step === "-uricomponent") {
          urlout = decodeURIComponent(urlin);
          continue;
        }
        if (step === "-blocked") {
          redirectBlocked = true;
          continue;
        }
      }
      if (c0 === 47) {
        const re2 = new RegExp(step.slice(1, -1));
        const match = re2.exec(urlin);
        if (match === null) {
          return;
        }
        if (match.length <= 1) {
          return;
        }
        urlout = match[1];
        continue;
      }
      if (c0 === 63) {
        urlout = new URL(urlin).searchParams.get(step.slice(1));
        if (urlout === null) {
          return;
        }
        if (urlout.includes(" ")) {
          urlout = urlout.replace(/ /g, "%20");
        }
        continue;
      }
      return;
    }
    const urlfinal = new URL(urlout);
    if (urlfinal.protocol !== "https:") {
      if (urlfinal.protocol !== "http:") {
        return;
      }
    }
    if (blocked && redirectBlocked !== true) {
      return;
    }
    return urlout;
  } catch {
  }
}
__name(urlSkip, "urlSkip");

// ubo-src/js/static-net-filtering.js
var keyvalStore = typeof vAPI !== "undefined" ? vAPI.localStorage : { getItem() {
  return null;
}, setItem() {
}, removeItem() {
} };
var BLOCK_REALM = 0;
var ALLOW_REALM = 1;
var IMPORTANT_REALM = 2;
var BLOCKALLOW_REALM = BLOCK_REALM | ALLOW_REALM | IMPORTANT_REALM;
var BLOCKIMPORTANT_REALM = BLOCK_REALM | IMPORTANT_REALM;
var ANYPARTY_REALM = 0;
var FIRSTPARTY_REALM = 8;
var THIRDPARTY_REALM = 16;
var ALLPARTIES_REALM = FIRSTPARTY_REALM | THIRDPARTY_REALM;
var TYPE_REALM = 992;
var HEADERS_REALM = 1024;
var REDIRECT_REALM = 2048;
var REMOVEPARAM_REALM = 4096;
var CSP_REALM = 6144;
var PERMISSIONS_REALM = 8192;
var URLTRANSFORM_REALM = 10240;
var REPLACE_REALM = 12288;
var URLSKIP_REALM = 14336;
var MODIFY_REALMS = 14336;
var TYPE_REALM_OFFSET = 5;
var typeNameToTypeValue = {
  "no_type": 0 << TYPE_REALM_OFFSET,
  "stylesheet": 1 << TYPE_REALM_OFFSET,
  "image": 2 << TYPE_REALM_OFFSET,
  "object": 3 << TYPE_REALM_OFFSET,
  "object_subrequest": 3 << TYPE_REALM_OFFSET,
  "script": 4 << TYPE_REALM_OFFSET,
  "fetch": 5 << TYPE_REALM_OFFSET,
  "xmlhttprequest": 5 << TYPE_REALM_OFFSET,
  "sub_frame": 6 << TYPE_REALM_OFFSET,
  "font": 7 << TYPE_REALM_OFFSET,
  "media": 8 << TYPE_REALM_OFFSET,
  "websocket": 9 << TYPE_REALM_OFFSET,
  "beacon": 10 << TYPE_REALM_OFFSET,
  "ping": 10 << TYPE_REALM_OFFSET,
  "other": 11 << TYPE_REALM_OFFSET,
  "popup": 12 << TYPE_REALM_OFFSET,
  // start of behavioral filtering
  "popunder": 13 << TYPE_REALM_OFFSET,
  "main_frame": 14 << TYPE_REALM_OFFSET,
  // start of 1p behavioral filtering
  "generichide": 15 << TYPE_REALM_OFFSET,
  "specifichide": 16 << TYPE_REALM_OFFSET,
  "inline-font": 17 << TYPE_REALM_OFFSET,
  "inline-script": 18 << TYPE_REALM_OFFSET,
  "cname": 19 << TYPE_REALM_OFFSET,
  "webrtc": 20 << TYPE_REALM_OFFSET,
  "unsupported": 21 << TYPE_REALM_OFFSET
};
var otherTypeBitValue = typeNameToTypeValue.other;
var bitFromType = /* @__PURE__ */ __name((type) => 1 << (typeNameToTypeValue[type] >>> TYPE_REALM_OFFSET) - 1, "bitFromType");
var allNetworkTypesBits = (1 << (otherTypeBitValue >>> TYPE_REALM_OFFSET)) - 1;
var allTypesBits = allNetworkTypesBits | 1 << (typeNameToTypeValue["popup"] >>> TYPE_REALM_OFFSET) - 1 | 1 << (typeNameToTypeValue["main_frame"] >>> TYPE_REALM_OFFSET) - 1 | 1 << (typeNameToTypeValue["inline-font"] >>> TYPE_REALM_OFFSET) - 1 | 1 << (typeNameToTypeValue["inline-script"] >>> TYPE_REALM_OFFSET) - 1;
var unsupportedTypeBit = 1 << (typeNameToTypeValue["unsupported"] >>> TYPE_REALM_OFFSET) - 1;
var typeValueToTypeName = [
  "",
  "stylesheet",
  "image",
  "object",
  "script",
  "xhr",
  "frame",
  "font",
  "media",
  "websocket",
  "ping",
  "other",
  "popup",
  "popunder",
  "document",
  "generichide",
  "specifichide",
  "inline-font",
  "inline-script",
  "cname",
  "",
  "",
  "webrtc",
  "unsupported"
];
var typeValueToDNRTypeName = [
  "",
  "stylesheet",
  "image",
  "object",
  "script",
  "xmlhttprequest",
  "sub_frame",
  "font",
  "media",
  "websocket",
  "ping",
  "other"
];
var MODIFIER_TYPE_REDIRECT = 1;
var MODIFIER_TYPE_REDIRECTRULE = 2;
var MODIFIER_TYPE_REMOVEPARAM = 3;
var MODIFIER_TYPE_CSP = 4;
var MODIFIER_TYPE_PERMISSIONS = 5;
var MODIFIER_TYPE_URLTRANSFORM = 6;
var MODIFIER_TYPE_REPLACE = 7;
var MODIFIER_TYPE_URLSKIP = 8;
var modifierBitsFromType = /* @__PURE__ */ new Map([
  [MODIFIER_TYPE_REDIRECT, REDIRECT_REALM],
  [MODIFIER_TYPE_REDIRECTRULE, REDIRECT_REALM],
  [MODIFIER_TYPE_REMOVEPARAM, REMOVEPARAM_REALM],
  [MODIFIER_TYPE_CSP, CSP_REALM],
  [MODIFIER_TYPE_PERMISSIONS, PERMISSIONS_REALM],
  [MODIFIER_TYPE_URLTRANSFORM, URLTRANSFORM_REALM],
  [MODIFIER_TYPE_REPLACE, REPLACE_REALM],
  [MODIFIER_TYPE_URLSKIP, URLSKIP_REALM]
]);
var modifierTypeFromName = /* @__PURE__ */ new Map([
  ["redirect", MODIFIER_TYPE_REDIRECT],
  ["redirect-rule", MODIFIER_TYPE_REDIRECTRULE],
  ["removeparam", MODIFIER_TYPE_REMOVEPARAM],
  ["csp", MODIFIER_TYPE_CSP],
  ["permissions", MODIFIER_TYPE_PERMISSIONS],
  ["uritransform", MODIFIER_TYPE_URLTRANSFORM],
  ["replace", MODIFIER_TYPE_REPLACE],
  ["urlskip", MODIFIER_TYPE_URLSKIP]
]);
var modifierNameFromType = /* @__PURE__ */ new Map([
  [MODIFIER_TYPE_REDIRECT, "redirect"],
  [MODIFIER_TYPE_REDIRECTRULE, "redirect-rule"],
  [MODIFIER_TYPE_REMOVEPARAM, "removeparam"],
  [MODIFIER_TYPE_CSP, "csp"],
  [MODIFIER_TYPE_PERMISSIONS, "permissions"],
  [MODIFIER_TYPE_URLTRANSFORM, "uritransform"],
  [MODIFIER_TYPE_REPLACE, "replace"],
  [MODIFIER_TYPE_URLSKIP, "urlskip"]
]);
var MAX_TOKEN_LENGTH = 7;
var NO_TOKEN_HASH = 1342177280;
var DOT_TOKEN_HASH = 268435456;
var ANY_TOKEN_HASH = 536870912;
var ANY_HTTPS_TOKEN_HASH = 805306368;
var ANY_HTTP_TOKEN_HASH = 1073741824;
var EMPTY_TOKEN_HASH = 4026531840;
var INVALID_TOKEN_HASH = 4294967295;
var $requestMethodBit = 0;
var $requestTypeValue = 0;
var $requestURL = "";
var $requestURLRaw = "";
var $requestHostname = "";
var $requestAddress = "";
var $docHostname = "";
var $topHostname = "";
var $tokenBeg = 0;
var $patternMatchLeft = 0;
var $patternMatchRight = 0;
var $isBlockImportant = false;
var HostnameDetails = class {
  static {
    __name(this, "HostnameDetails");
  }
  #cache = /* @__PURE__ */ new Map();
  #mru = [];
  #lookup(hostname) {
    const details = this.#cache.get(hostname) ?? { hostname };
    if (details.domain === void 0) {
      if (this.#cache.size === 8) {
        this.#cache.delete(this.#mru.pop());
      }
      this.#mru.unshift(hostname);
      this.#cache.set(hostname, details);
    } else if (this.#mru[0] !== hostname) {
      const pos = this.#mru.indexOf(hostname);
      this.#mru.splice(pos, 1);
      this.#mru.unshift(hostname);
    }
    return details;
  }
  get hostname() {
    return "";
  }
  get domain() {
    const details = this.#lookup(this.hostname);
    if (details.domain === void 0) {
      details.domain = domainFromHostname(details.hostname);
    }
    return details.domain;
  }
  get entity() {
    const details = this.#lookup(this.hostname);
    if (details.entity === void 0) {
      if (details.domain === void 0) {
        details.domain = domainFromHostname(details.hostname);
      }
      const pos = details.domain.indexOf(".");
      details.entity = pos !== -1 ? `${details.hostname.slice(0, pos - details.domain.length)}.*` : "";
    }
    return details.entity;
  }
};
var DocDetails = class extends HostnameDetails {
  static {
    __name(this, "DocDetails");
  }
  get hostname() {
    return $docHostname;
  }
};
var $docDetails = new DocDetails();
var RequestDetails = class extends HostnameDetails {
  static {
    __name(this, "RequestDetails");
  }
  get hostname() {
    return $requestHostname;
  }
};
var $requestDetails = new RequestDetails();
var TopDetails = class extends HostnameDetails {
  static {
    __name(this, "TopDetails");
  }
  get hostname() {
    return $topHostname;
  }
};
var $topDetails = new TopDetails();
var $httpHeaders = {
  init(...headers) {
    this.headers = headers.flat();
    this.parsed.clear();
  },
  reset() {
    this.headers = [];
    this.parsed.clear();
  },
  lookup(name) {
    let value = this.parsed.get(name);
    if (value === void 0) {
      const headers = this.headers;
      const i = headers.findIndex((a) => name === a.name.toLowerCase());
      value = i !== -1 ? headers[i].value : null;
      this.parsed.set(name, value);
    }
    return value ?? void 0;
  },
  headers: [],
  parsed: /* @__PURE__ */ new Map()
};
var resetRegisters = /* @__PURE__ */ __name((fctxt, typeBits) => {
  $requestURL = urlTokenizer.setURL(fctxt.url);
  $requestURLRaw = fctxt.url;
  $requestHostname = fctxt.getHostname();
  $requestMethodBit = fctxt.method || 0;
  $requestTypeValue = (typeBits & TYPE_REALM) >>> TYPE_REALM_OFFSET;
  $requestAddress = fctxt.getIPAddress();
  $docHostname = fctxt.getDocHostname();
  $topHostname = fctxt.getTabHostname();
  $isBlockImportant = false;
}, "resetRegisters");
var restrSeparator = "(?:[^%.0-9a-z_-]|$)";
var reEscape = /[.*+?^${}()|[\]\\]/g;
var restrFromPlainPattern = /* @__PURE__ */ __name((s) => s.replace(reEscape, "\\$&"), "restrFromPlainPattern");
var restrFromGenericPattern = /* @__PURE__ */ __name(function(s, anchor = 0) {
  let reStr = s.replace(restrFromGenericPattern.rePlainChars, "\\$&").replace(restrFromGenericPattern.reSeparators, restrSeparator).replace(restrFromGenericPattern.reDanglingAsterisks, "").replace(restrFromGenericPattern.reAsterisks, ".*?");
  if (anchor & 4) {
    reStr = (reStr.startsWith("\\.") ? restrFromGenericPattern.restrHostnameAnchor2 : restrFromGenericPattern.restrHostnameAnchor1) + reStr;
  } else if (anchor & 2) {
    reStr = "^" + reStr;
  }
  if (anchor & 1) {
    reStr += "$";
  }
  return reStr;
}, "restrFromGenericPattern");
restrFromGenericPattern.rePlainChars = /[.+?${}()|[\]\\]/g;
restrFromGenericPattern.reSeparators = /\^/g;
restrFromGenericPattern.reDanglingAsterisks = /^\*+|\*+$/g;
restrFromGenericPattern.reAsterisks = /\*+/g;
restrFromGenericPattern.restrHostnameAnchor1 = "^[^:]+://(?:[^/]+\\.)?";
restrFromGenericPattern.restrHostnameAnchor2 = "^[^:]+://(?:[^/]+)?";
var LogData = class {
  static {
    __name(this, "LogData");
  }
  constructor(categoryBits, tokenHash, iunit) {
    this.result = 0;
    this.source = "static";
    this.tokenHash = tokenHash;
    if (iunit === 0) {
      this.raw = this.regex = "";
      return;
    }
    this.result = (categoryBits & ALLOW_REALM) === 0 ? 1 : 2;
    const pattern = [];
    const regex = [];
    const options = [];
    const denyallow = [];
    const fromDomains = [];
    const toDomains = [];
    const topDomains = [];
    const logData = {
      pattern,
      regex,
      denyallow,
      fromDomains,
      toDomains,
      topDomains,
      options,
      isRegex: false
    };
    filterLogData(iunit, logData);
    if ((categoryBits & THIRDPARTY_REALM) !== 0) {
      logData.options.unshift("3p");
    } else if ((categoryBits & FIRSTPARTY_REALM) !== 0) {
      logData.options.unshift("1p");
    }
    const type = categoryBits & TYPE_REALM;
    if (type !== 0) {
      logData.options.unshift(typeValueToTypeName[type >>> TYPE_REALM_OFFSET]);
    }
    let raw = logData.pattern.join("");
    if (logData.isRegex === false && raw.charCodeAt(0) === 47 && raw.charCodeAt(raw.length - 1) === 47) {
      raw += "*";
    }
    if ((categoryBits & ALLOW_REALM) !== 0) {
      raw = "@@" + raw;
    }
    if (denyallow.length !== 0) {
      options.push(`denyallow=${denyallow.join("|")}`);
    }
    if (fromDomains.length !== 0) {
      options.push(`from=${fromDomains.join("|")}`);
    }
    if (toDomains.length !== 0) {
      options.push(`to=${toDomains.join("|")}`);
    }
    if (topDomains.length !== 0) {
      options.push(`top=${topDomains.join("|")}`);
    }
    if (options.length !== 0) {
      raw += "$" + options.join(",");
    }
    this.raw = raw;
    this.regex = logData.regex.join("");
    if (logData.reason) {
      this.reason = logData.reason;
    }
  }
  isUntokenized() {
    return this.tokenHash === NO_TOKEN_HASH;
  }
  isPureHostname() {
    return this.tokenHash === DOT_TOKEN_HASH;
  }
  static requote(s) {
    if (/^\$|^(["'`]).*\1$|,/.test(s) === false) {
      return s;
    }
    if (s.includes("'") === false) {
      return `'${s}'`;
    }
    if (s.includes('"') === false) {
      return `"${s}"`;
    }
    if (s.includes("`") === false) {
      return `\`${s}\``;
    }
    return `'${s.replace(/'/g, "\\'")}'`;
  }
};
var charClassMap = new Uint32Array(128);
var CHAR_CLASS_SEPARATOR = 1;
{
  const reSeparators = /[^\w%.-]/;
  for (let i = 0; i < 128; i++) {
    if (reSeparators.test(String.fromCharCode(i))) {
      charClassMap[i] |= CHAR_CLASS_SEPARATOR;
    }
  }
}
var isSeparatorChar = /* @__PURE__ */ __name((c) => (charClassMap[c] & CHAR_CLASS_SEPARATOR) !== 0, "isSeparatorChar");
var FILTER_DATA_PAGE_SIZE = 65536;
var roundToFilterDataPageSize = /* @__PURE__ */ __name((len) => len + FILTER_DATA_PAGE_SIZE - 1 & ~(FILTER_DATA_PAGE_SIZE - 1), "roundToFilterDataPageSize");
var filterData = new Int32Array(FILTER_DATA_PAGE_SIZE * 5);
var filterDataWritePtr = 2;
var filterDataGrow = /* @__PURE__ */ __name((len) => {
  if (len <= filterData.length) {
    return;
  }
  const newLen = roundToFilterDataPageSize(len);
  const newBuf = new Int32Array(newLen);
  newBuf.set(filterData);
  filterData = newBuf;
}, "filterDataGrow");
var filterDataShrink = /* @__PURE__ */ __name(() => {
  const newLen = Math.max(
    roundToFilterDataPageSize(filterDataWritePtr),
    FILTER_DATA_PAGE_SIZE
  );
  if (newLen >= filterData.length) {
    return;
  }
  const newBuf = new Int32Array(newLen);
  newBuf.set(filterData.subarray(0, filterDataWritePtr));
  filterData = newBuf;
}, "filterDataShrink");
var filterDataAlloc = /* @__PURE__ */ __name((...args) => {
  const len = args.length;
  const idata = filterDataAllocLen(len);
  for (let i = 0; i < len; i++) {
    filterData[idata + i] = args[i];
  }
  return idata;
}, "filterDataAlloc");
var filterDataAllocLen = /* @__PURE__ */ __name((len) => {
  const idata = filterDataWritePtr;
  filterDataWritePtr += len;
  if (filterDataWritePtr > filterData.length) {
    filterDataGrow(filterDataWritePtr);
  }
  return idata;
}, "filterDataAllocLen");
var filterSequenceAdd = /* @__PURE__ */ __name((a, b2) => {
  const iseq = filterDataAllocLen(2);
  filterData[iseq + 0] = a;
  filterData[iseq + 1] = b2;
  return iseq;
}, "filterSequenceAdd");
var filterDataReset = /* @__PURE__ */ __name(() => {
  filterData.fill(0);
  filterDataWritePtr = 2;
}, "filterDataReset");
var filterDataToSelfie = /* @__PURE__ */ __name(() => filterData.subarray(0, filterDataWritePtr), "filterDataToSelfie");
var filterDataFromSelfie = /* @__PURE__ */ __name((selfie) => {
  if (selfie instanceof Int32Array === false) {
    return false;
  }
  filterData = selfie;
  filterDataWritePtr = selfie.length;
  return true;
}, "filterDataFromSelfie");
var filterRefs = [null];
var filterRefsWritePtr = 1;
var filterRefAdd = /* @__PURE__ */ __name((ref) => {
  const i = filterRefsWritePtr;
  filterRefs[i] = ref;
  filterRefsWritePtr += 1;
  return i;
}, "filterRefAdd");
var filterRefsReset = /* @__PURE__ */ __name(() => {
  filterRefs.fill(null);
  filterRefsWritePtr = 1;
}, "filterRefsReset");
var filterRefsToSelfie = /* @__PURE__ */ __name(() => filterRefs.slice(0, filterRefsWritePtr), "filterRefsToSelfie");
var filterRefsFromSelfie = /* @__PURE__ */ __name((selfie) => {
  if (Array.isArray(selfie) === false) {
    return false;
  }
  for (let i = 0, n = selfie.length; i < n; i++) {
    filterRefs[i] = selfie[i];
  }
  filterRefsWritePtr = selfie.length;
  return true;
}, "filterRefsFromSelfie");
var origHNTrieContainer = new hntrie_default();
var destHNTrieContainer = new hntrie_default();
var bidiTrieMatchExtra = /* @__PURE__ */ __name((l, r, ix) => {
  for (; ; ) {
    $patternMatchLeft = l;
    $patternMatchRight = r;
    const iu2 = filterData[ix + 0];
    if (filterMatch(iu2)) {
      return iu2;
    }
    ix = filterData[ix + 1];
    if (ix === 0) {
      break;
    }
  }
  return 0;
}, "bidiTrieMatchExtra");
var bidiTrie = new biditrie_default(bidiTrieMatchExtra);
var filterClasses = [];
var filterArgsToUnit = /* @__PURE__ */ new Map();
var filterClassIdGenerator = 0;
var registerFilterClass = /* @__PURE__ */ __name((fc2) => {
  const fid = filterClassIdGenerator++;
  fc2.fid = fid;
  fc2.fidstr = `${fid}`;
  filterClasses[fid] = fc2;
}, "registerFilterClass");
var filterFromCompiled = /* @__PURE__ */ __name((args) => {
  const fc2 = filterClasses[args[0]];
  const keygen = fc2.keyFromArgs;
  if (keygen === void 0) {
    return fc2.fromCompiled(args);
  }
  const key = `${fc2.fidstr} ${keygen(args) || ""}`;
  let idata = filterArgsToUnit.get(key);
  if (idata !== void 0) {
    return idata;
  }
  idata = fc2.fromCompiled(args);
  filterArgsToUnit.set(key, idata);
  return idata;
}, "filterFromCompiled");
var filterGetClass = /* @__PURE__ */ __name((idata) => {
  return filterClasses[filterData[idata + 0]];
}, "filterGetClass");
var filterMatch = /* @__PURE__ */ __name((idata) => filterClasses[filterData[idata + 0]].match(idata), "filterMatch");
var filterHasOriginHit = /* @__PURE__ */ __name((idata) => {
  const fc2 = filterClasses[filterData[idata + 0]];
  return fc2.hasOriginHit !== void 0 && fc2.hasOriginHit(idata);
}, "filterHasOriginHit");
var filterGetDomainOpt = /* @__PURE__ */ __name((idata, out) => {
  const fc2 = filterClasses[filterData[idata + 0]];
  if (fc2.getDomainOpt === void 0) {
    return;
  }
  const fromOpt = fc2.getDomainOpt(idata);
  if (out === void 0) {
    return fromOpt;
  }
  out.push(fromOpt);
}, "filterGetDomainOpt");
var filterGetRegexPattern = /* @__PURE__ */ __name((idata, out) => {
  const fc2 = filterClasses[filterData[idata + 0]];
  if (fc2.hasRegexPattern === void 0) {
    return;
  }
  const reStr = fc2.getRegexPattern(idata);
  if (out === void 0) {
    return reStr;
  }
  out.push(reStr);
}, "filterGetRegexPattern");
var filterIsBidiTrieable = /* @__PURE__ */ __name((idata) => {
  const fc2 = filterClasses[filterData[idata + 0]];
  if (fc2.isBidiTrieable === void 0) {
    return false;
  }
  return fc2.isBidiTrieable(idata) === true;
}, "filterIsBidiTrieable");
var filterToBidiTrie = /* @__PURE__ */ __name((idata) => {
  const fc2 = filterClasses[filterData[idata + 0]];
  if (fc2.toBidiTrie === void 0) {
    return;
  }
  return fc2.toBidiTrie(idata);
}, "filterToBidiTrie");
var filterMatchAndFetchModifiers = /* @__PURE__ */ __name((idata, env) => {
  const fc2 = filterClasses[filterData[idata + 0]];
  if (fc2.matchAndFetchModifiers === void 0) {
    return;
  }
  return fc2.matchAndFetchModifiers(idata, env);
}, "filterMatchAndFetchModifiers");
var filterGetModifierType = /* @__PURE__ */ __name((idata) => {
  const fc2 = filterClasses[filterData[idata + 0]];
  if (fc2.getModifierType === void 0) {
    return;
  }
  return fc2.getModifierType(idata);
}, "filterGetModifierType");
var filterLogData = /* @__PURE__ */ __name((idata, details) => {
  const fc2 = filterClasses[filterData[idata + 0]];
  if (fc2.logData === void 0) {
    return;
  }
  fc2.logData(idata, details);
}, "filterLogData");
var filterDumpInfo = /* @__PURE__ */ __name((idata) => {
  const fc2 = filterGetClass(idata);
  if (fc2.dumpInfo === void 0) {
    return;
  }
  return fc2.dumpInfo(idata);
}, "filterDumpInfo");
var dnrRuleFromCompiled = /* @__PURE__ */ __name((args, rule) => {
  const fc2 = filterClasses[args[0]];
  if (fc2.dnrFromCompiled === void 0) {
    return false;
  }
  fc2.dnrFromCompiled(args, rule);
  return true;
}, "dnrRuleFromCompiled");
var dnrAddRuleError = /* @__PURE__ */ __name((rule, msg) => {
  rule._error = rule._error || [];
  rule._error.push(msg);
}, "dnrAddRuleError");
var dnrAddRuleWarning = /* @__PURE__ */ __name((rule, msg) => {
  rule._warning = rule._warning || [];
  rule._warning.push(msg);
}, "dnrAddRuleWarning");
var FilterPatternAny = class _FilterPatternAny {
  static {
    __name(this, "FilterPatternAny");
  }
  static match() {
    return true;
  }
  static compile() {
    return [_FilterPatternAny.fid];
  }
  static fromCompiled(args) {
    return filterDataAlloc(args[0]);
  }
  static keyFromArgs() {
  }
  static logData(idata, details) {
    details.pattern.push("*");
    details.regex.push("^");
  }
};
registerFilterClass(FilterPatternAny);
var FilterImportant = class _FilterImportant {
  static {
    __name(this, "FilterImportant");
  }
  static match() {
    return $isBlockImportant = true;
  }
  static compile() {
    return [_FilterImportant.fid];
  }
  static fromCompiled(args) {
    return filterDataAlloc(args[0]);
  }
  static dnrFromCompiled(args, rule) {
    rule.__important = true;
  }
  static keyFromArgs() {
  }
  static logData(idata, details) {
    details.options.unshift("important");
  }
};
registerFilterClass(FilterImportant);
var FilterPatternPlain = class _FilterPatternPlain {
  static {
    __name(this, "FilterPatternPlain");
  }
  static isBidiTrieable(idata) {
    return filterData[idata + 2] <= 255;
  }
  static toBidiTrie(idata) {
    return {
      i: filterData[idata + 1],
      n: filterData[idata + 2],
      itok: filterData[idata + 3]
    };
  }
  static match(idata) {
    const left = $tokenBeg;
    const n = filterData[idata + 2];
    if (bidiTrie.startsWith(
      left,
      bidiTrie.getHaystackLen(),
      filterData[idata + 1],
      n
    ) === 0) {
      return false;
    }
    $patternMatchLeft = left;
    $patternMatchRight = left + n;
    return true;
  }
  static compile(details) {
    const { tokenBeg } = details;
    if (tokenBeg === 0) {
      return [_FilterPatternPlain.fid, details.pattern, 0];
    }
    if (tokenBeg === 1) {
      return [FilterPatternPlain1.fid, details.pattern, 1];
    }
    return [FilterPatternPlainX.fid, details.pattern, tokenBeg];
  }
  static fromCompiled(args) {
    const idata = filterDataAllocLen(4);
    filterData[idata + 0] = args[0];
    filterData[idata + 1] = bidiTrie.storeString(args[1]);
    filterData[idata + 2] = args[1].length;
    filterData[idata + 3] = args[2];
    return idata;
  }
  static dnrFromCompiled(args, rule) {
    if (rule.condition === void 0) {
      rule.condition = {};
    } else if (rule.condition.urlFilter !== void 0) {
      dnrAddRuleError(rule, `urlFilter already defined: ${rule.condition.urlFilter}`);
    }
    rule.condition.urlFilter = args[1];
  }
  static logData(idata, details) {
    const s = bidiTrie.extractString(
      filterData[idata + 1],
      filterData[idata + 2]
    );
    details.pattern.push(s);
    details.regex.push(restrFromPlainPattern(s));
    if (/^[0-9a-z%]{1,6}$/i.exec(s.slice(filterData[idata + 3])) !== null) {
      details.regex.push("(?![0-9A-Za-z%])");
    }
  }
  static dumpInfo(idata) {
    const pattern = bidiTrie.extractString(
      filterData[idata + 1],
      filterData[idata + 2]
    );
    return `${pattern} ${filterData[idata + 3]}`;
  }
};
FilterPatternPlain.isPatternPlain = true;
registerFilterClass(FilterPatternPlain);
var FilterPatternPlain1 = class extends FilterPatternPlain {
  static {
    __name(this, "FilterPatternPlain1");
  }
  static match(idata) {
    const left = $tokenBeg - 1;
    const n = filterData[idata + 2];
    if (bidiTrie.startsWith(
      left,
      bidiTrie.getHaystackLen(),
      filterData[idata + 1],
      n
    ) === 0) {
      return false;
    }
    $patternMatchLeft = left;
    $patternMatchRight = left + n;
    return true;
  }
};
registerFilterClass(FilterPatternPlain1);
var FilterPatternPlainX = class extends FilterPatternPlain {
  static {
    __name(this, "FilterPatternPlainX");
  }
  static match(idata) {
    const left = $tokenBeg - filterData[idata + 3];
    const n = filterData[idata + 2];
    if (bidiTrie.startsWith(
      left,
      bidiTrie.getHaystackLen(),
      filterData[idata + 1],
      n
    ) === 0) {
      return false;
    }
    $patternMatchLeft = left;
    $patternMatchRight = left + n;
    return true;
  }
};
registerFilterClass(FilterPatternPlainX);
var FilterPatternGeneric = class _FilterPatternGeneric {
  static {
    __name(this, "FilterPatternGeneric");
  }
  static hasRegexPattern() {
    return true;
  }
  static getRegexPattern(idata) {
    return restrFromGenericPattern(
      bidiTrie.extractString(
        filterData[idata + 1],
        filterData[idata + 2]
      ),
      filterData[idata + 3]
    );
  }
  static match(idata) {
    const refs = filterRefs[filterData[idata + 4]];
    if (refs.$re === null) {
      refs.$re = new RegExp(this.getRegexPattern(idata));
    }
    return refs.$re.test($requestURL);
  }
  static compile(details) {
    const out = [
      _FilterPatternGeneric.fid,
      details.pattern,
      details.anchor
    ];
    details.anchor = 0;
    return out;
  }
  static fromCompiled(args) {
    const idata = filterDataAllocLen(5);
    filterData[idata + 0] = args[0];
    filterData[idata + 1] = bidiTrie.storeString(args[1]);
    filterData[idata + 2] = args[1].length;
    filterData[idata + 3] = args[2];
    filterData[idata + 4] = filterRefAdd({ $re: null });
    return idata;
  }
  static dnrFromCompiled(args, rule) {
    if (rule.condition === void 0) {
      rule.condition = {};
    } else if (rule.condition.urlFilter !== void 0) {
      dnrAddRuleError(rule, `urlFilter already defined: ${rule.condition.urlFilter}`);
    }
    let pattern = args[1];
    if (args[2] & 4) {
      if (pattern.startsWith(".")) {
        pattern = `*${pattern}`;
      }
      pattern = `||${pattern}`;
    } else if (args[2] & 2) {
      pattern = `|${pattern}`;
    }
    if (args[2] & 1) {
      pattern += "|";
    }
    rule.condition.urlFilter = pattern;
  }
  static keyFromArgs(args) {
    return `${args[1]}	${args[2]}`;
  }
  static logData(idata, details) {
    details.pattern.length = 0;
    const anchor = filterData[idata + 3];
    if ((anchor & 4) !== 0) {
      details.pattern.push("||");
    } else if ((anchor & 2) !== 0) {
      details.pattern.push("|");
    }
    const s = bidiTrie.extractString(
      filterData[idata + 1],
      filterData[idata + 2]
    );
    details.pattern.push(s);
    if ((anchor & 1) !== 0) {
      details.pattern.push("|");
    }
    details.regex.length = 0;
    details.regex.push(restrFromGenericPattern(s, anchor & ~4));
  }
  static dumpInfo(idata) {
    return bidiTrie.extractString(
      filterData[idata + 1],
      filterData[idata + 2]
    );
  }
};
FilterPatternGeneric.isSlow = true;
registerFilterClass(FilterPatternGeneric);
var FilterAnchorHnLeft = class _FilterAnchorHnLeft {
  static {
    __name(this, "FilterAnchorHnLeft");
  }
  static match(idata) {
    const len = $requestHostname.length;
    const haystackCodes = bidiTrie.haystack;
    let lastBeg = filterData[idata + 2];
    let lastEnd = filterData[idata + 3];
    if (len !== filterData[idata + 1] || lastBeg === -1 || haystackCodes[lastBeg - 3] !== 58 || haystackCodes[lastBeg - 2] !== 47 || haystackCodes[lastBeg - 1] !== 47) {
      lastBeg = len !== 0 ? haystackCodes.indexOf(58) : -1;
      if (lastBeg !== -1) {
        if (lastBeg >= bidiTrie.getHaystackLen() || haystackCodes[lastBeg + 1] !== 47 || haystackCodes[lastBeg + 2] !== 47) {
          lastBeg = -1;
        }
      }
      if (lastBeg !== -1) {
        lastBeg += 3;
        lastEnd = lastBeg + len;
      } else {
        lastEnd = -1;
      }
      filterData[idata + 1] = len;
      filterData[idata + 2] = lastBeg;
      filterData[idata + 3] = lastEnd;
    }
    const left = $patternMatchLeft;
    return left < lastEnd && (left === lastBeg || left > lastBeg && haystackCodes[left - 1] === 46);
  }
  static compile() {
    return [_FilterAnchorHnLeft.fid];
  }
  static fromCompiled(args) {
    const idata = filterDataAllocLen(4);
    filterData[idata + 0] = args[0];
    filterData[idata + 1] = 0;
    filterData[idata + 2] = -1;
    filterData[idata + 3] = -1;
    return idata;
  }
  static dnrFromCompiled(args, rule) {
    rule.condition.urlFilter = `||${rule.condition.urlFilter}`;
  }
  static keyFromArgs() {
  }
  static logData(idata, details) {
    details.pattern.unshift("||");
  }
};
registerFilterClass(FilterAnchorHnLeft);
var FilterAnchorHn = class _FilterAnchorHn extends FilterAnchorHnLeft {
  static {
    __name(this, "FilterAnchorHn");
  }
  static match(idata) {
    return super.match(idata) && filterData[idata + 3] === $patternMatchRight;
  }
  static compile() {
    return [_FilterAnchorHn.fid];
  }
  static dnrFromCompiled(args, rule) {
    rule.condition.requestDomains = [rule.condition.urlFilter];
    rule.condition.urlFilter = void 0;
  }
  static keyFromArgs() {
  }
  static logData(idata, details) {
    super.logData(idata, details);
    details.pattern.push("^");
    details.regex.push("\\.?", restrSeparator);
  }
};
registerFilterClass(FilterAnchorHn);
var FilterAnchorLeft = class _FilterAnchorLeft {
  static {
    __name(this, "FilterAnchorLeft");
  }
  static match() {
    return $patternMatchLeft === 0;
  }
  static compile() {
    return [_FilterAnchorLeft.fid];
  }
  static fromCompiled(args) {
    return filterDataAlloc(args[0]);
  }
  static dnrFromCompiled(args, rule) {
    rule.condition.urlFilter = `|${rule.condition.urlFilter}`;
  }
  static keyFromArgs() {
  }
  static logData(idata, details) {
    details.pattern.unshift("|");
    details.regex.unshift("^");
  }
};
registerFilterClass(FilterAnchorLeft);
var FilterAnchorRight = class _FilterAnchorRight {
  static {
    __name(this, "FilterAnchorRight");
  }
  static match() {
    return $patternMatchRight === $requestURL.length;
  }
  static compile() {
    return [_FilterAnchorRight.fid];
  }
  static fromCompiled(args) {
    return filterDataAlloc(args[0]);
  }
  static dnrFromCompiled(args, rule) {
    rule.condition.urlFilter = `${rule.condition.urlFilter}|`;
  }
  static keyFromArgs() {
  }
  static logData(idata, details) {
    details.pattern.push("|");
    details.regex.push("$");
  }
};
registerFilterClass(FilterAnchorRight);
var FilterTrailingSeparator = class _FilterTrailingSeparator {
  static {
    __name(this, "FilterTrailingSeparator");
  }
  static match() {
    if ($patternMatchRight === $requestURL.length) {
      return true;
    }
    if (isSeparatorChar(bidiTrie.haystack[$patternMatchRight])) {
      $patternMatchRight += 1;
      return true;
    }
    return false;
  }
  static compile() {
    return [_FilterTrailingSeparator.fid];
  }
  static fromCompiled(args) {
    return filterDataAlloc(args[0]);
  }
  static dnrFromCompiled(args, rule) {
    rule.condition.urlFilter = `${rule.condition.urlFilter}^`;
  }
  static keyFromArgs() {
  }
  static logData(idata, details) {
    details.pattern.push("^");
    details.regex.push(restrSeparator);
  }
};
registerFilterClass(FilterTrailingSeparator);
var FilterRegex = class _FilterRegex {
  static {
    __name(this, "FilterRegex");
  }
  static hasRegexPattern() {
    return true;
  }
  static getRegexPattern(idata) {
    return bidiTrie.extractString(
      filterData[idata + 1],
      filterData[idata + 2]
    );
  }
  static match(idata) {
    const refs = filterRefs[filterData[idata + 4]];
    if (refs.$re === null) {
      refs.$re = new RegExp(
        this.getRegexPattern(idata),
        filterData[idata + 3] === 0 ? "i" : ""
      );
    }
    if (refs.$re.test($requestURLRaw) === false) {
      return false;
    }
    return true;
  }
  static compile(details) {
    return [
      _FilterRegex.fid,
      details.pattern,
      details.optionValues.has("match-case") ? 1 : 0
    ];
  }
  static fromCompiled(args) {
    const idata = filterDataAllocLen(5);
    filterData[idata + 0] = args[0];
    filterData[idata + 1] = bidiTrie.storeString(args[1]);
    filterData[idata + 2] = args[1].length;
    filterData[idata + 3] = args[2];
    filterData[idata + 4] = filterRefAdd({ $re: null });
    return idata;
  }
  static dnrFromCompiled(args, rule) {
    if (rule.condition === void 0) {
      rule.condition = {};
    }
    if (isRE2(args[1]) === false) {
      dnrAddRuleError(rule, `regexFilter is not RE2-compatible: ${args[1]}`);
    }
    rule.condition.regexFilter = args[1];
    if (args[2] === 1) {
      rule.condition.isUrlFilterCaseSensitive = true;
    }
  }
  static keyFromArgs(args) {
    return `${args[1]}	${args[2]}`;
  }
  static logData(idata, details) {
    const s = bidiTrie.extractString(
      filterData[idata + 1],
      filterData[idata + 2]
    );
    details.pattern.push("/", s, "/");
    details.regex.push(s);
    details.isRegex = true;
    if (filterData[idata + 3] !== 0) {
      details.options.push("match-case");
    }
  }
  static dumpInfo(idata) {
    return [
      "/",
      bidiTrie.extractString(
        filterData[idata + 1],
        filterData[idata + 2]
      ),
      "/",
      filterData[idata + 3] !== 0 ? " (match-case)" : ""
    ].join("");
  }
};
FilterRegex.isSlow = true;
registerFilterClass(FilterRegex);
var FilterMethod = class _FilterMethod {
  static {
    __name(this, "FilterMethod");
  }
  static match(idata) {
    if ($requestMethodBit === 0) {
      return false;
    }
    const methodBits = filterData[idata + 1];
    const notMethodBits = filterData[idata + 2];
    return methodBits !== 0 && ($requestMethodBit & methodBits) !== 0 || notMethodBits !== 0 && ($requestMethodBit & notMethodBits) === 0;
  }
  static compile(details) {
    return [_FilterMethod.fid, details.methodBits, details.notMethodBits];
  }
  static fromCompiled(args) {
    const idata = filterDataAllocLen(3);
    filterData[idata + 0] = args[0];
    filterData[idata + 1] = args[1];
    filterData[idata + 2] = args[2];
    return idata;
  }
  static dnrFromCompiled(args, rule) {
    rule.condition = rule.condition || {};
    const rc2 = rule.condition;
    let methodBits = args[1];
    let notMethodBits = args[2];
    if (methodBits !== 0 && rc2.requestMethods === void 0) {
      rc2.requestMethods = [];
    }
    if (notMethodBits !== 0 && rc2.excludedRequestMethods === void 0) {
      rc2.excludedRequestMethods = [];
    }
    for (let i = 1; methodBits !== 0 || notMethodBits !== 0; i++) {
      const bit = 1 << i;
      const methodName = FilteringContext.getMethodName(bit);
      if ((methodBits & bit) !== 0) {
        methodBits &= ~bit;
        rc2.requestMethods.push(methodName);
      } else if ((notMethodBits & bit) !== 0) {
        notMethodBits &= ~bit;
        rc2.excludedRequestMethods.push(methodName);
      }
    }
  }
  static keyFromArgs(args) {
    return `${args[1]} ${args[2]}`;
  }
  static logData(idata, details) {
    const methods = [];
    let methodBits = filterData[idata + 1];
    let notMethodBits = filterData[idata + 2];
    for (let i = 0; methodBits !== 0 || notMethodBits !== 0; i++) {
      const bit = 1 << i;
      const methodName = FilteringContext.getMethodName(bit);
      if ((methodBits & bit) !== 0) {
        methodBits &= ~bit;
        methods.push(methodName);
      } else if ((notMethodBits & bit) !== 0) {
        notMethodBits &= ~bit;
        methods.push(`~${methodName}`);
      }
    }
    details.options.push(`method=${methods.join("|")}`);
  }
  static dumpInfo(idata) {
    return `0b${filterData[idata + 1].toString(2)} 0b${filterData[idata + 2].toString(2)}`;
  }
};
registerFilterClass(FilterMethod);
var FilterNotType = class _FilterNotType {
  static {
    __name(this, "FilterNotType");
  }
  static match(idata) {
    return $requestTypeValue !== 0 && (filterData[idata + 1] & 1 << $requestTypeValue - 1) === 0;
  }
  static compile(details) {
    return [_FilterNotType.fid, details.notTypeBits];
  }
  static fromCompiled(args) {
    const idata = filterDataAllocLen(2);
    filterData[idata + 0] = args[0];
    filterData[idata + 1] = args[1];
    return idata;
  }
  static dnrFromCompiled(args, rule) {
    rule.condition = rule.condition || {};
    const rc2 = rule.condition;
    if (rc2.excludedResourceTypes === void 0) {
      rc2.excludedResourceTypes = ["main_frame"];
    }
    let bits = args[1];
    for (let i = 1; bits !== 0 && i < typeValueToDNRTypeName.length; i++) {
      const bit = 1 << i - 1;
      if ((bits & bit) === 0) {
        continue;
      }
      bits &= ~bit;
      const type = typeValueToDNRTypeName[i];
      if (type === void 0) {
        continue;
      }
      if (rc2.excludedResourceTypes.includes(type)) {
        continue;
      }
      rc2.excludedResourceTypes.push(type);
    }
  }
  static keyFromArgs(args) {
    return `${args[1]}`;
  }
  static logData(idata, details) {
    let bits = filterData[idata + 1];
    for (let i = 1; bits !== 0 && i < typeValueToTypeName.length; i++) {
      const bit = 1 << i - 1;
      if ((bits & bit) === 0) {
        continue;
      }
      bits &= ~bit;
      details.options.push(`~${typeValueToTypeName[i]}`);
    }
  }
  static dumpInfo(idata) {
    return `0b${filterData[idata + 1].toString(2)}`;
  }
};
registerFilterClass(FilterNotType);
var DomainOptIterator = class {
  static {
    __name(this, "DomainOptIterator");
  }
  constructor(domainOpt) {
    this.reset(domainOpt);
  }
  reset(domainOpt) {
    this.domainOpt = domainOpt;
    this.i = 0;
    this.value = void 0;
    this.done = false;
    return this;
  }
  next() {
    if (this.i === -1) {
      this.domainOpt = "";
      this.value = void 0;
      this.done = true;
      return this;
    }
    const pos = this.domainOpt.indexOf("|", this.i);
    if (pos !== -1) {
      this.value = this.domainOpt.slice(this.i, pos);
      this.i = pos + 1;
    } else {
      this.value = this.domainOpt.slice(this.i);
      this.i = -1;
    }
    return this;
  }
  [Symbol.iterator]() {
    return this;
  }
};
var domainOptIterator = new DomainOptIterator("");
var compileDomainOpt = /* @__PURE__ */ __name((ctors, iterable, prepend, units) => {
  const hostnameHits = [];
  const hostnameMisses = [];
  const entityHits = [];
  const entityMisses = [];
  const regexHits = [];
  const regexMisses = [];
  for (const s of iterable) {
    const len = s.length;
    const beg = len > 1 && s.charCodeAt(0) === 126 ? 1 : 0;
    if (len <= beg) {
      continue;
    }
    if (s.charCodeAt(beg) === 47) {
      if (beg === 0) {
        regexHits.push(s);
        continue;
      }
      regexMisses.push(s.slice(1));
      continue;
    }
    if (s.endsWith(".*") === false) {
      if (beg === 0) {
        hostnameHits.push(s);
        continue;
      }
      hostnameMisses.push(s.slice(1));
      continue;
    }
    if (beg === 0) {
      entityHits.push(s);
      continue;
    }
    entityMisses.push(s.slice(1));
    continue;
  }
  const toTrie = [];
  let trieWhich = 0;
  if (hostnameHits.length > 1) {
    toTrie.push(...hostnameHits);
    hostnameHits.length = 0;
    trieWhich |= 1;
  }
  if (entityHits.length > 1) {
    toTrie.push(...entityHits);
    entityHits.length = 0;
    trieWhich |= 2;
  }
  const compiledHit = [];
  if (toTrie.length !== 0) {
    compiledHit.push(
      ctors[2].compile(toTrie.sort(), trieWhich)
    );
  }
  for (const hn2 of hostnameHits) {
    compiledHit.push(ctors[0].compile(hn2));
  }
  for (const hn2 of entityHits) {
    compiledHit.push(ctors[1].compile(hn2));
  }
  for (const hn2 of regexHits) {
    compiledHit.push(ctors[3].compile(hn2));
  }
  if (compiledHit.length > 1) {
    compiledHit[0] = FilterDomainHitAny.compile(compiledHit.slice());
    compiledHit.length = 1;
  }
  toTrie.length = trieWhich = 0;
  if (hostnameMisses.length > 1) {
    toTrie.push(...hostnameMisses);
    hostnameMisses.length = 0;
    trieWhich |= 1;
  }
  if (entityMisses.length > 1) {
    toTrie.push(...entityMisses);
    entityMisses.length = 0;
    trieWhich |= 2;
  }
  const compiledMiss = [];
  if (toTrie.length !== 0) {
    compiledMiss.push(
      ctors[6].compile(toTrie.sort(), trieWhich)
    );
  }
  for (const hn2 of hostnameMisses) {
    compiledMiss.push(ctors[4].compile(hn2));
  }
  for (const hn2 of entityMisses) {
    compiledMiss.push(ctors[5].compile(hn2));
  }
  for (const hn2 of regexMisses) {
    compiledMiss.push(ctors[7].compile(hn2));
  }
  if (prepend) {
    if (compiledHit.length !== 0) {
      units.unshift(compiledHit[0]);
    }
    if (compiledMiss.length !== 0) {
      units.unshift(...compiledMiss);
    }
  } else {
    if (compiledMiss.length !== 0) {
      units.push(...compiledMiss);
    }
    if (compiledHit.length !== 0) {
      units.push(compiledHit[0]);
    }
  }
}, "compileDomainOpt");
var FilterDomainHit = class {
  static {
    __name(this, "FilterDomainHit");
  }
  static getDomainOpt(idata) {
    return this.hntrieContainer.extractHostname(
      filterData[idata + 1],
      filterData[idata + 2]
    );
  }
  static match(idata) {
    return this.hntrieContainer.matchesHostname(
      this.getMatchTarget(),
      filterData[idata + 1],
      filterData[idata + 2]
    );
  }
  static compile(hostname) {
    return [this.fid, hostname];
  }
  static fromCompiled(args) {
    const idata = filterDataAllocLen(3);
    filterData[idata + 0] = args[0];
    filterData[idata + 1] = this.hntrieContainer.storeHostname(args[1]);
    filterData[idata + 2] = args[1].length;
    return idata;
  }
  static dnrFromCompiled(args, rule) {
    rule.condition = rule.condition || {};
    const prop = this.dnrConditionName;
    if (rule.condition[prop] === void 0) {
      rule.condition[prop] = [];
    }
    rule.condition[prop].push(args[1]);
  }
  static dumpInfo(idata) {
    return this.getDomainOpt(idata);
  }
};
var FilterDomainHitSet = class {
  static {
    __name(this, "FilterDomainHitSet");
  }
  static getDomainOpt(idata) {
    return this.hntrieContainer.extractDomainOpt(
      filterData[idata + 1],
      filterData[idata + 2]
    );
  }
  static getTrieCount(idata) {
    const itrie = filterData[idata + 4];
    if (itrie === 0) {
      return 0;
    }
    return Array.from(
      this.hntrieContainer.trieIterator(filterData[idata + 4])
    ).length;
  }
  static getLastResult(idata) {
    return filterData[idata + 5];
  }
  static getMatchedHostname(idata) {
    const lastResult = filterData[idata + 5];
    if (lastResult === -1) {
      return "";
    }
    return this.getMatchTarget(lastResult >>> 8).slice(lastResult & 255);
  }
  static match(idata) {
    const refs = filterRefs[filterData[idata + 6]];
    const docHostname = this.getMatchTarget(1);
    if (docHostname === refs.$last) {
      return filterData[idata + 5] !== -1;
    }
    refs.$last = docHostname;
    const which = filterData[idata + 3];
    const itrie = filterData[idata + 4] || this.toTrie(idata);
    if (itrie === 0) {
      return false;
    }
    if ((which & 1) !== 0) {
      const pos = this.hntrieContainer.setNeedle(docHostname).matches(itrie);
      if (pos !== -1) {
        filterData[idata + 5] = 1 << 8 | pos;
        return true;
      }
    }
    if ((which & 2) !== 0) {
      const pos = this.hntrieContainer.setNeedle(this.getMatchTarget(2)).matches(itrie);
      if (pos !== -1) {
        filterData[idata + 5] = 2 << 8 | pos;
        return true;
      }
    }
    filterData[idata + 5] = -1;
    return false;
  }
  static add(idata, hn2) {
    this.hntrieContainer.setNeedle(hn2).add(filterData[idata + 4]);
    filterData[idata + 3] |= hn2.charCodeAt(hn2.length - 1) !== 42 ? 1 : 2;
    filterData[idata + 5] = -1;
    filterRefs[filterData[idata + 6]].$last = "";
  }
  static create(fid = -1) {
    const idata = filterDataAllocLen(7);
    filterData[idata + 0] = fid !== -1 ? fid : this.fid;
    filterData[idata + 1] = 0;
    filterData[idata + 2] = 0;
    filterData[idata + 3] = 0;
    filterData[idata + 4] = this.hntrieContainer.createTrie();
    filterData[idata + 5] = -1;
    filterData[idata + 6] = filterRefAdd({ $last: "" });
    return idata;
  }
  static compile(hostnames, which) {
    const stringified = Array.isArray(hostnames) ? hostnames.join("|") : hostnames;
    return [this.fid, stringified, which];
  }
  static fromCompiled(args) {
    const idata = filterDataAllocLen(7);
    filterData[idata + 0] = args[0];
    filterData[idata + 1] = this.hntrieContainer.storeDomainOpt(args[1]);
    filterData[idata + 2] = args[1].length;
    filterData[idata + 3] = args[2];
    filterData[idata + 4] = 0;
    filterData[idata + 5] = -1;
    filterData[idata + 6] = filterRefAdd({ $last: "" });
    return idata;
  }
  static dnrFromCompiled(args, rule) {
    rule.condition = rule.condition || {};
    const prop = this.dnrConditionName;
    if (rule.condition[prop] === void 0) {
      rule.condition[prop] = [];
    }
    rule.condition[prop].push(...args[1].split("|"));
  }
  static toTrie(idata) {
    if (filterData[idata + 2] === 0) {
      return 0;
    }
    const itrie = filterData[idata + 4] = this.hntrieContainer.createTrieFromStoredDomainOpt(
      filterData[idata + 1],
      filterData[idata + 2]
    );
    return itrie;
  }
  static keyFromArgs(args) {
    return args[1];
  }
  static dumpInfo(idata) {
    return `0b${filterData[idata + 3].toString(2)} ${this.getDomainOpt(idata)}`;
  }
};
var FilterDomainRegexHit = class {
  static {
    __name(this, "FilterDomainRegexHit");
  }
  static getDomainOpt(idata) {
    const ref = filterRefs[filterData[idata + 1]];
    return ref.restr;
  }
  static match(idata) {
    const ref = filterRefs[filterData[idata + 1]];
    if (ref.$re === null) {
      ref.$re = new RegExp(ref.restr.slice(1, -1));
    }
    return ref.$re.test(this.getMatchTarget());
  }
  static compile(restr) {
    return [this.fid, restr];
  }
  static fromCompiled(args) {
    const idata = filterDataAllocLen(2);
    filterData[idata + 0] = args[0];
    filterData[idata + 1] = filterRefAdd({ restr: args[1], $re: null });
    return idata;
  }
  static dnrFromCompiled(args, rule) {
    rule.condition = rule.condition || {};
    const prop = this.dnrConditionName;
    if (rule.condition[prop] === void 0) {
      rule.condition[prop] = [];
    }
    rule.condition[prop].push(args[1]);
  }
  static dumpInfo(idata) {
    return this.getDomainOpt(idata);
  }
};
var FilterFromDomainHit = class extends FilterDomainHit {
  static {
    __name(this, "FilterFromDomainHit");
  }
  static hasOriginHit() {
    return true;
  }
  static getMatchTarget() {
    return $docHostname;
  }
  static get dnrConditionName() {
    return "initiatorDomains";
  }
  static logData(idata, details) {
    details.fromDomains.push(this.getDomainOpt(idata));
  }
};
Object.defineProperty(FilterFromDomainHit, "hntrieContainer", {
  value: origHNTrieContainer
});
var FilterFromDomainMiss = class extends FilterFromDomainHit {
  static {
    __name(this, "FilterFromDomainMiss");
  }
  static hasOriginHit() {
    return false;
  }
  static get dnrConditionName() {
    return "excludedInitiatorDomains";
  }
  static match(idata) {
    return super.match(idata) === false;
  }
  static logData(idata, details) {
    details.fromDomains.push(`~${this.getDomainOpt(idata)}`);
  }
};
var FilterFromEntityHit = class extends FilterFromDomainHit {
  static {
    __name(this, "FilterFromEntityHit");
  }
  static getMatchTarget() {
    return $docDetails.entity;
  }
};
var FilterFromEntityMiss = class extends FilterFromDomainMiss {
  static {
    __name(this, "FilterFromEntityMiss");
  }
  static getMatchTarget() {
    return $docDetails.entity;
  }
};
var FilterFromDomainHitSet = class extends FilterDomainHitSet {
  static {
    __name(this, "FilterFromDomainHitSet");
  }
  static hasOriginHit() {
    return true;
  }
  static getMatchTarget(which) {
    return (which & 1) !== 0 ? $docHostname : $docDetails.entity;
  }
  static get dnrConditionName() {
    return "initiatorDomains";
  }
  static logData(idata, details) {
    details.fromDomains.push(this.getDomainOpt(idata));
  }
};
Object.defineProperty(FilterFromDomainHitSet, "hntrieContainer", {
  value: origHNTrieContainer
});
var FilterFromDomainMissSet = class extends FilterFromDomainHitSet {
  static {
    __name(this, "FilterFromDomainMissSet");
  }
  static hasOriginHit() {
    return false;
  }
  static match(idata) {
    return super.match(idata) === false;
  }
  static get dnrConditionName() {
    return "excludedInitiatorDomains";
  }
  static logData(idata, details) {
    details.fromDomains.push("~" + this.getDomainOpt(idata).replace(/\|/g, "|~"));
  }
};
var FilterFromRegexHit = class extends FilterDomainRegexHit {
  static {
    __name(this, "FilterFromRegexHit");
  }
  static getMatchTarget() {
    return $docHostname;
  }
  static get dnrConditionName() {
    return "initiatorDomains";
  }
  static logData(idata, details) {
    details.fromDomains.push(`${this.getDomainOpt(idata)}`);
  }
};
var FilterFromRegexMiss = class extends FilterFromRegexHit {
  static {
    __name(this, "FilterFromRegexMiss");
  }
  static match(idata) {
    return super.match(idata) === false;
  }
  static get dnrConditionName() {
    return "excludedInitiatorDomains";
  }
  static logData(idata, details) {
    details.fromDomains.push(`~${this.getDomainOpt(idata)}`);
  }
};
registerFilterClass(FilterFromDomainHit);
registerFilterClass(FilterFromDomainMiss);
registerFilterClass(FilterFromEntityHit);
registerFilterClass(FilterFromEntityMiss);
registerFilterClass(FilterFromDomainHitSet);
registerFilterClass(FilterFromDomainMissSet);
registerFilterClass(FilterFromRegexHit);
registerFilterClass(FilterFromRegexMiss);
var fromOptClasses = [
  FilterFromDomainHit,
  FilterFromEntityHit,
  FilterFromDomainHitSet,
  FilterFromRegexHit,
  FilterFromDomainMiss,
  FilterFromEntityMiss,
  FilterFromDomainMissSet,
  FilterFromRegexMiss
];
var compileFromDomainOpt = /* @__PURE__ */ __name((...args) => {
  return compileDomainOpt(fromOptClasses, ...args);
}, "compileFromDomainOpt");
var FilterToDomainHit = class extends FilterDomainHit {
  static {
    __name(this, "FilterToDomainHit");
  }
  static getMatchTarget() {
    return $requestHostname;
  }
  static get dnrConditionName() {
    return "requestDomains";
  }
  static logData(idata, details) {
    details.toDomains.push(this.getDomainOpt(idata));
  }
};
Object.defineProperty(FilterToDomainHit, "hntrieContainer", {
  value: destHNTrieContainer
});
var FilterToDomainMiss = class extends FilterToDomainHit {
  static {
    __name(this, "FilterToDomainMiss");
  }
  static get dnrConditionName() {
    return "excludedRequestDomains";
  }
  static match(idata) {
    return super.match(idata) === false;
  }
  static logData(idata, details) {
    details.toDomains.push(`~${this.getDomainOpt(idata)}`);
  }
};
var FilterToEntityHit = class extends FilterToDomainHit {
  static {
    __name(this, "FilterToEntityHit");
  }
  static getMatchTarget() {
    return $requestDetails.entity;
  }
};
var FilterToEntityMiss = class extends FilterToDomainMiss {
  static {
    __name(this, "FilterToEntityMiss");
  }
  static getMatchTarget() {
    return $requestDetails.entity;
  }
};
var FilterToDomainHitSet = class extends FilterDomainHitSet {
  static {
    __name(this, "FilterToDomainHitSet");
  }
  static getMatchTarget(which) {
    return (which & 1) !== 0 ? $requestHostname : $requestDetails.entity;
  }
  static get dnrConditionName() {
    return "requestDomains";
  }
  static logData(idata, details) {
    details.toDomains.push(this.getDomainOpt(idata));
  }
};
Object.defineProperty(FilterToDomainHitSet, "hntrieContainer", {
  value: destHNTrieContainer
});
var FilterToDomainMissSet = class extends FilterToDomainHitSet {
  static {
    __name(this, "FilterToDomainMissSet");
  }
  static match(idata) {
    return super.match(idata) === false;
  }
  static get dnrConditionName() {
    return "excludedRequestDomains";
  }
  static logData(idata, details) {
    details.toDomains.push("~" + this.getDomainOpt(idata).replace(/\|/g, "|~"));
  }
};
var FilterToRegexHit = class extends FilterDomainRegexHit {
  static {
    __name(this, "FilterToRegexHit");
  }
  static getMatchTarget() {
    return $requestHostname;
  }
  static get dnrConditionName() {
    return "requestDomains";
  }
  static logData(idata, details) {
    details.toDomains.push(`${this.getDomainOpt(idata)}`);
  }
};
var FilterToRegexMiss = class extends FilterToRegexHit {
  static {
    __name(this, "FilterToRegexMiss");
  }
  static match(idata) {
    return super.match(idata) === false;
  }
  static get dnrConditionName() {
    return "excludedRequestDomains";
  }
  static logData(idata, details) {
    details.toDomains.push(`~${this.getDomainOpt(idata)}`);
  }
};
registerFilterClass(FilterToDomainHit);
registerFilterClass(FilterToDomainMiss);
registerFilterClass(FilterToEntityHit);
registerFilterClass(FilterToEntityMiss);
registerFilterClass(FilterToDomainHitSet);
registerFilterClass(FilterToDomainMissSet);
registerFilterClass(FilterToRegexHit);
registerFilterClass(FilterToRegexMiss);
var toOptClasses = [
  FilterToDomainHit,
  FilterToEntityHit,
  FilterToDomainHitSet,
  FilterToRegexHit,
  FilterToDomainMiss,
  FilterToEntityMiss,
  FilterToDomainMissSet,
  FilterToRegexMiss
];
var compileToDomainOpt = /* @__PURE__ */ __name((...args) => {
  return compileDomainOpt(toOptClasses, ...args);
}, "compileToDomainOpt");
var FilterTopDomainHit = class extends FilterDomainHit {
  static {
    __name(this, "FilterTopDomainHit");
  }
  static getMatchTarget() {
    return $topHostname;
  }
  static get dnrConditionName() {
    return "topDomains";
  }
  static logData(idata, details) {
    details.topDomains.push(this.getDomainOpt(idata));
  }
};
Object.defineProperty(FilterTopDomainHit, "hntrieContainer", {
  value: origHNTrieContainer
});
var FilterTopDomainMiss = class extends FilterTopDomainHit {
  static {
    __name(this, "FilterTopDomainMiss");
  }
  static get dnrConditionName() {
    return "excludedTopDomains";
  }
  static match(idata) {
    return super.match(idata) === false;
  }
  static logData(idata, details) {
    details.topDomains.push(`~${this.getDomainOpt(idata)}`);
  }
};
var FilterTopEntityHit = class extends FilterTopDomainHit {
  static {
    __name(this, "FilterTopEntityHit");
  }
  static getMatchTarget() {
    return $topDetails.entity;
  }
};
var FilterTopEntityMiss = class extends FilterTopDomainMiss {
  static {
    __name(this, "FilterTopEntityMiss");
  }
  static getMatchTarget() {
    return $topDetails.entity;
  }
};
var FilterTopDomainHitSet = class extends FilterDomainHitSet {
  static {
    __name(this, "FilterTopDomainHitSet");
  }
  static getMatchTarget(which) {
    return (which & 1) !== 0 ? $topHostname : $topDetails.entity;
  }
  static get dnrConditionName() {
    return "topDomains";
  }
  static logData(idata, details) {
    details.topDomains.push(this.getDomainOpt(idata));
  }
};
Object.defineProperty(FilterTopDomainHitSet, "hntrieContainer", {
  value: origHNTrieContainer
});
var FilterTopDomainMissSet = class extends FilterTopDomainHitSet {
  static {
    __name(this, "FilterTopDomainMissSet");
  }
  static match(idata) {
    return super.match(idata) === false;
  }
  static get dnrConditionName() {
    return "excludedTopDomains";
  }
  static logData(idata, details) {
    details.topDomains.push("~" + this.getDomainOpt(idata).replace(/\|/g, "|~"));
  }
};
var FilterTopRegexHit = class extends FilterDomainRegexHit {
  static {
    __name(this, "FilterTopRegexHit");
  }
  static getMatchTarget() {
    return $topHostname;
  }
  static get dnrConditionName() {
    return "topDomains";
  }
  static logData(idata, details) {
    details.topDomains.push(`${this.getDomainOpt(idata)}`);
  }
};
var FilterTopRegexMiss = class extends FilterTopRegexHit {
  static {
    __name(this, "FilterTopRegexMiss");
  }
  static match(idata) {
    return super.match(idata) === false;
  }
  static get dnrConditionName() {
    return "excludedTopDomains";
  }
  static logData(idata, details) {
    details.topDomains.push(`~${this.getDomainOpt(idata)}`);
  }
};
registerFilterClass(FilterTopDomainHit);
registerFilterClass(FilterTopDomainMiss);
registerFilterClass(FilterTopEntityHit);
registerFilterClass(FilterTopEntityMiss);
registerFilterClass(FilterTopDomainHitSet);
registerFilterClass(FilterTopDomainMissSet);
registerFilterClass(FilterTopRegexHit);
registerFilterClass(FilterTopRegexMiss);
var topOptClasses = [
  FilterTopDomainHit,
  FilterTopEntityHit,
  FilterTopDomainHitSet,
  FilterTopRegexHit,
  FilterTopDomainMiss,
  FilterTopEntityMiss,
  FilterTopDomainMissSet,
  FilterTopRegexMiss
];
var compileTopDomainOpt = /* @__PURE__ */ __name((...args) => {
  return compileDomainOpt(topOptClasses, ...args);
}, "compileTopDomainOpt");
var FilterDenyAllow = class extends FilterToDomainMissSet {
  static {
    __name(this, "FilterDenyAllow");
  }
  static compile(details) {
    return super.compile(details.optionValues.get("denyallow"), 1);
  }
  static logData(idata, details) {
    details.denyallow.push(this.getDomainOpt(idata));
  }
};
registerFilterClass(FilterDenyAllow);
var FilterModifier = class _FilterModifier {
  static {
    __name(this, "FilterModifier");
  }
  static getModifierType(idata) {
    return filterData[idata + 2];
  }
  static match() {
    return true;
  }
  static matchAndFetchModifiers(idata, env) {
    if (this.getModifierType(idata) !== env.type) {
      return;
    }
    env.results.push(new FilterModifierResult(idata, env));
  }
  static compile(details) {
    return [
      _FilterModifier.fid,
      details.action,
      details.modifyType,
      details.modifyValue || ""
    ];
  }
  static fromCompiled(args) {
    const idata = filterDataAllocLen(4);
    filterData[idata + 0] = args[0];
    filterData[idata + 1] = args[1];
    filterData[idata + 2] = args[2];
    filterData[idata + 3] = filterRefAdd({
      value: args[3],
      $cache: null
    });
    return idata;
  }
  static dnrFromCompiled(args, rule) {
    rule.__modifierAction = args[1];
    rule.__modifierType = modifierNameFromType.get(args[2]);
    rule.__modifierValue = args[3];
  }
  static keyFromArgs(args) {
    return `${args[1]}	${args[2]}	${args[3]}`;
  }
  static logData(idata, details) {
    let opt = modifierNameFromType.get(filterData[idata + 2]);
    const refs = filterRefs[filterData[idata + 3]];
    if (refs.value !== "") {
      opt += `=${LogData.requote(refs.value)}`;
    }
    details.options.push(opt);
  }
  static dumpInfo(idata) {
    const s = modifierNameFromType.get(filterData[idata + 2]);
    const refs = filterRefs[filterData[idata + 3]];
    if (refs.value === "") {
      return s;
    }
    return `${s}=${refs.value}`;
  }
};
registerFilterClass(FilterModifier);
var FilterModifierResult = class {
  static {
    __name(this, "FilterModifierResult");
  }
  constructor(imodifierunit, env) {
    this.imodifierunit = imodifierunit;
    this.refs = filterRefs[filterData[imodifierunit + 3]];
    this.ireportedunit = env.iunit;
    this.th = env.th;
    this.bits = env.bits & ~BLOCKALLOW_REALM | filterData[imodifierunit + 1];
  }
  get result() {
    return (this.bits & ALLOW_REALM) === 0 ? 1 : 2;
  }
  get value() {
    return this.refs.value;
  }
  get cache() {
    return this.refs.$cache;
  }
  set cache(a) {
    this.refs.$cache = a;
  }
  logData() {
    const r = new LogData(this.bits, this.th, this.ireportedunit);
    r.result = this.result;
    r.modifier = true;
    return r;
  }
};
var FilterCollection = class _FilterCollection {
  static {
    __name(this, "FilterCollection");
  }
  static getCount(idata) {
    let n = 0;
    this.forEach(idata, () => {
      n += 1;
    });
    return n;
  }
  static forEach(idata, fn2) {
    let i = filterData[idata + 1];
    if (i === 0) {
      return;
    }
    do {
      const iunit = filterData[i + 0];
      const r = fn2(iunit);
      if (r !== void 0) {
        return r;
      }
      i = filterData[i + 1];
    } while (i !== 0);
  }
  static unshift(idata, iunit) {
    filterData[idata + 1] = filterSequenceAdd(iunit, filterData[idata + 1]);
  }
  static shift(idata) {
    filterData[idata + 1] = filterData[filterData[idata + 1] + 1];
  }
  static create(fid = -1) {
    return filterDataAlloc(
      fid !== -1 ? fid : _FilterCollection.fid,
      0
    );
  }
  static compile(fc2, fdata) {
    return [fc2.fid, fdata];
  }
  static fromCompiled(args) {
    const units = args[1];
    const n = units.length;
    let iunit, inext = 0;
    let i = n;
    while (i--) {
      iunit = filterFromCompiled(units[i]);
      inext = filterSequenceAdd(iunit, inext);
    }
    const idata = filterDataAllocLen(2);
    filterData[idata + 0] = args[0];
    filterData[idata + 1] = inext;
    return idata;
  }
  static dnrFromCompiled(args, rule) {
    for (const unit of args[1]) {
      dnrRuleFromCompiled(unit, rule);
    }
  }
  static logData(idata, details) {
    this.forEach(idata, (iunit) => {
      filterLogData(iunit, details);
    });
  }
  static dumpInfo(idata) {
    return this.getCount(idata);
  }
};
registerFilterClass(FilterCollection);
var FilterDomainHitAny = class _FilterDomainHitAny extends FilterCollection {
  static {
    __name(this, "FilterDomainHitAny");
  }
  static getDomainOpt(idata) {
    const domainOpts = [];
    this.forEach(idata, (iunit) => {
      if (filterHasOriginHit(iunit) !== true) {
        return;
      }
      filterGetDomainOpt(iunit, domainOpts);
    });
    return domainOpts.join("|");
  }
  static hasOriginHit(idata) {
    this.forEach(idata, (iunit) => {
      if (filterHasOriginHit(iunit)) {
        return true;
      }
    });
    return false;
  }
  static match(idata) {
    let i = filterData[idata + 1];
    while (i !== 0) {
      if (filterMatch(filterData[i + 0])) {
        return true;
      }
      i = filterData[i + 1];
    }
    return false;
  }
  static compile(fdata) {
    return super.compile(_FilterDomainHitAny, fdata);
  }
  static fromCompiled(args) {
    return super.fromCompiled(args);
  }
};
registerFilterClass(FilterDomainHitAny);
var FilterCompositeAll = class _FilterCompositeAll extends FilterCollection {
  static {
    __name(this, "FilterCompositeAll");
  }
  // FilterPatternPlain is assumed to be first filter in sequence. This can
  // be revisited if needed.
  static isBidiTrieable(idata) {
    return filterIsBidiTrieable(filterData[filterData[idata + 1] + 0]);
  }
  static toBidiTrie(idata) {
    const iseq = filterData[idata + 1];
    const details = filterToBidiTrie(filterData[iseq + 0]);
    this.shift(idata);
    return details;
  }
  static getDomainOpt(idata) {
    return this.forEach(idata, (iunit) => {
      if (filterHasOriginHit(iunit) !== true) {
        return;
      }
      return filterGetDomainOpt(iunit);
    });
  }
  static hasOriginHit(idata) {
    return this.forEach(idata, (iunit) => {
      if (filterHasOriginHit(iunit) === true) {
        return true;
      }
    }) || false;
  }
  static hasRegexPattern(idata) {
    return this.forEach(idata, (iunit) => {
      const fc2 = filterGetClass(iunit);
      if (fc2.hasRegexPattern === void 0) {
        return;
      }
      if (fc2.hasRegexPattern(iunit) === true) {
        return true;
      }
    }) || false;
  }
  static getRegexPattern(idata) {
    return this.forEach(idata, (iunit) => {
      const fc2 = filterGetClass(iunit);
      if (fc2.getRegexPattern === void 0) {
        return;
      }
      return fc2.getRegexPattern(iunit);
    });
  }
  static match(idata) {
    let i = filterData[idata + 1];
    while (i !== 0) {
      if (filterMatch(filterData[i + 0]) !== true) {
        return false;
      }
      i = filterData[i + 1];
    }
    return true;
  }
  // IMPORTANT: the modifier filter unit is assumed to be ALWAYS the
  // first unit in the sequence. This requirement ensures that we do
  // not have to traverse the sequence to find the modifier filter
  // unit.
  static getModifierType(idata) {
    const iseq = filterData[idata + 1];
    const iunit = filterData[iseq + 0];
    return filterGetModifierType(iunit);
  }
  static matchAndFetchModifiers(idata, env) {
    const iseq = filterData[idata + 1];
    const iunit = filterData[iseq + 0];
    if (filterGetModifierType(iunit) === env.type && this.match(idata)) {
      filterMatchAndFetchModifiers(iunit, env);
    }
  }
  static compile(fdata) {
    return super.compile(_FilterCompositeAll, fdata);
  }
  static fromCompiled(args) {
    return super.fromCompiled(args);
  }
};
registerFilterClass(FilterCompositeAll);
var FilterHostnameDict = class _FilterHostnameDict {
  static {
    __name(this, "FilterHostnameDict");
  }
  static getCount(idata) {
    const itrie = filterData[idata + 1];
    if (itrie !== 0) {
      return Array.from(destHNTrieContainer.trieIterator(itrie)).length;
    }
    return filterRefs[filterData[idata + 3]].length;
  }
  static match(idata) {
    const itrie = filterData[idata + 1] || this.optimize(idata);
    return (filterData[idata + 2] = destHNTrieContainer.setNeedle($requestHostname).matches(itrie)) !== -1;
  }
  static add(idata, hn2) {
    const itrie = filterData[idata + 1];
    if (itrie === 0) {
      filterRefs[filterData[idata + 3]].push(hn2);
    } else {
      destHNTrieContainer.setNeedle(hn2).add(itrie);
    }
  }
  static optimize(idata) {
    const itrie = filterData[idata + 1];
    if (itrie !== 0) {
      return itrie;
    }
    const hostnames = filterRefs[filterData[idata + 3]];
    filterData[idata + 1] = destHNTrieContainer.createTrieFromIterable(hostnames);
    filterRefs[filterData[idata + 3]] = null;
    return filterData[idata + 1];
  }
  static create() {
    const idata = filterDataAllocLen(4);
    filterData[idata + 0] = _FilterHostnameDict.fid;
    filterData[idata + 1] = 0;
    filterData[idata + 2] = -1;
    filterData[idata + 3] = filterRefAdd([]);
    return idata;
  }
  static logData(idata, details) {
    const hostname = $requestHostname.slice(filterData[idata + 2]);
    details.pattern.push("||", hostname, "^");
    details.regex.push(
      restrFromPlainPattern(hostname),
      "\\.?",
      restrSeparator
    );
  }
  static dumpInfo(idata) {
    return this.getCount(idata);
  }
};
registerFilterClass(FilterHostnameDict);
var FilterJustOrigin = class _FilterJustOrigin extends FilterFromDomainHitSet {
  static {
    __name(this, "FilterJustOrigin");
  }
  static create(fid = -1) {
    return super.create(fid !== -1 ? fid : _FilterJustOrigin.fid);
  }
  static logPattern(idata, details) {
    details.pattern.push("*");
    details.regex.push("^");
  }
  static logData(idata, details) {
    this.logPattern(idata, details);
    details.fromDomains.push(this.getMatchedHostname(idata));
  }
  static dumpInfo(idata) {
    return this.getTrieCount(idata);
  }
};
registerFilterClass(FilterJustOrigin);
var FilterHTTPSJustOrigin = class _FilterHTTPSJustOrigin extends FilterJustOrigin {
  static {
    __name(this, "FilterHTTPSJustOrigin");
  }
  static match(idata) {
    return $requestURL.startsWith("https://") && super.match(idata);
  }
  static create() {
    return super.create(_FilterHTTPSJustOrigin.fid);
  }
  static logPattern(idata, details) {
    details.pattern.push("|https://");
    details.regex.push("^https://");
  }
};
registerFilterClass(FilterHTTPSJustOrigin);
var FilterHTTPJustOrigin = class _FilterHTTPJustOrigin extends FilterJustOrigin {
  static {
    __name(this, "FilterHTTPJustOrigin");
  }
  static match(idata) {
    return $requestURL.startsWith("http://") && super.match(idata);
  }
  static create() {
    return super.create(_FilterHTTPJustOrigin.fid);
  }
  static logPattern(idata, details) {
    details.pattern.push("|http://");
    details.regex.push("^http://");
  }
};
registerFilterClass(FilterHTTPJustOrigin);
var FilterPlainTrie = class _FilterPlainTrie {
  static {
    __name(this, "FilterPlainTrie");
  }
  static match(idata) {
    if (bidiTrie.matches(filterData[idata + 1], $tokenBeg) !== 0) {
      filterData[idata + 2] = bidiTrie.$iu;
      return true;
    }
    return false;
  }
  static create() {
    const idata = filterDataAllocLen(3);
    filterData[idata + 0] = _FilterPlainTrie.fid;
    filterData[idata + 1] = bidiTrie.createTrie();
    filterData[idata + 2] = 0;
    return idata;
  }
  static addUnitToTrie(idata, iunit) {
    const trieDetails = filterToBidiTrie(iunit);
    const itrie = filterData[idata + 1];
    const id = bidiTrie.add(
      itrie,
      trieDetails.i,
      trieDetails.n,
      trieDetails.itok
    );
    const ix = bidiTrie.getExtra(id);
    if (ix === 1) {
      return;
    }
    const fc2 = filterGetClass(iunit);
    if (fc2.isPatternPlain) {
      bidiTrie.setExtra(id, 1);
      return;
    }
    if (fc2 === FilterCompositeAll && fc2.getCount(iunit) === 1) {
      iunit = filterData[filterData[iunit + 1] + 0];
    }
    bidiTrie.setExtra(id, filterSequenceAdd(iunit, ix));
  }
  static logData(idata, details) {
    const s = $requestURL.slice(bidiTrie.$l, bidiTrie.$r);
    details.pattern.push(s);
    details.regex.push(restrFromPlainPattern(s));
    if (filterData[idata + 2] !== -1) {
      filterLogData(filterData[idata + 2], details);
    }
  }
  static dumpInfo(idata) {
    return `${Array.from(bidiTrie.trieIterator(filterData[idata + 1])).length}`;
  }
};
registerFilterClass(FilterPlainTrie);
var FilterBucket = class _FilterBucket extends FilterCollection {
  static {
    __name(this, "FilterBucket");
  }
  static getCount(idata) {
    return filterData[idata + 2];
  }
  static forEach(idata, fn2) {
    return super.forEach(filterData[idata + 1], fn2);
  }
  static match(idata) {
    const icollection = filterData[idata + 1];
    let iseq = filterData[icollection + 1];
    while (iseq !== 0) {
      const iunit = filterData[iseq + 0];
      if (filterMatch(iunit)) {
        filterData[idata + 3] = iunit;
        return true;
      }
      iseq = filterData[iseq + 1];
    }
    return false;
  }
  static matchAndFetchModifiers(idata, env) {
    const icollection = filterData[idata + 1];
    let iseq = filterData[icollection + 1];
    while (iseq !== 0) {
      const iunit = filterData[iseq + 0];
      env.iunit = iunit;
      filterMatchAndFetchModifiers(iunit, env);
      iseq = filterData[iseq + 1];
    }
  }
  static unshift(idata, iunit) {
    super.unshift(filterData[idata + 1], iunit);
    filterData[idata + 2] += 1;
  }
  static shift(idata) {
    super.shift(filterData[idata + 1]);
    filterData[idata + 2] -= 1;
  }
  static create() {
    const idata = filterDataAllocLen(4);
    filterData[idata + 0] = _FilterBucket.fid;
    filterData[idata + 1] = FilterCollection.create();
    filterData[idata + 2] = 0;
    filterData[idata + 3] = 0;
    return idata;
  }
  static logData(idata, details) {
    filterLogData(filterData[idata + 3], details);
  }
  static optimize(idata, optimizeBits = 3) {
    if ((optimizeBits & 1) !== 0) {
      if (filterData[idata + 2] >= 3) {
        const iplaintrie = this.optimizePatternTests(idata);
        if (iplaintrie !== 0) {
          const icollection = filterData[idata + 1];
          const i = filterData[icollection + 1];
          if (i === 0) {
            return iplaintrie;
          }
          this.unshift(idata, iplaintrie);
        }
      }
    }
    if ((optimizeBits & 2) !== 0) {
      if (filterData[idata + 2] >= 5) {
        const ioptimized = this.optimizeMatch(
          idata,
          FilterBucketIfOriginHits,
          5
        );
        if (ioptimized !== 0) {
          const icollection = filterData[idata + 1];
          const i = filterData[icollection + 1];
          if (i === 0) {
            return ioptimized;
          }
          this.unshift(idata, ioptimized);
        }
      }
      if (filterData[idata + 2] >= 5) {
        const ioptimized = this.optimizeMatch(
          idata,
          FilterBucketIfRegexHits,
          5
        );
        if (ioptimized !== 0) {
          const icollection = filterData[idata + 1];
          const i = filterData[icollection + 1];
          if (i === 0) {
            return ioptimized;
          }
          this.unshift(idata, ioptimized);
        }
      }
    }
    return 0;
  }
  static optimizePatternTests(idata) {
    const isrccollection = filterData[idata + 1];
    let n = 0;
    let iseq = filterData[isrccollection + 1];
    do {
      if (filterIsBidiTrieable(filterData[iseq + 0])) {
        n += 1;
      }
      iseq = filterData[iseq + 1];
    } while (iseq !== 0 && n < 3);
    if (n < 3) {
      return 0;
    }
    const iplaintrie = FilterPlainTrie.create();
    iseq = filterData[isrccollection + 1];
    let iprev = 0;
    for (; ; ) {
      const iunit = filterData[iseq + 0];
      const inext = filterData[iseq + 1];
      if (filterIsBidiTrieable(iunit)) {
        FilterPlainTrie.addUnitToTrie(iplaintrie, iunit);
        if (iprev !== 0) {
          filterData[iprev + 1] = inext;
        } else {
          filterData[isrccollection + 1] = inext;
        }
        filterData[idata + 2] -= 1;
      } else {
        iprev = iseq;
      }
      if (inext === 0) {
        break;
      }
      iseq = inext;
    }
    return iplaintrie;
  }
  static optimizeMatch(idata, fc2, min) {
    const isrccollection = filterData[idata + 1];
    const candidates = [];
    this.forEach(idata, (iunit) => {
      if (fc2.canCoalesce(iunit) === false) {
        return;
      }
      candidates.push(iunit);
    });
    if (candidates.length < min) {
      return 0;
    }
    const idesbucket = _FilterBucket.create();
    const idescollection = filterData[idesbucket + 1];
    let coalesced;
    let isrcseq = filterData[isrccollection + 1];
    let iprev = 0;
    for (; ; ) {
      const iunit = filterData[isrcseq + 0];
      const inext = filterData[isrcseq + 1];
      if (candidates.includes(iunit)) {
        coalesced = fc2.coalesce(iunit, coalesced);
        filterData[isrcseq + 1] = filterData[idescollection + 1];
        filterData[idescollection + 1] = isrcseq;
        filterData[idesbucket + 2] += 1;
        if (iprev !== 0) {
          filterData[iprev + 1] = inext;
        } else {
          filterData[isrccollection + 1] = inext;
        }
        filterData[idata + 2] -= 1;
      } else {
        iprev = isrcseq;
      }
      if (inext === 0) {
        break;
      }
      isrcseq = inext;
    }
    return fc2.create(coalesced, idesbucket);
  }
  static dumpInfo(idata) {
    return this.getCount(idata);
  }
};
registerFilterClass(FilterBucket);
var FilterBucketIf = class extends FilterBucket {
  static {
    __name(this, "FilterBucketIf");
  }
  static getCount(idata) {
    return super.getCount(filterData[idata + 1]);
  }
  static forEach(idata, fn2) {
    return super.forEach(filterData[idata + 1], fn2);
  }
  static match(idata) {
    return this.preTest(idata) && super.match(filterData[idata + 1]);
  }
  static matchAndFetchModifiers(idata, env) {
    if (this.preTest(idata)) {
      super.matchAndFetchModifiers(filterData[idata + 1], env);
    }
  }
  static create(fid, ibucket, itest) {
    const idata = filterDataAllocLen(3);
    filterData[idata + 0] = fid;
    filterData[idata + 1] = ibucket;
    filterData[idata + 2] = itest;
    return idata;
  }
  static logData(idata, details) {
    filterLogData(filterData[idata + 1], details);
  }
};
registerFilterClass(FilterBucketIf);
var FilterBucketIfOriginHits = class _FilterBucketIfOriginHits extends FilterBucketIf {
  static {
    __name(this, "FilterBucketIfOriginHits");
  }
  static preTest(idata) {
    return filterMatch(filterData[idata + 2]);
  }
  static canCoalesce(iunit) {
    return filterHasOriginHit(iunit);
  }
  static coalesce(iunit, coalesced) {
    if (coalesced === void 0) {
      coalesced = /* @__PURE__ */ new Set();
    }
    const domainOpt = filterGetDomainOpt(iunit);
    if (domainOpt.includes("|")) {
      for (const hn2 of domainOptIterator.reset(domainOpt)) {
        coalesced.add(hn2);
      }
    } else {
      coalesced.add(domainOpt);
    }
    return coalesced;
  }
  static create(coalesced, ibucket) {
    const units = [];
    compileFromDomainOpt(coalesced, false, units);
    const ihittest = filterFromCompiled(units[0]);
    const ipretest = super.create(
      _FilterBucketIfOriginHits.fid,
      ibucket,
      ihittest
    );
    return ipretest;
  }
};
registerFilterClass(FilterBucketIfOriginHits);
var FilterBucketIfRegexHits = class _FilterBucketIfRegexHits extends FilterBucketIf {
  static {
    __name(this, "FilterBucketIfRegexHits");
  }
  static preTest(idata) {
    return filterRefs[filterData[idata + 2]].test($requestURLRaw);
  }
  static canCoalesce(iunit) {
    const fc2 = filterGetClass(iunit);
    if (fc2.hasRegexPattern === void 0) {
      return false;
    }
    if (fc2.hasRegexPattern(iunit) !== true) {
      return false;
    }
    return true;
  }
  static coalesce(iunit, coalesced) {
    if (coalesced === void 0) {
      coalesced = /* @__PURE__ */ new Set();
    }
    coalesced.add(filterGetRegexPattern(iunit));
    return coalesced;
  }
  static create(coalesced, ibucket) {
    const reString = Array.from(coalesced).join("|");
    return super.create(
      _FilterBucketIfRegexHits.fid,
      ibucket,
      filterRefAdd(new RegExp(reString, "i"))
    );
  }
  static dumpInfo(idata) {
    return filterRefs[filterData[idata + 2]].source;
  }
};
registerFilterClass(FilterBucketIfRegexHits);
var FilterStrictParty = class _FilterStrictParty {
  static {
    __name(this, "FilterStrictParty");
  }
  static match(idata) {
    return $requestHostname === $docHostname === (filterData[idata + 1] === 0);
  }
  static compile(details) {
    return [
      _FilterStrictParty.fid,
      details.strictParty > 0 ? 0 : 1
    ];
  }
  static fromCompiled(args) {
    return filterDataAlloc(
      args[0],
      // fid
      args[1]
    );
  }
  static dnrFromCompiled(args, rule) {
    const partyness = args[1] === 0 ? 1 : 3;
    dnrAddRuleError(rule, `strict${partyness}p not supported`);
  }
  static keyFromArgs(args) {
    return `${args[1]}`;
  }
  static logData(idata, details) {
    details.options.push(
      filterData[idata + 1] === 0 ? "strict1p" : "strict3p"
    );
  }
};
registerFilterClass(FilterStrictParty);
var FilterOnHeaders = class {
  static {
    __name(this, "FilterOnHeaders");
  }
  static match(idata) {
    const refs = filterRefs[filterData[idata + 1]];
    if (refs.$parsed === null) {
      refs.$parsed = parseHeaderValue(refs.headerOpt);
    }
    const { bad, name, not, value } = refs.$parsed;
    if (bad) {
      return false;
    }
    const headerValue = $httpHeaders.lookup(name);
    if (headerValue === void 0) {
      return false;
    }
    if (value === "") {
      return true;
    }
    let { re: re2 } = refs.$parsed;
    if (re2 === void 0) {
      re2 = new RegExp(refs.$parsed.reStr, refs.$parsed.reFlags);
      refs.$parsed.re = re2;
    }
    return re2.test(headerValue) !== not;
  }
  static compile(fid, details) {
    const fc2 = filterClasses[fid];
    const parsed = parseHeaderValue(details.optionValues.get(`${fc2.headerRealm}header`));
    let normalized = parsed.name;
    if (parsed.value !== "") {
      normalized += `:${parsed.value}`;
    }
    return [fid, normalized];
  }
  static fromCompiled(args) {
    return filterDataAlloc(
      args[0],
      // fid
      filterRefAdd({
        headerOpt: args[1],
        $parsed: null
      })
    );
  }
  static dnrFromCompiled(fid, args, rule) {
    const fc2 = filterClasses[fid];
    rule.condition ||= {};
    const parsed = parseHeaderValue(args[1]);
    if (parsed.bad !== true) {
      const value = parsed.isRegex ? toHeaderPattern(parsed.reStr) : parsed.value;
      if (value !== void 0) {
        const prop = parsed.not ? `excludedR${fc2.headerRealm.slice(1)}Headers` : `${fc2.headerRealm}Headers`;
        rule.condition[prop] ||= [];
        const details = {
          header: parsed.name
        };
        if (value !== "") {
          details.values = [value];
        }
        rule.condition[prop].push(details);
        return;
      }
    }
    dnrAddRuleError(rule, `${fc2.headerRealm}header="${args[1]}" not supported`);
  }
  static logData(fid, idata, details) {
    const fc2 = filterClasses[fid];
    const irefs = filterData[idata + 1];
    const headerOpt = filterRefs[irefs].headerOpt;
    let opt = `${fc2.headerRealm}header`;
    if (headerOpt !== "") {
      opt += `=${LogData.requote(headerOpt)}`;
    }
    details.options.push(opt);
  }
};
var FilterOnResponseHeaders = class _FilterOnResponseHeaders extends FilterOnHeaders {
  static {
    __name(this, "FilterOnResponseHeaders");
  }
  static headerRealm = "response";
  static compile(details) {
    return super.compile(_FilterOnResponseHeaders.fid, details);
  }
  static dnrFromCompiled(args, rule) {
    super.dnrFromCompiled(_FilterOnResponseHeaders.fid, args, rule);
  }
  static logData(idata, details) {
    super.logData(_FilterOnResponseHeaders.fid, idata, details);
  }
};
registerFilterClass(FilterOnResponseHeaders);
var FilterOnRequestHeaders = class _FilterOnRequestHeaders extends FilterOnHeaders {
  static {
    __name(this, "FilterOnRequestHeaders");
  }
  static headerRealm = "request";
  static compile(details) {
    return super.compile(_FilterOnRequestHeaders.fid, details);
  }
  static dnrFromCompiled(args, rule) {
    dnrAddRuleError(rule, `requestheader="${args[1]}" not supported`);
  }
  static logData(idata, details) {
    super.logData(_FilterOnRequestHeaders.fid, idata, details);
  }
};
registerFilterClass(FilterOnRequestHeaders);
var FilterIPAddress = class _FilterIPAddress {
  static {
    __name(this, "FilterIPAddress");
  }
  static TYPE_UNKNOWN = 0;
  static TYPE_EQUAL = 1;
  static TYPE_STARTSWITH = 2;
  static TYPE_LAN = 3;
  static TYPE_LOOPBACK = 4;
  static TYPE_RE = 5;
  static reIPv6IPv4lan = /^::ffff:(7f\w{2}|a\w{2}|a9fe|c0a8):\w+$/;
  static reIPv6local = /^f[cd]\w{2}:/;
  static match(idata) {
    const ipaddr = $requestAddress;
    if (ipaddr === "") {
      return false;
    }
    const details = filterRefs[filterData[idata + 1]];
    switch (details.$type || this.TYPE_UNKNOWN) {
      case this.TYPE_LAN:
        return this.isLAN(ipaddr);
      case this.TYPE_LOOPBACK:
        return this.isLoopback(ipaddr);
      case this.TYPE_EQUAL:
      case this.TYPE_STARTSWITH:
      case this.TYPE_RE:
        return details.$pattern.test(ipaddr);
      default:
        break;
    }
    const { pattern } = details;
    if (pattern === "lan") {
      details.$type = this.TYPE_LAN;
    } else if (pattern === "loopback") {
      details.$type = this.TYPE_LOOPBACK;
    } else if (pattern.startsWith("/") && pattern.endsWith("/")) {
      details.$type = this.TYPE_RE;
      details.$pattern = new RegExp(pattern.slice(1, -1), "m");
    } else if (pattern.endsWith("*")) {
      details.$type = this.TYPE_STARTSWITH;
      details.$pattern = new RegExp(`^${restrFromPlainPattern(pattern.slice(0, -1))}`, "m");
    } else {
      details.$type = this.TYPE_EQUAL;
      details.$pattern = new RegExp(`^${restrFromPlainPattern(pattern)}$`, "m");
    }
    return this.match(idata);
  }
  // https://github.com/uBlockOrigin/uAssets/blob/master/filters/lan-block.txt
  // https://en.wikipedia.org/wiki/Reserved_IP_addresses
  // `ipaddr` is assumed well-formed
  static isLAN(ipaddr) {
    const c0 = ipaddr.charCodeAt(0);
    if (c0 === 48) {
      return ipaddr.startsWith("0.");
    }
    if (c0 === 49) {
      if (ipaddr.startsWith("10.")) {
        return true;
      }
      if (ipaddr.startsWith("127.")) {
        return true;
      }
      if (ipaddr.startsWith("169.254.")) {
        return true;
      }
      if (ipaddr.startsWith("172.")) {
        const v2 = parseInt(ipaddr.slice(4), 10);
        return v2 >= 16 && v2 <= 31;
      }
      return ipaddr.startsWith("192.168.");
    }
    if (c0 === 58) {
      if (ipaddr.startsWith("::") === false) {
        return false;
      }
      if (ipaddr === "::" || ipaddr === "::1") {
        return true;
      }
      if (ipaddr.startsWith("::ffff:") === false) {
        return false;
      }
      return this.reIPv6IPv4lan.test(ipaddr);
    }
    if (c0 === 102) {
      return this.reIPv6local.test(ipaddr);
    }
    return false;
  }
  static isLoopback(ipaddr) {
    return ipaddr === "127.0.0.1" || ipaddr === "::1";
  }
  static compile(details) {
    return [_FilterIPAddress.fid, details.optionValues.get("ipaddress")];
  }
  static fromCompiled(args) {
    const pattern = args[1];
    const details = { pattern };
    return filterDataAlloc(args[0], filterRefAdd(details));
  }
  static dnrFromCompiled(args, rule) {
    dnrAddRuleError(rule, `"ipaddress=${args[1]}" not supported`);
  }
  static logData(idata, details) {
    const irefs = filterData[idata + 1];
    details.options.push(`ipaddress=${LogData.requote(filterRefs[irefs].pattern)}`);
  }
};
registerFilterClass(FilterIPAddress);
var FilterMessage = class _FilterMessage {
  static {
    __name(this, "FilterMessage");
  }
  static match() {
    return true;
  }
  static compile(details) {
    return [
      _FilterMessage.fid,
      encodeURIComponent(details.optionValues.get("reason"))
    ];
  }
  static fromCompiled(args) {
    const msg = args[1];
    return filterDataAlloc(args[0], bidiTrie.storeString(msg), msg.length);
  }
  static keyFromArgs(args) {
    return `${args[1]}`;
  }
  static logData(idata, details) {
    const reason = decodeURIComponent(
      bidiTrie.extractString(filterData[idata + 1], filterData[idata + 2])
    );
    details.reason = reason;
    details.options.push(`reason=${reason}`);
  }
};
registerFilterClass(FilterMessage);
var urlTokenizer = new class {
  constructor() {
    this._chars = "0123456789%abcdefghijklmnopqrstuvwxyz";
    this._validTokenChars = new Uint8Array(128);
    for (let i = 0, n = this._chars.length; i < n; i++) {
      this._validTokenChars[this._chars.charCodeAt(i)] = i + 1;
    }
    this._urlIn = "";
    this._urlOut = "";
    this._tokenized = false;
    this._hasQuery = 0;
    this._tokens = new Uint32Array(bidiTrie.haystack.length + 16);
    this.knownTokens = new Uint8Array(65536);
    this.resetKnownTokens();
  }
  setURL(url) {
    if (url !== this._urlIn) {
      this._urlIn = url;
      this._urlOut = url.toLowerCase();
      this._hasQuery = 0;
      this._tokenized = false;
    }
    return this._urlOut;
  }
  resetKnownTokens() {
    this.knownTokens.fill(0);
    this.addKnownToken(DOT_TOKEN_HASH);
    this.addKnownToken(ANY_TOKEN_HASH);
    this.addKnownToken(ANY_HTTPS_TOKEN_HASH);
    this.addKnownToken(ANY_HTTP_TOKEN_HASH);
    this.addKnownToken(NO_TOKEN_HASH);
  }
  addKnownToken(th2) {
    this.knownTokens[th2 & 65535] = 1;
  }
  // Tokenize on demand.
  getTokens() {
    if (this._tokenized) {
      return this._tokens;
    }
    let i = this._tokenize();
    this._tokens[i + 0] = ANY_TOKEN_HASH;
    this._tokens[i + 1] = 0;
    i += 2;
    if (this._urlOut.startsWith("https://")) {
      this._tokens[i + 0] = ANY_HTTPS_TOKEN_HASH;
      this._tokens[i + 1] = 0;
      i += 2;
    } else if (this._urlOut.startsWith("http://")) {
      this._tokens[i + 0] = ANY_HTTP_TOKEN_HASH;
      this._tokens[i + 1] = 0;
      i += 2;
    }
    this._tokens[i + 0] = NO_TOKEN_HASH;
    this._tokens[i + 1] = 0;
    this._tokens[i + 2] = INVALID_TOKEN_HASH;
    this._tokenized = true;
    return this._tokens;
  }
  hasQuery() {
    if (this._hasQuery === 0) {
      const i = this._urlOut.indexOf("?");
      this._hasQuery = i !== -1 ? i + 1 : -1;
    }
    return this._hasQuery > 0;
  }
  // http://www.cse.yorku.ca/~oz/hash.html#djb2
  tokenHashFromString(s) {
    const l = s.length;
    if (l === 0) {
      return EMPTY_TOKEN_HASH;
    }
    const vtc = this._validTokenChars;
    let th2 = vtc[s.charCodeAt(0)];
    for (let i = 1; i !== 7 && i !== l; i++) {
      th2 = (th2 << 5) + th2 ^ vtc[s.charCodeAt(i)];
    }
    return th2 & 268435455;
  }
  stringFromTokenHash(th2) {
    if (th2 === 0) {
      return "";
    }
    return th2.toString(16);
  }
  toSelfie() {
    return this.knownTokens;
  }
  fromSelfie(selfie) {
    this.knownTokens = selfie;
  }
  // https://github.com/chrisaljoudi/uBlock/issues/1118
  // We limit to a maximum number of tokens.
  _tokenize() {
    const tokens = this._tokens;
    const url = this._urlOut;
    const l = bidiTrie.setHaystackLen(url.length);
    if (l === 0) {
      return 0;
    }
    let j2 = 0;
    let hasq = -1;
    mainLoop: {
      const knownTokens = this.knownTokens;
      const vtc = this._validTokenChars;
      const charCodes = bidiTrie.haystack;
      let i = 0, n = 0, ti = 0, th2 = 0;
      for (; ; ) {
        for (; ; ) {
          if (i === l) {
            break mainLoop;
          }
          const cc2 = url.charCodeAt(i);
          charCodes[i] = cc2;
          i += 1;
          th2 = vtc[cc2];
          if (th2 !== 0) {
            break;
          }
          if (cc2 === 63) {
            hasq = i;
          }
        }
        ti = i - 1;
        n = 1;
        for (; ; ) {
          if (i === l) {
            break;
          }
          const cc2 = url.charCodeAt(i);
          charCodes[i] = cc2;
          i += 1;
          const v2 = vtc[cc2];
          if (v2 === 0) {
            if (cc2 === 63) {
              hasq = i;
            }
            break;
          }
          if (n === 7) {
            continue;
          }
          th2 = (th2 << 5) + th2 ^ v2;
          n += 1;
        }
        if (knownTokens[th2 & 65535] !== 0) {
          tokens[j2 + 0] = th2 & 268435455;
          tokens[j2 + 1] = ti;
          j2 += 2;
        }
      }
    }
    this._hasQuery = hasq;
    return j2;
  }
}();
var FilterCompiler = class _FilterCompiler {
  static {
    __name(this, "FilterCompiler");
  }
  constructor(other = void 0) {
    if (other !== void 0) {
      return Object.assign(this, other);
    }
    this.reTokens = /[%0-9A-Za-z]+/g;
    this.optionValues = /* @__PURE__ */ new Map();
    this.tokenIdToNormalizedType = /* @__PURE__ */ new Map([
      [NODE_TYPE_NET_OPTION_NAME_CNAME, bitFromType("cname")],
      [NODE_TYPE_NET_OPTION_NAME_CSS, bitFromType("stylesheet")],
      [NODE_TYPE_NET_OPTION_NAME_DOC, bitFromType("main_frame")],
      [NODE_TYPE_NET_OPTION_NAME_FONT, bitFromType("font")],
      [NODE_TYPE_NET_OPTION_NAME_FRAME, bitFromType("sub_frame")],
      [NODE_TYPE_NET_OPTION_NAME_GENERICBLOCK, bitFromType("unsupported")],
      [NODE_TYPE_NET_OPTION_NAME_GHIDE, bitFromType("generichide")],
      [NODE_TYPE_NET_OPTION_NAME_IMAGE, bitFromType("image")],
      [NODE_TYPE_NET_OPTION_NAME_INLINEFONT, bitFromType("inline-font")],
      [NODE_TYPE_NET_OPTION_NAME_INLINESCRIPT, bitFromType("inline-script")],
      [NODE_TYPE_NET_OPTION_NAME_MEDIA, bitFromType("media")],
      [NODE_TYPE_NET_OPTION_NAME_OBJECT, bitFromType("object")],
      [NODE_TYPE_NET_OPTION_NAME_OTHER, bitFromType("other")],
      [NODE_TYPE_NET_OPTION_NAME_PING, bitFromType("ping")],
      [NODE_TYPE_NET_OPTION_NAME_POPUNDER, bitFromType("popunder")],
      [NODE_TYPE_NET_OPTION_NAME_POPUP, bitFromType("popup")],
      [NODE_TYPE_NET_OPTION_NAME_SCRIPT, bitFromType("script")],
      [NODE_TYPE_NET_OPTION_NAME_SHIDE, bitFromType("specifichide")],
      [NODE_TYPE_NET_OPTION_NAME_XHR, bitFromType("xmlhttprequest")],
      [NODE_TYPE_NET_OPTION_NAME_WEBRTC, bitFromType("unsupported")],
      [NODE_TYPE_NET_OPTION_NAME_WEBSOCKET, bitFromType("websocket")]
    ]);
    this.modifierIdToNormalizedId = /* @__PURE__ */ new Map([
      [NODE_TYPE_NET_OPTION_NAME_CSP, MODIFIER_TYPE_CSP],
      [NODE_TYPE_NET_OPTION_NAME_PERMISSIONS, MODIFIER_TYPE_PERMISSIONS],
      [NODE_TYPE_NET_OPTION_NAME_REDIRECT, MODIFIER_TYPE_REDIRECT],
      [NODE_TYPE_NET_OPTION_NAME_REDIRECTRULE, MODIFIER_TYPE_REDIRECTRULE],
      [NODE_TYPE_NET_OPTION_NAME_REMOVEPARAM, MODIFIER_TYPE_REMOVEPARAM],
      [NODE_TYPE_NET_OPTION_NAME_URLTRANSFORM, MODIFIER_TYPE_URLTRANSFORM],
      [NODE_TYPE_NET_OPTION_NAME_REPLACE, MODIFIER_TYPE_REPLACE],
      [NODE_TYPE_NET_OPTION_NAME_URLSKIP, MODIFIER_TYPE_URLSKIP]
    ]);
    this.badTokens = /* @__PURE__ */ new Map([
      ["https", 123617],
      ["com", 76987],
      ["js", 43620],
      ["www", 33129],
      ["jpg", 32221],
      ["images", 31812],
      ["css", 19715],
      ["png", 19140],
      ["static", 15724],
      ["net", 15239],
      ["de", 13155],
      ["img", 11109],
      ["assets", 10746],
      ["min", 7807],
      ["cdn", 7568],
      ["content", 6900],
      ["wp", 6444],
      ["fonts", 6095],
      ["svg", 5976],
      ["http", 5813],
      ["ssl", 5735],
      ["amazon", 5440],
      ["ru", 5427],
      ["fr", 5199],
      ["facebook", 5178],
      ["en", 5146],
      ["image", 5028],
      ["html", 4837],
      ["media", 4833],
      ["co", 4783],
      ["php", 3972],
      ["2019", 3943],
      ["org", 3924],
      ["jquery", 3531],
      ["02", 3438],
      ["api", 3382],
      ["gif", 3350],
      ["eu", 3322],
      ["prod", 3289],
      ["woff2", 3200],
      ["logo", 3194],
      ["themes", 3107],
      ["icon", 3048],
      ["google", 3026],
      ["v1", 3019],
      ["uploads", 2963],
      ["googleapis", 2860],
      ["v3", 2816],
      ["tv", 2762],
      ["icons", 2748],
      ["core", 2601],
      ["gstatic", 2581],
      ["ac", 2509],
      ["utag", 2466],
      ["id", 2459],
      ["ver", 2448],
      ["rsrc", 2387],
      ["files", 2361],
      ["uk", 2357],
      ["us", 2271],
      ["pl", 2262],
      ["common", 2205],
      ["public", 2076],
      ["01", 2016],
      ["na", 1957],
      ["v2", 1954],
      ["12", 1914],
      ["thumb", 1895],
      ["web", 1853],
      ["ui", 1841],
      ["default", 1825],
      ["main", 1737],
      ["false", 1715],
      ["2018", 1697],
      ["embed", 1639],
      ["player", 1634],
      ["dist", 1599],
      ["woff", 1593],
      ["global", 1593],
      ["json", 1572],
      ["11", 1566],
      ["600", 1559],
      ["app", 1556],
      ["styles", 1533],
      ["plugins", 1526],
      ["274", 1512],
      ["random", 1505],
      ["sites", 1505],
      ["imasdk", 1501],
      ["bridge3", 1501],
      ["news", 1496],
      ["width", 1494],
      ["thumbs", 1485],
      ["ttf", 1470],
      ["ajax", 1463],
      ["user", 1454],
      ["scripts", 1446],
      ["twitter", 1440],
      ["crop", 1431],
      ["new", 1412]
    ]);
    this.reset();
  }
  reset() {
    this.action = BLOCK_REALM;
    this.anchor = 0;
    this.badFilter = false;
    this.error = void 0;
    this.modifyType = void 0;
    this.modifyValue = void 0;
    this.pattern = "";
    this.party = ANYPARTY_REALM;
    this.optionUnitBits = 0;
    this.optionValues.clear();
    this.isPureHostname = false;
    this.isGeneric = false;
    this.isRegex = false;
    this.strictParty = 0;
    this.token = "*";
    this.tokenHash = NO_TOKEN_HASH;
    this.tokenBeg = 0;
    this.typeBits = 0;
    this.notTypeBits = 0;
    this.methodBits = 0;
    this.notMethodBits = 0;
    return this;
  }
  start() {
  }
  finish() {
  }
  clone() {
    return new _FilterCompiler(this);
  }
  normalizeRegexSource(s) {
    try {
      const re2 = new RegExp(s);
      return re2.source;
    } catch {
    }
    return "";
  }
  processMethodOption(value) {
    for (const method of value.split("|")) {
      if (method.charCodeAt(0) === 126) {
        const bit = FilteringContext.getMethod(method.slice(1)) || 0;
        if (bit === 0) {
          continue;
        }
        this.notMethodBits |= bit;
      } else {
        const bit = FilteringContext.getMethod(method) || 0;
        if (bit === 0) {
          continue;
        }
        this.methodBits |= bit;
      }
    }
    this.methodBits &= ~this.notMethodBits;
  }
  // https://github.com/chrisaljoudi/uBlock/issues/589
  // Be ready to handle multiple negated types
  processTypeOption(id, not) {
    if (id !== -1) {
      const typeBit = this.tokenIdToNormalizedType.get(id);
      if (not) {
        this.notTypeBits |= typeBit;
      } else {
        this.typeBits |= typeBit;
      }
      return;
    }
    if (not) {
      this.notTypeBits |= allTypesBits;
    } else {
      this.typeBits |= allTypesBits;
    }
  }
  processPartyOption(firstParty, not) {
    if (not) {
      firstParty = !firstParty;
    }
    this.party |= firstParty ? FIRSTPARTY_REALM : THIRDPARTY_REALM;
  }
  processHostnameList(iter, out = []) {
    let i = 0;
    for (const { hn: hn2, not, bad } of iter) {
      if (bad) {
        return "";
      }
      out[i] = not ? `~${hn2}` : hn2;
      i += 1;
    }
    out.length = i;
    return i === 1 ? out[0] : out.join("|");
  }
  processModifierOption(modifier, value) {
    if (this.modifyType !== void 0) {
      return false;
    }
    const normalized = this.modifierIdToNormalizedId.get(modifier);
    if (normalized === void 0) {
      return false;
    }
    this.modifyType = normalized;
    this.modifyValue = value || "";
    return true;
  }
  processCspOption(value) {
    this.modifyType = MODIFIER_TYPE_CSP;
    this.modifyValue = value || "";
    this.optionUnitBits |= MODIFY_BIT;
    return true;
  }
  processOptionWithValue(parser, id) {
    switch (id) {
      case NODE_TYPE_NET_OPTION_NAME_CSP:
        if (this.processCspOption(parser.getNetOptionValue(id)) === false) {
          return false;
        }
        break;
      case NODE_TYPE_NET_OPTION_NAME_DENYALLOW: {
        const value = this.processHostnameList(
          parser.getNetFilterDenyallowOptionIterator()
        );
        if (value === "") {
          return false;
        }
        this.optionValues.set("denyallow", value);
        this.optionUnitBits |= DENYALLOW_BIT;
        break;
      }
      case NODE_TYPE_NET_OPTION_NAME_FROM: {
        const iter = parser.getNetFilterFromOptionIterator();
        const list = [];
        const value = this.processHostnameList(iter, list);
        if (value === "") {
          return false;
        }
        this.optionValues.set("from", value);
        this.optionValues.set("fromList", list);
        this.optionUnitBits |= FROM_BIT;
        break;
      }
      case NODE_TYPE_NET_OPTION_NAME_IPADDRESS:
        this.optionValues.set("ipaddress", parser.getNetOptionValue(id) || "");
        this.optionUnitBits |= IPADDRESS_BIT;
        break;
      case NODE_TYPE_NET_OPTION_NAME_METHOD:
        this.processMethodOption(parser.getNetOptionValue(id));
        this.optionUnitBits |= METHOD_BIT;
        break;
      case NODE_TYPE_NET_OPTION_NAME_PERMISSIONS:
      case NODE_TYPE_NET_OPTION_NAME_REDIRECTRULE:
      case NODE_TYPE_NET_OPTION_NAME_REMOVEPARAM:
      case NODE_TYPE_NET_OPTION_NAME_REPLACE:
      case NODE_TYPE_NET_OPTION_NAME_URLSKIP:
      case NODE_TYPE_NET_OPTION_NAME_URLTRANSFORM:
        if (this.processModifierOption(id, parser.getNetOptionValue(id)) === false) {
          return false;
        }
        this.optionUnitBits |= MODIFY_BIT;
        break;
      case NODE_TYPE_NET_OPTION_NAME_REASON:
        this.optionValues.set("reason", parser.getNetOptionValue(id));
        this.optionUnitBits |= MESSAGE_BIT;
        break;
      case NODE_TYPE_NET_OPTION_NAME_REDIRECT: {
        const actualId = this.action === ALLOW_REALM ? NODE_TYPE_NET_OPTION_NAME_REDIRECTRULE : id;
        if (this.processModifierOption(actualId, parser.getNetOptionValue(id)) === false) {
          return false;
        }
        this.optionUnitBits |= MODIFY_BIT;
        break;
      }
      case NODE_TYPE_NET_OPTION_NAME_REQUESTHEADER: {
        this.optionValues.set("requestheader", parser.getNetOptionValue(id) || "");
        this.optionUnitBits |= HEADER_BIT;
        break;
      }
      case NODE_TYPE_NET_OPTION_NAME_RESPONSEHEADER: {
        this.optionValues.set("responseheader", parser.getNetOptionValue(id) || "");
        this.optionUnitBits |= HEADER_BIT;
        break;
      }
      case NODE_TYPE_NET_OPTION_NAME_TO: {
        const iter = parser.getNetFilterToOptionIterator();
        const list = [];
        const value = this.processHostnameList(iter, list);
        if (value === "") {
          return false;
        }
        this.optionValues.set("to", value);
        this.optionValues.set("toList", list);
        this.optionUnitBits |= TO_BIT;
        break;
      }
      case NODE_TYPE_NET_OPTION_NAME_TOP: {
        const iter = parser.getNetFilterTopOptionIterator();
        const list = [];
        const value = this.processHostnameList(iter, list);
        if (value === "") {
          return false;
        }
        this.optionValues.set("top", value);
        this.optionValues.set("topList", list);
        this.optionUnitBits |= TOP_BIT;
        break;
      }
      default:
        break;
    }
    return true;
  }
  process(parser) {
    this.reset();
    if (parser.hasError()) {
      return this.FILTER_INVALID;
    }
    if (parser.isException()) {
      this.action = ALLOW_REALM;
    }
    if (parser.isLeftHnAnchored()) {
      this.anchor |= 4;
    } else if (parser.isLeftAnchored()) {
      this.anchor |= 2;
    }
    if (parser.isRightAnchored()) {
      this.anchor |= 1;
    }
    this.pattern = parser.getNetPattern();
    if (parser.isHostnamePattern()) {
      this.isPureHostname = true;
    } else if (parser.isGenericPattern()) {
      this.isGeneric = true;
    } else if (parser.isRegexPattern()) {
      this.isRegex = true;
    }
    for (const type of parser.getNodeTypes()) {
      switch (type) {
        case NODE_TYPE_NET_OPTION_NAME_1P:
          this.processPartyOption(true, parser.isNegatedOption(type));
          break;
        case NODE_TYPE_NET_OPTION_NAME_STRICT1P:
          this.strictParty = this.strictParty === -1 ? 0 : 1;
          this.optionUnitBits |= STRICT_PARTY_BIT;
          break;
        case NODE_TYPE_NET_OPTION_NAME_3P:
          this.processPartyOption(false, parser.isNegatedOption(type));
          break;
        case NODE_TYPE_NET_OPTION_NAME_STRICT3P:
          this.strictParty = this.strictParty === 1 ? 0 : -1;
          this.optionUnitBits |= STRICT_PARTY_BIT;
          break;
        case NODE_TYPE_NET_OPTION_NAME_ALL:
          this.processTypeOption(-1);
          break;
        case NODE_TYPE_NET_OPTION_NAME_BADFILTER:
          this.badFilter = true;
          break;
        case NODE_TYPE_NET_OPTION_NAME_CNAME:
        case NODE_TYPE_NET_OPTION_NAME_CSS:
        case NODE_TYPE_NET_OPTION_NAME_DOC:
        case NODE_TYPE_NET_OPTION_NAME_FONT:
        case NODE_TYPE_NET_OPTION_NAME_FRAME:
        case NODE_TYPE_NET_OPTION_NAME_GENERICBLOCK:
        case NODE_TYPE_NET_OPTION_NAME_GHIDE:
        case NODE_TYPE_NET_OPTION_NAME_IMAGE:
        case NODE_TYPE_NET_OPTION_NAME_INLINEFONT:
        case NODE_TYPE_NET_OPTION_NAME_INLINESCRIPT:
        case NODE_TYPE_NET_OPTION_NAME_MEDIA:
        case NODE_TYPE_NET_OPTION_NAME_OBJECT:
        case NODE_TYPE_NET_OPTION_NAME_OTHER:
        case NODE_TYPE_NET_OPTION_NAME_PING:
        case NODE_TYPE_NET_OPTION_NAME_POPUNDER:
        case NODE_TYPE_NET_OPTION_NAME_POPUP:
        case NODE_TYPE_NET_OPTION_NAME_SCRIPT:
        case NODE_TYPE_NET_OPTION_NAME_SHIDE:
        case NODE_TYPE_NET_OPTION_NAME_XHR:
        case NODE_TYPE_NET_OPTION_NAME_WEBRTC:
        case NODE_TYPE_NET_OPTION_NAME_WEBSOCKET:
          this.processTypeOption(type, parser.isNegatedOption(type));
          break;
        case NODE_TYPE_NET_OPTION_NAME_CSP:
        case NODE_TYPE_NET_OPTION_NAME_DENYALLOW:
        case NODE_TYPE_NET_OPTION_NAME_FROM:
        case NODE_TYPE_NET_OPTION_NAME_IPADDRESS:
        case NODE_TYPE_NET_OPTION_NAME_METHOD:
        case NODE_TYPE_NET_OPTION_NAME_PERMISSIONS:
        case NODE_TYPE_NET_OPTION_NAME_REASON:
        case NODE_TYPE_NET_OPTION_NAME_REDIRECT:
        case NODE_TYPE_NET_OPTION_NAME_REDIRECTRULE:
        case NODE_TYPE_NET_OPTION_NAME_REMOVEPARAM:
        case NODE_TYPE_NET_OPTION_NAME_REPLACE:
        case NODE_TYPE_NET_OPTION_NAME_REQUESTHEADER:
        case NODE_TYPE_NET_OPTION_NAME_RESPONSEHEADER:
        case NODE_TYPE_NET_OPTION_NAME_TO:
        case NODE_TYPE_NET_OPTION_NAME_TOP:
        case NODE_TYPE_NET_OPTION_NAME_URLSKIP:
        case NODE_TYPE_NET_OPTION_NAME_URLTRANSFORM:
          if (this.processOptionWithValue(parser, type) === false) {
            return this.FILTER_INVALID;
          }
          break;
        case NODE_TYPE_NET_OPTION_NAME_EHIDE: {
          const not = parser.isNegatedOption(type);
          this.processTypeOption(NODE_TYPE_NET_OPTION_NAME_SHIDE, not);
          this.processTypeOption(NODE_TYPE_NET_OPTION_NAME_GHIDE, not);
          break;
        }
        case NODE_TYPE_NET_OPTION_NAME_EMPTY: {
          const id = this.action === ALLOW_REALM ? NODE_TYPE_NET_OPTION_NAME_REDIRECTRULE : NODE_TYPE_NET_OPTION_NAME_REDIRECT;
          if (this.processModifierOption(id, "empty") === false) {
            return this.FILTER_INVALID;
          }
          this.optionUnitBits |= MODIFY_BIT;
          break;
        }
        case NODE_TYPE_NET_OPTION_NAME_IMPORTANT:
          this.optionUnitBits |= IMPORTANT_BIT;
          this.action = BLOCKIMPORTANT_REALM;
          break;
        case NODE_TYPE_NET_OPTION_NAME_MATCHCASE:
          this.optionValues.set("match-case", true);
          break;
        case NODE_TYPE_NET_OPTION_NAME_MP4: {
          const id = this.action === ALLOW_REALM ? NODE_TYPE_NET_OPTION_NAME_REDIRECTRULE : NODE_TYPE_NET_OPTION_NAME_REDIRECT;
          if (this.processModifierOption(id, "noopmp4-1s") === false) {
            return this.FILTER_INVALID;
          }
          this.processTypeOption(NODE_TYPE_NET_OPTION_NAME_MEDIA, false);
          this.optionUnitBits |= MODIFY_BIT;
          break;
        }
        default:
          break;
      }
    }
    if (this.party === ALLPARTIES_REALM) {
      this.party = ANYPARTY_REALM;
    }
    if (this.notTypeBits !== 0) {
      if ((this.typeBits && allNetworkTypesBits) === allNetworkTypesBits) {
        this.typeBits &= ~this.notTypeBits | allNetworkTypesBits;
      } else {
        this.typeBits &= ~this.notTypeBits;
      }
      this.optionUnitBits |= NOT_TYPE_BIT;
    }
    if (this.modifyType === MODIFIER_TYPE_CSP || this.modifyType === MODIFIER_TYPE_PERMISSIONS) {
      if (this.typeBits === 0) {
        this.processTypeOption(NODE_TYPE_NET_OPTION_NAME_DOC, false);
        this.processTypeOption(NODE_TYPE_NET_OPTION_NAME_FRAME, false);
      }
    }
    if (this.typeBits & unsupportedTypeBit) {
      this.typeBits &= ~unsupportedTypeBit;
      if (this.typeBits === 0) {
        return this.FILTER_UNSUPPORTED;
      }
    }
    if (this.isPureHostname && parser.hasOptions() === false) {
      this.anchor |= 4;
      return this.FILTER_OK;
    }
    if (this.isRegex) {
      return this.FILTER_OK;
    }
    if (this.pattern.length > 1024) {
      return this.FILTER_UNSUPPORTED;
    }
    return this.FILTER_OK;
  }
  // Given a string, find a good token. Tokens which are too generic,
  // i.e. very common with a high probability of ending up as a miss,
  // are not good. Avoid if possible. This has a significant positive
  // impact on performance.
  //
  // For pattern-less removeparam filters, try to derive a pattern from
  // the removeparam value.
  makeToken() {
    if (this.pattern === "*") {
      if (this.modifyType !== MODIFIER_TYPE_REMOVEPARAM) {
        return;
      }
      return this.extractTokenFromQuerypruneValue();
    }
    if (this.isRegex) {
      return this.extractTokenFromRegex(this.pattern);
    }
    this.extractTokenFromPattern(this.pattern);
  }
  // Note: a one-char token is better than a documented bad token.
  extractTokenFromPattern(pattern) {
    this.reTokens.lastIndex = 0;
    let bestMatch = null;
    let bestBadness = 2147483647;
    for (; ; ) {
      const match = this.reTokens.exec(pattern);
      if (match === null) {
        break;
      }
      const token = match[0];
      const badness = token.length > 1 ? this.badTokens.get(token) || 0 : 1;
      if (badness >= bestBadness) {
        continue;
      }
      if (match.index > 0) {
        const c = pattern.charCodeAt(match.index - 1);
        if (c === 42) {
          continue;
        }
      }
      if (token.length < MAX_TOKEN_LENGTH) {
        const lastIndex = this.reTokens.lastIndex;
        if (lastIndex < pattern.length) {
          const c = pattern.charCodeAt(lastIndex);
          if (c === 42) {
            continue;
          }
        }
      }
      bestMatch = match;
      if (badness === 0) {
        break;
      }
      bestBadness = badness;
    }
    if (bestMatch !== null) {
      this.token = bestMatch[0];
      this.tokenHash = urlTokenizer.tokenHashFromString(this.token);
      this.tokenBeg = bestMatch.index;
    }
  }
  // https://github.com/gorhill/uBlock/issues/2781
  //   For efficiency purpose, try to extract a token from a regex-based
  //   filter.
  // https://github.com/uBlockOrigin/uBlock-issues/issues/1145#issuecomment-657036902
  //   Mind `\b` directives: `/\bads\b/` should result in token being `ads`,
  //   not `bads`.
  extractTokenFromRegex(pattern) {
    pattern = tokenizableStrFromRegex(pattern);
    this.reTokens.lastIndex = 0;
    let bestToken;
    let bestBadness = 2147483647;
    for (; ; ) {
      const matches = this.reTokens.exec(pattern);
      if (matches === null) {
        break;
      }
      const { 0: token, index } = matches;
      if (index === 0 || pattern.charAt(index - 1) === "") {
        continue;
      }
      const { lastIndex } = this.reTokens;
      if (token.length < MAX_TOKEN_LENGTH && (lastIndex === pattern.length || pattern.charAt(lastIndex) === "")) {
        continue;
      }
      const badness = token.length > 1 ? this.badTokens.get(token) || 0 : 1;
      if (badness < bestBadness) {
        bestToken = token;
        if (badness === 0) {
          break;
        }
        bestBadness = badness;
      }
    }
    if (bestToken !== void 0) {
      this.token = bestToken.toLowerCase();
      this.tokenHash = urlTokenizer.tokenHashFromString(this.token);
    }
  }
  // https://github.com/uBlockOrigin/uAssets/discussions/14683#discussioncomment-3559284
  //   If the removeparam value is a regex, unescape escaped commas
  extractTokenFromQuerypruneValue() {
    const pattern = this.modifyValue;
    if (pattern === "*" || pattern.charCodeAt(0) === 126) {
      return;
    }
    const match = /^\/(.+)\/i?$/.exec(pattern);
    if (match !== null) {
      return this.extractTokenFromRegex(
        match[1].replace(/(\{\d*)\\,/, "$1,")
      );
    }
    if (pattern.startsWith("|")) {
      return this.extractTokenFromRegex("\\b" + pattern.slice(1));
    }
    this.extractTokenFromPattern(pattern.toLowerCase());
  }
  hasNoOptionUnits() {
    return this.optionUnitBits === 0;
  }
  isJustOrigin() {
    if (this.optionUnitBits !== FROM_BIT) {
      return false;
    }
    if (this.isRegex) {
      return false;
    }
    if (/[/~]/.test(this.optionValues.get("from"))) {
      return false;
    }
    if (this.pattern === "*") {
      return true;
    }
    if (this.anchor !== 2) {
      return false;
    }
    if (/^(?:http[s*]?:(?:\/\/)?)$/.test(this.pattern)) {
      return true;
    }
    return false;
  }
  domainIsEntity(s) {
    const l = s.length;
    return l > 2 && s.charCodeAt(l - 1) === 42 && s.charCodeAt(l - 2) === 46;
  }
  compile(parser, writer) {
    const r = this.process(parser);
    if (r === this.FILTER_INVALID) {
      return false;
    }
    if (r === this.FILTER_UNSUPPORTED) {
      const who = writer.properties.get("name") || "?";
      this.error = `Invalid network filter in ${who}: ${parser.raw}`;
      return false;
    }
    writer.select(
      this.badFilter ? "NETWORK_FILTERS:BAD" : "NETWORK_FILTERS:GOOD"
    );
    if (this.modifyType === MODIFIER_TYPE_REDIRECT) {
      this.modifyType = MODIFIER_TYPE_REDIRECTRULE;
      if (parser.options.toDNR !== true) {
        const parsedBlock = this.clone();
        parsedBlock.modifyType = void 0;
        parsedBlock.optionUnitBits &= ~MODIFY_BIT;
        parsedBlock.compileToFilter(writer);
      }
    }
    this.compileToFilter(writer);
    return true;
  }
  compileToFilter(writer) {
    if (this.isPureHostname && this.hasNoOptionUnits()) {
      this.tokenHash = DOT_TOKEN_HASH;
      this.compileToAtomicFilter(this.pattern, writer);
      return;
    }
    this.makeToken();
    if (this.isJustOrigin()) {
      if (this.pattern === "*" || this.pattern.startsWith("http*")) {
        this.tokenHash = ANY_TOKEN_HASH;
      } else if (this.pattern.startsWith("https")) {
        this.tokenHash = ANY_HTTPS_TOKEN_HASH;
      } else {
        this.tokenHash = ANY_HTTP_TOKEN_HASH;
      }
      for (const hn2 of this.optionValues.get("fromList")) {
        this.compileToAtomicFilter(hn2, writer);
      }
      return;
    }
    const units = [];
    const patternClass = this.compilePattern(units);
    if ((this.anchor & 4) !== 0) {
      if (this.isPureHostname) {
        units.push(FilterAnchorHn.compile());
      } else {
        units.push(FilterAnchorHnLeft.compile());
      }
    } else if ((this.anchor & 2) !== 0) {
      units.push(FilterAnchorLeft.compile());
    }
    if ((this.anchor & 1) !== 0) {
      units.push(FilterAnchorRight.compile());
    }
    if (this.methodBits !== 0 || this.notMethodBits !== 0) {
      units.push(FilterMethod.compile(this));
    }
    if (this.notTypeBits !== 0) {
      units.push(FilterNotType.compile(this));
    }
    if (this.strictParty !== 0) {
      units.push(FilterStrictParty.compile(this));
    }
    if ((this.optionUnitBits & FROM_BIT) !== 0) {
      compileFromDomainOpt(
        this.optionValues.get("fromList"),
        units.length !== 0 && patternClass.isSlow === true,
        units
      );
    }
    if ((this.optionUnitBits & TO_BIT) !== 0) {
      compileToDomainOpt(
        this.optionValues.get("toList"),
        units.length !== 0 && patternClass.isSlow === true,
        units
      );
    }
    if ((this.optionUnitBits & TOP_BIT) !== 0) {
      compileTopDomainOpt(
        this.optionValues.get("topList"),
        units.length !== 0 && patternClass.isSlow === true,
        units
      );
    }
    if ((this.optionUnitBits & DENYALLOW_BIT) !== 0) {
      units.push(FilterDenyAllow.compile(this));
    }
    if ((this.optionUnitBits & IPADDRESS_BIT) !== 0) {
      units.push(FilterIPAddress.compile(this));
    }
    if ((this.optionUnitBits & HEADER_BIT) !== 0) {
      if (this.optionValues.has("requestheader")) {
        units.push(FilterOnRequestHeaders.compile(this));
      }
      if (this.optionValues.has("responseheader")) {
        units.push(FilterOnResponseHeaders.compile(this));
      }
      this.action |= HEADERS_REALM;
    }
    if ((this.optionUnitBits & MESSAGE_BIT) !== 0) {
      units.push(FilterMessage.compile(this));
    }
    if ((this.optionUnitBits & IMPORTANT_BIT) !== 0) {
      units.push(FilterImportant.compile());
    }
    if (this.modifyType !== void 0) {
      units.unshift(FilterModifier.compile(this));
      this.action = this.action & ~BLOCKALLOW_REALM | modifierBitsFromType.get(this.modifyType);
    }
    const fdata = units.length === 1 ? units[0] : FilterCompositeAll.compile(units);
    this.compileToAtomicFilter(fdata, writer);
    if ((this.optionUnitBits & IPADDRESS_BIT) !== 0) {
      if ((this.action & HEADERS_REALM) !== 0) {
        return;
      }
      this.action |= HEADERS_REALM;
      this.compileToAtomicFilter(fdata, writer);
    }
  }
  compilePattern(units) {
    if (this.isRegex) {
      units.push(FilterRegex.compile(this));
      return FilterRegex;
    }
    if (this.pattern === "*") {
      units.push(FilterPatternAny.compile());
      return FilterPatternAny;
    }
    if (this.tokenHash === NO_TOKEN_HASH) {
      units.push(FilterPatternGeneric.compile(this));
      return FilterPatternGeneric;
    }
    if (this.pattern.includes("*") === false) {
      const caretPos = this.pattern.indexOf("^");
      if (caretPos === -1) {
        units.push(FilterPatternPlain.compile(this));
        return FilterPatternPlain;
      }
      if (caretPos === this.pattern.length - 1) {
        this.pattern = this.pattern.slice(0, -1);
        units.push(FilterPatternPlain.compile(this));
        units.push(FilterTrailingSeparator.compile());
        return FilterPatternPlain;
      }
    }
    units.push(FilterPatternGeneric.compile(this));
    return FilterPatternGeneric;
  }
  compileToAtomicFilter(fdata, writer) {
    const catBits = this.action | this.party;
    let { typeBits } = this;
    if (typeBits === 0) {
      writer.push([catBits, this.tokenHash, fdata]);
      return;
    }
    if ((typeBits & allNetworkTypesBits) === allNetworkTypesBits) {
      writer.push([catBits, this.tokenHash, fdata]);
      typeBits &= ~allNetworkTypesBits;
      if (typeBits === 0) {
        return;
      }
    }
    let bitOffset = 1;
    do {
      if (typeBits & 1) {
        writer.push([
          catBits | bitOffset << TYPE_REALM_OFFSET,
          this.tokenHash,
          fdata
        ]);
      }
      bitOffset += 1;
      typeBits >>>= 1;
    } while (typeBits !== 0);
  }
};
var FROM_BIT = 1;
var TO_BIT = 2;
var TOP_BIT = 4;
var DENYALLOW_BIT = 8;
var HEADER_BIT = 16;
var STRICT_PARTY_BIT = 32;
var MODIFY_BIT = 64;
var NOT_TYPE_BIT = 128;
var IMPORTANT_BIT = 256;
var METHOD_BIT = 512;
var IPADDRESS_BIT = 1024;
var MESSAGE_BIT = 2048;
FilterCompiler.prototype.FILTER_OK = 0;
FilterCompiler.prototype.FILTER_INVALID = 1;
FilterCompiler.prototype.FILTER_UNSUPPORTED = 2;
var StaticNetFilteringEngine = /* @__PURE__ */ __name(function() {
  this.compilerVersion = "10";
  this.selfieVersion = "10";
  this.MAX_TOKEN_LENGTH = MAX_TOKEN_LENGTH;
  this.optimizeTaskId = void 0;
  this.bitsToBucket = /* @__PURE__ */ new Map();
  this.goodFilters = /* @__PURE__ */ new Set();
  this.badFilters = /* @__PURE__ */ new Set();
  this.unitsToOptimize = [];
  this.reset();
}, "StaticNetFilteringEngine");
StaticNetFilteringEngine.prototype.prime = function() {
  origHNTrieContainer.reset(
    keyvalStore.getItem("SNFE.origHNTrieContainer.trieDetails")
  );
  destHNTrieContainer.reset(
    keyvalStore.getItem("SNFE.destHNTrieContainer.trieDetails")
  );
};
StaticNetFilteringEngine.prototype.reset = function() {
  this.processedFilterCount = 0;
  this.acceptedCount = 0;
  this.discardedCount = 0;
  this.goodFilters.clear();
  this.badFilters.clear();
  this.unitsToOptimize.length = 0;
  this.bitsToBucket.clear();
  urlTokenizer.resetKnownTokens();
  filterDataReset();
  filterRefsReset();
  origHNTrieContainer.reset();
  destHNTrieContainer.reset();
  bidiTrie.reset();
  filterArgsToUnit.clear();
  if (this.optimizeTaskId !== void 0) {
    dropTask(this.optimizeTaskId);
    this.optimizeTaskId = void 0;
  }
  this.notReady = false;
  this.$catBits = 0;
  this.$tokenHash = 0;
  this.$filterUnit = 0;
};
StaticNetFilteringEngine.prototype.freeze = function() {
  const unserialize2 = CompiledListReader.unserialize;
  for (const line of this.goodFilters) {
    if (this.badFilters.has(line)) {
      this.discardedCount += 1;
      continue;
    }
    const args = unserialize2(line);
    const bits = args[0];
    const bucket = this.bitsToBucket.get(bits) || /* @__PURE__ */ new Map();
    if (bucket.size === 0) {
      this.bitsToBucket.set(bits, bucket);
    }
    const tokenHash = args[1];
    const fdata = args[2];
    let iunit = bucket.get(tokenHash) || 0;
    if (tokenHash === DOT_TOKEN_HASH) {
      if (iunit === 0) {
        iunit = FilterHostnameDict.create();
        bucket.set(DOT_TOKEN_HASH, iunit);
        this.unitsToOptimize.push({ bits, tokenHash });
      }
      FilterHostnameDict.add(iunit, fdata);
      continue;
    }
    if (tokenHash === ANY_TOKEN_HASH) {
      if (iunit === 0) {
        iunit = FilterJustOrigin.create();
        bucket.set(ANY_TOKEN_HASH, iunit);
      }
      FilterJustOrigin.add(iunit, fdata);
      continue;
    }
    if (tokenHash === ANY_HTTPS_TOKEN_HASH) {
      if (iunit === 0) {
        iunit = FilterHTTPSJustOrigin.create();
        bucket.set(ANY_HTTPS_TOKEN_HASH, iunit);
      }
      FilterHTTPSJustOrigin.add(iunit, fdata);
      continue;
    }
    if (tokenHash === ANY_HTTP_TOKEN_HASH) {
      if (iunit === 0) {
        iunit = FilterHTTPJustOrigin.create();
        bucket.set(ANY_HTTP_TOKEN_HASH, iunit);
      }
      FilterHTTPJustOrigin.add(iunit, fdata);
      continue;
    }
    urlTokenizer.addKnownToken(tokenHash);
    this.addFilterUnit(bits, tokenHash, filterFromCompiled(fdata));
    if ((bits & BLOCKALLOW_REALM) === BLOCKIMPORTANT_REALM) {
      this.addFilterUnit(
        bits & ~IMPORTANT_REALM,
        tokenHash,
        filterFromCompiled(fdata)
      );
    }
  }
  this.badFilters.clear();
  this.goodFilters.clear();
  filterArgsToUnit.clear();
  this.notReady = false;
  if (this.optimizeTaskId !== void 0) {
    return;
  }
  this.optimizeTaskId = queueTask(() => {
    this.optimizeTaskId = void 0;
    this.optimize(30);
  }, 2e3);
};
StaticNetFilteringEngine.prototype.dnrFromCompiled = function(op2, context, ...args) {
  if (op2 === "begin") {
    Object.assign(context, {
      good: /* @__PURE__ */ new Set(),
      bad: new Set(context.bad),
      invalid: /* @__PURE__ */ new Set(),
      filterCount: 0,
      acceptedFilterCount: 0,
      rejectedFilterCount: 0
    });
    return;
  }
  if (op2 === "add") {
    const reader = args[0];
    reader.select("NETWORK_FILTERS:GOOD");
    while (reader.next()) {
      context.filterCount += 1;
      if (context.good.has(reader.line) === false) {
        context.good.add(reader.line);
      }
    }
    reader.select("NETWORK_FILTERS:BAD");
    while (reader.next()) {
      context.bad.add(reader.line);
    }
    return;
  }
  if (op2 !== "end") {
    return;
  }
  const { good, bad } = context;
  const unserialize2 = CompiledListReader.unserialize;
  const buckets = /* @__PURE__ */ new Map();
  for (const line of good) {
    if (bad.has(line)) {
      context.rejectedFilterCount += 1;
      continue;
    }
    context.acceptedFilterCount += 1;
    const args2 = unserialize2(line);
    const bits = args2[0];
    const tokenHash = args2[1];
    const fdata = args2[2];
    if (buckets.has(bits) === false) {
      buckets.set(bits, /* @__PURE__ */ new Map());
    }
    const bucket = buckets.get(bits);
    switch (tokenHash) {
      case DOT_TOKEN_HASH: {
        if (bucket.has(DOT_TOKEN_HASH) === false) {
          bucket.set(DOT_TOKEN_HASH, [{
            condition: {
              requestDomains: []
            }
          }]);
        }
        const rule = bucket.get(DOT_TOKEN_HASH)[0];
        rule.condition.requestDomains.push(fdata);
        break;
      }
      case ANY_TOKEN_HASH: {
        if (bucket.has(ANY_TOKEN_HASH) === false) {
          bucket.set(ANY_TOKEN_HASH, [{
            condition: {
              initiatorDomains: []
            }
          }]);
        }
        const rule = bucket.get(ANY_TOKEN_HASH)[0];
        rule.condition.initiatorDomains.push(fdata);
        break;
      }
      case ANY_HTTPS_TOKEN_HASH: {
        if (bucket.has(ANY_HTTPS_TOKEN_HASH) === false) {
          bucket.set(ANY_HTTPS_TOKEN_HASH, [{
            condition: {
              urlFilter: "|https://",
              initiatorDomains: []
            }
          }]);
        }
        const rule = bucket.get(ANY_HTTPS_TOKEN_HASH)[0];
        rule.condition.initiatorDomains.push(fdata);
        break;
      }
      case ANY_HTTP_TOKEN_HASH: {
        if (bucket.has(ANY_HTTP_TOKEN_HASH) === false) {
          bucket.set(ANY_HTTP_TOKEN_HASH, [{
            condition: {
              urlFilter: "|http://",
              initiatorDomains: []
            }
          }]);
        }
        const rule = bucket.get(ANY_HTTP_TOKEN_HASH)[0];
        rule.condition.initiatorDomains.push(fdata);
        break;
      }
      default: {
        if (bucket.has(EMPTY_TOKEN_HASH) === false) {
          bucket.set(EMPTY_TOKEN_HASH, []);
        }
        const rule = {};
        dnrRuleFromCompiled(fdata, rule);
        bucket.get(EMPTY_TOKEN_HASH).push(rule);
        break;
      }
    }
  }
  const realms = /* @__PURE__ */ new Map([
    [BLOCK_REALM, { type: "block", priority: 10 }],
    [ALLOW_REALM, { type: "allow", priority: 30 }],
    [BLOCK_REALM | IMPORTANT_REALM, { type: "block", priority: 10 }],
    [REDIRECT_REALM, { type: "redirect", priority: 11 }],
    [REMOVEPARAM_REALM, { type: "removeparam", priority: 1 }],
    [CSP_REALM, { type: "csp", priority: 1 }],
    [PERMISSIONS_REALM, { type: "permissions", priority: 1 }],
    [URLTRANSFORM_REALM, { type: "uritransform", priority: 1 }],
    [HEADERS_REALM, { type: "block", priority: 10 }],
    [HEADERS_REALM | ALLOW_REALM, { type: "allow", priority: 30 }],
    [HEADERS_REALM | IMPORTANT_REALM, { type: "allow", priority: 10 }],
    [URLSKIP_REALM, { type: "urlskip", priority: 1 }]
  ]);
  const partyness = /* @__PURE__ */ new Map([
    [ANYPARTY_REALM, ""],
    [FIRSTPARTY_REALM, "firstParty"],
    [THIRDPARTY_REALM, "thirdParty"]
  ]);
  const types = /* @__PURE__ */ new Set([
    "no_type",
    "stylesheet",
    "image",
    "object",
    "script",
    "xmlhttprequest",
    "sub_frame",
    "main_frame",
    "font",
    "media",
    "websocket",
    "ping",
    "other",
    "popup"
  ]);
  const ruleset = [];
  const seen = /* @__PURE__ */ new Set();
  for (const [realmBits, realmDetails] of realms) {
    for (const [partyBits, partyName] of partyness) {
      for (const typeName in typeNameToTypeValue) {
        if (types.has(typeName) === false) {
          continue;
        }
        const typeBits = typeNameToTypeValue[typeName];
        const bits = realmBits | partyBits | typeBits;
        const bucket = buckets.get(bits);
        if (bucket === void 0) {
          continue;
        }
        for (const rules of bucket.values()) {
          for (const rule of rules) {
            rule.action = rule.action || {};
            rule.action.type = realmDetails.type;
            if (realmDetails.priority !== 0) {
              rule.priority = (rule.priority || 0) + realmDetails.priority;
            }
            if (partyName !== "") {
              rule.condition = rule.condition || {};
              rule.condition.domainType = partyName;
            }
            if (typeName !== "no_type") {
              rule.condition = rule.condition || {};
              rule.condition.resourceTypes = [typeName];
            }
            const hash = JSON.stringify(rule);
            if (seen.has(hash)) {
              continue;
            }
            seen.add(hash);
            ruleset.push(rule);
          }
        }
      }
    }
  }
  seen.clear();
  for (const rule of ruleset) {
    if (rule.__important !== true) {
      continue;
    }
    rule.priority ??= 0;
    rule.priority += 30;
  }
  const generichideExclusions = [];
  const generichideInclusions = [];
  {
    const bucket = buckets.get(ALLOW_REALM | typeNameToTypeValue["generichide"]);
    if (bucket) {
      for (const rules of bucket.values()) {
        for (const rule of rules) {
          if (rule.condition === void 0) {
            continue;
          }
          if (rule.condition.initiatorDomains) {
            generichideExclusions.push(...rule.condition.initiatorDomains);
          } else if (rule.condition.requestDomains) {
            generichideExclusions.push(...rule.condition.requestDomains);
          }
          if (rule.condition.excludedInitiatorDomains) {
            generichideInclusions.push(...rule.condition.excludedInitiatorDomains);
          } else if (rule.condition.excludedRequestDomains) {
            generichideInclusions.push(...rule.condition.excludedRequestDomains);
          }
        }
      }
    }
  }
  {
    const bucket = buckets.get(BLOCKIMPORTANT_REALM | typeNameToTypeValue["generichide"]);
    if (bucket) {
      for (const rules of bucket.values()) {
        for (const rule of rules) {
          if (rule.condition === void 0) {
            continue;
          }
          if (rule.condition.initiatorDomains) {
            generichideInclusions.push(...rule.condition.initiatorDomains);
          } else if (rule.condition.requestDomains) {
            generichideInclusions.push(...rule.condition.requestDomains);
          }
        }
      }
    }
  }
  const isUnsupportedDomain = /* @__PURE__ */ __name((hn2) => hn2.endsWith(".*") || hn2.startsWith("/"), "isUnsupportedDomain");
  for (const rule of ruleset) {
    if (rule.condition === void 0) {
      continue;
    }
    for (const prop of ["Initiator", "Request", "Top"]) {
      const hitProp = `${prop.toLowerCase()}Domains`;
      if (Array.isArray(rule.condition[hitProp])) {
        if (rule.condition[hitProp].some((hn2) => isUnsupportedDomain(hn2))) {
          const domains = rule.condition[hitProp].filter(
            (hn2) => isUnsupportedDomain(hn2) === false
          );
          if (domains.length === 0) {
            dnrAddRuleError(rule, `Can't salvage rule with unsupported domain= option: ${rule.condition[hitProp].join("|")}`);
          } else {
            dnrAddRuleWarning(rule, `Salvaged rule by ignoring ${rule.condition[hitProp].length - domains.length} unsupported domain= option: ${rule.condition[hitProp].join("|")}`);
            rule.condition[hitProp] = domains;
          }
        }
      }
      const missProp = `excluded${prop}Domains`;
      if (Array.isArray(rule.condition[missProp])) {
        if (rule.condition[missProp].some((hn2) => isUnsupportedDomain(hn2))) {
          const domains = rule.condition[missProp].filter(
            (hn2) => isUnsupportedDomain(hn2) === false
          );
          rule.condition[missProp] = domains.length !== 0 ? domains : void 0;
        }
      }
    }
  }
  for (const rule of ruleset) {
    if (rule.__modifierType === void 0) {
      continue;
    }
    let patchDomainOption = false;
    switch (rule.__modifierType) {
      case "csp":
        rule.action.type = "modifyHeaders";
        rule.action.responseHeaders = [{
          header: "content-security-policy",
          operation: "append",
          value: rule.__modifierValue
        }];
        if (rule.__modifierAction !== ALLOW_REALM) {
          break;
        }
        rule.action.type = "allow";
        rule.action.responseHeaders = void 0;
        break;
      case "permissions":
        rule.action.type = "modifyHeaders";
        rule.action.responseHeaders = [{
          header: "permissions-policy",
          operation: "append",
          value: rule.__modifierValue.split("|").join(", ")
        }];
        patchDomainOption = true;
        if (rule.__modifierAction !== ALLOW_REALM) {
          break;
        }
        rule.action.type = "allow";
        rule.action.responseHeaders = void 0;
        break;
      case "redirect-rule": {
        let token = rule.__modifierValue;
        if (token !== "") {
          const match = /:(\d+)$/.exec(token);
          if (match !== null) {
            rule.priority += Math.min(parseInt(match[1], 10), 8);
            token = token.slice(0, match.index);
          }
        }
        const resource = context.extensionPaths.get(token);
        if (rule.__modifierValue !== "" && resource === void 0) {
          dnrAddRuleError(rule, `Unpatchable redirect filter: ${rule.__modifierValue}`);
        }
        if (rule.__modifierAction !== ALLOW_REALM) {
          const extensionPath = resource || token;
          rule.action.type = "redirect";
          rule.action.redirect = { extensionPath };
        } else {
          rule.action.type = "block";
          rule.priority += 10;
        }
        break;
      }
      case "removeparam": {
        rule.action.type = "redirect";
        let paramName = rule.__modifierValue;
        if (paramName === "|") {
          paramName = "";
        }
        if (paramName !== "") {
          rule.action.redirect = {
            transform: {
              queryTransform: {
                removeParams: [paramName]
              }
            }
          };
          if (/^~?\/.+\/$/.test(paramName)) {
            dnrAddRuleError(rule, `Unsupported regex-based removeParam: ${paramName}`);
          }
        } else {
          rule.action.redirect = {
            transform: {
              query: ""
            }
          };
        }
        rule.condition ||= {};
        const { condition } = rule;
        if (condition.resourceTypes === void 0) {
          if (condition.excludedResourceTypes === void 0) {
            condition.resourceTypes = [
              "image",
              "main_frame",
              "sub_frame",
              "xmlhttprequest"
            ];
          }
        }
        const { urlFilter } = condition;
        if (urlFilter === void 0) {
          if (condition.regexFilter === void 0) {
            if (paramName !== "") {
              condition.urlFilter = `^${paramName}=`;
            }
          }
        } else if (urlFilter.startsWith("||")) {
          if (urlFilter.toLowerCase().includes(paramName.toLowerCase()) === false) {
            condition.urlFilter = `${condition.urlFilter}*^${paramName}=`;
          }
        }
        if (rule.__modifierAction !== ALLOW_REALM) {
          break;
        }
        rule.action.type = "allow";
        rule.action.redirect = void 0;
        break;
      }
      case "uritransform": {
        const parsed = parseReplaceByRegexValue(rule.__modifierValue);
        if (parsed.re !== void 0) {
          dnrAddRuleError(rule, `Incompatible with DNR: uritransform=${rule.__modifierValue}`);
          break;
        }
        if (rule.condition.regexFilter === void 0) {
          dnrAddRuleError(rule, `Incompatible with DNR (need regexFilter): uritransform=${rule.__modifierValue}`);
          break;
        }
        rule.action.type = "redirect";
        rule.action.redirect = {
          regexSubstitution: parsed.replacement.replace(/\$(\d+)/g, "\\$1")
        };
        break;
      }
      case "urlskip": {
        let urlFilter = rule.condition?.urlFilter;
        if (urlFilter === void 0) {
          break;
        }
        let anchor = 0;
        if (urlFilter.startsWith("||")) {
          anchor |= 4;
          urlFilter = urlFilter.slice(2);
        } else if (urlFilter.startsWith("|")) {
          anchor |= 2;
          urlFilter = urlFilter.slice(1);
        }
        if (urlFilter.endsWith("|")) {
          anchor |= 1;
          urlFilter = urlFilter.slice(0, -1);
        }
        rule.condition.urlFilter = void 0;
        rule.condition.regexFilter = restrFromGenericPattern(urlFilter, anchor);
        break;
      }
      default:
        dnrAddRuleError(rule, `Unsupported modifier ${rule.__modifierType}`);
        break;
    }
    if (patchDomainOption) {
      const domains = rule.condition.initiatorDomains;
      if (Array.isArray(domains) && domains.length !== 0) {
        rule.condition.requestDomains ||= [];
        rule.condition.requestDomains.push(...domains);
        rule.condition.initiatorDomains = void 0;
      }
      const notDomains = rule.condition.excludedInitiatorDomains;
      if (Array.isArray(notDomains) && notDomains.length !== 0) {
        rule.condition.excludedRequestDomains ||= [];
        rule.condition.excludedRequestDomains.push(...notDomains);
        rule.condition.excludedInitiatorDomains = void 0;
      }
    }
  }
  for (const rule of ruleset) {
    if (rule.priority > 1) {
      continue;
    }
    rule.priority = void 0;
  }
  return {
    ruleset,
    filterCount: context.filterCount,
    acceptedFilterCount: context.acceptedFilterCount,
    rejectedFilterCount: context.rejectedFilterCount,
    generichideExclusions: Array.from(new Set(generichideExclusions)),
    generichideInclusions: Array.from(new Set(generichideInclusions))
  };
};
StaticNetFilteringEngine.prototype.addFilterUnit = function(bits, tokenHash, inewunit) {
  const bucket = this.bitsToBucket.get(bits) || /* @__PURE__ */ new Map();
  if (bucket.size === 0) {
    this.bitsToBucket.set(bits, bucket);
  }
  const istoredunit = bucket.get(tokenHash) || 0;
  if (istoredunit === 0) {
    bucket.set(tokenHash, inewunit);
    return;
  }
  if (filterData[istoredunit + 0] === FilterBucket.fid) {
    FilterBucket.unshift(istoredunit, inewunit);
    return;
  }
  const ibucketunit = FilterBucket.create();
  FilterBucket.unshift(ibucketunit, istoredunit);
  FilterBucket.unshift(ibucketunit, inewunit);
  bucket.set(tokenHash, ibucketunit);
  this.unitsToOptimize.push({ bits, tokenHash });
};
StaticNetFilteringEngine.prototype.optimize = function(throttle = 0) {
  if (this.optimizeTaskId !== void 0) {
    dropTask(this.optimizeTaskId);
    this.optimizeTaskId = void 0;
  }
  const later = /* @__PURE__ */ __name((throttle2) => {
    this.optimizeTaskId = queueTask(() => {
      this.optimizeTaskId = void 0;
      this.optimize(throttle2);
    }, 1e3);
  }, "later");
  const t0 = Date.now();
  while (this.unitsToOptimize.length !== 0) {
    const { bits, tokenHash } = this.unitsToOptimize.pop();
    const bucket = this.bitsToBucket.get(bits);
    const iunit = bucket.get(tokenHash);
    const fc2 = filterGetClass(iunit);
    switch (fc2) {
      case FilterHostnameDict:
        FilterHostnameDict.optimize(iunit);
        break;
      case FilterBucket: {
        const optimizeBits = tokenHash === NO_TOKEN_HASH || (bits & MODIFY_REALMS) !== 0 ? 2 : 1;
        const inewunit = FilterBucket.optimize(iunit, optimizeBits);
        if (inewunit !== 0) {
          bucket.set(tokenHash, inewunit);
        }
        break;
      }
      default:
        break;
    }
    if (throttle > 0 && Date.now() - t0 > 40) {
      return later(throttle - 1);
    }
  }
  filterArgsToUnit.clear();
  keyvalStore.setItem(
    "SNFE.destHNTrieContainer.trieDetails",
    destHNTrieContainer.optimize()
  );
  filterDataShrink();
};
StaticNetFilteringEngine.prototype.toSelfie = function() {
  this.optimize(0);
  bidiTrie.optimize();
  keyvalStore.setItem(
    "SNFE.origHNTrieContainer.trieDetails",
    origHNTrieContainer.optimize()
  );
  return {
    version: this.selfieVersion,
    processedFilterCount: this.processedFilterCount,
    acceptedCount: this.acceptedCount,
    discardedCount: this.discardedCount,
    bitsToBucket: this.bitsToBucket,
    urlTokenizer: urlTokenizer.toSelfie(),
    destHNTrieContainer: destHNTrieContainer.toSelfie(),
    origHNTrieContainer: origHNTrieContainer.toSelfie(),
    bidiTrie: bidiTrie.toSelfie(),
    filterData: filterDataToSelfie(),
    filterRefs: filterRefsToSelfie()
  };
};
StaticNetFilteringEngine.prototype.serialize = function() {
  return this.toSelfie();
};
StaticNetFilteringEngine.prototype.fromSelfie = function(selfie) {
  if (typeof selfie !== "object" || selfie === null) {
    return;
  }
  this.reset();
  this.notReady = true;
  const results = [
    destHNTrieContainer.fromSelfie(selfie.destHNTrieContainer),
    origHNTrieContainer.fromSelfie(selfie.origHNTrieContainer),
    bidiTrie.fromSelfie(selfie.bidiTrie),
    filterDataFromSelfie(selfie.filterData),
    filterRefsFromSelfie(selfie.filterRefs)
  ];
  if (results.slice(1).every((v2) => v2 === true) === false) {
    return false;
  }
  if (selfie.version !== this.selfieVersion) {
    return false;
  }
  this.processedFilterCount = selfie.processedFilterCount;
  this.acceptedCount = selfie.acceptedCount;
  this.discardedCount = selfie.discardedCount;
  this.bitsToBucket = selfie.bitsToBucket;
  urlTokenizer.fromSelfie(selfie.urlTokenizer);
  this.notReady = false;
  return true;
};
StaticNetFilteringEngine.prototype.unserialize = function(selfie) {
  return this.fromSelfie(selfie);
};
StaticNetFilteringEngine.prototype.createCompiler = function() {
  return new FilterCompiler();
};
StaticNetFilteringEngine.prototype.fromCompiled = function(reader) {
  reader.select("NETWORK_FILTERS:GOOD");
  while (reader.next()) {
    this.acceptedCount += 1;
    if (this.goodFilters.has(reader.line)) {
      this.discardedCount += 1;
    } else {
      this.goodFilters.add(reader.line);
    }
  }
  reader.select("NETWORK_FILTERS:BAD");
  while (reader.next()) {
    this.badFilters.add(reader.line);
  }
};
StaticNetFilteringEngine.prototype.matchAndFetchModifiers = function(fctxt, modifierName) {
  if (this.notReady) {
    return;
  }
  const typeBits = typeNameToTypeValue[fctxt.type] || otherTypeBitValue;
  resetRegisters(fctxt, typeBits);
  const modifierType = modifierTypeFromName.get(modifierName);
  const modifierBits = modifierBitsFromType.get(modifierType);
  const partyBits = fctxt.is3rdPartyToDoc() ? THIRDPARTY_REALM : FIRSTPARTY_REALM;
  const catBits00 = modifierBits;
  const catBits01 = modifierBits | typeBits;
  const catBits10 = modifierBits | partyBits;
  const catBits11 = modifierBits | typeBits | partyBits;
  const bucket00 = this.bitsToBucket.get(catBits00);
  const bucket01 = typeBits !== 0 ? this.bitsToBucket.get(catBits01) : void 0;
  const bucket10 = partyBits !== 0 ? this.bitsToBucket.get(catBits10) : void 0;
  const bucket11 = typeBits !== 0 && partyBits !== 0 ? this.bitsToBucket.get(catBits11) : void 0;
  if (bucket00 === void 0 && bucket01 === void 0 && bucket10 === void 0 && bucket11 === void 0) {
    return;
  }
  const results = [];
  const env = {
    type: modifierType || 0,
    bits: 0,
    th: 0,
    iunit: 0,
    results
  };
  const tokenHashes = urlTokenizer.getTokens();
  let i = 0;
  let th2 = 0, iunit = 0;
  for (; ; ) {
    th2 = tokenHashes[i];
    if (th2 === INVALID_TOKEN_HASH) {
      break;
    }
    env.th = th2;
    $tokenBeg = tokenHashes[i + 1];
    if (bucket00 !== void 0 && (iunit = bucket00.get(th2) || 0) !== 0) {
      env.bits = catBits00;
      env.iunit = iunit;
      filterMatchAndFetchModifiers(iunit, env);
    }
    if (bucket01 !== void 0 && (iunit = bucket01.get(th2) || 0) !== 0) {
      env.bits = catBits01;
      env.iunit = iunit;
      filterMatchAndFetchModifiers(iunit, env);
    }
    if (bucket10 !== void 0 && (iunit = bucket10.get(th2) || 0) !== 0) {
      env.bits = catBits10;
      env.iunit = iunit;
      filterMatchAndFetchModifiers(iunit, env);
    }
    if (bucket11 !== void 0 && (iunit = bucket11.get(th2) || 0) !== 0) {
      env.bits = catBits11;
      env.iunit = iunit;
      filterMatchAndFetchModifiers(iunit, env);
    }
    i += 2;
  }
  if (results.length === 0) {
    return;
  }
  if (results.length === 1) {
    const result = results[0];
    if ((result.bits & ALLOW_REALM) !== 0) {
      return;
    }
    return [result];
  }
  const toAddImportant = /* @__PURE__ */ new Map();
  const toAdd = /* @__PURE__ */ new Map();
  const toRemove = /* @__PURE__ */ new Map();
  for (const result of results) {
    const actionBits = result.bits & BLOCKALLOW_REALM;
    const modifyValue = result.value;
    if (actionBits === BLOCKIMPORTANT_REALM) {
      toAddImportant.set(modifyValue, result);
    } else if (actionBits === BLOCK_REALM) {
      toAdd.set(modifyValue, result);
    } else {
      toRemove.set(modifyValue, result);
    }
  }
  if (toAddImportant.size === 0 && toAdd.size === 0) {
    return;
  }
  if (toAddImportant.size !== 0) {
    for (const key of toAddImportant.keys()) {
      toAdd.delete(key);
      toRemove.delete(key);
    }
  }
  if (toRemove.size !== 0) {
    if (toRemove.has("") === false) {
      for (const key of toRemove.keys()) {
        if (toAdd.has(key)) {
          toAdd.delete(key);
        } else {
          toRemove.delete(key);
        }
      }
    } else if (toAdd.size !== 0) {
      toAdd.clear();
      if (toRemove.size !== 1) {
        const entry = toRemove.get("");
        toRemove.clear();
        toRemove.set("", entry);
      }
    } else {
      toRemove.clear();
    }
  }
  if (toAdd.size === 0 && toAddImportant.size === 0 && toRemove.size === 0) {
    return;
  }
  const out = Array.from(toAdd.values());
  if (toAddImportant.size !== 0) {
    out.push(...toAddImportant.values());
  }
  if (toRemove.size !== 0) {
    out.push(...toRemove.values());
  }
  return out;
};
StaticNetFilteringEngine.prototype.realmMatchString = function(realmBits, typeBits, partyBits) {
  if (this.notReady) {
    return false;
  }
  const exactType = typeBits & 2147483648;
  typeBits &= 2147483647;
  const catBits00 = realmBits;
  const catBits01 = realmBits | typeBits;
  const catBits10 = realmBits | partyBits;
  const catBits11 = realmBits | typeBits | partyBits;
  const bucket00 = exactType === 0 ? this.bitsToBucket.get(catBits00) : void 0;
  const bucket01 = exactType !== 0 || typeBits !== 0 ? this.bitsToBucket.get(catBits01) : void 0;
  const bucket10 = exactType === 0 && partyBits !== 0 ? this.bitsToBucket.get(catBits10) : void 0;
  const bucket11 = (exactType !== 0 || typeBits !== 0) && partyBits !== 0 ? this.bitsToBucket.get(catBits11) : void 0;
  if (bucket00 === void 0 && bucket01 === void 0 && bucket10 === void 0 && bucket11 === void 0) {
    return false;
  }
  let catBits = 0, iunit = 0;
  let tokenHash = DOT_TOKEN_HASH;
  if (bucket00 !== void 0 && (iunit = bucket00.get(DOT_TOKEN_HASH) || 0) !== 0 && filterMatch(iunit) === true) {
    catBits = catBits00;
  } else if (bucket01 !== void 0 && (iunit = bucket01.get(DOT_TOKEN_HASH) || 0) !== 0 && filterMatch(iunit) === true) {
    catBits = catBits01;
  } else if (bucket10 !== void 0 && (iunit = bucket10.get(DOT_TOKEN_HASH) || 0) !== 0 && filterMatch(iunit) === true) {
    catBits = catBits10;
  } else if (bucket11 !== void 0 && (iunit = bucket11.get(DOT_TOKEN_HASH) || 0) !== 0 && filterMatch(iunit) === true) {
    catBits = catBits11;
  } else {
    const tokenHashes = urlTokenizer.getTokens();
    let i = 0;
    for (; ; ) {
      tokenHash = tokenHashes[i];
      if (tokenHash === INVALID_TOKEN_HASH) {
        return false;
      }
      $tokenBeg = tokenHashes[i + 1];
      if (bucket00 !== void 0 && (iunit = bucket00.get(tokenHash) || 0) !== 0 && filterMatch(iunit) === true) {
        catBits = catBits00;
        break;
      }
      if (bucket01 !== void 0 && (iunit = bucket01.get(tokenHash) || 0) !== 0 && filterMatch(iunit) === true) {
        catBits = catBits01;
        break;
      }
      if (bucket10 !== void 0 && (iunit = bucket10.get(tokenHash) || 0) !== 0 && filterMatch(iunit) === true) {
        catBits = catBits10;
        break;
      }
      if (bucket11 !== void 0 && (iunit = bucket11.get(tokenHash) || 0) !== 0 && filterMatch(iunit) === true) {
        catBits = catBits11;
        break;
      }
      i += 2;
    }
  }
  this.$catBits = catBits;
  this.$tokenHash = tokenHash;
  this.$filterUnit = iunit;
  return true;
};
StaticNetFilteringEngine.prototype.matchRequest = function(fctxt, modifiers = 0) {
  let typeBits = typeNameToTypeValue[fctxt.type];
  if (modifiers === 0) {
    if (typeBits === void 0) {
      typeBits = otherTypeBitValue;
    } else if (typeBits === 0 || typeBits > otherTypeBitValue) {
      modifiers |= 1;
    }
  }
  if ((modifiers & 1) !== 0) {
    if (typeBits === void 0) {
      return 0;
    }
    typeBits |= 2147483648;
  }
  const partyBits = fctxt.is3rdPartyToDoc() ? THIRDPARTY_REALM : FIRSTPARTY_REALM;
  resetRegisters(fctxt, typeBits);
  this.$filterUnit = 0;
  const r = this.realmMatchString(BLOCK_REALM, typeBits, partyBits);
  if (r || (modifiers & 2) !== 0) {
    if ($isBlockImportant) {
      return 1;
    }
    if (this.realmMatchString(ALLOW_REALM, typeBits, partyBits)) {
      if (this.realmMatchString(BLOCKIMPORTANT_REALM, typeBits, partyBits)) {
        return 1;
      }
      return 2;
    }
    if (r) {
      return 1;
    }
  }
  return 0;
};
StaticNetFilteringEngine.prototype.matchHeaders = function(fctxt, ...headers) {
  const typeBits = typeNameToTypeValue[fctxt.type] || otherTypeBitValue;
  const partyBits = fctxt.is3rdPartyToDoc() ? THIRDPARTY_REALM : FIRSTPARTY_REALM;
  resetRegisters(fctxt, typeBits);
  $httpHeaders.init(...headers);
  this.$filterUnit = 0;
  let r = 0;
  if (this.realmMatchString(HEADERS_REALM | BLOCK_REALM, typeBits, partyBits)) {
    r = 1;
  }
  if (r !== 0 && $isBlockImportant !== true) {
    if (this.realmMatchString(HEADERS_REALM | ALLOW_REALM, typeBits, partyBits)) {
      r = 2;
    } else if (this.realmMatchString(ALLOW_REALM, typeBits, partyBits)) {
      r = 2;
    }
    if (r === 2) {
      if (this.realmMatchString(HEADERS_REALM | BLOCKIMPORTANT_REALM, typeBits, partyBits)) {
        r = 1;
      }
    }
  }
  $httpHeaders.reset();
  return r;
};
StaticNetFilteringEngine.prototype.redirectRequest = function(redirectEngine, fctxt) {
  const directives = this.matchAndFetchModifiers(fctxt, "redirect-rule");
  if (directives === void 0) {
    return;
  }
  const highest = directives.length - 1;
  if (highest !== 0) {
    directives.sort((a, b2) => compareRedirectRequests(redirectEngine, a, b2));
  }
  const directive = directives[highest];
  if ((directive.bits & ALLOW_REALM) !== 0) {
    return directives;
  }
  const { token } = parseRedirectRequestValue(directive);
  fctxt.redirectURL = redirectEngine.tokenToURL(fctxt, token);
  if (fctxt.redirectURL === void 0) {
    return;
  }
  return directives;
};
function parseRedirectRequestValue(directive) {
  if (directive.cache === null) {
    directive.cache = parseRedirectValue(directive.value);
  }
  return directive.cache;
}
__name(parseRedirectRequestValue, "parseRedirectRequestValue");
function compareRedirectRequests(redirectEngine, a, b2) {
  const { token: atok, priority: aint, bits: abits } = parseRedirectRequestValue(a);
  if (redirectEngine.hasToken(atok) === false) {
    return -1;
  }
  const { token: btok, priority: bint, bits: bbits } = parseRedirectRequestValue(b2);
  if (redirectEngine.hasToken(btok) === false) {
    return 1;
  }
  if (abits !== bbits) {
    if ((abits & IMPORTANT_REALM) !== 0) {
      return 1;
    }
    if ((bbits & IMPORTANT_REALM) !== 0) {
      return -1;
    }
    if ((abits & ALLOW_REALM) !== 0) {
      return -1;
    }
    if ((bbits & ALLOW_REALM) !== 0) {
      return 1;
    }
  }
  return aint - bint;
}
__name(compareRedirectRequests, "compareRedirectRequests");
StaticNetFilteringEngine.prototype.transformURL = function(fctxt, out = []) {
  const directives = this.matchAndFetchModifiers(fctxt, "uritransform");
  if (directives === void 0) {
    return;
  }
  const redirectURL = new URL(fctxt.url);
  for (const directive of directives) {
    if ((directive.bits & ALLOW_REALM) !== 0) {
      out.push(directive);
      continue;
    }
    if (directive.cache === null) {
      directive.cache = parseReplaceByRegexValue(directive.value);
    }
    const cache = directive.cache;
    if (cache === void 0) {
      continue;
    }
    let { re: re2 } = cache;
    const before = redirectURL.href;
    if (re2 === void 0) {
      const logdata = directive.logData();
      if (logdata === void 0) {
        continue;
      }
      try {
        re2 = new RegExp(logdata.regex, cache.flags);
      } catch {
        continue;
      }
    }
    if (re2.test(before) !== true) {
      continue;
    }
    const after = before.replace(re2, cache.replacement);
    try {
      void new URL(after);
    } catch {
      continue;
    }
    if (after === before) {
      continue;
    }
    redirectURL.href = after;
    out.push(directive);
    break;
  }
  if (out.length === 0) {
    return;
  }
  if (redirectURL.href !== fctxt.url) {
    fctxt.redirectURL = redirectURL.href;
  }
  return out;
};
StaticNetFilteringEngine.prototype.urlSkip = function(fctxt, blocked, out = []) {
  if (fctxt.redirectURL !== void 0) {
    return;
  }
  const directives = this.matchAndFetchModifiers(fctxt, "urlskip");
  if (directives === void 0) {
    return;
  }
  for (const directive of directives) {
    if ((directive.bits & ALLOW_REALM) !== 0) {
      out.push(directive);
      continue;
    }
    const urlin = fctxt.url;
    const value = directive.value;
    const steps = value.includes(" ") && value.split(/ +/) || [value];
    const urlout = urlSkip(urlin, blocked, steps, directive);
    if (urlout === void 0) {
      continue;
    }
    if (urlout === urlin) {
      continue;
    }
    fctxt.redirectURL = urlout;
    out.push(directive);
    break;
  }
  if (out.length === 0) {
    return;
  }
  return out;
};
StaticNetFilteringEngine.prototype.filterQuery = function(fctxt, out = []) {
  if (fctxt.redirectURL !== void 0) {
    return;
  }
  const directives = this.matchAndFetchModifiers(fctxt, "removeparam");
  if (directives === void 0) {
    return;
  }
  const url = fctxt.url;
  const qpos = url.indexOf("?");
  if (qpos === -1) {
    return;
  }
  let hpos = url.indexOf("#", qpos + 1);
  if (hpos === -1) {
    hpos = url.length;
  }
  const params = [];
  const query = url.slice(qpos + 1, hpos);
  for (let i = 0; i < query.length; ) {
    let pos = query.indexOf("&", i);
    if (pos === -1) {
      pos = query.length;
    }
    const kv = query.slice(i, pos);
    i = pos + 1;
    pos = kv.indexOf("=");
    if (pos !== -1) {
      params.push(kv.slice(0, pos), kv.slice(pos + 1));
    } else {
      params.push(kv, "");
    }
  }
  const beforeParamCount = params.length;
  for (const directive of directives) {
    if (params.length === 0) {
      break;
    }
    const isException = (directive.bits & ALLOW_REALM) !== 0;
    if (isException && directive.value === "") {
      out.push(directive);
      break;
    }
    const { all, bad, name, not, re: re2 } = parseQueryPruneValue2(directive);
    if (bad) {
      continue;
    }
    if (all) {
      if (isException === false) {
        params.length = 0;
      }
      out.push(directive);
      break;
    }
    let filtered = false;
    let matched = false;
    let i = params.length;
    while (i > 0) {
      i -= 2;
      if (name !== void 0) {
        matched = params[i] === name;
      } else if (re2 !== void 0) {
        const key = params[i + 0];
        const raw = params[i + 1];
        let value = raw;
        try {
          value = decodeURIComponent(value);
        } catch {
        }
        matched = re2.test(`${key}=${value}`);
      }
      if (matched === not) {
        continue;
      }
      if (isException === false) {
        params.splice(i, 2);
      }
      filtered = true;
    }
    if (filtered) {
      out.push(directive);
    }
  }
  if (out.length === 0) {
    return;
  }
  if (params.length !== beforeParamCount) {
    fctxt.redirectURL = url.slice(0, qpos);
    if (params.length !== 0) {
      const queryParts = [];
      for (let i = 0; i < params.length; i += 2) {
        const key = params[i + 0];
        const val = params[i + 1];
        queryParts.push(val !== "" ? `${key}=${val}` : key);
      }
      fctxt.redirectURL += "?" + queryParts.join("&");
    }
    if (hpos !== url.length) {
      fctxt.redirectURL += url.slice(hpos);
    }
  }
  return out;
};
function parseQueryPruneValue2(directive) {
  if (directive.cache === null) {
    directive.cache = parseQueryPruneValue(directive.value);
  }
  return directive.cache;
}
__name(parseQueryPruneValue2, "parseQueryPruneValue");
StaticNetFilteringEngine.prototype.hasQuery = function(fctxt) {
  urlTokenizer.setURL(fctxt.url);
  return urlTokenizer.hasQuery();
};
StaticNetFilteringEngine.prototype.toLogData = function() {
  if (this.$filterUnit !== 0) {
    return new LogData(this.$catBits, this.$tokenHash, this.$filterUnit);
  }
};
StaticNetFilteringEngine.prototype.isBlockImportant = function() {
  return this.$filterUnit !== 0 && $isBlockImportant;
};
StaticNetFilteringEngine.prototype.getFilterCount = function() {
  return this.acceptedCount - this.discardedCount;
};
StaticNetFilteringEngine.prototype.enableWASM = function(wasmModuleFetcher, path) {
  return Promise.all([
    bidiTrie.enableWASM(wasmModuleFetcher, path),
    origHNTrieContainer.enableWASM(wasmModuleFetcher, path),
    destHNTrieContainer.enableWASM(wasmModuleFetcher, path)
  ]).then((results) => {
    return results.every((a) => a === true);
  });
};
StaticNetFilteringEngine.prototype.test = function(details) {
  const { url, type, from, redirectEngine } = details;
  if (url === void 0) {
    return;
  }
  const fctxt = new FilteringContext();
  fctxt.setURL(url);
  fctxt.setType(type || "");
  fctxt.setDocOriginFromURL(from || "");
  const r = this.matchRequest(fctxt);
  const out = [`url: ${url}`];
  if (type) {
    out.push(`type: ${type}`);
  }
  if (from) {
    out.push(`context: ${from}`);
  }
  if (r !== 0) {
    const logdata = this.toLogData();
    if (r === 1) {
      out.push(`blocked: ${logdata.raw}`);
    } else if (r === 2) {
      out.push(`unblocked: ${logdata.raw}`);
    }
  } else {
    out.push("not blocked");
  }
  if (r !== 1) {
    const entries = this.transformURL(fctxt);
    if (entries) {
      for (const entry of entries) {
        out.push(`modified: ${entry.logData().raw}`);
      }
    }
    if (fctxt.redirectURL !== void 0 && this.hasQuery(fctxt)) {
      const entries2 = this.filterQuery(fctxt, "removeparam");
      if (entries2) {
        for (const entry of entries2) {
          out.push(`modified: ${entry.logData().raw}`);
        }
      }
    }
    if (fctxt.type === "main_frame" || fctxt.type === "sub_frame") {
      const csps = this.matchAndFetchModifiers(fctxt, "csp");
      if (csps) {
        for (const csp of csps) {
          out.push(`modified: ${csp.logData().raw}`);
        }
      }
      const pps = this.matchAndFetchModifiers(fctxt, "permissions");
      if (pps) {
        for (const pp2 of pps) {
          out.push(`modified: ${pp2.logData().raw}`);
        }
      }
    }
  } else if (redirectEngine) {
    const redirects = this.redirectRequest(redirectEngine, fctxt);
    if (redirects) {
      for (const redirect of redirects) {
        out.push(`modified: ${redirect.logData().raw}`);
      }
    }
  }
  const urlskips = this.matchAndFetchModifiers(fctxt, "urlskip");
  if (urlskips) {
    for (const urlskip of urlskips) {
      out.push(`modified: ${urlskip.logData().raw}`);
    }
  }
  return out.join("\n");
};
StaticNetFilteringEngine.prototype.bucketHistogram = function() {
  const results = [];
  for (const [bits, bucket] of this.bitsToBucket) {
    for (const [th2, iunit] of bucket) {
      const token = urlTokenizer.stringFromTokenHash(th2);
      const fc2 = filterGetClass(iunit);
      const count = fc2.getCount !== void 0 ? fc2.getCount(iunit) : 1;
      results.push({ bits: bits.toString(16), token, count, f: fc2.name });
    }
  }
  results.sort((a, b2) => {
    return b2.count - a.count;
  });
  console.info(results);
};
StaticNetFilteringEngine.prototype.dump = function() {
  const thConstants = /* @__PURE__ */ new Map([
    [NO_TOKEN_HASH, "NO_TOKEN_HASH"],
    [DOT_TOKEN_HASH, "DOT_TOKEN_HASH"],
    [ANY_TOKEN_HASH, "ANY_TOKEN_HASH"],
    [ANY_HTTPS_TOKEN_HASH, "ANY_HTTPS_TOKEN_HASH"],
    [ANY_HTTP_TOKEN_HASH, "ANY_HTTP_TOKEN_HASH"],
    [EMPTY_TOKEN_HASH, "EMPTY_TOKEN_HASH"]
  ]);
  const out = [];
  const toOutput = /* @__PURE__ */ __name((depth, line) => {
    out.push(`${" ".repeat(depth * 2)}${line}`);
  }, "toOutput");
  const dumpUnit = /* @__PURE__ */ __name((idata, depth = 0) => {
    const fc2 = filterGetClass(idata);
    fcCounts.set(fc2.name, (fcCounts.get(fc2.name) || 0) + 1);
    const info = filterDumpInfo(idata) || "";
    toOutput(depth, info !== "" ? `${fc2.name}: ${info}` : fc2.name);
    switch (fc2) {
      case FilterBucket:
      case FilterCompositeAll:
      case FilterDomainHitAny: {
        fc2.forEach(idata, (i) => {
          dumpUnit(i, depth + 1);
        });
        break;
      }
      case FilterBucketIfOriginHits: {
        dumpUnit(filterData[idata + 2], depth + 1);
        dumpUnit(filterData[idata + 1], depth + 1);
        break;
      }
      case FilterBucketIfRegexHits: {
        dumpUnit(filterData[idata + 1], depth + 1);
        break;
      }
      case FilterPlainTrie: {
        for (const details of bidiTrie.trieIterator(filterData[idata + 1])) {
          toOutput(depth + 1, details.pattern);
          let ix = details.iextra;
          if (ix === 1) {
            continue;
          }
          for (; ; ) {
            if (ix === 0) {
              break;
            }
            dumpUnit(filterData[ix + 0], depth + 2);
            ix = filterData[ix + 1];
          }
        }
        break;
      }
      default:
        break;
    }
  }, "dumpUnit");
  const fcCounts = /* @__PURE__ */ new Map();
  const thCounts = /* @__PURE__ */ new Set();
  const realms = /* @__PURE__ */ new Map([
    [BLOCK_REALM, "block"],
    [BLOCKIMPORTANT_REALM, "block-important"],
    [ALLOW_REALM, "unblock"],
    [REDIRECT_REALM, "redirect"],
    [REMOVEPARAM_REALM, "removeparam"],
    [CSP_REALM, "csp"],
    [PERMISSIONS_REALM, "permissions"],
    [URLTRANSFORM_REALM, "uritransform"],
    [REPLACE_REALM, "replace"],
    [URLSKIP_REALM, "urlskip"]
  ]);
  const partyness = /* @__PURE__ */ new Map([
    [ANYPARTY_REALM, "any-party"],
    [FIRSTPARTY_REALM, "1st-party"],
    [THIRDPARTY_REALM, "3rd-party"]
  ]);
  for (const [realmBits, realmName] of realms) {
    toOutput(1, `+ realm: ${realmName}`);
    for (const [partyBits, partyName] of partyness) {
      toOutput(2, `+ party: ${partyName}`);
      const processedTypeBits = /* @__PURE__ */ new Set();
      for (const typeName in typeNameToTypeValue) {
        const typeBits = typeNameToTypeValue[typeName];
        if (processedTypeBits.has(typeBits)) {
          continue;
        }
        processedTypeBits.add(typeBits);
        const bits = realmBits | partyBits | typeBits;
        const bucket = this.bitsToBucket.get(bits);
        if (bucket === void 0) {
          continue;
        }
        const thCount = bucket.size;
        toOutput(3, `+ type: ${typeName} (${thCount})`);
        for (const [th2, iunit] of bucket) {
          thCounts.add(th2);
          const ths = thConstants.has(th2) ? thConstants.get(th2) : `0x${th2.toString(16)}`;
          toOutput(4, `+ th: ${ths}`);
          dumpUnit(iunit, 5);
        }
      }
    }
  }
  const knownTokens = urlTokenizer.knownTokens.reduce((a, b2) => b2 !== 0 ? a + 1 : a, 0);
  out.unshift([
    "Static Network Filtering Engine internals:",
    `  Distinct token hashes: ${thCounts.size.toLocaleString("en")}`,
    `  Known-token sieve (Uint8Array): ${knownTokens.toLocaleString("en")} out of 65,536`,
    `  Filter data (Int32Array): ${filterDataWritePtr.toLocaleString("en")}`,
    `  Filter refs (JS array): ${filterRefsWritePtr.toLocaleString("en")}`,
    "  Origin trie container:",
    origHNTrieContainer.dumpInfo().split("\n").map((a) => `    ${a}`).join("\n"),
    "  Request trie container:",
    destHNTrieContainer.dumpInfo().split("\n").map((a) => `    ${a}`).join("\n"),
    "  Pattern trie container:",
    bidiTrie.dumpInfo().split("\n").map((a) => `    ${a}`).join("\n"),
    "+ Filter class stats:",
    Array.from(fcCounts).sort((a, b2) => b2[1] - a[1]).map((a) => `    ${a[0]}: ${a[1].toLocaleString("en")}`).join("\n"),
    "+ Filter tree:"
  ].join("\n"));
  return out.join("\n");
};
var staticNetFilteringEngine = new StaticNetFilteringEngine();
var static_net_filtering_default = staticNetFilteringEngine;

// ubo-src/js/text-utils.js
var LineIterator = class {
  static {
    __name(this, "LineIterator");
  }
  constructor(text, offset) {
    this.text = text;
    this.textLen = this.text.length;
    this.offset = offset || 0;
  }
  next(offset) {
    if (offset !== void 0) {
      this.offset += offset;
    }
    let lineEnd = this.text.indexOf("\n", this.offset);
    if (lineEnd === -1) {
      lineEnd = this.text.indexOf("\r", this.offset);
      if (lineEnd === -1) {
        lineEnd = this.textLen;
      }
    }
    const line = this.text.slice(this.offset, lineEnd);
    this.offset = lineEnd + 1;
    return line;
  }
  peek(n) {
    const offset = this.offset;
    return this.text.slice(offset, offset + n);
  }
  charCodeAt(offset) {
    return this.text.charCodeAt(this.offset + offset);
  }
  eot() {
    return this.offset >= this.textLen;
  }
};

// driver.mjs
function compileList(rawText, opts = {}) {
  const env = opts.env || [];
  const writer = new CompiledListWriter();
  const parser = new AstFilterParser({
    trustedSource: opts.trustedSource === true,
    maxTokenLength: static_net_filtering_default.MAX_TOKEN_LENGTH,
    nativeCssHas: false
  });
  const compiler = static_net_filtering_default.createCompiler(parser);
  const lineIter = new LineIterator(utils.preparser.prune(rawText, env));
  let net = 0, ext = 0, other = 0;
  compiler.start(writer);
  while (lineIter.eot() === false) {
    let line = lineIter.next();
    while (line.endsWith(" \\")) {
      if (lineIter.peek(4) !== "    ") {
        break;
      }
      line = line.slice(0, -2).trim() + lineIter.next().trim();
    }
    parser.parse(line);
    if (parser.isFilter() === false) {
      other++;
      continue;
    }
    if (parser.hasError()) {
      other++;
      continue;
    }
    if (parser.isExtendedFilter()) {
      ext++;
      continue;
    }
    if (parser.isNetworkFilter() === false) {
      other++;
      continue;
    }
    compiler.compile(parser, writer);
    net++;
  }
  compiler.finish(writer);
  parser.finish();
  return { compiled: writer.toString(), net, ext, other };
}
__name(compileList, "compileList");
function loadCompiled(compiledList) {
  static_net_filtering_default.reset();
  for (const compiled of compiledList) {
    const reader = new CompiledListReader(compiled);
    static_net_filtering_default.fromCompiled(reader);
  }
  static_net_filtering_default.freeze();
}
__name(loadCompiled, "loadCompiled");
var now = (() => {
  if (typeof performance === "object" && performance.now) {
    return () => performance.now();
  }
  if (typeof dateNow === "function") {
    return () => dateNow();
  }
  return () => Date.now();
})();
function runOnce(rawTexts, opts = {}) {
  const doLoad = opts.load !== false;
  const tc0 = now();
  const compiledList = [];
  let net = 0, ext = 0, other = 0;
  for (const raw of rawTexts) {
    const r = compileList(raw, opts);
    compiledList.push(r.compiled);
    net += r.net;
    ext += r.ext;
    other += r.other;
  }
  const tc1 = now();
  let tl2 = 0;
  if (doLoad) {
    const tl0 = now();
    loadCompiled(compiledList);
    tl2 = now() - tl0;
  }
  const compiledBytes = compiledList.reduce((a, s) => a + s.length, 0);
  return {
    compileMs: +(tc1 - tc0).toFixed(1),
    loadMs: +tl2.toFixed(1),
    totalMs: +(tc1 - tc0 + tl2).toFixed(1),
    netFilters: net,
    extFilters: ext,
    otherLines: other,
    compiledBytes,
    acceptedCount: static_net_filtering_default.acceptedCount,
    discardedCount: static_net_filtering_default.discardedCount
  };
}
__name(runOnce, "runOnce");
function bench(rawTexts, iters = 5, opts = {}) {
  const runs = [];
  for (let i = 0; i < iters; i++) {
    runs.push(runOnce(rawTexts, opts));
  }
  return runs;
}
__name(bench, "bench");
export {
  bench,
  compileList,
  loadCompiled,
  runOnce
};
/*! Home: https://github.com/gorhill/publicsuffixlist.js -- GPLv3 APLv2 */
/*! https://mths.be/punycode v1.3.2 by @mathias */
