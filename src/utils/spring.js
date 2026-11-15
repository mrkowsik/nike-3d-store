export const TWO_PI = Math.PI * 2;
export const HALF_PI = Math.PI / 2;
const TRANSITION_ZONE = 0.12;
const TILT_FACTOR = 0.5;

export const clamp01 = (v) => Math.min(1, Math.max(0, v));
export const smoothstep = (v) => v * v * (3 - 2 * v);
export const smootherstep = (v) => v * v * v * (v * (v * 6 - 15) + 10);

export function createSpring(initialValue = 0) {
  return { value: initialValue, velocity: 0 };
}

export function smoothDamp(spring, target, smoothTime = 0.15, deltaTime = 0.016) {
  if (smoothTime <= 0.0001) {
    spring.value = target;
    spring.velocity = 0;
    return target;
  }
  const omega = 2 / smoothTime;
  const x = omega * deltaTime;
  const exp = 1 / (1 + x + 0.48 * x * x + 0.235 * x * x * x);
  const change = spring.value - target;
  const temp = (spring.velocity + omega * change) * deltaTime;
  spring.velocity = (spring.velocity - omega * temp) * exp;
  spring.value = target + (change + temp) * exp;
  return spring.value;
}

export function getAngleQuadrant(angle) {
  const norm = ((angle % TWO_PI) + TWO_PI) % TWO_PI / HALF_PI;
  const from = Math.floor(norm) % 4;
  const to = (from + 1) % 4;
  const frac = norm - Math.floor(norm);
  const widthMix = smoothstep(frac);
  const swap = smootherstep(clamp01((frac - (0.5 - TRANSITION_ZONE / 2)) / TRANSITION_ZONE));
  const s = (frac < 0.5 ? frac : frac - 1) * HALF_PI;
  const c = smoothstep(clamp01(Math.abs(frac - 0.5) / 0.25));
  const tilt = TILT_FACTOR * s * c;

  return { from, to, widthMix, swap, tilt };
}
