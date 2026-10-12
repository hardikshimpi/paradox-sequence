/** World geometry (in world units; 1 unit = 1 canvas pixel at scale 1). */
export const TILE = 40;
export const COLS = 24;
export const ROWS = 14;
export const WORLD_W = COLS * TILE;
export const WORLD_H = ROWS * TILE;

/** Fixed simulation timestep. All gameplay runs in whole ticks. */
export const TICK_RATE = 60;
export const TICK_MS = 1000 / TICK_RATE;

/** Character body. */
export const CHAR_W = 24;
export const CHAR_H = 36;

/** Movement tuning. Velocity is instant (no acceleration) for predictable, replayable motion. */
export const MOVE_SPEED = 3.6; // units per tick  (~5.4 tiles / second)
export const GRAVITY = 0.55; // units per tick^2
export const JUMP_VELOCITY = 10.8; // apex ~100 units: clears 2 tiles, never 3
export const MAX_FALL_SPEED = 13;
export const COYOTE_TICKS = 6;
export const JUMP_BUFFER_TICKS = 6;

/** Hitbox forgiveness for hazards (units trimmed from each side). */
export const HAZARD_INSET = 4;
/** How far outside a switch an interaction still reaches. */
export const INTERACT_REACH = 8;

/** Upper bound on ghosts when a level does not limit them. */
export const DEFAULT_MAX_GHOSTS = 6;

export const secondsToTicks = (s: number): number => Math.round(s * TICK_RATE);
export const ticksToSeconds = (t: number): number => t / TICK_RATE;
