/** 滚球历险：固定时间步平台物理、碰撞、检查点与机关。 */

export const RQ_TILE = 32;
export const RQ_DT = 1 / 120;
export const RQ_RADIUS = 12;
export const RQ_GRAVITY = 2100;
export const RQ_MOVE = 1600;
export const RQ_MAX_VX = 250;
export const RQ_FRICTION = 1400;
export const RQ_JUMP = 680;
export const RQ_JUMP_CUT = 0.45;
export const RQ_COYOTE = 0.09;
export const RQ_BUFFER = 0.1;
export const RQ_VIEW_W = 800;
export const RQ_VIEW_H = 450;
export const RQ_SAVE_KEY = 'roll-quest-save';
export const RQ_LEVEL_COUNT = 8;

export type RqInput = { left: boolean; right: boolean; jump: boolean };
export type RqPhase = 'play' | 'won' | 'lost';

export type MovingPlat = { x: number; y: number; w: number; h: number; ax: number; ay: number; bx: number; by: number; period: number; t: number };

export type RqLevel = {
  id: number;
  name: string;
  hint: string;
  map: string[];
  movers?: Omit<MovingPlat, 't'>[];
  /** 测试用路径点（格子坐标）。 */
  waypoints?: { c: number; r: number }[];
};

export type RqMatch = {
  level: RqLevel;
  cols: number;
  rows: number;
  tiles: string[][];
  crumbleT: Map<string, number>;
  gone: Set<string>;
  switchesOn: Set<string>;
  movers: MovingPlat[];
  x: number;
  y: number;
  vx: number;
  vy: number;
  onGround: boolean;
  coyote: number;
  jumpBuf: number;
  jumpHeld: boolean;
  spawnX: number;
  spawnY: number;
  checkpoints: number;
  deaths: number;
  time: number;
  phase: RqPhase;
  message: string;
  camX: number;
  camY: number;
  score: number;
  stars: number;
};

const LEVEL_MAPS: { id: number; name: string; hint: string; waypoints: { c: number; r: number }[]; map: string[]; movers?: Omit<MovingPlat, 't'>[] }[] = [
  {
    id: 1,
    name: '出门第一步',
    hint: '左右移动，到缺口处起跳。',
    waypoints: [{ c: 6, r: 8 }, { c: 15, r: 8 }, { c: 32, r: 8 }],
    map: [
      '........................................',
      '........................................',
      '........................................',
      '........................................',
      '........................................',
      '........................................',
      '........................................',
      '........................................',
      'P...............................G.......',
      '########....#######....#################',
      '########################################',
    ],
  },
  {
    id: 2,
    name: '尖刺浅滩',
    hint: '尖刺会送你回检查点，看准再跳。',
    waypoints: [{ c: 4, r: 8 }, { c: 12, r: 8 }, { c: 32, r: 8 }],
    map: [
      '........................................',
      '........................................',
      '........................................',
      '........................................',
      '........................................',
      '........................................',
      '........................................',
      '........................................',
      'P........C...........^^.........G.......',
      '########################################',
      '########################################',
    ],
  },
  {
    id: 3,
    name: '弹簧谷',
    hint: '踩弹簧会高高弹起，落到对面高台。',
    waypoints: [{ c: 7, r: 10 }, { c: 14, r: 4 }],
    map: [
      '........................................',
      '........................................',
      '........................................',
      '........................................',
      '..............G.........................',
      '...........######.......................',
      '........................................',
      '........................................',
      '........................................',
      '........................................',
      'P......*................................',
      '##########..............................',
      '########################################',
    ],
  },
  {
    id: 4,
    name: '漂浮踏板',
    hint: '跳上左右移动的踏板，乘到对面。',
    waypoints: [{ c: 5, r: 8 }, { c: 18, r: 7 }, { c: 34, r: 8 }],
    movers: [{ x: 10 * 32, y: 8 * 32 + 10, w: 100, h: 18, ax: 10 * 32, ay: 8 * 32 + 10, bx: 24 * 32, by: 8 * 32 + 10, period: 3.6 }],
    map: [
      '........................................',
      '........................................',
      '........................................',
      '........................................',
      '........................................',
      '........................................',
      '........................................',
      '........................................',
      'P.................................G.....',
      '########........................########',
      '########........................########',
    ],
  },
  {
    id: 5,
    name: '松动砖块',
    hint: '浅色砖踩上去不久会碎，抓紧跳走。',
    waypoints: [{ c: 5, r: 8 }, { c: 10, r: 8 }, { c: 18, r: 8 }, { c: 26, r: 8 }, { c: 34, r: 8 }],
    map: [
      '........................................',
      '........................................',
      '........................................',
      '........................................',
      '........................................',
      '........................................',
      '........................................',
      '........................................',
      'P.................................G.....',
      '######..====....====....====....########',
      '########################################',
    ],
  },
  {
    id: 6,
    name: '开关石门',
    hint: '先踩地板上的开关，石门打开后再走过去。',
    waypoints: [{ c: 8, r: 8 }, { c: 16, r: 8 }, { c: 32, r: 8 }],
    map: [
      '........................................',
      '........................................',
      '........................................',
      '........................................',
      '........................................',
      '........................................',
      '........................................',
      '........................................',
      'P...........S.......DD..........G.......',
      '########################################',
      '########################################',
    ],
  },
  {
    id: 7,
    name: '中途歇脚',
    hint: '路更长了，碰到检查点后可以安全重试。',
    waypoints: [{ c: 4, r: 8 }, { c: 14, r: 8 }, { c: 32, r: 6 }],
    map: [
      '........................................',
      '........................................',
      '........................................',
      '........................................',
      '........................................',
      '........................................',
      '.................................G......',
      '..............................#####.....',
      'P..........C...........^^...............',
      '########################################',
      '########################################',
    ],
  },
  {
    id: 8,
    name: '山谷回廊',
    hint: '弹簧、碎砖、尖刺和移动踏板都在这一关。',
    waypoints: [{ c: 6, r: 8 }, { c: 16, r: 8 }, { c: 24, r: 7 }, { c: 36, r: 6 }],
    movers: [{ x: 22 * 32, y: 8 * 32 + 8, w: 90, h: 16, ax: 20 * 32, ay: 8 * 32 + 8, bx: 28 * 32, by: 7 * 32, period: 3.2 }],
    map: [
      '........................................',
      '........................................',
      '........................................',
      '........................................',
      '........................................',
      '........................................',
      '......................................G.',
      '...................................#####',
      'P......*....C....^^.....................',
      '##########..............................',
      '########################################',
    ],
  },
];

export const RQ_LEVELS: RqLevel[] = LEVEL_MAPS;

export function rqLevelById(id: number): RqLevel | undefined {
  return RQ_LEVELS.find((l) => l.id === id);
}

function parseMap(map: string[]): { tiles: string[][]; cols: number; rows: number; start: { x: number; y: number } } {
  const rows = map.length;
  const cols = Math.max(...map.map((r) => r.length));
  const tiles: string[][] = [];
  let start = { x: RQ_TILE * 2, y: RQ_TILE * 2 };
  for (let r = 0; r < rows; r++) {
    const line = map[r].padEnd(cols, '.');
    tiles.push([]);
    for (let c = 0; c < cols; c++) {
      const ch = line[c];
      if (ch === 'P') {
        start = { x: c * RQ_TILE + RQ_TILE / 2, y: r * RQ_TILE + RQ_TILE - RQ_RADIUS };
        tiles[r].push('.');
      } else {
        tiles[r].push(ch);
      }
    }
  }
  return { tiles, cols, rows, start };
}

function key(c: number, r: number): string {
  return c + ',' + r;
}

export function createRqMatch(levelId: number): RqMatch {
  const level = rqLevelById(levelId);
  if (!level) throw new Error('未知关卡');
  const parsed = parseMap(level.map);
  const movers = (level.movers ?? []).map((m) => ({ ...m, t: 0 }));
  return {
    level,
    cols: parsed.cols,
    rows: parsed.rows,
    tiles: parsed.tiles.map((row) => row.slice()),
    crumbleT: new Map(),
    gone: new Set(),
    switchesOn: new Set(),
    movers,
    x: parsed.start.x,
    y: parsed.start.y,
    vx: 0,
    vy: 0,
    onGround: false,
    coyote: 0,
    jumpBuf: 0,
    jumpHeld: false,
    spawnX: parsed.start.x,
    spawnY: parsed.start.y,
    checkpoints: 0,
    deaths: 0,
    time: 0,
    phase: 'play',
    message: level.hint,
    camX: parsed.start.x,
    camY: parsed.start.y,
    score: 0,
    stars: 0,
  };
}

function tileAt(m: RqMatch, c: number, r: number): string {
  if (c < 0 || r < 0 || c >= m.cols || r >= m.rows) return '#';
  const k = key(c, r);
  if (m.gone.has(k)) return '.';
  const ch = m.tiles[r][c];
  if (ch === 'D' && m.switchesOn.size > 0) return '.';
  return ch;
}

function isSolid(ch: string): boolean {
  return ch === '#' || ch === '=' || ch === 'D';
}

function isHazard(ch: string): boolean {
  return ch === '^';
}

function isSpring(ch: string): boolean {
  return ch === '*';
}

type Hit = { c: number; r: number; ch: string; x: number; y: number; w: number; h: number };

function overlaps(m: RqMatch, x: number, y: number): Hit[] {
  const hits: Hit[] = [];
  const minC = Math.floor((x - RQ_RADIUS) / RQ_TILE);
  const maxC = Math.floor((x + RQ_RADIUS) / RQ_TILE);
  const minR = Math.floor((y - RQ_RADIUS) / RQ_TILE);
  const maxR = Math.floor((y + RQ_RADIUS) / RQ_TILE);
  for (let r = minR; r <= maxR; r++) {
    for (let c = minC; c <= maxC; c++) {
      const ch = tileAt(m, c, r);
      if (ch === '.' || ch === 'P') continue;
      const tx = c * RQ_TILE;
      const ty = r * RQ_TILE;
      const cx = Math.max(tx, Math.min(x, tx + RQ_TILE));
      const cy = Math.max(ty, Math.min(y, ty + RQ_TILE));
      const dx = x - cx;
      const dy = y - cy;
      if (dx * dx + dy * dy < RQ_RADIUS * RQ_RADIUS - 0.01) {
        hits.push({ c, r, ch, x: tx, y: ty, w: RQ_TILE, h: RQ_TILE });
      }
    }
  }
  for (const mv of m.movers) {
    const cx = Math.max(mv.x, Math.min(x, mv.x + mv.w));
    const cy = Math.max(mv.y, Math.min(y, mv.y + mv.h));
    const dx = x - cx;
    const dy = y - cy;
    if (dx * dx + dy * dy < RQ_RADIUS * RQ_RADIUS - 0.01) {
      hits.push({ c: -1, r: -1, ch: 'M', x: mv.x, y: mv.y, w: mv.w, h: mv.h });
    }
  }
  return hits;
}

function resolveAxis(m: RqMatch, hits: Hit[], axis: 'x' | 'y'): boolean {
  let grounded = false;
  for (const h of hits) {
    if (!isSolid(h.ch) && h.ch !== 'M') continue;
    const cx = Math.max(h.x, Math.min(m.x, h.x + h.w));
    const cy = Math.max(h.y, Math.min(m.y, h.y + h.h));
    const dx = m.x - cx;
    const dy = m.y - cy;
    const dist = Math.hypot(dx, dy);
    if (dist >= RQ_RADIUS - 0.001 && dist > 1e-8) continue;
    const playerBottom = m.y + RQ_RADIUS;
    const onTop = playerBottom <= h.y + 6;
    if (axis === 'x') {
      // 站在顶面上时不按侧向推，避免卡在边角走不下去
      if (onTop) continue;
      if (m.x < h.x + h.w / 2) m.x = h.x - RQ_RADIUS;
      else m.x = h.x + h.w + RQ_RADIUS;
      m.vx = 0;
    } else {
      if (m.vy >= 0 && m.y <= h.y + 8) {
        m.y = h.y - RQ_RADIUS;
        m.vy = 0;
        grounded = true;
      } else if (m.vy < 0 && m.y > h.y) {
        m.y = h.y + h.h + RQ_RADIUS;
        m.vy = 0;
      }
    }
  }
  return grounded;
}

function collectSpecial(m: RqMatch, hits: Hit[]) {
  for (const h of hits) {
    if (isHazard(h.ch)) {
      kill(m, '碰到尖刺，回到检查点。');
      return;
    }
    if (isSpring(h.ch) && m.vy >= 0) {
      m.vy = -RQ_JUMP * 1.55;
      m.onGround = false;
      m.coyote = 0;
    }
    if (h.ch === 'C') {
      const sx = h.x + h.w / 2;
      const sy = h.y - RQ_RADIUS;
      if (Math.hypot(sx - m.spawnX, sy - m.spawnY) > 8) {
        m.spawnX = sx;
        m.spawnY = sy;
        m.checkpoints += 1;
        m.message = '已记录检查点。';
        m.score += 50;
      }
    }
    if (h.ch === 'S') {
      m.switchesOn.add(key(h.c, h.r));
      m.message = '石门打开了。';
    }
    if (h.ch === 'G') {
      win(m);
      return;
    }
    if (h.ch === '=' && m.onGround) {
      const k = key(h.c, h.r);
      if (!m.crumbleT.has(k)) m.crumbleT.set(k, 0.42);
    }
  }
}

function win(m: RqMatch) {
  if (m.phase !== 'play') return;
  m.phase = 'won';
  const leftover = Math.max(0, 90 - m.time);
  m.stars = m.deaths === 0 ? 3 : m.deaths <= 2 ? 2 : 1;
  m.score += 300 + Math.floor(leftover * 4) + m.stars * 50;
  m.message = '到达终点！' + m.stars + ' 星，用时 ' + m.time.toFixed(1) + ' 秒。';
}

function kill(m: RqMatch, msg: string) {
  if (m.phase !== 'play') return;
  m.deaths += 1;
  m.x = m.spawnX;
  m.y = m.spawnY;
  m.vx = 0;
  m.vy = 0;
  m.onGround = false;
  m.jumpHeld = false;
  m.jumpBuf = 0;
  m.message = msg;
}

function updateMovers(m: RqMatch, dt: number) {
  for (const mv of m.movers) {
    mv.t += dt;
    const u = (1 - Math.cos(((mv.t % mv.period) / mv.period) * Math.PI * 2)) / 2;
    mv.x = mv.ax + (mv.bx - mv.ax) * u;
    mv.y = mv.ay + (mv.by - mv.ay) * u;
  }
}

function updateCrumble(m: RqMatch, dt: number) {
  for (const [k, t] of [...m.crumbleT.entries()]) {
    const next = t - dt;
    if (next <= 0) {
      m.crumbleT.delete(k);
      m.gone.add(k);
      // 3 秒后恢复：用负计时存放在同一 map，用特殊前缀
      m.crumbleT.set('r' + k, 3);
    } else {
      m.crumbleT.set(k, next);
    }
  }
  for (const [k, t] of [...m.crumbleT.entries()]) {
    if (!k.startsWith('r')) continue;
    const next = t - dt;
    if (next <= 0) {
      m.crumbleT.delete(k);
      m.gone.delete(k.slice(1));
    } else m.crumbleT.set(k, next);
  }
}

export function tickRq(m: RqMatch, dt: number, input: RqInput) {
  if (m.phase !== 'play') return;
  const sliced = Math.max(0, Math.min(dt, 0.05));
  let acc = sliced;
  const deaths = m.deaths;
  while (acc > 0) {
    const step = Math.min(RQ_DT, acc);
    acc -= step;
    substep(m, step, input);
    if (m.phase !== 'play') return;
    if (m.deaths > deaths) return;
  }
  m.camX += (m.x - m.camX) * 0.12;
  m.camY += (m.y - m.camY) * 0.12;
}

function substep(m: RqMatch, dt: number, input: RqInput) {
  m.time += dt;
  updateMovers(m, dt);
  updateCrumble(m, dt);

  if (input.left) m.vx -= RQ_MOVE * dt;
  else if (input.right) m.vx += RQ_MOVE * dt;
  else {
    const fr = RQ_FRICTION * dt;
    if (m.vx > fr) m.vx -= fr;
    else if (m.vx < -fr) m.vx += fr;
    else m.vx = 0;
  }
  if (m.vx > RQ_MAX_VX) m.vx = RQ_MAX_VX;
  if (m.vx < -RQ_MAX_VX) m.vx = -RQ_MAX_VX;

  if (input.jump) m.jumpBuf = RQ_BUFFER;
  else {
    if (m.jumpHeld && m.vy < 0) m.vy *= RQ_JUMP_CUT;
    m.jumpHeld = false;
    m.jumpBuf = Math.max(0, m.jumpBuf - dt);
  }
  if (m.onGround) m.coyote = RQ_COYOTE;
  else m.coyote = Math.max(0, m.coyote - dt);
  if (m.jumpBuf > 0 && m.coyote > 0) {
    m.vy = -RQ_JUMP;
    m.onGround = false;
    m.coyote = 0;
    m.jumpBuf = 0;
    m.jumpHeld = true;
  }

  m.vy += RQ_GRAVITY * dt;
  if (m.vy > 900) m.vy = 900;

  // 分轴移动，防穿透
  m.x += m.vx * dt;
  let hits = overlaps(m, m.x, m.y);
  resolveAxis(m, hits, 'x');

  m.y += m.vy * dt;
  hits = overlaps(m, m.x, m.y);
  m.onGround = resolveAxis(m, hits, 'y');

  // 骑乘移动踏板
  if (m.onGround) {
    for (const mv of m.movers) {
      if (m.y + RQ_RADIUS >= mv.y - 2 && m.y + RQ_RADIUS <= mv.y + 12 && m.x >= mv.x - 4 && m.x <= mv.x + mv.w + 4) {
        const u1 = (1 - Math.cos((((mv.t + dt) % mv.period) / mv.period) * Math.PI * 2)) / 2;
        const nx = mv.ax + (mv.bx - mv.ax) * u1;
        m.x += nx - mv.x;
      }
    }
  }

  hits = overlaps(m, m.x, m.y);
  collectSpecial(m, hits);

  const levelH = m.rows * RQ_TILE;
  if (m.y > levelH + 40 || m.x < -40 || m.x > m.cols * RQ_TILE + 40) {
    kill(m, '掉出场地，回到检查点。');
  }
}

export function stepRq(m: RqMatch, seconds: number, input: RqInput) {
  const n = Math.ceil(seconds / RQ_DT);
  for (let i = 0; i < n; i++) {
    if (m.phase !== 'play') return;
    tickRq(m, RQ_DT, input);
  }
}

export function rqStars(deaths: number, won: boolean): number {
  if (!won) return 0;
  if (deaths === 0) return 3;
  if (deaths <= 2) return 2;
  return 1;
}

/** 沿路径点自动走：用于验证关卡可达。 */
export function autoPlayRq(levelId: number, limit = 90): RqMatch {
  const m = createRqMatch(levelId);
  const pts = (m.level.waypoints ?? []).map((p) => ({
    x: p.c * RQ_TILE + RQ_TILE / 2,
    y: p.r * RQ_TILE + RQ_TILE / 2,
  }));
  for (let r = 0; r < m.level.map.length; r++) {
    const c = m.level.map[r].indexOf('G');
    if (c >= 0) pts.push({ x: c * RQ_TILE + RQ_TILE / 2, y: r * RQ_TILE });
  }
  let wi = 0;
  let holdJump = 0;
  const max = Math.ceil(limit / RQ_DT);
  let stuck = 0;
  let lastX = m.x;
  for (let i = 0; i < max; i++) {
    if (m.phase !== 'play') return m;
    while (wi < pts.length - 1 && Math.abs(m.x - pts[wi].x) < 22 && Math.abs(m.y - pts[wi].y) < 64) wi += 1;
    const goal = pts[Math.min(wi, pts.length - 1)] ?? { x: m.x + 200, y: m.y };
    const left = m.x > goal.x + 8;
    const right = m.x < goal.x - 8;
    const dir = right ? 1 : left ? -1 : 1;
    const footR = Math.floor((m.y + RQ_RADIUS + 6) / RQ_TILE);
    let want = false;
    for (const look of [20, 36, 52, 70]) {
      const aheadC = Math.floor((m.x + dir * look) / RQ_TILE);
      const floor = tileAt(m, aheadC, footR);
      const mid = tileAt(m, aheadC, footR - 1);
      if (floor === '^' || mid === '^') want = true;
      if (!isSolid(floor) && floor !== 'M' && floor !== '=' && floor !== '*' && floor !== 'S' && floor !== 'C' && floor !== 'G') {
        want = true;
      }
    }
    if (goal.y < m.y - 36 && m.onGround) want = true;
    if (goal.y > m.y + 28) want = false; // 目标在下方则走下去，不要跳过坑
    for (const mv of m.movers) {
      const closeX = Math.abs(mv.x + mv.w / 2 - m.x) < 80;
      const closeY = Math.abs(mv.y - (m.y + RQ_RADIUS)) < 56;
      if (closeX && closeY && m.onGround && mv.x + mv.w / 2 > m.x - 20) want = true;
    }
    if (want && (m.onGround || m.coyote > 0)) holdJump = 0.5;
    const jump = holdJump > 0;
    if (holdJump > 0) holdJump -= RQ_DT;
    tickRq(m, RQ_DT, { left, right, jump });
    if (Math.abs(m.x - lastX) < 0.03) stuck += 1;
    else stuck = 0;
    lastX = m.x;
    if (stuck > 90) {
      holdJump = 0.5;
      tickRq(m, RQ_DT, { left: !left, right: !right, jump: true });
      stuck = 0;
    }
  }
  return m;
}
