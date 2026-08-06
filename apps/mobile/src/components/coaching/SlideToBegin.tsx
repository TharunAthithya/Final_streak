import React, { useRef } from 'react';
import {
  View,
  Text,
  Animated,
  PanResponder,
  LayoutChangeEvent,
  Dimensions,
} from 'react-native';
import * as Haptics from 'expo-haptics';
import { Icon } from '../ui/Icon';

interface SlideToBeginProps {
  onSlideComplete: () => void;
  label?: string;
}

const THUMB_SIZE = 56;
const PADDING = 4;

export const SlideToBegin: React.FC<SlideToBeginProps> = ({
  onSlideComplete,
  label = 'Slide to begin',
}) => {
  const pan = useRef(new Animated.Value(0)).current;
  const containerWidthRef = useRef<number>(300); // Default fallback width
  const isCompletedRef = useRef<boolean>(false);

  const handleLayout = (e: LayoutChangeEvent) => {
    containerWidthRef.current = e.nativeEvent.layout.width;
  };

  const getMaxTranslation = () => {
    return containerWidthRef.current - THUMB_SIZE - PADDING * 2;
  };

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderGrant: () => {
        pan.setOffset((pan as any)._value || 0);
        pan.setValue(0);
      },
      onPanResponderMove: (_, gestureState) => {
        if (isCompletedRef.current) return;
        const maxTrans = getMaxTranslation();
        let newX = gestureState.dx;
        if (newX < 0) newX = 0;
        if (newX > maxTrans) newX = maxTrans;
        pan.setValue(newX);
      },
      onPanResponderRelease: (_, gestureState) => {
        pan.flattenOffset();
        const maxTrans = getMaxTranslation();
        const currentX = (pan as any)._value || 0;

        if (currentX >= maxTrans * 0.75) {
          // Slide successful!
          isCompletedRef.current = true;
          Animated.timing(pan, {
            toValue: maxTrans,
            duration: 150,
            useNativeDriver: false,
          }).start(() => {
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
            onSlideComplete();
            // Reset after short delay if modal stays mounted
            setTimeout(() => {
              isCompletedRef.current = false;
              pan.setValue(0);
            }, 500);
          });
        } else {
          // Snap back
          Animated.spring(pan, {
            toValue: 0,
            friction: 6,
            tension: 40,
            useNativeDriver: false,
          }).start();
        }
      },
    })
  ).current;

  const maxTrans = getMaxTranslation();

  // Opacity of label text decreases as thumb is dragged
  const textOpacity = pan.interpolate({
    inputRange: [0, maxTrans > 0 ? maxTrans * 0.6 : 100],
    outputRange: [1, 0],
    extrapolate: 'clamp',
  });

  return (
    <View
      onLayout={handleLayout}
      className="w-full h-[64px] bg-[#181513] border border-[#2B2521] rounded-full justify-center relative px-[4px] shadow-lg"
    >
      {/* Label Text */}
      <Animated.View
        style={{ opacity: textOpacity }}
        className="absolute left-0 right-0 items-center justify-center pointer-events-none"
      >
        <Text className="text-sm font-semibold text-[#9C958C] tracking-wide">
          {label}
        </Text>
      </Animated.View>

      {/* Draggable Circle Thumb */}
      <Animated.View
        {...panResponder.panHandlers}
        style={{
          transform: [{ translateX: pan }],
          width: THUMB_SIZE,
          height: THUMB_SIZE,
        }}
        className="bg-[#E8C08A] rounded-full items-center justify-center shadow-md border border-[#F5E2C4]/40"
      >
        <Icon name="arrow-right" size={20} color="#241C14" />
      </Animated.View>
    </View>
  );
};
