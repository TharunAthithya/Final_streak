import { UserResponse, HabitResponse, CheckInResponse, RoomResponse, ActivityResponse } from '@streak/contracts';
import { CreateHabitDto, CheckInDto, CreateRoomDto, JoinRoomDto, UpdateUserDto } from '@streak/validation';

export class StreakApiClient {
  private baseUrl: string;
  private token: string | null = null;

  constructor(baseUrl: string) {
    this.baseUrl = baseUrl.replace(/\/$/, '');
  }

  setToken(token: string | null) {
    this.token = token;
  }

  private async request<T>(path: string, options: RequestInit = {}): Promise<T> {
    const headers = new Headers(options.headers);
    headers.set('Content-Type', 'application/json');
    if (this.token) {
      headers.set('Authorization', `Bearer ${this.token}`);
    }

    const response = await fetch(`${this.baseUrl}${path}`, {
      ...options,
      headers,
    });

    if (!response.ok) {
      let errorData;
      try {
        errorData = await response.json();
      } catch {
        errorData = { message: 'An unknown error occurred' };
      }
      throw new Error(errorData.message || `Request failed with status ${response.status}`);
    }

    return response.json() as Promise<T>;
  }

  // Auth & User endpoints
  async getMe(): Promise<UserResponse> {
    return this.request<UserResponse>('/users/me');
  }

  async updateProfile(dto: UpdateUserDto): Promise<UserResponse> {
    return this.request<UserResponse>('/users/me', {
      method: 'PATCH',
      body: JSON.stringify(dto),
    });
  }

  async deleteAccount(): Promise<{ success: boolean }> {
    return this.request<{ success: boolean }>('/users/me', {
      method: 'DELETE',
    });
  }

  // Habits endpoints
  async getHabits(includeArchived = false): Promise<HabitResponse[]> {
    return this.request<HabitResponse[]>(`/habits?includeArchived=${includeArchived}`);
  }

  async createHabit(dto: CreateHabitDto): Promise<HabitResponse> {
    return this.request<HabitResponse>('/habits', {
      method: 'POST',
      body: JSON.stringify(dto),
    });
  }

  async checkInHabit(habitId: string, dto: CheckInDto): Promise<{
    checkIn: CheckInResponse;
    stats: { currentStreak: number; bestStreak: number; totalCompletions: number };
    xpAwarded: number;
    levelUp: boolean;
  }> {
    return this.request(`/habits/${habitId}/check-in`, {
      method: 'POST',
      body: JSON.stringify(dto),
    });
  }

  async undoCheckIn(habitId: string, checkInId: string): Promise<{
    currentStreak: number;
    bestStreak: number;
    totalCompletions: number;
  }> {
    return this.request(`/habits/${habitId}/check-in/${checkInId}`, {
      method: 'DELETE',
    });
  }

  // Rooms endpoints
  async getRooms(): Promise<RoomResponse[]> {
    return this.request<RoomResponse[]>('/rooms');
  }

  async createRoom(dto: CreateRoomDto): Promise<RoomResponse> {
    return this.request<RoomResponse>('/rooms', {
      method: 'POST',
      body: JSON.stringify(dto),
    });
  }

  async joinRoom(dto: JoinRoomDto): Promise<RoomResponse> {
    return this.request<RoomResponse>('/rooms/join', {
      method: 'POST',
      body: JSON.stringify(dto),
    });
  }

  async leaveRoom(roomId: string): Promise<{ success: boolean }> {
    return this.request<{ success: boolean }>(`/rooms/${roomId}/leave`, {
      method: 'POST',
    });
  }

  async getRoomDetails(roomId: string): Promise<RoomResponse & {
    roomHabits: Array<{ id: string; name: string; description: string | null }>;
    members: Array<{ id: string; role: string; user: UserResponse }>;
  }> {
    return this.request<any>(`/rooms/${roomId}`);
  }

  async createRoomHabit(roomId: string, name: string, description?: string): Promise<any> {
    return this.request<any>(`/rooms/${roomId}/habits`, {
      method: 'POST',
      body: JSON.stringify({ name, description }),
    });
  }

  async archiveRoomHabit(roomId: string, roomHabitId: string): Promise<any> {
    return this.request<any>(`/rooms/${roomId}/habits/${roomHabitId}/archive`, {
      method: 'POST',
    });
  }

  async linkPersonalHabit(roomId: string, roomHabitId: string, personalHabitId: string): Promise<any> {
    return this.request<any>(`/rooms/${roomId}/habits/${roomHabitId}/link`, {
      method: 'POST',
      body: JSON.stringify({ personalHabitId }),
    });
  }

  async unlinkPersonalHabit(roomId: string, roomHabitId: string): Promise<any> {
    return this.request<any>(`/rooms/${roomId}/habits/${roomHabitId}/unlink`, {
      method: 'POST',
    });
  }

  async getRoomActivity(roomId: string): Promise<ActivityResponse[]> {
    return this.request<ActivityResponse[]>(`/rooms/${roomId}/activity`);
  }

  async getRoomLeaderboard(roomId: string, period = 'weekly'): Promise<Array<{
    userId: string;
    displayName: string;
    avatarPath?: string;
    score: number;
    rank: number;
  }>> {
    return this.request<any>(`/rooms/${roomId}/leaderboard?period=${period}`);
  }

  async reactToActivity(activityId: string, type: string): Promise<{ success: boolean; reacted: boolean }> {
    return this.request<{ success: boolean; reacted: boolean }>(`/activities/${activityId}/react`, {
      method: 'POST',
      body: JSON.stringify({ type }),
    });
  }
}
