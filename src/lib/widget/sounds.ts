/**
 * Widget sound effects.
 * Optional audio feedback for chat interactions.
 * All sounds generated via Web Audio API - no files needed.
 */

type SoundType = "message_sent" | "message_received" | "option_select" | "step_complete" | "error" | "success";

let audioCtx: AudioContext | null = null;

function getAudioContext(): AudioContext | null {
  if (typeof window === "undefined") return null;
  if (!audioCtx) {
    try { audioCtx = new AudioContext(); } catch { return null; }
  }
  return audioCtx;
}

function playTone(frequency: number, duration: number, volume = 0.1, type: OscillatorType = "sine") {
  const ctx = getAudioContext();
  if (!ctx) return;

  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.connect(gain);
  gain.connect(ctx.destination);
  osc.frequency.value = frequency;
  osc.type = type;
  gain.gain.value = volume;
  gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);
  osc.start();
  osc.stop(ctx.currentTime + duration);
}

const SOUNDS: Record<SoundType, () => void> = {
  message_sent: () => {
    playTone(600, 0.1, 0.08);
    setTimeout(() => playTone(800, 0.1, 0.06), 80);
  },
  message_received: () => {
    playTone(400, 0.15, 0.06);
    setTimeout(() => playTone(500, 0.15, 0.06), 100);
  },
  option_select: () => {
    playTone(700, 0.08, 0.05);
  },
  step_complete: () => {
    playTone(500, 0.1, 0.06);
    setTimeout(() => playTone(700, 0.1, 0.06), 100);
    setTimeout(() => playTone(900, 0.15, 0.06), 200);
  },
  error: () => {
    playTone(300, 0.2, 0.08, "square");
    setTimeout(() => playTone(250, 0.3, 0.06, "square"), 150);
  },
  success: () => {
    playTone(523, 0.1, 0.06);
    setTimeout(() => playTone(659, 0.1, 0.06), 100);
    setTimeout(() => playTone(784, 0.2, 0.06), 200);
  },
};

let soundEnabled = true;

export function setSoundEnabled(enabled: boolean) { soundEnabled = enabled; }
export function isSoundEnabled() { return soundEnabled; }

export function playSound(type: SoundType) {
  if (!soundEnabled) return;
  SOUNDS[type]?.();
}
