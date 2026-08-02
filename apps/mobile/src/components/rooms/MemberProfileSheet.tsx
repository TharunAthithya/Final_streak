import React from 'react';
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  ScrollView,
} from 'react-native';
import { Icon } from '../ui/Icon';
import { Avatar } from './Avatar';

export interface RoomMemberDetail {
  id: string;
  userId: string;
  displayName: string;
  username: string;
  avatarPath?: string;
  role: string;
  joinedAt?: string;
  bio?: string;
  isYou?: boolean;
  status?: string;
  streaks?: Array<{ habitName: string; streak: number }>;
}

interface MemberProfileSheetProps {
  visible: boolean;
  member: RoomMemberDetail | null;
  roomHabits?: Array<{ id: string; name: string }>;
  onClose: () => void;
}

export const MemberProfileSheet: React.FC<MemberProfileSheetProps> = ({
  visible,
  member,
  roomHabits = [],
  onClose,
}) => {
  if (!member) return null;

  const formatDate = (isoStr?: string) => {
    if (!isoStr) return 'Joined recently';
    const date = new Date(isoStr);
    return `Member since ${date.toLocaleDateString([], { month: 'short', year: 'numeric' })}`;
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent
      onRequestClose={onClose}
    >
      <View style={{ flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.65)' }}>
        <TouchableOpacity style={{ flex: 1 }} onPress={onClose} activeOpacity={1} />

        <View
          style={{
            backgroundColor: '#141110',
            borderTopLeftRadius: 28,
            borderTopRightRadius: 28,
            borderTopWidth: 1,
            borderColor: '#2B2521',
            maxHeight: '80%',
          }}
          className="px-6 pt-3 pb-8"
        >
          {/* Drag Handle */}
          <View className="items-center pb-4">
            <View className="w-9 h-1 rounded-full bg-[#2B2521]" />
          </View>

          {/* Close Button */}
          <TouchableOpacity
            onPress={onClose}
            className="absolute top-4 right-4 w-8 h-8 rounded-full bg-[#221D1A] border border-[#2B2521] items-center justify-center z-10"
          >
            <Icon name="x" size={15} color="#9C958C" />
          </TouchableOpacity>

          <ScrollView showsVerticalScrollIndicator={false} className="pt-2">
            {/* Header / Avatar */}
            <View className="items-center text-center mb-6">
              <Avatar name={member.displayName} size={64} />
              <View className="flex-row items-center mt-3">
                <Text className="text-xl font-bold text-[#F5F2EC] mr-2" style={{ fontFamily: 'Baloo 2' }}>
                  {member.displayName}
                </Text>
                {member.isYou && (
                  <View className="bg-[#3A2E1F] border border-[#E8C08A]/30 px-2 py-0.5 rounded-full">
                    <Text className="text-[10px] font-bold text-[#E8C08A]">YOU</Text>
                  </View>
                )}
                {member.role === 'OWNER' && (
                  <View className="bg-[#2B2521] px-2 py-0.5 rounded-full ml-1">
                    <Text className="text-[10px] font-bold text-[#E8C08A]">CREATOR</Text>
                  </View>
                )}
              </View>

              <Text className="text-xs text-[#E8C08A] mt-0.5">@{member.username}</Text>
              <Text className="text-xs text-[#9C958C] mt-1">{formatDate(member.joinedAt)}</Text>
              {member.bio ? (
                <Text className="text-xs text-[#9C958C] text-center mt-2 max-w-[260px]">
                  "{member.bio}"
                </Text>
              ) : null}
            </View>

            {/* Room Habits Consistency Summary */}
            <View className="mb-6">
              <Text className="text-xs font-bold text-[#65605A] uppercase tracking-widest mb-3">
                ROOM HABITS CONSISTENCY
              </Text>
              {roomHabits.length === 0 ? (
                <Text className="text-xs text-[#65605A] italic">No tracked habits in this room yet.</Text>
              ) : (
                roomHabits.map((habit) => (
                  <View
                    key={habit.id}
                    className="bg-[#181513] border border-[#2B2521] p-3.5 rounded-2xl mb-2.5 flex-row items-center justify-between"
                  >
                    <View className="flex-row items-center flex-1 pr-3">
                      <View className="w-8 h-8 rounded-xl bg-[#2B2521] items-center justify-center mr-3">
                        <Icon name="target" size={16} color="#E8C08A" />
                      </View>
                      <Text className="text-sm font-bold text-[#F5F2EC]">{habit.name}</Text>
                    </View>

                    <View className="flex-row items-center bg-[#241E1A] px-2.5 py-1 rounded-full border border-[#E8C08A]/30">
                      <Icon name="fire" size={12} color="#E8A05A" className="mr-1" />
                      <Text className="text-xs font-bold text-[#F5F2EC]">Active Streak</Text>
                    </View>
                  </View>
                ))
              )}
            </View>

            {/* Encouragement Footer */}
            <View className="bg-[#181513] border border-[#2B2521] p-4 rounded-2xl items-center mb-6">
              <Text className="text-xs text-[#9C958C] text-center leading-relaxed">
                Keeping promises together • Support @{member.username} by staying consistent today!
              </Text>
            </View>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
};
