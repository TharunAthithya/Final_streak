# STREAK WEBSITE — MASTER BUILD PROMPT
### A premium, scroll-driven 3D marketing website for the Streak habit app

---

## 0. YOUR ROLE AND HOW TO WORK

You are a senior creative developer and 3D web designer who builds award-level, scroll-driven WebGL websites (the kind that win Awwwards Site of the Day). You are also a product designer with strong taste. Build the complete marketing website for my Android app, **Streak**.

How to work:

1. **Inspect first.** Look at the existing project folder (framework, components, styling, animation libraries, assets). Do not rebuild what already works. If the folder is empty or has only a basic page, start fresh with the default stack in section 4.
2. **Propose before you build.** Give me a short plan (one page max): chosen stack and why, scene architecture, asset needs, and any risks. Then continue without waiting unless something essential is missing.
3. **Build in phases and give a short checkpoint after each:**
   - Phase 1: project setup, design tokens, layout, DOM content for every section (no 3D yet)
   - Phase 2: scroll system, persistent 3D canvas, hero
   - Phase 3: remaining sections and their 3D behavior
   - Phase 4: the Streak Grid staircase showcase (Appendix A)
   - Phase 5: download section, performance, mobile version, accessibility, fallback, QA
4. **Ask questions only if essential** (max 5, asked up front in one message). Otherwise make sensible assumptions, flag them in the checkpoint, and keep going.
5. **Storytelling and polish beat quantity of effects.** Every animation must have a reason. If something looks cheap, remove it.

---

## 1. PRODUCT CONTEXT

**Streak** is a habit app for people who keep starting over. Each day you make one small promise to yourself, check it off, and bring friends into a "room" so you're never doing it alone.

- Tagline: **"Keep your promises. Keep your streak."**
- Platforms: **Android now** (direct APK download), **iPhone coming soon**.
- Audience: young adults who struggle with consistency and want accountability without pressure.
- Philosophy: *"Look how far you've come. Now keep going."*

**Facts visible in the real app (use these, don't invent others):**
- Home screen: "Good evening, Ananya." / "Day 12 of keeping your promise." / a "Before You Begin" card ("Start your day with a short lesson", Begin button) / a "Today's Promise" card showing "2 of 4 kept", a circular progress ring at 50%, "2 promises remaining today", and a flame chip "6-day streak" / a notification bell with a badge.
- Rooms: a room called "Morning Runners" with "Today's Progress: 1 of 2 habits completed", "50% Complete", a progress bar, and a habit list (e.g. "Morning run — Completed", "Stretch 10 min").
- A flame "12-day streak" chip.
- The **Streak Grid**: a grid of days where filled squares are completed days.

**[Fill in or confirm: any other real features, e.g. reminders, lessons, rewards, analytics. Only describe features that actually exist.]**

---

## 2. REFERENCE: THE ONDO.FINANCE FEEL (what to take, what not to take)

I want the **animation and motion quality** of https://ondo.finance/ but with Streak's own theme, content and identity. Treat this as a style direction, not a pixel spec. (If I attach screenshots or notes of Ondo's scroll behavior, they override this section.)

**Take from it:**
- Confident, oversized typography on a strict grid with generous negative space.
- A hero that opens with a huge headline, an immediate "Scroll / Swipe to explore" cue, and a continuous logo-style marquee strip right below.
- **Translucent, glassy 3D objects** that feel like physical tokens, floating and reacting to the cursor and to scroll. (Ondo's own brand motion pairs stark, "brutalist" 2D motion with see-through 3D tokens, so aim for that contrast: hard typographic motion plus soft glassy 3D.)
- **One continuous experience**: the 3D world persists behind the page while sections scroll over it, so the page feels like a single film, not stacked blocks.
- Stats shown with **rolling-digit counters**.
- A three-statement "We believe in…" block, and a **numbered 01–05 principles list**.
- Pinned sections where scroll drives a visual.
- An **oversized wordmark in the footer**.

**Do NOT take:** Ondo's colors, copy, logos, imagery, partner logos, or finance tone. Streak is warm, personal and motivating, not institutional.

---

## 3. BRAND & DESIGN SYSTEM (match the app and my current site's identity, not its flat layout)

Sample exact values from the attached screenshots wherever possible. Starting points:

- **Mood:** warm, premium, calm-but-motivating. **Dark only.**
- **Colors (CSS custom properties + a matching Three.js palette):**
  - Background espresso `#17120D`, with a soft radial brown glow `#3A2E21` behind focal areas. Never pure black.
  - Sand-gold accent `#E3C28D` (buttons, rings, highlights, glass tint)
  - Cream text `#F5F1EA`; muted text `#A89F94`
  - Card surface `#0D0C0B` with a 1px border `rgba(227,194,141,0.15)`
  - Notification pink `#D9879A` and success sage `#8FB59A`, used sparingly
- **Typography:** heavy, wide/extended uppercase grotesque for headlines (match the screenshot; if unidentifiable use Archivo ExtraExpanded or Syne ExtraBold), clean geometric sans for body (Plus Jakarta Sans or Outfit), small letter-spaced uppercase labels like "TODAY'S PROMISE" and "GOOD EVENING". Load via Google Fonts or self-host, with `font-display: swap`.
- **Signature elements to reuse everywhere:** four-point gold sparkles, pill buttons, rounded dark cards, the flame streak chip, the gold circular progress ring, tilted phone mockups, subtle film grain.
- **3D material language:** translucent **amber/gold glass** (soft refraction, warm tint, gentle inner glow), plus matte cream "clay" for the character and staircase. Everything should dissolve into the espresso background through warm fog.

---

## 4. TECHNICAL ARCHITECTURE

**Default stack (use only if the existing project doesn't already dictate something compatible):** Vite or Next.js (static export) + React + TypeScript, `three`, `@react-three/fiber`, `@react-three/drei`, `gsap` + `ScrollTrigger`, `lenis` for smooth scrolling. Add helper libs (e.g. `maath`, `zustand`, `@react-three/postprocessing`) only if they earn their place. Do not add libraries blindly.

**Core architecture:**

1. **One persistent, fixed, full-viewport WebGL canvas** behind the DOM (`pointer-events: none`). All real text, headings, buttons and links stay in the **DOM** (for SEO, accessibility and selection), layered above the canvas.
2. **A single scroll system:** Lenis smooth scroll synced to GSAP's ticker. Each section has its own 0→1 progress via ScrollTrigger, written to a shared store. The 3D scene reads the store inside `useFrame` and **damps toward the target** (no hard jumps).
3. **Scroll-driven, never time-driven.** Scrolling down advances, scrolling up reverses, and every animation is reversible and scrubbable. Nothing plays to completion on its own. (Ambient idle motion like gentle floating is allowed, but story animation is scroll-bound.)
4. **A camera rig** with named keyframes per section, moving along smooth curves (e.g. CatmullRom) with eased interpolation. No cuts, no abrupt zooms.
5. **Scene "acts"** are separate components that mount/unmount or sleep based on scroll range, so only the relevant 3D work is running at any moment. Lazy-load the heavy staircase act.
6. **Lighting without external HDR downloads:** build the environment from drei `Lightformer`s: warm key light, gold rim light, soft fill. Use baked/contact shadows rather than expensive real-time shadows.
7. **Post-processing, if used, must be minimal** (very soft bloom, vignette, grain) and fully disabled on low-end/mobile.
8. **Glass tokens:** use `MeshPhysicalMaterial` with transmission, but cap the count of transmissive objects and provide a cheaper fallback material (fresnel + opacity) for mobile and low-power devices.
9. **Quality tiers:** detect GPU/device capability (e.g. via drei `PerformanceMonitor` plus a one-time capability check) and choose high/medium/low tiers automatically. Cap DPR, stop rendering (`frameloop="demand"` or pause) when the canvas isn't relevant.

---

## 5. THE PAGE, SECTION BY SECTION

Every section below needs both a **DOM layout** and a **3D/scroll behavior**. Copy is a strong starting point and I'm happy for you to improve it, but keep the voice: warm, short, human. **Never invent testimonials, user counts, ratings, press logos or awards.** Where a stat would go, use real app values from section 1 or a clearly marked placeholder in the config file.

### 5.0 Preloader (≈1.5s max)
Gold "S" badge and a thin progress line while assets load; then the badge morphs/fades into the hero as the first glass token drops into the scene. Skippable and never blocks longer than needed.

### 5.1 Navbar
Sticky, glass-blur, hides on scroll down and returns on scroll up. Logo (gold rounded "S" + wordmark), anchor links (Why Streak, Features, Rooms, Download, FAQ), pill Download button. Mobile: full-screen menu with a staggered reveal.

### 5.2 Hero
- Headline **"KEEP YOUR PROMISES. KEEP YOUR STREAK."** in the heavy wide uppercase face, revealed line by line (masked slide-up, tight stagger).
- Subcopy: "Streak is a habit app for people who keep starting over. Make one small promise to yourself each day, check it off, and bring friends into a room so you're never doing it alone."
- Primary pill **Download for Android** (magnetic hover, animated gold gradient border) and secondary **iPhone, coming soon** pill.
- 3D: a cluster of translucent gold-glass **"promise tokens"** (rounded tiles, a flame, a check mark) floating around a tilted 3D phone showing the real Home screenshot. They drift with the cursor (parallax) and gently counter-rotate. Twinkling four-point sparkles.
- "Scroll / Swipe to explore" cue with a subtle animated line.
- **Scroll behavior:** as the user scrolls out of the hero, the tokens pull toward the phone and settle, the camera slides forward, and the phone rotates and slides to one side to make room for the next section.
- Right under the hero: an infinite **marquee** of habit words ("Run. Read. Meditate. Sleep early. Drink water. Stretch. Journal.") with sparkle separators.

### 5.3 Statement
One big sentence, "Streak is a habit app for people who keep starting over.", where words light up from muted to cream as you scroll. Background glow shifts subtly; a few glass tokens drift past in the depth layer.

### 5.4 "Streak believes in" (three beliefs)
A pinned block with three statements, mirroring Ondo's "We believe in…" structure: **Small promises / Never alone / Progress you can see.** As you scroll, each statement takes focus in turn (the others dim), with a short paragraph and the matching 3D token in the background morphing: a single tile → a ring of avatars → a rising staircase silhouette.

### 5.5 Product tour (pinned, 3D phone)
One pinned section where the **3D phone persists** and the screen texture changes per step as scroll progresses, with the phone rotating to a new angle each time and text blocks cross-fading beside it:
1. **One promise a day**: Today's Promise card; the gold progress ring animates 0→50% and the "2 of 4 kept" number rolls up.
2. **Streaks that feel earned**: the flame flickers; the "12-day streak" chip counts up with rolling digits.
3. **Rooms with friends**: the Morning Runners screen; progress bar fills.
4. **Start every day with a short lesson**: the "Before You Begin" card.
Use real screenshots as phone-screen textures (see section 7).

### 5.6 Rooms (social accountability)
Glass avatar tokens orbit a central "room" disc in 3D. As you scroll, floating activity pings appear ("Priya completed Morning run") and the room's progress ring fills. Names and activity are **clearly demo/example content**, not claims.

### 5.7 SIGNATURE SECTION — STREAK GRID SHOWCASE (the staircase)
This is the centerpiece of the whole site. The full specification is **Appendix A**. Implement it exactly as specified there, with the integration notes in Appendix A's preface. It takes over the canvas as a pinned, scroll-scrubbed cinematic. After the wide shot and "Now keep going.", the character takes the next step successfully and keeps climbing; then the pin releases, the staircase dissolves into warm fog, the canvas is handed back to the persistent scene, and the page flows straight into **5.8 Principles**.

### 5.8 Principles (numbered 01–05)
A large numbered list with hairline dividers, each item revealing on scroll (number counts in, title slides up, line draws across). Suggested items, which **I must confirm against the real app**:
01 **Tiny by design**: one small promise a day.
02 **Never alone**: rooms keep you accountable together.
03 **Progress you can see**: the Streak Grid and streak flame.
04 **Starts your day right**: a short lesson before you begin.
05 **Made for people who keep starting over**: no shame, just the next step.

### 5.9 Screenshot gallery
A **3D curved carousel** of every app screen in phone frames. Scroll rotates the carousel, the active phone faces forward and glows, side phones recede with depth blur/fade. Also draggable. Each screen has a short label.

### 5.10 Download section
A large glass card on espresso with a gold glow. Contains:
- Headline "Take your first step." and the primary **Download for Android (APK)** button with version, file size and minimum Android version (from the config file).
- A **QR code** (generated at build time or client-side, pointing to the APK/landing URL) shown on desktop only.
- A **3-step install guide:** 1) Open the downloaded file, 2) Allow "Install unknown apps" when asked, 3) Tap Install. Include a short, honest line about the Android security prompt for apps installed outside the Play Store.
- An **iPhone "coming soon"** state with an optional email waitlist form (front-end only, wired to a configurable endpoint; show a success state).
- 3D: the phone and tokens return, converge and settle as if landing, with the final sparkle burst on button hover.

### 5.11 FAQ
Accordion with smooth height animation. Questions: Is it free? Is it safe to install an APK? Why isn't it on the Play Store? When is iPhone coming? How do rooms work? Can I use it without friends? **[Answers must be confirmed by me; write sensible drafts and mark them for review.]**

### 5.12 Final CTA + footer
A last huge headline "KEEP YOUR PROMISES." with the download button, then the footer: links (privacy policy, contact, socials as placeholders), copyright, and an **oversized "STREAK" wordmark** that spans the page width with a subtle scroll-linked reveal and gold sparkle.

---

## 6. MOTION & INTERACTION DETAILS

- **Type motion:** masked line reveals, staggered letter/word reveals, scrubbed word highlighting. Hard, confident easing for type (the "brutalist" side); soft, floaty easing for 3D (the "glass" side).
- **Cursor:** subtle spotlight glow following the pointer; magnetic primary buttons; 3D tilt on cards and the phone. Disabled on touch.
- **Counters:** rolling-digit counters for numbers.
- **Progress rings, flame flicker, sparkle twinkle** as reusable components.
- **Scroll progress** indicator (thin gold line) at the top.
- **Section transitions:** background glow color and fog density shift gently between sections so the page feels like one continuous space.
- **Micro-interactions:** hover states, focus rings, pressed states on every interactive element.
- Animate **transform and opacity only** in the DOM; keep layout thrash out of scroll handlers.
- Honor **`prefers-reduced-motion`**: no scroll-scrubbed camera moves or parallax; show static, well-composed frames of each scene and instant text reveals.

---

## 7. ASSETS & FILE STRUCTURE

```text
/public
  /models
    character.glb        // rigged human (see asset strategy below), Draco-compressed
    phone.glb            // optional; otherwise build the phone procedurally
  /screens
    home.png             // Today's Promise / Good evening screen
    rooms.png            // Morning Runners room screen
    streak-grid.png      // REAL Streak Grid screenshot (required for Appendix A)
    lesson.png           // Before You Begin lesson
    [more as available]
  /downloads
    streak.apk
  /og
    og-image.png
/src
  /config/site.ts        // version, apk size, min Android, apk path/URL, links, waitlist endpoint
  /scroll                // Lenis + ScrollTrigger + shared progress store
  /three                 // canvas, camera rig, lighting, acts, materials, quality tiers
  /sections              // DOM sections
  /components            // buttons, counters, marquee, accordion, rings, sparkles
```

**Screenshots:** I will place real screenshots at the paths above. Until I do, show tasteful placeholder screens that match the theme and are trivially swappable by file name. The phone-screen textures must use the real screenshots when present (correct color space, mipmaps, anisotropy).

**Character asset strategy (important):**
- **Preferred:** a rigged humanoid GLB with animation clips (idle, climbing/walking up stairs, looking around/thinking, looking back). I can provide one (e.g. exported from Mixamo as GLB). Drive animation by **scrubbing the AnimationMixer time from scroll progress** so everything is reversible, never by playing clips in real time.
- **Fallback if no model is provided:** build a **minimal, beautiful procedural mannequin** (clean silhouette from primitives/capsules, no facial detail) with a procedural climbing cycle: stride phase tied to steps climbed, foot placement on each tread, knee/hip/arm swing, subtle torso lean, and head look-at for the pause and look-back moments. Tell me clearly which path you took and what limitations it has.

**Model/texture budgets:** character ≤ ~1.5 MB (Draco/Meshopt), total initial 3D payload as small as possible, textures in WebP/KTX2, instanced meshes for repeated geometry (the staircase must use `InstancedMesh`).

---

## 8. PERFORMANCE, MOBILE, ACCESSIBILITY

- Target **60 fps on a modern laptop** and a smooth experience on a mid-range Android phone (most visitors will arrive from Android).
- Lighthouse mobile targets: **Performance 85+**, Accessibility 95+, SEO 95+. No layout shift from fonts or canvas.
- **Mobile is its own designed experience**, not the desktop one shrunk: portrait compositions, fewer/lighter tokens, no transmission materials, lower DPR, simpler camera moves, tap-friendly UI, "Swipe to explore" wording, thumb-reachable Download button.
- **Graceful fallback:** if WebGL is unavailable, the device is very low-end, or reduced motion is on, render a high-quality **non-WebGL version** (CSS/2D layered phone mockups, pre-rendered stills or a short optimized loop for the staircase story) that still tells the full story.
- Pause rendering when the tab is hidden or the canvas is off-screen. Dispose geometries/materials/textures on unmount.
- Accessibility: semantic landmarks and headings, a skip link, keyboard-reachable everything, visible focus states, WCAG AA contrast, alt text for all screenshots, `aria-hidden` on the decorative canvas, and a text-equivalent for the staircase story.

---

## 9. SEO & TECHNICAL REQUIREMENTS

- Title, meta description, Open Graph and Twitter cards, favicon set, canonical URL, `sitemap`/`robots` as appropriate, and JSON-LD `MobileApplication` (Android, free if applicable, `downloadUrl`).
- All headline/copy content present in the initial HTML (not only in the canvas).
- Static output deployable to Netlify, Vercel or GitHub Pages. Note any host limits for the APK (e.g. large-file limits) and make the APK URL **a single config value** so I can point it at GitHub Releases or another host without touching components.
- Clean, commented, typed code; the whole theme driven by tokens; no magic numbers scattered through scene code (keep scroll ranges and camera keyframes in one readable config).
- Include a **README** with: how to run, how to swap screenshots/model/APK, how to tune scroll ranges and camera keyframes, and how to deploy.

---

## 10. HARD RULES

1. Do not break storytelling to add effects. Every effect must support the message.
2. Do not use stock-looking 3D characters, cartoon styling, or cluttered scenes.
3. Do not fake social proof (testimonials, download counts, ratings, press, awards).
4. No scroll-jacking beyond the two pinned moments (product tour and staircase), and never trap the user.
5. All story animations are scroll-scrubbed and reversible.
6. The text/CTA must remain readable over every 3D frame (add gradient scrims or adjust composition, never sacrifice legibility).
7. Match the Streak theme (espresso, sand-gold, cream, sparkles, pills, flame, ring) everywhere.
8. Do not invent app features. Only describe what's in section 1 or what I confirm.

---

## 11. DELIVERABLES

1. The plan (short), then working code phase by phase.
2. Complete, runnable project with the folder structure above.
3. Placeholders that are easy to swap for my real screenshots, character model and APK.
4. README (run, swap assets, tune scroll/camera, deploy).
5. A final summary: what was built, assumptions made, known limitations, and **3–4 suggestions** to make the site even better.

---
---

# APPENDIX A — STREAK GRID SHOWCASE (SIGNATURE SECTION SPEC)

**Integration notes (these apply on top of the spec below):**
- This is Section 5.7 of the master prompt. It runs inside the same site, using the same Lenis/ScrollTrigger system and the same Streak palette: espresso background that the scene fog dissolves into, cream-clay staircase and character, sand-gold rim light and accents, and the real Streak Grid screenshot at `/public/screens/streak-grid.png`.
- On entry, the persistent scene (phone, tokens) fades/slides out of frame and the staircase act fades in; on exit, the reverse. Both directions must be smooth.
- Use `InstancedMesh` for stairs, warm fog for atmospheric depth, and baked/contact shadows for performance. Lazy-load this act.
- Follow the character asset strategy in section 7 (scrubbed AnimationMixer with a rigged GLB, or the procedural mannequin fallback). Climbing, pause, look-back and turn-forward must all be scrubbed by scroll so they reverse correctly.
- On mobile, provide a deliberately composed portrait version (camera path and framing adapted, simpler lighting), not a squeezed desktop scene.
- **Ending and hand-off:** the sequence does not stop at the wide shot. On the next scroll the character takes the next step successfully and keeps climbing (Camera Phase 7). Scrolling further releases the pin, the staircase scene eases out into fog/glow, and the page continues into the next section, **5.8 Principles** (Camera Phase 8). Reversing the scroll must replay all of this backwards, including the step.
- Where this appendix and the rest of the master prompt conflict, **this appendix wins for this section.**

---

# STREAK WEBSITE — CINEMATIC 3D STREAK GRID SHOWCASE

## 1. Overall Vision

I want to create a visually stunning, immersive, scroll-driven 3D animation section for the Streak application website.

This section should visually communicate the philosophy behind Streak:

**"Look how far you've come. Now keep going."**

The central concept is a human character climbing a staircase. The staircase represents the user's journey of building habits, maintaining consistency, and achieving personal growth.

The character represents the user.
Each staircase step represents progress.
The Streak Grid represents the visual record of that progress.

The most important aspect of this experience is the storytelling. I don't want a generic 3D animation where objects simply move around when the user scrolls. I want a carefully choreographed cinematic experience in which scrolling controls the character's journey, the camera movement, and the emotional progression of the story.

The animation should feel premium, minimal, immersive, and memorable.

---

# 2. Detailed Scene-by-Scene Animation Flow

The entire experience must be controlled by the user's vertical scrolling.

Think of it as one continuous 3D scene divided into multiple animation phases.

## SCENE 1 — THE BEGINNING

**Purpose:** Introduce the character and establish the journey.

Visual representation:

```text
┌──────────────────────────────────────┐
│                                      │
│                                      │
│                                      │
│                                      │
│                                      │
│                                      │
│                                      │
│                                      │
│    🧍                                │
│   ┌──                                │
│   └──                                │
│                                      │
└──────────────────────────────────────┘

       CAMERA: VERY CLOSE
```

What should happen:

- A 3D human character stands at the very beginning of a staircase.
- The staircase extends upward and forward.
- The camera is positioned very close to the character.
- Only a small portion of the staircase should be visible.
- The user should not immediately understand how long the staircase is.
- The environment should be visually clean and minimal.
- The Streak Grid should be visible somewhere in the composition, either as a floating interface panel or an integrated visual element.

On entering this section, the scene should establish the feeling of starting a new journey.

The character should be standing naturally, ready to take the first step.

**Scrolling action:** As the user scrolls down, the character begins climbing.

## SCENE 2 — THE CLIMB

**Purpose:** Represent consistency and continuous progress.

Visual representation:

```text
                         🧍
                        ┌──
                       ┌──
                      ┌──
                     ┌──
                    ┌──
                   ┌──
                  ┌──

       CAMERA FOLLOWS THE CHARACTER
```

What should happen:

- The character starts physically climbing the staircase.
- The character must have a believable walking/climbing animation.
- The staircase should move through the camera's perspective naturally.
- The camera should follow the character, keeping them as the main focal point.
- The camera should remain relatively close to the character.
- The entire staircase should still remain hidden.

Important:

I want the character's movement to feel like actual climbing, not just sliding upward.

The character's legs, body, and arms should move naturally as they climb.

The staircase should have enough visible steps to communicate upward progress.

**Scrolling action:** The further the user scrolls, the more steps the character climbs.

The Streak Grid should also progressively communicate progress. Completed squares can gradually become filled as the character climbs.

## SCENE 3 — THE PAUSE / THINKING MOMENT

**Purpose:** Introduce a relatable moment of hesitation before continuing.

Visual representation:

```text
                         NEXT STEP
                             ↑
                            ┌──
                    🧍     │
                   /│\     │
                   / \    ┌──
                         ┌──

              CHARACTER PAUSES
```

What should happen:

- At a particular scroll position, the character stops climbing.
- The character stands on one step and looks toward the next step.
- The character should slightly tilt their head upward.
- Their body language should communicate a brief moment of hesitation or contemplation.
- This should be a subtle, natural human action, not an exaggerated cartoon performance.

The intention is to communicate a thought like:

**"Should I take the next step?"**

Do not necessarily display this sentence as text. The character's body language should communicate the thought.

The animation should pause briefly at this point.

This moment is important because consistency is not always easy. Sometimes we need to decide whether to continue.

**Scrolling action:** Scrolling further encourages the character to continue.

## SCENE 4 — LOOKING BACK

**Purpose:** Transition from focusing on the next step to appreciating the progress already made.

Visual representation:

```text
                   🧍 ↶
                  ┌──
                 ┌──
               ┌──
             ┌──
           ┌──
         ┌──
       ┌──

      CAMERA BEGINS PULLING BACK
```

What should happen:

- The character slowly turns their head and looks behind.
- The character should then slightly rotate their upper body to look back at the staircase.
- The camera should gradually start pulling away from the character.
- The camera movement must be smooth and cinematic.
- The previously hidden staircase should slowly begin to appear.
- The user should start realizing how many steps the character has already climbed.

This transition should feel meaningful.

Until now, the camera has been focused on the character's immediate journey. Now the perspective changes to show the bigger picture.

**Scrolling action:** Scrolling further progressively reveals more of the staircase.

## SCENE 5 — THE BIG REVEAL

**Purpose:** Deliver the emotional payoff.

This is the MOST IMPORTANT SCENE of the entire experience.

Visual representation:

```text
┌────────────────────────────────────────────┐
│                                            │
│                                  🧍        │
│                                ┌──         │
│                              ┌──           │
│                            ┌──             │
│                          ┌──               │
│                        ┌──                 │
│                      ┌──                   │
│                    ┌──                     │
│                  ┌──                       │
│                ┌──                         │
│              ┌──                           │
│            ┌──                             │
│          ┌──                               │
│        ┌──                                 │
│      ┌──                                   │
│                                            │
│  "Look how far you've come."               │
│                                            │
└────────────────────────────────────────────┘

          CAMERA: WIDE CINEMATIC VIEW
```

What should happen:

- The camera continues pulling backward.
- Eventually, the user can see a significant portion of the staircase.
- The character should be somewhere near the upper portion of the staircase.
- The staircase behind the character should contain many steps, representing the journey already completed.
- The character should still be positioned on the staircase, not standing at the end.
- The camera should reveal the scale of the progress made.

At this moment, display the following text:

**"Look how far you've come."**

The text should appear elegantly, preferably with a subtle fade-in.

This is the moment when the user realizes that progress is often difficult to notice when focusing only on the next step.

The character has already climbed so many steps.

The user should feel a sense of achievement and motivation.

## SCENE 6 — THE JOURNEY CONTINUES

**Purpose:** Communicate that progress is not the end of the journey.

Visual representation:

```text
┌────────────────────────────────────────────┐
│                                            │
│                                  🧍        │
│                                ┌──         │
│                              ┌──           │
│                            ┌──             │
│                          ┌──               │
│                        ┌──                 │
│                      ┌──                   │
│                    ┌──                     │
│                  ┌──                       │
│                ┌──                         │
│              ┌──                           │
│            ┌──                             │
│          ┌──                               │
│        ┌──                                 │
│      ┌──                                   │
│                                            │
│            NOW KEEP GOING.                 │
│                                            │
└────────────────────────────────────────────┘
```

What should happen:

- After looking back, the character slowly turns forward again.
- The character looks toward the remaining staircase.
- There should clearly be more steps ahead.
- The staircase must not end at the character's current position.
- The character should take another step forward.
- The camera should settle into a wide composition that shows both the completed journey and the remaining journey.

Display the final message:

**"Now keep going."**

The final composition should communicate:

- You have made progress.
- You should appreciate how far you have come.
- You still have more opportunities ahead.
- Keep showing up.
- Keep building your habits.

The character should eventually continue climbing.

The final feeling should be motivating, not like a completed game level.

**Scrolling action:** On the next scroll after the wide shot, the character actually takes the next step, successfully and confidently, onto the next stair, and keeps climbing. Scrolling further releases the pinned viewport and the page continues on to the next section of the site (Principles, 5.8 of the master prompt) while the staircase fades into warm fog above. Scrolling back up must reverse all of it, including the step.

---

# 3. Streak Grid Integration

The Streak Grid is not just a decorative element. It is the visual representation of the character's progress.

I want to showcase an actual screenshot of our Streak application's streak grid.

Requirements:

- Use the actual Streak Grid UI/screenshot from the application.
- Do not create a completely unrelated placeholder grid.
- Display it as a floating 3D panel or an elegant interface element within the scene.
- Give the panel subtle depth and perspective.
- The grid should remain readable.
- Its appearance should complement the staircase rather than compete with the character.

### Connection between the staircase and the grid

The staircase and the grid should represent the same idea.

As the character climbs:

- The grid should progressively reveal completed days.
- Filled squares should represent completed habits.
- Unfilled squares should represent future opportunities.
- The progression should feel synchronized with the character's journey.

During the camera pull-out, the grid should remain visible long enough for users to understand what it represents.

The relationship should be intuitive:

**Every completed day is another step forward.**

---

# 4. Camera Direction — Extremely Important

The camera movement is what makes this experience cinematic.

I want the following camera progression:

```text
PHASE 1: CLOSE-UP
     ↓
Camera focuses on the character.
Only a few steps are visible.

PHASE 2: FOLLOW
     ↓
Camera follows the character while climbing.
The character remains the focal point.

PHASE 3: PAUSE
     ↓
Camera movement slows.
Character looks at the next step.

PHASE 4: ROTATION
     ↓
Character looks backward.
Camera begins pulling away.

PHASE 5: REVEAL
     ↓
Camera smoothly moves backward and outward.
The previously hidden staircase becomes visible.

PHASE 6: WIDE SHOT
     ↓
Entire completed journey becomes visible.
Character turns forward.
More steps remain ahead.

PHASE 7: THE NEXT STEP
     ↓
On the next scroll, the character takes the next step
successfully: a clean, confident step up onto the next stair
(foot planted, weight transferred, body fully on the new step,
no stumble, no hesitation).
This is the payoff of the pause in Scene 3: the same decision,
now made. The character then continues climbing a few more steps.
The camera holds the wide composition and drifts gently upward
to follow, so both the completed and remaining journey stay in frame.
"Now keep going." stays on screen.

PHASE 8: HAND-OFF TO THE NEXT SECTION
     ↓
As scrolling continues, the character keeps climbing toward the
upper part of the frame. The staircase continues beyond the frame
and dissolves into warm fog and glow; it never ends or reaches a top.
The pinned viewport releases, the 3D scene eases out (fade/slide),
and the page scrolls naturally into the next section of the site
(Principles, section 5.8 of the master prompt).
The journey should feel like it continues past the section,
not like a level that has finished.
```

Do not use sudden camera jumps.

Do not make the camera zoom out abruptly.

Use smooth interpolation and carefully controlled camera paths.

The camera should feel like it is part of a professionally directed 3D film.

---

# 5. Scroll Interaction Requirements

The animation should be scroll-driven rather than time-driven.

This means:

- Scrolling down progresses the animation.
- Scrolling up reverses the animation.
- The user should be able to revisit previous scenes by scrolling upward.
- Each major scene should have a clearly controlled scroll range.
- The animation should not automatically complete without user interaction.
- Avoid excessive scroll locking.
- The user should retain a natural browsing experience.

Use a pinned/sticky viewport for the 3D scene while the user scrolls through the section.

The animation timeline should be divided into controlled progress ranges.

Example:

```text
SCROLL PROGRESS

0% - 10%    Character introduction
10% - 35%   Character climbing
35% - 45%   Pause and look at next step
45% - 55%   Character looks backward
55% - 80%   Camera pulls out / staircase reveal
80% - 90%   "Look how far you've come."
90% - 94%   Turn forward / wide shot / "Now keep going."
94% - 98%   Character takes the next step successfully and keeps climbing
98% - 100%  Pin releases; scene fades into fog/glow
(after 100%) Normal page scroll into the next section (Principles, 5.8)
```

These percentages are initial suggestions. Adjust them based on the final visual result.

---

# 6. Visual Design Direction

The overall website should feel premium and modern.

The 3D scene should have:

- A minimal environment.
- Beautiful lighting and soft shadows.
- A visually appealing staircase.
- A clean and recognizable character silhouette.
- Subtle depth and atmospheric perspective.
- Smooth transitions.
- High-quality materials.
- A cohesive color palette that matches the Streak brand.

Avoid:

- Cartoonish visuals.
- Overly complicated environments.
- Excessive decorative objects.
- Unnecessary particles and effects.
- Distracting background elements.
- Generic stock-looking 3D characters.

The character does not necessarily need realistic facial details. A minimal, beautifully designed 3D human character is perfectly acceptable.

The staircase should be the central visual metaphor.

---

# 7. Technical Implementation Expectations

Before implementation:

1. Inspect the existing website project.
2. Understand its framework, existing components, styling system, and animation libraries.
3. Identify the best way to implement a scroll-controlled 3D scene.
4. Check the available assets and identify what is needed for the character, staircase, and Streak Grid.
5. Propose an implementation approach before making major architectural changes.

Potential technologies, depending on the existing stack:

- Three.js for 3D rendering.
- React Three Fiber for React-based 3D scenes.
- Drei for useful 3D helpers.
- GSAP ScrollTrigger for scroll-driven animation timelines.
- GLTF/GLB models for the character and other 3D assets.

Do not introduce all these libraries blindly. Choose only what is necessary and compatible with the existing project.

### Performance

The animation must:

- Run smoothly on modern desktop browsers.
- Be optimized for mobile devices.
- Avoid unnecessary high-poly models.
- Use optimized textures and models.
- Avoid excessive rendering when the scene is not visible.
- Respect reduced-motion preferences.
- Provide a graceful fallback for devices that cannot handle the full 3D experience.

Mobile should have an intentionally designed version, not simply a broken or compressed desktop experience.

---

# 8. Important Creative Constraints

Please understand these points before implementation:

1. The character must actually climb the staircase. Do not simply move the character's position upward without believable climbing animation.
2. The camera must initially stay close to the character.
3. The staircase must initially remain partially hidden.
4. The thinking/pause moment must be clearly communicated through body language.
5. The character must look backward before the camera reveals the entire staircase.
6. The camera pull-out must be gradual and cinematic.
7. The character must be near the top of the revealed staircase, with more steps still ahead.
8. The final scene must communicate continued progress rather than completion.
8a. After the wide shot, the character must successfully complete the next step on the following scroll (no stumble, no hesitation), then the scene must hand off smoothly to the next section of the page.
9. The Streak Grid must be integrated meaningfully into the visual story.
10. Every animation phase must be reversible through scrolling.

Most importantly, do not sacrifice the storytelling just to add more 3D effects.

---

# 9. Expected Final Experience

When a visitor scrolls through this section, they should experience the following emotional journey:

```text
        START
          │
          ▼
   "I am beginning."
          │
          ▼
       CLIMBING
          │
          ▼
   "I am making progress."
          │
          ▼
        PAUSE
          │
          ▼
   "Should I continue?"
          │
          ▼
      LOOK BACK
          │
          ▼
   "I've come so far."
          │
          ▼
    LOOK FORWARD
          │
          ▼
     "I can do more."
          │
          ▼
       KEEP GOING.
```

The visitor should understand the philosophy of the Streak application without needing a lengthy explanation.

**The final message of this entire experience is:**

# Look how far you've come.
# Now keep going.

Build this as a memorable signature section of the Streak website, not as an ordinary product showcase.

The quality of the storytelling, camera choreography, character movement, and emotional payoff should take priority over adding unnecessary visual complexity.