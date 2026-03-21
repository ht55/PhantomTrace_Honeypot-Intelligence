"use client";

import { useState, useEffect, useRef } from "react";

const NAV_LINKS = [
  { href: "#overview",         label: "Overview",          short: "OVR" },
  { href: "#attackanalysis",   label: "Attack Analysis",   short: "ATK" },
  { href: "#fakervsmarkov",    label: "Faker vs Markov",   short: "F/M" },
  { href: "#attackerprofiles", label: "Profiles",          short: "PRO" },
  { href: "#anomalydetection", label: "Anomaly",           short: "ANO" },
  { href: "#markovgraph",      label: "Markov Graph",      short: "GRF" },
];

// Per-section accent — drives active pill color AND ambient nav glow
const SECTION_ACCENT: Record<string, { color: string; glow: string; grad: string }> = {
  overview:         { color: "#00ffe0", glow: "rgba(0,255,224,0.18)",   grad: "linear-gradient(135deg,#00ffe0,#a855f7)" },
  attackanalysis:   { color: "#a855f7", glow: "rgba(168,85,247,0.18)",  grad: "linear-gradient(135deg,#a855f7,#ff4c6e)" },
  fakervsmarkov:    { color: "#00ffe0", glow: "rgba(0,255,224,0.16)",   grad: "linear-gradient(135deg,#00ffe0,#a855f7)" },
  attackerprofiles: { color: "#a855f7", glow: "rgba(168,85,247,0.16)",  grad: "linear-gradient(135deg,#a855f7,#00ffe0)" },
  anomalydetection: { color: "#ff4c6e", glow: "rgba(255,76,110,0.18)",  grad: "linear-gradient(135deg,#ff4c6e,#f5a623)" },
  markovgraph:      { color: "#f5a623", glow: "rgba(245,166,35,0.16)",  grad: "linear-gradient(135deg,#f5a623,#00ffe0)" },
};

const MONO = "'Share Tech Mono', monospace";
const DISPLAY = "'Exo 2', sans-serif";

export function Navigation() {
  const [scrolled, setScrolled]   = useState(false);
  const [active,   setActive]     = useState("overview");
  const [hovered,  setHovered]    = useState<string | null>(null);
  const indicatorRef = useRef<HTMLDivElement>(null);
  const navRef       = useRef<HTMLUListElement>(null);

  useEffect(() => {
    const onScroll = () => {
      setScrolled(window.scrollY > 60);
      const ids = NAV_LINKS.map(l => l.href.slice(1));
      for (const id of [...ids].reverse()) {
        const el = document.getElementById(id);
        if (el && el.getBoundingClientRect().top <= 160) { setActive(id); break; }
      }
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const accent = SECTION_ACCENT[active] ?? SECTION_ACCENT.overview;

  return (
    <>
      <style>{`
        @keyframes navPillIn {
          from { opacity:0; transform:scaleX(0.7) scaleY(0.85); }
          to   { opacity:1; transform:scaleX(1)   scaleY(1); }
        }
        @keyframes navGlowPulse {
          0%,100% { opacity:0.8; }
          50%      { opacity:1; }
        }
        @keyframes scanline {
          0%   { transform: translateX(-100%); }
          100% { transform: translateX(400%); }
        }
      `}</style>

      <header style={{
        position:   "fixed",
        top:        scrolled ? "12px" : "20px",
        left:       "50%",
        transform:  "translateX(-50%)",
        zIndex:     200,
        transition: "top 0.5s cubic-bezier(0.16,1,0.3,1)",
      }}>

        <nav style={{
          position:        "relative",
          borderRadius:    "16px",
          padding:         "7px 8px",
          background:      "rgba(4,6,16,0.92)",
          backdropFilter:  "blur(36px) saturate(1.8)",
          WebkitBackdropFilter: "blur(36px) saturate(1.8)",
          border:          `1px solid rgba(255,255,255,0.13)`,
          boxShadow: `0 8px 40px rgba(0,0,0,0.65), 0 0 0 1px rgba(255,255,255,0.07), 0 0 48px ${accent.glow}, inset 0 1px 0 rgba(255,255,255,0.09)`,
          transition: "box-shadow 0.6s ease",
          overflow: "hidden",
        }}>

          {/* scanline shimmer */}
          <div style={{
            position:"absolute", top:0, left:0, right:0, height:"100%",
            overflow:"hidden", pointerEvents:"none", borderRadius:"inherit",
          }}>
            <div style={{
              position:"absolute", top:0, left:0, width:"30%", height:"100%",
              background:"linear-gradient(90deg,transparent,rgba(255,255,255,0.05),transparent)",
              animation:"scanline 6s ease-in-out infinite",
            }}/>
          </div>

          {/* inset top highlight — stronger */}
          <div style={{
            position:"absolute",top:0,left:"5%",right:"5%",height:"1px",
            background:`linear-gradient(to right, transparent, ${accent.color}99, transparent)`,
            transition:"background 0.6s ease",
            pointerEvents:"none",
          }}/>

          <ul ref={navRef} style={{
            display:"flex", alignItems:"center", gap:"3px",
            listStyle:"none", position:"relative",
          }}>
            {NAV_LINKS.map(link => {
              const id       = link.href.slice(1);
              const isActive = active === id;
              const isHov    = hovered === id;
              const sec      = SECTION_ACCENT[id];

              return (
                <li key={link.href} style={{ position:"relative" }}>
                  {/* Active sliding pill */}
                  {isActive && (
                    <span style={{
                      position:"absolute", inset:0, borderRadius:10,
                      background: accent.grad,
                      opacity: 0.25,
                      animation: "navPillIn 0.35s cubic-bezier(0.16,1,0.3,1)",
                      boxShadow: `inset 0 0 0 1px ${accent.color}55`,
                    }}/>
                  )}

                  {/* Hover highlight */}
                  {isHov && !isActive && (
                    <span style={{
                      position:"absolute", inset:0, borderRadius:10,
                      background:"rgba(255,255,255,0.06)",
                      pointerEvents:"none",
                    }}/>
                  )}

                  <a
                    href={link.href}
                    onMouseEnter={() => setHovered(id)}
                    onMouseLeave={() => setHovered(null)}
                    style={{
                      position:      "relative",
                      display:       "flex",
                      alignItems:    "center",
                      gap:           8,
                      padding:       "10px 18px",
                      borderRadius:  10,
                      textDecoration:"none",
                      color:          isActive ? "#fff" : isHov ? "rgba(230,242,255,0.9)" : "rgba(180,210,235,0.7)",
                      transition:    "color 0.2s ease",
                      whiteSpace:    "nowrap",
                      zIndex:        1,
                    }}
                  >
                    {/* Section color dot */}
                    <span style={{
                      width:       7,
                      height:      7,
                      borderRadius:"50%",
                      background:   isActive ? sec.color : "rgba(255,255,255,0.2)",
                      border:       isActive ? "none" : `1px solid rgba(255,255,255,0.25)`,
                      boxShadow:    isActive ? `0 0 10px ${sec.color}, 0 0 20px ${sec.color}66` : "none",
                      flexShrink:   0,
                      transition:   "all 0.3s ease",
                      display:      "inline-block",
                    }}/>

                    <span style={{
                      fontFamily:    MONO,
                      fontSize:      14,
                      letterSpacing: "0.06em",
                      fontWeight:    700,
                      textShadow:    isActive ? `0 0 20px ${accent.color}cc` : "none",
                      transition:    "text-shadow 0.3s ease",
                    }}>
                      {link.label}
                    </span>
                  </a>
                </li>
              );
            })}
          </ul>
        </nav>

        {/* ── Active section label below nav ── */}
        <div style={{
          textAlign:     "center",
          marginTop:     7,
          fontFamily:    MONO,
          fontSize:      11,
          letterSpacing: "0.2em",
          color:         accent.color,
          textTransform: "uppercase",
          opacity:       scrolled ? 0.85 : 0,
          transition:    "opacity 0.4s ease, color 0.6s ease",
          textShadow:    `0 0 16px ${accent.color}`,
          pointerEvents: "none",
        }}>
          ◈ {NAV_LINKS.find(l => l.href.slice(1) === active)?.label}
        </div>
      </header>
    </>
  );
}
