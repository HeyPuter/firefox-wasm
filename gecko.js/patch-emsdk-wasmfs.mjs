#!/usr/bin/env node
// Patch a (pinned, repo-local) emsdk's WasmFS so WASMFS=1 builds keep working
// TCP sockets. Stock WasmFS stubs every socket syscall to -ENOSYS and its poll()
// never blocks; this installs the WISP socket backend (wisp_socket.h) below the
// syscall line and rewires syscalls.cpp + file.h to use it. See wisp_socket.h.
//
// Idempotent: re-running on an already-patched tree is a no-op. Run by the
// Makefile `emsdk` target after install/activate.
//
// usage: patch-emsdk-wasmfs.mjs [<emscripten-root>]
//        (defaults to $EMSDK/upstream/emscripten)
import { readFileSync, writeFileSync, copyFileSync, existsSync, readdirSync, rmSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const EM = process.argv[2] ||
  (process.env.EMSDK ? join(process.env.EMSDK, 'upstream', 'emscripten') : null);
if (!EM || !existsSync(EM)) {
  console.error('patch-emsdk-wasmfs: emscripten root not found (set $EMSDK or pass it as arg1): ' + EM);
  process.exit(1);
}
const WASMFS = join(EM, 'system', 'lib', 'wasmfs');
if (!existsSync(WASMFS)) {
  console.error('patch-emsdk-wasmfs: ' + WASMFS + ' missing -- is this emscripten 6.0.x with WasmFS?');
  process.exit(1);
}

// Restore the file from its pristine .orig (created on first patch). This makes
// the patcher idempotent AND correct when patches are removed/changed: every run
// starts from the unpatched source and re-applies only the CURRENT edits.
function edit(file, label, fn) {
  const orig = file + '.wisp-orig';
  if (existsSync(orig)) {
    copyFileSync(orig, file); // reset to pristine
  } else {
    copyFileSync(file, orig); // first run: snapshot pristine
  }
  const before = readFileSync(file, 'utf8');
  const after = fn(before);
  if (after === before) { console.log('patch-emsdk-wasmfs: ' + label + ' (no change)'); return; }
  writeFileSync(file, after);
  console.log('patch-emsdk-wasmfs: applied ' + label);
}
function must(haystack, needle, label) {
  if (!haystack.includes(needle)) {
    console.error('patch-emsdk-wasmfs: anchor not found for ' + label + ' -- emscripten layout changed; update this patch.\n  missing: ' + JSON.stringify(needle.slice(0, 80)));
    process.exit(1);
  }
}

// --- 1. install the backend headers ---------------------------------------
copyFileSync(join(HERE, 'emsdk-patches', 'wisp_socket.h'), join(WASMFS, 'wisp_socket.h'));
copyFileSync(join(HERE, 'emsdk-patches', 'provider_backend.h'), join(WASMFS, 'provider_backend.h'));
console.log('patch-emsdk-wasmfs: installed wisp_socket.h + provider_backend.h');

// --- 2. file.h: forward-declare wisp::SocketFile + add the asSocket() hook -
edit(join(WASMFS, 'file.h'), 'file.h asSocket hook', (s) => {
  if (!s.includes('namespace wisp { class SocketFile; }')) {
    must(s, 'class Symlink;', 'file.h forward decls');
    s = s.replace('class Symlink;', 'class Symlink;\nnamespace wisp { class SocketFile; }');
  }
  if (!s.includes('virtual wisp::SocketFile* asSocket()')) {
    must(s, 'bool isSeekable() const { return seekable; }', 'file.h File::isSeekable');
    s = s.replace(
      'bool isSeekable() const { return seekable; }',
      'bool isSeekable() const { return seekable; }\n\n' +
      '  // WISP sockets: a socket file returns itself; all others return null.\n' +
      '  // Lets the socket syscalls + poll() recover the typed object from an fd\n' +
      '  // without unsafe casts. See wisp_socket.h.\n' +
      '  virtual wisp::SocketFile* asSocket() { return nullptr; }');
  }
  return s;
});

// --- 3. syscalls.cpp: include + socket forwarders + blocking poll ---------
edit(join(WASMFS, 'syscalls.cpp'), 'syscalls.cpp WISP sockets', (s) => {
  if (!s.includes('#include "wisp_socket.h"')) {
    must(s, '#include "wasmfs.h"', 'syscalls.cpp includes');
    s = s.replace('#include "wasmfs.h"', '#include "wasmfs.h"\n#include "wisp_socket.h"');
  }
  if (!s.includes('#include "provider_backend.h"')) {
    must(s, '#include "wisp_socket.h"', 'syscalls.cpp wisp include');
    s = s.replace('#include "wisp_socket.h"',
                  '#include "wisp_socket.h"\n#include "provider_backend.h"');
  }

  // Replace each ENOSYS socket stub body with a one-line forwarder. Each stub's
  // full signature is unique, so these matches are unambiguous.
  const stub = (sig, call) => {
    const from = sig + ' {\n  return -ENOSYS;\n}';
    const to = sig + ' {\n  return ' + call + ';\n}';
    if (s.includes(to)) return; // already done
    must(s, from, 'socket stub ' + call);
    s = s.replace(from, to);
  };
  stub('int __syscall_socket(\n  int domain, int type, int protocol, int dummy1, int dummy2, int dummy3)',
       'wasmfs::wisp::do_socket(domain, type, protocol)');
  stub('int __syscall_connect(\n  int sockfd, intptr_t addr, socklen_t len, int dummy, int dummy2, int dummy3)',
       'wasmfs::wisp::do_connect(sockfd, addr, len)');
  stub('int __syscall_getsockopt(int sockfd,\n                         int level,\n                         int optname,\n                         intptr_t optval,\n                         intptr_t optlen,\n                         int dummy)',
       'wasmfs::wisp::do_getsockopt(sockfd, level, optname, optval, optlen)');
  stub('int __syscall_getsockname(\n  int sockfd, intptr_t addr, intptr_t len, int dummy, int dummy2, int dummy3)',
       'wasmfs::wisp::do_getsockname(sockfd, addr, len)');
  stub('int __syscall_getpeername(\n  int sockfd, intptr_t addr, intptr_t len, int dummy, int dummy2, int dummy3)',
       'wasmfs::wisp::do_getpeername(sockfd, addr, len)');
  stub('int __syscall_sendto(int sockfd,\n                     intptr_t msg,\n                     size_t len,\n                     int flags,\n                     intptr_t addr,\n                     socklen_t alen)',
       'wasmfs::wisp::do_sendto(sockfd, msg, len, flags, addr, alen)');
  stub('int __syscall_sendmsg(\n  int sockfd, intptr_t msg, int flags, intptr_t addr, size_t alen, int dummy)',
       'wasmfs::wisp::do_sendmsg(sockfd, msg, flags)');
  stub('int __syscall_recvfrom(int sockfd,\n                       intptr_t msg,\n                       size_t len,\n                       int flags,\n                       intptr_t addr,\n                       intptr_t alen)',
       'wasmfs::wisp::do_recvfrom(sockfd, msg, len, flags, addr, alen)');
  stub('int __syscall_recvmsg(\n  int sockfd, intptr_t msg, int flags, int dummy, int dummy2, int dummy3)',
       'wasmfs::wisp::do_recvmsg(sockfd, msg, flags)');

  // Replace the whole non-blocking __syscall_poll body with the WISP version
  // (scan + futex block). select() rides on poll() in musl, so this is enough.
  if (!s.includes('wasmfs::wisp::poll_impl')) {
    const POLL_RE = /int __syscall_poll\(intptr_t fds_, nfds_t nfds, int timeout\) \{[\s\S]*?\n  return nonzero;\n\}/;
    if (!POLL_RE.test(s)) {
      console.error('patch-emsdk-wasmfs: could not find __syscall_poll body -- update this patch.');
      process.exit(1);
    }
    s = s.replace(POLL_RE,
      'int __syscall_poll(intptr_t fds_, nfds_t nfds, int timeout) {\n' +
      '  return wasmfs::wisp::poll_impl(fds_, nfds, timeout);\n}');
  }
  return s;
});

// --- 4. wasmfs.cpp: create /dev/shm (writable) at FS init -----------------
// Gecko's IPC shared memory (SharedStringMap string bundles, shared prefs, ...)
// uses shm_open(), which musl resolves under /dev/shm. The legacy emscripten FS
// pre-created /dev/shm; WasmFS does not, and its /dev is mode 0555 so it can't be
// mkdir'd from user code (EACCES) -> shm_open ENOENT -> SharedStringMap's
// MOZ_RELEASE_ASSERT -> RuntimeError unreachable. Insert /dev/shm here (the C++
// insertDirectory bypasses the mode check), mirroring how /tmp is created.
edit(join(WASMFS, 'wasmfs.cpp'), 'wasmfs.cpp /dev/shm', (s) => {
  if (s.includes('insertDirectory("shm"')) return s;
  const anchor = '    lockedDev.mountChild("urandom", SpecialFiles::getURandom());\n  }';
  must(s, anchor, 'wasmfs.cpp /dev block');
  return s.replace(anchor,
    '    lockedDev.mountChild("urandom", SpecialFiles::getURandom());\n' +
    '    // /dev/shm: writable in-memory dir for shm_open() (Gecko IPC shared\n' +
    '    // memory). Inserted programmatically since /dev itself is 0555. See\n' +
    '    // wisp_socket.h\'s sibling patches.\n' +
    '    lockedDev.insertDirectory("shm", S_IRWXUGO);\n  }');
});

// --- 4b. libpthread.js: synthesize the OFFSCREENCANVASES_TO_PTHREAD decoy -----
// The build sets -sOFFSCREENCANVASES_TO_PTHREAD=#gldummy so the proxied main()
// pthread is handed a THROWAWAY canvas (crt1_proxy_main.c passes the -1 token),
// instead of emscripten's default of auto-transferring the real Module.canvas
// (#screen). That keeps #screen a normal element on the browser main thread (the
// GPU compositor needs it there). Stock emscripten requires that decoy to exist as
// a DOM <canvas> or pthread_create aborts EINVAL -- forcing the embedder to inject a
// hidden 1x1 <canvas id=gldummy>. Patch the not-found branch to synthesize a
// standalone OffscreenCanvas instead, so no DOM element is needed. JS libraries are
// re-processed every link, so no cache to clear. (Note: this is the {{{...}}}-macro
// source consumed by the JS compiler; the macros match the real path just above it.)
edit(join(EM, 'src', 'lib', 'libpthread.js'), 'libpthread.js gldummy decoy', (s) => {
  if (s.includes('gecko-wasm: synthesize a standalone decoy')) return s;
  const anchor =
    "          var canvas = (Module['canvas'] && Module['canvas'].id === name) ? Module['canvas'] : document.querySelector(name);\n" +
    "          if (!canvas) {\n" +
    "            err(`pthread_create: could not find canvas with ID \"${name}\" to transfer to thread!`);\n" +
    "            error = {{{ cDefs.EINVAL }}};\n" +
    "            break;\n" +
    "          }";
  must(s, anchor, 'libpthread.js !canvas decoy block');
  const repl =
    "          var canvas = (Module['canvas'] && Module['canvas'].id === name) ? Module['canvas'] : document.querySelector(name);\n" +
    "          if (!canvas) {\n" +
    "            // gecko-wasm: synthesize a standalone decoy OffscreenCanvas. The canvas\n" +
    "            // named in OFFSCREENCANVASES_TO_PTHREAD exists only to be transferred to\n" +
    "            // the proxied main() pthread INSTEAD of the real Module.canvas, so it need\n" +
    "            // not exist in the DOM -- create a 1x1 OffscreenCanvas directly (no\n" +
    "            // throwaway <canvas> element required). See patch-emsdk-wasmfs.mjs.\n" +
    "            var oc = new OffscreenCanvas(1, 1);\n" +
    "            oc.id = name.replace(/^#/, '');\n" +
    "            var sp = _malloc({{{ 8 + POINTER_SIZE }}});\n" +
    "            {{{ makeSetValue('sp', 0, '1', 'i32') }}};\n" +
    "            {{{ makeSetValue('sp', 4, '1', 'i32') }}};\n" +
    "            {{{ makeSetValue('sp', 8, 0, '*') }}};\n" +
    "            offscreenCanvasInfo = { offscreenCanvas: oc, canvasSharedPtr: sp, id: oc.id };\n" +
    "            transferList.push(oc);\n" +
    "            offscreenCanvases[oc.id] = offscreenCanvasInfo;\n" +
    "            continue;\n" +
    "          }";
  return s.replace(anchor, repl);
});

// --- 5. invalidate the cached libwasmfs so it rebuilds from patched source -
const cacheLib = join(EM, 'cache', 'sysroot', 'lib', 'wasm32-emscripten');
let removed = 0;
if (existsSync(cacheLib)) {
  for (const f of readdirSync(cacheLib)) {
    if (/^libwasmfs.*\.a$/.test(f)) { rmSync(join(cacheLib, f)); removed++; }
  }
}
console.log('patch-emsdk-wasmfs: cleared ' + removed + ' cached libwasmfs archive(s); they rebuild on next link');
console.log('patch-emsdk-wasmfs: done');
