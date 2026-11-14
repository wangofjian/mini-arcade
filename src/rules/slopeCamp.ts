import { parseLevelSave, type LevelSave } from './progressSave';

export const MP_VIEW_W = 960;
export const MP_VIEW_H = 540;
export const MP_DT = 1 / 60;
export const MP_SAVE_KEY = 'slope-camp-save';
export const MP_LEVEL_COUNT = 8;
export const MP_CAP = 14;
export const MP_OUR_NAME = '青坡寨';
export const MP_THEIR_NAME = '赤岗部';
export const MP_RES_NAME = '粮秣';
export const MP_HARVEST = 10;
export const MP_HACK_T = 1.05;
export const MP_QUEUE = 3;

export type MpSide = 'player' | 'enemy';
export type MpPhase = 'countdown' | 'play' | 'won' | 'lost';
export type MpUnitKind = 'worker' | 'blade' | 'bow' | 'raider';
export type MpBldKind = 'hall' | 'yard' | 'tower' | 'depot';

export type MpRect = { x: number; y: number; w: number; h: number };
export type MpNode = { id: number; x: number; y: number; amount: number; max: number };

export type MpMap = {
  id: string;
  name: string;
  w: number;
  h: number;
  blocks: MpRect[];
  nodes: { id: number; x: number; y: number; amount?: number }[];
  playerHall: { x: number; y: number };
  enemyHall: { x: number; y: number };
  playerYard?: { x: number; y: number };
  enemyYard?: { x: number; y: number };
  enemyTowers: { x: number; y: number }[];
  playerTowers?: { x: number; y: number }[];
};

export type MpUnitSpec = {
  name: string;
  cost: number;
  time: number;
  hp: number;
  atk: number;
  range: number;
  cooldown: number;
  speed: number;
  r: number;
};
export type MpBldSpec = {
  name: string;
  cost: number;
  time: number;
  hp: number;
  atk: number;
  range: number;
  cooldown: number;
  r: number;
  trains: MpUnitKind[];
};

export const UNIT_SPEC: Record<MpUnitKind, MpUnitSpec> = {
  worker: { name: '民伕', cost: 45, time: 3.6, hp: 46, atk: 3, range: 18, cooldown: 0.85, speed: 86, r: 9 },
  blade: { name: '刀盾', cost: 55, time: 4.0, hp: 108, atk: 16, range: 22, cooldown: 0.64, speed: 82, r: 10 },
  bow: { name: '长弓', cost: 64, time: 4.6, hp: 64, atk: 13, range: 132, cooldown: 0.78, speed: 78, r: 9 },
  raider: { name: '突击', cost: 88, time: 5.6, hp: 140, atk: 23, range: 24, cooldown: 0.68, speed: 102, r: 11 },
};

export const BLD_SPEC: Record<MpBldKind, MpBldSpec> = {
  hall: { name: '大营', cost: 0, time: 0, hp: 520, atk: 6, range: 105, cooldown: 0.95, r: 36, trains: ['worker'] },
  yard: { name: '校场', cost: 115, time: 6.5, hp: 250, atk: 0, range: 0, cooldown: 1, r: 26, trains: ['blade', 'bow', 'raider'] },
  tower: { name: '箭楼', cost: 100, time: 6, hp: 180, atk: 11, range: 140, cooldown: 0.88, r: 20, trains: [] },
  depot: { name: '仓廪', cost: 75, time: 5.2, hp: 190, atk: 0, range: 0, cooldown: 1, r: 22, trains: [] },
};

export type MpLevel = {
  id: number;
  name: string;
  mapId: string;
  hint: string;
  time: number;
  starTime: number;
  lossCap: number;
  startRes: number;
  enemyRes: number;
  playerWorkers: number;
  enemyWorkers: number;
  playerBlades: number;
  playerBows: number;
  enemyBlades: number;
  enemyBows: number;
  enemyRaiders: number;
  enemyTowers: number;
  playerHallHp: number;
  enemyHallHp: number;
  aiPushAt: number;
  aiPushTime: number;
  aiBuildYard: boolean;
  aiMaxArmy: number;
  playerPushAt: number;
  playerWorkersWant: number;
};

export type MpOrder =
  | { t: 'idle' }
  | { t: 'move'; x: number; y: number }
  | { t: 'attack'; id: number }
  | { t: 'attackMove'; x: number; y: number }
  | { t: 'gather'; nodeId: number; loaded: number; phase: 'go' | 'hack' | 'back'; hackT: number }
  | { t: 'build'; bldId: number };

export type MpUnit = {
  id: number;
  side: MpSide;
  kind: MpUnitKind;
  x: number;
  y: number;
  facing: number;
  hp: number;
  maxHp: number;
  atkCd: number;
  order: MpOrder;
  path: { x: number; y: number }[];
  pathI: number;
  stuckT: number;
  lastX: number;
  lastY: number;
};

export type MpBld = {
  id: number;
  side: MpSide;
  kind: MpBldKind;
  x: number;
  y: number;
  hp: number;
  maxHp: number;
  built: number;
  queue: MpUnitKind[];
  trainT: number;
  atkCd: number;
};

export type MpCommand =
  | { t: 'select'; ids: number[] }
  | { t: 'selectAt'; x: number; y: number; additive?: boolean }
  | { t: 'selectBox'; x0: number; y0: number; x1: number; y1: number; additive?: boolean }
  | { t: 'selectAllArmy' }
  | { t: 'selectIdleWorkers' }
  | { t: 'move'; x: number; y: number }
  | { t: 'attack'; id: number }
  | { t: 'attackMove'; x: number; y: number }
  | { t: 'stop' }
  | { t: 'train'; kind: MpUnitKind }
  | { t: 'build'; kind: MpBldKind; x: number; y: number };

export type MpInput = { camLeft: boolean; camRight: boolean; camUp: boolean; camDown: boolean };
export const EMPTY_MP_INPUT: MpInput = { camLeft: false, camRight: false, camUp: false, camDown: false };

export type MpMatch = {
  level: MpLevel;
  map: MpMap;
  phase: MpPhase;
  phaseT: number;
  time: number;
  leftover: number;
  stars: number;
  message: string;
  finished: boolean;
  res: Record<MpSide, number>;
  units: MpUnit[];
  buildings: MpBld[];
  nodes: MpNode[];
  selected: number[];
  nextId: number;
  losses: Record<MpSide, number>;
  kills: Record<MpSide, number>;
  enemyHallDmg: number;
  camX: number;
  camY: number;
  acc: number;
  aiAcc: number;
  rng: { s: number };
  cmds: MpCommand[];
  pushing: Record<MpSide, boolean>;
  freezeAi: boolean;
};

function clamp(n: number, a: number, b: number): number {
  return Math.max(a, Math.min(b, n));
}
function dist(ax: number, ay: number, bx: number, by: number): number {
  return Math.hypot(ax - bx, ay - by);
}
function rnd(r: { s: number }): number {
  r.s = (Math.imul(r.s, 1664525) + 1013904223) >>> 0;
  return r.s / 4294967296;
}

export function wrapAngle(a: number): number {
  while (a > Math.PI) a -= Math.PI * 2;
  while (a < -Math.PI) a += Math.PI * 2;
  return a;
}

export function mpStars(
  won: boolean,
  leftover: number,
  starTime: number,
  losses: number,
  lossCap: number,
  enemyHallDmg: number,
  finished: boolean,
): number {
  if (won && leftover >= starTime && losses <= lossCap) return 3;
  if (won) return 2;
  if (finished && enemyHallDmg >= 1) return 1;
  return 0;
}

function hitRect(x: number, y: number, r: number, b: MpRect): boolean {
  return x + r > b.x && x - r < b.x + b.w && y + r > b.y && y - r < b.y + b.h;
}

export function blockedTerrain(map: MpMap, x: number, y: number, r: number): boolean {
  if (x - r < 12 || y - r < 12 || x + r > map.w - 12 || y + r > map.h - 12) return true;
  for (const b of map.blocks) if (hitRect(x, y, r, b)) return true;
  return false;
}

export function blocked(m: MpMatch, x: number, y: number, r: number, ignoreBld?: number): boolean {
  if (blockedTerrain(m.map, x, y, r)) return true;
  for (const b of m.buildings) {
    if (b.id === ignoreBld || b.hp <= 0) continue;
    if (dist(x, y, b.x, b.y) < r + bRadius(b) - 2) return true;
  }
  return false;
}

function bRadius(b: MpBld): number {
  return BLD_SPEC[b.kind].r;
}

function nodeAmt(n: MpMap['nodes'][number]): number {
  return n.amount ?? 360;
}

function buildQingpo(): MpMap {
  const blocks: MpRect[] = [
    { x: 430, y: 20, w: 110, h: 95 },
    { x: 430, y: 420, w: 110, h: 100 },
    { x: 300, y: 250, w: 48, h: 42 },
    { x: 620, y: 248, w: 48, h: 42 },
  ];
  const nodes = [
    { id: 0, x: 210, y: 140 },
    { id: 1, x: 210, y: 400 },
    { id: 2, x: 480, y: 270 },
    { id: 3, x: 750, y: 140 },
    { id: 4, x: 750, y: 400 },
  ];
  return {
    id: 'qingpo', name: '青坡坪', w: 960, h: 540, blocks, nodes,
    playerHall: { x: 100, y: 270 },
    enemyHall: { x: 860, y: 270 },
    playerYard: { x: 100, y: 380 },
    enemyYard: { x: 860, y: 380 },
    enemyTowers: [{ x: 760, y: 270 }],
    playerTowers: [{ x: 200, y: 270 }],
  };
}

function buildTonglin(): MpMap {
  const blocks: MpRect[] = [
    { x: 440, y: 16, w: 160, h: 120 },
    { x: 440, y: 464, w: 160, h: 120 },
    { x: 250, y: 270, w: 48, h: 54 },
    { x: 740, y: 270, w: 48, h: 54 },
  ];
  const nodes = [
    { id: 0, x: 200, y: 120, amount: 400 },
    { id: 1, x: 200, y: 500, amount: 400 },
    { id: 2, x: 520, y: 200, amount: 320 },
    { id: 3, x: 520, y: 420, amount: 320 },
    { id: 4, x: 840, y: 120, amount: 400 },
    { id: 5, x: 840, y: 500, amount: 400 },
  ];
  return {
    id: 'tonglin', name: '桐林坡', w: 1040, h: 600, blocks, nodes,
    playerHall: { x: 110, y: 300 },
    enemyHall: { x: 930, y: 300 },
    playerYard: { x: 110, y: 415 },
    enemyYard: { x: 930, y: 415 },
    enemyTowers: [{ x: 820, y: 240 }, { x: 820, y: 360 }],
    playerTowers: [{ x: 220, y: 300 }],
  };
}

function buildChigang(): MpMap {
  const blocks: MpRect[] = [
    // one solid ridge so armies take a wide north or south pass, not a tight middle
    { x: 360, y: 200, w: 380, h: 240 },
    { x: 200, y: 40, w: 70, h: 70 },
    { x: 830, y: 530, w: 70, h: 70 },
  ];
  // two corridors: y≈80–190 (north) and y≈450–620 (south)
  const nodes = [
    { id: 0, x: 200, y: 160, amount: 420 },
    { id: 1, x: 200, y: 520, amount: 420 },
    { id: 2, x: 550, y: 150, amount: 340 },
    { id: 3, x: 550, y: 510, amount: 340 },
    { id: 4, x: 900, y: 160, amount: 420 },
    { id: 5, x: 900, y: 520, amount: 420 },
  ];
  return {
    id: 'chigang', name: '赤岗梁', w: 1100, h: 640, blocks, nodes,
    playerHall: { x: 120, y: 500 },
    enemyHall: { x: 980, y: 150 },
    playerYard: { x: 120, y: 600 },
    enemyYard: { x: 980, y: 250 },
    enemyTowers: [{ x: 880, y: 150 }, { x: 980, y: 260 }],
    playerTowers: [{ x: 230, y: 500 }],
  };
}

export const MP_MAPS: Record<string, MpMap> = {
  qingpo: buildQingpo(),
  tonglin: buildTonglin(),
  chigang: buildChigang(),
};

export const MP_LEVELS: MpLevel[] = [
  {
    id: 1, name: '坡前试手', mapId: 'qingpo',
    hint: '先让民伕收粮，建一所校场，训练几名刀盾，推掉对面大营。',
    time: 95, starTime: 28, lossCap: 4, startRes: 155, enemyRes: 0,
    playerWorkers: 3, enemyWorkers: 0, playerBlades: 0, playerBows: 0,
    enemyBlades: 2, enemyBows: 0, enemyRaiders: 0, enemyTowers: 0,
    playerHallHp: 540, enemyHallHp: 280,
    aiPushAt: 9, aiPushTime: 120, aiBuildYard: false, aiMaxArmy: 2,
    playerPushAt: 3, playerWorkersWant: 3,
  },
  {
    id: 2, name: '溪边清寨', mapId: 'qingpo',
    hint: '对面多了长弓。粮够就扩充刀盾，顺手再出一两个长弓。',
    time: 100, starTime: 24, lossCap: 4, startRes: 145, enemyRes: 80,
    playerWorkers: 3, enemyWorkers: 1, playerBlades: 0, playerBows: 0,
    enemyBlades: 3, enemyBows: 1, enemyRaiders: 0, enemyTowers: 0,
    playerHallHp: 560, enemyHallHp: 300,
    aiPushAt: 8, aiPushTime: 110, aiBuildYard: false, aiMaxArmy: 5,
    playerPushAt: 4, playerWorkersWant: 3,
  },
  {
    id: 3, name: '对坡推进', mapId: 'qingpo',
    hint: '赤岗部也会建校场补兵。尽早推营，别被他们先压过来。',
    time: 105, starTime: 22, lossCap: 5, startRes: 140, enemyRes: 130,
    playerWorkers: 3, enemyWorkers: 2, playerBlades: 0, playerBows: 0,
    enemyBlades: 2, enemyBows: 1, enemyRaiders: 0, enemyTowers: 0,
    playerHallHp: 620, enemyHallHp: 320,
    aiPushAt: 8, aiPushTime: 105, aiBuildYard: true, aiMaxArmy: 5,
    playerPushAt: 5, playerWorkersWant: 3,
  },
  {
    id: 4, name: '桐林开路', mapId: 'tonglin',
    hint: '林子挡住直路，从两侧空档绕过去。对面竖了箭楼，先集火再冲大营。',
    time: 125, starTime: 20, lossCap: 5, startRes: 140, enemyRes: 140,
    playerWorkers: 3, enemyWorkers: 2, playerBlades: 0, playerBows: 0,
    enemyBlades: 2, enemyBows: 1, enemyRaiders: 0, enemyTowers: 1,
    playerHallHp: 680, enemyHallHp: 340,
    aiPushAt: 8, aiPushTime: 110, aiBuildYard: true, aiMaxArmy: 5,
    playerPushAt: 6, playerWorkersWant: 3,
  },
  {
    id: 5, name: '双堆争粮', mapId: 'tonglin',
    hint: '两边都要收粮。民伕可再招一个，兵力够了再整队进攻。',
    time: 130, starTime: 18, lossCap: 6, startRes: 145, enemyRes: 130,
    playerWorkers: 3, enemyWorkers: 2, playerBlades: 0, playerBows: 0,
    enemyBlades: 2, enemyBows: 1, enemyRaiders: 0, enemyTowers: 1,
    playerHallHp: 720, enemyHallHp: 320,
    aiPushAt: 8, aiPushTime: 120, aiBuildYard: true, aiMaxArmy: 5,
    playerPushAt: 5, playerWorkersWant: 3,
  },
  {
    id: 6, name: '夹道破营', mapId: 'chigang',
    hint: '梁上有两条夹道。选一条推进，突击手适合冲锋，留意箭楼。',
    time: 135, starTime: 16, lossCap: 6, startRes: 130, enemyRes: 150,
    playerWorkers: 3, enemyWorkers: 3, playerBlades: 0, playerBows: 0,
    enemyBlades: 2, enemyBows: 2, enemyRaiders: 0, enemyTowers: 1,
    playerHallHp: 740, enemyHallHp: 360,
    aiPushAt: 8, aiPushTime: 115, aiBuildYard: true, aiMaxArmy: 6,
    playerPushAt: 6, playerWorkersWant: 4,
  },
  {
    id: 7, name: '夜坡强攻', mapId: 'chigang',
    hint: '对方会主动来袭。先顶住再反推，损失少且剩余时间多为三星。',
    time: 130, starTime: 16, lossCap: 7, startRes: 135, enemyRes: 160,
    playerWorkers: 4, enemyWorkers: 2, playerBlades: 2, playerBows: 1,
    enemyBlades: 2, enemyBows: 2, enemyRaiders: 0, enemyTowers: 2,
    playerHallHp: 760, enemyHallHp: 380,
    aiPushAt: 8, aiPushTime: 115, aiBuildYard: true, aiMaxArmy: 7,
    playerPushAt: 7, playerWorkersWant: 4,
  },
  {
    id: 8, name: '岗上决营', mapId: 'chigang',
    hint: '最后一仗。补齐刀盾、长弓和突击，集中推掉大营即可通关。',
    time: 135, starTime: 14, lossCap: 8, startRes: 140, enemyRes: 170,
    playerWorkers: 4, enemyWorkers: 2, playerBlades: 2, playerBows: 1,
    enemyBlades: 3, enemyBows: 2, enemyRaiders: 0, enemyTowers: 2,
    playerHallHp: 800, enemyHallHp: 400,
    aiPushAt: 8, aiPushTime: 120, aiBuildYard: true, aiMaxArmy: 7,
    playerPushAt: 7, playerWorkersWant: 4,
  },
];

export function mpLevelById(id: number): MpLevel {
  return MP_LEVELS.find((l) => l.id === id) ?? MP_LEVELS[0]!;
}
export function mpMapById(id: string): MpMap {
  return MP_MAPS[id] ?? MP_MAPS.qingpo!;
}

export type MpCreateOpts = { skipCountdown?: boolean; freezeAi?: boolean; seed?: number };

function nextId(m: { nextId: number }): number {
  return m.nextId++;
}

function makeUnit(m: { nextId: number }, side: MpSide, kind: MpUnitKind, x: number, y: number, facing: number): MpUnit {
  const s = UNIT_SPEC[kind];
  return {
    id: nextId(m), side, kind, x, y, facing, hp: s.hp, maxHp: s.hp, atkCd: 0,
    order: { t: 'idle' }, path: [], pathI: 0, stuckT: 0, lastX: x, lastY: y,
  };
}

function makeBld(m: { nextId: number }, side: MpSide, kind: MpBldKind, x: number, y: number, hp: number, built = 1): MpBld {
  const s = BLD_SPEC[kind];
  return {
    id: nextId(m), side, kind, x, y, hp, maxHp: hp, built, queue: [], trainT: 0, atkCd: 0,
  };
}

function fanAround(x: number, y: number, n: number, towardX: number, towardY: number, spread: number): { x: number; y: number }[] {
  const base = Math.atan2(towardY - y, towardX - x);
  const out: { x: number; y: number }[] = [];
  for (let i = 0; i < n; i++) {
    const a = base + (i - (n - 1) / 2) * 0.55;
    out.push({ x: x + Math.cos(a) * spread, y: y + Math.sin(a) * spread });
  }
  return out;
}

export function createMpMatch(levelId: number, opts: MpCreateOpts = {}): MpMatch {
  const level = mpLevelById(levelId);
  const proto = mpMapById(level.mapId);
  const map: MpMap = { ...proto, blocks: proto.blocks.slice(), nodes: proto.nodes.map((n) => ({ ...n })), enemyTowers: proto.enemyTowers.slice() };
  const seed = opts.seed ?? level.id * 7919 + 17;
  const rng = { s: seed >>> 0 };
  const idHold = { nextId: 1 };
  const nodes: MpNode[] = map.nodes.map((n, i) => {
    const amt = nodeAmt(n);
    return { id: i, x: n.x, y: n.y, amount: amt, max: amt };
  });
  const buildings: MpBld[] = [];
  const units: MpUnit[] = [];
  const ph = makeBld(idHold, 'player', 'hall', map.playerHall.x, map.playerHall.y, level.playerHallHp, 1);
  const eh = makeBld(idHold, 'enemy', 'hall', map.enemyHall.x, map.enemyHall.y, level.enemyHallHp, 1);
  buildings.push(ph, eh);
  const etowers = map.enemyTowers.slice(0, level.enemyTowers);
  for (const t of etowers) buildings.push(makeBld(idHold, 'enemy', 'tower', t.x, t.y, BLD_SPEC.tower.hp, 1));
  if (level.id >= 5 && map.playerTowers) {
    for (const t of map.playerTowers.slice(0, 1)) {
      buildings.push(makeBld(idHold, 'player', 'tower', t.x, t.y, BLD_SPEC.tower.hp, 1));
    }
  }

  const pSpots = fanAround(ph.x, ph.y, level.playerWorkers + level.playerBlades + level.playerBows, eh.x, eh.y, 58);
  let si = 0;
  for (let i = 0; i < level.playerWorkers; i++) {
    const p = pSpots[si++] ?? { x: ph.x + 50, y: ph.y };
    units.push(makeUnit(idHold, 'player', 'worker', p.x, p.y, 0));
  }
  for (let i = 0; i < level.playerBlades; i++) {
    const p = pSpots[si++] ?? { x: ph.x + 60, y: ph.y };
    units.push(makeUnit(idHold, 'player', 'blade', p.x, p.y, 0));
  }
  for (let i = 0; i < level.playerBows; i++) {
    const p = pSpots[si++] ?? { x: ph.x + 60, y: ph.y + 20 };
    units.push(makeUnit(idHold, 'player', 'bow', p.x, p.y, 0));
  }
  const eSpots = fanAround(eh.x, eh.y, level.enemyWorkers + level.enemyBlades + level.enemyBows + level.enemyRaiders, ph.x, ph.y, 58);
  si = 0;
  for (let i = 0; i < level.enemyWorkers; i++) {
    const p = eSpots[si++] ?? { x: eh.x - 50, y: eh.y };
    units.push(makeUnit(idHold, 'enemy', 'worker', p.x, p.y, Math.PI));
  }
  for (let i = 0; i < level.enemyBlades; i++) {
    const p = eSpots[si++] ?? { x: eh.x - 60, y: eh.y };
    units.push(makeUnit(idHold, 'enemy', 'blade', p.x, p.y, Math.PI));
  }
  for (let i = 0; i < level.enemyBows; i++) {
    const p = eSpots[si++] ?? { x: eh.x - 60, y: eh.y + 20 };
    units.push(makeUnit(idHold, 'enemy', 'bow', p.x, p.y, Math.PI));
  }
  for (let i = 0; i < level.enemyRaiders; i++) {
    const p = eSpots[si++] ?? { x: eh.x - 70, y: eh.y };
    units.push(makeUnit(idHold, 'enemy', 'raider', p.x, p.y, Math.PI));
  }

  const camX = clamp(ph.x - MP_VIEW_W / 2, 0, Math.max(0, map.w - MP_VIEW_W));
  const camY = clamp(ph.y - MP_VIEW_H / 2, 0, Math.max(0, map.h - MP_VIEW_H));
  return {
    level, map,
    phase: opts.skipCountdown ? 'play' : 'countdown',
    phaseT: opts.skipCountdown ? 0 : 2.6,
    time: level.time,
    leftover: 0,
    stars: 0,
    message: opts.skipCountdown ? '开始收粮、建营' : '整队待发',
    finished: false,
    res: { player: level.startRes, enemy: level.enemyRes },
    units, buildings, nodes,
    selected: [],
    nextId: idHold.nextId,
    losses: { player: 0, enemy: 0 },
    kills: { player: 0, enemy: 0 },
    enemyHallDmg: 0,
    camX, camY, acc: 0, aiAcc: 0, rng,
    cmds: [],
    pushing: { player: false, enemy: false },
    freezeAi: !!opts.freezeAi,
  };
}

export function hallOf(m: MpMatch, side: MpSide): MpBld | undefined {
  return m.buildings.find((b) => b.side === side && b.kind === 'hall' && b.hp > 0);
}
export function unitsOf(m: MpMatch, side: MpSide, kind?: MpUnitKind): MpUnit[] {
  return m.units.filter((u) => u.hp > 0 && u.side === side && (kind == null || u.kind === kind));
}
export function militaryOf(m: MpMatch, side: MpSide): MpUnit[] {
  return m.units.filter((u) => u.hp > 0 && u.side === side && u.kind !== 'worker');
}
export function bldOf(m: MpMatch, id: number): MpBld | undefined {
  return m.buildings.find((b) => b.id === id && b.hp > 0);
}
export function unitOf(m: MpMatch, id: number): MpUnit | undefined {
  return m.units.find((u) => u.id === id && u.hp > 0);
}

function finish(m: MpMatch, won: boolean) {
  if (m.finished) return;
  m.finished = true;
  m.leftover = won ? Math.max(0, m.time) : 0;
  m.stars = mpStars(won, m.leftover, m.level.starTime, m.losses.player, m.level.lossCap, m.enemyHallDmg, true);
  m.phase = won ? 'won' : 'lost';
  const word = won ? '大营已破，青坡寨获胜' : '未能攻破敌营';
  m.message = `${word}。损失 ${m.losses.player}，剩余 ${m.leftover.toFixed(0)}s` + (m.stars ? `，${'★'.repeat(m.stars)}` : '，本关未通关');
}

export function matchScoreValue(m: MpMatch): number {
  return (m.phase === 'won' ? 800 : 0) + m.enemyHallDmg + Math.floor(m.leftover * 6) - m.losses.player * 12 + m.kills.player * 8;
}

export function parseMpSave(raw: unknown): LevelSave {
  return parseLevelSave(raw, MP_LEVEL_COUNT);
}

/* ---------- pathfinding ---------- */

type Grid = { step: number; w: number; h: number; ok: boolean[] };
const gridCache = new Map<string, Grid>();

function gridFor(map: MpMap, extra: MpRect[] = []): Grid {
  const key = map.id + '|' + extra.map((b) => `${b.x},${b.y},${b.w},${b.h}`).join(';');
  const hit = gridCache.get(key);
  if (hit) return hit;
  const step = 20;
  const w = Math.ceil(map.w / step);
  const h = Math.ceil(map.h / step);
  const ok: boolean[] = new Array(w * h);
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const px = x * step + step / 2;
      const py = y * step + step / 2;
      ok[y * w + x] = !blockedTerrain(map, px, py, 12);
      if (ok[y * w + x]) {
        for (const b of extra) {
          if (hitRect(px, py, 12, b)) { ok[y * w + x] = false; break; }
        }
      }
    }
  }
  const g = { step, w, h, ok };
  if (extra.length === 0) gridCache.set(key, g);
  return g;
}

function buildingExtras(m: MpMatch, ignore?: number): MpRect[] {
  const out: MpRect[] = [];
  for (const b of m.buildings) {
    if (b.hp <= 0 || b.id === ignore) continue;
    const r = bRadius(b) - 2;
    out.push({ x: b.x - r, y: b.y - r, w: r * 2, h: r * 2 });
  }
  return out;
}

function nearestOk(g: Grid, x: number, y: number): { cx: number; cy: number } {
  const sx = clamp(Math.floor(x / g.step), 0, g.w - 1);
  const sy = clamp(Math.floor(y / g.step), 0, g.h - 1);
  if (g.ok[sy * g.w + sx]) return { cx: sx, cy: sy };
  let best = { cx: sx, cy: sy };
  let bd = 1e9;
  for (let rad = 1; rad <= 14; rad++) {
    for (let dy = -rad; dy <= rad; dy++) {
      for (let dx = -rad; dx <= rad; dx++) {
        if (Math.abs(dx) !== rad && Math.abs(dy) !== rad) continue;
        const nx = sx + dx, ny = sy + dy;
        if (nx < 0 || ny < 0 || nx >= g.w || ny >= g.h) continue;
        if (!g.ok[ny * g.w + nx]) continue;
        const d = Math.hypot(dx, dy);
        if (d < bd) { bd = d; best = { cx: nx, cy: ny }; }
      }
    }
    if (bd < 1e8) return best;
  }
  return best;
}

function astar(m: MpMatch, sx: number, sy: number, tx: number, ty: number, ignoreBld?: number): { x: number; y: number }[] {
  const extras = buildingExtras(m, ignoreBld);
  const g = gridFor(m.map, extras);
  const a = nearestOk(g, sx, sy);
  const b = nearestOk(g, tx, ty);
  const start = a.cy * g.w + a.cx;
  const goal = b.cy * g.w + b.cx;
  if (!g.ok[start] || !g.ok[goal]) return [{ x: tx, y: ty }];
  if (start === goal) return [{ x: tx, y: ty }];
  const distA = new Float64Array(g.w * g.h).fill(1e12);
  const prev = new Int32Array(g.w * g.h).fill(-1);
  const closed = new Uint8Array(g.w * g.h);
  const open: number[] = [start];
  distA[start] = 0;
  const heur = (c: number) => {
    const cx = c % g.w, cy = (c / g.w) | 0;
    const gx = goal % g.w, gy = (goal / g.w) | 0;
    return Math.hypot(cx - gx, cy - gy);
  };
  const dirs = [
    [1, 0, 1], [-1, 0, 1], [0, 1, 1], [0, -1, 1],
    [1, 1, 1.414], [1, -1, 1.414], [-1, 1, 1.414], [-1, -1, 1.414],
  ];
  let found = false;
  let guard = 0;
  while (open.length && guard++ < 4000) {
    let bi = 0, bv = distA[open[0]!] + heur(open[0]!);
    for (let i = 1; i < open.length; i++) {
      const v = distA[open[i]!] + heur(open[i]!);
      if (v < bv) { bv = v; bi = i; }
    }
    const cur = open[bi]!;
    open[bi] = open[open.length - 1]!;
    open.pop();
    if (closed[cur]) continue;
    closed[cur] = 1;
    if (cur === goal) { found = true; break; }
    const cx = cur % g.w, cy = (cur / g.w) | 0;
    for (const [dx, dy, c] of dirs) {
      const nx = cx + dx!, ny = cy + dy!;
      if (nx < 0 || ny < 0 || nx >= g.w || ny >= g.h) continue;
      if (dx !== 0 && dy !== 0) {
        if (!g.ok[cy * g.w + nx] || !g.ok[ny * g.w + cx]) continue;
      }
      const ni = ny * g.w + nx;
      if (!g.ok[ni] || closed[ni]) continue;
      const nd = distA[cur] + c!;
      if (nd < distA[ni]) {
        distA[ni] = nd;
        prev[ni] = cur;
        open.push(ni);
      }
    }
  }
  if (!found) return [{ x: tx, y: ty }];
  const cells: { x: number; y: number }[] = [];
  let c = goal;
  while (c >= 0) {
    const cx = c % g.w, cy = (c / g.w) | 0;
    cells.push({ x: cx * g.step + g.step / 2, y: cy * g.step + g.step / 2 });
    if (c === start) break;
    c = prev[c]!;
  }
  cells.reverse();
  cells[cells.length - 1] = { x: tx, y: ty };
  return cells.length ? cells : [{ x: tx, y: ty }];
}

function setPath(m: MpMatch, u: MpUnit, tx: number, ty: number, ignoreBld?: number) {
  u.path = astar(m, u.x, u.y, tx, ty, ignoreBld);
  u.pathI = 0;
}

function approachPoint(sx: number, sy: number, tx: number, ty: number, want: number): { x: number; y: number } {
  const d = dist(sx, sy, tx, ty);
  if (d <= want || d < 1) return { x: tx, y: ty };
  const k = want / d;
  return { x: tx + (sx - tx) * k, y: ty + (sy - ty) * k };
}

function follow(m: MpMatch, u: MpUnit, dt: number, speed: number): boolean {
  if (!u.path.length || u.pathI >= u.path.length) return true;
  while (u.pathI < u.path.length - 1 && dist(u.x, u.y, u.path[u.pathI]!.x, u.path[u.pathI]!.y) < 10) u.pathI++;
  const t = u.path[u.pathI]!;
  const d = dist(u.x, u.y, t.x, t.y);
  if (d < 4) {
    u.pathI++;
    return u.pathI >= u.path.length;
  }
  const ang = Math.atan2(t.y - u.y, t.x - u.x);
  const step = speed * dt;
  let nx = u.x + Math.cos(ang) * Math.min(step, d);
  let ny = u.y + Math.sin(ang) * Math.min(step, d);
  if (blocked(m, nx, ny, UNIT_SPEC[u.kind].r * 0.7)) {
    u.stuckT += dt;
    return false;
  }
  u.facing = ang;
  u.x = nx;
  u.y = ny;
  return false;
}

function recoverStuck(m: MpMatch, u: MpUnit, tx: number, ty: number) {
  if (u.stuckT < 0.45) return;
  const want = Math.atan2(ty - u.y, tx - u.x);
  for (const ang of [0, 0.7, -0.7, 1.4, -1.4, Math.PI]) {
    const nx = u.x + Math.cos(want + ang) * 16;
    const ny = u.y + Math.sin(want + ang) * 16;
    if (!blocked(m, nx, ny, UNIT_SPEC[u.kind].r)) {
      u.x = nx;
      u.y = ny;
      u.facing = want + ang;
      break;
    }
  }
  setPath(m, u, tx, ty);
  u.stuckT = 0;
}

/* ---------- commands / economy / combat ---------- */

export function canPlace(m: MpMatch, kind: MpBldKind, x: number, y: number, _side: MpSide): boolean {
  const r = BLD_SPEC[kind].r;
  if (blockedTerrain(m.map, x, y, r + 2)) return false;
  for (const b of m.buildings) {
    if (b.hp <= 0) continue;
    if (dist(x, y, b.x, b.y) < r + bRadius(b) + 8) return false;
  }
  for (const n of m.nodes) {
    if (dist(x, y, n.x, n.y) < r + 28) return false;
  }
  return true;
}

export function tryTrain(m: MpMatch, side: MpSide, kind: MpUnitKind, fromId?: number): boolean {
  if (m.phase !== 'play' || m.finished) return false;
  const spec = UNIT_SPEC[kind];
  if (m.res[side] < spec.cost) return false;
  if (unitsOf(m, side).length + queueCount(m, side) >= MP_CAP) return false;
  const cands = m.buildings.filter((b) => {
    if (b.side !== side || b.hp <= 0 || b.built < 1) return false;
    if (fromId != null && b.id !== fromId) return false;
    return BLD_SPEC[b.kind].trains.includes(kind) && b.queue.length < MP_QUEUE;
  });
  const bld = cands[0];
  if (!bld) return false;
  m.res[side] -= spec.cost;
  bld.queue.push(kind);
  if (side === 'player') m.message = `开始训练${spec.name}（粮秣 ${m.res.player}）`;
  return true;
}

function queueCount(m: MpMatch, side: MpSide): number {
  let n = 0;
  for (const b of m.buildings) if (b.side === side) n += b.queue.length;
  return n;
}

export function tryBuild(m: MpMatch, side: MpSide, kind: MpBldKind, x: number, y: number): MpBld | null {
  if (m.phase !== 'play' || m.finished) return null;
  if (kind === 'hall') return null;
  const spec = BLD_SPEC[kind];
  if (m.res[side] < spec.cost) return null;
  if (!canPlace(m, kind, x, y, side)) return null;
  const workers = unitsOf(m, side, 'worker');
  if (!workers.length) return null;
  // must be reasonably near a friendly hall or worker
  const hall = hallOf(m, side);
  const near = workers.some((w) => dist(w.x, w.y, x, y) < 260) || (hall ? dist(hall.x, hall.y, x, y) < 280 : false);
  if (!near) return null;
  m.res[side] -= spec.cost;
  const b = makeBld(m, side, kind, x, y, Math.max(40, Math.floor(spec.hp * 0.3)), 0);
  b.maxHp = spec.hp;
  m.buildings.push(b);
  const builder = workers.slice().sort((a, c) => dist(a.x, a.y, x, y) - dist(c.x, c.y, x, y))[0]!;
  builder.order = { t: 'build', bldId: b.id };
  setPath(m, builder, x, y, b.id);
  if (side === 'player') m.message = `民伕开始建造${spec.name}`;
  return b;
}

function dropOffs(m: MpMatch, side: MpSide): MpBld[] {
  return m.buildings.filter((b) => b.side === side && b.hp > 0 && b.built >= 1 && (b.kind === 'hall' || b.kind === 'depot'));
}

function nearestDrop(m: MpMatch, u: MpUnit): MpBld | undefined {
  const ds = dropOffs(m, u.side);
  let best: MpBld | undefined;
  let bd = 1e9;
  for (const d of ds) {
    const t = dist(u.x, u.y, d.x, d.y);
    if (t < bd) { bd = t; best = d; }
  }
  return best;
}

function nearestNode(m: MpMatch, x: number, y: number): MpNode | undefined {
  let best: MpNode | undefined;
  let bd = 1e9;
  for (const n of m.nodes) {
    if (n.amount < 1) continue;
    const t = dist(x, y, n.x, n.y);
    if (t < bd) { bd = t; best = n; }
  }
  return best;
}

function assignIdleGather(m: MpMatch, side: MpSide) {
  for (const u of unitsOf(m, side, 'worker')) {
    if (u.order.t !== 'idle') continue;
    const n = nearestNode(m, u.x, u.y);
    if (!n) continue;
    u.order = { t: 'gather', nodeId: n.id, loaded: 0, phase: 'go', hackT: 0 };
    setPath(m, u, n.x, n.y);
  }
}

function assignBuilders(m: MpMatch, side: MpSide) {
  for (const b of m.buildings) {
    if (b.side !== side || b.hp <= 0 || b.built >= 1) continue;
    const taken = m.units.some((u) => u.hp > 0 && u.order.t === 'build' && u.order.bldId === b.id);
    if (taken) continue;
    const idle = unitsOf(m, side, 'worker').filter((u) => u.order.t === 'idle' || u.order.t === 'gather');
    if (!idle.length) continue;
    idle.sort((a, c) => dist(a.x, a.y, b.x, b.y) - dist(c.x, c.y, b.x, b.y));
    const w = idle[0]!;
    w.order = { t: 'build', bldId: b.id };
    setPath(m, w, b.x, b.y, b.id);
  }
}

function liveTarget(m: MpMatch, id: number): { x: number; y: number; r: number; hp: number; side: MpSide; kind: 'unit' | 'bld'; ref: MpUnit | MpBld } | null {
  const u = unitOf(m, id);
  if (u) return { x: u.x, y: u.y, r: UNIT_SPEC[u.kind].r, hp: u.hp, side: u.side, kind: 'unit', ref: u };
  const b = bldOf(m, id);
  if (b) return { x: b.x, y: b.y, r: bRadius(b), hp: b.hp, side: b.side, kind: 'bld', ref: b };
  return null;
}

function acquire(m: MpMatch, u: MpUnit, radius: number, preferHall = false): number | null {
  let best: number | null = null;
  let bd = radius;
  for (const e of m.units) {
    if (e.hp <= 0 || e.side === u.side) continue;
    const d = dist(u.x, u.y, e.x, e.y);
    if (d < bd) { bd = d; best = e.id; }
  }
  // buildings
  for (const b of m.buildings) {
    if (b.hp <= 0 || b.side === u.side) continue;
    const d = dist(u.x, u.y, b.x, b.y) - bRadius(b);
    const score = preferHall && b.kind === 'hall' ? d - 20 : d;
    if (score < bd) { bd = score; best = b.id; }
  }
  return best;
}

function dealDamage(m: MpMatch, from: MpUnit | MpBld, fromSide: MpSide, atk: number, targetId: number) {
  const t = liveTarget(m, targetId);
  if (!t) return;
  const before = t.hp;
  if (t.kind === 'unit') {
    const u = t.ref as MpUnit;
    u.hp -= atk;
    if (u.hp <= 0) {
      u.hp = 0;
      m.losses[u.side] += 1;
      m.kills[fromSide] += 1;
      if (m.selected.includes(u.id)) m.selected = m.selected.filter((id) => id !== u.id);
    }
  } else {
    const b = t.ref as MpBld;
    b.hp -= atk;
    if (b.side === 'enemy' && b.kind === 'hall') m.enemyHallDmg += Math.min(atk, before);
    if (b.hp <= 0) {
      b.hp = 0;
      b.queue = [];
      if (b.kind === 'hall') finish(m, b.side === 'enemy');
    }
  }
  void from;
}

function tryShoot(m: MpMatch, u: MpUnit, targetId: number, dt: number): boolean {
  const spec = UNIT_SPEC[u.kind];
  const t = liveTarget(m, targetId);
  if (!t || t.side === u.side) return false;
  const d = dist(u.x, u.y, t.x, t.y) - t.r;
  u.atkCd = Math.max(0, u.atkCd - dt);
  if (d <= spec.range) {
    u.facing = Math.atan2(t.y - u.y, t.x - u.x);
    if (u.atkCd <= 0) {
      u.atkCd = spec.cooldown;
      dealDamage(m, u, u.side, spec.atk, targetId);
    }
    return true; // in range, stay
  }
  return false;
}

function spawnAt(m: MpMatch, b: MpBld, kind: MpUnitKind) {
  const s = UNIT_SPEC[kind];
  const hall = hallOf(m, b.side === 'player' ? 'enemy' : 'player');
  const toward = hall ? Math.atan2(hall.y - b.y, hall.x - b.x) : (b.side === 'player' ? 0 : Math.PI);
  for (let i = 0; i < 10; i++) {
    const a = toward + (i % 2 === 0 ? 1 : -1) * 0.35 * Math.ceil(i / 2);
    const x = b.x + Math.cos(a) * (bRadius(b) + s.r + 10);
    const y = b.y + Math.sin(a) * (bRadius(b) + s.r + 10);
    if (!blocked(m, x, y, s.r)) {
      m.units.push(makeUnit(m, b.side, kind, x, y, a));
      return;
    }
  }
  m.units.push(makeUnit(m, b.side, kind, b.x + 40, b.y, toward));
}

function stepBuildings(m: MpMatch, dt: number) {
  for (const b of m.buildings) {
    if (b.hp <= 0) continue;
    if (b.built < 1) continue;
    if (b.queue.length) {
      const kind = b.queue[0]!;
      if (b.trainT <= 0) b.trainT = UNIT_SPEC[kind].time;
      b.trainT -= dt;
      if (b.trainT <= 0) {
        b.queue.shift();
        b.trainT = b.queue.length ? UNIT_SPEC[b.queue[0]!].time : 0;
        spawnAt(m, b, kind);
        if (b.side === 'player') m.message = `${UNIT_SPEC[kind].name}训练完成`;
      }
    }
    const bs = BLD_SPEC[b.kind];
    if (bs.atk > 0 && b.built >= 1) {
      b.atkCd = Math.max(0, b.atkCd - dt);
      let best: number | null = null;
      let bd = bs.range;
      for (const e of m.units) {
        if (e.hp <= 0 || e.side === b.side) continue;
        const d = dist(b.x, b.y, e.x, e.y);
        if (d < bd) { bd = d; best = e.id; }
      }
      if (best != null && b.atkCd <= 0) {
        b.atkCd = bs.cooldown;
        dealDamage(m, b, b.side, bs.atk, best);
      }
    }
  }
}

function stepUnit(m: MpMatch, u: MpUnit, dt: number) {
  if (u.hp <= 0 || m.finished) return;
  const spec = UNIT_SPEC[u.kind];
  u.atkCd = Math.max(0, u.atkCd - dt);
  const movingOrder = u.order.t === 'move' || u.order.t === 'attack' || u.order.t === 'attackMove' || (u.order.t === 'gather' && u.order.phase !== 'hack') || u.order.t === 'build';
  let engaging = false;
  if (u.order.t === 'attack') {
    const t = liveTarget(m, u.order.id);
    if (t && dist(u.x, u.y, t.x, t.y) - t.r <= spec.range) engaging = true;
  }
  const moved = dist(u.x, u.y, u.lastX, u.lastY);
  if (movingOrder && !engaging && moved < spec.speed * dt * 0.15) u.stuckT += dt;
  else u.stuckT = Math.max(0, u.stuckT - dt * 0.5);
  u.lastX = u.x;
  u.lastY = u.y;

  // auto-defend if idle military
  if (u.order.t === 'idle' && u.kind !== 'worker') {
    const ag = acquire(m, u, 88);
    if (ag != null) u.order = { t: 'attack', id: ag };
  }

  if (u.order.t === 'idle') return;

  if (u.order.t === 'move') {
    const ox = u.order.x, oy = u.order.y;
    if (!u.path.length) setPath(m, u, ox, oy);
    recoverStuck(m, u, ox, oy);
    const arrived = follow(m, u, dt, spec.speed);
    if (arrived || dist(u.x, u.y, ox, oy) < 14) u.order = { t: 'idle' };
    return;
  }

  if (u.order.t === 'attack') {
    const t = liveTarget(m, u.order.id);
    if (!t) { u.order = { t: 'idle' }; u.path = []; return; }
    if (tryShoot(m, u, u.order.id, 0)) { u.path = []; return; }
    const ap = approachPoint(u.x, u.y, t.x, t.y, t.r + spec.range * 0.72);
    if (!u.path.length || u.pathI >= u.path.length) setPath(m, u, ap.x, ap.y, t.kind === 'bld' ? t.ref.id : undefined);
    recoverStuck(m, u, ap.x, ap.y);
    follow(m, u, dt, spec.speed);
    return;
  }

  if (u.order.t === 'attackMove') {
    const ox = u.order.x, oy = u.order.y;
    const acq = acquire(m, u, u.kind === 'bow' ? 160 : 110, dist(u.x, u.y, ox, oy) < 280);
    if (acq != null) {
      if (tryShoot(m, u, acq, 0)) { u.path = []; return; }
      const t = liveTarget(m, acq);
      if (t) {
        const ap = approachPoint(u.x, u.y, t.x, t.y, t.r + spec.range * 0.72);
        if (!u.path.length || u.pathI >= u.path.length) setPath(m, u, ap.x, ap.y, t.kind === 'bld' ? t.ref.id : undefined);
        recoverStuck(m, u, ap.x, ap.y);
        follow(m, u, dt, spec.speed);
        return;
      }
    }
    if (!u.path.length || u.pathI >= u.path.length) setPath(m, u, ox, oy);
    recoverStuck(m, u, ox, oy);
    const arrived = follow(m, u, dt, spec.speed);
    if (arrived || dist(u.x, u.y, ox, oy) < 16) {
      const hall = hallOf(m, u.side === 'player' ? 'enemy' : 'player');
      if (hall) u.order = { t: 'attack', id: hall.id };
      else u.order = { t: 'idle' };
    }
    return;
  }

  if (u.order.t === 'gather') {
    const n = m.nodes[u.order.nodeId];
    if (u.order.phase === 'go') {
      if (!n || n.amount < 1) { u.order = { t: 'idle' }; return; }
      if (!u.path.length) setPath(m, u, n.x, n.y);
      recoverStuck(m, u, n.x, n.y);
      follow(m, u, dt, spec.speed);
      if (dist(u.x, u.y, n.x, n.y) < 22) {
        u.order.phase = 'hack';
        u.order.hackT = MP_HACK_T;
        u.path = [];
      }
    } else if (u.order.phase === 'hack') {
      if (!n || n.amount < 1) { u.order = { t: 'idle' }; return; }
      u.order.hackT -= dt;
      if (u.order.hackT <= 0) {
        const amt = Math.min(MP_HARVEST, n.amount);
        n.amount -= amt;
        u.order.loaded = amt;
        u.order.phase = 'back';
        const drop = nearestDrop(m, u);
        if (drop) setPath(m, u, drop.x, drop.y, drop.id);
      }
    } else {
      const drop = nearestDrop(m, u);
      if (!drop) { u.order = { t: 'idle' }; return; }
      if (!u.path.length) setPath(m, u, drop.x, drop.y, drop.id);
      recoverStuck(m, u, drop.x, drop.y);
      follow(m, u, dt, spec.speed);
      if (dist(u.x, u.y, drop.x, drop.y) < bRadius(drop) + 16) {
        const bonus = drop.kind === 'depot' ? 1.15 : 1;
        m.res[u.side] += Math.floor(u.order.loaded * bonus);
        u.order.loaded = 0;
        if (n && n.amount >= 1) {
          u.order.phase = 'go';
          setPath(m, u, n.x, n.y);
        } else u.order = { t: 'idle' };
      }
    }
    return;
  }

  if (u.order.t === 'build') {
    const b = bldOf(m, u.order.bldId);
    if (!b || b.built >= 1) { u.order = { t: 'idle' }; u.path = []; return; }
    const ap = approachPoint(u.x, u.y, b.x, b.y, bRadius(b) + 8);
    if (dist(u.x, u.y, b.x, b.y) > bRadius(b) + 18) {
      if (!u.path.length) setPath(m, u, ap.x, ap.y, b.id);
      recoverStuck(m, u, ap.x, ap.y);
      follow(m, u, dt, spec.speed);
    } else {
      u.path = [];
      const need = BLD_SPEC[b.kind].time;
      b.built = Math.min(1, b.built + dt / need);
      b.hp = Math.min(b.maxHp, b.hp + (b.maxHp * 0.7) * (dt / need));
      if (b.built >= 1) {
        b.built = 1;
        b.hp = b.maxHp;
        if (b.side === 'player') m.message = `${BLD_SPEC[b.kind].name}建成`;
        u.order = { t: 'idle' };
      }
    }
  }
}

function separate(m: MpMatch, dt: number) {
  const list = m.units.filter((u) => u.hp > 0);
  for (let i = 0; i < list.length; i++) {
    for (let j = i + 1; j < list.length; j++) {
      const a = list[i]!, b = list[j]!;
      const want = UNIT_SPEC[a.kind].r + UNIT_SPEC[b.kind].r - 2;
      const d = dist(a.x, a.y, b.x, b.y);
      if (d < 0.1 || d >= want) continue;
      const push = ((want - d) / want) * 22 * dt;
      const ang = Math.atan2(a.y - b.y, a.x - b.x);
      const ax = a.x + Math.cos(ang) * push;
      const ay = a.y + Math.sin(ang) * push;
      const bx = b.x - Math.cos(ang) * push;
      const by = b.y - Math.sin(ang) * push;
      if (!blocked(m, ax, ay, UNIT_SPEC[a.kind].r * 0.6)) { a.x = ax; a.y = ay; }
      if (!blocked(m, bx, by, UNIT_SPEC[b.kind].r * 0.6)) { b.x = bx; b.y = by; }
    }
  }
}

function pickAt(m: MpMatch, x: number, y: number, side?: MpSide): number | null {
  let best: number | null = null;
  let bd = 22;
  for (const u of m.units) {
    if (u.hp <= 0) continue;
    if (side && u.side !== side) continue;
    const d = dist(x, y, u.x, u.y);
    if (d < bd) { bd = d; best = u.id; }
  }
  for (const b of m.buildings) {
    if (b.hp <= 0) continue;
    if (side && b.side !== side) continue;
    const d = dist(x, y, b.x, b.y);
    if (d < bRadius(b) + 6 && d < bd + 10) { bd = d; best = b.id; }
  }
  return best;
}

export function enemyAt(m: MpMatch, x: number, y: number): number | null {
  return pickAt(m, x, y, 'enemy');
}

function applyCommand(m: MpMatch, cmd: MpCommand) {
  if (m.finished) return;
  if (cmd.t === 'select') {
    m.selected = cmd.ids.filter((id) => unitOf(m, id)?.side === 'player' || bldOf(m, id)?.side === 'player');
    return;
  }
  if (cmd.t === 'selectAt') {
    const id = pickAt(m, cmd.x, cmd.y);
    if (id == null) {
      if (!cmd.additive) m.selected = [];
      return;
    }
    const own = unitOf(m, id)?.side === 'player' || bldOf(m, id)?.side === 'player';
    if (!own) return;
    if (cmd.additive) {
      if (m.selected.includes(id)) m.selected = m.selected.filter((x) => x !== id);
      else m.selected = m.selected.concat(id);
    } else m.selected = [id];
    return;
  }
  if (cmd.t === 'selectBox') {
    const x0 = Math.min(cmd.x0, cmd.x1), x1 = Math.max(cmd.x0, cmd.x1);
    const y0 = Math.min(cmd.y0, cmd.y1), y1 = Math.max(cmd.y0, cmd.y1);
    const ids = unitsOf(m, 'player').filter((u) => u.x >= x0 && u.x <= x1 && u.y >= y0 && u.y <= y1).map((u) => u.id);
    m.selected = cmd.additive ? Array.from(new Set(m.selected.concat(ids))) : ids;
    return;
  }
  if (cmd.t === 'selectAllArmy') {
    m.selected = militaryOf(m, 'player').map((u) => u.id);
    return;
  }
  if (cmd.t === 'selectIdleWorkers') {
    m.selected = unitsOf(m, 'player', 'worker').filter((u) => u.order.t === 'idle' || u.order.t === 'gather').map((u) => u.id);
    return;
  }
  if (cmd.t === 'stop') {
    for (const id of m.selected) {
      const u = unitOf(m, id);
      if (u) { u.order = { t: 'idle' }; u.path = []; }
    }
    return;
  }
  if (cmd.t === 'move') {
    const us = m.selected.map((id) => unitOf(m, id)).filter((u): u is MpUnit => !!u);
    us.forEach((u, i) => {
      const ox = cmd.x + (i % 3 - 1) * 16;
      const oy = cmd.y + (Math.floor(i / 3) - 1) * 16;
      u.order = { t: 'move', x: ox, y: oy };
      setPath(m, u, ox, oy);
    });
    if (us.length) m.message = '前往指定地点';
    return;
  }
  if (cmd.t === 'attack') {
    const us = m.selected.map((id) => unitOf(m, id)).filter((u): u is MpUnit => !!u);
    for (const u of us) {
      u.order = { t: 'attack', id: cmd.id };
      u.path = [];
    }
    if (us.length) m.message = '进攻目标';
    return;
  }
  if (cmd.t === 'attackMove') {
    const us = m.selected.map((id) => unitOf(m, id)).filter((u): u is MpUnit => !!u);
    us.forEach((u, i) => {
      const ox = cmd.x + (i % 3 - 1) * 14;
      const oy = cmd.y + (Math.floor(i / 3) - 1) * 14;
      u.order = { t: 'attackMove', x: ox, y: oy };
      setPath(m, u, ox, oy);
    });
    if (us.length) m.message = '进攻前进';
    return;
  }
  if (cmd.t === 'train') {
    const selB = m.selected.map((id) => bldOf(m, id)).find((b) => b && BLD_SPEC[b.kind].trains.includes(cmd.kind));
    tryTrain(m, 'player', cmd.kind, selB?.id);
    return;
  }
  if (cmd.t === 'build') {
    tryBuild(m, 'player', cmd.kind, cmd.x, cmd.y);
  }
}

export function pushCmd(m: MpMatch, cmd: MpCommand) {
  m.cmds.push(cmd);
}

export function preferredSpot(m: MpMatch, side: MpSide, kind: MpBldKind): { x: number; y: number } | null {
  const hall = hallOf(m, side);
  if (!hall) return null;
  const hint = kind === 'yard'
    ? (side === 'player' ? m.map.playerYard : m.map.enemyYard)
    : kind === 'tower'
      ? (side === 'player' ? m.map.playerTowers?.[0] : m.map.enemyTowers[0])
      : null;
  const tries: { x: number; y: number }[] = [];
  if (hint) tries.push(hint);
  const dir = side === 'player' ? 1 : -1;
  for (const [dx, dy] of [
    [0, 110], [0, -110], [dir * 110, 0], [dir * 80, 90], [dir * 80, -90],
    [-dir * 90, 80], [-dir * 90, -80], [dir * 130, 40], [40, dir * 120], [-40, 120],
    [120, 120], [-120, 120], [0, 150], [150, 0],
  ]) tries.push({ x: hall.x + dx, y: hall.y + dy });
  for (const p of tries) {
    if (canPlace(m, kind, p.x, p.y, side)) return p;
  }
  return null;
}

export function tryBuildAuto(m: MpMatch, side: MpSide, kind: MpBldKind): MpBld | null {
  const p = preferredSpot(m, side, kind);
  if (!p) return null;
  return tryBuild(m, side, kind, p.x, p.y);
}

function thinkAi(m: MpMatch) {
  if (m.freezeAi || m.finished || m.phase !== 'play') return;
  const lv = m.level;
  const side: MpSide = 'enemy';
  assignIdleGather(m, side);
  assignBuilders(m, side);
  const yard = m.buildings.find((b) => b.side === side && b.kind === 'yard' && b.hp > 0);
  if (lv.aiBuildYard && !yard) {
    const constructing = m.buildings.some((b) => b.side === side && b.kind === 'yard');
    if (!constructing) {
      const p = preferredSpot(m, side, 'yard');
      if (p) tryBuild(m, side, 'yard', p.x, p.y);
    }
  }
  const workers = unitsOf(m, side, 'worker').length;
  const army = militaryOf(m, side).length;
  const hall = hallOf(m, side);
  if (yard && yard.built >= 1 && army < lv.aiMaxArmy) {
    if (workers < 2 && lv.enemyWorkers > 0 && hall) tryTrain(m, side, 'worker');
    else {
      const bows = unitsOf(m, side, 'bow').length;
      const blades = unitsOf(m, side, 'blade').length;
      const wantBow = bows < Math.ceil(blades * 0.45);
      tryTrain(m, side, wantBow ? 'bow' : (lv.id >= 6 && army > 4 ? 'raider' : 'blade'));
    }
  }
  const elapsed = lv.time - m.time;
  const shouldPush = elapsed >= lv.aiPushTime && army >= Math.max(2, Math.min(lv.aiPushAt, 4));
  const pHall = hallOf(m, 'player');
  if (shouldPush && pHall) {
    m.pushing.enemy = true;
    for (const u of militaryOf(m, side)) {
      if (u.order.t === 'attack' && liveTarget(m, u.order.id)) continue;
      u.order = { t: 'attackMove', x: pHall.x, y: pHall.y };
      if (!u.path.length) setPath(m, u, pHall.x, pHall.y, pHall.id);
    }
  } else if (pHall) {
    // hold near own hall, engage nearby
    const eHall = hallOf(m, side);
    for (const u of militaryOf(m, side)) {
      if (u.order.t === 'idle' || u.order.t === 'move') {
        const ag = acquire(m, u, 130);
        if (ag != null) u.order = { t: 'attack', id: ag };
        else if (eHall && dist(u.x, u.y, eHall.x, eHall.y) > 140) {
          u.order = { t: 'move', x: eHall.x + (side === 'enemy' ? -70 : 70), y: eHall.y };
          setPath(m, u, u.order.x, u.order.y);
        }
      }
    }
  }
}

export function scriptPlayer(m: MpMatch) {
  if (m.finished || m.phase !== 'play') return;
  const lv = m.level;
  const side: MpSide = 'player';
  assignIdleGather(m, side);
  assignBuilders(m, side);
  const yard = m.buildings.find((b) => b.side === side && b.kind === 'yard' && b.hp > 0);
  if (!yard) {
    const p = preferredSpot(m, side, 'yard');
    if (p) tryBuild(m, side, 'yard', p.x, p.y);
  }
  const workers = unitsOf(m, side, 'worker').length + m.buildings.reduce((n, b) => n + (b.side === side ? b.queue.filter((k) => k === 'worker').length : 0), 0);
  const army = militaryOf(m, side);
  const queuedMil = m.buildings.reduce((n, b) => n + (b.side === side ? b.queue.filter((k) => k !== 'worker').length : 0), 0);
  if (yard && yard.built >= 1) {
    const blades = unitsOf(m, side, 'blade').length;
    const bows = unitsOf(m, side, 'bow').length;
    const raiders = unitsOf(m, side, 'raider').length;
    const total = army.length + queuedMil;
    const wantWorker = workers < lv.playerWorkersWant && army.length >= 2;
    if (wantWorker && m.res[side] >= UNIT_SPEC.worker.cost + UNIT_SPEC.blade.cost) tryTrain(m, side, 'worker');
    else if (total < MP_CAP - 1) {
      if (lv.id >= 6 && raiders < 2 && blades >= 3) tryTrain(m, side, 'raider');
      else if (bows < Math.max(1, Math.floor(blades * 0.5)) && blades >= 2) tryTrain(m, side, 'bow');
      else tryTrain(m, side, 'blade');
    }
  }
  const eHall = hallOf(m, 'enemy');
  const pHall = hallOf(m, 'player');
  const nearHome = pHall
    ? m.units.filter((u) => u.hp > 0 && u.side === 'enemy' && u.kind !== 'worker' && dist(u.x, u.y, pHall.x, pHall.y) < 220).length
    : 0;
  const urgent = m.time < 38;
  const want = lv.playerPushAt;
  const pressing = eHall ? army.filter((u) => dist(u.x, u.y, eHall.x, eHall.y) < 300).length : 0;
  // never pull a wave off a hall that is already under assault
  if (m.pushing.player && army.length < want && !urgent && pressing < 2) m.pushing.player = false;
  if (pHall && nearHome >= 2 && !m.pushing.player) {
    for (const u of army) {
      if (u.order.t === 'attack') {
        const t = liveTarget(m, u.order.id);
        if (t && dist(u.x, u.y, t.x, t.y) - t.r <= UNIT_SPEC[u.kind].range) continue;
      }
      u.order = { t: 'attackMove', x: pHall.x, y: pHall.y };
      if (!u.path.length) setPath(m, u, pHall.x, pHall.y, pHall.id);
    }
    return;
  }
  const ready = army.length >= want || (urgent && army.length >= Math.max(3, want - 2));
  if (ready && eHall) {
    m.pushing.player = true;
    for (const u of army) {
      if (u.order.t === 'attack') {
        const t = liveTarget(m, u.order.id);
        if (t && dist(u.x, u.y, t.x, t.y) - t.r <= UNIT_SPEC[u.kind].range) continue;
      }
      if (u.order.t === 'attackMove') {
        const dHall = dist(u.x, u.y, eHall.x, eHall.y);
        if (u.path.length && u.pathI < u.path.length && dHall > 80) continue;
      }
      u.order = { t: 'attackMove', x: eHall.x, y: eHall.y };
      setPath(m, u, eHall.x, eHall.y, eHall.id);
    }
  }
}

function stepCamera(m: MpMatch, dt: number, input: MpInput) {
  const spd = 340;
  if (input.camLeft) m.camX -= spd * dt;
  if (input.camRight) m.camX += spd * dt;
  if (input.camUp) m.camY -= spd * dt;
  if (input.camDown) m.camY += spd * dt;
  m.camX = clamp(m.camX, 0, Math.max(0, m.map.w - MP_VIEW_W));
  m.camY = clamp(m.camY, 0, Math.max(0, m.map.h - MP_VIEW_H));
}

function checkEnd(m: MpMatch) {
  if (m.finished) return;
  const eh = m.buildings.find((b) => b.kind === 'hall' && b.side === 'enemy');
  const ph = m.buildings.find((b) => b.kind === 'hall' && b.side === 'player');
  if (!eh || eh.hp <= 0) finish(m, true);
  else if (!ph || ph.hp <= 0) finish(m, false);
}

export function stepMp(m: MpMatch, dt: number, input: MpInput = EMPTY_MP_INPUT) {
  if (m.finished) {
    stepCamera(m, dt, input);
    return;
  }
  if (m.phase === 'countdown') {
    m.phaseT -= dt;
    m.message = String(Math.max(1, Math.ceil(m.phaseT)));
    if (m.phaseT <= 0) {
      m.phase = 'play';
      m.message = '开始收粮、建营';
    }
    stepCamera(m, dt, input);
    return;
  }
  if (m.phase !== 'play') {
    stepCamera(m, dt, input);
    return;
  }
  const cmds = m.cmds.splice(0, m.cmds.length);
  for (const c of cmds) applyCommand(m, c);
  m.aiAcc += dt;
  if (m.aiAcc >= 0.28) {
    m.aiAcc = 0;
    thinkAi(m);
  }
  assignIdleGather(m, 'player');
  assignIdleGather(m, 'enemy');
  assignBuilders(m, 'player');
  assignBuilders(m, 'enemy');
  stepBuildings(m, dt);
  if (m.finished) return;
  for (const u of m.units) stepUnit(m, u, dt);
  if (m.finished) return;
  separate(m, dt);
  checkEnd(m);
  if (m.finished) return;
  m.time -= dt;
  if (m.time <= 0) {
    m.time = 0;
    const eh = hallOf(m, 'enemy');
    finish(m, !!eh && eh.hp <= 0);
  }
  stepCamera(m, dt, input);
}

export function tickMp(m: MpMatch, dt: number, input: MpInput = EMPTY_MP_INPUT) {
  const d = Math.min(0.05, Math.max(0, dt));
  m.acc += d;
  let n = 0;
  while (m.acc >= MP_DT && n < 4 && !m.finished) {
    m.acc -= MP_DT;
    stepMp(m, MP_DT, input);
    n++;
  }
  if (m.finished) stepCamera(m, d, input);
}

export function autoPlayMp(levelId: number, maxSeconds?: number): MpMatch {
  const m = createMpMatch(levelId, { skipCountdown: true });
  const limit = maxSeconds ?? m.level.time + 3;
  const frames = Math.ceil(limit / MP_DT) + 6;
  for (let i = 0; i < frames && !m.finished; i++) {
    if (i % 8 === 0) scriptPlayer(m);
    stepMp(m, MP_DT);
  }
  if (!m.finished) {
    const eh = hallOf(m, 'enemy');
    finish(m, !!eh && eh.hp <= 0);
  }
  return m;
}

export function worldFromView(m: MpMatch, vx: number, vy: number): { x: number; y: number } {
  return { x: vx + m.camX, y: vy + m.camY };
}
