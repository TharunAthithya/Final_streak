import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { StreakApiClient } from '@streak/api-client';

export interface QueuedRpc {
  id: string;
  name: 'complete_habit' | 'undo_complete_habit';
  args: {
    habitId: string;
    localDate: string;
    timezone: string;
    idempotencyKey: string;
    checkInId?: string; // For undo operations
  };
  status: 'pending' | 'syncing' | 'failed';
  error?: string;
  retryCount: number;
}

interface SyncState {
  pendingQueue: QueuedRpc[];
  isSyncing: boolean;
  loadQueue: () => Promise<void>;
  enqueueCompleteHabit: (habitId: string, localDate: string, timezone: string, idempotencyKey: string) => Promise<void>;
  enqueueUndoHabit: (habitId: string, localDate: string, timezone: string, idempotencyKey: string, checkInId?: string) => Promise<void>;
  syncQueue: (apiClient: StreakApiClient) => Promise<void>;
  clearQueue: () => Promise<void>;
}

const QUEUE_STORAGE_KEY = '@streak_offline_rpc_queue';

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

  enqueueCompleteHabit: async (habitId, localDate, timezone, idempotencyKey) => {
    const queue = [...get().pendingQueue];

    // Check if there is an active undo in the queue for this same date. If yes, cancel it out.
    const matchingUndoIndex = queue.findIndex(
      (item) =>
        item.name === 'undo_complete_habit' &&
        item.args.habitId === habitId &&
        item.args.localDate === localDate
    );

    if (matchingUndoIndex > -1) {
      // Remove the matching undo and do not enqueue the check-in
      queue.splice(matchingUndoIndex, 1);
      set({ pendingQueue: queue });
      await AsyncStorage.setItem(QUEUE_STORAGE_KEY, JSON.stringify(queue));
      return;
    }

    const newRpc: QueuedRpc = {
      id: Math.random().toString(36).substring(7),
      name: 'complete_habit',
      args: { habitId, localDate, timezone, idempotencyKey },
      status: 'pending',
      retryCount: 0,
    };

    const updatedQueue = [...queue, newRpc];
    set({ pendingQueue: updatedQueue });

    try {
      await AsyncStorage.setItem(QUEUE_STORAGE_KEY, JSON.stringify(updatedQueue));
    } catch (e) {
      console.error('Failed to persist offline queue:', e);
    }
  },

  enqueueUndoHabit: async (habitId, localDate, timezone, idempotencyKey, checkInId) => {
    const queue = [...get().pendingQueue];

    // If the corresponding completion is still pending in the queue, we can just remove it
    const matchingCompleteIndex = queue.findIndex(
      (item) =>
        item.name === 'complete_habit' &&
        item.args.habitId === habitId &&
        item.args.localDate === localDate
    );

    if (matchingCompleteIndex > -1) {
      // Cancel out: remove the pending complete habit check-in
      queue.splice(matchingCompleteIndex, 1);
      set({ pendingQueue: queue });
      await AsyncStorage.setItem(QUEUE_STORAGE_KEY, JSON.stringify(queue));
      return;
    }

    const newRpc: QueuedRpc = {
      id: Math.random().toString(36).substring(7),
      name: 'undo_complete_habit',
      args: { habitId, localDate, timezone, idempotencyKey, checkInId },
      status: 'pending',
      retryCount: 0,
    };

    const updatedQueue = [...queue, newRpc];
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
    const remainingQueue: QueuedRpc[] = [];

    for (const item of queue) {
      if (item.status === 'syncing') continue;

      // Update state to syncing
      set((state) => ({
        pendingQueue: state.pendingQueue.map((q) =>
          q.id === item.id ? { ...q, status: 'syncing' } : q
        ),
      }));

      try {
        if (item.name === 'complete_habit') {
          await apiClient.checkInHabit(item.args.habitId, {
            localDate: item.args.localDate,
            timezoneAtCompletion: item.args.timezone,
            idempotencyKey: item.args.idempotencyKey,
          });
        } else if (item.name === 'undo_complete_habit') {
          // If checkInId is not set, we search the server for check-in on this date
          let cid = item.args.checkInId;
          if (!cid) {
            // Find check-in on date
            const checkIns = await apiClient.supabase
              .from('check_ins')
              .select('id')
              .eq('habit_id', item.args.habitId)
              .eq('local_date', item.args.localDate)
              .maybeSingle();
            
            if (checkIns.data) {
              cid = checkIns.data.id;
            }
          }

          if (cid) {
            await apiClient.undoCheckIn(item.args.habitId, cid);
          } else {
            console.warn('Could not undo offline check-in because no server check-in ID was found.');
          }
        }
      } catch (err: any) {
        console.warn(`Sync failed for RPC ${item.name} on habit ${item.args.habitId}:`, err.message);

        const statusStr = err.message || '';
        const isConflict = statusStr.includes('Conflict') || statusStr.includes('already completed') || statusStr.includes('idempotency');
        const isAuthError = statusStr.includes('401') || statusStr.includes('Unauthorized') || statusStr.includes('token');

        if (isConflict) {
          continue; // Treat as successful/resolved
        }

        if (isAuthError) {
          remainingQueue.push({
            ...item,
            status: 'pending',
            error: 'Authentication failed, awaiting reconnect',
          });
          remainingQueue.push(...queue.slice(queue.indexOf(item) + 1));
          break;
        }

        const isPermanent = statusStr.includes('400') || statusStr.includes('403') || statusStr.includes('validation');

        if (isPermanent) {
          remainingQueue.push({
            ...item,
            status: 'failed',
            error: err.message || 'Validation failed',
          });
        } else {
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
