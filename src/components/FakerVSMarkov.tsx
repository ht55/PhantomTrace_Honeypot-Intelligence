"use client";
import { useEffect, useRef, useState, useMemo } from "react";
import { LogEntry, ClassificationReport } from "@/lib/types";
import { MetricCard, SectionHeader, Loading, T } from "@/components/ui/shared";

// Faker = cyan軸、Markov = amber軸 — design systemに統合
const FK:  [string,string] = [T.cyan,   "#003d36"];
const MK:  [string,string] = [T.amber,  "#3d2500"];

interface Tip { x:number; y:number; lines:string[]; on:boolean; }
const NO_TIP: Tip = { x:0,y:0,lines:[],on:false };

// ── Shared tooltip ────────────────────────────────────────────────────────────
function Tooltip({ tip,W,H,isF=true }: { tip:Tip; W:number; H:number; isF?:boolean }) {
  if(!tip.on) return null;
  const accent = isF ? FK[0] : MK[0];
  return(
    <div style={{
      position:"absolute", left:`${(tip.x/W)*100}%`, top:`${(tip.y/H)*100}%`,
      transform:"translate(-50%,-115%)", pointerEvents:"none",
      background:"rgba(6,9,20,0.97)", border:`1px solid ${accent}33`,
      borderRadius:8, padding:"8px 12px", fontFamily:T.mono, fontSize:11, color:T.text,
      whiteSpace:"nowrap", zIndex:10,
      boxShadow:`0 8px 32px rgba(0,0,0,0.6),0 0 16px ${accent}18`,
    }}>
      {tip.lines.map((l,i)=>(
        <div key={i} style={{color:i===0?"#fff":i===1?accent:T.amber,lineHeight:1.6}}>{l}</div>
      ))}
    </div>
  );
}

// ── ChartCard with gradient left border ───────────────────────────────────────
function ChartCard({ children, accent=T.cyan, style={} }: { children:React.ReactNode; accent?:string; style?:React.CSSProperties }) {
  const barGrad = accent===T.cyan
    ? `linear-gradient(to bottom,${T.cyan},${T.purple})`
    : accent===T.amber
    ? `linear-gradient(to bottom,${T.amber},${T.purple})`
    : accent===T.purple
    ? `linear-gradient(to bottom,${T.purple},${T.cyan})`
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

// ── Grouped Bar ───────────────────────────────────────────────────────────────
function GroupedBar({ faker, markov }: { faker:LogEntry[]; markov:LogEntry[] }) {
  const ref=useRef<SVGSVGElement>(null);
  const[tip,setTip]=useState<Tip>(NO_TIP);
  const[tipIsF,setTipIsF]=useState(true);
  const[hov,setHov]=useState("");

  const data=useMemo(()=>{
    const fT=faker.length||1, mT=markov.length||1;
    const fC:Record<string,number>={}, mC:Record<string,number>={};
    faker.forEach(l=>{fC[l.attack_type]=(fC[l.attack_type]||0)+1;});
    markov.forEach(l=>{mC[l.attack_type]=(mC[l.attack_type]||0)+1;});
    const types=Array.from(new Set([...faker,...markov].map(l=>l.attack_type)));
    return types.map(t=>({t,f:(fC[t]||0)/fT,m:(mC[t]||0)/mT}))
      .sort((a,b)=>(b.f+b.m)-(a.f+a.m)).slice(0,10);
  },[faker,markov]);

  const W=560,H=330,pL=56,pR=20,pT=40,pB=78;
  const cH=H-pT-pB;
  const maxVal=Math.max(...data.flatMap(d=>[d.f,d.m]),0.001);
  const slotW=(W-pL-pR)/data.length;
  const bW=Math.min(22,slotW*0.38);
  const gap=3;

  return(
    <div style={{position:"relative"}}>
      <svg ref={ref} viewBox={`0 0 ${W} ${H}`} width="100%" style={{display:"block",overflow:"visible"}}>
        <defs>
          <linearGradient id="gfk" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={FK[0]}/><stop offset="100%" stopColor={FK[1]}/>
          </linearGradient>
          <linearGradient id="gmk" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={MK[0]}/><stop offset="100%" stopColor={MK[1]}/>
          </linearGradient>
          <filter id="gf-glow" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="5" result="b"/>
            <feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge>
          </filter>
        </defs>

        <text x={pL} y={26} fontFamily={T.mono} fontSize={13} fontWeight="700"
          fill={T.muted} letterSpacing="0.06em">ATTACK TYPE DISTRIBUTION (NORMALIZED)</text>

        {[0.25,0.5,0.75,1].map(t=>{
          const y=pT+cH-t*cH;
          return(<g key={t}>
            <line x1={pL} y1={y} x2={W-pR} y2={y} stroke="rgba(255,255,255,0.05)" strokeWidth={0.5} strokeDasharray="3 4"/>
            <text x={pL-8} y={y+4} fontFamily={T.mono} fontSize={11} fill={T.muted} textAnchor="end">
              {(t*maxVal*100).toFixed(0)}%
            </text>
          </g>);
        })}
        <line x1={pL} y1={pT+cH} x2={W-pR} y2={pT+cH} stroke="rgba(255,255,255,0.08)" strokeWidth={0.5}/>

        {data.map((d,i)=>{
          const cx=pL+i*slotW+slotW/2;
          const fH=(d.f/maxVal)*cH, mH=(d.m/maxVal)*cH;
          const fX=cx-bW-gap/2, mX=cx+gap/2;
          const fHov=hov===`f${i}`, mHov=hov===`m${i}`;

          return(<g key={d.t}>
            {/* Faker bar */}
            <g style={{cursor:"pointer"}}
              onMouseEnter={e=>{
                setHov(`f${i}`); setTipIsF(true);
                const rc=ref.current!.getBoundingClientRect();
                setTip({x:((e.clientX-rc.left)/rc.width)*W,y:((e.clientY-rc.top)/rc.height)*H-12,on:true,
                  lines:[d.t.replace(/_/g," "),"Faker",`${(d.f*100).toFixed(1)}%`]});
              }}
              onMouseLeave={()=>{setHov("");setTip(NO_TIP);}}>
              {fH>4&&<ellipse cx={fX+bW/2} cy={pT+cH} rx={bW*0.65} ry={4}
                fill={FK[0]} opacity={fHov?0.45:0.18}/>}
              <rect x={fX} y={pT+cH-fH} width={bW} height={fH} rx={2}
                fill="url(#gfk)" opacity={fHov?1:0.78}
                filter={fHov?"url(#gf-glow)":undefined}/>
              {fH>4&&<rect x={fX+1} y={pT+cH-fH} width={bW-2} height={2}
                rx={1} fill={FK[0]} opacity={0.65}/>}
            </g>

            {/* Markov bar */}
            <g style={{cursor:"pointer"}}
              onMouseEnter={e=>{
                setHov(`m${i}`); setTipIsF(false);
                const rc=ref.current!.getBoundingClientRect();
                setTip({x:((e.clientX-rc.left)/rc.width)*W,y:((e.clientY-rc.top)/rc.height)*H-12,on:true,
                  lines:[d.t.replace(/_/g," "),"Markov",`${(d.m*100).toFixed(1)}%`]});
              }}
              onMouseLeave={()=>{setHov("");setTip(NO_TIP);}}>
              {mH>4&&<ellipse cx={mX+bW/2} cy={pT+cH} rx={bW*0.65} ry={4}
                fill={MK[0]} opacity={mHov?0.45:0.18}/>}
              <rect x={mX} y={pT+cH-mH} width={bW} height={mH} rx={2}
                fill="url(#gmk)" opacity={mHov?1:0.78}
                filter={mHov?"url(#gf-glow)":undefined}/>
              {mH>4&&<rect x={mX+1} y={pT+cH-mH} width={bW-2} height={2}
                rx={1} fill={MK[0]} opacity={0.65}/>}
            </g>

            <text x={cx} y={pT+cH+10} textAnchor="end" fontFamily={T.mono} fontSize={11} fill={T.muted}
              transform={`rotate(-38,${cx},${pT+cH+10})`}>
              {d.t.replace(/_/g," ").slice(0,16)}
            </text>
          </g>);
        })}

        {/* Legend */}
        <rect x={W-148} y={H-19} width={10} height={10} rx={2} fill={FK[0]}/>
        <text x={W-133} y={H-11} fontFamily={T.mono} fontSize={11} fill={FK[0]}>Faker</text>
        <rect x={W-78} y={H-19} width={10} height={10} rx={2} fill={MK[0]}/>
        <text x={W-63} y={H-11} fontFamily={T.mono} fontSize={11} fill={MK[0]}>Markov</text>
      </svg>
      <Tooltip tip={tip} W={W} H={H} isF={tipIsF}/>
    </div>
  );
}

// ── Interval Histogram ────────────────────────────────────────────────────────
function IntervalHistogram({ faker, markov }: { faker:LogEntry[]; markov:LogEntry[] }) {
  const BINS=25;

  const { fBins, mBins, maxBin } = useMemo(()=>{
    const getIv=(logs:LogEntry[])=>{
      const s=[...logs].sort((a,b)=>a.timestamp<b.timestamp?-1:1);
      const ivs:number[]=[];
      for(let i=1;i<s.length;i++){
        const dt=(new Date(s[i].timestamp).getTime()-new Date(s[i-1].timestamp).getTime())/1000;
        if(dt>0&&dt<300) ivs.push(dt);
      }
      return ivs;
    };
    const fIv=getIv(faker), mIv=getIv(markov);
    const fB=new Array(BINS).fill(0), mB=new Array(BINS).fill(0);
    fIv.forEach(v=>{fB[Math.min(BINS-1,Math.floor(v/300*BINS))]++;});
    mIv.forEach(v=>{mB[Math.min(BINS-1,Math.floor(v/300*BINS))]++;});
    return{fBins:fB,mBins:mB,maxBin:Math.max(...fB,...mB,1)};
  },[faker,markov]);

  const W=540,H=330,pL=44,pR=20,pT=40,pB=44;
  const cW=W-pL-pR, cH=H-pT-pB, bW=cW/BINS;

  const linePath=(bins:number[])=>
    bins.map((v,i)=>`${i===0?"M":"L"}${pL+i*bW+bW/2},${pT+cH-(v/maxBin)*cH}`).join(" ");
  const areaPath=(bins:number[])=>
    `${linePath(bins)} L${pL+(BINS-1)*bW+bW/2},${pT+cH} L${pL+bW/2},${pT+cH} Z`;

  return(
    <svg viewBox={`0 0 ${W} ${H}`} width="100%" style={{display:"block",overflow:"visible"}}>
      <defs>
        <linearGradient id="hf" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={FK[0]} stopOpacity="0.55"/>
          <stop offset="100%" stopColor={FK[0]} stopOpacity="0.02"/>
        </linearGradient>
        <linearGradient id="hm" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={MK[0]} stopOpacity="0.48"/>
          <stop offset="100%" stopColor={MK[0]} stopOpacity="0.02"/>
        </linearGradient>
      </defs>

      <text x={pL} y={26} fontFamily={T.mono} fontSize={13} fontWeight="700"
        fill={T.muted} letterSpacing="0.06em">REQUEST INTERVAL DISTRIBUTION (0–300s)</text>

      {[0.25,0.5,0.75,1].map(t=>(
        <g key={t}>
          <line x1={pL} y1={pT+cH-t*cH} x2={W-pR} y2={pT+cH-t*cH}
            stroke="rgba(255,255,255,0.05)" strokeWidth={0.5} strokeDasharray="3 4"/>
          <text x={pL-8} y={pT+cH-t*cH+4} fontFamily={T.mono} fontSize={11}
            fill={T.muted} textAnchor="end">{Math.round(t*maxBin)}</text>
        </g>
      ))}

      <path d={areaPath(fBins)} fill="url(#hf)"/>
      <path d={linePath(fBins)} fill="none" stroke={FK[0]} strokeWidth={2.2} strokeLinejoin="round"/>
      <path d={areaPath(mBins)} fill="url(#hm)"/>
      <path d={linePath(mBins)} fill="none" stroke={MK[0]} strokeWidth={2.2} strokeLinejoin="round"/>

      <line x1={pL} y1={pT+cH} x2={W-pR} y2={pT+cH} stroke="rgba(255,255,255,0.08)" strokeWidth={0.5}/>

      {[0,75,150,225,300].map(s=>(
        <text key={s} x={pL+(s/300)*cW} y={pT+cH+18} textAnchor="middle"
          fontFamily={T.mono} fontSize={11} fill={T.muted}>{s}s</text>
      ))}

      {/* Legend */}
      <rect x={W-148} y={H-19} width={10} height={10} rx={2} fill={FK[0]}/>
      <text x={W-133} y={H-11} fontFamily={T.mono} fontSize={11} fill={FK[0]}>Faker</text>
      <rect x={W-78} y={H-19} width={10} height={10} rx={2} fill={MK[0]}/>
      <text x={W-63} y={H-11} fontFamily={T.mono} fontSize={11} fill={MK[0]}>Markov</text>
    </svg>
  );
}

// ── Main ──────────────────────────────────────────────────────────────────────
export function FakerVSMarkov() {
  const[faker,setFaker]       = useState<LogEntry[]>([]);
  const[markov,setMarkov]     = useState<LogEntry[]>([]);
  const[report,setReport]     = useState<ClassificationReport|null>(null);
  const[loaded,setLoaded]     = useState(false);
  const[isVisible,setVisible] = useState(false);
  const secRef=useRef<HTMLElement>(null);

  useEffect(()=>{
    const obs=new IntersectionObserver(([e])=>{ if(e.isIntersecting) setVisible(true); },{threshold:0.05});
    if(secRef.current) obs.observe(secRef.current);
    return()=>obs.disconnect();
  },[]);

  useEffect(()=>{
    Promise.all([
      fetch("/data/honeypot_logs_faker.json").then(r=>r.json()),
      fetch("/data/honeypot_logs_markov.json").then(r=>r.json()),
      fetch("/data/classification_report.json").then(r=>r.json()),
    ]).then(([f,m,rp])=>{ setFaker(f); setMarkov(m); setReport(rp); setLoaded(true); });
  },[]);

  const acc=report?.classification_accuracy;
  const pf=report?.personality_profiles;

  const fade=(d=0)=>({
    opacity:isVisible?1:0, transform:isVisible?"translateY(0)":"translateY(28px)",
    transition:`opacity 0.7s ease ${d}s,transform 0.7s ease ${d}s`,
  });

  return(
    <section id="fakervsmarkov" ref={secRef}
      style={{padding:"6rem 3rem",position:"relative",zIndex:1,background:"rgba(0,255,224,0.004)"}}>
      <div style={{maxWidth:1200,margin:"0 auto"}}>
        <SectionHeader tag="Comparison"
          title={<>Faker <span className="text-gradient">vs</span> Markov</>}
          subtitle="Statistical comparison of synthetic data generation methods"
          visible={isVisible}/>

        {!loaded?<Loading/>:(
          <>
            {/* Top metrics */}
            <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:"1rem",marginBottom:"2rem",...fade(0.1)}}>
              <MetricCard icon="◈" value={faker.length.toLocaleString()} label="Faker Entries" color={FK[0]} accent={FK[0]}/>
              <MetricCard icon="◈" value={markov.length.toLocaleString()} label="Markov Entries" color={MK[0]} accent={MK[0]}/>
              {acc&&<MetricCard icon="Δ" value={`+${(acc.delta*100).toFixed(0)}%`}
                label="Markov Accuracy Δ" color={T.cyan} accent={T.cyan}/>}
            </div>

            <hr className="section-divider"/>

            {/* Charts */}
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:"1.25rem",marginBottom:"1.25rem",...fade(0.2)}}>
              <ChartCard accent={FK[0]}>
                <GroupedBar faker={faker} markov={markov}/>
              </ChartCard>
              <ChartCard accent={MK[0]}>
                <IntervalHistogram faker={faker} markov={markov}/>
              </ChartCard>
            </div>

            {/* Accuracy */}
            {acc&&(
              <div style={fade(0.3)}>
                <div style={{fontFamily:T.mono,fontSize:10,color:T.muted,letterSpacing:"0.12em",
                  textTransform:"uppercase",marginBottom:"0.75rem"}}>
                  LLM Classification Accuracy
                </div>
                <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 2fr",gap:"1rem",marginBottom:"1.5rem"}}>
                  <MetricCard icon="🎯" value={`${(acc.faker.accuracy*100).toFixed(0)}%`}
                    label={`Faker (${acc.faker.correct}/${acc.faker.total_sessions})`}
                    color={FK[0]} accent={FK[0]}/>
                  <MetricCard icon="🎯" value={`${(acc.markov.accuracy*100).toFixed(0)}%`}
                    label={`Markov (${acc.markov.correct}/${acc.markov.total_sessions})`}
                    color={MK[0]} accent={MK[0]}/>
                  {/* Insight card — gradient left border amber */}
                  <div style={{
                    background:"rgba(10,16,32,0.68)", backdropFilter:"blur(20px)", WebkitBackdropFilter:"blur(20px)", border:"1px solid rgba(255,255,255,0.11)",
                    borderRadius:12, padding:"1.25rem 1.5rem 1.25rem 1.75rem",
                    boxShadow:T.shadow2, position:"relative", overflow:"hidden",
                  }}>
                    <div style={{
                      position:"absolute",left:0,top:0,bottom:0,width:3,
                      background:`linear-gradient(to bottom,${T.amber},${T.purple})`,
                      boxShadow:`2px 0 12px ${T.amber}44`,
                      borderRadius:"12px 0 0 12px",pointerEvents:"none",
                    }}/>
                    <div style={{fontSize:18,marginBottom:8}}>💡</div>
                    <div style={{fontFamily:T.display,fontSize:13,lineHeight:1.65,color:T.textDim}}>{acc.insight}</div>
                    <div style={{fontFamily:T.mono,fontSize:10,color:T.muted,textTransform:"uppercase",marginTop:6,letterSpacing:"0.1em"}}>Insight</div>
                  </div>
                </div>

                {/* MBTI profiles */}
                {pf&&(
                  <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:"1rem"}}>
                    {(["faker","markov"] as const).map(gen=>{
                      const d=pf[gen];
                      const mbti=Object.entries(d.mbti_distribution).sort((a,b)=>b[1]-a[1]);
                      const top=Object.entries(d.top_archetypes).sort((a,b)=>b[1]-a[1]).slice(0,3);
                      const maxM=mbti[0]?.[1]||1;
                      const col=gen==="faker"?FK[0]:MK[0];
                      const barGrad=gen==="faker"
                        ?`linear-gradient(to bottom,${FK[0]},${T.purple})`
                        :`linear-gradient(to bottom,${MK[0]},${T.purple})`;

                      return(
                        <div key={gen} style={{
                          background:"rgba(10,16,32,0.68)", backdropFilter:"blur(20px)", WebkitBackdropFilter:"blur(20px)", border:"1px solid rgba(255,255,255,0.11)",
                          borderRadius:12, padding:"1.25rem 1.5rem 1.25rem 1.75rem",
                          boxShadow:T.shadow2, position:"relative", overflow:"hidden",
                        }}>
                          {/* gradient left border */}
                          <div style={{
                            position:"absolute",left:0,top:0,bottom:0,width:3,
                            background:barGrad, boxShadow:`2px 0 12px ${col}44`,
                            borderRadius:"12px 0 0 12px", pointerEvents:"none",
                          }}/>

                          <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:"1rem"}}>
                            <div>
                              <div style={{fontFamily:T.mono,fontSize:10,color:col,
                                textTransform:"uppercase",letterSpacing:"0.1em",marginBottom:4}}>{gen}</div>
                              <div style={{fontFamily:T.display,fontSize:"1.4rem",fontWeight:800}}>
                                Avg Threat:{" "}
                                <span style={{color:T.amber,textShadow:`0 0 16px ${T.amber}66`}}>
                                  {d.avg_threat_level.toFixed(1)}
                                </span>
                              </div>
                            </div>
                            <div style={{fontFamily:T.mono,fontSize:11,color:T.muted,textAlign:"right"}}>
                              {top.map(([arch,cnt])=>(
                                <div key={arch} style={{marginBottom:3}}>
                                  <span style={{color:T.amber}}>{cnt}×</span>{" "}{arch.slice(0,26)}
                                </div>
                              ))}
                            </div>
                          </div>

                          <div style={{display:"flex",flexDirection:"column",gap:7}}>
                            {mbti.map(([type,cnt])=>(
                              <div key={type}>
                                <div style={{display:"flex",justifyContent:"space-between",marginBottom:3}}>
                                  <span style={{fontFamily:T.mono,fontSize:10,color:col}}>{type}</span>
                                  <span style={{fontFamily:T.mono,fontSize:10,color:T.muted}}>×{cnt}</span>
                                </div>
                                <div style={{height:4,background:"rgba(255,255,255,0.05)",borderRadius:2,overflow:"hidden"}}>
                                  <div style={{height:"100%",width:`${(cnt/maxM)*100}%`,
                                    background:`linear-gradient(to right,${col},${T.purple})`,
                                    boxShadow:`0 0 8px ${col}66`,borderRadius:2,
                                    transition:"width 1.1s cubic-bezier(0.16,1,0.3,1)"}}/>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}
          </>
        )}
      </div>
    </section>
  );
}
