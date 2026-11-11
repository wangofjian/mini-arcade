import {
  Page,
  useGrokTheme,
  useRef,
  useEffect,
  useState,
  Button
} from '../compat/grok-canvas';
import { ImmersiveFrame } from '../mobile/ImmersiveFrame';
import { useImmersivePlay } from '../mobile/immersivePlay';
import { useStageFit } from '../mobile/useStageFit';
type P={x:number;y:number;r:number;c:string};
export default function App(){
 const theme=useGrokTheme(); const ref=useRef<HTMLCanvasElement|null>(null); const stageRef=useRef<HTMLDivElement|null>(null); const control=useRef<{reset:()=>void}>({reset:()=>{}}); const [score,setScore]=useState(0); const [best,setBest]=useState(0);
 const {active:immersive}=useImmersivePlay();
 const fit=useStageFit(stageRef,760,660,immersive,true);
 useEffect(()=>{const canvas=ref.current;if(!canvas)return;const ctx=canvas.getContext('2d');if(!ctx)return;let raf=0,dead=false,charging=false,start=0,power=0,flight=false,jumpStart=0,fromX=0,fromY=0,toX=0,toY=0,px=0,py=0,z=0,camX=0,camY=0,points=0,record=0,combo=0,fall=0,last=performance.now(),message='按住蓄力 · 松开起跳',msgUntil=0;let platforms:P[]=[],current=0;let particles:{x:number;y:number;vx:number;vy:number;life:number}[]=[];
 try{record=Number(localStorage.getItem('hop-original-best')||0)||0;setBest(record);}catch{}
 const palette=['#70d4bc','#f6bb78','#a5abec','#ef9aa8'];
 const next=()=>{const p=platforms[platforms.length-1];const side=Math.random()<.5?-1:1;platforms.push({x:p.x+side*(95+Math.random()*100),y:p.y-95-Math.random()*55,r:Math.max(29,47-points*.18)+Math.random()*5,c:palette[platforms.length%4]});};
 const reset=()=>{platforms=[{x:0,y:0,r:52,c:palette[0]}];current=0;next();px=0;py=0;camX=0;camY=0;z=0;points=0;combo=0;dead=false;fall=0;flight=false;charging=false;power=0;particles=[];message='按住蓄力 · 松开起跳';msgUntil=performance.now()+3500;setScore(0);};control.current={reset};reset();
 const down=()=>{if(dead||flight||charging)return;charging=true;start=performance.now();};
 const up=()=>{if(!charging||dead)return;power=Math.min(1,(performance.now()-start)/1350);charging=false;flight=true;jumpStart=performance.now();fromX=px;fromY=py;const target=platforms[current+1];const dx=target.x-px,dy=target.y-py;const len=Math.hypot(dx,dy);const distance=35+power*340;toX=px+dx/len*distance;toY=py+dy/len*distance;};
 const pd=(e:PointerEvent)=>{e.preventDefault();canvas.focus();try{canvas.setPointerCapture(e.pointerId);}catch{}down();};const pu=(e:PointerEvent)=>{e.preventDefault();up();};const abort=()=>{charging=false;power=0;};const cancel=()=>{if(charging)up();else abort();};
 const kd=(e:KeyboardEvent)=>{if(e.code==='Space'){e.preventDefault();if(!e.repeat)down();}if(e.code==='KeyR')reset();};const ku=(e:KeyboardEvent)=>{if(e.code==='Space'){e.preventDefault();up();}};const blur=()=>abort();
 canvas.addEventListener('pointerdown',pd);canvas.addEventListener('pointerup',pu);canvas.addEventListener('pointercancel',cancel);canvas.addEventListener('lostpointercapture',cancel);canvas.addEventListener('keydown',kd);canvas.addEventListener('keyup',ku);window.addEventListener('blur',blur);
 const ellipse=(x:number,y:number,rx:number,ry:number,color:string)=>{ctx.beginPath();ctx.ellipse(x,y,rx,ry,0,0,Math.PI*2);ctx.fillStyle=color;ctx.fill();};
 const draw=(now:number)=>{const dt=Math.min(40,now-last);last=now;const w=760,h=660;ctx.clearRect(0,0,w,h);ctx.fillStyle='#111d2a';ctx.fillRect(0,0,w,h);
 if(charging)power=Math.min(1,(now-start)/1350);
 if(flight){const t=Math.min(1,(now-jumpStart)/650);px=fromX+(toX-fromX)*t;py=fromY+(toY-fromY)*t;z=Math.sin(t*Math.PI)*125;if(t>=1){flight=false;z=0;const p=platforms[current+1];const d=Math.hypot(px-p.x,py-p.y);if(d<p.r-4){current++;const center=d<12;combo=center?combo+1:0;const gain=center?2+combo:1;points+=gain;setScore(points);if(points>record){record=points;setBest(record);try{localStorage.setItem('hop-original-best',String(record));}catch{}}message=center?'正中靶心！连击 ×'+combo+'  +'+gain:'稳稳落地  +1';msgUntil=now+1600;for(let i=0;i<18;i++)particles.push({x:px,y:py,vx:(Math.random()-.5)*3,vy:(Math.random()-.5)*3,life:1});next();if(current>4){platforms.splice(0,1);current--;}}else{dead=true;message='差一点点，再来一跳';msgUntil=Infinity;}}}
 if(dead)fall=Math.min(160,fall+dt*.22);
 const anchor=platforms[current];camX+=(anchor.x-camX)*.07;camY+=(anchor.y-camY)*.07;
 const sx=(x:number)=>w/2+x-camX;const sy=(y:number)=>h*.64+(y-camY)*.68;
 for(let i=0;i<48;i++){const x=(i*173%760);const y=(i*89%660);ellipse(x,y,1.1,1.1,'#ffffff18');}
 // Floating islands: all geometry drawn locally.
 platforms.forEach((p:P,i:number)=>{const x=sx(p.x),y=sy(p.y);ellipse(x,y+36,p.r,p.r*.44,'#050c163d');ctx.fillStyle='#29394b';ctx.beginPath();ctx.moveTo(x-p.r,y);ctx.lineTo(x-p.r*.65,y+38);ctx.lineTo(x+p.r*.6,y+38);ctx.lineTo(x+p.r,y);ctx.closePath();ctx.fill();ellipse(x,y+9,p.r,p.r*.49,'#345364');ellipse(x,y,p.r,p.r*.49,p.c);ellipse(x,y,p.r*.45,p.r*.22,'#ffffff28');ellipse(x,y,6,3,'#ffffffbd');if(i===current+1){ctx.strokeStyle='#ffffff88';ctx.lineWidth=2;ctx.beginPath();ctx.ellipse(x,y,p.r+6,(p.r+6)*.49,0,0,Math.PI*2);ctx.stroke();ctx.fillStyle='#d2deeb';ctx.font='13px sans-serif';ctx.textAlign='center';ctx.fillText('NEXT',x,y-p.r*.5-16);}});
 particles=particles.filter((p:{life:number})=>p.life>0);particles.forEach((p:{x:number;y:number;vx:number;vy:number;life:number})=>{p.x+=p.vx;p.y+=p.vy;p.life-=dt/700;ctx.globalAlpha=Math.max(0,p.life);ellipse(sx(p.x),sy(p.y)-10,3,3,'#f9df9d');});ctx.globalAlpha=1;
 const x=sx(px),y=sy(py);ellipse(x,y,18,8,'#10223366');ctx.save();ctx.translate(x,y-z+fall);if(dead)ctx.rotate(fall*.017);const squash=charging?power*.3:0;ctx.scale(1+squash,1-squash);ctx.fillStyle='#f5efe1';ctx.beginPath();ctx.roundRect(-13,-37,26,34,10);ctx.fill();ellipse(0,-45,15,15,'#f7c77b');ellipse(-5,-47,2,3,'#29394b');ellipse(5,-47,2,3,'#29394b');ctx.fillStyle='#64bdb0';ctx.fillRect(-13,-29,26,6);ctx.restore();
 ctx.textAlign='left';ctx.fillStyle='#9cafc3';ctx.font='13px sans-serif';ctx.fillText('FLOATING ISLANDS / 原创漂浮岛',28,34);ctx.font='bold 34px sans-serif';ctx.fillStyle='#edf4fa';ctx.fillText(String(points).padStart(2,'0'),28,78);ctx.textAlign='right';ctx.font='14px sans-serif';ctx.fillStyle='#b0c4d6';ctx.fillText('最佳 '+record,w-28,38);if(combo>0)ctx.fillText('中心连击 ×'+combo,w-28,65);
 if(now<msgUntil&&!dead){ctx.textAlign='center';ctx.fillStyle='#f5efe1';ctx.font='18px sans-serif';ctx.fillText(message,w/2,118);}
 const bx=220,by=600,bw=320;ctx.fillStyle='#29394b';ctx.beginPath();ctx.roundRect(bx,by,bw,10,5);ctx.fill();ctx.fillStyle=power>.88?'#ef9aa8':'#70d4bc';ctx.beginPath();ctx.roundRect(bx,by,Math.max(1,bw*power),10,5);ctx.fill();ctx.fillStyle='#b0c4d6';ctx.font='14px sans-serif';ctx.textAlign='center';ctx.fillText(charging?'蓄力 '+Math.round(power*100)+'%':'按住屏幕 / 鼠标 / 空格 · 松开跳跃',w/2,640);
 if(dead){ctx.fillStyle='#111d2acc';ctx.fillRect(0,0,w,h);ctx.textAlign='center';ctx.fillStyle='#f5efe1';ctx.font='bold 36px sans-serif';ctx.fillText('本次 '+points+' 分',w/2,280);ctx.font='18px sans-serif';ctx.fillText(message,w/2,325);ctx.fillStyle='#9cafc3';ctx.font='15px sans-serif';ctx.fillText('点击下方重新开始，或按 R',w/2,362);}raf=requestAnimationFrame(draw);};raf=requestAnimationFrame(draw);
 return()=>{cancelAnimationFrame(raf);canvas.removeEventListener('pointerdown',pd);canvas.removeEventListener('pointerup',pu);canvas.removeEventListener('pointercancel',cancel);canvas.removeEventListener('lostpointercapture',cancel);canvas.removeEventListener('keydown',kd);canvas.removeEventListener('keyup',ku);window.removeEventListener('blur',blur);};
 },[]);
 return <Page title="跳一跳" width="wide" lang="zh-Hans" summary="原创漂浮岛挑战。按住蓄力，松开起跳；落在中心，连续加分。">
 <ImmersiveFrame
  layout="banded"
  stageRef={stageRef}
  focusRef={ref}
  intro={<p style={{color:theme.text.secondary,fontFamily:theme.font.family,fontSize:14}}>手机可点「全屏游玩」：画面铺满屏幕，按住画面蓄力、松开起跳。不强加方向键。最佳成绩在浏览器允许时保存在本机。</p>}
  hudStats={<><span>得分 {score}</span><span>最佳 {best}</span></>}
  hudActions={<Button label="重开" onClick={()=>{control.current.reset();ref.current?.focus();}}/>}
  side={<>
   <div className="imm-default-only" style={{display:'flex',flexWrap:'wrap',gap:18,alignItems:'center',marginBottom:8}}><span>得分 {score}</span><span>最佳 {best}</span></div>
   <Button label="重新开始" onClick={()=>{control.current.reset();ref.current?.focus();}}/>
  </>}
  help={<p style={{color:theme.text.secondary,fontFamily:theme.font.family,fontSize:14}}>全屏后按住画面或空格蓄力，松开跳跃。R 重新开始，Esc 退出全屏。蓄力越久跳得越远，满格不一定刚好！中心连击每次递增奖励；偏离中心会重置连击。最佳成绩在浏览器允许时保存在本机。</p>}
 >
 <canvas ref={ref} width={760} height={660} tabIndex={0} aria-label="跳一跳游戏区：按住鼠标、触屏或空格蓄力，松开跳跃。R 重新开始。" style={immersive?{display:'block',width:fit.width,height:fit.height,maxWidth:'none',maxHeight:'none',objectFit:'contain',background:theme.bg.subtle,touchAction:'none',borderRadius:12,outlineColor:theme.border.focus}:{display:'block',width:'100%',maxHeight:'78vh',objectFit:'contain',background:theme.bg.subtle,touchAction:'none',borderRadius:12,outlineColor:theme.border.focus}}/>
 </ImmersiveFrame>
 </Page>;
}
