import {
  Page,
  Text,
  Button,
  useEffect,
  useRef,
  useState,
  useGrokTheme,
  type PointerEvent
} from '../compat/grok-canvas';
type Tank={x:number;y:number;d:number;cd:number;turn:number;hp:number};
type Shot={x:number;y:number;d:number;enemy:boolean;dead?:boolean};
const N=20,T=28,W=N*T,V=[[0,-1],[1,0],[0,1],[-1,0]];
export default function App(){
 const theme=useGrokTheme(),ref=useRef<HTMLCanvasElement>(null),keys=useRef<Record<string,boolean>>({}),cmd=useRef(''),[hud,setHud]=useState('第 1 关 · 生命 3 · 击破 0'),[paused,setPaused]=useState(false);
 useEffect(()=>{const canvas=ref.current;if(!canvas)return;const ctx=canvas.getContext('2d');if(!ctx)return;
 let grid:number[][]=[],player:Tank,enemies:Tank[]=[],shots:Shot[]=[],stage=1,lives=3,score=0,spawned=0,killed=0,spawnTime=0,inv=2,mode='play',pause=false,flash=0,frame=0,last=0,ui=0;
 const makeTank=(x:number,y:number,d:number,hp=1):Tank=>({x,y,d,hp,cd:0.5,turn:0});
 function load(){grid=Array.from({length:N},()=>Array(N).fill(0));for(let y=3;y<17;y++)for(let x=1;x<19;x++){if((x%4===1||x%4===2)&&y%5!==2)grid[y][x]=((x+y+stage)%8===0)?2:1;if(stage===2&&y===10&&x%4!==0)grid[y][x]=2;if(stage===3&&y%6===0&&x%3===0)grid[y][x]=2;}
 for(let y=16;y<20;y++)for(let x=7;x<=12;x++)grid[y][x]=0;
 for(let x=8;x<=11;x++)grid[17][x]=1;grid[18][8]=1;grid[19][8]=1;grid[18][11]=1;grid[19][11]=1;
 player=makeTank(6.5*T,18.5*T,0);enemies=[];shots=[];spawned=0;killed=0;spawnTime=0;inv=2;flash=1.4;mode='play';}
 load();
 const total=()=>5+stage*2;
 function sync(){setHud(`第 ${stage} / 3 关 · 生命 ${lives} · 击破 ${score} · 本关 ${killed}/${total()}`);}
 function blocked(x:number,y:number,self:Tank){const r=10;if(x<r||y<r||x>W-r||y>W-r)return true;
 for(let yy=Math.floor((y-r)/T);yy<=Math.floor((y+r)/T);yy++)for(let xx=Math.floor((x-r)/T);xx<=Math.floor((x+r)/T);xx++)if(grid[yy]?.[xx])return true;
 if(Math.abs(x-10*T)<T*0.7&&y>18*T)return true;
 return [player,...enemies].some((t:Tank)=>t!==self&&t.hp>0&&Math.abs(t.x-x)<21&&Math.abs(t.y-y)<21);}
 function move(t:Tank,d:number,speed:number,dt:number){t.d=d;const [dx,dy]=V[d],x=t.x+dx*speed*dt,y=t.y+dy*speed*dt;if(!blocked(x,y,t)){t.x=x;t.y=y;return true;}return false;}
 function shoot(t:Tank,enemy:boolean){if(t.cd>0)return;const [dx,dy]=V[t.d];shots.push({x:t.x+dx*16,y:t.y+dy*16,d:t.d,enemy});t.cd=enemy?1.25+Math.random():0.25;}
 function boom(x:number,y:number){bursts.push({x,y,t:0.35});}let bursts:{x:number;y:number;t:number}[]=[];
 function update(dt:number){if(pause||mode!=='play')return;flash=Math.max(0,flash-dt);inv-=dt;player.cd-=dt;
 let d=-1;const k=keys.current;if(k.ArrowUp||k.w)d=0;else if(k.ArrowRight||k.d)d=1;else if(k.ArrowDown||k.s)d=2;else if(k.ArrowLeft||k.a)d=3;if(d>=0)move(player,d,118,dt);if(k[' ']||k.j)shoot(player,false);
 spawnTime-=dt;if(spawned<total()&&enemies.length<4&&spawnTime<=0){const x=[1.5,9.5,18.5][spawned%3]*T;const e=makeTank(x,1.5*T,2,stage===3&&spawned%3===0?2:1);if(!blocked(e.x,e.y,e)){enemies.push(e);spawned++;spawnTime=1.6;}}
 for(const e of enemies){e.cd-=dt;e.turn-=dt;if(e.turn<=0){e.d=Math.random()<0.5?2:Math.floor(Math.random()*4);if(Math.abs(e.x-player.x)<20)e.d=e.y<player.y?2:0;e.turn=0.4+Math.random()*1.2;}if(!move(e,e.d,55+stage*9,dt))e.turn=0;shoot(e,true);}
 for(const b of shots){const [dx,dy]=V[b.d];for(let sub=0;sub<3&&!b.dead;sub++){b.x+=dx*270*dt/3;b.y+=dy*270*dt/3;if(b.x<0||b.y<0||b.x>=W||b.y>=W){b.dead=true;break;}const x=Math.floor(b.x/T),y=Math.floor(b.y/T);if(grid[y][x]){if(grid[y][x]===1)grid[y][x]=0;b.dead=true;boom(b.x,b.y);break;}
 if(b.enemy&&Math.abs(b.x-10*T)<21&&b.y>18*T){mode='lost';boom(10*T,19*T);b.dead=true;}
 const targets=b.enemy?[player]:enemies;for(const t of targets)if(Math.abs(t.x-b.x)<12&&Math.abs(t.y-b.y)<12){b.dead=true;if(t===player){if(inv<=0){lives--;boom(t.x,t.y);if(lives<=0)mode='lost';else{player.x=6.5*T;player.y=18.5*T;player.d=0;inv=2.5;}}}else{t.hp--;boom(t.x,t.y);if(t.hp<=0){score++;killed++;}}break;}
 }}
 shots=shots.filter((b:Shot)=>!b.dead);enemies=enemies.filter((e:Tank)=>e.hp>0);bursts.forEach((b:{t:number})=>b.t-=dt);bursts=bursts.filter((b:{t:number})=>b.t>0);
 if(killed>=total()){if(stage===3)mode='won';else{stage++;lives=Math.min(5,lives+1);load();}}}
 function tank(t:Tank,color:string){if(t===player&&inv>0&&Math.floor(inv*12)%2===0)return;ctx!.save();ctx!.translate(t.x,t.y);ctx!.rotate(t.d*Math.PI/2);ctx!.fillStyle='#38414b';ctx!.fillRect(-12,-12,6,24);ctx!.fillRect(6,-12,6,24);ctx!.fillStyle=color;ctx!.fillRect(-8,-10,16,20);ctx!.fillStyle='#d8e5dc';ctx!.fillRect(-3,-18,6,19);ctx!.fillStyle=color;ctx!.fillRect(-6,-5,12,11);if(t.hp>1){ctx!.strokeStyle='#ffffff';ctx!.strokeRect(-5,-4,10,9);}ctx!.restore();}
 function draw(){if(!ctx)return;ctx.fillStyle='#101a21';ctx.fillRect(0,0,W,W);ctx.strokeStyle='#192a32';ctx.lineWidth=1;for(let n=0;n<=N;n++){ctx.beginPath();ctx.moveTo(n*T,0);ctx.lineTo(n*T,W);ctx.moveTo(0,n*T);ctx.lineTo(W,n*T);ctx.stroke();}
 for(let y=0;y<N;y++)for(let x=0;x<N;x++){const v=grid[y][x];if(!v)continue;ctx.fillStyle=v===1?'#af6748':'#7a8b98';ctx.fillRect(x*T+1,y*T+1,T-2,T-2);ctx.strokeStyle=v===1?'#603c32':'#bdcbd1';ctx.strokeRect(x*T+3,y*T+3,T-6,T-6);if(v===1){ctx.beginPath();ctx.moveTo(x*T,y*T+14);ctx.lineTo(x*T+T,y*T+14);ctx.moveTo(x*T+14,y*T);ctx.lineTo(x*T+14,y*T+14);ctx.stroke();}}
 ctx.fillStyle='#70ddc3';ctx.fillRect(9.35*T,18.4*T,1.3*T,1.25*T);ctx.fillStyle='#153c3b';ctx.fillRect(9.7*T,18.6*T,0.6*T,0.75*T);ctx.fillStyle='#e8fff6';ctx.font='15px sans-serif';ctx.textAlign='center';ctx.fillText('基',10*T,19.15*T);
 tank(player,'#8fe3ab');enemies.forEach((e:Tank)=>tank(e,e.hp>1?'#d59bf6':'#edaa67'));
 shots.forEach((b:Shot)=>{ctx.fillStyle=b.enemy?'#ff826e':'#e8ff9d';ctx.fillRect(b.x-3,b.y-3,6,6);});bursts.forEach((b:{x:number;y:number;t:number})=>{ctx.strokeStyle='#ffdb89';ctx.lineWidth=3;ctx.beginPath();ctx.arc(b.x,b.y,(0.35-b.t)*60+4,0,Math.PI*2);ctx.stroke();});
 if(pause||mode!=='play'||flash>0){ctx.fillStyle='rgba(4,10,17,.75)';ctx.fillRect(0,W/2-58,W,116);ctx.fillStyle='#f3f5ee';ctx.font='bold 29px sans-serif';ctx.fillText(pause?'已暂停':mode==='won'?'三关守卫成功！':mode==='lost'?'防线失守':`第 ${stage} 关`,W/2,W/2-4);ctx.font='15px sans-serif';ctx.fillText(mode==='lost'||mode==='won'?'点击重新开始，再战一次':pause?'点击继续或按 P':'保护基地 · 消灭所有敌军',W/2,W/2+28);}}
 function tick(now:number){const dt=Math.min((now-last)/1000||0,0.035);last=now;if(cmd.current==='reset'){stage=1;lives=3;score=0;pause=false;setPaused(false);load();cmd.current='';}if(cmd.current==='pause'){pause=!pause;setPaused(pause);cmd.current='';}update(dt);draw();ui+=dt;if(ui>0.15){sync();ui=0;}frame=requestAnimationFrame(tick);}
 const down=(e:globalThis.KeyboardEvent)=>{const key=e.key.length===1?e.key.toLowerCase():e.key;if(['ArrowUp','ArrowDown','ArrowLeft','ArrowRight',' ','w','a','s','d','j','p'].includes(key)){e.preventDefault();keys.current[key]=true;if(key==='p'&&!e.repeat)cmd.current='pause';}};
 const up=(e:globalThis.KeyboardEvent)=>{keys.current[e.key.length===1?e.key.toLowerCase():e.key]=false;};const blur=()=>{keys.current={};if(!pause&&mode==='play')cmd.current='pause';};window.addEventListener('keydown',down);window.addEventListener('keyup',up);window.addEventListener('blur',blur);frame=requestAnimationFrame(tick);sync();return()=>{cancelAnimationFrame(frame);window.removeEventListener('keydown',down);window.removeEventListener('keyup',up);window.removeEventListener('blur',blur);keys.current={};};
 },[]);
 const control=(label:string,key:string)=><button key={key} style={{padding:'14px 22px',border:`1px solid ${theme.border.default}`,borderRadius:theme.radius.md,background:theme.bg.elevated,color:theme.text.primary,fontFamily:theme.font.family,touchAction:'none',userSelect:'none'}} onPointerDown={(e:PointerEvent<HTMLButtonElement>)=>{e.preventDefault();e.currentTarget.setPointerCapture(e.nativeEvent.pointerId);keys.current[key]=true;}} onPointerUp={()=>{keys.current[key]=false;}} onPointerCancel={()=>{keys.current[key]=false;}} onLostPointerCapture={()=>{keys.current[key]=false;}}>{label}</button>;
 return <Page title="坦克对战" width="wide" lang="zh-Hans" summary="三道防线，一座基地。驾驶坦克，击碎砖墙，守住最后的阵地。"><Text>{hud}</Text><div style={{display:'flex',flexWrap:'wrap',gap:10,marginBottom:16}}><Button label={paused?'继续':'暂停'} onClick={()=>{cmd.current='pause';}}/><Button label="重新开始" onClick={()=>{cmd.current='reset';}}/></div><canvas ref={ref} width={W} height={W} aria-label="坦克战场，使用下方触屏按钮或方向键和空格操作" style={{width:'100%',maxHeight:'70vh',objectFit:'contain',display:'block',touchAction:'none'}}/><div style={{display:'flex',flexWrap:'wrap',justifyContent:'center',gap:8,marginTop:16}}>{control('↑','ArrowUp')}{control('←','ArrowLeft')}{control('↓','ArrowDown')}{control('→','ArrowRight')}{control('开火',' ')}</div><Text>方向键 / WASD 移动 · 空格 / J 开火 · P 暂停。砖墙可破坏，钢墙不可破坏；绿蓝色基地被命中即失败。每过一关补充一条生命，紫色敌军需要两发命中。触屏可同时按住方向和开火。</Text></Page>;
}
