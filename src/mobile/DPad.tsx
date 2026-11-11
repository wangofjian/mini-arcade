import type { CSSProperties } from 'react';
import { HoldButton } from './HoldButton';

export type PadDir = 'up' | 'down' | 'left' | 'right';

export type PadDirConfig = {
  mode?: 'hold' | 'tap' | 'tap-repeat';
  onPress?: () => void;
  onDown?: () => void;
  onUp?: () => void;
  label?: string;
  ariaLabel?: string;
};

type Props = {
  /** hold: press/release like a keyboard key; tap: one shot; tap-repeat: one shot then auto-repeat. */
  mode?: 'hold' | 'tap' | 'tap-repeat';
  onDir?: (dir: PadDir, pressed: boolean) => void;
  /** Per-direction handlers and modes; falls back to mode/onDir when a field is omitted. */
  dirs?: Partial<Record<PadDir, PadDirConfig>>;
  disabled?: boolean;
  className?: string;
  style?: CSSProperties;
};

const CELLS: Array<{ dir: PadDir | null; label: string; aria: string }> = [
  { dir: null, label: '', aria: '' },
  { dir: 'up', label: '↑', aria: '向上' },
  { dir: null, label: '', aria: '' },
  { dir: 'left', label: '←', aria: '向左' },
  { dir: null, label: '', aria: '' },
  { dir: 'right', label: '→', aria: '向右' },
  { dir: null, label: '', aria: '' },
  { dir: 'down', label: '↓', aria: '向下' },
  { dir: null, label: '', aria: '' },
];

export function DPad(props: Props) {
  const fallbackMode = props.mode ?? 'tap';
  return (
    <div className={'dpad handheld-dirs' + (props.className ? ' ' + props.className : '')} style={props.style} role="group" aria-label="方向键">
      {CELLS.map((cell, i) => {
        if (!cell.dir) return <div key={i} className="dpad-spacer" />;
        const dir = cell.dir;
        const cfg = props.dirs?.[dir];
        const mode = cfg?.mode ?? fallbackMode;
        const label = cfg?.label ?? cell.label;
        const aria = cfg?.ariaLabel ?? cell.aria;
        if (mode === 'hold') {
          return (
            <HoldButton
              key={dir}
              label={label}
              ariaLabel={aria}
              disabled={props.disabled}
              onDown={() => {
                cfg?.onDown?.();
                props.onDir?.(dir, true);
              }}
              onUp={() => {
                cfg?.onUp?.();
                props.onDir?.(dir, false);
              }}
            />
          );
        }
        return (
          <HoldButton
            key={dir}
            label={label}
            ariaLabel={aria}
            disabled={props.disabled}
            repeat={mode === 'tap-repeat'}
            onPress={() => {
              cfg?.onPress?.();
              props.onDir?.(dir, true);
            }}
          />
        );
      })}
    </div>
  );
}
