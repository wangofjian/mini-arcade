/** 四人基础麻将：实体牌ID 0..135；不计番，无金钱。 */
export type Meld = {kind:'chi'|'pon'|'kong'|'concealed'; tiles:number[]; from:number};
export type Action = {kind:'draw'|'discard'|'pass'|'chi'|'pon'|'kong'|'concealed'|'win';tiles:number[]};
export type MahjongState = {
 hands:number[][];wall:number[];melds:Meld[][];discards:number[][];turn:number;
 phase:'draw'|'discard'|'respond'|'done';pending:{tile:number;from:number}|null;
 responses:(Action|null)[];back:boolean;drawn:number|null;winner:number|null;
 result:'self'|'discard'|'draw'|null;steps:number;message:string;
};
export type View = {seat:number;hand:number[];sizes:number[];melds:Meld[][];discards:number[][];
 turn:number;phase:MahjongState['phase'];pending:MahjongState['pending'];remaining:number;
 waiting:boolean[];drawn:number|null;steps:number};
export const typeOf=(id:number)=>Math.floor(id/4);
export function tileLabel(id:number){const t=typeOf(id);return t<27?`${t%9+1}${['万','筒','条'][Math.floor(t/9)]}`:['东','南','西','北','中','发','白'][t-27]??'?';}
export function winning(hand:number[],open=0):boolean{
 if(!Number.isInteger(open)||open<0||open>4||hand.length!==14-open*3||new Set(hand).size!==hand.length||hand.some(x=>!Number.isInteger(x)||x<0||x>=136))return false;
 const c=Array(34).fill(0) as number[];for(const id of hand)c[typeOf(id)]++;
 const solve=(left:number):boolean=>{if(left===0)return c.every(n=>n===0);const i=c.findIndex(n=>n>0);if(i<0)return false;
 if(c[i]>=3){c[i]-=3;const ok=solve(left-1);c[i]+=3;if(ok)return true;}
 if(i<27&&i%9<=6&&c[i+1]&&c[i+2]){c[i]--;c[i+1]--;c[i+2]--;const ok=solve(left-1);c[i]++;c[i+1]++;c[i+2]++;if(ok)return true;}return false;};
 for(let i=0;i<34;i++)if(c[i]>=2){c[i]-=2;const ok=solve(4-open);c[i]+=2;if(ok)return true;}return false;
}
export function createMahjong(seed=Date.now(),dealer=0):MahjongState{
 let x=seed>>>0;const wall=Array.from({length:136},(_,i)=>i);for(let i=135;i>0;i--){x=(Math.imul(x,1664525)+1013904223)>>>0;const j=x%(i+1);[wall[i],wall[j]]=[wall[j],wall[i]];}
 const hands=Array.from({length:4},()=>[] as number[]);for(let r=0;r<13;r++)for(let s=0;s<4;s++)hands[s].push(wall.shift()!);
 hands.forEach(h=>h.sort((a,b)=>a-b));return{hands,wall,melds:[[],[],[],[]],discards:[[],[],[],[]],turn:((dealer%4)+4)%4,phase:'draw',pending:null,responses:[null,null,null,null],back:false,drawn:null,winner:null,result:null,steps:0,message:'东位起手；先摸后打。'};
}
export function publicView(s:MahjongState,seat:number):View{
 return{seat,hand:s.hands[seat].slice(),sizes:s.hands.map(h=>h.length),melds:s.melds.map((m,i)=>m.map(x=>({...x,tiles:x.kind==='concealed'&&i!==seat?[]:x.tiles.slice()}))),discards:s.discards.map(h=>h.slice()),turn:s.turn,phase:s.phase,pending:s.pending?{...s.pending}:null,remaining:s.wall.length,waiting:s.responses.map((r,i)=>i!==s.pending?.from&&!r),drawn:s.turn===seat?s.drawn:null,steps:s.steps};
}
const action=(kind:Action['kind'],tiles:number[]=[]):Action=>({kind,tiles});
export function legalActions(v:View):Action[]{
 if(v.phase==='done')return[];if(v.phase==='draw')return v.turn===v.seat?[action('draw')]:[];
 const groups=Array.from({length:34},(_,t)=>v.hand.filter(x=>typeOf(x)===t));
 if(v.phase==='discard'){
 if(v.turn!==v.seat)return[];const out=v.hand.map(x=>action('discard',[x]));if(winning(v.hand,v.melds[v.seat].length))out.unshift(action('win'));
 for(const g of groups)if(g.length===4)out.push(action('concealed',g));return out;
 }
 if(!v.pending||!v.waiting[v.seat]||v.seat===v.pending.from)return[];
 const {tile,from}=v.pending,t=typeOf(tile),g=groups[t],out=[action('pass')];
 if(winning([...v.hand,tile],v.melds[v.seat].length))out.push(action('win'));
 if(g.length>=2)out.push(action('pon',g.slice(0,2)));if(g.length>=3)out.push(action('kong',g.slice(0,3)));
 if(v.seat===(from+1)%4&&t<27){for(let start=t-2;start<=t;start++){if(start<0||start>=27||start%9>6||Math.floor(start/9)!==Math.floor(t/9))continue;const others=[start,start+1,start+2].filter(x=>x!==t);if(others.every(x=>groups[x].length))out.push(action('chi',others.map(x=>groups[x][0])));}}
 return out;
}
const same=(a:Action,b:Action)=>a.kind===b.kind&&a.tiles.length===b.tiles.length&&a.tiles.slice().sort((x,y)=>x-y).every((x,i)=>x===b.tiles.slice().sort((x,y)=>x-y)[i]);
function copy(s:MahjongState):MahjongState{return{...s,hands:s.hands.map(h=>h.slice()),wall:s.wall.slice(),melds:s.melds.map(m=>m.map(x=>({...x,tiles:x.tiles.slice()}))),discards:s.discards.map(h=>h.slice()),responses:s.responses.map(x=>x?{...x,tiles:x.tiles.slice()}:null),pending:s.pending?{...s.pending}:null};}
function resolve(s:MahjongState){
 if(!s.pending||s.responses.some((x,i)=>i!==s.pending!.from&&!x))return;
 const {from,tile}=s.pending,priority=(a:Action)=>a.kind==='win'?3:a.kind==='pon'||a.kind==='kong'?2:a.kind==='chi'?1:0;
 const seats=[1,2,3].map(d=>(from+d)%4).filter(i=>priority(s.responses[i]!)>0).sort((a,b)=>priority(s.responses[b]!)-priority(s.responses[a]!));
 const seat=seats[0];if(seat===undefined){s.discards[from].push(tile);s.pending=null;s.turn=(from+1)%4;s.phase='draw';s.back=false;s.message='无人抢牌，下一家摸牌。';return;}
 const a=s.responses[seat]!;s.turn=seat;
 if(a.kind==='win'){s.phase='done';s.winner=seat;s.result='discard';s.message=`${seat===0?'你':'AI'+seat}点和；最近一家优先。`;return;}
 s.hands[seat]=s.hands[seat].filter(x=>!a.tiles.includes(x));s.melds[seat].push({kind:a.kind as Meld['kind'],tiles:[...a.tiles,tile].sort((a,b)=>a-b),from});s.pending=null;s.drawn=null;s.back=a.kind==='kong';s.phase=s.back?'draw':'discard';s.message=`${seat===0?'你':'AI'+seat}${a.kind==='chi'?'吃':a.kind==='pon'?'碰':'明杠，等待补牌'}。`;
}
/** 非法动作返回原对象；所有入口都在规则层校验，不依赖UI。 */
export function act(s:MahjongState,seat:number,a:Action):MahjongState{
 if(seat<0||seat>3||!Number.isInteger(seat)||!legalActions(publicView(s,seat)).some(x=>same(x,a)))return s;
 const n=copy(s);n.steps++;
 if(a.kind==='draw'){
 if(!n.wall.length){n.phase='done';n.result='draw';n.message='牌墙耗尽，流局。';n.drawn=null;return n;}
 const id=n.back?n.wall.pop()!:n.wall.shift()!;n.hands[seat].push(id);n.hands[seat].sort((a,b)=>a-b);n.drawn=id;n.back=false;n.phase='discard';n.message=`${seat===0?'你':'AI'+seat}摸牌，轮到弃牌。`;return n;
 }
 if(n.phase==='respond'){n.responses[seat]={kind:a.kind,tiles:a.tiles.slice()};resolve(n);return n;}
 if(a.kind==='win'){n.phase='done';n.winner=seat;n.result='self';n.message=`${seat===0?'你':'AI'+seat}自摸和牌。`;return n;}
 if(a.kind==='concealed'){n.hands[seat]=n.hands[seat].filter(x=>!a.tiles.includes(x));n.melds[seat].push({kind:'concealed',tiles:a.tiles.slice(),from:seat});n.back=true;n.drawn=null;n.phase='draw';n.message=`${seat===0?'你':'AI'+seat}暗杠，等待补牌。`;return n;}
 n.hands[seat]=n.hands[seat].filter(x=>x!==a.tiles[0]);n.pending={tile:a.tiles[0],from:seat};n.responses=[null,null,null,null];n.phase='respond';n.drawn=null;n.message=`${seat===0?'你':'AI'+seat}打出${tileLabel(a.tiles[0])}，等待响应。`;return n;
}
export function hintMahjong(v:View):{action:Action|null;reason:string}{
 const all=legalActions(v);if(!all.length)return{action:null,reason:'等待其他玩家。'};
 for(const k of ['win','kong','concealed','pon','chi','draw'] as const){const a=all.find(x=>x.kind===k);if(a)return{action:{...a,tiles:a.tiles.slice()},reason:k==='win'?'四面子一将已满足，可和牌。':k==='draw'?'轮到摸牌。':`当前可${({kong:'明杠',concealed:'暗杠',pon:'碰',chi:'吃'} as Record<string,string>)[k]}，请自行选择；非最优策略。`};}
 const discards=all.filter(a=>a.kind==='discard');if(!discards.length)return{action:action('pass'),reason:'本次没有可吃碰杠胡的组合，可过。'};
 const counts=Array(34).fill(0) as number[];v.hand.forEach(x=>counts[typeOf(x)]++);
 const keep=(id:number)=>{const t=typeOf(id);let k=counts[t]*5;if(t<27)for(const d of [-2,-1,1,2]){const q=t+d;if(q>=0&&q<27&&Math.floor(q/9)===Math.floor(t/9))k+=counts[q]*(Math.abs(d)===1?3:1);}return k;};
 const best=discards.reduce((a,b)=>keep(a.tiles[0])<=keep(b.tiles[0])?a:b);return{action:{...best,tiles:best.tiles.slice()},reason:'优先弃孤张，保留对子与相邻搭子；入门启发式，并非最优。'};
}
export function nextActor(s:MahjongState):number|null{if(s.phase==='done')return null;if(s.phase!=='respond')return s.turn;return [1,2,3].map(d=>(s.pending!.from+d)%4).find(i=>!s.responses[i])??null;}
export function aiMahjong(s:MahjongState):MahjongState{const seat=nextActor(s);if(seat===null)return s;const a=hintMahjong(publicView(s,seat)).action;return a?act(s,seat,a):s;}
/** 人类托管边界：只自动摸牌、或完全没有可抢牌组合时过；其余永远等人。 */
export function advanceMahjong(s:MahjongState,human=0):MahjongState{
 const seat=nextActor(s);if(seat===null)return s;
 if(seat===human){const all=legalActions(publicView(s,seat));if(s.phase!=='draw'&&!(s.phase==='respond'&&all.length===1&&all[0].kind==='pass'))return s;}
 return aiMahjong(s);
}
export function allTiles(s:MahjongState){return [...s.wall,...s.hands.flat(),...s.discards.flat(),...s.melds.flatMap(m=>m.flatMap(x=>x.tiles)),...(s.pending?[s.pending.tile]:[])];}
