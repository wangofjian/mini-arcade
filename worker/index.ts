import { DurableObject } from 'cloudflare:workers';
import {
  DRAW_ALARM_MS,
  DRAW_GRACE_MS,
  RECONNECT_MS,
  type ClientMessage,
  type PlayerView,
  type ResultReason,
  type RoomPhase,
  type Seat,
  type ServerMessage,
} from '../src/rules/tetrisVsNet';
import { generateRoomCode, isValidRoomCode, newMatchSeed, normalizeRoomCode } from '../src/rules/tetrisVersus';
import { GomokuVsRoom } from './gomokuVsRoom';
import { json } from './http';

export { GomokuVsRoom };

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
  seed: number | null;
  round: number;
  topouts: [number | null, number | null];
  result: { winner: Seat | 'draw'; reason: ResultReason } | null;
  alarmKind: 'none' | 'reconnect' | 'draw';
};

function emptyRoom(): RoomRecord {
  return {
    created: false,
    phase: 'lobby',
    seats: [null, null],
    seed: null,
    round: 0,
    topouts: [null, null],
    result: null,
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

export class TetrisVsRoom extends DurableObject<Env> {
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
    return { type: 'room', players: views(room), phase: room.phase, seed: room.seed, round: room.round };
  }

  async create(): Promise<{ created: boolean; code?: string }> {
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
    this.send(server, {
      type: 'joined',
      seat,
      playerId,
      room: url.searchParams.get('room') ?? '',
      players: views(room),
      phase: room.phase,
      seed: room.seed,
      round: room.round,
    });
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
        this.send(ws, {
          type: 'joined',
          seat: who.seat,
          playerId: who.playerId,
          room: '',
          players: views(room),
          phase: room.phase,
          seed: room.seed,
          round: room.round,
        });
        return;
      case 'ping':
        this.send(ws, { type: 'pong' });
        return;
      case 'ready':
      case 'rematch':
        await this.onReady(room, who.seat, ws);
        return;
      case 'state':
        if (room.phase === 'playing') {
          this.broadcast({ type: 'state', from: who.seat, snapshot: msg.snapshot, seq: msg.seq }, ws);
          await this.maybeResolveAfterTopout(room);
        }
        return;
      case 'garbage':
        if (room.phase === 'playing') {
          this.broadcast({ type: 'garbage', from: who.seat, rows: msg.rows, gaps: msg.gaps, seq: msg.seq }, ws);
        }
        return;
      case 'topout':
        await this.onTopout(room, who.seat);
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
      room.seed = newMatchSeed();
      room.round += 1;
      room.topouts = [null, null];
      room.result = null;
      room.alarmKind = 'none';
      await this.ctx.storage.deleteAlarm();
      await this.save(room);
      this.broadcast({ type: 'start', seed: room.seed, round: room.round });
      this.broadcast(this.roomPayload(room));
      return;
    }
    await this.save(room);
    this.broadcast(this.roomPayload(room));
  }

  private async onTopout(room: RoomRecord, seat: Seat): Promise<void> {
    if (room.phase !== 'playing') return;
    if (room.topouts[seat] != null) return;
    room.topouts[seat] = Date.now();
    if (room.topouts[otherSeat(seat)] != null) {
      await this.finish(room, 'draw', 'topout');
      return;
    }
    room.alarmKind = 'draw';
    await this.save(room);
    await this.ctx.storage.setAlarm(Date.now() + DRAW_ALARM_MS);
  }

  private async maybeResolveAfterTopout(room: RoomRecord): Promise<void> {
    if (room.phase !== 'playing') return;
    const [a, b] = room.topouts;
    if (a == null && b == null) return;
    if (a != null && b != null) {
      await this.finish(room, 'draw', 'topout');
      return;
    }
    const first = a ?? b!;
    if (Date.now() - first >= DRAW_GRACE_MS) {
      const loser: Seat = a != null ? 0 : 1;
      await this.finish(room, otherSeat(loser), 'topout');
    }
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
    this.broadcast({ type: 'result', winner, reason });
    this.broadcast(this.roomPayload(room));
  }

  private async onLeave(room: RoomRecord, seat: Seat, ws: WebSocket): Promise<void> {
    this.detachSeat(room, seat, false);
    await this.save(room);
    try {
      ws.close(1000, 'leave');
    } catch {
      /* already closing */
    }
    this.broadcast(this.roomPayload(room));
    if (room.phase === 'playing') await this.finish(room, otherSeat(seat), 'disconnect');
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
    // A replacement socket for the same player may already be connected.
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
    console.error('tetris-vs websocket error', error);
    await this.webSocketClose(ws, 1011, 'error');
  }

  async alarm(): Promise<void> {
    const room = await this.load();
    const kind = room.alarmKind;
    room.alarmKind = 'none';
    if (kind === 'draw' && room.phase === 'playing') {
      const [a, b] = room.topouts;
      if (a != null && b != null) await this.finish(room, 'draw', 'topout');
      else if (a != null) await this.finish(room, 1, 'topout');
      else if (b != null) await this.finish(room, 0, 'topout');
      else await this.save(room);
      return;
    }
    if (kind === 'reconnect') {
      let changed = false;
      for (const seat of [0, 1] as Seat[]) {
        const s = room.seats[seat];
        if (!s || s.connected) continue;
        if (s.disconnectAt != null && Date.now() - s.disconnectAt >= RECONNECT_MS - 50) {
          if (room.phase === 'playing') {
            await this.finish(room, otherSeat(seat), 'disconnect');
            return;
          }
          room.seats[seat] = null;
          changed = true;
        }
      }
      if (changed) {
        await this.save(room);
        this.broadcast(this.roomPayload(room));
      } else {
        await this.save(room);
      }
    }
  }
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);
    const path = url.pathname;

    if (path === '/api/tetris-vs/rooms' && request.method === 'POST') {
      for (let i = 0; i < 8; i++) {
        const code = generateRoomCode();
        const stub = env.TETRIS_VS_ROOMS.getByName(code);
        const result = await stub.create();
        if (result.created) return json({ code });
      }
      return json({ error: 'unavailable', message: '暂时无法创建房间，请稍后再试。' }, 503);
    }

    const listed = path.match(/^\/api\/tetris-vs\/rooms\/([^/]+)$/);
    if (listed && request.method === 'GET') {
      const code = normalizeRoomCode(decodeURIComponent(listed[1] ?? ''));
      if (!isValidRoomCode(code)) return json({ exists: false, error: 'invalid', message: '房间号格式不正确。' }, 400);
      const info = await env.TETRIS_VS_ROOMS.getByName(code).info();
      if (!info.exists) return json({ exists: false, message: '房间不存在。' }, 404);
      return json({ exists: true, code, phase: info.phase, players: info.players, seats: info.seats });
    }

    if (path === '/api/tetris-vs/ws' && request.method === 'GET') {
      if (request.headers.get('Upgrade') !== 'websocket') {
        return new Response('需要 WebSocket 升级。', { status: 426 });
      }
      const code = normalizeRoomCode(url.searchParams.get('room') ?? '');
      if (!isValidRoomCode(code)) return json({ error: 'invalid', message: '房间号格式不正确。' }, 400);
      const stub = env.TETRIS_VS_ROOMS.getByName(code);
      const info = await stub.info();
      if (!info.exists) return json({ error: 'not_found', message: '房间不存在。' }, 404);
      const forward = new URL(request.url);
      forward.searchParams.set('room', code);
      return stub.fetch(new Request(forward, request));
    }

    if (path === '/api/gomoku-vs/rooms' && request.method === 'POST') {
      for (let i = 0; i < 8; i++) {
        const code = generateRoomCode();
        const stub = env.GOMOKU_VS_ROOMS.getByName(code);
        const result = await stub.create();
        if (result.created) return json({ code });
      }
      return json({ error: 'unavailable', message: '暂时无法创建房间，请稍后再试。' }, 503);
    }

    const gomokuListed = path.match(/^\/api\/gomoku-vs\/rooms\/([^/]+)$/);
    if (gomokuListed && request.method === 'GET') {
      const code = normalizeRoomCode(decodeURIComponent(gomokuListed[1] ?? ''));
      if (!isValidRoomCode(code)) return json({ exists: false, error: 'invalid', message: '房间号格式不正确。' }, 400);
      const info = await env.GOMOKU_VS_ROOMS.getByName(code).info();
      if (!info.exists) return json({ exists: false, message: '房间不存在。' }, 404);
      return json({ exists: true, code, phase: info.phase, players: info.players, seats: info.seats });
    }

    if (path === '/api/gomoku-vs/ws' && request.method === 'GET') {
      if (request.headers.get('Upgrade') !== 'websocket') {
        return new Response('需要 WebSocket 升级。', { status: 426 });
      }
      const code = normalizeRoomCode(url.searchParams.get('room') ?? '');
      if (!isValidRoomCode(code)) return json({ error: 'invalid', message: '房间号格式不正确。' }, 400);
      const stub = env.GOMOKU_VS_ROOMS.getByName(code);
      const info = await stub.info();
      if (!info.exists) return json({ error: 'not_found', message: '房间不存在。' }, 404);
      const forward = new URL(request.url);
      forward.searchParams.set('room', code);
      return stub.fetch(new Request(forward, request));
    }

    return json({ error: 'not_found', message: '未知接口。' }, 404);
  },
} satisfies ExportedHandler<Env>;
