import { describe, expect, it } from 'vitest';
import { clientToLogical, laneFromLogicalX } from './coords';

describe('clientToLogical fill', () => {
  const rect = { left: 10, top: 20, width: 200, height: 100 };

  it('maps corners and center into logical space', () => {
    expect(clientToLogical(rect, 10, 20, 800, 400, 'fill')).toEqual({ x: 0, y: 0, inside: true });
    expect(clientToLogical(rect, 210, 120, 800, 400, 'fill')).toEqual({ x: 800, y: 400, inside: true });
    expect(clientToLogical(rect, 110, 70, 800, 400, 'fill')).toEqual({ x: 400, y: 200, inside: true });
  });

  it('marks points outside the element box as not inside', () => {
    const p = clientToLogical(rect, 5, 70, 800, 400, 'fill');
    expect(p.inside).toBe(false);
    expect(p.x).toBeLessThan(0);
  });

  it('returns not inside when the element has no size', () => {
    expect(clientToLogical({ left: 0, top: 0, width: 0, height: 100 }, 1, 1, 100, 100).inside).toBe(false);
  });
});

describe('clientToLogical contain (letterbox)', () => {
  // 400x200 box, 100x100 logical: content is 200x200, letterboxed horizontally.
  const rect = { left: 0, top: 0, width: 400, height: 200 };

  it('maps the drawn content area, not the empty side bars', () => {
    const mid = clientToLogical(rect, 200, 100, 100, 100, 'contain');
    expect(mid).toEqual({ x: 50, y: 50, inside: true });
    const leftContent = clientToLogical(rect, 100, 0, 100, 100, 'contain');
    expect(leftContent).toEqual({ x: 0, y: 0, inside: true });
  });

  it('treats clicks in the letterbox as outside', () => {
    const leftBar = clientToLogical(rect, 40, 100, 100, 100, 'contain');
    expect(leftBar.inside).toBe(false);
    expect(leftBar.x).toBeLessThan(0);
  });
});

describe('laneFromLogicalX', () => {
  // Rhythm canvas is 720 wide with 40px insets, four tracks.
  it('splits the inner width into equal lanes and clamps', () => {
    expect(laneFromLogicalX(40, 720, 4, 40)).toBe(0);
    expect(laneFromLogicalX(200, 720, 4, 40)).toBe(1);
    expect(laneFromLogicalX(360, 720, 4, 40)).toBe(2);
    expect(laneFromLogicalX(600, 720, 4, 40)).toBe(3);
    expect(laneFromLogicalX(-10, 720, 4, 40)).toBe(0);
    expect(laneFromLogicalX(800, 720, 4, 40)).toBe(3);
  });
});
