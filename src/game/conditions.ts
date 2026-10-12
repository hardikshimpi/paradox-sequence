import type { Cond } from './types';

export type Signals = Record<string, boolean>;

export function evalCond(cond: Cond, signals: Signals): boolean {
  if (typeof cond === 'string') {
    if (cond.startsWith('!')) return !signals[cond.slice(1)];
    return !!signals[cond];
  }
  if ('all' in cond) return cond.all.every((c) => evalCond(c, signals));
  return cond.any.some((c) => evalCond(c, signals));
}

/** Every source id referenced by a condition, in order of first appearance. */
export function condSources(cond: Cond | undefined): string[] {
  const out: string[] = [];
  const walk = (c: Cond): void => {
    if (typeof c === 'string') {
      const id = c.startsWith('!') ? c.slice(1) : c;
      if (!out.includes(id)) out.push(id);
    } else if ('all' in c) c.all.forEach(walk);
    else c.any.forEach(walk);
  };
  if (cond !== undefined) walk(cond);
  return out;
}
