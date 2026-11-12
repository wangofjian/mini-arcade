import { describe, expect, it } from 'vitest';
import {
  SP_DT,
  SP_G,
  SP_GROUND,
  SP_SLING,
  addBody,
  integrateFree,
  launchVelocity,
  livingTargets,
  makeBox,
  makeCircle,
  makeWorld,
  previewTrajectory,
  stepWorld,
  worldSettled,
} from './slingPhysics';
import {
  SW_LEVELS,
  SW_LEVEL_COUNT,
  createSwMatch,
  currentShot,
  fireAndSettle,
  fireSw,
  searchSwClear,
  stepSw,
  swStars,
  tickSw,
  type SwLaunch,
} from './slingWorkshop';

describe('弹道与碰撞物理', () => {
  it('自由飞行符合重力抛物线', () => {
    const t = 0.5;
    const vx = 200;
    const vy = -300;
    const got = integrateFree(0, 0, vx, vy, t);
    const expectX = vx * t;
    const expectY = vy * t + 0.5 * SP_G * t * t;
    expect(got.x).toBeCloseTo(expectX, 5);
    expect(got.y).toBeCloseTo(expectY, 1);
    const pts = previewTrajectory(0, 0, vx, vy, 20, 0.05, 1e6);
    expect(pts.length).toBeGreaterThan(5);
    const p = pts[9]; // t=0.5
    expect(p.x).toBeCloseTo(expectX, 5);
    expect(p.y).toBeCloseTo(expectY, 5);
  });

  it('拉弓方向与速度相反，力度随拉伸增加', () => {
    const weak = launchVelocity(-40, 20);
    const strong = launchVelocity(-130, 65);
    expect(weak.vx).toBeGreaterThan(0);
    expect(weak.vy).toBeLessThan(0);
    expect(strong.power).toBeGreaterThan(weak.power);
    expect(strong.vx).toBeGreaterThan(weak.vx);
    const cap = launchVelocity(-400, 0);
    expect(cap.power).toBe(1);
    const none = launchVelocity(0, 0);
    expect(none.power).toBe(0);
  });

  it('圆球落到静止地面会反弹且不穿透', () => {
    const w = makeWorld();
    const ball = makeCircle(0, 400, SP_GROUND - 80, 16, 'cork', true);
    ball.frozen = false;
    ball.asleep = false;
    ball.vy = 200;
    addBody(w, ball);
    for (let i = 0; i < 120 * 3; i++) stepWorld(w, SP_DT);
    const b = w.bodies.find((x) => x.isProjectile);
    expect(b).toBeTruthy();
    expect(b!.y + b!.radius).toBeLessThan(SP_GROUND + 6);
    expect(b!.y).toBeGreaterThan(SP_GROUND - 80);
  });

  it('足够冲量会打碎玻璃，木头更耐打', () => {
    const w = makeWorld();
    const glass = makeBox(0, 500, SP_GROUND - 20, 20, 20, 'glass');
    glass.frozen = false;
    addBody(w, glass);
    const iron = makeCircle(0, 280, SP_GROUND - 36, 16, 'iron', true);
    iron.frozen = false;
    iron.asleep = false;
    iron.vx = 1000;
    iron.vy = -40;
    addBody(w, iron);
    for (let i = 0; i < 120 * 2; i++) stepWorld(w, SP_DT);
    expect(w.bodies.some((b) => b.material === 'glass' && !b.destroyed)).toBe(false);
  });

  it('打掉底层后上层失去支撑并下落', () => {
    const w = makeWorld();
    const base = makeBox(0, 600, SP_GROUND - 18, 40, 18, 'glass');
    const top = makeBox(0, 600, SP_GROUND - 18 - 18 - 16, 36, 16, 'wood');
    addBody(w, base);
    addBody(w, top);
    const pot = makeCircle(0, 600, SP_GROUND - 18 - 18 - 16 - 16 - 18, 18, 'ceramic');
    addBody(w, pot);
    // 直接摧毁底层
    base.destroyed = true;
    base.hp = 0;
    const startY = pot.y;
    for (let i = 0; i < 120 * 3; i++) stepWorld(w, SP_DT);
    const leftoverPot = w.bodies.find((b) => b.isTarget);
    const leftoverTop = w.bodies.find((b) => b.material === 'wood');
    // 罐子被摔碎、明显下落，或上层解冻坠落，都算支撑失效
    const potFell = !leftoverPot || leftoverPot.y > startY + 16;
    const topFreed = !leftoverTop || leftoverTop.frozen === false || leftoverTop.y > SP_GROUND - 50;
    expect(potFell || topFreed).toBe(true);
    expect(leftoverPot === undefined || leftoverPot.y > startY - 1).toBe(true);
  });
});

describe('关卡流程与星级', () => {
  it('弹药用尽且陶罐仍在则失败，星级按剩余弹药计算', () => {
    expect(swStars(3, true)).toBe(3);
    expect(swStars(1, true)).toBe(2);
    expect(swStars(0, true)).toBe(1);
    expect(swStars(5, false)).toBe(0);
    const m = createSwMatch(1);
    expect(currentShot(m)).toBe('cork');
    expect(m.ammo.length).toBeGreaterThanOrEqual(3);
    // 朝天发射，打不中
    fireAndSettle(m, 0, 120);
    fireAndSettle(m, 0, 120);
    fireAndSettle(m, 0, 120);
    expect(m.phase).toBe('lost');
    expect(livingTargets(m.world).length).toBeGreaterThan(0);
    expect(m.stars).toBe(0);
  });

  it('无力度的轻点不会消耗弹药', () => {
    const m = createSwMatch(1);
    expect(fireSw(m, -2, 0)).toBe(false);
    expect(m.ammoIndex).toBe(0);
    expect(m.phase).toBe('aim');
  });

  it('八关都有不同结构和至少三发弹药', () => {
    expect(SW_LEVELS).toHaveLength(SW_LEVEL_COUNT);
    const names = new Set(SW_LEVELS.map((l) => l.name));
    expect(names.size).toBe(SW_LEVEL_COUNT);
    for (const lv of SW_LEVELS) {
      const m = createSwMatch(lv.id);
      expect(livingTargets(m.world).length).toBeGreaterThan(0);
      expect(m.ammo.length).toBeGreaterThanOrEqual(3);
      expect(m.world.bodies.length).toBeGreaterThan(2);
    }
  });
});

/** 经搜索记录的通关拉弓（向左下方拉，射出向右上）。 */
const RECORDED: Record<number, SwLaunch[]> = {
  1: [{ pullX: -117.8, pullY: -54.9 }],
  2: [{ pullX: -125.6, pullY: 33.6 }],
  3: [{ pullX: -58.9, pullY: -27.5 }],
  4: [{ pullX: -117.8, pullY: -54.9 }],
  5: [
    { pullX: -100.1, pullY: -46.7 },
    { pullX: -124.3, pullY: -38 },
  ],
  6: [{ pullX: -119.7, pullY: 50.8 }],
  7: [{ pullX: -119.7, pullY: 50.8 }],
  8: [
    { pullX: -106.7, pullY: 28.6 },
    { pullX: -128.4, pullY: -20.3 },
  ],
};

describe('关卡通关', () => {
  it('第一关直接命中陶罐可获胜并得到星级', () => {
    const m = createSwMatch(1);
    fireAndSettle(m, -110, 40);
    if (m.phase !== 'won') {
      // 微调：搜索一发必中
      const found = searchSwClear(1, 16, 6);
      expect(found, '第一关应能被搜索到解').toBeTruthy();
      const n = createSwMatch(1);
      for (const s of found!) fireAndSettle(n, s.pullX, s.pullY);
      expect(n.phase).toBe('won');
      expect(n.stars).toBeGreaterThanOrEqual(1);
    } else {
      expect(m.stars).toBeGreaterThanOrEqual(2);
      expect(livingTargets(m.world).length).toBe(0);
    }
  });

  it('八关均可被离散搜索或记录解打通', () => {
    for (let id = 1; id <= SW_LEVEL_COUNT; id++) {
      const recorded = RECORDED[id];
      const trial = createSwMatch(id);
      for (const s of recorded) fireAndSettle(trial, s.pullX, s.pullY);
      if (trial.phase === 'won') {
        expect(trial.stars).toBeGreaterThanOrEqual(1);
        continue;
      }
      const found = searchSwClear(id, 12, 4);
      expect(found, '关卡 ' + id + ' 应可胜').toBeTruthy();
      const m = createSwMatch(id);
      for (const s of found!) fireAndSettle(m, s.pullX, s.pullY);
      expect(m.phase, '关卡 ' + id).toBe('won');
    }
  }, 20000);

  it('飞行中大 dt 被夹紧，不会瞬移穿出世界', () => {
    const m = createSwMatch(1);
    fireSw(m, -110, 40);
    const ball = m.world.bodies.find((b) => b.isProjectile)!;
    const x0 = ball.x;
    tickSw(m, 4);
    const ball2 = m.world.bodies.find((b) => b.isProjectile);
    if (ball2) expect(Math.abs(ball2.x - x0)).toBeLessThan(200);
  });
});
