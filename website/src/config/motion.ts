/**
 * Every scroll range, camera keyframe and 3D budget lives here, so the choreography can be tuned
 * without touching scene code. Progress values are 0–1 within a section.
 */
export const MOTION = {
  /** Main canvas camera (fixed); DOM anchors are projected onto the z=0 plane. */
  camera: { z: 6, fov: 35 },
  phone: {
    /** Base rotation per anchor [x, y, z] in radians. */
    rot: {
      'hero-phone': [0.05, -0.38, 0.1],
      'tour-phone': [0, -0.25, 0],
      'dl-phone': [0.08, 0.32, -0.06],
    } as Record<string, [number, number, number]>,
    /** Tour: extra Y rotation per step so the phone turns as the screen changes. */
    tourYaw: [-0.32, 0.28, -0.18, 0.34],
    pointerTilt: 0.12,
  },
  tokens: { high: 8, medium: 8, low: 6 },
  dpr: { high: 1.75, medium: 1.25, low: 1 },

  /** Appendix A timeline. Each entry is [start, end] of stairs-section progress. */
  stairs: {
    sectionHeightVh: 1000,
    intro: [0.0, 0.06],
    climb: [0.06, 0.42],     // ~10 steps over ~360vh of scroll: slow, deliberate
    pause: [0.42, 0.52],
    lookBack: [0.52, 0.62],
    pullOut: [0.56, 0.82],
    textLook: [0.8, 0.9],
    turnForward: [0.86, 0.91],
    textKeep: [0.9, 1.0],
    nextStep: [0.91, 0.975],
    exit: [0.975, 1.0],
    stepsClimbed: 10,
    stepsAfter: 2,
    totalSteps: 34, // a few more ahead, fading into fog — the journey never ends
    rise: 0.2,
    run: 0.38,
    width: 1.3,
    characterHeight: 1.75,
    /** Camera offsets relative to the character (close) or the journey midpoint (wide). */
    cam: {
      close: [1.3, 1.25, 2.4],
      pause: [1.9, 1.4, 1.1],
      lookBack: [2.2, 1.6, -0.9],
      wide: [8.5, 3.2, 4.8],
      widePortrait: [3.6, 4, 9.5],
      portraitScale: 1.2,
      portraitLookLift: 0.55,
    },
    fog: { closeNear: 1.6, closeFar: 6.5, wideNear: 6, wideFar: 17 },
  },
} as const;
