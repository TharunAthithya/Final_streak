import React, { useCallback, useEffect, useRef } from 'react';
import { View, StyleProp, ViewStyle } from 'react-native';
import { useOnboardingStore } from '../store/onboarding-store';
import { STEP_BY_ID } from './onboarding-constants';

interface OnboardingTargetProps {
  id: string;
  /** Reports the view's y inside its parent (used to scroll a section into view). */
  onLayoutY?: (y: number) => void;
  style?: StyleProp<ViewStyle>;
  className?: string;
  children: React.ReactNode;
}

/**
 * Measures its children's window position so the tutorial card can sit next to them.
 * Measures only while it is the active step's target. It adds no visual treatment.
 */
export const OnboardingTarget: React.FC<OnboardingTargetProps> = ({ id, onLayoutY, style, className, children }) => {
  const viewRef = useRef<View>(null);
  const lastKey = useRef('');
  const setTarget = useOnboardingStore((s) => s.setTarget);
  const isCurrent = useOnboardingStore(
    (s) => s.isActive && !!s.currentStepId && STEP_BY_ID[s.currentStepId]?.target === id
  );

  const measure = useCallback(() => {
    viewRef.current?.measureInWindow((x, y, width, height) => {
      if (!(width > 0) || !(height > 0)) return;
      const key = [x, y, width, height].map(Math.round).join(',');
      if (key === lastKey.current) return;
      lastKey.current = key;
      setTarget(id, { x, y, width, height });
    });
  }, [id, setTarget]);

  useEffect(() => {
    if (!isCurrent) return;
    lastKey.current = '';
    measure();
    // Light polling keeps the rect correct through scrolling, keyboard and layout animations.
    const timer = setInterval(measure, 300);
    return () => clearInterval(timer);
  }, [isCurrent, measure]);

  useEffect(() => () => setTarget(id, null), [id, setTarget]);

  return (
    <View
      ref={viewRef}
      collapsable={false}
      style={style}
      className={className}
      onLayout={(e) => {
        onLayoutY?.(e.nativeEvent.layout.y);
        if (isCurrent) measure();
      }}
    >
      {children}
    </View>
  );
};
