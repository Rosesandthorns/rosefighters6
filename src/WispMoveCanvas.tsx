import React, { useEffect, useRef, useState } from 'react';
import { parseGIF, decompressFrames } from 'gifuct-js';

interface Props {
  key?: React.Key;
  playing: boolean;       // true = wisp is moving
  style?: React.CSSProperties;
}

interface DecodedFrame {
  imageData: ImageData;
  delay: number;          // ms
  disposalType: number;
}

// Singleton: decode WispMove.gif once, share across all instances
let cachedFrames: DecodedFrame[] | null = null;
let cachePromise: Promise<DecodedFrame[]> | null = null;

function loadFrames(): Promise<DecodedFrame[]> {
  if (cachedFrames) return Promise.resolve(cachedFrames);
  if (cachePromise) return cachePromise;

  cachePromise = fetch('/Wisp/WispMove.gif')
    .then(r => r.arrayBuffer())
    .then(buf => {
      const gif = parseGIF(buf);
      const raw = decompressFrames(gif, true); // patch = true → full frame ImageData

      const offscreen = document.createElement('canvas');
      const ctx = offscreen.getContext('2d')!;

      const frames: DecodedFrame[] = raw.map(f => {
        offscreen.width  = f.dims.width;
        offscreen.height = f.dims.height;
        ctx.clearRect(0, 0, offscreen.width, offscreen.height);
        const id = ctx.createImageData(f.dims.width, f.dims.height);
        id.data.set(f.patch);
        ctx.putImageData(id, 0, 0);
        return {
          imageData: ctx.getImageData(0, 0, f.dims.width, f.dims.height),
          delay: (f.delay || 10) * 10,   // centiseconds → ms
          disposalType: f.disposalType ?? 0,
        };
      });

      cachedFrames = frames;
      return frames;
    });

  return cachePromise;
}

export default function WispMoveCanvas({ playing, style }: Props): React.ReactElement | null {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const stateRef  = useRef<{
    frames: DecodedFrame[];
    frameIdx: number;
    loopDone: boolean;   // true once the full animation has played through once
    raf: number;
    lastTime: number;
    elapsed: number;
  } | null>(null);
  const playingRef = useRef(playing);
  playingRef.current = playing;

  const [size, setSize] = useState({ w: 1, h: 1 });

  useEffect(() => {
    let cancelled = false;

    loadFrames().then(frames => {
      if (cancelled || !canvasRef.current || frames.length === 0) return;

      // Derive canvas size from first frame
      const fw = frames[0].imageData.width;
      const fh = frames[0].imageData.height;
      setSize({ w: fw, h: fh });

      const loopStart = Math.max(0, frames.length - 2); // index of first "loop" frame

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
        ctx.putImageData(frames[idx].imageData, 0, 0);
      }

      drawFrame(0);

      function tick(now: number) {
        const s = stateRef.current!;
        s.raf = requestAnimationFrame(tick);

        if (!playingRef.current) {
          // Stopped — show idle (frame 0) and reset so next move starts fresh
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
            // Already finished intro — ping-pong between last 2 frames
            s.frameIdx = s.frameIdx === loopStart ? loopStart + 1 : loopStart;
          } else {
            s.frameIdx++;
            if (s.frameIdx >= frames.length) {
              // Intro complete — lock into 2-frame loop
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

  return (
    <canvas
      ref={canvasRef}
      width={size.w}
      height={size.h}
      style={{ imageRendering: 'pixelated', ...style }}
    />
  );
}
