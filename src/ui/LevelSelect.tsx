import { useMemo, useRef, useState, type CSSProperties, type KeyboardEvent } from 'react';
import { LEVELS } from '../game/levels';
import { PHASES, phaseOf } from '../game/phases';
import { THEMES } from '../engine/themes';
import { continueLevel, type SaveData } from '../save/save';
import { BackIcon, LockIcon, StarIcon } from './Icons';
import { WorldIcon, WorldScene } from './WorldScene';

export function Stars({ n }: { n: number }) {
  return (
    <span className="stars" aria-label={`${n} of 3 stars`}>
      {[1, 2, 3].map((i) => (
        <span key={i} className={i <= n ? '' : 'off'}>
          <StarIcon size={13} />
        </span>
      ))}
    </span>
  );
}

/** Difficulty on a 1–10 scale, drawn as five half-filled pips. */
export function Difficulty({ n }: { n: number }) {
  return (
    <span className="difficulty" aria-label={`Difficulty ${n} of 10`} title={`Difficulty ${n}/10`}>
      {[1, 2, 3, 4, 5].map((i) => (
        <i key={i} className={n >= i * 2 ? 'on' : n >= i * 2 - 1 ? 'half' : ''} />
      ))}
    </span>
  );
}

export function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds - m * 60;
  return `${m}:${s.toFixed(1).padStart(4, '0')}`;
}

interface Props {
  save: SaveData;
  /** World to show first (defaults to the one you are playing). */
  initialWorld?: number;
  onPlay(level: number): void;
  onBack(): void;
}

export function LevelSelect({ save, initialWorld, onPlay, onBack }: Props) {
  const current = continueLevel(save);
  const [worldId, setWorldId] = useState(() => initialWorld ?? phaseOf(current).id);
  const tabs = useRef<(HTMLButtonElement | null)[]>([]);
  const world = PHASES[worldId - 1];
  const theme = THEMES[world.theme];
  const levels = useMemo(() => LEVELS.filter((l) => l.id >= world.first && l.id <= world.last), [world]);
  const sealed = world.first > save.unlocked;
  const done = levels.filter((l) => save.levels[l.id]).length;
  const stars = levels.reduce((n, l) => n + (save.levels[l.id]?.stars ?? 0), 0);
  const previous = PHASES[worldId - 2];

  const onTabKey = (e: KeyboardEvent) => {
    const delta = e.key === 'ArrowRight' ? 1 : e.key === 'ArrowLeft' ? -1 : 0;
    if (!delta) return;
    e.preventDefault();
    const next = ((worldId - 1 + delta + PHASES.length) % PHASES.length) + 1;
    setWorldId(next);
    tabs.current[next - 1]?.focus();
  };

  return (
    <div className="screen">
      <section className="panel panel-wide worlds" aria-labelledby="ls-title" style={{ '--phase': theme.accent } as CSSProperties}>
        <div className="panel-head">
          <h2 id="ls-title">Choose your world</h2>
          <button className="btn btn-ghost" onClick={onBack}>
            <BackIcon /> World Map
          </button>
        </div>

        <div className="world-tabs" role="tablist" aria-label="Worlds" onKeyDown={onTabKey}>
          {PHASES.map((p, i) => {
            const locked = p.first > save.unlocked;
            const cleared = LEVELS.filter((l) => l.id >= p.first && l.id <= p.last).every((l) => save.levels[l.id]);
            return (
              <button
                key={p.id}
                ref={(el) => {
                  tabs.current[i] = el;
                }}
                role="tab"
                aria-label={`${p.name}${locked ? ' (sealed)' : cleared ? ' (cleared)' : ''}`}
                aria-selected={p.id === worldId}
                tabIndex={p.id === worldId ? 0 : -1}
                className={`world-tab${locked ? ' sealed' : ''}`}
                style={{ '--tab': THEMES[p.theme].accent } as CSSProperties}
                onClick={() => setWorldId(p.id)}
                data-testid={`world-${p.theme}`}
              >
                <WorldIcon world={p.theme} />
                <span>{p.name}</span>
                {locked ? <LockIcon /> : cleared ? <StarIcon size={12} /> : null}
              </button>
            );
          })}
        </div>

        <div className={`world-banner${sealed ? ' sealed' : ''}`} key={world.id}>
          <WorldScene world={world.theme} reducedMotion={save.settings.reducedMotion} layout="banner" className="world-canvas" />
          <div className="world-banner-text">
            <h3>{world.name}</h3>
            <p>{world.tagline}</p>
            {sealed ? (
              <span className="world-chip">
                <LockIcon /> Sealed — clear {previous?.name ?? 'the previous world'} to enter
              </span>
            ) : (
              <span className="world-chip">New here: {world.introduces}</span>
            )}
          </div>
          <span className="world-progress">
            {done}/{levels.length} · {stars}★
          </span>
        </div>

        <div className="level-grid" role="tabpanel" aria-label={world.name}>
          {levels.map((l) => {
            const locked = l.id > save.unlocked;
            const rec = save.levels[l.id];
            return (
              <button
                key={l.id}
                className={`level-card${l.id === current && !locked ? ' current' : ''}`}
                disabled={locked}
                onClick={() => onPlay(l.id)}
                aria-label={`Level ${l.id}: ${l.name}${locked ? ' (locked)' : rec ? `, completed, ${rec.stars} stars` : ''}`}
                data-testid={`level-${l.id}`}
              >
                <span className="num">{String(l.id).padStart(2, '0')}</span>
                <span className="name">{l.name}</span>
                <span className="foot">
                  {locked ? (
                    <>
                      <LockIcon /> Locked
                    </>
                  ) : rec ? (
                    <>
                      <Stars n={rec.stars} />
                      <span>{formatTime(rec.bestTime)}</span>
                    </>
                  ) : (
                    <>
                      <Difficulty n={l.difficulty} />
                      <span>New</span>
                    </>
                  )}
                </span>
              </button>
            );
          })}
        </div>
      </section>
    </div>
  );
}
