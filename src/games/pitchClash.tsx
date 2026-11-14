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
import { HandheldPad } from '../mobile/HandheldPad';
import { applyLevelClear, loadLevelSave, writeLevelSave, type LevelSave } from '../rules/progressSave';
import {
  EMPTY_PC_INPUT,
  PC_BOTTOM,
  PC_CX,
  PC_CY,
  PC_GOAL_BOT,
  PC_GOAL_H,
  PC_GOAL_TOP,
  PC_LEFT,
  PC_LEVELS,
  PC_LEVEL_COUNT,
  PC_OUR_COLOR,
  PC_OUR_COLOR2,
  PC_OUR_NAME,
  PC_OUR_SHORT,
  PC_PLAYER_R,
  PC_RIGHT,
  PC_SAVE_KEY,
  PC_TOP,
  PC_VIEW_H,
  PC_VIEW_W,
  createPcMatch,
  matchScoreValue,
  tickPc,
  type PcInput,
  type PcMatch,
  type PcPhase,
} from '../rules/pitchClash';

const CW = PC_VIEW_W;
const CH = PC_VIEW_H;

const OPP_COLORS: [string, string][] = [
  ['#a33a32', '#ffd8d4'],
  ['#7a5a1a', '#f5e6c4'],
  ['#2f5e6e', '#d4eef4'],
  ['#4a4a58', '#e0e0e8'],
  ['#6a3a58', '#f0d8e8'],
  ['#3a5a38', '#d8ecd4'],
  ['#3a3a78', '#d8d8f4'],
  ['#6a2a2a', '#f4d4d4'],
];

function phaseLabel(phase: PcPhase | '', paused: boolean): string {
  if (paused && (phase === 'play' || phase === 'kickoff' || phase === 'countdown' || phase === 'goal')) return '已暂停';
  if (phase === 'countdown') return '倒计时';
  if (phase === 'kickoff') return '开球';
  if (phase === 'play') return '比赛中';
  if (phase === 'goal') return '进球';
  if (phase === 'won') return '获胜';
  if (phase === 'lost') return '落败';
  if (phase === 'draw') return '平局';
  return '';
}

export default function PitchClash() {
  const theme = useGrokTheme();
  const canvas = useRef<HTMLCanvasElement | null>(null);
  const stageRef = useRef<HTMLDivElement | null>(null);
  const { active: immersive } = useImmersivePlay();
  const fit = useStageFit(stageRef, CW, CH, immersive, true);
  const match = useRef<PcMatch | null>(null);
  const paused = useRef(false);
  const last = useRef(0);
  const screen = useRef<'select' | 'play'>('select');
  const saved = useRef(false);
  const input = useRef<PcInput>({ ...EMPTY_PC_INPUT });
  const saveRef = useRef<LevelSave>(loadLevelSave(PC_SAVE_KEY, PC_LEVEL_COUNT));
  const [hud, setHud] = useState({
    screen: 'select' as 'select' | 'play',
    phase: '' as PcPhase | '',
    message: '',
    time: 0,
    score: [0, 0] as [number, number],
    stars: 0,
    level: 1,
    levelName: '',
    opp: '',
    venue: '',
    mode: '',
    paused: false,
    save: saveRef.current,
  });

  const clearInput = () => { input.current = { ...EMPTY_PC_INPUT }; };
  const hold = (key: keyof PcInput, v: boolean) => { input.current[key] = v; };

  const sync = () => {
    const m = match.current;
    setHud({
      screen: screen.current,
      phase: m?.phase ?? '',
      message: m?.message ?? '',
      time: m?.time ?? 0,
      score: m ? [m.score[0], m.score[1]] : [0, 0],
      stars: m?.stars ?? 0,
      level: m?.level.id ?? 1,
      levelName: m?.level.name ?? '',
      opp: m?.level.opponent ?? '',
      venue: m?.level.venue === 'home' ? '主场' : '客场',
      mode: m ? (m.level.mode === 'firstTo' ? '先下 ' + m.level.target + ' 球' : '限时 ' + m.level.target + 's') : '',
      paused: paused.current,
      save: saveRef.current,
    });
  };

  const openLevel = (id: number) => {
    if (id > saveRef.current.unlocked) return;
    match.current = createPcMatch(id);
    screen.current = 'play';
    paused.current = false;
    saved.current = false;
    last.current = 0;
    clearInput();
    sync();
  };

  const retry = () => { if (match.current) openLevel(match.current.level.id); };
  const nextLevel = () => {
    const m = match.current;
    if (!m) return;
    const n = m.level.id + 1;
    if (n <= PC_LEVEL_COUNT && n <= saveRef.current.unlocked) openLevel(n);
  };
  const togglePause = () => {
    const m = match.current;
    if (!m || m.phase === 'won' || m.phase === 'lost' || m.phase === 'draw') return;
    paused.current = !paused.current;
    if (paused.current) clearInput();
    sync();
  };
  const persistIfNeeded = (m: PcMatch) => {
    if (saved.current) return;
    if (m.phase !== 'won' && m.phase !== 'lost' && m.phase !== 'draw') return;
    saved.current = true;
    if (m.stars < 1) return;
    saveRef.current = applyLevelClear(saveRef.current, m.level.id - 1, m.stars, matchScoreValue(m), PC_LEVEL_COUNT);
    writeLevelSave(PC_SAVE_KEY, saveRef.current);
  };

  useEffect(() => {
    const c = canvas.current;
    if (!c) return;
    const ctx = c.getContext('2d');
    if (!ctx) return;
    let raf = 0;

    const onClick = (e: PointerEvent) => {
      if (screen.current !== 'select') return;
      const p = clientToLogical(c.getBoundingClientRect(), e.clientX, e.clientY, CW, CH, 'fill');
      const col = Math.floor((p.x - 40) / 230);
      const row = Math.floor((p.y - 120) / 170);
      const id = row * 4 + col + 1;
      if (col >= 0 && col < 4 && row >= 0 && row < 2 && id >= 1 && id <= PC_LEVEL_COUNT && p.x <= 40 + col * 230 + 218 && p.y <= 120 + row * 170 + 150) {
        openLevel(id);
      }
    };

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'p' || e.key === 'P') { togglePause(); e.preventDefault(); return; }
      if (e.key === 'r' || e.key === 'R') { retry(); e.preventDefault(); return; }
      if (screen.current === 'select' && !e.repeat && /^[1-8]$/.test(e.key)) { openLevel(Number(e.key)); return; }
      if (e.code === 'ArrowLeft' || e.code === 'KeyA') { e.preventDefault(); hold('left', true); }
      if (e.code === 'ArrowRight' || e.code === 'KeyD') { e.preventDefault(); hold('right', true); }
      if (e.code === 'ArrowUp' || e.code === 'KeyW') { e.preventDefault(); hold('up', true); }
      if (e.code === 'ArrowDown' || e.code === 'KeyS') { e.preventDefault(); hold('down', true); }
      if (e.code === 'KeyJ' || e.code === 'KeyF' || e.code === 'Space') { e.preventDefault(); if (!e.repeat) hold('pass', true); }
      if (e.code === 'KeyK' || e.code === 'KeyL' || e.code === 'ShiftLeft' || e.code === 'ShiftRight') { e.preventDefault(); if (!e.repeat) hold('shoot', true); }
    };
    const onKeyUp = (e: KeyboardEvent) => {
      if (e.code === 'ArrowLeft' || e.code === 'KeyA') hold('left', false);
      if (e.code === 'ArrowRight' || e.code === 'KeyD') hold('right', false);
      if (e.code === 'ArrowUp' || e.code === 'KeyW') hold('up', false);
      if (e.code === 'ArrowDown' || e.code === 'KeyS') hold('down', false);
      if (e.code === 'KeyJ' || e.code === 'KeyF' || e.code === 'Space') hold('pass', false);
      if (e.code === 'KeyK' || e.code === 'KeyL' || e.code === 'ShiftLeft' || e.code === 'ShiftRight') hold('shoot', false);
    };
    const hide = () => {
      const m = match.current;
      if (m && (m.phase === 'play' || m.phase === 'kickoff' || m.phase === 'countdown' || m.phase === 'goal')) {
        paused.current = true;
        clearInput();
        sync();
      }
    };

    c.addEventListener('pointerdown', onClick);
    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);
    window.addEventListener('blur', hide);
    document.addEventListener('visibilitychange', hide);

    const drawSelect = () => {
      ctx.fillStyle = '#15261c';
      ctx.fillRect(0, 0, CW, CH);
      ctx.fillStyle = '#e8f5ee';
      ctx.font = 'bold 32px sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'alphabetic';
      ctx.fillText('小场争锋', CW / 2, 54);
      ctx.font = '15px sans-serif';
      ctx.fillStyle = '#b4cfc2';
      ctx.fillText('俯视小场地 3v3。你控一名球员，传球、射门、抢断，队友是简单队友。虚构球队。', CW / 2, 82);
      PC_LEVELS.forEach((lv, i) => {
        const col = i % 4;
        const row = Math.floor(i / 4);
        const x = 40 + col * 230;
        const y = 120 + row * 170;
        const locked = lv.id > saveRef.current.unlocked;
        const stars = saveRef.current.stars[i] ?? 0;
        ctx.fillStyle = locked ? '#1c2822' : '#243830';
        ctx.beginPath();
        ctx.roundRect(x, y, 218, 150, 10);
        ctx.fill();
        ctx.fillStyle = '#e8f5ee';
        ctx.font = 'bold 17px sans-serif';
        ctx.textAlign = 'left';
        ctx.fillText((locked ? '锁定  ' : '') + lv.id + '  ' + lv.name, x + 14, y + 36);
        ctx.font = '13px sans-serif';
        ctx.fillStyle = '#9ab5a8';
        ctx.fillText((lv.venue === 'home' ? '主场' : '客场') + ' vs ' + lv.opponent, x + 14, y + 62);
        ctx.fillText(lv.mode === 'firstTo' ? '先下 ' + lv.target + ' 球' : '限时 ' + lv.target + ' 秒', x + 14, y + 86);
        ctx.fillStyle = '#e7c25a';
        ctx.font = '14px sans-serif';
        ctx.fillText(stars ? '★'.repeat(stars) + '☆'.repeat(3 - stars) : locked ? '先通过上一场' : '尚未开赛', x + 14, y + 122);
      });
    };

    const drawPitch = (m: PcMatch) => {
      ctx.fillStyle = '#1a3a24';
      ctx.fillRect(0, 0, CW, CH);
      const stripe = (PC_BOTTOM - PC_TOP) / 8;
      for (let i = 0; i < 8; i++) {
        ctx.fillStyle = i % 2 === 0 ? '#2f8a4c' : '#287c44';
        ctx.fillRect(PC_LEFT, PC_TOP + i * stripe, PC_RIGHT - PC_LEFT, stripe + 1);
      }
      ctx.strokeStyle = 'rgba(255,255,255,0.82)';
      ctx.lineWidth = 2.5;
      ctx.strokeRect(PC_LEFT, PC_TOP, PC_RIGHT - PC_LEFT, PC_BOTTOM - PC_TOP);
      ctx.beginPath();
      ctx.moveTo(PC_CX, PC_TOP);
      ctx.lineTo(PC_CX, PC_BOTTOM);
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(PC_CX, PC_CY, 58, 0, Math.PI * 2);
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(PC_CX, PC_CY, 3, 0, Math.PI * 2);
      ctx.fillStyle = '#fff';
      ctx.fill();
      const boxW = 110;
      const boxH = 230;
      const boxY = PC_CY - boxH / 2;
      ctx.strokeStyle = 'rgba(255,255,255,0.82)';
      ctx.strokeRect(PC_LEFT, boxY, boxW, boxH);
      ctx.strokeRect(PC_RIGHT - boxW, boxY, boxW, boxH);
      const six = 46;
      const sixH = 120;
      ctx.strokeRect(PC_LEFT, PC_CY - sixH / 2, six, sixH);
      ctx.strokeRect(PC_RIGHT - six, PC_CY - sixH / 2, six, sixH);
      // goals
      ctx.fillStyle = 'rgba(230,230,230,0.35)';
      ctx.fillRect(PC_LEFT - 18, PC_GOAL_TOP, 18, PC_GOAL_H);
      ctx.fillRect(PC_RIGHT, PC_GOAL_TOP, 18, PC_GOAL_H);
      ctx.strokeStyle = '#f0f0f0';
      ctx.lineWidth = 3;
      ctx.strokeRect(PC_LEFT - 18, PC_GOAL_TOP, 18, PC_GOAL_H);
      ctx.strokeRect(PC_RIGHT, PC_GOAL_TOP, 18, PC_GOAL_H);
      // HUD bar
      ctx.fillStyle = 'rgba(10,20,14,0.78)';
      ctx.fillRect(0, 0, CW, 56);
      ctx.fillStyle = PC_OUR_COLOR2;
      ctx.font = 'bold 15px sans-serif';
      ctx.textAlign = 'left';
      ctx.textBaseline = 'alphabetic';
      ctx.fillText(PC_OUR_SHORT, 20, 24);
      const [oc] = OPP_COLORS[(m.level.id - 1) % OPP_COLORS.length];
      ctx.textAlign = 'right';
      ctx.fillStyle = OPP_COLORS[(m.level.id - 1) % OPP_COLORS.length][1];
      ctx.fillText(m.level.opponent, CW - 20, 24);
      ctx.textAlign = 'center';
      ctx.fillStyle = '#f4fff8';
      ctx.font = 'bold 28px sans-serif';
      ctx.fillText(`${m.score[0]} – ${m.score[1]}`, CW / 2, 32);
      ctx.font = '13px sans-serif';
      ctx.fillStyle = '#b4cfc2';
      const clock = m.level.mode === 'timed'
        ? `${Math.max(0, Math.ceil(m.level.target - m.time))}s`
        : `${Math.floor(m.time)}s · 先下 ${m.level.target} 球`;
      ctx.fillText(`${m.level.venue === 'home' ? '主场' : '客场'}  ${clock}  ${m.level.name}`, CW / 2, 50);

      const oppC = OPP_COLORS[(m.level.id - 1) % OPP_COLORS.length];
      for (const p of m.players) {
        const ours = p.team === 0;
        ctx.fillStyle = 'rgba(0,0,0,0.28)';
        ctx.beginPath();
        ctx.ellipse(p.x + 1, p.y + 4, 11, 5, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = ours ? PC_OUR_COLOR : oppC[0];
        ctx.beginPath();
        ctx.arc(p.x, p.y, PC_PLAYER_R, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = ours ? PC_OUR_COLOR2 : oppC[1];
        ctx.lineWidth = p.id === 0 ? 3 : 1.6;
        ctx.stroke();
        if (p.id === 0) {
          ctx.fillStyle = '#ffe27a';
          ctx.font = 'bold 10px sans-serif';
          ctx.textAlign = 'center';
          ctx.textBaseline = 'bottom';
          ctx.fillText('你', p.x, p.y - PC_PLAYER_R - 3);
        }
        ctx.fillStyle = '#fff';
        ctx.font = 'bold 10px sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(p.name.slice(0, 2), p.x, p.y + 0.5);
      }
      const b = m.ball;
      ctx.fillStyle = 'rgba(0,0,0,0.3)';
      ctx.beginPath();
      ctx.ellipse(b.x + 1, b.y + 3, 6, 3.5, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#f4f4f0';
      ctx.beginPath();
      ctx.arc(b.x, b.y, 6.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#222';
      ctx.lineWidth = 1;
      ctx.stroke();

      ctx.fillStyle = 'rgba(10,20,14,0.75)';
      ctx.fillRect(0, CH - 36, CW, 36);
      ctx.fillStyle = '#d8eee2';
      ctx.font = '14px sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(m.message, CW / 2, CH - 18);

      const ended = m.phase === 'won' || m.phase === 'lost' || m.phase === 'draw';
      if (paused.current && !ended) {
        ctx.fillStyle = 'rgba(8,16,12,0.55)';
        ctx.fillRect(PC_LEFT, PC_TOP, PC_RIGHT - PC_LEFT, PC_BOTTOM - PC_TOP);
        ctx.fillStyle = '#f4fff8';
        ctx.font = 'bold 36px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('暂停', PC_CX, PC_CY);
      }
      if (ended) {
        ctx.fillStyle = 'rgba(8,18,14,0.72)';
        ctx.fillRect(PC_CX - 260, PC_CY - 110, 520, 220);
        ctx.fillStyle = '#f4fff8';
        ctx.font = 'bold 28px sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'alphabetic';
        ctx.fillText(`${PC_OUR_NAME}  ${m.score[0]} – ${m.score[1]}  ${m.level.opponent}`, PC_CX, PC_CY - 50);
        ctx.fillStyle = '#e7c25a';
        ctx.font = '24px sans-serif';
        ctx.fillText('★'.repeat(m.stars) + '☆'.repeat(3 - m.stars), PC_CX, PC_CY - 10);
        ctx.fillStyle = '#c8e0d4';
        ctx.font = '16px sans-serif';
        const word = m.phase === 'won' ? '获胜' : m.phase === 'lost' ? '落败，本场未通关' : '平局';
        ctx.fillText(word + (m.level.mode === 'timed' ? ` · ${m.level.target} 秒` : ` · 先下 ${m.level.target} 球`), PC_CX, PC_CY + 28);
        ctx.font = '13px sans-serif';
        ctx.fillText(m.level.hint, PC_CX, PC_CY + 58);
      }
      if (m.phase === 'countdown') {
        ctx.fillStyle = 'rgba(8,16,12,0.35)';
        ctx.fillRect(0, 0, CW, CH);
        ctx.fillStyle = '#f4fff8';
        ctx.font = 'bold 96px sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(m.message, PC_CX, PC_CY);
      }
    };

    const loop = (t: number) => {
      const m = match.current;
      if (screen.current !== 'play' || !m) {
        drawSelect();
      } else {
        const dt = last.current ? Math.min(0.05, (t - last.current) / 1000) : 0;
        last.current = t;
        if (!paused.current) tickPc(m, dt, input.current);
        persistIfNeeded(m);
        drawPitch(m);
      }
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);

    return () => {
      cancelAnimationFrame(raf);
      c.removeEventListener('pointerdown', onClick);
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
      window.removeEventListener('blur', hide);
      document.removeEventListener('visibilitychange', hide);
      clearInput();
    };
  }, []);

  useEffect(() => {
    const id = setInterval(() => {
      if (screen.current === 'play' && match.current) sync();
    }, 200);
    return () => clearInterval(id);
  }, []);

  const playing = hud.screen === 'play';
  const ended = hud.phase === 'won' || hud.phase === 'lost' || hud.phase === 'draw';
  const canNext = ended && hud.stars >= 1 && hud.level < PC_LEVEL_COUNT && hud.level + 1 <= hud.save.unlocked;

  return (
    <Page title="小场争锋" width="wide" lang="zh-Hans" summary="俯视小场地 3v3 动作足球。你控制一名球员传球、射门和抢断，队友由简单 AI 协助。虚构球队与赛事。">
      <ImmersiveFrame
        layout="overlay"
        stageRef={stageRef}
        focusRef={canvas}
        intro={
          <p style={{ margin: 0, color: theme.text.secondary }}>
            手机可点「全屏游玩」，建议横屏。十字键移动，右侧「传」传球、「射」射门（无球时抢断）。赢且净胜两球为三星。
          </p>
        }
        hudStats={
          playing ? (
            <>
              <span>{hud.levelName}</span>
              <span>{hud.venue} vs {hud.opp}</span>
              <span>{hud.score[0]}–{hud.score[1]}</span>
              <span>{hud.mode}</span>
              <span>{phaseLabel(hud.phase, hud.paused)}</span>
            </>
          ) : (
            <span>选择场次</span>
          )
        }
        hudActions={
          playing ? (
            <>
              <Button label={hud.paused ? '继续' : '暂停'} onClick={togglePause} disabled={ended} />
              <Button label="重试" onClick={retry} />
              {canNext ? <Button label="下一场" variant="primary" onClick={nextLevel} /> : null}
              <Button label="选关" onClick={() => { screen.current = 'select'; match.current = null; clearInput(); sync(); }} />
            </>
          ) : null
        }
        hudMsg={playing ? <span>{hud.message}</span> : null}
        pad={
          <HandheldPad
            dirs={{
              left: { mode: 'hold', onDown: () => hold('left', true), onUp: () => hold('left', false), ariaLabel: '左移' },
              right: { mode: 'hold', onDown: () => hold('right', true), onUp: () => hold('right', false), ariaLabel: '右移' },
              up: { mode: 'hold', onDown: () => hold('up', true), onUp: () => hold('up', false), ariaLabel: '上移' },
              down: { mode: 'hold', onDown: () => hold('down', true), onUp: () => hold('down', false), ariaLabel: '下移' },
            }}
            actions={[
              { label: '传', ariaLabel: '传球', onDown: () => hold('pass', true), onUp: () => hold('pass', false) },
              { label: '射', ariaLabel: '射门或抢断', onDown: () => hold('shoot', true), onUp: () => hold('shoot', false) },
            ]}
          />
        }
        padOverlayOnly
        side={
          <>
            <div className="imm-default-only arcade-lvls" style={{ marginBottom: 12 }}>
              {PC_LEVELS.map((lv) => {
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
                {canNext ? <Button label="下一场" variant="primary" onClick={nextLevel} /> : null}
                <Button label="返回选关" onClick={() => { screen.current = 'select'; match.current = null; clearInput(); sync(); }} />
              </div>
            ) : (
              <p style={{ color: theme.text.secondary, fontSize: 14 }}>点场次卡片开赛。WASD 移动，空格/J 传球，K/Shift 射门。P 暂停，R 重试。</p>
            )}
          </>
        }
        help={
          <p style={{ margin: 0, color: theme.text.secondary, textAlign: 'center' }}>
            建议横屏。方向键或 WASD 移动你控制的球员（身上有「你」的标记）。空格 / J / F 传球给队友，K / L / Shift 射门；没有球时「射」是上前抢断。队友和对方都是简单 AI。限时赛结束时进球多者获胜，先下 N 球的场次先达到目标即胜。赢且净胜两球为三星，赢两星，平一星，输掉不通关。P 暂停 · R 重试 · Esc 退出全屏。切到后台会自动暂停并松开按键。
          </p>
        }
      >
        <canvas
          ref={canvas}
          width={CW}
          height={CH}
          tabIndex={0}
          aria-label="小场争锋游戏区：方向键移动，J 传球，K 射门，P 暂停，R 重试"
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
