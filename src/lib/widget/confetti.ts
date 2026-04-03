/**
 * Lightweight confetti animation for intake completion.
 * Pure CSS + JS, no dependencies.
 */

const COLORS = ["#3b82f6", "#22c55e", "#f59e0b", "#ef4444", "#8b5cf6", "#ec4899", "#06b6d4"];

export function fireConfetti(container?: HTMLElement): void {
  if (typeof document === "undefined") return;

  const target = container ?? document.body;
  const count = 60;

  for (let i = 0; i < count; i++) {
    const particle = document.createElement("div");
    const color = COLORS[Math.floor(Math.random() * COLORS.length)];
    const size = 6 + Math.random() * 6;
    const startX = 40 + Math.random() * 20; // % from left
    const drift = -100 + Math.random() * 200; // px horizontal drift
    const duration = 1.5 + Math.random() * 1.5;
    const delay = Math.random() * 0.3;
    const rotation = Math.random() * 720;
    const isCircle = Math.random() > 0.5;

    particle.style.cssText = [
      "position:fixed",
      `width:${size}px`,
      `height:${isCircle ? size : size * 0.6}px`,
      `background:${color}`,
      `border-radius:${isCircle ? "50%" : "2px"}`,
      `left:${startX}%`,
      "top:-10px",
      "pointer-events:none",
      "z-index:2147483647",
      `animation:confetti-fall ${duration}s ${delay}s ease-out forwards`,
      `--drift:${drift}px`,
      `--rotation:${rotation}deg`,
    ].join(";");

    target.appendChild(particle);
    setTimeout(() => particle.remove(), (duration + delay) * 1000 + 100);
  }

  // Inject animation if not present
  if (!document.getElementById("confetti-style")) {
    const style = document.createElement("style");
    style.id = "confetti-style";
    style.textContent = `
      @keyframes confetti-fall {
        0% { transform: translateY(0) translateX(0) rotate(0deg); opacity: 1; }
        100% { transform: translateY(100vh) translateX(var(--drift)) rotate(var(--rotation)); opacity: 0; }
      }
    `;
    document.head.appendChild(style);
  }
}
