// FIXED 2026-07-13 (regression guard). Was a JIT-only crash under compacting GC
// (GECKO_GCZEAL=14,2): this for-of traps "unreachable" while PBL completes correct.
// REAL root cause = COMPILER GC-safety hole (NOT the runtime iterator theory): on-thread
// WJWarpCompile held raw GC pointers (CompileInfo JSScript* + snapshot-baked shapes) across
// a compaction GC that moved them mid-compile -> EmitValue sc->getShape(pc) OOB. FIX:
// js::gc::AutoSuppressGC over the whole compile (WasmJitWarp.cpp; GECKO_WJ_NOCOMPILESUPPRESSGC
// reverts). Verify: GECKO_GCZEAL=14,2 JIT -> 279000 (== PBL); with the revert flag -> unreachable.
const arr=[3,1,4,1,5,9,2,6];
let acc=0;
for(let iter=0;iter<3000;iter++){ for(const a of arr){ acc=(acc+a*3)|0; } }
print("forof-compaction="+acc);
