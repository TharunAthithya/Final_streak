import React, { useEffect, useState } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  SafeAreaView,
  StatusBar,
  TextInput,
  ScrollView,
  ActivityIndicator,
  Alert,
  Switch,
} from 'react-native';
import { Colors, Spacing, Radii, Typography } from '@streak/design-tokens';
import { useAuthStore } from './src/store/auth-store';
import { useNavigationStore, ScreenName, TabName } from './src/store/navigation-store';
import { useSyncStore } from './src/store/sync-store';

export default function App() {
  const { token, user, loading, error, signIn, signUp, initAuth, signOut, updateUser, deleteUserAccount, apiClient } = useAuthStore();
  const { currentScreen, currentTab, params, navigate, setTab, goBack } = useNavigationStore();
  const { pendingQueue, loadQueue, enqueueCheckIn, syncQueue, clearQueue } = useSyncStore();

  // Simulated Offline Toggle to allow runtime verification of offline mutation replay
  const [isOffline, setIsOffline] = useState(false);

  // Local data states
  const [habits, setHabits] = useState<any[]>([]);
  const [rooms, setRooms] = useState<any[]>([]);
  const [activities, setActivities] = useState<any[]>([]);
  const [roomDetails, setRoomDetails] = useState<any | null>(null);
  const [leaderboard, setLeaderboard] = useState<any[]>([]);
  const [loadingData, setLoadingData] = useState(false);

  // Form states
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [username, setUsername] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [habitName, setHabitName] = useState('');
  const [scheduleType, setScheduleType] = useState<'DAILY' | 'SPECIFIC_DAYS'>('DAILY');
  const [roomName, setRoomName] = useState('');
  const [roomDesc, setRoomDesc] = useState('');
  const [roomInviteCode, setRoomInviteCode] = useState('');
  const [targetName, setTargetName] = useState('');

  useEffect(() => {
    initAuth().then(() => {
      loadQueue();
    });
  }, []);

  // Re-fetch data whenever screen/tab changes
  useEffect(() => {
    if (token) {
      fetchData();
    }
  }, [token, currentScreen, currentTab, params, isOffline]);

  // Sync Queue automatically when coming back online
  useEffect(() => {
    if (!isOffline && pendingQueue.length > 0) {
      handleSync();
    }
  }, [isOffline, pendingQueue]);

  const fetchData = async () => {
    if (isOffline) return;
    setLoadingData(true);
    try {
      if (currentScreen === 'MAIN' && currentTab === 'TODAY') {
        const data = await apiClient.getHabits();
        setHabits(data);
      } else if (currentScreen === 'MAIN' && currentTab === 'ROOMS') {
        const data = await apiClient.getRooms();
        setRooms(data);
      } else if (currentScreen === 'MAIN' && currentTab === 'ACTIVITY') {
        // Fetch public activities or notifications
        setActivities([]);
      } else if (currentScreen === 'ROOM_DETAIL' && params.roomId) {
        const details = await apiClient.getRoomDetails(params.roomId);
        setRoomDetails(details);
        const acts = await apiClient.getRoomActivity(params.roomId);
        setActivities(acts);
        const board = await apiClient.getRoomLeaderboard(params.roomId);
        setLeaderboard(board);
      }
    } catch (e: any) {
      console.warn('Fetch data error:', e.message);
    } finally {
      setLoadingData(false);
    }
  };

  const handleSync = async () => {
    try {
      await syncQueue(apiClient);
      fetchData();
    } catch (e: any) {
      console.warn('Sync failed:', e.message);
    }
  };

  const handleCheckIn = async (habitId: string) => {
    const todayStr = new Date().toISOString().split('T')[0];
    const key = `mobile-idemp-${habitId}-${todayStr}-${Date.now()}`;
    const tz = 'UTC';

    if (isOffline) {
      // Queue offline
      await enqueueCheckIn(habitId, todayStr, tz, key);
      Alert.alert('Offline Mode', 'Check-in saved locally. Will sync when online.');
    } else {
      try {
        await apiClient.checkInHabit(habitId, {
          localDate: todayStr,
          timezoneAtCompletion: tz,
          idempotencyKey: key,
        });
        fetchData();
      } catch (e: any) {
        Alert.alert('Check-In Failed', e.message);
      }
    }
  };

  const handleCreateHabit = async () => {
    if (!habitName.trim()) return;
    try {
      await apiClient.createHabit({
        name: habitName,
        scheduleType,
        timezone: 'UTC',
        startDate: new Date().toISOString().split('T')[0],
      });
      setHabitName('');
      navigate('MAIN');
    } catch (e: any) {
      Alert.alert('Error', e.message);
    }
  };

  const handleCreateRoom = async () => {
    if (!roomName.trim()) return;
    try {
      await apiClient.createRoom({
        name: roomName,
        description: roomDesc,
        visibility: 'PUBLIC',
      });
      setRoomName('');
      setRoomDesc('');
      navigate('MAIN');
    } catch (e: any) {
      Alert.alert('Error', e.message);
    }
  };

  const handleJoinRoom = async () => {
    if (!roomInviteCode.trim()) return;
    try {
      await apiClient.joinRoom({ inviteCode: roomInviteCode.toUpperCase() });
      setRoomInviteCode('');
      navigate('MAIN');
    } catch (e: any) {
      Alert.alert('Error', e.message);
    }
  };

  const handleCreateRoomHabit = async () => {
    if (!targetName.trim() || !roomDetails) return;
    try {
      await apiClient.createRoomHabit(roomDetails.id, targetName);
      setTargetName('');
      fetchData();
    } catch (e: any) {
      Alert.alert('Error', e.message);
    }
  };

  const handleLinkHabit = async (roomHabitId: string, personalHabitId: string) => {
    if (!roomDetails) return;
    try {
      await apiClient.linkPersonalHabit(roomDetails.id, roomHabitId, personalHabitId);
      fetchData();
    } catch (e: any) {
      Alert.alert('Error', e.message);
    }
  };

  const handleUnlinkHabit = async (roomHabitId: string) => {
    if (!roomDetails) return;
    try {
      await apiClient.unlinkPersonalHabit(roomDetails.id, roomHabitId);
      fetchData();
    } catch (e: any) {
      Alert.alert('Error', e.message);
    }
  };

  const handleReact = async (actId: string, emoji: string) => {
    try {
      await apiClient.reactToActivity(actId, emoji);
      fetchData();
    } catch (e: any) {
      console.warn('React error:', e.message);
    }
  };

  // --- Rendering Helpers ---

  if (loading) {
    return (
      <SafeAreaView style={styles.centered}>
        <ActivityIndicator size="large" color={Colors.primary} />
        <Text style={styles.loadingText}>Loading Streak...</Text>
      </SafeAreaView>
    );
  }

  // Welcome Screen
  if (!token) {
    if (currentScreen === 'SIGNIN') {
      return (
        <SafeAreaView style={styles.authContainer}>
          <View style={styles.card}>
            <Text style={styles.title}>Welcome Back</Text>
            <Text style={styles.subtitle}>Enter credentials to access account</Text>
            {error && <Text style={styles.errorText}>{error}</Text>}
            <TextInput
              style={styles.input}
              placeholder="Email address"
              placeholderTextColor={Colors.textMuted}
              value={email}
              onChangeText={setEmail}
              autoCapitalize="none"
            />
            <TextInput
              style={styles.input}
              placeholder="Password"
              placeholderTextColor={Colors.textMuted}
              value={password}
              onChangeText={setPassword}
              secureTextEntry
            />
            <TouchableOpacity style={styles.button} onPress={() => signIn(email, password)}>
              <Text style={styles.buttonText}>Sign In</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => navigate('WELCOME')}>
              <Text style={styles.linkText}>Back</Text>
            </TouchableOpacity>
          </View>
        </SafeAreaView>
      );
    }

    if (currentScreen === 'SIGNUP') {
      return (
        <SafeAreaView style={styles.authContainer}>
          <View style={styles.card}>
            <Text style={styles.title}>Create Account</Text>
            <Text style={styles.subtitle}>Build strong routines silently</Text>
            {error && <Text style={styles.errorText}>{error}</Text>}
            <TextInput
              style={styles.input}
              placeholder="Full Name"
              placeholderTextColor={Colors.textMuted}
              value={displayName}
              onChangeText={setDisplayName}
            />
            <TextInput
              style={styles.input}
              placeholder="Username"
              placeholderTextColor={Colors.textMuted}
              value={username}
              onChangeText={setUsername}
              autoCapitalize="none"
            />
            <TextInput
              style={styles.input}
              placeholder="Email address"
              placeholderTextColor={Colors.textMuted}
              value={email}
              onChangeText={setEmail}
              autoCapitalize="none"
            />
            <TextInput
              style={styles.input}
              placeholder="Password"
              placeholderTextColor={Colors.textMuted}
              value={password}
              onChangeText={setPassword}
              secureTextEntry
            />
            <TouchableOpacity
              style={styles.button}
              onPress={() => signUp(email, password, username, displayName)}
            >
              <Text style={styles.buttonText}>Register</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => navigate('WELCOME')}>
              <Text style={styles.linkText}>Back</Text>
            </TouchableOpacity>
          </View>
        </SafeAreaView>
      );
    }

    return (
      <SafeAreaView style={styles.authContainer}>
        <View style={styles.card}>
          <Text style={styles.fireEmoji}>🔥</Text>
          <Text style={styles.title}>Streak</Text>
          <Text style={styles.tagline}>Quiet accountability.</Text>
          <Text style={styles.description}>
            Instant progress tracking, shared goals, zero social noise.
          </Text>
          <TouchableOpacity style={styles.button} onPress={() => navigate('SIGNUP')}>
            <Text style={styles.buttonText}>Get Started</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.outlineButton} onPress={() => navigate('SIGNIN')}>
            <Text style={styles.outlineButtonText}>Log In</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  // MAIN Tab Layout
  const renderTabContent = () => {
    switch (currentTab) {
      case 'TODAY':
        return (
          <ScrollView contentContainerStyle={styles.scroll}>
            <View style={styles.header}>
              <View>
                <Text style={styles.welcomeText}>Hey, {user?.displayName || 'Developer'}</Text>
                <Text style={styles.dateText}>{new Date().toLocaleDateString(undefined, { weekday: 'long', month: 'short', day: 'numeric' })}</Text>
              </View>
              <TouchableOpacity style={styles.addHabitButton} onPress={() => navigate('HABIT_CREATE')}>
                <Text style={styles.addHabitText}>+ New</Text>
              </TouchableOpacity>
            </View>

            {/* Offline Sync Banner */}
            {pendingQueue.length > 0 && (
              <View style={styles.syncBanner}>
                <Text style={styles.syncBannerText}>🔄 {pendingQueue.length} Check-ins pending offline sync</Text>
                <TouchableOpacity onPress={handleSync} disabled={isOffline}>
                  <Text style={[styles.syncActionText, isOffline && { opacity: 0.5 }]}>Sync Now</Text>
                </TouchableOpacity>
              </View>
            )}

            {/* Habits List */}
            <Text style={styles.sectionTitle}>TODAY'S ROUTINE</Text>
            {habits.length === 0 ? (
              <View style={styles.emptyContainer}>
                <Text style={styles.emptyText}>No habits defined. Add your first habit target to begin!</Text>
              </View>
            ) : (
              habits.map((habit) => (
                <View key={habit.id} style={styles.habitRow}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.habitName}>{habit.name}</Text>
                    <Text style={styles.habitSub}>🔥 {habit.stats?.currentStreak || 0} day streak</Text>
                  </View>
                  <TouchableOpacity style={styles.checkButton} onPress={() => handleCheckIn(habit.id)}>
                    <Text style={styles.checkButtonText}>✓</Text>
                  </TouchableOpacity>
                </View>
              ))
            )}
          </ScrollView>
        );

      case 'ROOMS':
        return (
          <ScrollView contentContainerStyle={styles.scroll}>
            <View style={styles.header}>
              <Text style={styles.title}>Accountability Rooms</Text>
              <View style={{ flexDirection: 'row' }}>
                <TouchableOpacity style={styles.smallButton} onPress={() => navigate('ROOM_CREATE')}>
                  <Text style={styles.buttonText}>Create</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[styles.smallButton, { marginLeft: 8 }]} onPress={() => navigate('ROOM_JOIN')}>
                  <Text style={styles.buttonText}>Join</Text>
                </TouchableOpacity>
              </View>
            </View>

            {rooms.length === 0 ? (
              <View style={styles.emptyContainer}>
                <Text style={styles.emptyText}>You haven't joined any rooms yet.</Text>
              </View>
            ) : (
              rooms.map((room) => (
                <TouchableOpacity
                  key={room.id}
                  style={styles.roomCard}
                  onPress={() => navigate('ROOM_DETAIL', { roomId: room.id })}
                >
                  <Text style={styles.roomTitle}>{room.name}</Text>
                  <Text style={styles.roomDesc}>{room.description || 'No description provided'}</Text>
                  <Text style={styles.roomMeta}>👥 {room.members?.length || 1} members</Text>
                </TouchableOpacity>
              ))
            )}
          </ScrollView>
        );

      case 'ACTIVITY':
        return (
          <ScrollView contentContainerStyle={styles.scroll}>
            <Text style={styles.title}>Global Stream</Text>
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyText}>Select a Room from the Rooms tab to view specific accountability activity feeds.</Text>
            </View>
          </ScrollView>
        );

      case 'YOU':
        return (
          <ScrollView contentContainerStyle={styles.scroll}>
            <View style={styles.profileHeader}>
              <Text style={styles.avatarLarge}>👤</Text>
              <Text style={styles.profileName}>{user?.displayName}</Text>
              <Text style={styles.profileEmail}>@{user?.username || 'user'}</Text>

              <View style={styles.xpCard}>
                <Text style={styles.xpText}>Level {user?.level || 1} — {user?.xp || 0} XP</Text>
                <View style={styles.xpBarContainer}>
                  <View style={[styles.xpBarFill, { width: `${(user?.xp || 0) % 100}%` }]} />
                </View>
              </View>
            </View>

            <TouchableOpacity style={styles.outlineButton} onPress={() => navigate('SETTINGS')}>
              <Text style={styles.outlineButtonText}>Settings & Account</Text>
            </TouchableOpacity>
          </ScrollView>
        );
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" />

      {/* Network Sim Header */}
      <View style={styles.offlineSimRow}>
        <Text style={styles.offlineSimText}>Simulate Offline Mode:</Text>
        <Switch value={isOffline} onValueChange={setIsOffline} />
      </View>

      {/* Primary Tab Content / Screen Router */}
      <View style={{ flex: 1 }}>
        {currentScreen === 'MAIN' && renderTabContent()}

        {currentScreen === 'HABIT_CREATE' && (
          <View style={styles.authContainer}>
            <View style={styles.card}>
              <Text style={styles.title}>Create Habit</Text>
              <TextInput
                style={styles.input}
                placeholder="E.g., Read 30 mins"
                placeholderTextColor={Colors.textMuted}
                value={habitName}
                onChangeText={setHabitName}
              />
              <View style={styles.row}>
                <TouchableOpacity
                  style={[styles.smallButton, scheduleType === 'DAILY' && { backgroundColor: Colors.primary }]}
                  onPress={() => setScheduleType('DAILY')}
                >
                  <Text style={styles.buttonText}>Daily</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.smallButton, { marginLeft: 8 }, scheduleType === 'SPECIFIC_DAYS' && { backgroundColor: Colors.primary }]}
                  onPress={() => setScheduleType('SPECIFIC_DAYS')}
                >
                  <Text style={styles.buttonText}>Specific Days</Text>
                </TouchableOpacity>
              </View>
              <TouchableOpacity style={[styles.button, { marginTop: 16 }]} onPress={handleCreateHabit}>
                <Text style={styles.buttonText}>Build Habit</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={goBack}>
                <Text style={styles.linkText}>Cancel</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {currentScreen === 'ROOM_CREATE' && (
          <View style={styles.authContainer}>
            <View style={styles.card}>
              <Text style={styles.title}>Create Room</Text>
              <TextInput
                style={styles.input}
                placeholder="Room Name"
                placeholderTextColor={Colors.textMuted}
                value={roomName}
                onChangeText={setRoomName}
              />
              <TextInput
                style={styles.input}
                placeholder="Description"
                placeholderTextColor={Colors.textMuted}
                value={roomDesc}
                onChangeText={setRoomDesc}
              />
              <TouchableOpacity style={styles.button} onPress={handleCreateRoom}>
                <Text style={styles.buttonText}>Create Room</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={goBack}>
                <Text style={styles.linkText}>Cancel</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {currentScreen === 'ROOM_JOIN' && (
          <View style={styles.authContainer}>
            <View style={styles.card}>
              <Text style={styles.title}>Join Room</Text>
              <TextInput
                style={styles.input}
                placeholder="Invite Code (e.g., AB12CD)"
                placeholderTextColor={Colors.textMuted}
                value={roomInviteCode}
                onChangeText={setRoomInviteCode}
                autoCapitalize="characters"
              />
              <TouchableOpacity style={styles.button} onPress={handleJoinRoom}>
                <Text style={styles.buttonText}>Join Room</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={goBack}>
                <Text style={styles.linkText}>Cancel</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {currentScreen === 'ROOM_DETAIL' && roomDetails && (
          <ScrollView contentContainerStyle={styles.scroll}>
            <TouchableOpacity onPress={goBack} style={styles.backRow}>
              <Text style={styles.backRowText}>← Back to Rooms</Text>
            </TouchableOpacity>

            <Text style={styles.title}>{roomDetails.name}</Text>
            <Text style={styles.roomDesc}>{roomDetails.description}</Text>
            <Text style={styles.roomInviteTag}>Code: {roomDetails.inviteCode}</Text>

            {/* Room Targets */}
            <Text style={styles.sectionTitle}>ACCOUNTABILITY TARGETS</Text>
            {roomDetails.roomHabits?.map((rh: any) => (
              <View key={rh.id} style={styles.roomHabitBox}>
                <Text style={styles.roomHabitName}>{rh.name}</Text>
                {/* Check if linked */}
                <TouchableOpacity
                  style={styles.linkButton}
                  onPress={() => {
                    // Pull user's first habit as a mock link for dev simplicity
                    // In real UI we'd display a list modal
                    Alert.alert('Link Habit', 'Link your personal habits to this target.', [
                      { text: 'Cancel' },
                      { text: 'Mock Link Habit', onPress: () => handleLinkHabit(rh.id, habits[0]?.id) },
                      { text: 'Unlink', onPress: () => handleUnlinkHabit(rh.id) },
                    ]);
                  }}
                >
                  <Text style={styles.linkButtonText}>Configure Link</Text>
                </TouchableOpacity>
              </View>
            ))}

            {/* Add Target */}
            <View style={styles.targetInputBox}>
              <TextInput
                style={styles.input}
                placeholder="Define room habit target..."
                placeholderTextColor={Colors.textMuted}
                value={targetName}
                onChangeText={setTargetName}
              />
              <TouchableOpacity style={styles.button} onPress={handleCreateRoomHabit}>
                <Text style={styles.buttonText}>Add Target</Text>
              </TouchableOpacity>
            </View>

            {/* Feed */}
            <Text style={styles.sectionTitle}>ACTIVITY FEED</Text>
            {activities.map((act) => (
              <View key={act.id} style={styles.activityCard}>
                <Text style={styles.actMsg}>{act.message}</Text>
                <View style={styles.row}>
                  <TouchableOpacity style={styles.reactEmoji} onPress={() => handleReact(act.id, 'fire')}>
                    <Text>🔥 {act.reactions?.find((r: any) => r.type === 'fire')?.count || 0}</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={[styles.reactEmoji, { marginLeft: 8 }]} onPress={() => handleReact(act.id, 'clap')}>
                    <Text>👏 {act.reactions?.find((r: any) => r.type === 'clap')?.count || 0}</Text>
                  </TouchableOpacity>
                </View>
              </View>
            ))}

            {/* Rankings */}
            <Text style={styles.sectionTitle}>ROOM LEADERBOARD</Text>
            {leaderboard.map((item) => (
              <View key={item.userId} style={styles.rankRow}>
                <Text style={styles.rankText}>#{item.rank} {item.displayName}</Text>
                <Text style={styles.scoreText}>{item.score} done</Text>
              </View>
            ))}

            {/* Leave Room Button */}
            <TouchableOpacity
              style={[styles.outlineButton, { borderColor: Colors.error, marginTop: 32 }]}
              onPress={() => {
                apiClient.leaveRoom(roomDetails.id).then(() => navigate('MAIN'));
              }}
            >
              <Text style={[styles.outlineButtonText, { color: Colors.error }]}>Leave Room</Text>
            </TouchableOpacity>
          </ScrollView>
        )}

        {currentScreen === 'SETTINGS' && (
          <ScrollView contentContainerStyle={styles.scroll}>
            <TouchableOpacity onPress={goBack} style={styles.backRow}>
              <Text style={styles.backRowText}>← Back</Text>
            </TouchableOpacity>

            <Text style={styles.title}>Settings</Text>

            <TextInput
              style={styles.input}
              placeholder="Display Name"
              placeholderTextColor={Colors.textMuted}
              value={displayName}
              onChangeText={setDisplayName}
            />
            <TouchableOpacity
              style={styles.button}
              onPress={() => updateUser(displayName, '', 'UTC').then(() => Alert.alert('Saved', 'Profile details updated.'))}
            >
              <Text style={styles.buttonText}>Save Changes</Text>
            </TouchableOpacity>

            <TouchableOpacity style={[styles.outlineButton, { marginTop: 32 }]} onPress={signOut}>
              <Text style={styles.outlineButtonText}>Log Out</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.button, { backgroundColor: Colors.error, marginTop: 16 }]}
              onPress={() => {
                Alert.alert('Delete Account', 'This is permanent and cannot be undone.', [
                  { text: 'Cancel' },
                  { text: 'Delete Permanently', onPress: deleteUserAccount },
                ]);
              }}
            >
              <Text style={styles.buttonText}>Delete Account</Text>
            </TouchableOpacity>
          </ScrollView>
        )}
      </View>

      {/* Navigation Tabs Bar */}
      {currentScreen === 'MAIN' && (
        <View style={styles.tabsRow}>
          <TouchableOpacity style={styles.tabButton} onPress={() => setTab('TODAY')}>
            <Text style={[styles.tabText, currentTab === 'TODAY' && styles.tabActiveText]}>Today</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.tabButton} onPress={() => setTab('ROOMS')}>
            <Text style={[styles.tabText, currentTab === 'ROOMS' && styles.tabActiveText]}>Rooms</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.tabButton} onPress={() => setTab('ACTIVITY')}>
            <Text style={[styles.tabText, currentTab === 'ACTIVITY' && styles.tabActiveText]}>Activity</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.tabButton} onPress={() => setTab('YOU')}>
            <Text style={[styles.tabText, currentTab === 'YOU' && styles.tabActiveText]}>You</Text>
          </TouchableOpacity>
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  scroll: {
    padding: Spacing.lg,
  },
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.background,
  },
  loadingText: {
    marginTop: Spacing.md,
    color: Colors.textSecondary,
    fontSize: Typography.sizes.body,
  },
  authContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: Spacing.xl,
  },
  card: {
    backgroundColor: Colors.surface,
    borderRadius: Radii.lg,
    padding: Spacing.xl,
    borderWidth: 1,
    borderColor: Colors.border,
    width: '100%',
    alignItems: 'center',
  },
  fireEmoji: {
    fontSize: 48,
    marginBottom: Spacing.lg,
  },
  title: {
    fontSize: Typography.sizes.pageTitle,
    fontWeight: Typography.weights.bold as any,
    color: Colors.textPrimary,
    marginBottom: Spacing.xs,
  },
  subtitle: {
    fontSize: Typography.sizes.secondary,
    color: Colors.textSecondary,
    marginBottom: Spacing.xl,
  },
  tagline: {
    fontSize: Typography.sizes.secondary,
    fontWeight: Typography.weights.semibold as any,
    color: Colors.primary,
    marginBottom: Spacing.md,
  },
  description: {
    fontSize: Typography.sizes.body,
    color: Colors.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: Spacing.xl,
  },
  button: {
    backgroundColor: Colors.primary,
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.xl,
    borderRadius: Radii.md,
    width: '100%',
    alignItems: 'center',
  },
  buttonText: {
    color: Colors.surface,
    fontSize: Typography.sizes.body,
    fontWeight: Typography.weights.semibold as any,
  },
  outlineButton: {
    borderWidth: 1,
    borderColor: Colors.border,
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.xl,
    borderRadius: Radii.md,
    width: '100%',
    alignItems: 'center',
    marginTop: Spacing.md,
  },
  outlineButtonText: {
    color: Colors.textPrimary,
    fontSize: Typography.sizes.body,
    fontWeight: Typography.weights.semibold as any,
  },
  linkText: {
    color: Colors.primary,
    marginTop: Spacing.md,
    fontSize: Typography.sizes.secondary,
  },
  input: {
    width: '100%',
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: Radii.md,
    padding: Spacing.md,
    marginBottom: Spacing.md,
    fontSize: Typography.sizes.body,
    color: Colors.textPrimary,
  },
  errorText: {
    color: Colors.error,
    marginBottom: Spacing.md,
    textAlign: 'center',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.xl,
  },
  welcomeText: {
    fontSize: Typography.sizes.pageTitle,
    fontWeight: Typography.weights.bold as any,
    color: Colors.textPrimary,
  },
  dateText: {
    fontSize: Typography.sizes.secondary,
    color: Colors.textSecondary,
  },
  addHabitButton: {
    backgroundColor: Colors.primarySoft,
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.md,
    borderRadius: Radii.md,
  },
  addHabitText: {
    color: Colors.primary,
    fontWeight: Typography.weights.semibold as any,
  },
  sectionTitle: {
    fontSize: Typography.sizes.sectionTitle,
    fontWeight: Typography.weights.bold as any,
    color: Colors.textSecondary,
    marginBottom: Spacing.md,
    marginTop: Spacing.lg,
  },
  habitRow: {
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: Radii.md,
    padding: Spacing.lg,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  habitName: {
    fontSize: Typography.sizes.habitName,
    fontWeight: Typography.weights.semibold as any,
    color: Colors.textPrimary,
  },
  habitSub: {
    fontSize: Typography.sizes.secondary,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  checkButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: Colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.primarySoft,
  },
  checkButtonText: {
    fontSize: 20,
    color: Colors.primary,
    fontWeight: Typography.weights.bold as any,
  },
  emptyContainer: {
    padding: Spacing.xl,
    alignItems: 'center',
  },
  emptyText: {
    color: Colors.textSecondary,
    textAlign: 'center',
    fontSize: Typography.sizes.body,
  },
  tabsRow: {
    flexDirection: 'row',
    borderTopWidth: 1,
    borderColor: Colors.border,
    height: 60,
    backgroundColor: Colors.surface,
  },
  tabButton: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabText: {
    fontSize: Typography.sizes.secondary,
    color: Colors.textSecondary,
  },
  tabActiveText: {
    color: Colors.primary,
    fontWeight: Typography.weights.bold as any,
  },
  roomCard: {
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: Radii.md,
    padding: Spacing.lg,
    marginBottom: Spacing.md,
  },
  roomTitle: {
    fontSize: Typography.sizes.habitName,
    fontWeight: Typography.weights.semibold as any,
    color: Colors.textPrimary,
  },
  roomDesc: {
    fontSize: Typography.sizes.body,
    color: Colors.textSecondary,
    marginTop: Spacing.xs,
  },
  roomMeta: {
    fontSize: Typography.sizes.secondary,
    color: Colors.textMuted,
    marginTop: Spacing.sm,
  },
  smallButton: {
    backgroundColor: Colors.primarySoft,
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.md,
    borderRadius: Radii.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  offlineSimRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: Spacing.md,
    backgroundColor: Colors.surface,
    borderBottomWidth: 1,
    borderColor: Colors.border,
  },
  offlineSimText: {
    fontSize: Typography.sizes.secondary,
    fontWeight: Typography.weights.semibold as any,
    color: Colors.textPrimary,
  },
  syncBanner: {
    backgroundColor: Colors.streakSoft,
    padding: Spacing.md,
    borderRadius: Radii.md,
    marginBottom: Spacing.lg,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  syncBannerText: {
    fontSize: Typography.sizes.secondary,
    color: Colors.streakAccent,
    fontWeight: Typography.weights.semibold as any,
  },
  syncActionText: {
    color: Colors.primary,
    fontWeight: Typography.weights.bold as any,
  },
  backRow: {
    marginBottom: Spacing.lg,
  },
  backRowText: {
    color: Colors.primary,
    fontSize: Typography.sizes.body,
  },
  roomInviteTag: {
    fontSize: Typography.sizes.secondary,
    color: Colors.textMuted,
    marginTop: Spacing.xs,
  },
  roomHabitBox: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    padding: Spacing.md,
    borderRadius: Radii.md,
    borderWidth: 1,
    borderColor: Colors.border,
    marginBottom: Spacing.sm,
  },
  roomHabitName: {
    fontSize: Typography.sizes.body,
    fontWeight: Typography.weights.semibold as any,
    color: Colors.textPrimary,
  },
  linkButton: {
    backgroundColor: Colors.primarySoft,
    padding: Spacing.sm,
    borderRadius: Radii.sm,
  },
  linkButtonText: {
    color: Colors.primary,
    fontSize: Typography.sizes.secondary,
  },
  targetInputBox: {
    backgroundColor: Colors.surface,
    padding: Spacing.md,
    borderRadius: Radii.md,
    borderWidth: 1,
    borderColor: Colors.border,
    marginTop: Spacing.lg,
    marginBottom: Spacing.xl,
  },
  activityCard: {
    backgroundColor: Colors.surface,
    padding: Spacing.md,
    borderRadius: Radii.md,
    borderWidth: 1,
    borderColor: Colors.border,
    marginBottom: Spacing.sm,
  },
  actMsg: {
    fontSize: Typography.sizes.body,
    color: Colors.textPrimary,
    marginBottom: Spacing.sm,
  },
  reactEmoji: {
    backgroundColor: Colors.background,
    padding: Spacing.xs,
    borderRadius: Radii.sm,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  rankRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: Spacing.sm,
    borderBottomWidth: 1,
    borderColor: Colors.border,
  },
  rankText: {
    fontSize: Typography.sizes.body,
    color: Colors.textPrimary,
  },
  scoreText: {
    fontSize: Typography.sizes.body,
    fontWeight: Typography.weights.bold as any,
    color: Colors.primary,
  },
  profileHeader: {
    alignItems: 'center',
    padding: Spacing.xl,
    backgroundColor: Colors.surface,
    borderRadius: Radii.lg,
    borderWidth: 1,
    borderColor: Colors.border,
    marginBottom: Spacing.lg,
  },
  avatarLarge: {
    fontSize: 64,
    marginBottom: Spacing.md,
  },
  profileName: {
    fontSize: Typography.sizes.pageTitle,
    fontWeight: Typography.weights.bold as any,
    color: Colors.textPrimary,
  },
  profileEmail: {
    fontSize: Typography.sizes.body,
    color: Colors.textSecondary,
    marginBottom: Spacing.lg,
  },
  xpCard: {
    width: '100%',
    marginTop: Spacing.md,
  },
  xpText: {
    fontSize: Typography.sizes.secondary,
    fontWeight: Typography.weights.semibold as any,
    color: Colors.primary,
    marginBottom: Spacing.xs,
  },
  xpBarContainer: {
    height: 12,
    backgroundColor: Colors.background,
    borderRadius: 6,
    width: '100%',
    overflow: 'hidden',
  },
  xpBarFill: {
    height: '100%',
    backgroundColor: Colors.primary,
  },
});
