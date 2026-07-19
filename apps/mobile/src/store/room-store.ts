import { create } from 'zustand';
import { RoomResponse, HabitResponse } from '@streak/contracts';
import { StreakApiClient } from '@streak/api-client';
import { CreateRoomDto, JoinRoomDto } from '@streak/validation';

interface RoomState {
  rooms: RoomResponse[];
  selectedRoomDetails: any | null;
  leaderboard: any[];
  personalHabits: HabitResponse[];
  loading: boolean;
  loadingDetails: boolean;
  error: string | null;
  fetchRooms: (apiClient: StreakApiClient) => Promise<void>;
  createRoom: (apiClient: StreakApiClient, dto: CreateRoomDto) => Promise<void>;
  joinRoom: (apiClient: StreakApiClient, dto: JoinRoomDto) => Promise<void>;
  leaveRoom: (apiClient: StreakApiClient, roomId: string) => Promise<void>;
  fetchRoomDetails: (apiClient: StreakApiClient, roomId: string) => Promise<void>;
  linkPersonalHabit: (apiClient: StreakApiClient, roomId: string, roomHabitId: string, personalHabitId: string) => Promise<void>;
  unlinkPersonalHabit: (apiClient: StreakApiClient, roomId: string, roomHabitId: string) => Promise<void>;
}

export const useRoomStore = create<RoomState>((set, get) => ({
  rooms: [],
  selectedRoomDetails: null,
  leaderboard: [],
  personalHabits: [],
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
      await apiClient.joinRoom(dto);
      const data = await apiClient.getRooms();
      set({ rooms: data, loading: false });
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

  fetchRoomDetails: async (apiClient, roomId) => {
    set({ loadingDetails: true, error: null });
    try {
      const details = await apiClient.getRoomDetails(roomId);
      const board = await apiClient.getRoomLeaderboard(roomId, 'weekly');
      const habits = await apiClient.getHabits();
      set({
        selectedRoomDetails: details,
        leaderboard: board,
        personalHabits: habits,
        loadingDetails: false,
      });
    } catch (e: any) {
      set({ error: e.message || 'Failed to fetch room details', loadingDetails: false });
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
