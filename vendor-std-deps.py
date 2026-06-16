#!/usr/bin/env python3
"""Vendor the Rust standard library's dependency crates into
firefox/third_party/rust/ for the wasm32-unknown-emscripten `-Z build-std` build.

These crates (dlmalloc, wasi, unwinding, addr2line, hashbrown, the per-target
backends, ...) are std's own dependencies, NOT Firefox source, so they're
gitignored. A plain `cargo vendor` of std's workspace doesn't work (std uses the
rustc-std-workspace-* shims), so we vendor each dep directly from rust-src's
`library/Cargo.lock`: locate or download its .crate, verify the package checksum
against the lock, extract it, and write a cargo-vendor .cargo-checksum.json.

Idempotent: skips any crate already present (as `<name>-<ver>/`, or as Gecko's
own unsuffixed `<name>/` when the version matches — so it never touches the
committed, patched crates). Run with --dry-run to just report present/missing.

Prereqs: `rustup component add rust-src`. Run from the repo root.
"""
import re, os, sys, json, hashlib, urllib.request, tarfile, glob, subprocess, tempfile

DRY = "--dry-run" in sys.argv

REPO = os.path.dirname(os.path.abspath(__file__))
SYSROOT = subprocess.check_output(["rustc", "--print", "sysroot"]).decode().strip()
LOCK = os.path.join(SYSROOT, "lib/rustlib/src/rust/library/Cargo.lock")
VENDOR = os.path.join(REPO, "firefox/third_party/rust")
CACHES = glob.glob(os.path.expanduser("~/.cargo/registry/cache/*/"))

if not os.path.isfile(LOCK):
    sys.exit(f"rust-src Cargo.lock not found at {LOCK}\n"
             f"run: rustup component add rust-src")

def sha256(p):
    h = hashlib.sha256()
    with open(p, "rb") as f:
        for c in iter(lambda: f.read(1 << 16), b""):
            h.update(c)
    return h.hexdigest()

def version_of(crate_dir):
    ct = os.path.join(crate_dir, "Cargo.toml")
    if not os.path.isfile(ct):
        return None
    m = re.search(r'(?m)^version\s*=\s*"([^"]+)"',
                  open(ct, encoding="utf-8", errors="ignore").read())
    return m.group(1) if m else None

# [[package]] blocks that come from the crates.io registry (have a checksum).
txt = open(LOCK).read()
blocks = re.findall(
    r'\[\[package\]\]\nname = "([^"]+)"\nversion = "([^"]+)"\n'
    r'source = "(registry\+[^"]*)"\nchecksum = "([0-9a-f]+)"', txt)

tmp = tempfile.mkdtemp()
done = skip = fail = missing = 0
for name, ver, _src, csum in blocks:
    cv = f"{name}-{ver}"
    tgt = os.path.join(VENDOR, cv)
    unsuffixed = os.path.join(VENDOR, name)
    if os.path.isdir(tgt) or (os.path.isdir(unsuffixed) and version_of(unsuffixed) == ver):
        skip += 1
        continue
    if DRY:
        print("MISSING", cv)
        missing += 1
        continue
    crate = next((os.path.join(c, f"{cv}.crate")
                  for c in CACHES if os.path.isfile(os.path.join(c, f"{cv}.crate"))), None)
    if not crate:
        crate = os.path.join(tmp, f"{cv}.crate")
        try:
            urllib.request.urlretrieve(
                f"https://static.crates.io/crates/{name}/{cv}.crate", crate)
        except Exception as e:
            print("DOWNLOAD-FAIL", cv, e); fail += 1; continue
    if sha256(crate) != csum:
        print("CHECKSUM-MISMATCH", cv); fail += 1; continue
    try:
        with tarfile.open(crate) as t:
            t.extractall(VENDOR)
    except Exception as e:
        print("EXTRACT-FAIL", cv, e); fail += 1; continue
    files = {}
    for root, _, fns in os.walk(tgt):
        for fn in fns:
            fp = os.path.join(root, fn)
            rel = os.path.relpath(fp, tgt)
            if rel == ".cargo-checksum.json":
                continue
            files[rel] = sha256(fp)
    json.dump({"files": files, "package": csum},
              open(os.path.join(tgt, ".cargo-checksum.json"), "w"),
              separators=(",", ":"))
    done += 1
    print("vendored", cv)

if DRY:
    print(f"\n[dry-run] registry deps in std Cargo.lock={len(blocks)} "
          f"present={skip} missing={missing}")
else:
    print(f"\nvendored={done} skipped(present)={skip} failed={fail}")
