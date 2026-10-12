import { useRef, useState, type ReactNode } from 'react';
import { INPUT_JUMP, INPUT_LEFT, INPUT_RIGHT, INPUT_USE } from '../game/input';
import type { InputManager } from '../engine/input';
import { ArrowLeft, ArrowRight, ArrowUp, HandIcon, LoopIcon } from './Icons';

interface HoldProps {
  bit: number;
  input: InputManager;
  className?: string;
  label: string;
  children: ReactNode;
}

/** A button that holds an input bit while pressed. Uses pointer capture so multi-touch works. */
function HoldButton({ bit, input, className = '', label, children }: HoldProps) {
  const [down, setDown] = useState(false);
  const pointers = useRef(new Set<number>());
  const release = (id: number) => {
    pointers.current.delete(id);
    if (pointers.current.size === 0) {
      setDown(false);
      input.setVirtual(bit, false);
    }
  };
  return (
    <button
      type="button"
      aria-label={label}
      className={`tbtn ${className}${down ? ' down' : ''}`}
      onPointerDown={(e) => {
        e.preventDefault();
        try {
          (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
        } catch {
          /* synthetic or already-released pointers cannot be captured */
        }
        pointers.current.add(e.pointerId);
        setDown(true);
        input.setVirtual(bit, true);
      }}
      onPointerUp={(e) => release(e.pointerId)}
      onPointerCancel={(e) => release(e.pointerId)}
      onLostPointerCapture={(e) => release(e.pointerId)}
      onContextMenu={(e) => e.preventDefault()}
    >
      {children}
    </button>
  );
}

interface Props {
  input: InputManager;
  landscape: boolean;
  onLoopNow(): void;
}

export function TouchControls({ input, landscape, onLoopNow }: Props) {
  return (
    <div className={`touch ${landscape ? 'landscape' : 'portrait'}`} data-testid="touch-controls">
      <div className="touch-pad touch-left">
        <div className="dir-row">
          <HoldButton bit={INPUT_LEFT} input={input} label="Move left">
            <ArrowLeft />
          </HoldButton>
          <HoldButton bit={INPUT_RIGHT} input={input} label="Move right">
            <ArrowRight />
          </HoldButton>
        </div>
      </div>
      <div className="touch-pad touch-right">
        <div className="action-row">
          <button type="button" className="tbtn small" aria-label="Loop Now" onClick={onLoopNow}>
            <LoopIcon />
            Loop
          </button>
          <HoldButton bit={INPUT_USE} input={input} label="Interact">
            <HandIcon />
          </HoldButton>
        </div>
        <HoldButton bit={INPUT_JUMP} input={input} className="jump" label="Jump">
          <ArrowUp />
        </HoldButton>
      </div>
    </div>
  );
}
