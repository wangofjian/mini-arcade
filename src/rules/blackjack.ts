/** 从原版二十一点页面抽出的纯规则，供单元测试使用。 */
export type Suit = "S" | "H" | "D" | "C";
export type Rank = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12 | 13;
type Phase = "bet" | "player" | "settle";

export type Card = {
  id: string;
  suit: Suit;
  rank: Rank;
};

const SUITS: Suit[] = ["S", "H", "D", "C"];
const SUIT_SYM: Record<Suit, string> = { S: "♠", H: "♥", D: "♦", C: "♣" };
const RANK_LABEL: Record<Rank, string> = {
  1: "A",
  2: "2",
  3: "3",
  4: "4",
  5: "5",
  6: "6",
  7: "7",
  8: "8",
  9: "9",
  10: "10",
  11: "J",
  12: "Q",
  13: "K",
};
const START_BANK = 1000;
const BETS = [10, 25, 50, 100, 200];

function isRed(suit: Suit): boolean {
  return suit === "H" || suit === "D";
}

function shuffle<T>(arr: T[]): T[] {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    const t = a[i];
    a[i] = a[j];
    a[j] = t;
  }
  return a;
}

function makeDeck(): Card[] {
  const deck: Card[] = [];
  for (const suit of SUITS) {
    for (let r = 1; r <= 13; r++) {
      const rank = r as Rank;
      deck.push({ id: suit + String(rank) + "-" + Math.random().toString(36).slice(2, 6), suit, rank });
    }
  }
  return shuffle(deck);
}

function handValue(cards: Card[]): { total: number; soft: boolean } {
  let total = 0;
  let aces = 0;
  for (const c of cards) {
    if (c.rank === 1) {
      aces += 1;
      total += 11;
    } else if (c.rank >= 10) {
      total += 10;
    } else {
      total += c.rank;
    }
  }
  while (total > 21 && aces > 0) {
    total -= 10;
    aces -= 1;
  }
  return { total, soft: aces > 0 };
}

function isNatural(cards: Card[]): boolean {
  return cards.length === 2 && handValue(cards).total === 21;
}
function dealerPlay(deck: Card[], dealer: Card[]): { deck: Card[]; dealer: Card[] } {
  const d = deck.slice();
  const hand = dealer.slice();
  while (handValue(hand).total < 17 && d.length > 0) {
    const c = d.pop();
    if (c) hand.push(c);
  }
  return { deck: d, dealer: hand };
}
export { handValue, isNatural, dealerPlay };

