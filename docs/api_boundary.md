# API Boundary & Client Operations

In the Supabase-first serverless architecture, the API client layer interacts either directly with Supabase tables (for simple CRUD operations governed by Row Level Security) or with PostgreSQL database RPC functions (for complex, multi-table, or transactional operations). Edge Functions are only invoked for notifications, background jobs, or third-party integrations.

---

## 1. Simple CRUD Operations (Direct Table Queries via Supabase SDK)

These operations are performed by calling the Supabase Client SDK directly from the mobile application. Row Level Security (RLS) ensures users can only read or write their own data.

### 1.1 Read User Profile
* **Action**: `supabase.from('profiles').select('*').eq('id', auth.uid()).single()`
* **Response Shape**: `ProfileResponse` (id, display_name, username, avatar_url, bio, timezone, xp, level, created_at)

### 1.2 Update User Profile
* **Action**: `supabase.from('profiles').update({ display_name, username, bio, timezone, avatar_url }).eq('id', auth.uid())`
* **Validation**: Enforced via Zod `UpdateUserSchema` client-side before update.

### 1.3 Read Habits
* **Action**: `supabase.from('habits').select('*, habit_stats(*), habit_schedule_days(*)').eq('profile_id', auth.uid())`
* **Response Shape**: Array of Habit records including their stats and schedule days.

### 1.4 Create / Update / Delete Habit
* **Action**: Direct table writes to `habits` table.
* **Validation**: Enforced via Zod `CreateHabitSchema` client-side.

---

## 2. Complex Business Operations (Direct RPC Calls via Supabase SDK)

Operations that require transaction guarantees, social activity generation, or external integrations must not write directly to tables. They must call PostgreSQL RPC functions via `supabase.rpc(...)`.

### 2.1 Complete Habit (Check-in)
* **Trigger**: `supabase.rpc('complete_habit', { p_profile_id: auth.uid(), p_habit_id: habitId, p_local_date: localDate, p_timezone: timezoneAtCompletion, p_idempotency_key: idempotencyKey })`
* **Behavior**: Inserts a `check_ins` record, computes streaks, updates `habit_stats`, awards 10 XP, updates levels, and creates social activities atomically.
* **Response Shape**:
  ```json
  {
    "checkInId": "uuid",
    "xpAwarded": 10,
    "levelUp": false,
    "stats": {
      "currentStreak": 5,
      "bestStreak": 12,
      "totalCompletions": 15,
      "completionRate": 85.50
    }
  }
  ```

### 2.2 Undo Complete Habit (Uncheck)
* **Trigger**: `supabase.rpc('undo_complete_habit', { p_profile_id: auth.uid(), p_habit_id: habitId, p_check_in_id: checkInId })`
* **Behavior**: Deletes check-in, recalculates streaks/stats, deducts 10 XP, and removes matching room activity feed items.

### 2.3 Create Room
* **Trigger**: `supabase.rpc('create_room', { p_owner_id: auth.uid(), p_name: roomName, p_description: roomDesc, p_visibility: roomVis })`
* **Behavior**: Inserts a new `rooms` record, generates an invitation code, joins the owner as OWNER, and logs room join activity.

### 2.4 Join Room
* **Trigger**: `supabase.rpc('join_room', { p_profile_id: auth.uid(), p_invite_code: inviteCode })`
* **Behavior**: Resolves invite code, joins the profile into `room_members` as MEMBER, and logs activity.

### 2.5 Leave Room
* **Trigger**: `supabase.rpc('leave_room', { p_profile_id: auth.uid(), p_room_id: roomId })`
* **Behavior**: Soft-deletes membership (`left_at = NOW()`) and deactivates links.

### 2.6 Link Habit / Unlink Habit
* **Trigger**: Direct table writes to `room_habit_links` governed by RLS, or simple helper functions. RLS policy prevents double links.

---

## 3. Realtime Feeds & Leaderboards

### 3.1 Social Feed (Activity Stream)
* **Client Subscription**: Subscribes directly to `activities` table updates for the active `room_id` using Supabase Realtime:
  `supabase.channel('room-activities').on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'activities', filter: 'room_id=eq.' + roomId }, callback).subscribe()`

### 3.2 Leaderboards
* **Client RPC Fetch**: Queries `supabase.rpc('get_leaderboard', { p_room_id: roomId, p_period: 'weekly' })` directly.
* **Response**: Array of users with their rank and completion count for the given period.
