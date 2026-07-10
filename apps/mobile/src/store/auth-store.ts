import { create } from 'zustand';
import { StreakApiClient } from '@streak/api-client';

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
}

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || '';

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn('Supabase environment variables are missing!');
}

const client = new StreakApiClient(supabaseUrl, supabaseAnonKey);

export const useAuthStore = create<AuthState>((set, get) => ({
  token: null,
  user: null,
  loading: false,
  error: null,
  apiClient: client,

  initAuth: async () => {
    set({ loading: true });
    try {
      // 1. Check current session
      const { data: { session } } = await client.supabase.auth.getSession();
      
      if (session) {
        client.supabase.auth.setSession(session);
        // Fetch matching profile
        const profile = await client.getMe();
        set({ token: session.access_token, user: profile, error: null });
      }

      // 2. Subscribe to auth state changes
      client.supabase.auth.onAuthStateChange(async (event, newSession) => {
        if (newSession) {
          try {
            const profile = await client.getMe();
            set({ token: newSession.access_token, user: profile, error: null });
          } catch (e: any) {
            console.error('Failed to get profile on auth change:', e.message);
          }
        } else {
          set({ token: null, user: null, error: null });
        }
      });
    } catch (e: any) {
      console.warn('Failed to restore Supabase session:', e.message);
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

      const profile = await client.getMe();
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
        // If email confirmation is required:
        throw new Error('Verification email sent! Please check your inbox.');
      }

      const profile = await client.getMe();
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
      set({ user: profile });
    } catch (e: any) {
      set({ error: e.message });
      throw e;
    } finally {
      set({ loading: false });
    }
  },

  signOut: async () => {
    await client.supabase.auth.signOut();
    set({ token: null, user: null, error: null });
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
}));
