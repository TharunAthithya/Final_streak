import React from 'react';
import { View, Text } from 'react-native';
import { RecentSessionsStrip, SessionStatus } from './RecentSessionsStrip';
import { CompletionButton } from './CompletionButton';
import { Icon } from '../ui/Icon';

interface HabitCardProps {
  name: string;
  iconName?: string;
  reminderTime?: string | null;
  scheduleLabel?: string;
  currentStreak: number;
  statuses: SessionStatus[];
  completionStatus: 'pending' | 'completed' | 'disabled';
  onToggleComplete: () => void;
}

export const HabitCard: React.FC<HabitCardProps> = ({
  name,
  iconName = 'habit',
  reminderTime,
  scheduleLabel,
  currentStreak,
  statuses,
  completionStatus,
  onToggleComplete,
}) => {
  return (
    <View className="bg-premiumSurface border border-[#2B2723] rounded-2xl p-md mb-md flex-row justify-between items-center">
      <View className="flex-1 pr-md">
        <View className="flex-row items-center mb-sm">
          {/* Icon Container */}
          <View className="w-10 h-10 bg-[#2C2723] rounded-xl justify-center items-center mr-md border border-[#3E3831]">
            <Icon name={iconName} size={18} color="#C5A880" />
          </View>
          <View className="flex-1">
            <Text className="text-lg font-semibold text-white leading-tight truncate">{name}</Text>
            <View className="flex-row items-center mt-[3px] flex-wrap">
              {scheduleLabel && (
                <View className="flex-row items-center mr-md">
                  <Text className="text-[13px] text-premiumTextMuted mr-[3px]">📅</Text>
                  <Text className="text-[13px] text-premiumTextMuted">{scheduleLabel}</Text>
                </View>
              )}
              {reminderTime ? (
                <View className="flex-row items-center mr-md">
                  <Text className="text-[13px] text-premiumTextMuted mr-[3px]">🕒</Text>
                  <Text className="text-[13px] text-premiumTextMuted">{reminderTime}</Text>
                </View>
              ) : (
                <View className="flex-row items-center mr-md">
                  <Text className="text-[13px] text-premiumTextMuted mr-[3px]">🕒</Text>
                  <Text className="text-[13px] text-premiumTextMuted">All day</Text>
                </View>
              )}
              <View className="flex-row items-center">
                <Text className="text-[13px] text-[#C5A880] mr-[3px]">🔥</Text>
                <Text className="text-[13px] text-[#C5A880] font-semibold">{currentStreak} days</Text>
              </View>
            </View>
          </View>
        </View>

        {/* History Strip */}
        <View className="mt-sm pl-[48px]">
          <RecentSessionsStrip statuses={statuses} />
        </View>
      </View>

      {/* Completion Button */}
      <CompletionButton status={completionStatus} onPress={onToggleComplete} />
    </View>
  );
};
