import { Suspense, use, useEffect, useMemo, useRef } from 'react';
import { GLTFLoader, type GLTF } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { MeshoptDecoder } from 'three/examples/jsm/libs/meshopt_decoder.module.js';
import * as THREE from 'three';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { useGLTF } from '@react-three/drei';
import { MOTION } from '../../config/motion';
import { env, range, smooth, store } from '../../scroll/store';
import { PALETTE } from '../palette';
import { damp } from '../anchors';
import { dressCharacter, findBones, layerPose, makeLegIK, masculinize } from './mannequin';

const S = MOTION.stairs;
const BODY = 'models/character.glb';
const MOTION_CLIPS = 'models/motion.glb';
/** Some hosts (e.g. the claude.ai preview) can't serve .glb; preview builds inline both files as base64. */
const parse = (b64: string) => new GLTFLoader().setMeshoptDecoder(MeshoptDecoder).parseAsync(Uint8Array.from(atob(b64), (c) => c.charCodeAt(0)).buffer, '');
const inlineModel: Promise<[GLTF, GLTF] | null> = import('./character-inline').then(({ body, motion }) => (body ? Promise.all([parse(body), parse(motion)]) : null));

/**
 * Live retarget from the Soldier rig (male walk/idle) onto the X Bot body. Both are Mixamo skeletons but with
 * different rest poses, so each bone's rotation is matched in model space every frame:
 *   target_model = F · source_model · source_rest_model⁻¹ · F⁻¹ · target_rest_model (F = 180° turn), then made local.
 */
function modelSpaceRest(root: THREE.Object3D) {
  const rest = new Map<string, THREE.Quaternion>();
  const walk = (o: THREE.Object3D, parent: THREE.Quaternion) => {
    const q = parent.clone().multiply(o.quaternion);
    rest.set(o.name, q);
    o.children.forEach((c) => walk(c, q));
  };
  root.children.forEach((c) => walk(c, new THREE.Quaternion()));
  return rest;
}

/** The Soldier rig faces -Z, the X Bot faces +Z: deltas are turned 180° about Y between them. */
const FLIP = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), Math.PI);
const FLIP_INV = FLIP.clone().invert();

function makeRetargeter(source: THREE.Object3D, target: THREE.Object3D, sourceTPose?: THREE.AnimationClip) {
  // The X Bot's default pose is a T-pose; put the Soldier in its own T-pose clip before reading its rest rotations.
  if (sourceTPose) { const m = new THREE.AnimationMixer(source); m.clipAction(sourceTPose).play(); m.update(0); m.stopAllAction(); m.uncacheRoot(source); }
  const sRest = modelSpaceRest(source), tRest = modelSpaceRest(target);
  const pairs: { s: THREE.Object3D; t: THREE.Object3D; fix: THREE.Quaternion }[] = [];
  target.traverse((t) => {
    if (!t.name.startsWith('mixamorig')) return;
    const src = source.getObjectByName(t.name);
    if (src && sRest.has(t.name)) pairs.push({ s: src, t, fix: sRest.get(t.name)!.clone().invert().multiply(FLIP_INV).multiply(tRest.get(t.name)!) });
  });
  const sModel = new Map<THREE.Object3D, THREE.Quaternion>(), tModel = new Map<THREE.Object3D, THREE.Quaternion>();
  const modelQ = (o: THREE.Object3D, root: THREE.Object3D, cache: Map<THREE.Object3D, THREE.Quaternion>): THREE.Quaternion => {
    if (o === root || !o.parent) return new THREE.Quaternion();
    const hit = cache.get(o); if (hit) return hit;
    const q = modelQ(o.parent, root, cache).clone().multiply(o.quaternion); cache.set(o, q); return q;
  };
  return () => {
    sModel.clear(); tModel.clear();
    for (const { s, t, fix } of pairs) { // parents come first (traverse order)
      const want = FLIP.clone().multiply(modelQ(s, source, sModel)).multiply(fix);
      const parentModel = modelQ(t.parent!, target, tModel);
      t.quaternion.copy(parentModel.clone().invert().multiply(want));
      tModel.set(t, want);
    }
  };
}

function useCharacterModel() {
  const inline = use(inlineModel);
  // The branch never changes at runtime, so hook order is stable.
  const [body, motion] = inline ?? (useGLTF([BODY, MOTION_CLIPS]) as unknown as [GLTF, GLTF]);
  return { scene: body.scene, source: motion.scene, animations: motion.animations };
}
const v = (a: readonly number[]) => new THREE.Vector3(a[0], a[1], a[2]);

/** Converts stairs-section progress into the story state (pure function of scroll → fully reversible). */
export function storyAt(p: number) {
  const climb = smooth(range(p, S.climb));
  const next = smooth(range(p, S.nextStep));
  const steps = climb * S.stepsClimbed + next * S.stepsAfter;
  const pause = range(p, S.pause), back = smooth(range(p, S.lookBack)), fwd = smooth(range(p, S.turnForward));
  const lookBack = back * (1 - fwd);
  // Blend into/out of walking over a short window so the gait settles instead of snapping.
  const walkIn = (r: readonly number[]) => Math.min(range(p, [r[0], r[0] + 0.02]), 1 - range(p, [r[1] - 0.02, r[1]]));
  const stand = 1 - Math.max(walkIn(S.climb), walkIn(S.nextStep));
  const think = Math.sin(Math.PI * Math.min(1, pause * 1.15)) * (1 - back);
  return { steps, stand, think, lookBack, wide: smooth(range(p, S.pullOut)), pause };
}

function Character({ onRoot }: { onRoot: (o: THREE.Object3D) => void }) {
  const { scene, source, animations } = useCharacterModel();
  const bones = useMemo(() => findBones(scene), [scene]);
  const legIK = useMemo(() => makeLegIK(scene, { rise: S.rise, run: S.run }), [scene]);
  const apply = useMemo(() => makeRetargeter(source, scene, animations.find((c) => /tpose/i.test(c.name))), [source, scene, animations]);
  const holder = useRef<THREE.Group>(null!);
  const ready = useRef(false); // set once the model is dressed + scaled; no posing before that
  const mixer = useMemo(() => { void apply; return new THREE.AnimationMixer(source); }, [source, apply]);
  const actions = useMemo(() => {
    const get = (n: string) => { const a = mixer.clipAction(animations.find((c) => c.name.toLowerCase() === n)!); a.play(); a.paused = true; return a; };
    return { walk: get('walk'), idle: get('idle') };
  }, [mixer, animations]);

  useEffect(() => {
    dressCharacter(scene);
    masculinize(scene);
    const box = new THREE.Box3().setFromObject(scene);
    scene.scale.setScalar(S.characterHeight / (box.max.y - box.min.y));
    onRoot(holder.current);
    ready.current = true;
  }, [scene, onRoot]);

  useFrame(({ clock }) => {
    if (!ready.current) return;
    const st = storyAt(store.p.stairs ?? 0);
    // One walk cycle = two stairs. Clip time comes from steps climbed, never from the clock.
    const phase = (st.steps / 2) % 1;
    actions.walk.time = phase * actions.walk.getClip().duration;
    actions.idle.time = (clock.elapsedTime * 0.5) % actions.idle.getClip().duration; // ambient breathing only
    actions.walk.setEffectiveWeight(1 - st.stand);
    actions.idle.setEffectiveWeight(st.stand);
    mixer.update(0);
    apply(); // writes every bone's local rotation fresh each frame, so layered tweaks can't accumulate
    layerPose(bones, st, phase);
    holder.current.position.set(0, S.rise * st.steps, -S.run * st.steps);
    legIK(st.steps); // feet planted on treads, after the body is placed
  });

  // The model faces +Z; the stairs climb toward -Z.
  return <group ref={holder}><primitive object={scene} rotation={[0, Math.PI, 0]} /></group>;
}

function Scene() {
  const { camera, scene, size } = useThree();
  const stepsMesh = useRef<THREE.InstancedMesh>(null!);
  const charRoot = useRef<THREE.Object3D | null>(null);
  const lastFilled = useRef(-2);
  const cam = useRef({ pos: new THREE.Vector3(1.3, 1.6, 2.6), look: new THREE.Vector3(0, 1.2, -0.3) });
  const fog = useMemo(() => new THREE.Fog(PALETTE.bg, S.fog.closeNear, S.fog.closeFar), []);
  const portrait = size.height > size.width;
  const onRoot = useMemo(() => (o: THREE.Object3D) => { charRoot.current = o; }, []);

  useEffect(() => {
    scene.fog = fog; scene.background = new THREE.Color(PALETTE.bg);
    // Clean monolithic staircase: each step is a solid block down to the floor.
    const m = new THREE.Matrix4(), sc = new THREE.Vector3(), q = new THREE.Quaternion(), pos = new THREE.Vector3();
    for (let i = 0; i < S.totalSteps; i++) {
      const h = S.rise * (i + 1) + 0.4;
      m.compose(pos.set(0, S.rise * i - h / 2, -S.run * i), q, sc.set(S.width, h, S.run));
      stepsMesh.current.setMatrixAt(i, m);
      stepsMesh.current.setColorAt(i, new THREE.Color(PALETTE.claySteps));
    }
    stepsMesh.current.instanceMatrix.needsUpdate = true;
  }, [scene, fog]);

  useFrame((_, dt) => {
    const st = storyAt(store.p.stairs ?? 0);
    const filled = Math.floor(st.steps + 0.001);
    if (filled !== lastFilled.current) {
      const gold = new THREE.Color(PALETTE.gold), base = new THREE.Color(PALETTE.claySteps);
      for (let i = 0; i < S.totalSteps; i++) stepsMesh.current.setColorAt(i, i >= 1 && i <= filled ? gold : base);
      stepsMesh.current.instanceColor!.needsUpdate = true;
      lastFilled.current = filled;
    }
    const char = new THREE.Vector3(0, S.rise * st.steps, -S.run * st.steps);
    const chest = char.clone().add(new THREE.Vector3(0, 1.2, -0.3));
    const scale = portrait ? S.cam.portraitScale : 1;
    const off = v(S.cam.close).lerp(v(S.cam.pause), smooth(st.pause)).lerp(v(S.cam.lookBack), smooth(Math.min(1, st.lookBack * 1.3)));
    off.multiplyScalar(portrait ? 1.25 : 1);
    const mid = new THREE.Vector3().lerp(char, portrait ? 0.7 : 0.55).add(new THREE.Vector3(0, portrait ? 1.3 : 0.8, 0));
    const widePos = mid.clone().add(v(portrait ? S.cam.widePortrait : S.cam.wide).multiplyScalar(scale));
    const targetPos = chest.clone().add(off).lerp(widePos, st.wide);
    const targetLook = chest.clone().lerp(mid, st.wide);
    if (portrait) targetLook.y += S.cam.portraitLookLift * (1 - st.wide);
    (['x', 'y', 'z'] as const).forEach((a) => { cam.current.pos[a] = damp(cam.current.pos[a], targetPos[a], 4, dt); cam.current.look[a] = damp(cam.current.look[a], targetLook[a], 4, dt); });
    camera.position.copy(cam.current.pos);
    camera.lookAt(cam.current.look);
    fog.near = THREE.MathUtils.lerp(S.fog.closeNear, S.fog.wideNear * scale, st.wide);
    fog.far = THREE.MathUtils.lerp(S.fog.closeFar, S.fog.wideFar * scale, st.wide);
  });

  return (
    <>
      <hemisphereLight args={['#FFF1DC', PALETTE.glow, 1]} />
      <directionalLight position={[5, 9, 6]} intensity={1.7} color="#FFE7C2" castShadow={env.tier === 'high'} shadow-mapSize={[1024, 1024]} shadow-camera-left={-8} shadow-camera-right={8} shadow-camera-top={8} shadow-camera-bottom={-8} shadow-camera-far={40} shadow-bias={-0.0005} />
      <directionalLight position={[-4, 3, -7]} intensity={1.3} color={PALETTE.gold} />{/* gold rim */}
      <instancedMesh ref={stepsMesh} args={[undefined, undefined, S.totalSteps]} receiveShadow castShadow>
        <boxGeometry args={[1, 1, 1]} />
        <meshStandardMaterial roughness={0.8} />
      </instancedMesh>
      <Suspense fallback={null}><Character onRoot={onRoot} /></Suspense>
    </>
  );
}



/** Lazy-loaded WebGL act for the pinned staircase section. Mounted (and always rendering) only while near the viewport. */
export default function StairsCanvas() {
  return (
    <Canvas shadows={env.tier === 'high'} dpr={MOTION.dpr[env.tier]} camera={{ fov: 38, near: 0.1, far: 80, position: [1.3, 1.6, 2.6] }} gl={{ antialias: env.tier !== 'low' }} resize={{ debounce: 0 }}>
      <Scene />
    </Canvas>
  );
}
