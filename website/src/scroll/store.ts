/** Shared, mutable scroll state. Written by ScrollTrigger, read every frame by the 3D scene (no React re-renders). */
export type Tier = 'high' | 'medium' | 'low';

export const store = {
  p: {} as Record<string, number>, // per-section progress (enter → leave)
  tourStep: 0,
  pointer: { x: 0, y: 0 }, // -1..1
  dlHover: 0,
};

export const env = (() => {
  const reduced = typeof matchMedia !== 'undefined' && matchMedia('(prefers-reduced-motion: reduce)').matches;
  let webgl = false;
  try { webgl = !!document.createElement('canvas').getContext('webgl2'); } catch { webgl = false; }
  const nav = navigator as Navigator & { deviceMemory?: number };
  const touch = matchMedia('(pointer: coarse)').matches;
  const small = innerWidth < 820;
  const weak = (nav.deviceMemory ?? 8) <= 4 || (navigator.hardwareConcurrency ?? 8) <= 4;
  const tier: Tier = touch || small ? (weak ? 'low' : 'medium') : weak ? 'medium' : 'high';
  return { reduced, webgl, tier, touch, use3D: webgl && !reduced };
})();

export const clamp01 = (v: number) => Math.min(1, Math.max(0, v));
/** Maps p inside [a, b] to 0–1. */
export const range = (p: number, [a, b]: readonly [number, number]) => clamp01((p - a) / (b - a));
export const smooth = (t: number) => t * t * (3 - 2 * t);
