/** 自绘二维台面，像素/秒；固定细分避免穿球，不模拟旋转/跳球。 */
export const W=800,H=400,R=9,FRICTION=95;
export const POCKETS=[{x:0,y:0},{x:400,y:0},{x:800,y:0},{x:0,y:400},{x:400,y:400},{x:800,y:400}];
export type Ball={id:number;x:number;y:number;vx:number;vy:number;active:boolean};
export type Shot={first:number|null;sunk:number[];elapsed:number;rail:boolean};
export type Physics={balls:Ball[];moving:boolean;shot:Shot};
export type Plan={target:number;angle:number;power:number;ghost:{x:number;y:number};pocket:{x:number;y:number};reason:string};
export const ball=(id:number,x:number,y:number):Ball=>({id,x,y,vx:0,vy:0,active:true});
export const physics=(balls:Ball[]):Physics=>({balls:balls.map(b=>({...b})),moving:false,shot:{first:null,sunk:[],elapsed:0,rail:false}});
export function strike(p:Physics,angle:number,power:number):Physics{
 if(p.moving||!Number.isFinite(angle)||!Number.isFinite(power)||!p.balls.find(b=>b.id===0&&b.active))return p;
 const balls=p.balls.map(b=>({...b,vx:b.id===0?Math.cos(angle)*(120+530*Math.max(0,Math.min(1,power))):0,vy:b.id===0?Math.sin(angle)*(120+530*Math.max(0,Math.min(1,power))):0}));
 return{balls,moving:true,shot:{first:null,sunk:[],elapsed:0,rail:false}};
}
export function stepPhysics(p:Physics,dt:number):Physics{
 if(!p.moving)return p;dt=Math.max(0,Math.min(.05,Number.isFinite(dt)?dt:0));if(!dt)return p;
 const n:Physics={balls:p.balls.map(b=>({...b})),moving:true,shot:{...p.shot,sunk:p.shot.sunk.slice()}};
 const steps=Math.ceil(dt*240),h=dt/steps;
 for(let k=0;k<steps;k++){
 n.shot.elapsed+=h;
 for(const b of n.balls){if(!b.active)continue;b.x+=b.vx*h;b.y+=b.vy*h;
 if(POCKETS.some(q=>Math.hypot(b.x-q.x,b.y-q.y)<23)){b.active=false;b.vx=b.vy=0;n.shot.sunk.push(b.id);continue;}
 if(b.x<R||b.x>W-R){b.x=Math.max(R,Math.min(W-R,b.x));b.vx=(b.x===R?1:-1)*Math.abs(b.vx)*.88;n.shot.rail=true;}
 if(b.y<R||b.y>H-R){b.y=Math.max(R,Math.min(H-R,b.y));b.vy=(b.y===R?1:-1)*Math.abs(b.vy)*.88;n.shot.rail=true;}
 const speed=Math.hypot(b.vx,b.vy),next=Math.max(0,speed-FRICTION*h);if(speed){b.vx*=next/speed;b.vy*=next/speed;}if(next<2)b.vx=b.vy=0;
 }
 for(let i=0;i<n.balls.length;i++)for(let j=i+1;j<n.balls.length;j++){
 const a=n.balls[i],b=n.balls[j];if(!a.active||!b.active)continue;let dx=b.x-a.x,dy=b.y-a.y,d=Math.hypot(dx,dy);if(d>=R*2)continue;
 if(d<.001){dx=1;dy=0;d=1;}const nx=dx/d,ny=dy/d,over=(R*2-d)/2+.001;a.x-=nx*over;a.y-=ny*over;b.x+=nx*over;b.y+=ny*over;
 const rel=(a.vx-b.vx)*nx+(a.vy-b.vy)*ny;if(rel>0){const impulse=rel*.985;a.vx-=impulse*nx;a.vy-=impulse*ny;b.vx+=impulse*nx;b.vy+=impulse*ny;
 if(n.shot.first===null&&(a.id===0||b.id===0))n.shot.first=a.id===0?b.id:a.id;}
 }
 }
 n.moving=n.balls.some(b=>b.active&&Math.hypot(b.vx,b.vy)>0);
 return n;
}
export function settle(p:Physics):Physics{let n=p;for(let i=0;i<240&&n.moving;i++)n=stepPhysics(n,.05);return n;}
export function freeSpot(balls:Ball[],x:number,y:number,ignore=0):boolean{return Number.isFinite(x)&&Number.isFinite(y)&&x>=R+1&&x<=W-R-1&&y>=R+1&&y<=H-R-1&&!POCKETS.some(p=>Math.hypot(x-p.x,y-p.y)<26)&&!balls.some(b=>b.active&&b.id!==ignore&&Math.hypot(x-b.x,y-b.y)<R*2+1);}
export function respot(balls:Ball[],id:number,x:number,y:number):Ball[]{
 let spot:{x:number;y:number}|null=freeSpot(balls,x,y,id)?{x,y}:null;
 for(let radius=20;!spot&&radius<850;radius+=20)for(let a=0;a<24;a++){const px=x+Math.cos(a*Math.PI/12)*radius,py=y+Math.sin(a*Math.PI/12)*radius;if(freeSpot(balls,px,py,id)){spot={x:px,y:py};break;}}
 if(!spot)throw Error('台面没有复位空位');return balls.map(b=>b.id===id?{...b,...spot,active:true,vx:0,vy:0}:b);
}
function segmentDistance(p:{x:number;y:number},a:{x:number;y:number},b:{x:number;y:number}){const dx=b.x-a.x,dy=b.y-a.y,t=Math.max(0,Math.min(1,((p.x-a.x)*dx+(p.y-a.y)*dy)/(dx*dx+dy*dy||1)));return Math.hypot(p.x-a.x-t*dx,p.y-a.y-t*dy);}
export function plans(p:Physics,legal:number[]):Plan[]{
 const cue=p.balls.find(b=>b.id===0&&b.active);if(!cue||p.moving)return[];const out:(Plan&{cost:number})[]=[];
 for(const b of p.balls.filter(x=>x.active&&legal.includes(x.id)))for(const pocket of POCKETS){
 const d=Math.hypot(pocket.x-b.x,pocket.y-b.y),ux=(pocket.x-b.x)/d,uy=(pocket.y-b.y)/d,ghost={x:b.x-ux*R*2,y:b.y-uy*R*2};
 if(ghost.x<R||ghost.x>W-R||ghost.y<R||ghost.y>H-R)continue;
 const dc=Math.hypot(ghost.x-cue.x,ghost.y-cue.y),cos=((ghost.x-cue.x)*ux+(ghost.y-cue.y)*uy)/(dc||1);if(cos<.3)continue;
 const blocked=p.balls.some(o=>o.active&&o.id!==0&&o.id!==b.id&&(segmentDistance(o,cue,ghost)<R*2+.5||segmentDistance(o,b,pocket)<R*2+.5));if(blocked)continue;
 const speed=Math.sqrt(2*FRICTION*(dc+d/(cos*cos)))*1.08+15;if(speed>670)continue;
 out.push({target:b.id,angle:Math.atan2(ghost.y-cue.y,ghost.x-cue.x),power:Math.max(0,Math.min(1,(speed-120)/530)),ghost,pocket,reason:'瞄准合法目标的假想接触点；参考入袋线，力度需自行判断。',cost:dc+d+250*(1-cos)});
 }
 out.sort((a,b)=>a.cost-b.cost);if(out.length)return out;
 const target=p.balls.filter(b=>b.active&&legal.includes(b.id)).sort((a,b)=>Math.hypot(a.x-cue.x,a.y-cue.y)-Math.hypot(b.x-cue.x,b.y-cue.y))[0];
 return target?[{target:target.id,angle:Math.atan2(target.y-cue.y,target.x-cue.x),power:.55,ghost:{x:target.x,y:target.y},pocket:{x:target.x,y:target.y},reason:'未发现清晰直线入袋路线；建议先接触合法目标，非最优解。'}]:[];
}
export function aiCuePosition(p:Physics,legal:number[]){for(const id of legal){const b=p.balls.find(x=>x.id===id&&x.active);if(!b)continue;for(const q of POCKETS){const d=Math.hypot(b.x-q.x,b.y-q.y);const x=b.x+(b.x-q.x)/d*70,y=b.y+(b.y-q.y)/d*70;if(freeSpot(p.balls,x,y))return{x,y};}}
 for(let y=60;y<380;y+=35)for(let x=60;x<780;x+=35)if(freeSpot(p.balls,x,y))return{x,y};return{x:120,y:200};}
