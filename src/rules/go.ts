export type Color=1|2;
export type GoState={board:number[];previous:number[]|null;turn:Color;passes:number;captures:number[];ply:number;ended:boolean;resigned:Color|null;komi:number;message:string};
export const N=9;
export const other=(c:Color):Color=>c===1?2:1;
export function createGo():GoState{return{board:Array(81).fill(0),previous:null,turn:1,passes:0,captures:[0,0,0],ply:0,ended:false,resigned:null,komi:6.5,message:'黑先，9路入门；提示不自动落子。'};}
export function neighbors(i:number){return [i%9>0?i-1:-1,i%9<8?i+1:-1,i>=9?i-9:-1,i<72?i+9:-1].filter(x=>x>=0);}
export function group(b:number[],i:number){const seen=new Set<number>([i]),libs=new Set<number>(),q=[i];while(q.length){const p=q.pop()!;for(const n of neighbors(p)){if(b[n]===0)libs.add(n);else if(b[n]===b[i]&&!seen.has(n)){seen.add(n);q.push(n);}}}return{stones:[...seen],liberties:[...libs]};}
export function place(s:GoState,i:number):GoState|null{
 if(s.ended||!Number.isInteger(i)||i<0||i>=81||s.board[i])return null;
 const b=s.board.slice();b[i]=s.turn;let taken=0;
 for(const n of neighbors(i)){if(b[n]!==other(s.turn))continue;const g=group(b,n);if(g.liberties.length===0){taken+=g.stones.length;for(const x of g.stones)b[x]=0;}}
 if(group(b,i).liberties.length===0)return null;
 if(s.previous&&s.previous.every((x,j)=>x===b[j]))return null;
 const captures=s.captures.slice();captures[s.turn]+=taken;
 return{...s,board:b,previous:s.board.slice(),turn:other(s.turn),passes:0,captures,ply:s.ply+1,message:taken?`提走 ${taken} 子。`:'落子完成。'};
}
export function pass(s:GoState):GoState{return s.ended?s:{...s,previous:s.board.slice(),turn:other(s.turn),passes:s.passes+1,ply:s.ply+1,ended:s.passes>=1,message:s.passes>=1?'双方连续停一手，按盘面简化面积计分。':'停一手，轮到对方。'};}
export function resign(s:GoState):GoState{return s.ended?s:{...s,ended:true,resigned:s.turn,message:'认输，本局结束。'};}
export function score(s:GoState){let black=s.board.filter(x=>x===1).length,white=s.board.filter(x=>x===2).length;const visited=new Set<number>();for(let i=0;i<81;i++){if(s.board[i]||visited.has(i))continue;const region=[i],border=new Set<number>();visited.add(i);for(let p=0;p<region.length;p++)for(const n of neighbors(region[p])){if(s.board[n])border.add(s.board[n]);else if(!visited.has(n)){visited.add(n);region.push(n);}}if(border.size===1){if(border.has(1))black+=region.length;else white+=region.length;}}
 white+=s.komi;return{black,white,winner:s.resigned?other(s.resigned):black>white?1:2};}
export type GoHint={i:number|null;reason:string};
export function hintGo(s:GoState):GoHint{
 if(s.ended)return{i:null,reason:'本局已结束。'};
 let best=-Infinity,choice:number|null=null,why='';
 for(let i=0;i<81;i++){const n=place(s,i);if(!n)continue;const adj=neighbors(i),friend=adj.filter(x=>s.board[x]===s.turn).length;const eye=friend===adj.length;if(eye)continue;
 const taken=n.captures[s.turn]-s.captures[s.turn];const saves=adj.some(x=>s.board[x]===s.turn&&group(s.board,x).liberties.length===1);const libs=group(n.board,i).liberties.length;
 const v=taken*40+(saves?25:0)+Math.min(libs,4)*2+(friend?2:0)-Math.abs(i%9-4)*0.3-Math.abs(Math.floor(i/9)-4)*0.3-(libs===1?30:0);
 if(v>best){best=v;choice=i;why=taken?'提子，解除对方包围。':saves?'救气，给己方棋块增加呼吸。':'向空处扩张并尽量保留气；仅入门建议。'};
 }
 return{i:choice,reason:choice===null?'没有合适扩张点，建议停一手。':why};
}
export function aiGo(s:GoState):GoState{
 // 明示的短局AI策略：对方pass则跟停，140手后主动停手，避免无休止填盘。
 if(s.ended)return s;if(s.passes>0||s.ply>=140)return pass(s);const h=hintGo(s);return h.i===null?pass(s):place(s,h.i)??pass(s);
}
