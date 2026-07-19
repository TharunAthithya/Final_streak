import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { StreakApiClient } from '@streak/api-client';
import { ReflectionResponse } from '@streak/contracts';

interface ReflectionState {
  reflections: Record<string, ReflectionResponse>; // key: localDate (YYYY-MM-DD)
  drafts: Record<string, string>; // key: localDate -> draft response text
  loading: boolean;
  error: string | null;
  
  fetchReflection: (apiClient: StreakApiClient, localDate: string) => Promise<void>;
  submitReflection: (apiClient: StreakApiClient, localDate: string, prompt: string, response: string, isOffline: boolean) => Promise<void>;
  saveDraft: (localDate: string, text: string) => Promise<void>;
  loadDrafts: () => Promise<void>;
  syncPendingReflections: (apiClient: StreakApiClient) => Promise<void>;
}

const DRAFTS_STORAGE_KEY = '@streak_reflection_drafts';
const PENDING_REFLECTIONS_KEY = '@streak_offline_reflections_queue';

interface QueuedReflection {
  localDate: string;
  prompt: string;
  response: string;
  completedAt: string;
}

export const useReflectionStore = create<ReflectionState>((set, get) => ({
  reflections: {},
  drafts: {},
  loading: false,
  error: null,

  fetchReflection: async (apiClient, localDate) => {
    set({ loading: true, error: null });
    try {
      const data = await apiClient.getReflectionForDate(localDate);
      if (data) {
        set((state) => ({
          reflections: { ...state.reflections, [localDate]: data },
          loading: false,
        }));
      } else {
        set({ loading: false });
      }
    } catch (e: any) {
      set({ error: e.message || 'Failed to fetch reflection', loading: false });
    }
  },

  submitReflection: async (apiClient, localDate, prompt, response, isOffline) => {
    const completedAt = new Date().toISOString();
    
    // 1. Optimistic Update in State
    const tempReflection: ReflectionResponse = {
      id: `temp-${Math.random().toString(36).substring(7)}`,
      userId: 'temp-user',
      localDate,
      prompt,
      response,
      completedAt,
      createdAt: completedAt,
      updatedAt: completedAt,
    };

    set((state) => ({
      reflections: { ...state.reflections, [localDate]: tempReflection },
      // Clear draft since it is completed
      drafts: { ...state.drafts, [localDate]: '' },
    }));

    // Save draft state
    try {
      const updatedDrafts = { ...get().drafts, [localDate]: '' };
      await AsyncStorage.setItem(DRAFTS_STORAGE_KEY, JSON.stringify(updatedDrafts));
    } catch (e) {
      console.error('Failed to update drafts storage:', e);
    }

    if (isOffline) {
      // 2. Queue offline reflection
      try {
        const queuedStr = await AsyncStorage.getItem(PENDING_REFLECTIONS_KEY);
        const queue: QueuedReflection[] = queuedStr ? JSON.parse(queuedStr) : [];
        
        // Remove duplicate dates
        const filteredQueue = queue.filter(q => q.localDate !== localDate);
        filteredQueue.push({ localDate, prompt, response, completedAt });
        
        await AsyncStorage.setItem(PENDING_REFLECTIONS_KEY, JSON.stringify(filteredQueue));
      } catch (e) {
        console.error('Failed to enqueue offline reflection:', e);
      }
    } else {
      // 3. Save to Supabase immediately
      try {
        const data = await apiClient.submitReflection({
          localDate,
          prompt,
          response,
          completedAt,
        });
        set((state) => ({
          reflections: { ...state.reflections, [localDate]: data },
        }));
      } catch (e: any) {
        set({ error: e.message });
        throw e;
      }
    }
  },

  saveDraft: async (localDate, text) => {
    set((state) => ({
      drafts: { ...state.drafts, [localDate]: text },
    }));
    try {
      const drafts = get().drafts;
      await AsyncStorage.setItem(DRAFTS_STORAGE_KEY, JSON.stringify(drafts));
    } catch (e) {
      console.error('Failed to persist reflection draft:', e);
    }
  },

  loadDrafts: async () => {
    try {
      const stored = await AsyncStorage.getItem(DRAFTS_STORAGE_KEY);
      if (stored) {
        set({ drafts: JSON.parse(stored) });
      }
    } catch (e) {
      console.error('Failed to load drafts:', e);
    }
  },

  syncPendingReflections: async (apiClient) => {
    try {
      const queuedStr = await AsyncStorage.getItem(PENDING_REFLECTIONS_KEY);
      if (!queuedStr) return;

      const queue: QueuedReflection[] = JSON.parse(queuedStr);
      if (queue.length === 0) return;

      const remainingQueue: QueuedReflection[] = [];

      for (const item of queue) {
        try {
          await apiClient.submitReflection({
            localDate: item.localDate,
            prompt: item.prompt,
            response: item.response,
            completedAt: item.completedAt,
          });
        } catch (err: any) {
          console.warn(`Failed to sync reflection for date ${item.localDate}:`, err.message);
          // If conflict or validation error, we drop it to avoid blocking the queue
          const isNetworkError = !err.message.includes('Conflict') && !err.message.includes('400');
          if (isNetworkError) {
            remainingQueue.push(item);
          }
        }
      }

      await AsyncStorage.setItem(PENDING_REFLECTIONS_KEY, JSON.stringify(remainingQueue));
    } catch (e) {
      console.error('Failed to sync reflections queue:', e);
    }
  },
}));
