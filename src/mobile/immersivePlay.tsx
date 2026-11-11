import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { useLocation } from 'react-router-dom';

export const IMMERSIVE_CLASS = 'is-immersive-play';

type ImmersivePlayValue = {
  active: boolean;
  enter: () => void;
  exit: () => void;
  toggle: () => void;
};

const ImmersivePlayContext = createContext<ImmersivePlayValue | null>(null);

function applyImmersiveClass(on: boolean) {
  document.documentElement.classList.toggle(IMMERSIVE_CLASS, on);
  document.body.classList.toggle(IMMERSIVE_CLASS, on);
}

export function ImmersivePlayProvider(props: { children: ReactNode }) {
  const [active, setActive] = useState(false);

  useEffect(() => {
    applyImmersiveClass(active);
    return () => applyImmersiveClass(false);
  }, [active]);

  useEffect(() => {
    if (!active) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        setActive(false);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [active]);

  const enter = useCallback(() => setActive(true), []);
  const exit = useCallback(() => setActive(false), []);
  const toggle = useCallback(() => setActive((v) => !v), []);
  const value = useMemo(
    () => ({ active, enter, exit, toggle }),
    [active, enter, exit, toggle],
  );

  return (
    <ImmersivePlayContext.Provider value={value}>{props.children}</ImmersivePlayContext.Provider>
  );
}

export function ExitImmersiveOnNavigate() {
  const location = useLocation();
  const { exit } = useImmersivePlay();
  useEffect(() => {
    exit();
  }, [location.pathname, exit]);
  return null;
}

export function useImmersivePlay(): ImmersivePlayValue {
  const ctx = useContext(ImmersivePlayContext);
  if (!ctx) {
    throw new Error('useImmersivePlay must be used inside ImmersivePlayProvider');
  }
  return ctx;
}
