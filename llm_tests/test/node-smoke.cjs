const createSM = require('../web/sm.js');
createSM().then((Module) => {
  // main() runs during instantiation and prints the built-in tests.
  const cases = ['1+1', 'Math.sqrt(144)', '"abc".toUpperCase()',
                 '[3,1,2].sort().join(",")', 'typeof Promise',
                 '(function f(n){return n<2?n:f(n-1)+f(n-2)})(20)'];
  let ok = true;
  for (const c of cases) {
    const r = Module.ccall('sm_eval', 'string', ['string'], [c]);
    console.log(`  eval(${c}) = ${r}`);
    if (String(r).startsWith('<error') || String(r).startsWith('Error')) ok = false;
  }
  console.log(ok ? 'NODE_SMOKE_OK' : 'NODE_SMOKE_FAIL');
  process.exit(ok ? 0 : 1);
}).catch((e) => { console.error('instantiate failed', e); process.exit(2); });
