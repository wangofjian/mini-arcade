/** 小场抢七：俯视XY+球高Z；不模拟旋转、换边或完整盘赛。 */
export type Player={x:number;y:number};
export type TennisBall={x:number;y:number;z:number;vx:number;vy:number;vz:number;last:number;bounces:number;serve:boolean};
export type TennisState={players:Player[];ball:TennisBall|null;scores:number[];server:number;phase:'serve'|'rally'|'point'|'done';faults:number;rally:number;clock:number;message:string;winner:number|null};
export type TennisInput={x:number;y:number;hit:boolean;aim:number};
export const clamp=(v:number,a:number,b:number)=>Math.max(a,Math.min(b,v));
export function serverAt(points:number){return points===0?0:Math.floor((points-1)/2)%2===0?1:0;}
export function createTennis():TennisState{return{players:[{x:600,y:450},{x:360,y:100}],ball:null,scores:[0,0],server:0,phase:'serve',faults:0,rally:0,clock:0,message:'你先发球：空格或击球按钮，右侧发向对角发球区。',winner:null};}
export function awardPoint(s:TennisState,winner:number,why:string):TennisState{
 if(s.phase==='point'||s.phase==='done')return s;const scores=s.scores.slice();scores[winner]++;const done=Math.max(...scores)>=7&&Math.abs(scores[0]-scores[1])>=2;return{...s,scores,phase:done?'done':'point',winner:done?winner:null,ball:null,clock:0,message:why+(done?'；抢七结束。':'；准备下一分。')};
}
export function resetTennisPoint(s:TennisState):TennisState{
 if(s.phase!=='point')return s;const total=s.scores[0]+s.scores[1],server=serverAt(total),right=total%2===0;
 return{...s,server,phase:'serve',faults:0,rally:0,clock:0,ball:null,players:[{x:right?600:360,y:450},{x:right?360:600,y:90}],message:server===0?'轮到你发球：发向对角区。':'AI准备发球。'};
}
function fault(s:TennisState,why:string):TennisState{if(s.ball?.serve&&s.faults===0)return{...s,ball:null,phase:'serve',faults:1,clock:0,message:why+'；第一发失误，第二发。'};return awardPoint(s,1-(s.ball?.last??s.server),why);}
export function hitTennis(s:TennisState,seat:number,aim=0):TennisState{
 if((s.phase!=='serve'&&s.phase!=='rally')||(seat!==0&&seat!==1))return s;
 const serve=s.phase==='serve';if(serve&&seat!==s.server)return s;
 const p=s.players[seat],b=s.ball;if(!serve&&(!b||(b.serve&&b.bounces===0)||b.last===seat||Math.hypot(b.x-p.x,b.y-p.y)>62||b.z>95||(seat===0?b.y<270:b.y>270)))return s;
 const total=s.scores[0]+s.scores[1],right=total%2===0;
 const tx=serve?(seat===0?(right?330:630):(right?630:330))+clamp(aim,-1,1)*55:480+clamp(aim,-1,1)*310;
 const ty=serve?(seat===0?220:320):(seat===0?105:435),x=serve?(seat===0?(right?600:360):(right?360:600)):b!.x,y=serve?(seat===0?450:90):b!.y,z=serve?30:Math.max(10,b!.z),t=serve?.92:Math.max(.48,1.08-s.rally*.035);
 return{...s,players:serve?s.players.map((q,i)=>i===seat?{x,y}:{...q}):s.players,phase:'rally',rally:s.rally+1,clock:0,ball:{x,y,z,vx:(tx-x)/t,vy:(ty-y)/t,vz:(225*t*t-z)/t,last:seat,bounces:0,serve},message:serve?'发球在空中。':'击球回到对面；注意第一落点与二跳。'};
}
export function landing(b:TennisBall){const t=(b.vz+Math.sqrt(b.vz*b.vz+900*Math.max(0,b.z)))/450;return{x:b.x+b.vx*t,y:b.y+b.vy*t};}
export function hintTennis(s:TennisState){const b=s.ball,q=b&&b.last===1?landing(b):{x:480,y:425};return{x:clamp(q.x,190,770),y:clamp(q.y,310,470),reason:b&&b.last===1?'参考第一落点回位，球高与移动会影响实际接球时机。':'建议靠近底线中央；发球请向对角发球区。'};}
export function tennisBot(s:TennisState,seat:number):TennisInput{
 const p=s.players[seat],b=s.ball;let q={x:480,y:seat===0?430:110};
 if(s.phase==='serve')q=p;
 else if(b&&b.last!==seat){const land=landing(b);q={x:clamp(land.x,190,770),y:clamp(land.y,seat===0?300:75,seat===0?470:240)};}
 const dx=q.x-p.x,dy=q.y-p.y,d=Math.hypot(dx,dy);return{x:d>5?dx/d:0,y:d>5?dy/d:0,hit:s.phase==='serve'?s.server===seat&&s.clock>.7:true,aim:Math.sin(s.rally*2.13+(s.scores[0]+s.scores[1])*1.7+seat)*.9};
}
export function tickTennis(s:TennisState,input:TennisInput,dt:number,bothAI=false):TennisState{
 dt=clamp(Number.isFinite(dt)?dt:0,0,.05);if(!dt||s.phase==='done')return s;
 let n:TennisState={...s,players:s.players.map(p=>({...p})),ball:s.ball?{...s.ball}:null,clock:s.clock+dt};
 if(n.phase==='point')return n.clock>.9?resetTennisPoint(n):n;
 const inputs=[bothAI?tennisBot(n,0):input,tennisBot(n,1)];
 for(let i=0;i<2;i++){const a=inputs[i],p=n.players[i],len=Math.max(1,Math.hypot(a.x,a.y));p.x=clamp(p.x+a.x/len*235*dt,170,790);p.y=clamp(p.y+a.y/len*235*dt,i===0?292:40,i===0?500:248);if(a.hit)n=hitTennis(n,i,a.aim);}
 if(n.phase!=='rally'||!n.ball)return n;
 const b=n.ball,steps=5,h=dt/steps;
 for(let k=0;k<steps;k++){
 const oldY=b.y;b.x+=b.vx*h;b.y+=b.vy*h;b.z+=b.vz*h-225*h*h;b.vz-=450*h;
 if((oldY-270)*(b.y-270)<=0&&oldY!==b.y&&b.x>=180&&b.x<=780&&b.z<24)return fault(n,'球未越过球网');
 if(b.z<=0){
 if(b.bounces===0){const inCourt=b.x>=180&&b.x<=780&&b.y>=60&&b.y<=480&&(b.last===0?b.y<270:b.y>270);
 const total=n.scores[0]+n.scores[1],right=total%2===0;const serviceX=b.last===0?(right?b.x<480:b.x>480):(right?b.x>480:b.x<480);
 const serviceY=b.last===0?b.y>=180&&b.y<270:b.y>270&&b.y<=360;
 if(!inCourt||(b.serve&&(!serviceX||!serviceY)))return fault(n,b.serve?'发球落点不在对角发球区':'第一落点界外/未过网');
 b.serve=false;b.bounces=1;b.z=0;b.vz=Math.abs(b.vz)*.65;
 }else return awardPoint(n,b.last,'对方未在第二次落地前回球');
 }
 if(b.x<50||b.x>910||b.y<0||b.y>540)return b.bounces?awardPoint(n,b.last,'落地后未接到回球'):fault(n,'球飞出场外');
 }
 return n;
}
