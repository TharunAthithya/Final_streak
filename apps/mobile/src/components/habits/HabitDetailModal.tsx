import React, { useState, useEffect } from 'react';
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { HabitResponse } from '@streak/contracts';
import { StreakApiClient } from '@streak/api-client';
import { Icon } from '../ui/Icon';
import { resolveHabitIcon, AVAILABLE_HABIT_ICONS } from '../../utils/habit-icons';

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
  const [currentMonthDate, setCurrentMonthDate] = useState(new Date());
  const [monthCheckIns, setMonthCheckIns] = useState<any[]>([]);
  const [loadingCheckIns, setLoadingCheckIns] = useState(false);
  const [showIconPicker, setShowIconPicker] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [currentIcon, setCurrentIcon] = useState<string | undefined>(habit?.icon);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

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

  const handleDelete = () => {
    Alert.alert(
      'Delete Habit',
      `Are you sure you want to delete "${habit.name}"? This action cannot be undone.`,
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

  const handlePickIcon = async (iconName: string) => {
    try {
      setCurrentIcon(iconName);
      await onUpdateIcon(habit.id, iconName);
      setShowIconPicker(false);
      setToastMessage('Icon updated successfully!');
      setTimeout(() => setToastMessage(null), 2500);
    } catch (e: any) {
      Alert.alert('Error', e.message || 'Failed to update icon');
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
            <TouchableOpacity onPress={handleDelete} className="p-2" disabled={deleting}>
              <Icon name="trash" size={18} color="#E8899A" />
            </TouchableOpacity>
            <TouchableOpacity onPress={onClose} className="w-8 h-8 rounded-full bg-[#221D1A] border border-[#2B2521] items-center justify-center">
              <Icon name="x" size={15} color="#9C958C" />
            </TouchableOpacity>
          </View>

          <ScrollView showsVerticalScrollIndicator={false} className="flex-1">
            {/* Toast Message Banner */}
            {toastMessage && (
              <View className="mb-4 p-3 bg-[#1D1712] border border-[#E8C08A]/40 rounded-xl flex-row items-center justify-between">
                <View className="flex-row items-center">
                  <Icon name="check" size={16} color="#E8C08A" className="mr-2" />
                  <Text className="text-xs font-semibold text-[#E8C08A]">{toastMessage}</Text>
                </View>
              </View>
            )}

            {/* Header / Icon / Title */}
            <View className="items-center mb-6">
              <TouchableOpacity
                onPress={() => setShowIconPicker(!showIconPicker)}
                className="w-16 h-16 bg-[#221C16] border border-[#3A2E1F] rounded-2xl items-center justify-center mb-3 relative"
              >
                <Icon name={resolvedIcon} size={28} color="#E8C08A" family="material" />
                <View className="absolute -bottom-1 -right-1 bg-[#E8C08A] w-5 h-5 rounded-full items-center justify-center">
                  <Icon name="pencil" size={10} color="#241C14" />
                </View>
              </TouchableOpacity>
              <Text className="text-2xl font-bold text-[#F5F2EC] mb-1">{habit.name}</Text>
              <Text className="text-xs text-[#9C958C]">Tap icon to change avatar</Text>
            </View>

            {/* Icon Picker Accordion */}
            {showIconPicker && (
              <View className="bg-[#181513] border border-[#2B2521] p-4 rounded-2xl mb-6">
                <Text className="text-xs font-bold text-[#65605A] uppercase tracking-widest mb-3">
                  CHOOSE HABIT ICON
                </Text>
                <View className="flex-row flex-wrap justify-between">
                  {AVAILABLE_HABIT_ICONS.map((iconItem: { name: string; label: string }) => {
                    const isSelected = resolvedIcon === iconItem.name;
                    return (
                      <TouchableOpacity
                        key={iconItem.name}
                        onPress={() => handlePickIcon(iconItem.name)}
                        className={`w-11 h-11 rounded-xl items-center justify-center mb-2.5 ${
                          isSelected ? 'bg-[#3A2E1F] border border-[#E8C08A]' : 'bg-[#221C16]'
                        }`}
                      >
                        <Icon name={iconItem.name} size={20} color={isSelected ? '#E8C08A' : '#9C958C'} family="material" />
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>
            )}

            {/* Stats Overview Grid */}
            <View className="flex-row space-x-3 mb-6">
              <View className="flex-1 bg-[#181513] border border-[#2B2521] p-4 rounded-2xl items-center mr-1.5">
                <Icon name="streak" size={18} color="#E8C08A" className="mb-1" />
                <Text className="text-xl font-bold text-[#F5F2EC]">{habit.stats?.currentStreak || 0}</Text>
                <Text className="text-[11px] text-[#9C958C]">Current Streak</Text>
              </View>
              <View className="flex-1 bg-[#181513] border border-[#2B2521] p-4 rounded-2xl items-center mx-1.5">
                <Icon name="trophy" size={18} color="#E8C08A" className="mb-1" />
                <Text className="text-xl font-bold text-[#F5F2EC]">{habit.stats?.bestStreak || 0}</Text>
                <Text className="text-[11px] text-[#9C958C]">Best Streak</Text>
              </View>
              <View className="flex-1 bg-[#181513] border border-[#2B2521] p-4 rounded-2xl items-center ml-1.5">
                <Icon name="check" size={18} color="#E8C08A" className="mb-1" />
                <Text className="text-xl font-bold text-[#F5F2EC]">{habit.stats?.totalCompletions || 0}</Text>
                <Text className="text-[11px] text-[#9C958C]">Total Reps</Text>
              </View>
            </View>

            {/* Monthly Progress Calendar Grid */}
            <View className="bg-[#181513] border border-[#2B2521] p-5 rounded-2xl mb-8">
              {/* Month Header */}
              <View className="flex-row justify-between items-center mb-4">
                <TouchableOpacity onPress={handlePrevMonth} className="p-1">
                  <Icon name="chevron-left" size={18} color="#9C958C" />
                </TouchableOpacity>
                <Text className="text-sm font-bold text-[#F5F2EC]">
                  {monthName} {year}
                </Text>
                <TouchableOpacity onPress={handleNextMonth} className="p-1">
                  <Icon name="chevron-right" size={18} color="#9C958C" />
                </TouchableOpacity>
              </View>

              {/* Day Name Headers */}
              <View className="flex-row justify-between mb-2">
                {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((d, i) => (
                  <View key={i} className="w-8 items-center">
                    <Text className="text-[11px] font-semibold text-[#65605A]">{d}</Text>
                  </View>
                ))}
              </View>

              {/* Days Grid */}
              {loadingCheckIns ? (
                <ActivityIndicator size="small" color="#E8C08A" className="my-6" />
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
    </Modal>
  );
};
