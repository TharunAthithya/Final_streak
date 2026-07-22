# Accountability Rooms — Design System Reference

A dark, warm, low-saturation UI. One accent color (warm gold) does almost all the
work — it marks anything primary, active, earned, or actionable. Everything else
stays quiet so the gold has something to stand out against. Icons are simple
line icons, always rendered in the accent or in muted neutrals — never
multi-color, never decorative illustration.

---

## Color Palette

### Core neutrals

| Token | Hex | Usage |
|---|---|---|
| `bg` | `#0B0B0C` | App/screen background, outer canvas |
| `card` | `#181513` | Default card / surface background |
| `bubbleOther` | `#1B1714` | Chat bubble — other people's messages |
| `bubbleOwn` | `#2A2013` | Chat bubble — your own messages (gold-tinted) |
| `iconBg` | `#221C16` | Icon circle background (habit icons, etc.) |
| `cardBorder` | `#2B2521` | Default 1px border on cards, dividers, inputs |
| `dashed` | `#453C34` | Dashed border color for "special" containers |

### Accent (the one color that matters)

| Token | Hex | Usage |
|---|---|---|
| `gold` | `#E8C08A` | Primary accent — buttons, active states, streak flame, links, progress ring |
| `goldSoft` | `#3A2E1F` | Muted gold fill — badges, tinted icon backgrounds, "YOU" tag bg |
| `goldDeep` | `#8C6B3F` | Darker gold — text on `goldSoft`, muted secondary CTA fills |

Text/icon color placed **on top of a solid gold fill** (e.g. a gold button):
use `#241C14` (near-black warm brown) — never pure black, never white.

### Text

| Token | Hex | Usage |
|---|---|---|
| `ink` | `#F5F2EC` | Primary text (headings, body, names) |
| `sub` | `#9C958C` | Secondary text (descriptions, meta) |
| `faint` | `#65605A` | Tertiary text (timestamps, captions, disabled) |

### Semantic / reaction colors

| Token | Hex | Usage |
|---|---|---|
| `heart` | `#E8899A` | Heart reaction (active state + icon fill) |
| `fire` | `#E8A05A` | Fire reaction / streak flame accents |
| `thumb` | `#8FBF9E` | Thumbs-up reaction |

### Identity accent colors (for avatars)

Rotate through these for member/avatar identity — each person gets one,
consistently, everywhere their name appears:

`#E8C08A` (gold) · `#E8899A` (rose) · `#B2A4E8` (lavender) · `#8FBF9E` (mint)

Extend this set with similarly muted, similarly-saturated tones if you need
more than four — avoid anything highly saturated or neon; it should look like
it belongs next to the gold, not compete with it.

---

## Typography

Two typefaces, loaded via Google Fonts:

```css
@import url('https://fonts.googleapis.com/css2?family=Baloo+2:wght@600;700;800&family=Inter:wght@400;500;600;700&display=swap');
```

| Role | Font | Notes |
|---|---|---|
| **Display** | `'Baloo 2', sans-serif` | Rounded, friendly, bold. Headlines, names, big numbers only. |
| **Body / UI** | `'Inter', sans-serif` | Everything else — labels, descriptions, buttons, timestamps. |

### Type scale (size / weight / color / font)

| Use | Size | Weight | Color | Font |
|---|---|---|---|---|
| Screen headline (e.g. "Tharun.") | 34px | 700 | `ink` | Baloo 2 |
| Sheet / modal title | 22px | 700 | `ink` | Baloo 2 |
| Header title (room name, etc.) | 16.5px | 700 | `ink` | Baloo 2 |
| Big stat number (promise count, %) | 32px / 19px | 700 | `ink` | Baloo 2 |
| Card title / habit name | 15.5px | 700 | `ink` | Inter |
| Body / description text | 13.5px | 400–600 | `ink` / `sub` | Inter |
| Meta text (dates, counts) | 11.5–12.5px | 400–600 | `sub` / `faint` | Inter |
| Section caption (all-caps label) | 11px | 700 | `faint` | Inter, `letter-spacing: 1.2px`, `text-transform: uppercase` |
| Timestamp / fine print | 10–11px | 400 | `faint` | Inter |

---

## Layout & Spacing

- **Phone frame:** max-width `380px`, height `~780px`, `border-radius: 36px`,
  `border: 1px solid #232019`, `box-shadow: 0 30px 80px rgba(0,0,0,0.6)`,
  centered on a pure black (`#000`) backdrop.
- **Screen padding:** `20px` horizontal (`px-5`), generous vertical rhythm —
  don't crowd sections; give each block room (Image-2-style spacing, not
  Image-1-style density).
- **Card padding:** `16–20px` all around.
- **Section gaps:** `~28px` between major sections (header → promise card →
  habits list), `~12px` between cards in a list.

## Border Radius Conventions

| Element | Radius |
|---|---|
| Phone frame | 36px |
| Bottom sheet (top corners only) | 28px |
| Cards | 16–18px |
| Chat bubble (rounded corners) | 17px |
| Chat bubble (tail corner, last in a run) | 4px |
| Buttons / pills / avatars / dots | fully round (`999px`) |

## Borders

- Default: `1px solid` `cardBorder`.
- "Special" containers (invite code, empty/discover states): `1.5px dashed`
  `dashed` — this dashed treatment is reserved for things that feel like a
  ticket or a placeholder, not used for ordinary cards.

---

## Components

### Buttons / action circles (habit check-ins, etc.)
Three distinct states — never blend them:
1. **Done / kept:** filled `gold`, icon in `#241C14`.
2. **Not done (simple toggle):** transparent fill, `1.5px solid cardBorder`, no icon.
3. **Not done (incremental / "add progress"):** filled `goldDeep` (muted, not
   bright gold), icon (`+`) in `#241C14`. Distinguishes "log something" from
   "flip a switch."

### Reaction pills
Rounded-full, `1px solid`. Inactive: bg `#201B18`, border `cardBorder`, icon
in `sub`. Active: bg = reaction color at ~15% opacity, border = reaction
color at full opacity, icon filled with reaction color. Compact size:
`padding: 4px 8px`; standard: `6px 12px`.

### Avatars
Circle. Background = identity color at ~16% opacity (`color + '2A'`), border
= identity color at ~40% opacity (`color + '66'`), initial letter centered,
Baloo 2 bold, colored with the full identity color.

### Icon circles (habit icons, etc.)
Circle, background `iconBg`, border `1px solid goldSoft`, icon centered,
`stroke-width: 2.2–2.4`, color `gold`. Icons are always bold/legible line
icons — avoid anything that reads as a blob at 20px (test small before
finalizing an icon choice).

### Cards
`background: card`, `border: 1px solid cardBorder`, `border-radius: 16–18px`,
`padding: 16px`.

### Chat bubbles
Own messages: right-aligned, `bubbleOwn` background, `1px solid gold at ~23%
opacity`, sharp bottom-right corner on the last bubble in a run. Others:
left-aligned, avatar shown once per run (first message), `bubbleOther`
background, `1px solid cardBorder`, sharp bottom-left corner on the last
bubble in a run. Reaction pills sit just under the bubble, same side as
alignment, slightly overlapping the bubble's bottom edge (`margin-top: -10px`).

### Progress ring
SVG circle, track in `cardBorder`, progress stroke in `gold`,
`stroke-linecap: round`, animated `stroke-dashoffset` transition (~400ms).
Center label: big number in Baloo 2 + small uppercase "Done" caption in
`faint`.

### Bottom sheet / modal
Slides up from bottom, backdrop `rgba(0,0,0,0.6)`, sheet background `#141110`,
top corners `28px`, drag handle (`36×4px`, `cardBorder`, centered, `999px`
radius) at the top, close button top-right (`30×30px` circle, `#221D1A` bg).

### Bottom navigation
2–4 evenly spaced tabs, icon + label stacked. Active tab: icon and label both
in `gold`. Inactive: both in `faint`. No pill/background behind the active
tab — color alone carries the state.

### Dashed "special" containers
Used for invite codes and empty/discover states. `1.5px dashed` `dashed`
border, background slightly darker than a normal card (`#17130F`).

### Date / system dividers (chat feeds)
Date dividers: centered pill, `#1B1512` bg, `1px solid cardBorder`, sticky to
top of scroll container. System notices (e.g. "X joined the room"): centered
pill, dashed border, `card` background, no sticky behavior.

---

## Interaction & Motion

- Buttons/pills: `active:scale-90` (small controls) or `active:scale-95`
  (larger buttons) on tap — no other hover/press effects.
- Transitions: `transition-transform duration-150` for taps,
  `duration-300 ease-out` for sheet slide-ins, `transition-opacity
  duration-300` for backdrops.
- Copy-to-clipboard / confirmation actions: swap icon + label + color
  momentarily (e.g. gold → mint `thumb` color, copy icon → check icon), auto
  revert after ~1.6–2.2s.

---

## Principles to keep every new screen consistent

1. **One accent color.** If something needs to stand out, it's gold. Don't
   introduce new hues for new features — reuse identity/reaction colors
   where the meaning genuinely overlaps, otherwise stay neutral.
2. **Icons must read at a glance.** Bold stroke weight, simple silhouettes,
   test at actual render size before committing.
3. **Give things room.** Prefer the more spacious of two spacing options —
   density reads as cramped in this palette, not efficient.
4. **No pure black or white.** Use `ink` / `#241C14` instead — keeps
   everything feeling warm rather than high-contrast/clinical.
5. **State should be shown with color and fill, not with new shapes.** Same
   pill, same circle, same card — only the fill/border/color changes between
   active and inactive.