import { useSearchParams } from 'react-router-dom';
import {
  Page,
  Text,
  Button,
  useGrokTheme,
  useState,
  useEffect,
  useRef,
  type KeyboardEvent,
} from '../compat/grok-canvas';
import { HandheldPad } from '../mobile/HandheldPad';
import { useImmersivePlay } from '../mobile/immersivePlay';
import { fitSize } from '../mobile/scale';
import {
  COLORS,
  KINDS,
  SHAPES,
  enqueueGarbage,
  fits,
  freshGame,
  hardDrop,
  hold,
  isValidRoomCode,
  move,
  normalizeRoomCode,
  restartGame,
  rotate,
  snapshotOf,
  tickGame,
  type BoardSnapshot,
  type Kind,
  type VersusGame,
} from '../rules/tetrisVersus';
import { RECONNECT_MS, type PlayerView, type RoomPhase, type Seat, type ServerMessage } from '../rules/tetrisVsNet';

type Mode = 'menu' | 'online' | 'local';
type EndResult = { winner: Seat | 'draw'; reason: 'topout' | 'disconnect' } | null;

const PLAYER_KEY = 'mini-arcade-tetris-vs-id';
const STATE_INTERVAL_MS = 80;

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
  return `${proto}//${location.host}/api/tetris-vs/ws?room=${encodeURIComponent(code)}&player=${encodeURIComponent(player)}`;
}

function shareUrl(code: string): string {
  return `${location.origin}/games/tetris-vs?room=${encodeURIComponent(code)}`;
}

function block(c: CanvasRenderingContext2D, x: number, y: number, size: number, color: string, ghost = false) {
  if (ghost) {
    c.strokeStyle = color;
    c.lineWidth = 2;
    c.strokeRect(x + 3, y + 3, size - 6, size - 6);
    return;
  }
  c.fillStyle = color;
  c.fillRect(x + 1, y + 1, size - 2, size - 2);
  c.fillStyle = 'rgba(255,255,255,0.25)';
  c.fillRect(x + 3, y + 3, size - 6, 3);
  c.fillStyle = 'rgba(0,0,0,0.17)';
  c.fillRect(x + 3, y + size - 6, size - 6, 3);
}

function drawSnapshot(ctx: CanvasRenderingContext2D, snap: BoardSnapshot | null, opts: { ghost?: boolean; width?: number; height?: number }) {
  const w = opts.width ?? 300;
  const h = opts.height ?? 600;
  const cell = w / 10;
  ctx.fillStyle = '#101723';
  ctx.fillRect(0, 0, w, h);
  ctx.strokeStyle = '#202b3b';
  ctx.lineWidth = 1;
  for (let x = 0; x <= 10; x++) {
    ctx.beginPath();
    ctx.moveTo(x * cell, 0);
    ctx.lineTo(x * cell, h);
    ctx.stroke();
  }
  for (let y = 0; y <= 20; y++) {
    ctx.beginPath();
    ctx.moveTo(0, y * cell);
    ctx.lineTo(w, y * cell);
    ctx.stroke();
  }
  if (!snap) return;
  snap.board.forEach((row, y) => {
    row.forEach((v, x) => {
      if (v) block(ctx, x * cell, y * cell, cell, COLORS[v] ?? '#8899aa');
    });
  });
  if (snap.status === 'topout' || !snap.piece) return;
  const fake = { board: snap.board } as VersusGame;
  let ghost = snap.piece;
  if (opts.ghost) {
    ghost = { ...snap.piece };
    while (fits(fake, { ...ghost, y: ghost.y + 1 })) ghost = { ...ghost, y: ghost.y + 1 };
  }
  const pieces = opts.ghost ? [[ghost, true] as const, [snap.piece, false] as const] : [[snap.piece, false] as const];
  for (const [p, isGhost] of pieces) {
    p.m.forEach((row, y) => {
      row.forEach((v, x) => {
        if (v && p.y + y >= 0) {
          block(ctx, (p.x + x) * cell, (p.y + y) * cell, cell, COLORS[KINDS.indexOf(p.kind) + 1]!, isGhost);
        }
      });
    });
  }
}

function drawPreview(ctx: CanvasRenderingContext2D, queue: Kind[], held: Kind | null) {
  ctx.fillStyle = '#101723';
  ctx.fillRect(0, 0, 180, 330);
  ctx.fillStyle = '#bdcbe0';
  ctx.font = '13px sans-serif';
  ctx.fillText('NEXT / 接下来', 14, 24);
  const mini = (k: Kind, y: number) => {
    SHAPES[k].forEach((row, yy) => {
      row.forEach((v, x) => {
        if (v) block(ctx, 40 + x * 21, y + yy * 21, 21, COLORS[KINDS.indexOf(k) + 1]!);
      });
    });
  };
  queue.forEach((k, i) => mini(k, 34 + i * 65));
  ctx.fillStyle = '#bdcbe0';
  ctx.fillText('HOLD / 暂存 · C', 14, 253);
  if (held) mini(held, 265);
  else {
    ctx.fillStyle = '#718099';
    ctx.fillText('按 C 暂存当前方块', 14, 291);
  }
}

function resultText(result: EndResult, mySeat: Seat | null, localWinner: 0 | 1 | 'draw' | null): string {
  const winner = result?.winner ?? localWinner;
  if (winner == null) return '';
  if (winner === 'draw') return '平局：双方几乎同时顶出。';
  if (mySeat != null) return winner === mySeat ? '你赢了！' : '你输了。';
  return winner === 0 ? '玩家一获胜。' : '玩家二获胜。';
}

export default function App() {
  const theme = useGrokTheme();
  const { active: immersive, enter, exit } = useImmersivePlay();
  const [searchParams, setSearchParams] = useSearchParams();
  const roomFromUrl = normalizeRoomCode(searchParams.get('room') ?? '');

  const rootRef = useRef<HTMLDivElement | null>(null);
  const stageRef = useRef<HTMLDivElement | null>(null);
  const localRef = useRef<HTMLCanvasElement | null>(null);
  const rivalRef = useRef<HTMLCanvasElement | null>(null);
  const previewRef = useRef<HTMLCanvasElement | null>(null);

  const playerId = useRef('');
  const localGame = useRef<VersusGame>(freshGame(1));
  const local2 = useRef<VersusGame | null>(null);
  const down = useRef(false);
  const down2 = useRef(false);
  const socketRef = useRef<WebSocket | null>(null);
  const seqRef = useRef(0);
  const lastStateAt = useRef(0);
  const wantsReconnect = useRef(false);
  const reconnectDeadline = useRef(0);
  const connectTimer = useRef(0);
  const mySeatRef = useRef<Seat | null>(null);
  const modeRef = useRef<Mode>('menu');
  const phaseRef = useRef<RoomPhase | 'menu'>('menu');

  const [mode, setMode] = useState<Mode>('menu');
  const [joinInput, setJoinInput] = useState(roomFromUrl);
  const [roomCode, setRoomCode] = useState(roomFromUrl);
  const [mySeat, setMySeat] = useState<Seat | null>(null);
  const [players, setPlayers] = useState<PlayerView[]>([]);
  const [phase, setPhase] = useState<RoomPhase | 'menu'>('menu');
  const [message, setMessage] = useState('开房间后把链接发给朋友，双方点准备即可开局。');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [copied, setCopied] = useState(false);
  const [result, setResult] = useState<EndResult>(null);
  const [localWinner, setLocalWinner] = useState<0 | 1 | 'draw' | null>(null);
  const [rivalSnap, setRivalSnap] = useState<BoardSnapshot | null>(null);
  const rivalSnapRef = useRef<BoardSnapshot | null>(null);
  const [boardFit, setBoardFit] = useState({ width: 300, height: 600 });
  const [, refresh] = useState(0);
  const update = () => refresh((v) => v + 1);
  rivalSnapRef.current = rivalSnap;

  modeRef.current = mode;
  phaseRef.current = phase;
  mySeatRef.current = mySeat;

  useEffect(() => {
    playerId.current = loadPlayerId();
  }, []);

  useEffect(() => {
    if (!immersive) return;
    const stage = stageRef.current;
    if (!stage) return;
    const measure = () => {
      const fit = fitSize(300, 600, Math.max(0, stage.clientWidth), Math.max(0, stage.clientHeight), true);
      setBoardFit({ width: Math.max(1, Math.floor(fit.width)), height: Math.max(1, Math.floor(fit.height)) });
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(stage);
    return () => ro.disconnect();
  }, [immersive]);

  useEffect(() => {
    if (immersive) rootRef.current?.focus({ preventScroll: true });
  }, [immersive]);

  const sendJson = (payload: object) => {
    const ws = socketRef.current;
    if (ws && ws.readyState === WebSocket.OPEN) ws.send(JSON.stringify(payload));
  };

  const publishState = (force = false) => {
    if (modeRef.current !== 'online' || phaseRef.current !== 'playing') return;
    const now = performance.now();
    if (!force && now - lastStateAt.current < STATE_INTERVAL_MS) return;
    lastStateAt.current = now;
    seqRef.current += 1;
    sendJson({ type: 'state', snapshot: snapshotOf(localGame.current), seq: seqRef.current });
  };

  const handleLock = (game: VersusGame, fromLocal: boolean, which: 0 | 1) => {
    if (game.status === 'topout') {
      if (modeRef.current === 'online' && fromLocal) {
        publishState(true);
        sendJson({ type: 'topout', seq: seqRef.current });
        setMessage('已顶出，等待结算…');
      }
      if (modeRef.current === 'local') {
        const other = which === 0 ? local2.current : localGame.current;
        if (other && other.status === 'topout') setLocalWinner('draw');
        else setLocalWinner(which === 0 ? 1 : 0);
        setPhase('result');
        setMessage(which === 0 && local2.current?.status === 'topout' ? '平局：双方几乎同时顶出。' : which === 0 ? '玩家二获胜。' : '玩家一获胜。');
      }
    }
    update();
  };

  const applyLockNet = (res: { garbageSent: number; gaps: number[]; toppedOut: boolean } | null) => {
    if (!res) {
      publishState(false);
      return;
    }
    if (res.garbageSent) sendJson({ type: 'garbage', rows: res.garbageSent, gaps: res.gaps, seq: seqRef.current + 1 });
    publishState(true);
    handleLock(localGame.current, true, 0);
  };

  const act = (action: string, who: 0 | 1 = 0) => {
    const g = who === 1 ? local2.current : localGame.current;
    if (!g || g.status !== 'running') return;
    if (action === 'left') move(g, -1, 0);
    if (action === 'right') move(g, 1, 0);
    if (action === 'down' && move(g, 0, 1)) g.score++;
    if (action === 'cw') rotate(g, true);
    if (action === 'ccw') rotate(g, false);
    if (action === 'drop') {
      const res = hardDrop(g);
      if (modeRef.current === 'online' && who === 0) applyLockNet(res);
      else handleLock(g, false, who);
    }
    if (action === 'hold') {
      hold(g);
      if (modeRef.current === 'online' && who === 0) publishState(true);
    }
    if (action !== 'drop') {
      if (modeRef.current === 'online' && who === 0) publishState(false);
      update();
    }
    rootRef.current?.focus({ preventScroll: true });
  };

  const beginLocal = () => {
    closeSocket();
    const seed = (Math.floor(Math.random() * 0xffffffff) >>> 0) || 1;
    localGame.current = restartGame(seed);
    local2.current = restartGame(seed);
    down.current = false;
    down2.current = false;
    setMode('local');
    setPhase('playing');
    setResult(null);
    setLocalWinner(null);
    setError('');
    setMySeat(null);
    setRivalSnap(null);
    setMessage('同屏对战已开始。玩家一用 WASD，玩家二用方向键。');
    update();
    rootRef.current?.focus({ preventScroll: true });
  };

  const closeSocket = () => {
    wantsReconnect.current = false;
    window.clearTimeout(connectTimer.current);
    const ws = socketRef.current;
    socketRef.current = null;
    if (ws && (ws.readyState === WebSocket.OPEN || ws.readyState === WebSocket.CONNECTING)) {
      try {
        ws.close(1000, 'leave');
      } catch {
        /* ignore */
      }
    }
  };

  const leaveRoom = () => {
    sendJson({ type: 'leave' });
    closeSocket();
    reconnectDeadline.current = 0;
    setMode('menu');
    setPhase('menu');
    setPlayers([]);
    setMySeat(null);
    setResult(null);
    setRoomCode('');
    setError('');
    setMessage('开房间后把链接发给朋友，双方点准备即可开局。');
    setSearchParams({}, { replace: true });
    localGame.current = freshGame(1);
    local2.current = null;
    update();
  };

  const handleServer = (msg: ServerMessage) => {
    if (msg.type === 'joined') {
      setMySeat(msg.seat);
      setPlayers(msg.players);
      setPhase(msg.phase);
      setError('');
      if (msg.phase === 'playing' && msg.seed != null) {
        localGame.current = restartGame(msg.seed);
        setMessage('已重新连上，对局仍在进行。');
      } else if (msg.phase === 'lobby') {
        setMessage(msg.players.length < 2 ? '把房间号或链接发给对手，双方到齐后点「准备」。' : '对手已在房间，点「准备」等待对方确认。');
      }
      update();
      return;
    }
    if (msg.type === 'room') {
      setPlayers(msg.players);
      setPhase(msg.phase);
      return;
    }
    if (msg.type === 'start') {
      localGame.current = restartGame(msg.seed);
      local2.current = null;
      down.current = false;
      seqRef.current = 0;
      setRivalSnap(null);
      setResult(null);
      setLocalWinner(null);
      setPhase('playing');
      setError('');
      setMessage('对局开始！消两行及以上会给对方堆垃圾行。');
      update();
      rootRef.current?.focus({ preventScroll: true });
      return;
    }
    if (msg.type === 'state' && msg.from !== mySeatRef.current) {
      setRivalSnap(msg.snapshot);
      return;
    }
    if (msg.type === 'garbage' && msg.from !== mySeatRef.current) {
      enqueueGarbage(localGame.current, msg.gaps.length ? msg.gaps : Array.from({ length: msg.rows }, () => 0));
      update();
      return;
    }
    if (msg.type === 'result') {
      setResult({ winner: msg.winner, reason: msg.reason });
      setPhase('result');
      if (localGame.current.status === 'running') localGame.current.status = 'ready';
      const seat = mySeatRef.current;
      if (msg.reason === 'disconnect') setMessage(msg.winner === seat ? '对手离开，你获得胜利。' : '连接中断，对局结束。');
      else setMessage(resultText({ winner: msg.winner, reason: msg.reason }, seat, null));
      update();
      return;
    }
    if (msg.type === 'opponent_left') {
      setMessage(`对手离开了，正在等待 ${Math.round(msg.reconnectMs / 1000)} 秒内重连…`);
      return;
    }
    if (msg.type === 'opponent_rejoined') {
      setMessage('对手已重新连上。');
      return;
    }
    if (msg.type === 'error') {
      setError(msg.message);
      if (msg.code === 'room_full') setMessage('这个房间已经有两个人了。');
      return;
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
    setMode('online');
    setRoomCode(normalized);
    setJoinInput(normalized);
    setPhase('lobby');
    setResult(null);
    setLocalWinner(null);
    setMessage('正在加入房间…');
    if (opts?.replaceUrl !== false) setSearchParams({ room: normalized }, { replace: true });

    const ws = new WebSocket(socketUrl(normalized, playerId.current || loadPlayerId()));
    socketRef.current = ws;
    ws.onopen = () => {
      setBusy(false);
      setError('');
      reconnectDeadline.current = Date.now() + RECONNECT_MS;
      sendJson({ type: 'join', playerId: playerId.current });
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
      setError('无法连接联机服务。请用 wrangler dev 同时提供页面和接口，或改用同屏双人。');
    };
    ws.onclose = () => {
      setBusy(false);
      if (socketRef.current !== ws) return;
      socketRef.current = null;
      if (!wantsReconnect.current) return;
      if (modeRef.current !== 'online') return;
      if (Date.now() > reconnectDeadline.current) {
        wantsReconnect.current = false;
        setError('无法连上房间服务，或重连时间已过。请重试，或改用同屏双人。');
        setMessage('联机中断。');
        return;
      }
      setMessage('连接中断，正在尝试重连…');
      window.clearTimeout(connectTimer.current);
      connectTimer.current = window.setTimeout(() => {
        if (wantsReconnect.current && modeRef.current === 'online') connectRoom(normalized, { replaceUrl: false });
      }, 800);
    };
  };

  const createRoom = async () => {
    setBusy(true);
    setError('');
    try {
      const res = await fetch('/api/tetris-vs/rooms', { method: 'POST' });
      if (!res.ok) {
        const body = await res.json().catch(() => ({})) as { message?: string };
        throw new Error(body.message || '联机服务暂不可用。');
      }
      const body = (await res.json()) as { code?: string };
      if (!body.code) throw new Error('服务器没有返回房间号。');
      playerId.current = playerId.current || loadPlayerId();
      reconnectDeadline.current = 0;
      connectRoom(body.code);
    } catch (err) {
      setBusy(false);
      setMode('menu');
      setPhase('menu');
      setError(err instanceof Error ? err.message : '联机服务暂不可用。');
      setMessage('创建房间失败。确认已用 wrangler dev 启动带 Worker 的本地服务，或先用同屏双人练习。');
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
      const res = await fetch('/api/tetris-vs/rooms/' + encodeURIComponent(normalized));
      if (res.status === 404) throw new Error('房间不存在，请确认号码后重试。');
      if (!res.ok && res.status !== 409) {
        const body = await res.json().catch(() => ({})) as { message?: string };
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

  useEffect(() => {
    if (roomFromUrl && isValidRoomCode(roomFromUrl) && mode === 'menu') {
      playerId.current = playerId.current || loadPlayerId();
      void joinRoom(roomFromUrl);
    }
    return () => {
      wantsReconnect.current = false;
      closeSocket();
    };
    // 仅在首次挂载时按链接自动加入，避免重复连接。
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    let raf = 0;
    let last = 0;
    const draw = () => {
      const local = localGame.current;
      const localCtx = localRef.current?.getContext('2d');
      if (localCtx) drawSnapshot(localCtx, snapshotOf(local), { ghost: true });
      const rivalCtx = rivalRef.current?.getContext('2d');
      if (rivalCtx) {
        if (modeRef.current === 'local' && local2.current) drawSnapshot(rivalCtx, snapshotOf(local2.current), { ghost: true });
        else drawSnapshot(rivalCtx, rivalSnapRef.current, { ghost: true });
      }
      const prev = previewRef.current?.getContext('2d');
      if (prev) drawPreview(prev, local.queue, local.hold);
    };
    const tick = (now: number) => {
      const dt = last ? Math.min(now - last, 80) : 0;
      last = now;
      if (modeRef.current === 'online' && phaseRef.current === 'playing') {
        const locked = tickGame(localGame.current, dt, down.current);
        if (locked) applyLockNet(locked);
        else if (localGame.current.status === 'running') publishState(false);
      }
      if (modeRef.current === 'local' && phaseRef.current === 'playing' && local2.current) {
        const a = tickGame(localGame.current, dt, down.current);
        const b = tickGame(local2.current, dt, down2.current);
        if (a?.garbageSent) enqueueGarbage(local2.current, a.gaps);
        if (b?.garbageSent) enqueueGarbage(localGame.current, b.gaps);
        const topA = localGame.current.status === 'topout';
        const topB = local2.current.status === 'topout';
        if (topA && topB) {
          setLocalWinner('draw');
          setPhase('result');
          setMessage('平局：双方几乎同时顶出。');
        } else if (topA) {
          setLocalWinner(1);
          setPhase('result');
          setMessage('玩家二获胜。');
        } else if (topB) {
          setLocalWinner(0);
          setPhase('result');
          setMessage('玩家一获胜。');
        } else if (a || b) update();
      }
      draw();
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
    // 循环只启动一次，对局状态通过 ref 读取，避免对手快照更新时重置下落计时。
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const readyUp = () => {
    sendJson({ type: 'ready' });
    setMessage('已准备，等待对手…');
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

  const key = (e: KeyboardEvent<HTMLDivElement>) => {
    const k = e.key.toLowerCase();
    if (mode === 'local' && phase === 'playing') {
      const p1: Record<string, string> = { a: 'left', d: 'right', w: 'cw', x: 'cw', z: 'ccw', q: 'ccw', ' ': 'drop', c: 'hold' };
      const p2: Record<string, string> = { arrowleft: 'left', arrowright: 'right', arrowup: 'cw', enter: 'drop', shift: 'hold' };
      if (k === 's') {
        e.preventDefault();
        down.current = true;
        return;
      }
      if (k === 'arrowdown') {
        e.preventDefault();
        down2.current = true;
        return;
      }
      if (p1[k]) {
        e.preventDefault();
        if (e.repeat && ['drop', 'hold', 'cw', 'ccw'].includes(p1[k]!)) return;
        act(p1[k]!, 0);
        return;
      }
      if (p2[k]) {
        e.preventDefault();
        if (e.repeat && ['drop', 'hold', 'cw', 'ccw'].includes(p2[k]!)) return;
        act(p2[k]!, 1);
      }
      return;
    }
    if (mode === 'online' && phase === 'playing') {
      const map: Record<string, string> = {
        arrowleft: 'left', a: 'left', arrowright: 'right', d: 'right',
        arrowup: 'cw', w: 'cw', x: 'cw', z: 'ccw', q: 'ccw',
        ' ': 'drop', c: 'hold', shift: 'hold',
      };
      if (k === 'arrowdown' || k === 's') {
        e.preventDefault();
        down.current = true;
        return;
      }
      if (map[k]) {
        e.preventDefault();
        if (e.repeat && ['drop', 'hold', 'cw', 'ccw'].includes(map[k]!)) return;
        act(map[k]!);
      }
      return;
    }
    if ((mode === 'online' && (phase === 'lobby' || phase === 'result') && (k === 'r' || k === 'enter')) || (mode === 'local' && phase === 'result' && k === 'r')) {
      e.preventDefault();
      if (mode === 'online') readyUp();
      else beginLocal();
    }
  };

  const g = localGame.current;
  const meReady = mySeat != null && players.some((p) => p.seat === mySeat && p.ready);
  const playing = phase === 'playing' && (mode === 'online' || mode === 'local');
  const stats = [
    ['得分', g.score.toLocaleString()],
    ['消行', String(g.lines)],
    ['等级', String(g.level)],
    ['待收垃圾', String(g.pending.length)],
  ];
  const boardStyle = immersive
    ? { width: boardFit.width, height: boardFit.height, display: 'block' as const, touchAction: 'none' as const }
    : { width: '100%', display: 'block' as const, touchAction: 'none' as const };

  const overlayTitle = (() => {
    if (error && mode === 'menu') return '联机暂不可用';
    if (phase === 'result') return resultText(result, mySeat, localWinner) || '本局结束';
    if (mode === 'menu') return '开始对战';
    if (phase === 'lobby') return players.length < 2 ? '等待对手加入' : '双方准备后开局';
    if (g.status === 'topout') return '已顶出';
    return '';
  })();

  const showOverlay = !playing || g.status === 'topout';

  return (
    <Page
      title="双人对战俄罗斯方块"
      summary="开一个房间号，邀请朋友联机对战。双方各一块场地、同一套方块顺序；消两行及以上会给对方堆垃圾行，先顶出者输掉。"
      width="wide"
      lang="zh-Hans"
    >
      <div className="tetris-intro tetris-vs-intro">
        <Text>
          手机可点「全屏游玩」：本方棋盘铺满屏幕，对手棋盘缩在角落，半透明十字键浮在棋盘上。手感与单机俄罗斯方块一致，对战中离开窗口不会自动暂停。联机需要 Worker 房间服务；若服务未启动，可先用同屏双人（两套键盘）练习。
        </Text>
      </div>
      <div
        ref={rootRef}
        className={'tetris-play tetris-vs-play' + (immersive ? ' is-on' : '')}
        tabIndex={0}
        onKeyDown={key}
        onKeyUp={(e: KeyboardEvent<HTMLDivElement>) => {
          const k = e.key.toLowerCase();
          if (['arrowdown', 's'].includes(k)) {
            e.preventDefault();
            down.current = false;
          }
          if (k === 'arrowdown') down2.current = false;
        }}
        onBlur={() => {
          down.current = false;
          down2.current = false;
        }}
        style={{ outline: 'none', color: theme.text.primary, fontFamily: theme.font.family }}
      >
        {!immersive && (
          <div className="tetris-page-actions tetris-vs-page-actions">
            <Button label="全屏游玩" variant="primary" onClick={enter} />
          </div>
        )}
        {immersive && (
          <div className="tetris-hud">
            <button type="button" className="gc-btn" onClick={exit}>退出全屏</button>
            <div className="tetris-hud-stats">
              {stats.map(([label, value]) => (
                <span key={label}><small>{label}</small>{value}</span>
              ))}
            </div>
            <div className="tetris-hud-actions">
              {mode === 'online' && (phase === 'lobby' || phase === 'result') && (
                <Button label={meReady ? '已准备' : '准备'} onClick={readyUp} disabled={meReady} />
              )}
            </div>
            <div className="tetris-hud-msg" aria-live="polite">{error || message}</div>
          </div>
        )}
        {!immersive && (
          <div className="tetris-vs-room" style={{ border: `1px solid ${theme.border.strong}` }}>
            {mode !== 'online' && (
              <div className="tetris-vs-room-row">
                <Button label={busy ? '正在创建…' : '创建房间'} variant="primary" onClick={() => void createRoom()} disabled={busy} />
                <label className="tetris-vs-join">
                  房间号
                  <input
                    value={joinInput}
                    onChange={(ev) => setJoinInput(normalizeRoomCode(ev.target.value))}
                    maxLength={6}
                    spellCheck={false}
                    autoCapitalize="characters"
                    placeholder="例如 7K3P2"
                  />
                </label>
                <Button label="加入房间" onClick={() => void joinRoom(joinInput)} disabled={busy} />
                <Button label="同屏双人（键盘）" onClick={beginLocal} disabled={busy} />
              </div>
            )}
            {mode === 'online' && roomCode && (
              <div className="tetris-vs-room-row">
                <div className="tetris-vs-code">房间号 <strong>{roomCode}</strong></div>
                <Button label={copied ? '已复制' : '复制链接'} onClick={() => void copyLink()} />
                {(phase === 'lobby' || phase === 'result') && (
                  <Button label={meReady ? '已准备' : '准备 / 再赛'} variant="primary" onClick={readyUp} disabled={meReady} />
                )}
                <Button label="离开房间" onClick={leaveRoom} />
              </div>
            )}
            {mode === 'online' && (
              <div className="tetris-vs-seats">
                {[0, 1].map((seat) => {
                  const p = players.find((item) => item.seat === seat);
                  const label = seat === mySeat ? '我' : '对手';
                  return (
                    <span key={seat}>
                      {label}：{!p ? '空位' : `${p.connected ? '在线' : '离线'} · ${p.ready ? '已准备' : '未准备'}`}
                    </span>
                  );
                })}
              </div>
            )}
            {mode === 'local' && (
              <div className="tetris-vs-room-row">
                <Button label="重新开局" onClick={beginLocal} />
                <Button label="返回房间模式" onClick={leaveRoom} />
              </div>
            )}
            <div className="tetris-vs-room-msg" aria-live="polite">{error || message}</div>
            {error && mode === 'menu' && <div className="tetris-vs-room-msg">联机失败时不会出现空白页，可重试或改用同屏双人。</div>}
          </div>
        )}
        <div ref={stageRef} className="tetris-stage tetris-vs-stage">
          <div className="tetris-board tetris-vs-local" style={{ border: `1px solid ${theme.border.strong}` }}>
            <canvas ref={localRef} width={300} height={600} aria-label="我的俄罗斯方块场地" onClick={() => rootRef.current?.focus({ preventScroll: true })} style={boardStyle} />
            {showOverlay && (
              <div className="tetris-overlay" style={{ background: theme.bg.base + 'e8' }}>
                <div style={{ textAlign: 'center', padding: 20, color: theme.text.primary, background: theme.bg.base }}>
                  <div style={{ fontSize: immersive ? 22 : 26, fontWeight: 600, marginBottom: 12 }}>{overlayTitle}</div>
                  <div style={{ fontSize: 14, marginBottom: 20, color: theme.text.secondary }}>{error || message}</div>
                  <div className="tetris-overlay-actions">
                    {mode === 'menu' && <Button label={busy ? '正在创建…' : '创建房间'} variant="primary" onClick={() => void createRoom()} disabled={busy} />}
                    {mode === 'menu' && <Button label="同屏双人" onClick={beginLocal} />}
                    {mode === 'online' && (phase === 'lobby' || phase === 'result') && (
                      <Button label={meReady ? '已准备' : '准备'} variant="primary" onClick={readyUp} disabled={meReady} />
                    )}
                    {mode === 'local' && phase === 'result' && <Button label="再来一局" variant="primary" onClick={beginLocal} />}
                    {mode === 'online' && <Button label="离开房间" onClick={leaveRoom} />}
                    {!immersive && <Button label="全屏游玩" onClick={enter} />}
                  </div>
                </div>
              </div>
            )}
          </div>
          <div className="tetris-vs-rival" style={{ border: `1px solid ${theme.border.strong}` }}>
            <div className="tetris-vs-rival-label">{mode === 'local' ? '玩家二' : '对手'}</div>
            <canvas ref={rivalRef} width={300} height={600} aria-label="对手的俄罗斯方块场地" />
          </div>
          <div className="tetris-side tetris-vs-side">
            <div className="tetris-stats">
              {stats.map(([label, value]) => (
                <div key={label}>
                  <div style={{ fontSize: 13, color: theme.text.secondary }}>{label}</div>
                  <div style={{ fontSize: 30, fontWeight: 600, fontVariantNumeric: 'tabular-nums' }}>{value}</div>
                </div>
              ))}
            </div>
            <canvas
              ref={previewRef}
              width={180}
              height={330}
              aria-label={`接下来：${g.queue.join('、')}；暂存：${g.hold ?? '无'}。点击暂存当前方块`}
              className="tetris-preview"
              role="button"
              onClick={() => act('hold')}
            />
            <div className="tetris-side-msg" aria-live="polite">{error || message}</div>
          </div>
        </div>
        <HandheldPad
          className="tetris-virtual-pad"
          overlay={immersive}
          disabled={!playing || g.status !== 'running'}
          dirs={{
            left: { mode: 'tap-repeat', onPress: () => act('left'), ariaLabel: '左移' },
            right: { mode: 'tap-repeat', onPress: () => act('right'), ariaLabel: '右移' },
            down: { mode: 'hold', onDown: () => { if (playing && g.status === 'running') down.current = true; }, onUp: () => { down.current = false; }, ariaLabel: '软降' },
            up: { mode: 'tap', onPress: () => act('drop'), ariaLabel: '硬降' },
          }}
          actions={[{ label: '↻', ariaLabel: '顺时针旋转', onPress: () => act('cw') }]}
        />
        <div className="tetris-help tetris-vs-help">
          触控与单机相同：← → 移动，按住 ↓ 软降，↑ 硬降，右侧 ↻ 旋转；点 NEXT/HOLD 可暂存。联机键盘与单机一致（← → / A D 移动，↓ / S 软降，↑ / W / X 顺时针，Z / Q 逆时针，空格硬降，C / Shift 暂存）。同屏双人时玩家一用 WASD + 空格 + C，玩家二用方向键（↑ 旋转）+ Enter 硬降 + Shift 暂存。
          <br />
          双方使用同一套七袋方块顺序。消除 1 / 2 / 3 / 4 行分别向对手送出 0 / 1 / 2 / 4 行垃圾（垃圾从底部推入，每行一个随机缺口，在当前方块锁定后再堆上）。先堆顶者判负；几乎同时顶出则平局。房间最多两人；对手掉线会等待短暂重连，超时则本局结束。再赛需要双方再次点准备。对战中不会因切走窗口而自动暂停。
        </div>
      </div>
    </Page>
  );
}
