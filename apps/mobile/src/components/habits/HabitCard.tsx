import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
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
  freezeDaysAvailable?: number;
  dates?: string[];
  freezableDates?: string[];
  onFreeze?: (targetDate: string) => void;
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
  freezeDaysAvailable = 0,
  dates = [],
  freezableDates = [],
  onFreeze,
}) => {
  const [confirmFreezeDate, setConfirmFreezeDate] = React.useState<string | null>(null);

  // Active freezable dates only if user has freeze days available
  const activeFreezableDates = freezeDaysAvailable >= 1 ? freezableDates : [];

  return (
    <View className="bg-premiumSurface border border-[#2B2723] rounded-2xl p-md mb-md flex-col">
      <View className="flex-row justify-between items-center">
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
                    <Icon name="calendar" size={13} color="#8A8276" className="mr-[4px]" />
                    <Text className="text-[13px] text-premiumTextMuted">{scheduleLabel}</Text>
                  </View>
                )}
                {reminderTime && (
                  <View className="flex-row items-center mr-md">
                    <Icon name="clock" size={13} color="#8A8276" className="mr-[4px]" />
                    <Text className="text-[13px] text-premiumTextMuted">{reminderTime}</Text>
                  </View>
                )}
                <View className="flex-row items-center mr-md">
                  <Icon name="streak" size={13} color="#C5A880" className="mr-[4px]" />
                  <Text className="text-[13px] text-[#C5A880] font-semibold">{currentStreak} days</Text>
                </View>
              </View>
            </View>
          </View>

          {/* History Strip */}
          <View className="mt-sm pl-[48px]">
            <RecentSessionsStrip
              statuses={statuses}
              dates={dates}
              freezableDates={activeFreezableDates}
              onPressDot={(dateStr) => setConfirmFreezeDate(dateStr)}
            />
          </View>
        </View>

        {/* Completion Button */}
        <CompletionButton status={completionStatus} onPress={onToggleComplete} />
      </View>

      {confirmFreezeDate && (
        <View className="mt-md ml-[48px] p-2 bg-[#2C2723] border border-[#3E3831] rounded-lg flex-row justify-between items-center">
          <Text className="text-xs text-white">Freeze {confirmFreezeDate}?</Text>
          <View className="flex-row">
            <TouchableOpacity
              onPress={() => setConfirmFreezeDate(null)}
              className="px-2 py-1 mr-2"
            >
              <Text className="text-xs text-premiumTextMuted">Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => {
                if (onFreeze) onFreeze(confirmFreezeDate);
                setConfirmFreezeDate(null);
              }}
              className="px-2 py-1 bg-slate-700 rounded"
            >
              <Text className="text-xs text-white font-semibold">Confirm</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}
    </View>
  );
};
