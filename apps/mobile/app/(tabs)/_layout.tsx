import React from 'react';
import { Tabs } from 'expo-router';
import { Colors } from '@streak/design-tokens';
import { Text } from 'react-native';

export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: Colors.primary,
        tabBarInactiveTintColor: Colors.textSecondary,
        tabBarStyle: {
          backgroundColor: Colors.surface,
          borderTopColor: Colors.border,
          height: 60,
          paddingBottom: 8,
          paddingTop: 8,
        },
        headerStyle: {
          backgroundColor: Colors.surface,
          shadowOpacity: 0.1,
          elevation: 2,
        },
        headerTitleStyle: {
          color: Colors.textPrimary,
          fontSize: 18,
          fontWeight: 'bold',
        },
      }}
    >
      <Tabs.Screen
        name="today"
        options={{
          title: 'Today',
          tabBarIcon: ({ color }) => <Text style={{ color, fontSize: 20 }}>✓</Text>,
        }}
      />
      <Tabs.Screen
        name="rooms"
        options={{
          title: 'Rooms',
          tabBarIcon: ({ color }) => <Text style={{ color, fontSize: 20 }}>👥</Text>,
        }}
      />
      <Tabs.Screen
        name="activity"
        options={{
          title: 'Social Feed',
          tabBarIcon: ({ color }) => <Text style={{ color, fontSize: 20 }}>🔥</Text>,
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'You',
          tabBarIcon: ({ color }) => <Text style={{ color, fontSize: 20 }}>👤</Text>,
        }}
      />
    </Tabs>
  );
}
