import React, { useState } from 'react';
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  Alert,
} from 'react-native';
import { Icon } from '../ui/Icon';
import { Avatar } from './Avatar';
import { MemberProfileSheet, RoomMemberDetail } from './MemberProfileSheet';
import { StreakApiClient } from '@streak/api-client';

interface RoomMemberItem {
  id?: string;
  profileId: string;
  displayName: string;
  username: string;
  role: string;
  status?: string; // 'JOINED' | 'PENDING' | 'OWNER'
  joinedAt?: string;
  isYou?: boolean;
  avatarPath?: string;
  bio?: string;
}

interface RoomInfoSheetProps {
  visible: boolean;
  roomDetails: any;
  members: RoomMemberItem[];
  apiClient: StreakApiClient;
  roomId: string;
  isOwner?: boolean;
  onClose: () => void;
  onOpenInviteModal: () => void;
  onLeaveRoom: () => Promise<void>;
  onDeleteRoom?: () => Promise<void>;
}

export const RoomInfoSheet: React.FC<RoomInfoSheetProps> = ({
  visible,
  roomDetails,
  members,
  apiClient,
  roomId,
  isOwner = false,
  onClose,
  onOpenInviteModal,
  onLeaveRoom,
  onDeleteRoom,
}) => {
  const [selectedMember, setSelectedMember] = useState<RoomMemberDetail | null>(null);

  const handleExtend = async (additionalDays: number) => {
    try {
      await apiClient.extendRoomDuration(roomId, additionalDays);
      Alert.alert('Duration Extended', `Room extended by ${additionalDays} days!`);
      onClose();
    } catch (e: any) {
      Alert.alert('Error', e.message || 'Failed to extend room duration');
    }
  };

  if (!roomDetails) return null;

  const roomName = roomDetails.name || 'Room Information';
  const description = roomDetails.description || "Let's stay consistent together.";
  const durationDays = roomDetails.durationDays || roomDetails.duration_days || 30;
  const createdAtIso = roomDetails.createdAt || roomDetails.created_at;

  const formattedCreatedDate = createdAtIso
    ? new Date(createdAtIso).toLocaleDateString([], { day: 'numeric', month: 'long', year: 'numeric' })
    : '29 July 2026';

  const formattedStartDate = createdAtIso
    ? new Date(createdAtIso).toLocaleDateString([], { day: 'numeric', month: 'long', year: 'numeric' })
    : '29 July 2026';

  const endDateObj = createdAtIso
    ? new Date(new Date(createdAtIso).getTime() + durationDays * 24 * 60 * 60 * 1000)
    : null;

  const formattedEndDate = endDateObj
    ? endDateObj.toLocaleDateString([], { day: 'numeric', month: 'long', year: 'numeric' })
    : 'Ongoing';

  const daysActive = createdAtIso
    ? Math.max(1, Math.floor((Date.now() - new Date(createdAtIso).getTime()) / (1000 * 60 * 60 * 24)))
    : 1;

  const trackedHabits = roomDetails.trackedHabits || roomDetails.roomHabits || [];

  const handleConfirmLeave = () => {
    Alert.alert(
      'Leave Room',
      'Are you sure you want to leave this room? You will no longer track habits with this group.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Leave Room',
          style: 'destructive',
          onPress: async () => {
            try {
              onClose();
              await onLeaveRoom();
            } catch (e: any) {
              Alert.alert('Error', e.message || 'Failed to leave room');
            }
          },
        },
      ]
    );
  };

  const handleConfirmDelete = () => {
    if (!onDeleteRoom) return;
    Alert.alert(
      'Delete Room',
      'Are you sure you want to delete this room? This action cannot be undone and will remove all members.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete Room',
          style: 'destructive',
          onPress: async () => {
            try {
              onClose();
              await onDeleteRoom();
            } catch (e: any) {
              Alert.alert('Error', e.message || 'Failed to delete room');
            }
          },
        },
      ]
    );
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent
      onRequestClose={onClose}
    >
      <View style={{ flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.7)' }}>
        <TouchableOpacity style={{ flex: 1 }} onPress={onClose} activeOpacity={1} />

        <View
          style={{
            backgroundColor: '#141110',
            borderTopLeftRadius: 28,
            borderTopRightRadius: 28,
            borderTopWidth: 1,
            borderColor: '#2B2521',
            maxHeight: '90%',
            minHeight: 520,
          }}
          className="relative px-6 pt-3 pb-8"
        >
          {/* Drag Handle */}
          <View className="items-center pb-3">
            <View className="w-10 h-1 rounded-full bg-[#2B2521]" />
          </View>

          {/* Sheet Header */}
          <View className="flex-row items-center justify-between pb-3 mb-2 border-b border-[#2B2521]">
            <Text className="text-lg font-bold text-[#F5F2EC]" style={{ fontFamily: 'Baloo 2' }}>
              Room Information
            </Text>
            <TouchableOpacity
              onPress={onClose}
              className="w-8 h-8 rounded-full bg-[#221D1A] border border-[#2B2521] items-center justify-center"
            >
              <Icon name="x" size={15} color="#9C958C" />
            </TouchableOpacity>
          </View>

          <ScrollView showsVerticalScrollIndicator={false} className="flex-1">
            {/* SECTION A — ROOM OVERVIEW */}
            <View className="bg-[#181513] border border-[#2B2521] p-4 rounded-2xl mb-5 mt-2">
              <View className="flex-row items-center mb-2">
                <View className="w-12 h-12 bg-[#3A2E1F] border border-[#E8C08A]/30 rounded-2xl items-center justify-center mr-3">
                  <Icon name="rooms" size={24} color="#E8C08A" />
                </View>
                <View className="flex-1">
                  <Text className="text-xl font-bold text-[#F5F2EC]" style={{ fontFamily: 'Baloo 2' }}>
                    {roomName}
                  </Text>
                  <Text className="text-xs text-[#9C958C] leading-relaxed mt-0.5">
                    {description}
                  </Text>
                </View>
              </View>
            </View>

            {/* SECTION B — CHALLENGE DETAILS */}
            <View className="bg-[#181513] border border-[#2B2521] p-4 rounded-2xl mb-5">
              <Text className="text-xs font-bold text-[#65605A] uppercase tracking-widest mb-3">
                CHALLENGE DETAILS
              </Text>

              <View className="space-y-2.5">
                <View className="flex-row justify-between items-center py-1">
                  <Text className="text-xs text-[#9C958C]">Challenge Length</Text>
                  <Text className="text-xs font-bold text-[#F5F2EC]">
                    {roomDetails.durationType === 'PERMANENT' ? 'Permanent ∞' : `${durationDays} Days`}
                  </Text>
                </View>

                {roomDetails.expiresAt && (
                  <View className="flex-row justify-between items-center py-1 border-t border-[#2B2521]">
                    <Text className="text-xs text-[#9C958C]">Expires On</Text>
                    <Text className="text-xs font-bold text-[#E8C08A]">
                      {new Date(roomDetails.expiresAt).toLocaleDateString([], { day: 'numeric', month: 'short', year: 'numeric' })}
                    </Text>
                  </View>
                )}

                <View className="flex-row justify-between items-center py-1 border-t border-[#2B2521]">
                  <Text className="text-xs text-[#9C958C]">Created Date</Text>
                  <Text className="text-xs font-bold text-[#E8C08A]">{formattedEndDate}</Text>
                </View>
              </View>
            </View>

            {/* SECTION C & D — MEMBERS & INVITE MEMBER */}
            <View className="bg-[#181513] border border-[#2B2521] p-4 rounded-2xl mb-5">
              <View className="flex-row justify-between items-center mb-3">
                <Text className="text-xs font-bold text-[#65605A] uppercase tracking-widest">
                  MEMBERS ({members.length})
                </Text>
              </View>

              <View className="rounded-xl overflow-hidden mb-4">
                {members.map((m, i) => {
                  const isOwnerRole = m.role === 'OWNER';
                  const isPending = m.role === 'PENDING' || m.status === 'PENDING';
                  const isYou = m.isYou || m.displayName === 'You';

                  return (
                    <TouchableOpacity
                      key={m.profileId || i}
                      onPress={() =>
                        setSelectedMember({
                          id: m.id || m.profileId,
                          userId: m.profileId,
                          displayName: m.displayName,
                          username: m.username,
                          avatarPath: m.avatarPath,
                          role: m.role,
                          joinedAt: m.joinedAt,
                          bio: m.bio,
                          isYou,
                        })
                      }
                      className={`flex-row items-center py-3 px-2 ${
                        i > 0 ? 'border-t border-[#2B2521]' : ''
                      }`}
                    >
                      <Avatar name={m.displayName} size={32} />
                      <View className="flex-1 ml-3">
                        <View className="flex-row items-center">
                          <Text className="text-sm font-bold text-[#F5F2EC] mr-1.5">
                            {m.displayName}
                          </Text>
                          {isYou && (
                            <View className="bg-[#3A2E1F] px-1.5 py-0.5 rounded-full mr-1">
                              <Text className="text-[9px] font-bold text-[#E8C08A]">YOU</Text>
                            </View>
                          )}
                        </View>
                        <Text className="text-xs text-[#65605A]">@{m.username}</Text>
                      </View>

                      {/* Member Status Badge */}
                      {isOwnerRole ? (
                        <View className="bg-[#3A2E1F] border border-[#E8C08A]/40 px-2.5 py-0.5 rounded-full">
                          <Text className="text-[10px] font-bold text-[#E8C08A]">Owner</Text>
                        </View>
                      ) : isPending ? (
                        <View className="bg-[#332415] border border-[#D97706]/40 px-2.5 py-0.5 rounded-full">
                          <Text className="text-[10px] font-bold text-[#F59E0B]">Pending Invitation</Text>
                        </View>
                      ) : (
                        <View className="bg-[#1C2C22] border border-[#8FBF9E]/40 px-2.5 py-0.5 rounded-full flex-row items-center">
                          <View className="w-1.5 h-1.5 rounded-full bg-[#8FBF9E] mr-1" />
                          <Text className="text-[10px] font-bold text-[#8FBF9E]">Joined</Text>
                        </View>
                      )}
                    </TouchableOpacity>
                  );
                })}
              </View>

              {/* Section D — Invite Member Button */}
              <TouchableOpacity
                onPress={() => {
                  onClose();
                  onOpenInviteModal();
                }}
                className="w-full bg-[#E8C08A] py-3 rounded-xl items-center flex-row justify-center shadow-sm"
              >
                <Icon name="plus" size={15} color="#241C14" className="mr-1.5" />
                <Text className="text-xs font-bold text-[#241C14]">+ Invite Member</Text>
              </TouchableOpacity>
            </View>

            {/* SECTION E — SHARED HABITS (READ ONLY) */}
            <View className="bg-[#181513] border border-[#2B2521] p-4 rounded-2xl mb-5">
              <Text className="text-xs font-bold text-[#65605A] uppercase tracking-widest mb-3">
                SHARED HABITS ({trackedHabits.length})
              </Text>

              {trackedHabits.length === 0 ? (
                <Text className="text-xs text-[#9C958C]">No shared habits configured for this room.</Text>
              ) : (
                <View className="space-y-2">
                  {trackedHabits.map((th: any, idx: number) => (
                    <View
                      key={idx}
                      className={`flex-row items-center py-2 px-2.5 bg-[#241E1A] rounded-xl border border-[#3A2E1F] ${
                        idx > 0 ? 'mt-2' : ''
                      }`}
                    >
                      <View className="w-7 h-7 rounded-lg bg-[#3A2E1F] border border-[#E8C08A]/30 items-center justify-center mr-2.5">
                        <Icon name={th.icon || 'target'} size={14} color="#E8C08A" />
                      </View>
                      <Text className="text-xs font-bold text-[#F5F2EC] flex-1">{th.name}</Text>
                      <Text className="text-[10px] text-[#65605A] font-semibold">Read-only</Text>
                    </View>
                  ))}
                </View>
              )}
            </View>

            {/* SECTION F — ROOM STATISTICS */}
            <View className="bg-[#181513] border border-[#2B2521] p-4 rounded-2xl mb-5">
              <Text className="text-xs font-bold text-[#65605A] uppercase tracking-widest mb-3">
                ROOM STATISTICS
              </Text>

              <View className="flex-row flex-wrap gap-2">
                <View className="flex-1 min-w-[130px] bg-[#241E1A] border border-[#2B2521] p-3 rounded-xl">
                  <Text className="text-[10px] text-[#9C958C] uppercase font-bold mb-1">Created</Text>
                  <Text className="text-xs font-bold text-[#F5F2EC]">{formattedCreatedDate}</Text>
                </View>

                <View className="flex-1 min-w-[130px] bg-[#241E1A] border border-[#2B2521] p-3 rounded-xl">
                  <Text className="text-[10px] text-[#9C958C] uppercase font-bold mb-1">Members</Text>
                  <Text className="text-xs font-bold text-[#F5F2EC]">{members.length}</Text>
                </View>

                <View className="flex-1 min-w-[130px] bg-[#241E1A] border border-[#2B2521] p-3 rounded-xl">
                  <Text className="text-[10px] text-[#9C958C] uppercase font-bold mb-1">Shared Habits</Text>
                  <Text className="text-xs font-bold text-[#F5F2EC]">{trackedHabits.length}</Text>
                </View>

                <View className="flex-1 min-w-[130px] bg-[#241E1A] border border-[#2B2521] p-3 rounded-xl">
                  <Text className="text-[10px] text-[#9C958C] uppercase font-bold mb-1">Days Active</Text>
                  <Text className="text-xs font-bold text-[#E8C08A]">{daysActive} Days</Text>
                </View>
              </View>
            </View>

            {/* SECTION G — DANGER ZONE */}
            <View className="bg-[#2B1B18] border border-[#4A2420] p-4 rounded-2xl mb-8">
              <Text className="text-xs font-bold text-[#E57373] uppercase tracking-widest mb-3">
                DANGER ZONE
              </Text>

              {isOwner ? (
                <TouchableOpacity
                  onPress={handleConfirmDelete}
                  className="w-full bg-[#E57373] py-3 rounded-xl items-center flex-row justify-center"
                >
                  <Icon name="trash" size={15} color="#141110" className="mr-1.5" />
                  <Text className="text-xs font-bold text-[#141110]">Delete Room</Text>
                </TouchableOpacity>
              ) : (
                <TouchableOpacity
                  onPress={handleConfirmLeave}
                  className="w-full bg-[#E57373] py-3 rounded-xl items-center flex-row justify-center"
                >
                  <Icon name="close" size={15} color="#141110" className="mr-1.5" />
                  <Text className="text-xs font-bold text-[#141110]">Leave Room</Text>
                </TouchableOpacity>
              )}
            </View>
          </ScrollView>
        </View>
      </View>

      {/* Member Profile Bottom Sheet */}
      <MemberProfileSheet
        visible={!!selectedMember}
        member={selectedMember}
        roomHabits={trackedHabits}
        onClose={() => setSelectedMember(null)}
      />
    </Modal>
  );
};
