(function(){const e=document.createElement("link").relList;if(e&&e.supports&&e.supports("modulepreload"))return;for(const n of document.querySelectorAll('link[rel="modulepreload"]'))a(n);new MutationObserver(n=>{for(const r of n)if(r.type==="childList")for(const m of r.addedNodes)m.tagName==="LINK"&&m.rel==="modulepreload"&&a(m)}).observe(document,{childList:!0,subtree:!0});function t(n){const r={};return n.integrity&&(r.integrity=n.integrity),n.referrerPolicy&&(r.referrerPolicy=n.referrerPolicy),n.crossOrigin==="use-credentials"?r.credentials="include":n.crossOrigin==="anonymous"?r.credentials="omit":r.credentials="same-origin",r}function a(n){if(n.ep)return;n.ep=!0;const r=t(n);fetch(n.href,r)}})();var g={};g.d=(i,e)=>{for(var t in e)g.o(e,t)&&!g.o(i,t)&&Object.defineProperty(i,t,{enumerable:!0,get:e[t]})};g.o=(i,e)=>Object.prototype.hasOwnProperty.call(i,e);var E={};g.d(E,{A:()=>ue,k:()=>N});const C=`
var createGecko = (() => {
  var _scriptDir = typeof document !== 'undefined' && document.currentScript ? document.currentScript.src : undefined;
  
  return (
function(moduleArg = {}) {

// Support for growable heap + pthreads, where the buffer may change, so JS views
// must be updated.
function GROWABLE_HEAP_I8() {
  if (wasmMemory.buffer != HEAP8.buffer) {
    updateMemoryViews();
  }
  return HEAP8;
}
function GROWABLE_HEAP_U8() {
  if (wasmMemory.buffer != HEAP8.buffer) {
    updateMemoryViews();
  }
  return HEAPU8;
}
function GROWABLE_HEAP_I16() {
  if (wasmMemory.buffer != HEAP8.buffer) {
    updateMemoryViews();
  }
  return HEAP16;
}
function GROWABLE_HEAP_U16() {
  if (wasmMemory.buffer != HEAP8.buffer) {
    updateMemoryViews();
  }
  return HEAPU16;
}
function GROWABLE_HEAP_I32() {
  if (wasmMemory.buffer != HEAP8.buffer) {
    updateMemoryViews();
  }
  return HEAP32;
}
function GROWABLE_HEAP_U32() {
  if (wasmMemory.buffer != HEAP8.buffer) {
    updateMemoryViews();
  }
  return HEAPU32;
}
function GROWABLE_HEAP_F32() {
  if (wasmMemory.buffer != HEAP8.buffer) {
    updateMemoryViews();
  }
  return HEAPF32;
}
function GROWABLE_HEAP_F64() {
  if (wasmMemory.buffer != HEAP8.buffer) {
    updateMemoryViews();
  }
  return HEAPF64;
}

var Module = moduleArg;

var readyPromiseResolve, readyPromiseReject;

Module["ready"] = new Promise((resolve, reject) => {
 readyPromiseResolve = resolve;
 readyPromiseReject = reject;
});

[ "_xul_init", "_free", "_malloc", "_WasmXPTCStubDispatch", "_xul_cmd_ptr", "_wisp_wakeword", "_wasmhost_invoke_import", "_wjhelp", "_wasmjit_invoke", "_WJTraceRoots", "__emscripten_thread_init", "__emscripten_thread_exit", "__emscripten_thread_crashed", "__emscripten_thread_mailbox_await", "__emscripten_tls_init", "_pthread_self", "checkMailbox", "establishStackSpace", "invokeEntryPoint", "PThread", "___indirect_function_table", "_gNoteToolkitBuildID", "_WasmInvoke", "_WasmAddStub", "_HaveOffsetConverter", "__emscripten_proxy_main", "_main", "onRuntimeInitialized" ].forEach(prop => {
 if (!Object.getOwnPropertyDescriptor(Module["ready"], prop)) {
  Object.defineProperty(Module["ready"], prop, {
   get: () => abort("You are getting " + prop + " on the Promise object, instead of the instance. Use .then() to get called back with the instance, see the MODULARIZE docs in src/settings.js"),
   set: () => abort("You are setting " + prop + " on the Promise object, instead of the instance. Use .then() to get called back with the instance, see the MODULARIZE docs in src/settings.js")
  });
 }
});

if (!Module.expectedDataFileDownloads) {
 Module.expectedDataFileDownloads = 0;
}

Module.expectedDataFileDownloads++;

(function() {
 if (Module["ENVIRONMENT_IS_PTHREAD"] || Module["$ww"]) return;
 var loadPackage = function(metadata) {
  var PACKAGE_PATH = "";
  if (typeof window === "object") {
   PACKAGE_PATH = window["encodeURIComponent"](window.location.pathname.toString().substring(0, window.location.pathname.toString().lastIndexOf("/")) + "/");
  } else if (typeof process === "undefined" && typeof location !== "undefined") {
   PACKAGE_PATH = encodeURIComponent(location.pathname.toString().substring(0, location.pathname.toString().lastIndexOf("/")) + "/");
  }
  var PACKAGE_NAME = "/home/velzie/src/gecko-wasm/libxul.js/wasm/gecko.data";
  var REMOTE_PACKAGE_BASE = "gecko.data";
  if (typeof Module["locateFilePackage"] === "function" && !Module["locateFile"]) {
   Module["locateFile"] = Module["locateFilePackage"];
   err("warning: you defined Module.locateFilePackage, that has been renamed to Module.locateFile (using your locateFilePackage for now)");
  }
  var REMOTE_PACKAGE_NAME = Module["locateFile"] ? Module["locateFile"](REMOTE_PACKAGE_BASE, "") : REMOTE_PACKAGE_BASE;
  var REMOTE_PACKAGE_SIZE = metadata["remote_package_size"];
  function fetchRemotePackage(packageName, packageSize, callback, errback) {
   var xhr = new XMLHttpRequest;
   xhr.open("GET", packageName, true);
   xhr.responseType = "arraybuffer";
   xhr.onprogress = function(event) {
    var url = packageName;
    var size = packageSize;
    if (event.total) size = event.total;
    if (event.loaded) {
     if (!xhr.addedTotal) {
      xhr.addedTotal = true;
      if (!Module.dataFileDownloads) Module.dataFileDownloads = {};
      Module.dataFileDownloads[url] = {
       loaded: event.loaded,
       total: size
      };
     } else {
      Module.dataFileDownloads[url].loaded = event.loaded;
     }
     var total = 0;
     var loaded = 0;
     var num = 0;
     for (var download in Module.dataFileDownloads) {
      var data = Module.dataFileDownloads[download];
      total += data.total;
      loaded += data.loaded;
      num++;
     }
     total = Math.ceil(total * Module.expectedDataFileDownloads / num);
     if (Module["setStatus"]) Module["setStatus"](\`Downloading data... (\${loaded}/\${total})\`);
    } else if (!Module.dataFileDownloads) {
     if (Module["setStatus"]) Module["setStatus"]("Downloading data...");
    }
   };
   xhr.onerror = function(event) {
    throw new Error("NetworkError for: " + packageName);
   };
   xhr.onload = function(event) {
    if (xhr.status == 200 || xhr.status == 304 || xhr.status == 206 || (xhr.status == 0 && xhr.response)) {
     var packageData = xhr.response;
     callback(packageData);
    } else {
     throw new Error(xhr.statusText + " : " + xhr.responseURL);
    }
   };
   xhr.send(null);
  }
  function handleError(error) {
   console.error("package error:", error);
  }
  var fetchedCallback = null;
  var fetched = Module["getPreloadedPackage"] ? Module["getPreloadedPackage"](REMOTE_PACKAGE_NAME, REMOTE_PACKAGE_SIZE) : null;
  if (!fetched) fetchRemotePackage(REMOTE_PACKAGE_NAME, REMOTE_PACKAGE_SIZE, function(data) {
   if (fetchedCallback) {
    fetchedCallback(data);
    fetchedCallback = null;
   } else {
    fetched = data;
   }
  }, handleError);
  function runWithFS() {
   function assert(check, msg) {
    if (!check) throw msg + (new Error).stack;
   }
   Module["FS_createPath"]("/", "gre", true, true);
   Module["FS_createPath"]("/gre", "actors", true, true);
   Module["FS_createPath"]("/gre", "chrome", true, true);
   Module["FS_createPath"]("/gre/chrome", "en-US", true, true);
   Module["FS_createPath"]("/gre/chrome/en-US", "locale", true, true);
   Module["FS_createPath"]("/gre/chrome/en-US/locale", "en-US", true, true);
   Module["FS_createPath"]("/gre/chrome/en-US/locale/en-US", "alerts", true, true);
   Module["FS_createPath"]("/gre/chrome/en-US/locale/en-US", "autoconfig", true, true);
   Module["FS_createPath"]("/gre/chrome/en-US/locale/en-US", "global-platform", true, true);
   Module["FS_createPath"]("/gre/chrome/en-US/locale/en-US/global-platform", "mac", true, true);
   Module["FS_createPath"]("/gre/chrome/en-US/locale/en-US/global-platform", "unix", true, true);
   Module["FS_createPath"]("/gre/chrome/en-US/locale/en-US/global-platform", "win", true, true);
   Module["FS_createPath"]("/gre/chrome/en-US/locale/en-US", "global", true, true);
   Module["FS_createPath"]("/gre/chrome/en-US/locale/en-US/global", "dom", true, true);
   Module["FS_createPath"]("/gre/chrome/en-US/locale/en-US/global", "layout", true, true);
   Module["FS_createPath"]("/gre/chrome/en-US/locale/en-US/global", "mathml", true, true);
   Module["FS_createPath"]("/gre/chrome/en-US/locale/en-US/global", "security", true, true);
   Module["FS_createPath"]("/gre/chrome/en-US/locale/en-US/global", "svg", true, true);
   Module["FS_createPath"]("/gre/chrome/en-US/locale/en-US", "mozapps", true, true);
   Module["FS_createPath"]("/gre/chrome/en-US/locale/en-US/mozapps", "downloads", true, true);
   Module["FS_createPath"]("/gre/chrome/en-US/locale/en-US/mozapps", "profile", true, true);
   Module["FS_createPath"]("/gre/chrome/en-US/locale/en-US/mozapps", "update", true, true);
   Module["FS_createPath"]("/gre/chrome/en-US/locale/en-US", "necko", true, true);
   Module["FS_createPath"]("/gre/chrome/en-US/locale/en-US", "passwordmgr", true, true);
   Module["FS_createPath"]("/gre/chrome/en-US/locale/en-US", "pipnss", true, true);
   Module["FS_createPath"]("/gre/chrome/en-US/locale/en-US", "pippki", true, true);
   Module["FS_createPath"]("/gre/chrome/en-US/locale/en-US", "places", true, true);
   Module["FS_createPath"]("/gre/chrome", "toolkit", true, true);
   Module["FS_createPath"]("/gre/chrome/toolkit", "content", true, true);
   Module["FS_createPath"]("/gre/chrome/toolkit/content", "extensions", true, true);
   Module["FS_createPath"]("/gre/chrome/toolkit/content/extensions", "child", true, true);
   Module["FS_createPath"]("/gre/chrome/toolkit/content/extensions", "parent", true, true);
   Module["FS_createPath"]("/gre/chrome/toolkit/content/extensions", "schemas", true, true);
   Module["FS_createPath"]("/gre/chrome/toolkit/content", "global", true, true);
   Module["FS_createPath"]("/gre/chrome/toolkit/content/global", "aboutRestricted", true, true);
   Module["FS_createPath"]("/gre/chrome/toolkit/content/global", "aboutconfig", true, true);
   Module["FS_createPath"]("/gre/chrome/toolkit/content/global", "alerts", true, true);
   Module["FS_createPath"]("/gre/chrome/toolkit/content/global", "antitracking", true, true);
   Module["FS_createPath"]("/gre/chrome/toolkit/content/global", "autocomplete-row-item", true, true);
   Module["FS_createPath"]("/gre/chrome/toolkit/content/global", "bindings", true, true);
   Module["FS_createPath"]("/gre/chrome/toolkit/content/global", "cookiebanners", true, true);
   Module["FS_createPath"]("/gre/chrome/toolkit/content/global", "elements", true, true);
   Module["FS_createPath"]("/gre/chrome/toolkit/content/global", "errors", true, true);
   Module["FS_createPath"]("/gre/chrome/toolkit/content/global", "gmp-sources", true, true);
   Module["FS_createPath"]("/gre/chrome/toolkit/content/global", "httpsonlyerror", true, true);
   Module["FS_createPath"]("/gre/chrome/toolkit/content/global", "neterror", true, true);
   Module["FS_createPath"]("/gre/chrome/toolkit/content/global/neterror", "supportpages", true, true);
   Module["FS_createPath"]("/gre/chrome/toolkit/content/global", "pictureinpicture", true, true);
   Module["FS_createPath"]("/gre/chrome/toolkit/content/global", "preferences", true, true);
   Module["FS_createPath"]("/gre/chrome/toolkit/content/global", "reader", true, true);
   Module["FS_createPath"]("/gre/chrome/toolkit/content/global", "resistfingerprinting", true, true);
   Module["FS_createPath"]("/gre/chrome/toolkit/content/global", "third_party", true, true);
   Module["FS_createPath"]("/gre/chrome/toolkit/content/global/third_party", "cfworker", true, true);
   Module["FS_createPath"]("/gre/chrome/toolkit/content/global/third_party", "d3", true, true);
   Module["FS_createPath"]("/gre/chrome/toolkit/content/global", "xml", true, true);
   Module["FS_createPath"]("/gre/chrome/toolkit/content", "mozapps", true, true);
   Module["FS_createPath"]("/gre/chrome/toolkit/content/mozapps", "downloads", true, true);
   Module["FS_createPath"]("/gre/chrome/toolkit/content/mozapps", "extensions", true, true);
   Module["FS_createPath"]("/gre/chrome/toolkit/content/mozapps/extensions", "components", true, true);
   Module["FS_createPath"]("/gre/chrome/toolkit/content/mozapps/extensions", "default-theme", true, true);
   Module["FS_createPath"]("/gre/chrome/toolkit/content/mozapps", "handling", true, true);
   Module["FS_createPath"]("/gre/chrome/toolkit/content/mozapps", "preferences", true, true);
   Module["FS_createPath"]("/gre/chrome/toolkit/content/mozapps", "profile", true, true);
   Module["FS_createPath"]("/gre/chrome/toolkit", "passwordmgr", true, true);
   Module["FS_createPath"]("/gre/chrome/toolkit", "res", true, true);
   Module["FS_createPath"]("/gre/chrome/toolkit/res", "autofill", true, true);
   Module["FS_createPath"]("/gre/chrome/toolkit/res", "messaging-system", true, true);
   Module["FS_createPath"]("/gre/chrome/toolkit/res/messaging-system", "lib", true, true);
   Module["FS_createPath"]("/gre/chrome/toolkit/res/messaging-system", "targeting", true, true);
   Module["FS_createPath"]("/gre/chrome/toolkit/res", "nimbus", true, true);
   Module["FS_createPath"]("/gre/chrome/toolkit/res/nimbus", "lib", true, true);
   Module["FS_createPath"]("/gre/chrome/toolkit/res/nimbus", "schemas", true, true);
   Module["FS_createPath"]("/gre/chrome/toolkit/res", "normandy", true, true);
   Module["FS_createPath"]("/gre/chrome/toolkit/res/normandy", "actions", true, true);
   Module["FS_createPath"]("/gre/chrome/toolkit/res/normandy/actions", "schemas", true, true);
   Module["FS_createPath"]("/gre/chrome/toolkit/res/normandy", "content", true, true);
   Module["FS_createPath"]("/gre/chrome/toolkit/res/normandy/content", "about-studies", true, true);
   Module["FS_createPath"]("/gre/chrome/toolkit/res/normandy", "lib", true, true);
   Module["FS_createPath"]("/gre/chrome/toolkit/res/normandy", "schemas", true, true);
   Module["FS_createPath"]("/gre/chrome/toolkit/res/normandy", "skin", true, true);
   Module["FS_createPath"]("/gre/chrome/toolkit/res/normandy/skin", "shared", true, true);
   Module["FS_createPath"]("/gre/chrome/toolkit/res/normandy", "vendor", true, true);
   Module["FS_createPath"]("/gre/chrome/toolkit", "skin", true, true);
   Module["FS_createPath"]("/gre/chrome/toolkit/skin", "classic", true, true);
   Module["FS_createPath"]("/gre/chrome/toolkit/skin/classic", "global", true, true);
   Module["FS_createPath"]("/gre/chrome/toolkit/skin/classic/global", "arrow", true, true);
   Module["FS_createPath"]("/gre/chrome/toolkit/skin/classic/global", "design-system", true, true);
   Module["FS_createPath"]("/gre/chrome/toolkit/skin/classic/global", "dirListing", true, true);
   Module["FS_createPath"]("/gre/chrome/toolkit/skin/classic/global", "icons", true, true);
   Module["FS_createPath"]("/gre/chrome/toolkit/skin/classic/global", "illustrations", true, true);
   Module["FS_createPath"]("/gre/chrome/toolkit/skin/classic/global", "in-content", true, true);
   Module["FS_createPath"]("/gre/chrome/toolkit/skin/classic/global", "media", true, true);
   Module["FS_createPath"]("/gre/chrome/toolkit/skin/classic/global", "narrate", true, true);
   Module["FS_createPath"]("/gre/chrome/toolkit/skin/classic/global", "pictureinpicture", true, true);
   Module["FS_createPath"]("/gre/chrome/toolkit/skin/classic/global", "reader", true, true);
   Module["FS_createPath"]("/gre/chrome/toolkit/skin/classic/global", "tree", true, true);
   Module["FS_createPath"]("/gre/chrome/toolkit/skin/classic", "mozapps", true, true);
   Module["FS_createPath"]("/gre/chrome/toolkit/skin/classic/mozapps", "downloads", true, true);
   Module["FS_createPath"]("/gre/chrome/toolkit/skin/classic/mozapps", "extensions", true, true);
   Module["FS_createPath"]("/gre/chrome/toolkit/skin/classic/mozapps", "handling", true, true);
   Module["FS_createPath"]("/gre/chrome/toolkit/skin/classic/mozapps", "update", true, true);
   Module["FS_createPath"]("/gre", "components", true, true);
   Module["FS_createPath"]("/gre", "contentaccessible", true, true);
   Module["FS_createPath"]("/gre/contentaccessible", "html", true, true);
   Module["FS_createPath"]("/gre", "defaults", true, true);
   Module["FS_createPath"]("/gre/defaults", "autoconfig", true, true);
   Module["FS_createPath"]("/gre/defaults", "pref", true, true);
   Module["FS_createPath"]("/gre", "fonts", true, true);
   Module["FS_createPath"]("/gre", "localization", true, true);
   Module["FS_createPath"]("/gre/localization", "en-US", true, true);
   Module["FS_createPath"]("/gre/localization/en-US", "crashreporter", true, true);
   Module["FS_createPath"]("/gre/localization/en-US", "dom", true, true);
   Module["FS_createPath"]("/gre/localization/en-US", "locales-preview", true, true);
   Module["FS_createPath"]("/gre/localization/en-US", "netwerk", true, true);
   Module["FS_createPath"]("/gre/localization/en-US", "preview", true, true);
   Module["FS_createPath"]("/gre/localization/en-US", "security", true, true);
   Module["FS_createPath"]("/gre/localization/en-US/security", "certificates", true, true);
   Module["FS_createPath"]("/gre/localization/en-US/security", "pippki", true, true);
   Module["FS_createPath"]("/gre/localization/en-US", "services", true, true);
   Module["FS_createPath"]("/gre/localization/en-US", "toolkit", true, true);
   Module["FS_createPath"]("/gre/localization/en-US/toolkit", "about", true, true);
   Module["FS_createPath"]("/gre/localization/en-US/toolkit", "branding", true, true);
   Module["FS_createPath"]("/gre/localization/en-US/toolkit", "contentanalysis", true, true);
   Module["FS_createPath"]("/gre/localization/en-US/toolkit", "downloads", true, true);
   Module["FS_createPath"]("/gre/localization/en-US/toolkit", "firefoxlabs", true, true);
   Module["FS_createPath"]("/gre/localization/en-US/toolkit", "formautofill", true, true);
   Module["FS_createPath"]("/gre/localization/en-US/toolkit", "global", true, true);
   Module["FS_createPath"]("/gre/localization/en-US/toolkit", "intl", true, true);
   Module["FS_createPath"]("/gre/localization/en-US/toolkit", "main-window", true, true);
   Module["FS_createPath"]("/gre/localization/en-US/toolkit", "neterror", true, true);
   Module["FS_createPath"]("/gre/localization/en-US/toolkit", "passwordmgr", true, true);
   Module["FS_createPath"]("/gre/localization/en-US/toolkit", "payments", true, true);
   Module["FS_createPath"]("/gre/localization/en-US/toolkit", "pdfviewer", true, true);
   Module["FS_createPath"]("/gre/localization/en-US/toolkit", "pictureinpicture", true, true);
   Module["FS_createPath"]("/gre/localization/en-US/toolkit", "preferences", true, true);
   Module["FS_createPath"]("/gre/localization/en-US/toolkit", "printing", true, true);
   Module["FS_createPath"]("/gre/localization/en-US/toolkit", "updates", true, true);
   Module["FS_createPath"]("/gre", "modules", true, true);
   Module["FS_createPath"]("/gre/modules", "addons", true, true);
   Module["FS_createPath"]("/gre/modules", "backgroundtasks", true, true);
   Module["FS_createPath"]("/gre/modules", "components-utils", true, true);
   Module["FS_createPath"]("/gre/modules", "contentrelevancy", true, true);
   Module["FS_createPath"]("/gre/modules/contentrelevancy", "private", true, true);
   Module["FS_createPath"]("/gre/modules", "handlers", true, true);
   Module["FS_createPath"]("/gre/modules", "media", true, true);
   Module["FS_createPath"]("/gre/modules", "megalist", true, true);
   Module["FS_createPath"]("/gre/modules/megalist", "aggregator", true, true);
   Module["FS_createPath"]("/gre/modules/megalist/aggregator", "datasources", true, true);
   Module["FS_createPath"]("/gre/modules", "narrate", true, true);
   Module["FS_createPath"]("/gre/modules", "psm", true, true);
   Module["FS_createPath"]("/gre/modules", "services-automation", true, true);
   Module["FS_createPath"]("/gre/modules", "services-common", true, true);
   Module["FS_createPath"]("/gre/modules", "services-settings", true, true);
   Module["FS_createPath"]("/gre/modules", "services-sync", true, true);
   Module["FS_createPath"]("/gre/modules/services-sync", "engines", true, true);
   Module["FS_createPath"]("/gre/modules/services-sync", "stages", true, true);
   Module["FS_createPath"]("/gre/modules", "sessionstore", true, true);
   Module["FS_createPath"]("/gre/modules", "shared", true, true);
   Module["FS_createPath"]("/gre/modules", "subprocess", true, true);
   Module["FS_createPath"]("/gre/modules", "third_party", true, true);
   Module["FS_createPath"]("/gre/modules/third_party", "fathom", true, true);
   Module["FS_createPath"]("/gre/modules/third_party", "jsesc", true, true);
   Module["FS_createPath"]("/gre/modules", "workers", true, true);
   Module["FS_createPath"]("/gre", "moz-src", true, true);
   Module["FS_createPath"]("/gre/moz-src", "dom", true, true);
   Module["FS_createPath"]("/gre/moz-src/dom", "geolocation", true, true);
   Module["FS_createPath"]("/gre/moz-src/dom", "notification", true, true);
   Module["FS_createPath"]("/gre/moz-src/dom", "quota", true, true);
   Module["FS_createPath"]("/gre/moz-src", "services", true, true);
   Module["FS_createPath"]("/gre/moz-src/services", "crypto", true, true);
   Module["FS_createPath"]("/gre/moz-src/services/crypto", "modules", true, true);
   Module["FS_createPath"]("/gre/moz-src", "third_party", true, true);
   Module["FS_createPath"]("/gre/moz-src/third_party", "js", true, true);
   Module["FS_createPath"]("/gre/moz-src/third_party/js", "qrcode", true, true);
   Module["FS_createPath"]("/gre/moz-src", "toolkit", true, true);
   Module["FS_createPath"]("/gre/moz-src/toolkit", "actors", true, true);
   Module["FS_createPath"]("/gre/moz-src/toolkit", "components", true, true);
   Module["FS_createPath"]("/gre/moz-src/toolkit/components", "doh", true, true);
   Module["FS_createPath"]("/gre/moz-src/toolkit/components", "ipprotection", true, true);
   Module["FS_createPath"]("/gre/moz-src/toolkit/components/ipprotection", "fxa", true, true);
   Module["FS_createPath"]("/gre/moz-src/toolkit/components", "pageextractor", true, true);
   Module["FS_createPath"]("/gre/moz-src/toolkit/components", "qrcode", true, true);
   Module["FS_createPath"]("/gre/moz-src/toolkit/components", "reader", true, true);
   Module["FS_createPath"]("/gre/moz-src/toolkit/components/reader", "readability", true, true);
   Module["FS_createPath"]("/gre/moz-src/toolkit/components", "search", true, true);
   Module["FS_createPath"]("/gre/moz-src/toolkit/components", "uniffi-bindgen-gecko-js", true, true);
   Module["FS_createPath"]("/gre/moz-src/toolkit/components/uniffi-bindgen-gecko-js", "components", true, true);
   Module["FS_createPath"]("/gre/moz-src/toolkit/components/uniffi-bindgen-gecko-js/components", "generated", true, true);
   Module["FS_createPath"]("/gre/moz-src/toolkit/components", "uniffi-js", true, true);
   Module["FS_createPath"]("/gre/moz-src/toolkit/components/uniffi-js", "js", true, true);
   Module["FS_createPath"]("/gre/moz-src/toolkit", "modules", true, true);
   Module["FS_createPath"]("/gre/moz-src/toolkit", "profile", true, true);
   Module["FS_createPath"]("/gre", "res", true, true);
   Module["FS_createPath"]("/gre/res", "dtd", true, true);
   Module["FS_createPath"]("/gre/res", "fonts", true, true);
   Module["FS_createPath"]("/gre/res", "locale", true, true);
   Module["FS_createPath"]("/gre/res/locale", "dom", true, true);
   Module["FS_createPath"]("/gre/res/locale", "layout", true, true);
   Module["FS_createPath"]("/gre/res/locale", "necko", true, true);
   /** @constructor */ function DataRequest(start, end, audio) {
    this.start = start;
    this.end = end;
    this.audio = audio;
   }
   DataRequest.prototype = {
    requests: {},
    open: function(mode, name) {
     this.name = name;
     this.requests[name] = this;
     Module["addRunDependency"](\`fp \${this.name}\`);
    },
    send: function() {},
    onload: function() {
     var byteArray = this.byteArray.subarray(this.start, this.end);
     this.finish(byteArray);
    },
    finish: function(byteArray) {
     var that = this;
     Module["FS_createDataFile"](this.name, null, byteArray, true, true, true);
     Module["removeRunDependency"](\`fp \${that.name}\`);
     this.requests[this.name] = null;
    }
   };
   var files = metadata["files"];
   for (var i = 0; i < files.length; ++i) {
    new DataRequest(files[i]["start"], files[i]["end"], files[i]["audio"] || 0).open("GET", files[i]["filename"]);
   }
   function processPackageData(arrayBuffer) {
    assert(arrayBuffer, "Loading data file failed.");
    assert(arrayBuffer.constructor.name === ArrayBuffer.name, "bad input to processPackageData");
    var byteArray = new Uint8Array(arrayBuffer);
    var curr;
    DataRequest.prototype.byteArray = byteArray;
    var files = metadata["files"];
    for (var i = 0; i < files.length; ++i) {
     DataRequest.prototype.requests[files[i].filename].onload();
    }
    Module["removeRunDependency"]("datafile_/home/velzie/src/gecko-wasm/libxul.js/wasm/gecko.data");
   }
   Module["addRunDependency"]("datafile_/home/velzie/src/gecko-wasm/libxul.js/wasm/gecko.data");
   if (!Module.preloadResults) Module.preloadResults = {};
   Module.preloadResults[PACKAGE_NAME] = {
    fromCache: false
   };
   if (fetched) {
    processPackageData(fetched);
    fetched = null;
   } else {
    fetchedCallback = processPackageData;
   }
  }
  if (Module["calledRun"]) {
   runWithFS();
  } else {
   if (!Module["preRun"]) Module["preRun"] = [];
   Module["preRun"].push(runWithFS);
  }
 };
 loadPackage({
  "files": [ {
   "filename": "/gre/.lldbinit",
   "start": 0,
   "end": 196
  }, {
   "filename": "/gre/.mkdir.done",
   "start": 196,
   "end": 196
  }, {
   "filename": "/gre/EventArtifactDefinitions.json",
   "start": 196,
   "end": 28081
  }, {
   "filename": "/gre/ScalarArtifactDefinitions.json",
   "start": 28081,
   "end": 95897
  }, {
   "filename": "/gre/actors/AboutHttpsOnlyErrorChild.sys.mjs",
   "start": 95897,
   "end": 98331
  }, {
   "filename": "/gre/actors/AboutHttpsOnlyErrorParent.sys.mjs",
   "start": 98331,
   "end": 98916
  }, {
   "filename": "/gre/actors/AboutPDFChild.sys.mjs",
   "start": 98916,
   "end": 100564
  }, {
   "filename": "/gre/actors/AboutPDFParent.sys.mjs",
   "start": 100564,
   "end": 102836
  }, {
   "filename": "/gre/actors/AboutRestrictedChild.sys.mjs",
   "start": 102836,
   "end": 103334
  }, {
   "filename": "/gre/actors/AboutRestrictedParent.sys.mjs",
   "start": 103334,
   "end": 103915
  }, {
   "filename": "/gre/actors/AboutTranslationsChild.sys.mjs",
   "start": 103915,
   "end": 113862
  }, {
   "filename": "/gre/actors/AboutTranslationsParent.sys.mjs",
   "start": 113862,
   "end": 119129
  }, {
   "filename": "/gre/actors/AudioPlaybackChild.sys.mjs",
   "start": 119129,
   "end": 119806
  }, {
   "filename": "/gre/actors/AudioPlaybackParent.sys.mjs",
   "start": 119806,
   "end": 121116
  }, {
   "filename": "/gre/actors/AutoCompleteChild.sys.mjs",
   "start": 121116,
   "end": 132269
  }, {
   "filename": "/gre/actors/AutoCompleteParent.sys.mjs",
   "start": 132269,
   "end": 152869
  }, {
   "filename": "/gre/actors/AutoScrollChild.sys.mjs",
   "start": 152869,
   "end": 166293
  }, {
   "filename": "/gre/actors/AutoScrollParent.sys.mjs",
   "start": 166293,
   "end": 168194
  }, {
   "filename": "/gre/actors/AutoplayChild.sys.mjs",
   "start": 168194,
   "end": 168538
  }, {
   "filename": "/gre/actors/AutoplayParent.sys.mjs",
   "start": 168538,
   "end": 169180
  }, {
   "filename": "/gre/actors/BackgroundThumbnailsChild.sys.mjs",
   "start": 169180,
   "end": 172807
  }, {
   "filename": "/gre/actors/BrowserElementChild.sys.mjs",
   "start": 172807,
   "end": 173704
  }, {
   "filename": "/gre/actors/BrowserElementParent.sys.mjs",
   "start": 173704,
   "end": 175135
  }, {
   "filename": "/gre/actors/CaptchaDetectionChild.sys.mjs",
   "start": 175135,
   "end": 189202
  }, {
   "filename": "/gre/actors/CaptchaDetectionCommunicationChild.sys.mjs",
   "start": 189202,
   "end": 191543
  }, {
   "filename": "/gre/actors/CaptchaDetectionParent.sys.mjs",
   "start": 191543,
   "end": 204840
  }, {
   "filename": "/gre/actors/ContentMetaChild.sys.mjs",
   "start": 204840,
   "end": 210518
  }, {
   "filename": "/gre/actors/ContentMetaParent.sys.mjs",
   "start": 210518,
   "end": 211325
  }, {
   "filename": "/gre/actors/ControllersChild.sys.mjs",
   "start": 211325,
   "end": 213408
  }, {
   "filename": "/gre/actors/ControllersParent.sys.mjs",
   "start": 213408,
   "end": 216084
  }, {
   "filename": "/gre/actors/CookieBannerChild.sys.mjs",
   "start": 216084,
   "end": 235662
  }, {
   "filename": "/gre/actors/CookieBannerParent.sys.mjs",
   "start": 235662,
   "end": 242927
  }, {
   "filename": "/gre/actors/ExtFindChild.sys.mjs",
   "start": 242927,
   "end": 243854
  }, {
   "filename": "/gre/actors/FindBarChild.sys.mjs",
   "start": 243854,
   "end": 248057
  }, {
   "filename": "/gre/actors/FindBarParent.sys.mjs",
   "start": 248057,
   "end": 249595
  }, {
   "filename": "/gre/actors/FinderChild.sys.mjs",
   "start": 249595,
   "end": 253018
  }, {
   "filename": "/gre/actors/FormHandlerChild.sys.mjs",
   "start": 253018,
   "end": 267810
  }, {
   "filename": "/gre/actors/FormHandlerParent.sys.mjs",
   "start": 267810,
   "end": 270699
  }, {
   "filename": "/gre/actors/FormHistoryChild.sys.mjs",
   "start": 270699,
   "end": 278192
  }, {
   "filename": "/gre/actors/FormHistoryParent.sys.mjs",
   "start": 278192,
   "end": 283332
  }, {
   "filename": "/gre/actors/InlineSpellCheckerChild.sys.mjs",
   "start": 283332,
   "end": 284460
  }, {
   "filename": "/gre/actors/InlineSpellCheckerParent.sys.mjs",
   "start": 284460,
   "end": 285831
  }, {
   "filename": "/gre/actors/KeyPressEventModelCheckerChild.sys.mjs",
   "start": 285831,
   "end": 289418
  }, {
   "filename": "/gre/actors/MLEngineChild.sys.mjs",
   "start": 289418,
   "end": 317974
  }, {
   "filename": "/gre/actors/MLEngineParent.sys.mjs",
   "start": 317974,
   "end": 375387
  }, {
   "filename": "/gre/actors/MegalistChild.sys.mjs",
   "start": 375387,
   "end": 375964
  }, {
   "filename": "/gre/actors/MegalistParent.sys.mjs",
   "start": 375964,
   "end": 377389
  }, {
   "filename": "/gre/actors/NetErrorChild.sys.mjs",
   "start": 377389,
   "end": 385202
  }, {
   "filename": "/gre/actors/NetErrorParent.sys.mjs",
   "start": 385202,
   "end": 394879
  }, {
   "filename": "/gre/actors/PageExtractorChild.sys.mjs",
   "start": 394879,
   "end": 407701
  }, {
   "filename": "/gre/actors/PageExtractorParent.sys.mjs",
   "start": 407701,
   "end": 418960
  }, {
   "filename": "/gre/actors/PictureInPictureChild.sys.mjs",
   "start": 418960,
   "end": 537376
  }, {
   "filename": "/gre/actors/PopupAndRedirectBlockingChild.sys.mjs",
   "start": 537376,
   "end": 542997
  }, {
   "filename": "/gre/actors/PopupAndRedirectBlockingParent.sys.mjs",
   "start": 542997,
   "end": 551898
  }, {
   "filename": "/gre/actors/PrintingChild.sys.mjs",
   "start": 551898,
   "end": 561377
  }, {
   "filename": "/gre/actors/PrintingParent.sys.mjs",
   "start": 561377,
   "end": 562096
  }, {
   "filename": "/gre/actors/PrintingSelectionChild.sys.mjs",
   "start": 562096,
   "end": 562689
  }, {
   "filename": "/gre/actors/RemotePageChild.sys.mjs",
   "start": 562689,
   "end": 568970
  }, {
   "filename": "/gre/actors/ReportBrokenSiteChild.sys.mjs",
   "start": 568970,
   "end": 580389
  }, {
   "filename": "/gre/actors/ReportBrokenSiteParent.sys.mjs",
   "start": 580389,
   "end": 600653
  }, {
   "filename": "/gre/actors/SelectChild.sys.mjs",
   "start": 600653,
   "end": 615989
  }, {
   "filename": "/gre/actors/SelectParent.sys.mjs",
   "start": 615989,
   "end": 643817
  }, {
   "filename": "/gre/actors/TLSCertificateBindingChild.sys.mjs",
   "start": 643817,
   "end": 645266
  }, {
   "filename": "/gre/actors/ThumbnailsChild.sys.mjs",
   "start": 645266,
   "end": 647780
  }, {
   "filename": "/gre/actors/TranslationsChild.sys.mjs",
   "start": 647780,
   "end": 652407
  }, {
   "filename": "/gre/actors/TranslationsEngineChild.sys.mjs",
   "start": 652407,
   "end": 659118
  }, {
   "filename": "/gre/actors/TranslationsEngineParent.sys.mjs",
   "start": 659118,
   "end": 664169
  }, {
   "filename": "/gre/actors/TranslationsParent.sys.mjs",
   "start": 664169,
   "end": 834020
  }, {
   "filename": "/gre/actors/UAWidgetsChild.sys.mjs",
   "start": 834020,
   "end": 841069
  }, {
   "filename": "/gre/actors/UnselectedTabHoverChild.sys.mjs",
   "start": 841069,
   "end": 841649
  }, {
   "filename": "/gre/actors/UnselectedTabHoverParent.sys.mjs",
   "start": 841649,
   "end": 842184
  }, {
   "filename": "/gre/actors/UserCharacteristicsCanvasRenderingChild.sys.mjs",
   "start": 842184,
   "end": 869912
  }, {
   "filename": "/gre/actors/UserCharacteristicsChild.sys.mjs",
   "start": 869912,
   "end": 873507
  }, {
   "filename": "/gre/actors/UserCharacteristicsParent.sys.mjs",
   "start": 873507,
   "end": 875583
  }, {
   "filename": "/gre/actors/UserCharacteristicsWindowInfoChild.sys.mjs",
   "start": 875583,
   "end": 881083
  }, {
   "filename": "/gre/actors/ViewSourceChild.sys.mjs",
   "start": 881083,
   "end": 893383
  }, {
   "filename": "/gre/actors/ViewSourcePageChild.sys.mjs",
   "start": 893383,
   "end": 903367
  }, {
   "filename": "/gre/actors/ViewSourcePageParent.sys.mjs",
   "start": 903367,
   "end": 906804
  }, {
   "filename": "/gre/actors/WebChannelChild.sys.mjs",
   "start": 906804,
   "end": 909476
  }, {
   "filename": "/gre/actors/WebChannelParent.sys.mjs",
   "start": 909476,
   "end": 912075
  }, {
   "filename": "/gre/application.ini",
   "start": 912075,
   "end": 912523
  }, {
   "filename": "/gre/chrome.manifest",
   "start": 912523,
   "end": 913064
  }, {
   "filename": "/gre/chrome/.mkdir.done",
   "start": 913064,
   "end": 913064
  }, {
   "filename": "/gre/chrome/en-US.manifest",
   "start": 913064,
   "end": 913755
  }, {
   "filename": "/gre/chrome/en-US/locale/en-US/alerts/alert.properties",
   "start": 913755,
   "end": 914549
  }, {
   "filename": "/gre/chrome/en-US/locale/en-US/autoconfig/autoconfig.properties",
   "start": 914549,
   "end": 915107
  }, {
   "filename": "/gre/chrome/en-US/locale/en-US/global-platform/mac/accessible.properties",
   "start": 915107,
   "end": 917724
  }, {
   "filename": "/gre/chrome/en-US/locale/en-US/global-platform/mac/platformKeys.properties",
   "start": 917724,
   "end": 918577
  }, {
   "filename": "/gre/chrome/en-US/locale/en-US/global-platform/unix/accessible.properties",
   "start": 918577,
   "end": 919500
  }, {
   "filename": "/gre/chrome/en-US/locale/en-US/global-platform/unix/platformKeys.properties",
   "start": 919500,
   "end": 920204
  }, {
   "filename": "/gre/chrome/en-US/locale/en-US/global-platform/win/accessible.properties",
   "start": 920204,
   "end": 921543
  }, {
   "filename": "/gre/chrome/en-US/locale/en-US/global-platform/win/platformKeys.properties",
   "start": 921543,
   "end": 922242
  }, {
   "filename": "/gre/chrome/en-US/locale/en-US/global/aboutStudies.properties",
   "start": 922242,
   "end": 923669
  }, {
   "filename": "/gre/chrome/en-US/locale/en-US/global/appstrings.properties",
   "start": 923669,
   "end": 927881
  }, {
   "filename": "/gre/chrome/en-US/locale/en-US/global/autocomplete.properties",
   "start": 927881,
   "end": 928411
  }, {
   "filename": "/gre/chrome/en-US/locale/en-US/global/commonDialogs.properties",
   "start": 928411,
   "end": 930671
  }, {
   "filename": "/gre/chrome/en-US/locale/en-US/global/contentAreaCommands.properties",
   "start": 930671,
   "end": 931499
  }, {
   "filename": "/gre/chrome/en-US/locale/en-US/global/css.properties",
   "start": 931499,
   "end": 935948
  }, {
   "filename": "/gre/chrome/en-US/locale/en-US/global/dialog.properties",
   "start": 935948,
   "end": 936307
  }, {
   "filename": "/gre/chrome/en-US/locale/en-US/global/dom/dom.properties",
   "start": 936307,
   "end": 992150
  }, {
   "filename": "/gre/chrome/en-US/locale/en-US/global/extensions.properties",
   "start": 992150,
   "end": 993613
  }, {
   "filename": "/gre/chrome/en-US/locale/en-US/global/fallbackMenubar.properties",
   "start": 993613,
   "end": 993918
  }, {
   "filename": "/gre/chrome/en-US/locale/en-US/global/filepicker.properties",
   "start": 993918,
   "end": 994563
  }, {
   "filename": "/gre/chrome/en-US/locale/en-US/global/intl.css",
   "start": 994563,
   "end": 994945
  }, {
   "filename": "/gre/chrome/en-US/locale/en-US/global/keys.properties",
   "start": 994945,
   "end": 997201
  }, {
   "filename": "/gre/chrome/en-US/locale/en-US/global/layout/HtmlForm.properties",
   "start": 997201,
   "end": 999315
  }, {
   "filename": "/gre/chrome/en-US/locale/en-US/global/layout/MediaDocument.properties",
   "start": 999315,
   "end": 1000613
  }, {
   "filename": "/gre/chrome/en-US/locale/en-US/global/layout/htmlparser.properties",
   "start": 1000613,
   "end": 1014284
  }, {
   "filename": "/gre/chrome/en-US/locale/en-US/global/layout/xmlparser.properties",
   "start": 1014284,
   "end": 1016126
  }, {
   "filename": "/gre/chrome/en-US/locale/en-US/global/layout_errors.properties",
   "start": 1016126,
   "end": 1020990
  }, {
   "filename": "/gre/chrome/en-US/locale/en-US/global/mathml/mathml.properties",
   "start": 1020990,
   "end": 1022190
  }, {
   "filename": "/gre/chrome/en-US/locale/en-US/global/narrate.properties",
   "start": 1022190,
   "end": 1023398
  }, {
   "filename": "/gre/chrome/en-US/locale/en-US/global/nsWebBrowserPersist.properties",
   "start": 1023398,
   "end": 1025185
  }, {
   "filename": "/gre/chrome/en-US/locale/en-US/global/printdialog.properties",
   "start": 1025185,
   "end": 1026877
  }, {
   "filename": "/gre/chrome/en-US/locale/en-US/global/printing.properties",
   "start": 1026877,
   "end": 1029733
  }, {
   "filename": "/gre/chrome/en-US/locale/en-US/global/resetProfile.properties",
   "start": 1029733,
   "end": 1030591
  }, {
   "filename": "/gre/chrome/en-US/locale/en-US/global/security/caps.properties",
   "start": 1030591,
   "end": 1031265
  }, {
   "filename": "/gre/chrome/en-US/locale/en-US/global/security/csp.properties",
   "start": 1031265,
   "end": 1049688
  }, {
   "filename": "/gre/chrome/en-US/locale/en-US/global/security/security.properties",
   "start": 1049688,
   "end": 1068851
  }, {
   "filename": "/gre/chrome/en-US/locale/en-US/global/svg/svg.properties",
   "start": 1068851,
   "end": 1069119
  }, {
   "filename": "/gre/chrome/en-US/locale/en-US/global/viewSource.properties",
   "start": 1069119,
   "end": 1069799
  }, {
   "filename": "/gre/chrome/en-US/locale/en-US/global/wizard.properties",
   "start": 1069799,
   "end": 1070145
  }, {
   "filename": "/gre/chrome/en-US/locale/en-US/global/xul.properties",
   "start": 1070145,
   "end": 1070437
  }, {
   "filename": "/gre/chrome/en-US/locale/en-US/mozapps/downloads/downloads.properties",
   "start": 1070437,
   "end": 1070706
  }, {
   "filename": "/gre/chrome/en-US/locale/en-US/mozapps/downloads/unknownContentType.properties",
   "start": 1070706,
   "end": 1071842
  }, {
   "filename": "/gre/chrome/en-US/locale/en-US/mozapps/profile/profileSelection.properties",
   "start": 1071842,
   "end": 1075198
  }, {
   "filename": "/gre/chrome/en-US/locale/en-US/mozapps/update/updates.properties",
   "start": 1075198,
   "end": 1077313
  }, {
   "filename": "/gre/chrome/en-US/locale/en-US/necko/necko.properties",
   "start": 1077313,
   "end": 1088583
  }, {
   "filename": "/gre/chrome/en-US/locale/en-US/passwordmgr/passwordmgr.properties",
   "start": 1088583,
   "end": 1090337
  }, {
   "filename": "/gre/chrome/en-US/locale/en-US/pipnss/nsserrors.properties",
   "start": 1090337,
   "end": 1119889
  }, {
   "filename": "/gre/chrome/en-US/locale/en-US/pipnss/pipnss.properties",
   "start": 1119889,
   "end": 1127273
  }, {
   "filename": "/gre/chrome/en-US/locale/en-US/pippki/pippki.properties",
   "start": 1127273,
   "end": 1129530
  }, {
   "filename": "/gre/chrome/en-US/locale/en-US/places/places.properties",
   "start": 1129530,
   "end": 1130753
  }, {
   "filename": "/gre/chrome/toolkit.manifest",
   "start": 1130753,
   "end": 1132255
  }, {
   "filename": "/gre/chrome/toolkit/content/extensions/child/ext-backgroundPage.js",
   "start": 1132255,
   "end": 1133519
  }, {
   "filename": "/gre/chrome/toolkit/content/extensions/child/ext-contentScripts.js",
   "start": 1133519,
   "end": 1135591
  }, {
   "filename": "/gre/chrome/toolkit/content/extensions/child/ext-declarativeNetRequest.js",
   "start": 1135591,
   "end": 1137615
  }, {
   "filename": "/gre/chrome/toolkit/content/extensions/child/ext-extension.js",
   "start": 1137615,
   "end": 1139706
  }, {
   "filename": "/gre/chrome/toolkit/content/extensions/child/ext-identity.js",
   "start": 1139706,
   "end": 1142266
  }, {
   "filename": "/gre/chrome/toolkit/content/extensions/child/ext-publicSuffix.js",
   "start": 1142266,
   "end": 1145962
  }, {
   "filename": "/gre/chrome/toolkit/content/extensions/child/ext-runtime.js",
   "start": 1145962,
   "end": 1151518
  }, {
   "filename": "/gre/chrome/toolkit/content/extensions/child/ext-scripting.js",
   "start": 1151518,
   "end": 1152986
  }, {
   "filename": "/gre/chrome/toolkit/content/extensions/child/ext-storage.js",
   "start": 1152986,
   "end": 1165645
  }, {
   "filename": "/gre/chrome/toolkit/content/extensions/child/ext-test.js",
   "start": 1165645,
   "end": 1178918
  }, {
   "filename": "/gre/chrome/toolkit/content/extensions/child/ext-toolkit.js",
   "start": 1178918,
   "end": 1181650
  }, {
   "filename": "/gre/chrome/toolkit/content/extensions/child/ext-userScripts-content.js",
   "start": 1181650,
   "end": 1194194
  }, {
   "filename": "/gre/chrome/toolkit/content/extensions/child/ext-userScripts.js",
   "start": 1194194,
   "end": 1199466
  }, {
   "filename": "/gre/chrome/toolkit/content/extensions/child/ext-webRequest.js",
   "start": 1199466,
   "end": 1204198
  }, {
   "filename": "/gre/chrome/toolkit/content/extensions/dummy.xhtml",
   "start": 1204198,
   "end": 1204494
  }, {
   "filename": "/gre/chrome/toolkit/content/extensions/ext-browser-content.js",
   "start": 1204494,
   "end": 1213064
  }, {
   "filename": "/gre/chrome/toolkit/content/extensions/ext-toolkit.json",
   "start": 1213064,
   "end": 1220301
  }, {
   "filename": "/gre/chrome/toolkit/content/extensions/parent/ext-activityLog.js",
   "start": 1220301,
   "end": 1221524
  }, {
   "filename": "/gre/chrome/toolkit/content/extensions/parent/ext-alarms.js",
   "start": 1221524,
   "end": 1225262
  }, {
   "filename": "/gre/chrome/toolkit/content/extensions/parent/ext-backgroundPage.js",
   "start": 1225262,
   "end": 1268841
  }, {
   "filename": "/gre/chrome/toolkit/content/extensions/parent/ext-browserSettings.js",
   "start": 1268841,
   "end": 1286673
  }, {
   "filename": "/gre/chrome/toolkit/content/extensions/parent/ext-browsingData.js",
   "start": 1286673,
   "end": 1300218
  }, {
   "filename": "/gre/chrome/toolkit/content/extensions/parent/ext-captivePortal.js",
   "start": 1300218,
   "end": 1304268
  }, {
   "filename": "/gre/chrome/toolkit/content/extensions/parent/ext-clipboard.js",
   "start": 1304268,
   "end": 1307611
  }, {
   "filename": "/gre/chrome/toolkit/content/extensions/parent/ext-contentScripts.js",
   "start": 1307611,
   "end": 1314384
  }, {
   "filename": "/gre/chrome/toolkit/content/extensions/parent/ext-contextualIdentities.js",
   "start": 1314384,
   "end": 1324683
  }, {
   "filename": "/gre/chrome/toolkit/content/extensions/parent/ext-cookies.js",
   "start": 1324683,
   "end": 1352282
  }, {
   "filename": "/gre/chrome/toolkit/content/extensions/parent/ext-declarativeNetRequest.js",
   "start": 1352282,
   "end": 1358848
  }, {
   "filename": "/gre/chrome/toolkit/content/extensions/parent/ext-dns.js",
   "start": 1358848,
   "end": 1361829
  }, {
   "filename": "/gre/chrome/toolkit/content/extensions/parent/ext-downloads.js",
   "start": 1361829,
   "end": 1398539
  }, {
   "filename": "/gre/chrome/toolkit/content/extensions/parent/ext-extension.js",
   "start": 1398539,
   "end": 1399637
  }, {
   "filename": "/gre/chrome/toolkit/content/extensions/parent/ext-geckoProfiler.js",
   "start": 1399637,
   "end": 1405196
  }, {
   "filename": "/gre/chrome/toolkit/content/extensions/parent/ext-i18n.js",
   "start": 1405196,
   "end": 1406790
  }, {
   "filename": "/gre/chrome/toolkit/content/extensions/parent/ext-identity.js",
   "start": 1406790,
   "end": 1411933
  }, {
   "filename": "/gre/chrome/toolkit/content/extensions/parent/ext-idle.js",
   "start": 1411933,
   "end": 1415318
  }, {
   "filename": "/gre/chrome/toolkit/content/extensions/parent/ext-management.js",
   "start": 1415318,
   "end": 1425444
  }, {
   "filename": "/gre/chrome/toolkit/content/extensions/parent/ext-networkStatus.js",
   "start": 1425444,
   "end": 1427642
  }, {
   "filename": "/gre/chrome/toolkit/content/extensions/parent/ext-notifications.js",
   "start": 1427642,
   "end": 1434405
  }, {
   "filename": "/gre/chrome/toolkit/content/extensions/parent/ext-permissions.js",
   "start": 1434405,
   "end": 1443912
  }, {
   "filename": "/gre/chrome/toolkit/content/extensions/parent/ext-privacy.js",
   "start": 1443912,
   "end": 1458029
  }, {
   "filename": "/gre/chrome/toolkit/content/extensions/parent/ext-protocolHandlers.js",
   "start": 1458029,
   "end": 1460954
  }, {
   "filename": "/gre/chrome/toolkit/content/extensions/parent/ext-proxy.js",
   "start": 1460954,
   "end": 1472215
  }, {
   "filename": "/gre/chrome/toolkit/content/extensions/parent/ext-runtime.js",
   "start": 1472215,
   "end": 1484799
  }, {
   "filename": "/gre/chrome/toolkit/content/extensions/parent/ext-scripting.js",
   "start": 1484799,
   "end": 1497550
  }, {
   "filename": "/gre/chrome/toolkit/content/extensions/parent/ext-storage.js",
   "start": 1497550,
   "end": 1511696
  }, {
   "filename": "/gre/chrome/toolkit/content/extensions/parent/ext-tabs-base.js",
   "start": 1511696,
   "end": 1589531
  }, {
   "filename": "/gre/chrome/toolkit/content/extensions/parent/ext-telemetry.js",
   "start": 1589531,
   "end": 1592523
  }, {
   "filename": "/gre/chrome/toolkit/content/extensions/parent/ext-theme.js",
   "start": 1592523,
   "end": 1600961
  }, {
   "filename": "/gre/chrome/toolkit/content/extensions/parent/ext-toolkit.js",
   "start": 1600961,
   "end": 1604408
  }, {
   "filename": "/gre/chrome/toolkit/content/extensions/parent/ext-trial-ml.js",
   "start": 1604408,
   "end": 1611760
  }, {
   "filename": "/gre/chrome/toolkit/content/extensions/parent/ext-userScripts.js",
   "start": 1611760,
   "end": 1620716
  }, {
   "filename": "/gre/chrome/toolkit/content/extensions/parent/ext-webNavigation.js",
   "start": 1620716,
   "end": 1630960
  }, {
   "filename": "/gre/chrome/toolkit/content/extensions/parent/ext-webRequest.js",
   "start": 1630960,
   "end": 1638953
  }, {
   "filename": "/gre/chrome/toolkit/content/extensions/schemas/activity_log.json",
   "start": 1638953,
   "end": 1642165
  }, {
   "filename": "/gre/chrome/toolkit/content/extensions/schemas/alarms.json",
   "start": 1642165,
   "end": 1647604
  }, {
   "filename": "/gre/chrome/toolkit/content/extensions/schemas/browser_action.json",
   "start": 1647604,
   "end": 1665701
  }, {
   "filename": "/gre/chrome/toolkit/content/extensions/schemas/browser_settings.json",
   "start": 1665701,
   "end": 1671460
  }, {
   "filename": "/gre/chrome/toolkit/content/extensions/schemas/browsing_data.json",
   "start": 1671460,
   "end": 1684771
  }, {
   "filename": "/gre/chrome/toolkit/content/extensions/schemas/captive_portal.json",
   "start": 1684771,
   "end": 1687085
  }, {
   "filename": "/gre/chrome/toolkit/content/extensions/schemas/clipboard.json",
   "start": 1687085,
   "end": 1688083
  }, {
   "filename": "/gre/chrome/toolkit/content/extensions/schemas/content_scripts.json",
   "start": 1688083,
   "end": 1692550
  }, {
   "filename": "/gre/chrome/toolkit/content/extensions/schemas/contextual_identities.json",
   "start": 1692550,
   "end": 1701623
  }, {
   "filename": "/gre/chrome/toolkit/content/extensions/schemas/cookies.json",
   "start": 1701623,
   "end": 1721839
  }, {
   "filename": "/gre/chrome/toolkit/content/extensions/schemas/declarative_net_request.json",
   "start": 1721839,
   "end": 1754209
  }, {
   "filename": "/gre/chrome/toolkit/content/extensions/schemas/dns.json",
   "start": 1754209,
   "end": 1756108
  }, {
   "filename": "/gre/chrome/toolkit/content/extensions/schemas/downloads.json",
   "start": 1756108,
   "end": 1785500
  }, {
   "filename": "/gre/chrome/toolkit/content/extensions/schemas/events.json",
   "start": 1785500,
   "end": 1798969
  }, {
   "filename": "/gre/chrome/toolkit/content/extensions/schemas/experiments.json",
   "start": 1798969,
   "end": 1801731
  }, {
   "filename": "/gre/chrome/toolkit/content/extensions/schemas/extension.json",
   "start": 1801731,
   "end": 1809363
  }, {
   "filename": "/gre/chrome/toolkit/content/extensions/schemas/extension_protocol_handlers.json",
   "start": 1809363,
   "end": 1811781
  }, {
   "filename": "/gre/chrome/toolkit/content/extensions/schemas/extension_types.json",
   "start": 1811781,
   "end": 1818202
  }, {
   "filename": "/gre/chrome/toolkit/content/extensions/schemas/geckoProfiler.json",
   "start": 1818202,
   "end": 1824222
  }, {
   "filename": "/gre/chrome/toolkit/content/extensions/schemas/i18n.json",
   "start": 1824222,
   "end": 1829980
  }, {
   "filename": "/gre/chrome/toolkit/content/extensions/schemas/identity.json",
   "start": 1829980,
   "end": 1835755
  }, {
   "filename": "/gre/chrome/toolkit/content/extensions/schemas/idle.json",
   "start": 1835755,
   "end": 1837877
  }, {
   "filename": "/gre/chrome/toolkit/content/extensions/schemas/management.json",
   "start": 1837877,
   "end": 1849573
  }, {
   "filename": "/gre/chrome/toolkit/content/extensions/schemas/manifest.json",
   "start": 1849573,
   "end": 1875193
  }, {
   "filename": "/gre/chrome/toolkit/content/extensions/schemas/native_manifest.json",
   "start": 1875193,
   "end": 1876640
  }, {
   "filename": "/gre/chrome/toolkit/content/extensions/schemas/network_status.json",
   "start": 1876640,
   "end": 1878435
  }, {
   "filename": "/gre/chrome/toolkit/content/extensions/schemas/notifications.json",
   "start": 1878435,
   "end": 1891455
  }, {
   "filename": "/gre/chrome/toolkit/content/extensions/schemas/page_action.json",
   "start": 1891455,
   "end": 1902430
  }, {
   "filename": "/gre/chrome/toolkit/content/extensions/schemas/permissions.json",
   "start": 1902430,
   "end": 1906714
  }, {
   "filename": "/gre/chrome/toolkit/content/extensions/schemas/privacy.json",
   "start": 1906714,
   "end": 1915029
  }, {
   "filename": "/gre/chrome/toolkit/content/extensions/schemas/proxy.json",
   "start": 1915029,
   "end": 1923381
  }, {
   "filename": "/gre/chrome/toolkit/content/extensions/schemas/public_suffix.json",
   "start": 1923381,
   "end": 1926913
  }, {
   "filename": "/gre/chrome/toolkit/content/extensions/schemas/runtime.json",
   "start": 1926913,
   "end": 1963762
  }, {
   "filename": "/gre/chrome/toolkit/content/extensions/schemas/scripting.json",
   "start": 1963762,
   "end": 1978816
  }, {
   "filename": "/gre/chrome/toolkit/content/extensions/schemas/storage.json",
   "start": 1978816,
   "end": 1991134
  }, {
   "filename": "/gre/chrome/toolkit/content/extensions/schemas/telemetry.json",
   "start": 1991134,
   "end": 2004321
  }, {
   "filename": "/gre/chrome/toolkit/content/extensions/schemas/test.json",
   "start": 2004321,
   "end": 2010643
  }, {
   "filename": "/gre/chrome/toolkit/content/extensions/schemas/theme.json",
   "start": 2010643,
   "end": 2026191
  }, {
   "filename": "/gre/chrome/toolkit/content/extensions/schemas/trial_ml.json",
   "start": 2026191,
   "end": 2028368
  }, {
   "filename": "/gre/chrome/toolkit/content/extensions/schemas/types.json",
   "start": 2028368,
   "end": 2035281
  }, {
   "filename": "/gre/chrome/toolkit/content/extensions/schemas/user_scripts.json",
   "start": 2035281,
   "end": 2054217
  }, {
   "filename": "/gre/chrome/toolkit/content/extensions/schemas/user_scripts_content.json",
   "start": 2054217,
   "end": 2056434
  }, {
   "filename": "/gre/chrome/toolkit/content/extensions/schemas/web_navigation.json",
   "start": 2056434,
   "end": 2082454
  }, {
   "filename": "/gre/chrome/toolkit/content/extensions/schemas/web_request.json",
   "start": 2082454,
   "end": 2148546
  }, {
   "filename": "/gre/chrome/toolkit/content/global/ScrollOffsets.mjs",
   "start": 2148546,
   "end": 2152455
  }, {
   "filename": "/gre/chrome/toolkit/content/global/TopLevelVideoDocument.js",
   "start": 2152455,
   "end": 2154748
  }, {
   "filename": "/gre/chrome/toolkit/content/global/aboutAbout.html",
   "start": 2154748,
   "end": 2155848
  }, {
   "filename": "/gre/chrome/toolkit/content/global/aboutAbout.js",
   "start": 2155848,
   "end": 2156601
  }, {
   "filename": "/gre/chrome/toolkit/content/global/aboutCheckerboard.css",
   "start": 2156601,
   "end": 2157340
  }, {
   "filename": "/gre/chrome/toolkit/content/global/aboutCheckerboard.html",
   "start": 2157340,
   "end": 2159753
  }, {
   "filename": "/gre/chrome/toolkit/content/global/aboutCheckerboard.js",
   "start": 2159753,
   "end": 2167977
  }, {
   "filename": "/gre/chrome/toolkit/content/global/aboutGlean.css",
   "start": 2167977,
   "end": 2171504
  }, {
   "filename": "/gre/chrome/toolkit/content/global/aboutGlean.html",
   "start": 2171504,
   "end": 2186247
  }, {
   "filename": "/gre/chrome/toolkit/content/global/aboutGlean.js",
   "start": 2186247,
   "end": 2220082
  }, {
   "filename": "/gre/chrome/toolkit/content/global/aboutInference.css",
   "start": 2220082,
   "end": 2223777
  }, {
   "filename": "/gre/chrome/toolkit/content/global/aboutInference.html",
   "start": 2223777,
   "end": 2231588
  }, {
   "filename": "/gre/chrome/toolkit/content/global/aboutInference.js",
   "start": 2231588,
   "end": 2280149
  }, {
   "filename": "/gre/chrome/toolkit/content/global/aboutMemory.css",
   "start": 2280149,
   "end": 2284481
  }, {
   "filename": "/gre/chrome/toolkit/content/global/aboutMemory.xhtml",
   "start": 2284481,
   "end": 2286006
  }, {
   "filename": "/gre/chrome/toolkit/content/global/aboutMozilla.css",
   "start": 2286006,
   "end": 2286704
  }, {
   "filename": "/gre/chrome/toolkit/content/global/aboutNetError.html",
   "start": 2286704,
   "end": 2293135
  }, {
   "filename": "/gre/chrome/toolkit/content/global/aboutNetError.mjs",
   "start": 2293135,
   "end": 2337341
  }, {
   "filename": "/gre/chrome/toolkit/content/global/aboutNetErrorHelpers.mjs",
   "start": 2337341,
   "end": 2347743
  }, {
   "filename": "/gre/chrome/toolkit/content/global/aboutNetworking.html",
   "start": 2347743,
   "end": 2356670
  }, {
   "filename": "/gre/chrome/toolkit/content/global/aboutNetworking.js",
   "start": 2356670,
   "end": 2371241
  }, {
   "filename": "/gre/chrome/toolkit/content/global/aboutPDF.css",
   "start": 2371241,
   "end": 2375381
  }, {
   "filename": "/gre/chrome/toolkit/content/global/aboutPDF.html",
   "start": 2375381,
   "end": 2378491
  }, {
   "filename": "/gre/chrome/toolkit/content/global/aboutPDF.mjs",
   "start": 2378491,
   "end": 2382574
  }, {
   "filename": "/gre/chrome/toolkit/content/global/aboutProcesses.css",
   "start": 2382574,
   "end": 2389929
  }, {
   "filename": "/gre/chrome/toolkit/content/global/aboutProcesses.html",
   "start": 2389929,
   "end": 2392080
  }, {
   "filename": "/gre/chrome/toolkit/content/global/aboutProfiles.js",
   "start": 2392080,
   "end": 2403434
  }, {
   "filename": "/gre/chrome/toolkit/content/global/aboutProfiles.xhtml",
   "start": 2403434,
   "end": 2405354
  }, {
   "filename": "/gre/chrome/toolkit/content/global/aboutRestricted/aboutRestricted.css",
   "start": 2405354,
   "end": 2405928
  }, {
   "filename": "/gre/chrome/toolkit/content/global/aboutRestricted/aboutRestricted.html",
   "start": 2405928,
   "end": 2407516
  }, {
   "filename": "/gre/chrome/toolkit/content/global/aboutRestricted/aboutRestricted.mjs",
   "start": 2407516,
   "end": 2408711
  }, {
   "filename": "/gre/chrome/toolkit/content/global/aboutServiceWorkers.js",
   "start": 2408711,
   "end": 2413710
  }, {
   "filename": "/gre/chrome/toolkit/content/global/aboutServiceWorkers.xhtml",
   "start": 2413710,
   "end": 2415421
  }, {
   "filename": "/gre/chrome/toolkit/content/global/aboutSupport.xhtml",
   "start": 2415421,
   "end": 2441543
  }, {
   "filename": "/gre/chrome/toolkit/content/global/aboutTelemetry.css",
   "start": 2441543,
   "end": 2447124
  }, {
   "filename": "/gre/chrome/toolkit/content/global/aboutTelemetry.xhtml",
   "start": 2447124,
   "end": 2457729
  }, {
   "filename": "/gre/chrome/toolkit/content/global/aboutUrlClassifier.css",
   "start": 2457729,
   "end": 2458411
  }, {
   "filename": "/gre/chrome/toolkit/content/global/aboutUrlClassifier.js",
   "start": 2458411,
   "end": 2480469
  }, {
   "filename": "/gre/chrome/toolkit/content/global/aboutUrlClassifier.xhtml",
   "start": 2480469,
   "end": 2486736
  }, {
   "filename": "/gre/chrome/toolkit/content/global/aboutWebauthn.css",
   "start": 2486736,
   "end": 2488286
  }, {
   "filename": "/gre/chrome/toolkit/content/global/aboutWebauthn.html",
   "start": 2488286,
   "end": 2497964
  }, {
   "filename": "/gre/chrome/toolkit/content/global/aboutWebauthn.js",
   "start": 2497964,
   "end": 2528258
  }, {
   "filename": "/gre/chrome/toolkit/content/global/aboutconfig/aboutconfig.css",
   "start": 2528258,
   "end": 2535024
  }, {
   "filename": "/gre/chrome/toolkit/content/global/aboutconfig/aboutconfig.html",
   "start": 2535024,
   "end": 2538192
  }, {
   "filename": "/gre/chrome/toolkit/content/global/aboutconfig/aboutconfig.js",
   "start": 2538192,
   "end": 2560510
  }, {
   "filename": "/gre/chrome/toolkit/content/global/aboutconfig/background.svg",
   "start": 2560510,
   "end": 2567365
  }, {
   "filename": "/gre/chrome/toolkit/content/global/aboutconfig/toggle.svg",
   "start": 2567365,
   "end": 2567868
  }, {
   "filename": "/gre/chrome/toolkit/content/global/adjustableTitle.js",
   "start": 2567868,
   "end": 2573475
  }, {
   "filename": "/gre/chrome/toolkit/content/global/alerts/alert.css",
   "start": 2573475,
   "end": 2574209
  }, {
   "filename": "/gre/chrome/toolkit/content/global/alerts/alert.js",
   "start": 2574209,
   "end": 2587720
  }, {
   "filename": "/gre/chrome/toolkit/content/global/alerts/alert.xhtml",
   "start": 2587720,
   "end": 2589770
  }, {
   "filename": "/gre/chrome/toolkit/content/global/antitracking/StripOnShare.json",
   "start": 2589770,
   "end": 2594062
  }, {
   "filename": "/gre/chrome/toolkit/content/global/antitracking/StripOnShareLGPL.json",
   "start": 2594062,
   "end": 2606326
  }, {
   "filename": "/gre/chrome/toolkit/content/global/appPicker.js",
   "start": 2606326,
   "end": 2612690
  }, {
   "filename": "/gre/chrome/toolkit/content/global/appPicker.xhtml",
   "start": 2612690,
   "end": 2614290
  }, {
   "filename": "/gre/chrome/toolkit/content/global/autocomplete-row-item/autocomplete-row-item.css",
   "start": 2614290,
   "end": 2615394
  }, {
   "filename": "/gre/chrome/toolkit/content/global/autocomplete-row-item/autocomplete-row-item.mjs",
   "start": 2615394,
   "end": 2619079
  }, {
   "filename": "/gre/chrome/toolkit/content/global/autocomplete.css",
   "start": 2619079,
   "end": 2619612
  }, {
   "filename": "/gre/chrome/toolkit/content/global/backgroundPageThumbs.xhtml",
   "start": 2619612,
   "end": 2620309
  }, {
   "filename": "/gre/chrome/toolkit/content/global/bindings/calendar.js",
   "start": 2620309,
   "end": 2637331
  }, {
   "filename": "/gre/chrome/toolkit/content/global/bindings/colorpicker-common.mjs",
   "start": 2637331,
   "end": 2647433
  }, {
   "filename": "/gre/chrome/toolkit/content/global/bindings/colorpicker.mjs",
   "start": 2647433,
   "end": 2648680
  }, {
   "filename": "/gre/chrome/toolkit/content/global/bindings/datekeeper.js",
   "start": 2648680,
   "end": 2661935
  }, {
   "filename": "/gre/chrome/toolkit/content/global/bindings/datepicker.js",
   "start": 2661935,
   "end": 2680091
  }, {
   "filename": "/gre/chrome/toolkit/content/global/bindings/datetimebox.css",
   "start": 2680091,
   "end": 2682609
  }, {
   "filename": "/gre/chrome/toolkit/content/global/bindings/spinner.js",
   "start": 2682609,
   "end": 2705323
  }, {
   "filename": "/gre/chrome/toolkit/content/global/bindings/timekeeper.js",
   "start": 2705323,
   "end": 2720170
  }, {
   "filename": "/gre/chrome/toolkit/content/global/bindings/timepicker.js",
   "start": 2720170,
   "end": 2735398
  }, {
   "filename": "/gre/chrome/toolkit/content/global/buildconfig.css",
   "start": 2735398,
   "end": 2735702
  }, {
   "filename": "/gre/chrome/toolkit/content/global/buildconfig.html",
   "start": 2735702,
   "end": 2738586
  }, {
   "filename": "/gre/chrome/toolkit/content/global/colorpicker.html",
   "start": 2738586,
   "end": 2739663
  }, {
   "filename": "/gre/chrome/toolkit/content/global/commonDialog.css",
   "start": 2739663,
   "end": 2742253
  }, {
   "filename": "/gre/chrome/toolkit/content/global/commonDialog.js",
   "start": 2742253,
   "end": 2748083
  }, {
   "filename": "/gre/chrome/toolkit/content/global/commonDialog.xhtml",
   "start": 2748083,
   "end": 2751338
  }, {
   "filename": "/gre/chrome/toolkit/content/global/contentAreaUtils.js",
   "start": 2751338,
   "end": 2792354
  }, {
   "filename": "/gre/chrome/toolkit/content/global/cookiebanners/CookieBannerRule.schema.json",
   "start": 2792354,
   "end": 2797697
  }, {
   "filename": "/gre/chrome/toolkit/content/global/customElements.js",
   "start": 2797697,
   "end": 2831913
  }, {
   "filename": "/gre/chrome/toolkit/content/global/datetimepicker.xhtml",
   "start": 2831913,
   "end": 2834631
  }, {
   "filename": "/gre/chrome/toolkit/content/global/editMenuOverlay.js",
   "start": 2834631,
   "end": 2840480
  }, {
   "filename": "/gre/chrome/toolkit/content/global/elements/arrowscrollbox.js",
   "start": 2840480,
   "end": 2865452
  }, {
   "filename": "/gre/chrome/toolkit/content/global/elements/autocomplete-input.js",
   "start": 2865452,
   "end": 2882425
  }, {
   "filename": "/gre/chrome/toolkit/content/global/elements/autocomplete-popup.js",
   "start": 2882425,
   "end": 2903756
  }, {
   "filename": "/gre/chrome/toolkit/content/global/elements/autocomplete-richlistitem.js",
   "start": 2903756,
   "end": 2932570
  }, {
   "filename": "/gre/chrome/toolkit/content/global/elements/browser-custom-element.mjs",
   "start": 2932570,
   "end": 2992358
  }, {
   "filename": "/gre/chrome/toolkit/content/global/elements/button.js",
   "start": 2992358,
   "end": 3001159
  }, {
   "filename": "/gre/chrome/toolkit/content/global/elements/checkbox.js",
   "start": 3001159,
   "end": 3002481
  }, {
   "filename": "/gre/chrome/toolkit/content/global/elements/datetimebox.js",
   "start": 3002481,
   "end": 3046460
  }, {
   "filename": "/gre/chrome/toolkit/content/global/elements/dialog.js",
   "start": 3046460,
   "end": 3064575
  }, {
   "filename": "/gre/chrome/toolkit/content/global/elements/editor.js",
   "start": 3064575,
   "end": 3070177
  }, {
   "filename": "/gre/chrome/toolkit/content/global/elements/findbar.js",
   "start": 3070177,
   "end": 3116174
  }, {
   "filename": "/gre/chrome/toolkit/content/global/elements/general.js",
   "start": 3116174,
   "end": 3117107
  }, {
   "filename": "/gre/chrome/toolkit/content/global/elements/infobar.css",
   "start": 3117107,
   "end": 3119706
  }, {
   "filename": "/gre/chrome/toolkit/content/global/elements/marquee.css",
   "start": 3119706,
   "end": 3120243
  }, {
   "filename": "/gre/chrome/toolkit/content/global/elements/marquee.js",
   "start": 3120243,
   "end": 3129928
  }, {
   "filename": "/gre/chrome/toolkit/content/global/elements/menu.js",
   "start": 3129928,
   "end": 3141194
  }, {
   "filename": "/gre/chrome/toolkit/content/global/elements/menulist.js",
   "start": 3141194,
   "end": 3152707
  }, {
   "filename": "/gre/chrome/toolkit/content/global/elements/menupopup.css",
   "start": 3152707,
   "end": 3153197
  }, {
   "filename": "/gre/chrome/toolkit/content/global/elements/menupopup.js",
   "start": 3153197,
   "end": 3162538
  }, {
   "filename": "/gre/chrome/toolkit/content/global/elements/moz-badge.css",
   "start": 3162538,
   "end": 3163706
  }, {
   "filename": "/gre/chrome/toolkit/content/global/elements/moz-badge.mjs",
   "start": 3163706,
   "end": 3165768
  }, {
   "filename": "/gre/chrome/toolkit/content/global/elements/moz-badge.tokens.css",
   "start": 3165768,
   "end": 3168069
  }, {
   "filename": "/gre/chrome/toolkit/content/global/elements/moz-box-button.css",
   "start": 3168069,
   "end": 3168301
  }, {
   "filename": "/gre/chrome/toolkit/content/global/elements/moz-box-button.mjs",
   "start": 3168301,
   "end": 3170501
  }, {
   "filename": "/gre/chrome/toolkit/content/global/elements/moz-box-common.css",
   "start": 3170501,
   "end": 3174912
  }, {
   "filename": "/gre/chrome/toolkit/content/global/elements/moz-box-group.css",
   "start": 3174912,
   "end": 3176258
  }, {
   "filename": "/gre/chrome/toolkit/content/global/elements/moz-box-group.mjs",
   "start": 3176258,
   "end": 3188837
  }, {
   "filename": "/gre/chrome/toolkit/content/global/elements/moz-box-item.css",
   "start": 3188837,
   "end": 3190919
  }, {
   "filename": "/gre/chrome/toolkit/content/global/elements/moz-box-item.mjs",
   "start": 3190919,
   "end": 3199937
  }, {
   "filename": "/gre/chrome/toolkit/content/global/elements/moz-box-link.css",
   "start": 3199937,
   "end": 3200177
  }, {
   "filename": "/gre/chrome/toolkit/content/global/elements/moz-box-link.mjs",
   "start": 3200177,
   "end": 3202377
  }, {
   "filename": "/gre/chrome/toolkit/content/global/elements/moz-box.tokens.css",
   "start": 3202377,
   "end": 3204049
  }, {
   "filename": "/gre/chrome/toolkit/content/global/elements/moz-breadcrumb-group.css",
   "start": 3204049,
   "end": 3204946
  }, {
   "filename": "/gre/chrome/toolkit/content/global/elements/moz-breadcrumb-group.mjs",
   "start": 3204946,
   "end": 3208217
  }, {
   "filename": "/gre/chrome/toolkit/content/global/elements/moz-breadcrumb.css",
   "start": 3208217,
   "end": 3208804
  }, {
   "filename": "/gre/chrome/toolkit/content/global/elements/moz-breadcrumb.tokens.css",
   "start": 3208804,
   "end": 3209727
  }, {
   "filename": "/gre/chrome/toolkit/content/global/elements/moz-button-group.css",
   "start": 3209727,
   "end": 3210204
  }, {
   "filename": "/gre/chrome/toolkit/content/global/elements/moz-button-group.mjs",
   "start": 3210204,
   "end": 3213488
  }, {
   "filename": "/gre/chrome/toolkit/content/global/elements/moz-button.css",
   "start": 3213488,
   "end": 3224995
  }, {
   "filename": "/gre/chrome/toolkit/content/global/elements/moz-button.mjs",
   "start": 3224995,
   "end": 3238518
  }, {
   "filename": "/gre/chrome/toolkit/content/global/elements/moz-card.css",
   "start": 3238518,
   "end": 3242198
  }, {
   "filename": "/gre/chrome/toolkit/content/global/elements/moz-card.mjs",
   "start": 3242198,
   "end": 3246614
  }, {
   "filename": "/gre/chrome/toolkit/content/global/elements/moz-checkbox-icon.svg",
   "start": 3246614,
   "end": 3247047
  }, {
   "filename": "/gre/chrome/toolkit/content/global/elements/moz-checkbox.css",
   "start": 3247047,
   "end": 3249012
  }, {
   "filename": "/gre/chrome/toolkit/content/global/elements/moz-checkbox.mjs",
   "start": 3249012,
   "end": 3252315
  }, {
   "filename": "/gre/chrome/toolkit/content/global/elements/moz-fieldset.css",
   "start": 3252315,
   "end": 3253912
  }, {
   "filename": "/gre/chrome/toolkit/content/global/elements/moz-fieldset.mjs",
   "start": 3253912,
   "end": 3259369
  }, {
   "filename": "/gre/chrome/toolkit/content/global/elements/moz-five-star.css",
   "start": 3259369,
   "end": 3260808
  }, {
   "filename": "/gre/chrome/toolkit/content/global/elements/moz-five-star.mjs",
   "start": 3260808,
   "end": 3264841
  }, {
   "filename": "/gre/chrome/toolkit/content/global/elements/moz-input-box.js",
   "start": 3264841,
   "end": 3272825
  }, {
   "filename": "/gre/chrome/toolkit/content/global/elements/moz-input-color.css",
   "start": 3272825,
   "end": 3274673
  }, {
   "filename": "/gre/chrome/toolkit/content/global/elements/moz-input-color.mjs",
   "start": 3274673,
   "end": 3277025
  }, {
   "filename": "/gre/chrome/toolkit/content/global/elements/moz-input-color.tokens.css",
   "start": 3277025,
   "end": 3279180
  }, {
   "filename": "/gre/chrome/toolkit/content/global/elements/moz-input-common.css",
   "start": 3279180,
   "end": 3283877
  }, {
   "filename": "/gre/chrome/toolkit/content/global/elements/moz-input-email.mjs",
   "start": 3283877,
   "end": 3285088
  }, {
   "filename": "/gre/chrome/toolkit/content/global/elements/moz-input-folder.css",
   "start": 3285088,
   "end": 3285793
  }, {
   "filename": "/gre/chrome/toolkit/content/global/elements/moz-input-folder.mjs",
   "start": 3285793,
   "end": 3291825
  }, {
   "filename": "/gre/chrome/toolkit/content/global/elements/moz-input-number.mjs",
   "start": 3291825,
   "end": 3293041
  }, {
   "filename": "/gre/chrome/toolkit/content/global/elements/moz-input-password.mjs",
   "start": 3293041,
   "end": 3294269
  }, {
   "filename": "/gre/chrome/toolkit/content/global/elements/moz-input-search.mjs",
   "start": 3294269,
   "end": 3297415
  }, {
   "filename": "/gre/chrome/toolkit/content/global/elements/moz-input-tel.mjs",
   "start": 3297415,
   "end": 3298619
  }, {
   "filename": "/gre/chrome/toolkit/content/global/elements/moz-input-text.css",
   "start": 3298619,
   "end": 3300346
  }, {
   "filename": "/gre/chrome/toolkit/content/global/elements/moz-input-text.mjs",
   "start": 3300346,
   "end": 3302965
  }, {
   "filename": "/gre/chrome/toolkit/content/global/elements/moz-input-url.mjs",
   "start": 3302965,
   "end": 3304163
  }, {
   "filename": "/gre/chrome/toolkit/content/global/elements/moz-label.css",
   "start": 3304163,
   "end": 3304458
  }, {
   "filename": "/gre/chrome/toolkit/content/global/elements/moz-label.mjs",
   "start": 3304458,
   "end": 3313971
  }, {
   "filename": "/gre/chrome/toolkit/content/global/elements/moz-message-bar.css",
   "start": 3313971,
   "end": 3317944
  }, {
   "filename": "/gre/chrome/toolkit/content/global/elements/moz-message-bar.mjs",
   "start": 3317944,
   "end": 3324584
  }, {
   "filename": "/gre/chrome/toolkit/content/global/elements/moz-message-bar.tokens.css",
   "start": 3324584,
   "end": 3329003
  }, {
   "filename": "/gre/chrome/toolkit/content/global/elements/moz-page-header.css",
   "start": 3329003,
   "end": 3329832
  }, {
   "filename": "/gre/chrome/toolkit/content/global/elements/moz-page-header.mjs",
   "start": 3329832,
   "end": 3334172
  }, {
   "filename": "/gre/chrome/toolkit/content/global/elements/moz-page-nav-button.css",
   "start": 3334172,
   "end": 3338301
  }, {
   "filename": "/gre/chrome/toolkit/content/global/elements/moz-page-nav.css",
   "start": 3338301,
   "end": 3341516
  }, {
   "filename": "/gre/chrome/toolkit/content/global/elements/moz-page-nav.mjs",
   "start": 3341516,
   "end": 3351251
  }, {
   "filename": "/gre/chrome/toolkit/content/global/elements/moz-page-nav.tokens.css",
   "start": 3351251,
   "end": 3352280
  }, {
   "filename": "/gre/chrome/toolkit/content/global/elements/moz-promo.css",
   "start": 3352280,
   "end": 3355411
  }, {
   "filename": "/gre/chrome/toolkit/content/global/elements/moz-promo.mjs",
   "start": 3355411,
   "end": 3358672
  }, {
   "filename": "/gre/chrome/toolkit/content/global/elements/moz-promo.tokens.css",
   "start": 3358672,
   "end": 3361279
  }, {
   "filename": "/gre/chrome/toolkit/content/global/elements/moz-radio-group.mjs",
   "start": 3361279,
   "end": 3364885
  }, {
   "filename": "/gre/chrome/toolkit/content/global/elements/moz-reorderable-list.css",
   "start": 3364885,
   "end": 3365710
  }, {
   "filename": "/gre/chrome/toolkit/content/global/elements/moz-reorderable-list.mjs",
   "start": 3365710,
   "end": 3379860
  }, {
   "filename": "/gre/chrome/toolkit/content/global/elements/moz-reorderable-list.tokens.css",
   "start": 3379860,
   "end": 3380665
  }, {
   "filename": "/gre/chrome/toolkit/content/global/elements/moz-select.css",
   "start": 3380665,
   "end": 3384076
  }, {
   "filename": "/gre/chrome/toolkit/content/global/elements/moz-select.mjs",
   "start": 3384076,
   "end": 3398577
  }, {
   "filename": "/gre/chrome/toolkit/content/global/elements/moz-select.tokens.css",
   "start": 3398577,
   "end": 3400178
  }, {
   "filename": "/gre/chrome/toolkit/content/global/elements/moz-support-link.mjs",
   "start": 3400178,
   "end": 3404504
  }, {
   "filename": "/gre/chrome/toolkit/content/global/elements/moz-textarea.css",
   "start": 3404504,
   "end": 3404842
  }, {
   "filename": "/gre/chrome/toolkit/content/global/elements/moz-textarea.mjs",
   "start": 3404842,
   "end": 3407324
  }, {
   "filename": "/gre/chrome/toolkit/content/global/elements/moz-toggle.css",
   "start": 3407324,
   "end": 3410886
  }, {
   "filename": "/gre/chrome/toolkit/content/global/elements/moz-toggle.mjs",
   "start": 3410886,
   "end": 3413303
  }, {
   "filename": "/gre/chrome/toolkit/content/global/elements/moz-toggle.tokens.css",
   "start": 3413303,
   "end": 3416092
  }, {
   "filename": "/gre/chrome/toolkit/content/global/elements/moz-visual-picker-item.css",
   "start": 3416092,
   "end": 3418285
  }, {
   "filename": "/gre/chrome/toolkit/content/global/elements/moz-visual-picker-item.tokens.css",
   "start": 3418285,
   "end": 3419166
  }, {
   "filename": "/gre/chrome/toolkit/content/global/elements/moz-visual-picker.mjs",
   "start": 3419166,
   "end": 3424530
  }, {
   "filename": "/gre/chrome/toolkit/content/global/elements/named-deck.js",
   "start": 3424530,
   "end": 3436876
  }, {
   "filename": "/gre/chrome/toolkit/content/global/elements/notificationbox.js",
   "start": 3436876,
   "end": 3461289
  }, {
   "filename": "/gre/chrome/toolkit/content/global/elements/panel-item.css",
   "start": 3461289,
   "end": 3464120
  }, {
   "filename": "/gre/chrome/toolkit/content/global/elements/panel-list.css",
   "start": 3464120,
   "end": 3466393
  }, {
   "filename": "/gre/chrome/toolkit/content/global/elements/panel-list.js",
   "start": 3466393,
   "end": 3467066
  }, {
   "filename": "/gre/chrome/toolkit/content/global/elements/panel-list.mjs",
   "start": 3467066,
   "end": 3499214
  }, {
   "filename": "/gre/chrome/toolkit/content/global/elements/panel.js",
   "start": 3499214,
   "end": 3507559
  }, {
   "filename": "/gre/chrome/toolkit/content/global/elements/popupnotification.js",
   "start": 3507559,
   "end": 3516862
  }, {
   "filename": "/gre/chrome/toolkit/content/global/elements/radio.js",
   "start": 3516862,
   "end": 3531771
  }, {
   "filename": "/gre/chrome/toolkit/content/global/elements/richlistbox.js",
   "start": 3531771,
   "end": 3561901
  }, {
   "filename": "/gre/chrome/toolkit/content/global/elements/stringbundle.js",
   "start": 3561901,
   "end": 3563713
  }, {
   "filename": "/gre/chrome/toolkit/content/global/elements/tabbox.js",
   "start": 3563713,
   "end": 3600099
  }, {
   "filename": "/gre/chrome/toolkit/content/global/elements/text.js",
   "start": 3600099,
   "end": 3610773
  }, {
   "filename": "/gre/chrome/toolkit/content/global/elements/textrecognition.js",
   "start": 3610773,
   "end": 3621002
  }, {
   "filename": "/gre/chrome/toolkit/content/global/elements/toolbarbutton.js",
   "start": 3621002,
   "end": 3626772
  }, {
   "filename": "/gre/chrome/toolkit/content/global/elements/tree.js",
   "start": 3626772,
   "end": 3674650
  }, {
   "filename": "/gre/chrome/toolkit/content/global/elements/videocontrols.js",
   "start": 3674650,
   "end": 3790206
  }, {
   "filename": "/gre/chrome/toolkit/content/global/elements/wizard.js",
   "start": 3790206,
   "end": 3808227
  }, {
   "filename": "/gre/chrome/toolkit/content/global/errors/cert-errors.mjs",
   "start": 3808227,
   "end": 3822882
  }, {
   "filename": "/gre/chrome/toolkit/content/global/errors/error-lookup.mjs",
   "start": 3822882,
   "end": 3831275
  }, {
   "filename": "/gre/chrome/toolkit/content/global/errors/error-registry.mjs",
   "start": 3831275,
   "end": 3834582
  }, {
   "filename": "/gre/chrome/toolkit/content/global/errors/net-error-illustrations.mjs",
   "start": 3834582,
   "end": 3835042
  }, {
   "filename": "/gre/chrome/toolkit/content/global/errors/net-errors.mjs",
   "start": 3835042,
   "end": 3862692
  }, {
   "filename": "/gre/chrome/toolkit/content/global/errors/pkix-errors.mjs",
   "start": 3862692,
   "end": 3868991
  }, {
   "filename": "/gre/chrome/toolkit/content/global/errors/ssl-errors.mjs",
   "start": 3868991,
   "end": 3874790
  }, {
   "filename": "/gre/chrome/toolkit/content/global/filepicker.properties",
   "start": 3874790,
   "end": 3875576
  }, {
   "filename": "/gre/chrome/toolkit/content/global/globalOverlay.js",
   "start": 3875576,
   "end": 3879442
  }, {
   "filename": "/gre/chrome/toolkit/content/global/gmp-sources/openh264.json",
   "start": 3879442,
   "end": 3883062
  }, {
   "filename": "/gre/chrome/toolkit/content/global/gmp-sources/widevinecdm.json",
   "start": 3883062,
   "end": 3887813
  }, {
   "filename": "/gre/chrome/toolkit/content/global/gmp-sources/widevinecdm_l1.json",
   "start": 3887813,
   "end": 3888850
  }, {
   "filename": "/gre/chrome/toolkit/content/global/httpsonlyerror/errorpage.html",
   "start": 3888850,
   "end": 3891893
  }, {
   "filename": "/gre/chrome/toolkit/content/global/httpsonlyerror/errorpage.js",
   "start": 3891893,
   "end": 3897009
  }, {
   "filename": "/gre/chrome/toolkit/content/global/httpsonlyerror/secure-broken.svg",
   "start": 3897009,
   "end": 3897716
  }, {
   "filename": "/gre/chrome/toolkit/content/global/lit-select-control.mjs",
   "start": 3897716,
   "end": 3910337
  }, {
   "filename": "/gre/chrome/toolkit/content/global/lit-utils.mjs",
   "start": 3910337,
   "end": 3927714
  }, {
   "filename": "/gre/chrome/toolkit/content/global/model-files-view.css",
   "start": 3927714,
   "end": 3929813
  }, {
   "filename": "/gre/chrome/toolkit/content/global/model-files-view.mjs",
   "start": 3929813,
   "end": 3934269
  }, {
   "filename": "/gre/chrome/toolkit/content/global/mozilla.html",
   "start": 3934269,
   "end": 3935082
  }, {
   "filename": "/gre/chrome/toolkit/content/global/net-error-card.mjs",
   "start": 3935082,
   "end": 3969278
  }, {
   "filename": "/gre/chrome/toolkit/content/global/neterror/aboutNetErrorCodes.js",
   "start": 3969278,
   "end": 3981434
  }, {
   "filename": "/gre/chrome/toolkit/content/global/neterror/supportpages/connection-not-secure.html",
   "start": 3981434,
   "end": 3989771
  }, {
   "filename": "/gre/chrome/toolkit/content/global/neterror/supportpages/time-errors.html",
   "start": 3989771,
   "end": 4000622
  }, {
   "filename": "/gre/chrome/toolkit/content/global/pictureinpicture/player.js",
   "start": 4000622,
   "end": 4046350
  }, {
   "filename": "/gre/chrome/toolkit/content/global/pictureinpicture/player.xhtml",
   "start": 4046350,
   "end": 4052551
  }, {
   "filename": "/gre/chrome/toolkit/content/global/preferences/AsyncSetting.mjs",
   "start": 4052551,
   "end": 4059479
  }, {
   "filename": "/gre/chrome/toolkit/content/global/preferences/Preference.mjs",
   "start": 4059479,
   "end": 4071015
  }, {
   "filename": "/gre/chrome/toolkit/content/global/preferences/Preferences.mjs",
   "start": 4071015,
   "end": 4082565
  }, {
   "filename": "/gre/chrome/toolkit/content/global/preferences/Setting.mjs",
   "start": 4082565,
   "end": 4097285
  }, {
   "filename": "/gre/chrome/toolkit/content/global/preferencesBindings.js",
   "start": 4097285,
   "end": 4097679
  }, {
   "filename": "/gre/chrome/toolkit/content/global/print.css",
   "start": 4097679,
   "end": 4103089
  }, {
   "filename": "/gre/chrome/toolkit/content/global/print.html",
   "start": 4103089,
   "end": 4121419
  }, {
   "filename": "/gre/chrome/toolkit/content/global/print.js",
   "start": 4121419,
   "end": 4212955
  }, {
   "filename": "/gre/chrome/toolkit/content/global/printPagination.css",
   "start": 4212955,
   "end": 4216059
  }, {
   "filename": "/gre/chrome/toolkit/content/global/printPreview.css",
   "start": 4216059,
   "end": 4217793
  }, {
   "filename": "/gre/chrome/toolkit/content/global/printPreviewPagination.js",
   "start": 4217793,
   "end": 4223850
  }, {
   "filename": "/gre/chrome/toolkit/content/global/printUtils.js",
   "start": 4223850,
   "end": 4252325
  }, {
   "filename": "/gre/chrome/toolkit/content/global/process-content.js",
   "start": 4252325,
   "end": 4252995
  }, {
   "filename": "/gre/chrome/toolkit/content/global/reader/aboutReader.html",
   "start": 4252995,
   "end": 4261375
  }, {
   "filename": "/gre/chrome/toolkit/content/global/reader/moz-slider.css",
   "start": 4261375,
   "end": 4262261
  }, {
   "filename": "/gre/chrome/toolkit/content/global/reader/moz-slider.mjs",
   "start": 4262261,
   "end": 4265920
  }, {
   "filename": "/gre/chrome/toolkit/content/global/resetProfile.css",
   "start": 4265920,
   "end": 4266234
  }, {
   "filename": "/gre/chrome/toolkit/content/global/resetProfile.js",
   "start": 4266234,
   "end": 4267011
  }, {
   "filename": "/gre/chrome/toolkit/content/global/resetProfile.xhtml",
   "start": 4267011,
   "end": 4269276
  }, {
   "filename": "/gre/chrome/toolkit/content/global/resetProfileProgress.xhtml",
   "start": 4269276,
   "end": 4270328
  }, {
   "filename": "/gre/chrome/toolkit/content/global/resistfingerprinting/letterboxing.css",
   "start": 4270328,
   "end": 4271525
  }, {
   "filename": "/gre/chrome/toolkit/content/global/selectDialog.css",
   "start": 4271525,
   "end": 4271816
  }, {
   "filename": "/gre/chrome/toolkit/content/global/selectDialog.js",
   "start": 4271816,
   "end": 4274031
  }, {
   "filename": "/gre/chrome/toolkit/content/global/selectDialog.xhtml",
   "start": 4274031,
   "end": 4274950
  }, {
   "filename": "/gre/chrome/toolkit/content/global/simplifyMode.css",
   "start": 4274950,
   "end": 4275900
  }, {
   "filename": "/gre/chrome/toolkit/content/global/third_party/cfworker/json-schema.js",
   "start": 4275900,
   "end": 4327581
  }, {
   "filename": "/gre/chrome/toolkit/content/global/third_party/d3/d3.js",
   "start": 4327581,
   "end": 4665526
  }, {
   "filename": "/gre/chrome/toolkit/content/global/toggle-group.css",
   "start": 4665526,
   "end": 4667718
  }, {
   "filename": "/gre/chrome/toolkit/content/global/treeUtils.js",
   "start": 4667718,
   "end": 4669898
  }, {
   "filename": "/gre/chrome/toolkit/content/global/viewSourceUtils.js",
   "start": 4669898,
   "end": 4684184
  }, {
   "filename": "/gre/chrome/toolkit/content/global/viewZoomOverlay.js",
   "start": 4684184,
   "end": 4687867
  }, {
   "filename": "/gre/chrome/toolkit/content/global/widgets.css",
   "start": 4687867,
   "end": 4689258
  }, {
   "filename": "/gre/chrome/toolkit/content/global/win.xhtml",
   "start": 4689258,
   "end": 4689544
  }, {
   "filename": "/gre/chrome/toolkit/content/global/xml/XMLPrettyPrint.css",
   "start": 4689544,
   "end": 4690704
  }, {
   "filename": "/gre/chrome/toolkit/content/global/xml/XMLPrettyPrint.xsl",
   "start": 4690704,
   "end": 4695125
  }, {
   "filename": "/gre/chrome/toolkit/content/global/xul.css",
   "start": 4695125,
   "end": 4708460
  }, {
   "filename": "/gre/chrome/toolkit/content/mozapps/downloads/unknownContentType.xhtml",
   "start": 4708460,
   "end": 4712079
  }, {
   "filename": "/gre/chrome/toolkit/content/mozapps/extensions/OpenH264-license.txt",
   "start": 4712079,
   "end": 4716750
  }, {
   "filename": "/gre/chrome/toolkit/content/mozapps/extensions/aboutaddons-utils.mjs",
   "start": 4716750,
   "end": 4748724
  }, {
   "filename": "/gre/chrome/toolkit/content/mozapps/extensions/aboutaddons.css",
   "start": 4748724,
   "end": 4764901
  }, {
   "filename": "/gre/chrome/toolkit/content/mozapps/extensions/aboutaddons.html",
   "start": 4764901,
   "end": 4772607
  }, {
   "filename": "/gre/chrome/toolkit/content/mozapps/extensions/aboutaddons.mjs",
   "start": 4772607,
   "end": 4780129
  }, {
   "filename": "/gre/chrome/toolkit/content/mozapps/extensions/abuse-reports.mjs",
   "start": 4780129,
   "end": 4781039
  }, {
   "filename": "/gre/chrome/toolkit/content/mozapps/extensions/components/addon-card.mjs",
   "start": 4781039,
   "end": 4810667
  }, {
   "filename": "/gre/chrome/toolkit/content/mozapps/extensions/components/addon-details.mjs",
   "start": 4810667,
   "end": 4831935
  }, {
   "filename": "/gre/chrome/toolkit/content/mozapps/extensions/components/addon-list.mjs",
   "start": 4831935,
   "end": 4849903
  }, {
   "filename": "/gre/chrome/toolkit/content/mozapps/extensions/components/addon-mlmodel-details.css",
   "start": 4849903,
   "end": 4850453
  }, {
   "filename": "/gre/chrome/toolkit/content/mozapps/extensions/components/addon-mlmodel-details.mjs",
   "start": 4850453,
   "end": 4854387
  }, {
   "filename": "/gre/chrome/toolkit/content/mozapps/extensions/components/addon-options.mjs",
   "start": 4854387,
   "end": 4859157
  }, {
   "filename": "/gre/chrome/toolkit/content/mozapps/extensions/components/addon-page-header.mjs",
   "start": 4859157,
   "end": 4862848
  }, {
   "filename": "/gre/chrome/toolkit/content/mozapps/extensions/components/addon-page-options.mjs",
   "start": 4862848,
   "end": 4869987
  }, {
   "filename": "/gre/chrome/toolkit/content/mozapps/extensions/components/addon-permissions-list.mjs",
   "start": 4869987,
   "end": 4880586
  }, {
   "filename": "/gre/chrome/toolkit/content/mozapps/extensions/components/addon-shortcuts.mjs",
   "start": 4880586,
   "end": 4899710
  }, {
   "filename": "/gre/chrome/toolkit/content/mozapps/extensions/components/addon-sitepermissions-list.mjs",
   "start": 4899710,
   "end": 4901761
  }, {
   "filename": "/gre/chrome/toolkit/content/mozapps/extensions/components/addon-updates-message.mjs",
   "start": 4901761,
   "end": 4903692
  }, {
   "filename": "/gre/chrome/toolkit/content/mozapps/extensions/components/categories-box.mjs",
   "start": 4903692,
   "end": 4919143
  }, {
   "filename": "/gre/chrome/toolkit/content/mozapps/extensions/components/colorway-removal-notice.mjs",
   "start": 4919143,
   "end": 4921418
  }, {
   "filename": "/gre/chrome/toolkit/content/mozapps/extensions/components/discovery-pane.mjs",
   "start": 4921418,
   "end": 4922713
  }, {
   "filename": "/gre/chrome/toolkit/content/mozapps/extensions/components/drag-drop-addon-installer.mjs",
   "start": 4922713,
   "end": 4925156
  }, {
   "filename": "/gre/chrome/toolkit/content/mozapps/extensions/components/forced-colors-notice.mjs",
   "start": 4925156,
   "end": 4926719
  }, {
   "filename": "/gre/chrome/toolkit/content/mozapps/extensions/components/global-warnings.mjs",
   "start": 4926719,
   "end": 4931048
  }, {
   "filename": "/gre/chrome/toolkit/content/mozapps/extensions/components/inline-options-browser.mjs",
   "start": 4931048,
   "end": 4938946
  }, {
   "filename": "/gre/chrome/toolkit/content/mozapps/extensions/components/message-bar-stack.mjs",
   "start": 4938946,
   "end": 4941099
  }, {
   "filename": "/gre/chrome/toolkit/content/mozapps/extensions/components/mlmodel-card-header-additions.css",
   "start": 4941099,
   "end": 4942651
  }, {
   "filename": "/gre/chrome/toolkit/content/mozapps/extensions/components/mlmodel-card-header-additions.mjs",
   "start": 4942651,
   "end": 4944328
  }, {
   "filename": "/gre/chrome/toolkit/content/mozapps/extensions/components/mlmodel-card-list-additions.css",
   "start": 4944328,
   "end": 4944771
  }, {
   "filename": "/gre/chrome/toolkit/content/mozapps/extensions/components/mlmodel-card-list-additions.mjs",
   "start": 4944771,
   "end": 4947274
  }, {
   "filename": "/gre/chrome/toolkit/content/mozapps/extensions/components/mlmodel-list-intro.css",
   "start": 4947274,
   "end": 4947550
  }, {
   "filename": "/gre/chrome/toolkit/content/mozapps/extensions/components/mlmodel-list-intro.mjs",
   "start": 4947550,
   "end": 4948503
  }, {
   "filename": "/gre/chrome/toolkit/content/mozapps/extensions/components/plugin-options.mjs",
   "start": 4948503,
   "end": 4950129
  }, {
   "filename": "/gre/chrome/toolkit/content/mozapps/extensions/components/proxy-context-menu.mjs",
   "start": 4950129,
   "end": 4950700
  }, {
   "filename": "/gre/chrome/toolkit/content/mozapps/extensions/components/recommended-addon-card.mjs",
   "start": 4950700,
   "end": 4959039
  }, {
   "filename": "/gre/chrome/toolkit/content/mozapps/extensions/components/recommended-addon-list.mjs",
   "start": 4959039,
   "end": 4962878
  }, {
   "filename": "/gre/chrome/toolkit/content/mozapps/extensions/components/recommended-extensions-section.mjs",
   "start": 4962878,
   "end": 4964024
  }, {
   "filename": "/gre/chrome/toolkit/content/mozapps/extensions/components/recommended-footer.mjs",
   "start": 4964024,
   "end": 4965503
  }, {
   "filename": "/gre/chrome/toolkit/content/mozapps/extensions/components/recommended-section.mjs",
   "start": 4965503,
   "end": 4966994
  }, {
   "filename": "/gre/chrome/toolkit/content/mozapps/extensions/components/recommended-themes-footer.mjs",
   "start": 4966994,
   "end": 4968728
  }, {
   "filename": "/gre/chrome/toolkit/content/mozapps/extensions/components/recommended-themes-section.mjs",
   "start": 4968728,
   "end": 4969826
  }, {
   "filename": "/gre/chrome/toolkit/content/mozapps/extensions/components/search-addons.mjs",
   "start": 4969826,
   "end": 4971880
  }, {
   "filename": "/gre/chrome/toolkit/content/mozapps/extensions/components/smartwindow-themes-notice.mjs",
   "start": 4971880,
   "end": 4974254
  }, {
   "filename": "/gre/chrome/toolkit/content/mozapps/extensions/components/taar-notice.mjs",
   "start": 4974254,
   "end": 4975846
  }, {
   "filename": "/gre/chrome/toolkit/content/mozapps/extensions/components/update-release-notes.mjs",
   "start": 4975846,
   "end": 4978133
  }, {
   "filename": "/gre/chrome/toolkit/content/mozapps/extensions/default-theme/icon.svg",
   "start": 4978133,
   "end": 4978737
  }, {
   "filename": "/gre/chrome/toolkit/content/mozapps/extensions/default-theme/manifest.json",
   "start": 4978737,
   "end": 4979085
  }, {
   "filename": "/gre/chrome/toolkit/content/mozapps/extensions/default-theme/preview.svg",
   "start": 4979085,
   "end": 4982059
  }, {
   "filename": "/gre/chrome/toolkit/content/mozapps/extensions/shortcuts.css",
   "start": 4982059,
   "end": 4984645
  }, {
   "filename": "/gre/chrome/toolkit/content/mozapps/extensions/view-controller.mjs",
   "start": 4984645,
   "end": 4989584
  }, {
   "filename": "/gre/chrome/toolkit/content/mozapps/handling/appChooser.js",
   "start": 4989584,
   "end": 5002168
  }, {
   "filename": "/gre/chrome/toolkit/content/mozapps/handling/appChooser.xhtml",
   "start": 5002168,
   "end": 5004293
  }, {
   "filename": "/gre/chrome/toolkit/content/mozapps/handling/handler.css",
   "start": 5004293,
   "end": 5005612
  }, {
   "filename": "/gre/chrome/toolkit/content/mozapps/handling/permissionDialog.js",
   "start": 5005612,
   "end": 5014666
  }, {
   "filename": "/gre/chrome/toolkit/content/mozapps/handling/permissionDialog.xhtml",
   "start": 5014666,
   "end": 5016530
  }, {
   "filename": "/gre/chrome/toolkit/content/mozapps/preferences/changemp.css",
   "start": 5016530,
   "end": 5017808
  }, {
   "filename": "/gre/chrome/toolkit/content/mozapps/preferences/changemp.js",
   "start": 5017808,
   "end": 5022681
  }, {
   "filename": "/gre/chrome/toolkit/content/mozapps/preferences/changemp.xhtml",
   "start": 5022681,
   "end": 5025600
  }, {
   "filename": "/gre/chrome/toolkit/content/mozapps/preferences/fontbuilder.js",
   "start": 5025600,
   "end": 5029792
  }, {
   "filename": "/gre/chrome/toolkit/content/mozapps/preferences/removemp.js",
   "start": 5029792,
   "end": 5031116
  }, {
   "filename": "/gre/chrome/toolkit/content/mozapps/preferences/removemp.xhtml",
   "start": 5031116,
   "end": 5032831
  }, {
   "filename": "/gre/chrome/toolkit/content/mozapps/profile/createProfileWizard.js",
   "start": 5032831,
   "end": 5040169
  }, {
   "filename": "/gre/chrome/toolkit/content/mozapps/profile/createProfileWizard.xhtml",
   "start": 5040169,
   "end": 5043750
  }, {
   "filename": "/gre/chrome/toolkit/content/mozapps/profile/profileDowngrade.js",
   "start": 5043750,
   "end": 5045110
  }, {
   "filename": "/gre/chrome/toolkit/content/mozapps/profile/profileDowngrade.xhtml",
   "start": 5045110,
   "end": 5046557
  }, {
   "filename": "/gre/chrome/toolkit/content/mozapps/profile/profileSelection.js",
   "start": 5046557,
   "end": 5057902
  }, {
   "filename": "/gre/chrome/toolkit/content/mozapps/profile/profileSelection.xhtml",
   "start": 5057902,
   "end": 5060450
  }, {
   "filename": "/gre/chrome/toolkit/passwordmgr/passwordstorage.sys.mjs",
   "start": 5060450,
   "end": 5061891
  }, {
   "filename": "/gre/chrome/toolkit/res/accessiblecaret-normal@1.5x.png",
   "start": 5061891,
   "end": 5063344
  }, {
   "filename": "/gre/chrome/toolkit/res/accessiblecaret-normal@1x.png",
   "start": 5063344,
   "end": 5064343
  }, {
   "filename": "/gre/chrome/toolkit/res/accessiblecaret-normal@2.25x.png",
   "start": 5064343,
   "end": 5066396
  }, {
   "filename": "/gre/chrome/toolkit/res/accessiblecaret-normal@2x.png",
   "start": 5066396,
   "end": 5068514
  }, {
   "filename": "/gre/chrome/toolkit/res/accessiblecaret-tilt-left@1.5x.png",
   "start": 5068514,
   "end": 5069957
  }, {
   "filename": "/gre/chrome/toolkit/res/accessiblecaret-tilt-left@1x.png",
   "start": 5069957,
   "end": 5070950
  }, {
   "filename": "/gre/chrome/toolkit/res/accessiblecaret-tilt-left@2.25x.png",
   "start": 5070950,
   "end": 5073042
  }, {
   "filename": "/gre/chrome/toolkit/res/accessiblecaret-tilt-left@2x.png",
   "start": 5073042,
   "end": 5074817
  }, {
   "filename": "/gre/chrome/toolkit/res/accessiblecaret-tilt-right@1.5x.png",
   "start": 5074817,
   "end": 5076257
  }, {
   "filename": "/gre/chrome/toolkit/res/accessiblecaret-tilt-right@1x.png",
   "start": 5076257,
   "end": 5077239
  }, {
   "filename": "/gre/chrome/toolkit/res/accessiblecaret-tilt-right@2.25x.png",
   "start": 5077239,
   "end": 5079314
  }, {
   "filename": "/gre/chrome/toolkit/res/accessiblecaret-tilt-right@2x.png",
   "start": 5079314,
   "end": 5081080
  }, {
   "filename": "/gre/chrome/toolkit/res/accessiblecaret.css",
   "start": 5081080,
   "end": 5083963
  }, {
   "filename": "/gre/chrome/toolkit/res/autofill/FormAutofill.ios.sys.mjs",
   "start": 5083963,
   "end": 5084583
  }, {
   "filename": "/gre/chrome/toolkit/res/autofill/FormAutofill.sys.mjs",
   "start": 5084583,
   "end": 5097205
  }, {
   "filename": "/gre/chrome/toolkit/res/autofill/FormAutofillChild.ios.sys.mjs",
   "start": 5097205,
   "end": 5104873
  }, {
   "filename": "/gre/chrome/toolkit/res/autofill/FormAutofillChild.sys.mjs",
   "start": 5104873,
   "end": 5147758
  }, {
   "filename": "/gre/chrome/toolkit/res/autofill/FormAutofillContent.sys.mjs",
   "start": 5147758,
   "end": 5149897
  }, {
   "filename": "/gre/chrome/toolkit/res/autofill/FormAutofillParent.sys.mjs",
   "start": 5149897,
   "end": 5199689
  }, {
   "filename": "/gre/chrome/toolkit/res/autofill/FormAutofillPreferences.sys.mjs",
   "start": 5199689,
   "end": 5213423
  }, {
   "filename": "/gre/chrome/toolkit/res/autofill/FormAutofillPrompter.sys.mjs",
   "start": 5213423,
   "end": 5255462
  }, {
   "filename": "/gre/chrome/toolkit/res/autofill/FormAutofillStorage.sys.mjs",
   "start": 5255462,
   "end": 5258372
  }, {
   "filename": "/gre/chrome/toolkit/res/autofill/FormAutofillStorageBase.sys.mjs",
   "start": 5258372,
   "end": 5324097
  }, {
   "filename": "/gre/chrome/toolkit/res/autofill/FormAutofillSync.sys.mjs",
   "start": 5324097,
   "end": 5335743
  }, {
   "filename": "/gre/chrome/toolkit/res/autofill/ProfileAutoCompleteResult.sys.mjs",
   "start": 5335743,
   "end": 5350188
  }, {
   "filename": "/gre/chrome/toolkit/res/broken-image.png",
   "start": 5350188,
   "end": 5350348
  }, {
   "filename": "/gre/chrome/toolkit/res/counterstyles.css",
   "start": 5350348,
   "end": 5363707
  }, {
   "filename": "/gre/chrome/toolkit/res/details.css",
   "start": 5363707,
   "end": 5364423
  }, {
   "filename": "/gre/chrome/toolkit/res/forms.css",
   "start": 5364423,
   "end": 5391045
  }, {
   "filename": "/gre/chrome/toolkit/res/html.css",
   "start": 5391045,
   "end": 5416808
  }, {
   "filename": "/gre/chrome/toolkit/res/mathml.css",
   "start": 5416808,
   "end": 5427897
  }, {
   "filename": "/gre/chrome/toolkit/res/messaging-system/lib/Logger.sys.mjs",
   "start": 5427897,
   "end": 5428475
  }, {
   "filename": "/gre/chrome/toolkit/res/messaging-system/lib/SpecialMessageActions.sys.mjs",
   "start": 5428475,
   "end": 5464806
  }, {
   "filename": "/gre/chrome/toolkit/res/messaging-system/targeting/Targeting.sys.mjs",
   "start": 5464806,
   "end": 5471309
  }, {
   "filename": "/gre/chrome/toolkit/res/nimbus/ExperimentAPI.sys.mjs",
   "start": 5471309,
   "end": 5504883
  }, {
   "filename": "/gre/chrome/toolkit/res/nimbus/FeatureManifest.sys.mjs",
   "start": 5504883,
   "end": 5713021
  }, {
   "filename": "/gre/chrome/toolkit/res/nimbus/FirefoxLabs.sys.mjs",
   "start": 5713021,
   "end": 5716831
  }, {
   "filename": "/gre/chrome/toolkit/res/nimbus/lib/Enrollments.sys.mjs",
   "start": 5716831,
   "end": 5742054
  }, {
   "filename": "/gre/chrome/toolkit/res/nimbus/lib/ExperimentManager.sys.mjs",
   "start": 5742054,
   "end": 5808963
  }, {
   "filename": "/gre/chrome/toolkit/res/nimbus/lib/ExperimentStore.sys.mjs",
   "start": 5808963,
   "end": 5828036
  }, {
   "filename": "/gre/chrome/toolkit/res/nimbus/lib/Migrations.sys.mjs",
   "start": 5828036,
   "end": 5845639
  }, {
   "filename": "/gre/chrome/toolkit/res/nimbus/lib/PrefFlipsFeature.sys.mjs",
   "start": 5845639,
   "end": 5865858
  }, {
   "filename": "/gre/chrome/toolkit/res/nimbus/lib/RemoteSettingsExperimentLoader.sys.mjs",
   "start": 5865858,
   "end": 5909282
  }, {
   "filename": "/gre/chrome/toolkit/res/nimbus/lib/SharedDataMap.sys.mjs",
   "start": 5909282,
   "end": 5916537
  }, {
   "filename": "/gre/chrome/toolkit/res/nimbus/lib/TargetingContextRecorder.sys.mjs",
   "start": 5916537,
   "end": 5931066
  }, {
   "filename": "/gre/chrome/toolkit/res/nimbus/lib/Telemetry.sys.mjs",
   "start": 5931066,
   "end": 5943364
  }, {
   "filename": "/gre/chrome/toolkit/res/nimbus/schemas/NimbusExperiment.schema.json",
   "start": 5943364,
   "end": 5955426
  }, {
   "filename": "/gre/chrome/toolkit/res/nimbus/schemas/NimbusTelemetryFeature.schema.json",
   "start": 5955426,
   "end": 5956497
  }, {
   "filename": "/gre/chrome/toolkit/res/nimbus/schemas/PrefFlipsFeature.schema.json",
   "start": 5956497,
   "end": 5957794
  }, {
   "filename": "/gre/chrome/toolkit/res/noframes.css",
   "start": 5957794,
   "end": 5958167
  }, {
   "filename": "/gre/chrome/toolkit/res/normandy/Normandy.sys.mjs",
   "start": 5958167,
   "end": 5967115
  }, {
   "filename": "/gre/chrome/toolkit/res/normandy/NormandyMigrations.sys.mjs",
   "start": 5967115,
   "end": 5971830
  }, {
   "filename": "/gre/chrome/toolkit/res/normandy/actions/AddonRollbackAction.sys.mjs",
   "start": 5971830,
   "end": 5974237
  }, {
   "filename": "/gre/chrome/toolkit/res/normandy/actions/AddonRolloutAction.sys.mjs",
   "start": 5974237,
   "end": 5981110
  }, {
   "filename": "/gre/chrome/toolkit/res/normandy/actions/BaseAction.sys.mjs",
   "start": 5981110,
   "end": 5990270
  }, {
   "filename": "/gre/chrome/toolkit/res/normandy/actions/BaseStudyAction.sys.mjs",
   "start": 5990270,
   "end": 5991621
  }, {
   "filename": "/gre/chrome/toolkit/res/normandy/actions/BranchedAddonStudyAction.sys.mjs",
   "start": 5991621,
   "end": 6015964
  }, {
   "filename": "/gre/chrome/toolkit/res/normandy/actions/ConsoleLogAction.sys.mjs",
   "start": 6015964,
   "end": 6016575
  }, {
   "filename": "/gre/chrome/toolkit/res/normandy/actions/PreferenceExperimentAction.sys.mjs",
   "start": 6016575,
   "end": 6026070
  }, {
   "filename": "/gre/chrome/toolkit/res/normandy/actions/PreferenceRollbackAction.sys.mjs",
   "start": 6026070,
   "end": 6029104
  }, {
   "filename": "/gre/chrome/toolkit/res/normandy/actions/PreferenceRolloutAction.sys.mjs",
   "start": 6029104,
   "end": 6037547
  }, {
   "filename": "/gre/chrome/toolkit/res/normandy/actions/ShowHeartbeatAction.sys.mjs",
   "start": 6037547,
   "end": 6047694
  }, {
   "filename": "/gre/chrome/toolkit/res/normandy/actions/schemas/index.sys.mjs",
   "start": 6047694,
   "end": 6061614
  }, {
   "filename": "/gre/chrome/toolkit/res/normandy/content/AboutPages.sys.mjs",
   "start": 6061614,
   "end": 6069430
  }, {
   "filename": "/gre/chrome/toolkit/res/normandy/content/ShieldFrameChild.sys.mjs",
   "start": 6069430,
   "end": 6075015
  }, {
   "filename": "/gre/chrome/toolkit/res/normandy/content/ShieldFrameParent.sys.mjs",
   "start": 6075015,
   "end": 6076766
  }, {
   "filename": "/gre/chrome/toolkit/res/normandy/content/about-studies/about-studies.css",
   "start": 6076766,
   "end": 6079962
  }, {
   "filename": "/gre/chrome/toolkit/res/normandy/content/about-studies/about-studies.html",
   "start": 6079962,
   "end": 6081370
  }, {
   "filename": "/gre/chrome/toolkit/res/normandy/content/about-studies/about-studies.js",
   "start": 6081370,
   "end": 6097294
  }, {
   "filename": "/gre/chrome/toolkit/res/normandy/lib/ActionsManager.sys.mjs",
   "start": 6097294,
   "end": 6100573
  }, {
   "filename": "/gre/chrome/toolkit/res/normandy/lib/AddonRollouts.sys.mjs",
   "start": 6100573,
   "end": 6106877
  }, {
   "filename": "/gre/chrome/toolkit/res/normandy/lib/AddonStudies.sys.mjs",
   "start": 6106877,
   "end": 6121696
  }, {
   "filename": "/gre/chrome/toolkit/res/normandy/lib/CleanupManager.sys.mjs",
   "start": 6121696,
   "end": 6122903
  }, {
   "filename": "/gre/chrome/toolkit/res/normandy/lib/ClientEnvironment.sys.mjs",
   "start": 6122903,
   "end": 6126497
  }, {
   "filename": "/gre/chrome/toolkit/res/normandy/lib/EventEmitter.sys.mjs",
   "start": 6126497,
   "end": 6128189
  }, {
   "filename": "/gre/chrome/toolkit/res/normandy/lib/Heartbeat.sys.mjs",
   "start": 6128189,
   "end": 6140678
  }, {
   "filename": "/gre/chrome/toolkit/res/normandy/lib/LegacyHeartbeat.sys.mjs",
   "start": 6140678,
   "end": 6141780
  }, {
   "filename": "/gre/chrome/toolkit/res/normandy/lib/LogManager.sys.mjs",
   "start": 6141780,
   "end": 6142901
  }, {
   "filename": "/gre/chrome/toolkit/res/normandy/lib/NormandyAddonManager.sys.mjs",
   "start": 6142901,
   "end": 6145803
  }, {
   "filename": "/gre/chrome/toolkit/res/normandy/lib/NormandyApi.sys.mjs",
   "start": 6145803,
   "end": 6150874
  }, {
   "filename": "/gre/chrome/toolkit/res/normandy/lib/NormandyUtils.sys.mjs",
   "start": 6150874,
   "end": 6151291
  }, {
   "filename": "/gre/chrome/toolkit/res/normandy/lib/PreferenceExperiments.sys.mjs",
   "start": 6151291,
   "end": 6186527
  }, {
   "filename": "/gre/chrome/toolkit/res/normandy/lib/PreferenceRollouts.sys.mjs",
   "start": 6186527,
   "end": 6197774
  }, {
   "filename": "/gre/chrome/toolkit/res/normandy/lib/RecipeRunner.sys.mjs",
   "start": 6197774,
   "end": 6218778
  }, {
   "filename": "/gre/chrome/toolkit/res/normandy/lib/ShieldPreferences.sys.mjs",
   "start": 6218778,
   "end": 6221356
  }, {
   "filename": "/gre/chrome/toolkit/res/normandy/lib/Storage.sys.mjs",
   "start": 6221356,
   "end": 6223674
  }, {
   "filename": "/gre/chrome/toolkit/res/normandy/lib/TelemetryEvents.sys.mjs",
   "start": 6223674,
   "end": 6224504
  }, {
   "filename": "/gre/chrome/toolkit/res/normandy/schemas/LegacyHeartbeat.schema.json",
   "start": 6224504,
   "end": 6227033
  }, {
   "filename": "/gre/chrome/toolkit/res/normandy/skin/shared/Heartbeat.css",
   "start": 6227033,
   "end": 6228345
  }, {
   "filename": "/gre/chrome/toolkit/res/normandy/skin/shared/heartbeat-icon.svg",
   "start": 6228345,
   "end": 6231894
  }, {
   "filename": "/gre/chrome/toolkit/res/normandy/vendor/LICENSE_THIRDPARTY",
   "start": 6231894,
   "end": 6238669
  }, {
   "filename": "/gre/chrome/toolkit/res/normandy/vendor/classnames.js",
   "start": 6238669,
   "end": 6239634
  }, {
   "filename": "/gre/chrome/toolkit/res/quirk.css",
   "start": 6239634,
   "end": 6242758
  }, {
   "filename": "/gre/chrome/toolkit/res/scrollbars.css",
   "start": 6242758,
   "end": 6247121
  }, {
   "filename": "/gre/chrome/toolkit/res/select.css",
   "start": 6247121,
   "end": 6247610
  }, {
   "filename": "/gre/chrome/toolkit/res/ua.css",
   "start": 6247610,
   "end": 6261904
  }, {
   "filename": "/gre/chrome/toolkit/skin/classic/global/aboutCache.css",
   "start": 6261904,
   "end": 6263027
  }, {
   "filename": "/gre/chrome/toolkit/skin/classic/global/aboutCacheEntry.css",
   "start": 6263027,
   "end": 6263499
  }, {
   "filename": "/gre/chrome/toolkit/skin/classic/global/aboutHttpsOnlyError.css",
   "start": 6263499,
   "end": 6265371
  }, {
   "filename": "/gre/chrome/toolkit/skin/classic/global/aboutLicense.css",
   "start": 6265371,
   "end": 6265946
  }, {
   "filename": "/gre/chrome/toolkit/skin/classic/global/aboutMemory.css",
   "start": 6265946,
   "end": 6266208
  }, {
   "filename": "/gre/chrome/toolkit/skin/classic/global/aboutNetError.css",
   "start": 6266208,
   "end": 6271774
  }, {
   "filename": "/gre/chrome/toolkit/skin/classic/global/aboutNetworking.css",
   "start": 6271774,
   "end": 6273027
  }, {
   "filename": "/gre/chrome/toolkit/skin/classic/global/aboutReader.css",
   "start": 6273027,
   "end": 6302835
  }, {
   "filename": "/gre/chrome/toolkit/skin/classic/global/aboutSupport.css",
   "start": 6302835,
   "end": 6306409
  }, {
   "filename": "/gre/chrome/toolkit/skin/classic/global/alert.css",
   "start": 6306409,
   "end": 6310492
  }, {
   "filename": "/gre/chrome/toolkit/skin/classic/global/appPicker.css",
   "start": 6310492,
   "end": 6311114
  }, {
   "filename": "/gre/chrome/toolkit/skin/classic/global/arrow/panelarrow-vertical.svg",
   "start": 6311114,
   "end": 6311511
  }, {
   "filename": "/gre/chrome/toolkit/skin/classic/global/arrowscrollbox.css",
   "start": 6311511,
   "end": 6313793
  }, {
   "filename": "/gre/chrome/toolkit/skin/classic/global/autocomplete.css",
   "start": 6313793,
   "end": 6315657
  }, {
   "filename": "/gre/chrome/toolkit/skin/classic/global/button.css",
   "start": 6315657,
   "end": 6317003
  }, {
   "filename": "/gre/chrome/toolkit/skin/classic/global/checkbox.css",
   "start": 6317003,
   "end": 6319e3
  }, {
   "filename": "/gre/chrome/toolkit/skin/classic/global/close-icon.css",
   "start": 6319e3,
   "end": 6320147
  }, {
   "filename": "/gre/chrome/toolkit/skin/classic/global/colorpicker-common.css",
   "start": 6320147,
   "end": 6324014
  }, {
   "filename": "/gre/chrome/toolkit/skin/classic/global/colorpicker.css",
   "start": 6324014,
   "end": 6324279
  }, {
   "filename": "/gre/chrome/toolkit/skin/classic/global/commonDialog.css",
   "start": 6324279,
   "end": 6325762
  }, {
   "filename": "/gre/chrome/toolkit/skin/classic/global/datetimeinputpickers.css",
   "start": 6325762,
   "end": 6335989
  }, {
   "filename": "/gre/chrome/toolkit/skin/classic/global/design-system/panel.css",
   "start": 6335989,
   "end": 6336369
  }, {
   "filename": "/gre/chrome/toolkit/skin/classic/global/design-system/text-and-typography.css",
   "start": 6336369,
   "end": 6338186
  }, {
   "filename": "/gre/chrome/toolkit/skin/classic/global/design-system/tokens-brand.css",
   "start": 6338186,
   "end": 6342793
  }, {
   "filename": "/gre/chrome/toolkit/skin/classic/global/design-system/tokens-platform.css",
   "start": 6342793,
   "end": 6346595
  }, {
   "filename": "/gre/chrome/toolkit/skin/classic/global/design-system/tokens-shared.css",
   "start": 6346595,
   "end": 6405283
  }, {
   "filename": "/gre/chrome/toolkit/skin/classic/global/design-system/toolbar.css",
   "start": 6405283,
   "end": 6406882
  }, {
   "filename": "/gre/chrome/toolkit/skin/classic/global/dialog.css",
   "start": 6406882,
   "end": 6407536
  }, {
   "filename": "/gre/chrome/toolkit/skin/classic/global/dirListing/dirListing.css",
   "start": 6407536,
   "end": 6409383
  }, {
   "filename": "/gre/chrome/toolkit/skin/classic/global/dirListing/folder.png",
   "start": 6409383,
   "end": 6411003
  }, {
   "filename": "/gre/chrome/toolkit/skin/classic/global/dirListing/up.png",
   "start": 6411003,
   "end": 6412150
  }, {
   "filename": "/gre/chrome/toolkit/skin/classic/global/error-pages.css",
   "start": 6412150,
   "end": 6414096
  }, {
   "filename": "/gre/chrome/toolkit/skin/classic/global/findbar.css",
   "start": 6414096,
   "end": 6419281
  }, {
   "filename": "/gre/chrome/toolkit/skin/classic/global/global-shared.css",
   "start": 6419281,
   "end": 6431160
  }, {
   "filename": "/gre/chrome/toolkit/skin/classic/global/global.css",
   "start": 6431160,
   "end": 6434353
  }, {
   "filename": "/gre/chrome/toolkit/skin/classic/global/icons/EU-trust-mark-inverted.svg",
   "start": 6434353,
   "end": 6437806
  }, {
   "filename": "/gre/chrome/toolkit/skin/classic/global/icons/EU-trust-mark.svg",
   "start": 6437806,
   "end": 6441227
  }, {
   "filename": "/gre/chrome/toolkit/skin/classic/global/icons/Landscape.png",
   "start": 6441227,
   "end": 6441596
  }, {
   "filename": "/gre/chrome/toolkit/skin/classic/global/icons/Portrait.png",
   "start": 6441596,
   "end": 6442009
  }, {
   "filename": "/gre/chrome/toolkit/skin/classic/global/icons/arrow-counterclockwise-16.svg",
   "start": 6442009,
   "end": 6443149
  }, {
   "filename": "/gre/chrome/toolkit/skin/classic/global/icons/arrow-down-12.svg",
   "start": 6443149,
   "end": 6444045
  }, {
   "filename": "/gre/chrome/toolkit/skin/classic/global/icons/arrow-down.svg",
   "start": 6444045,
   "end": 6444940
  }, {
   "filename": "/gre/chrome/toolkit/skin/classic/global/icons/arrow-left-12.svg",
   "start": 6444940,
   "end": 6445840
  }, {
   "filename": "/gre/chrome/toolkit/skin/classic/global/icons/arrow-left.svg",
   "start": 6445840,
   "end": 6446709
  }, {
   "filename": "/gre/chrome/toolkit/skin/classic/global/icons/arrow-right-12.svg",
   "start": 6446709,
   "end": 6447632
  }, {
   "filename": "/gre/chrome/toolkit/skin/classic/global/icons/arrow-right.svg",
   "start": 6447632,
   "end": 6448536
  }, {
   "filename": "/gre/chrome/toolkit/skin/classic/global/icons/arrow-up-12.svg",
   "start": 6448536,
   "end": 6449448
  }, {
   "filename": "/gre/chrome/toolkit/skin/classic/global/icons/arrow-up.svg",
   "start": 6449448,
   "end": 6450347
  }, {
   "filename": "/gre/chrome/toolkit/skin/classic/global/icons/arrows-updown.svg",
   "start": 6450347,
   "end": 6451515
  }, {
   "filename": "/gre/chrome/toolkit/skin/classic/global/icons/autoscroll-horizontal.svg",
   "start": 6451515,
   "end": 6452200
  }, {
   "filename": "/gre/chrome/toolkit/skin/classic/global/icons/autoscroll-vertical.svg",
   "start": 6452200,
   "end": 6452850
  }, {
   "filename": "/gre/chrome/toolkit/skin/classic/global/icons/autoscroll.svg",
   "start": 6452850,
   "end": 6453774
  }, {
   "filename": "/gre/chrome/toolkit/skin/classic/global/icons/badge-blue.svg",
   "start": 6453774,
   "end": 6454236
  }, {
   "filename": "/gre/chrome/toolkit/skin/classic/global/icons/block.svg",
   "start": 6454236,
   "end": 6455427
  }, {
   "filename": "/gre/chrome/toolkit/skin/classic/global/icons/blocked.svg",
   "start": 6455427,
   "end": 6456312
  }, {
   "filename": "/gre/chrome/toolkit/skin/classic/global/icons/check-filled.svg",
   "start": 6456312,
   "end": 6457209
  }, {
   "filename": "/gre/chrome/toolkit/skin/classic/global/icons/check-partial.svg",
   "start": 6457209,
   "end": 6457704
  }, {
   "filename": "/gre/chrome/toolkit/skin/classic/global/icons/check.svg",
   "start": 6457704,
   "end": 6458611
  }, {
   "filename": "/gre/chrome/toolkit/skin/classic/global/icons/chevron.svg",
   "start": 6458611,
   "end": 6459857
  }, {
   "filename": "/gre/chrome/toolkit/skin/classic/global/icons/clipboard.svg",
   "start": 6459857,
   "end": 6460607
  }, {
   "filename": "/gre/chrome/toolkit/skin/classic/global/icons/close-fill.svg",
   "start": 6460607,
   "end": 6461771
  }, {
   "filename": "/gre/chrome/toolkit/skin/classic/global/icons/close.svg",
   "start": 6461771,
   "end": 6462777
  }, {
   "filename": "/gre/chrome/toolkit/skin/classic/global/icons/color-picker-20.svg",
   "start": 6462777,
   "end": 6464356
  }, {
   "filename": "/gre/chrome/toolkit/skin/classic/global/icons/columnpicker.svg",
   "start": 6464356,
   "end": 6464833
  }, {
   "filename": "/gre/chrome/toolkit/skin/classic/global/icons/content-analysis.svg",
   "start": 6464833,
   "end": 6465946
  }, {
   "filename": "/gre/chrome/toolkit/skin/classic/global/icons/cursor-arrow.svg",
   "start": 6465946,
   "end": 6467433
  }, {
   "filename": "/gre/chrome/toolkit/skin/classic/global/icons/defaultFavicon.svg",
   "start": 6467433,
   "end": 6469204
  }, {
   "filename": "/gre/chrome/toolkit/skin/classic/global/icons/delete.svg",
   "start": 6469204,
   "end": 6471031
  }, {
   "filename": "/gre/chrome/toolkit/skin/classic/global/icons/developer.svg",
   "start": 6471031,
   "end": 6471656
  }, {
   "filename": "/gre/chrome/toolkit/skin/classic/global/icons/edit-copy.svg",
   "start": 6471656,
   "end": 6473504
  }, {
   "filename": "/gre/chrome/toolkit/skin/classic/global/icons/edit-outline.svg",
   "start": 6473504,
   "end": 6475316
  }, {
   "filename": "/gre/chrome/toolkit/skin/classic/global/icons/edit.svg",
   "start": 6475316,
   "end": 6476880
  }, {
   "filename": "/gre/chrome/toolkit/skin/classic/global/icons/error.svg",
   "start": 6476880,
   "end": 6477715
  }, {
   "filename": "/gre/chrome/toolkit/skin/classic/global/icons/experiments.svg",
   "start": 6477715,
   "end": 6479506
  }, {
   "filename": "/gre/chrome/toolkit/skin/classic/global/icons/eye-slash.svg",
   "start": 6479506,
   "end": 6480576
  }, {
   "filename": "/gre/chrome/toolkit/skin/classic/global/icons/eye.svg",
   "start": 6480576,
   "end": 6481358
  }, {
   "filename": "/gre/chrome/toolkit/skin/classic/global/icons/folder.svg",
   "start": 6481358,
   "end": 6482738
  }, {
   "filename": "/gre/chrome/toolkit/skin/classic/global/icons/heart.svg",
   "start": 6482738,
   "end": 6483151
  }, {
   "filename": "/gre/chrome/toolkit/skin/classic/global/icons/help.svg",
   "start": 6483151,
   "end": 6484669
  }, {
   "filename": "/gre/chrome/toolkit/skin/classic/global/icons/highlights.svg",
   "start": 6484669,
   "end": 6488376
  }, {
   "filename": "/gre/chrome/toolkit/skin/classic/global/icons/indicator-private-browsing.svg",
   "start": 6488376,
   "end": 6489488
  }, {
   "filename": "/gre/chrome/toolkit/skin/classic/global/icons/info-filled.svg",
   "start": 6489488,
   "end": 6490458
  }, {
   "filename": "/gre/chrome/toolkit/skin/classic/global/icons/info.svg",
   "start": 6490458,
   "end": 6491614
  }, {
   "filename": "/gre/chrome/toolkit/skin/classic/global/icons/lightbulb.svg",
   "start": 6491614,
   "end": 6493546
  }, {
   "filename": "/gre/chrome/toolkit/skin/classic/global/icons/link.svg",
   "start": 6493546,
   "end": 6494444
  }, {
   "filename": "/gre/chrome/toolkit/skin/classic/global/icons/loading.svg",
   "start": 6494444,
   "end": 6496248
  }, {
   "filename": "/gre/chrome/toolkit/skin/classic/global/icons/mdn.svg",
   "start": 6496248,
   "end": 6496951
  }, {
   "filename": "/gre/chrome/toolkit/skin/classic/global/icons/menu-check.svg",
   "start": 6496951,
   "end": 6497996
  }, {
   "filename": "/gre/chrome/toolkit/skin/classic/global/icons/minus.svg",
   "start": 6497996,
   "end": 6498443
  }, {
   "filename": "/gre/chrome/toolkit/skin/classic/global/icons/more.svg",
   "start": 6498443,
   "end": 6499288
  }, {
   "filename": "/gre/chrome/toolkit/skin/classic/global/icons/move-16.svg",
   "start": 6499288,
   "end": 6500123
  }, {
   "filename": "/gre/chrome/toolkit/skin/classic/global/icons/newsfeed.svg",
   "start": 6500123,
   "end": 6501631
  }, {
   "filename": "/gre/chrome/toolkit/skin/classic/global/icons/open-in-new.svg",
   "start": 6501631,
   "end": 6503016
  }, {
   "filename": "/gre/chrome/toolkit/skin/classic/global/icons/organizational-unit.svg",
   "start": 6503016,
   "end": 6503602
  }, {
   "filename": "/gre/chrome/toolkit/skin/classic/global/icons/page-landscape.svg",
   "start": 6503602,
   "end": 6504834
  }, {
   "filename": "/gre/chrome/toolkit/skin/classic/global/icons/page-portrait.svg",
   "start": 6504834,
   "end": 6506091
  }, {
   "filename": "/gre/chrome/toolkit/skin/classic/global/icons/pdf.svg",
   "start": 6506091,
   "end": 6507263
  }, {
   "filename": "/gre/chrome/toolkit/skin/classic/global/icons/pendingpaint.png",
   "start": 6507263,
   "end": 6520218
  }, {
   "filename": "/gre/chrome/toolkit/skin/classic/global/icons/performance.svg",
   "start": 6520218,
   "end": 6521022
  }, {
   "filename": "/gre/chrome/toolkit/skin/classic/global/icons/plugin.svg",
   "start": 6521022,
   "end": 6522428
  }, {
   "filename": "/gre/chrome/toolkit/skin/classic/global/icons/plus-20.svg",
   "start": 6522428,
   "end": 6523224
  }, {
   "filename": "/gre/chrome/toolkit/skin/classic/global/icons/plus.svg",
   "start": 6523224,
   "end": 6524086
  }, {
   "filename": "/gre/chrome/toolkit/skin/classic/global/icons/print.svg",
   "start": 6524086,
   "end": 6525740
  }, {
   "filename": "/gre/chrome/toolkit/skin/classic/global/icons/rating-star.svg",
   "start": 6525740,
   "end": 6528187
  }, {
   "filename": "/gre/chrome/toolkit/skin/classic/global/icons/reload.svg",
   "start": 6528187,
   "end": 6529306
  }, {
   "filename": "/gre/chrome/toolkit/skin/classic/global/icons/resizer.svg",
   "start": 6529306,
   "end": 6530792
  }, {
   "filename": "/gre/chrome/toolkit/skin/classic/global/icons/search-glass.svg",
   "start": 6530792,
   "end": 6531847
  }, {
   "filename": "/gre/chrome/toolkit/skin/classic/global/icons/search-textbox.svg",
   "start": 6531847,
   "end": 6532412
  }, {
   "filename": "/gre/chrome/toolkit/skin/classic/global/icons/security-broken.svg",
   "start": 6532412,
   "end": 6533331
  }, {
   "filename": "/gre/chrome/toolkit/skin/classic/global/icons/security-custom-root.svg",
   "start": 6533331,
   "end": 6534129
  }, {
   "filename": "/gre/chrome/toolkit/skin/classic/global/icons/security-warning.svg",
   "start": 6534129,
   "end": 6536067
  }, {
   "filename": "/gre/chrome/toolkit/skin/classic/global/icons/security.svg",
   "start": 6536067,
   "end": 6537380
  }, {
   "filename": "/gre/chrome/toolkit/skin/classic/global/icons/settings.svg",
   "start": 6537380,
   "end": 6541881
  }, {
   "filename": "/gre/chrome/toolkit/skin/classic/global/icons/shaft-arrow-down.svg",
   "start": 6541881,
   "end": 6542393
  }, {
   "filename": "/gre/chrome/toolkit/skin/classic/global/icons/shaft-arrow-left.svg",
   "start": 6542393,
   "end": 6542992
  }, {
   "filename": "/gre/chrome/toolkit/skin/classic/global/icons/shaft-arrow-right.svg",
   "start": 6542992,
   "end": 6543593
  }, {
   "filename": "/gre/chrome/toolkit/skin/classic/global/icons/shaft-arrow-up.svg",
   "start": 6543593,
   "end": 6544082
  }, {
   "filename": "/gre/chrome/toolkit/skin/classic/global/icons/sort-arrow.svg",
   "start": 6544082,
   "end": 6544427
  }, {
   "filename": "/gre/chrome/toolkit/skin/classic/global/icons/swap-horizontal-20.svg",
   "start": 6544427,
   "end": 6545475
  }, {
   "filename": "/gre/chrome/toolkit/skin/classic/global/icons/tab-notes-12.svg",
   "start": 6545475,
   "end": 6546231
  }, {
   "filename": "/gre/chrome/toolkit/skin/classic/global/icons/tab-notes.svg",
   "start": 6546231,
   "end": 6547498
  }, {
   "filename": "/gre/chrome/toolkit/skin/classic/global/icons/thumbs-down-20.svg",
   "start": 6547498,
   "end": 6549426
  }, {
   "filename": "/gre/chrome/toolkit/skin/classic/global/icons/thumbs-up-20.svg",
   "start": 6549426,
   "end": 6551342
  }, {
   "filename": "/gre/chrome/toolkit/skin/classic/global/icons/trending.svg",
   "start": 6551342,
   "end": 6552577
  }, {
   "filename": "/gre/chrome/toolkit/skin/classic/global/icons/trophy.svg",
   "start": 6552577,
   "end": 6553389
  }, {
   "filename": "/gre/chrome/toolkit/skin/classic/global/icons/undo.svg",
   "start": 6553389,
   "end": 6554173
  }, {
   "filename": "/gre/chrome/toolkit/skin/classic/global/icons/update-icon.svg",
   "start": 6554173,
   "end": 6555182
  }, {
   "filename": "/gre/chrome/toolkit/skin/classic/global/icons/warning-fill-12.svg",
   "start": 6555182,
   "end": 6555813
  }, {
   "filename": "/gre/chrome/toolkit/skin/classic/global/icons/warning-large.png",
   "start": 6555813,
   "end": 6558256
  }, {
   "filename": "/gre/chrome/toolkit/skin/classic/global/icons/warning.svg",
   "start": 6558256,
   "end": 6559479
  }, {
   "filename": "/gre/chrome/toolkit/skin/classic/global/illustrations/about-license.svg",
   "start": 6559479,
   "end": 6566064
  }, {
   "filename": "/gre/chrome/toolkit/skin/classic/global/illustrations/error-malformed-url.svg",
   "start": 6566064,
   "end": 6583814
  }, {
   "filename": "/gre/chrome/toolkit/skin/classic/global/illustrations/kit-concerned.svg",
   "start": 6583814,
   "end": 6592701
  }, {
   "filename": "/gre/chrome/toolkit/skin/classic/global/illustrations/kit-happy.svg",
   "start": 6592701,
   "end": 6597656
  }, {
   "filename": "/gre/chrome/toolkit/skin/classic/global/illustrations/kit-in-circle.svg",
   "start": 6597656,
   "end": 6608613
  }, {
   "filename": "/gre/chrome/toolkit/skin/classic/global/illustrations/no-connection.svg",
   "start": 6608613,
   "end": 6648155
  }, {
   "filename": "/gre/chrome/toolkit/skin/classic/global/illustrations/security-error.svg",
   "start": 6648155,
   "end": 6659737
  }, {
   "filename": "/gre/chrome/toolkit/skin/classic/global/illustrations/shield-alert.svg",
   "start": 6659737,
   "end": 6666231
  }, {
   "filename": "/gre/chrome/toolkit/skin/classic/global/illustrations/shield-check.svg",
   "start": 6666231,
   "end": 6672753
  }, {
   "filename": "/gre/chrome/toolkit/skin/classic/global/in-content/common-shared.css",
   "start": 6672753,
   "end": 6703564
  }, {
   "filename": "/gre/chrome/toolkit/skin/classic/global/in-content/common.css",
   "start": 6703564,
   "end": 6704201
  }, {
   "filename": "/gre/chrome/toolkit/skin/classic/global/in-content/info-pages.css",
   "start": 6704201,
   "end": 6707875
  }, {
   "filename": "/gre/chrome/toolkit/skin/classic/global/in-content/wifi.svg",
   "start": 6707875,
   "end": 6709009
  }, {
   "filename": "/gre/chrome/toolkit/skin/classic/global/media/audio-muted.svg",
   "start": 6709009,
   "end": 6710670
  }, {
   "filename": "/gre/chrome/toolkit/skin/classic/global/media/audio.svg",
   "start": 6710670,
   "end": 6712265
  }, {
   "filename": "/gre/chrome/toolkit/skin/classic/global/media/audioNoAudioButton.svg",
   "start": 6712265,
   "end": 6712859
  }, {
   "filename": "/gre/chrome/toolkit/skin/classic/global/media/closed-caption-settings-button.svg",
   "start": 6712859,
   "end": 6714883
  }, {
   "filename": "/gre/chrome/toolkit/skin/classic/global/media/closedCaptionButton-cc-off.svg",
   "start": 6714883,
   "end": 6716160
  }, {
   "filename": "/gre/chrome/toolkit/skin/classic/global/media/closedCaptionButton-cc-on.svg",
   "start": 6716160,
   "end": 6717428
  }, {
   "filename": "/gre/chrome/toolkit/skin/classic/global/media/error.png",
   "start": 6717428,
   "end": 6719471
  }, {
   "filename": "/gre/chrome/toolkit/skin/classic/global/media/fullscreenEnterButton.svg",
   "start": 6719471,
   "end": 6720346
  }, {
   "filename": "/gre/chrome/toolkit/skin/classic/global/media/fullscreenExitButton.svg",
   "start": 6720346,
   "end": 6721201
  }, {
   "filename": "/gre/chrome/toolkit/skin/classic/global/media/imagedoc-darknoise.png",
   "start": 6721201,
   "end": 6724251
  }, {
   "filename": "/gre/chrome/toolkit/skin/classic/global/media/imagedoc-lightnoise.png",
   "start": 6724251,
   "end": 6728238
  }, {
   "filename": "/gre/chrome/toolkit/skin/classic/global/media/pause-fill.svg",
   "start": 6728238,
   "end": 6729354
  }, {
   "filename": "/gre/chrome/toolkit/skin/classic/global/media/picture-in-picture-closed.svg",
   "start": 6729354,
   "end": 6731019
  }, {
   "filename": "/gre/chrome/toolkit/skin/classic/global/media/picture-in-picture-enter-fullscreen-button.svg",
   "start": 6731019,
   "end": 6731962
  }, {
   "filename": "/gre/chrome/toolkit/skin/classic/global/media/picture-in-picture-exit-fullscreen-button.svg",
   "start": 6731962,
   "end": 6733204
  }, {
   "filename": "/gre/chrome/toolkit/skin/classic/global/media/picture-in-picture-open.svg",
   "start": 6733204,
   "end": 6734862
  }, {
   "filename": "/gre/chrome/toolkit/skin/classic/global/media/picture-in-picture-seekBackward-button.svg",
   "start": 6734862,
   "end": 6735925
  }, {
   "filename": "/gre/chrome/toolkit/skin/classic/global/media/picture-in-picture-seekForward-button.svg",
   "start": 6735925,
   "end": 6737142
  }, {
   "filename": "/gre/chrome/toolkit/skin/classic/global/media/pipToggle.css",
   "start": 6737142,
   "end": 6749026
  }, {
   "filename": "/gre/chrome/toolkit/skin/classic/global/media/play-fill.svg",
   "start": 6749026,
   "end": 6749850
  }, {
   "filename": "/gre/chrome/toolkit/skin/classic/global/media/stalled.png",
   "start": 6749850,
   "end": 6770613
  }, {
   "filename": "/gre/chrome/toolkit/skin/classic/global/media/textrecognition.css",
   "start": 6770613,
   "end": 6771218
  }, {
   "filename": "/gre/chrome/toolkit/skin/classic/global/media/throbber.png",
   "start": 6771218,
   "end": 6801936
  }, {
   "filename": "/gre/chrome/toolkit/skin/classic/global/media/videocontrols.css",
   "start": 6801936,
   "end": 6815038
  }, {
   "filename": "/gre/chrome/toolkit/skin/classic/global/menu.css",
   "start": 6815038,
   "end": 6827564
  }, {
   "filename": "/gre/chrome/toolkit/skin/classic/global/menulist.css",
   "start": 6827564,
   "end": 6830326
  }, {
   "filename": "/gre/chrome/toolkit/skin/classic/global/narrate.css",
   "start": 6830326,
   "end": 6836910
  }, {
   "filename": "/gre/chrome/toolkit/skin/classic/global/narrate/fast.svg",
   "start": 6836910,
   "end": 6838042
  }, {
   "filename": "/gre/chrome/toolkit/skin/classic/global/narrate/headphone-active.svg",
   "start": 6838042,
   "end": 6841185
  }, {
   "filename": "/gre/chrome/toolkit/skin/classic/global/narrate/headphone.svg",
   "start": 6841185,
   "end": 6841841
  }, {
   "filename": "/gre/chrome/toolkit/skin/classic/global/narrate/skip-backward-20.svg",
   "start": 6841841,
   "end": 6842755
  }, {
   "filename": "/gre/chrome/toolkit/skin/classic/global/narrate/skip-forward-20.svg",
   "start": 6842755,
   "end": 6843657
  }, {
   "filename": "/gre/chrome/toolkit/skin/classic/global/narrate/slow.svg",
   "start": 6843657,
   "end": 6845482
  }, {
   "filename": "/gre/chrome/toolkit/skin/classic/global/notification.css",
   "start": 6845482,
   "end": 6846105
  }, {
   "filename": "/gre/chrome/toolkit/skin/classic/global/numberinput.css",
   "start": 6846105,
   "end": 6846698
  }, {
   "filename": "/gre/chrome/toolkit/skin/classic/global/offlineSupportPages.css",
   "start": 6846698,
   "end": 6847165
  }, {
   "filename": "/gre/chrome/toolkit/skin/classic/global/pictureinpicture/player.css",
   "start": 6847165,
   "end": 6862245
  }, {
   "filename": "/gre/chrome/toolkit/skin/classic/global/pictureinpicture/texttracks.css",
   "start": 6862245,
   "end": 6864811
  }, {
   "filename": "/gre/chrome/toolkit/skin/classic/global/popup.css",
   "start": 6864811,
   "end": 6870710
  }, {
   "filename": "/gre/chrome/toolkit/skin/classic/global/popupnotification.css",
   "start": 6870710,
   "end": 6873526
  }, {
   "filename": "/gre/chrome/toolkit/skin/classic/global/printPageSetup.css",
   "start": 6873526,
   "end": 6874208
  }, {
   "filename": "/gre/chrome/toolkit/skin/classic/global/radio.css",
   "start": 6874208,
   "end": 6875817
  }, {
   "filename": "/gre/chrome/toolkit/skin/classic/global/reader/RM-Type-Controls-24x24.svg",
   "start": 6875817,
   "end": 6876746
  }, {
   "filename": "/gre/chrome/toolkit/skin/classic/global/reader/align-center-20.svg",
   "start": 6876746,
   "end": 6877622
  }, {
   "filename": "/gre/chrome/toolkit/skin/classic/global/reader/align-justify-20.svg",
   "start": 6877622,
   "end": 6878073
  }, {
   "filename": "/gre/chrome/toolkit/skin/classic/global/reader/align-left-20.svg",
   "start": 6878073,
   "end": 6878951
  }, {
   "filename": "/gre/chrome/toolkit/skin/classic/global/reader/align-right-20.svg",
   "start": 6878951,
   "end": 6879826
  }, {
   "filename": "/gre/chrome/toolkit/skin/classic/global/reader/character-spacing-20.svg",
   "start": 6879826,
   "end": 6881061
  }, {
   "filename": "/gre/chrome/toolkit/skin/classic/global/reader/content-width-20.svg",
   "start": 6881061,
   "end": 6882271
  }, {
   "filename": "/gre/chrome/toolkit/skin/classic/global/reader/line-spacing-20.svg",
   "start": 6882271,
   "end": 6883426
  }, {
   "filename": "/gre/chrome/toolkit/skin/classic/global/reader/word-spacing-20.svg",
   "start": 6883426,
   "end": 6884893
  }, {
   "filename": "/gre/chrome/toolkit/skin/classic/global/richlistbox.css",
   "start": 6884893,
   "end": 6889147
  }, {
   "filename": "/gre/chrome/toolkit/skin/classic/global/splitter.css",
   "start": 6889147,
   "end": 6891262
  }, {
   "filename": "/gre/chrome/toolkit/skin/classic/global/tabbox.css",
   "start": 6891262,
   "end": 6892337
  }, {
   "filename": "/gre/chrome/toolkit/skin/classic/global/toolbar.css",
   "start": 6892337,
   "end": 6894935
  }, {
   "filename": "/gre/chrome/toolkit/skin/classic/global/toolbarbutton.css",
   "start": 6894935,
   "end": 6897576
  }, {
   "filename": "/gre/chrome/toolkit/skin/classic/global/tree/sort-asc.svg",
   "start": 6897576,
   "end": 6898023
  }, {
   "filename": "/gre/chrome/toolkit/skin/classic/global/tree/sort-dsc.svg",
   "start": 6898023,
   "end": 6898471
  }, {
   "filename": "/gre/chrome/toolkit/skin/classic/global/tree/tree.css",
   "start": 6898471,
   "end": 6905034
  }, {
   "filename": "/gre/chrome/toolkit/skin/classic/global/wizard.css",
   "start": 6905034,
   "end": 6906052
  }, {
   "filename": "/gre/chrome/toolkit/skin/classic/mozapps/aboutProfiles.css",
   "start": 6906052,
   "end": 6906429
  }, {
   "filename": "/gre/chrome/toolkit/skin/classic/mozapps/aboutServiceWorkers.css",
   "start": 6906429,
   "end": 6907144
  }, {
   "filename": "/gre/chrome/toolkit/skin/classic/mozapps/downloads/unknownContentType.css",
   "start": 6907144,
   "end": 6907965
  }, {
   "filename": "/gre/chrome/toolkit/skin/classic/mozapps/extensions/category-available.svg",
   "start": 6907965,
   "end": 6909164
  }, {
   "filename": "/gre/chrome/toolkit/skin/classic/mozapps/extensions/category-extensions.svg",
   "start": 6909164,
   "end": 6911186
  }, {
   "filename": "/gre/chrome/toolkit/skin/classic/mozapps/extensions/category-plugins.svg",
   "start": 6911186,
   "end": 6912705
  }, {
   "filename": "/gre/chrome/toolkit/skin/classic/mozapps/extensions/category-recent.svg",
   "start": 6912705,
   "end": 6913386
  }, {
   "filename": "/gre/chrome/toolkit/skin/classic/mozapps/extensions/category-sitepermission.svg",
   "start": 6913386,
   "end": 6915105
  }, {
   "filename": "/gre/chrome/toolkit/skin/classic/mozapps/extensions/dictionaryGeneric.svg",
   "start": 6915105,
   "end": 6915810
  }, {
   "filename": "/gre/chrome/toolkit/skin/classic/mozapps/extensions/extension.svg",
   "start": 6915810,
   "end": 6917738
  }, {
   "filename": "/gre/chrome/toolkit/skin/classic/mozapps/extensions/extensionGeneric.svg",
   "start": 6917738,
   "end": 6918889
  }, {
   "filename": "/gre/chrome/toolkit/skin/classic/mozapps/extensions/line.svg",
   "start": 6918889,
   "end": 6930221
  }, {
   "filename": "/gre/chrome/toolkit/skin/classic/mozapps/extensions/themeGeneric.svg",
   "start": 6930221,
   "end": 6931966
  }, {
   "filename": "/gre/chrome/toolkit/skin/classic/mozapps/handling/handling.css",
   "start": 6931966,
   "end": 6932638
  }, {
   "filename": "/gre/chrome/toolkit/skin/classic/mozapps/profileDowngrade.css",
   "start": 6932638,
   "end": 6932999
  }, {
   "filename": "/gre/chrome/toolkit/skin/classic/mozapps/profileSelection.css",
   "start": 6932999,
   "end": 6933375
  }, {
   "filename": "/gre/chrome/toolkit/skin/classic/mozapps/update/updates.css",
   "start": 6933375,
   "end": 6934997
  }, {
   "filename": "/gre/components/ProcessSingleton.manifest",
   "start": 6934997,
   "end": 6935090
  }, {
   "filename": "/gre/components/Push.manifest",
   "start": 6935090,
   "end": 6935246
  }, {
   "filename": "/gre/components/SyncComponents.manifest",
   "start": 6935246,
   "end": 6935397
  }, {
   "filename": "/gre/components/TelemetryStartup.manifest",
   "start": 6935397,
   "end": 6935494
  }, {
   "filename": "/gre/components/antitracking.manifest",
   "start": 6935494,
   "end": 6935616
  }, {
   "filename": "/gre/components/extensions-toolkit.manifest",
   "start": 6935616,
   "end": 6936451
  }, {
   "filename": "/gre/components/extensions.manifest",
   "start": 6936451,
   "end": 6937057
  }, {
   "filename": "/gre/components/l10n-registry.manifest",
   "start": 6937057,
   "end": 6937233
  }, {
   "filename": "/gre/components/servicesComponents.manifest",
   "start": 6937233,
   "end": 6937326
  }, {
   "filename": "/gre/components/servicesSettings.manifest",
   "start": 6937326,
   "end": 6937815
  }, {
   "filename": "/gre/components/terminator.manifest",
   "start": 6937815,
   "end": 6937901
  }, {
   "filename": "/gre/contentaccessible/ImageDocument.css",
   "start": 6937901,
   "end": 6938733
  }, {
   "filename": "/gre/contentaccessible/TopLevelImageDocument.css",
   "start": 6938733,
   "end": 6940205
  }, {
   "filename": "/gre/contentaccessible/TopLevelVideoDocument.css",
   "start": 6940205,
   "end": 6941026
  }, {
   "filename": "/gre/contentaccessible/close-12.svg",
   "start": 6941026,
   "end": 6941489
  }, {
   "filename": "/gre/contentaccessible/html/folder.png",
   "start": 6941489,
   "end": 6942018
  }, {
   "filename": "/gre/contentaccessible/plaintext.css",
   "start": 6942018,
   "end": 6943012
  }, {
   "filename": "/gre/contentaccessible/viewsource.css",
   "start": 6943012,
   "end": 6944909
  }, {
   "filename": "/gre/default.locale",
   "start": 6944909,
   "end": 6944915
  }, {
   "filename": "/gre/defaults/autoconfig/prefcalls.js",
   "start": 6944915,
   "end": 6949978
  }, {
   "filename": "/gre/defaults/pref/PdfJsDefaultPrefs.js",
   "start": 6949978,
   "end": 6954308
  }, {
   "filename": "/gre/defaults/pref/channel-prefs.js",
   "start": 6954308,
   "end": 6954737
  }, {
   "filename": "/gre/dependentlibs.list",
   "start": 6954737,
   "end": 6954747
  }, {
   "filename": "/gre/dependentlibs.list.gtest",
   "start": 6954747,
   "end": 6954763
  }, {
   "filename": "/gre/firefox.worker.js",
   "start": 6954763,
   "end": 6961146
  }, {
   "filename": "/gre/fonts/LiberationSans-Bold.ttf",
   "start": 6961146,
   "end": 7098198
  }, {
   "filename": "/gre/fonts/LiberationSans-BoldItalic.ttf",
   "start": 7098198,
   "end": 7233322
  }, {
   "filename": "/gre/fonts/LiberationSans-Italic.ttf",
   "start": 7233322,
   "end": 7395358
  }, {
   "filename": "/gre/fonts/LiberationSans-Regular.ttf",
   "start": 7395358,
   "end": 7534870
  }, {
   "filename": "/gre/greprefs.js",
   "start": 7534870,
   "end": 7623363
  }, {
   "filename": "/gre/localization/en-US/crashreporter/aboutcrashes.ftl",
   "start": 7623363,
   "end": 7624572
  }, {
   "filename": "/gre/localization/en-US/crashreporter/crashreporter.ftl",
   "start": 7624572,
   "end": 7627896
  }, {
   "filename": "/gre/localization/en-US/dom/XMLPrettyPrint.ftl",
   "start": 7627896,
   "end": 7628229
  }, {
   "filename": "/gre/localization/en-US/dom/media.ftl",
   "start": 7628229,
   "end": 7628561
  }, {
   "filename": "/gre/localization/en-US/dom/xslt.ftl",
   "start": 7628561,
   "end": 7631430
  }, {
   "filename": "/gre/localization/en-US/locales-preview/aboutRestricted.ftl",
   "start": 7631430,
   "end": 7632922
  }, {
   "filename": "/gre/localization/en-US/locales-preview/smartWindow-aboutAddons.ftl",
   "start": 7632922,
   "end": 7633366
  }, {
   "filename": "/gre/localization/en-US/netwerk/necko.ftl",
   "start": 7633366,
   "end": 7634376
  }, {
   "filename": "/gre/localization/en-US/preview/aboutInference.ftl",
   "start": 7634376,
   "end": 7636152
  }, {
   "filename": "/gre/localization/en-US/security/certificates/certManager.ftl",
   "start": 7636152,
   "end": 7644173
  }, {
   "filename": "/gre/localization/en-US/security/certificates/deviceManager.ftl",
   "start": 7644173,
   "end": 7647109
  }, {
   "filename": "/gre/localization/en-US/security/pippki/pippki.ftl",
   "start": 7647109,
   "end": 7652474
  }, {
   "filename": "/gre/localization/en-US/services/accounts.ftl",
   "start": 7652474,
   "end": 7652866
  }, {
   "filename": "/gre/localization/en-US/toolkit/about/aboutAbout.ftl",
   "start": 7652866,
   "end": 7653326
  }, {
   "filename": "/gre/localization/en-US/toolkit/about/aboutAddons.ftl",
   "start": 7653326,
   "end": 7680174
  }, {
   "filename": "/gre/localization/en-US/toolkit/about/aboutCompat.ftl",
   "start": 7680174,
   "end": 7681159
  }, {
   "filename": "/gre/localization/en-US/toolkit/about/aboutGlean.ftl",
   "start": 7681159,
   "end": 7693548
  }, {
   "filename": "/gre/localization/en-US/toolkit/about/aboutHttpsOnlyError.ftl",
   "start": 7693548,
   "end": 7695433
  }, {
   "filename": "/gre/localization/en-US/toolkit/about/aboutLogging.ftl",
   "start": 7695433,
   "end": 7703169
  }, {
   "filename": "/gre/localization/en-US/toolkit/about/aboutMozilla.ftl",
   "start": 7703169,
   "end": 7703847
  }, {
   "filename": "/gre/localization/en-US/toolkit/about/aboutNetworking.ftl",
   "start": 7703847,
   "end": 7706301
  }, {
   "filename": "/gre/localization/en-US/toolkit/about/aboutPDF.ftl",
   "start": 7706301,
   "end": 7707435
  }, {
   "filename": "/gre/localization/en-US/toolkit/about/aboutProcesses.ftl",
   "start": 7707435,
   "end": 7715619
  }, {
   "filename": "/gre/localization/en-US/toolkit/about/aboutProfiles.ftl",
   "start": 7715619,
   "end": 7719026
  }, {
   "filename": "/gre/localization/en-US/toolkit/about/aboutReader.ftl",
   "start": 7719026,
   "end": 7722215
  }, {
   "filename": "/gre/localization/en-US/toolkit/about/aboutServiceWorkers.ftl",
   "start": 7722215,
   "end": 7723810
  }, {
   "filename": "/gre/localization/en-US/toolkit/about/aboutSupport.ftl",
   "start": 7723810,
   "end": 7742766
  }, {
   "filename": "/gre/localization/en-US/toolkit/about/aboutTelemetry.ftl",
   "start": 7742766,
   "end": 7750642
  }, {
   "filename": "/gre/localization/en-US/toolkit/about/aboutThirdParty.ftl",
   "start": 7750642,
   "end": 7754145
  }, {
   "filename": "/gre/localization/en-US/toolkit/about/aboutTranslations.ftl",
   "start": 7754145,
   "end": 7758507
  }, {
   "filename": "/gre/localization/en-US/toolkit/about/aboutWebauthn.ftl",
   "start": 7758507,
   "end": 7768458
  }, {
   "filename": "/gre/localization/en-US/toolkit/about/aboutWebrtc.ftl",
   "start": 7768458,
   "end": 7782193
  }, {
   "filename": "/gre/localization/en-US/toolkit/about/aboutWindowsMessages.ftl",
   "start": 7782193,
   "end": 7783203
  }, {
   "filename": "/gre/localization/en-US/toolkit/about/certviewer.ftl",
   "start": 7783203,
   "end": 7788859
  }, {
   "filename": "/gre/localization/en-US/toolkit/about/config.ftl",
   "start": 7788859,
   "end": 7790878
  }, {
   "filename": "/gre/localization/en-US/toolkit/about/url-classifier.ftl",
   "start": 7790878,
   "end": 7793692
  }, {
   "filename": "/gre/localization/en-US/toolkit/branding/brandings.ftl",
   "start": 7793692,
   "end": 7795916
  }, {
   "filename": "/gre/localization/en-US/toolkit/contentanalysis/contentanalysis.ftl",
   "start": 7795916,
   "end": 7802987
  }, {
   "filename": "/gre/localization/en-US/toolkit/downloads/downloadUI.ftl",
   "start": 7802987,
   "end": 7805385
  }, {
   "filename": "/gre/localization/en-US/toolkit/downloads/downloadUtils.ftl",
   "start": 7805385,
   "end": 7808559
  }, {
   "filename": "/gre/localization/en-US/toolkit/firefoxlabs/features.ftl",
   "start": 7808559,
   "end": 7816388
  }, {
   "filename": "/gre/localization/en-US/toolkit/formautofill/formAutofill.ftl",
   "start": 7816388,
   "end": 7820452
  }, {
   "filename": "/gre/localization/en-US/toolkit/global/alert.ftl",
   "start": 7820452,
   "end": 7820827
  }, {
   "filename": "/gre/localization/en-US/toolkit/global/antiTracking.ftl",
   "start": 7820827,
   "end": 7822096
  }, {
   "filename": "/gre/localization/en-US/toolkit/global/appPicker.ftl",
   "start": 7822096,
   "end": 7822498
  }, {
   "filename": "/gre/localization/en-US/toolkit/global/arrowscrollbox.ftl",
   "start": 7822498,
   "end": 7823629
  }, {
   "filename": "/gre/localization/en-US/toolkit/global/browser-utils.ftl",
   "start": 7823629,
   "end": 7824371
  }, {
   "filename": "/gre/localization/en-US/toolkit/global/commonDialog.ftl",
   "start": 7824371,
   "end": 7825105
  }, {
   "filename": "/gre/localization/en-US/toolkit/global/contextual-identity.ftl",
   "start": 7825105,
   "end": 7827196
  }, {
   "filename": "/gre/localization/en-US/toolkit/global/cookieBannerHandling.ftl",
   "start": 7827196,
   "end": 7827502
  }, {
   "filename": "/gre/localization/en-US/toolkit/global/createProfileWizard.ftl",
   "start": 7827502,
   "end": 7829551
  }, {
   "filename": "/gre/localization/en-US/toolkit/global/cspErrors.ftl",
   "start": 7829551,
   "end": 7831409
  }, {
   "filename": "/gre/localization/en-US/toolkit/global/datetimebox.ftl",
   "start": 7831409,
   "end": 7832509
  }, {
   "filename": "/gre/localization/en-US/toolkit/global/datetimepicker.ftl",
   "start": 7832509,
   "end": 7835861
  }, {
   "filename": "/gre/localization/en-US/toolkit/global/extensionPermissions.ftl",
   "start": 7835861,
   "end": 7841430
  }, {
   "filename": "/gre/localization/en-US/toolkit/global/extensions.ftl",
   "start": 7841430,
   "end": 7850671
  }, {
   "filename": "/gre/localization/en-US/toolkit/global/handlerDialog.ftl",
   "start": 7850671,
   "end": 7855615
  }, {
   "filename": "/gre/localization/en-US/toolkit/global/htmlForm.ftl",
   "start": 7855615,
   "end": 7856552
  }, {
   "filename": "/gre/localization/en-US/toolkit/global/mozBadge.ftl",
   "start": 7856552,
   "end": 7856921
  }, {
   "filename": "/gre/localization/en-US/toolkit/global/mozBoxBase.ftl",
   "start": 7856921,
   "end": 7857489
  }, {
   "filename": "/gre/localization/en-US/toolkit/global/mozBreadcrumbGroup.ftl",
   "start": 7857489,
   "end": 7857897
  }, {
   "filename": "/gre/localization/en-US/toolkit/global/mozButton.ftl",
   "start": 7857897,
   "end": 7858180
  }, {
   "filename": "/gre/localization/en-US/toolkit/global/mozFiveStar.ftl",
   "start": 7858180,
   "end": 7858935
  }, {
   "filename": "/gre/localization/en-US/toolkit/global/mozInputFolder.ftl",
   "start": 7858935,
   "end": 7859360
  }, {
   "filename": "/gre/localization/en-US/toolkit/global/mozMessageBar.ftl",
   "start": 7859360,
   "end": 7859816
  }, {
   "filename": "/gre/localization/en-US/toolkit/global/mozPageHeader.ftl",
   "start": 7859816,
   "end": 7860061
  }, {
   "filename": "/gre/localization/en-US/toolkit/global/mozSupportLink.ftl",
   "start": 7860061,
   "end": 7860296
  }, {
   "filename": "/gre/localization/en-US/toolkit/global/notification.ftl",
   "start": 7860296,
   "end": 7860877
  }, {
   "filename": "/gre/localization/en-US/toolkit/global/popupnotification.ftl",
   "start": 7860877,
   "end": 7861264
  }, {
   "filename": "/gre/localization/en-US/toolkit/global/processTypes.ftl",
   "start": 7861264,
   "end": 7863450
  }, {
   "filename": "/gre/localization/en-US/toolkit/global/profileDowngrade.ftl",
   "start": 7863450,
   "end": 7864639
  }, {
   "filename": "/gre/localization/en-US/toolkit/global/profileSelection.ftl",
   "start": 7864639,
   "end": 7866222
  }, {
   "filename": "/gre/localization/en-US/toolkit/global/resetProfile.ftl",
   "start": 7866222,
   "end": 7867059
  }, {
   "filename": "/gre/localization/en-US/toolkit/global/resistFingerPrinting.ftl",
   "start": 7867059,
   "end": 7867486
  }, {
   "filename": "/gre/localization/en-US/toolkit/global/run-from-dmg.ftl",
   "start": 7867486,
   "end": 7869084
  }, {
   "filename": "/gre/localization/en-US/toolkit/global/textActions.ftl",
   "start": 7869084,
   "end": 7871930
  }, {
   "filename": "/gre/localization/en-US/toolkit/global/tree.ftl",
   "start": 7871930,
   "end": 7872198
  }, {
   "filename": "/gre/localization/en-US/toolkit/global/unknownContentType.ftl",
   "start": 7872198,
   "end": 7873588
  }, {
   "filename": "/gre/localization/en-US/toolkit/global/videocontrols.ftl",
   "start": 7873588,
   "end": 7877096
  }, {
   "filename": "/gre/localization/en-US/toolkit/global/wizard.ftl",
   "start": 7877096,
   "end": 7877942
  }, {
   "filename": "/gre/localization/en-US/toolkit/intl/languageNames.ftl",
   "start": 7877942,
   "end": 7884017
  }, {
   "filename": "/gre/localization/en-US/toolkit/intl/regionNames.ftl",
   "start": 7884017,
   "end": 7892052
  }, {
   "filename": "/gre/localization/en-US/toolkit/main-window/autocomplete.ftl",
   "start": 7892052,
   "end": 7892943
  }, {
   "filename": "/gre/localization/en-US/toolkit/main-window/findbar.ftl",
   "start": 7892943,
   "end": 7895173
  }, {
   "filename": "/gre/localization/en-US/toolkit/neterror/certError.ftl",
   "start": 7895173,
   "end": 7918002
  }, {
   "filename": "/gre/localization/en-US/toolkit/neterror/netError.ftl",
   "start": 7918002,
   "end": 7936666
  }, {
   "filename": "/gre/localization/en-US/toolkit/neterror/nsserrors.ftl",
   "start": 7936666,
   "end": 7967536
  }, {
   "filename": "/gre/localization/en-US/toolkit/passwordmgr/passwordmgr.ftl",
   "start": 7967536,
   "end": 7969025
  }, {
   "filename": "/gre/localization/en-US/toolkit/payments/payments.ftl",
   "start": 7969025,
   "end": 7971037
  }, {
   "filename": "/gre/localization/en-US/toolkit/pdfviewer/viewer.ftl",
   "start": 7971037,
   "end": 8000837
  }, {
   "filename": "/gre/localization/en-US/toolkit/pictureinpicture/pictureinpicture.ftl",
   "start": 8000837,
   "end": 8003299
  }, {
   "filename": "/gre/localization/en-US/toolkit/preferences/preferences.ftl",
   "start": 8003299,
   "end": 8005623
  }, {
   "filename": "/gre/localization/en-US/toolkit/printing/printDialogs.ftl",
   "start": 8005623,
   "end": 8008155
  }, {
   "filename": "/gre/localization/en-US/toolkit/printing/printPreview.ftl",
   "start": 8008155,
   "end": 8010282
  }, {
   "filename": "/gre/localization/en-US/toolkit/printing/printUI.ftl",
   "start": 8010282,
   "end": 8015432
  }, {
   "filename": "/gre/localization/en-US/toolkit/updates/backgroundupdate.ftl",
   "start": 8015432,
   "end": 8016029
  }, {
   "filename": "/gre/localization/en-US/toolkit/updates/elevation.ftl",
   "start": 8016029,
   "end": 8017447
  }, {
   "filename": "/gre/localization/en-US/toolkit/updates/history.ftl",
   "start": 8017447,
   "end": 8018403
  }, {
   "filename": "/gre/localization/en-US/toolkit/webauthnDialog.ftl",
   "start": 8018403,
   "end": 8023207
  }, {
   "filename": "/gre/modules/AboutCertViewerChild.sys.mjs",
   "start": 8023207,
   "end": 8023556
  }, {
   "filename": "/gre/modules/AboutCertViewerParent.sys.mjs",
   "start": 8023556,
   "end": 8024673
  }, {
   "filename": "/gre/modules/AboutPagesUtils.sys.mjs",
   "start": 8024673,
   "end": 8025662
  }, {
   "filename": "/gre/modules/AbuseReporter.sys.mjs",
   "start": 8025662,
   "end": 8033605
  }, {
   "filename": "/gre/modules/ActorManagerParent.sys.mjs",
   "start": 8033605,
   "end": 8057200
  }, {
   "filename": "/gre/modules/AddonManager.sys.mjs",
   "start": 8057200,
   "end": 8246244
  }, {
   "filename": "/gre/modules/AppConstants.sys.mjs",
   "start": 8246244,
   "end": 8252262
  }, {
   "filename": "/gre/modules/AppMenuNotifications.sys.mjs",
   "start": 8252262,
   "end": 8257589
  }, {
   "filename": "/gre/modules/AppServicesTracing.sys.mjs",
   "start": 8257589,
   "end": 8270255
  }, {
   "filename": "/gre/modules/AsyncPrefs.sys.mjs",
   "start": 8270255,
   "end": 8275732
  }, {
   "filename": "/gre/modules/AsyncShutdown.sys.mjs",
   "start": 8275732,
   "end": 8312620
  }, {
   "filename": "/gre/modules/AutoCompleteSimpleSearch.sys.mjs",
   "start": 8312620,
   "end": 8313819
  }, {
   "filename": "/gre/modules/BHRTelemetryService.sys.mjs",
   "start": 8313819,
   "end": 8319129
  }, {
   "filename": "/gre/modules/BTPRemoteExceptionList.sys.mjs",
   "start": 8319129,
   "end": 8322007
  }, {
   "filename": "/gre/modules/BackgroundPageThumbs.sys.mjs",
   "start": 8322007,
   "end": 8347461
  }, {
   "filename": "/gre/modules/BinarySearch.sys.mjs",
   "start": 8347461,
   "end": 8350059
  }, {
   "filename": "/gre/modules/Bits.sys.mjs",
   "start": 8350059,
   "end": 8375423
  }, {
   "filename": "/gre/modules/Blocklist.sys.mjs",
   "start": 8375423,
   "end": 8429582
  }, {
   "filename": "/gre/modules/BookmarkHTMLUtils.sys.mjs",
   "start": 8429582,
   "end": 8464704
  }, {
   "filename": "/gre/modules/BookmarkJSONUtils.sys.mjs",
   "start": 8464704,
   "end": 8483069
  }, {
   "filename": "/gre/modules/BookmarkList.sys.mjs",
   "start": 8483069,
   "end": 8490594
  }, {
   "filename": "/gre/modules/Bookmarks.sys.mjs",
   "start": 8490594,
   "end": 8607563
  }, {
   "filename": "/gre/modules/BreachAlertStore.sys.mjs",
   "start": 8607563,
   "end": 8610655
  }, {
   "filename": "/gre/modules/BrowserTelemetryUtils.sys.mjs",
   "start": 8610655,
   "end": 8612890
  }, {
   "filename": "/gre/modules/BrowserUtils.sys.mjs",
   "start": 8612890,
   "end": 8646639
  }, {
   "filename": "/gre/modules/CSV.sys.mjs",
   "start": 8646639,
   "end": 8650074
  }, {
   "filename": "/gre/modules/CanonicalJSON.sys.mjs",
   "start": 8650074,
   "end": 8652287
  }, {
   "filename": "/gre/modules/CanvasHashData.sys.mjs",
   "start": 8652287,
   "end": 8694551
  }, {
   "filename": "/gre/modules/CaptchaDetectionPingUtils.sys.mjs",
   "start": 8694551,
   "end": 8701936
  }, {
   "filename": "/gre/modules/CaptchaResponseObserver.sys.mjs",
   "start": 8701936,
   "end": 8705770
  }, {
   "filename": "/gre/modules/CaptiveDetect.sys.mjs",
   "start": 8705770,
   "end": 8723075
  }, {
   "filename": "/gre/modules/CertUtils.sys.mjs",
   "start": 8723075,
   "end": 8725755
  }, {
   "filename": "/gre/modules/ChromePushSubscription.sys.mjs",
   "start": 8725755,
   "end": 8728258
  }, {
   "filename": "/gre/modules/ClearBySiteEntry.sys.mjs",
   "start": 8728258,
   "end": 8728964
  }, {
   "filename": "/gre/modules/ClearDataService.sys.mjs",
   "start": 8728964,
   "end": 8811439
  }, {
   "filename": "/gre/modules/ClientID.sys.mjs",
   "start": 8811439,
   "end": 8842890
  }, {
   "filename": "/gre/modules/ClipboardContextMenu.sys.mjs",
   "start": 8842890,
   "end": 8849327
  }, {
   "filename": "/gre/modules/Color.sys.mjs",
   "start": 8849327,
   "end": 8853025
  }, {
   "filename": "/gre/modules/ColorwayThemeMigration.sys.mjs",
   "start": 8853025,
   "end": 8856180
  }, {
   "filename": "/gre/modules/CommonDialog.sys.mjs",
   "start": 8856180,
   "end": 8867776
  }, {
   "filename": "/gre/modules/ComponentUtils.sys.mjs",
   "start": 8867776,
   "end": 8868766
  }, {
   "filename": "/gre/modules/ConduitsChild.sys.mjs",
   "start": 8868766,
   "end": 8875148
  }, {
   "filename": "/gre/modules/ConduitsParent.sys.mjs",
   "start": 8875148,
   "end": 8890848
  }, {
   "filename": "/gre/modules/Console.sys.mjs",
   "start": 8890848,
   "end": 8913418
  }, {
   "filename": "/gre/modules/ConsoleAPIStorage.sys.mjs",
   "start": 8913418,
   "end": 8920741
  }, {
   "filename": "/gre/modules/ContentAnalysisUtils.sys.mjs",
   "start": 8920741,
   "end": 8925160
  }, {
   "filename": "/gre/modules/ContentAreaDropListener.sys.mjs",
   "start": 8925160,
   "end": 8935969
  }, {
   "filename": "/gre/modules/ContentBlockingAllowList.sys.mjs",
   "start": 8935969,
   "end": 8939295
  }, {
   "filename": "/gre/modules/ContentClassifierRemoteSettingsClient.sys.mjs",
   "start": 8939295,
   "end": 8944510
  }, {
   "filename": "/gre/modules/ContentDOMReference.sys.mjs",
   "start": 8944510,
   "end": 8950014
  }, {
   "filename": "/gre/modules/ContentDispatchChooser.sys.mjs",
   "start": 8950014,
   "end": 8964937
  }, {
   "filename": "/gre/modules/ContentPrefService2.sys.mjs",
   "start": 8964937,
   "end": 9012374
  }, {
   "filename": "/gre/modules/ContentPrefServiceChild.sys.mjs",
   "start": 9012374,
   "end": 9017169
  }, {
   "filename": "/gre/modules/ContentPrefServiceParent.sys.mjs",
   "start": 9017169,
   "end": 9021756
  }, {
   "filename": "/gre/modules/ContentPrefStore.sys.mjs",
   "start": 9021756,
   "end": 9024760
  }, {
   "filename": "/gre/modules/ContentPrefUtils.sys.mjs",
   "start": 9024760,
   "end": 9026653
  }, {
   "filename": "/gre/modules/ContentRelevancyManager.sys.mjs",
   "start": 9026653,
   "end": 9043394
  }, {
   "filename": "/gre/modules/ContextualIdentityService.sys.mjs",
   "start": 9043394,
   "end": 9068967
  }, {
   "filename": "/gre/modules/CookieBannerListService.sys.mjs",
   "start": 9068967,
   "end": 9079347
  }, {
   "filename": "/gre/modules/CoveragePing.sys.mjs",
   "start": 9079347,
   "end": 9084733
  }, {
   "filename": "/gre/modules/CrashMonitor.sys.mjs",
   "start": 9084733,
   "end": 9092627
  }, {
   "filename": "/gre/modules/CredentialChooserService.sys.mjs",
   "start": 9092627,
   "end": 9100394
  }, {
   "filename": "/gre/modules/Credentials.sys.mjs",
   "start": 9100394,
   "end": 9104467
  }, {
   "filename": "/gre/modules/CreditCard.sys.mjs",
   "start": 9104467,
   "end": 9118693
  }, {
   "filename": "/gre/modules/CustomElementsListener.sys.mjs",
   "start": 9118693,
   "end": 9119826
  }, {
   "filename": "/gre/modules/DAPIncrementality.sys.mjs",
   "start": 9119826,
   "end": 9128415
  }, {
   "filename": "/gre/modules/DAPReportController.sys.mjs",
   "start": 9128415,
   "end": 9135971
  }, {
   "filename": "/gre/modules/DAPSender.sys.mjs",
   "start": 9135971,
   "end": 9146513
  }, {
   "filename": "/gre/modules/DAPTelemetrySender.sys.mjs",
   "start": 9146513,
   "end": 9151220
  }, {
   "filename": "/gre/modules/DAPVisitCounter.sys.mjs",
   "start": 9151220,
   "end": 9156435
  }, {
   "filename": "/gre/modules/DefaultCLH.sys.mjs",
   "start": 9156435,
   "end": 9159592
  }, {
   "filename": "/gre/modules/DeferredTask.sys.mjs",
   "start": 9159592,
   "end": 9175144
  }, {
   "filename": "/gre/modules/DownloadCore.sys.mjs",
   "start": 9175144,
   "end": 9291666
  }, {
   "filename": "/gre/modules/DownloadHistory.sys.mjs",
   "start": 9291666,
   "end": 9321268
  }, {
   "filename": "/gre/modules/DownloadIntegration.sys.mjs",
   "start": 9321268,
   "end": 9379939
  }, {
   "filename": "/gre/modules/DownloadLastDir.sys.mjs",
   "start": 9379939,
   "end": 9387698
  }, {
   "filename": "/gre/modules/DownloadLegacy.sys.mjs",
   "start": 9387698,
   "end": 9404312
  }, {
   "filename": "/gre/modules/DownloadList.sys.mjs",
   "start": 9404312,
   "end": 9421002
  }, {
   "filename": "/gre/modules/DownloadPaths.sys.mjs",
   "start": 9421002,
   "end": 9425911
  }, {
   "filename": "/gre/modules/DownloadStore.sys.mjs",
   "start": 9425911,
   "end": 9432559
  }, {
   "filename": "/gre/modules/DownloadUIHelper.sys.mjs",
   "start": 9432559,
   "end": 9441633
  }, {
   "filename": "/gre/modules/DownloadUtils.sys.mjs",
   "start": 9441633,
   "end": 9458988
  }, {
   "filename": "/gre/modules/Downloads.sys.mjs",
   "start": 9458988,
   "end": 9470033
  }, {
   "filename": "/gre/modules/E10SUtils.sys.mjs",
   "start": 9470033,
   "end": 9483091
  }, {
   "filename": "/gre/modules/EnterprisePolicies.sys.mjs",
   "start": 9483091,
   "end": 9483921
  }, {
   "filename": "/gre/modules/EnterprisePoliciesContent.sys.mjs",
   "start": 9483921,
   "end": 9485770
  }, {
   "filename": "/gre/modules/EnterprisePoliciesParent.sys.mjs",
   "start": 9485770,
   "end": 9511702
  }, {
   "filename": "/gre/modules/EssentialDomainsRemoteSettings.sys.mjs",
   "start": 9511702,
   "end": 9515664
  }, {
   "filename": "/gre/modules/EventEmitter.sys.mjs",
   "start": 9515664,
   "end": 9521227
  }, {
   "filename": "/gre/modules/EventPing.sys.mjs",
   "start": 9521227,
   "end": 9528397
  }, {
   "filename": "/gre/modules/ExtHandlerService.sys.mjs",
   "start": 9528397,
   "end": 9554900
  }, {
   "filename": "/gre/modules/Extension.sys.mjs",
   "start": 9554900,
   "end": 9712397
  }, {
   "filename": "/gre/modules/ExtensionActions.sys.mjs",
   "start": 9712397,
   "end": 9736168
  }, {
   "filename": "/gre/modules/ExtensionActivityLog.sys.mjs",
   "start": 9736168,
   "end": 9739579
  }, {
   "filename": "/gre/modules/ExtensionChild.sys.mjs",
   "start": 9739579,
   "end": 9771308
  }, {
   "filename": "/gre/modules/ExtensionChildDevToolsUtils.sys.mjs",
   "start": 9771308,
   "end": 9774508
  }, {
   "filename": "/gre/modules/ExtensionCommon.sys.mjs",
   "start": 9774508,
   "end": 9870011
  }, {
   "filename": "/gre/modules/ExtensionContent.sys.mjs",
   "start": 9870011,
   "end": 9922646
  }, {
   "filename": "/gre/modules/ExtensionDNR.sys.mjs",
   "start": 9922646,
   "end": 10016254
  }, {
   "filename": "/gre/modules/ExtensionDNRLimits.sys.mjs",
   "start": 10016254,
   "end": 10019420
  }, {
   "filename": "/gre/modules/ExtensionDNRStore.sys.mjs",
   "start": 10019420,
   "end": 10088981
  }, {
   "filename": "/gre/modules/ExtensionDocumentId.sys.mjs",
   "start": 10088981,
   "end": 10093324
  }, {
   "filename": "/gre/modules/ExtensionMenus.sys.mjs",
   "start": 10093324,
   "end": 10112826
  }, {
   "filename": "/gre/modules/ExtensionPageChild.sys.mjs",
   "start": 10112826,
   "end": 10128003
  }, {
   "filename": "/gre/modules/ExtensionParent.sys.mjs",
   "start": 10128003,
   "end": 10205417
  }, {
   "filename": "/gre/modules/ExtensionPermissionMessages.sys.mjs",
   "start": 10205417,
   "end": 10209343
  }, {
   "filename": "/gre/modules/ExtensionPermissions.sys.mjs",
   "start": 10209343,
   "end": 10243609
  }, {
   "filename": "/gre/modules/ExtensionPreferencesManager.sys.mjs",
   "start": 10243609,
   "end": 10266505
  }, {
   "filename": "/gre/modules/ExtensionProcessScript.sys.mjs",
   "start": 10266505,
   "end": 10283761
  }, {
   "filename": "/gre/modules/ExtensionScriptingStore.sys.mjs",
   "start": 10283761,
   "end": 10295291
  }, {
   "filename": "/gre/modules/ExtensionSearchHandler.sys.mjs",
   "start": 10295291,
   "end": 10306484
  }, {
   "filename": "/gre/modules/ExtensionSettingsStore.sys.mjs",
   "start": 10306484,
   "end": 10328581
  }, {
   "filename": "/gre/modules/ExtensionShortcuts.sys.mjs",
   "start": 10328581,
   "end": 10344889
  }, {
   "filename": "/gre/modules/ExtensionStorage.sys.mjs",
   "start": 10344889,
   "end": 10365307
  }, {
   "filename": "/gre/modules/ExtensionStorageComponents.sys.mjs",
   "start": 10365307,
   "end": 10366477
  }, {
   "filename": "/gre/modules/ExtensionStorageIDB.sys.mjs",
   "start": 10366477,
   "end": 10401930
  }, {
   "filename": "/gre/modules/ExtensionStorageSync.sys.mjs",
   "start": 10401930,
   "end": 10406917
  }, {
   "filename": "/gre/modules/ExtensionStorageSyncKinto.sys.mjs",
   "start": 10406917,
   "end": 10452708
  }, {
   "filename": "/gre/modules/ExtensionTaskScheduler.sys.mjs",
   "start": 10452708,
   "end": 10462764
  }, {
   "filename": "/gre/modules/ExtensionTelemetry.sys.mjs",
   "start": 10462764,
   "end": 10472738
  }, {
   "filename": "/gre/modules/ExtensionUserScripts.sys.mjs",
   "start": 10472738,
   "end": 10499202
  }, {
   "filename": "/gre/modules/ExtensionUserScriptsContent.sys.mjs",
   "start": 10499202,
   "end": 10509e3
  }, {
   "filename": "/gre/modules/ExtensionUtils.sys.mjs",
   "start": 10509e3,
   "end": 10519205
  }, {
   "filename": "/gre/modules/ExtensionWorkerChild.sys.mjs",
   "start": 10519205,
   "end": 10545069
  }, {
   "filename": "/gre/modules/FileUtils.sys.mjs",
   "start": 10545069,
   "end": 10549298
  }, {
   "filename": "/gre/modules/FillHelpers.sys.mjs",
   "start": 10549298,
   "end": 10550898
  }, {
   "filename": "/gre/modules/FindBarContent.sys.mjs",
   "start": 10550898,
   "end": 10553682
  }, {
   "filename": "/gre/modules/FindContent.sys.mjs",
   "start": 10553682,
   "end": 10561248
  }, {
   "filename": "/gre/modules/Finder.sys.mjs",
   "start": 10561248,
   "end": 10586368
  }, {
   "filename": "/gre/modules/FinderHighlighter.sys.mjs",
   "start": 10586368,
   "end": 10659156
  }, {
   "filename": "/gre/modules/FinderIterator.sys.mjs",
   "start": 10659156,
   "end": 10688636
  }, {
   "filename": "/gre/modules/FinderParent.sys.mjs",
   "start": 10688636,
   "end": 10705787
  }, {
   "filename": "/gre/modules/FinderSound.sys.mjs",
   "start": 10705787,
   "end": 10707254
  }, {
   "filename": "/gre/modules/FingerprintingWebCompatService.sys.mjs",
   "start": 10707254,
   "end": 10716616
  }, {
   "filename": "/gre/modules/FirefoxRelay.sys.mjs",
   "start": 10716616,
   "end": 10755601
  }, {
   "filename": "/gre/modules/FirefoxRelayUtils.sys.mjs",
   "start": 10755601,
   "end": 10756344
  }, {
   "filename": "/gre/modules/FirstStartup.sys.mjs",
   "start": 10756344,
   "end": 10763087
  }, {
   "filename": "/gre/modules/ForgetAboutSite.sys.mjs",
   "start": 10763087,
   "end": 10764717
  }, {
   "filename": "/gre/modules/FormHistory.sys.mjs",
   "start": 10764717,
   "end": 10806841
  }, {
   "filename": "/gre/modules/FormHistoryAutoComplete.sys.mjs",
   "start": 10806841,
   "end": 10810874
  }, {
   "filename": "/gre/modules/FormHistoryStartup.sys.mjs",
   "start": 10810874,
   "end": 10811958
  }, {
   "filename": "/gre/modules/FormLikeFactory.sys.mjs",
   "start": 10811958,
   "end": 10820934
  }, {
   "filename": "/gre/modules/FormScenarios.sys.mjs",
   "start": 10820934,
   "end": 10823814
  }, {
   "filename": "/gre/modules/FxAccounts.sys.mjs",
   "start": 10823814,
   "end": 10876654
  }, {
   "filename": "/gre/modules/FxAccountsClient.sys.mjs",
   "start": 10876654,
   "end": 10902863
  }, {
   "filename": "/gre/modules/FxAccountsCommands.sys.mjs",
   "start": 10902863,
   "end": 10939128
  }, {
   "filename": "/gre/modules/FxAccountsCommon.sys.mjs",
   "start": 10939128,
   "end": 10959249
  }, {
   "filename": "/gre/modules/FxAccountsConfig.sys.mjs",
   "start": 10959249,
   "end": 10970804
  }, {
   "filename": "/gre/modules/FxAccountsDevice.sys.mjs",
   "start": 10970804,
   "end": 10993379
  }, {
   "filename": "/gre/modules/FxAccountsKeys.sys.mjs",
   "start": 10993379,
   "end": 11018809
  }, {
   "filename": "/gre/modules/FxAccountsOAuth.sys.mjs",
   "start": 11018809,
   "end": 11027876
  }, {
   "filename": "/gre/modules/FxAccountsPairing.sys.mjs",
   "start": 11027876,
   "end": 11043299
  }, {
   "filename": "/gre/modules/FxAccountsPairingChannel.sys.mjs",
   "start": 11043299,
   "end": 11158723
  }, {
   "filename": "/gre/modules/FxAccountsProfile.sys.mjs",
   "start": 11158723,
   "end": 11165235
  }, {
   "filename": "/gre/modules/FxAccountsProfileClient.sys.mjs",
   "start": 11165235,
   "end": 11173344
  }, {
   "filename": "/gre/modules/FxAccountsPush.sys.mjs",
   "start": 11173344,
   "end": 11183353
  }, {
   "filename": "/gre/modules/FxAccountsStorage.sys.mjs",
   "start": 11183353,
   "end": 11205909
  }, {
   "filename": "/gre/modules/FxAccountsTelemetry.sys.mjs",
   "start": 11205909,
   "end": 11213242
  }, {
   "filename": "/gre/modules/FxAccountsWebChannel.sys.mjs",
   "start": 11213242,
   "end": 11259580
  }, {
   "filename": "/gre/modules/GMPExtractor.worker.js",
   "start": 11259580,
   "end": 11263171
  }, {
   "filename": "/gre/modules/GMPInstallManager.sys.mjs",
   "start": 11263171,
   "end": 11295613
  }, {
   "filename": "/gre/modules/GMPUtils.sys.mjs",
   "start": 11295613,
   "end": 11305820
  }, {
   "filename": "/gre/modules/Geometry.sys.mjs",
   "start": 11305820,
   "end": 11314997
  }, {
   "filename": "/gre/modules/HPKEConfigManager.sys.mjs",
   "start": 11314997,
   "end": 11317500
  }, {
   "filename": "/gre/modules/HealthPing.sys.mjs",
   "start": 11317500,
   "end": 11325192
  }, {
   "filename": "/gre/modules/HelperAppDlg.sys.mjs",
   "start": 11325192,
   "end": 11373162
  }, {
   "filename": "/gre/modules/HiddenFrame.sys.mjs",
   "start": 11373162,
   "end": 11379572
  }, {
   "filename": "/gre/modules/History.sys.mjs",
   "start": 11379572,
   "end": 11436556
  }, {
   "filename": "/gre/modules/IdentityCredentialPromptService.sys.mjs",
   "start": 11436556,
   "end": 11455579
  }, {
   "filename": "/gre/modules/IgnoreLists.sys.mjs",
   "start": 11455579,
   "end": 11459136
  }, {
   "filename": "/gre/modules/ImageObjectProcessor.sys.mjs",
   "start": 11459136,
   "end": 11465834
  }, {
   "filename": "/gre/modules/IndexedDB.sys.mjs",
   "start": 11465834,
   "end": 11477070
  }, {
   "filename": "/gre/modules/IndexedDBHelper.sys.mjs",
   "start": 11477070,
   "end": 11483913
  }, {
   "filename": "/gre/modules/InlineSpellChecker.sys.mjs",
   "start": 11483913,
   "end": 11502866
  }, {
   "filename": "/gre/modules/InlineSpellCheckerContent.sys.mjs",
   "start": 11502866,
   "end": 11506157
  }, {
   "filename": "/gre/modules/InsecurePasswordUtils.sys.mjs",
   "start": 11506157,
   "end": 11512772
  }, {
   "filename": "/gre/modules/Integration.sys.mjs",
   "start": 11512772,
   "end": 11523369
  }, {
   "filename": "/gre/modules/JSONFile.sys.mjs",
   "start": 11523369,
   "end": 11540540
  }, {
   "filename": "/gre/modules/JsonSchema.sys.mjs",
   "start": 11540540,
   "end": 11546077
  }, {
   "filename": "/gre/modules/KeyboardLockUtils.sys.mjs",
   "start": 11546077,
   "end": 11547455
  }, {
   "filename": "/gre/modules/KeywordUtils.sys.mjs",
   "start": 11547455,
   "end": 11550694
  }, {
   "filename": "/gre/modules/LangPackMatcher.sys.mjs",
   "start": 11550694,
   "end": 11563693
  }, {
   "filename": "/gre/modules/LightweightThemeConsumer.sys.mjs",
   "start": 11563693,
   "end": 11589745
  }, {
   "filename": "/gre/modules/LightweightThemeManager.sys.mjs",
   "start": 11589745,
   "end": 11599407
  }, {
   "filename": "/gre/modules/LocationHelper.sys.mjs",
   "start": 11599407,
   "end": 11600715
  }, {
   "filename": "/gre/modules/Log.sys.mjs",
   "start": 11600715,
   "end": 11620115
  }, {
   "filename": "/gre/modules/LogManager.sys.mjs",
   "start": 11620115,
   "end": 11636504
  }, {
   "filename": "/gre/modules/LoginAutoComplete.sys.mjs",
   "start": 11636504,
   "end": 11648821
  }, {
   "filename": "/gre/modules/LoginCSVImport.sys.mjs",
   "start": 11648821,
   "end": 11655142
  }, {
   "filename": "/gre/modules/LoginExport.sys.mjs",
   "start": 11655142,
   "end": 11657268
  }, {
   "filename": "/gre/modules/LoginHelper.sys.mjs",
   "start": 11657268,
   "end": 11720629
  }, {
   "filename": "/gre/modules/LoginInfo.sys.mjs",
   "start": 11720629,
   "end": 11724167
  }, {
   "filename": "/gre/modules/LoginManager.shared.sys.mjs",
   "start": 11724167,
   "end": 11733420
  }, {
   "filename": "/gre/modules/LoginManager.sys.mjs",
   "start": 11733420,
   "end": 11749639
  }, {
   "filename": "/gre/modules/LoginManagerAuthPrompter.sys.mjs",
   "start": 11749639,
   "end": 11782042
  }, {
   "filename": "/gre/modules/LoginManagerChild.sys.mjs",
   "start": 11782042,
   "end": 11896576
  }, {
   "filename": "/gre/modules/LoginManagerContextMenu.sys.mjs",
   "start": 11896576,
   "end": 11903887
  }, {
   "filename": "/gre/modules/LoginManagerParent.sys.mjs",
   "start": 11903887,
   "end": 11956032
  }, {
   "filename": "/gre/modules/LoginManagerPrompter.sys.mjs",
   "start": 11956032,
   "end": 11992162
  }, {
   "filename": "/gre/modules/LoginManagerRustMirror.sys.mjs",
   "start": 11992162,
   "end": 12007314
  }, {
   "filename": "/gre/modules/LoginRecipes.sys.mjs",
   "start": 12007314,
   "end": 12018929
  }, {
   "filename": "/gre/modules/LoginRelatedRealms.sys.mjs",
   "start": 12018929,
   "end": 12022468
  }, {
   "filename": "/gre/modules/LoginStore.sys.mjs",
   "start": 12022468,
   "end": 12028287
  }, {
   "filename": "/gre/modules/MainProcessSingleton.sys.mjs",
   "start": 12028287,
   "end": 12029128
  }, {
   "filename": "/gre/modules/Manifest.sys.mjs",
   "start": 12029128,
   "end": 12037285
  }, {
   "filename": "/gre/modules/ManifestFinder.sys.mjs",
   "start": 12037285,
   "end": 12039091
  }, {
   "filename": "/gre/modules/ManifestIcons.sys.mjs",
   "start": 12039091,
   "end": 12041805
  }, {
   "filename": "/gre/modules/ManifestMessagesChild.sys.mjs",
   "start": 12041805,
   "end": 12045034
  }, {
   "filename": "/gre/modules/ManifestObtainer.sys.mjs",
   "start": 12045034,
   "end": 12050448
  }, {
   "filename": "/gre/modules/ManifestProcessor.sys.mjs",
   "start": 12050448,
   "end": 12060534
  }, {
   "filename": "/gre/modules/MatchURLFilters.sys.mjs",
   "start": 12060534,
   "end": 12065741
  }, {
   "filename": "/gre/modules/MessageManagerProxy.sys.mjs",
   "start": 12065741,
   "end": 12072003
  }, {
   "filename": "/gre/modules/MozProtocolHandler.sys.mjs",
   "start": 12072003,
   "end": 12073098
  }, {
   "filename": "/gre/modules/NLP.sys.mjs",
   "start": 12073098,
   "end": 12075063
  }, {
   "filename": "/gre/modules/NativeManifests.sys.mjs",
   "start": 12075063,
   "end": 12081720
  }, {
   "filename": "/gre/modules/NativeMessaging.sys.mjs",
   "start": 12081720,
   "end": 12096772
  }, {
   "filename": "/gre/modules/NetUtil.sys.mjs",
   "start": 12096772,
   "end": 12111685
  }, {
   "filename": "/gre/modules/NetworkErrorLogging.sys.mjs",
   "start": 12111685,
   "end": 12125765
  }, {
   "filename": "/gre/modules/NetworkGeolocationProvider.sys.mjs",
   "start": 12125765,
   "end": 12137950
  }, {
   "filename": "/gre/modules/NewTabUtils.sys.mjs",
   "start": 12137950,
   "end": 12202186
  }, {
   "filename": "/gre/modules/OSKeyStore.sys.mjs",
   "start": 12202186,
   "end": 12216632
  }, {
   "filename": "/gre/modules/ObjectUtils.sys.mjs",
   "start": 12216632,
   "end": 12222511
  }, {
   "filename": "/gre/modules/ObliviousHTTP.sys.mjs",
   "start": 12222511,
   "end": 12230042
  }, {
   "filename": "/gre/modules/OsEnvironment.sys.mjs",
   "start": 12230042,
   "end": 12232913
  }, {
   "filename": "/gre/modules/PageThumbUtils.sys.mjs",
   "start": 12232913,
   "end": 12247861
  }, {
   "filename": "/gre/modules/PageThumbs.sys.mjs",
   "start": 12247861,
   "end": 12279157
  }, {
   "filename": "/gre/modules/PageThumbs.worker.js",
   "start": 12279157,
   "end": 12283392
  }, {
   "filename": "/gre/modules/PageThumbsStorageService.sys.mjs",
   "start": 12283392,
   "end": 12285081
  }, {
   "filename": "/gre/modules/PartitioningExceptionListService.sys.mjs",
   "start": 12285081,
   "end": 12289152
  }, {
   "filename": "/gre/modules/PasswordRulesManager.sys.mjs",
   "start": 12289152,
   "end": 12292162
  }, {
   "filename": "/gre/modules/PermissionsUtils.sys.mjs",
   "start": 12292162,
   "end": 12295611
  }, {
   "filename": "/gre/modules/PictureInPicture.sys.mjs",
   "start": 12295611,
   "end": 12354879
  }, {
   "filename": "/gre/modules/PictureInPictureControls.sys.mjs",
   "start": 12354879,
   "end": 12356050
  }, {
   "filename": "/gre/modules/PlacesBackups.sys.mjs",
   "start": 12356050,
   "end": 12373319
  }, {
   "filename": "/gre/modules/PlacesDBUtils.sys.mjs",
   "start": 12373319,
   "end": 12426858
  }, {
   "filename": "/gre/modules/PlacesExpiration.sys.mjs",
   "start": 12426858,
   "end": 12460595
  }, {
   "filename": "/gre/modules/PlacesFrecencyRecalculator.sys.mjs",
   "start": 12460595,
   "end": 12488714
  }, {
   "filename": "/gre/modules/PlacesPreviews.sys.mjs",
   "start": 12488714,
   "end": 12503086
  }, {
   "filename": "/gre/modules/PlacesQuery.sys.mjs",
   "start": 12503086,
   "end": 12522849
  }, {
   "filename": "/gre/modules/PlacesSemanticHistoryDatabase.sys.mjs",
   "start": 12522849,
   "end": 12542247
  }, {
   "filename": "/gre/modules/PlacesSemanticHistoryManager.sys.mjs",
   "start": 12542247,
   "end": 12578948
  }, {
   "filename": "/gre/modules/PlacesSyncUtils.sys.mjs",
   "start": 12578948,
   "end": 12651264
  }, {
   "filename": "/gre/modules/PlacesTransactions.sys.mjs",
   "start": 12651264,
   "end": 12707552
  }, {
   "filename": "/gre/modules/PlacesUtils.sys.mjs",
   "start": 12707552,
   "end": 12810798
  }, {
   "filename": "/gre/modules/PopupNotifications.sys.mjs",
   "start": 12810798,
   "end": 12885758
  }, {
   "filename": "/gre/modules/Preferences.sys.mjs",
   "start": 12885758,
   "end": 12900025
  }, {
   "filename": "/gre/modules/PrincipalsCollector.sys.mjs",
   "start": 12900025,
   "end": 12906232
  }, {
   "filename": "/gre/modules/PrivateAttributionService.sys.mjs",
   "start": 12906232,
   "end": 12914638
  }, {
   "filename": "/gre/modules/PrivateBrowsingUtils.sys.mjs",
   "start": 12914638,
   "end": 12917100
  }, {
   "filename": "/gre/modules/ProcessType.sys.mjs",
   "start": 12917100,
   "end": 12918925
  }, {
   "filename": "/gre/modules/ProfileAge.sys.mjs",
   "start": 12918925,
   "end": 12925873
  }, {
   "filename": "/gre/modules/PromiseWorker.sys.mjs",
   "start": 12925873,
   "end": 12940807
  }, {
   "filename": "/gre/modules/PromptUtils.sys.mjs",
   "start": 12940807,
   "end": 12947836
  }, {
   "filename": "/gre/modules/Prompter.sys.mjs",
   "start": 12947836,
   "end": 13011717
  }, {
   "filename": "/gre/modules/ProxyChannelFilter.sys.mjs",
   "start": 13011717,
   "end": 13025631
  }, {
   "filename": "/gre/modules/PurgeTrackerService.sys.mjs",
   "start": 13025631,
   "end": 13042185
  }, {
   "filename": "/gre/modules/Push.sys.mjs",
   "start": 13042185,
   "end": 13051729
  }, {
   "filename": "/gre/modules/PushBroadcastService.sys.mjs",
   "start": 13051729,
   "end": 13060424
  }, {
   "filename": "/gre/modules/PushComponents.sys.mjs",
   "start": 13060424,
   "end": 13073393
  }, {
   "filename": "/gre/modules/PushCrypto.sys.mjs",
   "start": 13073393,
   "end": 13099183
  }, {
   "filename": "/gre/modules/PushDB.sys.mjs",
   "start": 13099183,
   "end": 13112160
  }, {
   "filename": "/gre/modules/PushRecord.sys.mjs",
   "start": 13112160,
   "end": 13121531
  }, {
   "filename": "/gre/modules/PushService.sys.mjs",
   "start": 13121531,
   "end": 13170246
  }, {
   "filename": "/gre/modules/PushServiceWebSocket.sys.mjs",
   "start": 13170246,
   "end": 13208487
  }, {
   "filename": "/gre/modules/RFPHelper.sys.mjs",
   "start": 13208487,
   "end": 13231007
  }, {
   "filename": "/gre/modules/RFPTargetConstants.sys.mjs",
   "start": 13231007,
   "end": 13236261
  }, {
   "filename": "/gre/modules/Readerable.sys.mjs",
   "start": 13236261,
   "end": 13243371
  }, {
   "filename": "/gre/modules/Region.sys.mjs",
   "start": 13243371,
   "end": 13270062
  }, {
   "filename": "/gre/modules/RemotePageAccessManager.sys.mjs",
   "start": 13270062,
   "end": 13284493
  }, {
   "filename": "/gre/modules/RemotePermissionService.sys.mjs",
   "start": 13284493,
   "end": 13290597
  }, {
   "filename": "/gre/modules/RemoteWebNavigation.sys.mjs",
   "start": 13290597,
   "end": 13297435
  }, {
   "filename": "/gre/modules/ResetProfile.sys.mjs",
   "start": 13297435,
   "end": 13301659
  }, {
   "filename": "/gre/modules/RustSharedRemoteSettingsService.sys.mjs",
   "start": 13301659,
   "end": 13307293
  }, {
   "filename": "/gre/modules/SafeBrowsing.sys.mjs",
   "start": 13307293,
   "end": 13325669
  }, {
   "filename": "/gre/modules/ScheduledTask.sys.mjs",
   "start": 13325669,
   "end": 13329496
  }, {
   "filename": "/gre/modules/Schemas.sys.mjs",
   "start": 13329496,
   "end": 13450416
  }, {
   "filename": "/gre/modules/SearchSuggestions.sys.mjs",
   "start": 13450416,
   "end": 13463783
  }, {
   "filename": "/gre/modules/SecurityInfo.sys.mjs",
   "start": 13463783,
   "end": 13476085
  }, {
   "filename": "/gre/modules/SelectionUtils.sys.mjs",
   "start": 13476085,
   "end": 13481490
  }, {
   "filename": "/gre/modules/ServiceRequest.sys.mjs",
   "start": 13481490,
   "end": 13486132
  }, {
   "filename": "/gre/modules/ServiceWorkerCleanUp.sys.mjs",
   "start": 13486132,
   "end": 13488958
  }, {
   "filename": "/gre/modules/ShieldContentProcess.sys.mjs",
   "start": 13488958,
   "end": 13489560
  }, {
   "filename": "/gre/modules/ShortcutUtils.sys.mjs",
   "start": 13489560,
   "end": 13504239
  }, {
   "filename": "/gre/modules/SignUpFormRuleset.sys.mjs",
   "start": 13504239,
   "end": 13525051
  }, {
   "filename": "/gre/modules/SimpleServices.sys.mjs",
   "start": 13525051,
   "end": 13531133
  }, {
   "filename": "/gre/modules/SimpleURIUnknownSchemesRemoteObserver.sys.mjs",
   "start": 13531133,
   "end": 13535266
  }, {
   "filename": "/gre/modules/SitePolicyUtils.sys.mjs",
   "start": 13535266,
   "end": 13536333
  }, {
   "filename": "/gre/modules/SlowScriptDebug.sys.mjs",
   "start": 13536333,
   "end": 13537027
  }, {
   "filename": "/gre/modules/Sqlite.sys.mjs",
   "start": 13537027,
   "end": 13611513
  }, {
   "filename": "/gre/modules/SubDialog.sys.mjs",
   "start": 13611513,
   "end": 13650401
  }, {
   "filename": "/gre/modules/Subprocess.sys.mjs",
   "start": 13650401,
   "end": 13657564
  }, {
   "filename": "/gre/modules/SyncedBookmarksMirror.sys.mjs",
   "start": 13657564,
   "end": 13746881
  }, {
   "filename": "/gre/modules/TaggingService.sys.mjs",
   "start": 13746881,
   "end": 13764230
  }, {
   "filename": "/gre/modules/TelemetryArchive.sys.mjs",
   "start": 13764230,
   "end": 13767682
  }, {
   "filename": "/gre/modules/TelemetryController.sys.mjs",
   "start": 13767682,
   "end": 13769280
  }, {
   "filename": "/gre/modules/TelemetryControllerBase.sys.mjs",
   "start": 13769280,
   "end": 13773941
  }, {
   "filename": "/gre/modules/TelemetryControllerContent.sys.mjs",
   "start": 13773941,
   "end": 13776424
  }, {
   "filename": "/gre/modules/TelemetryControllerParent.sys.mjs",
   "start": 13776424,
   "end": 13827787
  }, {
   "filename": "/gre/modules/TelemetryEnvironment.sys.mjs",
   "start": 13827787,
   "end": 13893777
  }, {
   "filename": "/gre/modules/TelemetryReportingPolicy.sys.mjs",
   "start": 13893777,
   "end": 13939501
  }, {
   "filename": "/gre/modules/TelemetryScheduler.sys.mjs",
   "start": 13939501,
   "end": 13953761
  }, {
   "filename": "/gre/modules/TelemetrySend.sys.mjs",
   "start": 13953761,
   "end": 14007844
  }, {
   "filename": "/gre/modules/TelemetrySession.sys.mjs",
   "start": 14007844,
   "end": 14052275
  }, {
   "filename": "/gre/modules/TelemetryStartup.sys.mjs",
   "start": 14052275,
   "end": 14053740
  }, {
   "filename": "/gre/modules/TelemetryStorage.sys.mjs",
   "start": 14053740,
   "end": 14121003
  }, {
   "filename": "/gre/modules/TelemetryTimestamps.sys.mjs",
   "start": 14121003,
   "end": 14122763
  }, {
   "filename": "/gre/modules/TelemetryUtils.sys.mjs",
   "start": 14122763,
   "end": 14132279
  }, {
   "filename": "/gre/modules/ThirdPartyCookieBlockingExceptionListService.sys.mjs",
   "start": 14132279,
   "end": 14139675
  }, {
   "filename": "/gre/modules/Timer.sys.mjs",
   "start": 14139675,
   "end": 14144067
  }, {
   "filename": "/gre/modules/TooltipTextProvider.sys.mjs",
   "start": 14144067,
   "end": 14149302
  }, {
   "filename": "/gre/modules/TrackingDBService.sys.mjs",
   "start": 14149302,
   "end": 14165090
  }, {
   "filename": "/gre/modules/Troubleshoot.sys.mjs",
   "start": 14165090,
   "end": 14201391
  }, {
   "filename": "/gre/modules/URIFixup.sys.mjs",
   "start": 14201391,
   "end": 14242739
  }, {
   "filename": "/gre/modules/URLDecorationAnnotationsService.sys.mjs",
   "start": 14242739,
   "end": 14244754
  }, {
   "filename": "/gre/modules/URLFormatter.sys.mjs",
   "start": 14244754,
   "end": 14250272
  }, {
   "filename": "/gre/modules/URLQueryStrippingListService.sys.mjs",
   "start": 14250272,
   "end": 14263975
  }, {
   "filename": "/gre/modules/UntrustedModulesPing.sys.mjs",
   "start": 14263975,
   "end": 14266159
  }, {
   "filename": "/gre/modules/UpdatePing.sys.mjs",
   "start": 14266159,
   "end": 14272189
  }, {
   "filename": "/gre/modules/UpdateTimerManager.sys.mjs",
   "start": 14272189,
   "end": 14285128
  }, {
   "filename": "/gre/modules/UpdateUtils.sys.mjs",
   "start": 14285128,
   "end": 14322320
  }, {
   "filename": "/gre/modules/UrlClassifierExceptionListService.sys.mjs",
   "start": 14322320,
   "end": 14333441
  }, {
   "filename": "/gre/modules/UrlClassifierHashCompleter.sys.mjs",
   "start": 14333441,
   "end": 14368984
  }, {
   "filename": "/gre/modules/UrlClassifierLib.sys.mjs",
   "start": 14368984,
   "end": 14374760
  }, {
   "filename": "/gre/modules/UrlClassifierListManager.sys.mjs",
   "start": 14374760,
   "end": 14402389
  }, {
   "filename": "/gre/modules/UrlClassifierRemoteSettingsService.sys.mjs",
   "start": 14402389,
   "end": 14406698
  }, {
   "filename": "/gre/modules/UrlUtils.sys.mjs",
   "start": 14406698,
   "end": 14415194
  }, {
   "filename": "/gre/modules/UsageReporting.sys.mjs",
   "start": 14415194,
   "end": 14422207
  }, {
   "filename": "/gre/modules/UserCharacteristicsPageService.sys.mjs",
   "start": 14422207,
   "end": 14479377
  }, {
   "filename": "/gre/modules/ValueExtractor.sys.mjs",
   "start": 14479377,
   "end": 14482500
  }, {
   "filename": "/gre/modules/WPTEventsChild.sys.mjs",
   "start": 14482500,
   "end": 14484412
  }, {
   "filename": "/gre/modules/WPTEventsParent.sys.mjs",
   "start": 14484412,
   "end": 14487514
  }, {
   "filename": "/gre/modules/WebAuthnFeature.sys.mjs",
   "start": 14487514,
   "end": 14491670
  }, {
   "filename": "/gre/modules/WebAuthnRelatedOriginFetcher.sys.mjs",
   "start": 14491670,
   "end": 14499715
  }, {
   "filename": "/gre/modules/WebChannel.sys.mjs",
   "start": 14499715,
   "end": 14509108
  }, {
   "filename": "/gre/modules/WebHandlerApp.sys.mjs",
   "start": 14509108,
   "end": 14515268
  }, {
   "filename": "/gre/modules/WebNavigation.sys.mjs",
   "start": 14515268,
   "end": 14528098
  }, {
   "filename": "/gre/modules/WebNavigationFrames.sys.mjs",
   "start": 14528098,
   "end": 14531168
  }, {
   "filename": "/gre/modules/WebRequest.sys.mjs",
   "start": 14531168,
   "end": 14571843
  }, {
   "filename": "/gre/modules/WebRequestUpload.sys.mjs",
   "start": 14571843,
   "end": 14588103
  }, {
   "filename": "/gre/modules/WebVTTParserWrapper.sys.mjs",
   "start": 14588103,
   "end": 14589700
  }, {
   "filename": "/gre/modules/WellKnownOpportunisticUtils.sys.mjs",
   "start": 14589700,
   "end": 14590399
  }, {
   "filename": "/gre/modules/WindowsMediaFoundationCDMOriginsListService.sys.mjs",
   "start": 14590399,
   "end": 14594973
  }, {
   "filename": "/gre/modules/XPCOMUtils.sys.mjs",
   "start": 14594973,
   "end": 14608887
  }, {
   "filename": "/gre/modules/XULStore.sys.mjs",
   "start": 14608887,
   "end": 14617602
  }, {
   "filename": "/gre/modules/addons/AddonRepository.sys.mjs",
   "start": 14617602,
   "end": 14651671
  }, {
   "filename": "/gre/modules/addons/AddonSettings.sys.mjs",
   "start": 14651671,
   "end": 14656035
  }, {
   "filename": "/gre/modules/addons/AddonUpdateChecker.sys.mjs",
   "start": 14656035,
   "end": 14675456
  }, {
   "filename": "/gre/modules/addons/GMPProvider.sys.mjs",
   "start": 14675456,
   "end": 14700900
  }, {
   "filename": "/gre/modules/addons/ModelHubProvider.sys.mjs",
   "start": 14700900,
   "end": 14706569
  }, {
   "filename": "/gre/modules/addons/ProductAddonChecker.sys.mjs",
   "start": 14706569,
   "end": 14727447
  }, {
   "filename": "/gre/modules/addons/SitePermsAddonProvider.sys.mjs",
   "start": 14727447,
   "end": 14747666
  }, {
   "filename": "/gre/modules/addons/XPIDatabase.sys.mjs",
   "start": 14747666,
   "end": 14871044
  }, {
   "filename": "/gre/modules/addons/XPIExports.sys.mjs",
   "start": 14871044,
   "end": 14872461
  }, {
   "filename": "/gre/modules/addons/XPIInstall.sys.mjs",
   "start": 14872461,
   "end": 15032271
  }, {
   "filename": "/gre/modules/addons/XPIProvider.sys.mjs",
   "start": 15032271,
   "end": 15144330
  }, {
   "filename": "/gre/modules/addons/crypto-utils.sys.mjs",
   "start": 15144330,
   "end": 15146320
  }, {
   "filename": "/gre/modules/addons/siteperms-addon-utils.sys.mjs",
   "start": 15146320,
   "end": 15150459
  }, {
   "filename": "/gre/modules/amContentHandler.sys.mjs",
   "start": 15150459,
   "end": 15153732
  }, {
   "filename": "/gre/modules/amManager.sys.mjs",
   "start": 15153732,
   "end": 15164713
  }, {
   "filename": "/gre/modules/amWebAPI.sys.mjs",
   "start": 15164713,
   "end": 15172996
  }, {
   "filename": "/gre/modules/backgroundtasks/BackgroundTask_pingsender.sys.mjs",
   "start": 15172996,
   "end": 15174459
  }, {
   "filename": "/gre/modules/components-utils/ClientEnvironment.sys.mjs",
   "start": 15174459,
   "end": 15182969
  }, {
   "filename": "/gre/modules/components-utils/FilterExpressions.sys.mjs",
   "start": 15182969,
   "end": 15186984
  }, {
   "filename": "/gre/modules/components-utils/JsonSchemaValidator.sys.mjs",
   "start": 15186984,
   "end": 15206404
  }, {
   "filename": "/gre/modules/components-utils/Sampling.sys.mjs",
   "start": 15206404,
   "end": 15212866
  }, {
   "filename": "/gre/modules/components-utils/WindowsInstallsInfo.sys.mjs",
   "start": 15212866,
   "end": 15215846
  }, {
   "filename": "/gre/modules/components-utils/WindowsVersionInfo.sys.mjs",
   "start": 15215846,
   "end": 15219283
  }, {
   "filename": "/gre/modules/components-utils/mozjexl.sys.mjs",
   "start": 15219283,
   "end": 15232893
  }, {
   "filename": "/gre/modules/contentrelevancy/private/InputUtils.sys.mjs",
   "start": 15232893,
   "end": 15236465
  }, {
   "filename": "/gre/modules/crypto-SDR.sys.mjs",
   "start": 15236465,
   "end": 15245214
  }, {
   "filename": "/gre/modules/extensionProcessScriptLoader.js",
   "start": 15245214,
   "end": 15245524
  }, {
   "filename": "/gre/modules/handlers/HandlerList.sys.mjs",
   "start": 15245524,
   "end": 15250218
  }, {
   "filename": "/gre/modules/jsdebugger.sys.mjs",
   "start": 15250218,
   "end": 15253437
  }, {
   "filename": "/gre/modules/kvstore.sys.mjs",
   "start": 15253437,
   "end": 15261527
  }, {
   "filename": "/gre/modules/media/IdpSandbox.sys.mjs",
   "start": 15261527,
   "end": 15269799
  }, {
   "filename": "/gre/modules/media/PeerConnectionIdp.sys.mjs",
   "start": 15269799,
   "end": 15280912
  }, {
   "filename": "/gre/modules/megalist/MegalistViewModel.sys.mjs",
   "start": 15280912,
   "end": 15287495
  }, {
   "filename": "/gre/modules/megalist/aggregator/Aggregator.sys.mjs",
   "start": 15287495,
   "end": 15290776
  }, {
   "filename": "/gre/modules/megalist/aggregator/DefaultAggregator.sys.mjs",
   "start": 15290776,
   "end": 15291351
  }, {
   "filename": "/gre/modules/megalist/aggregator/datasources/DataSourceBase.sys.mjs",
   "start": 15291351,
   "end": 15301241
  }, {
   "filename": "/gre/modules/megalist/aggregator/datasources/LoginDataSource.sys.mjs",
   "start": 15301241,
   "end": 15329611
  }, {
   "filename": "/gre/modules/mozIntl.sys.mjs",
   "start": 15329611,
   "end": 15351572
  }, {
   "filename": "/gre/modules/narrate/NarrateControls.sys.mjs",
   "start": 15351572,
   "end": 15366506
  }, {
   "filename": "/gre/modules/narrate/Narrator.sys.mjs",
   "start": 15366506,
   "end": 15379146
  }, {
   "filename": "/gre/modules/narrate/VoiceSelect.sys.mjs",
   "start": 15379146,
   "end": 15386811
  }, {
   "filename": "/gre/modules/nsAsyncShutdown.sys.mjs",
   "start": 15386811,
   "end": 15393858
  }, {
   "filename": "/gre/modules/nsCrashMonitor.sys.mjs",
   "start": 15393858,
   "end": 15394546
  }, {
   "filename": "/gre/modules/pdfjs.sys.mjs",
   "start": 15394546,
   "end": 15395555
  }, {
   "filename": "/gre/modules/psm/ClientAuthDialogService.sys.mjs",
   "start": 15395555,
   "end": 15400420
  }, {
   "filename": "/gre/modules/psm/DER.sys.mjs",
   "start": 15400420,
   "end": 15410648
  }, {
   "filename": "/gre/modules/psm/QWACs.sys.mjs",
   "start": 15410648,
   "end": 15427811
  }, {
   "filename": "/gre/modules/psm/RemoteSecuritySettings.sys.mjs",
   "start": 15427811,
   "end": 15451364
  }, {
   "filename": "/gre/modules/psm/X509.sys.mjs",
   "start": 15451364,
   "end": 15469691
  }, {
   "filename": "/gre/modules/psm/pippki.sys.mjs",
   "start": 15469691,
   "end": 15478998
  }, {
   "filename": "/gre/modules/reflect.sys.mjs",
   "start": 15478998,
   "end": 15479733
  }, {
   "filename": "/gre/modules/services-automation/ServicesAutomation.sys.mjs",
   "start": 15479733,
   "end": 15490527
  }, {
   "filename": "/gre/modules/services-common/async.sys.mjs",
   "start": 15490527,
   "end": 15498767
  }, {
   "filename": "/gre/modules/services-common/hawkclient.sys.mjs",
   "start": 15498767,
   "end": 15510154
  }, {
   "filename": "/gre/modules/services-common/hawkrequest.sys.mjs",
   "start": 15510154,
   "end": 15515606
  }, {
   "filename": "/gre/modules/services-common/kinto-http-client.sys.mjs",
   "start": 15515606,
   "end": 15617440
  }, {
   "filename": "/gre/modules/services-common/kinto-offline-client.sys.mjs",
   "start": 15617440,
   "end": 15715299
  }, {
   "filename": "/gre/modules/services-common/kinto-storage-adapter.sys.mjs",
   "start": 15715299,
   "end": 15731418
  }, {
   "filename": "/gre/modules/services-common/observers.sys.mjs",
   "start": 15731418,
   "end": 15736460
  }, {
   "filename": "/gre/modules/services-common/rest.sys.mjs",
   "start": 15736460,
   "end": 15755827
  }, {
   "filename": "/gre/modules/services-common/tokenserverclient.sys.mjs",
   "start": 15755827,
   "end": 15768818
  }, {
   "filename": "/gre/modules/services-common/utils.sys.mjs",
   "start": 15768818,
   "end": 15787167
  }, {
   "filename": "/gre/modules/services-settings/Attachments.sys.mjs",
   "start": 15787167,
   "end": 15808692
  }, {
   "filename": "/gre/modules/services-settings/Database.sys.mjs",
   "start": 15808692,
   "end": 15829604
  }, {
   "filename": "/gre/modules/services-settings/IDBHelpers.sys.mjs",
   "start": 15829604,
   "end": 15836650
  }, {
   "filename": "/gre/modules/services-settings/RemoteSettings.worker.mjs",
   "start": 15836650,
   "end": 15842983
  }, {
   "filename": "/gre/modules/services-settings/RemoteSettingsClient.sys.mjs",
   "start": 15842983,
   "end": 15892884
  }, {
   "filename": "/gre/modules/services-settings/RemoteSettingsComponents.sys.mjs",
   "start": 15892884,
   "end": 15893718
  }, {
   "filename": "/gre/modules/services-settings/RemoteSettingsWorker.sys.mjs",
   "start": 15893718,
   "end": 15901026
  }, {
   "filename": "/gre/modules/services-settings/SharedUtils.sys.mjs",
   "start": 15901026,
   "end": 15902853
  }, {
   "filename": "/gre/modules/services-settings/SyncHistory.sys.mjs",
   "start": 15902853,
   "end": 15906702
  }, {
   "filename": "/gre/modules/services-settings/UptakeTelemetry.sys.mjs",
   "start": 15906702,
   "end": 15909100
  }, {
   "filename": "/gre/modules/services-settings/Utils.sys.mjs",
   "start": 15909100,
   "end": 15927749
  }, {
   "filename": "/gre/modules/services-settings/remote-settings.sys.mjs",
   "start": 15927749,
   "end": 15955667
  }, {
   "filename": "/gre/modules/services-sync/SyncDisconnect.sys.mjs",
   "start": 15955667,
   "end": 15964684
  }, {
   "filename": "/gre/modules/services-sync/SyncedTabs.sys.mjs",
   "start": 15964684,
   "end": 15981254
  }, {
   "filename": "/gre/modules/services-sync/TabsStore.sys.mjs",
   "start": 15981254,
   "end": 15982708
  }, {
   "filename": "/gre/modules/services-sync/UIState.sys.mjs",
   "start": 15982708,
   "end": 15991354
  }, {
   "filename": "/gre/modules/services-sync/Weave.sys.mjs",
   "start": 15991354,
   "end": 15997077
  }, {
   "filename": "/gre/modules/services-sync/addonsreconciler.sys.mjs",
   "start": 15997077,
   "end": 16014575
  }, {
   "filename": "/gre/modules/services-sync/addonutils.sys.mjs",
   "start": 16014575,
   "end": 16027667
  }, {
   "filename": "/gre/modules/services-sync/bridged_engine.sys.mjs",
   "start": 16027667,
   "end": 16039020
  }, {
   "filename": "/gre/modules/services-sync/collection_validator.sys.mjs",
   "start": 16039020,
   "end": 16047435
  }, {
   "filename": "/gre/modules/services-sync/constants.sys.mjs",
   "start": 16047435,
   "end": 16053213
  }, {
   "filename": "/gre/modules/services-sync/doctor.sys.mjs",
   "start": 16053213,
   "end": 16060246
  }, {
   "filename": "/gre/modules/services-sync/engines.sys.mjs",
   "start": 16060246,
   "end": 16131873
  }, {
   "filename": "/gre/modules/services-sync/engines/addons.sys.mjs",
   "start": 16131873,
   "end": 16157283
  }, {
   "filename": "/gre/modules/services-sync/engines/bookmarks.sys.mjs",
   "start": 16157283,
   "end": 16186656
  }, {
   "filename": "/gre/modules/services-sync/engines/clients.sys.mjs",
   "start": 16186656,
   "end": 16223719
  }, {
   "filename": "/gre/modules/services-sync/engines/extension-storage.sys.mjs",
   "start": 16223719,
   "end": 16232009
  }, {
   "filename": "/gre/modules/services-sync/engines/forms.sys.mjs",
   "start": 16232009,
   "end": 16239390
  }, {
   "filename": "/gre/modules/services-sync/engines/history.sys.mjs",
   "start": 16239390,
   "end": 16260388
  }, {
   "filename": "/gre/modules/services-sync/engines/passwords.sys.mjs",
   "start": 16260388,
   "end": 16275246
  }, {
   "filename": "/gre/modules/services-sync/engines/prefs.sys.mjs",
   "start": 16275246,
   "end": 16292656
  }, {
   "filename": "/gre/modules/services-sync/engines/tabs.sys.mjs",
   "start": 16292656,
   "end": 16317447
  }, {
   "filename": "/gre/modules/services-sync/keys.sys.mjs",
   "start": 16317447,
   "end": 16321645
  }, {
   "filename": "/gre/modules/services-sync/main.sys.mjs",
   "start": 16321645,
   "end": 16322480
  }, {
   "filename": "/gre/modules/services-sync/policies.sys.mjs",
   "start": 16322480,
   "end": 16357955
  }, {
   "filename": "/gre/modules/services-sync/record.sys.mjs",
   "start": 16357955,
   "end": 16398851
  }, {
   "filename": "/gre/modules/services-sync/resource.sys.mjs",
   "start": 16398851,
   "end": 16407110
  }, {
   "filename": "/gre/modules/services-sync/service.sys.mjs",
   "start": 16407110,
   "end": 16461475
  }, {
   "filename": "/gre/modules/services-sync/stages/declined.sys.mjs",
   "start": 16461475,
   "end": 16464086
  }, {
   "filename": "/gre/modules/services-sync/stages/enginesync.sys.mjs",
   "start": 16464086,
   "end": 16478103
  }, {
   "filename": "/gre/modules/services-sync/status.sys.mjs",
   "start": 16478103,
   "end": 16481326
  }, {
   "filename": "/gre/modules/services-sync/sync_auth.sys.mjs",
   "start": 16481326,
   "end": 16504911
  }, {
   "filename": "/gre/modules/services-sync/telemetry.sys.mjs",
   "start": 16504911,
   "end": 16542333
  }, {
   "filename": "/gre/modules/services-sync/util.sys.mjs",
   "start": 16542333,
   "end": 16563972
  }, {
   "filename": "/gre/modules/sessionstore/PrivacyFilter.sys.mjs",
   "start": 16563972,
   "end": 16567688
  }, {
   "filename": "/gre/modules/sessionstore/PrivacyLevel.sys.mjs",
   "start": 16567688,
   "end": 16569448
  }, {
   "filename": "/gre/modules/sessionstore/SessionHistory.sys.mjs",
   "start": 16569448,
   "end": 16590648
  }, {
   "filename": "/gre/modules/sessionstore/SessionStoreHelper.sys.mjs",
   "start": 16590648,
   "end": 16593974
  }, {
   "filename": "/gre/modules/shared/AddressComponent.sys.mjs",
   "start": 16593974,
   "end": 16624837
  }, {
   "filename": "/gre/modules/shared/AddressMetaData.sys.mjs",
   "start": 16624837,
   "end": 16732004
  }, {
   "filename": "/gre/modules/shared/AddressMetaDataExtension.sys.mjs",
   "start": 16732004,
   "end": 16743791
  }, {
   "filename": "/gre/modules/shared/AddressMetaDataLoader.sys.mjs",
   "start": 16743791,
   "end": 16749136
  }, {
   "filename": "/gre/modules/shared/AddressParser.sys.mjs",
   "start": 16749136,
   "end": 16758451
  }, {
   "filename": "/gre/modules/shared/AddressRecord.sys.mjs",
   "start": 16758451,
   "end": 16763174
  }, {
   "filename": "/gre/modules/shared/AutofillFormFactory.sys.mjs",
   "start": 16763174,
   "end": 16764458
  }, {
   "filename": "/gre/modules/shared/AutofillTelemetry.sys.mjs",
   "start": 16764458,
   "end": 16777697
  }, {
   "filename": "/gre/modules/shared/CreditCardRecord.sys.mjs",
   "start": 16777697,
   "end": 16781487
  }, {
   "filename": "/gre/modules/shared/CreditCardRuleset.sys.mjs",
   "start": 16781487,
   "end": 16823819
  }, {
   "filename": "/gre/modules/shared/FieldScanner.sys.mjs",
   "start": 16823819,
   "end": 16832776
  }, {
   "filename": "/gre/modules/shared/FormAutofillHandler.sys.mjs",
   "start": 16832776,
   "end": 16889808
  }, {
   "filename": "/gre/modules/shared/FormAutofillHeuristics.sys.mjs",
   "start": 16889808,
   "end": 16946677
  }, {
   "filename": "/gre/modules/shared/FormAutofillML.sys.mjs",
   "start": 16946677,
   "end": 16948175
  }, {
   "filename": "/gre/modules/shared/FormAutofillNameUtils.sys.mjs",
   "start": 16948175,
   "end": 16958976
  }, {
   "filename": "/gre/modules/shared/FormAutofillSection.sys.mjs",
   "start": 16958976,
   "end": 16980793
  }, {
   "filename": "/gre/modules/shared/FormAutofillUtils.sys.mjs",
   "start": 16980793,
   "end": 17029323
  }, {
   "filename": "/gre/modules/shared/FormStateManager.sys.mjs",
   "start": 17029323,
   "end": 17032644
  }, {
   "filename": "/gre/modules/shared/HeuristicsRegExp.sys.mjs",
   "start": 17032644,
   "end": 17058038
  }, {
   "filename": "/gre/modules/shared/LabelUtils.sys.mjs",
   "start": 17058038,
   "end": 17067934
  }, {
   "filename": "/gre/modules/shared/LoginFormFactory.sys.mjs",
   "start": 17067934,
   "end": 17073519
  }, {
   "filename": "/gre/modules/shared/NewPasswordModel.sys.mjs",
   "start": 17073519,
   "end": 17099898
  }, {
   "filename": "/gre/modules/shared/PasswordGenerator.sys.mjs",
   "start": 17099898,
   "end": 17107893
  }, {
   "filename": "/gre/modules/shared/PasswordRulesParser.sys.mjs",
   "start": 17107893,
   "end": 17126835
  }, {
   "filename": "/gre/modules/shared/PhoneNumber.sys.mjs",
   "start": 17126835,
   "end": 17143560
  }, {
   "filename": "/gre/modules/shared/PhoneNumberMetaData.sys.mjs",
   "start": 17143560,
   "end": 17211108
  }, {
   "filename": "/gre/modules/shared/PhoneNumberNormalizer.sys.mjs",
   "start": 17211108,
   "end": 17212825
  }, {
   "filename": "/gre/modules/storage-json.sys.mjs",
   "start": 17212825,
   "end": 17252246
  }, {
   "filename": "/gre/modules/storage-rust.sys.mjs",
   "start": 17252246,
   "end": 17277295
  }, {
   "filename": "/gre/modules/subprocess/subprocess_common.sys.mjs",
   "start": 17277295,
   "end": 17298192
  }, {
   "filename": "/gre/modules/subprocess/subprocess_shared.js",
   "start": 17298192,
   "end": 17301119
  }, {
   "filename": "/gre/modules/subprocess/subprocess_shared_unix.js",
   "start": 17301119,
   "end": 17303611
  }, {
   "filename": "/gre/modules/subprocess/subprocess_unix.sys.mjs",
   "start": 17303611,
   "end": 17308631
  }, {
   "filename": "/gre/modules/subprocess/subprocess_unix.worker.js",
   "start": 17308631,
   "end": 17326458
  }, {
   "filename": "/gre/modules/subprocess/subprocess_worker_common.js",
   "start": 17326458,
   "end": 17331414
  }, {
   "filename": "/gre/modules/third_party/fathom/fathom.mjs",
   "start": 17331414,
   "end": 17430012
  }, {
   "filename": "/gre/modules/third_party/jsesc/jsesc.mjs",
   "start": 17430012,
   "end": 17438657
  }, {
   "filename": "/gre/modules/txEXSLTRegExFunctions.sys.mjs",
   "start": 17438657,
   "end": 17439566
  }, {
   "filename": "/gre/modules/vtt.sys.mjs",
   "start": 17439566,
   "end": 17496524
  }, {
   "filename": "/gre/modules/workers/PromiseWorker.js",
   "start": 17496524,
   "end": 17505036
  }, {
   "filename": "/gre/modules/workers/PromiseWorker.mjs",
   "start": 17505036,
   "end": 17513187
  }, {
   "filename": "/gre/modules/workers/require.js",
   "start": 17513187,
   "end": 17518711
  }, {
   "filename": "/gre/moz-src/dom/geolocation/GeolocationUIUtils.sys.mjs",
   "start": 17518711,
   "end": 17519599
  }, {
   "filename": "/gre/moz-src/dom/notification/MemoryNotificationDB.sys.mjs",
   "start": 17519599,
   "end": 17520129
  }, {
   "filename": "/gre/moz-src/dom/notification/NotificationDB.sys.mjs",
   "start": 17520129,
   "end": 17530252
  }, {
   "filename": "/gre/moz-src/dom/notification/NotificationStorage.sys.mjs",
   "start": 17530252,
   "end": 17532591
  }, {
   "filename": "/gre/moz-src/dom/quota/QuotaUtilsService.sys.mjs",
   "start": 17532591,
   "end": 17533418
  }, {
   "filename": "/gre/moz-src/services/crypto/modules/WeaveCrypto.sys.mjs",
   "start": 17533418,
   "end": 17539775
  }, {
   "filename": "/gre/moz-src/services/crypto/modules/jwcrypto.sys.mjs",
   "start": 17539775,
   "end": 17547189
  }, {
   "filename": "/gre/moz-src/services/crypto/modules/utils.sys.mjs",
   "start": 17547189,
   "end": 17563600
  }, {
   "filename": "/gre/moz-src/third_party/js/qrcode/qrcode.mjs",
   "start": 17563600,
   "end": 17615521
  }, {
   "filename": "/gre/moz-src/toolkit/actors/ColorPickerChild.sys.mjs",
   "start": 17615521,
   "end": 17617134
  }, {
   "filename": "/gre/moz-src/toolkit/actors/ColorPickerParent.sys.mjs",
   "start": 17617134,
   "end": 17617928
  }, {
   "filename": "/gre/moz-src/toolkit/actors/DateTimePickerChild.sys.mjs",
   "start": 17617928,
   "end": 17620930
  }, {
   "filename": "/gre/moz-src/toolkit/actors/DateTimePickerParent.sys.mjs",
   "start": 17620930,
   "end": 17621739
  }, {
   "filename": "/gre/moz-src/toolkit/actors/InputPickerChildCommon.sys.mjs",
   "start": 17621739,
   "end": 17626941
  }, {
   "filename": "/gre/moz-src/toolkit/actors/InputPickerParentCommon.sys.mjs",
   "start": 17626941,
   "end": 17631413
  }, {
   "filename": "/gre/moz-src/toolkit/components/doh/DoHConfig.sys.mjs",
   "start": 17631413,
   "end": 17643865
  }, {
   "filename": "/gre/moz-src/toolkit/components/doh/DoHController.sys.mjs",
   "start": 17643865,
   "end": 17668600
  }, {
   "filename": "/gre/moz-src/toolkit/components/doh/DoHHeuristics.sys.mjs",
   "start": 17668600,
   "end": 17681219
  }, {
   "filename": "/gre/moz-src/toolkit/components/doh/TRRPerformance.sys.mjs",
   "start": 17681219,
   "end": 17692734
  }, {
   "filename": "/gre/moz-src/toolkit/components/ipprotection/GuardianTypes.sys.mjs",
   "start": 17692734,
   "end": 17702659
  }, {
   "filename": "/gre/moz-src/toolkit/components/ipprotection/IPPAuthProvider.sys.mjs",
   "start": 17702659,
   "end": 17705269
  }, {
   "filename": "/gre/moz-src/toolkit/components/ipprotection/IPPAutoRestore.sys.mjs",
   "start": 17705269,
   "end": 17709400
  }, {
   "filename": "/gre/moz-src/toolkit/components/ipprotection/IPPAutoStart.sys.mjs",
   "start": 17709400,
   "end": 17712895
  }, {
   "filename": "/gre/moz-src/toolkit/components/ipprotection/IPPChannelFilter.sys.mjs",
   "start": 17712895,
   "end": 17730686
  }, {
   "filename": "/gre/moz-src/toolkit/components/ipprotection/IPPEarlyStartupFilter.sys.mjs",
   "start": 17730686,
   "end": 17733225
  }, {
   "filename": "/gre/moz-src/toolkit/components/ipprotection/IPPExceptionsManager.sys.mjs",
   "start": 17733225,
   "end": 17738797
  }, {
   "filename": "/gre/moz-src/toolkit/components/ipprotection/IPPLifecycleHelper.sys.mjs",
   "start": 17738797,
   "end": 17741264
  }, {
   "filename": "/gre/moz-src/toolkit/components/ipprotection/IPPNetworkErrorObserver.sys.mjs",
   "start": 17741264,
   "end": 17744965
  }, {
   "filename": "/gre/moz-src/toolkit/components/ipprotection/IPPNetworkUtils.sys.mjs",
   "start": 17744965,
   "end": 17746703
  }, {
   "filename": "/gre/moz-src/toolkit/components/ipprotection/IPPNimbusHelper.sys.mjs",
   "start": 17746703,
   "end": 17748136
  }, {
   "filename": "/gre/moz-src/toolkit/components/ipprotection/IPPProxyManager.sys.mjs",
   "start": 17748136,
   "end": 17773307
  }, {
   "filename": "/gre/moz-src/toolkit/components/ipprotection/IPPSessionPrefManager.sys.mjs",
   "start": 17773307,
   "end": 17776321
  }, {
   "filename": "/gre/moz-src/toolkit/components/ipprotection/IPPStartupCache.sys.mjs",
   "start": 17776321,
   "end": 17783499
  }, {
   "filename": "/gre/moz-src/toolkit/components/ipprotection/IPProtectionActivator.sys.mjs",
   "start": 17783499,
   "end": 17785798
  }, {
   "filename": "/gre/moz-src/toolkit/components/ipprotection/IPProtectionServerlist.sys.mjs",
   "start": 17785798,
   "end": 17797104
  }, {
   "filename": "/gre/moz-src/toolkit/components/ipprotection/IPProtectionService.sys.mjs",
   "start": 17797104,
   "end": 17802892
  }, {
   "filename": "/gre/moz-src/toolkit/components/ipprotection/fxa/GuardianClient.sys.mjs",
   "start": 17802892,
   "end": 17816477
  }, {
   "filename": "/gre/moz-src/toolkit/components/ipprotection/fxa/IPPFxaActivateAuthProvider.sys.mjs",
   "start": 17816477,
   "end": 17819048
  }, {
   "filename": "/gre/moz-src/toolkit/components/ipprotection/fxa/IPPFxaAuthProvider.sys.mjs",
   "start": 17819048,
   "end": 17828341
  }, {
   "filename": "/gre/moz-src/toolkit/components/ipprotection/fxa/IPPFxaBaseAuthProvider.sys.mjs",
   "start": 17828341,
   "end": 17833140
  }, {
   "filename": "/gre/moz-src/toolkit/components/ipprotection/fxa/IPPSignInWatcher.sys.mjs",
   "start": 17833140,
   "end": 17835125
  }, {
   "filename": "/gre/moz-src/toolkit/components/pageextractor/DOMExtractor.sys.mjs",
   "start": 17835125,
   "end": 17872459
  }, {
   "filename": "/gre/moz-src/toolkit/components/qrcode/encoder.mjs",
   "start": 17872459,
   "end": 17877180
  }, {
   "filename": "/gre/moz-src/toolkit/components/reader/AboutReader.sys.mjs",
   "start": 17877180,
   "end": 17930543
  }, {
   "filename": "/gre/moz-src/toolkit/components/reader/Reader.worker.js",
   "start": 17930543,
   "end": 17932372
  }, {
   "filename": "/gre/moz-src/toolkit/components/reader/ReaderMode.sys.mjs",
   "start": 17932372,
   "end": 17949104
  }, {
   "filename": "/gre/moz-src/toolkit/components/reader/ReaderWorker.sys.mjs",
   "start": 17949104,
   "end": 17949577
  }, {
   "filename": "/gre/moz-src/toolkit/components/reader/readability/JSDOMParser.js",
   "start": 17949577,
   "end": 17986717
  }, {
   "filename": "/gre/moz-src/toolkit/components/reader/readability/Readability.js",
   "start": 17986717,
   "end": 18076697
  }, {
   "filename": "/gre/moz-src/toolkit/components/search/AddonSearchEngine.sys.mjs",
   "start": 18076697,
   "end": 18085969
  }, {
   "filename": "/gre/moz-src/toolkit/components/search/ConfigSearchEngine.sys.mjs",
   "start": 18085969,
   "end": 18113157
  }, {
   "filename": "/gre/moz-src/toolkit/components/search/OpenSearchEngine.sys.mjs",
   "start": 18113157,
   "end": 18122239
  }, {
   "filename": "/gre/moz-src/toolkit/components/search/OpenSearchLoader.sys.mjs",
   "start": 18122239,
   "end": 18128807
  }, {
   "filename": "/gre/moz-src/toolkit/components/search/OpenSearchLoaderChild.sys.mjs",
   "start": 18128807,
   "end": 18129479
  }, {
   "filename": "/gre/moz-src/toolkit/components/search/OpenSearchParser.sys.mjs",
   "start": 18129479,
   "end": 18137775
  }, {
   "filename": "/gre/moz-src/toolkit/components/search/PolicySearchEngine.sys.mjs",
   "start": 18137775,
   "end": 18140981
  }, {
   "filename": "/gre/moz-src/toolkit/components/search/SearchEngine.sys.mjs",
   "start": 18140981,
   "end": 18191977
  }, {
   "filename": "/gre/moz-src/toolkit/components/search/SearchEngineSelector.sys.mjs",
   "start": 18191977,
   "end": 18206109
  }, {
   "filename": "/gre/moz-src/toolkit/components/search/SearchService.sys.mjs",
   "start": 18206109,
   "end": 18342224
  }, {
   "filename": "/gre/moz-src/toolkit/components/search/SearchSettings.sys.mjs",
   "start": 18342224,
   "end": 18372933
  }, {
   "filename": "/gre/moz-src/toolkit/components/search/SearchShortcuts.sys.mjs",
   "start": 18372933,
   "end": 18375642
  }, {
   "filename": "/gre/moz-src/toolkit/components/search/SearchStaticData.sys.mjs",
   "start": 18375642,
   "end": 18379538
  }, {
   "filename": "/gre/moz-src/toolkit/components/search/SearchSuggestionController.sys.mjs",
   "start": 18379538,
   "end": 18403996
  }, {
   "filename": "/gre/moz-src/toolkit/components/search/SearchUtils.sys.mjs",
   "start": 18403996,
   "end": 18424827
  }, {
   "filename": "/gre/moz-src/toolkit/components/search/UserSearchEngine.sys.mjs",
   "start": 18424827,
   "end": 18431507
  }, {
   "filename": "/gre/moz-src/toolkit/components/uniffi-bindgen-gecko-js/components/generated/RustBreachAlerts.sys.mjs",
   "start": 18431507,
   "end": 18446737
  }, {
   "filename": "/gre/moz-src/toolkit/components/uniffi-bindgen-gecko-js/components/generated/RustContextId.sys.mjs",
   "start": 18446737,
   "end": 18456558
  }, {
   "filename": "/gre/moz-src/toolkit/components/uniffi-bindgen-gecko-js/components/generated/RustFilterAdult.sys.mjs",
   "start": 18456558,
   "end": 18462145
  }, {
   "filename": "/gre/moz-src/toolkit/components/uniffi-bindgen-gecko-js/components/generated/RustInitRustComponents.sys.mjs",
   "start": 18462145,
   "end": 18463771
  }, {
   "filename": "/gre/moz-src/toolkit/components/uniffi-bindgen-gecko-js/components/generated/RustLogins.sys.mjs",
   "start": 18463771,
   "end": 18587748
  }, {
   "filename": "/gre/moz-src/toolkit/components/uniffi-bindgen-gecko-js/components/generated/RustRelevancy.sys.mjs",
   "start": 18587748,
   "end": 18642767
  }, {
   "filename": "/gre/moz-src/toolkit/components/uniffi-bindgen-gecko-js/components/generated/RustRemoteSettings.sys.mjs",
   "start": 18642767,
   "end": 18722128
  }, {
   "filename": "/gre/moz-src/toolkit/components/uniffi-bindgen-gecko-js/components/generated/RustSearch.sys.mjs",
   "start": 18722128,
   "end": 18823459
  }, {
   "filename": "/gre/moz-src/toolkit/components/uniffi-bindgen-gecko-js/components/generated/RustSuggest.sys.mjs",
   "start": 18823459,
   "end": 18985502
  }, {
   "filename": "/gre/moz-src/toolkit/components/uniffi-bindgen-gecko-js/components/generated/RustSync15.sys.mjs",
   "start": 18985502,
   "end": 18990256
  }, {
   "filename": "/gre/moz-src/toolkit/components/uniffi-bindgen-gecko-js/components/generated/RustTabs.sys.mjs",
   "start": 18990256,
   "end": 19070321
  }, {
   "filename": "/gre/moz-src/toolkit/components/uniffi-bindgen-gecko-js/components/generated/RustTracing.sys.mjs",
   "start": 19070321,
   "end": 19089811
  }, {
   "filename": "/gre/moz-src/toolkit/components/uniffi-bindgen-gecko-js/components/generated/RustWebextstorage.sys.mjs",
   "start": 19089811,
   "end": 19134734
  }, {
   "filename": "/gre/moz-src/toolkit/components/uniffi-js/js/UniFFI.sys.mjs",
   "start": 19134734,
   "end": 19159436
  }, {
   "filename": "/gre/moz-src/toolkit/modules/ColorPickerPanel.sys.mjs",
   "start": 19159436,
   "end": 19161265
  }, {
   "filename": "/gre/moz-src/toolkit/modules/DateTimePickerPanel.sys.mjs",
   "start": 19161265,
   "end": 19166361
  }, {
   "filename": "/gre/moz-src/toolkit/modules/FaviconUtils.sys.mjs",
   "start": 19166361,
   "end": 19168613
  }, {
   "filename": "/gre/moz-src/toolkit/modules/InputPickerPanelCommon.sys.mjs",
   "start": 19168613,
   "end": 19172957
  }, {
   "filename": "/gre/moz-src/toolkit/modules/PrefUtils.sys.mjs",
   "start": 19172957,
   "end": 19176908
  }, {
   "filename": "/gre/moz-src/toolkit/modules/WebAuthnPromptHelper.sys.mjs",
   "start": 19176908,
   "end": 19189449
  }, {
   "filename": "/gre/moz-src/toolkit/profile/ProfilesDatastoreService.sys.mjs",
   "start": 19189449,
   "end": 19206668
  }, {
   "filename": "/gre/pingsender.worker.js",
   "start": 19206668,
   "end": 19213051
  }, {
   "filename": "/gre/platform.ini",
   "start": 19213051,
   "end": 19213100
  }, {
   "filename": "/gre/res/EditorOverride.css",
   "start": 19213100,
   "end": 19213357
  }, {
   "filename": "/gre/res/contenteditable.css",
   "start": 19213357,
   "end": 19213615
  }, {
   "filename": "/gre/res/designmode.css",
   "start": 19213615,
   "end": 19213868
  }, {
   "filename": "/gre/res/dtd/htmlmathml-f.ent",
   "start": 19213868,
   "end": 19373050
  }, {
   "filename": "/gre/res/fonts/mathfont.properties",
   "start": 19373050,
   "end": 19481964
  }, {
   "filename": "/gre/res/grabber.gif",
   "start": 19481964,
   "end": 19482822
  }, {
   "filename": "/gre/res/language.properties",
   "start": 19482822,
   "end": 19489054
  }, {
   "filename": "/gre/res/locale/dom/dom.properties",
   "start": 19489054,
   "end": 19544897
  }, {
   "filename": "/gre/res/locale/layout/HtmlForm.properties",
   "start": 19544897,
   "end": 19547011
  }, {
   "filename": "/gre/res/locale/layout/MediaDocument.properties",
   "start": 19547011,
   "end": 19548309
  }, {
   "filename": "/gre/res/locale/layout/xmlparser.properties",
   "start": 19548309,
   "end": 19550151
  }, {
   "filename": "/gre/res/locale/necko/necko.properties",
   "start": 19550151,
   "end": 19561421
  }, {
   "filename": "/gre/res/multilocale.txt",
   "start": 19561421,
   "end": 19561427
  }, {
   "filename": "/gre/res/svg.css",
   "start": 19561427,
   "end": 19563440
  }, {
   "filename": "/gre/res/table-add-column-after-active.gif",
   "start": 19563440,
   "end": 19563498
  }, {
   "filename": "/gre/res/table-add-column-after-hover.gif",
   "start": 19563498,
   "end": 19564324
  }, {
   "filename": "/gre/res/table-add-column-after.gif",
   "start": 19564324,
   "end": 19565150
  }, {
   "filename": "/gre/res/table-add-column-before-active.gif",
   "start": 19565150,
   "end": 19565207
  }, {
   "filename": "/gre/res/table-add-column-before-hover.gif",
   "start": 19565207,
   "end": 19566032
  }, {
   "filename": "/gre/res/table-add-column-before.gif",
   "start": 19566032,
   "end": 19566857
  }, {
   "filename": "/gre/res/table-add-row-after-active.gif",
   "start": 19566857,
   "end": 19566914
  }, {
   "filename": "/gre/res/table-add-row-after-hover.gif",
   "start": 19566914,
   "end": 19567740
  }, {
   "filename": "/gre/res/table-add-row-after.gif",
   "start": 19567740,
   "end": 19568566
  }, {
   "filename": "/gre/res/table-add-row-before-active.gif",
   "start": 19568566,
   "end": 19568623
  }, {
   "filename": "/gre/res/table-add-row-before-hover.gif",
   "start": 19568623,
   "end": 19569448
  }, {
   "filename": "/gre/res/table-add-row-before.gif",
   "start": 19569448,
   "end": 19570273
  }, {
   "filename": "/gre/res/table-remove-column-active.gif",
   "start": 19570273,
   "end": 19571108
  }, {
   "filename": "/gre/res/table-remove-column-hover.gif",
   "start": 19571108,
   "end": 19571949
  }, {
   "filename": "/gre/res/table-remove-column.gif",
   "start": 19571949,
   "end": 19572790
  }, {
   "filename": "/gre/res/table-remove-row-active.gif",
   "start": 19572790,
   "end": 19573625
  }, {
   "filename": "/gre/res/table-remove-row-hover.gif",
   "start": 19573625,
   "end": 19574466
  }, {
   "filename": "/gre/res/table-remove-row.gif",
   "start": 19574466,
   "end": 19575307
  } ],
  "remote_package_size": 19575307
 });
})();

if (Module["ENVIRONMENT_IS_PTHREAD"] || Module["$ww"]) Module["preRun"] = [];

var necessaryPreJSTasks = Module["preRun"].slice();

(function() {
 var T_CONNECT = 1, T_DATA = 2, T_CONTINUE = 3, T_CLOSE = 4, ST_TCP = 1;
 function wakePoll() {
  try {
   var m = WISP._module;
   if (!m || !m._wisp_wakeword) return;
   var idx = m._wisp_wakeword() >> 2;
   Atomics.add(m.HEAP32, idx, 1);
   Atomics.notify(m.HEAP32, idx);
  } catch (e) {}
 }
 function toU8(d) {
  if (d instanceof Uint8Array) return d;
  if (d instanceof ArrayBuffer) return new Uint8Array(d);
  if (ArrayBuffer.isView(d)) return new Uint8Array(d.buffer, d.byteOffset, d.byteLength);
  return new Uint8Array(d);
 }
 function WispStream(conn, id) {
  this.conn = conn;
  this.id = id;
  this.chunks = [];
  this.eof = false;
  this.onreadable = null;
  this.onclose = null;
 }
 WispStream.prototype._push = function(u8) {
  if (u8 && u8.length) this.chunks.push(u8);
  if (this.onreadable) this.onreadable();
  wakePoll();
 };
 WispStream.prototype._eof = function(r) {
  this.eof = true;
  if (this.onreadable) this.onreadable();
  if (this.onclose) this.onclose(r);
  wakePoll();
 };
 WispStream.prototype.read = function() {
  if (!this.chunks.length) return null;
  return this.chunks.shift();
 };
 WispStream.prototype.write = function(u8) {
  this.conn._sendFrame(this.id, T_DATA, toU8(u8));
 };
 WispStream.prototype.close = function(reason) {
  if (this.conn.streams.has(this.id)) {
   this.conn._sendClose(this.id, reason | 0);
   this.conn.streams.delete(this.id);
  }
 };
 function WispConnection(ws) {
  var self = this;
  this.ws = ws;
  this.streams = new Map;
  this.nextId = 1;
  this.ready = false;
  this.sendQueue = [];
  this.readyPromise = new Promise(function(res) {
   self._readyResolve = res;
  });
  try {
   ws.binaryType = "arraybuffer";
  } catch (e) {}
  ws.addEventListener("open", function() {
   self.ready = true;
   for (var i = 0; i < self.sendQueue.length; i++) ws.send(self.sendQueue[i]);
   self.sendQueue = [];
   if (self._readyResolve) self._readyResolve();
  });
  ws.addEventListener("message", function(e) {
   self._onMessage(e.data);
  });
  ws.addEventListener("close", function() {
   self.streams.forEach(function(s) {
    s._eof(255);
   });
   self.streams.clear();
  });
  ws.addEventListener("error", function() {});
  if (ws.readyState === 1) {
   ws.dispatchEvent ? ws.dispatchEvent(new Event("open")) : null;
  }
 }
 WispConnection.prototype._rawSend = function(buf) {
  if (this.ready) this.ws.send(buf); else this.sendQueue.push(buf);
 };
 WispConnection.prototype._sendFrame = function(id, type, payload) {
  var len = 5 + (payload ? payload.length : 0);
  var u8 = new Uint8Array(len), dv = new DataView(u8.buffer);
  dv.setUint8(0, type);
  dv.setUint32(1, id, true);
  if (payload && payload.length) u8.set(payload, 5);
  this._rawSend(u8);
 };
 WispConnection.prototype._sendClose = function(id, reason) {
  var u8 = new Uint8Array(6), dv = new DataView(u8.buffer);
  dv.setUint8(0, T_CLOSE);
  dv.setUint32(1, id, true);
  dv.setUint8(5, reason & 255);
  this._rawSend(u8);
 };
 WispConnection.prototype._onMessage = function(data) {
  var u8 = toU8(data);
  if (u8.length < 5) return;
  var dv = new DataView(u8.buffer, u8.byteOffset, u8.byteLength);
  var type = dv.getUint8(0), id = dv.getUint32(1, true), payload = u8.subarray(5);
  var s = this.streams.get(id);
  if (type === T_DATA) {
   if (s) s._push(payload.slice());
  } else if (type === T_CLOSE) {
   if (s) {
    s._eof(payload.length ? payload[0] : 0);
    this.streams.delete(id);
   }
  }
 };
 WispConnection.prototype.connect = function(host, port, streamType) {
  var id = this.nextId++, s = new WispStream(this, id);
  console.log("[wisp] CONNECT stream=" + id + " " + host + ":" + port);
  this.streams.set(id, s);
  var hostBytes = (new TextEncoder).encode(host);
  var payload = new Uint8Array(3 + hostBytes.length), dv = new DataView(payload.buffer);
  dv.setUint8(0, streamType || ST_TCP);
  dv.setUint16(1, port, true);
  payload.set(hostBytes, 3);
  this._sendFrame(id, T_CONNECT, payload);
  return s;
 };
 function WispSocketShim(url) {
  var self = this;
  this.url = url;
  this.binaryType = "arraybuffer";
  this.CONNECTING = 0;
  this.OPEN = 1;
  this.CLOSING = 2;
  this.CLOSED = 3;
  this.readyState = 0;
  this.onopen = this.onmessage = this.onclose = this.onerror = null;
  this.stream = null;
  var m = /^wss?:\\/\\/(\\[[^\\]]+\\]|[^:\\/]+):(\\d+)/.exec(url);
  if (!m) {
   console.warn("[wisp] unparseable socket url: " + url);
   this.readyState = 3;
   return;
  }
  var rawHost = m[1].replace(/^\\[|\\]$/g, "");
  var host = WISP._resolveHost(rawHost);
  var port = parseInt(m[2], 10);
  console.log("[wisp] socket " + url + " -> " + host + ":" + port + (host !== rawHost ? " (dns " + rawHost + ")" : ""));
  var conn = WISP.conn;
  self._hostport = host + ":" + port;
  self._rx = 0;
  self._tx = 0;
  WISP._shims.push(self);
  function open() {
   self.readyState = 1;
   self.stream = conn.connect(host, port);
   self.stream.onreadable = function() {
    self._drain();
   };
   self.stream.onclose = function(r) {
    console.log("[wisp] STREAM_CLOSE id=" + self.stream.id + " " + self._hostport + " rx=" + self._rx + " tx=" + self._tx + " reason=" + r);
    if (self.readyState !== 3) {
     self.readyState = 3;
     if (self.onclose) self.onclose({});
    }
   };
   if (self.onopen) self.onopen({});
   self._drain();
   wakePoll();
  }
  if (conn.ready) setTimeout(open, 0); else conn.readyPromise.then(function() {
   setTimeout(open, 0);
  });
 }
 WispSocketShim.prototype._drain = function() {
  if (!this.stream) return;
  var c;
  while ((c = this.stream.read()) !== null) {
   var ab = c.buffer.slice(c.byteOffset, c.byteOffset + c.byteLength);
   this._rx += ab.byteLength;
   if (this.onmessage) this.onmessage({
    data: ab
   });
  }
  if (this.stream.eof && this.readyState !== 3) {
   this.readyState = 3;
   if (this.onclose) this.onclose({});
  }
 };
 WispSocketShim.prototype.send = function(data) {
  if (this.stream) {
   var u = toU8(data);
   this._tx += u.length;
   this.stream.write(u);
  }
 };
 WispSocketShim.prototype.close = function() {
  this.readyState = 2;
  if (this.stream) this.stream.close(0);
  this.readyState = 3;
 };
 var WISP = {
  conn: null,
  _shims: [],
  stats: function() {
   return WISP._shims.map(function(s) {
    return {
     host: s._hostport,
     rx: s._rx,
     tx: s._tx,
     open: s.readyState !== 3
    };
   });
  },
  RealWebSocket: (typeof WebSocket !== "undefined") ? WebSocket : null,
  _resolveHost: function(ip) {
   try {
    if (typeof DNS !== "undefined" && DNS.lookup_addr) {
     var name = DNS.lookup_addr(ip);
     if (name) return name;
    }
   } catch (e) {}
   return ip;
  },
  _module: null,
  install: function(Module, wispUrl) {
   if (WISP.conn) return;
   WISP._module = Module;
   var RealWS = WISP.RealWebSocket || WebSocket;
   var ws = new RealWS(wispUrl);
   WISP.conn = new WispConnection(ws);
   try {
    globalThis.WebSocket = WispSocketShim;
   } catch (e) {
    WebSocket = WispSocketShim;
   }
   Module.__wispReady = WISP.conn.readyPromise;
  }
 };
 (typeof globalThis !== "undefined" ? globalThis : this).WISP = WISP;
})();

if (!Module["preRun"]) throw "Module.preRun should exist because file support used it; did a pre-js delete it?";

necessaryPreJSTasks.forEach(function(task) {
 if (Module["preRun"].indexOf(task) < 0) throw "All preRun tasks that exist before user pre-js code should remain after; did you replace Module or modify Module.preRun?";
});

var moduleOverrides = Object.assign({}, Module);

var arguments_ = [];

var thisProgram = "./this.program";

var quit_ = (status, toThrow) => {
 throw toThrow;
};

var ENVIRONMENT_IS_WEB = typeof window == "object";

var ENVIRONMENT_IS_WORKER = typeof importScripts == "function";

var ENVIRONMENT_IS_NODE = typeof process == "object" && typeof process.versions == "object" && typeof process.versions.node == "string";

var ENVIRONMENT_IS_SHELL = !ENVIRONMENT_IS_WEB && !ENVIRONMENT_IS_NODE && !ENVIRONMENT_IS_WORKER;

if (Module["ENVIRONMENT"]) {
 throw new Error("Module.ENVIRONMENT has been deprecated. To force the environment, use the ENVIRONMENT compile-time option (for example, -sENVIRONMENT=web or -sENVIRONMENT=node)");
}

var ENVIRONMENT_IS_PTHREAD = Module["ENVIRONMENT_IS_PTHREAD"] || false;

var scriptDirectory = "";

function locateFile(path) {
 if (Module["locateFile"]) {
  return Module["locateFile"](path, scriptDirectory);
 }
 return scriptDirectory + path;
}

var read_, readAsync, readBinary;

if (ENVIRONMENT_IS_SHELL) {
 if ((typeof process == "object" && typeof require === "function") || typeof window == "object" || typeof importScripts == "function") throw new Error("not compiled for this environment (did you build to HTML and try to run it not on the web, or set ENVIRONMENT to something - like node - and run it someplace else - like on the web?)");
 if (typeof read != "undefined") {
  read_ = read;
 }
 readBinary = f => {
  if (typeof readbuffer == "function") {
   return new Uint8Array(readbuffer(f));
  }
  let data = read(f, "binary");
  assert(typeof data == "object");
  return data;
 };
 readAsync = (f, onload, onerror) => {
  setTimeout(() => onload(readBinary(f)));
 };
 if (typeof clearTimeout == "undefined") {
  globalThis.clearTimeout = id => {};
 }
 if (typeof setTimeout == "undefined") {
  globalThis.setTimeout = f => (typeof f == "function") ? f() : abort();
 }
 if (typeof scriptArgs != "undefined") {
  arguments_ = scriptArgs;
 } else if (typeof arguments != "undefined") {
  arguments_ = arguments;
 }
 if (typeof quit == "function") {
  quit_ = (status, toThrow) => {
   setTimeout(() => {
    if (!(toThrow instanceof ExitStatus)) {
     let toLog = toThrow;
     if (toThrow && typeof toThrow == "object" && toThrow.stack) {
      toLog = [ toThrow, toThrow.stack ];
     }
     err(\`exiting due to exception: \${toLog}\`);
    }
    quit(status);
   });
   throw toThrow;
  };
 }
 if (typeof print != "undefined") {
  if (typeof console == "undefined") console = /** @type{!Console} */ ({});
  console.log = /** @type{!function(this:Console, ...*): undefined} */ (print);
  console.warn = console.error = /** @type{!function(this:Console, ...*): undefined} */ (typeof printErr != "undefined" ? printErr : print);
 }
} else if (ENVIRONMENT_IS_WEB || ENVIRONMENT_IS_WORKER) {
 if (ENVIRONMENT_IS_WORKER) {
  scriptDirectory = self.location.href;
 } else if (typeof document != "undefined" && document.currentScript) {
  scriptDirectory = document.currentScript.src;
 }
 if (_scriptDir) {
  scriptDirectory = _scriptDir;
 }
 if (scriptDirectory.startsWith("blob:")) {
  scriptDirectory = "";
 } else {
  scriptDirectory = scriptDirectory.substr(0, scriptDirectory.replace(/[?#].*/, "").lastIndexOf("/") + 1);
 }
 if (!(typeof window == "object" || typeof importScripts == "function")) throw new Error("not compiled for this environment (did you build to HTML and try to run it not on the web, or set ENVIRONMENT to something - like node - and run it someplace else - like on the web?)");
 {
  read_ = url => {
   var xhr = new XMLHttpRequest;
   xhr.open("GET", url, false);
   xhr.send(null);
   return xhr.responseText;
  };
  if (ENVIRONMENT_IS_WORKER) {
   readBinary = url => {
    var xhr = new XMLHttpRequest;
    xhr.open("GET", url, false);
    xhr.responseType = "arraybuffer";
    xhr.send(null);
    return new Uint8Array(/** @type{!ArrayBuffer} */ (xhr.response));
   };
  }
  readAsync = (url, onload, onerror) => {
   var xhr = new XMLHttpRequest;
   xhr.open("GET", url, true);
   xhr.responseType = "arraybuffer";
   xhr.onload = () => {
    if (xhr.status == 200 || (xhr.status == 0 && xhr.response)) {
     onload(xhr.response);
     return;
    }
    onerror();
   };
   xhr.onerror = onerror;
   xhr.send(null);
  };
 }
} else {
 throw new Error("environment detection error");
}

var out = Module["print"] || console.log.bind(console);

var err = Module["printErr"] || console.error.bind(console);

Object.assign(Module, moduleOverrides);

moduleOverrides = null;

checkIncomingModuleAPI();

if (Module["arguments"]) arguments_ = Module["arguments"];

legacyModuleProp("arguments", "arguments_");

if (Module["thisProgram"]) thisProgram = Module["thisProgram"];

legacyModuleProp("thisProgram", "thisProgram");

if (Module["quit"]) quit_ = Module["quit"];

legacyModuleProp("quit", "quit_");

assert(typeof Module["memoryInitializerPrefixURL"] == "undefined", "Module.memoryInitializerPrefixURL option was removed, use Module.locateFile instead");

assert(typeof Module["pthreadMainPrefixURL"] == "undefined", "Module.pthreadMainPrefixURL option was removed, use Module.locateFile instead");

assert(typeof Module["cdInitializerPrefixURL"] == "undefined", "Module.cdInitializerPrefixURL option was removed, use Module.locateFile instead");

assert(typeof Module["filePackagePrefixURL"] == "undefined", "Module.filePackagePrefixURL option was removed, use Module.locateFile instead");

assert(typeof Module["read"] == "undefined", "Module.read option was removed (modify read_ in JS)");

assert(typeof Module["readAsync"] == "undefined", "Module.readAsync option was removed (modify readAsync in JS)");

assert(typeof Module["readBinary"] == "undefined", "Module.readBinary option was removed (modify readBinary in JS)");

assert(typeof Module["setWindowTitle"] == "undefined", "Module.setWindowTitle option was removed (modify emscripten_set_window_title in JS)");

assert(typeof Module["TOTAL_MEMORY"] == "undefined", "Module.TOTAL_MEMORY has been renamed Module.INITIAL_MEMORY");

legacyModuleProp("asm", "wasmExports");

legacyModuleProp("read", "read_");

legacyModuleProp("readAsync", "readAsync");

legacyModuleProp("readBinary", "readBinary");

legacyModuleProp("setWindowTitle", "setWindowTitle");

var PROXYFS = "PROXYFS is no longer included by default; build with -lproxyfs.js";

var WORKERFS = "WORKERFS is no longer included by default; build with -lworkerfs.js";

var FETCHFS = "FETCHFS is no longer included by default; build with -lfetchfs.js";

var ICASEFS = "ICASEFS is no longer included by default; build with -licasefs.js";

var JSFILEFS = "JSFILEFS is no longer included by default; build with -ljsfilefs.js";

var OPFS = "OPFS is no longer included by default; build with -lopfs.js";

var NODEFS = "NODEFS is no longer included by default; build with -lnodefs.js";

assert(ENVIRONMENT_IS_WEB || ENVIRONMENT_IS_WORKER || ENVIRONMENT_IS_NODE, "Pthreads do not work in this environment yet (need Web Workers, or an alternative to them)");

assert(!ENVIRONMENT_IS_NODE, "node environment detected but not enabled at build time.  Add \`node\` to \`-sENVIRONMENT\` to enable.");

assert(!ENVIRONMENT_IS_SHELL, "shell environment detected but not enabled at build time.  Add \`shell\` to \`-sENVIRONMENT\` to enable.");

var wasmBinary;

if (Module["wasmBinary"]) wasmBinary = Module["wasmBinary"];

legacyModuleProp("wasmBinary", "wasmBinary");

if (typeof WebAssembly != "object") {
 err("no native wasm support detected");
}

function intArrayFromBase64(s) {
 var decoded = atob(s);
 var bytes = new Uint8Array(decoded.length);
 for (var i = 0; i < decoded.length; ++i) {
  bytes[i] = decoded.charCodeAt(i);
 }
 return bytes;
}

function tryParseAsDataURI(filename) {
 if (!isDataURI(filename)) {
  return;
 }
 return intArrayFromBase64(filename.slice(dataURIPrefix.length));
}

var wasmMemory;

var wasmModule;

var ABORT = false;

var EXITSTATUS;

/** @type {function(*, string=)} */ function assert(condition, text) {
 if (!condition) {
  abort("Assertion failed" + (text ? ": " + text : ""));
 }
}

var HEAP, /** @type {!Int8Array} */ HEAP8, /** @type {!Uint8Array} */ HEAPU8, /** @type {!Int16Array} */ HEAP16, /** @type {!Uint16Array} */ HEAPU16, /** @type {!Int32Array} */ HEAP32, /** @type {!Uint32Array} */ HEAPU32, /** @type {!Float32Array} */ HEAPF32, /* BigInt64Array type is not correctly defined in closure
/** not-@type {!BigInt64Array} */ HEAP64, /* BigUInt64Array type is not correctly defined in closure
/** not-t@type {!BigUint64Array} */ HEAPU64, /** @type {!Float64Array} */ HEAPF64;

function updateMemoryViews() {
 var b = wasmMemory.buffer;
 Module["HEAP8"] = HEAP8 = new Int8Array(b);
 Module["HEAP16"] = HEAP16 = new Int16Array(b);
 Module["HEAPU8"] = HEAPU8 = new Uint8Array(b);
 Module["HEAPU16"] = HEAPU16 = new Uint16Array(b);
 Module["HEAP32"] = HEAP32 = new Int32Array(b);
 Module["HEAPU32"] = HEAPU32 = new Uint32Array(b);
 Module["HEAPF32"] = HEAPF32 = new Float32Array(b);
 Module["HEAPF64"] = HEAPF64 = new Float64Array(b);
 Module["HEAP64"] = HEAP64 = new BigInt64Array(b);
 Module["HEAPU64"] = HEAPU64 = new BigUint64Array(b);
}

assert(!Module["STACK_SIZE"], "STACK_SIZE can no longer be set at runtime.  Use -sSTACK_SIZE at link time");

assert(typeof Int32Array != "undefined" && typeof Float64Array !== "undefined" && Int32Array.prototype.subarray != undefined && Int32Array.prototype.set != undefined, "JS engine does not provide full typed array support");

var INITIAL_MEMORY = Module["INITIAL_MEMORY"] || 536870912;

legacyModuleProp("INITIAL_MEMORY", "INITIAL_MEMORY");

assert(INITIAL_MEMORY >= 8388608, "INITIAL_MEMORY should be larger than STACK_SIZE, was " + INITIAL_MEMORY + "! (STACK_SIZE=" + 8388608 + ")");

if (ENVIRONMENT_IS_PTHREAD) {
 wasmMemory = Module["wasmMemory"];
} else {
 if (Module["wasmMemory"]) {
  wasmMemory = Module["wasmMemory"];
 } else {
  wasmMemory = new WebAssembly.Memory({
   "initial": INITIAL_MEMORY / 65536,
   "maximum": 4294967296 / 65536,
   "shared": true
  });
  if (!(wasmMemory.buffer instanceof SharedArrayBuffer)) {
   err("requested a shared WebAssembly.Memory but the returned buffer is not a SharedArrayBuffer, indicating that while the browser has SharedArrayBuffer it does not have WebAssembly threads support - you may need to set a flag");
   if (ENVIRONMENT_IS_NODE) {
    err("(on node you may need: --experimental-wasm-threads --experimental-wasm-bulk-memory and/or recent version)");
   }
   throw Error("bad memory");
  }
 }
}

updateMemoryViews();

INITIAL_MEMORY = wasmMemory.buffer.byteLength;

assert(INITIAL_MEMORY % 65536 === 0);

function writeStackCookie() {
 var max = _emscripten_stack_get_end();
 assert((max & 3) == 0);
 if (max == 0) {
  max += 4;
 }
 GROWABLE_HEAP_U32()[((max) >>> 2) >>> 0] = 34821223;
 GROWABLE_HEAP_U32()[(((max) + (4)) >>> 2) >>> 0] = 2310721022;
 GROWABLE_HEAP_U32()[((0) >>> 2) >>> 0] = 1668509029;
}

function checkStackCookie() {
 if (ABORT) return;
 var max = _emscripten_stack_get_end();
 if (max == 0) {
  max += 4;
 }
 var cookie1 = GROWABLE_HEAP_U32()[((max) >>> 2) >>> 0];
 var cookie2 = GROWABLE_HEAP_U32()[(((max) + (4)) >>> 2) >>> 0];
 if (cookie1 != 34821223 || cookie2 != 2310721022) {
  abort(\`Stack overflow! Stack cookie has been overwritten at \${ptrToString(max)}, expected hex dwords 0x89BACDFE and 0x2135467, but received \${ptrToString(cookie2)} \${ptrToString(cookie1)}\`);
 }
 if (GROWABLE_HEAP_U32()[((0) >>> 2) >>> 0] != 1668509029) /* 'emsc' */ {
  abort("Runtime error: The application has corrupted its heap memory area (address zero)!");
 }
}

(function() {
 var h16 = new Int16Array(1);
 var h8 = new Int8Array(h16.buffer);
 h16[0] = 25459;
 if (h8[0] !== 115 || h8[1] !== 99) throw "Runtime error: expected the system to be little-endian! (Run with -sSUPPORT_BIG_ENDIAN to bypass)";
})();

var __ATPRERUN__ = [];

var __ATINIT__ = [];

var __ATMAIN__ = [];

var __ATEXIT__ = [];

var __ATPOSTRUN__ = [];

var runtimeInitialized = false;

function preRun() {
 assert(!ENVIRONMENT_IS_PTHREAD);
 if (Module["preRun"]) {
  if (typeof Module["preRun"] == "function") Module["preRun"] = [ Module["preRun"] ];
  while (Module["preRun"].length) {
   addOnPreRun(Module["preRun"].shift());
  }
 }
 callRuntimeCallbacks(__ATPRERUN__);
}

function initRuntime() {
 assert(!runtimeInitialized);
 runtimeInitialized = true;
 if (ENVIRONMENT_IS_PTHREAD) return;
 checkStackCookie();
 if (!Module["noFSInit"] && !FS.init.initialized) FS.init();
 FS.ignorePermissions = false;
 TTY.init();
 SOCKFS.root = FS.mount(SOCKFS, {}, null);
 PIPEFS.root = FS.mount(PIPEFS, {}, null);
 callRuntimeCallbacks(__ATINIT__);
}

function preMain() {
 checkStackCookie();
 if (ENVIRONMENT_IS_PTHREAD) return;
 callRuntimeCallbacks(__ATMAIN__);
}

function postRun() {
 checkStackCookie();
 if (ENVIRONMENT_IS_PTHREAD) return;
 if (Module["postRun"]) {
  if (typeof Module["postRun"] == "function") Module["postRun"] = [ Module["postRun"] ];
  while (Module["postRun"].length) {
   addOnPostRun(Module["postRun"].shift());
  }
 }
 callRuntimeCallbacks(__ATPOSTRUN__);
}

function addOnPreRun(cb) {
 __ATPRERUN__.unshift(cb);
}

function addOnInit(cb) {
 __ATINIT__.unshift(cb);
}

function addOnPreMain(cb) {
 __ATMAIN__.unshift(cb);
}

function addOnExit(cb) {}

function addOnPostRun(cb) {
 __ATPOSTRUN__.unshift(cb);
}

assert(Math.imul, "This browser does not support Math.imul(), build with LEGACY_VM_SUPPORT or POLYFILL_OLD_MATH_FUNCTIONS to add in a polyfill");

assert(Math.fround, "This browser does not support Math.fround(), build with LEGACY_VM_SUPPORT or POLYFILL_OLD_MATH_FUNCTIONS to add in a polyfill");

assert(Math.clz32, "This browser does not support Math.clz32(), build with LEGACY_VM_SUPPORT or POLYFILL_OLD_MATH_FUNCTIONS to add in a polyfill");

assert(Math.trunc, "This browser does not support Math.trunc(), build with LEGACY_VM_SUPPORT or POLYFILL_OLD_MATH_FUNCTIONS to add in a polyfill");

var runDependencies = 0;

var runDependencyWatcher = null;

var dependenciesFulfilled = null;

var runDependencyTracking = {};

function getUniqueRunDependency(id) {
 var orig = id;
 while (1) {
  if (!runDependencyTracking[id]) return id;
  id = orig + Math.random();
 }
}

function addRunDependency(id) {
 runDependencies++;
 Module["monitorRunDependencies"]?.(runDependencies);
 if (id) {
  assert(!runDependencyTracking[id]);
  runDependencyTracking[id] = 1;
  if (runDependencyWatcher === null && typeof setInterval != "undefined") {
   runDependencyWatcher = setInterval(() => {
    if (ABORT) {
     clearInterval(runDependencyWatcher);
     runDependencyWatcher = null;
     return;
    }
    var shown = false;
    for (var dep in runDependencyTracking) {
     if (!shown) {
      shown = true;
      err("still waiting on run dependencies:");
     }
     err(\`dependency: \${dep}\`);
    }
    if (shown) {
     err("(end of list)");
    }
   }, 1e4);
  }
 } else {
  err("warning: run dependency added without ID");
 }
}

function removeRunDependency(id) {
 runDependencies--;
 Module["monitorRunDependencies"]?.(runDependencies);
 if (id) {
  assert(runDependencyTracking[id]);
  delete runDependencyTracking[id];
 } else {
  err("warning: run dependency removed without ID");
 }
 if (runDependencies == 0) {
  if (runDependencyWatcher !== null) {
   clearInterval(runDependencyWatcher);
   runDependencyWatcher = null;
  }
  if (dependenciesFulfilled) {
   var callback = dependenciesFulfilled;
   dependenciesFulfilled = null;
   callback();
  }
 }
}

/** @param {string|number=} what */ function abort(what) {
 Module["onAbort"]?.(what);
 what = "Aborted(" + what + ")";
 err(what);
 ABORT = true;
 EXITSTATUS = 1;
 /** @suppress {checkTypes} */ var e = new WebAssembly.RuntimeError(what);
 readyPromiseReject(e);
 throw e;
}

var dataURIPrefix = "data:application/octet-stream;base64,";

/**
 * Indicates whether filename is a base64 data URI.
 * @noinline
 */ var isDataURI = filename => filename.startsWith(dataURIPrefix);

/**
 * Indicates whether filename is delivered via file protocol (as opposed to http/https)
 * @noinline
 */ var isFileURI = filename => filename.startsWith("file://");

function createExportWrapper(name) {
 return (...args) => {
  assert(runtimeInitialized, \`native function \\\`\${name}\\\` called before runtime initialization\`);
  var f = wasmExports[name];
  assert(f, \`exported native function \\\`\${name}\\\` not found\`);
  return f(...args);
 };
}

var wasmBinaryFile;

wasmBinaryFile = "gecko.wasm";

if (!isDataURI(wasmBinaryFile)) {
 wasmBinaryFile = locateFile(wasmBinaryFile);
}

function getBinarySync(file) {
 if (file == wasmBinaryFile && wasmBinary) {
  return new Uint8Array(wasmBinary);
 }
 if (readBinary) {
  return readBinary(file);
 }
 throw "both async and sync fetching of the wasm failed";
}

function getBinaryPromise(binaryFile) {
 if (!wasmBinary && (ENVIRONMENT_IS_WEB || ENVIRONMENT_IS_WORKER)) {
  if (typeof fetch == "function") {
   return fetch(binaryFile, {
    credentials: "same-origin"
   }).then(response => {
    if (!response["ok"]) {
     throw \`failed to load wasm binary file at '\${binaryFile}'\`;
    }
    return response["arrayBuffer"]();
   }).catch(() => getBinarySync(binaryFile));
  }
 }
 return Promise.resolve().then(() => getBinarySync(binaryFile));
}

function instantiateArrayBuffer(binaryFile, imports, receiver) {
 return getBinaryPromise(binaryFile).then(binary => WebAssembly.instantiate(binary, imports)).then(receiver, reason => {
  err(\`failed to asynchronously prepare wasm: \${reason}\`);
  if (isFileURI(wasmBinaryFile)) {
   err(\`warning: Loading from a file URI (\${wasmBinaryFile}) is not supported in most browsers. See https://emscripten.org/docs/getting_started/FAQ.html#how-do-i-run-a-local-webserver-for-testing-why-does-my-program-stall-in-downloading-or-preparing\`);
  }
  abort(reason);
 });
}

function instantiateAsync(binary, binaryFile, imports, callback) {
 if (!binary && typeof WebAssembly.instantiateStreaming == "function" && !isDataURI(binaryFile) && typeof fetch == "function") {
  return fetch(binaryFile, {
   credentials: "same-origin"
  }).then(response => {
   /** @suppress {checkTypes} */ var result = WebAssembly.instantiateStreaming(response, imports);
   return result.then(callback, function(reason) {
    err(\`wasm streaming compile failed: \${reason}\`);
    err("falling back to ArrayBuffer instantiation");
    return instantiateArrayBuffer(binaryFile, imports, callback);
   });
  });
 }
 return instantiateArrayBuffer(binaryFile, imports, callback);
}

function createWasm() {
 var info = {
  "env": wasmImports,
  "wasi_snapshot_preview1": wasmImports
 };
 /** @param {WebAssembly.Module=} module*/ function receiveInstance(instance, module) {
  wasmExports = instance.exports;
  wasmExports = applySignatureConversions(wasmExports);
  registerTLSInit(wasmExports["_emscripten_tls_init"]);
  wasmTable = wasmExports["__indirect_function_table"];
  assert(wasmTable, "table not found in wasm exports");
  addOnInit(wasmExports["__wasm_call_ctors"]);
  wasmModule = module;
  removeRunDependency("wasm-instantiate");
  return wasmExports;
 }
 addRunDependency("wasm-instantiate");
 var trueModule = Module;
 function receiveInstantiationResult(result) {
  assert(Module === trueModule, "the Module object should not be replaced during async compilation - perhaps the order of HTML elements is wrong?");
  trueModule = null;
  receiveInstance(result["instance"], result["module"]);
 }
 if (Module["instantiateWasm"]) {
  try {
   return Module["instantiateWasm"](info, receiveInstance);
  } catch (e) {
   err(\`Module.instantiateWasm callback failed with error: \${e}\`);
   readyPromiseReject(e);
  }
 }
 instantiateAsync(wasmBinary, wasmBinaryFile, info, receiveInstantiationResult).catch(readyPromiseReject);
 return {};
}

function legacyModuleProp(prop, newName, incoming = true) {
 if (!Object.getOwnPropertyDescriptor(Module, prop)) {
  Object.defineProperty(Module, prop, {
   configurable: true,
   get() {
    let extra = incoming ? " (the initial value can be provided on Module, but after startup the value is only looked for on a local variable of that name)" : "";
    abort(\`\\\`Module.\${prop}\\\` has been replaced by \\\`\${newName}\\\`\` + extra);
   }
  });
 }
}

function ignoredModuleProp(prop) {
 if (Object.getOwnPropertyDescriptor(Module, prop)) {
  abort(\`\\\`Module.\${prop}\\\` was supplied but \\\`\${prop}\\\` not included in INCOMING_MODULE_JS_API\`);
 }
}

function isExportedByForceFilesystem(name) {
 return name === "FS_createPath" || name === "FS_createDataFile" || name === "FS_createPreloadedFile" || name === "FS_unlink" || name === "addRunDependency" || name === "FS_createLazyFile" || name === "FS_createDevice" || name === "removeRunDependency";
}

function missingGlobal(sym, msg) {
 if (typeof globalThis !== "undefined") {
  Object.defineProperty(globalThis, sym, {
   configurable: true,
   get() {
    warnOnce(\`\\\`\${sym}\\\` is not longer defined by emscripten. \${msg}\`);
    return undefined;
   }
  });
 }
}

missingGlobal("buffer", "Please use HEAP8.buffer or wasmMemory.buffer");

missingGlobal("asm", "Please use wasmExports instead");

function missingLibrarySymbol(sym) {
 if (typeof globalThis !== "undefined" && !Object.getOwnPropertyDescriptor(globalThis, sym)) {
  Object.defineProperty(globalThis, sym, {
   configurable: true,
   get() {
    var msg = \`\\\`\${sym}\\\` is a library symbol and not included by default; add it to your library.js __deps or to DEFAULT_LIBRARY_FUNCS_TO_INCLUDE on the command line\`;
    var librarySymbol = sym;
    if (!librarySymbol.startsWith("_")) {
     librarySymbol = "$" + sym;
    }
    msg += \` (e.g. -sDEFAULT_LIBRARY_FUNCS_TO_INCLUDE='\${librarySymbol}')\`;
    if (isExportedByForceFilesystem(sym)) {
     msg += ". Alternatively, forcing filesystem support (-sFORCE_FILESYSTEM) can export this for you";
    }
    warnOnce(msg);
    return undefined;
   }
  });
 }
 unexportedRuntimeSymbol(sym);
}

function unexportedRuntimeSymbol(sym) {
 if (!Object.getOwnPropertyDescriptor(Module, sym)) {
  Object.defineProperty(Module, sym, {
   configurable: true,
   get() {
    var msg = \`'\${sym}' was not exported. add it to EXPORTED_RUNTIME_METHODS (see the Emscripten FAQ)\`;
    if (isExportedByForceFilesystem(sym)) {
     msg += ". Alternatively, forcing filesystem support (-sFORCE_FILESYSTEM) can export this for you";
    }
    abort(msg);
   }
  });
 }
}

function dbg(...args) {
 console.warn(...args);
}

var ASM_CONSTS = {
 51400188: $0 => {
  var w = PThread.pthreads[$0];
  if (!w) return;
  var screen = document.querySelector("#screen");
  var o = document.getElementById("glout");
  if (!o) {
   o = document.createElement("canvas");
   o.id = "glout";
   o.width = screen.width;
   o.height = screen.height;
   o.style.position = "absolute";
   o.style.border = "none";
   o.style.left = "0";
   o.style.top = "0";
   o.style.width = "100vw";
   o.style.height = "100vh";
   o.style.pointerEvents = "none";
   (screen.parentNode || document.body).appendChild(o);
  }
  var bctx = o.getContext("bitmaprenderer");
  w.addEventListener("message", function(e) {
   if (e.data && e.data.__glpresent && e.data.bmp) {
    try {
     bctx.transferFromImageBitmap(e.data.bmp);
    } catch (err) {}
   }
  });
 },
 51400883: () => {
  var gl = GL.currentContext && GL.currentContext.GLctx;
  if (gl && gl.canvas && gl.canvas.transferToImageBitmap) {
   var bmp = gl.canvas.transferToImageBitmap();
   var m = {};
   m.__glpresent = 1;
   m.bmp = bmp;
   self.postMessage(m, [ bmp ]);
  }
 },
 51401119: $0 => {
  try {
   var oc = new OffscreenCanvas(300, 150);
   var attrs = {};
   attrs.majorVersion = $0 ? 2 : 1;
   attrs.minorVersion = 0;
   attrs.alpha = true;
   attrs.depth = true;
   attrs.stencil = true;
   attrs.antialias = false;
   attrs.premultipliedAlpha = true;
   attrs.preserveDrawingBuffer = true;
   attrs.failIfMajorPerformanceCaveat = false;
   attrs.enableExtensionsByDefault = true;
   var glctx = oc.getContext($0 ? "webgl2" : "webgl", attrs);
   if (!glctx) return 0;
   return GL.registerContext(glctx, attrs);
  } catch (e) {
   return 0;
  }
 },
 51401630: $0 => {
  try {
   if (navigator.clipboard && navigator.clipboard.writeText) {
    navigator.clipboard.writeText(UTF8ToString($0));
   }
  } catch (e) {}
 },
 51401766: () => (typeof wasmOffsetConverter !== "undefined")
};

function WasmInvoke(fp, thisPtr, argbuf, sigPtr, nparams) {
 var sig = UTF8ToString(sigPtr);
 var f = wasmTable.get(fp);
 var args = new Array(nparams + 1);
 args[0] = thisPtr;
 for (var i = 0; i < nparams; i++) {
  var c = sig.charAt(2 + i);
  var off = argbuf + i * 8;
  if (c == "d") {
   args[i + 1] = GROWABLE_HEAP_F64()[off >>> 3];
  } else if (c == "f") {
   args[i + 1] = GROWABLE_HEAP_F32()[off >>> 2];
  } else if (c == "j") {
   args[i + 1] = HEAP64[off >> 3];
  } else {
   args[i + 1] = GROWABLE_HEAP_I32()[off >>> 2];
  }
 }
 return f.apply(null, args);
}

function WasmAddStub(methodIndex, sigPtr) {
 var sig = UTF8ToString(sigPtr);
 var fn = function() {
  var nargs = arguments.length - 1;
  var thisPtr = arguments[0];
  var buf = _malloc(nargs * 8);
  for (var i = 0; i < nargs; i++) {
   var c = sig.charAt(2 + i);
   var v = arguments[1 + i];
   var off = buf + i * 8;
   if (c == "d") {
    GROWABLE_HEAP_F64()[off >>> 3] = v;
   } else if (c == "f") {
    GROWABLE_HEAP_F32()[off >>> 2] = v;
   } else if (c == "j") {
    HEAP64[off >> 3] = BigInt(v);
   } else {
    GROWABLE_HEAP_I32()[off >>> 2] = v;
    GROWABLE_HEAP_I32()[(off >> 2) + 1 >>> 0] = 0;
   }
  }
  var ret = _WasmXPTCStubDispatch(thisPtr, methodIndex, buf, nargs);
  _free(buf);
  return ret;
 };
 return addFunction(fn, sig);
}

function HaveOffsetConverter() {
 return typeof wasmOffsetConverter !== "undefined";
}

/** @constructor */ function ExitStatus(status) {
 this.name = "ExitStatus";
 this.message = \`Program terminated with exit(\${status})\`;
 this.status = status;
}

var terminateWorker = worker => {
 worker.terminate();
 worker.onmessage = e => {
  var cmd = e["data"]["cmd"];
  err(\`received "\${cmd}" command from terminated worker: \${worker.workerID}\`);
 };
};

var killThread = pthread_ptr => {
 assert(!ENVIRONMENT_IS_PTHREAD, "Internal Error! killThread() can only ever be called from main application thread!");
 assert(pthread_ptr, "Internal Error! Null pthread_ptr in killThread!");
 var worker = PThread.pthreads[pthread_ptr];
 delete PThread.pthreads[pthread_ptr];
 terminateWorker(worker);
 __emscripten_thread_free_data(pthread_ptr);
 PThread.runningWorkers.splice(PThread.runningWorkers.indexOf(worker), 1);
 worker.pthread_ptr = 0;
};

var cancelThread = pthread_ptr => {
 assert(!ENVIRONMENT_IS_PTHREAD, "Internal Error! cancelThread() can only ever be called from main application thread!");
 assert(pthread_ptr, "Internal Error! Null pthread_ptr in cancelThread!");
 var worker = PThread.pthreads[pthread_ptr];
 worker.postMessage({
  "cmd": "cancel"
 });
};

var cleanupThread = pthread_ptr => {
 assert(!ENVIRONMENT_IS_PTHREAD, "Internal Error! cleanupThread() can only ever be called from main application thread!");
 assert(pthread_ptr, "Internal Error! Null pthread_ptr in cleanupThread!");
 var worker = PThread.pthreads[pthread_ptr];
 assert(worker);
 PThread.returnWorkerToPool(worker);
};

var zeroMemory = (address, size) => {
 GROWABLE_HEAP_U8().fill(0, address, address + size);
 return address;
};

var spawnThread = threadParams => {
 assert(!ENVIRONMENT_IS_PTHREAD, "Internal Error! spawnThread() can only ever be called from main application thread!");
 assert(threadParams.pthread_ptr, "Internal error, no pthread ptr!");
 var worker = PThread.getNewWorker();
 if (!worker) {
  return 6;
 }
 assert(!worker.pthread_ptr, "Internal error!");
 PThread.runningWorkers.push(worker);
 PThread.pthreads[threadParams.pthread_ptr] = worker;
 worker.pthread_ptr = threadParams.pthread_ptr;
 var msg = {
  "cmd": "run",
  "start_routine": threadParams.startRoutine,
  "arg": threadParams.arg,
  "pthread_ptr": threadParams.pthread_ptr
 };
 msg.moduleCanvasId = threadParams.moduleCanvasId;
 msg.offscreenCanvases = threadParams.offscreenCanvases;
 worker.postMessage(msg, threadParams.transferList);
 return 0;
};

var runtimeKeepaliveCounter = 0;

var keepRuntimeAlive = () => noExitRuntime || runtimeKeepaliveCounter > 0;

var withStackSave = f => {
 var stack = stackSave();
 var ret = f();
 stackRestore(stack);
 return ret;
};

var MAX_INT53 = 9007199254740992;

var MIN_INT53 = -9007199254740992;

var bigintToI53Checked = num => (num < MIN_INT53 || num > MAX_INT53) ? NaN : Number(num);

/** @type{function(number, (number|boolean), ...number)} */ var proxyToMainThread = (funcIndex, emAsmAddr, sync, ...callArgs) => withStackSave(() => {
 var serializedNumCallArgs = callArgs.length * 2;
 var args = stackAlloc(serializedNumCallArgs * 8);
 var b = ((args) >>> 3);
 for (var i = 0; i < callArgs.length; i++) {
  var arg = callArgs[i];
  if (typeof arg == "bigint") {
   HEAP64[b + 2 * i] = 1n;
   HEAP64[b + 2 * i + 1] = arg;
  } else {
   HEAP64[b + 2 * i] = 0n;
   GROWABLE_HEAP_F64()[b + 2 * i + 1 >>> 0] = arg;
  }
 }
 return __emscripten_run_on_main_thread_js(funcIndex, emAsmAddr, serializedNumCallArgs, args, sync);
});

function _proc_exit(code) {
 if (ENVIRONMENT_IS_PTHREAD) return proxyToMainThread(0, 0, 1, code);
 EXITSTATUS = code;
 if (!keepRuntimeAlive()) {
  PThread.terminateAllThreads();
  Module["onExit"]?.(code);
  ABORT = true;
 }
 quit_(code, new ExitStatus(code));
}

/** @param {boolean|number=} implicit */ var exitJS = (status, implicit) => {
 EXITSTATUS = status;
 checkUnflushedContent();
 if (ENVIRONMENT_IS_PTHREAD) {
  assert(!implicit);
  exitOnMainThread(status);
  throw "unwind";
 }
 if (keepRuntimeAlive() && !implicit) {
  var msg = \`program exited (with status: \${status}), but keepRuntimeAlive() is set (counter=\${runtimeKeepaliveCounter}) due to an async operation, so halting execution but not exiting the runtime or preventing further async execution (you can use emscripten_force_exit, if you want to force a true shutdown)\`;
  readyPromiseReject(msg);
  err(msg);
 }
 _proc_exit(status);
};

var _exit = exitJS;

var ptrToString = ptr => {
 assert(typeof ptr === "number");
 return "0x" + ptr.toString(16).padStart(8, "0");
};

var handleException = e => {
 if (e instanceof ExitStatus || e == "unwind") {
  return EXITSTATUS;
 }
 checkStackCookie();
 if (e instanceof WebAssembly.RuntimeError) {
  if (_emscripten_stack_get_current() <= 0) {
   err("Stack overflow detected.  You can try increasing -sSTACK_SIZE (currently set to 8388608)");
  }
 }
 quit_(1, e);
};

var PThread = {
 unusedWorkers: [],
 runningWorkers: [],
 tlsInitFunctions: [],
 pthreads: {},
 nextWorkerID: 1,
 debugInit() {
  function pthreadLogPrefix() {
   var t = 0;
   if (runtimeInitialized && typeof _pthread_self != "undefined") {
    t = _pthread_self();
   }
   return "w:" + (Module["workerID"] || 0) + ",t:" + ptrToString(t) + ": ";
  }
  var origDbg = dbg;
  dbg = (...args) => origDbg(pthreadLogPrefix() + args.join(" "));
 },
 init() {
  PThread.debugInit();
  if (ENVIRONMENT_IS_PTHREAD) {
   PThread.initWorker();
  } else {
   PThread.initMainThread();
  }
 },
 initMainThread() {
  var pthreadPoolSize = 20;
  while (pthreadPoolSize--) {
   PThread.allocateUnusedWorker();
  }
  addOnPreRun(() => {
   addRunDependency("loading-workers");
   PThread.loadWasmModuleToAllWorkers(() => removeRunDependency("loading-workers"));
  });
 },
 initWorker() {
  PThread["receiveObjectTransfer"] = PThread.receiveObjectTransfer;
  PThread["threadInitTLS"] = PThread.threadInitTLS;
  PThread["setExitStatus"] = PThread.setExitStatus;
  noExitRuntime = false;
 },
 setExitStatus: status => EXITSTATUS = status,
 terminateAllThreads__deps: [ "$terminateWorker" ],
 terminateAllThreads: () => {
  assert(!ENVIRONMENT_IS_PTHREAD, "Internal Error! terminateAllThreads() can only ever be called from main application thread!");
  for (var worker of PThread.runningWorkers) {
   terminateWorker(worker);
  }
  for (var worker of PThread.unusedWorkers) {
   terminateWorker(worker);
  }
  PThread.unusedWorkers = [];
  PThread.runningWorkers = [];
  PThread.pthreads = [];
 },
 returnWorkerToPool: worker => {
  var pthread_ptr = worker.pthread_ptr;
  delete PThread.pthreads[pthread_ptr];
  PThread.unusedWorkers.push(worker);
  PThread.runningWorkers.splice(PThread.runningWorkers.indexOf(worker), 1);
  worker.pthread_ptr = 0;
  __emscripten_thread_free_data(pthread_ptr);
 },
 receiveObjectTransfer(data) {
  if (typeof GL != "undefined") {
   Object.assign(GL.offscreenCanvases, data.offscreenCanvases);
   if (!Module["canvas"] && data.moduleCanvasId && GL.offscreenCanvases[data.moduleCanvasId]) {
    Module["canvas"] = GL.offscreenCanvases[data.moduleCanvasId].offscreenCanvas;
    Module["canvas"].id = data.moduleCanvasId;
   }
  }
 },
 threadInitTLS() {
  PThread.tlsInitFunctions.forEach(f => f());
 },
 loadWasmModuleToWorker: worker => new Promise(onFinishedLoading => {
  worker.onmessage = e => {
   var d = e["data"];
   var cmd = d["cmd"];
   if (d["targetThread"] && d["targetThread"] != _pthread_self()) {
    var targetWorker = PThread.pthreads[d["targetThread"]];
    if (targetWorker) {
     targetWorker.postMessage(d, d["transferList"]);
    } else {
     err(\`Internal error! Worker sent a message "\${cmd}" to target pthread \${d["targetThread"]}, but that thread no longer exists!\`);
    }
    return;
   }
   if (cmd === "checkMailbox") {
    checkMailbox();
   } else if (cmd === "spawnThread") {
    spawnThread(d);
   } else if (cmd === "cleanupThread") {
    cleanupThread(d["thread"]);
   } else if (cmd === "killThread") {
    killThread(d["thread"]);
   } else if (cmd === "cancelThread") {
    cancelThread(d["thread"]);
   } else if (cmd === "loaded") {
    worker.loaded = true;
    onFinishedLoading(worker);
   } else if (cmd === "alert") {
    alert(\`Thread \${d["threadId"]}: \${d["text"]}\`);
   } else if (d.target === "setimmediate") {
    worker.postMessage(d);
   } else if (cmd === "callHandler") {
    Module[d["handler"]](...d["args"]);
   } else if (cmd) {
    err(\`worker sent an unknown command \${cmd}\`);
   }
  };
  worker.onerror = e => {
   var message = "worker sent an error!";
   if (worker.pthread_ptr) {
    message = \`Pthread \${ptrToString(worker.pthread_ptr)} sent an error!\`;
   }
   err(\`\${message} \${e.filename}:\${e.lineno}: \${e.message}\`);
   throw e;
  };
  assert(wasmMemory instanceof WebAssembly.Memory, "WebAssembly memory should have been loaded by now!");
  assert(wasmModule instanceof WebAssembly.Module, "WebAssembly Module should have been loaded by now!");
  var handlers = [];
  var knownHandlers = [ "onExit", "onAbort", "print", "printErr" ];
  for (var handler of knownHandlers) {
   if (Module.hasOwnProperty(handler)) {
    handlers.push(handler);
   }
  }
  worker.workerID = PThread.nextWorkerID++;
  worker.postMessage({
   "cmd": "load",
   "handlers": handlers,
   "urlOrBlob": Module["mainScriptUrlOrBlob"] || _scriptDir,
   "wasmMemory": wasmMemory,
   "wasmModule": wasmModule,
   "workerID": worker.workerID
  });
 }),
 loadWasmModuleToAllWorkers(onMaybeReady) {
  if (ENVIRONMENT_IS_PTHREAD) {
   return onMaybeReady();
  }
  let pthreadPoolReady = Promise.all(PThread.unusedWorkers.map(PThread.loadWasmModuleToWorker));
  pthreadPoolReady.then(onMaybeReady);
 },
 allocateUnusedWorker() {
  var worker;
  var pthreadMainJs = locateFile("gecko.worker.js");
  worker = new Worker(pthreadMainJs);
  PThread.unusedWorkers.push(worker);
 },
 getNewWorker() {
  if (PThread.unusedWorkers.length == 0) {
   PThread.allocateUnusedWorker();
   PThread.loadWasmModuleToWorker(PThread.unusedWorkers[0]);
  }
  return PThread.unusedWorkers.pop();
 }
};

Module["PThread"] = PThread;

var callRuntimeCallbacks = callbacks => {
 while (callbacks.length > 0) {
  callbacks.shift()(Module);
 }
};

var establishStackSpace = () => {
 var pthread_ptr = _pthread_self();
 var stackHigh = GROWABLE_HEAP_U32()[(((pthread_ptr) + (52)) >>> 2) >>> 0];
 var stackSize = GROWABLE_HEAP_U32()[(((pthread_ptr) + (56)) >>> 2) >>> 0];
 var stackLow = stackHigh - stackSize;
 assert(stackHigh != 0);
 assert(stackLow != 0);
 assert(stackHigh > stackLow, "stackHigh must be higher then stackLow");
 _emscripten_stack_set_limits(stackHigh, stackLow);
 stackRestore(stackHigh);
 writeStackCookie();
};

Module["establishStackSpace"] = establishStackSpace;

var runtimeKeepalivePop = () => {
 assert(runtimeKeepaliveCounter > 0);
 runtimeKeepaliveCounter -= 1;
};

function exitOnMainThread(returnCode) {
 if (ENVIRONMENT_IS_PTHREAD) return proxyToMainThread(1, 0, 0, returnCode);
 runtimeKeepalivePop();
 _exit(returnCode);
}

/**
     * @param {number} ptr
     * @param {string} type
     */ function getValue(ptr, type = "i8") {
 if (type.endsWith("*")) type = "*";
 switch (type) {
 case "i1":
  return GROWABLE_HEAP_I8()[ptr >>> 0];

 case "i8":
  return GROWABLE_HEAP_I8()[ptr >>> 0];

 case "i16":
  return GROWABLE_HEAP_I16()[((ptr) >>> 1) >>> 0];

 case "i32":
  return GROWABLE_HEAP_I32()[((ptr) >>> 2) >>> 0];

 case "i64":
  return HEAP64[((ptr) >>> 3)];

 case "float":
  return GROWABLE_HEAP_F32()[((ptr) >>> 2) >>> 0];

 case "double":
  return GROWABLE_HEAP_F64()[((ptr) >>> 3) >>> 0];

 case "*":
  return GROWABLE_HEAP_U32()[((ptr) >>> 2) >>> 0];

 default:
  abort(\`invalid type for getValue: \${type}\`);
 }
}

var wasmTableMirror = [];

var wasmTable;

var getWasmTableEntry = funcPtr => {
 var func = wasmTableMirror[funcPtr];
 if (!func) {
  if (funcPtr >= wasmTableMirror.length) wasmTableMirror.length = funcPtr + 1;
  wasmTableMirror[funcPtr] = func = wasmTable.get(funcPtr);
 }
 assert(wasmTable.get(funcPtr) == func, "JavaScript-side Wasm function table mirror is out of date!");
 return func;
};

var invokeEntryPoint = (ptr, arg) => {
 var result = getWasmTableEntry(ptr)(arg);
 checkStackCookie();
 function finish(result) {
  if (keepRuntimeAlive()) {
   PThread.setExitStatus(result);
  } else {
   __emscripten_thread_exit(result);
  }
 }
 finish(result);
};

Module["invokeEntryPoint"] = invokeEntryPoint;

var noExitRuntime = Module["noExitRuntime"] || true;

var registerTLSInit = tlsInitFunc => PThread.tlsInitFunctions.push(tlsInitFunc);

var runtimeKeepalivePush = () => {
 runtimeKeepaliveCounter += 1;
};

/**
     * @param {number} ptr
     * @param {number} value
     * @param {string} type
     */ function setValue(ptr, value, type = "i8") {
 if (type.endsWith("*")) type = "*";
 switch (type) {
 case "i1":
  GROWABLE_HEAP_I8()[ptr >>> 0] = value;
  break;

 case "i8":
  GROWABLE_HEAP_I8()[ptr >>> 0] = value;
  break;

 case "i16":
  GROWABLE_HEAP_I16()[((ptr) >>> 1) >>> 0] = value;
  break;

 case "i32":
  GROWABLE_HEAP_I32()[((ptr) >>> 2) >>> 0] = value;
  break;

 case "i64":
  HEAP64[((ptr) >>> 3)] = BigInt(value);
  break;

 case "float":
  GROWABLE_HEAP_F32()[((ptr) >>> 2) >>> 0] = value;
  break;

 case "double":
  GROWABLE_HEAP_F64()[((ptr) >>> 3) >>> 0] = value;
  break;

 case "*":
  GROWABLE_HEAP_U32()[((ptr) >>> 2) >>> 0] = value;
  break;

 default:
  abort(\`invalid type for setValue: \${type}\`);
 }
}

var warnOnce = text => {
 warnOnce.shown ||= {};
 if (!warnOnce.shown[text]) {
  warnOnce.shown[text] = 1;
  err(text);
 }
};

function jsStackTrace() {
 return (new Error).stack.toString();
}

/** @param {number=} flags */ function getCallstack(flags) {
 var callstack = jsStackTrace();
 var iThisFunc = callstack.lastIndexOf("_emscripten_log");
 var iThisFunc2 = callstack.lastIndexOf("_emscripten_get_callstack");
 var iNextLine = callstack.indexOf("\\n", Math.max(iThisFunc, iThisFunc2)) + 1;
 callstack = callstack.slice(iNextLine);
 if (flags & 8 && typeof emscripten_source_map == "undefined") {
  warnOnce('Source map information is not available, emscripten_log with EM_LOG_C_STACK will be ignored. Build with "--pre-js $EMSCRIPTEN/src/emscripten-source-map.min.js" linker flag to add source map loading to code.');
  flags ^= 8;
  flags |= 16;
 }
 var lines = callstack.split("\\n");
 callstack = "";
 var newFirefoxRe = new RegExp("\\\\s*(.*?)@(.*?):([0-9]+):([0-9]+)");
 var firefoxRe = new RegExp("\\\\s*(.*?)@(.*):(.*)(:(.*))?");
 var chromeRe = new RegExp("\\\\s*at (.*?) \\\\((.*):(.*):(.*)\\\\)");
 for (var l in lines) {
  var line = lines[l];
  var symbolName = "";
  var file = "";
  var lineno = 0;
  var column = 0;
  var parts = chromeRe.exec(line);
  if (parts && parts.length == 5) {
   symbolName = parts[1];
   file = parts[2];
   lineno = parts[3];
   column = parts[4];
  } else {
   parts = newFirefoxRe.exec(line);
   if (!parts) parts = firefoxRe.exec(line);
   if (parts && parts.length >= 4) {
    symbolName = parts[1];
    file = parts[2];
    lineno = parts[3];
    column = parts[4] | 0;
   } else {
    callstack += line + "\\n";
    continue;
   }
  }
  var haveSourceMap = false;
  if (flags & 8) {
   var orig = emscripten_source_map.originalPositionFor({
    line: lineno,
    column: column
   });
   haveSourceMap = orig?.source;
   if (haveSourceMap) {
    if (flags & 64) {
     orig.source = orig.source.substring(orig.source.replace(/\\\\/g, "/").lastIndexOf("/") + 1);
    }
    callstack += \`    at \${symbolName} (\${orig.source}:\${orig.line}:\${orig.column})\\n\`;
   }
  }
  if ((flags & 16) || !haveSourceMap) {
   if (flags & 64) {
    file = file.substring(file.replace(/\\\\/g, "/").lastIndexOf("/") + 1);
   }
   callstack += (haveSourceMap ? (\`     = \${symbolName}\`) : (\`    at \${symbolName}\`)) + \` (\${file}:\${lineno}:\${column})\\n\`;
  }
 }
 callstack = callstack.replace(/\\s+$/, "");
 return callstack;
}

function __Unwind_Backtrace(func, arg) {
 func >>>= 0;
 arg >>>= 0;
 var trace = getCallstack();
 var parts = trace.split("\\n");
 for (var i = 0; i < parts.length; i++) {
  var ret = getWasmTableEntry(func)(0, arg);
  if (ret !== 0) return;
 }
}

/** @type {function(...*):?} */ function __Unwind_GetIP() {
 abort("missing function: _Unwind_GetIP");
}

__Unwind_GetIP.stub = true;

/** @type {function(...*):?} */ function __ZN16nsBaseFilePicker13AppendFiltersEi() {
 abort("missing function: _ZN16nsBaseFilePicker13AppendFiltersEi");
}

__ZN16nsBaseFilePicker13AppendFiltersEi.stub = true;

/** @type {function(...*):?} */ function __ZN16nsBaseFilePicker15AppendRawFilterERK12nsTSubstringIDsE() {
 abort("missing function: _ZN16nsBaseFilePicker15AppendRawFilterERK12nsTSubstringIDsE");
}

__ZN16nsBaseFilePicker15AppendRawFilterERK12nsTSubstringIDsE.stub = true;

/** @type {function(...*):?} */ function __ZN16nsBaseFilePicker15IsModeSupportedEN13nsIFilePicker4ModeEP9JSContextPPN7mozilla3dom7PromiseE() {
 abort("missing function: _ZN16nsBaseFilePicker15IsModeSupportedEN13nsIFilePicker4ModeEP9JSContextPPN7mozilla3dom7PromiseE");
}

__ZN16nsBaseFilePicker15IsModeSupportedEN13nsIFilePicker4ModeEP9JSContextPPN7mozilla3dom7PromiseE.stub = true;

/** @type {function(...*):?} */ function __ZN16nsBaseFilePicker16GetOkButtonLabelER12nsTSubstringIDsE() {
 abort("missing function: _ZN16nsBaseFilePicker16GetOkButtonLabelER12nsTSubstringIDsE");
}

__ZN16nsBaseFilePicker16GetOkButtonLabelER12nsTSubstringIDsE.stub = true;

/** @type {function(...*):?} */ function __ZN16nsBaseFilePicker16SetOkButtonLabelERK12nsTSubstringIDsE() {
 abort("missing function: _ZN16nsBaseFilePicker16SetOkButtonLabelERK12nsTSubstringIDsE");
}

__ZN16nsBaseFilePicker16SetOkButtonLabelERK12nsTSubstringIDsE.stub = true;

/** @type {function(...*):?} */ function __ZN16nsBaseFilePicker18GetAddToRecentDocsEPb() {
 abort("missing function: _ZN16nsBaseFilePicker18GetAddToRecentDocsEPb");
}

__ZN16nsBaseFilePicker18GetAddToRecentDocsEPb.stub = true;

/** @type {function(...*):?} */ function __ZN16nsBaseFilePicker18SetAddToRecentDocsEb() {
 abort("missing function: _ZN16nsBaseFilePicker18SetAddToRecentDocsEb");
}

__ZN16nsBaseFilePicker18SetAddToRecentDocsEb.stub = true;

/** @type {function(...*):?} */ function __ZN16nsBaseFilePicker19GetDisplayDirectoryEPP7nsIFile() {
 abort("missing function: _ZN16nsBaseFilePicker19GetDisplayDirectoryEPP7nsIFile");
}

__ZN16nsBaseFilePicker19GetDisplayDirectoryEPP7nsIFile.stub = true;

/** @type {function(...*):?} */ function __ZN16nsBaseFilePicker19SetDisplayDirectoryEP7nsIFile() {
 abort("missing function: _ZN16nsBaseFilePicker19SetDisplayDirectoryEP7nsIFile");
}

__ZN16nsBaseFilePicker19SetDisplayDirectoryEP7nsIFile.stub = true;

/** @type {function(...*):?} */ function __ZN16nsBaseFilePicker26GetDisplaySpecialDirectoryER12nsTSubstringIDsE() {
 abort("missing function: _ZN16nsBaseFilePicker26GetDisplaySpecialDirectoryER12nsTSubstringIDsE");
}

__ZN16nsBaseFilePicker26GetDisplaySpecialDirectoryER12nsTSubstringIDsE.stub = true;

/** @type {function(...*):?} */ function __ZN16nsBaseFilePicker26SetDisplaySpecialDirectoryERK12nsTSubstringIDsE() {
 abort("missing function: _ZN16nsBaseFilePicker26SetDisplaySpecialDirectoryERK12nsTSubstringIDsE");
}

__ZN16nsBaseFilePicker26SetDisplaySpecialDirectoryERK12nsTSubstringIDsE.stub = true;

/** @type {function(...*):?} */ function __ZN16nsBaseFilePicker7GetModeEPN13nsIFilePicker4ModeE() {
 abort("missing function: _ZN16nsBaseFilePicker7GetModeEPN13nsIFilePicker4ModeE");
}

__ZN16nsBaseFilePicker7GetModeEPN13nsIFilePicker4ModeE.stub = true;

/** @type {function(...*):?} */ function __ZN16nsBaseFilePickerC2Ev() {
 abort("missing function: _ZN16nsBaseFilePickerC2Ev");
}

__ZN16nsBaseFilePickerC2Ev.stub = true;

/** @type {function(...*):?} */ function __ZN16nsBaseFilePickerD2Ev() {
 abort("missing function: _ZN16nsBaseFilePickerD2Ev");
}

__ZN16nsBaseFilePickerD2Ev.stub = true;

/** @type {function(...*):?} */ function __ZN4base9LaunchAppERKNSt3__26vectorINS0_12basic_stringIcNS0_11char_traitsIcEENS0_9allocatorIcEEEENS5_IS7_EEEEONS_13LaunchOptionsEPi() {
 abort("missing function: _ZN4base9LaunchAppERKNSt3__26vectorINS0_12basic_stringIcNS0_11char_traitsIcEENS0_9allocatorIcEEEENS5_IS7_EEEEONS_13LaunchOptionsEPi");
}

__ZN4base9LaunchAppERKNSt3__26vectorINS0_12basic_stringIcNS0_11char_traitsIcEENS0_9allocatorIcEEEENS5_IS7_EEEEONS_13LaunchOptionsEPi.stub = true;

/** @type {function(...*):?} */ function __ZN7mozilla15GetProcInfoSyncEO8nsTArrayINS_15ProcInfoRequestEE() {
 abort("missing function: _ZN7mozilla15GetProcInfoSyncEO8nsTArrayINS_15ProcInfoRequestEE");
}

__ZN7mozilla15GetProcInfoSyncEO8nsTArrayINS_15ProcInfoRequestEE.stub = true;

/** @type {function(...*):?} */ function __ZN7mozilla15RLBoxSoundTouch10numSamplesEv() {
 abort("missing function: _ZN7mozilla15RLBoxSoundTouch10numSamplesEv");
}

__ZN7mozilla15RLBoxSoundTouch10numSamplesEv.stub = true;

/** @type {function(...*):?} */ function __ZN7mozilla15RLBoxSoundTouch10putSamplesEPKfj() {
 abort("missing function: _ZN7mozilla15RLBoxSoundTouch10putSamplesEPKfj");
}

__ZN7mozilla15RLBoxSoundTouch10putSamplesEPKfj.stub = true;

/** @type {function(...*):?} */ function __ZN7mozilla15RLBoxSoundTouch10setSettingEii() {
 abort("missing function: _ZN7mozilla15RLBoxSoundTouch10setSettingEii");
}

__ZN7mozilla15RLBoxSoundTouch10setSettingEii.stub = true;

/** @type {function(...*):?} */ function __ZN7mozilla15RLBoxSoundTouch11setChannelsEj() {
 abort("missing function: _ZN7mozilla15RLBoxSoundTouch11setChannelsEj");
}

__ZN7mozilla15RLBoxSoundTouch11setChannelsEj.stub = true;

/** @type {function(...*):?} */ function __ZN7mozilla15RLBoxSoundTouch13setSampleRateEj() {
 abort("missing function: _ZN7mozilla15RLBoxSoundTouch13setSampleRateEj");
}

__ZN7mozilla15RLBoxSoundTouch13setSampleRateEj.stub = true;

/** @type {function(...*):?} */ function __ZN7mozilla15RLBoxSoundTouch14receiveSamplesEPfj() {
 abort("missing function: _ZN7mozilla15RLBoxSoundTouch14receiveSamplesEPfj");
}

__ZN7mozilla15RLBoxSoundTouch14receiveSamplesEPfj.stub = true;

/** @type {function(...*):?} */ function __ZN7mozilla15RLBoxSoundTouch21numUnprocessedSamplesEv() {
 abort("missing function: _ZN7mozilla15RLBoxSoundTouch21numUnprocessedSamplesEv");
}

__ZN7mozilla15RLBoxSoundTouch21numUnprocessedSamplesEv.stub = true;

/** @type {function(...*):?} */ function __ZN7mozilla15RLBoxSoundTouch4InitEv() {
 abort("missing function: _ZN7mozilla15RLBoxSoundTouch4InitEv");
}

__ZN7mozilla15RLBoxSoundTouch4InitEv.stub = true;

/** @type {function(...*):?} */ function __ZN7mozilla15RLBoxSoundTouch5flushEv() {
 abort("missing function: _ZN7mozilla15RLBoxSoundTouch5flushEv");
}

__ZN7mozilla15RLBoxSoundTouch5flushEv.stub = true;

/** @type {function(...*):?} */ function __ZN7mozilla15RLBoxSoundTouch7setRateEd() {
 abort("missing function: _ZN7mozilla15RLBoxSoundTouch7setRateEd");
}

__ZN7mozilla15RLBoxSoundTouch7setRateEd.stub = true;

/** @type {function(...*):?} */ function __ZN7mozilla15RLBoxSoundTouch8setPitchEd() {
 abort("missing function: _ZN7mozilla15RLBoxSoundTouch8setPitchEd");
}

__ZN7mozilla15RLBoxSoundTouch8setPitchEd.stub = true;

/** @type {function(...*):?} */ function __ZN7mozilla15RLBoxSoundTouch8setTempoEd() {
 abort("missing function: _ZN7mozilla15RLBoxSoundTouch8setTempoEd");
}

__ZN7mozilla15RLBoxSoundTouch8setTempoEd.stub = true;

/** @type {function(...*):?} */ function __ZN7mozilla15RLBoxSoundTouchC1Ev() {
 abort("missing function: _ZN7mozilla15RLBoxSoundTouchC1Ev");
}

__ZN7mozilla15RLBoxSoundTouchC1Ev.stub = true;

/** @type {function(...*):?} */ function __ZN7mozilla15RLBoxSoundTouchD1Ev() {
 abort("missing function: _ZN7mozilla15RLBoxSoundTouchD1Ev");
}

__ZN7mozilla15RLBoxSoundTouchD1Ev.stub = true;

/** @type {function(...*):?} */ function __ZN7mozilla4a11y30GetCacheDomainsForKnownClientsEy() {
 abort("missing function: _ZN7mozilla4a11y30GetCacheDomainsForKnownClientsEy");
}

__ZN7mozilla4a11y30GetCacheDomainsForKnownClientsEy.stub = true;

/** @type {function(...*):?} */ function __ZN7mozilla6widget27CreateMediaControlKeySourceEv() {
 abort("missing function: _ZN7mozilla6widget27CreateMediaControlKeySourceEv");
}

__ZN7mozilla6widget27CreateMediaControlKeySourceEv.stub = true;

/** @type {function(...*):?} */ function __ZN9nsIWidget17CreateChildWindowEv() {
 abort("missing function: _ZN9nsIWidget17CreateChildWindowEv");
}

__ZN9nsIWidget17CreateChildWindowEv.stub = true;

/** @type {function(...*):?} */ function __ZN9nsIWidget20CreateTopLevelWindowEv() {
 abort("missing function: _ZN9nsIWidget20CreateTopLevelWindowEv");
}

__ZN9nsIWidget20CreateTopLevelWindowEv.stub = true;

/** @type {function(...*):?} */ function __ZN9nsIWidget23CreateBidiKeyboardInnerEv() {
 abort("missing function: _ZN9nsIWidget23CreateBidiKeyboardInnerEv");
}

__ZN9nsIWidget23CreateBidiKeyboardInnerEv.stub = true;

/** @type {function(...*):?} */ function __ZNK16nsBaseFilePicker17GetRelevantGlobalEv() {
 abort("missing function: _ZNK16nsBaseFilePicker17GetRelevantGlobalEv");
}

__ZNK16nsBaseFilePicker17GetRelevantGlobalEv.stub = true;

/** @type {function(...*):?} */ function __ZNK2js12NativeObject15numDynamicSlotsEv() {
 abort("missing function: _ZNK2js12NativeObject15numDynamicSlotsEv");
}

__ZNK2js12NativeObject15numDynamicSlotsEv.stub = true;

var UTF8Decoder = typeof TextDecoder != "undefined" ? new TextDecoder("utf8") : undefined;

/**
     * Given a pointer 'idx' to a null-terminated UTF8-encoded string in the given
     * array that contains uint8 values, returns a copy of that string as a
     * Javascript String object.
     * heapOrArray is either a regular array, or a JavaScript typed array view.
     * @param {number} idx
     * @param {number=} maxBytesToRead
     * @return {string}
     */ var UTF8ArrayToString = (heapOrArray, idx, maxBytesToRead) => {
 idx >>>= 0;
 var endIdx = idx + maxBytesToRead;
 var endPtr = idx;
 while (heapOrArray[endPtr] && !(endPtr >= endIdx)) ++endPtr;
 if (endPtr - idx > 16 && heapOrArray.buffer && UTF8Decoder) {
  return UTF8Decoder.decode(heapOrArray.buffer instanceof SharedArrayBuffer ? heapOrArray.slice(idx, endPtr) : heapOrArray.subarray(idx, endPtr));
 }
 var str = "";
 while (idx < endPtr) {
  var u0 = heapOrArray[idx++];
  if (!(u0 & 128)) {
   str += String.fromCharCode(u0);
   continue;
  }
  var u1 = heapOrArray[idx++] & 63;
  if ((u0 & 224) == 192) {
   str += String.fromCharCode(((u0 & 31) << 6) | u1);
   continue;
  }
  var u2 = heapOrArray[idx++] & 63;
  if ((u0 & 240) == 224) {
   u0 = ((u0 & 15) << 12) | (u1 << 6) | u2;
  } else {
   if ((u0 & 248) != 240) warnOnce("Invalid UTF-8 leading byte " + ptrToString(u0) + " encountered when deserializing a UTF-8 string in wasm memory to a JS string!");
   u0 = ((u0 & 7) << 18) | (u1 << 12) | (u2 << 6) | (heapOrArray[idx++] & 63);
  }
  if (u0 < 65536) {
   str += String.fromCharCode(u0);
  } else {
   var ch = u0 - 65536;
   str += String.fromCharCode(55296 | (ch >> 10), 56320 | (ch & 1023));
  }
 }
 return str;
};

/**
     * Given a pointer 'ptr' to a null-terminated UTF8-encoded string in the
     * emscripten HEAP, returns a copy of that string as a Javascript String object.
     *
     * @param {number} ptr
     * @param {number=} maxBytesToRead - An optional length that specifies the
     *   maximum number of bytes to read. You can omit this parameter to scan the
     *   string until the first 0 byte. If maxBytesToRead is passed, and the string
     *   at [ptr, ptr+maxBytesToReadr[ contains a null byte in the middle, then the
     *   string will cut short at that byte index (i.e. maxBytesToRead will not
     *   produce a string of exact length [ptr, ptr+maxBytesToRead[) N.B. mixing
     *   frequent uses of UTF8ToString() with and without maxBytesToRead may throw
     *   JS JIT optimizations off, so it is worth to consider consistently using one
     * @return {string}
     */ var UTF8ToString = (ptr, maxBytesToRead) => {
 assert(typeof ptr == "number", \`UTF8ToString expects a number (got \${typeof ptr})\`);
 ptr >>>= 0;
 return ptr ? UTF8ArrayToString(GROWABLE_HEAP_U8(), ptr, maxBytesToRead) : "";
};

function ___assert_fail(condition, filename, line, func) {
 condition >>>= 0;
 filename >>>= 0;
 func >>>= 0;
 abort(\`Assertion failed: \${UTF8ToString(condition)}, at: \` + [ filename ? UTF8ToString(filename) : "unknown filename", line, func ? UTF8ToString(func) : "unknown function" ]);
}

function ___call_sighandler(fp, sig) {
 fp >>>= 0;
 return getWasmTableEntry(fp)(sig);
}

function ___emscripten_init_main_thread_js(tb) {
 tb >>>= 0;
 __emscripten_thread_init(tb, /*is_main=*/ !ENVIRONMENT_IS_WORKER, /*is_runtime=*/ 1, /*can_block=*/ !ENVIRONMENT_IS_WEB, /*default_stacksize=*/ 8388608, /*start_profiling=*/ false);
 PThread.threadInitTLS();
}

function ___emscripten_thread_cleanup(thread) {
 thread >>>= 0;
 if (!ENVIRONMENT_IS_PTHREAD) cleanupThread(thread); else postMessage({
  "cmd": "cleanupThread",
  "thread": thread
 });
}

function pthreadCreateProxied(pthread_ptr, attr, startRoutine, arg) {
 if (ENVIRONMENT_IS_PTHREAD) return proxyToMainThread(2, 0, 1, pthread_ptr, attr, startRoutine, arg);
 return ___pthread_create_js(pthread_ptr, attr, startRoutine, arg);
}

function ___pthread_create_js(pthread_ptr, attr, startRoutine, arg) {
 pthread_ptr >>>= 0;
 attr >>>= 0;
 startRoutine >>>= 0;
 arg >>>= 0;
 if (typeof SharedArrayBuffer == "undefined") {
  err("Current environment does not support SharedArrayBuffer, pthreads are not available!");
  return 6;
 }
 var transferList = [];
 var error = 0;
 var transferredCanvasNames = attr ? GROWABLE_HEAP_U32()[(((attr) + (40)) >>> 2) >>> 0] : 0;
 if (transferredCanvasNames == 4294967295) {
  transferredCanvasNames = "#gldummy";
 } else transferredCanvasNames &&= UTF8ToString(transferredCanvasNames).trim();
 transferredCanvasNames &&= transferredCanvasNames.split(",");
 var offscreenCanvases = {};
 var moduleCanvasId = Module["canvas"] ? Module["canvas"].id : "";
 for (var i in transferredCanvasNames) {
  var name = transferredCanvasNames[i].trim();
  var offscreenCanvasInfo;
  try {
   if (name == "#canvas") {
    if (!Module["canvas"]) {
     err(\`pthread_create: could not find canvas with ID "\${name}" to transfer to thread!\`);
     error = 28;
     break;
    }
    name = Module["canvas"].id;
   }
   assert(typeof GL == "object", "OFFSCREENCANVAS_SUPPORT assumes GL is in use (you can force-include it with '-sDEFAULT_LIBRARY_FUNCS_TO_INCLUDE=$GL')");
   if (GL.offscreenCanvases[name]) {
    offscreenCanvasInfo = GL.offscreenCanvases[name];
    GL.offscreenCanvases[name] = null;
    if (Module["canvas"] instanceof OffscreenCanvas && name === Module["canvas"].id) Module["canvas"] = null;
   } else if (!ENVIRONMENT_IS_PTHREAD) {
    var canvas = (Module["canvas"] && Module["canvas"].id === name) ? Module["canvas"] : document.querySelector(name);
    if (!canvas) {
     err(\`pthread_create: could not find canvas with ID "\${name}" to transfer to thread!\`);
     error = 28;
     break;
    }
    if (canvas.controlTransferredOffscreen) {
     err(\`pthread_create: cannot transfer canvas with ID "\${name}" to thread, since the current thread does not have control over it!\`);
     error = 63;
     break;
    }
    if (canvas.transferControlToOffscreen) {
     if (!canvas.canvasSharedPtr) {
      canvas.canvasSharedPtr = _malloc(12);
      GROWABLE_HEAP_I32()[((canvas.canvasSharedPtr) >>> 2) >>> 0] = canvas.width;
      GROWABLE_HEAP_I32()[(((canvas.canvasSharedPtr) + (4)) >>> 2) >>> 0] = canvas.height;
      GROWABLE_HEAP_U32()[(((canvas.canvasSharedPtr) + (8)) >>> 2) >>> 0] = 0;
     }
     offscreenCanvasInfo = {
      offscreenCanvas: canvas.transferControlToOffscreen(),
      canvasSharedPtr: canvas.canvasSharedPtr,
      id: canvas.id
     };
     canvas.controlTransferredOffscreen = true;
    } else {
     err(\`pthread_create: cannot transfer control of canvas "\${name}" to pthread, because current browser does not support OffscreenCanvas!\`);
    }
   }
   if (offscreenCanvasInfo) {
    transferList.push(offscreenCanvasInfo.offscreenCanvas);
    offscreenCanvases[offscreenCanvasInfo.id] = offscreenCanvasInfo;
   }
  } catch (e) {
   err(\`pthread_create: failed to transfer control of canvas "\${name}" to OffscreenCanvas! Error: \${e}\`);
   return 28;
  }
 }
 if (ENVIRONMENT_IS_PTHREAD && (transferList.length === 0 || error)) {
  return pthreadCreateProxied(pthread_ptr, attr, startRoutine, arg);
 }
 if (error) return error;
 for (var canvas of Object.values(offscreenCanvases)) {
  GROWABLE_HEAP_U32()[(((canvas.canvasSharedPtr) + (8)) >>> 2) >>> 0] = pthread_ptr;
 }
 var threadParams = {
  startRoutine: startRoutine,
  pthread_ptr: pthread_ptr,
  arg: arg,
  moduleCanvasId: moduleCanvasId,
  offscreenCanvases: offscreenCanvases,
  transferList: transferList
 };
 if (ENVIRONMENT_IS_PTHREAD) {
  threadParams.cmd = "spawnThread";
  postMessage(threadParams, transferList);
  return 0;
 }
 return spawnThread(threadParams);
}

var PATH = {
 isAbs: path => path.charAt(0) === "/",
 splitPath: filename => {
  var splitPathRe = /^(\\/?|)([\\s\\S]*?)((?:\\.{1,2}|[^\\/]+?|)(\\.[^.\\/]*|))(?:[\\/]*)$/;
  return splitPathRe.exec(filename).slice(1);
 },
 normalizeArray: (parts, allowAboveRoot) => {
  var up = 0;
  for (var i = parts.length - 1; i >= 0; i--) {
   var last = parts[i];
   if (last === ".") {
    parts.splice(i, 1);
   } else if (last === "..") {
    parts.splice(i, 1);
    up++;
   } else if (up) {
    parts.splice(i, 1);
    up--;
   }
  }
  if (allowAboveRoot) {
   for (;up; up--) {
    parts.unshift("..");
   }
  }
  return parts;
 },
 normalize: path => {
  var isAbsolute = PATH.isAbs(path), trailingSlash = path.substr(-1) === "/";
  path = PATH.normalizeArray(path.split("/").filter(p => !!p), !isAbsolute).join("/");
  if (!path && !isAbsolute) {
   path = ".";
  }
  if (path && trailingSlash) {
   path += "/";
  }
  return (isAbsolute ? "/" : "") + path;
 },
 dirname: path => {
  var result = PATH.splitPath(path), root = result[0], dir = result[1];
  if (!root && !dir) {
   return ".";
  }
  if (dir) {
   dir = dir.substr(0, dir.length - 1);
  }
  return root + dir;
 },
 basename: path => {
  if (path === "/") return "/";
  path = PATH.normalize(path);
  path = path.replace(/\\/$/, "");
  var lastSlash = path.lastIndexOf("/");
  if (lastSlash === -1) return path;
  return path.substr(lastSlash + 1);
 },
 join: (...paths) => PATH.normalize(paths.join("/")),
 join2: (l, r) => PATH.normalize(l + "/" + r)
};

var initRandomFill = () => {
 if (typeof crypto == "object" && typeof crypto["getRandomValues"] == "function") {
  return view => (view.set(crypto.getRandomValues(new Uint8Array(view.byteLength))), 
  view);
 } else abort("no cryptographic support found for randomDevice. consider polyfilling it if you want to use something insecure like Math.random(), e.g. put this in a --pre-js: var crypto = { getRandomValues: (array) => { for (var i = 0; i < array.length; i++) array[i] = (Math.random()*256)|0 } };");
};

var randomFill = view => (randomFill = initRandomFill())(view);

var PATH_FS = {
 resolve: (...args) => {
  var resolvedPath = "", resolvedAbsolute = false;
  for (var i = args.length - 1; i >= -1 && !resolvedAbsolute; i--) {
   var path = (i >= 0) ? args[i] : FS.cwd();
   if (typeof path != "string") {
    throw new TypeError("Arguments to path.resolve must be strings");
   } else if (!path) {
    return "";
   }
   resolvedPath = path + "/" + resolvedPath;
   resolvedAbsolute = PATH.isAbs(path);
  }
  resolvedPath = PATH.normalizeArray(resolvedPath.split("/").filter(p => !!p), !resolvedAbsolute).join("/");
  return ((resolvedAbsolute ? "/" : "") + resolvedPath) || ".";
 },
 relative: (from, to) => {
  from = PATH_FS.resolve(from).substr(1);
  to = PATH_FS.resolve(to).substr(1);
  function trim(arr) {
   var start = 0;
   for (;start < arr.length; start++) {
    if (arr[start] !== "") break;
   }
   var end = arr.length - 1;
   for (;end >= 0; end--) {
    if (arr[end] !== "") break;
   }
   if (start > end) return [];
   return arr.slice(start, end - start + 1);
  }
  var fromParts = trim(from.split("/"));
  var toParts = trim(to.split("/"));
  var length = Math.min(fromParts.length, toParts.length);
  var samePartsLength = length;
  for (var i = 0; i < length; i++) {
   if (fromParts[i] !== toParts[i]) {
    samePartsLength = i;
    break;
   }
  }
  var outputParts = [];
  for (var i = samePartsLength; i < fromParts.length; i++) {
   outputParts.push("..");
  }
  outputParts = outputParts.concat(toParts.slice(samePartsLength));
  return outputParts.join("/");
 }
};

var FS_stdin_getChar_buffer = [];

var lengthBytesUTF8 = str => {
 var len = 0;
 for (var i = 0; i < str.length; ++i) {
  var c = str.charCodeAt(i);
  if (c <= 127) {
   len++;
  } else if (c <= 2047) {
   len += 2;
  } else if (c >= 55296 && c <= 57343) {
   len += 4;
   ++i;
  } else {
   len += 3;
  }
 }
 return len;
};

var stringToUTF8Array = (str, heap, outIdx, maxBytesToWrite) => {
 outIdx >>>= 0;
 assert(typeof str === "string", \`stringToUTF8Array expects a string (got \${typeof str})\`);
 if (!(maxBytesToWrite > 0)) return 0;
 var startIdx = outIdx;
 var endIdx = outIdx + maxBytesToWrite - 1;
 for (var i = 0; i < str.length; ++i) {
  var u = str.charCodeAt(i);
  if (u >= 55296 && u <= 57343) {
   var u1 = str.charCodeAt(++i);
   u = 65536 + ((u & 1023) << 10) | (u1 & 1023);
  }
  if (u <= 127) {
   if (outIdx >= endIdx) break;
   heap[outIdx++ >>> 0] = u;
  } else if (u <= 2047) {
   if (outIdx + 1 >= endIdx) break;
   heap[outIdx++ >>> 0] = 192 | (u >> 6);
   heap[outIdx++ >>> 0] = 128 | (u & 63);
  } else if (u <= 65535) {
   if (outIdx + 2 >= endIdx) break;
   heap[outIdx++ >>> 0] = 224 | (u >> 12);
   heap[outIdx++ >>> 0] = 128 | ((u >> 6) & 63);
   heap[outIdx++ >>> 0] = 128 | (u & 63);
  } else {
   if (outIdx + 3 >= endIdx) break;
   if (u > 1114111) warnOnce("Invalid Unicode code point " + ptrToString(u) + " encountered when serializing a JS string to a UTF-8 string in wasm memory! (Valid unicode code points should be in range 0-0x10FFFF).");
   heap[outIdx++ >>> 0] = 240 | (u >> 18);
   heap[outIdx++ >>> 0] = 128 | ((u >> 12) & 63);
   heap[outIdx++ >>> 0] = 128 | ((u >> 6) & 63);
   heap[outIdx++ >>> 0] = 128 | (u & 63);
  }
 }
 heap[outIdx >>> 0] = 0;
 return outIdx - startIdx;
};

/** @type {function(string, boolean=, number=)} */ function intArrayFromString(stringy, dontAddNull, length) {
 var len = length > 0 ? length : lengthBytesUTF8(stringy) + 1;
 var u8array = new Array(len);
 var numBytesWritten = stringToUTF8Array(stringy, u8array, 0, u8array.length);
 if (dontAddNull) u8array.length = numBytesWritten;
 return u8array;
}

var FS_stdin_getChar = () => {
 if (!FS_stdin_getChar_buffer.length) {
  var result = null;
  if (typeof window != "undefined" && typeof window.prompt == "function") {
   result = window.prompt("Input: ");
   if (result !== null) {
    result += "\\n";
   }
  } else if (typeof readline == "function") {
   result = readline();
   if (result !== null) {
    result += "\\n";
   }
  }
  if (!result) {
   return null;
  }
  FS_stdin_getChar_buffer = intArrayFromString(result, true);
 }
 return FS_stdin_getChar_buffer.shift();
};

var TTY = {
 ttys: [],
 init() {},
 shutdown() {},
 register(dev, ops) {
  TTY.ttys[dev] = {
   input: [],
   output: [],
   ops: ops
  };
  FS.registerDevice(dev, TTY.stream_ops);
 },
 stream_ops: {
  open(stream) {
   var tty = TTY.ttys[stream.node.rdev];
   if (!tty) {
    throw new FS.ErrnoError(43);
   }
   stream.tty = tty;
   stream.seekable = false;
  },
  close(stream) {
   stream.tty.ops.fsync(stream.tty);
  },
  fsync(stream) {
   stream.tty.ops.fsync(stream.tty);
  },
  read(stream, buffer, offset, length, pos) {
   /* ignored */ if (!stream.tty || !stream.tty.ops.get_char) {
    throw new FS.ErrnoError(60);
   }
   var bytesRead = 0;
   for (var i = 0; i < length; i++) {
    var result;
    try {
     result = stream.tty.ops.get_char(stream.tty);
    } catch (e) {
     throw new FS.ErrnoError(29);
    }
    if (result === undefined && bytesRead === 0) {
     throw new FS.ErrnoError(6);
    }
    if (result === null || result === undefined) break;
    bytesRead++;
    buffer[offset + i] = result;
   }
   if (bytesRead) {
    stream.node.timestamp = Date.now();
   }
   return bytesRead;
  },
  write(stream, buffer, offset, length, pos) {
   if (!stream.tty || !stream.tty.ops.put_char) {
    throw new FS.ErrnoError(60);
   }
   try {
    for (var i = 0; i < length; i++) {
     stream.tty.ops.put_char(stream.tty, buffer[offset + i]);
    }
   } catch (e) {
    throw new FS.ErrnoError(29);
   }
   if (length) {
    stream.node.timestamp = Date.now();
   }
   return i;
  }
 },
 default_tty_ops: {
  get_char(tty) {
   return FS_stdin_getChar();
  },
  put_char(tty, val) {
   if (val === null || val === 10) {
    out(UTF8ArrayToString(tty.output, 0));
    tty.output = [];
   } else {
    if (val != 0) tty.output.push(val);
   }
  },
  fsync(tty) {
   if (tty.output && tty.output.length > 0) {
    out(UTF8ArrayToString(tty.output, 0));
    tty.output = [];
   }
  },
  ioctl_tcgets(tty) {
   return {
    c_iflag: 25856,
    c_oflag: 5,
    c_cflag: 191,
    c_lflag: 35387,
    c_cc: [ 3, 28, 127, 21, 4, 0, 1, 0, 17, 19, 26, 0, 18, 15, 23, 22, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0 ]
   };
  },
  ioctl_tcsets(tty, optional_actions, data) {
   return 0;
  },
  ioctl_tiocgwinsz(tty) {
   return [ 24, 80 ];
  }
 },
 default_tty1_ops: {
  put_char(tty, val) {
   if (val === null || val === 10) {
    err(UTF8ArrayToString(tty.output, 0));
    tty.output = [];
   } else {
    if (val != 0) tty.output.push(val);
   }
  },
  fsync(tty) {
   if (tty.output && tty.output.length > 0) {
    err(UTF8ArrayToString(tty.output, 0));
    tty.output = [];
   }
  }
 }
};

var alignMemory = (size, alignment) => {
 assert(alignment, "alignment argument is required");
 return Math.ceil(size / alignment) * alignment;
};

var mmapAlloc = size => {
 size = alignMemory(size, 65536);
 var ptr = _emscripten_builtin_memalign(65536, size);
 if (!ptr) return 0;
 return zeroMemory(ptr, size);
};

var MEMFS = {
 ops_table: null,
 mount(mount) {
  return MEMFS.createNode(null, "/", 16384 | 511, /* 0777 */ 0);
 },
 createNode(parent, name, mode, dev) {
  if (FS.isBlkdev(mode) || FS.isFIFO(mode)) {
   throw new FS.ErrnoError(63);
  }
  MEMFS.ops_table ||= {
   dir: {
    node: {
     getattr: MEMFS.node_ops.getattr,
     setattr: MEMFS.node_ops.setattr,
     lookup: MEMFS.node_ops.lookup,
     mknod: MEMFS.node_ops.mknod,
     rename: MEMFS.node_ops.rename,
     unlink: MEMFS.node_ops.unlink,
     rmdir: MEMFS.node_ops.rmdir,
     readdir: MEMFS.node_ops.readdir,
     symlink: MEMFS.node_ops.symlink
    },
    stream: {
     llseek: MEMFS.stream_ops.llseek
    }
   },
   file: {
    node: {
     getattr: MEMFS.node_ops.getattr,
     setattr: MEMFS.node_ops.setattr
    },
    stream: {
     llseek: MEMFS.stream_ops.llseek,
     read: MEMFS.stream_ops.read,
     write: MEMFS.stream_ops.write,
     allocate: MEMFS.stream_ops.allocate,
     mmap: MEMFS.stream_ops.mmap,
     msync: MEMFS.stream_ops.msync
    }
   },
   link: {
    node: {
     getattr: MEMFS.node_ops.getattr,
     setattr: MEMFS.node_ops.setattr,
     readlink: MEMFS.node_ops.readlink
    },
    stream: {}
   },
   chrdev: {
    node: {
     getattr: MEMFS.node_ops.getattr,
     setattr: MEMFS.node_ops.setattr
    },
    stream: FS.chrdev_stream_ops
   }
  };
  var node = FS.createNode(parent, name, mode, dev);
  if (FS.isDir(node.mode)) {
   node.node_ops = MEMFS.ops_table.dir.node;
   node.stream_ops = MEMFS.ops_table.dir.stream;
   node.contents = {};
  } else if (FS.isFile(node.mode)) {
   node.node_ops = MEMFS.ops_table.file.node;
   node.stream_ops = MEMFS.ops_table.file.stream;
   node.usedBytes = 0;
   node.contents = null;
  } else if (FS.isLink(node.mode)) {
   node.node_ops = MEMFS.ops_table.link.node;
   node.stream_ops = MEMFS.ops_table.link.stream;
  } else if (FS.isChrdev(node.mode)) {
   node.node_ops = MEMFS.ops_table.chrdev.node;
   node.stream_ops = MEMFS.ops_table.chrdev.stream;
  }
  node.timestamp = Date.now();
  if (parent) {
   parent.contents[name] = node;
   parent.timestamp = node.timestamp;
  }
  return node;
 },
 getFileDataAsTypedArray(node) {
  if (!node.contents) return new Uint8Array(0);
  if (node.contents.subarray) return node.contents.subarray(0, node.usedBytes);
  return new Uint8Array(node.contents);
 },
 expandFileStorage(node, newCapacity) {
  var prevCapacity = node.contents ? node.contents.length : 0;
  if (prevCapacity >= newCapacity) return;
  var CAPACITY_DOUBLING_MAX = 1024 * 1024;
  newCapacity = Math.max(newCapacity, (prevCapacity * (prevCapacity < CAPACITY_DOUBLING_MAX ? 2 : 1.125)) >>> 0);
  if (prevCapacity != 0) newCapacity = Math.max(newCapacity, 256);
  var oldContents = node.contents;
  node.contents = new Uint8Array(newCapacity);
  if (node.usedBytes > 0) node.contents.set(oldContents.subarray(0, node.usedBytes), 0);
 },
 resizeFileStorage(node, newSize) {
  if (node.usedBytes == newSize) return;
  if (newSize == 0) {
   node.contents = null;
   node.usedBytes = 0;
  } else {
   var oldContents = node.contents;
   node.contents = new Uint8Array(newSize);
   if (oldContents) {
    node.contents.set(oldContents.subarray(0, Math.min(newSize, node.usedBytes)));
   }
   node.usedBytes = newSize;
  }
 },
 node_ops: {
  getattr(node) {
   var attr = {};
   attr.dev = FS.isChrdev(node.mode) ? node.id : 1;
   attr.ino = node.id;
   attr.mode = node.mode;
   attr.nlink = 1;
   attr.uid = 0;
   attr.gid = 0;
   attr.rdev = node.rdev;
   if (FS.isDir(node.mode)) {
    attr.size = 4096;
   } else if (FS.isFile(node.mode)) {
    attr.size = node.usedBytes;
   } else if (FS.isLink(node.mode)) {
    attr.size = node.link.length;
   } else {
    attr.size = 0;
   }
   attr.atime = new Date(node.timestamp);
   attr.mtime = new Date(node.timestamp);
   attr.ctime = new Date(node.timestamp);
   attr.blksize = 4096;
   attr.blocks = Math.ceil(attr.size / attr.blksize);
   return attr;
  },
  setattr(node, attr) {
   if (attr.mode !== undefined) {
    node.mode = attr.mode;
   }
   if (attr.timestamp !== undefined) {
    node.timestamp = attr.timestamp;
   }
   if (attr.size !== undefined) {
    MEMFS.resizeFileStorage(node, attr.size);
   }
  },
  lookup(parent, name) {
   throw FS.genericErrors[44];
  },
  mknod(parent, name, mode, dev) {
   return MEMFS.createNode(parent, name, mode, dev);
  },
  rename(old_node, new_dir, new_name) {
   if (FS.isDir(old_node.mode)) {
    var new_node;
    try {
     new_node = FS.lookupNode(new_dir, new_name);
    } catch (e) {}
    if (new_node) {
     for (var i in new_node.contents) {
      throw new FS.ErrnoError(55);
     }
    }
   }
   delete old_node.parent.contents[old_node.name];
   old_node.parent.timestamp = Date.now();
   old_node.name = new_name;
   new_dir.contents[new_name] = old_node;
   new_dir.timestamp = old_node.parent.timestamp;
   old_node.parent = new_dir;
  },
  unlink(parent, name) {
   delete parent.contents[name];
   parent.timestamp = Date.now();
  },
  rmdir(parent, name) {
   var node = FS.lookupNode(parent, name);
   for (var i in node.contents) {
    throw new FS.ErrnoError(55);
   }
   delete parent.contents[name];
   parent.timestamp = Date.now();
  },
  readdir(node) {
   var entries = [ ".", ".." ];
   for (var key of Object.keys(node.contents)) {
    entries.push(key);
   }
   return entries;
  },
  symlink(parent, newname, oldpath) {
   var node = MEMFS.createNode(parent, newname, 511 | /* 0777 */ 40960, 0);
   node.link = oldpath;
   return node;
  },
  readlink(node) {
   if (!FS.isLink(node.mode)) {
    throw new FS.ErrnoError(28);
   }
   return node.link;
  }
 },
 stream_ops: {
  read(stream, buffer, offset, length, position) {
   var contents = stream.node.contents;
   if (position >= stream.node.usedBytes) return 0;
   var size = Math.min(stream.node.usedBytes - position, length);
   assert(size >= 0);
   if (size > 8 && contents.subarray) {
    buffer.set(contents.subarray(position, position + size), offset);
   } else {
    for (var i = 0; i < size; i++) buffer[offset + i] = contents[position + i];
   }
   return size;
  },
  write(stream, buffer, offset, length, position, canOwn) {
   assert(!(buffer instanceof ArrayBuffer));
   if (buffer.buffer === GROWABLE_HEAP_I8().buffer) {
    canOwn = false;
   }
   if (!length) return 0;
   var node = stream.node;
   node.timestamp = Date.now();
   if (buffer.subarray && (!node.contents || node.contents.subarray)) {
    if (canOwn) {
     assert(position === 0, "canOwn must imply no weird position inside the file");
     node.contents = buffer.subarray(offset, offset + length);
     node.usedBytes = length;
     return length;
    } else if (node.usedBytes === 0 && position === 0) {
     node.contents = buffer.slice(offset, offset + length);
     node.usedBytes = length;
     return length;
    } else if (position + length <= node.usedBytes) {
     node.contents.set(buffer.subarray(offset, offset + length), position);
     return length;
    }
   }
   MEMFS.expandFileStorage(node, position + length);
   if (node.contents.subarray && buffer.subarray) {
    node.contents.set(buffer.subarray(offset, offset + length), position);
   } else {
    for (var i = 0; i < length; i++) {
     node.contents[position + i] = buffer[offset + i];
    }
   }
   node.usedBytes = Math.max(node.usedBytes, position + length);
   return length;
  },
  llseek(stream, offset, whence) {
   var position = offset;
   if (whence === 1) {
    position += stream.position;
   } else if (whence === 2) {
    if (FS.isFile(stream.node.mode)) {
     position += stream.node.usedBytes;
    }
   }
   if (position < 0) {
    throw new FS.ErrnoError(28);
   }
   return position;
  },
  allocate(stream, offset, length) {
   MEMFS.expandFileStorage(stream.node, offset + length);
   stream.node.usedBytes = Math.max(stream.node.usedBytes, offset + length);
  },
  mmap(stream, length, position, prot, flags) {
   if (!FS.isFile(stream.node.mode)) {
    throw new FS.ErrnoError(43);
   }
   var ptr;
   var allocated;
   var contents = stream.node.contents;
   if (!(flags & 2) && contents.buffer === GROWABLE_HEAP_I8().buffer) {
    allocated = false;
    ptr = contents.byteOffset;
   } else {
    if (position > 0 || position + length < contents.length) {
     if (contents.subarray) {
      contents = contents.subarray(position, position + length);
     } else {
      contents = Array.prototype.slice.call(contents, position, position + length);
     }
    }
    allocated = true;
    ptr = mmapAlloc(length);
    if (!ptr) {
     throw new FS.ErrnoError(48);
    }
    GROWABLE_HEAP_I8().set(contents, ptr >>> 0);
   }
   return {
    ptr: ptr,
    allocated: allocated
   };
  },
  msync(stream, buffer, offset, length, mmapFlags) {
   MEMFS.stream_ops.write(stream, buffer, 0, length, offset, false);
   return 0;
  }
 }
};

/** @param {boolean=} noRunDep */ var asyncLoad = (url, onload, onerror, noRunDep) => {
 var dep = !noRunDep ? getUniqueRunDependency(\`al \${url}\`) : "";
 readAsync(url, arrayBuffer => {
  assert(arrayBuffer, \`Loading data file "\${url}" failed (no arrayBuffer).\`);
  onload(new Uint8Array(arrayBuffer));
  if (dep) removeRunDependency(dep);
 }, event => {
  if (onerror) {
   onerror();
  } else {
   throw \`Loading data file "\${url}" failed.\`;
  }
 });
 if (dep) addRunDependency(dep);
};

var FS_createDataFile = (parent, name, fileData, canRead, canWrite, canOwn) => {
 FS.createDataFile(parent, name, fileData, canRead, canWrite, canOwn);
};

var preloadPlugins = Module["preloadPlugins"] || [];

var FS_handledByPreloadPlugin = (byteArray, fullname, finish, onerror) => {
 if (typeof Browser != "undefined") Browser.init();
 var handled = false;
 preloadPlugins.forEach(plugin => {
  if (handled) return;
  if (plugin["canHandle"](fullname)) {
   plugin["handle"](byteArray, fullname, finish, onerror);
   handled = true;
  }
 });
 return handled;
};

var FS_createPreloadedFile = (parent, name, url, canRead, canWrite, onload, onerror, dontCreateFile, canOwn, preFinish) => {
 var fullname = name ? PATH_FS.resolve(PATH.join2(parent, name)) : parent;
 var dep = getUniqueRunDependency(\`cp \${fullname}\`);
 function processData(byteArray) {
  function finish(byteArray) {
   preFinish?.();
   if (!dontCreateFile) {
    FS_createDataFile(parent, name, byteArray, canRead, canWrite, canOwn);
   }
   onload?.();
   removeRunDependency(dep);
  }
  if (FS_handledByPreloadPlugin(byteArray, fullname, finish, () => {
   onerror?.();
   removeRunDependency(dep);
  })) {
   return;
  }
  finish(byteArray);
 }
 addRunDependency(dep);
 if (typeof url == "string") {
  asyncLoad(url, processData, onerror);
 } else {
  processData(url);
 }
};

var FS_modeStringToFlags = str => {
 var flagModes = {
  "r": 0,
  "r+": 2,
  "w": 512 | 64 | 1,
  "w+": 512 | 64 | 2,
  "a": 1024 | 64 | 1,
  "a+": 1024 | 64 | 2
 };
 var flags = flagModes[str];
 if (typeof flags == "undefined") {
  throw new Error(\`Unknown file open mode: \${str}\`);
 }
 return flags;
};

var FS_getMode = (canRead, canWrite) => {
 var mode = 0;
 if (canRead) mode |= 292 | 73;
 if (canWrite) mode |= 146;
 return mode;
};

var IDBFS = {
 dbs: {},
 indexedDB: () => {
  if (typeof indexedDB != "undefined") return indexedDB;
  var ret = null;
  if (typeof window == "object") ret = window.indexedDB || window.mozIndexedDB || window.webkitIndexedDB || window.msIndexedDB;
  assert(ret, "IDBFS used, but indexedDB not supported");
  return ret;
 },
 DB_VERSION: 21,
 DB_STORE_NAME: "FILE_DATA",
 mount: (...args) => MEMFS.mount(...args),
 syncfs: (mount, populate, callback) => {
  IDBFS.getLocalSet(mount, (err, local) => {
   if (err) return callback(err);
   IDBFS.getRemoteSet(mount, (err, remote) => {
    if (err) return callback(err);
    var src = populate ? remote : local;
    var dst = populate ? local : remote;
    IDBFS.reconcile(src, dst, callback);
   });
  });
 },
 quit: () => {
  Object.values(IDBFS.dbs).forEach(value => value.close());
  IDBFS.dbs = {};
 },
 getDB: (name, callback) => {
  var db = IDBFS.dbs[name];
  if (db) {
   return callback(null, db);
  }
  var req;
  try {
   req = IDBFS.indexedDB().open(name, IDBFS.DB_VERSION);
  } catch (e) {
   return callback(e);
  }
  if (!req) {
   return callback("Unable to connect to IndexedDB");
  }
  req.onupgradeneeded = e => {
   var db = /** @type {IDBDatabase} */ (e.target.result);
   var transaction = e.target.transaction;
   var fileStore;
   if (db.objectStoreNames.contains(IDBFS.DB_STORE_NAME)) {
    fileStore = transaction.objectStore(IDBFS.DB_STORE_NAME);
   } else {
    fileStore = db.createObjectStore(IDBFS.DB_STORE_NAME);
   }
   if (!fileStore.indexNames.contains("timestamp")) {
    fileStore.createIndex("timestamp", "timestamp", {
     unique: false
    });
   }
  };
  req.onsuccess = () => {
   db = /** @type {IDBDatabase} */ (req.result);
   IDBFS.dbs[name] = db;
   callback(null, db);
  };
  req.onerror = e => {
   callback(e.target.error);
   e.preventDefault();
  };
 },
 getLocalSet: (mount, callback) => {
  var entries = {};
  function isRealDir(p) {
   return p !== "." && p !== "..";
  }
  function toAbsolute(root) {
   return p => PATH.join2(root, p);
  }
  var check = FS.readdir(mount.mountpoint).filter(isRealDir).map(toAbsolute(mount.mountpoint));
  while (check.length) {
   var path = check.pop();
   var stat;
   try {
    stat = FS.stat(path);
   } catch (e) {
    return callback(e);
   }
   if (FS.isDir(stat.mode)) {
    check.push(...FS.readdir(path).filter(isRealDir).map(toAbsolute(path)));
   }
   entries[path] = {
    "timestamp": stat.mtime
   };
  }
  return callback(null, {
   type: "local",
   entries: entries
  });
 },
 getRemoteSet: (mount, callback) => {
  var entries = {};
  IDBFS.getDB(mount.mountpoint, (err, db) => {
   if (err) return callback(err);
   try {
    var transaction = db.transaction([ IDBFS.DB_STORE_NAME ], "readonly");
    transaction.onerror = e => {
     callback(e.target.error);
     e.preventDefault();
    };
    var store = transaction.objectStore(IDBFS.DB_STORE_NAME);
    var index = store.index("timestamp");
    index.openKeyCursor().onsuccess = event => {
     var cursor = event.target.result;
     if (!cursor) {
      return callback(null, {
       type: "remote",
       db: db,
       entries: entries
      });
     }
     entries[cursor.primaryKey] = {
      "timestamp": cursor.key
     };
     cursor.continue();
    };
   } catch (e) {
    return callback(e);
   }
  });
 },
 loadLocalEntry: (path, callback) => {
  var stat, node;
  try {
   var lookup = FS.lookupPath(path);
   node = lookup.node;
   stat = FS.stat(path);
  } catch (e) {
   return callback(e);
  }
  if (FS.isDir(stat.mode)) {
   return callback(null, {
    "timestamp": stat.mtime,
    "mode": stat.mode
   });
  } else if (FS.isFile(stat.mode)) {
   node.contents = MEMFS.getFileDataAsTypedArray(node);
   return callback(null, {
    "timestamp": stat.mtime,
    "mode": stat.mode,
    "contents": node.contents
   });
  } else {
   return callback(new Error("node type not supported"));
  }
 },
 storeLocalEntry: (path, entry, callback) => {
  try {
   if (FS.isDir(entry["mode"])) {
    FS.mkdirTree(path, entry["mode"]);
   } else if (FS.isFile(entry["mode"])) {
    FS.writeFile(path, entry["contents"], {
     canOwn: true
    });
   } else {
    return callback(new Error("node type not supported"));
   }
   FS.chmod(path, entry["mode"]);
   FS.utime(path, entry["timestamp"], entry["timestamp"]);
  } catch (e) {
   return callback(e);
  }
  callback(null);
 },
 removeLocalEntry: (path, callback) => {
  try {
   var stat = FS.stat(path);
   if (FS.isDir(stat.mode)) {
    FS.rmdir(path);
   } else if (FS.isFile(stat.mode)) {
    FS.unlink(path);
   }
  } catch (e) {
   return callback(e);
  }
  callback(null);
 },
 loadRemoteEntry: (store, path, callback) => {
  var req = store.get(path);
  req.onsuccess = event => callback(null, event.target.result);
  req.onerror = e => {
   callback(e.target.error);
   e.preventDefault();
  };
 },
 storeRemoteEntry: (store, path, entry, callback) => {
  try {
   var req = store.put(entry, path);
  } catch (e) {
   callback(e);
   return;
  }
  req.onsuccess = event => callback();
  req.onerror = e => {
   callback(e.target.error);
   e.preventDefault();
  };
 },
 removeRemoteEntry: (store, path, callback) => {
  var req = store.delete(path);
  req.onsuccess = event => callback();
  req.onerror = e => {
   callback(e.target.error);
   e.preventDefault();
  };
 },
 reconcile: (src, dst, callback) => {
  var total = 0;
  var create = [];
  Object.keys(src.entries).forEach(function(key) {
   var e = src.entries[key];
   var e2 = dst.entries[key];
   if (!e2 || e["timestamp"].getTime() != e2["timestamp"].getTime()) {
    create.push(key);
    total++;
   }
  });
  var remove = [];
  Object.keys(dst.entries).forEach(function(key) {
   if (!src.entries[key]) {
    remove.push(key);
    total++;
   }
  });
  if (!total) {
   return callback(null);
  }
  var errored = false;
  var db = src.type === "remote" ? src.db : dst.db;
  var transaction = db.transaction([ IDBFS.DB_STORE_NAME ], "readwrite");
  var store = transaction.objectStore(IDBFS.DB_STORE_NAME);
  function done(err) {
   if (err && !errored) {
    errored = true;
    return callback(err);
   }
  }
  transaction.onerror = transaction.onabort = e => {
   done(e.target.error);
   e.preventDefault();
  };
  transaction.oncomplete = e => {
   if (!errored) {
    callback(null);
   }
  };
  create.sort().forEach(path => {
   if (dst.type === "local") {
    IDBFS.loadRemoteEntry(store, path, (err, entry) => {
     if (err) return done(err);
     IDBFS.storeLocalEntry(path, entry, done);
    });
   } else {
    IDBFS.loadLocalEntry(path, (err, entry) => {
     if (err) return done(err);
     IDBFS.storeRemoteEntry(store, path, entry, done);
    });
   }
  });
  remove.sort().reverse().forEach(path => {
   if (dst.type === "local") {
    IDBFS.removeLocalEntry(path, done);
   } else {
    IDBFS.removeRemoteEntry(store, path, done);
   }
  });
 }
};

var ERRNO_MESSAGES = {
 0: "Success",
 1: "Arg list too long",
 2: "Permission denied",
 3: "Address already in use",
 4: "Address not available",
 5: "Address family not supported by protocol family",
 6: "No more processes",
 7: "Socket already connected",
 8: "Bad file number",
 9: "Trying to read unreadable message",
 10: "Mount device busy",
 11: "Operation canceled",
 12: "No children",
 13: "Connection aborted",
 14: "Connection refused",
 15: "Connection reset by peer",
 16: "File locking deadlock error",
 17: "Destination address required",
 18: "Math arg out of domain of func",
 19: "Quota exceeded",
 20: "File exists",
 21: "Bad address",
 22: "File too large",
 23: "Host is unreachable",
 24: "Identifier removed",
 25: "Illegal byte sequence",
 26: "Connection already in progress",
 27: "Interrupted system call",
 28: "Invalid argument",
 29: "I/O error",
 30: "Socket is already connected",
 31: "Is a directory",
 32: "Too many symbolic links",
 33: "Too many open files",
 34: "Too many links",
 35: "Message too long",
 36: "Multihop attempted",
 37: "File or path name too long",
 38: "Network interface is not configured",
 39: "Connection reset by network",
 40: "Network is unreachable",
 41: "Too many open files in system",
 42: "No buffer space available",
 43: "No such device",
 44: "No such file or directory",
 45: "Exec format error",
 46: "No record locks available",
 47: "The link has been severed",
 48: "Not enough core",
 49: "No message of desired type",
 50: "Protocol not available",
 51: "No space left on device",
 52: "Function not implemented",
 53: "Socket is not connected",
 54: "Not a directory",
 55: "Directory not empty",
 56: "State not recoverable",
 57: "Socket operation on non-socket",
 59: "Not a typewriter",
 60: "No such device or address",
 61: "Value too large for defined data type",
 62: "Previous owner died",
 63: "Not super-user",
 64: "Broken pipe",
 65: "Protocol error",
 66: "Unknown protocol",
 67: "Protocol wrong type for socket",
 68: "Math result not representable",
 69: "Read only file system",
 70: "Illegal seek",
 71: "No such process",
 72: "Stale file handle",
 73: "Connection timed out",
 74: "Text file busy",
 75: "Cross-device link",
 100: "Device not a stream",
 101: "Bad font file fmt",
 102: "Invalid slot",
 103: "Invalid request code",
 104: "No anode",
 105: "Block device required",
 106: "Channel number out of range",
 107: "Level 3 halted",
 108: "Level 3 reset",
 109: "Link number out of range",
 110: "Protocol driver not attached",
 111: "No CSI structure available",
 112: "Level 2 halted",
 113: "Invalid exchange",
 114: "Invalid request descriptor",
 115: "Exchange full",
 116: "No data (for no delay io)",
 117: "Timer expired",
 118: "Out of streams resources",
 119: "Machine is not on the network",
 120: "Package not installed",
 121: "The object is remote",
 122: "Advertise error",
 123: "Srmount error",
 124: "Communication error on send",
 125: "Cross mount point (not really error)",
 126: "Given log. name not unique",
 127: "f.d. invalid for this operation",
 128: "Remote address changed",
 129: "Can   access a needed shared lib",
 130: "Accessing a corrupted shared lib",
 131: ".lib section in a.out corrupted",
 132: "Attempting to link in too many libs",
 133: "Attempting to exec a shared library",
 135: "Streams pipe error",
 136: "Too many users",
 137: "Socket type not supported",
 138: "Not supported",
 139: "Protocol family not supported",
 140: "Can't send after socket shutdown",
 141: "Too many references",
 142: "Host is down",
 148: "No medium (in tape drive)",
 156: "Level 2 not synchronized"
};

var ERRNO_CODES = {
 "EPERM": 63,
 "ENOENT": 44,
 "ESRCH": 71,
 "EINTR": 27,
 "EIO": 29,
 "ENXIO": 60,
 "E2BIG": 1,
 "ENOEXEC": 45,
 "EBADF": 8,
 "ECHILD": 12,
 "EAGAIN": 6,
 "EWOULDBLOCK": 6,
 "ENOMEM": 48,
 "EACCES": 2,
 "EFAULT": 21,
 "ENOTBLK": 105,
 "EBUSY": 10,
 "EEXIST": 20,
 "EXDEV": 75,
 "ENODEV": 43,
 "ENOTDIR": 54,
 "EISDIR": 31,
 "EINVAL": 28,
 "ENFILE": 41,
 "EMFILE": 33,
 "ENOTTY": 59,
 "ETXTBSY": 74,
 "EFBIG": 22,
 "ENOSPC": 51,
 "ESPIPE": 70,
 "EROFS": 69,
 "EMLINK": 34,
 "EPIPE": 64,
 "EDOM": 18,
 "ERANGE": 68,
 "ENOMSG": 49,
 "EIDRM": 24,
 "ECHRNG": 106,
 "EL2NSYNC": 156,
 "EL3HLT": 107,
 "EL3RST": 108,
 "ELNRNG": 109,
 "EUNATCH": 110,
 "ENOCSI": 111,
 "EL2HLT": 112,
 "EDEADLK": 16,
 "ENOLCK": 46,
 "EBADE": 113,
 "EBADR": 114,
 "EXFULL": 115,
 "ENOANO": 104,
 "EBADRQC": 103,
 "EBADSLT": 102,
 "EDEADLOCK": 16,
 "EBFONT": 101,
 "ENOSTR": 100,
 "ENODATA": 116,
 "ETIME": 117,
 "ENOSR": 118,
 "ENONET": 119,
 "ENOPKG": 120,
 "EREMOTE": 121,
 "ENOLINK": 47,
 "EADV": 122,
 "ESRMNT": 123,
 "ECOMM": 124,
 "EPROTO": 65,
 "EMULTIHOP": 36,
 "EDOTDOT": 125,
 "EBADMSG": 9,
 "ENOTUNIQ": 126,
 "EBADFD": 127,
 "EREMCHG": 128,
 "ELIBACC": 129,
 "ELIBBAD": 130,
 "ELIBSCN": 131,
 "ELIBMAX": 132,
 "ELIBEXEC": 133,
 "ENOSYS": 52,
 "ENOTEMPTY": 55,
 "ENAMETOOLONG": 37,
 "ELOOP": 32,
 "EOPNOTSUPP": 138,
 "EPFNOSUPPORT": 139,
 "ECONNRESET": 15,
 "ENOBUFS": 42,
 "EAFNOSUPPORT": 5,
 "EPROTOTYPE": 67,
 "ENOTSOCK": 57,
 "ENOPROTOOPT": 50,
 "ESHUTDOWN": 140,
 "ECONNREFUSED": 14,
 "EADDRINUSE": 3,
 "ECONNABORTED": 13,
 "ENETUNREACH": 40,
 "ENETDOWN": 38,
 "ETIMEDOUT": 73,
 "EHOSTDOWN": 142,
 "EHOSTUNREACH": 23,
 "EINPROGRESS": 26,
 "EALREADY": 7,
 "EDESTADDRREQ": 17,
 "EMSGSIZE": 35,
 "EPROTONOSUPPORT": 66,
 "ESOCKTNOSUPPORT": 137,
 "EADDRNOTAVAIL": 4,
 "ENETRESET": 39,
 "EISCONN": 30,
 "ENOTCONN": 53,
 "ETOOMANYREFS": 141,
 "EUSERS": 136,
 "EDQUOT": 19,
 "ESTALE": 72,
 "ENOTSUP": 138,
 "ENOMEDIUM": 148,
 "EILSEQ": 25,
 "EOVERFLOW": 61,
 "ECANCELED": 11,
 "ENOTRECOVERABLE": 56,
 "EOWNERDEAD": 62,
 "ESTRPIPE": 135
};

var FS = {
 root: null,
 mounts: [],
 devices: {},
 streams: [],
 nextInode: 1,
 nameTable: null,
 currentPath: "/",
 initialized: false,
 ignorePermissions: true,
 ErrnoError: class extends Error {
  constructor(errno) {
   super(ERRNO_MESSAGES[errno]);
   this.name = "ErrnoError";
   this.errno = errno;
   for (var key in ERRNO_CODES) {
    if (ERRNO_CODES[key] === errno) {
     this.code = key;
     break;
    }
   }
  }
 },
 genericErrors: {},
 filesystems: null,
 syncFSRequests: 0,
 FSStream: class {
  constructor() {
   this.shared = {};
  }
  get object() {
   return this.node;
  }
  set object(val) {
   this.node = val;
  }
  get isRead() {
   return (this.flags & 2097155) !== 1;
  }
  get isWrite() {
   return (this.flags & 2097155) !== 0;
  }
  get isAppend() {
   return (this.flags & 1024);
  }
  get flags() {
   return this.shared.flags;
  }
  set flags(val) {
   this.shared.flags = val;
  }
  get position() {
   return this.shared.position;
  }
  set position(val) {
   this.shared.position = val;
  }
 },
 FSNode: class {
  constructor(parent, name, mode, rdev) {
   if (!parent) {
    parent = this;
   }
   this.parent = parent;
   this.mount = parent.mount;
   this.mounted = null;
   this.id = FS.nextInode++;
   this.name = name;
   this.mode = mode;
   this.node_ops = {};
   this.stream_ops = {};
   this.rdev = rdev;
   this.readMode = 292 | /*292*/ 73;
   /*73*/ this.writeMode = 146;
  }
  /*146*/ get read() {
   return (this.mode & this.readMode) === this.readMode;
  }
  set read(val) {
   val ? this.mode |= this.readMode : this.mode &= ~this.readMode;
  }
  get write() {
   return (this.mode & this.writeMode) === this.writeMode;
  }
  set write(val) {
   val ? this.mode |= this.writeMode : this.mode &= ~this.writeMode;
  }
  get isFolder() {
   return FS.isDir(this.mode);
  }
  get isDevice() {
   return FS.isChrdev(this.mode);
  }
 },
 lookupPath(path, opts = {}) {
  path = PATH_FS.resolve(path);
  if (!path) return {
   path: "",
   node: null
  };
  var defaults = {
   follow_mount: true,
   recurse_count: 0
  };
  opts = Object.assign(defaults, opts);
  if (opts.recurse_count > 8) {
   throw new FS.ErrnoError(32);
  }
  var parts = path.split("/").filter(p => !!p);
  var current = FS.root;
  var current_path = "/";
  for (var i = 0; i < parts.length; i++) {
   var islast = (i === parts.length - 1);
   if (islast && opts.parent) {
    break;
   }
   current = FS.lookupNode(current, parts[i]);
   current_path = PATH.join2(current_path, parts[i]);
   if (FS.isMountpoint(current)) {
    if (!islast || (islast && opts.follow_mount)) {
     current = current.mounted.root;
    }
   }
   if (!islast || opts.follow) {
    var count = 0;
    while (FS.isLink(current.mode)) {
     var link = FS.readlink(current_path);
     current_path = PATH_FS.resolve(PATH.dirname(current_path), link);
     var lookup = FS.lookupPath(current_path, {
      recurse_count: opts.recurse_count + 1
     });
     current = lookup.node;
     if (count++ > 40) {
      throw new FS.ErrnoError(32);
     }
    }
   }
  }
  return {
   path: current_path,
   node: current
  };
 },
 getPath(node) {
  var path;
  while (true) {
   if (FS.isRoot(node)) {
    var mount = node.mount.mountpoint;
    if (!path) return mount;
    return mount[mount.length - 1] !== "/" ? \`\${mount}/\${path}\` : mount + path;
   }
   path = path ? \`\${node.name}/\${path}\` : node.name;
   node = node.parent;
  }
 },
 hashName(parentid, name) {
  var hash = 0;
  for (var i = 0; i < name.length; i++) {
   hash = ((hash << 5) - hash + name.charCodeAt(i)) | 0;
  }
  return ((parentid + hash) >>> 0) % FS.nameTable.length;
 },
 hashAddNode(node) {
  var hash = FS.hashName(node.parent.id, node.name);
  node.name_next = FS.nameTable[hash];
  FS.nameTable[hash] = node;
 },
 hashRemoveNode(node) {
  var hash = FS.hashName(node.parent.id, node.name);
  if (FS.nameTable[hash] === node) {
   FS.nameTable[hash] = node.name_next;
  } else {
   var current = FS.nameTable[hash];
   while (current) {
    if (current.name_next === node) {
     current.name_next = node.name_next;
     break;
    }
    current = current.name_next;
   }
  }
 },
 lookupNode(parent, name) {
  var errCode = FS.mayLookup(parent);
  if (errCode) {
   throw new FS.ErrnoError(errCode);
  }
  var hash = FS.hashName(parent.id, name);
  for (var node = FS.nameTable[hash]; node; node = node.name_next) {
   var nodeName = node.name;
   if (node.parent.id === parent.id && nodeName === name) {
    return node;
   }
  }
  return FS.lookup(parent, name);
 },
 createNode(parent, name, mode, rdev) {
  assert(typeof parent == "object");
  var node = new FS.FSNode(parent, name, mode, rdev);
  FS.hashAddNode(node);
  return node;
 },
 destroyNode(node) {
  FS.hashRemoveNode(node);
 },
 isRoot(node) {
  return node === node.parent;
 },
 isMountpoint(node) {
  return !!node.mounted;
 },
 isFile(mode) {
  return (mode & 61440) === 32768;
 },
 isDir(mode) {
  return (mode & 61440) === 16384;
 },
 isLink(mode) {
  return (mode & 61440) === 40960;
 },
 isChrdev(mode) {
  return (mode & 61440) === 8192;
 },
 isBlkdev(mode) {
  return (mode & 61440) === 24576;
 },
 isFIFO(mode) {
  return (mode & 61440) === 4096;
 },
 isSocket(mode) {
  return (mode & 49152) === 49152;
 },
 flagsToPermissionString(flag) {
  var perms = [ "r", "w", "rw" ][flag & 3];
  if ((flag & 512)) {
   perms += "w";
  }
  return perms;
 },
 nodePermissions(node, perms) {
  if (FS.ignorePermissions) {
   return 0;
  }
  if (perms.includes("r") && !(node.mode & 292)) {
   return 2;
  } else if (perms.includes("w") && !(node.mode & 146)) {
   return 2;
  } else if (perms.includes("x") && !(node.mode & 73)) {
   return 2;
  }
  return 0;
 },
 mayLookup(dir) {
  if (!FS.isDir(dir.mode)) return 54;
  var errCode = FS.nodePermissions(dir, "x");
  if (errCode) return errCode;
  if (!dir.node_ops.lookup) return 2;
  return 0;
 },
 mayCreate(dir, name) {
  try {
   var node = FS.lookupNode(dir, name);
   return 20;
  } catch (e) {}
  return FS.nodePermissions(dir, "wx");
 },
 mayDelete(dir, name, isdir) {
  var node;
  try {
   node = FS.lookupNode(dir, name);
  } catch (e) {
   return e.errno;
  }
  var errCode = FS.nodePermissions(dir, "wx");
  if (errCode) {
   return errCode;
  }
  if (isdir) {
   if (!FS.isDir(node.mode)) {
    return 54;
   }
   if (FS.isRoot(node) || FS.getPath(node) === FS.cwd()) {
    return 10;
   }
  } else {
   if (FS.isDir(node.mode)) {
    return 31;
   }
  }
  return 0;
 },
 mayOpen(node, flags) {
  if (!node) {
   return 44;
  }
  if (FS.isLink(node.mode)) {
   return 32;
  } else if (FS.isDir(node.mode)) {
   if (FS.flagsToPermissionString(flags) !== "r" || (flags & 512)) {
    return 31;
   }
  }
  return FS.nodePermissions(node, FS.flagsToPermissionString(flags));
 },
 MAX_OPEN_FDS: 4096,
 nextfd() {
  for (var fd = 0; fd <= FS.MAX_OPEN_FDS; fd++) {
   if (!FS.streams[fd]) {
    return fd;
   }
  }
  throw new FS.ErrnoError(33);
 },
 getStreamChecked(fd) {
  var stream = FS.getStream(fd);
  if (!stream) {
   throw new FS.ErrnoError(8);
  }
  return stream;
 },
 getStream: fd => FS.streams[fd],
 createStream(stream, fd = -1) {
  stream = Object.assign(new FS.FSStream, stream);
  if (fd == -1) {
   fd = FS.nextfd();
  }
  stream.fd = fd;
  FS.streams[fd] = stream;
  return stream;
 },
 closeStream(fd) {
  FS.streams[fd] = null;
 },
 dupStream(origStream, fd = -1) {
  var stream = FS.createStream(origStream, fd);
  stream.stream_ops?.dup?.(stream);
  return stream;
 },
 chrdev_stream_ops: {
  open(stream) {
   var device = FS.getDevice(stream.node.rdev);
   stream.stream_ops = device.stream_ops;
   stream.stream_ops.open?.(stream);
  },
  llseek() {
   throw new FS.ErrnoError(70);
  }
 },
 major: dev => ((dev) >> 8),
 minor: dev => ((dev) & 255),
 makedev: (ma, mi) => ((ma) << 8 | (mi)),
 registerDevice(dev, ops) {
  FS.devices[dev] = {
   stream_ops: ops
  };
 },
 getDevice: dev => FS.devices[dev],
 getMounts(mount) {
  var mounts = [];
  var check = [ mount ];
  while (check.length) {
   var m = check.pop();
   mounts.push(m);
   check.push(...m.mounts);
  }
  return mounts;
 },
 syncfs(populate, callback) {
  if (typeof populate == "function") {
   callback = populate;
   populate = false;
  }
  FS.syncFSRequests++;
  if (FS.syncFSRequests > 1) {
   err(\`warning: \${FS.syncFSRequests} FS.syncfs operations in flight at once, probably just doing extra work\`);
  }
  var mounts = FS.getMounts(FS.root.mount);
  var completed = 0;
  function doCallback(errCode) {
   assert(FS.syncFSRequests > 0);
   FS.syncFSRequests--;
   return callback(errCode);
  }
  function done(errCode) {
   if (errCode) {
    if (!done.errored) {
     done.errored = true;
     return doCallback(errCode);
    }
    return;
   }
   if (++completed >= mounts.length) {
    doCallback(null);
   }
  }
  mounts.forEach(mount => {
   if (!mount.type.syncfs) {
    return done(null);
   }
   mount.type.syncfs(mount, populate, done);
  });
 },
 mount(type, opts, mountpoint) {
  if (typeof type == "string") {
   throw type;
  }
  var root = mountpoint === "/";
  var pseudo = !mountpoint;
  var node;
  if (root && FS.root) {
   throw new FS.ErrnoError(10);
  } else if (!root && !pseudo) {
   var lookup = FS.lookupPath(mountpoint, {
    follow_mount: false
   });
   mountpoint = lookup.path;
   node = lookup.node;
   if (FS.isMountpoint(node)) {
    throw new FS.ErrnoError(10);
   }
   if (!FS.isDir(node.mode)) {
    throw new FS.ErrnoError(54);
   }
  }
  var mount = {
   type: type,
   opts: opts,
   mountpoint: mountpoint,
   mounts: []
  };
  var mountRoot = type.mount(mount);
  mountRoot.mount = mount;
  mount.root = mountRoot;
  if (root) {
   FS.root = mountRoot;
  } else if (node) {
   node.mounted = mount;
   if (node.mount) {
    node.mount.mounts.push(mount);
   }
  }
  return mountRoot;
 },
 unmount(mountpoint) {
  var lookup = FS.lookupPath(mountpoint, {
   follow_mount: false
  });
  if (!FS.isMountpoint(lookup.node)) {
   throw new FS.ErrnoError(28);
  }
  var node = lookup.node;
  var mount = node.mounted;
  var mounts = FS.getMounts(mount);
  Object.keys(FS.nameTable).forEach(hash => {
   var current = FS.nameTable[hash];
   while (current) {
    var next = current.name_next;
    if (mounts.includes(current.mount)) {
     FS.destroyNode(current);
    }
    current = next;
   }
  });
  node.mounted = null;
  var idx = node.mount.mounts.indexOf(mount);
  assert(idx !== -1);
  node.mount.mounts.splice(idx, 1);
 },
 lookup(parent, name) {
  return parent.node_ops.lookup(parent, name);
 },
 mknod(path, mode, dev) {
  var lookup = FS.lookupPath(path, {
   parent: true
  });
  var parent = lookup.node;
  var name = PATH.basename(path);
  if (!name || name === "." || name === "..") {
   throw new FS.ErrnoError(28);
  }
  var errCode = FS.mayCreate(parent, name);
  if (errCode) {
   throw new FS.ErrnoError(errCode);
  }
  if (!parent.node_ops.mknod) {
   throw new FS.ErrnoError(63);
  }
  return parent.node_ops.mknod(parent, name, mode, dev);
 },
 create(path, mode) {
  mode = mode !== undefined ? mode : 438;
  /* 0666 */ mode &= 4095;
  mode |= 32768;
  return FS.mknod(path, mode, 0);
 },
 mkdir(path, mode) {
  mode = mode !== undefined ? mode : 511;
  /* 0777 */ mode &= 511 | 512;
  mode |= 16384;
  return FS.mknod(path, mode, 0);
 },
 mkdirTree(path, mode) {
  var dirs = path.split("/");
  var d = "";
  for (var i = 0; i < dirs.length; ++i) {
   if (!dirs[i]) continue;
   d += "/" + dirs[i];
   try {
    FS.mkdir(d, mode);
   } catch (e) {
    if (e.errno != 20) throw e;
   }
  }
 },
 mkdev(path, mode, dev) {
  if (typeof dev == "undefined") {
   dev = mode;
   mode = 438;
  }
  /* 0666 */ mode |= 8192;
  return FS.mknod(path, mode, dev);
 },
 symlink(oldpath, newpath) {
  if (!PATH_FS.resolve(oldpath)) {
   throw new FS.ErrnoError(44);
  }
  var lookup = FS.lookupPath(newpath, {
   parent: true
  });
  var parent = lookup.node;
  if (!parent) {
   throw new FS.ErrnoError(44);
  }
  var newname = PATH.basename(newpath);
  var errCode = FS.mayCreate(parent, newname);
  if (errCode) {
   throw new FS.ErrnoError(errCode);
  }
  if (!parent.node_ops.symlink) {
   throw new FS.ErrnoError(63);
  }
  return parent.node_ops.symlink(parent, newname, oldpath);
 },
 rename(old_path, new_path) {
  var old_dirname = PATH.dirname(old_path);
  var new_dirname = PATH.dirname(new_path);
  var old_name = PATH.basename(old_path);
  var new_name = PATH.basename(new_path);
  var lookup, old_dir, new_dir;
  lookup = FS.lookupPath(old_path, {
   parent: true
  });
  old_dir = lookup.node;
  lookup = FS.lookupPath(new_path, {
   parent: true
  });
  new_dir = lookup.node;
  if (!old_dir || !new_dir) throw new FS.ErrnoError(44);
  if (old_dir.mount !== new_dir.mount) {
   throw new FS.ErrnoError(75);
  }
  var old_node = FS.lookupNode(old_dir, old_name);
  var relative = PATH_FS.relative(old_path, new_dirname);
  if (relative.charAt(0) !== ".") {
   throw new FS.ErrnoError(28);
  }
  relative = PATH_FS.relative(new_path, old_dirname);
  if (relative.charAt(0) !== ".") {
   throw new FS.ErrnoError(55);
  }
  var new_node;
  try {
   new_node = FS.lookupNode(new_dir, new_name);
  } catch (e) {}
  if (old_node === new_node) {
   return;
  }
  var isdir = FS.isDir(old_node.mode);
  var errCode = FS.mayDelete(old_dir, old_name, isdir);
  if (errCode) {
   throw new FS.ErrnoError(errCode);
  }
  errCode = new_node ? FS.mayDelete(new_dir, new_name, isdir) : FS.mayCreate(new_dir, new_name);
  if (errCode) {
   throw new FS.ErrnoError(errCode);
  }
  if (!old_dir.node_ops.rename) {
   throw new FS.ErrnoError(63);
  }
  if (FS.isMountpoint(old_node) || (new_node && FS.isMountpoint(new_node))) {
   throw new FS.ErrnoError(10);
  }
  if (new_dir !== old_dir) {
   errCode = FS.nodePermissions(old_dir, "w");
   if (errCode) {
    throw new FS.ErrnoError(errCode);
   }
  }
  FS.hashRemoveNode(old_node);
  try {
   old_dir.node_ops.rename(old_node, new_dir, new_name);
  } catch (e) {
   throw e;
  } finally {
   FS.hashAddNode(old_node);
  }
 },
 rmdir(path) {
  var lookup = FS.lookupPath(path, {
   parent: true
  });
  var parent = lookup.node;
  var name = PATH.basename(path);
  var node = FS.lookupNode(parent, name);
  var errCode = FS.mayDelete(parent, name, true);
  if (errCode) {
   throw new FS.ErrnoError(errCode);
  }
  if (!parent.node_ops.rmdir) {
   throw new FS.ErrnoError(63);
  }
  if (FS.isMountpoint(node)) {
   throw new FS.ErrnoError(10);
  }
  parent.node_ops.rmdir(parent, name);
  FS.destroyNode(node);
 },
 readdir(path) {
  var lookup = FS.lookupPath(path, {
   follow: true
  });
  var node = lookup.node;
  if (!node.node_ops.readdir) {
   throw new FS.ErrnoError(54);
  }
  return node.node_ops.readdir(node);
 },
 unlink(path) {
  var lookup = FS.lookupPath(path, {
   parent: true
  });
  var parent = lookup.node;
  if (!parent) {
   throw new FS.ErrnoError(44);
  }
  var name = PATH.basename(path);
  var node = FS.lookupNode(parent, name);
  var errCode = FS.mayDelete(parent, name, false);
  if (errCode) {
   throw new FS.ErrnoError(errCode);
  }
  if (!parent.node_ops.unlink) {
   throw new FS.ErrnoError(63);
  }
  if (FS.isMountpoint(node)) {
   throw new FS.ErrnoError(10);
  }
  parent.node_ops.unlink(parent, name);
  FS.destroyNode(node);
 },
 readlink(path) {
  var lookup = FS.lookupPath(path);
  var link = lookup.node;
  if (!link) {
   throw new FS.ErrnoError(44);
  }
  if (!link.node_ops.readlink) {
   throw new FS.ErrnoError(28);
  }
  return PATH_FS.resolve(FS.getPath(link.parent), link.node_ops.readlink(link));
 },
 stat(path, dontFollow) {
  var lookup = FS.lookupPath(path, {
   follow: !dontFollow
  });
  var node = lookup.node;
  if (!node) {
   throw new FS.ErrnoError(44);
  }
  if (!node.node_ops.getattr) {
   throw new FS.ErrnoError(63);
  }
  return node.node_ops.getattr(node);
 },
 lstat(path) {
  return FS.stat(path, true);
 },
 chmod(path, mode, dontFollow) {
  var node;
  if (typeof path == "string") {
   var lookup = FS.lookupPath(path, {
    follow: !dontFollow
   });
   node = lookup.node;
  } else {
   node = path;
  }
  if (!node.node_ops.setattr) {
   throw new FS.ErrnoError(63);
  }
  node.node_ops.setattr(node, {
   mode: (mode & 4095) | (node.mode & ~4095),
   timestamp: Date.now()
  });
 },
 lchmod(path, mode) {
  FS.chmod(path, mode, true);
 },
 fchmod(fd, mode) {
  var stream = FS.getStreamChecked(fd);
  FS.chmod(stream.node, mode);
 },
 chown(path, uid, gid, dontFollow) {
  var node;
  if (typeof path == "string") {
   var lookup = FS.lookupPath(path, {
    follow: !dontFollow
   });
   node = lookup.node;
  } else {
   node = path;
  }
  if (!node.node_ops.setattr) {
   throw new FS.ErrnoError(63);
  }
  node.node_ops.setattr(node, {
   timestamp: Date.now()
  });
 },
 lchown(path, uid, gid) {
  FS.chown(path, uid, gid, true);
 },
 fchown(fd, uid, gid) {
  var stream = FS.getStreamChecked(fd);
  FS.chown(stream.node, uid, gid);
 },
 truncate(path, len) {
  if (len < 0) {
   throw new FS.ErrnoError(28);
  }
  var node;
  if (typeof path == "string") {
   var lookup = FS.lookupPath(path, {
    follow: true
   });
   node = lookup.node;
  } else {
   node = path;
  }
  if (!node.node_ops.setattr) {
   throw new FS.ErrnoError(63);
  }
  if (FS.isDir(node.mode)) {
   throw new FS.ErrnoError(31);
  }
  if (!FS.isFile(node.mode)) {
   throw new FS.ErrnoError(28);
  }
  var errCode = FS.nodePermissions(node, "w");
  if (errCode) {
   throw new FS.ErrnoError(errCode);
  }
  node.node_ops.setattr(node, {
   size: len,
   timestamp: Date.now()
  });
 },
 ftruncate(fd, len) {
  var stream = FS.getStreamChecked(fd);
  if ((stream.flags & 2097155) === 0) {
   throw new FS.ErrnoError(28);
  }
  FS.truncate(stream.node, len);
 },
 utime(path, atime, mtime) {
  var lookup = FS.lookupPath(path, {
   follow: true
  });
  var node = lookup.node;
  node.node_ops.setattr(node, {
   timestamp: Math.max(atime, mtime)
  });
 },
 open(path, flags, mode) {
  if (path === "") {
   throw new FS.ErrnoError(44);
  }
  flags = typeof flags == "string" ? FS_modeStringToFlags(flags) : flags;
  mode = typeof mode == "undefined" ? 438 : /* 0666 */ mode;
  if ((flags & 64)) {
   mode = (mode & 4095) | 32768;
  } else {
   mode = 0;
  }
  var node;
  if (typeof path == "object") {
   node = path;
  } else {
   path = PATH.normalize(path);
   try {
    var lookup = FS.lookupPath(path, {
     follow: !(flags & 131072)
    });
    node = lookup.node;
   } catch (e) {}
  }
  var created = false;
  if ((flags & 64)) {
   if (node) {
    if ((flags & 128)) {
     throw new FS.ErrnoError(20);
    }
   } else {
    node = FS.mknod(path, mode, 0);
    created = true;
   }
  }
  if (!node) {
   throw new FS.ErrnoError(44);
  }
  if (FS.isChrdev(node.mode)) {
   flags &= ~512;
  }
  if ((flags & 65536) && !FS.isDir(node.mode)) {
   throw new FS.ErrnoError(54);
  }
  if (!created) {
   var errCode = FS.mayOpen(node, flags);
   if (errCode) {
    throw new FS.ErrnoError(errCode);
   }
  }
  if ((flags & 512) && !created) {
   FS.truncate(node, 0);
  }
  flags &= ~(128 | 512 | 131072);
  var stream = FS.createStream({
   node: node,
   path: FS.getPath(node),
   flags: flags,
   seekable: true,
   position: 0,
   stream_ops: node.stream_ops,
   ungotten: [],
   error: false
  });
  if (stream.stream_ops.open) {
   stream.stream_ops.open(stream);
  }
  if (Module["logReadFiles"] && !(flags & 1)) {
   if (!FS.readFiles) FS.readFiles = {};
   if (!(path in FS.readFiles)) {
    FS.readFiles[path] = 1;
   }
  }
  return stream;
 },
 close(stream) {
  if (FS.isClosed(stream)) {
   throw new FS.ErrnoError(8);
  }
  if (stream.getdents) stream.getdents = null;
  try {
   if (stream.stream_ops.close) {
    stream.stream_ops.close(stream);
   }
  } catch (e) {
   throw e;
  } finally {
   FS.closeStream(stream.fd);
  }
  stream.fd = null;
 },
 isClosed(stream) {
  return stream.fd === null;
 },
 llseek(stream, offset, whence) {
  if (FS.isClosed(stream)) {
   throw new FS.ErrnoError(8);
  }
  if (!stream.seekable || !stream.stream_ops.llseek) {
   throw new FS.ErrnoError(70);
  }
  if (whence != 0 && whence != 1 && whence != 2) {
   throw new FS.ErrnoError(28);
  }
  stream.position = stream.stream_ops.llseek(stream, offset, whence);
  stream.ungotten = [];
  return stream.position;
 },
 read(stream, buffer, offset, length, position) {
  assert(offset >= 0);
  if (length < 0 || position < 0) {
   throw new FS.ErrnoError(28);
  }
  if (FS.isClosed(stream)) {
   throw new FS.ErrnoError(8);
  }
  if ((stream.flags & 2097155) === 1) {
   throw new FS.ErrnoError(8);
  }
  if (FS.isDir(stream.node.mode)) {
   throw new FS.ErrnoError(31);
  }
  if (!stream.stream_ops.read) {
   throw new FS.ErrnoError(28);
  }
  var seeking = typeof position != "undefined";
  if (!seeking) {
   position = stream.position;
  } else if (!stream.seekable) {
   throw new FS.ErrnoError(70);
  }
  var bytesRead = stream.stream_ops.read(stream, buffer, offset, length, position);
  if (!seeking) stream.position += bytesRead;
  return bytesRead;
 },
 write(stream, buffer, offset, length, position, canOwn) {
  assert(offset >= 0);
  if (length < 0 || position < 0) {
   throw new FS.ErrnoError(28);
  }
  if (FS.isClosed(stream)) {
   throw new FS.ErrnoError(8);
  }
  if ((stream.flags & 2097155) === 0) {
   throw new FS.ErrnoError(8);
  }
  if (FS.isDir(stream.node.mode)) {
   throw new FS.ErrnoError(31);
  }
  if (!stream.stream_ops.write) {
   throw new FS.ErrnoError(28);
  }
  if (stream.seekable && stream.flags & 1024) {
   FS.llseek(stream, 0, 2);
  }
  var seeking = typeof position != "undefined";
  if (!seeking) {
   position = stream.position;
  } else if (!stream.seekable) {
   throw new FS.ErrnoError(70);
  }
  var bytesWritten = stream.stream_ops.write(stream, buffer, offset, length, position, canOwn);
  if (!seeking) stream.position += bytesWritten;
  return bytesWritten;
 },
 allocate(stream, offset, length) {
  if (FS.isClosed(stream)) {
   throw new FS.ErrnoError(8);
  }
  if (offset < 0 || length <= 0) {
   throw new FS.ErrnoError(28);
  }
  if ((stream.flags & 2097155) === 0) {
   throw new FS.ErrnoError(8);
  }
  if (!FS.isFile(stream.node.mode) && !FS.isDir(stream.node.mode)) {
   throw new FS.ErrnoError(43);
  }
  if (!stream.stream_ops.allocate) {
   throw new FS.ErrnoError(138);
  }
  stream.stream_ops.allocate(stream, offset, length);
 },
 mmap(stream, length, position, prot, flags) {
  if ((prot & 2) !== 0 && (flags & 2) === 0 && (stream.flags & 2097155) !== 2) {
   throw new FS.ErrnoError(2);
  }
  if ((stream.flags & 2097155) === 1) {
   throw new FS.ErrnoError(2);
  }
  if (!stream.stream_ops.mmap) {
   throw new FS.ErrnoError(43);
  }
  return stream.stream_ops.mmap(stream, length, position, prot, flags);
 },
 msync(stream, buffer, offset, length, mmapFlags) {
  assert(offset >= 0);
  if (!stream.stream_ops.msync) {
   return 0;
  }
  return stream.stream_ops.msync(stream, buffer, offset, length, mmapFlags);
 },
 ioctl(stream, cmd, arg) {
  if (!stream.stream_ops.ioctl) {
   throw new FS.ErrnoError(59);
  }
  return stream.stream_ops.ioctl(stream, cmd, arg);
 },
 readFile(path, opts = {}) {
  opts.flags = opts.flags || 0;
  opts.encoding = opts.encoding || "binary";
  if (opts.encoding !== "utf8" && opts.encoding !== "binary") {
   throw new Error(\`Invalid encoding type "\${opts.encoding}"\`);
  }
  var ret;
  var stream = FS.open(path, opts.flags);
  var stat = FS.stat(path);
  var length = stat.size;
  var buf = new Uint8Array(length);
  FS.read(stream, buf, 0, length, 0);
  if (opts.encoding === "utf8") {
   ret = UTF8ArrayToString(buf, 0);
  } else if (opts.encoding === "binary") {
   ret = buf;
  }
  FS.close(stream);
  return ret;
 },
 writeFile(path, data, opts = {}) {
  opts.flags = opts.flags || 577;
  var stream = FS.open(path, opts.flags, opts.mode);
  if (typeof data == "string") {
   var buf = new Uint8Array(lengthBytesUTF8(data) + 1);
   var actualNumBytes = stringToUTF8Array(data, buf, 0, buf.length);
   FS.write(stream, buf, 0, actualNumBytes, undefined, opts.canOwn);
  } else if (ArrayBuffer.isView(data)) {
   FS.write(stream, data, 0, data.byteLength, undefined, opts.canOwn);
  } else {
   throw new Error("Unsupported data type");
  }
  FS.close(stream);
 },
 cwd: () => FS.currentPath,
 chdir(path) {
  var lookup = FS.lookupPath(path, {
   follow: true
  });
  if (lookup.node === null) {
   throw new FS.ErrnoError(44);
  }
  if (!FS.isDir(lookup.node.mode)) {
   throw new FS.ErrnoError(54);
  }
  var errCode = FS.nodePermissions(lookup.node, "x");
  if (errCode) {
   throw new FS.ErrnoError(errCode);
  }
  FS.currentPath = lookup.path;
 },
 createDefaultDirectories() {
  FS.mkdir("/tmp");
  FS.mkdir("/home");
  FS.mkdir("/home/web_user");
 },
 createDefaultDevices() {
  FS.mkdir("/dev");
  FS.registerDevice(FS.makedev(1, 3), {
   read: () => 0,
   write: (stream, buffer, offset, length, pos) => length
  });
  FS.mkdev("/dev/null", FS.makedev(1, 3));
  TTY.register(FS.makedev(5, 0), TTY.default_tty_ops);
  TTY.register(FS.makedev(6, 0), TTY.default_tty1_ops);
  FS.mkdev("/dev/tty", FS.makedev(5, 0));
  FS.mkdev("/dev/tty1", FS.makedev(6, 0));
  var randomBuffer = new Uint8Array(1024), randomLeft = 0;
  var randomByte = () => {
   if (randomLeft === 0) {
    randomLeft = randomFill(randomBuffer).byteLength;
   }
   return randomBuffer[--randomLeft];
  };
  FS.createDevice("/dev", "random", randomByte);
  FS.createDevice("/dev", "urandom", randomByte);
  FS.mkdir("/dev/shm");
  FS.mkdir("/dev/shm/tmp");
 },
 createSpecialDirectories() {
  FS.mkdir("/proc");
  var proc_self = FS.mkdir("/proc/self");
  FS.mkdir("/proc/self/fd");
  FS.mount({
   mount() {
    var node = FS.createNode(proc_self, "fd", 16384 | 511, /* 0777 */ 73);
    node.node_ops = {
     lookup(parent, name) {
      var fd = +name;
      var stream = FS.getStreamChecked(fd);
      var ret = {
       parent: null,
       mount: {
        mountpoint: "fake"
       },
       node_ops: {
        readlink: () => stream.path
       }
      };
      ret.parent = ret;
      return ret;
     }
    };
    return node;
   }
  }, {}, "/proc/self/fd");
 },
 createStandardStreams() {
  if (Module["stdin"]) {
   FS.createDevice("/dev", "stdin", Module["stdin"]);
  } else {
   FS.symlink("/dev/tty", "/dev/stdin");
  }
  if (Module["stdout"]) {
   FS.createDevice("/dev", "stdout", null, Module["stdout"]);
  } else {
   FS.symlink("/dev/tty", "/dev/stdout");
  }
  if (Module["stderr"]) {
   FS.createDevice("/dev", "stderr", null, Module["stderr"]);
  } else {
   FS.symlink("/dev/tty1", "/dev/stderr");
  }
  var stdin = FS.open("/dev/stdin", 0);
  var stdout = FS.open("/dev/stdout", 1);
  var stderr = FS.open("/dev/stderr", 1);
  assert(stdin.fd === 0, \`invalid handle for stdin (\${stdin.fd})\`);
  assert(stdout.fd === 1, \`invalid handle for stdout (\${stdout.fd})\`);
  assert(stderr.fd === 2, \`invalid handle for stderr (\${stderr.fd})\`);
 },
 staticInit() {
  [ 44 ].forEach(code => {
   FS.genericErrors[code] = new FS.ErrnoError(code);
   FS.genericErrors[code].stack = "<generic error, no stack>";
  });
  FS.nameTable = new Array(4096);
  FS.mount(MEMFS, {}, "/");
  FS.createDefaultDirectories();
  FS.createDefaultDevices();
  FS.createSpecialDirectories();
  FS.filesystems = {
   "MEMFS": MEMFS,
   "IDBFS": IDBFS
  };
 },
 init(input, output, error) {
  assert(!FS.init.initialized, "FS.init was previously called. If you want to initialize later with custom parameters, remove any earlier calls (note that one is automatically added to the generated code)");
  FS.init.initialized = true;
  Module["stdin"] = input || Module["stdin"];
  Module["stdout"] = output || Module["stdout"];
  Module["stderr"] = error || Module["stderr"];
  FS.createStandardStreams();
 },
 quit() {
  FS.init.initialized = false;
  _fflush(0);
  for (var i = 0; i < FS.streams.length; i++) {
   var stream = FS.streams[i];
   if (!stream) {
    continue;
   }
   FS.close(stream);
  }
 },
 findObject(path, dontResolveLastLink) {
  var ret = FS.analyzePath(path, dontResolveLastLink);
  if (!ret.exists) {
   return null;
  }
  return ret.object;
 },
 analyzePath(path, dontResolveLastLink) {
  try {
   var lookup = FS.lookupPath(path, {
    follow: !dontResolveLastLink
   });
   path = lookup.path;
  } catch (e) {}
  var ret = {
   isRoot: false,
   exists: false,
   error: 0,
   name: null,
   path: null,
   object: null,
   parentExists: false,
   parentPath: null,
   parentObject: null
  };
  try {
   var lookup = FS.lookupPath(path, {
    parent: true
   });
   ret.parentExists = true;
   ret.parentPath = lookup.path;
   ret.parentObject = lookup.node;
   ret.name = PATH.basename(path);
   lookup = FS.lookupPath(path, {
    follow: !dontResolveLastLink
   });
   ret.exists = true;
   ret.path = lookup.path;
   ret.object = lookup.node;
   ret.name = lookup.node.name;
   ret.isRoot = lookup.path === "/";
  } catch (e) {
   ret.error = e.errno;
  }
  return ret;
 },
 createPath(parent, path, canRead, canWrite) {
  parent = typeof parent == "string" ? parent : FS.getPath(parent);
  var parts = path.split("/").reverse();
  while (parts.length) {
   var part = parts.pop();
   if (!part) continue;
   var current = PATH.join2(parent, part);
   try {
    FS.mkdir(current);
   } catch (e) {}
   parent = current;
  }
  return current;
 },
 createFile(parent, name, properties, canRead, canWrite) {
  var path = PATH.join2(typeof parent == "string" ? parent : FS.getPath(parent), name);
  var mode = FS_getMode(canRead, canWrite);
  return FS.create(path, mode);
 },
 createDataFile(parent, name, data, canRead, canWrite, canOwn) {
  var path = name;
  if (parent) {
   parent = typeof parent == "string" ? parent : FS.getPath(parent);
   path = name ? PATH.join2(parent, name) : parent;
  }
  var mode = FS_getMode(canRead, canWrite);
  var node = FS.create(path, mode);
  if (data) {
   if (typeof data == "string") {
    var arr = new Array(data.length);
    for (var i = 0, len = data.length; i < len; ++i) arr[i] = data.charCodeAt(i);
    data = arr;
   }
   FS.chmod(node, mode | 146);
   var stream = FS.open(node, 577);
   FS.write(stream, data, 0, data.length, 0, canOwn);
   FS.close(stream);
   FS.chmod(node, mode);
  }
 },
 createDevice(parent, name, input, output) {
  var path = PATH.join2(typeof parent == "string" ? parent : FS.getPath(parent), name);
  var mode = FS_getMode(!!input, !!output);
  if (!FS.createDevice.major) FS.createDevice.major = 64;
  var dev = FS.makedev(FS.createDevice.major++, 0);
  FS.registerDevice(dev, {
   open(stream) {
    stream.seekable = false;
   },
   close(stream) {
    if (output?.buffer?.length) {
     output(10);
    }
   },
   read(stream, buffer, offset, length, pos) {
    /* ignored */ var bytesRead = 0;
    for (var i = 0; i < length; i++) {
     var result;
     try {
      result = input();
     } catch (e) {
      throw new FS.ErrnoError(29);
     }
     if (result === undefined && bytesRead === 0) {
      throw new FS.ErrnoError(6);
     }
     if (result === null || result === undefined) break;
     bytesRead++;
     buffer[offset + i] = result;
    }
    if (bytesRead) {
     stream.node.timestamp = Date.now();
    }
    return bytesRead;
   },
   write(stream, buffer, offset, length, pos) {
    for (var i = 0; i < length; i++) {
     try {
      output(buffer[offset + i]);
     } catch (e) {
      throw new FS.ErrnoError(29);
     }
    }
    if (length) {
     stream.node.timestamp = Date.now();
    }
    return i;
   }
  });
  return FS.mkdev(path, mode, dev);
 },
 forceLoadFile(obj) {
  if (obj.isDevice || obj.isFolder || obj.link || obj.contents) return true;
  if (typeof XMLHttpRequest != "undefined") {
   throw new Error("Lazy loading should have been performed (contents set) in createLazyFile, but it was not. Lazy loading only works in web workers. Use --embed-file or --preload-file in emcc on the main thread.");
  } else if (read_) {
   try {
    obj.contents = intArrayFromString(read_(obj.url), true);
    obj.usedBytes = obj.contents.length;
   } catch (e) {
    throw new FS.ErrnoError(29);
   }
  } else {
   throw new Error("Cannot load without read() or XMLHttpRequest.");
  }
 },
 createLazyFile(parent, name, url, canRead, canWrite) {
  class LazyUint8Array {
   constructor() {
    this.lengthKnown = false;
    this.chunks = [];
   }
   get(idx) {
    if (idx > this.length - 1 || idx < 0) {
     return undefined;
    }
    var chunkOffset = idx % this.chunkSize;
    var chunkNum = (idx / this.chunkSize) | 0;
    return this.getter(chunkNum)[chunkOffset];
   }
   setDataGetter(getter) {
    this.getter = getter;
   }
   cacheLength() {
    var xhr = new XMLHttpRequest;
    xhr.open("HEAD", url, false);
    xhr.send(null);
    if (!(xhr.status >= 200 && xhr.status < 300 || xhr.status === 304)) throw new Error("Couldn't load " + url + ". Status: " + xhr.status);
    var datalength = Number(xhr.getResponseHeader("Content-length"));
    var header;
    var hasByteServing = (header = xhr.getResponseHeader("Accept-Ranges")) && header === "bytes";
    var usesGzip = (header = xhr.getResponseHeader("Content-Encoding")) && header === "gzip";
    var chunkSize = 1024 * 1024;
    if (!hasByteServing) chunkSize = datalength;
    var doXHR = (from, to) => {
     if (from > to) throw new Error("invalid range (" + from + ", " + to + ") or no bytes requested!");
     if (to > datalength - 1) throw new Error("only " + datalength + " bytes available! programmer error!");
     var xhr = new XMLHttpRequest;
     xhr.open("GET", url, false);
     if (datalength !== chunkSize) xhr.setRequestHeader("Range", "bytes=" + from + "-" + to);
     xhr.responseType = "arraybuffer";
     if (xhr.overrideMimeType) {
      xhr.overrideMimeType("text/plain; charset=x-user-defined");
     }
     xhr.send(null);
     if (!(xhr.status >= 200 && xhr.status < 300 || xhr.status === 304)) throw new Error("Couldn't load " + url + ". Status: " + xhr.status);
     if (xhr.response !== undefined) {
      return new Uint8Array(/** @type{Array<number>} */ (xhr.response || []));
     }
     return intArrayFromString(xhr.responseText || "", true);
    };
    var lazyArray = this;
    lazyArray.setDataGetter(chunkNum => {
     var start = chunkNum * chunkSize;
     var end = (chunkNum + 1) * chunkSize - 1;
     end = Math.min(end, datalength - 1);
     if (typeof lazyArray.chunks[chunkNum] == "undefined") {
      lazyArray.chunks[chunkNum] = doXHR(start, end);
     }
     if (typeof lazyArray.chunks[chunkNum] == "undefined") throw new Error("doXHR failed!");
     return lazyArray.chunks[chunkNum];
    });
    if (usesGzip || !datalength) {
     chunkSize = datalength = 1;
     datalength = this.getter(0).length;
     chunkSize = datalength;
     out("LazyFiles on gzip forces download of the whole file when length is accessed");
    }
    this._length = datalength;
    this._chunkSize = chunkSize;
    this.lengthKnown = true;
   }
   get length() {
    if (!this.lengthKnown) {
     this.cacheLength();
    }
    return this._length;
   }
   get chunkSize() {
    if (!this.lengthKnown) {
     this.cacheLength();
    }
    return this._chunkSize;
   }
  }
  if (typeof XMLHttpRequest != "undefined") {
   if (!ENVIRONMENT_IS_WORKER) throw "Cannot do synchronous binary XHRs outside webworkers in modern browsers. Use --embed-file or --preload-file in emcc";
   var lazyArray = new LazyUint8Array;
   var properties = {
    isDevice: false,
    contents: lazyArray
   };
  } else {
   var properties = {
    isDevice: false,
    url: url
   };
  }
  var node = FS.createFile(parent, name, properties, canRead, canWrite);
  if (properties.contents) {
   node.contents = properties.contents;
  } else if (properties.url) {
   node.contents = null;
   node.url = properties.url;
  }
  Object.defineProperties(node, {
   usedBytes: {
    get: function() {
     return this.contents.length;
    }
   }
  });
  var stream_ops = {};
  var keys = Object.keys(node.stream_ops);
  keys.forEach(key => {
   var fn = node.stream_ops[key];
   stream_ops[key] = (...args) => {
    FS.forceLoadFile(node);
    return fn(...args);
   };
  });
  function writeChunks(stream, buffer, offset, length, position) {
   var contents = stream.node.contents;
   if (position >= contents.length) return 0;
   var size = Math.min(contents.length - position, length);
   assert(size >= 0);
   if (contents.slice) {
    for (var i = 0; i < size; i++) {
     buffer[offset + i] = contents[position + i];
    }
   } else {
    for (var i = 0; i < size; i++) {
     buffer[offset + i] = contents.get(position + i);
    }
   }
   return size;
  }
  stream_ops.read = (stream, buffer, offset, length, position) => {
   FS.forceLoadFile(node);
   return writeChunks(stream, buffer, offset, length, position);
  };
  stream_ops.mmap = (stream, length, position, prot, flags) => {
   FS.forceLoadFile(node);
   var ptr = mmapAlloc(length);
   if (!ptr) {
    throw new FS.ErrnoError(48);
   }
   writeChunks(stream, GROWABLE_HEAP_I8(), ptr, length, position);
   return {
    ptr: ptr,
    allocated: true
   };
  };
  node.stream_ops = stream_ops;
  return node;
 },
 absolutePath() {
  abort("FS.absolutePath has been removed; use PATH_FS.resolve instead");
 },
 createFolder() {
  abort("FS.createFolder has been removed; use FS.mkdir instead");
 },
 createLink() {
  abort("FS.createLink has been removed; use FS.symlink instead");
 },
 joinPath() {
  abort("FS.joinPath has been removed; use PATH.join instead");
 },
 mmapAlloc() {
  abort("FS.mmapAlloc has been replaced by the top level function mmapAlloc");
 },
 standardizePath() {
  abort("FS.standardizePath has been removed; use PATH.normalize instead");
 }
};

var SYSCALLS = {
 DEFAULT_POLLMASK: 5,
 calculateAt(dirfd, path, allowEmpty) {
  if (PATH.isAbs(path)) {
   return path;
  }
  var dir;
  if (dirfd === -100) {
   dir = FS.cwd();
  } else {
   var dirstream = SYSCALLS.getStreamFromFD(dirfd);
   dir = dirstream.path;
  }
  if (path.length == 0) {
   if (!allowEmpty) {
    throw new FS.ErrnoError(44);
   }
   return dir;
  }
  return PATH.join2(dir, path);
 },
 doStat(func, path, buf) {
  var stat = func(path);
  GROWABLE_HEAP_I32()[((buf) >>> 2) >>> 0] = stat.dev;
  GROWABLE_HEAP_I32()[(((buf) + (4)) >>> 2) >>> 0] = stat.mode;
  GROWABLE_HEAP_U32()[(((buf) + (8)) >>> 2) >>> 0] = stat.nlink;
  GROWABLE_HEAP_I32()[(((buf) + (12)) >>> 2) >>> 0] = stat.uid;
  GROWABLE_HEAP_I32()[(((buf) + (16)) >>> 2) >>> 0] = stat.gid;
  GROWABLE_HEAP_I32()[(((buf) + (20)) >>> 2) >>> 0] = stat.rdev;
  HEAP64[(((buf) + (24)) >>> 3)] = BigInt(stat.size);
  GROWABLE_HEAP_I32()[(((buf) + (32)) >>> 2) >>> 0] = 4096;
  GROWABLE_HEAP_I32()[(((buf) + (36)) >>> 2) >>> 0] = stat.blocks;
  var atime = stat.atime.getTime();
  var mtime = stat.mtime.getTime();
  var ctime = stat.ctime.getTime();
  HEAP64[(((buf) + (40)) >>> 3)] = BigInt(Math.floor(atime / 1e3));
  GROWABLE_HEAP_U32()[(((buf) + (48)) >>> 2) >>> 0] = (atime % 1e3) * 1e3;
  HEAP64[(((buf) + (56)) >>> 3)] = BigInt(Math.floor(mtime / 1e3));
  GROWABLE_HEAP_U32()[(((buf) + (64)) >>> 2) >>> 0] = (mtime % 1e3) * 1e3;
  HEAP64[(((buf) + (72)) >>> 3)] = BigInt(Math.floor(ctime / 1e3));
  GROWABLE_HEAP_U32()[(((buf) + (80)) >>> 2) >>> 0] = (ctime % 1e3) * 1e3;
  HEAP64[(((buf) + (88)) >>> 3)] = BigInt(stat.ino);
  return 0;
 },
 doMsync(addr, stream, len, flags, offset) {
  if (!FS.isFile(stream.node.mode)) {
   throw new FS.ErrnoError(43);
  }
  if (flags & 2) {
   return 0;
  }
  var buffer = GROWABLE_HEAP_U8().slice(addr, addr + len);
  FS.msync(stream, buffer, offset, len, flags);
 },
 varargs: undefined,
 get() {
  assert(SYSCALLS.varargs != undefined);
  var ret = GROWABLE_HEAP_I32()[((+SYSCALLS.varargs) >>> 2) >>> 0];
  SYSCALLS.varargs += 4;
  return ret;
 },
 getp() {
  return SYSCALLS.get();
 },
 getStr(ptr) {
  var ret = UTF8ToString(ptr);
  return ret;
 },
 getStreamFromFD(fd) {
  var stream = FS.getStreamChecked(fd);
  return stream;
 }
};

function _wisp_select_scan(nfds, readfds, writefds, exceptfds) {
 if (ENVIRONMENT_IS_PTHREAD) return proxyToMainThread(3, 0, 1, nfds, readfds, writefds, exceptfds);
 var total = 0;
 var nwords = (nfds + 31) >> 5;
 for (var w = 0; w < nwords; w++) {
  var rd = readfds ? GROWABLE_HEAP_I32()[(((readfds) + (w * 4)) >>> 2) >>> 0] : 0;
  var wr = writefds ? GROWABLE_HEAP_I32()[(((writefds) + (w * 4)) >>> 2) >>> 0] : 0;
  var ex = exceptfds ? GROWABLE_HEAP_I32()[(((exceptfds) + (w * 4)) >>> 2) >>> 0] : 0;
  var any = rd | wr | ex;
  var dstRead = 0, dstWrite = 0, dstExcept = 0;
  if (any) {
   for (var bit = 0; bit < 32; bit++) {
    var fd = (w << 5) + bit;
    if (fd >= nfds) break;
    var mask = 1 << bit;
    if (!(any & mask)) continue;
    var stream = SYSCALLS.getStreamFromFD(fd);
    var flags = SYSCALLS.DEFAULT_POLLMASK;
    if (stream.stream_ops.poll) {
     flags = stream.stream_ops.poll(stream, -1);
    }
    if ((flags & 1) && (rd & mask)) {
     dstRead |= mask;
     total++;
    }
    if ((flags & 4) && (wr & mask)) {
     dstWrite |= mask;
     total++;
    }
    if ((flags & 2) && (ex & mask)) {
     dstExcept |= mask;
     total++;
    }
   }
  }
  if (readfds) GROWABLE_HEAP_I32()[(((readfds) + (w * 4)) >>> 2) >>> 0] = dstRead;
  if (writefds) GROWABLE_HEAP_I32()[(((writefds) + (w * 4)) >>> 2) >>> 0] = dstWrite;
  if (exceptfds) GROWABLE_HEAP_I32()[(((exceptfds) + (w * 4)) >>> 2) >>> 0] = dstExcept;
 }
 return total;
}

var WISP_POLL_FALLBACK_MS = 50;

function ___syscall__newselect(nfds, readfds, writefds, exceptfds, timeout) {
 readfds >>>= 0;
 writefds >>>= 0;
 exceptfds >>>= 0;
 timeout >>>= 0;
 var timeoutMs = -1;
 if (timeout) {
  var tv_sec = GROWABLE_HEAP_I32()[((timeout) >>> 2) >>> 0], tv_usec = GROWABLE_HEAP_I32()[(((timeout) + (4)) >>> 2) >>> 0];
  timeoutMs = (tv_sec * 1e3) + (tv_usec / 1e3);
 }
 if (timeoutMs === 0 || typeof ENVIRONMENT_IS_PTHREAD === "undefined" || !ENVIRONMENT_IS_PTHREAD) {
  return _wisp_select_scan(nfds, readfds, writefds, exceptfds);
 }
 var nbytes = ((nfds + 31) >> 5) * 4;
 var snapR = readfds ? GROWABLE_HEAP_U8().slice(readfds, readfds + nbytes) : null;
 var snapW = writefds ? GROWABLE_HEAP_U8().slice(writefds, writefds + nbytes) : null;
 var snapE = exceptfds ? GROWABLE_HEAP_U8().slice(exceptfds, exceptfds + nbytes) : null;
 var wi = _wisp_wakeword() >> 2;
 var cur = Atomics.load(GROWABLE_HEAP_I32(), wi);
 var total = _wisp_select_scan(nfds, readfds, writefds, exceptfds);
 if (total) {
  globalThis.__wispGen = cur;
  return total;
 }
 if (globalThis.__wispGen !== cur) {
  globalThis.__wispGen = cur;
  return 0;
 }
 var slice = (timeoutMs < 0) ? WISP_POLL_FALLBACK_MS : Math.min(timeoutMs, WISP_POLL_FALLBACK_MS);
 Atomics.wait(GROWABLE_HEAP_I32(), wi, cur, slice);
 globalThis.__wispGen = Atomics.load(GROWABLE_HEAP_I32(), wi);
 if (snapR) GROWABLE_HEAP_U8().set(snapR, readfds >>> 0);
 if (snapW) GROWABLE_HEAP_U8().set(snapW, writefds >>> 0);
 if (snapE) GROWABLE_HEAP_U8().set(snapE, exceptfds >>> 0);
 return _wisp_select_scan(nfds, readfds, writefds, exceptfds);
}

var SOCKFS = {
 mount(mount) {
  Module["websocket"] = (Module["websocket"] && ("object" === typeof Module["websocket"])) ? Module["websocket"] : {};
  Module["websocket"]._callbacks = {};
  Module["websocket"]["on"] = /** @this{Object} */ function(event, callback) {
   if ("function" === typeof callback) {
    this._callbacks[event] = callback;
   }
   return this;
  };
  Module["websocket"].emit = /** @this{Object} */ function(event, param) {
   if ("function" === typeof this._callbacks[event]) {
    this._callbacks[event].call(this, param);
   }
  };
  return FS.createNode(null, "/", 16384 | 511, /* 0777 */ 0);
 },
 createSocket(family, type, protocol) {
  type &= ~526336;
  var streaming = type == 1;
  if (streaming && protocol && protocol != 6) {
   throw new FS.ErrnoError(66);
  }
  var sock = {
   family: family,
   type: type,
   protocol: protocol,
   server: null,
   error: null,
   peers: {},
   pending: [],
   recv_queue: [],
   sock_ops: SOCKFS.websocket_sock_ops
  };
  var name = SOCKFS.nextname();
  var node = FS.createNode(SOCKFS.root, name, 49152, 0);
  node.sock = sock;
  var stream = FS.createStream({
   path: name,
   node: node,
   flags: 2,
   seekable: false,
   stream_ops: SOCKFS.stream_ops
  });
  sock.stream = stream;
  return sock;
 },
 getSocket(fd) {
  var stream = FS.getStream(fd);
  if (!stream || !FS.isSocket(stream.node.mode)) {
   return null;
  }
  return stream.node.sock;
 },
 stream_ops: {
  poll(stream) {
   var sock = stream.node.sock;
   return sock.sock_ops.poll(sock);
  },
  ioctl(stream, request, varargs) {
   var sock = stream.node.sock;
   return sock.sock_ops.ioctl(sock, request, varargs);
  },
  read(stream, buffer, offset, length, position) {
   /* ignored */ var sock = stream.node.sock;
   var msg = sock.sock_ops.recvmsg(sock, length);
   if (!msg) {
    return 0;
   }
   buffer.set(msg.buffer, offset);
   return msg.buffer.length;
  },
  write(stream, buffer, offset, length, position) {
   /* ignored */ var sock = stream.node.sock;
   return sock.sock_ops.sendmsg(sock, buffer, offset, length);
  },
  close(stream) {
   var sock = stream.node.sock;
   sock.sock_ops.close(sock);
  }
 },
 nextname() {
  if (!SOCKFS.nextname.current) {
   SOCKFS.nextname.current = 0;
  }
  return "socket[" + (SOCKFS.nextname.current++) + "]";
 },
 websocket_sock_ops: {
  createPeer(sock, addr, port) {
   var ws;
   if (typeof addr == "object") {
    ws = addr;
    addr = null;
    port = null;
   }
   if (ws) {
    if (ws._socket) {
     addr = ws._socket.remoteAddress;
     port = ws._socket.remotePort;
    } else {
     var result = /ws[s]?:\\/\\/([^:]+):(\\d+)/.exec(ws.url);
     if (!result) {
      throw new Error("WebSocket URL must be in the format ws(s)://address:port");
     }
     addr = result[1];
     port = parseInt(result[2], 10);
    }
   } else {
    try {
     var runtimeConfig = (Module["websocket"] && ("object" === typeof Module["websocket"]));
     var url = "ws:#".replace("#", "//");
     if (runtimeConfig) {
      if ("string" === typeof Module["websocket"]["url"]) {
       url = Module["websocket"]["url"];
      }
     }
     if (url === "ws://" || url === "wss://") {
      var parts = addr.split("/");
      url = url + parts[0] + ":" + port + "/" + parts.slice(1).join("/");
     }
     var subProtocols = "binary";
     if (runtimeConfig) {
      if ("string" === typeof Module["websocket"]["subprotocol"]) {
       subProtocols = Module["websocket"]["subprotocol"];
      }
     }
     var opts = undefined;
     if (subProtocols !== "null") {
      subProtocols = subProtocols.replace(/^ +| +$/g, "").split(/ *, */);
      opts = subProtocols;
     }
     if (runtimeConfig && null === Module["websocket"]["subprotocol"]) {
      subProtocols = "null";
      opts = undefined;
     }
     var WebSocketConstructor;
     {
      WebSocketConstructor = WebSocket;
     }
     ws = new WebSocketConstructor(url, opts);
     ws.binaryType = "arraybuffer";
    } catch (e) {
     throw new FS.ErrnoError(23);
    }
   }
   var peer = {
    addr: addr,
    port: port,
    socket: ws,
    dgram_send_queue: []
   };
   SOCKFS.websocket_sock_ops.addPeer(sock, peer);
   SOCKFS.websocket_sock_ops.handlePeerEvents(sock, peer);
   if (sock.type === 2 && typeof sock.sport != "undefined") {
    peer.dgram_send_queue.push(new Uint8Array([ 255, 255, 255, 255, "p".charCodeAt(0), "o".charCodeAt(0), "r".charCodeAt(0), "t".charCodeAt(0), ((sock.sport & 65280) >> 8), (sock.sport & 255) ]));
   }
   return peer;
  },
  getPeer(sock, addr, port) {
   return sock.peers[addr + ":" + port];
  },
  addPeer(sock, peer) {
   sock.peers[peer.addr + ":" + peer.port] = peer;
  },
  removePeer(sock, peer) {
   delete sock.peers[peer.addr + ":" + peer.port];
  },
  handlePeerEvents(sock, peer) {
   var first = true;
   var handleOpen = function() {
    Module["websocket"].emit("open", sock.stream.fd);
    try {
     var queued = peer.dgram_send_queue.shift();
     while (queued) {
      peer.socket.send(queued);
      queued = peer.dgram_send_queue.shift();
     }
    } catch (e) {
     peer.socket.close();
    }
   };
   function handleMessage(data) {
    if (typeof data == "string") {
     var encoder = new TextEncoder;
     data = encoder.encode(data);
    } else {
     assert(data.byteLength !== undefined);
     if (data.byteLength == 0) {
      return;
     }
     data = new Uint8Array(data);
    }
    var wasfirst = first;
    first = false;
    if (wasfirst && data.length === 10 && data[0] === 255 && data[1] === 255 && data[2] === 255 && data[3] === 255 && data[4] === "p".charCodeAt(0) && data[5] === "o".charCodeAt(0) && data[6] === "r".charCodeAt(0) && data[7] === "t".charCodeAt(0)) {
     var newport = ((data[8] << 8) | data[9]);
     SOCKFS.websocket_sock_ops.removePeer(sock, peer);
     peer.port = newport;
     SOCKFS.websocket_sock_ops.addPeer(sock, peer);
     return;
    }
    sock.recv_queue.push({
     addr: peer.addr,
     port: peer.port,
     data: data
    });
    Module["websocket"].emit("message", sock.stream.fd);
   }
   if (ENVIRONMENT_IS_NODE) {
    peer.socket.on("open", handleOpen);
    peer.socket.on("message", function(data, isBinary) {
     if (!isBinary) {
      return;
     }
     handleMessage((new Uint8Array(data)).buffer);
    });
    peer.socket.on("close", function() {
     Module["websocket"].emit("close", sock.stream.fd);
    });
    peer.socket.on("error", function(error) {
     sock.error = 14;
     Module["websocket"].emit("error", [ sock.stream.fd, sock.error, "ECONNREFUSED: Connection refused" ]);
    });
   } else {
    peer.socket.onopen = handleOpen;
    peer.socket.onclose = function() {
     Module["websocket"].emit("close", sock.stream.fd);
    };
    peer.socket.onmessage = function peer_socket_onmessage(event) {
     handleMessage(event.data);
    };
    peer.socket.onerror = function(error) {
     sock.error = 14;
     Module["websocket"].emit("error", [ sock.stream.fd, sock.error, "ECONNREFUSED: Connection refused" ]);
    };
   }
  },
  poll(sock) {
   if (sock.type === 1 && sock.server) {
    return sock.pending.length ? (64 | 1) : 0;
   }
   var mask = 0;
   var dest = sock.type === 1 ? SOCKFS.websocket_sock_ops.getPeer(sock, sock.daddr, sock.dport) : null;
   if (sock.recv_queue.length || !dest || (dest && dest.socket.readyState === dest.socket.CLOSING) || (dest && dest.socket.readyState === dest.socket.CLOSED)) {
    mask |= (64 | 1);
   }
   if (!dest || (dest && dest.socket.readyState === dest.socket.OPEN)) {
    mask |= 4;
   }
   if ((dest && dest.socket.readyState === dest.socket.CLOSING) || (dest && dest.socket.readyState === dest.socket.CLOSED)) {
    mask |= 16;
   }
   return mask;
  },
  ioctl(sock, request, arg) {
   switch (request) {
   case 21531:
    var bytes = 0;
    if (sock.recv_queue.length) {
     bytes = sock.recv_queue[0].data.length;
    }
    GROWABLE_HEAP_I32()[((arg) >>> 2) >>> 0] = bytes;
    return 0;

   default:
    return 28;
   }
  },
  close(sock) {
   if (sock.server) {
    try {
     sock.server.close();
    } catch (e) {}
    sock.server = null;
   }
   var peers = Object.keys(sock.peers);
   for (var i = 0; i < peers.length; i++) {
    var peer = sock.peers[peers[i]];
    try {
     peer.socket.close();
    } catch (e) {}
    SOCKFS.websocket_sock_ops.removePeer(sock, peer);
   }
   return 0;
  },
  bind(sock, addr, port) {
   if (typeof sock.saddr != "undefined" || typeof sock.sport != "undefined") {
    throw new FS.ErrnoError(28);
   }
   sock.saddr = addr;
   sock.sport = port;
   if (sock.type === 2) {
    if (sock.server) {
     sock.server.close();
     sock.server = null;
    }
    try {
     sock.sock_ops.listen(sock, 0);
    } catch (e) {
     if (!(e.name === "ErrnoError")) throw e;
     if (e.errno !== 138) throw e;
    }
   }
  },
  connect(sock, addr, port) {
   if (sock.server) {
    throw new FS.ErrnoError(138);
   }
   if (typeof sock.daddr != "undefined" && typeof sock.dport != "undefined") {
    var dest = SOCKFS.websocket_sock_ops.getPeer(sock, sock.daddr, sock.dport);
    if (dest) {
     if (dest.socket.readyState === dest.socket.CONNECTING) {
      throw new FS.ErrnoError(7);
     } else {
      throw new FS.ErrnoError(30);
     }
    }
   }
   var peer = SOCKFS.websocket_sock_ops.createPeer(sock, addr, port);
   sock.daddr = peer.addr;
   sock.dport = peer.port;
   throw new FS.ErrnoError(26);
  },
  listen(sock, backlog) {
   if (!ENVIRONMENT_IS_NODE) {
    throw new FS.ErrnoError(138);
   }
  },
  accept(listensock) {
   if (!listensock.server || !listensock.pending.length) {
    throw new FS.ErrnoError(28);
   }
   var newsock = listensock.pending.shift();
   newsock.stream.flags = listensock.stream.flags;
   return newsock;
  },
  getname(sock, peer) {
   var addr, port;
   if (peer) {
    if (sock.daddr === undefined || sock.dport === undefined) {
     throw new FS.ErrnoError(53);
    }
    addr = sock.daddr;
    port = sock.dport;
   } else {
    addr = sock.saddr || 0;
    port = sock.sport || 0;
   }
   return {
    addr: addr,
    port: port
   };
  },
  sendmsg(sock, buffer, offset, length, addr, port) {
   if (sock.type === 2) {
    if (addr === undefined || port === undefined) {
     addr = sock.daddr;
     port = sock.dport;
    }
    if (addr === undefined || port === undefined) {
     throw new FS.ErrnoError(17);
    }
   } else {
    addr = sock.daddr;
    port = sock.dport;
   }
   var dest = SOCKFS.websocket_sock_ops.getPeer(sock, addr, port);
   if (sock.type === 1) {
    if (!dest || dest.socket.readyState === dest.socket.CLOSING || dest.socket.readyState === dest.socket.CLOSED) {
     throw new FS.ErrnoError(53);
    } else if (dest.socket.readyState === dest.socket.CONNECTING) {
     throw new FS.ErrnoError(6);
    }
   }
   if (ArrayBuffer.isView(buffer)) {
    offset += buffer.byteOffset;
    buffer = buffer.buffer;
   }
   var data;
   if (buffer instanceof SharedArrayBuffer) {
    data = new Uint8Array(new Uint8Array(buffer.slice(offset, offset + length))).buffer;
   } else {
    data = buffer.slice(offset, offset + length);
   }
   if (sock.type === 2) {
    if (!dest || dest.socket.readyState !== dest.socket.OPEN) {
     if (!dest || dest.socket.readyState === dest.socket.CLOSING || dest.socket.readyState === dest.socket.CLOSED) {
      dest = SOCKFS.websocket_sock_ops.createPeer(sock, addr, port);
     }
     dest.dgram_send_queue.push(data);
     return length;
    }
   }
   try {
    dest.socket.send(data);
    return length;
   } catch (e) {
    throw new FS.ErrnoError(28);
   }
  },
  recvmsg(sock, length) {
   if (sock.type === 1 && sock.server) {
    throw new FS.ErrnoError(53);
   }
   var queued = sock.recv_queue.shift();
   if (!queued) {
    if (sock.type === 1) {
     var dest = SOCKFS.websocket_sock_ops.getPeer(sock, sock.daddr, sock.dport);
     if (!dest) {
      throw new FS.ErrnoError(53);
     }
     if (dest.socket.readyState === dest.socket.CLOSING || dest.socket.readyState === dest.socket.CLOSED) {
      return null;
     }
     throw new FS.ErrnoError(6);
    }
    throw new FS.ErrnoError(6);
   }
   var queuedLength = queued.data.byteLength || queued.data.length;
   var queuedOffset = queued.data.byteOffset || 0;
   var queuedBuffer = queued.data.buffer || queued.data;
   var bytesRead = Math.min(length, queuedLength);
   var res = {
    buffer: new Uint8Array(queuedBuffer, queuedOffset, bytesRead),
    addr: queued.addr,
    port: queued.port
   };
   if (sock.type === 1 && bytesRead < queuedLength) {
    var bytesRemaining = queuedLength - bytesRead;
    queued.data = new Uint8Array(queuedBuffer, queuedOffset + bytesRead, bytesRemaining);
    sock.recv_queue.unshift(queued);
   }
   return res;
  }
 }
};

var getSocketFromFD = fd => {
 var socket = SOCKFS.getSocket(fd);
 if (!socket) throw new FS.ErrnoError(8);
 return socket;
};

var Sockets = {
 BUFFER_SIZE: 10240,
 MAX_BUFFER_SIZE: 10485760,
 nextFd: 1,
 fds: {},
 nextport: 1,
 maxport: 65535,
 peer: null,
 connections: {},
 portmap: {},
 localAddr: 4261412874,
 addrPool: [ 33554442, 50331658, 67108874, 83886090, 100663306, 117440522, 134217738, 150994954, 167772170, 184549386, 201326602, 218103818, 234881034 ]
};

var inetPton4 = str => {
 var b = str.split(".");
 for (var i = 0; i < 4; i++) {
  var tmp = Number(b[i]);
  if (isNaN(tmp)) return null;
  b[i] = tmp;
 }
 return (b[0] | (b[1] << 8) | (b[2] << 16) | (b[3] << 24)) >>> 0;
};

/** @suppress {checkTypes} */ var jstoi_q = str => parseInt(str);

var inetPton6 = str => {
 var words;
 var w, offset, z, i;
 /* http://home.deds.nl/~aeron/regex/ */ var valid6regx = /^((?=.*::)(?!.*::.+::)(::)?([\\dA-F]{1,4}:(:|\\b)|){5}|([\\dA-F]{1,4}:){6})((([\\dA-F]{1,4}((?!\\3)::|:\\b|$))|(?!\\2\\3)){2}|(((2[0-4]|1\\d|[1-9])?\\d|25[0-5])\\.?\\b){4})$/i;
 var parts = [];
 if (!valid6regx.test(str)) {
  return null;
 }
 if (str === "::") {
  return [ 0, 0, 0, 0, 0, 0, 0, 0 ];
 }
 if (str.startsWith("::")) {
  str = str.replace("::", "Z:");
 } else {
  str = str.replace("::", ":Z:");
 }
 if (str.indexOf(".") > 0) {
  str = str.replace(new RegExp("[.]", "g"), ":");
  words = str.split(":");
  words[words.length - 4] = jstoi_q(words[words.length - 4]) + jstoi_q(words[words.length - 3]) * 256;
  words[words.length - 3] = jstoi_q(words[words.length - 2]) + jstoi_q(words[words.length - 1]) * 256;
  words = words.slice(0, words.length - 2);
 } else {
  words = str.split(":");
 }
 offset = 0;
 z = 0;
 for (w = 0; w < words.length; w++) {
  if (typeof words[w] == "string") {
   if (words[w] === "Z") {
    for (z = 0; z < (8 - words.length + 1); z++) {
     parts[w + z] = 0;
    }
    offset = z - 1;
   } else {
    parts[w + offset] = _htons(parseInt(words[w], 16));
   }
  } else {
   parts[w + offset] = words[w];
  }
 }
 return [ (parts[1] << 16) | parts[0], (parts[3] << 16) | parts[2], (parts[5] << 16) | parts[4], (parts[7] << 16) | parts[6] ];
};

/** @param {number=} addrlen */ var writeSockaddr = (sa, family, addr, port, addrlen) => {
 switch (family) {
 case 2:
  addr = inetPton4(addr);
  zeroMemory(sa, 16);
  if (addrlen) {
   GROWABLE_HEAP_I32()[((addrlen) >>> 2) >>> 0] = 16;
  }
  GROWABLE_HEAP_I16()[((sa) >>> 1) >>> 0] = family;
  GROWABLE_HEAP_I32()[(((sa) + (4)) >>> 2) >>> 0] = addr;
  GROWABLE_HEAP_I16()[(((sa) + (2)) >>> 1) >>> 0] = _htons(port);
  break;

 case 10:
  addr = inetPton6(addr);
  zeroMemory(sa, 28);
  if (addrlen) {
   GROWABLE_HEAP_I32()[((addrlen) >>> 2) >>> 0] = 28;
  }
  GROWABLE_HEAP_I32()[((sa) >>> 2) >>> 0] = family;
  GROWABLE_HEAP_I32()[(((sa) + (8)) >>> 2) >>> 0] = addr[0];
  GROWABLE_HEAP_I32()[(((sa) + (12)) >>> 2) >>> 0] = addr[1];
  GROWABLE_HEAP_I32()[(((sa) + (16)) >>> 2) >>> 0] = addr[2];
  GROWABLE_HEAP_I32()[(((sa) + (20)) >>> 2) >>> 0] = addr[3];
  GROWABLE_HEAP_I16()[(((sa) + (2)) >>> 1) >>> 0] = _htons(port);
  break;

 default:
  return 5;
 }
 return 0;
};

var DNS = {
 address_map: {
  id: 1,
  addrs: {},
  names: {}
 },
 lookup_name(name) {
  var res = inetPton4(name);
  if (res !== null) {
   return name;
  }
  res = inetPton6(name);
  if (res !== null) {
   return name;
  }
  var addr;
  if (DNS.address_map.addrs[name]) {
   addr = DNS.address_map.addrs[name];
  } else {
   var id = DNS.address_map.id++;
   assert(id < 65535, "exceeded max address mappings of 65535");
   addr = "172.29." + (id & 255) + "." + (id & 65280);
   DNS.address_map.names[addr] = name;
   DNS.address_map.addrs[name] = addr;
  }
  return addr;
 },
 lookup_addr(addr) {
  if (DNS.address_map.names[addr]) {
   return DNS.address_map.names[addr];
  }
  return null;
 }
};

function ___syscall_accept4(fd, addr, addrlen, flags, d1, d2) {
 if (ENVIRONMENT_IS_PTHREAD) return proxyToMainThread(4, 0, 1, fd, addr, addrlen, flags, d1, d2);
 addr >>>= 0;
 addrlen >>>= 0;
 try {
  var sock = getSocketFromFD(fd);
  var newsock = sock.sock_ops.accept(sock);
  if (addr) {
   var errno = writeSockaddr(addr, newsock.family, DNS.lookup_name(newsock.daddr), newsock.dport, addrlen);
   assert(!errno);
  }
  return newsock.stream.fd;
 } catch (e) {
  if (typeof FS == "undefined" || !(e.name === "ErrnoError")) throw e;
  return -e.errno;
 }
}

var inetNtop4 = addr => (addr & 255) + "." + ((addr >> 8) & 255) + "." + ((addr >> 16) & 255) + "." + ((addr >> 24) & 255);

var inetNtop6 = ints => {
 var str = "";
 var word = 0;
 var longest = 0;
 var lastzero = 0;
 var zstart = 0;
 var len = 0;
 var i = 0;
 var parts = [ ints[0] & 65535, (ints[0] >> 16), ints[1] & 65535, (ints[1] >> 16), ints[2] & 65535, (ints[2] >> 16), ints[3] & 65535, (ints[3] >> 16) ];
 var hasipv4 = true;
 var v4part = "";
 for (i = 0; i < 5; i++) {
  if (parts[i] !== 0) {
   hasipv4 = false;
   break;
  }
 }
 if (hasipv4) {
  v4part = inetNtop4(parts[6] | (parts[7] << 16));
  if (parts[5] === -1) {
   str = "::ffff:";
   str += v4part;
   return str;
  }
  if (parts[5] === 0) {
   str = "::";
   if (v4part === "0.0.0.0") v4part = "";
   if (v4part === "0.0.0.1") v4part = "1";
   str += v4part;
   return str;
  }
 }
 for (word = 0; word < 8; word++) {
  if (parts[word] === 0) {
   if (word - lastzero > 1) {
    len = 0;
   }
   lastzero = word;
   len++;
  }
  if (len > longest) {
   longest = len;
   zstart = word - longest + 1;
  }
 }
 for (word = 0; word < 8; word++) {
  if (longest > 1) {
   if (parts[word] === 0 && word >= zstart && word < (zstart + longest)) {
    if (word === zstart) {
     str += ":";
     if (zstart === 0) str += ":";
    }
    continue;
   }
  }
  str += Number(_ntohs(parts[word] & 65535)).toString(16);
  str += word < 7 ? ":" : "";
 }
 return str;
};

var readSockaddr = (sa, salen) => {
 var family = GROWABLE_HEAP_I16()[((sa) >>> 1) >>> 0];
 var port = _ntohs(GROWABLE_HEAP_U16()[(((sa) + (2)) >>> 1) >>> 0]);
 var addr;
 switch (family) {
 case 2:
  if (salen !== 16) {
   return {
    errno: 28
   };
  }
  addr = GROWABLE_HEAP_I32()[(((sa) + (4)) >>> 2) >>> 0];
  addr = inetNtop4(addr);
  break;

 case 10:
  if (salen !== 28) {
   return {
    errno: 28
   };
  }
  addr = [ GROWABLE_HEAP_I32()[(((sa) + (8)) >>> 2) >>> 0], GROWABLE_HEAP_I32()[(((sa) + (12)) >>> 2) >>> 0], GROWABLE_HEAP_I32()[(((sa) + (16)) >>> 2) >>> 0], GROWABLE_HEAP_I32()[(((sa) + (20)) >>> 2) >>> 0] ];
  addr = inetNtop6(addr);
  break;

 default:
  return {
   errno: 5
  };
 }
 return {
  family: family,
  addr: addr,
  port: port
 };
};

/** @param {boolean=} allowNull */ var getSocketAddress = (addrp, addrlen, allowNull) => {
 if (allowNull && addrp === 0) return null;
 var info = readSockaddr(addrp, addrlen);
 if (info.errno) throw new FS.ErrnoError(info.errno);
 info.addr = DNS.lookup_addr(info.addr) || info.addr;
 return info;
};

function ___syscall_bind(fd, addr, addrlen, d1, d2, d3) {
 if (ENVIRONMENT_IS_PTHREAD) return proxyToMainThread(5, 0, 1, fd, addr, addrlen, d1, d2, d3);
 addr >>>= 0;
 addrlen >>>= 0;
 try {
  var sock = getSocketFromFD(fd);
  var info = getSocketAddress(addr, addrlen);
  sock.sock_ops.bind(sock, info.addr, info.port);
  return 0;
 } catch (e) {
  if (typeof FS == "undefined" || !(e.name === "ErrnoError")) throw e;
  return -e.errno;
 }
}

function ___syscall_chdir(path) {
 if (ENVIRONMENT_IS_PTHREAD) return proxyToMainThread(6, 0, 1, path);
 path >>>= 0;
 try {
  path = SYSCALLS.getStr(path);
  FS.chdir(path);
  return 0;
 } catch (e) {
  if (typeof FS == "undefined" || !(e.name === "ErrnoError")) throw e;
  return -e.errno;
 }
}

function ___syscall_chmod(path, mode) {
 if (ENVIRONMENT_IS_PTHREAD) return proxyToMainThread(7, 0, 1, path, mode);
 path >>>= 0;
 try {
  path = SYSCALLS.getStr(path);
  FS.chmod(path, mode);
  return 0;
 } catch (e) {
  if (typeof FS == "undefined" || !(e.name === "ErrnoError")) throw e;
  return -e.errno;
 }
}

function ___syscall_connect(fd, addr, addrlen, d1, d2, d3) {
 if (ENVIRONMENT_IS_PTHREAD) return proxyToMainThread(8, 0, 1, fd, addr, addrlen, d1, d2, d3);
 addr >>>= 0;
 addrlen >>>= 0;
 try {
  var sock = getSocketFromFD(fd);
  var info = getSocketAddress(addr, addrlen);
  sock.sock_ops.connect(sock, info.addr, info.port);
  return 0;
 } catch (e) {
  if (typeof FS == "undefined" || !(e.name === "ErrnoError")) throw e;
  return -e.errno;
 }
}

function ___syscall_dup3(fd, newfd, flags) {
 if (ENVIRONMENT_IS_PTHREAD) return proxyToMainThread(9, 0, 1, fd, newfd, flags);
 try {
  var old = SYSCALLS.getStreamFromFD(fd);
  assert(!flags);
  if (old.fd === newfd) return -28;
  var existing = FS.getStream(newfd);
  if (existing) FS.close(existing);
  return FS.dupStream(old, newfd).fd;
 } catch (e) {
  if (typeof FS == "undefined" || !(e.name === "ErrnoError")) throw e;
  return -e.errno;
 }
}

function ___syscall_faccessat(dirfd, path, amode, flags) {
 if (ENVIRONMENT_IS_PTHREAD) return proxyToMainThread(10, 0, 1, dirfd, path, amode, flags);
 path >>>= 0;
 try {
  path = SYSCALLS.getStr(path);
  assert(flags === 0);
  path = SYSCALLS.calculateAt(dirfd, path);
  if (amode & ~7) {
   return -28;
  }
  var lookup = FS.lookupPath(path, {
   follow: true
  });
  var node = lookup.node;
  if (!node) {
   return -44;
  }
  var perms = "";
  if (amode & 4) perms += "r";
  if (amode & 2) perms += "w";
  if (amode & 1) perms += "x";
  if (perms && /* otherwise, they've just passed F_OK */ FS.nodePermissions(node, perms)) {
   return -2;
  }
  return 0;
 } catch (e) {
  if (typeof FS == "undefined" || !(e.name === "ErrnoError")) throw e;
  return -e.errno;
 }
}

function ___syscall_fadvise64(fd, offset, len, advice) {
 if (ENVIRONMENT_IS_PTHREAD) return proxyToMainThread(11, 0, 0, fd, offset, len, advice);
 return 0;
}

function ___syscall_fallocate(fd, mode, offset, len) {
 if (ENVIRONMENT_IS_PTHREAD) return proxyToMainThread(12, 0, 1, fd, mode, offset, len);
 offset = bigintToI53Checked(offset);
 len = bigintToI53Checked(len);
 try {
  if (isNaN(offset)) return 61;
  var stream = SYSCALLS.getStreamFromFD(fd);
  assert(mode === 0);
  FS.allocate(stream, offset, len);
  return 0;
 } catch (e) {
  if (typeof FS == "undefined" || !(e.name === "ErrnoError")) throw e;
  return -e.errno;
 }
}

function ___syscall_fchmod(fd, mode) {
 if (ENVIRONMENT_IS_PTHREAD) return proxyToMainThread(13, 0, 1, fd, mode);
 try {
  FS.fchmod(fd, mode);
  return 0;
 } catch (e) {
  if (typeof FS == "undefined" || !(e.name === "ErrnoError")) throw e;
  return -e.errno;
 }
}

function ___syscall_fchown32(fd, owner, group) {
 if (ENVIRONMENT_IS_PTHREAD) return proxyToMainThread(14, 0, 1, fd, owner, group);
 try {
  FS.fchown(fd, owner, group);
  return 0;
 } catch (e) {
  if (typeof FS == "undefined" || !(e.name === "ErrnoError")) throw e;
  return -e.errno;
 }
}

function ___syscall_fcntl64(fd, cmd, varargs) {
 if (ENVIRONMENT_IS_PTHREAD) return proxyToMainThread(15, 0, 1, fd, cmd, varargs);
 varargs >>>= 0;
 SYSCALLS.varargs = varargs;
 try {
  var stream = SYSCALLS.getStreamFromFD(fd);
  switch (cmd) {
  case 0:
   {
    var arg = SYSCALLS.get();
    if (arg < 0) {
     return -28;
    }
    while (FS.streams[arg]) {
     arg++;
    }
    var newStream;
    newStream = FS.dupStream(stream, arg);
    return newStream.fd;
   }

  case 1:
  case 2:
   return 0;

  case 3:
   return stream.flags;

  case 4:
   {
    var arg = SYSCALLS.get();
    stream.flags |= arg;
    return 0;
   }

  case 12:
   {
    var arg = SYSCALLS.getp();
    var offset = 0;
    GROWABLE_HEAP_I16()[(((arg) + (offset)) >>> 1) >>> 0] = 2;
    return 0;
   }

  case 13:
  case 14:
   return 0;
  }
  return -28;
 } catch (e) {
  if (typeof FS == "undefined" || !(e.name === "ErrnoError")) throw e;
  return -e.errno;
 }
}

function ___syscall_fstat64(fd, buf) {
 if (ENVIRONMENT_IS_PTHREAD) return proxyToMainThread(16, 0, 1, fd, buf);
 buf >>>= 0;
 try {
  var stream = SYSCALLS.getStreamFromFD(fd);
  return SYSCALLS.doStat(FS.stat, stream.path, buf);
 } catch (e) {
  if (typeof FS == "undefined" || !(e.name === "ErrnoError")) throw e;
  return -e.errno;
 }
}

function ___syscall_ftruncate64(fd, length) {
 if (ENVIRONMENT_IS_PTHREAD) return proxyToMainThread(17, 0, 1, fd, length);
 length = bigintToI53Checked(length);
 try {
  if (isNaN(length)) return 61;
  FS.ftruncate(fd, length);
  return 0;
 } catch (e) {
  if (typeof FS == "undefined" || !(e.name === "ErrnoError")) throw e;
  return -e.errno;
 }
}

var stringToUTF8 = (str, outPtr, maxBytesToWrite) => {
 assert(typeof maxBytesToWrite == "number", "stringToUTF8(str, outPtr, maxBytesToWrite) is missing the third parameter that specifies the length of the output buffer!");
 return stringToUTF8Array(str, GROWABLE_HEAP_U8(), outPtr, maxBytesToWrite);
};

function ___syscall_getcwd(buf, size) {
 if (ENVIRONMENT_IS_PTHREAD) return proxyToMainThread(18, 0, 1, buf, size);
 buf >>>= 0;
 size >>>= 0;
 try {
  if (size === 0) return -28;
  var cwd = FS.cwd();
  var cwdLengthInBytes = lengthBytesUTF8(cwd) + 1;
  if (size < cwdLengthInBytes) return -68;
  stringToUTF8(cwd, buf, size);
  return cwdLengthInBytes;
 } catch (e) {
  if (typeof FS == "undefined" || !(e.name === "ErrnoError")) throw e;
  return -e.errno;
 }
}

function ___syscall_getdents64(fd, dirp, count) {
 if (ENVIRONMENT_IS_PTHREAD) return proxyToMainThread(19, 0, 1, fd, dirp, count);
 dirp >>>= 0;
 count >>>= 0;
 try {
  var stream = SYSCALLS.getStreamFromFD(fd);
  stream.getdents ||= FS.readdir(stream.path);
  var struct_size = 280;
  var pos = 0;
  var off = FS.llseek(stream, 0, 1);
  var idx = Math.floor(off / struct_size);
  while (idx < stream.getdents.length && pos + struct_size <= count) {
   var id;
   var type;
   var name = stream.getdents[idx];
   if (name === ".") {
    id = stream.node.id;
    type = 4;
   } else if (name === "..") {
    var lookup = FS.lookupPath(stream.path, {
     parent: true
    });
    id = lookup.node.id;
    type = 4;
   } else {
    var child = FS.lookupNode(stream.node, name);
    id = child.id;
    type = FS.isChrdev(child.mode) ? 2 : FS.isDir(child.mode) ? 4 : FS.isLink(child.mode) ? 10 : 8;
   }
   assert(id);
   HEAP64[((dirp + pos) >>> 3)] = BigInt(id);
   HEAP64[(((dirp + pos) + (8)) >>> 3)] = BigInt((idx + 1) * struct_size);
   GROWABLE_HEAP_I16()[(((dirp + pos) + (16)) >>> 1) >>> 0] = 280;
   GROWABLE_HEAP_I8()[(dirp + pos) + (18) >>> 0] = type;
   stringToUTF8(name, dirp + pos + 19, 256);
   pos += struct_size;
   idx += 1;
  }
  FS.llseek(stream, idx * struct_size, 0);
  return pos;
 } catch (e) {
  if (typeof FS == "undefined" || !(e.name === "ErrnoError")) throw e;
  return -e.errno;
 }
}

function ___syscall_getpeername(fd, addr, addrlen, d1, d2, d3) {
 if (ENVIRONMENT_IS_PTHREAD) return proxyToMainThread(20, 0, 1, fd, addr, addrlen, d1, d2, d3);
 addr >>>= 0;
 addrlen >>>= 0;
 try {
  var sock = getSocketFromFD(fd);
  if (!sock.daddr) {
   return -53;
  }
  var errno = writeSockaddr(addr, sock.family, DNS.lookup_name(sock.daddr), sock.dport, addrlen);
  assert(!errno);
  return 0;
 } catch (e) {
  if (typeof FS == "undefined" || !(e.name === "ErrnoError")) throw e;
  return -e.errno;
 }
}

function ___syscall_getsockname(fd, addr, addrlen, d1, d2, d3) {
 if (ENVIRONMENT_IS_PTHREAD) return proxyToMainThread(21, 0, 1, fd, addr, addrlen, d1, d2, d3);
 addr >>>= 0;
 addrlen >>>= 0;
 try {
  var sock = getSocketFromFD(fd);
  var errno = writeSockaddr(addr, sock.family, DNS.lookup_name(sock.saddr || "0.0.0.0"), sock.sport, addrlen);
  assert(!errno);
  return 0;
 } catch (e) {
  if (typeof FS == "undefined" || !(e.name === "ErrnoError")) throw e;
  return -e.errno;
 }
}

function ___syscall_getsockopt(fd, level, optname, optval, optlen, d1) {
 if (ENVIRONMENT_IS_PTHREAD) return proxyToMainThread(22, 0, 1, fd, level, optname, optval, optlen, d1);
 optval >>>= 0;
 optlen >>>= 0;
 try {
  var sock = getSocketFromFD(fd);
  if (level === 1) {
   if (optname === 4) {
    GROWABLE_HEAP_I32()[((optval) >>> 2) >>> 0] = sock.error;
    GROWABLE_HEAP_I32()[((optlen) >>> 2) >>> 0] = 4;
    sock.error = null;
    return 0;
   }
  }
  return -50;
 } catch (e) {
  if (typeof FS == "undefined" || !(e.name === "ErrnoError")) throw e;
  return -e.errno;
 }
}

function ___syscall_ioctl(fd, op, varargs) {
 if (ENVIRONMENT_IS_PTHREAD) return proxyToMainThread(23, 0, 1, fd, op, varargs);
 varargs >>>= 0;
 SYSCALLS.varargs = varargs;
 try {
  var stream = SYSCALLS.getStreamFromFD(fd);
  switch (op) {
  case 21509:
   {
    if (!stream.tty) return -59;
    return 0;
   }

  case 21505:
   {
    if (!stream.tty) return -59;
    if (stream.tty.ops.ioctl_tcgets) {
     var termios = stream.tty.ops.ioctl_tcgets(stream);
     var argp = SYSCALLS.getp();
     GROWABLE_HEAP_I32()[((argp) >>> 2) >>> 0] = termios.c_iflag || 0;
     GROWABLE_HEAP_I32()[(((argp) + (4)) >>> 2) >>> 0] = termios.c_oflag || 0;
     GROWABLE_HEAP_I32()[(((argp) + (8)) >>> 2) >>> 0] = termios.c_cflag || 0;
     GROWABLE_HEAP_I32()[(((argp) + (12)) >>> 2) >>> 0] = termios.c_lflag || 0;
     for (var i = 0; i < 32; i++) {
      GROWABLE_HEAP_I8()[(argp + i) + (17) >>> 0] = termios.c_cc[i] || 0;
     }
     return 0;
    }
    return 0;
   }

  case 21510:
  case 21511:
  case 21512:
   {
    if (!stream.tty) return -59;
    return 0;
   }

  case 21506:
  case 21507:
  case 21508:
   {
    if (!stream.tty) return -59;
    if (stream.tty.ops.ioctl_tcsets) {
     var argp = SYSCALLS.getp();
     var c_iflag = GROWABLE_HEAP_I32()[((argp) >>> 2) >>> 0];
     var c_oflag = GROWABLE_HEAP_I32()[(((argp) + (4)) >>> 2) >>> 0];
     var c_cflag = GROWABLE_HEAP_I32()[(((argp) + (8)) >>> 2) >>> 0];
     var c_lflag = GROWABLE_HEAP_I32()[(((argp) + (12)) >>> 2) >>> 0];
     var c_cc = [];
     for (var i = 0; i < 32; i++) {
      c_cc.push(GROWABLE_HEAP_I8()[(argp + i) + (17) >>> 0]);
     }
     return stream.tty.ops.ioctl_tcsets(stream.tty, op, {
      c_iflag: c_iflag,
      c_oflag: c_oflag,
      c_cflag: c_cflag,
      c_lflag: c_lflag,
      c_cc: c_cc
     });
    }
    return 0;
   }

  case 21519:
   {
    if (!stream.tty) return -59;
    var argp = SYSCALLS.getp();
    GROWABLE_HEAP_I32()[((argp) >>> 2) >>> 0] = 0;
    return 0;
   }

  case 21520:
   {
    if (!stream.tty) return -59;
    return -28;
   }

  case 21531:
   {
    var argp = SYSCALLS.getp();
    return FS.ioctl(stream, op, argp);
   }

  case 21523:
   {
    if (!stream.tty) return -59;
    if (stream.tty.ops.ioctl_tiocgwinsz) {
     var winsize = stream.tty.ops.ioctl_tiocgwinsz(stream.tty);
     var argp = SYSCALLS.getp();
     GROWABLE_HEAP_I16()[((argp) >>> 1) >>> 0] = winsize[0];
     GROWABLE_HEAP_I16()[(((argp) + (2)) >>> 1) >>> 0] = winsize[1];
    }
    return 0;
   }

  case 21524:
   {
    if (!stream.tty) return -59;
    return 0;
   }

  case 21515:
   {
    if (!stream.tty) return -59;
    return 0;
   }

  default:
   return -28;
  }
 } catch (e) {
  if (typeof FS == "undefined" || !(e.name === "ErrnoError")) throw e;
  return -e.errno;
 }
}

function ___syscall_listen(fd, backlog) {
 if (ENVIRONMENT_IS_PTHREAD) return proxyToMainThread(24, 0, 1, fd, backlog);
 try {
  var sock = getSocketFromFD(fd);
  sock.sock_ops.listen(sock, backlog);
  return 0;
 } catch (e) {
  if (typeof FS == "undefined" || !(e.name === "ErrnoError")) throw e;
  return -e.errno;
 }
}

function ___syscall_lstat64(path, buf) {
 if (ENVIRONMENT_IS_PTHREAD) return proxyToMainThread(25, 0, 1, path, buf);
 path >>>= 0;
 buf >>>= 0;
 try {
  path = SYSCALLS.getStr(path);
  return SYSCALLS.doStat(FS.lstat, path, buf);
 } catch (e) {
  if (typeof FS == "undefined" || !(e.name === "ErrnoError")) throw e;
  return -e.errno;
 }
}

function ___syscall_mkdirat(dirfd, path, mode) {
 if (ENVIRONMENT_IS_PTHREAD) return proxyToMainThread(26, 0, 1, dirfd, path, mode);
 path >>>= 0;
 try {
  path = SYSCALLS.getStr(path);
  path = SYSCALLS.calculateAt(dirfd, path);
  path = PATH.normalize(path);
  if (path[path.length - 1] === "/") path = path.substr(0, path.length - 1);
  FS.mkdir(path, mode, 0);
  return 0;
 } catch (e) {
  if (typeof FS == "undefined" || !(e.name === "ErrnoError")) throw e;
  return -e.errno;
 }
}

function ___syscall_mknodat(dirfd, path, mode, dev) {
 if (ENVIRONMENT_IS_PTHREAD) return proxyToMainThread(27, 0, 1, dirfd, path, mode, dev);
 path >>>= 0;
 try {
  path = SYSCALLS.getStr(path);
  path = SYSCALLS.calculateAt(dirfd, path);
  switch (mode & 61440) {
  case 32768:
  case 8192:
  case 24576:
  case 4096:
  case 49152:
   break;

  default:
   return -28;
  }
  FS.mknod(path, mode, dev);
  return 0;
 } catch (e) {
  if (typeof FS == "undefined" || !(e.name === "ErrnoError")) throw e;
  return -e.errno;
 }
}

function ___syscall_newfstatat(dirfd, path, buf, flags) {
 if (ENVIRONMENT_IS_PTHREAD) return proxyToMainThread(28, 0, 1, dirfd, path, buf, flags);
 path >>>= 0;
 buf >>>= 0;
 try {
  path = SYSCALLS.getStr(path);
  var nofollow = flags & 256;
  var allowEmpty = flags & 4096;
  flags = flags & (~6400);
  assert(!flags, \`unknown flags in __syscall_newfstatat: \${flags}\`);
  path = SYSCALLS.calculateAt(dirfd, path, allowEmpty);
  return SYSCALLS.doStat(nofollow ? FS.lstat : FS.stat, path, buf);
 } catch (e) {
  if (typeof FS == "undefined" || !(e.name === "ErrnoError")) throw e;
  return -e.errno;
 }
}

function ___syscall_openat(dirfd, path, flags, varargs) {
 if (ENVIRONMENT_IS_PTHREAD) return proxyToMainThread(29, 0, 1, dirfd, path, flags, varargs);
 path >>>= 0;
 varargs >>>= 0;
 SYSCALLS.varargs = varargs;
 try {
  path = SYSCALLS.getStr(path);
  path = SYSCALLS.calculateAt(dirfd, path);
  var mode = varargs ? SYSCALLS.get() : 0;
  return FS.open(path, flags, mode).fd;
 } catch (e) {
  if (typeof FS == "undefined" || !(e.name === "ErrnoError")) throw e;
  return -e.errno;
 }
}

var PIPEFS = {
 BUCKET_BUFFER_SIZE: 8192,
 mount(mount) {
  return FS.createNode(null, "/", 16384 | 511, /* 0777 */ 0);
 },
 createPipe() {
  var pipe = {
   buckets: [],
   refcnt: 2
  };
  pipe.buckets.push({
   buffer: new Uint8Array(PIPEFS.BUCKET_BUFFER_SIZE),
   offset: 0,
   roffset: 0
  });
  var rName = PIPEFS.nextname();
  var wName = PIPEFS.nextname();
  var rNode = FS.createNode(PIPEFS.root, rName, 4096, 0);
  var wNode = FS.createNode(PIPEFS.root, wName, 4096, 0);
  rNode.pipe = pipe;
  wNode.pipe = pipe;
  var readableStream = FS.createStream({
   path: rName,
   node: rNode,
   flags: 0,
   seekable: false,
   stream_ops: PIPEFS.stream_ops
  });
  rNode.stream = readableStream;
  var writableStream = FS.createStream({
   path: wName,
   node: wNode,
   flags: 1,
   seekable: false,
   stream_ops: PIPEFS.stream_ops
  });
  wNode.stream = writableStream;
  return {
   readable_fd: readableStream.fd,
   writable_fd: writableStream.fd
  };
 },
 stream_ops: {
  poll(stream) {
   var pipe = stream.node.pipe;
   if ((stream.flags & 2097155) === 1) {
    return (256 | 4);
   }
   if (pipe.buckets.length > 0) {
    for (var i = 0; i < pipe.buckets.length; i++) {
     var bucket = pipe.buckets[i];
     if (bucket.offset - bucket.roffset > 0) {
      return (64 | 1);
     }
    }
   }
   return 0;
  },
  ioctl(stream, request, varargs) {
   return 28;
  },
  fsync(stream) {
   return 28;
  },
  read(stream, buffer, offset, length, position) {
   /* ignored */ var pipe = stream.node.pipe;
   var currentLength = 0;
   for (var i = 0; i < pipe.buckets.length; i++) {
    var bucket = pipe.buckets[i];
    currentLength += bucket.offset - bucket.roffset;
   }
   assert(buffer instanceof ArrayBuffer || buffer instanceof SharedArrayBuffer || ArrayBuffer.isView(buffer));
   var data = buffer.subarray(offset, offset + length);
   if (length <= 0) {
    return 0;
   }
   if (currentLength == 0) {
    throw new FS.ErrnoError(6);
   }
   var toRead = Math.min(currentLength, length);
   var totalRead = toRead;
   var toRemove = 0;
   for (var i = 0; i < pipe.buckets.length; i++) {
    var currBucket = pipe.buckets[i];
    var bucketSize = currBucket.offset - currBucket.roffset;
    if (toRead <= bucketSize) {
     var tmpSlice = currBucket.buffer.subarray(currBucket.roffset, currBucket.offset);
     if (toRead < bucketSize) {
      tmpSlice = tmpSlice.subarray(0, toRead);
      currBucket.roffset += toRead;
     } else {
      toRemove++;
     }
     data.set(tmpSlice);
     break;
    } else {
     var tmpSlice = currBucket.buffer.subarray(currBucket.roffset, currBucket.offset);
     data.set(tmpSlice);
     data = data.subarray(tmpSlice.byteLength);
     toRead -= tmpSlice.byteLength;
     toRemove++;
    }
   }
   if (toRemove && toRemove == pipe.buckets.length) {
    toRemove--;
    pipe.buckets[toRemove].offset = 0;
    pipe.buckets[toRemove].roffset = 0;
   }
   pipe.buckets.splice(0, toRemove);
   return totalRead;
  },
  write(stream, buffer, offset, length, position) {
   /* ignored */ var pipe = stream.node.pipe;
   assert(buffer instanceof ArrayBuffer || buffer instanceof SharedArrayBuffer || ArrayBuffer.isView(buffer));
   var data = buffer.subarray(offset, offset + length);
   var dataLen = data.byteLength;
   if (dataLen <= 0) {
    return 0;
   }
   var currBucket = null;
   if (pipe.buckets.length == 0) {
    currBucket = {
     buffer: new Uint8Array(PIPEFS.BUCKET_BUFFER_SIZE),
     offset: 0,
     roffset: 0
    };
    pipe.buckets.push(currBucket);
   } else {
    currBucket = pipe.buckets[pipe.buckets.length - 1];
   }
   assert(currBucket.offset <= PIPEFS.BUCKET_BUFFER_SIZE);
   var freeBytesInCurrBuffer = PIPEFS.BUCKET_BUFFER_SIZE - currBucket.offset;
   if (freeBytesInCurrBuffer >= dataLen) {
    currBucket.buffer.set(data, currBucket.offset);
    currBucket.offset += dataLen;
    return dataLen;
   } else if (freeBytesInCurrBuffer > 0) {
    currBucket.buffer.set(data.subarray(0, freeBytesInCurrBuffer), currBucket.offset);
    currBucket.offset += freeBytesInCurrBuffer;
    data = data.subarray(freeBytesInCurrBuffer, data.byteLength);
   }
   var numBuckets = (data.byteLength / PIPEFS.BUCKET_BUFFER_SIZE) | 0;
   var remElements = data.byteLength % PIPEFS.BUCKET_BUFFER_SIZE;
   for (var i = 0; i < numBuckets; i++) {
    var newBucket = {
     buffer: new Uint8Array(PIPEFS.BUCKET_BUFFER_SIZE),
     offset: PIPEFS.BUCKET_BUFFER_SIZE,
     roffset: 0
    };
    pipe.buckets.push(newBucket);
    newBucket.buffer.set(data.subarray(0, PIPEFS.BUCKET_BUFFER_SIZE));
    data = data.subarray(PIPEFS.BUCKET_BUFFER_SIZE, data.byteLength);
   }
   if (remElements > 0) {
    var newBucket = {
     buffer: new Uint8Array(PIPEFS.BUCKET_BUFFER_SIZE),
     offset: data.byteLength,
     roffset: 0
    };
    pipe.buckets.push(newBucket);
    newBucket.buffer.set(data);
   }
   return dataLen;
  },
  close(stream) {
   var pipe = stream.node.pipe;
   pipe.refcnt--;
   if (pipe.refcnt === 0) {
    pipe.buckets = null;
   }
  }
 },
 nextname() {
  if (!PIPEFS.nextname.current) {
   PIPEFS.nextname.current = 0;
  }
  return "pipe[" + (PIPEFS.nextname.current++) + "]";
 }
};

function ___syscall_pipe(fdPtr) {
 if (ENVIRONMENT_IS_PTHREAD) return proxyToMainThread(30, 0, 1, fdPtr);
 fdPtr >>>= 0;
 try {
  if (fdPtr == 0) {
   throw new FS.ErrnoError(21);
  }
  var res = PIPEFS.createPipe();
  GROWABLE_HEAP_I32()[((fdPtr) >>> 2) >>> 0] = res.readable_fd;
  GROWABLE_HEAP_I32()[(((fdPtr) + (4)) >>> 2) >>> 0] = res.writable_fd;
  return 0;
 } catch (e) {
  if (typeof FS == "undefined" || !(e.name === "ErrnoError")) throw e;
  return -e.errno;
 }
}

function ___syscall_readlinkat(dirfd, path, buf, bufsize) {
 if (ENVIRONMENT_IS_PTHREAD) return proxyToMainThread(31, 0, 1, dirfd, path, buf, bufsize);
 path >>>= 0;
 buf >>>= 0;
 bufsize >>>= 0;
 try {
  path = SYSCALLS.getStr(path);
  path = SYSCALLS.calculateAt(dirfd, path);
  if (bufsize <= 0) return -28;
  var ret = FS.readlink(path);
  var len = Math.min(bufsize, lengthBytesUTF8(ret));
  var endChar = GROWABLE_HEAP_I8()[buf + len >>> 0];
  stringToUTF8(ret, buf, bufsize + 1);
  GROWABLE_HEAP_I8()[buf + len >>> 0] = endChar;
  return len;
 } catch (e) {
  if (typeof FS == "undefined" || !(e.name === "ErrnoError")) throw e;
  return -e.errno;
 }
}

function ___syscall_recvfrom(fd, buf, len, flags, addr, addrlen) {
 if (ENVIRONMENT_IS_PTHREAD) return proxyToMainThread(32, 0, 1, fd, buf, len, flags, addr, addrlen);
 buf >>>= 0;
 len >>>= 0;
 addr >>>= 0;
 addrlen >>>= 0;
 try {
  var sock = getSocketFromFD(fd);
  var msg = sock.sock_ops.recvmsg(sock, len);
  if (!msg) return 0;
  if (addr) {
   var errno = writeSockaddr(addr, sock.family, DNS.lookup_name(msg.addr), msg.port, addrlen);
   assert(!errno);
  }
  GROWABLE_HEAP_U8().set(msg.buffer, buf >>> 0);
  return msg.buffer.byteLength;
 } catch (e) {
  if (typeof FS == "undefined" || !(e.name === "ErrnoError")) throw e;
  return -e.errno;
 }
}

function ___syscall_recvmsg(fd, message, flags, d1, d2, d3) {
 if (ENVIRONMENT_IS_PTHREAD) return proxyToMainThread(33, 0, 1, fd, message, flags, d1, d2, d3);
 message >>>= 0;
 try {
  var sock = getSocketFromFD(fd);
  var iov = GROWABLE_HEAP_U32()[(((message) + (8)) >>> 2) >>> 0];
  var num = GROWABLE_HEAP_I32()[(((message) + (12)) >>> 2) >>> 0];
  var total = 0;
  for (var i = 0; i < num; i++) {
   total += GROWABLE_HEAP_I32()[(((iov) + ((8 * i) + 4)) >>> 2) >>> 0];
  }
  var msg = sock.sock_ops.recvmsg(sock, total);
  if (!msg) return 0;
  var name = GROWABLE_HEAP_U32()[((message) >>> 2) >>> 0];
  if (name) {
   var errno = writeSockaddr(name, sock.family, DNS.lookup_name(msg.addr), msg.port);
   assert(!errno);
  }
  var bytesRead = 0;
  var bytesRemaining = msg.buffer.byteLength;
  for (var i = 0; bytesRemaining > 0 && i < num; i++) {
   var iovbase = GROWABLE_HEAP_U32()[(((iov) + ((8 * i) + 0)) >>> 2) >>> 0];
   var iovlen = GROWABLE_HEAP_I32()[(((iov) + ((8 * i) + 4)) >>> 2) >>> 0];
   if (!iovlen) {
    continue;
   }
   var length = Math.min(iovlen, bytesRemaining);
   var buf = msg.buffer.subarray(bytesRead, bytesRead + length);
   GROWABLE_HEAP_U8().set(buf, iovbase + bytesRead >>> 0);
   bytesRead += length;
   bytesRemaining -= length;
  }
  return bytesRead;
 } catch (e) {
  if (typeof FS == "undefined" || !(e.name === "ErrnoError")) throw e;
  return -e.errno;
 }
}

function ___syscall_renameat(olddirfd, oldpath, newdirfd, newpath) {
 if (ENVIRONMENT_IS_PTHREAD) return proxyToMainThread(34, 0, 1, olddirfd, oldpath, newdirfd, newpath);
 oldpath >>>= 0;
 newpath >>>= 0;
 try {
  oldpath = SYSCALLS.getStr(oldpath);
  newpath = SYSCALLS.getStr(newpath);
  oldpath = SYSCALLS.calculateAt(olddirfd, oldpath);
  newpath = SYSCALLS.calculateAt(newdirfd, newpath);
  FS.rename(oldpath, newpath);
  return 0;
 } catch (e) {
  if (typeof FS == "undefined" || !(e.name === "ErrnoError")) throw e;
  return -e.errno;
 }
}

function ___syscall_rmdir(path) {
 if (ENVIRONMENT_IS_PTHREAD) return proxyToMainThread(35, 0, 1, path);
 path >>>= 0;
 try {
  path = SYSCALLS.getStr(path);
  FS.rmdir(path);
  return 0;
 } catch (e) {
  if (typeof FS == "undefined" || !(e.name === "ErrnoError")) throw e;
  return -e.errno;
 }
}

function ___syscall_sendmsg(fd, message, flags, d1, d2, d3) {
 if (ENVIRONMENT_IS_PTHREAD) return proxyToMainThread(36, 0, 1, fd, message, flags, d1, d2, d3);
 message >>>= 0;
 d1 >>>= 0;
 d2 >>>= 0;
 try {
  var sock = getSocketFromFD(fd);
  var iov = GROWABLE_HEAP_U32()[(((message) + (8)) >>> 2) >>> 0];
  var num = GROWABLE_HEAP_I32()[(((message) + (12)) >>> 2) >>> 0];
  var addr, port;
  var name = GROWABLE_HEAP_U32()[((message) >>> 2) >>> 0];
  var namelen = GROWABLE_HEAP_I32()[(((message) + (4)) >>> 2) >>> 0];
  if (name) {
   var info = readSockaddr(name, namelen);
   if (info.errno) return -info.errno;
   port = info.port;
   addr = DNS.lookup_addr(info.addr) || info.addr;
  }
  var total = 0;
  for (var i = 0; i < num; i++) {
   total += GROWABLE_HEAP_I32()[(((iov) + ((8 * i) + 4)) >>> 2) >>> 0];
  }
  var view = new Uint8Array(total);
  var offset = 0;
  for (var i = 0; i < num; i++) {
   var iovbase = GROWABLE_HEAP_U32()[(((iov) + ((8 * i) + 0)) >>> 2) >>> 0];
   var iovlen = GROWABLE_HEAP_I32()[(((iov) + ((8 * i) + 4)) >>> 2) >>> 0];
   for (var j = 0; j < iovlen; j++) {
    view[offset++] = GROWABLE_HEAP_I8()[(iovbase) + (j) >>> 0];
   }
  }
  return sock.sock_ops.sendmsg(sock, view, 0, total, addr, port);
 } catch (e) {
  if (typeof FS == "undefined" || !(e.name === "ErrnoError")) throw e;
  return -e.errno;
 }
}

function ___syscall_sendto(fd, message, length, flags, addr, addr_len) {
 if (ENVIRONMENT_IS_PTHREAD) return proxyToMainThread(37, 0, 1, fd, message, length, flags, addr, addr_len);
 message >>>= 0;
 length >>>= 0;
 addr >>>= 0;
 addr_len >>>= 0;
 try {
  var sock = getSocketFromFD(fd);
  var dest = getSocketAddress(addr, addr_len, true);
  if (!dest) {
   return FS.write(sock.stream, GROWABLE_HEAP_I8(), message, length);
  }
  return sock.sock_ops.sendmsg(sock, GROWABLE_HEAP_I8(), message, length, dest.addr, dest.port);
 } catch (e) {
  if (typeof FS == "undefined" || !(e.name === "ErrnoError")) throw e;
  return -e.errno;
 }
}

function ___syscall_socket(domain, type, protocol) {
 if (ENVIRONMENT_IS_PTHREAD) return proxyToMainThread(38, 0, 1, domain, type, protocol);
 var sock = SOCKFS.createSocket(domain, type, protocol);
 return sock.stream.fd;
}

function ___syscall_stat64(path, buf) {
 if (ENVIRONMENT_IS_PTHREAD) return proxyToMainThread(39, 0, 1, path, buf);
 path >>>= 0;
 buf >>>= 0;
 try {
  path = SYSCALLS.getStr(path);
  return SYSCALLS.doStat(FS.stat, path, buf);
 } catch (e) {
  if (typeof FS == "undefined" || !(e.name === "ErrnoError")) throw e;
  return -e.errno;
 }
}

function ___syscall_statfs64(path, size, buf) {
 if (ENVIRONMENT_IS_PTHREAD) return proxyToMainThread(40, 0, 1, path, size, buf);
 path >>>= 0;
 size >>>= 0;
 buf >>>= 0;
 try {
  path = SYSCALLS.getStr(path);
  assert(size === 64);
  GROWABLE_HEAP_I32()[(((buf) + (4)) >>> 2) >>> 0] = 4096;
  GROWABLE_HEAP_I32()[(((buf) + (40)) >>> 2) >>> 0] = 4096;
  GROWABLE_HEAP_I32()[(((buf) + (8)) >>> 2) >>> 0] = 1e6;
  GROWABLE_HEAP_I32()[(((buf) + (12)) >>> 2) >>> 0] = 5e5;
  GROWABLE_HEAP_I32()[(((buf) + (16)) >>> 2) >>> 0] = 5e5;
  GROWABLE_HEAP_I32()[(((buf) + (20)) >>> 2) >>> 0] = FS.nextInode;
  GROWABLE_HEAP_I32()[(((buf) + (24)) >>> 2) >>> 0] = 1e6;
  GROWABLE_HEAP_I32()[(((buf) + (28)) >>> 2) >>> 0] = 42;
  GROWABLE_HEAP_I32()[(((buf) + (44)) >>> 2) >>> 0] = 2;
  GROWABLE_HEAP_I32()[(((buf) + (36)) >>> 2) >>> 0] = 255;
  return 0;
 } catch (e) {
  if (typeof FS == "undefined" || !(e.name === "ErrnoError")) throw e;
  return -e.errno;
 }
}

function ___syscall_symlink(target, linkpath) {
 if (ENVIRONMENT_IS_PTHREAD) return proxyToMainThread(41, 0, 1, target, linkpath);
 target >>>= 0;
 linkpath >>>= 0;
 try {
  target = SYSCALLS.getStr(target);
  linkpath = SYSCALLS.getStr(linkpath);
  FS.symlink(target, linkpath);
  return 0;
 } catch (e) {
  if (typeof FS == "undefined" || !(e.name === "ErrnoError")) throw e;
  return -e.errno;
 }
}

function ___syscall_truncate64(path, length) {
 if (ENVIRONMENT_IS_PTHREAD) return proxyToMainThread(42, 0, 1, path, length);
 path >>>= 0;
 length = bigintToI53Checked(length);
 try {
  if (isNaN(length)) return 61;
  path = SYSCALLS.getStr(path);
  FS.truncate(path, length);
  return 0;
 } catch (e) {
  if (typeof FS == "undefined" || !(e.name === "ErrnoError")) throw e;
  return -e.errno;
 }
}

function ___syscall_unlinkat(dirfd, path, flags) {
 if (ENVIRONMENT_IS_PTHREAD) return proxyToMainThread(43, 0, 1, dirfd, path, flags);
 path >>>= 0;
 try {
  path = SYSCALLS.getStr(path);
  path = SYSCALLS.calculateAt(dirfd, path);
  if (flags === 0) {
   FS.unlink(path);
  } else if (flags === 512) {
   FS.rmdir(path);
  } else {
   abort("Invalid flags passed to unlinkat");
  }
  return 0;
 } catch (e) {
  if (typeof FS == "undefined" || !(e.name === "ErrnoError")) throw e;
  return -e.errno;
 }
}

var readI53FromI64 = ptr => GROWABLE_HEAP_U32()[((ptr) >>> 2) >>> 0] + GROWABLE_HEAP_I32()[(((ptr) + (4)) >>> 2) >>> 0] * 4294967296;

function ___syscall_utimensat(dirfd, path, times, flags) {
 if (ENVIRONMENT_IS_PTHREAD) return proxyToMainThread(44, 0, 1, dirfd, path, times, flags);
 path >>>= 0;
 times >>>= 0;
 try {
  path = SYSCALLS.getStr(path);
  assert(flags === 0);
  path = SYSCALLS.calculateAt(dirfd, path, true);
  if (!times) {
   var atime = Date.now();
   var mtime = atime;
  } else {
   var seconds = readI53FromI64(times);
   var nanoseconds = GROWABLE_HEAP_I32()[(((times) + (8)) >>> 2) >>> 0];
   atime = (seconds * 1e3) + (nanoseconds / (1e3 * 1e3));
   times += 16;
   seconds = readI53FromI64(times);
   nanoseconds = GROWABLE_HEAP_I32()[(((times) + (8)) >>> 2) >>> 0];
   mtime = (seconds * 1e3) + (nanoseconds / (1e3 * 1e3));
  }
  FS.utime(path, atime, mtime);
  return 0;
 } catch (e) {
  if (typeof FS == "undefined" || !(e.name === "ErrnoError")) throw e;
  return -e.errno;
 }
}

var nowIsMonotonic = 1;

var __emscripten_get_now_is_monotonic = () => nowIsMonotonic;

function __emscripten_lookup_name(name) {
 if (ENVIRONMENT_IS_PTHREAD) return proxyToMainThread(45, 0, 1, name);
 name >>>= 0;
 var nameString = UTF8ToString(name);
 return inetPton4(DNS.lookup_name(nameString));
}

var maybeExit = () => {
 if (!keepRuntimeAlive()) {
  try {
   if (ENVIRONMENT_IS_PTHREAD) __emscripten_thread_exit(EXITSTATUS); else _exit(EXITSTATUS);
  } catch (e) {
   handleException(e);
  }
 }
};

var callUserCallback = func => {
 if (ABORT) {
  err("user callback triggered after runtime exited or application aborted.  Ignoring.");
  return;
 }
 try {
  func();
  maybeExit();
 } catch (e) {
  handleException(e);
 }
};

function __emscripten_thread_mailbox_await(pthread_ptr) {
 pthread_ptr >>>= 0;
 if (typeof Atomics.waitAsync === "function") {
  var wait = Atomics.waitAsync(GROWABLE_HEAP_I32(), ((pthread_ptr) >>> 2), pthread_ptr);
  assert(wait.async);
  wait.value.then(checkMailbox);
  var waitingAsync = pthread_ptr + 128;
  Atomics.store(GROWABLE_HEAP_I32(), ((waitingAsync) >>> 2), 1);
 }
}

Module["__emscripten_thread_mailbox_await"] = __emscripten_thread_mailbox_await;

var checkMailbox = () => {
 var pthread_ptr = _pthread_self();
 if (pthread_ptr) {
  __emscripten_thread_mailbox_await(pthread_ptr);
  callUserCallback(__emscripten_check_mailbox);
 }
};

Module["checkMailbox"] = checkMailbox;

function __emscripten_notify_mailbox_postmessage(targetThreadId, currThreadId, mainThreadId) {
 targetThreadId >>>= 0;
 currThreadId >>>= 0;
 mainThreadId >>>= 0;
 if (targetThreadId == currThreadId) {
  setTimeout(checkMailbox);
 } else if (ENVIRONMENT_IS_PTHREAD) {
  postMessage({
   "targetThread": targetThreadId,
   "cmd": "checkMailbox"
  });
 } else {
  var worker = PThread.pthreads[targetThreadId];
  if (!worker) {
   err(\`Cannot send message to thread with ID \${targetThreadId}, unknown thread ID!\`);
   return;
  }
  worker.postMessage({
   "cmd": "checkMailbox"
  });
 }
}

var webgl_enable_ANGLE_instanced_arrays = ctx => {
 var ext = ctx.getExtension("ANGLE_instanced_arrays");
 if (ext) {
  ctx["vertexAttribDivisor"] = (index, divisor) => ext["vertexAttribDivisorANGLE"](index, divisor);
  ctx["drawArraysInstanced"] = (mode, first, count, primcount) => ext["drawArraysInstancedANGLE"](mode, first, count, primcount);
  ctx["drawElementsInstanced"] = (mode, count, type, indices, primcount) => ext["drawElementsInstancedANGLE"](mode, count, type, indices, primcount);
  return 1;
 }
};

var webgl_enable_OES_vertex_array_object = ctx => {
 var ext = ctx.getExtension("OES_vertex_array_object");
 if (ext) {
  ctx["createVertexArray"] = () => ext["createVertexArrayOES"]();
  ctx["deleteVertexArray"] = vao => ext["deleteVertexArrayOES"](vao);
  ctx["bindVertexArray"] = vao => ext["bindVertexArrayOES"](vao);
  ctx["isVertexArray"] = vao => ext["isVertexArrayOES"](vao);
  return 1;
 }
};

var webgl_enable_WEBGL_draw_buffers = ctx => {
 var ext = ctx.getExtension("WEBGL_draw_buffers");
 if (ext) {
  ctx["drawBuffers"] = (n, bufs) => ext["drawBuffersWEBGL"](n, bufs);
  return 1;
 }
};

var webgl_enable_WEBGL_draw_instanced_base_vertex_base_instance = ctx => !!(ctx.dibvbi = ctx.getExtension("WEBGL_draw_instanced_base_vertex_base_instance"));

var webgl_enable_WEBGL_multi_draw_instanced_base_vertex_base_instance = ctx => !!(ctx.mdibvbi = ctx.getExtension("WEBGL_multi_draw_instanced_base_vertex_base_instance"));

var webgl_enable_WEBGL_multi_draw = ctx => !!(ctx.multiDrawWebgl = ctx.getExtension("WEBGL_multi_draw"));

var getEmscriptenSupportedExtensions = ctx => {
 var supportedExtensions = [ "ANGLE_instanced_arrays", "EXT_blend_minmax", "EXT_disjoint_timer_query", "EXT_frag_depth", "EXT_shader_texture_lod", "EXT_sRGB", "OES_element_index_uint", "OES_fbo_render_mipmap", "OES_standard_derivatives", "OES_texture_float", "OES_texture_half_float", "OES_texture_half_float_linear", "OES_vertex_array_object", "WEBGL_color_buffer_float", "WEBGL_depth_texture", "WEBGL_draw_buffers", "EXT_color_buffer_float", "EXT_conservative_depth", "EXT_disjoint_timer_query_webgl2", "EXT_texture_norm16", "NV_shader_noperspective_interpolation", "WEBGL_clip_cull_distance", "EXT_color_buffer_half_float", "EXT_depth_clamp", "EXT_float_blend", "EXT_texture_compression_bptc", "EXT_texture_compression_rgtc", "EXT_texture_filter_anisotropic", "KHR_parallel_shader_compile", "OES_texture_float_linear", "WEBGL_blend_func_extended", "WEBGL_compressed_texture_astc", "WEBGL_compressed_texture_etc", "WEBGL_compressed_texture_etc1", "WEBGL_compressed_texture_s3tc", "WEBGL_compressed_texture_s3tc_srgb", "WEBGL_debug_renderer_info", "WEBGL_debug_shaders", "WEBGL_lose_context", "WEBGL_multi_draw" ];
 return (ctx.getSupportedExtensions() || []).filter(ext => supportedExtensions.includes(ext));
};

var GL = {
 counter: 1,
 buffers: [],
 mappedBuffers: {},
 programs: [],
 framebuffers: [],
 renderbuffers: [],
 textures: [],
 shaders: [],
 vaos: [],
 contexts: {},
 offscreenCanvases: {},
 queries: [],
 samplers: [],
 transformFeedbacks: [],
 syncs: [],
 byteSizeByTypeRoot: 5120,
 byteSizeByType: [ 1, 1, 2, 2, 4, 4, 4, 2, 3, 4, 8 ],
 stringCache: {},
 stringiCache: {},
 unpackAlignment: 4,
 recordError: errorCode => {
  if (!GL.lastError) {
   GL.lastError = errorCode;
  }
 },
 getNewId: table => {
  var ret = GL.counter++;
  for (var i = table.length; i < ret; i++) {
   table[i] = null;
  }
  return ret;
 },
 genObject: (n, buffers, createFunction, objectTable) => {
  for (var i = 0; i < n; i++) {
   var buffer = GLctx[createFunction]();
   var id = buffer && GL.getNewId(objectTable);
   if (buffer) {
    buffer.name = id;
    objectTable[id] = buffer;
   } else {
    GL.recordError(1282);
   }
   GROWABLE_HEAP_I32()[(((buffers) + (i * 4)) >>> 2) >>> 0] = id;
  }
 },
 MAX_TEMP_BUFFER_SIZE: 2097152,
 numTempVertexBuffersPerSize: 64,
 log2ceilLookup: i => 32 - Math.clz32(i === 0 ? 0 : i - 1),
 generateTempBuffers: (quads, context) => {
  var largestIndex = GL.log2ceilLookup(GL.MAX_TEMP_BUFFER_SIZE);
  context.tempVertexBufferCounters1 = [];
  context.tempVertexBufferCounters2 = [];
  context.tempVertexBufferCounters1.length = context.tempVertexBufferCounters2.length = largestIndex + 1;
  context.tempVertexBuffers1 = [];
  context.tempVertexBuffers2 = [];
  context.tempVertexBuffers1.length = context.tempVertexBuffers2.length = largestIndex + 1;
  context.tempIndexBuffers = [];
  context.tempIndexBuffers.length = largestIndex + 1;
  for (var i = 0; i <= largestIndex; ++i) {
   context.tempIndexBuffers[i] = null;
   context.tempVertexBufferCounters1[i] = context.tempVertexBufferCounters2[i] = 0;
   var ringbufferLength = GL.numTempVertexBuffersPerSize;
   context.tempVertexBuffers1[i] = [];
   context.tempVertexBuffers2[i] = [];
   var ringbuffer1 = context.tempVertexBuffers1[i];
   var ringbuffer2 = context.tempVertexBuffers2[i];
   ringbuffer1.length = ringbuffer2.length = ringbufferLength;
   for (var j = 0; j < ringbufferLength; ++j) {
    ringbuffer1[j] = ringbuffer2[j] = null;
   }
  }
  if (quads) {
   context.tempQuadIndexBuffer = GLctx.createBuffer();
   context.GLctx.bindBuffer(34963, /*GL_ELEMENT_ARRAY_BUFFER*/ context.tempQuadIndexBuffer);
   var numIndexes = GL.MAX_TEMP_BUFFER_SIZE >> 1;
   var quadIndexes = new Uint16Array(numIndexes);
   var i = 0, v = 0;
   while (1) {
    quadIndexes[i++] = v;
    if (i >= numIndexes) break;
    quadIndexes[i++] = v + 1;
    if (i >= numIndexes) break;
    quadIndexes[i++] = v + 2;
    if (i >= numIndexes) break;
    quadIndexes[i++] = v;
    if (i >= numIndexes) break;
    quadIndexes[i++] = v + 2;
    if (i >= numIndexes) break;
    quadIndexes[i++] = v + 3;
    if (i >= numIndexes) break;
    v += 4;
   }
   context.GLctx.bufferData(34963, /*GL_ELEMENT_ARRAY_BUFFER*/ quadIndexes, 35044);
   /*GL_STATIC_DRAW*/ context.GLctx.bindBuffer(34963, /*GL_ELEMENT_ARRAY_BUFFER*/ null);
  }
 },
 getTempVertexBuffer: sizeBytes => {
  var idx = GL.log2ceilLookup(sizeBytes);
  var ringbuffer = GL.currentContext.tempVertexBuffers1[idx];
  var nextFreeBufferIndex = GL.currentContext.tempVertexBufferCounters1[idx];
  GL.currentContext.tempVertexBufferCounters1[idx] = (GL.currentContext.tempVertexBufferCounters1[idx] + 1) & (GL.numTempVertexBuffersPerSize - 1);
  var vbo = ringbuffer[nextFreeBufferIndex];
  if (vbo) {
   return vbo;
  }
  var prevVBO = GLctx.getParameter(34964);
  /*GL_ARRAY_BUFFER_BINDING*/ ringbuffer[nextFreeBufferIndex] = GLctx.createBuffer();
  GLctx.bindBuffer(34962, /*GL_ARRAY_BUFFER*/ ringbuffer[nextFreeBufferIndex]);
  GLctx.bufferData(34962, /*GL_ARRAY_BUFFER*/ 1 << idx, 35048);
  /*GL_DYNAMIC_DRAW*/ GLctx.bindBuffer(34962, /*GL_ARRAY_BUFFER*/ prevVBO);
  return ringbuffer[nextFreeBufferIndex];
 },
 getTempIndexBuffer: sizeBytes => {
  var idx = GL.log2ceilLookup(sizeBytes);
  var ibo = GL.currentContext.tempIndexBuffers[idx];
  if (ibo) {
   return ibo;
  }
  var prevIBO = GLctx.getParameter(34965);
  /*ELEMENT_ARRAY_BUFFER_BINDING*/ GL.currentContext.tempIndexBuffers[idx] = GLctx.createBuffer();
  GLctx.bindBuffer(34963, /*GL_ELEMENT_ARRAY_BUFFER*/ GL.currentContext.tempIndexBuffers[idx]);
  GLctx.bufferData(34963, /*GL_ELEMENT_ARRAY_BUFFER*/ 1 << idx, 35048);
  /*GL_DYNAMIC_DRAW*/ GLctx.bindBuffer(34963, /*GL_ELEMENT_ARRAY_BUFFER*/ prevIBO);
  return GL.currentContext.tempIndexBuffers[idx];
 },
 newRenderingFrameStarted: () => {
  if (!GL.currentContext) {
   return;
  }
  var vb = GL.currentContext.tempVertexBuffers1;
  GL.currentContext.tempVertexBuffers1 = GL.currentContext.tempVertexBuffers2;
  GL.currentContext.tempVertexBuffers2 = vb;
  vb = GL.currentContext.tempVertexBufferCounters1;
  GL.currentContext.tempVertexBufferCounters1 = GL.currentContext.tempVertexBufferCounters2;
  GL.currentContext.tempVertexBufferCounters2 = vb;
  var largestIndex = GL.log2ceilLookup(GL.MAX_TEMP_BUFFER_SIZE);
  for (var i = 0; i <= largestIndex; ++i) {
   GL.currentContext.tempVertexBufferCounters1[i] = 0;
  }
 },
 getSource: (shader, count, string, length) => {
  var source = "";
  for (var i = 0; i < count; ++i) {
   var len = length ? GROWABLE_HEAP_U32()[(((length) + (i * 4)) >>> 2) >>> 0] : undefined;
   source += UTF8ToString(GROWABLE_HEAP_U32()[(((string) + (i * 4)) >>> 2) >>> 0], len);
  }
  return source;
 },
 calcBufLength: (size, type, stride, count) => {
  if (stride > 0) {
   return count * stride;
  }
  var typeSize = GL.byteSizeByType[type - GL.byteSizeByTypeRoot];
  return size * typeSize * count;
 },
 usedTempBuffers: [],
 preDrawHandleClientVertexAttribBindings: count => {
  GL.resetBufferBinding = false;
  for (var i = 0; i < GL.currentContext.maxVertexAttribs; ++i) {
   var cb = GL.currentContext.clientBuffers[i];
   if (!cb.clientside || !cb.enabled) continue;
   GL.resetBufferBinding = true;
   var size = GL.calcBufLength(cb.size, cb.type, cb.stride, count);
   var buf = GL.getTempVertexBuffer(size);
   GLctx.bindBuffer(34962, /*GL_ARRAY_BUFFER*/ buf);
   GLctx.bufferSubData(34962, 0, GROWABLE_HEAP_U8().subarray(cb.ptr >>> 0, cb.ptr + size >>> 0));
   cb.vertexAttribPointerAdaptor.call(GLctx, i, cb.size, cb.type, cb.normalized, cb.stride, 0);
  }
 },
 postDrawHandleClientVertexAttribBindings: () => {
  if (GL.resetBufferBinding) {
   GLctx.bindBuffer(34962, /*GL_ARRAY_BUFFER*/ GL.buffers[GLctx.currentArrayBufferBinding]);
  }
 },
 createContext: (/** @type {HTMLCanvasElement} */ canvas, webGLContextAttributes) => {
  if (webGLContextAttributes.renderViaOffscreenBackBuffer) webGLContextAttributes["preserveDrawingBuffer"] = true;
  if (!canvas.getContextSafariWebGL2Fixed) {
   canvas.getContextSafariWebGL2Fixed = canvas.getContext;
   /** @type {function(this:HTMLCanvasElement, string, (Object|null)=): (Object|null)} */ function fixedGetContext(ver, attrs) {
    var gl = canvas.getContextSafariWebGL2Fixed(ver, attrs);
    return ((ver == "webgl") == (gl instanceof WebGLRenderingContext)) ? gl : null;
   }
   canvas.getContext = fixedGetContext;
  }
  var ctx = (webGLContextAttributes.majorVersion > 1) ? canvas.getContext("webgl2", webGLContextAttributes) : (canvas.getContext("webgl", webGLContextAttributes));
  if (!ctx) return 0;
  var handle = GL.registerContext(ctx, webGLContextAttributes);
  return handle;
 },
 enableOffscreenFramebufferAttributes: webGLContextAttributes => {
  webGLContextAttributes.renderViaOffscreenBackBuffer = true;
  webGLContextAttributes.preserveDrawingBuffer = true;
 },
 createOffscreenFramebuffer: context => {
  var gl = context.GLctx;
  var fbo = gl.createFramebuffer();
  gl.bindFramebuffer(36160, /*GL_FRAMEBUFFER*/ fbo);
  context.defaultFbo = fbo;
  context.defaultFboForbidBlitFramebuffer = false;
  if (gl.getContextAttributes().antialias) {
   context.defaultFboForbidBlitFramebuffer = true;
  }
  context.defaultColorTarget = gl.createTexture();
  context.defaultDepthTarget = gl.createRenderbuffer();
  GL.resizeOffscreenFramebuffer(context);
  gl.bindTexture(3553, /*GL_TEXTURE_2D*/ context.defaultColorTarget);
  gl.texParameteri(3553, /*GL_TEXTURE_2D*/ 10241, /*GL_TEXTURE_MIN_FILTER*/ 9728);
  /*GL_NEAREST*/ gl.texParameteri(3553, /*GL_TEXTURE_2D*/ 10240, /*GL_TEXTURE_MAG_FILTER*/ 9728);
  /*GL_NEAREST*/ gl.texParameteri(3553, /*GL_TEXTURE_2D*/ 10242, /*GL_TEXTURE_WRAP_S*/ 33071);
  /*GL_CLAMP_TO_EDGE*/ gl.texParameteri(3553, /*GL_TEXTURE_2D*/ 10243, /*GL_TEXTURE_WRAP_T*/ 33071);
  /*GL_CLAMP_TO_EDGE*/ gl.texImage2D(3553, /*GL_TEXTURE_2D*/ 0, 6408, /*GL_RGBA*/ gl.canvas.width, gl.canvas.height, 0, 6408, /*GL_RGBA*/ 5121, /*GL_UNSIGNED_BYTE*/ null);
  gl.framebufferTexture2D(36160, /*GL_FRAMEBUFFER*/ 36064, /*GL_COLOR_ATTACHMENT0*/ 3553, /*GL_TEXTURE_2D*/ context.defaultColorTarget, 0);
  gl.bindTexture(3553, /*GL_TEXTURE_2D*/ null);
  var depthTarget = gl.createRenderbuffer();
  gl.bindRenderbuffer(36161, /*GL_RENDERBUFFER*/ context.defaultDepthTarget);
  gl.renderbufferStorage(36161, /*GL_RENDERBUFFER*/ 33189, /*GL_DEPTH_COMPONENT16*/ gl.canvas.width, gl.canvas.height);
  gl.framebufferRenderbuffer(36160, /*GL_FRAMEBUFFER*/ 36096, /*GL_DEPTH_ATTACHMENT*/ 36161, /*GL_RENDERBUFFER*/ context.defaultDepthTarget);
  gl.bindRenderbuffer(36161, /*GL_RENDERBUFFER*/ null);
  var vertices = [ -1, -1, -1, 1, 1, -1, 1, 1 ];
  var vb = gl.createBuffer();
  gl.bindBuffer(34962, /*GL_ARRAY_BUFFER*/ vb);
  gl.bufferData(34962, /*GL_ARRAY_BUFFER*/ new Float32Array(vertices), 35044);
  /*GL_STATIC_DRAW*/ gl.bindBuffer(34962, /*GL_ARRAY_BUFFER*/ null);
  context.blitVB = vb;
  var vsCode = "attribute vec2 pos;" + "varying lowp vec2 tex;" + "void main() { tex = pos * 0.5 + vec2(0.5,0.5); gl_Position = vec4(pos, 0.0, 1.0); }";
  var vs = gl.createShader(35633);
  /*GL_VERTEX_SHADER*/ gl.shaderSource(vs, vsCode);
  gl.compileShader(vs);
  var fsCode = "varying lowp vec2 tex;" + "uniform sampler2D sampler;" + "void main() { gl_FragColor = texture2D(sampler, tex); }";
  var fs = gl.createShader(35632);
  /*GL_FRAGMENT_SHADER*/ gl.shaderSource(fs, fsCode);
  gl.compileShader(fs);
  var blitProgram = gl.createProgram();
  gl.attachShader(blitProgram, vs);
  gl.attachShader(blitProgram, fs);
  gl.linkProgram(blitProgram);
  context.blitProgram = blitProgram;
  context.blitPosLoc = gl.getAttribLocation(blitProgram, "pos");
  gl.useProgram(blitProgram);
  gl.uniform1i(gl.getUniformLocation(blitProgram, "sampler"), 0);
  gl.useProgram(null);
  context.defaultVao = undefined;
  if (gl.createVertexArray) {
   context.defaultVao = gl.createVertexArray();
   gl.bindVertexArray(context.defaultVao);
   gl.enableVertexAttribArray(context.blitPosLoc);
   gl.bindVertexArray(null);
  }
 },
 resizeOffscreenFramebuffer: context => {
  var gl = context.GLctx;
  if (context.defaultColorTarget) {
   var prevTextureBinding = gl.getParameter(32873);
   /*GL_TEXTURE_BINDING_2D*/ gl.bindTexture(3553, /*GL_TEXTURE_2D*/ context.defaultColorTarget);
   gl.texImage2D(3553, /*GL_TEXTURE_2D*/ 0, 6408, /*GL_RGBA*/ gl.drawingBufferWidth, gl.drawingBufferHeight, 0, 6408, /*GL_RGBA*/ 5121, /*GL_UNSIGNED_BYTE*/ null);
   gl.bindTexture(3553, /*GL_TEXTURE_2D*/ prevTextureBinding);
  }
  if (context.defaultDepthTarget) {
   var prevRenderBufferBinding = gl.getParameter(36007);
   /*GL_RENDERBUFFER_BINDING*/ gl.bindRenderbuffer(36161, /*GL_RENDERBUFFER*/ context.defaultDepthTarget);
   gl.renderbufferStorage(36161, /*GL_RENDERBUFFER*/ 33189, /*GL_DEPTH_COMPONENT16*/ gl.drawingBufferWidth, gl.drawingBufferHeight);
   gl.bindRenderbuffer(36161, /*GL_RENDERBUFFER*/ prevRenderBufferBinding);
  }
 },
 blitOffscreenFramebuffer: context => {
  var gl = context.GLctx;
  var prevScissorTest = gl.getParameter(3089);
  /*GL_SCISSOR_TEST*/ if (prevScissorTest) gl.disable(3089);
  /*GL_SCISSOR_TEST*/ var prevFbo = gl.getParameter(36006);
  /*GL_FRAMEBUFFER_BINDING*/ if (gl.blitFramebuffer && !context.defaultFboForbidBlitFramebuffer) {
   gl.bindFramebuffer(36008, /*GL_READ_FRAMEBUFFER*/ context.defaultFbo);
   gl.bindFramebuffer(36009, /*GL_DRAW_FRAMEBUFFER*/ null);
   gl.blitFramebuffer(0, 0, gl.canvas.width, gl.canvas.height, 0, 0, gl.canvas.width, gl.canvas.height, 16384, /*GL_COLOR_BUFFER_BIT*/ 9728);
  } else {
   gl.bindFramebuffer(36160, /*GL_FRAMEBUFFER*/ null);
   var prevProgram = gl.getParameter(35725);
   /*GL_CURRENT_PROGRAM*/ gl.useProgram(context.blitProgram);
   var prevVB = gl.getParameter(34964);
   /*GL_ARRAY_BUFFER_BINDING*/ gl.bindBuffer(34962, /*GL_ARRAY_BUFFER*/ context.blitVB);
   var prevActiveTexture = gl.getParameter(34016);
   /*GL_ACTIVE_TEXTURE*/ gl.activeTexture(33984);
   /*GL_TEXTURE0*/ var prevTextureBinding = gl.getParameter(32873);
   /*GL_TEXTURE_BINDING_2D*/ gl.bindTexture(3553, /*GL_TEXTURE_2D*/ context.defaultColorTarget);
   var prevBlend = gl.getParameter(3042);
   /*GL_BLEND*/ if (prevBlend) gl.disable(3042);
   /*GL_BLEND*/ var prevCullFace = gl.getParameter(2884);
   /*GL_CULL_FACE*/ if (prevCullFace) gl.disable(2884);
   /*GL_CULL_FACE*/ var prevDepthTest = gl.getParameter(2929);
   /*GL_DEPTH_TEST*/ if (prevDepthTest) gl.disable(2929);
   /*GL_DEPTH_TEST*/ var prevStencilTest = gl.getParameter(2960);
   /*GL_STENCIL_TEST*/ if (prevStencilTest) gl.disable(2960);
   /*GL_STENCIL_TEST*/ function draw() {
    gl.vertexAttribPointer(context.blitPosLoc, 2, 5126, /*GL_FLOAT*/ false, 0, 0);
    gl.drawArrays(5, /*GL_TRIANGLE_STRIP*/ 0, 4);
   }
   if (context.defaultVao) {
    var prevVAO = gl.getParameter(34229);
    /*GL_VERTEX_ARRAY_BINDING*/ gl.bindVertexArray(context.defaultVao);
    draw();
    gl.bindVertexArray(prevVAO);
   } else {
    var prevVertexAttribPointer = {
     buffer: gl.getVertexAttrib(context.blitPosLoc, 34975),
     /*GL_VERTEX_ATTRIB_ARRAY_BUFFER_BINDING*/ size: gl.getVertexAttrib(context.blitPosLoc, 34339),
     /*GL_VERTEX_ATTRIB_ARRAY_SIZE*/ stride: gl.getVertexAttrib(context.blitPosLoc, 34340),
     /*GL_VERTEX_ATTRIB_ARRAY_STRIDE*/ type: gl.getVertexAttrib(context.blitPosLoc, 34341),
     /*GL_VERTEX_ATTRIB_ARRAY_TYPE*/ normalized: gl.getVertexAttrib(context.blitPosLoc, 34922),
     /*GL_VERTEX_ATTRIB_ARRAY_NORMALIZED*/ pointer: gl.getVertexAttribOffset(context.blitPosLoc, 34373)
    };
    var maxVertexAttribs = gl.getParameter(34921);
    /*GL_MAX_VERTEX_ATTRIBS*/ var prevVertexAttribEnables = [];
    for (var i = 0; i < maxVertexAttribs; ++i) {
     var prevEnabled = gl.getVertexAttrib(i, 34338);
     /*GL_VERTEX_ATTRIB_ARRAY_ENABLED*/ var wantEnabled = i == context.blitPosLoc;
     if (prevEnabled && !wantEnabled) {
      gl.disableVertexAttribArray(i);
     }
     if (!prevEnabled && wantEnabled) {
      gl.enableVertexAttribArray(i);
     }
     prevVertexAttribEnables[i] = prevEnabled;
    }
    draw();
    for (var i = 0; i < maxVertexAttribs; ++i) {
     var prevEnabled = prevVertexAttribEnables[i];
     var nowEnabled = i == context.blitPosLoc;
     if (prevEnabled && !nowEnabled) {
      gl.enableVertexAttribArray(i);
     }
     if (!prevEnabled && nowEnabled) {
      gl.disableVertexAttribArray(i);
     }
    }
    gl.bindBuffer(34962, /*GL_ARRAY_BUFFER*/ prevVertexAttribPointer.buffer);
    gl.vertexAttribPointer(context.blitPosLoc, prevVertexAttribPointer.size, prevVertexAttribPointer.type, prevVertexAttribPointer.normalized, prevVertexAttribPointer.stride, prevVertexAttribPointer.offset);
   }
   if (prevStencilTest) gl.enable(2960);
   /*GL_STENCIL_TEST*/ if (prevDepthTest) gl.enable(2929);
   /*GL_DEPTH_TEST*/ if (prevCullFace) gl.enable(2884);
   /*GL_CULL_FACE*/ if (prevBlend) gl.enable(3042);
   /*GL_BLEND*/ gl.bindTexture(3553, /*GL_TEXTURE_2D*/ prevTextureBinding);
   gl.activeTexture(prevActiveTexture);
   gl.bindBuffer(34962, /*GL_ARRAY_BUFFER*/ prevVB);
   gl.useProgram(prevProgram);
  }
  gl.bindFramebuffer(36160, /*GL_FRAMEBUFFER*/ prevFbo);
  if (prevScissorTest) gl.enable(3089);
 },
 /*GL_SCISSOR_TEST*/ registerContext: (ctx, webGLContextAttributes) => {
  var handle = _malloc(8);
  GROWABLE_HEAP_I32()[((handle) >>> 2) >>> 0] = webGLContextAttributes.explicitSwapControl;
  GROWABLE_HEAP_U32()[(((handle) + (4)) >>> 2) >>> 0] = _pthread_self();
  var context = {
   handle: handle,
   attributes: webGLContextAttributes,
   version: webGLContextAttributes.majorVersion,
   GLctx: ctx
  };
  if (ctx.canvas) ctx.canvas.GLctxObject = context;
  GL.contexts[handle] = context;
  if (typeof webGLContextAttributes.enableExtensionsByDefault == "undefined" || webGLContextAttributes.enableExtensionsByDefault) {
   GL.initExtensions(context);
  }
  context.maxVertexAttribs = context.GLctx.getParameter(34921);
  /*GL_MAX_VERTEX_ATTRIBS*/ context.clientBuffers = [];
  for (var i = 0; i < context.maxVertexAttribs; i++) {
   context.clientBuffers[i] = {
    enabled: false,
    clientside: false,
    size: 0,
    type: 0,
    normalized: 0,
    stride: 0,
    ptr: 0,
    vertexAttribPointerAdaptor: null
   };
  }
  GL.generateTempBuffers(false, context);
  if (webGLContextAttributes.renderViaOffscreenBackBuffer) GL.createOffscreenFramebuffer(context);
  return handle;
 },
 makeContextCurrent: contextHandle => {
  GL.currentContext = GL.contexts[contextHandle];
  Module.ctx = GLctx = GL.currentContext?.GLctx;
  return !(contextHandle && !GLctx);
 },
 getContext: contextHandle => GL.contexts[contextHandle],
 deleteContext: contextHandle => {
  if (GL.currentContext === GL.contexts[contextHandle]) {
   GL.currentContext = null;
  }
  if (typeof JSEvents == "object") {
   JSEvents.removeAllHandlersOnTarget(GL.contexts[contextHandle].GLctx.canvas);
  }
  if (GL.contexts[contextHandle] && GL.contexts[contextHandle].GLctx.canvas) {
   GL.contexts[contextHandle].GLctx.canvas.GLctxObject = undefined;
  }
  _free(GL.contexts[contextHandle].handle);
  GL.contexts[contextHandle] = null;
 },
 initExtensions: context => {
  context ||= GL.currentContext;
  if (context.initExtensionsDone) return;
  context.initExtensionsDone = true;
  var GLctx = context.GLctx;
  webgl_enable_ANGLE_instanced_arrays(GLctx);
  webgl_enable_OES_vertex_array_object(GLctx);
  webgl_enable_WEBGL_draw_buffers(GLctx);
  webgl_enable_WEBGL_draw_instanced_base_vertex_base_instance(GLctx);
  webgl_enable_WEBGL_multi_draw_instanced_base_vertex_base_instance(GLctx);
  if (context.version >= 2) {
   GLctx.disjointTimerQueryExt = GLctx.getExtension("EXT_disjoint_timer_query_webgl2");
  }
  if (context.version < 2 || !GLctx.disjointTimerQueryExt) {
   GLctx.disjointTimerQueryExt = GLctx.getExtension("EXT_disjoint_timer_query");
  }
  webgl_enable_WEBGL_multi_draw(GLctx);
  getEmscriptenSupportedExtensions(GLctx).forEach(ext => {
   if (!ext.includes("lose_context") && !ext.includes("debug")) {
    GLctx.getExtension(ext);
   }
  });
 }
};

var __emscripten_proxied_gl_context_activated_from_main_browser_thread = contextHandle => {
 GLctx = Module.ctx = GL.currentContext = contextHandle;
 GL.currentContextIsProxied = true;
};

var proxiedJSCallArgs = [];

function __emscripten_receive_on_main_thread_js(funcIndex, emAsmAddr, callingThread, numCallArgs, args) {
 emAsmAddr >>>= 0;
 callingThread >>>= 0;
 args >>>= 0;
 numCallArgs /= 2;
 proxiedJSCallArgs.length = numCallArgs;
 var b = ((args) >>> 3);
 for (var i = 0; i < numCallArgs; i++) {
  if (HEAP64[b + 2 * i]) {
   proxiedJSCallArgs[i] = HEAP64[b + 2 * i + 1];
  } else {
   proxiedJSCallArgs[i] = GROWABLE_HEAP_F64()[b + 2 * i + 1 >>> 0];
  }
 }
 var func = emAsmAddr ? ASM_CONSTS[emAsmAddr] : proxiedFunctionTable[funcIndex];
 assert(!(funcIndex && emAsmAddr));
 assert(func.length == numCallArgs, "Call args mismatch in _emscripten_receive_on_main_thread_js");
 PThread.currentProxiedOperationCallerThread = callingThread;
 var rtn = func(...proxiedJSCallArgs);
 PThread.currentProxiedOperationCallerThread = 0;
 assert(typeof rtn != "bigint");
 return rtn;
}

function __emscripten_runtime_keepalive_clear() {
 if (ENVIRONMENT_IS_PTHREAD) return proxyToMainThread(46, 0, 1);
 noExitRuntime = false;
 runtimeKeepaliveCounter = 0;
}

var JSEvents = {
 removeAllEventListeners() {
  while (JSEvents.eventHandlers.length) {
   JSEvents._removeHandler(JSEvents.eventHandlers.length - 1);
  }
  JSEvents.deferredCalls = [];
 },
 inEventHandler: 0,
 deferredCalls: [],
 deferCall(targetFunction, precedence, argsList) {
  function arraysHaveEqualContent(arrA, arrB) {
   if (arrA.length != arrB.length) return false;
   for (var i in arrA) {
    if (arrA[i] != arrB[i]) return false;
   }
   return true;
  }
  for (var i in JSEvents.deferredCalls) {
   var call = JSEvents.deferredCalls[i];
   if (call.targetFunction == targetFunction && arraysHaveEqualContent(call.argsList, argsList)) {
    return;
   }
  }
  JSEvents.deferredCalls.push({
   targetFunction: targetFunction,
   precedence: precedence,
   argsList: argsList
  });
  JSEvents.deferredCalls.sort((x, y) => x.precedence < y.precedence);
 },
 removeDeferredCalls(targetFunction) {
  for (var i = 0; i < JSEvents.deferredCalls.length; ++i) {
   if (JSEvents.deferredCalls[i].targetFunction == targetFunction) {
    JSEvents.deferredCalls.splice(i, 1);
    --i;
   }
  }
 },
 canPerformEventHandlerRequests() {
  if (navigator.userActivation) {
   return navigator.userActivation.isActive;
  }
  return JSEvents.inEventHandler && JSEvents.currentEventHandler.allowsDeferredCalls;
 },
 runDeferredCalls() {
  if (!JSEvents.canPerformEventHandlerRequests()) {
   return;
  }
  for (var i = 0; i < JSEvents.deferredCalls.length; ++i) {
   var call = JSEvents.deferredCalls[i];
   JSEvents.deferredCalls.splice(i, 1);
   --i;
   call.targetFunction(...call.argsList);
  }
 },
 eventHandlers: [],
 removeAllHandlersOnTarget: (target, eventTypeString) => {
  for (var i = 0; i < JSEvents.eventHandlers.length; ++i) {
   if (JSEvents.eventHandlers[i].target == target && (!eventTypeString || eventTypeString == JSEvents.eventHandlers[i].eventTypeString)) {
    JSEvents._removeHandler(i--);
   }
  }
 },
 _removeHandler(i) {
  var h = JSEvents.eventHandlers[i];
  h.target.removeEventListener(h.eventTypeString, h.eventListenerFunc, h.useCapture);
  JSEvents.eventHandlers.splice(i, 1);
 },
 registerOrRemoveHandler(eventHandler) {
  if (!eventHandler.target) {
   err("registerOrRemoveHandler: the target element for event handler registration does not exist, when processing the following event handler registration:");
   console.dir(eventHandler);
   return -4;
  }
  if (eventHandler.callbackfunc) {
   eventHandler.eventListenerFunc = function(event) {
    ++JSEvents.inEventHandler;
    JSEvents.currentEventHandler = eventHandler;
    JSEvents.runDeferredCalls();
    eventHandler.handlerFunc(event);
    JSEvents.runDeferredCalls();
    --JSEvents.inEventHandler;
   };
   eventHandler.target.addEventListener(eventHandler.eventTypeString, eventHandler.eventListenerFunc, eventHandler.useCapture);
   JSEvents.eventHandlers.push(eventHandler);
  } else {
   for (var i = 0; i < JSEvents.eventHandlers.length; ++i) {
    if (JSEvents.eventHandlers[i].target == eventHandler.target && JSEvents.eventHandlers[i].eventTypeString == eventHandler.eventTypeString) {
     JSEvents._removeHandler(i--);
    }
   }
  }
  return 0;
 },
 getTargetThreadForEventCallback(targetThread) {
  switch (targetThread) {
  case 1:
   return 0;

  case 2:
   return PThread.currentProxiedOperationCallerThread;

  default:
   return targetThread;
  }
 },
 getNodeNameForTarget(target) {
  if (!target) return "";
  if (target == window) return "#window";
  if (target == screen) return "#screen";
  return target?.nodeName || "";
 },
 fullscreenEnabled() {
  return document.fullscreenEnabled || document.webkitFullscreenEnabled;
 }
};

var stringToNewUTF8 = str => {
 var size = lengthBytesUTF8(str) + 1;
 var ret = _malloc(size);
 if (ret) stringToUTF8(str, ret, size);
 return ret;
};

var setOffscreenCanvasSizeOnTargetThread = (targetThread, targetCanvas, width, height) => {
 targetCanvas = targetCanvas ? UTF8ToString(targetCanvas) : "";
 var targetCanvasPtr = 0;
 if (targetCanvas) {
  targetCanvasPtr = stringToNewUTF8(targetCanvas);
 }
 __emscripten_set_offscreencanvas_size_on_thread(targetThread, targetCanvasPtr, width, height);
};

var maybeCStringToJsString = cString => cString > 2 ? UTF8ToString(cString) : cString;

var findCanvasEventTarget = target => {
 target = maybeCStringToJsString(target);
 return GL.offscreenCanvases[target.substr(1)] || (target == "canvas" && Object.keys(GL.offscreenCanvases)[0]) || (typeof document != "undefined" && document.querySelector(target));
};

var setCanvasElementSizeCallingThread = (target, width, height) => {
 var canvas = findCanvasEventTarget(target);
 if (!canvas) return -4;
 if (canvas.canvasSharedPtr) {
  GROWABLE_HEAP_I32()[((canvas.canvasSharedPtr) >>> 2) >>> 0] = width;
  GROWABLE_HEAP_I32()[(((canvas.canvasSharedPtr) + (4)) >>> 2) >>> 0] = height;
 }
 if (canvas.offscreenCanvas || !canvas.controlTransferredOffscreen) {
  if (canvas.offscreenCanvas) canvas = canvas.offscreenCanvas;
  var autoResizeViewport = false;
  if (canvas.GLctxObject?.GLctx) {
   var prevViewport = canvas.GLctxObject.GLctx.getParameter(2978);
   autoResizeViewport = (prevViewport[0] === 0 && prevViewport[1] === 0 && prevViewport[2] === canvas.width && prevViewport[3] === canvas.height);
  }
  canvas.width = width;
  canvas.height = height;
  if (autoResizeViewport) {
   canvas.GLctxObject.GLctx.viewport(0, 0, width, height);
  }
 } else if (canvas.canvasSharedPtr) {
  var targetThread = GROWABLE_HEAP_U32()[(((canvas.canvasSharedPtr) + (8)) >>> 2) >>> 0];
  setOffscreenCanvasSizeOnTargetThread(targetThread, target, width, height);
  return 1;
 } else {
  return -4;
 }
 if (canvas.GLctxObject) GL.resizeOffscreenFramebuffer(canvas.GLctxObject);
 return 0;
};

function setCanvasElementSizeMainThread(target, width, height) {
 if (ENVIRONMENT_IS_PTHREAD) return proxyToMainThread(47, 0, 1, target, width, height);
 return setCanvasElementSizeCallingThread(target, width, height);
}

/** @suppress {duplicate } */ function _emscripten_set_canvas_element_size(target, width, height) {
 target >>>= 0;
 var canvas = findCanvasEventTarget(target);
 if (canvas) {
  return setCanvasElementSizeCallingThread(target, width, height);
 }
 return setCanvasElementSizeMainThread(target, width, height);
}

var __emscripten_set_offscreencanvas_size = _emscripten_set_canvas_element_size;

function __emscripten_thread_set_strongref(thread) {
 thread >>>= 0;
}

var __emscripten_throw_longjmp = () => {
 throw Infinity;
};

function __gmtime_js(time, tmPtr) {
 time = bigintToI53Checked(time);
 tmPtr >>>= 0;
 var date = new Date(time * 1e3);
 GROWABLE_HEAP_I32()[((tmPtr) >>> 2) >>> 0] = date.getUTCSeconds();
 GROWABLE_HEAP_I32()[(((tmPtr) + (4)) >>> 2) >>> 0] = date.getUTCMinutes();
 GROWABLE_HEAP_I32()[(((tmPtr) + (8)) >>> 2) >>> 0] = date.getUTCHours();
 GROWABLE_HEAP_I32()[(((tmPtr) + (12)) >>> 2) >>> 0] = date.getUTCDate();
 GROWABLE_HEAP_I32()[(((tmPtr) + (16)) >>> 2) >>> 0] = date.getUTCMonth();
 GROWABLE_HEAP_I32()[(((tmPtr) + (20)) >>> 2) >>> 0] = date.getUTCFullYear() - 1900;
 GROWABLE_HEAP_I32()[(((tmPtr) + (24)) >>> 2) >>> 0] = date.getUTCDay();
 var start = Date.UTC(date.getUTCFullYear(), 0, 1, 0, 0, 0, 0);
 var yday = ((date.getTime() - start) / (1e3 * 60 * 60 * 24)) | 0;
 GROWABLE_HEAP_I32()[(((tmPtr) + (28)) >>> 2) >>> 0] = yday;
}

var isLeapYear = year => year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0);

var MONTH_DAYS_LEAP_CUMULATIVE = [ 0, 31, 60, 91, 121, 152, 182, 213, 244, 274, 305, 335 ];

var MONTH_DAYS_REGULAR_CUMULATIVE = [ 0, 31, 59, 90, 120, 151, 181, 212, 243, 273, 304, 334 ];

var ydayFromDate = date => {
 var leap = isLeapYear(date.getFullYear());
 var monthDaysCumulative = (leap ? MONTH_DAYS_LEAP_CUMULATIVE : MONTH_DAYS_REGULAR_CUMULATIVE);
 var yday = monthDaysCumulative[date.getMonth()] + date.getDate() - 1;
 return yday;
};

function __localtime_js(time, tmPtr) {
 time = bigintToI53Checked(time);
 tmPtr >>>= 0;
 var date = new Date(time * 1e3);
 GROWABLE_HEAP_I32()[((tmPtr) >>> 2) >>> 0] = date.getSeconds();
 GROWABLE_HEAP_I32()[(((tmPtr) + (4)) >>> 2) >>> 0] = date.getMinutes();
 GROWABLE_HEAP_I32()[(((tmPtr) + (8)) >>> 2) >>> 0] = date.getHours();
 GROWABLE_HEAP_I32()[(((tmPtr) + (12)) >>> 2) >>> 0] = date.getDate();
 GROWABLE_HEAP_I32()[(((tmPtr) + (16)) >>> 2) >>> 0] = date.getMonth();
 GROWABLE_HEAP_I32()[(((tmPtr) + (20)) >>> 2) >>> 0] = date.getFullYear() - 1900;
 GROWABLE_HEAP_I32()[(((tmPtr) + (24)) >>> 2) >>> 0] = date.getDay();
 var yday = ydayFromDate(date) | 0;
 GROWABLE_HEAP_I32()[(((tmPtr) + (28)) >>> 2) >>> 0] = yday;
 GROWABLE_HEAP_I32()[(((tmPtr) + (36)) >>> 2) >>> 0] = -(date.getTimezoneOffset() * 60);
 var start = new Date(date.getFullYear(), 0, 1);
 var summerOffset = new Date(date.getFullYear(), 6, 1).getTimezoneOffset();
 var winterOffset = start.getTimezoneOffset();
 var dst = (summerOffset != winterOffset && date.getTimezoneOffset() == Math.min(winterOffset, summerOffset)) | 0;
 GROWABLE_HEAP_I32()[(((tmPtr) + (32)) >>> 2) >>> 0] = dst;
}

var __mktime_js = function(tmPtr) {
 tmPtr >>>= 0;
 var ret = (() => {
  var date = new Date(GROWABLE_HEAP_I32()[(((tmPtr) + (20)) >>> 2) >>> 0] + 1900, GROWABLE_HEAP_I32()[(((tmPtr) + (16)) >>> 2) >>> 0], GROWABLE_HEAP_I32()[(((tmPtr) + (12)) >>> 2) >>> 0], GROWABLE_HEAP_I32()[(((tmPtr) + (8)) >>> 2) >>> 0], GROWABLE_HEAP_I32()[(((tmPtr) + (4)) >>> 2) >>> 0], GROWABLE_HEAP_I32()[((tmPtr) >>> 2) >>> 0], 0);
  var dst = GROWABLE_HEAP_I32()[(((tmPtr) + (32)) >>> 2) >>> 0];
  var guessedOffset = date.getTimezoneOffset();
  var start = new Date(date.getFullYear(), 0, 1);
  var summerOffset = new Date(date.getFullYear(), 6, 1).getTimezoneOffset();
  var winterOffset = start.getTimezoneOffset();
  var dstOffset = Math.min(winterOffset, summerOffset);
  if (dst < 0) {
   GROWABLE_HEAP_I32()[(((tmPtr) + (32)) >>> 2) >>> 0] = Number(summerOffset != winterOffset && dstOffset == guessedOffset);
  } else if ((dst > 0) != (dstOffset == guessedOffset)) {
   var nonDstOffset = Math.max(winterOffset, summerOffset);
   var trueOffset = dst > 0 ? dstOffset : nonDstOffset;
   date.setTime(date.getTime() + (trueOffset - guessedOffset) * 6e4);
  }
  GROWABLE_HEAP_I32()[(((tmPtr) + (24)) >>> 2) >>> 0] = date.getDay();
  var yday = ydayFromDate(date) | 0;
  GROWABLE_HEAP_I32()[(((tmPtr) + (28)) >>> 2) >>> 0] = yday;
  GROWABLE_HEAP_I32()[((tmPtr) >>> 2) >>> 0] = date.getSeconds();
  GROWABLE_HEAP_I32()[(((tmPtr) + (4)) >>> 2) >>> 0] = date.getMinutes();
  GROWABLE_HEAP_I32()[(((tmPtr) + (8)) >>> 2) >>> 0] = date.getHours();
  GROWABLE_HEAP_I32()[(((tmPtr) + (12)) >>> 2) >>> 0] = date.getDate();
  GROWABLE_HEAP_I32()[(((tmPtr) + (16)) >>> 2) >>> 0] = date.getMonth();
  GROWABLE_HEAP_I32()[(((tmPtr) + (20)) >>> 2) >>> 0] = date.getYear();
  var timeMs = date.getTime();
  if (isNaN(timeMs)) {
   return -1;
  }
  return timeMs / 1e3;
 })();
 return BigInt(ret);
};

function __mmap_js(len, prot, flags, fd, offset, allocated, addr) {
 if (ENVIRONMENT_IS_PTHREAD) return proxyToMainThread(48, 0, 1, len, prot, flags, fd, offset, allocated, addr);
 len >>>= 0;
 offset = bigintToI53Checked(offset);
 allocated >>>= 0;
 addr >>>= 0;
 try {
  if (isNaN(offset)) return 61;
  var stream = SYSCALLS.getStreamFromFD(fd);
  var res = FS.mmap(stream, len, offset, prot, flags);
  var ptr = res.ptr;
  GROWABLE_HEAP_I32()[((allocated) >>> 2) >>> 0] = res.allocated;
  GROWABLE_HEAP_U32()[((addr) >>> 2) >>> 0] = ptr;
  return 0;
 } catch (e) {
  if (typeof FS == "undefined" || !(e.name === "ErrnoError")) throw e;
  return -e.errno;
 }
}

function __munmap_js(addr, len, prot, flags, fd, offset) {
 if (ENVIRONMENT_IS_PTHREAD) return proxyToMainThread(49, 0, 1, addr, len, prot, flags, fd, offset);
 addr >>>= 0;
 len >>>= 0;
 offset = bigintToI53Checked(offset);
 try {
  var stream = SYSCALLS.getStreamFromFD(fd);
  if (prot & 2) {
   SYSCALLS.doMsync(addr, stream, len, flags, offset);
  }
 } catch (e) {
  if (typeof FS == "undefined" || !(e.name === "ErrnoError")) throw e;
  return -e.errno;
 }
}

function __tzset_js(timezone, daylight, std_name, dst_name) {
 timezone >>>= 0;
 daylight >>>= 0;
 std_name >>>= 0;
 dst_name >>>= 0;
 var currentYear = (new Date).getFullYear();
 var winter = new Date(currentYear, 0, 1);
 var summer = new Date(currentYear, 6, 1);
 var winterOffset = winter.getTimezoneOffset();
 var summerOffset = summer.getTimezoneOffset();
 var stdTimezoneOffset = Math.max(winterOffset, summerOffset);
 GROWABLE_HEAP_U32()[((timezone) >>> 2) >>> 0] = stdTimezoneOffset * 60;
 GROWABLE_HEAP_I32()[((daylight) >>> 2) >>> 0] = Number(winterOffset != summerOffset);
 function extractZone(date) {
  var match = date.toTimeString().match(/\\(([A-Za-z ]+)\\)$/);
  return match ? match[1] : "GMT";
 }
 var winterName = extractZone(winter);
 var summerName = extractZone(summer);
 if (summerOffset < winterOffset) {
  stringToUTF8(winterName, std_name, 7);
  stringToUTF8(summerName, dst_name, 7);
 } else {
  stringToUTF8(winterName, dst_name, 7);
  stringToUTF8(summerName, std_name, 7);
 }
}

var readEmAsmArgsArray = [];

var readEmAsmArgs = (sigPtr, buf) => {
 assert(Array.isArray(readEmAsmArgsArray));
 assert(buf % 16 == 0);
 readEmAsmArgsArray.length = 0;
 var ch;
 while (ch = GROWABLE_HEAP_U8()[sigPtr++ >>> 0]) {
  var chr = String.fromCharCode(ch);
  var validChars = [ "d", "f", "i", "p" ];
  validChars.push("j");
  assert(validChars.includes(chr), \`Invalid character \${ch}("\${chr}") in readEmAsmArgs! Use only [\${validChars}], and do not specify "v" for void return argument.\`);
  var wide = (ch != 105);
  wide &= (ch != 112);
  buf += wide && (buf % 8) ? 4 : 0;
  readEmAsmArgsArray.push(ch == 112 ? GROWABLE_HEAP_U32()[((buf) >>> 2) >>> 0] : ch == 106 ? HEAP64[((buf) >>> 3)] : ch == 105 ? GROWABLE_HEAP_I32()[((buf) >>> 2) >>> 0] : GROWABLE_HEAP_F64()[((buf) >>> 3) >>> 0]);
  buf += wide ? 8 : 4;
 }
 return readEmAsmArgsArray;
};

var runEmAsmFunction = (code, sigPtr, argbuf) => {
 var args = readEmAsmArgs(sigPtr, argbuf);
 assert(ASM_CONSTS.hasOwnProperty(code), \`No EM_ASM constant found at address \${code}.  The loaded WebAssembly file is likely out of sync with the generated JavaScript.\`);
 return ASM_CONSTS[code](...args);
};

function _emscripten_asm_const_int(code, sigPtr, argbuf) {
 code >>>= 0;
 sigPtr >>>= 0;
 argbuf >>>= 0;
 return runEmAsmFunction(code, sigPtr, argbuf);
}

var runMainThreadEmAsm = (emAsmAddr, sigPtr, argbuf, sync) => {
 var args = readEmAsmArgs(sigPtr, argbuf);
 if (ENVIRONMENT_IS_PTHREAD) {
  return proxyToMainThread(0, emAsmAddr, sync, ...args);
 }
 assert(ASM_CONSTS.hasOwnProperty(emAsmAddr), \`No EM_ASM constant found at address \${emAsmAddr}.  The loaded WebAssembly file is likely out of sync with the generated JavaScript.\`);
 return ASM_CONSTS[emAsmAddr](...args);
};

function _emscripten_asm_const_int_sync_on_main_thread(emAsmAddr, sigPtr, argbuf) {
 emAsmAddr >>>= 0;
 sigPtr >>>= 0;
 argbuf >>>= 0;
 return runMainThreadEmAsm(emAsmAddr, sigPtr, argbuf, 1);
}

var _emscripten_check_blocking_allowed = () => {
 if (ENVIRONMENT_IS_WORKER) return;
 warnOnce("Blocking on the main thread is very dangerous, see https://emscripten.org/docs/porting/pthreads.html#blocking-on-the-main-browser-thread");
};

var _emscripten_date_now = () => Date.now();

function _emscripten_err(str) {
 str >>>= 0;
 return err(UTF8ToString(str));
}

function _emscripten_errn(str, len) {
 str >>>= 0;
 len >>>= 0;
 return err(UTF8ToString(str, len));
}

var _emscripten_exit_with_live_runtime = () => {
 runtimeKeepalivePush();
 throw "unwind";
};

var getCanvasSizeCallingThread = (target, width, height) => {
 var canvas = findCanvasEventTarget(target);
 if (!canvas) return -4;
 if (canvas.canvasSharedPtr) {
  var w = GROWABLE_HEAP_I32()[((canvas.canvasSharedPtr) >>> 2) >>> 0];
  var h = GROWABLE_HEAP_I32()[(((canvas.canvasSharedPtr) + (4)) >>> 2) >>> 0];
  GROWABLE_HEAP_I32()[((width) >>> 2) >>> 0] = w;
  GROWABLE_HEAP_I32()[((height) >>> 2) >>> 0] = h;
 } else if (canvas.offscreenCanvas) {
  GROWABLE_HEAP_I32()[((width) >>> 2) >>> 0] = canvas.offscreenCanvas.width;
  GROWABLE_HEAP_I32()[((height) >>> 2) >>> 0] = canvas.offscreenCanvas.height;
 } else if (!canvas.controlTransferredOffscreen) {
  GROWABLE_HEAP_I32()[((width) >>> 2) >>> 0] = canvas.width;
  GROWABLE_HEAP_I32()[((height) >>> 2) >>> 0] = canvas.height;
 } else {
  return -4;
 }
 return 0;
};

function getCanvasSizeMainThread(target, width, height) {
 if (ENVIRONMENT_IS_PTHREAD) return proxyToMainThread(50, 0, 1, target, width, height);
 return getCanvasSizeCallingThread(target, width, height);
}

function _emscripten_get_canvas_element_size(target, width, height) {
 target >>>= 0;
 width >>>= 0;
 height >>>= 0;
 var canvas = findCanvasEventTarget(target);
 if (canvas) {
  return getCanvasSizeCallingThread(target, width, height);
 }
 return getCanvasSizeMainThread(target, width, height);
}

var getHeapMax = () => 4294901760;

function _emscripten_get_heap_max() {
 return getHeapMax();
}

var _emscripten_get_now;

_emscripten_get_now = () => performance.timeOrigin + performance.now();

/** @suppress {duplicate } */ var _glActiveTexture = x0 => GLctx.activeTexture(x0);

var _emscripten_glActiveTexture = _glActiveTexture;

/** @suppress {duplicate } */ var _glAttachShader = (program, shader) => {
 GLctx.attachShader(GL.programs[program], GL.shaders[shader]);
};

var _emscripten_glAttachShader = _glAttachShader;

/** @suppress {duplicate } */ var _glBeginQuery = (target, id) => {
 GLctx.beginQuery(target, GL.queries[id]);
};

var _emscripten_glBeginQuery = _glBeginQuery;

/** @suppress {duplicate } */ var _glBeginQueryEXT = (target, id) => {
 GLctx.disjointTimerQueryExt["beginQueryEXT"](target, GL.queries[id]);
};

var _emscripten_glBeginQueryEXT = _glBeginQueryEXT;

/** @suppress {duplicate } */ var _glBeginTransformFeedback = x0 => GLctx.beginTransformFeedback(x0);

var _emscripten_glBeginTransformFeedback = _glBeginTransformFeedback;

/** @suppress {duplicate } */ function _glBindAttribLocation(program, index, name) {
 name >>>= 0;
 GLctx.bindAttribLocation(GL.programs[program], index, UTF8ToString(name));
}

var _emscripten_glBindAttribLocation = _glBindAttribLocation;

/** @suppress {duplicate } */ var _glBindBuffer = (target, buffer) => {
 if (target == 34962) /*GL_ARRAY_BUFFER*/ {
  GLctx.currentArrayBufferBinding = buffer;
 } else if (target == 34963) /*GL_ELEMENT_ARRAY_BUFFER*/ {
  GLctx.currentElementArrayBufferBinding = buffer;
 }
 if (target == 35051) /*GL_PIXEL_PACK_BUFFER*/ {
  GLctx.currentPixelPackBufferBinding = buffer;
 } else if (target == 35052) /*GL_PIXEL_UNPACK_BUFFER*/ {
  GLctx.currentPixelUnpackBufferBinding = buffer;
 }
 GLctx.bindBuffer(target, GL.buffers[buffer]);
};

var _emscripten_glBindBuffer = _glBindBuffer;

/** @suppress {duplicate } */ var _glBindBufferBase = (target, index, buffer) => {
 GLctx.bindBufferBase(target, index, GL.buffers[buffer]);
};

var _emscripten_glBindBufferBase = _glBindBufferBase;

/** @suppress {duplicate } */ function _glBindBufferRange(target, index, buffer, offset, ptrsize) {
 offset >>>= 0;
 ptrsize >>>= 0;
 GLctx.bindBufferRange(target, index, GL.buffers[buffer], offset, ptrsize);
}

var _emscripten_glBindBufferRange = _glBindBufferRange;

/** @suppress {duplicate } */ var _glBindFramebuffer = (target, framebuffer) => {
 GLctx.bindFramebuffer(target, framebuffer ? GL.framebuffers[framebuffer] : GL.currentContext.defaultFbo);
};

var _emscripten_glBindFramebuffer = _glBindFramebuffer;

/** @suppress {duplicate } */ var _glBindRenderbuffer = (target, renderbuffer) => {
 GLctx.bindRenderbuffer(target, GL.renderbuffers[renderbuffer]);
};

var _emscripten_glBindRenderbuffer = _glBindRenderbuffer;

/** @suppress {duplicate } */ var _glBindSampler = (unit, sampler) => {
 GLctx.bindSampler(unit, GL.samplers[sampler]);
};

var _emscripten_glBindSampler = _glBindSampler;

/** @suppress {duplicate } */ var _glBindTexture = (target, texture) => {
 GLctx.bindTexture(target, GL.textures[texture]);
};

var _emscripten_glBindTexture = _glBindTexture;

/** @suppress {duplicate } */ var _glBindTransformFeedback = (target, id) => {
 GLctx.bindTransformFeedback(target, GL.transformFeedbacks[id]);
};

var _emscripten_glBindTransformFeedback = _glBindTransformFeedback;

/** @suppress {duplicate } */ var _glBindVertexArray = vao => {
 GLctx.bindVertexArray(GL.vaos[vao]);
 var ibo = GLctx.getParameter(34965);
 /*ELEMENT_ARRAY_BUFFER_BINDING*/ GLctx.currentElementArrayBufferBinding = ibo ? (ibo.name | 0) : 0;
};

var _emscripten_glBindVertexArray = _glBindVertexArray;

/** @suppress {duplicate } */ var _glBlendColor = (x0, x1, x2, x3) => GLctx.blendColor(x0, x1, x2, x3);

var _emscripten_glBlendColor = _glBlendColor;

/** @suppress {duplicate } */ var _glBlendEquation = x0 => GLctx.blendEquation(x0);

var _emscripten_glBlendEquation = _glBlendEquation;

/** @suppress {duplicate } */ var _glBlendEquationSeparate = (x0, x1) => GLctx.blendEquationSeparate(x0, x1);

var _emscripten_glBlendEquationSeparate = _glBlendEquationSeparate;

/** @suppress {duplicate } */ var _glBlendFunc = (x0, x1) => GLctx.blendFunc(x0, x1);

var _emscripten_glBlendFunc = _glBlendFunc;

/** @suppress {duplicate } */ var _glBlendFuncSeparate = (x0, x1, x2, x3) => GLctx.blendFuncSeparate(x0, x1, x2, x3);

var _emscripten_glBlendFuncSeparate = _glBlendFuncSeparate;

/** @suppress {duplicate } */ var _glBlitFramebuffer = (x0, x1, x2, x3, x4, x5, x6, x7, x8, x9) => GLctx.blitFramebuffer(x0, x1, x2, x3, x4, x5, x6, x7, x8, x9);

var _emscripten_glBlitFramebuffer = _glBlitFramebuffer;

/** @suppress {duplicate } */ function _glBufferData(target, size, data, usage) {
 size >>>= 0;
 data >>>= 0;
 GLctx.bufferData(target, data ? GROWABLE_HEAP_U8().subarray(data >>> 0, data + size >>> 0) : size, usage);
}

var _emscripten_glBufferData = _glBufferData;

/** @suppress {duplicate } */ function _glBufferSubData(target, offset, size, data) {
 offset >>>= 0;
 size >>>= 0;
 data >>>= 0;
 GLctx.bufferSubData(target, offset, GROWABLE_HEAP_U8().subarray(data >>> 0, data + size >>> 0));
}

var _emscripten_glBufferSubData = _glBufferSubData;

/** @suppress {duplicate } */ var _glCheckFramebufferStatus = x0 => GLctx.checkFramebufferStatus(x0);

var _emscripten_glCheckFramebufferStatus = _glCheckFramebufferStatus;

/** @suppress {duplicate } */ var _glClear = x0 => GLctx.clear(x0);

var _emscripten_glClear = _glClear;

/** @suppress {duplicate } */ var _glClearBufferfi = (x0, x1, x2, x3) => GLctx.clearBufferfi(x0, x1, x2, x3);

var _emscripten_glClearBufferfi = _glClearBufferfi;

/** @suppress {duplicate } */ function _glClearBufferfv(buffer, drawbuffer, value) {
 value >>>= 0;
 GLctx.clearBufferfv(buffer, drawbuffer, GROWABLE_HEAP_F32(), ((value) >>> 2));
}

var _emscripten_glClearBufferfv = _glClearBufferfv;

/** @suppress {duplicate } */ function _glClearBufferiv(buffer, drawbuffer, value) {
 value >>>= 0;
 GLctx.clearBufferiv(buffer, drawbuffer, GROWABLE_HEAP_I32(), ((value) >>> 2));
}

var _emscripten_glClearBufferiv = _glClearBufferiv;

/** @suppress {duplicate } */ function _glClearBufferuiv(buffer, drawbuffer, value) {
 value >>>= 0;
 GLctx.clearBufferuiv(buffer, drawbuffer, GROWABLE_HEAP_U32(), ((value) >>> 2));
}

var _emscripten_glClearBufferuiv = _glClearBufferuiv;

/** @suppress {duplicate } */ var _glClearColor = (x0, x1, x2, x3) => GLctx.clearColor(x0, x1, x2, x3);

var _emscripten_glClearColor = _glClearColor;

/** @suppress {duplicate } */ var _glClearDepthf = x0 => GLctx.clearDepth(x0);

var _emscripten_glClearDepthf = _glClearDepthf;

/** @suppress {duplicate } */ var _glClearStencil = x0 => GLctx.clearStencil(x0);

var _emscripten_glClearStencil = _glClearStencil;

/** @suppress {duplicate } */ function _glClientWaitSync(sync, flags, timeout) {
 sync >>>= 0;
 timeout = Number(timeout);
 return GLctx.clientWaitSync(GL.syncs[sync], flags, timeout);
}

var _emscripten_glClientWaitSync = _glClientWaitSync;

/** @suppress {duplicate } */ var _glColorMask = (red, green, blue, alpha) => {
 GLctx.colorMask(!!red, !!green, !!blue, !!alpha);
};

var _emscripten_glColorMask = _glColorMask;

/** @suppress {duplicate } */ var _glCompileShader = shader => {
 GLctx.compileShader(GL.shaders[shader]);
};

var _emscripten_glCompileShader = _glCompileShader;

/** @suppress {duplicate } */ function _glCompressedTexImage2D(target, level, internalFormat, width, height, border, imageSize, data) {
 data >>>= 0;
 if (GL.currentContext.version >= 2) {
  if (GLctx.currentPixelUnpackBufferBinding || !imageSize) {
   GLctx.compressedTexImage2D(target, level, internalFormat, width, height, border, imageSize, data);
   return;
  }
 }
 GLctx.compressedTexImage2D(target, level, internalFormat, width, height, border, data ? GROWABLE_HEAP_U8().subarray((data) >>> 0, data + imageSize >>> 0) : null);
}

var _emscripten_glCompressedTexImage2D = _glCompressedTexImage2D;

/** @suppress {duplicate } */ function _glCompressedTexImage3D(target, level, internalFormat, width, height, depth, border, imageSize, data) {
 data >>>= 0;
 if (GLctx.currentPixelUnpackBufferBinding) {
  GLctx.compressedTexImage3D(target, level, internalFormat, width, height, depth, border, imageSize, data);
 } else {
  GLctx.compressedTexImage3D(target, level, internalFormat, width, height, depth, border, GROWABLE_HEAP_U8(), data, imageSize);
 }
}

var _emscripten_glCompressedTexImage3D = _glCompressedTexImage3D;

/** @suppress {duplicate } */ function _glCompressedTexSubImage2D(target, level, xoffset, yoffset, width, height, format, imageSize, data) {
 data >>>= 0;
 if (GL.currentContext.version >= 2) {
  if (GLctx.currentPixelUnpackBufferBinding || !imageSize) {
   GLctx.compressedTexSubImage2D(target, level, xoffset, yoffset, width, height, format, imageSize, data);
   return;
  }
 }
 GLctx.compressedTexSubImage2D(target, level, xoffset, yoffset, width, height, format, data ? GROWABLE_HEAP_U8().subarray((data) >>> 0, data + imageSize >>> 0) : null);
}

var _emscripten_glCompressedTexSubImage2D = _glCompressedTexSubImage2D;

/** @suppress {duplicate } */ function _glCompressedTexSubImage3D(target, level, xoffset, yoffset, zoffset, width, height, depth, format, imageSize, data) {
 data >>>= 0;
 if (GLctx.currentPixelUnpackBufferBinding) {
  GLctx.compressedTexSubImage3D(target, level, xoffset, yoffset, zoffset, width, height, depth, format, imageSize, data);
 } else {
  GLctx.compressedTexSubImage3D(target, level, xoffset, yoffset, zoffset, width, height, depth, format, GROWABLE_HEAP_U8(), data, imageSize);
 }
}

var _emscripten_glCompressedTexSubImage3D = _glCompressedTexSubImage3D;

/** @suppress {duplicate } */ function _glCopyBufferSubData(x0, x1, x2, x3, x4) {
 x2 >>>= 0;
 x3 >>>= 0;
 x4 >>>= 0;
 return GLctx.copyBufferSubData(x0, x1, x2, x3, x4);
}

var _emscripten_glCopyBufferSubData = _glCopyBufferSubData;

/** @suppress {duplicate } */ var _glCopyTexImage2D = (x0, x1, x2, x3, x4, x5, x6, x7) => GLctx.copyTexImage2D(x0, x1, x2, x3, x4, x5, x6, x7);

var _emscripten_glCopyTexImage2D = _glCopyTexImage2D;

/** @suppress {duplicate } */ var _glCopyTexSubImage2D = (x0, x1, x2, x3, x4, x5, x6, x7) => GLctx.copyTexSubImage2D(x0, x1, x2, x3, x4, x5, x6, x7);

var _emscripten_glCopyTexSubImage2D = _glCopyTexSubImage2D;

/** @suppress {duplicate } */ var _glCopyTexSubImage3D = (x0, x1, x2, x3, x4, x5, x6, x7, x8) => GLctx.copyTexSubImage3D(x0, x1, x2, x3, x4, x5, x6, x7, x8);

var _emscripten_glCopyTexSubImage3D = _glCopyTexSubImage3D;

/** @suppress {duplicate } */ var _glCreateProgram = () => {
 var id = GL.getNewId(GL.programs);
 var program = GLctx.createProgram();
 program.name = id;
 program.maxUniformLength = program.maxAttributeLength = program.maxUniformBlockNameLength = 0;
 program.uniformIdCounter = 1;
 GL.programs[id] = program;
 return id;
};

var _emscripten_glCreateProgram = _glCreateProgram;

/** @suppress {duplicate } */ var _glCreateShader = shaderType => {
 var id = GL.getNewId(GL.shaders);
 GL.shaders[id] = GLctx.createShader(shaderType);
 return id;
};

var _emscripten_glCreateShader = _glCreateShader;

/** @suppress {duplicate } */ var _glCullFace = x0 => GLctx.cullFace(x0);

var _emscripten_glCullFace = _glCullFace;

/** @suppress {duplicate } */ function _glDeleteBuffers(n, buffers) {
 buffers >>>= 0;
 for (var i = 0; i < n; i++) {
  var id = GROWABLE_HEAP_I32()[(((buffers) + (i * 4)) >>> 2) >>> 0];
  var buffer = GL.buffers[id];
  if (!buffer) continue;
  GLctx.deleteBuffer(buffer);
  buffer.name = 0;
  GL.buffers[id] = null;
  if (id == GLctx.currentArrayBufferBinding) GLctx.currentArrayBufferBinding = 0;
  if (id == GLctx.currentElementArrayBufferBinding) GLctx.currentElementArrayBufferBinding = 0;
  if (id == GLctx.currentPixelPackBufferBinding) GLctx.currentPixelPackBufferBinding = 0;
  if (id == GLctx.currentPixelUnpackBufferBinding) GLctx.currentPixelUnpackBufferBinding = 0;
 }
}

var _emscripten_glDeleteBuffers = _glDeleteBuffers;

/** @suppress {duplicate } */ function _glDeleteFramebuffers(n, framebuffers) {
 framebuffers >>>= 0;
 for (var i = 0; i < n; ++i) {
  var id = GROWABLE_HEAP_I32()[(((framebuffers) + (i * 4)) >>> 2) >>> 0];
  var framebuffer = GL.framebuffers[id];
  if (!framebuffer) continue;
  GLctx.deleteFramebuffer(framebuffer);
  framebuffer.name = 0;
  GL.framebuffers[id] = null;
 }
}

var _emscripten_glDeleteFramebuffers = _glDeleteFramebuffers;

/** @suppress {duplicate } */ var _glDeleteProgram = id => {
 if (!id) return;
 var program = GL.programs[id];
 if (!program) {
  GL.recordError(1281);
  /* GL_INVALID_VALUE */ return;
 }
 GLctx.deleteProgram(program);
 program.name = 0;
 GL.programs[id] = null;
};

var _emscripten_glDeleteProgram = _glDeleteProgram;

/** @suppress {duplicate } */ function _glDeleteQueries(n, ids) {
 ids >>>= 0;
 for (var i = 0; i < n; i++) {
  var id = GROWABLE_HEAP_I32()[(((ids) + (i * 4)) >>> 2) >>> 0];
  var query = GL.queries[id];
  if (!query) continue;
  GLctx.deleteQuery(query);
  GL.queries[id] = null;
 }
}

var _emscripten_glDeleteQueries = _glDeleteQueries;

/** @suppress {duplicate } */ function _glDeleteQueriesEXT(n, ids) {
 ids >>>= 0;
 for (var i = 0; i < n; i++) {
  var id = GROWABLE_HEAP_I32()[(((ids) + (i * 4)) >>> 2) >>> 0];
  var query = GL.queries[id];
  if (!query) continue;
  GLctx.disjointTimerQueryExt["deleteQueryEXT"](query);
  GL.queries[id] = null;
 }
}

var _emscripten_glDeleteQueriesEXT = _glDeleteQueriesEXT;

/** @suppress {duplicate } */ function _glDeleteRenderbuffers(n, renderbuffers) {
 renderbuffers >>>= 0;
 for (var i = 0; i < n; i++) {
  var id = GROWABLE_HEAP_I32()[(((renderbuffers) + (i * 4)) >>> 2) >>> 0];
  var renderbuffer = GL.renderbuffers[id];
  if (!renderbuffer) continue;
  GLctx.deleteRenderbuffer(renderbuffer);
  renderbuffer.name = 0;
  GL.renderbuffers[id] = null;
 }
}

var _emscripten_glDeleteRenderbuffers = _glDeleteRenderbuffers;

/** @suppress {duplicate } */ function _glDeleteSamplers(n, samplers) {
 samplers >>>= 0;
 for (var i = 0; i < n; i++) {
  var id = GROWABLE_HEAP_I32()[(((samplers) + (i * 4)) >>> 2) >>> 0];
  var sampler = GL.samplers[id];
  if (!sampler) continue;
  GLctx.deleteSampler(sampler);
  sampler.name = 0;
  GL.samplers[id] = null;
 }
}

var _emscripten_glDeleteSamplers = _glDeleteSamplers;

/** @suppress {duplicate } */ var _glDeleteShader = id => {
 if (!id) return;
 var shader = GL.shaders[id];
 if (!shader) {
  GL.recordError(1281);
  /* GL_INVALID_VALUE */ return;
 }
 GLctx.deleteShader(shader);
 GL.shaders[id] = null;
};

var _emscripten_glDeleteShader = _glDeleteShader;

/** @suppress {duplicate } */ function _glDeleteSync(id) {
 id >>>= 0;
 if (!id) return;
 var sync = GL.syncs[id];
 if (!sync) {
  GL.recordError(1281);
  /* GL_INVALID_VALUE */ return;
 }
 GLctx.deleteSync(sync);
 sync.name = 0;
 GL.syncs[id] = null;
}

var _emscripten_glDeleteSync = _glDeleteSync;

/** @suppress {duplicate } */ function _glDeleteTextures(n, textures) {
 textures >>>= 0;
 for (var i = 0; i < n; i++) {
  var id = GROWABLE_HEAP_I32()[(((textures) + (i * 4)) >>> 2) >>> 0];
  var texture = GL.textures[id];
  if (!texture) continue;
  GLctx.deleteTexture(texture);
  texture.name = 0;
  GL.textures[id] = null;
 }
}

var _emscripten_glDeleteTextures = _glDeleteTextures;

/** @suppress {duplicate } */ function _glDeleteTransformFeedbacks(n, ids) {
 ids >>>= 0;
 for (var i = 0; i < n; i++) {
  var id = GROWABLE_HEAP_I32()[(((ids) + (i * 4)) >>> 2) >>> 0];
  var transformFeedback = GL.transformFeedbacks[id];
  if (!transformFeedback) continue;
  GLctx.deleteTransformFeedback(transformFeedback);
  transformFeedback.name = 0;
  GL.transformFeedbacks[id] = null;
 }
}

var _emscripten_glDeleteTransformFeedbacks = _glDeleteTransformFeedbacks;

/** @suppress {duplicate } */ function _glDeleteVertexArrays(n, vaos) {
 vaos >>>= 0;
 for (var i = 0; i < n; i++) {
  var id = GROWABLE_HEAP_I32()[(((vaos) + (i * 4)) >>> 2) >>> 0];
  GLctx.deleteVertexArray(GL.vaos[id]);
  GL.vaos[id] = null;
 }
}

var _emscripten_glDeleteVertexArrays = _glDeleteVertexArrays;

/** @suppress {duplicate } */ var _glDepthFunc = x0 => GLctx.depthFunc(x0);

var _emscripten_glDepthFunc = _glDepthFunc;

/** @suppress {duplicate } */ var _glDepthMask = flag => {
 GLctx.depthMask(!!flag);
};

var _emscripten_glDepthMask = _glDepthMask;

/** @suppress {duplicate } */ var _glDepthRangef = (x0, x1) => GLctx.depthRange(x0, x1);

var _emscripten_glDepthRangef = _glDepthRangef;

/** @suppress {duplicate } */ var _glDetachShader = (program, shader) => {
 GLctx.detachShader(GL.programs[program], GL.shaders[shader]);
};

var _emscripten_glDetachShader = _glDetachShader;

/** @suppress {duplicate } */ var _glDisable = x0 => GLctx.disable(x0);

var _emscripten_glDisable = _glDisable;

/** @suppress {duplicate } */ var _glDisableVertexAttribArray = index => {
 var cb = GL.currentContext.clientBuffers[index];
 cb.enabled = false;
 GLctx.disableVertexAttribArray(index);
};

var _emscripten_glDisableVertexAttribArray = _glDisableVertexAttribArray;

/** @suppress {duplicate } */ var _glDrawArrays = (mode, first, count) => {
 GL.preDrawHandleClientVertexAttribBindings(first + count);
 GLctx.drawArrays(mode, first, count);
 GL.postDrawHandleClientVertexAttribBindings();
};

var _emscripten_glDrawArrays = _glDrawArrays;

/** @suppress {duplicate } */ var _glDrawArraysInstanced = (mode, first, count, primcount) => {
 GLctx.drawArraysInstanced(mode, first, count, primcount);
};

var _emscripten_glDrawArraysInstanced = _glDrawArraysInstanced;

var tempFixedLengthArray = [];

/** @suppress {duplicate } */ function _glDrawBuffers(n, bufs) {
 bufs >>>= 0;
 var bufArray = tempFixedLengthArray[n];
 for (var i = 0; i < n; i++) {
  bufArray[i] = GROWABLE_HEAP_I32()[(((bufs) + (i * 4)) >>> 2) >>> 0];
 }
 GLctx.drawBuffers(bufArray);
}

var _emscripten_glDrawBuffers = _glDrawBuffers;

/** @suppress {duplicate } */ function _glDrawElements(mode, count, type, indices) {
 indices >>>= 0;
 var buf;
 if (!GLctx.currentElementArrayBufferBinding) {
  var size = GL.calcBufLength(1, type, 0, count);
  buf = GL.getTempIndexBuffer(size);
  GLctx.bindBuffer(34963, /*GL_ELEMENT_ARRAY_BUFFER*/ buf);
  GLctx.bufferSubData(34963, 0, GROWABLE_HEAP_U8().subarray(indices >>> 0, indices + size >>> 0));
  indices = 0;
 }
 GL.preDrawHandleClientVertexAttribBindings(count);
 GLctx.drawElements(mode, count, type, indices);
 GL.postDrawHandleClientVertexAttribBindings(count);
 if (!GLctx.currentElementArrayBufferBinding) {
  GLctx.bindBuffer(34963, /*GL_ELEMENT_ARRAY_BUFFER*/ null);
 }
}

var _emscripten_glDrawElements = _glDrawElements;

/** @suppress {duplicate } */ function _glDrawElementsInstanced(mode, count, type, indices, primcount) {
 indices >>>= 0;
 GLctx.drawElementsInstanced(mode, count, type, indices, primcount);
}

var _emscripten_glDrawElementsInstanced = _glDrawElementsInstanced;

/** @suppress {duplicate } */ function _glDrawRangeElements(mode, start, end, count, type, indices) {
 indices >>>= 0;
 _glDrawElements(mode, count, type, indices);
}

var _emscripten_glDrawRangeElements = _glDrawRangeElements;

/** @suppress {duplicate } */ var _glEnable = x0 => GLctx.enable(x0);

var _emscripten_glEnable = _glEnable;

/** @suppress {duplicate } */ var _glEnableVertexAttribArray = index => {
 var cb = GL.currentContext.clientBuffers[index];
 cb.enabled = true;
 GLctx.enableVertexAttribArray(index);
};

var _emscripten_glEnableVertexAttribArray = _glEnableVertexAttribArray;

/** @suppress {duplicate } */ var _glEndQuery = x0 => GLctx.endQuery(x0);

var _emscripten_glEndQuery = _glEndQuery;

/** @suppress {duplicate } */ var _glEndQueryEXT = target => {
 GLctx.disjointTimerQueryExt["endQueryEXT"](target);
};

var _emscripten_glEndQueryEXT = _glEndQueryEXT;

/** @suppress {duplicate } */ var _glEndTransformFeedback = () => GLctx.endTransformFeedback();

var _emscripten_glEndTransformFeedback = _glEndTransformFeedback;

/** @suppress {duplicate } */ function _glFenceSync(condition, flags) {
 var sync = GLctx.fenceSync(condition, flags);
 if (sync) {
  var id = GL.getNewId(GL.syncs);
  sync.name = id;
  GL.syncs[id] = sync;
  return id;
 }
 return 0;
}

var _emscripten_glFenceSync = _glFenceSync;

/** @suppress {duplicate } */ var _glFinish = () => GLctx.finish();

var _emscripten_glFinish = _glFinish;

/** @suppress {duplicate } */ var _glFlush = () => GLctx.flush();

var _emscripten_glFlush = _glFlush;

var emscriptenWebGLGetBufferBinding = target => {
 switch (target) {
 case 34962:
  /*GL_ARRAY_BUFFER*/ target = 34964;
  /*GL_ARRAY_BUFFER_BINDING*/ break;

 case 34963:
  /*GL_ELEMENT_ARRAY_BUFFER*/ target = 34965;
  /*GL_ELEMENT_ARRAY_BUFFER_BINDING*/ break;

 case 35051:
  /*GL_PIXEL_PACK_BUFFER*/ target = 35053;
  /*GL_PIXEL_PACK_BUFFER_BINDING*/ break;

 case 35052:
  /*GL_PIXEL_UNPACK_BUFFER*/ target = 35055;
  /*GL_PIXEL_UNPACK_BUFFER_BINDING*/ break;

 case 35982:
  /*GL_TRANSFORM_FEEDBACK_BUFFER*/ target = 35983;
  /*GL_TRANSFORM_FEEDBACK_BUFFER_BINDING*/ break;

 case 36662:
  /*GL_COPY_READ_BUFFER*/ target = 36662;
  /*GL_COPY_READ_BUFFER_BINDING*/ break;

 case 36663:
  /*GL_COPY_WRITE_BUFFER*/ target = 36663;
  /*GL_COPY_WRITE_BUFFER_BINDING*/ break;

 case 35345:
  /*GL_UNIFORM_BUFFER*/ target = 35368;
  /*GL_UNIFORM_BUFFER_BINDING*/ break;
 }
 var buffer = GLctx.getParameter(target);
 if (buffer) return buffer.name | 0; else return 0;
};

var emscriptenWebGLValidateMapBufferTarget = target => {
 switch (target) {
 case 34962:
 case 34963:
 case 36662:
 case 36663:
 case 35051:
 case 35052:
 case 35882:
 case 35982:
 case 35345:
  return true;

 default:
  return false;
 }
};

/** @suppress {duplicate } */ function _glFlushMappedBufferRange(target, offset, length) {
 offset >>>= 0;
 length >>>= 0;
 if (!emscriptenWebGLValidateMapBufferTarget(target)) {
  GL.recordError(1280);
  /*GL_INVALID_ENUM*/ err("GL_INVALID_ENUM in glFlushMappedBufferRange");
  return;
 }
 var mapping = GL.mappedBuffers[emscriptenWebGLGetBufferBinding(target)];
 if (!mapping) {
  GL.recordError(1282);
  /* GL_INVALID_OPERATION */ err("buffer was never mapped in glFlushMappedBufferRange");
  return;
 }
 if (!(mapping.access & 16)) {
  GL.recordError(1282);
  /* GL_INVALID_OPERATION */ err("buffer was not mapped with GL_MAP_FLUSH_EXPLICIT_BIT in glFlushMappedBufferRange");
  return;
 }
 if (offset < 0 || length < 0 || offset + length > mapping.length) {
  GL.recordError(1281);
  /* GL_INVALID_VALUE */ err("invalid range in glFlushMappedBufferRange");
  return;
 }
 GLctx.bufferSubData(target, mapping.offset, GROWABLE_HEAP_U8().subarray(mapping.mem + offset >>> 0, mapping.mem + offset + length >>> 0));
}

var _emscripten_glFlushMappedBufferRange = _glFlushMappedBufferRange;

/** @suppress {duplicate } */ var _glFramebufferRenderbuffer = (target, attachment, renderbuffertarget, renderbuffer) => {
 GLctx.framebufferRenderbuffer(target, attachment, renderbuffertarget, GL.renderbuffers[renderbuffer]);
};

var _emscripten_glFramebufferRenderbuffer = _glFramebufferRenderbuffer;

/** @suppress {duplicate } */ var _glFramebufferTexture2D = (target, attachment, textarget, texture, level) => {
 GLctx.framebufferTexture2D(target, attachment, textarget, GL.textures[texture], level);
};

var _emscripten_glFramebufferTexture2D = _glFramebufferTexture2D;

/** @suppress {duplicate } */ var _glFramebufferTextureLayer = (target, attachment, texture, level, layer) => {
 GLctx.framebufferTextureLayer(target, attachment, GL.textures[texture], level, layer);
};

var _emscripten_glFramebufferTextureLayer = _glFramebufferTextureLayer;

/** @suppress {duplicate } */ var _glFrontFace = x0 => GLctx.frontFace(x0);

var _emscripten_glFrontFace = _glFrontFace;

/** @suppress {duplicate } */ function _glGenBuffers(n, buffers) {
 buffers >>>= 0;
 GL.genObject(n, buffers, "createBuffer", GL.buffers);
}

var _emscripten_glGenBuffers = _glGenBuffers;

/** @suppress {duplicate } */ function _glGenFramebuffers(n, ids) {
 ids >>>= 0;
 GL.genObject(n, ids, "createFramebuffer", GL.framebuffers);
}

var _emscripten_glGenFramebuffers = _glGenFramebuffers;

/** @suppress {duplicate } */ function _glGenQueries(n, ids) {
 ids >>>= 0;
 GL.genObject(n, ids, "createQuery", GL.queries);
}

var _emscripten_glGenQueries = _glGenQueries;

/** @suppress {duplicate } */ function _glGenQueriesEXT(n, ids) {
 ids >>>= 0;
 for (var i = 0; i < n; i++) {
  var query = GLctx.disjointTimerQueryExt["createQueryEXT"]();
  if (!query) {
   GL.recordError(1282);
   /* GL_INVALID_OPERATION */ while (i < n) GROWABLE_HEAP_I32()[(((ids) + (i++ * 4)) >>> 2) >>> 0] = 0;
   return;
  }
  var id = GL.getNewId(GL.queries);
  query.name = id;
  GL.queries[id] = query;
  GROWABLE_HEAP_I32()[(((ids) + (i * 4)) >>> 2) >>> 0] = id;
 }
}

var _emscripten_glGenQueriesEXT = _glGenQueriesEXT;

/** @suppress {duplicate } */ function _glGenRenderbuffers(n, renderbuffers) {
 renderbuffers >>>= 0;
 GL.genObject(n, renderbuffers, "createRenderbuffer", GL.renderbuffers);
}

var _emscripten_glGenRenderbuffers = _glGenRenderbuffers;

/** @suppress {duplicate } */ function _glGenSamplers(n, samplers) {
 samplers >>>= 0;
 GL.genObject(n, samplers, "createSampler", GL.samplers);
}

var _emscripten_glGenSamplers = _glGenSamplers;

/** @suppress {duplicate } */ function _glGenTextures(n, textures) {
 textures >>>= 0;
 GL.genObject(n, textures, "createTexture", GL.textures);
}

var _emscripten_glGenTextures = _glGenTextures;

/** @suppress {duplicate } */ function _glGenTransformFeedbacks(n, ids) {
 ids >>>= 0;
 GL.genObject(n, ids, "createTransformFeedback", GL.transformFeedbacks);
}

var _emscripten_glGenTransformFeedbacks = _glGenTransformFeedbacks;

/** @suppress {duplicate } */ function _glGenVertexArrays(n, arrays) {
 arrays >>>= 0;
 GL.genObject(n, arrays, "createVertexArray", GL.vaos);
}

var _emscripten_glGenVertexArrays = _glGenVertexArrays;

/** @suppress {duplicate } */ var _glGenerateMipmap = x0 => GLctx.generateMipmap(x0);

var _emscripten_glGenerateMipmap = _glGenerateMipmap;

var __glGetActiveAttribOrUniform = (funcName, program, index, bufSize, length, size, type, name) => {
 program = GL.programs[program];
 var info = GLctx[funcName](program, index);
 if (info) {
  var numBytesWrittenExclNull = name && stringToUTF8(info.name, name, bufSize);
  if (length) GROWABLE_HEAP_I32()[((length) >>> 2) >>> 0] = numBytesWrittenExclNull;
  if (size) GROWABLE_HEAP_I32()[((size) >>> 2) >>> 0] = info.size;
  if (type) GROWABLE_HEAP_I32()[((type) >>> 2) >>> 0] = info.type;
 }
};

/** @suppress {duplicate } */ function _glGetActiveAttrib(program, index, bufSize, length, size, type, name) {
 length >>>= 0;
 size >>>= 0;
 type >>>= 0;
 name >>>= 0;
 __glGetActiveAttribOrUniform("getActiveAttrib", program, index, bufSize, length, size, type, name);
}

var _emscripten_glGetActiveAttrib = _glGetActiveAttrib;

/** @suppress {duplicate } */ function _glGetActiveUniform(program, index, bufSize, length, size, type, name) {
 length >>>= 0;
 size >>>= 0;
 type >>>= 0;
 name >>>= 0;
 __glGetActiveAttribOrUniform("getActiveUniform", program, index, bufSize, length, size, type, name);
}

var _emscripten_glGetActiveUniform = _glGetActiveUniform;

/** @suppress {duplicate } */ function _glGetActiveUniformBlockName(program, uniformBlockIndex, bufSize, length, uniformBlockName) {
 length >>>= 0;
 uniformBlockName >>>= 0;
 program = GL.programs[program];
 var result = GLctx.getActiveUniformBlockName(program, uniformBlockIndex);
 if (!result) return;
 if (uniformBlockName && bufSize > 0) {
  var numBytesWrittenExclNull = stringToUTF8(result, uniformBlockName, bufSize);
  if (length) GROWABLE_HEAP_I32()[((length) >>> 2) >>> 0] = numBytesWrittenExclNull;
 } else {
  if (length) GROWABLE_HEAP_I32()[((length) >>> 2) >>> 0] = 0;
 }
}

var _emscripten_glGetActiveUniformBlockName = _glGetActiveUniformBlockName;

/** @suppress {duplicate } */ function _glGetActiveUniformBlockiv(program, uniformBlockIndex, pname, params) {
 params >>>= 0;
 if (!params) {
  GL.recordError(1281);
  /* GL_INVALID_VALUE */ return;
 }
 program = GL.programs[program];
 if (pname == 35393) /* GL_UNIFORM_BLOCK_NAME_LENGTH */ {
  var name = GLctx.getActiveUniformBlockName(program, uniformBlockIndex);
  GROWABLE_HEAP_I32()[((params) >>> 2) >>> 0] = name.length + 1;
  return;
 }
 var result = GLctx.getActiveUniformBlockParameter(program, uniformBlockIndex, pname);
 if (result === null) return;
 if (pname == 35395) /*GL_UNIFORM_BLOCK_ACTIVE_UNIFORM_INDICES*/ {
  for (var i = 0; i < result.length; i++) {
   GROWABLE_HEAP_I32()[(((params) + (i * 4)) >>> 2) >>> 0] = result[i];
  }
 } else {
  GROWABLE_HEAP_I32()[((params) >>> 2) >>> 0] = result;
 }
}

var _emscripten_glGetActiveUniformBlockiv = _glGetActiveUniformBlockiv;

/** @suppress {duplicate } */ function _glGetActiveUniformsiv(program, uniformCount, uniformIndices, pname, params) {
 uniformIndices >>>= 0;
 params >>>= 0;
 if (!params) {
  GL.recordError(1281);
  /* GL_INVALID_VALUE */ return;
 }
 if (uniformCount > 0 && uniformIndices == 0) {
  GL.recordError(1281);
  /* GL_INVALID_VALUE */ return;
 }
 program = GL.programs[program];
 var ids = [];
 for (var i = 0; i < uniformCount; i++) {
  ids.push(GROWABLE_HEAP_I32()[(((uniformIndices) + (i * 4)) >>> 2) >>> 0]);
 }
 var result = GLctx.getActiveUniforms(program, ids, pname);
 if (!result) return;
 var len = result.length;
 for (var i = 0; i < len; i++) {
  GROWABLE_HEAP_I32()[(((params) + (i * 4)) >>> 2) >>> 0] = result[i];
 }
}

var _emscripten_glGetActiveUniformsiv = _glGetActiveUniformsiv;

/** @suppress {duplicate } */ function _glGetAttachedShaders(program, maxCount, count, shaders) {
 count >>>= 0;
 shaders >>>= 0;
 var result = GLctx.getAttachedShaders(GL.programs[program]);
 var len = result.length;
 if (len > maxCount) {
  len = maxCount;
 }
 GROWABLE_HEAP_I32()[((count) >>> 2) >>> 0] = len;
 for (var i = 0; i < len; ++i) {
  var id = GL.shaders.indexOf(result[i]);
  GROWABLE_HEAP_I32()[(((shaders) + (i * 4)) >>> 2) >>> 0] = id;
 }
}

var _emscripten_glGetAttachedShaders = _glGetAttachedShaders;

/** @suppress {duplicate } */ function _glGetAttribLocation(program, name) {
 name >>>= 0;
 return GLctx.getAttribLocation(GL.programs[program], UTF8ToString(name));
}

var _emscripten_glGetAttribLocation = _glGetAttribLocation;

var readI53FromU64 = ptr => GROWABLE_HEAP_U32()[((ptr) >>> 2) >>> 0] + GROWABLE_HEAP_U32()[(((ptr) + (4)) >>> 2) >>> 0] * 4294967296;

var writeI53ToI64 = (ptr, num) => {
 GROWABLE_HEAP_U32()[((ptr) >>> 2) >>> 0] = num;
 var lower = GROWABLE_HEAP_U32()[((ptr) >>> 2) >>> 0];
 GROWABLE_HEAP_U32()[(((ptr) + (4)) >>> 2) >>> 0] = (num - lower) / 4294967296;
 var deserialized = (num >= 0) ? readI53FromU64(ptr) : readI53FromI64(ptr);
 var offset = ((ptr) >>> 2);
 if (deserialized != num) warnOnce(\`writeI53ToI64() out of range: serialized JS Number \${num} to Wasm heap as bytes lo=\${ptrToString(GROWABLE_HEAP_U32()[offset >>> 0])}, hi=\${ptrToString(GROWABLE_HEAP_U32()[offset + 1 >>> 0])}, which deserializes back to \${deserialized} instead!\`);
};

var webglGetExtensions = function $webglGetExtensions() {
 var exts = getEmscriptenSupportedExtensions(GLctx);
 exts = exts.concat(exts.map(e => "GL_" + e));
 return exts;
};

var emscriptenWebGLGet = (name_, p, type) => {
 if (!p) {
  GL.recordError(1281);
  /* GL_INVALID_VALUE */ return;
 }
 var ret = undefined;
 switch (name_) {
 case 36346:
  ret = 1;
  break;

 case 36344:
  if (type != 0 && type != 1) {
   GL.recordError(1280);
  }
  return;

 case 34814:
 case 36345:
  ret = 0;
  break;

 case 34466:
  var formats = GLctx.getParameter(34467);
  /*GL_COMPRESSED_TEXTURE_FORMATS*/ ret = formats ? formats.length : 0;
  break;

 case 33309:
  if (GL.currentContext.version < 2) {
   GL.recordError(1282);
   /* GL_INVALID_OPERATION */ return;
  }
  ret = webglGetExtensions().length;
  break;

 case 33307:
 case 33308:
  if (GL.currentContext.version < 2) {
   GL.recordError(1280);
   return;
  }
  ret = name_ == 33307 ? 3 : 0;
  break;
 }
 if (ret === undefined) {
  var result = GLctx.getParameter(name_);
  switch (typeof result) {
  case "number":
   ret = result;
   break;

  case "boolean":
   ret = result ? 1 : 0;
   break;

  case "string":
   GL.recordError(1280);
   return;

  case "object":
   if (result === null) {
    switch (name_) {
    case 34964:
    case 35725:
    case 34965:
    case 36006:
    case 36007:
    case 32873:
    case 34229:
    case 36662:
    case 36663:
    case 35053:
    case 35055:
    case 36010:
    case 35097:
    case 35869:
    case 32874:
    case 36389:
    case 35983:
    case 35368:
    case 34068:
     {
      ret = 0;
      break;
     }

    default:
     {
      GL.recordError(1280);
      return;
     }
    }
   } else if (result instanceof Float32Array || result instanceof Uint32Array || result instanceof Int32Array || result instanceof Array) {
    for (var i = 0; i < result.length; ++i) {
     switch (type) {
     case 0:
      GROWABLE_HEAP_I32()[(((p) + (i * 4)) >>> 2) >>> 0] = result[i];
      break;

     case 2:
      GROWABLE_HEAP_F32()[(((p) + (i * 4)) >>> 2) >>> 0] = result[i];
      break;

     case 4:
      GROWABLE_HEAP_I8()[(p) + (i) >>> 0] = result[i] ? 1 : 0;
      break;
     }
    }
    return;
   } else {
    try {
     ret = result.name | 0;
    } catch (e) {
     GL.recordError(1280);
     err(\`GL_INVALID_ENUM in glGet\${type}v: Unknown object returned from WebGL getParameter(\${name_})! (error: \${e})\`);
     return;
    }
   }
   break;

  default:
   GL.recordError(1280);
   err(\`GL_INVALID_ENUM in glGet\${type}v: Native code calling glGet\${type}v(\${name_}) and it returns \${result} of type \${typeof (result)}!\`);
   return;
  }
 }
 switch (type) {
 case 1:
  writeI53ToI64(p, ret);
  break;

 case 0:
  GROWABLE_HEAP_I32()[((p) >>> 2) >>> 0] = ret;
  break;

 case 2:
  GROWABLE_HEAP_F32()[((p) >>> 2) >>> 0] = ret;
  break;

 case 4:
  GROWABLE_HEAP_I8()[p >>> 0] = ret ? 1 : 0;
  break;
 }
};

/** @suppress {duplicate } */ function _glGetBooleanv(name_, p) {
 p >>>= 0;
 return emscriptenWebGLGet(name_, p, 4);
}

var _emscripten_glGetBooleanv = _glGetBooleanv;

/** @suppress {duplicate } */ function _glGetBufferParameteri64v(target, value, data) {
 data >>>= 0;
 if (!data) {
  GL.recordError(1281);
  /* GL_INVALID_VALUE */ return;
 }
 writeI53ToI64(data, GLctx.getBufferParameter(target, value));
}

var _emscripten_glGetBufferParameteri64v = _glGetBufferParameteri64v;

/** @suppress {duplicate } */ function _glGetBufferParameteriv(target, value, data) {
 data >>>= 0;
 if (!data) {
  GL.recordError(1281);
  /* GL_INVALID_VALUE */ return;
 }
 GROWABLE_HEAP_I32()[((data) >>> 2) >>> 0] = GLctx.getBufferParameter(target, value);
}

var _emscripten_glGetBufferParameteriv = _glGetBufferParameteriv;

/** @suppress {duplicate } */ function _glGetBufferPointerv(target, pname, params) {
 params >>>= 0;
 if (pname == 35005) /*GL_BUFFER_MAP_POINTER*/ {
  var ptr = 0;
  var mappedBuffer = GL.mappedBuffers[emscriptenWebGLGetBufferBinding(target)];
  if (mappedBuffer) {
   ptr = mappedBuffer.mem;
  }
  GROWABLE_HEAP_I32()[((params) >>> 2) >>> 0] = ptr;
 } else {
  GL.recordError(1280);
  /*GL_INVALID_ENUM*/ err("GL_INVALID_ENUM in glGetBufferPointerv");
 }
}

var _emscripten_glGetBufferPointerv = _glGetBufferPointerv;

/** @suppress {duplicate } */ var _glGetError = () => {
 var error = GLctx.getError() || GL.lastError;
 GL.lastError = 0;
 /*GL_NO_ERROR*/ return error;
};

var _emscripten_glGetError = _glGetError;

/** @suppress {duplicate } */ function _glGetFloatv(name_, p) {
 p >>>= 0;
 return emscriptenWebGLGet(name_, p, 2);
}

var _emscripten_glGetFloatv = _glGetFloatv;

/** @suppress {duplicate } */ function _glGetFragDataLocation(program, name) {
 name >>>= 0;
 return GLctx.getFragDataLocation(GL.programs[program], UTF8ToString(name));
}

var _emscripten_glGetFragDataLocation = _glGetFragDataLocation;

/** @suppress {duplicate } */ function _glGetFramebufferAttachmentParameteriv(target, attachment, pname, params) {
 params >>>= 0;
 var result = GLctx.getFramebufferAttachmentParameter(target, attachment, pname);
 if (result instanceof WebGLRenderbuffer || result instanceof WebGLTexture) {
  result = result.name | 0;
 }
 GROWABLE_HEAP_I32()[((params) >>> 2) >>> 0] = result;
}

var _emscripten_glGetFramebufferAttachmentParameteriv = _glGetFramebufferAttachmentParameteriv;

var emscriptenWebGLGetIndexed = (target, index, data, type) => {
 if (!data) {
  GL.recordError(1281);
  /* GL_INVALID_VALUE */ return;
 }
 var result = GLctx.getIndexedParameter(target, index);
 var ret;
 switch (typeof result) {
 case "boolean":
  ret = result ? 1 : 0;
  break;

 case "number":
  ret = result;
  break;

 case "object":
  if (result === null) {
   switch (target) {
   case 35983:
   case 35368:
    ret = 0;
    break;

   default:
    {
     GL.recordError(1280);
     return;
    }
   }
  } else if (result instanceof WebGLBuffer) {
   ret = result.name | 0;
  } else {
   GL.recordError(1280);
   return;
  }
  break;

 default:
  GL.recordError(1280);
  return;
 }
 switch (type) {
 case 1:
  writeI53ToI64(data, ret);
  break;

 case 0:
  GROWABLE_HEAP_I32()[((data) >>> 2) >>> 0] = ret;
  break;

 case 2:
  GROWABLE_HEAP_F32()[((data) >>> 2) >>> 0] = ret;
  break;

 case 4:
  GROWABLE_HEAP_I8()[data >>> 0] = ret ? 1 : 0;
  break;

 default:
  throw "internal emscriptenWebGLGetIndexed() error, bad type: " + type;
 }
};

/** @suppress {duplicate } */ function _glGetInteger64i_v(target, index, data) {
 data >>>= 0;
 return emscriptenWebGLGetIndexed(target, index, data, 1);
}

var _emscripten_glGetInteger64i_v = _glGetInteger64i_v;

/** @suppress {duplicate } */ function _glGetInteger64v(name_, p) {
 p >>>= 0;
 emscriptenWebGLGet(name_, p, 1);
}

var _emscripten_glGetInteger64v = _glGetInteger64v;

/** @suppress {duplicate } */ function _glGetIntegeri_v(target, index, data) {
 data >>>= 0;
 return emscriptenWebGLGetIndexed(target, index, data, 0);
}

var _emscripten_glGetIntegeri_v = _glGetIntegeri_v;

/** @suppress {duplicate } */ function _glGetIntegerv(name_, p) {
 p >>>= 0;
 return emscriptenWebGLGet(name_, p, 0);
}

var _emscripten_glGetIntegerv = _glGetIntegerv;

/** @suppress {duplicate } */ function _glGetInternalformativ(target, internalformat, pname, bufSize, params) {
 params >>>= 0;
 if (bufSize < 0) {
  GL.recordError(1281);
  /* GL_INVALID_VALUE */ return;
 }
 if (!params) {
  GL.recordError(1281);
  /* GL_INVALID_VALUE */ return;
 }
 var ret = GLctx.getInternalformatParameter(target, internalformat, pname);
 if (ret === null) return;
 for (var i = 0; i < ret.length && i < bufSize; ++i) {
  GROWABLE_HEAP_I32()[(((params) + (i * 4)) >>> 2) >>> 0] = ret[i];
 }
}

var _emscripten_glGetInternalformativ = _glGetInternalformativ;

/** @suppress {duplicate } */ function _glGetProgramBinary(program, bufSize, length, binaryFormat, binary) {
 length >>>= 0;
 binaryFormat >>>= 0;
 binary >>>= 0;
 GL.recordError(1282);
}

var _emscripten_glGetProgramBinary = _glGetProgramBinary;

/** @suppress {duplicate } */ function _glGetProgramInfoLog(program, maxLength, length, infoLog) {
 length >>>= 0;
 infoLog >>>= 0;
 var log = GLctx.getProgramInfoLog(GL.programs[program]);
 if (log === null) log = "(unknown error)";
 var numBytesWrittenExclNull = (maxLength > 0 && infoLog) ? stringToUTF8(log, infoLog, maxLength) : 0;
 if (length) GROWABLE_HEAP_I32()[((length) >>> 2) >>> 0] = numBytesWrittenExclNull;
}

var _emscripten_glGetProgramInfoLog = _glGetProgramInfoLog;

/** @suppress {duplicate } */ function _glGetProgramiv(program, pname, p) {
 p >>>= 0;
 if (!p) {
  GL.recordError(1281);
  /* GL_INVALID_VALUE */ return;
 }
 if (program >= GL.counter) {
  GL.recordError(1281);
  /* GL_INVALID_VALUE */ return;
 }
 program = GL.programs[program];
 if (pname == 35716) {
  var log = GLctx.getProgramInfoLog(program);
  if (log === null) log = "(unknown error)";
  GROWABLE_HEAP_I32()[((p) >>> 2) >>> 0] = log.length + 1;
 } else if (pname == 35719) /* GL_ACTIVE_UNIFORM_MAX_LENGTH */ {
  if (!program.maxUniformLength) {
   for (var i = 0; i < GLctx.getProgramParameter(program, 35718); /*GL_ACTIVE_UNIFORMS*/ ++i) {
    program.maxUniformLength = Math.max(program.maxUniformLength, GLctx.getActiveUniform(program, i).name.length + 1);
   }
  }
  GROWABLE_HEAP_I32()[((p) >>> 2) >>> 0] = program.maxUniformLength;
 } else if (pname == 35722) /* GL_ACTIVE_ATTRIBUTE_MAX_LENGTH */ {
  if (!program.maxAttributeLength) {
   for (var i = 0; i < GLctx.getProgramParameter(program, 35721); /*GL_ACTIVE_ATTRIBUTES*/ ++i) {
    program.maxAttributeLength = Math.max(program.maxAttributeLength, GLctx.getActiveAttrib(program, i).name.length + 1);
   }
  }
  GROWABLE_HEAP_I32()[((p) >>> 2) >>> 0] = program.maxAttributeLength;
 } else if (pname == 35381) /* GL_ACTIVE_UNIFORM_BLOCK_MAX_NAME_LENGTH */ {
  if (!program.maxUniformBlockNameLength) {
   for (var i = 0; i < GLctx.getProgramParameter(program, 35382); /*GL_ACTIVE_UNIFORM_BLOCKS*/ ++i) {
    program.maxUniformBlockNameLength = Math.max(program.maxUniformBlockNameLength, GLctx.getActiveUniformBlockName(program, i).length + 1);
   }
  }
  GROWABLE_HEAP_I32()[((p) >>> 2) >>> 0] = program.maxUniformBlockNameLength;
 } else {
  GROWABLE_HEAP_I32()[((p) >>> 2) >>> 0] = GLctx.getProgramParameter(program, pname);
 }
}

var _emscripten_glGetProgramiv = _glGetProgramiv;

/** @suppress {duplicate } */ function _glGetQueryObjecti64vEXT(id, pname, params) {
 params >>>= 0;
 if (!params) {
  GL.recordError(1281);
  /* GL_INVALID_VALUE */ return;
 }
 var query = GL.queries[id];
 var param;
 if (GL.currentContext.version < 2) {
  param = GLctx.disjointTimerQueryExt["getQueryObjectEXT"](query, pname);
 } else {
  param = GLctx.getQueryParameter(query, pname);
 }
 var ret;
 if (typeof param == "boolean") {
  ret = param ? 1 : 0;
 } else {
  ret = param;
 }
 writeI53ToI64(params, ret);
}

var _emscripten_glGetQueryObjecti64vEXT = _glGetQueryObjecti64vEXT;

/** @suppress {duplicate } */ function _glGetQueryObjectivEXT(id, pname, params) {
 params >>>= 0;
 if (!params) {
  GL.recordError(1281);
  /* GL_INVALID_VALUE */ return;
 }
 var query = GL.queries[id];
 var param = GLctx.disjointTimerQueryExt["getQueryObjectEXT"](query, pname);
 var ret;
 if (typeof param == "boolean") {
  ret = param ? 1 : 0;
 } else {
  ret = param;
 }
 GROWABLE_HEAP_I32()[((params) >>> 2) >>> 0] = ret;
}

var _emscripten_glGetQueryObjectivEXT = _glGetQueryObjectivEXT;

/** @suppress {duplicate } */ var _glGetQueryObjectui64vEXT = _glGetQueryObjecti64vEXT;

var _emscripten_glGetQueryObjectui64vEXT = _glGetQueryObjectui64vEXT;

/** @suppress {duplicate } */ function _glGetQueryObjectuiv(id, pname, params) {
 params >>>= 0;
 if (!params) {
  GL.recordError(1281);
  /* GL_INVALID_VALUE */ return;
 }
 var query = GL.queries[id];
 var param = GLctx.getQueryParameter(query, pname);
 var ret;
 if (typeof param == "boolean") {
  ret = param ? 1 : 0;
 } else {
  ret = param;
 }
 GROWABLE_HEAP_I32()[((params) >>> 2) >>> 0] = ret;
}

var _emscripten_glGetQueryObjectuiv = _glGetQueryObjectuiv;

/** @suppress {duplicate } */ var _glGetQueryObjectuivEXT = _glGetQueryObjectivEXT;

var _emscripten_glGetQueryObjectuivEXT = _glGetQueryObjectuivEXT;

/** @suppress {duplicate } */ function _glGetQueryiv(target, pname, params) {
 params >>>= 0;
 if (!params) {
  GL.recordError(1281);
  /* GL_INVALID_VALUE */ return;
 }
 GROWABLE_HEAP_I32()[((params) >>> 2) >>> 0] = GLctx.getQuery(target, pname);
}

var _emscripten_glGetQueryiv = _glGetQueryiv;

/** @suppress {duplicate } */ function _glGetQueryivEXT(target, pname, params) {
 params >>>= 0;
 if (!params) {
  GL.recordError(1281);
  /* GL_INVALID_VALUE */ return;
 }
 GROWABLE_HEAP_I32()[((params) >>> 2) >>> 0] = GLctx.disjointTimerQueryExt["getQueryEXT"](target, pname);
}

var _emscripten_glGetQueryivEXT = _glGetQueryivEXT;

/** @suppress {duplicate } */ function _glGetRenderbufferParameteriv(target, pname, params) {
 params >>>= 0;
 if (!params) {
  GL.recordError(1281);
  /* GL_INVALID_VALUE */ return;
 }
 GROWABLE_HEAP_I32()[((params) >>> 2) >>> 0] = GLctx.getRenderbufferParameter(target, pname);
}

var _emscripten_glGetRenderbufferParameteriv = _glGetRenderbufferParameteriv;

/** @suppress {duplicate } */ function _glGetSamplerParameterfv(sampler, pname, params) {
 params >>>= 0;
 if (!params) {
  GL.recordError(1281);
  /* GL_INVALID_VALUE */ return;
 }
 GROWABLE_HEAP_F32()[((params) >>> 2) >>> 0] = GLctx.getSamplerParameter(GL.samplers[sampler], pname);
}

var _emscripten_glGetSamplerParameterfv = _glGetSamplerParameterfv;

/** @suppress {duplicate } */ function _glGetSamplerParameteriv(sampler, pname, params) {
 params >>>= 0;
 if (!params) {
  GL.recordError(1281);
  /* GL_INVALID_VALUE */ return;
 }
 GROWABLE_HEAP_I32()[((params) >>> 2) >>> 0] = GLctx.getSamplerParameter(GL.samplers[sampler], pname);
}

var _emscripten_glGetSamplerParameteriv = _glGetSamplerParameteriv;

/** @suppress {duplicate } */ function _glGetShaderInfoLog(shader, maxLength, length, infoLog) {
 length >>>= 0;
 infoLog >>>= 0;
 var log = GLctx.getShaderInfoLog(GL.shaders[shader]);
 if (log === null) log = "(unknown error)";
 var numBytesWrittenExclNull = (maxLength > 0 && infoLog) ? stringToUTF8(log, infoLog, maxLength) : 0;
 if (length) GROWABLE_HEAP_I32()[((length) >>> 2) >>> 0] = numBytesWrittenExclNull;
}

var _emscripten_glGetShaderInfoLog = _glGetShaderInfoLog;

/** @suppress {duplicate } */ function _glGetShaderPrecisionFormat(shaderType, precisionType, range, precision) {
 range >>>= 0;
 precision >>>= 0;
 var result = GLctx.getShaderPrecisionFormat(shaderType, precisionType);
 GROWABLE_HEAP_I32()[((range) >>> 2) >>> 0] = result.rangeMin;
 GROWABLE_HEAP_I32()[(((range) + (4)) >>> 2) >>> 0] = result.rangeMax;
 GROWABLE_HEAP_I32()[((precision) >>> 2) >>> 0] = result.precision;
}

var _emscripten_glGetShaderPrecisionFormat = _glGetShaderPrecisionFormat;

/** @suppress {duplicate } */ function _glGetShaderSource(shader, bufSize, length, source) {
 length >>>= 0;
 source >>>= 0;
 var result = GLctx.getShaderSource(GL.shaders[shader]);
 if (!result) return;
 var numBytesWrittenExclNull = (bufSize > 0 && source) ? stringToUTF8(result, source, bufSize) : 0;
 if (length) GROWABLE_HEAP_I32()[((length) >>> 2) >>> 0] = numBytesWrittenExclNull;
}

var _emscripten_glGetShaderSource = _glGetShaderSource;

/** @suppress {duplicate } */ function _glGetShaderiv(shader, pname, p) {
 p >>>= 0;
 if (!p) {
  GL.recordError(1281);
  /* GL_INVALID_VALUE */ return;
 }
 if (pname == 35716) {
  var log = GLctx.getShaderInfoLog(GL.shaders[shader]);
  if (log === null) log = "(unknown error)";
  var logLength = log ? log.length + 1 : 0;
  GROWABLE_HEAP_I32()[((p) >>> 2) >>> 0] = logLength;
 } else if (pname == 35720) {
  var source = GLctx.getShaderSource(GL.shaders[shader]);
  var sourceLength = source ? source.length + 1 : 0;
  GROWABLE_HEAP_I32()[((p) >>> 2) >>> 0] = sourceLength;
 } else {
  GROWABLE_HEAP_I32()[((p) >>> 2) >>> 0] = GLctx.getShaderParameter(GL.shaders[shader], pname);
 }
}

var _emscripten_glGetShaderiv = _glGetShaderiv;

/** @suppress {duplicate } */ function _glGetString(name_) {
 var ret = GL.stringCache[name_];
 if (!ret) {
  switch (name_) {
  case 7939:
   /* GL_EXTENSIONS */ ret = stringToNewUTF8(webglGetExtensions().join(" "));
   break;

  case 7936:
  /* GL_VENDOR */ case 7937:
  /* GL_RENDERER */ case 37445:
  /* UNMASKED_VENDOR_WEBGL */ case 37446:
   /* UNMASKED_RENDERER_WEBGL */ var s = GLctx.getParameter(name_);
   if (!s) {
    GL.recordError(1280);
   }
   ret = s ? stringToNewUTF8(s) : 0;
   break;

  case 7938:
   /* GL_VERSION */ var glVersion = GLctx.getParameter(7938);
   if (GL.currentContext.version >= 2) glVersion = \`OpenGL ES 3.0 (\${glVersion})\`; else {
    glVersion = \`OpenGL ES 2.0 (\${glVersion})\`;
   }
   ret = stringToNewUTF8(glVersion);
   break;

  case 35724:
   /* GL_SHADING_LANGUAGE_VERSION */ var glslVersion = GLctx.getParameter(35724);
   var ver_re = /^WebGL GLSL ES ([0-9]\\.[0-9][0-9]?)(?:$| .*)/;
   var ver_num = glslVersion.match(ver_re);
   if (ver_num !== null) {
    if (ver_num[1].length == 3) ver_num[1] = ver_num[1] + "0";
    glslVersion = \`OpenGL ES GLSL ES \${ver_num[1]} (\${glslVersion})\`;
   }
   ret = stringToNewUTF8(glslVersion);
   break;

  default:
   GL.recordError(1280);
  }
  GL.stringCache[name_] = ret;
 }
 return ret;
}

var _emscripten_glGetString = _glGetString;

/** @suppress {duplicate } */ function _glGetStringi(name, index) {
 if (GL.currentContext.version < 2) {
  GL.recordError(1282);
  return 0;
 }
 var stringiCache = GL.stringiCache[name];
 if (stringiCache) {
  if (index < 0 || index >= stringiCache.length) {
   GL.recordError(1281);
   /*GL_INVALID_VALUE*/ return 0;
  }
  return stringiCache[index];
 }
 switch (name) {
 case 7939:
  /* GL_EXTENSIONS */ var exts = webglGetExtensions().map(stringToNewUTF8);
  stringiCache = GL.stringiCache[name] = exts;
  if (index < 0 || index >= stringiCache.length) {
   GL.recordError(1281);
   /*GL_INVALID_VALUE*/ return 0;
  }
  return stringiCache[index];

 default:
  GL.recordError(1280);
  /*GL_INVALID_ENUM*/ return 0;
 }
}

var _emscripten_glGetStringi = _glGetStringi;

/** @suppress {duplicate } */ function _glGetSynciv(sync, pname, bufSize, length, values) {
 sync >>>= 0;
 length >>>= 0;
 values >>>= 0;
 if (bufSize < 0) {
  GL.recordError(1281);
  /* GL_INVALID_VALUE */ return;
 }
 if (!values) {
  GL.recordError(1281);
  /* GL_INVALID_VALUE */ return;
 }
 var ret = GLctx.getSyncParameter(GL.syncs[sync], pname);
 if (ret !== null) {
  GROWABLE_HEAP_I32()[((values) >>> 2) >>> 0] = ret;
  if (length) GROWABLE_HEAP_I32()[((length) >>> 2) >>> 0] = 1;
 }
}

var _emscripten_glGetSynciv = _glGetSynciv;

/** @suppress {duplicate } */ function _glGetTexParameterfv(target, pname, params) {
 params >>>= 0;
 if (!params) {
  GL.recordError(1281);
  /* GL_INVALID_VALUE */ return;
 }
 GROWABLE_HEAP_F32()[((params) >>> 2) >>> 0] = GLctx.getTexParameter(target, pname);
}

var _emscripten_glGetTexParameterfv = _glGetTexParameterfv;

/** @suppress {duplicate } */ function _glGetTexParameteriv(target, pname, params) {
 params >>>= 0;
 if (!params) {
  GL.recordError(1281);
  /* GL_INVALID_VALUE */ return;
 }
 GROWABLE_HEAP_I32()[((params) >>> 2) >>> 0] = GLctx.getTexParameter(target, pname);
}

var _emscripten_glGetTexParameteriv = _glGetTexParameteriv;

/** @suppress {duplicate } */ function _glGetTransformFeedbackVarying(program, index, bufSize, length, size, type, name) {
 length >>>= 0;
 size >>>= 0;
 type >>>= 0;
 name >>>= 0;
 program = GL.programs[program];
 var info = GLctx.getTransformFeedbackVarying(program, index);
 if (!info) return;
 if (name && bufSize > 0) {
  var numBytesWrittenExclNull = stringToUTF8(info.name, name, bufSize);
  if (length) GROWABLE_HEAP_I32()[((length) >>> 2) >>> 0] = numBytesWrittenExclNull;
 } else {
  if (length) GROWABLE_HEAP_I32()[((length) >>> 2) >>> 0] = 0;
 }
 if (size) GROWABLE_HEAP_I32()[((size) >>> 2) >>> 0] = info.size;
 if (type) GROWABLE_HEAP_I32()[((type) >>> 2) >>> 0] = info.type;
}

var _emscripten_glGetTransformFeedbackVarying = _glGetTransformFeedbackVarying;

/** @suppress {duplicate } */ function _glGetUniformBlockIndex(program, uniformBlockName) {
 uniformBlockName >>>= 0;
 return GLctx.getUniformBlockIndex(GL.programs[program], UTF8ToString(uniformBlockName));
}

var _emscripten_glGetUniformBlockIndex = _glGetUniformBlockIndex;

/** @suppress {duplicate } */ function _glGetUniformIndices(program, uniformCount, uniformNames, uniformIndices) {
 uniformNames >>>= 0;
 uniformIndices >>>= 0;
 if (!uniformIndices) {
  GL.recordError(1281);
  /* GL_INVALID_VALUE */ return;
 }
 if (uniformCount > 0 && (uniformNames == 0 || uniformIndices == 0)) {
  GL.recordError(1281);
  /* GL_INVALID_VALUE */ return;
 }
 program = GL.programs[program];
 var names = [];
 for (var i = 0; i < uniformCount; i++) names.push(UTF8ToString(GROWABLE_HEAP_I32()[(((uniformNames) + (i * 4)) >>> 2) >>> 0]));
 var result = GLctx.getUniformIndices(program, names);
 if (!result) return;
 var len = result.length;
 for (var i = 0; i < len; i++) {
  GROWABLE_HEAP_I32()[(((uniformIndices) + (i * 4)) >>> 2) >>> 0] = result[i];
 }
}

var _emscripten_glGetUniformIndices = _glGetUniformIndices;

/** @noinline */ var webglGetLeftBracePos = name => name.slice(-1) == "]" && name.lastIndexOf("[");

var webglPrepareUniformLocationsBeforeFirstUse = program => {
 var uniformLocsById = program.uniformLocsById, uniformSizeAndIdsByName = program.uniformSizeAndIdsByName, i, j;
 if (!uniformLocsById) {
  program.uniformLocsById = uniformLocsById = {};
  program.uniformArrayNamesById = {};
  for (i = 0; i < GLctx.getProgramParameter(program, 35718); /*GL_ACTIVE_UNIFORMS*/ ++i) {
   var u = GLctx.getActiveUniform(program, i);
   var nm = u.name;
   var sz = u.size;
   var lb = webglGetLeftBracePos(nm);
   var arrayName = lb > 0 ? nm.slice(0, lb) : nm;
   var id = program.uniformIdCounter;
   program.uniformIdCounter += sz;
   uniformSizeAndIdsByName[arrayName] = [ sz, id ];
   for (j = 0; j < sz; ++j) {
    uniformLocsById[id] = j;
    program.uniformArrayNamesById[id++] = arrayName;
   }
  }
 }
};

/** @suppress {duplicate } */ function _glGetUniformLocation(program, name) {
 name >>>= 0;
 name = UTF8ToString(name);
 if (program = GL.programs[program]) {
  webglPrepareUniformLocationsBeforeFirstUse(program);
  var uniformLocsById = program.uniformLocsById;
  var arrayIndex = 0;
  var uniformBaseName = name;
  var leftBrace = webglGetLeftBracePos(name);
  if (leftBrace > 0) {
   arrayIndex = jstoi_q(name.slice(leftBrace + 1)) >>> 0;
   uniformBaseName = name.slice(0, leftBrace);
  }
  var sizeAndId = program.uniformSizeAndIdsByName[uniformBaseName];
  if (sizeAndId && arrayIndex < sizeAndId[0]) {
   arrayIndex += sizeAndId[1];
   if ((uniformLocsById[arrayIndex] = uniformLocsById[arrayIndex] || GLctx.getUniformLocation(program, name))) {
    return arrayIndex;
   }
  }
 } else {
  GL.recordError(1281);
 }
 /* GL_INVALID_VALUE */ return -1;
}

var _emscripten_glGetUniformLocation = _glGetUniformLocation;

var webglGetUniformLocation = location => {
 var p = GLctx.currentProgram;
 if (p) {
  var webglLoc = p.uniformLocsById[location];
  if (typeof webglLoc == "number") {
   p.uniformLocsById[location] = webglLoc = GLctx.getUniformLocation(p, p.uniformArrayNamesById[location] + (webglLoc > 0 ? \`[\${webglLoc}]\` : ""));
  }
  return webglLoc;
 } else {
  GL.recordError(1282);
 }
};

/** @suppress{checkTypes} */ var emscriptenWebGLGetUniform = (program, location, params, type) => {
 if (!params) {
  GL.recordError(1281);
  /* GL_INVALID_VALUE */ return;
 }
 program = GL.programs[program];
 webglPrepareUniformLocationsBeforeFirstUse(program);
 var data = GLctx.getUniform(program, webglGetUniformLocation(location));
 if (typeof data == "number" || typeof data == "boolean") {
  switch (type) {
  case 0:
   GROWABLE_HEAP_I32()[((params) >>> 2) >>> 0] = data;
   break;

  case 2:
   GROWABLE_HEAP_F32()[((params) >>> 2) >>> 0] = data;
   break;
  }
 } else {
  for (var i = 0; i < data.length; i++) {
   switch (type) {
   case 0:
    GROWABLE_HEAP_I32()[(((params) + (i * 4)) >>> 2) >>> 0] = data[i];
    break;

   case 2:
    GROWABLE_HEAP_F32()[(((params) + (i * 4)) >>> 2) >>> 0] = data[i];
    break;
   }
  }
 }
};

/** @suppress {duplicate } */ function _glGetUniformfv(program, location, params) {
 params >>>= 0;
 emscriptenWebGLGetUniform(program, location, params, 2);
}

var _emscripten_glGetUniformfv = _glGetUniformfv;

/** @suppress {duplicate } */ function _glGetUniformiv(program, location, params) {
 params >>>= 0;
 emscriptenWebGLGetUniform(program, location, params, 0);
}

var _emscripten_glGetUniformiv = _glGetUniformiv;

/** @suppress {duplicate } */ function _glGetUniformuiv(program, location, params) {
 params >>>= 0;
 return emscriptenWebGLGetUniform(program, location, params, 0);
}

var _emscripten_glGetUniformuiv = _glGetUniformuiv;

/** @suppress{checkTypes} */ var emscriptenWebGLGetVertexAttrib = (index, pname, params, type) => {
 if (!params) {
  GL.recordError(1281);
  /* GL_INVALID_VALUE */ return;
 }
 if (GL.currentContext.clientBuffers[index].enabled) {
  err("glGetVertexAttrib*v on client-side array: not supported, bad data returned");
 }
 var data = GLctx.getVertexAttrib(index, pname);
 if (pname == 34975) /*VERTEX_ATTRIB_ARRAY_BUFFER_BINDING*/ {
  GROWABLE_HEAP_I32()[((params) >>> 2) >>> 0] = data && data["name"];
 } else if (typeof data == "number" || typeof data == "boolean") {
  switch (type) {
  case 0:
   GROWABLE_HEAP_I32()[((params) >>> 2) >>> 0] = data;
   break;

  case 2:
   GROWABLE_HEAP_F32()[((params) >>> 2) >>> 0] = data;
   break;

  case 5:
   GROWABLE_HEAP_I32()[((params) >>> 2) >>> 0] = Math.fround(data);
   break;
  }
 } else {
  for (var i = 0; i < data.length; i++) {
   switch (type) {
   case 0:
    GROWABLE_HEAP_I32()[(((params) + (i * 4)) >>> 2) >>> 0] = data[i];
    break;

   case 2:
    GROWABLE_HEAP_F32()[(((params) + (i * 4)) >>> 2) >>> 0] = data[i];
    break;

   case 5:
    GROWABLE_HEAP_I32()[(((params) + (i * 4)) >>> 2) >>> 0] = Math.fround(data[i]);
    break;
   }
  }
 }
};

/** @suppress {duplicate } */ function _glGetVertexAttribIiv(index, pname, params) {
 params >>>= 0;
 emscriptenWebGLGetVertexAttrib(index, pname, params, 0);
}

var _emscripten_glGetVertexAttribIiv = _glGetVertexAttribIiv;

/** @suppress {duplicate } */ var _glGetVertexAttribIuiv = _glGetVertexAttribIiv;

var _emscripten_glGetVertexAttribIuiv = _glGetVertexAttribIuiv;

/** @suppress {duplicate } */ function _glGetVertexAttribPointerv(index, pname, pointer) {
 pointer >>>= 0;
 if (!pointer) {
  GL.recordError(1281);
  /* GL_INVALID_VALUE */ return;
 }
 if (GL.currentContext.clientBuffers[index].enabled) {
  err("glGetVertexAttribPointer on client-side array: not supported, bad data returned");
 }
 GROWABLE_HEAP_I32()[((pointer) >>> 2) >>> 0] = GLctx.getVertexAttribOffset(index, pname);
}

var _emscripten_glGetVertexAttribPointerv = _glGetVertexAttribPointerv;

/** @suppress {duplicate } */ function _glGetVertexAttribfv(index, pname, params) {
 params >>>= 0;
 emscriptenWebGLGetVertexAttrib(index, pname, params, 2);
}

var _emscripten_glGetVertexAttribfv = _glGetVertexAttribfv;

/** @suppress {duplicate } */ function _glGetVertexAttribiv(index, pname, params) {
 params >>>= 0;
 emscriptenWebGLGetVertexAttrib(index, pname, params, 5);
}

var _emscripten_glGetVertexAttribiv = _glGetVertexAttribiv;

/** @suppress {duplicate } */ var _glHint = (x0, x1) => GLctx.hint(x0, x1);

var _emscripten_glHint = _glHint;

/** @suppress {duplicate } */ function _glInvalidateFramebuffer(target, numAttachments, attachments) {
 attachments >>>= 0;
 var list = tempFixedLengthArray[numAttachments];
 for (var i = 0; i < numAttachments; i++) {
  list[i] = GROWABLE_HEAP_I32()[(((attachments) + (i * 4)) >>> 2) >>> 0];
 }
 GLctx.invalidateFramebuffer(target, list);
}

var _emscripten_glInvalidateFramebuffer = _glInvalidateFramebuffer;

/** @suppress {duplicate } */ function _glInvalidateSubFramebuffer(target, numAttachments, attachments, x, y, width, height) {
 attachments >>>= 0;
 var list = tempFixedLengthArray[numAttachments];
 for (var i = 0; i < numAttachments; i++) {
  list[i] = GROWABLE_HEAP_I32()[(((attachments) + (i * 4)) >>> 2) >>> 0];
 }
 GLctx.invalidateSubFramebuffer(target, list, x, y, width, height);
}

var _emscripten_glInvalidateSubFramebuffer = _glInvalidateSubFramebuffer;

/** @suppress {duplicate } */ var _glIsBuffer = buffer => {
 var b = GL.buffers[buffer];
 if (!b) return 0;
 return GLctx.isBuffer(b);
};

var _emscripten_glIsBuffer = _glIsBuffer;

/** @suppress {duplicate } */ var _glIsEnabled = x0 => GLctx.isEnabled(x0);

var _emscripten_glIsEnabled = _glIsEnabled;

/** @suppress {duplicate } */ var _glIsFramebuffer = framebuffer => {
 var fb = GL.framebuffers[framebuffer];
 if (!fb) return 0;
 return GLctx.isFramebuffer(fb);
};

var _emscripten_glIsFramebuffer = _glIsFramebuffer;

/** @suppress {duplicate } */ var _glIsProgram = program => {
 program = GL.programs[program];
 if (!program) return 0;
 return GLctx.isProgram(program);
};

var _emscripten_glIsProgram = _glIsProgram;

/** @suppress {duplicate } */ var _glIsQuery = id => {
 var query = GL.queries[id];
 if (!query) return 0;
 return GLctx.isQuery(query);
};

var _emscripten_glIsQuery = _glIsQuery;

/** @suppress {duplicate } */ var _glIsQueryEXT = id => {
 var query = GL.queries[id];
 if (!query) return 0;
 return GLctx.disjointTimerQueryExt["isQueryEXT"](query);
};

var _emscripten_glIsQueryEXT = _glIsQueryEXT;

/** @suppress {duplicate } */ var _glIsRenderbuffer = renderbuffer => {
 var rb = GL.renderbuffers[renderbuffer];
 if (!rb) return 0;
 return GLctx.isRenderbuffer(rb);
};

var _emscripten_glIsRenderbuffer = _glIsRenderbuffer;

/** @suppress {duplicate } */ var _glIsSampler = id => {
 var sampler = GL.samplers[id];
 if (!sampler) return 0;
 return GLctx.isSampler(sampler);
};

var _emscripten_glIsSampler = _glIsSampler;

/** @suppress {duplicate } */ var _glIsShader = shader => {
 var s = GL.shaders[shader];
 if (!s) return 0;
 return GLctx.isShader(s);
};

var _emscripten_glIsShader = _glIsShader;

/** @suppress {duplicate } */ function _glIsSync(sync) {
 sync >>>= 0;
 return GLctx.isSync(GL.syncs[sync]);
}

var _emscripten_glIsSync = _glIsSync;

/** @suppress {duplicate } */ var _glIsTexture = id => {
 var texture = GL.textures[id];
 if (!texture) return 0;
 return GLctx.isTexture(texture);
};

var _emscripten_glIsTexture = _glIsTexture;

/** @suppress {duplicate } */ var _glIsTransformFeedback = id => GLctx.isTransformFeedback(GL.transformFeedbacks[id]);

var _emscripten_glIsTransformFeedback = _glIsTransformFeedback;

/** @suppress {duplicate } */ var _glIsVertexArray = array => {
 var vao = GL.vaos[array];
 if (!vao) return 0;
 return GLctx.isVertexArray(vao);
};

var _emscripten_glIsVertexArray = _glIsVertexArray;

/** @suppress {duplicate } */ var _glLineWidth = x0 => GLctx.lineWidth(x0);

var _emscripten_glLineWidth = _glLineWidth;

/** @suppress {duplicate } */ var _glLinkProgram = program => {
 program = GL.programs[program];
 GLctx.linkProgram(program);
 program.uniformLocsById = 0;
 program.uniformSizeAndIdsByName = {};
};

var _emscripten_glLinkProgram = _glLinkProgram;

/** @suppress {duplicate } */ function _glMapBufferRange(target, offset, length, access) {
 offset >>>= 0;
 length >>>= 0;
 if ((access & (1 | /*GL_MAP_READ_BIT*/ 32)) != /*GL_MAP_UNSYNCHRONIZED_BIT*/ 0) {
  err("glMapBufferRange access does not support MAP_READ or MAP_UNSYNCHRONIZED");
  return 0;
 }
 if ((access & 2) == /*GL_MAP_WRITE_BIT*/ 0) {
  err("glMapBufferRange access must include MAP_WRITE");
  return 0;
 }
 if ((access & (4 | /*GL_MAP_INVALIDATE_BUFFER_BIT*/ 8)) == /*GL_MAP_INVALIDATE_RANGE_BIT*/ 0) {
  err("glMapBufferRange access must include INVALIDATE_BUFFER or INVALIDATE_RANGE");
  return 0;
 }
 if (!emscriptenWebGLValidateMapBufferTarget(target)) {
  GL.recordError(1280);
  /*GL_INVALID_ENUM*/ err("GL_INVALID_ENUM in glMapBufferRange");
  return 0;
 }
 var mem = _malloc(length), binding = emscriptenWebGLGetBufferBinding(target);
 if (!mem) return 0;
 if (!GL.mappedBuffers[binding]) GL.mappedBuffers[binding] = {};
 binding = GL.mappedBuffers[binding];
 binding.offset = offset;
 binding.length = length;
 binding.mem = mem;
 binding.access = access;
 return mem;
}

var _emscripten_glMapBufferRange = _glMapBufferRange;

/** @suppress {duplicate } */ var _glPauseTransformFeedback = () => GLctx.pauseTransformFeedback();

var _emscripten_glPauseTransformFeedback = _glPauseTransformFeedback;

/** @suppress {duplicate } */ var _glPixelStorei = (pname, param) => {
 if (pname == 3317) /* GL_UNPACK_ALIGNMENT */ {
  GL.unpackAlignment = param;
 }
 GLctx.pixelStorei(pname, param);
};

var _emscripten_glPixelStorei = _glPixelStorei;

/** @suppress {duplicate } */ var _glPolygonOffset = (x0, x1) => GLctx.polygonOffset(x0, x1);

var _emscripten_glPolygonOffset = _glPolygonOffset;

/** @suppress {duplicate } */ function _glProgramBinary(program, binaryFormat, binary, length) {
 binary >>>= 0;
 GL.recordError(1280);
}

var _emscripten_glProgramBinary = _glProgramBinary;

/** @suppress {duplicate } */ var _glProgramParameteri = (program, pname, value) => {
 GL.recordError(1280);
};

/*GL_INVALID_ENUM*/ var _emscripten_glProgramParameteri = _glProgramParameteri;

/** @suppress {duplicate } */ var _glQueryCounterEXT = (id, target) => {
 GLctx.disjointTimerQueryExt["queryCounterEXT"](GL.queries[id], target);
};

var _emscripten_glQueryCounterEXT = _glQueryCounterEXT;

/** @suppress {duplicate } */ var _glReadBuffer = x0 => GLctx.readBuffer(x0);

var _emscripten_glReadBuffer = _glReadBuffer;

var computeUnpackAlignedImageSize = (width, height, sizePerPixel, alignment) => {
 function roundedToNextMultipleOf(x, y) {
  return (x + y - 1) & -y;
 }
 var plainRowSize = width * sizePerPixel;
 var alignedRowSize = roundedToNextMultipleOf(plainRowSize, alignment);
 return height * alignedRowSize;
};

var colorChannelsInGlTextureFormat = format => {
 var colorChannels = {
  5: 3,
  6: 4,
  8: 2,
  29502: 3,
  29504: 4,
  26917: 2,
  26918: 2,
  29846: 3,
  29847: 4
 };
 return colorChannels[format - 6402] || 1;
};

var heapObjectForWebGLType = type => {
 type -= 5120;
 if (type == 0) return GROWABLE_HEAP_I8();
 if (type == 1) return GROWABLE_HEAP_U8();
 if (type == 2) return GROWABLE_HEAP_I16();
 if (type == 4) return GROWABLE_HEAP_I32();
 if (type == 6) return GROWABLE_HEAP_F32();
 if (type == 5 || type == 28922 || type == 28520 || type == 30779 || type == 30782) return GROWABLE_HEAP_U32();
 return GROWABLE_HEAP_U16();
};

var toTypedArrayIndex = (pointer, heap) => pointer >>> (31 - Math.clz32(heap.BYTES_PER_ELEMENT));

var emscriptenWebGLGetTexPixelData = (type, format, width, height, pixels, internalFormat) => {
 var heap = heapObjectForWebGLType(type);
 var sizePerPixel = colorChannelsInGlTextureFormat(format) * heap.BYTES_PER_ELEMENT;
 var bytes = computeUnpackAlignedImageSize(width, height, sizePerPixel, GL.unpackAlignment);
 return heap.subarray(toTypedArrayIndex(pixels, heap) >>> 0, toTypedArrayIndex(pixels + bytes, heap) >>> 0);
};

/** @suppress {duplicate } */ function _glReadPixels(x, y, width, height, format, type, pixels) {
 pixels >>>= 0;
 if (GL.currentContext.version >= 2) {
  if (GLctx.currentPixelPackBufferBinding) {
   GLctx.readPixels(x, y, width, height, format, type, pixels);
   return;
  }
 }
 var pixelData = emscriptenWebGLGetTexPixelData(type, format, width, height, pixels, format);
 if (!pixelData) {
  GL.recordError(1280);
  /*GL_INVALID_ENUM*/ return;
 }
 GLctx.readPixels(x, y, width, height, format, type, pixelData);
}

var _emscripten_glReadPixels = _glReadPixels;

/** @suppress {duplicate } */ var _glReleaseShaderCompiler = () => {};

var _emscripten_glReleaseShaderCompiler = _glReleaseShaderCompiler;

/** @suppress {duplicate } */ var _glRenderbufferStorage = (x0, x1, x2, x3) => GLctx.renderbufferStorage(x0, x1, x2, x3);

var _emscripten_glRenderbufferStorage = _glRenderbufferStorage;

/** @suppress {duplicate } */ var _glRenderbufferStorageMultisample = (x0, x1, x2, x3, x4) => GLctx.renderbufferStorageMultisample(x0, x1, x2, x3, x4);

var _emscripten_glRenderbufferStorageMultisample = _glRenderbufferStorageMultisample;

/** @suppress {duplicate } */ var _glResumeTransformFeedback = () => GLctx.resumeTransformFeedback();

var _emscripten_glResumeTransformFeedback = _glResumeTransformFeedback;

/** @suppress {duplicate } */ var _glSampleCoverage = (value, invert) => {
 GLctx.sampleCoverage(value, !!invert);
};

var _emscripten_glSampleCoverage = _glSampleCoverage;

/** @suppress {duplicate } */ var _glSamplerParameterf = (sampler, pname, param) => {
 GLctx.samplerParameterf(GL.samplers[sampler], pname, param);
};

var _emscripten_glSamplerParameterf = _glSamplerParameterf;

/** @suppress {duplicate } */ function _glSamplerParameterfv(sampler, pname, params) {
 params >>>= 0;
 var param = GROWABLE_HEAP_F32()[((params) >>> 2) >>> 0];
 GLctx.samplerParameterf(GL.samplers[sampler], pname, param);
}

var _emscripten_glSamplerParameterfv = _glSamplerParameterfv;

/** @suppress {duplicate } */ var _glSamplerParameteri = (sampler, pname, param) => {
 GLctx.samplerParameteri(GL.samplers[sampler], pname, param);
};

var _emscripten_glSamplerParameteri = _glSamplerParameteri;

/** @suppress {duplicate } */ function _glSamplerParameteriv(sampler, pname, params) {
 params >>>= 0;
 var param = GROWABLE_HEAP_I32()[((params) >>> 2) >>> 0];
 GLctx.samplerParameteri(GL.samplers[sampler], pname, param);
}

var _emscripten_glSamplerParameteriv = _glSamplerParameteriv;

/** @suppress {duplicate } */ var _glScissor = (x0, x1, x2, x3) => GLctx.scissor(x0, x1, x2, x3);

var _emscripten_glScissor = _glScissor;

/** @suppress {duplicate } */ function _glShaderBinary(count, shaders, binaryformat, binary, length) {
 shaders >>>= 0;
 binary >>>= 0;
 GL.recordError(1280);
}

var _emscripten_glShaderBinary = _glShaderBinary;

/** @suppress {duplicate } */ function _glShaderSource(shader, count, string, length) {
 string >>>= 0;
 length >>>= 0;
 var source = GL.getSource(shader, count, string, length);
 GLctx.shaderSource(GL.shaders[shader], source);
}

var _emscripten_glShaderSource = _glShaderSource;

/** @suppress {duplicate } */ var _glStencilFunc = (x0, x1, x2) => GLctx.stencilFunc(x0, x1, x2);

var _emscripten_glStencilFunc = _glStencilFunc;

/** @suppress {duplicate } */ var _glStencilFuncSeparate = (x0, x1, x2, x3) => GLctx.stencilFuncSeparate(x0, x1, x2, x3);

var _emscripten_glStencilFuncSeparate = _glStencilFuncSeparate;

/** @suppress {duplicate } */ var _glStencilMask = x0 => GLctx.stencilMask(x0);

var _emscripten_glStencilMask = _glStencilMask;

/** @suppress {duplicate } */ var _glStencilMaskSeparate = (x0, x1) => GLctx.stencilMaskSeparate(x0, x1);

var _emscripten_glStencilMaskSeparate = _glStencilMaskSeparate;

/** @suppress {duplicate } */ var _glStencilOp = (x0, x1, x2) => GLctx.stencilOp(x0, x1, x2);

var _emscripten_glStencilOp = _glStencilOp;

/** @suppress {duplicate } */ var _glStencilOpSeparate = (x0, x1, x2, x3) => GLctx.stencilOpSeparate(x0, x1, x2, x3);

var _emscripten_glStencilOpSeparate = _glStencilOpSeparate;

/** @suppress {duplicate } */ function _glTexImage2D(target, level, internalFormat, width, height, border, format, type, pixels) {
 pixels >>>= 0;
 if (GL.currentContext.version >= 2) {
  if (GLctx.currentPixelUnpackBufferBinding) {
   GLctx.texImage2D(target, level, internalFormat, width, height, border, format, type, pixels);
   return;
  }
 }
 var pixelData = pixels ? emscriptenWebGLGetTexPixelData(type, format, width, height, pixels, internalFormat) : null;
 GLctx.texImage2D(target, level, internalFormat, width, height, border, format, type, pixelData);
}

var _emscripten_glTexImage2D = _glTexImage2D;

/** @suppress {duplicate } */ function _glTexImage3D(target, level, internalFormat, width, height, depth, border, format, type, pixels) {
 pixels >>>= 0;
 if (GLctx.currentPixelUnpackBufferBinding) {
  GLctx.texImage3D(target, level, internalFormat, width, height, depth, border, format, type, pixels);
 } else if (pixels) {
  var heap = heapObjectForWebGLType(type);
  var pixelData = emscriptenWebGLGetTexPixelData(type, format, width, height * depth, pixels, internalFormat);
  GLctx.texImage3D(target, level, internalFormat, width, height, depth, border, format, type, pixelData);
 } else {
  GLctx.texImage3D(target, level, internalFormat, width, height, depth, border, format, type, null);
 }
}

var _emscripten_glTexImage3D = _glTexImage3D;

/** @suppress {duplicate } */ var _glTexParameterf = (x0, x1, x2) => GLctx.texParameterf(x0, x1, x2);

var _emscripten_glTexParameterf = _glTexParameterf;

/** @suppress {duplicate } */ function _glTexParameterfv(target, pname, params) {
 params >>>= 0;
 var param = GROWABLE_HEAP_F32()[((params) >>> 2) >>> 0];
 GLctx.texParameterf(target, pname, param);
}

var _emscripten_glTexParameterfv = _glTexParameterfv;

/** @suppress {duplicate } */ var _glTexParameteri = (x0, x1, x2) => GLctx.texParameteri(x0, x1, x2);

var _emscripten_glTexParameteri = _glTexParameteri;

/** @suppress {duplicate } */ function _glTexParameteriv(target, pname, params) {
 params >>>= 0;
 var param = GROWABLE_HEAP_I32()[((params) >>> 2) >>> 0];
 GLctx.texParameteri(target, pname, param);
}

var _emscripten_glTexParameteriv = _glTexParameteriv;

/** @suppress {duplicate } */ var _glTexStorage2D = (x0, x1, x2, x3, x4) => GLctx.texStorage2D(x0, x1, x2, x3, x4);

var _emscripten_glTexStorage2D = _glTexStorage2D;

/** @suppress {duplicate } */ var _glTexStorage3D = (x0, x1, x2, x3, x4, x5) => GLctx.texStorage3D(x0, x1, x2, x3, x4, x5);

var _emscripten_glTexStorage3D = _glTexStorage3D;

/** @suppress {duplicate } */ function _glTexSubImage2D(target, level, xoffset, yoffset, width, height, format, type, pixels) {
 pixels >>>= 0;
 if (GL.currentContext.version >= 2) {
  if (GLctx.currentPixelUnpackBufferBinding) {
   GLctx.texSubImage2D(target, level, xoffset, yoffset, width, height, format, type, pixels);
   return;
  }
 }
 var pixelData = pixels ? emscriptenWebGLGetTexPixelData(type, format, width, height, pixels, 0) : null;
 GLctx.texSubImage2D(target, level, xoffset, yoffset, width, height, format, type, pixelData);
}

var _emscripten_glTexSubImage2D = _glTexSubImage2D;

/** @suppress {duplicate } */ function _glTexSubImage3D(target, level, xoffset, yoffset, zoffset, width, height, depth, format, type, pixels) {
 pixels >>>= 0;
 if (GLctx.currentPixelUnpackBufferBinding) {
  GLctx.texSubImage3D(target, level, xoffset, yoffset, zoffset, width, height, depth, format, type, pixels);
 } else if (pixels) {
  var heap = heapObjectForWebGLType(type);
  GLctx.texSubImage3D(target, level, xoffset, yoffset, zoffset, width, height, depth, format, type, heap, toTypedArrayIndex(pixels, heap));
 } else {
  GLctx.texSubImage3D(target, level, xoffset, yoffset, zoffset, width, height, depth, format, type, null);
 }
}

var _emscripten_glTexSubImage3D = _glTexSubImage3D;

/** @suppress {duplicate } */ function _glTransformFeedbackVaryings(program, count, varyings, bufferMode) {
 varyings >>>= 0;
 program = GL.programs[program];
 var vars = [];
 for (var i = 0; i < count; i++) vars.push(UTF8ToString(GROWABLE_HEAP_I32()[(((varyings) + (i * 4)) >>> 2) >>> 0]));
 GLctx.transformFeedbackVaryings(program, vars, bufferMode);
}

var _emscripten_glTransformFeedbackVaryings = _glTransformFeedbackVaryings;

/** @suppress {duplicate } */ var _glUniform1f = (location, v0) => {
 GLctx.uniform1f(webglGetUniformLocation(location), v0);
};

var _emscripten_glUniform1f = _glUniform1f;

var miniTempWebGLFloatBuffers = [];

/** @suppress {duplicate } */ function _glUniform1fv(location, count, value) {
 value >>>= 0;
 if (count <= 288) {
  var view = miniTempWebGLFloatBuffers[count - 1];
  for (var i = 0; i < count; ++i) {
   view[i] = GROWABLE_HEAP_F32()[(((value) + (4 * i)) >>> 2) >>> 0];
  }
 } else {
  var view = GROWABLE_HEAP_F32().subarray((((value) >>> 2)) >>> 0, ((value + count * 4) >>> 2) >>> 0);
 }
 GLctx.uniform1fv(webglGetUniformLocation(location), view);
}

var _emscripten_glUniform1fv = _glUniform1fv;

/** @suppress {duplicate } */ var _glUniform1i = (location, v0) => {
 GLctx.uniform1i(webglGetUniformLocation(location), v0);
};

var _emscripten_glUniform1i = _glUniform1i;

var miniTempWebGLIntBuffers = [];

/** @suppress {duplicate } */ function _glUniform1iv(location, count, value) {
 value >>>= 0;
 if (count <= 288) {
  var view = miniTempWebGLIntBuffers[count - 1];
  for (var i = 0; i < count; ++i) {
   view[i] = GROWABLE_HEAP_I32()[(((value) + (4 * i)) >>> 2) >>> 0];
  }
 } else {
  var view = GROWABLE_HEAP_I32().subarray((((value) >>> 2)) >>> 0, ((value + count * 4) >>> 2) >>> 0);
 }
 GLctx.uniform1iv(webglGetUniformLocation(location), view);
}

var _emscripten_glUniform1iv = _glUniform1iv;

/** @suppress {duplicate } */ var _glUniform1ui = (location, v0) => {
 GLctx.uniform1ui(webglGetUniformLocation(location), v0);
};

var _emscripten_glUniform1ui = _glUniform1ui;

/** @suppress {duplicate } */ function _glUniform1uiv(location, count, value) {
 value >>>= 0;
 count && GLctx.uniform1uiv(webglGetUniformLocation(location), GROWABLE_HEAP_U32(), ((value) >>> 2), count);
}

var _emscripten_glUniform1uiv = _glUniform1uiv;

/** @suppress {duplicate } */ var _glUniform2f = (location, v0, v1) => {
 GLctx.uniform2f(webglGetUniformLocation(location), v0, v1);
};

var _emscripten_glUniform2f = _glUniform2f;

/** @suppress {duplicate } */ function _glUniform2fv(location, count, value) {
 value >>>= 0;
 if (count <= 144) {
  var view = miniTempWebGLFloatBuffers[2 * count - 1];
  for (var i = 0; i < 2 * count; i += 2) {
   view[i] = GROWABLE_HEAP_F32()[(((value) + (4 * i)) >>> 2) >>> 0];
   view[i + 1] = GROWABLE_HEAP_F32()[(((value) + (4 * i + 4)) >>> 2) >>> 0];
  }
 } else {
  var view = GROWABLE_HEAP_F32().subarray((((value) >>> 2)) >>> 0, ((value + count * 8) >>> 2) >>> 0);
 }
 GLctx.uniform2fv(webglGetUniformLocation(location), view);
}

var _emscripten_glUniform2fv = _glUniform2fv;

/** @suppress {duplicate } */ var _glUniform2i = (location, v0, v1) => {
 GLctx.uniform2i(webglGetUniformLocation(location), v0, v1);
};

var _emscripten_glUniform2i = _glUniform2i;

/** @suppress {duplicate } */ function _glUniform2iv(location, count, value) {
 value >>>= 0;
 if (count <= 144) {
  var view = miniTempWebGLIntBuffers[2 * count - 1];
  for (var i = 0; i < 2 * count; i += 2) {
   view[i] = GROWABLE_HEAP_I32()[(((value) + (4 * i)) >>> 2) >>> 0];
   view[i + 1] = GROWABLE_HEAP_I32()[(((value) + (4 * i + 4)) >>> 2) >>> 0];
  }
 } else {
  var view = GROWABLE_HEAP_I32().subarray((((value) >>> 2)) >>> 0, ((value + count * 8) >>> 2) >>> 0);
 }
 GLctx.uniform2iv(webglGetUniformLocation(location), view);
}

var _emscripten_glUniform2iv = _glUniform2iv;

/** @suppress {duplicate } */ var _glUniform2ui = (location, v0, v1) => {
 GLctx.uniform2ui(webglGetUniformLocation(location), v0, v1);
};

var _emscripten_glUniform2ui = _glUniform2ui;

/** @suppress {duplicate } */ function _glUniform2uiv(location, count, value) {
 value >>>= 0;
 count && GLctx.uniform2uiv(webglGetUniformLocation(location), GROWABLE_HEAP_U32(), ((value) >>> 2), count * 2);
}

var _emscripten_glUniform2uiv = _glUniform2uiv;

/** @suppress {duplicate } */ var _glUniform3f = (location, v0, v1, v2) => {
 GLctx.uniform3f(webglGetUniformLocation(location), v0, v1, v2);
};

var _emscripten_glUniform3f = _glUniform3f;

/** @suppress {duplicate } */ function _glUniform3fv(location, count, value) {
 value >>>= 0;
 if (count <= 96) {
  var view = miniTempWebGLFloatBuffers[3 * count - 1];
  for (var i = 0; i < 3 * count; i += 3) {
   view[i] = GROWABLE_HEAP_F32()[(((value) + (4 * i)) >>> 2) >>> 0];
   view[i + 1] = GROWABLE_HEAP_F32()[(((value) + (4 * i + 4)) >>> 2) >>> 0];
   view[i + 2] = GROWABLE_HEAP_F32()[(((value) + (4 * i + 8)) >>> 2) >>> 0];
  }
 } else {
  var view = GROWABLE_HEAP_F32().subarray((((value) >>> 2)) >>> 0, ((value + count * 12) >>> 2) >>> 0);
 }
 GLctx.uniform3fv(webglGetUniformLocation(location), view);
}

var _emscripten_glUniform3fv = _glUniform3fv;

/** @suppress {duplicate } */ var _glUniform3i = (location, v0, v1, v2) => {
 GLctx.uniform3i(webglGetUniformLocation(location), v0, v1, v2);
};

var _emscripten_glUniform3i = _glUniform3i;

/** @suppress {duplicate } */ function _glUniform3iv(location, count, value) {
 value >>>= 0;
 if (count <= 96) {
  var view = miniTempWebGLIntBuffers[3 * count - 1];
  for (var i = 0; i < 3 * count; i += 3) {
   view[i] = GROWABLE_HEAP_I32()[(((value) + (4 * i)) >>> 2) >>> 0];
   view[i + 1] = GROWABLE_HEAP_I32()[(((value) + (4 * i + 4)) >>> 2) >>> 0];
   view[i + 2] = GROWABLE_HEAP_I32()[(((value) + (4 * i + 8)) >>> 2) >>> 0];
  }
 } else {
  var view = GROWABLE_HEAP_I32().subarray((((value) >>> 2)) >>> 0, ((value + count * 12) >>> 2) >>> 0);
 }
 GLctx.uniform3iv(webglGetUniformLocation(location), view);
}

var _emscripten_glUniform3iv = _glUniform3iv;

/** @suppress {duplicate } */ var _glUniform3ui = (location, v0, v1, v2) => {
 GLctx.uniform3ui(webglGetUniformLocation(location), v0, v1, v2);
};

var _emscripten_glUniform3ui = _glUniform3ui;

/** @suppress {duplicate } */ function _glUniform3uiv(location, count, value) {
 value >>>= 0;
 count && GLctx.uniform3uiv(webglGetUniformLocation(location), GROWABLE_HEAP_U32(), ((value) >>> 2), count * 3);
}

var _emscripten_glUniform3uiv = _glUniform3uiv;

/** @suppress {duplicate } */ var _glUniform4f = (location, v0, v1, v2, v3) => {
 GLctx.uniform4f(webglGetUniformLocation(location), v0, v1, v2, v3);
};

var _emscripten_glUniform4f = _glUniform4f;

/** @suppress {duplicate } */ function _glUniform4fv(location, count, value) {
 value >>>= 0;
 if (count <= 72) {
  var view = miniTempWebGLFloatBuffers[4 * count - 1];
  var heap = GROWABLE_HEAP_F32();
  value = ((value) >>> 2);
  for (var i = 0; i < 4 * count; i += 4) {
   var dst = value + i;
   view[i] = heap[dst >>> 0];
   view[i + 1] = heap[dst + 1 >>> 0];
   view[i + 2] = heap[dst + 2 >>> 0];
   view[i + 3] = heap[dst + 3 >>> 0];
  }
 } else {
  var view = GROWABLE_HEAP_F32().subarray((((value) >>> 2)) >>> 0, ((value + count * 16) >>> 2) >>> 0);
 }
 GLctx.uniform4fv(webglGetUniformLocation(location), view);
}

var _emscripten_glUniform4fv = _glUniform4fv;

/** @suppress {duplicate } */ var _glUniform4i = (location, v0, v1, v2, v3) => {
 GLctx.uniform4i(webglGetUniformLocation(location), v0, v1, v2, v3);
};

var _emscripten_glUniform4i = _glUniform4i;

/** @suppress {duplicate } */ function _glUniform4iv(location, count, value) {
 value >>>= 0;
 if (count <= 72) {
  var view = miniTempWebGLIntBuffers[4 * count - 1];
  for (var i = 0; i < 4 * count; i += 4) {
   view[i] = GROWABLE_HEAP_I32()[(((value) + (4 * i)) >>> 2) >>> 0];
   view[i + 1] = GROWABLE_HEAP_I32()[(((value) + (4 * i + 4)) >>> 2) >>> 0];
   view[i + 2] = GROWABLE_HEAP_I32()[(((value) + (4 * i + 8)) >>> 2) >>> 0];
   view[i + 3] = GROWABLE_HEAP_I32()[(((value) + (4 * i + 12)) >>> 2) >>> 0];
  }
 } else {
  var view = GROWABLE_HEAP_I32().subarray((((value) >>> 2)) >>> 0, ((value + count * 16) >>> 2) >>> 0);
 }
 GLctx.uniform4iv(webglGetUniformLocation(location), view);
}

var _emscripten_glUniform4iv = _glUniform4iv;

/** @suppress {duplicate } */ var _glUniform4ui = (location, v0, v1, v2, v3) => {
 GLctx.uniform4ui(webglGetUniformLocation(location), v0, v1, v2, v3);
};

var _emscripten_glUniform4ui = _glUniform4ui;

/** @suppress {duplicate } */ function _glUniform4uiv(location, count, value) {
 value >>>= 0;
 count && GLctx.uniform4uiv(webglGetUniformLocation(location), GROWABLE_HEAP_U32(), ((value) >>> 2), count * 4);
}

var _emscripten_glUniform4uiv = _glUniform4uiv;

/** @suppress {duplicate } */ var _glUniformBlockBinding = (program, uniformBlockIndex, uniformBlockBinding) => {
 program = GL.programs[program];
 GLctx.uniformBlockBinding(program, uniformBlockIndex, uniformBlockBinding);
};

var _emscripten_glUniformBlockBinding = _glUniformBlockBinding;

/** @suppress {duplicate } */ function _glUniformMatrix2fv(location, count, transpose, value) {
 value >>>= 0;
 if (count <= 72) {
  var view = miniTempWebGLFloatBuffers[4 * count - 1];
  for (var i = 0; i < 4 * count; i += 4) {
   view[i] = GROWABLE_HEAP_F32()[(((value) + (4 * i)) >>> 2) >>> 0];
   view[i + 1] = GROWABLE_HEAP_F32()[(((value) + (4 * i + 4)) >>> 2) >>> 0];
   view[i + 2] = GROWABLE_HEAP_F32()[(((value) + (4 * i + 8)) >>> 2) >>> 0];
   view[i + 3] = GROWABLE_HEAP_F32()[(((value) + (4 * i + 12)) >>> 2) >>> 0];
  }
 } else {
  var view = GROWABLE_HEAP_F32().subarray((((value) >>> 2)) >>> 0, ((value + count * 16) >>> 2) >>> 0);
 }
 GLctx.uniformMatrix2fv(webglGetUniformLocation(location), !!transpose, view);
}

var _emscripten_glUniformMatrix2fv = _glUniformMatrix2fv;

/** @suppress {duplicate } */ function _glUniformMatrix2x3fv(location, count, transpose, value) {
 value >>>= 0;
 count && GLctx.uniformMatrix2x3fv(webglGetUniformLocation(location), !!transpose, GROWABLE_HEAP_F32(), ((value) >>> 2), count * 6);
}

var _emscripten_glUniformMatrix2x3fv = _glUniformMatrix2x3fv;

/** @suppress {duplicate } */ function _glUniformMatrix2x4fv(location, count, transpose, value) {
 value >>>= 0;
 count && GLctx.uniformMatrix2x4fv(webglGetUniformLocation(location), !!transpose, GROWABLE_HEAP_F32(), ((value) >>> 2), count * 8);
}

var _emscripten_glUniformMatrix2x4fv = _glUniformMatrix2x4fv;

/** @suppress {duplicate } */ function _glUniformMatrix3fv(location, count, transpose, value) {
 value >>>= 0;
 if (count <= 32) {
  var view = miniTempWebGLFloatBuffers[9 * count - 1];
  for (var i = 0; i < 9 * count; i += 9) {
   view[i] = GROWABLE_HEAP_F32()[(((value) + (4 * i)) >>> 2) >>> 0];
   view[i + 1] = GROWABLE_HEAP_F32()[(((value) + (4 * i + 4)) >>> 2) >>> 0];
   view[i + 2] = GROWABLE_HEAP_F32()[(((value) + (4 * i + 8)) >>> 2) >>> 0];
   view[i + 3] = GROWABLE_HEAP_F32()[(((value) + (4 * i + 12)) >>> 2) >>> 0];
   view[i + 4] = GROWABLE_HEAP_F32()[(((value) + (4 * i + 16)) >>> 2) >>> 0];
   view[i + 5] = GROWABLE_HEAP_F32()[(((value) + (4 * i + 20)) >>> 2) >>> 0];
   view[i + 6] = GROWABLE_HEAP_F32()[(((value) + (4 * i + 24)) >>> 2) >>> 0];
   view[i + 7] = GROWABLE_HEAP_F32()[(((value) + (4 * i + 28)) >>> 2) >>> 0];
   view[i + 8] = GROWABLE_HEAP_F32()[(((value) + (4 * i + 32)) >>> 2) >>> 0];
  }
 } else {
  var view = GROWABLE_HEAP_F32().subarray((((value) >>> 2)) >>> 0, ((value + count * 36) >>> 2) >>> 0);
 }
 GLctx.uniformMatrix3fv(webglGetUniformLocation(location), !!transpose, view);
}

var _emscripten_glUniformMatrix3fv = _glUniformMatrix3fv;

/** @suppress {duplicate } */ function _glUniformMatrix3x2fv(location, count, transpose, value) {
 value >>>= 0;
 count && GLctx.uniformMatrix3x2fv(webglGetUniformLocation(location), !!transpose, GROWABLE_HEAP_F32(), ((value) >>> 2), count * 6);
}

var _emscripten_glUniformMatrix3x2fv = _glUniformMatrix3x2fv;

/** @suppress {duplicate } */ function _glUniformMatrix3x4fv(location, count, transpose, value) {
 value >>>= 0;
 count && GLctx.uniformMatrix3x4fv(webglGetUniformLocation(location), !!transpose, GROWABLE_HEAP_F32(), ((value) >>> 2), count * 12);
}

var _emscripten_glUniformMatrix3x4fv = _glUniformMatrix3x4fv;

/** @suppress {duplicate } */ function _glUniformMatrix4fv(location, count, transpose, value) {
 value >>>= 0;
 if (count <= 18) {
  var view = miniTempWebGLFloatBuffers[16 * count - 1];
  var heap = GROWABLE_HEAP_F32();
  value = ((value) >>> 2);
  for (var i = 0; i < 16 * count; i += 16) {
   var dst = value + i;
   view[i] = heap[dst >>> 0];
   view[i + 1] = heap[dst + 1 >>> 0];
   view[i + 2] = heap[dst + 2 >>> 0];
   view[i + 3] = heap[dst + 3 >>> 0];
   view[i + 4] = heap[dst + 4 >>> 0];
   view[i + 5] = heap[dst + 5 >>> 0];
   view[i + 6] = heap[dst + 6 >>> 0];
   view[i + 7] = heap[dst + 7 >>> 0];
   view[i + 8] = heap[dst + 8 >>> 0];
   view[i + 9] = heap[dst + 9 >>> 0];
   view[i + 10] = heap[dst + 10 >>> 0];
   view[i + 11] = heap[dst + 11 >>> 0];
   view[i + 12] = heap[dst + 12 >>> 0];
   view[i + 13] = heap[dst + 13 >>> 0];
   view[i + 14] = heap[dst + 14 >>> 0];
   view[i + 15] = heap[dst + 15 >>> 0];
  }
 } else {
  var view = GROWABLE_HEAP_F32().subarray((((value) >>> 2)) >>> 0, ((value + count * 64) >>> 2) >>> 0);
 }
 GLctx.uniformMatrix4fv(webglGetUniformLocation(location), !!transpose, view);
}

var _emscripten_glUniformMatrix4fv = _glUniformMatrix4fv;

/** @suppress {duplicate } */ function _glUniformMatrix4x2fv(location, count, transpose, value) {
 value >>>= 0;
 count && GLctx.uniformMatrix4x2fv(webglGetUniformLocation(location), !!transpose, GROWABLE_HEAP_F32(), ((value) >>> 2), count * 8);
}

var _emscripten_glUniformMatrix4x2fv = _glUniformMatrix4x2fv;

/** @suppress {duplicate } */ function _glUniformMatrix4x3fv(location, count, transpose, value) {
 value >>>= 0;
 count && GLctx.uniformMatrix4x3fv(webglGetUniformLocation(location), !!transpose, GROWABLE_HEAP_F32(), ((value) >>> 2), count * 12);
}

var _emscripten_glUniformMatrix4x3fv = _glUniformMatrix4x3fv;

/** @suppress {duplicate } */ var _glUnmapBuffer = target => {
 if (!emscriptenWebGLValidateMapBufferTarget(target)) {
  GL.recordError(1280);
  /*GL_INVALID_ENUM*/ err("GL_INVALID_ENUM in glUnmapBuffer");
  return 0;
 }
 var buffer = emscriptenWebGLGetBufferBinding(target);
 var mapping = GL.mappedBuffers[buffer];
 if (!mapping || !mapping.mem) {
  GL.recordError(1282);
  /* GL_INVALID_OPERATION */ err("buffer was never mapped in glUnmapBuffer");
  return 0;
 }
 if (!(mapping.access & 16)) {
  /* GL_MAP_FLUSH_EXPLICIT_BIT */ GLctx.bufferSubData(target, mapping.offset, GROWABLE_HEAP_U8().subarray(mapping.mem >>> 0, mapping.mem + mapping.length >>> 0));
 }
 _free(mapping.mem);
 mapping.mem = 0;
 return 1;
};

var _emscripten_glUnmapBuffer = _glUnmapBuffer;

/** @suppress {duplicate } */ var _glUseProgram = program => {
 program = GL.programs[program];
 GLctx.useProgram(program);
 GLctx.currentProgram = program;
};

var _emscripten_glUseProgram = _glUseProgram;

/** @suppress {duplicate } */ var _glValidateProgram = program => {
 GLctx.validateProgram(GL.programs[program]);
};

var _emscripten_glValidateProgram = _glValidateProgram;

/** @suppress {duplicate } */ var _glVertexAttrib1f = (x0, x1) => GLctx.vertexAttrib1f(x0, x1);

var _emscripten_glVertexAttrib1f = _glVertexAttrib1f;

/** @suppress {duplicate } */ function _glVertexAttrib1fv(index, v) {
 v >>>= 0;
 GLctx.vertexAttrib1f(index, GROWABLE_HEAP_F32()[v >>> 2]);
}

var _emscripten_glVertexAttrib1fv = _glVertexAttrib1fv;

/** @suppress {duplicate } */ var _glVertexAttrib2f = (x0, x1, x2) => GLctx.vertexAttrib2f(x0, x1, x2);

var _emscripten_glVertexAttrib2f = _glVertexAttrib2f;

/** @suppress {duplicate } */ function _glVertexAttrib2fv(index, v) {
 v >>>= 0;
 GLctx.vertexAttrib2f(index, GROWABLE_HEAP_F32()[v >>> 2], GROWABLE_HEAP_F32()[v + 4 >>> 2]);
}

var _emscripten_glVertexAttrib2fv = _glVertexAttrib2fv;

/** @suppress {duplicate } */ var _glVertexAttrib3f = (x0, x1, x2, x3) => GLctx.vertexAttrib3f(x0, x1, x2, x3);

var _emscripten_glVertexAttrib3f = _glVertexAttrib3f;

/** @suppress {duplicate } */ function _glVertexAttrib3fv(index, v) {
 v >>>= 0;
 GLctx.vertexAttrib3f(index, GROWABLE_HEAP_F32()[v >>> 2], GROWABLE_HEAP_F32()[v + 4 >>> 2], GROWABLE_HEAP_F32()[v + 8 >>> 2]);
}

var _emscripten_glVertexAttrib3fv = _glVertexAttrib3fv;

/** @suppress {duplicate } */ var _glVertexAttrib4f = (x0, x1, x2, x3, x4) => GLctx.vertexAttrib4f(x0, x1, x2, x3, x4);

var _emscripten_glVertexAttrib4f = _glVertexAttrib4f;

/** @suppress {duplicate } */ function _glVertexAttrib4fv(index, v) {
 v >>>= 0;
 GLctx.vertexAttrib4f(index, GROWABLE_HEAP_F32()[v >>> 2], GROWABLE_HEAP_F32()[v + 4 >>> 2], GROWABLE_HEAP_F32()[v + 8 >>> 2], GROWABLE_HEAP_F32()[v + 12 >>> 2]);
}

var _emscripten_glVertexAttrib4fv = _glVertexAttrib4fv;

/** @suppress {duplicate } */ var _glVertexAttribDivisor = (index, divisor) => {
 GLctx.vertexAttribDivisor(index, divisor);
};

var _emscripten_glVertexAttribDivisor = _glVertexAttribDivisor;

/** @suppress {duplicate } */ var _glVertexAttribI4i = (x0, x1, x2, x3, x4) => GLctx.vertexAttribI4i(x0, x1, x2, x3, x4);

var _emscripten_glVertexAttribI4i = _glVertexAttribI4i;

/** @suppress {duplicate } */ function _glVertexAttribI4iv(index, v) {
 v >>>= 0;
 GLctx.vertexAttribI4i(index, GROWABLE_HEAP_I32()[v >>> 2], GROWABLE_HEAP_I32()[v + 4 >>> 2], GROWABLE_HEAP_I32()[v + 8 >>> 2], GROWABLE_HEAP_I32()[v + 12 >>> 2]);
}

var _emscripten_glVertexAttribI4iv = _glVertexAttribI4iv;

/** @suppress {duplicate } */ var _glVertexAttribI4ui = (x0, x1, x2, x3, x4) => GLctx.vertexAttribI4ui(x0, x1, x2, x3, x4);

var _emscripten_glVertexAttribI4ui = _glVertexAttribI4ui;

/** @suppress {duplicate } */ function _glVertexAttribI4uiv(index, v) {
 v >>>= 0;
 GLctx.vertexAttribI4ui(index, GROWABLE_HEAP_U32()[v >>> 2], GROWABLE_HEAP_U32()[v + 4 >>> 2], GROWABLE_HEAP_U32()[v + 8 >>> 2], GROWABLE_HEAP_U32()[v + 12 >>> 2]);
}

var _emscripten_glVertexAttribI4uiv = _glVertexAttribI4uiv;

/** @suppress {duplicate } */ function _glVertexAttribIPointer(index, size, type, stride, ptr) {
 ptr >>>= 0;
 var cb = GL.currentContext.clientBuffers[index];
 if (!GLctx.currentArrayBufferBinding) {
  cb.size = size;
  cb.type = type;
  cb.normalized = false;
  cb.stride = stride;
  cb.ptr = ptr;
  cb.clientside = true;
  cb.vertexAttribPointerAdaptor = function(index, size, type, normalized, stride, ptr) {
   this.vertexAttribIPointer(index, size, type, stride, ptr);
  };
  return;
 }
 cb.clientside = false;
 GLctx.vertexAttribIPointer(index, size, type, stride, ptr);
}

var _emscripten_glVertexAttribIPointer = _glVertexAttribIPointer;

/** @suppress {duplicate } */ function _glVertexAttribPointer(index, size, type, normalized, stride, ptr) {
 ptr >>>= 0;
 var cb = GL.currentContext.clientBuffers[index];
 if (!GLctx.currentArrayBufferBinding) {
  cb.size = size;
  cb.type = type;
  cb.normalized = normalized;
  cb.stride = stride;
  cb.ptr = ptr;
  cb.clientside = true;
  cb.vertexAttribPointerAdaptor = function(index, size, type, normalized, stride, ptr) {
   this.vertexAttribPointer(index, size, type, normalized, stride, ptr);
  };
  return;
 }
 cb.clientside = false;
 GLctx.vertexAttribPointer(index, size, type, !!normalized, stride, ptr);
}

var _emscripten_glVertexAttribPointer = _glVertexAttribPointer;

/** @suppress {duplicate } */ var _glViewport = (x0, x1, x2, x3) => GLctx.viewport(x0, x1, x2, x3);

var _emscripten_glViewport = _glViewport;

/** @suppress {duplicate } */ function _glWaitSync(sync, flags, timeout) {
 sync >>>= 0;
 timeout = Number(timeout);
 GLctx.waitSync(GL.syncs[sync], flags, timeout);
}

var _emscripten_glWaitSync = _glWaitSync;

var _emscripten_num_logical_cores = () => navigator["hardwareConcurrency"];

function _emscripten_pc_get_function(pc) {
 pc >>>= 0;
 abort("Cannot use emscripten_pc_get_function without -sUSE_OFFSET_CONVERTER");
 return 0;
}

var growMemory = size => {
 var b = wasmMemory.buffer;
 var pages = (size - b.byteLength + 65535) / 65536;
 try {
  wasmMemory.grow(pages);
  updateMemoryViews();
  return 1;
 } /*success*/ catch (e) {
  err(\`growMemory: Attempted to grow heap from \${b.byteLength} bytes to \${size} bytes, but got error: \${e}\`);
 }
};

function _emscripten_resize_heap(requestedSize) {
 requestedSize >>>= 0;
 var oldSize = GROWABLE_HEAP_U8().length;
 if (requestedSize <= oldSize) {
  return false;
 }
 var maxHeapSize = getHeapMax();
 if (requestedSize > maxHeapSize) {
  err(\`Cannot enlarge memory, requested \${requestedSize} bytes, but the limit is \${maxHeapSize} bytes!\`);
  return false;
 }
 var alignUp = (x, multiple) => x + (multiple - x % multiple) % multiple;
 for (var cutDown = 1; cutDown <= 4; cutDown *= 2) {
  var overGrownHeapSize = oldSize * (1 + .2 / cutDown);
  overGrownHeapSize = Math.min(overGrownHeapSize, requestedSize + 100663296);
  var newSize = Math.min(maxHeapSize, alignUp(Math.max(requestedSize, overGrownHeapSize), 65536));
  var replacement = growMemory(newSize);
  if (replacement) {
   return true;
  }
 }
 err(\`Failed to grow the heap from \${oldSize} bytes to \${newSize} bytes, not enough memory!\`);
 return false;
}

/** @returns {number} */ var convertFrameToPC = frame => {
 abort("Cannot use convertFrameToPC (needed by __builtin_return_address) without -sUSE_OFFSET_CONVERTER");
 return 0;
};

function _emscripten_return_address(level) {
 var callstack = jsStackTrace().split("\\n");
 if (callstack[0] == "Error") {
  callstack.shift();
 }
 var caller = callstack[level + 3];
 return convertFrameToPC(caller);
}

var _emscripten_runtime_keepalive_check = keepRuntimeAlive;

var UNWIND_CACHE = {};

var saveInUnwindCache = callstack => {
 callstack.forEach(frame => {
  var pc = convertFrameToPC(frame);
  if (pc) {
   UNWIND_CACHE[pc] = frame;
  }
 });
};

function _emscripten_stack_snapshot() {
 var callstack = jsStackTrace().split("\\n");
 if (callstack[0] == "Error") {
  callstack.shift();
 }
 saveInUnwindCache(callstack);
 UNWIND_CACHE.last_addr = convertFrameToPC(callstack[3]);
 UNWIND_CACHE.last_stack = callstack;
 return UNWIND_CACHE.last_addr;
}

function _emscripten_stack_unwind_buffer(addr, buffer, count) {
 addr >>>= 0;
 buffer >>>= 0;
 var stack;
 if (UNWIND_CACHE.last_addr == addr) {
  stack = UNWIND_CACHE.last_stack;
 } else {
  stack = jsStackTrace().split("\\n");
  if (stack[0] == "Error") {
   stack.shift();
  }
  saveInUnwindCache(stack);
 }
 var offset = 3;
 while (stack[offset] && convertFrameToPC(stack[offset]) != addr) {
  ++offset;
 }
 for (var i = 0; i < count && stack[i + offset]; ++i) {
  GROWABLE_HEAP_I32()[(((buffer) + (i * 4)) >>> 2) >>> 0] = convertFrameToPC(stack[i + offset]);
 }
 return i;
}

var _emscripten_supports_offscreencanvas = () => typeof OffscreenCanvas != "undefined";

var _emscripten_webgl_destroy_context_calling_thread = contextHandle => {
 if (GL.currentContext == contextHandle) GL.currentContext = 0;
 GL.deleteContext(contextHandle);
};

var _emscripten_webgl_destroy_context_main_thread = _emscripten_webgl_destroy_context_calling_thread;

function _emscripten_webgl_destroy_context(p0) {
 p0 >>>= 0;
 return GL.contexts[p0] ? _emscripten_webgl_destroy_context_calling_thread(p0) : _emscripten_webgl_destroy_context_main_thread(p0);
}

function _emscripten_webgl_create_context_proxied(target, attributes) {
 if (ENVIRONMENT_IS_PTHREAD) return proxyToMainThread(51, 0, 1, target, attributes);
 return _emscripten_webgl_do_create_context(target, attributes);
}

var webglPowerPreferences = [ "default", "low-power", "high-performance" ];

/** @type {Object} */ var specialHTMLTargets = [ 0, typeof document != "undefined" ? document : 0, typeof window != "undefined" ? window : 0 ];

var findEventTarget = target => {
 target = maybeCStringToJsString(target);
 var domElement = specialHTMLTargets[target] || (typeof document != "undefined" ? document.querySelector(target) : undefined);
 return domElement;
};

function _emscripten_webgl_do_create_context(target, attributes) {
 target >>>= 0;
 attributes >>>= 0;
 assert(attributes);
 var a = ((attributes) >>> 2);
 var powerPreference = GROWABLE_HEAP_I32()[a + (24 >> 2) >>> 0];
 var contextAttributes = {
  "alpha": !!GROWABLE_HEAP_I32()[a + (0 >> 2) >>> 0],
  "depth": !!GROWABLE_HEAP_I32()[a + (4 >> 2) >>> 0],
  "stencil": !!GROWABLE_HEAP_I32()[a + (8 >> 2) >>> 0],
  "antialias": !!GROWABLE_HEAP_I32()[a + (12 >> 2) >>> 0],
  "premultipliedAlpha": !!GROWABLE_HEAP_I32()[a + (16 >> 2) >>> 0],
  "preserveDrawingBuffer": !!GROWABLE_HEAP_I32()[a + (20 >> 2) >>> 0],
  "powerPreference": webglPowerPreferences[powerPreference],
  "failIfMajorPerformanceCaveat": !!GROWABLE_HEAP_I32()[a + (28 >> 2) >>> 0],
  majorVersion: GROWABLE_HEAP_I32()[a + (32 >> 2) >>> 0],
  minorVersion: GROWABLE_HEAP_I32()[a + (36 >> 2) >>> 0],
  enableExtensionsByDefault: GROWABLE_HEAP_I32()[a + (40 >> 2) >>> 0],
  explicitSwapControl: GROWABLE_HEAP_I32()[a + (44 >> 2) >>> 0],
  proxyContextToMainThread: GROWABLE_HEAP_I32()[a + (48 >> 2) >>> 0],
  renderViaOffscreenBackBuffer: GROWABLE_HEAP_I32()[a + (52 >> 2) >>> 0]
 };
 var canvas = findCanvasEventTarget(target);
 if (ENVIRONMENT_IS_PTHREAD) {
  if (contextAttributes.proxyContextToMainThread === 2 || (!canvas && contextAttributes.proxyContextToMainThread === 1)) {
   if (!_emscripten_supports_offscreencanvas()) {
    GROWABLE_HEAP_I32()[(((attributes) + (52)) >>> 2) >>> 0] = 1;
    GROWABLE_HEAP_I32()[(((attributes) + (20)) >>> 2) >>> 0] = 1;
   }
   return _emscripten_webgl_create_context_proxied(target, attributes);
  }
 }
 if (!canvas) {
  return 0;
 }
 if (canvas.offscreenCanvas) canvas = canvas.offscreenCanvas;
 if (contextAttributes.explicitSwapControl) {
  var supportsOffscreenCanvas = canvas.transferControlToOffscreen || (_emscripten_supports_offscreencanvas() && canvas instanceof OffscreenCanvas);
  if (!supportsOffscreenCanvas) {
   if (!contextAttributes.renderViaOffscreenBackBuffer) {
    contextAttributes.renderViaOffscreenBackBuffer = true;
   }
  }
  if (canvas.transferControlToOffscreen) {
   if (!canvas.controlTransferredOffscreen) {
    GL.offscreenCanvases[canvas.id] = {
     canvas: canvas.transferControlToOffscreen(),
     canvasSharedPtr: _malloc(12),
     id: canvas.id
    };
    canvas.controlTransferredOffscreen = true;
   } else if (!GL.offscreenCanvases[canvas.id]) {
    return 0;
   }
   canvas = GL.offscreenCanvases[canvas.id];
  }
 }
 var contextHandle = GL.createContext(canvas, contextAttributes);
 return contextHandle;
}

function _emscripten_webgl_make_context_current_calling_thread(contextHandle) {
 contextHandle >>>= 0;
 var success = GL.makeContextCurrent(contextHandle);
 if (success) GL.currentContextIsProxied = false;
 return success ? 0 : -5;
}

var ENV = {};

var getExecutableName = () => thisProgram || "./this.program";

var getEnvStrings = () => {
 if (!getEnvStrings.strings) {
  var lang = ((typeof navigator == "object" && navigator.languages && navigator.languages[0]) || "C").replace("-", "_") + ".UTF-8";
  var env = {
   "USER": "web_user",
   "LOGNAME": "web_user",
   "PATH": "/",
   "PWD": "/",
   "HOME": "/home/web_user",
   "LANG": lang,
   "_": getExecutableName()
  };
  for (var x in ENV) {
   if (ENV[x] === undefined) delete env[x]; else env[x] = ENV[x];
  }
  var strings = [];
  for (var x in env) {
   strings.push(\`\${x}=\${env[x]}\`);
  }
  getEnvStrings.strings = strings;
 }
 return getEnvStrings.strings;
};

var stringToAscii = (str, buffer) => {
 for (var i = 0; i < str.length; ++i) {
  assert(str.charCodeAt(i) === (str.charCodeAt(i) & 255));
  GROWABLE_HEAP_I8()[buffer++ >>> 0] = str.charCodeAt(i);
 }
 GROWABLE_HEAP_I8()[buffer >>> 0] = 0;
};

var _environ_get = function(__environ, environ_buf) {
 if (ENVIRONMENT_IS_PTHREAD) return proxyToMainThread(52, 0, 1, __environ, environ_buf);
 __environ >>>= 0;
 environ_buf >>>= 0;
 var bufSize = 0;
 getEnvStrings().forEach((string, i) => {
  var ptr = environ_buf + bufSize;
  GROWABLE_HEAP_U32()[(((__environ) + (i * 4)) >>> 2) >>> 0] = ptr;
  stringToAscii(string, ptr);
  bufSize += string.length + 1;
 });
 return 0;
};

var _environ_sizes_get = function(penviron_count, penviron_buf_size) {
 if (ENVIRONMENT_IS_PTHREAD) return proxyToMainThread(53, 0, 1, penviron_count, penviron_buf_size);
 penviron_count >>>= 0;
 penviron_buf_size >>>= 0;
 var strings = getEnvStrings();
 GROWABLE_HEAP_U32()[((penviron_count) >>> 2) >>> 0] = strings.length;
 var bufSize = 0;
 strings.forEach(string => bufSize += string.length + 1);
 GROWABLE_HEAP_U32()[((penviron_buf_size) >>> 2) >>> 0] = bufSize;
 return 0;
};

function _fd_close(fd) {
 if (ENVIRONMENT_IS_PTHREAD) return proxyToMainThread(54, 0, 1, fd);
 try {
  var stream = SYSCALLS.getStreamFromFD(fd);
  FS.close(stream);
  return 0;
 } catch (e) {
  if (typeof FS == "undefined" || !(e.name === "ErrnoError")) throw e;
  return e.errno;
 }
}

function _fd_fdstat_get(fd, pbuf) {
 if (ENVIRONMENT_IS_PTHREAD) return proxyToMainThread(55, 0, 1, fd, pbuf);
 pbuf >>>= 0;
 try {
  var rightsBase = 0;
  var rightsInheriting = 0;
  var flags = 0;
  {
   var stream = SYSCALLS.getStreamFromFD(fd);
   var type = stream.tty ? 2 : FS.isDir(stream.mode) ? 3 : FS.isLink(stream.mode) ? 7 : 4;
  }
  GROWABLE_HEAP_I8()[pbuf >>> 0] = type;
  GROWABLE_HEAP_I16()[(((pbuf) + (2)) >>> 1) >>> 0] = flags;
  HEAP64[(((pbuf) + (8)) >>> 3)] = BigInt(rightsBase);
  HEAP64[(((pbuf) + (16)) >>> 3)] = BigInt(rightsInheriting);
  return 0;
 } catch (e) {
  if (typeof FS == "undefined" || !(e.name === "ErrnoError")) throw e;
  return e.errno;
 }
}

/** @param {number=} offset */ var doReadv = (stream, iov, iovcnt, offset) => {
 var ret = 0;
 for (var i = 0; i < iovcnt; i++) {
  var ptr = GROWABLE_HEAP_U32()[((iov) >>> 2) >>> 0];
  var len = GROWABLE_HEAP_U32()[(((iov) + (4)) >>> 2) >>> 0];
  iov += 8;
  var curr = FS.read(stream, GROWABLE_HEAP_I8(), ptr, len, offset);
  if (curr < 0) return -1;
  ret += curr;
  if (curr < len) break;
  if (typeof offset !== "undefined") {
   offset += curr;
  }
 }
 return ret;
};

function _fd_pread(fd, iov, iovcnt, offset, pnum) {
 if (ENVIRONMENT_IS_PTHREAD) return proxyToMainThread(56, 0, 1, fd, iov, iovcnt, offset, pnum);
 iov >>>= 0;
 iovcnt >>>= 0;
 offset = bigintToI53Checked(offset);
 pnum >>>= 0;
 try {
  if (isNaN(offset)) return 61;
  var stream = SYSCALLS.getStreamFromFD(fd);
  var num = doReadv(stream, iov, iovcnt, offset);
  GROWABLE_HEAP_U32()[((pnum) >>> 2) >>> 0] = num;
  return 0;
 } catch (e) {
  if (typeof FS == "undefined" || !(e.name === "ErrnoError")) throw e;
  return e.errno;
 }
}

/** @param {number=} offset */ var doWritev = (stream, iov, iovcnt, offset) => {
 var ret = 0;
 for (var i = 0; i < iovcnt; i++) {
  var ptr = GROWABLE_HEAP_U32()[((iov) >>> 2) >>> 0];
  var len = GROWABLE_HEAP_U32()[(((iov) + (4)) >>> 2) >>> 0];
  iov += 8;
  var curr = FS.write(stream, GROWABLE_HEAP_I8(), ptr, len, offset);
  if (curr < 0) return -1;
  ret += curr;
  if (typeof offset !== "undefined") {
   offset += curr;
  }
 }
 return ret;
};

function _fd_pwrite(fd, iov, iovcnt, offset, pnum) {
 if (ENVIRONMENT_IS_PTHREAD) return proxyToMainThread(57, 0, 1, fd, iov, iovcnt, offset, pnum);
 iov >>>= 0;
 iovcnt >>>= 0;
 offset = bigintToI53Checked(offset);
 pnum >>>= 0;
 try {
  if (isNaN(offset)) return 61;
  var stream = SYSCALLS.getStreamFromFD(fd);
  var num = doWritev(stream, iov, iovcnt, offset);
  GROWABLE_HEAP_U32()[((pnum) >>> 2) >>> 0] = num;
  return 0;
 } catch (e) {
  if (typeof FS == "undefined" || !(e.name === "ErrnoError")) throw e;
  return e.errno;
 }
}

function _fd_read(fd, iov, iovcnt, pnum) {
 if (ENVIRONMENT_IS_PTHREAD) return proxyToMainThread(58, 0, 1, fd, iov, iovcnt, pnum);
 iov >>>= 0;
 iovcnt >>>= 0;
 pnum >>>= 0;
 try {
  var stream = SYSCALLS.getStreamFromFD(fd);
  var num = doReadv(stream, iov, iovcnt);
  GROWABLE_HEAP_U32()[((pnum) >>> 2) >>> 0] = num;
  return 0;
 } catch (e) {
  if (typeof FS == "undefined" || !(e.name === "ErrnoError")) throw e;
  return e.errno;
 }
}

function _fd_seek(fd, offset, whence, newOffset) {
 if (ENVIRONMENT_IS_PTHREAD) return proxyToMainThread(59, 0, 1, fd, offset, whence, newOffset);
 offset = bigintToI53Checked(offset);
 newOffset >>>= 0;
 try {
  if (isNaN(offset)) return 61;
  var stream = SYSCALLS.getStreamFromFD(fd);
  FS.llseek(stream, offset, whence);
  HEAP64[((newOffset) >>> 3)] = BigInt(stream.position);
  if (stream.getdents && offset === 0 && whence === 0) stream.getdents = null;
  return 0;
 } catch (e) {
  if (typeof FS == "undefined" || !(e.name === "ErrnoError")) throw e;
  return e.errno;
 }
}

function _fd_sync(fd) {
 if (ENVIRONMENT_IS_PTHREAD) return proxyToMainThread(60, 0, 1, fd);
 try {
  var stream = SYSCALLS.getStreamFromFD(fd);
  if (stream.stream_ops?.fsync) {
   return stream.stream_ops.fsync(stream);
  }
  return 0;
 } catch (e) {
  if (typeof FS == "undefined" || !(e.name === "ErrnoError")) throw e;
  return e.errno;
 }
}

function _fd_write(fd, iov, iovcnt, pnum) {
 if (ENVIRONMENT_IS_PTHREAD) return proxyToMainThread(61, 0, 1, fd, iov, iovcnt, pnum);
 iov >>>= 0;
 iovcnt >>>= 0;
 pnum >>>= 0;
 try {
  var stream = SYSCALLS.getStreamFromFD(fd);
  var num = doWritev(stream, iov, iovcnt);
  GROWABLE_HEAP_U32()[((pnum) >>> 2) >>> 0] = num;
  return 0;
 } catch (e) {
  if (typeof FS == "undefined" || !(e.name === "ErrnoError")) throw e;
  return e.errno;
 }
}

function _getentropy(buffer, size) {
 buffer >>>= 0;
 size >>>= 0;
 randomFill(GROWABLE_HEAP_U8().subarray(buffer >>> 0, buffer + size >>> 0));
 return 0;
}

/** @type {function(...*):?} */ function _sendfile() {
 abort("missing function: sendfile");
}

_sendfile.stub = true;

var arraySum = (array, index) => {
 var sum = 0;
 for (var i = 0; i <= index; sum += array[i++]) {}
 return sum;
};

var MONTH_DAYS_LEAP = [ 31, 29, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31 ];

var MONTH_DAYS_REGULAR = [ 31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31 ];

var addDays = (date, days) => {
 var newDate = new Date(date.getTime());
 while (days > 0) {
  var leap = isLeapYear(newDate.getFullYear());
  var currentMonth = newDate.getMonth();
  var daysInCurrentMonth = (leap ? MONTH_DAYS_LEAP : MONTH_DAYS_REGULAR)[currentMonth];
  if (days > daysInCurrentMonth - newDate.getDate()) {
   days -= (daysInCurrentMonth - newDate.getDate() + 1);
   newDate.setDate(1);
   if (currentMonth < 11) {
    newDate.setMonth(currentMonth + 1);
   } else {
    newDate.setMonth(0);
    newDate.setFullYear(newDate.getFullYear() + 1);
   }
  } else {
   newDate.setDate(newDate.getDate() + days);
   return newDate;
  }
 }
 return newDate;
};

var writeArrayToMemory = (array, buffer) => {
 assert(array.length >= 0, "writeArrayToMemory array must have a length (should be an array or typed array)");
 GROWABLE_HEAP_I8().set(array, buffer >>> 0);
};

function _strftime(s, maxsize, format, tm) {
 s >>>= 0;
 maxsize >>>= 0;
 format >>>= 0;
 tm >>>= 0;
 var tm_zone = GROWABLE_HEAP_U32()[(((tm) + (40)) >>> 2) >>> 0];
 var date = {
  tm_sec: GROWABLE_HEAP_I32()[((tm) >>> 2) >>> 0],
  tm_min: GROWABLE_HEAP_I32()[(((tm) + (4)) >>> 2) >>> 0],
  tm_hour: GROWABLE_HEAP_I32()[(((tm) + (8)) >>> 2) >>> 0],
  tm_mday: GROWABLE_HEAP_I32()[(((tm) + (12)) >>> 2) >>> 0],
  tm_mon: GROWABLE_HEAP_I32()[(((tm) + (16)) >>> 2) >>> 0],
  tm_year: GROWABLE_HEAP_I32()[(((tm) + (20)) >>> 2) >>> 0],
  tm_wday: GROWABLE_HEAP_I32()[(((tm) + (24)) >>> 2) >>> 0],
  tm_yday: GROWABLE_HEAP_I32()[(((tm) + (28)) >>> 2) >>> 0],
  tm_isdst: GROWABLE_HEAP_I32()[(((tm) + (32)) >>> 2) >>> 0],
  tm_gmtoff: GROWABLE_HEAP_I32()[(((tm) + (36)) >>> 2) >>> 0],
  tm_zone: tm_zone ? UTF8ToString(tm_zone) : ""
 };
 var pattern = UTF8ToString(format);
 var EXPANSION_RULES_1 = {
  "%c": "%a %b %d %H:%M:%S %Y",
  "%D": "%m/%d/%y",
  "%F": "%Y-%m-%d",
  "%h": "%b",
  "%r": "%I:%M:%S %p",
  "%R": "%H:%M",
  "%T": "%H:%M:%S",
  "%x": "%m/%d/%y",
  "%X": "%H:%M:%S",
  "%Ec": "%c",
  "%EC": "%C",
  "%Ex": "%m/%d/%y",
  "%EX": "%H:%M:%S",
  "%Ey": "%y",
  "%EY": "%Y",
  "%Od": "%d",
  "%Oe": "%e",
  "%OH": "%H",
  "%OI": "%I",
  "%Om": "%m",
  "%OM": "%M",
  "%OS": "%S",
  "%Ou": "%u",
  "%OU": "%U",
  "%OV": "%V",
  "%Ow": "%w",
  "%OW": "%W",
  "%Oy": "%y"
 };
 for (var rule in EXPANSION_RULES_1) {
  pattern = pattern.replace(new RegExp(rule, "g"), EXPANSION_RULES_1[rule]);
 }
 var WEEKDAYS = [ "Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday" ];
 var MONTHS = [ "January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December" ];
 function leadingSomething(value, digits, character) {
  var str = typeof value == "number" ? value.toString() : (value || "");
  while (str.length < digits) {
   str = character[0] + str;
  }
  return str;
 }
 function leadingNulls(value, digits) {
  return leadingSomething(value, digits, "0");
 }
 function compareByDay(date1, date2) {
  function sgn(value) {
   return value < 0 ? -1 : (value > 0 ? 1 : 0);
  }
  var compare;
  if ((compare = sgn(date1.getFullYear() - date2.getFullYear())) === 0) {
   if ((compare = sgn(date1.getMonth() - date2.getMonth())) === 0) {
    compare = sgn(date1.getDate() - date2.getDate());
   }
  }
  return compare;
 }
 function getFirstWeekStartDate(janFourth) {
  switch (janFourth.getDay()) {
  case 0:
   return new Date(janFourth.getFullYear() - 1, 11, 29);

  case 1:
   return janFourth;

  case 2:
   return new Date(janFourth.getFullYear(), 0, 3);

  case 3:
   return new Date(janFourth.getFullYear(), 0, 2);

  case 4:
   return new Date(janFourth.getFullYear(), 0, 1);

  case 5:
   return new Date(janFourth.getFullYear() - 1, 11, 31);

  case 6:
   return new Date(janFourth.getFullYear() - 1, 11, 30);
  }
 }
 function getWeekBasedYear(date) {
  var thisDate = addDays(new Date(date.tm_year + 1900, 0, 1), date.tm_yday);
  var janFourthThisYear = new Date(thisDate.getFullYear(), 0, 4);
  var janFourthNextYear = new Date(thisDate.getFullYear() + 1, 0, 4);
  var firstWeekStartThisYear = getFirstWeekStartDate(janFourthThisYear);
  var firstWeekStartNextYear = getFirstWeekStartDate(janFourthNextYear);
  if (compareByDay(firstWeekStartThisYear, thisDate) <= 0) {
   if (compareByDay(firstWeekStartNextYear, thisDate) <= 0) {
    return thisDate.getFullYear() + 1;
   }
   return thisDate.getFullYear();
  }
  return thisDate.getFullYear() - 1;
 }
 var EXPANSION_RULES_2 = {
  "%a": date => WEEKDAYS[date.tm_wday].substring(0, 3),
  "%A": date => WEEKDAYS[date.tm_wday],
  "%b": date => MONTHS[date.tm_mon].substring(0, 3),
  "%B": date => MONTHS[date.tm_mon],
  "%C": date => {
   var year = date.tm_year + 1900;
   return leadingNulls((year / 100) | 0, 2);
  },
  "%d": date => leadingNulls(date.tm_mday, 2),
  "%e": date => leadingSomething(date.tm_mday, 2, " "),
  "%g": date => getWeekBasedYear(date).toString().substring(2),
  "%G": getWeekBasedYear,
  "%H": date => leadingNulls(date.tm_hour, 2),
  "%I": date => {
   var twelveHour = date.tm_hour;
   if (twelveHour == 0) twelveHour = 12; else if (twelveHour > 12) twelveHour -= 12;
   return leadingNulls(twelveHour, 2);
  },
  "%j": date => leadingNulls(date.tm_mday + arraySum(isLeapYear(date.tm_year + 1900) ? MONTH_DAYS_LEAP : MONTH_DAYS_REGULAR, date.tm_mon - 1), 3),
  "%m": date => leadingNulls(date.tm_mon + 1, 2),
  "%M": date => leadingNulls(date.tm_min, 2),
  "%n": () => "\\n",
  "%p": date => {
   if (date.tm_hour >= 0 && date.tm_hour < 12) {
    return "AM";
   }
   return "PM";
  },
  "%S": date => leadingNulls(date.tm_sec, 2),
  "%t": () => "\\t",
  "%u": date => date.tm_wday || 7,
  "%U": date => {
   var days = date.tm_yday + 7 - date.tm_wday;
   return leadingNulls(Math.floor(days / 7), 2);
  },
  "%V": date => {
   var val = Math.floor((date.tm_yday + 7 - (date.tm_wday + 6) % 7) / 7);
   if ((date.tm_wday + 371 - date.tm_yday - 2) % 7 <= 2) {
    val++;
   }
   if (!val) {
    val = 52;
    var dec31 = (date.tm_wday + 7 - date.tm_yday - 1) % 7;
    if (dec31 == 4 || (dec31 == 5 && isLeapYear(date.tm_year % 400 - 1))) {
     val++;
    }
   } else if (val == 53) {
    var jan1 = (date.tm_wday + 371 - date.tm_yday) % 7;
    if (jan1 != 4 && (jan1 != 3 || !isLeapYear(date.tm_year))) val = 1;
   }
   return leadingNulls(val, 2);
  },
  "%w": date => date.tm_wday,
  "%W": date => {
   var days = date.tm_yday + 7 - ((date.tm_wday + 6) % 7);
   return leadingNulls(Math.floor(days / 7), 2);
  },
  "%y": date => (date.tm_year + 1900).toString().substring(2),
  "%Y": date => date.tm_year + 1900,
  "%z": date => {
   var off = date.tm_gmtoff;
   var ahead = off >= 0;
   off = Math.abs(off) / 60;
   off = (off / 60) * 100 + (off % 60);
   return (ahead ? "+" : "-") + String("0000" + off).slice(-4);
  },
  "%Z": date => date.tm_zone,
  "%%": () => "%"
 };
 pattern = pattern.replace(/%%/g, "\\0\\0");
 for (var rule in EXPANSION_RULES_2) {
  if (pattern.includes(rule)) {
   pattern = pattern.replace(new RegExp(rule, "g"), EXPANSION_RULES_2[rule](date));
  }
 }
 pattern = pattern.replace(/\\0\\0/g, "%");
 var bytes = intArrayFromString(pattern, false);
 if (bytes.length > maxsize) {
  return 0;
 }
 writeArrayToMemory(bytes, s);
 return bytes.length - 1;
}

function _strftime_l(s, maxsize, format, tm, loc) {
 s >>>= 0;
 maxsize >>>= 0;
 format >>>= 0;
 tm >>>= 0;
 loc >>>= 0;
 return _strftime(s, maxsize, format, tm);
}

function whSyncMem(h, dir) {
 var r = globalThis.__whReg[h];
 if (!r || r.memObjId < 0) return;
 var mem = globalThis.__whObj[r.memObjId];
 var mir = globalThis.__whObjMirror && globalThis.__whObjMirror[r.memObjId];
 if (!mem || !mir) return;
 var hb = new Uint8Array(mem.buffer);
 var n = mir.len < hb.length ? mir.len : hb.length;
 if (dir === 0) hb.set(GROWABLE_HEAP_U8().subarray(mir.ptr >>> 0, mir.ptr + n >>> 0)); else GROWABLE_HEAP_U8().set(hb.subarray(0, n), mir.ptr >>> 0);
}

var uleb128Encode = (n, target) => {
 assert(n < 16384);
 if (n < 128) {
  target.push(n);
 } else {
  target.push((n % 128) | 128, n >> 7);
 }
};

var sigToWasmTypes = sig => {
 var typeNames = {
  "i": "i32",
  "j": "i64",
  "f": "f32",
  "d": "f64",
  "e": "externref",
  "p": "i32"
 };
 var type = {
  parameters: [],
  results: sig[0] == "v" ? [] : [ typeNames[sig[0]] ]
 };
 for (var i = 1; i < sig.length; ++i) {
  assert(sig[i] in typeNames, "invalid signature char: " + sig[i]);
  type.parameters.push(typeNames[sig[i]]);
 }
 return type;
};

var generateFuncType = (sig, target) => {
 var sigRet = sig.slice(0, 1);
 var sigParam = sig.slice(1);
 var typeCodes = {
  "i": 127,
  "p": 127,
  "j": 126,
  "f": 125,
  "d": 124,
  "e": 111
 };
 target.push(96);
 /* form: func */ uleb128Encode(sigParam.length, target);
 for (var i = 0; i < sigParam.length; ++i) {
  assert(sigParam[i] in typeCodes, "invalid signature char: " + sigParam[i]);
  target.push(typeCodes[sigParam[i]]);
 }
 if (sigRet == "v") {
  target.push(0);
 } else {
  target.push(1, typeCodes[sigRet]);
 }
};

var convertJsFunctionToWasm = (func, sig) => {
 if (typeof WebAssembly.Function == "function") {
  return new WebAssembly.Function(sigToWasmTypes(sig), func);
 }
 var typeSectionBody = [ 1 ];
 generateFuncType(sig, typeSectionBody);
 var bytes = [ 0, 97, 115, 109, 1, 0, 0, 0, 1 ];
 uleb128Encode(typeSectionBody.length, bytes);
 bytes.push(...typeSectionBody);
 bytes.push(2, 7, 1, 1, 101, 1, 102, 0, 0, 7, 5, 1, 1, 102, 0, 0);
 var module = new WebAssembly.Module(new Uint8Array(bytes));
 var instance = new WebAssembly.Instance(module, {
  "e": {
   "f": func
  }
 });
 var wrappedFunc = instance.exports["f"];
 return wrappedFunc;
};

var updateTableMap = (offset, count) => {
 if (functionsInTableMap) {
  for (var i = offset; i < offset + count; i++) {
   var item = getWasmTableEntry(i);
   if (item) {
    functionsInTableMap.set(item, i);
   }
  }
 }
};

var functionsInTableMap;

var getFunctionAddress = func => {
 if (!functionsInTableMap) {
  functionsInTableMap = new WeakMap;
  updateTableMap(0, wasmTable.length);
 }
 return functionsInTableMap.get(func) || 0;
};

var freeTableIndexes = [];

var getEmptyTableSlot = () => {
 if (freeTableIndexes.length) {
  return freeTableIndexes.pop();
 }
 try {
  wasmTable.grow(1);
 } catch (err) {
  if (!(err instanceof RangeError)) {
   throw err;
  }
  throw "Unable to grow wasm table. Set ALLOW_TABLE_GROWTH.";
 }
 return wasmTable.length - 1;
};

var setWasmTableEntry = (idx, func) => {
 wasmTable.set(idx, func);
 wasmTableMirror[idx] = wasmTable.get(idx);
};

/** @param {string=} sig */ var addFunction = (func, sig) => {
 assert(typeof func != "undefined");
 var rtn = getFunctionAddress(func);
 if (rtn) {
  return rtn;
 }
 var ret = getEmptyTableSlot();
 try {
  setWasmTableEntry(ret, func);
 } catch (err) {
  if (!(err instanceof TypeError)) {
   throw err;
  }
  assert(typeof sig != "undefined", "Missing signature argument to addFunction: " + func);
  var wrapped = convertJsFunctionToWasm(func, sig);
  setWasmTableEntry(ret, wrapped);
 }
 functionsInTableMap.set(func, ret);
 return ret;
};

function _wasmhost_call(h, idx, argsptr, argc) {
 var r = globalThis.__whReg && globalThis.__whReg[h];
 if (!r || !r.fns) return 0;
 if (idx === -1) {
  if (r.directIdx === undefined) {
   var f0 = r.fns[0];
   try {
    r.directIdx = (typeof f0 === "function") ? addFunction(f0, "dd") : 0;
   } catch (e) {
    r.directIdx = 0;
   }
  }
  return r.directIdx;
 }
 var fn = r.fns[idx];
 if (typeof fn !== "function") return 0;
 var base = argsptr >> 3;
 var args = new Array(argc);
 for (var i = 0; i < argc; i++) args[i] = GROWABLE_HEAP_F64()[base + i >>> 0];
 whSyncMem(h, 0);
 var v = fn.apply(null, args);
 whSyncMem(h, 1);
 return typeof v === "number" ? v : (typeof v === "bigint" ? Number(v) : 0);
}

function _wasmhost_compile(ptr, len) {
 try {
  if (typeof WebAssembly === "undefined") return -1;
  var bytes = GROWABLE_HEAP_U8().slice(ptr, ptr + len);
  var mod = new WebAssembly.Module(bytes);
  var reg = globalThis.__whReg || (globalThis.__whReg = []);
  var h = reg.length;
  reg.push({
   mod: mod,
   inst: null,
   imports: WebAssembly.Module.imports(mod),
   exps: WebAssembly.Module.exports(mod),
   fns: null,
   memObjId: -1
  });
  return h;
 } catch (e) {
  console.error("[wasm-host] compile failed:", e && e.message ? e.message : e);
  return -1;
 }
}

function _wasmhost_export_count(h) {
 var r = globalThis.__whReg && globalThis.__whReg[h];
 return r ? r.exps.length : 0;
}

function _wasmhost_export_kind(h, i) {
 var r = globalThis.__whReg && globalThis.__whReg[h];
 if (!r) return -1;
 var k = r.exps[i].kind;
 return k === "function" ? 0 : k === "table" ? 1 : k === "memory" ? 2 : 3;
}

function _wasmhost_export_name(h, i, buf, buflen) {
 var r = globalThis.__whReg && globalThis.__whReg[h];
 if (!r) return 0;
 var s = r.exps[i].name, need = lengthBytesUTF8(s);
 stringToUTF8(s, buf, buflen);
 return need < buflen ? need : buflen - 1;
}

function _wasmhost_export_register_mem(h, idx) {
 var r = globalThis.__whReg && globalThis.__whReg[h];
 if (!r || !r.inst) return -1;
 var mem = r.inst.exports[r.exps[idx].name];
 if (!(mem instanceof WebAssembly.Memory)) return -1;
 var reg = globalThis.__whObj || (globalThis.__whObj = []);
 var id = reg.length;
 reg.push(mem);
 r.memObjId = id;
 return id;
}

function _wasmhost_global_new(val, kind, mut) {
 try {
  var type = kind === 0 ? "i32" : kind === 1 ? "i64" : kind === 2 ? "f32" : "f64";
  var g = new WebAssembly.Global({
   value: type,
   mutable: !!mut
  }, kind === 1 ? BigInt(Math.trunc(val)) : val);
  var reg = globalThis.__whObj || (globalThis.__whObj = []);
  var id = reg.length;
  reg.push(g);
  return id;
 } catch (e) {
  console.error("[wasm-host] global_new failed:", e && e.message ? e.message : e);
  return -1;
 }
}

function _wasmhost_guest_mem_objid() {
 if (globalThis.__whGuestMemId !== undefined) return globalThis.__whGuestMemId;
 var mem = (typeof wasmMemory !== "undefined" && wasmMemory) ? wasmMemory : (typeof Module !== "undefined" && Module.wasmMemory) ? Module.wasmMemory : null;
 if (!mem || !mem.buffer) {
  globalThis.__whGuestMemId = -1;
  return -1;
 }
 var reg = globalThis.__whObj || (globalThis.__whObj = []);
 var id = reg.length;
 reg.push(mem);
 globalThis.__whGuestMemId = id;
 return id;
}

function _wasmhost_guest_mem_shared() {
 var mem = (typeof wasmMemory !== "undefined" && wasmMemory) ? wasmMemory : (typeof Module !== "undefined" && Module.wasmMemory) ? Module.wasmMemory : null;
 return (mem && mem.buffer && typeof SharedArrayBuffer !== "undefined" && (mem.buffer instanceof SharedArrayBuffer)) ? 1 : 0;
}

function _wasmhost_import_count(h) {
 var r = globalThis.__whReg && globalThis.__whReg[h];
 return r ? r.imports.length : 0;
}

function _wasmhost_import_kind(h, i) {
 var r = globalThis.__whReg && globalThis.__whReg[h];
 if (!r) return -1;
 var k = r.imports[i].kind;
 return k === "function" ? 0 : k === "table" ? 1 : k === "memory" ? 2 : 3;
}

function _wasmhost_import_module(h, i, buf, buflen) {
 var r = globalThis.__whReg && globalThis.__whReg[h];
 if (!r) return 0;
 var s = r.imports[i].module, need = lengthBytesUTF8(s);
 stringToUTF8(s, buf, buflen);
 return need < buflen ? need : buflen - 1;
}

function _wasmhost_import_name(h, i, buf, buflen) {
 var r = globalThis.__whReg && globalThis.__whReg[h];
 if (!r) return 0;
 var s = r.imports[i].name, need = lengthBytesUTF8(s);
 stringToUTF8(s, buf, buflen);
 return need < buflen ? need : buflen - 1;
}

function _wasmhost_instantiate(h, callbackIdsPtr, importCount) {
 try {
  var r = globalThis.__whReg && globalThis.__whReg[h];
  if (!r) return -1;
  function shimFor(cbid, hh) {
   return function() {
    whSyncMem(hh, 1);
    var argc = arguments.length;
    if (argc > 64) argc = 64;
    var scratch = globalThis.__whScratch;
    if (!scratch) scratch = globalThis.__whScratch = Module._malloc(64 * 8);
    var base = scratch >> 3;
    for (var i = 0; i < argc; i++) {
     var a = arguments[i];
     GROWABLE_HEAP_F64()[base + i >>> 0] = typeof a === "bigint" ? Number(a) : a;
    }
    var ret = Module._wasmhost_invoke_import(cbid, scratch, argc);
    whSyncMem(hh, 0);
    return ret;
   };
  }
  var hostImports = {};
  for (var i = 0; i < importCount; i++) {
   var imp = r.imports[i];
   if (!hostImports[imp.module]) hostImports[imp.module] = {};
   var id = GROWABLE_HEAP_I32()[(callbackIdsPtr >> 2) + i >>> 0];
   if (id === -2) {
    hostImports[imp.module][imp.name] = function(site, argc) {
     return Module._wasmjit_invoke(site, argc);
    };
    continue;
   }
   if (id === -3) {
    hostImports[imp.module][imp.name] = function(kind, site) {
     return Module._wjhelp(kind, site);
    };
    continue;
   }
   if (id < 0) continue;
   if (imp.kind === "function") {
    hostImports[imp.module][imp.name] = shimFor(id, h);
   } else {
    hostImports[imp.module][imp.name] = globalThis.__whObj[id];
    if (imp.kind === "memory") r.memObjId = id;
   }
  }
  var inst = new WebAssembly.Instance(r.mod, hostImports);
  r.inst = inst;
  var fns = [];
  for (var j = 0; j < r.exps.length; j++) {
   fns.push(r.exps[j].kind === "function" ? inst.exports[r.exps[j].name] : null);
  }
  r.fns = fns;
  return 0;
 } catch (e) {
  console.error("[wasm-host] instantiate failed:", e && e.message ? e.message : e);
  return -1;
 }
}

function _wasmhost_jit_table() {
 if (globalThis.__whJitTableId !== undefined) return globalThis.__whJitTableId;
 try {
  var t = new WebAssembly.Table({
   element: "anyfunc",
   initial: 4096
  });
  var reg = globalThis.__whObj || (globalThis.__whObj = []);
  var id = reg.length;
  reg.push(t);
  globalThis.__whJitTableId = id;
  return id;
 } catch (e) {
  console.error("[wasm-host] jit_table failed:", e && e.message ? e.message : e);
  globalThis.__whJitTableId = -1;
  return -1;
 }
}

function _wasmhost_jit_table_set(h, idx) {
 var tid = globalThis.__whJitTableId;
 if (tid === undefined || tid < 0) return -1;
 var t = globalThis.__whObj[tid];
 var r = globalThis.__whReg && globalThis.__whReg[h];
 if (!t || !r || !r.fns) return -1;
 var fn = null;
 for (var i = 0; i < r.exps.length; i++) {
  if (r.exps[i].name === "m") {
   fn = r.fns[i];
   break;
  }
 }
 if (!fn) fn = r.fns[0];
 if (typeof fn !== "function") return -1;
 try {
  t.set(idx, fn);
  return 0;
 } catch (e) {
  return -1;
 }
}

function _wasmhost_mem_bytelength(id) {
 var m = globalThis.__whObj && globalThis.__whObj[id];
 return m && m.buffer ? m.buffer.byteLength : 0;
}

function _wasmhost_mem_is_shared(id) {
 var m = globalThis.__whObj && globalThis.__whObj[id];
 return m && m.buffer && (typeof SharedArrayBuffer !== "undefined") && (m.buffer instanceof SharedArrayBuffer) ? 1 : 0;
}

function _wasmhost_mem_new(initialPages, maxPages, shared) {
 try {
  var desc = {
   initial: initialPages
  };
  if (maxPages >= 0) desc.maximum = maxPages; else if (shared) desc.maximum = initialPages;
  if (shared) desc.shared = true;
  var mem = new WebAssembly.Memory(desc);
  var reg = globalThis.__whObj || (globalThis.__whObj = []);
  var id = reg.length;
  reg.push(mem);
  return id;
 } catch (e) {
  console.error("[wasm-host] mem_new failed:", e && e.message ? e.message : e);
  return -1;
 }
}

function _wasmhost_obj_set_mirror(id, ptr, len) {
 var reg = globalThis.__whObjMirror || (globalThis.__whObjMirror = {});
 reg[id] = {
  ptr: ptr,
  len: len
 };
}

function _wasmhost_table_new(initial, maxN, isExternref) {
 try {
  var desc = {
   initial: initial,
   element: isExternref ? "externref" : "anyfunc"
  };
  if (maxN >= 0) desc.maximum = maxN;
  var t = new WebAssembly.Table(desc);
  var reg = globalThis.__whObj || (globalThis.__whObj = []);
  var id = reg.length;
  reg.push(t);
  return id;
 } catch (e) {
  console.error("[wasm-host] table_new failed:", e && e.message ? e.message : e);
  return -1;
 }
}

var getCFunc = ident => {
 var func = Module["_" + ident];
 assert(func, "Cannot call unknown function " + ident + ", make sure it is exported");
 return func;
};

var stringToUTF8OnStack = str => {
 var size = lengthBytesUTF8(str) + 1;
 var ret = stackAlloc(size);
 stringToUTF8(str, ret, size);
 return ret;
};

/**
     * @param {string|null=} returnType
     * @param {Array=} argTypes
     * @param {Arguments|Array=} args
     * @param {Object=} opts
     */ var ccall = (ident, returnType, argTypes, args, opts) => {
 var toC = {
  "string": str => {
   var ret = 0;
   if (str !== null && str !== undefined && str !== 0) {
    ret = stringToUTF8OnStack(str);
   }
   return ret;
  },
  "array": arr => {
   var ret = stackAlloc(arr.length);
   writeArrayToMemory(arr, ret);
   return ret;
  }
 };
 function convertReturnValue(ret) {
  if (returnType === "string") {
   return UTF8ToString(ret);
  }
  if (returnType === "boolean") return Boolean(ret);
  return ret;
 }
 var func = getCFunc(ident);
 var cArgs = [];
 var stack = 0;
 assert(returnType !== "array", 'Return type should not be "array".');
 if (args) {
  for (var i = 0; i < args.length; i++) {
   var converter = toC[argTypes[i]];
   if (converter) {
    if (stack === 0) stack = stackSave();
    cArgs[i] = converter(args[i]);
   } else {
    cArgs[i] = args[i];
   }
  }
 }
 var ret = func(...cArgs);
 function onDone(ret) {
  if (stack !== 0) stackRestore(stack);
  return convertReturnValue(ret);
 }
 ret = onDone(ret);
 return ret;
};

/**
     * @param {string=} returnType
     * @param {Array=} argTypes
     * @param {Object=} opts
     */ var cwrap = (ident, returnType, argTypes, opts) => (...args) => ccall(ident, returnType, argTypes, args, opts);

var removeFunction = index => {
 functionsInTableMap.delete(getWasmTableEntry(index));
 setWasmTableEntry(index, null);
 freeTableIndexes.push(index);
};

var FS_unlink = path => FS.unlink(path);

PThread.init();

FS.createPreloadedFile = FS_createPreloadedFile;

FS.staticInit();

Module["FS_createPath"] = FS.createPath;

Module["FS_createDataFile"] = FS.createDataFile;

Module["FS_createPreloadedFile"] = FS.createPreloadedFile;

Module["FS_unlink"] = FS.unlink;

Module["FS_createLazyFile"] = FS.createLazyFile;

Module["FS_createDevice"] = FS.createDevice;

var GLctx;

for (var i = 0; i < 32; ++i) tempFixedLengthArray.push(new Array(i));

var miniTempWebGLFloatBuffersStorage = new Float32Array(288);

for (/**@suppress{duplicate}*/ var i = 0; i < 288; ++i) {
 miniTempWebGLFloatBuffers[i] = miniTempWebGLFloatBuffersStorage.subarray(0, i + 1);
}

var miniTempWebGLIntBuffersStorage = new Int32Array(288);

for (/**@suppress{duplicate}*/ var i = 0; i < 288; ++i) {
 miniTempWebGLIntBuffers[i] = miniTempWebGLIntBuffersStorage.subarray(0, i + 1);
}

var proxiedFunctionTable = [ _proc_exit, exitOnMainThread, pthreadCreateProxied, _wisp_select_scan, ___syscall_accept4, ___syscall_bind, ___syscall_chdir, ___syscall_chmod, ___syscall_connect, ___syscall_dup3, ___syscall_faccessat, ___syscall_fadvise64, ___syscall_fallocate, ___syscall_fchmod, ___syscall_fchown32, ___syscall_fcntl64, ___syscall_fstat64, ___syscall_ftruncate64, ___syscall_getcwd, ___syscall_getdents64, ___syscall_getpeername, ___syscall_getsockname, ___syscall_getsockopt, ___syscall_ioctl, ___syscall_listen, ___syscall_lstat64, ___syscall_mkdirat, ___syscall_mknodat, ___syscall_newfstatat, ___syscall_openat, ___syscall_pipe, ___syscall_readlinkat, ___syscall_recvfrom, ___syscall_recvmsg, ___syscall_renameat, ___syscall_rmdir, ___syscall_sendmsg, ___syscall_sendto, ___syscall_socket, ___syscall_stat64, ___syscall_statfs64, ___syscall_symlink, ___syscall_truncate64, ___syscall_unlinkat, ___syscall_utimensat, __emscripten_lookup_name, __emscripten_runtime_keepalive_clear, setCanvasElementSizeMainThread, __mmap_js, __munmap_js, getCanvasSizeMainThread, _emscripten_webgl_create_context_proxied, _environ_get, _environ_sizes_get, _fd_close, _fd_fdstat_get, _fd_pread, _fd_pwrite, _fd_read, _fd_seek, _fd_sync, _fd_write ];

function checkIncomingModuleAPI() {
 ignoredModuleProp("fetchSettings");
}

var wasmImports = {
 /** @export */ HaveOffsetConverter: HaveOffsetConverter,
 /** @export */ WasmAddStub: WasmAddStub,
 /** @export */ WasmInvoke: WasmInvoke,
 /** @export */ _Unwind_Backtrace: __Unwind_Backtrace,
 /** @export */ _Unwind_GetIP: __Unwind_GetIP,
 /** @export */ _ZN16nsBaseFilePicker13AppendFiltersEi: __ZN16nsBaseFilePicker13AppendFiltersEi,
 /** @export */ _ZN16nsBaseFilePicker15AppendRawFilterERK12nsTSubstringIDsE: __ZN16nsBaseFilePicker15AppendRawFilterERK12nsTSubstringIDsE,
 /** @export */ _ZN16nsBaseFilePicker15IsModeSupportedEN13nsIFilePicker4ModeEP9JSContextPPN7mozilla3dom7PromiseE: __ZN16nsBaseFilePicker15IsModeSupportedEN13nsIFilePicker4ModeEP9JSContextPPN7mozilla3dom7PromiseE,
 /** @export */ _ZN16nsBaseFilePicker16GetOkButtonLabelER12nsTSubstringIDsE: __ZN16nsBaseFilePicker16GetOkButtonLabelER12nsTSubstringIDsE,
 /** @export */ _ZN16nsBaseFilePicker16SetOkButtonLabelERK12nsTSubstringIDsE: __ZN16nsBaseFilePicker16SetOkButtonLabelERK12nsTSubstringIDsE,
 /** @export */ _ZN16nsBaseFilePicker18GetAddToRecentDocsEPb: __ZN16nsBaseFilePicker18GetAddToRecentDocsEPb,
 /** @export */ _ZN16nsBaseFilePicker18SetAddToRecentDocsEb: __ZN16nsBaseFilePicker18SetAddToRecentDocsEb,
 /** @export */ _ZN16nsBaseFilePicker19GetDisplayDirectoryEPP7nsIFile: __ZN16nsBaseFilePicker19GetDisplayDirectoryEPP7nsIFile,
 /** @export */ _ZN16nsBaseFilePicker19SetDisplayDirectoryEP7nsIFile: __ZN16nsBaseFilePicker19SetDisplayDirectoryEP7nsIFile,
 /** @export */ _ZN16nsBaseFilePicker26GetDisplaySpecialDirectoryER12nsTSubstringIDsE: __ZN16nsBaseFilePicker26GetDisplaySpecialDirectoryER12nsTSubstringIDsE,
 /** @export */ _ZN16nsBaseFilePicker26SetDisplaySpecialDirectoryERK12nsTSubstringIDsE: __ZN16nsBaseFilePicker26SetDisplaySpecialDirectoryERK12nsTSubstringIDsE,
 /** @export */ _ZN16nsBaseFilePicker7GetModeEPN13nsIFilePicker4ModeE: __ZN16nsBaseFilePicker7GetModeEPN13nsIFilePicker4ModeE,
 /** @export */ _ZN16nsBaseFilePickerC2Ev: __ZN16nsBaseFilePickerC2Ev,
 /** @export */ _ZN16nsBaseFilePickerD2Ev: __ZN16nsBaseFilePickerD2Ev,
 /** @export */ _ZN4base9LaunchAppERKNSt3__26vectorINS0_12basic_stringIcNS0_11char_traitsIcEENS0_9allocatorIcEEEENS5_IS7_EEEEONS_13LaunchOptionsEPi: __ZN4base9LaunchAppERKNSt3__26vectorINS0_12basic_stringIcNS0_11char_traitsIcEENS0_9allocatorIcEEEENS5_IS7_EEEEONS_13LaunchOptionsEPi,
 /** @export */ _ZN7mozilla15GetProcInfoSyncEO8nsTArrayINS_15ProcInfoRequestEE: __ZN7mozilla15GetProcInfoSyncEO8nsTArrayINS_15ProcInfoRequestEE,
 /** @export */ _ZN7mozilla15RLBoxSoundTouch10numSamplesEv: __ZN7mozilla15RLBoxSoundTouch10numSamplesEv,
 /** @export */ _ZN7mozilla15RLBoxSoundTouch10putSamplesEPKfj: __ZN7mozilla15RLBoxSoundTouch10putSamplesEPKfj,
 /** @export */ _ZN7mozilla15RLBoxSoundTouch10setSettingEii: __ZN7mozilla15RLBoxSoundTouch10setSettingEii,
 /** @export */ _ZN7mozilla15RLBoxSoundTouch11setChannelsEj: __ZN7mozilla15RLBoxSoundTouch11setChannelsEj,
 /** @export */ _ZN7mozilla15RLBoxSoundTouch13setSampleRateEj: __ZN7mozilla15RLBoxSoundTouch13setSampleRateEj,
 /** @export */ _ZN7mozilla15RLBoxSoundTouch14receiveSamplesEPfj: __ZN7mozilla15RLBoxSoundTouch14receiveSamplesEPfj,
 /** @export */ _ZN7mozilla15RLBoxSoundTouch21numUnprocessedSamplesEv: __ZN7mozilla15RLBoxSoundTouch21numUnprocessedSamplesEv,
 /** @export */ _ZN7mozilla15RLBoxSoundTouch4InitEv: __ZN7mozilla15RLBoxSoundTouch4InitEv,
 /** @export */ _ZN7mozilla15RLBoxSoundTouch5flushEv: __ZN7mozilla15RLBoxSoundTouch5flushEv,
 /** @export */ _ZN7mozilla15RLBoxSoundTouch7setRateEd: __ZN7mozilla15RLBoxSoundTouch7setRateEd,
 /** @export */ _ZN7mozilla15RLBoxSoundTouch8setPitchEd: __ZN7mozilla15RLBoxSoundTouch8setPitchEd,
 /** @export */ _ZN7mozilla15RLBoxSoundTouch8setTempoEd: __ZN7mozilla15RLBoxSoundTouch8setTempoEd,
 /** @export */ _ZN7mozilla15RLBoxSoundTouchC1Ev: __ZN7mozilla15RLBoxSoundTouchC1Ev,
 /** @export */ _ZN7mozilla15RLBoxSoundTouchD1Ev: __ZN7mozilla15RLBoxSoundTouchD1Ev,
 /** @export */ _ZN7mozilla4a11y30GetCacheDomainsForKnownClientsEy: __ZN7mozilla4a11y30GetCacheDomainsForKnownClientsEy,
 /** @export */ _ZN7mozilla6widget27CreateMediaControlKeySourceEv: __ZN7mozilla6widget27CreateMediaControlKeySourceEv,
 /** @export */ _ZN9nsIWidget17CreateChildWindowEv: __ZN9nsIWidget17CreateChildWindowEv,
 /** @export */ _ZN9nsIWidget20CreateTopLevelWindowEv: __ZN9nsIWidget20CreateTopLevelWindowEv,
 /** @export */ _ZN9nsIWidget23CreateBidiKeyboardInnerEv: __ZN9nsIWidget23CreateBidiKeyboardInnerEv,
 /** @export */ _ZNK16nsBaseFilePicker17GetRelevantGlobalEv: __ZNK16nsBaseFilePicker17GetRelevantGlobalEv,
 /** @export */ _ZNK2js12NativeObject15numDynamicSlotsEv: __ZNK2js12NativeObject15numDynamicSlotsEv,
 /** @export */ __assert_fail: ___assert_fail,
 /** @export */ __call_sighandler: ___call_sighandler,
 /** @export */ __emscripten_init_main_thread_js: ___emscripten_init_main_thread_js,
 /** @export */ __emscripten_thread_cleanup: ___emscripten_thread_cleanup,
 /** @export */ __pthread_create_js: ___pthread_create_js,
 /** @export */ __syscall__newselect: ___syscall__newselect,
 /** @export */ __syscall_accept4: ___syscall_accept4,
 /** @export */ __syscall_bind: ___syscall_bind,
 /** @export */ __syscall_chdir: ___syscall_chdir,
 /** @export */ __syscall_chmod: ___syscall_chmod,
 /** @export */ __syscall_connect: ___syscall_connect,
 /** @export */ __syscall_dup3: ___syscall_dup3,
 /** @export */ __syscall_faccessat: ___syscall_faccessat,
 /** @export */ __syscall_fadvise64: ___syscall_fadvise64,
 /** @export */ __syscall_fallocate: ___syscall_fallocate,
 /** @export */ __syscall_fchmod: ___syscall_fchmod,
 /** @export */ __syscall_fchown32: ___syscall_fchown32,
 /** @export */ __syscall_fcntl64: ___syscall_fcntl64,
 /** @export */ __syscall_fstat64: ___syscall_fstat64,
 /** @export */ __syscall_ftruncate64: ___syscall_ftruncate64,
 /** @export */ __syscall_getcwd: ___syscall_getcwd,
 /** @export */ __syscall_getdents64: ___syscall_getdents64,
 /** @export */ __syscall_getpeername: ___syscall_getpeername,
 /** @export */ __syscall_getsockname: ___syscall_getsockname,
 /** @export */ __syscall_getsockopt: ___syscall_getsockopt,
 /** @export */ __syscall_ioctl: ___syscall_ioctl,
 /** @export */ __syscall_listen: ___syscall_listen,
 /** @export */ __syscall_lstat64: ___syscall_lstat64,
 /** @export */ __syscall_mkdirat: ___syscall_mkdirat,
 /** @export */ __syscall_mknodat: ___syscall_mknodat,
 /** @export */ __syscall_newfstatat: ___syscall_newfstatat,
 /** @export */ __syscall_openat: ___syscall_openat,
 /** @export */ __syscall_pipe: ___syscall_pipe,
 /** @export */ __syscall_readlinkat: ___syscall_readlinkat,
 /** @export */ __syscall_recvfrom: ___syscall_recvfrom,
 /** @export */ __syscall_recvmsg: ___syscall_recvmsg,
 /** @export */ __syscall_renameat: ___syscall_renameat,
 /** @export */ __syscall_rmdir: ___syscall_rmdir,
 /** @export */ __syscall_sendmsg: ___syscall_sendmsg,
 /** @export */ __syscall_sendto: ___syscall_sendto,
 /** @export */ __syscall_socket: ___syscall_socket,
 /** @export */ __syscall_stat64: ___syscall_stat64,
 /** @export */ __syscall_statfs64: ___syscall_statfs64,
 /** @export */ __syscall_symlink: ___syscall_symlink,
 /** @export */ __syscall_truncate64: ___syscall_truncate64,
 /** @export */ __syscall_unlinkat: ___syscall_unlinkat,
 /** @export */ __syscall_utimensat: ___syscall_utimensat,
 /** @export */ _emscripten_get_now_is_monotonic: __emscripten_get_now_is_monotonic,
 /** @export */ _emscripten_lookup_name: __emscripten_lookup_name,
 /** @export */ _emscripten_notify_mailbox_postmessage: __emscripten_notify_mailbox_postmessage,
 /** @export */ _emscripten_proxied_gl_context_activated_from_main_browser_thread: __emscripten_proxied_gl_context_activated_from_main_browser_thread,
 /** @export */ _emscripten_receive_on_main_thread_js: __emscripten_receive_on_main_thread_js,
 /** @export */ _emscripten_runtime_keepalive_clear: __emscripten_runtime_keepalive_clear,
 /** @export */ _emscripten_set_offscreencanvas_size: __emscripten_set_offscreencanvas_size,
 /** @export */ _emscripten_thread_mailbox_await: __emscripten_thread_mailbox_await,
 /** @export */ _emscripten_thread_set_strongref: __emscripten_thread_set_strongref,
 /** @export */ _emscripten_throw_longjmp: __emscripten_throw_longjmp,
 /** @export */ _gmtime_js: __gmtime_js,
 /** @export */ _localtime_js: __localtime_js,
 /** @export */ _mktime_js: __mktime_js,
 /** @export */ _mmap_js: __mmap_js,
 /** @export */ _munmap_js: __munmap_js,
 /** @export */ _tzset_js: __tzset_js,
 /** @export */ emscripten_asm_const_int: _emscripten_asm_const_int,
 /** @export */ emscripten_asm_const_int_sync_on_main_thread: _emscripten_asm_const_int_sync_on_main_thread,
 /** @export */ emscripten_check_blocking_allowed: _emscripten_check_blocking_allowed,
 /** @export */ emscripten_date_now: _emscripten_date_now,
 /** @export */ emscripten_err: _emscripten_err,
 /** @export */ emscripten_errn: _emscripten_errn,
 /** @export */ emscripten_exit_with_live_runtime: _emscripten_exit_with_live_runtime,
 /** @export */ emscripten_get_canvas_element_size: _emscripten_get_canvas_element_size,
 /** @export */ emscripten_get_heap_max: _emscripten_get_heap_max,
 /** @export */ emscripten_get_now: _emscripten_get_now,
 /** @export */ emscripten_glActiveTexture: _emscripten_glActiveTexture,
 /** @export */ emscripten_glAttachShader: _emscripten_glAttachShader,
 /** @export */ emscripten_glBeginQuery: _emscripten_glBeginQuery,
 /** @export */ emscripten_glBeginQueryEXT: _emscripten_glBeginQueryEXT,
 /** @export */ emscripten_glBeginTransformFeedback: _emscripten_glBeginTransformFeedback,
 /** @export */ emscripten_glBindAttribLocation: _emscripten_glBindAttribLocation,
 /** @export */ emscripten_glBindBuffer: _emscripten_glBindBuffer,
 /** @export */ emscripten_glBindBufferBase: _emscripten_glBindBufferBase,
 /** @export */ emscripten_glBindBufferRange: _emscripten_glBindBufferRange,
 /** @export */ emscripten_glBindFramebuffer: _emscripten_glBindFramebuffer,
 /** @export */ emscripten_glBindRenderbuffer: _emscripten_glBindRenderbuffer,
 /** @export */ emscripten_glBindSampler: _emscripten_glBindSampler,
 /** @export */ emscripten_glBindTexture: _emscripten_glBindTexture,
 /** @export */ emscripten_glBindTransformFeedback: _emscripten_glBindTransformFeedback,
 /** @export */ emscripten_glBindVertexArray: _emscripten_glBindVertexArray,
 /** @export */ emscripten_glBlendColor: _emscripten_glBlendColor,
 /** @export */ emscripten_glBlendEquation: _emscripten_glBlendEquation,
 /** @export */ emscripten_glBlendEquationSeparate: _emscripten_glBlendEquationSeparate,
 /** @export */ emscripten_glBlendFunc: _emscripten_glBlendFunc,
 /** @export */ emscripten_glBlendFuncSeparate: _emscripten_glBlendFuncSeparate,
 /** @export */ emscripten_glBlitFramebuffer: _emscripten_glBlitFramebuffer,
 /** @export */ emscripten_glBufferData: _emscripten_glBufferData,
 /** @export */ emscripten_glBufferSubData: _emscripten_glBufferSubData,
 /** @export */ emscripten_glCheckFramebufferStatus: _emscripten_glCheckFramebufferStatus,
 /** @export */ emscripten_glClear: _emscripten_glClear,
 /** @export */ emscripten_glClearBufferfi: _emscripten_glClearBufferfi,
 /** @export */ emscripten_glClearBufferfv: _emscripten_glClearBufferfv,
 /** @export */ emscripten_glClearBufferiv: _emscripten_glClearBufferiv,
 /** @export */ emscripten_glClearBufferuiv: _emscripten_glClearBufferuiv,
 /** @export */ emscripten_glClearColor: _emscripten_glClearColor,
 /** @export */ emscripten_glClearDepthf: _emscripten_glClearDepthf,
 /** @export */ emscripten_glClearStencil: _emscripten_glClearStencil,
 /** @export */ emscripten_glClientWaitSync: _emscripten_glClientWaitSync,
 /** @export */ emscripten_glColorMask: _emscripten_glColorMask,
 /** @export */ emscripten_glCompileShader: _emscripten_glCompileShader,
 /** @export */ emscripten_glCompressedTexImage2D: _emscripten_glCompressedTexImage2D,
 /** @export */ emscripten_glCompressedTexImage3D: _emscripten_glCompressedTexImage3D,
 /** @export */ emscripten_glCompressedTexSubImage2D: _emscripten_glCompressedTexSubImage2D,
 /** @export */ emscripten_glCompressedTexSubImage3D: _emscripten_glCompressedTexSubImage3D,
 /** @export */ emscripten_glCopyBufferSubData: _emscripten_glCopyBufferSubData,
 /** @export */ emscripten_glCopyTexImage2D: _emscripten_glCopyTexImage2D,
 /** @export */ emscripten_glCopyTexSubImage2D: _emscripten_glCopyTexSubImage2D,
 /** @export */ emscripten_glCopyTexSubImage3D: _emscripten_glCopyTexSubImage3D,
 /** @export */ emscripten_glCreateProgram: _emscripten_glCreateProgram,
 /** @export */ emscripten_glCreateShader: _emscripten_glCreateShader,
 /** @export */ emscripten_glCullFace: _emscripten_glCullFace,
 /** @export */ emscripten_glDeleteBuffers: _emscripten_glDeleteBuffers,
 /** @export */ emscripten_glDeleteFramebuffers: _emscripten_glDeleteFramebuffers,
 /** @export */ emscripten_glDeleteProgram: _emscripten_glDeleteProgram,
 /** @export */ emscripten_glDeleteQueries: _emscripten_glDeleteQueries,
 /** @export */ emscripten_glDeleteQueriesEXT: _emscripten_glDeleteQueriesEXT,
 /** @export */ emscripten_glDeleteRenderbuffers: _emscripten_glDeleteRenderbuffers,
 /** @export */ emscripten_glDeleteSamplers: _emscripten_glDeleteSamplers,
 /** @export */ emscripten_glDeleteShader: _emscripten_glDeleteShader,
 /** @export */ emscripten_glDeleteSync: _emscripten_glDeleteSync,
 /** @export */ emscripten_glDeleteTextures: _emscripten_glDeleteTextures,
 /** @export */ emscripten_glDeleteTransformFeedbacks: _emscripten_glDeleteTransformFeedbacks,
 /** @export */ emscripten_glDeleteVertexArrays: _emscripten_glDeleteVertexArrays,
 /** @export */ emscripten_glDepthFunc: _emscripten_glDepthFunc,
 /** @export */ emscripten_glDepthMask: _emscripten_glDepthMask,
 /** @export */ emscripten_glDepthRangef: _emscripten_glDepthRangef,
 /** @export */ emscripten_glDetachShader: _emscripten_glDetachShader,
 /** @export */ emscripten_glDisable: _emscripten_glDisable,
 /** @export */ emscripten_glDisableVertexAttribArray: _emscripten_glDisableVertexAttribArray,
 /** @export */ emscripten_glDrawArrays: _emscripten_glDrawArrays,
 /** @export */ emscripten_glDrawArraysInstanced: _emscripten_glDrawArraysInstanced,
 /** @export */ emscripten_glDrawBuffers: _emscripten_glDrawBuffers,
 /** @export */ emscripten_glDrawElements: _emscripten_glDrawElements,
 /** @export */ emscripten_glDrawElementsInstanced: _emscripten_glDrawElementsInstanced,
 /** @export */ emscripten_glDrawRangeElements: _emscripten_glDrawRangeElements,
 /** @export */ emscripten_glEnable: _emscripten_glEnable,
 /** @export */ emscripten_glEnableVertexAttribArray: _emscripten_glEnableVertexAttribArray,
 /** @export */ emscripten_glEndQuery: _emscripten_glEndQuery,
 /** @export */ emscripten_glEndQueryEXT: _emscripten_glEndQueryEXT,
 /** @export */ emscripten_glEndTransformFeedback: _emscripten_glEndTransformFeedback,
 /** @export */ emscripten_glFenceSync: _emscripten_glFenceSync,
 /** @export */ emscripten_glFinish: _emscripten_glFinish,
 /** @export */ emscripten_glFlush: _emscripten_glFlush,
 /** @export */ emscripten_glFlushMappedBufferRange: _emscripten_glFlushMappedBufferRange,
 /** @export */ emscripten_glFramebufferRenderbuffer: _emscripten_glFramebufferRenderbuffer,
 /** @export */ emscripten_glFramebufferTexture2D: _emscripten_glFramebufferTexture2D,
 /** @export */ emscripten_glFramebufferTextureLayer: _emscripten_glFramebufferTextureLayer,
 /** @export */ emscripten_glFrontFace: _emscripten_glFrontFace,
 /** @export */ emscripten_glGenBuffers: _emscripten_glGenBuffers,
 /** @export */ emscripten_glGenFramebuffers: _emscripten_glGenFramebuffers,
 /** @export */ emscripten_glGenQueries: _emscripten_glGenQueries,
 /** @export */ emscripten_glGenQueriesEXT: _emscripten_glGenQueriesEXT,
 /** @export */ emscripten_glGenRenderbuffers: _emscripten_glGenRenderbuffers,
 /** @export */ emscripten_glGenSamplers: _emscripten_glGenSamplers,
 /** @export */ emscripten_glGenTextures: _emscripten_glGenTextures,
 /** @export */ emscripten_glGenTransformFeedbacks: _emscripten_glGenTransformFeedbacks,
 /** @export */ emscripten_glGenVertexArrays: _emscripten_glGenVertexArrays,
 /** @export */ emscripten_glGenerateMipmap: _emscripten_glGenerateMipmap,
 /** @export */ emscripten_glGetActiveAttrib: _emscripten_glGetActiveAttrib,
 /** @export */ emscripten_glGetActiveUniform: _emscripten_glGetActiveUniform,
 /** @export */ emscripten_glGetActiveUniformBlockName: _emscripten_glGetActiveUniformBlockName,
 /** @export */ emscripten_glGetActiveUniformBlockiv: _emscripten_glGetActiveUniformBlockiv,
 /** @export */ emscripten_glGetActiveUniformsiv: _emscripten_glGetActiveUniformsiv,
 /** @export */ emscripten_glGetAttachedShaders: _emscripten_glGetAttachedShaders,
 /** @export */ emscripten_glGetAttribLocation: _emscripten_glGetAttribLocation,
 /** @export */ emscripten_glGetBooleanv: _emscripten_glGetBooleanv,
 /** @export */ emscripten_glGetBufferParameteri64v: _emscripten_glGetBufferParameteri64v,
 /** @export */ emscripten_glGetBufferParameteriv: _emscripten_glGetBufferParameteriv,
 /** @export */ emscripten_glGetBufferPointerv: _emscripten_glGetBufferPointerv,
 /** @export */ emscripten_glGetError: _emscripten_glGetError,
 /** @export */ emscripten_glGetFloatv: _emscripten_glGetFloatv,
 /** @export */ emscripten_glGetFragDataLocation: _emscripten_glGetFragDataLocation,
 /** @export */ emscripten_glGetFramebufferAttachmentParameteriv: _emscripten_glGetFramebufferAttachmentParameteriv,
 /** @export */ emscripten_glGetInteger64i_v: _emscripten_glGetInteger64i_v,
 /** @export */ emscripten_glGetInteger64v: _emscripten_glGetInteger64v,
 /** @export */ emscripten_glGetIntegeri_v: _emscripten_glGetIntegeri_v,
 /** @export */ emscripten_glGetIntegerv: _emscripten_glGetIntegerv,
 /** @export */ emscripten_glGetInternalformativ: _emscripten_glGetInternalformativ,
 /** @export */ emscripten_glGetProgramBinary: _emscripten_glGetProgramBinary,
 /** @export */ emscripten_glGetProgramInfoLog: _emscripten_glGetProgramInfoLog,
 /** @export */ emscripten_glGetProgramiv: _emscripten_glGetProgramiv,
 /** @export */ emscripten_glGetQueryObjecti64vEXT: _emscripten_glGetQueryObjecti64vEXT,
 /** @export */ emscripten_glGetQueryObjectivEXT: _emscripten_glGetQueryObjectivEXT,
 /** @export */ emscripten_glGetQueryObjectui64vEXT: _emscripten_glGetQueryObjectui64vEXT,
 /** @export */ emscripten_glGetQueryObjectuiv: _emscripten_glGetQueryObjectuiv,
 /** @export */ emscripten_glGetQueryObjectuivEXT: _emscripten_glGetQueryObjectuivEXT,
 /** @export */ emscripten_glGetQueryiv: _emscripten_glGetQueryiv,
 /** @export */ emscripten_glGetQueryivEXT: _emscripten_glGetQueryivEXT,
 /** @export */ emscripten_glGetRenderbufferParameteriv: _emscripten_glGetRenderbufferParameteriv,
 /** @export */ emscripten_glGetSamplerParameterfv: _emscripten_glGetSamplerParameterfv,
 /** @export */ emscripten_glGetSamplerParameteriv: _emscripten_glGetSamplerParameteriv,
 /** @export */ emscripten_glGetShaderInfoLog: _emscripten_glGetShaderInfoLog,
 /** @export */ emscripten_glGetShaderPrecisionFormat: _emscripten_glGetShaderPrecisionFormat,
 /** @export */ emscripten_glGetShaderSource: _emscripten_glGetShaderSource,
 /** @export */ emscripten_glGetShaderiv: _emscripten_glGetShaderiv,
 /** @export */ emscripten_glGetString: _emscripten_glGetString,
 /** @export */ emscripten_glGetStringi: _emscripten_glGetStringi,
 /** @export */ emscripten_glGetSynciv: _emscripten_glGetSynciv,
 /** @export */ emscripten_glGetTexParameterfv: _emscripten_glGetTexParameterfv,
 /** @export */ emscripten_glGetTexParameteriv: _emscripten_glGetTexParameteriv,
 /** @export */ emscripten_glGetTransformFeedbackVarying: _emscripten_glGetTransformFeedbackVarying,
 /** @export */ emscripten_glGetUniformBlockIndex: _emscripten_glGetUniformBlockIndex,
 /** @export */ emscripten_glGetUniformIndices: _emscripten_glGetUniformIndices,
 /** @export */ emscripten_glGetUniformLocation: _emscripten_glGetUniformLocation,
 /** @export */ emscripten_glGetUniformfv: _emscripten_glGetUniformfv,
 /** @export */ emscripten_glGetUniformiv: _emscripten_glGetUniformiv,
 /** @export */ emscripten_glGetUniformuiv: _emscripten_glGetUniformuiv,
 /** @export */ emscripten_glGetVertexAttribIiv: _emscripten_glGetVertexAttribIiv,
 /** @export */ emscripten_glGetVertexAttribIuiv: _emscripten_glGetVertexAttribIuiv,
 /** @export */ emscripten_glGetVertexAttribPointerv: _emscripten_glGetVertexAttribPointerv,
 /** @export */ emscripten_glGetVertexAttribfv: _emscripten_glGetVertexAttribfv,
 /** @export */ emscripten_glGetVertexAttribiv: _emscripten_glGetVertexAttribiv,
 /** @export */ emscripten_glHint: _emscripten_glHint,
 /** @export */ emscripten_glInvalidateFramebuffer: _emscripten_glInvalidateFramebuffer,
 /** @export */ emscripten_glInvalidateSubFramebuffer: _emscripten_glInvalidateSubFramebuffer,
 /** @export */ emscripten_glIsBuffer: _emscripten_glIsBuffer,
 /** @export */ emscripten_glIsEnabled: _emscripten_glIsEnabled,
 /** @export */ emscripten_glIsFramebuffer: _emscripten_glIsFramebuffer,
 /** @export */ emscripten_glIsProgram: _emscripten_glIsProgram,
 /** @export */ emscripten_glIsQuery: _emscripten_glIsQuery,
 /** @export */ emscripten_glIsQueryEXT: _emscripten_glIsQueryEXT,
 /** @export */ emscripten_glIsRenderbuffer: _emscripten_glIsRenderbuffer,
 /** @export */ emscripten_glIsSampler: _emscripten_glIsSampler,
 /** @export */ emscripten_glIsShader: _emscripten_glIsShader,
 /** @export */ emscripten_glIsSync: _emscripten_glIsSync,
 /** @export */ emscripten_glIsTexture: _emscripten_glIsTexture,
 /** @export */ emscripten_glIsTransformFeedback: _emscripten_glIsTransformFeedback,
 /** @export */ emscripten_glIsVertexArray: _emscripten_glIsVertexArray,
 /** @export */ emscripten_glLineWidth: _emscripten_glLineWidth,
 /** @export */ emscripten_glLinkProgram: _emscripten_glLinkProgram,
 /** @export */ emscripten_glMapBufferRange: _emscripten_glMapBufferRange,
 /** @export */ emscripten_glPauseTransformFeedback: _emscripten_glPauseTransformFeedback,
 /** @export */ emscripten_glPixelStorei: _emscripten_glPixelStorei,
 /** @export */ emscripten_glPolygonOffset: _emscripten_glPolygonOffset,
 /** @export */ emscripten_glProgramBinary: _emscripten_glProgramBinary,
 /** @export */ emscripten_glProgramParameteri: _emscripten_glProgramParameteri,
 /** @export */ emscripten_glQueryCounterEXT: _emscripten_glQueryCounterEXT,
 /** @export */ emscripten_glReadBuffer: _emscripten_glReadBuffer,
 /** @export */ emscripten_glReadPixels: _emscripten_glReadPixels,
 /** @export */ emscripten_glReleaseShaderCompiler: _emscripten_glReleaseShaderCompiler,
 /** @export */ emscripten_glRenderbufferStorage: _emscripten_glRenderbufferStorage,
 /** @export */ emscripten_glRenderbufferStorageMultisample: _emscripten_glRenderbufferStorageMultisample,
 /** @export */ emscripten_glResumeTransformFeedback: _emscripten_glResumeTransformFeedback,
 /** @export */ emscripten_glSampleCoverage: _emscripten_glSampleCoverage,
 /** @export */ emscripten_glSamplerParameterf: _emscripten_glSamplerParameterf,
 /** @export */ emscripten_glSamplerParameterfv: _emscripten_glSamplerParameterfv,
 /** @export */ emscripten_glSamplerParameteri: _emscripten_glSamplerParameteri,
 /** @export */ emscripten_glSamplerParameteriv: _emscripten_glSamplerParameteriv,
 /** @export */ emscripten_glScissor: _emscripten_glScissor,
 /** @export */ emscripten_glShaderBinary: _emscripten_glShaderBinary,
 /** @export */ emscripten_glShaderSource: _emscripten_glShaderSource,
 /** @export */ emscripten_glStencilFunc: _emscripten_glStencilFunc,
 /** @export */ emscripten_glStencilFuncSeparate: _emscripten_glStencilFuncSeparate,
 /** @export */ emscripten_glStencilMask: _emscripten_glStencilMask,
 /** @export */ emscripten_glStencilMaskSeparate: _emscripten_glStencilMaskSeparate,
 /** @export */ emscripten_glStencilOp: _emscripten_glStencilOp,
 /** @export */ emscripten_glStencilOpSeparate: _emscripten_glStencilOpSeparate,
 /** @export */ emscripten_glTexImage2D: _emscripten_glTexImage2D,
 /** @export */ emscripten_glTexImage3D: _emscripten_glTexImage3D,
 /** @export */ emscripten_glTexParameterf: _emscripten_glTexParameterf,
 /** @export */ emscripten_glTexParameterfv: _emscripten_glTexParameterfv,
 /** @export */ emscripten_glTexParameteri: _emscripten_glTexParameteri,
 /** @export */ emscripten_glTexParameteriv: _emscripten_glTexParameteriv,
 /** @export */ emscripten_glTexStorage2D: _emscripten_glTexStorage2D,
 /** @export */ emscripten_glTexStorage3D: _emscripten_glTexStorage3D,
 /** @export */ emscripten_glTexSubImage2D: _emscripten_glTexSubImage2D,
 /** @export */ emscripten_glTexSubImage3D: _emscripten_glTexSubImage3D,
 /** @export */ emscripten_glTransformFeedbackVaryings: _emscripten_glTransformFeedbackVaryings,
 /** @export */ emscripten_glUniform1f: _emscripten_glUniform1f,
 /** @export */ emscripten_glUniform1fv: _emscripten_glUniform1fv,
 /** @export */ emscripten_glUniform1i: _emscripten_glUniform1i,
 /** @export */ emscripten_glUniform1iv: _emscripten_glUniform1iv,
 /** @export */ emscripten_glUniform1ui: _emscripten_glUniform1ui,
 /** @export */ emscripten_glUniform1uiv: _emscripten_glUniform1uiv,
 /** @export */ emscripten_glUniform2f: _emscripten_glUniform2f,
 /** @export */ emscripten_glUniform2fv: _emscripten_glUniform2fv,
 /** @export */ emscripten_glUniform2i: _emscripten_glUniform2i,
 /** @export */ emscripten_glUniform2iv: _emscripten_glUniform2iv,
 /** @export */ emscripten_glUniform2ui: _emscripten_glUniform2ui,
 /** @export */ emscripten_glUniform2uiv: _emscripten_glUniform2uiv,
 /** @export */ emscripten_glUniform3f: _emscripten_glUniform3f,
 /** @export */ emscripten_glUniform3fv: _emscripten_glUniform3fv,
 /** @export */ emscripten_glUniform3i: _emscripten_glUniform3i,
 /** @export */ emscripten_glUniform3iv: _emscripten_glUniform3iv,
 /** @export */ emscripten_glUniform3ui: _emscripten_glUniform3ui,
 /** @export */ emscripten_glUniform3uiv: _emscripten_glUniform3uiv,
 /** @export */ emscripten_glUniform4f: _emscripten_glUniform4f,
 /** @export */ emscripten_glUniform4fv: _emscripten_glUniform4fv,
 /** @export */ emscripten_glUniform4i: _emscripten_glUniform4i,
 /** @export */ emscripten_glUniform4iv: _emscripten_glUniform4iv,
 /** @export */ emscripten_glUniform4ui: _emscripten_glUniform4ui,
 /** @export */ emscripten_glUniform4uiv: _emscripten_glUniform4uiv,
 /** @export */ emscripten_glUniformBlockBinding: _emscripten_glUniformBlockBinding,
 /** @export */ emscripten_glUniformMatrix2fv: _emscripten_glUniformMatrix2fv,
 /** @export */ emscripten_glUniformMatrix2x3fv: _emscripten_glUniformMatrix2x3fv,
 /** @export */ emscripten_glUniformMatrix2x4fv: _emscripten_glUniformMatrix2x4fv,
 /** @export */ emscripten_glUniformMatrix3fv: _emscripten_glUniformMatrix3fv,
 /** @export */ emscripten_glUniformMatrix3x2fv: _emscripten_glUniformMatrix3x2fv,
 /** @export */ emscripten_glUniformMatrix3x4fv: _emscripten_glUniformMatrix3x4fv,
 /** @export */ emscripten_glUniformMatrix4fv: _emscripten_glUniformMatrix4fv,
 /** @export */ emscripten_glUniformMatrix4x2fv: _emscripten_glUniformMatrix4x2fv,
 /** @export */ emscripten_glUniformMatrix4x3fv: _emscripten_glUniformMatrix4x3fv,
 /** @export */ emscripten_glUnmapBuffer: _emscripten_glUnmapBuffer,
 /** @export */ emscripten_glUseProgram: _emscripten_glUseProgram,
 /** @export */ emscripten_glValidateProgram: _emscripten_glValidateProgram,
 /** @export */ emscripten_glVertexAttrib1f: _emscripten_glVertexAttrib1f,
 /** @export */ emscripten_glVertexAttrib1fv: _emscripten_glVertexAttrib1fv,
 /** @export */ emscripten_glVertexAttrib2f: _emscripten_glVertexAttrib2f,
 /** @export */ emscripten_glVertexAttrib2fv: _emscripten_glVertexAttrib2fv,
 /** @export */ emscripten_glVertexAttrib3f: _emscripten_glVertexAttrib3f,
 /** @export */ emscripten_glVertexAttrib3fv: _emscripten_glVertexAttrib3fv,
 /** @export */ emscripten_glVertexAttrib4f: _emscripten_glVertexAttrib4f,
 /** @export */ emscripten_glVertexAttrib4fv: _emscripten_glVertexAttrib4fv,
 /** @export */ emscripten_glVertexAttribDivisor: _emscripten_glVertexAttribDivisor,
 /** @export */ emscripten_glVertexAttribI4i: _emscripten_glVertexAttribI4i,
 /** @export */ emscripten_glVertexAttribI4iv: _emscripten_glVertexAttribI4iv,
 /** @export */ emscripten_glVertexAttribI4ui: _emscripten_glVertexAttribI4ui,
 /** @export */ emscripten_glVertexAttribI4uiv: _emscripten_glVertexAttribI4uiv,
 /** @export */ emscripten_glVertexAttribIPointer: _emscripten_glVertexAttribIPointer,
 /** @export */ emscripten_glVertexAttribPointer: _emscripten_glVertexAttribPointer,
 /** @export */ emscripten_glViewport: _emscripten_glViewport,
 /** @export */ emscripten_glWaitSync: _emscripten_glWaitSync,
 /** @export */ emscripten_num_logical_cores: _emscripten_num_logical_cores,
 /** @export */ emscripten_pc_get_function: _emscripten_pc_get_function,
 /** @export */ emscripten_resize_heap: _emscripten_resize_heap,
 /** @export */ emscripten_return_address: _emscripten_return_address,
 /** @export */ emscripten_runtime_keepalive_check: _emscripten_runtime_keepalive_check,
 /** @export */ emscripten_set_canvas_element_size: _emscripten_set_canvas_element_size,
 /** @export */ emscripten_stack_snapshot: _emscripten_stack_snapshot,
 /** @export */ emscripten_stack_unwind_buffer: _emscripten_stack_unwind_buffer,
 /** @export */ emscripten_supports_offscreencanvas: _emscripten_supports_offscreencanvas,
 /** @export */ emscripten_webgl_destroy_context: _emscripten_webgl_destroy_context,
 /** @export */ emscripten_webgl_do_create_context: _emscripten_webgl_do_create_context,
 /** @export */ emscripten_webgl_make_context_current_calling_thread: _emscripten_webgl_make_context_current_calling_thread,
 /** @export */ environ_get: _environ_get,
 /** @export */ environ_sizes_get: _environ_sizes_get,
 /** @export */ exit: _exit,
 /** @export */ fd_close: _fd_close,
 /** @export */ fd_fdstat_get: _fd_fdstat_get,
 /** @export */ fd_pread: _fd_pread,
 /** @export */ fd_pwrite: _fd_pwrite,
 /** @export */ fd_read: _fd_read,
 /** @export */ fd_seek: _fd_seek,
 /** @export */ fd_sync: _fd_sync,
 /** @export */ fd_write: _fd_write,
 /** @export */ getentropy: _getentropy,
 /** @export */ invoke_i: invoke_i,
 /** @export */ invoke_ii: invoke_ii,
 /** @export */ invoke_iii: invoke_iii,
 /** @export */ invoke_iiii: invoke_iiii,
 /** @export */ invoke_iiiii: invoke_iiiii,
 /** @export */ invoke_iiiiii: invoke_iiiiii,
 /** @export */ invoke_iiiiiii: invoke_iiiiiii,
 /** @export */ invoke_iiiiiiiii: invoke_iiiiiiiii,
 /** @export */ invoke_iiiiiiiiii: invoke_iiiiiiiiii,
 /** @export */ invoke_iiiiiiiiiiiiii: invoke_iiiiiiiiiiiiii,
 /** @export */ invoke_iiiijj: invoke_iiiijj,
 /** @export */ invoke_v: invoke_v,
 /** @export */ invoke_vi: invoke_vi,
 /** @export */ invoke_vii: invoke_vii,
 /** @export */ invoke_viii: invoke_viii,
 /** @export */ invoke_viiid: invoke_viiid,
 /** @export */ invoke_viiii: invoke_viiii,
 /** @export */ invoke_viiiii: invoke_viiiii,
 /** @export */ invoke_viiiiii: invoke_viiiiii,
 /** @export */ invoke_viiiiiii: invoke_viiiiiii,
 /** @export */ invoke_viiiiiiii: invoke_viiiiiiii,
 /** @export */ invoke_viiiiiiiii: invoke_viiiiiiiii,
 /** @export */ invoke_viiiiiiiiiii: invoke_viiiiiiiiiii,
 /** @export */ invoke_viiiiiiiiiiiii: invoke_viiiiiiiiiiiii,
 /** @export */ invoke_viiiiiiiiiiiiiii: invoke_viiiiiiiiiiiiiii,
 /** @export */ memory: wasmMemory || Module["wasmMemory"],
 /** @export */ proc_exit: _proc_exit,
 /** @export */ sendfile: _sendfile,
 /** @export */ strftime: _strftime,
 /** @export */ strftime_l: _strftime_l,
 /** @export */ wasmhost_call: _wasmhost_call,
 /** @export */ wasmhost_compile: _wasmhost_compile,
 /** @export */ wasmhost_export_count: _wasmhost_export_count,
 /** @export */ wasmhost_export_kind: _wasmhost_export_kind,
 /** @export */ wasmhost_export_name: _wasmhost_export_name,
 /** @export */ wasmhost_export_register_mem: _wasmhost_export_register_mem,
 /** @export */ wasmhost_global_new: _wasmhost_global_new,
 /** @export */ wasmhost_guest_mem_objid: _wasmhost_guest_mem_objid,
 /** @export */ wasmhost_guest_mem_shared: _wasmhost_guest_mem_shared,
 /** @export */ wasmhost_import_count: _wasmhost_import_count,
 /** @export */ wasmhost_import_kind: _wasmhost_import_kind,
 /** @export */ wasmhost_import_module: _wasmhost_import_module,
 /** @export */ wasmhost_import_name: _wasmhost_import_name,
 /** @export */ wasmhost_instantiate: _wasmhost_instantiate,
 /** @export */ wasmhost_jit_table: _wasmhost_jit_table,
 /** @export */ wasmhost_jit_table_set: _wasmhost_jit_table_set,
 /** @export */ wasmhost_mem_bytelength: _wasmhost_mem_bytelength,
 /** @export */ wasmhost_mem_is_shared: _wasmhost_mem_is_shared,
 /** @export */ wasmhost_mem_new: _wasmhost_mem_new,
 /** @export */ wasmhost_obj_set_mirror: _wasmhost_obj_set_mirror,
 /** @export */ wasmhost_table_new: _wasmhost_table_new
};

var wasmExports = createWasm();

var ___wasm_call_ctors = createExportWrapper("__wasm_call_ctors");

var _free = Module["_free"] = createExportWrapper("free");

var _xul_init = Module["_xul_init"] = createExportWrapper("xul_init");

var _fflush = createExportWrapper("fflush");

var _xul_cmd_ptr = Module["_xul_cmd_ptr"] = createExportWrapper("xul_cmd_ptr");

var _wisp_wakeword = Module["_wisp_wakeword"] = createExportWrapper("wisp_wakeword");

var _main = Module["_main"] = createExportWrapper("main");

var _malloc = Module["_malloc"] = createExportWrapper("malloc");

var _ntohs = createExportWrapper("ntohs");

var _htons = createExportWrapper("htons");

var _htonl = createExportWrapper("htonl");

var _WasmXPTCStubDispatch = Module["_WasmXPTCStubDispatch"] = createExportWrapper("WasmXPTCStubDispatch");

var _pthread_self = Module["_pthread_self"] = () => (_pthread_self = Module["_pthread_self"] = wasmExports["pthread_self"])();

var _WJTraceRoots = Module["_WJTraceRoots"] = createExportWrapper("WJTraceRoots");

var _emscripten_stack_get_base = () => (_emscripten_stack_get_base = wasmExports["emscripten_stack_get_base"])();

var _wjhelp = Module["_wjhelp"] = createExportWrapper("wjhelp");

var _wasmjit_invoke = Module["_wasmjit_invoke"] = createExportWrapper("wasmjit_invoke");

var _wasmhost_invoke_import = Module["_wasmhost_invoke_import"] = createExportWrapper("wasmhost_invoke_import");

var __emscripten_tls_init = Module["__emscripten_tls_init"] = createExportWrapper("_emscripten_tls_init");

var _emscripten_builtin_memalign = createExportWrapper("emscripten_builtin_memalign");

var __emscripten_proxy_main = Module["__emscripten_proxy_main"] = createExportWrapper("_emscripten_proxy_main");

var _emscripten_stack_get_end = () => (_emscripten_stack_get_end = wasmExports["emscripten_stack_get_end"])();

var __emscripten_run_callback_on_thread = createExportWrapper("_emscripten_run_callback_on_thread");

var __emscripten_set_offscreencanvas_size_on_thread = createExportWrapper("_emscripten_set_offscreencanvas_size_on_thread");

var __emscripten_thread_init = Module["__emscripten_thread_init"] = createExportWrapper("_emscripten_thread_init");

var __emscripten_thread_crashed = Module["__emscripten_thread_crashed"] = createExportWrapper("_emscripten_thread_crashed");

var _emscripten_main_thread_process_queued_calls = createExportWrapper("emscripten_main_thread_process_queued_calls");

var _emscripten_main_runtime_thread_id = createExportWrapper("emscripten_main_runtime_thread_id");

var __emscripten_run_on_main_thread_js = createExportWrapper("_emscripten_run_on_main_thread_js");

var __emscripten_thread_free_data = createExportWrapper("_emscripten_thread_free_data");

var __emscripten_thread_exit = Module["__emscripten_thread_exit"] = createExportWrapper("_emscripten_thread_exit");

var __emscripten_check_mailbox = createExportWrapper("_emscripten_check_mailbox");

var _setThrew = createExportWrapper("setThrew");

var _emscripten_stack_init = () => (_emscripten_stack_init = wasmExports["emscripten_stack_init"])();

var _emscripten_stack_set_limits = (a0, a1) => (_emscripten_stack_set_limits = wasmExports["emscripten_stack_set_limits"])(a0, a1);

var _emscripten_stack_get_free = () => (_emscripten_stack_get_free = wasmExports["emscripten_stack_get_free"])();

var stackSave = createExportWrapper("stackSave");

var stackRestore = createExportWrapper("stackRestore");

var stackAlloc = createExportWrapper("stackAlloc");

var _emscripten_stack_get_current = () => (_emscripten_stack_get_current = wasmExports["emscripten_stack_get_current"])();

var _gNoteToolkitBuildID = Module["_gNoteToolkitBuildID"] = 51398952;

var ___start_em_js = Module["___start_em_js"] = 51398988;

var ___stop_em_js = Module["___stop_em_js"] = 51400188;

function invoke_viiii(index, a1, a2, a3, a4) {
 var sp = stackSave();
 try {
  getWasmTableEntry(index)(a1, a2, a3, a4);
 } catch (e) {
  stackRestore(sp);
  if (e !== e + 0) throw e;
  _setThrew(1, 0);
 }
}

function invoke_iii(index, a1, a2) {
 var sp = stackSave();
 try {
  return getWasmTableEntry(index)(a1, a2);
 } catch (e) {
  stackRestore(sp);
  if (e !== e + 0) throw e;
  _setThrew(1, 0);
 }
}

function invoke_vii(index, a1, a2) {
 var sp = stackSave();
 try {
  getWasmTableEntry(index)(a1, a2);
 } catch (e) {
  stackRestore(sp);
  if (e !== e + 0) throw e;
  _setThrew(1, 0);
 }
}

function invoke_vi(index, a1) {
 var sp = stackSave();
 try {
  getWasmTableEntry(index)(a1);
 } catch (e) {
  stackRestore(sp);
  if (e !== e + 0) throw e;
  _setThrew(1, 0);
 }
}

function invoke_ii(index, a1) {
 var sp = stackSave();
 try {
  return getWasmTableEntry(index)(a1);
 } catch (e) {
  stackRestore(sp);
  if (e !== e + 0) throw e;
  _setThrew(1, 0);
 }
}

function invoke_iiiii(index, a1, a2, a3, a4) {
 var sp = stackSave();
 try {
  return getWasmTableEntry(index)(a1, a2, a3, a4);
 } catch (e) {
  stackRestore(sp);
  if (e !== e + 0) throw e;
  _setThrew(1, 0);
 }
}

function invoke_iiii(index, a1, a2, a3) {
 var sp = stackSave();
 try {
  return getWasmTableEntry(index)(a1, a2, a3);
 } catch (e) {
  stackRestore(sp);
  if (e !== e + 0) throw e;
  _setThrew(1, 0);
 }
}

function invoke_viii(index, a1, a2, a3) {
 var sp = stackSave();
 try {
  getWasmTableEntry(index)(a1, a2, a3);
 } catch (e) {
  stackRestore(sp);
  if (e !== e + 0) throw e;
  _setThrew(1, 0);
 }
}

function invoke_i(index) {
 var sp = stackSave();
 try {
  return getWasmTableEntry(index)();
 } catch (e) {
  stackRestore(sp);
  if (e !== e + 0) throw e;
  _setThrew(1, 0);
 }
}

function invoke_iiiiii(index, a1, a2, a3, a4, a5) {
 var sp = stackSave();
 try {
  return getWasmTableEntry(index)(a1, a2, a3, a4, a5);
 } catch (e) {
  stackRestore(sp);
  if (e !== e + 0) throw e;
  _setThrew(1, 0);
 }
}

function invoke_viiiii(index, a1, a2, a3, a4, a5) {
 var sp = stackSave();
 try {
  getWasmTableEntry(index)(a1, a2, a3, a4, a5);
 } catch (e) {
  stackRestore(sp);
  if (e !== e + 0) throw e;
  _setThrew(1, 0);
 }
}

function invoke_viiiiiiiii(index, a1, a2, a3, a4, a5, a6, a7, a8, a9) {
 var sp = stackSave();
 try {
  getWasmTableEntry(index)(a1, a2, a3, a4, a5, a6, a7, a8, a9);
 } catch (e) {
  stackRestore(sp);
  if (e !== e + 0) throw e;
  _setThrew(1, 0);
 }
}

function invoke_iiiiiiiiii(index, a1, a2, a3, a4, a5, a6, a7, a8, a9) {
 var sp = stackSave();
 try {
  return getWasmTableEntry(index)(a1, a2, a3, a4, a5, a6, a7, a8, a9);
 } catch (e) {
  stackRestore(sp);
  if (e !== e + 0) throw e;
  _setThrew(1, 0);
 }
}

function invoke_iiiiiiiiiiiiii(index, a1, a2, a3, a4, a5, a6, a7, a8, a9, a10, a11, a12, a13) {
 var sp = stackSave();
 try {
  return getWasmTableEntry(index)(a1, a2, a3, a4, a5, a6, a7, a8, a9, a10, a11, a12, a13);
 } catch (e) {
  stackRestore(sp);
  if (e !== e + 0) throw e;
  _setThrew(1, 0);
 }
}

function invoke_viiiiii(index, a1, a2, a3, a4, a5, a6) {
 var sp = stackSave();
 try {
  getWasmTableEntry(index)(a1, a2, a3, a4, a5, a6);
 } catch (e) {
  stackRestore(sp);
  if (e !== e + 0) throw e;
  _setThrew(1, 0);
 }
}

function invoke_viiiiiiiiiii(index, a1, a2, a3, a4, a5, a6, a7, a8, a9, a10, a11) {
 var sp = stackSave();
 try {
  getWasmTableEntry(index)(a1, a2, a3, a4, a5, a6, a7, a8, a9, a10, a11);
 } catch (e) {
  stackRestore(sp);
  if (e !== e + 0) throw e;
  _setThrew(1, 0);
 }
}

function invoke_iiiiiii(index, a1, a2, a3, a4, a5, a6) {
 var sp = stackSave();
 try {
  return getWasmTableEntry(index)(a1, a2, a3, a4, a5, a6);
 } catch (e) {
  stackRestore(sp);
  if (e !== e + 0) throw e;
  _setThrew(1, 0);
 }
}

function invoke_viiid(index, a1, a2, a3, a4) {
 var sp = stackSave();
 try {
  getWasmTableEntry(index)(a1, a2, a3, a4);
 } catch (e) {
  stackRestore(sp);
  if (e !== e + 0) throw e;
  _setThrew(1, 0);
 }
}

function invoke_iiiijj(index, a1, a2, a3, a4, a5) {
 var sp = stackSave();
 try {
  return getWasmTableEntry(index)(a1, a2, a3, a4, a5);
 } catch (e) {
  stackRestore(sp);
  if (e !== e + 0) throw e;
  _setThrew(1, 0);
 }
}

function invoke_iiiiiiiii(index, a1, a2, a3, a4, a5, a6, a7, a8) {
 var sp = stackSave();
 try {
  return getWasmTableEntry(index)(a1, a2, a3, a4, a5, a6, a7, a8);
 } catch (e) {
  stackRestore(sp);
  if (e !== e + 0) throw e;
  _setThrew(1, 0);
 }
}

function invoke_viiiiiiii(index, a1, a2, a3, a4, a5, a6, a7, a8) {
 var sp = stackSave();
 try {
  getWasmTableEntry(index)(a1, a2, a3, a4, a5, a6, a7, a8);
 } catch (e) {
  stackRestore(sp);
  if (e !== e + 0) throw e;
  _setThrew(1, 0);
 }
}

function invoke_viiiiiiiiiiiii(index, a1, a2, a3, a4, a5, a6, a7, a8, a9, a10, a11, a12, a13) {
 var sp = stackSave();
 try {
  getWasmTableEntry(index)(a1, a2, a3, a4, a5, a6, a7, a8, a9, a10, a11, a12, a13);
 } catch (e) {
  stackRestore(sp);
  if (e !== e + 0) throw e;
  _setThrew(1, 0);
 }
}

function invoke_viiiiiiiiiiiiiii(index, a1, a2, a3, a4, a5, a6, a7, a8, a9, a10, a11, a12, a13, a14, a15) {
 var sp = stackSave();
 try {
  getWasmTableEntry(index)(a1, a2, a3, a4, a5, a6, a7, a8, a9, a10, a11, a12, a13, a14, a15);
 } catch (e) {
  stackRestore(sp);
  if (e !== e + 0) throw e;
  _setThrew(1, 0);
 }
}

function invoke_viiiiiii(index, a1, a2, a3, a4, a5, a6, a7) {
 var sp = stackSave();
 try {
  getWasmTableEntry(index)(a1, a2, a3, a4, a5, a6, a7);
 } catch (e) {
  stackRestore(sp);
  if (e !== e + 0) throw e;
  _setThrew(1, 0);
 }
}

function invoke_v(index) {
 var sp = stackSave();
 try {
  getWasmTableEntry(index)();
 } catch (e) {
  stackRestore(sp);
  if (e !== e + 0) throw e;
  _setThrew(1, 0);
 }
}

function applySignatureConversions(wasmExports) {
 wasmExports = Object.assign({}, wasmExports);
 var makeWrapper_pp = f => a0 => f(a0) >>> 0;
 var makeWrapper_p = f => () => f() >>> 0;
 var makeWrapper_ppp = f => (a0, a1) => f(a0, a1) >>> 0;
 wasmExports["malloc"] = makeWrapper_pp(wasmExports["malloc"]);
 wasmExports["pthread_self"] = makeWrapper_p(wasmExports["pthread_self"]);
 wasmExports["emscripten_stack_get_base"] = makeWrapper_p(wasmExports["emscripten_stack_get_base"]);
 wasmExports["emscripten_builtin_memalign"] = makeWrapper_ppp(wasmExports["emscripten_builtin_memalign"]);
 wasmExports["emscripten_stack_get_end"] = makeWrapper_p(wasmExports["emscripten_stack_get_end"]);
 wasmExports["emscripten_main_runtime_thread_id"] = makeWrapper_p(wasmExports["emscripten_main_runtime_thread_id"]);
 wasmExports["stackSave"] = makeWrapper_p(wasmExports["stackSave"]);
 wasmExports["stackAlloc"] = makeWrapper_pp(wasmExports["stackAlloc"]);
 wasmExports["emscripten_stack_get_current"] = makeWrapper_p(wasmExports["emscripten_stack_get_current"]);
 return wasmExports;
}

Module["addRunDependency"] = addRunDependency;

Module["removeRunDependency"] = removeRunDependency;

Module["FS_createPath"] = FS.createPath;

Module["FS_createLazyFile"] = FS.createLazyFile;

Module["FS_createDevice"] = FS.createDevice;

Module["wasmMemory"] = wasmMemory;

Module["ENV"] = ENV;

Module["keepRuntimeAlive"] = keepRuntimeAlive;

Module["ccall"] = ccall;

Module["cwrap"] = cwrap;

Module["addFunction"] = addFunction;

Module["removeFunction"] = removeFunction;

Module["ExitStatus"] = ExitStatus;

Module["FS_createPreloadedFile"] = FS.createPreloadedFile;

Module["FS"] = FS;

Module["FS_createDataFile"] = FS.createDataFile;

Module["FS_unlink"] = FS.unlink;

Module["PThread"] = PThread;

var missingLibrarySymbols = [ "writeI53ToI64Clamped", "writeI53ToI64Signaling", "writeI53ToU64Clamped", "writeI53ToU64Signaling", "convertI32PairToI53", "convertI32PairToI53Checked", "convertU32PairToI53", "emscriptenLog", "convertPCtoSourceLocation", "listenOnce", "autoResumeAudioContext", "getDynCaller", "dynCall", "asmjsMangle", "HandleAllocator", "getNativeTypeSize", "STACK_SIZE", "STACK_ALIGN", "POINTER_SIZE", "ASSERTIONS", "reallyNegative", "unSign", "strLen", "reSign", "formatString", "intArrayToString", "AsciiToString", "UTF16ToString", "stringToUTF16", "lengthBytesUTF16", "UTF32ToString", "stringToUTF32", "lengthBytesUTF32", "registerKeyEventCallback", "getBoundingClientRect", "fillMouseEventData", "registerMouseEventCallback", "registerWheelEventCallback", "registerUiEventCallback", "registerFocusEventCallback", "fillDeviceOrientationEventData", "registerDeviceOrientationEventCallback", "fillDeviceMotionEventData", "registerDeviceMotionEventCallback", "screenOrientation", "fillOrientationChangeEventData", "registerOrientationChangeEventCallback", "fillFullscreenChangeEventData", "registerFullscreenChangeEventCallback", "JSEvents_requestFullscreen", "JSEvents_resizeCanvasForFullscreen", "registerRestoreOldStyle", "hideEverythingExceptGivenElement", "restoreHiddenElements", "setLetterbox", "softFullscreenResizeWebGLRenderTarget", "doRequestFullscreen", "fillPointerlockChangeEventData", "registerPointerlockChangeEventCallback", "registerPointerlockErrorEventCallback", "requestPointerLock", "fillVisibilityChangeEventData", "registerVisibilityChangeEventCallback", "registerTouchEventCallback", "fillGamepadEventData", "registerGamepadEventCallback", "registerBeforeUnloadEventCallback", "fillBatteryEventData", "battery", "registerBatteryEventCallback", "setCanvasElementSize", "getCanvasElementSize", "stackTrace", "checkWasiClock", "wasiRightsToMuslOFlags", "wasiOFlagsToMuslOFlags", "createDyncallWrapper", "safeSetTimeout", "setImmediateWrapped", "clearImmediateWrapped", "polyfillSetImmediate", "getPromise", "makePromise", "idsToPromises", "makePromiseCallback", "ExceptionInfo", "findMatchingCatch", "Browser_asyncPrepareDataCounter", "setMainLoop", "FS_mkdirTree", "_setNetworkCallback", "writeGLArray", "emscripten_webgl_destroy_context_before_on_calling_thread", "registerWebGlEventCallback", "runAndAbortIfError", "ALLOC_NORMAL", "ALLOC_STACK", "allocate", "writeStringToMemory", "writeAsciiToMemory", "setErrNo", "demangle" ];

missingLibrarySymbols.forEach(missingLibrarySymbol);

var unexportedSymbols = [ "run", "addOnPreRun", "addOnInit", "addOnPreMain", "addOnExit", "addOnPostRun", "FS_createFolder", "FS_createLink", "FS_readFile", "out", "err", "callMain", "abort", "wasmExports", "stackAlloc", "stackSave", "stackRestore", "getTempRet0", "setTempRet0", "GROWABLE_HEAP_I8", "GROWABLE_HEAP_U8", "GROWABLE_HEAP_I16", "GROWABLE_HEAP_U16", "GROWABLE_HEAP_I32", "GROWABLE_HEAP_U32", "GROWABLE_HEAP_F32", "GROWABLE_HEAP_F64", "writeStackCookie", "checkStackCookie", "writeI53ToI64", "readI53FromI64", "readI53FromU64", "MAX_INT53", "MIN_INT53", "bigintToI53Checked", "ptrToString", "zeroMemory", "exitJS", "getHeapMax", "growMemory", "MONTH_DAYS_REGULAR", "MONTH_DAYS_LEAP", "MONTH_DAYS_REGULAR_CUMULATIVE", "MONTH_DAYS_LEAP_CUMULATIVE", "isLeapYear", "ydayFromDate", "arraySum", "addDays", "ERRNO_CODES", "ERRNO_MESSAGES", "inetPton4", "inetNtop4", "inetPton6", "inetNtop6", "readSockaddr", "writeSockaddr", "DNS", "Protocols", "Sockets", "initRandomFill", "randomFill", "timers", "warnOnce", "getCallstack", "UNWIND_CACHE", "readEmAsmArgsArray", "readEmAsmArgs", "runEmAsmFunction", "runMainThreadEmAsm", "jstoi_q", "jstoi_s", "getExecutableName", "handleException", "runtimeKeepalivePush", "runtimeKeepalivePop", "callUserCallback", "maybeExit", "asyncLoad", "alignMemory", "mmapAlloc", "wasmTable", "noExitRuntime", "getCFunc", "uleb128Encode", "sigToWasmTypes", "generateFuncType", "convertJsFunctionToWasm", "freeTableIndexes", "functionsInTableMap", "getEmptyTableSlot", "updateTableMap", "getFunctionAddress", "setValue", "getValue", "PATH", "PATH_FS", "UTF8Decoder", "UTF8ArrayToString", "UTF8ToString", "stringToUTF8Array", "stringToUTF8", "lengthBytesUTF8", "intArrayFromString", "stringToAscii", "UTF16Decoder", "stringToNewUTF8", "stringToUTF8OnStack", "writeArrayToMemory", "JSEvents", "specialHTMLTargets", "maybeCStringToJsString", "findEventTarget", "findCanvasEventTarget", "currentFullscreenStrategy", "restoreOldWindowedStyle", "setCanvasElementSizeCallingThread", "setOffscreenCanvasSizeOnTargetThread", "setCanvasElementSizeMainThread", "getCanvasSizeCallingThread", "getCanvasSizeMainThread", "jsStackTrace", "getEnvStrings", "doReadv", "doWritev", "promiseMap", "uncaughtExceptionCount", "exceptionLast", "exceptionCaught", "Browser", "getPreloadedImageData__data", "wget", "SYSCALLS", "getSocketFromFD", "getSocketAddress", "preloadPlugins", "FS_modeStringToFlags", "FS_getMode", "FS_stdin_getChar_buffer", "FS_stdin_getChar", "MEMFS", "TTY", "PIPEFS", "SOCKFS", "tempFixedLengthArray", "miniTempWebGLFloatBuffers", "miniTempWebGLIntBuffers", "heapObjectForWebGLType", "toTypedArrayIndex", "webgl_enable_ANGLE_instanced_arrays", "webgl_enable_OES_vertex_array_object", "webgl_enable_WEBGL_draw_buffers", "webgl_enable_WEBGL_multi_draw", "GL", "emscriptenWebGLGet", "computeUnpackAlignedImageSize", "colorChannelsInGlTextureFormat", "emscriptenWebGLGetTexPixelData", "emscriptenWebGLGetUniform", "webglGetUniformLocation", "webglPrepareUniformLocationsBeforeFirstUse", "webglGetLeftBracePos", "emscriptenWebGLGetVertexAttrib", "__glGetActiveAttribOrUniform", "emscriptenWebGLGetBufferBinding", "emscriptenWebGLValidateMapBufferTarget", "AL", "GLUT", "EGL", "GLEW", "IDBStore", "SDL", "SDL_gfx", "emscriptenWebGLGetIndexed", "webgl_enable_WEBGL_draw_instanced_base_vertex_base_instance", "webgl_enable_WEBGL_multi_draw_instanced_base_vertex_base_instance", "allocateUTF8", "allocateUTF8OnStack", "terminateWorker", "killThread", "cleanupThread", "registerTLSInit", "cancelThread", "spawnThread", "exitOnMainThread", "proxyToMainThread", "proxiedJSCallArgs", "invokeEntryPoint", "checkMailbox", "IDBFS", "WISP_POLL_FALLBACK_MS", "whSyncMem" ];

unexportedSymbols.forEach(unexportedRuntimeSymbol);

var calledRun;

dependenciesFulfilled = function runCaller() {
 if (!calledRun) run();
 if (!calledRun) dependenciesFulfilled = runCaller;
};

function callMain() {
 assert(runDependencies == 0, 'cannot call main when async dependencies remain! (listen on Module["onRuntimeInitialized"])');
 assert(__ATPRERUN__.length == 0, "cannot call main when preRun functions remain to be called");
 var entryFunction = __emscripten_proxy_main;
 runtimeKeepalivePush();
 var argc = 0;
 var argv = 0;
 try {
  var ret = entryFunction(argc, argv);
  exitJS(ret, /* implicit = */ true);
  return ret;
 } catch (e) {
  return handleException(e);
 }
}

function stackCheckInit() {
 assert(!ENVIRONMENT_IS_PTHREAD);
 _emscripten_stack_init();
 writeStackCookie();
}

function run() {
 if (runDependencies > 0) {
  return;
 }
 if (!ENVIRONMENT_IS_PTHREAD) stackCheckInit();
 if (ENVIRONMENT_IS_PTHREAD) {
  readyPromiseResolve(Module);
  initRuntime();
  startWorker(Module);
  return;
 }
 preRun();
 if (runDependencies > 0) {
  return;
 }
 function doRun() {
  if (calledRun) return;
  calledRun = true;
  Module["calledRun"] = true;
  if (ABORT) return;
  initRuntime();
  preMain();
  readyPromiseResolve(Module);
  if (Module["onRuntimeInitialized"]) Module["onRuntimeInitialized"]();
  if (shouldRunNow) callMain();
  postRun();
 }
 if (Module["setStatus"]) {
  Module["setStatus"]("Running...");
  setTimeout(function() {
   setTimeout(function() {
    Module["setStatus"]("");
   }, 1);
   doRun();
  }, 1);
 } else {
  doRun();
 }
 checkStackCookie();
}

function checkUnflushedContent() {
 var oldOut = out;
 var oldErr = err;
 var has = false;
 out = err = x => {
  has = true;
 };
 try {
  _fflush(0);
  [ "stdout", "stderr" ].forEach(function(name) {
   var info = FS.analyzePath("/dev/" + name);
   if (!info) return;
   var stream = info.object;
   var rdev = stream.rdev;
   var tty = TTY.ttys[rdev];
   if (tty?.output?.length) {
    has = true;
   }
  });
 } catch (e) {}
 out = oldOut;
 err = oldErr;
 if (has) {
  warnOnce("stdio streams had content in them that was not flushed. you should set EXIT_RUNTIME to 1 (see the Emscripten FAQ), or make sure to emit a newline when you printf etc.");
 }
}

if (Module["preInit"]) {
 if (typeof Module["preInit"] == "function") Module["preInit"] = [ Module["preInit"] ];
 while (Module["preInit"].length > 0) {
  Module["preInit"].pop()();
 }
}

var shouldRunNow = true;

if (Module["noInitialRun"]) shouldRunNow = false;

run();


  return moduleArg.ready
}
);
})();
if (typeof exports === 'object' && typeof module === 'object')
  module.exports = createGecko;
else if (typeof define === 'function' && define['amd'])
  define([], () => createGecko);
`,U=`/**
 * @license
 * Copyright 2015 The Emscripten Authors
 * SPDX-License-Identifier: MIT
 */

// Pthread Web Worker startup routine:
// This is the entry point file that is loaded first by each Web Worker
// that executes pthreads on the Emscripten application.

'use strict';

var Module = {};

// Thread-local guard variable for one-time init of the JS state
var initializedJS = false;

function assert(condition, text) {
  if (!condition) abort('Assertion failed: ' + text);
}

function threadPrintErr(...args) {
  var text = args.join(' ');
  console.error(text);
}
function threadAlert(...args) {
  var text = args.join(' ');
  postMessage({cmd: 'alert', text, threadId: Module['_pthread_self']()});
}
// We don't need out() for now, but may need to add it if we want to use it
// here. Or, if this code all moves into the main JS, that problem will go
// away. (For now, adding it here increases code size for no benefit.)
var out = () => { throw 'out() is not defined in worker.js.'; }
var err = threadPrintErr;
self.alert = threadAlert;
var dbg = threadPrintErr;

Module['instantiateWasm'] = (info, receiveInstance) => {
  // Instantiate from the module posted from the main thread.
  // We can just use sync instantiation in the worker.
  var module = Module['wasmModule'];
  // We don't need the module anymore; new threads will be spawned from the main thread.
  Module['wasmModule'] = null;
  var instance = new WebAssembly.Instance(module, info);
  // TODO: Due to Closure regression https://github.com/google/closure-compiler/issues/3193,
  // the above line no longer optimizes out down to the following line.
  // When the regression is fixed, we can remove this if/else.
  return receiveInstance(instance);
}

// Turn unhandled rejected promises into errors so that the main thread will be
// notified about them.
self.onunhandledrejection = (e) => {
  throw e.reason || e;
};

function handleMessage(e) {
  try {
    if (e.data.cmd === 'load') { // Preload command that is called once per worker to parse and load the Emscripten code.

    // Until we initialize the runtime, queue up any further incoming messages.
    let messageQueue = [];
    self.onmessage = (e) => messageQueue.push(e);

    // And add a callback for when the runtime is initialized.
    self.startWorker = (instance) => {
      Module = instance;
      // Notify the main thread that this thread has loaded.
      postMessage({ 'cmd': 'loaded' });
      // Process any messages that were queued before the thread was ready.
      for (let msg of messageQueue) {
        handleMessage(msg);
      }
      // Restore the real message handler.
      self.onmessage = handleMessage;
    };

      // Module and memory were sent from main thread
      Module['wasmModule'] = e.data.wasmModule;

      // Use \`const\` here to ensure that the variable is scoped only to
      // that iteration, allowing safe reference from a closure.
      for (const handler of e.data.handlers) {
        Module[handler] = (...args) => {
          postMessage({ cmd: 'callHandler', handler, args: args });
        }
      }

      Module['wasmMemory'] = e.data.wasmMemory;

      Module['buffer'] = Module['wasmMemory'].buffer;

      Module['workerID'] = e.data.workerID;

      Module['ENVIRONMENT_IS_PTHREAD'] = true;

      if (typeof e.data.urlOrBlob == 'string') {
        importScripts(e.data.urlOrBlob);
      } else {
        var objectUrl = URL.createObjectURL(e.data.urlOrBlob);
        importScripts(objectUrl);
        URL.revokeObjectURL(objectUrl);
      }
      createGecko(Module);
    } else if (e.data.cmd === 'run') {
      // Pass the thread address to wasm to store it for fast access.
      Module['__emscripten_thread_init'](e.data.pthread_ptr, /*is_main=*/0, /*is_runtime=*/0, /*can_block=*/1);

      // Await mailbox notifications with \`Atomics.waitAsync\` so we can start
      // using the fast \`Atomics.notify\` notification path.
      Module['__emscripten_thread_mailbox_await'](e.data.pthread_ptr);

      assert(e.data.pthread_ptr);
      // Also call inside JS module to set up the stack frame for this pthread in JS module scope
      Module['establishStackSpace']();
      Module['PThread'].receiveObjectTransfer(e.data);
      Module['PThread'].threadInitTLS();

      if (!initializedJS) {
        initializedJS = true;
      }

      try {
        Module['invokeEntryPoint'](e.data.start_routine, e.data.arg);
      } catch(ex) {
        if (ex != 'unwind') {
          // The pthread "crashed".  Do not call \`_emscripten_thread_exit\` (which
          // would make this thread joinable).  Instead, re-throw the exception
          // and let the top level handler propagate it back to the main thread.
          throw ex;
        }
      }
    } else if (e.data.cmd === 'cancel') { // Main thread is asking for a pthread_cancel() on this thread.
      if (Module['_pthread_self']()) {
        Module['__emscripten_thread_exit'](-1);
      }
    } else if (e.data.target === 'setimmediate') {
      // no-op
    } else if (e.data.cmd === 'checkMailbox') {
      if (initializedJS) {
        Module['checkMailbox']();
      }
    } else if (e.data.cmd) {
      // The received message looks like something that should be handled by this message
      // handler, (since there is a e.data.cmd field present), but is not one of the
      // recognized commands:
      err(\`worker.js received unknown command \${e.data.cmd}\`);
      err(e.data);
    }
  } catch(ex) {
    err(\`worker.js onmessage() captured an uncaught exception: \${ex}\`);
    if (ex?.stack) err(ex.stack);
    Module['__emscripten_thread_crashed']?.();
    throw ex;
  }
};

self.onmessage = handleMessage;
`,L=0,D=4,W=8,P=12,T=16,b=20,d=b+8192,z=d+4,H=d+8,V=d+12,Y=d+16,q=d+20,Z=d+24,K=d+28,X=d+32,Q=d+36,$=d+40,J=d+44,y=d+48,ee=y+64,h=0,f=1,F=2,ne=3,G=4,I=5,R=9,te=1,re=2,ae=4,se=8,oe=["none","default","pointer","context-menu","help","progress","wait","cell","crosshair","text","vertical-text","alias","copy","move","no-drop","not-allowed","grab","grabbing","e-resize","n-resize","ne-resize","nw-resize","s-resize","se-resize","sw-resize","w-resize","ew-resize","ns-resize","nesw-resize","nwse-resize","col-resize","row-resize","all-scroll","zoom-in","zoom-out","auto"],M=i=>URL.createObjectURL(new Blob([i],{type:"text/javascript"}));let ie,le;const j=()=>ie??=M(C),ce=()=>le??=M(U);let me;function de(){return me??=new Promise((i,e)=>{const t=globalThis.createGecko;if(t)return i(t);const a=document.createElement("script");a.src=j(),a.async=!0,a.onload=()=>{const n=globalThis.createGecko;n?i(n):e(new Error("libxul.js: engine evaluated but createGecko is missing"))},a.onerror=()=>e(new Error("libxul.js: failed to evaluate the bundled engine")),document.head.appendChild(a)})}class N{opts;canvas;ctx=null;gpu=!1;W;H;mod=null;cmd=0;queue=[];running=!1;painting=!1;enc=new TextEncoder;dec=new TextDecoder;blitImg=null;blitDst32=null;detach=[];constructor(e){if(this.opts=e,this.canvas=e.canvas,this.W=e.width??this.canvas.width??800,this.H=e.height??this.canvas.height??600,this.canvas.width=this.W,this.canvas.height=this.H,this.gpu=!!this.opts.env?.GECKO_GPU,this.gpu)this.canvas.id!=="screen"&&(this.canvas.id="screen");else{const t=this.canvas.getContext("2d");if(!t)throw new Error("libxul.js: canvas already has a non-2d context");this.ctx=t}}async init(){this.ensureGlDummy(),this.gpu&&this.setupGpuPresent();const e=this.opts.print??(s=>console.log(s)),t=this.opts.printErr??(s=>console.warn(s)),a=await de(),n=this.opts.assetBase??"./";let r;const m=new Promise(s=>r=s),c={print:s=>{typeof s=="string"&&s.includes("READY cmd=")&&r(),e(s)},printErr:t,onAbort:s=>t("[libxul] abort: "+s),preRun:[s=>{s.ENV.GRE_DIR="/gre",s.ENV.MOZ_FORCE_DISABLE_E10S="1";for(const[l,u]of Object.entries(this.opts.env??{}))s.ENV[l]=u;const o=this.opts.wispUrl;o&&typeof globalThis.WISP<"u"&&globalThis.WISP.install(s,o),this.opts.fs&&(s.addRunDependency("libxul-fs"),this.populateFs(s,this.opts.fs).then(()=>s.removeRunDependency("libxul-fs")).catch(l=>{t("[libxul] fs provider failed: "+l),s.removeRunDependency("libxul-fs")}))}]};c.mainScriptUrlOrBlob=j(),c.locateFile=this.opts.locateFile??(s=>s==="gecko.worker.js"?ce():n+s),this.mod=await a(c),await m,this.cmd=this.mod._xul_cmd_ptr(),this.opts.forwardInput!==!1&&this.attachInput(),this.startPaintLoop()}async load(e){await this.run({op:h,url:e})}async resize(e,t){this.W=Math.max(1,Math.round(e)),this.H=Math.max(1,Math.round(t)),this.gpu?this.syncGpuSize():(this.canvas.width=this.W,this.canvas.height=this.H,this.blitImg=null,this.blitDst32=null),await this.run({op:G})}async evalChrome(e){const t=await this.run({op:I,url:e});return typeof t=="string"?t:""}destroy(){this.running=!1;for(const e of this.detach)e();this.detach=[]}async populateFs(e,t,a=""){const n=await t.readdir(a);for(const r of n){const m=r.endsWith("/"),c=a+r,s="/gre/"+(m?c.slice(0,-1):c);if(m)e.FS.mkdirTree(s),await this.populateFs(e,t,c);else{const o=s.lastIndexOf("/");o>0&&e.FS.mkdirTree(s.slice(0,o)),e.FS.writeFile(s,await t.readFile(c))}}}run(e){return new Promise(t=>{e.resolve=t;const a=this.queue[this.queue.length-1];e.op===f&&e.evType===0&&a&&a.op===f&&a.evType===0?this.queue[this.queue.length-1]=e:this.queue.push(e),this.pump()})}async pump(){if(!this.running){for(this.running=!0;this.queue.length;){const e=this.queue.shift(),t=await this.runCmd(e);e.resolve?.(t)}this.running=!1}}async runCmd(e){const t=this.mod,a=()=>t.HEAP32,n=()=>t.HEAPU8,r=(o,l)=>{a()[this.cmd+o>>2]=l|0};if(r(D,this.W),r(W,this.H),r(d,e.op),r(z,e.evType||0),r(H,e.x||0),r(V,e.y||0),r(Y,e.button||0),r(q,e.buttons==null?-1:e.buttons),r(Z,e.clickCount||0),r(K,e.modifiers||0),r(X,e.keyCode||0),r(Q,e.charCode||0),r($,e.deltaX||0),r(J,e.deltaY||0),e.op===h||e.op===I||e.op===R){const o=this.enc.encode(e.url||"");if(o.length>=8190)return null;n().set(o,this.cmd+b),n()[this.cmd+b+o.length]=0}if(e.op===F){const o=this.enc.encode(e.key||""),l=Math.min(o.length,63);n().set(o.subarray(0,l),this.cmd+y),n()[this.cmd+y+l]=0}Atomics.store(a(),this.cmd+L>>2,1);const m=performance.now();let c=1;for(;performance.now()-m<12e4&&(c=Atomics.load(a(),this.cmd+L>>2),!(c===3||c===-1));)await new Promise(o=>setTimeout(o,e.op===h?20:4));if(c!==3)return null;if(e.op>=5&&e.op<=8){const o=a()[this.cmd+P>>2],l=a()[this.cmd+T>>2];return o&&l?this.dec.decode(new Uint8Array(n().subarray(o,o+l))):""}const s=this.blit();if(e.op===f){const o=a()[this.cmd+ee>>2];this.canvas.style.cursor=oe[o]||"auto"}return s}blit(){if(!this.ctx)return 0;const e=this.mod,t=e.HEAP32,a=e.HEAPU8,n=t[this.cmd+P>>2],r=t[this.cmd+T>>2];if(!n||!r)return 0;this.blitImg||(this.blitImg=this.ctx.createImageData(this.W,this.H),this.blitDst32=new Uint32Array(this.blitImg.data.buffer));const m=r>>>2,c=new Uint32Array(a.buffer,n,m),s=this.blitDst32;let o=0;for(let l=0;l<m;l++){const u=c[l];s[l]=u>>>16&255|u&65280|(u&255)<<16|4278190080,(u&16777215)!==16777215&&o++}return this.ctx.putImageData(this.blitImg,0,0),o}startPaintLoop(){const e=async()=>{this.mod&&(await this.run({op:G}),this.mod&&requestAnimationFrame(e))};requestAnimationFrame(e)}ensureGlDummy(){if(!document.getElementById("gldummy")){const e=document.createElement("canvas");e.id="gldummy",e.width=1,e.height=1,e.style.display="none",document.body.appendChild(e)}}setupGpuPresent(){const e=this.canvas;let t=e.parentElement;if((!t||t.dataset.libxulGlwrap!=="1")&&(t=document.createElement("div"),t.dataset.libxulGlwrap="1",e.parentNode.insertBefore(t,e),t.appendChild(e)),t.style.position="relative",t.style.display="inline-block",t.style.lineHeight="0",e.style.display="block",!document.getElementById("glout")){const a=document.createElement("canvas");a.id="glout",a.style.position="absolute",a.style.left="0",a.style.top="0",a.style.outline="none",a.style.pointerEvents="none",t.appendChild(a)}this.syncGpuSize()}syncGpuSize(){const e=this.canvas,t=e.parentElement;t&&t.dataset.libxulGlwrap==="1"&&(t.style.width=this.W+"px",t.style.height=this.H+"px"),e.style.width=this.W+"px",e.style.height=this.H+"px";const a=document.getElementById("glout");a&&(a.width=this.W,a.height=this.H,a.style.width=this.W+"px",a.style.height=this.H+"px")}mods(e){return(e.altKey?te:0)|(e.ctrlKey?re:0)|(e.shiftKey?ae:0)|(e.metaKey?se:0)}xy(e){const t=this.canvas.getBoundingClientRect();return{x:Math.round((e.clientX-t.left)*(this.W/t.width)),y:Math.round((e.clientY-t.top)*(this.H/t.height))}}attachInput(){const e=this.canvas,t=(n,r)=>{e.addEventListener(n,r),this.detach.push(()=>e.removeEventListener(n,r))};t("mousemove",n=>{const r=this.xy(n);this.run({op:f,evType:0,x:r.x,y:r.y,buttons:n.buttons,modifiers:this.mods(n)})}),t("mousedown",n=>{e.focus();const r=this.xy(n);this.run({op:f,evType:1,x:r.x,y:r.y,button:n.button,buttons:n.buttons,clickCount:n.detail,modifiers:this.mods(n)})}),t("mouseup",n=>{const r=this.xy(n);this.run({op:f,evType:2,x:r.x,y:r.y,button:n.button,buttons:n.buttons,clickCount:n.detail,modifiers:this.mods(n)})}),t("contextmenu",n=>n.preventDefault()),t("wheel",n=>{const r=this.xy(n);this.run({op:ne,x:r.x,y:r.y,deltaX:n.deltaX,deltaY:n.deltaY,modifiers:this.mods(n)}),n.preventDefault()});const a=(n,r)=>({op:F,evType:r,key:n.key,keyCode:n.keyCode,charCode:n.key.length===1?n.key.codePointAt(0):0,modifiers:this.mods(n)});t("keydown",n=>{if((n.ctrlKey||n.metaKey)&&!n.altKey&&!n.shiftKey&&(n.key==="v"||n.key==="V")){n.preventDefault(),this.pasteThenKey(a(n,0));return}this.run(a(n,0)),n.preventDefault()}),t("keyup",n=>{this.run(a(n,1)),n.preventDefault()}),e.hasAttribute("tabindex")||e.setAttribute("tabindex","0")}async pasteThenKey(e){try{const t=navigator.clipboard?.readText?await navigator.clipboard.readText():"";t&&await this.run({op:R,url:t})}catch(t){(this.opts.printErr??(a=>console.warn(a)))("[libxul] clipboard read: "+(t instanceof Error?t.message:String(t)))}this.run(e)}}const ue=N;var fe=E.k;E.A;const pe=document.getElementById("screen"),B=document.getElementById("url"),x=document.getElementById("wisp"),S=document.getElementById("gpu"),k=document.getElementById("jit"),O="libxul-demo-opts",ge=`${location.protocol==="https:"?"wss":"ws"}://${location.host}/wisp/`,v=JSON.parse(localStorage.getItem(O)||"{}"),p={gpu:v.gpu??!1,jit:v.jit??!0,wisp:v.wisp??ge};x.value=p.wisp;S.checked=p.gpu;k.checked=p.jit;const _={};p.gpu&&(_.GECKO_GPU="1",_.GECKO_GL_PASSTHROUGH="1");p.jit||(_.GECKO_NOWASMJIT="1");const A=new fe({canvas:pe,assetBase:"/",wispUrl:p.wisp.trim()||void 0,env:_,print:i=>console.log("[gecko]",i),printErr:i=>console.warn("[gecko]",i)});await A.init();console.log("[demo] engine ready");function w(){const i={gpu:S.checked,jit:k.checked,wisp:x.value.trim()};localStorage.setItem(O,JSON.stringify(i)),location.reload()}S.addEventListener("change",w);k.addEventListener("change",w);x.addEventListener("change",w);function _e(i){const e=i.trim();return e?/^[a-z][a-z0-9+.-]*:/i.test(e)?e:"https://"+e:""}B.addEventListener("keydown",i=>{if(i.key!=="Enter")return;const e=_e(B.value);e&&A.load(e)});const he=`<!doctype html><meta charset="utf-8">
<body style="font-family:sans-serif;padding:2rem;line-height:1.5">
  <h1 style="color:#b5179e;margin-top:0">libxul.js</h1>
  <p>This page is being laid out and painted by <b>Gecko</b> — Firefox's engine,
     compiled to WebAssembly — entirely inside your browser tab.</p>
  <p>Type a URL above and press Enter. <code>about:</code>/<code>data:</code> URLs
     work out of the box; <code>https://</code> sites go through the dev server's
     WISP proxy.</p>
  <input placeholder="type here (input is forwarded to the engine)" style="padding:.4rem;width:60%">
</body>`;await A.load("data:text/html,"+encodeURIComponent(he));console.log("[demo] page loaded");
