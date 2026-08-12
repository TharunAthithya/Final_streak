import React, { useEffect, useRef } from 'react';
import { View, Text, TouchableOpacity, Animated } from 'react-native';
import { RecentSessionsStrip, SessionStatus } from './RecentSessionsStrip';
import { CompletionButton } from './CompletionButton';
import { Icon } from '../ui/Icon';
import { resolveHabitIcon } from '../../utils/habit-icons';

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
  onCardPress?: () => void;
}

export const HabitCard: React.FC<HabitCardProps> = ({
  name,
  iconName,
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
  onCardPress,
}) => {
  const [confirmFreezeDate, setConfirmFreezeDate] = React.useState<string | null>(null);

  const isCompleted = completionStatus === 'completed';
  const activeFreezableDates = freezeDaysAvailable >= 1 ? freezableDates : [];
  const resolvedIcon = resolveHabitIcon(name, iconName);

  // Animated values
  const animScale = useRef(new Animated.Value(isCompleted ? 0.98 : 1)).current;
  const animOpacity = useRef(new Animated.Value(isCompleted ? 0.82 : 1)).current;
  const animHighlight = useRef(new Animated.Value(0)).current;
  const prevStatusRef = useRef(completionStatus);

  useEffect(() => {
    // Animate scale and opacity on status change
    Animated.parallel([
      Animated.timing(animScale, {
        toValue: isCompleted ? 0.98 : 1,
        duration: 250,
        useNativeDriver: false,
      }),
      Animated.timing(animOpacity, {
        toValue: isCompleted ? 0.82 : 1,
        duration: 250,
        useNativeDriver: false,
      }),
    ]).start();

    // Trigger 180ms highlight flash when completed
    if (prevStatusRef.current !== 'completed' && completionStatus === 'completed') {
      Animated.sequence([
        Animated.timing(animHighlight, {
          toValue: 1,
          duration: 40,
          useNativeDriver: false,
        }),
        Animated.timing(animHighlight, {
          toValue: 0,
          duration: 180,
          useNativeDriver: false,
        }),
      ]).start();
    }

    prevStatusRef.current = completionStatus;
  }, [completionStatus, isCompleted]);

  const borderColor = animHighlight.interpolate({
    inputRange: [0, 1],
    outputRange: ['#2B2521', '#E8C08A'],
  });

  return (
    <Animated.View
      style={{
        transform: [{ scale: animScale }],
        opacity: animOpacity,
        borderColor: borderColor,
      }}
      className="bg-[#181513] border rounded-2xl p-4 mb-3 flex-col"
    >
      <View className="flex-row justify-between items-center">
        <TouchableOpacity
          activeOpacity={onCardPress ? 0.7 : 1}
          onPress={onCardPress}
          className="flex-1 pr-3"
        >
          <View className="flex-row items-center mb-2">
            {/* Icon Container */}
            <View className="w-10 h-10 bg-[#221C16] rounded-xl justify-center items-center mr-3 border border-[#3A2E1F]">
              <Icon name={resolvedIcon} size={20} color="#E8C08A" family="material" />
            </View>
            <View className="flex-1">
              <Text
                numberOfLines={1}
                style={isCompleted ? { textDecorationLine: 'line-through' } : undefined}
                className={`text-base font-bold leading-tight ${isCompleted ? 'text-[#9C958C]' : 'text-[#F5F2EC]'}`}
              >
                {name}
              </Text>
              <View className="flex-row items-center mt-[3px] flex-wrap">
                {scheduleLabel && (
                  <View className="flex-row items-center mr-3">
                    <Icon name="calendar" size={13} color="#9C958C" className="mr-[4px]" />
                    <Text className="text-[13px] text-[#9C958C]">{scheduleLabel}</Text>
                  </View>
                )}
                {reminderTime && (
                  <View className="flex-row items-center mr-3">
                    <Icon name="clock" size={13} color="#9C958C" className="mr-[4px]" />
                    <Text className="text-[13px] text-[#9C958C]">{reminderTime}</Text>
                  </View>
                )}
                <View className="flex-row items-center mr-3">
                  <Icon name="streak" size={13} color="#E8C08A" className="mr-[4px]" />
                  <Text className="text-[13px] text-[#E8C08A] font-semibold">{currentStreak} days</Text>
                </View>
              </View>
            </View>
          </View>

          {/* History Strip */}
          <View className="mt-1 pl-[48px]">
            <RecentSessionsStrip
              statuses={statuses}
              dates={dates}
              freezableDates={activeFreezableDates}
              onPressDot={(dateStr) => setConfirmFreezeDate(dateStr)}
            />
          </View>
        </TouchableOpacity>

        {/* Completion Button */}
        <CompletionButton status={completionStatus} onPress={onToggleComplete} />
      </View>

      {confirmFreezeDate && (
        <View className="mt-3 ml-[48px] p-2 bg-[#221C16] border border-[#2B2521] rounded-lg flex-row justify-between items-center">
          <Text className="text-xs text-[#F5F2EC]">Freeze {confirmFreezeDate}?</Text>
          <View className="flex-row">
            <TouchableOpacity
              onPress={() => setConfirmFreezeDate(null)}
              className="px-2 py-1 mr-2"
            >
              <Text className="text-xs text-[#9C958C]">Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => {
                if (onFreeze) onFreeze(confirmFreezeDate);
                setConfirmFreezeDate(null);
              }}
              className="px-2 py-1 bg-[#8C6B3F] rounded"
            >
              <Text className="text-xs text-[#F5F2EC] font-semibold">Confirm</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}
    </Animated.View>
  );
};
