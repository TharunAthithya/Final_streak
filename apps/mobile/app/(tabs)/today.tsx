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
import { HabitDetailsSheet } from '../../src/components/habits/HabitDetailsSheet';
import { CreateHabitBottomSheet } from '../../src/components/habits/CreateHabitBottomSheet';
import { NotificationBell } from '../../src/components/ui/NotificationBell';
import { NotificationScreen } from '../../src/components/ui/NotificationScreen';
import { ProgressRing } from '../../src/components/habits/ProgressRing';
import { SessionStatus } from '../../src/components/habits/RecentSessionsStrip';
import NetInfo from '@react-native-community/netinfo';
import { useHomeHero } from '../../src/hooks/useHomeHero';
import { useDailyStoryStore } from '../../src/store/daily-story-store';
import { BeforeYouBeginCard } from '../../src/components/coaching/BeforeYouBeginCard';
import { DailyStoryModal } from '../../src/components/coaching/DailyStoryModal';
import { isHabitScheduledForDate, getHabitScheduleLabel, getSyncAwareHabits, toLocalDateString } from '../../src/utils/streak';
import { Icon } from '../../src/components/ui/Icon';
import { calculateCalendarGridStatuses, getCalendarGridDates, validateFreeze } from '../../src/utils/freeze';
import { resolveHabitIcon } from '../../src/utils/habit-icons';

export default function TodayScreen() {
  const { apiClient, user } = useAuthStore();
  const { pendingQueue, enqueueCompleteHabit, syncQueue, isSyncing, enqueueFreezeHabit } = useSyncStore();
  const { habits, loading, fetchHabits, createHabit, updateHabit, checkInHabit, undoCheckIn, freezeHabit } = useHabitStore();
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

  const { isCompletedForDate, hasSeenSplashForDate, getStoryForDate, completeStoryForDate } = useDailyStoryStore();
  const [showDailyStoryModal, setShowDailyStoryModal] = useState(false);
  const todayStr = toLocalDateString(new Date());
  const isStoryCompletedToday = isCompletedForDate(todayStr);
  const hasSeenSplashToday = hasSeenSplashForDate(todayStr);
  const todayStory = getStoryForDate(todayStr);

  const handleCompleteStory = async () => {
    await completeStoryForDate(todayStr);
    setShowDailyStoryModal(false);
  };

  // See all habits modal state
  const [showAllHabits, setShowAllHabits] = useState(false);

  // Habit creation form state
  const [showCreate, setShowCreate] = useState(false);

  useEffect(() => {
    fetchHabits(apiClient);
    fetchNotifications(apiClient);

    // Auto-popup daily story on first launch of the day if splash hasn't been completed/seen
    if (!hasSeenSplashToday && !isStoryCompletedToday) {
      setShowDailyStoryModal(true);
    }
  }, []);

  // Network listener & AppState listener for offline detection
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
        fetchHabits(apiClient);
        fetchNotifications(apiClient);
      }
    });

    return () => {
      unsubscribeNet();
      subscriptionAppState.remove();
    };
  }, [pendingQueue]);

  // Filter & sort habits scheduled for today (Uncompleted habits at top, completed move to bottom)
  const syncAwareHabits = getSyncAwareHabits(habits, pendingQueue);
  const todayHabits = syncAwareHabits
    .filter((h) => isHabitScheduledForDate(h, todayStr))
    .sort((a, b) => {
      const aDone = (a as any).completedToday ? 1 : 0;
      const bDone = (b as any).completedToday ? 1 : 0;
      return aDone - bDone;
    });
  const selectedHabit = selectedHabitForDetail
    ? syncAwareHabits.find((h) => h.id === selectedHabitForDetail.id) || selectedHabitForDetail
    : null;

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

  const handleCreateHabit = async (habitData: {
    name: string;
    description?: string;
    icon: string;
    scheduleType: 'DAILY' | 'SPECIFIC_DAYS';
    daysOfWeek?: number[];
  }) => {
    try {
      await createHabit(apiClient, {
        name: habitData.name.trim(),
        description: habitData.description?.trim() || undefined,
        icon: habitData.icon,
        scheduleType: habitData.scheduleType,
        daysOfWeek: habitData.scheduleType === 'SPECIFIC_DAYS' ? habitData.daysOfWeek : undefined,
        timezone: user?.timezone || 'UTC',
        startDate: toLocalDateString(new Date()),
      });
      setShowCreate(false);
    } catch (e: any) {
      Alert.alert('Error', e.message || 'Failed to create habit');
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

  const handleUpdateHabit = async (habitId: string, habitData: any) => {
    await updateHabit(apiClient, habitId, habitData);
    if (selectedHabitForDetail && selectedHabitForDetail.id === habitId) {
      setSelectedHabitForDetail({
        ...selectedHabitForDetail,
        ...habitData,
      });
    }
    await fetchHabits(apiClient);
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
          </View>

          {/* Notification Bell Icon */}
          <NotificationBell
            unreadCount={unreadCount}
            onPress={() => setShowNotifications(true)}
          />
        </View>

        {/* Before You Begin Card (Stays visible all day, transitioning from Active to Reassuring Completed state) */}
        <View className="px-6">
          <BeforeYouBeginCard
            isCompleted={isStoryCompletedToday}
            onPressBegin={() => setShowDailyStoryModal(true)}
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

        {/* Habits Header */}
        <View className="px-6 mb-3 flex-row justify-between items-center">
          <Text className="text-xs font-bold text-[#65605A] uppercase tracking-widest">
            Today's Promises ({todayHabits.length})
          </Text>
          {todayHabits.length > 3 && (
            <TouchableOpacity onPress={() => setShowAllHabits(true)}>
              <Text className="text-xs font-semibold text-[#E8C08A]">See all</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Habit Cards */}
        <View className="px-6 pb-24">
          {loading ? (
            <ActivityIndicator size="large" color="#E8C08A" className="mt-10" />
          ) : todayHabits.length === 0 ? (
            <View className="bg-[#181513] border border-[#2B2521] p-8 rounded-2xl items-center mt-4">
              <Icon name="book" size={32} color="#E8C08A" className="mb-2" />
              <Text className="text-base font-semibold text-[#F5F2EC]">No habits scheduled for today</Text>
              <Text className="text-xs text-[#9C958C] mt-1 text-center">
                Tap the + button below to create your first habit promise.
              </Text>
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

      {/* Notification Screen Modal */}
      <NotificationScreen
        visible={showNotifications}
        apiClient={apiClient}
        onClose={() => setShowNotifications(false)}
      />

      {/* Before You Begin Daily Story Coaching Modal */}
      <DailyStoryModal
        visible={showDailyStoryModal}
        story={todayStory}
        promiseDay={promiseDay}
        isReadonly={isStoryCompletedToday}
        onClose={() => setShowDailyStoryModal(false)}
        onComplete={handleCompleteStory}
      />

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

      {/* Habit Details Sheet */}
      <HabitDetailsSheet
        visible={!!selectedHabitForDetail}
        habit={selectedHabit}
        apiClient={apiClient}
        onClose={() => setSelectedHabitForDetail(null)}
        onDelete={handleDeleteHabit}
        onUpdateHabit={handleUpdateHabit}
        onFreezeHabit={async (habitId, dateStr) => {
          await handleFreezeHabit(habitId, dateStr);
          await fetchHabits(apiClient);
        }}
        onToggleComplete={() => selectedHabit && handleToggleCheckIn(selectedHabit)}
      />

      {/* Create Habit Bottom Sheet */}
      <CreateHabitBottomSheet
        visible={showCreate}
        onClose={() => setShowCreate(false)}
        onCreate={handleCreateHabit}
        loading={loading}
      />

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
