import { useSearchParams } from 'react-router-dom';
import {
  Page,
  Section,
  Text,
  Button,
  useGrokTheme,
  useState,
  useEffect,
  useRef,
  type KeyboardEvent,
} from '../compat/grok-canvas';
import { ImmersiveFrame } from '../mobile/ImmersiveFrame';
import { useImmersivePlay } from '../mobile/immersivePlay';
import { fittedBoxStyle, useStageFit } from '../mobile/useStageFit';
import { BOARD_SIZE, emptyBoard, stoneOfSeat, type Stone } from '../rules/gomoku';
import { isValidRoomCode, normalizeRoomCode } from '../rules/roomCode';
import {
  RECONNECT_MS,
  type PlayerView,
  type Point,
  type ResultReason,
  type RoomPhase,
  type Seat,
  type ServerMessage,
} from '../rules/gomokuVsNet';

const PLAYER_KEY = 'mini-arcade-gomoku-vs-id';
const STAR_POINTS = [3, 7, 11];

function loadPlayerId(): string {
  try {
    const existing = sessionStorage.getItem(PLAYER_KEY);
    if (existing) return existing;
    const id = crypto.randomUUID();
    sessionStorage.setItem(PLAYER_KEY, id);
    return id;
  } catch {
    return crypto.randomUUID();
  }
}

function socketUrl(code: string, player: string): string {
  const proto = location.protocol === 'https:' ? 'wss:' : 'ws:';
  return `${proto}//${location.host}/api/gomoku-vs/ws?room=${encodeURIComponent(code)}&player=${encodeURIComponent(player)}`;
}

function shareUrl(code: string): string {
  return `${location.origin}/games/gomoku-vs?room=${encodeURIComponent(code)}`;
}

function seatLabel(seat: Seat): string {
  return seat === 0 ? '黑方' : '白方';
}

function resultText(winner: Seat | 'draw' | null, reason: ResultReason | null, mySeat: Seat | null): string {
  if (winner == null) return '';
  if (winner === 'draw') return '棋盘已满，和棋。';
  const name = seatLabel(winner);
  if (reason === 'disconnect') {
    if (mySeat != null) return winner === mySeat ? '对手离线超时，你获胜。' : '你已离线超时，对局结束。';
    return name + '因对手离线而获胜。';
  }
  if (mySeat != null) return winner === mySeat ? '你赢了！连五成功。' : '你输了。对手已经连五。';
  return name + '连五获胜。';
}

export default function App() {
  const theme = useGrokTheme();
  const { active: immersive } = useImmersivePlay();
  const [searchParams, setSearchParams] = useSearchParams();
  const roomFromUrl = normalizeRoomCode(searchParams.get('room') ?? '');
  const stageRef = useRef<HTMLDivElement | null>(null);
  const fit = useStageFit(stageRef, BOARD_SIZE, BOARD_SIZE, immersive, true);

  const playerId = useRef('');
  const socketRef = useRef<WebSocket | null>(null);
  const wantsReconnect = useRef(false);
  const reconnectDeadline = useRef(0);
  const connectTimer = useRef(0);
  const mySeatRef = useRef<Seat | null>(null);
  const phaseRef = useRef<RoomPhase | 'menu'>('menu');
  const onlineRef = useRef(false);

  const [joinInput, setJoinInput] = useState(roomFromUrl);
  const [roomCode, setRoomCode] = useState(roomFromUrl);
  const [online, setOnline] = useState(false);
  const [mySeat, setMySeat] = useState<Seat | null>(null);
  const [players, setPlayers] = useState<PlayerView[]>([]);
  const [phase, setPhase] = useState<RoomPhase | 'menu'>('menu');
  const [board, setBoard] = useState<Stone[][]>(() => emptyBoard());
  const [turn, setTurn] = useState<Seat>(0);
  const [lastMove, setLastMove] = useState<Point | null>(null);
  const [winning, setWinning] = useState<number[][]>([]);
  const [winner, setWinner] = useState<Seat | 'draw' | null>(null);
  const [reason, setReason] = useState<ResultReason | null>(null);
  const [message, setMessage] = useState('开房间后把链接发给朋友，双方点准备即可开局。');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [copied, setCopied] = useState(false);

  mySeatRef.current = mySeat;
  phaseRef.current = phase;
  onlineRef.current = online;

  const closeSocket = () => {
    const ws = socketRef.current;
    socketRef.current = null;
    if (!ws) return;
    try {
      ws.close(1000, 'leave');
    } catch {
      /* already closing */
    }
  };

  const applyRoom = (next: PlayerView[], nextPhase: RoomPhase, round?: number) => {
    setPlayers(next);
    setPhase(nextPhase);
    if (nextPhase === 'lobby') {
      const waiting = next.length < 2;
      setMessage(waiting ? '等待对手加入房间。' : '双方都点「准备」后开局。');
    } else if (nextPhase === 'playing' && typeof round === 'number') {
      setMessage('第 ' + round + ' 局开始，黑方先行。');
    }
  };

  const handleServer = (msg: ServerMessage) => {
    if (msg.type === 'pong') return;
    if (msg.type === 'joined') {
      setMySeat(msg.seat);
      mySeatRef.current = msg.seat;
      setBoard(msg.board);
      setTurn(msg.turn);
      setLastMove(msg.lastMove);
      setWinning(msg.winningLine);
      setWinner(msg.result?.winner ?? null);
      setReason(msg.result?.reason ?? null);
      applyRoom(msg.players, msg.phase, msg.round);
      if (msg.phase === 'playing') {
        setMessage((msg.turn === msg.seat ? '轮到你落子（' : '等待对手落子（') + seatLabel(msg.turn) + '）。');
      } else if (msg.phase === 'result' && msg.result) {
        setMessage(resultText(msg.result.winner, msg.result.reason, msg.seat) + ' 双方再次点准备可再赛。');
      } else if (msg.players.length < 2) {
        setMessage('你是' + seatLabel(msg.seat) + '。把房间号或链接发给朋友，等待加入。');
      } else {
        setMessage('你是' + seatLabel(msg.seat) + '。双方都点「准备」后开局。');
      }
      setError('');
      return;
    }
    if (msg.type === 'room') {
      applyRoom(msg.players, msg.phase, msg.round);
      return;
    }
    if (msg.type === 'start') {
      setBoard(msg.board);
      setTurn(msg.turn);
      setLastMove(null);
      setWinning([]);
      setWinner(null);
      setReason(null);
      setPhase('playing');
      setError('');
      const mine = mySeatRef.current;
      setMessage(mine === 0 ? '第 ' + msg.round + ' 局开始，轮到你（黑方）落子。' : '第 ' + msg.round + ' 局开始，等待黑方落子。');
      return;
    }
    if (msg.type === 'placed') {
      setBoard(msg.board);
      setTurn(msg.turn);
      setLastMove(msg.lastMove);
      setWinning(msg.winningLine);
      if (msg.winningLine.length === 0 && mySeatRef.current != null) {
        const mine = mySeatRef.current;
        setMessage(msg.turn === mine ? '轮到你落子（' + seatLabel(msg.turn) + '）。' : '等待对手落子（' + seatLabel(msg.turn) + '）。');
      }
      return;
    }
    if (msg.type === 'result') {
      setBoard(msg.board);
      setLastMove(msg.lastMove);
      setWinning(msg.winningLine);
      setWinner(msg.winner);
      setReason(msg.reason);
      setPhase('result');
      setMessage(resultText(msg.winner, msg.reason, mySeatRef.current) + ' 双方再次点准备可再赛。');
      return;
    }
    if (msg.type === 'opponent_left') {
      setMessage('对手已离开，正在等待重连（约 ' + Math.round(msg.reconnectMs / 1000) + ' 秒）…');
      return;
    }
    if (msg.type === 'opponent_rejoined') {
      setMessage('对手已重新连上。');
      return;
    }
    if (msg.type === 'error') {
      setError(msg.message);
      if (msg.code === 'room_full') setMessage('这个房间已经有两个人了。');
    }
  };

  const connectRoom = (code: string, opts?: { replaceUrl?: boolean }) => {
    const normalized = normalizeRoomCode(code);
    if (!isValidRoomCode(normalized)) {
      setError('房间号需为 4–6 位，只用大写字母和数字，且不含 0/O/1/I。');
      return;
    }
    closeSocket();
    wantsReconnect.current = true;
    if (!reconnectDeadline.current) reconnectDeadline.current = Date.now() + RECONNECT_MS;
    setBusy(true);
    setError('');
    setOnline(true);
    setRoomCode(normalized);
    setJoinInput(normalized);
    setPhase('lobby');
    setWinner(null);
    setReason(null);
    setMessage('正在加入房间…');
    if (opts?.replaceUrl !== false) setSearchParams({ room: normalized }, { replace: true });

    const ws = new WebSocket(socketUrl(normalized, playerId.current || loadPlayerId()));
    socketRef.current = ws;
    ws.onopen = () => {
      setBusy(false);
      setError('');
      reconnectDeadline.current = Date.now() + RECONNECT_MS;
      try {
        ws.send(JSON.stringify({ type: 'join', playerId: playerId.current }));
      } catch {
        /* ignore */
      }
    };
    ws.onmessage = (ev) => {
      if (typeof ev.data !== 'string') return;
      if (ev.data === 'pong') return;
      try {
        handleServer(JSON.parse(ev.data) as ServerMessage);
      } catch {
        setError('收到无法解析的服务器消息。');
      }
    };
    ws.onerror = () => {
      setBusy(false);
      setError('无法连接联机服务。请用 wrangler dev 同时提供页面和接口后再试。');
    };
    ws.onclose = () => {
      setBusy(false);
      if (socketRef.current !== ws) return;
      socketRef.current = null;
      if (!wantsReconnect.current) return;
      if (!onlineRef.current) return;
      if (Date.now() > reconnectDeadline.current) {
        wantsReconnect.current = false;
        setError('无法连上房间服务，或重连时间已过。请重试。');
        setMessage('联机中断。');
        return;
      }
      setMessage('连接中断，正在尝试重连…');
      window.clearTimeout(connectTimer.current);
      connectTimer.current = window.setTimeout(() => {
        if (wantsReconnect.current && onlineRef.current) connectRoom(normalized, { replaceUrl: false });
      }, 800);
    };
  };

  const createRoom = async () => {
    setBusy(true);
    setError('');
    try {
      const res = await fetch('/api/gomoku-vs/rooms', { method: 'POST' });
      if (!res.ok) {
        const body = (await res.json().catch(() => ({}))) as { message?: string };
        throw new Error(body.message || '联机服务暂不可用。');
      }
      const body = (await res.json()) as { code?: string };
      if (!body.code) throw new Error('服务器没有返回房间号。');
      playerId.current = playerId.current || loadPlayerId();
      reconnectDeadline.current = 0;
      connectRoom(body.code);
    } catch (err) {
      setBusy(false);
      setOnline(false);
      setPhase('menu');
      setError(err instanceof Error ? err.message : '联机服务暂不可用。');
      setMessage('创建房间失败。确认已用 wrangler dev 启动带 Worker 的本地服务后再试。本地双人/人机请用「五子棋」。');
    }
  };

  const joinRoom = async (code: string) => {
    const normalized = normalizeRoomCode(code);
    if (!isValidRoomCode(normalized)) {
      setError('房间号需为 4–6 位，只用大写字母和数字，且不含 0/O/1/I。');
      return;
    }
    setBusy(true);
    setError('');
    try {
      const res = await fetch('/api/gomoku-vs/rooms/' + encodeURIComponent(normalized));
      if (res.status === 404) throw new Error('房间不存在，请确认号码后重试。');
      if (!res.ok && res.status !== 409) {
        const body = (await res.json().catch(() => ({}))) as { message?: string };
        if (res.status >= 500 || res.status === 0) throw new Error(body.message || '联机服务暂不可用。');
        if (res.status === 400) throw new Error(body.message || '房间号格式不正确。');
      }
      playerId.current = playerId.current || loadPlayerId();
      reconnectDeadline.current = 0;
      connectRoom(normalized);
    } catch (err) {
      setBusy(false);
      setError(err instanceof Error ? err.message : '无法加入房间。');
    }
  };

  const leaveRoom = () => {
    wantsReconnect.current = false;
    window.clearTimeout(connectTimer.current);
    try {
      socketRef.current?.send(JSON.stringify({ type: 'leave' }));
    } catch {
      /* ignore */
    }
    closeSocket();
    setOnline(false);
    setPhase('menu');
    setMySeat(null);
    setPlayers([]);
    setRoomCode('');
    setBoard(emptyBoard());
    setTurn(0);
    setLastMove(null);
    setWinning([]);
    setWinner(null);
    setReason(null);
    setError('');
    setMessage('已离开房间。可以重新创建或加入。');
    setSearchParams({}, { replace: true });
  };

  const readyUp = () => {
    try {
      socketRef.current?.send(JSON.stringify({ type: phase === 'result' ? 'rematch' : 'ready' }));
      setMessage('已准备，等待对手…');
    } catch {
      setError('发送准备消息失败，请检查连接。');
    }
  };

  const copyLink = async () => {
    if (!roomCode) return;
    try {
      await navigator.clipboard.writeText(shareUrl(roomCode));
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1500);
    } catch {
      setError('复制失败，请手动复制地址栏中的链接。');
    }
  };

  const play = (r: number, c: number) => {
    if (phase !== 'playing' || mySeat == null) return;
    if (turn !== mySeat) {
      setError('还没轮到你落子。');
      return;
    }
    if (board[r]![c]) return;
    setError('');
    try {
      socketRef.current?.send(JSON.stringify({ type: 'place', r, c }));
    } catch {
      setError('发送落子失败，请检查连接。');
    }
  };

  useEffect(() => {
    if (roomFromUrl && isValidRoomCode(roomFromUrl) && !onlineRef.current) {
      playerId.current = playerId.current || loadPlayerId();
      void joinRoom(roomFromUrl);
    }
    return () => {
      wantsReconnect.current = false;
      window.clearTimeout(connectTimer.current);
      closeSocket();
    };
    // 仅在首次挂载时按链接自动加入，避免重复连接。
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const meReady = mySeat != null && players.some((p) => p.seat === mySeat && p.ready);
  const canPlace = phase === 'playing' && mySeat != null && turn === mySeat;
  const boardStyle = fittedBoxStyle(immersive, fit, { width: '100%', aspectRatio: '1' });
  const status = (() => {
    if (error && !online) return error;
    if (phase === 'result') return resultText(winner, reason, mySeat) || '本局结束';
    if (phase === 'playing' && mySeat != null) {
      return turn === mySeat ? '轮到你（' + seatLabel(turn) + '）落子' : '等待对手（' + seatLabel(turn) + '）落子';
    }
    if (online && phase === 'lobby') return players.length < 2 ? '等待对手加入' : '双方准备后开局';
    return message;
  })();

  const winningSet = new Set(winning.map((q) => q[0] + ',' + q[1]));
  const moves: Array<{ r: number; c: number; p: Stone }> = [];
  for (let r = 0; r < BOARD_SIZE; r++) {
    for (let c = 0; c < BOARD_SIZE; c++) {
      const p = board[r]![c]!;
      if (p) moves.push({ r, c, p });
    }
  }

  return (
    <Page
      title="房间号联机五子棋"
      summary="开一个房间号，邀请朋友联机对弈。十五路棋盘，黑方先行，连五即胜；自由规则，不设禁手。"
      width="wide"
      lang="zh-Hans"
    >
      <ImmersiveFrame
        layout="banded"
        stageRef={stageRef}
        intro={
          <Text>
            手机可点「全屏游玩」：棋盘铺满屏幕，点交叉落子。不强加方向键。一方创建房间，把 5 位房间号或链接发给对方，两人都点「准备」后开局。联机需要 Worker 房间服务；若服务未启动，页面会明确提示错误。本地双人/人机请用「五子棋」。
          </Text>
        }
        hudStats={
          <span>
            {mySeat != null ? '你执' + seatLabel(mySeat) : '未入座'}
            {phase === 'playing' ? ' · ' + (turn === mySeat ? '你的回合' : '对方回合') : ''}
          </span>
        }
        hudActions={
          online && (phase === 'lobby' || phase === 'result') ? (
            <Button label={meReady ? '已准备' : '准备'} onClick={readyUp} disabled={meReady} />
          ) : null
        }
        hudMsg={<span aria-live="polite">{error || message}</span>}
        help={
          <Section heading="对弈说明">
            <Text>
              黑方先行。横、竖、斜任意方向连续五子或以上即获胜；自由规则，不设禁手。棋盘下满且无人连五则为和棋。房间最多两人。先进入房间的执黑，后加入的执白。只轮到自己时可在空交叉点落子，联机对局不提供悔棋。
            </Text>
            <Text>
              对局结束后双方再次点「准备」即可再赛（座位不变，仍由黑方先下）。对手掉线会等待约 15 秒重连；若在对局中超时，则判对方获胜。方形标记为最后一手，胜利棋子显示蓝色轮廓。成绩只留在当次对局里，不上云。
            </Text>
          </Section>
        }
      >
        <div className="gomoku-vs-room" style={{ border: `1px solid ${theme.border.strong}` }}>
          {!online && (
            <div className="gomoku-vs-room-row">
              <Button label={busy ? '正在创建…' : '创建房间'} variant="primary" onClick={() => void createRoom()} disabled={busy} />
              <label className="gomoku-vs-join">
                房间号
                <input
                  value={joinInput}
                  onChange={(ev) => setJoinInput(normalizeRoomCode(ev.target.value))}
                  maxLength={6}
                  spellCheck={false}
                  autoCapitalize="characters"
                  placeholder="例如 7K3P2"
                  onKeyDown={(ev: KeyboardEvent<HTMLInputElement>) => {
                    if (ev.key === 'Enter') {
                      ev.preventDefault();
                      void joinRoom(joinInput);
                    }
                  }}
                />
              </label>
              <Button label="加入房间" onClick={() => void joinRoom(joinInput)} disabled={busy} />
            </div>
          )}
          {online && roomCode && (
            <div className="gomoku-vs-room-row">
              <div className="gomoku-vs-code">
                房间号 <strong>{roomCode}</strong>
              </div>
              <Button label={copied ? '已复制' : '复制链接'} onClick={() => void copyLink()} />
              {(phase === 'lobby' || phase === 'result') && (
                <Button label={meReady ? '已准备' : '准备 / 再赛'} variant="primary" onClick={readyUp} disabled={meReady} />
              )}
              <Button label="离开房间" onClick={leaveRoom} />
            </div>
          )}
          {online && (
            <div className="gomoku-vs-seats">
              {([0, 1] as Seat[]).map((seat) => {
                const p = players.find((item) => item.seat === seat);
                const label = seat === mySeat ? '我（' + seatLabel(seat) + '）' : '对手（' + seatLabel(seat) + '）';
                return (
                  <span key={seat}>
                    {label}：{!p ? '空位' : `${p.connected ? '在线' : '离线'} · ${p.ready ? '已准备' : '未准备'}`}
                  </span>
                );
              })}
            </div>
          )}
          <div className="gomoku-vs-room-msg" aria-live="polite">
            {status}
            {error && status !== error ? ' · ' + error : ''}
          </div>
          {error && !online && (
            <div className="gomoku-vs-room-msg">联机失败时不会出现空白页。可稍后重试，或回到「五子棋」进行本地对弈。</div>
          )}
        </div>
        <Section>
          <div style={{ display: 'flex', justifyContent: 'center' }}>
            <svg
              viewBox="0 0 640 640"
              width="100%"
              role="group"
              aria-label="十五乘十五五子棋棋盘"
              style={{
                ...boardStyle,
                touchAction: 'manipulation',
                background: theme.bg.subtle,
                borderRadius: 12,
                maxHeight: immersive ? undefined : '76vh',
              }}
            >
              <rect x="0" y="0" width="640" height="640" fill={theme.bg.subtle} />
              {Array.from({ length: BOARD_SIZE }, (_: unknown, i: number) => (
                <g key={'grid-' + i}>
                  <line x1="40" y1={40 + i * 40} x2="600" y2={40 + i * 40} stroke={theme.border.strong} strokeWidth="1" />
                  <line x1={40 + i * 40} y1="40" x2={40 + i * 40} y2="600" stroke={theme.border.strong} strokeWidth="1" />
                  <text x={40 + i * 40} y="23" textAnchor="middle" fill={theme.text.tertiary} fontSize="12" fontFamily={theme.font.family}>
                    {String.fromCharCode(65 + i)}
                  </text>
                  <text x="18" y={44 + i * 40} textAnchor="middle" fill={theme.text.tertiary} fontSize="12" fontFamily={theme.font.family}>
                    {BOARD_SIZE - i}
                  </text>
                </g>
              ))}
              {STAR_POINTS.flatMap((r: number) =>
                STAR_POINTS.map((c: number) => (
                  <circle key={'dot-' + r + '-' + c} cx={40 + c * 40} cy={40 + r * 40} r="3" fill={theme.text.tertiary} />
                )),
              )}
              {moves.map((m) => (
                <g key={'stone-' + m.r + '-' + m.c}>
                  <circle
                    cx={40 + m.c * 40}
                    cy={40 + m.r * 40}
                    r="16"
                    fill={m.p === 1 ? theme.text.primary : theme.bg.base}
                    stroke={theme.text.primary}
                    strokeWidth="2"
                  />
                  {winningSet.has(m.r + ',' + m.c) && (
                    <circle
                      cx={40 + m.c * 40}
                      cy={40 + m.r * 40}
                      r="19"
                      fill="none"
                      stroke={theme.dataviz.categorical[0]}
                      strokeWidth="3"
                    />
                  )}
                  {lastMove && lastMove.r === m.r && lastMove.c === m.c && (
                    <rect x={36 + m.c * 40} y={36 + m.r * 40} width="8" height="8" fill={theme.dataviz.categorical[0]} />
                  )}
                </g>
              ))}
              {Array.from({ length: BOARD_SIZE * BOARD_SIZE }, (_: unknown, i: number) => {
                const r = Math.floor(i / BOARD_SIZE);
                const c = i % BOARD_SIZE;
                const empty = board[r]![c] === 0;
                const enabled = canPlace && empty;
                return (
                  <rect
                    key={'hit-' + i}
                    x={21 + c * 40}
                    y={21 + r * 40}
                    width="38"
                    height="38"
                    fill="transparent"
                    role="button"
                    tabIndex={enabled ? 0 : -1}
                    aria-label={String.fromCharCode(65 + c) + (BOARD_SIZE - r) + (empty ? ' 落子' : ' 已有棋子')}
                    onClick={() => play(r, c)}
                    onKeyDown={(e: KeyboardEvent<SVGRectElement>) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        play(r, c);
                      }
                    }}
                    style={{ cursor: enabled ? 'pointer' : 'default' }}
                  />
                );
              })}
            </svg>
          </div>
        </Section>
      </ImmersiveFrame>
    </Page>
  );
}
