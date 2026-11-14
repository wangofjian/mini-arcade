import { describe, expect, it } from 'vitest';
import {
  loadLevelSave,
  parseLevelSave,
  writeLevelSave,
  defaultLevelSave,
} from './progressSave';
import {
  TS_LEVELS,
  TS_LEVEL_COUNT,
  TS_SAVE_KEY,
  TS_FORMATIONS,
  TS_PRESSES,
  TS_BUILDS,
  TS_WIDTHS,
  TS_OUR_NAME,
  TS_MIN_PER_SEC,
  autoPlayTs,
  confirmHalf,
  createTsMatch,
  defaultTactic,
  evaluatePlan,
  goals90,
  kickoff,
  resolveHalf,
  setTactic,
  skipHalf,
  tickTs,
  tsLevelById,
  tsStars,
  type Tactic,
} from './tacticSketch';

const OUR = { atk: 72, mid: 74, def: 71 };
const L2_OPP = { atk: 68, mid: 69, def: 68 };
const L2_TAC: Tactic = { formation: '442', press: 'mid', build: 'possession', width: 'central' };

function ev(t: Tactic, opp = L2_OPP, ot: Tactic = L2_TAC, venue: 'home' | 'away' = 'home') {
  return evaluatePlan({ ratings: OUR, tactic: t }, { ratings: opp, tactic: ot }, venue);
}

function report(t: Tactic, levelId: number) {
  const lv = tsLevelById(levelId);
  const m = createTsMatch(levelId, t);
  const us = m.players.filter((p) => p.team === 0);
  const them = m.players.filter((p) => p.team === 1);
  return resolveHalf({ ratings: OUR, tactic: t }, { ratings: lv.opponent.ratings, tactic: lv.opponent.tactic }, lv.venue, 2, 1, us, them);
}

describe('tacticSketch data', () => {
  it('has four formations, three instruction axes, eight fictional fixtures', () => {
    expect(TS_FORMATIONS.map((f) => f.id)).toEqual(['433', '442', '4231', '532']);
    expect(TS_PRESSES).toHaveLength(3);
    expect(TS_BUILDS).toHaveLength(3);
    expect(TS_WIDTHS).toHaveLength(2);
    expect(TS_LEVELS).toHaveLength(TS_LEVEL_COUNT);
    expect(TS_LEVEL_COUNT).toBe(8);
    const names = TS_LEVELS.map((l) => l.opponent.name).join(' ');
    expect(names).toContain('梧桐青年');
    expect(names).not.toMatch(/Manchester|Madrid|Barcelona|Chelsea|Arsenal|Liverpool|Bayern|Juventus|梅西|C罗|穆里尼奥|Football Manager|\bFM\b/i);
    expect(TS_OUR_NAME).toBe('青禾联');
    expect(new Set(TS_LEVELS.map((l) => l.id)).size).toBe(8);
    expect(TS_LEVELS.filter((l) => l.venue === 'away').length).toBeGreaterThanOrEqual(2);
    expect(TS_LEVELS.filter((l) => l.venue === 'home').length).toBeGreaterThanOrEqual(4);
  });
});

describe('tacticSketch plan influence', () => {
  it('possession keeps more of the ball than counter, with the same other settings', () => {
    const poss = ev({ formation: '442', press: 'mid', build: 'possession', width: 'wide' });
    const counter = ev({ formation: '442', press: 'mid', build: 'counter', width: 'wide' });
    expect(poss.ourPoss).toBeGreaterThan(counter.ourPoss + 0.05);
    expect(poss.ourPassLen).toBeLessThan(counter.ourPassLen - 4);
  });

  it('wide instructions produce more wing attacks than central', () => {
    const wide = report({ formation: '433', press: 'mid', build: 'direct', width: 'wide' }, 2);
    const mid = report({ formation: '433', press: 'mid', build: 'direct', width: 'central' }, 2);
    expect(wide.wingAttacks).toBeGreaterThan(mid.wingAttacks);
    expect(wide.eval.ourWing).toBeGreaterThan(mid.eval.ourWing + 0.3);
  });

  it('high press wins more balls in the opponent half than a low block', () => {
    const high = report({ formation: '433', press: 'high', build: 'direct', width: 'central' }, 2);
    const low = report({ formation: '433', press: 'low', build: 'direct', width: 'central' }, 2);
    expect(high.interceptHigh).toBeGreaterThan(low.interceptHigh);
    expect(high.eval.ourPressHeight).toBeGreaterThan(low.eval.ourPressHeight);
  });

  it('the right plan beats a mismatched plan against a high-pressing favorite', () => {
    const good = autoPlayTs(3);
    const bad = autoPlayTs(3, { formation: '433', press: 'high', build: 'possession', width: 'wide' });
    expect(good.briefing).toBeTruthy();
    expect(bad.briefing).toBeTruthy();
    expect(good.briefing!.goalsFor).toBeGreaterThan(good.briefing!.goalsAgainst);
    expect(bad.briefing!.goalsFor).toBeLessThan(bad.briefing!.goalsAgainst);
    expect(good.stars).toBeGreaterThanOrEqual(2);
    expect(bad.stars).toBe(0);
  });

  it('patience and width break a low block, while a counter stalls', () => {
    const good = autoPlayTs(4);
    const bad = autoPlayTs(4, { formation: '532', press: 'low', build: 'counter', width: 'central' });
    expect(good.briefing!.goalsFor).toBeGreaterThan(good.briefing!.goalsAgainst);
    expect(bad.briefing!.goalsFor).toBeLessThanOrEqual(bad.briefing!.goalsAgainst);
    expect(bad.stars).toBeLessThan(2);
    expect(good.briefing!.notes.join('')).toMatch(/控球|边路|密集/);
  });
});

describe('tacticSketch stars and score', () => {
  it('awards 3 / 2 / 1 / 0 by the published rule', () => {
    expect(tsStars(3, 1, 0.4)).toBe(3);
    expect(tsStars(1, 0, 0.56)).toBe(3);
    expect(tsStars(1, 0, 0.4)).toBe(2);
    expect(tsStars(1, 1, 0.6)).toBe(1);
    expect(tsStars(0, 1, 0.7)).toBe(0);
    expect(tsStars(0, 0, 0.5)).toBe(1);
  });

  it('goals90 is deterministic and rewards a clear edge', () => {
    const a = ev({ formation: '532', press: 'low', build: 'counter', width: 'central' }, { atk: 82, mid: 80, def: 78 }, { formation: '433', press: 'high', build: 'possession', width: 'wide' }, 'away');
    const [gf, ga] = goals90(a.ourPower, a.theirPower);
    expect(gf).toBeGreaterThan(ga);
    expect(goals90(a.ourPower, a.theirPower)).toEqual([gf, ga]);
  });
});

describe('tacticSketch save fallback', () => {
  it('falls back on corrupt JSON and keeps a writable default', () => {
    expect(parseLevelSave('not-json', TS_LEVEL_COUNT)).toEqual(defaultLevelSave(TS_LEVEL_COUNT));
    expect(parseLevelSave({ unlocked: 'x', stars: null }, TS_LEVEL_COUNT).unlocked).toBe(1);
    const busted = {
      getItem() {
        return '{not json';
      },
      setItem() {
        throw new Error('quota');
      },
    };
    const loaded = loadLevelSave(TS_SAVE_KEY, TS_LEVEL_COUNT, busted);
    expect(loaded).toEqual(defaultLevelSave(TS_LEVEL_COUNT));
    expect(writeLevelSave(TS_SAVE_KEY, loaded, busted)).toBe(false);
    const mem: Record<string, string> = {};
    const store = {
      getItem(k: string) {
        return mem[k] ?? null;
      },
      setItem(k: string, v: string) {
        mem[k] = v;
      },
    };
    expect(writeLevelSave(TS_SAVE_KEY, { unlocked: 3, stars: [3, 2, 0, 0, 0, 0, 0, 0], scores: [1, 1, 0, 0, 0, 0, 0, 0] }, store)).toBe(true);
    expect(loadLevelSave(TS_SAVE_KEY, TS_LEVEL_COUNT, store).unlocked).toBe(3);
  });
});

describe('tacticSketch autoplay and clock', () => {
  it('wins every fixture with the recommended plan and records a briefing', () => {
    for (const lv of TS_LEVELS) {
      const m = autoPlayTs(lv.id);
      expect(m.phase, `L${lv.id} phase`).toBe('fulltime');
      expect(m.briefing, `L${lv.id} briefing`).toBeTruthy();
      const b = m.briefing!;
      expect(b.goalsFor, `L${lv.id} ${b.goalsFor}-${b.goalsAgainst}`).toBeGreaterThan(b.goalsAgainst);
      expect(m.stars, `L${lv.id} stars ${m.stars}`).toBeGreaterThanOrEqual(2);
      expect(b.shotsFor).toBeGreaterThan(0);
      expect(b.events.length + b.notes.length).toBeGreaterThan(0);
      expect(m.score).toEqual([b.goalsFor, b.goalsAgainst]);
    }
  });

  it('a halftime instruction change changes the second half', () => {
    const stay = autoPlayTs(3);
    const swap = autoPlayTs(3, tsLevelById(3).recommended, { press: 'high', build: 'possession', width: 'wide' });
    expect(stay.second).toBeTruthy();
    expect(swap.second).toBeTruthy();
    const same =
      stay.second!.goalsFor === swap.second!.goalsFor &&
      stay.second!.goalsAgainst === swap.second!.goalsAgainst &&
      Math.abs(stay.second!.possession - swap.second!.possession) < 0.01;
    expect(same).toBe(false);
    expect(swap.stars).toBeLessThan(stay.stars);
  });

  it('clamps a huge dt so the half does not jump to full time in one tick', () => {
    const m = createTsMatch(1, tsLevelById(1).recommended);
    kickoff(m);
    expect(m.phase).toBe('first');
    tickTs(m, 5);
    expect(m.phase).toBe('first');
    expect(m.minute).toBeLessThanOrEqual(0.05 * TS_MIN_PER_SEC + 1e-6);
    expect(m.minute).toBeGreaterThan(0);
  });

  it('setup can change formation before kickoff, and P-path skip reaches halftime then full time', () => {
    const m = createTsMatch(1);
    expect(m.phase).toBe('setup');
    setTactic(m, { formation: '433', press: 'high', build: 'possession', width: 'wide' });
    expect(m.tactic.formation).toBe('433');
    kickoff(m);
    skipHalf(m);
    expect(m.phase).toBe('halftime');
    confirmHalf(m);
    expect(m.htUsed).toBe(true);
    skipHalf(m);
    expect(m.phase).toBe('fulltime');
    expect(m.stars).toBeGreaterThanOrEqual(2);
  });
});
