/** 庭院防线：分路塔防纯规则。单位、敌人与关卡均为原创，与任何商业作品无关。 */

export const YD_ROWS = 5;
export const YD_COLS = 9;
export const YD_CELL = 80;
export const YD_FIELD_W = YD_COLS * YD_CELL;
export const YD_FIELD_H = YD_ROWS * YD_CELL;
export const YD_HOME_X = 8;
export const YD_SPAWN_X = YD_FIELD_W + 48;
export const YD_STEP = 1 / 60;
export const YD_SAVE_KEY = 'yard-defense-save';
export const YD_LEVEL_COUNT = 8;

export type UnitKind = 'dish' | 'sprinkler' | 'vine' | 'berry' | 'frost';
export type EnemyKind = 'slug' | 'beetle' | 'moth' | 'runner' | 'brute';
export type YdPhase = 'prep' | 'battle' | 'won' | 'lost';

export type UnitDef = {
  kind: UnitKind;
  name: string;
  role: string;
  cost: number;
  hp: number;
  color: string;
  cooldown?: number;
  damage?: number;
  range?: number;
  splash?: number;
  splashRadius?: number;
  slowFactor?: number;
  slowDuration?: number;
  produceAmount?: number;
  producePeriod?: number;
  contactDps?: number;
};

export type EnemyDef = {
  kind: EnemyKind;
  name: string;
  hp: number;
  speed: number;
  reward: number;
  chewDps: number;
  leakDamage: number;
  /** 飞蛾越过布置，不啃咬。 */
  flying?: boolean;
  armor?: number;
  color: string;
};

export type SpawnEvent = { t: number; row: number; kind: EnemyKind };

export type YdLevel = {
  id: number;
  name: string;
  hint: string;
  startDew: number;
  prep: number;
  ambientAmount: number;
  ambientPeriod: number;
  ambientFirst: number;
  waves: SpawnEvent[];
};

export type Plant = {
  id: number;
  kind: UnitKind;
  row: number;
  col: number;
  hp: number;
  maxHp: number;
  cd: number;
  produceT: number;
};

export type Enemy = {
  id: number;
  kind: EnemyKind;
  row: number;
  x: number;
  hp: number;
  maxHp: number;
  slowT: number;
  slowFactor: number;
  eatingId: number | null;
};

export type Bolt = {
  id: number;
  kind: UnitKind;
  row: number;
  x: number;
  y: number;
  vx: number;
  damage: number;
  splash: number;
  splashRadius: number;
  slowFactor: number;
  slowDuration: number;
};

export type YdMatch = {
  level: YdLevel;
  phase: YdPhase;
  time: number;
  dew: number;
  plants: Plant[];
  enemies: Enemy[];
  bolts: Bolt[];
  nextId: number;
  spawnCursor: number;
  spawned: number;
  defeated: number;
  leaked: number;
  homeHp: number;
  score: number;
  stars: number;
  ambientT: number;
  message: string;
};

export const UNITS: Record<UnitKind, UnitDef> = {
  dish: {
    kind: 'dish',
    name: '露盘',
    role: '持续产生露水',
    cost: 50,
    hp: 80,
    color: '#e7c25a',
    produceAmount: 25,
    producePeriod: 6.5,
  },
  sprinkler: {
    kind: 'sprinkler',
    name: '喷管',
    role: '本路单体射击',
    cost: 100,
    hp: 130,
    color: '#4a8fbf',
    cooldown: 1.05,
    damage: 26,
    range: 700,
  },
  vine: {
    kind: 'vine',
    name: '藤栏',
    role: '阻挡并接触伤害',
    cost: 50,
    hp: 560,
    color: '#3f8a56',
    contactDps: 22,
  },
  berry: {
    kind: 'berry',
    name: '爆果',
    role: '范围溅射',
    cost: 175,
    hp: 130,
    color: '#c4566a',
    cooldown: 1.85,
    damage: 32,
    range: 600,
    splash: 22,
    splashRadius: 110,
  },
  frost: {
    kind: 'frost',
    name: '寒叶',
    role: '减速并点伤',
    cost: 125,
    hp: 120,
    color: '#6bb7c9',
    cooldown: 1.25,
    damage: 14,
    range: 640,
    slowFactor: 0.45,
    slowDuration: 3.0,
  },
};

export const UNIT_ORDER: UnitKind[] = ['dish', 'sprinkler', 'vine', 'berry', 'frost'];

export const ENEMIES: Record<EnemyKind, EnemyDef> = {
  slug: { kind: 'slug', name: '懒虫', hp: 86, speed: 32, reward: 15, chewDps: 22, leakDamage: 1, color: '#8a6b3d' },
  beetle: { kind: 'beetle', name: '硬甲', hp: 260, speed: 24, reward: 28, chewDps: 26, leakDamage: 1, armor: 5, color: '#4d5c72' },
  moth: { kind: 'moth', name: '飞蛾', hp: 52, speed: 52, reward: 18, chewDps: 0, leakDamage: 1, flying: true, color: '#b48ac4' },
  runner: { kind: 'runner', name: '疾行', hp: 62, speed: 66, reward: 20, chewDps: 28, leakDamage: 1, color: '#c9843a' },
  brute: { kind: 'brute', name: '重壳', hp: 480, speed: 17, reward: 55, chewDps: 34, leakDamage: 2, armor: 5, color: '#6a4c3b' },
};

function burst(t0: number, row: number, kind: EnemyKind, n: number, gap: number): SpawnEvent[] {
  const out: SpawnEvent[] = [];
  for (let i = 0; i < n; i++) out.push({ t: t0 + i * gap, row, kind });
  return out;
}

export const YD_LEVELS: YdLevel[] = [
  {
    id: 1,
    name: '初入庭院',
    hint: '选喷管种在第 3 行靠左，拦住唯一的来路。',
    startDew: 150,
    prep: 8,
    ambientAmount: 0,
    ambientPeriod: 10,
    ambientFirst: 20,
    waves: burst(1.2, 2, 'slug', 4, 3.2),
  },
  {
    id: 2,
    name: '分路试探',
    hint: '上下两条路各放一根喷管。',
    startDew: 250,
    prep: 9,
    ambientAmount: 25,
    ambientPeriod: 10,
    ambientFirst: 12,
    waves: [...burst(1, 1, 'slug', 4, 3), ...burst(2.2, 3, 'slug', 4, 3)],
  },
  {
    id: 3,
    name: '露盘筹划',
    hint: '先放露盘攒资源，再布置喷管。',
    startDew: 50,
    prep: 18,
    ambientAmount: 25,
    ambientPeriod: 8,
    ambientFirst: 6.5,
    waves: [...burst(2, 2, 'slug', 5, 2.8), ...burst(8, 0, 'slug', 3, 3.2)],
  },
  {
    id: 4,
    name: '藤栏抵挡',
    hint: '硬甲很耐打，用藤栏拖住再集火。',
    startDew: 350,
    prep: 12,
    ambientAmount: 25,
    ambientPeriod: 8,
    ambientFirst: 6,
    waves: [
      ...burst(1, 0, 'slug', 3, 2.6),
      ...burst(2, 2, 'beetle', 2, 6),
      ...burst(3, 4, 'slug', 3, 2.6),
      { t: 14, row: 2, kind: 'beetle' },
    ],
  },
  {
    id: 5,
    name: '寒雾减速',
    hint: '疾行很快，先用寒叶减速，再让喷管收割。',
    startDew: 425,
    prep: 12,
    ambientAmount: 25,
    ambientPeriod: 7,
    ambientFirst: 6,
    waves: [
      ...burst(1, 1, 'runner', 4, 2.4),
      ...burst(1.6, 2, 'runner', 4, 2.4),
      ...burst(2.2, 3, 'runner', 4, 2.4),
      ...burst(14, 2, 'slug', 3, 2),
    ],
  },
  {
    id: 6,
    name: '群聚爆果',
    hint: '飞蛾不啃藤栏，挤在一起时用爆果最划算。',
    startDew: 475,
    prep: 13,
    ambientAmount: 25,
    ambientPeriod: 7,
    ambientFirst: 5,
    waves: [
      ...burst(1, 1, 'moth', 5, 1.1),
      ...burst(1.4, 2, 'moth', 5, 1.1),
      ...burst(1.8, 3, 'moth', 5, 1.1),
      ...burst(12, 0, 'beetle', 2, 5),
      ...burst(13, 4, 'slug', 4, 2.2),
    ],
  },
  {
    id: 7,
    name: '夜间混编',
    hint: '五路都会来。先铺经济，再按职责补防。',
    startDew: 575,
    prep: 16,
    ambientAmount: 25,
    ambientPeriod: 6.5,
    ambientFirst: 5,
    waves: [
      ...burst(1, 0, 'slug', 4, 2.8),
      ...burst(2, 1, 'runner', 3, 3),
      ...burst(1.5, 2, 'beetle', 2, 7),
      ...burst(2.5, 3, 'moth', 4, 2),
      ...burst(3, 4, 'slug', 4, 2.8),
      ...burst(18, 2, 'brute', 1, 1),
      ...burst(20, 0, 'runner', 3, 2.4),
      ...burst(21, 4, 'runner', 3, 2.4),
    ],
  },
  {
    id: 8,
    name: '庭院总攻',
    hint: '重壳带头，疾行穿插。把藤栏、寒叶和爆果搭配起来。',
    startDew: 775,
    prep: 16,
    ambientAmount: 25,
    ambientPeriod: 6,
    ambientFirst: 4,
    waves: [
      ...burst(1, 0, 'beetle', 2, 8),
      ...burst(2, 1, 'runner', 5, 2.6),
      ...burst(1.4, 2, 'brute', 1, 1),
      ...burst(10, 2, 'brute', 1, 1),
      ...burst(2.2, 3, 'moth', 6, 1.6),
      ...burst(1.8, 4, 'beetle', 2, 8),
      ...burst(16, 0, 'runner', 3, 2.3),
      ...burst(17, 4, 'runner', 3, 2.3),
      ...burst(22, 1, 'slug', 3, 2.2),
      ...burst(23, 3, 'slug', 3, 2.2),
      ...burst(28, 2, 'brute', 1, 1),
    ],
  },
];

export function ydLevelById(id: number): YdLevel | undefined {
  return YD_LEVELS.find((lv) => lv.id === id);
}

export function cellCenter(col: number, row: number): { x: number; y: number } {
  return { x: col * YD_CELL + YD_CELL / 2, y: row * YD_CELL + YD_CELL / 2 };
}

export function inYard(row: number, col: number): boolean {
  return Number.isInteger(row) && Number.isInteger(col) && row >= 0 && row < YD_ROWS && col >= 0 && col < YD_COLS;
}

export function totalSpawns(level: YdLevel): number {
  return level.waves.length;
}

export function createYdMatch(levelId: number): YdMatch {
  const level = ydLevelById(levelId);
  if (!level) throw new Error('未知关卡');
  return {
    level,
    phase: 'prep',
    time: 0,
    dew: level.startDew,
    plants: [],
    enemies: [],
    bolts: [],
    nextId: 1,
    spawnCursor: 0,
    spawned: 0,
    defeated: 0,
    leaked: 0,
    homeHp: 3,
    score: 0,
    stars: 0,
    ambientT: level.ambientFirst,
    message: '准备阶段：先布置庭院，倒计时结束敌方出发。',
  };
}

function plantAt(m: YdMatch, row: number, col: number): Plant | undefined {
  return m.plants.find((p) => p.row === row && p.col === col);
}

export function placeCost(kind: UnitKind): number {
  return UNITS[kind].cost;
}

export type PlaceResult = { ok: true; plant: Plant } | { ok: false; reason: string };

export function tryPlace(m: YdMatch, row: number, col: number, kind: UnitKind): PlaceResult {
  if (m.phase !== 'prep' && m.phase !== 'battle') return { ok: false, reason: '现在不能布置' };
  if (!inYard(row, col)) return { ok: false, reason: '超出庭院' };
  if (plantAt(m, row, col)) return { ok: false, reason: '这里已有布置' };
  const def = UNITS[kind];
  if (m.dew < def.cost) return { ok: false, reason: '露水不足' };
  m.dew -= def.cost;
  const plant: Plant = {
    id: m.nextId++,
    kind,
    row,
    col,
    hp: def.hp,
    maxHp: def.hp,
    cd: 0.25,
    produceT: def.producePeriod ?? 0,
  };
  m.plants.push(plant);
  return { ok: true, plant };
}

export function tryShovel(m: YdMatch, row: number, col: number): { ok: boolean; refund: number } {
  if (m.phase !== 'prep' && m.phase !== 'battle') return { ok: false, refund: 0 };
  const idx = m.plants.findIndex((p) => p.row === row && p.col === col);
  if (idx < 0) return { ok: false, refund: 0 };
  const plant = m.plants[idx];
  const refund = Math.floor(UNITS[plant.kind].cost * 0.4 * (plant.hp / plant.maxHp));
  m.dew += refund;
  m.plants.splice(idx, 1);
  for (const e of m.enemies) if (e.eatingId === plant.id) e.eatingId = null;
  return { ok: true, refund };
}

function applyDamage(hp: number, raw: number, armor = 0): number {
  return Math.max(0, hp - Math.max(1, raw - armor));
}

function harvestAmbient(m: YdMatch, dt: number) {
  if (m.level.ambientAmount <= 0) return;
  m.ambientT -= dt;
  while (m.ambientT <= 0) {
    m.dew += m.level.ambientAmount;
    m.ambientT += m.level.ambientPeriod;
  }
}

function maybeSpawn(m: YdMatch) {
  if (m.phase !== 'battle') return;
  const battleT = m.time - m.level.prep;
  while (m.spawnCursor < m.level.waves.length) {
    const ev = m.level.waves[m.spawnCursor];
    if (ev.t > battleT) break;
    const def = ENEMIES[ev.kind];
    const row = Math.max(0, Math.min(YD_ROWS - 1, ev.row));
    m.enemies.push({
      id: m.nextId++,
      kind: ev.kind,
      row,
      x: YD_SPAWN_X,
      hp: def.hp,
      maxHp: def.hp,
      slowT: 0,
      slowFactor: 1,
      eatingId: null,
    });
    m.spawned += 1;
    m.spawnCursor += 1;
  }
}

function shoot(m: YdMatch, plant: Plant, def: UnitDef, target: Enemy) {
  const { x, y } = cellCenter(plant.col, plant.row);
  const dir = target.x >= x - 4 ? 1 : -1;
  m.bolts.push({
    id: m.nextId++,
    kind: plant.kind,
    row: plant.row,
    x: x + 18 * dir,
    y,
    vx: 440 * dir,
    damage: def.damage ?? 0,
    splash: def.splash ?? 0,
    splashRadius: def.splashRadius ?? 0,
    slowFactor: def.slowFactor ?? 1,
    slowDuration: def.slowDuration ?? 0,
  });
}

function firstTarget(m: YdMatch, plant: Plant, range: number): Enemy | undefined {
  const { x } = cellCenter(plant.col, plant.row);
  let ahead: Enemy | undefined;
  let aheadDist = Infinity;
  let behind: Enemy | undefined;
  let behindDist = Infinity;
  for (const e of m.enemies) {
    if (e.row !== plant.row || e.hp <= 0) continue;
    const dist = e.x - x;
    if (dist >= -14 && dist <= range) {
      if (dist < aheadDist) {
        ahead = e;
        aheadDist = dist;
      }
    } else if (dist < -14 && -dist <= range && e.x > YD_HOME_X) {
      if (-dist < behindDist) {
        behind = e;
        behindDist = -dist;
      }
    }
  }
  return ahead ?? behind;
}

function hitEnemy(m: YdMatch, e: Enemy, raw: number, slowFactor: number, slowDuration: number) {
  const def = ENEMIES[e.kind];
  e.hp = applyDamage(e.hp, raw, def.armor ?? 0);
  if (slowDuration > 0) {
    e.slowT = Math.max(e.slowT, slowDuration);
    e.slowFactor = Math.min(e.slowFactor, slowFactor);
  }
  if (e.hp <= 0) {
    m.defeated += 1;
    m.dew += def.reward;
    m.score += def.reward;
  }
}

function resolveBolt(m: YdMatch, b: Bolt, e: Enemy) {
  hitEnemy(m, e, b.damage, b.slowFactor, b.slowDuration);
  if (b.splash > 0) {
    for (const o of m.enemies) {
      if (o.id === e.id || o.hp <= 0) continue;
      const dy = (o.row - e.row) * YD_CELL;
      const dx = o.x - e.x;
      if (Math.hypot(dx, dy) <= b.splashRadius) hitEnemy(m, o, b.splash, b.slowFactor, b.slowDuration * 0.6);
    }
  }
}

function updatePlants(m: YdMatch, dt: number) {
  for (const plant of m.plants) {
    const def = UNITS[plant.kind];
    if (def.produceAmount && def.producePeriod) {
      plant.produceT -= dt;
      if (plant.produceT <= 0) {
        m.dew += def.produceAmount;
        m.score += 2;
        plant.produceT += def.producePeriod;
      }
    }
    if (def.contactDps) {
      for (const e of m.enemies) {
        if (e.hp <= 0 || e.row !== plant.row) continue;
        if (ENEMIES[e.kind].flying) continue;
        const { x } = cellCenter(plant.col, plant.row);
        if (Math.abs(e.x - x) < YD_CELL * 0.48) {
          hitEnemy(m, e, def.contactDps * dt, 1, 0);
        }
      }
    }
    if ((def.damage ?? 0) > 0 && (def.range ?? 0) > 0) {
      plant.cd -= dt;
      const target = firstTarget(m, plant, def.range ?? 0);
      if (plant.cd <= 0 && target) {
        shoot(m, plant, def, target);
        plant.cd = def.cooldown ?? 1;
      }
    }
  }
}

function updateBolts(m: YdMatch, dt: number) {
  const leftover: Bolt[] = [];
  for (const b of m.bolts) {
    b.x += b.vx * dt;
    if (b.x > YD_SPAWN_X + 40) continue;
    let hit: Enemy | undefined;
    let hitX = Infinity;
    for (const e of m.enemies) {
      if (e.hp <= 0) continue;
      const sameLane = e.row === b.row || (b.splashRadius > 40 && Math.abs(e.row - b.row) === 0);
      if (!sameLane) continue;
      if (Math.abs(e.x - b.x) <= 22 && e.x < hitX) {
        hit = e;
        hitX = e.x;
      }
    }
    if (hit) resolveBolt(m, b, hit);
    else leftover.push(b);
  }
  m.bolts = leftover;
}

function occupier(m: YdMatch, row: number, x: number, ignoreFlying: boolean): Plant | undefined {
  let found: Plant | undefined;
  let best = 1e9;
  for (const p of m.plants) {
    if (p.row !== row || p.hp <= 0) continue;
    const cx = cellCenter(p.col, p.row).x;
    const dist = x - cx;
    if (dist >= -8 && dist <= YD_CELL * 0.5 && dist < best) {
      if (ignoreFlying) continue;
      found = p;
      best = dist;
    }
  }
  return found;
}

function updateEnemies(m: YdMatch, dt: number) {
  for (const e of m.enemies) {
    if (e.hp <= 0) continue;
    const def = ENEMIES[e.kind];
    if (e.slowT > 0) {
      e.slowT -= dt;
      if (e.slowT <= 0) {
        e.slowT = 0;
        e.slowFactor = 1;
      }
    }
    const speed = def.speed * (e.slowT > 0 ? e.slowFactor : 1);
    if (!def.flying) {
      const plant = occupier(m, e.row, e.x, false);
      if (plant) {
        e.eatingId = plant.id;
        plant.hp -= def.chewDps * dt;
        if (plant.hp <= 0) {
          m.plants = m.plants.filter((p) => p.id !== plant.id);
          e.eatingId = null;
        }
        continue;
      }
      e.eatingId = null;
    }
    e.x -= speed * dt;
    if (e.x <= YD_HOME_X) {
      e.hp = 0;
      m.leaked += 1;
      m.homeHp -= def.leakDamage;
    }
  }
}

function cleanup(m: YdMatch) {
  m.enemies = m.enemies.filter((e) => e.hp > 0);
  m.plants = m.plants.filter((p) => p.hp > 0);
}

function scoreStars(m: YdMatch): number {
  if (m.phase !== 'won') return 0;
  if (m.homeHp >= 3 && m.dew >= 80) return 3;
  if (m.homeHp >= 2 && m.dew >= 30) return 2;
  return 1;
}

function conclude(m: YdMatch) {
  if (m.phase !== 'prep' && m.phase !== 'battle') return;
  if (m.homeHp <= 0) {
    m.phase = 'lost';
    m.homeHp = 0;
    m.stars = 0;
    m.message = '虫群闯进了庭院。再调整布置，重新守一次。';
    return;
  }
  if (m.phase === 'battle' && m.spawnCursor >= m.level.waves.length && m.enemies.length === 0) {
    m.phase = 'won';
    m.score += m.dew + m.homeHp * 40;
    m.stars = scoreStars(m);
    m.message = '庭院守住了！获得 ' + m.stars + ' 星，本关得分 ' + m.score + '。';
  }
}

/** 推进一场对局。暂停时不要调用。dt 会被夹到合理范围，避免切回前台时爆炸。 */
export function tickYd(m: YdMatch, dt: number) {
  if (m.phase !== 'prep' && m.phase !== 'battle') return;
  const sliced = Math.max(0, Math.min(dt, 0.05));
  if (sliced <= 0) return;
  m.time += sliced;
  harvestAmbient(m, sliced);
  if (m.phase === 'prep' && m.time >= m.level.prep) {
    m.phase = 'battle';
    m.message = '虫群出发了！';
  }
  maybeSpawn(m);
  updatePlants(m, sliced);
  updateBolts(m, sliced);
  updateEnemies(m, sliced);
  cleanup(m);
  conclude(m);
}

export function stepYd(m: YdMatch, seconds: number) {
  const steps = Math.ceil(seconds / YD_STEP);
  for (let i = 0; i < steps; i++) {
    if (m.phase === 'won' || m.phase === 'lost') return;
    tickYd(m, YD_STEP);
  }
}

export type YdAction = { t: number; kind: UnitKind; row: number; col: number };

/** 按时间轴布置并模拟到结束，用于验证关卡可胜。 */
export function simulateYd(levelId: number, actions: YdAction[], limit = 180): YdMatch {
  const m = createYdMatch(levelId);
  const queued = actions.slice().sort((a, b) => a.t - b.t);
  let i = 0;
  let guard = 0;
  const maxSteps = Math.ceil(limit / YD_STEP);
  while (m.phase !== 'won' && m.phase !== 'lost' && guard < maxSteps) {
    while (i < queued.length && queued[i].t <= m.time + 1e-9) {
      tryPlace(m, queued[i].row, queued[i].col, queued[i].kind);
      i += 1;
    }
    tickYd(m, YD_STEP);
    guard += 1;
  }
  return m;
}

export function ydStars(homeHp: number, dew: number, won: boolean): number {
  if (!won) return 0;
  if (homeHp >= 3 && dew >= 80) return 3;
  if (homeHp >= 2 && dew >= 30) return 2;
  return 1;
}
