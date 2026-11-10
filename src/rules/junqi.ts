/** 从原版军棋翻棋页抽出的吃子规则。 */
export type Side = 'r' | 'b';
export type Kind =
  | '司令'
  | '军长'
  | '师长'
  | '旅长'
  | '团长'
  | '营长'
  | '连长'
  | '排长'
  | '工兵'
  | '炸弹'
  | '地雷'
  | '军旗';

export type Piece = { id: string; side: Side; kind: Kind; faceUp: boolean };
export type Cell = Piece | null;
export type Board = Cell[][];
export type Sq = { r: number; c: number };

const N = 6;
const SHORT: Record<Kind, string> = {
  '司令': '司',
  '军长': '军',
  '师长': '师',
  '旅长': '旅',
  '团长': '团',
  '营长': '营',
  '连长': '连',
  '排长': '排',
  '工兵': '工',
  '炸弹': '炸',
  '地雷': '雷',
  '军旗': '旗',
};
const RANK: Record<Kind, number> = {
  '司令': 9,
  '军长': 8,
  '师长': 7,
  '旅长': 6,
  '团长': 5,
  '营长': 4,
  '连长': 3,
  '排长': 2,
  '工兵': 1,
  '炸弹': -1,
  '地雷': -2,
  '军旗': 0,
};
function canMarch(kind: Kind): boolean {
  return kind !== '地雷' && kind !== '军旗';
}
function fight(att: Piece, def: Piece): 'win' | 'lose' | 'tie' {
  if (att.kind === '炸弹' || def.kind === '炸弹') return 'tie';
  if (def.kind === '军旗') return 'win';
  if (def.kind === '地雷') return att.kind === '工兵' ? 'win' : 'lose';
  const ar = RANK[att.kind];
  const dr = RANK[def.kind];
  if (ar > dr) return 'win';
  if (ar < dr) return 'lose';
  return 'tie';
}
export { fight, canMarch, RANK, SHORT };
