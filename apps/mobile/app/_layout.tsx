import '../global.css';

import React, { useEffect } from 'react';
import { View } from 'react-native';
import { Slot, useRouter, useSegments } from 'expo-router';

import { useAuthStore } from '../src/store/auth-store';
import { useSyncStore } from '../src/store/sync-store';
import { useOnboardingStore } from '../src/store/onboarding-store';
import { OnboardingOverlay } from '../src/onboarding/OnboardingOverlay';
import { NoticeProvider } from '../src/components/ui/Notice';
import { SkeletonBox } from '../src/components/ui/SkeletonBox';

import { SafeAreaProvider } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';

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

  // Inject router navigator into onboarding store
  useEffect(() => {
    useOnboardingStore.getState().setNavigator((route: string) => {
      router.navigate(route as any);
    });
    return () => {
      useOnboardingStore.getState().setNavigator(null);
    };
  }, [router]);

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
          backgroundColor: '#0B0B0C',
        }}
      >
        <StatusBar style="light" />
        <SkeletonBox width={120} height={36} borderRadius={12} />
      </View>
    );
  }

  return (
    <SafeAreaProvider>
      <StatusBar style="light" />
      <NoticeProvider>
        <View style={{ flex: 1 }}>
          <Slot />
          {token && <OnboardingOverlay useNativeModal={false} />}
        </View>
      </NoticeProvider>
    </SafeAreaProvider>
  );
}