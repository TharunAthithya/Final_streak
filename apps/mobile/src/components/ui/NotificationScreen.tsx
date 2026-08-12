import React, { useState } from 'react';
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  ScrollView,
} from 'react-native';
import { Icon } from './Icon';
import { useNotificationStore, NotificationItem } from '../../store/notification-store';
import { StreakApiClient } from '@streak/api-client';
import { NotificationRowSkeleton } from './skeletons/NotificationRowSkeleton';
import { useNotice } from './Notice';
import { useDelayedLoading } from '../../hooks/useDelayedLoading';
import { HabitMatchGate } from '../rooms/HabitMatchGate';
import { useHabitStore } from '../../store/habit-store';

interface NotificationScreenProps {
  visible: boolean;
  apiClient: StreakApiClient;
  onClose: () => void;
}

export const NotificationScreen: React.FC<NotificationScreenProps> = ({
  visible,
  apiClient,
  onClose,
}) => {
  const { notifications, loading, fetchNotifications, respondToInvitation, markAllAsRead } =
    useNotificationStore();
  const { habits } = useHabitStore();
  const notice = useNotice();
  const showSkeleton = useDelayedLoading(loading);

  const [pendingGateRoom, setPendingGateRoom] = useState<{
    roomName: string;
    trackedHabits: any[];
    item: NotificationItem;
  } | null>(null);

  const handleAccept = async (item: NotificationItem) => {
    if (!item.referenceId) return;

    try {
      if ((item as any).type === 'ROOM_INVITATION') {
        const details = await (apiClient as any).getInvitationDetails(item.referenceId);
        const tracked = details.trackedHabits || [];
        const missing = tracked.filter(
          (th: any) => !habits.some((h) => h.name.toLowerCase() === th.name.toLowerCase())
        );

        if (missing.length > 0) {
          setPendingGateRoom({
            roomName: details.roomName,
            trackedHabits: tracked,
            item,
          });
          return;
        }
      }

      await executeAcceptInvitation(item);
    } catch (e: any) {
      notice.error(e.message || 'Failed to accept invitation');
    }
  };

  const executeAcceptInvitation = async (item: NotificationItem) => {
    if (!item.referenceId) return;
    await respondToInvitation(apiClient, item.referenceId, true);
    await fetchNotifications(apiClient);
    if (item.type === 'JOIN_REQUEST') {
      const userName = item.title.split(' ')[0] || 'User';
      notice.success(`${userName} has joined your room!`);
    } else {
      notice.success('You have joined the room!');
    }
  };

  const handleReject = async (invitationId: string) => {
    try {
      await respondToInvitation(apiClient, invitationId, false);
      await fetchNotifications(apiClient);
    } catch (e: any) {
      notice.error(e.message || 'Failed to reject invitation');
    }
  };

  // Group notifications into TODAY and EARLIER
  const todayStr = new Date().toISOString().split('T')[0];
  const todayNotifications = notifications.filter(
    (n) => n.createdAt.split('T')[0] === todayStr
  );
  const earlierNotifications = notifications.filter(
    (n) => n.createdAt.split('T')[0] !== todayStr
  );

  const renderNotificationItem = (item: NotificationItem) => {
    const isActionable = ((item as any).type === 'ROOM_INVITATION' || item.type === 'JOIN_REQUEST') && item.referenceId;

    return (
      <View
        key={item.id}
        className={`p-4 rounded-2xl mb-3 border ${
          isActionable ? 'bg-[#1D1712] border-[#3A2E1F]' : 'bg-[#181513] border-[#2B2521]'
        }`}
      >
        <View className="flex-row items-start">
          <View className="w-10 h-10 bg-[#221C16] rounded-full items-center justify-center mr-3 mt-0.5 border border-[#3A2E1F]">
            <Icon name="bell" size={18} color="#E8C08A" />
          </View>

          <View className="flex-1 pr-2">
            <Text className="text-sm font-semibold text-[#F5F2EC] leading-snug">
              {item.title}
            </Text>
            {item.body ? (
              <Text className="text-xs text-[#9C958C] mt-0.5 leading-relaxed">{item.body}</Text>
            ) : null}
          </View>

          {!item.isRead && <View className="w-2.5 h-2.5 rounded-full bg-[#E8C08A] mt-2" />}
        </View>

        {isActionable && item.referenceId && (
          <View className="flex-row mt-3 pt-3 border-t border-[#2B2521] space-x-3">
            <TouchableOpacity
              onPress={() => handleAccept(item)}
              className="flex-1 py-2.5 bg-[#E8C08A] rounded-xl items-center mr-2"
            >
              <Text className="text-xs font-bold text-[#241C14]">Accept</Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => handleReject(item.referenceId!)}
              className="flex-1 py-2.5 bg-[#181513] border border-[#2B2521] rounded-xl items-center ml-2"
            >
              <Text className="text-xs font-bold text-[#F5F2EC]">Decline</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>
    );
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent
      onRequestClose={onClose}
    >
      <View style={{ flex: 1, backgroundColor: '#0B0B0C' }}>
        {/* Header */}
        <View className="px-6 pt-14 pb-4 border-b border-[#2B2521] flex-row justify-between items-center bg-[#0B0B0C]">
          <TouchableOpacity onPress={onClose} className="p-2">
            <Icon name="arrow-left" size={20} color="#F5F2EC" />
          </TouchableOpacity>
          <Text className="text-lg font-bold text-[#F5F2EC]">Notifications</Text>
          <TouchableOpacity onPress={() => markAllAsRead(apiClient)} className="p-2">
            <Text className="text-xs font-semibold text-[#E8C08A]">Mark all read</Text>
          </TouchableOpacity>
        </View>

        <ScrollView className="flex-1 px-6 pt-6" showsVerticalScrollIndicator={false}>
          {showSkeleton && notifications.length === 0 ? (
            <View className="space-y-3 mt-4">
              <NotificationRowSkeleton />
              <NotificationRowSkeleton />
              <NotificationRowSkeleton />
            </View>
          ) : notifications.length === 0 ? (
            <View className="bg-[#181513] border border-[#2B2521] p-8 rounded-2xl items-center my-10">
              <Icon name="bell" size={32} color="#E8C08A" className="mb-3" />
              <Text className="text-base font-semibold text-[#F5F2EC]">No Notifications</Text>
              <Text className="text-sm text-[#9C958C] text-center mt-1">
                Room invitations and streak updates will appear here.
              </Text>
            </View>
          ) : (
            <View className="pb-16">
              {todayNotifications.length > 0 && (
                <View className="mb-6">
                  <Text className="text-xs font-bold text-[#65605A] uppercase tracking-widest mb-3">
                    TODAY
                  </Text>
                  {todayNotifications.map(renderNotificationItem)}
                </View>
              )}

              {earlierNotifications.length > 0 && (
                <View className="mb-6">
                  <Text className="text-xs font-bold text-[#65605A] uppercase tracking-widest mb-3">
                    EARLIER
                  </Text>
                  {earlierNotifications.map(renderNotificationItem)}
                </View>
              )}
            </View>
          )}
        </ScrollView>

        {/* Habit Match Gate Modal */}
        {pendingGateRoom && (
          <HabitMatchGate
            visible={!!pendingGateRoom}
            roomName={pendingGateRoom.roomName}
            trackedHabits={pendingGateRoom.trackedHabits}
            userHabits={habits}
            apiClient={apiClient}
            onClose={() => setPendingGateRoom(null)}
            onCompleteJoin={async () => {
              await executeAcceptInvitation(pendingGateRoom.item);
              setPendingGateRoom(null);
            }}
          />
        )}
      </View>
    </Modal>
  );
};
