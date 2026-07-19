import React, { useEffect, useState } from 'react';
import {
  Text,
  View,
  ScrollView,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { useAuthStore } from '../../src/store/auth-store';
import { useRoomStore } from '../../src/store/room-store';

export default function RoomsScreen() {
  const { apiClient } = useAuthStore();
  const {
    rooms,
    selectedRoomDetails: roomDetails,
    leaderboard,
    personalHabits,
    loading,
    loadingDetails,
    fetchRooms,
    createRoom,
    joinRoom,
    leaveRoom,
    fetchRoomDetails,
    linkPersonalHabit,
    unlinkPersonalHabit,
  } = useRoomStore();

  const [selectedRoomId, setSelectedRoomId] = useState<string | null>(null);

  // Forms Visibility
  const [showCreate, setShowCreate] = useState(false);
  const [showJoin, setShowJoin] = useState(false);

  // Create Form State
  const [roomName, setRoomName] = useState('');
  const [roomDesc, setRoomDesc] = useState('');
  const [visibility, setVisibility] = useState<'PUBLIC' | 'PRIVATE'>('PUBLIC');

  // Join Form State
  const [inviteCode, setInviteCode] = useState('');

  // Link Habit State
  const [linkingRoomHabitId, setLinkingRoomHabitId] = useState<string | null>(null);

  useEffect(() => {
    fetchRooms(apiClient);
  }, []);

  useEffect(() => {
    if (selectedRoomId) {
      fetchRoomDetails(apiClient, selectedRoomId);
    }
  }, [selectedRoomId]);

  const handleCreateRoom = async () => {
    if (!roomName.trim()) return;
    try {
      await createRoom(apiClient, {
        name: roomName.trim(),
        description: roomDesc.trim() || undefined,
        visibility,
      });
      setRoomName('');
      setRoomDesc('');
      setShowCreate(false);
    } catch (e: any) {
      Alert.alert('Error', e.message);
    }
  };

  const handleJoinRoom = async () => {
    if (!inviteCode.trim()) return;
    try {
      await joinRoom(apiClient, { inviteCode: inviteCode.trim().toUpperCase() });
      setInviteCode('');
      setShowJoin(false);
    } catch (e: any) {
      Alert.alert('Error', e.message);
    }
  };

  const handleLeaveRoom = async () => {
    if (!selectedRoomId) return;
    Alert.alert(
      'Leave Room',
      'Are you sure you want to leave this room?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Leave',
          style: 'destructive',
          onPress: async () => {
            try {
              await leaveRoom(apiClient, selectedRoomId);
              setSelectedRoomId(null);
            } catch (e: any) {
              Alert.alert('Error', e.message);
            }
          },
        },
      ]
    );
  };

  const handleLinkHabit = async (roomHabitId: string, personalHabitId: string) => {
    if (!selectedRoomId) return;
    try {
      await linkPersonalHabit(apiClient, selectedRoomId, roomHabitId, personalHabitId);
      setLinkingRoomHabitId(null);
    } catch (e: any) {
      Alert.alert('Error linking habit', e.message);
    }
  };

  const handleUnlinkHabit = async (roomHabitId: string) => {
    if (!selectedRoomId) return;
    try {
      await unlinkPersonalHabit(apiClient, selectedRoomId, roomHabitId);
    } catch (e: any) {
      Alert.alert('Error unlinking habit', e.message);
    }
  };

  if (selectedRoomId && roomDetails) {
    // ROOM DETAIL SCREEN OVERLAY
    return (
      <ScrollView className="flex-1 bg-[#F8F9F7] p-6">
        {/* Detail Header */}
        <View className="flex-row justify-between items-center mb-6">
          <TouchableOpacity
            onPress={() => {
              setSelectedRoomId(null);
            }}
            className="px-3 py-2 bg-white border border-[#E6E9E6] rounded-xl"
          >
            <Text className="text-[#6B726D] font-semibold">← Back</Text>
          </TouchableOpacity>
          <Text className="text-xl font-bold text-[#1C211E] flex-1 text-center truncate px-2">{roomDetails.name}</Text>
          <TouchableOpacity
            onPress={handleLeaveRoom}
            className="px-3 py-2 bg-[#FCDCDC] rounded-xl"
          >
            <Text className="text-[#D95C5C] font-semibold">Leave</Text>
          </TouchableOpacity>
        </View>

        {loadingDetails ? (
          <ActivityIndicator size="large" color="#256D4A" className="mt-10" />
        ) : (
          <View className="space-y-6 pb-12">
            {/* Description Card */}
            {roomDetails.description && (
              <View className="bg-white border border-[#E6E9E6] p-4 rounded-2xl">
                <Text className="text-xs font-semibold text-[#6B726D] uppercase tracking-wider mb-1">About Room</Text>
                <Text className="text-sm text-[#1C211E]">{roomDetails.description}</Text>
                {roomDetails.inviteCode && (
                  <Text className="text-xs font-bold text-[#256D4A] mt-2">Invite Code: {roomDetails.inviteCode}</Text>
                )}
              </View>
            )}

            {/* Room Accountability Habits */}
            <View className="bg-white border border-[#E6E9E6] p-5 rounded-2xl mt-4">
              <Text className="text-base font-bold text-[#1C211E] mb-4">Accountability Targets</Text>
              {roomDetails.roomHabits?.length === 0 ? (
                <Text className="text-sm text-[#6B726D]">No accountability habits defined yet.</Text>
              ) : (
                roomDetails.roomHabits?.map((rh: any) => {
                  // Check if personal habit is linked (simulate or verify from links if fetched)
                  const isLinked = false; // Add verify link check if available
                  return (
                    <View key={rh.id} className="py-3 border-b border-[#E6E9E6] last:border-b-0">
                      <View className="flex-row justify-between items-center">
                        <View className="flex-1 pr-4">
                          <Text className="text-sm font-semibold text-[#1C211E]">{rh.name}</Text>
                          {rh.description && (
                            <Text className="text-xs text-[#6B726D] mt-1">{rh.description}</Text>
                          )}
                        </View>
                        {isLinked ? (
                          <TouchableOpacity
                            onPress={() => handleUnlinkHabit(rh.id)}
                            className="bg-[#FCDCDC] px-3 py-2 rounded-xl"
                          >
                            <Text className="text-[#D95C5C] text-xs font-semibold">Unlink</Text>
                          </TouchableOpacity>
                        ) : (
                          <TouchableOpacity
                            onPress={() => setLinkingRoomHabitId(rh.id)}
                            className="bg-[#256D4A] px-3 py-2 rounded-xl"
                          >
                            <Text className="text-white text-xs font-semibold">Link Habit</Text>
                          </TouchableOpacity>
                        )}
                      </View>

                      {/* Dropdown list of personal habits to link */}
                      {linkingRoomHabitId === rh.id && (
                        <View className="mt-3 p-3 bg-[#F8F9F7] rounded-xl border border-[#E6E9E6]">
                          <Text className="text-xs font-bold text-[#6B726D] mb-2">Select Private Habit to Link:</Text>
                          {personalHabits.map((ph) => (
                            <TouchableOpacity
                              key={ph.id}
                              onPress={() => handleLinkHabit(rh.id, ph.id)}
                              className="py-2 border-b border-[#E6E9E6] last:border-0"
                            >
                              <Text className="text-sm text-[#256D4A]">{ph.name}</Text>
                            </TouchableOpacity>
                          ))}
                          <TouchableOpacity
                            onPress={() => setLinkingRoomHabitId(null)}
                            className="mt-2 py-2 items-center"
                          >
                            <Text className="text-xs text-[#6B726D] font-bold">Cancel</Text>
                          </TouchableOpacity>
                        </View>
                      )}
                    </View>
                  );
                })
              )}
            </View>

            {/* Weekly Leaderboard */}
            <View className="bg-white border border-[#E6E9E6] p-5 rounded-2xl mt-4">
              <Text className="text-base font-bold text-[#1C211E] mb-4">🏆 Weekly Standings</Text>
              {leaderboard.length === 0 ? (
                <Text className="text-sm text-[#6B726D]">No leaderboard completions logged yet.</Text>
              ) : (
                leaderboard.map((member, idx) => (
                  <View
                    key={member.userId}
                    className="flex-row items-center py-3 border-b border-[#E6E9E6] last:border-b-0"
                  >
                    <Text className="text-sm font-bold text-[#6B726D] w-8">#{idx + 1}</Text>
                    <Text className="text-sm font-semibold text-[#1C211E] flex-1">{member.displayName}</Text>
                    <Text className="text-sm font-bold text-[#256D4A]">{member.score} check-ins</Text>
                  </View>
                ))
              )}
            </View>
          </View>
        )}
      </ScrollView>
    );
  }

  // ROOMS LIST VIEW
  return (
    <ScrollView className="flex-1 bg-[#F8F9F7] p-6">
      {/* Header */}
      <View className="flex-row justify-between items-center mb-6">
        <View>
          <Text className="text-2xl font-bold text-[#1C211E]">Accountability Rooms</Text>
          <Text className="text-sm text-[#6B726D]">Share streaks and complete targets</Text>
        </View>
      </View>

      {/* Buttons */}
      <View className="flex-row mb-6">
        <TouchableOpacity
          onPress={() => {
            setShowCreate(!showCreate);
            setShowJoin(false);
          }}
          className="flex-1 bg-[#256D4A] py-3 rounded-xl items-center mr-2 shadow-sm"
        >
          <Text className="text-white font-semibold">Create Room</Text>
        </TouchableOpacity>
        <TouchableOpacity
          onPress={() => {
            setShowJoin(!showJoin);
            setShowCreate(false);
          }}
          className="flex-1 bg-[#E7F2EC] py-3 rounded-xl items-center ml-2 border border-[#256D4A] shadow-sm"
        >
          <Text className="text-[#256D4A] font-semibold">Join Room</Text>
        </TouchableOpacity>
      </View>

      {/* Forms */}
      {showCreate && (
        <View className="bg-white border border-[#E6E9E6] p-5 rounded-2xl mb-6 shadow-sm">
          <Text className="text-base font-bold text-[#1C211E] mb-4">Create Room</Text>
          <Text className="text-xs font-semibold text-[#6B726D] uppercase tracking-wider mb-2">Room Name</Text>
          <TextInput
            value={roomName}
            onChangeText={setRoomName}
            placeholder="e.g. Early Birds Coders"
            className="px-4 py-3 border border-[#E6E9E6] rounded-xl mb-4"
          />
          <Text className="text-xs font-semibold text-[#6B726D] uppercase tracking-wider mb-2">Description</Text>
          <TextInput
            value={roomDesc}
            onChangeText={setRoomDesc}
            placeholder="Room details..."
            className="px-4 py-3 border border-[#E6E9E6] rounded-xl mb-4"
          />
          <TouchableOpacity
            onPress={handleCreateRoom}
            className="bg-[#256D4A] py-3 rounded-xl items-center"
          >
            <Text className="text-white font-semibold">Save Room</Text>
          </TouchableOpacity>
        </View>
      )}

      {showJoin && (
        <View className="bg-white border border-[#E6E9E6] p-5 rounded-2xl mb-6 shadow-sm">
          <Text className="text-base font-bold text-[#1C211E] mb-4">Join Room</Text>
          <Text className="text-xs font-semibold text-[#6B726D] uppercase tracking-wider mb-2">Invite Code</Text>
          <TextInput
            value={inviteCode}
            onChangeText={setInviteCode}
            placeholder="e.g. AE48CD"
            autoCapitalize="characters"
            className="px-4 py-3 border border-[#E6E9E6] rounded-xl mb-4"
          />
          <TouchableOpacity
            onPress={handleJoinRoom}
            className="bg-[#256D4A] py-3 rounded-xl items-center"
          >
            <Text className="text-white font-semibold">Join</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Rooms List */}
      {loading ? (
        <ActivityIndicator size="large" color="#256D4A" className="mt-10" />
      ) : rooms.length === 0 ? (
        <View className="bg-white border border-[#E6E9E6] p-8 rounded-2xl items-center mt-4">
          <Text className="text-3xl mb-2">👥</Text>
          <Text className="text-base font-semibold text-[#1C211E]">No Rooms Joined</Text>
          <Text className="text-sm text-[#6B726D] text-center mt-1">Create a room or ask for an invite code to join others.</Text>
        </View>
      ) : (
        rooms.map((room) => (
          <TouchableOpacity
            key={room.id}
            onPress={() => setSelectedRoomId(room.id)}
            className="bg-white border border-[#E6E9E6] p-5 rounded-2xl mb-4 shadow-sm"
          >
            <View className="flex-row justify-between items-start">
              <View className="flex-1 pr-4">
                <Text className="text-lg font-bold text-[#1C211E]">{room.name}</Text>
                {room.description ? (
                  <Text className="text-sm text-[#6B726D] mt-1" numberOfLines={2}>
                    {room.description}
                  </Text>
                ) : null}
                <Text className="text-xs font-semibold text-[#256D4A] mt-2">
                  👥 {room.memberCount} active members
                </Text>
              </View>
              <Text className="text-2xl">→</Text>
            </View>
          </TouchableOpacity>
        ))
      )}
    </ScrollView>
  );
}
