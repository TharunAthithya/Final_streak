import { MOTION } from '../config/motion';

export type Anchor = { id: string; x: number; y: number; h: number; focus: number };

const H_AT_Z0 = () => 2 * MOTION.camera.z * Math.tan((MOTION.camera.fov * Math.PI) / 360);

/**
 * Projects DOM placeholders ([data-anchor]) onto the z=0 plane of the fixed main camera.
 * `focus` is 1 when the element is centred in the viewport and falls to 0 as it leaves.
 */
export function readAnchors(ids: readonly string[]): Anchor[] {
  const vh = innerHeight, vw = innerWidth, H = H_AT_Z0(), W = H * (vw / vh);
  const out: Anchor[] = [];
  for (const id of ids) {
    const el = document.querySelector<HTMLElement>(`[data-anchor="${id}"]`);
    if (!el) continue;
    const r = el.getBoundingClientRect();
    if (r.height < 2) continue; // hidden (e.g. display:none on mobile)
    const cy = r.top + r.height / 2;
    const focus = Math.max(0, 1 - Math.abs(cy - vh / 2) / (vh * 0.75));
    out.push({ id, x: ((r.left + r.width / 2) / vw - 0.5) * W, y: -(cy / vh - 0.5) * H, h: (r.height / vh) * H, focus });
  }
  return out;
}

/** The most centred visible anchor, or null. */
export const pick = (a: Anchor[]) => a.reduce<Anchor | null>((best, x) => (x.focus > 0.05 && (!best || x.focus > best.focus) ? x : best), null);

/** Frame-rate independent damping toward a target. */
export const damp = (cur: number, target: number, lambda: number, dt: number) => cur + (target - cur) * (1 - Math.exp(-lambda * dt));
