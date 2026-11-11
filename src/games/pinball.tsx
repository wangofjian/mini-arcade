import {
  Page,
  Section,
  Text,
  Button,
  useState,
  useEffect,
  useCallback,
  useRef,
  useGrokTheme,
  type CSSProperties,
  type PointerEvent
} from '../compat/grok-canvas';

const W = 360;
const H = 640;
const BR = 7.5;
const GRAVITY = 0.16;
const DAMP = 0.997;
const MAX_SPEED = 16;
const BALLS = 3;
const FLIP_LEN = 70;
const FLIP_REST = 0.42;
const FLIP_UP = -0.62;
const L_PIVOT = { x: 78, y: 575 };
const R_PIVOT = { x: 242, y: 575 };

type Seg = { x1: number; y1: number; x2: number; y2: number; bounce: number; kick: number; score: number; gate?: boolean };
type Bumper = { x: number; y: number; r: number; score: number; flash: number };
type Ball = { x: number; y: number; vx: number; vy: number };

function hypot(x: number, y: number): number {
  return Math.sqrt(x * x + y * y);
}

function clamp(v: number, a: number, b: number): number {
  return v < a ? a : v > b ? b : v;
}

function makeWalls(): Seg[] {
  const b = 0.62;
  const walls: Seg[] = [
    { x1: 22, y1: 100, x2: 22, y2: 520, bounce: b, kick: 0, score: 0 },
    { x1: 22, y1: 100, x2: 70, y2: 28, bounce: b, kick: 0, score: 0 },
    { x1: 70, y1: 28, x2: 180, y2: 16, bounce: b, kick: 0, score: 0 },
    { x1: 180, y1: 16, x2: 290, y2: 28, bounce: b, kick: 0, score: 0 },
    { x1: 290, y1: 28, x2: 338, y2: 100, bounce: b, kick: 0, score: 0 },
    { x1: 338, y1: 100, x2: 338, y2: 620, bounce: b, kick: 0, score: 0 },
    { x1: 306, y1: 100, x2: 306, y2: 600, bounce: b, kick: 0, score: 0 },
    { x1: 306, y1: 600, x2: 338, y2: 600, bounce: 0.35, kick: 0, score: 0 },
    { x1: 306, y1: 100, x2: 328, y2: 130, bounce: 0.5, kick: 0, score: 0, gate: true },
    { x1: 22, y1: 520, x2: 70, y2: 575, bounce: 0.55, kick: 0, score: 0 },
    { x1: 250, y1: 575, x2: 306, y2: 520, bounce: 0.55, kick: 0, score: 0 },
    { x1: 48, y1: 490, x2: 92, y2: 548, bounce: 0.7, kick: 7, score: 25 },
    { x1: 228, y1: 548, x2: 272, y2: 490, bounce: 0.7, kick: 7, score: 25 },
    { x1: 40, y1: 220, x2: 70, y2: 70, bounce: b, kick: 0, score: 0 },
    { x1: 250, y1: 70, x2: 290, y2: 200, bounce: b, kick: 0, score: 0 },
  ];
  return walls;
}

function makeBumpers(): Bumper[] {
  return [
    { x: 120, y: 200, r: 20, score: 100, flash: 0 },
    { x: 200, y: 175, r: 20, score: 100, flash: 0 },
    { x: 160, y: 265, r: 18, score: 150, flash: 0 },
    { x: 90, y: 330, r: 12, score: 50, flash: 0 },
    { x: 230, y: 330, r: 12, score: 50, flash: 0 },
  ];
}

function collideSeg(ball: Ball, seg: Seg, extraVx: number, extraVy: number): number {
  const dx = seg.x2 - seg.x1;
  const dy = seg.y2 - seg.y1;
  const len2 = dx * dx + dy * dy;
  if (len2 < 0.001) return 0;
  let t = ((ball.x - seg.x1) * dx + (ball.y - seg.y1) * dy) / len2;
  t = clamp(t, 0, 1);
  const px = seg.x1 + t * dx;
  const py = seg.y1 + t * dy;
  let nx = ball.x - px;
  let ny = ball.y - py;
  const dist = hypot(nx, ny);
  if (dist >= BR || dist < 0.0001) return 0;
  if (seg.gate && ball.vx <= 0) return 0;
  nx /= dist;
  ny /= dist;
  ball.x = px + nx * BR;
  ball.y = py + ny * BR;
  const vn = ball.vx * nx + ball.vy * ny;
  if (vn < 0) {
    ball.vx -= (1 + seg.bounce) * vn * nx;
    ball.vy -= (1 + seg.bounce) * vn * ny;
  }
  ball.vx += nx * seg.kick + extraVx;
  ball.vy += ny * seg.kick + extraVy;
  return seg.score;
}

function collideBumper(ball: Ball, bumper: Bumper): number {
  const dx = ball.x - bumper.x;
  const dy = ball.y - bumper.y;
  const dist = hypot(dx, dy);
  const min = BR + bumper.r;
  if (dist >= min || dist < 0.0001) return 0;
  const nx = dx / dist;
  const ny = dy / dist;
  ball.x = bumper.x + nx * min;
  ball.y = bumper.y + ny * min;
  const vn = ball.vx * nx + ball.vy * ny;
  if (vn < 0) {
    ball.vx -= (1 + 1.15) * vn * nx;
    ball.vy -= (1 + 1.15) * vn * ny;
  }
  ball.vx += nx * 5;
  ball.vy += ny * 5;
  bumper.flash = 8;
  return bumper.score;
}

function flipperTip(pivot: { x: number; y: number }, ang: number): { x: number; y: number } {
  return { x: pivot.x + Math.cos(ang) * FLIP_LEN, y: pivot.y + Math.sin(ang) * FLIP_LEN };
}

function capSpeed(ball: Ball) {
  const s = hypot(ball.vx, ball.vy);
  if (s > MAX_SPEED) {
    ball.vx *= MAX_SPEED / s;
    ball.vy *= MAX_SPEED / s;
  }
}

function plungerBall(): Ball {
  return { x: 322, y: 575, vx: 0, vy: 0 };
}

export default function App() {
  const theme = useGrokTheme();
  const themeRef = useRef(theme);
  themeRef.current = theme;
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const ballRef = useRef<Ball>(plungerBall());
  const wallsRef = useRef<Seg[]>(makeWalls());
  const bumpersRef = useRef<Bumper[]>(makeBumpers());
  const leftDown = useRef(false);
  const rightDown = useRef(false);
  const plungerDown = useRef(false);
  const leftAng = useRef(FLIP_REST);
  const rightAng = useRef(Math.PI - FLIP_REST);
  const leftOmega = useRef(0);
  const rightOmega = useRef(0);
  const power = useRef(0);
  const modeRef = useRef<'ready' | 'live' | 'over'>('ready');
  const scoreRef = useRef(0);
  const ballsRef = useRef(BALLS);
  const comboRef = useRef(0);

  const [score, setScore] = useState(0);
  const [best, setBest] = useState(0);
  const [ballsLeft, setBallsLeft] = useState(BALLS);
  const [mode, setMode] = useState<'ready' | 'live' | 'over'>('ready');
  const [powerView, setPowerView] = useState(0);
  const [message, setMessage] = useState('按住发射/空格蓄力，松手把球打上弹珠台。');

  const syncMode = useCallback((m: 'ready' | 'live' | 'over') => {
    modeRef.current = m;
    setMode(m);
  }, []);

  const addScore = useCallback((n: number) => {
    if (n <= 0) return;
    comboRef.current += 1;
    const gain = n + Math.min(50, comboRef.current * 2);
    scoreRef.current += gain;
    setScore(scoreRef.current);
    if (scoreRef.current > best) setBest(scoreRef.current);
  }, [best]);

  const loseBall = useCallback(() => {
    const left = ballsRef.current - 1;
    ballsRef.current = left;
    setBallsLeft(left);
    comboRef.current = 0;
    power.current = 0;
    ballRef.current = plungerBall();
    if (left <= 0) {
      syncMode('over');
      setMessage('三球用完，本局结束。得分 ' + scoreRef.current);
    } else {
      syncMode('ready');
      setMessage('球掉进了落袋。剩余 ' + left + ' 球，再次发射。');
    }
  }, [syncMode]);

  const restart = useCallback(() => {
    scoreRef.current = 0;
    ballsRef.current = BALLS;
    comboRef.current = 0;
    power.current = 0;
    ballRef.current = plungerBall();
    bumpersRef.current = makeBumpers();
    leftDown.current = false;
    rightDown.current = false;
    plungerDown.current = false;
    setScore(0);
    setBallsLeft(BALLS);
    setPowerView(0);
    syncMode('ready');
    setMessage('新一局：蓄力发射，左右挡板把球打回去。');
  }, [syncMode]);

  useEffect(() => {
    const onDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft' || e.key === 'z' || e.key === 'Z' || e.key === 'a' || e.key === 'A') {
        leftDown.current = true;
        e.preventDefault();
      }
      if (e.key === 'ArrowRight' || e.key === 'm' || e.key === 'M' || e.key === 'l' || e.key === 'L' || e.key === '/') {
        rightDown.current = true;
        e.preventDefault();
      }
      if (e.key === ' ' || e.key === 'Spacebar' || e.key === 'Enter') {
        plungerDown.current = true;
        e.preventDefault();
      }
    };
    const onUp = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft' || e.key === 'z' || e.key === 'Z' || e.key === 'a' || e.key === 'A') leftDown.current = false;
      if (e.key === 'ArrowRight' || e.key === 'm' || e.key === 'M' || e.key === 'l' || e.key === 'L' || e.key === '/') rightDown.current = false;
      if (e.key === ' ' || e.key === 'Spacebar' || e.key === 'Enter') plungerDown.current = false;
    };
    window.addEventListener('keydown', onDown);
    window.addEventListener('keyup', onUp);
    return () => {
      window.removeEventListener('keydown', onDown);
      window.removeEventListener('keyup', onUp);
    };
  }, []);

  useEffect(() => {
    let id = 0;
    let lastLaunch = false;
    const tick = () => {
      const t = themeRef.current;
      const canvas = canvasRef.current;
      const ball = ballRef.current;
      const modeNow = modeRef.current;

      const stepFlip = (cur: number, target: number, prevOmega: number): { a: number; w: number } => {
        const speed = 0.14;
        const next = cur + clamp(target - cur, -speed, speed);
        return { a: next, w: next - cur + prevOmega * 0.2 };
      };
      const lTarget = leftDown.current ? FLIP_UP : FLIP_REST;
      const rTarget = rightDown.current ? Math.PI - FLIP_UP : Math.PI - FLIP_REST;
      const ls = stepFlip(leftAng.current, lTarget, leftOmega.current);
      const rs = stepFlip(rightAng.current, rTarget, rightOmega.current);
      leftAng.current = ls.a;
      leftOmega.current = ls.w;
      rightAng.current = rs.a;
      rightOmega.current = rs.w;

      if (modeNow === 'ready') {
        if (plungerDown.current) {
          power.current = Math.min(1, power.current + 0.02);
        } else if (power.current > 0.08 && lastLaunch) {
          ball.vy = -7 - power.current * 13;
          ball.vx = 0;
          ball.x = 322;
          ball.y = 575;
          power.current = 0;
          syncMode('live');
          setMessage('球已出发！左右挡板接球，打到弹射器得分。');
        } else if (!plungerDown.current) {
          power.current = Math.max(0, power.current - 0.04);
        }
        lastLaunch = plungerDown.current;
        setPowerView(Math.round(power.current * 100));
        ball.x = 322;
        ball.y = 575 - power.current * 40;
        ball.vx = 0;
        ball.vy = 0;
      } else if (modeNow === 'live') {
        lastLaunch = false;
        for (let s = 0; s < 4; s++) {
          ball.vy += GRAVITY / 4;
          ball.vx *= DAMP;
          ball.vy *= DAMP;
          ball.x += ball.vx / 4;
          ball.y += ball.vy / 4;
          capSpeed(ball);
          for (const seg of wallsRef.current) {
            const sc = collideSeg(ball, seg, 0, 0);
            if (sc) addScore(sc);
          }
          const lt = flipperTip(L_PIVOT, leftAng.current);
          const rt = flipperTip(R_PIVOT, rightAng.current);
          const lKick = leftOmega.current < -0.02;
          const rKick = rightOmega.current > 0.02;
          const lsc = collideSeg(
            ball,
            { x1: L_PIVOT.x, y1: L_PIVOT.y, x2: lt.x, y2: lt.y, bounce: 0.55, kick: lKick ? 3.2 : 0, score: 0 },
            lKick ? -leftOmega.current * 18 : 0,
            lKick ? leftOmega.current * 8 : 0,
          );
          const rsc = collideSeg(
            ball,
            { x1: R_PIVOT.x, y1: R_PIVOT.y, x2: rt.x, y2: rt.y, bounce: 0.55, kick: rKick ? 3.2 : 0, score: 0 },
            rKick ? -rightOmega.current * 18 : 0,
            rKick ? -rightOmega.current * 8 : 0,
          );
          if (lsc || rsc) comboRef.current += 1;
          for (const bumper of bumpersRef.current) {
            const sc = collideBumper(ball, bumper);
            if (sc) addScore(sc);
          }
        }
        for (const bumper of bumpersRef.current) {
          if (bumper.flash > 0) bumper.flash -= 1;
        }
        if (ball.y > 630 && ball.x < 306) {
          loseBall();
        }
      } else {
        lastLaunch = false;
      }

      if (canvas) {
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.clearRect(0, 0, W, H);
          ctx.fillStyle = t.bg.subtle;
          ctx.fillRect(0, 0, W, H);
          ctx.fillStyle = t.bg.elevated;
          ctx.beginPath();
          ctx.moveTo(22, 100);
          ctx.lineTo(70, 28);
          ctx.lineTo(180, 16);
          ctx.lineTo(290, 28);
          ctx.lineTo(338, 100);
          ctx.lineTo(338, 620);
          ctx.lineTo(306, 620);
          ctx.lineTo(306, 520);
          ctx.lineTo(250, 575);
          ctx.lineTo(110, 575);
          ctx.lineTo(70, 575);
          ctx.lineTo(22, 520);
          ctx.closePath();
          ctx.fill();
          ctx.strokeStyle = t.border.strong;
          ctx.lineWidth = 3;
          ctx.stroke();
          ctx.fillStyle = t.fill.dangerSubtle || t.bg.base;
          ctx.fillRect(24, 600, 282, 36);
          ctx.font = '12px ' + t.font.family;
          ctx.fillStyle = t.text.tertiary;
          ctx.textAlign = 'center';
          ctx.fillText('落袋', 160, 622);
          ctx.strokeStyle = t.text.warning;
          ctx.lineWidth = 4;
          for (const seg of wallsRef.current) {
            if (seg.kick > 0) {
              ctx.beginPath();
              ctx.moveTo(seg.x1, seg.y1);
              ctx.lineTo(seg.x2, seg.y2);
              ctx.stroke();
            }
          }
          for (const bumper of bumpersRef.current) {
            ctx.beginPath();
            ctx.arc(bumper.x, bumper.y, bumper.r, 0, Math.PI * 2);
            ctx.fillStyle = bumper.flash > 0 ? t.fill.accent : t.dataviz.categorical[bumper.score >= 150 ? 1 : 0];
            ctx.fill();
            ctx.strokeStyle = t.border.default;
            ctx.lineWidth = 2;
            ctx.stroke();
          }
          const drawFlip = (pivot: { x: number; y: number }, ang: number, color: string) => {
            const tip = flipperTip(pivot, ang);
            ctx.strokeStyle = color;
            ctx.lineWidth = 10;
            ctx.lineCap = 'round';
            ctx.beginPath();
            ctx.moveTo(pivot.x, pivot.y);
            ctx.lineTo(tip.x, tip.y);
            ctx.stroke();
            ctx.fillStyle = t.bg.elevated;
            ctx.beginPath();
            ctx.arc(pivot.x, pivot.y, 7, 0, Math.PI * 2);
            ctx.fill();
          };
          drawFlip(L_PIVOT, leftAng.current, t.dataviz.categorical[2] || t.fill.primary);
          drawFlip(R_PIVOT, rightAng.current, t.dataviz.categorical[3] || t.fill.primary);
          ctx.fillStyle = t.border.default;
          ctx.fillRect(308, 602, 28, 8);
          ctx.fillStyle = t.fill.accent;
          const ph = power.current * 80;
          ctx.fillRect(348, 590 - ph, 8, ph);
          ctx.strokeStyle = t.border.default;
          ctx.strokeRect(348, 510, 8, 80);
          ctx.beginPath();
          ctx.arc(ball.x, ball.y, BR, 0, Math.PI * 2);
          ctx.fillStyle = t.text.primary;
          ctx.fill();
          ctx.strokeStyle = t.bg.base;
          ctx.lineWidth = 1;
          ctx.stroke();
        }
      }
      id = requestAnimationFrame(tick);
    };
    id = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(id);
  }, [addScore, loseBall, syncMode]);

  const hold = (ref: { current: boolean }, v: boolean) => (e: PointerEvent<HTMLButtonElement>) => {
    e.preventDefault();
    if (v) {
      try { e.currentTarget.setPointerCapture(e.pointerId); } catch { /* ignore */ }
    }
    ref.current = v;
  };

  const btnStyle: CSSProperties = {
    flex: 1,
    minHeight: 48,
    borderRadius: 10,
    border: '1px solid ' + theme.border.default,
    background: theme.bg.elevated,
    color: theme.text.primary,
    fontFamily: theme.font.family,
    fontSize: 16,
    touchAction: 'none',
    cursor: 'pointer',
  };

  return (
    <Page
      title="弹球"
      summary="弹珠台（Pinball），不是打砖块。左右挡板接球，撞击弹射器得分；球落入底部落袋则失去一球，共三球计分。"
      width="wide"
      lang="zh-Hans"
    >
      <Section>
        <Text>
          这是弹珠台，不是打砖块。先在右侧通道蓄力发射，再用左右挡板把球打回台面，撞击圆形弹射器和三角弹性垫得分。球从挡板中间掉进落袋就失去一球，三球用完结算。
        </Text>
      </Section>
      <Section>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, alignItems: 'center', fontFamily: theme.font.family }}>
          <Button label="重新开始" variant="primary" onClick={restart} />
          <span>得分 {score}</span>
          <span style={{ color: theme.text.secondary }}>最高 {best}</span>
          <span>剩余球 {ballsLeft}</span>
          {mode === 'ready' ? <span style={{ color: theme.text.secondary }}>蓄力 {powerView}%</span> : null}
        </div>
        <div aria-live="polite" style={{ marginTop: 8, color: theme.text.primary, fontFamily: theme.font.family }}>
          {message}
        </div>
      </Section>
      <Section>
        <canvas
          ref={canvasRef}
          width={W}
          height={H}
          aria-label="弹珠台"
          style={{
            display: 'block',
            width: '100%',
            maxWidth: 400,
            margin: '0 auto',
            borderRadius: 12,
            border: '1px solid ' + theme.border.default,
            background: theme.bg.subtle,
            touchAction: 'none',
          }}
        />
        <div style={{ display: 'flex', gap: 8, maxWidth: 400, margin: '12px auto 0', fontFamily: theme.font.family }}>
          <button
            type="button"
            style={btnStyle}
            onPointerDown={hold(leftDown, true)}
            onPointerUp={hold(leftDown, false)}
            onPointerCancel={hold(leftDown, false)}
            onLostPointerCapture={hold(leftDown, false)}
          >
            左挡板
          </button>
          <button
            type="button"
            style={btnStyle}
            onPointerDown={hold(plungerDown, true)}
            onPointerUp={hold(plungerDown, false)}
            onPointerCancel={hold(plungerDown, false)}
            onLostPointerCapture={hold(plungerDown, false)}
          >
            {mode === 'over' ? '已结束' : '发射 / 蓄力'}
          </button>
          <button
            type="button"
            style={btnStyle}
            onPointerDown={hold(rightDown, true)}
            onPointerUp={hold(rightDown, false)}
            onPointerCancel={hold(rightDown, false)}
            onLostPointerCapture={hold(rightDown, false)}
          >
            右挡板
          </button>
        </div>
      </Section>
      <Section heading="操作与规则">
        <Text>
          键盘：左挡板用左方向键或 Z / A，右挡板用右方向键或 M / L，空格或回车按住蓄力、松开发射。触控或鼠标按住页内三个按钮即可。击中大弹射器得 100 或 150 分，两侧小柱 50 分，三角弹性垫 25 分，连击会有少量加成。物理为简化街机模型：重力下落、线段与圆碰撞反弹，挡板抬起时额外弹射。未做完整实机弹珠模拟（无多球、无倾斜犯规）。刷新页面不保留最高分。
        </Text>
      </Section>
    </Page>
  );
}
