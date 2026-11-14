import { describe, expect, it } from 'vitest';
import {
  defaultLevelSave,
  loadLevelSave,
  parseLevelSave,
  writeLevelSave,
} from './progressSave';
import {
  AL_HIT_PENALTY,
  AL_LEVELS,
  AL_LEVEL_COUNT,
  AL_MAPS,
  AL_OUR_NAME,
  AL_PICK_R,
  AL_SAVE_KEY,
  alLevelById,
  alMapById,
  alStars,
  applyHit,
  autoPlayAl,
  createAlMatch,
  farePayout,
  stepAl,
  tickAl,
  tryDeliver,
  tryPickup,
  AL_DT,
} from './alleyDash';

describe('alleyDash data', () => {
  it('has eight original districts and fares, without licensed marks', () => {
    expect(AL_LEVELS).toHaveLength(AL_LEVEL_COUNT);
    expect(Object.keys(AL_MAPS)).toEqual(['nanbu', 'heyan', 'dengshi']);
    expect(AL_OUR_NAME).toBe('巷口车行');
    const blob = AL_LEVELS.map((l) => l.name + l.hint).join(' ') + Object.values(AL_MAPS).map((m) => m.name).join(' ');
    expect(blob).not.toMatch(/Crazy Taxi|Axel|Benares|SEGA|Sega|疯狂出租车/i);
    for (const lv of AL_LEVELS) {
      const map = alMapById(lv.mapId);
      expect(map.stands.length).toBeGreaterThanOrEqual(8);
      expect(map.buildings.length).toBeGreaterThan(4);
      for (const f of lv.fares) {
        expect(map.stands[f.pick], `L${lv.id} pick ${f.pick}`).toBeTruthy();
        expect(map.stands[f.drop], `L${lv.id} drop ${f.drop}`).toBeTruthy();
        expect(f.pick).not.toBe(f.drop);
      }
    }
    expect(new Set(AL_LEVELS.map((l) => l.mapId)).size).toBe(3);
  });
});

describe('alleyDash fares, hits, timeout', () => {
  it('pays more when a fare is delivered faster', () => {
    const fast = farePayout('near', 16, 18);
    const slow = farePayout('near', 2, 18);
    const late = farePayout('near', 0, 18);
    expect(fast).toBeGreaterThan(slow);
    expect(slow).toBeGreaterThan(late);
    expect(late).toBe(120);
    expect(farePayout('urgent', 13, 13)).toBeGreaterThan(farePayout('near', 18, 18));
  });

  it('picks up a waiting guest and pays on delivery', () => {
    const m = createAlMatch(1, { skipCountdown: true, freezeTraffic: true });
    const fare = m.fares.find((f) => f.status === 'offer')!;
    const pick = m.map.stands[fare.pick];
    const drop = m.map.stands[fare.drop];
    m.car.x = pick.x;
    m.car.y = pick.y;
    m.car.speed = 20;
    expect(tryPickup(m, fare.id)).toBe(true);
    expect(m.carrying).toBe(fare.id);
    expect(m.fares[fare.id].status).toBe('carry');
    m.car.x = drop.x;
    m.car.y = drop.y;
    const before = m.money;
    expect(tryDeliver(m)).toBe(true);
    expect(m.money).toBeGreaterThan(before);
    expect(m.delivered).toBe(1);
    expect(m.carrying).toBeNull();
  });

  it('cannot pick up outside the stand radius', () => {
    const m = createAlMatch(1, { skipCountdown: true, freezeTraffic: true });
    const fare = m.fares.find((f) => f.status === 'offer')!;
    const pick = m.map.stands[fare.pick];
    m.car.x = pick.x + AL_PICK_R + 20;
    m.car.y = pick.y + AL_PICK_R + 20;
    expect(tryPickup(m, fare.id)).toBe(false);
    expect(m.carrying).toBeNull();
  });

  it('collision cuts speed and deducts time, then ignores hits during lock', () => {
    const m = createAlMatch(1, { skipCountdown: true, freezeTraffic: true });
    m.car.speed = 200;
    const t0 = m.time;
    expect(applyHit(m)).toBe(true);
    expect(m.car.speed).toBeLessThan(80);
    expect(m.time).toBeCloseTo(t0 - AL_HIT_PENALTY, 5);
    expect(m.hits).toBe(1);
    expect(m.penaltyTime).toBe(AL_HIT_PENALTY);
    expect(applyHit(m)).toBe(false);
    expect(m.hits).toBe(1);
    // after lock expires, can be hit again
    m.car.hitLock = 0;
    m.car.speed = 180;
    expect(applyHit(m)).toBe(true);
    expect(m.hits).toBe(2);
    expect(m.time).toBeCloseTo(t0 - AL_HIT_PENALTY * 2, 5);
  });

  it('times out without the target and does not clear the level', () => {
    const m = createAlMatch(1, { skipCountdown: true, freezeTraffic: true });
    m.time = 0.2;
    for (let i = 0; i < 30 && !m.finished; i++) stepAl(m, AL_DT);
    expect(m.finished).toBe(true);
    expect(m.phase).toBe('lost');
    expect(m.stars).toBe(0);
    expect(m.money).toBe(0);
  });
});

describe('alleyDash stars and save', () => {
  it('awards 3 / 2 / 1 / 0 by the published rule', () => {
    expect(alStars(300, 200, 20, 15, 2, true)).toBe(3);
    expect(alStars(300, 200, 5, 15, 2, true)).toBe(2);
    expect(alStars(80, 200, 0, 15, 1, true)).toBe(1);
    expect(alStars(0, 200, 0, 15, 0, true)).toBe(0);
    expect(alStars(80, 200, 0, 15, 1, false)).toBe(0);
  });

  it('falls back on corrupt JSON and keeps a writable default', () => {
    expect(parseLevelSave('not-json', AL_LEVEL_COUNT)).toEqual(defaultLevelSave(AL_LEVEL_COUNT));
    expect(parseLevelSave({ unlocked: 'x', stars: null }, AL_LEVEL_COUNT).unlocked).toBe(1);
    const busted = {
      getItem() { return '{not json'; },
      setItem() { throw new Error('quota'); },
    };
    const loaded = loadLevelSave(AL_SAVE_KEY, AL_LEVEL_COUNT, busted);
    expect(loaded).toEqual(defaultLevelSave(AL_LEVEL_COUNT));
    expect(writeLevelSave(AL_SAVE_KEY, loaded, busted)).toBe(false);
    const mem: Record<string, string> = {};
    const store = {
      getItem(k: string) { return mem[k] ?? null; },
      setItem(k: string, v: string) { mem[k] = v; },
    };
    expect(writeLevelSave(AL_SAVE_KEY, { unlocked: 3, stars: [3, 2, 0, 0, 0, 0, 0, 0], scores: [1, 1, 0, 0, 0, 0, 0, 0] }, store)).toBe(true);
    expect(loadLevelSave(AL_SAVE_KEY, AL_LEVEL_COUNT, store).unlocked).toBe(3);
  });
});

describe('alleyDash clock and autoplay', () => {
  it('clamps a huge dt so the clock does not jump to zero in one tick', () => {
    const m = createAlMatch(1, { skipCountdown: true, freezeTraffic: true });
    const t0 = m.time;
    tickAl(m, 5);
    expect(m.finished).toBe(false);
    expect(m.time).toBeGreaterThanOrEqual(t0 - 0.05 - 1e-6);
    expect(m.time).toBeLessThan(t0);
  });

  it('wins every level with scripted driving, not by reading constants', () => {
    for (const lv of AL_LEVELS) {
      const m = autoPlayAl(lv.id);
      expect(m.finished, `L${lv.id} finished`).toBe(true);
      expect(m.money, `L${lv.id} money ${m.money}/${lv.target} t=${m.time.toFixed(1)} del=${m.delivered} ${m.phase}`).toBeGreaterThanOrEqual(lv.target);
      expect(m.phase, `L${lv.id}`).toBe('won');
      expect(m.stars, `L${lv.id} stars`).toBeGreaterThanOrEqual(2);
      expect(m.delivered).toBeGreaterThan(0);
      expect(alLevelById(lv.id).name).toBe(lv.name);
    }
  });
});
