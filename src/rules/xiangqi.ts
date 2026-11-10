/** 从原版中国象棋页抽出的合法走法与将军检查。 */
export type Side = 'r' | 'b';
export type Kind = 'K' | 'A' | 'E' | 'H' | 'R' | 'C' | 'P';
export type Piece = { side: Side; kind: Kind };
export type Board = (Piece | null)[][];
export type Sq = { r: number; c: number };

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

export { initialBoard, cloneBoard, inBounds, inPalace, kingSquare, rawAttacks, isChecked, applyMove, rawDests, legalDests, hasLegal, LABELS, ROWS, COLS };
