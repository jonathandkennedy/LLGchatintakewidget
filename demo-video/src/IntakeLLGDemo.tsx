import React from "react";
import {
  AbsoluteFill,
  interpolate,
  useCurrentFrame,
  Sequence,
  spring,
  useVideoConfig,
} from "remotion";

// ============================================================
// Styles
// ============================================================

const BG = "#0f172a";
const BG_GRADIENT = "linear-gradient(135deg, #0f172a 0%, #1e293b 100%)";
const PRIMARY = "#3b82f6";
const ACCENT = "#60a5fa";
const SUCCESS = "#22c55e";
const WARNING = "#f59e0b";
const TEXT = "#f8fafc";
const MUTED = "#94a3b8";
const CARD_BG = "rgba(30, 41, 59, 0.8)";
const CARD_BORDER = "rgba(71, 85, 105, 0.5)";

const fontFamily = "'Inter', -apple-system, BlinkMacSystemFont, sans-serif";

// ============================================================
// Reusable Components
// ============================================================

function FadeIn({ children, delay = 0, style }: { children: React.ReactNode; delay?: number; style?: React.CSSProperties }) {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const opacity = interpolate(frame - delay, [0, 15], [0, 1], { extrapolateRight: "clamp" });
  const y = spring({ frame: frame - delay, fps, config: { damping: 15 } });
  const translateY = interpolate(y, [0, 1], [30, 0]);

  return (
    <div style={{ opacity: Math.max(0, opacity), transform: `translateY(${translateY}px)`, ...style }}>
      {children}
    </div>
  );
}

function Badge({ children, color = PRIMARY }: { children: React.ReactNode; color?: string }) {
  return (
    <span style={{
      display: "inline-block",
      padding: "6px 16px",
      borderRadius: 999,
      background: color + "25",
      color,
      fontSize: 18,
      fontWeight: 700,
      fontFamily,
    }}>
      {children}
    </span>
  );
}

function FeatureGrid({ features, startDelay = 0 }: { features: string[]; startDelay?: number }) {
  return (
    <div style={{ display: "flex", flexWrap: "wrap", gap: 12, maxWidth: 1400 }}>
      {features.map((f, i) => (
        <FadeIn key={f} delay={startDelay + i * 3}>
          <div style={{
            padding: "12px 20px",
            background: CARD_BG,
            border: `1px solid ${CARD_BORDER}`,
            borderRadius: 12,
            fontSize: 18,
            color: TEXT,
            fontFamily,
            fontWeight: 500,
          }}>
            {f}
          </div>
        </FadeIn>
      ))}
    </div>
  );
}

function StatCard({ label, value, delay = 0, color = PRIMARY }: { label: string; value: string; delay?: number; color?: string }) {
  return (
    <FadeIn delay={delay}>
      <div style={{
        background: CARD_BG,
        border: `1px solid ${CARD_BORDER}`,
        borderRadius: 20,
        padding: "32px 40px",
        textAlign: "center",
        minWidth: 200,
      }}>
        <div style={{ fontSize: 48, fontWeight: 800, color, fontFamily, letterSpacing: "-0.02em" }}>{value}</div>
        <div style={{ fontSize: 16, color: MUTED, fontFamily, fontWeight: 600, marginTop: 8, textTransform: "uppercase", letterSpacing: "0.05em" }}>{label}</div>
      </div>
    </FadeIn>
  );
}

// ============================================================
// Slides
// ============================================================

function TitleSlide() {
  return (
    <AbsoluteFill style={{ background: BG_GRADIENT, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: 80 }}>
      <FadeIn>
        <div style={{ fontSize: 28, color: ACCENT, fontFamily, fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: 16 }}>
          Introducing
        </div>
      </FadeIn>
      <FadeIn delay={10}>
        <h1 style={{ fontSize: 96, fontWeight: 800, color: TEXT, fontFamily, margin: 0, letterSpacing: "-0.03em" }}>
          IntakeLLG
        </h1>
      </FadeIn>
      <FadeIn delay={20}>
        <p style={{ fontSize: 28, color: MUTED, fontFamily, marginTop: 16, maxWidth: 800, textAlign: "center", lineHeight: 1.5 }}>
          The AI-Powered Legal Intake Platform
        </p>
      </FadeIn>
      <FadeIn delay={35}>
        <div style={{ display: "flex", gap: 16, marginTop: 40 }}>
          <Badge color={SUCCESS}>105 Features</Badge>
          <Badge color={PRIMARY}>22 Admin Pages</Badge>
          <Badge color={WARNING}>7 Integrations</Badge>
        </div>
      </FadeIn>
    </AbsoluteFill>
  );
}

function WidgetSlide() {
  return (
    <AbsoluteFill style={{ background: BG_GRADIENT, display: "flex", alignItems: "center", justifyContent: "center", padding: 80 }}>
      <div style={{ flex: 1 }}>
        <FadeIn>
          <div style={{ fontSize: 18, color: ACCENT, fontFamily, fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase" }}>Chat Widget</div>
        </FadeIn>
        <FadeIn delay={8}>
          <h2 style={{ fontSize: 56, fontWeight: 800, color: TEXT, fontFamily, margin: "12px 0", letterSpacing: "-0.02em" }}>
            Conversational<br />Intake Experience
          </h2>
        </FadeIn>
        <FadeIn delay={16}>
          <FeatureGrid features={[
            "Chat bubble UI",
            "Spanish toggle",
            "Voice input",
            "Dark mode",
            "Typing indicator",
            "File upload",
            "Appointment picker",
            "Auto-save & resume",
            "Back & undo",
            "Step counter",
            "Creatify AI video",
            "Sound effects",
            "Confetti on complete",
            "Loading shimmer",
            "Mobile responsive",
            "Offline mode",
          ]} startDelay={20} />
        </FadeIn>
      </div>
    </AbsoluteFill>
  );
}

function IntelligenceSlide() {
  return (
    <AbsoluteFill style={{ background: BG_GRADIENT, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: 80 }}>
      <FadeIn>
        <div style={{ fontSize: 18, color: WARNING, fontFamily, fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase" }}>Intelligence</div>
      </FadeIn>
      <FadeIn delay={8}>
        <h2 style={{ fontSize: 56, fontWeight: 800, color: TEXT, fontFamily, margin: "12px 0 32px", letterSpacing: "-0.02em" }}>
          AI-Powered Lead Intelligence
        </h2>
      </FadeIn>
      <div style={{ display: "flex", gap: 24 }}>
        <StatCard label="Lead Score" value="0-100" delay={15} color={PRIMARY} />
        <StatCard label="Case Value" value="$15K-$1M" delay={20} color={SUCCESS} />
        <StatCard label="AI Classification" value="Claude" delay={25} color={WARNING} />
        <StatCard label="Sentiment" value="0-10" delay={30} color="#ef4444" />
      </div>
      <FadeIn delay={35}>
        <div style={{ marginTop: 32 }}>
          <FeatureGrid features={[
            "Lead scoring (7 factors)",
            "AI incident classification",
            "Sentiment analysis",
            "Case value estimation",
            "Duplicate detection",
            "ROI by traffic source",
            "Conversion attribution",
            "Retargeting on abandon",
          ]} startDelay={38} />
        </div>
      </FadeIn>
    </AbsoluteFill>
  );
}

function AdminSlide() {
  return (
    <AbsoluteFill style={{ background: BG_GRADIENT, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: 80 }}>
      <FadeIn>
        <div style={{ fontSize: 18, color: SUCCESS, fontFamily, fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase" }}>Admin Dashboard</div>
      </FadeIn>
      <FadeIn delay={8}>
        <h2 style={{ fontSize: 56, fontWeight: 800, color: TEXT, fontFamily, margin: "12px 0 32px", letterSpacing: "-0.02em" }}>
          22 Admin Pages
        </h2>
      </FadeIn>
      <FadeIn delay={15}>
        <FeatureGrid features={[
          "Dashboard + KPIs",
          "Lead list (advanced search)",
          "Kanban board",
          "Priority queue",
          "Analytics + funnel charts",
          "Flow editor + translations",
          "A/B testing",
          "Branding (live preview)",
          "Webhooks management",
          "Team & assignment rules",
          "Email templates",
          "Audit log",
          "Setup wizard",
          "Install + embed preview",
          "Global search",
          "Lead timeline & replay",
          "Lead notes & tags",
          "CSV + JSON export",
          "Duplicate review",
          "System status",
          "API documentation",
        ]} startDelay={18} />
      </FadeIn>
    </AbsoluteFill>
  );
}

function IntegrationsSlide() {
  return (
    <AbsoluteFill style={{ background: BG_GRADIENT, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: 80 }}>
      <FadeIn>
        <div style={{ fontSize: 18, color: "#a78bfa", fontFamily, fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase" }}>Integrations</div>
      </FadeIn>
      <FadeIn delay={8}>
        <h2 style={{ fontSize: 56, fontWeight: 800, color: TEXT, fontFamily, margin: "12px 0 40px", letterSpacing: "-0.02em" }}>
          Connected Everywhere
        </h2>
      </FadeIn>
      <div style={{ display: "flex", gap: 24, flexWrap: "wrap", justifyContent: "center" }}>
        <StatCard label="Voice & SMS" value="Telnyx" delay={15} color="#22c55e" />
        <StatCard label="Email" value="Resend" delay={20} color="#3b82f6" />
        <StatCard label="Notifications" value="Slack" delay={25} color="#e11d48" />
        <StatCard label="Analytics" value="GA4 + FB" delay={30} color="#f59e0b" />
        <StatCard label="CRM / Zapier" value="Webhooks" delay={35} color="#8b5cf6" />
        <StatCard label="AI" value="Claude" delay={40} color="#f97316" />
        <StatCard label="Video" value="Creatify" delay={45} color="#06b6d4" />
      </div>
    </AbsoluteFill>
  );
}

function SecuritySlide() {
  return (
    <AbsoluteFill style={{ background: BG_GRADIENT, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: 80 }}>
      <FadeIn>
        <div style={{ fontSize: 18, color: "#ef4444", fontFamily, fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase" }}>Security & Reliability</div>
      </FadeIn>
      <FadeIn delay={8}>
        <h2 style={{ fontSize: 56, fontWeight: 800, color: TEXT, fontFamily, margin: "12px 0 32px", letterSpacing: "-0.02em" }}>
          Enterprise-Grade
        </h2>
      </FadeIn>
      <FadeIn delay={15}>
        <FeatureGrid features={[
          "Admin auth (password + magic link + OTP)",
          "Rate limiting (all endpoints)",
          "Error recovery (exponential backoff)",
          "HMAC webhook signatures",
          "httpOnly secure cookies",
          "Health check endpoint",
          "SLA breach monitoring",
          "Audit log (all actions)",
          "Offline queue + sync",
          "Retargeting on abandon",
        ]} startDelay={18} />
      </FadeIn>
    </AbsoluteFill>
  );
}

function ClosingSlide() {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const pulse = Math.sin(frame / fps * Math.PI * 2) * 0.5 + 0.5;

  return (
    <AbsoluteFill style={{ background: BG_GRADIENT, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: 80 }}>
      <FadeIn>
        <h1 style={{
          fontSize: 80,
          fontWeight: 800,
          color: TEXT,
          fontFamily,
          margin: 0,
          letterSpacing: "-0.03em",
          textShadow: `0 0 ${60 * pulse}px ${PRIMARY}40`,
        }}>
          IntakeLLG
        </h1>
      </FadeIn>
      <FadeIn delay={10}>
        <p style={{ fontSize: 32, color: MUTED, fontFamily, marginTop: 16 }}>
          105 Features. One Platform.
        </p>
      </FadeIn>
      <FadeIn delay={20}>
        <div style={{ display: "flex", gap: 16, marginTop: 40 }}>
          <Badge color={SUCCESS}>Production Ready</Badge>
          <Badge color={PRIMARY}>Open Source</Badge>
          <Badge color={WARNING}>Built with Claude</Badge>
        </div>
      </FadeIn>
    </AbsoluteFill>
  );
}

// ============================================================
// Main Composition
// ============================================================

const SLIDE_DURATION = 30 * 6; // 6 seconds per slide (at 30fps)

export const IntakeLLGDemo: React.FC = () => {
  return (
    <AbsoluteFill>
      <Sequence from={0} durationInFrames={SLIDE_DURATION + 30}>
        <TitleSlide />
      </Sequence>
      <Sequence from={SLIDE_DURATION} durationInFrames={SLIDE_DURATION}>
        <WidgetSlide />
      </Sequence>
      <Sequence from={SLIDE_DURATION * 2} durationInFrames={SLIDE_DURATION}>
        <IntelligenceSlide />
      </Sequence>
      <Sequence from={SLIDE_DURATION * 3} durationInFrames={SLIDE_DURATION}>
        <AdminSlide />
      </Sequence>
      <Sequence from={SLIDE_DURATION * 4} durationInFrames={SLIDE_DURATION}>
        <IntegrationsSlide />
      </Sequence>
      <Sequence from={SLIDE_DURATION * 5} durationInFrames={SLIDE_DURATION}>
        <SecuritySlide />
      </Sequence>
      <Sequence from={SLIDE_DURATION * 6} durationInFrames={SLIDE_DURATION + 60}>
        <ClosingSlide />
      </Sequence>
    </AbsoluteFill>
  );
};
