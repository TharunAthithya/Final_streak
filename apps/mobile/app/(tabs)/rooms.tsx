import React, { useEffect, useState, useMemo } from 'react';
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
import { Icon } from '../../src/components/ui/Icon';
import { RoomChatFeed, RoomFeedItem } from '../../src/components/rooms/RoomChatFeed';
import { RoomInfoSheet } from '../../src/components/rooms/RoomInfoSheet';
import { ReactionKind } from '../../src/components/rooms/ReactionPill';

export default function RoomsScreen() {
  const { user, apiClient } = useAuthStore();
  const {
    rooms,
    selectedRoomDetails: roomDetails,
    roomActivities,
    roomMembers,
    loading,
    loadingDetails,
    fetchRooms,
    createRoom,
    joinRoom,
    fetchRoomDetails,
    fetchRoomActivities,
    fetchRoomMembers,
    toggleActivityReaction,
  } = useRoomStore();

  const [selectedRoomId, setSelectedRoomId] = useState<string | null>(null);
  const [showInfoSheet, setShowInfoSheet] = useState(false);

  // Forms Visibility
  const [showCreate, setShowCreate] = useState(false);
  const [showJoin, setShowJoin] = useState(false);

  // Create Form State
  const [roomName, setRoomName] = useState('');
  const [roomDesc, setRoomDesc] = useState('');
  const [visibility, setVisibility] = useState<'PUBLIC' | 'PRIVATE'>('PUBLIC');

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

  // Convert room activities into rich chat feed items
  const feedItems: RoomFeedItem[] = useMemo(() => {
    if (!selectedRoomId || !roomDetails) return [];

    const result: RoomFeedItem[] = [];

    // Origin marker
    const originDateStr = roomDetails.created_at
      ? new Date(roomDetails.created_at).toLocaleDateString([], { weekday: 'short', day: 'numeric', month: 'short' })
      : 'recently';
    result.push({
      id: 'origin-marker',
      kind: 'origin',
      label: `Room created · ${originDateStr}`,
    });

    let lastDateStr = '';
    let lastActor = '';

    roomActivities.forEach((act, idx) => {
      const dateObj = new Date(act.createdAt);
      const dateLabel = dateObj.toLocaleDateString([], { weekday: 'short', day: 'numeric', month: 'short' });
      const timeLabel = dateObj.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });

      // Date divider if day changed
      if (dateLabel !== lastDateStr) {
        lastDateStr = dateLabel;
        result.push({
          id: `date-${dateLabel}-${idx}`,
          kind: 'date',
          label: dateLabel,
        });
        lastActor = ''; // Reset run on new date
      }

      if (act.type === 'ROOM_JOIN') {
        result.push({
          id: act.id,
          kind: 'join',
          name: act.actorDisplayName,
          time: timeLabel,
        });
        lastActor = '';
      } else {
        // Message (habit complete check-in)
        const isFirstInRun = act.actorDisplayName !== lastActor;
        lastActor = act.actorDisplayName;

        result.push({
          id: act.id,
          kind: 'msg',
          name: act.actorDisplayName,
          habit: act.message || 'Completed a habit',
          time: timeLabel,
          isOwn: act.isOwn,
          isFirstInRun,
          isLastInRun: true,
          reactions: act.reactions,
        });
      }
    });

    return result;
  }, [selectedRoomId, roomDetails, roomActivities]);

  // SELECTED ROOM DETAIL VIEW (WhatsApp Chat Feed Style)
  if (selectedRoomId && roomDetails) {
    return (
      <View className="flex-1 bg-[#0B0B0C]">
        {/* Header Bar */}
        <View className="px-5 pt-14 pb-4 border-b border-[#1C1815] bg-[#0B0B0C]">
          <View className="flex-row items-center space-x-3">
            {/* Back Button */}
            <TouchableOpacity
              onPress={() => setSelectedRoomId(null)}
              className="w-9 h-9 bg-[#18140F] border border-[#2B2521] rounded-full items-center justify-center mr-2"
            >
              <Icon name="arrow-left" size={16} color="#F5F2EC" />
            </TouchableOpacity>

            {/* Room Title Header (Tappable for Info Sheet) */}
            <TouchableOpacity
              onPress={() => setShowInfoSheet(true)}
              className="flex-1 flex-row items-center min-w-0"
            >
              <View className="w-9 h-9 bg-[#3A2E1F] border border-[#E8C08A]/30 rounded-xl items-center justify-center mr-2.5 shrink-0">
                <Icon name="rooms" size={18} color="#E8C08A" />
              </View>
              <View className="flex-1 min-w-0">
                <Text numberOfLines={1} className="text-base font-bold text-[#F5F2EC] leading-tight">
                  {roomDetails.name}
                </Text>
                <Text className="text-[11px] text-[#65605A]">Tap for room info</Text>
              </View>
              <Icon name="chevron-right" size={16} color="#65605A" className="ml-1" />
            </TouchableOpacity>
          </View>

          {/* Room Badges Row */}
          <View className="flex-row items-center space-x-2 mt-3.5">
            <View className="bg-[#1B1512] border border-[#2B2521] px-2.5 py-1 rounded-full flex-row items-center mr-2">
              <Icon name="fire" size={12} color="#E8A05A" className="mr-1" />
              <Text className="text-[11.5px] font-semibold text-[#F5F2EC]">
                {roomDetails.streak || 4} day streak
              </Text>
            </View>
            <View className="bg-[#1B1512] border border-[#2B2521] px-2.5 py-1 rounded-full flex-row items-center">
              <View className="w-1.5 h-1.5 rounded-full bg-[#E8C08A] mr-1.5" />
              <Text className="text-[11.5px] font-semibold text-[#F5F2EC]">
                {roomMembers.length || 1} active member{roomMembers.length === 1 ? '' : 's'}
              </Text>
            </View>
          </View>
        </View>

        {/* Chat Feed */}
        {loadingDetails ? (
          <ActivityIndicator size="large" color="#E8C08A" className="mt-10" />
        ) : (
          <RoomChatFeed items={feedItems} onToggleReaction={handleToggleReaction} />
        )}

        {/* Room Info Bottom Sheet */}
        <RoomInfoSheet
          visible={showInfoSheet}
          roomName={roomDetails.name}
          description={roomDetails.description}
          inviteCode={roomDetails.inviteCode}
          memberCount={roomMembers.length}
          activeTodayCount={1}
          members={roomMembers}
          apiClient={apiClient}
          roomId={selectedRoomId}
          isOwner={roomDetails.ownerId === user?.id}
          onClose={() => setShowInfoSheet(false)}
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
              setShowCreate(!showCreate);
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
              setShowCreate(false);
            }}
            className="flex-1 bg-[#181513] border border-[#2B2521] py-3.5 rounded-xl items-center flex-row justify-center ml-2 shadow-sm"
          >
            <Icon name="arrow-right" size={16} color="#F5F2EC" className="mr-1.5" />
            <Text className="text-[#F5F2EC] font-bold text-sm">Join Room</Text>
          </TouchableOpacity>
        </View>

        {/* Create Form */}
        {showCreate && (
          <View className="bg-[#181513] border border-[#2B2521] p-5 rounded-2xl mb-6 shadow-sm">
            <Text className="text-base font-bold text-[#F5F2EC] mb-4">Create Room</Text>
            <Text className="text-xs font-semibold text-[#65605A] uppercase tracking-wider mb-2">Room Name</Text>
            <TextInput
              value={roomName}
              onChangeText={setRoomName}
              placeholder="e.g. Coding beginner"
              placeholderTextColor="#65605A"
              className="px-4 py-3 bg-[#0B0B0C] border border-[#2B2521] text-[#F5F2EC] rounded-xl mb-4"
            />
            <Text className="text-xs font-semibold text-[#65605A] uppercase tracking-wider mb-2">Description</Text>
            <TextInput
              value={roomDesc}
              onChangeText={setRoomDesc}
              placeholder="Daily coding, everyone..."
              placeholderTextColor="#65605A"
              className="px-4 py-3 bg-[#0B0B0C] border border-[#2B2521] text-[#F5F2EC] rounded-xl mb-4"
            />
            <Text className="text-xs font-semibold text-[#65605A] uppercase tracking-wider mb-2">Visibility</Text>
            <View className="flex-row mb-4">
              <TouchableOpacity
                onPress={() => setVisibility('PUBLIC')}
                className={`flex-1 py-3 px-2 items-center justify-center rounded-xl mr-2 ${
                  visibility === 'PUBLIC' ? 'bg-[#E8C08A]' : 'bg-[#181513] border border-[#2B2521]'
                }`}
              >
                <Text className={`font-bold text-xs ${visibility === 'PUBLIC' ? 'text-[#241C14]' : 'text-[#F5F2EC]'}`}>
                  Public
                </Text>
                <Text className={`text-[10px] mt-0.5 ${visibility === 'PUBLIC' ? 'text-[#241C14]/80' : 'text-[#65605A]'}`}>
                  Direct Join
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={() => setVisibility('PRIVATE')}
                className={`flex-1 py-3 px-2 items-center justify-center rounded-xl ml-2 ${
                  visibility === 'PRIVATE' ? 'bg-[#E8C08A]' : 'bg-[#181513] border border-[#2B2521]'
                }`}
              >
                <Text className={`font-bold text-xs ${visibility === 'PRIVATE' ? 'text-[#241C14]' : 'text-[#F5F2EC]'}`}>
                  Private
                </Text>
                <Text className={`text-[10px] mt-0.5 ${visibility === 'PRIVATE' ? 'text-[#241C14]/80' : 'text-[#65605A]'}`}>
                  Requires Approval
                </Text>
              </TouchableOpacity>
            </View>
            <TouchableOpacity
              onPress={handleCreateRoom}
              className="bg-[#E8C08A] py-3.5 rounded-xl items-center"
            >
              <Text className="text-[#241C14] font-bold text-sm">Save Room</Text>
            </TouchableOpacity>
          </View>
        )}

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
