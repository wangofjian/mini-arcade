import { parseLevelSave, type LevelSave } from './progressSave';

export const AS_VIEW_W = 960;
export const AS_VIEW_H = 540;
export const AS_DT = 1 / 60;
export const AS_SAVE_KEY = 'ash-shed-save';
export const AS_LEVEL_COUNT = 8;
export const AS_OUR_NAME = '青灯巡卫';
export const AS_THEIR_NAME = '夜鸦帮';
export const AS_PLAYER_R = 13;
export const AS_PLAYER_SPEED = 188;
export const AS_PLAYER_HP = 100;
export const AS_IFRAME = 0.48;

export type AsPhase = 'countdown' | 'play' | 'won' | 'lost';
export type AsWeapon = 'pistol' | 'shotgun' | 'bomb';
export type AsEnemyKind = 'runner' | 'shooter' | 'heavy';
export type AsGoal = 'clear' | 'exit' | 'quota';
export type AsRect = { x: number; y: number; w: number; h: number };

export type AsWeaponSpec = {
  name: string;
  dmg: number;
  rate: number;
  spread: number;
  pellets: number;
  speed: number;
  range: number;
  mag: number;
  reload: number;
  reserve: number;
  radius: number;
};

export const WEAPON_SPEC: Record<AsWeapon, AsWeaponSpec> = {
  pistol: { name: '短铳', dmg: 26, rate: 0.18, spread: 0.045, pellets: 1, speed: 580, range: 460, mag: 12, reload: 0.9, reserve: 120, radius: 0 },
  shotgun: { name: '散弹', dmg: 12, rate: 0.48, spread: 0.3, pellets: 6, speed: 510, range: 220, mag: 5, reload: 1.15, reserve: 25, radius: 0 },
  bomb: { name: '震包', dmg: 70, rate: 0.65, spread: 0, pellets: 0, speed: 280, range: 300, mag: 1, reload: 0.55, reserve: 3, radius: 82 },
};

export const ENEMY_SPEC: Record<AsEnemyKind, {
  name: string; hp: number; speed: number; r: number; dmg: number; range: number; rate: number; kind: 'melee' | 'gun';
}> = {
  runner: { name: '扑手', hp: 28, speed: 112, r: 12, dmg: 11, range: 20, rate: 0.7, kind: 'melee' },
  shooter: { name: '冷铳', hp: 34, speed: 86, r: 12, dmg: 8, range: 310, rate: 0.95, kind: 'gun' },
  heavy: { name: '铁肩', hp: 110, speed: 72, r: 16, dmg: 16, range: 24, rate: 0.85, kind: 'melee' },
};

export const WEAPON_ORDER: AsWeapon[] = ['pistol', 'shotgun', 'bomb'];

export type AsMap = {
  id: string;
  name: string;
  w: number;
  h: number;
  blocks: AsRect[];
  pads: { x: number; y: number }[];
  spawn: { x: number; y: number };
  exit: AsRect | null;
  pickups: { kind: 'shotgun' | 'bomb' | 'health' | 'ammo'; x: number; y: number }[];
};

export type AsWave = { delay: number; list: { kind: AsEnemyKind; pad: number }[] };

export type AsLevel = {
  id: number;
  name: string;
  mapId: string;
  hint: string;
  time: number;
  starTime: number;
  hpNeed: number;
  goal: AsGoal;
  quota: number;
  loadout: AsWeapon[];
  bombs: number;
  shotgun: boolean;
  waves: AsWave[];
};

export type AsInput = {
  up: boolean;
  down: boolean;
  left: boolean;
  right: boolean;
  shoot: boolean;
  reload: boolean;
  weapon: AsWeapon | null;
  aimX: number;
  aimY: number;
  hasAim: boolean;
};
export const EMPTY_AS_INPUT: AsInput = {
  up: false, down: false, left: false, right: false,
  shoot: false, reload: false, weapon: null,
  aimX: 0, aimY: 0, hasAim: false,
};

export type AsInv = {
  owned: Record<AsWeapon, boolean>;
  mag: Record<AsWeapon, number>;
  reserve: Record<AsWeapon, number>;
  current: AsWeapon;
  reloading: number;
  cool: number;
};

export type AsPlayer = {
  x: number;
  y: number;
  facing: number;
  hp: number;
  maxHp: number;
  iframe: number;
  inv: AsInv;
  vx: number;
  vy: number;
};

export type AsEnemy = {
  id: number;
  kind: AsEnemyKind;
  x: number;
  y: number;
  facing: number;
  hp: number;
  maxHp: number;
  cool: number;
  stuckT: number;
  lastX: number;
  lastY: number;
  path: { x: number; y: number }[];
  pathI: number;
  strafe: number;
};

export type AsBullet = {
  id: number;
  side: 'player' | 'enemy';
  x: number;
  y: number;
  vx: number;
  vy: number;
  dmg: number;
  life: number;
  r: number;
  bomb: boolean;
  radius: number;
};

export type AsPickup = {
  id: number;
  kind: 'shotgun' | 'bomb' | 'health' | 'ammo';
  x: number;
  y: number;
  taken: boolean;
};

export type AsMatch = {
  level: AsLevel;
  map: AsMap;
  phase: AsPhase;
  phaseT: number;
  time: number;
  leftover: number;
  stars: number;
  message: string;
  finished: boolean;
  player: AsPlayer;
  enemies: AsEnemy[];
  bullets: AsBullet[];
  pickups: AsPickup[];
  waveI: number;
  waveWait: number;
  kills: number;
  shots: number;
  camX: number;
  camY: number;
  acc: number;
  nextId: number;
  rng: { s: number };
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

export function asStars(
  won: boolean,
  leftover: number,
  starTime: number,
  hp: number,
  hpNeed: number,
  kills: number,
  finished: boolean,
): number {
  if (won && leftover >= starTime && hp >= hpNeed) return 3;
  if (won) return 2;
  if (finished && kills >= 1) return 1;
  return 0;
}

function hitRect(x: number, y: number, r: number, b: AsRect): boolean {
  return x + r > b.x && x - r < b.x + b.w && y + r > b.y && y - r < b.y + b.h;
}

export function blockedTerrain(map: AsMap, x: number, y: number, r: number): boolean {
  if (x - r < 16 || y - r < 16 || x + r > map.w - 16 || y + r > map.h - 16) return true;
  for (const b of map.blocks) if (hitRect(x, y, r, b)) return true;
  return false;
}

function los(map: AsMap, x1: number, y1: number, x2: number, y2: number): boolean {
  const d = dist(x1, y1, x2, y2);
  const n = Math.max(2, Math.ceil(d / 8));
  for (let i = 1; i < n; i++) {
    const t = i / n;
    if (blockedTerrain(map, x1 + (x2 - x1) * t, y1 + (y2 - y1) * t, 2)) return false;
  }
  return true;
}

function buildHuipeng(): AsMap {
  const blocks: AsRect[] = [
    { x: 300, y: 160, w: 70, h: 50 },
    { x: 300, y: 330, w: 70, h: 50 },
    { x: 590, y: 160, w: 70, h: 50 },
    { x: 590, y: 330, w: 70, h: 50 },
    { x: 445, y: 240, w: 70, h: 54 },
  ];
  const pads = [
    { x: 820, y: 120 }, { x: 860, y: 270 }, { x: 820, y: 420 },
    { x: 650, y: 90 }, { x: 650, y: 450 }, { x: 480, y: 90 },
    { x: 480, y: 450 }, { x: 200, y: 90 },
  ];
  return {
    id: 'huipeng', name: '灰棚场', w: 960, h: 540, blocks, pads,
    spawn: { x: 110, y: 270 },
    exit: { x: 860, y: 230, w: 70, h: 80 },
    pickups: [
      { kind: 'health', x: 480, y: 270 },
      { kind: 'ammo', x: 200, y: 430 },
    ],
  };
}

function buildNangduo(): AsMap {
  const blocks: AsRect[] = [
    { x: 250, y: 40, w: 60, h: 200 },
    { x: 250, y: 360, w: 60, h: 200 },
    { x: 500, y: 160, w: 80, h: 54 },
    { x: 500, y: 390, w: 80, h: 54 },
    { x: 730, y: 40, w: 60, h: 180 },
    { x: 730, y: 390, w: 60, h: 180 },
    { x: 380, y: 280, w: 54, h: 48 },
  ];
  const pads = [
    { x: 920, y: 100 }, { x: 960, y: 300 }, { x: 920, y: 500 },
    { x: 620, y: 80 }, { x: 620, y: 520 }, { x: 400, y: 80 },
    { x: 400, y: 520 }, { x: 180, y: 80 }, { x: 800, y: 300 },
  ];
  return {
    id: 'nangduo', name: '南垛仓', w: 1040, h: 600, blocks, pads,
    spawn: { x: 110, y: 300 },
    exit: { x: 940, y: 250, w: 70, h: 100 },
    pickups: [
      { kind: 'shotgun', x: 360, y: 300 },
      { kind: 'health', x: 560, y: 80 },
      { kind: 'bomb', x: 560, y: 520 },
      { kind: 'ammo', x: 200, y: 500 },
    ],
  };
}

function buildJiushui(): AsMap {
  const blocks: AsRect[] = [
    { x: 280, y: 180, w: 360, h: 48 },
    { x: 280, y: 420, w: 360, h: 48 },
    { x: 200, y: 40, w: 50, h: 90 },
    { x: 850, y: 40, w: 50, h: 140 },
    { x: 850, y: 460, w: 50, h: 140 },
    { x: 480, y: 300, w: 56, h: 48 },
    { x: 680, y: 300, w: 56, h: 48 },
  ];
  // north aisle y≈80-170, south y≈480-620, middle y≈240-410
  const pads = [
    { x: 1000, y: 100 }, { x: 1040, y: 320 }, { x: 1000, y: 540 },
    { x: 760, y: 100 }, { x: 760, y: 540 }, { x: 520, y: 100 },
    { x: 520, y: 540 }, { x: 300, y: 100 }, { x: 900, y: 320 },
  ];
  return {
    id: 'jiushui', name: '旧水栈', w: 1100, h: 640, blocks, pads,
    spawn: { x: 120, y: 500 },
    exit: { x: 1000, y: 80, w: 70, h: 90 },
    pickups: [
      { kind: 'shotgun', x: 200, y: 320 },
      { kind: 'bomb', x: 400, y: 320 },
      { kind: 'health', x: 700, y: 100 },
      { kind: 'health', x: 700, y: 540 },
      { kind: 'ammo', x: 400, y: 540 },
    ],
  };
}

export const AS_MAPS: Record<string, AsMap> = {
  huipeng: buildHuipeng(),
  nangduo: buildNangduo(),
  jiushui: buildJiushui(),
};

function W(kind: AsEnemyKind, pads: number[]): AsWave['list'] {
  return pads.map((pad, i) => ({ kind: i % 3 === 2 && kind === 'runner' ? 'runner' : kind, pad }));
}

function mix(items: { kind: AsEnemyKind; pad: number }[]): AsWave['list'] {
  return items;
}

export const AS_LEVELS: AsLevel[] = [
  {
    id: 1, name: '棚前演练', mapId: 'huipeng',
    hint: '左右移动，鼠标瞄准，按住射击清掉扑手。货垛能挡住子弹。',
    time: 85, starTime: 30, hpNeed: 55, goal: 'clear', quota: 0,
    loadout: ['pistol'], bombs: 0, shotgun: false,
    waves: [{ delay: 0, list: mix([{ kind: 'runner', pad: 0 }, { kind: 'runner', pad: 1 }, { kind: 'runner', pad: 2 }, { kind: 'runner', pad: 3 }, { kind: 'runner', pad: 4 }]) }],
  },
  {
    id: 2, name: '垛后对射', mapId: 'huipeng',
    hint: '对面有冷铳。躲到货垛后面再探头还击。',
    time: 95, starTime: 26, hpNeed: 50, goal: 'clear', quota: 0,
    loadout: ['pistol'], bombs: 0, shotgun: false,
    waves: [{ delay: 0, list: mix([
      { kind: 'runner', pad: 0 }, { kind: 'runner', pad: 2 }, { kind: 'runner', pad: 4 },
      { kind: 'shooter', pad: 1 }, { kind: 'shooter', pad: 3 }, { kind: 'shooter', pad: 5 },
    ]) }],
  },
  {
    id: 3, name: '两波清点', mapId: 'huipeng',
    hint: '清完第一波会再来一波。弹匣打空会自动换弹。',
    time: 100, starTime: 24, hpNeed: 48, goal: 'clear', quota: 0,
    loadout: ['pistol', 'bomb'], bombs: 2, shotgun: false,
    waves: [
      { delay: 0, list: mix([{ kind: 'runner', pad: 0 }, { kind: 'runner', pad: 1 }, { kind: 'shooter', pad: 3 }, { kind: 'runner', pad: 2 }, { kind: 'shooter', pad: 5 }]) },
      { delay: 1.6, list: mix([{ kind: 'runner', pad: 4 }, { kind: 'runner', pad: 6 }, { kind: 'shooter', pad: 1 }, { kind: 'shooter', pad: 7 }, { kind: 'runner', pad: 3 }]) },
    ],
  },
  {
    id: 4, name: '栈口撤离', mapId: 'nangduo',
    hint: '先解决拦路的人，再跑到东边栈口撤离。地上有散弹可拾。',
    time: 105, starTime: 22, hpNeed: 45, goal: 'exit', quota: 5,
    loadout: ['pistol'], bombs: 1, shotgun: false,
    waves: [{ delay: 0, list: mix([
      { kind: 'runner', pad: 5 }, { kind: 'runner', pad: 6 }, { kind: 'shooter', pad: 3 },
      { kind: 'shooter', pad: 4 }, { kind: 'runner', pad: 8 }, { kind: 'shooter', pad: 1 },
    ]) }],
  },
  {
    id: 5, name: '侧廊夹击', mapId: 'nangduo',
    hint: '走廊狭窄，注意两边。可用散弹近清，震包打堆。',
    time: 110, starTime: 20, hpNeed: 42, goal: 'clear', quota: 0,
    loadout: ['pistol', 'shotgun'], bombs: 2, shotgun: true,
    waves: [
      { delay: 0, list: mix([{ kind: 'shooter', pad: 3 }, { kind: 'shooter', pad: 4 }, { kind: 'runner', pad: 0 }, { kind: 'runner', pad: 2 }, { kind: 'runner', pad: 7 }]) },
      { delay: 1.4, list: mix([{ kind: 'shooter', pad: 8 }, { kind: 'shooter', pad: 1 }, { kind: 'runner', pad: 5 }, { kind: 'runner', pad: 6 }, { kind: 'heavy', pad: 1 }]) },
    ],
  },
  {
    id: 6, name: '三波货场', mapId: 'jiushui',
    hint: '三条夹道的旧水栈，连续三波。拾取生命和弹药再推进。',
    time: 120, starTime: 18, hpNeed: 40, goal: 'clear', quota: 0,
    loadout: ['pistol', 'shotgun', 'bomb'], bombs: 3, shotgun: true,
    waves: [
      { delay: 0, list: mix([{ kind: 'runner', pad: 7 }, { kind: 'runner', pad: 5 }, { kind: 'shooter', pad: 3 }, { kind: 'runner', pad: 6 }, { kind: 'shooter', pad: 4 }]) },
      { delay: 1.5, list: mix([{ kind: 'shooter', pad: 0 }, { kind: 'shooter', pad: 2 }, { kind: 'runner', pad: 8 }, { kind: 'runner', pad: 5 }, { kind: 'shooter', pad: 1 }]) },
      { delay: 1.5, list: mix([{ kind: 'runner', pad: 3 }, { kind: 'runner', pad: 4 }, { kind: 'shooter', pad: 8 }, { kind: 'heavy', pad: 1 }, { kind: 'runner', pad: 6 }]) },
    ],
  },
  {
    id: 7, name: '雨棚突围', mapId: 'jiushui',
    hint: '清掉足够的拦截后，向东北栈口撤离。',
    time: 120, starTime: 16, hpNeed: 40, goal: 'exit', quota: 8,
    loadout: ['pistol', 'shotgun', 'bomb'], bombs: 3, shotgun: true,
    waves: [
      { delay: 0, list: mix([{ kind: 'shooter', pad: 5 }, { kind: 'shooter', pad: 6 }, { kind: 'runner', pad: 7 }, { kind: 'runner', pad: 3 }, { kind: 'runner', pad: 4 }]) },
      { delay: 1.4, list: mix([{ kind: 'shooter', pad: 0 }, { kind: 'shooter', pad: 2 }, { kind: 'heavy', pad: 1 }, { kind: 'runner', pad: 8 }, { kind: 'shooter', pad: 8 }]) },
    ],
  },
  {
    id: 8, name: '夜垛收队', mapId: 'jiushui',
    hint: '最后一班。多波冷铳和铁肩，打完即胜。生命多、时间多为三星。',
    time: 130, starTime: 16, hpNeed: 36, goal: 'clear', quota: 0,
    loadout: ['pistol', 'shotgun', 'bomb'], bombs: 3, shotgun: true,
    waves: [
      { delay: 0, list: mix([{ kind: 'runner', pad: 5 }, { kind: 'runner', pad: 6 }, { kind: 'shooter', pad: 3 }, { kind: 'shooter', pad: 4 }, { kind: 'runner', pad: 7 }]) },
      { delay: 1.5, list: mix([{ kind: 'shooter', pad: 0 }, { kind: 'shooter', pad: 2 }, { kind: 'runner', pad: 8 }, { kind: 'heavy', pad: 1 }, { kind: 'shooter', pad: 8 }]) },
      { delay: 1.6, list: mix([{ kind: 'runner', pad: 3 }, { kind: 'runner', pad: 4 }, { kind: 'shooter', pad: 5 }, { kind: 'heavy', pad: 1 }, { kind: 'shooter', pad: 2 }, { kind: 'runner', pad: 0 }]) },
    ],
  },
];

// silence unused helper if any
void W;

export function asLevelById(id: number): AsLevel {
  return AS_LEVELS.find((l) => l.id === id) ?? AS_LEVELS[0]!;
}
export function asMapById(id: string): AsMap {
  return AS_MAPS[id] ?? AS_MAPS.huipeng!;
}

function makeInv(level: AsLevel): AsInv {
  const owned: Record<AsWeapon, boolean> = { pistol: true, shotgun: level.shotgun || level.loadout.includes('shotgun'), bomb: level.bombs > 0 || level.loadout.includes('bomb') };
  const mag: Record<AsWeapon, number> = { pistol: WEAPON_SPEC.pistol.mag, shotgun: owned.shotgun ? WEAPON_SPEC.shotgun.mag : 0, bomb: owned.bomb ? 1 : 0 };
  const reserve: Record<AsWeapon, number> = {
    pistol: WEAPON_SPEC.pistol.reserve,
    shotgun: owned.shotgun ? WEAPON_SPEC.shotgun.reserve : 0,
    bomb: level.bombs,
  };
  return { owned, mag, reserve, current: 'pistol', reloading: 0, cool: 0 };
}

export type AsCreateOpts = { skipCountdown?: boolean; freezeAi?: boolean; seed?: number };

export function createAsMatch(levelId: number, opts: AsCreateOpts = {}): AsMatch {
  const level = asLevelById(levelId);
  const map = asMapById(level.mapId);
  const seed = opts.seed ?? level.id * 6701 + 9;
  const rng = { s: seed >>> 0 };
  const player: AsPlayer = {
    x: map.spawn.x, y: map.spawn.y, facing: 0,
    hp: AS_PLAYER_HP, maxHp: AS_PLAYER_HP, iframe: 0,
    inv: makeInv(level), vx: 0, vy: 0,
  };
  const pickups: AsPickup[] = map.pickups.map((p, i) => ({ id: i + 1, kind: p.kind, x: p.x, y: p.y, taken: false }));
  const camX = clamp(player.x - AS_VIEW_W / 2, 0, Math.max(0, map.w - AS_VIEW_W));
  const camY = clamp(player.y - AS_VIEW_H / 2, 0, Math.max(0, map.h - AS_VIEW_H));
  const m: AsMatch = {
    level, map,
    phase: opts.skipCountdown ? 'play' : 'countdown',
    phaseT: opts.skipCountdown ? 0 : 2.4,
    time: level.time,
    leftover: 0, stars: 0,
    message: opts.skipCountdown ? '开始清场' : '整装待发',
    finished: false,
    player, enemies: [], bullets: [], pickups,
    waveI: 0, waveWait: level.waves[0]?.delay ?? 0,
    kills: 0, shots: 0,
    camX, camY, acc: 0, nextId: 10, rng,
    freezeAi: !!opts.freezeAi,
  };
  if (opts.skipCountdown && m.waveWait <= 0) spawnWave(m);
  return m;
}

function nid(m: AsMatch): number { return m.nextId++; }

function spawnWave(m: AsMatch) {
  const w = m.level.waves[m.waveI];
  if (!w) return;
  for (const s of w.list) {
    const pad = m.map.pads[s.pad] ?? m.map.pads[0]!;
    const spec = ENEMY_SPEC[s.kind];
    const jitter = 18;
    let x = pad.x + (rnd(m.rng) - 0.5) * jitter;
    let y = pad.y + (rnd(m.rng) - 0.5) * jitter;
    if (blockedTerrain(m.map, x, y, spec.r)) { x = pad.x; y = pad.y; }
    m.enemies.push({
      id: nid(m), kind: s.kind, x, y,
      facing: Math.atan2(m.player.y - y, m.player.x - x),
      hp: spec.hp, maxHp: spec.hp, cool: 0.2 + rnd(m.rng) * 0.4,
      stuckT: 0, lastX: x, lastY: y, path: [], pathI: 0,
      strafe: rnd(m.rng) > 0.5 ? 1 : -1,
    });
  }
  m.waveI += 1;
  m.message = m.waveI === 1 ? '敌人出现了' : `第 ${m.waveI} 波`;
}

function finish(m: AsMatch, won: boolean) {
  if (m.finished) return;
  m.finished = true;
  m.leftover = won ? Math.max(0, m.time) : 0;
  m.stars = asStars(won, m.leftover, m.level.starTime, m.player.hp, m.level.hpNeed, m.kills, true);
  m.phase = won ? 'won' : 'lost';
  const word = won ? (m.level.goal === 'exit' ? '已抵达栈口' : '清场完成') : '任务失败';
  m.message = `${word}。击倒 ${m.kills}，生命 ${Math.max(0, Math.ceil(m.player.hp))}，剩余 ${m.leftover.toFixed(0)}s` + (m.stars ? `，${'★'.repeat(m.stars)}` : '，本关未通关');
}

export function matchScoreValue(m: AsMatch): number {
  return (m.phase === 'won' ? 700 : 0) + m.kills * 20 + Math.floor(m.leftover * 5) + Math.floor(m.player.hp);
}

export function parseAsSave(raw: unknown): LevelSave {
  return parseLevelSave(raw, AS_LEVEL_COUNT);
}

export function liveEnemies(m: AsMatch): AsEnemy[] {
  return m.enemies.filter((e) => e.hp > 0);
}

/* ---------- pathfinding ---------- */

type Grid = { step: number; w: number; h: number; ok: boolean[] };
const gridCache = new Map<string, Grid>();

function gridFor(map: AsMap): Grid {
  const hit = gridCache.get(map.id);
  if (hit) return hit;
  const step = 20;
  const w = Math.ceil(map.w / step);
  const h = Math.ceil(map.h / step);
  const ok: boolean[] = new Array(w * h);
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      ok[y * w + x] = !blockedTerrain(map, x * step + step / 2, y * step + step / 2, 11);
    }
  }
  const g = { step, w, h, ok };
  gridCache.set(map.id, g);
  return g;
}

function nearestOk(g: Grid, x: number, y: number): { cx: number; cy: number } {
  const sx = clamp(Math.floor(x / g.step), 0, g.w - 1);
  const sy = clamp(Math.floor(y / g.step), 0, g.h - 1);
  if (g.ok[sy * g.w + sx]) return { cx: sx, cy: sy };
  let best = { cx: sx, cy: sy }, bd = 1e9;
  for (let rad = 1; rad <= 12; rad++) {
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

function astar(map: AsMap, sx: number, sy: number, tx: number, ty: number): { x: number; y: number }[] {
  const g = gridFor(map);
  const a = nearestOk(g, sx, sy);
  const b = nearestOk(g, tx, ty);
  const start = a.cy * g.w + a.cx;
  const goal = b.cy * g.w + b.cx;
  if (!g.ok[start] || !g.ok[goal] || start === goal) return [{ x: tx, y: ty }];
  const distA = new Float64Array(g.w * g.h).fill(1e12);
  const prev = new Int32Array(g.w * g.h).fill(-1);
  const closed = new Uint8Array(g.w * g.h);
  const open: number[] = [start];
  distA[start] = 0;
  const heur = (c: number) => {
    const cx = c % g.w, cy = (c / g.w) | 0;
    return Math.hypot(cx - (goal % g.w), cy - ((goal / g.w) | 0));
  };
  const dirs = [
    [1, 0, 1], [-1, 0, 1], [0, 1, 1], [0, -1, 1],
    [1, 1, 1.414], [1, -1, 1.414], [-1, 1, 1.414], [-1, -1, 1.414],
  ];
  let found = false, guard = 0;
  while (open.length && guard++ < 3500) {
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
      if (dx !== 0 && dy !== 0 && (!g.ok[cy * g.w + nx] || !g.ok[ny * g.w + cx])) continue;
      const ni = ny * g.w + nx;
      if (!g.ok[ni] || closed[ni]) continue;
      const nd = distA[cur] + c!;
      if (nd < distA[ni]) { distA[ni] = nd; prev[ni] = cur; open.push(ni); }
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

function setPath(map: AsMap, e: { x: number; y: number; path: { x: number; y: number }[]; pathI: number }, tx: number, ty: number) {
  e.path = astar(map, e.x, e.y, tx, ty);
  e.pathI = 0;
}

function follow(
  map: AsMap, e: { x: number; y: number; path: { x: number; y: number }[]; pathI: number; facing: number },
  dt: number, speed: number, r: number,
): boolean {
  if (!e.path.length || e.pathI >= e.path.length) return true;
  while (e.pathI < e.path.length - 1 && dist(e.x, e.y, e.path[e.pathI]!.x, e.path[e.pathI]!.y) < 10) e.pathI++;
  const t = e.path[e.pathI]!;
  const d = dist(e.x, e.y, t.x, t.y);
  if (d < 4) { e.pathI++; return e.pathI >= e.path.length; }
  const ang = Math.atan2(t.y - e.y, t.x - e.x);
  const step = Math.min(speed * dt, d);
  const nx = e.x + Math.cos(ang) * step;
  const ny = e.y + Math.sin(ang) * step;
  if (blockedTerrain(map, nx, ny, r)) return false;
  e.facing = ang;
  e.x = nx;
  e.y = ny;
  return false;
}

function tryMove(map: AsMap, x: number, y: number, dx: number, dy: number, r: number): { x: number; y: number } {
  let nx = x + dx, ny = y + dy;
  if (!blockedTerrain(map, nx, ny, r)) return { x: nx, y: ny };
  if (!blockedTerrain(map, nx, y, r)) return { x: nx, y };
  if (!blockedTerrain(map, x, ny, r)) return { x, y: ny };
  return { x, y };
}

/* ---------- combat ---------- */

export function tryReload(m: AsMatch): boolean {
  const inv = m.player.inv;
  if (inv.reloading > 0) return false;
  const w = inv.current;
  const spec = WEAPON_SPEC[w];
  if (inv.mag[w] >= spec.mag) return false;
  if (inv.reserve[w] <= 0 && w !== 'bomb') return false;
  if (w === 'bomb' && inv.reserve.bomb <= 0) return false;
  inv.reloading = spec.reload;
  m.message = `更换${spec.name}弹药`;
  return true;
}

export function switchWeapon(m: AsMatch, w: AsWeapon): boolean {
  if (!m.player.inv.owned[w]) return false;
  if (m.player.inv.current === w) return false;
  m.player.inv.current = w;
  m.player.inv.reloading = 0;
  m.player.inv.cool = 0.08;
  m.message = '换上' + WEAPON_SPEC[w].name;
  return true;
}

function finishReload(m: AsMatch) {
  const inv = m.player.inv;
  const w = inv.current;
  const spec = WEAPON_SPEC[w];
  if (w === 'bomb') {
    if (inv.reserve.bomb > 0 && inv.mag.bomb <= 0) { inv.mag.bomb = 1; }
    return;
  }
  const need = spec.mag - inv.mag[w];
  const take = Math.min(need, inv.reserve[w]);
  inv.mag[w] += take;
  inv.reserve[w] -= take;
}

function spawnBullet(m: AsMatch, side: 'player' | 'enemy', x: number, y: number, ang: number, dmg: number, speed: number, range: number, bomb = false, radius = 0) {
  m.bullets.push({
    id: nid(m), side, x, y,
    vx: Math.cos(ang) * speed, vy: Math.sin(ang) * speed,
    dmg, life: range / speed, r: bomb ? 6 : 3, bomb, radius,
  });
}

export function tryShoot(m: AsMatch): boolean {
  if (m.phase !== 'play' || m.finished) return false;
  const p = m.player;
  const inv = p.inv;
  if (inv.reloading > 0 || inv.cool > 0) return false;
  const w = inv.current;
  const spec = WEAPON_SPEC[w];
  if (inv.mag[w] <= 0) { tryReload(m); return false; }
  inv.mag[w] -= 1;
  inv.cool = spec.rate;
  m.shots += 1;
  const base = p.facing;
  if (w === 'bomb') {
    spawnBullet(m, 'player', p.x + Math.cos(base) * 16, p.y + Math.sin(base) * 16, base, spec.dmg, spec.speed, spec.range, true, spec.radius);
  } else {
    for (let i = 0; i < spec.pellets; i++) {
      const spr = (rnd(m.rng) - 0.5) * 2 * spec.spread;
      spawnBullet(m, 'player', p.x + Math.cos(base) * 16, p.y + Math.sin(base) * 16, base + spr, spec.dmg, spec.speed, spec.range);
    }
  }
  if (inv.mag[w] <= 0) tryReload(m);
  return true;
}

function explode(m: AsMatch, x: number, y: number, dmg: number, radius: number, side: 'player' | 'enemy') {
  if (side === 'player') {
    for (const e of m.enemies) {
      if (e.hp <= 0) continue;
      const d = dist(x, y, e.x, e.y);
      if (d <= radius) {
        const fall = 1 - d / radius * 0.4;
        hurtEnemy(m, e, dmg * fall);
      }
    }
  } else {
    const d = dist(x, y, m.player.x, m.player.y);
    if (d <= radius) hurtPlayer(m, dmg * (1 - d / radius * 0.4));
  }
}

function hurtEnemy(m: AsMatch, e: AsEnemy, dmg: number) {
  if (e.hp <= 0) return;
  e.hp -= dmg;
  if (e.hp <= 0) {
    e.hp = 0;
    m.kills += 1;
  }
}

function hurtPlayer(m: AsMatch, dmg: number) {
  const p = m.player;
  if (p.iframe > 0 || m.finished) return;
  p.hp -= dmg;
  p.iframe = AS_IFRAME;
  if (p.hp <= 0) {
    p.hp = 0;
    finish(m, false);
  }
}

function stepBullets(m: AsMatch, dt: number) {
  const next: AsBullet[] = [];
  for (const b of m.bullets) {
    b.life -= dt;
    const nx = b.x + b.vx * dt;
    const ny = b.y + b.vy * dt;
    if (blockedTerrain(m.map, nx, ny, b.r)) {
      if (b.bomb) explode(m, b.x, b.y, b.dmg, b.radius, b.side);
      continue;
    }
    b.x = nx;
    b.y = ny;
    let hit = false;
    if (b.side === 'player') {
      if (b.bomb) {
        if (b.life <= 0) { explode(m, b.x, b.y, b.dmg, b.radius, b.side); continue; }
        next.push(b);
        continue;
      }
      for (const e of m.enemies) {
        if (e.hp <= 0) continue;
        if (dist(b.x, b.y, e.x, e.y) < b.r + ENEMY_SPEC[e.kind].r) {
          hurtEnemy(m, e, b.dmg);
          hit = true;
          break;
        }
      }
    } else {
      if (dist(b.x, b.y, m.player.x, m.player.y) < b.r + AS_PLAYER_R) {
        hurtPlayer(m, b.dmg);
        hit = true;
      }
    }
    if (!hit && b.life > 0) next.push(b);
  }
  m.bullets = next;
}

function takePickups(m: AsMatch) {
  const p = m.player;
  for (const u of m.pickups) {
    if (u.taken) continue;
    if (dist(p.x, p.y, u.x, u.y) > 22) continue;
    u.taken = true;
    if (u.kind === 'shotgun') {
      p.inv.owned.shotgun = true;
      p.inv.mag.shotgun = Math.max(p.inv.mag.shotgun, WEAPON_SPEC.shotgun.mag);
      p.inv.reserve.shotgun += 15;
      m.message = '拾取散弹';
    } else if (u.kind === 'bomb') {
      p.inv.owned.bomb = true;
      p.inv.reserve.bomb += 2;
      if (p.inv.mag.bomb <= 0) p.inv.mag.bomb = 1;
      m.message = '拾取震包';
    } else if (u.kind === 'health') {
      p.hp = Math.min(p.maxHp, p.hp + 32);
      m.message = '包扎伤口';
    } else {
      p.inv.reserve.pistol += 24;
      if (p.inv.owned.shotgun) p.inv.reserve.shotgun += 8;
      m.message = '补充弹药';
    }
  }
}

function stepPlayer(m: AsMatch, dt: number, input: AsInput) {
  const p = m.player;
  p.iframe = Math.max(0, p.iframe - dt);
  const inv = p.inv;
  if (inv.cool > 0) inv.cool = Math.max(0, inv.cool - dt);
  if (inv.reloading > 0) {
    inv.reloading -= dt;
    if (inv.reloading <= 0) { inv.reloading = 0; finishReload(m); }
  }
  if (input.weapon) switchWeapon(m, input.weapon);
  if (input.reload) tryReload(m);

  let dx = 0, dy = 0;
  if (input.left) dx -= 1;
  if (input.right) dx += 1;
  if (input.up) dy -= 1;
  if (input.down) dy += 1;
  if (dx || dy) {
    const len = Math.hypot(dx, dy) || 1;
    const sp = AS_PLAYER_SPEED * dt;
    const pos = tryMove(m.map, p.x, p.y, (dx / len) * sp, (dy / len) * sp, AS_PLAYER_R);
    p.x = pos.x;
    p.y = pos.y;
  }
  if (input.hasAim) p.facing = Math.atan2(input.aimY - p.y, input.aimX - p.x);
  else if (dx || dy) p.facing = Math.atan2(dy, dx);

  if (input.shoot) tryShoot(m);
  takePickups(m);
}

function stepEnemy(m: AsMatch, e: AsEnemy, dt: number) {
  if (e.hp <= 0 || m.finished) return;
  const spec = ENEMY_SPEC[e.kind];
  const p = m.player;
  const d = dist(e.x, e.y, p.x, p.y);
  const seen = los(m.map, e.x, e.y, p.x, p.y);
  e.cool = Math.max(0, e.cool - dt);
  const moved = dist(e.x, e.y, e.lastX, e.lastY);
  if (moved < spec.speed * dt * 0.12) e.stuckT += dt;
  else e.stuckT = Math.max(0, e.stuckT - dt * 0.5);
  e.lastX = e.x;
  e.lastY = e.y;

  if (spec.kind === 'melee') {
    if (d <= spec.range + 2) {
      e.facing = Math.atan2(p.y - e.y, p.x - e.x);
      if (e.cool <= 0) { e.cool = spec.rate; hurtPlayer(m, spec.dmg); }
      return;
    }
    const tx = p.x, ty = p.y;
    if (!e.path.length || e.pathI >= e.path.length || e.stuckT > 0.4) {
      setPath(m.map, e, tx, ty);
      if (e.stuckT > 0.4) {
        const ang = Math.atan2(ty - e.y, tx - e.x) + e.strafe * 0.8;
        const nx = e.x + Math.cos(ang) * 14;
        const ny = e.y + Math.sin(ang) * 14;
        if (!blockedTerrain(m.map, nx, ny, spec.r)) { e.x = nx; e.y = ny; }
        e.stuckT = 0;
      }
    }
    follow(m.map, e, dt, spec.speed, spec.r);
    return;
  }

  // shooter: keep distance, fire when LOS
  e.facing = Math.atan2(p.y - e.y, p.x - e.x);
  if (seen && d < spec.range && e.cool <= 0) {
    e.cool = spec.rate;
    const spr = (rnd(m.rng) - 0.5) * 0.22;
    spawnBullet(m, 'enemy', e.x + Math.cos(e.facing) * 14, e.y + Math.sin(e.facing) * 14, e.facing + spr, spec.dmg, 340, spec.range);
  }
  let tx = e.x, ty = e.y;
  if (d < 140) {
    // back off
    const ang = Math.atan2(e.y - p.y, e.x - p.x);
    tx = e.x + Math.cos(ang) * 80;
    ty = e.y + Math.sin(ang) * 80;
  } else if (d > 260 || !seen) {
    tx = p.x;
    ty = p.y;
  } else {
    // strafe
    const ang = Math.atan2(p.y - e.y, p.x - e.x) + (Math.PI / 2) * e.strafe;
    tx = e.x + Math.cos(ang) * 70;
    ty = e.y + Math.sin(ang) * 70;
  }
  tx = clamp(tx, 30, m.map.w - 30);
  ty = clamp(ty, 30, m.map.h - 30);
  if (!e.path.length || e.pathI >= e.path.length || e.stuckT > 0.45) {
    setPath(m.map, e, tx, ty);
    e.stuckT = 0;
  }
  follow(m.map, e, dt, spec.speed, spec.r);
}

function inExit(m: AsMatch): boolean {
  const ex = m.map.exit;
  if (!ex) return false;
  const p = m.player;
  return p.x > ex.x && p.x < ex.x + ex.w && p.y > ex.y && p.y < ex.y + ex.h;
}

function wavesDone(m: AsMatch): boolean {
  return m.waveI >= m.level.waves.length && liveEnemies(m).length === 0;
}

function checkWin(m: AsMatch) {
  if (m.finished) return;
  const g = m.level.goal;
  if (g === 'clear' && wavesDone(m)) finish(m, true);
  else if (g === 'quota' && m.kills >= m.level.quota) finish(m, true);
  else if (g === 'exit' && inExit(m) && m.kills >= m.level.quota) finish(m, true);
}

function stepWaves(m: AsMatch, dt: number) {
  if (m.waveI >= m.level.waves.length) return;
  if (liveEnemies(m).length > 0) return;
  const next = m.level.waves[m.waveI];
  if (!next) return;
  if (m.waveWait > 0) {
    m.waveWait -= dt;
    if (m.waveWait > 0) return;
    spawnWave(m);
    return;
  }
  m.waveWait = next.delay > 0 ? next.delay : 0.05;
}

function followCam(m: AsMatch) {
  const tx = clamp(m.player.x - AS_VIEW_W / 2, 0, Math.max(0, m.map.w - AS_VIEW_W));
  const ty = clamp(m.player.y - AS_VIEW_H / 2, 0, Math.max(0, m.map.h - AS_VIEW_H));
  m.camX += (tx - m.camX) * 0.18;
  m.camY += (ty - m.camY) * 0.18;
}

export function stepAs(m: AsMatch, dt: number, input: AsInput = EMPTY_AS_INPUT) {
  if (m.finished) { followCam(m); return; }
  if (m.phase === 'countdown') {
    m.phaseT -= dt;
    m.message = String(Math.max(1, Math.ceil(m.phaseT)));
    if (m.phaseT <= 0) {
      m.phase = 'play';
      m.message = '开始清场';
      if (m.waveI === 0) {
        m.waveWait = 0;
        spawnWave(m);
      }
    }
    followCam(m);
    return;
  }
  if (m.phase !== 'play') { followCam(m); return; }
  stepPlayer(m, dt, input);
  if (m.finished) { followCam(m); return; }
  if (!m.freezeAi) for (const e of m.enemies) stepEnemy(m, e, dt);
  if (m.finished) { followCam(m); return; }
  stepBullets(m, dt);
  if (m.finished) { followCam(m); return; }
  stepWaves(m, dt);
  checkWin(m);
  if (m.finished) { followCam(m); return; }
  m.time -= dt;
  if (m.time <= 0) {
    m.time = 0;
    finish(m, false);
  }
  followCam(m);
}

export function tickAs(m: AsMatch, dt: number, input: AsInput = EMPTY_AS_INPUT) {
  const d = Math.min(0.05, Math.max(0, dt));
  m.acc += d;
  let n = 0;
  while (m.acc >= AS_DT && n < 4 && !m.finished) {
    m.acc -= AS_DT;
    stepAs(m, AS_DT, input);
    n++;
  }
}

/* ---------- scripted autoplay ---------- */

function nearestThreat(m: AsMatch): AsEnemy | null {
  const p = m.player;
  let best: AsEnemy | null = null;
  let bd = 1e9;
  for (const e of liveEnemies(m)) {
    const d = dist(p.x, p.y, e.x, e.y);
    const seen = los(m.map, p.x, p.y, e.x, e.y);
    const score = d + (seen ? 0 : 120) + (e.kind === 'heavy' ? -20 : 0);
    if (score < bd) { bd = score; best = e; }
  }
  return best;
}

function incoming(m: AsMatch): AsBullet | null {
  const p = m.player;
  let best: AsBullet | null = null;
  let bd = 70;
  for (const b of m.bullets) {
    if (b.side !== 'enemy') continue;
    // approaching?
    const d = dist(b.x, b.y, p.x, p.y);
    const next = dist(b.x + b.vx * 0.08, b.y + b.vy * 0.08, p.x, p.y);
    if (next < d && d < bd) { bd = d; best = b; }
  }
  return best;
}

function pickCover(m: AsMatch, fromX: number, fromY: number): { x: number; y: number } | null {
  const p = m.player;
  let best: { x: number; y: number } | null = null;
  let bd = 1e9;
  for (const b of m.map.blocks) {
    // stand on the side opposite the threat
    const cx = b.x + b.w / 2, cy = b.y + b.h / 2;
    const ang = Math.atan2(cy - fromY, cx - fromX);
    const sx = cx + Math.cos(ang) * (Math.max(b.w, b.h) * 0.5 + 24);
    const sy = cy + Math.sin(ang) * (Math.max(b.w, b.h) * 0.5 + 24);
    if (blockedTerrain(m.map, sx, sy, AS_PLAYER_R)) continue;
    const d = dist(p.x, p.y, sx, sy);
    if (d < bd) { bd = d; best = { x: sx, y: sy }; }
  }
  return best;
}

export function autoInputAs(m: AsMatch): AsInput {
  const input: AsInput = { ...EMPTY_AS_INPUT, weapon: null };
  const p = m.player;
  const wantExit = m.level.goal === 'exit' && m.kills >= m.level.quota;
  const threat = nearestThreat(m);
  const inv = p.inv;

  // weapon choice
  if (threat) {
    const d = dist(p.x, p.y, threat.x, threat.y);
    const cluster = liveEnemies(m).filter((e) => dist(e.x, e.y, threat.x, threat.y) < 70).length;
    if (inv.owned.bomb && inv.reserve.bomb + inv.mag.bomb > 0 && cluster >= 3 && d < 220 && d > 60) {
      if (inv.current !== 'bomb') input.weapon = 'bomb';
    } else if (inv.owned.shotgun && (inv.mag.shotgun > 0 || inv.reserve.shotgun > 0) && d < 130) {
      if (inv.current !== 'shotgun') input.weapon = 'shotgun';
    } else if (inv.current !== 'pistol' && (d > 150 || (inv.current === 'shotgun' && inv.mag.shotgun <= 0 && inv.reserve.shotgun <= 0) || (inv.current === 'bomb' && cluster < 3))) {
      input.weapon = 'pistol';
    }
  }

  if (inv.mag[inv.current] <= 0 && inv.reloading <= 0) input.reload = true;

  let tx = p.x, ty = p.y, hasTarget = false;
  if (wantExit && m.map.exit) {
    const ex = m.map.exit;
    tx = ex.x + ex.w / 2;
    ty = ex.y + ex.h / 2;
    hasTarget = true;
    // still fight if very close threat
    if (threat && dist(p.x, p.y, threat.x, threat.y) < 90) {
      tx = p.x + (p.x - threat.x);
      ty = p.y + (p.y - threat.y);
    }
  } else if (threat) {
    const d = dist(p.x, p.y, threat.x, threat.y);
    const seen = los(m.map, p.x, p.y, threat.x, threat.y);
    const ideal = threat.kind === 'runner' || threat.kind === 'heavy' ? 130 : 190;
    if (!seen) {
      tx = threat.x;
      ty = threat.y;
      hasTarget = true;
    } else {
      const away = Math.atan2(p.y - threat.y, p.x - threat.x);
      const side = away + Math.PI / 2 * (m.kills % 2 === 0 ? 1 : -1);
      const rd = d < ideal - 20 ? 1 : d > ideal + 30 ? -0.25 : 0.15;
      tx = p.x + Math.cos(away) * rd * 80 + Math.cos(side) * 90;
      ty = p.y + Math.sin(away) * rd * 80 + Math.sin(side) * 90;
      hasTarget = true;
    }
    // low hp: take cover
    if (p.hp < 38 && liveEnemies(m).some((e) => e.kind === 'shooter')) {
      const c = pickCover(m, threat.x, threat.y);
      if (c) { tx = c.x; ty = c.y; hasTarget = true; }
    }
  } else if (!wavesDone(m) && m.map.pads.length) {
    // move toward center waiting for next wave
    tx = m.map.w * 0.45;
    ty = m.map.h * 0.5;
    hasTarget = true;
  }

  const dodge = incoming(m);
  if (dodge) {
    const side = Math.atan2(dodge.vy, dodge.vx) + Math.PI / 2;
    tx = p.x + Math.cos(side) * 80;
    ty = p.y + Math.sin(side) * 80;
    hasTarget = true;
  }

  if (hasTarget) {
    // short path: if blocked, use A*
    let gx = tx, gy = ty;
    if (blockedTerrain(m.map, gx, gy, AS_PLAYER_R) || !los(m.map, p.x, p.y, gx, gy)) {
      const path = astar(m.map, p.x, p.y, clamp(tx, 30, m.map.w - 30), clamp(ty, 30, m.map.h - 30));
      const wp = path[Math.min(2, path.length - 1)] ?? path[0];
      if (wp) { gx = wp.x; gy = wp.y; }
    }
    const ang = Math.atan2(gy - p.y, gx - p.x);
    const ax = Math.cos(ang), ay = Math.sin(ang);
    if (ax < -0.3) input.left = true;
    if (ax > 0.3) input.right = true;
    if (ay < -0.3) input.up = true;
    if (ay > 0.3) input.down = true;
  }

  if (threat) {
    input.hasAim = true;
    input.aimX = threat.x;
    input.aimY = threat.y;
    const d = dist(p.x, p.y, threat.x, threat.y);
    const seen = los(m.map, p.x, p.y, threat.x, threat.y);
    const w = input.weapon ?? inv.current;
    const range = WEAPON_SPEC[w].range;
    const aligned = Math.abs(wrapAngle(p.facing - Math.atan2(threat.y - p.y, threat.x - p.x))) < 0.35;
    if (seen && d < range * 0.92 && aligned && inv.reloading <= 0) input.shoot = true;
    // also shoot if roughly aligned enough after a frame
    if (seen && d < range * 0.92 && inv.reloading <= 0 && d < 240) input.shoot = true;
  }

  return input;
}

export function autoPlayAs(levelId: number, maxSeconds?: number): AsMatch {
  const m = createAsMatch(levelId, { skipCountdown: true });
  const limit = maxSeconds ?? m.level.time + 2;
  const frames = Math.ceil(limit / AS_DT) + 6;
  for (let i = 0; i < frames && !m.finished; i++) {
    const input = autoInputAs(m);
    stepAs(m, AS_DT, input);
  }
  if (!m.finished) finish(m, m.level.goal === 'clear' ? wavesDone(m) : (m.level.goal === 'exit' && inExit(m) && m.kills >= m.level.quota) || (m.level.goal === 'quota' && m.kills >= m.level.quota));
  return m;
}

export function worldFromView(m: AsMatch, vx: number, vy: number): { x: number; y: number } {
  return { x: vx + m.camX, y: vy + m.camY };
}
