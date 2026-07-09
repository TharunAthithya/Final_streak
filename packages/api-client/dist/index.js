export class StreakApiClient {
    baseUrl;
    token = null;
    constructor(baseUrl) {
        this.baseUrl = baseUrl.replace(/\/$/, '');
    }
    setToken(token) {
        this.token = token;
    }
    async request(path, options = {}) {
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
            }
            catch {
                errorData = { message: 'An unknown error occurred' };
            }
            throw new Error(errorData.message || `Request failed with status ${response.status}`);
        }
        return response.json();
    }
    // Auth & User endpoints
    async getMe() {
        return this.request('/users/me');
    }
    async updateProfile(dto) {
        return this.request('/users/me', {
            method: 'PATCH',
            body: JSON.stringify(dto),
        });
    }
    async deleteAccount() {
        return this.request('/users/me', {
            method: 'DELETE',
        });
    }
    // Habits endpoints
    async getHabits(includeArchived = false) {
        return this.request(`/habits?includeArchived=${includeArchived}`);
    }
    async createHabit(dto) {
        return this.request('/habits', {
            method: 'POST',
            body: JSON.stringify(dto),
        });
    }
    async checkInHabit(habitId, dto) {
        return this.request(`/habits/${habitId}/check-in`, {
            method: 'POST',
            body: JSON.stringify(dto),
        });
    }
    async undoCheckIn(habitId, checkInId) {
        return this.request(`/habits/${habitId}/check-in/${checkInId}`, {
            method: 'DELETE',
        });
    }
    // Rooms endpoints
    async getRooms() {
        return this.request('/rooms');
    }
    async createRoom(dto) {
        return this.request('/rooms', {
            method: 'POST',
            body: JSON.stringify(dto),
        });
    }
    async joinRoom(dto) {
        return this.request('/rooms/join', {
            method: 'POST',
            body: JSON.stringify(dto),
        });
    }
    async leaveRoom(roomId) {
        return this.request(`/rooms/${roomId}/leave`, {
            method: 'POST',
        });
    }
    async getRoomDetails(roomId) {
        return this.request(`/rooms/${roomId}`);
    }
    async createRoomHabit(roomId, name, description) {
        return this.request(`/rooms/${roomId}/habits`, {
            method: 'POST',
            body: JSON.stringify({ name, description }),
        });
    }
    async archiveRoomHabit(roomId, roomHabitId) {
        return this.request(`/rooms/${roomId}/habits/${roomHabitId}/archive`, {
            method: 'POST',
        });
    }
    async linkPersonalHabit(roomId, roomHabitId, personalHabitId) {
        return this.request(`/rooms/${roomId}/habits/${roomHabitId}/link`, {
            method: 'POST',
            body: JSON.stringify({ personalHabitId }),
        });
    }
    async unlinkPersonalHabit(roomId, roomHabitId) {
        return this.request(`/rooms/${roomId}/habits/${roomHabitId}/unlink`, {
            method: 'POST',
        });
    }
    async getRoomActivity(roomId) {
        return this.request(`/rooms/${roomId}/activity`);
    }
    async getRoomLeaderboard(roomId, period = 'weekly') {
        return this.request(`/rooms/${roomId}/leaderboard?period=${period}`);
    }
    async reactToActivity(activityId, type) {
        return this.request(`/activities/${activityId}/react`, {
            method: 'POST',
            body: JSON.stringify({ type }),
        });
    }
}
