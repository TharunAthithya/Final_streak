import { create } from 'zustand';
import { HabitResponse, CheckInResponse } from '@streak/contracts';
import { CreateHabitDto } from '@streak/validation';
import { StreakApiClient } from '@streak/api-client';

interface HabitState {
  habits: HabitResponse[];
  loading: boolean;
  error: string | null;
  fetchHabits: (apiClient: StreakApiClient) => Promise<void>;
  createHabit: (apiClient: StreakApiClient, dto: CreateHabitDto) => Promise<HabitResponse>;
  checkInHabit: (
    apiClient: StreakApiClient,
    habitId: string,
    localDate: string,
    timezone: string,
    idempotencyKey: string,
    isOffline: boolean,
    enqueueComplete: (habitId: string, localDate: string, timezone: string, idempotencyKey: string) => Promise<void>
  ) => Promise<void>;
  undoCheckIn: (
    apiClient: StreakApiClient,
    habitId: string,
    checkInId: string,
    localDate: string,
    timezone: string,
    idempotencyKey: string,
    isOffline: boolean,
    enqueueUndo: (habitId: string, localDate: string, timezone: string, idempotencyKey: string, checkInId?: string) => Promise<void>
  ) => Promise<void>;
  freezeHabit: (
    apiClient: StreakApiClient,
    habitId: string,
    localDate: string,
    timezone: string,
    idempotencyKey: string,
    isOffline: boolean,
    enqueueFreeze: (habitId: string, localDate: string, timezone: string, idempotencyKey: string) => Promise<void>
  ) => Promise<void>;
  undoFreeze: (
    apiClient: StreakApiClient,
    habitId: string,
    checkInId: string,
    localDate: string,
    timezone: string,
    idempotencyKey: string,
    isOffline: boolean,
    enqueueUndoFreeze: (habitId: string, localDate: string, timezone: string, idempotencyKey: string, checkInId?: string) => Promise<void>
  ) => Promise<void>;
  updateHabit: (apiClient: StreakApiClient, habitId: string, dto: Partial<CreateHabitDto>) => Promise<void>;
}

export const useHabitStore = create<HabitState>((set, get) => ({
  habits: [],
  loading: false,
  error: null,

  fetchHabits: async (apiClient) => {
    const isFirstLoad = get().habits.length === 0;
    if (isFirstLoad) {
      set({ loading: true, error: null });
    } else {
      set({ error: null });
    }
    try {
      const data = await apiClient.getHabits();
      set({ habits: data, loading: false });
    } catch (e: any) {
      set({ error: e.message || 'Failed to fetch habits', loading: false });
    }
  },

  createHabit: async (apiClient, dto) => {
    set({ loading: true, error: null });
    try {
      const newHabit = await apiClient.createHabit(dto);
      set((state) => ({
        habits: [...state.habits, newHabit],
        loading: false,
      }));
      return newHabit;
    } catch (e: any) {
      set({ error: e.message || 'Failed to create habit', loading: false });
      throw e;
    }
  },

  updateHabit: async (apiClient, habitId, dto) => {
    set({ loading: true, error: null });
    try {
      await apiClient.updateHabit(habitId, dto);
      const data = await apiClient.getHabits();
      set({ habits: data, loading: false });
    } catch (e: any) {
      set({ error: e.message || 'Failed to update habit', loading: false });
      throw e;
    }
  },

  checkInHabit: async (apiClient, habitId, localDate, timezone, idempotencyKey, isOffline, enqueueComplete) => {
    // Optimistic Update
    set((state) => ({
      habits: state.habits.map((h) => {
        if (h.id === habitId) {
          const stats = h.stats || { currentStreak: 0, bestStreak: 0, totalCompletions: 0, completionRate: 0 };
          const checkIns = h.checkIns || [];
          return {
            ...h,
            stats: {
              ...stats,
              currentStreak: stats.currentStreak + 1,
              totalCompletions: stats.totalCompletions + 1,
            },
            completedToday: true,
            todayCheckInId: 'temp-id',
            checkIns: [...checkIns, { id: 'temp-id', localDate }],
          };
        }
        return h;
      }),
    }));

    if (isOffline) {
      await enqueueComplete(habitId, localDate, timezone, idempotencyKey);
    } else {
      try {
        await apiClient.checkInHabit(habitId, {
          localDate,
          timezoneAtCompletion: timezone,
          idempotencyKey,
        });
        // Refetch to sync full database stats/fields
        const data = await apiClient.getHabits();
        set({ habits: data });
      } catch (e: any) {
        // Rollback optimistic update
        const data = await apiClient.getHabits();
        set({ habits: data, error: e.message });
        throw e;
      }
    }
  },

  undoCheckIn: async (apiClient, habitId, checkInId, localDate, timezone, idempotencyKey, isOffline, enqueueUndo) => {
    // Optimistic Update (revert completion)
    set((state) => ({
      habits: state.habits.map((h) => {
        if (h.id === habitId) {
          const stats = h.stats || { currentStreak: 1, bestStreak: 1, totalCompletions: 1, completionRate: 0 };
          const checkIns = h.checkIns || [];
          return {
            ...h,
            stats: {
              ...stats,
              currentStreak: Math.max(0, stats.currentStreak - 1),
              totalCompletions: Math.max(0, stats.totalCompletions - 1),
            },
            completedToday: false,
            todayCheckInId: null,
            checkIns: checkIns.filter((c) => c.localDate !== localDate && c.id !== checkInId),
          };
        }
        return h;
      }),
    }));

    if (isOffline) {
      await enqueueUndo(habitId, localDate, timezone, idempotencyKey, checkInId);
    } else {
      try {
        await apiClient.undoCheckIn(habitId, checkInId);
        const data = await apiClient.getHabits();
        set({ habits: data });
      } catch (e: any) {
        // Rollback optimistic update
        const data = await apiClient.getHabits();
        set({ habits: data, error: e.message });
        throw e;
      }
    }
  },

  freezeHabit: async (apiClient, habitId, localDate, timezone, idempotencyKey, isOffline, enqueueFreeze) => {
    // Optimistic Update (deduct freeze, add check-in with FREEZE status)
    set((state) => ({
      habits: state.habits.map((h) => {
        if (h.id === habitId) {
          const stats = h.stats || { currentStreak: 0, bestStreak: 0, totalCompletions: 0, completionRate: 0 };
          const checkIns = h.checkIns || [];
          return {
            ...h,
            stats: {
              ...stats,
              // Streak is preserved / continuation
            },
            freezeDaysAvailable: Math.max(0, (h.freezeDaysAvailable ?? 1) - 1),
            checkIns: [...checkIns, { id: 'temp-id', localDate, status: 'FREEZE' }],
          };
        }
        return h;
      }),
    }));

    if (isOffline) {
      await enqueueFreeze(habitId, localDate, timezone, idempotencyKey);
    } else {
      try {
        await apiClient.freezeHabit(habitId, {
          localDate,
          timezoneAtCompletion: timezone,
          idempotencyKey,
        });
        const data = await apiClient.getHabits();
        set({ habits: data });
      } catch (e: any) {
        const data = await apiClient.getHabits();
        set({ habits: data, error: e.message });
        throw e;
      }
    }
  },

  undoFreeze: async (apiClient, habitId, checkInId, localDate, timezone, idempotencyKey, isOffline, enqueueUndoFreeze) => {
    // Optimistic Update (revert freeze)
    set((state) => ({
      habits: state.habits.map((h) => {
        if (h.id === habitId) {
          const stats = h.stats || { currentStreak: 0, bestStreak: 0, totalCompletions: 0, completionRate: 0 };
          const checkIns = h.checkIns || [];
          return {
            ...h,
            stats: {
              ...stats,
            },
            freezeDaysAvailable: Math.min(1, (h.freezeDaysAvailable ?? 0) + 1),
            checkIns: checkIns.filter((c) => c.localDate !== localDate && c.id !== checkInId),
          };
        }
        return h;
      }),
    }));

    if (isOffline) {
      await enqueueUndoFreeze(habitId, localDate, timezone, idempotencyKey, checkInId);
    } else {
      try {
        await apiClient.undoFreeze(habitId, checkInId);
        const data = await apiClient.getHabits();
        set({ habits: data });
      } catch (e: any) {
        const data = await apiClient.getHabits();
        set({ habits: data, error: e.message });
        throw e;
      }
    }
  },
}));
