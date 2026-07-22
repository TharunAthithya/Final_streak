---
name: react-native-best-practices
description: Applies React Native and Expo best practices for performance, UI rendering, and state management. Use this skill when generating or refactoring React Native UI components, hooks, or navigation logic.
---

# React Native & Expo Best Practices

When writing or reviewing React Native code, strictly adhere to the following rules:

## UI & Performance
- **Avoid Inline Functions in Render:** Never pass inline arrow functions to `onPress` or list item renderers. Always wrap them in `useCallback`.
- **FlatList Optimization:** Always extract `renderItem` into a separate memoized component. Use `keyExtractor`, `initialNumToRender`, and `windowSize` properly.
- **Image Handling:** Prefer `expo-image` over React Native's default `Image` component for advanced caching and memory management.

## State & Side Effects
- **Hooks:** Keep `useEffect` dependencies exhaustive. Avoid deep object dependencies that cause unnecessary re-renders.
- **State:** Use local state (`useState`) for UI state. Push complex, shared logic to global stores (like Zustand) or server-state libraries.

## Expo & Navigation
- **Expo Router:** Default to file-based routing with Expo Router. Do not use older `react-navigation` stack patterns unless explicitly instructed.
- **Styling:** Use `StyleSheet.create` for static styles to prevent bridge overhead, or Tailwind (NativeWind) if configured in the project. Do not use inline style objects.