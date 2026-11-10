export type {
  ChangeEvent,
  CSSProperties,
  FocusEvent,
  FormEvent,
  KeyboardEvent,
  MouseEvent,
  PointerEvent,
  ReactNode,
  RefObject,
  SyntheticEvent,
} from 'react';
export {
  Fragment,
  useCallback,
  useEffect,
  useMemo,
  useReducer,
  useRef,
  useState,
} from 'react';

import {
  useEffect,
  type CSSProperties,
  type ReactNode,
} from 'react';
import { Link } from 'react-router-dom';
import { useGrokTheme, type GrokTheme } from './theme';

export { useGrokTheme } from './theme';
export type { GrokTheme, GrokPalette, GrokDataViz, GrokTextStyle, GrokWeightScale } from './theme';

export type PageWidth = 'column' | 'wide' | 'full';
export type ButtonVariant = 'primary' | 'quiet';
export type Tone = 'success' | 'warning' | 'danger';
export type CalloutTone = 'info' | Tone;
export type StatusTone = 'success' | 'warning' | 'danger' | 'accent' | 'neutral';

export type PageProps = {
  title: string;
  summary?: string;
  sources?: string[];
  width?: PageWidth;
  lang?: string;
  palette?: string[];
  children?: ReactNode;
};

export function Page(props: PageProps) {
  const theme = useGrokTheme();
  useEffect(() => {
    const prev = document.title;
    document.title = props.title + ' · 小游戏厅';
    if (props.lang) document.documentElement.lang = props.lang;
    return () => {
      document.title = prev;
    };
  }, [props.title, props.lang]);
  return (
    <article
      className={'gc-page gc-page-' + (props.width ?? 'column')}
      style={{ color: theme.text.primary, fontFamily: theme.font.family }}
    >
      <header className="gc-page-head">
        <h1 className="gc-page-title">{props.title}</h1>
        {props.summary ? <p className="gc-page-summary">{props.summary}</p> : null}
      </header>
      {props.children}
    </article>
  );
}

export type SectionProps = {
  heading?: string;
  id?: string;
  caption?: string;
  actions?: ReactNode;
  collapsible?: boolean;
  defaultOpen?: boolean;
  children?: ReactNode;
};

export function Section(props: SectionProps) {
  return (
    <section className="gc-section" id={props.id}>
      {props.heading ? (
        <div className="gc-section-bar">
          <h2 className="gc-section-heading">{props.heading}</h2>
          {props.actions}
        </div>
      ) : null}
      {props.caption ? <p className="gc-section-caption">{props.caption}</p> : null}
      {props.children}
    </section>
  );
}

export function Text(props: { children?: ReactNode }) {
  return <div className="gc-text">{props.children}</div>;
}

export type ButtonProps = {
  label: string;
  onClick: () => void;
  variant?: ButtonVariant;
  disabled?: boolean;
};

export function Button(props: ButtonProps) {
  return (
    <button
      type="button"
      className={'gc-btn' + (props.variant === 'primary' ? ' gc-btn-primary' : '')}
      disabled={props.disabled}
      onClick={props.onClick}
    >
      {props.label}
    </button>
  );
}

export type SegmentedOption<T extends string = string> = { value: T; label: string; count?: number };
export type SegmentedProps<T extends string = string> = {
  options: (T | SegmentedOption<T>)[];
  value: T;
  onChange: (value: T) => void;
};

export function Segmented<T extends string = string>(props: SegmentedProps<T>) {
  return (
    <div className="gc-segmented" role="tablist">
      {props.options.map((opt: T | SegmentedOption<T>) => {
        const value = (typeof opt === 'string' ? opt : opt.value) as T;
        const label = typeof opt === 'string' ? opt : opt.label;
        const selected = props.value === value;
        return (
          <button
            key={value}
            type="button"
            role="tab"
            aria-selected={selected}
            className={'gc-seg' + (selected ? ' is-on' : '')}
            onClick={() => props.onChange(value)}
          >
            {label}
          </button>
        );
      })}
    </div>
  );
}

export type SelectOption<T extends string = string> = { value: T; label: string };
export type SelectProps<T extends string = string> = {
  label?: string;
  options: (T | SelectOption<T>)[];
  value: T;
  onChange: (value: T) => void;
  placeholder?: string;
  disabled?: boolean;
};

export function Select<T extends string = string>(props: SelectProps<T>) {
  return (
    <label className="gc-field">
      {props.label ? <span className="gc-field-label">{props.label}</span> : null}
      <select
        className="gc-select"
        value={props.value}
        disabled={props.disabled}
        onChange={(e) => props.onChange(e.target.value as T)}
      >
        {props.placeholder ? <option value="">{props.placeholder}</option> : null}
        {props.options.map((opt: T | SelectOption<T>) => {
          const value = (typeof opt === 'string' ? opt : opt.value) as T;
          const label = typeof opt === 'string' ? opt : opt.label;
          return (
            <option key={value} value={value}>
              {label}
            </option>
          );
        })}
      </select>
    </label>
  );
}

export type ToggleProps = {
  label?: string;
  value: boolean;
  onChange: (value: boolean) => void;
  disabled?: boolean;
};

export function Toggle(props: ToggleProps) {
  return (
    <label className={'gc-toggle' + (props.disabled ? ' is-disabled' : '')}>
      <input
        type="checkbox"
        role="switch"
        checked={props.value}
        disabled={props.disabled}
        onChange={(e) => props.onChange(e.target.checked)}
      />
      {props.label ? <span>{props.label}</span> : null}
    </label>
  );
}

export type GridColumns = 2 | 3 | 4 | 5 | 6 | 7;
export type GridProps = {
  columns?: GridColumns;
  joined?: boolean;
  plain?: boolean;
  children?: ReactNode;
};

export function Grid(props: GridProps) {
  return (
    <div
      className={'gc-grid' + (props.plain ? ' is-plain' : '')}
      style={{ gridTemplateColumns: 'repeat(' + (props.columns ?? 3) + ', minmax(0, 1fr))' }}
    >
      {props.children}
    </div>
  );
}

export type Link = { title: string; site?: string; date?: string; href: string };
export type LinkCardsProps = { links: Link[]; numbered?: boolean };

export function LinkCards(props: LinkCardsProps) {
  return (
    <div className="gc-linkcards">
      {props.links.map((link: Link) => {
        const inner = (
          <>
            <span className="gc-link-title">{link.title}</span>
            {link.site ? <span className="gc-link-site">{link.site}</span> : null}
          </>
        );
        const isInternal = link.href.startsWith('/') && !link.href.startsWith('//');
        if (isInternal) {
          return (
            <Link key={link.href + link.title} className="gc-linkcard" to={link.href}>
              {inner}
            </Link>
          );
        }
        return (
          <a key={link.href + link.title} className="gc-linkcard" href={link.href}>
            {inner}
          </a>
        );
      })}
    </div>
  );
}

export type TableCell = string | { text: string; tone?: Tone } | ReactNode;
export type TableProps = {
  columns: string[];
  rows: TableCell[][];
  emphasis?: number;
  align?: ('auto' | 'start' | 'end')[];
};

function renderCell(cell: TableCell, i: number) {
  if (cell !== null && typeof cell === 'object' && 'text' in (cell as { text?: string })) {
    const c = cell as { text: string; tone?: Tone };
    return (
      <td key={i} className={c.tone ? 'tone-' + c.tone : undefined}>
        {c.text}
      </td>
    );
  }
  return <td key={i}>{cell as ReactNode}</td>;
}

export function Table(props: TableProps) {
  return (
    <div className="gc-table-wrap">
      <table className="gc-table">
        <thead>
          <tr>
            {props.columns.map((col: string) => (
              <th key={col}>{col}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {props.rows.map((row: TableCell[], ri: number) => (
            <tr key={ri}>{row.map((cell: TableCell, ci: number) => renderCell(cell, ci))}</tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export type CalloutProps = { lead?: string; tone?: CalloutTone; children?: ReactNode };
export function Callout(props: CalloutProps) {
  return (
    <div className={'gc-callout tone-' + (props.tone ?? 'info')}>
      {props.lead ? <strong className="gc-callout-lead">{props.lead}</strong> : null}
      <div>{props.children}</div>
    </div>
  );
}

export type Step = { title: ReactNode; detail?: ReactNode };
export type StepsProps = { steps: Step[] };
export function Steps(props: StepsProps) {
  return (
    <ol className="gc-steps">
      {props.steps.map((step: Step, i: number) => (
        <li key={i}>
          <div className="gc-step-title">{step.title}</div>
          {step.detail ? <div className="gc-step-detail">{step.detail}</div> : null}
        </li>
      ))}
    </ol>
  );
}

export type DiagramNodeKind = 'box' | 'decision' | 'terminal' | 'person';
export type DiagramNode = {
  id: string;
  label: string;
  detail?: string;
  kind?: DiagramNodeKind;
  avatar?: string;
  series?: number;
};
export type DiagramEdge = { from: string; to: string; label?: string; detail?: string; dashed?: boolean };
export type DiagramProps = {
  nodes: DiagramNode[];
  edges: DiagramEdge[];
  direction?: 'horizontal' | 'vertical';
};

export function Diagram(props: DiagramProps) {
  const horiz = props.direction !== 'vertical';
  return (
    <div className={'gc-diagram' + (horiz ? ' is-h' : ' is-v')} role="img" aria-label="流程图">
      {props.nodes.map((node: DiagramNode, i: number) => (
        <div key={node.id} className="gc-diagram-wrap">
          <div className={'gc-diagram-node kind-' + (node.kind ?? 'box')}>
            <strong>{node.label}</strong>
            {node.detail ? <span>{node.detail}</span> : null}
          </div>
          {i < props.nodes.length - 1 ? (
            <div className="gc-diagram-arrow">
              {props.edges[i]?.label ?? (horiz ? '→' : '↓')}
            </div>
          ) : null}
        </div>
      ))}
    </div>
  );
}

export type FloatingAlign = 'start' | 'center' | 'end';
export type FloatingEdge = 'top' | 'bottom';
export type FloatingProps = {
  edge?: FloatingEdge;
  align?: FloatingAlign;
  bar?: boolean;
  children?: ReactNode;
};
export function Floating(props: FloatingProps) {
  const style: CSSProperties = {
    position: 'sticky',
    [props.edge === 'top' ? 'top' : 'bottom']: 0,
    zIndex: 20,
  };
  return (
    <div className={'gc-floating' + (props.bar ? ' is-bar' : '')} style={style}>
      {props.children}
    </div>
  );
}

export function BackToTop(props: { label?: string }) {
  return (
    <button type="button" className="gc-btn" onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}>
      {props.label ?? '回到顶部'}
    </button>
  );
}

export type InputProps = {
  label?: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  type?: 'text' | 'number';
};
export function Input(props: InputProps) {
  return (
    <label className="gc-field">
      {props.label ? <span className="gc-field-label">{props.label}</span> : null}
      <input
        className="gc-input"
        type={props.type ?? 'text'}
        value={props.value}
        placeholder={props.placeholder}
        onChange={(e) => props.onChange(e.target.value)}
      />
    </label>
  );
}

export function Divider() {
  return <hr className="gc-divider" />;
}

export type StatusProps = { tone?: StatusTone; children: ReactNode };
export function Status(props: StatusProps) {
  return <span className={'gc-status tone-' + (props.tone ?? 'neutral')}>{props.children}</span>;
}

// Unused-by-games stubs so unexpected imports still compile.
export function CalloutUnused() { return null; }
export const Checkbox = (props: { label?: string; value: boolean; disabled?: boolean }) => (
  <label className="gc-toggle is-disabled">
    <input type="checkbox" checked={props.value} disabled readOnly />
    {props.label}
  </label>
);
