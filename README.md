# Firefox in WebAssembly

This project compiles the Gecko engine to WebAssembly so that Firefox can be loaded inside another browser. This port is made possible by [emscripten](https://emscripten.org/) and the [WISP protocol](https://github.com/MercuryWorkshop/wisp-protocol) for networking support.

<img width="1920" height="1080" alt="ss-2026-07-15T16:17:54 137585236-04:00" src="https://github.com/user-attachments/assets/9fd4cc37-d76c-47a7-b31a-a8ddbbb37dc5" />

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

# JIT
This project contains an attempt at a JS->WASM JIT. It is currently not usable on many websites. It can be toggled with the environment variable `GECKO_NOWASMJIT=1`
