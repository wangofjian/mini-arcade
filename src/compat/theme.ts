import {
  createContext,
  createElement,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';

export type ThemeKind = 'light' | 'dark';
export type ThemePreference = 'light' | 'dark' | 'system';

const STORAGE_KEY = 'mini-arcade-theme';

export type GrokTextStyle = {
  fontSize: string;
  lineHeight: string;
  letterSpacing: string;
  fontVariationSettings?: string;
};

export type GrokWeightScale = { regular: 400 | 425; medium: 500; semibold: 600 };

export type GrokDataViz = {
  categorical: string[];
  other: string;
  negative: string;
  singleSeriesRest: string;
  areaAlpha: string;
  bandAlpha: string;
  blueTint: string;
  blue5: string;
  sequential: string[];
  diverging: string[];
};

export type GrokPalette = {
  bg: { base: string; subtle: string; elevated: string };
  text: {
    primary: string;
    secondary: string;
    tertiary: string;
    onColor: string;
    onPrimary: string;
    accent: string;
    success: string;
    warning: string;
    danger: string;
    accentDeep: string;
    successDeep: string;
    warningDeep: string;
    dangerDeep: string;
  };
  fill: {
    primary: string;
    primaryHover: string;
    secondary: string;
    secondaryHover: string;
    hover: string;
    pressed: string;
    accent: string;
    controlChecked: string;
    accentSubtle: string;
    successSubtle: string;
    warningSubtle: string;
    dangerSubtle: string;
  };
  border: {
    subtle: string;
    weak: string;
    default: string;
    strong: string;
    focus: string;
  };
};

export type GrokTheme = GrokPalette & {
  kind: ThemeKind;
  font: {
    family: string;
    mono: string;
    heading1: GrokTextStyle;
    heading2: GrokTextStyle;
    heading3: GrokTextStyle;
    body1: GrokTextStyle;
    subtext: GrokTextStyle;
    table: GrokTextStyle;
    metric: GrokTextStyle;
    body2: GrokTextStyle;
    label: GrokTextStyle;
    caption: GrokTextStyle;
    code: GrokTextStyle;
  };
  weight: GrokWeightScale;
  radius: { sm: 4; md: 8; lg: 12; xl: 16; full: 9999 };
  motion: { hover: string; easing: string };
  dataviz: GrokDataViz;
  chart: readonly [string, string, string, string];
};

const fontFace =
  'ui-sans-serif, system-ui, -apple-system, "Segoe UI", "PingFang SC", "Noto Sans SC", "Hiragino Sans GB", "Microsoft YaHei", sans-serif';
const monoFace = 'ui-monospace, SFMono-Regular, "SF Mono", Menlo, Consolas, monospace';

const type = (fontSize: string, lineHeight: string): GrokTextStyle => ({
  fontSize,
  lineHeight,
  letterSpacing: '0',
});

function buildTheme(kind: ThemeKind): GrokTheme {
  const dark = kind === 'dark';
  return {
    kind,
    bg: {
      base: dark ? '#12141a' : '#f7f5f0',
      subtle: dark ? '#1a1d26' : '#efece5',
      elevated: dark ? '#232733' : '#ffffff',
    },
    text: {
      primary: dark ? '#f2efe8' : '#1c1a16',
      secondary: dark ? '#c6c1b6' : '#4f4a40',
      tertiary: dark ? '#8f8a80' : '#7a7367',
      onColor: '#ffffff',
      onPrimary: '#ffffff',
      accent: dark ? '#8ab4ff' : '#1a5fb8',
      success: dark ? '#7dcea0' : '#1e7a46',
      warning: dark ? '#f5c26b' : '#9a6700',
      danger: dark ? '#f07178' : '#c01c28',
      accentDeep: dark ? '#b4d0ff' : '#0b3d7a',
      successDeep: dark ? '#a8e6c4' : '#145c34',
      warningDeep: dark ? '#ffd58a' : '#7a5000',
      dangerDeep: dark ? '#ff9aa0' : '#8e121b',
    },
    fill: {
      primary: dark ? '#3d7ef0' : '#1a5fb8',
      primaryHover: dark ? '#5b93f5' : '#154e96',
      secondary: dark ? '#2b3040' : '#e7e2d8',
      secondaryHover: dark ? '#353b4d' : '#ddd6c9',
      hover: dark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)',
      pressed: dark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.08)',
      accent: dark ? '#3d7ef0' : '#1a5fb8',
      controlChecked: dark ? '#3d7ef0' : '#1a5fb8',
      accentSubtle: dark ? 'rgba(61,126,240,0.22)' : 'rgba(26,95,184,0.14)',
      successSubtle: dark ? 'rgba(125,206,160,0.2)' : 'rgba(30,122,70,0.12)',
      warningSubtle: dark ? 'rgba(245,194,107,0.2)' : 'rgba(154,103,0,0.14)',
      dangerSubtle: dark ? 'rgba(240,113,120,0.2)' : 'rgba(192,28,40,0.12)',
    },
    border: {
      subtle: dark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)',
      weak: dark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)',
      default: dark ? 'rgba(255,255,255,0.16)' : 'rgba(0,0,0,0.16)',
      strong: dark ? 'rgba(255,255,255,0.28)' : 'rgba(0,0,0,0.28)',
      focus: dark ? '#8ab4ff' : '#1a5fb8',
    },
    font: {
      family: fontFace,
      mono: monoFace,
      heading1: type('30px', '36px'),
      heading2: type('24px', '30px'),
      heading3: type('20px', '26px'),
      body1: type('16px', '24px'),
      subtext: type('14px', '20px'),
      table: type('15px', '22px'),
      metric: type('24px', '30px'),
      body2: type('13px', '18px'),
      label: type('12px', '16px'),
      caption: type('11px', '16px'),
      code: type('13px', '20px'),
    },
    weight: { regular: 400, medium: 500, semibold: 600 },
    radius: { sm: 4, md: 8, lg: 12, xl: 16, full: 9999 },
    motion: { hover: '120ms', easing: 'cubic-bezier(0.2, 0, 0, 1)' },
    dataviz: {
      categorical: dark
        ? ['#8ab4ff', '#f5c26b', '#7dcea0', '#d5a6ff', '#f07178', '#7fdbda', '#ffae65', '#b4d0ff']
        : ['#1a5fb8', '#c64600', '#1e7a46', '#813d9c', '#c01c28', '#0e7c7b', '#9a6700', '#3d5afe'],
      other: dark ? '#8f8a80' : '#7a7367',
      negative: dark ? '#f07178' : '#c01c28',
      singleSeriesRest: dark ? '#4a5163' : '#cfc8bb',
      areaAlpha: '33',
      bandAlpha: '22',
      blueTint: dark ? 'rgba(61,126,240,0.18)' : 'rgba(26,95,184,0.1)',
      blue5: dark ? '#1e3a6e' : '#d6e4f7',
      sequential: dark
        ? ['#1e3a6e', '#2a5296', '#3d7ef0', '#8ab4ff', '#d6e4f7']
        : ['#d6e4f7', '#8ab4ff', '#3d7ef0', '#1a5fb8', '#0b3d7a'],
      diverging: dark
        ? ['#f07178', '#f5c26b', '#e8e4dc', '#7dcea0', '#8ab4ff']
        : ['#c01c28', '#c64600', '#efece5', '#1e7a46', '#1a5fb8'],
    },
    chart: dark
      ? ['#f2efe8', '#c6c1b6', '#8f8a80', '#2b3040']
      : ['#1c1a16', '#7a7367', '#cfc8bb', '#e7e2d8'],
  };
}

function systemKind(): ThemeKind {
  if (typeof window === 'undefined') return 'light';
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

function readPreference(): ThemePreference {
  try {
    const v = localStorage.getItem(STORAGE_KEY);
    if (v === 'light' || v === 'dark' || v === 'system') return v;
  } catch {
    /* ignore */
  }
  return 'system';
}

type ThemeContextValue = {
  theme: GrokTheme;
  preference: ThemePreference;
  setPreference: (pref: ThemePreference) => void;
};

const ThemeContext = createContext<ThemeContextValue | null>(null);

export function ThemeProvider(props: { children: ReactNode }) {
  const [preference, setPreferenceState] = useState<ThemePreference>(readPreference);
  const [system, setSystem] = useState<ThemeKind>(systemKind);

  useEffect(() => {
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    const onChange = () => setSystem(mq.matches ? 'dark' : 'light');
    onChange();
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, []);

  const kind: ThemeKind = preference === 'system' ? system : preference;
  const theme = useMemo(() => buildTheme(kind), [kind]);

  useEffect(() => {
    document.documentElement.dataset.theme = kind;
    document.documentElement.style.colorScheme = kind;
  }, [kind]);

  const setPreference = (pref: ThemePreference) => {
    setPreferenceState(pref);
    try {
      localStorage.setItem(STORAGE_KEY, pref);
    } catch {
      /* ignore */
    }
  };

  const value = useMemo(
    () => ({ theme, preference, setPreference }),
    [theme, preference],
  );

  return createElement(ThemeContext.Provider, { value }, props.children);
}

export function useThemeContext(): ThemeContextValue {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('ThemeProvider missing');
  return ctx;
}

export function useGrokTheme(): GrokTheme {
  return useThemeContext().theme;
}
