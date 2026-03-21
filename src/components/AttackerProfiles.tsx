"use client";
import { useEffect, useRef, useState } from "react";
import { ClassifiedLog, MBTI_THREAT } from "@/lib/types";
import { SectionHeader, FilterPills, Loading, T } from "@/components/ui/shared";

function threatColor(t:number){ return t>=8?T.rose:t>=5?T.amber:T.cyan; }
function threatGrad(t:number){
  return t>=8
    ?`linear-gradient(135deg,${T.rose},${T.purple})`
    :t>=5
    ?`linear-gradient(135deg,${T.amber},${T.purple})`
    :`linear-gradient(135deg,${T.cyan},${T.purple})`;
}
function leftBarGrad(t:number){
  return t>=8
    ?`linear-gradient(to bottom,${T.rose},${T.amber})`
    :t>=5
    ?`linear-gradient(to bottom,${T.amber},${T.purple})`
    :`linear-gradient(to bottom,${T.cyan},${T.purple})`;
}

// ── Profile Card ──────────────────────────────────────────────────────────────
function ProfileCard({ r, index, visible }: { r:ClassifiedLog; index:number; visible:boolean }) {
  const p=r.personality;
  const color=threatColor(p.threat_level);
  const grad=threatGrad(p.threat_level);
  const barGrad=leftBarGrad(p.threat_level);
  const [expanded, setExpanded] = useState(false);
  const isLong = p.personality_description.length > 200;

  return(
    <div style={{
      background:"rgba(10,16,32,0.68)", backdropFilter:"blur(20px)", WebkitBackdropFilter:"blur(20px)", border:"1px solid rgba(255,255,255,0.11)",
      borderRadius:14, padding:"1.5rem 1.5rem 1.5rem 1.75rem",
      opacity:visible?1:0, transform:visible?"translateY(0)":"translateY(20px)",
      transition:`opacity 0.6s ease ${index*55}ms,transform 0.6s ease ${index*55}ms,border-color 0.25s ease,box-shadow 0.25s ease`,
      position:"relative", overflow:"hidden",
      boxShadow:T.shadow2,
    }}
    onMouseEnter={e=>{
      const el=e.currentTarget as HTMLElement;
      el.style.borderColor=`${color}44`;
      el.style.boxShadow=`${T.shadow3},0 0 32px ${color}14`;
    }}
    onMouseLeave={e=>{
      const el=e.currentTarget as HTMLElement;
      el.style.borderColor=T.b1;
      el.style.boxShadow=T.shadow2;
    }}>
      {/* Gradient left border */}
      <div style={{
        position:"absolute",left:0,top:0,bottom:0,width:3,
        background:barGrad, boxShadow:`2px 0 12px ${color}44`,
        borderRadius:"14px 0 0 14px", pointerEvents:"none",
      }}/>

      {/* Header */}
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:"0.875rem"}}>
        <div style={{
          fontFamily:T.mono, fontSize:16, fontWeight:700,
          color:"#04060e", background:grad,
          borderRadius:6, padding:"0.2rem 0.65rem",
          letterSpacing:"0.12em",
          boxShadow:`0 2px 14px ${color}44`,
        }}>
          {p.mbti_type}
        </div>
        <div style={{fontFamily:T.mono,fontSize:11,color,textAlign:"right",display:"flex",flexDirection:"column",alignItems:"flex-end",gap:2}}>
          <span style={{fontSize:11,letterSpacing:"0.12em",opacity:0.8}}>THREAT</span>
          <span style={{fontSize:17,fontWeight:700,textShadow:`0 0 14px ${color}88`}}>
            {p.threat_level}<span style={{fontSize:10,fontWeight:400}}>/10</span>
          </span>
        </div>
      </div>

      {/* Label */}
      <div style={{fontFamily:T.display,fontWeight:700,fontSize:13,marginBottom:"0.35rem",
        background:grad,WebkitBackgroundClip:"text",WebkitTextFillColor:"transparent",backgroundClip:"text"}}>
        {p.label}
      </div>

      {/* Meta */}
      <div style={{fontFamily:T.mono,fontSize:10,color:T.muted,marginBottom:"0.75rem",letterSpacing:"0.05em"}}>
        {r.site.replace("site_","").replace(/_/g," ")} · {r.generator} · {r.country}
      </div>

      {/* Description — click to expand */}
      <div
        onClick={isLong ? ()=>setExpanded(e=>!e) : undefined}
        style={{
          fontFamily:T.display, fontSize:12, color:T.textDim, lineHeight:1.65,
          marginBottom:"1rem",
          cursor: isLong ? "pointer" : "default",
        }}
      >
        {expanded ? p.personality_description : p.personality_description.slice(0,200)}
        {isLong && !expanded && "…"}
        {isLong && (
          <span style={{
            display:"block", marginTop:4,
            fontFamily:T.mono, fontSize:10,
            color: color, opacity:0.8,
            letterSpacing:"0.08em",
          }}>
            {expanded ? "▲ COLLAPSE" : "▼ READ MORE"}
          </span>
        )}
      </div>

      {/* Threat bar */}
      <div style={{height:3,borderRadius:2,background:"rgba(255,255,255,0.06)",overflow:"hidden",marginBottom:"1rem"}}>
        <div style={{height:"100%",width:`${p.threat_level*10}%`,background:grad,
          boxShadow:`0 0 8px ${color}88`,transition:"width 1s ease"}}/>
      </div>

      {/* MBTI axes */}
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:"0.45rem"}}>
        {[{label:"E/I",val:p.e_i_score},{label:"S/N",val:p.s_n_score},
          {label:"T/F",val:p.t_f_score},{label:"J/P",val:p.j_p_score}].map(ax=>(
          <div key={ax.label}>
            <div style={{display:"flex",justifyContent:"space-between",marginBottom:3}}>
              <span style={{fontFamily:T.mono,fontSize:10,color:T.muted}}>{ax.label}</span>
              <span style={{fontFamily:T.mono,fontSize:10,color:T.muted}}>{(ax.val*100).toFixed(0)}%</span>
            </div>
            <div style={{height:3,background:"rgba(255,255,255,0.06)",borderRadius:2,overflow:"hidden"}}>
              <div style={{height:"100%",width:`${ax.val*100}%`,
                background:`linear-gradient(to right,${T.cyan}bb,${T.purple}88)`,
                borderRadius:2,transition:"width 1s ease"}}/>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Main ──────────────────────────────────────────────────────────────────────
export function AttackerProfiles() {
  const[classified,setClassified] = useState<ClassifiedLog[]>([]);
  const[loaded,setLoaded]         = useState(false);
  const[isVisible,setVisible]     = useState(false);
  const[genFilter,setGenFilter]   = useState("all");
  const sectionRef=useRef<HTMLElement>(null);
  const radarRef=useRef<HTMLCanvasElement>(null);
  const mbtiRef=useRef<HTMLCanvasElement>(null);

  useEffect(()=>{
    const obs=new IntersectionObserver(([e])=>{ if(e.isIntersecting) setVisible(true); },{threshold:0.05});
    if(sectionRef.current) obs.observe(sectionRef.current);
    return()=>obs.disconnect();
  },[]);

  useEffect(()=>{
    Promise.all([
      fetch("/data/classified_logs_faker.json").then(r=>r.json()),
      fetch("/data/classified_logs_markov.json").then(r=>r.json()),
    ]).then(([f,m])=>{ setClassified([...f,...m]); setLoaded(true); });
  },[]);

  // ── Radar chart ─────────────────────────────────────────────────────────────
  useEffect(()=>{
    if(!loaded||!isVisible) return;
    const canvas=radarRef.current; if(!canvas) return;
    const ctx=canvas.getContext("2d"); if(!ctx) return;
    const dpr=window.devicePixelRatio||1;
    canvas.width=canvas.offsetWidth*dpr; canvas.height=canvas.offsetHeight*dpr;
    ctx.scale(dpr,dpr);
    const W=canvas.offsetWidth, H=canvas.offsetHeight;
    const cx=W/2, cy=H/2, r=Math.min(W,H)*0.33;
    const labels=["E/I","S/N","T/F","J/P"]; const n=4;

    const ps=classified.filter(c=>c.personality);
    if(!ps.length) return;
    const avg=[
      ps.reduce((s,c)=>s+c.personality.e_i_score,0)/ps.length,
      ps.reduce((s,c)=>s+c.personality.s_n_score,0)/ps.length,
      ps.reduce((s,c)=>s+c.personality.t_f_score,0)/ps.length,
      ps.reduce((s,c)=>s+c.personality.j_p_score,0)/ps.length,
    ];
    const toXY=(i:number,v:number)=>({
      x:cx+Math.cos((i/n)*Math.PI*2-Math.PI/2)*r*v,
      y:cy+Math.sin((i/n)*Math.PI*2-Math.PI/2)*r*v,
    });

    // bg glow
    const bgGrad=ctx.createRadialGradient(cx,cy,0,cx,cy,r*1.4);
    bgGrad.addColorStop(0,"rgba(168,85,247,0.07)"); bgGrad.addColorStop(1,"transparent");
    ctx.fillStyle=bgGrad; ctx.fillRect(0,0,W,H);

    // Title
    ctx.fillStyle=T.muted; ctx.font=`bold 13px ${T.mono}`;
    ctx.textAlign="left"; ctx.textBaseline="top";
    ctx.fillText("AVG MBTI AXIS SCORES",8,8);

    // grid rings
    [0.25,0.5,0.75,1].forEach((s,si)=>{
      ctx.strokeStyle=`rgba(255,255,255,${0.04+si*0.03})`; ctx.lineWidth=1;
      ctx.beginPath();
      for(let i=0;i<n;i++){const p=toXY(i,s); i===0?ctx.moveTo(p.x,p.y):ctx.lineTo(p.x,p.y);}
      ctx.closePath(); ctx.stroke();
    });

    // axes
    for(let i=0;i<n;i++){
      const p=toXY(i,1);
      ctx.strokeStyle="rgba(255,255,255,0.08)"; ctx.lineWidth=1;
      ctx.beginPath(); ctx.moveTo(cx,cy); ctx.lineTo(p.x,p.y); ctx.stroke();
      const lp=toXY(i,1.28);
      ctx.fillStyle=T.textDim; ctx.font=`bold 12px ${T.mono}`;
      ctx.textAlign="center"; ctx.textBaseline="middle";
      ctx.fillText(labels[i],lp.x,lp.y);
    }

    // fill
    const fillGrad=ctx.createRadialGradient(cx,cy,0,cx,cy,r);
    fillGrad.addColorStop(0,"rgba(0,255,224,0.3)"); fillGrad.addColorStop(1,"rgba(168,85,247,0.08)");
    ctx.beginPath();
    for(let i=0;i<n;i++){const p=toXY(i,avg[i]); i===0?ctx.moveTo(p.x,p.y):ctx.lineTo(p.x,p.y);}
    ctx.closePath(); ctx.fillStyle=fillGrad; ctx.fill();

    // stroke
    ctx.shadowColor=T.cyan; ctx.shadowBlur=16;
    ctx.strokeStyle=T.cyan; ctx.lineWidth=2.2;
    ctx.beginPath();
    for(let i=0;i<n;i++){const p=toXY(i,avg[i]); i===0?ctx.moveTo(p.x,p.y):ctx.lineTo(p.x,p.y);}
    ctx.closePath(); ctx.stroke(); ctx.shadowBlur=0;

    // dots
    for(let i=0;i<n;i++){
      const p=toXY(i,avg[i]);
      ctx.fillStyle=T.cyan; ctx.shadowColor=T.cyan; ctx.shadowBlur=12;
      ctx.beginPath(); ctx.arc(p.x,p.y,4.5,0,Math.PI*2); ctx.fill();
      ctx.shadowBlur=0;
    }
  },[loaded,isVisible,classified]);

  // ── MBTI bar chart ───────────────────────────────────────────────────────────
  useEffect(()=>{
    if(!loaded||!isVisible) return;
    const canvas=mbtiRef.current; if(!canvas) return;
    const ctx=canvas.getContext("2d"); if(!ctx) return;
    const dpr=window.devicePixelRatio||1;
    canvas.width=canvas.offsetWidth*dpr; canvas.height=canvas.offsetHeight*dpr;
    ctx.scale(dpr,dpr);
    const W=canvas.offsetWidth, H=canvas.offsetHeight;
    const pad={top:32,right:68,bottom:16,left:56};

    const counts:Record<string,number>={};
    classified.forEach(c=>{ const t=c.personality?.mbti_type; if(t) counts[t]=(counts[t]||0)+1; });
    const sorted=Object.entries(counts).sort((a,b)=>b[1]-a[1]);
    const max=sorted[0]?.[1]||1;
    const chartW=W-pad.left-pad.right;
    const totalH=H-pad.top-pad.bottom;
    const barH=Math.max(14,Math.floor(totalH/sorted.length)-4);

    ctx.fillStyle=T.muted; ctx.font=`bold 13px ${T.mono}`;
    ctx.textAlign="left"; ctx.textBaseline="top";
    ctx.fillText("MBTI TYPE DISTRIBUTION",pad.left,10);

    sorted.forEach(([type,cnt],i)=>{
      const y=pad.top+i*(barH+4);
      const bw=(cnt/max)*chartW;
      const thr=MBTI_THREAT[type]||5;
      const col=thr>=8?T.rose:thr>=5?T.amber:T.cyan;

      // bar fill
      const barGrad=ctx.createLinearGradient(pad.left,0,pad.left+bw,0);
      barGrad.addColorStop(0,col+"55"); barGrad.addColorStop(1,col+"14");
      ctx.fillStyle=barGrad;
      ctx.beginPath();
      if(ctx.roundRect) ctx.roundRect(pad.left,y,bw,barH,3);
      else ctx.rect(pad.left,y,bw,barH);
      ctx.fill();

      // accent line
      ctx.fillStyle=col; ctx.shadowColor=col; ctx.shadowBlur=8;
      ctx.fillRect(pad.left,y+barH-2,bw,2); ctx.shadowBlur=0;

      // type label
      ctx.fillStyle=col; ctx.font=`bold 12px ${T.mono}`;
      ctx.textAlign="right"; ctx.textBaseline="middle";
      ctx.fillText(type,pad.left-6,y+barH/2);

      // count
      ctx.fillStyle=T.textDim; ctx.font=`12px ${T.mono}`;
      ctx.textAlign="left";
      ctx.fillText(String(cnt),pad.left+bw+6,y+barH/2);

      // threat
      ctx.fillStyle=col+"bb"; ctx.font=`11px ${T.mono}`; ctx.textAlign="right";
      ctx.fillText(`T:${thr}`,W-4,y+barH/2);
    });
  },[loaded,isVisible,classified]);

  const filtered=genFilter==="all"?classified:classified.filter(c=>c.generator===genFilter);

  return(
    <section id="attackerprofiles" ref={sectionRef}
      style={{padding:"6rem 3rem",position:"relative",zIndex:1}}>
      <div style={{maxWidth:1200,margin:"0 auto"}}>
        <SectionHeader tag="Profiling"
          title={<>Attacker{" "}<span style={{background:`linear-gradient(135deg,${T.purple},${T.cyan})`,
            WebkitBackgroundClip:"text",WebkitTextFillColor:"transparent",backgroundClip:"text"}}>Profiles</span></>}
          subtitle="MBTI-style behavioral profiling via LLM analysis"
          tagColor={T.purple} visible={isVisible}/>

        {!loaded?<Loading/>:(
          <>
            {/* Charts row */}
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:"1.5rem",marginBottom:"2rem",
              opacity:isVisible?1:0,transition:"all 0.7s ease 0.1s"}}>

              {/* Radar card */}
              <div style={{
                background:"rgba(10,16,32,0.68)", backdropFilter:"blur(20px)", WebkitBackdropFilter:"blur(20px)", border:"1px solid rgba(255,255,255,0.11)",
                borderRadius:14, padding:"1.5rem 1.5rem 1.5rem 1.75rem",
                boxShadow:T.shadow2, position:"relative", overflow:"hidden",
              }}>
                <div style={{position:"absolute",left:0,top:0,bottom:0,width:3,
                  background:`linear-gradient(to bottom,${T.cyan},${T.purple})`,
                  boxShadow:`2px 0 12px ${T.cyan}44`,borderRadius:"14px 0 0 14px",pointerEvents:"none"}}/>
                <canvas ref={radarRef} style={{width:"100%",height:280,display:"block"}}/>
              </div>

              {/* MBTI bar card */}
              <div style={{
                background:"rgba(10,16,32,0.68)", backdropFilter:"blur(20px)", WebkitBackdropFilter:"blur(20px)", border:"1px solid rgba(255,255,255,0.11)",
                borderRadius:14, padding:"1.5rem 1.5rem 1.5rem 1.75rem",
                boxShadow:T.shadow2, position:"relative", overflow:"hidden",
              }}>
                <div style={{position:"absolute",left:0,top:0,bottom:0,width:3,
                  background:`linear-gradient(to bottom,${T.purple},${T.amber})`,
                  boxShadow:`2px 0 12px ${T.purple}44`,borderRadius:"14px 0 0 14px",pointerEvents:"none"}}/>
                <canvas ref={mbtiRef} style={{width:"100%",height:280,display:"block"}}/>
              </div>
            </div>

            <hr className="section-divider"/>

            <div style={{marginBottom:"1rem"}}>
              <FilterPills options={["all","faker","markov"]} active={genFilter}
                onChange={setGenFilter} accentColor={T.purple}/>
            </div>

            <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:"1rem"}}>
              {filtered.map((r,i)=>(
                <ProfileCard key={r.session_id} r={r} index={i} visible={isVisible}/>
              ))}
            </div>
          </>
        )}
      </div>
    </section>
  );
}
