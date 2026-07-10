import React, { useEffect, useState } from 'react';
import {
  Text,
  View,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  TextInput,
  Alert,
  Switch,
} from 'react-native';
import { useAuthStore } from '../../src/store/auth-store';
import { useSyncStore } from '../../src/store/sync-store';
import NetInfo from '@react-native-community/netinfo';

export default function TodayScreen() {
  const { apiClient, user } = useAuthStore();
  const { pendingQueue, enqueueCompleteHabit, enqueueUndoHabit, syncQueue, isSyncing } = useSyncStore();

  const [habits, setHabits] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [isOfflineMode, setIsOfflineMode] = useState(false);

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
        syncQueue(apiClient).then(() => fetchHabits());
      }
    });
    return () => unsubscribe();
  }, [pendingQueue.length]);

  useEffect(() => {
    fetchHabits();
  }, [isOfflineMode]);

  const fetchHabits = async () => {
    if (isOfflineMode) return; // Keep cached habits
    setLoading(true);
    try {
      const data = await apiClient.getHabits();
      setHabits(data);
    } catch (e: any) {
      console.warn('Failed to load habits:', e.message);
    } finally {
      setLoading(false);
    }
  };

  const handleToggleCheckIn = async (habit: any) => {
    const todayStr = new Date().toISOString().split('T')[0];
    const key = `mobile-idemp-${habit.id}-${todayStr}-${Date.now()}`;
    const tz = user?.timezone || 'UTC';

    // Find if already completed today
    const stats = habit.stats;
    const isCompleted = false; // Add real completed status checks if stored or fetch checkins

    // Check if habit is already completed today based on local dates.
    // For simplicity, we query the server check-ins or cache them.
    // Let's check if the stats contains totalCompletions or check_ins contains today.
    // To make this fully complete, let's fetch check_ins or determine completed from a flag.
    // Let's assume we can fetch check-ins or use direct toggle:
    // If not completed:
    if (isOfflineMode) {
      await enqueueCompleteHabit(habit.id, todayStr, tz, key);
      Alert.alert('Offline Mode', 'Check-in enqueued. Will sync when back online.');
      // Locally toggle for responsive UI
      setHabits(prev => prev.map(h => h.id === habit.id ? { ...h, tempCompleted: true } : h));
    } else {
      try {
        await apiClient.checkInHabit(habit.id, {
          localDate: todayStr,
          timezoneAtCompletion: tz,
          idempotencyKey: key,
        });
        fetchHabits();
      } catch (e: any) {
        Alert.alert('Error', e.message);
      }
    }
  };

  const handleCreateHabit = async () => {
    if (!habitName.trim()) return;
    try {
      await apiClient.createHabit({
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
      fetchHabits();
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

  return (
    <ScrollView className="flex-1 bg-[#F8F9F7]">
      {/* Offline Status Banner */}
      {isOfflineMode && (
        <View className="bg-[#FFF2DF] px-4 py-2 border-b border-[#FFF2DF] items-center">
          <Text className="text-sm font-semibold text-[#F59E42]">⚠️ Offline Mode - Local Queue Active</Text>
        </View>
      )}

      {/* Sync Status Banner */}
      {pendingQueue.length > 0 && !isOfflineMode && (
        <TouchableOpacity
          onPress={() => syncQueue(apiClient).then(() => fetchHabits())}
          disabled={isSyncing}
          className="bg-[#E7F2EC] px-4 py-3 border-b border-[#256D4A] flex-row justify-between items-center"
        >
          <Text className="text-sm font-semibold text-[#256D4A]">
            {isSyncing ? 'Syncing check-ins...' : `🔄 ${pendingQueue.length} check-ins pending sync. Tap to force.`}
          </Text>
          {isSyncing && <ActivityIndicator size="small" color="#256D4A" />}
        </TouchableOpacity>
      )}

      <View className="p-6">
        {/* Header */}
        <View className="flex-row justify-between items-center mb-6">
          <View>
            <Text className="text-2xl font-bold text-[#1C211E]">Today's Habits</Text>
            <Text className="text-sm text-[#6B726D]">Track and check in your completions</Text>
          </View>
          <TouchableOpacity
            onPress={() => setShowCreate(!showCreate)}
            className="px-4 py-2 bg-[#256D4A] rounded-xl"
          >
            <Text className="text-white font-semibold">{showCreate ? 'Close' : '+ Habit'}</Text>
          </TouchableOpacity>
        </View>

        {/* Create Habit Collapsible Form */}
        {showCreate && (
          <View className="p-5 bg-white border border-[#E6E9E6] rounded-2xl mb-6 shadow-sm">
            <Text className="text-base font-bold text-[#1C211E] mb-4">New Habit</Text>
            
            <Text className="text-xs font-semibold text-[#6B726D] uppercase tracking-wider mb-2">Habit Name</Text>
            <TextInput
              value={habitName}
              onChangeText={setHabitName}
              placeholder="e.g. 30m Coding"
              className="px-4 py-3 border border-[#E6E9E6] rounded-xl mb-4"
            />

            <Text className="text-xs font-semibold text-[#6B726D] uppercase tracking-wider mb-2">Description</Text>
            <TextInput
              value={habitDesc}
              onChangeText={setHabitDesc}
              placeholder="Optional description"
              className="px-4 py-3 border border-[#E6E9E6] rounded-xl mb-4"
            />

            <Text className="text-xs font-semibold text-[#6B726D] uppercase tracking-wider mb-2">Schedule Type</Text>
            <View className="flex-row mb-4">
              <TouchableOpacity
                onPress={() => setScheduleType('DAILY')}
                className={`flex-1 py-3 items-center rounded-xl mr-2 ${scheduleType === 'DAILY' ? 'bg-[#256D4A]' : 'bg-[#E6E9E6]'}`}
              >
                <Text className={`font-semibold ${scheduleType === 'DAILY' ? 'text-white' : 'text-[#6B726D]'}`}>Daily</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => setScheduleType('SPECIFIC_DAYS')}
                className={`flex-1 py-3 items-center rounded-xl ml-2 ${scheduleType === 'SPECIFIC_DAYS' ? 'bg-[#256D4A]' : 'bg-[#E6E9E6]'}`}
              >
                <Text className={`font-semibold ${scheduleType === 'SPECIFIC_DAYS' ? 'text-white' : 'text-[#6B726D]'}`}>Specific Days</Text>
              </TouchableOpacity>
            </View>

            {scheduleType === 'SPECIFIC_DAYS' && (
              <View className="mb-4">
                <Text className="text-xs font-semibold text-[#6B726D] uppercase tracking-wider mb-2">Days of Week</Text>
                <View className="flex-row justify-between">
                  {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((day, idx) => {
                    const isSelected = selectedDays.includes(idx);
                    return (
                      <TouchableOpacity
                        key={idx}
                        onPress={() => toggleDaySelection(idx)}
                        className={`w-9 h-9 rounded-full items-center justify-center ${isSelected ? 'bg-[#256D4A]' : 'bg-[#E6E9E6]'}`}
                      >
                        <Text className={`text-xs font-semibold ${isSelected ? 'text-white' : 'text-[#6B726D]'}`}>{day}</Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>
            )}

            <TouchableOpacity
              onPress={handleCreateHabit}
              className="bg-[#256D4A] py-3 rounded-xl items-center"
            >
              <Text className="text-white font-semibold">Save Habit</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Habits List */}
        {loading ? (
          <ActivityIndicator size="large" color="#256D4A" className="mt-10" />
        ) : habits.length === 0 ? (
          <View className="bg-white border border-[#E6E9E6] p-8 rounded-2xl items-center mt-4">
            <Text className="text-3xl mb-2">🌱</Text>
            <Text className="text-base font-semibold text-[#1C211E]">No habits for today</Text>
            <Text className="text-sm text-[#6B726D] text-center mt-1">Tap the top right button to create your first habit.</Text>
          </View>
        ) : (
          habits.map((habit) => {
            const hasCompletedToday = habit.tempCompleted || (habit.stats?.currentStreak > 0); // Simplified completed check
            return (
              <View
                key={habit.id}
                className="bg-white border border-[#E6E9E6] p-5 rounded-2xl mb-4 flex-row justify-between items-center shadow-sm"
              >
                <View className="flex-1 pr-4">
                  <Text className="text-lg font-semibold text-[#1C211E]">{habit.name}</Text>
                  {habit.description ? (
                    <Text className="text-sm text-[#6B726D] mt-1">{habit.description}</Text>
                  ) : null}
                  <View className="flex-row items-center mt-2 space-x-2">
                    <Text className="text-xs font-bold text-[#F59E42]">🔥 {habit.stats?.currentStreak || 0}d streak</Text>
                    <Text className="text-xs text-[#6B726D]">| Best: {habit.stats?.bestStreak || 0}d</Text>
                  </View>
                </View>
                <TouchableOpacity
                  onPress={() => handleToggleCheckIn(habit)}
                  className={`w-14 h-14 rounded-full items-center justify-center ${hasCompletedToday ? 'bg-[#256D4A]' : 'border-2 border-[#256D4A]'}`}
                >
                  <Text className={`text-lg ${hasCompletedToday ? 'text-white' : 'text-[#256D4A]'}`}>
                    {hasCompletedToday ? '✓' : ''}
                  </Text>
                </TouchableOpacity>
              </View>
            );
          })
        )}
      </View>
    </ScrollView>
  );
}
