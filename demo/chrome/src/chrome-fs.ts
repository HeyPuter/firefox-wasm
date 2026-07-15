import { ZSTDDecoder } from 'zstddec';
import type { FsProvider, FsStat } from 'gecko.js';

export type ChromeAssetsProgressPhase =
  | 'downloading'
  | 'decompressing'
  | 'ready';
export interface ChromeAssetsProgress {
  phase: ChromeAssetsProgressPhase;
  loaded?: number;
  total?: number;
  percent?: number;
  message: string;
}
type ProgressCallback = (progress: ChromeAssetsProgress) => void;

// gecko.js bakes the minimal GRE into gecko.data but EXCLUDES the Firefox
// front-end (browser/), which the chrome build needs as its APP dir
// (/gre/browser, selected by GECKO_CHROME=1). chrome-demo ships the pre-strip
// non-binary GRE resources plus browser/ as a tar.zst, downloaded and
// decompressed into memory on every page load. The tar is indexed (path ->
// bytes view into the one decompressed buffer, zero-copy) and handed to libxul
// as an in-memory FsProvider for `fs`: the engine consults it provider-first
// for /gre, falling back to the baked gecko.data on a miss. Only the persistent
// profile touches OPFS (PROFILE_OPFS_PATH, gecko.js's built-in OPFS provider).
const ARCHIVE_URL = '/chrome-assets.tar.zst';
const MANIFEST_URL = '/chrome-assets.json';
// OPFS path for the persistent profile (gecko.js `profile` option).
export const PROFILE_OPFS_PATH = 'profile';
const REQUIRED_FILES = [
  'fonts/LiberationSans-Regular.ttf',
  'browser/fonts/LiberationSans-Regular.ttf',
  'browser/chrome.manifest',
  // Eagerly loaded by the context-menu actor (resource://pdf.js/PdfjsContextMenu.sys.mjs);
  // a tar that predates the pdfjs trim would make right-click throw "Failed to load".
  'chrome/pdfjs/content/PdfjsContextMenu.sys.mjs',
];

const textDecoder = new TextDecoder();
let ready: Promise<FsProvider> | undefined;

function report(progress: ProgressCallback | undefined, update: ChromeAssetsProgress): void {
  progress?.(update);
}

async function yieldToBrowser(): Promise<void> {
  await new Promise((resolve) => setTimeout(resolve, 0));
}

async function fetchJson<T>(url: string): Promise<T> {
  const r = await fetch(url, { cache: 'no-store' });
  if (!r.ok) throw new Error(`chrome-fs: ${url} -> HTTP ${r.status}`);
  return await r.json() as T;
}

function concatChunks(chunks: Uint8Array[], total: number): Uint8Array {
  const out = new Uint8Array(total);
  let offset = 0;
  for (const chunk of chunks) {
    out.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return out;
}

async function fetchBytes(url: string, progress?: ProgressCallback): Promise<Uint8Array> {
  const r = await fetch(url, { cache: 'no-store' });
  if (!r.ok) throw new Error(`chrome-fs: ${url} -> HTTP ${r.status}`);
  const total = Number(r.headers.get('Content-Length')) || undefined;
  if (!r.body) {
    const data = new Uint8Array(await r.arrayBuffer());
    report(progress, {
      phase: 'downloading',
      loaded: data.byteLength,
      total: data.byteLength,
      percent: 1,
      message: 'Downloaded chrome assets',
    });
    return data;
  }

  const reader = r.body.getReader();
  const chunks: Uint8Array[] = [];
  let loaded = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    chunks.push(value);
    loaded += value.byteLength;
    report(progress, {
      phase: 'downloading',
      loaded,
      total,
      percent: total ? loaded / total : undefined,
      message: total ? `Downloading chrome assets (${Math.round((loaded / total) * 100)}%)` : 'Downloading chrome assets',
    });
  }
  return concatChunks(chunks, loaded);
}

function parseTarString(bytes: Uint8Array, start: number, length: number): string {
  let end = start;
  const max = start + length;
  while (end < max && bytes[end] !== 0) end++;
  return textDecoder.decode(bytes.subarray(start, end));
}

function parseTarSize(bytes: Uint8Array, start: number): number {
  const first = bytes[start];
  if (first & 0x80) {
    let size = first & 0x7f;
    for (let i = start + 1; i < start + 12; i++) size = (size * 256) + bytes[i];
    return size;
  }
  const raw = parseTarString(bytes, start, 12).trim();
  return raw ? Number.parseInt(raw, 8) : 0;
}

function parsePax(data: Uint8Array): Record<string, string> {
  const text = textDecoder.decode(data);
  const out: Record<string, string> = {};
  let i = 0;
  while (i < text.length) {
    const space = text.indexOf(' ', i);
    if (space < 0) break;
    const length = Number.parseInt(text.slice(i, space), 10);
    if (!Number.isFinite(length) || length <= 0) break;
    const record = text.slice(space + 1, i + length - 1);
    const eq = record.indexOf('=');
    if (eq >= 0) out[record.slice(0, eq)] = record.slice(eq + 1);
    i += length;
  }
  return out;
}

function tarName(bytes: Uint8Array, offset: number): string {
  const name = parseTarString(bytes, offset, 100);
  const prefix = parseTarString(bytes, offset + 345, 155);
  return prefix ? `${prefix}/${name}` : name;
}

function isEmptyBlock(bytes: Uint8Array, offset: number): boolean {
  for (let i = offset; i < offset + 512; i++) {
    if (bytes[i] !== 0) return false;
  }
  return true;
}

interface TarIndex {
  // path -> subarray view into the decompressed tar (zero-copy).
  files: Map<string, Uint8Array>;
  // dir path ('' = root) -> child entry names.
  dirs: Map<string, Set<string>>;
}

// Register `parts` (a file or dir path) into the directory tree, creating
// implicit parents (tars don't always carry explicit dir entries).
function addToTree(dirs: Map<string, Set<string>>, parts: string[], isDir: boolean): void {
  let dir = '';
  for (let i = 0; i < parts.length; i++) {
    const isLast = i === parts.length - 1;
    let children = dirs.get(dir);
    if (!children) {
      children = new Set();
      dirs.set(dir, children);
    }
    children.add(parts[i]);
    if (isLast && !isDir) break;
    dir = dir ? `${dir}/${parts[i]}` : parts[i];
    if (isLast && !dirs.has(dir)) dirs.set(dir, new Set());
  }
}

function indexTar(bytes: Uint8Array): TarIndex {
  const files = new Map<string, Uint8Array>();
  const dirs = new Map<string, Set<string>>([['', new Set()]]);
  let offset = 0;
  let pax: Record<string, string> | undefined;
  let longName: string | undefined;

  while (offset + 512 <= bytes.length && !isEmptyBlock(bytes, offset)) {
    const type = String.fromCharCode(bytes[offset + 156] || 0);
    const size = parseTarSize(bytes, offset + 124);
    const dataStart = offset + 512;
    const dataEnd = dataStart + size;
    if (dataEnd > bytes.length) throw new Error('chrome-fs: truncated tar archive');

    const data = bytes.subarray(dataStart, dataEnd);
    const name = (pax?.path ?? longName ?? tarName(bytes, offset)).replace(/^\.\//, '');
    pax = undefined;
    longName = undefined;

    const parts = name.split('/').filter(Boolean);
    if (name.startsWith('/') || parts.includes('..')) {
      throw new Error(`chrome-fs: unsafe tar path ${name}`);
    }

    if (type === 'x') {
      pax = parsePax(data);
    } else if (type === 'L') {
      longName = parseTarString(data, 0, data.length);
    } else if (parts.length && (type === '0' || type === '\0' || type === '')) {
      files.set(parts.join('/'), data);
      addToTree(dirs, parts, false);
    } else if (parts.length && type === '5') {
      addToTree(dirs, parts, true);
    }

    offset = dataStart + Math.ceil(size / 512) * 512;
  }
  return { files, dirs };
}

const normalizePath = (p: string) => p.split('/').filter(Boolean).join('/');

function makeProvider(index: TarIndex): FsProvider {
  return {
    async stat(path: string): Promise<FsStat | null> {
      const p = normalizePath(path);
      const file = index.files.get(p);
      if (file) return { size: file.byteLength, isDir: false };
      if (index.dirs.has(p)) return { size: 0, isDir: true };
      return null;
    },
    async readdir(path: string): Promise<string[]> {
      const children = index.dirs.get(normalizePath(path));
      if (!children) throw new Error(`chrome-fs: no such directory ${path}`);
      return [...children];
    },
    async readFile(path: string): Promise<Uint8Array> {
      const file = index.files.get(normalizePath(path));
      if (!file) throw new Error(`chrome-fs: no such file ${path}`);
      return file;
    },
  };
}

async function installAssets(progress?: ProgressCallback): Promise<FsProvider> {
  const decoder = new ZSTDDecoder();
  await decoder.init();
  const manifest = await fetchJson<{ uncompressedSize: number }>(MANIFEST_URL);
  const archive = await fetchBytes(ARCHIVE_URL, progress);
  report(progress, { phase: 'decompressing', percent: 1, message: 'Decompressing chrome assets' });
  await yieldToBrowser();
  const tar = decoder.decode(archive, manifest.uncompressedSize);
  const index = indexTar(tar);
  for (const path of REQUIRED_FILES) {
    if (!index.files.has(path)) {
      throw new Error(`chrome-fs: chrome assets are missing required file ${path}`);
    }
  }
  report(progress, { phase: 'ready', percent: 1, message: 'Starting Gecko' });
  return makeProvider(index);
}

export async function prepareChromeFs(progress?: ProgressCallback): Promise<FsProvider> {
  ready ??= installAssets(progress);
  return ready;
}
