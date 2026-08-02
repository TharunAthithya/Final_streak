import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { Icon } from '../ui/Icon';
import { Avatar } from './Avatar';
import { MemberProfileSheet, RoomMemberDetail } from './MemberProfileSheet';
import { RoomChatFeed, RoomFeedItem } from './RoomChatFeed';
import { ReactionKind } from './ReactionPill';
import { StreakApiClient } from '@streak/api-client';

interface RoomDetailsHubProps {
  roomDetails: any;
  roomMembers: any[];
  roomActivities: any[];
  userHabits: any[];
  currentUserId?: string;
  loadingDetails: boolean;
  apiClient: StreakApiClient;
  onBack: () => void;
  onOpenRoomInfo: () => void;
  onLeaveRoom: () => Promise<void>;
  onDeleteRoom?: () => Promise<void>;
  onToggleReaction: (activityId: string, reactionKind: ReactionKind) => Promise<void>;
  onQuickCompleteHabit: (habitName: string) => Promise<void>;
}

export const RoomDetailsHub: React.FC<RoomDetailsHubProps> = ({
  roomDetails,
  roomMembers,
  roomActivities,
  userHabits,
  currentUserId,
  loadingDetails,
  apiClient,
  onBack,
  onOpenRoomInfo,
  onLeaveRoom,
  onDeleteRoom,
  onToggleReaction,
  onQuickCompleteHabit,
}) => {
  const [selectedMember, setSelectedMember] = useState<RoomMemberDetail | null>(null);
  const [completingHabitName, setCompletingHabitName] = useState<string | null>(null);

  const isOwner = roomDetails?.ownerId === currentUserId;
  const trackedHabits = roomDetails?.trackedHabits || roomDetails?.roomHabits || [];

  // Compute Current User's Personal Progress in this Room today
  const { completedCount, totalCount, userPercent, isAllCompleted } = useMemo(() => {
    if (!trackedHabits || trackedHabits.length === 0) {
      return { completedCount: 0, totalCount: 0, userPercent: 0, isAllCompleted: false };
    }
    let completed = 0;
    trackedHabits.forEach((th: any) => {
      const userHabit = userHabits.find(
        (h: any) => h.name.toLowerCase() === th.name.toLowerCase()
      );
      if (userHabit && userHabit.completedToday) {
        completed++;
      }
    });
    const pct = Math.round((completed / trackedHabits.length) * 100);
    return {
      completedCount: completed,
      totalCount: trackedHabits.length,
      userPercent: pct,
      isAllCompleted: completed === trackedHabits.length && trackedHabits.length > 0,
    };
  }, [trackedHabits, userHabits]);

  // Convert room activities into rich chat feed items
  const feedItems: RoomFeedItem[] = useMemo(() => {
    if (!roomDetails) return [];

    const result: RoomFeedItem[] = [];
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
      const dateObj = new Date(act.createdAt || act.created_at || Date.now());
      const dateLabel = dateObj.toLocaleDateString([], { weekday: 'short', day: 'numeric', month: 'short' });
      const timeLabel = dateObj.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });

      if (dateLabel !== lastDateStr) {
        lastDateStr = dateLabel;
        result.push({
          id: `date-${dateLabel}-${idx}`,
          kind: 'date',
          label: dateLabel,
        });
        lastActor = '';
      }

      if (act.type === 'ROOM_JOIN') {
        result.push({
          id: act.id,
          kind: 'join',
          name: act.actorDisplayName || 'A member',
          time: timeLabel,
        });
        lastActor = '';
      } else {
        const isFirstInRun = (act.actorDisplayName || 'Member') !== lastActor;
        lastActor = act.actorDisplayName || 'Member';

        result.push({
          id: act.id,
          kind: 'msg',
          name: act.actorDisplayName || 'Member',
          habit: act.message || 'Completed a habit',
          time: timeLabel,
          isOwn: act.actorUserId === currentUserId || act.isOwn,
          isFirstInRun,
          isLastInRun: true,
          reactions: act.reactions,
        });
      }
    });

    return result;
  }, [roomDetails, roomActivities, currentUserId]);

  const handleQuickComplete = async (habitName: string) => {
    setCompletingHabitName(habitName);
    try {
      await onQuickCompleteHabit(habitName);
    } catch (e: any) {
      Alert.alert('Completion Failed', e.message || 'Failed to complete habit');
    } finally {
      setCompletingHabitName(null);
    }
  };

  const getJoinedAgoText = (isoStr?: string) => {
    if (!isoStr) return 'Joined recently';
    const joinedDate = new Date(isoStr);
    const now = new Date();
    const diffDays = Math.max(1, Math.floor((now.getTime() - joinedDate.getTime()) / (1000 * 60 * 60 * 24)));
    return `Joined ${diffDays} day${diffDays === 1 ? '' : 's'} ago`;
  };

  return (
    <View className="flex-1 bg-[#0B0B0C]">
      {/* Top App Bar: ← Room Name ⓘ */}
      <View className="px-6 pt-14 pb-4 border-b border-[#1C1815] bg-[#0B0B0C] flex-row items-center justify-between">
        <TouchableOpacity
          onPress={onBack}
          className="w-10 h-10 bg-[#18140F] border border-[#2B2521] rounded-full items-center justify-center"
        >
          <Icon name="arrow-left" size={18} color="#F5F2EC" />
        </TouchableOpacity>

        <Text className="text-lg font-bold text-[#F5F2EC]" style={{ fontFamily: 'Baloo 2' }}>
          {roomDetails?.name || 'Room Details'}
        </Text>

        <TouchableOpacity
          onPress={onOpenRoomInfo}
          className="w-10 h-10 bg-[#241E1A] border border-[#E8C08A]/30 rounded-full items-center justify-center"
        >
          <Icon name="info" size={18} color="#E8C08A" />
        </TouchableOpacity>
      </View>

      <ScrollView className="flex-1 px-6 pt-5" showsVerticalScrollIndicator={false}>


        {/* CARD 3 — TODAY'S PROGRESS (Personal Room Progress) */}
        <View className="bg-[#181513] border border-[#2B2521] p-5 rounded-2xl mb-5">
          <View className="flex-row items-center justify-between mb-2">
            <Text className="text-xs font-bold text-[#65605A] uppercase tracking-widest">
              TODAY'S PROGRESS
            </Text>
            <Text className="text-xs font-bold text-[#E8C08A]">
              {userPercent}% Complete
            </Text>
          </View>

          <Text className="text-sm font-bold text-[#F5F2EC] mb-3">
            {completedCount} of {totalCount} habits completed
          </Text>

          {/* Visual Progress Bar */}
          <View className="w-full h-2.5 bg-[#2B2521] rounded-full overflow-hidden mb-3">
            <View
              className="h-full bg-[#E8C08A] rounded-full"
              style={{ width: `${userPercent}%` }}
            />
          </View>

          {/* Supportive Status Message / 100% Completion Badge */}
          <View className="flex-row items-center pt-1 mb-3">
            {isAllCompleted ? (
              <View className="flex-row items-center bg-[#8FBF9E]/20 border border-[#8FBF9E]/40 px-3 py-1.5 rounded-xl">
                <Icon name="check" size={14} color="#8FBF9E" className="mr-1.5" />
                <Text className="text-xs font-bold text-[#8FBF9E]">
                  ✓ Today's room promises completed
                </Text>
              </View>
            ) : totalCount - completedCount === 1 ? (
              <Text className="text-xs font-semibold text-[#E8C08A]">
                1 more promise to keep today.
              </Text>
            ) : completedCount > 0 ? (
              <Text className="text-xs font-semibold text-[#E8C08A]">
                You're doing great today.
              </Text>
            ) : (
              <Text className="text-xs text-[#9C958C]">
                Ready to show up today? Complete your habits below.
              </Text>
            )}
          </View>

          {/* Room Habit Names & Today's Completion Status */}
          {trackedHabits.length > 0 && (
            <View className="pt-3 border-t border-[#2B2521] space-y-2">
              {trackedHabits.map((habit: any, idx: number) => {
                const userHabit = userHabits.find(
                  (h: any) => h.name.toLowerCase() === habit.name.toLowerCase()
                );
                const isCompleted = userHabit?.completedToday;

                return (
                  <View key={idx} className="flex-row items-center justify-between py-1">
                    <View className="flex-row items-center flex-1 pr-2">
                      <View className={`w-5 h-5 rounded-full items-center justify-center mr-2 ${isCompleted ? 'bg-[#8FBF9E]/20' : 'bg-[#2B2521]'}`}>
                        <Icon
                          name={isCompleted ? 'check' : 'target'}
                          size={11}
                          color={isCompleted ? '#8FBF9E' : '#9C958C'}
                        />
                      </View>
                      <Text
                        className={`text-xs font-semibold ${
                          isCompleted ? 'text-[#8FBF9E]' : 'text-[#F5F2EC]'
                        }`}
                      >
                        {habit.name}
                      </Text>
                    </View>

                    <Text className={`text-[11px] font-bold ${isCompleted ? 'text-[#8FBF9E]' : 'text-[#65605A]'}`}>
                      {isCompleted ? '✓ Completed' : '○ Pending'}
                    </Text>
                  </View>
                );
              })}
            </View>
          )}
        </View>

        {/* CARD 4 — 🤝 SHARED HABITS */}
        <View className="mb-5">
          <Text className="text-xs font-bold text-[#65605A] uppercase tracking-widest mb-3">
            SHARED HABITS ({trackedHabits.length})
          </Text>

          {trackedHabits.length === 0 ? (
            <View className="bg-[#181513] border border-[#2B2521] p-6 rounded-2xl items-center">
              <Icon name="target" size={28} color="#65605A" className="mb-2" />
              <Text className="text-sm text-[#9C958C]">This room doesn't have any tracked habits yet.</Text>
            </View>
          ) : (
            trackedHabits.map((habit: any, habitIdx: number) => {
              const userHabit = userHabits.find(
                (h: any) => h.name.toLowerCase() === habit.name.toLowerCase()
              );
              const isUserCompleted = userHabit?.completedToday;

              return (
                <View key={habitIdx} className="bg-[#181513] border border-[#2B2521] p-4 rounded-2xl mb-3">
                  <View className="flex-row items-center justify-between mb-3 pb-3 border-b border-[#2B2521]">
                    <View className="flex-row items-center">
                      <View className="w-8 h-8 rounded-xl bg-[#3A2E1F] border border-[#E8C08A]/30 items-center justify-center mr-2.5">
                        <Icon name={habit.icon || 'target'} size={16} color="#E8C08A" />
                      </View>
                      <Text className="text-base font-bold text-[#F5F2EC]">{habit.name}</Text>
                    </View>
                  </View>

                  {/* Member Completion Rows */}
                  <View className="space-y-2">
                    {/* Current User Row */}
                    <View className="flex-row items-center justify-between py-2 px-2.5 bg-[#241E1A] rounded-xl border border-[#3A2E1F]">
                      <View className="flex-row items-center">
                        <Avatar name="You" size={26} />
                        <Text className="text-xs font-bold text-[#F5F2EC] ml-2">You</Text>
                        <View className="bg-[#3A2E1F] px-1.5 py-0.5 rounded-full ml-1.5">
                          <Text className="text-[9px] font-bold text-[#E8C08A]">YOU</Text>
                        </View>
                      </View>

                      {isUserCompleted ? (
                        <View className="flex-row items-center bg-[#8FBF9E]/20 border border-[#8FBF9E]/40 px-2.5 py-1 rounded-full">
                          <Icon name="check" size={12} color="#8FBF9E" className="mr-1" />
                          <Text className="text-[11px] font-bold text-[#8FBF9E]">✓ Completed</Text>
                        </View>
                      ) : (
                        <TouchableOpacity
                          onPress={() => handleQuickComplete(habit.name)}
                          disabled={completingHabitName === habit.name}
                          className="flex-row items-center bg-[#E8C08A] px-3.5 py-1 rounded-full"
                        >
                          {completingHabitName === habit.name ? (
                            <ActivityIndicator size="small" color="#241C14" />
                          ) : (
                            <Text className="text-[11px] font-bold text-[#241C14]">
                              ○ Complete
                            </Text>
                          )}
                        </TouchableOpacity>
                      )}
                    </View>

                    {/* Other Members Rows */}
                    {roomMembers
                      .filter((m: any) => (m.user?.id || m.profileId) !== currentUserId)
                      .map((m: any, mIdx: number) => {
                        const mName = m.user?.displayName || m.displayName || 'Member';
                        const isCompletedToday = roomActivities.some(
                          (act: any) =>
                            (act.actorUserId === (m.user?.id || m.profileId) || act.actorDisplayName === mName) &&
                            act.message?.toLowerCase().includes(habit.name.toLowerCase())
                        );

                        return (
                          <TouchableOpacity
                            key={mIdx}
                            onPress={() =>
                              setSelectedMember({
                                id: m.id,
                                userId: m.user?.id || m.profileId,
                                displayName: mName,
                                username: m.user?.username || m.username || 'user',
                                avatarPath: m.user?.avatarPath,
                                role: m.role,
                                joinedAt: m.joinedAt,
                                bio: m.user?.bio,
                              })
                            }
                            className="flex-row items-center justify-between py-2 px-2.5 rounded-xl"
                          >
                            <View className="flex-row items-center">
                              <Avatar name={mName} size={24} />
                              <Text className="text-xs font-semibold text-[#9C958C] ml-2">{mName}</Text>
                            </View>

                            {isCompletedToday ? (
                              <View className="flex-row items-center bg-[#8FBF9E]/10 px-2 py-0.5 rounded-full">
                                <Icon name="check" size={12} color="#8FBF9E" className="mr-1" />
                                <Text className="text-[11px] font-bold text-[#8FBF9E]">✓</Text>
                              </View>
                            ) : (
                              <Text className="text-xs text-[#65605A]">○</Text>
                            )}
                          </TouchableOpacity>
                        );
                      })}
                  </View>
                </View>
              );
            })
          )}
        </View>

        {/* CARD 5 — ⚡ ACTIVITY FEED */}
        <View className="mb-5">
          <Text className="text-xs font-bold text-[#65605A] uppercase tracking-widest mb-3">
            ACTIVITY
          </Text>

          {loadingDetails ? (
            <ActivityIndicator size="large" color="#E8C08A" className="py-6" />
          ) : feedItems.length <= 1 ? (
            <View className="bg-[#181513] border border-[#2B2521] p-6 rounded-2xl items-center">
              <Icon name="feed" size={28} color="#65605A" className="mb-2" />
              <Text className="text-sm font-semibold text-[#F5F2EC] mb-1">Nothing yet</Text>
              <Text className="text-xs text-[#9C958C] text-center">
                Be the first person to complete a habit today.
              </Text>
            </View>
          ) : (
            <View className="bg-[#181513] border border-[#2B2521] rounded-2xl overflow-hidden p-2">
              <RoomChatFeed items={feedItems} onToggleReaction={onToggleReaction} />
            </View>
          )}
        </View>

        {/* CARD 6 — 👥 MEMBERS */}
        <View className="mb-10">
          <Text className="text-xs font-bold text-[#65605A] uppercase tracking-widest mb-3">
            MEMBERS ({roomMembers.length})
          </Text>

          {roomMembers.length === 0 ? (
            <View className="bg-[#181513] border border-[#2B2521] p-6 rounded-2xl items-center">
              <Icon name="users" size={28} color="#65605A" className="mb-2" />
              <Text className="text-sm text-[#9C958C]">
                Invite someone to start keeping promises together.
              </Text>
            </View>
          ) : (
            <View className="bg-[#181513] border border-[#2B2521] rounded-2xl overflow-hidden">
              {roomMembers.map((m: any, idx: number) => {
                const displayName = m.user?.displayName || m.displayName || 'Member';
                const username = m.user?.username || m.username || 'user';
                const isYou = (m.user?.id || m.profileId) === currentUserId;
                const joinedAgo = getJoinedAgoText(m.joinedAt);

                return (
                  <TouchableOpacity
                    key={m.id || idx}
                    onPress={() =>
                      setSelectedMember({
                        id: m.id,
                        userId: m.user?.id || m.profileId,
                        displayName,
                        username,
                        avatarPath: m.user?.avatarPath,
                        role: m.role,
                        joinedAt: m.joinedAt,
                        bio: m.user?.bio,
                        isYou,
                      })
                    }
                    className={`flex-row items-center p-3.5 ${
                      idx > 0 ? 'border-t border-[#2B2521]' : ''
                    }`}
                  >
                    <Avatar name={displayName} size={36} />
                    <View className="flex-1 ml-3">
                      <View className="flex-row items-center">
                        <Text className="text-sm font-bold text-[#F5F2EC] mr-2">{displayName}</Text>
                        {isYou && (
                          <View className="bg-[#3A2E1F] px-1.5 py-0.5 rounded-full mr-1">
                            <Text className="text-[9.5px] font-bold text-[#E8C08A]">YOU</Text>
                          </View>
                        )}
                        {m.role === 'OWNER' && (
                          <View className="bg-[#2B2521] px-1.5 py-0.5 rounded-full">
                            <Text className="text-[9.5px] font-bold text-[#E8C08A]">OWNER</Text>
                          </View>
                        )}
                      </View>
                      <Text className="text-xs text-[#65605A]">
                        @{username} • {joinedAgo}
                      </Text>
                    </View>

                    <View className="flex-row items-center">
                      <View className="w-2 h-2 rounded-full bg-[#8FBF9E] mr-1.5" />
                      <Text className="text-xs font-semibold text-[#8FBF9E]">Joined</Text>
                    </View>
                  </TouchableOpacity>
                );
              })}
            </View>
          )}
        </View>
      </ScrollView>

      {/* Member Profile Bottom Sheet */}
      <MemberProfileSheet
        visible={!!selectedMember}
        member={selectedMember}
        roomHabits={trackedHabits}
        onClose={() => setSelectedMember(null)}
      />
    </View>
  );
};
