import { describe, expect, it } from 'vitest';
import { dealerPlay, handValue, isNatural, type Card } from './blackjack';

function c(rank: Card['rank'], suit: Card['suit'] = 'S'): Card {
  return { id: suit + String(rank), suit, rank };
}

describe('二十一点规则', () => {
  it('A 在不爆牌时算 11，爆牌时改算 1', () => {
    expect(handValue([c(1), c(9)]).total).toBe(20);
    expect(handValue([c(1), c(9)]).soft).toBe(true);
    expect(handValue([c(1), c(9), c(5)]).total).toBe(15);
    expect(handValue([c(1), c(9), c(5)]).soft).toBe(false);
    expect(handValue([c(1), c(1), c(9)]).total).toBe(21);
  });

  it('J/Q/K 均算 10 点', () => {
    expect(handValue([c(11), c(12)]).total).toBe(20);
    expect(handValue([c(13), c(10)]).total).toBe(20);
  });

  it('仅首两张合计 21 为天然二十一', () => {
    expect(isNatural([c(1), c(10)])).toBe(true);
    expect(isNatural([c(1), c(13)])).toBe(true);
    expect(isNatural([c(1), c(5), c(5)])).toBe(false);
    expect(handValue([c(1), c(5), c(5)]).total).toBe(21);
  });

  it('庄家在软硬 17 一律停牌，16 继续要牌', () => {
    const deck: Card[] = [c(10), c(5)];
    const stand = dealerPlay(deck, [c(10), c(7)]);
    expect(stand.dealer.length).toBe(2);
    expect(handValue(stand.dealer).total).toBe(17);

    const soft = dealerPlay([c(9)], [c(1), c(6)]);
    expect(handValue(soft.dealer).total).toBe(17);
    expect(soft.dealer.length).toBe(2);

    const hit = dealerPlay([c(5)], [c(10), c(6)]);
    expect(hit.dealer.length).toBe(3);
    expect(handValue(hit.dealer).total).toBe(21);
  });
});
