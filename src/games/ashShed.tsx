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
  AS_LEVELS,
  AS_LEVEL_COUNT,
  AS_OUR_NAME,
  AS_PLAYER_R,
  AS_SAVE_KEY,
  AS_THEIR_NAME,
  AS_VIEW_H,
  AS_VIEW_W,
  EMPTY_AS_INPUT,
  ENEMY_SPEC,
  WEAPON_SPEC,
  asMapById,
  createAsMatch,
  liveEnemies,
  matchScoreValue,
  switchWeapon,
  tickAs,
  tryReload,
  worldFromView,
  type AsInput,
  type AsMatch,
  type AsWeapon,
} from '../rules/ashShed';

const CW = AS_VIEW_W;
const CH = AS_VIEW_H;

function starLine(stars: number): string {
  return '★'.repeat(stars) + '☆'.repeat(Math.max(0, 3 - stars));
}

function goalText(m: AsMatch): string {
  if (m.level.goal === 'exit') return '撤离 · 击倒 ' + m.kills + '/' + m.level.quota;
  if (m.level.goal === 'quota') return '击倒 ' + m.kills + '/' + m.level.quota;
  const left = liveEnemies(m).length;
  return '清点 · 剩 ' + left + ' · 已击倒 ' + m.kills;
}

export default function AshShed() {
  const theme = useGrokTheme();
  const canvas = useRef<HTMLCanvasElement | null>(null);
  const stageRef = useRef<HTMLDivElement | null>(null);
  const { active: immersive } = useImmersivePlay();
  const fit = useStageFit(stageRef, CW, CH, immersive, true);
  const match = useRef<AsMatch | null>(null);
  const paused = useRef(false);
  const last = useRef(0);
  const screen = useRef<'select' | 'play'>('select');
  const saved = useRef(false);
  const input = useRef<AsInput>({ ...EMPTY_AS_INPUT });
  const saveRef = useRef<LevelSave>(loadLevelSave(AS_SAVE_KEY, AS_LEVEL_COUNT));
  const mouse = useRef({ x: 0, y: 0, down: false, on: false });
  const stick = useRef<{ id: number; ox: number; oy: number; x: number; y: number } | null>(null);
  const [hud, setHud] = useState({
    screen: 'select' as 'select' | 'play',
    phase: '',
    message: '',
    time: 0,
    hp: 100,
    leftover: 0,
    stars: 0,
    kills: 0,
    quota: 0,
    weapon: '短铳',
    mag: 0,
    reserve: 0,
    reload: 0,
    level: 1,
    levelName: '',
    mapName: '',
    hint: '',
    paused: false,
    goal: '',
    save: saveRef.current,
  });

  const clearInput = () => {
    input.current = { ...EMPTY_AS_INPUT };
    mouse.current.down = false;
    stick.current = null;
  };
  const holdMove = (key: 'up' | 'down' | 'left' | 'right', v: boolean) => { input.current[key] = v; };
  const holdShoot = (v: boolean) => { input.current.shoot = v; };
  const sync = () => {
    const m = match.current;
    const inv = m?.player.inv;
    const w = inv?.current ?? 'pistol';
    setHud({
      screen: screen.current,
      phase: m?.phase ?? '',
      message: m?.message ?? '',
      time: m?.time ?? 0,
      hp: m?.player.hp ?? 100,
      leftover: m?.leftover ?? 0,
      stars: m?.stars ?? 0,
      kills: m?.kills ?? 0,
      quota: m?.level.quota ?? 0,
      weapon: WEAPON_SPEC[w].name,
      mag: inv?.mag[w] ?? 0,
      reserve: inv?.reserve[w] ?? 0,
      reload: inv?.reloading ?? 0,
      level: m?.level.id ?? 1,
      levelName: m?.level.name ?? '',
      mapName: m?.map.name ?? '',
      hint: m?.level.hint ?? '',
      paused: paused.current,
      goal: m ? goalText(m) : '',
      save: saveRef.current,
    });
  };
  const openLevel = (id: number) => {
    if (id > saveRef.current.unlocked) return;
    match.current = createAsMatch(id);
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
    const n = Math.min(AS_LEVEL_COUNT, m.level.id + 1);
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
  const persist = (m: AsMatch) => {
    if (saved.current || m.stars < 1) return;
    if (m.stars >= 2) {
      saveRef.current = applyLevelClear(saveRef.current, m.level.id - 1, m.stars, matchScoreValue(m), AS_LEVEL_COUNT);
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
    writeLevelSave(AS_SAVE_KEY, saveRef.current);
    saved.current = true;
  };
  const pickWeapon = (w: AsWeapon) => {
    const m = match.current;
    if (!m || paused.current) return;
    switchWeapon(m, w);
    sync();
  };

  useEffect(() => {
    const c = canvas.current;
    if (!c) return;
    const ctx = c.getContext('2d');
    if (!ctx) return;
    let raf = 0;

    const logical = (e: PointerEvent | MouseEvent) => {
      const rect = c.getBoundingClientRect();
      return {
        x: ((e.clientX - rect.left) * CW) / rect.width,
        y: ((e.clientY - rect.top) * CH) / rect.height,
      };
    };

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'ArrowLeft' || e.code === 'KeyA') { e.preventDefault(); holdMove('left', true); }
      if (e.code === 'ArrowRight' || e.code === 'KeyD') { e.preventDefault(); holdMove('right', true); }
      if (e.code === 'ArrowUp' || e.code === 'KeyW') { e.preventDefault(); holdMove('up', true); }
      if (e.code === 'ArrowDown' || e.code === 'KeyS') { e.preventDefault(); holdMove('down', true); }
      if (e.code === 'Space' || e.code === 'KeyJ' || e.code === 'KeyK') { e.preventDefault(); holdShoot(true); }
      if (e.code === 'KeyE' || e.code === 'KeyF') { e.preventDefault(); const m = match.current; if (m && !e.repeat) tryReload(m); }
      if (e.code === 'Digit1') { e.preventDefault(); if (!e.repeat) pickWeapon('pistol'); }
      if (e.code === 'Digit2') { e.preventDefault(); if (!e.repeat) pickWeapon('shotgun'); }
      if (e.code === 'Digit3') { e.preventDefault(); if (!e.repeat) pickWeapon('bomb'); }
      if (e.code === 'KeyP') { e.preventDefault(); togglePause(); }
      if (e.code === 'KeyR' && !e.repeat) { e.preventDefault(); retry(); }
    };
    const onKeyUp = (e: KeyboardEvent) => {
      if (e.code === 'ArrowLeft' || e.code === 'KeyA') holdMove('left', false);
      if (e.code === 'ArrowRight' || e.code === 'KeyD') holdMove('right', false);
      if (e.code === 'ArrowUp' || e.code === 'KeyW') holdMove('up', false);
      if (e.code === 'ArrowDown' || e.code === 'KeyS') holdMove('down', false);
      if (e.code === 'Space' || e.code === 'KeyJ' || e.code === 'KeyK') holdShoot(false);
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

    const onPointerDown = (e: PointerEvent) => {
      if (screen.current === 'select') {
        e.preventDefault();
        c.focus();
        const p = logical(e);
        const col = Math.floor((p.x - 40) / 230);
        const row = Math.floor((p.y - 110) / 110);
        const x0 = 40 + col * 230, y0 = 110 + row * 110;
        const id = row * 4 + col + 1;
        if (col >= 0 && col < 4 && row >= 0 && id >= 1 && id <= AS_LEVEL_COUNT && p.x <= x0 + 214 && p.y <= y0 + 96) openLevel(id);
        return;
      }
      const m = match.current;
      if (!m || paused.current) return;
      e.preventDefault();
      c.focus();
      const p = logical(e);
      const isTouch = e.pointerType === 'touch' || e.pointerType === 'pen';
      if (isTouch && p.x > CW * 0.48) {
        stick.current = { id: e.pointerId, ox: p.x, oy: p.y, x: p.x, y: p.y };
        try { c.setPointerCapture(e.pointerId); } catch { /* ignore */ }
        return;
      }
      mouse.current.down = true;
      mouse.current.on = true;
      mouse.current.x = p.x;
      mouse.current.y = p.y;
      input.current.shoot = true;
    };
    const onPointerMove = (e: PointerEvent) => {
      const p = logical(e);
      if (stick.current && stick.current.id === e.pointerId) {
        stick.current.x = p.x;
        stick.current.y = p.y;
        return;
      }
      mouse.current.x = p.x;
      mouse.current.y = p.y;
      mouse.current.on = true;
    };
    const onPointerUp = (e: PointerEvent) => {
      if (stick.current && stick.current.id === e.pointerId) {
        stick.current = null;
        if (!mouse.current.down) input.current.shoot = false;
        return;
      }
      mouse.current.down = false;
      input.current.shoot = false;
    };

    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);
    window.addEventListener('blur', blur);
    document.addEventListener('visibilitychange', hide);
    c.addEventListener('pointerdown', onPointerDown);
    c.addEventListener('pointermove', onPointerMove);
    window.addEventListener('pointermove', onPointerMove);
    c.addEventListener('pointerup', onPointerUp);
    c.addEventListener('pointercancel', () => { stick.current = null; mouse.current.down = false; input.current.shoot = false; });
    c.addEventListener('contextmenu', (e) => e.preventDefault());

    const applyAim = (m: AsMatch) => {
      const st = stick.current;
      if (st) {
        const dx = st.x - st.ox, dy = st.y - st.oy;
        const len = Math.hypot(dx, dy);
        if (len > 8) {
          input.current.hasAim = true;
          const k = 220;
          input.current.aimX = m.player.x + (dx / len) * k;
          input.current.aimY = m.player.y + (dy / len) * k;
          if (len > 18) input.current.shoot = true;
        }
        return;
      }
      if (mouse.current.on) {
        const w = worldFromView(m, mouse.current.x, mouse.current.y);
        input.current.hasAim = true;
        input.current.aimX = w.x;
        input.current.aimY = w.y;
        if (mouse.current.down) input.current.shoot = true;
      }
    };

    const drawSelect = () => {
      const g = ctx.createLinearGradient(0, 0, 0, CH);
      g.addColorStop(0, '#1c1a22');
      g.addColorStop(1, '#2a262e');
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, CW, CH);
      ctx.fillStyle = '#efe8dc';
      ctx.font = 'bold 32px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('灰棚交火', CW / 2, 52);
      ctx.font = '15px sans-serif';
      ctx.fillStyle = '#c8bda8';
      ctx.fillText(AS_OUR_NAME + ' · 一摇杆移动，一摇杆瞄准射击。建议横屏。', CW / 2, 84);
      AS_LEVELS.forEach((lv, i) => {
        const col = i % 4, row = Math.floor(i / 4);
        const x = 40 + col * 230, y = 110 + row * 110;
        const locked = lv.id > saveRef.current.unlocked;
        const map = asMapById(lv.mapId);
        ctx.fillStyle = locked ? '#141218' : '#241f28ee';
        ctx.beginPath();
        ctx.roundRect(x, y, 214, 96, 10);
        ctx.fill();
        ctx.strokeStyle = locked ? '#33303a' : '#c4a06088';
        ctx.lineWidth = 1;
        ctx.stroke();
        ctx.fillStyle = '#efe8dc';
        ctx.font = 'bold 16px sans-serif';
        ctx.textAlign = 'left';
        ctx.fillText((locked ? '锁定  ' : '') + lv.id + '  ' + lv.name, x + 14, y + 28);
        ctx.font = '12px sans-serif';
        ctx.fillStyle = '#b8ad98';
        const gname = lv.goal === 'exit' ? '撤离' : lv.goal === 'quota' ? '定额' : '清点';
        ctx.fillText(map.name + ' · ' + lv.time + 's · ' + gname, x + 14, y + 50);
        const stars = saveRef.current.stars[i] ?? 0;
        ctx.fillStyle = '#e7c25a';
        ctx.font = '13px sans-serif';
        ctx.fillText(stars ? starLine(stars) : locked ? '先通过上一关' : '尚未出动', x + 14, y + 76);
      });
    };

    const drawPlay = (m: AsMatch) => {
      const ox = m.camX, oy = m.camY;
      const g = ctx.createLinearGradient(0, 0, 0, CH);
      g.addColorStop(0, '#2a2620');
      g.addColorStop(1, '#1c1a18');
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, CW, CH);
      ctx.fillStyle = '#3a362e';
      ctx.fillRect(-ox, -oy, m.map.w, m.map.h);
      // floor boards
      ctx.strokeStyle = '#2e2a2444';
      ctx.lineWidth = 1;
      for (let y = 0; y < m.map.h; y += 28) {
        ctx.beginPath();
        ctx.moveTo(-ox, y - oy);
        ctx.lineTo(m.map.w - ox, y - oy);
        ctx.stroke();
      }
      // exit
      if (m.map.exit) {
        const ex = m.map.exit;
        const ready = m.level.goal !== 'exit' || m.kills >= m.level.quota;
        ctx.fillStyle = ready ? '#3a6a5088' : '#3a3a3088';
        ctx.fillRect(ex.x - ox, ex.y - oy, ex.w, ex.h);
        ctx.strokeStyle = ready ? '#7ecb9a' : '#8a8070';
        ctx.lineWidth = 2;
        ctx.strokeRect(ex.x - ox, ex.y - oy, ex.w, ex.h);
        ctx.fillStyle = '#efe8dc';
        ctx.font = 'bold 12px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(ready ? '栈口' : '栈口（未够人数）', ex.x - ox + ex.w / 2, ex.y - oy + ex.h / 2 + 4);
      }
      // crates
      for (const b of m.map.blocks) {
        ctx.fillStyle = '#6a4e38';
        ctx.fillRect(b.x - ox, b.y - oy, b.w, b.h);
        ctx.strokeStyle = '#3a2a1c';
        ctx.lineWidth = 2;
        ctx.strokeRect(b.x - ox, b.y - oy, b.w, b.h);
        ctx.fillStyle = '#8a6a48';
        ctx.fillRect(b.x - ox + 4, b.y - oy + 4, b.w - 8, 6);
      }
      // pickups
      for (const u of m.pickups) {
        if (u.taken) continue;
        const col = u.kind === 'health' ? '#6bcb7a' : u.kind === 'bomb' ? '#e7c25a' : u.kind === 'shotgun' ? '#d4884a' : '#8ab4d8';
        ctx.fillStyle = col;
        ctx.beginPath();
        ctx.arc(u.x - ox, u.y - oy, 9, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#1a1814';
        ctx.font = 'bold 9px sans-serif';
        ctx.textAlign = 'center';
        const lab = u.kind === 'health' ? '生' : u.kind === 'bomb' ? '包' : u.kind === 'shotgun' ? '弹' : '药';
        ctx.fillText(lab, u.x - ox, u.y - oy + 3);
      }
      // bullets
      for (const b of m.bullets) {
        ctx.fillStyle = b.side === 'player' ? (b.bomb ? '#e7c25a' : '#f4efe0') : '#e07070';
        ctx.beginPath();
        ctx.arc(b.x - ox, b.y - oy, b.bomb ? 6 : 3, 0, Math.PI * 2);
        ctx.fill();
      }
      // enemies
      for (const e of m.enemies) {
        if (e.hp <= 0) continue;
        const s = ENEMY_SPEC[e.kind];
        ctx.save();
        ctx.translate(e.x - ox, e.y - oy);
        ctx.rotate(e.facing);
        ctx.fillStyle = e.kind === 'heavy' ? '#4a3a58' : e.kind === 'shooter' ? '#5a3a48' : '#3a3a46';
        ctx.beginPath();
        ctx.roundRect(-s.r, -s.r + 1, s.r * 2, s.r * 2 - 2, 4);
        ctx.fill();
        ctx.fillStyle = '#c8b0c0';
        ctx.fillRect(2, -4, 8, 8);
        ctx.restore();
        if (e.hp < e.maxHp) {
          const w = 22;
          ctx.fillStyle = '#1a1a18cc';
          ctx.fillRect(e.x - ox - w / 2, e.y - oy - s.r - 9, w, 4);
          ctx.fillStyle = '#e07070';
          ctx.fillRect(e.x - ox - w / 2, e.y - oy - s.r - 9, w * (e.hp / e.maxHp), 4);
        }
      }
      // player
      const p = m.player;
      ctx.save();
      ctx.translate(p.x - ox, p.y - oy);
      ctx.rotate(p.facing);
      if (p.iframe > 0) ctx.globalAlpha = 0.55 + Math.sin(p.iframe * 30) * 0.25;
      ctx.fillStyle = '#2f9a78';
      ctx.beginPath();
      ctx.roundRect(-AS_PLAYER_R, -AS_PLAYER_R + 1, AS_PLAYER_R * 2, AS_PLAYER_R * 2 - 2, 5);
      ctx.fill();
      ctx.fillStyle = '#d8f0c8';
      ctx.fillRect(4, -5, 12, 10);
      ctx.fillStyle = '#1a3028';
      ctx.fillRect(12, -2, 10, 4);
      ctx.restore();
      // aim line
      ctx.strokeStyle = '#efe8dc44';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(p.x - ox, p.y - oy);
      ctx.lineTo(p.x - ox + Math.cos(p.facing) * 48, p.y - oy + Math.sin(p.facing) * 48);
      ctx.stroke();

      // minimap
      const mw = 150, mh = 96, mx = CW - mw - 12, my = 12;
      ctx.fillStyle = '#141218cc';
      ctx.beginPath();
      ctx.roundRect(mx - 5, my - 5, mw + 10, mh + 10, 8);
      ctx.fill();
      const sc = Math.min(mw / m.map.w, mh / m.map.h);
      const mmx = mx + (mw - m.map.w * sc) / 2;
      const mmy = my + (mh - m.map.h * sc) / 2;
      ctx.fillStyle = '#2a2820';
      ctx.fillRect(mmx, mmy, m.map.w * sc, m.map.h * sc);
      ctx.fillStyle = '#6a4e38';
      for (const b of m.map.blocks) ctx.fillRect(mmx + b.x * sc, mmy + b.y * sc, b.w * sc, b.h * sc);
      if (m.map.exit) {
        ctx.fillStyle = '#7ecb9a';
        ctx.fillRect(mmx + m.map.exit.x * sc, mmy + m.map.exit.y * sc, m.map.exit.w * sc, m.map.exit.h * sc);
      }
      for (const e of m.enemies) {
        if (e.hp <= 0) continue;
        ctx.fillStyle = '#e07070';
        ctx.fillRect(mmx + e.x * sc - 1.5, mmy + e.y * sc - 1.5, 3, 3);
      }
      ctx.fillStyle = '#5ecb9a';
      ctx.beginPath();
      ctx.arc(mmx + p.x * sc, mmy + p.y * sc, 3, 0, Math.PI * 2);
      ctx.fill();

      // HUD
      ctx.fillStyle = '#141218cc';
      ctx.beginPath();
      ctx.roundRect(12, 12, 320, 100, 10);
      ctx.fill();
      ctx.fillStyle = '#efe8dc';
      ctx.font = 'bold 16px sans-serif';
      ctx.textAlign = 'left';
      ctx.fillText(m.level.id + '  ' + m.level.name, 24, 36);
      ctx.font = '13px sans-serif';
      ctx.fillStyle = '#c8bda8';
      ctx.fillText(goalText(m), 24, 56);
      const tShow = m.phase === 'countdown' ? m.level.time : m.time;
      ctx.fillStyle = tShow < 16 ? '#f0a05a' : '#c8bda8';
      ctx.fillText('剩余 ' + tShow.toFixed(1) + 's    三星需剩 ≥' + m.level.starTime + 's、生命 ≥' + m.level.hpNeed, 24, 76);
      // hp
      ctx.fillStyle = '#3a3330';
      ctx.fillRect(24, 86, 160, 12);
      ctx.fillStyle = p.hp / p.maxHp > 0.4 ? '#6bcb7a' : '#e07050';
      ctx.fillRect(24, 86, 160 * Math.max(0, p.hp / p.maxHp), 12);
      ctx.fillStyle = '#efe8dc';
      ctx.font = '10px sans-serif';
      ctx.fillText(Math.ceil(p.hp) + '', 190, 96);

      // weapon
      const inv = p.inv;
      const wpn = inv.current;
      ctx.fillStyle = '#141218cc';
      ctx.beginPath();
      ctx.roundRect(12, CH - 52, 250, 40, 8);
      ctx.fill();
      ctx.fillStyle = '#e7c25a';
      ctx.font = 'bold 14px sans-serif';
      ctx.textAlign = 'left';
      ctx.fillText(WEAPON_SPEC[wpn].name, 22, CH - 28);
      ctx.fillStyle = '#efe8dc';
      ctx.font = '12px sans-serif';
      ctx.fillText(inv.reloading > 0 ? '换弹 ' + inv.reloading.toFixed(1) + 's' : inv.mag[wpn] + ' / ' + inv.reserve[wpn], 92, CH - 28);
      const owned = (['pistol', 'shotgun', 'bomb'] as AsWeapon[]).filter((k) => inv.owned[k]).map((k) => (k === wpn ? '[' : '') + WEAPON_SPEC[k].name + (k === wpn ? ']' : ''));
      ctx.fillStyle = '#b8ad98';
      ctx.font = '10px sans-serif';
      ctx.fillText(owned.join('  '), 22, CH - 14);

      // right aim stick
      if (stick.current) {
        const st = stick.current;
        ctx.fillStyle = '#efe8dc22';
        ctx.beginPath();
        ctx.arc(st.ox, st.oy, 46, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = '#efe8dc66';
        ctx.stroke();
        const dx = st.x - st.ox, dy = st.y - st.oy;
        const len = Math.min(36, Math.hypot(dx, dy));
        const ang = Math.atan2(dy, dx);
        ctx.fillStyle = '#efe8dccc';
        ctx.beginPath();
        ctx.arc(st.ox + Math.cos(ang) * len, st.oy + Math.sin(ang) * len, 16, 0, Math.PI * 2);
        ctx.fill();
      } else if (immersive) {
        ctx.fillStyle = '#efe8dc18';
        ctx.beginPath();
        ctx.arc(CW - 90, CH - 110, 42, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#efe8dc44';
        ctx.font = '11px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('瞄准', CW - 90, CH - 106);
      }

      if (m.phase === 'countdown') {
        ctx.fillStyle = '#141218aa';
        ctx.fillRect(0, 0, CW, CH);
        ctx.fillStyle = '#efe8dc';
        ctx.font = 'bold 72px sans-serif';
        ctx.textAlign = 'center';
        const n = m.phaseT;
        ctx.fillText(n > 0.55 ? String(Math.ceil(n)) : '出动！', CW / 2, CH / 2 + 24);
      }
      if (paused.current && (m.phase === 'play' || m.phase === 'countdown')) {
        ctx.fillStyle = '#141218cc';
        ctx.fillRect(0, 0, CW, CH);
        ctx.fillStyle = '#efe8dc';
        ctx.font = 'bold 32px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('已暂停', CW / 2, 230);
        ctx.font = '16px sans-serif';
        ctx.fillText('切回后点「继续」或按 P', CW / 2, 270);
      }
      if (m.phase === 'won' || m.phase === 'lost') {
        ctx.fillStyle = '#141218d4';
        ctx.fillRect(0, 0, CW, CH);
        ctx.fillStyle = '#efe8dc';
        ctx.font = 'bold 32px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(m.phase === 'won' ? (m.level.goal === 'exit' ? '已抵达栈口' : '清场完成') : '任务失败', CW / 2, 186);
        ctx.font = '20px sans-serif';
        ctx.fillStyle = '#e7c25a';
        ctx.fillText(starLine(m.stars), CW / 2, 230);
        ctx.fillStyle = '#c8bda8';
        ctx.font = '16px sans-serif';
        ctx.fillText('击倒 ' + m.kills + '    生命 ' + Math.ceil(m.player.hp) + '    剩余 ' + m.leftover.toFixed(1) + 's', CW / 2, 268);
        ctx.font = '14px sans-serif';
        const tip = m.stars === 3
          ? '按时完成且生命充裕，三星'
          : m.stars === 2
            ? '完成目标，再快一些或少受伤可拿三星'
            : m.stars === 1
              ? '有击倒记录，但未完成目标，本关不算通关'
              : '本关未完成目标';
        ctx.fillText(tip, CW / 2, 300);
      }
    };

    const frame = (t: number) => {
      const dt = last.current ? Math.min(0.05, (t - last.current) / 1000) : 0;
      last.current = t;
      if (screen.current === 'select') drawSelect();
      else if (match.current) {
        applyAim(match.current);
        if (!paused.current) tickAs(match.current, dt, input.current);
        input.current.weapon = null;
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
      window.removeEventListener('pointermove', onPointerMove);
      c.removeEventListener('pointerdown', onPointerDown);
      c.removeEventListener('pointermove', onPointerMove);
      c.removeEventListener('pointerup', onPointerUp);
      clearInput();
    };
  }, []);

  const playing = hud.screen === 'play';
  const ended = hud.phase === 'won' || hud.phase === 'lost';
  const canNext = ended && hud.stars >= 2 && hud.level < AS_LEVEL_COUNT && hud.level + 1 <= hud.save.unlocked;

  return (
    <Page title="灰棚交火" width="wide" lang="zh-Hans" summary="俯视双摇杆枪战。一边移动一边瞄准射击，利用货垛作掩护，清点或撤离栈口。">
      <ImmersiveFrame
        layout="overlay"
        stageRef={stageRef}
        focusRef={canvas}
        intro={<p style={{ margin: 0, color: theme.text.secondary }}>手机可点「全屏游玩」，建议横屏。左侧十字移动，右侧拖动瞄准并射击，按钮换枪。完成目标且剩余时间、生命多为三星。</p>}
        hudStats={playing ? (<><span>{hud.levelName}</span><span>{hud.mapName}</span><span>{hud.weapon} {hud.mag}/{hud.reserve}</span><span>生命 {Math.ceil(hud.hp)}</span><span>{hud.time.toFixed(1)}s</span><span>{hud.paused ? '已暂停' : hud.phase === 'won' ? '完成' : hud.phase === 'lost' ? '失败' : hud.phase === 'countdown' ? '倒计时' : hud.goal}</span></>) : <span>选择关卡</span>}
        hudActions={playing ? (<><Button label={hud.paused ? '继续' : '暂停'} onClick={togglePause} disabled={ended} /><Button label="重试" onClick={retry} />{canNext ? <Button label="下一关" variant="primary" onClick={nextLevel} /> : null}<Button label="选关" onClick={backSelect} /></>) : null}
        hudMsg={playing ? <span>{hud.message}{hud.hint && !ended ? ' · ' + hud.hint : ''}</span> : null}
        pad={
          <HandheldPad
            dirs={{
              left: { mode: 'hold', onDown: () => holdMove('left', true), onUp: () => holdMove('left', false), ariaLabel: '左移' },
              right: { mode: 'hold', onDown: () => holdMove('right', true), onUp: () => holdMove('right', false), ariaLabel: '右移' },
              up: { mode: 'hold', onDown: () => holdMove('up', true), onUp: () => holdMove('up', false), ariaLabel: '上移' },
              down: { mode: 'hold', onDown: () => holdMove('down', true), onUp: () => holdMove('down', false), ariaLabel: '下移' },
            }}
            actions={[
              { label: '射', ariaLabel: '射击', onDown: () => holdShoot(true), onUp: () => holdShoot(false) },
              { label: '铳', ariaLabel: '换短铳', onPress: () => pickWeapon('pistol') },
              { label: '弹', ariaLabel: '换散弹', onPress: () => pickWeapon('shotgun') },
              { label: '包', ariaLabel: '换震包', onPress: () => pickWeapon('bomb') },
            ]}
          />
        }
        padOverlayOnly
        side={
          <>
            <div className="imm-default-only arcade-lvls" style={{ marginBottom: 12 }}>
              {AS_LEVELS.map((lv) => {
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
                <Button label="短铳" onClick={() => pickWeapon('pistol')} disabled={ended} />
                <Button label="散弹" onClick={() => pickWeapon('shotgun')} disabled={ended} />
                <Button label="震包" onClick={() => pickWeapon('bomb')} disabled={ended} />
              </div>
            ) : <p style={{ color: theme.text.secondary, fontSize: 14 }}>WASD 移动，鼠标瞄准，左键或空格射击。1 短铳、2 散弹、3 震包，E 换弹。P 暂停，R 重试。建议横屏。</p>}
          </>
        }
        help={<p style={{ margin: 0, color: theme.text.secondary, textAlign: 'center' }}>建议横屏。这是俯视双摇杆枪战，不是第一人称，也不是轨道射击。WASD 或方向键移动，鼠标瞄准，左键或空格射击；手机左侧十字移动，在画面右半边拖动即瞄准并射击。三种武器：短铳（远程点射）、散弹（近距散射）、震包（投掷范围伤害），数字 1 / 2 / 3 切换，弹匣打空会自动换弹，也可按 E。货垛会挡住人和子弹，可作掩护。关卡目标是清点全部敌人，或先击倒足够人数再跑到栈口撤离。P 暂停 · R 重试 · Esc 退出全屏。切到后台会自动暂停并松开按键。达成目标且剩余时间、生命不少于本关要求为三星；达成目标为两星并通关解锁；只击倒过敌人但未完成目标为一星，不算通关。</p>}
      >
        <canvas
          ref={canvas}
          width={CW}
          height={CH}
          tabIndex={0}
          aria-label="灰棚交火游戏区：WASD 移动，鼠标瞄准射击，P 暂停，R 重试"
          style={immersive ? { width: fit.width, height: fit.height, maxWidth: 'none', display: 'block', borderRadius: 12, touchAction: 'none', outlineColor: theme.border.focus } : { width: '100%', maxWidth: CW, height: 'auto', display: 'block', borderRadius: 12, touchAction: 'none', outlineColor: theme.border.focus }}
        />
      </ImmersiveFrame>
    </Page>
  );
}
