// REAL APP: dayjs date library. Calendar arithmetic stresses integer div/mod, leap-year
// branches, string formatting, coercion -- distinct paths from lodash/big. Deterministic
// (fixed dates, no now()). Full-result checksum, JIT vs PBL. Load: dayjs.min.js drv-dayjs.js
function mix(h, s){ s=String(s); for (var i=0;i<s.length;i++){ h=(Math.imul(h,31)+s.charCodeAt(i))|0; } return h; }
var D = (typeof globalThis !== "undefined" && globalThis.dayjs) || dayjs;
var bases = ["2024-02-29T13:45:30","2023-12-31T23:59:59","2000-01-01T00:00:00",
  "1970-01-01T00:00:00","2024-03-15T08:30:00","2019-07-04T12:00:00","2100-11-30T06:15:45",
  "2024-01-31T00:00:00","2024-02-28T23:00:00","1999-12-31T18:00:00"];
function fold(seed){
  var h = 0;
  for (var i = 0; i < bases.length; i++) {
    var d = D(bases[i]);
    var n = (seed * (i + 1)) % 400 - 200;   // add/subtract varied amounts
    h = mix(h, d.format("YYYY-MM-DD HH:mm:ss"));
    h = mix(h, d.add(n, "day").format("YYYY-MM-DD"));
    h = mix(h, d.add(n, "month").format("YYYY-MM-DD"));
    h = mix(h, d.add(n, "year").format("YYYY-MM-DD"));
    h = mix(h, d.subtract(n, "hour").format("HH:mm:ss"));
    h = mix(h, d.day() + "/" + d.date() + "/" + d.month() + "/" + d.daysInMonth());
    h = mix(h, d.hour() + ":" + d.minute() + ":" + d.second());
    h = mix(h, "" + d.unix() + "/" + d.valueOf());
    h = mix(h, d.startOf("month").format("YYYY-MM-DD") + "|" + d.endOf("month").format("YYYY-MM-DD"));
    var other = D(bases[(i + 3) % bases.length]);
    h = mix(h, d.diff(other, "day") + "/" + d.diff(other, "hour") + "/" + (d.isBefore(other) ? 1 : 0) + "/" + (d.isAfter(other) ? 1 : 0));
    h = mix(h, d.add(n, "day").add(n % 13, "month").format("YYYY-MM-DDTHH:mm:ss"));
  }
  return h;
}
var acc = 0;
for (var it = 0; it < 3000; it++) acc = mix(acc, fold(it % 37));
print("DAYJS checksum=" + acc);
