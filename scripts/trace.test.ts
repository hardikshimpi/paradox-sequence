/**
 * Level design aid (not part of the normal test run):
 *   LEVEL=5 npx vitest run --config scripts/vitest.trace.config.ts
 * Prints each attempt's notable events and a map snapshot.
 */
import { it } from 'vitest';
import { COLS, ROWS, TILE, ticksToSeconds } from '../src/game/constants';
import { LEVELS } from '../src/game/levels';
import { LevelSession } from '../src/game/session';
import { END_ATTEMPT, ScriptBot } from '../src/game/solution';

function snapshot(s: LevelSession): string {
  const w = s.world;
  const grid = s.level.def.map.map((r) => r.split(''));
  for (const g of w.gates) if (!g.solid) for (let r = g.rect.y / TILE; r < (g.rect.y + g.rect.h) / TILE; r++) for (let c = g.rect.x / TILE; c < (g.rect.x + g.rect.w) / TILE; c++) grid[r][c] = g.kind === 'door' ? '_' : ' ';
  for (const p of w.platforms) grid[Math.floor(p.rect.y / TILE)][Math.floor((p.rect.x + p.rect.w / 2) / TILE)] = '=';
  for (const c of w.chars) {
    const col = Math.floor((c.x + 12) / TILE);
    const row = Math.floor((c.y + 18) / TILE);
    if (row >= 0 && row < ROWS && col >= 0 && col < COLS) grid[row][col] = !c.alive ? 'x' : c.kind === 'player' ? '@' : String(c.ghostNumber);
  }
  return grid.map((r, i) => String(i).padStart(2) + ' ' + r.join('')).join('\n');
}

it('trace', () => {
  const id = Number(process.env.LEVEL ?? 1);
  const def = LEVELS.find((l) => l.id === id)!;
  const s = new LevelSession(def);
  console.log(`\n=== Level ${id}: ${def.name} (limit ${def.timeLimit}s) ===`);
  console.log('   ' + Array.from({ length: COLS }, (_, i) => i % 10).join(''));
  def.solution.forEach((steps, a) => {
    const bot = new ScriptBot(steps);
    const before = s.stats.attempts;
    const log: string[] = [];
    for (;;) {
      const w = s.world;
      const input = bot.next(w.player, w.tick);
      if (input === END_ATTEMPT) {
        log.push(`  ${ticksToSeconds(w.tick).toFixed(2)}s END (pos col ${((w.player.x + 12) / TILE).toFixed(2)})`);
        console.log(`--- attempt ${a + 1} ---\n${log.join('\n')}\n${snapshot(s)}`);
        s.commitAttempt('manual');
        break;
      }
      const t = w.tick;
      const ev = s.step(input);
      for (const e of ev) {
        if (e.type === 'jump' || e.type === 'land') continue;
        log.push(`  ${ticksToSeconds(t).toFixed(2)}s ${JSON.stringify(e)}`);
      }
      if (s.status === 'complete') {
        console.log(`--- attempt ${a + 1} ---\n${log.join('\n')}\n${snapshot(s)}\nCOMPLETE at ${ticksToSeconds(w.tick).toFixed(2)}s, total ${ticksToSeconds(s.stats.totalTicks).toFixed(1)}s`);
        return;
      }
      if (s.stats.attempts !== before) {
        console.log(`--- attempt ${a + 1} (ended by ${ev.find((e) => e.type === 'loop' || e.type === 'restart')?.type}) ---\n${log.join('\n')}`);
        break;
      }
      if (bot.done && steps[steps.length - 1] !== 'expire' && a === def.solution.length - 1 && t > 60 * def.timeLimit) break;
    }
  });
  console.log(snapshot(s));
});
