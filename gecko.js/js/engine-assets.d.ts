// `import src from './x?source'` -> the file's text (rspack asset/source).
declare module '*?source' {
  const src: string;
  export default src;
}

// `import uri from './x?inline'` -> a base64 data: URI (rspack asset/inline).
// Used to bake the zstd-compressed gecko.data into the bundle.
declare module '*?inline' {
  const uri: string;
  export default uri;
}

declare module '*.json' {
  const value: { dataCompressed: boolean; dataSize: number; wasmCompressed: boolean; wasmSize: number };
  export default value;
}
