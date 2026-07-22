// Minimal Intl shim for the --without-intl-api embed: web-tooling's bundled tools
// (babel/typescript/prettier/...) reference Intl at module-init. This provides
// enough surface to load + run them (formatting is approximate; fine for timing).
(function (g) {
  if (typeof g.Intl !== "undefined") return;
  function NumberFormat() {}
  NumberFormat.prototype.format = function (n) { return String(n); };
  NumberFormat.prototype.resolvedOptions = function () { return {}; };
  function DateTimeFormat() {}
  DateTimeFormat.prototype.format = function (d) { return String(d); };
  DateTimeFormat.prototype.resolvedOptions = function () { return {}; };
  function Collator() {}
  Collator.prototype.compare = function (a, b) { return a < b ? -1 : a > b ? 1 : 0; };
  Collator.prototype.resolvedOptions = function () { return {}; };
  function PluralRules() {}
  PluralRules.prototype.select = function () { return "other"; };
  g.Intl = {
    NumberFormat, DateTimeFormat, Collator, PluralRules,
    getCanonicalLocales: function (l) { return l == null ? [] : (Array.isArray(l) ? l.slice() : [String(l)]); },
  };
})(globalThis);
