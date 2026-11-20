import {ball,physics,strike,stepPhysics,settle,plans,freeSpot,respot,aiCuePosition,type Physics,type Plan} from './cuePhysics';
export const colorValue=(id:number)=>id>=7&&id<=12?id-5:id>=1&&id<=6?1:0;
export const colorName=(id:number)=>['红','黄','绿','棕','蓝','粉','黑'][colorValue(id)-1]??'母球';
export const COLOR_SPOTS:Record<number,{x:number;y:number}>={7:{x:200,y:100},8:{x:200,y:300},9:{x:200,y:200},10:{x:400,y:200},11:{x:540,y:200},12:{x:690,y:200}};
export type SnookerState={p:Physics;turn:number;phase:'ready'|'moving'|'hand'|'done';on:'red'|'color'|'clear';clear:number;scores:number[];winner:number|null;message:string;shots:number;shotLegal:number[];nominated:number};
export function createSnooker():SnookerState{const b=[ball(0,120,200)];let id=1;for(let row=0;row<3;row++)for(let j=0;j<=row;j++)b.push(ball(id++,580+row*16.4,200+(j-row/2)*19));for(const [id,q] of Object.entries(COLOR_SPOTS))b.push(ball(+id,q.x,q.y));return{p:physics(b),turn:0,phase:'ready',on:'red',clear:2,scores:[0,0],winner:null,message:'6红球，先打红球。',shots:0,shotLegal:[],nominated:1};}
export function snookerTargets(s:SnookerState){return s.p.balls.filter(b=>b.active&&b.id!==0&&(s.on==='red'?b.id<=6:s.on==='color'?b.id>=7:colorValue(b.id)===s.clear)).map(b=>b.id);}
export function shootSnooker(s:SnookerState,angle:number,power:number,target?:number):SnookerState{
 if(s.phase!=='ready')return s;const legal=snookerTargets(s),nom=target??legal[0];if(!legal.includes(nom))return s;const p=strike(s.p,angle,power);return p===s.p?s:{...s,p,phase:'moving',shotLegal:s.on==='color'?[nom]:legal,nominated:colorValue(nom),shots:s.shots+1,message:'球运动中，停稳结算。'};
}
export function finishSnooker(s:SnookerState):SnookerState{
 if(s.phase!=='moving'||s.p.moving)return s;
 const {first,sunk}=s.p.shot,hitValue=first===null?0:colorValue(first),objects=sunk.filter(id=>id!==0);
 const foul=first===null||!s.shotLegal.includes(first)||sunk.includes(0)||objects.some(id=>!s.shotLegal.includes(id));
 const scores=s.scores.slice();if(foul)scores[1-s.turn]+=Math.max(4,s.nominated,hitValue,...objects.map(colorValue));else scores[s.turn]+=objects.reduce((n,id)=>n+colorValue(id),0);
 let balls=s.p.balls,on=s.on,clear=s.clear;const redLeft=balls.some(b=>b.active&&b.id>=1&&b.id<=6),scored=!foul&&objects.length>0;
 for(const id of objects.filter(id=>id>=7))if(s.on!=='clear'||foul){const q=COLOR_SPOTS[id];balls=respot(balls,id,q.x,q.y);}
 if(s.on==='red')on=scored?'color':redLeft?'red':'clear';
 else if(s.on==='color')on=redLeft?'red':'clear';
 else if(scored)clear++;
 let phase:SnookerState['phase']=foul?'hand':'ready',winner:number|null=null,message=foul?'犯规罚分，对手全台手中球。':scored?'合法进球，继续。':'未得分，交换轮次。';
 if(clear>7){if(scores[0]===scores[1]){const q=COLOR_SPOTS[12];balls=respot(balls,12,q.x,q.y);clear=7;message='平分，复位黑球决胜。';}else{phase='done';winner=scores[0]>scores[1]?0:1;message='清完黑球，本局结束。';}}
 if(foul)balls=respot(balls,0,120,200);
 return{...s,p:{...s.p,balls},scores,on,clear,phase,winner,turn:scored?s.turn:1-s.turn,message};
}
export function tickSnooker(s:SnookerState,dt:number){return s.phase==='moving'?finishSnooker({...s,p:stepPhysics(s.p,dt)}):s;}
export function placeSnooker(s:SnookerState,x:number,y:number):SnookerState{if(s.phase!=='hand'||!freeSpot(s.p.balls,x,y))return s;return{...s,p:{...s.p,balls:s.p.balls.map(b=>b.id===0?{...b,x,y,active:true,vx:0,vy:0}:b)},phase:'ready',message:'母球已摆放；请瞄准合法目标。'};}
export function hintSnooker(s:SnookerState):Plan|null{return plans(s.p,snookerTargets(s))[0]??null;}
export function aiSnooker(s:SnookerState):SnookerState{
 if(s.phase==='hand'){const q=aiCuePosition(s.p,snookerTargets(s));return placeSnooker(s,q.x,q.y);}if(s.phase!=='ready')return s;
 const choices=plans(s.p,snookerTargets(s));let best:SnookerState|null=null,score=-Infinity;
 for(const c of choices.slice(0,18))for(const f of [1,.9,1.12]){const shot=shootSnooker(s,c.angle,Math.max(0,Math.min(1,c.power*f)),c.target),n=finishSnooker({...shot,p:settle(shot.p)}),gain=n.scores[s.turn]-s.scores[s.turn],loss=n.scores[1-s.turn]-s.scores[1-s.turn];const value=gain*10-loss*20;
 if(value>score){score=value;best=shot;}if(value>0)return shot;}
 if(best&&score>=0)return best;const c=choices[0];return c?shootSnooker(s,c.angle+(s.shots%3-1)*.05,.45+(s.shots%4)*.12,c.target):s;
}
