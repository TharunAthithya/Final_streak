import React, { useState, useEffect } from 'react';
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  ScrollView,
} from 'react-native';
import { HabitResponse } from '@streak/contracts';
import { StreakApiClient } from '@streak/api-client';
import { Icon } from '../ui/Icon';
import { resolveHabitIcon, AVAILABLE_HABIT_ICONS } from '../../utils/habit-icons';
import { SkeletonBox } from '../ui/SkeletonBox';
import { useNotice } from '../ui/Notice';
import { ConfirmDialog } from '../ui/ConfirmDialog';
import { useDelayedLoading } from '../../hooks/useDelayedLoading';

interface HabitDetailModalProps {
  visible: boolean;
  habit: HabitResponse | null;
  apiClient: StreakApiClient;
  onClose: () => void;
  onDelete: (habitId: string) => Promise<void>;
  onUpdateIcon: (habitId: string, iconName: string) => Promise<void>;
}

export const HabitDetailModal: React.FC<HabitDetailModalProps> = ({
  visible,
  habit,
  apiClient,
  onClose,
  onDelete,
  onUpdateIcon,
}) => {
  const notice = useNotice();
  const [currentMonthDate, setCurrentMonthDate] = useState(new Date());
  const [monthCheckIns, setMonthCheckIns] = useState<any[]>([]);
  const [loadingCheckIns, setLoadingCheckIns] = useState(false);
  const showCalendarSkeleton = useDelayedLoading(loadingCheckIns);
  const [showIconPicker, setShowIconPicker] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [currentIcon, setCurrentIcon] = useState<string | undefined>(habit?.icon);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  useEffect(() => {
    if (habit) {
      setCurrentIcon(habit.icon);
    }
  }, [habit?.id, habit?.icon]);

  const resolvedIcon = habit ? resolveHabitIcon(habit.name, currentIcon) : 'checkbox-marked-circle-outline';

  // Fetch check-ins for the selected month
  useEffect(() => {
    if (visible && habit) {
      fetchMonthlyCheckIns();
    }
  }, [visible, habit?.id, currentMonthDate]);

  if (!visible || !habit) return null;

  const fetchMonthlyCheckIns = async () => {
    setLoadingCheckIns(true);
    try {
      const checkIns = await apiClient.getHabitCheckIns(habit.id, 60);
      setMonthCheckIns(checkIns);
    } catch (e) {
      console.warn('Failed to fetch month check ins', e);
    } finally {
      setLoadingCheckIns(false);
    }
  };

  const handlePrevMonth = () => {
    const prev = new Date(currentMonthDate.getFullYear(), currentMonthDate.getMonth() - 1, 1);
    setCurrentMonthDate(prev);
  };

  const handleNextMonth = () => {
    const next = new Date(currentMonthDate.getFullYear(), currentMonthDate.getMonth() + 1, 1);
    setCurrentMonthDate(next);
  };

  const handleConfirmDelete = async () => {
    setShowDeleteConfirm(false);
    setDeleting(true);
    try {
      await onDelete(habit.id);
      notice.success('Habit deleted');
      onClose();
    } catch (e: any) {
      notice.error(e.message || 'Failed to delete habit');
    } finally {
      setDeleting(false);
    }
  };

  const handlePickIcon = async (iconName: string) => {
    try {
      setCurrentIcon(iconName);
      await onUpdateIcon(habit.id, iconName);
      setShowIconPicker(false);
      notice.success('Icon updated successfully!');
    } catch (e: any) {
      notice.error(e.message || 'Failed to update icon');
    }
  };

  // Generate days array for current month view
  const year = currentMonthDate.getFullYear();
  const month = currentMonthDate.getMonth();
  const monthName = currentMonthDate.toLocaleString('default', { month: 'long' });
  const firstDayOfWeek = new Date(year, month, 1).getDay(); // 0 = Sun
  const totalDaysInMonth = new Date(year, month + 1, 0).getDate();

  // Set of checked-in dates (YYYY-MM-DD)
  const checkedInDates = new Set(monthCheckIns.map((c) => c.localDate));

  // Days grid construction
  const gridCells: Array<{ dayNum?: number; dateStr?: string; isCompleted?: boolean }> = [];
  // Empty padding cells for start of month
  for (let i = 0; i < firstDayOfWeek; i++) {
    gridCells.push({});
  }
  // Days of month
  for (let d = 1; d <= totalDaysInMonth; d++) {
    const mStr = String(month + 1).padStart(2, '0');
    const dStr = String(d).padStart(2, '0');
    const dateStr = `${year}-${mStr}-${dStr}`;
    gridCells.push({
      dayNum: d,
      dateStr,
      isCompleted: checkedInDates.has(dateStr),
    });
  }

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent
      onRequestClose={onClose}
    >
      <View style={{ flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.6)' }}>
        <TouchableOpacity style={{ flex: 1 }} onPress={onClose} activeOpacity={1} />

        <View
          style={{
            backgroundColor: '#141110',
            borderTopLeftRadius: 28,
            borderTopRightRadius: 28,
            borderTopWidth: 1,
            borderLeftWidth: 1,
            borderRightWidth: 1,
            borderColor: '#2B2521',
            maxHeight: '90%',
            minHeight: 480,
          }}
          className="relative px-6 pt-3 pb-8"
        >
          {/* Drag Handle */}
          <View className="items-center pb-3">
            <View className="w-9 h-1 rounded-full bg-[#2B2521]" />
          </View>

          {/* Top Bar with Delete & Close */}
          <View className="flex-row justify-between items-center mb-4">
            <TouchableOpacity onPress={() => setShowDeleteConfirm(true)} className="p-2" disabled={deleting}>
              <Icon name="trash" size={18} color="#E8899A" />
            </TouchableOpacity>
            <TouchableOpacity onPress={onClose} className="w-8 h-8 rounded-full bg-[#221D1A] border border-[#2B2521] items-center justify-center">
              <Icon name="x" size={15} color="#9C958C" />
            </TouchableOpacity>
          </View>

          <ScrollView showsVerticalScrollIndicator={false} className="flex-1">
            {/* Hero Section */}
            <View className="items-center mb-6">
              <TouchableOpacity
                onPress={() => setShowIconPicker(!showIconPicker)}
                className="relative"
              >
                <View className="w-16 h-16 bg-[#221C16] border border-[#3A2E1F] rounded-2xl items-center justify-center mb-2">
                  <Icon name={resolvedIcon} size={30} color="#E8C08A" family="material" />
                </View>
                <View className="absolute bottom-1 right-0 bg-[#E8C08A] rounded-full p-1 border border-[#141110]">
                  <Icon name="pencil" size={10} color="#241C14" />
                </View>
              </TouchableOpacity>
              <Text className="text-xs text-[#9C958C]">Tap icon to change</Text>

              <Text className="text-xl font-bold text-[#F5F2EC] mt-2 mb-1" style={{ fontFamily: 'Baloo 2' }}>
                {habit.name}
              </Text>
              {habit.description ? (
                <Text className="text-xs text-[#9C958C] text-center px-4">{habit.description}</Text>
              ) : null}
            </View>

            {/* Icon Picker Grid */}
            {showIconPicker && (
              <View className="bg-[#181513] border border-[#2B2521] rounded-2xl p-4 mb-6">
                <Text className="text-xs font-semibold text-[#65605A] uppercase tracking-wider mb-3">
                  Choose Icon
                </Text>
                <View className="flex-row flex-wrap justify-between">
                  {AVAILABLE_HABIT_ICONS.slice(0, 15).map((iconObj) => (
                    <TouchableOpacity
                      key={iconObj.name}
                      onPress={() => handlePickIcon(iconObj.name)}
                      className={`w-11 h-11 rounded-xl items-center justify-center mb-2 border ${
                        currentIcon === iconObj.name
                          ? 'bg-[#221C16] border-[#E8C08A]'
                          : 'bg-[#141110] border-[#2B2521]'
                      }`}
                    >
                      <Icon name={iconObj.name} size={20} color="#E8C08A" family="material" />
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            )}

            {/* Calendar Section Header */}
            <View className="bg-[#181513] border border-[#2B2521] rounded-2xl p-4 mb-6">
              <View className="flex-row justify-between items-center mb-4">
                <Text className="text-xs font-semibold text-[#65605A] uppercase tracking-wider">
                  {monthName} {year}
                </Text>
                <View className="flex-row space-x-2">
                  <TouchableOpacity onPress={handlePrevMonth} className="p-1">
                    <Icon name="chevron-left" size={18} color="#9C958C" />
                  </TouchableOpacity>
                  <TouchableOpacity onPress={handleNextMonth} className="p-1">
                    <Icon name="chevron-right" size={18} color="#9C958C" />
                  </TouchableOpacity>
                </View>
              </View>

              {/* Day Headers */}
              <View className="flex-row justify-between mb-2">
                {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((d, i) => (
                  <View key={i} className="w-8 items-center">
                    <Text className="text-[11px] font-semibold text-[#65605A]">{d}</Text>
                  </View>
                ))}
              </View>

              {/* Days Grid */}
              {showCalendarSkeleton ? (
                <SkeletonBox width="100%" height={120} borderRadius={12} className="my-2" />
              ) : (
                <View className="flex-row flex-wrap justify-between">
                  {gridCells.map((cell, idx) => {
                    if (!cell.dayNum) {
                      return <View key={idx} className="w-8 h-8 mb-2" />;
                    }
                    return (
                      <View
                        key={idx}
                        className={`w-8 h-8 rounded-full items-center justify-center mb-2 ${
                          cell.isCompleted
                            ? 'bg-[#E8C08A]'
                            : 'bg-[#221C16] border border-[#2B2521]'
                        }`}
                      >
                        <Text
                          className={`text-xs font-semibold ${
                            cell.isCompleted ? 'text-[#241C14]' : 'text-[#9C958C]'
                          }`}
                        >
                          {cell.dayNum}
                        </Text>
                      </View>
                    );
                  })}
                </View>
              )}
            </View>
          </ScrollView>
        </View>
      </View>

      <ConfirmDialog
        visible={showDeleteConfirm}
        title="Delete Habit"
        message={`Are you sure you want to delete "${habit.name}"? This action cannot be undone.`}
        confirmLabel="Delete"
        destructive
        onConfirm={handleConfirmDelete}
        onCancel={() => setShowDeleteConfirm(false)}
      />
    </Modal>
  );
};
