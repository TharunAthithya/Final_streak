import React from 'react';
import { Tabs } from 'expo-router';
import { Colors } from '@streak/design-tokens';
import { Text } from 'react-native';

export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: '#C5A880',
        tabBarInactiveTintColor: '#8A8276',
        tabBarStyle: {
          backgroundColor: '#12110E',
          borderTopColor: '#2B2723',
          height: 65,
          paddingBottom: 10,
          paddingTop: 10,
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
