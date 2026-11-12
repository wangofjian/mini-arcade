import { describe, expect, it } from 'vitest';
import {
  ENEMIES,
  UNITS,
  YD_LEVELS,
  YD_LEVEL_COUNT,
  YD_ROWS,
  YD_HOME_X,
  createYdMatch,
  simulateYd,
  stepYd,
  tickYd,
  tryPlace,
  tryShovel,
  ydStars,
  type UnitKind,
  type YdAction,
  type YdMatch,
} from './yardDefense';

const SOLUTIONS: Record<number, YdAction[]> = {
  1: [{ t: 0, kind: 'sprinkler', row: 2, col: 3 }],
  2: [
    { t: 0, kind: 'sprinkler', row: 1, col: 3 },
    { t: 0.05, kind: 'sprinkler', row: 3, col: 3 },
  ],
  3: [
    { t: 0, kind: 'dish', row: 4, col: 0 },
    { t: 15.2, kind: 'sprinkler', row: 2, col: 3 },
    { t: 31.3, kind: 'sprinkler', row: 0, col: 3 },
  ],
  4: [
    { t: 0, kind: 'vine', row: 2, col: 6 },
    { t: 0.05, kind: 'sprinkler', row: 0, col: 3 },
    { t: 0.1, kind: 'sprinkler', row: 2, col: 3 },
    { t: 0.15, kind: 'sprinkler', row: 4, col: 3 },
  ],
  5: [
    { t: 0, kind: 'sprinkler', row: 1, col: 3 },
    { t: 0.05, kind: 'sprinkler', row: 2, col: 3 },
    { t: 0.1, kind: 'sprinkler', row: 3, col: 3 },
    { t: 0.15, kind: 'frost', row: 2, col: 2 },
    { t: 20, kind: 'frost', row: 1, col: 2 },
    { t: 26, kind: 'frost', row: 3, col: 2 },
  ],
  6: [
    { t: 0, kind: 'berry', row: 2, col: 3 },
    { t: 0.05, kind: 'sprinkler', row: 1, col: 3 },
    { t: 0.1, kind: 'sprinkler', row: 3, col: 3 },
    { t: 0.15, kind: 'sprinkler', row: 4, col: 3 },
    { t: 8, kind: 'vine', row: 0, col: 6 },
    { t: 16, kind: 'sprinkler', row: 0, col: 3 },
    { t: 22, kind: 'berry', row: 1, col: 4 },
  ],
  7: [
    { t: 0, kind: 'vine', row: 2, col: 6 },
    { t: 0.05, kind: 'sprinkler', row: 0, col: 3 },
    { t: 0.1, kind: 'sprinkler', row: 1, col: 3 },
    { t: 0.15, kind: 'sprinkler', row: 2, col: 3 },
    { t: 0.2, kind: 'sprinkler', row: 3, col: 3 },
    { t: 0.25, kind: 'sprinkler', row: 4, col: 3 },
    { t: 10, kind: 'frost', row: 1, col: 2 },
    { t: 18, kind: 'berry', row: 3, col: 4 },
    { t: 24, kind: 'frost', row: 0, col: 2 },
    { t: 30, kind: 'frost', row: 4, col: 2 },
    { t: 36, kind: 'sprinkler', row: 2, col: 4 },
  ],
  8: [
    { t: 0, kind: 'vine', row: 0, col: 6 },
    { t: 0.05, kind: 'vine', row: 2, col: 6 },
    { t: 0.1, kind: 'vine', row: 4, col: 6 },
    { t: 0.15, kind: 'sprinkler', row: 0, col: 3 },
    { t: 0.2, kind: 'sprinkler', row: 1, col: 3 },
    { t: 0.25, kind: 'sprinkler', row: 2, col: 3 },
    { t: 0.3, kind: 'sprinkler', row: 3, col: 3 },
    { t: 0.35, kind: 'sprinkler', row: 4, col: 3 },
    { t: 0.4, kind: 'frost', row: 1, col: 2 },
    { t: 8, kind: 'frost', row: 0, col: 2 },
    { t: 16, kind: 'berry', row: 3, col: 4 },
    { t: 22, kind: 'frost', row: 4, col: 2 },
    { t: 28, kind: 'sprinkler', row: 2, col: 4 },
    { t: 34, kind: 'sprinkler', row: 1, col: 4 },
    { t: 40, kind: 'berry', row: 2, col: 5 },
    { t: 46, kind: 'sprinkler', row: 4, col: 4 },
    { t: 52, kind: 'vine', row: 1, col: 6 },
  ],
};

describe('庭院防线单位与关卡数据', () => {
  it('五种单位职责互不相同，且都要消耗露水', () => {
    const roles = new Set(Object.values(UNITS).map((u) => u.role));
    expect(roles.size).toBe(5);
    expect(UNITS.dish.produceAmount).toBeGreaterThan(0);
    expect(UNITS.sprinkler.damage).toBeGreaterThan(0);
    expect(UNITS.vine.contactDps).toBeGreaterThan(0);
    expect(UNITS.berry.splash).toBeGreaterThan(0);
    expect(UNITS.frost.slowFactor).toBeLessThan(1);
    for (const u of Object.values(UNITS)) expect(u.cost).toBeGreaterThan(0);
  });

  it('八关分路与敌人递进，每关至少有敌人', () => {
    expect(YD_LEVELS).toHaveLength(YD_LEVEL_COUNT);
    const rowsUsed = YD_LEVELS.map((lv) => new Set(lv.waves.map((w) => w.row)).size);
    expect(rowsUsed[0]).toBe(1);
    expect(rowsUsed[1]).toBeGreaterThanOrEqual(2);
    expect(Math.max(...rowsUsed)).toBe(YD_ROWS);
    const kinds = new Set(YD_LEVELS.flatMap((lv) => lv.waves.map((w) => w.kind)));
    expect(kinds.has('slug') && kinds.has('runner') && kinds.has('brute')).toBe(true);
    for (const lv of YD_LEVELS) {
      expect(lv.waves.length).toBeGreaterThan(2);
      for (const w of lv.waves) {
        expect(w.row).toBeGreaterThanOrEqual(0);
        expect(w.row).toBeLessThan(YD_ROWS);
        expect(ENEMIES[w.kind]).toBeTruthy();
      }
    }
  });
});

describe('布置、资源与胜负', () => {
  it('露水不足或格子占用时不能布置，拆除按残余生命退还', () => {
    const m = createYdMatch(1);
    expect(tryPlace(m, 2, 3, 'sprinkler').ok).toBe(true);
    expect(m.dew).toBe(50);
    expect(tryPlace(m, 2, 3, 'vine').ok).toBe(false);
    expect(tryPlace(m, 2, 4, 'sprinkler').ok).toBe(false);
    const sh = tryShovel(m, 2, 3);
    expect(sh.ok).toBe(true);
    expect(sh.refund).toBe(40);
    expect(m.dew).toBe(90);
    expect(m.plants).toHaveLength(0);
  });

  it('喷管能在本路击杀懒虫并赢得第一关', () => {
    const m = simulateYd(1, SOLUTIONS[1]);
    expect(m.phase).toBe('won');
    expect(m.defeated).toBe(m.level.waves.length);
    expect(m.leaked).toBe(0);
    expect(m.stars).toBeGreaterThanOrEqual(1);
    expect(m.homeHp).toBeGreaterThan(0);
  });

  it('不布置则会漏防判负', () => {
    const m = simulateYd(1, [], 60);
    expect(m.phase).toBe('lost');
    expect(m.leaked).toBeGreaterThan(0);
    expect(m.stars).toBe(0);
    expect(ydStars(0, 0, false)).toBe(0);
    expect(ydStars(3, 90, true)).toBe(3);
    expect(ydStars(2, 40, true)).toBe(2);
    expect(ydStars(1, 0, true)).toBe(1);
  });

  it('飞蛾越过藤栏，硬甲会被藤栏挡住并受到接触伤害', () => {
    const fly = createYdMatch(1);
    fly.phase = 'battle';
    fly.time = fly.level.prep;
    expect(tryPlace(fly, 2, 5, 'vine').ok).toBe(true);
    fly.enemies.push({
      id: 99,
      kind: 'moth',
      row: 2,
      x: 480,
      hp: 64,
      maxHp: 64,
      slowT: 0,
      slowFactor: 1,
      eatingId: null,
    });
    stepYd(fly, 0.5);
    const moth = fly.enemies[0];
    expect(moth).toBeTruthy();
    expect(moth.x).toBeLessThan(480);
    expect(fly.plants[0].hp).toBe(fly.plants[0].maxHp);

    const tank = createYdMatch(4);
    tank.phase = 'battle';
    tank.time = tank.level.prep;
    tank.dew = 500;
    tryPlace(tank, 2, 5, 'vine');
    const vineHp = tank.plants[0].hp;
    tank.enemies.push({
      id: 100,
      kind: 'beetle',
      row: 2,
      x: cellX(5) + 10,
      hp: 260,
      maxHp: 260,
      slowT: 0,
      slowFactor: 1,
      eatingId: null,
    });
    stepYd(tank, 1);
    expect(tank.plants[0].hp).toBeLessThan(vineHp);
    expect(tank.enemies[0]?.x ?? 0).toBeGreaterThan(YD_HOME_X);
  });

  it('寒叶会降低敌人移速', () => {
    const a = spawnAndAge('runner', 1.0, (m) => m);
    const b = spawnAndAge('runner', 1.0, (m) => {
      const e = m.enemies[0];
      e.slowT = 3;
      e.slowFactor = 0.48;
    });
    expect(b.enemies[0].x).toBeGreaterThan(a.enemies[0].x);
  });

  it('切回前台的大 dt 被夹紧，不会瞬间漏掉整路', () => {
    const m = createYdMatch(1);
    tryPlace(m, 2, 3, 'sprinkler');
    m.phase = 'battle';
    m.time = m.level.prep;
    m.enemies.push({
      id: 7,
      kind: 'slug',
      row: 2,
      x: 200,
      hp: 86,
      maxHp: 86,
      slowT: 0,
      slowFactor: 1,
      eatingId: null,
    });
    tickYd(m, 5);
    expect(m.enemies[0]?.x ?? 0).toBeGreaterThan(100);
  });
});

function cellX(col: number): number {
  return col * 80 + 40;
}

function spawnAndAge(kind: 'runner' | 'slug', seconds: number, setup: (m: YdMatch) => void): YdMatch {
  const m = createYdMatch(1);
  m.phase = 'battle';
  m.time = m.level.prep;
  m.enemies.push({
    id: 1,
    kind,
    row: 2,
    x: 700,
    hp: ENEMIES[kind].hp,
    maxHp: ENEMIES[kind].hp,
    slowT: 0,
    slowFactor: 1,
    eatingId: null,
  });
  setup(m);
  stepYd(m, seconds);
  return m;
}

describe('八关脚本通关', () => {
  it('每关都有脚本解且可在时限内取胜', () => {
    for (let id = 1; id <= YD_LEVEL_COUNT; id++) {
      const m = simulateYd(id, SOLUTIONS[id], 200);
      expect(m.phase, '关卡 ' + id + ' ' + m.message + ' leaked=' + m.leaked + ' def=' + m.defeated).toBe('won');
      expect(m.stars, '关卡 ' + id + ' 星').toBeGreaterThanOrEqual(1);
      expect(m.defeated + m.leaked, '关卡 ' + id + ' 结算人数').toBe(m.level.waves.length);
      expect(m.homeHp).toBeGreaterThan(0);
    }
  });
});

describe('露盘会随时间产生资源', () => {
  it('准备阶段结束前露盘至少产出一次', () => {
    const m = createYdMatch(3);
    expect(tryPlace(m, 4, 0, 'dish').ok).toBe(true);
    const before = m.dew;
    stepYd(m, 8);
    expect(m.dew).toBeGreaterThan(before);
  });
});

export const YD_SOLUTIONS = SOLUTIONS;
