import { describe, expect, it } from 'vitest';
import { INPUT_JUMP, INPUT_LEFT, INPUT_RIGHT, INPUT_USE } from './input';
import { Recording, RecordingBuilder } from './recording';

describe('attempt recording', () => {
  it('stores input changes as ordered, timestamped events', () => {
    const b = new RecordingBuilder();
    const inputs = [0, 0, INPUT_RIGHT, INPUT_RIGHT, INPUT_RIGHT | INPUT_JUMP, INPUT_RIGHT, 0, INPUT_USE, 0];
    inputs.forEach((bits, t) => b.push(t, bits));
    const r = b.finish();
    expect(r.events).toEqual([
      { tick: 2, bits: INPUT_RIGHT },
      { tick: 4, bits: INPUT_RIGHT | INPUT_JUMP },
      { tick: 5, bits: INPUT_RIGHT },
      { tick: 6, bits: 0 },
      { tick: 7, bits: INPUT_USE },
      { tick: 8, bits: 0 },
    ]);
    expect(r.length).toBe(inputs.length);
    for (let i = 1; i < r.events.length; i++) expect(r.events[i].tick).toBeGreaterThan(r.events[i - 1].tick);
  });

  it('plays back exactly the recorded input on every tick', () => {
    const b = new RecordingBuilder();
    const inputs = Array.from({ length: 120 }, (_, t) => (t % 7 === 0 ? INPUT_JUMP : t % 3 === 0 ? INPUT_LEFT : INPUT_RIGHT));
    inputs.forEach((bits, t) => b.push(t, bits));
    const r = b.finish();
    inputs.forEach((bits, t) => expect(r.inputAt(t)).toBe(bits));
  });

  it('is idle before the start and after the recording ends', () => {
    const r = new Recording([{ tick: 0, bits: INPUT_RIGHT }], 10);
    expect(r.inputAt(-1)).toBe(0);
    expect(r.inputAt(9)).toBe(INPUT_RIGHT);
    expect(r.inputAt(10)).toBe(0);
    expect(r.inputAt(5000)).toBe(0);
  });

  it('records input held from the very first tick', () => {
    const b = new RecordingBuilder();
    b.push(0, INPUT_LEFT);
    b.push(1, INPUT_LEFT);
    expect(b.finish().events).toEqual([{ tick: 0, bits: INPUT_LEFT }]);
  });

  it('rejects gaps or out-of-order ticks', () => {
    const b = new RecordingBuilder();
    b.push(0, 0);
    expect(() => b.push(2, 0)).toThrow();
    expect(() => new Recording([{ tick: 5, bits: 1 }, { tick: 5, bits: 2 }], 10)).toThrow();
  });
});
