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
import { HabitCard } from '../../src/components/habits/HabitCard';
import { ProgressRing } from '../../src/components/habits/ProgressRing';
import { SessionStatus } from '../../src/components/habits/RecentSessionsStrip';
import NetInfo from '@react-native-community/netinfo';
import { useHomeHero } from '../../src/hooks/useHomeHero';
import { useBeforeYouBegin } from '../../src/hooks/useBeforeYouBegin';
import { isHabitScheduledForDate, getHabitScheduleLabel } from '../../src/utils/streak';

export default function TodayScreen() {
  const { apiClient, user } = useAuthStore();
  const { pendingQueue, enqueueCompleteHabit, syncQueue, isSyncing } = useSyncStore();
  const { habits, loading, fetchHabits, createHabit, checkInHabit, undoCheckIn } = useHabitStore();

  const [isOfflineMode, setIsOfflineMode] = useState(false);
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

  const todayHabits = habits.filter((habit) => isHabitScheduledForDate(habit, new Date()));

  const [showRitual, setShowRitual] = useState(false);
  const [showAllHabits, setShowAllHabits] = useState(false);
  const [ritualStep, setRitualStep] = useState<1 | 2>(1);
  const [reflectionInput, setReflectionInput] = useState('');

  // Auto-refresh date on focus / app state change to reset ritual at midnight
  useEffect(() => {
    const subscription = AppState.addEventListener('change', (nextStatus) => {
      if (nextStatus === 'active') {
        refreshDate();
      }
    });
    return () => subscription.remove();
  }, [refreshDate]);

  useEffect(() => {
    if (showRitual) {
      setReflectionInput(draftText);
      setRitualStep(1);
    }
  }, [showRitual, draftText]);

  // Create Habit Form State
  const [showCreate, setShowCreate] = useState(false);
  const [habitName, setHabitName] = useState('');
  const [habitDesc, setHabitDesc] = useState('');
  const [scheduleType, setScheduleType] = useState<'DAILY' | 'SPECIFIC_DAYS'>('DAILY');
  const [selectedDays, setSelectedDays] = useState<number[]>([]); // 0=Sun, 6=Sat

  // Check network status
  useEffect(() => {
    const unsubscribe = NetInfo.addEventListener((state) => {
      const isOnline = !!state.isConnected && !!state.isInternetReachable;
      setIsOfflineMode(!isOnline);
      if (isOnline && pendingQueue.length > 0) {
        syncQueue(apiClient).then(() => fetchHabits(apiClient));
      }
    });
    return () => unsubscribe();
  }, [pendingQueue.length]);

  useEffect(() => {
    if (!isOfflineMode) {
      fetchHabits(apiClient);
    }
  }, [isOfflineMode]);

  const handleToggleCheckIn = async (habit: any) => {
    const todayStr = new Date().toISOString().split('T')[0];
    const key = `mobile-idemp-${habit.id}-${todayStr}-${Date.now()}`;
    const tz = user?.timezone || 'UTC';

    const h = habit as any;
    const isCompleted = h.completedToday;

    try {
      if (isCompleted) {
        // Find if check-in exists to undo.
        // For simplicity, we trigger undo check-in with a placeholder ID if offline.
        await undoCheckIn(
          apiClient,
          habit.id,
          h.todayCheckInId || 'placeholder-cid',
          todayStr,
          tz,
          key,
          isOfflineMode,
          async (hId, lDate, tZone, idKey, cId) => {
            // Offline undo queue logic
          }
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

  const handleCreateHabit = async () => {
    if (!habitName.trim()) return;
    try {
      await createHabit(apiClient, {
        name: habitName.trim(),
        description: habitDesc.trim() || undefined,
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

  const toggleDaySelection = (day: number) => {
    if (selectedDays.includes(day)) {
      setSelectedDays(prev => prev.filter(d => d !== day));
    } else {
      setSelectedDays(prev => [...prev, day]);
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
    <View className="flex-1 bg-[#12110E]">
      <ScrollView className="flex-1" showsVerticalScrollIndicator={false}>
        {/* Offline Status Banner */}
        {isOfflineMode && (
          <View className="bg-premiumGoldMuted px-4 py-2 items-center">
            <Text className="text-xs font-semibold text-premiumGold">⚠️ Offline Mode - Local Queue Active</Text>
          </View>
        )}

        {/* Sync Status Banner */}
        {pendingQueue.length > 0 && !isOfflineMode && (
          <TouchableOpacity
            onPress={() => syncQueue(apiClient).then(() => fetchHabits(apiClient))}
            disabled={isSyncing}
            className="bg-[#2A2722] px-4 py-3 border-b border-premiumGold flex-row justify-between items-center"
          >
            <Text className="text-xs font-semibold text-premiumGold">
              {isSyncing ? 'Syncing...' : `🔄 ${pendingQueue.length} check-ins pending. Tap to force.`}
            </Text>
            {isSyncing && <ActivityIndicator size="small" color="#C5A880" />}
          </TouchableOpacity>
        )}

        {/* Greeting Hero Section */}
        <View className="px-6 pt-20 pb-6">
          <Text className="text-sm font-bold text-premiumTextMuted uppercase tracking-widest mb-1">
            {greeting}
          </Text>
          <Text style={{ fontFamily: 'Georgia' }} className="text-5xl font-bold text-white mb-2">
            {displayName}.
          </Text>
          <Text className="text-base text-premiumTextMuted">
            Day {promiseDay} of keeping your promise.
          </Text>
          {hasCompletedToday ? (
            <View className="mt-4 flex-row items-center">
              <Text className="text-base text-[#C5A880] font-semibold">
                ✓ You've started today with intention.
              </Text>
            </View>
          ) : (
            <TouchableOpacity onPress={() => setShowRitual(true)} className="mt-4 flex-row items-center">
              <Text className="text-base text-white font-medium underline">
                📖 Before You Begin
              </Text>
              <Text className="text-base text-white font-medium ml-1">→</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Today's Promise Card Section */}
        <View className="px-6 mb-8">
          <View className="bg-premiumSurface border border-[#2B2723] rounded-3xl p-6 flex-row justify-between items-center">
            <View className="flex-1 pr-4">
              <Text className="text-sm font-bold text-premiumTextMuted uppercase tracking-widest mb-3">
                Today's Promise
              </Text>
              <View className="flex-row items-baseline mb-1">
                <Text className="text-4xl font-bold text-white mr-1.5">{keptPromises}</Text>
                <Text className="text-xl text-premiumTextMuted font-medium">of {totalPromises} kept</Text>
              </View>
              <Text className="text-sm text-premiumTextMuted mb-4">
                {remainingPromises > 0 ? `${remainingPromises} promises remaining today` : 'All promises kept today!'}
              </Text>
              <View className="flex-row items-center">
                <Text className="text-sm text-premiumGold mr-1">🔥</Text>
                <Text className="text-sm text-premiumGold font-semibold">{globalStreak}-day streak</Text>
              </View>
            </View>
            {/* Svg progress ring */}
            <ProgressRing percentage={percentageDone} size={100} strokeWidth={8} />
          </View>
        </View>

        {/* Habit List Section */}
        <View className="px-6 pb-24">
          <View className="flex-row justify-between items-center mb-4">
            <Text className="text-sm font-bold text-premiumTextMuted uppercase tracking-widest">
              Today's Habits
            </Text>
            <TouchableOpacity onPress={() => setShowAllHabits(true)}>
              <Text className="text-sm font-semibold text-premiumGold">See all</Text>
            </TouchableOpacity>
          </View>

          {/* Create Habit Collapsible Form */}
          {showCreate && (
            <View className="p-5 bg-premiumSurface border border-[#2B2723] rounded-2xl mb-6 shadow-sm">
              <Text className="text-base font-bold text-white mb-4">New Habit</Text>
              
              <Text className="text-xs font-semibold text-premiumTextMuted uppercase tracking-wider mb-2">Habit Name</Text>
              <TextInput
                value={habitName}
                onChangeText={setHabitName}
                placeholder="e.g. 30m Coding"
                placeholderTextColor="#5C4E3D"
                className="px-4 py-3 border border-[#2B2723] text-white rounded-xl mb-4 bg-[#12110E]"
              />

              <Text className="text-xs font-semibold text-premiumTextMuted uppercase tracking-wider mb-2">Description</Text>
              <TextInput
                value={habitDesc}
                onChangeText={setHabitDesc}
                placeholder="Optional description"
                placeholderTextColor="#5C4E3D"
                className="px-4 py-3 border border-[#2B2723] text-white rounded-xl mb-4 bg-[#12110E]"
              />

              <Text className="text-xs font-semibold text-premiumTextMuted uppercase tracking-wider mb-2">Schedule Type</Text>
              <View className="flex-row mb-4">
                <TouchableOpacity
                  onPress={() => setScheduleType('DAILY')}
                  className={`flex-1 py-3 items-center rounded-xl mr-2 ${scheduleType === 'DAILY' ? 'bg-premiumGold' : 'bg-premiumGoldMuted'}`}
                >
                  <Text className={`font-semibold ${scheduleType === 'DAILY' ? 'text-premiumBg' : 'text-premiumTextMuted'}`}>Daily</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => setScheduleType('SPECIFIC_DAYS')}
                  className={`flex-1 py-3 items-center rounded-xl ml-2 ${scheduleType === 'SPECIFIC_DAYS' ? 'bg-premiumGold' : 'bg-premiumGoldMuted'}`}
                >
                  <Text className={`font-semibold ${scheduleType === 'SPECIFIC_DAYS' ? 'text-premiumBg' : 'text-premiumTextMuted'}`}>Specific Days</Text>
                </TouchableOpacity>
              </View>

              {scheduleType === 'SPECIFIC_DAYS' && (
                <View className="mb-4">
                  <Text className="text-xs font-semibold text-premiumTextMuted uppercase tracking-wider mb-2">Days of Week</Text>
                  <View className="flex-row justify-between">
                    {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((day, idx) => {
                      const isSelected = selectedDays.includes(idx);
                      return (
                        <TouchableOpacity
                          key={idx}
                          onPress={() => toggleDaySelection(idx)}
                          className={`w-9 h-9 rounded-full items-center justify-center ${isSelected ? 'bg-premiumGold' : 'bg-[#2B2723]'}`}
                        >
                          <Text className={`text-xs font-semibold ${isSelected ? 'text-premiumBg' : 'text-premiumTextMuted'}`}>{day}</Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                </View>
              )}

              <TouchableOpacity
                onPress={handleCreateHabit}
                className="bg-premiumGold py-3 rounded-xl items-center"
              >
                <Text className="text-premiumBg font-semibold">Save Habit</Text>
              </TouchableOpacity>
            </View>
          )}

          {loading ? (
            <ActivityIndicator size="large" color="#C5A880" className="mt-10" />
          ) : todayHabits.length === 0 ? (
            <View className="bg-premiumSurface border border-[#2B2723] p-8 rounded-2xl items-center mt-4">
              <Text className="text-3xl mb-2">🌱</Text>
              <Text className="text-base font-semibold text-white">No habits for today</Text>
              <Text className="text-sm text-premiumTextMuted text-center mt-1">Tap the plus button to create your first habit.</Text>
            </View>
          ) : (
            todayHabits.map((habit) => (
              <HabitCard
                key={habit.id}
                name={habit.name}
                iconName={habit.icon || 'habit'}
                reminderTime={habit.reminderTime}
                scheduleLabel={getHabitScheduleLabel(habit)}
                currentStreak={habit.stats?.currentStreak || 0}
                statuses={getDotStatuses(habit.id, habit.stats?.currentStreak || 0)}
                completionStatus={(habit as any).completedToday ? 'completed' : 'pending'}
                onToggleComplete={() => handleToggleCheckIn(habit)}
              />
            ))
          )}
        </View>
      </ScrollView>

      {/* Before You Begin Ritual Modal */}
      <Modal
        visible={showRitual}
        animationType="slide"
        presentationStyle="fullScreen"
        onRequestClose={() => setShowRitual(false)}
      >
        <View className="flex-1 bg-[#12110E] px-6 justify-center">
          {ritualStep === 1 ? (
            <View className="items-center">
              <Text className="text-3xl text-[#C5A880] font-bold mb-4">Before you begin...</Text>
              <Text className="text-lg text-white text-center mb-2 font-medium">
                Take a moment to remember why you're showing up today.
              </Text>
              <Text className="text-base text-premiumTextMuted text-center mb-8">
                Today's promise starts with one intentional decision.
              </Text>
              
              <TouchableOpacity
                onPress={() => setRitualStep(2)}
                className="w-full bg-premiumGold py-4 rounded-xl items-center"
              >
                <Text className="text-premiumBg font-bold text-base">Continue</Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                onPress={() => setShowRitual(false)}
                className="mt-4"
              >
                <Text className="text-premiumTextMuted text-sm">Cancel</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <View>
              <Text className="text-sm font-bold text-premiumTextMuted uppercase tracking-widest mb-3">Daily Reflection</Text>
              <Text className="text-2xl text-white font-semibold mb-6">{currentPrompt}</Text>
              
              <TextInput
                multiline
                numberOfLines={4}
                maxLength={250}
                placeholder="Type your reflection here (optional)..."
                placeholderTextColor="#8A8276"
                value={reflectionInput}
                onChangeText={(text) => {
                  setReflectionInput(text);
                  saveDraftText(text);
                }}
                className="bg-[#1E1C18] border border-[#2B2723] rounded-2xl p-4 text-white text-base mb-2 h-32"
                style={{ textAlignVertical: 'top' }}
              />
              
              <Text className="text-right text-xs text-premiumTextMuted mb-8">
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
                className="bg-premiumGold py-4 rounded-xl items-center mb-4"
              >
                <Text className="text-premiumBg font-bold text-base">Begin Today</Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                onPress={() => setShowRitual(false)}
                className="items-center"
              >
                <Text className="text-premiumTextMuted text-sm">Close and Save Draft</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      </Modal>

      {/* See All Habits Modal */}
      <Modal
        visible={showAllHabits}
        animationType="slide"
        presentationStyle="fullScreen"
        onRequestClose={() => setShowAllHabits(false)}
      >
        <View className="flex-1 bg-[#12110E]">
          {/* Header */}
          <View className="px-6 pt-16 pb-4 border-b border-[#2B2723] flex-row justify-between items-center bg-[#12110E]">
            <Text className="text-xl font-bold text-white">All Today's Habits</Text>
            <TouchableOpacity onPress={() => setShowAllHabits(false)} className="px-3 py-2 bg-[#2B2723] rounded-lg">
              <Text className="text-premiumGold font-semibold text-sm">Close</Text>
            </TouchableOpacity>
          </View>

          {/* List of Habits */}
          <ScrollView className="flex-1 px-6 pt-6" showsVerticalScrollIndicator={false}>
            {loading ? (
              <ActivityIndicator size="large" color="#C5A880" className="mt-10" />
            ) : todayHabits.length === 0 ? (
              <View className="bg-premiumSurface border border-[#2B2723] p-8 rounded-2xl items-center mt-4">
                <Text className="text-3xl mb-2">🌱</Text>
                <Text className="text-base font-semibold text-white">No habits for today</Text>
              </View>
            ) : (
              todayHabits.map((habit) => (
                <HabitCard
                  key={habit.id}
                  name={habit.name}
                  iconName={habit.icon || 'habit'}
                  reminderTime={habit.reminderTime}
                  scheduleLabel={getHabitScheduleLabel(habit)}
                  currentStreak={habit.stats?.currentStreak || 0}
                  statuses={getDotStatuses(habit.id, habit.stats?.currentStreak || 0)}
                  completionStatus={(habit as any).completedToday ? 'completed' : 'pending'}
                  onToggleComplete={() => handleToggleCheckIn(habit)}
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
        className="absolute bottom-6 right-6 w-14 h-14 bg-premiumGold rounded-full justify-center items-center shadow-lg"
      >
        <Text className="text-3xl text-premiumBg font-bold">+</Text>
      </TouchableOpacity>
    </View>
  );
}
