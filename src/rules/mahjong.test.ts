import {describe,it,expect} from 'vitest';
import {createMahjong,typeOf,tileLabel,winning,publicView,legalActions,act,hintMahjong,aiMahjong,advanceMahjong,nextActor,allTiles,type MahjongState,type Action} from './mahjong';
const ids=(types:number[])=>{const used=Array(34).fill(0) as number[];return types.map(t=>t*4+used[t]++);};
function setup(hands:number[][],pending:number|null=null,from=0,phase:MahjongState['phase']='respond',turn=0):MahjongState{
 const s=createMahjong(1);let pool=Array.from({length:136},(_,i)=>i);
 const take=(t:number)=>{const id=pool.find(i=>typeOf(i)===t);if(id===undefined)throw Error('fixture overallocates '+t);pool=pool.filter(i=>i!==id);return id;};
 s.pending=pending===null?null:{tile:take(pending),from};s.hands=hands.map(h=>h.map(take));s.wall=pool;s.phase=phase;s.turn=turn;s.drawn=null;return s;
}
const legal=(s:MahjongState,seat:number,kind:Action['kind'])=>{const a=legalActions(publicView(s,seat)).find(x=>x.kind===kind);expect(a,`seat ${seat} ${kind}`).toBeDefined();return a!;};
const doAct=(s:MahjongState,seat:number,kind:Action['kind'])=>act(s,seat,legal(s,seat,kind));
const conserved=(s:MahjongState)=>{const all=allTiles(s);expect(all.length).toBe(136);expect(new Set(all).size).toBe(136);};
const winWait=[0,1,3,4,5,9,10,11,18,19,20,27,27];
describe('四人基础麻将：规则入口与隐藏信息',()=>{
 it('136张每种四张，13×4+84墙；种子确定，不重不漏',()=>{
 const s=createMahjong(42);expect(s.hands.map(x=>x.length)).toEqual([13,13,13,13]);expect(s.wall.length).toBe(84);conserved(s);expect(createMahjong(42)).toEqual(s);
 for(let t=0;t<34;t++)expect(allTiles(s).filter(x=>typeOf(x)===t)).toHaveLength(4);
 expect([0,36,72,108,124,128,132].map(tileLabel)).toEqual(['1万','1筒','1条','东','中','发','白']);
 });
 it.each([
 [[0,1,2,3,4,5,9,10,11,18,19,20,27,27],0],
 [[0,0,0,9,9,9,18,18,18,27,27,27,28,28],0],
 [[0,1,2,9,10,11,18,19,20,27,27],1],
 [[27,27],4],
 ] as [number[],number][])('四面子一将 %j，副露%d',(h,o)=>expect(winning(ids(h),o)).toBe(true));
 it.each([
 [0,0,3,3,6,6,27,27,28,28,29,29,30,30], // 独立七对，不支持
 [7,8,9,3,4,5,12,13,14,18,19,20,27,27], // 跨花色非顺子
 [27,28,29,3,4,5,12,13,14,18,19,20,30,30], // 字牌不可顺
 [0,1,2,3,4,5,9,10,11,18,19,20,27],
 ])('拒绝特殊/非法和型 %j',(...h)=>expect(winning(ids(h))).toBe(false));
 it('重复ID、越界、错误副露数不能和；和牌判断不改手牌',()=>{const h=ids([0,1,2,3,4,5,9,10,11,18,19,20,27,27]),copy=h.slice();expect(winning(h)).toBe(true);expect(h).toEqual(copy);expect(winning([...h.slice(1),h[1]])).toBe(false);expect(winning([...h.slice(1),136])).toBe(false);expect(winning(h,1)).toBe(false);});
 it('规则拒绝越权、未摸弃牌、弃他人牌、未和直接胡，非法动作不推进',()=>{
 let s=createMahjong(2);expect(act(s,0,{kind:'discard',tiles:[s.hands[0][0]]})).toBe(s);expect(act(s,1,{kind:'draw',tiles:[]})).toBe(s);expect(act(s,7,{kind:'draw',tiles:[]})).toBe(s);
 const prev=JSON.stringify(s);s=doAct(s,0,'draw');expect(s.hands[0]).toHaveLength(14);expect(s.drawn).not.toBeNull();expect(s.wall).toHaveLength(83);expect(JSON.parse(prev).wall.length).toBe(84);
 expect(act(s,0,{kind:'win',tiles:[]})).toBe(s);expect(act(s,0,{kind:'discard',tiles:[s.hands[1][0]]})).toBe(s);expect(act(s,0,{kind:'draw',tiles:[]})).toBe(s);
 const tile=s.hands[0][0];s=act(s,0,{kind:'discard',tiles:[tile]});expect(s.phase).toBe('respond');expect(s.pending?.tile).toBe(tile);expect(s.hands[0]).toHaveLength(13);conserved(s);
 });
 it('三家过后弃牌入河，下一家摸；不能重复响应',()=>{
 let s=setup([[4],[7],[10],[13]],2);s=doAct(s,1,'pass');expect(act(s,1,{kind:'pass',tiles:[]})).toBe(s);expect(s.phase).toBe('respond');s=doAct(s,2,'pass');s=doAct(s,3,'pass');expect(s.discards[0].map(typeOf)).toEqual([2]);expect(s.turn).toBe(1);expect(s.phase).toBe('draw');expect(s.pending).toBeNull();conserved(s);
 });
 it('吃只能上家；列出三种吃组合，字牌不可吃，不能伪造吃法',()=>{
 const s=setup([[],[0,1,3,4],[0,1],[27,28]],2);const a=legalActions(publicView(s,1)).filter(x=>x.kind==='chi');expect(a).toHaveLength(3);expect(a.map(x=>x.tiles.map(typeOf))).toEqual([[0,1],[1,3],[3,4]]);expect(legalActions(publicView(s,2)).some(x=>x.kind==='chi')).toBe(false);
 expect(act(s,1,{kind:'chi',tiles:s.hands[1].slice(0,1)})).toBe(s);expect(legalActions(publicView(setup([[],[27,28],[],[]],29),1)).some(x=>x.kind==='chi')).toBe(false);
 });
 it('胡 > 杠碰 > 吃；人类选过以前不提前裁决，即使AI先提交',()=>{
 let s=setup([[4],[0,1],[2,2],winWait],2);s=doAct(s,2,'pon');s=doAct(s,3,'win');expect(s.phase).toBe('respond');expect(s.winner).toBeNull();s=doAct(s,1,'chi');expect(s.phase).toBe('done');expect(s.winner).toBe(3);expect(s.result).toBe('discard');expect(s.pending?.tile).toBeDefined();conserved(s);
 });
 it('碰压吃，吃碰后不再摸牌而直接弃；吃的组合选择确实影响副露',()=>{
 let s=setup([[],[0,1,3,4],[2,2],[]],2);const choices=legalActions(publicView(s,1)).filter(a=>a.kind==='chi');s=act(s,1,choices[2]);s=doAct(s,2,'pon');s=doAct(s,3,'pass');expect(s.turn).toBe(2);expect(s.phase).toBe('discard');expect(s.melds[2][0].kind).toBe('pon');expect(s.hands[1]).toHaveLength(4);conserved(s);
 s=setup([[],[0,1,3,4],[],[]],2);const chosen=legalActions(publicView(s,1)).filter(a=>a.kind==='chi')[2];s=act(s,1,chosen);s=doAct(s,2,'pass');s=doAct(s,3,'pass');expect(s.melds[1][0].tiles.map(typeOf)).toEqual([2,3,4]);expect(s.phase).toBe('discard');expect(s.hands[1].map(typeOf)).toEqual([0,1]);conserved(s);
 });
 it('同级多胡从放牌者下家顺位最近一家；不一炮多响，测试跨3到0',()=>{
 let s=setup([winWait,winWait,[],[]],2,3);s=doAct(s,1,'win');s=doAct(s,2,'pass');expect(s.phase).toBe('respond');s=doAct(s,0,'win');expect(s.winner).toBe(0);conserved(s);
 });
 it('同一副牌的碰杠选项同时合法，但不同玩家不可能同时碰/杠同一张',()=>{
 // 合法136张牌不可能两家同时对同一弃牌碰/杠（需要至少5张）。排序同级可由多胡验证。
 const s=setup([[],[2,2,2],[],[]],2);expect(legalActions(publicView(s,1)).some(a=>a.kind==='kong')).toBe(true);expect(legalActions(publicView(s,1)).some(a=>a.kind==='pon')).toBe(true);conserved(s);
 });
 it('明杠取弃牌为第四张，从墙尾补牌，不从墙头',()=>{
 let s=setup([[],[2,2,2],[],[]],2);s=doAct(s,1,'kong');s=doAct(s,2,'pass');s=doAct(s,3,'pass');expect(s.phase).toBe('draw');expect(s.back).toBe(true);expect(s.melds[1][0].tiles).toHaveLength(4);const tail=s.wall.at(-1),front=s.wall[0];s=doAct(s,1,'draw');expect(s.drawn).toBe(tail);expect(s.wall[0]).toBe(front);expect(s.phase).toBe('discard');conserved(s);
 });
 it('暗杠扣四张+尾部补牌；其他玩家暗杠牌值不出现在公开视图',()=>{
 let s=setup([[5,5,5,5,0,1,2,9,10,11,18,19,20,27],[],[],[]],null,0,'discard');s=doAct(s,0,'concealed');expect(s.hands[0]).toHaveLength(10);expect(publicView(s,1).melds[0][0].tiles).toEqual([]);expect(publicView(s,0).melds[0][0].tiles).toHaveLength(4);const id=s.wall.at(-1);s=doAct(s,0,'draw');expect(s.hands[0]).toHaveLength(11);expect(s.drawn).toBe(id);conserved(s);
 });
 it.each(['normal','kong','concealed'])('%s摸/补牌墙空流局且守恒',kind=>{
 let s=kind==='kong'?setup([[],[2,2,2],[],[]],2):setup([[5,5,5,5],[],[],[]],null,0,kind==='concealed'?'discard':'draw');s.discards[3].push(...s.wall);s.wall=[];
 if(kind==='kong'){s=doAct(s,1,'kong');s=doAct(s,2,'pass');s=doAct(s,3,'pass');}else if(kind==='concealed')s=doAct(s,0,'concealed');
 s=doAct(s,s.turn,'draw');expect(s.phase).toBe('done');expect(s.winner).toBeNull();expect(s.result).toBe('draw');conserved(s);
 });
 it('合法自摸、点和终局后不再行动，非法胡被拒绝',()=>{
 let s=setup([[...winWait,2],[],[],[]],null,0,'discard');s=doAct(s,0,'win');expect(s.result).toBe('self');expect(s.winner).toBe(0);conserved(s);expect(legalActions(publicView(s,0))).toEqual([]);expect(aiMahjong(s)).toBe(s);
 const n=setup([[0,1,2,3],[],[],[]],null,0,'discard');expect(act(n,0,{kind:'win',tiles:[]})).toBe(n);
 });
 it('墙剩最后一张仍可自摸，墙已空时仍先处理最后弃牌的点和',()=>{
 let s=setup([winWait,[],[],[]],null,0,'draw');const wanted=s.wall.find(id=>typeOf(id)===2)!;s.discards[3].push(...s.wall.filter(id=>id!==wanted));s.wall=[wanted];s=doAct(s,0,'draw');expect(s.wall).toHaveLength(0);s=doAct(s,0,'win');expect(s.result).toBe('self');conserved(s);
 s=setup([[],winWait,[],[]],2);s.discards[3].push(...s.wall);s.wall=[];s=doAct(s,1,'win');s=doAct(s,2,'pass');s=doAct(s,3,'pass');expect(s.result).toBe('discard');expect(s.winner).toBe(1);conserved(s);
 });
 it('提示只取公开视图，合法且无副作用；改墙序/对手暗牌不影响提示',()=>{
 let s=doAct(createMahjong(12),0,'draw');const before=JSON.stringify(s),v=publicView(s,0),vBefore=JSON.stringify(v),h=hintMahjong(v);expect(h.action).not.toBeNull();expect(legalActions(v)).toContainEqual(h.action);expect(JSON.stringify(s)).toBe(before);expect(JSON.stringify(v)).toBe(vBefore);
 const n={...s,wall:s.wall.slice().reverse(),hands:s.hands.map((x,i)=>i?x.slice().reverse():x.slice())};[n.hands[1],n.hands[2]]=[n.hands[2],n.hands[1]];
 expect(publicView(n,0)).toEqual(v);expect(hintMahjong(publicView(n,0))).toEqual(h);expect(Object.keys(v).sort()).toEqual(['seat','hand','sizes','melds','discards','turn','phase','pending','remaining','waiting','drawn','steps'].sort());
 s=setup([[],winWait,[],[]],2);const response=hintMahjong(publicView(s,1));expect(response.action?.kind).toBe('win');expect(s.phase).toBe('respond');
 });
 it('自动推进绝不代替人类选择；抢牌窗口、手动弃牌等待，只有强制过/摸牌自动',()=>{
 let s=setup([winWait,[],[],[]],2,3);expect(nextActor(s)).toBe(0);expect(advanceMahjong(s)).toBe(s);expect(legalActions(publicView(s,0)).some(x=>x.kind==='win')).toBe(true);
 s=setup([[3,6,9],[],[],[]],2,3);expect(advanceMahjong(s)).not.toBe(s);expect(s.responses[0]).toBeNull();
 s=createMahjong(8);s=advanceMahjong(s);expect(s.phase).toBe('discard');expect(s.turn).toBe(0);expect(advanceMahjong(s)).toBe(s);
 });
 it('普通摸牌从墙头，补杠未实现、没有非法动作入口',()=>{
 let s=createMahjong(5);const front=s.wall[0];s=doAct(s,0,'draw');expect(s.drawn).toBe(front);const invalid={kind:'addedKong',tiles:[]} as unknown as Action;expect(act(s,0,invalid)).toBe(s);conserved(s);
 });
 it('48种子AI完整单局自动结束，每一步合法推进且136牌守恒，无卡死',()=>{
 for(let seed=1;seed<=48;seed++){
 let s=createMahjong(seed,seed%4),n=0;for(;n<1600&&s.phase!=='done';n++){
 const actor=nextActor(s)!;const v=publicView(s,actor),h=hintMahjong(v);expect(legalActions(v)).toContainEqual(h.action);const next=aiMahjong(s);expect(next).not.toBe(s);expect(next.steps).toBe(s.steps+1);s=next;conserved(s);
 }
 expect(s.phase,`seed ${seed}, steps ${n}`).toBe('done');expect(['self','discard','draw']).toContain(s.result);
 }
 });
});
