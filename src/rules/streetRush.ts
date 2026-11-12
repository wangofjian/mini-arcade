/** 街区突围：分段推进的轨道射击纯规则。场景与对手均为虚构。 */

export const SR_W = 840;
export const SR_H = 480;
export const SR_DT = 1 / 60;
export const SR_SAVE_KEY = 'street-rush-save';
export const SR_LEVEL_COUNT = 8;
export const SR_MAG = 8;
export const SR_RELOAD = 1.15;
export const SR_FIRE_CD = 0.12;
export const SR_MAX_HP = 100;

export type SrPhase = 'ready' | 'play' | 'won' | 'lost';
export type SrKind = 'scout' | 'gunner' | 'sniper' | 'shield' | 'rusher';

export type SrEnemyDef = {
  kind: SrKind;
  name: string;
  hp: number;
  radius: number;
  telegraph: number;
  damage: number;
  shots: number;
  interval: number;
  priority: boolean;
  hide?: boolean;
  color: string;
};

export const SR_KINDS: Record<SrKind, SrEnemyDef> = {
  scout: { kind: 'scout', name: '探子', hp: 1, radius: 28, telegraph: 1.35, damage: 8, shots: 2, interval: 1.6, priority: false, color: '#d2a25a' },
  gunner: { kind: 'gunner', name: '枪手', hp: 2, radius: 30, telegraph: 1.05, damage: 12, shots: 3, interval: 1.3, priority: false, color: '#c36b5c' },
  sniper: { kind: 'sniper', name: '冷枪', hp: 1, radius: 24, telegraph: 0.72, damage: 22, shots: 2, interval: 1.5, priority: true, color: '#d44' },
  shield: { kind: 'shield', name: '持盾', hp: 3, radius: 34, telegraph: 1.15, damage: 14, shots: 2, interval: 1.8, priority: false, hide: true, color: '#7a8aa0' },
  rusher: { kind: 'rusher', name: '冲阵', hp: 2, radius: 28, telegraph: 0.9, damage: 16, shots: 1, interval: 1.2, priority: true, color: '#c47a2a' },
};

export type SrSpawn = { t: number; x: number; y: number; kind: SrKind };

export type SrSegment = {
  name: string;
  duration: number;
  backdrop: 'market' | 'pier' | 'yard' | 'plaza' | 'alley' | 'bridge';
  spawns: SrSpawn[];
};

export type SrLevel = {
  id: number;
  name: string;
  hint: string;
  segments: SrSegment[];
};

export type SrEnemy = {
  id: number;
  kind: SrKind;
  x: number;
  y: number;
  hp: number;
  maxHp: number;
  radius: number;
  telegraph: number;
  telegraphLeft: number;
  damage: number;
  shotsLeft: number;
  interval: number;
  cooldown: number;
  priority: boolean;
  hiding: boolean;
  hideT: number;
  exposedT: number;
  phase: 'inbound' | 'telegraph' | 'open' | 'dead';
  inbound: number;
  fired: number;
};

export type SrMatch = {
  level: SrLevel;
  phase: SrPhase;
  segment: number;
  time: number;
  segTime: number;
  hp: number;
  ammo: number;
  reloading: number;
  fireCd: number;
  enemies: SrEnemy[];
  spawnCursor: number;
  score: number;
  stars: number;
  hits: number;
  shots: number;
  defeated: number;
  totalEnemies: number;
  reticle: { x: number; y: number };
  message: string;
  nextId: number;
  traces: { x1: number; y1: number; x2: number; y2: number; life: number; hit: boolean }[];
};

function burst(t0: number, items: [number, number, SrKind][], gap = 0): SrSpawn[] {
  return items.map(([x, y, kind], i) => ({ t: t0 + i * gap, x, y, kind }));
}

export const SR_LEVELS: SrLevel[] = [
  {
    id: 1,
    name: '暮色市集',
    hint: '点向预警的对手射击。弹匣打空会自动换弹。',
    segments: [
      { name: '摊位巷口', duration: 14, backdrop: 'market', spawns: burst(1, [[520, 220, 'scout'], [640, 280, 'scout'], [700, 180, 'scout']], 1.8) },
      { name: '灯笼走廊', duration: 16, backdrop: 'market', spawns: burst(1, [[500, 200, 'scout'], [620, 300, 'gunner'], [740, 220, 'scout'], [580, 160, 'scout']], 1.6) },
    ],
  },
  {
    id: 2,
    name: '河灯栈桥',
    hint: '注意带红标的冷枪，他们预警更短、伤害更高。',
    segments: [
      { name: '栈桥入口', duration: 14, backdrop: 'pier', spawns: burst(0.8, [[540, 240, 'scout'], [680, 200, 'sniper'], [600, 320, 'scout']], 1.5) },
      { name: '河心亭', duration: 16, backdrop: 'pier', spawns: burst(1, [[500, 180, 'gunner'], [720, 260, 'sniper'], [580, 300, 'scout'], [660, 160, 'sniper']], 1.4) },
    ],
  },
  {
    id: 3,
    name: '货棚后院',
    hint: '持盾的对手会时不时缩回去，露头再打。',
    segments: [
      { name: '板箱堆', duration: 15, backdrop: 'yard', spawns: burst(1, [[560, 250, 'shield'], [700, 200, 'scout'], [640, 320, 'gunner']], 1.2) },
      { name: '后院门', duration: 16, backdrop: 'yard', spawns: burst(0.8, [[500, 220, 'shield'], [620, 160, 'sniper'], [740, 280, 'shield'], [580, 340, 'scout']], 1.3) },
    ],
  },
  {
    id: 4,
    name: '钟楼广场',
    hint: '场地更空旷，对手会从两侧同时预警。',
    segments: [
      { name: '喷泉边', duration: 14, backdrop: 'plaza', spawns: burst(0.6, [[480, 200, 'scout'], [760, 200, 'scout'], [620, 300, 'gunner'], [620, 140, 'sniper']], 0.9) },
      { name: '钟楼台阶', duration: 16, backdrop: 'plaza', spawns: burst(0.8, [[500, 160, 'sniper'], [720, 160, 'sniper'], [480, 320, 'gunner'], [740, 320, 'gunner'], [620, 240, 'scout']], 1.0) },
    ],
  },
  {
    id: 5,
    name: '窄巷折返',
    hint: '冲阵会边靠近边开火，优先处理他们。',
    segments: [
      { name: '窄巷', duration: 14, backdrop: 'alley', spawns: burst(0.7, [[700, 240, 'rusher'], [540, 180, 'scout'], [660, 320, 'rusher']], 1.1) },
      { name: '转角', duration: 16, backdrop: 'alley', spawns: burst(0.6, [[720, 200, 'rusher'], [500, 280, 'gunner'], [740, 320, 'rusher'], [580, 160, 'sniper'], [640, 260, 'scout']], 1.0) },
    ],
  },
  {
    id: 6,
    name: '廊桥夜色',
    hint: '三段路，记得在间隙换弹。',
    segments: [
      { name: '桥头', duration: 12, backdrop: 'bridge', spawns: burst(0.6, [[540, 200, 'gunner'], [700, 260, 'scout'], [620, 150, 'sniper']], 1.1) },
      { name: '桥心', duration: 14, backdrop: 'bridge', spawns: burst(0.5, [[500, 180, 'shield'], [760, 180, 'shield'], [620, 300, 'rusher'], [680, 240, 'scout']], 1.0) },
      { name: '对岸', duration: 14, backdrop: 'bridge', spawns: burst(0.5, [[520, 160, 'sniper'], [720, 160, 'sniper'], [500, 320, 'gunner'], [740, 320, 'rusher'], [620, 230, 'scout']], 0.9) },
    ],
  },
  {
    id: 7,
    name: '市集夜巡',
    hint: '对手更密，优先打红色危险目标。',
    segments: [
      { name: '夜市入口', duration: 13, backdrop: 'market', spawns: burst(0.5, [[500, 180, 'scout'], [650, 300, 'gunner'], [760, 200, 'sniper'], [580, 250, 'scout'], [700, 340, 'rusher']], 0.8) },
      { name: '中摊', duration: 15, backdrop: 'market', spawns: burst(0.5, [[520, 160, 'shield'], [740, 160, 'gunner'], [500, 320, 'rusher'], [760, 320, 'sniper'], [620, 230, 'scout'], [680, 280, 'scout']], 0.75) },
      { name: '尾巷', duration: 15, backdrop: 'alley', spawns: burst(0.4, [[540, 150, 'sniper'], [700, 150, 'sniper'], [500, 300, 'rusher'], [760, 300, 'shield'], [620, 220, 'gunner'], [660, 340, 'scout']], 0.7) },
    ],
  },
  {
    id: 8,
    name: '街区尽头',
    hint: '最后一段会多方同时预警，打完才能突围。',
    segments: [
      { name: '前街', duration: 13, backdrop: 'plaza', spawns: burst(0.4, [[480, 160, 'scout'], [620, 140, 'sniper'], [760, 160, 'scout'], [500, 320, 'gunner'], [740, 320, 'rusher']], 0.7) },
      { name: '中街', duration: 15, backdrop: 'yard', spawns: burst(0.4, [[500, 170, 'shield'], [700, 170, 'sniper'], [480, 310, 'rusher'], [760, 310, 'gunner'], [620, 230, 'scout'], [660, 340, 'sniper']], 0.65) },
      { name: '尽头广场', duration: 18, backdrop: 'plaza', spawns: burst(0.35, [[490, 150, 'sniper'], [620, 140, 'sniper'], [750, 150, 'sniper'], [480, 260, 'shield'], [760, 260, 'rusher'], [500, 340, 'gunner'], [700, 340, 'gunner'], [620, 230, 'rusher']], 0.55) },
    ],
  },
];

export function srLevelById(id: number): SrLevel | undefined {
  return SR_LEVELS.find((l) => l.id === id);
}

export function countSpawns(level: SrLevel): number {
  return level.segments.reduce((n, s) => n + s.spawns.length, 0);
}

export function createSrMatch(levelId: number): SrMatch {
  const level = srLevelById(levelId);
  if (!level) throw new Error('未知关卡');
  return {
    level,
    phase: 'ready',
    segment: 0,
    time: 0,
    segTime: 0,
    hp: SR_MAX_HP,
    ammo: SR_MAG,
    reloading: 0,
    fireCd: 0,
    enemies: [],
    spawnCursor: 0,
    score: 0,
    stars: 0,
    hits: 0,
    shots: 0,
    defeated: 0,
    totalEnemies: countSpawns(level),
    reticle: { x: SR_W / 2, y: SR_H / 2 },
    message: '点「开始」进入街区。瞄准预警的对手再开火。',
    nextId: 1,
    traces: [],
  };
}

export function startSr(m: SrMatch) {
  if (m.phase !== 'ready' && m.phase !== 'lost' && m.phase !== 'won') return;
  const fresh = createSrMatch(m.level.id);
  Object.assign(m, fresh);
  m.phase = 'play';
  m.message = m.level.segments[0].name + '：注意预警。';
}

function spawnDue(m: SrMatch) {
  const seg = m.level.segments[m.segment];
  if (!seg) return;
  while (m.spawnCursor < seg.spawns.length && seg.spawns[m.spawnCursor].t <= m.segTime) {
    const ev = seg.spawns[m.spawnCursor++];
    const def = SR_KINDS[ev.kind];
    m.enemies.push({
      id: m.nextId++,
      kind: ev.kind,
      x: ev.x,
      y: ev.y,
      hp: def.hp,
      maxHp: def.hp,
      radius: def.radius,
      telegraph: def.telegraph,
      telegraphLeft: def.telegraph,
      damage: def.damage,
      shotsLeft: def.shots,
      interval: def.interval,
      cooldown: 0,
      priority: def.priority,
      hiding: !!def.hide,
      hideT: def.hide ? 0.6 : 0,
      exposedT: def.hide ? 0 : 99,
      phase: 'inbound',
      inbound: 0.35,
      fired: 0,
    });
  }
}

function updateEnemies(m: SrMatch, dt: number) {
  for (const e of m.enemies) {
    if (e.phase === 'dead' || e.hp <= 0) continue;
    if (e.phase === 'inbound') {
      e.inbound -= dt;
      if (e.inbound <= 0) {
        e.phase = 'telegraph';
        e.telegraphLeft = e.telegraph;
      }
      continue;
    }
    if (e.hiding && e.kind === 'shield') {
      e.hideT -= dt;
      if (e.hideT <= 0) {
        e.hiding = false;
        e.exposedT = 1.35;
      } else continue;
    } else if (e.kind === 'shield' && !e.hiding) {
      e.exposedT -= dt;
      if (e.exposedT <= 0 && e.phase !== 'telegraph') {
        e.hiding = true;
        e.hideT = 0.85;
      }
    }
    if (e.kind === 'rusher' && e.x > 360) e.x -= 36 * dt;

    if (e.phase === 'telegraph') {
      e.telegraphLeft -= dt;
      if (e.telegraphLeft <= 0) {
        e.phase = 'open';
        fireAtPlayer(m, e);
        e.cooldown = e.interval;
      }
      continue;
    }
    if (e.phase === 'open') {
      e.cooldown -= dt;
      if (e.cooldown <= 0 && e.shotsLeft > 0 && !e.hiding) {
        fireAtPlayer(m, e);
        e.cooldown = e.interval;
      }
    }
  }
  m.enemies = m.enemies.filter((e) => e.phase !== 'dead' && e.hp > 0);
}

function fireAtPlayer(m: SrMatch, e: SrEnemy) {
  if (e.shotsLeft <= 0) return;
  e.shotsLeft -= 1;
  e.fired += 1;
  m.hp -= e.damage;
  if (m.hp <= 0) {
    m.hp = 0;
    m.phase = 'lost';
    m.stars = 0;
    m.message = '你被击退了。再观察预警，重新突围。';
  }
}

export type SrShotResult = {
  fired: boolean;
  reason?: 'reload' | 'empty' | 'cd' | 'phase';
  hit: SrEnemy | null;
  center: boolean;
  damage: number;
};

export function reloadSr(m: SrMatch): boolean {
  if (m.phase !== 'play') return false;
  if (m.reloading > 0) return false;
  if (m.ammo >= SR_MAG) return false;
  m.reloading = SR_RELOAD;
  m.message = '换弹中…';
  return true;
}

export function shootSr(m: SrMatch, x: number, y: number): SrShotResult {
  m.reticle.x = x;
  m.reticle.y = y;
  if (m.phase !== 'play') return { fired: false, reason: 'phase', hit: null, center: false, damage: 0 };
  if (m.reloading > 0) return { fired: false, reason: 'reload', hit: null, center: false, damage: 0 };
  if (m.fireCd > 0) return { fired: false, reason: 'cd', hit: null, center: false, damage: 0 };
  if (m.ammo <= 0) {
    reloadSr(m);
    return { fired: false, reason: 'empty', hit: null, center: false, damage: 0 };
  }
  m.ammo -= 1;
  m.shots += 1;
  m.fireCd = SR_FIRE_CD;
  let best: SrEnemy | null = null;
  let bestD = 1e9;
  for (const e of m.enemies) {
    if (e.hp <= 0 || e.phase === 'dead' || e.phase === 'inbound') continue;
    if (e.hiding) continue;
    const d = Math.hypot(e.x - x, e.y - y);
    if (d <= e.radius + 6 && d < bestD) {
      best = e;
      bestD = d;
    }
  }
  const hit = best;
  let center = false;
  let damage = 0;
  if (hit) {
    center = bestD <= hit.radius * 0.38;
    damage = center ? 2 : 1;
    hit.hp -= damage;
    m.hits += 1;
    m.score += center ? 25 : 15;
    if (hit.priority) m.score += 10;
    if (hit.hp <= 0) {
      hit.phase = 'dead';
      m.defeated += 1;
      m.score += 40;
    }
  }
  if (m.ammo <= 0) reloadSr(m);
  m.traces.push({ x1: 180, y1: SR_H - 40, x2: x, y2: y, life: 0.12, hit: !!hit });
  return { fired: true, hit, center, damage };
}

function concludeSegment(m: SrMatch) {
  const seg = m.level.segments[m.segment];
  if (!seg) return;
  const spawnedAll = m.spawnCursor >= seg.spawns.length;
  const clear = spawnedAll && m.enemies.length === 0;
  const timeUp = m.segTime >= seg.duration && spawnedAll;
  if (clear || (timeUp && m.enemies.length === 0)) {
    if (m.segment + 1 < m.level.segments.length) {
      m.segment += 1;
      m.segTime = 0;
      m.spawnCursor = 0;
      m.message = '进入：' + m.level.segments[m.segment].name;
    } else {
      m.phase = 'won';
      m.stars = srStars(m.hp, m.shots, m.hits);
      m.score += m.hp * 2 + m.stars * 80;
      m.message = '街区突围成功！' + m.stars + ' 星，剩余生命 ' + m.hp + '。';
    }
  }
  // 时间到但仍有敌人：继续打完，不强制失败
}

export function srStars(hp: number, shots: number, hits: number): number {
  if (hp <= 0) return 0;
  const acc = shots > 0 ? hits / shots : 0;
  if (hp >= 70 && acc >= 0.5) return 3;
  if (hp >= 40) return 2;
  return 1;
}

export function tickSr(m: SrMatch, dt: number) {
  if (m.phase !== 'play') return;
  const sliced = Math.max(0, Math.min(dt, 0.05));
  m.time += sliced;
  m.segTime += sliced;
  if (m.fireCd > 0) m.fireCd = Math.max(0, m.fireCd - sliced);
  if (m.reloading > 0) {
    m.reloading -= sliced;
    if (m.reloading <= 0) {
      m.reloading = 0;
      m.ammo = SR_MAG;
      m.message = '换弹完成。';
    }
  }
  spawnDue(m);
  updateEnemies(m, sliced);
  m.traces = m.traces.filter((t) => {
    t.life -= sliced;
    return t.life > 0;
  });
  if (m.phase === 'play') concludeSegment(m);
}

export function stepSr(m: SrMatch, seconds: number) {
  const n = Math.ceil(seconds / SR_DT);
  for (let i = 0; i < n; i++) {
    if (m.phase !== 'play') return;
    tickSr(m, SR_DT);
  }
}

/** 自动瞄准：优先还在预警或即将开火的高威胁目标。用于验证关卡可胜。 */
export function autoPlaySr(levelId: number, limit = 180, aimNoise = 0): SrMatch {
  const m = createSrMatch(levelId);
  startSr(m);
  const max = Math.ceil(limit / SR_DT);
  for (let i = 0; i < max; i++) {
    if (m.phase !== 'play') return m;
    if (m.reloading <= 0 && m.ammo === 0) reloadSr(m);
    if (m.reloading <= 0 && m.fireCd <= 0 && m.ammo > 0) {
      const live = m.enemies.filter((e) => e.hp > 0 && e.phase !== 'dead' && e.phase !== 'inbound' && !e.hiding);
      live.sort((a, b) => {
        const ur = (e: SrEnemy) => (e.priority ? 0 : 2) + (e.phase === 'telegraph' ? e.telegraphLeft : 3);
        return ur(a) - ur(b);
      });
      const t = live[0];
      if (t) shootSr(m, t.x + aimNoise, t.y + aimNoise);
    }
    tickSr(m, SR_DT);
  }
  return m;
}
