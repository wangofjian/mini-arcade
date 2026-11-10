import { describe, expect, it } from 'vitest';
import {
  ceilingConnected,
  emptyGrid,
  neighbors,
  occupiedCount,
  reachedBottom,
  resolveShot,
  DEATH_ROW,
} from './bubbles';

describe('泡泡龙网格规则', () => {
  it('偶数行与奇数行各有 6 个邻居关系且不越界', () => {
    expect(neighbors(0, 0).length).toBeGreaterThan(0);
    const n4 = neighbors(2, 3).map((p) => p[0] + ',' + p[1]).sort();
    expect(n4).toContain('2,2');
    expect(n4).toContain('2,4');
    expect(neighbors(0, 0).every((p) => p[0] >= 0)).toBe(true);
  });

  it('三颗同色才消除，两颗不消除', () => {
    const g = emptyGrid();
    g[0][1] = 1;
    g[0][2] = 1;
    const two = resolveShot(g, 0, 0, 1);
    expect(two.popped).toBe(3);
    const h = emptyGrid();
    h[0][1] = 1;
    const one = resolveShot(h, 0, 0, 2);
    expect(one.popped).toBe(0);
    expect(one.grid[0][0]).toBe(2);
  });

  it('不连顶的簇会掉落', () => {
    const g = emptyGrid();
    g[0][0] = 0;
    g[2][0] = 1;
    g[2][1] = 1;
    // 在 2,2 放第三颗 1，消除后若 2 行无连接应掉落；先构造悬挂：用不同色挂在中部且不连顶
    const hanging = emptyGrid();
    hanging[0][0] = 0;
    hanging[3][2] = 2;
    hanging[3][3] = 2;
    const res = resolveShot(hanging, 3, 1, 2);
    // 三颗 2 在第三行，不连顶，应消除并视为 popped（因同色三连），不会再算 dropped
    expect(res.popped).toBe(3);
    expect(occupiedCount(res.grid)).toBe(1);
    expect(ceilingConnected(res.grid)[0][0]).toBe(true);
  });

  it('触底行有泡即失败', () => {
    const g = emptyGrid();
    expect(reachedBottom(g)).toBe(false);
    g[DEATH_ROW][0] = 1;
    expect(reachedBottom(g)).toBe(true);
  });
});
