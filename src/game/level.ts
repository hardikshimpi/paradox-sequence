import { CHAR_H, CHAR_W, COLS, ROWS, TILE } from './constants';
import { condSources } from './conditions';
import type { LevelDef, ObjectSpec, Rect } from './types';

export const TILE_EMPTY = 0;
export const TILE_WALL = 1;
export const TILE_SPIKE = 2;
export const TILE_LEDGE = 3;

export interface ParsedObject {
  id: string;
  spec: ObjectSpec;
  /** Bounding rectangle of the object's map cells, in world units. */
  rect: Rect;
}

export interface LevelData {
  def: LevelDef;
  tiles: Uint8Array;
  /** Top-left of a character standing on the spawn cell. */
  spawn: { x: number; y: number };
  exit: Rect;
  objects: ParsedObject[];
  /** Signal sources (plates, switches, sequences) → stable channel index for colour/glyph coding. */
  channels: Record<string, number>;
}

const SOURCE_TYPES = new Set(['plate', 'switch', 'sequence']);

export function tileAt(level: LevelData, col: number, row: number): number {
  if (col < 0 || row < 0 || col >= COLS || row >= ROWS) return TILE_WALL;
  return level.tiles[row * COLS + col];
}

export function parseLevel(def: LevelDef): LevelData {
  const fail = (msg: string): never => {
    throw new Error(`Level ${def.id} (${def.name}): ${msg}`);
  };
  if (def.map.length !== ROWS) fail(`map must have ${ROWS} rows, has ${def.map.length}`);

  const tiles = new Uint8Array(COLS * ROWS);
  const cells = new Map<string, { col: number; row: number }[]>();
  let spawn: { col: number; row: number } | null = null;
  const exitCells: { col: number; row: number }[] = [];

  def.map.forEach((line, row) => {
    if (line.length !== COLS) fail(`row ${row} must have ${COLS} columns, has ${line.length}`);
    for (let col = 0; col < COLS; col++) {
      const ch = line[col];
      const i = row * COLS + col;
      if (ch === '#') tiles[i] = TILE_WALL;
      else if (ch === '^') tiles[i] = TILE_SPIKE;
      else if (ch === '-') tiles[i] = TILE_LEDGE;
      else if (ch === '.') continue;
      else if (ch === 'S') {
        if (spawn) fail('more than one spawn');
        spawn = { col, row };
      } else if (ch === 'E') exitCells.push({ col, row });
      else if (/[A-Za-z]/.test(ch)) {
        if (!def.legend[ch]) fail(`map letter "${ch}" has no legend entry`);
        const list = cells.get(ch) ?? [];
        list.push({ col, row });
        cells.set(ch, list);
      } else fail(`unknown map character "${ch}" at ${col},${row}`);
    }
  });

  if (!spawn) fail('missing spawn S');
  if (exitCells.length === 0) fail('missing exit E');

  const bounds = (list: { col: number; row: number }[]): Rect => {
    const minC = Math.min(...list.map((c) => c.col));
    const maxC = Math.max(...list.map((c) => c.col));
    const minR = Math.min(...list.map((c) => c.row));
    const maxR = Math.max(...list.map((c) => c.row));
    return { x: minC * TILE, y: minR * TILE, w: (maxC - minC + 1) * TILE, h: (maxR - minR + 1) * TILE };
  };

  const objects: ParsedObject[] = [];
  for (const [id, spec] of Object.entries(def.legend)) {
    if (spec.at) {
      if (cells.has(id)) fail(`legend entry "${id}" has "at" and is also drawn on the map`);
      const [col, row, w, h] = spec.at;
      objects.push({ id, spec, rect: { x: col * TILE, y: row * TILE, w: w * TILE, h: h * TILE } });
      continue;
    }
    const list = cells.get(id);
    if (!list) fail(`legend entry "${id}" is not placed on the map`);
    if (spec.type === 'crumble') {
      // Every crumbling tile breaks on its own.
      list!.forEach((cell, i) => objects.push({ id: `${id}${i}`, spec, rect: bounds([cell]) }));
      continue;
    }
    objects.push({ id, spec, rect: bounds(list!) });
  }

  const ids = new Set(objects.map((o) => o.id));
  const sourceIds = new Set(objects.filter((o) => SOURCE_TYPES.has(o.spec.type) || o.spec.type === 'lock').map((o) => o.id));
  const checkCond = (owner: string, cond: Parameters<typeof condSources>[0]): void => {
    for (const ref of condSources(cond)) {
      if (!ids.has(ref)) fail(`"${owner}" references unknown object "${ref}"`);
      if (!sourceIds.has(ref)) fail(`"${owner}" references "${ref}", which is not a signal source`);
    }
  };
  for (const o of objects) {
    const s = o.spec;
    if (s.type === 'door' || s.type === 'bridge') checkCond(o.id, s.when);
    if (s.type === 'door' && s.when === undefined && !s.cycle) fail(`door "${o.id}" needs "when" or "cycle"`);
    if (s.type === 'conveyor') {
      checkCond(o.id, s.when);
      checkCond(o.id, s.reverse);
    }
    if (s.type === 'pad' || s.type === 'portal') checkCond(o.id, s.when);
    if (s.type === 'portal' && s.to !== undefined) {
      const dest = objects.find((d) => d.id === s.to);
      if (!dest || dest.spec.type !== 'portal') fail(`portal "${o.id}" leads to "${s.to}", which is not a portal`);
    }
    if (s.type === 'platform' || s.type === 'laser') checkCond(o.id, s.when);
    if (s.type === 'sequence') s.inputs.forEach((ref) => checkCond(o.id, ref));
    if (s.type === 'laser' && !s.when && !s.cycle && s.startsAt === undefined) fail(`laser "${o.id}" needs "when", "cycle" or "startsAt"`);
  }
  checkCond('exit', def.exitWhen);

  const channels: Record<string, number> = {};
  let next = 0;
  for (const o of objects) if (SOURCE_TYPES.has(o.spec.type)) channels[o.id] = next++;

  const sp = spawn as unknown as { col: number; row: number };
  return {
    def,
    tiles,
    spawn: { x: sp.col * TILE + (TILE - CHAR_W) / 2, y: (sp.row + 1) * TILE - CHAR_H },
    exit: bounds(exitCells),
    objects,
    channels,
  };
}
