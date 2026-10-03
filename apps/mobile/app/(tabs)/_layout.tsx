import React from 'react';
import { Platform } from 'react-native';
import { Tabs } from 'expo-router';
import { Icon } from '../../src/components/ui/Icon';

export default function TabsLayout() {
  const isIos = Platform.OS === 'ios';

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: '#E8C08A',
        tabBarInactiveTintColor: '#65605A',
        tabBarStyle: {
          backgroundColor: '#0B0B0C',
          borderTopColor: '#2B2521',
          height: isIos ? 88 : 65,
          paddingBottom: isIos ? 28 : 10,
          paddingTop: 10,
        },
      }}
    >
      <Tabs.Screen
        name="today"
        options={{
          title: 'Today',
          tabBarIcon: ({ color }) => <Icon name="check" size={20} color={color as string} />,
        }}
      />
      <Tabs.Screen
        name="rooms"
        options={{
          title: 'Rooms',
          tabBarIcon: ({ color }) => <Icon name="rooms" size={20} color={color as string} />,
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'You',
          tabBarIcon: ({ color }) => <Icon name="user" size={20} color={color as string} />,
        }}
      />
    </Tabs>
  );
}
