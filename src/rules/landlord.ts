// 入门规则：飞机单翅的带牌点数须互异且与主体不同；飞机主体不能含2/王。
export type Combo={kind:string;high:number;len:number;cards:number[]};
export const rank=(id:number)=>id<52?3+Math.floor(id/4):id===52?16:17;
export const label=(id:number)=>({11:'J',12:'Q',13:'K',14:'A',15:'2',16:'小王',17:'大王'} as Record<number,string>)[rank(id)]??String(rank(id));
export function groups(cards:number[]){const m=new Map<number,number[]>();for(const c of cards)m.set(rank(c),[...(m.get(rank(c))??[]),c]);return [...m.entries()].sort((a,b)=>a[0]-b[0]);}
const consecutive=(r:number[])=>r.length>0&&r[r.length-1]<=14&&r.every((x,i)=>i===0||x===r[i-1]+1);
export function classify(cards:number[]):Combo|null{
 if(!cards.length||new Set(cards).size!==cards.length||cards.some(c=>!Number.isInteger(c)||c<0||c>53))return null;
 const g=groups(cards),n=cards.length, rs=g.map(x=>x[0]),counts=g.map(x=>x[1].length);
 const result=(kind:string,high:number):Combo=>({kind,high,len:n,cards:cards.slice().sort((a,b)=>rank(a)-rank(b)||a-b)});
 if(n===2&&rs[0]===16&&rs[1]===17)return result('王炸',17);
 if(g.length===1){if(n===1)return result('单张',rs[0]);if(n===2)return result('对子',rs[0]);if(n===3)return result('三张',rs[0]);if(n===4)return result('炸弹',rs[0]);}
 if(n===4&&counts.includes(3))return result('三带一',g.find(x=>x[1].length===3)![0]);
 if(n===5&&counts.includes(3)&&counts.includes(2))return result('三带二',g.find(x=>x[1].length===3)![0]);
 if(n>=5&&counts.every(c=>c===1)&&consecutive(rs))return result('顺子',rs[rs.length-1]);
 if(n>=6&&n%2===0&&counts.every(c=>c===2)&&consecutive(rs))return result('连对',rs[rs.length-1]);
 const quad=g.find(x=>x[1].length===4);
 if(quad){const rest=g.filter(x=>x!==quad);if(n===6&&((rest.length===2&&rest.every(x=>x[1].length===1))||(rest.length===1&&rest[0][1].length===2)))return result('四带二单',quad[0]);if(n===8&&rest.length===2&&rest.every(x=>x[1].length===2))return result('四带二对',quad[0]);}
 const triples=g.filter(x=>x[1].length===3);const t=triples.length;
 if(t>=2&&consecutive(triples.map(x=>x[0]))){const rest=g.filter(x=>x[1].length!==3);const h=triples[t-1][0];if(n===t*3&&rest.length===0)return result('飞机',h);if(n===t*4&&rest.length===t&&rest.every(x=>x[1].length===1))return result('飞机带单',h);if(n===t*5&&rest.length===t&&rest.every(x=>x[1].length===2))return result('飞机带对',h);}
 return null;
}
export function beats(a:Combo,b:Combo|null){if(!b)return true;if(b.kind==='王炸')return false;if(a.kind==='王炸')return true;if(a.kind==='炸弹'&&b.kind!=='炸弹')return true;return a.kind===b.kind&&a.len===b.len&&a.high>b.high;}
function choose<T>(a:T[],n:number):T[][]{if(n===0)return [[]];if(n>a.length)return [];const out:T[][]=[];for(let i=0;i<=a.length-n;i++)for(const rest of choose(a.slice(i+1),n-1))out.push([a[i],...rest]);return out;}
// 枚举按点数组合，不读取其他玩家手牌。
export function options(hand:number[],table:Combo|null):Combo[]{
 const g=groups(hand),out:Combo[]=[],seen=new Set<string>();
 const add=(cards:number[])=>{const c=classify(cards);if(!c||!beats(c,table))return;const key=c.cards.join(',');if(!seen.has(key)){seen.add(key);out.push(c);}};
 for(const [r,cs] of g){for(let n=1;n<=cs.length;n++)add(cs.slice(0,n));if(cs.length>=3)for(const [,w]of g.filter(x=>x[0]!==r)){add([...cs.slice(0,3),...w.slice(0,1)]);if(w.length>=2)add([...cs.slice(0,3),...w.slice(0,2)]);}if(cs.length===4){for(const [,w]of g.filter(x=>x[0]!==r&&x[1].length>=2))add([...cs,...w.slice(0,2)]);}if(cs.length===4)for(const size of [1,2])for(const wings of choose(g.filter(x=>x[0]!==r&&x[1].length>=size),2))add([...cs,...wings.flatMap(x=>x[1].slice(0,size))]);}
 const j=g.filter(x=>x[0]>=16);if(j.length===2)add(j.flatMap(x=>x[1]));
 for(const size of [1,2,3])for(let start=3;start<=14;start++){
  let run:number[]=[];
  for(let r=start;r<=14;r++){
   const cs=g.find(x=>x[0]===r)?.[1];if(!cs||cs.length<size)break;run.push(...cs.slice(0,size));const len=r-start+1;
   if(len<(size===1?5:size===2?3:2))continue;add(run);
   if(size===3)for(const wingSize of [1,2])for(const wings of choose(g.filter(x=>(x[0]<start||x[0]>r)&&x[1].length>=wingSize),len))add([...run,...wings.flatMap(x=>x[1].slice(0,wingSize))]);
  }
 }
 return out;
}
export type PublicView={hand:number[];sizes:number[];landlord:number;turn:number;table:Combo|null;owner:number;history:{seat:number;cards:number[]}[]};
export function hint(v:PublicView):{cards:number[];reason:string}{
 const legal=options(v.hand,v.table);legal.sort((a,b)=>{const value=(c:Combo)=>c.len===v.hand.length?-10000:(c.kind==='王炸'?100:c.kind==='炸弹'?80:0)-c.len*5+c.high;return value(a)-value(b);});
 return legal.length?{cards:legal[0].cards.slice(),reason:`${legal[0].kind}，合法${v.table?'压过上家':'领出'}；优先减少手牌，保留大牌。`}:{cards:[],reason:'没有合法可压的牌，建议过牌。'};
}
export type LandlordState={hands:number[][];bottom:number[];phase:'bid'|'play'|'done';turn:number;dealer:number;bidCount:number;landlord:number;table:Combo|null;owner:number;passes:number;winner:'地主'|'农民'|null;history:{seat:number;cards:number[]}[];message:string};
export function deal(seed=1,dealer=0):LandlordState{let x=seed>>>0;const deck=Array.from({length:54},(_,i)=>i);for(let i=53;i>0;i--){x=(Math.imul(x,1664525)+1013904223)>>>0;const j=x%(i+1);[deck[i],deck[j]]=[deck[j],deck[i]];}return{hands:[deck.slice(0,17),deck.slice(17,34),deck.slice(34,51)].map(h=>h.sort((a,b)=>rank(a)-rank(b)||a-b)),bottom:deck.slice(51),phase:'bid',turn:dealer,dealer,bidCount:0,landlord:-1,table:null,owner:-1,passes:0,winner:null,history:[],message:'依次叫/不叫；首位叫者当地主。全不叫则起叫位强制地主。'};}
export function view(s:LandlordState,seat=s.turn):PublicView{return{hand:s.hands[seat].slice(),sizes:s.hands.map(h=>h.length),landlord:s.landlord,turn:seat,table:s.table?{...s.table,cards:s.table.cards.slice()}:null,owner:s.owner,history:s.history.map(x=>({seat:x.seat,cards:x.cards.slice()}))};}
export function bid(s:LandlordState,call:boolean):LandlordState{if(s.phase!=='bid')return s;const t={...s,bidCount:s.bidCount+1};if(call||t.bidCount===3){const seat=call?s.turn:s.dealer;return{...t,hands:s.hands.map((h,i)=>i===seat?[...h,...s.bottom].sort((a,b)=>rank(a)-rank(b)||a-b):h.slice()),phase:'play',landlord:seat,turn:seat,message:`${seat===0?'你':'AI '+seat}成为地主，地主先出。`};}return{...t,turn:(s.turn+1)%3,message:'不叫，轮到下一位叫地主。'};}
export function play(s:LandlordState,cards:number[]):LandlordState{
 if(s.phase!=='play')return s;const h=s.hands[s.turn];const c=classify(cards);
 if(cards.length&&(!c||!cards.every(x=>h.includes(x))||!beats(c,s.table)))return{...s,message:'非法牌型、不是你的牌或无法压过，请重选。'};
 if(!cards.length&&!s.table)return{...s,message:'你拥有出牌权，不能过牌。'};
 const history=[...s.history,{seat:s.turn,cards:cards.slice()}];
 if(!cards.length){if(s.passes===1)return{...s,turn:s.owner,table:null,passes:0,history,message:'两家过牌，上一出牌者重新领出。'};return{...s,turn:(s.turn+1)%3,passes:s.passes+1,history,message:'过牌。'};}
 const hands=s.hands.map((hand,i)=>i===s.turn?hand.filter(x=>!cards.includes(x)):hand.slice());const winner=hands[s.turn].length===0?(s.turn===s.landlord?'地主':'农民'):null;
 return{...s,hands,turn:(s.turn+1)%3,table:c,owner:s.turn,passes:0,history,winner,phase:winner?'done':'play',message:winner?`${winner}阵营获胜！`:`${c!.kind}，轮到下一家。`};
}
export function aiBid(v:Pick<PublicView,'hand'>){return v.hand.filter(c=>rank(c)>=14).length>=3;}
export function aiTurn(s:LandlordState){return s.phase==='bid'?bid(s,aiBid(view(s))):s.phase==='play'?play(s,hint(view(s)).cards):s;}
