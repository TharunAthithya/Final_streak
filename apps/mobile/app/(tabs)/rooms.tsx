import React, { useEffect, useState, useMemo, useCallback } from 'react';
import { useFocusEffect } from 'expo-router';
import {
  Text,
  View,
  ScrollView,
  TouchableOpacity,
  TextInput,
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
import { HabitMatchGate } from '../../src/components/rooms/HabitMatchGate';
import { toLocalDateString } from '../../src/utils/streak';
import { RoomCardSkeleton } from '../../src/components/ui/skeletons/RoomCardSkeleton';
import { useNotice } from '../../src/components/ui/Notice';
import { useDelayedLoading } from '../../src/hooks/useDelayedLoading';

export default function RoomsScreen() {
  const { user, apiClient } = useAuthStore();
  const { habits, fetchHabits, createHabit, checkInHabit } = useHabitStore();
  const { enqueueCompleteHabit } = useSyncStore();
  const notice = useNotice();
  const isOfflineMode = false;
  const {
    rooms,
    selectedRoomDetails: roomDetails,
    roomActivities,
    roomMembers,
    loading,
    loadingDetails,
    setOptimisticRoom,
    fetchRooms,
    joinRoom,
    leaveRoom,
    deleteRoom,
    fetchRoomDetails,
    fetchRoomActivities,
    fetchRoomMembers,
    toggleActivityReaction,
  } = useRoomStore();

  const showSkeleton = useDelayedLoading(loading);

  const [selectedRoomId, setSelectedRoomId] = useState<string | null>(null);
  const [showInfoSheet, setShowInfoSheet] = useState(false);
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showJoin, setShowJoin] = useState(false);
  const [inviteCode, setInviteCode] = useState('');

  // Habit matching gate state
  const [pendingGateRoom, setPendingGateRoom] = useState<{
    code: string;
    roomName: string;
    trackedHabits: any[];
    inviteCode: string;
  } | null>(null);

  // Reset selected room view whenever user navigates away from Rooms tab
  useFocusEffect(
    useCallback(() => {
      fetchRooms(apiClient);
      fetchHabits(apiClient);
      return () => {
        setSelectedRoomId(null);
        setShowInfoSheet(false);
        setShowInviteModal(false);
      };
    }, [apiClient])
  );

  useEffect(() => {
    if (selectedRoomId) {
      fetchRoomDetails(apiClient, selectedRoomId);
      fetchRoomActivities(apiClient, selectedRoomId);
      fetchRoomMembers(apiClient, selectedRoomId);

      const channel = apiClient.supabase
        .channel(`room-realtime-${selectedRoomId}`)
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'activities', filter: `room_id=eq.${selectedRoomId}` },
          () => {
            fetchRoomActivities(apiClient, selectedRoomId);
            fetchRoomMembers(apiClient, selectedRoomId);
          }
        )
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'reactions' },
          () => {
            fetchRoomActivities(apiClient, selectedRoomId);
          }
        )
        .subscribe();

      return () => {
        apiClient.supabase.removeChannel(channel);
      };
    }
  }, [selectedRoomId, apiClient]);

  const handleJoinRoom = async () => {
    if (!inviteCode.trim()) return;
    const cleanCode = inviteCode.trim().toUpperCase();

    try {
      const details = await apiClient.getRoomByInviteCode(cleanCode);
      const tracked = details.trackedHabits || [];

      const missingHabits = tracked.filter(
        (th: any) => !habits.some((h) => h.name.toLowerCase() === th.name.toLowerCase())
      );

      if (missingHabits.length > 0) {
        setPendingGateRoom({
          code: cleanCode,
          roomName: details.roomName,
          trackedHabits: tracked,
          inviteCode: cleanCode,
        });
        return;
      }

      await executeJoinRoom(cleanCode);
    } catch (e: any) {
      notice.error(e.message || 'Failed to find room with that code');
    }
  };

  const executeJoinRoom = async (codeToUse: string) => {
    const res = await joinRoom(apiClient, { inviteCode: codeToUse });
    setInviteCode('');
    setShowJoin(false);
    if (res?.requestSent) {
      notice.info(`Your request to join ${res.roomName || 'this room'} has been sent to the owner for approval.`);
    } else {
      notice.success('You have joined the room!');
    }
  };

  const handleToggleReaction = async (activityId: string, reactionKind: ReactionKind) => {
    await toggleActivityReaction(apiClient, activityId, reactionKind);
  };

  const handleQuickCompleteHabit = async (habitName: string) => {
    const todayStr = toLocalDateString(new Date());
    const tz = user?.timezone || 'UTC';

    let targetHabit = habits.find((h) => h.name.toLowerCase() === habitName.toLowerCase());

    if (!targetHabit) {
      try {
        targetHabit = await createHabit(apiClient, {
          name: habitName,
          scheduleType: 'DAILY' as any,
          startDate: todayStr,
          timezone: tz,
        });
      } catch (e: any) {
        notice.error(e.message || `Could not auto-create habit for "${habitName}".`);
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

  // ROOMS LIST VIEW
  return (
    <View className="flex-1 bg-[#0B0B0C]">
      <ScrollView className="flex-1 px-6 pt-20" showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View className="mb-6">
          <Text className="text-3xl font-bold text-[#F5F2EC] mb-1">Accountability Rooms</Text>
          <Text className="text-sm text-[#9C958C]">Share streaks and complete targets</Text>
        </View>

        {/* Action Buttons */}
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
            <Icon name="users" size={16} color="#E8C08A" className="mr-1.5" />
            <Text className="text-[#E8C08A] font-bold text-sm">Join Room</Text>
          </TouchableOpacity>
        </View>

        {/* Join Room Form */}
        {showJoin && (
          <View className="bg-[#181513] border border-[#2B2521] p-5 rounded-2xl mb-6">
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

        {showSkeleton ? (
          <View className="space-y-3">
            <RoomCardSkeleton />
            <RoomCardSkeleton />
            <RoomCardSkeleton />
          </View>
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
              onPress={() => {
                setOptimisticRoom(room);
                setSelectedRoomId(room.id);
              }}
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

        <View className="h-16" />
      </ScrollView>

      {/* Create Room Modal */}
      <CreateRoomModal
        visible={showCreateModal}
        userHabits={habits}
        apiClient={apiClient}
        onClose={() => setShowCreateModal(false)}
        onRoomCreated={() => fetchRooms(apiClient)}
      />

      {/* Pre-Join Habit Match Gate Modal */}
      {pendingGateRoom && (
        <HabitMatchGate
          visible={!!pendingGateRoom}
          roomName={pendingGateRoom.roomName}
          trackedHabits={pendingGateRoom.trackedHabits}
          userHabits={habits}
          apiClient={apiClient}
          onClose={() => setPendingGateRoom(null)}
          onCompleteJoin={async () => {
            await executeJoinRoom(pendingGateRoom.inviteCode);
            setPendingGateRoom(null);
          }}
        />
      )}
    </View>
  );
}
