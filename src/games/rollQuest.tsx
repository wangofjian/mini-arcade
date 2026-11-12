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
import { HandheldPad } from '../mobile/HandheldPad';
import { applyLevelClear, loadLevelSave, writeLevelSave, type LevelSave } from '../rules/progressSave';
import {
  RQ_LEVELS,
  RQ_LEVEL_COUNT,
  RQ_RADIUS,
  RQ_SAVE_KEY,
  RQ_TILE,
  RQ_VIEW_H,
  RQ_VIEW_W,
  createRqMatch,
  tickRq,
  type RqInput,
  type RqMatch,
} from '../rules/rollQuest';

const CW = RQ_VIEW_W;
const CH = RQ_VIEW_H;

export default function RollQuest() {
  const theme = useGrokTheme();
  const canvas = useRef<HTMLCanvasElement | null>(null);
  const stageRef = useRef<HTMLDivElement | null>(null);
  const { active: immersive } = useImmersivePlay();
  const fit = useStageFit(stageRef, CW, CH, immersive, true);
  const match = useRef<RqMatch | null>(null);
  const paused = useRef(false);
  const last = useRef(0);
  const screen = useRef<'select' | 'play'>('select');
  const saved = useRef(false);
  const input = useRef<RqInput>({ left: false, right: false, jump: false });
  const saveRef = useRef<LevelSave>(loadLevelSave(RQ_SAVE_KEY, RQ_LEVEL_COUNT));
  const [hud, setHud] = useState({
    screen: 'select' as 'select' | 'play',
    phase: '',
    message: '',
    time: 0,
    deaths: 0,
    stars: 0,
    score: 0,
    level: 1,
    levelName: '',
    paused: false,
    save: saveRef.current,
  });

  const clearInput = () => { input.current = { left: false, right: false, jump: false }; };
  const sync = () => {
    const m = match.current;
    setHud({
      screen: screen.current,
      phase: m?.phase ?? '',
      message: m?.message ?? '',
      time: m?.time ?? 0,
      deaths: m?.deaths ?? 0,
      stars: m?.stars ?? 0,
      score: m?.score ?? 0,
      level: m?.level.id ?? 1,
      levelName: m?.level.name ?? '',
      paused: paused.current,
      save: saveRef.current,
    });
  };
  const openLevel = (id: number) => {
    if (id > saveRef.current.unlocked) return;
    match.current = createRqMatch(id);
    screen.current = 'play';
    paused.current = false;
    saved.current = false;
    clearInput();
    last.current = 0;
    sync();
    canvas.current?.focus();
  };
  const retry = () => { if (match.current) openLevel(match.current.level.id); };
  const nextLevel = () => {
    const m = match.current;
    if (!m) return;
    const n = Math.min(RQ_LEVEL_COUNT, m.level.id + 1);
    if (n <= saveRef.current.unlocked) openLevel(n);
    else { screen.current = 'select'; match.current = null; sync(); }
  };
  const togglePause = () => {
    const m = match.current;
    if (!m || screen.current !== 'play' || m.phase !== 'play') return;
    paused.current = !paused.current;
    last.current = 0;
    clearInput();
    sync();
  };
  const hold = (key: keyof RqInput, v: boolean) => { input.current[key] = v; };

  useEffect(() => {
    const c = canvas.current;
    if (!c) return;
    const ctx = c.getContext('2d');
    if (!ctx) return;
    let raf = 0;

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'ArrowLeft' || e.code === 'KeyA') { e.preventDefault(); hold('left', true); }
      if (e.code === 'ArrowRight' || e.code === 'KeyD') { e.preventDefault(); hold('right', true); }
      if (e.code === 'ArrowUp' || e.code === 'KeyW' || e.code === 'Space' || e.code === 'KeyK' || e.code === 'KeyJ') {
        e.preventDefault();
        if (!e.repeat) hold('jump', true);
      }
      if (e.code === 'KeyP') { e.preventDefault(); togglePause(); }
      if (e.code === 'KeyR' && !e.repeat) { e.preventDefault(); retry(); }
    };
    const onKeyUp = (e: KeyboardEvent) => {
      if (e.code === 'ArrowLeft' || e.code === 'KeyA') hold('left', false);
      if (e.code === 'ArrowRight' || e.code === 'KeyD') hold('right', false);
      if (e.code === 'ArrowUp' || e.code === 'KeyW' || e.code === 'Space' || e.code === 'KeyK' || e.code === 'KeyJ') hold('jump', false);
    };
    const blur = () => {
      clearInput();
      const m = match.current;
      if (screen.current === 'play' && m && m.phase === 'play') {
        paused.current = true;
        last.current = 0;
        sync();
      }
    };
    const hide = () => { if (document.hidden) blur(); };
    const onPointer = (e: PointerEvent) => {
      if (screen.current !== 'select') return;
      e.preventDefault();
      c.focus();
      const rect = c.getBoundingClientRect();
      const x = ((e.clientX - rect.left) * CW) / rect.width;
      const y = ((e.clientY - rect.top) * CH) / rect.height;
      const col = Math.floor((x - 30) / 190);
      const row = Math.floor((y - 110) / 80);
      const x0 = 30 + col * 190, y0 = 110 + row * 80;
      const id = row * 4 + col + 1;
      if (col >= 0 && col < 4 && row >= 0 && id >= 1 && id <= RQ_LEVEL_COUNT && x <= x0 + 178 && y <= y0 + 68) openLevel(id);
    };
    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);
    window.addEventListener('blur', blur);
    document.addEventListener('visibilitychange', hide);
    c.addEventListener('pointerdown', onPointer);
    c.addEventListener('pointercancel', clearInput);

    const tileColor = (ch: string, crumble: number) => {
      if (ch === '#') return '#3d5a46';
      if (ch === '=') return crumble > 0 ? `rgba(196,150,80,${0.4 + crumble})` : '#c49650';
      if (ch === 'D') return '#6a5a48';
      if (ch === '^') return '#c45c5c';
      if (ch === '*') return '#6cbf8e';
      if (ch === 'C') return '#e7c25a';
      if (ch === 'G') return '#7ad0a0';
      if (ch === 'S') return '#6bb7c9';
      return '';
    };

    const drawSelect = () => {
      const g = ctx.createLinearGradient(0, 0, 0, CH);
      g.addColorStop(0, '#87c4e0');
      g.addColorStop(1, '#dcecc8');
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, CW, CH);
      ctx.fillStyle = '#1d2f28';
      ctx.font = 'bold 32px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('滚球历险', CW / 2, 56);
      ctx.font = '15px sans-serif';
      ctx.fillStyle = '#2a4a3e';
      ctx.fillText('一颗小球，跳跃过关。按住跳得更高。', CW / 2, 84);
      RQ_LEVELS.forEach((lv, i) => {
        const col = i % 4, row = Math.floor(i / 4);
        const x = 30 + col * 190, y = 110 + row * 80;
        const locked = lv.id > saveRef.current.unlocked;
        ctx.fillStyle = locked ? '#9bb5a8' : '#1d2f28ee';
        ctx.beginPath(); ctx.roundRect(x, y, 178, 68, 10); ctx.fill();
        ctx.fillStyle = '#f4fff8';
        ctx.font = 'bold 15px sans-serif';
        ctx.textAlign = 'left';
        ctx.fillText((locked ? '锁定  ' : '') + lv.id + '  ' + lv.name, x + 12, y + 28);
        const stars = saveRef.current.stars[i] ?? 0;
        ctx.font = '13px sans-serif';
        ctx.fillStyle = '#e7c25a';
        ctx.fillText(stars ? '★'.repeat(stars) + '☆'.repeat(3 - stars) : locked ? '先通过上一关' : '尚未挑战', x + 12, y + 52);
      });
    };

    const drawPlay = (m: RqMatch) => {
      const camX = m.camX - CW / 2;
      const camY = m.camY - CH / 2;
      const g = ctx.createLinearGradient(0, 0, 0, CH);
      g.addColorStop(0, '#8ec8ea');
      g.addColorStop(1, '#d7ecbf');
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, CW, CH);
      const minC = Math.max(0, Math.floor(camX / RQ_TILE) - 1);
      const maxC = Math.min(m.cols - 1, Math.floor((camX + CW) / RQ_TILE) + 1);
      const minR = Math.max(0, Math.floor(camY / RQ_TILE) - 1);
      const maxR = Math.min(m.rows - 1, Math.floor((camY + CH) / RQ_TILE) + 1);
      for (let r = minR; r <= maxR; r++) {
        for (let c = minC; c <= maxC; c++) {
          const k = c + ',' + r;
          if (m.gone.has(k)) continue;
          let ch = m.tiles[r][c];
          if (ch === 'D' && m.switchesOn.size > 0) continue;
          if (ch === '.') continue;
          const col = tileColor(ch, m.crumbleT.get(k) ?? 0);
          if (!col) continue;
          const x = c * RQ_TILE - camX;
          const y = r * RQ_TILE - camY;
          ctx.fillStyle = col;
          if (ch === '^') {
            ctx.beginPath();
            ctx.moveTo(x, y + RQ_TILE);
            ctx.lineTo(x + RQ_TILE / 2, y + 4);
            ctx.lineTo(x + RQ_TILE, y + RQ_TILE);
            ctx.closePath();
            ctx.fill();
          } else if (ch === '*') {
            ctx.beginPath();
            ctx.arc(x + RQ_TILE / 2, y + RQ_TILE / 2, 12, 0, Math.PI * 2);
            ctx.fill();
          } else {
            ctx.fillRect(x, y, RQ_TILE, RQ_TILE);
            if (ch === 'C' || ch === 'G' || ch === 'S') {
              ctx.fillStyle = '#1d2f28';
              ctx.font = '11px sans-serif';
              ctx.textAlign = 'center';
              ctx.fillText(ch === 'C' ? '点' : ch === 'G' ? '终' : '开', x + RQ_TILE / 2, y + 20);
            }
          }
        }
      }
      for (const mv of m.movers) {
        ctx.fillStyle = '#4a7fa0';
        ctx.beginPath();
        ctx.roundRect(mv.x - camX, mv.y - camY, mv.w, mv.h, 6);
        ctx.fill();
      }
      const bx = m.x - camX;
      const by = m.y - camY;
      ctx.fillStyle = '#2aa07a';
      ctx.beginPath();
      ctx.arc(bx, by, RQ_RADIUS, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#d9fff0';
      ctx.beginPath();
      ctx.arc(bx - 3, by - 4, 4, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#1d2f28';
      ctx.font = 'bold 16px sans-serif';
      ctx.textAlign = 'left';
      ctx.fillText(m.level.id + '  ' + m.level.name, 16, 28);
      ctx.font = '14px sans-serif';
      ctx.fillText('用时 ' + m.time.toFixed(1) + 's   重生 ' + m.deaths, 16, 50);
      ctx.textAlign = 'right';
      ctx.fillText(m.message, CW - 16, 28);
      if (paused.current && m.phase === 'play') {
        ctx.fillStyle = '#1d2f28cc';
        ctx.fillRect(0, 0, CW, CH);
        ctx.fillStyle = '#f4fff8';
        ctx.font = 'bold 32px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('已暂停', CW / 2, 220);
        ctx.font = '16px sans-serif';
        ctx.fillText('切回后点「继续」或按 P', CW / 2, 260);
      }
      if (m.phase === 'won') {
        ctx.fillStyle = '#1d2f28d0';
        ctx.fillRect(0, 0, CW, CH);
        ctx.fillStyle = '#f4fff8';
        ctx.font = 'bold 32px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('到达终点', CW / 2, 200);
        ctx.font = '18px sans-serif';
        ctx.fillText('★'.repeat(m.stars) + '  用时 ' + m.time.toFixed(1) + 's  重生 ' + m.deaths, CW / 2, 244);
      }
    };

    const frame = (t: number) => {
      const dt = last.current ? Math.min(0.05, (t - last.current) / 1000) : 0;
      last.current = t;
      if (screen.current === 'select') drawSelect();
      else if (match.current) {
        if (!paused.current) tickRq(match.current, dt, input.current);
        const m = match.current;
        if (m.phase === 'won' && !saved.current) {
          saveRef.current = applyLevelClear(saveRef.current, m.level.id - 1, m.stars, m.score, RQ_LEVEL_COUNT);
          writeLevelSave(RQ_SAVE_KEY, saveRef.current);
          saved.current = true;
        }
        drawPlay(m);
      }
      raf = requestAnimationFrame(frame);
    };
    raf = requestAnimationFrame(frame);
    const hudTimer = setInterval(() => { if (screen.current === 'play' && match.current) sync(); }, 200);
    return () => {
      cancelAnimationFrame(raf);
      clearInterval(hudTimer);
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
      window.removeEventListener('blur', blur);
      document.removeEventListener('visibilitychange', hide);
      c.removeEventListener('pointerdown', onPointer);
      c.removeEventListener('pointercancel', clearInput);
      clearInput();
    };
  }, []);

  const playing = hud.screen === 'play';
  const ended = hud.phase === 'won' || hud.phase === 'lost';

  return (
    <Page title="滚球历险" width="wide" lang="zh-Hans" summary="一颗小球滚动跳跃闯关。尖刺、弹簧、碎砖、开关和检查点都在等你。">
      <ImmersiveFrame
        layout="overlay"
        stageRef={stageRef}
        focusRef={canvas}
        intro={<p style={{ margin: 0, color: theme.text.secondary }}>手机可点「全屏游玩」，用半透明十字键左右移动、上键或右侧键跳跃。按住跳得更高。键盘可用方向键或 WASD 与空格。</p>}
        hudStats={playing ? (<><span>{hud.levelName}</span><span>{hud.time.toFixed(1)}s</span><span>重生 {hud.deaths}</span><span>{hud.paused ? '已暂停' : hud.phase === 'won' ? '到达' : '进行中'}</span></>) : <span>选择关卡</span>}
        hudActions={playing ? (<><Button label={hud.paused ? '继续' : '暂停'} onClick={togglePause} disabled={ended} /><Button label="重试" onClick={retry} />{hud.phase === 'won' ? <Button label="下一关" variant="primary" onClick={nextLevel} /> : null}<Button label="选关" onClick={() => { screen.current = 'select'; match.current = null; clearInput(); sync(); }} /></>) : null}
        hudMsg={playing ? <span>{hud.message}</span> : null}
        pad={
          <HandheldPad
            dirs={{
              left: { mode: 'hold', onDown: () => hold('left', true), onUp: () => hold('left', false), ariaLabel: '向左' },
              right: { mode: 'hold', onDown: () => hold('right', true), onUp: () => hold('right', false), ariaLabel: '向右' },
              up: { mode: 'hold', onDown: () => hold('jump', true), onUp: () => hold('jump', false), ariaLabel: '跳跃' },
              down: { mode: 'hold', disabled: true, ariaLabel: '向下（无操作）' },
            }}
            actions={[{ label: '跳', ariaLabel: '跳跃', onDown: () => hold('jump', true), onUp: () => hold('jump', false) }]}
          />
        }
        padOverlayOnly
        side={
          <>
            <div className="imm-default-only arcade-lvls" style={{ marginBottom: 12 }}>
              {RQ_LEVELS.map((lv) => {
                const locked = lv.id > hud.save.unlocked;
                const stars = hud.save.stars[lv.id - 1] ?? 0;
                return <Button key={lv.id} label={lv.id + ' ' + lv.name + (stars ? ' ' + '★'.repeat(stars) : locked ? ' 锁定' : '')} disabled={locked} onClick={() => openLevel(lv.id)} />;
              })}
            </div>
            {playing ? (
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }}>
                <Button label={hud.paused ? '继续' : '暂停'} onClick={togglePause} disabled={ended} />
                <Button label="重新开始" onClick={retry} />
                {hud.phase === 'won' ? <Button label="下一关" variant="primary" onClick={nextLevel} /> : null}
                <Button label="返回选关" onClick={() => { screen.current = 'select'; match.current = null; clearInput(); sync(); }} />
              </div>
            ) : <p style={{ color: theme.text.secondary, fontSize: 14 }}>左右移动，按住跳跃。松手会提前下落。P 暂停，R 重试。</p>}
          </>
        }
        help={<p style={{ margin: 0, color: theme.text.secondary, textAlign: 'center' }}>全屏十字键左右移动，上键或右侧「跳」按住跳跃（可同时按）。A/D 或 ←/→ 移动，空格 / W / ↑ 跳跃。碰到尖刺或掉出场地会回到检查点。按住跳得更高。P 暂停 · R 重试 · Esc 退出全屏。切到后台会自动暂停，并松开按键。</p>}
      >
        <canvas ref={canvas} width={CW} height={CH} tabIndex={0} aria-label="滚球历险游戏区：方向键或虚拟按键移动跳跃，P 暂停，R 重试" style={immersive ? { width: fit.width, height: fit.height, maxWidth: 'none', display: 'block', borderRadius: 12, touchAction: 'none', outlineColor: theme.border.focus } : { width: '100%', maxWidth: CW, height: 'auto', display: 'block', borderRadius: 12, touchAction: 'none', outlineColor: theme.border.focus }} />
      </ImmersiveFrame>
    </Page>
  );
}
