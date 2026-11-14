/** 小场争锋：2D 俯视 3v3 动作足球（玩家控一人，队友与对手为简单 AI）。 */

import { parseLevelSave, type LevelSave } from './progressSave';

export const PC_VIEW_W = 960;
export const PC_VIEW_H = 540;
export const PC_DT = 1 / 60;
export const PC_SAVE_KEY = 'pitch-clash-save';
export const PC_LEVEL_COUNT = 8;

export const PC_LEFT = 80;
export const PC_RIGHT = 880;
export const PC_TOP = 70;
export const PC_BOTTOM = 500;
export const PC_CX = (PC_LEFT + PC_RIGHT) / 2;
export const PC_CY = (PC_TOP + PC_BOTTOM) / 2;
export const PC_GOAL_H = 140;
export const PC_GOAL_TOP = PC_CY - PC_GOAL_H / 2;
export const PC_GOAL_BOT = PC_CY + PC_GOAL_H / 2;
export const PC_PLAYER_R = 13;
export const PC_BALL_R = 6.5;
export const PC_CONTROL_R = 22;
export const PC_PASS_SPEED = 330;
export const PC_SHOT_SPEED = 470;
export const PC_PLAYER_SPEED = 228;
export const PC_ACCEL = 780;
export const PC_FRICTION = 420;
export const PC_BALL_FRICTION = 155;

export type PcMode = 'firstTo' | 'timed';
export type PcPhase = 'countdown' | 'play' | 'kickoff' | 'goal' | 'won' | 'lost' | 'draw';

export type PcLevel = {
  id: number;
  name: string;
  venue: 'home' | 'away';
  opponent: string;
  mode: PcMode;
  /** firstTo：先到达的进球数；timed：比赛秒数。 */
  target: number;
  maxTime: number;
  oppSkill: number;
  defBias: number;
  atkBias: number;
  starGd: number;
  hint: string;
};

export type PcInput = {
  up: boolean;
  down: boolean;
  left: boolean;
  right: boolean;
  pass: boolean;
  shoot: boolean;
};

export const EMPTY_PC_INPUT: PcInput = { up: false, down: false, left: false, right: false, pass: false, shoot: false };

export type PcActor = {
  id: number;
  team: 0 | 1;
  role: 'player' | 'fwd' | 'def' | 'oppFwd' | 'oppMid' | 'oppDef';
  name: string;
  x: number;
  y: number;
  vx: number;
  vy: number;
  facing: number;
  stun: number;
  kickLock: number;
  pickLock: number;
  speed: number;
};

export type PcBall = { x: number; y: number; vx: number; vy: number };

export type PcMatch = {
  level: PcLevel;
  phase: PcPhase;
  phaseT: number;
  time: number;
  score: [number, number];
  stars: number;
  message: string;
  players: PcActor[];
  ball: PcBall;
  carrier: number | null;
  lastTouch: number | null;
  kickingTeam: 0 | 1;
  prevPass: boolean;
  prevShoot: boolean;
  acc: number;
  freezeAi: boolean;
  skipCountdown: boolean;
  seed: number;
  rng: { s: number };
  finished: boolean;
  lastGoalTeam: 0 | 1 | null;
  kickoffLive: boolean;
};

export const PC_LEVELS: PcLevel[] = [
  {
    id: 1, name: '巷口热身', venue: 'home', opponent: '赤巷队',
    mode: 'firstTo', target: 2, maxTime: 90, oppSkill: 0.38, defBias: 1, atkBias: 1, starGd: 2,
    hint: '先攻入两球即可。对手较慢，自己带球到门前再射。',
  },
  {
    id: 2, name: '里弄限时', venue: 'home', opponent: '沙洲队',
    mode: 'timed', target: 70, maxTime: 70, oppSkill: 0.5, defBias: 1, atkBias: 1, starGd: 2,
    hint: '限时比赛，结束时进球多者获胜。净胜两球可拿三星。',
  },
  {
    id: 3, name: '先下三城', venue: 'home', opponent: '码头队',
    mode: 'firstTo', target: 3, maxTime: 110, oppSkill: 0.56, defBias: 1, atkBias: 1, starGd: 2,
    hint: '先攻入三球。传球给前插的队友，别只顾自己盘。',
  },
  {
    id: 4, name: '客场抢分', venue: 'away', opponent: '砖窑队',
    mode: 'timed', target: 75, maxTime: 75, oppSkill: 0.62, defBias: 1, atkBias: 1, starGd: 2,
    hint: '客场限时。守住球门的同时抓住反击。',
  },
  {
    id: 5, name: '坚城攻坚', venue: 'home', opponent: '枫桥队',
    mode: 'firstTo', target: 2, maxTime: 100, oppSkill: 0.66, defBias: 1.28, atkBias: 0.85, starGd: 2,
    hint: '对手收缩防守。把球传到禁区再射。',
  },
  {
    id: 6, name: '对攻快打', venue: 'home', opponent: '泥湾队',
    mode: 'timed', target: 65, maxTime: 65, oppSkill: 0.6, defBias: 0.92, atkBias: 1.12, starGd: 2,
    hint: '两边都压上。进球也要回防，别被反击打穿。',
  },
  {
    id: 7, name: '客场杯赛', venue: 'away', opponent: '崖口队',
    mode: 'firstTo', target: 3, maxTime: 120, oppSkill: 0.74, defBias: 1.08, atkBias: 1, starGd: 2,
    hint: '客场先下三城。稳一传一，别在后场丢球。',
  },
  {
    id: 8, name: '短场决赛', venue: 'home', opponent: '埠头队',
    mode: 'timed', target: 80, maxTime: 80, oppSkill: 0.78, defBias: 1.05, atkBias: 1.05, starGd: 2,
    hint: '决赛限时。赢且净胜两球为三星。',
  },
];

export const PC_OUR_NAME = '柳岸队';
export const PC_OUR_SHORT = '柳岸';
export const PC_OUR_COLOR = '#2a6fb0';
export const PC_OUR_COLOR2 = '#d8ebff';

const OUR_NAMES = ['阿南', '小禾', '老渠'];
const OPP_POOL = ['石远', '谭秋', '贺舟', '祁满', '龚岸', '岑白', '侯迟', '尹川', '钟野', '蓝叙', '闵桥', '韶灯', '翟南', '卓云', '芮潮'];

export function pcLevelById(id: number): PcLevel {
  return PC_LEVELS.find((l) => l.id === id) ?? PC_LEVELS[0];
}

export function pcStars(gf: number, ga: number, finished: boolean, starGd: number): number {
  if (!finished) return 0;
  if (gf < ga) return 0;
  if (gf === ga) return 1;
  if (gf - ga >= starGd) return 3;
  return 2;
}

function rnd(r: { s: number }): number {
  r.s = (Math.imul(r.s, 1664525) + 1013904223) >>> 0;
  return r.s / 4294967296;
}

function clamp(n: number, a: number, b: number): number {
  return Math.max(a, Math.min(b, n));
}

function dist(ax: number, ay: number, bx: number, by: number): number {
  return Math.hypot(ax - bx, ay - by);
}

function inGoalMouth(y: number): boolean {
  return y >= PC_GOAL_TOP + 2 && y <= PC_GOAL_BOT - 2;
}

function oppSpeed(skill: number, venue: 'home' | 'away'): number {
  const v = venue === 'home' ? 0.97 : 1.04;
  return (152 + skill * 52) * v;
}

function homePositions(): { x: number; y: number }[] {
  return [
    { x: PC_CX - 50, y: PC_CY },
    { x: PC_CX - 90, y: PC_CY - 100 },
    { x: PC_LEFT + 90, y: PC_CY },
    { x: PC_CX + 80, y: PC_CY + 50 },
    { x: PC_CX + 60, y: PC_CY - 90 },
    { x: PC_RIGHT - 90, y: PC_CY },
  ];
}

function makePlayers(level: PcLevel, rng: { s: number }): PcActor[] {
  const pos = homePositions();
  const skill = level.oppSkill;
  const oSpeed = oppSpeed(skill, level.venue);
  const oppNames = OPP_POOL.slice();
  for (let i = oppNames.length - 1; i > 0; i--) {
    const j = Math.floor(rnd(rng) * (i + 1));
    const t = oppNames[i];
    oppNames[i] = oppNames[j];
    oppNames[j] = t;
  }
  const roles: PcActor['role'][] = ['player', 'fwd', 'def', 'oppFwd', 'oppMid', 'oppDef'];
  const teams: Array<0 | 1> = [0, 0, 0, 1, 1, 1];
  const speeds = [PC_PLAYER_SPEED, 205, 198, oSpeed * (0.98 + 0.08 * (level.atkBias - 1)), oSpeed, oSpeed * (0.96 + 0.04 * level.defBias)];
  const names = [OUR_NAMES[0], OUR_NAMES[1], OUR_NAMES[2], oppNames[0], oppNames[1], oppNames[2]];
  return pos.map((p, i) => ({
    id: i,
    team: teams[i],
    role: roles[i],
    name: names[i],
    x: p.x,
    y: p.y,
    vx: 0,
    vy: 0,
    facing: teams[i] === 0 ? 0 : Math.PI,
    stun: 0,
    kickLock: 0,
    pickLock: 0,
    speed: speeds[i],
  }));
}

function resetKickoff(m: PcMatch, kicking: 0 | 1) {
  const pos = homePositions();
  for (let i = 0; i < 6; i++) {
    const p = m.players[i];
    p.x = pos[i].x;
    p.y = pos[i].y;
    p.vx = 0;
    p.vy = 0;
    p.facing = p.team === 0 ? 0 : Math.PI;
    p.stun = 0;
    p.kickLock = 0;
    p.pickLock = 0;
  }
  // kicker stands a little closer to the centre
  const kicker = kicking === 0 ? m.players[0] : m.players[3];
  kicker.x = PC_CX + (kicking === 0 ? -18 : 18);
  kicker.y = PC_CY;
  kicker.facing = kicking === 0 ? 0 : Math.PI;
  m.kickingTeam = kicking;
  m.phase = 'kickoff';
  m.phaseT = 0.7;
  m.kickoffLive = false;
  giveBall(m, kicker.id);
  m.message = kicking === 0 ? '由我们开球' : '对方开球';
}

export type PcCreateOpts = { skipCountdown?: boolean; freezeAi?: boolean; seed?: number };

export function createPcMatch(levelId: number, opts: PcCreateOpts = {}): PcMatch {
  const level = pcLevelById(levelId);
  const seed = opts.seed ?? level.id * 7919 + 17;
  const rng = { s: seed >>> 0 };
  const players = makePlayers(level, rng);
  const m: PcMatch = {
    level,
    phase: opts.skipCountdown ? 'kickoff' : 'countdown',
    phaseT: opts.skipCountdown ? 0.15 : 3,
    time: 0,
    score: [0, 0],
    stars: 0,
    message: opts.skipCountdown ? '开球' : '准备开赛',
    players,
    ball: { x: PC_CX, y: PC_CY, vx: 0, vy: 0 },
    carrier: null,
    lastTouch: null,
    kickingTeam: 0,
    prevPass: false,
    prevShoot: false,
    acc: 0,
    freezeAi: !!opts.freezeAi,
    skipCountdown: !!opts.skipCountdown,
    seed,
    rng,
    finished: false,
    lastGoalTeam: null,
    kickoffLive: false,
  };
  if (opts.skipCountdown) resetKickoff(m, 0);
  else {
    const pos = homePositions();
    for (let i = 0; i < 6; i++) {
      m.players[i].x = pos[i].x;
      m.players[i].y = pos[i].y;
    }
  }
  return m;
}

export function placePc(m: PcMatch, id: number, x: number, y: number, vx = 0, vy = 0) {
  const p = m.players[id];
  if (!p) return;
  p.x = x;
  p.y = y;
  p.vx = vx;
  p.vy = vy;
  if (Math.hypot(vx, vy) > 8) p.facing = Math.atan2(vy, vx);
}

export function giveBall(m: PcMatch, id: number) {
  const p = m.players[id];
  if (!p) return;
  m.carrier = id;
  m.lastTouch = id;
  attachBall(m, p);
  p.pickLock = 0;
  p.kickLock = 0;
}

function attachBall(m: PcMatch, p: PcActor) {
  const d = PC_PLAYER_R + PC_BALL_R - 1;
  m.ball.x = p.x + Math.cos(p.facing) * d;
  m.ball.y = p.y + Math.sin(p.facing) * d;
  m.ball.vx = p.vx;
  m.ball.vy = p.vy;
}

function clampPlayer(p: PcActor) {
  const pad = PC_PLAYER_R + 1;
  p.x = clamp(p.x, PC_LEFT + pad, PC_RIGHT - pad);
  p.y = clamp(p.y, PC_TOP + pad, PC_BOTTOM - pad);
}

function goalFor(m: PcMatch, team: 0 | 1) {
  if (m.phase === 'goal' || m.phase === 'won' || m.phase === 'lost' || m.phase === 'draw') return;
  m.score[team] += 1;
  m.lastGoalTeam = team;
  m.phase = 'goal';
  m.phaseT = 1.15;
  m.carrier = null;
  m.kickoffLive = false;
  m.ball.vx *= 0.15;
  m.ball.vy *= 0.15;
  const scorer = m.lastTouch != null ? m.players[m.lastTouch] : null;
  const name = scorer && scorer.team === team ? scorer.name : team === 0 ? '我们' : '对方';
  m.message = `${name} 进球！ ${m.score[0]}–${m.score[1]}`;
  maybeFinish(m, false);
}

function maybeFinish(m: PcMatch, timeUp: boolean) {
  const [gf, ga] = m.score;
  const lv = m.level;
  let done = false;
  let phase: PcPhase | null = null;
  if (lv.mode === 'firstTo') {
    if (gf >= lv.target || ga >= lv.target) {
      done = true;
      phase = gf > ga ? 'won' : gf < ga ? 'lost' : 'draw';
    } else if (timeUp) {
      done = true;
      phase = gf > ga ? 'won' : gf < ga ? 'lost' : 'draw';
    }
  } else if (timeUp) {
    done = true;
    phase = gf > ga ? 'won' : gf < ga ? 'lost' : 'draw';
  }
  if (!done || !phase) return;
  m.finished = true;
  m.phase = phase;
  m.stars = pcStars(gf, ga, true, lv.starGd);
  const word = phase === 'won' ? '胜' : phase === 'lost' ? '负，本场未通关' : '平';
  m.message = `全场 ${gf}–${ga}，${word}` + (m.stars ? `，${'★'.repeat(m.stars)}` : '');
}

export function kickBall(m: PcMatch, id: number, kind: 'pass' | 'shoot', aimX: number, aimY: number) {
  const p = m.players[id];
  if (!p || m.carrier !== id || p.kickLock > 0 || p.stun > 0) return false;
  const dx = aimX - m.ball.x;
  const dy = aimY - m.ball.y;
  const len = Math.hypot(dx, dy) || 1;
  const nx = dx / len;
  const ny = dy / len;
  const spd = kind === 'shoot' ? PC_SHOT_SPEED : PC_PASS_SPEED;
  m.ball.vx = nx * spd;
  m.ball.vy = ny * spd;
  m.ball.x = p.x + nx * (PC_PLAYER_R + PC_BALL_R + 2);
  m.ball.y = p.y + ny * (PC_PLAYER_R + PC_BALL_R + 2);
  m.carrier = null;
  m.lastTouch = id;
  p.kickLock = 0.38;
  p.pickLock = 0.42;
  p.facing = Math.atan2(ny, nx);
  return true;
}

function bestPassTarget(m: PcMatch, id: number): PcActor | null {
  const p = m.players[id];
  let best: PcActor | null = null;
  let bestS = -1e9;
  for (const t of m.players) {
    if (t.team !== p.team || t.id === p.id) continue;
    const d = dist(p.x, p.y, t.x, t.y);
    if (d < 36 || d > 420) continue;
    const fx = Math.cos(p.facing);
    const fy = Math.sin(p.facing);
    const align = ((t.x - p.x) * fx + (t.y - p.y) * fy) / d;
    const towardGoal = p.team === 0 ? t.x - p.x : p.x - t.x;
    const marked = nearestOppDist(m, t) < 34 ? -50 : 20;
    const s = align * 80 + towardGoal * 0.35 + marked - d * 0.04;
    if (s > bestS) {
      bestS = s;
      best = t;
    }
  }
  return best;
}

function nearestOppDist(m: PcMatch, t: PcActor): number {
  let d = 1e9;
  for (const o of m.players) {
    if (o.team === t.team) continue;
    d = Math.min(d, dist(t.x, t.y, o.x, o.y));
  }
  return d;
}

function tryKickFromInput(m: PcMatch, id: number, input: PcInput, risingPass: boolean, risingShoot: boolean) {
  if (m.carrier !== id) return;
  const p = m.players[id];
  if (risingShoot) {
    const goalX = p.team === 0 ? PC_RIGHT + 10 : PC_LEFT - 10;
    const goalY = clamp(p.y, PC_GOAL_TOP + 18, PC_GOAL_BOT - 18);
    // slight aim assist to goal centre mixed with facing
    const assistY = PC_CY * 0.45 + goalY * 0.55;
    kickBall(m, id, 'shoot', goalX, assistY);
    return;
  }
  if (risingPass) {
    const tgt = bestPassTarget(m, id);
    if (tgt) {
      const lead = 0.12;
      kickBall(m, id, 'pass', tgt.x + tgt.vx * lead, tgt.y + tgt.vy * lead);
    } else {
      kickBall(m, id, 'pass', p.x + Math.cos(p.facing) * 160, p.y + Math.sin(p.facing) * 160);
    }
  }
}

function tryTackle(m: PcMatch, id: number) {
  const p = m.players[id];
  if (m.carrier == null || m.carrier === id) return;
  const c = m.players[m.carrier];
  if (c.team === p.team) return;
  const d = dist(p.x, p.y, c.x, c.y);
  if (d > PC_PLAYER_R * 2 + 10) return;
  if (p.stun > 0 || p.kickLock > 0) return;
  // steal
  m.carrier = null;
  c.stun = 0.38;
  p.kickLock = 0.2;
  const nx = (c.x - p.x) / (d || 1);
  m.ball.vx = -nx * 90 + p.vx * 0.4;
  m.ball.vy = p.vy * 0.4 + (rnd(m.rng) - 0.5) * 40;
  m.lastTouch = id;
  // if very close, tackler gains ball shortly — give immediately if overlapping
  if (d < PC_PLAYER_R * 2 + 2 && p.pickLock <= 0) {
    m.carrier = id;
    attachBall(m, p);
  }
}

function blockOrCatch(m: PcMatch) {
  const b = m.ball;
  const spd = Math.hypot(b.vx, b.vy);
  for (const p of m.players) {
    if (p.pickLock > 0 || p.stun > 0) continue;
    const d = dist(p.x, p.y, b.x, b.y);
    const hitR = PC_PLAYER_R + PC_BALL_R;
    if (spd > 210 && d < hitR + 2) {
      // fast shot: deflect instead of catching, so a body on the line can save
      const nx = (b.x - p.x) / (d || 1);
      const ny = (b.y - p.y) / (d || 1);
      const incoming = b.vx * nx + b.vy * ny;
      if (incoming < 0) {
        b.vx -= incoming * 1.6 * nx;
        b.vy -= incoming * 1.6 * ny;
        b.vx += p.vx * 0.2;
        b.vy += p.vy * 0.2;
        b.x = p.x + nx * (hitR + 1);
        b.y = p.y + ny * (hitR + 1);
        m.lastTouch = p.id;
      }
    }
  }
}

function updatePossession(m: PcMatch) {
  if (m.carrier != null) {
    const c = m.players[m.carrier];
    const d = dist(c.x, c.y, m.ball.x, m.ball.y);
    if (d > PC_CONTROL_R * 1.35 || c.stun > 0) {
      m.carrier = null;
    } else {
      attachBall(m, c);
      return;
    }
  }
  const spd = Math.hypot(m.ball.vx, m.ball.vy);
  // only collect a slow or moderate ball; shots fly through unless blocked above
  if (spd > 200) return;
  let best = -1;
  let bestD = PC_CONTROL_R;
  for (const p of m.players) {
    if (p.pickLock > 0 || p.stun > 0) continue;
    const d = dist(p.x, p.y, m.ball.x, m.ball.y);
    if (d < bestD) {
      bestD = d;
      best = p.id;
    }
  }
  if (best >= 0) {
    m.carrier = best;
    m.lastTouch = best;
    attachBall(m, m.players[best]);
  }
}

function bounceBall(m: PcMatch) {
  const b = m.ball;
  const r = PC_BALL_R;
  if (b.y - r < PC_TOP) {
    b.y = PC_TOP + r;
    b.vy = Math.abs(b.vy) * 0.72;
  } else if (b.y + r > PC_BOTTOM) {
    b.y = PC_BOTTOM - r;
    b.vy = -Math.abs(b.vy) * 0.72;
  }
  // goals: must fully cross the line with clear inward speed, and only during open play
  if (b.x - r > PC_RIGHT) {
    if (m.phase === 'play' && inGoalMouth(b.y) && b.vx > 40) {
      goalFor(m, 0);
      return;
    }
    b.x = PC_RIGHT - r;
    b.vx = -Math.abs(b.vx) * 0.7;
  } else if (b.x + r < PC_LEFT) {
    if (m.phase === 'play' && inGoalMouth(b.y) && b.vx < -40) {
      goalFor(m, 1);
      return;
    }
    b.x = PC_LEFT + r;
    b.vx = Math.abs(b.vx) * 0.7;
  }
}

function separatePlayers(m: PcMatch) {
  const ps = m.players;
  for (let i = 0; i < ps.length; i++) {
    for (let j = i + 1; j < ps.length; j++) {
      const a = ps[i];
      const b = ps[j];
      const dx = b.x - a.x;
      const dy = b.y - a.y;
      const d = Math.hypot(dx, dy) || 0.001;
      const min = PC_PLAYER_R * 2 - 1;
      if (d < min) {
        const nx = dx / d;
        const ny = dy / d;
        const push = (min - d) * 0.5;
        a.x -= nx * push;
        a.y -= ny * push;
        b.x += nx * push;
        b.y += ny * push;
        // automatic tackle opportunity on overlap with opponent carrier
        if (m.carrier === a.id && a.team !== b.team && b.stun <= 0 && rnd(m.rng) < 0.35) tryTackle(m, b.id);
        else if (m.carrier === b.id && a.team !== b.team && a.stun <= 0 && rnd(m.rng) < 0.35) tryTackle(m, a.id);
      }
    }
  }
}

function applyMove(p: PcActor, ax: number, ay: number, dt: number) {
  const len = Math.hypot(ax, ay);
  if (p.stun > 0) {
    p.vx *= Math.max(0, 1 - 6 * dt);
    p.vy *= Math.max(0, 1 - 6 * dt);
  } else if (len > 0.01) {
    const nx = ax / len;
    const ny = ay / len;
    p.vx += nx * PC_ACCEL * dt;
    p.vy += ny * PC_ACCEL * dt;
    p.facing = Math.atan2(ny, nx);
  } else {
    const s = Math.max(0, 1 - (PC_FRICTION * dt) / Math.max(1, Math.hypot(p.vx, p.vy)));
    p.vx *= s;
    p.vy *= s;
  }
  const spd = Math.hypot(p.vx, p.vy);
  if (spd > p.speed) {
    p.vx *= p.speed / spd;
    p.vy *= p.speed / spd;
  }
  p.x += p.vx * dt;
  p.y += p.vy * dt;
  clampPlayer(p);
  if (p.stun > 0) p.stun = Math.max(0, p.stun - dt);
  if (p.kickLock > 0) p.kickLock = Math.max(0, p.kickLock - dt);
  if (p.pickLock > 0) p.pickLock = Math.max(0, p.pickLock - dt);
}

function humanAxis(input: PcInput): [number, number] {
  let ax = 0;
  let ay = 0;
  if (input.left) ax -= 1;
  if (input.right) ax += 1;
  if (input.up) ay -= 1;
  if (input.down) ay += 1;
  return [ax, ay];
}

function inShotRange(p: PcActor, team: 0 | 1, reach = 210): boolean {
  if (team === 0) return p.x > PC_CX + 40 && dist(p.x, p.y, PC_RIGHT, PC_CY) < reach;
  return p.x < PC_CX - 40 && dist(p.x, p.y, PC_LEFT, PC_CY) < reach;
}

function aiTarget(m: PcMatch, p: PcActor): { x: number; y: number; pass: boolean; shoot: boolean; tackle: boolean } {
  const lv = m.level;
  const skill = p.team === 1 ? lv.oppSkill : 0.78;
  const attackRight = p.team === 0;
  const goalX = attackRight ? PC_RIGHT : PC_LEFT;
  const ownX = attackRight ? PC_LEFT : PC_RIGHT;
  const ball = m.ball;
  const has = m.carrier === p.id;
  const loose = m.carrier == null;
  const weHave = m.carrier != null && m.players[m.carrier].team === p.team;
  const def = p.role === 'def' || p.role === 'oppDef';
  const fwd = p.role === 'fwd' || p.role === 'oppFwd';
  const defB = p.team === 1 ? lv.defBias : 1;
  const atkB = p.team === 1 ? lv.atkBias : 1;

  const nearestToBall = (() => {
    let id = p.id;
    let d = 1e9;
    for (const q of m.players) {
      if (q.team !== p.team) continue;
      const dd = dist(q.x, q.y, ball.x, ball.y);
      if (dd < d) {
        d = dd;
        id = q.id;
      }
    }
    return id;
  })();

  if (has) {
    const reach = p.team === 1 ? 155 + skill * 40 : 220;
    const close = dist(p.x, p.y, goalX, PC_CY);
    if (inShotRange(p, p.team, reach) && close < reach) {
      const eager = p.team === 0 ? 0.9 : 0.14 + skill * 0.22;
      if (close < 130 || rnd(m.rng) < eager) {
        return { x: goalX, y: PC_CY, pass: false, shoot: true, tackle: false };
      }
    }
    const tgt = bestPassTarget(m, p.id);
    if (tgt && (tgt.x - p.x) * (attackRight ? 1 : -1) > 30 && nearestOppDist(m, p) < 42 && nearestOppDist(m, tgt) > 36) {
      return { x: tgt.x, y: tgt.y, pass: true, shoot: false, tackle: false };
    }
    // dribble: toward goal, sidestep nearest opponent
    let tx = goalX + (attackRight ? -50 : 50);
    let ty = PC_CY;
    let threat: PcActor | null = null;
    let td = 80;
    for (const o of m.players) {
      if (o.team === p.team) continue;
      const d = dist(p.x, p.y, o.x, o.y);
      const ahead = (o.x - p.x) * (attackRight ? 1 : -1) > -10;
      if (ahead && d < td) {
        td = d;
        threat = o;
      }
    }
    if (threat) {
      ty = clamp(p.y + (p.y < threat.y ? -1 : 1) * 90, PC_TOP + 30, PC_BOTTOM - 30);
      tx = p.x + (attackRight ? 70 : -70);
    } else {
      ty = clamp(p.y + (PC_CY - p.y) * 0.15, PC_TOP + 40, PC_BOTTOM - 40);
    }
    return { x: tx, y: ty, pass: false, shoot: false, tackle: false };
  }

  // without ball
  if (loose && nearestToBall === p.id) {
    return { x: ball.x + ball.vx * 0.12, y: ball.y + ball.vy * 0.12, pass: false, shoot: false, tackle: false };
  }
  if (!weHave && m.carrier != null && nearestToBall === p.id) {
    const c = m.players[m.carrier];
    const d = dist(p.x, p.y, c.x, c.y);
    return { x: c.x, y: c.y, pass: false, shoot: false, tackle: d < 36 };
  }

  // support / shape
  if (def) {
    if (!weHave) {
      // stand on the line between the ball and our goal mouth
      const gx = ownX + (attackRight ? 36 : -36);
      const t = 0.22 + 0.08 * defB;
      const bx = ball.x * t + gx * (1 - t);
      const by = ball.y * 0.62 + PC_CY * 0.38;
      const chase = dist(p.x, p.y, ball.x, ball.y) < 90 && nearestToBall === p.id;
      if (chase) return { x: ball.x, y: ball.y, pass: false, shoot: false, tackle: true };
      return { x: clamp(bx, PC_LEFT + 36, PC_RIGHT - 36), y: clamp(by, PC_GOAL_TOP + 10, PC_GOAL_BOT - 10), pass: false, shoot: false, tackle: false };
    }
    const bx = ownX + (attackRight ? 150 : -150) * (0.7 + 0.3 / defB);
    const by = PC_CY * 0.4 + ball.y * 0.6;
    return { x: clamp(bx, PC_LEFT + 50, PC_RIGHT - 50), y: clamp(by, PC_TOP + 40, PC_BOTTOM - 40), pass: false, shoot: false, tackle: false };
  }
  if (fwd) {
    const bx = weHave
      ? ball.x + (attackRight ? 110 : -110) * atkB
      : ball.x + (attackRight ? 40 : -40);
    const side = p.role === 'fwd' || p.role === 'oppFwd' ? (p.y < PC_CY ? -1 : 1) : 1;
    return { x: clamp(bx, PC_LEFT + 80, PC_RIGHT - 80), y: clamp(PC_CY + side * 90, PC_TOP + 40, PC_BOTTOM - 40), pass: false, shoot: false, tackle: false };
  }
  // mid
  return {
    x: clamp(ball.x * 0.55 + (attackRight ? PC_CX - 20 : PC_CX + 20) * 0.45, PC_LEFT + 70, PC_RIGHT - 70),
    y: clamp(ball.y * 0.5 + PC_CY * 0.5, PC_TOP + 40, PC_BOTTOM - 40),
    pass: false,
    shoot: false,
    tackle: false,
  };
}

function stepAi(m: PcMatch, p: PcActor, dt: number): { pass: boolean; shoot: boolean; tackle: boolean } {
  const t = aiTarget(m, p);
  applyMove(p, t.x - p.x, t.y - p.y, dt);
  return { pass: t.pass, shoot: t.shoot, tackle: t.tackle };
}

function stepPhysics(m: PcMatch, dt: number, input: PcInput, doEdge: boolean) {
  const risingPass = doEdge && input.pass && !m.prevPass;
  const risingShoot = doEdge && input.shoot && !m.prevShoot;
  if (doEdge) {
    m.prevPass = input.pass;
    m.prevShoot = input.shoot;
  }

  if (m.phase === 'countdown') {
    m.phaseT -= dt;
    m.message = String(Math.max(1, Math.ceil(m.phaseT)));
    if (m.phaseT <= 0) {
      resetKickoff(m, 0);
    }
    return;
  }
  if (m.phase === 'kickoff') {
    m.phaseT -= dt;
    const kicker = m.players[m.kickingTeam === 0 ? 0 : 3];
    if (m.carrier !== kicker.id) giveBall(m, kicker.id);
    else attachBall(m, kicker);
    if (m.phaseT <= 0) {
      m.phase = 'play';
      m.kickoffLive = true;
      m.message = '比赛开始';
    }
    return;
  }
  if (m.phase === 'goal') {
    m.phaseT -= dt;
    if (m.phaseT <= 0) {
      if (m.finished) return;
      const conceded: 0 | 1 = m.lastGoalTeam == null ? 0 : ((m.lastGoalTeam ^ 1) as 0 | 1);
      resetKickoff(m, conceded);
    }
    return;
  }
  if (m.phase === 'won' || m.phase === 'lost' || m.phase === 'draw') return;

  // clock during play (and late kickoff after first whistle)
  if (m.phase === 'play') {
    m.time += dt;
    const limit = m.level.mode === 'timed' ? m.level.target : m.level.maxTime;
    if (m.time >= limit) {
      m.time = limit;
      maybeFinish(m, true);
      if (m.finished) return;
    }
  }

  const me = m.players[0];
  const [hx, hy] = humanAxis(input);
  applyMove(me, hx, hy, dt);
  if (risingShoot && m.carrier !== 0 && m.phase === 'play') tryTackle(m, 0);
  if (m.carrier === 0) {
    tryKickFromInput(m, 0, input, risingPass, risingShoot);
  }

  if (!m.freezeAi) {
    for (let i = 1; i < 6; i++) {
      const p = m.players[i];
      const act = stepAi(m, p, dt);
      if (m.carrier === i) {
        if (act.shoot) {
          const goalX = p.team === 0 ? PC_RIGHT + 10 : PC_LEFT - 10;
          const acc = p.team === 1 ? 0.16 + m.level.oppSkill * 0.28 : 0.9;
          const miss = rnd(m.rng) > acc;
          const spread = miss
            ? (PC_GOAL_H / 2 + 28) * (rnd(m.rng) > 0.5 ? 1 : -1)
            : (1 - acc) * 36 * (rnd(m.rng) - 0.5);
          kickBall(m, i, 'shoot', goalX, PC_CY + spread);
        } else if (act.pass) {
          const tgt = bestPassTarget(m, i);
          if (tgt) kickBall(m, i, 'pass', tgt.x, tgt.y);
        }
      } else if (act.tackle) {
        tryTackle(m, i);
      }
    }
  } else {
    for (let i = 1; i < 6; i++) {
      const p = m.players[i];
      applyMove(p, 0, 0, dt);
    }
  }

  separatePlayers(m);

  if (m.carrier == null) {
    const b = m.ball;
    const spd = Math.hypot(b.vx, b.vy);
    if (spd > 0.4) {
      const s = Math.max(0, 1 - (PC_BALL_FRICTION * dt) / spd);
      b.vx *= s;
      b.vy *= s;
    } else {
      b.vx = 0;
      b.vy = 0;
    }
    b.x += b.vx * dt;
    b.y += b.vy * dt;
    blockOrCatch(m);
    const gf = m.score[0] + m.score[1];
    bounceBall(m);
    if (m.finished || m.score[0] + m.score[1] !== gf) return;
  }
  updatePossession(m);
}

export function stepPc(m: PcMatch, dt: number, input: PcInput = EMPTY_PC_INPUT) {
  stepPhysics(m, dt, input, true);
}

export function tickPc(m: PcMatch, dt: number, input: PcInput = EMPTY_PC_INPUT) {
  if (m.finished) return;
  const d = Math.min(0.05, Math.max(0, dt));
  m.acc += d;
  let n = 0;
  let first = true;
  while (m.acc >= PC_DT && n < 4 && !m.finished) {
    m.acc -= PC_DT;
    stepPhysics(m, PC_DT, input, first);
    first = false;
    n++;
  }
}

/** 脚本通关用的自动操作：带球朝门前进并在射程内射门，无球时追球或抢断。 */
export function autoInputPc(m: PcMatch): PcInput {
  const input: PcInput = { ...EMPTY_PC_INPUT };
  if (m.phase !== 'play' && m.phase !== 'kickoff') return input;
  const me = m.players[0];
  const ball = m.ball;
  const has = m.carrier === 0;
  let tx = ball.x;
  let ty = ball.y;
  if (has) {
    const need = m.score[0] <= m.score[1];
    const reach = need ? 280 : 250;
    if (m.phase === 'play' && me.x > PC_CX + 40 && dist(me.x, me.y, PC_RIGHT, PC_CY) < reach) {
      const toGoal = Math.atan2(PC_CY - me.y, PC_RIGHT - me.x);
      let da = Math.abs(toGoal - me.facing);
      if (da > Math.PI) da = Math.PI * 2 - da;
      if (da < 0.95 || dist(me.x, me.y, PC_RIGHT, PC_CY) < 170) {
        input.shoot = true;
      }
      tx = PC_RIGHT;
      ty = PC_CY;
    } else {
      const tgt = bestPassTarget(m, 0);
      const pressured = nearestOppDist(m, me) < 40;
      if (tgt && pressured && tgt.x > me.x + 24 && nearestOppDist(m, tgt) > 38) {
        input.pass = true;
        tx = tgt.x;
        ty = tgt.y;
      } else {
        // dribble to goal with sidestep
        tx = PC_RIGHT - 40;
        ty = PC_CY;
        let threat: PcActor | null = null;
        let td = 78;
        for (const o of m.players) {
          if (o.team !== 0) {
            const d = dist(me.x, me.y, o.x, o.y);
            if ((o.x > me.x - 15) && d < td) {
              td = d;
              threat = o;
            }
          }
        }
        if (threat) {
          ty = clamp(me.y + (me.y <= threat.y ? -1 : 1) * 100, PC_TOP + 36, PC_BOTTOM - 36);
          tx = me.x + 90;
        }
      }
    }
  } else {
    const chase = m.carrier == null || (m.carrier != null && m.players[m.carrier].team === 1) || dist(me.x, me.y, ball.x, ball.y) < 90;
    if (chase) {
      tx = ball.x + ball.vx * 0.1;
      ty = ball.y + ball.vy * 0.1;
      if (m.carrier != null && m.players[m.carrier].team === 1 && dist(me.x, me.y, m.players[m.carrier].x, m.players[m.carrier].y) < 34) {
        input.shoot = true; // tackle
      }
    } else {
      tx = Math.max(me.x, ball.x + 60);
      ty = PC_CY + (me.y < PC_CY ? -70 : 70);
    }
  }
  const dx = tx - me.x;
  const dy = ty - me.y;
  if (dx > 6) input.right = true;
  if (dx < -6) input.left = true;
  if (dy > 6) input.down = true;
  if (dy < -6) input.up = true;
  return input;
}

export function autoPlayPc(levelId: number, maxSeconds?: number): PcMatch {
  const m = createPcMatch(levelId, { skipCountdown: true });
  const limit = maxSeconds ?? Math.max(m.level.maxTime, m.level.target) + 8;
  const frames = Math.ceil(limit / PC_DT) + 10;
  for (let i = 0; i < frames && !m.finished; i++) {
    const input = autoInputPc(m);
    stepPc(m, PC_DT, input);
  }
  if (!m.finished) {
    maybeFinish(m, true);
  }
  return m;
}

export function matchScoreValue(m: PcMatch): number {
  const [gf, ga] = m.score;
  return gf * 1000 + (gf - ga + 8) * 20 + Math.max(0, 200 - Math.floor(m.time));
}

export function parsePcSave(raw: unknown): LevelSave {
  return parseLevelSave(raw, PC_LEVEL_COUNT);
}
