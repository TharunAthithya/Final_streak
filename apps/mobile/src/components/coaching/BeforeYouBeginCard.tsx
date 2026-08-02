import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { Icon } from '../ui/Icon';

interface BeforeYouBeginCardProps {
  isCompleted?: boolean;
  onPressBegin: () => void;
}

export const BeforeYouBeginCard: React.FC<BeforeYouBeginCardProps> = ({
  isCompleted = false,
  onPressBegin,
}) => {
  if (isCompleted) {
    return (
      <View className="bg-[#181513] border border-[#2B2521] rounded-2xl px-4 py-3 mb-4 flex-row items-center justify-between shadow-sm">
        <View className="flex-1 pr-3 flex-row items-center">
          <View className="w-6 h-6 rounded-full bg-[#1E2E20] border border-[#4ADE80]/30 items-center justify-center mr-2.5">
            <Icon name="check" size={12} color="#4ADE80" />
          </View>
          <View className="flex-1">
            <Text className="text-xs font-bold text-[#F5F2EC]">You made today's promise</Text>
            <Text className="text-[11px] text-[#9C958C]" numberOfLines={1}>
              Lesson available anytime today
            </Text>
          </View>
        </View>

        <TouchableOpacity
          onPress={onPressBegin}
          activeOpacity={0.8}
          className="bg-[#241E1A] border border-[#E8C08A]/40 px-3 py-1.5 rounded-lg flex-row items-center"
          accessibilityRole="button"
          accessibilityLabel="Read today's lesson"
        >
          <Text className="text-[11px] font-bold text-[#E8C08A] mr-1">Read Lesson</Text>
          <Icon name="book-open" size={12} color="#E8C08A" />
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View className="bg-[#181513] border border-[#2B2521] rounded-2xl px-4 py-3 mb-4 flex-row items-center justify-between shadow-sm">
      <View className="flex-1 pr-3 flex-row items-center">
        <View className="w-7 h-7 rounded-xl bg-[#3A2E1F] border border-[#E8C08A]/30 items-center justify-center mr-2.5">
          <Icon name="book-open" size={14} color="#E8C08A" />
        </View>
        <View className="flex-1">
          <Text className="text-xs font-bold text-[#F5F2EC]">Before You Begin</Text>
          <Text className="text-[11px] text-[#9C958C]" numberOfLines={1}>
            Start your day with a short lesson
          </Text>
        </View>
      </View>

      <TouchableOpacity
        onPress={onPressBegin}
        activeOpacity={0.8}
        className="bg-[#E8C08A] px-3.5 py-1.5 rounded-lg flex-row items-center"
        accessibilityRole="button"
        accessibilityLabel="Begin today's lesson"
      >
        <Text className="text-xs font-bold text-[#241C14] mr-1">Begin</Text>
        <Icon name="arrow-right" size={12} color="#241C14" />
      </TouchableOpacity>
    </View>
  );
};
