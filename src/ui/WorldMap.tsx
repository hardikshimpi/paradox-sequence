import { useEffect, useMemo, useRef, useState, type CSSProperties } from 'react';
import { LEVELS } from '../game/levels';
import { PHASES, phaseOf } from '../game/phases';
import { THEMES } from '../engine/themes';
import { GHOST_HUES } from '../engine/palette';
import { drawWorldScene } from '../engine/worldScene';
import { continueLevel, type SaveData } from '../save/save';
import { BackIcon, LockIcon, StarIcon } from './Icons';

interface Props {
  save: SaveData;
  onOpenWorld(worldId: number): void;
  onBack(): void;
}

interface Node {
  x: number;
  y: number;
  r: number;
}

/** Node positions: a zigzag left→right in landscape, top→bottom in portrait. */
function layoutNodes(w: number, h: number): Node[] {
  const landscape = w >= h * 1.1;
  const top = landscape ? 78 : 96;
  const usableH = h - top - (landscape ? 52 : 40);
  if (landscape) {
    const r = Math.max(30, Math.min(w * 0.075, usableH * 0.2, 96));
    return PHASES.map((_, i) => ({
      x: w * (0.1 + i * 0.2),
      y: top + usableH * (i % 2 === 0 ? 0.62 : 0.3),
      r,
    }));
  }
  const r = Math.max(32, Math.min(w * 0.17, usableH * 0.075, 80));
  return PHASES.map((_, i) => ({
    x: w * (i % 2 === 0 ? 0.3 : 0.7),
    y: top + usableH * (0.08 + i * 0.21),
    r,
  }));
}

/** A smooth curve through the nodes, sampled as a polyline for drawing and for walking along. */
function pathPoints(nodes: Node[]): { x: number; y: number }[] {
  const pts: { x: number; y: number }[] = [];
  for (let i = 0; i < nodes.length - 1; i++) {
    const a = nodes[i];
    const b = nodes[i + 1];
    const mx = (a.x + b.x) / 2;
    const my = (a.y + b.y) / 2;
    const landscape = Math.abs(b.x - a.x) > Math.abs(b.y - a.y);
    const c1 = landscape ? { x: mx, y: a.y } : { x: a.x, y: my };
    const c2 = landscape ? { x: mx, y: b.y } : { x: b.x, y: my };
    for (let k = 0; k <= 40; k++) {
      const t = k / 40;
      const u = 1 - t;
      pts.push({
        x: u * u * u * a.x + 3 * u * u * t * c1.x + 3 * u * t * t * c2.x + t * t * t * b.x,
        y: u * u * u * a.y + 3 * u * u * t * c1.y + 3 * u * t * t * c2.y + t * t * t * b.y,
      });
    }
  }
  return pts;
}

export function WorldMap({ save, onOpenWorld, onBack }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const wrapRef = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState({ w: 1, h: 1 });
  const [shake, setShake] = useState<number | null>(null);
  const reduced = save.settings.reducedMotion;
  const here = phaseOf(continueLevel(save)).id;

  const stats = useMemo(
    () =>
      PHASES.map((p) => {
        const levels = LEVELS.filter((l) => l.id >= p.first && l.id <= p.last);
        return {
          done: levels.filter((l) => save.levels[l.id]).length,
          stars: levels.reduce((n, l) => n + (save.levels[l.id]?.stars ?? 0), 0),
          sealed: p.first > save.unlocked,
        };
      }),
    [save],
  );
  const totalDone = stats.reduce((n, s) => n + s.done, 0);
  const totalStars = stats.reduce((n, s) => n + s.stars, 0);
  const nodes = useMemo(() => layoutNodes(size.w, size.h), [size]);

  useEffect(() => {
    const el = wrapRef.current;
    if (!el) return;
    const obs = new ResizeObserver(() => {
      const r = el.getBoundingClientRect();
      setSize({ w: Math.max(1, r.width), h: Math.max(1, r.height) });
    });
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx || size.w < 2) return;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = Math.round(size.w * dpr);
    canvas.height = Math.round(size.h * dpr);
    const pts = pathPoints(nodes);
    // Path index where each node sits (every 41 samples).
    const nodeIndex = (i: number) => Math.min(pts.length - 1, i * 41);
    let raf = 0;

    const draw = (now: number) => {
      const t = reduced ? 6000 : now;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      const bg = ctx.createLinearGradient(0, 0, size.w, size.h);
      bg.addColorStop(0, '#05070f');
      bg.addColorStop(0.5, '#0a0d1d');
      bg.addColorStop(1, '#070510');
      ctx.fillStyle = bg;
      ctx.fillRect(0, 0, size.w, size.h);
      // Each world casts a faint glow of its own colour onto the map.
      PHASES.forEach((p, i) => {
        const n = nodes[i];
        const g = ctx.createRadialGradient(n.x, n.y, 0, n.x, n.y, n.r * 3.2);
        g.addColorStop(0, `${THEMES[p.theme].accent}${stats[i].sealed ? '10' : '2a'}`);
        g.addColorStop(1, 'rgba(0,0,0,0)');
        ctx.fillStyle = g;
        ctx.fillRect(0, 0, size.w, size.h);
      });
      // Faint star dust.
      for (let i = 0; i < 90; i++) {
        const x = (i * 9301 + 49297) % 233280 / 233280 * size.w;
        const y = (i * 4096 + 150889) % 714025 / 714025 * size.h;
        const tw = 0.3 + 0.7 * Math.abs(Math.sin(t / 1400 + i));
        ctx.fillStyle = `rgba(200,210,255,${0.06 + tw * 0.14})`;
        ctx.fillRect(x, y, 1.5, 1.5);
      }

      // The road between worlds: lit up to the furthest unlocked world.
      const reach = nodeIndex(Math.max(0, stats.filter((s) => !s.sealed).length - 1));
      ctx.lineCap = 'round';
      ctx.lineWidth = 3;
      ctx.setLineDash([2, 9]);
      ctx.strokeStyle = 'rgba(140,150,200,0.28)';
      ctx.beginPath();
      pts.forEach((p, i) => (i ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y)));
      ctx.stroke();
      ctx.setLineDash([]);
      if (reach > 0) {
        ctx.strokeStyle = 'rgba(255,215,106,0.55)';
        ctx.shadowColor = 'rgba(255,215,106,0.6)';
        ctx.shadowBlur = 10;
        ctx.beginPath();
        pts.slice(0, reach + 1).forEach((p, i) => (i ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y)));
        ctx.stroke();
        ctx.shadowBlur = 0;
      }

      // World windows: each a live miniature of its key art.
      PHASES.forEach((p, i) => {
        const n = nodes[i];
        const sealed = stats[i].sealed;
        const pulse = reduced ? 0 : Math.sin(t / 700 + i) * 2;
        ctx.save();
        ctx.beginPath();
        ctx.arc(n.x, n.y, n.r, 0, Math.PI * 2);
        ctx.clip();
        const side = n.r * 2;
        ctx.translate(n.x - n.r * 1.6, n.y - n.r);
        drawWorldScene(ctx, n.r * 3.2, side, THEMES[p.theme], t + i * 3000, 'full');
        ctx.restore();
        if (sealed) {
          ctx.fillStyle = 'rgba(4,6,14,0.72)';
          ctx.beginPath();
          ctx.arc(n.x, n.y, n.r, 0, Math.PI * 2);
          ctx.fill();
        }
        ctx.lineWidth = i + 1 === here ? 4 : 2.5;
        ctx.strokeStyle = sealed ? 'rgba(140,150,190,0.45)' : THEMES[p.theme].accent;
        ctx.shadowColor = THEMES[p.theme].accent;
        ctx.shadowBlur = sealed ? 0 : 16 + pulse * 3;
        ctx.beginPath();
        ctx.arc(n.x, n.y, n.r + 1, 0, Math.PI * 2);
        ctx.stroke();
        ctx.shadowBlur = 0;
        // Progress ring.
        const frac = stats[i].done / 15;
        if (frac > 0) {
          ctx.strokeStyle = '#ffd76a';
          ctx.lineWidth = 3;
          ctx.beginPath();
          ctx.arc(n.x, n.y, n.r + 7, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * frac);
          ctx.stroke();
        }
      });

      // You are here — with your echoes trailing back along the road.
      const at = nodeIndex(here - 1);
      const node = nodes[here - 1];
      const bob = reduced ? 0 : Math.sin(t / 300) * 2;
      const fig = Math.max(14, node.r * 0.32);
      for (let k = 4; k >= 1; k--) {
        const idx = Math.max(0, at - k * 7 - (reduced ? 0 : Math.floor((t / 120) % 7)));
        const pt = pts[idx];
        if (!pt || at === 0) continue;
        ctx.fillStyle = `hsla(${GHOST_HUES[(k - 1) % GHOST_HUES.length]},85%,72%,${0.12 + (5 - k) * 0.05})`;
        ctx.beginPath();
        ctx.roundRect(pt.x - fig * 0.3, pt.y - fig * 0.5, fig * 0.6, fig * 0.9, fig * 0.2);
        ctx.fill();
      }
      const mx = node.x;
      const my = node.y - node.r - fig * 0.9 + bob;
      ctx.shadowColor = 'rgba(255,215,106,0.8)';
      ctx.shadowBlur = 14;
      ctx.fillStyle = '#ffd76a';
      ctx.beginPath();
      ctx.roundRect(mx - fig * 0.33, my - fig * 0.5, fig * 0.66, fig, fig * 0.22);
      ctx.fill();
      ctx.shadowBlur = 0;
      ctx.fillStyle = '#2b2108';
      ctx.beginPath();
      ctx.roundRect(mx - fig * 0.05, my - fig * 0.3, fig * 0.32, fig * 0.2, fig * 0.1);
      ctx.fill();
    };

    const loop = (now: number) => {
      raf = requestAnimationFrame(loop);
      if (!document.hidden) draw(now);
    };
    draw(performance.now());
    if (!reduced) raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [nodes, size, stats, here, reduced]);

  const open = (i: number) => {
    if (stats[i].sealed) {
      setShake(i);
      window.setTimeout(() => setShake(null), 450);
      return;
    }
    onOpenWorld(i + 1);
  };

  return (
    <div className="world-map" ref={wrapRef} data-testid="world-map">
      <canvas ref={canvasRef} className="world-map-canvas" aria-hidden />
      <header className="map-head">
        <button className="btn btn-ghost" onClick={onBack}>
          <BackIcon /> Back
        </button>
        <h2>World Map</h2>
        <span className="map-total">
          {totalDone}/{LEVELS.length} · {totalStars}★
        </span>
      </header>
      {PHASES.map((p, i) => {
        const n = nodes[i];
        const s = stats[i];
        const style = {
          left: n.x,
          top: n.y,
          width: n.r * 2,
          height: n.r * 2,
          '--node': THEMES[p.theme].accent,
        } as CSSProperties;
        return (
          <button
            key={p.id}
            className={`map-node${s.sealed ? ' sealed' : ''}${p.id === here ? ' here' : ''}${shake === i ? ' shake' : ''}`}
            style={style}
            onClick={() => open(i)}
            aria-label={`${p.name}: ${s.sealed ? 'sealed' : `${s.done} of 15 cleared, ${s.stars} stars`}`}
            data-testid={`map-${p.theme}`}
          >
            <span className="map-label">
              <strong>{p.name}</strong>
              <span>
                {s.sealed ? (
                  <>
                    <LockIcon /> Sealed
                  </>
                ) : (
                  <>
                    {s.done}/15 · {s.stars}
                    <StarIcon size={11} />
                  </>
                )}
              </span>
            </span>
          </button>
        );
      })}
    </div>
  );
}
