import { create } from 'zustand';
import * as SecureStore from 'expo-secure-store';
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

const SECURE_TOKEN_KEY = '@streak_mobile_secure_token';

// In development, target the localhost API bound to port 4000
const API_URL = 'http://localhost:4000';
const client = new StreakApiClient(API_URL);

export const useAuthStore = create<AuthState>((set, get) => ({
  token: null,
  user: null,
  loading: false,
  error: null,
  apiClient: client,

  initAuth: async () => {
    set({ loading: true });
    try {
      const storedToken = await SecureStore.getItemAsync(SECURE_TOKEN_KEY);
      if (storedToken) {
        client.setToken(storedToken);
        const profile = await client.getMe();
        set({ token: storedToken, user: profile, error: null });
      }
    } catch (e: any) {
      console.warn('Failed to restore session:', e.message);
      // Clean stale session token if verification failed
      await SecureStore.deleteItemAsync(SECURE_TOKEN_KEY);
      client.setToken(null);
    } finally {
      set({ loading: false });
    }
  },

  signIn: async (email, pass) => {
    set({ loading: true, error: null });
    try {
      // In local development fallback mode: we generate a token locally
      // Or if a production API is available, we make an authentication signin request.
      // Since local API uses local JWT mock or JWT verify, we can mock signin for developer flow:
      // We generate a valid JWT payload structure.
      const payload = { sub: `usr-${Math.random().toString(36).substring(5)}`, email };
      // In local dev, ALLOW_DEV_MOCK_AUTH=true will accept this signature-less or custom-signed token.
      // We encode a simple client-side JWT token or use a standard token for verification.
      const mockToken = `dev-token-${email}-${Date.now()}`;
      await SecureStore.setItemAsync(SECURE_TOKEN_KEY, mockToken);
      client.setToken(mockToken);

      const profile = await client.getMe();
      set({ token: mockToken, user: profile, error: null });
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
      const mockToken = `dev-token-${email}-${Date.now()}`;
      await SecureStore.setItemAsync(SECURE_TOKEN_KEY, mockToken);
      client.setToken(mockToken);

      // Trigger initial profile update to sync database
      const profile = await client.updateProfile({
        displayName: name,
        username,
        timezone: 'UTC',
      });

      set({ token: mockToken, user: profile, error: null });
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
    await SecureStore.deleteItemAsync(SECURE_TOKEN_KEY);
    client.setToken(null);
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
