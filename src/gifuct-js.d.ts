declare module 'gifuct-js' {
  export interface GifFrame {
    patch: Uint8ClampedArray;
    dims: { width: number; height: number; top: number; left: number };
    delay: number;
    disposalType: number;
  }
  export function parseGIF(buffer: ArrayBuffer): unknown;
  export function decompressFrames(gif: unknown, patch: boolean): GifFrame[];
}
