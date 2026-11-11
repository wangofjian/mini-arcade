import { useEffect, useRef, type CSSProperties, type PointerEvent, type ReactNode } from 'react';
import { createHoldSession, type HoldSessionOptions } from './holdSession';

type Props = {
  label: string;
  ariaLabel?: string;
  disabled?: boolean;
  className?: string;
  style?: CSSProperties;
  children?: ReactNode;
  onDown?: () => void;
  onUp?: () => void;
  /** Discrete action on press; with repeat, also later while held. */
  onPress?: () => void;
  repeat?: boolean;
  repeatDelayMs?: number;
  repeatEveryMs?: number;
};

/**
 * On-screen control that mirrors a held keyboard key.
 * Uses pointer capture and always releases on pointerup / cancel / lost capture / unmount.
 */
export function HoldButton(props: Props) {
  const optsRef = useRef<HoldSessionOptions>({});
  optsRef.current = {
    onDown: () => {
      props.onDown?.();
      props.onPress?.();
    },
    onUp: props.onUp,
    onRepeat: props.repeat ? () => props.onPress?.() : undefined,
    repeatDelayMs: props.repeatDelayMs,
    repeatEveryMs: props.repeatEveryMs,
  };

  const sessionRef = useRef(
    createHoldSession({
      onDown: () => optsRef.current.onDown?.(),
      onUp: () => optsRef.current.onUp?.(),
      onRepeat: () => optsRef.current.onRepeat?.(),
      wantRepeat: () => !!optsRef.current.onRepeat,
      get repeatDelayMs() {
        return optsRef.current.repeatDelayMs;
      },
      get repeatEveryMs() {
        return optsRef.current.repeatEveryMs;
      },
    }),
  );

  useEffect(() => {
    const session = sessionRef.current;
    return () => session.dispose();
  }, []);

  const start = (e: PointerEvent<HTMLButtonElement>) => {
    if (props.disabled) return;
    e.preventDefault();
    try {
      e.currentTarget.setPointerCapture(e.pointerId);
    } catch {
      /* capture can fail if the node is gone */
    }
    sessionRef.current.press(e.pointerId);
  };
  const end = (e: PointerEvent<HTMLButtonElement>) => {
    e.preventDefault();
    sessionRef.current.release(e.pointerId);
  };
  const cancel = () => {
    sessionRef.current.release();
  };

  return (
    <button
      type="button"
      className={'hold-btn' + (props.className ? ' ' + props.className : '')}
      aria-label={props.ariaLabel ?? props.label}
      disabled={props.disabled}
      style={props.style}
      onPointerDown={start}
      onPointerUp={end}
      onPointerCancel={cancel}
      onLostPointerCapture={cancel}
    >
      {props.children ?? props.label}
    </button>
  );
}
