import { useEffect, useRef } from 'react';
import { TICK_MS } from '../game/constants';
import { getLevel } from '../game/levels';
import { LevelSession } from '../game/session';
import { END_ATTEMPT, ScriptBot } from '../game/solution';
import { Renderer } from '../engine/renderer';

/** The menu backdrop: a level's verified solution replaying itself, ghosts and all. */
export function DemoBackground({ levelId, reducedMotion }: { levelId: number; reducedMotion: boolean }) {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const canvas = ref.current;
    const def = getLevel(levelId);
    if (!canvas || !def) return;
    const renderer = new Renderer(canvas);
    let session = new LevelSession(def);
    let attempt = 0;
    let bot = new ScriptBot(def.solution[0]);
    let raf = 0;
    let last = performance.now();
    let acc = 0;
    let restartAt = 0;
    const opts = { ghostPaths: true, reducedMotion, highContrast: false, touch: false };

    const resize = () => {
      const r = canvas.getBoundingClientRect();
      renderer.resize(r.width, r.height, Math.min(2, window.devicePixelRatio || 1), { x: 0, y: 0, w: r.width, h: r.height });
    };
    const obs = new ResizeObserver(resize);
    obs.observe(canvas);
    resize();

    const tick = () => {
      if (session.status === 'complete') {
        if (!restartAt) restartAt = performance.now() + 1500;
        return;
      }
      const w = session.world;
      const input = bot.next(w.player, w.tick);
      const before = session.stats.attempts;
      if (input === END_ATTEMPT) session.commitAttempt('manual');
      else session.step(input);
      if (session.stats.attempts !== before) {
        attempt = Math.min(attempt + 1, def.solution.length - 1);
        bot = new ScriptBot(def.solution[attempt]);
      }
    };
    const frame = (now: number) => {
      raf = requestAnimationFrame(frame);
      acc += Math.min(100, now - last);
      last = now;
      if (restartAt && now > restartAt) {
        session = new LevelSession(def);
        attempt = 0;
        bot = new ScriptBot(def.solution[0]);
        restartAt = 0;
      }
      while (acc >= TICK_MS) {
        acc -= TICK_MS;
        tick();
      }
      renderer.render(session, acc / TICK_MS, now, opts);
    };
    raf = requestAnimationFrame(frame);
    return () => {
      cancelAnimationFrame(raf);
      obs.disconnect();
    };
  }, [levelId, reducedMotion]);
  return (
    <div className="screen-bg" aria-hidden>
      <canvas ref={ref} />
    </div>
  );
}
