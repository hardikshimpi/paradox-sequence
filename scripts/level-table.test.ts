/** Prints the README level tables:  npx vitest run --config scripts/vitest.trace.config.ts scripts/level-table.test.ts */
import { it } from 'vitest';
import { LEVELS } from '../src/game/levels';
import { PHASES } from '../src/game/phases';

it('table', () => {
  const out: string[] = [];
  for (const p of PHASES) {
    out.push(`### ${p.name} — levels ${p.first}–${p.last}`, '', `*${p.tagline}* New here: ${p.introduces}.`, '');
    out.push('| # | Level | Difficulty | Loop | Ghosts | Objective | Intended solution |', '|---|---|---|---|---|---|---|');
    for (const l of LEVELS.filter((l) => l.id >= p.first && l.id <= p.last)) {
      out.push(`| ${l.id} | ${l.name} | ${l.difficulty}/10 | ${l.timeLimit}s | ${l.solution.length - 1}${l.maxGhosts ? ` (max ${l.maxGhosts})` : ''} | ${l.objective} | ${l.intended} |`);
    }
    out.push('');
  }
  console.log('@@TABLE@@\n' + out.join('\n') + '\n@@END@@');
});
