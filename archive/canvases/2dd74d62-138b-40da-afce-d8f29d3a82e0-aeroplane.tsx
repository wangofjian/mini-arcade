import {
  Page,
  Section,
  Text,
  Button,
  useState,
  useEffect,
  useCallback,
  useMemo,
  useGrokTheme,
  type CSSProperties,
} from 'grok/canvas';

const PLAYERS = 4;
const PLANES = 4;
const TRACK_LEN = 52;
const SIDE = 13;
const HOME_END = 5;
const START = [0, 13, 26, 39];
const NAMES = ['红', '黄', '蓝', '绿'];
const CS = 28;
const X0 = 110;
const Y0 = 110;
const VBW = 600;
const VBH = 640;

type Pos =
  | { at: 'hangar' }
  | { at: 'track'; i: number }
  | { at: 'home'; step: number }
  | { at: 'done' };

type Piece = { id: string; color: number; slot: number; pos: Pos };

function trackPoints(): { x: number; y: number }[] {
  const raw: { x: number; y: number }[] = [];
  for (let i = 0; i < SIDE; i++) raw.push({ x: X0 + (SIDE - i) * CS, y: Y0 + SIDE * CS });
  for (let i = 0; i < SIDE; i++) raw.push({ x: X0, y: Y0 + (SIDE - i) * CS });
  for (let i = 0; i < SIDE; i++) raw.push({ x: X0 + i * CS, y: Y0 });
  for (let i = 0; i < SIDE; i++) raw.push({ x: X0 + SIDE * CS, y: Y0 + i * CS });
  const startLocal = 7;
  const pts: { x: number; y: number }[] = [];
  for (let i = 0; i < TRACK_LEN; i++) pts.push(raw[(startLocal + i) % TRACK_LEN]);
  return pts;
}

const TRACK = trackPoints();

function hangarPoint(color: number, slot: number): { x: number; y: number } {
  const corners = [
    { x: 36, y: Y0 + SIDE * CS + 36 },
    { x: X0 + SIDE * CS + 36, y: Y0 + SIDE * CS + 36 },
    { x: X0 + SIDE * CS + 36, y: 36 },
    { x: 36, y: 36 },
  ];
  const c = corners[color];
  const ox = (slot % 2) * 28 - 14;
  const oy = Math.floor(slot / 2) * 28 - 14;
  return { x: c.x + ox, y: c.y + oy };
}

function homePoint(color: number, step: number): { x: number; y: number } {
  const cx = X0 + (SIDE * CS) / 2;
  const cy = Y0 + (SIDE * CS) / 2;
  const entry = [
    TRACK[51],
    TRACK[(START[1] + 51) % TRACK_LEN],
    TRACK[(START[2] + 51) % TRACK_LEN],
    TRACK[(START[3] + 51) % TRACK_LEN],
  ][color];
  const t = (step + 1) / 6;
  return { x: entry.x + (cx - entry.x) * t, y: entry.y + (cy - entry.y) * t };
}

function donePoint(color: number, slot: number): { x: number; y: number } {
  const cx = X0 + (SIDE * CS) / 2;
  const cy = Y0 + (SIDE * CS) / 2;
  const a = (color * Math.PI) / 2 + slot * 0.4 - 0.6;
  return { x: cx + Math.cos(a) * 18, y: cy + Math.sin(a) * 18 };
}

function pieceXY(p: Piece): { x: number; y: number } {
  if (p.pos.at === 'hangar') return hangarPoint(p.color, p.slot);
  if (p.pos.at === 'track') return TRACK[p.pos.i];
  if (p.pos.at === 'home') return homePoint(p.color, p.pos.step);
  return donePoint(p.color, p.slot);
}

function maybeJump(pos: Pos, color: number): Pos {
  if (pos.at !== 'track') return pos;
  const start = START[color];
  const dist = (pos.i - start + TRACK_LEN) % TRACK_LEN;
  if (dist !== 0 && dist % 4 === 0 && dist + 4 <= 50) {
    return { at: 'track', i: (pos.i + 4) % TRACK_LEN };
  }
  return pos;
}

function homeDest(step: number, roll: number): Pos {
  const raw = step + roll;
  if (raw === HOME_END) return { at: 'done' };
  if (raw < HOME_END) return { at: 'home', step: raw };
  const back = HOME_END - (raw - HOME_END);
  if (back < 0) return { at: 'home', step: 0 };
  return { at: 'home', step: back };
}

function destination(pos: Pos, color: number, roll: number): Pos | null {
  if (pos.at === 'done') return null;
  if (pos.at === 'hangar') {
    return roll === 6 ? { at: 'track', i: START[color] } : null;
  }
  if (pos.at === 'track') {
    const start = START[color];
    const dist = (pos.i - start + TRACK_LEN) % TRACK_LEN;
    const next = dist + roll;
    if (next <= 50) return maybeJump({ at: 'track', i: (start + next) % TRACK_LEN }, color);
    return homeDest(0, next - 51);
  }
  return homeDest(pos.step, roll);
}

function applyMove(pieces: Piece[], id: string, roll: number): Piece[] | null {
  const src = pieces.find((p: Piece) => p.id === id);
  if (!src) return null;
  const dest = destination(src.pos, src.color, roll);
  if (!dest) return null;
  return pieces.map((p: Piece) => {
    if (p.id === src.id) return { ...p, pos: dest };
    if (
      dest.at === 'track' &&
      p.pos.at === 'track' &&
      p.pos.i === dest.i &&
      p.color !== src.color
    ) {
      return { ...p, pos: { at: 'hangar' } };
    }
    return p;
  });
}

function legalIds(pieces: Piece[], color: number, roll: number): string[] {
  return pieces
    .filter((p: Piece) => p.color === color && destination(p.pos, color, roll) !== null)
    .map((p: Piece) => p.id);
}

function allDone(pieces: Piece[], color: number): boolean {
  return pieces.filter((p: Piece) => p.color === color).every((p: Piece) => p.pos.at === 'done');
}

function progressOf(p: Piece): number {
  if (p.pos.at === 'hangar') return 0;
  if (p.pos.at === 'track') return 1 + ((p.pos.i - START[p.color] + TRACK_LEN) % TRACK_LEN);
  if (p.pos.at === 'home') return 52 + p.pos.step;
  return 80;
}

function chooseAi(pieces: Piece[], color: number, roll: number): string | null {
  const ids = legalIds(pieces, color, roll);
  if (ids.length === 0) return null;
  let best = ids[0];
  let bestScore = -9999;
  for (const id of ids) {
    const next = applyMove(pieces, id, roll);
    if (!next) continue;
    const me = next.find((p: Piece) => p.id === id) as Piece;
    let s = progressOf(me);
    if (me.pos.at === 'done') s += 50;
    const knocked = pieces.filter(
      (p: Piece) =>
        p.color !== color &&
        next.find((q: Piece) => q.id === p.id && q.pos.at === 'hangar' && p.pos.at !== 'hangar'),
    ).length;
    s += knocked * 30;
    if (roll === 6 && pieces.find((p: Piece) => p.id === id)?.pos.at === 'hangar') s += 15;
    if (s > bestScore) {
      bestScore = s;
      best = id;
    }
  }
  return best;
}

function newPieces(): Piece[] {
  const out: Piece[] = [];
  for (let c = 0; c < PLAYERS; c++) {
    for (let s = 0; s < PLANES; s++) {
      out.push({ id: c + '-' + s, color: c, slot: s, pos: { at: 'hangar' } });
    }
  }
  return out;
}

function rollDie(): number {
  return 1 + Math.floor(Math.random() * 6);
}

export default function App() {
  const theme = useGrokTheme();
  const colors = [
    theme.dataviz.categorical[0],
    theme.dataviz.categorical[1],
    theme.dataviz.categorical[2],
    theme.dataviz.categorical[3],
  ];
  const [pieces, setPieces] = useState<Piece[]>(() => newPieces());
  const [turn, setTurn] = useState(0);
  const [dice, setDice] = useState(0);
  const [phase, setPhase] = useState<'roll' | 'pick' | 'won'>('roll');
  const [winner, setWinner] = useState<number | null>(null);
  const [message, setMessage] = useState('你执红棋。点「掷骰子」开始，掷到 6 才能起飞。');
  const [extra, setExtra] = useState(false);

  const options = useMemo(() => (phase === 'pick' ? legalIds(pieces, turn, dice) : []), [phase, pieces, turn, dice]);

  const restart = useCallback(() => {
    setPieces(newPieces());
    setTurn(0);
    setDice(0);
    setPhase('roll');
    setWinner(null);
    setExtra(false);
    setMessage('新一局：你执红棋，点「掷骰子」。');
  }, []);

  const advanceTurn = useCallback(
    (from: number, gotSix: boolean, nextPieces: Piece[]) => {
      for (let c = 0; c < PLAYERS; c++) {
        if (allDone(nextPieces, c)) {
          setWinner(c);
          setPhase('won');
          setMessage((c === 0 ? '你（红方）' : NAMES[c] + '方电脑') + '率先把四架飞机送到终点，获胜！');
          return;
        }
      }
      if (gotSix) {
        setTurn(from);
        setDice(0);
        setPhase('roll');
        setExtra(true);
        setMessage((from === 0 ? '你' : NAMES[from] + '方') + '掷出 6，再掷一次。');
        return;
      }
      const nxt = (from + 1) % PLAYERS;
      setTurn(nxt);
      setDice(0);
      setPhase('roll');
      setExtra(false);
      setMessage(nxt === 0 ? '轮到你掷骰子。' : '轮到' + NAMES[nxt] + '方电脑。');
    },
    [],
  );

  const doMove = useCallback(
    (id: string, color: number, roll: number, current: Piece[]) => {
      const next = applyMove(current, id, roll);
      if (!next) {
        advanceTurn(color, roll === 6, current);
        return;
      }
      setPieces(next);
      const moved = next.find((p: Piece) => p.id === id) as Piece;
      const knocked = current.filter(
        (p: Piece) =>
          p.color !== color &&
          p.pos.at !== 'hangar' &&
          next.some((q: Piece) => q.id === p.id && q.pos.at === 'hangar'),
      ).length;
      let msg = (color === 0 ? '你' : NAMES[color] + '方') + '走了 ' + roll + ' 点';
      if (moved.pos.at === 'done') msg += '，到达终点';
      if (knocked) msg += '，撞回 ' + knocked + ' 架飞机';
      setMessage(msg + '。');
      advanceTurn(color, roll === 6, next);
    },
    [advanceTurn],
  );

  const onRoll = useCallback(() => {
    if (phase !== 'roll' || turn !== 0 || winner !== null) return;
    const r = rollDie();
    setDice(r);
    const ids = legalIds(pieces, 0, r);
    if (ids.length === 0) {
      setMessage('你掷出 ' + r + '，没有可走的棋，跳过。');
      advanceTurn(0, r === 6, pieces);
      return;
    }
    setPhase('pick');
    setMessage('你掷出 ' + r + '，请点击高亮的红飞机走动。');
  }, [phase, turn, winner, pieces, advanceTurn]);

  const onPick = useCallback(
    (id: string) => {
      if (phase !== 'pick' || turn !== 0) return;
      if (options.indexOf(id) < 0) return;
      doMove(id, 0, dice, pieces);
    },
    [phase, turn, options, doMove, dice, pieces],
  );

  useEffect(() => {
    if (winner !== null || phase !== 'roll' || turn === 0) return;
    const t1 = setTimeout(() => {
      const r = rollDie();
      setDice(r);
      const id = chooseAi(pieces, turn, r);
      if (!id) {
        setMessage(NAMES[turn] + '方掷出 ' + r + '，无法移动。');
        const t2 = setTimeout(() => advanceTurn(turn, r === 6, pieces), 500);
        return () => clearTimeout(t2);
      }
      const t3 = setTimeout(() => doMove(id, turn, r, pieces), 500);
      return () => clearTimeout(t3);
    }, 650);
    return () => clearTimeout(t1);
  }, [phase, turn, winner, pieces, advanceTurn, doMove]);

  const counts = (c: number) => {
    const mine = pieces.filter((p: Piece) => p.color === c);
    return {
      hangar: mine.filter((p: Piece) => p.pos.at === 'hangar').length,
      done: mine.filter((p: Piece) => p.pos.at === 'done').length,
    };
  };

  const statusStyle: CSSProperties = {
    display: 'flex',
    flexWrap: 'wrap',
    gap: 12,
    alignItems: 'center',
    fontFamily: theme.font.family,
    color: theme.text.primary,
  };

  return (
    <Page
      title="飞行棋"
      summary="简化四人飞行棋：掷 6 起飞，沿环形航线走格，可短跳、可撞回，先把四架飞机送到终点获胜。你执红，其余三色由电脑下。"
      width="wide"
      lang="zh-Hans"
    >
      <Section>
        <Text>
          本页采用明确的简化规则，不是完整竞赛规程。你执红棋，黄、蓝、绿由电脑轮流走。掷到 6 才能把停机坪上的飞机放到起飞格，并获得再掷一次；先将自己的四架飞机全部送入中心终点者获胜。
        </Text>
      </Section>
      <Section>
        <div style={statusStyle}>
          <Button label="掷骰子" variant="primary" onClick={onRoll} disabled={phase !== 'roll' || turn !== 0 || winner !== null} />
          <Button label="重新开始" onClick={restart} />
          <span style={{ fontSize: 28, fontWeight: 700, minWidth: 40 }}>{dice ? dice : '—'}</span>
          <span aria-live="polite">{message}</span>
        </div>
      </Section>
      <Section>
        <div style={statusStyle}>
          {NAMES.map((n: string, c: number) => {
            const ct = counts(c);
            return (
              <span key={n} style={{ color: colors[c], fontWeight: turn === c ? 700 : 400 }}>
                {n}
                {c === 0 ? '（你）' : '（电脑）'}
                {' '}终点 {ct.done}/4 · 待飞 {ct.hangar}
              </span>
            );
          })}
        </div>
      </Section>
      <Section>
        <svg
          viewBox={'0 0 ' + VBW + ' ' + VBH}
          width="100%"
          role="img"
          aria-label="飞行棋棋盘"
          style={{
            display: 'block',
            maxWidth: 560,
            margin: '0 auto',
            background: theme.bg.subtle,
            borderRadius: 12,
            border: '1px solid ' + theme.border.default,
            touchAction: 'manipulation',
          }}
        >
          <rect x={0} y={0} width={VBW} height={VBH} fill={theme.bg.subtle} rx={12} />
          {TRACK.map((p: { x: number; y: number }, i: number) => {
            const owner = START.indexOf(i);
            const jumpColor = START.find((s: number) => (i - s + TRACK_LEN) % 4 === 0 && (i - s + TRACK_LEN) % TRACK_LEN !== 0);
            const fill =
              owner >= 0 ? colors[owner] : jumpColor !== undefined ? colors[START.indexOf(jumpColor)] : theme.bg.elevated;
            return (
              <rect
                key={'t' + i}
                x={p.x - 11}
                y={p.y - 11}
                width={22}
                height={22}
                rx={4}
                fill={fill}
                opacity={owner >= 0 ? 0.95 : jumpColor !== undefined ? 0.4 : 1}
                stroke={theme.border.default}
              />
            );
          })}
          {[0, 1, 2, 3].map((c: number) =>
            [0, 1, 2, 3, 4].map((s: number) => {
              const p = homePoint(c, s);
              return (
                <circle
                  key={'h' + c + '-' + s}
                  cx={p.x}
                  cy={p.y}
                  r={9}
                  fill={colors[c]}
                  opacity={0.35}
                  stroke={theme.border.subtle}
                />
              );
            }),
          )}
          <circle
            cx={X0 + (SIDE * CS) / 2}
            cy={Y0 + (SIDE * CS) / 2}
            r={28}
            fill={theme.bg.elevated}
            stroke={theme.border.strong}
          />
          <text
            x={X0 + (SIDE * CS) / 2}
            y={Y0 + (SIDE * CS) / 2 + 5}
            textAnchor="middle"
            fontSize={12}
            fill={theme.text.secondary}
            fontFamily={theme.font.family}
          >
            终点
          </text>
          {[0, 1, 2, 3].map((c: number) => {
            const p = hangarPoint(c, 0);
            return (
              <rect
                key={'base' + c}
                x={p.x - 28}
                y={p.y - 28}
                width={56}
                height={56}
                rx={8}
                fill={colors[c]}
                opacity={0.18}
                stroke={colors[c]}
              />
            );
          })}
          {pieces.map((p: Piece) => {
            const xy = pieceXY(p);
            const can = options.indexOf(p.id) >= 0;
            return (
              <g key={p.id} onClick={() => onPick(p.id)} style={{ cursor: can ? 'pointer' : 'default' }}>
                <circle
                  cx={xy.x}
                  cy={xy.y}
                  r={can ? 12 : 10}
                  fill={colors[p.color]}
                  stroke={can ? theme.text.accent : theme.border.strong}
                  strokeWidth={can ? 3 : 1.5}
                />
                <polygon
                  points={xy.x + ',' + (xy.y - 6) + ' ' + (xy.x + 5) + ',' + (xy.y + 4) + ' ' + (xy.x - 5) + ',' + (xy.y + 4)}
                  fill={theme.text.onColor}
                  opacity={0.9}
                  style={{ pointerEvents: 'none' }}
                />
              </g>
            );
          })}
        </svg>
      </Section>
      <Section heading="本页采用的简化规则">
        <Text>
          四人各四架飞机。掷骰为 1 到 6 点：只有 6 点可将一架飞机从停机坪放到自己的起飞格（不额外再走 6 格）；若掷出 6 无论是否起飞都再掷一次，没有「连掷三个 6 回坪」的惩罚。棋子沿顺时针方向的 52 格航线前进，接近己方起飞格前转入 6 格终点跑道；到达终点必须点数正好，超出则从终点回退多出的格数。若走完后正好落在己方颜色的航线格（每隔 4 格），且前跳 4 格不会越过入终点处，则再跳 4 格一次，不连锁，也没有对角长途飞行。落到与对方同一航线格时，把对方该格全部飞机撞回停机坪；己方可叠在同一格，互不伤害。终点跑道仅己方可进入。电脑使用简单启发（优先到达、撞子、起飞）。
        </Text>
      </Section>
    </Page>
  );
}
