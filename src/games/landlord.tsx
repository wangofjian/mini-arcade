import {useEffect,useRef,useState} from 'react';
import {Page,Button} from '../compat/grok-canvas';
import {ImmersiveFrame} from '../mobile/ImmersiveFrame';
import {deal,bid,play,hint,view,aiTurn,label,rank,type LandlordState} from '../rules/landlord';
const rules='54张，17/17/17+3张底牌。依次叫/不叫，首位叫者当地主；全不叫由起叫位强制地主，重开轮换起叫位。地主先出，地主出完地主胜，任一农民出完农民胜。不含金钱或投注。支持单/对/三/三带一/三带二、顺子、连对、飞机与带牌、四带二、炸弹、王炸。顺子、连对、飞机主体不含2和王。飞机主体必须恰好每点3张连续牌，已选主体须每点恰好三张，多出的同点牌不能当翅膀；单翅须互异点数，双翅须互异对子且不含王，翅膀不得与主体同点；四带二单可带两张同点牌（即一对，也可带大小王），四带二对须两种对子。同型同长度比主体大小，炸弹压非炸弹、王炸最大。两家过牌后上一出牌者重新领出。提示只选牌，不代走；AI/提示只看自己的手牌、公开牌与余牌张数，非高水平牌力。';
export default function Landlord(){
 const seed=useRef(Date.now()>>>0),round=useRef(0);
 const [s,setS]=useState<LandlordState>(()=>deal(seed.current));const [selected,setSelected]=useState<number[]>([]),[reason,setReason]=useState(''),[paused,setPaused]=useState(false),[showRules,setShowRules]=useState(false);
 useEffect(()=>{const hide=()=>{if(document.hidden)setPaused(true);};document.addEventListener('visibilitychange',hide);return()=>document.removeEventListener('visibilitychange',hide);},[]);
 useEffect(()=>{if(s.turn===0||s.phase==='done'||paused)return;const t=setTimeout(()=>setS(old=>aiTurn(old)),550);return()=>clearTimeout(t);},[s,paused]);
 const restart=()=>{round.current++;seed.current=(seed.current+7919)>>>0;setS(deal(seed.current,round.current%3));setSelected([]);setReason('');setPaused(false);};
 const submit=(cards:number[])=>{const n=play(s,cards);setS(n);if(n.turn!==s.turn||n.phase==='done'){setSelected([]);setReason('');}};
 const controls=<><Button label="重开" onClick={restart}/><Button label={paused?'继续':'暂停'} onClick={()=>setPaused(!paused)}/><Button label="说明" onClick={()=>setShowRules(!showRules)}/></>;
 const names=['你','AI甲','AI乙'];const role=(i:number)=>s.landlord<0?'待定':s.landlord===i?'地主':'农民';
 return <Page title="斗地主" width="wide" lang="zh-Hans" summary="无金钱玩法：一人对两AI，提示选牌但不代走。"><ImmersiveFrame layout="banded" scrollStage intro={<p>触控点牌选择，再点出牌。可点「全屏游玩」。不保存未完成牌局，离开重开；没有现金、下注或付费AI。</p>} hudActions={controls} hudStats={<span>{s.phase==='done'?s.winner+'胜':names[s.turn]+'回合'}</span>}>
 <div style={{width:'min(94vw,880px)',padding:10,boxSizing:'border-box',background:'#14372c',color:'#fff',borderRadius:12}}>
 <div style={{display:'flex',flexWrap:'wrap',gap:8}}>{controls}</div>
 <p role="status">{paused?'已暂停，点击继续。':s.message}</p>
 <div style={{display:'flex',justifyContent:'space-between',gap:10}}>{[1,2].map(i=><div key={i}>{names[i]} · {role(i)} · 剩 {s.hands[i].length} 张{s.phase==='done'?<p>{s.hands[i].map(label).join(' ')}</p>:null}</div>)}</div>
 <p>底牌：{s.landlord<0?'叫地主后公开':s.bottom.map(label).join(' ')} · 你是{role(0)}</p>
 <div style={{minHeight:65,padding:8,background:'#ffffff15',borderRadius:8}}>{s.table?<>当前 {names[s.owner]}：{s.table.cards.map(label).join(' ')}（{s.table.kind}）</>:'自由领出'}<br/>轮到：{names[s.turn]}{s.phase==='done'?'（已结束）':''}</div>
 <p>你的手牌（{s.hands[0].length}），已选 {selected.length} 张</p>
 <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(44px,1fr))',gap:5}}>{s.hands[0].map(c=><button key={c} aria-pressed={selected.includes(c)} aria-label={label(c)+'，编号'+c} disabled={paused||s.turn!==0||s.phase!=='play'} onClick={()=>{setSelected(a=>a.includes(c)?a.filter(x=>x!==c):[...a,c]);setReason('');}} style={{minHeight:52,border:selected.includes(c)?'3px solid #ffbb33':'2px solid #fff',borderRadius:7,color:rank(c)>=16?'#9b2233':'#111',background:selected.includes(c)?'#fff1ba':'#fff',fontSize:17,cursor:'pointer'}}>{label(c)}</button>)}</div>
 <div style={{display:'flex',flexWrap:'wrap',gap:8,marginTop:12}}>
 {s.phase==='bid'?<><Button label="叫地主" disabled={s.turn!==0||paused} onClick={()=>setS(bid(s,true))}/><Button label="不叫" disabled={s.turn!==0||paused} onClick={()=>setS(bid(s,false))}/></>:null}
 <Button label="出牌" disabled={s.phase!=='play'||s.turn!==0||paused||!selected.length} onClick={()=>submit(selected)}/><Button label="过牌" disabled={s.phase!=='play'||s.turn!==0||!s.table||paused} onClick={()=>submit([])}/>
 <Button label="提示选牌" disabled={s.phase!=='play'||s.turn!==0||paused} onClick={()=>{const h=hint(view(s,0));setSelected(h.cards);setReason(h.reason);}}/><Button label="清除高亮" onClick={()=>{setSelected([]);setReason('');}}/></div>
 <p aria-live="polite">{reason}</p>{showRules?<p style={{fontSize:14,lineHeight:1.7}}>{rules}</p>:null}
 <details><summary>公开出牌历史</summary>{s.history.slice(-12).map((h,i)=><p key={i}>{names[h.seat]}：{h.cards.length?h.cards.map(label).join(' '):'过'}</p>)}</details>
 </div></ImmersiveFrame></Page>;
}
