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
  CS_LEVELS,
  CS_LEVEL_COUNT,
  CS_NITRO_MAX,
  CS_RADIUS,
  CS_SAVE_KEY,
  CS_VIEW_H,
  CS_VIEW_W,
  createCsMatch,
  playerKart,
  pointAtS,
  tickCs,
  type CsInput,
  type CsMatch,
} from '../rules/curveSprint';

const CW = CS_VIEW_W;
const CH = CS_VIEW_H;

const EMPTY: CsInput = { left: false, right: false, accel: false, brake: false, drift: false, nitro: false, item: false };

function placeText(n: number): string {
  if (n === 1) return '第一名';
  if (n === 2) return '第二名';
  if (n === 3) return '第三名';
  return '第' + n + '名';
}

export default function CurveSprint() {
  const theme = useGrokTheme();
  const canvas = useRef<HTMLCanvasElement | null>(null);
  const stageRef = useRef<HTMLDivElement | null>(null);
  const { active: immersive } = useImmersivePlay();
  const fit = useStageFit(stageRef, CW, CH, immersive, true);
  const match = useRef<CsMatch | null>(null);
  const paused = useRef(false);
  const last = useRef(0);
  const screen = useRef<'select' | 'play'>('select');
  const saved = useRef(false);
  const input = useRef<CsInput>({ ...EMPTY });
  const cam = useRef({ x: 500, y: 300 });
  const saveRef = useRef<LevelSave>(loadLevelSave(CS_SAVE_KEY, CS_LEVEL_COUNT));
  const [hud, setHud] = useState({
    screen: 'select' as 'select' | 'play',
    phase: '',
    message: '',
    time: 0,
    par: 0,
    place: 1,
    lap: 1,
    laps: 2,
    nitro: 0,
    item: '' as string,
    stars: 0,
    score: 0,
    level: 1,
    levelName: '',
    paused: false,
    save: saveRef.current,
  });

  const clearInput = () => { input.current = { ...EMPTY }; };
  const hold = (key: keyof CsInput, v: boolean) => { input.current[key] = v; };
  const sync = () => {
    const m = match.current;
    const p = m ? playerKart(m) : null;
    setHud({
      screen: screen.current,
      phase: m?.phase ?? '',
      message: m?.message ?? '',
      time: m?.time ?? 0,
      par: m?.level.parTime ?? 0,
      place: p?.place ?? 1,
      lap: p ? Math.min(p.lap + 1, m!.level.laps) : 1,
      laps: m?.level.laps ?? 2,
      nitro: p?.nitro ?? 0,
      item: p?.item === 'oil' ? '机油' : p?.item === 'shield' ? '护盾' : '',
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
    match.current = createCsMatch(id);
    const p = playerKart(match.current);
    cam.current = { x: p.x, y: p.y };
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
    const n = Math.min(CS_LEVEL_COUNT, m.level.id + 1);
    if (n <= saveRef.current.unlocked) openLevel(n);
    else { screen.current = 'select'; match.current = null; sync(); }
  };
  const togglePause = () => {
    const m = match.current;
    if (!m || screen.current !== 'play' || (m.phase !== 'race' && m.phase !== 'countdown')) return;
    paused.current = !paused.current;
    last.current = 0;
    clearInput();
    sync();
  };

  useEffect(() => {
    const c = canvas.current;
    if (!c) return;
    const ctx = c.getContext('2d');
    if (!ctx) return;
    let raf = 0;

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'ArrowLeft' || e.code === 'KeyA') { e.preventDefault(); hold('left', true); }
      if (e.code === 'ArrowRight' || e.code === 'KeyD') { e.preventDefault(); hold('right', true); }
      if (e.code === 'ArrowUp' || e.code === 'KeyW') { e.preventDefault(); hold('accel', true); }
      if (e.code === 'ArrowDown' || e.code === 'KeyS') { e.preventDefault(); hold('brake', true); }
      if (e.code === 'Space' || e.code === 'ShiftLeft' || e.code === 'ShiftRight') { e.preventDefault(); hold('drift', true); }
      if (e.code === 'KeyJ' || e.code === 'KeyN' || e.code === 'KeyK' || e.code === 'ControlLeft' || e.code === 'ControlRight') {
        e.preventDefault();
        hold('nitro', true);
      }
      if (e.code === 'KeyF' || e.code === 'KeyU' || e.code === 'KeyI') { e.preventDefault(); if (!e.repeat) hold('item', true); }
      if (e.code === 'KeyP') { e.preventDefault(); togglePause(); }
      if (e.code === 'KeyR' && !e.repeat) { e.preventDefault(); retry(); }
    };
    const onKeyUp = (e: KeyboardEvent) => {
      if (e.code === 'ArrowLeft' || e.code === 'KeyA') hold('left', false);
      if (e.code === 'ArrowRight' || e.code === 'KeyD') hold('right', false);
      if (e.code === 'ArrowUp' || e.code === 'KeyW') hold('accel', false);
      if (e.code === 'ArrowDown' || e.code === 'KeyS') hold('brake', false);
      if (e.code === 'Space' || e.code === 'ShiftLeft' || e.code === 'ShiftRight') hold('drift', false);
      if (e.code === 'KeyJ' || e.code === 'KeyN' || e.code === 'KeyK' || e.code === 'ControlLeft' || e.code === 'ControlRight') hold('nitro', false);
      if (e.code === 'KeyF' || e.code === 'KeyU' || e.code === 'KeyI') hold('item', false);
    };
    const blur = () => {
      clearInput();
      const m = match.current;
      if (screen.current === 'play' && m && (m.phase === 'race' || m.phase === 'countdown')) {
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
      const col = Math.floor((x - 40) / 230);
      const row = Math.floor((y - 110) / 110);
      const x0 = 40 + col * 230, y0 = 110 + row * 110;
      const id = row * 4 + col + 1;
      if (col >= 0 && col < 4 && row >= 0 && id >= 1 && id <= CS_LEVEL_COUNT && x <= x0 + 214 && y <= y0 + 96) openLevel(id);
    };
    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);
    window.addEventListener('blur', blur);
    document.addEventListener('visibilitychange', hide);
    c.addEventListener('pointerdown', onPointer);
    c.addEventListener('pointercancel', clearInput);

    const drawTrack = (m: CsMatch, ox: number, oy: number) => {
      const t = m.track;
      const path = () => {
        ctx.beginPath();
        ctx.moveTo(t.pts[0]!.x - ox, t.pts[0]!.y - oy);
        for (let i = 1; i < t.pts.length; i++) ctx.lineTo(t.pts[i]!.x - ox, t.pts[i]!.y - oy);
        ctx.closePath();
      };
      ctx.lineJoin = 'round';
      ctx.lineCap = 'round';
      ctx.strokeStyle = '#3a2c28';
      ctx.lineWidth = t.wallWidth * 2;
      path();
      ctx.stroke();
      ctx.strokeStyle = '#d8d0c4';
      ctx.lineWidth = t.wallWidth * 2 - 10;
      path();
      ctx.stroke();
      ctx.strokeStyle = '#3d4348';
      ctx.lineWidth = t.halfWidth * 2;
      path();
      ctx.stroke();
      ctx.strokeStyle = '#4a5158';
      ctx.lineWidth = t.halfWidth * 2 - 10;
      path();
      ctx.stroke();
      // curb dashes
      ctx.strokeStyle = '#e86a5c';
      ctx.setLineDash([12, 12]);
      ctx.lineWidth = 4;
      ctx.lineDashOffset = 0;
      path();
      ctx.stroke();
      ctx.strokeStyle = '#f4f0ea';
      ctx.lineDashOffset = 12;
      path();
      ctx.stroke();
      ctx.setLineDash([]);
      // center dash
      ctx.strokeStyle = '#d4c48a88';
      ctx.lineWidth = 2;
      ctx.setLineDash([16, 14]);
      path();
      ctx.stroke();
      ctx.setLineDash([]);
      // finish
      const f0 = pointAtS(t, 0);
      ctx.strokeStyle = '#f4f0ea';
      ctx.lineWidth = 5;
      ctx.beginPath();
      ctx.moveTo(f0.x + f0.nx * t.halfWidth - ox, f0.y + f0.ny * t.halfWidth - oy);
      ctx.lineTo(f0.x - f0.nx * t.halfWidth - ox, f0.y - f0.ny * t.halfWidth - oy);
      ctx.stroke();
      ctx.fillStyle = '#f4f0ea';
      ctx.font = 'bold 11px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('起 / 终', f0.x - ox, f0.y - oy - t.halfWidth - 8);
    };

    const drawKart = (x: number, y: number, heading: number, color: string, drift: boolean, shield: boolean, name: string, isPlayer: boolean) => {
      ctx.save();
      ctx.translate(x, y);
      ctx.rotate(heading);
      if (shield) {
        ctx.strokeStyle = '#8fd4ffcc';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.ellipse(0, 0, 20, 14, 0, 0, Math.PI * 2);
        ctx.stroke();
      }
      if (drift) {
        ctx.fillStyle = '#ffffff55';
        ctx.fillRect(-22, -8, 8, 4);
        ctx.fillRect(-22, 4, 8, 4);
      }
      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.roundRect(-16, -9, 32, 18, 5);
      ctx.fill();
      ctx.fillStyle = '#1a2228cc';
      ctx.fillRect(2, -6, 10, 12);
      ctx.fillStyle = '#f4f0ea';
      ctx.beginPath();
      ctx.arc(10, 0, 2.2, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
      ctx.fillStyle = isPlayer ? '#f4fff8' : '#f4f0ea';
      ctx.font = 'bold 11px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(name, x, y - 18);
    };

    const drawSelect = () => {
      const g = ctx.createLinearGradient(0, 0, 0, CH);
      g.addColorStop(0, '#1e3a2f');
      g.addColorStop(1, '#2f4a38');
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, CW, CH);
      ctx.fillStyle = '#f4fff8';
      ctx.font = 'bold 32px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('弯道冲刺', CW / 2, 52);
      ctx.font = '15px sans-serif';
      ctx.fillStyle = '#c9e6d4';
      ctx.fillText('俯视短道竞速。腰移过弯，氮气冲直线。建议横屏。', CW / 2, 84);
      CS_LEVELS.forEach((lv, i) => {
        const col = i % 4, row = Math.floor(i / 4);
        const x = 40 + col * 230, y = 110 + row * 110;
        const locked = lv.id > saveRef.current.unlocked;
        ctx.fillStyle = locked ? '#1a2c24' : '#1d3d30ee';
        ctx.beginPath();
        ctx.roundRect(x, y, 214, 96, 10);
        ctx.fill();
        ctx.fillStyle = '#f4fff8';
        ctx.font = 'bold 16px sans-serif';
        ctx.textAlign = 'left';
        ctx.fillText((locked ? '锁定  ' : '') + lv.id + '  ' + lv.name, x + 14, y + 30);
        ctx.font = '12px sans-serif';
        ctx.fillStyle = '#b7d4c2';
        ctx.fillText(lv.laps + ' 圈 · ' + lv.aiCount + ' 辆对手 · 目标 ' + lv.parTime.toFixed(0) + 's', x + 14, y + 52);
        const stars = saveRef.current.stars[i] ?? 0;
        ctx.fillStyle = '#e7c25a';
        ctx.font = '13px sans-serif';
        ctx.fillText(stars ? '★'.repeat(stars) + '☆'.repeat(3 - stars) : locked ? '先通过上一关' : '尚未挑战', x + 14, y + 76);
      });
    };

    const drawMinimap = (m: CsMatch, ox: number, oy: number) => {
      const t = m.track;
      let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
      for (const p of t.pts) {
        if (p.x < minX) minX = p.x; if (p.y < minY) minY = p.y;
        if (p.x > maxX) maxX = p.x; if (p.y > maxY) maxY = p.y;
      }
      const mw = 168, mh = 102, mx = CW - mw - 14, my = 14;
      ctx.fillStyle = '#0e1a14cc';
      ctx.beginPath();
      ctx.roundRect(mx - 6, my - 6, mw + 12, mh + 12, 8);
      ctx.fill();
      const sx = mw / Math.max(1, maxX - minX + 40);
      const sy = mh / Math.max(1, maxY - minY + 40);
      const sc = Math.min(sx, sy);
      const cx = mx + mw / 2 - ((minX + maxX) / 2) * sc;
      const cy = my + mh / 2 - ((minY + maxY) / 2) * sc;
      ctx.strokeStyle = '#8aa392';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(t.pts[0]!.x * sc + cx, t.pts[0]!.y * sc + cy);
      for (let i = 1; i < t.pts.length; i++) ctx.lineTo(t.pts[i]!.x * sc + cx, t.pts[i]!.y * sc + cy);
      ctx.closePath();
      ctx.stroke();
      for (const k of m.karts) {
        ctx.fillStyle = k.color;
        ctx.beginPath();
        ctx.arc(k.x * sc + cx, k.y * sc + cy, k.isPlayer ? 4 : 3, 0, Math.PI * 2);
        ctx.fill();
      }
      void ox; void oy;
    };

    const drawPlay = (m: CsMatch) => {
      const p = playerKart(m);
      const look = 70;
      const tx = p.x + Math.cos(p.heading) * look;
      const ty = p.y + Math.sin(p.heading) * look;
      cam.current.x += (tx - cam.current.x) * 0.12;
      cam.current.y += (ty - cam.current.y) * 0.12;
      const ox = cam.current.x - CW / 2;
      const oy = cam.current.y - CH / 2;
      const sky = ctx.createLinearGradient(0, 0, 0, CH);
      sky.addColorStop(0, '#6fae72');
      sky.addColorStop(1, '#4d8a58');
      ctx.fillStyle = sky;
      ctx.fillRect(0, 0, CW, CH);
      drawTrack(m, ox, oy);
      for (const pud of m.puddles) {
        ctx.fillStyle = '#2a241888';
        ctx.beginPath();
        ctx.ellipse(pud.x - ox, pud.y - oy, 18, 12, 0.4, 0, Math.PI * 2);
        ctx.fill();
      }
      for (const pk of m.pickups) {
        if (pk.ready > 0) continue;
        ctx.fillStyle = pk.kind === 'nitro' ? '#5ec8e8' : '#e7c25a';
        ctx.beginPath();
        ctx.arc(pk.x - ox, pk.y - oy, 8, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#1a2228';
        ctx.font = 'bold 9px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(pk.kind === 'nitro' ? 'N' : '?', pk.x - ox, pk.y - oy + 3);
      }
      // draw AI first, player on top
      for (const k of m.karts) {
        if (k.isPlayer) continue;
        drawKart(k.x - ox, k.y - oy, k.heading, k.color, k.drifting, k.shieldT > 0, k.name, false);
      }
      drawKart(p.x - ox, p.y - oy, p.heading, p.color, p.drifting, p.shieldT > 0, '你', true);
      drawMinimap(m, ox, oy);

      // HUD
      ctx.fillStyle = '#0e1a14cc';
      ctx.beginPath();
      ctx.roundRect(12, 12, 280, 86, 10);
      ctx.fill();
      ctx.fillStyle = '#f4fff8';
      ctx.font = 'bold 16px sans-serif';
      ctx.textAlign = 'left';
      ctx.fillText(m.level.id + '  ' + m.level.name, 24, 36);
      ctx.font = '13px sans-serif';
      ctx.fillText(placeText(p.place) + '   ' + Math.min(p.lap + 1, m.level.laps) + '/' + m.level.laps + ' 圈', 24, 58);
      const tShow = m.phase === 'countdown' ? 0 : m.time;
      ctx.fillText('用时 ' + tShow.toFixed(1) + 's   目标 ' + m.level.parTime.toFixed(0) + 's', 24, 78);

      // nitro
      ctx.fillStyle = '#0e1a14cc';
      ctx.beginPath();
      ctx.roundRect(12, CH - 52, 200, 36, 8);
      ctx.fill();
      ctx.fillStyle = '#3a5550';
      ctx.fillRect(20, CH - 36, 120, 10);
      ctx.fillStyle = p.nitro > 0.15 ? '#5ec8e8' : '#7a8a86';
      ctx.fillRect(20, CH - 36, 120 * (p.nitro / CS_NITRO_MAX), 10);
      ctx.fillStyle = '#f4fff8';
      ctx.font = '11px sans-serif';
      ctx.fillText('氮气', 20, CH - 40);
      ctx.fillText(p.item === 'oil' ? '机油 F' : p.item === 'shield' ? '护盾 F' : p.drifting ? '腰移中' : '', 150, CH - 28);

      if (m.phase === 'countdown') {
        ctx.fillStyle = '#0e1a14aa';
        ctx.fillRect(0, 0, CW, CH);
        ctx.fillStyle = '#f4fff8';
        ctx.font = 'bold 72px sans-serif';
        ctx.textAlign = 'center';
        const n = m.countdown;
        ctx.fillText(n > 0.55 ? String(Math.ceil(n)) : '出发！', CW / 2, CH / 2 + 24);
      }
      if (paused.current && (m.phase === 'race' || m.phase === 'countdown')) {
        ctx.fillStyle = '#0e1a14cc';
        ctx.fillRect(0, 0, CW, CH);
        ctx.fillStyle = '#f4fff8';
        ctx.font = 'bold 32px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('已暂停', CW / 2, 230);
        ctx.font = '16px sans-serif';
        ctx.fillText('切回后点「继续」或按 P', CW / 2, 270);
      }
      if (m.phase === 'won') {
        ctx.fillStyle = '#0e1a14d4';
        ctx.fillRect(0, 0, CW, CH);
        ctx.fillStyle = '#f4fff8';
        ctx.font = 'bold 32px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('冲线！' + placeText(p.place), CW / 2, 200);
        ctx.font = '20px sans-serif';
        ctx.fillStyle = '#e7c25a';
        ctx.fillText('★'.repeat(m.stars) + '☆'.repeat(Math.max(0, 3 - m.stars)), CW / 2, 244);
        ctx.fillStyle = '#c9e6d4';
        ctx.font = '16px sans-serif';
        ctx.fillText('用时 ' + p.finishTime.toFixed(1) + 's   目标 ' + m.level.parTime.toFixed(0) + 's', CW / 2, 278);
        ctx.font = '14px sans-serif';
        ctx.fillText(m.stars === 3 ? '第一并且进入目标时间' : m.stars === 2 ? '拿下第一，但超过了目标时间' : '完赛即可继续，再冲一次冲击更高名次', CW / 2, 310);
      }
    };

    const frame = (t: number) => {
      const dt = last.current ? Math.min(0.05, (t - last.current) / 1000) : 0;
      last.current = t;
      if (screen.current === 'select') drawSelect();
      else if (match.current) {
        if (!paused.current) tickCs(match.current, dt, input.current);
        const mm = match.current;
        if (mm.phase === 'won' && !saved.current) {
          const p = playerKart(mm);
          saveRef.current = applyLevelClear(saveRef.current, mm.level.id - 1, mm.stars, mm.score || Math.floor((4 - p.place) * 1000 + p.finishTime), CS_LEVEL_COUNT);
          writeLevelSave(CS_SAVE_KEY, saveRef.current);
          saved.current = true;
        }
        drawPlay(mm);
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
    <Page title="弯道冲刺" width="wide" lang="zh-Hans" summary="俯视短道赛车。过弯腰移，直线氮气，和几辆简单对手比完圈名次。">
      <ImmersiveFrame
        layout="overlay"
        stageRef={stageRef}
        focusRef={canvas}
        intro={<p style={{ margin: 0, color: theme.text.secondary }}>手机可点「全屏游玩」，建议横屏。十字键转向与加速/制动，右侧按住「漂」腰移、松开有短加速，「氮」喷氮气。第一且在目标时间内为三星。</p>}
        hudStats={playing ? (<><span>{hud.levelName}</span><span>{placeText(hud.place)}</span><span>{hud.lap}/{hud.laps} 圈</span><span>{hud.time.toFixed(1)}s / {hud.par}s</span><span>{hud.paused ? '已暂停' : hud.phase === 'won' ? '冲线' : hud.phase === 'countdown' ? '倒计时' : '比赛中'}</span></>) : <span>选择关卡</span>}
        hudActions={playing ? (<><Button label={hud.paused ? '继续' : '暂停'} onClick={togglePause} disabled={ended} /><Button label="重试" onClick={retry} />{hud.phase === 'won' ? <Button label="下一关" variant="primary" onClick={nextLevel} /> : null}<Button label="选关" onClick={() => { screen.current = 'select'; match.current = null; clearInput(); sync(); }} /></>) : null}
        hudMsg={playing ? <span>{hud.message}</span> : null}
        pad={
          <HandheldPad
            dirs={{
              left: { mode: 'hold', onDown: () => hold('left', true), onUp: () => hold('left', false), ariaLabel: '左转' },
              right: { mode: 'hold', onDown: () => hold('right', true), onUp: () => hold('right', false), ariaLabel: '右转' },
              up: { mode: 'hold', onDown: () => hold('accel', true), onUp: () => hold('accel', false), ariaLabel: '加速' },
              down: { mode: 'hold', onDown: () => hold('brake', true), onUp: () => hold('brake', false), ariaLabel: '制动' },
            }}
            actions={[
              { label: '漂', ariaLabel: '腰移', onDown: () => hold('drift', true), onUp: () => hold('drift', false) },
              { label: '氮', ariaLabel: '氮气', onDown: () => hold('nitro', true), onUp: () => hold('nitro', false) },
              { label: '道', ariaLabel: '使用道具', onDown: () => hold('item', true), onUp: () => hold('item', false) },
            ]}
          />
        }
        padOverlayOnly
        side={
          <>
            <div className="imm-default-only arcade-lvls" style={{ marginBottom: 12 }}>
              {CS_LEVELS.map((lv) => {
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
            ) : <p style={{ color: theme.text.secondary, fontSize: 14 }}>W 加速，S 制动，A/D 转向，空格或 Shift 腰移，J 或 N 氮气，F 使用道具。P 暂停，R 重试。建议横屏。</p>}
          </>
        }
        help={<p style={{ margin: 0, color: theme.text.secondary, textAlign: 'center' }}>建议横屏。方向键或 WASD：上加速、下制动、左右转向。空格 / Shift 按住腰移过弯，松开有短暂加速（有冷却，不能无限叠）。J / N 氮气，F 丢机油或开护盾。出界会减速，撞护栏会弹回赛道。第一且不超过目标时间为三星，第一但超时两星，完赛一星。P 暂停 · R 重试 · Esc 退出全屏。切到后台会自动暂停并松开按键。</p>}
      >
        <canvas
          ref={canvas}
          width={CW}
          height={CH}
          tabIndex={0}
          aria-label="弯道冲刺游戏区：方向键转向加速，空格腰移，J 氮气，P 暂停，R 重试"
          style={immersive ? { width: fit.width, height: fit.height, maxWidth: 'none', display: 'block', borderRadius: 12, touchAction: 'none', outlineColor: theme.border.focus } : { width: '100%', maxWidth: CW, height: 'auto', display: 'block', borderRadius: 12, touchAction: 'none', outlineColor: theme.border.focus }}
        />
      </ImmersiveFrame>
    </Page>
  );
}
