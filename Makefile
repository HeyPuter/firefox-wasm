# gecko-wasm build orchestration.
#
#   make firefox    shallow-clone (depth 1) the Gecko engine fork at the pinned commit
#   make vendor     vendor the Rust std deps for -Z build-std (vendor-std-deps.py)
#   make build      build the engine -> obj-full-emscripten/dist/bin/libxul.so (+ -r relink)
#   make configure  force a reconfigure (needed after changing configure inputs outside CONFIGURE_INPUTS, e.g. re-checked-out firefox/)
#   make libxul     build the libxul.js package: engine artifacts + the rspack ESM bundle (default)
#   make embed-demo / make chrome-demo   build the library, then run its Vite demo
#   make run        alias for embed-demo (build + serve the basic embed demo)
#   make web        alias for libxul (back-compat)
#   make clean      remove the libxul.js build outputs
#   make distclean  also remove the objdir and the firefox/ checkout
#
# The runnable build is the libxul.js package + its Vite demos (embed-demo /
# chrome-demo); the old embed-xul/ + embed-chrome/ stub dirs have been removed.
# Prereqs are not installed here (see README.md): emsdk (emscripten 6.0.1; bundles
# binaryen v130), rust 1.95 + rust-src + the wasm32-unknown-emscripten target,
# python3, and node + pnpm (for the libxul.js bundle). The build env vars below
# default sensibly but honor the environment (?=), so CI can override e.g.
# MOZBUILD_STATE_PATH / EM_BINARYEN_ROOT / EMSDK.

ROOT        := $(CURDIR)
FIREFOX_URL := https://github.com/MercuryWorkshop/firefox.git
FIREFOX_REF := e67c6ef55fa342b78ec14824cbef56c4a42f641e

# Pinned, repo-local emscripten. `make emsdk` clones the emsdk meta-repo here,
# installs + activates this version, and applies the WasmFS WISP-socket patches
# so WASMFS=1 builds keep working TCP sockets (patch-emsdk-wasmfs.mjs +
# emsdk-patches/wisp_socket.h). The whole build (engine + libxul.js relink) runs
# against $(EMSDK), exported below. Override EMSDK to reuse an existing install
# (then run `make emsdk` once to patch it -- the patch is idempotent).
EMSDK          ?= $(ROOT)/emsdk
EMSDK_VERSION  ?= 6.0.1
EMSDK_STAMP    := $(EMSDK)/.wisp-patched
WISP_PATCH_SRC := libxul.js/build/patch-emsdk-wasmfs.mjs libxul.js/build/emsdk-patches/wisp_socket.h

EM_CONFIG           ?= $(ROOT)/em_config
MOZCONFIG           ?= $(ROOT)/mozconfig.full.emscripten
MOZBUILD_STATE_PATH ?= $(HOME)/.mozbuild
# RELEASE=1 turns on optimizations: --enable-lto for the engine (mozconfig) and
# -O3 at the emcc relink so wasm-opt's passes run over the final module.
RELEASE             ?=
export EM_CONFIG MOZCONFIG MOZBUILD_STATE_PATH EMSDK
export GECKO_RELEASE := $(RELEASE)

# Engine build output (RELEASE uses its own objdir, matching the mozconfig + the
# libxul.js build script). `libxul` keys off this existing to decide whether a first
# engine build is needed.
OBJDIR := $(ROOT)/obj-full-emscripten$(if $(RELEASE),-release)
LIBXUL := $(OBJDIR)/dist/bin/libxul.so

# The files we treat as "configuration": editing one of these should force a
# reconfigure, anything else should not. `mach build` decides on its own whether
# to re-run configure by comparing config.status against EVERY entry in
# $(OBJDIR)/config_status_deps.in -- 100+ files, almost all of them Gecko's
# mach/mozbuild infra + version stamps, NOT our config. Re-checking out firefox/
# (or any op that bumps those mtimes) then forces a spurious reconfigure. The
# `build` recipe below bumps config.status past that broader list unless one of
# these real inputs actually changed, so only OUR config changes reconfigure.
CONFIGURE_INPUTS := $(MOZCONFIG) $(EM_CONFIG)

.PHONY: all release firefox vendor configure build web run clean distclean \
        libxul embed-demo chrome-demo emsdk

all: libxul

# Pull + install + activate the pinned emsdk locally, then apply the WasmFS
# socket patches. The stamp depends on our patch sources, so editing them
# re-patches (and invalidates the cached libwasmfs so it rebuilds). Installing
# the toolchain downloads ~2GB the first time.
emsdk: $(EMSDK_STAMP)
$(EMSDK_STAMP): $(WISP_PATCH_SRC)
	@if [ ! -x "$(EMSDK)/emsdk" ]; then \
	  echo ">> cloning emsdk -> $(EMSDK)"; \
	  git clone https://github.com/emscripten-core/emsdk.git "$(EMSDK)"; \
	fi
	cd "$(EMSDK)" && ./emsdk install $(EMSDK_VERSION) && ./emsdk activate $(EMSDK_VERSION)
	node libxul.js/build/patch-emsdk-wasmfs.mjs
	@touch "$@"

# Optimized build (engine LTO + wasm-opt). NOTE: toggling RELEASE changes the
# mozconfig (--enable-lto), which forces a full reconfigure + rebuild of libxul.
release:
	$(MAKE) all RELEASE=1

# Pinned shallow clone. GitHub serves arbitrary reachable SHAs, so we fetch the
# exact commit at depth 1 (no submodule, no full history). The firefox/.git guard
# makes this a no-op once the checkout exists; to move the pin, bump FIREFOX_REF
# and `rm -rf firefox` (or `make distclean`).
firefox: firefox/.git
firefox/.git:
	git init -q firefox
	git -C firefox remote add origin $(FIREFOX_URL) 2>/dev/null || true
	git -C firefox fetch --depth 1 origin $(FIREFOX_REF)
	git -C firefox checkout -q --detach FETCH_HEAD
	@echo ">> firefox at $$(git -C firefox rev-parse --short HEAD)"

vendor: firefox
	python3 vendor-std-deps.py

build: firefox vendor $(EMSDK_STAMP)
	@# Keep mach from reconfiguring on unrelated mtime changes: if none of our
	@# CONFIGURE_INPUTS are newer than config.status, touch it so it stays newer
	@# than everything in config_status_deps.in (mach then skips configure). If a
	@# real config input IS newer, leave config.status alone so mach reconfigures.
	@if [ -f "$(OBJDIR)/config.status" ]; then \
	  changed=$$(find $(CONFIGURE_INPUTS) -newer "$(OBJDIR)/config.status" 2>/dev/null); \
	  if [ -n "$$changed" ]; then \
	    echo ">> config input changed, mach will reconfigure:"; echo "$$changed"; \
	  else \
	    touch "$(OBJDIR)/config.status"; \
	  fi; \
	fi
	@# emscripten 6.0.x: the first `mach build` compiles everything but FAILS at the
	@# libxul.so `-shared` link (wasm-ld SIGSEGVs in the ElemSection writer on the huge
	@# module). relink-engine-r.sh relinks libxul/libnss3/libgkcodecs as `-r` relocatable
	@# objects (also required so the embedder static-links them instead of treating them
	@# as dynamic side modules); a second `mach build` then skips the up-to-date link and
	@# finishes the resource/chrome tiers. (|| true masks only the expected link failure;
	@# any real error resurfaces in the second build.)
	cd firefox && ./mach build || true
	bash libxul.js/build/relink-engine-r.sh
	cd firefox && ./mach build

# Force a reconfigure. Needed when you change something configure inspects that
# isn't in CONFIGURE_INPUTS (e.g. after re-checking out firefox/): `build` above
# only reconfigures when $(CONFIGURE_INPUTS) change, so use this otherwise.
configure: firefox vendor $(EMSDK_STAMP)
	cd firefox && ./mach configure

# Back-compat alias: the old embed-xul web build was removed; the web build IS the
# libxul.js package now.
web: libxul

# Build + serve the basic embed demo (Vite dev server with COOP/COEP + a WISP proxy).
run: embed-demo

# --- libxul.js library + demos (pnpm monorepo) -----------------------------
# Build the libxul.js package (the default `all` target): the engine artifacts
# (build/build-lib.sh stages a MINIMAL gre-stage -> gecko.{js,wasm,data,worker.js})
# + the rspack ESM bundle. Builds the engine (libxul.so) first if there isn't one.
libxul: $(EMSDK_STAMP)
	@test -e "$(LIBXUL)" || $(MAKE) build
	pnpm install
	pnpm --filter libxul.js run build

# Run the Vite demos (build the library first). `embed-demo` is the basic
# embed-a-web-page demo; `chrome-demo` supplies the Firefox front-end files.
embed-demo: libxul
	pnpm --filter embed-demo dev
chrome-demo: libxul
	pnpm --filter chrome-demo dev

clean:
	rm -f  libxul.js/wasm/gecko.js libxul.js/wasm/gecko.wasm libxul.js/wasm/gecko.data \
	       libxul.js/wasm/gecko.worker.js libxul.js/wasm/gecko.debug.wasm \
	       libxul.js/wasm/gecko.wasm.zst libxul.js/wasm/gecko.data.zst \
	       libxul.js/wasm/gecko-assets.json \
	       libxul.js/build/*.stripped.so libxul.js/build/*.o libxul.js/build/link.err
	rm -rf libxul.js/build/gre-stage libxul.js/dist

distclean: clean
	rm -rf obj-full-emscripten obj-full-emscripten-release firefox
