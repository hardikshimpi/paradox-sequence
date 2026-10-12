import { useCallback, useEffect, useState } from 'react';
import { audio } from './engine/audio';
import { LEVELS } from './game/levels';
import { phaseOf } from './game/phases';
import { THEMES } from './engine/themes';
import { clearProgress, continueLevel, hasProgress, loadSave, recordCompletion, writeSave, type SaveData, type Settings } from './save/save';
import { ConfirmDialog } from './ui/ConfirmDialog';
import { DemoBackground } from './ui/DemoBackground';
import { GameScreen } from './ui/GameScreen';
import { HowToPlay } from './ui/HowToPlay';
import { BackIcon } from './ui/Icons';
import { LevelSelect } from './ui/LevelSelect';
import { MainMenu } from './ui/MainMenu';
import { WorldMap } from './ui/WorldMap';
import { SettingsPanel } from './ui/Settings';

type Screen = { name: 'menu' } | { name: 'map' } | { name: 'levels'; world?: number } | { name: 'howto' } | { name: 'settings' } | { name: 'game'; level: number };

export function App() {
  const [save, setSave] = useState<SaveData>(() => loadSave());
  const [screen, setScreen] = useState<Screen>({ name: 'menu' });
  const [confirmNew, setConfirmNew] = useState(false);

  const update = useCallback((fn: (s: SaveData) => SaveData) => {
    setSave((s) => {
      const next = fn(s);
      writeSave(next);
      return next;
    });
  }, []);

  useEffect(() => {
    const s = save.settings;
    audio.setVolumes(s.masterVolume, s.sfxVolume, s.musicVolume);
  }, [save.settings]);

  // Browsers only allow audio after a user gesture.
  useEffect(() => {
    const unlock = () => {
      audio.unlock();
      audio.startMusic();
    };
    window.addEventListener('pointerdown', unlock);
    window.addEventListener('keydown', unlock);
    return () => {
      window.removeEventListener('pointerdown', unlock);
      window.removeEventListener('keydown', unlock);
    };
  }, []);

  const play = (level: number) => {
    const id = Math.min(Math.max(1, level), LEVELS.length);
    if (id > save.unlocked) return;
    audio.unlock();
    update((s) => ({ ...s, lastPlayed: id }));
    setScreen({ name: 'game', level: id });
  };
  const setSettings = (settings: Settings) => update((s) => ({ ...s, settings }));
  // The menu wears the theme of the phase you are in.
  const menuPhase = phaseOf(continueLevel(save));
  const DEMO_LEVEL = [6, 19, 36, 51, 62];
  useEffect(() => {
    if (screen.name !== 'game') audio.setChord(THEMES[menuPhase.theme].chord);
  }, [screen.name, menuPhase.theme]);
  const back = () => setScreen({ name: 'menu' });

  if (screen.name === 'game') {
    return (
      <GameScreen
        key={screen.level}
        levelId={screen.level}
        save={save}
        onSettings={setSettings}
        onComplete={(id, time, stars, hints) => update((s) => recordCompletion(s, id, time, stars, hints))}
        onPlay={(id) => setScreen({ name: 'game', level: id })}
        onExit={(to) => setScreen(to === 'menu' ? { name: 'menu' } : { name: 'levels', world: phaseOf(screen.level).id })}
      />
    );
  }

  return (
    <>
      <DemoBackground levelId={DEMO_LEVEL[menuPhase.id - 1]} reducedMotion={save.settings.reducedMotion} />
      {screen.name === 'menu' && (
        <MainMenu
          save={save}
          onContinue={play}
          onNewGame={() => (hasProgress(save) ? setConfirmNew(true) : play(1))}
          onLevelSelect={() => setScreen({ name: 'map' })}
          onHowToPlay={() => setScreen({ name: 'howto' })}
          onSettings={() => setScreen({ name: 'settings' })}
        />
      )}
      {screen.name === 'map' && <WorldMap save={save} onOpenWorld={(world) => setScreen({ name: 'levels', world })} onBack={back} />}
      {screen.name === 'levels' && <LevelSelect save={save} initialWorld={screen.world} onPlay={play} onBack={() => setScreen({ name: 'map' })} />}
      {screen.name === 'howto' && <HowToPlay onBack={back} />}
      {screen.name === 'settings' && (
        <div className="screen">
          <section className="panel" aria-labelledby="settings-title">
            <div className="panel-head">
              <h2 id="settings-title">Settings</h2>
              <button className="btn btn-ghost" onClick={back}>
                <BackIcon /> Back
              </button>
            </div>
            <SettingsPanel settings={save.settings} onChange={setSettings} />
          </section>
        </div>
      )}
      {confirmNew && (
        <ConfirmDialog
          title="Start a new game?"
          body="This erases your unlocked levels, best times and stars. Settings are kept."
          confirmLabel="Erase progress"
          danger
          onCancel={() => setConfirmNew(false)}
          onConfirm={() => {
            setConfirmNew(false);
            update((s) => clearProgress(s));
            setScreen({ name: 'game', level: 1 });
          }}
        />
      )}
    </>
  );
}
