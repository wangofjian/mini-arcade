import {useEffect,useRef,useState} from 'react';
import {Page,Button} from '../compat/grok-canvas';
import {ImmersiveFrame} from '../mobile/ImmersiveFrame';
import {useImmersivePlay} from '../mobile/immersivePlay';
import {useStageFit} from '../mobile/useStageFit';
import {HandheldPad} from '../mobile/HandheldPad';
import {createTennis,tickTennis,hintTennis,landing} from '../rules/tennis';
export default function Tennis(){
 const [s,setS]=useState(createTennis),[paused,setPaused]=useState(false),[hints,setHints]=useState(false),[aim,setAim]=useState(.25);
 const keys=useRef(new Set<string>()),pulse=useRef(false),aimRef=useRef(aim);aimRef.current=aim;
 const stage=useRef<HTMLDivElement|null>(null);const {active}=useImmersivePlay();const fit=useStageFit(stage,960,540,active,true);
 const clear=()=>{keys.current.clear();pulse.current=false;};const reset=()=>{clear();setS(createTennis());setPaused(false);};
 useEffect(()=>{const stop=()=>{clear();setPaused(true);},hide=()=>{if(document.hidden)stop();};const down=(e:KeyboardEvent)=>{if(e.ctrlKey||e.metaKey||e.altKey)return;if(e.code==='KeyP'){e.preventDefault();if(!e.repeat){clear();setPaused(p=>!p);}return;}if(e.code==='KeyR'){e.preventDefault();if(!e.repeat)reset();return;}if(e.target instanceof HTMLInputElement)return;if(['KeyW','KeyA','KeyS','KeyD','ArrowUp','ArrowDown','ArrowLeft','ArrowRight','Space'].includes(e.code))e.preventDefault();keys.current.add(e.code);};const up=(e:KeyboardEvent)=>keys.current.delete(e.code);window.addEventListener('keydown',down);window.addEventListener('keyup',up);window.addEventListener('blur',stop);document.addEventListener('visibilitychange',hide);return()=>{window.removeEventListener('keydown',down);window.removeEventListener('keyup',up);window.removeEventListener('blur',stop);document.removeEventListener('visibilitychange',hide);clear();};},[]);
 useEffect(()=>{if(paused){clear();return;}let raf=0,last=0;const frame=(t:number)=>{const dt=Math.max(0,Math.min(.05,(t-last)/1000));last=t;const k=keys.current;const input={x:Number(k.has('KeyD')||k.has('ArrowRight'))-Number(k.has('KeyA')||k.has('ArrowLeft')),y:Number(k.has('KeyS')||k.has('ArrowDown'))-Number(k.has('KeyW')||k.has('ArrowUp')),hit:k.has('Space')||pulse.current,aim:aimRef.current};pulse.current=false;setS(old=>tickTennis(old,input,dt));raf=requestAnimationFrame(frame);};raf=requestAnimationFrame(frame);return()=>cancelAnimationFrame(raf);},[paused]);
 const tools=<><Button label="重开" onClick={reset}/><Button label={paused?'继续':'暂停'} onClick={()=>{clear();setPaused(!paused);}}/><Button label={hints?'关落点':'落点提示'} onClick={()=>setHints(!hints)}/></>;
 const q=hintTennis(s),land=s.ball?landing(s.ball):null;
 const aimControl=<label>落点 ← <input aria-label="击球落点方向" type="range" min={-1} max={1} step={.05} value={aim} onChange={e=>setAim(+e.target.value)} style={{minHeight:44,width:170,verticalAlign:'middle'}}/> →</label>;
 const help=<> <p role="status">{s.message} 当前回合{s.rally}拍。{hints?q.reason:''}</p>
 <details><summary>规则/控制与简化范围</summary><p>单局标准抢七目标7分且净胜2分，6平继续。第一人发1分，之后每人连续发2分；每分从预设底线交替左右区向对角发球区发球，有两次机会。接发必须先落地，普通回球允许截击；球网有有限高度，第一落点须在对方单打场内，二跳前未回球失分，第一落点界外或未过网失分。发球触网本款按失误而不是重发（不实现擦网let）、不换边、不判脚误/旋转，不是完整大满贯或赛事裁判。</p><p>WASD/方向键移动、空格挥拍/发球，靠近球且球高合适才可打到；手机半透明方向与击球按钮。滑条选左右落点，满幅贴边有出界风险；移动不自动挥拍。提示默认关闭，只画预测落点和站位参考，不保证准确、不自动移动。随着多拍回合球速渐快，避免无休止对拉。P暂停、R重开；后台/失焦松键暂停，离开清理动画/事件。规则和画面dt均夹0.05秒。无联机/PWA、远程素材、付费AI或持久化；刷新重开。未做GUI/真机验收。</p></details>
</>;
 const size=active?{width:fit.width,height:fit.height}:{width:'min(94vw,960px)',height:'auto'};
 return <Page title="小场网球·抢七" width="wide" lang="zh-Hans" summary="俯视人机小场，球高、落点与7分净胜2抢七。"><ImmersiveFrame layout="banded" stageRef={stage} intro={<p>建议横屏并点「全屏游玩」。WASD/方向键移动，空格发球/挥拍；手机左侧方向、右侧击球。下方滑条控制落点方向，不会自动取胜。</p>} pageActions={<>{tools}{aimControl}</>} hudActions={<>{tools}{aimControl}</>} hudMsg={paused?'已暂停':s.message} pad={<HandheldPad overlay={active} disabled={paused||s.phase==='done'} mode="hold" onDir={(dir,pressed)=>{const code=({up:'KeyW',down:'KeyS',left:'KeyA',right:'KeyD'} as Record<string,string>)[dir];if(code){if(pressed)keys.current.add(code);else keys.current.delete(code);}}} actions={[{label:'击',ariaLabel:'发球或击球',onDown:()=>keys.current.add('Space'),onUp:()=>keys.current.delete('Space'),onPress:()=>{pulse.current=true;}}]}/>} help={help} hudStats={<span>你 {s.scores[0]} : {s.scores[1]} AI · {s.server===0?'你':'AI'}发球</span>}>
 <div style={{position:'relative',...size,maxWidth:'100%'}}><svg role="img" aria-label="俯视网球场" width={960} height={540} viewBox="0 0 960 540" style={{display:'block',width:'100%',height:'100%',background:'#1b3d43',borderRadius:12,touchAction:'none'}}>
 <rect x={180} y={60} width={600} height={420} fill="#427e99" stroke="#fff" strokeWidth={3}/><path d="M180 180H780M180 360H780M480 180V360" stroke="#fff" strokeWidth={2} fill="none"/><path d="M165 270H795" stroke="#dae5e9" strokeWidth={7}/><path d="M165 268H795" stroke="#183b48" strokeDasharray="3 4"/>
 <text x={480} y={30} fill="#fff" textAnchor="middle" fontSize={19}>你 {s.scores[0]} : {s.scores[1]} AI · 抢七7分净胜2</text><text x={480} y={520} fill="#fff" textAnchor="middle" fontSize={16}>{paused?'已暂停':s.phase==='done'?s.message:s.server===0?'你发球（每分按顺序轮换）':'AI发球'}</text>
 {hints?<g pointerEvents="none"><circle cx={q.x} cy={q.y} r={23} fill="none" stroke="#ffe063" strokeWidth={3} strokeDasharray="5 5"/>{land?<circle cx={land.x} cy={land.y} r={12} fill="none" stroke="#e5fa6b" strokeWidth={2}/>:null}</g>:null}
 {s.players.map((p,i)=><g key={i}><circle cx={p.x} cy={p.y} r={17} fill={i===0?'#ffb866':'#cb78ed'} stroke="#fff" strokeWidth={2}/><ellipse cx={p.x+23} cy={p.y-5} rx={9} ry={14} fill="none" stroke="#e9eef4" strokeWidth={3}/><text x={p.x} y={p.y+5} textAnchor="middle" fontSize={13}>{i===0?'你':'AI'}</text></g>)}
 {s.ball?<g><ellipse cx={s.ball.x} cy={s.ball.y} rx={7} ry={4} fill="#0006"/><circle cx={s.ball.x} cy={s.ball.y-s.ball.z*.45} r={6} fill="#e9ff65" stroke="#fff"/><text x={s.ball.x+10} y={s.ball.y-s.ball.z*.45} fontSize={12} fill="#fff">{s.ball.bounces?'落地1次':'空中'}</text></g>:null}
 </svg></div>
 </ImmersiveFrame></Page>;
}
