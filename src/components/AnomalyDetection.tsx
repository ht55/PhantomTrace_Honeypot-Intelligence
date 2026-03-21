"use client";
import { useEffect, useRef, useState, useMemo } from "react";
import { AnomalySession, AnomalyRequest, AnomalyComparison, ATTACK_COLORS } from "@/lib/types";
import { MetricCard, SectionHeader, Loading, T } from "@/components/ui/shared";

const FK: [string,string] = [T.cyan,  "#003d36"];
const MK: [string,string] = [T.amber, "#3d2500"];

interface Tip { x:number; y:number; lines:string[]; on:boolean; }
const NO_TIP: Tip = { x:0,y:0,lines:[],on:false };

function Tooltip({ tip,W,H }: { tip:Tip; W:number; H:number }) {
  if(!tip.on) return null;
  return(
    <div style={{
      position:"absolute", left:`${(tip.x/W)*100}%`, top:`${(tip.y/H)*100}%`,
      transform:"translate(-50%,-115%)", pointerEvents:"none",
      background:"rgba(6,9,20,0.97)", border:`1px solid rgba(0,255,224,0.2)`,
      borderRadius:8, padding:"8px 12px", fontFamily:T.mono, fontSize:11, color:T.text,
      whiteSpace:"nowrap", zIndex:10,
      boxShadow:"0 8px 32px rgba(0,0,0,0.6),0 0 16px rgba(0,255,224,0.06)",
    }}>
      {tip.lines.map((l,i)=>(
        <div key={i} style={{color:i===0?T.amber:i===2?T.cyan:T.textDim,lineHeight:1.6}}>{l}</div>
      ))}
    </div>
  );
}

// ── ChartCard with gradient left border ───────────────────────────────────────
function ChartCard({ children, accent=T.rose, style={} }: { children:React.ReactNode; accent?:string; style?:React.CSSProperties }) {
  const barGrad = accent===T.rose
    ? `linear-gradient(to bottom,${T.rose},${T.amber})`
    : accent===T.cyan
    ? `linear-gradient(to bottom,${T.cyan},${T.purple})`
    : accent===T.amber
    ? `linear-gradient(to bottom,${T.amber},${T.purple})`
    : `linear-gradient(to bottom,${accent},${T.purple})`;

  return(
    <div style={{
      background:"rgba(10,16,32,0.68)", backdropFilter:"blur(20px)", WebkitBackdropFilter:"blur(20px)", border:"1px solid rgba(255,255,255,0.11)",
      borderRadius:14, padding:"1.5rem 1.5rem 1.5rem 1.75rem",
      boxShadow:T.shadow2, position:"relative", overflow:"hidden",
      transition:"box-shadow 0.3s ease,border-color 0.3s ease",
      ...style,
    }}
    onMouseEnter={e=>{const el=e.currentTarget as HTMLElement;el.style.boxShadow=T.shadow3;el.style.borderColor=`${accent}28`;}}
    onMouseLeave={e=>{const el=e.currentTarget as HTMLElement;el.style.boxShadow=T.shadow2;el.style.borderColor=T.b1;}}>
      <div style={{
        position:"absolute",left:0,top:0,bottom:0,width:3,
        background:barGrad, boxShadow:`2px 0 12px ${accent}44`,
        borderRadius:"14px 0 0 14px", pointerEvents:"none",
      }}/>
      {children}
    </div>
  );
}

function CT({ children }: { children:React.ReactNode }) {
  return(
    <div style={{fontFamily:T.mono,fontSize:11,fontWeight:700,color:T.muted,
      letterSpacing:"0.09em",textTransform:"uppercase" as const,marginBottom:"1rem"}}>
      {children}
    </div>
  );
}

// ── Score Histogram ───────────────────────────────────────────────────────────
function ScoreHistogram({ faker,markov }: { faker:AnomalySession[]; markov:AnomalySession[] }) {
  const BINS=15;
  const{fB,mB,maxBin,minS,maxS}=useMemo(()=>{
    const sf=faker.map(s=>s.anomaly_score), sm=markov.map(s=>s.anomaly_score);
    const all=[...sf,...sm];
    if(!all.length) return{fB:[],mB:[],maxBin:1,minS:0,maxS:1};
    const mn=Math.min(...all), mx=Math.max(...all), rng=mx-mn||0.001;
    const toBin=(v:number)=>Math.min(BINS-1,Math.floor(((v-mn)/rng)*BINS));
    const fB=new Array(BINS).fill(0), mB=new Array(BINS).fill(0);
    sf.forEach(v=>fB[toBin(v)]++); sm.forEach(v=>mB[toBin(v)]++);
    return{fB,mB,maxBin:Math.max(...fB,...mB,1),minS:mn,maxS:mx};
  },[faker,markov]);

  const W=520,H=260,pL=36,pR=20,pT=16,pB=40;
  const cW=W-pL-pR, cH=H-pT-pB, bW=cW/BINS;
  const linePath=(bins:number[])=>bins.map((v,i)=>`${i===0?"M":"L"}${pL+i*bW+bW/2},${pT+cH-(v/maxBin)*cH}`).join(" ");
  const areaPath=(bins:number[])=>`${linePath(bins)} L${pL+(BINS-1)*bW+bW/2},${pT+cH} L${pL+bW/2},${pT+cH} Z`;

  return(
    <svg viewBox={`0 0 ${W} ${H}`} width="100%" style={{display:"block",overflow:"visible"}}>
      <defs>
        <linearGradient id="sh-f" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={FK[0]} stopOpacity="0.65"/>
          <stop offset="100%" stopColor={FK[0]} stopOpacity="0.02"/>
        </linearGradient>
        <linearGradient id="sh-m" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={MK[0]} stopOpacity="0.55"/>
          <stop offset="100%" stopColor={MK[0]} stopOpacity="0.02"/>
        </linearGradient>
      </defs>

      

      {[0.25,0.5,0.75,1].map(t=>(
        <g key={t}>
          <line x1={pL} y1={pT+cH-t*cH} x2={W-pR} y2={pT+cH-t*cH}
            stroke="rgba(255,255,255,0.05)" strokeWidth={0.5} strokeDasharray="3 3"/>
          <text x={pL-5} y={pT+cH-t*cH+4} fontFamily={T.mono} fontSize={11} fill={T.muted} textAnchor="end">
            {Math.round(t*maxBin)}
          </text>
        </g>
      ))}

      {fB.length>0&&<>
        <path d={areaPath(fB)} fill="url(#sh-f)"/>
        <path d={linePath(fB)} fill="none" stroke={FK[0]} strokeWidth={2.2} strokeLinejoin="round"/>
        <path d={areaPath(mB)} fill="url(#sh-m)"/>
        <path d={linePath(mB)} fill="none" stroke={MK[0]} strokeWidth={2.2} strokeLinejoin="round"/>
      </>}

      <line x1={pL} y1={pT+cH} x2={W-pR} y2={pT+cH} stroke="rgba(255,255,255,0.08)" strokeWidth={0.5}/>
      <text x={pL} y={pT+cH+18} fontFamily={T.mono} fontSize={11} fill={T.muted}>{minS.toFixed(3)}</text>
      <text x={W-pR} y={pT+cH+18} textAnchor="end" fontFamily={T.mono} fontSize={11} fill={T.muted}>{maxS.toFixed(3)}</text>

      <rect x={W-122} y={H-16} width={9} height={9} rx={2} fill={FK[0]}/>
      <text x={W-109} y={H-8} fontFamily={T.mono} fontSize={11} fill={FK[0]}>Faker</text>
      <rect x={W-64} y={H-16} width={9} height={9} rx={2} fill={MK[0]}/>
      <text x={W-51} y={H-8} fontFamily={T.mono} fontSize={11} fill={MK[0]}>Markov</text>
    </svg>
  );
}

// ── Anomaly Rate Bar ──────────────────────────────────────────────────────────
function AnomalyRateBar({ faker,markov }: { faker:AnomalySession[]; markov:AnomalySession[] }) {
  const ref=useRef<SVGSVGElement>(null);
  const[hov,setHov]=useState("");

  const sites=useMemo(()=>Array.from(new Set([...faker,...markov].map(s=>s.site))),[faker,markov]);
  const W=520,H=260,pL=36,pR=20,pT=16,pB=44;
  const cH=H-pT-pB;
  const maxRate=Math.max(...sites.flatMap(site=>{
    const fS=faker.filter(s=>s.site===site), mS=markov.filter(s=>s.site===site);
    return[fS.length?fS.filter(s=>s.is_anomaly).length/fS.length:0,
           mS.length?mS.filter(s=>s.is_anomaly).length/mS.length:0];
  }),0.01)*1.2;

  const slotW=(W-pL-pR)/sites.length;
  const bW=Math.min(26,slotW*0.34);

  return(
    <svg ref={ref} viewBox={`0 0 ${W} ${H}`} width="100%" style={{display:"block",overflow:"visible"}}>
      <defs>
        <linearGradient id="rate-f" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={FK[0]}/><stop offset="100%" stopColor={FK[1]}/>
        </linearGradient>
        <linearGradient id="rate-m" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={MK[0]}/><stop offset="100%" stopColor={MK[1]}/>
        </linearGradient>
        <filter id="rate-glow">
          <feGaussianBlur stdDeviation="3" result="b"/>
          <feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge>
        </filter>
      </defs>

      

      {[0.25,0.5,0.75,1].map(t=>(
        <g key={t}>
          <line x1={pL} y1={pT+cH-t*cH} x2={W-pR} y2={pT+cH-t*cH}
            stroke="rgba(255,255,255,0.05)" strokeWidth={0.5} strokeDasharray="3 3"/>
          <text x={pL-5} y={pT+cH-t*cH+4} fontFamily={T.mono} fontSize={11} fill={T.muted} textAnchor="end">
            {(t*maxRate*100).toFixed(0)}%
          </text>
        </g>
      ))}
      <line x1={pL} y1={pT+cH} x2={W-pR} y2={pT+cH} stroke="rgba(255,255,255,0.08)" strokeWidth={0.5}/>

      {sites.map((site,i)=>{
        const cx=pL+i*slotW+slotW/2;
        const fS=faker.filter(s=>s.site===site), mS=markov.filter(s=>s.site===site);
        const fR=fS.length?fS.filter(s=>s.is_anomaly).length/fS.length:0;
        const mR=mS.length?mS.filter(s=>s.is_anomaly).length/mS.length:0;
        const fH=(fR/maxRate)*cH, mH=(mR/maxRate)*cH;
        const fX=cx-bW*2-2, mX=cx+2;
        return(<g key={site}>
          <g filter={hov===`f${i}`?"url(#rate-glow)":undefined} style={{cursor:"pointer"}}
            onMouseEnter={()=>setHov(`f${i}`)} onMouseLeave={()=>setHov("")}>
            <rect x={fX} y={pT+cH-fH} width={bW} height={fH} rx={2}
              fill="url(#rate-f)" opacity={hov===`f${i}`?1:0.78}/>
            {fH>4&&<rect x={fX+1} y={pT+cH-fH} width={bW-2} height={2} rx={1} fill={FK[0]} opacity={0.65}/>}
            <text x={fX+bW/2} y={pT+cH-fH-6} textAnchor="middle"
              fontFamily={T.mono} fontSize={11} fill={FK[0]}>{(fR*100).toFixed(0)}%</text>
          </g>
          <g filter={hov===`m${i}`?"url(#rate-glow)":undefined} style={{cursor:"pointer"}}
            onMouseEnter={()=>setHov(`m${i}`)} onMouseLeave={()=>setHov("")}>
            <rect x={mX} y={pT+cH-mH} width={bW} height={mH} rx={2}
              fill="url(#rate-m)" opacity={hov===`m${i}`?1:0.78}/>
            {mH>4&&<rect x={mX+1} y={pT+cH-mH} width={bW-2} height={2} rx={1} fill={MK[0]} opacity={0.65}/>}
            <text x={mX+bW/2} y={pT+cH-mH-6} textAnchor="middle"
              fontFamily={T.mono} fontSize={11} fill={MK[0]}>{(mR*100).toFixed(0)}%</text>
          </g>
          <text x={cx} y={pT+cH+18} textAnchor="middle" fontFamily={T.mono} fontSize={11} fill={T.muted}>
            {site.replace("site_","")}
          </text>
        </g>);
      })}

      <rect x={W-122} y={H-16} width={9} height={9} rx={2} fill={FK[0]}/>
      <text x={W-109} y={H-8} fontFamily={T.mono} fontSize={11} fill={FK[0]}>Faker</text>
      <rect x={W-64} y={H-16} width={9} height={9} rx={2} fill={MK[0]}/>
      <text x={W-51} y={H-8} fontFamily={T.mono} fontSize={11} fill={MK[0]}>Markov</text>
    </svg>
  );
}

// ── Score Scatter ─────────────────────────────────────────────────────────────
function ScoreScatter({ reqs }: { reqs:AnomalyRequest[] }) {
  const ref=useRef<SVGSVGElement>(null);
  const[tip,setTip]=useState<Tip>(NO_TIP);

  const{statuses,minS,rangeS}=useMemo(()=>{
    if(!reqs.length) return{statuses:[],minS:0,rangeS:1};
    const scores=reqs.map(r=>r.anomaly_score);
    const mn=Math.min(...scores), mx=Math.max(...scores);
    const statuses=Array.from(new Set(reqs.map(r=>r.status))).sort((a,b)=>a-b);
    return{statuses,minS:mn,rangeS:mx-mn||0.001};
  },[reqs]);

  const W=1100,H=240,pL=52,pR=20,pT=12,pB=40;
  const cW=W-pL-pR, cH=H-pT-pB;

  return(
    <div style={{position:"relative"}}>
      <svg ref={ref} viewBox={`0 0 ${W} ${H}`} width="100%" style={{display:"block",overflow:"visible"}}>
        <defs>
          <filter id="dot-glow">
            <feGaussianBlur stdDeviation="2.5" result="b"/>
            <feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge>
          </filter>
          <radialGradient id="dot-f" cx="35%" cy="30%" r="70%">
            <stop offset="0%" stopColor="#7ec8f8"/><stop offset="100%" stopColor={FK[0]}/>
          </radialGradient>
          <radialGradient id="dot-m" cx="35%" cy="30%" r="70%">
            <stop offset="0%" stopColor="#ffe08a"/><stop offset="100%" stopColor={MK[0]}/>
          </radialGradient>
        </defs>

        {statuses.map((s,i)=>{
          const y=pT+(i/(statuses.length-1||1))*cH;
          return(<g key={s}>
            <line x1={pL} y1={y} x2={W-pR} y2={y} stroke="rgba(255,255,255,0.04)" strokeWidth={0.5} strokeDasharray="2 4"/>
            <text x={pL-6} y={y+4} fontFamily={T.mono} fontSize={11} fill={T.muted} textAnchor="end">{s}</text>
          </g>);
        })}
        <line x1={pL} y1={pT} x2={pL} y2={pT+cH} stroke="rgba(255,255,255,0.08)" strokeWidth={0.5}/>

        {reqs.map((r,i)=>{
          const x=pL+((r.anomaly_score-minS)/rangeS)*cW;
          const si=statuses.indexOf(r.status);
          const y=pT+(si/(statuses.length-1||1))*cH;
          return(<circle key={i} cx={x} cy={y} r={4.5}
            fill={r.generator==="faker"?"url(#dot-f)":"url(#dot-m)"}
            opacity={0.78} filter="url(#dot-glow)" style={{cursor:"pointer"}}
            onMouseEnter={e=>{
              const rc=ref.current!.getBoundingClientRect();
              setTip({x:((e.clientX-rc.left)/rc.width)*W,y:((e.clientY-rc.top)/rc.height)*H-8,on:true,
                lines:[r.attack_type.replace(/_/g," "),r.generator,`score ${r.anomaly_score.toFixed(4)}`]});
            }}
            onMouseLeave={()=>setTip(NO_TIP)}/>);
        })}

        <rect x={W-122} y={H-16} width={9} height={9} rx={4} fill={FK[0]}/>
        <text x={W-109} y={H-8} fontFamily={T.mono} fontSize={11} fill={FK[0]}>Faker</text>
        <rect x={W-64} y={H-16} width={9} height={9} rx={4} fill={MK[0]}/>
        <text x={W-51} y={H-8} fontFamily={T.mono} fontSize={11} fill={MK[0]}>Markov</text>
      </svg>
      <Tooltip tip={tip} W={W} H={H}/>
    </div>
  );
}

// ── Comparison Bar ────────────────────────────────────────────────────────────
function ComparisonBar({ comparison }: { comparison:AnomalyComparison }) {
  const sl=comparison.session_level;
  const fRate=sl.faker.anomaly_rate, mRate=sl.markov.anomaly_rate;
  const maxR=Math.max(fRate,mRate)*1.3||0.2;
  const W=520,H=220,pL=20,pR=64,pT=16,pB=44;
  const cH=H-pT-pB, cx=W/2, bW=44, gap=28;
  const bars=[
    {rate:fRate,top:FK[0],bot:FK[1],label:"Faker",  x:cx-bW/2-gap/2-bW/2},
    {rate:mRate,top:MK[0],bot:MK[1],label:"Markov", x:cx+gap/2+bW/2-bW/2},
  ];

  return(
    <svg viewBox={`0 0 ${W} ${H}`} width="100%" style={{display:"block",overflow:"visible"}}>
      <defs>
        {bars.map((b,i)=>(
          <linearGradient key={i} id={`cmp-${i}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={b.top}/><stop offset="100%" stopColor={b.bot}/>
          </linearGradient>
        ))}
        <filter id="cmp-glow">
          <feGaussianBlur stdDeviation="4" result="b"/>
          <feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge>
        </filter>
      </defs>

      

      {[0.25,0.5,0.75,1].map(t=>(
        <g key={t}>
          <line x1={pL} y1={pT+cH-t*cH} x2={W-pR} y2={pT+cH-t*cH}
            stroke="rgba(255,255,255,0.05)" strokeWidth={0.5} strokeDasharray="3 3"/>
          <text x={W-pR+6} y={pT+cH-t*cH+4} fontFamily={T.mono} fontSize={11} fill={T.muted}>
            {(t*maxR*100).toFixed(0)}%
          </text>
        </g>
      ))}
      <line x1={pL} y1={pT+cH} x2={W-pR} y2={pT+cH} stroke="rgba(255,255,255,0.08)" strokeWidth={0.5}/>

      {bars.map((b,i)=>{
        const h=(b.rate/maxR)*cH;
        return(<g key={i} filter="url(#cmp-glow)">
          <rect x={b.x} y={pT+cH-h} width={bW} height={h} rx={2}
            fill={`url(#cmp-${i})`} opacity={0.8}/>
          {h>4&&<rect x={b.x+1} y={pT+cH-h} width={bW-2} height={2} rx={1} fill={b.top} opacity={0.65}/>}
          <text x={b.x+bW/2} y={pT+cH-h-8} textAnchor="middle"
            fontFamily={T.mono} fontSize={11} fontWeight="700" fill={b.top}>
            {(b.rate*100).toFixed(1)}%
          </text>
          <text x={b.x+bW/2} y={pT+cH+18} textAnchor="middle"
            fontFamily={T.mono} fontSize={11} fill={T.muted}>{b.label}</text>
        </g>);
      })}
    </svg>
  );
}

// ── Main ──────────────────────────────────────────────────────────────────────
export function AnomalyDetection() {
  const[fakerSess,setFakerSess]   = useState<AnomalySession[]>([]);
  const[markovSess,setMarkovSess] = useState<AnomalySession[]>([]);
  const[fakerReq,setFakerReq]     = useState<AnomalyRequest[]>([]);
  const[markovReq,setMarkovReq]   = useState<AnomalyRequest[]>([]);
  const[comparison,setComparison] = useState<AnomalyComparison|null>(null);
  const[loaded,setLoaded]         = useState(false);
  const[isVisible,setVisible]     = useState(false);
  const secRef=useRef<HTMLElement>(null);

  useEffect(()=>{
    const obs=new IntersectionObserver(([e])=>{ if(e.isIntersecting) setVisible(true); },{threshold:0.05});
    if(secRef.current) obs.observe(secRef.current);
    return()=>obs.disconnect();
  },[]);

  useEffect(()=>{
    Promise.all([
      fetch("/data/anomaly_sessions_faker.json").then(r=>r.json()),
      fetch("/data/anomaly_sessions_markov.json").then(r=>r.json()),
      fetch("/data/anomaly_requests_faker.json").then(r=>r.json()),
      fetch("/data/anomaly_requests_markov.json").then(r=>r.json()),
      fetch("/data/anomaly_comparison.json").then(r=>r.json()),
    ]).then(([fs,ms,fr,mr,cmp])=>{
      setFakerSess(fs); setMarkovSess(ms);
      setFakerReq(fr); setMarkovReq(mr);
      setComparison(cmp); setLoaded(true);
    });
  },[]);

  const allSess=useMemo(()=>[
    ...fakerSess.map(s=>({...s,generator:"faker" as const})),
    ...markovSess.map(s=>({...s,generator:"markov" as const})),
  ],[fakerSess,markovSess]);

  const allReq=useMemo(()=>[...fakerReq,...markovReq],[fakerReq,markovReq]);
  const fakerAnomalies=fakerSess.filter(s=>s.is_anomaly).length;
  const markovAnomalies=markovSess.filter(s=>s.is_anomaly).length;

  const fade=(d=0)=>({
    opacity:isVisible?1:0, transform:isVisible?"translateY(0)":"translateY(24px)",
    transition:`opacity 0.7s ease ${d}s,transform 0.7s ease ${d}s`,
  });

  return(
    <section id="anomalydetection" ref={secRef}
      style={{padding:"6rem 3rem",position:"relative",zIndex:1,background:"rgba(255,76,110,0.006)"}}>
      <div style={{maxWidth:1200,margin:"0 auto"}}>
        <SectionHeader tag="Detection"
          title={<>Anomaly{" "}<span style={{background:`linear-gradient(135deg,${T.rose},${T.amber})`,
            WebkitBackgroundClip:"text",WebkitTextFillColor:"transparent",backgroundClip:"text"}}>Detection</span></>}
          subtitle="Isolation Forest · Session-level + Request-level · Faker vs Markov"
          tagColor={T.rose} visible={isVisible}/>

        {!loaded?<Loading/>:(
          <>
            {/* Session metrics */}
            <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:"1rem",marginBottom:"2rem",...fade(0.1)}}>
              <MetricCard icon="📡" value={fakerSess.length}  label="Faker Sessions"   color={T.textDim} accent={T.b1}/>
              <MetricCard icon="⚠️" value={fakerAnomalies}    label="Faker Anomalies"  color={T.rose}    accent={T.rose}/>
              <MetricCard icon="📡" value={markovSess.length} label="Markov Sessions"  color={T.textDim} accent={T.b1}/>
              <MetricCard icon="⚠️" value={markovAnomalies}   label="Markov Anomalies" color={T.rose}    accent={T.rose}/>
            </div>

            {/* Session charts */}
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:"1.25rem",marginBottom:"1.25rem",...fade(0.2)}}>
              <ChartCard accent={T.cyan}>
                <CT>Anomaly Score Distribution</CT>
                <ScoreHistogram faker={fakerSess} markov={markovSess}/>
              </ChartCard>
              <ChartCard accent={T.amber}>
                <CT>Anomaly Rate by Site</CT>
                <AnomalyRateBar faker={fakerSess} markov={markovSess}/>
              </ChartCard>
            </div>

            {/* Session table */}
            <ChartCard accent={T.rose} style={{marginBottom:"1.5rem",...fade(0.25)}}>
              <CT>
                Most Anomalous Sessions{" "}
                <span style={{color:T.muted,fontWeight:400}}>top 15 · sorted by score</span>
              </CT>
              <div style={{overflowX:"auto"}}>
                <table className="data-table">
                  <thead><tr>
                    {["IP","Country","Site","Generator","Requests","Top Attack","Score","Anomaly"].map(h=>(
                      <th key={h}>{h}</th>
                    ))}
                  </tr></thead>
                  <tbody>
                    {[...allSess].sort((a,b)=>a.anomaly_score-b.anomaly_score).slice(0,15).map((s,i)=>{
                      const topAttack=Object.entries(s.attack_types||{}).sort((a,b)=>b[1]-a[1])[0]?.[0]||"?";
                      return(<tr key={i}>
                        <td style={{fontFamily:T.mono,color:T.cyan,fontSize:10}}>{s.ip}</td>
                        <td>{s.country}</td>
                        <td style={{fontSize:10}}>{s.site}</td>
                        <td><span style={{color:s.generator==="faker"?FK[0]:MK[0],fontFamily:T.mono,fontSize:10}}>{s.generator}</span></td>
                        <td style={{textAlign:"right"}}>{s.total_requests}</td>
                        <td><span style={{color:ATTACK_COLORS[topAttack]||T.muted,fontFamily:T.mono,fontSize:10}}>{topAttack}</span></td>
                        <td style={{fontFamily:T.mono,color:T.amber}}>{s.anomaly_score.toFixed(4)}</td>
                        <td>{s.is_anomaly
                          ?<span className="anomaly-yes"><span className="anomaly-dot"/>ANOMALY</span>
                          :<span style={{color:T.muted,fontFamily:T.mono,fontSize:10}}>—</span>}
                        </td>
                      </tr>);
                    })}
                  </tbody>
                </table>
              </div>
            </ChartCard>

            <hr className="section-divider"/>

            {/* Request level header */}
            <div style={{marginBottom:"1.5rem"}}>
              <h3 style={{fontFamily:T.display,fontSize:"1.4rem",fontWeight:700,marginBottom:"0.25rem"}}>
                Request-level Anomalies
              </h3>
              <p style={{fontFamily:T.mono,fontSize:11,color:T.muted}}>Scored relative to each session's own context</p>
            </div>

            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:"1rem",marginBottom:"1.5rem",...fade(0.35)}}>
              <MetricCard icon="🔍" value={fakerReq.length.toLocaleString()}  label="Faker Anomalous Requests"  color={T.amber} accent={T.amber}/>
              <MetricCard icon="🔍" value={markovReq.length.toLocaleString()} label="Markov Anomalous Requests" color={T.amber} accent={T.amber}/>
            </div>

            <ChartCard accent={T.purple} style={{marginBottom:"1.5rem",...fade(0.4)}}>
              <CT>Anomaly Score vs HTTP Status</CT>
              <ScoreScatter reqs={allReq}/>
            </ChartCard>

            {/* Request table */}
            <ChartCard accent={T.rose} style={{marginBottom:"2rem",...fade(0.45)}}>
              <CT>
                Most Anomalous Requests{" "}
                <span style={{color:T.muted,fontWeight:400}}>top 20</span>
              </CT>
              <div style={{overflowX:"auto"}}>
                <table className="data-table">
                  <thead><tr>
                    {["Method","Path","Status","Attack Type","Country","Generator","Score"].map(h=>(
                      <th key={h}>{h}</th>
                    ))}
                  </tr></thead>
                  <tbody>
                    {[...allReq].sort((a,b)=>a.anomaly_score-b.anomaly_score).slice(0,20).map((r,i)=>(
                      <tr key={i}>
                        <td><span style={{color:T.amber,fontFamily:T.mono,fontSize:10}}>{r.method}</span></td>
                        <td style={{fontFamily:T.mono,fontSize:10,color:T.muted,maxWidth:200,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{r.path}</td>
                        <td>{r.status}</td>
                        <td><span style={{color:ATTACK_COLORS[r.attack_type]||T.muted,fontFamily:T.mono,fontSize:10}}>{r.attack_type}</span></td>
                        <td>{r.country}</td>
                        <td><span style={{color:r.generator==="faker"?FK[0]:MK[0],fontFamily:T.mono,fontSize:10}}>{r.generator}</span></td>
                        <td style={{fontFamily:T.mono,color:T.rose}}>{r.anomaly_score.toFixed(4)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </ChartCard>

            {/* Comparison */}
            {comparison&&(
              <>
                <hr className="section-divider"/>
                <h3 style={{fontFamily:T.display,fontSize:"1.4rem",fontWeight:700,marginBottom:"1.5rem"}}>
                  Faker vs Markov — Anomaly Comparison
                </h3>
                <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:"1.5rem",...fade(0.5)}}>
                  <ChartCard accent={T.amber}>
                    <CT>Session Anomaly Rate</CT>
                    <ComparisonBar comparison={comparison}/>
                  </ChartCard>

                  {/* Insight card */}
                  <div style={{
                    background:"rgba(10,16,32,0.68)", backdropFilter:"blur(20px)", WebkitBackdropFilter:"blur(20px)", border:"1px solid rgba(255,255,255,0.11)",
                    borderRadius:14, padding:"1.5rem 1.5rem 1.5rem 1.75rem",
                    boxShadow:T.shadow2, position:"relative", overflow:"hidden",
                  }}>
                    <div style={{position:"absolute",left:0,top:0,bottom:0,width:3,
                      background:`linear-gradient(to bottom,${T.amber},${T.purple})`,
                      boxShadow:`2px 0 12px ${T.amber}44`,
                      borderRadius:"14px 0 0 14px",pointerEvents:"none"}}/>
                    <div style={{fontFamily:T.mono,fontSize:10,color:T.amber,
                      textTransform:"uppercase",letterSpacing:"0.12em",marginBottom:"0.75rem"}}>
                      Session-level Insight
                    </div>
                    <p style={{fontFamily:T.display,fontSize:13,lineHeight:1.7,marginBottom:"1.25rem",color:T.textDim}}>
                      {comparison.session_level.insight}
                    </p>
                    <div style={{fontFamily:T.mono,fontSize:10,color:T.amber,
                      textTransform:"uppercase",letterSpacing:"0.12em",marginBottom:"0.75rem"}}>
                      Request-level Insight
                    </div>
                    <p style={{fontFamily:T.display,fontSize:13,lineHeight:1.7,color:T.textDim}}>
                      {comparison.request_level.insight}
                    </p>
                  </div>
                </div>

                {/* Top IPs */}
                <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:"1.5rem",marginTop:"1.5rem",...fade(0.55)}}>
                  {(["faker","markov"] as const).map(gen=>{
                    const ips=comparison.session_level[gen].top_anomalous_ips;
                    const col=gen==="faker"?FK[0]:MK[0];
                    const barGrad=gen==="faker"
                      ?`linear-gradient(to bottom,${FK[0]},${T.purple})`
                      :`linear-gradient(to bottom,${MK[0]},${T.purple})`;
                    return(
                      <div key={gen} style={{
                        background:"rgba(10,16,32,0.68)", backdropFilter:"blur(20px)", WebkitBackdropFilter:"blur(20px)", border:"1px solid rgba(255,255,255,0.11)",
                        borderRadius:14, padding:"1.5rem 1.5rem 1.5rem 1.75rem",
                        boxShadow:T.shadow2, position:"relative", overflow:"hidden",
                      }}>
                        <div style={{position:"absolute",left:0,top:0,bottom:0,width:3,
                          background:barGrad, boxShadow:`2px 0 12px ${col}44`,
                          borderRadius:"14px 0 0 14px",pointerEvents:"none"}}/>
                        <CT>{gen} — Top Anomalous IPs</CT>
                        <div style={{display:"flex",flexDirection:"column",gap:"0.5rem"}}>
                          {ips.map((ip,i)=>(
                            <div key={ip} style={{display:"flex",alignItems:"center",gap:"0.75rem"}}>
                              <span style={{fontFamily:T.mono,fontSize:10,color:T.muted,width:18}}>#{i+1}</span>
                              <div style={{flex:1,height:3,background:"rgba(255,255,255,0.06)",borderRadius:2,overflow:"hidden"}}>
                                <div style={{height:"100%",width:`${100-i*15}%`,
                                  background:`linear-gradient(to right,${col},${col}55)`,
                                  boxShadow:`0 0 6px ${col}88`}}/>
                              </div>
                              <span style={{fontFamily:T.mono,fontSize:11,color:col}}>{ip}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </>
            )}
          </>
        )}
      </div>
    </section>
  );
}
