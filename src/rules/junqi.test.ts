import { describe, expect, it } from 'vitest';
import { canMarch, fight, type Piece } from './junqi';

function p(kind: Piece['kind'], side: Piece['side'] = 'r'): Piece {
  return { id: kind + side, side, kind, faceUp: true };
}

describe('军棋翻棋吃子规则', () => {
  it('军阶大吃小，同级同归于尽', () => {
    expect(fight(p('司令'), p('军长'))).toBe('win');
    expect(fight(p('排长'), p('司令'))).toBe('lose');
    expect(fight(p('连长'), p('连长'))).toBe('tie');
    expect(fight(p('工兵'), p('排长'))).toBe('lose');
  });

  it('炸弹与任何棋同归于尽', () => {
    expect(fight(p('炸弹'), p('司令'))).toBe('tie');
    expect(fight(p('军长'), p('炸弹'))).toBe('tie');
    expect(fight(p('炸弹'), p('地雷'))).toBe('tie');
    expect(fight(p('炸弹'), p('军旗'))).toBe('tie');
  });

  it('只有工兵能排雷，其他非炸弹撞雷失败', () => {
    expect(fight(p('工兵'), p('地雷'))).toBe('win');
    expect(fight(p('司令'), p('地雷'))).toBe('lose');
    expect(fight(p('排长'), p('地雷'))).toBe('lose');
  });

  it('非炸弹攻击军旗成功', () => {
    expect(fight(p('工兵'), p('军旗'))).toBe('win');
    expect(fight(p('司令'), p('军旗'))).toBe('win');
  });

  it('地雷与军旗不能移动', () => {
    expect(canMarch('地雷')).toBe(false);
    expect(canMarch('军旗')).toBe(false);
    expect(canMarch('工兵')).toBe(true);
    expect(canMarch('炸弹')).toBe(true);
  });
});
