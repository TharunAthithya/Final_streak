import React, { useState } from 'react';
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  TouchableWithoutFeedback,
} from 'react-native';
import { HabitResponse } from '@streak/contracts';
import { Icon } from '../ui/Icon';
import { HabitStatsCard } from './HabitStatsCard';
import { HabitContributionGraph } from './HabitContributionGraph';
import { FreezeConfirmationCard } from './FreezeConfirmationCard';
import { calculateGlobalStreak } from '../../utils/streak';
import { useNotice } from '../ui/Notice';

interface FreezeSheetProps {
  visible: boolean;
  habit: HabitResponse;
  availableCount: number;
  onClose: () => void;
  onConfirmFreeze: (targetDateStr: string) => Promise<void>;
}

export const FreezeSheet: React.FC<FreezeSheetProps> = ({
  visible,
  habit,
  availableCount,
  onClose,
  onConfirmFreeze,
}) => {
  const notice = useNotice();
  const [selectedMissedDate, setSelectedMissedDate] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  if (!visible) return null;

  const currentStreak = habit.stats?.currentStreak || 0;
  const bestStreak = habit.stats?.bestStreak || 0;

  // Local-only preview streak computation when a missed date is selected
  let previewCurrentStreak = currentStreak;
  let previewBestStreak = bestStreak;

  if (selectedMissedDate) {
    const previewHabit: HabitResponse = {
      ...habit,
      checkIns: [
        ...(habit.checkIns || []),
        { id: 'preview-freeze', localDate: selectedMissedDate, status: 'FREEZE' as any },
      ],
    };
    previewCurrentStreak = calculateGlobalStreak([previewHabit]);
    previewBestStreak = Math.max(bestStreak, previewCurrentStreak);
  }

  const handleConfirm = async () => {
    if (!selectedMissedDate) return;
    setLoading(true);
    try {
      await onConfirmFreeze(selectedMissedDate);
      setSelectedMissedDate(null);
      notice.success('Freeze applied successfully!');
      setTimeout(() => {
        onClose();
      }, 300);
    } catch (e: any) {
      notice.error(e.message || 'Failed to apply freeze');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent
      onRequestClose={onClose}
    >
      <View className="flex-1 justify-end">
        {/* Backdrop */}
        <TouchableWithoutFeedback onPress={onClose}>
          <View className="absolute inset-0 bg-black/70" />
        </TouchableWithoutFeedback>

        {/* Sheet Surface */}
        <View className="bg-[#141110] rounded-t-[28px] border-t border-[#2B2521] px-5 pt-3 pb-8 max-h-[85%]">
          {/* Drag Handle */}
          <View className="w-12 h-1 bg-[#2B2521] rounded-full self-center mb-4" />

          {/* Header */}
          <View className="flex-row justify-between items-center mb-6">
            <View>
              <Text className="text-2xl font-bold text-[#F5F2EC]" style={{ fontFamily: 'Baloo 2' }}>
                Use Freeze
              </Text>
              <Text className="text-xs text-[#9C958C]">
                {habit.name} • {availableCount} {availableCount === 1 ? 'freeze' : 'freezes'} available
              </Text>
            </View>

            <TouchableOpacity
              onPress={onClose}
              className="w-8 h-8 rounded-full bg-[#181513] border border-[#2B2521] items-center justify-center"
            >
              <Icon name="close" size={16} color="#9C958C" />
            </TouchableOpacity>
          </View>

          <ScrollView showsVerticalScrollIndicator={false}>
            {/* Live Preview Stats Cards */}
            <HabitStatsCard
              currentStreak={currentStreak}
              bestStreak={bestStreak}
              previewCurrentStreak={previewCurrentStreak}
              previewBestStreak={previewBestStreak}
              isLivePreview={!!selectedMissedDate}
            />

            {/* Instruction */}
            <Text className="text-[11px] font-bold text-[#9C958C] uppercase tracking-wider mb-2">
              Select an eligible missed day to restore your streak.
            </Text>

            {/* Contribution Graph (Selectable mode strictly restricted to Missed cells) */}
            <HabitContributionGraph
              habit={habit}
              selectableStates={['Missed']}
              selectedDate={selectedMissedDate}
              onSelectDay={(day) => {
                if (day.state === 'Missed') {
                  setSelectedMissedDate(day.dateStr);
                }
              }}
            />

            {/* Bottom Confirmation Card (Appears when a missed date is selected) */}
            {selectedMissedDate && (
              <FreezeConfirmationCard
                selectedDateStr={selectedMissedDate}
                onCancel={() => setSelectedMissedDate(null)}
                onConfirm={handleConfirm}
                loading={loading}
              />
            )}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
};
