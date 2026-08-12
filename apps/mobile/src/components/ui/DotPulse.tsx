import React, { useEffect, useState } from 'react';
import { View, AccessibilityInfo } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  withDelay,
} from 'react-native-reanimated';

interface DotPulseProps {
  color?: string;
  size?: number;
  className?: string;
}

const SingleDot: React.FC<{ color: string; size: number; delay: number; reduceMotion: boolean }> = ({
  color,
  size,
  delay,
  reduceMotion,
}) => {
  const opacity = useSharedValue(0.3);

  useEffect(() => {
    if (reduceMotion) {
      opacity.value = 0.7;
      return;
    }

    opacity.value = withDelay(
      delay,
      withRepeat(withTiming(1, { duration: 400 }), -1, true)
    );
  }, [reduceMotion, delay]);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: reduceMotion ? 0.7 : opacity.value,
  }));

  return (
    <Animated.View
      style={[
        {
          width: size,
          height: size,
          borderRadius: size / 2,
          backgroundColor: color,
          marginHorizontal: 2,
        },
        animatedStyle,
      ]}
    />
  );
};

export const DotPulse: React.FC<DotPulseProps> = ({
  color = '#E8C08A',
  size = 6,
  className = '',
}) => {
  const [reduceMotion, setReduceMotion] = useState(false);

  useEffect(() => {
    AccessibilityInfo.isReduceMotionEnabled().then((enabled) => {
      setReduceMotion(enabled);
    });

    const subscription = AccessibilityInfo.addEventListener('reduceMotionChanged', (enabled) => {
      setReduceMotion(enabled);
    });

    return () => {
      subscription?.remove();
    };
  }, []);

  return (
    <View className={`flex-row items-center justify-center ${className}`}>
      <SingleDot color={color} size={size} delay={0} reduceMotion={reduceMotion} />
      <SingleDot color={color} size={size} delay={150} reduceMotion={reduceMotion} />
      <SingleDot color={color} size={size} delay={300} reduceMotion={reduceMotion} />
    </View>
  );
};
