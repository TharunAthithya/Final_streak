import { create } from 'zustand';
import { StreakApiClient } from '@streak/api-client';

export interface NotificationItem {
  id: string;
  profileId: string;
  type: string;
  title: string;
  body?: string | null;
  iconName?: string | null;
  referenceId?: string | null;
  isRead: boolean;
  createdAt: string;
  invitationDetails?: {
    invitationId: string;
    roomId: string;
    roomName: string;
    inviterName: string;
  } | null;
}

interface NotificationState {
  notifications: NotificationItem[];
  unreadCount: number;
  loading: boolean;
  error: string | null;
  fetchNotifications: (apiClient: StreakApiClient) => Promise<void>;
  markAsRead: (apiClient: StreakApiClient, id: string) => Promise<void>;
  markAllAsRead: (apiClient: StreakApiClient) => Promise<void>;
  respondToInvitation: (apiClient: StreakApiClient, invitationId: string, accept: boolean) => Promise<void>;
}

export const useNotificationStore = create<NotificationState>((set, get) => ({
  notifications: [],
  unreadCount: 0,
  loading: false,
  error: null,

  fetchNotifications: async (apiClient) => {
    set({ loading: true, error: null });
    try {
      const data = await apiClient.getNotifications();
      const formatted: NotificationItem[] = data.map((item: any) => ({
        id: item.id,
        profileId: item.profile_id,
        type: item.type,
        title: item.title,
        body: item.body,
        iconName: item.icon_name || 'bell',
        referenceId: item.reference_id,
        isRead: item.is_read,
        createdAt: item.created_at,
      }));

      const unread = formatted.filter((n) => !n.isRead).length;
      set({ notifications: formatted, unreadCount: unread, loading: false });
    } catch (e: any) {
      set({ error: e.message || 'Failed to fetch notifications', loading: false });
    }
  },

  markAsRead: async (apiClient, id) => {
    try {
      await apiClient.markNotificationRead(id);
      const updated = get().notifications.map((n) => (n.id === id ? { ...n, isRead: true } : n));
      const unread = updated.filter((n) => !n.isRead).length;
      set({ notifications: updated, unreadCount: unread });
    } catch (e: any) {
      console.warn('Failed to mark notification read:', e.message);
    }
  },

  markAllAsRead: async (apiClient) => {
    try {
      await apiClient.markAllNotificationsRead();
      const updated = get().notifications.map((n) => ({ ...n, isRead: true }));
      set({ notifications: updated, unreadCount: 0 });
    } catch (e: any) {
      console.warn('Failed to mark all read:', e.message);
    }
  },

  respondToInvitation: async (apiClient, invitationId, accept) => {
    try {
      await apiClient.respondToInvitation(invitationId, accept);
      if (accept) {
        // Keep in notification center: mark as read & convert to non-actionable type
        const updated = get().notifications.map((n) => {
          if (n.referenceId === invitationId) {
            return {
              ...n,
              isRead: true,
              type: 'ROOM_JOINED',
              referenceId: null,
            };
          }
          return n;
        });
        const unread = updated.filter((n) => !n.isRead).length;
        set({ notifications: updated, unreadCount: unread });
      } else {
        // Rejected: remove notification so it vanishes from list
        const updated = get().notifications.filter((n) => n.referenceId !== invitationId);
        const unread = updated.filter((n) => !n.isRead).length;
        set({ notifications: updated, unreadCount: unread });
      }
    } catch (e: any) {
      throw e;
    }
  },
}));
