import { useEffect, useRef, useState } from 'react';
import type { CompletionStats } from '../engine/controller';
import type { LevelDef } from '../game/types';
import type { Settings } from '../save/save';
import { ControlsList } from './HowToPlay';
import { BackIcon, StarIcon } from './Icons';
import { canFullscreen, toggleFullscreen, useFullscreen } from './fullscreen';
import { formatTime } from './LevelSelect';
import { SettingsPanel } from './Settings';

function useAutoFocus<T extends HTMLElement>() {
  const ref = useRef<T>(null);
  useEffect(() => ref.current?.focus(), []);
  return ref;
}

interface PauseProps {
  level: LevelDef;
  settings: Settings;
  onSettings(s: Settings): void;
  onResume(): void;
  onRestartAttempt(): void;
  onRestartLevel(): void;
  onMainMenu(): void;
}

export function PauseMenu({ level, settings, onSettings, onResume, onRestartAttempt, onRestartLevel, onMainMenu }: PauseProps) {
  const [view, setView] = useState<'main' | 'controls' | 'settings'>('main');
  const resumeRef = useAutoFocus<HTMLButtonElement>();
  const fullscreen = useFullscreen();
  return (
    <div className="overlay" role="dialog" aria-modal="true" aria-labelledby="pause-title">
      <div className="panel" style={{ width: view === 'main' ? 'min(400px, 100%)' : 'min(560px, 100%)' }}>
        {view === 'main' && (
          <>
            <h2 id="pause-title">Paused</h2>
            <p className="sub">
              Level {level.id} · {level.name}
              <br />
              {level.objective}
            </p>
            <div className="stack pause-actions">
              <button ref={resumeRef} className="btn btn-primary btn-block" onClick={onResume}>
                Resume <kbd>Esc</kbd>
              </button>
              <button className="btn btn-block" onClick={onRestartAttempt}>
                Restart Attempt <span style={{ color: 'var(--dim)', fontWeight: 400 }}>· keeps ghosts</span>
              </button>
              <button className="btn btn-danger btn-block" onClick={onRestartLevel}>
                Restart Level <span style={{ opacity: 0.75, fontWeight: 400 }}>· clears ghosts</span>
              </button>
              <button className="btn btn-block" onClick={() => setView('controls')}>
                Controls
              </button>
              <button className="btn btn-block" onClick={() => setView('settings')}>
                Settings
              </button>
              {canFullscreen() && (
                <button className="btn btn-block" onClick={() => void toggleFullscreen()}>
                  {fullscreen ? 'Exit fullscreen' : 'Fullscreen'}
                </button>
              )}
              <button className="btn btn-block" onClick={onMainMenu}>
                Main Menu
              </button>
            </div>
          </>
        )}
        {view !== 'main' && (
          <>
            <div className="panel-head">
              <h2 id="pause-title">{view === 'controls' ? 'Controls' : 'Settings'}</h2>
              <button className="btn btn-ghost" onClick={() => setView('main')} autoFocus>
                <BackIcon /> Back
              </button>
            </div>
            {view === 'controls' ? <ControlsList /> : <SettingsPanel settings={settings} onChange={onSettings} />}
          </>
        )}
      </div>
    </div>
  );
}

interface HintProps {
  level: LevelDef;
  revealed: number;
  onReveal(): void;
  onClose(): void;
}

const HINT_LABELS = ['Look closer', 'The mechanic', 'The sequence'];

export function HintPanel({ level, revealed, onReveal, onClose }: HintProps) {
  const closeRef = useAutoFocus<HTMLButtonElement>();
  return (
    <div className="overlay" role="dialog" aria-modal="true" aria-labelledby="hint-title">
      <div className="panel">
        <div className="panel-head">
          <h2 id="hint-title">Hints</h2>
          <span style={{ color: 'var(--dim)', fontSize: 13 }}>{revealed}/3 used · puzzle paused, not reset</span>
        </div>
        {level.hints.map((h, i) =>
          i < revealed ? (
            <div key={i} className="hint-card" data-testid={`hint-${i + 1}`}>
              <div className="k">
                Hint {i + 1} · {HINT_LABELS[i]}
              </div>
              {h}
            </div>
          ) : (
            <div key={i} className="hint-card locked">
              Hint {i + 1} · {HINT_LABELS[i]} — hidden
            </div>
          ),
        )}
        <div className="row" style={{ marginTop: 6 }}>
          <button ref={closeRef} className="btn" onClick={onClose}>
            Back to puzzle
          </button>
          <button className="btn btn-primary" onClick={onReveal} disabled={revealed >= 3}>
            {revealed >= 3 ? 'All hints shown' : `Reveal hint ${revealed + 1}`}
          </button>
        </div>
        <p className="star-note" style={{ marginTop: 12 }}>
          Using a hint costs one star; seeing all three costs two.
        </p>
      </div>
    </div>
  );
}

interface CompleteProps {
  level: LevelDef;
  stats: CompletionStats;
  hintsUsed: number;
  stars: number;
  best: number | null;
  isLast: boolean;
  phaseName: string;
  /** Set when this level closes its phase. */
  nextPhaseName?: string;
  onNext(): void;
  onReplay(): void;
  onLevelSelect(): void;
  onMainMenu(): void;
}

export function CompletionScreen({ level, stats, hintsUsed, stars, best, isLast, phaseName, nextPhaseName, onNext, onReplay, onLevelSelect, onMainMenu }: CompleteProps) {
  const nextRef = useAutoFocus<HTMLButtonElement>();
  return (
    <div className="overlay" role="dialog" aria-modal="true" aria-labelledby="done-title" data-testid="completion">
      <div className="panel">
        <p className="title-kicker" style={{ textAlign: 'center', margin: 0 }}>
          {isLast ? 'You beat yourself' : nextPhaseName ? `${phaseName} cleared` : `Level ${level.id} complete`}
        </p>
        <h2 id="done-title" style={{ textAlign: 'center', marginTop: 6 }}>
          {level.name}
        </h2>
        <div className="big-stars" aria-label={`${stars} of 3 stars`}>
          {[1, 2, 3].map((i) => (
            <span key={i} className={i <= stars ? '' : 'off'}>
              <StarIcon size={38} />
            </span>
          ))}
        </div>
        <p className="star-note">
          Par {formatTime(level.parTime)} · no hints for full marks{best !== null ? ` · best ${formatTime(best)}` : ''}
        </p>
        <div className="stats">
          <div className="stat">
            <div className="v" data-testid="complete-time">
              {formatTime(stats.timeSeconds)}
            </div>
            <div className="l">Time</div>
          </div>
          <div className="stat">
            <div className="v">{hintsUsed}</div>
            <div className="l">Hints used</div>
          </div>
          <div className="stat">
            <div className="v">{stats.ghostsUsed}</div>
            <div className="l">Ghosts</div>
          </div>
          <div className="stat">
            <div className="v">{stats.attempts}</div>
            <div className="l">Attempts</div>
          </div>
        </div>
        {isLast && (
          <p className="sub" style={{ textAlign: 'center' }}>
            Every loop you lived through was you. All seventy-five rooms are solved.
          </p>
        )}
        <div className="stack completion-actions">
          {isLast ? (
            <button ref={nextRef} className="btn btn-primary btn-block" onClick={onMainMenu}>
              Back to Main Menu
            </button>
          ) : (
            <button ref={nextRef} className="btn btn-primary btn-block" onClick={onNext}>
              {nextPhaseName ? `Enter ${nextPhaseName}` : 'Next Level'}
            </button>
          )}
          <div className="row">
            <button className="btn" onClick={onReplay}>
              Replay
            </button>
            <button className="btn" onClick={onLevelSelect}>
              Level Select
            </button>
            {!isLast && (
              <button className="btn" onClick={onMainMenu}>
                Main Menu
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
