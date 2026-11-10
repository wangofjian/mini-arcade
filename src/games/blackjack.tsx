import {
  Page,
  Section,
  Text,
  Button,
  useState,
  useCallback,
  useGrokTheme,
  type CSSProperties
} from '../compat/grok-canvas';

type Suit = "S" | "H" | "D" | "C";
type Rank = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12 | 13;
type Phase = "bet" | "player" | "settle";

type Card = {
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

function cardLabel(card: Card): string {
  return RANK_LABEL[card.rank] + SUIT_SYM[card.suit];
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

function CardFace(props: {
  card: Card | null;
  hidden?: boolean;
  theme: ReturnType<typeof useGrokTheme>;
}) {
  const { card, hidden, theme } = props;
  const width = 72;
  const height = 100;
  const base: CSSProperties = {
    width,
    height,
    borderRadius: 8,
    boxSizing: "border-box",
    userSelect: "none",
    fontFamily: theme.font.family,
    fontWeight: theme.weight.semibold,
    display: "flex",
    flexDirection: "column",
    justifyContent: "space-between",
    padding: "6px 7px",
    lineHeight: 1.1,
  };
  if (!card || hidden) {
    return (
      <div
        aria-label={hidden ? "庄家暗牌" : "空"}
        style={{
          ...base,
          border: "1px solid " + theme.border.default,
          alignItems: "center",
          justifyContent: "center",
          background:
            "repeating-linear-gradient(45deg, " +
            theme.dataviz.categorical[0] +
            " 0 6px, " +
            theme.dataviz.categorical[2] +
            " 6px 12px)",
          color: theme.text.onColor,
        }}
      >
        <span style={{ fontSize: 18 }}>🂠</span>
      </div>
    );
  }
  const red = isRed(card.suit);
  return (
    <div
      aria-label={cardLabel(card)}
      style={{
        ...base,
        border: "1px solid " + theme.border.default,
        background: theme.bg.elevated,
        color: red ? theme.text.danger : theme.text.primary,
        boxShadow: "0 1px 2px rgba(0,0,0,0.12)",
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", width: "100%" }}>
        <span>{RANK_LABEL[card.rank]}</span>
        <span>{SUIT_SYM[card.suit]}</span>
      </div>
      <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 28 }}>
        {SUIT_SYM[card.suit]}
      </div>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          width: "100%",
          transform: "rotate(180deg)",
        }}
      >
        <span>{RANK_LABEL[card.rank]}</span>
        <span>{SUIT_SYM[card.suit]}</span>
      </div>
    </div>
  );
}

export default function App() {
  const theme = useGrokTheme();
  const [bank, setBank] = useState(START_BANK);
  const [bet, setBet] = useState(50);
  const [phase, setPhase] = useState<Phase>("bet");
  const [deck, setDeck] = useState<Card[]>(() => makeDeck());
  const [player, setPlayer] = useState<Card[]>([]);
  const [dealer, setDealer] = useState<Card[]>([]);
  const [hideHole, setHideHole] = useState(true);
  const [message, setMessage] = useState("虚拟筹码娱乐，无真钱。选好注额后发牌。");
  const [wins, setWins] = useState(0);
  const [losses, setLosses] = useState(0);
  const [pushes, setPushes] = useState(0);
  const [doubled, setDoubled] = useState(false);
  const [lastDelta, setLastDelta] = useState(0);

  const playerVal = handValue(player);
  const dealerVal = handValue(dealer);
  const canAct = phase === "player";
  const canDouble =
    canAct && player.length === 2 && !doubled && bank >= bet && !isNatural(player);
  const broke = bank < 10 && phase === "bet";

  const restart = useCallback(() => {
    setBank(START_BANK);
    setBet(50);
    setPhase("bet");
    setDeck(makeDeck());
    setPlayer([]);
    setDealer([]);
    setHideHole(true);
    setMessage("已重置筹码至 " + START_BANK + "，选注量后发牌。");
    setWins(0);
    setLosses(0);
    setPushes(0);
    setDoubled(false);
    setLastDelta(0);
  }, []);

  const settle = useCallback(
    (
      nextBank: number,
      nextWins: number,
      nextLosses: number,
      nextPushes: number,
      delta: number,
      msg: string,
      nextPlayer: Card[],
      nextDealer: Card[],
      nextDeck: Card[],
    ) => {
      setBank(nextBank);
      setWins(nextWins);
      setLosses(nextLosses);
      setPushes(nextPushes);
      setLastDelta(delta);
      setPlayer(nextPlayer);
      setDealer(nextDealer);
      setDeck(nextDeck);
      setHideHole(false);
      setPhase("settle");
      setMessage(msg);
    },
    [],
  );

  const finishVsDealer = useCallback(
    (pHand: Card[], startDealer: Card[], startDeck: Card[], stake: number, currentBank: number) => {
      const played = dealerPlay(startDeck, startDealer);
      const p = handValue(pHand).total;
      const d = handValue(played.dealer).total;
      let delta = 0;
      let msg = "";
      let w = wins;
      let l = losses;
      let u = pushes;
      if (p > 21) {
        delta = -stake;
        l += 1;
        msg = "你爆牌（" + p + "点），输 " + stake;
      } else if (d > 21) {
        delta = stake;
        w += 1;
        msg = "庄家爆牌（" + d + "点），赢 " + stake;
      } else if (p > d) {
        delta = stake;
        w += 1;
        msg = "你 " + p + " 点胜庄家 " + d + " 点，赢 " + stake;
      } else if (p < d) {
        delta = -stake;
        l += 1;
        msg = "你 " + p + " 点输给庄家 " + d + " 点，输 " + stake;
      } else {
        delta = 0;
        u += 1;
        msg = "平局，双方都是 " + p + " 点，退还注码";
      }
      settle(currentBank + delta, w, l, u, delta, msg, pHand, played.dealer, played.deck);
    },
    [wins, losses, pushes, settle],
  );

  const deal = useCallback(() => {
    if (phase !== "bet" || broke) return;
    const stake = Math.min(bet, bank);
    if (stake < 10) {
      setMessage("筹码不足 10，请重新开始。");
      return;
    }
    setBet(stake);
    const fresh = makeDeck();
    const p = [fresh.pop() as Card, fresh.pop() as Card];
    const d = [fresh.pop() as Card, fresh.pop() as Card];
    setDoubled(false);
    setLastDelta(0);
    const pBJ = isNatural(p);
    const dBJ = isNatural(d);
    if (pBJ || dBJ) {
      if (pBJ && dBJ) {
        settle(bank, wins, losses, pushes + 1, 0, "双方都是天然二十一，平局退码", p, d, fresh);
        return;
      }
      if (pBJ) {
        const delta = Math.floor(stake * 3 / 2);
        settle(bank + delta, wins + 1, losses, pushes, delta, "天然二十一！赔付 3:2，赢 " + delta, p, d, fresh);
        return;
      }
      settle(bank - stake, wins, losses + 1, pushes, -stake, "庄家天然二十一，输 " + stake, p, d, fresh);
      return;
    }
    setDeck(fresh);
    setPlayer(p);
    setDealer(d);
    setHideHole(true);
    setPhase("player");
    setMessage("你是 " + handValue(p).total + " 点，可要牌、停牌" + (bank >= stake ? "或加倍" : "") + "。");
  }, [phase, broke, bet, bank, wins, losses, pushes, settle]);

  const hit = useCallback(() => {
    if (!canAct) return;
    const d = deck.slice();
    const c = d.pop();
    if (!c) return;
    const next = player.concat([c]);
    const v = handValue(next).total;
    if (v > 21) {
      settle(bank - bet, wins, losses + 1, pushes, -bet, "要牌后 " + v + " 点，爆牌输 " + bet, next, dealer, d);
      return;
    }
    setDeck(d);
    setPlayer(next);
    if (v === 21) {
      finishVsDealer(next, dealer, d, bet, bank);
      return;
    }
    setMessage("要牌得 " + cardLabel(c) + "，现在 " + v + " 点");
  }, [canAct, deck, player, dealer, bank, bet, wins, losses, pushes, settle, finishVsDealer]);

  const stand = useCallback(() => {
    if (!canAct) return;
    finishVsDealer(player, dealer, deck, bet, bank);
  }, [canAct, player, dealer, deck, bet, bank, finishVsDealer]);

  const doubleDown = useCallback(() => {
    if (!canDouble) return;
    const stake = bet * 2;
    const d = deck.slice();
    const c = d.pop();
    if (!c) return;
    const next = player.concat([c]);
    setDoubled(true);
    setBet(stake);
    const v = handValue(next).total;
    if (v > 21) {
      settle(bank - stake, wins, losses + 1, pushes, -stake, "加倍后 " + v + " 点爆牌，输 " + stake, next, dealer, d);
      return;
    }
    finishVsDealer(next, dealer, d, stake, bank);
  }, [canDouble, bet, deck, player, dealer, bank, wins, losses, pushes, settle, finishVsDealer]);

  const nextRound = useCallback(() => {
    if (phase !== "settle") return;
    setPlayer([]);
    setDealer([]);
    setHideHole(true);
    setDoubled(false);
    setPhase("bet");
    if (bank < 10) {
      setMessage("筹码不足 10，本局结束。可点「重新开始」恢复 " + START_BANK + " 筹码。");
    } else {
      const nextBet = Math.min(bet, bank);
      setBet(nextBet);
      setMessage("选注量并发下一局。当前筹码 " + bank);
    }
  }, [phase, bank, bet]);

  const changeBet = useCallback(
    (n: number) => {
      if (phase !== "bet" || broke) return;
      setBet(Math.max(10, Math.min(bank, n)));
    },
    [phase, broke, bank],
  );

  const handRow: CSSProperties = {
    display: "flex",
    flexWrap: "wrap",
    gap: 8,
    minHeight: 100,
    alignItems: "flex-start",
  };
  const stats: CSSProperties = {
    display: "flex",
    flexWrap: "wrap",
    gap: 14,
    alignItems: "center",
    color: theme.text.secondary,
    fontSize: 14,
    fontFamily: theme.font.family,
  };

  const shownDealer = hideHole ? dealer.slice(0, 1) : dealer;
  const dealerText = hideHole
    ? shownDealer.length
      ? handValue(shownDealer).total + " + ?"
      : "—"
    : String(dealerVal.total) + (dealerVal.soft ? "（软）" : "");

  return (
    <Page
      title="二十一点"
      summary="虚拟筹码二十一点：52 张一副、A 可算 1 或 11、要牌/停牌/加倍，庄家 17 点停牌，天然 21 按 3:2 赔付。无真钱。"
      width="wide"
      lang="zh-Hans"
    >
      <Section>
        <Text>
          这是休闲记分小游戏，筹码仅用于记分，不涉及真实金钱或下注。每局用一副 52 张洗好的新牌。点数最接近 21 且不爆牌者赢；天然二十一（首两张恰好 21）赔付 3:2。
        </Text>
      </Section>

      <Section>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 10, alignItems: "center" }}>
          {phase === "bet" ? (
            <Button label="发牌" variant="primary" onClick={deal} disabled={broke} />
          ) : null}
          {phase === "player" ? (
            <>
              <Button label="要牌" variant="primary" onClick={hit} />
              <Button label="停牌" onClick={stand} />
              <Button label="加倍" onClick={doubleDown} disabled={!canDouble} />
            </>
          ) : null}
          {phase === "settle" ? (
            <Button label={broke || bank < 10 ? "筹码不足" : "下一局"} variant="primary" onClick={nextRound} disabled={bank < 10} />
          ) : null}
          <Button label="重新开始" onClick={restart} />
        </div>
      </Section>

      <Section>
        <div style={stats}>
          <span style={{ color: theme.text.primary, fontWeight: theme.weight.semibold }}>筹码 {bank}</span>
          <span>注额 {phase === "bet" ? bet : bet}</span>
          {lastDelta !== 0 ? (
            <span style={{ color: lastDelta > 0 ? theme.text.success : theme.text.danger }}>
              {"本局 " + (lastDelta > 0 ? "+" : "") + lastDelta}
            </span>
          ) : null}
          <span>胜 {wins}</span>
          <span>负 {losses}</span>
          <span>平 {pushes}</span>
        </div>
        <div aria-live="polite" style={{ marginTop: 8, color: theme.text.primary, fontFamily: theme.font.family }}>
          {message}
        </div>
      </Section>

      {phase === "bet" ? (
        <Section heading="选注额">
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8, alignItems: "center" }}>
            {BETS.map((n: number) => (
              <Button
                key={n}
                label={String(n)}
                onClick={() => changeBet(n)}
                disabled={broke || n > bank}
                variant={bet === n ? "primary" : undefined}
              />
            ))}
            <Button label="全下" onClick={() => changeBet(bank)} disabled={broke} variant={bet === bank ? "primary" : undefined} />
          </div>
        </Section>
      ) : null}

      <Section heading={"庄家· " + (player.length || dealer.length ? dealerText + " 点" : "待发")}
      >
        <div style={handRow}>
          {dealer.length === 0 ? (
            <Text>尚未发牌</Text>
          ) : (
            dealer.map((c: Card, i: number) => (
              <CardFace key={c.id} card={c} hidden={hideHole && i === 1} theme={theme} />
            ))
          )}
        </div>
      </Section>

      <Section
        heading={
          "你· " +
          (player.length ? playerVal.total + (playerVal.soft ? " 点（软）" : " 点") : "待发")
        }
      >
        <div style={handRow}>
          {player.length === 0 ? (
            <Text>尚未发牌</Text>
          ) : (
            player.map((c: Card) => <CardFace key={c.id} card={c} theme={theme} />)
          )}
        </div>
      </Section>

      <Section heading="规则说明">
        <Text>
          每局独立洗一副 52 张牌。A 可算 11 点，若算 11 会爆牌则改算 1 点；J/Q/K 算 10 点。你可要牌、停牌；仅首两张且筹码足够时可加倍（注码翻倍后只再要一张即停）。庄家明一暗一，轮到庄家后按规抓牌，软 17 与硬 17 均停牌。首两张即为 21 为天然二十一，赔 3:2；双方都是则平局。普通胜局按 1:1 赔付。本版不含分牌与保险。筹码不足最低注额 10 时需重新开始。
        </Text>
      </Section>
    </Page>
  );
}
