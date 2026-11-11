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

const EVEN_COLS = 8;
const ODD_COLS = 7;
const MAX_ROWS = 12;
const START_ROWS = 5;
const DEATH_ROW = 11;
const COLOR_COUNT = 5;
const R = 18;
const SQRT3 = 1.7320508;
const OX = 20 + R;
const OY = 20 + R;
const LEFT = OX - R;
const RIGHT = OX + 15 * R;
const VBW = 20 * 2 + 16 * R;
const SHOOTER_Y = OY + MAX_ROWS * R * SQRT3 + 8;
const VBH = SHOOTER_Y + 52;
const SPEED = 8.4;
const MAX_ANGLE = 1.15;

type Cell = number | null;
type Grid = Cell[][];

function colsInRow(r: number): number {
  return r % 2 === 0 ? EVEN_COLS : ODD_COLS;
}

function inBounds(r: number, c: number): boolean {
  return r >= 0 && r < MAX_ROWS && c >= 0 && c < colsInRow(r);
}

function neighbors(r: number, c: number): [number, number][] {
  const odd = r % 2 === 1;
  const deltas: [number, number][] = odd
    ? [[0, -1], [0, 1], [-1, 0], [-1, 1], [1, 0], [1, 1]]
    : [[0, -1], [0, 1], [-1, -1], [-1, 0], [1, -1], [1, 0]];
  const out: [number, number][] = [];
  for (const [dr, dc] of deltas) {
    const nr = r + dr;
    const nc = c + dc;
    if (inBounds(nr, nc)) out.push([nr, nc]);
  }
  return out;
}

function cellCenter(r: number, c: number): { x: number; y: number } {
  return {
    x: OX + c * (2 * R) + (r % 2 === 1 ? R : 0),
    y: OY + r * (R * SQRT3),
  };
}

function emptyGrid(): Grid {
  return Array.from({ length: MAX_ROWS }, (_: unknown, r: number) =>
    Array.from({ length: colsInRow(r) }, () => null as Cell),
  );
}

function cloneGrid(g: Grid): Grid {
  return g.map((row: Cell[]) => row.slice());
}

function randomFill(): Grid {
  const g = emptyGrid();
  for (let r = 0; r < START_ROWS; r++) {
    for (let c = 0; c < colsInRow(r); c++) {
      g[r][c] = Math.floor(Math.random() * COLOR_COUNT);
    }
  }
  return g;
}

function remainingColors(g: Grid): number[] {
  const seen = [false, false, false, false, false];
  for (let r = 0; r < MAX_ROWS; r++) {
    for (let c = 0; c < colsInRow(r); c++) {
      const v = g[r][c];
      if (v !== null) seen[v] = true;
    }
  }
  const out: number[] = [];
  for (let i = 0; i < COLOR_COUNT; i++) if (seen[i]) out.push(i);
  return out;
}

function pickColor(g: Grid): number {
  const cols = remainingColors(g);
  if (cols.length === 0) return Math.floor(Math.random() * COLOR_COUNT);
  return cols[Math.floor(Math.random() * cols.length)];
}

function occupiedCount(g: Grid): number {
  let n = 0;
  for (let r = 0; r < MAX_ROWS; r++) {
    for (let c = 0; c < colsInRow(r); c++) if (g[r][c] !== null) n += 1;
  }
  return n;
}

function sameGroup(g: Grid, r: number, c: number): [number, number][] {
  const color = g[r][c];
  if (color === null) return [];
  const seen: boolean[][] = Array.from({ length: MAX_ROWS }, (_: unknown, rr: number) =>
    Array.from({ length: colsInRow(rr) }, () => false),
  );
  const stack: [number, number][] = [[r, c]];
  const out: [number, number][] = [];
  seen[r][c] = true;
  while (stack.length) {
    const cur = stack.pop() as [number, number];
    out.push(cur);
    for (const [nr, nc] of neighbors(cur[0], cur[1])) {
      if (!seen[nr][nc] && g[nr][nc] === color) {
        seen[nr][nc] = true;
        stack.push([nr, nc]);
      }
    }
  }
  return out;
}

function ceilingConnected(g: Grid): boolean[][] {
  const seen: boolean[][] = Array.from({ length: MAX_ROWS }, (_: unknown, r: number) =>
    Array.from({ length: colsInRow(r) }, () => false),
  );
  const stack: [number, number][] = [];
  for (let c = 0; c < colsInRow(0); c++) {
    if (g[0][c] !== null) {
      seen[0][c] = true;
      stack.push([0, c]);
    }
  }
  while (stack.length) {
    const cur = stack.pop() as [number, number];
    for (const [nr, nc] of neighbors(cur[0], cur[1])) {
      if (!seen[nr][nc] && g[nr][nc] !== null) {
        seen[nr][nc] = true;
        stack.push([nr, nc]);
      }
    }
  }
  return seen;
}

function resolveShot(g: Grid, r: number, c: number, color: number): { grid: Grid; popped: number; dropped: number } {
  const next = cloneGrid(g);
  next[r][c] = color;
  const group = sameGroup(next, r, c);
  let popped = 0;
  if (group.length >= 3) {
    for (const cell of group) {
      next[cell[0]][cell[1]] = null;
      popped += 1;
    }
  }
  const conn = ceilingConnected(next);
  let dropped = 0;
  for (let rr = 0; rr < MAX_ROWS; rr++) {
    for (let cc = 0; cc < colsInRow(rr); cc++) {
      if (next[rr][cc] !== null && !conn[rr][cc]) {
        next[rr][cc] = null;
        dropped += 1;
      }
    }
  }
  return { grid: next, popped, dropped };
}

function reachedBottom(g: Grid): boolean {
  for (let c = 0; c < colsInRow(DEATH_ROW); c++) {
    if (g[DEATH_ROW][c] !== null) return true;
  }
  return false;
}

function snapCell(g: Grid, x: number, y: number): { r: number; c: number } {
  let bestR = 0;
  let bestC = 0;
  let bestD = Infinity;
  for (let r = 0; r < MAX_ROWS; r++) {
    for (let c = 0; c < colsInRow(r); c++) {
      if (g[r][c] !== null) continue;
      let attach = r === 0;
      if (!attach) {
        for (const [nr, nc] of neighbors(r, c)) {
          if (g[nr][nc] !== null) {
            attach = true;
            break;
          }
        }
      }
      if (!attach) continue;
      const p = cellCenter(r, c);
      const d = (p.x - x) * (p.x - x) + (p.y - y) * (p.y - y);
      if (d < bestD) {
        bestD = d;
        bestR = r;
        bestC = c;
      }
    }
  }
  return { r: bestR, c: bestC };
}

function hitsBubble(g: Grid, x: number, y: number): boolean {
  const lim = (2 * R - 3) * (2 * R - 3);
  for (let r = 0; r < MAX_ROWS; r++) {
    for (let c = 0; c < colsInRow(r); c++) {
      if (g[r][c] === null) continue;
      const p = cellCenter(r, c);
      const dx = p.x - x;
      const dy = p.y - y;
      if (dx * dx + dy * dy <= lim) return true;
    }
  }
  return false;
}

function aimPoints(sx: number, sy: number, angle: number): { x: number; y: number }[] {
  const pts: { x: number; y: number }[] = [{ x: sx, y: sy }];
  let x = sx;
  let y = sy;
  let vx = Math.sin(angle);
  let vy = -Math.cos(angle);
  for (let i = 0; i < 90; i++) {
    x += vx * 10;
    y += vy * 10;
    if (x <= LEFT + R) {
      x = LEFT + R;
      vx = Math.abs(vx);
      pts.push({ x, y });
    } else if (x >= RIGHT - R) {
      x = RIGHT - R;
      vx = -Math.abs(vx);
      pts.push({ x, y });
    }
    if (y <= OY) {
      pts.push({ x, y });
      break;
    }
    if (y > SHOOTER_Y) break;
  }
  const last = pts[pts.length - 1];
  if (last.x !== x || last.y !== y) pts.push({ x, y });
  return pts;
}

export default function App() {
  const theme = useGrokTheme();
  const palette = theme.dataviz.categorical;
  const svgRef = useRef<SVGSVGElement | null>(null);
  const gridRef = useRef<Grid>(randomFill());
  const flyingRef = useRef<{ x: number; y: number; vx: number; vy: number; color: number } | null>(null);
  const [grid, setGrid] = useState<Grid>(() => gridRef.current);
  const [current, setCurrent] = useState(() => pickColor(gridRef.current));
  const [nextColor, setNextColor] = useState(() => pickColor(gridRef.current));
  const [angle, setAngle] = useState(0);
  const [flying, setFlying] = useState<{ x: number; y: number; color: number } | null>(null);
  const [score, setScore] = useState(0);
  const [best, setBest] = useState(0);
  const [status, setStatus] = useState<'play' | 'won' | 'lost'>('play');
  const [message, setMessage] = useState('移动瞄准，点击或松手发射。三颗同色消除，悬空的会掉落。');
  const aimingRef = useRef(false);

  const colorOf = useCallback((i: number): string => palette[i % palette.length], [palette]);

  const restart = useCallback(() => {
    const g = randomFill();
    gridRef.current = g;
    flyingRef.current = null;
    setGrid(g);
    setCurrent(pickColor(g));
    setNextColor(pickColor(g));
    setAngle(0);
    setFlying(null);
    setScore(0);
    setStatus('play');
    setMessage('新一局已就绪，瞄准后发射。');
  }, []);

  const applyResult = useCallback((r: number, c: number, color: number) => {
    const res = resolveShot(gridRef.current, r, c, color);
    gridRef.current = res.grid;
    setGrid(res.grid);
    const gain = res.popped * 10 + res.dropped * 20;
    const nextScore = score + gain;
    setScore(nextScore);
    if (nextScore > best) setBest(nextScore);
    if (occupiedCount(res.grid) === 0) {
      setStatus('won');
      setMessage('清盘胜利！得分 ' + nextScore + (gain ? '，本发 +' + gain : ''));
      return;
    }
    if (reachedBottom(res.grid)) {
      setStatus('lost');
      setMessage('气泡触底，本局结束。得分 ' + nextScore);
      return;
    }
    const n1 = pickColor(res.grid);
    const n2 = pickColor(res.grid);
    setCurrent(nextColor);
    setNextColor(n1 === nextColor ? n2 : n1);
    if (res.popped || res.dropped) {
      setMessage('消除 ' + res.popped + '，掉落 ' + res.dropped + '，+' + gain + ' 分');
    } else {
      setMessage('未连成三颗，气泡已贴上。小心触底。');
    }
  }, [score, best, nextColor]);

  useEffect(() => {
    let id = 0;
    const tick = () => {
      const ball = flyingRef.current;
      if (ball) {
        let x = ball.x + ball.vx;
        let y = ball.y + ball.vy;
        let vx = ball.vx;
        let vy = ball.vy;
        const color = ball.color;
        if (x <= LEFT + R) {
          x = LEFT + R;
          vx = Math.abs(vx);
        } else if (x >= RIGHT - R) {
          x = RIGHT - R;
          vx = -Math.abs(vx);
        }
        const hit = y <= OY || hitsBubble(gridRef.current, x, y);
        if (hit) {
          const snap = snapCell(gridRef.current, x, y);
          flyingRef.current = null;
          setFlying(null);
          applyResult(snap.r, snap.c, color);
        } else {
          flyingRef.current = { x, y, vx, vy, color };
          setFlying({ x, y, color });
        }
      }
      id = requestAnimationFrame(tick);
    };
    id = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(id);
  }, [applyResult]);

  const updateAim = useCallback((clientX: number, clientY: number) => {
    const el = svgRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    if (rect.width <= 0 || rect.height <= 0) return;
    const px = ((clientX - rect.left) * VBW) / rect.width;
    const py = ((clientY - rect.top) * VBH) / rect.height;
    const sx = VBW / 2;
    const sy = SHOOTER_Y;
    let a = Math.atan2(px - sx, sy - py);
    if (a > MAX_ANGLE) a = MAX_ANGLE;
    if (a < -MAX_ANGLE) a = -MAX_ANGLE;
    setAngle(a);
  }, []);

  const tryShoot = useCallback(() => {
    if (status !== 'play' || flyingRef.current) return;
    const sx = VBW / 2;
    const sy = SHOOTER_Y;
    flyingRef.current = {
      x: sx,
      y: sy - R - 2,
      vx: Math.sin(angle) * SPEED,
      vy: -Math.cos(angle) * SPEED,
      color: current,
    };
    setFlying({ x: sx, y: sy - R - 2, color: current });
  }, [status, angle, current]);

  const onPointerDown = useCallback((e: PointerEvent<SVGSVGElement>) => {
    if (status !== 'play') return;
    aimingRef.current = true;
    e.preventDefault();
    e.currentTarget.setPointerCapture(e.pointerId);
    updateAim(e.clientX, e.clientY);
  }, [status, updateAim]);

  const onPointerMove = useCallback((e: PointerEvent<SVGSVGElement>) => {
    if (status !== 'play') return;
    updateAim(e.clientX, e.clientY);
  }, [status, updateAim]);

  const onPointerUp = useCallback((e: PointerEvent<SVGSVGElement>) => {
    if (!aimingRef.current) return;
    aimingRef.current = false;
    updateAim(e.clientX, e.clientY);
    tryShoot();
  }, [updateAim, tryShoot]);

  const preview = aimPoints(VBW / 2, SHOOTER_Y, angle);
  const previewD = preview
    .map((p: { x: number; y: number }, i: number) => (i === 0 ? 'M' : 'L') + p.x + ' ' + p.y)
    .join(' ');

  const wrap: CSSProperties = {
    display: 'flex',
    flexDirection: 'column',
    gap: 12,
    fontFamily: theme.font.family,
    color: theme.text.primary,
  };

  return (
    <Page
      title="泡泡龙"
      summary="瞄准发射泡泡，可经左右墙反弹；贴上后三颗同色消除，不连顶的簇会掉落。清盘获胜，触底失败。"
      width="wide"
      lang="zh-Hans"
    >
      <Section>
        <Text>
          在场地内移动指针或手指瞄准，按下并松开即可发射。泡泡碰到左右墙会反弹，撞上已有泡泡后吸附到六邻接格子。三个或以上同色相连会消除，之后不再连着顶部的泡泡整簇掉落。
        </Text>
      </Section>
      <Section>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, alignItems: 'center' }}>
          <Button label="重新开始" variant="primary" onClick={restart} />
          <span>得分 {score}</span>
          <span style={{ color: theme.text.secondary }}>最高 {best}</span>
          <span style={{ color: theme.text.secondary }}>
            下一发{' '}
            <span
              style={{
                display: 'inline-block',
                width: 14,
                height: 14,
                borderRadius: '50%',
                background: colorOf(nextColor),
                verticalAlign: 'middle',
                border: '1px solid ' + theme.border.default,
              }}
            />
          </span>
        </div>
        <div aria-live="polite" style={{ marginTop: 8, color: theme.text.primary }}>
          {message}
        </div>
      </Section>
      <Section>
        <div style={wrap}>
          <svg
            ref={svgRef}
            viewBox={'0 0 ' + VBW + ' ' + VBH}
            width="100%"
            role="img"
            aria-label="泡泡龙场地"
            onPointerDown={onPointerDown}
            onPointerMove={onPointerMove}
            onPointerUp={onPointerUp}
            onPointerCancel={onPointerUp}
            onLostPointerCapture={onPointerUp}
            style={{
              display: 'block',
              maxWidth: 420,
              margin: '0 auto',
              touchAction: 'none',
              background: theme.bg.subtle,
              borderRadius: 12,
              border: '1px solid ' + theme.border.default,
              cursor: status === 'play' ? 'crosshair' : 'default',
            }}
          >
            <rect x={0} y={0} width={VBW} height={VBH} fill={theme.bg.subtle} rx={12} />
            <line x1={LEFT} y1={OY - R} x2={RIGHT} y2={OY - R} stroke={theme.border.strong} strokeWidth={3} />
            <line x1={LEFT} y1={OY - R} x2={LEFT} y2={SHOOTER_Y + 20} stroke={theme.border.default} strokeWidth={2} />
            <line x1={RIGHT} y1={OY - R} x2={RIGHT} y2={SHOOTER_Y + 20} stroke={theme.border.default} strokeWidth={2} />
            {Array.from({ length: colsInRow(DEATH_ROW) }, (_: unknown, c: number) => {
              const p = cellCenter(DEATH_ROW, c);
              return (
                <circle
                  key={'d' + c}
                  cx={p.x}
                  cy={p.y}
                  r={R - 1}
                  fill="none"
                  stroke={theme.text.danger}
                  strokeDasharray="3 3"
                  opacity={0.45}
                />
              );
            })}
            {grid.map((row: Cell[], r: number) =>
              row.map((cell: Cell, c: number) => {
                if (cell === null) return null;
                const p = cellCenter(r, c);
                return (
                  <circle
                    key={r + ':' + c}
                    cx={p.x}
                    cy={p.y}
                    r={R - 1}
                    fill={colorOf(cell)}
                    stroke={theme.border.default}
                    strokeWidth={1}
                  />
                );
              }),
            )}
            {status === 'play' && !flying ? (
              <path
                d={previewD}
                fill="none"
                stroke={theme.text.accent}
                strokeWidth={1.5}
                strokeDasharray="5 5"
                opacity={0.8}
              />
            ) : null}
            {flying ? (
              <circle cx={flying.x} cy={flying.y} r={R - 1} fill={colorOf(flying.color)} stroke={theme.border.strong} />
            ) : null}
            <circle
              cx={VBW / 2}
              cy={SHOOTER_Y}
              r={R + 2}
              fill={theme.bg.elevated}
              stroke={theme.border.strong}
              strokeWidth={2}
            />
            {status === 'play' && !flying ? (
              <circle cx={VBW / 2} cy={SHOOTER_Y} r={R - 2} fill={colorOf(current)} stroke={theme.border.default} />
            ) : null}
            {status !== 'play' ? (
              <text
                x={VBW / 2}
                y={SHOOTER_Y / 2}
                textAnchor="middle"
                fill={status === 'won' ? theme.text.success : theme.text.danger}
                fontSize={22}
                fontFamily={theme.font.family}
                fontWeight={700}
              >
                {status === 'won' ? '清盘胜利' : '触底失败'}
              </text>
            ) : null}
          </svg>
        </div>
      </Section>
      <Section heading="规则说明">
        <Text>
          场地是六邻接（蜂窝）网格：偶数行 8 列，奇数行 7 列并半格错开。发射轨迹可在左右墙之间反弹。泡泡吸附后，若与邻接的同色泡泡连成至少三颗则全部消除；消除后，任何不再通过邻接关系连到顶行的泡泡都会掉落并计分。消除每颗 10 分，掉落每颗 20 分。若有泡泡落到最底行虚线位置，判定失败；全部清空则胜利。下一发颜色只从场上仍有的颜色中抽取。本页为单局随机开局，可随时重开。
        </Text>
      </Section>
    </Page>
  );
}
