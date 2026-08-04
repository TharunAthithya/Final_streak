import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { DAILY_STORIES, DailyStory } from '../data/daily-stories';
import { toLocalDateString } from '../utils/streak';

interface DailyStoryState {
  completedDates: string[]; // YYYY-MM-DD strings
  lastSeenSplashDate: string | null;
  isCompletedForDate: (dateStr?: string) => boolean;
  hasSeenSplashForDate: (dateStr?: string) => boolean;
  getStoryForDate: (dateStr?: string) => DailyStory;
  completeStoryForDate: (dateStr?: string) => Promise<void>;
  markSplashSeenForDate: (dateStr?: string) => Promise<void>;
  resetAllProgress: () => Promise<void>;
}

/**
 * Generates a deterministic index into DAILY_STORIES for any given date string (YYYY-MM-DD).
 * Guarantees:
 * 1. Stable selection throughout the entire local day.
 * 2. Smooth rotation across consecutive calendar days.
 * 3. 100% offline functionality without backend server dependencies.
 */
export function getStoryIndexForDate(dateStr: string): number {
  if (!DAILY_STORIES || DAILY_STORIES.length === 0) return 0;
  
  let hash = 0;
  for (let i = 0; i < dateStr.length; i++) {
    hash = (hash << 5) - hash + dateStr.charCodeAt(i);
    hash |= 0; // Convert to 32bit integer
  }
  return Math.abs(hash) % DAILY_STORIES.length;
}

export const useDailyStoryStore = create<DailyStoryState>()(
  persist(
    (set, get) => ({
      completedDates: [],
      lastSeenSplashDate: null,

      isCompletedForDate: (dateStr?: string) => {
        const targetDate = dateStr || toLocalDateString(new Date());
        return get().completedDates.includes(targetDate);
      },

      hasSeenSplashForDate: (dateStr?: string) => {
        const targetDate = dateStr || toLocalDateString(new Date());
        return get().lastSeenSplashDate === targetDate;
      },

      getStoryForDate: (dateStr?: string) => {
        const targetDate = dateStr || toLocalDateString(new Date());
        const index = getStoryIndexForDate(targetDate);
        return DAILY_STORIES[index] || DAILY_STORIES[0];
      },

      completeStoryForDate: async (dateStr?: string) => {
        const targetDate = dateStr || toLocalDateString(new Date());
        const currentCompleted = get().completedDates;
        if (!currentCompleted.includes(targetDate)) {
          set({
            completedDates: [...currentCompleted, targetDate],
          });
        }
      },

      markSplashSeenForDate: async (dateStr?: string) => {
        const targetDate = dateStr || toLocalDateString(new Date());
        set({ lastSeenSplashDate: targetDate });
      },

      resetAllProgress: async () => {
        set({ completedDates: [], lastSeenSplashDate: null });
      },
    }),
    {
      name: 'streak_daily_story_storage',
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
);
