import React, { useEffect, useRef, useState } from 'react';
import { parseGIF, decompressFrames } from 'gifuct-js';

interface Props {
  key?: React.Key;
  playing: boolean;
  facingRight: boolean;
  style?: React.CSSProperties;
}

// A fully-composited snapshot of every frame, stored as ImageBitmap for fast drawing
interface ComposedFrame {
  bitmap: ImageBitmap;
  delay: number; // ms
}

// Module-level singleton — decode once, reuse everywhere
let cachedFrames: ComposedFrame[] | null = null;
let cachePromise: Promise<ComposedFrame[]> | null = null;
let gifW = 1;
let gifH = 1;

async function loadFrames(): Promise<ComposedFrame[]> {
  if (cachedFrames) return cachedFrames;
  if (cachePromise) return cachePromise;

  cachePromise = (async () => {
    const buf = await fetch('/Wisp/WispMove.gif').then(r => r.arrayBuffer());
    const gif  = parseGIF(buf);
    const raw  = decompressFrames(gif, true); // patch:true → per-frame patch pixels
    if (raw.length === 0) return [];

    // Derive logical screen size from first frame dims as fallback
    const lsd = (gif as any).lsd ?? (gif as any).header?.logicalScreenDesc;
    gifW = lsd?.width  ?? raw[0].dims.width;
    gifH = lsd?.height ?? raw[0].dims.height;

    // Off-screen composite canvas — accumulates frame-over-frame like a real GIF decoder
    const comp = new OffscreenCanvas(gifW, gifH);
    const cCtx = comp.getContext('2d') as OffscreenCanvasRenderingContext2D;

    // Backup canvas for disposal=3 (restore to previous)
    const prev = new OffscreenCanvas(gifW, gifH);
    const pCtx = prev.getContext('2d') as OffscreenCanvasRenderingContext2D;

    const composed: ComposedFrame[] = [];

    for (const f of raw) {
      const disposal = f.disposalType ?? 0;

      // --- Save snapshot before draw if we'll need to restore later ---
      if (disposal === 3) {
        pCtx.clearRect(0, 0, gifW, gifH);
        pCtx.drawImage(comp as unknown as CanvasImageSource, 0, 0);
      }

      // --- Draw this frame's patch onto the composite ---
      // Build an ImageData for the patch at the frame's own sub-rect size
      const patchData = new ImageData(
        new Uint8ClampedArray(f.patch.buffer),
        f.dims.width,
        f.dims.height
      );
      // Put it onto a tiny temp canvas then drawImage at the correct offset
      const tmp  = new OffscreenCanvas(f.dims.width, f.dims.height);
      const tCtx = tmp.getContext('2d') as OffscreenCanvasRenderingContext2D;
      tCtx.putImageData(patchData, 0, 0);
      cCtx.drawImage(tmp as unknown as CanvasImageSource, f.dims.left, f.dims.top);

      // --- Snapshot the fully composited result as an ImageBitmap ---
      const bitmap = await createImageBitmap(comp as unknown as ImageBitmapSource);
      composed.push({
        bitmap,
        delay: Math.max((f.delay || 10) * 10, 20),
      });

      // --- Apply disposal for next frame ---
      if (disposal === 2) {
        cCtx.clearRect(f.dims.left, f.dims.top, f.dims.width, f.dims.height);
      } else if (disposal === 3) {
        cCtx.clearRect(0, 0, gifW, gifH);
        cCtx.drawImage(prev as unknown as CanvasImageSource, 0, 0);
      }
      // disposal 0 or 1 → leave composite as-is
    }

    cachedFrames = composed;
    return composed;
  })();

  return cachePromise;
}

export default function WispMoveCanvas({ playing, facingRight, style }: Props): React.ReactElement | null {
  const canvasRef      = useRef<HTMLCanvasElement>(null);
  const frameIdxRef    = useRef(0);
  const loopDoneRef    = useRef(false);
  const elapsedRef     = useRef(0);
  const lastTimeRef    = useRef(0);
  const rafRef         = useRef(0);
  const framesRef      = useRef<ComposedFrame[]>([]);

  // Live refs so the RAF closure always sees the latest values
  const playingRef     = useRef(playing);
  const facingRightRef = useRef(facingRight);
  playingRef.current     = playing;
  facingRightRef.current = facingRight;

  // Track previous facing so we know when to redraw without a frame advance
  const prevFacingRef  = useRef(facingRight);

  const [ready, setReady] = useState(false);

  // ── Draw a single frame index onto the canvas, respecting current facing ──
  function drawFrame(frames: ComposedFrame[], idx: number) {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const fw = gifW, fh = gifH;
    ctx.clearRect(0, 0, fw, fh);
    if (facingRightRef.current) {
      ctx.save();
      ctx.translate(fw, 0);
      ctx.scale(-1, 1);
      ctx.drawImage(frames[idx].bitmap, 0, 0);
      ctx.restore();
    } else {
      ctx.drawImage(frames[idx].bitmap, 0, 0);
    }
  }

  useEffect(() => {
    let cancelled = false;

    loadFrames().then(frames => {
      if (cancelled || !canvasRef.current || frames.length === 0) return;

      framesRef.current = frames;

      const canvas = canvasRef.current!;
      canvas.width  = gifW;
      canvas.height = gifH;

      frameIdxRef.current  = 0;
      loopDoneRef.current  = false;
      elapsedRef.current   = 0;
      lastTimeRef.current  = performance.now();

      setReady(true);
      drawFrame(frames, 0);

      const loopStart = Math.max(0, frames.length - 2);

      function tick(now: number) {
        rafRef.current = requestAnimationFrame(tick);
        const frames = framesRef.current;

        // Redraw whenever facing flips, even without a frame advance
        if (facingRightRef.current !== prevFacingRef.current) {
          prevFacingRef.current = facingRightRef.current;
          drawFrame(frames, frameIdxRef.current);
        }

        if (!playingRef.current) {
          // Reset to frame 0 when stopped
          if (frameIdxRef.current !== 0 || loopDoneRef.current) {
            frameIdxRef.current = 0;
            loopDoneRef.current = false;
            elapsedRef.current  = 0;
            drawFrame(frames, 0);
          }
          lastTimeRef.current = now;
          return;
        }

        const delta = now - lastTimeRef.current;
        lastTimeRef.current = now;
        elapsedRef.current += delta;

        const currentDelay = frames[frameIdxRef.current].delay;
        if (elapsedRef.current >= currentDelay) {
          elapsedRef.current -= currentDelay;

          if (loopDoneRef.current) {
            // Alternate between last two frames
            frameIdxRef.current = frameIdxRef.current === loopStart
              ? loopStart + 1
              : loopStart;
          } else {
            frameIdxRef.current++;
            if (frameIdxRef.current >= frames.length) {
              frameIdxRef.current = loopStart;
              loopDoneRef.current = true;
            }
          }
          drawFrame(frames, frameIdxRef.current);
        }
      }

      rafRef.current = requestAnimationFrame(tick);
    });

    return () => {
      cancelled = true;
      cancelAnimationFrame(rafRef.current);
    };
  }, []);

  const { transform: _t, ...styleWithoutTransform } = style ?? {};

  return (
    <canvas
      ref={canvasRef}
      width={gifW}
      height={gifH}
      style={{
        imageRendering: 'pixelated',
        display: ready ? undefined : 'none',
        ...styleWithoutTransform,
      }}
    />
  );
}
