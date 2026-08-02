import React from 'react';
import { View, Text } from 'react-native';
import { Icon } from '../ui/Icon';

interface HabitStatsCardProps {
  currentStreak: number;
  bestStreak: number;
  previewCurrentStreak?: number;
  previewBestStreak?: number;
  isLivePreview?: boolean;
}

export const HabitStatsCard: React.FC<HabitStatsCardProps> = ({
  currentStreak,
  bestStreak,
  previewCurrentStreak,
  previewBestStreak,
  isLivePreview = false,
}) => {
  const displayCurrent = isLivePreview && previewCurrentStreak !== undefined ? previewCurrentStreak : currentStreak;
  const displayBest = isLivePreview && previewBestStreak !== undefined ? previewBestStreak : bestStreak;

  return (
    <View className="flex-row space-x-3 mb-6">
      {/* Current Streak Card */}
      <View className="flex-1 bg-[#181513] border border-[#2B2521] p-4 rounded-2xl items-center mr-1.5">
        <View className="w-8 h-8 rounded-full bg-[#3A2E1F] border border-[#E8C08A]/30 items-center justify-center mb-2">
          <Icon name="streak" size={16} color="#E8C08A" />
        </View>
        <Text className="text-2xl font-bold text-[#F5F2EC] mb-0.5" style={{ fontFamily: 'Baloo 2' }}>
          {displayCurrent} {displayCurrent === 1 ? 'day' : 'days'}
        </Text>
        <Text className="text-[11px] font-semibold text-[#9C958C] uppercase tracking-wider">
          Current Streak
        </Text>
      </View>

      {/* Best Streak Card */}
      <View className="flex-1 bg-[#181513] border border-[#2B2521] p-4 rounded-2xl items-center ml-1.5">
        <View className="w-8 h-8 rounded-full bg-[#3A2E1F] border border-[#E8C08A]/30 items-center justify-center mb-2">
          <Icon name="trophy" size={16} color="#E8C08A" />
        </View>
        <Text className="text-2xl font-bold text-[#F5F2EC] mb-0.5" style={{ fontFamily: 'Baloo 2' }}>
          {displayBest} {displayBest === 1 ? 'day' : 'days'}
        </Text>
        <Text className="text-[11px] font-semibold text-[#9C958C] uppercase tracking-wider">
          Best Streak
        </Text>
      </View>
    </View>
  );
};
