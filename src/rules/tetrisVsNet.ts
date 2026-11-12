import type { BoardSnapshot } from './tetrisVersus';

export type Seat = 0 | 1;
export type RoomPhase = 'lobby' | 'playing' | 'result';
export type ResultReason = 'topout' | 'disconnect';

export type PlayerView = {
  seat: Seat;
  ready: boolean;
  connected: boolean;
};

export type ClientMessage =
  | { type: 'join'; playerId: string }
  | { type: 'ready' }
  | { type: 'state'; snapshot: BoardSnapshot; seq: number }
  | { type: 'garbage'; rows: number; gaps: number[]; seq: number }
  | { type: 'topout'; seq: number }
  | { type: 'rematch' }
  | { type: 'ping' }
  | { type: 'leave' };

export type ServerMessage =
  | { type: 'joined'; seat: Seat; playerId: string; room: string; players: PlayerView[]; phase: RoomPhase; seed: number | null; round: number }
  | { type: 'room'; players: PlayerView[]; phase: RoomPhase; seed: number | null; round: number }
  | { type: 'start'; seed: number; round: number }
  | { type: 'state'; from: Seat; snapshot: BoardSnapshot; seq: number }
  | { type: 'garbage'; from: Seat; rows: number; gaps: number[]; seq: number }
  | { type: 'result'; winner: Seat | 'draw'; reason: ResultReason }
  | { type: 'opponent_left'; reconnectMs: number }
  | { type: 'opponent_rejoined' }
  | { type: 'error'; code: 'room_full' | 'not_found' | 'invalid' | 'unavailable' | 'bad_message'; message: string }
  | { type: 'pong' };

export const RECONNECT_MS = 15_000;
export const DRAW_GRACE_MS = 400;
export const DRAW_ALARM_MS = 1_000;
