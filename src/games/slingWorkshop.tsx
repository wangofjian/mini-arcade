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
  SP_GROUND,
  SP_HEIGHT,
  SP_SLING,
  SP_WIDTH,
  launchVelocity,
  previewTrajectory,
  type SpBody,
} from '../rules/slingPhysics';
import {
  SW_LEVELS,
  SW_LEVEL_COUNT,
  SW_SAVE_KEY,
  ammoLeft,
  aimPreview,
  createSwMatch,
  currentShot,
  fireSw,
  tickSw,
  type SwMatch,
} from '../rules/slingWorkshop';

const CW = SP_WIDTH;
const CH = SP_HEIGHT;

const MAT_COLOR: Record<string, string> = {
  wood: '#b8874a',
  glass: '#9fd7e6',
  stone: '#7c8490',
  ceramic: '#d2654a',
  cork: '#e6c27a',
  iron: '#8a93a0',
  rubber: '#6cbf8e',
  ground: '#3d4a3c',
};

function drawBody(ctx: CanvasRenderingContext2D, b: SpBody) {
  ctx.save();
  ctx.translate(b.x, b.y);
  ctx.rotate(b.angle);
  ctx.fillStyle = MAT_COLOR[b.material] ?? '#ccc';
  if (b.isTarget) {
    ctx.beginPath();
    ctx.arc(0, 0, b.radius, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#f4e2c1';
    ctx.beginPath();
    ctx.arc(0, -2, b.radius * 0.45, 0, Math.PI * 2);
    ctx.fill();
  } else if (b.shape === 'circle') {
    ctx.beginPath();
    ctx.arc(0, 0, b.radius, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#0003';
    ctx.stroke();
  } else if (!b.static) {
    ctx.fillRect(-b.hw, -b.hh, b.hw * 2, b.hh * 2);
    if (b.hp < b.maxHp) {
      ctx.fillStyle = '#0004';
      ctx.fillRect(-b.hw, -b.hh, b.hw * 2, 4);
      ctx.fillStyle = '#fff8';
      ctx.fillRect(-b.hw, -b.hh, b.hw * 2 * (b.hp / b.maxHp), 4);
    }
  }
  ctx.restore();
}

export default function SlingWorkshop() {
  const theme = useGrokTheme();
  const canvas = useRef<HTMLCanvasElement | null>(null);
  const stageRef = useRef<HTMLDivElement | null>(null);
  const { active: immersive } = useImmersivePlay();
  const fit = useStageFit(stageRef, CW, CH, immersive, true);
  const match = useRef<SwMatch | null>(null);
  const paused = useRef(false);
  const last = useRef(0);
  const screen = useRef<'select' | 'play'>('select');
  const pulling = useRef(false);
  const pull = useRef({ x: 0, y: 0 });
  const saved = useRef(false);
  const saveRef = useRef<LevelSave>(loadLevelSave(SW_SAVE_KEY, SW_LEVEL_COUNT));
  const [hud, setHud] = useState({
    screen: 'select' as 'select' | 'play',
    phase: '',
    message: '',
    ammo: '',
    stars: 0,
    score: 0,
    level: 1,
    levelName: '',
    paused: false,
    save: saveRef.current,
  });

  const sync = () => {
    const m = match.current;
    const shot = m ? currentShot(m) : null;
    const left = m ? ammoLeft(m) : 0;
    setHud({
      screen: screen.current,
      phase: m?.phase ?? '',
      message: m?.message ?? '',
      ammo: shot ? shot + '  剩余 ' + left : '剩余 ' + left,
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
    match.current = createSwMatch(id);
    screen.current = 'play';
    paused.current = false;
    saved.current = false;
    pulling.current = false;
    last.current = 0;
    sync();
    canvas.current?.focus();
  };
  const retry = () => { if (match.current) openLevel(match.current.level.id); };
  const nextLevel = () => {
    const m = match.current;
    if (!m) return;
    const n = Math.min(SW_LEVEL_COUNT, m.level.id + 1);
    if (n <= saveRef.current.unlocked) openLevel(n);
    else { screen.current = 'select'; match.current = null; sync(); }
  };
  const togglePause = () => {
    const m = match.current;
    if (!m || screen.current !== 'play' || m.phase === 'won' || m.phase === 'lost') return;
    paused.current = !paused.current;
    last.current = 0;
    pulling.current = false;
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
      try { c.setPointerCapture(e.pointerId); } catch { /* */ }
      const p = logical(e);
      if (screen.current === 'select') {
        const col = Math.floor((p.x - 40) / 230);
        const row = Math.floor((p.y - 120) / 110);
        const x0 = 40 + col * 230, y0 = 120 + row * 110;
        const id = row * 4 + col + 1;
        if (col >= 0 && col < 4 && row >= 0 && id >= 1 && id <= SW_LEVEL_COUNT && p.x <= x0 + 214 && p.y <= y0 + 94) openLevel(id);
        return;
      }
      const m = match.current;
      if (!m || paused.current || m.phase !== 'aim') return;
      pulling.current = true;
      pull.current = { x: p.x - SP_SLING.x, y: p.y - SP_SLING.y };
    };
    const onMove = (e: PointerEvent) => {
      if (!pulling.current) return;
      const p = logical(e);
      pull.current = { x: p.x - SP_SLING.x, y: p.y - SP_SLING.y };
    };
    const onUp = (e: PointerEvent) => {
      e.preventDefault();
      try { c.releasePointerCapture(e.pointerId); } catch { /* */ }
      if (!pulling.current) return;
      pulling.current = false;
      const m = match.current;
      if (m && m.phase === 'aim' && !paused.current) {
        fireSw(m, pull.current.x, pull.current.y);
        sync();
      }
    };
    const onCancel = (e: PointerEvent) => {
      e.preventDefault();
      pulling.current = false;
      try { c.releasePointerCapture(e.pointerId); } catch { /* */ }
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.code === 'KeyP') { e.preventDefault(); togglePause(); }
      if (e.code === 'KeyR' && !e.repeat) { e.preventDefault(); retry(); }
    };
    const hide = () => {
      const m = match.current;
      if (document.hidden && screen.current === 'play' && m && m.phase !== 'won' && m.phase !== 'lost') {
        paused.current = true;
        pulling.current = false;
        last.current = 0;
        sync();
      }
    };
    c.addEventListener('pointerdown', onDown);
    c.addEventListener('pointermove', onMove);
    c.addEventListener('pointerup', onUp);
    c.addEventListener('pointercancel', onCancel);
    c.addEventListener('lostpointercapture', onCancel);
    window.addEventListener('keydown', onKey);
    document.addEventListener('visibilitychange', hide);

    const sky = () => {
      const g = ctx.createLinearGradient(0, 0, 0, CH);
      g.addColorStop(0, '#8ec6e0');
      g.addColorStop(1, '#efe4c8');
      return g;
    };

    const drawSelect = () => {
      ctx.fillStyle = sky();
      ctx.fillRect(0, 0, CW, CH);
      ctx.fillStyle = '#2b2a28';
      ctx.font = 'bold 32px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('弹射工坊', CW / 2, 58);
      ctx.font = '15px sans-serif';
      ctx.fillStyle = '#3d3a36';
      ctx.fillText('拉弓弹射，打落全部陶罐。玻璃易碎，石头更硬，铁珠更沉。', CW / 2, 88);
      SW_LEVELS.forEach((lv, i) => {
        const col = i % 4, row = Math.floor(i / 4);
        const x = 40 + col * 230, y = 120 + row * 110;
        const locked = lv.id > saveRef.current.unlocked;
        ctx.fillStyle = locked ? '#cfc6b4' : '#f7f0e0';
        ctx.beginPath(); ctx.roundRect(x, y, 214, 94, 10); ctx.fill();
        ctx.fillStyle = '#2b2a28';
        ctx.font = 'bold 16px sans-serif';
        ctx.textAlign = 'left';
        ctx.fillText((locked ? '锁定  ' : '') + lv.id + '  ' + lv.name, x + 14, y + 34);
        const stars = saveRef.current.stars[i] ?? 0;
        ctx.fillStyle = '#c47a2a';
        ctx.font = '14px sans-serif';
        ctx.fillText(stars ? '★'.repeat(stars) + '☆'.repeat(3 - stars) : locked ? '先通过上一关' : '尚未挑战', x + 14, y + 64);
      });
    };

    const drawPlay = (m: SwMatch) => {
      ctx.fillStyle = sky();
      ctx.fillRect(0, 0, CW, CH);
      ctx.fillStyle = '#6a8f4e';
      ctx.fillRect(0, SP_GROUND, CW, CH - SP_GROUND);
      ctx.fillStyle = '#4f6d3b';
      ctx.fillRect(0, SP_GROUND, CW, 6);
      // sling
      ctx.strokeStyle = '#5a4030';
      ctx.lineWidth = 8;
      ctx.beginPath();
      ctx.moveTo(SP_SLING.x - 28, SP_SLING.y + 50);
      ctx.lineTo(SP_SLING.x, SP_SLING.y);
      ctx.lineTo(SP_SLING.x + 28, SP_SLING.y + 50);
      ctx.stroke();
      for (const b of m.world.bodies) {
        if (b.static && b.material === 'ground') continue;
        drawBody(ctx, b);
      }
      if (m.phase === 'aim' && pulling.current) {
        const v = launchVelocity(pull.current.x, pull.current.y);
        const pts = previewTrajectory(SP_SLING.x, SP_SLING.y, v.vx, v.vy);
        ctx.fillStyle = '#2b2a28';
        pts.forEach((pt, i) => {
          ctx.globalAlpha = 1 - i / pts.length;
          ctx.beginPath();
          ctx.arc(pt.x, pt.y, 3.2, 0, Math.PI * 2);
          ctx.fill();
        });
        ctx.globalAlpha = 1;
        ctx.strokeStyle = '#5a4030';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(SP_SLING.x, SP_SLING.y);
        ctx.lineTo(SP_SLING.x + pull.current.x, SP_SLING.y + pull.current.y);
        ctx.stroke();
        const shot = currentShot(m);
        if (shot) {
          ctx.fillStyle = MAT_COLOR[shot];
          ctx.beginPath();
          const d = Math.min(Math.hypot(pull.current.x, pull.current.y), 130);
          const ang = Math.atan2(pull.current.y, pull.current.x);
          ctx.arc(SP_SLING.x + Math.cos(ang) * d, SP_SLING.y + Math.sin(ang) * d, 15, 0, Math.PI * 2);
          ctx.fill();
        }
      } else if (m.phase === 'aim') {
        const shot = currentShot(m);
        if (shot) {
          ctx.fillStyle = MAT_COLOR[shot];
          ctx.beginPath();
          ctx.arc(SP_SLING.x, SP_SLING.y, 15, 0, Math.PI * 2);
          ctx.fill();
        }
      }
      ctx.fillStyle = '#2b2a28';
      ctx.font = 'bold 20px sans-serif';
      ctx.textAlign = 'left';
      ctx.fillText(m.level.id + '  ' + m.level.name, 20, 34);
      ctx.font = '15px sans-serif';
      ctx.fillText('弹药 ' + ammoLeft(m) + (currentShot(m) ? '  本发 ' + (currentShot(m) === 'iron' ? '铁珠' : currentShot(m) === 'rubber' ? '弹力球' : '软木球') : ''), 20, 58);
      ctx.textAlign = 'right';
      ctx.fillText(m.message, CW - 20, 34);
      if (paused.current && m.phase !== 'won' && m.phase !== 'lost') {
        ctx.fillStyle = '#2b2a28cc';
        ctx.fillRect(0, 0, CW, CH);
        ctx.fillStyle = '#f7f0e0';
        ctx.font = 'bold 32px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('已暂停', CW / 2, 260);
        ctx.font = '16px sans-serif';
        ctx.fillText('点「继续」或按 P', CW / 2, 300);
      }
      if (m.phase === 'won' || m.phase === 'lost') {
        ctx.fillStyle = '#2b2a28d0';
        ctx.fillRect(0, 0, CW, CH);
        ctx.fillStyle = '#f7f0e0';
        ctx.font = 'bold 32px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(m.phase === 'won' ? '陶罐全部打落' : '弹药用尽了', CW / 2, 230);
        ctx.font = '18px sans-serif';
        ctx.fillText(m.phase === 'won' ? '★'.repeat(m.stars) + '  得分 ' + m.score : '再试一次，留意抛物线', CW / 2, 274);
      }
    };

    const frame = (t: number) => {
      const dt = last.current ? Math.min(0.05, (t - last.current) / 1000) : 0;
      last.current = t;
      if (screen.current === 'select') drawSelect();
      else if (match.current) {
        if (!paused.current) tickSw(match.current, dt);
        const m = match.current;
        if (m.phase === 'won' && !saved.current) {
          saveRef.current = applyLevelClear(saveRef.current, m.level.id - 1, m.stars, m.score, SW_LEVEL_COUNT);
          writeLevelSave(SW_SAVE_KEY, saveRef.current);
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
      c.removeEventListener('pointerdown', onDown);
      c.removeEventListener('pointermove', onMove);
      c.removeEventListener('pointerup', onUp);
      c.removeEventListener('pointercancel', onCancel);
      c.removeEventListener('lostpointercapture', onCancel);
      window.removeEventListener('keydown', onKey);
      document.removeEventListener('visibilitychange', hide);
    };
  }, []);

  const playing = hud.screen === 'play';
  const ended = hud.phase === 'won' || hud.phase === 'lost';
  void aimPreview;

  return (
    <Page title="弹射工坊" width="wide" lang="zh-Hans" summary="向后拉开弹弓，沿抛物线打落陶罐。玻璃、木头和石头耐打程度不同。">
      <ImmersiveFrame
        layout="banded"
        stageRef={stageRef}
        focusRef={canvas}
        intro={<p style={{ margin: 0, color: theme.text.secondary }}>手机可点「全屏游玩」。在弹弓附近按下并向后拖动，松开即发射。不强加方向键。</p>}
        hudStats={playing ? (<><span>{hud.levelName}</span><span>{hud.ammo}</span><span>{hud.paused ? '已暂停' : hud.phase === 'aim' ? '瞄准' : hud.phase === 'fly' ? '飞行中' : hud.phase === 'won' ? '胜利' : '结束'}</span></>) : <span>选择关卡</span>}
        hudActions={playing ? (<><Button label={hud.paused ? '继续' : '暂停'} onClick={togglePause} disabled={ended} /><Button label="重试" onClick={retry} />{hud.phase === 'won' ? <Button label="下一关" variant="primary" onClick={nextLevel} /> : null}<Button label="选关" onClick={() => { screen.current = 'select'; match.current = null; sync(); }} /></>) : null}
        hudMsg={playing ? <span>{hud.message}</span> : null}
        side={
          <>
            <div className="imm-default-only arcade-lvls" style={{ marginBottom: 12 }}>
              {SW_LEVELS.map((lv) => {
                const locked = lv.id > hud.save.unlocked;
                const stars = hud.save.stars[lv.id - 1] ?? 0;
                return (
                  <Button key={lv.id} label={lv.id + ' ' + lv.name + (stars ? ' ' + '★'.repeat(stars) : locked ? ' 锁定' : '')} disabled={locked} onClick={() => openLevel(lv.id)} />
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
            ) : <p style={{ color: theme.text.secondary, fontSize: 14 }}>拖动弹弓拉开，松开发射。剩余弹药越多星级越高。P 暂停，R 重试。</p>}
          </>
        }
        help={<p style={{ margin: 0, color: theme.text.secondary, textAlign: 'center' }}>按住弹弓向后拉，虚线是抛物线预览，松开发射。软木球通用，铁珠更沉适合打石头，弹力球更会弹跳。打掉支撑，上面的罐子会掉下来。P 暂停 · R 重试 · Esc 退出全屏。切到后台会自动暂停。</p>}
      >
        <canvas ref={canvas} width={CW} height={CH} tabIndex={0} aria-label="弹射工坊游戏区：拖动弹弓拉开放开射击，P 暂停，R 重试" style={immersive ? { width: fit.width, height: fit.height, maxWidth: 'none', display: 'block', borderRadius: 12, touchAction: 'none', outlineColor: theme.border.focus } : { width: '100%', maxWidth: CW, height: 'auto', display: 'block', borderRadius: 12, touchAction: 'none', outlineColor: theme.border.focus }} />
      </ImmersiveFrame>
    </Page>
  );
}
