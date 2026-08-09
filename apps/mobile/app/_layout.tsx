import '../global.css';

import React, { useEffect } from 'react';
import { ActivityIndicator, View } from 'react-native';
import { Slot, useRouter, useSegments } from 'expo-router';

import { useAuthStore } from '../src/store/auth-store';
import { useSyncStore } from '../src/store/sync-store';

import { Colors } from '@streak/design-tokens';

export default function RootLayout() {
  const { token, loading, initAuth } = useAuthStore();
  const { loadQueue } = useSyncStore();

  const segments = useSegments();
  const router = useRouter();

  // Initialize auth and offline queue
  useEffect(() => {
    initAuth();
    loadQueue();
  }, []);

  // Handle routing based on auth state
  useEffect(() => {
    if (loading) return;

    const inAuthGroup = segments[0] === '(auth)';

    if (!token && !inAuthGroup) {
      router.replace('/(auth)/login');
    } else if (token && inAuthGroup) {
      router.replace('/(tabs)/today');
    }
  }, [token, loading, segments]);

  if (loading) {
    return (
      <View
        style={{
          flex: 1,
          justifyContent: 'center',
          alignItems: 'center',
          backgroundColor: Colors.background,
        }}
      >
        <ActivityIndicator />
      </View>
    );
  }

  return <Slot />;
}