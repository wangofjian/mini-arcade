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
  BLD_SPEC,
  EMPTY_MP_INPUT,
  MP_LEVELS,
  MP_LEVEL_COUNT,
  MP_OUR_NAME,
  MP_RES_NAME,
  MP_SAVE_KEY,
  MP_THEIR_NAME,
  MP_VIEW_H,
  MP_VIEW_W,
  UNIT_SPEC,
  bldOf,
  createMpMatch,
  enemyAt,
  hallOf,
  matchScoreValue,
  militaryOf,
  mpMapById,
  pushCmd,
  tickMp,
  tryBuildAuto,
  tryTrain,
  unitOf,
  unitsOf,
  worldFromView,
  type MpBldKind,
  type MpInput,
  type MpMatch,
  type MpUnitKind,
} from '../rules/slopeCamp';

const CW = MP_VIEW_W;
const CH = MP_VIEW_H;

function starLine(stars: number): string {
  return '★'.repeat(stars) + '☆'.repeat(Math.max(0, 3 - stars));
}

export default function SlopeCamp() {
  const theme = useGrokTheme();
  const canvas = useRef<HTMLCanvasElement | null>(null);
  const stageRef = useRef<HTMLDivElement | null>(null);
  const { active: immersive } = useImmersivePlay();
  const fit = useStageFit(stageRef, CW, CH, immersive, true);
  const match = useRef<MpMatch | null>(null);
  const paused = useRef(false);
  const last = useRef(0);
  const screen = useRef<'select' | 'play'>('select');
  const saved = useRef(false);
  const input = useRef<MpInput>({ ...EMPTY_MP_INPUT });
  const saveRef = useRef<LevelSave>(loadLevelSave(MP_SAVE_KEY, MP_LEVEL_COUNT));
  const box = useRef<{ x0: number; y0: number; x1: number; y1: number } | null>(null);
  const placeKind = useRef<MpBldKind | null>(null);
  const attackMode = useRef(false);
  const [hud, setHud] = useState({
    screen: 'select' as 'select' | 'play',
    phase: '',
    message: '',
    time: 0,
    res: 0,
    leftover: 0,
    stars: 0,
    losses: 0,
    lossCap: 0,
    starTime: 0,
    level: 1,
    levelName: '',
    mapName: '',
    hint: '',
    paused: false,
    selected: 0,
    place: '' as string,
    save: saveRef.current,
  });

  const clearInput = () => { input.current = { ...EMPTY_MP_INPUT }; };
  const holdCam = (key: keyof MpInput, v: boolean) => { input.current[key] = v; };
  const sync = () => {
    const m = match.current;
    setHud({
      screen: screen.current,
      phase: m?.phase ?? '',
      message: m?.message ?? '',
      time: m?.time ?? 0,
      res: m?.res.player ?? 0,
      leftover: m?.leftover ?? 0,
      stars: m?.stars ?? 0,
      losses: m?.losses.player ?? 0,
      lossCap: m?.level.lossCap ?? 0,
      starTime: m?.level.starTime ?? 0,
      level: m?.level.id ?? 1,
      levelName: m?.level.name ?? '',
      mapName: m?.map.name ?? '',
      hint: m?.level.hint ?? '',
      paused: paused.current,
      selected: m?.selected.length ?? 0,
      place: placeKind.current ? BLD_SPEC[placeKind.current].name : (attackMode.current ? '进攻前进' : ''),
      save: saveRef.current,
    });
  };
  const openLevel = (id: number) => {
    if (id > saveRef.current.unlocked) return;
    match.current = createMpMatch(id);
    screen.current = 'play';
    paused.current = false;
    saved.current = false;
    placeKind.current = null;
    attackMode.current = false;
    box.current = null;
    clearInput();
    last.current = 0;
    sync();
    canvas.current?.focus();
  };
  const retry = () => { if (match.current) openLevel(match.current.level.id); };
  const nextLevel = () => {
    const m = match.current;
    if (!m) return;
    const n = Math.min(MP_LEVEL_COUNT, m.level.id + 1);
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
  const persist = (m: MpMatch) => {
    if (saved.current || m.stars < 1) return;
    if (m.stars >= 2) {
      saveRef.current = applyLevelClear(saveRef.current, m.level.id - 1, m.stars, matchScoreValue(m), MP_LEVEL_COUNT);
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
    writeLevelSave(MP_SAVE_KEY, saveRef.current);
    saved.current = true;
  };
  const train = (kind: MpUnitKind) => {
    const m = match.current;
    if (!m || paused.current) return;
    tryTrain(m, 'player', kind);
    sync();
  };
  const buildAuto = (kind: MpBldKind) => {
    const m = match.current;
    if (!m || paused.current) return;
    if (tryBuildAuto(m, 'player', kind)) { placeKind.current = null; sync(); return; }
    placeKind.current = kind;
    attackMode.current = false;
    sync();
  };
  const selectArmy = () => {
    const m = match.current;
    if (!m) return;
    pushCmd(m, { t: 'selectAllArmy' });
    sync();
  };
  const orderPush = () => {
    const m = match.current;
    if (!m) return;
    const eh = hallOf(m, 'enemy');
    if (!eh) return;
    if (!militaryOf(m, 'player').length) return;
    pushCmd(m, { t: 'selectAllArmy' });
    pushCmd(m, { t: 'attackMove', x: eh.x, y: eh.y });
    m.message = '全军进攻敌营';
    sync();
  };

  useEffect(() => {
    const c = canvas.current;
    if (!c) return;
    const ctx = c.getContext('2d');
    if (!ctx) return;
    let raf = 0;

    const logical = (e: PointerEvent) => {
      const rect = c.getBoundingClientRect();
      return {
        x: ((e.clientX - rect.left) * CW) / rect.width,
        y: ((e.clientY - rect.top) * CH) / rect.height,
      };
    };
    const world = (e: PointerEvent) => {
      const p = logical(e);
      const m = match.current;
      if (!m) return p;
      return worldFromView(m, p.x, p.y);
    };

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'ArrowLeft' || e.code === 'KeyA') {
        if (e.code === 'KeyA' && !e.repeat && screen.current === 'play') {
          if (e.shiftKey || attackMode.current) { /* fall through cam if held for camera? */ }
          // A without ctrl: attack-move mode; arrows always pan
        }
      }
      if (e.code === 'ArrowLeft') { e.preventDefault(); holdCam('camLeft', true); }
      if (e.code === 'ArrowRight') { e.preventDefault(); holdCam('camRight', true); }
      if (e.code === 'ArrowUp' || e.code === 'KeyW') { e.preventDefault(); holdCam('camUp', true); }
      if (e.code === 'ArrowDown' || e.code === 'KeyS') { e.preventDefault(); holdCam('camDown', true); }
      if (e.code === 'KeyD') { e.preventDefault(); holdCam('camRight', true); }
      if (e.code === 'KeyA' && e.repeat) { e.preventDefault(); holdCam('camLeft', true); }
      if (e.code === 'KeyA' && !e.repeat) {
        e.preventDefault();
        // short tap A = attack-move mode; holding also pans via repeat
        attackMode.current = true;
        placeKind.current = null;
        holdCam('camLeft', true);
        sync();
      }
      if (e.code === 'Digit1' || e.code === 'KeyQ') { e.preventDefault(); if (!e.repeat && e.code === 'Digit1') train('worker'); if (e.code === 'KeyQ' && !e.repeat) selectArmy(); }
      if (e.code === 'Digit2') { e.preventDefault(); if (!e.repeat) train('blade'); }
      if (e.code === 'Digit3') { e.preventDefault(); if (!e.repeat) train('bow'); }
      if (e.code === 'Digit4') { e.preventDefault(); if (!e.repeat) train('raider'); }
      if (e.code === 'KeyF') { e.preventDefault(); if (!e.repeat) buildAuto('yard'); }
      if (e.code === 'KeyG') { e.preventDefault(); if (!e.repeat) buildAuto('tower'); }
      if (e.code === 'KeyH') { e.preventDefault(); if (!e.repeat) buildAuto('depot'); }
      if (e.code === 'KeyE') {
        e.preventDefault();
        const m = match.current;
        if (m && !e.repeat) { pushCmd(m, { t: 'selectIdleWorkers' }); sync(); }
      }
      if (e.code === 'Space') {
        e.preventDefault();
        const m = match.current;
        if (m) {
          const h = hallOf(m, 'player');
          if (h) { m.camX = Math.max(0, h.x - CW / 2); m.camY = Math.max(0, h.y - CH / 2); }
        }
      }
      if (e.code === 'Escape') { placeKind.current = null; attackMode.current = false; sync(); }
      if (e.code === 'KeyP') { e.preventDefault(); togglePause(); }
      if (e.code === 'KeyR' && !e.repeat) { e.preventDefault(); retry(); }
    };
    const onKeyUp = (e: KeyboardEvent) => {
      if (e.code === 'ArrowLeft' || e.code === 'KeyA') holdCam('camLeft', false);
      if (e.code === 'ArrowRight' || e.code === 'KeyD') holdCam('camRight', false);
      if (e.code === 'ArrowUp' || e.code === 'KeyW') holdCam('camUp', false);
      if (e.code === 'ArrowDown' || e.code === 'KeyS') holdCam('camDown', false);
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
        if (col >= 0 && col < 4 && row >= 0 && id >= 1 && id <= MP_LEVEL_COUNT && p.x <= x0 + 214 && p.y <= y0 + 96) openLevel(id);
        return;
      }
      const m = match.current;
      if (!m || paused.current) return;
      e.preventDefault();
      c.focus();
      const w = world(e);
      if (e.button === 2) {
        const en = enemyAt(m, w.x, w.y);
        if (en != null) pushCmd(m, { t: 'attack', id: en });
        else pushCmd(m, { t: 'move', x: w.x, y: w.y });
        attackMode.current = false;
        return;
      }
      if (placeKind.current) {
        pushCmd(m, { t: 'build', kind: placeKind.current, x: w.x, y: w.y });
        placeKind.current = null;
        sync();
        return;
      }
      if (attackMode.current) {
        const en = enemyAt(m, w.x, w.y);
        if (en != null) pushCmd(m, { t: 'attack', id: en });
        else pushCmd(m, { t: 'attackMove', x: w.x, y: w.y });
        attackMode.current = false;
        sync();
        return;
      }
      box.current = { x0: w.x, y0: w.y, x1: w.x, y1: w.y };
      try { c.setPointerCapture(e.pointerId); } catch { /* ignore */ }
    };
    const onPointerMove = (e: PointerEvent) => {
      if (!box.current || !match.current) return;
      const w = world(e);
      box.current.x1 = w.x;
      box.current.y1 = w.y;
    };
    const onPointerUp = (e: PointerEvent) => {
      const m = match.current;
      if (!m || !box.current) return;
      const w = world(e);
      box.current.x1 = w.x;
      box.current.y1 = w.y;
      const b = box.current;
      box.current = null;
      const dx = Math.abs(b.x1 - b.x0), dy = Math.abs(b.y1 - b.y0);
      if (dx > 16 || dy > 16) {
        pushCmd(m, { t: 'selectBox', x0: b.x0, y0: b.y0, x1: b.x1, y1: b.y1, additive: e.shiftKey });
      } else {
        const en = enemyAt(m, w.x, w.y);
        const hasArmy = m.selected.some((id) => unitOf(m, id));
        if (en != null && hasArmy) pushCmd(m, { t: 'attack', id: en });
        else if (hasArmy && !e.shiftKey) {
          // tap empty: if nothing to select, move; selectAt first
          pushCmd(m, { t: 'selectAt', x: w.x, y: w.y, additive: false });
          // if selection became empty or unchanged own unit, move
          // apply happens in step — issue both: selectAt if own, else move
          // We peek now before step: pick happens only after step. Issue move if no obvious own target — use a heuristic:
        }
        // Always try select first; if we tapped empty ground with a selection, also move.
        const before = m.selected.slice();
        pushCmd(m, { t: 'selectAt', x: w.x, y: w.y, additive: e.shiftKey });
        // If tapping empty and we already have units selected, move them (touch-friendly).
        // We queue selectAt then decide after a sync step — do move if enemy not hit and not placing.
        if (en == null && before.some((id) => unitOf(m, id)) && !e.shiftKey) {
          // If the click is on own unit/bld, selectAt will change selection; if on empty, move.
          const own = m.units.find((u) => u.hp > 0 && u.side === 'player' && Math.hypot(u.x - w.x, u.y - w.y) < 22)
            || m.buildings.find((b2) => b2.hp > 0 && b2.side === 'player' && Math.hypot(b2.x - w.x, b2.y - w.y) < 40);
          if (!own) {
            // drop the selectAt-empty that would clear: replace with move, restore selection
            m.cmds = m.cmds.filter((cmd) => cmd.t !== 'selectAt');
            m.selected = before;
            pushCmd(m, { t: 'move', x: w.x, y: w.y });
          }
        }
      }
    };
    const onContext = (e: Event) => e.preventDefault();

    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);
    window.addEventListener('blur', blur);
    document.addEventListener('visibilitychange', hide);
    c.addEventListener('pointerdown', onPointerDown);
    c.addEventListener('pointermove', onPointerMove);
    c.addEventListener('pointerup', onPointerUp);
    c.addEventListener('pointercancel', () => { box.current = null; clearInput(); });
    c.addEventListener('contextmenu', onContext);

    const drawSelect = () => {
      const g = ctx.createLinearGradient(0, 0, 0, CH);
      g.addColorStop(0, '#1e3428');
      g.addColorStop(1, '#2c4634');
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, CW, CH);
      ctx.fillStyle = '#eef6ee';
      ctx.font = 'bold 32px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('坡地争营', CW / 2, 52);
      ctx.font = '15px sans-serif';
      ctx.fillStyle = '#c5dcc8';
      ctx.fillText(MP_OUR_NAME + ' 对阵 ' + MP_THEIR_NAME + ' · 收粮、建营、整队推掉对面大营。建议横屏。', CW / 2, 84);
      MP_LEVELS.forEach((lv, i) => {
        const col = i % 4, row = Math.floor(i / 4);
        const x = 40 + col * 230, y = 110 + row * 110;
        const locked = lv.id > saveRef.current.unlocked;
        const map = mpMapById(lv.mapId);
        ctx.fillStyle = locked ? '#15241c' : '#1d3328ee';
        ctx.beginPath();
        ctx.roundRect(x, y, 214, 96, 10);
        ctx.fill();
        ctx.strokeStyle = locked ? '#2a3c32' : '#7cb89488';
        ctx.lineWidth = 1;
        ctx.stroke();
        ctx.fillStyle = '#eef6ee';
        ctx.font = 'bold 16px sans-serif';
        ctx.textAlign = 'left';
        ctx.fillText((locked ? '锁定  ' : '') + lv.id + '  ' + lv.name, x + 14, y + 28);
        ctx.font = '12px sans-serif';
        ctx.fillStyle = '#b4ccb6';
        ctx.fillText(map.name + ' · ' + lv.time + 's · 损失≤' + lv.lossCap + ' 三星', x + 14, y + 50);
        const stars = saveRef.current.stars[i] ?? 0;
        ctx.fillStyle = '#e7c25a';
        ctx.font = '13px sans-serif';
        ctx.fillText(stars ? starLine(stars) : locked ? '先通过上一关' : '尚未出征', x + 14, y + 76);
      });
    };

    const drawBld = (x: number, y: number, kind: MpBldKind, side: 'player' | 'enemy', built: number, selected: boolean) => {
      const r = BLD_SPEC[kind].r;
      const col = side === 'player' ? '#2f8a68' : '#b0503c';
      const dark = side === 'player' ? '#1a4a38' : '#5a241c';
      ctx.save();
      ctx.globalAlpha = built < 1 ? 0.55 + built * 0.45 : 1;
      ctx.fillStyle = col;
      if (kind === 'hall') {
        ctx.beginPath();
        ctx.roundRect(x - r, y - r * 0.7, r * 2, r * 1.4, 8);
        ctx.fill();
        ctx.fillStyle = dark;
        ctx.beginPath();
        ctx.moveTo(x - r - 4, y - r * 0.7);
        ctx.lineTo(x, y - r - 6);
        ctx.lineTo(x + r + 4, y - r * 0.7);
        ctx.closePath();
        ctx.fill();
        ctx.fillStyle = side === 'player' ? '#d8f0c8' : '#f0d0c0';
        ctx.fillRect(x - 5, y - r - 18, 6, 16);
      } else if (kind === 'tower') {
        ctx.fillRect(x - r * 0.55, y - r, r * 1.1, r * 2);
        ctx.fillStyle = dark;
        ctx.fillRect(x - r * 0.7, y - r - 8, r * 1.4, 12);
      } else if (kind === 'yard') {
        ctx.beginPath();
        ctx.roundRect(x - r, y - r * 0.8, r * 2, r * 1.6, 6);
        ctx.fill();
        ctx.strokeStyle = dark;
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.moveTo(x - r + 8, y + 4);
        ctx.lineTo(x - r + 8, y - r + 6);
        ctx.moveTo(x + r - 8, y + 4);
        ctx.lineTo(x + r - 8, y - r + 6);
        ctx.stroke();
      } else {
        ctx.beginPath();
        ctx.roundRect(x - r, y - r * 0.75, r * 2, r * 1.5, 5);
        ctx.fill();
        ctx.fillStyle = '#e7c25a88';
        ctx.fillRect(x - r + 6, y - 6, r * 2 - 12, 12);
      }
      if (selected) {
        ctx.strokeStyle = '#f4fff8';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(x, y, r + 6, 0, Math.PI * 2);
        ctx.stroke();
      }
      ctx.restore();
    };

    const drawUnit = (x: number, y: number, kind: MpUnitKind, side: 'player' | 'enemy', facing: number, selected: boolean, gathering: boolean) => {
      const col = side === 'player' ? '#3dba86' : '#d4664e';
      const r = UNIT_SPEC[kind].r;
      ctx.save();
      ctx.translate(x, y);
      ctx.rotate(facing);
      ctx.fillStyle = col;
      if (kind === 'worker') {
        ctx.beginPath();
        ctx.arc(0, 0, r, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = gathering ? '#e7c25a' : '#2a3a30';
        ctx.fillRect(r - 4, -4, 8, 8);
      } else if (kind === 'bow') {
        ctx.beginPath();
        ctx.ellipse(0, 0, r + 2, r - 1, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = '#f4efe6';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(4, 0, 7, -1.1, 1.1);
        ctx.stroke();
      } else if (kind === 'raider') {
        ctx.beginPath();
        ctx.moveTo(r + 3, 0);
        ctx.lineTo(-r, r);
        ctx.lineTo(-r + 3, 0);
        ctx.lineTo(-r, -r);
        ctx.closePath();
        ctx.fill();
      } else {
        ctx.beginPath();
        ctx.roundRect(-r, -r + 1, r * 2, r * 2 - 2, 4);
        ctx.fill();
        ctx.fillStyle = '#dce8e0';
        ctx.fillRect(-2, -r + 2, 8, r * 2 - 4);
      }
      ctx.restore();
      if (selected) {
        ctx.strokeStyle = '#f4fff8cc';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(x, y, r + 5, 0, Math.PI * 2);
        ctx.stroke();
      }
    };

    const hpBar = (x: number, y: number, r: number, hp: number, max: number) => {
      if (hp >= max - 0.5) return;
      const w = Math.max(18, r * 1.6);
      ctx.fillStyle = '#1a1a18cc';
      ctx.fillRect(x - w / 2, y - r - 10, w, 5);
      ctx.fillStyle = hp / max > 0.45 ? '#6bcb7a' : '#e07050';
      ctx.fillRect(x - w / 2, y - r - 10, w * Math.max(0, hp / max), 5);
    };

    const drawMinimap = (m: MpMatch) => {
      const mw = 156, mh = 100, mx = CW - mw - 12, my = 12;
      ctx.fillStyle = '#102018cc';
      ctx.beginPath();
      ctx.roundRect(mx - 5, my - 5, mw + 10, mh + 10, 8);
      ctx.fill();
      const sc = Math.min(mw / m.map.w, mh / m.map.h);
      const ox = mx + (mw - m.map.w * sc) / 2;
      const oy = my + (mh - m.map.h * sc) / 2;
      ctx.fillStyle = '#3a5a40';
      ctx.fillRect(ox, oy, m.map.w * sc, m.map.h * sc);
      ctx.fillStyle = '#4a3a30';
      for (const b of m.map.blocks) ctx.fillRect(ox + b.x * sc, oy + b.y * sc, b.w * sc, b.h * sc);
      for (const b of m.buildings) {
        if (b.hp <= 0) continue;
        ctx.fillStyle = b.side === 'player' ? '#4eca90' : '#e07050';
        ctx.fillRect(ox + b.x * sc - 2, oy + b.y * sc - 2, 5, 5);
      }
      for (const u of m.units) {
        if (u.hp <= 0) continue;
        ctx.fillStyle = u.side === 'player' ? '#d8ffe0' : '#ffc0b0';
        ctx.fillRect(ox + u.x * sc - 1, oy + u.y * sc - 1, 2, 2);
      }
      ctx.strokeStyle = '#eef6eeaa';
      ctx.lineWidth = 1;
      ctx.strokeRect(ox + m.camX * sc, oy + m.camY * sc, CW * sc, CH * sc);
    };

    const drawPlay = (m: MpMatch) => {
      const ox = m.camX, oy = m.camY;
      const g = ctx.createLinearGradient(0, 0, 0, CH);
      g.addColorStop(0, m.map.id === 'chigang' ? '#2a3828' : m.map.id === 'tonglin' ? '#243828' : '#2e4632');
      g.addColorStop(1, '#3a5440');
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, CW, CH);
      ctx.fillStyle = '#4a6a48';
      ctx.fillRect(-ox, -oy, m.map.w, m.map.h);
      // faint grass grain
      ctx.fillStyle = '#3d5c3e33';
      for (let i = 0; i < 18; i++) {
        const gx = ((i * 137) % m.map.w) - ox, gy = ((i * 89) % m.map.h) - oy;
        ctx.beginPath();
        ctx.ellipse(gx, gy, 50, 24, 0.3, 0, Math.PI * 2);
        ctx.fill();
      }
      for (const b of m.map.blocks) {
        ctx.fillStyle = m.map.id === 'tonglin' ? '#2a4a32' : '#5a4a3c';
        ctx.fillRect(b.x - ox, b.y - oy, b.w, b.h);
        ctx.strokeStyle = '#2a241888';
        ctx.strokeRect(b.x - ox, b.y - oy, b.w, b.h);
      }
      for (const n of m.nodes) {
        if (n.amount < 1) continue;
        const k = n.amount / n.max;
        ctx.fillStyle = `rgba(200,160,50,${0.35 + k * 0.55})`;
        ctx.beginPath();
        ctx.ellipse(n.x - ox, n.y - oy, 16 + 6 * k, 11 + 4 * k, 0.2, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#f4e6b0';
        ctx.font = '10px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('粮', n.x - ox, n.y - oy + 3);
      }
      for (const b of m.buildings) {
        if (b.hp <= 0) continue;
        drawBld(b.x - ox, b.y - oy, b.kind, b.side, b.built, m.selected.includes(b.id));
        hpBar(b.x - ox, b.y - oy, BLD_SPEC[b.kind].r, b.hp, b.maxHp);
        if (b.built < 1) {
          ctx.fillStyle = '#eef6ee';
          ctx.font = '10px sans-serif';
          ctx.textAlign = 'center';
          ctx.fillText(Math.floor(b.built * 100) + '%', b.x - ox, b.y - oy + 4);
        } else if (b.queue.length) {
          ctx.fillStyle = '#eef6ee';
          ctx.font = '10px sans-serif';
          ctx.textAlign = 'center';
          ctx.fillText('训练 ' + b.queue.length, b.x - ox, b.y - oy + BLD_SPEC[b.kind].r + 12);
        }
        ctx.fillStyle = b.side === 'player' ? '#c8f0d8' : '#f0c8c0';
        ctx.font = '10px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(BLD_SPEC[b.kind].name, b.x - ox, b.y - oy - BLD_SPEC[b.kind].r - 14);
      }
      for (const u of m.units) {
        if (u.hp <= 0) continue;
        if (u.side === 'player') continue;
        drawUnit(u.x - ox, u.y - oy, u.kind, u.side, u.facing, false, u.order.t === 'gather' && u.order.phase === 'hack');
        hpBar(u.x - ox, u.y - oy, UNIT_SPEC[u.kind].r, u.hp, u.maxHp);
      }
      for (const u of m.units) {
        if (u.hp <= 0 || u.side !== 'player') continue;
        drawUnit(u.x - ox, u.y - oy, u.kind, u.side, u.facing, m.selected.includes(u.id), u.order.t === 'gather' && u.order.phase === 'hack');
        hpBar(u.x - ox, u.y - oy, UNIT_SPEC[u.kind].r, u.hp, u.maxHp);
      }
      if (box.current) {
        const b = box.current;
        const x = Math.min(b.x0, b.x1) - ox, y = Math.min(b.y0, b.y1) - oy;
        const w = Math.abs(b.x1 - b.x0), h = Math.abs(b.y1 - b.y0);
        ctx.strokeStyle = '#eef6eecc';
        ctx.fillStyle = '#eef6ee22';
        ctx.lineWidth = 1;
        ctx.fillRect(x, y, w, h);
        ctx.strokeRect(x, y, w, h);
      }
      drawMinimap(m);

      ctx.fillStyle = '#102018cc';
      ctx.beginPath();
      ctx.roundRect(12, 12, 310, 98, 10);
      ctx.fill();
      ctx.fillStyle = '#eef6ee';
      ctx.font = 'bold 16px sans-serif';
      ctx.textAlign = 'left';
      ctx.fillText(m.level.id + '  ' + m.level.name, 24, 36);
      ctx.font = '13px sans-serif';
      ctx.fillStyle = '#e7c25a';
      ctx.fillText(MP_RES_NAME + '  ' + m.res.player, 24, 58);
      const tShow = m.phase === 'countdown' ? m.level.time : m.time;
      ctx.fillStyle = tShow < 18 ? '#f0a05a' : '#c5dcc8';
      ctx.fillText('剩余 ' + tShow.toFixed(1) + 's    损失 ' + m.losses.player + '/' + m.level.lossCap, 24, 78);
      ctx.fillStyle = '#b4ccb6';
      ctx.font = '11px sans-serif';
      ctx.fillText('三星需剩 ≥' + m.level.starTime + 's 且损失不超过上限', 24, 96);

      const selB = m.selected.map((id) => bldOf(m, id)).find(Boolean);
      const nArmy = militaryOf(m, 'player').length;
      const nWork = unitsOf(m, 'player', 'worker').length;
      ctx.fillStyle = '#102018cc';
      ctx.beginPath();
      ctx.roundRect(12, CH - 48, 340, 36, 8);
      ctx.fill();
      ctx.fillStyle = '#eef6ee';
      ctx.font = '12px sans-serif';
      ctx.textAlign = 'left';
      const mode = placeKind.current ? '点击地图建造' + BLD_SPEC[placeKind.current].name : (attackMode.current ? '点击地面进攻前进' : (selB ? '已选 ' + BLD_SPEC[selB.kind].name : '民伕 ' + nWork + '  兵 ' + nArmy + '  已选 ' + m.selected.length));
      ctx.fillText(mode, 22, CH - 26);

      if (m.phase === 'countdown') {
        ctx.fillStyle = '#102018aa';
        ctx.fillRect(0, 0, CW, CH);
        ctx.fillStyle = '#eef6ee';
        ctx.font = 'bold 72px sans-serif';
        ctx.textAlign = 'center';
        const n = m.phaseT;
        ctx.fillText(n > 0.55 ? String(Math.ceil(n)) : '出征！', CW / 2, CH / 2 + 24);
      }
      if (paused.current && (m.phase === 'play' || m.phase === 'countdown')) {
        ctx.fillStyle = '#102018cc';
        ctx.fillRect(0, 0, CW, CH);
        ctx.fillStyle = '#eef6ee';
        ctx.font = 'bold 32px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('已暂停', CW / 2, 230);
        ctx.font = '16px sans-serif';
        ctx.fillText('切回后点「继续」或按 P', CW / 2, 270);
      }
      if (m.phase === 'won' || m.phase === 'lost') {
        ctx.fillStyle = '#102018d4';
        ctx.fillRect(0, 0, CW, CH);
        ctx.fillStyle = '#eef6ee';
        ctx.font = 'bold 32px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(m.phase === 'won' ? '大营已破' : '未能攻破敌营', CW / 2, 186);
        ctx.font = '20px sans-serif';
        ctx.fillStyle = '#e7c25a';
        ctx.fillText(starLine(m.stars), CW / 2, 230);
        ctx.fillStyle = '#c5dcc8';
        ctx.font = '16px sans-serif';
        ctx.fillText('剩余 ' + m.leftover.toFixed(1) + 's    损失 ' + m.losses.player + '（三星上限 ' + m.level.lossCap + '）', CW / 2, 268);
        ctx.font = '14px sans-serif';
        const tip = m.stars === 3
          ? '按时破营且损失较少，三星'
          : m.stars === 2
            ? '攻破敌营，再快一些或减少损失可拿三星'
            : m.stars === 1
              ? '对敌营造成了伤害，但未攻破，本关不算通关'
              : '本关未对敌营造成有效打击';
        ctx.fillText(tip, CW / 2, 300);
      }
    };

    const frame = (t: number) => {
      const dt = last.current ? Math.min(0.05, (t - last.current) / 1000) : 0;
      last.current = t;
      if (screen.current === 'select') drawSelect();
      else if (match.current) {
        if (!paused.current) tickMp(match.current, dt, input.current);
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
      c.removeEventListener('pointerdown', onPointerDown);
      c.removeEventListener('pointermove', onPointerMove);
      c.removeEventListener('pointerup', onPointerUp);
      c.removeEventListener('contextmenu', onContext);
      clearInput();
    };
  }, []);

  const playing = hud.screen === 'play';
  const ended = hud.phase === 'won' || hud.phase === 'lost';
  const canNext = ended && hud.stars >= 2 && hud.level < MP_LEVEL_COUNT && hud.level + 1 <= hud.save.unlocked;

  return (
    <Page title="坡地争营" width="wide" lang="zh-Hans" summary="俯视小地图即时战略。采集粮秣、建造营寨、选中部队进攻，推毁对面的大营。">
      <ImmersiveFrame
        layout="overlay"
        stageRef={stageRef}
        focusRef={canvas}
        intro={<p style={{ margin: 0, color: theme.text.secondary }}>手机可点「全屏游玩」，建议横屏。点选或框选己方，点地面移动、点敌人进攻。十字键平移镜头，右侧「全选」「进攻」下令，「民 / 刀 / 弓」训练。攻破敌营且剩余时间多、损失少为三星。</p>}
        hudStats={playing ? (<><span>{hud.levelName}</span><span>{hud.mapName}</span><span>{MP_RES_NAME} {hud.res}</span><span>{hud.time.toFixed(1)}s</span><span>{hud.paused ? '已暂停' : hud.phase === 'won' ? '胜利' : hud.phase === 'lost' ? '未破营' : hud.phase === 'countdown' ? '倒计时' : '作战中'}</span></>) : <span>选择关卡</span>}
        hudActions={playing ? (<><Button label={hud.paused ? '继续' : '暂停'} onClick={togglePause} disabled={ended} /><Button label="重试" onClick={retry} />{canNext ? <Button label="下一关" variant="primary" onClick={nextLevel} /> : null}<Button label="选关" onClick={backSelect} /></>) : null}
        hudMsg={playing ? <span>{hud.message}{hud.place ? ' · ' + hud.place : ''}{hud.hint && !ended ? ' · ' + hud.hint : ''}</span> : null}
        pad={
          <HandheldPad
            dirs={{
              left: { mode: 'hold', onDown: () => holdCam('camLeft', true), onUp: () => holdCam('camLeft', false), ariaLabel: '镜头左移' },
              right: { mode: 'hold', onDown: () => holdCam('camRight', true), onUp: () => holdCam('camRight', false), ariaLabel: '镜头右移' },
              up: { mode: 'hold', onDown: () => holdCam('camUp', true), onUp: () => holdCam('camUp', false), ariaLabel: '镜头上移' },
              down: { mode: 'hold', onDown: () => holdCam('camDown', true), onUp: () => holdCam('camDown', false), ariaLabel: '镜头下移' },
            }}
            actions={[
              { label: '全', ariaLabel: '全选部队', onPress: selectArmy },
              { label: '攻', ariaLabel: '全军进攻敌营', onPress: orderPush },
              { label: '民', ariaLabel: '训练民伕', onPress: () => train('worker') },
              { label: '刀', ariaLabel: '训练刀盾', onPress: () => train('blade') },
              { label: '弓', ariaLabel: '训练长弓', onPress: () => train('bow') },
            ]}
          />
        }
        padOverlayOnly
        side={
          <>
            <div className="imm-default-only arcade-lvls" style={{ marginBottom: 12 }}>
              {MP_LEVELS.map((lv) => {
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
                <Button label="训练民伕" onClick={() => train('worker')} disabled={ended} />
                <Button label="训练刀盾" onClick={() => train('blade')} disabled={ended} />
                <Button label="训练长弓" onClick={() => train('bow')} disabled={ended} />
                <Button label="训练突击" onClick={() => train('raider')} disabled={ended} />
                <Button label="建校场" onClick={() => buildAuto('yard')} disabled={ended} />
                <Button label="建箭楼" onClick={() => buildAuto('tower')} disabled={ended} />
                <Button label="建仓廪" onClick={() => buildAuto('depot')} disabled={ended} />
                <Button label="全军进攻" variant="primary" onClick={orderPush} disabled={ended} />
              </div>
            ) : <p style={{ color: theme.text.secondary, fontSize: 14 }}>WASD 或方向键平移镜头。左键选中或框选，右键移动或进攻。1–4 训练，F 校场、G 箭楼、H 仓廪，Q 全选部队。P 暂停，R 重试。建议横屏。</p>}
          </>
        }
        help={<p style={{ margin: 0, color: theme.text.secondary, textAlign: 'center' }}>建议横屏。这是一小张俯视地图上的即时战略：民伕采集{MP_RES_NAME}，送到大营；用粮建造校场、箭楼或仓廪，在校场训练刀盾、长弓和突击。左键点选或拖动框选己方，右键点地面移动、点敌人进攻（触控下点地面即移动、点敌人即进攻）。WASD / 方向键平移镜头，空格回到己方大营。数字 1 民伕、2 刀盾、3 长弓、4 突击；F / G / H 建造。Q 全选部队，E 选民伕，A 再点击为进攻前进。P 暂停 · R 重试 · Esc 退出全屏或取消建造。切到后台会自动暂停并松开按键。攻破对面大营且剩余时间不少于本关要求、己方损失不超过上限为三星；攻破即两星并通关解锁；只打掉过敌营血量但未推倒为一星，不算通关。</p>}
      >
        <canvas
          ref={canvas}
          width={CW}
          height={CH}
          tabIndex={0}
          aria-label="坡地争营游戏区：鼠标选中与下令，方向键平移镜头，P 暂停，R 重试"
          style={immersive ? { width: fit.width, height: fit.height, maxWidth: 'none', display: 'block', borderRadius: 12, touchAction: 'none', outlineColor: theme.border.focus } : { width: '100%', maxWidth: CW, height: 'auto', display: 'block', borderRadius: 12, touchAction: 'none', outlineColor: theme.border.focus }}
        />
      </ImmersiveFrame>
    </Page>
  );
}
