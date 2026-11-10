/** 从原版四子棋页抽出的落子与胜负规则。 */
export type Cell = 0 | 1 | 2;
export type Board = Cell[][];
export type Mode = "pvp" | "ai";
export type Side = 1 | 2;
export type WinLine = [number, number][];

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

export { emptyBoard, cloneBoard, opponent, dropRow, legalCols, applyDrop, findWin, isFull, COLS, ROWS };
