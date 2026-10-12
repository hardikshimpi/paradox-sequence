export type Sfx =
  | 'jump'
  | 'land'
  | 'plateOn'
  | 'plateOff'
  | 'switch'
  | 'door'
  | 'key'
  | 'unlock'
  | 'death'
  | 'loop'
  | 'restart'
  | 'complete'
  | 'click'
  | 'seq'
  | 'seqFail'
  | 'bounce'
  | 'teleport'
  | 'crumble';

/** Small procedural synth: no audio files needed. */
export class AudioEngine {
  private ctx: AudioContext | null = null;
  private master: GainNode | null = null;
  private sfxBus: GainNode | null = null;
  private musicBus: GainNode | null = null;
  private musicNodes: AudioNode[] = [];
  private musicOscs: OscillatorNode[] = [];
  private chord = [55, 82.41, 110, 164.81];
  private volumes = { master: 0.8, sfx: 0.8, music: 0.4 };
  private lastPlayed = new Map<Sfx, number>();

  /** Must be called from a user gesture at least once (browser autoplay policy). */
  unlock(): void {
    if (this.ctx) {
      if (this.ctx.state === 'suspended') void this.ctx.resume();
      return;
    }
    const Ctor = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!Ctor) return;
    try {
      this.ctx = new Ctor();
    } catch {
      return;
    }
    this.master = this.ctx.createGain();
    this.sfxBus = this.ctx.createGain();
    this.musicBus = this.ctx.createGain();
    this.sfxBus.connect(this.master);
    this.musicBus.connect(this.master);
    this.master.connect(this.ctx.destination);
    this.applyVolumes();
  }

  setVolumes(master: number, sfx: number, music: number): void {
    this.volumes = { master, sfx, music };
    this.applyVolumes();
  }

  private applyVolumes(): void {
    if (!this.ctx || !this.master || !this.sfxBus || !this.musicBus) return;
    const t = this.ctx.currentTime;
    this.master.gain.setTargetAtTime(this.volumes.master, t, 0.05);
    this.sfxBus.gain.setTargetAtTime(this.volumes.sfx * 0.5, t, 0.05);
    this.musicBus.gain.setTargetAtTime(this.volumes.music * 0.22, t, 0.3);
  }

  startMusic(): void {
    if (!this.ctx || !this.musicBus || this.musicNodes.length) return;
    const ctx = this.ctx;
    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = 600;
    filter.Q.value = 0.7;
    const lfo = ctx.createOscillator();
    const lfoGain = ctx.createGain();
    lfo.frequency.value = 0.05;
    lfoGain.gain.value = 260;
    lfo.connect(lfoGain).connect(filter.frequency);
    filter.connect(this.musicBus);
    const oscs = this.chord.map((f, i) => {
      const o = ctx.createOscillator();
      o.type = i % 2 ? 'triangle' : 'sawtooth';
      o.frequency.value = f;
      o.detune.value = (i - 1.5) * 6;
      const g = ctx.createGain();
      g.gain.value = i === 0 ? 0.35 : 0.12;
      o.connect(g).connect(filter);
      o.start();
      return o;
    });
    lfo.start();
    this.musicNodes = [filter, lfo, ...oscs];
    this.musicOscs = oscs;
  }

  /** Glide the ambient pad to a phase's chord. */
  setChord(chord: number[]): void {
    this.chord = chord;
    if (!this.ctx) return;
    const t = this.ctx.currentTime;
    this.musicOscs.forEach((o, i) => o.frequency.setTargetAtTime(chord[i % chord.length], t, 1.2));
  }

  stopMusic(): void {
    for (const n of this.musicNodes) {
      if (n instanceof OscillatorNode) n.stop();
      n.disconnect();
    }
    this.musicNodes = [];
    this.musicOscs = [];
  }

  play(name: Sfx): void {
    const ctx = this.ctx;
    const bus = this.sfxBus;
    if (!ctx || !bus || ctx.state !== 'running') return;
    const nowMs = performance.now();
    if ((this.lastPlayed.get(name) ?? 0) > nowMs - 40) return; // avoid stacking (many ghosts)
    this.lastPlayed.set(name, nowMs);
    const t = ctx.currentTime;
    const tone = (freq: number, dur: number, type: OscillatorType, vol: number, delay = 0, slideTo?: number): void => {
      const o = ctx.createOscillator();
      const g = ctx.createGain();
      o.type = type;
      o.frequency.setValueAtTime(freq, t + delay);
      if (slideTo) o.frequency.exponentialRampToValueAtTime(slideTo, t + delay + dur);
      g.gain.setValueAtTime(0, t + delay);
      g.gain.linearRampToValueAtTime(vol, t + delay + 0.008);
      g.gain.exponentialRampToValueAtTime(0.0001, t + delay + dur);
      o.connect(g).connect(bus);
      o.start(t + delay);
      o.stop(t + delay + dur + 0.02);
    };
    switch (name) {
      case 'jump':
        tone(320, 0.12, 'square', 0.08, 0, 560);
        break;
      case 'land':
        tone(140, 0.06, 'triangle', 0.08);
        break;
      case 'plateOn':
        tone(440, 0.12, 'triangle', 0.18);
        tone(660, 0.14, 'triangle', 0.12, 0.05);
        break;
      case 'plateOff':
        tone(520, 0.12, 'triangle', 0.12, 0, 330);
        break;
      case 'switch':
        tone(900, 0.04, 'square', 0.1);
        tone(600, 0.08, 'triangle', 0.14, 0.03);
        break;
      case 'door':
        tone(110, 0.25, 'sawtooth', 0.06, 0, 160);
        break;
      case 'key':
        [784, 988, 1319].forEach((f, i) => tone(f, 0.18, 'sine', 0.16, i * 0.06));
        break;
      case 'unlock':
        tone(392, 0.12, 'square', 0.08);
        tone(587, 0.2, 'triangle', 0.14, 0.08);
        break;
      case 'death':
        tone(300, 0.35, 'sawtooth', 0.14, 0, 60);
        break;
      case 'loop':
        tone(880, 0.5, 'sine', 0.12, 0, 220);
        tone(660, 0.5, 'triangle', 0.08, 0.05, 165);
        break;
      case 'restart':
        tone(500, 0.2, 'triangle', 0.1, 0, 250);
        break;
      case 'complete':
        [523, 659, 784, 1047].forEach((f, i) => tone(f, 0.4, 'triangle', 0.16, i * 0.09));
        break;
      case 'click':
        tone(700, 0.04, 'triangle', 0.08);
        break;
      case 'seq':
        tone(740, 0.15, 'sine', 0.16);
        break;
      case 'seqFail':
        tone(220, 0.25, 'square', 0.1, 0, 150);
        break;
      case 'bounce':
        tone(260, 0.22, 'sine', 0.16, 0, 780);
        break;
      case 'teleport':
        tone(1200, 0.18, 'sine', 0.12, 0, 300);
        tone(300, 0.18, 'triangle', 0.1, 0.08, 1100);
        break;
      case 'crumble':
        tone(90, 0.3, 'sawtooth', 0.1, 0, 45);
        tone(160, 0.12, 'square', 0.05, 0.02, 80);
        break;
    }
  }
}

export const audio = new AudioEngine();
