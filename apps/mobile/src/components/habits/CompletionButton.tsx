import React, { useEffect, useRef } from 'react';
import { TouchableOpacity, Animated } from 'react-native';
import * as Haptics from 'expo-haptics';
import { Icon } from '../ui/Icon';

interface CompletionButtonProps {
  status: 'pending' | 'completed' | 'disabled';
  onPress: () => void;
  size?: number;
}

export const CompletionButton: React.FC<CompletionButtonProps> = ({
  status,
  onPress,
  size = 40,
}) => {
  const scale = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (status === 'completed') {
      Animated.sequence([
        Animated.timing(scale, {
          toValue: 1.22,
          duration: 110,
          useNativeDriver: false,
        }),
        Animated.spring(scale, {
          toValue: 1.0,
          friction: 4,
          tension: 180,
          useNativeDriver: false,
        }),
      ]).start();
    }
  }, [status]);

  const handlePress = () => {
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } catch (e) {
      // Haptics fallback on unsupported devices
    }

    Animated.sequence([
      Animated.timing(scale, {
        toValue: 1.25,
        duration: 100,
        useNativeDriver: false,
      }),
      Animated.spring(scale, {
        toValue: 1.0,
        friction: 4,
        tension: 180,
        useNativeDriver: false,
      }),
    ]).start();

    onPress();
  };

  const getStyles = () => {
    switch (status) {
      case 'completed':
        return 'bg-[#E8C08A] border border-[#E8C08A]';
      case 'disabled':
        return 'border border-[#2B2521] opacity-30';
      case 'pending':
      default:
        return 'border-[1.5px] border-[#2B2521] bg-transparent';
    }
  };

  return (
    <TouchableOpacity
      onPress={handlePress}
      disabled={status === 'disabled'}
      activeOpacity={0.8}
    >
      <Animated.View
        style={{
          width: size,
          height: size,
          transform: [{ scale }],
        }}
        className={`rounded-full justify-center items-center ${getStyles()}`}
      >
        {status === 'completed' && (
          <Icon name="check" size={size * 0.5} color="#241C14" />
        )}
      </Animated.View>
    </TouchableOpacity>
  );
};
