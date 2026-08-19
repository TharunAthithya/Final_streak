import { create } from 'zustand';
import { StreakApiClient } from '@streak/api-client';
import * as SecureStore from 'expo-secure-store';
import NetInfo from '@react-native-community/netinfo';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { env } from '../config/env';

// SecureStore adapter for Supabase session persistence
const SecureStoreAdapter = {
  getItem: async (key: string): Promise<string | null> => {
    try {
      return await SecureStore.getItemAsync(key);
    } catch (e) {
      console.error('SecureStore getItem error:', e);
      return null;
    }
  },
  setItem: async (key: string, value: string): Promise<void> => {
    try {
      await SecureStore.setItemAsync(key, value);
    } catch (e) {
      console.error('SecureStore setItem error:', e);
    }
  },
  removeItem: async (key: string): Promise<void> => {
    try {
      await SecureStore.deleteItemAsync(key);
    } catch (e) {
      console.error('SecureStore removeItem error:', e);
    }
  },
};

interface AuthState {
  token: string | null;
  user: any | null;
  loading: boolean;
  error: string | null;
  apiClient: StreakApiClient;
  initAuth: () => Promise<void>;
  signIn: (email: string, pass: string) => Promise<void>;
  signUp: (email: string, pass: string, username: string, name: string) => Promise<void>;
  updateUser: (name: string, bio: string, tz: string) => Promise<void>;
  signOut: () => Promise<void>;
  deleteUserAccount: () => Promise<void>;
  forgotPassword: (email: string, redirectTo?: string) => Promise<void>;
  resetPassword: (newPassword: string) => Promise<void>;
}

// Instantiate API Client with Secure Storage configuration using centralized env module
const client = new StreakApiClient(env.EXPO_PUBLIC_SUPABASE_URL, env.EXPO_PUBLIC_SUPABASE_ANON_KEY, {
  auth: {
    storage: SecureStoreAdapter,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});

const PROFILE_CACHE_KEY = '@streak_cached_profile';

export const useAuthStore = create<AuthState>((set, get) => ({
  token: null,
  user: null,
  loading: false,
  error: null,
  apiClient: client,

  initAuth: async () => {
    set({ loading: true });
    try {
      const netState = await NetInfo.fetch();
      const isOnline = !!netState.isConnected && !!netState.isInternetReachable;

      // 1. Get current session
      const { data: { session } } = await client.supabase.auth.getSession();

      if (session) {
        await client.supabase.auth.setSession({
          access_token: session.access_token,
          refresh_token: session.refresh_token,
        });

        let profile = null;

        if (isOnline) {
          try {
            profile = await client.getMe();
            await AsyncStorage.setItem(PROFILE_CACHE_KEY, JSON.stringify(profile));
          } catch (err: any) {
            console.warn('Failed to fetch online profile:', err?.message || err);
            if (err?.message?.includes('Not authenticated') || err?.message?.includes('Invalid')) {
              // Session is invalid or stale -> sign out to prompt login
              await client.supabase.auth.signOut();
              await AsyncStorage.removeItem(PROFILE_CACHE_KEY);
              set({ token: null, user: null, loading: false });
              return;
            }
          }
        }

        // Offline fallback
        if (!profile) {
          const cached = await AsyncStorage.getItem(PROFILE_CACHE_KEY);
          if (cached) {
            profile = JSON.parse(cached);
          }
        }

        if (!profile && isOnline) {
          // If online and profile could not be retrieved, clear session
          await client.supabase.auth.signOut();
          await AsyncStorage.removeItem(PROFILE_CACHE_KEY);
          set({ token: null, user: null, loading: false });
          return;
        }

        set({ token: session.access_token, user: profile, error: null });
      }

      // 2. Subscribe to auth state changes
      client.supabase.auth.onAuthStateChange(async (event, newSession) => {
        if (newSession) {
          let profile = get().user;
          const currentNetState = await NetInfo.fetch();
          const currentlyOnline = !!currentNetState.isConnected && !!currentNetState.isInternetReachable;

          if (currentlyOnline && (!profile || event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED')) {
            try {
              profile = await client.getMe();
              await AsyncStorage.setItem(PROFILE_CACHE_KEY, JSON.stringify(profile));
            } catch (e: any) {
              console.warn('Failed to update profile on auth change:', e.message);
              if (e?.message?.includes('Not authenticated')) {
                await client.supabase.auth.signOut();
                await AsyncStorage.removeItem(PROFILE_CACHE_KEY);
                set({ token: null, user: null });
                return;
              }
            }
          }
          set({ token: newSession.access_token, user: profile, error: null });
        } else {
          // Clear credentials
          await AsyncStorage.removeItem(PROFILE_CACHE_KEY);
          set({ token: null, user: null, error: null });
        }
      });
    } catch (e: any) {
      console.warn('Failed to restore session:', e.message);
      set({ token: null, user: null });
    } finally {
      set({ loading: false });
    }
  },

  signIn: async (email, pass) => {
    set({ loading: true, error: null });
    try {
      const { data, error } = await client.supabase.auth.signInWithPassword({
        email,
        password: pass,
      });

      if (error) throw error;
      if (!data.session) throw new Error('No session returned');

      await client.supabase.auth.setSession({
        access_token: data.session.access_token,
        refresh_token: data.session.refresh_token,
      });

      const profile = await client.getMe();
      await AsyncStorage.setItem(PROFILE_CACHE_KEY, JSON.stringify(profile));
      
      set({ token: data.session.access_token, user: profile, error: null });
    } catch (e: any) {
      set({ error: e.message || 'Authentication failed' });
      throw e;
    } finally {
      set({ loading: false });
    }
  },

  signUp: async (email, pass, username, name) => {
    set({ loading: true, error: null });
    try {
      // Purge any stale profile cache from a previous user session
      await AsyncStorage.removeItem(PROFILE_CACHE_KEY);

      const { data, error } = await client.supabase.auth.signUp({
        email,
        password: pass,
        options: {
          data: {
            display_name: name,
            username: username,
          },
        },
      });

      if (error) throw error;
      if (!data.session) {
        throw new Error('Account created, but no authenticated session was returned. Please try signing in.');
      }

      await client.supabase.auth.setSession({
        access_token: data.session.access_token,
        refresh_token: data.session.refresh_token,
      });

      const profile = await client.getMe();
      await AsyncStorage.setItem(PROFILE_CACHE_KEY, JSON.stringify(profile));

      set({ token: data.session.access_token, user: profile, error: null });
    } catch (e: any) {
      set({ error: e.message || 'Registration failed' });
      throw e;
    } finally {
      set({ loading: false });
    }
  },

  updateUser: async (name, bio, tz) => {
    set({ loading: true, error: null });
    try {
      const profile = await client.updateProfile({
        displayName: name,
        bio,
        timezone: tz,
      });
      await AsyncStorage.setItem(PROFILE_CACHE_KEY, JSON.stringify(profile));
      set({ user: profile });
    } catch (e: any) {
      set({ error: e.message });
      throw e;
    } finally {
      set({ loading: false });
    }
  },

  signOut: async () => {
    try {
      await client.supabase.auth.signOut();
    } catch (e) {
      console.warn('Supabase signOut error:', e);
    } finally {
      await AsyncStorage.removeItem(PROFILE_CACHE_KEY);
      set({ token: null, user: null, error: null });
    }
  },

  deleteUserAccount: async () => {
    set({ loading: true, error: null });
    try {
      await client.deleteAccount();
      await get().signOut();
    } catch (e: any) {
      set({ error: e.message });
      throw e;
    } finally {
      set({ loading: false });
    }
  },

  forgotPassword: async (email, redirectTo) => {
    set({ loading: true, error: null });
    try {
      await client.forgotPassword(email, redirectTo);
    } catch (e: any) {
      set({ error: e.message });
      throw e;
    } finally {
      set({ loading: false });
    }
  },

  resetPassword: async (newPassword) => {
    set({ loading: true, error: null });
    try {
      await client.resetPassword(newPassword);
    } catch (e: any) {
      set({ error: e.message });
      throw e;
    } finally {
      set({ loading: false });
    }
  },
}));
