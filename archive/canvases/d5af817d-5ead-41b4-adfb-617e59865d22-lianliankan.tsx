import {
  Page,
  Section,
  Text,
  Button,
  useGrokTheme,
  useState,
  useEffect,
  useRef,
  useCallback,
  useMemo,
} from "grok/canvas";

type Point = { r: number; c: number };
type Status = "ready" | "playing" | "won" | "lost";

const ROWS = 8;
const COLS = 10;
const SHUFFLE_MAX = 3;
const TIME_LIMIT = 240;
const ICONS = [
  "🍎", "🍊", "🍋", "🍌", "🍉", "🍇", "🍓", "🍑", "🍒", "🥝",
  "🍍", "🥥", "🥕", "🌽", "🍄", "🎃", "🐶", "🐱", "🐭", "🐹",
];

function shuffleArray<T>(arr: T[]): T[] {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    const tmp = a[i];
    a[i] = a[j];
    a[j] = tmp;
  }
  return a;
}

function buildBoard(): (string | null)[][] {
  const tiles: string[] = [];
  for (let i = 0; i < (ROWS * COLS) / 2; i++) {
    const icon = ICONS[i % ICONS.length];
    tiles.push(icon, icon);
  }
  const shuffled = shuffleArray(tiles);
  const board: (string | null)[][] = [];
  let k = 0;
  for (let r = 0; r < ROWS; r++) {
    const row: (string | null)[] = [];
    for (let c = 0; c < COLS; c++) {
      row.push(shuffled[k++]);
    }
    board.push(row);
  }
  return board;
}

function cloneBoard(board: (string | null)[][]): (string | null)[][] {
  return board.map((row: (string | null)[]) => row.slice());
}

function cellEmpty(board: (string | null)[][], r: number, c: number): boolean {
  if (r < 0 || r >= ROWS || c < 0 || c >= COLS) return true;
  return board[r][c] === null;
}

function canStraight(
  board: (string | null)[][],
  r1: number,
  c1: number,
  r2: number,
  c2: number,
): boolean {
  if (r1 === r2) {
    const lo = Math.min(c1, c2);
    const hi = Math.max(c1, c2);
    for (let c = lo + 1; c < hi; c++) {
      if (!cellEmpty(board, r1, c)) return false;
    }
    return true;
  }
  if (c1 === c2) {
    const lo = Math.min(r1, r2);
    const hi = Math.max(r1, r2);
    for (let r = lo + 1; r < hi; r++) {
      if (!cellEmpty(board, r, c1)) return false;
    }
    return true;
  }
  return false;
}

function findPath(
  board: (string | null)[][],
  a: Point,
  b: Point,
): Point[] | null {
  if (a.r === b.r && a.c === b.c) return null;
  const work = cloneBoard(board);
  work[a.r][a.c] = null;
  work[b.r][b.c] = null;

  if (canStraight(work, a.r, a.c, b.r, b.c)) return [a, b];

  const oneCorners: Point[] = [
    { r: a.r, c: b.c },
    { r: b.r, c: a.c },
  ];
  for (let i = 0; i < oneCorners.length; i++) {
    const p = oneCorners[i];
    if (
      cellEmpty(work, p.r, p.c) &&
      canStraight(work, a.r, a.c, p.r, p.c) &&
      canStraight(work, p.r, p.c, b.r, b.c)
    ) {
      return [a, p, b];
    }
  }

  for (let c = -1; c <= COLS; c++) {
    const p: Point = { r: a.r, c };
    if (!cellEmpty(work, p.r, p.c)) continue;
    if (!canStraight(work, a.r, a.c, p.r, p.c)) continue;
    const q: Point = { r: b.r, c: p.c };
    if (
      cellEmpty(work, q.r, q.c) &&
      canStraight(work, p.r, p.c, q.r, q.c) &&
      canStraight(work, q.r, q.c, b.r, b.c)
    ) {
      return [a, p, q, b];
    }
  }

  for (let r = -1; r <= ROWS; r++) {
    const p: Point = { r, c: a.c };
    if (!cellEmpty(work, p.r, p.c)) continue;
    if (!canStraight(work, a.r, a.c, p.r, p.c)) continue;
    const q: Point = { r: p.r, c: b.c };
    if (
      cellEmpty(work, q.r, q.c) &&
      canStraight(work, p.r, p.c, q.r, q.c) &&
      canStraight(work, q.r, q.c, b.r, b.c)
    ) {
      return [a, p, q, b];
    }
  }

  return null;
}

function countPairs(board: (string | null)[][]): number {
  let n = 0;
  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < COLS; c++) {
      if (board[r][c] !== null) n++;
    }
  }
  return n / 2;
}

function hasAnyMove(board: (string | null)[][]): boolean {
  const cells: Point[] = [];
  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < COLS; c++) {
      if (board[r][c] !== null) cells.push({ r, c });
    }
  }
  for (let i = 0; i < cells.length; i++) {
    for (let j = i + 1; j < cells.length; j++) {
      const a = cells[i];
      const b = cells[j];
      if (board[a.r][a.c] !== board[b.r][b.c]) continue;
      if (findPath(board, a, b)) return true;
    }
  }
  return false;
}

function reshuffleBoard(board: (string | null)[][]): (string | null)[][] {
  const tiles: string[] = [];
  const empties: Point[] = [];
  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < COLS; c++) {
      const v = board[r][c];
      if (v === null) empties.push({ r, c });
      else tiles.push(v);
    }
  }
  const shuffled = shuffleArray(tiles);
  const next = board.map((row: (string | null)[]) => row.map(() => null as string | null));
  const slots: Point[] = [];
  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < COLS; c++) {
      if (board[r][c] !== null) slots.push({ r, c });
    }
  }
  for (let i = 0; i < shuffled.length; i++) {
    next[slots[i].r][slots[i].c] = shuffled[i];
  }
  return next;
}

function formatTime(sec: number): string {
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${m}:${s < 10 ? "0" : ""}${s}`;
}

function samePoint(a: Point | null, b: Point): boolean {
  return a !== null && a.r === b.r && a.c === b.c;
}

export default function App() {
  const theme = useGrokTheme();
  const [board, setBoard] = useState<(string | null)[][]>(() => buildBoard());
  const [selected, setSelected] = useState<Point | null>(null);
  const [line, setLine] = useState<Point[] | null>(null);
  const [score, setScore] = useState(0);
  const [pairsLeft, setPairsLeft] = useState(countPairs(buildBoard()));
  const [timeLeft, setTimeLeft] = useState(TIME_LIMIT);
  const [shuffles, setShuffles] = useState(SHUFFLE_MAX);
  const [status, setStatus] = useState<Status>("ready");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("点击两个相同图案，折线最多拐两个弯即可消除。");

  const boardRef = useRef(board);
  const statusRef = useRef(status);
  const busyRef = useRef(busy);
  const shufflesRef = useRef(shuffles);
  const timeLeftRef = useRef(timeLeft);
  const lineTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    boardRef.current = board;
  }, [board]);
  useEffect(() => {
    statusRef.current = status;
  }, [status]);
  useEffect(() => {
    busyRef.current = busy;
  }, [busy]);
  useEffect(() => {
    shufflesRef.current = shuffles;
  }, [shuffles]);
  useEffect(() => {
    timeLeftRef.current = timeLeft;
  }, [timeLeft]);

  useEffect(() => {
    if (status !== "playing") return;
    const id = setInterval(() => {
      setTimeLeft((t: number) => {
        if (t <= 1) {
          clearInterval(id);
          setStatus("lost");
          setMsg("时间到！再试一局，争取更快清盘。");
          return 0;
        }
        return t - 1;
      });
    }, 1000);
    return () => clearInterval(id);
  }, [status]);

  const restart = useCallback(() => {
    if (lineTimer.current) clearTimeout(lineTimer.current);
    const next = buildBoard();
    setBoard(next);
    setSelected(null);
    setLine(null);
    setScore(0);
    setPairsLeft(countPairs(next));
    setTimeLeft(TIME_LIMIT);
    setShuffles(SHUFFLE_MAX);
    setBusy(false);
    setStatus("playing");
    setMsg("游戏开始！找出可连通的一对图案。");
  }, []);

  const doShuffle = useCallback(() => {
    if (statusRef.current !== "playing" || busyRef.current) return;
    if (shufflesRef.current <= 0) {
      setMsg("重排次数已用完。");
      return;
    }
    let next = reshuffleBoard(boardRef.current);
    let tries = 0;
    while (!hasAnyMove(next) && countPairs(next) > 0 && tries < 40) {
      next = reshuffleBoard(next);
      tries++;
    }
    const left = shufflesRef.current - 1;
    setBoard(next);
    setSelected(null);
    setLine(null);
    setShuffles(left);
    setMsg(`已重排棋盘，剩余重排 ${left} 次。`);
  }, []);

  const finishMatch = useCallback((a: Point, b: Point, path: Point[], curScore: number) => {
    setLine(path);
    setBusy(true);
    setSelected(null);
    if (lineTimer.current) clearTimeout(lineTimer.current);
    lineTimer.current = setTimeout(() => {
      const next = cloneBoard(boardRef.current);
      next[a.r][a.c] = null;
      next[b.r][b.c] = null;
      const left = countPairs(next);
      const gained = 10;
      const newScore = curScore + gained;
      setBoard(next);
      setLine(null);
      setBusy(false);
      setPairsLeft(left);
      setScore(newScore);
      if (left === 0) {
        const bonus = Math.max(0, timeLeftRef.current) * 2;
        const finalScore = newScore + bonus;
        setScore(finalScore);
        setStatus("won");
        setMsg(`全部消除！基础分 ${newScore}，时间奖励 ${bonus}，总分 ${finalScore}。`);
        return;
      }
      if (!hasAnyMove(next)) {
        if (shufflesRef.current > 0) {
          setMsg("没有可消的牌了，试试「重排」。");
        } else {
          setStatus("lost");
          setMsg("死局且没有重排次数，本局结束。");
        }
      } else {
        setMsg(`消除成功！+${gained} 分，剩余 ${left} 对。`);
      }
    }, 420);
  }, []);

  const onTile = useCallback(
    (r: number, c: number) => {
      if (statusRef.current === "ready") {
        setStatus("playing");
        setMsg("游戏开始！找出可连通的一对图案。");
      }
      if (statusRef.current === "won" || statusRef.current === "lost") return;
      if (busyRef.current) return;
      const cur = boardRef.current;
      if (cur[r][c] === null) return;

      const point: Point = { r, c };
      if (!selected) {
        setSelected(point);
        setMsg("已选中一枚，再选相同图案。");
        return;
      }
      if (samePoint(selected, point)) {
        setSelected(null);
        setMsg("已取消选择。");
        return;
      }
      if (cur[selected.r][selected.c] !== cur[r][c]) {
        setSelected(point);
        setMsg("图案不同，已改选当前这枚。");
        return;
      }
      const path = findPath(cur, selected, point);
      if (!path) {
        setSelected(point);
        setMsg("连不通（超过两个转弯或被挡住），已改选。");
        return;
      }
      finishMatch(selected, point, path, score);
    },
    [selected, score, finishMatch],
  );

  const linePoints = useMemo(() => {
    if (!line) return "";
    return line
      .map((p: Point) => {
        const x = ((p.c + 0.5) / COLS) * 100;
        const y = ((p.r + 0.5) / ROWS) * 100;
        return `${x},${y}`;
      })
      .join(" ");
  }, [line]);

  const tip =
    status === "won"
      ? msg
      : status === "lost"
        ? msg
        : "规则：两点相同且路径最多拐两个弯（可走棋盘外空廊）即可消除。卡住时用「重排」。";

  return (
    <Page
      title="连连看"
      summary="经典连连看：点两个相同图案，折线最多两个转弯即可消除。限时四分钟，可重排三次。"
      lang="zh-Hans"
      width="wide"
    >
      <Text>{tip}</Text>
      <Section>
        <div
          style={{
            fontFamily: theme.font.family,
            color: theme.text.primary,
            display: "flex",
            flexWrap: "wrap",
            gap: 16,
            alignItems: "center",
          }}
        >
          <span>
            得分 <strong>{score}</strong>
          </span>
          <span>
            剩余 <strong>{pairsLeft}</strong> 对
          </span>
          <span>
            时间 <strong>{formatTime(timeLeft)}</strong>
          </span>
          <span>
            重排 <strong>{shuffles}</strong>
          </span>
          <Button label="重新开始" variant="primary" onClick={restart} />
          <Button
            label="重排"
            onClick={doShuffle}
            disabled={status !== "playing" || busy || shuffles <= 0}
          />
        </div>
        <div
          style={{
            height: 5,
            background: theme.bg.subtle,
            marginTop: 16,
            borderRadius: theme.radius.full,
            overflow: "hidden",
          }}
        >
          <div
            style={{
              height: "100%",
              width: `${(timeLeft / TIME_LIMIT) * 100}%`,
              background:
                timeLeft <= 30
                  ? theme.text.danger
                  : theme.dataviz.categorical[0],
              transition: "width 0.3s linear",
            }}
          />
        </div>
      </Section>
      <Section>
        <div
          style={{
            position: "relative",
            width: "100%",
            userSelect: "none",
            touchAction: "manipulation",
          }}
        >
          <div
            style={{
              display: "grid",
              gridTemplateColumns: `repeat(${COLS}, minmax(0, 1fr))`,
              gap: 4,
            }}
          >
            {board.map((row: (string | null)[], r: number) =>
              row.map((cell: string | null, c: number) => {
                const isSel = samePoint(selected, { r, c });
                const empty = cell === null;
                return (
                  <button
                    key={`${r}-${c}`}
                    type="button"
                    aria-label={empty ? "空位" : `图案 ${cell}`}
                    disabled={empty || busy || status === "won" || status === "lost"}
                    onClick={() => onTile(r, c)}
                    style={{
                      aspectRatio: "1",
                      minHeight: 36,
                      padding: 0,
                      border: `2px solid ${
                        isSel
                          ? theme.border.focus
                          : empty
                            ? "transparent"
                            : theme.border.subtle
                      }`,
                      borderRadius: theme.radius.md,
                      background: empty
                        ? "transparent"
                        : isSel
                          ? theme.fill.accentSubtle
                          : theme.bg.elevated,
                      color: theme.text.primary,
                      fontSize: "clamp(16px, 3.2vw, 28px)",
                      lineHeight: 1,
                      cursor: empty || busy ? "default" : "pointer",
                      touchAction: "manipulation",
                      opacity: empty ? 0 : 1,
                      boxShadow: isSel ? `0 0 0 1px ${theme.border.focus}` : "none",
                    }}
                  >
                    {empty ? "" : cell}
                  </button>
                );
              }),
            )}
          </div>
          {line && (
            <svg
              viewBox="-12 -12 124 124"
              preserveAspectRatio="none"
              style={{
                position: "absolute",
                left: 0,
                top: 0,
                width: "100%",
                height: "100%",
                pointerEvents: "none",
                overflow: "visible",
              }}
            >
              <polyline
                points={linePoints}
                fill="none"
                stroke={theme.dataviz.categorical[0]}
                strokeWidth="1.6"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              {line.map((p: Point, i: number) => (
                <circle
                  key={i}
                  cx={((p.c + 0.5) / COLS) * 100}
                  cy={((p.r + 0.5) / ROWS) * 100}
                  r="1.8"
                  fill={theme.dataviz.categorical[1]}
                />
              ))}
            </svg>
          )}
        </div>
      </Section>
      <Section>
        <Text>
          {status === "ready"
            ? "点击任意图案或「重新开始」开局。鼠标与触屏均可。"
            : status === "playing"
              ? msg
              : status === "won"
                ? msg
                : msg}
        </Text>
      </Section>
    </Page>
  );
}
