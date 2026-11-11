import {
  Text,
  Page,
  Button,
  useGrokTheme,
  useState,
  useEffect,
  useRef,
  type CSSProperties
} from '../compat/grok-canvas';
import { ImmersiveFrame } from '../mobile/ImmersiveFrame';
import { useImmersivePlay } from '../mobile/immersivePlay';
import { useStageFit } from '../mobile/useStageFit';
type Card = { id:number; face:string };
const symbols=['🐱','🐶','🐼','🦊','🐸','🐨','🐯','🐰','🦋','🐳','🍓','🌻'];
function deck(n:number):Card[]{ const a=symbols.slice(0,n/2).flatMap((face:string,i:number)=>[{id:i*2,face},{id:i*2+1,face}]); for(let i=a.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[a[i],a[j]]=[a[j],a[i]];}return a; }
function clock(s:number){return `${Math.floor(s/60).toString().padStart(2,'0')}:${(s%60).toString().padStart(2,'0')}`;}
export default function App(){
 const stageRef=useRef<HTMLDivElement|null>(null);
 const {active:immersive}=useImmersivePlay();
 const fit=useStageFit(stageRef,4,4,immersive,true);

 const t=useGrokTheme();
 const [size,setSize]=useState(12);const [cards,setCards]=useState<Card[]>(()=>deck(12));const [open,setOpen]=useState<number[]>([]);const [matched,setMatched]=useState<number[]>([]);const [moves,setMoves]=useState(0);const [seconds,setSeconds]=useState(0);const [started,setStarted]=useState(false);const [showWin,setShowWin]=useState(true);
 const gate=useRef(false);const pending=useRef<ReturnType<typeof setTimeout>|null>(null);const began=useRef(0);
 const won=matched.length===size;const cols=size===24?6:4;
 useEffect(()=>{if(!started||won)return;const id=setInterval(()=>setSeconds(Math.floor((Date.now()-began.current)/1000)),250);return ()=>clearInterval(id);},[started,won]);
 useEffect(()=>()=>{if(pending.current)clearTimeout(pending.current);},[]);
 function reset(n:number){if(pending.current)clearTimeout(pending.current);gate.current=false;setSize(n);setCards(deck(n));setOpen([]);setMatched([]);setMoves(0);setSeconds(0);setStarted(false);setShowWin(true);}
 function flip(i:number){if(gate.current||won||open.includes(i)||matched.includes(i))return;if(!started){began.current=Date.now();setStarted(true);}if(open.length===0){setOpen([i]);return;}const first=open[0];setOpen([first,i]);setMoves((m:number)=>m+1);gate.current=true;const same=cards[first].face===cards[i].face;pending.current=setTimeout(()=>{if(same)setMatched((m:number[])=>[...m,first,i]);setOpen([]);gate.current=false;},same?400:950);}
 const faceStyle:CSSProperties={position:'absolute',inset:0,display:'flex',alignItems:'center',justifyContent:'center',borderRadius:12,backfaceVisibility:'hidden',border:`1px solid ${t.border.default}`};
 return <Page title="翻牌记忆" summary="翻开两张，找到相同的小伙伴。慢慢记，稳稳赢。" width="wide" lang="zh-Hans">
      <ImmersiveFrame
        layout="banded"
        stageRef={stageRef}
        intro={<Text>手机可点「全屏游玩」：牌面尽量铺满屏幕，点牌配对。不强加方向键。</Text>}
      >

 <div style={{fontFamily:t.font.family,color:t.text.primary}}>
 <div style={{display:'flex',flexWrap:'wrap',gap:10,alignItems:'center',marginBottom:22}}>
 {[12,16,24].map((n:number)=><Button key={n} label={n===12?'4 × 3 · 轻松':n===16?'4 × 4 · 标准':'6 × 4 · 挑战'} variant={size===n?'primary':'quiet'} onClick={()=>reset(n)}/>)}
 <Button label="重新开始" onClick={()=>reset(size)}/>
 </div>
 <div aria-live="polite" style={{display:'flex',flexWrap:'wrap',gap:24,padding:'14px 0',borderTop:`1px solid ${t.border.subtle}`,borderBottom:`1px solid ${t.border.subtle}`,marginBottom:22}}>
 <span>步数 <strong>{moves}</strong></span><span>用时 <strong style={{fontFamily:t.font.mono}}>{clock(seconds)}</strong></span><span>配对 <strong>{matched.length/2} / {size/2}</strong></span><span style={{color:t.text.secondary}}>{won?'全部找到！':!started?'翻开第一张，计时开始':open.length===2?(cards[open[0]].face===cards[open[1]].face?'找到一对！':'再记一下位置…'):'寻找相同的图案'}</span>
 </div>
 <div style={{position:'relative'}}>
 <div style={{display:'grid',gridTemplateColumns:`repeat(${cols}, minmax(0,1fr))`,gap:'clamp(6px,1.5vw,16px)'}}>
 {cards.map((c:Card,i:number)=>{const visible=open.includes(i)||matched.includes(i);const done=matched.includes(i);return <button key={c.id} onClick={()=>flip(i)} disabled={done||open.includes(i)||open.length===2} aria-label={visible?`第 ${i+1} 张：${c.face}${done?'，已配对':''}`:`翻开第 ${i+1} 张牌`} aria-pressed={visible} style={{padding:0,border:0,background:t.bg.base,aspectRatio:cols===6?'1 / 1':'1.25 / 1',perspective:800,cursor:done?'default':'pointer',borderRadius:12,minWidth:0}}>
 <span style={{display:'block',position:'relative',width:'100%',height:'100%',transformStyle:'preserve-3d',transition:'transform 340ms ease',transform:visible?'rotateY(180deg)':'rotateY(0deg)'}}>
 <span style={{...faceStyle,background:t.bg.subtle,color:t.text.secondary,fontSize:'clamp(18px,3vw,36px)'}}><span aria-hidden="true">✦</span></span>
 <span style={{...faceStyle,background:done?t.fill.successSubtle:t.bg.elevated,transform:'rotateY(180deg)',fontSize:'clamp(24px,5vw,62px)',borderColor:done?t.border.strong:t.border.default}}><span aria-hidden="true">{c.face}</span>{done&&<span style={{position:'absolute',right:7,bottom:4,fontSize:12,color:t.text.success}}>✓</span>}</span>
 </span></button>;})}
 </div>
 {won&&showWin&&<div role="dialog" aria-modal="true" aria-label="完成游戏" style={{position:'absolute',inset:0,display:'flex',alignItems:'center',justifyContent:'center',background:t.bg.base+'E8',borderRadius:12,padding:16}}>
 <div style={{textAlign:'center',padding:24,border:`1px solid ${t.border.strong}`,borderRadius:16,background:t.bg.elevated}}>
 <div style={{fontSize:42}}>🎉</div><h2 style={{color:t.text.primary}}>记忆力大胜利！</h2><p style={{color:t.text.secondary}}>用 {moves} 步、{clock(seconds)}，找齐 {size/2} 对小伙伴。</p><p style={{color:t.text.secondary}}>配对效率 {Math.round((size/2)/moves*100)}%</p>
 <div style={{display:'flex',flexWrap:'wrap',gap:10,justifyContent:'center'}}><Button label="再玩一局" variant="primary" onClick={()=>reset(size)}/><Button label="看看牌面" onClick={()=>setShowWin(false)}/></div>
 </div></div>}
 </div>
 <p style={{color:t.text.tertiary,marginTop:20,fontSize:14}}>每翻开两张算一步；不同图案会在片刻后盖回。可用 Tab 选择卡片，按 Enter 或空格翻牌。切换难度会开始新一局。</p>
 </div>
      </ImmersiveFrame>
    </Page>;
}
