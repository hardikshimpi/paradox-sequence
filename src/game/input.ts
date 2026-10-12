/**
 * Player input for one simulation tick, packed as a bitmask.
 * Recordings store these bits — never positions — so ghosts are re-simulated
 * through exactly the same rules as the live player.
 */
export const INPUT_LEFT = 1;
export const INPUT_RIGHT = 2;
export const INPUT_JUMP = 4;
export const INPUT_USE = 8;

export type InputBits = number;

export function describeInput(bits: InputBits): string {
  const parts: string[] = [];
  if (bits & INPUT_LEFT) parts.push('left');
  if (bits & INPUT_RIGHT) parts.push('right');
  if (bits & INPUT_JUMP) parts.push('jump');
  if (bits & INPUT_USE) parts.push('use');
  return parts.length ? parts.join('+') : 'idle';
}
