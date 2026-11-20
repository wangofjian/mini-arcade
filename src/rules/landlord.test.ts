import {describe,it,expect} from 'vitest';
import {classify,beats,deal,bid,play,view,hint,aiTurn,options,rank} from './landlord';
const C=(...r:number[])=>{const used:Record<number,number>={};return r.map(x=>x===16?52:x===17?53:(x-3)*4+(used[x]=(used[x]??0)+1)-1);};
describe('斗地主核心规则',()=>{
 it('54张发牌不重不漏，叫地主底牌与首出',()=>{let s=deal(19,1);expect(s.hands.map(h=>h.length)).toEqual([17,17,17]);expect(new Set([...s.hands.flat(),...s.bottom]).size).toBe(54);s=bid(s,false);expect(s.turn).toBe(2);s=bid(s,true);expect(s.landlord).toBe(2);expect(s.hands[2]).toHaveLength(20);expect(s.turn).toBe(2);});
 it('全不叫由起叫位强制，不死循环',()=>{let s=deal(2,2);for(let i=0;i<3;i++)s=bid(s,false);expect(s.phase).toBe('play');expect(s.landlord).toBe(2);});
 it.each([
 [[3],'单张'],[[4,4],'对子'],[[5,5,5],'三张'],[[6,6,6,7],'三带一'],[[6,6,6,7,7],'三带二'],
 [[3,4,5,6,7],'顺子'],[[3,3,4,4,5,5],'连对'],[[3,3,3,4,4,4],'飞机'],
 [[3,3,3,4,4,4,7,8],'飞机带单'],[[3,3,3,4,4,4,7,7,8,8],'飞机带对'],
 [[5,5,5,5,7,8],'四带二单'],[[5,5,5,5,7,7],'四带二单'],[[5,5,5,5,7,7,8,8],'四带二对'],[[8,8,8,8],'炸弹'],[[16,17],'王炸']
 ] as [number[],string][])('识别%j → %s',(r,k)=>expect(classify(C(...r))?.kind).toBe(k));
 it.each([[11,12,13,14,15],[3,3,4,4],[3,3,3,4,4,4,7,7],[3,3,3,4,4,4,4,8],[3,3,3,5,5,5],[3,4,6,7,8],[14,14,14,15,15,15]])('拒绝非法组合 %j',(...r)=>{expect(classify(C(...r))).toBeNull();});
 it('拒绝重复ID越界ID，炸弹与同型同长度比较',()=>{expect(classify([0,0])).toBeNull();expect(classify([54])).toBeNull();expect(beats(classify(C(4))!,classify(C(3))!)).toBe(true);expect(beats(classify(C(4,4))!,classify(C(3))!)).toBe(false);expect(beats(classify(C(3,3,3,3))!,classify(C(15))!)).toBe(true);expect(beats(classify(C(16,17))!,classify(C(15,15,15,15))!)).toBe(true);expect(beats(classify(C(15,15,15,15))!,classify(C(16,17))!)).toBe(false);});
 it('领出不能过、非法牌不推进，两家过重置出牌权',()=>{let s=bid(deal(1),true);expect(play(s,[]).turn).toBe(s.turn);const card=s.hands[0][0];s=play(s,[card]);const invalid=play(s,[card]);expect(invalid.turn).toBe(s.turn);s=play(s,[]);s=play(s,[]);expect(s.turn).toBe(0);expect(s.table).toBeNull();});
 it('地主/农民出完正确判阵营',()=>{for(const seat of [0,1]){let s=bid(deal(4),true);s={...s,turn:seat,hands:s.hands.map((h,i)=>i===seat?[h[0]]:h)};const n=play(s,[s.hands[seat][0]]);expect(n.phase).toBe('done');expect(n.winner).toBe(seat===0?'地主':'农民');}});
 it('提示合法不改局面、只接收自己的手牌与公开视图',()=>{const s=bid(deal(40),true),copy=JSON.stringify(s),v=view(s),h=hint(v);expect(classify(h.cards)).not.toBeNull();expect(h.cards.every(c=>v.hand.includes(c))).toBe(true);expect(JSON.stringify(s)).toBe(copy);expect(Object.keys(v).sort()).toEqual(['hand','history','landlord','owner','sizes','table','turn'].sort());const hidden={...s,hands:s.hands.map((a,i)=>i===0?a:a.slice().reverse())};expect(hint(view(hidden))).toEqual(h);});
 it('无牌压过建议过，不自动代走',()=>{const v=view(bid(deal(3),true));v.hand=C(3);v.table=classify(C(17));expect(hint(v).cards).toEqual([]);});
 it('枚举生成合法、手牌子集；32种种子AI均能完成完整单局',()=>{for(let seed=1;seed<=32;seed++){let s=deal(seed,seed%3);for(let n=0;n<700&&s.phase!=='done';n++){const before=s.history.length;s=aiTurn(s);if(s.phase!=='bid')expect(s.phase==='play'||s.phase==='done').toBe(true);expect(s.history.length>=before).toBe(true);}expect(s.phase,`seed ${seed}`).toBe('done');const dealt=s.hands.flat().concat(s.history.flatMap(h=>h.cards));expect(new Set(dealt).size).toBe(54);}
 const h=C(3,3,3,4,4,4,5,5,5,8,9,10,11,11);for(const c of options(h,null)){expect(classify(c.cards)).not.toBeNull();expect(c.cards.every(x=>h.includes(x))).toBe(true);}expect(rank(53)).toBe(17);
 });
});
