/** 从原版泡泡龙页抽出的六邻接、消除与掉落规则。 */
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

export type Cell = number | null;
export type Grid = Cell[][];

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

export { colsInRow, inBounds, neighbors, emptyGrid, cloneGrid, sameGroup, ceilingConnected, resolveShot, reachedBottom, occupiedCount, COLOR_COUNT, DEATH_ROW, MAX_ROWS, START_ROWS, EVEN_COLS, ODD_COLS };
