import React, { useEffect, useState } from 'react';
import {
  Text,
  View,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  TextInput,
  Alert,
  Modal,
  AppState,
} from 'react-native';
import { useAuthStore } from '../../src/store/auth-store';
import { useSyncStore } from '../../src/store/sync-store';
import { useHabitStore } from '../../src/store/habit-store';
import { useNotificationStore } from '../../src/store/notification-store';
import { HabitCard } from '../../src/components/habits/HabitCard';
import { HabitDetailModal } from '../../src/components/habits/HabitDetailModal';
import { NotificationBell } from '../../src/components/ui/NotificationBell';
import { NotificationScreen } from '../../src/components/ui/NotificationScreen';
import { ProgressRing } from '../../src/components/habits/ProgressRing';
import { SessionStatus } from '../../src/components/habits/RecentSessionsStrip';
import NetInfo from '@react-native-community/netinfo';
import { useHomeHero } from '../../src/hooks/useHomeHero';
import { useBeforeYouBegin } from '../../src/hooks/useBeforeYouBegin';
import { isHabitScheduledForDate, getHabitScheduleLabel } from '../../src/utils/streak';
import { Icon } from '../../src/components/ui/Icon';
import { calculateCalendarGridStatuses, getCalendarGridDates, validateFreeze } from '../../src/utils/freeze';
import { resolveHabitIcon } from '../../src/utils/habit-icons';

export default function TodayScreen() {
  const { apiClient, user } = useAuthStore();
  const { pendingQueue, enqueueCompleteHabit, syncQueue, isSyncing, enqueueFreezeHabit } = useSyncStore();
  const { habits, loading, fetchHabits, createHabit, checkInHabit, undoCheckIn, freezeHabit } = useHabitStore();
  const { unreadCount, fetchNotifications } = useNotificationStore();

  const [isOfflineMode, setIsOfflineMode] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [selectedHabitForDetail, setSelectedHabitForDetail] = useState<any | null>(null);

  const {
    greeting,
    promiseDay,
    displayName,
    globalStreak,
    totalPromises,
    keptPromises,
    remainingPromises,
    percentageDone,
  } = useHomeHero();

  const {
    hasCompletedToday,
    reflection,
    draftText,
    saveDraftText,
    completeRitual,
    currentPrompt,
    refreshDate,
  } = useBeforeYouBegin();

  // Ritual modal state
  const [showRitual, setShowRitual] = useState(false);
  const [ritualStep, setRitualStep] = useState<1 | 2>(1);
  const [reflectionInput, setReflectionInput] = useState('');

  // See all habits modal state
  const [showAllHabits, setShowAllHabits] = useState(false);

  // Habit creation form state
  const [showCreate, setShowCreate] = useState(false);
  const [habitName, setHabitName] = useState('');
  const [habitDesc, setHabitDesc] = useState('');
  const [scheduleType, setScheduleType] = useState<'DAILY' | 'SPECIFIC_DAYS'>('DAILY');
  const [selectedDays, setSelectedDays] = useState<number[]>([1, 2, 3, 4, 5]);

  useEffect(() => {
    fetchHabits(apiClient);
    fetchNotifications(apiClient);
  }, []);

  // Sync draft text to input when ritual opens
  useEffect(() => {
    if (showRitual) {
      setReflectionInput(draftText || '');
    }
  }, [showRitual, draftText]);

  // Network listener & AppState listener for offline detection & date refresh
  useEffect(() => {
    const unsubscribeNet = NetInfo.addEventListener((state) => {
      const offline = !state.isConnected || !state.isInternetReachable;
      setIsOfflineMode(offline);
      if (!offline && pendingQueue.length > 0) {
        syncQueue(apiClient).then(() => fetchHabits(apiClient));
      }
    });

    const subscriptionAppState = AppState.addEventListener('change', (nextState) => {
      if (nextState === 'active') {
        refreshDate();
        fetchHabits(apiClient);
        fetchNotifications(apiClient);
      }
    });

    return () => {
      unsubscribeNet();
      subscriptionAppState.remove();
    };
  }, [pendingQueue]);

  // Filter habits scheduled for today
  const todayStr = new Date().toISOString().split('T')[0];
  const todayHabits = habits.filter((h) => isHabitScheduledForDate(h, todayStr));

  const handleToggleCheckIn = async (habit: any) => {
    const isCompleted = (habit as any).completedToday;
    const key = `mobile-idemp-${habit.id}-${todayStr}-${Date.now()}`;
    const tz = user?.timezone || 'UTC';
    try {
      if (isCompleted) {
        await undoCheckIn(
          apiClient,
          habit.id,
          habit.todayCheckInId || 'placeholder-cid',
          todayStr,
          tz,
          key,
          isOfflineMode,
          async () => {}
        );
      } else {
        await checkInHabit(
          apiClient,
          habit.id,
          todayStr,
          tz,
          key,
          isOfflineMode,
          enqueueCompleteHabit
        );
        if (isOfflineMode) {
          Alert.alert('Offline Mode', 'Check-in enqueued. Will sync when back online.');
        }
      }
    } catch (e: any) {
      Alert.alert('Error', e.message);
    }
  };

  const handleFreezeHabit = async (habitId: string, targetDate: string) => {
    const key = `mobile-idemp-freeze-${habitId}-${targetDate}-${Date.now()}`;
    const tz = user?.timezone || 'UTC';
    try {
      await freezeHabit(apiClient, habitId, targetDate, tz, key, isOfflineMode, enqueueFreezeHabit);
      if (isOfflineMode) {
        Alert.alert('Offline Mode', 'Freeze enqueued. Will sync when back online.');
      }
    } catch (e: any) {
      Alert.alert('Error', e.message);
    }
  };

  const handleCreateHabit = async () => {
    if (!habitName.trim()) return;
    try {
      // Auto-resolve icon based on habit name
      const resolvedIcon = resolveHabitIcon(habitName.trim());

      await createHabit(apiClient, {
        name: habitName.trim(),
        description: habitDesc.trim() || undefined,
        icon: resolvedIcon,
        scheduleType: scheduleType,
        daysOfWeek: scheduleType === 'SPECIFIC_DAYS' ? selectedDays : undefined,
        timezone: user?.timezone || 'UTC',
        startDate: new Date().toISOString().split('T')[0],
      });
      setHabitName('');
      setHabitDesc('');
      setShowCreate(false);
    } catch (e: any) {
      Alert.alert('Error', e.message);
    }
  };

  const handleDeleteHabit = async (habitId: string) => {
    await apiClient.deleteHabit(habitId);
    await fetchHabits(apiClient);
  };

  const handleUpdateHabitIcon = async (habitId: string, newIcon: string) => {
    await apiClient.updateHabitIcon(habitId, newIcon);
    if (selectedHabitForDetail && selectedHabitForDetail.id === habitId) {
      setSelectedHabitForDetail({
        ...selectedHabitForDetail,
        icon: newIcon,
      });
    }
    await fetchHabits(apiClient);
  };

  const toggleDaySelection = (day: number) => {
    if (selectedDays.includes(day)) {
      setSelectedDays((prev) => prev.filter((d) => d !== day));
    } else {
      setSelectedDays((prev) => [...prev, day]);
    }
  };

  // Helper to generate dot statuses based on streak
  const getDotStatuses = (habitId: string, streak: number): SessionStatus[] => {
    const statuses: SessionStatus[] = [];
    const seed = habitId.charCodeAt(0) || 0;
    for (let i = 0; i < 14; i++) {
      if (i < streak) {
        statuses.push('completed');
      } else if ((seed + i) % 7 === 0) {
        statuses.push('missed');
      } else {
        statuses.push('pending');
      }
    }
    return statuses.reverse();
  };

  return (
    <View className="flex-1 bg-[#0B0B0C]">
      <ScrollView className="flex-1" showsVerticalScrollIndicator={false}>
        {/* Offline Status Banner */}
        {isOfflineMode && (
          <View className="bg-[#3A2E1F] px-4 py-2 flex-row justify-center items-center">
            <Icon name="alert" size={12} color="#E8C08A" className="mr-1.5" />
            <Text className="text-xs font-semibold text-[#E8C08A]">Offline Mode - Local Queue Active</Text>
          </View>
        )}

        {/* Sync Status Banner */}
        {pendingQueue.length > 0 && !isOfflineMode && (
          <TouchableOpacity
            onPress={() => syncQueue(apiClient).then(() => fetchHabits(apiClient))}
            disabled={isSyncing}
            className="bg-[#181513] px-4 py-3 border-b border-[#2B2521] flex-row justify-between items-center"
          >
            <View className="flex-row items-center">
              {!isSyncing && <Icon name="repeat" size={12} color="#E8C08A" className="mr-1.5" />}
              <Text className="text-xs font-semibold text-[#E8C08A]">
                {isSyncing ? 'Syncing...' : `${pendingQueue.length} check-ins pending. Tap to force.`}
              </Text>
            </View>
            {isSyncing && <ActivityIndicator size="small" color="#E8C08A" />}
          </TouchableOpacity>
        )}

        {/* Greeting Hero Section with Notification Bell */}
        <View className="px-6 pt-20 pb-6 flex-row justify-between items-start">
          <View className="flex-1 pr-4">
            <Text className="text-xs font-bold text-[#65605A] uppercase tracking-widest mb-1">
              {greeting}
            </Text>
            <Text className="text-4xl font-bold text-[#F5F2EC] mb-2">
              {displayName}.
            </Text>
            <Text className="text-sm text-[#9C958C]">
              Day {promiseDay} of keeping your promise.
            </Text>
            {hasCompletedToday ? (
              <View className="mt-4 flex-row items-center">
                <Icon name="check" size={16} color="#E8C08A" className="mr-1.5" />
                <Text className="text-sm text-[#E8C08A] font-semibold">
                  You've started today with intention.
                </Text>
              </View>
            ) : (
              <TouchableOpacity onPress={() => setShowRitual(true)} className="mt-4 flex-row items-center">
                <Icon name="book" size={16} color="#F5F2EC" className="mr-1.5" />
                <Text className="text-sm text-[#F5F2EC] font-medium underline">
                  Before You Begin
                </Text>
                <Icon name="arrow-right" size={14} color="#F5F2EC" className="ml-1.5" />
              </TouchableOpacity>
            )}
          </View>

          {/* Notification Bell Icon */}
          <NotificationBell
            unreadCount={unreadCount}
            onPress={() => setShowNotifications(true)}
          />
        </View>

        {/* Today's Promise Card Section */}
        <View className="px-6 mb-8">
          <View className="bg-[#181513] border border-[#2B2521] rounded-3xl p-6 flex-row justify-between items-center">
            <View className="flex-1 pr-4">
              <Text className="text-xs font-bold text-[#65605A] uppercase tracking-widest mb-3">
                Today's Promise
              </Text>
              <View className="flex-row items-baseline mb-1">
                <Text className="text-4xl font-bold text-[#F5F2EC] mr-1.5">{keptPromises}</Text>
                <Text className="text-lg text-[#9C958C] font-medium">of {totalPromises} kept</Text>
              </View>
              <Text className="text-xs text-[#9C958C] mb-4">
                {remainingPromises > 0 ? `${remainingPromises} promises remaining today` : 'All promises kept today!'}
              </Text>
              <View className="flex-row items-center">
                <Icon name="streak" size={14} color="#E8C08A" className="mr-1.5" />
                <Text className="text-xs text-[#E8C08A] font-semibold">{globalStreak}-day streak</Text>
              </View>
            </View>
            {/* Progress ring */}
            <ProgressRing percentage={percentageDone} size={100} strokeWidth={8} />
          </View>
        </View>

        {/* Habit List Section */}
        <View className="px-6 pb-24">
          <View className="flex-row justify-between items-center mb-4">
            <Text className="text-xs font-bold text-[#65605A] uppercase tracking-widest">
              Today's Habits
            </Text>
            <TouchableOpacity onPress={() => setShowAllHabits(true)}>
              <Text className="text-xs font-semibold text-[#E8C08A]">See all</Text>
            </TouchableOpacity>
          </View>

          {/* Create Habit Collapsible Form */}
          {showCreate && (
            <View className="p-5 bg-[#181513] border border-[#2B2521] rounded-2xl mb-6 shadow-sm">
              <Text className="text-base font-bold text-[#F5F2EC] mb-4">New Habit</Text>

              <Text className="text-xs font-semibold text-[#65605A] uppercase tracking-wider mb-2">Habit Name</Text>
              <TextInput
                value={habitName}
                onChangeText={setHabitName}
                placeholder="e.g. 30m Coding, Water, Reading"
                placeholderTextColor="#65605A"
                className="px-4 py-3 border border-[#2B2521] text-[#F5F2EC] rounded-xl mb-4 bg-[#0B0B0C]"
              />

              <Text className="text-xs font-semibold text-[#65605A] uppercase tracking-wider mb-2">Description</Text>
              <TextInput
                value={habitDesc}
                onChangeText={setHabitDesc}
                placeholder="Optional description"
                placeholderTextColor="#65605A"
                className="px-4 py-3 border border-[#2B2521] text-[#F5F2EC] rounded-xl mb-4 bg-[#0B0B0C]"
              />

              <Text className="text-xs font-semibold text-[#65605A] uppercase tracking-wider mb-2">Schedule Type</Text>
              <View className="flex-row mb-4">
                <TouchableOpacity
                  onPress={() => setScheduleType('DAILY')}
                  className={`flex-1 py-3 items-center rounded-xl mr-2 ${scheduleType === 'DAILY' ? 'bg-[#E8C08A]' : 'bg-[#3A2E1F]'}`}
                >
                  <Text className={`font-semibold text-xs ${scheduleType === 'DAILY' ? 'text-[#241C14]' : 'text-[#9C958C]'}`}>Daily</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => setScheduleType('SPECIFIC_DAYS')}
                  className={`flex-1 py-3 items-center rounded-xl ml-2 ${scheduleType === 'SPECIFIC_DAYS' ? 'bg-[#E8C08A]' : 'bg-[#3A2E1F]'}`}
                >
                  <Text className={`font-semibold text-xs ${scheduleType === 'SPECIFIC_DAYS' ? 'text-[#241C14]' : 'text-[#9C958C]'}`}>Specific Days</Text>
                </TouchableOpacity>
              </View>

              {scheduleType === 'SPECIFIC_DAYS' && (
                <View className="mb-4">
                  <Text className="text-xs font-semibold text-[#65605A] uppercase tracking-wider mb-2">Days of Week</Text>
                  <View className="flex-row justify-between">
                    {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((day, idx) => {
                      const isSelected = selectedDays.includes(idx);
                      return (
                        <TouchableOpacity
                          key={idx}
                          onPress={() => toggleDaySelection(idx)}
                          className={`w-9 h-9 rounded-full items-center justify-center ${isSelected ? 'bg-[#E8C08A]' : 'bg-[#2B2521]'}`}
                        >
                          <Text className={`text-xs font-semibold ${isSelected ? 'text-[#241C14]' : 'text-[#9C958C]'}`}>{day}</Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                </View>
              )}

              <TouchableOpacity
                onPress={handleCreateHabit}
                className="bg-[#E8C08A] py-3.5 rounded-xl items-center"
              >
                <Text className="text-[#241C14] font-bold text-sm">Save Habit</Text>
              </TouchableOpacity>
            </View>
          )}

          {loading ? (
            <ActivityIndicator size="large" color="#E8C08A" className="mt-10" />
          ) : todayHabits.length === 0 ? (
            <View className="bg-[#181513] border border-[#2B2521] p-8 rounded-2xl items-center mt-4">
              <Icon name="book" size={32} color="#E8C08A" className="mb-2" />
              <Text className="text-base font-semibold text-[#F5F2EC]">No habits for today</Text>
              <Text className="text-sm text-[#9C958C] text-center mt-1">Tap the plus button to create your first habit.</Text>
            </View>
          ) : (
            todayHabits.map((habit) => {
              const gridDates = getCalendarGridDates();
              const freezableDates = gridDates.filter((d) => validateFreeze(habit, d).valid);
              return (
                <HabitCard
                  key={habit.id}
                  name={habit.name}
                  iconName={habit.icon}
                  reminderTime={habit.reminderTime}
                  scheduleLabel={getHabitScheduleLabel(habit)}
                  currentStreak={habit.stats?.currentStreak || 0}
                  statuses={calculateCalendarGridStatuses(habit)}
                  completionStatus={(habit as any).completedToday ? 'completed' : 'pending'}
                  onToggleComplete={() => handleToggleCheckIn(habit)}
                  freezeDaysAvailable={habit.freezeDaysAvailable}
                  dates={gridDates}
                  freezableDates={freezableDates}
                  onFreeze={(date) => handleFreezeHabit(habit.id, date)}
                  onCardPress={() => setSelectedHabitForDetail(habit)}
                />
              );
            })
          )}
        </View>
      </ScrollView>

      {/* Habit Detail Modal */}
      <HabitDetailModal
        visible={!!selectedHabitForDetail}
        habit={selectedHabitForDetail}
        apiClient={apiClient}
        onClose={() => setSelectedHabitForDetail(null)}
        onDelete={handleDeleteHabit}
        onUpdateIcon={handleUpdateHabitIcon}
      />

      {/* Notification Screen Modal */}
      <NotificationScreen
        visible={showNotifications}
        apiClient={apiClient}
        onClose={() => setShowNotifications(false)}
      />

      {/* Before You Begin Ritual Modal */}
      <Modal
        visible={showRitual}
        animationType="slide"
        transparent
        onRequestClose={() => setShowRitual(false)}
      >
        <View style={{ flex: 1, backgroundColor: '#0B0B0C' }} className="px-6 justify-center">
          {ritualStep === 1 ? (
            <View className="items-center">
              <Text className="text-3xl text-[#E8C08A] font-bold mb-4">Before you begin...</Text>
              <Text className="text-lg text-[#F5F2EC] text-center mb-2 font-medium">
                Take a moment to remember why you're showing up today.
              </Text>
              <Text className="text-base text-[#9C958C] text-center mb-8">
                Today's promise starts with one intentional decision.
              </Text>

              <TouchableOpacity
                onPress={() => setRitualStep(2)}
                className="w-full bg-[#E8C08A] py-4 rounded-xl items-center"
              >
                <Text className="text-[#241C14] font-bold text-base">Continue</Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={() => setShowRitual(false)}
                className="mt-4"
              >
                <Text className="text-[#9C958C] text-sm">Cancel</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <View>
              <Text className="text-xs font-bold text-[#65605A] uppercase tracking-widest mb-3">Daily Reflection</Text>
              <Text className="text-2xl text-[#F5F2EC] font-semibold mb-6">{currentPrompt}</Text>

              <TextInput
                multiline
                numberOfLines={4}
                maxLength={250}
                placeholder="Type your reflection here (optional)..."
                placeholderTextColor="#65605A"
                value={reflectionInput}
                onChangeText={(text) => {
                  setReflectionInput(text);
                  saveDraftText(text);
                }}
                className="bg-[#181513] border border-[#2B2521] rounded-2xl p-4 text-[#F5F2EC] text-base mb-2 h-32"
                style={{ textAlignVertical: 'top' }}
              />

              <Text className="text-right text-xs text-[#9C958C] mb-8">
                {reflectionInput.length} / 250 characters
              </Text>

              <TouchableOpacity
                onPress={async () => {
                  try {
                    await completeRitual(reflectionInput);
                    setShowRitual(false);
                  } catch (e: any) {
                    Alert.alert('Error', e.message);
                  }
                }}
                className="bg-[#E8C08A] py-4 rounded-xl items-center mb-4"
              >
                <Text className="text-[#241C14] font-bold text-base">Begin Today</Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={() => setShowRitual(false)}
                className="items-center"
              >
                <Text className="text-[#9C958C] text-sm">Close and Save Draft</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      </Modal>

      {/* See All Habits Modal */}
      <Modal
        visible={showAllHabits}
        animationType="slide"
        transparent
        onRequestClose={() => setShowAllHabits(false)}
      >
        <View style={{ flex: 1, backgroundColor: '#0B0B0C' }}>
          {/* Header */}
          <View className="px-6 pt-16 pb-4 border-b border-[#2B2521] flex-row justify-between items-center bg-[#0B0B0C]">
            <Text className="text-xl font-bold text-[#F5F2EC]">All Today's Habits</Text>
            <TouchableOpacity onPress={() => setShowAllHabits(false)} className="px-3 py-2 bg-[#2B2521] rounded-lg">
              <Text className="text-[#E8C08A] font-semibold text-sm">Close</Text>
            </TouchableOpacity>
          </View>

          {/* List of Habits */}
          <ScrollView className="flex-1 px-6 pt-6" showsVerticalScrollIndicator={false}>
            {loading ? (
              <ActivityIndicator size="large" color="#E8C08A" className="mt-10" />
            ) : todayHabits.length === 0 ? (
              <View className="bg-[#181513] border border-[#2B2521] p-8 rounded-2xl items-center mt-4">
                <Icon name="book" size={32} color="#E8C08A" className="mb-2" />
                <Text className="text-base font-semibold text-[#F5F2EC]">No habits for today</Text>
              </View>
            ) : (
              todayHabits.map((habit) => (
                <HabitCard
                  key={habit.id}
                  name={habit.name}
                  iconName={habit.icon}
                  reminderTime={habit.reminderTime}
                  scheduleLabel={getHabitScheduleLabel(habit)}
                  currentStreak={habit.stats?.currentStreak || 0}
                  statuses={getDotStatuses(habit.id, habit.stats?.currentStreak || 0)}
                  completionStatus={(habit as any).completedToday ? 'completed' : 'pending'}
                  onToggleComplete={() => handleToggleCheckIn(habit)}
                  onCardPress={() => {
                    setShowAllHabits(false);
                    setSelectedHabitForDetail(habit);
                  }}
                />
              ))
            )}
            <View className="h-16" />
          </ScrollView>
        </View>
      </Modal>

      {/* FAB Plus Button */}
      <TouchableOpacity
        onPress={() => setShowCreate(!showCreate)}
        className="absolute bottom-6 right-6 w-14 h-14 bg-[#E8C08A] rounded-full justify-center items-center shadow-lg"
      >
        <Icon name="plus" size={28} color="#241C14" />
      </TouchableOpacity>
    </View>
  );
}
