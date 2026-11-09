import { useEffect, useMemo, useRef, useState } from 'react';
import * as THREE from 'three';
import { Canvas, useFrame } from '@react-three/fiber';
import { Environment, Lightformer, PerformanceMonitor, useTexture } from '@react-three/drei';
import { RoundedBoxGeometry } from 'three-stdlib';
import { MOTION } from '../config/motion';
import { SCREENS } from '../config/site';
import { env, store, clamp01 } from '../scroll/store';
import { damp, pick, readAnchors } from './anchors';
import { PALETTE } from './palette';

const PHONE_ANCHORS = ['hero-phone', 'tour-phone', 'dl-phone'] as const;
const TOKEN_ANCHORS = ['hero-phone', 'beliefs-art', 'rooms-phone', 'dl-phone'] as const;
/** [x, y, z] around the hero phone: three per side, one above, one below. Shapes cycle tile/ring/check/flame. */
const HERO_SLOTS: [number, number, number][] = [
  [-0.34, 0.3, -0.1], [0.41, 0.36, 0.05], [-0.37, -0.02, 0.08], [0.45, 0.04, -0.12],
  [-0.33, -0.34, -0.12], [0.39, -0.3, 0.06], [0.16, 0.6, -0.2], [-0.14, -0.6, -0.2],
];
const TOUR_SCREENS = [SCREENS.home.src, SCREENS.freeze.src, SCREENS.rooms.src, SCREENS.lesson.src];

/* ---------------- Phone ---------------- */
function Phone3D() {
  const group = useRef<THREE.Group>(null!);
  const screen = useRef<THREE.MeshBasicMaterial>(null!);
  const textures = useTexture(TOUR_SCREENS);
  useMemo(() => textures.forEach((t) => { t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8; }), [textures]);
  const body = useMemo(() => new RoundedBoxGeometry(0.4615, 1, 0.045, 4, 0.06), []);
  const s = useRef({ x: 4, y: 0, sc: 0.001, rx: 0, ry: 0, rz: 0, step: -1 });

  useFrame((_, dt) => {
    const a = pick(readAnchors(PHONE_ANCHORS));
    const cur = s.current;
    const heroP = clamp01(((store.p.hero ?? 0) - 0.5) * 2); // 0 while hero fills the screen
    let tx = 3.2, ty = -0.3, tsc = 0.001, r: readonly number[] = [0, -0.6, 0];
    if (a) {
      tx = a.x; ty = a.y; tsc = a.h * 1.04; r = MOTION.phone.rot[a.id];
      if (a.id === 'hero-phone') { tx += heroP * 0.5; r = [r[0], r[1] - heroP * 0.6, r[2]]; }
      if (a.id === 'tour-phone') r = [r[0], MOTION.phone.tourYaw[store.tourStep] ?? 0, r[2]];
    }
    const k = 5;
    cur.x = damp(cur.x, tx, k, dt); cur.y = damp(cur.y, ty, k, dt); cur.sc = damp(cur.sc, tsc, k, dt);
    cur.rx = damp(cur.rx, r[0] + store.pointer.y * MOTION.phone.pointerTilt, 3, dt);
    cur.ry = damp(cur.ry, r[1] + store.pointer.x * MOTION.phone.pointerTilt, 3, dt);
    cur.rz = damp(cur.rz, r[2], 3, dt);
    group.current.position.set(cur.x, cur.y, 0);
    group.current.rotation.set(cur.rx, cur.ry, cur.rz);
    group.current.scale.setScalar(Math.max(cur.sc, 0.001));
    const step = a?.id === 'tour-phone' ? store.tourStep : 0;
    if (step !== cur.step) { cur.step = step; screen.current.map = textures[step]; screen.current.needsUpdate = true; }
  });

  return (
    <group ref={group}>
      <mesh geometry={body}><meshPhysicalMaterial color="#0b0907" roughness={0.35} metalness={0.6} clearcoat={1} /></mesh>
      <mesh position={[0, 0, 0.0232]}>
        <planeGeometry args={[0.43, 0.968]} />
        <meshBasicMaterial ref={screen} map={textures[0]} toneMapped={false} />
      </mesh>
    </group>
  );
}

/* ---------------- Glass promise tokens ---------------- */
function tokenGeometries() {
  const tile = new RoundedBoxGeometry(0.26, 0.26, 0.07, 4, 0.06);
  const ring = new THREE.TorusGeometry(0.12, 0.035, 16, 48);
  const check = new THREE.Shape();
  check.moveTo(-0.13, 0.0); check.lineTo(-0.04, -0.09); check.lineTo(0.14, 0.1); check.lineTo(0.1, 0.14); check.lineTo(-0.04, -0.01); check.lineTo(-0.09, 0.04);
  const flame = new THREE.Shape();
  flame.moveTo(0, -0.15); flame.bezierCurveTo(0.13, -0.15, 0.14, 0.0, 0.06, 0.06); flame.bezierCurveTo(0.08, 0.12, 0.02, 0.16, 0.0, 0.18);
  flame.bezierCurveTo(-0.02, 0.1, -0.13, 0.06, -0.12, -0.04); flame.bezierCurveTo(-0.11, -0.12, -0.06, -0.15, 0, -0.15);
  const ex = { depth: 0.05, bevelEnabled: true, bevelSize: 0.015, bevelThickness: 0.015, bevelSegments: 3 };
  const g = [tile, ring, new THREE.ExtrudeGeometry(check, ex), new THREE.ExtrudeGeometry(flame, ex)];
  g.slice(2).forEach((x) => x.center());
  return g;
}

function Tokens({ count }: { count: number }) {
  const geos = useMemo(tokenGeometries, []);
  const mat = useMemo(() => env.tier === 'high'
    ? new THREE.MeshPhysicalMaterial({ color: PALETTE.gold, transmission: 1, thickness: 0.5, roughness: 0.12, ior: 1.45, attenuationColor: new THREE.Color('#C98B47'), attenuationDistance: 0.9, clearcoat: 1, envMapIntensity: 1.3 })
    : new THREE.MeshStandardMaterial({ color: PALETTE.gold, roughness: 0.25, metalness: 0.35, transparent: true, opacity: 0.6, emissive: new THREE.Color(PALETTE.glow), envMapIntensity: 1.2 }), []);
  const refs = useRef<THREE.Mesh[]>([]);
  const state = useMemo(() => Array.from({ length: count }, () => ({ x: 0, y: -4, z: 0, s: 0 })), [count]);

  useFrame(({ clock }, dt) => {
    const t = clock.elapsedTime;
    const a = pick(readAnchors(TOKEN_ANCHORS));
    const heroP = clamp01(((store.p.hero ?? 0) - 0.45) * 2);
    const bel = clamp01(((store.p.beliefs ?? 0) - 0.28) / 0.44) * 2; // 0 → 2 across the three beliefs
    for (let i = 0; i < count; i++) {
      const m = refs.current[i]; if (!m) continue;
      const st = state[i];
      let x = 0, y = -3, z = -1, sc = 0;
      if (a) {
        const h = a.h; let fx = 0, fy = 0, fz = 0, fs = 0.5;
        if (a.id === 'hero-phone') {
          // Hand-placed slots around the phone's outline (units of phone height; phone is ~0.46 wide).
          // Nothing sits over the screen; the scroll-out pulls them in toward the phone.
          const slot = HERO_SLOTS[i % HERO_SLOTS.length], pull = 1 - heroP * 0.35;
          fx = slot[0] * pull; fy = slot[1] * pull + Math.sin(t * 0.8 + i * 1.7) * 0.012; fz = slot[2];
          fs = i < HERO_SLOTS.length ? 0.5 : 0;
        } else if (a.id === 'beliefs-art') {
          const f = (k: number) => clamp01(1 - Math.abs(bel - k)); // weight of formation k
          const single = i === 0 ? [0, 0, 0, 1.9] : [0, 0, -0.4, 0];
          const ring = i < 8 ? [Math.cos((i / 8) * Math.PI * 2) * 0.55, Math.sin((i / 8) * Math.PI * 2) * 0.55, 0, 0.75] : [0, 0, -0.4, 0];
          const stair = i < 9 ? [-0.6 + i * 0.15, -0.45 + i * 0.12, 0, 0.7] : [0, 0, -0.4, 0];
          const w = [f(0), f(1), f(2)], sum = w[0] + w[1] + w[2] || 1;
          [fx, fy, fz, fs] = [0, 1, 2, 3].map((j) => (single[j] * w[0] + ring[j] * w[1] + stair[j] * w[2]) / sum);
        } else if (a.id === 'rooms-phone') {
          const ang = (i / Math.min(count, 8)) * Math.PI * 2 + t * 0.25 + (store.p.rooms ?? 0) * 3;
          fx = Math.cos(ang) * 0.62; fz = Math.sin(ang) * 0.4; fy = ((i % 3) - 1) * 0.3 + Math.sin(t + i) * 0.03; fs = i < 8 ? 0.45 : 0;
        } else {
          const ang = (i / count) * Math.PI * 2 + t * 0.15, r = 0.66 - store.dlHover * 0.08;
          fx = Math.cos(ang) * r * 0.8; fy = Math.sin(ang) * r; fz = -0.2; fs = 0.42 + store.dlHover * 0.1;
        }
        x = a.x + fx * h + store.pointer.x * 0.06 * (1 + (i % 3)); y = a.y + fy * h + store.pointer.y * 0.06 * (1 + (i % 3)); z = fz * h; sc = fs * h;
      }
      st.x = damp(st.x, x, 3.2, dt); st.y = damp(st.y, y, 3.2, dt); st.z = damp(st.z, z, 3.2, dt); st.s = damp(st.s, sc, 3.2, dt);
      m.position.set(st.x, st.y, st.z);
      m.scale.setScalar(Math.max(st.s, 0.0001));
      m.rotation.set(Math.sin(t * 0.5 + i) * 0.18, Math.sin(t * 0.4 + i * 1.3) * 0.45, Math.cos(t * 0.35 + i) * 0.12); // gentle sway, always readable
    }
  });

  return <>{state.map((_, i) => <mesh key={i} ref={(m) => { if (m) refs.current[i] = m; }} geometry={geos[i % 4]} material={mat} />)}</>;
}

/** Fixed, decorative full-viewport canvas behind the DOM. Sleeps while the staircase act owns the screen. */
export default function MainCanvas() {
  const [dpr, setDpr] = useState<number>(MOTION.dpr[env.tier]);
  const [awake, setAwake] = useState(true);
  useEffect(() => {
    const el = document.querySelector('[data-act="stairs"] .stairs__pin');
    if (!el) return;
    const io = new IntersectionObserver(([e]) => setAwake(!(e.isIntersecting && e.intersectionRatio > 0.98)), { threshold: [0, 0.98, 1] });
    io.observe(el);
    return () => io.disconnect();
  }, []);
  return (
    <div className={`main-canvas${awake ? '' : ' is-asleep'}`} aria-hidden="true">
      <Canvas dpr={dpr} frameloop={awake ? 'always' : 'never'} camera={{ position: [0, 0, MOTION.camera.z], fov: MOTION.camera.fov }} gl={{ antialias: env.tier !== 'low', alpha: true, powerPreference: 'high-performance' }}>
        <PerformanceMonitor onDecline={() => setDpr(1)} />
        <ambientLight intensity={0.35} color={PALETTE.cream} />
        <directionalLight position={[3, 4, 5]} intensity={1.6} color="#FFE7C2" />
        <Environment resolution={128} frames={1}>
          <Lightformer form="rect" intensity={3} color="#FFE2B3" position={[3, 3, 4]} scale={[4, 2, 1]} />
          <Lightformer form="rect" intensity={2.2} color={PALETTE.gold} position={[-4, 1, 2]} scale={[2, 5, 1]} />
          <Lightformer form="ring" intensity={1.2} color="#7A5A36" position={[0, -3, 3]} scale={3} />
        </Environment>
        <Phone3D />
        <Tokens count={MOTION.tokens[env.tier]} />
      </Canvas>
    </div>
  );
}
