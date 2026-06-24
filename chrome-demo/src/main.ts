import { Gecko } from 'libxul.js';
import { chromeFs } from './chrome-fs';

const canvas = document.getElementById('screen') as HTMLCanvasElement;

// GECKO_CHROME=1 makes the engine use /gre/browser as its APP dir, register the
// browser chrome package, and auto-boot chrome://browser/content/browser.xhtml.
// browser/ isn't in libxul.js's minimal gecko.data, so we supply it via chromeFs.
const gecko = new Gecko({
  canvas,
  width: 1024,
  height: 768,
  assetBase: '/',
  env: { GECKO_CHROME: '1' },
  fs: chromeFs,
  // The chrome UI itself boots from local files; loading sites in tabs needs a
  // WISP endpoint -- set `wispUrl` and run one (e.g. wisp-server-node) for that.
  // wispUrl: 'ws://localhost:8787/',
  print: (s) => console.log('[gecko]', s),
  printErr: (s) => console.warn('[gecko]', s),
});

await gecko.init();
console.log('[chrome-demo] Firefox front-end booted');
