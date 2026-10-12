/**
 * Level design aid: replays all but the last attempt, then prints the final attempt tick by tick.
 *   LEVEL=25 EVERY=10 TICKS=600 npx vitest run --config scripts/vitest.trace.config.ts scripts/debug.test.ts
 */
import { it } from 'vitest';
import { LEVELS } from '../src/game/levels';
import { LevelSession } from '../src/game/session';
import { END_ATTEMPT, ScriptBot } from '../src/game/solution';

it('debug', () => {
  const def = LEVELS.find((l) => l.id === Number(process.env.LEVEL))!;
  const s = new LevelSession(def);
  const upto = Number(process.env.ATTEMPT ?? def.solution.length) - 1;
  for (let a = 0; a < upto; a++) {
    const bot = new ScriptBot(def.solution[a]);
    const before = s.stats.attempts;
    for (let g = 0; g < 5000; g++) {
      const i = bot.next(s.world.player, s.world.tick);
      if (i === END_ATTEMPT) {
        s.commitAttempt('manual');
        break;
      }
      s.step(i);
      if (s.stats.attempts !== before) break;
    }
  }
  const bot = new ScriptBot(def.solution[upto]);
  const every = Number(process.env.EVERY ?? 10);
  for (let t = 0; t < Number(process.env.TICKS ?? 600); t++) {
    const w = s.world;
    const p = w.player;
    const i = bot.next(p, w.tick);
    if (i === END_ATTEMPT) break;
    const ev = s.step(i);
    if (t % every === 0 || ev.some((e) => e.type !== 'jump' && e.type !== 'land'))
      console.log(
        `t=${(t / 60).toFixed(2)} in=${i} x=${p.x.toFixed(0)} y=${p.y.toFixed(0)} ${p.grounded ? 'G' : 'A'}${p.alive ? '' : ' DEAD'}`,
        w.chars.slice(0, -1).map((c) => `g${c.ghostNumber}:${(c.x / 40).toFixed(1)},${(c.y / 40).toFixed(1)}${c.alive ? '' : '✝'}`).join(' '),
        ev.filter((e) => e.type !== 'jump' && e.type !== 'land').map((e) => JSON.stringify(e)).join(' '),
      );
    if (s.world !== w) {
      console.log('attempt ended', s.status);
      break;
    }
  }
});
