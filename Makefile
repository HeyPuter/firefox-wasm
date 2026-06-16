# gecko-wasm build orchestration.
#
#   make firefox    shallow-clone (depth 1) the Gecko engine fork at the pinned commit
#   make vendor     vendor the Rust std deps for -Z build-std (vendor-std-deps.py)
#   make build      mach configure + build the engine -> obj-full-emscripten/dist/bin/libxul.so
#   make web        stage GRE + relink the embed-xul web build -> embed-xul/gecko.{js,wasm,data}
#   make all        firefox -> vendor -> build -> web   (default)
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
FIREFOX_REF := 673a67963eda1202575e8ff4334157848856285d

EM_CONFIG           ?= $(ROOT)/em_config
MOZCONFIG           ?= $(ROOT)/mozconfig.full.emscripten
MOZBUILD_STATE_PATH ?= $(HOME)/.mozbuild
export EM_CONFIG MOZCONFIG MOZBUILD_STATE_PATH

.PHONY: all firefox vendor build web run clean distclean

all: web

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
	cd firefox && ./mach configure && ./mach build

web: build
	bash embed-xul/stage-gre.sh
	bash embed-xul/restrip-relink-web.sh

run:
	node embed-xul/server.cjs

clean:
	rm -f  embed-xul/gecko.js embed-xul/gecko.wasm embed-xul/gecko.data \
	       embed-xul/gecko.worker.js embed-xul/libxul.stripped.so embed-xul/*.o
	rm -rf embed-xul/gre-stage

distclean: clean
	rm -rf obj-full-emscripten firefox
