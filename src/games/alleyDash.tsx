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
  AL_LEVELS,
  AL_LEVEL_COUNT,
  AL_SAVE_KEY,
  AL_VIEW_H,
  AL_VIEW_W,
  AL_CAR_R,
  AL_PICK_R,
  AL_OUR_NAME,
  EMPTY_AL_INPUT,
  FARE_SPEC,
  alMapById,
  createAlMatch,
  matchScoreValue,
  tickAl,
  type AlInput,
  type AlMatch,
} from '../rules/alleyDash';

const CW = AL_VIEW_W;
const CH = AL_VIEW_H;

const KIND_COLOR: Record<string, string> = {
  near: '#7ad0a0',
  far: '#7ab8e8',
  urgent: '#f0a05a',
};

function kindLabel(k: string): string {
  return FARE_SPEC[k as keyof typeof FARE_SPEC]?.label ?? k;
}

function starLine(stars: number): string {
  return '★'.repeat(stars) + '☆'.repeat(Math.max(0, 3 - stars));
}

export default function AlleyDash() {
  const theme = useGrokTheme();
  const canvas = useRef<HTMLCanvasElement | null>(null);
  const stageRef = useRef<HTMLDivElement | null>(null);
  const { active: immersive } = useImmersivePlay();
  const fit = useStageFit(stageRef, CW, CH, immersive, true);
  const match = useRef<AlMatch | null>(null);
  const paused = useRef(false);
  const last = useRef(0);
  const screen = useRef<'select' | 'play'>('select');
  const saved = useRef(false);
  const input = useRef<AlInput>({ ...EMPTY_AL_INPUT });
  const saveRef = useRef<LevelSave>(loadLevelSave(AL_SAVE_KEY, AL_LEVEL_COUNT));
  const [hud, setHud] = useState({
    screen: 'select' as 'select' | 'play',
    phase: '',
    message: '',
    time: 0,
    money: 0,
    target: 0,
    leftover: 0,
    delivered: 0,
    nitro: 0,
    stars: 0,
    score: 0,
    level: 1,
    levelName: '',
    mapName: '',
    paused: false,
    drifting: false,
    save: saveRef.current,
  });

  const clearInput = () => { input.current = { ...EMPTY_AL_INPUT }; };
  const hold = (key: keyof AlInput, v: boolean) => { input.current[key] = v; };
  const sync = () => {
    const m = match.current;
    setHud({
      screen: screen.current,
      phase: m?.phase ?? '',
      message: m?.message ?? '',
      time: m?.time ?? 0,
      money: m?.money ?? 0,
      target: m?.level.target ?? 0,
      leftover: m?.leftover ?? 0,
      delivered: m?.delivered ?? 0,
      nitro: m?.car.nitro ?? 0,
      stars: m?.stars ?? 0,
      score: m ? matchScoreValue(m) : 0,
      level: m?.level.id ?? 1,
      levelName: m?.level.name ?? '',
      mapName: m?.map.name ?? '',
      paused: paused.current,
      drifting: m?.car.drifting ?? false,
      save: saveRef.current,
    });
  };
  const openLevel = (id: number) => {
    if (id > saveRef.current.unlocked) return;
    match.current = createAlMatch(id);
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
    const n = Math.min(AL_LEVEL_COUNT, m.level.id + 1);
    if (n <= saveRef.current.unlocked) openLevel(n);
    else { screen.current = 'select'; match.current = null; sync(); }
  };
  const backSelect = () => {
    screen.current = 'select';
    match.current = null;
    clearInput();
    sync();
  };
  const togglePause = () => {
    const m = match.current;
    if (!m || screen.current !== 'play' || (m.phase !== 'play' && m.phase !== 'countdown')) return;
    paused.current = !paused.current;
    last.current = 0;
    clearInput();
    sync();
  };
  const persist = (m: AlMatch) => {
    if (saved.current || m.stars < 1) return;
    if (m.stars >= 2) {
      saveRef.current = applyLevelClear(saveRef.current, m.level.id - 1, m.stars, matchScoreValue(m), AL_LEVEL_COUNT);
    } else {
      const next: LevelSave = {
        unlocked: saveRef.current.unlocked,
        stars: saveRef.current.stars.slice(),
        scores: saveRef.current.scores.slice(),
      };
      const i = m.level.id - 1;
      next.stars[i] = Math.max(next.stars[i] ?? 0, m.stars);
      next.scores[i] = Math.max(next.scores[i] ?? 0, matchScoreValue(m));
      saveRef.current = next;
    }
    writeLevelSave(AL_SAVE_KEY, saveRef.current);
    saved.current = true;
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
    };
    const blur = () => {
      clearInput();
      const m = match.current;
      if (screen.current === 'play' && m && (m.phase === 'play' || m.phase === 'countdown')) {
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
      if (col >= 0 && col < 4 && row >= 0 && id >= 1 && id <= AL_LEVEL_COUNT && x <= x0 + 214 && y <= y0 + 96) openLevel(id);
    };
    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);
    window.addEventListener('blur', blur);
    document.addEventListener('visibilitychange', hide);
    c.addEventListener('pointerdown', onPointer);
    c.addEventListener('pointercancel', clearInput);

    const isRiver = (mapId: string, b: { x: number; y: number; w: number; h: number }) =>
      mapId === 'heyan' && b.h <= 55 && b.y >= 320 && b.y <= 350;

    const drawCar = (x: number, y: number, heading: number, color: string, body: string, drifting: boolean, lamp: boolean, label: string) => {
      ctx.save();
      ctx.translate(x, y);
      ctx.rotate(heading);
      if (drifting) {
        ctx.fillStyle = '#ffffff55';
        ctx.fillRect(-20, -8, 7, 4);
        ctx.fillRect(-20, 4, 7, 4);
      }
      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.roundRect(-16, -9, 32, 18, 5);
      ctx.fill();
      ctx.fillStyle = body;
      ctx.fillRect(1, -6, 11, 12);
      if (lamp) {
        ctx.fillStyle = '#f4d56a';
        ctx.beginPath();
        ctx.roundRect(-4, -5, 8, 10, 2);
        ctx.fill();
      }
      ctx.fillStyle = '#f4f0ea';
      ctx.beginPath();
      ctx.arc(12, -5, 2, 0, Math.PI * 2);
      ctx.arc(12, 5, 2, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
      if (label) {
        ctx.fillStyle = '#f4efe6';
        ctx.font = 'bold 11px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(label, x, y - 18);
      }
    };

    const drawSelect = () => {
      const g = ctx.createLinearGradient(0, 0, 0, CH);
      g.addColorStop(0, '#2a221c');
      g.addColorStop(1, '#3a2e24');
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, CW, CH);
      ctx.fillStyle = '#f4efe6';
      ctx.font = 'bold 32px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('街巷快送', CW / 2, 52);
      ctx.font = '15px sans-serif';
      ctx.fillStyle = '#d4c4a8';
      ctx.fillText(AL_OUR_NAME + ' · 接客、抄近路、越快小费越多。建议横屏。', CW / 2, 84);
      AL_LEVELS.forEach((lv, i) => {
        const col = i % 4, row = Math.floor(i / 4);
        const x = 40 + col * 230, y = 110 + row * 110;
        const locked = lv.id > saveRef.current.unlocked;
        const map = alMapById(lv.mapId);
        ctx.fillStyle = locked ? '#1c1612' : '#2c241cee';
        ctx.beginPath();
        ctx.roundRect(x, y, 214, 96, 10);
        ctx.fill();
        ctx.strokeStyle = locked ? '#3a3228' : '#c4a06088';
        ctx.lineWidth = 1;
        ctx.stroke();
        ctx.fillStyle = '#f4efe6';
        ctx.font = 'bold 16px sans-serif';
        ctx.textAlign = 'left';
        ctx.fillText((locked ? '锁定  ' : '') + lv.id + '  ' + lv.name, x + 14, y + 28);
        ctx.font = '12px sans-serif';
        ctx.fillStyle = '#c8b89a';
        ctx.fillText(map.name + ' · ' + lv.time + 's · 定额 ' + lv.target, x + 14, y + 50);
        const stars = saveRef.current.stars[i] ?? 0;
        ctx.fillStyle = '#e7c25a';
        ctx.font = '13px sans-serif';
        ctx.fillText(stars ? starLine(stars) : locked ? '先通过上一关' : '尚未出车', x + 14, y + 76);
      });
    };

    const drawMinimap = (m: AlMatch) => {
      const mw = 168, mh = 108, mx = CW - mw - 14, my = 14;
      ctx.fillStyle = '#16120ecc';
      ctx.beginPath();
      ctx.roundRect(mx - 6, my - 6, mw + 12, mh + 12, 8);
      ctx.fill();
      const sc = Math.min(mw / m.map.w, mh / m.map.h);
      const ox = mx + (mw - m.map.w * sc) / 2;
      const oy = my + (mh - m.map.h * sc) / 2;
      ctx.fillStyle = '#2a2e34';
      ctx.fillRect(ox, oy, m.map.w * sc, m.map.h * sc);
      for (const b of m.map.buildings) {
        ctx.fillStyle = isRiver(m.map.id, b) ? '#2a5870' : '#5a4a3c';
        ctx.fillRect(ox + b.x * sc, oy + b.y * sc, b.w * sc, b.h * sc);
      }
      for (const f of m.fares) {
        if (f.status === 'offer') {
          const s = m.map.stands[f.pick];
          if (!s) continue;
          ctx.fillStyle = KIND_COLOR[f.kind];
          ctx.beginPath();
          ctx.arc(ox + s.x * sc, oy + s.y * sc, 3, 0, Math.PI * 2);
          ctx.fill();
        } else if (f.status === 'carry') {
          const s = m.map.stands[f.drop];
          if (!s) continue;
          ctx.fillStyle = '#f4efe6';
          ctx.beginPath();
          ctx.arc(ox + s.x * sc, oy + s.y * sc, 3.5, 0, Math.PI * 2);
          ctx.fill();
        }
      }
      for (const t of m.traffic) {
        ctx.fillStyle = '#8a7a68';
        ctx.fillRect(ox + t.x * sc - 1.5, oy + t.y * sc - 1.5, 3, 3);
      }
      ctx.fillStyle = '#f0c040';
      ctx.beginPath();
      ctx.arc(ox + m.car.x * sc, oy + m.car.y * sc, 3.5, 0, Math.PI * 2);
      ctx.fill();
    };

    const drawArrow = (m: AlMatch, ox: number, oy: number, tx: number, ty: number, color: string) => {
      const dx = tx - m.car.x, dy = ty - m.car.y;
      const d = Math.hypot(dx, dy);
      if (d < 40) return;
      const ang = Math.atan2(dy, dx);
      const r = 86;
      const ax = m.car.x - ox + Math.cos(ang) * r;
      const ay = m.car.y - oy + Math.sin(ang) * r;
      ctx.save();
      ctx.translate(ax, ay);
      ctx.rotate(ang);
      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.moveTo(14, 0);
      ctx.lineTo(-8, 8);
      ctx.lineTo(-4, 0);
      ctx.lineTo(-8, -8);
      ctx.closePath();
      ctx.fill();
      ctx.restore();
    };

    const drawPlay = (m: AlMatch) => {
      const ox = m.camX;
      const oy = m.camY;
      const dusk = ctx.createLinearGradient(0, 0, 0, CH);
      dusk.addColorStop(0, m.map.id === 'dengshi' ? '#1a1628' : m.map.id === 'heyan' ? '#1c2830' : '#242018');
      dusk.addColorStop(1, m.map.id === 'dengshi' ? '#2a2238' : m.map.id === 'heyan' ? '#24343c' : '#32281e');
      ctx.fillStyle = dusk;
      ctx.fillRect(0, 0, CW, CH);

      // pavement
      ctx.fillStyle = '#3a3e46';
      ctx.fillRect(-ox, -oy, m.map.w, m.map.h);

      // faint road grid highlights
      ctx.strokeStyle = '#4a4e5688';
      ctx.lineWidth = 2;
      ctx.setLineDash([10, 14]);
      for (const r of m.map.routes) {
        if (r.pts.length < 2) continue;
        ctx.beginPath();
        ctx.moveTo(r.pts[0]!.x - ox, r.pts[0]!.y - oy);
        for (let i = 1; i < r.pts.length; i++) ctx.lineTo(r.pts[i]!.x - ox, r.pts[i]!.y - oy);
        ctx.stroke();
      }
      ctx.setLineDash([]);

      for (const b of m.map.buildings) {
        const rx = b.x - ox, ry = b.y - oy;
        if (rx + b.w < -4 || ry + b.h < -4 || rx > CW + 4 || ry > CH + 4) continue;
        if (isRiver(m.map.id, b)) {
          const water = ctx.createLinearGradient(0, ry, 0, ry + b.h);
          water.addColorStop(0, '#2a6a88');
          water.addColorStop(1, '#1a4860');
          ctx.fillStyle = water;
          ctx.fillRect(rx, ry, b.w, b.h);
          ctx.strokeStyle = '#8ec8d888';
          ctx.lineWidth = 1;
          ctx.beginPath();
          ctx.moveTo(rx, ry + b.h * 0.4);
          ctx.quadraticCurveTo(rx + b.w * 0.4, ry + b.h * 0.7, rx + b.w, ry + b.h * 0.35);
          ctx.stroke();
          continue;
        }
        const tone = 40 + ((b.x * 13 + b.y * 7) % 28);
        ctx.fillStyle = `rgb(${tone + 40},${tone + 18},${tone})`;
        ctx.fillRect(rx, ry, b.w, b.h);
        ctx.strokeStyle = '#1a1410aa';
        ctx.lineWidth = 1.5;
        ctx.strokeRect(rx, ry, b.w, b.h);
        // windows
        ctx.fillStyle = m.map.id === 'dengshi' ? '#f0d878cc' : '#e8c86899';
        const gx = 14, gy = 16;
        for (let wy = ry + 10; wy < ry + b.h - 10; wy += gy) {
          for (let wx = rx + 8; wx < rx + b.w - 8; wx += gx) {
            if (((wx + wy) | 0) % 3 === 0) continue;
            ctx.fillRect(wx, wy, 6, 8);
          }
        }
      }

      // stands & fare markers
      for (const s of m.map.stands) {
        const sx = s.x - ox, sy = s.y - oy;
        ctx.fillStyle = '#2a2620cc';
        ctx.beginPath();
        ctx.arc(sx, sy, 16, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#a89880';
        ctx.font = '10px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(s.name, sx, sy + 28);
      }
      for (const f of m.fares) {
        if (f.status === 'offer') {
          const s = m.map.stands[f.pick];
          if (!s) continue;
          const sx = s.x - ox, sy = s.y - oy;
          const pulse = 22 + Math.sin((performance.now() / 240) + f.id) * 4;
          ctx.strokeStyle = KIND_COLOR[f.kind];
          ctx.lineWidth = 3;
          ctx.beginPath();
          ctx.arc(sx, sy, pulse, 0, Math.PI * 2);
          ctx.stroke();
          ctx.fillStyle = KIND_COLOR[f.kind];
          ctx.font = 'bold 12px sans-serif';
          ctx.textAlign = 'center';
          ctx.fillText(kindLabel(f.kind) + '  ' + f.guest, sx, sy - 30);
        } else if (f.status === 'carry') {
          const s = m.map.stands[f.drop];
          if (!s) continue;
          const sx = s.x - ox, sy = s.y - oy;
          ctx.strokeStyle = '#f4efe6';
          ctx.lineWidth = 3;
          ctx.setLineDash([6, 5]);
          ctx.beginPath();
          ctx.arc(sx, sy, AL_PICK_R * 0.55, 0, Math.PI * 2);
          ctx.stroke();
          ctx.setLineDash([]);
          ctx.fillStyle = '#f4efe6';
          ctx.font = 'bold 12px sans-serif';
          ctx.textAlign = 'center';
          ctx.fillText('送到  ' + s.name, sx, sy - 30);
        }
      }

      for (const t of m.traffic) {
        const cols = ['#5a6a88', '#4a7a68', '#7a5a58', '#6a5a78'];
        drawCar(t.x - ox, t.y - oy, t.heading, cols[t.route % cols.length]!, '#1a2228cc', false, false, '');
      }
      const p = m.car;
      drawCar(p.x - ox, p.y - oy, p.heading, p.hitLock > 0 ? '#c06040' : '#e8b030', '#2a2010cc', p.drifting, true, p.drifting ? '腰移' : AL_OUR_NAME);

      // guide arrows
      if (m.carrying != null) {
        const f = m.fares[m.carrying];
        const s = f ? m.map.stands[f.drop] : null;
        if (s) drawArrow(m, ox, oy, s.x, s.y, '#f4efe6');
      } else {
        for (const f of m.fares) {
          if (f.status !== 'offer') continue;
          const s = m.map.stands[f.pick];
          if (s) drawArrow(m, ox, oy, s.x, s.y, KIND_COLOR[f.kind]);
        }
      }

      drawMinimap(m);

      // HUD left
      ctx.fillStyle = '#16120ecc';
      ctx.beginPath();
      ctx.roundRect(12, 12, 300, 96, 10);
      ctx.fill();
      ctx.fillStyle = '#f4efe6';
      ctx.font = 'bold 16px sans-serif';
      ctx.textAlign = 'left';
      ctx.fillText(m.level.id + '  ' + m.level.name, 24, 36);
      ctx.font = '13px sans-serif';
      ctx.fillText('收入 ' + m.money + ' / ' + m.level.target + '    送达 ' + m.delivered, 24, 58);
      const tShow = m.phase === 'countdown' ? m.level.time : m.time;
      ctx.fillStyle = tShow < 12 ? '#f0a05a' : '#d4c4a8';
      ctx.fillText('剩余 ' + tShow.toFixed(1) + 's    三星需剩 ≥' + m.level.starTime + 's', 24, 80);

      // nitro
      ctx.fillStyle = '#16120ecc';
      ctx.beginPath();
      ctx.roundRect(12, CH - 52, 210, 36, 8);
      ctx.fill();
      ctx.fillStyle = '#3a3330';
      ctx.fillRect(20, CH - 36, 120, 10);
      ctx.fillStyle = p.nitro > 0.15 ? '#5ec8e8' : '#7a8a86';
      ctx.fillRect(20, CH - 36, 120 * p.nitro, 10);
      ctx.fillStyle = '#f4efe6';
      ctx.font = '11px sans-serif';
      ctx.textAlign = 'left';
      ctx.fillText('加速', 20, CH - 40);
      ctx.fillText(p.drifting ? '腰移中' : p.boostT > 0 ? '漂后加速' : '', 150, CH - 28);

      // fare strip
      const offers = m.fares.filter((f) => f.status === 'offer' || f.status === 'carry');
      offers.forEach((f, i) => {
        const bx = 328 + i * 210, by = 12;
        ctx.fillStyle = '#16120ecc';
        ctx.beginPath();
        ctx.roundRect(bx, by, 200, 56, 8);
        ctx.fill();
        ctx.fillStyle = KIND_COLOR[f.kind];
        ctx.font = 'bold 13px sans-serif';
        ctx.textAlign = 'left';
        const dest = f.status === 'carry' ? (m.map.stands[f.drop]?.name ?? '') : (m.map.stands[f.pick]?.name ?? '');
        ctx.fillText((f.status === 'carry' ? '车上 ' : '等候 ') + kindLabel(f.kind) + ' ' + f.guest, bx + 10, by + 22);
        ctx.fillStyle = '#d4c4a8';
        ctx.font = '12px sans-serif';
        ctx.fillText((f.status === 'carry' ? '送往 ' : '在 ') + dest + (f.status === 'carry' ? '  ' + Math.ceil(f.remain) + 's' : ''), bx + 10, by + 42);
      });

      if (m.phase === 'countdown') {
        ctx.fillStyle = '#16120eaa';
        ctx.fillRect(0, 0, CW, CH);
        ctx.fillStyle = '#f4efe6';
        ctx.font = 'bold 72px sans-serif';
        ctx.textAlign = 'center';
        const n = m.phaseT;
        ctx.fillText(n > 0.55 ? String(Math.ceil(n)) : '出车！', CW / 2, CH / 2 + 24);
      }
      if (paused.current && (m.phase === 'play' || m.phase === 'countdown')) {
        ctx.fillStyle = '#16120ecc';
        ctx.fillRect(0, 0, CW, CH);
        ctx.fillStyle = '#f4efe6';
        ctx.font = 'bold 32px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('已暂停', CW / 2, 230);
        ctx.font = '16px sans-serif';
        ctx.fillText('切回后点「继续」或按 P', CW / 2, 270);
      }
      if (m.phase === 'won' || m.phase === 'lost') {
        ctx.fillStyle = '#16120ed4';
        ctx.fillRect(0, 0, CW, CH);
        ctx.fillStyle = '#f4efe6';
        ctx.font = 'bold 32px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(m.phase === 'won' ? '定额完成' : '未达定额', CW / 2, 190);
        ctx.font = '20px sans-serif';
        ctx.fillStyle = '#e7c25a';
        ctx.fillText(starLine(m.stars), CW / 2, 234);
        ctx.fillStyle = '#d4c4a8';
        ctx.font = '16px sans-serif';
        ctx.fillText('收入 ' + m.money + ' / ' + m.level.target + '    送达 ' + m.delivered + ' 单    剩余 ' + m.leftover.toFixed(1) + 's', CW / 2, 270);
        ctx.font = '14px sans-serif';
        const tip = m.stars === 3
          ? '达到定额且剩余时间充裕，三星'
          : m.stars === 2
            ? '达到定额，再快一些可拿三星'
            : m.stars === 1
              ? '送过客人，但未达到目标金额，本关不算通关'
              : '本关未送到目标金额';
        ctx.fillText(tip, CW / 2, 304);
      }
    };

    const frame = (t: number) => {
      const dt = last.current ? Math.min(0.05, (t - last.current) / 1000) : 0;
      last.current = t;
      if (screen.current === 'select') drawSelect();
      else if (match.current) {
        if (!paused.current) tickAl(match.current, dt, input.current);
        const mm = match.current;
        if ((mm.phase === 'won' || mm.phase === 'lost') && !saved.current) persist(mm);
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
  const canNext = ended && hud.stars >= 2 && hud.level < AL_LEVEL_COUNT && hud.level + 1 <= hud.save.unlocked;

  return (
    <Page title="街巷快送" width="wide" lang="zh-Hans" summary="俯视街区送客。接几种客人，抄近路、腰移和加速，时限内达到目标金额；送得越快小费越多。">
      <ImmersiveFrame
        layout="overlay"
        stageRef={stageRef}
        focusRef={canvas}
        intro={<p style={{ margin: 0, color: theme.text.secondary }}>手机可点「全屏游玩」，建议横屏。十字键转向与加速/制动，右侧按住「漂」腰移、松开有短加速，「氮」喷加速。按时达到目标金额且剩余时间多为三星。</p>}
        hudStats={playing ? (<><span>{hud.levelName}</span><span>{hud.mapName}</span><span>{hud.money}/{hud.target}</span><span>{hud.time.toFixed(1)}s</span><span>{hud.paused ? '已暂停' : hud.phase === 'won' ? '完成' : hud.phase === 'lost' ? '未达标' : hud.phase === 'countdown' ? '倒计时' : '送客中'}</span></>) : <span>选择关卡</span>}
        hudActions={playing ? (<><Button label={hud.paused ? '继续' : '暂停'} onClick={togglePause} disabled={ended} /><Button label="重试" onClick={retry} />{canNext ? <Button label="下一关" variant="primary" onClick={nextLevel} /> : null}<Button label="选关" onClick={backSelect} /></>) : null}
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
              { label: '氮', ariaLabel: '加速喷射', onDown: () => hold('nitro', true), onUp: () => hold('nitro', false) },
            ]}
          />
        }
        padOverlayOnly
        side={
          <>
            <div className="imm-default-only arcade-lvls" style={{ marginBottom: 12 }}>
              {AL_LEVELS.map((lv) => {
                const locked = lv.id > hud.save.unlocked;
                const stars = hud.save.stars[lv.id - 1] ?? 0;
                return <Button key={lv.id} label={lv.id + ' ' + lv.name + (stars ? ' ' + '★'.repeat(stars) : locked ? ' 锁定' : '')} disabled={locked} onClick={() => openLevel(lv.id)} />;
              })}
            </div>
            {playing ? (
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }}>
                <Button label={hud.paused ? '继续' : '暂停'} onClick={togglePause} disabled={ended} />
                <Button label="重新开始" onClick={retry} />
                {canNext ? <Button label="下一关" variant="primary" onClick={nextLevel} /> : null}
                <Button label="返回选关" onClick={backSelect} />
              </div>
            ) : <p style={{ color: theme.text.secondary, fontSize: 14 }}>W 加速，S 制动，A/D 转向，空格或 Shift 腰移，J 或 N 加速喷射。P 暂停，R 重试。建议横屏。</p>}
          </>
        }
        help={<p style={{ margin: 0, color: theme.text.secondary, textAlign: 'center' }}>建议横屏。方向键或 WASD：上加速、下制动、左右转向。空格 / Shift 按住腰移过弯，松开有短暂加速（有冷却）。J / N 加速喷射。靠近等候的客人会自动上车，送到目的地自动下车；送得越快小费越多。近程、远程、加急时限与报酬不同。撞上来往车辆会减速并罚时。达到目标金额且剩余时间不少于本关要求为三星，达到定额为两星，只送到过客人但未达定额为一星且不算通关。P 暂停 · R 重试 · Esc 退出全屏。切到后台会自动暂停并松开按键。</p>}
      >
        <canvas
          ref={canvas}
          width={CW}
          height={CH}
          tabIndex={0}
          aria-label="街巷快送游戏区：方向键转向加速，空格腰移，J 加速，P 暂停，R 重试"
          style={immersive ? { width: fit.width, height: fit.height, maxWidth: 'none', display: 'block', borderRadius: 12, touchAction: 'none', outlineColor: theme.border.focus } : { width: '100%', maxWidth: CW, height: 'auto', display: 'block', borderRadius: 12, touchAction: 'none', outlineColor: theme.border.focus }}
        />
      </ImmersiveFrame>
    </Page>
  );
}
