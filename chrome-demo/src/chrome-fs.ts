import { ZSTDDecoder } from 'zstddec';

type OpfsDirectory = FileSystemDirectoryHandle;
type OpfsFile = FileSystemFileHandle;
export type ChromeAssetsProgressPhase =
  | 'checking'
  | 'cached'
  | 'downloading'
  | 'decompressing'
  | 'unpacking'
  | 'ready';
export interface ChromeAssetsProgress {
  phase: ChromeAssetsProgressPhase;
  loaded?: number;
  total?: number;
  percent?: number;
  message: string;
}
type ProgressCallback = (progress: ChromeAssetsProgress) => void;

// libxul.js bakes the minimal GRE into gecko.data but EXCLUDES the Firefox
// front-end (browser/), which the chrome build needs as its APP dir
// (/gre/browser, selected by GECKO_CHROME=1). chrome-demo ships the pre-strip
// non-binary GRE resources plus browser/ as a tar.zst and expands it into an OPFS
// directory once per clobber version. We then just hand libxul that OPFS path as
// `fs` (GRE_OPFS_PATH): libxul builds its built-in OPFS provider over it and
// consults it provider-first for /gre, falling back to the baked gecko.data on a
// miss. The persistent profile lives at PROFILE_OPFS_PATH (also a built-in OPFS
// provider). No custom FsProvider needed.
const ARCHIVE_URL = '/chrome-assets.tar.zst';
const MANIFEST_URL = '/chrome-assets.json';
const CLOBBER_URL = '/chrome-assets.clobber';
// OPFS path passed to libxul as `fs`; the tar is extracted here (so /gre/<root>
// resolves to OPFS gre/<root>). `profile` goes to a sibling OPFS dir.
export const GRE_OPFS_PATH = 'gre';
export const PROFILE_OPFS_PATH = 'profile';
const OPFS_DIR = GRE_OPFS_PATH;
const VERSION_FILE = '.chrome-assets-version';
const REQUIRED_FILES = [
  'fonts/LiberationSans-Regular.ttf',
  'browser/fonts/LiberationSans-Regular.ttf',
  'browser/chrome.manifest',
];

const textDecoder = new TextDecoder();
const textEncoder = new TextEncoder();
let ready: Promise<OpfsDirectory> | undefined;

function report(progress: ProgressCallback | undefined, update: ChromeAssetsProgress): void {
  progress?.(update);
}

async function yieldToBrowser(): Promise<void> {
  await new Promise((resolve) => setTimeout(resolve, 0));
}

async function getRoot(): Promise<OpfsDirectory> {
  if (!navigator.storage?.getDirectory) {
    throw new Error('chrome-fs: OPFS is unavailable in this browser');
  }
  const storage = await navigator.storage.getDirectory();
  return storage.getDirectoryHandle(OPFS_DIR, { create: true });
}

async function readTextFile(dir: OpfsDirectory, name: string): Promise<string | undefined> {
  try {
    return await (await (await dir.getFileHandle(name)).getFile()).text();
  } catch (e) {
    if (e instanceof DOMException && e.name === 'NotFoundError') return undefined;
    throw e;
  }
}

async function fileExists(root: OpfsDirectory, path: string): Promise<boolean> {
  try {
    await fileForPath(root, path);
    return true;
  } catch (e) {
    if (e instanceof DOMException && e.name === 'NotFoundError') return false;
    throw e;
  }
}

async function hasRequiredFiles(root: OpfsDirectory): Promise<boolean> {
  for (const path of REQUIRED_FILES) {
    if (!(await fileExists(root, path))) return false;
  }
  return true;
}

async function writeFile(dir: OpfsDirectory, path: string, data: Uint8Array | string): Promise<void> {
  const parts = path.split('/').filter(Boolean);
  const name = parts.pop();
  if (!name) return;
  let cur = dir;
  for (const part of parts) cur = await cur.getDirectoryHandle(part, { create: true });
  const out = await (await cur.getFileHandle(name, { create: true })).createWritable();
  await out.write(typeof data === 'string' ? textEncoder.encode(data) : data);
  await out.close();
}

async function fetchText(url: string): Promise<string> {
  const r = await fetch(url, { cache: 'no-store' });
  if (!r.ok) throw new Error(`chrome-fs: ${url} -> HTTP ${r.status}`);
  return (await r.text()).trim();
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

async function extractTarToOpfs(bytes: Uint8Array, dir: OpfsDirectory, progress?: ProgressCallback): Promise<void> {
  let offset = 0;
  let pax: Record<string, string> | undefined;
  let longName: string | undefined;
  let files = 0;

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
    } else if (type === '0' || type === '\0' || type === '') {
      await writeFile(dir, name, data);
      files++;
    } else if (type === '5') {
      let cur = dir;
      for (const part of parts) cur = await cur.getDirectoryHandle(part, { create: true });
    }

    offset = dataStart + Math.ceil(size / 512) * 512;
    report(progress, {
      phase: 'unpacking',
      loaded: offset,
      total: bytes.length,
      percent: offset / bytes.length,
      message: `Unpacking chrome assets (${files} files)`,
    });
  }
}

async function installAssets(progress?: ProgressCallback): Promise<OpfsDirectory> {
  report(progress, { phase: 'checking', message: 'Checking chrome assets' });
  const version = await fetchText(CLOBBER_URL);
  if (!navigator.storage?.getDirectory) {
    throw new Error('chrome-fs: OPFS is unavailable in this browser');
  }
  const storage = await navigator.storage.getDirectory();
  const current = await getRoot();
  const installedVersion = await readTextFile(current, VERSION_FILE);
  if (installedVersion?.trim() === version && await hasRequiredFiles(current)) {
    report(progress, { phase: 'cached', percent: 1, message: 'Chrome assets ready' });
    report(progress, { phase: 'ready', percent: 1, message: 'Starting Gecko' });
    return current;
  }

  report(progress, { phase: 'checking', message: 'Clearing stale chrome assets' });
  await storage.removeEntry(OPFS_DIR, { recursive: true }).catch((e) => {
    if (!(e instanceof DOMException && e.name === 'NotFoundError')) throw e;
  });

  const fresh = await getRoot();
  const decoder = new ZSTDDecoder();
  await decoder.init();
  const manifest = await fetchJson<{ uncompressedSize: number }>(MANIFEST_URL);
  const archive = await fetchBytes(ARCHIVE_URL, progress);
  report(progress, { phase: 'decompressing', message: 'Decompressing chrome assets' });
  await yieldToBrowser();
  const tar = decoder.decode(archive, manifest.uncompressedSize);
  await extractTarToOpfs(tar, fresh, progress);
  if (!(await hasRequiredFiles(fresh))) {
    throw new Error('chrome-fs: unpacked chrome assets are missing required files');
  }
  await writeFile(fresh, VERSION_FILE, `${version}\n`);
  report(progress, { phase: 'ready', percent: 1, message: 'Starting Gecko' });
  return fresh;
}

async function getInstalledRoot(progress?: ProgressCallback): Promise<OpfsDirectory> {
  ready ??= installAssets(progress);
  const root = await ready;
  report(progress, { phase: 'ready', percent: 1, message: 'Starting Gecko' });
  return root;
}

export async function prepareChromeFs(progress?: ProgressCallback): Promise<void> {
  await getInstalledRoot(progress);
}

async function directoryForPath(root: OpfsDirectory, path: string): Promise<OpfsDirectory> {
  let cur = root;
  for (const part of path.split('/').filter(Boolean)) {
    cur = await cur.getDirectoryHandle(part);
  }
  return cur;
}

async function fileForPath(root: OpfsDirectory, path: string): Promise<OpfsFile> {
  const parts = path.split('/').filter(Boolean);
  const name = parts.pop();
  if (!name) throw new Error(`chrome-fs: invalid file path ${path}`);
  return (await directoryForPath(root, parts.join('/'))).getFileHandle(name);
}
