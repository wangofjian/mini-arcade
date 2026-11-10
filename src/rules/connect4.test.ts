import { describe, expect, it } from 'vitest';
import { applyDrop, emptyBoard, findWin, isFull, legalCols } from './connect4';

describe('四子棋规则', () => {
  it('棋子受重力落到列底', () => {
    let b = emptyBoard();
    b = applyDrop(b, 0, 1)!;
    b = applyDrop(b, 0, 2)!;
    expect(b[5][0]).toBe(1);
    expect(b[4][0]).toBe(2);
  });

  it('横向四连判胜', () => {
    let b = emptyBoard();
    for (let c = 0; c < 4; c++) b = applyDrop(b, c, 1)!;
    expect(findWin(b, 1)?.length).toBe(4);
    expect(findWin(b, 2)).toBeNull();
  });

  it('列满后不能再落', () => {
    let b = emptyBoard();
    for (let i = 0; i < 6; i++) b = applyDrop(b, 3, (i % 2 === 0 ? 1 : 2) as 1 | 2)!;
    expect(applyDrop(b, 3, 1)).toBeNull();
    expect(legalCols(b).includes(3)).toBe(false);
  });

  it('空盘未满', () => {
    expect(isFull(emptyBoard())).toBe(false);
  });
});
