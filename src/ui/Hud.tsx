import { useSyncExternalStore } from 'react';
import type { GameController } from '../engine/controller';
import { ghostColor } from '../engine/palette';
import { GhostIcon, HintIcon, LoopIcon, PauseIcon, RestartAttemptIcon, RestartLevelIcon } from './Icons';

interface Props {
  controller: GameController;
  /** Touch pad is visible (it has its own Loop button). */
  touch: boolean;
  /** Phone landscape: the HUD lives in the side gutters beside the touch pads. */
  sides?: boolean;
  hintsUsed: number;
  onPause(): void;
  onHint(): void;
  onRestartAttempt(): void;
  onRestartLevel(): void;
  onLoopNow(): void;
}

export function Hud({ controller, touch, sides = false, hintsUsed, onPause, onHint, onRestartAttempt, onRestartLevel, onLoopNow }: Props) {
  const hud = useSyncExternalStore(controller.subscribe, controller.getSnapshot);
  const secs = hud.remainingTenths / 10;
  const low = secs <= 3 && hud.status === 'playing';
  const full = hud.ghosts >= hud.maxGhosts;
  return (
    <div className={`hud${sides ? ' hud-sides' : ''}`} data-testid="hud">
      <div className="hud-left">
        <button className="btn hud-btn" onClick={onPause} aria-label="Pause" title="Pause (Esc)">
          <PauseIcon />
        </button>
        <div className="chip" title={hud.levelName}>
          <span className="lvl">L{String(hud.levelId).padStart(2, '0')}</span>
          <span className="lname">{hud.levelName}</span>
        </div>
      </div>

      <div className={`timer${low ? ' low' : ''}`} role="timer" aria-label={`${secs.toFixed(1)} seconds left`}>
        <span className="timer-level" aria-hidden>
          LEVEL {String(hud.levelId).padStart(2, '0')}
        </span>
        <div className="timer-value" data-testid="timer">
          {secs.toFixed(1)}
          <small>s</small>
        </div>
        <div className="timeline" aria-hidden>
          <div className="timeline-fill" style={{ width: `${hud.progress * 100}%` }} />
          {hud.ghostEnds.map((end, i) =>
            end < 1 ? <span key={i} className="timeline-mark" style={{ left: `${end * 100}%`, background: ghostColor(i + 1) }} title={`G${i + 1} stops`} /> : null,
          )}
        </div>
      </div>

      <div className="hud-right">
        <div className={`chip ghost-chip${full ? ' full' : ''}`} data-testid="ghost-count" title={full ? 'All ghost slots used' : 'Recorded ghosts'}>
          <GhostIcon />
          <span className="dots hud-secondary" aria-hidden>
            {Array.from({ length: hud.maxGhosts }, (_, i) => (
              <i key={i} style={i < hud.ghosts ? { background: ghostColor(i + 1), borderColor: 'transparent' } : undefined} />
            ))}
          </span>
          <span>
            {hud.ghosts}/{hud.maxGhosts}
          </span>
        </div>
        <button className="btn hud-btn" onClick={onHint} title="Hints (H)" aria-label={`Hints, ${hintsUsed} of 3 used`}>
          <HintIcon />
          <span className="label-md">Hint</span>
          {hintsUsed > 0 && <span>{hintsUsed}/3</span>}
        </button>
        <button className={`btn hud-btn${touch ? ' hud-loop-touch' : ''}`} onClick={onLoopNow} title="Loop Now (T): end this attempt and keep it as a ghost" aria-label="Loop Now">
          <LoopIcon />
          <span className="label-md">Loop Now</span>
        </button>
        <button className="btn hud-btn" onClick={onRestartAttempt} title="Restart Attempt (R): keeps your ghosts" aria-label="Restart Attempt">
          <RestartAttemptIcon />
          <span className="label-long">Restart Attempt</span>
        </button>
        <button className="btn hud-btn btn-danger hud-secondary" onClick={onRestartLevel} title="Restart Level (Shift+R): clears all ghosts" aria-label="Restart Level">
          <RestartLevelIcon />
          <span className="label-long">Restart Level</span>
        </button>
      </div>
    </div>
  );
}
