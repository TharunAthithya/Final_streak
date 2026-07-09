# API Boundary & Contracts

All endpoints prefix: `/api/v1`
Authentication: Bearer JWT in `Authorization` header.

## 1. Authentication & Users
* **GET `/users/me`**
  * Description: Revalidate current user session and return fresh user stats.
  * Response: `200 OK`
    ```json
    {
      "id": "uuid",
      "email": "user@example.com",
      "displayName": "John Doe",
      "username": "johndoe",
      "timezone": "Asia/Kolkata",
      "xp": 150,
      "level": 2,
      "onboardingCompletedAt": "2026-07-09T00:00:00.000Z"
    }
    ```
* **PATCH `/users/me`**
  * Request: `UpdateUserDto` (displayName, username, timezone, bio, avatarPath)
  * Response: `200 OK` (User object)

## 2. Habits & Check-ins
* **GET `/habits`**
  * Query params: `includeArchived=false`
  * Response: `200 OK` (Array of Habit objects including stats)
* **POST `/habits`**
  * Request: `CreateHabitDto`
    ```json
    {
      "name": "Exercise",
      "description": "30 mins daily workout",
      "icon": "workout",
      "scheduleType": "SPECIFIC_DAYS",
      "daysOfWeek": [1, 3, 5], // Mon, Wed, Fri
      "timezone": "Asia/Kolkata",
      "startDate": "2026-07-09"
    }
    ```
* **POST `/habits/:id/check-in`**
  * Request:
    ```json
    {
      "localDate": "2026-07-09",
      "timezoneAtCompletion": "Asia/Kolkata",
      "idempotencyKey": "userId:habitId:2026-07-09"
    }
    ```
  * Response: `201 Created`
    ```json
    {
      "checkIn": { "id": "uuid", "localDate": "2026-07-09" },
      "stats": { "currentStreak": 5, "bestStreak": 12, "totalCompletions": 15 },
      "xpAwarded": 10,
      "levelUp": false
    }
    ```
* **DELETE `/habits/:id/check-in/:checkInId`**
  * Description: Un-checks a habit.
  * Response: `200 OK` (Updated stats object)

## 3. Rooms
* **GET `/rooms`**
  * Description: Get user's active Rooms.
  * Response: `200 OK` (Array of Rooms with member previews)
* **POST `/rooms`**
  * Request: `CreateRoomDto` (name, description, visibility)
  * Response: `201 Created`
* **POST `/rooms/join`**
  * Request: `JoinRoomDto` (inviteCode)
  * Response: `200 OK`
* **GET `/rooms/:id/activity`**
  * Description: Get Room's activity feed (milestones, completions).
  * Authorization: Must be a member of the Room.
  * Response: `200 OK` (Array of Activities with actor display details & reactions)
* **POST `/activities/:id/react`**
  * Request: `ReactDto` (type: e.g. 'fire')
  * Response: `200 OK`

### Room Habits & Habit Linkage (Accountability Targets)
* **GET `/rooms/:id/habits`**
  * Description: List the explicit accountability targets (Room Habits) defined for this Room.
  * Authorization: Must be a member of the Room.
  * Response: `200 OK`
    ```json
    [
      {
        "id": "room-habit-uuid",
        "name": "Daily Coding",
        "description": "Code for at least 30 minutes every day"
      }
    ]
    ```
* **POST `/rooms/:id/habits`**
  * Description: Define a new accountability target (Room Habit) for the Room.
  * Authorization: Must be Room OWNER or ADMIN.
  * Request: `CreateRoomHabitDto` (name, description)
  * Response: `201 Created`
* **POST `/rooms/:id/habits/:roomHabitId/link`**
  * Description: Explicitly link a personal habit to a Room Habit to opt-in to room activity generation.
  * Authorization: Must be a member of the Room and owner of the personal habit.
  * Request: `LinkPersonalHabitDto` (personalHabitId)
  * Response: `201 Created`
    ```json
    {
      "id": "link-uuid",
      "roomMemberId": "member-uuid",
      "roomHabitId": "room-habit-uuid",
      "personalHabitId": "personal-habit-uuid"
    }
    ```
* **POST `/rooms/:id/habits/:roomHabitId/unlink`**
  * Description: Soft-unlink the personal habit from the Room Habit. Sets `unlinkedAt` to the current timestamp. Future check-ins will not generate Room activity, but historical Room activities are preserved.
  * Authorization: Must be the owner of the linked personal habit (Room OWNER or ADMINs may NOT directly manipulate another user's private habit linkage).
  * Response: `200 OK`

## 4. Leaderboards
* **GET `/rooms/:id/leaderboard`**
  * Query params: `period=weekly` (weekly, monthly)
  * Authorization: Must be a member of the Room.
  * Response: `200 OK`
    ```json
    [
      { "userId": "uuid", "displayName": "Alice", "rank": 1, "score": 7 },
      { "userId": "uuid", "displayName": "Bob", "rank": 2, "score": 5 }
    ]
    ```
