import React from 'react';
import { Redirect } from 'expo-router';
import { View } from 'react-native';

import { useAuthStore } from '../src/store/auth-store';
import { SkeletonBox } from '../src/components/ui/SkeletonBox';

export default function Index() {
    const { token, loading } = useAuthStore();

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
                <SkeletonBox width={120} height={36} borderRadius={12} />
            </View>
        );
    }

    if (token) {
        return <Redirect href="/(tabs)/today" />;
    }

    return <Redirect href="/(auth)/login" />;
}