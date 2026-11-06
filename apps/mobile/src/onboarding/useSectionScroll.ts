import { useCallback, useEffect, useRef } from 'react';
import { ScrollView } from 'react-native';
import { useOnboardingStore } from '../store/onboarding-store';
import { STEP_BY_ID } from './onboarding-constants';

/**
 * Scrolls a ScrollView so the active step's target section is visible.
 * Sections report their y via `setY(targetId)`; `setBase` offsets nested sections.
 */
export function useSectionScroll() {
  const scrollRef = useRef<ScrollView>(null);
  const ys = useRef<Record<string, number>>({});
  const base = useRef(0);
  const target = useOnboardingStore((s) =>
    s.isActive && s.currentStepId ? STEP_BY_ID[s.currentStepId]?.target : undefined
  );

  useEffect(() => {
    if (!target) return;
    const timer = setTimeout(() => {
      const y = ys.current[target];
      if (y !== undefined) scrollRef.current?.scrollTo({ y: Math.max(0, base.current + y - 12), animated: true });
    }, 120);
    return () => clearTimeout(timer);
  }, [target]);

  const setY = useCallback((id: string) => (y: number) => {
    ys.current[id] = y;
  }, []);
  const setBase = useCallback((y: number) => {
    base.current = y;
  }, []);

  return { scrollRef, setY, setBase };
}
