import {
  Page,
  Section,
  Text,
  Button,
  Segmented,
  useState,
  useEffect,
  useMemo,
  useCallback,
  useGrokTheme,
  type CSSProperties,
} from "grok/canvas";

type Cell = 0 | 1 | 2;
type Board = Cell[][];
type Mode = "pvp" | "ai";
type Side = 1 | 2;

const N = 8;
const DIRS: [number, number][] = [
  [-1, -1], [-1, 0], [-1, 1],
  [0, -1],           [0, 1],
  [1, -1],  [1, 0],  [1, 1],
];

const CORNERS: [number, number][] = [
  [0, 0], [0, 7], [7, 0], [7, 7],
];
const X_SQUARES: [number, number][] = [
  [1, 1], [1, 6], [6, 1], [6, 6],
];
const C_SQUARES: [number, number][] = [
  [0, 1], [1, 0], [0, 6], [1, 7],
  [6, 0], [7, 1], [6, 7], [7, 6],
];

function emptyBoard(): Board {
  return Array.from({ length: N }, () => Array(N).fill(0) as Cell[]);
}

function initialBoard(): Board {
  const b = emptyBoard();
  b[3][3] = 2;
  b[3][4] = 1;
  b[4][3] = 1;
  b[4][4] = 2;
  return b;
}

function cloneBoard(b: Board): Board {
  return b.map((row: Cell[]) => row.slice() as Cell[]);
}

function opponent(p: Side): Side {
  return p === 1 ? 2 : 1;
}

function inBounds(r: number, c: number): boolean {
  return r >= 0 && r < N && c >= 0 && c < N;
}

function flipsAt(b: Board, r: number, c: number, p: Side): [number, number][] {
  if (b[r][c] !== 0) return [];
  const opp = opponent(p);
  const flips: [number, number][] = [];
  for (const [dr, dc] of DIRS) {
    const line: [number, number][] = [];
    let y = r + dr;
    let x = c + dc;
    while (inBounds(y, x) && b[y][x] === opp) {
      line.push([y, x]);
      y += dr;
      x += dc;
    }
    if (line.length > 0 && inBounds(y, x) && b[y][x] === p) {
      for (const pos of line) flips.push(pos);
    }
  }
  return flips;
}

function isLegal(b: Board, r: number, c: number, p: Side): boolean {
  return flipsAt(b, r, c, p).length > 0;
}

function legalMoves(b: Board, p: Side): [number, number][] {
  const moves: [number, number][] = [];
  for (let r = 0; r < N; r++) {
    for (let c = 0; c < N; c++) {
      if (isLegal(b, r, c, p)) moves.push([r, c]);
    }
  }
  return moves;
}

function applyMove(b: Board, r: number, c: number, p: Side): Board {
  const next = cloneBoard(b);
  const flips = flipsAt(b, r, c, p);
  next[r][c] = p;
  for (const [y, x] of flips) next[y][x] = p;
  return next;
}

function countDiscs(b: Board): { black: number; white: number; empty: number } {
  let black = 0;
  let white = 0;
  let empty = 0;
  for (let r = 0; r < N; r++) {
    for (let c = 0; c < N; c++) {
      if (b[r][c] === 1) black++;
      else if (b[r][c] === 2) white++;
      else empty++;
    }
  }
  return { black, white, empty };
}

function hasAnyMove(b: Board, p: Side): boolean {
  return legalMoves(b, p).length > 0;
}

function gameOver(b: Board): boolean {
  return !hasAnyMove(b, 1) && !hasAnyMove(b, 2);
}

function positionScore(r: number, c: number): number {
  for (const [y, x] of CORNERS) if (y === r && x === c) return 120;
  for (const [y, x] of X_SQUARES) if (y === r && x === c) return -40;
  for (const [y, x] of C_SQUARES) if (y === r && x === c) return -20;
  if (r === 0 || r === 7 || c === 0 || c === 7) return 12;
  return 1;
}

function evaluate(b: Board, ai: Side): number {
  const human = opponent(ai);
  if (gameOver(b)) {
    const { black, white } = countDiscs(b);
    const aiCount = ai === 1 ? black : white;
    const huCount = ai === 1 ? white : black;
    if (aiCount > huCount) return 10000 + (aiCount - huCount);
    if (aiCount < huCount) return -10000 - (huCount - aiCount);
    return 0;
  }
  let pos = 0;
  let disc = 0;
  for (let r = 0; r < N; r++) {
    for (let c = 0; c < N; c++) {
      if (b[r][c] === ai) {
        pos += positionScore(r, c);
        disc += 1;
      } else if (b[r][c] === human) {
        pos -= positionScore(r, c);
        disc -= 1;
      }
    }
  }
  const myMoves = legalMoves(b, ai).length;
  const oppMoves = legalMoves(b, human).length;
  const mobility = (myMoves - oppMoves) * 8;
  const { empty } = countDiscs(b);
  const discWeight = empty > 20 ? 1 : 4;
  return pos + mobility + disc * discWeight;
}

function minimax(
  b: Board,
  depth: number,
  maximizing: boolean,
  ai: Side,
  alpha: number,
  beta: number,
): number {
  const side: Side = maximizing ? ai : opponent(ai);
  const moves = legalMoves(b, side);
  if (depth === 0 || (moves.length === 0 && !hasAnyMove(b, opponent(side)))) {
    return evaluate(b, ai);
  }
  if (moves.length === 0) {
    return minimax(b, depth - 1, !maximizing, ai, alpha, beta);
  }
  if (maximizing) {
    let best = -Infinity;
    for (const [r, c] of moves) {
      const next = applyMove(b, r, c, side);
      const score = minimax(next, depth - 1, false, ai, alpha, beta);
      if (score > best) best = score;
      if (score > alpha) alpha = score;
      if (beta <= alpha) break;
    }
    return best;
  }
  let best = Infinity;
  for (const [r, c] of moves) {
    const next = applyMove(b, r, c, side);
    const score = minimax(next, depth - 1, true, ai, alpha, beta);
    if (score < best) best = score;
    if (score < beta) beta = score;
    if (beta <= alpha) break;
  }
  return best;
}

function chooseAiMove(b: Board, ai: Side): [number, number] | null {
  const moves = legalMoves(b, ai);
  if (moves.length === 0) return null;
  const { empty } = countDiscs(b);
  const depth = empty <= 10 ? 3 : 2;
  let bestMove = moves[0];
  let bestScore = -Infinity;
  for (const [r, c] of moves) {
    const next = applyMove(b, r, c, ai);
    const score = minimax(next, depth - 1, false, ai, -Infinity, Infinity);
    const jitter = (r * 7 + c * 13) % 3;
    const adj = score + jitter * 0.01;
    if (adj > bestScore) {
      bestScore = adj;
      bestMove = [r, c];
    }
  }
  return bestMove;
}

function cellKey(r: number, c: number): string {
  return r + "," + c;
}

export default function App() {
  const theme = useGrokTheme();
  const [mode, setMode] = useState<Mode>("ai");
  const [humanSide, setHumanSide] = useState<Side>(1);
  const [board, setBoard] = useState<Board>(() => initialBoard());
  const [turn, setTurn] = useState<Side>(1);
  const [thinking, setThinking] = useState(false);
  const [message, setMessage] = useState("黑方先行 · 点击高亮格落子");

  const counts = useMemo(() => countDiscs(board), [board]);
  const ended = useMemo(() => gameOver(board), [board]);
  const moves = useMemo(() => legalMoves(board, turn), [board, turn]);
  const moveSet = useMemo(() => {
    const s = new Set<string>();
    for (const [r, c] of moves) s.add(cellKey(r, c));
    return s;
  }, [moves]);

  const aiSide: Side = humanSide === 1 ? 2 : 1;
  const isAiTurn = mode === "ai" && turn === aiSide && !ended;

  const restart = useCallback((nextMode?: Mode, nextHuman?: Side) => {
    const m = nextMode ?? mode;
    const h = nextHuman ?? humanSide;
    setMode(m);
    setHumanSide(h);
    setBoard(initialBoard());
    setTurn(1);
    setThinking(false);
    if (m === "ai") {
      setMessage(h === 1 ? "你执黑先行 · 点击高亮格落子" : "你执白后手 · AI 先下");
    } else {
      setMessage("双人对战 · 黑方先行");
    }
  }, [mode, humanSide]);

  const finishIfOver = useCallback((b: Board) => {
    if (!gameOver(b)) return false;
    const { black, white } = countDiscs(b);
    if (black > white) setMessage("黑方获胜！黑 " + black + " · 白 " + white);
    else if (white > black) setMessage("白方获胜！白 " + white + " · 黑 " + black);
    else setMessage("平局！双方各 " + black + " 子");
    setThinking(false);
    return true;
  }, []);

  const advanceTurn = useCallback((b: Board, justPlayed: Side) => {
    if (finishIfOver(b)) return;
    const next: Side = opponent(justPlayed);
    if (hasAnyMove(b, next)) {
      setTurn(next);
      if (mode === "ai" && next === aiSide) {
        setMessage("AI 思考中…");
      } else if (mode === "ai") {
        setMessage("轮到你落子");
      } else {
        setMessage((next === 1 ? "黑方" : "白方") + "落子");
      }
      return;
    }
    if (hasAnyMove(b, justPlayed)) {
      setTurn(justPlayed);
      setMessage(
        (next === 1 ? "黑方" : "白方") +
          "无子可下，跳过 · " +
          (justPlayed === 1 ? "黑方" : "白方") +
          "继续",
      );
      return;
    }
    finishIfOver(b);
  }, [aiSide, finishIfOver, mode]);

  const place = useCallback((r: number, c: number, p: Side) => {
    if (!isLegal(board, r, c, p)) return;
    const next = applyMove(board, r, c, p);
    setBoard(next);
    advanceTurn(next, p);
  }, [advanceTurn, board]);

  const onCellClick = useCallback((r: number, c: number) => {
    if (ended || thinking) return;
    if (mode === "ai" && turn !== humanSide) return;
    if (!moveSet.has(cellKey(r, c))) return;
    place(r, c, turn);
  }, [ended, thinking, mode, turn, humanSide, moveSet, place]);

  useEffect(() => {
    if (!isAiTurn) return;
    setThinking(true);
    const timer = setTimeout(() => {
      const move = chooseAiMove(board, aiSide);
      if (!move) {
        advanceTurn(board, aiSide);
        setThinking(false);
        return;
      }
      const [r, c] = move;
      const next = applyMove(board, r, c, aiSide);
      setBoard(next);
      setThinking(false);
      advanceTurn(next, aiSide);
    }, 380);
    return () => clearTimeout(timer);
  }, [isAiTurn, board, aiSide, advanceTurn]);

  const statusLine = ended
    ? message
    : thinking
      ? "AI 思考中…"
      : message;

  const boardBg = theme.bg.subtle;
  const lineColor = theme.border.strong;
  const hintColor = theme.dataviz.categorical[0];
  const blackFill = theme.text.primary;
  const whiteFill = theme.bg.base;
  const whiteStroke = theme.text.primary;

  const controlsStyle: CSSProperties = {
    display: "flex",
    flexWrap: "wrap",
    gap: 12,
    alignItems: "center",
    color: theme.text.primary,
  };

  const scoreStyle: CSSProperties = {
    display: "flex",
    flexWrap: "wrap",
    gap: 16,
    alignItems: "center",
    color: theme.text.primary,
    fontFamily: theme.font.family,
    fontSize: 15,
  };

  const discDot = (color: "black" | "white"): CSSProperties => ({
    display: "inline-block",
    width: 14,
    height: 14,
    borderRadius: "50%",
    marginRight: 6,
    verticalAlign: "middle",
    background: color === "black" ? blackFill : whiteFill,
    border: color === "white" ? "1.5px solid " + whiteStroke : "none",
  });

  return (
    <Page
      title="黑白棋"
      summary="经典 8×8 黑白棋（奥赛罗）。双人对战或挑战带角点与行动力启发的 AI，合法落点高亮，自动翻子与跳过。"
      width="wide"
      lang="zh-Hans"
    >
      <Section>
        <Text>
          黑棋先行。落子须夹住对方棋子并沿八个方向翻转；无合法着法则跳过。双方皆无着或棋盘下满时，以棋子多者胜。
        </Text>
      </Section>

      <Section>
        <div style={controlsStyle}>
          <Segmented
            value={mode}
            options={[
              { value: "ai", label: "人机" },
              { value: "pvp", label: "双人对战" },
            ]}
            onChange={(v: string) => {
              const next = v === "pvp" ? "pvp" : "ai";
              restart(next, humanSide);
            }}
          />
          {mode === "ai" ? (
            <Segmented
              value={String(humanSide)}
              options={[
                { value: "1", label: "先手（黑）" },
                { value: "2", label: "后手（白）" },
              ]}
              onChange={(v: string) => {
                const next: Side = v === "2" ? 2 : 1;
                restart("ai", next);
              }}
            />
          ) : null}
          <Button label="重新开始" variant="primary" onClick={() => restart()} />
        </div>
      </Section>

      <Section>
        <div style={scoreStyle}>
          <span>
            <span style={discDot("black")} />
            黑 {counts.black}
          </span>
          <span>
            <span style={discDot("white")} />
            白 {counts.white}
          </span>
          <span aria-live="polite" style={{ color: theme.text.secondary }}>
            {statusLine}
          </span>
        </div>
      </Section>

      <Section>
        <div style={{ display: "flex", justifyContent: "center" }}>
          <svg
            viewBox="0 0 480 480"
            width="100%"
            role="group"
            aria-label="八乘八黑白棋棋盘"
            style={{
              display: "block",
              maxHeight: "72vh",
              maxWidth: 560,
              aspectRatio: "1",
              touchAction: "manipulation",
              background: boardBg,
              borderRadius: 12,
              border: "1px solid " + theme.border.default,
            }}
          >
            <rect x={0} y={0} width={480} height={480} fill={boardBg} />
            {Array.from({ length: N }, (_: unknown, r: number) =>
              Array.from({ length: N }, (_: unknown, c: number) => {
                const x = 20 + c * 55;
                const y = 20 + r * 55;
                const cell = board[r][c];
                const legal = moveSet.has(cellKey(r, c)) && !ended && !thinking &&
                  (mode === "pvp" || turn === humanSide);
                return (
                  <g key={cellKey(r, c)}>
                    <rect
                      x={x}
                      y={y}
                      width={55}
                      height={55}
                      fill={boardBg}
                      stroke={lineColor}
                      strokeWidth={1}
                    />
                    {legal ? (
                      <circle
                        cx={x + 27.5}
                        cy={y + 27.5}
                        r={8}
                        fill={hintColor}
                        opacity={0.45}
                      />
                    ) : null}
                    {cell === 1 ? (
                      <circle
                        cx={x + 27.5}
                        cy={y + 27.5}
                        r={20}
                        fill={blackFill}
                      />
                    ) : null}
                    {cell === 2 ? (
                      <circle
                        cx={x + 27.5}
                        cy={y + 27.5}
                        r={20}
                        fill={whiteFill}
                        stroke={whiteStroke}
                        strokeWidth={2}
                      />
                    ) : null}
                    <rect
                      x={x}
                      y={y}
                      width={55}
                      height={55}
                      fill="transparent"
                      role="button"
                      tabIndex={legal ? 0 : -1}
                      aria-label={
                        "第" +
                        (r + 1) +
                        "行第" +
                        (c + 1) +
                        "列" +
                        (cell === 1
                          ? " 黑子"
                          : cell === 2
                            ? " 白子"
                            : legal
                              ? " 可落子"
                              : " 空")
                      }
                      onClick={() => onCellClick(r, c)}
                      onKeyDown={(e: { key: string; preventDefault: () => void }) => {
                        if (e.key === "Enter" || e.key === " ") {
                          e.preventDefault();
                          onCellClick(r, c);
                        }
                      }}
                      style={{
                        cursor: legal ? "pointer" : "default",
                      }}
                    />
                  </g>
                );
              }),
            )}
          </svg>
        </div>
      </Section>

      <Section heading="玩法说明">
        <Text>
          人机模式可选先手（黑）或后手（白）。AI 使用两到三层极小极大搜索，兼顾角点、边缘与行动力，有一定挑战但不至于无解。切换模式或先后手会重新开局；刷新页面不保留棋局。
        </Text>
      </Section>
    </Page>
  );
}
