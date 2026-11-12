/** 五子棋纯规则：15×15、自由规则（无禁手），连五或以上获胜，棋盘下满且未连五则为和棋。 */

export const BOARD_SIZE = 15;
export const CELL_COUNT = BOARD_SIZE * BOARD_SIZE;
export const DIRECTIONS: ReadonlyArray<readonly [number, number]> = [
  [1, 0],
  [0, 1],
  [1, 1],
  [1, -1],
];

/** 0 空，1 黑，2 白。 */
export type Stone = 0 | 1 | 2;
export type Seat = 0 | 1;
export type Point = { r: number; c: number };
export type RoomPhase = 'lobby' | 'playing' | 'result';
export type IllegalReason = 'out_of_bounds' | 'occupied' | 'not_your_turn' | 'game_over' | 'not_playing';

export function emptyBoard(): Stone[][] {
  return Array.from({ length: BOARD_SIZE }, () => Array<Stone>(BOARD_SIZE).fill(0));
}

export function cloneBoard(board: Stone[][]): Stone[][] {
  return board.map((row) => row.slice());
}

export function inBounds(r: number, c: number): boolean {
  return Number.isInteger(r) && Number.isInteger(c) && r >= 0 && r < BOARD_SIZE && c >= 0 && c < BOARD_SIZE;
}

export function stoneOfSeat(seat: Seat): 1 | 2 {
  return seat === 0 ? 1 : 2;
}

export function seatOfStone(stone: 1 | 2): Seat {
  return stone === 1 ? 0 : 1;
}

export function isBoardFull(board: Stone[][]): boolean {
  for (const row of board) {
    for (const cell of row) {
      if (cell === 0) return false;
    }
  }
  return board.length === BOARD_SIZE && board.every((row) => row.length === BOARD_SIZE);
}

/**
 * 从 (r,c) 起沿四个方向收集同色棋子。若某方向（含落点）达到五子或以上，返回该线坐标；否则空数组。
 * 与本地五子棋同一判定：自由规则，超过五子同样获胜。
 */
export function winningLine(board: Stone[][], r: number, c: number, stone: 1 | 2): number[][] {
  if (!inBounds(r, c) || board[r]![c] !== stone) return [];
  for (const [dr, dc] of DIRECTIONS) {
    const line: number[][] = [[r, c]];
    for (const step of [-1, 1]) {
      let y = r + dr * step;
      let x = c + dc * step;
      while (inBounds(y, x) && board[y]![x] === stone) {
        line.push([y, x]);
        y += dr * step;
        x += dc * step;
      }
    }
    if (line.length >= 5) return line;
  }
  return [];
}

export function illegalReason(
  board: Stone[][],
  r: number,
  c: number,
  seat: Seat,
  turn: Seat,
  phase: RoomPhase,
): IllegalReason | null {
  if (phase === 'result') return 'game_over';
  if (phase !== 'playing') return 'not_playing';
  if (seat !== turn) return 'not_your_turn';
  if (!inBounds(r, c)) return 'out_of_bounds';
  if (board[r]![c] !== 0) return 'occupied';
  return null;
}

export const ILLEGAL_MESSAGES: Record<IllegalReason, string> = {
  out_of_bounds: '落子超出棋盘。',
  occupied: '这个交叉点已经有棋子。',
  not_your_turn: '还没轮到你落子。',
  game_over: '本局已经结束。',
  not_playing: '对局尚未开始。',
};

export type PlaceSuccess = {
  ok: true;
  board: Stone[][];
  lastMove: Point;
  winningLine: number[][];
  winner: Seat | 'draw' | null;
  ended: boolean;
};

export type PlaceFailure = { ok: false; reason: IllegalReason };

export function placeStone(
  board: Stone[][],
  r: number,
  c: number,
  seat: Seat,
  turn: Seat,
  phase: RoomPhase,
): PlaceSuccess | PlaceFailure {
  const reason = illegalReason(board, r, c, seat, turn, phase);
  if (reason) return { ok: false, reason };
  const next = cloneBoard(board);
  const stone = stoneOfSeat(seat);
  next[r]![c] = stone;
  const line = winningLine(next, r, c, stone);
  if (line.length >= 5) {
    return { ok: true, board: next, lastMove: { r, c }, winningLine: line, winner: seat, ended: true };
  }
  if (isBoardFull(next)) {
    return { ok: true, board: next, lastMove: { r, c }, winningLine: [], winner: 'draw', ended: true };
  }
  return { ok: true, board: next, lastMove: { r, c }, winningLine: [], winner: null, ended: false };
}
