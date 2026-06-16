// Channel probe: confirm dump() reaches stdout and report the JS environment.
(function () {
  var hasDump = (typeof dump === 'function');
  var report = { hasDump: hasDump, hasPerf: (typeof performance !== 'undefined'),
                 hasDateNow: (typeof Date.now === 'function') };
  // time a trivial loop so we know the eval ran
  var t = Date.now(); var s = 0; for (var i = 0; i < 1e6; i++) s += i; report.warmupMs = Date.now() - t; report.s = s;
  var line = 'BENCHRESULT ' + JSON.stringify(report) + '\n';
  if (hasDump) dump(line);
  else if (typeof console !== 'undefined') console.log(line);
})();
