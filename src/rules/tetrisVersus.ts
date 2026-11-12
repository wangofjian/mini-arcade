/** 双人对战俄罗斯方块的纯规则：与单机版同一套旋转/踢墙/暂存/下落手感，另加种子七袋与垃圾行。 */

export type Kind = 'I' | 'O' | 'T' | 'S' | 'Z' | 'J' | 'L';
export type Piece = { kind: Kind; m: number[][]; x: number; y: number };
export type VersusStatus = 'ready' | 'running' | 'topout';
export type TopoutReason = 'lock-above' | 'spawn-blocked' | 'garbage-overflow';
export type PendingGarbage = { gap: number };

export type VersusGame = {
  board: number[][];
  p: Piece;
  queue: Kind[];
  bag: Kind[];
  hold: Kind | null;
  held: boolean;
  score: number;
  lines: number;
  level: number;
  status: VersusStatus;
  fall: number;
  ground: number;
  resets: number;
  pending: PendingGarbage[];
  seed: number;
  rng: () => number;
  topoutReason: TopoutReason | null;
};

export const KINDS: Kind[] = ['I', 'O', 'T', 'S', 'Z', 'J', 'L'];
export const SHAPES: Record<Kind, number[][]> = {
  I: [[0, 0, 0, 0], [1, 1, 1, 1], [0, 0, 0, 0], [0, 0, 0, 0]],
  O: [[1, 1], [1, 1]],
  T: [[0, 1, 0], [1, 1, 1], [0, 0, 0]],
  S: [[0, 1, 1], [1, 1, 0], [0, 0, 0]],
  Z: [[1, 1, 0], [0, 1, 1], [0, 0, 0]],
  J: [[1, 0, 0], [1, 1, 1], [0, 0, 0]],
  L: [[0, 0, 1], [1, 1, 1], [0, 0, 0]],
};
export const COLORS = ['', '#46dcf5', '#ffdc60', '#ba89ff', '#65e6a1', '#ff728e', '#729bff', '#ffae65'];
export const COLS = 10;
export const ROWS = 20;
export const KICKS: Array<[number, number]> = [[0, 0], [-1, 0], [1, 0], [-2, 0], [2, 0], [0, -1], [-1, -1], [1, -1], [0, -2]];
export const CLEAR_SCORE = [0, 100, 300, 500, 800];
export const GROUND_MS = 420;
export const SOFT_DROP_MS = 35;
export const MAX_LOCK_RESETS = 15;

export {
  ROOM_CODE_ALPHABET,
  ROOM_CODE_MIN_LEN,
  ROOM_CODE_MAX_LEN,
  ROOM_CODE_LEN,
  normalizeRoomCode,
  isValidRoomCode,
  generateRoomCode,
} from './roomCode';

export type BoardSnapshot = {
  board: number[][];
  piece: { kind: Kind; m: number[][]; x: number; y: number } | null;
  queue: Kind[];
  hold: Kind | null;
  score: number;
  lines: number;
  level: number;
  pending: number;
  status: VersusStatus;
};

export type LockResult = {
  cleared: number;
  garbageSent: number;
  gaps: number[];
  toppedOut: boolean;
  reason: TopoutReason | null;
};

/** 与单机版同一重力曲线：max(65, 850 * 0.8^(level-1))。 */
export function fallInterval(level: number, softDrop: boolean): number {
  if (softDrop) return SOFT_DROP_MS;
  return Math.max(65, 850 * Math.pow(0.8, Math.max(1, level) - 1));
}

/** 消 1 行不送垃圾，2/3/4 行分别送 1/2/4 行。 */
export function garbageForClears(cleared: number): number {
  if (cleared === 2) return 1;
  if (cleared === 3) return 2;
  if (cleared === 4) return 4;
  return 0;
}

/** Mulberry32，同一 seed 得到同一序列。 */
export function makeRng(seed: number): () => number {
  let s = seed >>> 0;
  return () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function newMatchSeed(): number {
  if (typeof crypto !== 'undefined' && crypto.getRandomValues) {
    const buf = new Uint32Array(1);
    crypto.getRandomValues(buf);
    return buf[0] >>> 0;
  }
  return (Math.floor(Math.random() * 0xffffffff) >>> 0) || 1;
}

export function emptyBoard(): number[][] {
  return Array.from({ length: ROWS }, () => Array(COLS).fill(0));
}

export function piece(kind: Kind): Piece {
  return { kind, m: SHAPES[kind].map((row) => row.slice()), x: kind === 'O' ? 4 : 3, y: -1 };
}

function refillBag(g: VersusGame): void {
  const bag = KINDS.slice();
  for (let i = 6; i > 0; i--) {
    const j = Math.floor(g.rng() * (i + 1));
    const tmp = bag[i]!;
    bag[i] = bag[j]!;
    bag[j] = tmp;
  }
  g.bag = bag;
}

export function take(g: VersusGame): Kind {
  if (!g.bag.length) refillBag(g);
  return g.bag.pop()!;
}

export function fits(g: VersusGame, p: Piece): boolean {
  for (let y = 0; y < p.m.length; y++) {
    for (let x = 0; x < p.m[y]!.length; x++) {
      if (!p.m[y]![x]) continue;
      const xx = p.x + x;
      const yy = p.y + y;
      if (xx < 0 || xx >= COLS || yy >= ROWS) return false;
      if (yy >= 0 && g.board[yy]![xx]) return false;
    }
  }
  return true;
}

export function ghostPiece(g: VersusGame): Piece {
  let ghost: Piece = { ...g.p, m: g.p.m };
  while (fits(g, { ...ghost, y: ghost.y + 1 })) ghost = { ...ghost, y: ghost.y + 1 };
  return ghost;
}

function markTopout(g: VersusGame, reason: TopoutReason): void {
  g.status = 'topout';
  g.topoutReason = reason;
}

export function spawn(g: VersusGame, kind?: Kind): boolean {
  g.p = piece(kind ?? g.queue.shift()!);
  if (kind === undefined) g.queue.push(take(g));
  g.fall = 0;
  g.ground = 0;
  g.resets = 0;
  if (!fits(g, g.p)) {
    markTopout(g, 'spawn-blocked');
    return false;
  }
  return true;
}

export function enqueueGarbage(g: VersusGame, gaps: number[]): void {
  for (const gap of gaps) {
    const col = ((gap % COLS) + COLS) % COLS;
    g.pending.push({ gap: col });
  }
}

/** 从底部推入垃圾行，每行一个缺口。若被挤出顶行的格子非空，则判顶出。 */
export function applyPendingGarbage(g: VersusGame): boolean {
  if (!g.pending.length) return false;
  const incoming = g.pending.splice(0, g.pending.length);
  const rows: number[][] = incoming.map((item) => {
    const row = Array(COLS).fill(8);
    row[item.gap] = 0;
    return row;
  });
  const dropped = g.board.splice(0, rows.length);
  g.board.push(...rows);
  if (dropped.some((row) => row.some(Boolean))) {
    markTopout(g, 'garbage-overflow');
    return true;
  }
  return false;
}

export function lock(g: VersusGame, gapRng?: () => number): LockResult {
  const result: LockResult = { cleared: 0, garbageSent: 0, gaps: [], toppedOut: false, reason: null };
  if (g.status !== 'running') {
    result.toppedOut = g.status === 'topout';
    result.reason = g.topoutReason;
    return result;
  }

  let above = false;
  g.p.m.forEach((row, y) => {
    row.forEach((v, x) => {
      if (!v) return;
      const yy = g.p.y + y;
      if (yy < 0) above = true;
      else g.board[yy]![g.p.x + x] = KINDS.indexOf(g.p.kind) + 1;
    });
  });
  if (above) {
    markTopout(g, 'lock-above');
    result.toppedOut = true;
    result.reason = 'lock-above';
    return result;
  }

  const keep = g.board.filter((row) => !row.every(Boolean));
  const cleared = ROWS - keep.length;
  if (cleared) {
    g.score += (CLEAR_SCORE[cleared] ?? 800) * g.level;
    g.lines += cleared;
    g.level = 1 + Math.floor(g.lines / 10);
  }
  g.board = [...Array.from({ length: cleared }, () => Array(COLS).fill(0)), ...keep];
  g.held = false;

  result.cleared = cleared;
  result.garbageSent = garbageForClears(cleared);
  const rand = gapRng ?? g.rng;
  for (let i = 0; i < result.garbageSent; i++) {
    result.gaps.push(Math.floor(rand() * COLS));
  }

  if (applyPendingGarbage(g)) {
    result.toppedOut = true;
    result.reason = g.topoutReason;
    return result;
  }

  if (!spawn(g)) {
    result.toppedOut = true;
    result.reason = g.topoutReason;
  }
  return result;
}

export function move(g: VersusGame, dx: number, dy: number): boolean {
  if (g.status !== 'running') return false;
  const next = { ...g.p, x: g.p.x + dx, y: g.p.y + dy };
  if (!fits(g, next)) return false;
  g.p = next;
  if (dx && g.resets < MAX_LOCK_RESETS) {
    g.ground = 0;
    g.resets++;
  }
  return true;
}

export function rotate(g: VersusGame, clockwise: boolean): boolean {
  if (g.status !== 'running' || g.p.kind === 'O') return false;
  const m = g.p.m;
  const n = m.length;
  const rotated = Array.from({ length: n }, (_, y) =>
    Array.from({ length: n }, (_, x) => (clockwise ? m[n - 1 - x]![y]! : m[x]![n - 1 - y]!)),
  );
  for (const [dx, dy] of KICKS) {
    const next = { ...g.p, m: rotated, x: g.p.x + dx, y: g.p.y + dy };
    if (fits(g, next)) {
      g.p = next;
      if (g.resets < MAX_LOCK_RESETS) {
        g.ground = 0;
        g.resets++;
      }
      return true;
    }
  }
  return false;
}

export function hardDrop(g: VersusGame, gapRng?: () => number): LockResult {
  let dist = 0;
  while (move(g, 0, 1)) dist++;
  g.score += dist * 2;
  return lock(g, gapRng);
}

export function hold(g: VersusGame): boolean {
  if (g.status !== 'running' || g.held) return false;
  const old = g.hold;
  g.hold = g.p.kind;
  spawn(g, old ?? undefined);
  g.held = true;
  return g.status === 'running';
}

/** 下落一格；软降计 1 分。返回是否锁定。 */
export function stepGravity(g: VersusGame, softDrop: boolean, gapRng?: () => number): LockResult | null {
  if (g.status !== 'running') return null;
  if (move(g, 0, 1)) {
    if (softDrop) g.score++;
    return null;
  }
  return lock(g, gapRng);
}

export function tickGame(g: VersusGame, dt: number, softDrop: boolean, gapRng?: () => number): LockResult | null {
  if (g.status !== 'running') return null;
  g.fall += dt;
  const interval = fallInterval(g.level, softDrop);
  let locked: LockResult | null = null;
  if (g.fall >= interval) {
    g.fall %= interval;
    locked = stepGravity(g, softDrop, gapRng);
  }
  if (g.status !== 'running') return locked;
  if (!fits(g, { ...g.p, y: g.p.y + 1 })) {
    g.ground += dt;
    if (g.ground >= GROUND_MS) return lock(g, gapRng);
  } else {
    g.ground = 0;
  }
  return locked;
}

export function snapshotOf(g: VersusGame): BoardSnapshot {
  return {
    board: g.board.map((row) => row.slice()),
    piece: g.status === 'topout' ? null : { kind: g.p.kind, m: g.p.m.map((row) => row.slice()), x: g.p.x, y: g.p.y },
    queue: g.queue.slice(),
    hold: g.hold,
    score: g.score,
    lines: g.lines,
    level: g.level,
    pending: g.pending.length,
    status: g.status,
  };
}

export function takeSequence(seed: number, count: number): Kind[] {
  const g = freshGame(seed);
  const kinds = [g.p.kind, ...g.queue];
  while (kinds.length < count) kinds.push(take(g));
  return kinds.slice(0, count);
}

export function freshGame(seed: number): VersusGame {
  const g: VersusGame = {
    board: emptyBoard(),
    p: piece('T'),
    queue: [],
    bag: [],
    hold: null,
    held: false,
    score: 0,
    lines: 0,
    level: 1,
    status: 'ready',
    fall: 0,
    ground: 0,
    resets: 0,
    pending: [],
    seed: seed >>> 0,
    rng: makeRng(seed),
    topoutReason: null,
  };
  g.p = piece(take(g));
  g.queue = [take(g), take(g), take(g)];
  return g;
}

export function startGame(g: VersusGame): void {
  if (g.status === 'ready') g.status = 'running';
}

/** 用同一 seed 重开一局（再赛时由服务器下发新 seed）。 */
export function restartGame(seed: number): VersusGame {
  const g = freshGame(seed);
  g.status = 'running';
  return g;
}

export function isSpawnBlocked(board: number[][], kind: Kind): boolean {
  const probe: VersusGame = {
    ...freshGame(1),
    board: board.map((row) => row.slice()),
    status: 'running',
  };
  return !fits(probe, piece(kind));
}

export function wouldLockAbove(p: Piece): boolean {
  for (let y = 0; y < p.m.length; y++) {
    for (let x = 0; x < p.m[y]!.length; x++) {
      if (p.m[y]![x] && p.y + y < 0) return true;
    }
  }
  return false;
}
