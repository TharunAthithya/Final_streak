import { useState, useEffect, useRef } from 'react';

/**
 * Returns a debounced loading state that only becomes `true` after a short delay.
 * This prevents flash-of-skeleton on fast responses.
 */
export function useDelayedLoading(loading: boolean, delayMs = 175): boolean {
  const [delayed, setDelayed] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (loading) {
      timerRef.current = setTimeout(() => setDelayed(true), delayMs);
    } else {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
        timerRef.current = null;
      }
      setDelayed(false);
    }
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [loading, delayMs]);

  return delayed;
}
