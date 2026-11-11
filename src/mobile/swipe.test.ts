import { describe, expect, it } from 'vitest';
import { swipeDirection, swipeToVector } from './swipe';

describe('swipeDirection', () => {
  it('returns null when movement is below the threshold', () => {
    expect(swipeDirection(10, 8, 24)).toBeNull();
    expect(swipeDirection(23, 0, 24)).toBeNull();
  });

  it('uses the dominant axis', () => {
    expect(swipeDirection(-40, 10)).toBe('left');
    expect(swipeDirection(40, -10)).toBe('right');
    expect(swipeDirection(8, -50)).toBe('up');
    expect(swipeDirection(-8, 50)).toBe('down');
  });

  it('on a perfect diagonal prefers the horizontal axis when equal', () => {
    expect(swipeDirection(30, 30)).toBe('right');
    expect(swipeDirection(-30, 30)).toBe('left');
  });
});

describe('swipeToVector', () => {
  it('maps each direction to a unit step', () => {
    expect(swipeToVector('left')).toEqual({ x: -1, y: 0 });
    expect(swipeToVector('right')).toEqual({ x: 1, y: 0 });
    expect(swipeToVector('up')).toEqual({ x: 0, y: -1 });
    expect(swipeToVector('down')).toEqual({ x: 0, y: 1 });
  });
});
