import React, { useState, useEffect } from 'react';
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  TextInput,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  TouchableWithoutFeedback,
  Keyboard,
  Alert,
} from 'react-native';
import { Icon } from '../ui/Icon';
import { RecentSessionsStrip } from './RecentSessionsStrip';
import { CompletionButton } from './CompletionButton';
import { AVAILABLE_HABIT_ICONS, resolveHabitIcon } from '../../utils/habit-icons';

import { HabitResponse } from '@streak/contracts';

interface CreateHabitBottomSheetProps {
  visible: boolean;
  onClose: () => void;
  onCreate: (habitData: {
    name: string;
    description?: string;
    icon: string;
    scheduleType: 'DAILY' | 'SPECIFIC_DAYS';
    daysOfWeek?: number[];
  }) => Promise<void>;
  loading: boolean;
  initialHabit?: HabitResponse | null;
  onUpdate?: (habitData: {
    name: string;
    description?: string;
    icon: string;
    scheduleType: 'DAILY' | 'SPECIFIC_DAYS';
    daysOfWeek?: number[];
  }) => Promise<void>;
}

export const CreateHabitBottomSheet: React.FC<CreateHabitBottomSheetProps> = ({
  visible,
  onClose,
  onCreate,
  loading,
  initialHabit,
  onUpdate,
}) => {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [selectedIcon, setSelectedIcon] = useState('target');
  const [scheduleType, setScheduleType] = useState<'DAILY' | 'SPECIFIC_DAYS'>('DAILY');
  const [selectedDays, setSelectedDays] = useState<number[]>([1, 2, 3, 4, 5]); // Mon-Fri default
  const [nameError, setNameError] = useState('');
  const [touchedName, setTouchedName] = useState(false);

  // Pre-populate when initialHabit is provided
  useEffect(() => {
    if (visible) {
      if (initialHabit) {
        setName(initialHabit.name || '');
        setDescription(initialHabit.description || '');
        setSelectedIcon(initialHabit.icon || 'target');
        setScheduleType((initialHabit.scheduleType as any) || 'DAILY');
        setSelectedDays((initialHabit as any).daysOfWeek || [1, 2, 3, 4, 5]);
      } else {
        setName('');
        setDescription('');
        setSelectedIcon('target');
        setScheduleType('DAILY');
        setSelectedDays([1, 2, 3, 4, 5]);
      }
      setTouchedName(false);
      setNameError('');
    }
  }, [visible, initialHabit]);

  // Group icons by category
  const groupedIcons = AVAILABLE_HABIT_ICONS.reduce<Record<string, typeof AVAILABLE_HABIT_ICONS>>((acc, icon) => {
    const category = icon.category || 'Other';
    if (!acc[category]) {
      acc[category] = [];
    }
    acc[category].push(icon);
    return acc;
  }, {});

  // Auto-resolve icon when user types to suggest, but allow manual override
  useEffect(() => {
    if (name.trim()) {
      const resolved = resolveHabitIcon(name.trim());
      // Only set if user hasn't explicitly chosen a non-default icon,
      // or if they are just beginning to type
      if (selectedIcon === 'target' || AVAILABLE_HABIT_ICONS.some(i => i.name === selectedIcon && name.toLowerCase().includes(i.label.toLowerCase()))) {
        setSelectedIcon(resolved);
      }
    }
  }, [name]);

  // Validation checks
  useEffect(() => {
    if (touchedName) {
      if (!name.trim()) {
        setNameError('Give your habit a name.');
      } else {
        setNameError('');
      }
    }
  }, [name, touchedName]);

  const toggleDaySelection = (dayIndex: number) => {
    setSelectedDays((prev) => {
      if (prev.includes(dayIndex)) {
        if (prev.length === 1) {
          // Prevent zero selected weekdays
          Alert.alert('Scheduling Error', 'At least one day must be scheduled.');
          return prev;
        }
        return prev.filter((d) => d !== dayIndex);
      } else {
        return [...prev, dayIndex].sort();
      }
    });
  };

  const handleCreate = async () => {
    setTouchedName(true);
    if (!name.trim()) {
      setNameError('Give your habit a name.');
      return;
    }
    if (scheduleType === 'SPECIFIC_DAYS' && selectedDays.length === 0) {
      Alert.alert('Scheduling Error', 'Please select at least one day.');
      return;
    }

    try {
      if (initialHabit && onUpdate) {
        await onUpdate({
          name: name.trim(),
          description: description.trim() || undefined,
          icon: selectedIcon,
          scheduleType,
          daysOfWeek: scheduleType === 'SPECIFIC_DAYS' ? selectedDays : undefined,
        });
      } else {
        await onCreate({
          name: name.trim(),
          description: description.trim() || undefined,
          icon: selectedIcon,
          scheduleType,
          daysOfWeek: scheduleType === 'SPECIFIC_DAYS' ? selectedDays : undefined,
        });
      }
      // Reset form
      setName('');
      setDescription('');
      setSelectedIcon('target');
      setScheduleType('DAILY');
      setSelectedDays([1, 2, 3, 4, 5]);
      setTouchedName(false);
    } catch (e: any) {
      // Alert handled parent-side
    }
  };

  // Generate schedule label for the live preview
  const getPreviewScheduleLabel = () => {
    if (scheduleType === 'DAILY') {
      return 'Every Day';
    }
    if (selectedDays.length === 7) {
      return 'Every Day';
    }
    if (selectedDays.length === 5 && !selectedDays.includes(0) && !selectedDays.includes(6)) {
      return 'Weekdays';
    }
    if (selectedDays.length === 2 && selectedDays.includes(0) && selectedDays.includes(6)) {
      return 'Weekends';
    }
    const weekdayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    return selectedDays.map((d) => weekdayNames[d]).join(', ');
  };

  const isFormValid = name.trim().length > 0 && (scheduleType === 'DAILY' || selectedDays.length > 0);

  // Pad RecentSessionsStrip for live preview
  const dummyStatuses = Array(14).fill('pending');

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={true}
      onRequestClose={onClose}
    >
      <View className="flex-1 justify-end">
        {/* Absolute Backdrop overlay */}
        <TouchableWithoutFeedback onPress={() => {
          Keyboard.dismiss();
          onClose();
        }}>
          <View className="absolute inset-0 bg-black/60" />
        </TouchableWithoutFeedback>

        {/* Keyboard avoiding bottom sheet */}
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          className="w-full"
        >
          {/* Safe Area Wrapper for bottom sheet style */}
          <View className="bg-[#141110] rounded-t-[28px] border-t border-[#2B2521] px-5 pt-3 pb-8 max-h-[85%]">
            
            {/* Drag Handle */}
            <View className="w-12 h-1 bg-[#2B2521] rounded-full self-center mb-5" />

            {/* Close Button */}
            <TouchableOpacity
              onPress={onClose}
              className="absolute top-5 right-5 w-8 h-8 bg-[#181513] border border-[#2B2521] rounded-full items-center justify-center z-10"
            >
              <Icon name="close" size={16} color="#9C958C" />
            </TouchableOpacity>

            <ScrollView
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
              contentContainerStyle={{ paddingBottom: 20 }}
            >
              {/* Header */}
              <View className="mb-6">
                <Text className="text-3xl font-bold text-[#F5F2EC] tracking-tight mb-1" style={{ fontFamily: 'Baloo 2' }}>
                  {initialHabit ? 'Edit Habit' : 'New Habit'}
                </Text>
                <Text className="text-sm text-[#9C958C] font-medium">
                  {initialHabit ? 'Refine your habit commitment.' : "Make a promise you'll want to keep."}
                </Text>
              </View>

              {/* Live Habit Preview */}
              <Text className="text-[11px] font-bold text-[#65605A] uppercase tracking-wider mb-2">
                Live Preview
              </Text>
              <View className="bg-[#181513] border border-[#2B2521] rounded-2xl p-4 mb-6 flex-col opacity-90">
                <View className="flex-row justify-between items-center">
                  <View className="flex-1 pr-3">
                    <View className="flex-row items-center mb-2">
                      {/* Icon Container */}
                      <View className="w-10 h-10 bg-[#221C16] rounded-xl justify-center items-center mr-3 border border-[#3A2E1F]">
                        <Icon name={selectedIcon} size={20} color="#E8C08A" family="material" />
                      </View>
                      <View className="flex-1">
                        <Text numberOfLines={1} className="text-base font-bold text-[#F5F2EC] leading-tight">
                          {name.trim() || 'New Habit'}
                        </Text>
                        <View className="flex-row items-center mt-[3px] flex-wrap">
                          <View className="flex-row items-center mr-3">
                            <Icon name="calendar" size={13} color="#9C958C" className="mr-[4px]" />
                            <Text className="text-[13px] text-[#9C958C]">{getPreviewScheduleLabel()}</Text>
                          </View>
                          <View className="flex-row items-center mr-3">
                            <Icon name="streak" size={13} color="#E8C08A" className="mr-[4px]" />
                            <Text className="text-[13px] text-[#E8C08A] font-semibold">0 days</Text>
                          </View>
                        </View>
                      </View>
                    </View>

                    {/* History Strip */}
                    <View className="mt-1 pl-[48px]">
                      <RecentSessionsStrip statuses={dummyStatuses} />
                    </View>
                  </View>

                  {/* Completion Button (Disabled in Preview) */}
                  <CompletionButton status="pending" onPress={() => {}} />
                </View>
              </View>

              {/* Form Fields */}
              <View className="space-y-4">
                
                {/* Habit Name */}
                <View className="mb-4">
                  <Text className="text-[11px] font-bold text-[#65605A] uppercase tracking-wider mb-2">
                    Habit Name
                  </Text>
                  <TextInput
                    value={name}
                    onChangeText={(val) => {
                      setName(val);
                      setTouchedName(true);
                    }}
                    placeholder="e.g. Meditate, Workout, Drink Water"
                    placeholderTextColor="#65605A"
                    maxLength={32}
                    className="px-4 py-3 bg-[#0B0B0C] border border-[#2B2521] text-[#F5F2EC] rounded-xl font-medium"
                  />
                  {nameError ? (
                    <Text className="text-xs text-[#E8899A] mt-1 font-medium">{nameError}</Text>
                  ) : null}
                </View>

                {/* Description */}
                <View className="mb-4">
                  <Text className="text-[11px] font-bold text-[#65605A] uppercase tracking-wider mb-2">
                    Description (Optional)
                  </Text>
                  <TextInput
                    value={description}
                    onChangeText={setDescription}
                    placeholder="Why does this matter to you?"
                    placeholderTextColor="#65605A"
                    maxLength={120}
                    className="px-4 py-3 bg-[#0B0B0C] border border-[#2B2521] text-[#F5F2EC] rounded-xl font-medium"
                  />
                </View>

                {/* Icon Picker Grid */}
                <View className="mb-5">
                  <Text className="text-[11px] font-bold text-[#65605A] uppercase tracking-wider mb-3">
                    Choose Icon
                  </Text>
                  <View className="bg-[#181513] border border-[#2B2521] p-4 rounded-2xl">
                    {Object.entries(groupedIcons).map(([category, icons]) => (
                      <View key={category} className="mb-4">
                        <Text className="text-[10px] font-bold text-[#65605A] uppercase tracking-wider mb-2">
                          {category}
                        </Text>
                        <View className="flex-row flex-wrap justify-start">
                          {icons.map((iconItem) => {
                            const isSelected = selectedIcon === iconItem.name;
                            return (
                              <TouchableOpacity
                                key={iconItem.name}
                                onPress={() => setSelectedIcon(iconItem.name)}
                                className={`w-[14%] aspect-square items-center justify-center m-[1.3%] rounded-xl ${
                                  isSelected ? 'bg-[#3A2E1F] border border-[#E8C08A]' : 'bg-[#221C16] border border-[#2B2521]/10'
                                }`}
                                style={isSelected ? { transform: [{ scale: 1.05 }] } : undefined}
                              >
                                <Icon
                                  name={iconItem.name}
                                  size={18}
                                  color={isSelected ? '#E8C08A' : '#9C958C'}
                                  family="material"
                                />
                              </TouchableOpacity>
                            );
                          })}
                        </View>
                      </View>
                    ))}
                  </View>
                </View>

                {/* Schedule Segmented Control */}
                <View className="mb-4">
                  <Text className="text-[11px] font-bold text-[#65605A] uppercase tracking-wider mb-2">
                    Schedule
                  </Text>
                  <View className="flex-row bg-[#181513] p-1 border border-[#2B2521] rounded-xl">
                    <TouchableOpacity
                      onPress={() => setScheduleType('DAILY')}
                      className={`flex-1 py-3 items-center rounded-lg ${
                        scheduleType === 'DAILY' ? 'bg-[#E8C08A]' : 'bg-transparent'
                      }`}
                    >
                      <Text
                        className={`font-semibold text-xs ${
                          scheduleType === 'DAILY' ? 'text-[#241C14]' : 'text-[#9C958C]'
                        }`}
                      >
                        Every Day
                      </Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      onPress={() => setScheduleType('SPECIFIC_DAYS')}
                      className={`flex-1 py-3 items-center rounded-lg ${
                        scheduleType === 'SPECIFIC_DAYS' ? 'bg-[#E8C08A]' : 'bg-transparent'
                      }`}
                    >
                      <Text
                        className={`font-semibold text-xs ${
                          scheduleType === 'SPECIFIC_DAYS' ? 'text-[#241C14]' : 'text-[#9C958C]'
                        }`}
                      >
                        Specific Days
                      </Text>
                    </TouchableOpacity>
                  </View>
                </View>

                {/* Specific Days Circular Selectors */}
                {scheduleType === 'SPECIFIC_DAYS' && (
                  <View className="mb-4">
                    <Text className="text-[11px] font-bold text-[#65605A] uppercase tracking-wider mb-2">
                      Days of Week
                    </Text>
                    <View className="flex-row justify-between">
                      {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((day, idx) => {
                        const isSelected = selectedDays.includes(idx);
                        return (
                          <TouchableOpacity
                            key={idx}
                            onPress={() => toggleDaySelection(idx)}
                            className={`w-9 h-9 rounded-full items-center justify-center border ${
                              isSelected ? 'bg-[#E8C08A] border-[#E8C08A]' : 'bg-transparent border-[#2B2521]'
                            }`}
                          >
                            <Text
                              className={`text-xs font-semibold ${
                                isSelected ? 'text-[#241C14]' : 'text-[#9C958C]'
                              }`}
                            >
                              {day}
                            </Text>
                          </TouchableOpacity>
                        );
                      })}
                    </View>
                  </View>
                )}

                {/* Philosophy Card */}
                <View className="bg-[#181513] border border-[#2B2521] p-4 rounded-xl mb-6 flex-row items-start space-x-3">
                  <View className="mt-0.5">
                    <Icon name="info" size={15} color="#9C958C" />
                  </View>
                  <View className="flex-1">
                    <Text className="text-xs text-[#9C958C] leading-normal font-medium">
                      Today's Promise only includes the days you schedule. Days that aren't scheduled never break your streak.
                    </Text>
                  </View>
                </View>

                {/* Action Button */}
                <TouchableOpacity
                  onPress={handleCreate}
                  disabled={!isFormValid || loading}
                  className={`w-full py-4 rounded-xl items-center justify-center ${
                    isFormValid && !loading ? 'bg-[#E8C08A]' : 'bg-[#3A2E1F]'
                  }`}
                >
                  {loading ? (
                    <ActivityIndicator color="#241C14" />
                  ) : (
                    <Text
                      className={`font-bold text-base ${
                        isFormValid ? 'text-[#241C14]' : 'text-[#9C958C]'
                      }`}
                    >
                      {initialHabit ? 'Save Changes' : 'Create Promise'}
                    </Text>
                  )}
                </TouchableOpacity>

              </View>

            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </View>
    </Modal>
  );
};
