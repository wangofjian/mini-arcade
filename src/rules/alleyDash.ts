/** 街巷快送：俯视小街区接客送达，越快越多钱（原创街区与客人，非开放世界）。 */

import { parseLevelSave, type LevelSave } from './progressSave';

export const AL_VIEW_W = 960;
export const AL_VIEW_H = 540;
export const AL_DT = 1 / 60;
export const AL_SAVE_KEY = 'alley-dash-save';
export const AL_LEVEL_COUNT = 8;
export const AL_CAR_R = 13;
export const AL_PICK_R = 40;
export const AL_MAX_SPEED = 268;
export const AL_ACCEL = 300;
export const AL_BRAKE = 560;
export const AL_FRICTION = 90;
export const AL_STEER = 2.85;
export const AL_HIT_PENALTY = 2;
export const AL_HIT_LOCK = 0.7;

export type FareKind = 'near' | 'far' | 'urgent';
export type AlPhase = 'countdown' | 'play' | 'won' | 'lost';

export type AlInput = {
  left: boolean;
  right: boolean;
  accel: boolean;
  brake: boolean;
  drift: boolean;
  nitro: boolean;
};

export const EMPTY_AL_INPUT: AlInput = {
  left: false, right: false, accel: false, brake: false, drift: false, nitro: false,
};

export type AlRect = { x: number; y: number; w: number; h: number };
export type AlStand = { id: number; x: number; y: number; name: string };
export type AlRoute = { pts: { x: number; y: number }[]; speed: number };

export type AlMap = {
  id: string;
  name: string;
  w: number;
  h: number;
  buildings: AlRect[];
  stands: AlStand[];
  routes: AlRoute[];
  spawn: { x: number; y: number; heading: number };
};

export type AlFareDef = { pick: number; drop: number; kind: FareKind };

export type AlLevel = {
  id: number;
  name: string;
  mapId: string;
  hint: string;
  time: number;
  target: number;
  starTime: number;
  traffic: number;
  fares: AlFareDef[];
  offer: number;
};

export type AlCar = {
  x: number;
  y: number;
  heading: number;
  speed: number;
  drifting: boolean;
  driftTime: number;
  boostT: number;
  boostLock: number;
  nitro: number;
  hitLock: number;
};

export type AlTraffic = {
  x: number;
  y: number;
  heading: number;
  speed: number;
  route: number;
  seg: number;
  dir: 1 | -1;
  r: number;
};

export type AlFare = {
  id: number;
  kind: FareKind;
  pick: number;
  drop: number;
  base: number;
  tip: number;
  allotted: number;
  remain: number;
  guest: string;
  status: 'offer' | 'carry' | 'done' | 'failed' | 'queue';
};

export type AlMatch = {
  level: AlLevel;
  map: AlMap;
  phase: AlPhase;
  phaseT: number;
  time: number; // remaining
  money: number;
  stars: number;
  message: string;
  car: AlCar;
  camX: number;
  camY: number;
  traffic: AlTraffic[];
  fares: AlFare[];
  carrying: number | null;
  delivered: number;
  hits: number;
  penaltyTime: number;
  acc: number;
  rng: { s: number };
  path: { x: number; y: number }[];
  pathI: number;
  stuckT: number;
  lastX: number;
  lastY: number;
  finished: boolean;
  leftover: number;
};

export const FARE_SPEC: Record<FareKind, { label: string; base: number; tip: number; time: number }> = {
  near: { label: '近程', base: 120, tip: 80, time: 18 },
  far: { label: '远程', base: 200, tip: 140, time: 26 },
  urgent: { label: '加急', base: 190, tip: 160, time: 13 },
};

const GUESTS = ['阿棠', '小澜', '老槐', '周晚', '苗青', '石豆', '荷嫂', '方寸', '裴北', '蓝果', '岑秋', '芮南'];

export function alStars(money: number, target: number, leftover: number, starTime: number, delivered: number, finished: boolean): number {
  if (money >= target) return leftover >= starTime ? 3 : 2;
  if (finished && delivered >= 1) return 1;
  return 0;
}

export function farePayout(kind: FareKind, remain: number, allotted: number): number {
  const spec = FARE_SPEC[kind];
  const t = allotted <= 0 ? 0 : Math.max(0, Math.min(1, remain / allotted));
  return Math.floor(spec.base + spec.tip * t);
}

function rnd(r: { s: number }): number {
  r.s = (Math.imul(r.s, 1664525) + 1013904223) >>> 0;
  return r.s / 4294967296;
}

function clamp(n: number, a: number, b: number): number {
  return Math.max(a, Math.min(b, n));
}

export function wrapAngle(a: number): number {
  while (a > Math.PI) a -= Math.PI * 2;
  while (a < -Math.PI) a += Math.PI * 2;
  return a;
}

function dist(ax: number, ay: number, bx: number, by: number): number {
  return Math.hypot(ax - bx, ay - by);
}

function hitRect(x: number, y: number, r: number, b: AlRect): boolean {
  const qx = clamp(x, b.x, b.x + b.w);
  const qy = clamp(y, b.y, b.y + b.h);
  return Math.hypot(x - qx, y - qy) < r;
}

export function blocked(map: AlMap, x: number, y: number, r = AL_CAR_R): boolean {
  if (x - r < 8 || y - r < 8 || x + r > map.w - 8 || y + r > map.h - 8) return true;
  for (const b of map.buildings) if (hitRect(x, y, r, b)) return true;
  return false;
}

function splitBlock(x: number, y: number, w: number, h: number, alley?: { x: number; y: number; w: number; h: number }): AlRect[] {
  if (!alley) return [{ x, y, w, h }];
  const out: AlRect[] = [];
  const ax = alley.x, ay = alley.y, aw = alley.w, ah = alley.h;
  // four around the alley, only keep positive area
  const parts = [
    { x, y, w: ax - x, h },
    { x: ax + aw, y, w: x + w - (ax + aw), h },
    { x: Math.max(x, ax), y, w: Math.min(x + w, ax + aw) - Math.max(x, ax), h: ay - y },
    { x: Math.max(x, ax), y: ay + ah, w: Math.min(x + w, ax + aw) - Math.max(x, ax), h: y + h - (ay + ah) },
  ];
  for (const p of parts) if (p.w > 2 && p.h > 2) out.push(p);
  return out;
}

function loopRoute(pts: { x: number; y: number }[], speed: number): AlRoute {
  return { pts, speed };
}

function buildNanbu(): AlMap {
  // 3×2 blocks, 80px roads, alleys cutting three blocks
  const buildings: AlRect[] = [];
  const blocks = [
    { x: 120, y: 120, w: 200, h: 200, alley: { x: 200, y: 120, w: 40, h: 200 } }, // vertical shortcut
    { x: 400, y: 120, w: 200, h: 200 },
    { x: 680, y: 120, w: 200, h: 200, alley: { x: 680, y: 200, w: 200, h: 40 } }, // horizontal
    { x: 120, y: 400, w: 200, h: 200, alley: { x: 120, y: 480, w: 200, h: 40 } },
    { x: 400, y: 400, w: 200, h: 200, alley: { x: 480, y: 400, w: 40, h: 200 } },
    { x: 680, y: 400, w: 200, h: 200 },
  ];
  for (const b of blocks) buildings.push(...splitBlock(b.x, b.y, b.w, b.h, b.alley));
  const xs = [80, 360, 640, 920];
  const ys = [80, 360, 640];
  const names = ['北门', '南埠口', '槐街', '灯角', '井台', '中巷', '菜市', '东口', '石阶', '河弯', '旧厂', '南闸'];
  const stands: AlStand[] = [];
  let id = 0;
  for (const y of ys) for (const x of xs) stands.push({ id: id, x, y, name: names[id++] });
  const routes: AlRoute[] = [
    loopRoute([{ x: 80, y: 80 }, { x: 920, y: 80 }, { x: 920, y: 360 }, { x: 80, y: 360 }], 90),
    loopRoute([{ x: 80, y: 640 }, { x: 920, y: 640 }, { x: 920, y: 360 }, { x: 80, y: 360 }], 85),
    loopRoute([{ x: 80, y: 80 }, { x: 80, y: 640 }], 80),
    loopRoute([{ x: 640, y: 80 }, { x: 640, y: 640 }], 95),
  ];
  return { id: 'nanbu', name: '南埠巷', w: 1000, h: 720, buildings, stands, routes, spawn: { x: 80, y: 80, heading: 0 } };
}

function buildHeyan(): AlMap {
  // River across the middle with two road bridges and one alley bridge
  const buildings: AlRect[] = [];
  const blocks = [
    { x: 120, y: 110, w: 200, h: 170, alley: { x: 200, y: 110, w: 40, h: 170 } },
    { x: 400, y: 110, w: 200, h: 170 },
    { x: 680, y: 110, w: 200, h: 170, alley: { x: 680, y: 180, w: 200, h: 36 } },
    { x: 120, y: 430, w: 200, h: 180, alley: { x: 120, y: 500, w: 200, h: 40 } },
    { x: 400, y: 430, w: 200, h: 180, alley: { x: 480, y: 430, w: 40, h: 180 } },
    { x: 680, y: 430, w: 200, h: 180 },
  ];
  for (const b of blocks) buildings.push(...splitBlock(b.x, b.y, b.w, b.h, b.alley));
  // river, leaving bridges at x 40-140, 600-700, and alley 470-530
  buildings.push({ x: 140, y: 330, w: 330, h: 50 });
  buildings.push({ x: 700, y: 330, w: 220, h: 50 });
  const xs = [80, 360, 640, 920];
  const ys = [70, 290, 400, 640];
  const names = ['望水', '北桥头', '瓷坊', '西埠', '上堤', '中桥', '渡口', '东堤', '下堤', '南桥头', '芦湾', '码头'];
  const stands: AlStand[] = [];
  let id = 0;
  for (const y of ys) for (const x of xs) {
    if (id >= 12) break;
    // skip stands that would fall in the river
    if (y > 330 && y < 390 && x > 140 && x < 600) continue;
    stands.push({ id: stands.length, x, y, name: names[id++] });
  }
  // ensure 12 stands on dry land
  const extra = [{ x: 80, y: 400 }, { x: 640, y: 400 }, { x: 920, y: 400 }, { x: 360, y: 640 }];
  for (const e of extra) {
    if (stands.length >= 12) break;
    if (!stands.some((s) => dist(s.x, s.y, e.x, e.y) < 20)) {
      stands.push({ id: stands.length, x: e.x, y: e.y, name: names[stands.length] });
    }
  }
  stands.forEach((s, i) => { s.id = i; });
  const routes: AlRoute[] = [
    loopRoute([{ x: 80, y: 70 }, { x: 920, y: 70 }, { x: 920, y: 290 }, { x: 80, y: 290 }], 92),
    loopRoute([{ x: 80, y: 400 }, { x: 80, y: 640 }, { x: 920, y: 640 }, { x: 920, y: 400 }, { x: 640, y: 400 }], 88),
    loopRoute([{ x: 80, y: 70 }, { x: 80, y: 640 }], 84),
    loopRoute([{ x: 640, y: 70 }, { x: 640, y: 640 }], 100),
  ];
  return { id: 'heyan', name: '河沿坊', w: 1000, h: 720, buildings, stands, routes, spawn: { x: 80, y: 70, heading: 0 } };
}

function buildDengshi(): AlMap {
  // Denser 4×2-ish with more alleys — "灯市里"
  const buildings: AlRect[] = [];
  const blocks = [
    { x: 110, y: 110, w: 160, h: 190, alley: { x: 170, y: 110, w: 36, h: 190 } },
    { x: 350, y: 110, w: 160, h: 190, alley: { x: 350, y: 190, w: 160, h: 36 } },
    { x: 590, y: 110, w: 160, h: 190 },
    { x: 830, y: 110, w: 130, h: 190, alley: { x: 880, y: 110, w: 36, h: 190 } },
    { x: 110, y: 400, w: 160, h: 190, alley: { x: 110, y: 480, w: 160, h: 36 } },
    { x: 350, y: 400, w: 160, h: 190, alley: { x: 410, y: 400, w: 36, h: 190 } },
    { x: 590, y: 400, w: 160, h: 190, alley: { x: 590, y: 480, w: 160, h: 36 } },
    { x: 830, y: 400, w: 130, h: 190 },
  ];
  for (const b of blocks) buildings.push(...splitBlock(b.x, b.y, b.w, b.h, b.alley));
  const xs = [70, 290, 530, 770, 990];
  const ys = [70, 350, 640];
  const names = ['灯市口', '牌楼', '茶馆', '戏台', '东栅', '巷口', '钟楼', '书场', '南廊', '西市', '作坊', '收车坪', '桥边', '后街', '新门'];
  const stands: AlStand[] = [];
  let i = 0;
  for (const y of ys) for (const x of xs) {
    if (x > 1000) continue;
    stands.push({ id: stands.length, x, y: y, name: names[i++] });
  }
  const routes: AlRoute[] = [
    loopRoute([{ x: 70, y: 70 }, { x: 990, y: 70 }, { x: 990, y: 350 }, { x: 70, y: 350 }], 100),
    loopRoute([{ x: 70, y: 640 }, { x: 990, y: 640 }, { x: 990, y: 350 }, { x: 70, y: 350 }], 96),
    loopRoute([{ x: 70, y: 70 }, { x: 70, y: 640 }], 90),
    loopRoute([{ x: 530, y: 70 }, { x: 530, y: 640 }], 105),
    loopRoute([{ x: 770, y: 70 }, { x: 770, y: 640 }], 88),
  ];
  return { id: 'dengshi', name: '灯市里', w: 1080, h: 720, buildings, stands, routes, spawn: { x: 70, y: 70, heading: 0 } };
}

export const AL_MAPS: Record<string, AlMap> = {
  nanbu: buildNanbu(),
  heyan: buildHeyan(),
  dengshi: buildDengshi(),
};

export const AL_LEVELS: AlLevel[] = [
  {
    id: 1, name: '南埠热身', mapId: 'nanbu', time: 70, target: 200, starTime: 18, traffic: 0.35, offer: 2,
    hint: '先接近处的客人，走巷子抄近路，尽快送到。',
    fares: [
      { pick: 0, drop: 1, kind: 'near' },
      { pick: 1, drop: 2, kind: 'near' },
      { pick: 5, drop: 4, kind: 'near' },
    ],
  },
  {
    id: 2, name: '灯角晚班', mapId: 'nanbu', time: 80, target: 420, starTime: 16, traffic: 0.55, offer: 2,
    hint: '近程和远程都接。送得越快小费越多。',
    fares: [
      { pick: 0, drop: 1, kind: 'near' },
      { pick: 2, drop: 11, kind: 'far' },
      { pick: 10, drop: 6, kind: 'near' },
      { pick: 6, drop: 3, kind: 'urgent' },
    ],
  },
  {
    id: 3, name: '加急收工', mapId: 'nanbu', time: 75, target: 520, starTime: 12, traffic: 0.6, offer: 2,
    hint: '加急单时限更紧，小费也更高。撞车会罚时间。',
    fares: [
      { pick: 0, drop: 6, kind: 'urgent' },
      { pick: 7, drop: 8, kind: 'near' },
      { pick: 8, drop: 3, kind: 'far' },
      { pick: 4, drop: 11, kind: 'urgent' },
    ],
  },
  {
    id: 4, name: '河沿绕行', mapId: 'heyan', time: 95, target: 500, starTime: 12, traffic: 0.5, offer: 2,
    hint: '河面不能开，要走桥或夹在房子里的小巷。',
    fares: [
      { pick: 0, drop: 8, kind: 'far' },
      { pick: 2, drop: 3, kind: 'near' },
      { pick: 9, drop: 1, kind: 'urgent' },
      { pick: 5, drop: 11, kind: 'near' },
    ],
  },
  {
    id: 5, name: '车流里弄', mapId: 'heyan', time: 85, target: 680, starTime: 12, traffic: 0.95, offer: 2,
    hint: '往来车辆更多，擦到会减速并扣时间，尽量绕开。',
    fares: [
      { pick: 0, drop: 4, kind: 'near' },
      { pick: 4, drop: 10, kind: 'far' },
      { pick: 11, drop: 2, kind: 'urgent' },
      { pick: 3, drop: 9, kind: 'far' },
      { pick: 6, drop: 7, kind: 'near' },
    ],
  },
  {
    id: 6, name: '灯市连单', mapId: 'dengshi', time: 105, target: 760, starTime: 12, traffic: 0.65, offer: 2,
    hint: '街区更密，巷子更多。连续接单，抄近路。',
    fares: [
      { pick: 0, drop: 2, kind: 'near' },
      { pick: 2, drop: 8, kind: 'far' },
      { pick: 11, drop: 6, kind: 'urgent' },
      { pick: 6, drop: 9, kind: 'near' },
      { pick: 4, drop: 10, kind: 'far' },
    ],
  },
  {
    id: 7, name: '全城赶点', mapId: 'dengshi', time: 95, target: 920, starTime: 12, traffic: 0.85, offer: 2,
    hint: '目标金额更高，加急和远程穿插，别在主路上堵死。',
    fares: [
      { pick: 0, drop: 6, kind: 'urgent' },
      { pick: 7, drop: 14, kind: 'far' },
      { pick: 3, drop: 5, kind: 'near' },
      { pick: 10, drop: 2, kind: 'urgent' },
      { pick: 8, drop: 0, kind: 'far' },
    ],
  },
  {
    id: 8, name: '灯火收车', mapId: 'dengshi', time: 105, target: 1080, starTime: 16, traffic: 0.9, offer: 2,
    hint: '收车前最后一班。达到目标且剩余时间充裕才是三星。',
    fares: [
      { pick: 0, drop: 4, kind: 'near' },
      { pick: 4, drop: 14, kind: 'far' },
      { pick: 13, drop: 2, kind: 'urgent' },
      { pick: 2, drop: 8, kind: 'far' },
      { pick: 9, drop: 6, kind: 'urgent' },
      { pick: 11, drop: 1, kind: 'near' },
    ],
  },
];

export function alLevelById(id: number): AlLevel {
  return AL_LEVELS.find((l) => l.id === id) ?? AL_LEVELS[0];
}

export function alMapById(id: string): AlMap {
  return AL_MAPS[id] ?? AL_MAPS.nanbu;
}

function initFares(level: AlLevel, rng: { s: number }): AlFare[] {
  return level.fares.map((f, i) => {
    const spec = FARE_SPEC[f.kind];
    return {
      id: i,
      kind: f.kind,
      pick: f.pick,
      drop: f.drop,
      base: spec.base,
      tip: spec.tip,
      allotted: spec.time,
      remain: spec.time,
      guest: GUESTS[(i + level.id * 3) % GUESTS.length],
      status: i < level.offer ? 'offer' : 'queue',
    };
  });
}

function offerNext(m: AlMatch) {
  const offering = m.fares.filter((f) => f.status === 'offer').length;
  if (offering >= m.level.offer) return;
  const next = m.fares.find((f) => f.status === 'queue');
  if (next) next.status = 'offer';
}

function makeTraffic(map: AlMap, density: number, rng: { s: number }): AlTraffic[] {
  const out: AlTraffic[] = [];
  const n = Math.round(2 + density * 6);
  for (let i = 0; i < n; i++) {
    const ri = i % map.routes.length;
    const route = map.routes[ri];
    const seg = Math.floor(rnd(rng) * Math.max(1, route.pts.length - 1));
    const a = route.pts[seg];
    const b = route.pts[(seg + 1) % route.pts.length];
    const t = rnd(rng);
    out.push({
      x: a.x + (b.x - a.x) * t,
      y: a.y + (b.y - a.y) * t,
      heading: Math.atan2(b.y - a.y, b.x - a.x),
      speed: route.speed * (0.85 + rnd(rng) * 0.25),
      route: ri,
      seg,
      dir: 1,
      r: 12,
    });
  }
  return out;
}

export type AlCreateOpts = { skipCountdown?: boolean; freezeTraffic?: boolean; seed?: number };

export function createAlMatch(levelId: number, opts: AlCreateOpts = {}): AlMatch {
  const level = alLevelById(levelId);
  const map = alMapById(level.mapId);
  const seed = opts.seed ?? level.id * 9049 + 21;
  const rng = { s: seed >>> 0 };
  const fares = initFares(level, rng);
  const car: AlCar = {
    x: map.spawn.x, y: map.spawn.y, heading: map.spawn.heading,
    speed: 0, drifting: false, driftTime: 0, boostT: 0, boostLock: 0, nitro: 1, hitLock: 0,
  };
  return {
    level,
    map,
    phase: opts.skipCountdown ? 'play' : 'countdown',
    phaseT: opts.skipCountdown ? 0 : 3,
    time: level.time,
    money: 0,
    stars: 0,
    message: opts.skipCountdown ? '开始接客' : '准备发车',
    car,
    camX: clamp(car.x - AL_VIEW_W / 2, 0, Math.max(0, map.w - AL_VIEW_W)),
    camY: clamp(car.y - AL_VIEW_H / 2, 0, Math.max(0, map.h - AL_VIEW_H)),
    traffic: opts.freezeTraffic ? [] : makeTraffic(map, level.traffic, rng),
    fares,
    carrying: null,
    delivered: 0,
    hits: 0,
    penaltyTime: 0,
    acc: 0,
    rng,
    path: [],
    pathI: 0,
    stuckT: 0,
    lastX: car.x,
    lastY: car.y,
    finished: false,
    leftover: 0,
  };
}

function finish(m: AlMatch, won: boolean) {
  if (m.finished) return;
  m.finished = true;
  m.leftover = won ? Math.max(0, m.time) : 0;
  m.stars = alStars(m.money, m.level.target, m.leftover, m.level.starTime, m.delivered, true);
  m.phase = won || m.stars >= 2 ? 'won' : 'lost';
  if (m.money >= m.level.target) m.phase = 'won';
  else m.phase = 'lost';
  m.stars = alStars(m.money, m.level.target, m.leftover, m.level.starTime, m.delivered, true);
  const word = m.phase === 'won' ? '完成定额' : '未达目标金额';
  m.message = `${word}，收入 ${m.money} / ${m.level.target}` + (m.stars ? `，${'★'.repeat(m.stars)}` : '，本关未通关');
}

export function tryPickup(m: AlMatch, fareId?: number): boolean {
  if (m.carrying != null || m.phase !== 'play') return false;
  const c = m.car;
  const offers = m.fares.filter((f) => f.status === 'offer' && (fareId == null || f.id === fareId));
  for (const f of offers) {
    const st = m.map.stands[f.pick];
    if (!st) continue;
    if (dist(c.x, c.y, st.x, st.y) <= AL_PICK_R) {
      f.status = 'carry';
      f.remain = f.allotted;
      m.carrying = f.id;
      m.message = `接到${FARE_SPEC[f.kind].label}客人 ${f.guest}，送往 ${m.map.stands[f.drop]?.name ?? '目的地'}`;
      return true;
    }
  }
  return false;
}

export function tryDeliver(m: AlMatch): boolean {
  if (m.carrying == null || m.phase !== 'play') return false;
  const f = m.fares[m.carrying];
  if (!f || f.status !== 'carry') return false;
  const st = m.map.stands[f.drop];
  if (!st) return false;
  if (dist(m.car.x, m.car.y, st.x, st.y) > AL_PICK_R) return false;
  const pay = farePayout(f.kind, f.remain, f.allotted);
  f.status = 'done';
  m.carrying = null;
  m.money += pay;
  m.delivered += 1;
  m.car.nitro = Math.min(1, m.car.nitro + 0.28);
  m.message = `送达 ${f.guest}，收入 ${pay}（剩余 ${Math.ceil(f.remain)}s 小费）`;
  offerNext(m);
  if (m.money >= m.level.target) finish(m, true);
  return true;
}

export function applyHit(m: AlMatch, strength = 1) {
  if (m.car.hitLock > 0 || m.phase !== 'play') return false;
  m.car.hitLock = AL_HIT_LOCK;
  m.car.speed *= 0.28;
  const cut = AL_HIT_PENALTY * strength;
  m.time = Math.max(0, m.time - cut);
  m.penaltyTime += cut;
  m.hits += 1;
  m.message = `撞到来车，减速并罚时 ${cut} 秒`;
  if (m.time <= 0) finish(m, false);
  return true;
}

function stepTraffic(m: AlMatch, dt: number) {
  for (const t of m.traffic) {
    const route = m.map.routes[t.route];
    if (!route || route.pts.length < 2) continue;
    const b = route.pts[(t.seg + (t.dir === 1 ? 1 : -1) + route.pts.length) % route.pts.length];
    const d = dist(t.x, t.y, b.x, b.y);
    const hd = Math.atan2(b.y - t.y, b.x - t.x);
    t.heading = hd;
    const step = t.speed * dt;
    if (d <= step + 1) {
      t.x = b.x;
      t.y = b.y;
      t.seg = (t.seg + t.dir + route.pts.length) % route.pts.length;
    } else {
      t.x += Math.cos(hd) * step;
      t.y += Math.sin(hd) * step;
    }
    if (dist(t.x, t.y, m.car.x, m.car.y) < t.r + AL_CAR_R - 1) {
      applyHit(m);
    }
  }
}

function moveCar(m: AlMatch, dt: number, input: AlInput) {
  const c = m.car;
  if (c.hitLock > 0) c.hitLock = Math.max(0, c.hitLock - dt);
  if (c.boostLock > 0) c.boostLock = Math.max(0, c.boostLock - dt);
  if (c.boostT > 0) c.boostT = Math.max(0, c.boostT - dt);

  const can = c.hitLock < 0.25;
  const steerIn = (input.right ? 1 : 0) - (input.left ? 1 : 0);
  const wantDrift = can && input.drift && c.speed > 70 && Math.abs(steerIn) > 0.15;
  if (wantDrift) {
    c.drifting = true;
    c.driftTime += dt;
  } else {
    if (c.drifting && c.driftTime >= 0.22 && c.boostLock <= 0 && c.speed > 70) {
      c.boostT = Math.min(0.48, 0.18 + Math.min(0.8, c.driftTime) * 0.26);
      c.boostLock = c.boostT + 0.2;
    }
    c.drifting = false;
    c.driftTime = 0;
  }

  const steerMul = c.drifting ? 1.65 : 1;
  const speedFactor = 0.42 + 0.58 * Math.min(1, c.speed / (AL_MAX_SPEED * 0.7));
  if (can) c.heading = wrapAngle(c.heading + steerIn * AL_STEER * steerMul * speedFactor * dt);

  let maxSp = AL_MAX_SPEED;
  if (c.boostT > 0) maxSp *= 1.18;
  let usingNitro = false;
  if (can && input.nitro && c.nitro > 0) {
    usingNitro = true;
    maxSp *= 1.22;
    c.nitro = Math.max(0, c.nitro - 0.38 * dt);
  } else {
    c.nitro = Math.min(1, c.nitro + 0.07 * dt);
  }

  let accel = 0;
  if (can && input.accel && !input.brake) accel += AL_ACCEL;
  if (input.brake) accel -= AL_BRAKE;
  if (!input.accel && !input.brake) accel -= AL_FRICTION;
  if (c.drifting) accel -= 36;
  if (c.boostT > 0) accel += 240;
  if (usingNitro) accel += 180;

  c.speed = clamp(c.speed + accel * dt, -90, maxSp);
  const nx = c.x + Math.cos(c.heading) * c.speed * dt;
  const ny = c.y + Math.sin(c.heading) * c.speed * dt;
  if (!blocked(m.map, nx, ny)) {
    c.x = nx;
    c.y = ny;
  } else if (!blocked(m.map, nx, c.y)) {
    c.x = nx;
    c.speed *= 0.62;
  } else if (!blocked(m.map, c.x, ny)) {
    c.y = ny;
    c.speed *= 0.62;
  } else {
    c.speed *= -0.2;
    c.speed = clamp(c.speed, -60, 80);
  }
  c.x = clamp(c.x, AL_CAR_R + 8, m.map.w - AL_CAR_R - 8);
  c.y = clamp(c.y, AL_CAR_R + 8, m.map.h - AL_CAR_R - 8);

  m.camX = clamp(c.x - AL_VIEW_W / 2, 0, Math.max(0, m.map.w - AL_VIEW_W));
  m.camY = clamp(c.y - AL_VIEW_H / 2, 0, Math.max(0, m.map.h - AL_VIEW_H));
}

function stepFares(m: AlMatch, dt: number) {
  if (m.carrying != null) {
    const f = m.fares[m.carrying];
    if (f && f.status === 'carry') {
      f.remain -= dt;
      if (f.remain <= 0) {
        f.remain = 0;
        f.status = 'failed';
        m.carrying = null;
        m.message = `${f.guest} 等不及下车了`;
        offerNext(m);
      }
    }
  }
  tryPickup(m);
  tryDeliver(m);
}

function stepPlay(m: AlMatch, dt: number, input: AlInput) {
  m.time -= dt;
  if (m.time <= 0) {
    m.time = 0;
    finish(m, m.money >= m.level.target);
    return;
  }
  moveCar(m, dt, input);
  stepTraffic(m, dt);
  stepFares(m, dt);
}

export function stepAl(m: AlMatch, dt: number, input: AlInput = EMPTY_AL_INPUT) {
  if (m.finished) return;
  if (m.phase === 'countdown') {
    m.phaseT -= dt;
    m.message = String(Math.max(1, Math.ceil(m.phaseT)));
    if (m.phaseT <= 0) {
      m.phase = 'play';
      m.message = '开始接客';
    }
    return;
  }
  if (m.phase === 'play') stepPlay(m, dt, input);
}

export function tickAl(m: AlMatch, dt: number, input: AlInput = EMPTY_AL_INPUT) {
  if (m.finished) return;
  const d = Math.min(0.05, Math.max(0, dt));
  m.acc += d;
  let n = 0;
  while (m.acc >= AL_DT && n < 4 && !m.finished) {
    m.acc -= AL_DT;
    stepAl(m, AL_DT, input);
    n++;
  }
}

/* ---------- pathfinding for autoplay ---------- */

function cellKey(cx: number, cy: number): number {
  return cy * 512 + cx;
}

function walkGrid(map: AlMap, step = 20): { step: number; w: number; h: number; ok: boolean[] } {
  const w = Math.ceil(map.w / step);
  const h = Math.ceil(map.h / step);
  const ok: boolean[] = new Array(w * h);
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const px = x * step + step / 2;
      const py = y * step + step / 2;
      ok[y * w + x] = !blocked(map, px, py, AL_CAR_R + 2);
    }
  }
  return { step, w, h, ok };
}

const gridCache = new Map<string, ReturnType<typeof walkGrid>>();
function gridFor(map: AlMap) {
  let g = gridCache.get(map.id);
  if (!g) {
    g = walkGrid(map);
    gridCache.set(map.id, g);
  }
  return g;
}

function nearestOk(g: { step: number; w: number; h: number; ok: boolean[] }, x: number, y: number): { cx: number; cy: number } {
  const { step, w, h, ok } = g;
  const sx = clamp(Math.floor(x / step), 0, w - 1);
  const sy = clamp(Math.floor(y / step), 0, h - 1);
  if (ok[sy * w + sx]) return { cx: sx, cy: sy };
  let best = { cx: sx, cy: sy };
  let bd = 1e9;
  for (let r = 1; r <= 12; r++) {
    for (let dy = -r; dy <= r; dy++) {
      for (let dx = -r; dx <= r; dx++) {
        if (Math.abs(dx) !== r && Math.abs(dy) !== r) continue;
        const nx = sx + dx, ny = sy + dy;
        if (nx < 0 || ny < 0 || nx >= w || ny >= h) continue;
        if (!ok[ny * w + nx]) continue;
        const d = Math.hypot(dx, dy);
        if (d < bd) { bd = d; best = { cx: nx, cy: ny }; }
      }
    }
    if (bd < 1e8) return best;
  }
  return best;
}

function astar(map: AlMap, sx: number, sy: number, tx: number, ty: number): { x: number; y: number }[] {
  const g = gridFor(map);
  const { step, w, h, ok } = g;
  const a = nearestOk(g, sx, sy);
  const b = nearestOk(g, tx, ty);
  const c0x = a.cx, c0y = a.cy, c1x = b.cx, c1y = b.cy;
  const start = cellKey(c0x, c0y);
  const goal = cellKey(c1x, c1y);
  if (!ok[c0y * w + c0x] || !ok[c1y * w + c1x]) {
    return [{ x: tx, y: ty }];
  }
  const open: number[] = [start];
  const came = new Map<number, number>();
  const gS = new Map<number, number>();
  gS.set(start, 0);
  const fS = new Map<number, number>();
  fS.set(start, Math.hypot(c1x - c0x, c1y - c0y));
  const closed = new Set<number>();
  const dirs = [
    [1, 0, 1], [-1, 0, 1], [0, 1, 1], [0, -1, 1],
    [1, 1, 1.41], [1, -1, 1.41], [-1, 1, 1.41], [-1, -1, 1.41],
  ];
  let guard = 0;
  while (open.length && guard++ < 4000) {
    let bi = 0;
    let bv = 1e9;
    for (let i = 0; i < open.length; i++) {
      const v = fS.get(open[i]) ?? 1e9;
      if (v < bv) { bv = v; bi = i; }
    }
    const cur = open.splice(bi, 1)[0];
    if (cur === goal) break;
    if (closed.has(cur)) continue;
    closed.add(cur);
    const cx = cur % 512;
    const cy = (cur - cx) / 512;
    for (const [dx, dy, cost] of dirs) {
      const nx = cx + dx;
      const ny = cy + dy;
      if (nx < 0 || ny < 0 || nx >= w || ny >= h) continue;
      if (!ok[ny * w + nx]) continue;
      if (dx !== 0 && dy !== 0 && (!ok[cy * w + nx] || !ok[ny * w + cx])) continue;
      const nk = cellKey(nx, ny);
      const ng = (gS.get(cur) ?? 1e9) + cost;
      if (ng < (gS.get(nk) ?? 1e9)) {
        came.set(nk, cur);
        gS.set(nk, ng);
        fS.set(nk, ng + Math.hypot(c1x - nx, c1y - ny));
        open.push(nk);
      }
    }
  }
  const path: { x: number; y: number }[] = [];
  let k = came.has(goal) || start === goal ? goal : (() => {
    let best = start, bd = 1e9;
    for (const key of came.keys()) {
      const x = key % 512, y = (key - x) / 512;
      const d = Math.hypot(c1x - x, c1y - y);
      if (d < bd) { bd = d; best = key; }
    }
    return best;
  })();
  const seen = new Set<number>();
  while (seen.size < 800) {
    const x = k % 512;
    const y = (k - x) / 512;
    path.push({ x: x * step + step / 2, y: y * step + step / 2 });
    if (k === start) break;
    const prev = came.get(k);
    if (prev == null) break;
    seen.add(k);
    k = prev;
  }
  path.reverse();
  path.push({ x: tx, y: ty });
  return path.length ? path : [{ x: tx, y: ty }];
}

function targetStand(m: AlMatch): AlStand | null {
  if (m.carrying != null) {
    const f = m.fares[m.carrying];
    return m.map.stands[f.drop] ?? null;
  }
  const offers = m.fares.filter((f) => f.status === 'offer');
  if (!offers.length) return null;
  // pick best value / distance
  let best = offers[0];
  let bestS = -1e9;
  for (const f of offers) {
    const st = m.map.stands[f.pick];
    if (!st) continue;
    const d = Math.max(40, dist(m.car.x, m.car.y, st.x, st.y));
    const s = (f.base + f.tip * 0.6) / (d + (f.kind === 'urgent' ? 40 : 0));
    if (s > bestS) { bestS = s; best = f; }
  }
  return m.map.stands[best.pick] ?? null;
}

function refreshPath(m: AlMatch) {
  const st = targetStand(m);
  if (!st) { m.path = []; m.pathI = 0; return; }
  m.path = astar(m.map, m.car.x, m.car.y, st.x, st.y);
  m.pathI = 0;
}

export function autoInputAl(m: AlMatch): AlInput {
  const input: AlInput = { ...EMPTY_AL_INPUT };
  if (m.phase !== 'play') return input;
  const st = targetStand(m);
  if (!st) return input;
  if (!m.path.length || m.pathI >= m.path.length - 1 && dist(m.car.x, m.car.y, st.x, st.y) > 80) {
    refreshPath(m);
  }
  // advance waypoint
  while (m.pathI < m.path.length - 1 && dist(m.car.x, m.car.y, m.path[m.pathI].x, m.path[m.pathI].y) < 28) {
    m.pathI++;
  }
  const look = m.path[Math.min(m.pathI + 1, m.path.length - 1)] ?? st;
  const tgt = m.path[m.pathI] ?? st;
  const aim = dist(m.car.x, m.car.y, tgt.x, tgt.y) < 36 ? look : tgt;
  const desired = Math.atan2(aim.y - m.car.y, aim.x - m.car.x);
  const err = wrapAngle(desired - m.car.heading);
  if (err > 0.07) input.right = true;
  if (err < -0.07) input.left = true;
  const dGoal = dist(m.car.x, m.car.y, st.x, st.y);
  const sharp = Math.abs(err) > 0.55;
  const verySharp = Math.abs(err) > 1.1;
  if (verySharp && m.car.speed > 140) input.brake = true;
  else if (!(verySharp && m.car.speed > 160)) input.accel = true;
  if (dGoal < 90 && m.car.speed > 110) {
    input.brake = true;
    input.accel = false;
  }
  input.drift = sharp && m.car.speed > 75 && Math.abs(err) > 0.28;
  input.nitro = !sharp && dGoal > 160 && m.car.nitro > 0.15 && Math.abs(err) < 0.18;

  // traffic ahead: brake a little
  for (const t of m.traffic) {
    const dd = dist(m.car.x, m.car.y, t.x, t.y);
    if (dd < 70) {
      const toT = Math.atan2(t.y - m.car.y, t.x - m.car.x);
      if (Math.abs(wrapAngle(toT - m.car.heading)) < 0.6) {
        input.brake = m.car.speed > 80;
        input.accel = m.car.speed < 60;
        input.nitro = false;
      }
    }
  }

  // stuck recovery
  if (dist(m.car.x, m.car.y, m.lastX, m.lastY) < 4) m.stuckT += AL_DT;
  else m.stuckT = 0;
  if (m.stuckT > 0.45) {
    m.car.heading = desired;
    for (const ang of [0, 0.6, -0.6, 1.2, -1.2, Math.PI]) {
      const nx = m.car.x + Math.cos(desired + ang) * 16;
      const ny = m.car.y + Math.sin(desired + ang) * 16;
      if (!blocked(m.map, nx, ny, AL_CAR_R + 1)) {
        m.car.x = nx;
        m.car.y = ny;
        m.car.heading = desired + ang;
        break;
      }
    }
    m.car.speed = 110;
    refreshPath(m);
    m.stuckT = 0;
  }
  m.lastX = m.car.x;
  m.lastY = m.car.y;
  return input;
}

export function autoPlayAl(levelId: number, maxSeconds?: number): AlMatch {
  const m = createAlMatch(levelId, { skipCountdown: true });
  const limit = maxSeconds ?? m.level.time + 4;
  const frames = Math.ceil(limit / AL_DT) + 8;
  refreshPath(m);
  for (let i = 0; i < frames && !m.finished; i++) {
    if (i % 12 === 0) refreshPath(m);
    const input = autoInputAl(m);
    stepAl(m, AL_DT, input);
  }
  if (!m.finished) finish(m, m.money >= m.level.target);
  return m;
}

export function matchScoreValue(m: AlMatch): number {
  return m.money * 10 + Math.floor(m.leftover * 5) + m.delivered;
}

export function parseAlSave(raw: unknown): LevelSave {
  return parseLevelSave(raw, AL_LEVEL_COUNT);
}

export const AL_OUR_NAME = '巷口车行';
