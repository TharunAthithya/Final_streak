import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { StreakApiClient } from '@streak/api-client';

export interface PendingCheckIn {
  localId: string;
  habitId: string;
  localDate: string;
  timezone: string;
  idempotencyKey: string;
  status: 'pending' | 'syncing' | 'failed';
  error?: string;
  retryCount: number;
}

interface SyncState {
  pendingQueue: PendingCheckIn[];
  isSyncing: boolean;
  loadQueue: () => Promise<void>;
  enqueueCheckIn: (habitId: string, localDate: string, timezone: string, idempotencyKey: string) => Promise<void>;
  syncQueue: (apiClient: StreakApiClient) => Promise<void>;
  clearQueue: () => Promise<void>;
}

const QUEUE_STORAGE_KEY = '@streak_offline_checkin_queue';

export const useSyncStore = create<SyncState>((set, get) => ({
  pendingQueue: [],
  isSyncing: false,

  loadQueue: async () => {
    try {
      const stored = await AsyncStorage.getItem(QUEUE_STORAGE_KEY);
      if (stored) {
        set({ pendingQueue: JSON.parse(stored) });
      }
    } catch (e) {
      console.error('Failed to load offline queue:', e);
    }
  },

  enqueueCheckIn: async (habitId, localDate, timezone, idempotencyKey) => {
    const newPending: PendingCheckIn = {
      localId: Math.random().toString(36).substring(7),
      habitId,
      localDate,
      timezone,
      idempotencyKey,
      status: 'pending',
      retryCount: 0,
    };

    const updatedQueue = [...get().pendingQueue, newPending];
    set({ pendingQueue: updatedQueue });

    try {
      await AsyncStorage.setItem(QUEUE_STORAGE_KEY, JSON.stringify(updatedQueue));
    } catch (e) {
      console.error('Failed to persist offline queue:', e);
    }
  },

  syncQueue: async (apiClient: StreakApiClient) => {
    if (get().isSyncing) return;
    set({ isSyncing: true });

    const queue = [...get().pendingQueue];
    const remainingQueue: PendingCheckIn[] = [];

    for (const item of queue) {
      if (item.status === 'syncing') continue;

      // Update state to syncing
      set((state) => ({
        pendingQueue: state.pendingQueue.map((q) =>
          q.localId === item.localId ? { ...q, status: 'syncing' } : q
        ),
      }));

      try {
        await apiClient.checkInHabit(item.habitId, {
          localDate: item.localDate,
          timezoneAtCompletion: item.timezone,
          idempotencyKey: item.idempotencyKey,
        });

        // Success: Item is resolved, do not re-add to remainingQueue
      } catch (err: any) {
        console.warn(`Sync failed for habit ${item.habitId}:`, err.message);

        // Classification of failures
        const statusStr = err.message || '';
        const isConflict = statusStr.includes('Conflict') || statusStr.includes('already completed');
        const isAuthError = statusStr.includes('401') || statusStr.includes('Unauthorized') || statusStr.includes('token');

        if (isConflict) {
          // Conflict: Already completed on server, safely treat as successful locally
          continue;
        }

        if (isAuthError) {
          // Authentication error: Halt entire sync queue to prevent permanent failures, preserve items
          remainingQueue.push({
            ...item,
            status: 'pending',
            error: 'Authentication failed, awaiting reconnect',
          });
          remainingQueue.push(...queue.slice(queue.indexOf(item) + 1));
          break;
        }

        // Check if error is permanent (like 4xx bad inputs) or temporary (5xx or network timeout)
        const isPermanent = statusStr.includes('400') || statusStr.includes('403') || statusStr.includes('validation');

        if (isPermanent) {
          // Permanent failure: Do not retry, label as failed for user visibility
          remainingQueue.push({
            ...item,
            status: 'failed',
            error: err.message || 'Validation failed',
          });
        } else {
          // Temporary failure (network drop, 503, etc): Rollback status to retry in next run
          remainingQueue.push({
            ...item,
            status: 'pending',
            retryCount: item.retryCount + 1,
            error: err.message || 'Network error',
          });
        }
      }
    }

    set({ pendingQueue: remainingQueue, isSyncing: false });
    try {
      await AsyncStorage.setItem(QUEUE_STORAGE_KEY, JSON.stringify(remainingQueue));
    } catch (e) {
      console.error('Failed to update persisted queue:', e);
    }
  },

  clearQueue: async () => {
    set({ pendingQueue: [] });
    try {
      await AsyncStorage.removeItem(QUEUE_STORAGE_KEY);
    } catch (e) {
      console.error('Failed to clear persisted queue:', e);
    }
  },
}));
