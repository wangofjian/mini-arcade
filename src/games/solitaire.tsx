import {
  Page,
  Section,
  Text,
  Button,
  Segmented,
  useState,
  useEffect,
  useCallback,
  useMemo,
  useRef,
  useGrokTheme,
  type CSSProperties,
  type MouseEvent
} from '../compat/grok-canvas';
import { useElementWidth } from '../mobile/useElementWidth';
import { packedCellWidth } from '../mobile/scale';

type Suit = "S" | "H" | "D" | "C";
type Rank = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12 | 13;
type DrawMode = "1" | "3";

type Card = {
  id: string;
  suit: Suit;
  rank: Rank;
  faceUp: boolean;
};

type Sel =
  | { kind: "waste" }
  | { kind: "foundation"; index: number }
  | { kind: "tableau"; pile: number; index: number };
type Selection = Sel | null;

const SUITS: Suit[] = ["S", "H", "D", "C"];
const SUIT_SYM: Record<Suit, string> = {
  S: "♠",
  H: "♥",
  D: "♦",
  C: "♣",
};
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

function isRed(suit: Suit): boolean {
  return suit === "H" || suit === "D";
}

function canStackTableau(upper: Card, lower: Card): boolean {
  return upper.rank === lower.rank - 1 && isRed(upper.suit) !== isRed(lower.suit);
}

function canStackFoundation(card: Card, pile: Card[]): boolean {
  if (pile.length === 0) return card.rank === 1;
  const top = pile[pile.length - 1];
  return card.suit === top.suit && card.rank === top.rank + 1;
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
      deck.push({
        id: suit + rank,
        suit,
        rank,
        faceUp: false,
      });
    }
  }
  return shuffle(deck);
}

type Deal = {
  stock: Card[];
  waste: Card[];
  foundations: Card[][];
  tableau: Card[][];
};

function dealNew(): Deal {
  const deck = makeDeck();
  const tableau: Card[][] = [[], [], [], [], [], [], []];
  let i = 0;
  for (let col = 0; col < 7; col++) {
    for (let n = 0; n <= col; n++) {
      const card = deck[i++];
      tableau[col].push({
        ...card,
        faceUp: n === col,
      });
    }
  }
  const stock = deck.slice(i).map((c: Card) => ({ ...c, faceUp: false }));
  return {
    stock,
    waste: [],
    foundations: [[], [], [], []],
    tableau,
  };
}

function cloneDeal(d: Deal): Deal {
  return {
    stock: d.stock.map((c: Card) => ({ ...c })),
    waste: d.waste.map((c: Card) => ({ ...c })),
    foundations: d.foundations.map((p: Card[]) => p.map((c: Card) => ({ ...c }))),
    tableau: d.tableau.map((p: Card[]) => p.map((c: Card) => ({ ...c }))),
  };
}

function flipTop(pile: Card[]): void {
  if (pile.length === 0) return;
  const top = pile[pile.length - 1];
  if (!top.faceUp) pile[pile.length - 1] = { ...top, faceUp: true };
}

function isWon(foundations: Card[][]): boolean {
  return foundations.every((p: Card[]) => p.length === 13);
}

function formatTime(sec: number): string {
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return String(m).padStart(2, "0") + ":" + String(s).padStart(2, "0");
}

function CardFace(props: {
  card: Card;
  selected?: boolean;
  compact?: boolean;
  offsetY?: number;
  onClick?: () => void;
  onDoubleClick?: () => void;
  theme: ReturnType<typeof useGrokTheme>;
  width?: number;
  height?: number;
}) {
  const {
    card,
    selected,
    compact,
    offsetY,
    onClick,
    onDoubleClick,
    theme,
    width = 72,
    height = 100,
  } = props;
  const red = isRed(card.suit);
  const faceColor = red ? theme.text.danger : theme.text.primary;
  const backColor = theme.dataviz.categorical[0];
  const style: CSSProperties = {
    width,
    height: compact ? Math.min(height, 36) : height,
    borderRadius: 8,
    border: selected
      ? "2px solid " + theme.text.accent
      : "1px solid " + theme.border.default,
    background: card.faceUp ? theme.bg.elevated : backColor,
    color: card.faceUp ? faceColor : theme.text.onColor,
    boxShadow: selected
      ? "0 0 0 2px " + theme.fill.accentSubtle
      : "0 1px 2px rgba(0,0,0,0.12)",
    display: "flex",
    flexDirection: "column",
    justifyContent: "space-between",
    padding: compact ? "2px 4px" : "6px 7px",
    cursor: "pointer",
    userSelect: "none",
    touchAction: "manipulation",
    position: offsetY !== undefined ? "absolute" : "relative",
    top: offsetY,
    left: 0,
    fontFamily: theme.font.family,
    fontSize: compact ? 12 : 14,
    fontWeight: theme.weight.semibold,
    lineHeight: 1.1,
    boxSizing: "border-box",
    zIndex: offsetY !== undefined ? 1 : undefined,
  };

  if (!card.faceUp) {
    return (
      <div
        role="button"
        aria-label="牌背"
        style={{
          ...style,
          alignItems: "center",
          justifyContent: "center",
          background:
            "repeating-linear-gradient(45deg, " +
            backColor +
            " 0 6px, " +
            theme.dataviz.categorical[2] +
            " 6px 12px)",
          color: theme.text.onColor,
        }}
        onClick={onClick}
      >
        <span style={{ opacity: 0.85, fontSize: 18 }}>🂠</span>
      </div>
    );
  }

  return (
    <div
      role="button"
      aria-label={RANK_LABEL[card.rank] + SUIT_SYM[card.suit]}
      style={style}
      onClick={onClick}
      onDoubleClick={onDoubleClick}
    >
      <div style={{ display: "flex", justifyContent: "space-between", width: "100%" }}>
        <span>{RANK_LABEL[card.rank]}</span>
        <span>{SUIT_SYM[card.suit]}</span>
      </div>
      {!compact ? (
        <div
          style={{
            flex: 1,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: 28,
          }}
        >
          {SUIT_SYM[card.suit]}
        </div>
      ) : null}
      {!compact ? (
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
      ) : null}
    </div>
  );
}

function EmptySlot(props: {
  label: string;
  selected?: boolean;
  onClick?: () => void;
  theme: ReturnType<typeof useGrokTheme>;
  width?: number;
  height?: number;
}) {
  const { label, selected, onClick, theme, width = 72, height = 100 } = props;
  return (
    <div
      role="button"
      aria-label={label}
      onClick={onClick}
      style={{
        width,
        height,
        borderRadius: 8,
        border: selected
          ? "2px solid " + theme.text.accent
          : "2px dashed " + theme.border.default,
        background: theme.bg.subtle,
        color: theme.text.tertiary,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontSize: 12,
        cursor: "pointer",
        touchAction: "manipulation",
        boxSizing: "border-box",
        fontFamily: theme.font.family,
      }}
    >
      {label}
    </div>
  );
}

export default function App() {
  const boardRef = useRef<HTMLDivElement>(null);
  const boardWidth = useElementWidth(boardRef, 320);
  const theme = useGrokTheme();
  const [deal, setDeal] = useState<Deal>(() => dealNew());
  const [drawMode, setDrawMode] = useState<DrawMode>("1");
  const [selection, setSelection] = useState<Selection>(null);
  const [moves, setMoves] = useState(0);
  const [seconds, setSeconds] = useState(0);
  const [running, setRunning] = useState(false);
  const [message, setMessage] = useState("点击牌堆发牌，或点选牌再点目标位置移动");
  const [won, setWon] = useState(false);
  const lastClickRef = useRef<{ key: string; t: number }>({ key: "", t: 0 });

  useEffect(() => {
    if (!running || won) return;
    const id = setInterval(() => setSeconds((s: number) => s + 1), 1000);
    return () => clearInterval(id);
  }, [running, won]);

  const startClock = useCallback(() => {
    if (!running && !won) setRunning(true);
  }, [running, won]);

  const restart = useCallback(() => {
    setDeal(dealNew());
    setSelection(null);
    setMoves(0);
    setSeconds(0);
    setRunning(false);
    setWon(false);
    setMessage("新牌局已发好 · 祝你好运");
  }, []);

  const bump = useCallback((next: Deal, msg: string) => {
    setDeal(next);
    setMoves((m: number) => m + 1);
    setSelection(null);
    setMessage(msg);
    startClock();
    if (isWon(next.foundations)) {
      setWon(true);
      setRunning(false);
      setMessage("恭喜通关！四色花色全部收齐到 K");
    }
  }, [startClock]);

  const selectedCards = useMemo((): Card[] => {
    if (!selection) return [];
    if (selection.kind === "waste") {
      return deal.waste.length ? [deal.waste[deal.waste.length - 1]] : [];
    }
    if (selection.kind === "foundation") {
      const pile = deal.foundations[selection.index];
      return pile.length ? [pile[pile.length - 1]] : [];
    }
    const pile = deal.tableau[selection.pile];
    return pile.slice(selection.index);
  }, [selection, deal]);

  const tryMoveToFoundation = useCallback(
    (cards: Card[], from: Sel, destIndex: number): boolean => {
      if (cards.length !== 1) return false;
      const card = cards[0];
      const next = cloneDeal(deal);
      if (!canStackFoundation(card, next.foundations[destIndex])) return false;

      if (from.kind === "waste") {
        next.waste.pop();
      } else if (from.kind === "foundation") {
        if (from.index === destIndex) return false;
        next.foundations[from.index].pop();
      } else if (from.kind === "tableau") {
        next.tableau[from.pile].splice(from.index);
        flipTop(next.tableau[from.pile]);
      }
      next.foundations[destIndex].push({ ...card, faceUp: true });
      bump(next, "移入收牌区 · " + RANK_LABEL[card.rank] + SUIT_SYM[card.suit]);
      return true;
    },
    [deal, bump],
  );

  const tryMoveToTableau = useCallback(
    (cards: Card[], from: Sel, destPile: number): boolean => {
      if (cards.length === 0) return false;
      const next = cloneDeal(deal);
      const dest = next.tableau[destPile];
      const lead = cards[0];

      if (dest.length === 0) {
        if (lead.rank !== 13) return false;
      } else {
        const top = dest[dest.length - 1];
        if (!top.faceUp || !canStackTableau(lead, top)) return false;
      }

      if (from.kind === "waste") {
        next.waste.pop();
      } else if (from.kind === "foundation") {
        next.foundations[from.index].pop();
      } else if (from.kind === "tableau") {
        if (from.pile === destPile) return false;
        next.tableau[from.pile].splice(from.index);
        flipTop(next.tableau[from.pile]);
      }

      for (const c of cards) dest.push({ ...c, faceUp: true });
      bump(
        next,
        cards.length > 1
          ? "移动 " + cards.length + " 张到第 " + (destPile + 1) + " 列"
          : "移到第 " + (destPile + 1) + " 列",
      );
      return true;
    },
    [deal, bump],
  );

  const autoToFoundation = useCallback(
    (card: Card, from: Sel): boolean => {
      for (let i = 0; i < 4; i++) {
        if (tryMoveToFoundation([card], from, i)) return true;
      }
      return false;
    },
    [tryMoveToFoundation],
  );

  const drawFromStock = useCallback(() => {
    if (won) return;
    const next = cloneDeal(deal);
    if (next.stock.length === 0) {
      if (next.waste.length === 0) {
        setMessage("牌堆与废牌区都空了");
        return;
      }
      next.stock = next.waste
        .slice()
        .reverse()
        .map((c: Card) => ({ ...c, faceUp: false }));
      next.waste = [];
      bump(next, "废牌重新翻回牌堆（不限次数）");
      return;
    }
    const n = drawMode === "3" ? Math.min(3, next.stock.length) : 1;
    for (let i = 0; i < n; i++) {
      const c = next.stock.pop();
      if (!c) break;
      next.waste.push({ ...c, faceUp: true });
    }
    bump(next, drawMode === "3" ? "翻出最多三张" : "翻出一张");
  }, [deal, drawMode, won, bump]);

  const clearSelection = useCallback(() => setSelection(null), []);

  const onStockClick = useCallback(() => {
    clearSelection();
    drawFromStock();
  }, [clearSelection, drawFromStock]);

  const selectOrMove = useCallback(
    (target: Sel, key: string) => {
      if (won) return;
      const now = Date.now();
      const dbl =
        lastClickRef.current.key === key && now - lastClickRef.current.t < 380;
      lastClickRef.current = { key, t: now };

      if (dbl) {
        let cards: Card[] = [];
        if (target.kind === "waste" && deal.waste.length) {
          cards = [deal.waste[deal.waste.length - 1]];
        } else if (target.kind === "tableau") {
          const pile = deal.tableau[target.pile];
          if (target.index === pile.length - 1 && pile[target.index]?.faceUp) {
            cards = [pile[target.index]];
          }
        } else if (target.kind === "foundation") {
          const pile = deal.foundations[target.index];
          if (pile.length) cards = [pile[pile.length - 1]];
        }
        if (cards.length === 1 && autoToFoundation(cards[0], target)) return;
      }

      if (!selection) {
        if (target.kind === "waste") {
          if (deal.waste.length === 0) return;
          setSelection({ kind: "waste" });
          setMessage("已选废牌顶牌 · 再点目标列或收牌区");
          return;
        }
        if (target.kind === "foundation") {
          const pile = deal.foundations[target.index];
          if (pile.length === 0) return;
          setSelection({ kind: "foundation", index: target.index });
          setMessage("已选收牌区顶牌 · 可移回牌列");
          return;
        }
        if (target.kind === "tableau") {
          const pile = deal.tableau[target.pile];
          if (pile.length === 0) {
            setMessage("空列只能放 K 或 K 开头的顺子");
            return;
          }
          const card = pile[target.index];
          if (!card.faceUp) {
            setMessage("背面牌不可选");
            return;
          }
          // ensure contiguous face-up run from index to end
          for (let i = target.index; i < pile.length - 1; i++) {
            if (!canStackTableau(pile[i + 1], pile[i])) {
              setMessage("只能移动连续的明牌顺子");
              return;
            }
          }
          setSelection({
            kind: "tableau",
            pile: target.pile,
            index: target.index,
          });
          const n = pile.length - target.index;
          setMessage(
            n > 1
              ? "已选 " + n + " 张 · 再点目标列或收牌区"
              : "已选 " +
                RANK_LABEL[card.rank] +
                SUIT_SYM[card.suit] +
                " · 再点目标",
          );
          return;
        }
        return;
      }

      // have selection — try move to target
      const cards = selectedCards;
      if (cards.length === 0) {
        clearSelection();
        return;
      }

      // clicking same selection cancels
      if (
        selection.kind === target.kind &&
        ((selection.kind === "waste" && target.kind === "waste") ||
          (selection.kind === "foundation" &&
            target.kind === "foundation" &&
            selection.index === target.index) ||
          (selection.kind === "tableau" &&
            target.kind === "tableau" &&
            selection.pile === target.pile &&
            selection.index === target.index))
      ) {
        clearSelection();
        setMessage("已取消选择");
        return;
      }

      if (target.kind === "foundation") {
        if (tryMoveToFoundation(cards, selection, target.index)) return;
        setMessage("无法放入该收牌区（需同花色且点数 +1）");
        return;
      }
      if (target.kind === "tableau") {
        if (tryMoveToTableau(cards, selection, target.pile)) return;
        setMessage("无法放到该列（需异色递减，空列仅 K）");
        return;
      }
      if (target.kind === "waste") {
        clearSelection();
        setMessage("不能移回废牌区");
      }
    },
    [
      won,
      deal,
      selection,
      selectedCards,
      autoToFoundation,
      tryMoveToFoundation,
      tryMoveToTableau,
      clearSelection,
    ],
  );

  const hintAuto = useCallback(() => {
    if (won) return;
    // waste top to foundation
    if (deal.waste.length) {
      const c = deal.waste[deal.waste.length - 1];
      if (autoToFoundation(c, { kind: "waste" })) return;
    }
    // tableau tops to foundation
    for (let p = 0; p < 7; p++) {
      const pile = deal.tableau[p];
      if (!pile.length) continue;
      const top = pile[pile.length - 1];
      if (!top.faceUp) continue;
      if (
        autoToFoundation(top, {
          kind: "tableau",
          pile: p,
          index: pile.length - 1,
        })
      )
        return;
    }
    setMessage("暂无明显可进收牌区的牌 · 试试翻牌或调整牌列");
  }, [won, deal, autoToFoundation]);

  const isSelected = useCallback(
    (sel: Sel): boolean => {
      if (!selection) return false;
      if (selection.kind !== sel.kind) return false;
      if (selection.kind === "waste") return true;
      if (selection.kind === "foundation" && sel.kind === "foundation") {
        return selection.index === sel.index;
      }
      if (selection.kind === "tableau" && sel.kind === "tableau") {
        return (
          selection.pile === sel.pile && selection.index === sel.index
        );
      }
      return false;
    },
    [selection],
  );

  const cardInSelection = useCallback(
    (pile: number, index: number): boolean => {
      if (!selection || selection.kind !== "tableau") return false;
      return selection.pile === pile && index >= selection.index;
    },
    [selection],
  );

  const boardStyle: CSSProperties = {
    display: "flex",
    flexDirection: "column",
    gap: 16,
    color: theme.text.primary,
    fontFamily: theme.font.family,
  };

  const rowStyle: CSSProperties = {
    display: "flex",
    flexWrap: "wrap",
    gap: 10,
    alignItems: "flex-start",
  };

  const statsStyle: CSSProperties = {
    display: "flex",
    flexWrap: "wrap",
    gap: 14,
    alignItems: "center",
    color: theme.text.secondary,
    fontSize: 14,
  };

  const CARD_W = packedCellWidth(boardWidth, 7, 8, 72, 36);
  const CARD_H = Math.round((CARD_W * 100) / 72);
  const STEP = Math.max(14, Math.round((CARD_W * 28) / 72));

  return (
    <Page
      title="纸牌接龙"
      summary="经典 Klondike 纸牌接龙：七列牌桌、牌堆与废牌、四色收牌区。支持单张/三张翻牌、点选移动、双击或提示自动收牌。"
      width="wide"
      lang="zh-Hans"
    >
      <Section>
        <Text>
          牌列异色递减叠放，空列放 K；收牌区同花色从 A 收到 K。点击牌堆翻牌，点选牌后再点目标完成移动；双击顶牌或点「提示收牌」可自动送入收牌区。
        </Text>
      </Section>

      <Section>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 12, alignItems: "center" }}>
          <Segmented
            value={drawMode}
            options={[
              { value: "1", label: "单张" },
              { value: "3", label: "三张" },
            ]}
            onChange={(v: string) => {
              setDrawMode(v === "3" ? "3" : "1");
              setMessage(v === "3" ? "已切换为三张翻牌" : "已切换为单张翻牌");
            }}
          />
          <Button label="提示收牌" onClick={hintAuto} />
          <Button label="重新开始" variant="primary" onClick={restart} />
          <Button label="新牌局" onClick={restart} />
        </div>
      </Section>

      <Section>
        <div style={statsStyle}>
          <span>牌堆剩余 {deal.stock.length}</span>
          <span>步数 {moves}</span>
          <span>用时 {formatTime(seconds)}</span>
          <span aria-live="polite" style={{ color: won ? theme.text.success : theme.text.primary }}>
            {message}
          </span>
        </div>
      </Section>

      <Section>
        <div ref={boardRef} style={boardStyle}>
          {/* Top: stock, waste, foundations */}
          <div style={rowStyle}>
            <div style={{ display: "flex", gap: 10 }}>
              {deal.stock.length > 0 ? (
                <div onClick={onStockClick} style={{ position: "relative" }}>
                  <CardFace
                    card={{ id: "stock", suit: "S", rank: 1, faceUp: false }}
                    theme={theme}
                    width={CARD_W}
                    height={CARD_H}
                    onClick={onStockClick}
                  />
                </div>
              ) : (
                <EmptySlot
                  label={deal.waste.length ? "回收" : "空"}
                  theme={theme}
                  onClick={onStockClick}
                  width={CARD_W}
                  height={CARD_H}
                />
              )}

              {deal.waste.length === 0 ? (
                <EmptySlot
                  label="废牌"
                  theme={theme}
                  selected={isSelected({ kind: "waste" })}
                  onClick={() => selectOrMove({ kind: "waste" }, "waste")}
                  width={CARD_W}
                  height={CARD_H}
                />
              ) : (
                <div style={{ position: "relative", width: CARD_W + Math.min(2, deal.waste.length - 1) * 18, height: CARD_H }}>
                  {deal.waste
                    .slice(-3)
                    .map((card: Card, i: number, arr: Card[]) => {
                      const isTop = i === arr.length - 1;
                      return (
                        <div
                          key={card.id + "-w-" + i}
                          style={{
                            position: "absolute",
                            left: i * 18,
                            top: 0,
                            zIndex: i + 1,
                          }}
                        >
                          <CardFace
                            card={card}
                            theme={theme}
                            selected={isTop && isSelected({ kind: "waste" })}
                            width={CARD_W}
                            height={CARD_H}
                            onClick={
                              isTop
                                ? () => selectOrMove({ kind: "waste" }, "waste")
                                : undefined
                            }
                            onDoubleClick={
                              isTop
                                ? () => selectOrMove({ kind: "waste" }, "waste")
                                : undefined
                            }
                          />
                        </div>
                      );
                    })}
                </div>
              )}
            </div>

            <div style={{ flex: 1, minWidth: 12 }} />

            <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
              {deal.foundations.map((pile: Card[], fi: number) => {
                const top = pile.length ? pile[pile.length - 1] : null;
                const sel = isSelected({ kind: "foundation", index: fi });
                if (!top) {
                  return (
                    <EmptySlot
                      key={"f" + fi}
                      label={SUIT_SYM[SUITS[fi]]}
                      theme={theme}
                      selected={sel}
                      width={CARD_W}
                      height={CARD_H}
                      onClick={() =>
                        selectOrMove(
                          { kind: "foundation", index: fi },
                          "f" + fi,
                        )
                      }
                    />
                  );
                }
                return (
                  <CardFace
                    key={"f" + fi + top.id}
                    card={top}
                    theme={theme}
                    selected={sel}
                    width={CARD_W}
                    height={CARD_H}
                    onClick={() =>
                      selectOrMove(
                        { kind: "foundation", index: fi },
                        "f" + fi,
                      )
                    }
                    onDoubleClick={() =>
                      selectOrMove(
                        { kind: "foundation", index: fi },
                        "f" + fi,
                      )
                    }
                  />
                );
              })}
            </div>
          </div>

          {/* Tableau */}
          <div
            style={{
              display: "flex",
              flexWrap: "nowrap",
              gap: 8,
              alignItems: "flex-start",
              justifyContent: "space-between",
              width: "100%",
              minWidth: 0,
            }}
          >
            {deal.tableau.map((pile: Card[], pi: number) => {
              const height =
                pile.length === 0
                  ? CARD_H
                  : CARD_H + Math.max(0, pile.length - 1) * STEP;
              return (
                <div
                  key={"t" + pi}
                  style={{
                    position: "relative",
                    width: CARD_W,
                    minHeight: height,
                    flex: "0 0 auto",
                    maxWidth: CARD_W,
                  }}
                  onClick={(e: MouseEvent<HTMLDivElement>) => {
                    if (e.target === e.currentTarget) {
                      selectOrMove(
                        { kind: "tableau", pile: pi, index: Math.max(0, pile.length - 1) },
                        "t" + pi + "-empty",
                      );
                    }
                  }}
                >
                  {pile.length === 0 ? (
                    <EmptySlot
                      label="K"
                      theme={theme}
                      width={CARD_W}
                      height={CARD_H}
                      onClick={() =>
                        selectOrMove(
                          { kind: "tableau", pile: pi, index: 0 },
                          "t" + pi + "-e",
                        )
                      }
                    />
                  ) : (
                    pile.map((card: Card, ci: number) => {
                      const isTop = ci === pile.length - 1;
                      const compact = !isTop;
                      return (
                        <CardFace
                          key={card.id}
                          card={card}
                          theme={theme}
                          compact={compact && card.faceUp}
                          offsetY={ci * STEP}
                          selected={cardInSelection(pi, ci)}
                          width={CARD_W}
                          height={CARD_H}
                          onClick={
                            card.faceUp
                              ? () =>
                                  selectOrMove(
                                    {
                                      kind: "tableau",
                                      pile: pi,
                                      index: ci,
                                    },
                                    "t" + pi + "-" + ci,
                                  )
                              : undefined
                          }
                          onDoubleClick={
                            isTop && card.faceUp
                              ? () =>
                                  selectOrMove(
                                    {
                                      kind: "tableau",
                                      pile: pi,
                                      index: ci,
                                    },
                                    "t" + pi + "-" + ci,
                                  )
                              : undefined
                          }
                        />
                      );
                    })
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </Section>

      <Section heading="规则摘要">
        <Text>
          标准 52 张牌。七列分别发 1～7 张，每列最上一张翻开。牌堆可按「单张」或「三张」翻到废牌区；废牌用尽可无限次回收到牌堆。收齐四色花色至 K 即获胜。
        </Text>
      </Section>
    </Page>
  );
}
