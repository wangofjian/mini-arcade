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

import { initialBoard, legalDests, applyMove, isChecked, hasLegal, hintMove, LABELS, ROWS, COLS, type Board, type Side, type Sq, type Hint } from '../rules/xiangqi';
function keyOf(r: number, c: number): string {
  return r + ',' + c;
}

export default function App() {
 const stageRef=useRef<HTMLDivElement|null>(null);
 const {active:immersive}=useImmersivePlay();
 const fit=useStageFit(stageRef,9,10,immersive,true);

  const theme = useGrokTheme();
  const [hint, setHint] = useState<Hint|null>(null);
  const [board, setBoard] = useState<Board>(() => initialBoard());
  const [turn, setTurn] = useState<Side>('r');
  const [sel, setSel] = useState<Sq | null>(null);
  const [last, setLast] = useState<{ from: Sq; to: Sq } | null>(null);
  const [ended, setEnded] = useState<'checkmate' | 'stalemate' | null>(null);
  const [message, setMessage] = useState('红方先行。点选己方棋子，再点高亮交叉点走子。');

  const dests = useMemo(() => (sel ? legalDests(board, sel.r, sel.c) : []), [board, sel]);
  const destSet = useMemo(() => {
    const s = new Set<string>();
    for (const d of dests) s.add(keyOf(d.r, d.c));
    return s;
  }, [dests]);

  const restart = useCallback(() => {
    setBoard(initialBoard());
    setHint(null);
    setTurn('r');
    setSel(null);
    setLast(null);
    setEnded(null);
    setMessage('新一局，红方先行。');
  }, []);

  const play = useCallback(
    (from: Sq, to: Sq) => {
      if (ended) return;
      const p = board[from.r][from.c];
      if (!p || p.side !== turn) return;
      const ok = legalDests(board, from.r, from.c).some((d: Sq) => d.r === to.r && d.c === to.c);
      if (!ok) return;
      const next = applyMove(board, from, to);
      const opp: Side = turn === 'r' ? 'b' : 'r';
      setBoard(next);
      setHint(null);
      setLast({ from, to });
      setSel(null);
      const check = isChecked(next, opp);
      const legal = hasLegal(next, opp);
      if (!legal) {
        setEnded(check ? 'checkmate' : 'stalemate');
        const win = turn === 'r' ? '红方' : '黑方';
        const lose = opp === 'r' ? '红方' : '黑方';
        setMessage(
          check
            ? '将死！' + win + '获胜（' + lose + '已被将死）。'
            : '困毙！' + lose + '无子可动，' + win + '获胜。',
        );
        return;
      }
      setTurn(opp);
      setMessage(check ? (opp === 'r' ? '红方' : '黑方') + '被将军，请应将。' : (opp === 'r' ? '轮到红方' : '轮到黑方'));
    },
    [board, turn, ended],
  );

  const onPoint = useCallback(
    (r: number, c: number) => {
      if (ended) return;
      const p = board[r][c];
      if (sel) {
        if (sel.r === r && sel.c === c) {
          setSel(null);
          return;
        }
        if (destSet.has(keyOf(r, c))) {
          play(sel, { r, c });
          return;
        }
        if (p && p.side === turn) {
          setSel({ r, c });
          return;
        }
        setSel(null);
        return;
      }
      if (p && p.side === turn) setSel({ r, c });
    },
    [ended, board, sel, destSet, turn, play],
  );

  const cell = 52;
  const pad = 36;
  const svgW = pad * 2 + (COLS - 1) * cell;
  const svgH = pad * 2 + (ROWS - 1) * cell;
  const px = (c: number) => pad + c * cell;
  const py = (r: number) => pad + (ROWS - 1 - r) * cell;
  const line = theme.border.strong;
  const redColor = theme.dataviz.categorical[0];
  const blackColor = theme.kind === 'dark' ? theme.text.primary : theme.text.primary;

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
      title="中国象棋"
      summary="标准 9×10 中国象棋，本地双人。车马炮兵相士帅均按规则走子，含蹩马腿、塞象眼、河界、九宫、将帅照面与将军/将死/困毙检查。"
      width="wide"
      lang="zh-Hans"
    >
      <ImmersiveFrame
        pageActions={<><Button label="提示一步" disabled={!!ended} onClick={() => setHint(hintMove(board,turn))} /><Button label="清除提示" onClick={() => setHint(null)} /></>}
        hudActions={<><Button label="提示一步" disabled={!!ended} onClick={() => setHint(hintMove(board,turn))} /><Button label="清除提示" onClick={() => setHint(null)} /></>}
        hudMsg={hint ? <span>{hint.reason}（不会自动走子）</span> : null}
        layout="banded"
        stageRef={stageRef}
        intro={<Text>手机可点「全屏游玩」：棋盘铺满屏幕，点选走子。不强加方向键。</Text>}
      >

      <Section>
        <Text>
          红黑轮流，红方先行。点选自己的棋子后，可走的交叉点会高亮，再点目标完成走子。不能走导致自己被将军或将帅照面的棋。本页为人人对战，不带人机。
        </Text>
      </Section>
      <Section>
        <div style={wrap}>
          <Button label="重新开始" variant="primary" onClick={restart} />
          <span>{turn === 'r' ? '红方走棋' : '黑方走棋'}</span>
          <span aria-live="polite" style={{ color: ended ? theme.text.success : theme.text.secondary }}>
            {message}
          </span>
        </div>
      </Section>
      <Section>
        <svg
          viewBox={'0 0 ' + svgW + ' ' + svgH}
          width="100%"
          role="img"
          aria-label="中国象棋棋盘"
          style={{
            display: 'block',
            maxWidth: 520,
            margin: '0 auto',
            background: theme.bg.subtle,
            borderRadius: 12,
            border: '1px solid ' + theme.border.default,
            touchAction: 'manipulation',
          }}
        >
          <rect x={0} y={0} width={svgW} height={svgH} fill={theme.bg.subtle} rx={12} />
          {Array.from({ length: ROWS }, (_: unknown, r: number) => (
            <line key={'h' + r} x1={px(0)} y1={py(r)} x2={px(COLS - 1)} y2={py(r)} stroke={line} strokeWidth={r === 0 || r === 9 ? 2 : 1} />
          ))}
          {Array.from({ length: COLS }, (_: unknown, c: number) =>
            c === 0 || c === 8 ? (
              <line key={'v' + c} x1={px(c)} y1={py(0)} x2={px(c)} y2={py(9)} stroke={line} strokeWidth={2} />
            ) : (
              <g key={'v' + c}>
                <line x1={px(c)} y1={py(0)} x2={px(c)} y2={py(4)} stroke={line} strokeWidth={1} />
                <line x1={px(c)} y1={py(5)} x2={px(c)} y2={py(9)} stroke={line} strokeWidth={1} />
              </g>
            ),
          )}
          <line x1={px(3)} y1={py(0)} x2={px(5)} y2={py(2)} stroke={line} />
          <line x1={px(5)} y1={py(0)} x2={px(3)} y2={py(2)} stroke={line} />
          <line x1={px(3)} y1={py(9)} x2={px(5)} y2={py(7)} stroke={line} />
          <line x1={px(5)} y1={py(9)} x2={px(3)} y2={py(7)} stroke={line} />
          <text
            x={(px(0) + px(8)) / 2}
            y={(py(4) + py(5)) / 2 + 5}
            textAnchor="middle"
            fill={theme.text.secondary}
            fontSize={16}
            fontFamily={theme.font.family}
          >
            楚河　　汉界
          </text>
          {Array.from({ length: ROWS }, (_: unknown, r: number) =>
            Array.from({ length: COLS }, (_: unknown, c: number) => {
              const selected = sel && sel.r === r && sel.c === c;
              const can = destSet.has(keyOf(r, c));
              const was =
                last && ((last.from.r === r && last.from.c === c) || (last.to.r === r && last.to.c === c));
              const p = board[r][c];
              return (
                <g key={keyOf(r, c)} onClick={() => onPoint(r, c)} style={{ cursor: 'pointer' }}>
                  <circle cx={px(c)} cy={py(r)} r={22} fill="transparent" />
                  {was ? <circle cx={px(c)} cy={py(r)} r={20} fill={theme.fill.accentSubtle} opacity={0.7} /> : null}
                  {p ? (
                    <g>
                      <circle
                        cx={px(c)}
                        cy={py(r)}
                        r={18}
                        fill={theme.bg.elevated}
                        stroke={selected ? theme.text.accent : p.side === 'r' ? redColor : blackColor}
                        strokeWidth={selected ? 3 : 2}
                      />
                      <text
                        x={px(c)}
                        y={py(r) + 6}
                        textAnchor="middle"
                        fontSize={18}
                        fontFamily={theme.font.family}
                        fontWeight={700}
                        fill={p.side === 'r' ? redColor : blackColor}
                        style={{ pointerEvents: 'none' }}
                      >
                        {LABELS[p.side][p.kind]}
                      </text>
                    </g>
                  ) : null}
                  {hint && ((hint.from.r===r && hint.from.c===c)||(hint.to.r===r && hint.to.c===c)) ? <circle cx={px(c)} cy={py(r)} r={24} fill="none" stroke="#dd9a22" strokeWidth={4} style={{pointerEvents:'none'}} /> : null}
                  {can ? (
                    <circle
                      cx={px(c)}
                      cy={py(r)}
                      r={p ? 21 : 7}
                      fill={p ? 'none' : theme.fill.accent}
                      stroke={p ? theme.text.accent : 'none'}
                      strokeWidth={p ? 3 : 0}
                      opacity={0.9}
                      style={{ pointerEvents: 'none' }}
                    />
                  ) : null}
                </g>
              );
            }),
          )}
        </svg>
      </Section>
      <div className="imm-help"><Section heading="规则说明"><p aria-live="polite">{hint?.reason}</p>
        <Text>
          棋盘为九路十行，红在下方先行。帅/将只在九宫内直走一格；双方将帅不能在同一直线上面对面（中间无子）。仕/士斜走一格且不出九宫。相/象斜走两格（田字），若象眼有子则不能走，且不能过河。马走日字，蹩马腿则不能走。车沿直线走任意格，不能跳子。炮不吃子时与车相同；吃子须隔且只隔一个棋子（炮架）。兵/卒未过河只能向前一格，过河后可左右一格，不能后退。被将军必须应将；无法应将为将死，对方胜。无将但无任何合法着法为困毙，亦判负。本页不自动裁决长将、长捉等循环着法，遇到循环对峙可自行协商或重开。未加入人机，以免给出不可靠的棋力。
        </Text>
      </Section></div>
    
      </ImmersiveFrame>
    </Page>
  );
}
