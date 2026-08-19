export interface TargetRect {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface ScreenDimensions {
  width: number;
  height: number;
}

export interface SafeAreaInsets {
  top: number;
  bottom: number;
}

export interface TutorialCardSize {
  width: number;
  height: number;
}

export interface CalculatedPosition {
  x: number;
  y: number;
  placement: 'above' | 'below' | 'center';
}

/**
 * Pure positioning utility for the non-blocking onboarding tutorial card.
 * Calculates optimal (x, y) coordinates to place the card near the target element
 * without overlapping or covering the target.
 */
export function calculateTutorialPosition(
  targetRect: TargetRect | undefined,
  cardSize: TutorialCardSize = { width: 320, height: 180 },
  screenSize: ScreenDimensions,
  safeArea: SafeAreaInsets = { top: 40, bottom: 40 }
): CalculatedPosition {
  const horizontalPadding = 16;
  const targetMargin = 12;

  // Horizontal Centering / Alignment
  let x: number;
  if (targetRect) {
    // Align center of card with center of target
    const targetCenterX = targetRect.x + targetRect.width / 2;
    x = targetCenterX - cardSize.width / 2;
  } else {
    // Default to screen center
    x = (screenSize.width - cardSize.width) / 2;
  }

  // Clamp x strictly within screen boundaries
  const maxX = screenSize.width - cardSize.width - horizontalPadding;
  x = Math.max(horizontalPadding, Math.min(maxX, x));

  // If no target rect is supplied, position in middle
  if (!targetRect) {
    const y = (screenSize.height - cardSize.height) / 2;
    return { x, y, placement: 'center' };
  }

  // Vertical Positioning Logic
  const screenCenterY = screenSize.height / 2;
  const isTargetInTopHalf = targetRect.y < screenCenterY;

  let y: number;
  let placement: 'above' | 'below' | 'center';

  if (isTargetInTopHalf) {
    // Place tutorial card BELOW target
    y = targetRect.y + targetRect.height + targetMargin;
    placement = 'below';
  } else {
    // Place tutorial card ABOVE target
    y = targetRect.y - cardSize.height - targetMargin;
    placement = 'above';
  }

  // Safe area clamping
  const minY = safeArea.top + 16;
  const maxY = screenSize.height - safeArea.bottom - cardSize.height - 16;

  // Fallback: If placing above goes off top, place below instead
  if (placement === 'above' && y < minY) {
    y = targetRect.y + targetRect.height + targetMargin;
    placement = 'below';
  }

  // Fallback: If placing below goes off bottom, place above instead
  if (placement === 'below' && y > maxY) {
    y = targetRect.y - cardSize.height - targetMargin;
    placement = 'above';
  }

  // Final clamp
  y = Math.max(minY, Math.min(maxY, y));

  return { x, y, placement };
}
