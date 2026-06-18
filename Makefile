# gecko-wasm build orchestration.
#
#   make firefox    shallow-clone (depth 1) the Gecko engine fork at the pinned commit
#   make vendor     vendor the Rust std deps for -Z build-std (vendor-std-deps.py)
#   make build      build the engine -> obj-full-emscripten/dist/bin/libxul.so (auto-configures)
#   make configure  force a reconfigure (rarely needed; `build` does it automatically)
#   make web        stage GRE + relink the web build (builds the engine only if none yet)
#   make all        firefox -> vendor -> (build if needed) -> web   (default)
#   make run        serve the web build (server.cjs)
#   make clean      remove the web build outputs
#   make distclean  also remove the objdir and the firefox/ checkout
#
# Prereqs are not installed here (see README.md): emsdk, a system binaryen >= v129,
# rust 1.95 + rust-src + the wasm32-unknown-emscripten target, python3.
# The build env vars below default sensibly but honor the environment (?=), so CI
# can override e.g. MOZBUILD_STATE_PATH / EM_BINARYEN_ROOT.

ROOT        := $(CURDIR)
FIREFOX_URL := https://github.com/MercuryWorkshop/firefox.git
FIREFOX_REF := fc436df4000a5422af0a0ebb054182b9f9055102

EM_CONFIG           ?= $(ROOT)/em_config
MOZCONFIG           ?= $(ROOT)/mozconfig.full.emscripten
MOZBUILD_STATE_PATH ?= $(HOME)/.mozbuild
# RELEASE=1 turns on optimizations: --enable-lto for the engine (mozconfig) and
# -O3 at the emcc relink so wasm-opt's passes run over the final module.
RELEASE             ?=
# ST=1 builds an EXPERIMENTAL single-threaded engine: NO emscripten pthreads
# anywhere (no -pthread, no Rust build-std +atomics, no PROXY_TO_PTHREAD). It uses
# its OWN objdir (obj-full-emscripten-st) so it never disturbs the threaded cache,
# and ST takes precedence over RELEASE (the experiment is a debug build).
ST                  ?=
# STJ=1 (single-threaded JSPI) builds the engine with the wasm atomics TLS segment
# (-matomics, build-std +atomics) but NO -pthread: it runs on ONE OS thread with JSPI
# cooperative fibers and per-fiber TLS via region save/restore, NO SharedArrayBuffer
# (the final embedder link adds --shared-memory to emit the TLS segment, then patches
# the memory non-shared). Own objdir obj-full-emscripten-stj. See [[singlethread-tls]].
STJ                 ?=
export EM_CONFIG MOZCONFIG MOZBUILD_STATE_PATH
export GECKO_RELEASE := $(RELEASE)
export GECKO_ST := $(ST)
export GECKO_STJ := $(STJ)

# Engine build output (RELEASE/ST/STJ each use their own objdir, matching the mozconfig
# + embed scripts). `web` keys off libxul existing to decide whether a first build
# is needed. STJ wins over ST wins over RELEASE.
OBJDIR := $(ROOT)/obj-full-emscripten$(if $(STJ),-stj,$(if $(ST),-st,$(if $(RELEASE),-release)))
LIBXUL := $(OBJDIR)/dist/bin/libxul.so

.PHONY: all release single firefox vendor configure build web run clean distclean

all: web

# Optimized build (engine LTO + wasm-opt). NOTE: toggling RELEASE changes the
# mozconfig (--enable-lto), which forces a full reconfigure + rebuild of libxul.
release:
	$(MAKE) all RELEASE=1

# Experimental single-threaded engine + node embedder (see ST above). This is a
# probe: build the whole engine with zero pthreads in obj-full-emscripten-st, then
# link a node smoke embedder (embed-xul/build-embed-st.sh) and run it.
single:
	$(MAKE) build ST=1
	ST=1 bash embed-xul/build-embed-st.sh

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

build: firefox vendor
	cd firefox && ./mach build

# Force a reconfigure. Rarely needed: `mach build` (above) already auto-configures
# a fresh objdir and re-runs configure whenever the mozconfig changes.
configure: firefox vendor
	cd firefox && ./mach configure

# `web` REUSES an existing engine build: it runs `mach build` only when there's no
# libxul yet (first time / fresh objdir). To rebuild the engine deliberately, run
# `make build` (then `make web`).
web:
	@test -e "$(LIBXUL)" || $(MAKE) build
	bash embed-xul/stage-gre.sh
	bash embed-xul/restrip-relink-web.sh

run:
	node embed-xul/server.cjs

clean:
	rm -f  embed-xul/gecko.js embed-xul/gecko.wasm embed-xul/gecko.data \
	       embed-xul/gecko.worker.js embed-xul/*.stripped.so embed-xul/*.o \
	       embed-xul/gecko.wasm.zst embed-xul/gecko.data.zst embed-xul/gecko-assets.json
	rm -rf embed-xul/gre-stage

distclean: clean
	rm -rf obj-full-emscripten obj-full-emscripten-release firefox
