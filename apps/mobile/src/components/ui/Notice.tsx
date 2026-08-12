import React, { createContext, useContext, useState, useCallback } from 'react';
import {
  View,
  Text,
  AccessibilityInfo,
  PanResponder,
} from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  runOnJS,
} from 'react-native-reanimated';
import { Icon } from './Icon';

export type NoticeVariant = 'success' | 'error' | 'warning' | 'info';

export interface NoticeMessage {
  id: string;
  type: NoticeVariant;
  text: string;
}

interface NoticeContextType {
  showNotice: (type: NoticeVariant, text: string) => void;
  success: (text: string) => void;
  error: (text: string) => void;
  warning: (text: string) => void;
  info: (text: string) => void;
}

const NoticeContext = createContext<NoticeContextType | null>(null);

export const useNotice = (): NoticeContextType => {
  const ctx = useContext(NoticeContext);
  if (!ctx) {
    throw new Error('useNotice must be used within a NoticeProvider');
  }
  return ctx;
};

const getIconName = (type: NoticeVariant): string => {
  switch (type) {
    case 'success':
      return 'check';
    case 'error':
      return 'close';
    case 'warning':
      return 'alert-circle';
    case 'info':
    default:
      return 'info';
  }
};

const getIconColor = (type: NoticeVariant): string => {
  switch (type) {
    case 'success':
      return '#E8C08A'; // gold
    case 'error':
      return '#E8899A'; // rose
    case 'warning':
      return '#F59E42'; // amber
    case 'info':
    default:
      return '#38BDF8'; // blue
  }
};

const NoticeItem: React.FC<{
  item: NoticeMessage;
  onDismiss: (id: string) => void;
}> = ({ item, onDismiss }) => {
  const translateX = useSharedValue(0);
  const opacity = useSharedValue(0);

  React.useEffect(() => {
    // Accessibility announcement for screen readers
    AccessibilityInfo.announceForAccessibility(item.text);

    // Slide in
    opacity.value = withTiming(1, { duration: 250 });

    // Auto dismiss after 2.5s
    const timer = setTimeout(() => {
      handleDismiss();
    }, 2500);

    return () => clearTimeout(timer);
  }, []);

  const handleDismiss = () => {
    opacity.value = withTiming(0, { duration: 200 }, () => {
      runOnJS(onDismiss)(item.id);
    });
  };

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ translateX: translateX.value }],
  }));

  return (
    <Animated.View
      style={animatedStyle}
      accessibilityLiveRegion="polite"
      className="bg-[#1C1816] border border-[#2B2521] rounded-2xl px-4 py-3.5 mb-2.5 flex-row items-center shadow-lg mx-5"
    >
      <View
        className="w-8 h-8 rounded-full items-center justify-center mr-3 border border-[#3A2E1F]"
        style={{ backgroundColor: '#221C16' }}
      >
        <Icon
          name={getIconName(item.type)}
          size={16}
          color={getIconColor(item.type)}
        />
      </View>
      <Text className="flex-1 text-sm font-semibold text-[#F5F2EC] leading-tight">
        {item.text}
      </Text>
    </Animated.View>
  );
};

export const NoticeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [notices, setNotices] = useState<NoticeMessage[]>([]);

  const dismissNotice = useCallback((id: string) => {
    setNotices((prev) => prev.filter((n) => n.id !== id));
  }, []);

  const showNotice = useCallback((type: NoticeVariant, text: string) => {
    const id = Math.random().toString(36).substring(2, 9);
    setNotices((prev) => [...prev, { id, type, text }]);
  }, []);

  const success = useCallback((text: string) => showNotice('success', text), [showNotice]);
  const error = useCallback((text: string) => showNotice('error', text), [showNotice]);
  const warning = useCallback((text: string) => showNotice('warning', text), [showNotice]);
  const info = useCallback((text: string) => showNotice('info', text), [showNotice]);

  return (
    <NoticeContext.Provider value={{ showNotice, success, error, warning, info }}>
      {children}
      {/* Absolute Toast Container */}
      <View
        pointerEvents="box-none"
        style={{
          position: 'absolute',
          bottom: 30,
          left: 0,
          right: 0,
          zIndex: 9999,
        }}
      >
        {notices.map((n) => (
          <NoticeItem key={n.id} item={n} onDismiss={dismissNotice} />
        ))}
      </View>
    </NoticeContext.Provider>
  );
};
