import * as THREE from 'three';

/**
 * Character: Mixamo "X Bot" body (public/models/character.glb) driven by the male Walk/Idle clips from the
 * three.js "Soldier" (public/models/motion.glb) — same Mixamo skeleton, so the clips apply directly.
 * Animation clips are never played in real time: their time is set from scroll, so every
 * frame is a pure function of scroll progress and reverses cleanly.
 */
export type Bones = Record<'hips' | 'spine2' | 'neck' | 'head' | 'upLegL' | 'upLegR' | 'legL' | 'legR', THREE.Object3D>;

export function findBones(root: THREE.Object3D): Bones {
  const b = (n: string) => root.getObjectByName(`mixamorig${n}`)!;
  return { hips: b('Hips'), spine2: b('Spine2'), neck: b('Neck'), head: b('Head'), upLegL: b('LeftUpLeg'), upLegR: b('RightUpLeg'), legL: b('LeftLeg'), legR: b('RightLeg') };
}

/**
 * Outfit painted in the shader from each vertex's bind-pose position (height band + side), so it follows the
 * skin through every animation: dark hair, skin, grey jacket over a cream tee, brown belt, khaki trousers, brown boots.
 * Bind-pose space: y -1 (soles) → 1 (crown), |x| grows toward the hands (T-pose), +z is the front.
 */
export const OUTFIT = {
  hair: '#2A211C', skin: '#C9946F', jacket: '#646B75', tee: '#E6DED0', belt: '#5A3A25', trousers: '#8C8A73', boots: '#5B3A22',
  bands: { boots: 0.07, trousers: 0.43, belt: 0.535, neck: 0.835, hairline: 0.972 },
  sleeve: { start: 0.17, rolledTo: 0.5, hands: 0.79 }, teeHalfWidth: 0.07,
};

export function dressCharacter(root: THREE.Object3D) {
  const c = (h: string) => new THREE.Color(h);
  const mat = new THREE.MeshStandardMaterial({ roughness: 0.75, metalness: 0 });
  mat.onBeforeCompile = (sh) => {
    const o = OUTFIT, b = o.bands;
    Object.assign(sh.uniforms, Object.fromEntries(['hair', 'skin', 'jacket', 'tee', 'belt', 'trousers', 'boots'].map((k) => [`c_${k}`, { value: c((o as Record<string, unknown>)[k] as string) }])));
    sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\nvarying vec3 vBind;').replace('#include <begin_vertex>', '#include <begin_vertex>\nvBind = position;');
    sh.fragmentShader = sh.fragmentShader
      .replace('#include <common>', `#include <common>
varying vec3 vBind;
uniform vec3 c_hair, c_skin, c_jacket, c_tee, c_belt, c_trousers, c_boots;
vec3 outfit() {
  float t = (vBind.y + 1.0) * 0.5, ax = abs(vBind.x);
  if (t < ${b.boots.toFixed(3)}) return c_boots;
  if (t < ${b.trousers.toFixed(3)} && ax < ${o.sleeve.start.toFixed(3)}) return c_trousers;
  if (t < ${b.belt.toFixed(3)} && ax < ${o.sleeve.start.toFixed(3)}) return (vBind.z > 0.0 && ax < ${o.teeHalfWidth.toFixed(3)}) ? c_belt : c_jacket; // coat hem covers the hips; belt shows at the open front
  if (t < ${b.neck.toFixed(3)}) {
    if (ax > ${o.sleeve.hands.toFixed(3)}) return c_skin;
    if (ax > ${o.sleeve.rolledTo.toFixed(3)}) return c_skin;      // rolled-up sleeves
    if (ax > ${o.sleeve.start.toFixed(3)}) return c_jacket;
    return (vBind.z > 0.0 && ax < ${o.teeHalfWidth.toFixed(3)}) ? c_tee : c_jacket; // open jacket over a tee
  }
  if (t > ${b.hairline.toFixed(3)} || (t > 0.93 && vBind.z < -0.06)) return c_hair; // short cut: top + back only
  return c_skin;
}`)
      .replace('vec4 diffuseColor = vec4( diffuse, opacity );', 'vec4 diffuseColor = vec4( outfit(), opacity );');
  };
  root.traverse((o) => {
    const m = o as THREE.SkinnedMesh;
    if (!m.isMesh) return;
    m.material = mat;
    m.castShadow = true;
    m.frustumCulled = false;
  });
}


export type PoseInput = { steps: number; stand: number; think: number; lookBack: number };

/**
 * AnimationMixer only rewrites a bone when its sampled value changes, so additive tweaks would pile up.
 * restore() puts the un-layered pose back before mixer.update(); snapshot() records it before layering.
 */
export function makeLayerGuard(b: Bones) {
  const list = Object.values(b), base = list.map((o) => o.quaternion.clone());
  return {
    restore: () => list.forEach((o, i) => o.quaternion.copy(base[i])),
    snapshot: () => list.forEach((o, i) => base[i].copy(o.quaternion)),
  };
}

/** Layered on top of the sampled clip each frame: stair lift, hesitation, look back. */
export function layerPose(b: Bones, p: PoseInput, walkPhase: number) {
  const k = 1 - p.stand;
  // Stairs need a higher knee than a flat walk: extra hip + knee flex on the swinging leg.
  const swingL = Math.max(0, Math.sin(walkPhase * Math.PI * 2)) * k;
  const swingR = Math.max(0, -Math.sin(walkPhase * Math.PI * 2)) * k;
  void swingL; void swingR; // legs are placed by makeLegIK
  // Hesitation: chin lifts toward the next step, weight settles.
  b.head.rotateX(-0.32 * p.think * (1 - p.lookBack));
  // Look back: head leads, chest follows.
  const e = (t: number) => t * t * (3 - 2 * t);
  b.neck.rotateY(0.75 * e(Math.min(1, p.lookBack * 1.4)));
  b.head.rotateY(0.45 * e(Math.min(1, p.lookBack * 1.4)));
  b.spine2.rotateY(0.5 * e(Math.max(0, p.lookBack * 1.4 - 0.4)));
  b.head.rotateX(0.18 * p.lookBack); // eyes down the stairs
}

/**
 * Masculine build on the neutral X Bot body: broad chest and shoulders, slim waist, narrow pelvis and glutes.
 * Child bones get the inverse scale so arms and legs keep their length and thickness (net leg scale = 1, so
 * the foot IK below works on clean, unscaled leg bones).
 */
export function masculinize(root: THREE.Object3D) {
  const b = (n: string) => root.getObjectByName(`mixamorig${n}`);
  const set = (n: string, x: number, y: number, z: number) => b(n)?.scale.set(x, y, z);
  const H = 0.8, HZ = 0.74; // pelvis width / depth
  set('Hips', H, 1, HZ);
  ['LeftUpLeg', 'RightUpLeg'].forEach((n) => set(n, 1 / H, 1, 1 / HZ));
  set('Spine', 1.02 / H, 1, 0.96 / HZ);            // straight waist (no hourglass)
  set('Spine1', 1.08 / 1.02, 1, 1.0 / 0.96);
  set('Spine2', 1.18 / 1.08, 1, 1.06 / 1.0);       // broad chest + shoulders
  ['LeftShoulder', 'RightShoulder', 'Neck'].forEach((n) => set(n, 1 / 1.18, 1, 1 / 1.06));
}

/**
 * Stair climbing with planted feet (two-bone IK). Step-over-step gait: the left foot uses even treads, the right
 * odd ones. For body progress s, each foot is planted on its last tread for the first half of its cycle, then
 * swings two treads up in an arc that clears the step nose. Everything is a pure function of s (reversible).
 */
export function makeLegIK(root: THREE.Object3D, stair: { rise: number; run: number }) {
  const bone = (n: string) => root.getObjectByName(`mixamorig${n}`)!;
  const legs = (['Left', 'Right'] as const).map((side, parity) => ({ parity, hip: bone(`${side}UpLeg`), knee: bone(`${side}Leg`), foot: bone(`${side}Foot`), L1: 0, L2: 0, ankle: 0 }));
  const v = () => new THREE.Vector3();
  const hipP = v(), kneeP = v(), footP = v(), T = v(), dir = v(), perp = v(), K = v(), cur = v(), want = v();
  const q = new THREE.Quaternion(), wq = new THREE.Quaternion(), pq = new THREE.Quaternion();

  // Bone lengths are re-read every frame (pose-independent), so a late scale change can never corrupt the solve.
  const measure = () => {
    root.updateMatrixWorld(true);
    for (const l of legs) {
      l.hip.getWorldPosition(hipP); l.knee.getWorldPosition(kneeP); l.foot.getWorldPosition(footP);
      l.L1 = hipP.distanceTo(kneeP); l.L2 = kneeP.distanceTo(footP); l.ankle = 0.085 * (l.L1 + l.L2) / 0.86;
    }
  };
  /** Rotates `b` (in world space) so the vector from its position to `childPos` points at `target`. */
  const aim = (b: THREE.Object3D, childPos: THREE.Vector3, target: THREE.Vector3) => {
    b.getWorldPosition(hipP);
    cur.subVectors(childPos, hipP).normalize(); want.subVectors(target, hipP).normalize();
    q.setFromUnitVectors(cur, want);
    b.getWorldQuaternion(wq); b.parent!.getWorldQuaternion(pq);
    b.quaternion.copy(pq.invert().multiply(q.multiply(wq)));
    b.updateMatrixWorld(true);
  };

  return (steps: number) => {
    measure();
    const fwd = new THREE.Vector3(0, 0.35, -1).normalize(); // knees point forward and a little up
    for (const l of legs) {
      const base = l.parity + 2 * Math.floor((steps - l.parity) / 2);
      const phase = (steps - base) / 2; // 0..1 over this foot's two-tread cycle
      const swing = Math.max(0, (phase - 0.5) * 2);
      const e = swing * swing * (3 - 2 * swing);
      const tread = base + 2 * e;
      root.updateMatrixWorld(true);
      l.hip.getWorldPosition(hipP);
      T.set(hipP.x, stair.rise * tread + l.ankle + Math.sin(Math.PI * swing) * 0.16, -stair.run * tread - 0.02);
      // Two-bone solve: knee position from the law of cosines in the plane of (hip→target, forward).
      dir.subVectors(T, hipP); const d = Math.min(dir.length(), l.L1 + l.L2 - 1e-3); dir.normalize();
      const a = Math.acos(THREE.MathUtils.clamp((l.L1 * l.L1 + d * d - l.L2 * l.L2) / (2 * l.L1 * d), -1, 1));
      perp.copy(fwd).addScaledVector(dir, -fwd.dot(dir)).normalize();
      K.copy(hipP).addScaledVector(dir, Math.cos(a) * l.L1).addScaledVector(perp, Math.sin(a) * l.L1);
      l.knee.getWorldPosition(kneeP); aim(l.hip, kneeP, K);
      l.foot.getWorldPosition(footP); aim(l.knee, footP, T);
    }
  };
}
