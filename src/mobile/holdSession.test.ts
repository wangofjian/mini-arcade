import { describe, expect, it } from 'vitest';
import { createHoldSession } from './holdSession';

function makeClock() {
  let now = 0;
  const timers: { id: number; at: number; fn: () => void }[] = [];
  let nextId = 1;
  const api = {
    now: () => now,
    schedule: (fn: () => void, ms: number) => {
      const id = nextId++;
      timers.push({ id, at: now + ms, fn });
      return id;
    },
    cancel: (id: number) => {
      const i = timers.findIndex((t) => t.id === id);
      if (i >= 0) timers.splice(i, 1);
    },
    advance(ms: number) {
      const target = now + ms;
      for (;;) {
        let next: (typeof timers)[number] | undefined;
        for (const t of timers) {
          if (t.at <= target && (!next || t.at < next.at)) next = t;
        }
        if (!next) {
          now = target;
          return;
        }
        const idx = timers.indexOf(next);
        if (idx >= 0) timers.splice(idx, 1);
        now = next.at;
        next.fn();
      }
    },
    pending: () => timers.length,
  };
  return api;
}

describe('createHoldSession', () => {
  it('fires onDown once and onUp on matching release', () => {
    const log: string[] = [];
    const clock = makeClock();
    const s = createHoldSession({
      onDown: () => log.push('down'),
      onUp: () => log.push('up'),
      now: clock.now,
      schedule: clock.schedule,
      cancel: clock.cancel,
    });
    s.press(1);
    s.release(2);
    expect(log).toEqual(['down']);
    expect(s.isHeld()).toBe(true);
    s.release(1);
    expect(log).toEqual(['down', 'up']);
    expect(s.isHeld()).toBe(false);
  });

  it('does not auto-repeat when wantRepeat is false even if onRepeat exists', () => {
    let repeats = 0;
    const clock = makeClock();
    const s = createHoldSession({
      onRepeat: () => {
        repeats += 1;
      },
      wantRepeat: () => false,
      now: clock.now,
      schedule: clock.schedule,
      cancel: clock.cancel,
    });
    s.press(7);
    clock.advance(1000);
    expect(repeats).toBe(0);
    s.dispose();
  });

  it('repeats after the delay, then on the interval, and stops after release', () => {
    const log: string[] = [];
    const clock = makeClock();
    const s = createHoldSession({
      onDown: () => log.push('down'),
      onUp: () => log.push('up'),
      onRepeat: () => log.push('rep'),
      repeatDelayMs: 280,
      repeatEveryMs: 80,
      now: clock.now,
      schedule: clock.schedule,
      cancel: clock.cancel,
    });
    s.press(3);
    clock.advance(279);
    expect(log).toEqual(['down']);
    clock.advance(1);
    expect(log).toEqual(['down', 'rep']);
    clock.advance(80);
    expect(log).toEqual(['down', 'rep', 'rep']);
    clock.advance(80);
    expect(log).toEqual(['down', 'rep', 'rep', 'rep']);
    s.release(3);
    const after = log.slice();
    clock.advance(500);
    expect(log).toEqual(after);
    expect(log.at(-1)).toBe('up');
    expect(clock.pending()).toBe(0);
  });

  it('dispose releases a held pointer so keys cannot stick after unmount', () => {
    const log: string[] = [];
    const clock = makeClock();
    const s = createHoldSession({
      onDown: () => log.push('down'),
      onUp: () => log.push('up'),
      onRepeat: () => log.push('rep'),
      now: clock.now,
      schedule: clock.schedule,
      cancel: clock.cancel,
    });
    s.press(9);
    s.dispose();
    clock.advance(1000);
    expect(log).toEqual(['down', 'up']);
    expect(s.isHeld()).toBe(false);
    expect(clock.pending()).toBe(0);
  });
});
