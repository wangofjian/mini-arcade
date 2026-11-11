import {
  cloneElement,
  isValidElement,
  useEffect,
  type CSSProperties,
  type KeyboardEvent,
  type ReactElement,
  type ReactNode,
  type Ref,
} from 'react';
import { Button } from '../compat/grok-canvas';
import { useImmersivePlay } from './immersivePlay';

export type ImmersiveLayout = 'overlay' | 'banded';

type Props = {
  /** overlay: HUD/pad float over the playfield (arcade). banded: slim HUD bar, maximize the rest (boards/cards). */
  layout?: ImmersiveLayout;
  className?: string;
  playRef?: Ref<HTMLDivElement>;
  stageRef?: Ref<HTMLDivElement>;
  tabIndex?: number;
  onKeyDown?: (e: KeyboardEvent<HTMLDivElement>) => void;
  onKeyUp?: (e: KeyboardEvent<HTMLDivElement>) => void;
  onBlur?: () => void;
  style?: CSSProperties;
  /** Hidden while immersive. */
  intro?: ReactNode;
  /** Hidden while immersive. */
  help?: ReactNode;
  /** Extra default-page buttons after 全屏游玩. Hidden while immersive unless also placed in hudActions. */
  pageActions?: ReactNode;
  showEnter?: boolean;
  enterLabel?: string;
  hudStats?: ReactNode;
  hudActions?: ReactNode;
  hudMsg?: ReactNode;
  /** Playfield (canvas or board). */
  children: ReactNode;
  /** Side panel; hidden in immersive unless keepSide. */
  side?: ReactNode;
  keepSide?: boolean;
  /** HandheldPad or other footer controls. overlay=true is injected when immersive. */
  pad?: ReactNode;
  /** If true, pad is only rendered in immersive (the default page already has controls). */
  padOverlayOnly?: boolean;
  /** Extra footer (e.g. rhythm lanes, fishing buttons). Hidden on the default page if footerOverlayOnly. */
  footer?: ReactNode;
  footerOverlayOnly?: boolean;
  /** Let a tall board scroll inside the stage (solitaire). */
  scrollStage?: boolean;
  /** Optional node to focus after entering immersive. */
  focusRef?: Ref<{ focus: (opts?: { preventScroll?: boolean }) => void } | null>;
};

function withOverlay(pad: ReactNode, overlay: boolean): ReactNode {
  if (isValidElement(pad)) {
    const el = pad as ReactElement<{ overlay?: boolean; className?: string }>;
    const className = ['imm-pad', el.props.className].filter(Boolean).join(' ');
    return cloneElement(el, { overlay, className });
  }
  return pad;
}

export function ImmersiveFrame(props: Props) {
  const { active, enter, exit } = useImmersivePlay();
  const layout = props.layout ?? 'overlay';
  const showEnter = props.showEnter !== false;

  useEffect(() => {
    if (!active) return;
    const focus = () => {
      const raw = props.focusRef;
      const node = raw && typeof raw !== 'function' ? raw.current : null;
      node?.focus({ preventScroll: true });
    };
    focus();
  }, [active, props.focusRef]);

  const showPad = props.pad && (active || !props.padOverlayOnly);
  const showFooter = props.footer && (active || !props.footerOverlayOnly);

  return (
    <>
      {props.intro ? <div className="imm-intro">{props.intro}</div> : null}
      <div
        ref={props.playRef}
        className={[
          'imm-play',
          layout === 'banded' ? 'is-banded' : 'is-overlay',
          props.scrollStage ? 'is-scroll' : '',
          active ? 'is-on' : '',
          props.className ?? '',
        ]
          .filter(Boolean)
          .join(' ')}
        tabIndex={props.tabIndex}
        onKeyDown={props.onKeyDown}
        onKeyUp={props.onKeyUp}
        onBlur={props.onBlur}
        style={props.style}
      >
        {!active && showEnter ? (
          <div className="imm-page-actions">
            <Button label={props.enterLabel ?? '全屏游玩'} variant="primary" onClick={enter} />
            {props.pageActions}
          </div>
        ) : null}
        {!active && !showEnter && props.pageActions ? (
          <div className="imm-page-actions">{props.pageActions}</div>
        ) : null}
        {active ? (
          <div className="imm-hud">
            <button type="button" className="gc-btn" onClick={exit}>
              退出全屏
            </button>
            {props.hudStats ? <div className="imm-hud-stats">{props.hudStats}</div> : null}
            {props.hudActions ? <div className="imm-hud-actions">{props.hudActions}</div> : null}
            {props.hudMsg ? <div className="imm-hud-msg">{props.hudMsg}</div> : null}
          </div>
        ) : null}
        <div ref={props.stageRef} className="imm-stage">
          <div className="imm-board">{props.children}</div>
          {props.side ? (
            <div className={'imm-side' + (props.keepSide ? ' is-keep' : '')}>{props.side}</div>
          ) : null}
        </div>
        {showPad ? withOverlay(props.pad, active) : null}
        {showFooter ? <div className={'imm-footer' + (active ? ' is-overlay-foot' : '')}>{props.footer}</div> : null}
        {props.help ? <div className="imm-help">{props.help}</div> : null}
      </div>
    </>
  );
}
