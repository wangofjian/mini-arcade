import { describe, expect, it } from 'vitest';
import {
  defaultLevelSave,
  loadLevelSave,
  parseLevelSave,
  writeLevelSave,
} from './progressSave';
import {
  EMPTY_PC_INPUT,
  PC_CX,
  PC_CY,
  PC_DT,
  PC_GOAL_BOT,
  PC_GOAL_TOP,
  PC_LEFT,
  PC_TOP,
  PC_LEVELS,
  PC_LEVEL_COUNT,
  PC_OUR_NAME,
  PC_PASS_SPEED,
  PC_RIGHT,
  PC_SAVE_KEY,
  PC_SHOT_SPEED,
  autoPlayPc,
  createPcMatch,
  giveBall,
  kickBall,
  pcLevelById,
  pcStars,
  placePc,
  stepPc,
  tickPc,
  type PcInput,
} from './pitchClash';

const hold = (partial: Partial<PcInput>): PcInput => ({ ...EMPTY_PC_INPUT, ...partial });

describe('pitchClash data', () => {
  it('has eight fictional 3v3 fixtures and no licensed marks', () => {
    expect(PC_LEVELS).toHaveLength(PC_LEVEL_COUNT);
    expect(PC_LEVEL_COUNT).toBe(8);
    expect(PC_LEVELS.filter((l) => l.mode === 'firstTo').length).toBeGreaterThanOrEqual(3);
    expect(PC_LEVELS.filter((l) => l.mode === 'timed').length).toBeGreaterThanOrEqual(3);
    expect(PC_LEVELS.filter((l) => l.venue === 'away').length).toBeGreaterThanOrEqual(2);
    expect(PC_OUR_NAME).toBe('柳岸队');
    const blob = PC_LEVELS.map((l) => l.name + l.opponent + l.hint).join(' ');
    expect(blob).not.toMatch(/FIFA|实况|PES|EA Sports|Premier League|Manchester|Barcelona|梅西|C罗|Messi/i);
    expect(new Set(PC_LEVELS.map((l) => l.id)).size).toBe(8);
  });
});

describe('pitchClash kick and goal rules', () => {
  it('a pass releases the ball and sends it toward the teammate', () => {
    const m = createPcMatch(1, { skipCountdown: true, freezeAi: true });
    m.phase = 'play';
    m.phaseT = 0;
    placePc(m, 0, 400, PC_CY);
    placePc(m, 1, 560, PC_CY);
    m.players[0].facing = 0;
    giveBall(m, 0);
    const ok = kickBall(m, 0, 'pass', 560, PC_CY);
    expect(ok).toBe(true);
    expect(m.carrier).toBeNull();
    expect(m.ball.vx).toBeGreaterThan(200);
    expect(m.ball.vx).toBeLessThanOrEqual(PC_PASS_SPEED + 1);
    expect(Math.abs(m.ball.vy)).toBeLessThan(40);
    const x0 = m.ball.x;
    for (let i = 0; i < 20; i++) stepPc(m, PC_DT, EMPTY_PC_INPUT);
    expect(m.ball.x).toBeGreaterThan(x0 + 40);
  });

  it('a shot is faster than a pass and heads at the opponent goal', () => {
    const pass = createPcMatch(1, { skipCountdown: true, freezeAi: true });
    pass.phase = 'play';
    placePc(pass, 0, 500, PC_CY);
    placePc(pass, 1, 650, PC_CY);
    pass.players[0].facing = 0;
    giveBall(pass, 0);
    kickBall(pass, 0, 'pass', 650, PC_CY);
    const passSpd = Math.hypot(pass.ball.vx, pass.ball.vy);

    const shot = createPcMatch(1, { skipCountdown: true, freezeAi: true });
    shot.phase = 'play';
    placePc(shot, 0, 700, PC_CY);
    shot.players[0].facing = 0;
    giveBall(shot, 0);
    kickBall(shot, 0, 'shoot', PC_RIGHT + 10, PC_CY);
    const shotSpd = Math.hypot(shot.ball.vx, shot.ball.vy);
    expect(shotSpd).toBeGreaterThan(passSpd);
    expect(shotSpd).toBeGreaterThan(PC_PASS_SPEED);
    expect(shot.ball.vx).toBeGreaterThan(0);
    expect(Math.abs(shot.ball.vy)).toBeLessThan(80);
    expect(shotSpd).toBeCloseTo(PC_SHOT_SPEED, 0);
  });

  it('cannot kick without possession', () => {
    const m = createPcMatch(1, { skipCountdown: true, freezeAi: true });
    m.phase = 'play';
    placePc(m, 0, 400, PC_CY);
    m.ball = { x: 600, y: PC_CY, vx: 10, vy: 0 };
    m.carrier = null;
    expect(kickBall(m, 0, 'shoot', PC_RIGHT, PC_CY)).toBe(false);
    expect(m.ball.vx).toBe(10);
  });

  it('a close-range shot into the open net scores and then can decide the match', () => {
    const m = createPcMatch(1, { skipCountdown: true, freezeAi: true });
    m.phase = 'play';
    // park everyone away from the mouth
    for (let i = 0; i < 6; i++) placePc(m, i, PC_CX, PC_TOP + 40 + i * 8);
    placePc(m, 0, PC_RIGHT - 70, PC_CY);
    m.players[0].facing = 0;
    giveBall(m, 0);
    kickBall(m, 0, 'shoot', PC_RIGHT + 20, PC_CY);
    for (let i = 0; i < 90 && m.score[0] === 0; i++) stepPc(m, PC_DT, EMPTY_PC_INPUT);
    expect(m.score[0]).toBe(1);
    expect(m.score[1]).toBe(0);
    // second goal: skip celebration and kick off, shoot again
    m.phase = 'play';
    m.phaseT = 0;
    m.finished = false;
    for (let i = 0; i < 6; i++) placePc(m, i, PC_CX, PC_TOP + 40 + i * 8);
    placePc(m, 0, PC_RIGHT - 70, PC_CY);
    m.players[0].facing = 0;
    giveBall(m, 0);
    kickBall(m, 0, 'shoot', PC_RIGHT + 20, PC_CY);
    for (let i = 0; i < 90 && m.score[0] < 2; i++) stepPc(m, PC_DT, EMPTY_PC_INPUT);
    expect(m.score[0]).toBe(2);
    // first-to-2 should award a win
    if (!m.finished) {
      // celebration of second goal finishes the match inside goalFor → maybeFinish
    }
    expect(m.finished).toBe(true);
    expect(m.phase).toBe('won');
    expect(m.stars).toBe(3);
    expect(m.score[0] - m.score[1]).toBeGreaterThanOrEqual(2);
    expect(PC_GOAL_TOP).toBeLessThan(PC_CY);
    expect(PC_GOAL_BOT).toBeGreaterThan(PC_CY);
    expect(PC_LEFT).toBeLessThan(PC_RIGHT);
  });
});

describe('pitchClash stars and save', () => {
  it('awards 3 / 2 / 1 / 0 by the published rule', () => {
    expect(pcStars(3, 1, true, 2)).toBe(3);
    expect(pcStars(2, 0, true, 2)).toBe(3);
    expect(pcStars(2, 1, true, 2)).toBe(2);
    expect(pcStars(1, 1, true, 2)).toBe(1);
    expect(pcStars(0, 1, true, 2)).toBe(0);
    expect(pcStars(2, 0, false, 2)).toBe(0);
  });

  it('falls back on corrupt JSON and keeps a writable default', () => {
    expect(parseLevelSave('not-json', PC_LEVEL_COUNT)).toEqual(defaultLevelSave(PC_LEVEL_COUNT));
    expect(parseLevelSave({ unlocked: 'x', stars: null }, PC_LEVEL_COUNT).unlocked).toBe(1);
    const busted = {
      getItem() {
        return '{not json';
      },
      setItem() {
        throw new Error('quota');
      },
    };
    const loaded = loadLevelSave(PC_SAVE_KEY, PC_LEVEL_COUNT, busted);
    expect(loaded).toEqual(defaultLevelSave(PC_LEVEL_COUNT));
    expect(writeLevelSave(PC_SAVE_KEY, loaded, busted)).toBe(false);
    const mem: Record<string, string> = {};
    const store = {
      getItem(k: string) {
        return mem[k] ?? null;
      },
      setItem(k: string, v: string) {
        mem[k] = v;
      },
    };
    expect(writeLevelSave(PC_SAVE_KEY, { unlocked: 4, stars: [3, 2, 1, 0, 0, 0, 0, 0], scores: [1, 1, 1, 0, 0, 0, 0, 0] }, store)).toBe(true);
    expect(loadLevelSave(PC_SAVE_KEY, PC_LEVEL_COUNT, store).unlocked).toBe(4);
  });
});

describe('pitchClash clock and autoplay', () => {
  it('clamps a huge dt so the match does not jump to full time in one tick', () => {
    const m = createPcMatch(2, { skipCountdown: true, freezeAi: true });
    m.phase = 'play';
    const t0 = m.time;
    tickPc(m, 5, hold({}));
    expect(m.finished).toBe(false);
    expect(m.time).toBeLessThanOrEqual(t0 + 0.05 + 1e-6);
    expect(m.phase).not.toBe('won');
    expect(m.phase).not.toBe('draw');
    expect(m.phase).not.toBe('lost');
  });

  it('wins every fixture with scripted play, not by reading constants', () => {
    for (const lv of PC_LEVELS) {
      const m = autoPlayPc(lv.id);
      expect(m.finished, `L${lv.id} finished`).toBe(true);
      expect(m.score[0], `L${lv.id} ${m.score[0]}-${m.score[1]} ${m.phase} t=${m.time.toFixed(1)}`).toBeGreaterThan(m.score[1]);
      expect(m.phase, `L${lv.id} phase`).toBe('won');
      expect(m.stars, `L${lv.id} stars`).toBeGreaterThanOrEqual(2);
      expect(pcLevelById(lv.id).opponent).toBe(lv.opponent);
    }
  });
});
