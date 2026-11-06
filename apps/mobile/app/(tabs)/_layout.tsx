import React from 'react';
import { Tabs } from 'expo-router';
import { View } from 'react-native';
import { Icon } from '../../src/components/ui/Icon';
import { useCurrentStep } from '../../src/store/onboarding-store';

/** Rooms tab icon; gets the tutorial's gold ring while the tutorial points at the Rooms tab. */
const RoomsTabIcon = ({ color }: { color: string }) => {
  const step = useCurrentStep();
  const highlighted = step?.target === 'tabRooms';
  return (
    <View
      style={{
        padding: 6,
        margin: -6,
        borderRadius: 18,
        borderWidth: 1.5,
        borderColor: highlighted ? '#E8C08A' : 'transparent',
        backgroundColor: highlighted ? 'rgba(232,192,138,0.10)' : 'transparent',
      }}
    >
      <Icon name="rooms" size={20} color={color} />
    </View>
  );
};

export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: '#E8C08A',
        tabBarInactiveTintColor: '#65605A',
        tabBarStyle: {
          backgroundColor: '#0B0B0C',
          borderTopColor: '#2B2521',
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
          tabBarIcon: ({ color }) => <Icon name="check" size={20} color={color as string} />,
        }}
      />
      <Tabs.Screen
        name="rooms"
        options={{
          title: 'Rooms',
          tabBarIcon: ({ color }) => <RoomsTabIcon color={color as string} />,
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
