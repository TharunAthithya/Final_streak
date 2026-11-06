import { TargetRect } from './onboarding-types';

export interface CardPlacement {
  top: number;
  left: number;
  width: number;
}

interface PlacementInput {
  target?: TargetRect | null;
  winWidth: number;
  winHeight: number;
  insetTop: number;
  tabBarHeight: number;
  keyboardHeight: number;
  cardHeight: number;
}

const MARGIN = 16;
const GAP = 18;
export const MAX_CARD_WIDTH = 360;

/**
 * Places a card above or below the target so it never covers it.
 * Falls back to docking at the top/bottom edge of the usable area when the target
 * is unmeasured, off-screen, or neither side has enough room.
 */
export function computeCardPlacement(p: PlacementInput): CardPlacement {
  const width = Math.min(MAX_CARD_WIDTH, p.winWidth - MARGIN * 2);
  const usableTop = p.insetTop + 8;
  // Keep clear of the keyboard, or of the bottom tab bar when the keyboard is hidden.
  const usableBottom = p.winHeight - (p.keyboardHeight > 0 ? p.keyboardHeight : p.tabBarHeight) - 8;
  const centered = (p.winWidth - width) / 2;

  const dockTop: CardPlacement = { top: usableTop, left: centered, width };
  const dockBottom: CardPlacement = {
    top: Math.max(usableTop, usableBottom - p.cardHeight),
    left: centered,
    width,
  };

  const t = p.target;
  if (!t || t.width <= 0 || t.height <= 0) return dockBottom;

  const targetBottom = t.y + t.height;
  const fullyOnScreen = t.y >= 0 && targetBottom <= p.winHeight && t.x + t.width > 0 && t.x < p.winWidth;
  if (!fullyOnScreen) return dockBottom;

  const left = Math.min(Math.max(t.x + t.width / 2 - width / 2, MARGIN), p.winWidth - MARGIN - width);
  const spaceAbove = t.y - GAP - usableTop;
  const spaceBelow = usableBottom - (targetBottom + GAP);
  const targetInLowerHalf = t.y + t.height / 2 > p.winHeight / 2;

  const above: CardPlacement = { top: t.y - GAP - p.cardHeight, left, width };
  const below: CardPlacement = { top: targetBottom + GAP, left, width };

  const preferred = targetInLowerHalf ? 'above' : 'below';
  const fitsAbove = spaceAbove >= p.cardHeight;
  const fitsBelow = spaceBelow >= p.cardHeight;

  if (preferred === 'above' && fitsAbove) return above;
  if (preferred === 'below' && fitsBelow) return below;
  if (fitsAbove) return above;
  if (fitsBelow) return below;
  // No room on either side: use the edge opposite the target.
  return targetInLowerHalf ? dockTop : dockBottom;
}
