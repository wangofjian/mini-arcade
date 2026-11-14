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
import { applyLevelClear, loadLevelSave, writeLevelSave, type LevelSave } from '../rules/progressSave';
import {
  TS_BUILDS,
  TS_FORMATIONS,
  TS_LEVELS,
  TS_LEVEL_COUNT,
  TS_OUR_COLOR,
  TS_OUR_COLOR2,
  TS_OUR_NAME,
  TS_OUR_SHORT,
  TS_PITCH_H,
  TS_PITCH_W,
  TS_PRESSES,
  TS_SAVE_KEY,
  TS_VIEW_H,
  TS_VIEW_W,
  TS_WIDTHS,
  confirmHalf,
  copyTactic,
  createTsMatch,
  defaultTactic,
  kickoff,
  matchScoreValue,
  setTactic,
  skipHalf,
  tickTs,
  tsLevelById,
  type Tactic,
  type TsMatch,
  type TsPhase,
  type Vec2,
} from '../rules/tacticSketch';

const CW = TS_VIEW_W;
const CH = TS_VIEW_H;

type Hit = { x: number; y: number; w: number; h: number; act: () => void };

function pitchBox(): { x: number; y: number; w: number; h: number } {
  const h = 360;
  const w = h * (TS_PITCH_W / TS_PITCH_H);
  return { x: (CW - w) / 2, y: 92, w, h };
}

function toC(p: Vec2, box: { x: number; y: number; w: number; h: number }): Vec2 {
  return { x: box.x + (p.x / TS_PITCH_W) * box.w, y: box.y + (p.y / TS_PITCH_H) * box.h };
}

function inHit(h: Hit, x: number, y: number): boolean {
  return x >= h.x && y >= h.y && x <= h.x + h.w && y <= h.y + h.h;
}

function roundChip(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, fill: string) {
  ctx.fillStyle = fill;
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, 8);
  ctx.fill();
}

function formationLabel(t: Tactic): string {
  return TS_FORMATIONS.find((f) => f.id === t.formation)?.label ?? t.formation;
}

function tacticLine(t: Tactic): string {
  const p = TS_PRESSES.find((x) => x.id === t.press)?.label;
  const b = TS_BUILDS.find((x) => x.id === t.build)?.label;
  const w = TS_WIDTHS.find((x) => x.id === t.width)?.label;
  return `${formationLabel(t)} · ${p} · ${b} · ${w}`;
}

function phaseText(phase: TsPhase, paused: boolean): string {
  if (paused && (phase === 'first' || phase === 'second')) return '已暂停';
  if (phase === 'setup') return '排阵中';
  if (phase === 'first') return '上半场';
  if (phase === 'halftime') return '中场休息';
  if (phase === 'second') return '下半场';
  if (phase === 'fulltime') return '全场结束';
  return '';
}

export default function TacticSketch() {
  const theme = useGrokTheme();
  const canvas = useRef<HTMLCanvasElement | null>(null);
  const stageRef = useRef<HTMLDivElement | null>(null);
  const { active: immersive } = useImmersivePlay();
  const fit = useStageFit(stageRef, CW, CH, immersive, true);
  const match = useRef<TsMatch | null>(null);
  const paused = useRef(false);
  const last = useRef(0);
  const screen = useRef<'select' | 'play'>('select');
  const saved = useRef(false);
  const lastTactic = useRef<Tactic>(defaultTactic());
  const hits = useRef<Hit[]>([]);
  const saveRef = useRef<LevelSave>(loadLevelSave(TS_SAVE_KEY, TS_LEVEL_COUNT));
  const [hud, setHud] = useState({
    screen: 'select' as 'select' | 'play',
    phase: '' as TsPhase | '',
    message: '',
    minute: 0,
    score: [0, 0] as [number, number],
    poss: 0,
    shots: [0, 0] as [number, number],
    stars: 0,
    speed: 1 as 1 | 2 | 4,
    level: 1,
    levelName: '',
    opp: '',
    venue: '',
    tactic: '',
    paused: false,
    save: saveRef.current,
  });

  const sync = () => {
    const m = match.current;
    const half = m?.phase === 'second' ? m.second : m?.first;
    const poss = m?.phase === 'fulltime' ? (m.briefing?.possession ?? 0) : (half?.possession ?? 0);
    const shotsF = (m?.first?.shotsFor ?? 0) + (m?.phase === 'second' || m?.phase === 'fulltime' || m?.phase === 'halftime' ? (m.second?.shotsFor ?? (m.phase === 'halftime' ? 0 : 0)) : 0);
    const shotsA = (m?.first?.shotsAgainst ?? 0) + (m?.second?.shotsAgainst ?? 0);
    const firstShots = m?.first ? [m.first.shotsFor, m.first.shotsAgainst] : [0, 0];
    setHud({
      screen: screen.current,
      phase: m?.phase ?? '',
      message: m?.message ?? '',
      minute: m?.minute ?? 0,
      score: m ? [m.score[0], m.score[1]] : [0, 0],
      poss,
      shots: m?.second || m?.phase === 'fulltime' ? [shotsF, shotsA] : firstShots as [number, number],
      stars: m?.stars ?? 0,
      speed: m?.speed ?? 1,
      level: m?.level.id ?? 1,
      levelName: m?.level.name ?? '',
      opp: m?.level.opponent.name ?? '',
      venue: m?.level.venue === 'home' ? '主场' : '客场',
      tactic: m ? tacticLine(m.phase === 'halftime' && m.htTactic ? m.htTactic : m.tactic) : '',
      paused: paused.current,
      save: saveRef.current,
    });
  };

  const openLevel = (id: number) => {
    if (id > saveRef.current.unlocked) return;
    const m = createTsMatch(id, lastTactic.current);
    match.current = m;
    screen.current = 'play';
    paused.current = false;
    saved.current = false;
    last.current = 0;
    sync();
  };

  const retry = () => {
    if (match.current) openLevel(match.current.level.id);
  };

  const nextLevel = () => {
    const m = match.current;
    if (!m) return;
    const n = m.level.id + 1;
    if (n <= TS_LEVEL_COUNT && n <= saveRef.current.unlocked) openLevel(n);
  };

  const togglePause = () => {
    const m = match.current;
    if (!m || (m.phase !== 'first' && m.phase !== 'second')) return;
    paused.current = !paused.current;
    sync();
  };

  const persistIfNeeded = (m: TsMatch) => {
    if (m.phase !== 'fulltime' || saved.current || !m.briefing) return;
    if (m.stars < 1) {
      saved.current = true;
      return;
    }
    saveRef.current = applyLevelClear(saveRef.current, m.level.id - 1, m.stars, matchScoreValue(m.briefing), TS_LEVEL_COUNT);
    writeLevelSave(TS_SAVE_KEY, saveRef.current);
    saved.current = true;
  };

  useEffect(() => {
    const c = canvas.current;
    if (!c) return;
    const ctx = c.getContext('2d');
    if (!ctx) return;
    let raf = 0;

    const onClick = (e: PointerEvent) => {
      const p = clientToLogical(c.getBoundingClientRect(), e.clientX, e.clientY, CW, CH, 'fill');
      for (let i = hits.current.length - 1; i >= 0; i--) {
        if (inHit(hits.current[i], p.x, p.y)) {
          hits.current[i].act();
          sync();
          e.preventDefault();
          return;
        }
      }
    };

    const onKey = (e: KeyboardEvent) => {
      if (e.repeat) return;
      if (e.key === 'p' || e.key === 'P') {
        togglePause();
        e.preventDefault();
        return;
      }
      if (e.key === 'r' || e.key === 'R') {
        retry();
        e.preventDefault();
        return;
      }
      const m = match.current;
      if (screen.current === 'select' && /^[1-8]$/.test(e.key)) {
        openLevel(Number(e.key));
        return;
      }
      if (!m) return;
      if (e.key === 'Enter') {
        if (m.phase === 'setup') kickoff(m);
        else if (m.phase === 'halftime') confirmHalf(m);
        sync();
        e.preventDefault();
        return;
      }
      if (e.key === '1' || e.key === '2' || e.key === '4') {
        if (m.phase === 'first' || m.phase === 'second') {
          m.speed = Number(e.key) as 1 | 2 | 4;
          sync();
        }
      }
      if (e.key === ' ' && (m.phase === 'first' || m.phase === 'second')) {
        skipHalf(m);
        persistIfNeeded(m);
        paused.current = false;
        sync();
        e.preventDefault();
      }
    };

    const hide = () => {
      const m = match.current;
      if (m && (m.phase === 'first' || m.phase === 'second')) {
        paused.current = true;
        sync();
      }
    };

    c.addEventListener('pointerdown', onClick);
    window.addEventListener('keydown', onKey);
    window.addEventListener('blur', hide);
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) hide();
    });

    const drawPitch = (box: { x: number; y: number; w: number; h: number }, m: TsMatch | null) => {
      const stripe = box.h / 10;
      for (let i = 0; i < 10; i++) {
        ctx.fillStyle = i % 2 === 0 ? '#2d8a4e' : '#267a44';
        ctx.fillRect(box.x, box.y + i * stripe, box.w, stripe + 1);
      }
      ctx.strokeStyle = 'rgba(255,255,255,0.75)';
      ctx.lineWidth = 2;
      ctx.strokeRect(box.x, box.y, box.w, box.h);
      ctx.beginPath();
      ctx.moveTo(box.x + box.w / 2, box.y);
      ctx.lineTo(box.x + box.w / 2, box.y + box.h);
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(box.x + box.w / 2, box.y + box.h / 2, box.h * 0.14, 0, Math.PI * 2);
      ctx.stroke();
      const penW = box.w * 0.157;
      const penH = box.h * 0.59;
      const penY = box.y + (box.h - penH) / 2;
      ctx.strokeRect(box.x, penY, penW, penH);
      ctx.strokeRect(box.x + box.w - penW, penY, penW, penH);
      const sixW = box.w * 0.052;
      const sixH = box.h * 0.27;
      const sixY = box.y + (box.h - sixH) / 2;
      ctx.strokeRect(box.x, sixY, sixW, sixH);
      ctx.strokeRect(box.x + box.w - sixW, sixY, sixW, sixH);
      ctx.fillStyle = '#e8e8e8';
      const gH = box.h * 0.12;
      ctx.fillRect(box.x - 6, box.y + (box.h - gH) / 2, 6, gH);
      ctx.fillRect(box.x + box.w, box.y + (box.h - gH) / 2, 6, gH);
      if (!m) return;
      const opp = m.level.opponent;
      const lastMv = m.moveIndex > 0 ? m.moves[m.moveIndex - 1] : null;
      if (lastMv && (m.phase === 'first' || m.phase === 'second')) {
        const a = toC(lastMv.from, box);
        const b = toC(lastMv.to, box);
        ctx.strokeStyle = lastMv.team === 0 ? 'rgba(255,255,255,0.55)' : 'rgba(255,230,160,0.5)';
        ctx.lineWidth = lastMv.kind === 'cross' || lastMv.kind === 'through' ? 3 : 2;
        ctx.setLineDash(lastMv.kind === 'cross' ? [6, 4] : []);
        ctx.beginPath();
        ctx.moveTo(a.x, a.y);
        ctx.lineTo(b.x, b.y);
        ctx.stroke();
        ctx.setLineDash([]);
      }
      for (const p of m.players) {
        const q = toC({ x: p.x, y: p.y }, box);
        const ours = p.team === 0;
        ctx.fillStyle = 'rgba(0,0,0,0.25)';
        ctx.beginPath();
        ctx.ellipse(q.x + 1, q.y + 3, 8, 4, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = ours ? TS_OUR_COLOR : opp.color;
        ctx.beginPath();
        ctx.arc(q.x, q.y, 9, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = ours ? TS_OUR_COLOR2 : opp.color2;
        ctx.lineWidth = 1.5;
        ctx.stroke();
        ctx.fillStyle = '#fff';
        ctx.font = 'bold 9px sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(String(p.no), q.x, q.y + 0.5);
        if (m.phase === 'setup') {
          ctx.textBaseline = 'top';
          ctx.font = '10px sans-serif';
          ctx.fillStyle = ours ? '#f2fff8' : 'rgba(255,255,255,0.75)';
          ctx.fillText(p.name, q.x, q.y + 11);
        }
      }
      const b = toC(m.ball, box);
      ctx.fillStyle = 'rgba(0,0,0,0.3)';
      ctx.beginPath();
      ctx.ellipse(b.x + 1, b.y + 3, 5, 3, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#f4f4f0';
      ctx.beginPath();
      ctx.arc(b.x, b.y, 5, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#222';
      ctx.lineWidth = 1;
      ctx.stroke();
    };

    const addChip = (x: number, y: number, w: number, h: number, label: string, on: boolean, act: () => void) => {
      roundChip(ctx, x, y, w, h, on ? '#1f7a5c' : '#2a3a34');
      if (on) {
        ctx.strokeStyle = '#9fe0c4';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.roundRect(x, y, w, h, 8);
        ctx.stroke();
      }
      ctx.fillStyle = on ? '#f3fff8' : '#c8d6ce';
      ctx.font = 'bold 13px sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(label, x + w / 2, y + h / 2 + 0.5);
      hits.current.push({ x, y, w, h, act });
    };

    const drawSelect = () => {
      hits.current = [];
      ctx.fillStyle = '#14241c';
      ctx.fillRect(0, 0, CW, CH);
      ctx.fillStyle = '#e8f5ee';
      ctx.font = 'bold 32px sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'alphabetic';
      ctx.fillText('战术草稿', CW / 2, 54);
      ctx.font = '15px sans-serif';
      ctx.fillStyle = '#b4cfc2';
      ctx.fillText('为青禾联排出阵型、定下指令，再看简化比赛如何被这些安排带出来。虚构联赛与球员。', CW / 2, 82);
      TS_LEVELS.forEach((lv, i) => {
        const col = i % 4;
        const row = Math.floor(i / 4);
        const x = 40 + col * 230;
        const y = 120 + row * 170;
        const locked = lv.id > saveRef.current.unlocked;
        const stars = saveRef.current.stars[i] ?? 0;
        roundChip(ctx, x, y, 218, 150, locked ? '#1c2822' : '#243830');
        ctx.fillStyle = '#e8f5ee';
        ctx.font = 'bold 17px sans-serif';
        ctx.textAlign = 'left';
        ctx.fillText((locked ? '锁定  ' : '') + lv.id + '  ' + lv.name, x + 14, y + 36);
        ctx.font = '13px sans-serif';
        ctx.fillStyle = '#9ab5a8';
        ctx.fillText((lv.venue === 'home' ? '主场' : '客场') + ' vs ' + lv.opponent.name, x + 14, y + 64);
        ctx.fillStyle = '#e7c25a';
        ctx.font = '14px sans-serif';
        ctx.fillText(stars ? '★'.repeat(stars) + '☆'.repeat(3 - stars) : locked ? '先通过上一场' : '尚未开赛', x + 14, y + 98);
        ctx.fillStyle = '#7f9e90';
        ctx.font = '12px sans-serif';
        ctx.fillText(lv.hint.slice(0, 16) + (lv.hint.length > 16 ? '…' : ''), x + 14, y + 126);
        if (!locked) hits.current.push({ x, y, w: 218, h: 150, act: () => openLevel(lv.id) });
      });
    };

    const drawBar = (m: TsMatch) => {
      ctx.fillStyle = '#0e1c16';
      ctx.fillRect(0, 0, CW, 84);
      ctx.fillStyle = TS_OUR_COLOR2;
      ctx.font = 'bold 16px sans-serif';
      ctx.textAlign = 'left';
      ctx.textBaseline = 'alphabetic';
      ctx.fillText(TS_OUR_SHORT, 24, 28);
      ctx.textAlign = 'right';
      ctx.fillStyle = m.level.opponent.color2;
      ctx.fillText(m.level.opponent.short, CW - 24, 28);
      ctx.textAlign = 'center';
      ctx.fillStyle = '#f4fff8';
      ctx.font = 'bold 28px sans-serif';
      ctx.fillText(`${m.score[0]} – ${m.score[1]}`, CW / 2, 36);
      ctx.font = '13px sans-serif';
      ctx.fillStyle = '#b4cfc2';
      const min = Math.min(90, Math.floor(m.minute));
      const poss = m.briefing?.possession ?? (m.phase === 'second' ? m.second?.possession : m.first?.possession) ?? 0;
      const shotsF = (m.first?.shotsFor ?? 0) + (m.second?.shotsFor ?? 0);
      const shotsA = (m.first?.shotsAgainst ?? 0) + (m.second?.shotsAgainst ?? 0);
      ctx.fillText(`${min}′ · ${m.level.venue === 'home' ? '主场' : '客场'} vs ${m.level.opponent.name} · 控球 ${Math.round(poss * 100)}% · 射门 ${shotsF}-${shotsA}`, CW / 2, 62);
      if (poss > 0 && m.phase !== 'setup') {
        ctx.fillStyle = '#1a3328';
        ctx.fillRect(200, 70, 560, 8);
        ctx.fillStyle = TS_OUR_COLOR;
        ctx.fillRect(200, 70, 560 * poss, 8);
        ctx.fillStyle = m.level.opponent.color;
        ctx.fillRect(200 + 560 * poss, 70, 560 * (1 - poss), 8);
      }
    };

    const drawPlay = (m: TsMatch) => {
      hits.current = [];
      ctx.fillStyle = '#14241c';
      ctx.fillRect(0, 0, CW, CH);
      drawBar(m);
      const box = pitchBox();
      const tNow = m.phase === 'halftime' && m.htTactic ? m.htTactic : m.tactic;

      if (m.phase === 'setup' || m.phase === 'halftime') {
        const y0 = m.phase === 'setup' ? 6 : 6;
        if (m.phase === 'setup') {
          let x = 16;
          for (const f of TS_FORMATIONS) {
            addChip(x, y0 + 4, 110, 32, f.label, tNow.formation === f.id, () => setTactic(m, { formation: f.id }, 'setup'));
            x += 118;
          }
        } else {
          ctx.fillStyle = '#e8f5ee';
          ctx.font = 'bold 14px sans-serif';
          ctx.textAlign = 'left';
          ctx.fillText('中场微调指令（阵型本场不再更换）：' + formationLabel(m.tactic), 16, 28);
        }
        let x = 16;
        const y1 = 44;
        for (const p of TS_PRESSES) {
          addChip(x, y1, 110, 30, p.label, tNow.press === p.id, () => setTactic(m, { press: p.id }, m.phase === 'setup' ? 'setup' : 'halftime'));
          x += 118;
        }
        x += 10;
        for (const b of TS_BUILDS) {
          addChip(x, y1, 110, 30, b.label, tNow.build === b.id, () => setTactic(m, { build: b.id }, m.phase === 'setup' ? 'setup' : 'halftime'));
          x += 118;
        }
        x += 10;
        for (const w of TS_WIDTHS) {
          addChip(x, y1, 100, 30, w.label, tNow.width === w.id, () => setTactic(m, { width: w.id }, m.phase === 'setup' ? 'setup' : 'halftime'));
          x += 108;
        }
      }

      drawPitch(box, m);

      // bottom ticker / hint / actions
      ctx.fillStyle = '#0e1c16';
      ctx.fillRect(0, CH - 76, CW, 76);
      ctx.fillStyle = '#c8e0d4';
      ctx.font = '13px sans-serif';
      ctx.textAlign = 'left';
      ctx.textBaseline = 'top';
      if (m.phase === 'setup') {
        ctx.fillText(m.level.hint, 20, CH - 66);
        ctx.fillStyle = '#8eaea0';
        ctx.fillText(tacticLine(m.tactic), 20, CH - 42);
        addChip(CW - 280, CH - 58, 120, 40, '返回选关', false, () => {
          screen.current = 'select';
          match.current = null;
        });
        addChip(CW - 148, CH - 58, 128, 40, '开赛', true, () => {
          lastTactic.current = copyTactic(m.tactic);
          kickoff(m);
          paused.current = false;
        });
      } else if (m.phase === 'halftime') {
        ctx.fillText('中场休息。可以改一次压迫、节奏或进攻方向，然后进入下半场。', 20, CH - 66);
        addChip(CW - 168, CH - 58, 148, 40, '进入下半场', true, () => {
          confirmHalf(m);
          paused.current = false;
        });
      } else if (m.phase === 'fulltime' && m.briefing) {
        const b = m.briefing;
        const result = b.goalsFor > b.goalsAgainst ? '胜' : b.goalsFor < b.goalsAgainst ? '负，本场未通关' : '平';
        ctx.fillStyle = '#e8f5ee';
        ctx.font = 'bold 14px sans-serif';
        ctx.fillText(`赛后简报  ${b.goalsFor}–${b.goalsAgainst}  ${result}  ${'★'.repeat(b.stars)}${'☆'.repeat(3 - b.stars)}`, 20, CH - 70);
        ctx.font = '12px sans-serif';
        ctx.fillStyle = '#b4cfc2';
        ctx.fillText(`控球 ${Math.round(b.possession * 100)}%  射门 ${b.shotsFor}-${b.shotsAgainst}  射正 ${b.onTargetFor}-${b.onTargetAgainst}  边路进攻 ${b.wingAttacks}  前场抢断 ${b.interceptHigh}`, 20, CH - 48);
        const note = b.notes[0] ?? (b.events[0] ?? '双方互有来回。');
        ctx.fillText(note, 20, CH - 28);
        addChip(CW - 280, CH - 58, 80, 40, '重试', false, () => retry());
        if (b.stars >= 1 && m.level.id < TS_LEVEL_COUNT && m.level.id + 1 <= saveRef.current.unlocked) {
          addChip(CW - 190, CH - 58, 90, 40, '下一场', true, () => nextLevel());
        }
        addChip(CW - 90, CH - 58, 74, 40, '选关', false, () => {
          screen.current = 'select';
          match.current = null;
        });
      } else {
        const recent = m.log.slice(-2);
        ctx.fillText(recent[0] ?? m.message, 20, CH - 62);
        if (recent[1]) ctx.fillText(recent[1], 20, CH - 40);
        const speeds: Array<1 | 2 | 4> = [1, 2, 4];
        speeds.forEach((s, i) => {
          addChip(CW - 360 + i * 70, CH - 54, 64, 36, s + '×', m.speed === s, () => {
            m.speed = s;
          });
        });
        addChip(CW - 142, CH - 54, 122, 36, '跳过本半场', false, () => {
          skipHalf(m);
          persistIfNeeded(m);
        });
      }

      if (paused.current && (m.phase === 'first' || m.phase === 'second')) {
        ctx.fillStyle = 'rgba(8,16,12,0.55)';
        ctx.fillRect(box.x, box.y, box.w, box.h);
        ctx.fillStyle = '#f4fff8';
        ctx.font = 'bold 36px sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('暂停', box.x + box.w / 2, box.y + box.h / 2);
      }

      if (m.phase === 'fulltime' && m.briefing) {
        const b = m.briefing;
        ctx.fillStyle = 'rgba(8,18,14,0.72)';
        ctx.fillRect(box.x + 40, box.y + 24, box.w - 80, box.h - 48);
        ctx.fillStyle = '#f4fff8';
        ctx.font = 'bold 28px sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'alphabetic';
        ctx.fillText(`${TS_OUR_NAME}  ${b.goalsFor} – ${b.goalsAgainst}  ${m.level.opponent.name}`, box.x + box.w / 2, box.y + 80);
        ctx.fillStyle = '#e7c25a';
        ctx.font = '22px sans-serif';
        ctx.fillText('★'.repeat(b.stars) + '☆'.repeat(3 - b.stars), box.x + box.w / 2, box.y + 116);
        ctx.fillStyle = '#c8e0d4';
        ctx.font = '15px sans-serif';
        ctx.fillText(`控球 ${Math.round(b.possession * 100)}%　射门 ${b.shotsFor}-${b.shotsAgainst}（射正 ${b.onTargetFor}-${b.onTargetAgainst}）`, box.x + box.w / 2, box.y + 152);
        const lines = [...b.notes, ...b.events].slice(0, 6);
        lines.forEach((ln, i) => {
          ctx.fillText(ln, box.x + box.w / 2, box.y + 186 + i * 24);
        });
      }
    };

    const loop = (t: number) => {
      const m = match.current;
      if (screen.current !== 'play' || !m) {
        drawSelect();
      } else {
        const dt = last.current ? Math.min(0.05, (t - last.current) / 1000) : 0;
        last.current = t;
        if (!paused.current) tickTs(m, dt);
        persistIfNeeded(m);
        drawPlay(m);
      }
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);

    return () => {
      cancelAnimationFrame(raf);
      c.removeEventListener('pointerdown', onClick);
      window.removeEventListener('keydown', onKey);
      window.removeEventListener('blur', hide);
    };
  }, []);

  // keep hud reasonably fresh without depending on rAF for buttons
  useEffect(() => {
    const id = setInterval(() => {
      if (screen.current === 'play' && match.current) sync();
    }, 250);
    return () => clearInterval(id);
  }, []);

  const playing = hud.screen === 'play';
  const live = hud.phase === 'first' || hud.phase === 'second';
  const ended = hud.phase === 'fulltime';
  const canNext = ended && hud.stars >= 1 && hud.level < TS_LEVEL_COUNT && hud.level + 1 <= hud.save.unlocked;

  return (
    <Page title="战术草稿" width="wide" lang="zh-Hans" summary="排出阵型、定下战术指令，再看上帝视角的简化比赛如何被这些安排带出来。虚构球员与联赛。">
      <ImmersiveFrame
        layout="banded"
        stageRef={stageRef}
        focusRef={canvas}
        intro={
          <p style={{ margin: 0, color: theme.text.secondary }}>
            手机可点「全屏游玩」。在阵型板上点选阵型和指令，再看比赛回放。不强加方向键。关卡进度在浏览器允许时保存在本机。
          </p>
        }
        hudStats={
          playing ? (
            <>
              <span>{hud.levelName}</span>
              <span>{hud.venue} vs {hud.opp}</span>
              <span>{Math.floor(hud.minute)}′ {hud.score[0]}–{hud.score[1]}</span>
              <span>控球 {Math.round(hud.poss * 100)}%</span>
              <span>{phaseText(hud.phase || 'setup', hud.paused)}</span>
            </>
          ) : (
            <span>选择场次</span>
          )
        }
        hudActions={
          playing ? (
            <>
              {live ? <Button label={hud.paused ? '继续' : '暂停'} onClick={togglePause} /> : null}
              {live ? <Button label={hud.speed + '×'} onClick={() => {
                const m = match.current;
                if (!m) return;
                m.speed = m.speed === 1 ? 2 : m.speed === 2 ? 4 : 1;
                sync();
              }} /> : null}
              {live ? <Button label="跳过本半场" onClick={() => {
                if (!match.current) return;
                skipHalf(match.current);
                persistIfNeeded(match.current);
                sync();
              }} /> : null}
              <Button label="重试" onClick={retry} />
              {canNext ? <Button label="下一场" variant="primary" onClick={nextLevel} /> : null}
              <Button label="选关" onClick={() => { screen.current = 'select'; match.current = null; sync(); }} />
            </>
          ) : null
        }
        hudMsg={playing ? <span>{hud.message}</span> : null}
        side={
          <>
            <div className="imm-default-only arcade-lvls" style={{ marginBottom: 12 }}>
              {TS_LEVELS.map((lv) => {
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
                {live ? <Button label={hud.paused ? '继续' : '暂停'} onClick={togglePause} /> : null}
                <Button label="重新开始" onClick={retry} />
                {canNext ? <Button label="下一场" variant="primary" onClick={nextLevel} /> : null}
                <Button label="返回选关" onClick={() => { screen.current = 'select'; match.current = null; sync(); }} />
                <p style={{ color: theme.text.secondary, fontSize: 14, margin: 0, flexBasis: '100%' }}>{hud.tactic}</p>
              </div>
            ) : (
              <p style={{ color: theme.text.secondary, fontSize: 14 }}>点场次卡片开始排阵。点选阵型和指令后开赛，中场可再改一次指令。P 暂停，R 重试。</p>
            )}
          </>
        }
        help={
          <p style={{ margin: 0, color: theme.text.secondary, textAlign: 'center' }}>
            点选 4-3-3、4-4-2、4-2-3-1 或 5-3-2，再选压迫、节奏与进攻方向，然后开赛。比赛是上帝视角的简化回放，传球走位和进攻方向会随你的安排变化；1 / 2 / 4 或按钮调整倍速，空格或按钮跳过本半场。中场可以微调一次指令。赢球且净胜两球或控球达到 55% 为三星，赢球两星，平局一星，输掉不通关。P 暂停 · R 重试 · Esc 退出全屏。切到后台会自动暂停。
          </p>
        }
      >
        <canvas
          ref={canvas}
          width={CW}
          height={CH}
          tabIndex={0}
          aria-label="战术草稿游戏区：点选阵型与指令后开赛，P 暂停，R 重试"
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
