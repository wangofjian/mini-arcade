import {
  Page,
  Section,
  Text,
  Button,
  useState,
  useCallback,
  useMemo,
  useGrokTheme,
  type CSSProperties
} from '../compat/grok-canvas';

type Side = 'r' | 'b';
type Kind = 'K' | 'A' | 'E' | 'H' | 'R' | 'C' | 'P';
type Piece = { side: Side; kind: Kind };
type Board = (Piece | null)[][];
type Sq = { r: number; c: number };

const ROWS = 10;
const COLS = 9;
const LABELS: Record<Side, Record<Kind, string>> = {
  r: { K: '帅', A: '仕', E: '相', H: '马', R: '车', C: '炮', P: '兵' },
  b: { K: '将', A: '士', E: '象', H: '马', R: '车', C: '炮', P: '卒' },
};

function emptyBoard(): Board {
  return Array.from({ length: ROWS }, () => Array.from({ length: COLS }, () => null as Piece | null));
}

function initialBoard(): Board {
  const b = emptyBoard();
  const back: Kind[] = ['R', 'H', 'E', 'A', 'K', 'A', 'E', 'H', 'R'];
  for (let c = 0; c < COLS; c++) {
    b[0][c] = { side: 'r', kind: back[c] };
    b[9][c] = { side: 'b', kind: back[c] };
  }
  b[2][1] = { side: 'r', kind: 'C' };
  b[2][7] = { side: 'r', kind: 'C' };
  b[7][1] = { side: 'b', kind: 'C' };
  b[7][7] = { side: 'b', kind: 'C' };
  for (const c of [0, 2, 4, 6, 8]) {
    b[3][c] = { side: 'r', kind: 'P' };
    b[6][c] = { side: 'b', kind: 'P' };
  }
  return b;
}

function cloneBoard(b: Board): Board {
  return b.map((row: (Piece | null)[]) => row.map((p: Piece | null) => (p ? { side: p.side, kind: p.kind } : null)));
}

function inBounds(r: number, c: number): boolean {
  return r >= 0 && r < ROWS && c >= 0 && c < COLS;
}

function inPalace(side: Side, r: number, c: number): boolean {
  if (c < 3 || c > 5) return false;
  return side === 'r' ? r >= 0 && r <= 2 : r >= 7 && r <= 9;
}

function sign(n: number): number {
  return n > 0 ? 1 : n < 0 ? -1 : 0;
}

function countBetween(b: Board, r1: number, c1: number, r2: number, c2: number): number {
  const dr = sign(r2 - r1);
  const dc = sign(c2 - c1);
  let n = 0;
  let r = r1 + dr;
  let c = c1 + dc;
  while (r !== r2 || c !== c2) {
    if (b[r][c]) n += 1;
    r += dr;
    c += dc;
  }
  return n;
}

function kingSquare(b: Board, side: Side): Sq | null {
  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < COLS; c++) {
      const p = b[r][c];
      if (p && p.side === side && p.kind === 'K') return { r, c };
    }
  }
  return null;
}

function rawAttacks(b: Board, r: number, c: number, destR: number, destC: number): boolean {
  const p = b[r][c];
  if (!p || !inBounds(destR, destC)) return false;
  const dr = destR - r;
  const dc = destC - c;
  if (p.kind === 'K') {
    if (Math.abs(dr) + Math.abs(dc) === 1 && inPalace(p.side, destR, destC)) return true;
    if (dc === 0 && dr !== 0 && countBetween(b, r, c, destR, destC) === 0) {
      const other = b[destR][destC];
      return !!other && other.kind === 'K' && other.side !== p.side;
    }
    return false;
  }
  if (p.kind === 'A') {
    return Math.abs(dr) === 1 && Math.abs(dc) === 1 && inPalace(p.side, destR, destC);
  }
  if (p.kind === 'E') {
    if (Math.abs(dr) !== 2 || Math.abs(dc) !== 2) return false;
    if (b[r + sign(dr)][c + sign(dc)]) return false;
    if (p.side === 'r' && destR > 4) return false;
    if (p.side === 'b' && destR < 5) return false;
    return true;
  }
  if (p.kind === 'H') {
    if (!((Math.abs(dr) === 2 && Math.abs(dc) === 1) || (Math.abs(dr) === 1 && Math.abs(dc) === 2))) return false;
    const lr = Math.abs(dr) === 2 ? r + sign(dr) : r;
    const lc = Math.abs(dc) === 2 ? c + sign(dc) : c;
    return !b[lr][lc];
  }
  if (p.kind === 'R') {
    if (dr !== 0 && dc !== 0) return false;
    if (dr === 0 && dc === 0) return false;
    return countBetween(b, r, c, destR, destC) === 0;
  }
  if (p.kind === 'C') {
    if (dr !== 0 && dc !== 0) return false;
    if (dr === 0 && dc === 0) return false;
    const mid = countBetween(b, r, c, destR, destC);
    const target = b[destR][destC];
    if (target) return mid === 1;
    return mid === 0;
  }
  if (p.kind === 'P') {
    if (p.side === 'r') {
      if (dr === 1 && dc === 0) return true;
      if (r >= 5 && dr === 0 && Math.abs(dc) === 1) return true;
      return false;
    }
    if (dr === -1 && dc === 0) return true;
    if (r <= 4 && dr === 0 && Math.abs(dc) === 1) return true;
    return false;
  }
  return false;
}

function isChecked(b: Board, side: Side): boolean {
  const k = kingSquare(b, side);
  if (!k) return true;
  const enemy: Side = side === 'r' ? 'b' : 'r';
  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < COLS; c++) {
      const p = b[r][c];
      if (p && p.side === enemy && rawAttacks(b, r, c, k.r, k.c)) return true;
    }
  }
  return false;
}

function applyMove(b: Board, from: Sq, to: Sq): Board {
  const next = cloneBoard(b);
  next[to.r][to.c] = next[from.r][from.c];
  next[from.r][from.c] = null;
  return next;
}

function rawDests(b: Board, r: number, c: number): Sq[] {
  const p = b[r][c];
  if (!p) return [];
  const out: Sq[] = [];
  const tryAdd = (nr: number, nc: number) => {
    if (!inBounds(nr, nc)) return;
    const t = b[nr][nc];
    if (t && t.side === p.side) return;
    if (rawAttacks(b, r, c, nr, nc)) out.push({ r: nr, c: nc });
  };
  if (p.kind === 'K' || p.kind === 'A' || p.kind === 'E' || p.kind === 'H' || p.kind === 'P') {
    const deltas: [number, number][] =
      p.kind === 'K'
        ? [[1, 0], [-1, 0], [0, 1], [0, -1]]
        : p.kind === 'A'
          ? [[1, 1], [1, -1], [-1, 1], [-1, -1]]
          : p.kind === 'E'
            ? [[2, 2], [2, -2], [-2, 2], [-2, -2]]
            : p.kind === 'H'
              ? [[2, 1], [2, -1], [-2, 1], [-2, -1], [1, 2], [1, -2], [-1, 2], [-1, -2]]
              : p.side === 'r'
                ? [[1, 0], [0, 1], [0, -1]]
                : [[-1, 0], [0, 1], [0, -1]];
    for (const d of deltas) tryAdd(r + d[0], c + d[1]);
    if (p.kind === 'K') {
      const other = kingSquare(b, p.side === 'r' ? 'b' : 'r');
      if (other && other.c === c && countBetween(b, r, c, other.r, other.c) === 0) out.push(other);
    }
    return out;
  }
  const dirs: [number, number][] = [[1, 0], [-1, 0], [0, 1], [0, -1]];
  for (const d of dirs) {
    for (let i = 1; i < 10; i++) {
      const nr = r + d[0] * i;
      const nc = c + d[1] * i;
      if (!inBounds(nr, nc)) break;
      const t = b[nr][nc];
      if (p.kind === 'R') {
        if (!t) out.push({ r: nr, c: nc });
        else {
          if (t.side !== p.side) out.push({ r: nr, c: nc });
          break;
        }
      } else {
        if (!t) out.push({ r: nr, c: nc });
        else {
          for (let j = i + 1; j < 10; j++) {
            const jr = r + d[0] * j;
            const jc = c + d[1] * j;
            if (!inBounds(jr, jc)) break;
            const u = b[jr][jc];
            if (u) {
              if (u.side !== p.side) out.push({ r: jr, c: jc });
              break;
            }
          }
          break;
        }
      }
    }
  }
  return out;
}

function legalDests(b: Board, r: number, c: number): Sq[] {
  const p = b[r][c];
  if (!p) return [];
  return rawDests(b, r, c).filter((to: Sq) => !isChecked(applyMove(b, { r, c }, to), p.side));
}

function hasLegal(b: Board, side: Side): boolean {
  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < COLS; c++) {
      const p = b[r][c];
      if (p && p.side === side && legalDests(b, r, c).length > 0) return true;
    }
  }
  return false;
}

function keyOf(r: number, c: number): string {
  return r + ',' + c;
}

export default function App() {
  const theme = useGrokTheme();
  const [board, setBoard] = useState<Board>(() => initialBoard());
  const [turn, setTurn] = useState<Side>('r');
  const [sel, setSel] = useState<Sq | null>(null);
  const [last, setLast] = useState<{ from: Sq; to: Sq } | null>(null);
  const [ended, setEnded] = useState<'checkmate' | 'stalemate' | null>(null);
  const [message, setMessage] = useState('红方先行。点选己方棋子，再点高亮交叉点走子。');

  const dests = useMemo(() => (sel ? legalDests(board, sel.r, sel.c) : []), [board, sel]);
  const destSet = useMemo(() => {
    const s = new Set<string>();
    for (const d of dests) s.add(keyOf(d.r, d.c));
    return s;
  }, [dests]);

  const restart = useCallback(() => {
    setBoard(initialBoard());
    setTurn('r');
    setSel(null);
    setLast(null);
    setEnded(null);
    setMessage('新一局，红方先行。');
  }, []);

  const play = useCallback(
    (from: Sq, to: Sq) => {
      if (ended) return;
      const p = board[from.r][from.c];
      if (!p || p.side !== turn) return;
      const ok = legalDests(board, from.r, from.c).some((d: Sq) => d.r === to.r && d.c === to.c);
      if (!ok) return;
      const next = applyMove(board, from, to);
      const opp: Side = turn === 'r' ? 'b' : 'r';
      setBoard(next);
      setLast({ from, to });
      setSel(null);
      const check = isChecked(next, opp);
      const legal = hasLegal(next, opp);
      if (!legal) {
        setEnded(check ? 'checkmate' : 'stalemate');
        const win = turn === 'r' ? '红方' : '黑方';
        const lose = opp === 'r' ? '红方' : '黑方';
        setMessage(
          check
            ? '将死！' + win + '获胜（' + lose + '已被将死）。'
            : '困毙！' + lose + '无子可动，' + win + '获胜。',
        );
        return;
      }
      setTurn(opp);
      setMessage(check ? (opp === 'r' ? '红方' : '黑方') + '被将军，请应将。' : (opp === 'r' ? '轮到红方' : '轮到黑方'));
    },
    [board, turn, ended],
  );

  const onPoint = useCallback(
    (r: number, c: number) => {
      if (ended) return;
      const p = board[r][c];
      if (sel) {
        if (sel.r === r && sel.c === c) {
          setSel(null);
          return;
        }
        if (destSet.has(keyOf(r, c))) {
          play(sel, { r, c });
          return;
        }
        if (p && p.side === turn) {
          setSel({ r, c });
          return;
        }
        setSel(null);
        return;
      }
      if (p && p.side === turn) setSel({ r, c });
    },
    [ended, board, sel, destSet, turn, play],
  );

  const cell = 52;
  const pad = 36;
  const svgW = pad * 2 + (COLS - 1) * cell;
  const svgH = pad * 2 + (ROWS - 1) * cell;
  const px = (c: number) => pad + c * cell;
  const py = (r: number) => pad + (ROWS - 1 - r) * cell;
  const line = theme.border.strong;
  const redColor = theme.dataviz.categorical[0];
  const blackColor = theme.kind === 'dark' ? theme.text.primary : theme.text.primary;

  const wrap: CSSProperties = {
    display: 'flex',
    flexWrap: 'wrap',
    gap: 10,
    alignItems: 'center',
    fontFamily: theme.font.family,
    color: theme.text.primary,
  };

  return (
    <Page
      title="中国象棋"
      summary="标准 9×10 中国象棋，本地双人。车马炮兵相士帅均按规则走子，含蹩马腿、塞象眼、河界、九宫、将帅照面与将军/将死/困毙检查。"
      width="wide"
      lang="zh-Hans"
    >
      <Section>
        <Text>
          红黑轮流，红方先行。点选自己的棋子后，可走的交叉点会高亮，再点目标完成走子。不能走导致自己被将军或将帅照面的棋。本页为人人对战，不带人机。
        </Text>
      </Section>
      <Section>
        <div style={wrap}>
          <Button label="重新开始" variant="primary" onClick={restart} />
          <span>{turn === 'r' ? '红方走棋' : '黑方走棋'}</span>
          <span aria-live="polite" style={{ color: ended ? theme.text.success : theme.text.secondary }}>
            {message}
          </span>
        </div>
      </Section>
      <Section>
        <svg
          viewBox={'0 0 ' + svgW + ' ' + svgH}
          width="100%"
          role="img"
          aria-label="中国象棋棋盘"
          style={{
            display: 'block',
            maxWidth: 520,
            margin: '0 auto',
            background: theme.bg.subtle,
            borderRadius: 12,
            border: '1px solid ' + theme.border.default,
            touchAction: 'manipulation',
          }}
        >
          <rect x={0} y={0} width={svgW} height={svgH} fill={theme.bg.subtle} rx={12} />
          {Array.from({ length: ROWS }, (_: unknown, r: number) => (
            <line key={'h' + r} x1={px(0)} y1={py(r)} x2={px(COLS - 1)} y2={py(r)} stroke={line} strokeWidth={r === 0 || r === 9 ? 2 : 1} />
          ))}
          {Array.from({ length: COLS }, (_: unknown, c: number) =>
            c === 0 || c === 8 ? (
              <line key={'v' + c} x1={px(c)} y1={py(0)} x2={px(c)} y2={py(9)} stroke={line} strokeWidth={2} />
            ) : (
              <g key={'v' + c}>
                <line x1={px(c)} y1={py(0)} x2={px(c)} y2={py(4)} stroke={line} strokeWidth={1} />
                <line x1={px(c)} y1={py(5)} x2={px(c)} y2={py(9)} stroke={line} strokeWidth={1} />
              </g>
            ),
          )}
          <line x1={px(3)} y1={py(0)} x2={px(5)} y2={py(2)} stroke={line} />
          <line x1={px(5)} y1={py(0)} x2={px(3)} y2={py(2)} stroke={line} />
          <line x1={px(3)} y1={py(9)} x2={px(5)} y2={py(7)} stroke={line} />
          <line x1={px(5)} y1={py(9)} x2={px(3)} y2={py(7)} stroke={line} />
          <text
            x={(px(0) + px(8)) / 2}
            y={(py(4) + py(5)) / 2 + 5}
            textAnchor="middle"
            fill={theme.text.secondary}
            fontSize={16}
            fontFamily={theme.font.family}
          >
            楚河　　汉界
          </text>
          {Array.from({ length: ROWS }, (_: unknown, r: number) =>
            Array.from({ length: COLS }, (_: unknown, c: number) => {
              const selected = sel && sel.r === r && sel.c === c;
              const can = destSet.has(keyOf(r, c));
              const was =
                last && ((last.from.r === r && last.from.c === c) || (last.to.r === r && last.to.c === c));
              const p = board[r][c];
              return (
                <g key={keyOf(r, c)} onClick={() => onPoint(r, c)} style={{ cursor: 'pointer' }}>
                  <circle cx={px(c)} cy={py(r)} r={22} fill="transparent" />
                  {was ? <circle cx={px(c)} cy={py(r)} r={20} fill={theme.fill.accentSubtle} opacity={0.7} /> : null}
                  {p ? (
                    <g>
                      <circle
                        cx={px(c)}
                        cy={py(r)}
                        r={18}
                        fill={theme.bg.elevated}
                        stroke={selected ? theme.text.accent : p.side === 'r' ? redColor : blackColor}
                        strokeWidth={selected ? 3 : 2}
                      />
                      <text
                        x={px(c)}
                        y={py(r) + 6}
                        textAnchor="middle"
                        fontSize={18}
                        fontFamily={theme.font.family}
                        fontWeight={700}
                        fill={p.side === 'r' ? redColor : blackColor}
                        style={{ pointerEvents: 'none' }}
                      >
                        {LABELS[p.side][p.kind]}
                      </text>
                    </g>
                  ) : null}
                  {can ? (
                    <circle
                      cx={px(c)}
                      cy={py(r)}
                      r={p ? 21 : 7}
                      fill={p ? 'none' : theme.fill.accent}
                      stroke={p ? theme.text.accent : 'none'}
                      strokeWidth={p ? 3 : 0}
                      opacity={0.9}
                      style={{ pointerEvents: 'none' }}
                    />
                  ) : null}
                </g>
              );
            }),
          )}
        </svg>
      </Section>
      <Section heading="规则说明">
        <Text>
          棋盘为九路十行，红在下方先行。帅/将只在九宫内直走一格；双方将帅不能在同一直线上面对面（中间无子）。仕/士斜走一格且不出九宫。相/象斜走两格（田字），若象眼有子则不能走，且不能过河。马走日字，蹩马腿则不能走。车沿直线走任意格，不能跳子。炮不吃子时与车相同；吃子须隔且只隔一个棋子（炮架）。兵/卒未过河只能向前一格，过河后可左右一格，不能后退。被将军必须应将；无法应将为将死，对方胜。无将但无任何合法着法为困毙，亦判负。本页不自动裁决长将、长捉等循环着法，遇到循环对峙可自行协商或重开。未加入人机，以免给出不可靠的棋力。
        </Text>
      </Section>
    </Page>
  );
}
