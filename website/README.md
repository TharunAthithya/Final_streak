# Streak website

Marketing site for the Streak Android app. Vite + React + TypeScript, Three.js via @react-three/fiber + drei, GSAP ScrollTrigger + Lenis.

## Run
```bash
cd website
npm install
npm run dev        # http://localhost:5173
npm run build      # static output in dist/
```

## Swap assets
| What | Where |
|---|---|
| App screenshots | `public/screens/*.png` — keep the file names (`home`, `rooms`, `lesson`, `freeze`, `profile`, `streak-grid`). Current files are recreations of the app UI, not real captures. |
| APK link, version, size, min Android | `src/config/site.ts` → `SITE.apk` (point `url` at a GitHub Release to avoid host size limits) |
| Waitlist endpoint, footer links | `src/config/site.ts` (empty values are hidden, never faked) |
| All copy (beliefs, tour, principles, FAQ) | `src/content.ts` |
| Colours, fonts, easing | `src/styles/tokens.css` |
| Scroll ranges, camera keyframes, token counts, DPR | `src/config/motion.ts` (the staircase timeline and camera offsets are all here) |
| Character | procedural mannequin in `src/three/stairs/mannequin.ts` (a Mixamo GLB can replace it later) |

## Deploy
Static `dist/` works on Netlify, Vercel or GitHub Pages (`base: './'` in `vite.config.ts`). Don't commit the APK (`.gitignore` blocks it); upload it to a GitHub Release and set `SITE.apk.url`.

## Structure
```
src/config/site.ts   single config (APK, links, screenshots)
src/content.ts       all copy
src/sections/        one file per page section
src/components/      Sparkle, Phone, pills, Marquee, hooks
src/config/motion.ts scroll ranges + camera keyframes
src/scroll/          Lenis + ScrollTrigger → shared store (per-section 0–1 progress, CSS --p / --act vars)
src/three/           MainCanvas (phone + glass tokens, DOM-anchored), stairs/ (lazy staircase act)
legacy/              previous single-file site, kept for reference
```

## How the 3D is wired
- Sections carry `data-act="name"`; ScrollTrigger writes their progress into `store.p.name` and a CSS var `--act`.
- DOM placeholders carry `data-anchor="..."`; the fixed canvas projects them to 3D so the phone/tokens line up with the layout at every screen size. Elements with `.anchor-3d` are hidden when 3D is on (the 3D phone replaces them).
- The staircase (`data-pinned`) uses CSS `position: sticky` and its own lazy-loaded canvas; `storyAt(progress)` in `StairsCanvas.tsx` turns scroll into climb/pause/look-back/wide values, so everything reverses when you scroll up.
- No WebGL2 or `prefers-reduced-motion` → no canvas, static staircase story, instant reveals.
