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
  SR_H,
  SR_KINDS,
  SR_LEVELS,
  SR_LEVEL_COUNT,
  SR_MAG,
  SR_MAX_HP,
  SR_SAVE_KEY,
  SR_W,
  createSrMatch,
  reloadSr,
  shootSr,
  startSr,
  tickSr,
  type SrMatch,
} from '../rules/streetRush';

const CW = SR_W;
const CH = SR_H;

const BACK_COLOR: Record<string, [string, string]> = {
  market: ['#2b1d28', '#5a3a36'],
  pier: ['#1a2438', '#3a5570'],
  yard: ['#243026', '#4a5a3a'],
  plaza: ['#2a2434', '#5a4860'],
  alley: ['#1c1c22', '#3a3a44'],
  bridge: ['#1c2634', '#3a4860'],
};

export default function StreetRush() {
  const theme = useGrokTheme();
  const canvas = useRef<HTMLCanvasElement | null>(null);
  const stageRef = useRef<HTMLDivElement | null>(null);
  const { active: immersive } = useImmersivePlay();
  const fit = useStageFit(stageRef, CW, CH, immersive, true);
  const match = useRef<SrMatch | null>(null);
  const paused = useRef(false);
  const last = useRef(0);
  const screen = useRef<'select' | 'play'>('select');
  const saved = useRef(false);
  const keys = useRef({ left: false, right: false, up: false, down: false, fire: false });
  const saveRef = useRef<LevelSave>(loadLevelSave(SR_SAVE_KEY, SR_LEVEL_COUNT));
  const [hud, setHud] = useState({
    screen: 'select' as 'select' | 'play',
    phase: '',
    message: '',
    hp: SR_MAX_HP,
    ammo: SR_MAG,
    reloading: 0,
    segment: '',
    stars: 0,
    score: 0,
    level: 1,
    levelName: '',
    paused: false,
    save: saveRef.current,
  });

  const clearKeys = () => { keys.current = { left: false, right: false, up: false, down: false, fire: false }; };
  const sync = () => {
    const m = match.current;
    setHud({
      screen: screen.current,
      phase: m?.phase ?? '',
      message: m?.message ?? '',
      hp: m?.hp ?? SR_MAX_HP,
      ammo: m?.ammo ?? SR_MAG,
      reloading: m?.reloading ?? 0,
      segment: m ? m.level.segments[m.segment]?.name ?? '' : '',
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
    const m = createSrMatch(id);
    startSr(m);
    match.current = m;
    screen.current = 'play';
    paused.current = false;
    saved.current = false;
    clearKeys();
    last.current = 0;
    sync();
    canvas.current?.focus();
  };
  const retry = () => { if (match.current) openLevel(match.current.level.id); };
  const nextLevel = () => {
    const m = match.current;
    if (!m) return;
    const n = Math.min(SR_LEVEL_COUNT, m.level.id + 1);
    if (n <= saveRef.current.unlocked) openLevel(n);
    else { screen.current = 'select'; match.current = null; sync(); }
  };
  const togglePause = () => {
    const m = match.current;
    if (!m || screen.current !== 'play' || m.phase !== 'play') return;
    paused.current = !paused.current;
    last.current = 0;
    clearKeys();
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
        const col = Math.floor((p.x - 40) / 200);
        const row = Math.floor((p.y - 120) / 100);
        const x0 = 40 + col * 200, y0 = 120 + row * 100;
        const id = row * 4 + col + 1;
        if (col >= 0 && col < 4 && row >= 0 && id >= 1 && id <= SR_LEVEL_COUNT && p.x <= x0 + 188 && p.y <= y0 + 86) openLevel(id);
        return;
      }
      const m = match.current;
      if (!m || paused.current || m.phase !== 'play') return;
      // 右下角换弹按钮
      if (p.x > CW - 130 && p.y > CH - 70) { reloadSr(m); sync(); return; }
      shootSr(m, p.x, p.y);
      sync();
    };
    const onMove = (e: PointerEvent) => {
      const m = match.current;
      if (!m || m.phase !== 'play') return;
      const p = logical(e);
      m.reticle.x = p.x;
      m.reticle.y = p.y;
    };
    const onUp = (e: PointerEvent) => {
      e.preventDefault();
      try { c.releasePointerCapture(e.pointerId); } catch { /* */ }
    };
    const onCancel = (e: PointerEvent) => {
      e.preventDefault();
      try { c.releasePointerCapture(e.pointerId); } catch { /* */ }
    };
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'KeyP') { e.preventDefault(); togglePause(); }
      if (e.code === 'KeyR' && !e.repeat) {
        e.preventDefault();
        if (e.shiftKey) retry();
        else if (match.current) { reloadSr(match.current); sync(); }
      }
      if (e.code === 'ArrowLeft' || e.code === 'KeyA') { e.preventDefault(); keys.current.left = true; }
      if (e.code === 'ArrowRight' || e.code === 'KeyD') { e.preventDefault(); keys.current.right = true; }
      if (e.code === 'ArrowUp' || e.code === 'KeyW') { e.preventDefault(); keys.current.up = true; }
      if (e.code === 'ArrowDown' || e.code === 'KeyS') { e.preventDefault(); keys.current.down = true; }
      if ((e.code === 'Space' || e.code === 'KeyJ' || e.code === 'KeyK') && !e.repeat) {
        e.preventDefault();
        keys.current.fire = true;
        const m = match.current;
        if (m && m.phase === 'play' && !paused.current) shootSr(m, m.reticle.x, m.reticle.y);
      }
    };
    const onKeyUp = (e: KeyboardEvent) => {
      if (e.code === 'ArrowLeft' || e.code === 'KeyA') keys.current.left = false;
      if (e.code === 'ArrowRight' || e.code === 'KeyD') keys.current.right = false;
      if (e.code === 'ArrowUp' || e.code === 'KeyW') keys.current.up = false;
      if (e.code === 'ArrowDown' || e.code === 'KeyS') keys.current.down = false;
      if (e.code === 'Space' || e.code === 'KeyJ' || e.code === 'KeyK') keys.current.fire = false;
    };
    const blur = () => {
      clearKeys();
      const m = match.current;
      if (screen.current === 'play' && m && m.phase === 'play') {
        paused.current = true;
        last.current = 0;
        sync();
      }
    };
    const hide = () => { if (document.hidden) blur(); };
    c.addEventListener('pointerdown', onDown);
    c.addEventListener('pointermove', onMove);
    c.addEventListener('pointerup', onUp);
    c.addEventListener('pointercancel', onCancel);
    c.addEventListener('lostpointercapture', onCancel);
    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);
    window.addEventListener('blur', blur);
    document.addEventListener('visibilitychange', hide);

    const drawSelect = () => {
      ctx.fillStyle = '#1a1520';
      ctx.fillRect(0, 0, CW, CH);
      ctx.fillStyle = '#f0e6d8';
      ctx.font = 'bold 32px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('街区突围', CW / 2, 58);
      ctx.font = '15px sans-serif';
      ctx.fillStyle = '#c8b8a8';
      ctx.fillText('镜头分段推进，瞄准预警后开火。虚构夜色街区。', CW / 2, 88);
      SR_LEVELS.forEach((lv, i) => {
        const col = i % 4, row = Math.floor(i / 4);
        const x = 40 + col * 200, y = 120 + row * 100;
        const locked = lv.id > saveRef.current.unlocked;
        ctx.fillStyle = locked ? '#2a2430' : '#3a3044';
        ctx.beginPath(); ctx.roundRect(x, y, 188, 86, 10); ctx.fill();
        ctx.fillStyle = '#f0e6d8';
        ctx.font = 'bold 16px sans-serif';
        ctx.textAlign = 'left';
        ctx.fillText((locked ? '锁定  ' : '') + lv.id + '  ' + lv.name, x + 12, y + 32);
        const stars = saveRef.current.stars[i] ?? 0;
        ctx.fillStyle = '#e7c25a';
        ctx.font = '13px sans-serif';
        ctx.fillText(stars ? '★'.repeat(stars) + '☆'.repeat(3 - stars) : locked ? '先通过上一关' : '尚未挑战', x + 12, y + 60);
      });
    };

    const drawPlay = (m: SrMatch) => {
      const seg = m.level.segments[m.segment];
      const [a, b] = BACK_COLOR[seg?.backdrop ?? 'alley'];
      const g = ctx.createLinearGradient(0, 0, 0, CH);
      g.addColorStop(0, a);
      g.addColorStop(1, b);
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, CW, CH);
      // stylized scenery
      ctx.fillStyle = '#0004';
      for (let i = 0; i < 6; i++) {
        const x = 80 + i * 130 + (m.time * 20 + m.segment * 40) % 30;
        ctx.fillRect(x, 80, 90, 280);
        ctx.fillStyle = '#ffd27a22';
        ctx.fillRect(x + 16, 110, 20, 28);
        ctx.fillStyle = '#0004';
      }
      ctx.fillStyle = '#0005';
      ctx.fillRect(0, CH - 80, CW, 80);
      for (const e of m.enemies) {
        if (e.phase === 'dead') continue;
        const def = SR_KINDS[e.kind];
        const alpha = e.hiding ? 0.28 : e.phase === 'inbound' ? 0.45 : 1;
        ctx.globalAlpha = alpha;
        if (e.phase === 'telegraph' || e.priority) {
          ctx.strokeStyle = e.priority ? '#ff5a4a' : '#ffd27a';
          ctx.lineWidth = 3;
          ctx.beginPath();
          ctx.arc(e.x, e.y, e.radius + 10 + Math.sin(m.time * 10) * 3, 0, Math.PI * 2);
          ctx.stroke();
        }
        ctx.fillStyle = def.color;
        ctx.beginPath();
        ctx.arc(e.x, e.y, e.radius, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#fff';
        ctx.font = 'bold 12px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(def.name, e.x, e.y + 4);
        if (e.priority) {
          ctx.fillStyle = '#ff5a4a';
          ctx.fillText('!', e.x, e.y - e.radius - 8);
        }
        ctx.fillStyle = '#0008';
        ctx.fillRect(e.x - 18, e.y + e.radius + 4, 36, 4);
        ctx.fillStyle = '#8fde7a';
        ctx.fillRect(e.x - 18, e.y + e.radius + 4, 36 * (e.hp / e.maxHp), 4);
        ctx.globalAlpha = 1;
      }
      for (const t of m.traces) {
        ctx.strokeStyle = t.hit ? '#ffe29a' : '#ffffff55';
        ctx.globalAlpha = Math.max(0, t.life * 8);
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(t.x1, t.y1);
        ctx.lineTo(t.x2, t.y2);
        ctx.stroke();
        ctx.globalAlpha = 1;
      }
      // reticle
      ctx.strokeStyle = '#f0e6d8';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(m.reticle.x, m.reticle.y, 14, 0, Math.PI * 2);
      ctx.moveTo(m.reticle.x - 22, m.reticle.y);
      ctx.lineTo(m.reticle.x - 6, m.reticle.y);
      ctx.moveTo(m.reticle.x + 6, m.reticle.y);
      ctx.lineTo(m.reticle.x + 22, m.reticle.y);
      ctx.moveTo(m.reticle.x, m.reticle.y - 22);
      ctx.lineTo(m.reticle.x, m.reticle.y - 6);
      ctx.moveTo(m.reticle.x, m.reticle.y + 6);
      ctx.lineTo(m.reticle.x, m.reticle.y + 22);
      ctx.stroke();
      // HUD
      ctx.fillStyle = '#f0e6d8';
      ctx.font = 'bold 18px sans-serif';
      ctx.textAlign = 'left';
      ctx.fillText(m.level.id + '  ' + m.level.name + '  ·  ' + (seg?.name ?? ''), 16, 30);
      ctx.font = '14px sans-serif';
      ctx.fillText('生命 ' + m.hp + '    击破 ' + m.defeated + '/' + m.totalEnemies, 16, 52);
      ctx.fillStyle = '#3a2030';
      ctx.fillRect(16, 62, 200, 8);
      ctx.fillStyle = m.hp < 30 ? '#ef6a6a' : '#7ad0a0';
      ctx.fillRect(16, 62, 200 * (m.hp / SR_MAX_HP), 8);
      // ammo
      ctx.fillStyle = '#1a1520cc';
      ctx.beginPath();
      ctx.roundRect(CW - 150, CH - 72, 134, 56, 8);
      ctx.fill();
      ctx.fillStyle = '#f0e6d8';
      ctx.font = 'bold 16px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(m.reloading > 0 ? '换弹 ' + m.reloading.toFixed(1) + 's' : '弹匣 ' + m.ammo + '/' + SR_MAG, CW - 83, CH - 40);
      ctx.font = '11px sans-serif';
      ctx.fillText('点此或按 R 换弹', CW - 83, CH - 22);
      ctx.fillStyle = '#c8b8a8';
      ctx.font = '13px sans-serif';
      ctx.fillText(m.message, CW / 2, CH - 86);
      if (paused.current && m.phase === 'play') {
        ctx.fillStyle = '#1a1520cc';
        ctx.fillRect(0, 0, CW, CH);
        ctx.fillStyle = '#f0e6d8';
        ctx.font = 'bold 32px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('已暂停', CW / 2, 230);
        ctx.font = '16px sans-serif';
        ctx.fillText('切回后点「继续」或按 P', CW / 2, 270);
      }
      if (m.phase === 'won' || m.phase === 'lost') {
        ctx.fillStyle = '#1a1520d4';
        ctx.fillRect(0, 0, CW, CH);
        ctx.fillStyle = '#f0e6d8';
        ctx.font = 'bold 32px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(m.phase === 'won' ? '街区突围成功' : '你被击退了', CW / 2, 210);
        ctx.font = '18px sans-serif';
        ctx.fillText(m.phase === 'won' ? '★'.repeat(m.stars) + '  生命 ' + m.hp + '  得分 ' + m.score : '观察预警再开火，注意换弹', CW / 2, 254);
      }
    };

    const frame = (t: number) => {
      const dt = last.current ? Math.min(0.05, (t - last.current) / 1000) : 0;
      last.current = t;
      const m = match.current;
      if (screen.current === 'select') drawSelect();
      else if (m) {
        if (!paused.current && m.phase === 'play') {
          const k = keys.current;
          const sp = 280 * dt;
          if (k.left) m.reticle.x -= sp;
          if (k.right) m.reticle.x += sp;
          if (k.up) m.reticle.y -= sp;
          if (k.down) m.reticle.y += sp;
          m.reticle.x = Math.max(20, Math.min(CW - 20, m.reticle.x));
          m.reticle.y = Math.max(20, Math.min(CH - 20, m.reticle.y));
          tickSr(m, dt);
        }
        if (m.phase === 'won' && !saved.current) {
          saveRef.current = applyLevelClear(saveRef.current, m.level.id - 1, m.stars, m.score, SR_LEVEL_COUNT);
          writeLevelSave(SR_SAVE_KEY, saveRef.current);
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
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
      window.removeEventListener('blur', blur);
      document.removeEventListener('visibilitychange', hide);
      clearKeys();
    };
  }, []);

  const playing = hud.screen === 'play';
  const ended = hud.phase === 'won' || hud.phase === 'lost';

  return (
    <Page title="街区突围" width="wide" lang="zh-Hans" summary="镜头分段推进，瞄准预警中的对手开火。虚构夜色街区，不涉及真实历史。">
      <ImmersiveFrame
        layout="banded"
        stageRef={stageRef}
        focusRef={canvas}
        intro={<p style={{ margin: 0, color: theme.text.secondary }}>手机可点「全屏游玩」。点画面射击，右下角换弹。不强加方向键。带红标和闪圈的是优先目标。</p>}
        hudStats={playing ? (<><span>{hud.levelName}</span><span>{hud.segment}</span><span>生命 {hud.hp}</span><span>{hud.reloading > 0 ? '换弹中' : '弹匣 ' + hud.ammo + '/' + SR_MAG}</span><span>{hud.paused ? '已暂停' : hud.phase === 'won' ? '突围' : hud.phase === 'lost' ? '击退' : '进行中'}</span></>) : <span>选择关卡</span>}
        hudActions={playing ? (<><Button label={hud.paused ? '继续' : '暂停'} onClick={togglePause} disabled={ended} /><Button label="换弹" onClick={() => { if (match.current) reloadSr(match.current); }} /><Button label="重试" onClick={retry} />{hud.phase === 'won' ? <Button label="下一关" variant="primary" onClick={nextLevel} /> : null}<Button label="选关" onClick={() => { screen.current = 'select'; match.current = null; sync(); }} /></>) : null}
        hudMsg={playing ? <span>{hud.message}</span> : null}
        side={
          <>
            <div className="imm-default-only arcade-lvls" style={{ marginBottom: 12 }}>
              {SR_LEVELS.map((lv) => {
                const locked = lv.id > hud.save.unlocked;
                const stars = hud.save.stars[lv.id - 1] ?? 0;
                return <Button key={lv.id} label={lv.id + ' ' + lv.name + (stars ? ' ' + '★'.repeat(stars) : locked ? ' 锁定' : '')} disabled={locked} onClick={() => openLevel(lv.id)} />;
              })}
            </div>
            {playing ? (
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }}>
                <Button label={hud.paused ? '继续' : '暂停'} onClick={togglePause} disabled={ended} />
                <Button label="换弹" onClick={() => { if (match.current) reloadSr(match.current); }} />
                <Button label="重新开始" onClick={retry} />
                {hud.phase === 'won' ? <Button label="下一关" variant="primary" onClick={nextLevel} /> : null}
                <Button label="返回选关" onClick={() => { screen.current = 'select'; match.current = null; sync(); }} />
              </div>
            ) : <p style={{ color: theme.text.secondary, fontSize: 14 }}>点画面射击，R 换弹，方向键移动准星，空格开火。P 暂停，Shift+R 重试。</p>}
          </>
        }
        help={<p style={{ margin: 0, color: theme.text.secondary, textAlign: 'center' }}>点或轻触射击，拖动移动准星。右下角或 R 换弹；空格 / J 开火；方向键或 WASD 移动准星。黄色圈是预警，红标是优先目标，持盾者缩回时打不中。P 暂停 · Esc 退出全屏。切到后台会自动暂停。</p>}
      >
        <canvas ref={canvas} width={CW} height={CH} tabIndex={0} aria-label="街区突围游戏区：点画面射击，R 换弹，P 暂停" style={immersive ? { width: fit.width, height: fit.height, maxWidth: 'none', display: 'block', borderRadius: 12, touchAction: 'none', outlineColor: theme.border.focus } : { width: '100%', maxWidth: CW, height: 'auto', display: 'block', borderRadius: 12, touchAction: 'none', outlineColor: theme.border.focus }} />
      </ImmersiveFrame>
    </Page>
  );
}
