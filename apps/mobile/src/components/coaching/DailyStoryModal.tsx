import React, { useRef, useEffect } from 'react';
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  Animated,
} from 'react-native';
import { DailyStory } from '../../data/daily-stories';
import { Icon } from '../ui/Icon';

interface DailyStoryModalProps {
  visible: boolean;
  story: DailyStory;
  isReadonly?: boolean;
  onClose: () => void;
  onComplete: () => void;
}

export const DailyStoryModal: React.FC<DailyStoryModalProps> = ({
  visible,
  story,
  isReadonly = false,
  onClose,
  onComplete,
}) => {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(20)).current;

  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 250,
          useNativeDriver: true,
        }),
        Animated.timing(slideAnim, {
          toValue: 0,
          duration: 250,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      fadeAnim.setValue(0);
      slideAnim.setValue(20);
    }
  }, [visible]);

  if (!visible) return null;

  const handleReadyPress = () => {
    onComplete();
  };

  return (
    <Modal
      visible={visible}
      animationType="fade"
      transparent
      onRequestClose={onClose}
    >
      <View className="flex-1 bg-[#0B0B0C]">
        {/* Header Bar */}
        <View className="pt-14 pb-4 px-6 border-b border-[#2B2521] flex-row justify-between items-center bg-[#141110]">
          <View>
            <Text className="text-xl font-bold text-[#F5F2EC]" style={{ fontFamily: 'Baloo 2' }}>
              Before You Begin
            </Text>
            <View className="flex-row items-center mt-0.5">
              <Text className="text-xs font-semibold text-[#E8C08A]">
                {isReadonly ? "Today's Lesson" : "Today's Story"}
              </Text>
              <Text className="text-xs text-[#65605A] mx-1.5">•</Text>
              <Text className="text-xs font-medium text-[#9C958C]">{story.topic}</Text>
            </View>
          </View>

          <TouchableOpacity
            onPress={onClose}
            className="w-9 h-9 rounded-full bg-[#181513] border border-[#2B2521] items-center justify-center"
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            accessibilityLabel="Close daily story"
            accessibilityRole="button"
          >
            <Icon name="close" size={18} color="#9C958C" />
          </TouchableOpacity>
        </View>

        {/* Scrollable Scannable Story Content */}
        <Animated.View
          style={{
            flex: 1,
            opacity: fadeAnim,
            transform: [{ translateY: slideAnim }],
          }}
        >
          <ScrollView
            showsVerticalScrollIndicator={false}
            contentContainerStyle={{ paddingHorizontal: 24, paddingTop: 24, paddingBottom: 40 }}
          >
            {/* Section 1: What you're thinking */}
            <View className="bg-[#181513] border border-[#2B2521] rounded-3xl p-5 mb-5 shadow-sm">
              <View className="flex-row items-center mb-2">
                <Text className="text-base mr-2">💭</Text>
                <Text className="text-xs font-bold text-[#E8C08A] uppercase tracking-wider">
                  What you're thinking
                </Text>
              </View>
              <Text
                className="text-xl font-bold text-[#F5F2EC] leading-snug"
                style={{ fontFamily: 'Baloo 2' }}
              >
                {story.thought}
              </Text>
            </View>

            {/* Section 2: What usually happens */}
            <View className="bg-[#181513] border border-[#2B2521] rounded-3xl p-5 mb-5 shadow-sm">
              <View className="flex-row items-center mb-2">
                <Text className="text-base mr-2">⚠️</Text>
                <Text className="text-xs font-bold text-[#E8998A] uppercase tracking-wider">
                  What usually happens
                </Text>
              </View>
              <Text className="text-base text-[#F5F2EC] leading-relaxed font-medium">
                {story.consequence}
              </Text>
            </View>

            {/* Section 3: Try this instead */}
            <View className="bg-[#181513] border border-[#E8C08A]/30 rounded-3xl p-5 mb-5 shadow-sm">
              <View className="flex-row items-center mb-2">
                <Text className="text-base mr-2">✅</Text>
                <Text className="text-xs font-bold text-[#E8C08A] uppercase tracking-wider">
                  Try this instead
                </Text>
              </View>
              <Text className="text-base text-[#F5F2EC] leading-relaxed font-semibold">
                {story.betterApproach}
              </Text>
            </View>

            {/* Section 4: Example */}
            <View className="bg-[#181513] border border-[#2B2521] rounded-3xl p-5 mb-8 shadow-sm">
              <View className="flex-row items-center mb-2">
                <Text className="text-base mr-2">💡</Text>
                <Text className="text-xs font-bold text-[#9C958C] uppercase tracking-wider">
                  Example
                </Text>
              </View>
              <Text className="text-sm text-[#9C958C] leading-relaxed font-normal">
                {story.practicalExample}
              </Text>
            </View>
          </ScrollView>

          {/* Sticky Bottom Action Bar */}
          <View className="px-6 pb-10 pt-4 bg-[#141110] border-t border-[#2B2521]">
            {!isReadonly ? (
              <TouchableOpacity
                onPress={handleReadyPress}
                activeOpacity={0.8}
                className="w-full py-4 bg-[#E8C08A] rounded-2xl items-center justify-center flex-row shadow-md"
                accessibilityRole="button"
                accessibilityLabel="I am ready"
              >
                <Icon name="check" size={18} color="#241C14" className="mr-2" />
                <Text className="text-base font-bold text-[#241C14]">I'm Ready</Text>
              </TouchableOpacity>
            ) : (
              <TouchableOpacity
                onPress={onClose}
                activeOpacity={0.8}
                className="w-full py-4 bg-[#181513] border border-[#2B2521] rounded-2xl items-center justify-center flex-row"
                accessibilityRole="button"
                accessibilityLabel="Close today's lesson"
              >
                <Text className="text-base font-semibold text-[#F5F2EC]">Close</Text>
              </TouchableOpacity>
            )}
          </View>
        </Animated.View>
      </View>
    </Modal>
  );
};
