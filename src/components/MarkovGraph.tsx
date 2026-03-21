"use client";
import { useEffect, useRef, useState, useCallback } from "react";
import { LogEntry } from "@/lib/types";
import { SectionHeader, FilterPills, Loading, T } from "@/components/ui/shared";

interface Transition { from:string; to:string; weight:number; }
interface NodePos { x:number; y:number; }

function buildTransitions(logs:LogEntry[], site:string): Transition[] {
  const sessions: Record<string,string[]> = {};
  logs.filter(l=>l.site===site)
    .sort((a,b)=>a.timestamp<b.timestamp?-1:1)
    .forEach(l=>{
      const key=l.ip;
      if(!sessions[key]) sessions[key]=[];
      sessions[key].push(l.markov_state||l.attack_type);
    });
  const counts: Record<string,number> = {};
  Object.values(sessions).forEach(states=>{
    for(let i=0;i<states.length-1;i++){
      const key=`${states[i]}|||${states[i+1]}`;
      counts[key]=(counts[key]||0)+1;
    }
  });
  return Object.entries(counts)
    .map(([k,w])=>{ const[from,to]=k.split("|||"); return{from,to,weight:w}; })
    .sort((a,b)=>b.weight-a.weight);
}

function layoutNodes(nodes:string[], W:number, H:number): Record<string,NodePos> {
  const cx=W/2, cy=H/2, r=Math.min(W,H)*0.36;
  const pos: Record<string,NodePos> = {};
  nodes.forEach((n,i)=>{
    const angle=(i/nodes.length)*Math.PI*2-Math.PI/2;
    const jitter=0.82+(i%4)*0.06;
    pos[n]={ x:cx+Math.cos(angle)*r*jitter, y:cy+Math.sin(angle)*r*jitter };
  });
  return pos;
}

// Node colors — mapped to design system palette
const NODE_COLORS: Record<string,[string,string]> = {
  reconnaissance:       [T.cyan,   "#003d36"],
  env_probe:            [T.purple, "#2d1060"],
  aws_credential_probe: [T.amber,  "#3d2500"],
  credential_stuffing:  ["#38bdf8","#0c3460"],
  cms_attack:           [T.rose,   "#3d0a14"],
  framework_exploit:    ["#fb923c","#3d1a00"],
  api_key_probe:        ["#34d399","#0a3d22"],
  oauth_abuse:          ["#2dd4bf","#0a3030"],
  account_takeover:     [T.purple, "#2d1060"],
  token_exfiltration:   [T.rose,   "#3d0a14"],
};

function nc(name:string): [string,string] { return NODE_COLORS[name] ?? [T.muted,"#1a2a36"]; }

export function MarkovGraph() {
  const[logs,setLogs]         = useState<LogEntry[]>([]);
  const[loaded,setLoaded]     = useState(false);
  const[isVisible,setVisible] = useState(false);
  const[site,setSite]         = useState("site_a_developer");
  const[hoveredNode,setHov]   = useState<string|null>(null);
  const sectionRef=useRef<HTMLElement>(null);
  const canvasRef=useRef<HTMLCanvasElement>(null);
  const posRef=useRef<Record<string,NodePos>>({});
  const nodesRef=useRef<{name:string;r:number}[]>([]);

  useEffect(()=>{
    const obs=new IntersectionObserver(([e])=>{ if(e.isIntersecting) setVisible(true); },{threshold:0.05});
    if(sectionRef.current) obs.observe(sectionRef.current);
    return()=>obs.disconnect();
  },[]);

  useEffect(()=>{
    fetch("/data/honeypot_logs_markov.json").then(r=>r.json()).then(d=>{ setLogs(d); setLoaded(true); });
  },[]);

  const sites=Array.from(new Set(logs.map(l=>l.site)));

  const drawGraph=useCallback((highlighted:string|null=null)=>{
    const canvas=canvasRef.current; if(!canvas) return;
    const ctx=canvas.getContext("2d"); if(!ctx) return;
    const W=canvas.offsetWidth, H=canvas.offsetHeight;

    const transitions=buildTransitions(logs,site);
    const nodeSet=new Set<string>();
    transitions.forEach(t=>{ nodeSet.add(t.from); nodeSet.add(t.to); });
    const nodes=Array.from(nodeSet);
    const pos=layoutNodes(nodes,W,H);
    const maxW=transitions[0]?.weight||1;

    posRef.current=pos;
    nodesRef.current=nodes.map(n=>({
      name:n,
      r:10+transitions.filter(t=>t.from===n||t.to===n).length*2.5,
    }));

    ctx.clearRect(0,0,W,H);

    // Background
    const bgGrad=ctx.createRadialGradient(W*0.5,H*0.4,0,W*0.5,H*0.5,Math.max(W,H)*0.7);
    bgGrad.addColorStop(0,"#090f1e"); bgGrad.addColorStop(1,"#04060e");
    ctx.fillStyle=bgGrad; ctx.fillRect(0,0,W,H);

    // Subtle grid rings
    ctx.strokeStyle="rgba(255,255,255,0.03)"; ctx.lineWidth=1;
    [0.22,0.38].forEach(s=>{
      ctx.beginPath();
      ctx.ellipse(W/2,H/2,W*s,H*s*0.75,0,0,Math.PI*2);
      ctx.stroke();
    });

    // Edges
    transitions.slice(0,50).forEach(t=>{
      const from=pos[t.from], to=pos[t.to];
      if(!from||!to) return;
      const isRelated=highlighted&&(t.from===highlighted||t.to===highlighted);
      const alpha=highlighted?(isRelated?0.9:0.05):0.15+0.6*(t.weight/maxW);
      const width=highlighted?(isRelated?2.5:0.4):0.5+2.5*(t.weight/maxW);

      const[topFrom]=nc(t.from), [topTo]=nc(t.to);
      const mx=(from.x+to.x)/2+(to.y-from.y)*0.18;
      const my=(from.y+to.y)/2-(to.x-from.x)*0.18;

      const edgeGrad=ctx.createLinearGradient(from.x,from.y,to.x,to.y);
      edgeGrad.addColorStop(0,topFrom+Math.round(alpha*255).toString(16).padStart(2,"0"));
      edgeGrad.addColorStop(1,topTo+Math.round(alpha*255).toString(16).padStart(2,"0"));

      ctx.strokeStyle=edgeGrad; ctx.lineWidth=width;
      ctx.shadowColor=isRelated?topFrom:`rgba(0,255,224,${alpha*0.25})`;
      ctx.shadowBlur=isRelated?12:3;
      ctx.beginPath(); ctx.moveTo(from.x,from.y);
      ctx.quadraticCurveTo(mx,my,to.x,to.y);
      ctx.stroke(); ctx.shadowBlur=0;

      // Arrowhead
      const dx=to.x-mx, dy=to.y-my, len=Math.sqrt(dx*dx+dy*dy);
      if(len>0){
        const nodeR=nodesRef.current.find(n=>n.name===t.to)?.r??14;
        const ax=to.x-(dx/len)*nodeR, ay=to.y-(dy/len)*nodeR;
        const ang=Math.atan2(dy,dx);
        ctx.fillStyle=topTo+Math.round(alpha*255).toString(16).padStart(2,"0");
        ctx.beginPath();
        ctx.moveTo(ax,ay);
        ctx.lineTo(ax-8*Math.cos(ang-0.35),ay-8*Math.sin(ang-0.35));
        ctx.lineTo(ax-8*Math.cos(ang+0.35),ay-8*Math.sin(ang+0.35));
        ctx.closePath(); ctx.fill();
      }
    });

    // Node halos
    nodes.forEach(n=>{
      const{x,y}=pos[n];
      const[colTop]=nc(n);
      const deg=transitions.filter(t=>t.from===n||t.to===n).length;
      const nr=10+deg*2.5;
      const isHov=n===highlighted;
      const haloR=nr*(isHov?3.5:2.6);
      const haloGrad=ctx.createRadialGradient(x,y,0,x,y,haloR);
      haloGrad.addColorStop(0,colTop+(isHov?"55":"28"));
      haloGrad.addColorStop(1,"transparent");
      ctx.fillStyle=haloGrad;
      ctx.beginPath(); ctx.arc(x,y,haloR,0,Math.PI*2); ctx.fill();
    });

    // Nodes
    nodes.forEach(n=>{
      const{x,y}=pos[n];
      const[colTop,colBot]=nc(n);
      const deg=transitions.filter(t=>t.from===n||t.to===n).length;
      const nr=10+deg*2.5;
      const isHov=n===highlighted;
      const scale=isHov?1.18:1;

      // Sphere gradient
      const nodeGrad=ctx.createRadialGradient(x-nr*0.25,y-nr*0.25,0,x,y,nr*scale);
      nodeGrad.addColorStop(0,"rgba(255,255,255,0.7)");
      nodeGrad.addColorStop(0.25,colTop);
      nodeGrad.addColorStop(1,colBot);

      ctx.fillStyle=nodeGrad;
      ctx.shadowColor=colTop; ctx.shadowBlur=isHov?28:16;
      ctx.beginPath(); ctx.arc(x,y,nr*scale,0,Math.PI*2); ctx.fill();

      // Rim
      ctx.strokeStyle=isHov?"rgba(255,255,255,0.6)":colTop+"bb";
      ctx.lineWidth=isHov?2:1.2; ctx.shadowBlur=0;
      ctx.stroke();

      // Specular
      ctx.fillStyle="rgba(255,255,255,0.22)";
      ctx.beginPath();
      ctx.ellipse(x-nr*0.28,y-nr*0.28,nr*0.32,nr*0.2,-0.4,0,Math.PI*2);
      ctx.fill();

      // Label
      ctx.fillStyle=isHov?"#fff":T.textDim;
      ctx.font=`${isHov?"bold ":""}11px ${T.mono}`;
      ctx.textAlign="center"; ctx.textBaseline="bottom";
      ctx.shadowColor="rgba(0,0,0,0.9)"; ctx.shadowBlur=5;
      ctx.fillText(n.replace(/_/g," ").slice(0,16),x,y-nr*scale-5);
      ctx.shadowBlur=0;
    });
  },[logs,site]);

  useEffect(()=>{
    if(!loaded||!isVisible) return;
    const canvas=canvasRef.current; if(!canvas) return;
    const dpr=window.devicePixelRatio||1;
    canvas.width=canvas.offsetWidth*dpr; canvas.height=canvas.offsetHeight*dpr;
    const ctx=canvas.getContext("2d"); if(!ctx) return;
    ctx.scale(dpr,dpr);
    drawGraph(null);
  },[loaded,isVisible,logs,site,drawGraph]);

  const handleMouseMove=useCallback((e:React.MouseEvent<HTMLCanvasElement>)=>{
    const canvas=canvasRef.current; if(!canvas) return;
    const rect=canvas.getBoundingClientRect();
    const dpr=window.devicePixelRatio||1;
    const mx=(e.clientX-rect.left)*(canvas.width/rect.width/dpr);
    const my=(e.clientY-rect.top)*(canvas.height/rect.height/dpr);
    let found:string|null=null;
    for(const{name,r} of nodesRef.current){
      const p=posRef.current[name];
      if(p&&Math.hypot(mx-p.x,my-p.y)<=r*1.4){ found=name; break; }
    }
    if(found!==hoveredNode){
      setHov(found);
      canvas.style.cursor=found?"pointer":"default";
      const ctx=canvas.getContext("2d"); if(!ctx) return;
      ctx.clearRect(0,0,canvas.width/dpr,canvas.height/dpr);
      drawGraph(found);
    }
  },[hoveredNode,drawGraph]);

  const handleMouseLeave=useCallback(()=>{
    if(!hoveredNode) return;
    setHov(null);
    const canvas=canvasRef.current; if(!canvas) return;
    const dpr=window.devicePixelRatio||1;
    canvas.style.cursor="default";
    const ctx=canvas.getContext("2d"); if(!ctx) return;
    ctx.clearRect(0,0,canvas.width/dpr,canvas.height/dpr);
    drawGraph(null);
  },[hoveredNode,drawGraph]);

  const transitions=loaded?buildTransitions(logs,site):[];

  return(
    <section id="markovgraph" ref={sectionRef}
      style={{padding:"6rem 3rem",position:"relative",zIndex:1}}>
      <div style={{maxWidth:1200,margin:"0 auto"}}>
        <SectionHeader tag="Graph Theory"
          title={<>Markov State{" "}<span style={{
            background:`linear-gradient(135deg,${T.amber},${T.cyan})`,
            WebkitBackgroundClip:"text",WebkitTextFillColor:"transparent",backgroundClip:"text",
          }}>Graph</span></>}
          subtitle="Attack session flow visualization using graph theory — built from real log sequences"
          tagColor={T.amber} visible={isVisible}/>

        {!loaded?<Loading/>:(
          <>
            <div style={{marginBottom:"1.5rem"}}>
              <FilterPills options={sites} active={site} onChange={setSite} accentColor={T.amber}/>
            </div>

            {/* Graph canvas card */}
            <div style={{
              background:"rgba(10,16,32,0.68)", backdropFilter:"blur(20px)", WebkitBackdropFilter:"blur(20px)", border:"1px solid rgba(255,255,255,0.11)",
              borderRadius:14, overflow:"hidden", marginBottom:"1.25rem",
              opacity:isVisible?1:0, transition:"all 0.7s ease 0.15s",
              position:"relative",
              boxShadow:`${T.shadow3},0 0 60px rgba(245,166,35,0.04)`,
            }}>
              {/* Gradient left border */}
              <div style={{
                position:"absolute",left:0,top:0,bottom:0,width:3,
                background:`linear-gradient(to bottom,${T.amber},${T.cyan})`,
                boxShadow:`2px 0 12px ${T.amber}44`,
                borderRadius:"14px 0 0 14px",pointerEvents:"none",zIndex:2,
              }}/>
              <div style={{
                position:"absolute",top:12,right:16,zIndex:2,
                fontFamily:T.mono,fontSize:11,
                color:"rgba(144,164,186,0.45)",letterSpacing:"0.08em",
                pointerEvents:"none",
              }}>
                HOVER NODE TO HIGHLIGHT PATHS
              </div>
              <canvas ref={canvasRef}
                style={{width:"100%",height:480,display:"block"}}
                onMouseMove={handleMouseMove}
                onMouseLeave={handleMouseLeave}/>
            </div>

            {/* Top transitions table */}
            <div style={{
              background:"rgba(10,16,32,0.68)", backdropFilter:"blur(20px)", WebkitBackdropFilter:"blur(20px)", border:"1px solid rgba(255,255,255,0.11)",
              borderRadius:14, padding:"1.5rem 1.5rem 1.5rem 1.75rem",
              boxShadow:T.shadow2,
              opacity:isVisible?1:0, transition:"all 0.7s ease 0.25s",
              position:"relative", overflow:"hidden",
            }}>
              {/* Gradient left border */}
              <div style={{
                position:"absolute",left:0,top:0,bottom:0,width:3,
                background:`linear-gradient(to bottom,${T.cyan},${T.amber})`,
                boxShadow:`2px 0 12px ${T.cyan}44`,
                borderRadius:"14px 0 0 14px",pointerEvents:"none",
              }}/>

              <div style={{fontFamily:T.mono,fontSize:11,fontWeight:700,color:T.muted,
                letterSpacing:"0.09em",textTransform:"uppercase",marginBottom:"1rem"}}>
                Top Transitions{" "}
                <span style={{color:T.muted,fontWeight:400}}>top 15 · by count · {site}</span>
              </div>

              <table className="data-table">
                <thead><tr>
                  <th>From</th><th>To</th>
                  <th style={{textAlign:"right"}}>Count</th><th>Weight</th>
                </tr></thead>
                <tbody>
                  {transitions.slice(0,15).map((t,i)=>{
                    const[colFrom]=nc(t.from), [colTo]=nc(t.to);
                    return(<tr key={i}>
                      <td><span style={{color:colFrom,fontFamily:T.mono,fontSize:11}}>{t.from.replace(/_/g," ")}</span></td>
                      <td><span style={{color:colTo,fontFamily:T.mono,fontSize:11}}>{t.to.replace(/_/g," ")}</span></td>
                      <td style={{textAlign:"right",fontFamily:T.mono,color:T.amber}}>{t.weight}</td>
                      <td style={{width:140}}>
                        <div style={{height:4,background:"rgba(255,255,255,0.06)",borderRadius:2,overflow:"hidden"}}>
                          <div style={{
                            height:"100%",
                            width:`${(t.weight/transitions[0].weight)*100}%`,
                            background:`linear-gradient(to right,${colFrom},${colTo})`,
                            boxShadow:`0 0 6px ${colFrom}88`,
                            transition:"width 1s ease",
                          }}/>
                        </div>
                      </td>
                    </tr>);
                  })}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>
    </section>
  );
}
