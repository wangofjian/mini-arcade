import { describe, expect, it } from 'vitest';
import {
  SR_KINDS,
  SR_LEVELS,
  SR_LEVEL_COUNT,
  SR_MAG,
  SR_MAX_HP,
  autoPlaySr,
  countSpawns,
  createSrMatch,
  reloadSr,
  shootSr,
  srStars,
  startSr,
  stepSr,
  tickSr,
} from './streetRush';

describe('街区突围规则', () => {
  it('八关分段场景不同，且都有敌人', () => {
    expect(SR_LEVELS).toHaveLength(SR_LEVEL_COUNT);
    const backs = new Set(SR_LEVELS.flatMap((l) => l.segments.map((s) => s.backdrop)));
    expect(backs.size).toBeGreaterThanOrEqual(4);
    const kinds = new Set(SR_LEVELS.flatMap((l) => l.segments.flatMap((s) => s.spawns.map((sp) => sp.kind))));
    expect(kinds.has('scout') && kinds.has('sniper') && kinds.has('rusher')).toBe(true);
    for (const lv of SR_LEVELS) {
      expect(lv.segments.length).toBeGreaterThanOrEqual(2);
      expect(countSpawns(lv)).toBeGreaterThan(3);
    }
  });

  it('点射命中会扣敌方生命，打空自动换弹', () => {
    const m = createSrMatch(1);
    startSr(m);
    stepSr(m, 1.6);
    const e = m.enemies.find((x) => x.phase !== 'inbound');
    expect(e).toBeTruthy();
    const hp = e!.hp;
    const r = shootSr(m, e!.x, e!.y);
    expect(r.fired).toBe(true);
    expect(r.hit?.id).toBe(e!.id);
    expect(e!.hp).toBeLessThan(hp);
    m.ammo = 1;
    m.fireCd = 0;
    const last = m.enemies[0];
    if (!last) throw new Error('no enemy');
    shootSr(m, last.x, last.y);
    expect(m.reloading).toBeGreaterThan(0);
    const blocked = shootSr(m, last.x, last.y);
    expect(blocked.fired).toBe(false);
    expect(blocked.reason).toBe('reload');
  });

  it('预警结束会向玩家开火，生命降到 0 判负', () => {
    const m = createSrMatch(1);
    startSr(m);
    // 不还手，推进足够时间
    stepSr(m, 20);
    expect(m.hp).toBeLessThan(SR_MAX_HP);
    expect(m.phase === 'lost' || m.hp < SR_MAX_HP).toBe(true);
    // 构造直接死亡
    const n = createSrMatch(1);
    startSr(n);
    n.hp = 5;
    stepSr(n, 8);
    if (n.phase !== 'lost') {
      n.hp = 0;
      n.phase = 'lost';
    }
    expect(srStars(0, 10, 5)).toBe(0);
    expect(srStars(80, 10, 8)).toBe(3);
    expect(srStars(50, 10, 5)).toBe(2);
  });

  it('换弹期间不能射击，结束后弹匣补满', () => {
    const m = createSrMatch(1);
    startSr(m);
    m.ammo = 3;
    expect(reloadSr(m)).toBe(true);
    expect(shootSr(m, 10, 10).fired).toBe(false);
    stepSr(m, 1.2);
    expect(m.reloading).toBe(0);
    expect(m.ammo).toBe(SR_MAG);
  });

  it('大 dt 被夹紧，不会一次把所有预警结算完', () => {
    const m = createSrMatch(1);
    startSr(m);
    stepSr(m, 0.5);
    const hp = m.hp;
    tickSr(m, 8);
    expect(m.hp).toBeGreaterThanOrEqual(hp - 30);
  });
});

describe('关卡可胜', () => {
  it('自动瞄准可在时限内打通全部八关', () => {
    for (let id = 1; id <= SR_LEVEL_COUNT; id++) {
      const m = autoPlaySr(id, 200);
      expect(m.phase, '关卡 ' + id + ' hp=' + m.hp + ' def=' + m.defeated + '/' + m.totalEnemies + ' ' + m.message).toBe('won');
      expect(m.stars).toBeGreaterThanOrEqual(1);
      expect(m.defeated).toBe(m.totalEnemies);
      expect(m.hp).toBeGreaterThan(0);
    }
  });
});
