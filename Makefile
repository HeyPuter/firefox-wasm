# gecko-wasm build orchestration.
#
#   make firefox    shallow-clone (depth 1) the Gecko engine fork at the pinned commit
#   make vendor     vendor the Rust std deps for -Z build-std (vendor-std-deps.py)
#   make build      build the engine -> obj-full-emscripten/dist/bin/libxul.so (reconfigures only if CONFIGURE_INPUTS changed)
#   make configure  force a reconfigure (needed after changing configure inputs outside CONFIGURE_INPUTS, e.g. re-checked-out firefox/)
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
FIREFOX_REF := ba474b338b2056a20c764dbe5ec10106810ddccf

EM_CONFIG           ?= $(ROOT)/em_config
MOZCONFIG           ?= $(ROOT)/mozconfig.full.emscripten
MOZBUILD_STATE_PATH ?= $(HOME)/.mozbuild
# RELEASE=1 turns on optimizations: --enable-lto for the engine (mozconfig) and
# -O3 at the emcc relink so wasm-opt's passes run over the final module.
RELEASE             ?=
export EM_CONFIG MOZCONFIG MOZBUILD_STATE_PATH
export GECKO_RELEASE := $(RELEASE)

# Engine build output (RELEASE uses its own objdir, matching the mozconfig + embed
# scripts). `web` keys off libxul existing to decide whether a first build is needed.
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
        libxul embed-demo chrome-demo

all: web

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

build: firefox vendor
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
	cd firefox && ./mach build

# Force a reconfigure. Needed when you change something configure inspects that
# isn't in CONFIGURE_INPUTS (e.g. after re-checking out firefox/): `build` above
# only reconfigures when $(CONFIGURE_INPUTS) change, so use this otherwise.
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

# --- libxul.js library + demos (pnpm monorepo) -----------------------------
# Build the libxul.js package: the engine artifacts (build/build-lib.sh stages a
# MINIMAL gre-stage -> gecko.{js,wasm,data,worker.js}) + the rspack ESM bundle.
# Needs the engine built first (libxul.so), same as `web`.
libxul:
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
	rm -f  embed-xul/gecko.js embed-xul/gecko.wasm embed-xul/gecko.data \
	       embed-xul/gecko.worker.js embed-xul/*.stripped.so embed-xul/*.o \
	       embed-xul/gecko.wasm.zst embed-xul/gecko.data.zst embed-xul/gecko-assets.json
	rm -rf embed-xul/gre-stage

distclean: clean
	rm -rf obj-full-emscripten obj-full-emscripten-release firefox
