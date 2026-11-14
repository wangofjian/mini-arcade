/** 弯道冲刺：2D 俯视短道赛车。原创赛道与单位，不使用商业商标或素材。 */

export const CS_VIEW_W = 960;
export const CS_VIEW_H = 540;
export const CS_DT = 1 / 60;
export const CS_SAVE_KEY = 'curve-sprint-save';
export const CS_LEVEL_COUNT = 8;
export const CS_RADIUS = 13;
export const CS_MAX_SPEED = 280;
export const CS_OFF_MAX = 160;
export const CS_ACCEL = 260;
export const CS_BRAKE = 460;
export const CS_FRICTION = 70;
export const CS_OFF_FRICTION = 95;
export const CS_STEER = 2.55;
export const CS_NITRO_MAX = 1;
export const CS_NITRO_DRAIN = 0.5;
export const CS_NITRO_BOOST = 95;
export const CS_NITRO_SPEED = 70;
export const CS_DRIFT_MIN_SPEED = 115;
export const CS_DRIFT_MIN_TIME = 0.28;
export const CS_COUNTDOWN = 1.6;

export type Vec = { x: number; y: number };
export type CsPhase = 'countdown' | 'race' | 'won' | 'lost';
export type CsItem = 'oil' | 'shield' | null;
export type CsInput = {
  left: boolean;
  right: boolean;
  accel: boolean;
  brake: boolean;
  drift: boolean;
  nitro: boolean;
  item: boolean;
};

export type BuiltTrack = {
  id: string;
  name: string;
  pts: Vec[];
  cum: number[];
  length: number;
  halfWidth: number;
  wallWidth: number;
};

export type CsLevel = {
  id: number;
  name: string;
  hint: string;
  trackId: string;
  laps: number;
  aiCount: number;
  aiSkill: number;
  parTime: number;
  items: boolean;
};

export type CsKart = {
  id: number;
  name: string;
  color: string;
  isPlayer: boolean;
  skill: number;
  x: number;
  y: number;
  heading: number;
  speed: number;
  slip: number;
  nitro: number;
  drifting: boolean;
  driftTime: number;
  boostT: number;
  boostLock: number;
  shieldT: number;
  oilT: number;
  item: CsItem;
  itemHeld: boolean;
  s: number;
  dist: number;
  offTrack: boolean;
  lap: number;
  passedMid: boolean;
  finished: boolean;
  finishTime: number;
  place: number;
};

export type CsPickup = {
  kind: 'nitro' | 'crate';
  s: number;
  x: number;
  y: number;
  ready: number;
};

export type CsPuddle = { x: number; y: number; life: number };

export type CsMatch = {
  level: CsLevel;
  track: BuiltTrack;
  phase: CsPhase;
  countdown: number;
  time: number;
  acc: number;
  karts: CsKart[];
  pickups: CsPickup[];
  puddles: CsPuddle[];
  stars: number;
  score: number;
  message: string;
  rng: number;
};

export function wrapAngle(a: number): number {
  let x = a;
  while (x > Math.PI) x -= Math.PI * 2;
  while (x < -Math.PI) x += Math.PI * 2;
  return x;
}

function cr(p0: Vec, p1: Vec, p2: Vec, p3: Vec, t: number): Vec {
  const t2 = t * t;
  const t3 = t2 * t;
  return {
    x: 0.5 * ((2 * p1.x) + (-p0.x + p2.x) * t + (2 * p0.x - 5 * p1.x + 4 * p2.x - p3.x) * t2 + (-p0.x + 3 * p1.x - 3 * p2.x + p3.x) * t3),
    y: 0.5 * ((2 * p1.y) + (-p0.y + p2.y) * t + (2 * p0.y - 5 * p1.y + 4 * p2.y - p3.y) * t2 + (-p0.y + 3 * p1.y - 3 * p2.y + p3.y) * t3),
  };
}

function closedSpline(controls: Vec[], samples = 18): Vec[] {
  const n = controls.length;
  const out: Vec[] = [];
  for (let i = 0; i < n; i++) {
    const p0 = controls[(i - 1 + n) % n]!;
    const p1 = controls[i]!;
    const p2 = controls[(i + 1) % n]!;
    const p3 = controls[(i + 2) % n]!;
    for (let s = 0; s < samples; s++) out.push(cr(p0, p1, p2, p3, s / samples));
  }
  return out;
}

function buildTrack(id: string, name: string, controls: Vec[], halfWidth: number, wallExtra = 38, samples = 18): BuiltTrack {
  const raw = closedSpline(controls, samples);
  // drop near-duplicates
  const pts: Vec[] = [];
  for (const p of raw) {
    const last = pts[pts.length - 1];
    if (!last || Math.hypot(p.x - last.x, p.y - last.y) > 3) pts.push(p);
  }
  const cum = [0];
  for (let i = 0; i < pts.length; i++) {
    const a = pts[i]!;
    const b = pts[(i + 1) % pts.length]!;
    cum.push(cum[i]! + Math.hypot(b.x - a.x, b.y - a.y));
  }
  return { id, name, pts, cum, length: cum[cum.length - 1]!, halfWidth, wallWidth: halfWidth + wallExtra };
}

function ellipseControls(cx: number, cy: number, rx: number, ry: number, n: number, rot = 0): Vec[] {
  const out: Vec[] = [];
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2 + rot;
    out.push({ x: cx + Math.cos(a) * rx, y: cy + Math.sin(a) * ry });
  }
  return out;
}

/** 五条走线与弯道难度不同的原创赛道。 */
export const CS_TRACKS: Record<string, BuiltTrack> = {
  grove: buildTrack('grove', '林间环道', ellipseControls(500, 300, 350, 205, 14), 64, 40, 16),
  river: buildTrack(
    'river',
    '河湾折返',
    [
      { x: 180, y: 310 }, { x: 280, y: 175 }, { x: 460, y: 230 }, { x: 630, y: 130 },
      { x: 830, y: 200 }, { x: 930, y: 300 }, { x: 900, y: 430 }, { x: 720, y: 490 },
      { x: 550, y: 410 }, { x: 390, y: 500 }, { x: 230, y: 430 }, { x: 140, y: 340 },
    ],
    54,
    38,
    18,
  ),
  ridge: buildTrack(
    'ridge',
    '山脊发卡',
    [
      { x: 130, y: 470 }, { x: 420, y: 470 }, { x: 700, y: 470 }, { x: 810, y: 450 },
      { x: 860, y: 380 }, { x: 860, y: 300 }, { x: 810, y: 230 }, { x: 700, y: 210 },
      { x: 420, y: 210 }, { x: 130, y: 210 }, { x: 55, y: 250 }, { x: 40, y: 340 },
      { x: 55, y: 430 },
    ],
    50,
    38,
    16,
  ),
  harbor: buildTrack(
    'harbor',
    '港口折线',
    [
      { x: 120, y: 130 }, { x: 470, y: 130 }, { x: 530, y: 180 }, { x: 530, y: 290 },
      { x: 800, y: 290 }, { x: 850, y: 130 }, { x: 970, y: 130 }, { x: 1010, y: 190 },
      { x: 1010, y: 500 }, { x: 950, y: 550 }, { x: 650, y: 550 }, { x: 600, y: 500 },
      { x: 600, y: 390 }, { x: 350, y: 390 }, { x: 300, y: 550 }, { x: 120, y: 550 },
      { x: 70, y: 500 }, { x: 70, y: 190 },
    ],
    48,
    36,
    14,
  ),
  night: buildTrack(
    'night',
    '夜灯盘山',
    [
      { x: 150, y: 310 }, { x: 210, y: 150 }, { x: 400, y: 110 }, { x: 560, y: 210 },
      { x: 720, y: 110 }, { x: 910, y: 160 }, { x: 980, y: 310 }, { x: 900, y: 450 },
      { x: 730, y: 530 }, { x: 560, y: 440 }, { x: 410, y: 540 }, { x: 230, y: 490 },
      { x: 110, y: 400 },
    ],
    46,
    36,
    18,
  ),
};

export const CS_LEVELS: CsLevel[] = [
  { id: 1, name: '林间热身', hint: '按住加速，过弯时按住腰移，松开有短加速。', trackId: 'grove', laps: 2, aiCount: 2, aiSkill: 0.8, parTime: 19, items: false },
  { id: 2, name: '河湾练习', hint: 'S 弯提前轻转；出了草地再回到沥青。', trackId: 'river', laps: 2, aiCount: 2, aiSkill: 0.82, parTime: 20, items: false },
  { id: 3, name: '发卡初探', hint: '发卡弯要先收一点速度，再腰移拐过来。', trackId: 'ridge', laps: 3, aiCount: 2, aiSkill: 0.84, parTime: 30, items: true },
  { id: 4, name: '港口直角', hint: '折线弯多，注意氮气留给直道。可捡护盾或机油。', trackId: 'harbor', laps: 3, aiCount: 3, aiSkill: 0.85, parTime: 48, items: true },
  { id: 5, name: '盘山夜灯', hint: '赛道更窄更长，盯住前方弯道。', trackId: 'night', laps: 3, aiCount: 3, aiSkill: 0.8, parTime: 36, items: true },
  { id: 6, name: '河湾杯', hint: '同一条河湾再跑三圈，对手更积极。', trackId: 'river', laps: 3, aiCount: 3, aiSkill: 0.85, parTime: 30, items: true },
  { id: 7, name: '发卡杯', hint: '四圈发卡，把腰移用在刀刃上。', trackId: 'ridge', laps: 4, aiCount: 3, aiSkill: 0.86, parTime: 40, items: true },
  { id: 8, name: '冲刺总决赛', hint: '盘山四圈决赛。第一且在目标时间内可拿三星。', trackId: 'night', laps: 4, aiCount: 3, aiSkill: 0.87, parTime: 48, items: true },
];

const AI_NAMES = ['青柠', '橘瓣', '紫萤'];
const AI_COLORS = ['#d9843a', '#7a6bc4', '#c45c7a'];
const PLAYER_COLOR = '#2aa07a';

export function csLevelById(id: number): CsLevel | undefined {
  return CS_LEVELS.find((l) => l.id === id);
}

export function csTrackById(id: string): BuiltTrack {
  const t = CS_TRACKS[id];
  if (!t) throw new Error('未知赛道');
  return t;
}

export function pointAtS(track: BuiltTrack, sRaw: number): { x: number; y: number; tx: number; ty: number; nx: number; ny: number; s: number } {
  const len = track.length;
  let s = ((sRaw % len) + len) % len;
  const cum = track.cum;
  const pts = track.pts;
  let lo = 0;
  let hi = pts.length - 1;
  while (lo < hi) {
    const mid = Math.ceil((lo + hi) / 2);
    if (cum[mid]! <= s) lo = mid;
    else hi = mid - 1;
  }
  const i = lo;
  const a = pts[i]!;
  const b = pts[(i + 1) % pts.length]!;
  const seg = Math.max(1e-6, cum[i + 1]! - cum[i]!);
  const u = Math.min(1, Math.max(0, (s - cum[i]!) / seg));
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const inv = 1 / Math.hypot(dx, dy);
  const tx = dx * inv;
  const ty = dy * inv;
  return { x: a.x + dx * u, y: a.y + dy * u, tx, ty, nx: -ty, ny: tx, s };
}

export type CsProject = { s: number; dist: number; side: number; nx: number; ny: number; tx: number; ty: number; x: number; y: number };

export function project(track: BuiltTrack, x: number, y: number, nearS?: number): CsProject {
  const pts = track.pts;
  const n = pts.length;
  const len = track.length;
  let bestD = Infinity;
  let best: CsProject = { s: 0, dist: 0, side: 1, nx: 0, ny: 1, tx: 1, ty: 0, x, y };
  const prefer = nearS != null;
  const preferS = prefer ? ((nearS % len) + len) % len : 0;
  for (let i = 0; i < n; i++) {
    const a = pts[i]!;
    const b = pts[(i + 1) % n]!;
    const dx = b.x - a.x;
    const dy = b.y - a.y;
    const seg = dx * dx + dy * dy;
    const u = seg > 1e-8 ? Math.min(1, Math.max(0, ((x - a.x) * dx + (y - a.y) * dy) / seg)) : 0;
    const px = a.x + dx * u;
    const py = a.y + dy * u;
    const ddx = x - px;
    const ddy = y - py;
    let d = ddx * ddx + ddy * ddy;
    const s = track.cum[i]! + Math.sqrt(seg) * u;
    if (prefer) {
      let ds = Math.abs(s - preferS);
      if (ds > len / 2) ds = len - ds;
      // 偏向当前进度附近的投影，避免首尾接近时跳变
      d += (ds > 180 ? (ds - 180) * 8 : 0);
    }
    if (d < bestD) {
      bestD = d;
      const inv = 1 / Math.max(1e-6, Math.hypot(dx, dy));
      const tx = dx * inv;
      const ty = dy * inv;
      const nx = -ty;
      const ny = tx;
      const side = ddx * nx + ddy * ny >= 0 ? 1 : -1;
      best = { s, dist: Math.hypot(ddx, ddy), side, nx: nx * side, ny: ny * side, tx, ty, x: px, y: py };
    }
  }
  return best;
}

export function wrappedDelta(prev: number, next: number, len: number): number {
  let d = next - prev;
  if (d > len / 2) d -= len;
  if (d < -len / 2) d += len;
  return d;
}

export function curvatureAhead(track: BuiltTrack, s: number, look = 110): number {
  const a = pointAtS(track, s);
  const b = pointAtS(track, s + look);
  return wrapAngle(Math.atan2(b.ty, b.tx) - Math.atan2(a.ty, a.tx));
}

function nextRng(m: CsMatch): number {
  m.rng = (m.rng * 1664525 + 1013904223) >>> 0;
  return m.rng / 0xffffffff;
}

function makeKart(id: number, name: string, color: string, isPlayer: boolean, skill: number, track: BuiltTrack, slot: number, total: number): CsKart {
  const back = 28 + slot * 30;
  const s = (track.length - back) % track.length;
  const p = pointAtS(track, s);
  const lane = (slot - (total - 1) / 2) * 22;
  return {
    id, name, color, isPlayer, skill,
    x: p.x + p.nx * lane,
    y: p.y + p.ny * lane,
    heading: Math.atan2(p.ty, p.tx),
    speed: 0,
    slip: 0,
    nitro: isPlayer ? 0.45 : 0.3 + skill * 0.15,
    drifting: false,
    driftTime: 0,
    boostT: 0,
    boostLock: 0,
    shieldT: 0,
    oilT: 0,
    item: null,
    itemHeld: false,
    s,
    dist: Math.abs(lane),
    offTrack: false,
    lap: 0,
    passedMid: false,
    finished: false,
    finishTime: 0,
    place: slot + 1,
  };
}

function spawnPickups(track: BuiltTrack, items: boolean, rng: () => number): CsPickup[] {
  const out: CsPickup[] = [];
  const nitros = [0.18, 0.48, 0.78];
  for (const f of nitros) {
    const p = pointAtS(track, track.length * f);
    const side = rng() > 0.5 ? 1 : -1;
    out.push({ kind: 'nitro', s: track.length * f, x: p.x + p.nx * side * 16, y: p.y + p.ny * side * 16, ready: 0 });
  }
  if (items) {
    const crates = [0.32, 0.62, 0.9];
    for (const f of crates) {
      const p = pointAtS(track, track.length * f);
      const side = rng() > 0.5 ? 1 : -1;
      out.push({ kind: 'crate', s: track.length * f, x: p.x + p.nx * side * 14, y: p.y + p.ny * side * 14, ready: 0 });
    }
  }
  return out;
}

export function createCsMatch(levelId: number, opts?: { skipCountdown?: boolean }): CsMatch {
  const level = csLevelById(levelId);
  if (!level) throw new Error('未知关卡');
  const track = csTrackById(level.trackId);
  const m: CsMatch = {
    level, track,
    phase: opts?.skipCountdown ? 'race' : 'countdown',
    countdown: opts?.skipCountdown ? 0 : CS_COUNTDOWN,
    time: 0,
    acc: 0,
    karts: [],
    pickups: [],
    puddles: [],
    stars: 0,
    score: 0,
    message: opts?.skipCountdown ? '起步！' : '即将发车…',
    rng: (levelId * 9973 + 13) >>> 0,
  };
  const total = 1 + level.aiCount;
  m.karts.push(makeKart(0, '你', PLAYER_COLOR, true, 1, track, 0, total));
  for (let i = 0; i < level.aiCount; i++) {
    m.karts.push(makeKart(i + 1, AI_NAMES[i] ?? '对手', AI_COLORS[i] ?? '#888', false, level.aiSkill, track, i + 1, total));
  }
  m.pickups = spawnPickups(track, level.items, () => nextRng(m));
  assignPlaces(m);
  return m;
}

export function playerKart(m: CsMatch): CsKart {
  return m.karts[0]!;
}

export function csStars(place: number, time: number, parTime: number, finished: boolean): number {
  if (!finished) return 0;
  if (place === 1 && time <= parTime) return 3;
  if (place === 1) return 2;
  return 1;
}

export function progressOf(k: CsKart, track: BuiltTrack, laps: number): number {
  if (k.finished) return laps * track.length + track.length;
  return k.lap * track.length + k.s;
}

function assignPlaces(m: CsMatch) {
  const laps = m.level.laps;
  const len = m.track.length;
  const order = m.karts.map((k) => ({ k, p: k.finished ? laps * len + (10000 - k.finishTime) : k.lap * len + k.s }));
  order.sort((a, b) => b.p - a.p);
  order.forEach((o, i) => { o.k.place = i + 1; });
}

function finishKart(m: CsMatch, k: CsKart) {
  if (k.finished) return;
  k.finished = true;
  k.finishTime = m.time;
  k.speed *= 0.4;
  k.lap = m.level.laps;
  assignPlaces(m);
  if (k.isPlayer) {
    m.phase = 'won';
    m.stars = csStars(k.place, k.finishTime, m.level.parTime, true);
    m.score = Math.max(0, (4 - k.place) * 1000) + Math.max(0, Math.floor(m.level.parTime - k.finishTime)) * 8 + m.stars * 50;
    const placeText = k.place === 1 ? '第一名' : k.place === 2 ? '第二名' : k.place === 3 ? '第三名' : '第' + k.place + '名';
    m.message = '冲线！' + placeText + '  用时 ' + k.finishTime.toFixed(1) + 's  ' + '★'.repeat(m.stars);
  }
}

function useItem(m: CsMatch, k: CsKart) {
  if (!k.item) return;
  if (k.item === 'shield') {
    k.shieldT = Math.max(k.shieldT, 5);
    k.item = null;
    return;
  }
  if (k.item === 'oil') {
    const bx = k.x - Math.cos(k.heading) * 28;
    const by = k.y - Math.sin(k.heading) * 28;
    m.puddles.push({ x: bx, y: by, life: 7 });
    k.item = null;
  }
}

function tickPickups(m: CsMatch, dt: number) {
  for (const p of m.pickups) {
    if (p.ready > 0) {
      p.ready = Math.max(0, p.ready - dt);
      continue;
    }
    for (const k of m.karts) {
      if (k.finished) continue;
      if (Math.hypot(k.x - p.x, k.y - p.y) > CS_RADIUS + 11) continue;
      if (p.kind === 'nitro') {
        k.nitro = Math.min(CS_NITRO_MAX, k.nitro + 0.5);
      } else if (!k.item) {
        k.item = nextRng(m) < 0.5 ? 'oil' : 'shield';
      } else {
        continue;
      }
      p.ready = 6.5;
      break;
    }
  }
  m.puddles = m.puddles.filter((p) => {
    p.life -= dt;
    if (p.life <= 0) return false;
    for (const k of m.karts) {
      if (k.finished || k.oilT > 0) continue;
      if (Math.hypot(k.x - p.x, k.y - p.y) < CS_RADIUS + 16) {
        if (k.shieldT > 0) {
          k.shieldT = 0;
        } else {
          k.oilT = 1.15;
          k.speed *= 0.72;
        }
      }
    }
    return true;
  });
}

function collideKarts(m: CsMatch) {
  const ks = m.karts;
  for (let i = 0; i < ks.length; i++) {
    for (let j = i + 1; j < ks.length; j++) {
      const a = ks[i]!;
      const b = ks[j]!;
      // 完赛车不再挡路
      if (a.finished || b.finished) continue;
      const dx = b.x - a.x;
      const dy = b.y - a.y;
      const d = Math.hypot(dx, dy);
      const min = CS_RADIUS * 2;
      if (d < 1e-4 || d >= min) continue;
      const nx = dx / d;
      const ny = dy / d;
      const overlap = (min - d) * 0.5;
      a.x -= nx * overlap;
      a.y -= ny * overlap;
      b.x += nx * overlap;
      b.y += ny * overlap;
      // 只削掉相向分量，避免每帧把速度清零
      const closing = (b.speed - a.speed);
      const tap = Math.min(18, Math.abs(closing) * 0.15 + 2);
      if (a.shieldT <= 0) a.speed = Math.max(0, a.speed - tap * 0.5);
      if (b.shieldT <= 0) b.speed = Math.max(0, b.speed - tap * 0.5);
    }
  }
}

function stepKart(m: CsMatch, k: CsKart, dt: number, input: CsInput, canControl: boolean) {
  const track = m.track;
  if (k.finished) {
    k.speed = Math.max(0, k.speed - CS_FRICTION * 2.4 * dt);
    const side = project(track, k.x, k.y, k.s);
    // 滑到路肩外侧，给还未完赛的车让路
    if (side.dist < track.wallWidth - CS_RADIUS - 6) {
      k.x += side.nx * 36 * dt;
      k.y += side.ny * 36 * dt;
    }
    k.x += Math.cos(k.heading) * k.speed * dt;
    k.y += Math.sin(k.heading) * k.speed * dt;
    return;
  }

  if (k.oilT > 0) k.oilT = Math.max(0, k.oilT - dt);
  if (k.shieldT > 0) k.shieldT = Math.max(0, k.shieldT - dt);
  if (k.boostT > 0) k.boostT = Math.max(0, k.boostT - dt);
  if (k.boostLock > 0) k.boostLock = Math.max(0, k.boostLock - dt);

  const pr = project(track, k.x, k.y, k.s);
  k.dist = pr.dist;
  k.offTrack = pr.dist > track.halfWidth;
  const atWall = pr.dist > track.wallWidth - CS_RADIUS;

  if (canControl && input.item && !k.itemHeld) useItem(m, k);
  k.itemHeld = canControl && input.item;

  const steerIn = (canControl ? ((input.right ? 1 : 0) - (input.left ? 1 : 0)) : 0) + (k.oilT > 0 ? Math.sin(m.time * 17 + k.id) * 0.55 : 0);
  const wantDrift = canControl && input.drift && k.speed > CS_DRIFT_MIN_SPEED && Math.abs(steerIn) > 0.15 && !k.offTrack;
  if (wantDrift) {
    k.drifting = true;
    k.driftTime += dt;
    k.slip += steerIn * 1.8 * dt;
    k.slip = Math.max(-0.55, Math.min(0.55, k.slip));
  } else {
    if (k.drifting && k.driftTime >= CS_DRIFT_MIN_TIME && k.boostLock <= 0 && k.speed > CS_DRIFT_MIN_SPEED) {
      // 松开腰移：短加速，有冷却，不能无限连漂叠加速
      k.boostT = Math.min(0.52, 0.22 + Math.min(0.9, k.driftTime) * 0.28);
      k.boostLock = k.boostT + 0.22;
      k.nitro = Math.min(CS_NITRO_MAX, k.nitro + 0.08);
    }
    k.drifting = false;
    k.driftTime = 0;
    k.slip *= Math.max(0, 1 - 6 * dt);
  }

  const steerMul = k.drifting ? 1.62 : 1;
  const speedFactor = 0.45 + 0.55 * Math.min(1, k.speed / (CS_MAX_SPEED * 0.7));
  k.heading += steerIn * CS_STEER * steerMul * speedFactor * dt * (k.oilT > 0 ? 0.65 : 1);

  const onAsphalt = !k.offTrack;
  let maxSp = onAsphalt ? CS_MAX_SPEED : CS_OFF_MAX;
  if (!k.isPlayer) maxSp *= 0.76 + k.skill * 0.14;
  let accel = 0;
  if (canControl && input.accel && !input.brake) accel += onAsphalt ? CS_ACCEL : CS_ACCEL * 0.62;
  if (canControl && input.brake) accel -= CS_BRAKE;
  if (canControl && input.nitro && k.nitro > 0 && !k.offTrack) {
    accel += CS_NITRO_BOOST * 2.1;
    maxSp += CS_NITRO_SPEED;
    k.nitro = Math.max(0, k.nitro - CS_NITRO_DRAIN * dt);
  }
  if (k.boostT > 0 && !k.offTrack) {
    accel += 340;
    maxSp += 55;
  }
  if (k.drifting) accel -= 40;
  const fric = onAsphalt ? CS_FRICTION : CS_OFF_FRICTION;
  if (accel >= 0) {
    k.speed += accel * dt;
    k.speed -= fric * dt;
  } else {
    k.speed += accel * dt;
  }
  k.speed = Math.max(0, Math.min(maxSp, k.speed));

  const moveH = k.heading + k.slip * 0.85;
  k.x += Math.cos(moveH) * k.speed * dt;
  k.y += Math.sin(moveH) * k.speed * dt;

  const pr2 = project(track, k.x, k.y, k.s);
  if (pr2.dist > track.halfWidth) {
    // 出界后轻微拉回赛道，仍可自行开回来
    const pull = Math.min(40, 18 + (pr2.dist - track.halfWidth) * 0.8);
    k.x -= pr2.nx * pull * dt;
    k.y -= pr2.ny * pull * dt;
  }
  if (pr2.dist > track.wallWidth - CS_RADIUS) {
    const overflow = pr2.dist - (track.wallWidth - CS_RADIUS);
    k.x -= pr2.nx * (overflow + 0.4);
    k.y -= pr2.ny * (overflow + 0.4);
    if (k.shieldT > 0) {
      k.speed *= 0.82;
    } else {
      k.speed *= 0.52;
    }
    // 略微把朝向扳回赛道切线，便于重回赛道
    k.heading += wrapAngle(Math.atan2(pr2.ty, pr2.tx) - k.heading) * 0.25;
  }

  const pr3 = project(track, k.x, k.y, k.s);
  k.dist = pr3.dist;
  k.offTrack = pr3.dist > track.halfWidth;
  const ds = wrappedDelta(k.s, pr3.s, track.length);
  // 丢弃异常大跳跃（除过线外）
  if (Math.abs(ds) < 220) {
    const prev = k.s;
    k.s = pr3.s;
    const rel = k.s / track.length;
    if (rel > 0.42 && rel < 0.62) k.passedMid = true;
    if (k.passedMid && ds >= -30) {
      const crossed = prev > track.length * 0.68 && k.s < track.length * 0.32;
      if (crossed) {
        k.lap += 1;
        k.passedMid = false;
        if (k.lap >= m.level.laps) finishKart(m, k);
      }
    }
  }
}

function aiInput(m: CsMatch, k: CsKart): CsInput {
  const track = m.track;
  const skill = k.skill;
  const look = 70 + k.speed * (0.18 + skill * 0.14);
  const inside = -Math.sign(curvatureAhead(track, k.s, 90)) * (8 + skill * 8);
  const ahead = pointAtS(track, k.s + look);
  const tx = ahead.x + ahead.nx * inside - k.x;
  const ty = ahead.y + ahead.ny * inside - k.y;
  const want = Math.atan2(ty, tx);
  const err = wrapAngle(want - k.heading);
  const curve = curvatureAhead(track, k.s, 100 + (1 - skill) * 40);
  const sharp = Math.abs(curve) > 0.28 + (1 - skill) * 0.12;
  const verySharp = Math.abs(curve) > 0.5;
  const nitroStraight = Math.abs(curve) < 0.16 && k.nitro > 0.12 && k.speed > 140 && skill > 0.78;
  return {
    left: err < -0.03,
    right: err > 0.03,
    accel: !(verySharp && k.speed > CS_MAX_SPEED * (0.72 + skill * 0.1)),
    brake: verySharp && k.speed > CS_MAX_SPEED * (0.68 + skill * 0.08),
    drift: sharp && k.speed > CS_DRIFT_MIN_SPEED && Math.abs(err) > 0.06,
    nitro: nitroStraight,
    item: !!k.item && (k.item === 'shield' || (k.item === 'oil' && k.place === 1)),
  };
}

export function autoInput(m: CsMatch, k: CsKart): CsInput {
  const track = m.track;
  const pr = project(track, k.x, k.y, k.s);
  const look = 100 + k.speed * 0.3;
  const curve = curvatureAhead(track, k.s, 125);
  const wide = pr.dist > track.halfWidth * 0.45;
  const inside = wide || k.offTrack ? 0 : -Math.sign(curve) * 7;
  const ahead = pointAtS(track, k.s + look);
  // pr.nx 指向车辆一侧：把它拉回中线，避免骑路肩
  const recover = (k.offTrack ? 28 : Math.max(0, pr.dist - 6) * 1.15);
  const tx = ahead.x + ahead.nx * inside - pr.nx * recover - k.x;
  const ty = ahead.y + ahead.ny * inside - pr.ny * recover - k.y;
  const err = wrapAngle(Math.atan2(ty, tx) - k.heading);
  const sharp = Math.abs(curve) > 0.28;
  const verySharp = Math.abs(curve) > 0.55;
  return {
    left: err < -0.02,
    right: err > 0.02,
    accel: k.speed < 40 || !(verySharp && k.speed > 235) || k.offTrack,
    brake: verySharp && k.speed > 255 && !k.offTrack,
    drift: sharp && !k.offTrack && !wide && k.speed > CS_DRIFT_MIN_SPEED && Math.abs(err) > 0.05,
    nitro: !sharp && !k.offTrack && k.nitro > 0.1 && k.speed > 140,
    item: k.item === 'shield' || (k.item === 'oil' && k.place > 1),
  };
}

function stepFixed(m: CsMatch, dt: number, playerInput: CsInput, autoPlayer = false) {
  if (m.phase === 'won' || m.phase === 'lost') {
    for (const k of m.karts) {
      if (!k.finished) stepKart(m, k, dt, k.isPlayer ? { left: false, right: false, accel: false, brake: true, drift: false, nitro: false, item: false } : aiInput(m, k), true);
    }
    return;
  }
  if (m.phase === 'countdown') {
    m.countdown -= dt;
    if (m.countdown <= 0) {
      m.phase = 'race';
      m.countdown = 0;
      m.time = 0;
      m.message = '起步！';
    } else {
      m.message = m.countdown > 1 ? '准备 ' + Math.ceil(m.countdown) : '出发！';
    }
    return;
  }
  m.time += dt;
  for (const k of m.karts) {
    const inp = k.isPlayer ? (autoPlayer ? autoInput(m, k) : playerInput) : aiInput(m, k);
    stepKart(m, k, dt, inp, true);
  }
  collideKarts(m);
  tickPickups(m, dt);
  assignPlaces(m);
  if (m.phase === 'race') {
    const p = playerKart(m);
    const wrong = wrapAngle(p.heading - Math.atan2(project(m.track, p.x, p.y, p.s).ty, project(m.track, p.x, p.y, p.s).tx));
    if (Math.abs(wrong) > 2.1 && p.speed > 40) m.message = '方向反了！调头回到赛道。';
    else if (p.offTrack) m.message = '出界了，把车开回赛道。';
    else m.message = '第' + p.place + '名  ' + Math.min(p.lap + 1, m.level.laps) + '/' + m.level.laps + ' 圈';
  }
}

const EMPTY_INPUT: CsInput = { left: false, right: false, accel: false, brake: false, drift: false, nitro: false, item: false };

/** 推进一场对局。暂停时不要调用。dt 会被夹到 0.05s，避免切回前台时爆炸。 */
export function tickCs(m: CsMatch, dt: number, input: CsInput, autoPlayer = false) {
  const sliced = Math.max(0, Math.min(dt, 0.05));
  if (sliced <= 0) return;
  m.acc += sliced;
  const guard = 8;
  let n = 0;
  while (m.acc >= CS_DT && n < guard) {
    m.acc -= CS_DT;
    n++;
    stepFixed(m, CS_DT, input, autoPlayer);
  }
}

export function stepCs(m: CsMatch, seconds: number, input: CsInput = EMPTY_INPUT, autoPlayer = false) {
  const steps = Math.ceil(seconds / CS_DT);
  for (let i = 0; i < steps; i++) {
    if (m.phase === 'won' && playerKart(m).finished) {
      // 仍让时间推进少许也可以直接返回
      return;
    }
    stepFixed(m, CS_DT, input, autoPlayer);
  }
}

export function autoPlayCs(levelId: number, limit = 180): CsMatch {
  const m = createCsMatch(levelId, { skipCountdown: true });
  const steps = Math.ceil(limit / CS_DT);
  for (let i = 0; i < steps; i++) {
    if (playerKart(m).finished) break;
    stepFixed(m, CS_DT, EMPTY_INPUT, true);
  }
  return m;
}

export function csScore(m: CsMatch): number {
  return m.score;
}
