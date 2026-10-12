import { useCallback, useEffect, useRef, useState, type CSSProperties } from 'react';
import { audio } from '../engine/audio';
import { GameController, type CompletionStats } from '../engine/controller';
import type { Command } from '../engine/input';
import { LEVELS, getLevel } from '../game/levels';
import { PHASES, phaseOf } from '../game/phases';
import { THEMES } from '../engine/themes';
import { computeStars, type SaveData, type Settings } from '../save/save';
import { ConfirmDialog } from './ConfirmDialog';
import { Hud } from './Hud';
import { CompletionScreen, HintPanel, PauseMenu } from './Overlays';
import { TouchControls } from './TouchControls';
import { WorldScene } from './WorldScene';

type Overlay = 'none' | 'phase' | 'pause' | 'hint' | 'confirmLevel' | 'complete';

interface Toast {
  id: number;
  text: string;
  tone: 'info' | 'warn';
}

interface Props {
  levelId: number;
  save: SaveData;
  onSettings(s: Settings): void;
  onComplete(levelId: number, timeSeconds: number, stars: 1 | 2 | 3, hintsUsed: number): void;
  onPlay(levelId: number): void;
  onExit(to: 'menu' | 'levels'): void;
}

function useTouchLayout(mode: Settings['touchControls']) {
  const coarse = () => typeof window !== 'undefined' && (window.matchMedia?.('(pointer: coarse)').matches || 'ontouchstart' in window);
  const measure = () => ({ coarse: coarse(), landscape: window.innerWidth >= window.innerHeight, width: window.innerWidth });
  const [state, setState] = useState(measure);
  useEffect(() => {
    const update = () => setState(measure());
    window.addEventListener('resize', update);
    window.addEventListener('orientationchange', update);
    return () => {
      window.removeEventListener('resize', update);
      window.removeEventListener('orientationchange', update);
    };
  }, []);
  const show = mode === 'on' || (mode === 'auto' && state.coarse);
  // Side gutters hold the HUD and the touch pads; they shrink on narrow phones.
  const gutter = Math.round(Math.min(150, Math.max(118, state.width * 0.15)));
  return { show, coarse: state.coarse, landscape: state.landscape, gutter, sides: show && state.landscape };
}

export function GameScreen({ levelId, save, onSettings, onComplete, onPlay, onExit }: Props) {
  const level = getLevel(levelId) ?? LEVELS[0];
  const phase = phaseOf(level.id);
  const theme = THEMES[phase.theme];
  const settings = save.settings;
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [controller, setController] = useState<GameController | null>(null);
  // The first room of every world opens with its title card.
  const [overlay, setOverlay] = useState<Overlay>(() => (level.id === phase.first ? 'phase' : 'none'));
  const [hintsUsed, setHintsUsed] = useState(0);
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [done, setDone] = useState<{ stats: CompletionStats; stars: 1 | 2 | 3; best: number | null } | null>(null);
  const [run, setRun] = useState(0);
  const touch = useTouchLayout(settings.touchControls);
  // On a phone held upright, ask for landscape (but let the player decline).
  const [portraitOk, setPortraitOk] = useState(false);
  const needsRotate = touch.coarse && !touch.landscape && !portraitOk;

  const overlayRef = useRef(overlay);
  overlayRef.current = overlay;
  const hintsRef = useRef(hintsUsed);
  hintsRef.current = hintsUsed;
  const saveRef = useRef(save);
  saveRef.current = save;

  const toast = useCallback((text: string, tone: 'info' | 'warn' = 'info') => {
    const id = Date.now() + Math.random();
    setToasts((t) => [...t.slice(-2), { id, text, tone }]);
    window.setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 2600);
  }, []);

  const requestRestartLevel = useCallback(
    (c: GameController) => {
      if (saveRef.current.settings.confirmRestartLevel && c.session.ghosts.length > 0) setOverlay('confirmLevel');
      else {
        c.restartLevel();
        setOverlay('none');
      }
    },
    [],
  );

  // Create the controller for this level (and for every replay).
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    let ctrl: GameController | null = null;
    const onCommand = (cmd: Command) => {
      const c = ctrl;
      if (!c) return;
      const ov = overlayRef.current;
      if (cmd === 'pause') {
        if (ov === 'phase') setOverlay('none');
        else if (ov === 'none') setOverlay('pause');
        else if (ov === 'pause' || ov === 'hint') setOverlay('none');
        return;
      }
      if (ov !== 'none') return;
      if (cmd === 'hint') setOverlay('hint');
      else if (cmd === 'restartAttempt') c.restartAttempt();
      else if (cmd === 'restartLevel') requestRestartLevel(c);
      else if (cmd === 'loopNow') c.loopNow();
    };
    ctrl = new GameController(canvas, level, saveRef.current.settings, {
      onCommand,
      onToast: toast,
      onComplete: (stats) => {
        const hints = hintsRef.current;
        const stars = computeStars(stats.timeSeconds, level.parTime, hints);
        const prevBest = saveRef.current.levels[level.id]?.bestTime ?? null;
        onComplete(level.id, stats.timeSeconds, stars, hints);
        setDone({ stats, stars, best: prevBest === null ? null : Math.min(prevBest, stats.timeSeconds) });
        setOverlay('complete');
      },
    });
    ctrl.start();
    setController(ctrl);
    if (new URLSearchParams(location.search).has('e2e')) {
      ctrl.autoPauseOnHide = false;
      (window as unknown as Record<string, unknown>).__pastSelf = ctrl;
    }
    return () => {
      ctrl?.destroy();
      ctrl = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [level.id, run]);

  useEffect(() => {
    audio.setChord(theme.chord);
  }, [theme]);

  // Pause the simulation whenever an overlay is open.
  useEffect(() => {
    controller?.setPaused(overlay !== 'none' || needsRotate);
  }, [controller, overlay, needsRotate]);

  // Settings and touch layout.
  useEffect(() => {
    if (!controller) return;
    const insets = touch.show
      ? touch.landscape
        ? { top: 0, right: touch.gutter, bottom: 0, left: touch.gutter }
        : { top: 64, right: 0, bottom: 230, left: 0 }
      : { top: 0, right: 0, bottom: 0, left: 0 };
    controller.setSettings(settings, touch.show, insets);
  }, [controller, settings, touch.show, touch.landscape, touch.gutter]);

  const resume = () => {
    audio.unlock();
    setOverlay('none');
  };

  const replay = () => {
    setDone(null);
    setHintsUsed(0);
    setOverlay('none');
    setRun((r) => r + 1);
  };

  const isLast = level.id === LEVELS[LEVELS.length - 1].id;
  const nextPhase = level.id === phase.last ? PHASES.find((p) => p.id === phase.id + 1) : undefined;

  return (
    <div
      className={`game${touch.sides ? ' sides' : ''}`}
      onPointerDown={() => audio.unlock()}
      style={{ '--phase': theme.accent, '--gutter': `${touch.gutter}px` } as CSSProperties}
    >
      <canvas ref={canvasRef} className="game-canvas" aria-label={`Level ${level.id}: ${level.name}. ${level.objective}`} />
      {controller && (
        <Hud
          controller={controller}
          touch={touch.show}
          sides={touch.sides}
          hintsUsed={hintsUsed}
          onPause={() => setOverlay('pause')}
          onHint={() => setOverlay('hint')}
          onRestartAttempt={() => controller.restartAttempt()}
          onRestartLevel={() => requestRestartLevel(controller)}
          onLoopNow={() => controller.loopNow()}
        />
      )}
      <div className="toasts" aria-live="polite">
        {toasts.map((t) => (
          <div key={t.id} className={`toast ${t.tone}`}>
            {t.text}
          </div>
        ))}
      </div>
      {overlay !== 'phase' && (
        <div className="intro" key={`${level.id}-${run}`} aria-hidden>
          <div className="k">
            {phase.name.toUpperCase()} · LEVEL {String(level.id).padStart(2, '0')}
          </div>
          <div className="n">{level.name}</div>
          <div className="o">{level.objective}</div>
        </div>
      )}
      {needsRotate && (
        <div className="rotate-overlay" role="dialog" aria-modal="true" aria-labelledby="rotate-title" data-testid="rotate-overlay">
          <div className="rotate-phone" aria-hidden />
          <h2 id="rotate-title">Turn your phone sideways</h2>
          <p>Paradox Sequence is a landscape game. The loop is paused until you rotate.</p>
          <button className="btn btn-ghost" onClick={() => setPortraitOk(true)}>
            Play in portrait anyway
          </button>
        </div>
      )}
      {controller && touch.show && overlay === 'none' && !needsRotate && <TouchControls input={controller.input} landscape={touch.landscape} onLoopNow={() => controller.loopNow()} />}

      {overlay === 'phase' && <WorldCard phaseId={phase.id} reducedMotion={settings.reducedMotion} onBegin={resume} />}
      {overlay === 'pause' && controller && (
        <PauseMenu
          level={level}
          settings={settings}
          onSettings={onSettings}
          onResume={resume}
          onRestartAttempt={() => {
            controller.restartAttempt();
            resume();
          }}
          onRestartLevel={() => requestRestartLevel(controller)}
          onMainMenu={() => onExit('menu')}
        />
      )}
      {overlay === 'hint' && (
        <HintPanel
          level={level}
          revealed={hintsUsed}
          onReveal={() => setHintsUsed((h) => Math.min(3, h + 1))}
          onClose={resume}
        />
      )}
      {overlay === 'confirmLevel' && controller && (
        <ConfirmDialog
          title="Restart Level?"
          body={`This erases all ${controller.session.ghosts.length} recorded ghost${controller.session.ghosts.length === 1 ? '' : 's'} and resets the puzzle. Restart Attempt keeps them.`}
          confirmLabel="Clear ghosts & restart"
          danger
          onConfirm={() => {
            controller.restartLevel();
            resume();
          }}
          onCancel={resume}
        />
      )}
      {overlay === 'complete' && done && (
        <CompletionScreen
          level={level}
          stats={done.stats}
          hintsUsed={hintsUsed}
          stars={done.stars}
          best={done.best}
          isLast={isLast}
          phaseName={phase.name}
          nextPhaseName={nextPhase?.name}
          onNext={() => onPlay(level.id + 1)}
          onReplay={replay}
          onLevelSelect={() => onExit('levels')}
          onMainMenu={() => onExit('menu')}
        />
      )}
    </div>
  );
}

function WorldCard({ phaseId, reducedMotion, onBegin }: { phaseId: number; reducedMotion: boolean; onBegin(): void }) {
  const world = PHASES[phaseId - 1];
  const ref = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    const id = window.setTimeout(() => ref.current?.focus(), 50);
    return () => window.clearTimeout(id);
  }, []);
  return (
    <div className="world-card" role="dialog" aria-modal="true" aria-labelledby="world-title" data-testid="world-card">
      <WorldScene world={world.theme} reducedMotion={reducedMotion} className="world-canvas" />
      <div className="inner">
        <div className="k">{world.id === 1 ? 'The loop begins in' : 'Now entering'}</div>
        <h2 id="world-title" aria-label={world.name}>
          {world.name.split(' ').map((word, wi, words) => {
            const before = words.slice(0, wi).join(' ').length + (wi ? 1 : 0);
            return (
              <span key={wi} className="word" aria-hidden>
                {word.split('').map((ch, i) => (
                  <span key={i} className="ch" style={{ animationDelay: `${0.35 + (before + i) * 0.045}s` }}>
                    {ch}
                  </span>
                ))}
                {wi < words.length - 1 ? ' ' : ''}
              </span>
            );
          })}
        </h2>
        <p>{world.tagline}</p>
        <span className="new">New here: {world.introduces}</span>
        <div className="begin">
          <button ref={ref} className="btn btn-primary" onClick={onBegin}>
            Begin
          </button>
        </div>
      </div>
    </div>
  );
}
