import {
  Page,
  Button,
  useEffect,
  useRef,
  useState,
  useGrokTheme,
} from '../compat/grok-canvas';
import { ImmersiveFrame } from '../mobile/ImmersiveFrame';
import { useImmersivePlay } from '../mobile/immersivePlay';
import { useStageFit } from '../mobile/useStageFit';
import { clientToLogical } from '../mobile/coords';
import {
  applyLevelClear,
  loadLevelSave,
  writeLevelSave,
  type LevelSave,
} from '../rules/progressSave';
import {
  UNITS,
  UNIT_ORDER,
  ENEMIES,
  YD_CELL,
  YD_COLS,
  YD_ROWS,
  YD_FIELD_W,
  YD_FIELD_H,
  YD_LEVELS,
  YD_LEVEL_COUNT,
  YD_SAVE_KEY,
  cellCenter,
  createYdMatch,
  tickYd,
  tryPlace,
  tryShovel,
  type UnitKind,
  type YdMatch,
} from '../rules/yardDefense';

const CW = 800;
const CH = 560;
const OX = 48;
const OY = 52;

function fieldPoint(lx: number, ly: number): { col: number; row: number } | null {
  const x = lx - OX;
  const y = ly - OY;
  if (x < 0 || y < 0 || x >= YD_FIELD_W || y >= YD_FIELD_H) return null;
  return { col: Math.min(YD_COLS - 1, Math.floor(x / YD_CELL)), row: Math.min(YD_ROWS - 1, Math.floor(y / YD_CELL)) };
}

function unitBarHit(lx: number, ly: number): UnitKind | 'shovel' | null {
  if (ly < 468 || ly > 544) return null;
  const items: Array<UnitKind | 'shovel'> = [...UNIT_ORDER, 'shovel'];
  const slot = Math.floor((lx - 16) / 128);
  return items[slot] ?? null;
}

export default function YardDefense() {
  const theme = useGrokTheme();
  const canvas = useRef<HTMLCanvasElement | null>(null);
  const stageRef = useRef<HTMLDivElement | null>(null);
  const { active: immersive } = useImmersivePlay();
  const fit = useStageFit(stageRef, CW, CH, immersive, true);
  const match = useRef<YdMatch | null>(null);
  const selected = useRef<UnitKind | 'shovel' | null>('sprinkler');
  const paused = useRef(false);
  const last = useRef(0);
  const screen = useRef<'select' | 'play'>('select');
  const saved = useRef(false);
  const saveRef = useRef<LevelSave>(loadLevelSave(YD_SAVE_KEY, YD_LEVEL_COUNT));
  const [hud, setHud] = useState({
    screen: 'select' as 'select' | 'play',
    dew: 0,
    phase: '',
    message: '',
    home: 3,
    score: 0,
    stars: 0,
    level: 1,
    levelName: '',
    paused: false,
    selected: 'sprinkler' as UnitKind | 'shovel' | null,
    save: saveRef.current,
  });

  const sync = () => {
    const m = match.current;
    setHud({
      screen: screen.current,
      dew: m?.dew ?? 0,
      phase: m?.phase ?? '',
      message: m?.message ?? '',
      home: m?.homeHp ?? 3,
      score: m?.score ?? 0,
      stars: m?.stars ?? 0,
      level: m?.level.id ?? 1,
      levelName: m?.level.name ?? '',
      paused: paused.current,
      selected: selected.current,
      save: saveRef.current,
    });
  };

  const persist = (m: YdMatch) => {
    if (m.phase !== 'won' || saved.current) return;
    saveRef.current = applyLevelClear(saveRef.current, m.level.id - 1, m.stars, m.score, YD_LEVEL_COUNT);
    writeLevelSave(YD_SAVE_KEY, saveRef.current);
    saved.current = true;
  };

  const openLevel = (id: number) => {
    if (id > saveRef.current.unlocked) return;
    match.current = createYdMatch(id);
    screen.current = 'play';
    paused.current = false;
    saved.current = false;
    selected.current = 'sprinkler';
    last.current = 0;
    sync();
    canvas.current?.focus();
  };

  const retry = () => {
    const m = match.current;
    if (!m) return;
    openLevel(m.level.id);
  };

  const nextLevel = () => {
    const m = match.current;
    if (!m) return;
    const n = Math.min(YD_LEVEL_COUNT, m.level.id + 1);
    if (n <= saveRef.current.unlocked) openLevel(n);
    else {
      screen.current = 'select';
      match.current = null;
      sync();
    }
  };

  const togglePause = () => {
    const m = match.current;
    if (!m || screen.current !== 'play') return;
    if (m.phase === 'won' || m.phase === 'lost') return;
    paused.current = !paused.current;
    last.current = 0;
    sync();
  };

  useEffect(() => {
    const c = canvas.current;
    if (!c) return;
    const ctx = c.getContext('2d');
    if (!ctx) return;
    let raf = 0;

    const logical = (e: PointerEvent) =>
      clientToLogical(c.getBoundingClientRect(), e.clientX, e.clientY, CW, CH, 'fill');

    const onDown = (e: PointerEvent) => {
      e.preventDefault();
      c.focus();
      try { c.setPointerCapture(e.pointerId); } catch { /* ignore */ }
      const p = logical(e);
      if (screen.current === 'select') {
        const col = Math.floor((p.x - 40) / 180);
        const row = Math.floor((p.y - 120) / 90);
        const x0 = 40 + col * 180, y0 = 120 + row * 90;
        const id = row * 4 + col + 1;
        if (col >= 0 && col < 4 && row >= 0 && id >= 1 && id <= YD_LEVEL_COUNT && p.x <= x0 + 168 && p.y <= y0 + 78) openLevel(id);
        return;
      }
      const m = match.current;
      if (!m) return;
      if (m.phase === 'won' || m.phase === 'lost') return;
      const bar = unitBarHit(p.x, p.y);
      if (bar) {
        selected.current = bar;
        sync();
        return;
      }
      const cell = fieldPoint(p.x, p.y);
      if (!cell) return;
      if (selected.current === 'shovel') tryShovel(m, cell.row, cell.col);
      else if (selected.current) tryPlace(m, cell.row, cell.col, selected.current);
      sync();
    };
    const onUp = (e: PointerEvent) => {
      e.preventDefault();
      try { c.releasePointerCapture(e.pointerId); } catch { /* ignore */ }
    };
    const onCancel = (e: PointerEvent) => {
      e.preventDefault();
      try { c.releasePointerCapture(e.pointerId); } catch { /* ignore */ }
    };
    const onKey = (e: KeyboardEvent) => {
      if ((e.target as HTMLElement)?.tagName === 'BUTTON' && e.code !== 'Space') return;
      if (e.code === 'KeyP') { e.preventDefault(); togglePause(); }
      if (e.code === 'KeyR' && !e.repeat) { e.preventDefault(); retry(); }
      if (e.code === 'Digit1') selected.current = 'dish';
      if (e.code === 'Digit2') selected.current = 'sprinkler';
      if (e.code === 'Digit3') selected.current = 'vine';
      if (e.code === 'Digit4') selected.current = 'berry';
      if (e.code === 'Digit5') selected.current = 'frost';
      if (e.code === 'Digit0' || e.code === 'KeyX') selected.current = 'shovel';
      if (e.code.startsWith('Digit')) sync();
    };
    const hide = () => {
      const m = match.current;
      if (document.hidden && screen.current === 'play' && m && m.phase !== 'won' && m.phase !== 'lost') {
        paused.current = true;
        last.current = 0;
        sync();
      }
    };

    c.addEventListener('pointerdown', onDown);
    c.addEventListener('pointerup', onUp);
    c.addEventListener('pointercancel', onCancel);
    c.addEventListener('lostpointercapture', onCancel);
    window.addEventListener('keydown', onKey);
    document.addEventListener('visibilitychange', hide);

    const drawSelect = (now: number) => {
      ctx.fillStyle = '#163124';
      ctx.fillRect(0, 0, CW, CH);
      ctx.fillStyle = '#1f4632';
      for (let i = 0; i < 12; i++) ctx.fillRect((i * 97 + now / 40) % CW, 80 + (i * 53) % 360, 40, 8);
      ctx.fillStyle = '#f3efe4';
      ctx.font = 'bold 32px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('庭院防线', CW / 2, 64);
      ctx.font = '15px sans-serif';
      ctx.fillStyle = '#c9dcc8';
      ctx.fillText('用露水布置不同职责的守卫，挡住分路而来的虫群。', CW / 2, 92);
      YD_LEVELS.forEach((lv, i) => {
        const col = i % 4;
        const row = Math.floor(i / 4);
        const x = 40 + col * 180;
        const y = 120 + row * 90;
        const locked = lv.id > saveRef.current.unlocked;
        ctx.fillStyle = locked ? '#1a2e24' : '#2a5640';
        ctx.beginPath();
        ctx.roundRect(x, y, 168, 78, 10);
        ctx.fill();
        ctx.fillStyle = locked ? '#6a7f72' : '#f3efe4';
        ctx.font = 'bold 16px sans-serif';
        ctx.textAlign = 'left';
        ctx.fillText((locked ? '锁定  ' : '') + lv.id + '  ' + lv.name, x + 12, y + 30);
        const stars = saveRef.current.stars[i] ?? 0;
        ctx.fillStyle = '#e7c25a';
        ctx.font = '14px sans-serif';
        ctx.fillText(stars > 0 ? '★'.repeat(stars) + '☆'.repeat(3 - stars) : locked ? '先通过上一关' : '尚未挑战', x + 12, y + 56);
      });
    };

    const drawPlay = (m: YdMatch) => {
      ctx.fillStyle = '#14291f';
      ctx.fillRect(0, 0, CW, CH);
      ctx.fillStyle = '#3e6b3a';
      ctx.fillRect(OX, OY, YD_FIELD_W, YD_FIELD_H);
      // home
      ctx.fillStyle = '#c9a06a';
      ctx.fillRect(8, OY, 36, YD_FIELD_H);
      ctx.fillStyle = '#a87848';
      ctx.fillRect(8, OY + 40, 36, 8);
      ctx.fillStyle = '#f3efe4';
      ctx.font = '11px sans-serif';
      ctx.textAlign = 'center';
      ctx.save();
      ctx.translate(26, OY + YD_FIELD_H / 2);
      ctx.rotate(-Math.PI / 2);
      ctx.fillText('庭院门口', 0, 0);
      ctx.restore();
      for (let r = 0; r < YD_ROWS; r++) {
        for (let c = 0; c < YD_COLS; c++) {
          const { x, y } = cellCenter(c, r);
          ctx.fillStyle = (r + c) % 2 === 0 ? '#4a7a44' : '#456f41';
          ctx.fillRect(OX + x - YD_CELL / 2, OY + y - YD_CELL / 2, YD_CELL, YD_CELL);
        }
      }
      for (const p of m.plants) {
        const { x, y } = cellCenter(p.col, p.row);
        const def = UNITS[p.kind];
        const px = OX + x;
        const py = OY + y;
        ctx.fillStyle = def.color;
        ctx.beginPath();
        if (p.kind === 'vine') ctx.roundRect(px - 28, py - 30, 56, 60, 6);
        else ctx.arc(px, py, 26, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#fff';
        ctx.font = 'bold 13px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(def.name, px, py + 4);
        ctx.fillStyle = '#1a2a18';
        ctx.fillRect(px - 22, py + 22, 44, 5);
        ctx.fillStyle = '#8fde7a';
        ctx.fillRect(px - 22, py + 22, 44 * (p.hp / p.maxHp), 5);
      }
      for (const e of m.enemies) {
        const def = ENEMIES[e.kind];
        const py = OY + cellCenter(0, e.row).y;
        const px = OX + e.x;
        ctx.fillStyle = def.color;
        ctx.beginPath();
        ctx.ellipse(px, py, e.kind === 'brute' ? 26 : 18, 14, 0, 0, Math.PI * 2);
        ctx.fill();
        if (def.flying) {
          ctx.strokeStyle = '#fff8';
          ctx.beginPath();
          ctx.ellipse(px, py - 10, 16, 5, 0, 0, Math.PI * 2);
          ctx.stroke();
        }
        if (e.slowT > 0) {
          ctx.strokeStyle = '#8ee7ff';
          ctx.stroke();
        }
        ctx.fillStyle = '#1a2a18';
        ctx.fillRect(px - 16, py - 24, 32, 4);
        ctx.fillStyle = '#ef9aa8';
        ctx.fillRect(px - 16, py - 24, 32 * (e.hp / e.maxHp), 4);
      }
      for (const b of m.bolts) {
        ctx.fillStyle = b.kind === 'frost' ? '#9ee7f0' : b.kind === 'berry' ? '#e07080' : '#cfe8ff';
        ctx.beginPath();
        ctx.arc(OX + b.x, OY + b.y, 5, 0, Math.PI * 2);
        ctx.fill();
      }
      // HUD
      ctx.textAlign = 'left';
      ctx.fillStyle = '#f3efe4';
      ctx.font = 'bold 18px sans-serif';
      ctx.fillText(m.level.id + '  ' + m.level.name, 16, 28);
      ctx.font = '15px sans-serif';
      ctx.fillText('露水 ' + Math.floor(m.dew) + '    门口 ' + m.homeHp + '    击退 ' + m.defeated + '/' + m.level.waves.length, 280, 28);
      const remain = m.phase === 'prep' ? Math.max(0, m.level.prep - m.time) : 0;
      ctx.textAlign = 'right';
      ctx.fillText(m.phase === 'prep' ? '准备 ' + remain.toFixed(1) + 's' : m.phase === 'battle' ? '防守中' : m.phase === 'won' ? '守住了' : '失守', CW - 16, 28);
      // unit bar
      const items: Array<UnitKind | 'shovel'> = [...UNIT_ORDER, 'shovel'];
      items.forEach((k, i) => {
        const x = 16 + i * 128;
        const y = 472;
        const on = selected.current === k;
        ctx.fillStyle = on ? '#3a6a50' : '#1d3328';
        ctx.beginPath();
        ctx.roundRect(x, y, 120, 72, 8);
        ctx.fill();
        if (k === 'shovel') {
          ctx.fillStyle = '#f3efe4';
          ctx.font = 'bold 14px sans-serif';
          ctx.textAlign = 'center';
          ctx.fillText('拆除', x + 60, y + 32);
          ctx.font = '11px sans-serif';
          ctx.fillText('退还 40%', x + 60, y + 52);
        } else {
          const def = UNITS[k];
          ctx.fillStyle = def.color;
          ctx.fillRect(x + 8, y + 8, 10, 56);
          ctx.fillStyle = '#f3efe4';
          ctx.font = 'bold 14px sans-serif';
          ctx.textAlign = 'left';
          ctx.fillText(def.name + '  ' + def.cost, x + 24, y + 28);
          ctx.font = '11px sans-serif';
          ctx.fillStyle = '#c9dcc8';
          ctx.fillText(def.role, x + 24, y + 50);
        }
      });
      ctx.textAlign = 'center';
      ctx.fillStyle = '#c9dcc8';
      ctx.font = '13px sans-serif';
      ctx.fillText(m.message, CW / 2, 458);
      if (paused.current && m.phase !== 'won' && m.phase !== 'lost') {
        ctx.fillStyle = '#0c1a12cc';
        ctx.fillRect(0, 0, CW, CH);
        ctx.fillStyle = '#f3efe4';
        ctx.font = 'bold 32px sans-serif';
        ctx.fillText('已暂停', CW / 2, 260);
        ctx.font = '16px sans-serif';
        ctx.fillText('切回前台后点「继续」或按 P', CW / 2, 300);
      }
      if (m.phase === 'won' || m.phase === 'lost') {
        ctx.fillStyle = '#0c1a12d4';
        ctx.fillRect(0, 0, CW, CH);
        ctx.fillStyle = '#f3efe4';
        ctx.font = 'bold 32px sans-serif';
        ctx.fillText(m.phase === 'won' ? '庭院守住了' : '虫群闯进了庭院', CW / 2, 230);
        ctx.font = '18px sans-serif';
        ctx.fillText(m.phase === 'won' ? '★'.repeat(m.stars) + '  得分 ' + m.score : '调整布置后再试', CW / 2, 274);
        ctx.font = '15px sans-serif';
        ctx.fillStyle = '#c9dcc8';
        ctx.fillText('用下方按钮重试' + (m.phase === 'won' ? '或进入下一关' : '') + '，也可回选关。', CW / 2, 314);
      }
    };

    const frame = (t: number) => {
      const dt = last.current ? Math.min(0.05, (t - last.current) / 1000) : 0;
      last.current = t;
      const m = match.current;
      if (screen.current === 'select') drawSelect(t);
      else if (m) {
        if (!paused.current) tickYd(m, dt);
        if (m.phase === 'won') persist(m);
        drawPlay(m);
      }
      raf = requestAnimationFrame(frame);
    };
    raf = requestAnimationFrame(frame);

    const hudTimer = setInterval(() => {
      if (screen.current === 'play' && match.current) sync();
    }, 200);

    return () => {
      cancelAnimationFrame(raf);
      clearInterval(hudTimer);
      c.removeEventListener('pointerdown', onDown);
      c.removeEventListener('pointerup', onUp);
      c.removeEventListener('pointercancel', onCancel);
      c.removeEventListener('lostpointercapture', onCancel);
      window.removeEventListener('keydown', onKey);
      document.removeEventListener('visibilitychange', hide);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const playing = hud.screen === 'play';
  const ended = hud.phase === 'won' || hud.phase === 'lost';

  return (
    <Page title="庭院防线" width="wide" lang="zh-Hans" summary="用露水布置喷管、藤栏、爆果和寒叶，挡住分路入侵的虫群。原创单位与关卡。">
      <ImmersiveFrame
        layout="banded"
        stageRef={stageRef}
        focusRef={canvas}
        intro={
          <p style={{ margin: 0, color: theme.text.secondary }}>
            手机可点「全屏游玩」。点选底部单位，再点庭院格子布置。不强加方向键。关卡进度在浏览器允许时保存在本机。
          </p>
        }
        hudStats={
          playing ? (
            <>
              <span>{hud.levelName}</span>
              <span>露水 {Math.floor(hud.dew)}</span>
              <span>门口 {hud.home}</span>
              <span>{hud.paused ? '已暂停' : hud.phase === 'prep' ? '准备中' : hud.phase === 'won' ? '胜利' : hud.phase === 'lost' ? '失守' : '防守中'}</span>
            </>
          ) : (
            <span>选择关卡</span>
          )
        }
        hudActions={
          playing ? (
            <>
              <Button label={hud.paused ? '继续' : '暂停'} onClick={togglePause} disabled={ended} />
              <Button label="重试" onClick={retry} />
              {hud.phase === 'won' ? <Button label="下一关" variant="primary" onClick={nextLevel} /> : null}
              <Button label="选关" onClick={() => { screen.current = 'select'; match.current = null; sync(); }} />
            </>
          ) : null
        }
        hudMsg={playing ? <span>{hud.message}</span> : null}
        side={
          <>
            <div className="imm-default-only arcade-lvls" style={{ marginBottom: 12 }}>
              {YD_LEVELS.map((lv) => {
                const locked = lv.id > hud.save.unlocked;
                const stars = hud.save.stars[lv.id - 1] ?? 0;
                return (
                  <Button
                    key={lv.id}
                    label={lv.id + ' ' + lv.name + (stars ? ' ' + '★'.repeat(stars) : locked ? ' 锁定' : '')}
                    variant={!locked && playing && hud.level === lv.id ? 'primary' : 'quiet'}
                    disabled={locked}
                    onClick={() => openLevel(lv.id)}
                  />
                );
              })}
            </div>
            {playing ? (
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }}>
                <Button label={hud.paused ? '继续' : '暂停'} onClick={togglePause} disabled={ended} />
                <Button label="重新开始" onClick={retry} />
                {hud.phase === 'won' ? <Button label="下一关" variant="primary" onClick={nextLevel} /> : null}
                <Button label="返回选关" onClick={() => { screen.current = 'select'; match.current = null; sync(); }} />
              </div>
            ) : (
              <p style={{ color: theme.text.secondary, fontSize: 14 }}>点关卡卡片或画面中的关卡格开始。1–5 键选择单位，X 拆除，P 暂停，R 重试。</p>
            )}
          </>
        }
        help={
          <p style={{ margin: 0, color: theme.text.secondary, textAlign: 'center' }}>
            点选露盘、喷管、藤栏、爆果或寒叶，再点格子布置。露盘产生露水，喷管射击本路，藤栏阻挡，爆果溅射，寒叶减速。准备阶段先布置，倒计时结束虫群分路出发。飞蛾不啃藤栏。P 暂停 · R 重试 · Esc 退出全屏。切到后台会自动暂停。
          </p>
        }
      >
        <canvas
          ref={canvas}
          width={CW}
          height={CH}
          tabIndex={0}
          aria-label="庭院防线游戏区：点选单位后点格子布置，P 暂停，R 重试"
          style={
            immersive
              ? { width: fit.width, height: fit.height, maxWidth: 'none', display: 'block', borderRadius: 12, touchAction: 'none', outlineColor: theme.border.focus }
              : { width: '100%', maxWidth: CW, height: 'auto', display: 'block', borderRadius: 12, touchAction: 'none', outlineColor: theme.border.focus }
          }
        />
      </ImmersiveFrame>
    </Page>
  );
}
