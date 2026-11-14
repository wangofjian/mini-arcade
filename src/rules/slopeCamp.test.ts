import { describe, expect, it } from 'vitest';
import {
  defaultLevelSave,
  loadLevelSave,
  parseLevelSave,
  writeLevelSave,
} from './progressSave';
import {
  BLD_SPEC,
  MP_LEVELS,
  MP_LEVEL_COUNT,
  MP_MAPS,
  MP_OUR_NAME,
  MP_RES_NAME,
  MP_SAVE_KEY,
  MP_THEIR_NAME,
  MP_DT,
  UNIT_SPEC,
  autoPlayMp,
  createMpMatch,
  hallOf,
  militaryOf,
  mpLevelById,
  mpStars,
  pushCmd,
  stepMp,
  tickMp,
  tryTrain,
  unitsOf,
} from './slopeCamp';

describe('slopeCamp data', () => {
  it('has eight original camps without licensed marks', () => {
    expect(MP_LEVELS).toHaveLength(MP_LEVEL_COUNT);
    expect(Object.keys(MP_MAPS)).toEqual(['qingpo', 'tonglin', 'chigang']);
    expect(MP_OUR_NAME).toBe('青坡寨');
    expect(MP_THEIR_NAME).toBe('赤岗部');
    expect(MP_RES_NAME).toBe('粮秣');
    expect(Object.keys(UNIT_SPEC)).toHaveLength(4);
    expect(Object.keys(BLD_SPEC)).toHaveLength(4);
    const blob = [
      MP_OUR_NAME, MP_THEIR_NAME,
      ...MP_LEVELS.map((l) => l.name + l.hint),
      ...Object.values(MP_MAPS).map((m) => m.name),
      ...Object.values(UNIT_SPEC).map((s) => s.name),
      ...Object.values(BLD_SPEC).map((s) => s.name),
    ].join(' ');
    expect(blob).not.toMatch(/红警|Red Alert|命令与征服|Command & Conquer|星际争霸|StarCraft|Zerg|Terran|Protoss|NOD|GDI|Allied|Soviet|SEGA|Warcraft/i);
    expect(new Set(MP_LEVELS.map((l) => l.mapId)).size).toBe(3);
    for (const lv of MP_LEVELS) {
      expect(mpLevelById(lv.id).name).toBe(lv.name);
      expect(MP_MAPS[lv.mapId]).toBeTruthy();
      expect(lv.time).toBeGreaterThan(lv.starTime);
    }
  });
});

describe('slopeCamp gather, train, combat, timeout', () => {
  it('idle workers gather provisions and return them to the hall', () => {
    const m = createMpMatch(1, { skipCountdown: true, freezeAi: true });
    const start = m.res.player;
    const workers = unitsOf(m, 'player', 'worker');
    expect(workers.length).toBeGreaterThanOrEqual(2);
    for (let i = 0; i < 60 * 12 && m.res.player <= start; i++) stepMp(m, MP_DT);
    expect(m.res.player).toBeGreaterThan(start);
  });

  it('training spends provisions and eventually spawns a unit', () => {
    const m = createMpMatch(1, { skipCountdown: true, freezeAi: true });
    m.res.player = 400;
    const before = unitsOf(m, 'player').length;
    // hall can train workers immediately
    expect(tryTrain(m, 'player', 'worker')).toBe(true);
    expect(m.res.player).toBe(400 - UNIT_SPEC.worker.cost);
    for (let i = 0; i < 60 * 8 && unitsOf(m, 'player').length <= before; i++) stepMp(m, MP_DT);
    expect(unitsOf(m, 'player').length).toBeGreaterThan(before);
  });

  it('military can destroy the enemy hall and win', () => {
    const m = createMpMatch(1, { skipCountdown: true, freezeAi: true });
    const eh = hallOf(m, 'enemy')!;
    // park blades on the hall and attack
    const blades = militaryOf(m, 'enemy'); // clear defenders by setting hp 0? freeze AI, add player blades
    for (const u of blades) u.hp = 0;
    m.res.player = 0;
    // spawn player blades adjacent via command: teleport existing workers into blades? Use direct mutation for unit test of combat, not autoplay.
    const w = unitsOf(m, 'player', 'worker')[0]!;
    w.kind = 'blade';
    w.hp = UNIT_SPEC.blade.hp;
    w.maxHp = UNIT_SPEC.blade.hp;
    w.x = eh.x - 50;
    w.y = eh.y;
    pushCmd(m, { t: 'select', ids: [w.id] });
    pushCmd(m, { t: 'attack', id: eh.id });
    // add two more attackers
    const others = unitsOf(m, 'player', 'worker').slice(1);
    for (const o of others) {
      o.kind = 'blade';
      o.hp = UNIT_SPEC.blade.hp;
      o.maxHp = UNIT_SPEC.blade.hp;
      o.x = eh.x - 50;
      o.y = eh.y + 20;
      o.order = { t: 'attack', id: eh.id };
    }
    for (let i = 0; i < 60 * 25 && !m.finished; i++) stepMp(m, MP_DT);
    expect(m.finished).toBe(true);
    expect(m.phase).toBe('won');
    expect(m.stars).toBeGreaterThanOrEqual(2);
    expect(m.enemyHallDmg).toBeGreaterThan(0);
  });

  it('times out without breaking the hall and does not clear the level', () => {
    const m = createMpMatch(1, { skipCountdown: true, freezeAi: true });
    // hold everyone still: workers stop by selecting and stop; also drain time
    m.time = 0.2;
    for (const u of m.units) u.order = { t: 'idle' };
    for (let i = 0; i < 30 && !m.finished; i++) stepMp(m, MP_DT);
    expect(m.finished).toBe(true);
    expect(m.phase).toBe('lost');
    expect(m.stars).toBe(0);
    expect(hallOf(m, 'enemy')?.hp).toBeGreaterThan(0);
  });
});

describe('slopeCamp stars and save', () => {
  it('awards 3 / 2 / 1 / 0 by the published rule', () => {
    expect(mpStars(true, 30, 20, 2, 4, 400, true)).toBe(3);
    expect(mpStars(true, 5, 20, 2, 4, 400, true)).toBe(2);
    expect(mpStars(true, 30, 20, 9, 4, 400, true)).toBe(2);
    expect(mpStars(false, 0, 20, 3, 4, 80, true)).toBe(1);
    expect(mpStars(false, 0, 20, 0, 4, 0, true)).toBe(0);
    expect(mpStars(false, 0, 20, 0, 4, 80, false)).toBe(0);
  });

  it('falls back on corrupt JSON and keeps a writable default', () => {
    expect(parseLevelSave('not-json', MP_LEVEL_COUNT)).toEqual(defaultLevelSave(MP_LEVEL_COUNT));
    expect(parseLevelSave({ unlocked: 'x', stars: null }, MP_LEVEL_COUNT).unlocked).toBe(1);
    const busted = {
      getItem() { return '{not json'; },
      setItem() { throw new Error('quota'); },
    };
    const loaded = loadLevelSave(MP_SAVE_KEY, MP_LEVEL_COUNT, busted);
    expect(loaded).toEqual(defaultLevelSave(MP_LEVEL_COUNT));
    expect(writeLevelSave(MP_SAVE_KEY, loaded, busted)).toBe(false);
    const mem: Record<string, string> = {};
    const store = {
      getItem(k: string) { return mem[k] ?? null; },
      setItem(k: string, v: string) { mem[k] = v; },
    };
    expect(writeLevelSave(MP_SAVE_KEY, { unlocked: 4, stars: [3, 2, 2, 0, 0, 0, 0, 0], scores: [1, 1, 1, 0, 0, 0, 0, 0] }, store)).toBe(true);
    expect(loadLevelSave(MP_SAVE_KEY, MP_LEVEL_COUNT, store).unlocked).toBe(4);
  });
});

describe('slopeCamp clock and autoplay', () => {
  it('clamps a huge dt so the clock does not jump to zero in one tick', () => {
    const m = createMpMatch(1, { skipCountdown: true, freezeAi: true });
    const t0 = m.time;
    tickMp(m, 5);
    expect(m.finished).toBe(false);
    expect(m.time).toBeGreaterThanOrEqual(t0 - 0.05 - 1e-6);
    expect(m.time).toBeLessThan(t0);
  });

  it('wins every level with scripted play, not by reading constants', () => {
    for (const lv of MP_LEVELS) {
      const m = autoPlayMp(lv.id);
      expect(m.finished, `L${lv.id} finished`).toBe(true);
      expect(m.phase, `L${lv.id} phase money-like hall=${hallOf(m, 'enemy')?.hp ?? 0} t=${m.time.toFixed(1)} army=${militaryOf(m, 'player').length} loss=${m.losses.player}`).toBe('won');
      expect(m.stars, `L${lv.id} stars leftover=${m.leftover.toFixed(1)} losses=${m.losses.player}`).toBeGreaterThanOrEqual(2);
      expect(hallOf(m, 'player')?.hp, `L${lv.id} own hall`).toBeGreaterThan(0);
    }
  });
});
