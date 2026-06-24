import type { FsProvider } from 'libxul.js';

// libxul.js bakes the minimal GRE into gecko.data but EXCLUDES the Firefox
// front-end (browser/), which the chrome build needs as its APP dir (/gre/browser,
// selected by GECKO_CHROME=1). chrome-demo supplies it here: the vite plugin
// (vite.config.ts) serves the objdir's dist/bin under /gre-extra/ — a JSON listing
// for directories, raw bytes for files. The provider tree is merged into /gre, so
// these roots land at /gre/<root>. readdir suffixes directory names with "/".
const BASE = '/gre-extra/';

// Roots the minimal gecko.data omits but the chrome UI requires. (Add 'hyphenation/',
// 'dictionaries/' here too if you want hyphenation/spellcheck.)
const ROOTS = ['browser/'];

export const chromeFs: FsProvider = {
  async readdir(p: string): Promise<string[]> {
    if (p === '') return ROOTS;
    const r = await fetch(BASE + p);
    return r.ok ? ((await r.json()) as string[]) : [];
  },
  async readFile(p: string): Promise<Uint8Array> {
    const r = await fetch(BASE + p);
    if (!r.ok) throw new Error(`chrome-fs: ${p} -> HTTP ${r.status}`);
    return new Uint8Array(await r.arrayBuffer());
  },
};
