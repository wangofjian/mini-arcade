import {ball,physics,strike,stepPhysics,settle,plans,freeSpot,respot,aiCuePosition,type Physics,type Plan} from './cuePhysics';
export type Group='solid'|'stripe';
export type PoolState={p:Physics;turn:number;phase:'ready'|'moving'|'hand'|'done';groups:(Group|null)[];winner:number|null;message:string;shots:number;shotLegal:number[]};
export const groupOf=(id:number):Group|null=>id>=1&&id<=7?'solid':id>=9&&id<=15?'stripe':null;
export function createPool():PoolState{const b=[ball(0,180,200)];const order=[1,9,2,10,8,3,11,4,12,5,13,6,14,7,15];let i=0;for(let row=0;row<5;row++)for(let j=0;j<=row;j++)b.push(ball(order[i++],520+row*16.4,200+(j-row/2)*19));return{p:physics(b),turn:0,phase:'ready',groups:[null,null],winner:null,message:'开放球桌，你先开杆。',shots:0,shotLegal:[]};}
export function poolTargets(s:PoolState):number[]{const g=s.groups[s.turn],all=s.p.balls.filter(b=>b.active&&b.id!==0);if(!g)return all.filter(b=>b.id!==8).map(b=>b.id);const own=all.filter(b=>groupOf(b.id)===g);return own.length?own.map(b=>b.id):all.filter(b=>b.id===8).map(b=>b.id);}
export function shootPool(s:PoolState,angle:number,power:number):PoolState{if(s.phase!=='ready')return s;const p=strike(s.p,angle,power);return p===s.p?s:{...s,p,phase:'moving',shots:s.shots+1,shotLegal:poolTargets(s),message:'球在运动，请等全部停稳。'};}
export function finishPool(s:PoolState):PoolState{
 if(s.phase!=='moving'||s.p.moving)return s;const {sunk,first}=s.p.shot,groups=s.groups.slice();const foul=sunk.includes(0)||first===null||!s.shotLegal.includes(first);
 if(sunk.includes(8)){const win=!foul&&s.shotLegal.includes(8);return{...s,phase:'done',winner:win?s.turn:1-s.turn,message:win?'合法清组后打进黑8，获胜！':'提前进黑8或黑8杆犯规，本方输。'};}
 if(!foul&&!groups[s.turn]){const id=sunk.find(id=>groupOf(id));if(id){groups[s.turn]=groupOf(id);groups[1-s.turn]=groups[s.turn]==='solid'?'stripe':'solid';}}
 const ownPot=!foul&&sunk.some(id=>groupOf(id)===groups[s.turn]);
 let p=s.p;if(foul)p={...p,balls:respot(p.balls,0,180,200)};
 return{...s,p,groups,phase:foul?'hand':'ready',turn:ownPot?s.turn:1-s.turn,message:foul?'犯规：对手全台手中球，点空位摆母球。':ownPot?'合法进本组球，继续击杆。':'未进本组球，交换轮次。'};
}
export function tickPool(s:PoolState,dt:number):PoolState{if(s.phase!=='moving')return s;return finishPool({...s,p:stepPhysics(s.p,dt)});}
export function placePool(s:PoolState,x:number,y:number):PoolState{if(s.phase!=='hand'||!freeSpot(s.p.balls,x,y))return s;return{...s,p:{...s.p,balls:s.p.balls.map(b=>b.id===0?{...b,x,y,active:true,vx:0,vy:0}:b)},phase:'ready',message:'母球已放好，请瞄准击杆。'};}
export function hintPool(s:PoolState):Plan|null{return plans(s.p,poolTargets(s))[0]??null;}
export function aiPool(s:PoolState):PoolState{
 if(s.phase==='hand'){const q=aiCuePosition(s.p,poolTargets(s));return placePool(s,q.x,q.y);}if(s.phase!=='ready')return s;
 const choices=plans(s.p,poolTargets(s));let best:PoolState|null=null,score=-Infinity;
 for(const c of choices.slice(0,18))for(const factor of [1,.9,1.12]){
 const shot=shootPool(s,c.angle,Math.max(0,Math.min(1,c.power*factor))),n=finishPool({...shot,p:settle(shot.p)});
 const val=n.phase==='done'?(n.winner===s.turn?10000:-10000):n.phase==='hand'?-100:n.p.shot.sunk.filter(id=>groupOf(id)===n.groups[s.turn]).length*30+(n.turn===s.turn?5:0);
 if(val>score){score=val;best=shot;}if(val>=30)return shot;
 }
 if(best&&score>=0)return best;
 const h=choices[0];if(!h)return s;return shootPool(s,h.angle+(s.shots%3-1)*.05,.45+(s.shots%4)*.12);
}
