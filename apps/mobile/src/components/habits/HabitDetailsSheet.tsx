import React, { useState } from 'react';
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  TouchableWithoutFeedback,
  Alert,
} from 'react-native';
import { HabitResponse } from '@streak/contracts';
import { StreakApiClient } from '@streak/api-client';
import { Icon } from '../ui/Icon';
import { resolveHabitIcon } from '../../utils/habit-icons';
import { HabitStatsCard } from './HabitStatsCard';
import { HabitContributionGraph } from './HabitContributionGraph';
import { SelectedDayInfo } from './SelectedDayInfo';
import { ContributionState } from './ContributionDay';
import { FreezeSheet } from './FreezeSheet';
import { CreateHabitBottomSheet } from './CreateHabitBottomSheet';
import { CompletionButton } from './CompletionButton';
import { validateFreeze, checkAndRegenerateFreeze } from '../../utils/freeze';
import { isHabitScheduledForDate, normalizeToLocalMidnight, toLocalDateString } from '../../utils/streak';

interface HabitDetailsSheetProps {
  visible: boolean;
  habit: HabitResponse | null;
  apiClient: StreakApiClient;
  onClose: () => void;
  onDelete: (habitId: string) => Promise<void>;
  onUpdateHabit: (habitId: string, habitData: any) => Promise<void>;
  onFreezeHabit: (habitId: string, targetDate: string) => Promise<void>;
  onToggleComplete?: () => void;
}

export const HabitDetailsSheet: React.FC<HabitDetailsSheetProps> = ({
  visible,
  habit,
  apiClient,
  onClose,
  onDelete,
  onUpdateHabit,
  onFreezeHabit,
  onToggleComplete,
}) => {
  const [selectedDay, setSelectedDay] = useState<{
    dateStr: string;
    state: ContributionState;
  } | null>(null);
  const [showEditSheet, setShowEditSheet] = useState(false);
  const [showFreezeSheet, setShowFreezeSheet] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [updating, setUpdating] = useState(false);

  // Dynamically resolve selected day state if today is selected so it stays in sync upon completion toggle
  const todayStr = toLocalDateString(new Date());
  const selectedDayState = React.useMemo(() => {
    if (!selectedDay || !habit) return null;
    if (selectedDay.dateStr === todayStr) {
      const isCompleted = (habit as any).completedToday || (habit.checkIns || []).some((c) => c.localDate === todayStr && c.status !== 'FREEZE');
      if (isCompleted) return 'Completed';
      const isScheduled = isHabitScheduledForDate(habit, new Date());
      return isScheduled ? 'Missed' : 'Not scheduled';
    }
    return selectedDay.state;
  }, [selectedDay, habit, todayStr]);

  if (!visible || !habit) return null;

  const currentStreak = habit.stats?.currentStreak || 0;
  const bestStreak = habit.stats?.bestStreak || 0;
  const resolvedIcon = resolveHabitIcon(habit.name, habit.icon);

  // Format creation date from habit.createdAt
  const formatCreationDate = (dateStr?: string) => {
    if (!dateStr) return 'Recently';
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return 'Recently';
    return d.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  // Check Freeze eligibility per spec §5:
  // Rendered ONLY if both are true:
  // 1. availableFreezeCount > 0
  // 2. exists(day) where day.state === "Missed" AND day is within eligible lookback window (validateFreeze)
  const freezeAvailability = checkAndRegenerateFreeze(habit);
  const availableFreezeCount = freezeAvailability.freezeDaysAvailable;

  const checkHasEligibleMissedDay = (): boolean => {
    if (availableFreezeCount <= 0) return false;

    const todayMidnight = normalizeToLocalMidnight(new Date());
    const checkInsMap = new Set((habit.checkIns || []).map((c) => c.localDate));

    // Look back past 7 days to find an eligible missed day
    for (let i = 1; i <= 7; i++) {
      const pastDay = new Date(todayMidnight);
      pastDay.setDate(todayMidnight.getDate() - i);
      const pastStr = toLocalDateString(pastDay);

      if (
        isHabitScheduledForDate(habit, pastDay) &&
        !checkInsMap.has(pastStr)
      ) {
        const val = validateFreeze(habit, pastStr);
        if (val.valid) return true;
      }
    }
    return false;
  };

  const isFreezeEligible = checkHasEligibleMissedDay();

  const handleDelete = () => {
    Alert.alert(
      `Delete ${habit.name}?`,
      'This action cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            setDeleting(true);
            try {
              await onDelete(habit.id);
              onClose();
            } catch (e: any) {
              Alert.alert('Error', e.message || 'Failed to delete habit');
            } finally {
              setDeleting(false);
            }
          },
        },
      ]
    );
  };

  const handleUpdateHabit = async (updatedData: any) => {
    setUpdating(true);
    try {
      await onUpdateHabit(habit.id, updatedData);
      setShowEditSheet(false);
    } catch (e: any) {
      Alert.alert('Error', e.message || 'Failed to update habit');
    } finally {
      setUpdating(false);
    }
  };

  return (
    <>
      <Modal
        visible={visible && !showFreezeSheet && !showEditSheet}
        animationType="slide"
        transparent
        onRequestClose={onClose}
      >
        <View className="flex-1 justify-end">
          {/* Backdrop */}
          <TouchableWithoutFeedback onPress={onClose}>
            <View className="absolute inset-0 bg-black/60" />
          </TouchableWithoutFeedback>

          {/* Sheet Surface */}
          <View className="bg-[#141110] rounded-t-[28px] border-t border-[#2B2521] px-5 pt-3 pb-8 max-h-[90%]">
            {/* Drag Handle */}
            <View className="w-12 h-1 bg-[#2B2521] rounded-full self-center mb-3" />

            {/* Header with Trash & Close */}
            <View className="flex-row justify-between items-center mb-4">
              <TouchableOpacity onPress={handleDelete} disabled={deleting} className="p-2">
                <Icon name="trash" size={18} color="#E8899A" />
              </TouchableOpacity>

              <TouchableOpacity
                onPress={onClose}
                className="w-8 h-8 rounded-full bg-[#181513] border border-[#2B2521] items-center justify-center"
              >
                <Icon name="close" size={16} color="#9C958C" />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
              {/* Hero Section */}
              <View className="items-center mb-6">
                <View className="w-16 h-16 bg-[#3A2E1F] border border-[#E8C08A] rounded-full items-center justify-center mb-3">
                  <Icon name={resolvedIcon} size={28} color="#E8C08A" family="material" />
                </View>
                <View className="flex-row items-center justify-center mb-1">
                  <Text className="text-2xl font-bold text-[#F5F2EC] mr-2" style={{ fontFamily: 'Baloo 2' }}>
                    {habit.name}
                  </Text>
                  {onToggleComplete && (
                    <CompletionButton
                      status={(habit as any).completedToday ? 'completed' : 'pending'}
                      onPress={onToggleComplete}
                      size={26}
                    />
                  )}
                </View>
                <Text className="text-xs text-[#9C958C]">
                  Created on {formatCreationDate(habit.createdAt)}
                </Text>
              </View>

              {/* Progress Section (Streak Cards) */}
              <HabitStatsCard
                currentStreak={currentStreak}
                bestStreak={bestStreak}
              />

              {/* Habit History — Contribution Graph */}
              <Text className="text-[11px] font-bold text-[#65605A] uppercase tracking-wider mb-2">
                Contribution History
              </Text>
              <HabitContributionGraph
                habit={habit}
                selectedDate={selectedDay?.dateStr}
                onSelectDay={(day) => {
                  setSelectedDay({
                    dateStr: day.dateStr,
                    state: day.state,
                  });
                }}
              />

              {/* Inline Selected Day Info Panel */}
              <SelectedDayInfo
                dateStr={selectedDay?.dateStr}
                state={selectedDayState}
              />

              {/* Actions */}
              <View className="space-y-3 mt-4 mb-2">
                {/* Primary — Edit Habit */}
                <TouchableOpacity
                  onPress={() => setShowEditSheet(true)}
                  className="w-full py-3.5 bg-[#E8C08A] rounded-xl items-center justify-center flex-row"
                >
                  <Icon name="pencil" size={15} color="#241C14" className="mr-2" />
                  <Text className="text-sm font-bold text-[#241C14]">Edit Habit</Text>
                </TouchableOpacity>

                {/* Secondary — Use Freeze (Rendered ONLY if eligible) */}
                {isFreezeEligible && (
                  <TouchableOpacity
                    onPress={() => setShowFreezeSheet(true)}
                    className="w-full py-3.5 bg-[#112A38] border border-[#38BDF8]/40 rounded-xl items-center justify-center flex-row mt-2"
                  >
                    <Icon name="snowflake" size={15} color="#38BDF8" className="mr-2" />
                    <Text className="text-sm font-bold text-[#38BDF8]">Use Freeze</Text>
                  </TouchableOpacity>
                )}
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Nested Edit Habit Bottom Sheet */}
      {showEditSheet && (
        <CreateHabitBottomSheet
          visible={showEditSheet}
          onClose={() => setShowEditSheet(false)}
          onCreate={async () => {}}
          onUpdate={handleUpdateHabit}
          loading={updating}
          initialHabit={habit}
        />
      )}

      {/* Nested Freeze Sheet */}
      {showFreezeSheet && (
        <FreezeSheet
          visible={showFreezeSheet}
          habit={habit}
          availableCount={availableFreezeCount}
          onClose={() => setShowFreezeSheet(false)}
          onConfirmFreeze={async (dateStr) => {
            await onFreezeHabit(habit.id, dateStr);
          }}
        />
      )}
    </>
  );
};
