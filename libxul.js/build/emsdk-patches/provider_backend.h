// Provider-backed WasmFS backend (persistent /profile, async FsProvider).
//
// A path-based, whole-file backend whose storage is the consumer's async
// FsProvider (default: OPFS). Unlike WasmFS's OPFS backend (ranged access
// handles on a dedicated worker), this matches libxul.js's whole-file provider
// API (stat/readFile/writeFile/readdir/mkdir/unlink/rename) and proxies I/O to
// the runtime MAIN thread R -- because a consumer's FsProvider is an ordinary JS
// object living on R (only the built-in OPFS provider could run on a worker).
//
// Per file: materialize-on-open (one async readFile into an in-memory buffer),
// then read/write hit the buffer LOCALLY on the calling thread (no proxy), and
// flush-on-close/sync writes the whole buffer back. Per directory: getChild ->
// stat, insert* -> create/mkdir, removeChild -> unlink, insertMove -> rename,
// getEntries -> readdir. Each File/Directory carries its mount-relative path
// (WasmFS resolves component-by-component; we accumulate). WasmFS's dcache means
// getChild only fires on a cache miss and freshly-inserted files are cached
// until flushed, so no eager provider writes are needed.
//
// Correctness under WasmFS: the FS syscall runs on the calling Gecko worker and
// holds WasmFS's locks throughout; we proxy only the async I/O to R and block
// the worker (Atomics) until proxy_finish. R doing the I/O does not break FS
// atomicity (the FS logic + locks stay on the worker) -- this is the key
// difference from the old legacy-FS async-on-R hack.
//
// Installed by patch-emsdk-wasmfs.mjs + #included by syscalls.cpp (compiled into
// libwasmfs). The JS hooks (provider_*) are resolved at final link from
// build/provider-fs.js (--js-library). mountId selects the consumer provider
// (Module.geckoProviders[mountId]).

#pragma once

#include <cstdint>
#include <cstdlib>
#include <cstring>
#include <functional>
#include <memory>
#include <mutex>
#include <set>
#include <string>
#include <vector>

#include <errno.h>

#include <emscripten/proxying.h>
#include <emscripten/threading.h>

#include "backend.h"
#include "file.h"
#include "wasmfs.h"

namespace wasmfs {
namespace provider {

// JS hooks (provider-fs.js). First arg is the proxying ctx (proxy_finish on
// completion). All run on R. Paths are mount-relative, NUL-terminated UTF-8.
extern "C" {
void provider_stat(em_proxying_ctx* ctx, int mountId, const char* path,
                   int* outExists, int* outIsDir, int64_t* outSize);
// On hit: *outPtr = malloc'd heap buffer (caller frees), *outLen = length.
// On miss/error: *outPtr = 0, *outErr = -errno.
void provider_read(em_proxying_ctx* ctx, int mountId, const char* path,
                   uint8_t** outPtr, int* outLen, int* outErr);
void provider_write(em_proxying_ctx* ctx, int mountId, const char* path,
                    const uint8_t* data, int len, int* outErr);
void provider_readdir(em_proxying_ctx* ctx, int mountId, const char* path,
                      void* entriesVec, int* outErr);
void provider_mkdir(em_proxying_ctx* ctx, int mountId, const char* path,
                    int* outErr);
void provider_unlink(em_proxying_ctx* ctx, int mountId, const char* path,
                     int* outErr);
void provider_rename(em_proxying_ctx* ctx, int mountId, const char* from,
                     const char* to, int* outErr);
}

// Proxies a ctx-taking thunk to the runtime main thread and blocks until the
// async JS hook calls proxy_finish. (FS ops originate on Gecko worker threads
// under PROXY_TO_PTHREAD, never on R, so this never self-proxies.)
class MainProxy {
  emscripten::ProxyingQueue queue;
  pthread_t target;

public:
  MainProxy() : target(emscripten_main_runtime_thread_id()) {}
  void operator()(const std::function<void(emscripten::ProxyingQueue::ProxyingCtx)>& f) {
    queue.proxySyncWithCtx(target, f);
  }
};

class ProviderFile : public DataFile {
public:
  int mountId;
  std::string path;
  MainProxy& proxy;

  ProviderFile(mode_t mode, backend_t backend, int mountId, std::string path,
               MainProxy& proxy)
    : DataFile(mode, backend), mountId(mountId), path(std::move(path)),
      proxy(proxy) {}

private:
  std::vector<uint8_t> buffer;
  bool loaded = false;
  bool dirty = false;

  // Async-fetch the whole file into `buffer` once. A provider miss leaves an
  // empty buffer (e.g. a just-created file) -- not an error.
  void materialize() {
    if (loaded) return;
    uint8_t* p = nullptr;
    int n = 0, err = 0;
    proxy([&](auto ctx) {
      provider_read(ctx.ctx, mountId, path.c_str(), &p, &n, &err);
    });
    if (p && n > 0) {
      buffer.assign(p, p + n);
    }
    if (p) free(p);
    loaded = true;
  }

  int open(oflags_t) override {
    materialize();
    return 0;
  }
  int close() override { return flush(); }

  ssize_t read(uint8_t* buf, size_t len, off_t offset) override {
    materialize();
    if ((size_t)offset >= buffer.size()) return 0;
    size_t n = buffer.size() - offset;
    if (n > len) n = len;
    memcpy(buf, buffer.data() + offset, n);
    return (ssize_t)n;
  }

  ssize_t write(const uint8_t* buf, size_t len, off_t offset) override {
    materialize();
    if (offset + len > buffer.size()) buffer.resize(offset + len, 0);
    memcpy(buffer.data() + offset, buf, len);
    dirty = true;
    return (ssize_t)len;
  }

  int flush() override {
    if (!dirty) return 0;
    int err = 0;
    proxy([&](auto ctx) {
      provider_write(ctx.ctx, mountId, path.c_str(), buffer.data(),
                     (int)buffer.size(), &err);
    });
    if (err) return -EIO;
    dirty = false;
    return 0;
  }

  off_t getSize() override {
    if (loaded) return (off_t)buffer.size();
    int exists = 0, isDir = 0;
    int64_t size = 0;
    proxy([&](auto ctx) {
      provider_stat(ctx.ctx, mountId, path.c_str(), &exists, &isDir, &size);
    });
    return exists ? (off_t)size : 0;
  }

  int setSize(off_t size) override {
    materialize();
    buffer.resize(size, 0);
    dirty = true;
    return 0;
  }
};

class ProviderDirectory : public Directory {
public:
  int mountId;
  std::string path; // mount-relative; "" for the mount root
  MainProxy& proxy;

  ProviderDirectory(mode_t mode, backend_t backend, int mountId,
                    std::string path, MainProxy& proxy)
    : Directory(mode, backend), mountId(mountId), path(std::move(path)),
      proxy(proxy) {}

private:
  std::string childPath(const std::string& name) const {
    return path.empty() ? name : path + "/" + name;
  }

  std::shared_ptr<File> getChild(const std::string& name) override {
    auto cp = childPath(name);
    int exists = 0, isDir = 0;
    int64_t size = 0;
    proxy([&](auto ctx) {
      provider_stat(ctx.ctx, mountId, cp.c_str(), &exists, &isDir, &size);
    });
    if (!exists) return nullptr;
    if (isDir) {
      return std::make_shared<ProviderDirectory>(0777, getBackend(), mountId,
                                                 cp, proxy);
    }
    return std::make_shared<ProviderFile>(0666, getBackend(), mountId, cp,
                                          proxy);
  }

  std::shared_ptr<DataFile> insertDataFile(const std::string& name,
                                           mode_t mode) override {
    // Created lazily: the empty file lives in the dcache and is persisted on the
    // first flush (write + close). No provider call here.
    return std::make_shared<ProviderFile>(mode, getBackend(), mountId,
                                          childPath(name), proxy);
  }

  std::shared_ptr<Directory> insertDirectory(const std::string& name,
                                             mode_t mode) override {
    auto cp = childPath(name);
    int err = 0;
    proxy([&](auto ctx) {
      provider_mkdir(ctx.ctx, mountId, cp.c_str(), &err);
    });
    if (err) return nullptr;
    return std::make_shared<ProviderDirectory>(mode, getBackend(), mountId, cp,
                                               proxy);
  }

  std::shared_ptr<Symlink> insertSymlink(const std::string&,
                                         const std::string&) override {
    return nullptr; // symlinks not supported
  }

  int insertMove(const std::string& name, std::shared_ptr<File> file) override {
    // All files in this backend are ProviderFile/ProviderDirectory, so the
    // kind-based cast is safe (avoids RTTI; matches the OPFS backend style).
    std::string from;
    if (file->is<DataFile>()) {
      auto f = std::static_pointer_cast<ProviderFile>(file);
      from = f->path;
      f->path = childPath(name);
    } else if (file->is<Directory>()) {
      auto d = std::static_pointer_cast<ProviderDirectory>(file);
      from = d->path;
      d->path = childPath(name);
    } else {
      return -EXDEV;
    }
    auto to = childPath(name);
    int err = 0;
    proxy([&](auto ctx) {
      provider_rename(ctx.ctx, mountId, from.c_str(), to.c_str(), &err);
    });
    return err ? -EIO : 0;
  }

  int removeChild(const std::string& name) override {
    auto cp = childPath(name);
    int err = 0;
    proxy([&](auto ctx) {
      provider_unlink(ctx.ctx, mountId, cp.c_str(), &err);
    });
    return err ? -EIO : 0;
  }

  ssize_t getNumEntries() override {
    auto entries = getEntries();
    if (int err = entries.getError()) return err;
    return entries->size();
  }

  Directory::MaybeEntries getEntries() override {
    std::vector<Directory::Entry> entries;
    int err = 0;
    proxy([&](auto ctx) {
      provider_readdir(ctx.ctx, mountId, path.c_str(), &entries, &err);
    });
    if (err) return {-EIO};
    return {entries};
  }
};

class ProviderBackend : public Backend {
public:
  int mountId;
  MainProxy proxy;

  explicit ProviderBackend(int mountId) : mountId(mountId) {}

  std::shared_ptr<DataFile> createFile(mode_t mode) override {
    return nullptr; // raw files need a parent directory (as in the OPFS backend)
  }
  std::shared_ptr<Directory> createDirectory(mode_t mode) override {
    return std::make_shared<ProviderDirectory>(mode, this, mountId, "", proxy);
  }
  std::shared_ptr<Symlink> createSymlink(std::string) override {
    return nullptr;
  }
};

} // namespace provider
} // namespace wasmfs

extern "C" {

// Mount entry (called from JS: Module._wasmfs_create_provider_backend(id), then
// FS.mount). mountId selects Module.geckoProviders[mountId] in provider-fs.js.
wasmfs::backend_t wasmfs_create_provider_backend(int mountId) {
  return wasmfs::wasmFS.addBackend(
    std::make_unique<wasmfs::provider::ProviderBackend>(mountId));
}


// readdir callback: provider-fs.js calls this once per entry.
void EMSCRIPTEN_KEEPALIVE provider_record_entry(void* entriesVec,
                                                const char* name, int isDir) {
  auto* entries = static_cast<std::vector<wasmfs::Directory::Entry>*>(entriesVec);
  entries->push_back({name,
                      isDir ? wasmfs::File::DirectoryKind
                            : wasmfs::File::DataFileKind,
                      0});
}

} // extern "C"
