import { DurableObject } from 'cloudflare:workers';
import {
  emptyBoard,
  ILLEGAL_MESSAGES,
  placeStone,
  type Seat,
  type Stone,
} from '../src/rules/gomoku';
import {
  RECONNECT_MS,
  type ClientMessage,
  type PlayerView,
  type Point,
  type ResultReason,
  type RoomPhase,
  type ServerMessage,
} from '../src/rules/gomokuVsNet';
import { json } from './http';

type SeatState = {
  playerId: string;
  ready: boolean;
  connected: boolean;
  disconnectAt: number | null;
};

type RoomRecord = {
  created: boolean;
  phase: RoomPhase;
  seats: [SeatState | null, SeatState | null];
  board: Stone[][];
  turn: Seat;
  lastMove: Point | null;
  winningLine: number[][];
  result: { winner: Seat | 'draw'; reason: ResultReason } | null;
  round: number;
  alarmKind: 'none' | 'reconnect';
};

function emptyRoom(): RoomRecord {
  return {
    created: false,
    phase: 'lobby',
    seats: [null, null],
    board: emptyBoard(),
    turn: 0,
    lastMove: null,
    winningLine: [],
    result: null,
    round: 0,
    alarmKind: 'none',
  };
}

function views(room: RoomRecord): PlayerView[] {
  const out: PlayerView[] = [];
  for (const seat of [0, 1] as Seat[]) {
    const s = room.seats[seat];
    if (s) out.push({ seat, ready: s.ready, connected: s.connected });
  }
  return out;
}

function occupied(room: RoomRecord): number {
  return room.seats.filter(Boolean).length;
}

function otherSeat(seat: Seat): Seat {
  return seat === 0 ? 1 : 0;
}

function parseClient(raw: string): ClientMessage | null {
  try {
    const msg = JSON.parse(raw) as ClientMessage;
    if (!msg || typeof msg !== 'object' || typeof msg.type !== 'string') return null;
    return msg;
  } catch {
    return null;
  }
}

export class GomokuVsRoom extends DurableObject<Env> {
  constructor(ctx: DurableObjectState, env: Env) {
    super(ctx, env);
    this.ctx.setWebSocketAutoResponse(new WebSocketRequestResponsePair('ping', 'pong'));
  }

  private async load(): Promise<RoomRecord> {
    return (await this.ctx.storage.get<RoomRecord>('room')) ?? emptyRoom();
  }

  private async save(room: RoomRecord): Promise<void> {
    await this.ctx.storage.put('room', room);
  }

  private send(ws: WebSocket, msg: ServerMessage): void {
    try {
      ws.send(JSON.stringify(msg));
    } catch {
      // Socket may already be closing.
    }
  }

  private broadcast(msg: ServerMessage, except?: WebSocket): void {
    for (const ws of this.ctx.getWebSockets()) {
      if (except && ws === except) continue;
      this.send(ws, msg);
    }
  }

  private roomPayload(room: RoomRecord): ServerMessage {
    return { type: 'room', players: views(room), phase: room.phase, round: room.round };
  }

  private snapshot(room: RoomRecord, seat: Seat, playerId: string, code: string): ServerMessage {
    return {
      type: 'joined',
      seat,
      playerId,
      room: code,
      players: views(room),
      phase: room.phase,
      round: room.round,
      board: room.board,
      turn: room.turn,
      lastMove: room.lastMove,
      winningLine: room.winningLine,
      result: room.result,
    };
  }

  async create(): Promise<{ created: boolean }> {
    const room = await this.load();
    if (room.created) return { created: false };
    room.created = true;
    room.phase = 'lobby';
    await this.save(room);
    return { created: true };
  }

  async info(): Promise<{ exists: boolean; phase?: RoomPhase; players?: number; seats?: PlayerView[] }> {
    const room = await this.load();
    if (!room.created) return { exists: false };
    return { exists: true, phase: room.phase, players: occupied(room), seats: views(room) };
  }

  async fetch(request: Request): Promise<Response> {
    const url = new URL(request.url);
    if (request.headers.get('Upgrade') !== 'websocket') {
      return json({ error: 'expected_websocket' }, 426);
    }
    const room = await this.load();
    if (!room.created) return json({ error: 'not_found', message: '房间不存在或已失效。' }, 404);

    const playerId = (url.searchParams.get('player') ?? '').trim();
    if (!playerId) return json({ error: 'invalid', message: '缺少玩家标识。' }, 400);

    const rejoining = this.findSeat(room, playerId) !== null;
    let seat = this.findSeat(room, playerId);
    if (seat === null) {
      const empty = room.seats[0] ? (room.seats[1] ? null : 1) : 0;
      if (empty === null) return json({ error: 'room_full', message: '房间已满，第三人不能加入。' }, 409);
      seat = empty as Seat;
      room.seats[seat] = { playerId, ready: false, connected: true, disconnectAt: null };
    } else {
      const existing = room.seats[seat]!;
      existing.connected = true;
      existing.disconnectAt = null;
    }
    await this.save(room);

    const pair = new WebSocketPair();
    const [client, server] = Object.values(pair);
    this.ctx.acceptWebSocket(server, [String(seat), playerId]);
    server.serializeAttachment({ seat, playerId });
    this.send(server, this.snapshot(room, seat, playerId, url.searchParams.get('room') ?? ''));
    this.broadcast(this.roomPayload(room), server);
    const other = room.seats[otherSeat(seat)];
    if (rejoining && other?.connected) this.broadcast({ type: 'opponent_rejoined' }, server);
    if (room.seats[0]?.connected && room.seats[1]?.connected && room.alarmKind === 'reconnect') {
      room.alarmKind = 'none';
      await this.ctx.storage.deleteAlarm();
      await this.save(room);
    }
    return new Response(null, { status: 101, webSocket: client });
  }

  private findSeat(room: RoomRecord, playerId: string): Seat | null {
    if (room.seats[0]?.playerId === playerId) return 0;
    if (room.seats[1]?.playerId === playerId) return 1;
    return null;
  }

  private attachment(ws: WebSocket): { seat: Seat; playerId: string } | null {
    const data = ws.deserializeAttachment() as { seat?: Seat; playerId?: string } | null;
    if (!data || (data.seat !== 0 && data.seat !== 1) || !data.playerId) return null;
    return { seat: data.seat, playerId: data.playerId };
  }

  async webSocketMessage(ws: WebSocket, message: string | ArrayBuffer): Promise<void> {
    if (typeof message !== 'string') return;
    if (message === 'ping') {
      this.send(ws, { type: 'pong' });
      return;
    }
    const msg = parseClient(message);
    if (!msg) {
      this.send(ws, { type: 'error', code: 'bad_message', message: '无法解析的消息。' });
      return;
    }
    const who = this.attachment(ws);
    if (!who) {
      this.send(ws, { type: 'error', code: 'invalid', message: '会话已失效，请重新加入。' });
      return;
    }
    const room = await this.load();
    if (!room.created) {
      this.send(ws, { type: 'error', code: 'not_found', message: '房间不存在或已失效。' });
      return;
    }

    switch (msg.type) {
      case 'join':
        this.send(ws, this.snapshot(room, who.seat, who.playerId, ''));
        return;
      case 'ping':
        this.send(ws, { type: 'pong' });
        return;
      case 'ready':
      case 'rematch':
        await this.onReady(room, who.seat, ws);
        return;
      case 'place':
        await this.onPlace(room, who.seat, msg.r, msg.c, ws);
        return;
      case 'leave':
        await this.onLeave(room, who.seat, ws);
        return;
      default:
        this.send(ws, { type: 'error', code: 'bad_message', message: '未知消息类型。' });
    }
  }

  private async onReady(room: RoomRecord, seat: Seat, ws: WebSocket): Promise<void> {
    if (room.phase === 'playing') {
      this.send(ws, { type: 'error', code: 'invalid', message: '对局进行中，不能重复准备。' });
      return;
    }
    const self = room.seats[seat];
    if (!self) return;
    self.ready = true;
    const a = room.seats[0];
    const b = room.seats[1];
    if (a?.ready && b?.ready && a.connected && b.connected) {
      a.ready = false;
      b.ready = false;
      room.phase = 'playing';
      room.board = emptyBoard();
      room.turn = 0;
      room.lastMove = null;
      room.winningLine = [];
      room.result = null;
      room.round += 1;
      room.alarmKind = 'none';
      await this.ctx.storage.deleteAlarm();
      await this.save(room);
      this.broadcast({ type: 'start', round: room.round, board: room.board, turn: 0 });
      this.broadcast(this.roomPayload(room));
      return;
    }
    await this.save(room);
    this.broadcast(this.roomPayload(room));
  }

  private async onPlace(room: RoomRecord, seat: Seat, r: number, c: number, ws: WebSocket): Promise<void> {
    if (typeof r !== 'number' || typeof c !== 'number') {
      this.send(ws, { type: 'error', code: 'illegal_move', message: '落子坐标无效。' });
      return;
    }
    const result = placeStone(room.board, r, c, seat, room.turn, room.phase);
    if (!result.ok) {
      this.send(ws, { type: 'error', code: 'illegal_move', message: ILLEGAL_MESSAGES[result.reason] });
      return;
    }
    room.board = result.board;
    room.lastMove = result.lastMove;
    room.winningLine = result.winningLine;
    if (result.ended) {
      const reason: ResultReason = result.winner === 'draw' ? 'draw' : 'five';
      this.broadcast({
        type: 'placed',
        r: result.lastMove.r,
        c: result.lastMove.c,
        seat,
        board: room.board,
        turn: room.turn,
        lastMove: result.lastMove,
        winningLine: result.winningLine,
      });
      await this.finish(room, result.winner ?? 'draw', reason);
      return;
    }
    room.turn = otherSeat(seat);
    await this.save(room);
    this.broadcast({
      type: 'placed',
      r: result.lastMove.r,
      c: result.lastMove.c,
      seat,
      board: room.board,
      turn: room.turn,
      lastMove: result.lastMove,
      winningLine: result.winningLine,
    });
  }

  private async finish(room: RoomRecord, winner: Seat | 'draw', reason: ResultReason): Promise<void> {
    if (room.phase === 'result' && room.result) return;
    room.phase = 'result';
    room.result = { winner, reason };
    room.alarmKind = 'none';
    if (room.seats[0]) room.seats[0].ready = false;
    if (room.seats[1]) room.seats[1].ready = false;
    await this.ctx.storage.deleteAlarm();
    await this.save(room);
    this.broadcast({
      type: 'result',
      winner,
      reason,
      board: room.board,
      lastMove: room.lastMove,
      winningLine: room.winningLine,
    });
    this.broadcast(this.roomPayload(room));
  }

  private async onLeave(room: RoomRecord, seat: Seat, ws: WebSocket): Promise<void> {
    const wasPlaying = room.phase === 'playing';
    this.detachSeat(room, seat, false);
    await this.save(room);
    try {
      ws.close(1000, 'leave');
    } catch {
      /* already closing */
    }
    this.broadcast(this.roomPayload(room));
    if (wasPlaying) await this.finish(room, otherSeat(seat), 'disconnect');
  }

  private detachSeat(room: RoomRecord, seat: Seat, keepForReconnect: boolean): void {
    const s = room.seats[seat];
    if (!s) return;
    if (keepForReconnect) {
      s.connected = false;
      s.disconnectAt = Date.now();
    } else {
      room.seats[seat] = null;
    }
  }

  async webSocketClose(ws: WebSocket, code: number, reason: string): Promise<void> {
    try {
      ws.close(code, reason);
    } catch {
      /* auto-reply may already have closed it */
    }
    const who = this.attachment(ws);
    if (!who) return;
    const room = await this.load();
    const seat = room.seats[who.seat];
    if (!seat || seat.playerId !== who.playerId) return;
    const stillOpen = this.ctx.getWebSockets().some((other) => {
      if (other === ws) return false;
      const att = this.attachment(other);
      return att?.playerId === who.playerId;
    });
    if (stillOpen) return;
    seat.connected = false;
    seat.disconnectAt = Date.now();
    room.alarmKind = 'reconnect';
    await this.save(room);
    this.broadcast({ type: 'opponent_left', reconnectMs: RECONNECT_MS });
    this.broadcast(this.roomPayload(room));
    await this.ctx.storage.setAlarm(Date.now() + RECONNECT_MS);
  }

  async webSocketError(ws: WebSocket, error: unknown): Promise<void> {
    console.error('gomoku-vs websocket error', error);
    await this.webSocketClose(ws, 1011, 'error');
  }

  async alarm(): Promise<void> {
    const room = await this.load();
    const kind = room.alarmKind;
    room.alarmKind = 'none';
    if (kind !== 'reconnect') {
      await this.save(room);
      return;
    }
    for (const seat of [0, 1] as Seat[]) {
      const s = room.seats[seat];
      if (!s || s.connected) continue;
      if (s.disconnectAt != null && Date.now() - s.disconnectAt >= RECONNECT_MS - 50) {
        if (room.phase === 'playing') {
          await this.finish(room, otherSeat(seat), 'disconnect');
          return;
        }
        room.seats[seat] = null;
      }
    }
    await this.save(room);
    this.broadcast(this.roomPayload(room));
  }
}
