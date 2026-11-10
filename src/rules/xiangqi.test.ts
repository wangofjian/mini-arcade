import { describe, expect, it } from 'vitest';
import {
  applyMove,
  hasLegal,
  inPalace,
  initialBoard,
  isChecked,
  legalDests,
  rawAttacks,
} from './xiangqi';

describe('中国象棋关键规则', () => {
  it('开局红帅在九宫，黑将也在九宫', () => {
    const b = initialBoard();
    expect(b[0][4]?.kind).toBe('K');
    expect(b[0][4]?.side).toBe('r');
    expect(b[9][4]?.kind).toBe('K');
    expect(inPalace('r', 0, 4)).toBe(true);
    expect(inPalace('r', 3, 4)).toBe(false);
    expect(inPalace('b', 9, 4)).toBe(true);
  });

  it('马被蹩腿时不能跳过去', () => {
    const b = initialBoard();
    // 开局红右马 (0,7) 的马腿 (1,7) 为空，可跳 (2,6) 与 (2,8)
    const open = legalDests(b, 0, 7).map((s) => s.r + ',' + s.c);
    expect(open).toContain('2,6');
    expect(open).toContain('2,8');
    b[1][7] = { side: 'r', kind: 'P' };
    const blocked = legalDests(b, 0, 7).map((s) => s.r + ',' + s.c);
    expect(blocked).not.toContain('2,6');
    expect(blocked).not.toContain('2,8');
  });

  it('相不能过河，且象眼被塞时不能走', () => {
    const b = initialBoard();
    const dests = legalDests(b, 0, 2).map((s) => s.r + ',' + s.c);
    expect(dests).toContain('2,0');
    expect(dests).toContain('2,4');
    // 塞左象眼 (1,1)
    b[1][1] = { side: 'r', kind: 'P' };
    const blocked = legalDests(b, 0, 2).map((s) => s.r + ',' + s.c);
    expect(blocked).not.toContain('2,0');
  });

  it('将帅照面为不合法，被将军必须应将', () => {
    const b = initialBoard();
    for (let r = 1; r <= 8; r++) b[r][4] = null;
    expect(isChecked(b, 'r')).toBe(true);
    expect(isChecked(b, 'b')).toBe(true);
    // 腾出九宫左右格，红帅应可横向离开中线解除照面
    b[0][3] = null;
    b[0][5] = null;
    const dests = legalDests(b, 0, 4);
    expect(dests.some((s) => s.r === 0 && s.c === 3)).toBe(true);
    expect(dests.some((s) => s.r === 1 && s.c === 4)).toBe(false); // 仍在同一直线，照面
    const moved = applyMove(b, { r: 0, c: 4 }, { r: 0, c: 3 });
    expect(isChecked(moved, 'r')).toBe(false);
  });

  it('炮隔一子才能吃，车不能跳子', () => {
    const empty = initialBoard();
    for (let r = 0; r < 10; r++) for (let c = 0; c < 9; c++) empty[r][c] = null;
    empty[0][0] = { side: 'r', kind: 'C' };
    empty[0][4] = { side: 'r', kind: 'P' };
    empty[0][8] = { side: 'b', kind: 'R' };
    expect(rawAttacks(empty, 0, 0, 0, 8)).toBe(true); // 隔一炮架可打
    empty[0][2] = { side: 'b', kind: 'P' };
    expect(rawAttacks(empty, 0, 0, 0, 8)).toBe(false); // 隔两子不可打
    empty[0][2] = null;
    empty[0][4] = null;
    expect(rawAttacks(empty, 0, 0, 0, 8)).toBe(false); // 无炮架不能吃
    empty[0][0] = { side: 'r', kind: 'R' };
    empty[0][4] = { side: 'r', kind: 'P' };
    expect(rawAttacks(empty, 0, 0, 0, 8)).toBe(false); // 车不能跳子
  });

  it('开局双方都有合法着法且未被将军', () => {
    const b = initialBoard();
    expect(isChecked(b, 'r')).toBe(false);
    expect(isChecked(b, 'b')).toBe(false);
    expect(hasLegal(b, 'r')).toBe(true);
  });
});
