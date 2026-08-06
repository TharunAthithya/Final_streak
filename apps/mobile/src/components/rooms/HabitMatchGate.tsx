import React, { useState } from 'react';
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  Alert,
} from 'react-native';
import { Icon } from '../ui/Icon';
import { HabitResponse } from '@streak/contracts';
import { CreateHabitBottomSheet } from '../habits/CreateHabitBottomSheet';
import { useHabitStore } from '../../store/habit-store';
import { StreakApiClient } from '@streak/api-client';

export interface RoomTrackedHabit {
  id?: string;
  name: string;
  description?: string | null;
}

interface HabitMatchGateProps {
  visible: boolean;
  roomName: string;
  trackedHabits: RoomTrackedHabit[];
  userHabits: HabitResponse[];
  apiClient: StreakApiClient;
  onClose: () => void;
  onCompleteJoin: () => Promise<void>;
}

export const HabitMatchGate: React.FC<HabitMatchGateProps> = ({
  visible,
  roomName,
  trackedHabits,
  userHabits,
  apiClient,
  onClose,
  onCompleteJoin,
}) => {
  const { createHabit, fetchHabits } = useHabitStore();
  const [creatingHabitName, setCreatingHabitName] = useState<string | null>(null);
  const [isJoining, setIsJoining] = useState(false);

  if (!visible) return null;

  // Check which room habits the user currently owns
  const userHabitNames = userHabits.map((h) => h.name.toLowerCase().trim());

  const matchedStatus = trackedHabits.map((th) => {
    const isMatched = userHabitNames.includes(th.name.toLowerCase().trim());
    return {
      ...th,
      isMatched,
    };
  });

  const allMatched = matchedStatus.every((s) => s.isMatched);
  const missingCount = matchedStatus.filter((s) => !s.isMatched).length;

  const handleCreateMissingHabit = async (habitData: {
    name: string;
    description?: string;
    icon: string;
    scheduleType: 'DAILY' | 'SPECIFIC_DAYS';
    daysOfWeek?: number[];
  }) => {
    try {
      const todayStr = new Date().toISOString().split('T')[0];
      await createHabit(apiClient, {
        name: habitData.name.trim(),
        description: habitData.description?.trim() || undefined,
        icon: habitData.icon,
        scheduleType: habitData.scheduleType,
        daysOfWeek: habitData.scheduleType === 'SPECIFIC_DAYS' ? habitData.daysOfWeek : undefined,
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC',
        startDate: todayStr,
      });
      await fetchHabits(apiClient);
      setCreatingHabitName(null);
    } catch (e: any) {
      Alert.alert('Habit Creation Error', e.message || 'Failed to create habit');
    }
  };

  const handleProceed = async () => {
    if (!allMatched) {
      Alert.alert('Missing Habits', 'Please create all required habits before joining this room.');
      return;
    }
    setIsJoining(true);
    try {
      await onCompleteJoin();
      onClose();
    } catch (e: any) {
      Alert.alert('Join Error', e.message || 'Failed to join room');
    } finally {
      setIsJoining(false);
    }
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent
      onRequestClose={onClose}
    >
      <View style={{ flex: 1, backgroundColor: 'rgba(0, 0, 0, 0.85)' }} className="justify-end">
        <View className="bg-[#141110] border-t border-[#2B2521] rounded-t-3xl p-6 max-h-[85%]">
          {/* Header */}
          <View className="flex-row justify-between items-start pb-4 border-b border-[#2B2521] mb-4">
            <View className="flex-1 pr-3">
              <Text className="text-xs font-bold text-[#E8C08A] uppercase tracking-wider mb-1">
                HABIT MATCHING REQUIRED
              </Text>
              <Text className="text-xl font-bold text-[#F5F2EC]" style={{ fontFamily: 'Baloo 2' }}>
                {roomName}
              </Text>
              <Text className="text-xs text-[#9C958C] mt-1">
                To join this room, you must track the following habits in your personal list.
              </Text>
            </View>
            <TouchableOpacity
              onPress={onClose}
              className="w-8 h-8 rounded-full bg-[#181513] border border-[#2B2521] items-center justify-center"
            >
              <Icon name="close" size={16} color="#9C958C" />
            </TouchableOpacity>
          </View>

          {/* Checklist of Room Habits */}
          <ScrollView showsVerticalScrollIndicator={false} className="mb-4">
            {matchedStatus.map((item, idx) => (
              <View
                key={item.id || idx}
                className={`p-4 rounded-2xl border mb-3 flex-row items-center justify-between ${
                  item.isMatched
                    ? 'bg-[#181513] border-[#2E3B2F]'
                    : 'bg-[#1F1715] border-[#3B2521]'
                }`}
              >
                <View className="flex-row items-center flex-1 pr-3">
                  <View
                    className={`w-9 h-9 rounded-xl items-center justify-center mr-3 ${
                      item.isMatched ? 'bg-[#1E2E20]' : 'bg-[#3A1E1A]'
                    }`}
                  >
                    <Icon
                      name={item.isMatched ? 'check' : 'alert-circle'}
                      size={18}
                      color={item.isMatched ? '#4ADE80' : '#F87171'}
                    />
                  </View>

                  <View className="flex-1">
                    <Text className="text-sm font-bold text-[#F5F2EC]">{item.name}</Text>
                    <Text
                      className={`text-xs ${
                        item.isMatched ? 'text-[#4ADE80]' : 'text-[#F87171]'
                      }`}
                    >
                      {item.isMatched ? '✓ Personal habit matched' : '✗ Habit missing from your list'}
                    </Text>
                  </View>
                </View>

                {!item.isMatched && (
                  <TouchableOpacity
                    onPress={() => setCreatingHabitName(item.name)}
                    className="bg-[#E8C08A] px-3 py-1.5 rounded-xl flex-row items-center"
                  >
                    <Icon name="plus" size={12} color="#241C14" className="mr-1" />
                    <Text className="text-xs font-bold text-[#241C14]">Create</Text>
                  </TouchableOpacity>
                )}
              </View>
            ))}
          </ScrollView>

          {/* Summary Banner */}
          <View className="bg-[#181513] border border-[#2B2521] p-3 rounded-xl mb-5 flex-row items-center justify-between">
            <Text className="text-xs text-[#9C958C]">
              {allMatched
                ? 'All required habits matched!'
                : `${missingCount} habit${missingCount > 1 ? 's' : ''} remaining to create`}
            </Text>
            <View
              className={`w-2.5 h-2.5 rounded-full ${
                allMatched ? 'bg-[#4ADE80]' : 'bg-[#F87171]'
              }`}
            />
          </View>

          {/* Action Buttons */}
          <View className="flex-row gap-3">
            <TouchableOpacity
              onPress={onClose}
              className="flex-1 py-3.5 bg-[#181513] border border-[#2B2521] rounded-2xl items-center"
            >
              <Text className="text-sm font-semibold text-[#9C958C]">Decline / Cancel</Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={handleProceed}
              disabled={!allMatched || isJoining}
              className={`flex-1 py-3.5 rounded-2xl items-center justify-center ${
                allMatched && !isJoining
                  ? 'bg-[#E8C08A]'
                  : 'bg-[#2B2521] opacity-50'
              }`}
            >
              <Text className="text-sm font-bold text-[#241C14]">
                {isJoining ? 'Joining...' : 'Accept & Join'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>

      {/* Inline Habit Creation Sheet */}
      {creatingHabitName && (
        <CreateHabitBottomSheet
          visible={!!creatingHabitName}
          onClose={() => setCreatingHabitName(null)}
          onCreate={handleCreateMissingHabit}
          loading={false}
        />
      )}
    </Modal>
  );
};
