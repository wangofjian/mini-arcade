import {useEffect,useRef,useState} from 'react';
import {Page,Button} from '../compat/grok-canvas';
import {ImmersiveFrame} from '../mobile/ImmersiveFrame';
import {createMahjong,publicView,legalActions,hintMahjong,nextActor,act,advanceMahjong,tileLabel,type Action} from '../rules/mahjong';
const names=['你（东）','AI南','AI西','AI北'];
const verbs:Record<Action['kind'],string>={draw:'摸牌',discard:'弃牌',pass:'过',chi:'吃',pon:'碰',kong:'明杠',concealed:'暗杠',win:'和牌（胡）'};
const describe=(a:Action)=>verbs[a.kind]+(a.tiles.length?' '+a.tiles.map(tileLabel).join(' '):'');
export default function Mahjong(){
 const seed=useRef(Date.now()>>>0);const [s,setS]=useState(()=>createMahjong(seed.current)),[paused,setPaused]=useState(false),[advice,setAdvice]=useState<ReturnType<typeof hintMahjong>|null>(null);
 const v=publicView(s,0),actions=legalActions(v),actor=nextActor(s);
 useEffect(()=>{const pause=()=>setPaused(true),hide=()=>{if(document.hidden)pause();};document.addEventListener('visibilitychange',hide);window.addEventListener('blur',pause);return()=>{document.removeEventListener('visibilitychange',hide);window.removeEventListener('blur',pause);};},[]);
 useEffect(()=>{
 if(paused||actor===null)return;
 // 人类有任何吃碰杠胡选项时始终等候；只有无可抢牌的“过”才自动处理。
 const forced=actor===0&&s.phase==='respond'&&actions.length===1&&actions[0].kind==='pass';
 if(actor===0&&s.phase!=='draw'&&!forced)return;
 const t=setTimeout(()=>{setS(old=>advanceMahjong(old));setAdvice(null);},actor===0?260:550);return()=>clearTimeout(t);
 },[s,paused,actor]);
 const send=(a:Action)=>{if(paused)return;setS(old=>act(old,0,a));setAdvice(null);};
 const restart=()=>{seed.current=(seed.current+7919)>>>0;setS(createMahjong(seed.current));setAdvice(null);setPaused(false);};
 const tools=<><Button label="重开" onClick={restart}/><Button label={paused?'继续':'暂停'} onClick={()=>setPaused(!paused)}/><Button label="提示" disabled={paused||!actions.length||s.phase==='draw'} onClick={()=>setAdvice(hintMahjong(v))}/><Button label="清除高亮" onClick={()=>setAdvice(null)}/></>;
 const a=advice?.action;
 return <Page title="四人麻将·基础版" width="wide" lang="zh-Hans" summary="136张、一人对三AI；无现金、筹码或下注，只按和牌/流局记本局结果。"><ImmersiveFrame layout="banded" scrollStage intro={<p>点「全屏游玩」可触控打牌。先摸后打；点击手牌即弃牌，提示只高亮，不代打。刷新或离开重新开局，不存暗牌。</p>} hudActions={tools} hudStats={<span>余墙 {v.remaining} · {s.phase==='done'?'已结束':names[s.turn]+'回合'}</span>}>
 <div style={{width:'min(94vw,920px)',boxSizing:'border-box',padding:12,borderRadius:12,background:'#17473a',color:'#f7fff9'}}>
 <div style={{display:'flex',flexWrap:'wrap',gap:8}}>{tools}</div>
 <p role="status">{paused?'已暂停；点继续恢复AI计时。':s.message} · 步骤 {s.steps} · 牌墙 {v.remaining} 张</p>
 {s.phase==='done'?<p>{s.winner===null?'流局，无人和牌。':`${names[s.winner]}${s.result==='self'?'自摸':'点和'}获胜；本局无番数或金钱结算。`}</p>:null}
 <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(200px,1fr))',gap:8}}>{v.melds.map((m,i)=><section key={i} style={{padding:8,background:'#ffffff12',borderRadius:8}}><strong>{names[i]} · 暗手{v.sizes[i]}张</strong><p style={{margin:'6px 0'}}>副露：{m.length?m.map((x,j)=><span key={j} style={{display:'inline-block',padding:4,margin:2,background:'#0003'}}>{verbs[x.kind]} {x.kind==='concealed'&&i!==0?'■ ■ ■ ■':x.tiles.map(tileLabel).join(' ')}</span>):'无'}</p><p style={{margin:0,overflowWrap:'anywhere'}}>弃牌：{v.discards[i].map(tileLabel).join(' · ')||'无'}</p></section>)}</div>
 <p style={{minHeight:28,fontWeight:700}}>{s.phase==='done'?'本局末张：':'待响应：'}{v.pending?`${names[v.pending.from]} 打出 ${tileLabel(v.pending.tile)}（尚未进入弃牌区）`:'无'}{s.phase==='respond'&&actions.some(x=>x.kind!=='pass')?'；请选吃组合、碰、杠、胡或过，AI不会跳过你的决定。':''}</p>
 <p>你的手牌 · {v.hand.length} 张 {v.drawn!==null?`· 本次摸到：${tileLabel(v.drawn)}`:''}</p>
 <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(46px,1fr))',gap:6}}>{v.hand.map(id=>{
 const highlighted=a?.kind==='discard'&&a.tiles.includes(id);const can=actions.some(x=>x.kind==='discard'&&x.tiles[0]===id);
 return <button key={id} aria-label={`${tileLabel(id)}，实体牌${id}${id===v.drawn?'，刚摸到':''}`} aria-pressed={highlighted} disabled={paused||!can} onClick={()=>send({kind:'discard',tiles:[id]})} style={{minWidth:44,minHeight:58,width:'100%',padding:'4px 2px',boxSizing:'border-box',whiteSpace:'nowrap',borderRadius:6,border:highlighted?'4px solid #ffb52f':id===v.drawn?'3px solid #49baff':'2px solid #ddd',background:highlighted?'#fff2b0':'#fff',color:'#16312a',fontSize:19,fontWeight:700,opacity:paused?0.65:1,cursor:can?'pointer':'default'}}>{tileLabel(id)}</button>;
 })}</div>
 <div style={{display:'flex',flexWrap:'wrap',gap:8,marginTop:14}}>{actions.filter(x=>x.kind!=='discard'&&x.kind!=='draw').map((x,i)=><button key={i} disabled={paused} onClick={()=>send(x)} style={{minHeight:48,padding:'8px 14px',fontSize:16,borderRadius:7,border:a?.kind===x.kind&&a.tiles.join(',')===x.tiles.join(',')?'3px solid #ffb52f':'2px solid #ddd',background:'#fff',color:'#173c31'}}>{describe(x)}</button>)}</div>
 <p aria-live="polite">{advice?`提示：${advice.action?describe(advice.action)+'。':''}${advice.reason}（只高亮，不自动代走）`:''}</p>
 <details><summary style={{padding:'10px 0'}}>完整规则、优先级与提示局限</summary><p>万筒条各1—9、东南西北中发白，各4张，共136张无花。每人13张，你为东家先摸后打。四面子一将：面子为顺子/刻子，杠算一面子；不支持七对、十三幺等特殊和型。不实现补杠，因此没有抢补杠；支持明杠、暗杠，均从牌墙尾补一张，补牌时墙空立即流局。普通摸牌从墙头取，墙耗尽流局；不留王牌。</p><p>只能吃上家，页面列出每种可吃组合。抢牌优先级：胡 &gt; 明杠/碰 &gt; 吃；同级从放牌者下家开始按东南西北顺位，最近一家优先，仅一家胡，不做一炮多响。所有响应收齐才裁决；人类有可选动作时必须等你决定，完全不能抢牌时自动过。吃碰后直接弃牌不摸，杠后补牌再弃；过牌不附加过水限制。暗杠只显示背面，不公开AI牌值。</p><p>AI和提示仅用本手牌、公开弃牌副露、牌墙余量与当前轮次，不读取牌墙顺序或其他暗牌。提示优先胡/杠/碰/吃，否则建议弃孤张、保留搭子，仅入门启发式非最优。AI并非专业牌手。本款不是国标、四川麻将或日麻，无地域番种、现金、筹码、下注、联机或PWA。只保留当前页面内存，刷新/离开重开。</p></details>
 </div></ImmersiveFrame></Page>;
}
