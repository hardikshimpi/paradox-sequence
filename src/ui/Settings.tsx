import type { Settings } from '../save/save';

interface Props {
  settings: Settings;
  onChange(next: Settings): void;
}

function Toggle({ checked, onChange, label }: { checked: boolean; onChange(v: boolean): void; label: string }) {
  return <button type="button" role="switch" aria-checked={checked} aria-label={label} className="toggle" onClick={() => onChange(!checked)} />;
}

function Slider({ id, value, onChange }: { id: string; value: number; onChange(v: number): void }) {
  return (
    <span>
      <input id={id} type="range" min={0} max={100} step={5} value={Math.round(value * 100)} onChange={(e) => onChange(Number(e.target.value) / 100)} />
      <span className="range-value">{Math.round(value * 100)}</span>
    </span>
  );
}

export function SettingsPanel({ settings, onChange }: Props) {
  const set = <K extends keyof Settings>(k: K, v: Settings[K]) => onChange({ ...settings, [k]: v });
  return (
    <div className="settings">
      <div className="field">
        <label htmlFor="vol-master">Master volume</label>
        <Slider id="vol-master" value={settings.masterVolume} onChange={(v) => set('masterVolume', v)} />
      </div>
      <div className="field">
        <label htmlFor="vol-sfx">Sound effects</label>
        <Slider id="vol-sfx" value={settings.sfxVolume} onChange={(v) => set('sfxVolume', v)} />
      </div>
      <div className="field">
        <label htmlFor="vol-music">Ambient music</label>
        <Slider id="vol-music" value={settings.musicVolume} onChange={(v) => set('musicVolume', v)} />
      </div>
      <div className="field">
        <label>
          Show ghost routes
          <span className="hint">Faint trail of each ghost's original path.</span>
        </label>
        <Toggle label="Show ghost routes" checked={settings.ghostPaths} onChange={(v) => set('ghostPaths', v)} />
      </div>
      <div className="field">
        <label>
          Confirm Restart Level
          <span className="hint">Ask before clearing all ghosts.</span>
        </label>
        <Toggle label="Confirm Restart Level" checked={settings.confirmRestartLevel} onChange={(v) => set('confirmRestartLevel', v)} />
      </div>
      <div className="field">
        <label>
          Reduced motion
          <span className="hint">No particles, flicker, bobbing or shake.</span>
        </label>
        <Toggle label="Reduced motion" checked={settings.reducedMotion} onChange={(v) => set('reducedMotion', v)} />
      </div>
      <div className="field">
        <label>
          High contrast
          <span className="hint">Solid ghost outlines and brighter edges.</span>
        </label>
        <Toggle label="High contrast" checked={settings.highContrast} onChange={(v) => set('highContrast', v)} />
      </div>
      <div className="field">
        <label htmlFor="touch-mode">
          Touch controls
          <span className="hint">Auto shows them on touch screens.</span>
        </label>
        <select id="touch-mode" value={settings.touchControls} onChange={(e) => set('touchControls', e.target.value as Settings['touchControls'])}>
          <option value="auto">Auto</option>
          <option value="on">Always</option>
          <option value="off">Never</option>
        </select>
      </div>
    </div>
  );
}
