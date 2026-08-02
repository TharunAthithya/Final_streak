import { create } from 'zustand';
import { RoomResponse, HabitResponse } from '@streak/contracts';
import { StreakApiClient } from '@streak/api-client';
import { CreateRoomDto, JoinRoomDto } from '@streak/validation';

interface RoomState {
  rooms: RoomResponse[];
  selectedRoomDetails: any | null;
  leaderboard: any[];
  personalHabits: HabitResponse[];
  roomMembers: any[];
  roomActivities: any[];
  loading: boolean;
  loadingDetails: boolean;
  error: string | null;
  fetchRooms: (apiClient: StreakApiClient) => Promise<void>;
  createRoom: (apiClient: StreakApiClient, dto: CreateRoomDto) => Promise<void>;
  joinRoom: (apiClient: StreakApiClient, dto: JoinRoomDto) => Promise<any>;
  leaveRoom: (apiClient: StreakApiClient, roomId: string) => Promise<void>;
  deleteRoom: (apiClient: StreakApiClient, roomId: string) => Promise<void>;
  fetchRoomDetails: (apiClient: StreakApiClient, roomId: string) => Promise<void>;
  fetchRoomActivities: (apiClient: StreakApiClient, roomId: string) => Promise<void>;
  fetchRoomMembers: (apiClient: StreakApiClient, roomId: string) => Promise<void>;
  toggleActivityReaction: (apiClient: StreakApiClient, activityId: string, reactionType: string) => Promise<void>;
  linkPersonalHabit: (apiClient: StreakApiClient, roomId: string, roomHabitId: string, personalHabitId: string) => Promise<void>;
  unlinkPersonalHabit: (apiClient: StreakApiClient, roomId: string, roomHabitId: string) => Promise<void>;
}

export const useRoomStore = create<RoomState>((set, get) => ({
  rooms: [],
  selectedRoomDetails: null,
  leaderboard: [],
  personalHabits: [],
  roomMembers: [],
  roomActivities: [],
  loading: false,
  loadingDetails: false,
  error: null,

  fetchRooms: async (apiClient) => {
    set({ loading: true, error: null });
    try {
      const data = await apiClient.getRooms();
      set({ rooms: data, loading: false });
    } catch (e: any) {
      set({ error: e.message || 'Failed to fetch rooms', loading: false });
    }
  },

  createRoom: async (apiClient, dto) => {
    set({ loading: true, error: null });
    try {
      await apiClient.createRoom(dto);
      const data = await apiClient.getRooms();
      set({ rooms: data, loading: false });
    } catch (e: any) {
      set({ error: e.message || 'Failed to create room', loading: false });
      throw e;
    }
  },

  joinRoom: async (apiClient, dto) => {
    set({ loading: true, error: null });
    try {
      const res = await apiClient.joinRoom(dto);
      const data = await apiClient.getRooms();
      set({ rooms: data, loading: false });
      return res;
    } catch (e: any) {
      set({ error: e.message || 'Failed to join room', loading: false });
      throw e;
    }
  },

  leaveRoom: async (apiClient, roomId) => {
    set({ loading: true, error: null });
    try {
      await apiClient.leaveRoom(roomId);
      const data = await apiClient.getRooms();
      set({ rooms: data, selectedRoomDetails: null, loading: false });
    } catch (e: any) {
      set({ error: e.message || 'Failed to leave room', loading: false });
      throw e;
    }
  },

  deleteRoom: async (apiClient, roomId) => {
    set({ loading: true, error: null });
    try {
      await apiClient.deleteRoom(roomId);
      const data = await apiClient.getRooms();
      set({ rooms: data, selectedRoomDetails: null, loading: false });
    } catch (e: any) {
      set({ error: e.message || 'Failed to delete room', loading: false });
      throw e;
    }
  },

  fetchRoomDetails: async (apiClient, roomId) => {
    set({ loadingDetails: true, error: null });
    try {
      const details = await apiClient.getRoomDetails(roomId);
      let board: any[] = [];
      try {
        board = await apiClient.getRoomLeaderboard(roomId, 'weekly');
      } catch (boardErr) {
        console.warn('Leaderboard fetch skipped:', boardErr);
      }
      let habits: any[] = [];
      try {
        habits = await apiClient.getHabits();
      } catch (habitsErr) {
        console.warn('Habits fetch skipped:', habitsErr);
      }
      set({
        selectedRoomDetails: details,
        leaderboard: board,
        personalHabits: habits,
        loadingDetails: false,
      });
    } catch (e: any) {
      console.error('Failed to fetch room details:', e);
      set({ error: e.message || 'Failed to fetch room details', loadingDetails: false });
    }
  },

  fetchRoomActivities: async (apiClient, roomId) => {
    try {
      const acts = await apiClient.getRoomActivity(roomId);
      set({ roomActivities: acts });
    } catch (e: any) {
      console.warn('Failed to fetch room activities', e);
    }
  },

  fetchRoomMembers: async (apiClient, roomId) => {
    try {
      const members = await apiClient.getRoomMembers(roomId);
      set({ roomMembers: members });
    } catch (e: any) {
      console.warn('Failed to fetch room members', e);
    }
  },

  toggleActivityReaction: async (apiClient, activityId, reactionType) => {
    try {
      const result = await apiClient.toggleActivityReaction(activityId, reactionType);
      // Optimistically update local roomActivities state
      set((state) => ({
        roomActivities: state.roomActivities.map((act) => {
          if (act.id !== activityId) return act;
          const currentR = act.reactions?.[reactionType] || { count: 0, active: false };
          const nextActive = result.active;
          const nextCount = result.count;
          return {
            ...act,
            reactions: {
              ...act.reactions,
              [reactionType]: { count: nextCount, active: nextActive },
            },
          };
        }),
      }));
    } catch (e: any) {
      console.warn('Failed to toggle reaction', e);
    }
  },

  linkPersonalHabit: async (apiClient, roomId, roomHabitId, personalHabitId) => {
    set({ loadingDetails: true, error: null });
    try {
      await apiClient.linkPersonalHabit(roomId, roomHabitId, personalHabitId);
      const details = await apiClient.getRoomDetails(roomId);
      set({ selectedRoomDetails: details, loadingDetails: false });
    } catch (e: any) {
      set({ error: e.message || 'Failed to link habit', loadingDetails: false });
      throw e;
    }
  },

  unlinkPersonalHabit: async (apiClient, roomId, roomHabitId) => {
    set({ loadingDetails: true, error: null });
    try {
      await apiClient.unlinkPersonalHabit(roomId, roomHabitId);
      const details = await apiClient.getRoomDetails(roomId);
      set({ selectedRoomDetails: details, loadingDetails: false });
    } catch (e: any) {
      set({ error: e.message || 'Failed to unlink habit', loadingDetails: false });
      throw e;
    }
  },
}));
