"use client";
import { useEffect, useState, useRef, useMemo, useCallback } from "react";
import { LogEntry } from "@/lib/types";
import { SectionHeader, FilterPills, Loading, T } from "@/components/ui/shared";

// ── Attack color palette ──────────────────────────────────────────────────────
const GRAD: Record<string,[string,string]> = {
  reconnaissance:       [T.cyan,    "#003d36"],
  env_probe:            [T.purple,  "#2d1060"],
  aws_credential_probe: [T.amber,   "#3d2500"],
  credential_stuffing:  ["#38bdf8", "#0c3460"],
  cms_attack:           [T.rose,    "#3d0a14"],
  framework_exploit:    ["#fb923c", "#3d1a00"],
  api_key_probe:        ["#34d399", "#0a3d22"],
  pii_scraping:         ["#f472b6", "#3d0a28"],
  payment_probe:        [T.amber,   "#3d2500"],
  oauth_abuse:          ["#2dd4bf", "#0a3030"],
  account_takeover:     [T.purple,  "#2d1060"],
  token_exfiltration:   [T.rose,    "#3d0a14"],
  lateral_movement:     ["#c084fc", "#2d1060"],
  scraping:             ["#38bdf8", "#0c3460"],
  data_exfiltration:    [T.rose,    "#3d0a14"],
  brute_force:          ["#fb923c", "#3d1a00"],
  sql_injection:        [T.cyan,    "#003d36"],
  jwt_attack:           [T.amber,   "#3d2500"],
  unknown:              ["#4a6278", "#1a2a36"],
};
function gp(a: string): [string,string] { return GRAD[a] ?? ["#4a6278","#1a2a36"]; }

// ── Tooltip ───────────────────────────────────────────────────────────────────
interface Tip { x:number; y:number; lines:string[]; on:boolean; }
const NO_TIP: Tip = { x:0, y:0, lines:[], on:false };

function Tooltip({ tip, W, H }: { tip:Tip; W:number; H:number }) {
  if (!tip.on) return null;
  return (
    <div style={{
      position:"absolute",
      left:`${(tip.x/W)*100}%`, top:`${(tip.y/H)*100}%`,
      transform:"translate(-50%,-110%)", pointerEvents:"none",
      background:"rgba(6,9,20,0.97)",
      border:`1px solid rgba(0,255,224,0.22)`,
      borderRadius:8, padding:"8px 13px",
      fontFamily:T.mono, fontSize:11, color:T.text,
      whiteSpace:"nowrap", zIndex:20,
      boxShadow:"0 8px 32px rgba(0,0,0,0.7),0 0 20px rgba(0,255,224,0.07)",
    }}>
      {tip.lines.map((l,i)=>(
        <div key={i} style={{
          color:[T.cyan,T.textDim,T.amber][i]??T.textDim,
          lineHeight:1.6,
        }}>{l}</div>
      ))}
    </div>
  );
}

// ── ChartCard ─────────────────────────────────────────────────────────────────
function ChartCard({
  children, accent=T.cyan, style={},
}: { children:React.ReactNode; accent?:string; style?:React.CSSProperties }) {
  const barGrad =
    accent===T.cyan    ? `linear-gradient(to bottom,${T.cyan},${T.purple})`
    : accent===T.purple ? `linear-gradient(to bottom,${T.purple},${T.cyan})`
    : accent===T.amber  ? `linear-gradient(to bottom,${T.amber},${T.purple})`
    : accent===T.rose   ? `linear-gradient(to bottom,${T.rose},${T.amber})`
    :                     `linear-gradient(to bottom,${accent},${T.purple})`;

  return (
    <div style={{
      background:"rgba(10,16,32,0.68)",
      backdropFilter:"blur(20px)", WebkitBackdropFilter:"blur(20px)",
      border:"1px solid rgba(255,255,255,0.11)",
      borderRadius:14, padding:"1.5rem 1.5rem 1.5rem 1.75rem",
      boxShadow:"0 4px 24px rgba(0,0,0,0.45),0 0 0 1px rgba(255,255,255,0.06)",
      position:"relative", overflow:"hidden",
      transition:"box-shadow 0.3s ease,border-color 0.3s ease",
      ...style,
    }}
    onMouseEnter={e=>{
      const el=e.currentTarget as HTMLElement;
      el.style.boxShadow=`0 8px 40px rgba(0,0,0,0.55),0 0 0 1px ${accent}28`;
      el.style.borderColor=`${accent}28`;
    }}
    onMouseLeave={e=>{
      const el=e.currentTarget as HTMLElement;
      el.style.boxShadow="0 4px 24px rgba(0,0,0,0.45),0 0 0 1px rgba(255,255,255,0.06)";
      el.style.borderColor="rgba(255,255,255,0.11)";
    }}>
      <div style={{
        position:"absolute", left:0, top:0, bottom:0, width:3,
        background:barGrad, boxShadow:`2px 0 14px ${accent}55`,
        borderRadius:"14px 0 0 14px", pointerEvents:"none",
      }}/>
      {children}
    </div>
  );
}

function CT({ children }: { children:React.ReactNode }) {
  return (
    <div style={{
      fontFamily:T.mono, fontSize:11, fontWeight:700, color:T.muted,
      letterSpacing:"0.09em", textTransform:"uppercase" as const,
      marginBottom:"1rem",
    }}>{children}</div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// Chart 1 — Stacked Bar
// ══════════════════════════════════════════════════════════════════════════════
function StackedBar({ logs }: { logs:LogEntry[] }) {
  const svgRef = useRef<SVGSVGElement>(null);
  const [tip,setTip]   = useState<Tip>(NO_TIP);
  const [hover,setHov] = useState("");

  const W=560, H=320, pL=44, pR=16, pT=16, pB=72;
  const cH=H-pT-pB;

  const { sites, attacks, mat, maxTot } = useMemo(()=>{
    const sites   = Array.from(new Set(logs.map(l=>l.site)));
    const attacks = Array.from(new Set(logs.map(l=>l.attack_type)));
    const mat:Record<string,Record<string,number>> = {};
    sites.forEach(s=>{ mat[s]={}; attacks.forEach(a=>{ mat[s][a]=0; }); });
    logs.forEach(l=>{ mat[l.site][l.attack_type]++; });
    const totals=sites.map(s=>attacks.reduce((n,a)=>n+mat[s][a],0));
    return { sites, attacks, mat, maxTot:Math.max(...totals,1) };
  },[logs]);

  const slotW=(W-pL-pR)/Math.max(sites.length,1);
  const barW=Math.min(56,slotW*0.5);

  return (
    <div style={{position:"relative"}}>
      <svg ref={svgRef} viewBox={`0 0 ${W} ${H}`} width="100%"
        style={{display:"block",overflow:"visible"}}>
        <defs>
          {attacks.map(a=>{
            const[top,bot]=gp(a);
            return(
              <linearGradient key={a} id={`sb-${a}`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={top}/>
                <stop offset="100%" stopColor={bot}/>
              </linearGradient>
            );
          })}
          <filter id="bar-glow" x="-40%" y="-20%" width="180%" height="140%">
            <feGaussianBlur stdDeviation="5" result="b"/>
            <feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge>
          </filter>
        </defs>

        {[0.25,0.5,0.75,1].map(t=>{
          const y=pT+cH-t*cH;
          return(
            <g key={t}>
              <line x1={pL} y1={y} x2={W-pR} y2={y}
                stroke="rgba(255,255,255,0.05)" strokeWidth={0.5} strokeDasharray="3 4"/>
              <text x={pL-8} y={y+4} fontFamily={T.mono} fontSize={11}
                fill={T.muted} textAnchor="end">
                {Math.round(t*maxTot)}
              </text>
            </g>
          );
        })}
        <line x1={pL} y1={pT+cH} x2={W-pR} y2={pT+cH}
          stroke="rgba(255,255,255,0.08)" strokeWidth={0.5}/>

        {sites.map((site,si)=>{
          const cx=pL+si*slotW+slotW/2, x=cx-barW/2;
          const total=attacks.reduce((n,a)=>n+mat[site][a],0);
          let curY=pT+cH;
          const segs=attacks.map(a=>({a,v:mat[site][a]}))
            .filter(d=>d.v>0).sort((a,b)=>b.v-a.v);

          return(
            <g key={site}>
              {segs.map(({a,v},idx)=>{
                const segH=(v/maxTot)*cH;
                const key=`${site}::${a}`, isHov=hover===key;
                const [top]=gp(a); const y0=curY-segH;
                curY-=segH;
                return(
                  <g key={a} style={{cursor:"pointer"}}
                    onMouseEnter={e=>{
                      setHov(key);
                      const r=svgRef.current!.getBoundingClientRect();
                      setTip({
                        x:((e.clientX-r.left)/r.width)*W,
                        y:((e.clientY-r.top)/r.height)*H-12,
                        on:true,
                        lines:[
                          site.replace("site_","").replace(/_/g," "),
                          a.replace(/_/g," "),
                          `${v.toLocaleString()} requests`,
                        ],
                      });
                    }}
                    onMouseLeave={()=>{ setHov(""); setTip(NO_TIP); }}>
                    {/* Hover highlight — plain rect, no rounded */}
                    {isHov && (
                      <rect x={x-3} y={y0-2} width={barW+6} height={segH+4}
                        fill={top} opacity={0.14}/>
                    )}
                    {/* Bar — plain rectangle, gradient fill only */}
                    <rect x={x} y={y0} width={barW} height={segH}
                      fill={`url(#sb-${a})`}
                      opacity={isHov?1:0.88}/>
                    {/* Segment divider line */}
                    {idx>0 && (
                      <line x1={x} y1={y0} x2={x+barW} y2={y0}
                        stroke="rgba(4,6,14,0.6)" strokeWidth={1}/>
                    )}
                  </g>
                );
              })}

              <text x={cx} y={pT+cH+18} textAnchor="middle"
                fontFamily={T.mono} fontSize={11} fill={T.muted}>
                {site.replace("site_","").replace(/_/g," ")}
              </text>
              <text x={cx} y={pT+cH+33} textAnchor="middle"
                fontFamily={T.mono} fontSize={11} fill={T.muted}>
                {total.toLocaleString()}
              </text>
            </g>
          );
        })}
      </svg>

      <Tooltip tip={tip} W={W} H={H}/>

      <div style={{display:"flex",flexWrap:"wrap",gap:"4px 10px",marginTop:10}}>
        {attacks.map(a=>{
          const [top]=gp(a);
          return(
            <div key={a} style={{
              display:"flex", alignItems:"center", gap:5,
              fontFamily:T.mono, fontSize:11, color:T.muted,
            }}>
              <div style={{
                width:8, height:8, borderRadius:2,
                background:`linear-gradient(135deg,${top},${gp(a)[1]})`,
                boxShadow:`0 0 6px ${top}66`, flexShrink:0,
              }}/>
              {a.replace(/_/g," ")}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// Chart 2 — Canvas 3D Isometric Donut
// ══════════════════════════════════════════════════════════════════════════════
const DONUT_COLORS: [string, string][] = [
  [T.cyan,    "#006655"],
  [T.purple,  "#4c1d95"],
  [T.amber,   "#92400e"],
  [T.rose,    "#9f1239"],
  ["#38bdf8", "#075985"],
  ["#34d399", "#065f46"],
  ["#fb923c", "#9a3412"],
  ["#f472b6", "#9d174d"],
  ["#a78bfa", "#4c1d95"],
];

function GradDonut({ logs }: { logs: LogEntry[] }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const hovRef    = useRef<number>(-1);
  const rafRef    = useRef<number>(0);
  const [hovIdx, setHovIdx] = useState(-1);
  const [tipData, setTipData] = useState<{
    x:number; y:number; code:string; count:number; pct:number; on:boolean;
  }>({ x:0, y:0, code:"", count:0, pct:0, on:false });

  const slices = useMemo(() => {
    const counts: Record<string,number> = {};
    logs.forEach(l => { const s = String(l.status); counts[s] = (counts[s]||0)+1; });
    const total = Object.values(counts).reduce((a,b)=>a+b,0);
    return Object.entries(counts).sort((a,b)=>b[1]-a[1])
      .map(([code,count],i) => ({
        code, count, pct: count/total,
        top: DONUT_COLORS[i%DONUT_COLORS.length][0],
        bot: DONUT_COLORS[i%DONUT_COLORS.length][1],
      }));
  }, [logs]);

  const total = slices.reduce((s,sl)=>s+sl.count, 0);

  const draw = useCallback(() => {
    const canvas = canvasRef.current; if (!canvas) return;
    const ctx = canvas.getContext("2d"); if (!ctx) return;
    const dpr = window.devicePixelRatio || 1;
    const W = canvas.width/dpr, H = canvas.height/dpr;

    ctx.clearRect(0, 0, W, H);

    // ── Isometric donut parameters ──────────────────────────────────────────
    const cx = W * 0.40;   // shifted left to give legend space on right
    const cy = H * 0.50;
    const RX  = W * 0.28;
    const RY  = RX * 0.40;
    const ri  = 0.52;
    const DEPTH = 20;
    const GAP = 0.022;

    // Build slice angles
    let ang = -Math.PI / 2;
    const segs = slices.map(sl => {
      const a1 = ang + GAP/2;
      const a2 = ang + sl.pct * Math.PI*2 - GAP/2;
      ang += sl.pct * Math.PI*2;
      return { ...sl, a1, a2, mid: (a1+a2)/2 };
    });

    // Ellipse point helper
    const ep = (a: number, r: number, dy=0): [number,number] =>
      [cx + Math.cos(a)*RX*r, cy + Math.sin(a)*RY*r + dy];

    // ── Draw order: bottom-half side walls first, then top faces, then top-half walls ──

    // Helper: draw one slice's 3D side wall
    const drawWall = (seg: typeof segs[0], hov: boolean) => {
      const { a1, a2, top, bot, mid } = seg;
      // Only draw the bottom arc portion (angles where sin > 0 = front-facing)
      // Clamp to visible front half
      const frontA1 = Math.max(a1, 0);
      const frontA2 = Math.min(a2, Math.PI);
      if (frontA1 >= frontA2) return;

      const STEPS = 32;
      const da = (frontA2 - frontA1) / STEPS;

      // Outer wall
      ctx.beginPath();
      for (let s = 0; s <= STEPS; s++) {
        const a = frontA1 + s*da;
        const [x,y] = ep(a, 1.0);
        s===0 ? ctx.moveTo(x, y+DEPTH) : ctx.lineTo(x, y+DEPTH);
      }
      for (let s = STEPS; s >= 0; s--) {
        const a = frontA1 + s*da;
        const [x,y] = ep(a, 1.0);
        ctx.lineTo(x, y);
      }
      ctx.closePath();

      const wallGrad = ctx.createLinearGradient(
        cx, cy+DEPTH, cx, cy-RY
      );
      wallGrad.addColorStop(0, bot+"cc");
      wallGrad.addColorStop(1, top+"88");
      ctx.fillStyle = wallGrad;
      ctx.fill();

      // Inner wall (darker, recessed)
      ctx.beginPath();
      for (let s = 0; s <= STEPS; s++) {
        const a = frontA1 + s*da;
        const [x,y] = ep(a, ri);
        s===0 ? ctx.moveTo(x, y+DEPTH) : ctx.lineTo(x, y+DEPTH);
      }
      for (let s = STEPS; s >= 0; s--) {
        const a = frontA1 + s*da;
        const [x,y] = ep(a, ri);
        ctx.lineTo(x, y);
      }
      ctx.closePath();
      ctx.fillStyle = bot+"99";
      ctx.fill();
    };

    // Helper: draw top face of one slice
    const drawTop = (seg: typeof segs[0], hov: boolean) => {
      const { a1, a2, top, bot, mid } = seg;
      const STEPS = 48;
      const da = (a2-a1)/STEPS;
      const lift = hov ? -8 : 0;

      ctx.beginPath();
      // Outer arc
      for (let s=0; s<=STEPS; s++) {
        const a = a1+s*da;
        const [x,y] = ep(a, 1.0, lift);
        s===0 ? ctx.moveTo(x,y) : ctx.lineTo(x,y);
      }
      // Inner arc (reverse)
      for (let s=STEPS; s>=0; s--) {
        const a = a1+s*da;
        const [x,y] = ep(a, ri, lift);
        ctx.lineTo(x,y);
      }
      ctx.closePath();

      // Gradient: lighter near top-left (light source), darker toward bottom
      const [lx,ly] = ep(mid-0.4, 0.76, lift);
      const [dx,dy] = ep(mid+0.4, 0.76, lift);
      const faceGrad = ctx.createLinearGradient(lx-RX*0.3, ly-RY, dx+RX*0.1, dy+RY*0.5);
      faceGrad.addColorStop(0, top+"ff");
      faceGrad.addColorStop(0.5, top+"dd");
      faceGrad.addColorStop(1, bot+"cc");
      ctx.fillStyle = faceGrad;

      ctx.shadowColor = hov ? top : "transparent";
      ctx.shadowBlur  = hov ? 24 : 0;
      ctx.fill();
      ctx.shadowBlur = 0;

      // Top highlight — subtle bright rim
      ctx.beginPath();
      for (let s=0; s<=STEPS; s++) {
        const a = a1+s*da;
        const [x,y] = ep(a, 1.0, lift);
        s===0 ? ctx.moveTo(x,y) : ctx.lineTo(x,y);
      }
      for (let s=STEPS; s>=0; s--) {
        const a = a1+s*da;
        const [x,y] = ep(a, ri, lift);
        ctx.lineTo(x,y);
      }
      ctx.closePath();
      ctx.strokeStyle = "rgba(255,255,255,0.18)";
      ctx.lineWidth = 1;
      ctx.stroke();

      // Percentage label
      if (seg.pct > 0.07) {
        const labelR = (1+ri)/2;
        const [lbx,lby] = ep(mid, labelR, lift-4);
        ctx.fillStyle = "rgba(255,255,255,0.95)";
        ctx.font = `700 12px ${T.mono}`;
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.shadowColor = "rgba(0,0,0,0.8)";
        ctx.shadowBlur = 5;
        ctx.fillText(`${(seg.pct*100).toFixed(0)}%`, lbx, lby);
        ctx.shadowBlur = 0;
      }
    };

    // ── Draw pass 1: walls (behind top faces) ─────────────────────────
    segs.forEach(seg => drawWall(seg, false));

    // ── Draw pass 2: top faces (back to front by mid angle) ──────────
    [...segs].sort((a,b)=> {
      // Draw back slices first (smaller sin = further back)
      const ay = Math.sin(a.mid), by2 = Math.sin(b.mid);
      return ay - by2;
    }).forEach(seg => {
      const hov = hovRef.current === segs.indexOf(seg);
      drawTop(seg, hov);
    });

    // ── Center hole — dark ellipse, NO text ────────────────────────
    ctx.beginPath();
    ctx.ellipse(cx, cy, RX*ri, RY*ri, 0, 0, Math.PI*2);
    const holeGrad = ctx.createRadialGradient(cx-RX*ri*0.2, cy-RY*ri*0.2, 0, cx, cy, RX*ri);
    holeGrad.addColorStop(0, "#1a2540");
    holeGrad.addColorStop(1, "#080d18");
    ctx.fillStyle = holeGrad;
    ctx.fill();
    ctx.strokeStyle = "rgba(255,255,255,0.05)";
    ctx.lineWidth = 1;
    ctx.stroke();

    // ── Total below the donut ─────────────────────────────────────
    const bottomY = cy + RY + DEPTH + 18;
    ctx.textAlign = "center";
    ctx.textBaseline = "top";
    ctx.fillStyle = T.muted;
    ctx.font = `11px ${T.mono}`;
    ctx.fillText("TOTAL REQUESTS", cx, bottomY);
    ctx.fillStyle = T.text;
    ctx.font = `700 20px ${T.display}`;
    ctx.fillText(total.toLocaleString(), cx, bottomY + 16);

    // ── Legend — right side, properly aligned ─────────────────────
    const legX = W * 0.73;
    const legStartY = H * 0.08;
    const legStep = (H * 0.86) / Math.max(slices.length, 1);

    slices.forEach((sl, i) => {
      const lx = legX;
      const ly = legStartY + i * legStep + legStep*0.5;
      const isHov = hovRef.current === i;
      const col = isHov ? sl.top : sl.top+"cc";

      // Swatch
      ctx.beginPath();
      ctx.roundRect(lx, ly-5, 10, 10, 2);
      ctx.fillStyle = col;
      ctx.shadowColor = isHov ? sl.top : "transparent";
      ctx.shadowBlur  = isHov ? 8 : 0;
      ctx.fill();
      ctx.shadowBlur = 0;

      // Code
      ctx.fillStyle = isHov ? sl.top : T.muted;
      ctx.font = `${isHov?"700 ":""}12px ${T.mono}`;
      ctx.textAlign = "left";
      ctx.textBaseline = "middle";
      ctx.fillText(sl.code, lx+16, ly);

      // Pct
      ctx.fillStyle = isHov ? T.amber : T.dim;
      ctx.textAlign = "right";
      ctx.fillText(`${(sl.pct*100).toFixed(0)}%`, lx+78, ly);
    });

  }, [slices, total, hovIdx]);

  useEffect(() => {
    const canvas = canvasRef.current; if (!canvas) return;
    const dpr = window.devicePixelRatio || 1;
    canvas.width  = canvas.offsetWidth  * dpr;
    canvas.height = canvas.offsetHeight * dpr;
    const ctx = canvas.getContext("2d"); if (!ctx) return;
    ctx.scale(dpr, dpr);
    draw();
  }, [slices, hovIdx, draw]);

  const handleMouseMove = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current; if (!canvas) return;
    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    const mx = (e.clientX - rect.left);
    const my = (e.clientY - rect.top);

    const W = canvas.width/dpr, H = canvas.height/dpr;
    const cx = W*0.42, cy = H*0.52;
    const RX = W*0.30, RY = RX*0.38;
    const ri = 0.52;

    // Check legend hover first
    const legX = W*0.73, legStartY = H*0.08;
    const legStep = (H*0.82)/Math.max(slices.length,1);
    let found = -1;

    for (let i=0; i<slices.length; i++) {
      const ly = legStartY + i*legStep + legStep*0.5;
      if (mx>=legX && mx<=legX+80 && Math.abs(my-ly)<legStep*0.5) {
        found=i; break;
      }
    }

    // Check donut hover
    if (found===-1) {
      const dx=mx-cx, dy=my-cy;
      // Normalize to circle space
      const nx=dx/RX, ny=dy/RY;
      const dist=Math.sqrt(nx*nx+ny*ny);
      if (dist>=ri && dist<=1.0) {
        const ang=Math.atan2(ny*RY/RX, nx);
        // Build slice angles again quickly
        let a = -Math.PI/2;
        for (let i=0; i<slices.length; i++) {
          const a1=a+0.011, a2=a+slices[i].pct*Math.PI*2-0.011;
          a += slices[i].pct*Math.PI*2;
          // Normalize angle
          let checkAng = ang;
          while (checkAng < a1 - Math.PI*2) checkAng += Math.PI*2;
          while (checkAng > a1 + Math.PI*2) checkAng -= Math.PI*2;
          if (checkAng>=a1 && checkAng<=a2) { found=i; break; }
          if (checkAng+Math.PI*2>=a1 && checkAng+Math.PI*2<=a2) { found=i; break; }
        }
      }
    }

    if (found !== hovRef.current) {
      hovRef.current = found;
      setHovIdx(found);
      canvas.style.cursor = found>=0 ? "pointer" : "default";
    }

    if (found>=0) {
      setTipData({
        x: mx, y: my,
        code: slices[found].code,
        count: slices[found].count,
        pct: slices[found].pct,
        on: true,
      });
    } else {
      setTipData(d=>({...d, on:false}));
    }
  }, [slices]);

  const handleMouseLeave = useCallback(() => {
    hovRef.current = -1;
    setHovIdx(-1);
    setTipData(d=>({...d, on:false}));
  }, []);

  return (
    <div style={{ position:"relative" }}>
      <canvas ref={canvasRef}
        style={{ width:"100%", height:300, display:"block", borderRadius:8 }}
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
      />
      {tipData.on && (
        <div style={{
          position:"absolute",
          left: tipData.x, top: tipData.y,
          transform:"translate(-50%,-120%)",
          pointerEvents:"none",
          background:"rgba(6,9,20,0.97)",
          border:`1px solid rgba(0,255,224,0.22)`,
          borderRadius:8, padding:"8px 13px",
          fontFamily:T.mono, fontSize:11, color:T.text,
          whiteSpace:"nowrap", zIndex:20,
          boxShadow:"0 8px 32px rgba(0,0,0,0.7)",
        }}>
          <div style={{color:T.cyan,lineHeight:1.6}}>HTTP {tipData.code}</div>
          <div style={{color:T.textDim,lineHeight:1.6}}>{tipData.count.toLocaleString()} req</div>
          <div style={{color:T.amber,lineHeight:1.6}}>{(tipData.pct*100).toFixed(1)}%</div>
        </div>
      )}
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// Chart 3 — Canvas Bubble (animated, sphere quality)
// ══════════════════════════════════════════════════════════════════════════════
interface BubbleData {
  attack: string; count: number; norm: number;
  x: number; y: number; r: number;
  ox: number; oy: number;
}

function GlowBubble({ logs }: { logs:LogEntry[] }) {
  const canvasRef  = useRef<HTMLCanvasElement>(null);
  const rafRef     = useRef<number>(0);
  const bubblesRef = useRef<BubbleData[]>([]);
  const hovRef     = useRef<string>("");
  const [hovTip, setHovTip] = useState<{
    name:string; count:number; norm:number; px:number; py:number; on:boolean;
  }>({ name:"", count:0, norm:0, px:0, py:0, on:false });

  const data = useMemo(()=>{
    const counts:Record<string,number>={};
    logs.forEach(l=>{ counts[l.attack_type]=(counts[l.attack_type]||0)+1; });
    return Object.entries(counts).sort((a,b)=>b[1]-a[1]);
  },[logs]);

  // Layout bubbles once data changes
  const layout = useCallback((W:number, H:number)=>{
    const MIN_R=16, MAX_R=52;
    const maxV=data[0]?.[1]||1;
    const placed:{x:number;y:number;r:number}[]=[];
    const bubbles:BubbleData[]=[];

    data.forEach(([attack,count],i)=>{
      const norm=count/maxV;
      const r=MIN_R+norm*(MAX_R-MIN_R);
      let bx=W/2, by=H/2, t=0, ok=false;

      while (!ok && t<5000) {
        const angle=(i/data.length)*Math.PI*2+t*0.18;
        const dist=30+t*1.4;
        bx=W/2+Math.cos(angle)*dist;
        by=H/2+Math.sin(angle)*dist*0.75;
        if (
          bx-r>8 && bx+r<W-8 && by-r>8 && by+r<H-8 &&
          placed.every(p=>Math.hypot(bx-p.x,by-p.y)>=r+p.r+8)
        ) { ok=true; }
        t++;
      }
      placed.push({x:bx,y:by,r});
      bubbles.push({ attack,count,norm,x:bx,y:by,r,ox:bx,oy:by });
    });
    bubblesRef.current=bubbles;
  },[data]);

  const draw = useCallback((ts:number)=>{
    const canvas=canvasRef.current; if (!canvas) return;
    const ctx=canvas.getContext("2d"); if (!ctx) return;
    const dpr=window.devicePixelRatio||1;
    const W=canvas.width/dpr, H=canvas.height/dpr;
    const t=ts*0.001;

    ctx.clearRect(0,0,W,H);

    // Subtle bg
    const bg=ctx.createRadialGradient(W*.5,H*.4,0,W*.5,H*.5,Math.max(W,H)*.65);
    bg.addColorStop(0,"rgba(12,18,34,0.0)");
    bg.addColorStop(1,"rgba(4,6,14,0.0)");
    ctx.fillStyle=bg; ctx.fillRect(0,0,W,H);

    const hov=hovRef.current;

    // Drift
    bubblesRef.current.forEach(b=>{
      b.x=b.ox+Math.sin(t*0.5+b.oy*0.012)*5;
      b.y=b.oy+Math.cos(t*0.4+b.ox*0.012)*3.5;
    });

    // Draw back→front
    [...bubblesRef.current].sort((a,b)=>a.r-b.r).forEach(b=>{
      const {x,y,r,attack,norm}=b;
      const isHov=hov===attack;
      const [top,bot]=gp(attack);
      const sr=r*(isHov?1.12:1);

      // Outer halo glow
      const haloR=sr*(isHov?2.6:2.0);
      const halo=ctx.createRadialGradient(x,y,sr*0.4,x,y,haloR);
      halo.addColorStop(0,top+(isHov?"66":"33"));
      halo.addColorStop(1,"transparent");
      ctx.globalAlpha=isHov?0.85:0.5;
      ctx.beginPath(); ctx.arc(x,y,haloR,0,Math.PI*2);
      ctx.fillStyle=halo; ctx.fill();
      ctx.globalAlpha=1;

      // Sphere — 3-stop radial gradient for depth
      const sphere=ctx.createRadialGradient(
        x-sr*0.3, y-sr*0.32, 0,
        x, y, sr
      );
      sphere.addColorStop(0,"rgba(255,255,255,0.75)");
      sphere.addColorStop(0.18,top);
      sphere.addColorStop(0.6,bot);
      sphere.addColorStop(1,bot+"bb");

      ctx.shadowColor=top;
      ctx.shadowBlur=isHov?32:20;
      ctx.beginPath(); ctx.arc(x,y,sr,0,Math.PI*2);
      ctx.fillStyle=sphere; ctx.fill();

      // Rim light — edge highlight
      const rim=ctx.createRadialGradient(x,y,sr*0.82,x,y,sr);
      rim.addColorStop(0,"transparent");
      rim.addColorStop(1,top+(isHov?"cc":"55"));
      ctx.beginPath(); ctx.arc(x,y,sr,0,Math.PI*2);
      ctx.fillStyle=rim; ctx.fill();
      ctx.shadowBlur=0;

      // Specular highlight top-left
      const spec=ctx.createRadialGradient(
        x-sr*0.3, y-sr*0.32, 0,
        x-sr*0.1, y-sr*0.1, sr*0.52
      );
      spec.addColorStop(0,"rgba(255,255,255,0.45)");
      spec.addColorStop(0.5,"rgba(255,255,255,0.08)");
      spec.addColorStop(1,"transparent");
      ctx.beginPath(); ctx.arc(x,y,sr,0,Math.PI*2);
      ctx.fillStyle=spec; ctx.fill();

      // Bottom shadow
      const shadow=ctx.createRadialGradient(
        x+sr*0.15, y+sr*0.25, 0,
        x, y, sr
      );
      shadow.addColorStop(0,"transparent");
      shadow.addColorStop(0.7,"transparent");
      shadow.addColorStop(1,"rgba(0,0,0,0.35)");
      ctx.beginPath(); ctx.arc(x,y,sr,0,Math.PI*2);
      ctx.fillStyle=shadow; ctx.fill();

      // Label
      ctx.textAlign="center"; ctx.textBaseline="middle";
      const nameShort=attack.replace(/_/g," ")
        .replace("credential","cred").slice(0,14);
      const fSize=Math.max(11,Math.min(13,sr*0.27));

      ctx.fillStyle="rgba(255,255,255,0.92)";
      ctx.font=`700 ${fSize}px ${T.mono}`;
      ctx.shadowColor="rgba(0,0,0,0.8)"; ctx.shadowBlur=5;
      ctx.fillText(nameShort, x, sr>32 ? y-6 : y);
      ctx.shadowBlur=0;

      if (sr>28) {
        ctx.fillStyle=isHov?"#fff":top;
        ctx.font=`${Math.max(11,fSize*0.88)}px ${T.mono}`;
        ctx.fillText(b.count.toLocaleString(), x, sr>32 ? y+10 : y+14);
      }
    });

    rafRef.current=requestAnimationFrame(draw);
  },[]);

  useEffect(()=>{
    const canvas=canvasRef.current; if (!canvas) return;
    const dpr=window.devicePixelRatio||1;
    const W=canvas.offsetWidth, H=canvas.offsetHeight;
    canvas.width=W*dpr; canvas.height=H*dpr;
    const ctx=canvas.getContext("2d"); if (!ctx) return;
    ctx.scale(dpr,dpr);
    layout(W,H);
    rafRef.current=requestAnimationFrame(draw);
    return ()=>cancelAnimationFrame(rafRef.current);
  },[data,layout,draw]);

  const handleMouseMove=useCallback((e:React.MouseEvent<HTMLCanvasElement>)=>{
    const canvas=canvasRef.current; if (!canvas) return;
    const rect=canvas.getBoundingClientRect();
    const dpr=window.devicePixelRatio||1;
    const mx=(e.clientX-rect.left)*(canvas.width/rect.width/dpr);
    const my=(e.clientY-rect.top)*(canvas.height/rect.height/dpr);

    let found:BubbleData|null=null;
    for (const b of [...bubblesRef.current].sort((a,b2)=>b2.r-a.r)) {
      if (Math.hypot(mx-b.x,my-b.y)<=b.r*1.12) { found=b; break; }
    }

    const name=found?.attack??"";
    if (name!==hovRef.current) {
      hovRef.current=name;
      canvas.style.cursor=name?"pointer":"default";
    }
    if (found) {
      setHovTip({
        name:found.attack, count:found.count, norm:found.norm,
        px:e.clientX-rect.left, py:e.clientY-rect.top, on:true,
      });
    } else {
      setHovTip(h=>({...h,on:false}));
    }
  },[]);

  const handleMouseLeave=useCallback(()=>{
    hovRef.current="";
    setHovTip(h=>({...h,on:false}));
  },[]);

  return (
    <div style={{position:"relative"}}>
      <canvas ref={canvasRef}
        style={{width:"100%",height:320,display:"block",borderRadius:8}}
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}/>
      {/* Tooltip */}
      {hovTip.on && (
        <div style={{
          position:"absolute",
          left:hovTip.px, top:hovTip.py,
          transform:"translate(-50%,-120%)",
          pointerEvents:"none",
          background:"rgba(6,9,20,0.97)",
          border:`1px solid rgba(0,255,224,0.22)`,
          borderRadius:8, padding:"8px 13px",
          fontFamily:T.mono, fontSize:11, color:T.text,
          whiteSpace:"nowrap", zIndex:20,
          boxShadow:"0 8px 32px rgba(0,0,0,0.7),0 0 20px rgba(0,255,224,0.07)",
        }}>
          <div style={{color:T.cyan,lineHeight:1.6}}>
            {hovTip.name.replace(/_/g," ")}
          </div>
          <div style={{color:T.textDim,lineHeight:1.6}}>
            {hovTip.count.toLocaleString()} requests
          </div>
          <div style={{color:T.amber,lineHeight:1.6}}>
            {(hovTip.norm*100).toFixed(0)}% of max
          </div>
        </div>
      )}
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// Main export
// ══════════════════════════════════════════════════════════════════════════════
export function AttackAnalysis() {
  const [logs,setLogs]         = useState<LogEntry[]>([]);
  const [loaded,setLoaded]     = useState(false);
  const [site,setSite]         = useState("All");
  const [isVisible,setVisible] = useState(false);
  const secRef = useRef<HTMLElement>(null);

  useEffect(()=>{
    const obs=new IntersectionObserver(
      ([e])=>{ if(e.isIntersecting) setVisible(true); },
      {threshold:0.05}
    );
    if (secRef.current) obs.observe(secRef.current);
    return ()=>obs.disconnect();
  },[]);

  useEffect(()=>{
    Promise.all([
      fetch("/data/honeypot_logs_faker.json").then(r=>r.json()),
      fetch("/data/honeypot_logs_markov.json").then(r=>r.json()),
    ]).then(([f,m])=>{ setLogs([...f,...m]); setLoaded(true); });
  },[]);

  const sites    = ["All",...Array.from(new Set(logs.map(l=>l.site)))];
  const filtered = site==="All"?logs:logs.filter(l=>l.site===site);

  const fade=(d=0)=>({
    opacity:   isVisible?1:0,
    transform: isVisible?"translateY(0)":"translateY(28px)",
    transition:`opacity 0.7s ease ${d}s,transform 0.7s ease ${d}s`,
  });

  return (
    <section id="attackanalysis" ref={secRef}
      style={{padding:"6rem 3rem",position:"relative",zIndex:1}}>
      <div style={{maxWidth:1200,margin:"0 auto"}}>

        <SectionHeader
          tag="Analysis"
          title={<>Attack <span className="text-gradient">Analysis</span></>}
          visible={isVisible}
        />

        {!loaded ? <Loading/> : (
          <>
            <div style={{marginBottom:"1.5rem",...fade(0.05)}}>
              <FilterPills options={sites} active={site} onChange={setSite}/>
            </div>

            {/* Row 1: Stacked bar + Donut — equal visual weight */}
            <div style={{
              display:"grid", gridTemplateColumns:"1.4fr 1fr",
              gap:"1.25rem", marginBottom:"1.25rem", ...fade(0.12),
            }}>
              <ChartCard accent={T.cyan}>
                <CT>Attack Types by Site</CT>
                <StackedBar logs={filtered}/>
              </ChartCard>
              <ChartCard accent={T.purple}>
                <CT>HTTP Status Codes</CT>
                <GradDonut logs={filtered}/>
              </ChartCard>
            </div>

            {/* Row 2: Canvas bubble — same card height as row 1 */}
            <div style={fade(0.22)}>
              <ChartCard accent={T.amber}>
                <CT>Attack Method Breakdown</CT>
                <GlowBubble logs={filtered}/>
              </ChartCard>
            </div>
          </>
        )}
      </div>
    </section>
  );
}
