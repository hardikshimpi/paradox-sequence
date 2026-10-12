import { Fragment } from 'react';
import { KEY_HELP } from '../engine/input';
import { BackIcon } from './Icons';

export function ControlsList() {
  return (
    <div className="keys">
      {KEY_HELP.map((k) => (
        <Fragment key={k.keys}>
          <span>{k.keys}</span>
          <span>{k.action}</span>
        </Fragment>
      ))}
    </div>
  );
}

type Shape = 'plate' | 'door' | 'switch' | 'key' | 'laser' | 'ghost' | 'player' | 'exit' | 'belt' | 'pad' | 'portal' | 'screen' | 'crumble';

const Swatch = ({ color, shape }: { color: string; shape: Shape }) => (
  <svg width="26" height="22" viewBox="0 0 26 22" aria-hidden>
    {shape === 'plate' && <rect x="2" y="15" width="22" height="5" rx="2" fill={color} />}
    {shape === 'door' && <rect x="9" y="1" width="8" height="20" rx="1" fill={color} />}
    {shape === 'switch' && (
      <>
        <rect x="6" y="17" width="14" height="4" rx="1" fill="#28305a" />
        <path d="M13 18 L19 6" stroke={color} strokeWidth="3" strokeLinecap="round" />
      </>
    )}
    {shape === 'key' && (
      <>
        <circle cx="8" cy="11" r="4" stroke={color} strokeWidth="2.5" fill="none" />
        <rect x="12" y="10" width="11" height="2.5" fill={color} />
      </>
    )}
    {shape === 'laser' && <rect x="1" y="9" width="24" height="3" fill={color} />}
    {shape === 'ghost' && <rect x="7" y="1" width="12" height="20" rx="4" fill={color} fillOpacity="0.35" stroke={color} strokeDasharray="3 2" />}
    {shape === 'player' && <rect x="7" y="1" width="12" height="20" rx="4" fill={color} />}
    {shape === 'exit' && <path d="M5 21 V9 a8 8 0 0 1 16 0 V21z" fill={color} />}
    {shape === 'belt' && (
      <>
        <rect x="1" y="9" width="24" height="10" rx="5" fill="#20232f" />
        <path d="M6 11l3 3-3 3M12 11l3 3-3 3M18 11l3 3-3 3" stroke={color} strokeWidth="1.6" fill="none" />
      </>
    )}
    {shape === 'pad' && (
      <>
        <rect x="3" y="15" width="20" height="6" rx="2" fill="#20262a" />
        <path d="M5 13l3-4 3 4 3-4 3 4 3-4" stroke={color} strokeWidth="1.6" fill="none" />
        <rect x="3" y="7" width="20" height="3" rx="1.5" fill={color} />
      </>
    )}
    {shape === 'portal' && <ellipse cx="13" cy="11" rx="7" ry="9" stroke={color} strokeWidth="2.5" fill={color} fillOpacity="0.25" />}
    {shape === 'screen' && (
      <>
        <rect x="9" y="1" width="8" height="20" fill={color} fillOpacity="0.15" />
        <rect x="9" y="1" width="1.5" height="20" fill={color} />
        <rect x="15.5" y="1" width="1.5" height="20" fill={color} />
      </>
    )}
    {shape === 'crumble' && (
      <>
        <rect x="4" y="5" width="18" height="14" fill="#2b2448" />
        <path d="M8 6l4 6-2 6M12 12l7 3" stroke="#000" strokeOpacity="0.6" strokeWidth="1.4" fill="none" />
      </>
    )}
  </svg>
);

export function HowToPlay({ onBack }: { onBack(): void }) {
  return (
    <div className="screen">
      <section className="panel panel-wide" aria-labelledby="htp-title">
        <div className="panel-head">
          <h2 id="htp-title">How to Play</h2>
          <button className="btn btn-ghost" onClick={onBack}>
            <BackIcon /> Back
          </button>
        </div>
        <div className="howto">
          <div>
            <h3>The loop</h3>
            <p>Every room gives you a short time window. When the timer runs out — or you press <kbd>T</kbd> Loop Now — the room resets.</p>
            <p>The attempt you just made becomes a <strong>ghost</strong> that repeats your exact inputs, on the same timeline, alongside you.</p>
            <p>Ghosts follow the same rules as you: they press plates, flip switches, carry keys — and they die to hazards.</p>
          </div>
          <div>
            <h3>Restarting</h3>
            <ul>
              <li>
                <strong>Restart Attempt</strong> <kbd>R</kbd> — retry this loop. Your ghosts stay.
              </li>
              <li>
                <strong>Restart Level</strong> <kbd>Shift+R</kbd> — erase every ghost and start clean.
              </li>
              <li>Dying discards the attempt and restarts it. Ghosts stay.</li>
              <li>A ghost whose recording ended stands still — perfect for holding a plate.</li>
            </ul>
          </div>
          <div>
            <h3>Objects</h3>
            <div className="legend-row">
              <Swatch color="#ffd76a" shape="player" /> You — always gold and solid.
            </div>
            <div className="legend-row">
              <Swatch color="#7fdcff" shape="ghost" /> Ghosts — translucent, numbered G1, G2…
            </div>
            <div className="legend-row">
              <Swatch color="#3ddbd9" shape="plate" /> Pressure plate — active while someone stands on it.
            </div>
            <div className="legend-row">
              <Swatch color="#ff9f43" shape="switch" /> Switch — Interact to toggle. Round buttons stay on briefly.
            </div>
            <div className="legend-row">
              <Swatch color="#3ddbd9" shape="door" /> Doors, bridges and lifts show the colour + symbol of what powers them.
            </div>
            <div className="legend-row">
              <Swatch color="#ffb020" shape="key" /> Keys open matching locks on touch. Whoever grabs one first carries it.
            </div>
            <div className="legend-row">
              <Swatch color="#ff3b5c" shape="laser" /> Lasers and spikes are deadly. Timed lasers show a countdown.
            </div>
            <div className="legend-row">
              <Swatch color="#cfe6ff" shape="exit" /> Exit — reach it yourself while it is open.
            </div>
          </div>
          <div>
            <h3>Further worlds</h3>
            <div className="legend-row">
              <Swatch color="#c9ced9" shape="belt" /> Belts carry anyone standing on them — even a ghost whose recording has ended.
            </div>
            <div className="legend-row">
              <Swatch color="#c9ced9" shape="door" /> Shutters open on their own clock; the ring above shows when.
            </div>
            <div className="legend-row">
              <Swatch color="#b6f36b" shape="pad" /> Springs launch you high. Steer in mid-air.
            </div>
            <div className="legend-row">
              <Swatch color="#7af0ff" shape="portal" /> Portals move you to their partner — and ignore screens.
            </div>
            <div className="legend-row">
              <Swatch color="#7fdcff" shape="screen" /> Cyan screens stop ghosts. Gold screens stop you — your ghost walks on through.
            </div>
            <div className="legend-row">
              <Swatch color="#cdb9ff" shape="crumble" /> Crumbling tiles break half a second after anyone first stands on them.
            </div>
          </div>
          <div>
            <h3>Controls</h3>
            <ControlsList />
            <p style={{ marginTop: 12 }}>On touch screens, use the on-screen pad. You can steer in mid-air, so tapping jump then a direction works too.</p>
          </div>
        </div>
      </section>
    </div>
  );
}
