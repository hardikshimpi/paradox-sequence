import { useEffect, useRef } from 'react';
import type { ThemeId } from '../game/phases';
import { THEMES } from '../engine/themes';
import { drawWorldScene, type SceneLayout } from '../engine/worldScene';

interface Props {
  world: ThemeId;
  reducedMotion: boolean;
  layout?: SceneLayout;
  className?: string;
}

/** A live, animated backdrop for one world. Draws a single still frame under reduced motion. */
export function WorldScene({ world, reducedMotion, layout = 'full', className }: Props) {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const canvas = ref.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx) return;
    const theme = THEMES[world];
    let raf = 0;
    let cssW = 1;
    let cssH = 1;
    const draw = (now: number) => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      drawWorldScene(ctx, cssW, cssH, theme, reducedMotion ? 6000 : now, layout);
    };
    const resize = () => {
      const r = canvas.getBoundingClientRect();
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      cssW = Math.max(1, r.width);
      cssH = Math.max(1, r.height);
      canvas.width = Math.round(cssW * dpr);
      canvas.height = Math.round(cssH * dpr);
      draw(performance.now());
    };
    const obs = new ResizeObserver(resize);
    obs.observe(canvas);
    resize();
    const loop = (now: number) => {
      raf = requestAnimationFrame(loop);
      if (!document.hidden) draw(now);
    };
    if (!reducedMotion) raf = requestAnimationFrame(loop);
    return () => {
      cancelAnimationFrame(raf);
      obs.disconnect();
    };
  }, [world, reducedMotion, layout]);
  return <canvas ref={ref} className={className} aria-hidden />;
}

/** A small emblem for each world. */
export function WorldIcon({ world, size = 18 }: { world: ThemeId; size?: number }) {
  const p = { width: size, height: size, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 1.8, strokeLinecap: 'round' as const, 'aria-hidden': true };
  switch (world) {
    case 'echo':
      return (
        <svg {...p}>
          <circle cx="12" cy="12" r="3" />
          <circle cx="12" cy="12" r="6.5" strokeDasharray="2.5 2.5" />
          <circle cx="12" cy="12" r="10" strokeDasharray="1.5 3" />
        </svg>
      );
    case 'foundry':
      return (
        <svg {...p}>
          <circle cx="12" cy="12" r="3" />
          <path d="M12 2v3M12 19v3M2 12h3M19 12h3M4.9 4.9l2.1 2.1M17 17l2.1 2.1M4.9 19.1L7 17M17 7l2.1-2.1" />
          <circle cx="12" cy="12" r="6.5" />
        </svg>
      );
    case 'tide':
      return (
        <svg {...p}>
          <path d="M2 15c2.5 0 2.5-2 5-2s2.5 2 5 2 2.5-2 5-2 2.5 2 5 2" />
          <path d="M2 19c2.5 0 2.5-2 5-2s2.5 2 5 2 2.5-2 5-2 2.5 2 5 2" />
          <circle cx="15" cy="6" r="2" />
          <circle cx="9" cy="9" r="1.2" />
        </svg>
      );
    case 'neon':
      return (
        <svg {...p}>
          <path d="M3 21V11h4v10M9 21V5h5v16M16 21v-8h5v8" />
          <path d="M11 8h1M11 11h1M11 14h1" />
        </svg>
      );
    case 'horizon':
      return (
        <svg {...p}>
          <ellipse cx="12" cy="12" rx="10" ry="3.5" transform="rotate(-12 12 12)" />
          <circle cx="12" cy="12" r="4" fill="currentColor" />
        </svg>
      );
  }
}
