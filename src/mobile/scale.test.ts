import { describe, expect, it } from 'vitest';
import {
  PHONE_WIDTHS,
  contentWidth,
  fitSize,
  overflowsHorizontally,
  packedCellWidth,
  packedRowWidth,
} from './scale';

describe('phone packed layout', () => {
  it('lists the target portrait widths', () => {
    expect([...PHONE_WIDTHS]).toEqual([320, 375, 390, 430]);
  });

  it('keeps a 7-column solitaire-like row inside each phone content box', () => {
    for (const vw of PHONE_WIDTHS) {
      const avail = contentWidth(vw, 10);
      const cell = packedCellWidth(avail, 7, 8, 72, 36);
      const row = packedRowWidth(cell, 7, 8);
      expect(overflowsHorizontally(row, avail)).toBe(false);
      expect(cell).toBeGreaterThanOrEqual(1);
      expect(cell).toBeLessThanOrEqual(72);
    }
  });

  it('caps at maxWidth when there is room, and shrinks below minWidth rather than overflow', () => {
    expect(packedCellWidth(800, 7, 8, 72, 36)).toBe(72);
    const tiny = packedCellWidth(200, 7, 8, 72, 36);
    expect(tiny).toBeLessThan(36);
    expect(packedRowWidth(tiny, 7, 8)).toBeLessThanOrEqual(200);
  });
});

describe('fitSize', () => {
  it('scales down to fit and does not upscale unless allowed', () => {
    const down = fitSize(800, 600, 400, 400);
    expect(down.scale).toBeCloseTo(0.5);
    expect(down.width).toBeCloseTo(400);
    expect(down.height).toBeCloseTo(300);
    const noUp = fitSize(100, 80, 400, 400);
    expect(noUp.scale).toBe(1);
    const up = fitSize(100, 80, 400, 400, true);
    expect(up.scale).toBeCloseTo(4);
  });
});
