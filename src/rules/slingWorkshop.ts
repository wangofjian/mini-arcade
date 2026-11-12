/** 弹射工坊：关卡、弹药、星级与对局流程。 */

import {
  SP_DT,
  SP_GROUND,
  SP_MAX_PULL,
  SP_SLING,
  SP_WIDTH,
  addBody,
  launchVelocity,
  livingTargets,
  makeBox,
  makeCircle,
  makeWorld,
  previewTrajectory,
  stepWorld,
  worldSettled,
  type SpBody,
  type SpMaterial,
  type SpWorld,
  type TrajPoint,
} from './slingPhysics';

export const SW_SAVE_KEY = 'sling-workshop-save';
export const SW_LEVEL_COUNT = 8;
export const SW_SETTLE_LIMIT = 7;

export type ShotKind = 'cork' | 'iron' | 'rubber';
export type SwPhase = 'aim' | 'fly' | 'won' | 'lost';

export type SwLevel = {
  id: number;
  name: string;
  hint: string;
  ammo: ShotKind[];
  build: (world: SpWorld) => void;
};

export type SwMatch = {
  level: SwLevel;
  world: SpWorld;
  phase: SwPhase;
  ammo: ShotKind[];
  ammoIndex: number;
  flyTime: number;
  score: number;
  stars: number;
  shotsUsed: number;
  message: string;
  lastImpacts: number;
};

function pot(world: SpWorld, x: number, y: number) {
  addBody(world, makeCircle(0, x, y, 18, 'ceramic'));
}

function plank(world: SpWorld, x: number, y: number, hw: number, hh: number, mat: SpMaterial) {
  addBody(world, makeBox(0, x, y, hw, hh, mat));
}

/** 木/石/玻璃结构上放置陶罐。坐标以中心计，底部与地面对齐。 */
export const SW_LEVELS: SwLevel[] = [
  {
    id: 1,
    name: '试射台',
    hint: '向后拉弓，对准那只陶罐松手。',
    ammo: ['cork', 'cork', 'cork'],
    build(world) {
      plank(world, 620, SP_GROUND - 18, 50, 18, 'wood');
      pot(world, 620, SP_GROUND - 18 - 18 - 18);
    },
  },
  {
    id: 2,
    name: '双柱夹罐',
    hint: '打碎两侧玻璃，或直接砸中陶罐。',
    ammo: ['cork', 'cork', 'cork'],
    build(world) {
      plank(world, 580, SP_GROUND - 36, 14, 36, 'glass');
      plank(world, 680, SP_GROUND - 36, 14, 36, 'glass');
      plank(world, 630, SP_GROUND - 80, 70, 10, 'wood');
      pot(world, 630, SP_GROUND - 80 - 10 - 18);
    },
  },
  {
    id: 3,
    name: '三层木架',
    hint: '打掉底层，上面的罐子会一起掉下来。',
    ammo: ['cork', 'cork', 'cork', 'cork'],
    build(world) {
      for (let i = 0; i < 3; i++) {
        const y = SP_GROUND - 18 - i * 52;
        plank(world, 650, y, 55, 18, 'wood');
      }
      pot(world, 650, SP_GROUND - 18 - 2 * 52 - 18 - 18);
    },
  },
  {
    id: 4,
    name: '石基玻璃窗',
    hint: '石头很硬，瞄准上面的玻璃更省弹药。',
    ammo: ['cork', 'cork', 'iron', 'cork'],
    build(world) {
      plank(world, 640, SP_GROUND - 22, 70, 22, 'stone');
      plank(world, 600, SP_GROUND - 22 - 22 - 28, 12, 28, 'glass');
      plank(world, 680, SP_GROUND - 22 - 22 - 28, 12, 28, 'glass');
      plank(world, 640, SP_GROUND - 22 - 22 - 56 - 8, 66, 8, 'wood');
      pot(world, 620, SP_GROUND - 22 - 22 - 56 - 8 - 8 - 18);
      pot(world, 660, SP_GROUND - 22 - 22 - 56 - 8 - 8 - 18);
    },
  },
  {
    id: 5,
    name: '高台抛物',
    hint: '罐子在高处，把弹道拉成弧线。',
    ammo: ['cork', 'cork', 'rubber', 'cork'],
    build(world) {
      plank(world, 760, SP_GROUND - 90, 24, 90, 'stone');
      plank(world, 760, SP_GROUND - 180 - 10, 50, 10, 'wood');
      pot(world, 760, SP_GROUND - 180 - 10 - 10 - 18);
      plank(world, 560, SP_GROUND - 20, 40, 20, 'wood');
      pot(world, 560, SP_GROUND - 20 - 20 - 18);
    },
  },
  {
    id: 6,
    name: '铁珠开石',
    hint: '铁珠更沉，专门用来对付石柱。',
    ammo: ['cork', 'iron', 'iron', 'cork'],
    build(world) {
      plank(world, 600, SP_GROUND - 50, 18, 50, 'stone');
      plank(world, 700, SP_GROUND - 50, 18, 50, 'stone');
      plank(world, 650, SP_GROUND - 110, 80, 12, 'wood');
      pot(world, 620, SP_GROUND - 110 - 12 - 18);
      pot(world, 680, SP_GROUND - 110 - 12 - 18);
      plank(world, 650, SP_GROUND - 20, 16, 20, 'glass');
    },
  },
  {
    id: 7,
    name: '连环工棚',
    hint: '两处工棚，注意留弹药打第二处。',
    ammo: ['cork', 'cork', 'rubber', 'iron', 'cork'],
    build(world) {
      plank(world, 520, SP_GROUND - 30, 16, 30, 'wood');
      plank(world, 580, SP_GROUND - 30, 16, 30, 'wood');
      plank(world, 550, SP_GROUND - 70, 50, 10, 'glass');
      pot(world, 550, SP_GROUND - 70 - 10 - 18);
      plank(world, 740, SP_GROUND - 40, 18, 40, 'stone');
      plank(world, 800, SP_GROUND - 40, 18, 40, 'wood');
      plank(world, 770, SP_GROUND - 90, 56, 10, 'wood');
      pot(world, 770, SP_GROUND - 90 - 10 - 18);
    },
  },
  {
    id: 8,
    name: '工坊中庭',
    hint: '多层结构，先找薄弱的玻璃支撑。',
    ammo: ['cork', 'iron', 'rubber', 'cork', 'iron'],
    build(world) {
      plank(world, 600, SP_GROUND - 18, 14, 18, 'glass');
      plank(world, 700, SP_GROUND - 18, 14, 18, 'glass');
      plank(world, 650, SP_GROUND - 48, 80, 12, 'wood');
      plank(world, 620, SP_GROUND - 48 - 12 - 30, 12, 30, 'wood');
      plank(world, 680, SP_GROUND - 48 - 12 - 30, 12, 30, 'stone');
      plank(world, 650, SP_GROUND - 48 - 12 - 60 - 10, 72, 10, 'wood');
      pot(world, 630, SP_GROUND - 48 - 12 - 60 - 10 - 10 - 18);
      pot(world, 670, SP_GROUND - 48 - 12 - 60 - 10 - 10 - 18);
      plank(world, 800, SP_GROUND - 26, 22, 26, 'wood');
      pot(world, 800, SP_GROUND - 26 - 26 - 18);
    },
  },
];

export function swLevelById(id: number): SwLevel | undefined {
  return SW_LEVELS.find((l) => l.id === id);
}

export function shotRadius(kind: ShotKind): number {
  return kind === 'iron' ? 16 : kind === 'rubber' ? 17 : 15;
}

export function swStars(ammoLeft: number, won: boolean): number {
  if (!won) return 0;
  if (ammoLeft >= 2) return 3;
  if (ammoLeft >= 1) return 2;
  return 1;
}

export function createSwMatch(levelId: number): SwMatch {
  const level = swLevelById(levelId);
  if (!level) throw new Error('未知关卡');
  const world = makeWorld();
  level.build(world);
  return {
    level,
    world,
    phase: 'aim',
    ammo: level.ammo.slice(),
    ammoIndex: 0,
    flyTime: 0,
    score: 0,
    stars: 0,
    shotsUsed: 0,
    message: '拖动弹弓拉开，松开发射。打落全部陶罐。',
    lastImpacts: 0,
  };
}

export function currentShot(m: SwMatch): ShotKind | null {
  return m.ammoIndex < m.ammo.length ? m.ammo[m.ammoIndex] : null;
}

export function ammoLeft(m: SwMatch): number {
  return Math.max(0, m.ammo.length - m.ammoIndex);
}

function conclude(m: SwMatch) {
  if (livingTargets(m.world).length === 0) {
    m.phase = 'won';
    const left = ammoLeft(m);
    m.stars = swStars(left, true);
    m.score = 400 + left * 200 + m.stars * 50;
    m.message = '陶罐全部打落！' + m.stars + ' 星，剩余弹药 ' + left + '。';
    return true;
  }
  return false;
}

export function aimPreview(m: SwMatch, pullX: number, pullY: number): TrajPoint[] {
  const shot = currentShot(m);
  if (!shot || m.phase !== 'aim') return [];
  const v = launchVelocity(pullX, pullY);
  return previewTrajectory(SP_SLING.x, SP_SLING.y, v.vx, v.vy);
}

export function fireSw(m: SwMatch, pullX: number, pullY: number): boolean {
  if (m.phase !== 'aim') return false;
  const kind = currentShot(m);
  if (!kind) {
    m.phase = 'lost';
    m.stars = 0;
    m.message = '弹药用完了，陶罐还在。再试一次吧。';
    return false;
  }
  const v = launchVelocity(pullX, pullY);
  if (v.power < 0.08) return false;
  const ball = makeCircle(0, SP_SLING.x, SP_SLING.y, shotRadius(kind), kind, true);
  ball.frozen = false;
  ball.asleep = false;
  ball.vx = v.vx;
  ball.vy = v.vy;
  addBody(m.world, ball);
  m.ammoIndex += 1;
  m.shotsUsed += 1;
  m.phase = 'fly';
  m.flyTime = 0;
  m.message = kind === 'iron' ? '铁珠飞出！' : kind === 'rubber' ? '弹力球飞出！' : '软木球飞出！';
  return true;
}

export function tickSw(m: SwMatch, dt: number) {
  if (m.phase !== 'fly') return;
  const sliced = Math.max(0, Math.min(dt, 0.05));
  const result = stepWorld(m.world, sliced);
  m.flyTime += sliced;
  m.lastImpacts += result.impacts.length;
  if (conclude(m)) return;
  const settled = worldSettled(m.world) && m.flyTime > 0.55;
  if (settled || m.flyTime >= SW_SETTLE_LIMIT) {
    m.world.bodies = m.world.bodies.filter((b) => !b.isProjectile);
    if (conclude(m)) return;
    if (m.ammoIndex >= m.ammo.length) {
      m.phase = 'lost';
      m.stars = 0;
      m.message = '弹药用完了，还剩 ' + livingTargets(m.world).length + ' 只陶罐。';
    } else {
      m.phase = 'aim';
      m.flyTime = 0;
      m.message = '再来一发。剩余弹药 ' + ammoLeft(m) + '。';
    }
  }
}

export function stepSw(m: SwMatch, seconds: number) {
  const n = Math.ceil(seconds / SP_DT);
  for (let i = 0; i < n; i++) {
    if (m.phase === 'won' || m.phase === 'lost') return;
    tickSw(m, SP_DT);
  }
}

export type SwLaunch = { pullX: number; pullY: number };

/** 发射一发并等到结算。 */
export function fireAndSettle(m: SwMatch, pullX: number, pullY: number): SwMatch {
  if (!fireSw(m, pullX, pullY)) return m;
  let guard = 0;
  const max = Math.ceil((SW_SETTLE_LIMIT + 1) / SP_DT);
  while (m.phase === 'fly' && guard < max) {
    tickSw(m, SP_DT);
    guard += 1;
  }
  return m;
}

/**
 * 在离散的拉弓方向里搜索能通关的发射组合（贪心：每发尽量减少剩余陶罐）。
 * 用于验证关卡可胜，不是给玩家看的解法提示。
 */
export function searchSwClear(levelId: number, angleCount = 14, powerCount = 5): SwLaunch[] | null {
  const angles: number[] = [];
  // 拉弓向量（手的位置相对锚点，向左下为主）
  for (let i = 0; i < angleCount; i++) {
    const deg = -20 + (i * 110) / (angleCount - 1); // 从略向上到左下
    angles.push((deg * Math.PI) / 180);
  }
  const powers: number[] = [];
  for (let i = 0; i < powerCount; i++) powers.push(0.45 + (0.55 * i) / Math.max(1, powerCount - 1));

  const candidates: SwLaunch[] = [];
  for (const a of angles) {
    for (const p of powers) {
      const d = p * SP_MAX_PULL;
      candidates.push({ pullX: Math.cos(Math.PI - a) * d, pullY: Math.sin(Math.PI - a) * d });
    }
  }

  function remainingAfter(prefix: SwLaunch[], extra?: SwLaunch): { left: number; won: boolean; lost: boolean } {
    const m = createSwMatch(levelId);
    for (const sh of prefix) fireAndSettle(m, sh.pullX, sh.pullY);
    if (extra) fireAndSettle(m, extra.pullX, extra.pullY);
    return { left: livingTargets(m.world).length, won: m.phase === 'won', lost: m.phase === 'lost' };
  }

  const path: SwLaunch[] = [];
  const start = createSwMatch(levelId);
  const maxShots = start.ammo.length;
  for (let shot = 0; shot < maxShots; shot++) {
    let best: SwLaunch | null = null;
    let bestLeft = 99;
    for (const c of candidates) {
      const r = remainingAfter(path, c);
      if (r.won) return path.concat([c]);
      if (r.left < bestLeft) {
        bestLeft = r.left;
        best = c;
      }
    }
    if (!best) return null;
    const before = remainingAfter(path).left;
    path.push(best);
    if (bestLeft >= before && shot > 0) {
      // 这发没有进展，仍继续用完弹药再判定
    }
    if (remainingAfter(path).won) return path;
  }
  return remainingAfter(path).won ? path : null;
}

export { previewTrajectory, launchVelocity, livingTargets, SP_SLING, SP_MAX_PULL, SP_WIDTH, SP_GROUND };
