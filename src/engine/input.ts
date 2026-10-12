import { INPUT_JUMP, INPUT_LEFT, INPUT_RIGHT, INPUT_USE, type InputBits } from '../game/input';

export type Command = 'pause' | 'hint' | 'restartAttempt' | 'restartLevel' | 'loopNow';

const MOVE_KEYS: Record<string, InputBits> = {
  ArrowLeft: INPUT_LEFT,
  KeyA: INPUT_LEFT,
  ArrowRight: INPUT_RIGHT,
  KeyD: INPUT_RIGHT,
  ArrowUp: INPUT_JUMP,
  KeyW: INPUT_JUMP,
  Space: INPUT_JUMP,
  KeyE: INPUT_USE,
  KeyS: INPUT_USE,
  ArrowDown: INPUT_USE,
};

export const KEY_HELP: { keys: string; action: string }[] = [
  { keys: 'A / D  or  ← / →', action: 'Move' },
  { keys: 'W / ↑ / Space', action: 'Jump' },
  { keys: 'E / S / ↓', action: 'Interact (switches)' },
  { keys: 'T', action: 'Loop Now — keep this attempt as a ghost' },
  { keys: 'R', action: 'Restart Attempt — keeps your ghosts' },
  { keys: 'Shift + R', action: 'Restart Level — clears all ghosts' },
  { keys: 'H', action: 'Hints' },
  { keys: 'Esc / P', action: 'Pause' },
];

/**
 * Turns keyboard and on-screen buttons into per-tick input bits.
 * Short taps between two ticks are latched so a quick jump is never lost.
 */
export class InputManager {
  private keyBits = new Map<string, InputBits>();
  private virtual = 0;
  private latched = 0;
  private enabled = true;

  constructor(private onCommand: (c: Command) => void) {}

  attach(): void {
    window.addEventListener('keydown', this.keydown);
    window.addEventListener('keyup', this.keyup);
    window.addEventListener('blur', this.clear);
  }

  detach(): void {
    window.removeEventListener('keydown', this.keydown);
    window.removeEventListener('keyup', this.keyup);
    window.removeEventListener('blur', this.clear);
  }

  /** While disabled (menus open) gameplay keys are ignored. */
  setEnabled(on: boolean): void {
    this.enabled = on;
    if (!on) this.clear();
  }

  setVirtual(bit: InputBits, down: boolean): void {
    if (down) {
      this.virtual |= bit;
      this.latched |= bit;
    } else this.virtual &= ~bit;
  }

  /** Bits for the next simulation tick. */
  sample(): InputBits {
    let bits = this.virtual | this.latched;
    for (const b of this.keyBits.values()) bits |= b;
    this.latched = 0;
    return bits;
  }

  clear = (): void => {
    this.keyBits.clear();
    this.virtual = 0;
    this.latched = 0;
  };

  private keydown = (e: KeyboardEvent): void => {
    if (e.target instanceof HTMLInputElement || e.target instanceof HTMLSelectElement) return;
    if (e.code === 'Escape' || e.code === 'KeyP') {
      e.preventDefault();
      if (!e.repeat) this.onCommand('pause');
      return;
    }
    if (!this.enabled) return;
    const bit = MOVE_KEYS[e.code];
    if (bit !== undefined) {
      e.preventDefault();
      if (!this.keyBits.has(e.code)) this.latched |= bit;
      this.keyBits.set(e.code, bit);
      return;
    }
    if (e.repeat) return;
    if (e.code === 'KeyR') this.onCommand(e.shiftKey ? 'restartLevel' : 'restartAttempt');
    else if (e.code === 'KeyT') this.onCommand('loopNow');
    else if (e.code === 'KeyH') this.onCommand('hint');
  };

  private keyup = (e: KeyboardEvent): void => {
    this.keyBits.delete(e.code);
  };
}
