import { LEVELS } from '../game/levels';
import { phaseOf } from '../game/phases';
import { LEVEL_COUNT, continueLevel, hasProgress, type SaveData } from '../save/save';
import { canFullscreen, toggleFullscreen, useFullscreen } from './fullscreen';

interface Props {
  save: SaveData;
  onContinue(level: number): void;
  onNewGame(): void;
  onLevelSelect(): void;
  onHowToPlay(): void;
  onSettings(): void;
}

export function MainMenu({ save, onContinue, onNewGame, onLevelSelect, onHowToPlay, onSettings }: Props) {
  const next = continueLevel(save);
  const nextName = LEVELS.find((l) => l.id === next)?.name ?? '';
  const completed = Object.keys(save.levels).length;
  const stars = Object.values(save.levels).reduce((n, l) => n + l.stars, 0);
  const fullscreen = useFullscreen();
  const touchDevice = typeof window !== 'undefined' && window.matchMedia?.('(pointer: coarse)').matches;
  return (
    <div className="screen">
      <nav className="menu" aria-label="Main menu">
        <header className="title">
          <span className="title-kicker">A time-loop puzzle</span>
          <h1>
            <span className="past">Paradox</span>{' '}
            <br />
            <span className="enemy">Sequence</span>
          </h1>
        </header>
        <button className="btn btn-primary" onClick={() => onContinue(next)} autoFocus>
          <span>{hasProgress(save) ? 'Continue' : 'Start'}</span>
          <span className="meta">
            {phaseOf(next).name} · {next} {nextName}
          </span>
        </button>
        <button className="btn" onClick={onNewGame}>
          <span>New Game</span>
        </button>
        <button className="btn" onClick={onLevelSelect}>
          <span>World Map</span>
          <span className="meta">
            {completed}/{LEVEL_COUNT} · {stars}★
          </span>
        </button>
        <button className="btn" onClick={onHowToPlay}>
          <span>How to Play</span>
        </button>
        <button className="btn" onClick={onSettings}>
          <span>Settings</span>
        </button>
        <p className="menu-foot">
          <span className="foot-text">Every attempt you make becomes a ghost that repeats it. Plan together — with yourself.</span>
          {touchDevice && canFullscreen() && (
            <>
              <br />
              <button className="btn btn-ghost menu-fs" onClick={() => void toggleFullscreen()}>
                {fullscreen ? 'Exit fullscreen' : 'Play fullscreen'}
              </button>
            </>
          )}
        </p>
      </nav>
    </div>
  );
}
