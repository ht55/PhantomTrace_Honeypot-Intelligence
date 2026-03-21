import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Phantom Trace: Honeypot Intelligence",
  description: "Synthetic attack log analysis · Faker vs Markov · MBTI attacker profiling",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
