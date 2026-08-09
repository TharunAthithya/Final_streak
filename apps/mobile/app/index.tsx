import React from 'react';
import { Redirect } from 'expo-router';
import { ActivityIndicator, View } from 'react-native';

import { useAuthStore } from '../src/store/auth-store';
import { Colors } from '@streak/design-tokens';

export default function Index() {
    const { token, loading } = useAuthStore();

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

    if (token) {
        return <Redirect href="/(tabs)/today" />;
    }

    return <Redirect href="/(auth)/login" />;
}