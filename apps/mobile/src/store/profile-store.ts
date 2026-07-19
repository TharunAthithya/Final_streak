import { create } from 'zustand';
import { UserResponse } from '@streak/contracts';
import { StreakApiClient } from '@streak/api-client';

interface ProfileState {
  profile: UserResponse | null;
  loading: boolean;
  error: string | null;
  fetchProfile: (apiClient: StreakApiClient) => Promise<void>;
  updateProfile: (apiClient: StreakApiClient, name: string, bio: string, timezone: string) => Promise<void>;
  deleteProfileAccount: (apiClient: StreakApiClient, onSignOut: () => Promise<void>) => Promise<void>;
}

export const useProfileStore = create<ProfileState>((set) => ({
  profile: null,
  loading: false,
  error: null,

  fetchProfile: async (apiClient) => {
    set({ loading: true, error: null });
    try {
      const data = await apiClient.getMe();
      set({ profile: data, loading: false });
    } catch (e: any) {
      set({ error: e.message || 'Failed to fetch profile', loading: false });
    }
  },

  updateProfile: async (apiClient, name, bio, timezone) => {
    set({ loading: true, error: null });
    try {
      const data = await apiClient.updateProfile({
        displayName: name,
        bio,
        timezone,
      });
      set({ profile: data, loading: false });
    } catch (e: any) {
      set({ error: e.message || 'Failed to update profile', loading: false });
      throw e;
    }
  },

  deleteProfileAccount: async (apiClient, onSignOut) => {
    set({ loading: true, error: null });
    try {
      await apiClient.deleteAccount();
      await onSignOut();
      set({ profile: null, loading: false });
    } catch (e: any) {
      set({ error: e.message || 'Failed to delete account', loading: false });
      throw e;
    }
  },
}));
