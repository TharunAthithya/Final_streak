import React, { useRef, useEffect, useCallback } from 'react';
import { View, StyleProp, ViewStyle, LayoutChangeEvent } from 'react-native';
import { useOnboardingStore } from '../store/onboarding-store';
import { ONBOARDING_STEPS } from './onboarding-constants';

interface OnboardingTargetProps {
  id: string;
  modalLayer?: string;
  borderRadius?: number;
  style?: StyleProp<ViewStyle>;
  className?: string;
  children: React.ReactNode;
}

export const OnboardingTarget: React.FC<OnboardingTargetProps> = ({
  id,
  modalLayer,
  borderRadius = 16,
  style,
  className,
  children,
}) => {
  const viewRef = useRef<View>(null);
  const registerTarget = useOnboardingStore((s) => s.registerTarget);
  const unregisterTarget = useOnboardingStore((s) => s.unregisterTarget);
  const currentStepId = useOnboardingStore((s) => s.currentStepId);
  const isActive = useOnboardingStore((s) => s.isActive);
  const lastRectRef = useRef<{ x: number; y: number; width: number; height: number } | null>(null);

  const measureAndRegister = useCallback(() => {
    if (!viewRef.current) return;

    const recordMeasurement = (x: number, y: number, width: number, height: number) => {
      if (width <= 0 || height <= 0) return;

      const prev = lastRectRef.current;
      // Update store only if coordinates actually changed by more than 0.5px
      if (
        !prev ||
        Math.abs(prev.x - x) > 0.5 ||
        Math.abs(prev.y - y) > 0.5 ||
        Math.abs(prev.width - width) > 0.5 ||
        Math.abs(prev.height - height) > 0.5
      ) {
        lastRectRef.current = { x, y, width, height };
        registerTarget({
          id,
          modalLayer,
          rect: {
            x,
            y,
            width,
            height,
            borderRadius,
          },
        });
      }
    };

    // Primary: measureInWindow for window-level absolute screen coordinates
    viewRef.current.measureInWindow((x, y, width, height) => {
      if (width > 0 && height > 0) {
        recordMeasurement(x, y, width, height);
      } else {
        // Fallback: measure relative to root page
        viewRef.current?.measure((_x, _y, w, h, pageX, pageY) => {
          if (w > 0 && h > 0) {
            recordMeasurement(pageX, pageY, w, h);
          }
        });
      }
    });
  }, [id, modalLayer, borderRadius, registerTarget]);

  const handleLayout = (_event: LayoutChangeEvent) => {
    measureAndRegister();
  };

  // Determine if this target is for the currently active onboarding step
  const currentStep = ONBOARDING_STEPS.find((s) => s.id === currentStepId);
  const isCurrentTarget = isActive && currentStep?.targetId === id;

  // Measurement effect on mount, layout changes, & step activation
  useEffect(() => {
    measureAndRegister();

    // Staggered measurement timers to catch layout settlement (tab bar, safe area, modals)
    const t1 = setTimeout(measureAndRegister, 50);
    const t2 = setTimeout(measureAndRegister, 150);
    const t3 = setTimeout(measureAndRegister, 350);
    const t4 = setTimeout(measureAndRegister, 600);

    let intervalId: any = null;

    // While this target is actively highlighted, continuously re-measure every 250ms
    // to keep spotlight 100% aligned during scroll, animations, or screen resize.
    if (isCurrentTarget) {
      intervalId = setInterval(measureAndRegister, 250);
    }

    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(t3);
      clearTimeout(t4);
      if (intervalId) clearInterval(intervalId);
    };
  }, [id, isCurrentTarget, currentStepId, isActive, measureAndRegister]);

  useEffect(() => {
    return () => {
      unregisterTarget(id);
    };
  }, [id, unregisterTarget]);

  return (
    <View
      ref={viewRef}
      onLayout={handleLayout}
      style={style}
      className={className}
      collapsable={false}
    >
      {children}
    </View>
  );
};

