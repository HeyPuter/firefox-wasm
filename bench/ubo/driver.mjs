// Standalone benchmark of uBlock Origin's static network filtering COMPILE +
// LOAD path -- the interpreted hot loop that pegs the gecko-wasm engine for
// ~60-90s on uBlock activation (see memory: gecko-wasm-ublock-perf).
//
// This mirrors µb.compileFilters() (storage.js) for the compile phase and
// snfe.fromCompiled()+freeze() (storage.js loadFilterLists) for the load phase.
// Cosmetic/scriptlet filters are PARSED (the parser is shared, hot) but not
// compiled (those engines are browser-API-bound and out of scope for a JIT bench).
//
// Built into ./build/ by build.sh; entry for both the ESM (node) and IIFE
// (gecko-wasm `js` shell) bundles.

import './shim.mjs';   // must be first: sets globalThis.vAPI etc. before uBlock modules evaluate
import * as sfp from './ubo-src/js/static-filtering-parser.js';
import snfe from './ubo-src/js/static-net-filtering.js';
import { CompiledListReader, CompiledListWriter } from './ubo-src/js/static-filtering-io.js';
import { LineIterator } from './ubo-src/js/text-utils.js';

// --- compile one raw filter list to uBlock's compiled-list string format ----
function compileList(rawText, opts = {}) {
    const env = opts.env || [];
    const writer = new CompiledListWriter();
    const parser = new sfp.AstFilterParser({
        trustedSource: opts.trustedSource === true,
        maxTokenLength: snfe.MAX_TOKEN_LENGTH,
        nativeCssHas: false,
    });
    const compiler = snfe.createCompiler(parser);
    const lineIter = new LineIterator(sfp.utils.preparser.prune(rawText, env));

    let net = 0, ext = 0, other = 0;
    compiler.start(writer);
    while ( lineIter.eot() === false ) {
        let line = lineIter.next();
        while ( line.endsWith(' \\') ) {
            if ( lineIter.peek(4) !== '    ' ) { break; }
            line = line.slice(0, -2).trim() + lineIter.next().trim();
        }
        parser.parse(line);
        if ( parser.isFilter() === false ) { other++; continue; }
        if ( parser.hasError() ) { other++; continue; }
        if ( parser.isExtendedFilter() ) { ext++; continue; }   // parsed, not compiled
        if ( parser.isNetworkFilter() === false ) { other++; continue; }
        compiler.compile(parser, writer);
        net++;
    }
    compiler.finish(writer);
    parser.finish();
    return { compiled: writer.toString(), net, ext, other };
}

// --- load compiled strings into the engine (builds the tries) + freeze -------
function loadCompiled(compiledList) {
    snfe.reset();
    for ( const compiled of compiledList ) {
        const reader = new CompiledListReader(compiled);
        snfe.fromCompiled(reader);
    }
    snfe.freeze();
}

// now() that works in node, the SpiderMonkey shell, and browsers.
const now = (() => {
    if ( typeof performance === 'object' && performance.now ) { return () => performance.now(); }
    if ( typeof dateNow === 'function' ) { return () => dateNow(); }
    return () => Date.now();
})();

// One full cold-start cycle: compile every list, then load+freeze the engine.
// Returns per-phase timings (ms) + counts. Set phases to subset for focus.
export function runOnce(rawTexts, opts = {}) {
    const doLoad = opts.load !== false;
    const tc0 = now();
    const compiledList = [];
    let net = 0, ext = 0, other = 0;
    for ( const raw of rawTexts ) {
        const r = compileList(raw, opts);
        compiledList.push(r.compiled);
        net += r.net; ext += r.ext; other += r.other;
    }
    const tc1 = now();
    let tl = 0;
    if ( doLoad ) {
        const tl0 = now();
        loadCompiled(compiledList);
        tl = now() - tl0;
    }
    const compiledBytes = compiledList.reduce((a, s) => a + s.length, 0);
    return {
        compileMs: +(tc1 - tc0).toFixed(1),
        loadMs: +tl.toFixed(1),
        totalMs: +((tc1 - tc0) + tl).toFixed(1),
        netFilters: net, extFilters: ext, otherLines: other,
        compiledBytes,
        acceptedCount: snfe.acceptedCount,
        discardedCount: snfe.discardedCount,
    };
}

// Loop the cycle `iters` times. First run is the cold/warmup; the rest measure
// steady-state (where the JIT has had a chance to lower hot functions).
export function bench(rawTexts, iters = 5, opts = {}) {
    const runs = [];
    for ( let i = 0; i < iters; i++ ) {
        runs.push(runOnce(rawTexts, opts));
    }
    return runs;
}

export { compileList, loadCompiled };
