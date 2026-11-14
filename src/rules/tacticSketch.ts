/** 战术草稿：排阵与指令影响简化比赛模拟（上帝视角回放，虚构球员与联赛）。 */

import { parseLevelSave, type LevelSave } from './progressSave';

export const TS_VIEW_W = 960;
export const TS_VIEW_H = 540;
export const TS_DT = 1 / 60;
export const TS_SAVE_KEY = 'tactic-sketch-save';
export const TS_LEVEL_COUNT = 8;
export const TS_PITCH_W = 105;
export const TS_PITCH_H = 68;
/** 1 倍速下每现实秒推进的比赛分钟数（90 分钟约 36 秒）。 */
export const TS_MIN_PER_SEC = 2.5;

export type FormationId = '433' | '442' | '4231' | '532';
export type PressId = 'high' | 'mid' | 'low';
export type BuildId = 'possession' | 'direct' | 'counter';
export type WidthId = 'wide' | 'central';

export type Tactic = {
  formation: FormationId;
  press: PressId;
  build: BuildId;
  width: WidthId;
};

export type TeamRatings = { atk: number; mid: number; def: number };

export type TsPlayerDef = { no: number; name: string; role: string };

export type TsOpp = {
  name: string;
  short: string;
  color: string;
  color2: string;
  ratings: TeamRatings;
  tactic: Tactic;
};

export type TsLevel = {
  id: number;
  name: string;
  venue: 'home' | 'away';
  hint: string;
  opponent: TsOpp;
  recommended: Tactic;
};

export type Vec2 = { x: number; y: number };

export type TsMove = {
  at: number;
  kind: 'pass' | 'cross' | 'through' | 'shot' | 'save' | 'goal' | 'intercept' | 'clear';
  team: 0 | 1;
  from: Vec2;
  to: Vec2;
  fromNo: number;
  toNo: number;
  lane: 'wing' | 'central';
  text: string;
};

export type PlanEval = {
  ourPower: number;
  theirPower: number;
  ourPoss: number;
  ourWing: number;
  theirWing: number;
  ourPassLen: number;
  theirPassLen: number;
  ourPressHeight: number;
  theirPressHeight: number;
  notes: string[];
};

export type HalfReport = {
  goalsFor: number;
  goalsAgainst: number;
  shotsFor: number;
  shotsAgainst: number;
  onTargetFor: number;
  onTargetAgainst: number;
  possession: number;
  wingAttacks: number;
  centralAttacks: number;
  interceptHigh: number;
  avgPassLen: number;
  notes: string[];
  moves: TsMove[];
  eval: PlanEval;
};

export type TsActor = {
  no: number;
  name: string;
  team: 0 | 1;
  role: string;
  x: number;
  y: number;
  slotX: number;
  slotY: number;
};

export type TsPhase = 'setup' | 'first' | 'halftime' | 'second' | 'fulltime';

export type TsBriefing = {
  goalsFor: number;
  goalsAgainst: number;
  shotsFor: number;
  shotsAgainst: number;
  onTargetFor: number;
  onTargetAgainst: number;
  possession: number;
  wingAttacks: number;
  interceptHigh: number;
  avgPassLen: number;
  notes: string[];
  events: string[];
  stars: number;
};

export type TsMatch = {
  level: TsLevel;
  tactic: Tactic;
  htTactic: Tactic | null;
  htUsed: boolean;
  phase: TsPhase;
  speed: 1 | 2 | 4;
  minute: number;
  score: [number, number];
  first: HalfReport | null;
  second: HalfReport | null;
  moves: TsMove[];
  moveIndex: number;
  moveT: number;
  players: TsActor[];
  ball: Vec2;
  possession: 0 | 1;
  message: string;
  log: string[];
  stars: number;
  briefing: TsBriefing | null;
  seed: number;
};

export const TS_FORMATIONS: { id: FormationId; label: string }[] = [
  { id: '433', label: '4-3-3' },
  { id: '442', label: '4-4-2' },
  { id: '4231', label: '4-2-3-1' },
  { id: '532', label: '5-3-2' },
];

export const TS_PRESSES: { id: PressId; label: string }[] = [
  { id: 'high', label: '前场压迫' },
  { id: 'mid', label: '中场压迫' },
  { id: 'low', label: '低位防守' },
];

export const TS_BUILDS: { id: BuildId; label: string }[] = [
  { id: 'possession', label: '控球渗透' },
  { id: 'direct', label: '直接传球' },
  { id: 'counter', label: '快速反击' },
];

export const TS_WIDTHS: { id: WidthId; label: string }[] = [
  { id: 'wide', label: '边路进攻' },
  { id: 'central', label: '中路进攻' },
];

export const TS_OUR_NAME = '青禾联';
export const TS_OUR_SHORT = '青禾';
export const TS_OUR_COLOR = '#1f7a5c';
export const TS_OUR_COLOR2 = '#d8f0e6';
export const TS_OUR_RATINGS: TeamRatings = { atk: 72, mid: 74, def: 71 };

export const TS_SQUAD: TsPlayerDef[] = [
  { no: 1, name: '林秋石', role: 'GK' },
  { no: 2, name: '方浅岸', role: 'FB' },
  { no: 5, name: '周南川', role: 'FB' },
  { no: 3, name: '韩迟', role: 'CB' },
  { no: 4, name: '裴暮白', role: 'CB' },
  { no: 15, name: '莫远潮', role: 'CB' },
  { no: 6, name: '陆衡', role: 'DM' },
  { no: 8, name: '叶澄', role: 'CM' },
  { no: 10, name: '江晓荻', role: 'AM' },
  { no: 7, name: '苏晚晴', role: 'WG' },
  { no: 11, name: '吴青川', role: 'WG' },
  { no: 9, name: '陈灯花', role: 'ST' },
  { no: 14, name: '霍小南', role: 'ST' },
];

const SUR = ['谭', '贺', '祁', '龚', '岑', '侯', '尹', '钟', '蓝', '闵', '韶', '翟', '卓', '芮', '路'];
const GIV = ['秋', '远舟', '小满', '衡山', '晚白', '青迟', '南风', '暮云', '浅川', '灯野', '叙', '亦舟', '清越', '星桥', '岸北'];

function oppSquad(seed: number): TsPlayerDef[] {
  const r = { s: (seed * 9973 + 13) >>> 0 };
  const roles = ['GK', 'FB', 'CB', 'CB', 'FB', 'CM', 'CM', 'CM', 'WG', 'ST', 'WG'];
  const used = new Set<string>();
  return roles.map((role, i) => {
    let name = '';
    for (let k = 0; k < 20; k++) {
      name = SUR[Math.floor(rnd(r) * SUR.length)] + GIV[Math.floor(rnd(r) * GIV.length)];
      if (!used.has(name)) break;
    }
    used.add(name);
    return { no: i === 0 ? 1 : i + 1, name, role };
  });
}

export const TS_LEVELS: TsLevel[] = [
  {
    id: 1,
    name: '联赛热身',
    venue: 'home',
    hint: '主场对阵实力较弱的青年队，放开进攻也能拿下。想要三星就多压着打、把控球权拿住。',
    opponent: {
      name: '梧桐青年', short: '青年', color: '#6b8f3a', color2: '#e8f0d8',
      ratings: { atk: 52, mid: 54, def: 50 },
      tactic: { formation: '442', press: 'mid', build: 'direct', width: 'wide' },
    },
    recommended: { formation: '433', press: 'high', build: 'possession', width: 'wide' },
  },
  {
    id: 2,
    name: '主场联赛',
    venue: 'home',
    hint: '实力接近的主场。稳住中场，用边路把对方拉开。',
    opponent: {
      name: '橘湾城', short: '橘湾', color: '#c45c1a', color2: '#fde8d4',
      ratings: { atk: 68, mid: 69, def: 68 },
      tactic: { formation: '442', press: 'mid', build: 'possession', width: 'central' },
    },
    recommended: { formation: '4231', press: 'mid', build: 'possession', width: 'wide' },
  },
  {
    id: 3,
    name: '客场高压',
    venue: 'away',
    hint: '客场面对前场压迫极凶的强队，身后空档很大——回收站位，打快速反击。',
    opponent: {
      name: '紫藤体育', short: '紫藤', color: '#6a3d8f', color2: '#efe4f7',
      ratings: { atk: 82, mid: 80, def: 78 },
      tactic: { formation: '433', press: 'high', build: 'possession', width: 'wide' },
    },
    recommended: { formation: '532', press: 'low', build: 'counter', width: 'central' },
  },
  {
    id: 4,
    name: '破密集防守',
    venue: 'home',
    hint: '对手收缩成低位密集，硬冲或反击容易撞墙。耐心控球，从边路拉开防线。',
    opponent: {
      name: '银桦队', short: '银桦', color: '#6a7380', color2: '#e6eaee',
      ratings: { atk: 60, mid: 60, def: 74 },
      tactic: { formation: '532', press: 'low', build: 'direct', width: 'central' },
    },
    recommended: { formation: '4231', press: 'mid', build: 'possession', width: 'wide' },
  },
  {
    id: 5,
    name: '德比主场',
    venue: 'home',
    hint: '德比的中场会很挤。用双后腰阵型把球权拿住，再慢慢向前渗透。',
    opponent: {
      name: '暮港联合', short: '暮港', color: '#2a3d66', color2: '#d8e0f0',
      ratings: { atk: 69, mid: 71, def: 69 },
      tactic: { formation: '4231', press: 'mid', build: 'possession', width: 'central' },
    },
    recommended: { formation: '4231', press: 'mid', build: 'possession', width: 'wide' },
  },
  {
    id: 6,
    name: '堵住边路',
    venue: 'home',
    hint: '对手边路突击很快，不要跟着拉开。收紧中路，堵住两侧走廊。',
    opponent: {
      name: '霜桥队', short: '霜桥', color: '#3a6a88', color2: '#d8eef6',
      ratings: { atk: 78, mid: 70, def: 70 },
      tactic: { formation: '433', press: 'high', build: 'direct', width: 'wide' },
    },
    recommended: { formation: '442', press: 'mid', build: 'direct', width: 'central' },
  },
  {
    id: 7,
    name: '客场恶战',
    venue: 'away',
    hint: '客场遇强攻高压，先守住再反击，别和对攻。',
    opponent: {
      name: '灯塔竞技', short: '灯塔', color: '#8a3030', color2: '#f6dcdc',
      ratings: { atk: 85, mid: 78, def: 76 },
      tactic: { formation: '433', press: 'high', build: 'possession', width: 'wide' },
    },
    recommended: { formation: '532', press: 'low', build: 'counter', width: 'central' },
  },
  {
    id: 8,
    name: '梧桐杯决赛',
    venue: 'home',
    hint: '决赛对手综合最强，且喜欢前场压迫。低位防守、快速反击，利用他们压上留下的空档。',
    opponent: {
      name: '榕城十一', short: '榕城', color: '#1a4a3a', color2: '#d4ece0',
      ratings: { atk: 86, mid: 85, def: 84 },
      tactic: { formation: '4231', press: 'high', build: 'possession', width: 'central' },
    },
    recommended: { formation: '532', press: 'low', build: 'counter', width: 'central' },
  },
];

export function tsLevelById(id: number): TsLevel {
  return TS_LEVELS.find((l) => l.id === id) ?? TS_LEVELS[0];
}

export function defaultTactic(): Tactic {
  return { formation: '442', press: 'mid', build: 'direct', width: 'central' };
}

export function copyTactic(t: Tactic): Tactic {
  return { formation: t.formation, press: t.press, build: t.build, width: t.width };
}

export function tacticsEqual(a: Tactic, b: Tactic): boolean {
  return a.formation === b.formation && a.press === b.press && a.build === b.build && a.width === b.width;
}

type Shape = { atk: number; mid: number; def: number; compact: number };

function shape(f: FormationId): Shape {
  if (f === '433') return { atk: 1.16, mid: 0.98, def: 0.9, compact: 0.88 };
  if (f === '442') return { atk: 1.04, mid: 1.06, def: 1.06, compact: 1.05 };
  if (f === '4231') return { atk: 1.08, mid: 1.2, def: 1, compact: 1 };
  return { atk: 0.88, mid: 0.96, def: 1.26, compact: 1.22 };
}

function pressMod(p: PressId): { line: number; space: number } {
  if (p === 'high') return { line: 0.72, space: 1.25 };
  if (p === 'low') return { line: 0.32, space: 0.72 };
  return { line: 0.5, space: 1 };
}

function buildMod(b: BuildId): { poss: number; passLen: number; trans: number; q: number } {
  if (b === 'possession') return { poss: 1.16, passLen: 0.72, trans: 0.75, q: 1.02 };
  if (b === 'counter') return { poss: 0.86, passLen: 1.35, trans: 1.3, q: 1.08 };
  return { poss: 0.98, passLen: 1.15, trans: 1, q: 1 };
}

function widthShare(w: WidthId): number {
  return w === 'wide' ? 0.72 : 0.32;
}

function clamp(n: number, a: number, b: number): number {
  return Math.max(a, Math.min(b, n));
}

type SidePlan = { ratings: TeamRatings; tactic: Tactic };

export function evaluatePlan(us: SidePlan, them: SidePlan, venue: 'home' | 'away'): PlanEval {
  const uf = shape(us.tactic.formation);
  const tf = shape(them.tactic.formation);
  const up = pressMod(us.tactic.press);
  const tp = pressMod(them.tactic.press);
  const ub = buildMod(us.tactic.build);
  const tb = buildMod(them.tactic.build);
  const venueAtk = venue === 'home' ? 1.08 : 0.94;
  const venueOpp = venue === 'home' ? 0.94 : 1.06;
  const venuePoss = venue === 'home' ? 0.045 : -0.035;
  const notes: string[] = [];

  let ourAtk = (us.ratings.atk / 70) * uf.atk * ub.q * venueAtk;
  let ourDef = (us.ratings.def / 70) * uf.def * (us.tactic.press === 'low' ? 1.14 : us.tactic.press === 'high' ? 0.93 : 1);
  let thAtk = (them.ratings.atk / 70) * tf.atk * tb.q * venueOpp;
  let thDef = (them.ratings.def / 70) * tf.def * (them.tactic.press === 'low' ? 1.14 : them.tactic.press === 'high' ? 0.93 : 1);

  if (ub.trans > 1.1 && tp.space > 1.1) {
    ourAtk *= 1.36;
    notes.push('反击打进了对方高压身后的空档');
  }
  if (tb.trans > 1.1 && up.space > 1.1) {
    thAtk *= 1.36;
    notes.push('我方前场压迫留下了身后空档');
  }
  if (us.tactic.build === 'possession' && them.tactic.press === 'low') {
    ourAtk *= us.tactic.width === 'wide' ? 1.3 : 1.12;
    notes.push(us.tactic.width === 'wide' ? '控球并从边路拉开了密集防守' : '耐心控球消耗着低位防线');
  }
  if (us.tactic.build === 'counter' && them.tactic.press === 'low') {
    ourAtk *= 0.62;
    ourDef *= 0.85;
    thAtk *= 1.35;
    notes.push('对方缩在禁区前，反击缺少空间，长传还容易丢');
  }
  if (them.tactic.build === 'possession' && us.tactic.press === 'low') {
    thAtk *= them.tactic.width === 'wide' ? 1.3 : 1.12;
  }
  if (them.tactic.build === 'counter' && us.tactic.press === 'low') {
    thAtk *= 0.62;
    thDef *= 0.85;
    ourAtk *= 1.35;
  }
  if (us.tactic.press === 'high' && them.tactic.build === 'possession') {
    ourAtk *= 1.12;
    notes.push('前场压迫抢回了对方的控球');
  }
  if (them.tactic.press === 'high' && us.tactic.build === 'possession') {
    thAtk *= 1.12;
  }
  if (us.tactic.press === 'high' && them.tactic.press === 'low') {
    ourAtk *= 0.82;
    ourDef *= 0.88;
    notes.push('对低位防线做前场压迫，效果有限还容易露出空档');
  }
  if (them.tactic.press === 'high' && us.tactic.press === 'low') {
    thAtk *= 0.82;
    thDef *= 0.88;
  }
  if (them.tactic.width === 'wide' && uf.compact > 1.05 && us.tactic.width === 'central') {
    thAtk *= 0.78;
    notes.push('收紧中路后堵住了对方的边路走廊');
  }
  if (us.tactic.width === 'wide' && tf.compact > 1.05 && them.tactic.width === 'central') {
    ourAtk *= 0.78;
  }
  if (them.tactic.width === 'wide' && them.tactic.press === 'high' && us.tactic.width === 'wide' && uf.compact < 1) {
    thAtk *= 1.18;
    notes.push('双方都拉开，对方的边路突击更有威胁');
  }

  const midUs = us.ratings.mid * uf.mid * ub.poss;
  const midThem = them.ratings.mid * tf.mid * tb.poss;
  const ourPoss = clamp(midUs / Math.max(0.01, midUs + midThem) + venuePoss, 0.28, 0.74);
  ourAtk *= 0.88 + 0.28 * ourPoss;
  thAtk *= 0.88 + 0.28 * (1 - ourPoss);

  return {
    ourPower: ourAtk / Math.max(0.42, thDef),
    theirPower: thAtk / Math.max(0.42, ourDef),
    ourPoss,
    ourWing: widthShare(us.tactic.width),
    theirWing: widthShare(them.tactic.width),
    ourPassLen: 14 * ub.passLen,
    theirPassLen: 14 * tb.passLen,
    ourPressHeight: up.line,
    theirPressHeight: tp.line,
    notes,
  };
}

/** 90 分钟比分：由双方攻防实力与对阵优势决定，不含随机。 */
export function goals90(ourPower: number, theirPower: number): [number, number] {
  const edge = ourPower - theirPower;
  const gf = clamp(Math.floor(ourPower * 1.05 + edge * 1.4 + 0.25 + 1e-9), 0, 5);
  const ga = clamp(Math.floor(theirPower * 1.05 - edge * 1.4 + 0.25 + 1e-9), 0, 5);
  return [gf, ga];
}

export function goalsForHalf(ourPower: number, theirPower: number, half: 1 | 2): [number, number] {
  const [gf, ga] = goals90(ourPower, theirPower);
  if (half === 1) return [Math.floor(gf / 2), Math.floor(ga / 2)];
  return [Math.ceil(gf / 2), Math.ceil(ga / 2)];
}

/** 赢且（净胜≥2 或控球≥55%）三星；赢两星；平一星；负零星且不通关。 */
export function tsStars(gf: number, ga: number, poss: number): number {
  if (gf < ga) return 0;
  if (gf === ga) return 1;
  if (gf - ga >= 2 || poss >= 0.55) return 3;
  return 2;
}

function rnd(state: { s: number }): number {
  state.s = (Math.imul(state.s, 1664525) + 1013904223) >>> 0;
  return state.s / 4294967296;
}

const SLOT: Record<FormationId, { role: string; x: number; y: number }[]> = {
  '433': [
    { role: 'GK', x: 0.06, y: 0.5 },
    { role: 'FB', x: 0.22, y: 0.12 },
    { role: 'CB', x: 0.18, y: 0.36 },
    { role: 'CB', x: 0.18, y: 0.64 },
    { role: 'FB', x: 0.22, y: 0.88 },
    { role: 'CM', x: 0.4, y: 0.28 },
    { role: 'CM', x: 0.36, y: 0.5 },
    { role: 'CM', x: 0.4, y: 0.72 },
    { role: 'WG', x: 0.68, y: 0.16 },
    { role: 'ST', x: 0.74, y: 0.5 },
    { role: 'WG', x: 0.68, y: 0.84 },
  ],
  '442': [
    { role: 'GK', x: 0.06, y: 0.5 },
    { role: 'FB', x: 0.22, y: 0.12 },
    { role: 'CB', x: 0.18, y: 0.36 },
    { role: 'CB', x: 0.18, y: 0.64 },
    { role: 'FB', x: 0.22, y: 0.88 },
    { role: 'WG', x: 0.48, y: 0.12 },
    { role: 'CM', x: 0.42, y: 0.38 },
    { role: 'CM', x: 0.42, y: 0.62 },
    { role: 'WG', x: 0.48, y: 0.88 },
    { role: 'ST', x: 0.7, y: 0.38 },
    { role: 'ST', x: 0.7, y: 0.62 },
  ],
  '4231': [
    { role: 'GK', x: 0.06, y: 0.5 },
    { role: 'FB', x: 0.22, y: 0.12 },
    { role: 'CB', x: 0.18, y: 0.36 },
    { role: 'CB', x: 0.18, y: 0.64 },
    { role: 'FB', x: 0.22, y: 0.88 },
    { role: 'DM', x: 0.36, y: 0.36 },
    { role: 'DM', x: 0.36, y: 0.64 },
    { role: 'WG', x: 0.58, y: 0.16 },
    { role: 'AM', x: 0.6, y: 0.5 },
    { role: 'WG', x: 0.58, y: 0.84 },
    { role: 'ST', x: 0.76, y: 0.5 },
  ],
  '532': [
    { role: 'GK', x: 0.06, y: 0.5 },
    { role: 'FB', x: 0.26, y: 0.1 },
    { role: 'CB', x: 0.18, y: 0.3 },
    { role: 'CB', x: 0.16, y: 0.5 },
    { role: 'CB', x: 0.18, y: 0.7 },
    { role: 'FB', x: 0.26, y: 0.9 },
    { role: 'CM', x: 0.42, y: 0.28 },
    { role: 'CM', x: 0.4, y: 0.5 },
    { role: 'CM', x: 0.42, y: 0.72 },
    { role: 'ST', x: 0.66, y: 0.38 },
    { role: 'ST', x: 0.66, y: 0.62 },
  ],
};

export function formationSlots(formation: FormationId, attackRight: boolean, press: PressId, width: WidthId): Vec2[] {
  const line = press === 'high' ? 0.08 : press === 'low' ? -0.08 : 0;
  const stretch = width === 'wide' ? 1.12 : 0.88;
  return SLOT[formation].map((s) => {
    let x = s.x;
    let y = 0.5 + (s.y - 0.5) * (s.role === 'GK' ? 1 : stretch);
    if (s.role !== 'GK') x = clamp(x + line, 0.05, 0.88);
    if (!attackRight) x = 1 - x;
    return { x: x * TS_PITCH_W, y: y * TS_PITCH_H };
  });
}

function pickSquad(formation: FormationId, ours: boolean, seed: number): TsPlayerDef[] {
  if (!ours) return oppSquad(seed);
  const by: Record<string, TsPlayerDef[]> = {};
  for (const p of TS_SQUAD) {
    (by[p.role] ??= []).push(p);
  }
  const used = new Set<number>();
  const take = (role: string, fallback: string[]): TsPlayerDef => {
    const pool = (by[role] ?? []).concat(fallback.flatMap((f) => by[f] ?? []));
    const hit = pool.find((p) => !used.has(p.no)) ?? TS_SQUAD.find((p) => !used.has(p.no))!;
    used.add(hit.no);
    return hit;
  };
  return SLOT[formation].map((s) => {
    if (s.role === 'GK') return take('GK', []);
    if (s.role === 'FB') return take('FB', ['CB']);
    if (s.role === 'CB') return take('CB', ['FB']);
    if (s.role === 'DM') return take('DM', ['CM']);
    if (s.role === 'CM') return take('CM', ['DM', 'AM']);
    if (s.role === 'AM') return take('AM', ['CM']);
    if (s.role === 'WG') return take('WG', ['ST', 'AM']);
    return take('ST', ['WG']);
  });
}

export function placeTeam(
  formation: FormationId,
  attackRight: boolean,
  press: PressId,
  width: WidthId,
  ours: boolean,
  seed: number,
): TsActor[] {
  const slots = formationSlots(formation, attackRight, press, width);
  const squad = pickSquad(formation, ours, seed);
  return slots.map((s, i) => ({
    no: squad[i].no,
    name: squad[i].name,
    team: ours ? (0 as const) : (1 as const),
    role: SLOT[formation][i].role,
    x: s.x,
    y: s.y,
    slotX: s.x,
    slotY: s.y,
  }));
}

function playerAt(actors: TsActor[], team: 0 | 1, prefer: string, r: { s: number }): TsActor {
  const pool = actors.filter((p) => p.team === team);
  const hit = pool.filter((p) => p.role === prefer);
  const list = hit.length ? hit : pool;
  return list[Math.floor(rnd(r) * list.length)] ?? pool[0];
}

function jitter(base: Vec2, r: { s: number }, scale: number): Vec2 {
  return {
    x: clamp(base.x + (rnd(r) - 0.5) * scale, 3, TS_PITCH_W - 3),
    y: clamp(base.y + (rnd(r) - 0.5) * scale, 3, TS_PITCH_H - 3),
  };
}

function buildMoves(
  ev: PlanEval,
  gf: number,
  ga: number,
  shotsF: number,
  shotsA: number,
  intercepts: number,
  half: 1 | 2,
  us: TsActor[],
  them: TsActor[],
  usTactic: Tactic,
  seed: number,
): TsMove[] {
  const actors = us.concat(them);
  const r = { s: (seed + half * 9176) >>> 0 };
  const t0 = half === 1 ? 0.4 : 45.4;
  const t1 = half === 1 ? 44.6 : 89.6;
  const moves: TsMove[] = [];

  const push = (
    at: number,
    kind: TsMove['kind'],
    team: 0 | 1,
    fromA: TsActor,
    toA: TsActor,
    lane: TsMove['lane'],
    text: string,
    from?: Vec2,
    to?: Vec2,
  ) => {
    moves.push({
      at,
      kind,
      team,
      from: from ?? { x: fromA.x, y: fromA.y },
      to: to ?? { x: toA.x, y: toA.y },
      fromNo: fromA.no,
      toNo: toA.no,
      lane,
      text,
    });
  };

  const sequence = (team: 0 | 1, at: number, kind: 'shot' | 'goal' | 'save' | 'intercept', lane: TsMove['lane']) => {
    const ours = team === 0;
    const att = ours ? us : them;
    const def = ours ? them : us;
    const build = ours ? usTactic.build : 'direct';
    const gk = def.find((p) => p.role === 'GK') ?? def[0];
    const st = playerAt(att, team, 'ST', r);
    const cm = playerAt(att, team, ours && usTactic.build === 'possession' ? 'CM' : 'CM', r);
    const wg = playerAt(att, team, 'WG', r);
    const fb = playerAt(att, team, 'FB', r);
    const cb = playerAt(def, (team ^ 1) as 0 | 1, 'CB', r);
    const start = playerAt(att, team, 'CB', r);
    const goalX = ours ? TS_PITCH_W - 1.5 : 1.5;
    const goalY = TS_PITCH_H / 2 + (rnd(r) - 0.5) * 8;
    let t = at;
    const step = 0.18 + rnd(r) * 0.12;

    if (kind === 'intercept') {
      const from = jitter({ x: start.slotX, y: start.slotY }, r, 10);
      const mid = jitter({ x: cm.slotX, y: cm.slotY }, r, 8);
      push(t, 'pass', team, start, cm, 'central', `${start.name} 回传给 ${cm.name}`, from, mid);
      t += step;
      const cut = jitter({ x: cb.slotX, y: cb.slotY }, r, 8);
      push(t, 'intercept', (team ^ 1) as 0 | 1, cb, cb, 'central', `${cb.name} 在前场抢断`, mid, cut);
      return;
    }

    const wing = lane === 'wing';
    if (build === 'counter') {
      const deep = playerAt(att, team, 'CB', r);
      const from = jitter({ x: deep.slotX, y: deep.slotY }, r, 8);
      const midP = jitter({ x: (wing ? wg : st).slotX, y: (wing ? wg : st).slotY }, r, 10);
      push(t, 'through', team, deep, wing ? wg : st, lane, `${deep.name} 长传打身后给 ${wing ? wg.name : st.name}`, from, midP);
      t += step * 1.4;
    } else if (build === 'possession') {
      const p1 = jitter({ x: start.slotX, y: start.slotY }, r, 6);
      const p2 = jitter({ x: cm.slotX, y: cm.slotY }, r, 8);
      push(t, 'pass', team, start, cm, 'central', `${start.name} 倒脚给 ${cm.name}`, p1, p2);
      t += step;
      if (wing) {
        const p3 = jitter({ x: fb.slotX, y: fb.slotY }, r, 8);
        push(t, 'pass', team, cm, fb, 'wing', `${cm.name} 转移到 ${fb.name}`, p2, p3);
        t += step;
        const p4 = jitter({ x: wg.slotX, y: wg.slotY }, r, 8);
        push(t, 'cross', team, fb, wg, 'wing', `${fb.name} 下底传中`, p3, p4);
        t += step;
      } else {
        const am = playerAt(att, team, 'AM', r);
        const p3 = jitter({ x: am.slotX, y: am.slotY }, r, 8);
        push(t, 'pass', team, cm, am, 'central', `${cm.name} 交给 ${am.name}`, p2, p3);
        t += step;
        const p4 = jitter({ x: st.slotX, y: st.slotY }, r, 8);
        push(t, 'through', team, am, st, 'central', `${am.name} 直塞给 ${st.name}`, p3, p4);
        t += step;
      }
    } else {
      const p1 = jitter({ x: cm.slotX, y: cm.slotY }, r, 8);
      const tgt = wing ? wg : st;
      const p2 = jitter({ x: tgt.slotX, y: tgt.slotY }, r, 10);
      push(t, wing ? 'cross' : 'through', team, cm, tgt, lane, `${cm.name} ${wing ? '传到边路' : '直传前点'}给 ${tgt.name}`, p1, p2);
      t += step * 1.2;
    }

    const shooter = wing ? wg : st;
    const shotFrom = jitter({ x: ours ? TS_PITCH_W - 16 - rnd(r) * 8 : 16 + rnd(r) * 8, y: wing ? shooter.slotY : TS_PITCH_H / 2 + (rnd(r) - 0.5) * 16 }, r, 4);
    const shotTo = { x: goalX, y: goalY };
    if (kind === 'goal') {
      push(t, 'shot', team, shooter, gk, lane, `${shooter.name} 起脚射门`, shotFrom, shotTo);
      t += step * 0.7;
      push(t, 'goal', team, shooter, gk, lane, `${Math.floor(t + (half === 2 ? 0 : 0))}′ ${shooter.name} 破门！`, shotFrom, shotTo);
    } else if (kind === 'save') {
      push(t, 'shot', team, shooter, gk, lane, `${shooter.name} 射门`, shotFrom, shotTo);
      t += step * 0.7;
      push(t, 'save', (team ^ 1) as 0 | 1, gk, gk, lane, `${gk.name} 扑出`, shotTo, jitter({ x: gk.slotX, y: gk.slotY }, r, 4));
    } else {
      push(t, 'shot', team, shooter, gk, lane, `${shooter.name} 射偏`, shotFrom, { x: goalX, y: goalY + (rnd(r) > 0.5 ? 10 : -10) });
    }
  };

  const minutes = (n: number, bias: number): number[] => {
    if (n <= 0) return [];
    const out: number[] = [];
    for (let i = 0; i < n; i++) {
      const u = (i + 0.25 + rnd(r) * 0.5) / n;
      out.push(t0 + (t1 - t0) * clamp(u * 0.9 + bias, 0.02, 0.98));
    }
    return out.sort((a, b) => a - b);
  };

  const ourLane = (): TsMove['lane'] => (rnd(r) < ev.ourWing ? 'wing' : 'central');
  const thLane = (): TsMove['lane'] => (rnd(r) < ev.theirWing ? 'wing' : 'central');

  const ourGoalM = minutes(gf, 0.15);
  const theirGoalM = minutes(ga, 0.2);
  const ourShotM = minutes(Math.max(0, shotsF - gf), 0.05);
  const theirShotM = minutes(Math.max(0, shotsA - ga), 0.08);
  const ourSave = Math.min(ourShotM.length, Math.max(0, ev.ourPower > 0.8 ? Math.ceil(ourShotM.length * 0.45) : 1));
  const thSave = Math.min(theirShotM.length, Math.max(0, Math.ceil(theirShotM.length * 0.4)));
  const intM = minutes(intercepts, 0.1);

  type Job = { at: number; fn: () => void };
  const jobs: Job[] = [];
  ourGoalM.forEach((at) => jobs.push({ at, fn: () => sequence(0, at, 'goal', ourLane()) }));
  theirGoalM.forEach((at) => jobs.push({ at, fn: () => sequence(1, at, 'goal', thLane()) }));
  ourShotM.forEach((at, i) => jobs.push({ at, fn: () => sequence(0, at, i < ourSave ? 'save' : 'shot', ourLane()) }));
  theirShotM.forEach((at, i) => jobs.push({ at, fn: () => sequence(1, at, i < thSave ? 'save' : 'shot', thLane()) }));
  intM.forEach((at) => jobs.push({ at, fn: () => sequence(1, at, 'intercept', 'central') }));
  jobs.sort((a, b) => a.at - b.at);
  for (const j of jobs) j.fn();
  moves.sort((a, b) => a.at - b.at || a.kind.localeCompare(b.kind));
  // rewrite goal text with actual minute
  for (const mv of moves) {
    if (mv.kind === 'goal') {
      const who = actors.find((p) => p.team === mv.team && p.no === mv.fromNo);
      mv.text = `${Math.floor(mv.at)}′ ${who?.name ?? ''} 破门！`;
    }
  }
  return moves;
}

export function resolveHalf(
  us: SidePlan,
  them: SidePlan,
  venue: 'home' | 'away',
  half: 1 | 2,
  seed: number,
  usActors: TsActor[],
  themActors: TsActor[],
): HalfReport {
  const ev = evaluatePlan(us, them, venue);
  const [gf, ga] = goalsForHalf(ev.ourPower, ev.theirPower, half);
  const shotsF = Math.max(gf + 2, Math.round(3 + ev.ourPower * 4 + ev.ourPoss * 4));
  const shotsA = Math.max(ga + 2, Math.round(3 + ev.theirPower * 4 + (1 - ev.ourPoss) * 3));
  const onF = Math.min(shotsF, gf + Math.round((shotsF - gf) * 0.45));
  const onA = Math.min(shotsA, ga + Math.round((shotsA - ga) * 0.4));
  const wing = Math.round((shotsF + 5) * ev.ourWing);
  const central = Math.round((shotsF + 5) * (1 - ev.ourWing));
  const interceptHigh = Math.round(2 + ev.ourPressHeight * 10 * (them.tactic.build === 'possession' ? 1.15 : 0.85));
  const moves = buildMoves(ev, gf, ga, shotsF, shotsA, interceptHigh, half, usActors, themActors, us.tactic, seed);
  return {
    goalsFor: gf,
    goalsAgainst: ga,
    shotsFor: shotsF,
    shotsAgainst: shotsA,
    onTargetFor: onF,
    onTargetAgainst: onA,
    possession: ev.ourPoss,
    wingAttacks: wing,
    centralAttacks: central,
    interceptHigh,
    avgPassLen: ev.ourPassLen,
    notes: ev.notes,
    moves,
    eval: ev,
  };
}

function makeActors(level: TsLevel, tactic: Tactic): { us: TsActor[]; them: TsActor[] } {
  const seed = level.id * 7919;
  return {
    us: placeTeam(tactic.formation, true, tactic.press, tactic.width, true, seed),
    them: placeTeam(level.opponent.tactic.formation, false, level.opponent.tactic.press, level.opponent.tactic.width, false, seed + 7),
  };
}

function sideUs(tactic: Tactic): SidePlan {
  return { ratings: TS_OUR_RATINGS, tactic };
}

function sideThem(level: TsLevel): SidePlan {
  return { ratings: level.opponent.ratings, tactic: level.opponent.tactic };
}

function applySlots(m: TsMatch, tactic: Tactic) {
  const placed = makeActors(m.level, tactic);
  // keep names/numbers, refresh slots and positions
  m.players = placed.us.concat(placed.them);
  const gk = m.players.find((p) => p.team === 0 && p.role === 'GK') ?? m.players[0];
  m.ball = { x: gk.x + 2, y: gk.y };
}

export function createTsMatch(levelId: number, tactic?: Tactic): TsMatch {
  const level = tsLevelById(levelId);
  const tac = copyTactic(tactic ?? defaultTactic());
  const placed = makeActors(level, tac);
  const players = placed.us.concat(placed.them);
  const gk = players.find((p) => p.team === 0 && p.role === 'GK') ?? players[0];
  return {
    level,
    tactic: tac,
    htTactic: null,
    htUsed: false,
    phase: 'setup',
    speed: 1,
    minute: 0,
    score: [0, 0],
    first: null,
    second: null,
    moves: [],
    moveIndex: 0,
    moveT: 0,
    players,
    ball: { x: TS_PITCH_W / 2, y: TS_PITCH_H / 2 },
    possession: 0,
    message: '选择阵型和战术指令，然后开赛',
    log: [],
    stars: 0,
    briefing: null,
    seed: level.id * 7919,
  };
}

export function setTactic(m: TsMatch, patch: Partial<Tactic>, stage: 'setup' | 'halftime' = 'setup') {
  if (stage === 'setup' && m.phase !== 'setup') return;
  if (stage === 'halftime' && m.phase !== 'halftime') return;
  if (stage === 'setup') {
    if (patch.formation) m.tactic.formation = patch.formation;
    if (patch.press) m.tactic.press = patch.press;
    if (patch.build) m.tactic.build = patch.build;
    if (patch.width) m.tactic.width = patch.width;
    applySlots(m, m.tactic);
  } else {
    const base = m.htTactic ?? copyTactic(m.tactic);
    if (patch.press) base.press = patch.press;
    if (patch.build) base.build = patch.build;
    if (patch.width) base.width = patch.width;
    m.htTactic = base;
    applySlots(m, { ...m.tactic, press: base.press, build: base.build, width: base.width });
  }
}

export function kickoff(m: TsMatch) {
  if (m.phase !== 'setup') return;
  const { us, them } = { us: m.players.filter((p) => p.team === 0), them: m.players.filter((p) => p.team === 1) };
  m.first = resolveHalf(sideUs(m.tactic), sideThem(m.level), m.level.venue, 1, m.seed, us, them);
  m.moves = m.first.moves.slice();
  m.moveIndex = 0;
  m.moveT = 0;
  m.minute = 0;
  m.score = [0, 0];
  m.phase = 'first';
  m.message = '上半场开始';
  m.log = [`开场：${TS_OUR_NAME} ${m.level.venue === 'home' ? '主场' : '客场'}对阵 ${m.level.opponent.name}`];
  const mid = m.players.find((p) => p.team === 0 && (p.role === 'ST' || p.role === 'AM' || p.role === 'CM')) ?? m.players[0];
  m.ball = { x: TS_PITCH_W / 2, y: TS_PITCH_H / 2 };
  mid.x = TS_PITCH_W / 2 - 2;
  mid.y = TS_PITCH_H / 2;
}

function finishFull(m: TsMatch) {
  const a = m.first;
  const b = m.second;
  const gf = (a?.goalsFor ?? 0) + (b?.goalsFor ?? 0);
  const ga = (a?.goalsAgainst ?? 0) + (b?.goalsAgainst ?? 0);
  const poss = ((a?.possession ?? 0.5) + (b?.possession ?? a?.possession ?? 0.5)) / 2;
  const shotsF = (a?.shotsFor ?? 0) + (b?.shotsFor ?? 0);
  const shotsA = (a?.shotsAgainst ?? 0) + (b?.shotsAgainst ?? 0);
  const onF = (a?.onTargetFor ?? 0) + (b?.onTargetFor ?? 0);
  const onA = (a?.onTargetAgainst ?? 0) + (b?.onTargetAgainst ?? 0);
  const wing = (a?.wingAttacks ?? 0) + (b?.wingAttacks ?? 0);
  const inter = (a?.interceptHigh ?? 0) + (b?.interceptHigh ?? 0);
  const pass = b ? ((a?.avgPassLen ?? 14) + b.avgPassLen) / 2 : (a?.avgPassLen ?? 14);
  const notes = [...(a?.notes ?? []), ...(b?.notes ?? [])].filter((n, i, arr) => arr.indexOf(n) === i);
  const events = m.log.filter((l) => l.includes('破门') || l.includes('扑出') || l.includes('抢断')).slice(0, 12);
  const stars = tsStars(gf, ga, poss);
  m.score = [gf, ga];
  m.stars = stars;
  m.phase = 'fulltime';
  m.minute = 90;
  const result = gf > ga ? '胜' : gf < ga ? '负' : '平';
  m.message = `全场结束 ${gf}–${ga}，${result}` + (stars ? `，${'★'.repeat(stars)}` : '，本场未通关');
  m.briefing = {
    goalsFor: gf,
    goalsAgainst: ga,
    shotsFor: shotsF,
    shotsAgainst: shotsA,
    onTargetFor: onF,
    onTargetAgainst: onA,
    possession: poss,
    wingAttacks: wing,
    interceptHigh: inter,
    avgPassLen: pass,
    notes,
    events,
    stars,
  };
}

function startSecond(m: TsMatch, tac: Tactic) {
  applySlots(m, { formation: m.tactic.formation, press: tac.press, build: tac.build, width: tac.width });
  const us = m.players.filter((p) => p.team === 0);
  const them = m.players.filter((p) => p.team === 1);
  const secondTac = { formation: m.tactic.formation, press: tac.press, build: tac.build, width: tac.width };
  m.second = resolveHalf(sideUs(secondTac), sideThem(m.level), m.level.venue, 2, m.seed + 41, us, them);
  m.moves = m.second.moves.slice();
  m.moveIndex = 0;
  m.moveT = 0;
  m.minute = 45;
  m.phase = 'second';
  m.message = '下半场开始';
  m.log.push('下半场开始' + (m.htUsed && m.htTactic && !tacticsEqual({ ...m.tactic, ...m.htTactic }, m.tactic) ? '（已调整指令）' : ''));
}

export function confirmHalf(m: TsMatch, next?: Partial<Pick<Tactic, 'press' | 'build' | 'width'>>) {
  if (m.phase !== 'halftime') return;
  const base = copyTactic(m.htTactic ?? m.tactic);
  if (next?.press) base.press = next.press;
  if (next?.build) base.build = next.build;
  if (next?.width) base.width = next.width;
  m.htTactic = base;
  m.htUsed = true;
  startSecond(m, base);
}

export function skipHalf(m: TsMatch) {
  if (m.phase !== 'first' && m.phase !== 'second') return;
  const report = m.phase === 'first' ? m.first : m.second;
  if (!report) return;
  for (let i = m.moveIndex; i < m.moves.length; i++) {
    const mv = m.moves[i];
    if (mv.kind === 'goal') {
      if (mv.team === 0) m.score[0] += 1;
      else m.score[1] += 1;
      m.log.push(mv.text);
    } else if (mv.kind === 'save' || mv.kind === 'intercept') {
      m.log.push(mv.text);
    }
  }
  m.moveIndex = m.moves.length;
  m.moveT = 0;
  if (m.phase === 'first') {
    m.minute = 45;
    m.phase = 'halftime';
    m.htTactic = copyTactic(m.tactic);
    m.message = '中场休息，可以调整一次战术指令';
    const last = m.players[m.players.length - 1];
    if (last) m.ball = { x: last.slotX, y: last.slotY };
  } else {
    finishFull(m);
  }
}

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

function ease(t: number): number {
  return t * t * (3 - 2 * t);
}

function currentMove(m: TsMatch): TsMove | null {
  if (m.moveIndex >= 0 && m.moveIndex < m.moves.length) return m.moves[m.moveIndex];
  return null;
}

function applyMoveStart(m: TsMatch, mv: TsMove) {
  m.possession = mv.team;
  const passer = m.players.find((p) => p.team === mv.team && p.no === mv.fromNo);
  const recv = m.players.find((p) => p.no === mv.toNo && (mv.kind === 'save' || mv.kind === 'goal' ? p.team !== mv.team || p.role === 'GK' : p.team === mv.team));
  if (passer) {
    passer.x = mv.from.x;
    passer.y = mv.from.y;
  }
  if (recv && mv.kind !== 'goal') {
    recv.x = mv.to.x;
    recv.y = mv.to.y;
  }
  m.ball = { x: mv.from.x, y: mv.from.y };
}

function applyMoveEnd(m: TsMatch, mv: TsMove) {
  m.ball = { x: mv.to.x, y: mv.to.y };
  if (mv.kind === 'goal') {
    if (mv.team === 0) m.score[0] += 1;
    else m.score[1] += 1;
    m.log.push(mv.text);
    m.message = mv.text;
  } else if (mv.kind === 'save' || mv.kind === 'intercept' || mv.kind === 'cross' || mv.kind === 'through') {
    m.log.push(mv.text);
    m.message = mv.text;
  }
}

export function tickTs(m: TsMatch, dt: number) {
  if (m.phase !== 'first' && m.phase !== 'second') return;
  const d = Math.min(0.05, Math.max(0, dt)) * m.speed;
  if (d <= 0) return;
  const end = m.phase === 'first' ? 45 : 90;
  m.minute = Math.min(end, m.minute + d * TS_MIN_PER_SEC);

  // start due moves
  while (m.moveIndex < m.moves.length && m.moveT <= 0) {
    const mv = m.moves[m.moveIndex];
    if (mv.at > m.minute + 0.01) break;
    applyMoveStart(m, mv);
    m.moveT = 0.001;
    break;
  }

  const mv = currentMove(m);
  if (mv && m.moveT > 0) {
    const dur = (mv.kind === 'goal' ? 0.7 : mv.kind === 'shot' ? 0.45 : 0.32) / Math.max(1, m.speed);
    m.moveT += d / dur;
    const t = ease(clamp(m.moveT, 0, 1));
    m.ball.x = lerp(mv.from.x, mv.to.x, t);
    m.ball.y = lerp(mv.from.y, mv.to.y, t);
    const press = mv.team === 0 ? 0.22 : 0.18;
    for (const p of m.players) {
      let tx = p.slotX;
      let ty = p.slotY;
      if (p.team === mv.team && p.no === mv.fromNo) {
        tx = mv.from.x;
        ty = mv.from.y;
      } else if (p.no === mv.toNo && p.team === (mv.kind === 'save' || mv.kind === 'goal' ? ((mv.team ^ 1) as 0 | 1) : mv.team)) {
        tx = mv.to.x;
        ty = mv.to.y;
      } else {
        const pull = p.team === mv.team ? 0.16 : press;
        tx = lerp(p.slotX, m.ball.x, pull);
        ty = lerp(p.slotY, m.ball.y, pull);
      }
      p.x += (tx - p.x) * Math.min(1, 5 * d);
      p.y += (ty - p.y) * Math.min(1, 5 * d);
    }
    if (m.moveT >= 1) {
      applyMoveEnd(m, mv);
      m.moveIndex += 1;
      m.moveT = 0;
    }
  } else {
    for (const p of m.players) {
      p.x += (p.slotX - p.x) * Math.min(1, 2 * d);
      p.y += (p.slotY - p.y) * Math.min(1, 2 * d);
    }
  }

  if (m.minute >= end && (m.moveIndex >= m.moves.length || !mv || mv.at >= end - 0.05)) {
    // flush remaining goals if clock ran out mid-animation
    if (m.moveIndex < m.moves.length) {
      for (let i = m.moveIndex; i < m.moves.length; i++) {
        if (m.moves[i].kind === 'goal' && m.moveT === 0 && i !== m.moveIndex) {
          /* already counted if mid-anim of this goal: handled below */
        }
        if (m.moves[i].kind === 'goal') {
          // avoid double count if just finished
          const already = m.log.includes(m.moves[i].text);
          if (!already) {
            if (m.moves[i].team === 0) m.score[0] += 1;
            else m.score[1] += 1;
            m.log.push(m.moves[i].text);
          }
        }
      }
      m.moveIndex = m.moves.length;
    }
    if (m.phase === 'first') {
      m.minute = 45;
      m.phase = 'halftime';
      m.htTactic = copyTactic(m.tactic);
      m.message = '中场休息，可以调整一次战术指令';
    } else {
      finishFull(m);
    }
  }
}

export function autoPlayTs(levelId: number, tactic?: Tactic, ht?: Pick<Tactic, 'press' | 'build' | 'width'>): TsMatch {
  const level = tsLevelById(levelId);
  const m = createTsMatch(levelId, tactic ?? level.recommended);
  kickoff(m);
  skipHalf(m);
  confirmHalf(m, ht);
  skipHalf(m);
  return m;
}

export function matchScoreValue(b: TsBriefing): number {
  return b.goalsFor * 100 + Math.round(b.possession * 100) + (b.goalsFor - b.goalsAgainst + 5) * 10;
}

export function parseTsSave(raw: unknown): LevelSave {
  return parseLevelSave(raw, TS_LEVEL_COUNT);
}
