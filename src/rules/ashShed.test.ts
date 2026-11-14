import { describe, expect, it } from 'vitest';
import {
  defaultLevelSave,
  loadLevelSave,
  parseLevelSave,
  writeLevelSave,
} from './progressSave';
import {
  AS_DT,
  AS_LEVELS,
  AS_LEVEL_COUNT,
  AS_MAPS,
  AS_OUR_NAME,
  AS_PLAYER_HP,
  AS_SAVE_KEY,
  AS_THEIR_NAME,
  WEAPON_SPEC,
  asLevelById,
  asStars,
  autoPlayAs,
  blockedTerrain,
  createAsMatch,
  liveEnemies,
  stepAs,
  switchWeapon,
  tickAs,
  tryShoot,
  WEAPON_ORDER,
} from './ashShed';

describe('ashShed data', () => {
  it('has eight original sheds without licensed marks or street-rush name', () => {
    expect(AS_LEVELS).toHaveLength(AS_LEVEL_COUNT);
    expect(Object.keys(AS_MAPS)).toEqual(['huipeng', 'nangduo', 'jiushui']);
    expect(AS_OUR_NAME).toBe('青灯巡卫');
    expect(AS_THEIR_NAME).toBe('夜鸦帮');
    expect(WEAPON_ORDER).toHaveLength(3);
    expect(WEAPON_SPEC.pistol.name).toBe('短铳');
    const blob = [
      AS_OUR_NAME, AS_THEIR_NAME, '灰棚交火',
      ...AS_LEVELS.map((l) => l.name + l.hint),
      ...Object.values(AS_MAPS).map((m) => m.name),
      ...Object.values(WEAPON_SPEC).map((s) => s.name),
    ].join(' ');
    expect(blob).not.toMatch(/Counter-Strike|CS:GO|CSGO|反恐精英|上海滩|街区突围|AK-47|AWP|Desert Eagle|Vallejo|Inferno|Dust II|SEGA|StarCraft/i);
    expect(new Set(AS_LEVELS.map((l) => l.mapId)).size).toBe(3);
    for (const lv of AS_LEVELS) {
      expect(asLevelById(lv.id).name).toBe(lv.name);
      expect(AS_MAPS[lv.mapId]).toBeTruthy();
      expect(lv.time).toBeGreaterThan(lv.starTime);
    }
  });
});

describe('ashShed combat, cover, timeout', () => {
  it('player shots can take down an enemy', () => {
    const m = createAsMatch(1, { skipCountdown: true, freezeAi: true, seed: 1 });
    const e = liveEnemies(m)[0];
    expect(e).toBeTruthy();
    // teleport in front, aim and fire repeatedly
    m.player.x = e!.x - 80;
    m.player.y = e!.y;
    m.player.facing = 0;
    const hp0 = e!.hp;
    for (let i = 0; i < 60 * 3 && e!.hp > 0; i++) {
      m.player.facing = Math.atan2(e!.y - m.player.y, e!.x - m.player.x);
      tryShoot(m);
      stepAs(m, AS_DT, { up: false, down: false, left: false, right: false, shoot: true, reload: false, weapon: null, aimX: e!.x, aimY: e!.y, hasAim: true });
    }
    expect(e!.hp).toBeLessThan(hp0);
    expect(m.kills + (e!.hp <= 0 ? 0 : 0)).toBeGreaterThanOrEqual(e!.hp <= 0 ? 1 : 0);
    expect(m.shots).toBeGreaterThan(0);
  });

  it('crates block bullets so a shot from behind cover misses', () => {
    const m = createAsMatch(1, { skipCountdown: true, freezeAi: true, seed: 2 });
    // clear existing enemies to isolate
    for (const e of m.enemies) e.hp = 0;
    // place a dummy enemy on the other side of a known crate (300,160,70,50) — left vs right
    const crate = m.map.blocks[0]!;
    m.player.x = crate.x - 40;
    m.player.y = crate.y + crate.h / 2;
    m.player.facing = 0;
    m.enemies = [{
      id: 99, kind: 'runner',
      x: crate.x + crate.w + 40, y: crate.y + crate.h / 2,
      facing: Math.PI, hp: 80, maxHp: 80, cool: 9, stuckT: 0,
      lastX: 0, lastY: 0, path: [], pathI: 0, strafe: 1,
    }];
    const e = m.enemies[0]!;
    const hp0 = e.hp;
    for (let i = 0; i < 20; i++) {
      tryShoot(m);
      stepAs(m, AS_DT, { up: false, down: false, left: false, right: false, shoot: true, reload: false, weapon: null, aimX: e.x, aimY: e.y, hasAim: true });
    }
    expect(e.hp).toBe(hp0);
    expect(blockedTerrain(m.map, crate.x + 10, crate.y + 10, 4)).toBe(true);
  });

  it('times out without clearing and does not unlock', () => {
    const m = createAsMatch(1, { skipCountdown: true, freezeAi: true });
    m.time = 0.15;
    for (const e of m.enemies) e.hp = e.maxHp; // leave them
    for (let i = 0; i < 30 && !m.finished; i++) stepAs(m, AS_DT);
    expect(m.finished).toBe(true);
    expect(m.phase).toBe('lost');
    expect(m.stars).toBe(0);
  });

  it('can switch to an owned weapon', () => {
    const m = createAsMatch(5, { skipCountdown: true, freezeAi: true });
    expect(m.player.inv.owned.shotgun).toBe(true);
    expect(switchWeapon(m, 'shotgun')).toBe(true);
    expect(m.player.inv.current).toBe('shotgun');
  });
});

describe('ashShed stars and save', () => {
  it('awards 3 / 2 / 1 / 0 by the published rule', () => {
    expect(asStars(true, 40, 20, 80, 50, 8, true)).toBe(3);
    expect(asStars(true, 5, 20, 80, 50, 8, true)).toBe(2);
    expect(asStars(true, 40, 20, 20, 50, 8, true)).toBe(2);
    expect(asStars(false, 0, 20, 40, 50, 4, true)).toBe(1);
    expect(asStars(false, 0, 20, 40, 50, 0, true)).toBe(0);
    expect(asStars(false, 0, 20, 40, 50, 4, false)).toBe(0);
    expect(AS_PLAYER_HP).toBe(100);
  });

  it('falls back on corrupt JSON and keeps a writable default', () => {
    expect(parseLevelSave('not-json', AS_LEVEL_COUNT)).toEqual(defaultLevelSave(AS_LEVEL_COUNT));
    expect(parseLevelSave({ unlocked: 'x', stars: null }, AS_LEVEL_COUNT).unlocked).toBe(1);
    const busted = {
      getItem() { return '{not json'; },
      setItem() { throw new Error('quota'); },
    };
    const loaded = loadLevelSave(AS_SAVE_KEY, AS_LEVEL_COUNT, busted);
    expect(loaded).toEqual(defaultLevelSave(AS_LEVEL_COUNT));
    expect(writeLevelSave(AS_SAVE_KEY, loaded, busted)).toBe(false);
    const mem: Record<string, string> = {};
    const store = {
      getItem(k: string) { return mem[k] ?? null; },
      setItem(k: string, v: string) { mem[k] = v; },
    };
    expect(writeLevelSave(AS_SAVE_KEY, { unlocked: 5, stars: [3, 2, 2, 2, 0, 0, 0, 0], scores: [1, 1, 1, 1, 0, 0, 0, 0] }, store)).toBe(true);
    expect(loadLevelSave(AS_SAVE_KEY, AS_LEVEL_COUNT, store).unlocked).toBe(5);
  });
});

describe('ashShed clock and autoplay', () => {
  it('clamps a huge dt so the clock does not jump to zero in one tick', () => {
    const m = createAsMatch(1, { skipCountdown: true, freezeAi: true });
    const t0 = m.time;
    tickAs(m, 5);
    expect(m.finished).toBe(false);
    expect(m.time).toBeGreaterThanOrEqual(t0 - 0.05 - 1e-6);
    expect(m.time).toBeLessThan(t0);
  });

  it('wins every level with scripted dual-stick play, not by reading constants', () => {
    for (const lv of AS_LEVELS) {
      const m = autoPlayAs(lv.id);
      expect(m.finished, `L${lv.id} finished`).toBe(true);
      expect(m.phase, `L${lv.id} kills=${m.kills} hp=${m.player.hp.toFixed(0)} t=${m.time.toFixed(1)} waves=${m.waveI}/${lv.waves.length}`).toBe('won');
      expect(m.stars, `L${lv.id} leftover=${m.leftover.toFixed(1)} hp=${m.player.hp.toFixed(0)}`).toBeGreaterThanOrEqual(2);
      expect(m.player.hp).toBeGreaterThan(0);
      expect(m.kills).toBeGreaterThan(0);
    }
  });
});
