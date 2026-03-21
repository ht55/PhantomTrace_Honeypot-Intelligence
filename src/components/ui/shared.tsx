"use client";
import { ReactNode } from "react";

// ─────────────────────────────────────────────────────────────────────────────
// Design tokens — mirrors globals.css custom properties
// All inline styles reference these so components stay in sync with the CSS
// ─────────────────────────────────────────────────────────────────────────────
export const T = {
  /* surfaces — glassmorphism base */
  s1:  "rgba(8,14,28,0.75)",
  s2:  "rgba(10,16,30,0.72)",
  s3:  "rgba(14,22,38,0.78)",
  s4:  "rgba(18,28,46,0.82)",

  /* borders — brighter so they read on dark bg */
  b0:  "rgba(255,255,255,0.06)",
  b1:  "rgba(255,255,255,0.11)",
  b2:  "rgba(255,255,255,0.18)",
  bCyan:   "rgba(0,255,224,0.28)",
  bPurple: "rgba(168,85,247,0.28)",

  /* accents */
  cyan:   "#00ffe0",
  purple: "#a855f7",
  amber:  "#f5a623",
  rose:   "#ff4c6e",

  /* text — all bumped up for visibility */
  text:    "#e4eef8",
  textDim: "#b8cfe0",
  muted:   "#a8c0d4",
  dim:     "#7a9ab5",

  /* fonts */
  mono: "'Share Tech Mono', monospace",
  display: "'Exo 2', sans-serif",

  /* shadows — glassmorphism style */
  shadow2: "0 4px 24px rgba(0,0,0,0.5), 0 1px 4px rgba(0,0,0,0.35), 0 0 0 1px rgba(255,255,255,0.08)",
  shadow3: "0 8px 40px rgba(0,0,0,0.6), 0 2px 8px rgba(0,0,0,0.45), 0 0 0 1px rgba(255,255,255,0.12), 0 0 60px rgba(0,255,224,0.05)",
  shadow4: "0 16px 56px rgba(0,0,0,0.7), 0 4px 16px rgba(0,0,0,0.55), 0 0 0 1px rgba(0,255,224,0.2), 0 0 80px rgba(0,255,224,0.08)",

  glowCyan:   "0 0 24px rgba(0,255,224,0.35), 0 0 60px rgba(0,255,224,0.15)",
  glowPurple: "0 0 24px rgba(168,85,247,0.35), 0 0 60px rgba(168,85,247,0.15)",
  glowAmber:  "0 0 24px rgba(245,166,35,0.35), 0 0 60px rgba(245,166,35,0.15)",
  glowRose:   "0 0 20px rgba(255,76,110,0.4),  0 0 50px rgba(255,76,110,0.15)",
} as const;

// ── Metric card ──────────────────────────────────────────────────────────────
interface MetricCardProps {
  icon: string;
  value: string | number;
  label: string;
  color?: string;
  accent?: string;
  glow?: string;
}

export function MetricCard({
  icon,
  value,
  label,
  color = T.text,
  accent = T.cyan,
  glow,
}: MetricCardProps) {
  const isDefault = accent === "var(--border)" || accent === T.b1;
  const resolvedAccent = isDefault ? T.b1 : accent;
  const resolvedGlow   = glow ?? (isDefault ? "none" : `0 0 16px ${resolvedAccent}33`);

  // Gradient for left border bar — accent→purple for cyan, accent→cyan for others
  const barGrad = isDefault
    ? `linear-gradient(to bottom, rgba(255,255,255,0.2), rgba(255,255,255,0.08))`
    : resolvedAccent === T.cyan
      ? `linear-gradient(to bottom, ${T.cyan}, ${T.purple})`
      : resolvedAccent === T.purple
        ? `linear-gradient(to bottom, ${T.purple}, ${T.cyan})`
        : resolvedAccent === T.amber
          ? `linear-gradient(to bottom, ${T.amber}, ${T.purple})`
          : resolvedAccent === T.rose
            ? `linear-gradient(to bottom, ${T.rose}, ${T.amber})`
            : `linear-gradient(to bottom, ${resolvedAccent}, ${T.purple})`;

  return (
    <div
      style={{
        background: "rgba(10,16,32,0.68)",
        backdropFilter: "blur(20px)",
        WebkitBackdropFilter: "blur(20px)",
        border: `1px solid rgba(255,255,255,0.12)`,
        borderRadius: 14,
        padding: "1.25rem 1.5rem 1.25rem 1.75rem",
        boxShadow: `0 4px 24px rgba(0,0,0,0.45), 0 0 0 1px rgba(255,255,255,0.06), ${resolvedGlow}`,
        position: "relative",
        overflow: "hidden",
        transition: "transform 0.3s cubic-bezier(0.16,1,0.3,1), box-shadow 0.3s ease, border-color 0.3s ease",
      }}
      onMouseEnter={e => {
        const el = e.currentTarget as HTMLElement;
        el.style.transform = "translateY(-3px)";
        el.style.boxShadow = `0 8px 36px rgba(0,0,0,0.55), 0 0 0 1px ${resolvedAccent}33, 0 0 32px ${resolvedAccent}22`;
        el.style.borderColor = `${resolvedAccent}40`;
      }}
      onMouseLeave={e => {
        const el = e.currentTarget as HTMLElement;
        el.style.transform = "";
        el.style.boxShadow = `0 4px 24px rgba(0,0,0,0.45), 0 0 0 1px rgba(255,255,255,0.06), ${resolvedGlow}`;
        el.style.borderColor = "rgba(255,255,255,0.12)";
      }}
    >
      {/* Gradient left border bar */}
      <div style={{
        position: "absolute", left: 0, top: 0, bottom: 0,
        width: 3,
        background: barGrad,
        boxShadow: isDefault ? "none" : `2px 0 14px ${resolvedAccent}55`,
        borderRadius: "14px 0 0 14px",
        pointerEvents: "none",
      }} />

      <div style={{ fontSize: 18, marginBottom: 10 }}>{icon}</div>
      <div style={{
        fontSize: "1.85rem",
        fontWeight: 800,
        color,
        lineHeight: 1,
        fontFamily: T.display,
        textShadow: isDefault ? "none" : `0 0 20px ${color}55`,
      }}>
        {value}
      </div>
      <div style={{
        fontFamily: T.mono,
        fontSize: 10,
        color: T.muted,
        letterSpacing: "0.12em",
        textTransform: "uppercase",
        marginTop: 5,
      }}>
        {label}
      </div>
    </div>
  );
}

// ── Section header ───────────────────────────────────────────────────────────
interface SectionHeaderProps {
  tag: string;
  title: ReactNode;
  subtitle?: string;
  tagColor?: string;
  visible?: boolean;
}

export function SectionHeader({
  tag,
  title,
  subtitle,
  tagColor = "var(--cyan)",
  visible = true,
}: SectionHeaderProps) {
  const resolvedColor = tagColor === "var(--cyan)"   ? T.cyan
                      : tagColor === "var(--purple)" ? T.purple
                      : tagColor === "var(--accent2)"? T.rose
                      : tagColor === "var(--accent3)"? T.amber
                      : tagColor === "var(--purple)"  ? T.purple
                      : tagColor;

  return (
    <div style={{
      opacity: visible ? 1 : 0,
      transform: visible ? "none" : "translateY(20px)",
      transition: "opacity 0.7s ease, transform 0.7s ease",
      marginBottom: "2.25rem",
    }}>
      {/* Tag row with pulsing dot */}
      <div style={{
        fontFamily: T.mono,
        fontSize: 10,
        color: resolvedColor,
        letterSpacing: "0.2em",
        textTransform: "uppercase",
        marginBottom: "0.45rem",
        display: "flex",
        alignItems: "center",
        gap: 8,
      }}>
        <span style={{
          width: 6, height: 6, borderRadius: "50%",
          background: resolvedColor,
          display: "inline-block",
          boxShadow: `0 0 10px ${resolvedColor}`,
          animation: "pulse 2s ease-in-out infinite",
          flexShrink: 0,
        }} />
        {tag}
      </div>

      <h2 style={{
        fontFamily: T.display,
        fontSize: "clamp(1.85rem, 3vw, 2.6rem)",
        fontWeight: 800,
        lineHeight: 1.12,
        letterSpacing: "-0.01em",
        marginBottom: subtitle ? "0.4rem" : 0,
      }}>
        {title}
      </h2>

      {subtitle && (
        <p style={{
          fontFamily: T.mono,
          fontSize: 11,
          color: T.muted,
          letterSpacing: "0.06em",
          marginTop: 2,
        }}>
          {subtitle}
        </p>
      )}
    </div>
  );
}

// ── Card ─────────────────────────────────────────────────────────────────────
export function Card({
  children,
  style = {},
  hover = false,
}: {
  children: ReactNode;
  style?: React.CSSProperties;
  hover?: boolean;
}) {
  return (
    <div
      style={{
        background: "rgba(10,16,32,0.68)",
        backdropFilter: "blur(20px)",
        WebkitBackdropFilter: "blur(20px)",
        border: `1px solid rgba(255,255,255,0.11)`,
        borderRadius: 14,
        padding: "1.5rem",
        boxShadow: "0 4px 24px rgba(0,0,0,0.45), 0 0 0 1px rgba(255,255,255,0.05)",
        transition: hover
          ? "transform 0.3s cubic-bezier(0.16,1,0.3,1), box-shadow 0.3s ease, border-color 0.3s ease"
          : undefined,
        ...style,
      }}
      onMouseEnter={hover ? (e => {
        const el = e.currentTarget as HTMLElement;
        el.style.transform = "translateY(-4px)";
        el.style.boxShadow = "0 12px 40px rgba(0,0,0,0.55), 0 0 0 1px rgba(0,255,224,0.2)";
        el.style.borderColor = "rgba(0,255,224,0.2)";
      }) : undefined}
      onMouseLeave={hover ? (e => {
        const el = e.currentTarget as HTMLElement;
        el.style.transform = "";
        el.style.boxShadow = "0 4px 24px rgba(0,0,0,0.45), 0 0 0 1px rgba(255,255,255,0.05)";
        el.style.borderColor = "rgba(255,255,255,0.11)";
      }) : undefined}
    >
      {children}
    </div>
  );
}

// ── Chart title ──────────────────────────────────────────────────────────────
export function ChartTitle({ children }: { children: ReactNode }) {
  return (
    <div style={{
      fontFamily: T.mono,
      fontSize: 11,
      fontWeight: 700,
      color: T.muted,
      letterSpacing: "0.09em",
      textTransform: "uppercase",
      marginBottom: "1rem",
    }}>
      {children}
    </div>
  );
}

// ── Filter pills ─────────────────────────────────────────────────────────────
interface FilterPillsProps {
  options: string[];
  active: string;
  onChange: (v: string) => void;
  accentColor?: string;
}

export function FilterPills({
  options,
  active,
  onChange,
  accentColor = T.cyan,
}: FilterPillsProps) {
  return (
    <div style={{ display: "flex", gap: "0.4rem", flexWrap: "wrap" }}>
      {options.map(opt => {
        const isActive = active === opt;
        return (
          <button
            key={opt}
            onClick={() => onChange(opt)}
            style={{
              padding: "0.35rem 0.9rem",
              borderRadius: 6,
              cursor: "pointer",
              border: `1px solid ${isActive ? `${accentColor}44` : T.b1}`,
              background: isActive ? `${accentColor}12` : "transparent",
              color: isActive ? accentColor : T.muted,
              fontFamily: T.mono,
              fontSize: 10,
              letterSpacing: "0.09em",
              textTransform: "uppercase" as const,
              transition: "all 0.2s ease",
              boxShadow: isActive ? `0 0 12px ${accentColor}18` : "none",
            }}
            onMouseEnter={e => {
              if (!isActive) {
                const el = e.currentTarget as HTMLElement;
                el.style.color = T.textDim;
                el.style.borderColor = T.b2;
              }
            }}
            onMouseLeave={e => {
              if (!isActive) {
                const el = e.currentTarget as HTMLElement;
                el.style.color = T.muted;
                el.style.borderColor = T.b1;
              }
            }}
          >
            {opt}
          </button>
        );
      })}
    </div>
  );
}

// ── Horizontal bar ───────────────────────────────────────────────────────────
export function HBar({
  value,
  max,
  color,
  height = 5,
}: {
  value: number;
  max: number;
  color: string;
  height?: number;
}) {
  return (
    <div style={{
      height,
      background: "rgba(255,255,255,0.05)",
      borderRadius: height / 2,
      overflow: "hidden",
    }}>
      <div style={{
        height: "100%",
        width: `${Math.min(100, (value / max) * 100)}%`,
        background: color,
        boxShadow: `0 0 8px ${color}77`,
        borderRadius: height / 2,
        transition: "width 1.1s cubic-bezier(0.16,1,0.3,1)",
      }} />
    </div>
  );
}

// ── Loading spinner ───────────────────────────────────────────────────────────
export function Loading() {
  return (
    <div style={{
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      padding: "3.5rem",
      color: T.muted,
      fontFamily: T.mono,
      fontSize: 11,
      letterSpacing: "0.12em",
      gap: 10,
    }}>
      <span style={{ animation: "pulse 1.4s ease-in-out infinite", color: T.cyan }}>◈</span>
      LOADING DATA...
    </div>
  );
}
