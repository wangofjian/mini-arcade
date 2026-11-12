import { describe, expect, it } from 'vitest';
import {
  RQ_LEVELS,
  RQ_LEVEL_COUNT,
  RQ_RADIUS,
  RQ_TILE,
  autoPlayRq,
  createRqMatch,
  rqStars,
  stepRq,
  tickRq,
} from './rollQuest';

describe('滚球历险关卡与物理', () => {
  it('八关地图尺寸一致，且各有起点和终点', () => {
    expect(RQ_LEVELS).toHaveLength(RQ_LEVEL_COUNT);
    for (const lv of RQ_LEVELS) {
      const width = lv.map[0].length;
      for (const row of lv.map) expect(row.length, lv.name + ' 行宽').toBe(width);
      const text = lv.map.join('');
      expect(text.includes('P'), lv.name + ' 起点').toBe(true);
      expect(text.includes('G'), lv.name + ' 终点').toBe(true);
    }
  });

  it('站在地面上时向右加速，松手会减速', () => {
    const m = createRqMatch(1);
    stepRq(m, 0.2, { left: false, right: false, jump: false });
    expect(m.onGround).toBe(true);
    const x0 = m.x;
    stepRq(m, 0.4, { left: false, right: true, jump: false });
    expect(m.x).toBeGreaterThan(x0 + 20);
    expect(m.vx).toBeGreaterThan(50);
    const vx = m.vx;
    stepRq(m, 0.4, { left: false, right: false, jump: false });
    expect(m.vx).toBeLessThan(vx);
    expect(m.onGround).toBe(true);
  });

  it('跳跃会离地，松开后上冲速度被削减', () => {
    const m = createRqMatch(1);
    stepRq(m, 0.15, { left: false, right: false, jump: false });
    expect(m.onGround).toBe(true);
    const y0 = m.y;
    tickRq(m, 1 / 120, { left: false, right: false, jump: true });
    expect(m.onGround).toBe(false);
    expect(m.vy).toBeLessThan(-400);
    const rising = m.vy;
    tickRq(m, 1 / 120, { left: false, right: false, jump: false });
    expect(m.vy).toBeGreaterThan(rising * 0.6);
    expect(m.y).toBeLessThan(y0);
  });

  it('掉出场地会在检查点重生而不是直接判负', () => {
    const m = createRqMatch(1);
    m.x = 80;
    m.y = 80;
    m.spawnX = 80;
    m.spawnY = 80;
    // 推到关卡底部以下
    m.y = m.rows * RQ_TILE + 80;
    stepRq(m, 0.05, { left: false, right: false, jump: false });
    expect(m.phase).toBe('play');
    expect(m.deaths).toBeGreaterThan(0);
    expect(m.x).toBeCloseTo(m.spawnX, 0);
    expect(Math.abs(m.y - m.spawnY)).toBeLessThan(RQ_TILE);
  });

  it('星级按死亡次数计算', () => {
    expect(rqStars(0, true)).toBe(3);
    expect(rqStars(2, true)).toBe(2);
    expect(rqStars(5, true)).toBe(1);
    expect(rqStars(0, false)).toBe(0);
  });
});

describe('关卡可达', () => {
  it('第一关向右走并跳跃即可到达终点', () => {
    const m = autoPlayRq(1, 40);
    expect(m.phase, 't=' + m.time.toFixed(1) + ' x=' + m.x.toFixed(0) + ' y=' + m.y.toFixed(0) + ' ' + m.message).toBe('won');
    expect(m.stars).toBeGreaterThanOrEqual(1);
  });

  it('八关都能被路径跟随自动通关（或脚本推进）', () => {
    const results: string[] = [];
    for (let id = 1; id <= RQ_LEVEL_COUNT; id++) {
      const m = autoPlayRq(id, 100);
      results.push('L' + id + ' ' + m.phase + ' t=' + m.time.toFixed(1) + ' x=' + m.x.toFixed(0) + ' deaths=' + m.deaths);
      expect(m.phase, results.join(' | ')).toBe('won');
    }
  });
});
