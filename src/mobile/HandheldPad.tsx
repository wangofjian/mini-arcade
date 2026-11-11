import type { CSSProperties } from 'react';
import { DPad, type PadDir, type PadDirConfig } from './DPad';
import { HoldButton } from './HoldButton';

export type { PadDir, PadDirConfig };

export type HandheldAction = {
  label: string;
  ariaLabel: string;
  onPress?: () => void;
  onDown?: () => void;
  onUp?: () => void;
  disabled?: boolean;
};

type Props = {
  /** Float translucent controls over the playfield (handheld overlay). */
  overlay?: boolean;
  disabled?: boolean;
  className?: string;
  style?: CSSProperties;
  mode?: 'hold' | 'tap' | 'tap-repeat';
  onDir?: (dir: PadDir, pressed: boolean) => void;
  dirs?: Partial<Record<PadDir, PadDirConfig>>;
  actions?: HandheldAction[];
};

/** Shared Brick Game-style pad: cross D-pad on the left, round action button(s) on the right. */
export function HandheldPad(props: Props) {
  const cls = [
    'handheld-pad',
    props.overlay ? 'is-overlay' : 'is-inline',
    props.className ?? '',
  ].filter(Boolean).join(' ');

  return (
    <div className={cls} style={props.style} role="group" aria-label="虚拟手柄">
      <DPad
        mode={props.mode}
        onDir={props.onDir}
        dirs={props.dirs}
        disabled={props.disabled}
      />
      {props.actions && props.actions.length > 0 ? (
        <div className="handheld-actions">
          {props.actions.map((action) => (
            <HoldButton
              key={action.ariaLabel}
              className="handheld-action"
              label={action.label}
              ariaLabel={action.ariaLabel}
              disabled={props.disabled || action.disabled}
              onPress={action.onPress}
              onDown={action.onDown}
              onUp={action.onUp}
            />
          ))}
        </div>
      ) : null}
    </div>
  );
}
