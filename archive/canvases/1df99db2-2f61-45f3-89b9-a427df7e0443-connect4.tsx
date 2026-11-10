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
  useRef,
  useGrokTheme,
  type CSSProperties,
} from "grok/canvas";

type Cell = 0 | 1 | 2;
type Board = Cell[][];
type Mode = "pvp" | "ai";
type Side = 1 | 2;
type WinLine = [number, number][];

const COLS = 7;
const ROWS = 6;
const AI_DEPTH = 5;

const CENTER_WEIGHTS = [3, 4, 5, 7, 5, 4, 3];

function emptyBoard(): Board {
  return Array.from({ length: ROWS }, () => Array(COLS).fill(0) as Cell[]);
}

function cloneBoard(b: Board): Board {
  return b.map((row: Cell[]) => row.slice() as Cell[]);
}

function opponent(p: Side): Side {
  return p === 1 ? 2 : 1;
}

function dropRow(b: Board, col: number): number {
  for (let r = ROWS - 1; r >= 0; r--) {
    if (b[r][col] === 0) return r;
  }
  return -1;
}

function legalCols(b: Board): number[] {
  const cols: number[] = [];
  for (let c = 0; c < COLS; c++) {
    if (b[0][c] === 0) cols.push(c);
  }
  return cols;
}

function applyDrop(b: Board, col: number, p: Side): Board | null {
  const r = dropRow(b, col);
  if (r < 0) return null;
  const next = cloneBoard(b);
  next[r][col] = p;
  return next;
}

function inBounds(r: number, c: number): boolean {
  return r >= 0 && r < ROWS && c >= 0 && c < COLS;
}

function findWin(b: Board, p: Side): WinLine | null {
  const dirs: [number, number][] = [
    [0, 1],
    [1, 0],
    [1, 1],
    [1, -1],
  ];
  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < COLS; c++) {
      if (b[r][c] !== p) continue;
      for (const [dr, dc] of dirs) {
        const line: WinLine = [[r, c]];
        let ok = true;
        for (let i = 1; i < 4; i++) {
          const nr = r + dr * i;
          const nc = c + dc * i;
          if (!inBounds(nr, nc) || b[nr][nc] !== p) {
            ok = false;
            break;
          }
          line.push([nr, nc]);
        }
        if (ok) return line;
      }
    }
  }
  return null;
}

function isFull(b: Board): boolean {
  return legalCols(b).length === 0;
}

function windowScore(count: number, empty: number, opp: number): number {
  if (count === 4) return 100000;
  if (opp === 4) return -100000;
  if (count === 3 && empty === 1) return 120;
  if (count === 2 && empty === 2) return 20;
  if (count === 1 && empty === 3) return 3;
  if (opp === 3 && empty === 1) return -110;
  if (opp === 2 && empty === 2) return -15;
  return 0;
}

function scoreWindow(cells: Cell[], ai: Side): number {
  const human = opponent(ai);
  let count = 0;
  let empty = 0;
  let opp = 0;
  for (const v of cells) {
    if (v === ai) count++;
    else if (v === human) opp++;
    else empty++;
  }
  return windowScore(count, empty, opp);
}

function evaluate(b: Board, ai: Side): number {
  const winAi = findWin(b, ai);
  if (winAi) return 1000000;
  const winHu = findWin(b, opponent(ai));
  if (winHu) return -1000000;
  if (isFull(b)) return 0;

  let score = 0;
  for (let c = 0; c < COLS; c++) {
    for (let r = 0; r < ROWS; r++) {
      if (b[r][c] === ai) score += CENTER_WEIGHTS[c];
      else if (b[r][c] === opponent(ai)) score -= CENTER_WEIGHTS[c];
    }
  }

  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < COLS - 3; c++) {
      score += scoreWindow(
        [b[r][c], b[r][c + 1], b[r][c + 2], b[r][c + 3]],
        ai,
      );
    }
  }
  for (let c = 0; c < COLS; c++) {
    for (let r = 0; r < ROWS - 3; r++) {
      score += scoreWindow(
        [b[r][c], b[r + 1][c], b[r + 2][c], b[r + 3][c]],
        ai,
      );
    }
  }
  for (let r = 0; r < ROWS - 3; r++) {
    for (let c = 0; c < COLS - 3; c++) {
      score += scoreWindow(
        [b[r][c], b[r + 1][c + 1], b[r + 2][c + 2], b[r + 3][c + 3]],
        ai,
      );
    }
  }
  for (let r = 3; r < ROWS; r++) {
    for (let c = 0; c < COLS - 3; c++) {
      score += scoreWindow(
        [b[r][c], b[r - 1][c + 1], b[r - 2][c + 2], b[r - 3][c + 3]],
        ai,
      );
    }
  }
  return score;
}

function orderCols(cols: number[]): number[] {
  return cols.slice().sort((a: number, b: number) => CENTER_WEIGHTS[b] - CENTER_WEIGHTS[a]);
}

function minimax(
  b: Board,
  depth: number,
  maximizing: boolean,
  ai: Side,
  alpha: number,
  beta: number,
): number {
  const winAi = findWin(b, ai);
  if (winAi) return 1000000 + depth;
  const winHu = findWin(b, opponent(ai));
  if (winHu) return -1000000 - depth;
  const cols = legalCols(b);
  if (depth === 0 || cols.length === 0) return evaluate(b, ai);

  const ordered = orderCols(cols);
  if (maximizing) {
    let best = -Infinity;
    for (const col of ordered) {
      const next = applyDrop(b, col, ai);
      if (!next) continue;
      const score = minimax(next, depth - 1, false, ai, alpha, beta);
      if (score > best) best = score;
      if (score > alpha) alpha = score;
      if (beta <= alpha) break;
    }
    return best;
  }
  const human = opponent(ai);
  let best = Infinity;
  for (const col of ordered) {
    const next = applyDrop(b, col, human);
    if (!next) continue;
    const score = minimax(next, depth - 1, true, ai, alpha, beta);
    if (score < best) best = score;
    if (score < beta) beta = score;
    if (beta <= alpha) break;
  }
  return best;
}

function chooseAiMove(b: Board, ai: Side): number | null {
  const cols = legalCols(b);
  if (cols.length === 0) return null;

  for (const col of cols) {
    const next = applyDrop(b, col, ai);
    if (next && findWin(next, ai)) return col;
  }
  const human = opponent(ai);
  for (const col of cols) {
    const next = applyDrop(b, col, human);
    if (next && findWin(next, human)) return col;
  }

  const ordered = orderCols(cols);
  let bestCol = ordered[0];
  let bestScore = -Infinity;
  for (const col of ordered) {
    const next = applyDrop(b, col, ai);
    if (!next) continue;
    const score = minimax(next, AI_DEPTH - 1, false, ai, -Infinity, Infinity);
    const jitter = ((col * 17) % 5) * 0.01;
    const adj = score + jitter;
    if (adj > bestScore) {
      bestScore = adj;
      bestCol = col;
    }
  }
  return bestCol;
}

function cellKey(r: number, c: number): string {
  return r + "," + c;
}

export default function App() {
  const theme = useGrokTheme();
  const [mode, setMode] = useState<Mode>("ai");
  const [humanSide, setHumanSide] = useState<Side>(1);
  const [board, setBoard] = useState<Board>(() => emptyBoard());
  const [turn, setTurn] = useState<Side>(1);
  const [thinking, setThinking] = useState(false);
  const [winner, setWinner] = useState<Side | 0 | null>(null);
  const [winLine, setWinLine] = useState<WinLine | null>(null);
  const [message, setMessage] = useState("红方先行 · 点击列落下棋子");
  const [anim, setAnim] = useState<{ col: number; row: number; side: Side } | null>(null);
  const animTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const aiSide: Side = humanSide === 1 ? 2 : 1;
  const ended = winner !== null;
  const isAiTurn = mode === "ai" && turn === aiSide && !ended && !anim;

  const winSet = useMemo(() => {
    const s = new Set<string>();
    if (winLine) {
      for (const [r, c] of winLine) s.add(cellKey(r, c));
    }
    return s;
  }, [winLine]);

  const colsOpen = useMemo(() => legalCols(board), [board]);

  const clearAnimTimer = useCallback(() => {
    if (animTimer.current !== null) {
      clearTimeout(animTimer.current);
      animTimer.current = null;
    }
  }, []);

  const restart = useCallback(
    (nextMode?: Mode, nextHuman?: Side) => {
      clearAnimTimer();
      const m = nextMode ?? mode;
      const h = nextHuman ?? humanSide;
      setMode(m);
      setHumanSide(h);
      setBoard(emptyBoard());
      setTurn(1);
      setThinking(false);
      setWinner(null);
      setWinLine(null);
      setAnim(null);
      if (m === "ai") {
        setMessage(
          h === 1 ? "你执红先行 · 点击列落子" : "你执黄后手 · AI 先下",
        );
      } else {
        setMessage("双人对战 · 红方先行");
      }
    },
    [mode, humanSide, clearAnimTimer],
  );

  const finishBoard = useCallback((b: Board, justPlayed: Side) => {
    const line = findWin(b, justPlayed);
    if (line) {
      setWinner(justPlayed);
      setWinLine(line);
      if (mode === "ai") {
        if (justPlayed === humanSide) setMessage("你赢了！连成四子");
        else setMessage("AI 获胜 · 再试一局？");
      } else {
        setMessage((justPlayed === 1 ? "红方" : "黄方") + "获胜！");
      }
      setThinking(false);
      return true;
    }
    if (isFull(b)) {
      setWinner(0);
      setWinLine(null);
      setMessage("平局 · 棋盘已满");
      setThinking(false);
      return true;
    }
    return false;
  }, [mode, humanSide]);

  const commitDrop = useCallback(
    (col: number, p: Side) => {
      const r = dropRow(board, col);
      if (r < 0 || ended || thinking || anim) return;
      clearAnimTimer();
      setAnim({ col, row: r, side: p });
      animTimer.current = setTimeout(() => {
        const next = applyDrop(board, col, p);
        setAnim(null);
        animTimer.current = null;
        if (!next) return;
        setBoard(next);
        if (finishBoard(next, p)) return;
        const nextTurn = opponent(p);
        setTurn(nextTurn);
        if (mode === "ai" && nextTurn === aiSide) {
          setMessage("AI 思考中…");
        } else if (mode === "ai") {
          setMessage("轮到你落子");
        } else {
          setMessage((nextTurn === 1 ? "红方" : "黄方") + "落子");
        }
      }, 220);
    },
    [board, ended, thinking, anim, clearAnimTimer, finishBoard, mode, aiSide],
  );

  const onColumnClick = useCallback(
    (col: number) => {
      if (ended || thinking || anim) return;
      if (mode === "ai" && turn !== humanSide) return;
      if (board[0][col] !== 0) return;
      commitDrop(col, turn);
    },
    [ended, thinking, anim, mode, turn, humanSide, board, commitDrop],
  );

  useEffect(() => {
    if (!isAiTurn) return;
    setThinking(true);
    const timer = setTimeout(() => {
      const col = chooseAiMove(board, aiSide);
      setThinking(false);
      if (col === null) return;
      const r = dropRow(board, col);
      if (r < 0) return;
      clearAnimTimer();
      setAnim({ col, row: r, side: aiSide });
      animTimer.current = setTimeout(() => {
        const next = applyDrop(board, col, aiSide);
        setAnim(null);
        animTimer.current = null;
        if (!next) return;
        setBoard(next);
        if (finishBoard(next, aiSide)) return;
        setTurn(humanSide);
        setMessage("轮到你落子");
      }, 220);
    }, 420);
    return () => clearTimeout(timer);
  }, [isAiTurn, board, aiSide, clearAnimTimer, finishBoard, humanSide]);

  useEffect(() => {
    return () => clearAnimTimer();
  }, [clearAnimTimer]);

  const statusLine = ended
    ? message
    : thinking
      ? "AI 思考中…"
      : anim
        ? "棋子落下…"
        : message;

  const redFill = theme.dataviz.categorical[0];
  const yellowFill = theme.dataviz.categorical[1];
  const boardBg = theme.bg.subtle;
  const slotBg = theme.bg.base;
  const frameStroke = theme.border.strong;
  const winGlow = theme.text.accent;

  const controlsStyle: CSSProperties = {
    display: "flex",
    flexWrap: "wrap",
    gap: 12,
    alignItems: "center",
    color: theme.text.primary,
  };

  const statusStyle: CSSProperties = {
    display: "flex",
    flexWrap: "wrap",
    gap: 16,
    alignItems: "center",
    color: theme.text.primary,
    fontFamily: theme.font.family,
    fontSize: 15,
  };

  const discDot = (side: Side): CSSProperties => ({
    display: "inline-block",
    width: 14,
    height: 14,
    borderRadius: "50%",
    marginRight: 6,
    verticalAlign: "middle",
    background: side === 1 ? redFill : yellowFill,
    border: "1px solid " + theme.border.default,
  });

  const cellW = 56;
  const cellH = 56;
  const pad = 12;
  const headerH = 40;
  const svgW = pad * 2 + COLS * cellW;
  const svgH = pad * 2 + headerH + ROWS * cellH;

  const canPlay =
    !ended && !thinking && !anim && (mode === "pvp" || turn === humanSide);

  return (
    <Page
      title="四子棋"
      summary="经典 7×6 四子棋。双人对战或挑战带威胁启发的极小极大 AI，点击列落子，连成四子即胜。"
      width="wide"
      lang="zh-Hans"
    >
      <Section>
        <Text>
          轮流在七列中择一落下棋子，受重力落到该列最低空位。先在横、竖或斜方向连成四子者获胜；棋盘下满且无人连四则为平局。
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
                { value: "1", label: "先手（红）" },
                { value: "2", label: "后手（黄）" },
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
        <div style={statusStyle}>
          <span>
            <span style={discDot(1)} />
            红方
            {mode === "ai" && humanSide === 1 ? "（你）" : ""}
            {mode === "ai" && aiSide === 1 ? "（AI）" : ""}
          </span>
          <span>
            <span style={discDot(2)} />
            黄方
            {mode === "ai" && humanSide === 2 ? "（你）" : ""}
            {mode === "ai" && aiSide === 2 ? "（AI）" : ""}
          </span>
          <span aria-live="polite" style={{ color: theme.text.secondary }}>
            {statusLine}
          </span>
        </div>
      </Section>

      <Section>
        <div style={{ display: "flex", justifyContent: "center" }}>
          <svg
            viewBox={"0 0 " + svgW + " " + svgH}
            width="100%"
            role="group"
            aria-label="七列六行四子棋棋盘"
            style={{
              display: "block",
              maxHeight: "78vh",
              maxWidth: 520,
              touchAction: "manipulation",
              background: boardBg,
              borderRadius: 12,
              border: "1px solid " + theme.border.default,
            }}
          >
            <rect x={0} y={0} width={svgW} height={svgH} fill={boardBg} rx={12} />
            {Array.from({ length: COLS }, (_: unknown, c: number) => {
              const x = pad + c * cellW;
              const open = colsOpen.indexOf(c) >= 0;
              const interactive = canPlay && open;
              return (
                <g key={"head-" + c}>
                  <rect
                    x={x}
                    y={pad}
                    width={cellW}
                    height={headerH}
                    fill="transparent"
                    role="button"
                    tabIndex={interactive ? 0 : -1}
                    aria-label={
                      "第" +
                      (c + 1) +
                      "列" +
                      (open ? (interactive ? " 可落子" : "") : " 已满")
                    }
                    onClick={() => onColumnClick(c)}
                    onKeyDown={(e: { key: string; preventDefault: () => void }) => {
                      if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault();
                        onColumnClick(c);
                      }
                    }}
                    style={{ cursor: interactive ? "pointer" : "default" }}
                  />
                  <text
                    x={x + cellW / 2}
                    y={pad + headerH / 2 + 5}
                    textAnchor="middle"
                    fill={
                      interactive
                        ? theme.text.accent
                        : theme.text.tertiary
                    }
                    fontSize={14}
                    fontFamily={theme.font.family}
                    style={{ pointerEvents: "none" }}
                  >
                    {c + 1}
                  </text>
                  {interactive && !anim ? (
                    <circle
                      cx={x + cellW / 2}
                      cy={pad + 10}
                      r={6}
                      fill={turn === 1 ? redFill : yellowFill}
                      opacity={0.55}
                      style={{ pointerEvents: "none" }}
                    />
                  ) : null}
                </g>
              );
            })}
            <rect
              x={pad - 4}
              y={pad + headerH - 4}
              width={COLS * cellW + 8}
              height={ROWS * cellH + 8}
              rx={10}
              fill={theme.fill.secondary}
              stroke={frameStroke}
              strokeWidth={2}
            />
            {Array.from({ length: ROWS }, (_: unknown, r: number) =>
              Array.from({ length: COLS }, (_: unknown, c: number) => {
                const cx = pad + c * cellW + cellW / 2;
                const cy = pad + headerH + r * cellH + cellH / 2;
                const cell = board[r][c];
                const isWin = winSet.has(cellKey(r, c));
                const dropping =
                  anim && anim.col === c && anim.row === r ? anim.side : null;
                const show = dropping ?? (cell === 0 ? null : cell);
                const interactive = canPlay && board[0][c] === 0;
                return (
                  <g key={cellKey(r, c)}>
                    <circle
                      cx={cx}
                      cy={cy}
                      r={22}
                      fill={slotBg}
                      stroke={theme.border.subtle}
                      strokeWidth={1}
                    />
                    {show ? (
                      <circle
                        cx={cx}
                        cy={cy}
                        r={isWin ? 21 : 19}
                        fill={show === 1 ? redFill : yellowFill}
                        stroke={isWin ? winGlow : theme.border.default}
                        strokeWidth={isWin ? 4 : 1}
                        opacity={dropping ? 0.92 : 1}
                      />
                    ) : null}
                    <rect
                      x={pad + c * cellW}
                      y={pad + headerH + r * cellH}
                      width={cellW}
                      height={cellH}
                      fill="transparent"
                      role="button"
                      tabIndex={interactive && r === 0 ? 0 : -1}
                      aria-label={
                        "第" +
                        (r + 1) +
                        "行第" +
                        (c + 1) +
                        "列" +
                        (cell === 1
                          ? " 红子"
                          : cell === 2
                            ? " 黄子"
                            : interactive
                              ? " 可落子"
                              : " 空")
                      }
                      onClick={() => onColumnClick(c)}
                      onKeyDown={(e: {
                        key: string;
                        preventDefault: () => void;
                      }) => {
                        if (e.key === "Enter" || e.key === " ") {
                          e.preventDefault();
                          onColumnClick(c);
                        }
                      }}
                      style={{
                        cursor: interactive ? "pointer" : "default",
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
          人机模式可选先手（红）或后手（黄）。AI 使用约五层带剪枝的极小极大搜索，优先中心列并防范威胁连子，有一定挑战但不保证完美。切换模式或先后手会重新开局；刷新页面不保留棋局。
        </Text>
      </Section>
    </Page>
  );
}
