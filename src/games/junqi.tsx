import {
  Page,
  Section,
  Text,
  Button,
  useState,
  useCallback,
  useMemo,
  useGrokTheme,
  type CSSProperties,
  useRef
} from '../compat/grok-canvas';
import { ImmersiveFrame } from '../mobile/ImmersiveFrame';
import { useImmersivePlay } from '../mobile/immersivePlay';
import { useStageFit } from '../mobile/useStageFit';

type Side = 'r' | 'b';
type Kind =
  | '司令'
  | '军长'
  | '师长'
  | '旅长'
  | '团长'
  | '营长'
  | '连长'
  | '排长'
  | '工兵'
  | '炸弹'
  | '地雷'
  | '军旗';

type Piece = { id: string; side: Side; kind: Kind; faceUp: boolean };
type Cell = Piece | null;
type Board = Cell[][];
type Sq = { r: number; c: number };

const N = 6;
const SHORT: Record<Kind, string> = {
  '司令': '司',
  '军长': '军',
  '师长': '师',
  '旅长': '旅',
  '团长': '团',
  '营长': '营',
  '连长': '连',
  '排长': '排',
  '工兵': '工',
  '炸弹': '炸',
  '地雷': '雷',
  '军旗': '旗',
};
const RANK: Record<Kind, number> = {
  '司令': 9,
  '军长': 8,
  '师长': 7,
  '旅长': 6,
  '团长': 5,
  '营长': 4,
  '连长': 3,
  '排长': 2,
  '工兵': 1,
  '炸弹': -1,
  '地雷': -2,
  '军旗': 0,
};
const BAG: Kind[] = [
  '司令',
  '军长',
  '师长',
  '旅长',
  '团长',
  '营长',
  '连长',
  '连长',
  '排长',
  '排长',
  '工兵',
  '工兵',
  '炸弹',
  '炸弹',
  '地雷',
  '地雷',
  '军旗',
];

function canMarch(kind: Kind): boolean {
  return kind !== '地雷' && kind !== '军旗';
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

function newBoard(): Board {
  const red: Piece[] = BAG.map((kind: Kind, i: number) => ({
    id: 'r' + i,
    side: 'r' as Side,
    kind,
    faceUp: false,
  }));
  const black: Piece[] = BAG.map((kind: Kind, i: number) => ({
    id: 'b' + i,
    side: 'b' as Side,
    kind,
    faceUp: false,
  }));
  const all = shuffle(red.concat(black));
  const b: Board = [];
  let k = 0;
  for (let r = 0; r < N; r++) {
    const row: Cell[] = [];
    for (let c = 0; c < N; c++) row.push(all[k++]);
    b.push(row);
  }
  return b;
}

function cloneBoard(b: Board): Board {
  return b.map((row: Cell[]) => row.map((p: Cell) => (p ? { ...p } : null)));
}

function inBounds(r: number, c: number): boolean {
  return r >= 0 && r < N && c >= 0 && c < N;
}

function neighbors(r: number, c: number): Sq[] {
  const d: [number, number][] = [[1, 0], [-1, 0], [0, 1], [0, -1]];
  const out: Sq[] = [];
  for (const step of d) {
    const nr = r + step[0];
    const nc = c + step[1];
    if (inBounds(nr, nc)) out.push({ r: nr, c: nc });
  }
  return out;
}

function fight(att: Piece, def: Piece): 'win' | 'lose' | 'tie' {
  if (att.kind === '炸弹' || def.kind === '炸弹') return 'tie';
  if (def.kind === '军旗') return 'win';
  if (def.kind === '地雷') return att.kind === '工兵' ? 'win' : 'lose';
  const ar = RANK[att.kind];
  const dr = RANK[def.kind];
  if (ar > dr) return 'win';
  if (ar < dr) return 'lose';
  return 'tie';
}

function hasFlag(b: Board, side: Side): boolean {
  for (let r = 0; r < N; r++) {
    for (let c = 0; c < N; c++) {
      const p = b[r][c];
      if (p && p.side === side && p.kind === '军旗') return true;
    }
  }
  return false;
}

function revealFlag(b: Board, side: Side): boolean {
  let found = false;
  for (let r = 0; r < N; r++) {
    for (let c = 0; c < N; c++) {
      const p = b[r][c];
      if (p && p.side === side && p.kind === '军旗' && !p.faceUp) {
        b[r][c] = { ...p, faceUp: true };
        found = true;
      }
    }
  }
  return found;
}

function commanderGone(before: Board, after: Board, side: Side): boolean {
  const had = before.some((row: Cell[]) => row.some((p: Cell) => p && p.side === side && p.kind === '司令'));
  const has = after.some((row: Cell[]) => row.some((p: Cell) => p && p.side === side && p.kind === '司令'));
  return had && !has;
}

function hiddenLeft(b: Board): boolean {
  return b.some((row: Cell[]) => row.some((p: Cell) => p && !p.faceUp));
}

function legalDests(b: Board, r: number, c: number, side: Side): Sq[] {
  const p = b[r][c];
  if (!p || !p.faceUp || p.side !== side || !canMarch(p.kind)) return [];
  const out: Sq[] = [];
  for (const n of neighbors(r, c)) {
    const t = b[n.r][n.c];
    if (!t) out.push(n);
    else if (t.faceUp && t.side !== side) out.push(n);
  }
  return out;
}

function hasAction(b: Board, side: Side): boolean {
  if (hiddenLeft(b)) return true;
  for (let r = 0; r < N; r++) {
    for (let c = 0; c < N; c++) {
      if (legalDests(b, r, c, side).length > 0) return true;
    }
  }
  return false;
}

function keyOf(r: number, c: number): string {
  return r + ',' + c;
}

export default function App() {
 const stageRef=useRef<HTMLDivElement|null>(null);
 const {active:immersive}=useImmersivePlay();
 const fit=useStageFit(stageRef,5,12,immersive,true);

  const theme = useGrokTheme();
  const [board, setBoard] = useState<Board>(() => newBoard());
  const [turn, setTurn] = useState<0 | 1>(0);
  const [owner, setOwner] = useState<(Side | null)[]>([null, null]);
  const [sel, setSel] = useState<Sq | null>(null);
  const [winner, setWinner] = useState<0 | 1 | null>(null);
  const [message, setMessage] = useState('先手翻开一张暗棋，翻到的颜色就归先手。');

  const mySide = owner[turn];
  const dests = useMemo(() => {
    if (!sel || mySide === null) return [] as Sq[];
    return legalDests(board, sel.r, sel.c, mySide);
  }, [sel, mySide, board]);
  const destSet = useMemo(() => {
    const s = new Set<string>();
    for (const d of dests) s.add(keyOf(d.r, d.c));
    return s;
  }, [dests]);

  const restart = useCallback(() => {
    setBoard(newBoard());
    setTurn(0);
    setOwner([null, null]);
    setSel(null);
    setWinner(null);
    setMessage('新一局：先手先翻棋，翻到何色就执何色。');
  }, []);

  const finishIfNeeded = useCallback(
    (next: Board, mover: 0 | 1, note: string) => {
      const sides = owner[0] && owner[1] ? owner : null;
      const opp: 0 | 1 = mover === 0 ? 1 : 0;
      if (sides && sides[0] && sides[1]) {
        if (!hasFlag(next, sides[opp] as Side)) {
          setBoard(next);
          setWinner(mover);
          setSel(null);
          setMessage(note + ' 吃掉了对方军旗，' + (mover === 0 ? '先手' : '后手') + '获胜！');
          return true;
        }
      }
      const nextPlayer: 0 | 1 = opp;
      const nextSide = (sides ? sides[nextPlayer] : owner[nextPlayer]);
      if (nextSide && !hasAction(next, nextSide)) {
        setBoard(next);
        setWinner(mover);
        setSel(null);
        setMessage(note + ' 对方无法翻棋也无法移动，' + (mover === 0 ? '先手' : '后手') + '获胜！');
        return true;
      }
      setBoard(next);
      setTurn(nextPlayer);
      setSel(null);
      setMessage(note + ' 轮到' + (nextPlayer === 0 ? '先手' : '后手') + '。');
      return false;
    },
    [owner],
  );

  const flipAt = useCallback(
    (r: number, c: number) => {
      if (winner !== null) return;
      const p = board[r][c];
      if (!p || p.faceUp) return;
      const next = cloneBoard(board);
      next[r][c] = { ...p, faceUp: true };
      let sides = owner.slice() as (Side | null)[];
      let note = '翻开 ' + (p.side === 'r' ? '红' : '蓝') + ' 方 ' + p.kind;
      if (sides[0] === null) {
        sides = [p.side, p.side === 'r' ? 'b' : 'r'];
        setOwner(sides);
        note += '，先手执' + (p.side === 'r' ? '红' : '蓝') + '方，后手执' + (p.side === 'r' ? '蓝' : '红') + '方';
      }
      finishIfNeeded(next, turn, note);
    },
    [winner, board, owner, turn, finishIfNeeded],
  );

  const moveTo = useCallback(
    (from: Sq, to: Sq) => {
      if (winner !== null || mySide === null) return;
      const att = board[from.r][from.c];
      if (!att || att.side !== mySide || !att.faceUp) return;
      const legal = legalDests(board, from.r, from.c, mySide).some((d: Sq) => d.r === to.r && d.c === to.c);
      if (!legal) return;
      const next = cloneBoard(board);
      const def = next[to.r][to.c];
      let note = '';
      if (!def) {
        next[to.r][to.c] = att;
        next[from.r][from.c] = null;
        note = att.kind + '移动';
      } else {
        const res = fight(att, def);
        next[from.r][from.c] = null;
        if (res === 'win') {
          next[to.r][to.c] = att;
          note = att.kind + ' 吃掉 ' + def.kind;
        } else if (res === 'lose') {
          note = att.kind + ' 攻击 ' + def.kind + '失败';
        } else {
          next[to.r][to.c] = null;
          note = att.kind + '与' + def.kind + '同归于尽';
        }
        if (commanderGone(board, next, 'r')) {
          if (revealFlag(next, 'r')) note += '；红方司令被吃，军旗已公开';
        }
        if (commanderGone(board, next, 'b')) {
          if (revealFlag(next, 'b')) note += '；蓝方司令被吃，军旗已公开';
        }
      }
      finishIfNeeded(next, turn, note);
    },
    [winner, mySide, board, turn, finishIfNeeded],
  );

  const onCell = useCallback(
    (r: number, c: number) => {
      if (winner !== null) return;
      const p = board[r][c];
      if (sel && destSet.has(keyOf(r, c))) {
        moveTo(sel, { r, c });
        return;
      }
      if (p && !p.faceUp) {
        setSel(null);
        flipAt(r, c);
        return;
      }
      if (p && p.faceUp && mySide && p.side === mySide && canMarch(p.kind)) {
        if (sel && sel.r === r && sel.c === c) setSel(null);
        else setSel({ r, c });
        return;
      }
      setSel(null);
    },
    [winner, board, sel, destSet, moveTo, flipAt, mySide],
  );

  const colorOf = (side: Side) => (side === 'r' ? theme.dataviz.categorical[0] : theme.dataviz.categorical[4] || theme.dataviz.categorical[2]);
  const cellPx = 58;
  const gap = 6;
  const boardW = N * cellPx + (N + 1) * gap;

  const wrap: CSSProperties = {
    display: 'flex',
    flexWrap: 'wrap',
    gap: 10,
    alignItems: 'center',
    fontFamily: theme.font.family,
    color: theme.text.primary,
  };

  return (
    <Page
      title="军棋"
      summary="双人暗棋翻棋军棋：6×6 洗牌、等级吃子、工兵排雷、炸弹同归、吃掉军旗获胜。规则已在页内公开。"
      width="wide"
      lang="zh-Hans"
    >
      <ImmersiveFrame
        layout="banded"
        stageRef={stageRef}
        intro={<Text>手机可点「全屏游玩」：棋盘铺满屏幕，点选翻棋与走子。不强加方向键。</Text>}
      >

      <Section>
        <Text>
          这是常见的双人翻棋暗棋玩法，不是带铁路大本营的完整陆战棋。先手翻开的颜色归先手，之后双方轮流：翻一张暗棋，或移动/攻击已翻开的已方棋。吃掉对方军旗即胜。
        </Text>
      </Section>
      <Section>
        <div style={wrap}>
          <Button label="重新开始" variant="primary" onClick={restart} />
          <span>
            先手{owner[0] ? '（' + (owner[0] === 'r' ? '红' : '蓝') + '方）' : '（颜色待定）'}
          </span>
          <span>
            后手{owner[1] ? '（' + (owner[1] === 'r' ? '红' : '蓝') + '方）' : '（颜色待定）'}
          </span>
          <span>{winner === null ? (turn === 0 ? '轮到先手' : '轮到后手') : winner === 0 ? '先手胜' : '后手胜'}</span>
        </div>
        <div aria-live="polite" style={{ marginTop: 8, color: theme.text.primary, fontFamily: theme.font.family }}>
          {message}
        </div>
      </Section>
      <Section>
        <div
          style={{
            width: '100%',
            maxWidth: boardW,
            margin: '0 auto',
            display: 'grid',
            gridTemplateColumns: 'repeat(6, 1fr)',
            gap,
            padding: gap,
            background: theme.bg.subtle,
            border: '1px solid ' + theme.border.default,
            borderRadius: 12,
            boxSizing: 'border-box',
            touchAction: 'manipulation',
          }}
        >
          {board.map((row: Cell[], r: number) =>
            row.map((p: Cell, c: number) => {
              const can = destSet.has(keyOf(r, c));
              const selected = sel && sel.r === r && sel.c === c;
              const bg = !p
                ? theme.bg.base
                : !p.faceUp
                  ? theme.dataviz.categorical[3]
                  : theme.bg.elevated;
              return (
                <button
                  key={keyOf(r, c)}
                  type="button"
                  onClick={() => onCell(r, c)}
                  aria-label={!p ? '空格' : p.faceUp ? (p.side === 'r' ? '红' : '蓝') + p.kind : '暗棋'}
                  disabled={winner !== null}
                  style={{
                    aspectRatio: '1',
                    borderRadius: 8,
                    border: selected
                      ? '3px solid ' + theme.text.accent
                      : can
                        ? '3px solid ' + theme.text.warning
                        : '1px solid ' + theme.border.default,
                    background: bg,
                    color: p && p.faceUp ? colorOf(p.side) : theme.text.onColor,
                    fontFamily: theme.font.family,
                    fontWeight: 700,
                    fontSize: 18,
                    cursor: winner !== null ? 'default' : 'pointer',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    lineHeight: 1.1,
                  }}
                >
                  {p && p.faceUp ? (
                    <>
                      <span>{SHORT[p.kind]}</span>
                      <span style={{ fontSize: 11, fontWeight: 500, opacity: 0.85 }}>{p.kind}</span>
                    </>
                  ) : p ? (
                    <span style={{ fontSize: 16, opacity: 0.9 }}>暗</span>
                  ) : (
                    can ? <span style={{ fontSize: 12, color: theme.text.accent }}>落点</span> : null
                  )}
                </button>
              );
            }),
          )}
        </div>
      </Section>
      <div className="imm-help"><Section heading="本页公开的翻棋规则">
        <Text>
          棋盘为 6×6，红蓝各 18 枚全部覆置洗乱：司令、军长、师长、旅长、团长、营长各 1，连长、排长、工兵、炸弹、地雷各 2，军旗 1。先手翻开的第一枚决定自己的颜色，另一色归后手。每回合只能选一项：翻开任意一张暗棋；或将己方明棋沿横纵邻格移到空位；或攻击横纵相邻且已翻开的敌棋。不能对暗棋盲打，也不能斜走。地雷与军旗不能移动。吃子：司令＞军长＞师长＞旅长＞团长＞营长＞连长＞排长＞工兵，大吃小；同级双亡。炸弹与任何棋（含地雷、军旗）同归于尽。只有工兵能排掉地雷，其他非炸弹棋子撞雷则自己阵亡、地雷留存。攻击军旗成功（含炸弹与军旗同归，因军旗离盘）即获胜。司令被吃掉后，若该方军旗仍是暗棋则立刻翻开公开。若一方行棋时既无暗棋可翻也无法移动或攻击，则判负。
        </Text>
      </Section></div>
    
      </ImmersiveFrame>
    </Page>
  );
}
