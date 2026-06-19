// Node runner for the minimal SpiderMonkey embedder.
//   node run.cjs <script.js> [more.js ...]
// Env vars (GECKO_WJVS_FDEOPT, GECKO_DEBUG_JIT, GECKO_WJVS_*) are forwarded to the wasm's getenv.
const path = require("path");
const createEmbed = require("./embed.js");
(async () => {
  const args = process.argv.slice(2).map((a) => path.resolve(a));
  if (!args.length) { console.error("usage: node run.cjs <script.js>"); process.exit(2); }
  // Forward host env to emscripten getenv (the JIT reads GECKO_* via getenv). Pass ENV in the
  // factory config so it's merged before the runtime builds `environ` at startup; also re-apply
  // in preRun (receives the module instance) as a belt-and-suspenders for the build's timing.
  const env = Object.assign({}, process.env);
  const Module = await createEmbed({
    noInitialRun: true,
    ENV: env,
    preRun: [(m) => { try { Object.assign(m.ENV, env); } catch (e) {} }],
    print: (s) => console.log(s),
    printErr: (s) => console.error(s),
  });
  let rc = 0;
  try { rc = Module.callMain(args); } catch (e) {
    console.error("[run] callMain threw:", e && e.message ? e.message : e);
    rc = 1;
  }
  process.exit(rc || 0);
})();
