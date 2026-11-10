import {
  Page,
  Section,
  Text,
  Button,
  useState,
  useEffect,
  useCallback,
  useRef,
  useGrokTheme,
  type CSSProperties,
  type PointerEvent
} from '../compat/grok-canvas';

type Phase = 'idle' | 'charge' | 'wait' | 'bite' | 'fight' | 'result';

type Fish = {
  name: string;
  score: number;
  zoneLow: number;
  zoneHigh: number;
  jerk: number;
  fill: number;
  drain: number;
};

const FISH: Fish[] = [
  { name: '小鲫鱼', score: 10, zoneLow: 28, zoneHigh: 74, jerk: 7, fill: 0.42, drain: 0.12 },
  { name: '鲤鱼', score: 25, zoneLow: 32, zoneHigh: 68, jerk: 11, fill: 0.32, drain: 0.16 },
  { name: '草鱼', score: 40, zoneLow: 36, zoneHigh: 64, jerk: 15, fill: 0.26, drain: 0.18 },
  { name: '黑鱼', score: 70, zoneLow: 40, zoneHigh: 60, jerk: 20, fill: 0.2, drain: 0.2 },
  { name: '金鲤', score: 150, zoneLow: 44, zoneHigh: 58, jerk: 24, fill: 0.16, drain: 0.22 },
];

function pickFish(power: number): Fish {
  const boost = power >= 45 && power <= 88 ? 1.6 : 1;
  const weights = [40, 28, 16 * boost, 9 * boost, 4 * boost];
  let sum = 0;
  for (const w of weights) sum += w;
  let r = Math.random() * sum;
  for (let i = 0; i < FISH.length; i++) {
    r -= weights[i];
    if (r <= 0) return FISH[i];
  }
  return FISH[0];
}

export default function App() {
  const theme = useGrokTheme();
  const [phase, setPhase] = useState<Phase>('idle');
  const [power, setPower] = useState(0);
  const [tension, setTension] = useState(50);
  const [progress, setProgress] = useState(0);
  const [bobber, setBobber] = useState(0.45);
  const [fish, setFish] = useState<Fish | null>(null);
  const [score, setScore] = useState(0);
  const [best, setBest] = useState(0);
  const [caught, setCaught] = useState(0);
  const [message, setMessage] = useState('按住「抛竿」蓄力，在合适的力度松手把线抛进池塘。');
  const [result, setResult] = useState('');
  const phaseRef = useRef<Phase>('idle');
  const powerRef = useRef(0);
  const tensionRef = useRef(50);
  const progressRef = useRef(0);
  const reelRef = useRef(false);
  const fishRef = useRef<Fish | null>(null);
  const waitAt = useRef(0);
  const biteUntil = useRef(0);
  const escapeMs = useRef(0);
  const dip = useRef(0);

  const setPh = useCallback((p: Phase) => {
    phaseRef.current = p;
    setPhase(p);
  }, []);

  const restart = useCallback(() => {
    phaseRef.current = 'idle';
    powerRef.current = 0;
    tensionRef.current = 50;
    progressRef.current = 0;
    reelRef.current = false;
    fishRef.current = null;
    setPhase('idle');
    setPower(0);
    setTension(50);
    setProgress(0);
    setBobber(0.45);
    setFish(null);
    setScore(0);
    setCaught(0);
    setResult('');
    setMessage('记分已清零。按住「抛竿」重新开始。');
  }, []);

  const readyCast = useCallback(() => {
    phaseRef.current = 'idle';
    powerRef.current = 0;
    reelRef.current = false;
    fishRef.current = null;
    setPhase('idle');
    setPower(0);
    setTension(50);
    setProgress(0);
    setFish(null);
    setMessage('可以再次抛竿。按住蓄力，松手出竿。');
  }, []);

  const miss = useCallback((why: string) => {
    fishRef.current = null;
    setFish(null);
    setResult(why);
    setPh('result');
    setMessage(why + ' 点「再抛一次」继续。');
  }, [setPh]);

  const startCharge = useCallback(() => {
    if (phaseRef.current !== 'idle' && phaseRef.current !== 'result') return;
    powerRef.current = 8;
    setPower(8);
    setResult('');
    setPh('charge');
    setMessage('蓄力中，力度接近中高段时松手更稳。');
  }, [setPh]);

  const releaseCast = useCallback(() => {
    if (phaseRef.current !== 'charge') return;
    const pwr = Math.max(8, powerRef.current);
    const dist = 0.25 + (pwr / 100) * 0.55;
    setBobber(dist);
    setPower(pwr);
    waitAt.current = Date.now() + 1400 + Math.random() * 3200;
    biteUntil.current = 0;
    setPh('wait');
    setMessage('浮漂已落下，等待鱼咬钩。别过早提竿。');
  }, [setPh]);

  const hook = useCallback(() => {
    const now = Date.now();
    if (phaseRef.current === 'wait') {
      miss('提竿太早，鱼还没咬钩。');
      return;
    }
    if (phaseRef.current !== 'bite') return;
    if (now > biteUntil.current) {
      miss('提竿太晚，鱼把饵叼走了。');
      return;
    }
    const f = pickFish(powerRef.current);
    fishRef.current = f;
    setFish(f);
    tensionRef.current = 50;
    progressRef.current = 0;
    escapeMs.current = 0;
    setTension(50);
    setProgress(0);
    setPh('fight');
    setMessage(f.name + '上钩了！按住「收线」保持张力在绿色区间。');
  }, [miss, setPh]);

  useEffect(() => {
    let id = 0;
    const tick = () => {
      const ph = phaseRef.current;
      const now = Date.now();
      if (ph === 'charge') {
        powerRef.current = Math.min(100, powerRef.current + 1.4);
        setPower(Math.round(powerRef.current));
        if (powerRef.current >= 100) {
          // auto peak, wait for release; stay at 100
        }
      } else if (ph === 'wait') {
        if (now >= waitAt.current) {
          const window = 850 + Math.random() * 350;
          biteUntil.current = now + window;
          dip.current = 8;
          setPh('bite');
          setMessage('咬钩了！立刻点「提竿」。');
        }
      } else if (ph === 'bite') {
        if (dip.current > 0) dip.current -= 0.4;
        if (now > biteUntil.current) {
          miss('错过咬钩时机，鱼跑了。');
        }
      } else if (ph === 'fight') {
        const f = fishRef.current;
        if (f) {
          let t = tensionRef.current;
          if (reelRef.current) t += 1.15;
          else t -= 0.7;
          if (Math.random() < 0.08) t += (Math.random() * 2 - 0.4) * f.jerk;
          t = Math.max(0, Math.min(100, t));
          tensionRef.current = t;
          setTension(Math.round(t));
          const inZone = t >= f.zoneLow && t <= f.zoneHigh;
          let p = progressRef.current;
          if (inZone) {
            p += f.fill;
            escapeMs.current = 0;
          } else {
            p = Math.max(0, p - f.drain * 0.25);
            if (t <= 6) escapeMs.current += 16;
            else escapeMs.current = 0;
          }
          progressRef.current = p;
          setProgress(Math.min(100, Math.round(p)));
          if (t >= 100) {
            miss('线张力爆了，断线了。');
          } else if (escapeMs.current > 900) {
            miss('收线太松，鱼挣脱跑了。');
          } else if (p >= 100) {
            progressRef.current = 100;
            setProgress(100);
            const next = score + f.score;
            setScore(next);
            if (next > best) setBest(next);
            setCaught((n: number) => n + 1);
            setResult('收获 ' + f.name + '，+' + f.score + ' 分');
            setPh('result');
            setMessage('收成了 ' + f.name + '，+' + f.score + ' 分。点「再抛一次」继续。');
          }
        }
      }
      id = requestAnimationFrame(tick);
    };
    id = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(id);
  }, [setPh, miss, score, best]);

  const onCastDown = useCallback(
    (e: PointerEvent<HTMLButtonElement>) => {
      e.preventDefault();
      startCharge();
    },
    [startCharge],
  );
  const onCastUp = useCallback(
    (e: PointerEvent<HTMLButtonElement>) => {
      e.preventDefault();
      releaseCast();
    },
    [releaseCast],
  );
  const onReelDown = useCallback((e: PointerEvent<HTMLButtonElement>) => {
    e.preventDefault();
    reelRef.current = true;
  }, []);
  const onReelUp = useCallback((e: PointerEvent<HTMLButtonElement>) => {
    e.preventDefault();
    reelRef.current = false;
  }, []);

  const pondW = 420;
  const pondH = 240;
  const bobX = 70 + bobber * 280;
  const bobY = 70 + (1 - bobber) * 40 + (phase === 'bite' ? 10 + dip.current : 0);
  const f = fish;
  const zoneLeft = f ? f.zoneLow : 35;
  const zoneW = f ? f.zoneHigh - f.zoneLow : 30;

  const barBg: CSSProperties = {
    position: 'relative',
    height: 16,
    borderRadius: 8,
    background: theme.bg.subtle,
    border: '1px solid ' + theme.border.default,
    overflow: 'hidden',
  };

  return (
    <Page
      title="钓鱼"
      summary="抛竿、等咬钩、抓时机提竿，再通过张力收线把不同鱼类钓上来计分。完整循环可反复进行。"
      width="wide"
      lang="zh-Hans"
    >
      <Section>
        <Text>
          按住抛竿蓄力后松手，浮漂落入池中。看到咬钩提示时立刻提竿，然后按住收线，把张力保持在绿色区间，把进度条拉满即可收鱼。不同鱼的分数和挣扎程度不同。
        </Text>
      </Section>
      <Section>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, alignItems: 'center', fontFamily: theme.font.family }}>
          <Button label="重新开始" onClick={restart} />
          <span>总分 {score}</span>
          <span style={{ color: theme.text.secondary }}>最高 {best}</span>
          <span>收获 {caught} 条</span>
        </div>
        <div aria-live="polite" style={{ marginTop: 8, color: theme.text.primary, fontFamily: theme.font.family }}>
          {message}
        </div>
      </Section>
      <Section>
        <svg
          viewBox={'0 0 ' + pondW + ' ' + pondH}
          width="100%"
          role="img"
          aria-label="池塘钓鱼"
          style={{
            display: 'block',
            maxWidth: 520,
            margin: '0 auto',
            background: theme.dataviz.blueTint || theme.bg.subtle,
            borderRadius: 12,
            border: '1px solid ' + theme.border.default,
          }}
        >
          <rect x={0} y={0} width={pondW} height={pondH} fill={theme.dataviz.blueTint || theme.bg.subtle} rx={12} />
          <ellipse cx={230} cy={150} rx={190} ry={70} fill={theme.dataviz.categorical[4] || theme.fill.accentSubtle} opacity={0.35} />
          <line x1={18} y1={200} x2={bobX} y2={bobY} stroke={theme.text.secondary} strokeWidth={1.5} />
          <polygon points="18,200 40,120 28,120" fill={theme.dataviz.categorical[2]} />
          <line x1={34} y1={120} x2={18} y2={200} stroke={theme.border.strong} strokeWidth={4} strokeLinecap="round" />
          <circle cx={bobX} cy={bobY} r={phase === 'bite' ? 9 : 7} fill={phase === 'bite' ? theme.text.danger : theme.text.dangerDeep || theme.fill.accent} stroke={theme.border.default} />
          {phase === 'fight' && f ? (
            <text x={bobX} y={bobY - 16} textAnchor="middle" fontSize={12} fill={theme.text.primary} fontFamily={theme.font.family}>
              {f.name}
            </text>
          ) : null}
        </svg>
      </Section>
      <Section>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10, fontFamily: theme.font.family, color: theme.text.primary }}>
          <div>
            <div style={{ marginBottom: 4, fontSize: 13, color: theme.text.secondary }}>蓄力 {power}</div>
            <div style={barBg}>
              <div style={{ width: power + '%', height: '100%', background: theme.fill.accent }} />
            </div>
          </div>
          {phase === 'fight' || (phase === 'result' && fish) ? (
            <>
              <div>
                <div style={{ marginBottom: 4, fontSize: 13, color: theme.text.secondary }}>张力 {tension}</div>
                <div style={barBg}>
                  <div
                    style={{
                      position: 'absolute',
                      left: zoneLeft + '%',
                      width: zoneW + '%',
                      height: '100%',
                      background: theme.fill.successSubtle,
                    }}
                  />
                  <div
                    style={{
                      position: 'absolute',
                      left: 'calc(' + tension + '% - 2px)',
                      width: 4,
                      height: '100%',
                      background: tension >= 90 ? theme.text.danger : theme.text.primary,
                    }}
                  />
                </div>
              </div>
              <div>
                <div style={{ marginBottom: 4, fontSize: 13, color: theme.text.secondary }}>收线进度 {progress}%</div>
                <div style={barBg}>
                  <div style={{ width: progress + '%', height: '100%', background: theme.fill.primary }} />
                </div>
              </div>
            </>
          ) : null}
        </div>
      </Section>
      <Section>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }}>
          {phase === 'idle' || phase === 'charge' ? (
            <button
              type="button"
              onPointerDown={onCastDown}
              onPointerUp={onCastUp}
              onPointerCancel={onCastUp}
              style={{
                minHeight: 48,
                padding: '8px 18px',
                borderRadius: 10,
                border: '1px solid ' + theme.border.default,
                background: theme.fill.primary,
                color: theme.text.onPrimary,
                fontFamily: theme.font.family,
                fontSize: 16,
                touchAction: 'none',
                cursor: 'pointer',
              }}
            >
              {phase === 'charge' ? '松开抛出' : '按住抛竿'}
            </button>
          ) : null}
          {phase === 'wait' || phase === 'bite' ? (
            <Button label="提竿" variant="primary" onClick={hook} />
          ) : null}
          {phase === 'fight' ? (
            <button
              type="button"
              onPointerDown={onReelDown}
              onPointerUp={onReelUp}
              onPointerCancel={onReelUp}
              onPointerLeave={onReelUp}
              style={{
                minHeight: 48,
                padding: '8px 18px',
                borderRadius: 10,
                border: '1px solid ' + theme.border.default,
                background: theme.fill.primary,
                color: theme.text.onPrimary,
                fontFamily: theme.font.family,
                fontSize: 16,
                touchAction: 'none',
                cursor: 'pointer',
              }}
            >
              按住收线
            </button>
          ) : null}
          {phase === 'result' ? <Button label="再抛一次" variant="primary" onClick={readyCast} /> : null}
        </div>
        {result ? (
          <div style={{ marginTop: 8, color: result.indexOf('收获') === 0 ? theme.text.success : theme.text.danger, fontFamily: theme.font.family }}>
            {result}
          </div>
        ) : null}
      </Section>
      <Section heading="规则说明">
        <Text>
          循环为：蓄力抛竿 → 等待咬钩 → 在短暂窗口内提竿 → 收线对抗 → 成功或失败后可再抛。提竿过早、错过窗口、张力顶满断线，或张力过低太久，都会让鱼逃走且不得分。收线时只有张力落在绿色区间才会增加进度。鱼类包括小鲫鱼、鲤鱼、草鱼、黑鱼和较稀有的金鲤，分数分别为 10、25、40、70、150；蓄力在中高段时更容易遇到高分鱼。这是反应与节奏小游戏，不含真实地点或付费内容。
        </Text>
      </Section>
    </Page>
  );
}
