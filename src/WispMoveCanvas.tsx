import React, { useEffect, useRef, useState } from 'react';
import { parseGIF, decompressFrames } from 'gifuct-js';

interface Props {
  key?: React.Key;
  playing: boolean;
  facingRight: boolean;
  style?: React.CSSProperties;
}

interface DecodedFrame {
  // Full composited frame for the whole GIF canvas
  imageData: ImageData;
  delay: number; // ms
}

// Singleton: decode WispMove.gif once, share across all instances
let cachedFrames: DecodedFrame[] | null = null;
let cachePromise: Promise<DecodedFrame[]> | null = null;
let gifWidth = 1;
let gifHeight = 1;

function loadFrames(): Promise<DecodedFrame[]> {
  if (cachedFrames) return Promise.resolve(cachedFrames);
  if (cachePromise) return cachePromise;

  cachePromise = fetch('/Wisp/WispMove.gif')
    .then(r => r.arrayBuffer())
    .then(buf => {
      const gif = parseGIF(buf);
      // patch:true gives us the pixel patch for each frame's bounding box
      const raw = decompressFrames(gif, true);
      if (raw.length === 0) return [];

      // Use the GIF's logical screen dimensions for the composite canvas
      // gifuct-js exposes these on the parsed gif object
      const parsedGif = gif as any;
      const lsd = parsedGif.lsd || parsedGif.header?.logicalScreenDesc;
      const gw = lsd ? lsd.width  : raw[0].dims.width;
      const gh = lsd ? lsd.height : raw[0].dims.height;
      gifWidth  = gw;
      gifHeight = gh;

      // Composite canvas — we accumulate frames on this
      const comp = document.createElement('canvas');
      comp.width  = gw;
      comp.height = gh;
      const cCtx = comp.getContext('2d')!;

      // Snapshot canvas — used to restore previous frame on disposal=3
      const snap = document.createElement('canvas');
      snap.width  = gw;
      snap.height = gh;
      const sCtx = snap.getContext('2d')!;

      const frames: DecodedFrame[] = raw.map(f => {
        // Save snapshot BEFORE drawing (for disposal type 3 — restore to previous)
        const disposalType = f.disposalType ?? 0;
        if (disposalType === 3) {
          sCtx.clearRect(0, 0, gw, gh);
          sCtx.drawImage(comp, 0, 0);
        }

        // Build patch ImageData at the frame's own dimensions
        const patchId = new ImageData(
          new Uint8ClampedArray(f.patch),
          f.dims.width,
          f.dims.height
        );

        // Draw patch onto composite at frame offset
        const patchCanvas = document.createElement('canvas');
        patchCanvas.width  = f.dims.width;
        patchCanvas.height = f.dims.height;
        const pCtx = patchCanvas.getContext('2d')!;
        pCtx.putImageData(patchId, 0, 0);
        cCtx.drawImage(patchCanvas, f.dims.left, f.dims.top);

        // Snapshot the fully composited frame
        const snap2 = document.createElement('canvas');
        snap2.width  = gw;
        snap2.height = gh;
        snap2.getContext('2d')!.drawImage(comp, 0, 0);
        const composed = snap2.getContext('2d')!.getImageData(0, 0, gw, gh);

        // Apply disposal for next frame
        if (disposalType === 2) {
          // Restore to background — clear the frame region
          cCtx.clearRect(f.dims.left, f.dims.top, f.dims.width, f.dims.height);
        } else if (disposalType === 3) {
          // Restore to previous snapshot
          cCtx.clearRect(0, 0, gw, gh);
          cCtx.drawImage(snap, 0, 0);
        }
        // disposalType 0 or 1 — leave in place

        return {
          imageData: composed,
          delay: Math.max((f.delay || 10) * 10, 20), // centiseconds → ms, min 20ms
        };
      });

      cachedFrames = frames;
      return frames;
    });

  return cachePromise;
}

export default function WispMoveCanvas({ playing, facingRight, style }: Props): React.ReactElement | null {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const stateRef  = useRef<{
    frames: DecodedFrame[];
    frameIdx: number;
    loopDone: boolean;
    raf: number;
    lastTime: number;
    elapsed: number;
  } | null>(null);
  const playingRef     = useRef(playing);
  const facingRightRef = useRef(facingRight);
  playingRef.current     = playing;
  facingRightRef.current = facingRight;

  const [size, setSize] = useState({ w: 1, h: 1 });

  useEffect(() => {
    let cancelled = false;

    loadFrames().then(frames => {
      if (cancelled || !canvasRef.current || frames.length === 0) return;

      const fw = gifWidth;
      const fh = gifHeight;
      setSize({ w: fw, h: fh });

      const loopStart = Math.max(0, frames.length - 2);

      stateRef.current = {
        frames,
        frameIdx: 0,
        loopDone: false,
        raf: 0,
        lastTime: performance.now(),
        elapsed: 0,
      };

      const canvas = canvasRef.current!;
      canvas.width  = fw;
      canvas.height = fh;
      const ctx = canvas.getContext('2d')!;

      function drawFrame(idx: number) {
        ctx.clearRect(0, 0, fw, fh);
        // Flip horizontally if facing right (sprites face LEFT by default)
        if (facingRightRef.current) {
          ctx.save();
          ctx.translate(fw, 0);
          ctx.scale(-1, 1);
          ctx.putImageData(frames[idx].imageData, 0, 0);
          ctx.restore();
        } else {
          ctx.putImageData(frames[idx].imageData, 0, 0);
        }
      }

      drawFrame(0);

      function tick(now: number) {
        const s = stateRef.current!;
        s.raf = requestAnimationFrame(tick);

        if (!playingRef.current) {
          // Stopped — show frame 0 and reset so next move replays from start
          if (s.frameIdx !== 0 || s.loopDone) {
            s.frameIdx = 0;
            s.loopDone = false;
            s.elapsed  = 0;
            drawFrame(0);
          }
          s.lastTime = now;
          return;
        }

        const delta = now - s.lastTime;
        s.lastTime  = now;
        s.elapsed  += delta;

        const currentFrame = frames[s.frameIdx];
        if (s.elapsed >= currentFrame.delay) {
          s.elapsed -= currentFrame.delay;

          if (s.loopDone) {
            // Ping-pong between last 2 frames
            s.frameIdx = s.frameIdx === loopStart ? loopStart + 1 : loopStart;
          } else {
            s.frameIdx++;
            if (s.frameIdx >= frames.length) {
              s.frameIdx = loopStart;
              s.loopDone = true;
            }
          }
          drawFrame(s.frameIdx);
        }
      }

      stateRef.current.raf = requestAnimationFrame(tick);
    });

    return () => {
      cancelled = true;
      if (stateRef.current) cancelAnimationFrame(stateRef.current.raf);
    };
  }, []);

  // Strip transform from style — we handle facing inside the canvas draw
  const { transform: _ignored, ...styleWithoutTransform } = style ?? {};

  return (
    <canvas
      ref={canvasRef}
      width={size.w}
      height={size.h}
      style={{ imageRendering: 'pixelated', ...styleWithoutTransform }}
    />
  );
}
