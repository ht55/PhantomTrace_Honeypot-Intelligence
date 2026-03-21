"use client";
import { useEffect, useRef, useState } from "react";
import { LogEntry, ATTACK_COLORS } from "@/lib/types";
import { MetricCard, Card, ChartTitle, Loading, T } from "@/components/ui/shared";

// ── local design constants ───────────────────────────────────────────────────
const MONO    = T.mono;
const DISPLAY = T.display;

// Top-9 country colors — warm→cool arc
const C_COLORS = [
  "#00ffe0","#a855f7","#f5a623","#ff4c6e",
  "#38bdf8","#34d399","#fb923c","#c084fc","#67e8f9",
];

export function Overview() {
  const [faker,  setFaker]  = useState<LogEntry[]>([]);
  const [markov, setMarkov] = useState<LogEntry[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [tick,   setTick]   = useState(0);   // triggers canvas redraws
  const barRef  = useRef<HTMLCanvasElement>(null);
  const timeRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    Promise.all([
      fetch("/data/honeypot_logs_faker.json").then(r => r.json()),
      fetch("/data/honeypot_logs_markov.json").then(r => r.json()),
    ]).then(([f, m]) => { setFaker(f); setMarkov(m); setLoaded(true); });
  }, []);

  // Small tick so charts re-render once loaded
  useEffect(() => { if (loaded) setTick(t => t + 1); }, [loaded]);

  const all = [...faker, ...markov];

  const uniqueIPs     = new Set(all.map(l => l.ip)).size;
  const uniqueAttacks = new Set(all.map(l => l.attack_type)).size;
  const uniqueSites   = new Set(all.map(l => l.site)).size;

  // ── Attack bar chart ─────────────────────────────────────────────────────
  useEffect(() => {
    if (!loaded) return;
    const canvas = barRef.current; if (!canvas) return;
    const ctx    = canvas.getContext("2d"); if (!ctx) return;

    const dpr     = window.devicePixelRatio || 1;
    canvas.width  = canvas.offsetWidth  * dpr;
    canvas.height = canvas.offsetHeight * dpr;
    ctx.scale(dpr, dpr);

    const W = canvas.offsetWidth, H = canvas.offsetHeight;
    const pad = { top: 8, right: 52, bottom: 8, left: 176 };

    const counts: Record<string, number> = {};
    all.forEach(l => { counts[l.attack_type] = (counts[l.attack_type] || 0) + 1; });
    const sorted = Object.entries(counts).sort((a, b) => b[1] - a[1]);
    const maxV   = sorted[0][1];
    const cW     = W - pad.left - pad.right;
    const barH   = Math.max(8, Math.floor((H - pad.top - pad.bottom) / sorted.length) - 4);

    sorted.forEach(([attack, count], i) => {
      const y     = pad.top + i * (barH + 4);
      const bw    = (count / maxV) * cW;
      const color = ATTACK_COLORS[attack] || "#4a6278";

      // track
      ctx.fillStyle = "rgba(255,255,255,0.04)";
      ctx.beginPath();
      if (ctx.roundRect) ctx.roundRect(pad.left, y, cW, barH, 3);
      else ctx.rect(pad.left, y, cW, barH);
      ctx.fill();

      // fill with gradient
      const grad = ctx.createLinearGradient(pad.left, 0, pad.left + bw, 0);
      grad.addColorStop(0, color + "dd");
      grad.addColorStop(1, color + "44");
      ctx.fillStyle = grad;
      ctx.beginPath();
      if (ctx.roundRect) ctx.roundRect(pad.left, y, bw, barH, 3);
      else ctx.rect(pad.left, y, bw, barH);
      ctx.fill();

      // glow line at right edge
      ctx.shadowColor = color;
      ctx.shadowBlur  = 8;
      ctx.fillStyle   = color;
      ctx.fillRect(pad.left + bw - 2, y + 1, 2, barH - 2);
      ctx.shadowBlur  = 0;

      // label left
      ctx.fillStyle   = "#6a8099";
      ctx.font        = `11px ${MONO}`;
      ctx.textAlign   = "right";
      ctx.textBaseline= "middle";
      ctx.fillText(attack.replace(/_/g, " "), pad.left - 8, y + barH / 2);

      // count right
      ctx.fillStyle   = T.textDim;
      ctx.textAlign   = "left";
      ctx.fillText(String(count), pad.left + bw + 7, y + barH / 2);
    });
  }, [tick]);

  // ── Timeline ─────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!loaded) return;
    const canvas = timeRef.current; if (!canvas) return;
    const ctx    = canvas.getContext("2d"); if (!ctx) return;

    const dpr     = window.devicePixelRatio || 1;
    canvas.width  = canvas.offsetWidth  * dpr;
    canvas.height = canvas.offsetHeight * dpr;
    ctx.scale(dpr, dpr);

    const W = canvas.offsetWidth, H = canvas.offsetHeight;
    const pad = { top: 16, right: 16, bottom: 28, left: 42 };

    const buckets: Record<string, number> = {};
    all.forEach(l => {
      const d = l.timestamp.slice(0, 10);
      buckets[d] = (buckets[d] || 0) + 1;
    });
    const pts_data = Object.entries(buckets).sort((a, b) => a[0] < b[0] ? -1 : 1);
    if (pts_data.length < 2) return;

    const vals   = pts_data.map(([, v]) => v);
    const maxVal = Math.max(...vals);
    const cW     = W - pad.left - pad.right;
    const cH     = H - pad.top  - pad.bottom;
    const n      = pts_data.length;

    const toX = (i: number) => pad.left + (i / (n - 1)) * cW;
    const toY = (v: number) => pad.top  + cH - (v / maxVal) * cH;
    const pts  = vals.map((v, i) => ({ x: toX(i), y: toY(v) }));

    // area fill — cyan→purple gradient
    const areaGrad = ctx.createLinearGradient(0, pad.top, 0, H - pad.bottom);
    areaGrad.addColorStop(0,   "rgba(0,255,224,0.20)");
    areaGrad.addColorStop(0.5, "rgba(168,85,247,0.08)");
    areaGrad.addColorStop(1,   "rgba(0,255,224,0)");

    ctx.beginPath();
    ctx.moveTo(pts[0].x, H - pad.bottom);
    pts.forEach(p => ctx.lineTo(p.x, p.y));
    ctx.lineTo(pts[pts.length - 1].x, H - pad.bottom);
    ctx.fillStyle = areaGrad;
    ctx.fill();

    // line — gradient stroke cyan→purple
    const lineGrad = ctx.createLinearGradient(pad.left, 0, W - pad.right, 0);
    lineGrad.addColorStop(0,    "#00ffe0");
    lineGrad.addColorStop(0.5,  "#a855f7");
    lineGrad.addColorStop(1,    "#f5a623");

    ctx.shadowColor = "#00ffe0";
    ctx.shadowBlur  = 12;
    ctx.strokeStyle = lineGrad;
    ctx.lineWidth   = 2.5;
    ctx.lineJoin    = "round";
    ctx.beginPath();
    pts.forEach((p, i) => i === 0 ? ctx.moveTo(p.x, p.y) : ctx.lineTo(p.x, p.y));
    ctx.stroke();
    ctx.shadowBlur = 0;

    // dots at peaks
    const peak = vals.indexOf(maxVal);
    ctx.fillStyle   = "#00ffe0";
    ctx.shadowColor = "#00ffe0";
    ctx.shadowBlur  = 16;
    ctx.beginPath();
    ctx.arc(pts[peak].x, pts[peak].y, 4.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.shadowBlur = 0;

    // x-axis labels
    ctx.fillStyle    = T.muted;
    ctx.font         = `9px ${MONO}`;
    ctx.textAlign    = "center";
    ctx.textBaseline = "top";
    pts_data.forEach(([d], i) => {
      if (i % 3 !== 0) return;
      ctx.fillText(d.slice(5), toX(i), H - pad.bottom + 6);
    });

    // y-axis ticks
    [0.25, 0.5, 0.75, 1].forEach(t => {
      const y = toY(t * maxVal);
      ctx.fillStyle    = "rgba(255,255,255,0.04)";
      ctx.fillRect(pad.left, y, cW, 0.5);
      ctx.fillStyle    = T.muted;
      ctx.textAlign    = "right";
      ctx.textBaseline = "middle";
      ctx.font         = `9px ${MONO}`;
      ctx.fillText(String(Math.round(t * maxVal)), pad.left - 5, y);
    });
  }, [tick]);

  // ── Country data ─────────────────────────────────────────────────────────
  const countryCounts: Record<string, number> = {};
  all.forEach(l => { countryCounts[l.country] = (countryCounts[l.country] || 0) + 1; });
  const topCountries = Object.entries(countryCounts).sort((a, b) => b[1] - a[1]).slice(0, 9);
  const maxC = topCountries[0]?.[1] || 1;

  return (
    <section id="overview" style={{
      minHeight:  "100vh",
      padding:    "0 3rem 6rem",
      position:   "relative",
      zIndex:     1,
    }}>

      {/* ── HERO ─────────────────────────────────────────────────────────── */}
      <div style={{
        minHeight:      "100vh",
        display:        "flex",
        flexDirection:  "column",
        alignItems:     "center",
        justifyContent: "center",
        textAlign:      "center",
        position:       "relative",
        padding:        "8rem 0 4rem",
      }}>

        {/* Large bg glow behind title */}
        <div style={{
          position:     "absolute",
          top:          "30%",
          left:         "50%",
          transform:    "translate(-50%,-50%)",
          width:        "70vw",
          height:       "40vh",
          background:   "radial-gradient(ellipse 60% 60% at 50% 50%, rgba(0,255,224,0.07) 0%, rgba(168,85,247,0.05) 50%, transparent 75%)",
          pointerEvents:"none",
          filter:       "blur(2px)",
        }}/>

        {/* Live indicator */}
        <div style={{
          display:       "inline-flex",
          alignItems:    "center",
          gap:           8,
          fontFamily:    MONO,
          fontSize:      10,
          color:         T.cyan,
          letterSpacing: "0.22em",
          textTransform: "uppercase",
          marginBottom:  "1.5rem",
          padding:       "6px 16px",
          borderRadius:  "20px",
          background:    "rgba(0,255,224,0.06)",
          border:        "1px solid rgba(0,255,224,0.18)",
          boxShadow:     "0 0 20px rgba(0,255,224,0.08)",
          animation:     "fadeUp 0.6s ease both",
        }}>
          <span style={{
            width:8, height:8, borderRadius:"50%",
            background:T.cyan,
            boxShadow:`0 0 10px ${T.cyan}`,
            animation:"pulse 1.8s ease-in-out infinite",
            display:"inline-block",
          }}/>
          Synthetic Honeypot Intelligence
        </div>

        {/* PHANTOM TRACE — massive, animated gradient */}
        <h1 style={{
          fontFamily:    DISPLAY,
          fontSize:      "clamp(4.5rem, 10vw, 8rem)",
          fontWeight:    900,
          lineHeight:    0.92,
          letterSpacing: "-0.03em",
          marginBottom:  "1.25rem",
          animation:     "fadeUp 0.7s ease 0.1s both",
        }}>
          <span className="text-gradient-animated">PHANTOM</span>
          <br />
          <span style={{
            background:              "linear-gradient(135deg, #a855f7, #00ffe0)",
            WebkitBackgroundClip:    "text",
            WebkitTextFillColor:     "transparent",
            backgroundClip:          "text",
            filter:                  "drop-shadow(0 0 40px rgba(168,85,247,0.4))",
          }}>
            TRACE
          </span>
        </h1>

        {/* Subtitle */}
        <p style={{
          fontFamily:    DISPLAY,
          fontSize:      "clamp(1rem, 2vw, 1.3rem)",
          fontWeight:    300,
          color:         T.textDim,
          letterSpacing: "0.12em",
          marginBottom:  "2.5rem",
          animation:     "fadeUp 0.7s ease 0.18s both",
          textTransform: "uppercase",
        }}>
          Synthetic Attack Log Analysis &nbsp;·&nbsp; Faker vs Markov &nbsp;·&nbsp; MBTI Attacker Profiling
        </p>

        {/* CTAs */}
        <div style={{
          display:   "flex",
          gap:       "0.875rem",
          flexWrap:  "wrap",
          justifyContent: "center",
          animation: "fadeUp 0.7s ease 0.26s both",
        }}>
          <a
            href="https://github.com/ht55/PhantomTrace_Honeypot-Intelligence"
            target="_blank" rel="noopener noreferrer"
            style={{
              display:        "inline-flex",
              alignItems:     "center",
              gap:            8,
              padding:        "11px 24px",
              borderRadius:   9,
              background:     "linear-gradient(135deg, #00ffe0, #a855f7)",
              color:          "#04060e",
              fontFamily:     MONO,
              fontSize:       11,
              fontWeight:     700,
              letterSpacing:  "0.1em",
              textDecoration: "none",
              textTransform:  "uppercase",
              boxShadow:      "0 4px 24px rgba(0,255,224,0.35), 0 0 60px rgba(0,255,224,0.1), inset 0 1px 0 rgba(255,255,255,0.35)",
              transition:     "box-shadow 0.25s ease, transform 0.25s ease",
            }}
            onMouseEnter={e => {
              const el = e.currentTarget as HTMLElement;
              el.style.boxShadow = "0 6px 36px rgba(0,255,224,0.5), 0 0 80px rgba(0,255,224,0.15)";
              el.style.transform = "translateY(-2px)";
            }}
            onMouseLeave={e => {
              const el = e.currentTarget as HTMLElement;
              el.style.boxShadow = "0 4px 24px rgba(0,255,224,0.35), 0 0 60px rgba(0,255,224,0.1), inset 0 1px 0 rgba(255,255,255,0.35)";
              el.style.transform = "";
            }}
          >
            <svg width="13" height="13" viewBox="0 0 16 16" fill="currentColor">
              <path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0016 8c0-4.42-3.58-8-8-8z"/>
            </svg>
            GitHub / README
          </a>

          <a
            href="https://bodysyniq.fit/"
            target="_blank" rel="noopener noreferrer"
            style={{
              display:        "inline-flex",
              alignItems:     "center",
              gap:            8,
              padding:        "11px 24px",
              borderRadius:   9,
              background:     "transparent",
              color:          T.textDim,
              fontFamily:     MONO,
              fontSize:       11,
              letterSpacing:  "0.1em",
              textDecoration: "none",
              textTransform:  "uppercase",
              border:         `1px solid ${T.b2}`,
              transition:     "all 0.25s ease",
            }}
            onMouseEnter={e => {
              const el = e.currentTarget as HTMLElement;
              el.style.color       = T.amber;
              el.style.borderColor = "rgba(245,166,35,0.35)";
              el.style.boxShadow   = "0 0 20px rgba(245,166,35,0.1)";
              el.style.transform   = "translateY(-2px)";
            }}
            onMouseLeave={e => {
              const el = e.currentTarget as HTMLElement;
              el.style.color       = T.textDim;
              el.style.borderColor = T.b2;
              el.style.boxShadow   = "";
              el.style.transform   = "";
            }}
          >
            🎯 Live Honeypot
          </a>
        </div>

        {/* Scroll cue */}
        <div style={{
          position:  "absolute",
          bottom:    "2rem",
          left:      "50%",
          transform: "translateX(-50%)",
          display:   "flex",
          flexDirection: "column",
          alignItems:"center",
          gap:       6,
          animation: "float 2.5s ease-in-out infinite",
          opacity:   0.4,
        }}>
          <div style={{
            fontFamily:    MONO,
            fontSize:      11,
            color:         T.muted,
            letterSpacing: "0.2em",
            textTransform: "uppercase",
          }}>Scroll</div>
          <svg width="12" height="18" viewBox="0 0 12 18" fill="none">
            <rect x="1" y="1" width="10" height="16" rx="5" stroke="currentColor" strokeWidth="1.5" strokeOpacity="0.4"/>
            <rect x="5" y="4" width="2" height="4" rx="1" fill="currentColor" opacity="0.6">
              <animate attributeName="y" values="4;8;4" dur="1.8s" repeatCount="indefinite"/>
              <animate attributeName="opacity" values="0.6;0.1;0.6" dur="1.8s" repeatCount="indefinite"/>
            </rect>
          </svg>
        </div>
      </div>

      {/* ── ABOUT THIS PROJECT ──────────────────────────────────────────── */}
      <div style={{ maxWidth: 1200, margin: "0 auto" }}>

        {/* Divider */}
        <div style={{
          height:     1,
          background: "linear-gradient(to right, transparent, rgba(0,255,224,0.2), rgba(168,85,247,0.25), rgba(0,255,224,0.2), transparent)",
          margin:     "0 0 3rem",
        }}/>

        {/* About block */}
        <div style={{
          display:             "grid",
          gridTemplateColumns: "1fr auto",
          gap:                 "2.5rem",
          alignItems:          "start",
          background: "rgba(10,16,32,0.68)", backdropFilter: "blur(20px)", WebkitBackdropFilter: "blur(20px)",
          border:              `1px solid ${T.b1}`,
          borderLeft:          `3px solid ${T.cyan}`,
          borderRadius:        14,
          padding:             "2rem 2.25rem",
          marginBottom:        "3rem",
          boxShadow:           `${T.shadow2}, 0 0 60px rgba(0,255,224,0.03)`,
          position:            "relative",
          overflow:            "hidden",
        }}>
          <div style={{ position:"relative" }}>
            <div style={{
              fontFamily:    MONO,
              fontSize:      10,
              color:         T.rose,
              letterSpacing: "0.18em",
              textTransform: "uppercase",
              marginBottom:  "0.75rem",
            }}>
              About This Project
            </div>
            <p style={{
              fontFamily:  DISPLAY,
              fontSize:    16,
              fontWeight:  400,
              color:       T.text,
              lineHeight:  1.75,
              marginBottom:"0.875rem",
            }}>
              Most honeypot projects stop at log collection. This one starts there — and asks:{" "}
              <span style={{
                color:      T.cyan,
                fontStyle:  "italic",
                fontWeight: 600,
              }}>
                can an LLM meaningfully classify attacker behavior, and does the data generation
                method affect classification accuracy?
              </span>
            </p>
            <p style={{
              fontFamily: DISPLAY,
              fontSize:   14,
              color:      T.textDim,
              lineHeight: 1.7,
            }}>
              Two synthetic attack log generators — Faker (random sampling) and Markov (state
              transition chains) — are run through a Claude Sonnet pipeline for classification,
              MBTI-style behavioral profiling, and Isolation Forest anomaly detection.
              All data is synthetic; no real systems were involved.
            </p>
          </div>

          {/* Tech stack */}
          <div style={{ display:"flex", flexDirection:"column", gap:"0.4rem", minWidth:170, position:"relative" }}>
            <div style={{
              fontFamily:    MONO,
              fontSize:      11,
              color:         T.muted,
              letterSpacing: "0.15em",
              textTransform: "uppercase",
              marginBottom:  "0.4rem",
            }}>Tech Stack</div>
            {[
              { label:"Python 3.11+",     color: T.cyan   },
              { label:"Claude Sonnet",    color: T.amber  },
              { label:"Markov Chains",    color: T.purple },
              { label:"Isolation Forest", color: T.rose   },
              { label:"Next.js / React",  color: T.textDim},
            ].map(({ label, color }) => (
              <div key={label} style={{
                display:    "inline-flex",
                alignItems: "center",
                gap:        7,
                fontFamily: MONO,
                fontSize:   11,
                color,
                background: `${color}0e`,
                border:     `1px solid ${color}28`,
                borderRadius:4,
                padding:    "4px 10px",
                boxShadow:  `0 0 8px ${color}12`,
              }}>
                <span style={{
                  width:8, height:8, borderRadius:"50%",
                  background: color,
                  boxShadow:  `0 0 6px ${color}`,
                  display:"inline-block", flexShrink:0,
                }}/>
                {label}
              </div>
            ))}
          </div>
        </div>

        {/* ── METRICS ──────────────────────────────────────────────────── */}
        {!loaded ? <Loading /> : (
          <>
            <div style={{
              display:             "grid",
              gridTemplateColumns: "repeat(4,1fr)",
              gap:                 "1rem",
              marginBottom:        "2.5rem",
            }}>
              <MetricCard icon="⚡" value={all.length.toLocaleString()}    label="Total Log Entries"   color={T.text}   accent="rgba(255,255,255,0.35)" />
              <MetricCard icon="🎯" value={uniqueSites}                     label="Honeypot Sites"      color={T.cyan}   accent={T.cyan} />
              <MetricCard icon="🌐" value={uniqueIPs.toLocaleString()}      label="Unique Attacker IPs" color={T.purple} accent={T.purple} />
              <MetricCard icon="🧬" value={uniqueAttacks}                   label="Attack Vectors"      color={T.amber}  accent={T.amber} />
            </div>

            {/* Divider */}
            <hr className="section-divider" />

            {/* ── CHARTS ─────────────────────────────────────────────── */}
            <div style={{
              display:             "grid",
              gridTemplateColumns: "1fr 1fr",
              gap:                 "1.5rem",
              marginBottom:        "1.5rem",
            }}>
              {/* Attack bar */}
              <div style={{
                background: "rgba(10,16,32,0.68)", backdropFilter: "blur(20px)", WebkitBackdropFilter: "blur(20px)",
                border: "1px solid rgba(255,255,255,0.11)",
                borderRadius: 14,
                padding:      "1.5rem",
                boxShadow:    T.shadow2,
              }}>
                <ChartTitle>Attack Type Distribution</ChartTitle>
                <canvas ref={barRef} style={{ width:"100%", height:300, display:"block" }} />
              </div>

              {/* Country bars */}
              <div style={{
                background: "rgba(10,16,32,0.68)", backdropFilter: "blur(20px)", WebkitBackdropFilter: "blur(20px)",
                border: "1px solid rgba(255,255,255,0.11)",
                borderRadius: 14,
                padding:      "1.5rem",
                boxShadow:    T.shadow2,
              }}>
                <ChartTitle>Top Attacker Origins</ChartTitle>
                <div style={{ display:"flex", flexDirection:"column", gap:"0.7rem", paddingTop:"0.25rem" }}>
                  {topCountries.map(([country, count], i) => {
                    const color = C_COLORS[i] || T.muted;
                    return (
                      <div key={country}>
                        <div style={{
                          display:       "flex",
                          justifyContent:"space-between",
                          marginBottom:  4,
                          alignItems:    "center",
                        }}>
                          <div style={{ display:"flex", alignItems:"center", gap:7 }}>
                            <span style={{
                              width:7, height:7, borderRadius:"50%",
                              background: color,
                              boxShadow:  `0 0 6px ${color}`,
                              display:"inline-block", flexShrink:0,
                            }}/>
                            <span style={{ fontFamily:MONO, fontSize:11, color:T.textDim }}>{country}</span>
                          </div>
                          <span style={{ fontFamily:MONO, fontSize:11, color:T.muted }}>{count}</span>
                        </div>
                        <div style={{
                          height:5, background:"rgba(255,255,255,0.05)",
                          borderRadius:3, overflow:"hidden",
                        }}>
                          <div style={{
                            height:  "100%",
                            width:   `${(count / maxC) * 100}%`,
                            background: `linear-gradient(to right, ${color}, ${color}66)`,
                            boxShadow:  `0 0 10px ${color}66`,
                            borderRadius:3,
                            transition: "width 1.3s cubic-bezier(0.16,1,0.3,1)",
                          }}/>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Timeline */}
            <div style={{
              background: "rgba(10,16,32,0.68)", backdropFilter: "blur(20px)", WebkitBackdropFilter: "blur(20px)",
              border: "1px solid rgba(255,255,255,0.11)",
              borderRadius: 14,
              padding:      "1.5rem",
              boxShadow:    T.shadow2,
              position:     "relative",
              overflow:     "hidden",
            }}>
              <ChartTitle>Attack Volume Over Time</ChartTitle>
              <canvas ref={timeRef} style={{ width:"100%", height:140, display:"block" }} />
            </div>
          </>
        )}
      </div>
    </section>
  );
}
