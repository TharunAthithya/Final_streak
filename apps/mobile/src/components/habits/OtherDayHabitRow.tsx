import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';

interface OtherDayHabitRowProps {
  name: string;
  nextDayLabel: string;
  onCardPress?: () => void;
}

export const OtherDayHabitRow: React.FC<OtherDayHabitRowProps> = ({
  name,
  nextDayLabel,
  onCardPress,
}) => {
  return (
    <TouchableOpacity
      activeOpacity={onCardPress ? 0.7 : 1}
      onPress={onCardPress}
      className="bg-[#181513] border border-[#2B2521] rounded-2xl p-4 mb-3 flex-row justify-between items-center opacity-75"
    >
      <View className="flex-row items-center flex-1 pr-3">
        {/* Muted Circle Indicator */}
        <View className="w-8 h-8 rounded-full border-2 border-[#3D352E] justify-center items-center mr-3 bg-[#110F0E]" />
        
        {/* Habit Name */}
        <Text numberOfLines={1} className="text-base font-semibold text-[#9C958C] flex-1">
          {name}
        </Text>
      </View>

      {/* Next Day Pill Badge */}
      <View className="bg-[#241F1B] px-3 py-1.5 rounded-full border border-[#362E27]">
        <Text className="text-xs font-semibold text-[#8C8377]">
          Next: {nextDayLabel}
        </Text>
      </View>
    </TouchableOpacity>
  );
};
