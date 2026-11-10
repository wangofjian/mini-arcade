/** 从原版飞行棋页抽出的走子与终点规则。 */
const PLAYERS = 4;
const PLANES = 4;
const TRACK_LEN = 52;
const SIDE = 13;
const HOME_END = 5;
const START = [0, 13, 26, 39];
const NAMES = ['红', '黄', '蓝', '绿'];
const CS = 28;
const X0 = 110;
const Y0 = 110;
const VBW = 600;
const VBH = 640;

export type Pos =
  | { at: 'hangar' }
  | { at: 'track'; i: number }
  | { at: 'home'; step: number }
  | { at: 'done' };

export type Piece = { id: string; color: number; slot: number; pos: Pos };

function trackPoints(): { x: number; y: number }[] {
  const raw: { x: number; y: number }[] = [];
  for (let i = 0; i < SIDE; i++) raw.push({ x: X0 + (SIDE - i) * CS, y: Y0 + SIDE * CS });
  for (let i = 0; i < SIDE; i++) raw.push({ x: X0, y: Y0 + (SIDE - i) * CS });
  for (let i = 0; i < SIDE; i++) raw.push({ x: X0 + i * CS, y: Y0 });
  for (let i = 0; i < SIDE; i++) raw.push({ x: X0 + SIDE * CS, y: Y0 + i * CS });
  const startLocal = 7;
  const pts: { x: number; y: number }[] = [];
  for (let i = 0; i < TRACK_LEN; i++) pts.push(raw[(startLocal + i) % TRACK_LEN]);
  return pts;
}

const TRACK = trackPoints();

function hangarPoint(color: number, slot: number): { x: number; y: number } {
  const corners = [
    { x: 36, y: Y0 + SIDE * CS + 36 },
    { x: X0 + SIDE * CS + 36, y: Y0 + SIDE * CS + 36 },
    { x: X0 + SIDE * CS + 36, y: 36 },
    { x: 36, y: 36 },
  ];
  const c = corners[color];
  const ox = (slot % 2) * 28 - 14;
  const oy = Math.floor(slot / 2) * 28 - 14;
  return { x: c.x + ox, y: c.y + oy };
}

function homePoint(color: number, step: number): { x: number; y: number } {
  const cx = X0 + (SIDE * CS) / 2;
  const cy = Y0 + (SIDE * CS) / 2;
  const entry = [
    TRACK[51],
    TRACK[(START[1] + 51) % TRACK_LEN],
    TRACK[(START[2] + 51) % TRACK_LEN],
    TRACK[(START[3] + 51) % TRACK_LEN],
  ][color];
  const t = (step + 1) / 6;
  return { x: entry.x + (cx - entry.x) * t, y: entry.y + (cy - entry.y) * t };
}

function donePoint(color: number, slot: number): { x: number; y: number } {
  const cx = X0 + (SIDE * CS) / 2;
  const cy = Y0 + (SIDE * CS) / 2;
  const a = (color * Math.PI) / 2 + slot * 0.4 - 0.6;
  return { x: cx + Math.cos(a) * 18, y: cy + Math.sin(a) * 18 };
}

function pieceXY(p: Piece): { x: number; y: number } {
  if (p.pos.at === 'hangar') return hangarPoint(p.color, p.slot);
  if (p.pos.at === 'track') return TRACK[p.pos.i];
  if (p.pos.at === 'home') return homePoint(p.color, p.pos.step);
  return donePoint(p.color, p.slot);
}

function maybeJump(pos: Pos, color: number): Pos {
  if (pos.at !== 'track') return pos;
  const start = START[color];
  const dist = (pos.i - start + TRACK_LEN) % TRACK_LEN;
  if (dist !== 0 && dist % 4 === 0 && dist + 4 <= 50) {
    return { at: 'track', i: (pos.i + 4) % TRACK_LEN };
  }
  return pos;
}

function homeDest(step: number, roll: number): Pos {
  const raw = step + roll;
  if (raw === HOME_END) return { at: 'done' };
  if (raw < HOME_END) return { at: 'home', step: raw };
  const back = HOME_END - (raw - HOME_END);
  if (back < 0) return { at: 'home', step: 0 };
  return { at: 'home', step: back };
}

function destination(pos: Pos, color: number, roll: number): Pos | null {
  if (pos.at === 'done') return null;
  if (pos.at === 'hangar') {
    return roll === 6 ? { at: 'track', i: START[color] } : null;
  }
  if (pos.at === 'track') {
    const start = START[color];
    const dist = (pos.i - start + TRACK_LEN) % TRACK_LEN;
    const next = dist + roll;
    if (next <= 50) return maybeJump({ at: 'track', i: (start + next) % TRACK_LEN }, color);
    return homeDest(0, next - 51);
  }
  return homeDest(pos.step, roll);
}

function applyMove(pieces: Piece[], id: string, roll: number): Piece[] | null {
  const src = pieces.find((p: Piece) => p.id === id);
  if (!src) return null;
  const dest = destination(src.pos, src.color, roll);
  if (!dest) return null;
  return pieces.map((p: Piece) => {
    if (p.id === src.id) return { ...p, pos: dest };
    if (
      dest.at === 'track' &&
      p.pos.at === 'track' &&
      p.pos.i === dest.i &&
      p.color !== src.color
    ) {
      return { ...p, pos: { at: 'hangar' } };
    }
    return p;
  });
}

function legalIds(pieces: Piece[], color: number, roll: number): string[] {
  return pieces
    .filter((p: Piece) => p.color === color && destination(p.pos, color, roll) !== null)
    .map((p: Piece) => p.id);
}

function allDone(pieces: Piece[], color: number): boolean {
  return pieces.filter((p: Piece) => p.color === color).every((p: Piece) => p.pos.at === 'done');
}


function newPieces(): Piece[] {
  const out: Piece[] = [];
  for (let c = 0; c < PLAYERS; c++) {
    for (let s = 0; s < PLANES; s++) {
      out.push({ id: c + '-' + s, color: c, slot: s, pos: { at: 'hangar' } });
    }
  }
  return out;
}
function rollDie(): number {
  return 1 + Math.floor(Math.random() * 6);
}
export { destination, homeDest, maybeJump, applyMove, legalIds, allDone, START, TRACK_LEN, HOME_END, newPieces, rollDie };
