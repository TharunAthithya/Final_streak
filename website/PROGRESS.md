# Build progress (spec: docs/MASTER_PROMPT.md)

Read this first when resuming.

## Status: phases 1–5 built (v1.0 of the site)
- [x] Phase 1 — tokens, layout, all section content (DOM, SEO-visible).
- [x] Phase 2 — Lenis + ScrollTrigger store, fixed canvas behind DOM, 3D phone with real screen textures, glass promise tokens (transmission on high tier, cheaper material on low), Lightformer lighting (no HDR), preloader, quality tiers + PerformanceMonitor, scroll progress bar, cursor spotlight, magnetic buttons.
- [x] Phase 3 — statement word scrub, beliefs focus + token morph (tile → ring → stairs), product tour (3D phone turns + screen swaps per step, rolling counters), rooms orbit + progress ring + pings, CSS-3D curved gallery (scroll + drag), principles reveals, footer wordmark reveal.
- [x] Phase 4 — staircase act: InstancedMesh stairs (completed steps turn gold), procedural mannequin with stair-climb cycle, pause/think, look-back, turn forward, next step; camera close → follow → pause → look-back → wide → drift; fog hides the stairs until the pull-out; live Streak Grid panel fills one dot per step; text overlays; fade out into the next section. Portrait-specific camera.
- [x] Phase 5 — download glass card with 3D phone landing + token convergence, sparkle burst on hover, desktop QR, 3-step install guide, iPhone card (waitlist hidden until an endpoint is set), reduced-motion/no-WebGL fallback, skip link, alt text, aria-hidden canvases.

## Verified (headless Chromium, SwiftShader WebGL)
- `tsc` clean, `vite build` OK, no page errors at 1440×900 and 390×844, no horizontal overflow, reduced-motion path renders the static site.

## Not verified / known limitations
- Real-device performance (mid-range Android FPS) and Lighthouse scores not measured yet.
- Character (superseded by v1.3, see changelog): rigged Mixamo "X Bot" (from the three.js examples, trimmed to idle + walk, meshopt-compressed to ~810 kB) at `public/models/character.glb`. The walk clip is scrubbed by scroll with extra hip/knee lift for stairs (`src/three/stairs/mannequin.ts`); feet are close to, not exactly planted on, each tread. Verify Mixamo licence terms before launch, or swap in your own Mixamo export with a real stair-climb clip.
- Two WebGL contexts (main + staircase) instead of one; the main one sleeps while the staircase is pinned.
- Screen textures are HTML recreations, not real screenshots; the phone screen's ring doesn't animate (it's an image).
- three.js chunk is ~920 kB (244 kB gzip) but only loads when 3D is on.
- No OG image yet (`public/og/og-image.png`), canonical URL is a placeholder.

## Needs confirmation from Mukunth
- FAQ drafts with `review: true` in `src/content.ts` (especially "Is it free?"); Principles 01–05 wording.
- APK size, minimum Android version, final domain, privacy policy/contact links (`src/config/site.ts`).
- Real screenshots for `public/screens/` (same file names).

## Changelog
- v1.1: realistic rigged character replaces the primitive mannequin; staircase is now a clean solid block (fewer steps, 10 climbed + 2 after the wide shot, slower: ~36vh of scroll per step); staircase canvas mounts as soon as the section is near and always renders while mounted (fixes "only appears after tapping"); product tour switches screens when the next step's text reaches the middle of the screen.
- v1.2: beliefs highlight once an item's top passes 2/3 down the screen; gallery eases to the nearest screen (always one centred phone); smaller hero phone ≤480px; nav solid on load. Checked 360×740, 768×1024, 1024×768, 844×390 (no horizontal overflow). Character swap pending: user to supply a Mixamo character + "Walking Up The Stairs" clip (stock image provided can't be used: watermarked, and 2D).
- v1.3: male character — X Bot body with a shader-painted outfit (short dark hair, grey open jacket over a cream tee, brown belt, khaki trousers, brown boots), masculine proportions (bone scaling), driven live by the three.js Soldier's male Walk/Idle (public/models/motion.glb) via a model-space retarget (StairsCanvas.tsx → makeRetargeter). Outfit colours/bands: OUTFIT in mannequin.ts.
- v1.4: slimmer waist + narrower pelvis (masculinize), step-over-step foot IK so each foot plants on a tread (makeLegIK in mannequin.ts), short hair.
- v1.5: fix legs folding over the back on fast devices (IK measured bone lengths before the model was scaled; now re-measured each frame and posing waits for setup); longer jacket over hips; straighter torso.
- v1.6: hero glass tokens on fixed, evenly spaced slots around the phone (never over the screen), one size, gentle camera-facing sway; 8 tokens.
