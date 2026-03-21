"use client";

export function Footer() {
  return (
    <footer style={{
      position: "relative",
      zIndex: 1,
      overflow: "hidden",
    }}>
      {/* Top gradient fade */}
      <div style={{
        height: 1,
        background: "linear-gradient(to right, transparent, rgba(0,255,224,0.3), rgba(168,85,247,0.3), transparent)",
      }} />

      <div style={{
        background: "rgba(6,8,13,0.97)",
        padding: "2.5rem 3rem 2rem",
        textAlign: "center",
        position: "relative",
      }}>
        {/* Ambient glows */}
        <div style={{
          position: "absolute", bottom: -60, left: "20%",
          width: 320, height: 160,
          background: "radial-gradient(circle, rgba(0,255,224,0.04) 0%, transparent 70%)",
          pointerEvents: "none",
        }} />
        <div style={{
          position: "absolute", bottom: -60, right: "20%",
          width: 280, height: 140,
          background: "radial-gradient(circle, rgba(168,85,247,0.05) 0%, transparent 70%)",
          pointerEvents: "none",
        }} />

        {/* Logo */}
        <div style={{
          fontFamily: "'Share Tech Mono',monospace",
          fontSize: 16,
          letterSpacing: "0.22em",
          marginBottom: "1rem",
          display: "inline-block",
        }}>
          <span style={{
            background: "linear-gradient(135deg,#00ffe0,#a855f7)",
            WebkitBackgroundClip: "text",
            WebkitTextFillColor: "transparent",
            backgroundClip: "text",
          }}>PHANTOM TRACE</span>
        </div>

        {/* Links */}
        <div style={{
          display: "flex", justifyContent: "center",
          gap: "0.5rem", marginBottom: "1.25rem", flexWrap: "wrap",
          alignItems: "center",
        }}>
          <FooterLink
            href="https://github.com/ht55/PhantomTrace_Honeypot-Intelligence"
            hoverColor="var(--accent)"
          >
            <svg width="11" height="11" viewBox="0 0 16 16" fill="currentColor" style={{ marginRight: 5, verticalAlign: "middle" }}>
              <path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0016 8c0-4.42-3.58-8-8-8z"/>
            </svg>
            GitHub / README
          </FooterLink>

          <span style={{ color: "var(--border)", fontSize: 12 }}>·</span>

          <FooterLink href="https://bodysyniq.fit/" hoverColor="var(--accent3)">
            🎯 BodySyniq — Live Honeypot
          </FooterLink>
        </div>

        <p style={{ fontFamily: "'Share Tech Mono',monospace", fontSize: 11, color: "var(--muted)", marginBottom: "0.5rem" }}>
          Honeypot Intelligence System · Synthetic attack log analysis · Faker vs Markov · MBTI attacker profiling
        </p>

        {/* Bottom divider */}
        <div style={{
          height: 1,
          background: "linear-gradient(to right, transparent, var(--border), transparent)",
          margin: "1rem auto",
          maxWidth: 560,
        }} />

        <p style={{ fontFamily: "'Share Tech Mono',monospace", fontSize: 10, color: "#5c80a5", maxWidth: 560, margin: "0 auto" }}>
          Research project. All attacker data is synthetically generated via Faker &amp; Markov chain generators.
          Real honeypot observations informed the IP regions and attack path distributions in personas.py.
          No actual systems were compromised. © 2026 ht55. All rights reserved.
        </p>
      </div>
    </footer>
  );
}

function FooterLink({
  href, children, hoverColor,
}: {
  href: string;
  children: React.ReactNode;
  hoverColor: string;
}) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      style={{
        fontFamily: "'Share Tech Mono',monospace",
        fontSize: 10,
        color: "var(--muted)",
        textDecoration: "none",
        letterSpacing: "0.1em",
        textTransform: "uppercase",
        transition: "color 0.2s",
        display: "inline-flex",
        alignItems: "center",
      }}
      onMouseEnter={e => { (e.currentTarget as HTMLAnchorElement).style.color = hoverColor; }}
      onMouseLeave={e => { (e.currentTarget as HTMLAnchorElement).style.color = "var(--muted)"; }}
    >
      {children}
    </a>
  );
}
