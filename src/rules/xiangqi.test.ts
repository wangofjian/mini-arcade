import { describe, expect, it } from 'vitest';
import {
  emptyBoard,
  hintMove,
  type Board,
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

const kings=()=>{const b=emptyBoard();b[0][4]={side:'r',kind:'K'};b[9][4]={side:'b',kind:'K'};b[5][4]={side:'b',kind:'P'};return b;};
const legal=(b:Board,r:number,c:number,tr:number,tc:number)=>legalDests(b,r,c).some(x=>x.r===tr&&x.c===tc);
describe('中国象棋复用规则',()=>{
 it('马腿与象眼',()=>{const b=kings();b[2][2]={side:'r',kind:'H'};expect(rawAttacks(b,2,2,4,3)).toBe(true);b[3][2]={side:'r',kind:'P'};expect(rawAttacks(b,2,2,4,3)).toBe(false);b[0][2]={side:'r',kind:'E'};expect(rawAttacks(b,0,2,2,4)).toBe(true);b[1][3]={side:'b',kind:'P'};expect(rawAttacks(b,0,2,2,4)).toBe(false);});
 it('宫界河界，兵卒过河不可退',()=>{const b=kings();expect(rawAttacks(b,0,4,1,4)).toBe(true);expect(rawAttacks(b,0,4,0,2)).toBe(false);b[4][2]={side:'r',kind:'E'};expect(rawAttacks(b,4,2,6,4)).toBe(false);b[3][2]={side:'r',kind:'P'};expect(rawAttacks(b,3,2,3,3)).toBe(false);b[5][2]={side:'r',kind:'P'};expect(rawAttacks(b,5,2,5,3)).toBe(true);expect(rawAttacks(b,5,2,4,2)).toBe(false);b[0][3]={side:'r',kind:'A'};expect(rawAttacks(b,0,3,1,4)).toBe(true);expect(rawAttacks(b,0,3,1,2)).toBe(false);});
 it('炮架恰一，车不能跳，不能吃己方',()=>{const b=kings();b[2][0]={side:'r',kind:'C'};b[2][6]={side:'b',kind:'R'};expect(rawAttacks(b,2,0,2,6)).toBe(false);b[2][3]={side:'r',kind:'P'};expect(rawAttacks(b,2,0,2,6)).toBe(true);b[2][4]={side:'b',kind:'P'};expect(rawAttacks(b,2,0,2,6)).toBe(false);b[2][0]={side:'r',kind:'R'};expect(rawAttacks(b,2,0,2,6)).toBe(false);expect(legal(b,2,0,2,3)).toBe(false);});
 it('将帅照面，移动挡子自陷被将被拒',()=>{const b=kings();b[5][4]={side:'r',kind:'R'};expect(isChecked(b,'r')).toBe(false);expect(legal(b,5,4,5,3)).toBe(false);const n=applyMove(b,{r:5,c:4},{r:5,c:3});expect(isChecked(n,'r')).toBe(true);});
 it('被将必须应将，不能忽略对方车将军',()=>{const b=kings();b[1][0]={side:'b',kind:'R'};b[0][0]={side:'r',kind:'R'};b[1][4]={side:'b',kind:'R'};expect(isChecked(b,'r')).toBe(true);expect(legal(b,0,0,0,1)).toBe(false);});
 it('困毙判负，缺王无合法走法',()=>{const b=kings();b[1][3]={side:'b',kind:'R'};b[1][5]={side:'b',kind:'R'};expect(isChecked(b,'r')).toBe(false);expect(hasLegal(b,'r')).toBe(false);b[0][4]=null;expect(hasLegal(b,'r')).toBe(false);});
 it('当前红黑提示合法，不改原盘，解将提示明确',()=>{for(const side of ['r','b'] as const){const b=initialBoard(),snap=JSON.stringify(b),h=hintMove(b,side)!;expect(h).not.toBeNull();expect(b[h.from.r][h.from.c]?.side).toBe(side);expect(legal(b,h.from.r,h.from.c,h.to.r,h.to.c)).toBe(true);expect(JSON.stringify(b)).toBe(snap);}const b=kings();b[1][4]={side:'b',kind:'R'};expect(hintMove(b,'r')?.reason).toMatch(/解除将军/);});
});
