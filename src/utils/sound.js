// Subtle tactile audio feedback for UI and product interactions using Web Audio API
let audioCtx = null;

function getAudioContext() {
  if (typeof window === 'undefined') return null;
  const AudioContext = window.AudioContext || window.webkitAudioContext;
  if (!AudioContext) return null;
  if (!audioCtx) {
    audioCtx = new AudioContext();
  }
  if (audioCtx.state === 'suspended') {
    audioCtx.resume().catch(() => {});
  }
  return audioCtx;
}

/**
 * Plays a smooth, silky, tactile "pop/click" sound when a customer clicks on any product.
 * Uses a soft pitch-decay sine wave (Apple/Boutique UI feel) with zero latency.
 */
export function playProductClickSound() {
  try {
    const ctx = getAudioContext();
    if (!ctx) return;

    const now = ctx.currentTime;

    // Primary oscillator: soft sine pop
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(640, now);
    osc.frequency.exponentialRampToValueAtTime(220, now + 0.05);

    // Subtle volume envelope: smooth attack & exponential release
    gain.gain.setValueAtTime(0.001, now);
    gain.gain.exponentialRampToValueAtTime(0.24, now + 0.004);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.055);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start(now);
    osc.stop(now + 0.06);
  } catch {
    // Graceful fallback if audio context is blocked
  }
}

/**
 * Subtle tick sound for thumbnail selection or stepping between products.
 */
export function playThumbTickSound() {
  try {
    const ctx = getAudioContext();
    if (!ctx) return;

    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(880, now);
    osc.frequency.exponentialRampToValueAtTime(440, now + 0.03);

    gain.gain.setValueAtTime(0.001, now);
    gain.gain.exponentialRampToValueAtTime(0.12, now + 0.002);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.035);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start(now);
    osc.stop(now + 0.04);
  } catch {
    // Graceful fallback
  }
}
