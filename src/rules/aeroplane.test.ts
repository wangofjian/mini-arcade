import { describe, expect, it } from 'vitest';
import { applyMove, destination, homeDest, legalIds, maybeJump, newPieces, START, type Piece } from './aeroplane';

describe('飞行棋简化规则', () => {
  it('非 6 点不能起飞，6 点放到起飞格', () => {
    const hangar = { at: 'hangar' as const };
    expect(destination(hangar, 0, 5)).toBeNull();
    expect(destination(hangar, 0, 6)).toEqual({ at: 'track', i: START[0] });
  });

  it('终点必须正好到达，超出则回退', () => {
    expect(homeDest(4, 1)).toEqual({ at: 'done' });
    expect(homeDest(4, 3)).toEqual({ at: 'home', step: 3 });
    expect(homeDest(0, 5)).toEqual({ at: 'done' });
    expect(homeDest(0, 6)).toEqual({ at: 'home', step: 4 });
  });

  it('从最后一格航线掷恰到终点的步数可完成', () => {
    // 红棋在距终点入口前：dist=50 的航线格
    const last = { at: 'track' as const, i: (START[0] + 50) % 52 };
    expect(destination(last, 0, 6)).toEqual({ at: 'done' });
    expect(destination(last, 0, 1)).toEqual({ at: 'home', step: 0 });
  });

  it('同色短跳 +4，但不越过入终点', () => {
    const mid = { at: 'track' as const, i: START[0] + 4 };
    expect(maybeJump(mid, 0)).toEqual({ at: 'track', i: START[0] + 8 });
    const late = { at: 'track' as const, i: START[0] + 48 };
    expect(maybeJump(late, 0)).toEqual(late);
  });

  it('撞到对方则将其打回停机坪，己方不伤害', () => {
    let pieces = newPieces();
    const red = pieces.find((p: Piece) => p.color === 0)!;
    const yellow = pieces.find((p: Piece) => p.color === 1)!;
    pieces = pieces.map((p: Piece) =>
      p.id === red.id ? { ...p, pos: { at: 'track', i: START[0] } } : p,
    );
    pieces = pieces.map((p: Piece) =>
      p.id === yellow.id ? { ...p, pos: { at: 'track', i: START[0] + 1 } } : p,
    );
    // 红从起飞格走 1 到黄所在格
    const moved = applyMove(pieces, red.id, 1)!;
    const y = moved.find((p: Piece) => p.id === yellow.id)!;
    const r = moved.find((p: Piece) => p.id === red.id)!;
    expect(r.pos).toEqual({ at: 'track', i: START[0] + 1 });
    expect(y.pos).toEqual({ at: 'hangar' });
  });

  it('开局掷 5 无合法棋，掷 6 有起飞', () => {
    const pieces = newPieces();
    expect(legalIds(pieces, 0, 5)).toEqual([]);
    expect(legalIds(pieces, 0, 6).length).toBe(4);
  });
});
