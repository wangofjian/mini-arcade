import { Link, Outlet, useLocation, useParams } from 'react-router-dom';
import { useThemeContext } from '../compat/theme';
import { findGame } from '../catalog';

export function Shell() {
  const { preference, setPreference, theme } = useThemeContext();
  const location = useLocation();
  const params = useParams();
  const game = findGame(params.slug);
  const atHome = location.pathname === '/';

  const cycleTheme = () => {
    const order = ['system', 'light', 'dark'] as const;
    const i = order.indexOf(preference);
    setPreference(order[(i + 1) % order.length]);
  };

  const themeLabel =
    preference === 'system' ? '主题：跟随系统' : preference === 'dark' ? '主题：深色' : '主题：浅色';

  return (
    <div className="app-shell">
      <header className="app-nav">
        <div className="app-nav-start">
          {atHome ? (
            <span className="app-brand">小游戏厅</span>
          ) : (
            <Link className="app-back" to="/">
              ← 返回游戏厅
            </Link>
          )}
          {game ? <span className="app-current">{game.title}</span> : null}
        </div>
        <button type="button" className="gc-btn" onClick={cycleTheme} aria-label={themeLabel}>
          {themeLabel}
        </button>
      </header>
      <main className="app-main" style={{ background: theme.bg.base }}>
        <Outlet />
      </main>
    </div>
  );
}
