import React, { useState, useEffect } from 'react';
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  TextInput,
  ScrollView,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { Icon } from '../ui/Icon';
import { StreakApiClient } from '@streak/api-client';
import { HabitResponse, ScheduleType } from '@streak/contracts';

interface CreateRoomModalProps {
  visible: boolean;
  userHabits: HabitResponse[];
  apiClient: StreakApiClient;
  onClose: () => void;
  onRoomCreated: (newRoom: any) => void;
}

interface SelectedUserItem {
  id: string;
  username: string;
  displayName: string;
}

export const CreateRoomModal: React.FC<CreateRoomModalProps> = ({
  visible,
  userHabits,
  apiClient,
  onClose,
  onRoomCreated,
}) => {
  const [step, setStep] = useState<1 | 2 | 3>(1);

  // Step 1: Habits selection
  const [selectedHabitNames, setSelectedHabitNames] = useState<string[]>([]);

  // Step 2: Member invites
  const [usernameSearch, setUsernameSearch] = useState('');
  const [searching, setSearching] = useState(false);
  const [searchResults, setSearchResults] = useState<SelectedUserItem[]>([]);
  const [invitedMembers, setInvitedMembers] = useState<SelectedUserItem[]>([]);

  // Step 3: Room details
  const [roomName, setRoomName] = useState('');
  const [goalDescription, setGoalDescription] = useState('');
  const [durationType, setDurationType] = useState<'7_DAYS' | '14_DAYS' | '30_DAYS' | '60_DAYS' | 'CUSTOM' | 'PERMANENT'>('30_DAYS');
  const [durationDays, setDurationDays] = useState<number | undefined>(30);
  const [customDaysInput, setCustomDaysInput] = useState('45');
  const [creating, setCreating] = useState(false);

  // Reset state when modal opens
  useEffect(() => {
    if (visible) {
      setStep(1);
      // Pre-select creator habits by default if available
      const initialNames = userHabits.length > 0
        ? userHabits.map((h) => h.name)
        : [];
      setSelectedHabitNames(initialNames);
      setUsernameSearch('');
      setSearchResults([]);
      setInvitedMembers([]);
      setRoomName('');
      setGoalDescription('');
      setDurationType('30_DAYS');
      setDurationDays(30);
      setCustomDaysInput('45');
    }
  }, [visible, userHabits]);

  // Username search effect
  useEffect(() => {
    const trimmed = usernameSearch.trim().replace(/^@/, '');
    if (trimmed.length >= 2) {
      setSearching(true);
      const timer = setTimeout(async () => {
        try {
          const results = await apiClient.searchUsersByUsername(trimmed);
          setSearchResults(
            results.map((u: any) => ({
              id: u.id,
              username: u.username || 'user',
              displayName: u.displayName || u.username || 'User',
            }))
          );
        } catch (e) {
          setSearchResults([]);
        } finally {
          setSearching(false);
        }
      }, 300);
      return () => clearTimeout(timer);
    } else {
      setSearchResults([]);
    }
  }, [usernameSearch]);

  const toggleHabitSelection = (habitName: string) => {
    setSelectedHabitNames((prev) =>
      prev.includes(habitName)
        ? prev.filter((name) => name !== habitName)
        : [...prev, habitName]
    );
  };

  const addInvitedMember = (user: SelectedUserItem) => {
    if (!invitedMembers.some((m) => m.id === user.id)) {
      setInvitedMembers((prev) => [...prev, user]);
    }
    setUsernameSearch('');
    setSearchResults([]);
  };

  const removeInvitedMember = (userId: string) => {
    setInvitedMembers((prev) => prev.filter((m) => m.id !== userId));
  };

  const handleSelectDurationOption = (type: '7_DAYS' | '14_DAYS' | '30_DAYS' | '60_DAYS' | 'CUSTOM' | 'PERMANENT', days?: number) => {
    setDurationType(type);
    if (type === 'PERMANENT') {
      setDurationDays(undefined);
    } else if (type === 'CUSTOM') {
      const parsed = parseInt(customDaysInput, 10);
      setDurationDays(isNaN(parsed) ? 45 : parsed);
    } else {
      setDurationDays(days);
    }
  };

  const handleCreateRoom = async () => {
    if (selectedHabitNames.length === 0) {
      Alert.alert('Habits Required', 'You must select at least one personal habit for this room.');
      return;
    }

    if (!roomName.trim()) {
      Alert.alert('Room Name Required', 'Please enter a name for your room.');
      return;
    }

    let finalDays: number | undefined = undefined;
    if (durationType !== 'PERMANENT') {
      if (durationType === 'CUSTOM') {
        const parsed = parseInt(customDaysInput, 10);
        if (isNaN(parsed) || parsed < 1 || parsed > 365) {
          Alert.alert('Invalid Duration', 'Custom duration must be between 1 and 365 days.');
          return;
        }
        finalDays = parsed;
      } else {
        finalDays = durationDays;
      }
    }

    setCreating(true);
    try {
      const trackedHabitsPayload = userHabits
        .filter((h) => selectedHabitNames.includes(h.name))
        .map((h) => ({
          name: h.name,
          description: h.description,
          icon: h.icon,
          scheduleType: h.scheduleType,
        }));

      const newRoom = await apiClient.createRoom({
        name: roomName.trim(),
        description: goalDescription.trim() || undefined,
        visibility: 'PRIVATE',
        durationType,
        durationDays: finalDays,
        trackedHabits: trackedHabitsPayload,
        invitedUserIds: invitedMembers.map((m) => m.id),
      });

      onRoomCreated(newRoom);
      onClose();
    } catch (e: any) {
      Alert.alert('Creation Failed', e.message || 'Failed to create room.');
    } finally {
      setCreating(false);
    }
  };

  if (!visible) return null;

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent
      onRequestClose={onClose}
    >
      <View className="flex-1 bg-[#0B0B0C]">
        {/* Header Bar */}
        <View className="pt-14 pb-4 px-6 border-b border-[#2B2521] flex-row justify-between items-center bg-[#141110]">
          <View>
            <Text className="text-xl font-bold text-[#F5F2EC]" style={{ fontFamily: 'Baloo 2' }}>
              Create Accountability Room
            </Text>
            <Text className="text-xs font-semibold text-[#E8C08A] mt-0.5">
              Step {step} of 3 — {step === 1 ? 'Choose Habits' : step === 2 ? 'Invite Members' : 'Room Details'}
            </Text>
          </View>

          <TouchableOpacity
            onPress={onClose}
            className="w-9 h-9 rounded-full bg-[#181513] border border-[#2B2521] items-center justify-center"
          >
            <Icon name="close" size={18} color="#9C958C" />
          </TouchableOpacity>
        </View>

        {/* Step Progress Indicator */}
        <View className="flex-row px-6 py-3 bg-[#181513] border-b border-[#2B2521]">
          {[1, 2, 3].map((s) => (
            <View
              key={s}
              className={`flex-1 h-1 rounded-full mx-1 ${
                s <= step ? 'bg-[#E8C08A]' : 'bg-[#2B2521]'
              }`}
            />
          ))}
        </View>

        {/* Step Content */}
        <ScrollView className="flex-1 px-6 pt-6" showsVerticalScrollIndicator={false}>
          {step === 1 && (
            <View>
              <Text className="text-base font-bold text-[#F5F2EC] mb-1">
                Select Tracked Habits
              </Text>
              <Text className="text-xs text-[#9C958C] mb-6">
                Choose the habits that every member in this room will track together.
              </Text>

              {userHabits.length === 0 ? (
                <View className="bg-[#181513] border border-[#2B2521] p-6 rounded-2xl items-center">
                  <Text className="text-sm text-[#9C958C]">You don't have any active habits yet.</Text>
                </View>
              ) : (
                userHabits.map((habit) => {
                  const isSelected = selectedHabitNames.includes(habit.name);
                  return (
                    <TouchableOpacity
                      key={habit.id}
                      onPress={() => toggleHabitSelection(habit.name)}
                      activeOpacity={0.8}
                      className={`p-4 rounded-2xl border mb-3 flex-row items-center justify-between ${
                        isSelected
                          ? 'bg-[#241E1A] border-[#E8C08A]'
                          : 'bg-[#181513] border-[#2B2521]'
                      }`}
                    >
                      <View className="flex-row items-center flex-1 pr-3">
                        <View className="w-10 h-10 rounded-xl bg-[#2B2521] items-center justify-center mr-3">
                          <Icon name={habit.icon || 'target'} size={20} color={isSelected ? '#E8C08A' : '#9C958C'} />
                        </View>
                        <View>
                          <Text className="text-sm font-bold text-[#F5F2EC]">{habit.name}</Text>
                          {habit.description && (
                            <Text className="text-xs text-[#9C958C]" numberOfLines={1}>
                              {habit.description}
                            </Text>
                          )}
                        </View>
                      </View>

                      <View
                        className={`w-6 h-6 rounded-lg items-center justify-center border ${
                          isSelected
                            ? 'bg-[#E8C08A] border-[#E8C08A]'
                            : 'border-[#65605A] bg-transparent'
                        }`}
                      >
                        {isSelected && <Icon name="check" size={14} color="#241C14" />}
                      </View>
                    </TouchableOpacity>
                  );
                })
              )}
            </View>
          )}

          {step === 2 && (
            <View>
              <Text className="text-base font-bold text-[#F5F2EC] mb-1">
                Invite Members (Optional)
              </Text>
              <Text className="text-xs text-[#9C958C] mb-6">
                Search by username to send direct room invitations. You can also invite people later with a room code.
              </Text>

              {/* Username Search Input */}
              <View className="bg-[#181513] border border-[#2B2521] rounded-2xl px-4 py-3 flex-row items-center mb-4">
                <Icon name="search" size={18} color="#9C958C" className="mr-2.5" />
                <TextInput
                  value={usernameSearch}
                  onChangeText={setUsernameSearch}
                  placeholder="Search username (@john)"
                  placeholderTextColor="#65605A"
                  className="flex-1 text-sm text-[#F5F2EC]"
                  autoCapitalize="none"
                />
                {searching && <ActivityIndicator size="small" color="#E8C08A" />}
              </View>

              {/* Search Results Dropdown */}
              {searchResults.length > 0 && (
                <View className="bg-[#181513] border border-[#2B2521] rounded-2xl mb-4 p-2">
                  {searchResults.map((user) => (
                    <TouchableOpacity
                      key={user.id}
                      onPress={() => addInvitedMember(user)}
                      className="p-3 rounded-xl flex-row items-center justify-between border-b border-[#2B2521] last:border-b-0"
                    >
                      <View>
                        <Text className="text-sm font-bold text-[#F5F2EC]">{user.displayName}</Text>
                        <Text className="text-xs text-[#E8C08A]">@{user.username}</Text>
                      </View>
                      <Icon name="plus" size={16} color="#E8C08A" />
                    </TouchableOpacity>
                  ))}
                </View>
              )}

              {/* Selected Member Chips */}
              <Text className="text-xs font-bold text-[#65605A] uppercase tracking-wider mb-2">
                Invited Members ({invitedMembers.length})
              </Text>

              {invitedMembers.length === 0 ? (
                <Text className="text-xs text-[#65605A] italic mb-6">No members invited yet.</Text>
              ) : (
                <View className="flex-row flex-wrap gap-2 mb-6">
                  {invitedMembers.map((member) => (
                    <View
                      key={member.id}
                      className="bg-[#241E1A] border border-[#E8C08A]/40 px-3 py-1.5 rounded-full flex-row items-center"
                    >
                      <Text className="text-xs font-semibold text-[#E8C08A] mr-1.5">
                        @{member.username}
                      </Text>
                      <TouchableOpacity onPress={() => removeInvitedMember(member.id)}>
                        <Icon name="close" size={14} color="#E8C08A" />
                      </TouchableOpacity>
                    </View>
                  ))}
                </View>
              )}
            </View>
          )}

          {step === 3 && (
            <View>
              <Text className="text-base font-bold text-[#F5F2EC] mb-1">
                Room Details
              </Text>
              <Text className="text-xs text-[#9C958C] mb-6">
                Set a name and goal description for your shared accountability space.
              </Text>

              {/* Room Name Input */}
              <Text className="text-xs font-bold text-[#65605A] uppercase tracking-wider mb-2">
                Room Name *
              </Text>
              <TextInput
                value={roomName}
                onChangeText={setRoomName}
                placeholder="e.g. Morning Warriors"
                placeholderTextColor="#65605A"
                className="bg-[#181513] border border-[#2B2521] rounded-2xl px-4 py-3 text-sm text-[#F5F2EC] mb-5"
              />

              {/* Goal Description Input */}
              <Text className="text-xs font-bold text-[#65605A] uppercase tracking-wider mb-2">
                Goal Description (Optional)
              </Text>
              <TextInput
                value={goalDescription}
                onChangeText={setGoalDescription}
                placeholder="e.g. Let's stay consistent for the next 30 days."
                placeholderTextColor="#65605A"
                multiline
                numberOfLines={3}
                className="bg-[#181513] border border-[#2B2521] rounded-2xl p-4 text-sm text-[#F5F2EC] mb-5 h-24"
                style={{ textAlignVertical: 'top' }}
              />

              {/* Challenge Duration Options */}
              <Text className="text-xs font-bold text-[#65605A] uppercase tracking-wider mb-2">
                Challenge Duration
              </Text>
              <View className="flex-row flex-wrap gap-2 mb-4">
                {[
                  { label: '7 Days', type: '7_DAYS', days: 7 },
                  { label: '14 Days', type: '14_DAYS', days: 14 },
                  { label: '30 Days', type: '30_DAYS', days: 30 },
                  { label: '60 Days', type: '60_DAYS', days: 60 },
                  { label: 'Custom', type: 'CUSTOM', days: undefined },
                  { label: 'Permanent ∞', type: 'PERMANENT', days: undefined },
                ].map((item) => {
                  const isSelected = durationType === item.type;
                  return (
                    <TouchableOpacity
                      key={item.type}
                      onPress={() => handleSelectDurationOption(item.type as any, item.days)}
                      className={`px-3.5 py-2.5 rounded-xl border items-center flex-grow ${
                        isSelected
                          ? 'bg-[#E8C08A] border-[#E8C08A]'
                          : 'bg-[#181513] border-[#2B2521]'
                      }`}
                    >
                      <Text
                        className={`text-xs font-bold ${
                          isSelected ? 'text-[#241C14]' : 'text-[#F5F2EC]'
                        }`}
                      >
                        {item.label}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

              {/* Custom Days Input */}
              {durationType === 'CUSTOM' && (
                <View className="mb-5">
                  <Text className="text-xs font-bold text-[#65605A] uppercase tracking-wider mb-1.5">
                    Custom Duration (Days 1–365)
                  </Text>
                  <TextInput
                    value={customDaysInput}
                    onChangeText={(val) => {
                      setCustomDaysInput(val);
                      const parsed = parseInt(val, 10);
                      if (!isNaN(parsed) && parsed > 0) {
                        setDurationDays(parsed);
                      }
                    }}
                    keyboardType="number-pad"
                    placeholder="Enter number of days (e.g. 45)"
                    placeholderTextColor="#65605A"
                    className="bg-[#181513] border border-[#2B2521] rounded-2xl px-4 py-3 text-sm text-[#F5F2EC]"
                  />
                </View>
              )}

              {/* Review Summary Card */}
              <View className="bg-[#181513] border border-[#2B2521] rounded-2xl p-4 mb-6">
                <Text className="text-xs font-bold text-[#E8C08A] uppercase tracking-wider mb-2">
                  Room Summary
                </Text>
                <Text className="text-xs text-[#9C958C] mb-1">
                  Tracked Habits ({selectedHabitNames.length}): {selectedHabitNames.join(', ') || 'None'}
                </Text>
                <Text className="text-xs text-[#9C958C] mb-1">
                  Invited Members: {invitedMembers.length > 0 ? invitedMembers.map((m) => `@${m.username}`).join(', ') : 'None (Use room code later)'}
                </Text>
                <Text className="text-xs text-[#9C958C]">
                  Duration: {durationType === 'PERMANENT' ? 'Permanent (No Expiry)' : `${durationDays || 30} Days`}
                </Text>
              </View>
            </View>
          )}
        </ScrollView>

        {/* Footer Navigation Buttons */}
        <View className="px-6 pb-10 pt-4 bg-[#141110] border-t border-[#2B2521] flex-row gap-3">
          {step > 1 && (
            <TouchableOpacity
              onPress={() => setStep((s) => (s - 1) as any)}
              className="px-5 py-3.5 bg-[#181513] border border-[#2B2521] rounded-2xl justify-center items-center"
            >
              <Text className="text-sm font-semibold text-[#F5F2EC]">Back</Text>
            </TouchableOpacity>
          )}

          {step < 3 ? (
            <TouchableOpacity
              onPress={() => setStep((s) => (s + 1) as any)}
              className="flex-1 py-3.5 bg-[#E8C08A] rounded-2xl justify-center items-center"
            >
              <Text className="text-sm font-bold text-[#241C14]">
                Next: {step === 1 ? 'Invite Members' : 'Room Details'} →
              </Text>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity
              onPress={handleCreateRoom}
              disabled={creating}
              className="flex-1 py-3.5 bg-[#E8C08A] rounded-2xl justify-center items-center flex-row"
            >
              {creating ? (
                <ActivityIndicator size="small" color="#241C14" />
              ) : (
                <Text className="text-sm font-bold text-[#241C14]">Create Room</Text>
              )}
            </TouchableOpacity>
          )}
        </View>
      </View>
    </Modal>
  );
};
