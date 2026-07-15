# Firefox in WebAssembly

This project compiles the Gecko engine to WebAssembly so that Firefox can be loaded inside another browser. This port is made possible by [emscripten](https://emscripten.org/) and the [WISP protocol](https://github.com/MercuryWorkshop/wisp-protocol) for networking support.


# BUILD INSTRUCTIONS
Must build on linux. Building on mac is not currently supported.

prequisites
- libpulse-dev
- node + pnpm

```bash
emsdk install 6.0.1
emsdk activate 6.0.1
rustup target add wasm32-unknown-emscripten
make web
```
