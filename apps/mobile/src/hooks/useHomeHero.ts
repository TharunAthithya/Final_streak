import { useState, useEffect } from 'react';
import { AppState, AppStateStatus } from 'react-native';
import { getGreeting, getPromiseDay } from '../utils/time';
import { useAuthStore } from '../store/auth-store';
import { useHabitStore } from '../store/habit-store';
import { useSyncStore } from '../store/sync-store';
import { calculateDailyPromiseProgress, calculateGlobalStreak, getSyncAwareHabits } from '../utils/streak';

/**
 * Custom hook to manage states and lifecycle listeners for the Home Screen Hero.
 * 
 * Canonical Account Creation Date:
 * We use the `user.createdAt` timestamp which represents the creation date of the 
 * user profile row. This row is generated immediately upon signup via database triggers 
 * on Supabase's `auth.users` table, ensuring it mirrors the canonical Auth creation time.
 */
export function useHomeHero() {
  const { user } = useAuthStore();
  const { habits } = useHabitStore();
  const { pendingQueue } = useSyncStore();
  const [greeting, setGreeting] = useState<string>(getGreeting());

  useEffect(() => {
    const subscription = AppState.addEventListener('change', (nextAppState: AppStateStatus) => {
      if (nextAppState === 'active') {
        setGreeting(getGreeting());
      }
    });
    return () => subscription.remove();
  }, []);

  const promiseDay = user?.createdAt ? getPromiseDay(user.createdAt) : 1;

  // Augment habits with local sync queue changes to prevent staleness
  const syncAwareHabits = getSyncAwareHabits(habits, pendingQueue);

  // Perform streak calculations in the business layer hook
  const progress = calculateDailyPromiseProgress(syncAwareHabits, new Date());
  const totalPromises = progress.total;
  const keptPromises = progress.completed;
  const remainingPromises = totalPromises - keptPromises;
  const percentageDone = totalPromises > 0 ? Math.round(progress.ratio * 100) : 0;
  const globalStreak = calculateGlobalStreak(syncAwareHabits);

  return {
    greeting,
    promiseDay,
    displayName: user?.displayName || 'Tharun',
    globalStreak,
    totalPromises,
    keptPromises,
    remainingPromises,
    percentageDone,
  };
}
