import { describe, expect, it } from 'vitest';
import { applyLevelClear, defaultLevelSave, loadLevelSave, parseLevelSave, writeLevelSave } from './progressSave';
import {
  CS_LEVELS,
  CS_LEVEL_COUNT,
  CS_MAX_SPEED,
  CS_SAVE_KEY,
  CS_TRACKS,
  autoPlayCs,
  createCsMatch,
  csLevelById,
  csStars,
  csTrackById,
  playerKart,
  project,
  stepCs,
  tickCs,
  type CsInput,
} from './curveSprint';

const ACCEL: CsInput = { left: false, right: false, accel: true, brake: false, drift: false, nitro: false, item: false };

describe('弯道冲刺数据', () => {
  it('有五条不同赛道和八关，关卡引用有效赛道', () => {
    expect(Object.keys(CS_TRACKS).sort()).toEqual(['grove', 'harbor', 'night', 'ridge', 'river']);
    expect(CS_LEVELS).toHaveLength(CS_LEVEL_COUNT);
    expect(CS_LEVEL_COUNT).toBe(8);
    const used = new Set(CS_LEVELS.map((l) => l.trackId));
    expect(used.size).toBe(5);
    for (const lv of CS_LEVELS) {
      const t = csTrackById(lv.trackId);
      expect(t.length).toBeGreaterThan(800);
      expect(t.pts.length).toBeGreaterThan(40);
      expect(t.wallWidth).toBeGreaterThan(t.halfWidth);
      expect(lv.laps).toBeGreaterThanOrEqual(2);
      expect(lv.aiCount).toBeGreaterThanOrEqual(2);
      expect(lv.aiCount).toBeLessThanOrEqual(3);
      expect(csLevelById(lv.id)?.name).toBe(lv.name);
    }
    // 走线长度与弯道应有区别，不是同一条复制
    const lengths = ['grove', 'river', 'ridge', 'harbor', 'night'].map((id) => CS_TRACKS[id]!.length);
    expect(Math.max(...lengths) - Math.min(...lengths)).toBeGreaterThan(200);
  });
});

describe('出轨、墙壁与时间步', () => {
  it('开到草地上最高速明显低于赛道内', () => {
    const m = createCsMatch(1, { skipCountdown: true });
    const k = playerKart(m);
    const pr = project(m.track, k.x, k.y, k.s);
    k.x = pr.x + pr.nx * (m.track.halfWidth + 14);
    k.y = pr.y + pr.ny * (m.track.halfWidth + 14);
    stepCs(m, 2.4, ACCEL);
    expect(playerKart(m).offTrack).toBe(true);
    expect(playerKart(m).speed).toBeLessThan(CS_MAX_SPEED * 0.6);
    expect(playerKart(m).speed).toBeGreaterThan(20);
  });

  it('撞上护栏会减速并被推回可回赛道范围', () => {
    const m = createCsMatch(1, { skipCountdown: true });
    const k = playerKart(m);
    const pr0 = project(m.track, k.x, k.y, k.s);
    k.x = pr0.x + pr0.nx * (m.track.wallWidth + 30);
    k.y = pr0.y + pr0.ny * (m.track.wallWidth + 30);
    k.speed = 300;
    k.heading = Math.atan2(pr0.ny, pr0.nx); // 继续向外
    const before = k.speed;
    stepCs(m, 0.25, ACCEL);
    const k2 = playerKart(m);
    const pr = project(m.track, k2.x, k2.y, k2.s);
    expect(pr.dist).toBeLessThanOrEqual(m.track.wallWidth + 1);
    expect(k2.speed).toBeLessThan(before * 0.85);
  });

  it('dt 会被夹紧，一次超大步不会瞬移完赛', () => {
    const m = createCsMatch(1, { skipCountdown: true });
    const s0 = playerKart(m).s;
    tickCs(m, 5, ACCEL); // 只应吸收 0.05s
    expect(playerKart(m).finished).toBe(false);
    expect(playerKart(m).lap).toBe(0);
    const moved = Math.abs(playerKart(m).s - s0);
    expect(moved).toBeLessThan(80);
  });
});

describe('星级与存档', () => {
  it('按名次和目标时间给星：第一且达标 3，第一超时 2，完赛 1，未完赛 0', () => {
    expect(csStars(1, 40, 42, true)).toBe(3);
    expect(csStars(1, 42, 42, true)).toBe(3);
    expect(csStars(1, 42.01, 42, true)).toBe(2);
    expect(csStars(2, 30, 42, true)).toBe(1);
    expect(csStars(3, 10, 42, true)).toBe(1);
    expect(csStars(1, 10, 42, false)).toBe(0);
  });

  it('损坏或不可用存储回退默认，不抛错，写入失败返回 false', () => {
    expect(parseLevelSave('not-json', 8).unlocked).toBe(1);
    expect(parseLevelSave(null, 8).stars).toEqual(Array(8).fill(0));
    expect(parseLevelSave({ unlocked: 99, stars: ['x'], scores: [NaN] }, 8).unlocked).toBe(8);
    const dead = { getItem: () => { throw new Error('blocked'); }, setItem: () => undefined };
    expect(loadLevelSave(CS_SAVE_KEY, 8, dead).unlocked).toBe(1);
    const full = {
      getItem: () => null,
      setItem: () => { throw new Error('quota'); },
    };
    expect(writeLevelSave(CS_SAVE_KEY, defaultLevelSave(8), full)).toBe(false);
    const mem = new Map<string, string>();
    const store = { getItem: (k: string) => mem.get(k) ?? null, setItem: (k: string, v: string) => { mem.set(k, v); } };
    const cleared = applyLevelClear(defaultLevelSave(8), 0, 3, 2000, 8);
    expect(cleared.unlocked).toBe(2);
    expect(writeLevelSave(CS_SAVE_KEY, cleared, store)).toBe(true);
    const loaded = loadLevelSave(CS_SAVE_KEY, 8, store);
    expect(loaded.stars[0]).toBe(3);
    expect(loaded.scores[0]).toBe(2000);
    expect(loadLevelSave(CS_SAVE_KEY, 8, { getItem: () => '{broken', setItem: () => undefined }).unlocked).toBe(1);
  });
});

describe('脚本通关：各关可胜', () => {
  it('自动驾驶能在所有八关完赛并取得第一', () => {
    const results = CS_LEVELS.map((lv) => {
      const m = autoPlayCs(lv.id, 200);
      const p = playerKart(m);
      return {
        id: lv.id,
        name: lv.name,
        finished: p.finished,
        place: p.place,
        time: Number(p.finishTime.toFixed(2)),
        par: lv.parTime,
        stars: m.stars,
        phase: m.phase,
        laps: p.lap,
      };
    });
    for (const r of results) {
      expect(r.finished, '关卡 ' + r.id + ' ' + r.name + ' 应完赛').toBe(true);
      expect(r.phase).toBe('won');
      expect(r.place, '关卡 ' + r.id + ' 应第一（用时 ' + r.time + 's，par ' + r.par + '）').toBe(1);
      expect(r.stars, '关卡 ' + r.id + ' 自动驾驶应拿到至少两星').toBeGreaterThanOrEqual(2);
      expect(r.time).toBeLessThan(r.par); // 目标时间按自动驾驶用时放宽，应能三星
      expect(r.stars).toBe(3);
    }
  });
});
