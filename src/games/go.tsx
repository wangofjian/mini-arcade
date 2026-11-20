import {useEffect,useRef,useState} from 'react';
import {Page,Button} from '../compat/grok-canvas';
import {ImmersiveFrame} from '../mobile/ImmersiveFrame';
import {useImmersivePlay} from '../mobile/immersivePlay';
import {useStageFit} from '../mobile/useStageFit';
import {createGo,place,pass,resign,hintGo,aiGo,score,type GoHint} from '../rules/go';
export default function Go(){
 const [s,setS]=useState(createGo),[humanBoth,setHumanBoth]=useState(false),[h,setH]=useState<GoHint|null>(null),[paused,setPaused]=useState(false);
 const stage=useRef<HTMLDivElement|null>(null);const {active}=useImmersivePlay();const fit=useStageFit(stage,1,1,active,true);
 useEffect(()=>{const hide=()=>{if(document.hidden)setPaused(true);};document.addEventListener('visibilitychange',hide);return()=>document.removeEventListener('visibilitychange',hide);},[]);
 useEffect(()=>{if(humanBoth||s.ended||s.turn!==2||paused)return;const t=setTimeout(()=>{setS(x=>aiGo(x));setH(null);},400);return()=>clearTimeout(t);},[s,humanBoth,paused]);
 const can=!s.ended&&!paused&&(humanBoth||s.turn===1);const tally=score(s);
 const reset=(both=humanBoth)=>{setHumanBoth(both);setS(createGo());setH(null);setPaused(false);};
 const controls=<><Button label="停一手" disabled={!can} onClick={()=>{setS(pass(s));setH(null);}}/><Button label="认输" disabled={!can} onClick={()=>{setS(resign(s));setH(null);}}/><Button label="提示一步" disabled={!can} onClick={()=>setH(hintGo(s))}/><Button label="清除高亮" onClick={()=>setH(null)}/><Button label="重开" onClick={()=>reset()}/><Button label={paused?'继续':'暂停'} onClick={()=>setPaused(!paused)}/></>;
 const px=active?Math.max(180,Math.min(fit.width,fit.height-150,480)):450;
 return <Page title="围棋入门" width="wide" lang="zh-Hans" summary="9路围棋：合法提子、禁自杀、简单劫与简化面积计分。"><ImmersiveFrame layout="banded" stageRef={stage} scrollStage intro={<p>可点「全屏游玩」，触控落子。默认你执黑对AI；可重开切本机双人。只存当前页面，不恢复未完成棋局。</p>} hudActions={controls} hudStats={<span>{s.ended?'终局':s.turn===1?'黑方':'白方'} · 提子 黑{s.captures[1]} / 白{s.captures[2]}</span>}>
 <div style={{maxWidth:600,padding:8,boxSizing:'border-box'}}>
 <div style={{display:'flex',flexWrap:'wrap',gap:6}}>{controls}<Button label={humanBoth?'换人机（重开）':'换双人（重开）'} onClick={()=>reset(!humanBoth)}/></div>
 <p role="status">{paused?'已暂停':s.message} · {s.ended?`胜方：${tally.winner===1?'黑':'白'}；盘面 黑${tally.black} / 白${tally.white}（白含6.5贴目）`:`轮到${s.turn===1?'黑方':'白方'}，第${s.ply+1}手`}</p>
 <svg role="grid" aria-label="九路围棋棋盘" viewBox="0 0 450 450" style={{width:active?px:'min(92vw,450px)',maxWidth:'100%',height:'auto',display:'block',background:'#d3ac70',borderRadius:10,touchAction:'manipulation'}}>
 {Array.from({length:9},(_,i)=><g key={i}><line x1={25+i*50} y1={25} x2={25+i*50} y2={425} stroke="#493324"/><line x1={25} y1={25+i*50} x2={425} y2={25+i*50} stroke="#493324"/></g>)}
 {s.board.map((c,i)=><g key={i} role="button" aria-label={`${Math.floor(i/9)+1}行${i%9+1}列${c?(c===1?'黑子':'白子'):'空点'}`} tabIndex={can&&!c?0:-1} onKeyDown={e=>{if((e.key==='Enter'||e.key===' ')&&can){e.preventDefault();const n=place(s,i);if(n){setS(n);setH(null);}}}} onClick={()=>{if(!can)return;const n=place(s,i);if(n){setS(n);setH(null);}}}>
 <rect x={i%9*50} y={Math.floor(i/9)*50} width={50} height={50} fill="transparent"/>{c?<circle cx={25+i%9*50} cy={25+Math.floor(i/9)*50} r={21} fill={c===1?'#151515':'#f4f4f2'} stroke="#333" style={{pointerEvents:'none'}}/>:null}{h?.i===i?<circle cx={25+i%9*50} cy={25+Math.floor(i/9)*50} r={22} fill="none" stroke="#cf5316" strokeWidth={4} style={{pointerEvents:'none'}}/>:null}</g>)}
 </svg><p aria-live="polite">{h?.reason} {h?'（高亮建议，不自动落子）':''}</p>
 <p>提子：黑 {s.captures[1]} · 白 {s.captures[2]}。白贴 6.5 目。双方连续停一手结束；提子数仅展示，不重复加入面积分。</p>
 <details><summary>规则与局限（建议先读）</summary><p>9路，黑先。无气提走，禁自杀；简单劫：不得立即还原上一手之前的盘面，不实施超级劫。简化面积计分＝盘上活子数量＋仅被一方围住的空点，白加6.5；无自动死活判定、无争议死子移除、无可靠双活裁定，双方应先把需要提掉的死子实际提走再停手，不能视为比赛裁判。AI是入门启发式，优先提子、救气和扩张，不保证死活；AI遇对方停手会跟停，140手后主动停手防止无休止填盘。可切双人自行练习。提示不代走，不宣称最优。</p></details>
 </div></ImmersiveFrame></Page>;
}
