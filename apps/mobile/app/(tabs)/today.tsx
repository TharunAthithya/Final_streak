import React, { useEffect, useState, useRef } from 'react';
import {
  Text,
  View,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Modal,
  AppState,
  Platform,
  UIManager,
  LayoutAnimation,
} from 'react-native';
import { useAuthStore } from '../../src/store/auth-store';
import { useSyncStore } from '../../src/store/sync-store';
import { useHabitStore } from '../../src/store/habit-store';
import { useNotificationStore } from '../../src/store/notification-store';
import { HabitCard } from '../../src/components/habits/HabitCard';
import { OtherDayHabitRow } from '../../src/components/habits/OtherDayHabitRow';
import { HabitDetailsSheet } from '../../src/components/habits/HabitDetailsSheet';
import { CreateHabitBottomSheet } from '../../src/components/habits/CreateHabitBottomSheet';
import { NotificationBell } from '../../src/components/ui/NotificationBell';
import { NotificationScreen } from '../../src/components/ui/NotificationScreen';
import { ProgressRing } from '../../src/components/habits/ProgressRing';
import { SessionStatus } from '../../src/components/habits/RecentSessionsStrip';
import { HabitCardSkeleton } from '../../src/components/ui/skeletons/HabitCardSkeleton';
import { DotPulse } from '../../src/components/ui/DotPulse';
import { useNotice } from '../../src/components/ui/Notice';
import { useDelayedLoading } from '../../src/hooks/useDelayedLoading';
import NetInfo from '@react-native-community/netinfo';
import { useHomeHero } from '../../src/hooks/useHomeHero';
import { useDailyStoryStore } from '../../src/store/daily-story-store';
import { BeforeYouBeginCard } from '../../src/components/coaching/BeforeYouBeginCard';
import { DailyStoryModal } from '../../src/components/coaching/DailyStoryModal';
import { isHabitScheduledForDate, getHabitScheduleLabel, getNextScheduledDay, getSyncAwareHabits, toLocalDateString } from '../../src/utils/streak';
import { Icon } from '../../src/components/ui/Icon';
import { calculateCalendarGridStatuses, getCalendarGridDates, validateFreeze } from '../../src/utils/freeze';
import { resolveHabitIcon } from '../../src/utils/habit-icons';
import { useOnboardingStore } from '../../src/store/onboarding-store';
import { OnboardingTarget } from '../../src/onboarding/OnboardingTarget';

export default function TodayScreen() {
  const { apiClient, user } = useAuthStore();
  const { pendingQueue, enqueueCompleteHabit, syncQueue, isSyncing, enqueueFreezeHabit, enqueueUndoHabit } = useSyncStore();
  const { habits, loading, fetchHabits, createHabit, updateHabit, checkInHabit, undoCheckIn, freezeHabit } = useHabitStore();
  const { unreadCount, fetchNotifications } = useNotificationStore();

  const notice = useNotice();
  const showSkeleton = useDelayedLoading(loading);

  const [isOfflineMode, setIsOfflineMode] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [selectedHabitForDetail, setSelectedHabitForDetail] = useState<any | null>(null);

  // Delayed reordering state for habit completion
  const [sortedCompletedIds, setSortedCompletedIds] = useState<Set<string>>(new Set());
  const reorderTimersRef = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());

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

  // Tutorial hooks: report real app events and data context (no-ops when the tutorial is inactive)
  const obComplete = useOnboardingStore((s) => s.completeStep);
  const obSetContext = useOnboardingStore((s) => s.setContext);
  const obMarkHabitCreated = useOnboardingStore((s) => s.markHabitCreated);
  const obStepId = useOnboardingStore((s) => (s.isActive ? s.currentStepId : null));
  const obNavDirection = useOnboardingStore((s) => s.navDirection);
  const obNext = useOnboardingStore((s) => s.next);
  const obPrevious = useOnboardingStore((s) => s.previous);

  // See all habits modal state
  const [showAllHabits, setShowAllHabits] = useState(false);

  // Habit creation form state
  const [showCreate, setShowCreate] = useState(false);

  useEffect(() => {
    if (!loading) obSetContext({ hasHabits: habits.length > 0 });
  }, [loading, habits.length]);

  useEffect(() => {
    fetchHabits(apiClient);
    fetchNotifications(apiClient);

    // Auto-popup daily story on first launch of the day if splash hasn't been completed/seen
    if (!hasSeenSplashToday && !isStoryCompletedToday) {
      setShowDailyStoryModal(true);
    }
  }, []);

  // Tutorial: modal visibility -> events (state driven, so they cannot be missed or double counted)
  useEffect(() => {
    if (showDailyStoryModal) {
      obComplete('LESSON_OPENED');
    } else if (obStepId === 'lesson.inside') {
      // Lesson closed before the user pressed Next: move on so the card is never lost
      obNext();
    } else {
      obComplete('LESSON_CLOSED');
    }
  }, [showDailyStoryModal, obStepId]);

  useEffect(() => {
    if (showCreate) obComplete('HABIT_SHEET_OPENED');
  }, [showCreate, obStepId]);

  // Tutorial: moving back/skipping from a modal step to a root step closes the modal that step belongs to
  useEffect(() => {
    if (!obStepId || obNavDirection === 'fwd') return;
    if (obStepId !== 'lesson.inside' && obStepId !== 'lesson.close') setShowDailyStoryModal(false);
    if (!obStepId.startsWith('habit.') || obStepId === 'habit.fab' || obStepId === 'habit.new') setShowCreate(false);
  }, [obStepId]);

  // Tutorial: the habit sheet was dismissed mid-flow -> step back to the "+" step
  useEffect(() => {
    if (!showCreate && obStepId && obStepId.startsWith('habit.') && obStepId !== 'habit.fab' && obStepId !== 'habit.new') {
      obPrevious();
    }
  }, [showCreate, obStepId]);

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

  // Filter & sort habits scheduled for today with 900ms delayed completion reordering
  const syncAwareHabits = getSyncAwareHabits(habits, pendingQueue);
  const scheduledToday = syncAwareHabits.filter((h) => isHabitScheduledForDate(h, todayStr));

  useEffect(() => {
    scheduledToday.forEach((h) => {
      const isDone = !!(h as any).completedToday;
      if (isDone) {
        if (!sortedCompletedIds.has(h.id) && !reorderTimersRef.current.has(h.id)) {
          const timer = setTimeout(() => {
            LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
            setSortedCompletedIds((prev) => {
              const next = new Set(prev);
              next.add(h.id);
              return next;
            });
            reorderTimersRef.current.delete(h.id);
          }, 900);
          reorderTimersRef.current.set(h.id, timer);
        }
      } else {
        if (reorderTimersRef.current.has(h.id)) {
          clearTimeout(reorderTimersRef.current.get(h.id)!);
          reorderTimersRef.current.delete(h.id);
        }
        if (sortedCompletedIds.has(h.id)) {
          LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
          setSortedCompletedIds((prev) => {
            const next = new Set(prev);
            next.delete(h.id);
            return next;
          });
        }
      }
    });
  }, [syncAwareHabits]);

  const todayHabits = [...scheduledToday].sort((a, b) => {
    const aDoneForSort = sortedCompletedIds.has(a.id) ? 1 : 0;
    const bDoneForSort = sortedCompletedIds.has(b.id) ? 1 : 0;
    return aDoneForSort - bDoneForSort;
  });

  const otherDayHabits = syncAwareHabits.filter(
    (h) => h.status === 'ACTIVE' && !isHabitScheduledForDate(h, todayStr)
  );

  const selectedHabit = selectedHabitForDetail
    ? syncAwareHabits.find((h) => h.id === selectedHabitForDetail.id) || selectedHabitForDetail
    : null;

  const handleToggleCheckIn = async (habit: any) => {
    const todayStr = toLocalDateString(new Date());
    const key = `mobile-idemp-${habit.id}-${todayStr}-${Date.now()}`;
    const tz = user?.timezone || 'UTC';

    try {
      if (habit.completedToday && habit.todayCheckInId) {
        await undoCheckIn(
          apiClient,
          habit.id,
          habit.todayCheckInId,
          todayStr,
          tz,
          key,
          isOfflineMode,
          enqueueUndoHabit
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
          notice.info('Offline Mode: Check-in enqueued. Will sync when back online.');
        }
      }
    } catch (e: any) {
      notice.error(e.message || 'Failed to toggle habit check-in');
    }
  };

  const handleFreezeHabit = async (habitId: string, targetDate: string) => {
    const key = `mobile-idemp-freeze-${habitId}-${targetDate}-${Date.now()}`;
    const tz = user?.timezone || 'UTC';
    try {
      await freezeHabit(apiClient, habitId, targetDate, tz, key, isOfflineMode, enqueueFreezeHabit);
      if (isOfflineMode) {
        notice.info('Offline Mode: Freeze enqueued. Will sync when back online.');
      }
    } catch (e: any) {
      notice.error(e.message || 'Failed to freeze habit');
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
      obMarkHabitCreated();
      setShowCreate(false);
      notice.success('Habit created successfully!');
    } catch (e: any) {
      notice.error(e.message || 'Failed to create habit');
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
            {isSyncing && <DotPulse size={4} color="#E8C08A" />}
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
        <OnboardingTarget id="lesson" className="px-6">
          <BeforeYouBeginCard
            isCompleted={isStoryCompletedToday}
            onPressBegin={() => setShowDailyStoryModal(true)}
          />
        </OnboardingTarget>

        {/* Today's Promise Card Section */}
        <View className="px-6 mb-8">
          <OnboardingTarget id="promise" className="bg-[#181513] border border-[#2B2521] rounded-3xl p-6 flex-row justify-between items-center">
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
              <OnboardingTarget id="streak" className="flex-row items-center self-start">
                <Icon name="streak" size={14} color="#E8C08A" className="mr-1.5" />
                <Text className="text-xs text-[#E8C08A] font-semibold">{globalStreak}-day streak</Text>
              </OnboardingTarget>
            </View>
            {/* Progress ring */}
            <OnboardingTarget id="ring">
              <ProgressRing percentage={percentageDone} size={100} strokeWidth={8} />
            </OnboardingTarget>
          </OnboardingTarget>
        </View>

        {/* Habits Header */}
        <View className="px-6 mb-3 flex-row justify-between items-center">
          <Text className="text-lg font-bold text-[#F5F2EC]">
            Today's Habits
          </Text>
          {todayHabits.length > 3 && (
            <TouchableOpacity onPress={() => setShowAllHabits(true)}>
              <Text className="text-xs font-semibold text-[#E8C08A]">See all</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Habit Cards */}
        <View className="px-6 pb-24">
          {showSkeleton ? (
            <View className="space-y-3">
              <HabitCardSkeleton />
              <HabitCardSkeleton />
              <HabitCardSkeleton />
            </View>
          ) : todayHabits.length === 0 && otherDayHabits.length === 0 ? (
            <View className="bg-[#181513] border border-[#2B2521] p-8 rounded-2xl items-center mt-4">
              <Icon name="book" size={32} color="#E8C08A" className="mb-2" />
              <Text className="text-base font-semibold text-[#F5F2EC]">No habits created yet</Text>
              <Text className="text-xs text-[#9C958C] mt-1 text-center">
                Tap the + button below to create your first habit promise.
              </Text>
            </View>
          ) : (
            <>
              {/* Today's Habits List */}
              {todayHabits.map((habit, habitIndex) => {
                const gridDates = getCalendarGridDates();
                const freezableDates = gridDates.filter((d) => validateFreeze(habit, d).valid);
                return (
                  <OnboardingTarget key={habit.id} id={habitIndex === 0 ? 'firstHabit' : `habit.${habit.id}`}>
                  <HabitCard
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
                  </OnboardingTarget>
                );
              })}

              {/* Other Days Section */}
              {otherDayHabits.length > 0 && (
                <View className="mt-5">
                  <Text className="text-base font-bold text-[#9C958C] mb-3">
                    Other Days
                  </Text>
                  {otherDayHabits.map((habit) => (
                    <OtherDayHabitRow
                      key={habit.id}
                      name={habit.name}
                      nextDayLabel={getNextScheduledDay(habit)}
                      onCardPress={() => setSelectedHabitForDetail(habit)}
                    />
                  ))}
                </View>
              )}
            </>
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
            {showSkeleton ? (
              <View className="space-y-3">
                <HabitCardSkeleton />
                <HabitCardSkeleton />
                <HabitCardSkeleton />
              </View>
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
      <OnboardingTarget id="fab" className="absolute bottom-6 right-6">
        <TouchableOpacity
          onPress={() => setShowCreate(!showCreate)}
          className="w-14 h-14 bg-[#E8C08A] rounded-full justify-center items-center shadow-lg"
        >
          <Icon name="plus" size={28} color="#241C14" />
        </TouchableOpacity>
      </OnboardingTarget>
    </View>
  );
}
