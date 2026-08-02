import React, { useEffect, useState, useMemo, useCallback } from 'react';
import { useFocusEffect } from 'expo-router';
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
import { useHabitStore } from '../../src/store/habit-store';
import { useSyncStore } from '../../src/store/sync-store';
import { Icon } from '../../src/components/ui/Icon';
import { RoomInfoSheet } from '../../src/components/rooms/RoomInfoSheet';
import { InviteMemberModal } from '../../src/components/rooms/InviteMemberModal';
import { CreateRoomModal } from '../../src/components/rooms/CreateRoomModal';
import { RoomDetailsHub } from '../../src/components/rooms/RoomDetailsHub';
import { ReactionKind } from '../../src/components/rooms/ReactionPill';
import { toLocalDateString } from '../../src/utils/streak';

export default function RoomsScreen() {
  const { user, apiClient } = useAuthStore();
  const { habits, fetchHabits, createHabit, checkInHabit } = useHabitStore();
  const { enqueueCompleteHabit } = useSyncStore();
  const isOfflineMode = false;
  const {
    rooms,
    selectedRoomDetails: roomDetails,
    roomActivities,
    roomMembers,
    loading,
    loadingDetails,
    fetchRooms,
    joinRoom,
    leaveRoom,
    deleteRoom,
    fetchRoomDetails,
    fetchRoomActivities,
    fetchRoomMembers,
    toggleActivityReaction,
  } = useRoomStore();

  const [selectedRoomId, setSelectedRoomId] = useState<string | null>(null);
  const [showInfoSheet, setShowInfoSheet] = useState(false);
  const [showInviteModal, setShowInviteModal] = useState(false);

  // Reset selected room view whenever user navigates away from Rooms tab
  useFocusEffect(
    useCallback(() => {
      return () => {
        setSelectedRoomId(null);
        setShowInfoSheet(false);
        setShowInviteModal(false);
      };
    }, [])
  );

  // Forms Visibility
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showJoin, setShowJoin] = useState(false);

  // Join Form State
  const [inviteCode, setInviteCode] = useState('');

  useEffect(() => {
    fetchRooms(apiClient);
  }, []);

  useEffect(() => {
    if (selectedRoomId) {
      fetchRoomDetails(apiClient, selectedRoomId);
      fetchRoomActivities(apiClient, selectedRoomId);
      fetchRoomMembers(apiClient, selectedRoomId);

      // Supabase Realtime Subscription for Activity Feed & Reactions
      const channel = apiClient.supabase
        .channel(`room-realtime-${selectedRoomId}`)
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'activities',
            filter: `room_id=eq.${selectedRoomId}`,
          },
          () => {
            fetchRoomActivities(apiClient, selectedRoomId);
            fetchRoomMembers(apiClient, selectedRoomId);
          }
        )
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'reactions',
          },
          () => {
            fetchRoomActivities(apiClient, selectedRoomId);
          }
        )
        .subscribe();

      return () => {
        apiClient.supabase.removeChannel(channel);
      };
    }
  }, [selectedRoomId]);

  const handleJoinRoom = async () => {
    if (!inviteCode.trim()) return;
    try {
      const res = await joinRoom(apiClient, { inviteCode: inviteCode.trim().toUpperCase() });
      setInviteCode('');
      setShowJoin(false);
      if (res?.requestSent) {
        Alert.alert('Request Sent!', `Your request to join ${res.roomName || 'this room'} has been sent to the room owner for approval.`);
      } else {
        Alert.alert('Success!', 'You have joined the room!');
      }
    } catch (e: any) {
      Alert.alert('Error', e.message);
    }
  };

  const handleToggleReaction = async (activityId: string, reactionKind: ReactionKind) => {
    await toggleActivityReaction(apiClient, activityId, reactionKind);
  };

  const handleQuickCompleteHabit = async (habitName: string) => {
    const todayStr = toLocalDateString(new Date());
    const tz = user?.timezone || 'UTC';

    let targetHabit = habits.find((h) => h.name.toLowerCase() === habitName.toLowerCase());

    // If user does not have a personal habit matching this room habit yet, auto-create it
    if (!targetHabit) {
      try {
        targetHabit = await createHabit(apiClient, {
          name: habitName,
          scheduleType: 'DAILY' as any,
          startDate: todayStr,
          timezone: tz,
        });
      } catch (e: any) {
        Alert.alert('Habit Creation Error', e.message || `Could not auto-create habit for "${habitName}".`);
        return;
      }
    }

    const key = `mobile-room-idemp-${targetHabit.id}-${todayStr}-${Date.now()}`;

    await checkInHabit(
      apiClient,
      targetHabit.id,
      todayStr,
      tz,
      key,
      isOfflineMode,
      enqueueCompleteHabit
    );

    await fetchHabits(apiClient);
    if (selectedRoomId) {
      await fetchRoomActivities(apiClient, selectedRoomId);
      await fetchRoomMembers(apiClient, selectedRoomId);
    }
  };

  const handleLeaveSelectedRoom = async () => {
    if (!selectedRoomId) return;
    await leaveRoom(apiClient, selectedRoomId);
    setSelectedRoomId(null);
  };

  const handleDeleteSelectedRoom = async () => {
    if (!selectedRoomId) return;
    await deleteRoom(apiClient, selectedRoomId);
    setSelectedRoomId(null);
  };

  const existingMemberIds = useMemo(() => {
    return new Set(roomMembers.map((m: any) => m.user?.id || m.profileId).filter(Boolean));
  }, [roomMembers]);

  const pendingInviteeIds = useMemo(() => {
    return new Set(
      roomMembers
        .filter((m: any) => m.role === 'PENDING' || m.status === 'PENDING')
        .map((m: any) => m.user?.id || m.profileId)
        .filter(Boolean)
    );
  }, [roomMembers]);

  // SELECTED ROOM DETAIL HUB VIEW
  if (selectedRoomId && roomDetails) {
    return (
      <View className="flex-1 bg-[#0B0B0C]">
        <RoomDetailsHub
          roomDetails={roomDetails}
          roomMembers={roomMembers}
          roomActivities={roomActivities}
          userHabits={habits}
          currentUserId={user?.id}
          loadingDetails={loadingDetails}
          apiClient={apiClient}
          onBack={() => setSelectedRoomId(null)}
          onOpenRoomInfo={() => setShowInfoSheet(true)}
          onLeaveRoom={handleLeaveSelectedRoom}
          onDeleteRoom={handleDeleteSelectedRoom}
          onToggleReaction={handleToggleReaction}
          onQuickCompleteHabit={handleQuickCompleteHabit}
        />

        {/* Room Info Bottom Sheet */}
        <RoomInfoSheet
          visible={showInfoSheet}
          roomDetails={roomDetails}
          members={roomMembers}
          apiClient={apiClient}
          roomId={selectedRoomId}
          isOwner={roomDetails.ownerId === user?.id}
          onClose={() => setShowInfoSheet(false)}
          onOpenInviteModal={() => setShowInviteModal(true)}
          onLeaveRoom={handleLeaveSelectedRoom}
          onDeleteRoom={handleDeleteSelectedRoom}
        />

        {/* Invite Member Bottom Sheet */}
        <InviteMemberModal
          visible={showInviteModal}
          roomId={selectedRoomId}
          inviteCode={roomDetails.inviteCode}
          existingMemberIds={existingMemberIds}
          pendingInviteeIds={pendingInviteeIds}
          apiClient={apiClient}
          onClose={() => setShowInviteModal(false)}
          onInvitationSent={() => fetchRoomMembers(apiClient, selectedRoomId)}
        />
      </View>
    );
  }

  // ROOMS LIST VIEW (Matching Figma "Accountability Rooms")
  return (
    <View className="flex-1 bg-[#0B0B0C]">
      <ScrollView className="flex-1 px-6 pt-20" showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View className="mb-6">
          <Text className="text-3xl font-bold text-[#F5F2EC] mb-1">Accountability Rooms</Text>
          <Text className="text-sm text-[#9C958C]">Share streaks and complete targets</Text>
        </View>

        {/* Buttons matching Figma design */}
        <View className="flex-row mb-8">
          <TouchableOpacity
            onPress={() => {
              setShowCreateModal(true);
              setShowJoin(false);
            }}
            className="flex-1 bg-[#E8C08A] py-3.5 rounded-xl items-center flex-row justify-center mr-2 shadow-sm"
          >
            <Icon name="plus" size={16} color="#241C14" className="mr-1.5" />
            <Text className="text-[#241C14] font-bold text-sm">Create Room</Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => {
              setShowJoin(!showJoin);
              setShowCreateModal(false);
            }}
            className="flex-1 bg-[#181513] border border-[#2B2521] py-3.5 rounded-xl items-center flex-row justify-center ml-2 shadow-sm"
          >
            <Icon name="arrow-right" size={16} color="#F5F2EC" className="mr-1.5" />
            <Text className="text-[#F5F2EC] font-bold text-sm">Join Room</Text>
          </TouchableOpacity>
        </View>

        {/* Multi-Step Create Room Modal */}
        <CreateRoomModal
          visible={showCreateModal}
          userHabits={habits}
          apiClient={apiClient}
          onClose={() => setShowCreateModal(false)}
          onRoomCreated={(newRoom) => {
            fetchRooms(apiClient);
            if (newRoom && newRoom.id) {
              setSelectedRoomId(newRoom.id);
            }
          }}
        />

        {/* Join Form */}
        {showJoin && (
          <View className="bg-[#181513] border border-[#2B2521] p-5 rounded-2xl mb-6 shadow-sm">
            <Text className="text-base font-bold text-[#F5F2EC] mb-4">Join Room</Text>
            <Text className="text-xs font-semibold text-[#65605A] uppercase tracking-wider mb-2">Invite Code</Text>
            <TextInput
              value={inviteCode}
              onChangeText={setInviteCode}
              placeholder="e.g. CODE-7F3K9"
              placeholderTextColor="#65605A"
              autoCapitalize="characters"
              className="px-4 py-3 bg-[#0B0B0C] border border-[#2B2521] text-[#F5F2EC] rounded-xl mb-4"
            />
            <TouchableOpacity
              onPress={handleJoinRoom}
              className="bg-[#E8C08A] py-3.5 rounded-xl items-center"
            >
              <Text className="text-[#241C14] font-bold text-sm">Join Room</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Rooms Section */}
        <Text className="text-xs font-bold text-[#65605A] uppercase tracking-widest mb-3">
          MY ROOMS
        </Text>

        {loading ? (
          <ActivityIndicator size="large" color="#E8C08A" className="mt-10" />
        ) : rooms.length === 0 ? (
          <View className="bg-[#181513] border border-[#2B2521] p-8 rounded-2xl items-center mt-2">
            <Icon name="rooms" size={32} color="#E8C08A" className="mb-2" />
            <Text className="text-base font-semibold text-[#F5F2EC]">No Rooms Joined</Text>
            <Text className="text-sm text-[#9C958C] text-center mt-1">Create a room or ask for an invite code to join others.</Text>
          </View>
        ) : (
          rooms.map((room) => (
            <TouchableOpacity
              key={room.id}
              onPress={() => setSelectedRoomId(room.id)}
              className="bg-[#181513] border border-[#2B2521] p-5 rounded-2xl mb-4 flex-row items-center justify-between"
            >
              <View className="flex-row items-center flex-1 pr-4">
                <View className="w-12 h-12 bg-[#221C16] rounded-2xl items-center justify-center mr-4 border border-[#3A2E1F]">
                  <Icon name="rooms" size={20} color="#E8C08A" />
                </View>
                <View className="flex-1">
                  <Text className="text-lg font-bold text-[#F5F2EC] mb-0.5">{room.name}</Text>
                  {room.description ? (
                    <Text className="text-xs text-[#9C958C] mb-1.5" numberOfLines={1}>
                      {room.description}
                    </Text>
                  ) : null}
                  <View className="flex-row items-center">
                    <View className="w-2 h-2 rounded-full bg-[#E8C08A] mr-1.5" />
                    <Text className="text-xs text-[#9C958C]">
                      {room.memberCount || 1} active member{room.memberCount === 1 ? '' : 's'}
                    </Text>
                  </View>
                </View>
              </View>
              <Icon name="chevron-right" size={20} color="#65605A" />
            </TouchableOpacity>
          ))
        )}

        {/* Dashed Discover card matching Figma design */}
        <View className="border border-dashed border-[#453C34] rounded-2xl p-6 items-center my-4 bg-[#17130F]">
          <View className="w-10 h-10 bg-[#181513] rounded-full items-center justify-center mb-3">
            <Icon name="feed" size={18} color="#9C958C" />
          </View>
          <Text className="text-sm text-[#9C958C] text-center max-w-[220px]">
            Discover more rooms to stay accountable with others.
          </Text>
        </View>

        <View className="h-16" />
      </ScrollView>
    </View>
  );
}
