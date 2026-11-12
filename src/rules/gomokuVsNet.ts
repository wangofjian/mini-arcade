import type { Point, Seat, Stone } from './gomoku';

export type { Seat, Point, Stone };
export type RoomPhase = 'lobby' | 'playing' | 'result';
export type ResultReason = 'five' | 'draw' | 'disconnect';

export type PlayerView = {
  seat: Seat;
  ready: boolean;
  connected: boolean;
};

export type ClientMessage =
  | { type: 'join'; playerId: string }
  | { type: 'ready' }
  | { type: 'place'; r: number; c: number }
  | { type: 'rematch' }
  | { type: 'ping' }
  | { type: 'leave' };

export type ServerMessage =
  | {
      type: 'joined';
      seat: Seat;
      playerId: string;
      room: string;
      players: PlayerView[];
      phase: RoomPhase;
      round: number;
      board: Stone[][];
      turn: Seat;
      lastMove: Point | null;
      winningLine: number[][];
      result: { winner: Seat | 'draw'; reason: ResultReason } | null;
    }
  | { type: 'room'; players: PlayerView[]; phase: RoomPhase; round: number }
  | { type: 'start'; round: number; board: Stone[][]; turn: Seat }
  | {
      type: 'placed';
      r: number;
      c: number;
      seat: Seat;
      board: Stone[][];
      turn: Seat;
      lastMove: Point;
      winningLine: number[][];
    }
  | {
      type: 'result';
      winner: Seat | 'draw';
      reason: ResultReason;
      board: Stone[][];
      lastMove: Point | null;
      winningLine: number[][];
    }
  | { type: 'opponent_left'; reconnectMs: number }
  | { type: 'opponent_rejoined' }
  | { type: 'error'; code: 'room_full' | 'not_found' | 'invalid' | 'unavailable' | 'bad_message' | 'illegal_move'; message: string }
  | { type: 'pong' };

export const RECONNECT_MS = 15_000;
