// Defines poc_sleep as a wasm import (env.poc_sleep). It returns a Promise; on the
// JS side we wrap this import with `new WebAssembly.Suspending(...)` at instantiation
// so the wasm stack suspends until the Promise resolves.
mergeInto(LibraryManager.library, {
  poc_sleep__sig: 'vi',
  poc_sleep: function (ms) { return new Promise(function (r) { setTimeout(r, ms); }); },
});
