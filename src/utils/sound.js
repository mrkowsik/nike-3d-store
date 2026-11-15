// Subtle tactile audio feedback for UI and product interactions using Web Audio API
let audioCtx = null;

function getAudioContext() {
  if (typeof window === 'undefined') return null;
  const AudioContext = window.AudioContext || window.webkitAudioContext;
  if (!AudioContext) return null;
  if (!audioCtx) {
    audioCtx = new AudioContext();
  }
  return audioCtx;
}

/**
 * Plays a smooth, silky, tactile "pop/click" sound when a customer clicks on any product.
 * Resumes suspended AudioContext seamlessly upon click.
 */
export function playProductClickSound() {
  try {
    const ctx = getAudioContext();
    if (!ctx) return;

    const playTone = () => {
      const now = ctx.currentTime;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sine';
      // Smooth frequency drop from 680Hz to 200Hz gives a crisp, modern boutique "pop"
      osc.frequency.setValueAtTime(680, now);
      osc.frequency.exponentialRampToValueAtTime(200, now + 0.055);

      // Fast attack & soft exponential release
      gain.gain.setValueAtTime(0.001, now);
      gain.gain.exponentialRampToValueAtTime(0.28, now + 0.004);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.06);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(now);
      osc.stop(now + 0.065);
    };

    if (ctx.state === 'suspended') {
      ctx.resume().then(playTone).catch(() => {});
    } else {
      playTone();
    }
  } catch {
    // Graceful fallback if audio is blocked
  }
}

/**
 * Subtle tick sound for thumbnail selection or stepping between products.
 */
export function playThumbTickSound() {
  try {
    const ctx = getAudioContext();
    if (!ctx) return;

    const playTick = () => {
      const now = ctx.currentTime;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(840, now);
      osc.frequency.exponentialRampToValueAtTime(420, now + 0.03);

      gain.gain.setValueAtTime(0.001, now);
      gain.gain.exponentialRampToValueAtTime(0.14, now + 0.002);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.035);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(now);
      osc.stop(now + 0.04);
    };

    if (ctx.state === 'suspended') {
      ctx.resume().then(playTick).catch(() => {});
    } else {
      playTick();
    }
  } catch {
    // Graceful fallback
  }
}
