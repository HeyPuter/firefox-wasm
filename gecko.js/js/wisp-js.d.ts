// Ambient types for @mercuryworkshop/wisp-js's client entrypoint (the package
// ships no .d.ts). Only the surface lib/wisp-net.js drives is declared: the
// ClientConnection and the per-stream handle its create_stream() returns.
declare module '@mercuryworkshop/wisp-js/client' {
  export interface ClientStream {
    onopen: () => void;
    onclose: (reason?: number) => void;
    onmessage: (bytes: Uint8Array) => void;
    send(data: Uint8Array): void;
    close(reason?: number): void;
  }

  export namespace client {
    class ClientConnection {
      constructor(
        wispUrl: string,
        opts?: { wisp_version?: number; wisp_extensions?: unknown[] | null },
      );
      onopen: () => void;
      onclose: () => void;
      onerror: () => void;
      connected: boolean;
      create_stream(hostname: string, port: number, type?: number | string): ClientStream;
      close(): void;
    }
  }

  export const packet: unknown;
  export const extensions: unknown;
}
