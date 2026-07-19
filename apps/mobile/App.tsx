import 'react-native-gesture-handler';
import React from 'react';
import { ExpoRoot } from 'expo-router';

// The application entry point delegates routing to Expo Router
export default function App() {
  // @ts-ignore - require.context is injected by metro-expo-router
  const ctx = require.context('./app');
  return <ExpoRoot context={ctx} />;
}
