-- ==========================================================
-- DANGER: COMPLETELY WIPES ALL EXISTING DATA
-- ==========================================================

-- Drop all triggers first
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

-- Drop all functions
DROP FUNCTION IF EXISTS public.handle_new_user() CASCADE;
DROP FUNCTION IF EXISTS public.complete_habit(UUID, UUID, DATE, TEXT, TEXT) CASCADE;
DROP FUNCTION IF EXISTS public.undo_complete_habit(UUID, UUID, UUID) CASCADE;
DROP FUNCTION IF EXISTS public.is_room_member(UUID) CASCADE;

-- Drop all tables
DROP TABLE IF EXISTS public.notification_deliveries CASCADE;
DROP TABLE IF EXISTS public.devices CASCADE;
DROP TABLE IF EXISTS public.reactions CASCADE;
DROP TABLE IF EXISTS public.activities CASCADE;
DROP TABLE IF EXISTS public.room_habit_links CASCADE;
DROP TABLE IF EXISTS public.room_habits CASCADE;
DROP TABLE IF EXISTS public.room_members CASCADE;
DROP TABLE IF EXISTS public.rooms CASCADE;
DROP TABLE IF EXISTS public.habit_stats CASCADE;
DROP TABLE IF EXISTS public.check_ins CASCADE;
DROP TABLE IF EXISTS public.habit_schedule_days CASCADE;
DROP TABLE IF EXISTS public.habits CASCADE;
DROP TABLE IF EXISTS public.profiles CASCADE;

-- Drop all Enums
DROP TYPE IF EXISTS activity_type CASCADE;
DROP TYPE IF EXISTS room_role CASCADE;
DROP TYPE IF EXISTS room_visibility CASCADE;
DROP TYPE IF EXISTS schedule_type CASCADE;
DROP TYPE IF EXISTS habit_status CASCADE;

-- ==========================================================
-- 0001_schema.sql
-- Final Streak Database Schema, RLS Policies, and RPCs
-- ==========================================================

-- Enable UUID extension if not enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Define Enums
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'habit_status') THEN
    CREATE TYPE habit_status AS ENUM ('ACTIVE', 'ARCHIVED', 'PAUSED');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'schedule_type') THEN
    CREATE TYPE schedule_type AS ENUM ('DAILY', 'SPECIFIC_DAYS', 'FLEXIBLE');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'room_visibility') THEN
    CREATE TYPE room_visibility AS ENUM ('PUBLIC', 'PRIVATE');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'room_role') THEN
    CREATE TYPE room_role AS ENUM ('OWNER', 'ADMIN', 'MEMBER');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'activity_type') THEN
    CREATE TYPE activity_type AS ENUM ('HABIT_COMPLETED', 'STREAK_MILESTONE', 'PERSONAL_BEST', 'ROOM_JOIN', 'LEVEL_UP');
  END IF;
END $$;

-- ==========================================================
-- 1. Tables
-- ==========================================================

-- Profiles (extends auth.users)
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  username VARCHAR(100) UNIQUE,
  display_name VARCHAR(255) NOT NULL,
  avatar_url TEXT,
  bio TEXT,
  timezone VARCHAR(100) NOT NULL DEFAULT 'UTC',
  locale VARCHAR(10) NOT NULL DEFAULT 'en',
  xp INTEGER NOT NULL DEFAULT 0 CHECK (xp >= 0),
  level INTEGER NOT NULL DEFAULT 1 CHECK (level >= 1),
  onboarding_completed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Habits
CREATE TABLE IF NOT EXISTS public.habits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  icon VARCHAR(50),
  status habit_status NOT NULL DEFAULT 'ACTIVE',
  schedule_type schedule_type NOT NULL DEFAULT 'DAILY',
  target_per_week INTEGER CHECK (target_per_week BETWEEN 1 AND 7),
  timezone VARCHAR(100) NOT NULL,
  start_date DATE NOT NULL,
  reminder_time TIME,
  archived_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_habits_profile ON public.habits(profile_id);

-- Habit Schedule Days
CREATE TABLE IF NOT EXISTS public.habit_schedule_days (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  habit_id UUID NOT NULL REFERENCES public.habits(id) ON DELETE CASCADE,
  day_of_week INTEGER NOT NULL CHECK (day_of_week BETWEEN 0 AND 6),
  UNIQUE(habit_id, day_of_week)
);

-- Check-ins
CREATE TABLE IF NOT EXISTS public.check_ins (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  habit_id UUID NOT NULL REFERENCES public.habits(id) ON DELETE CASCADE,
  local_date DATE NOT NULL,
  completed_at_utc TIMESTAMP WITH TIME ZONE NOT NULL,
  timezone_at_completion VARCHAR(100) NOT NULL,
  source VARCHAR(50) NOT NULL DEFAULT 'mobile',
  idempotency_key VARCHAR(255) UNIQUE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_check_ins_habit_date ON public.check_ins(habit_id, local_date);
CREATE INDEX IF NOT EXISTS idx_check_ins_profile_date ON public.check_ins(profile_id, local_date);

-- Habit Stats
CREATE TABLE IF NOT EXISTS public.habit_stats (
  habit_id UUID PRIMARY KEY REFERENCES public.habits(id) ON DELETE CASCADE,
  current_streak INTEGER NOT NULL DEFAULT 0 CHECK (current_streak >= 0),
  best_streak INTEGER NOT NULL DEFAULT 0 CHECK (best_streak >= 0),
  total_completions INTEGER NOT NULL DEFAULT 0 CHECK (total_completions >= 0),
  completion_rate NUMERIC(5,2) NOT NULL DEFAULT 0.00,
  recalculated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Rooms
CREATE TABLE IF NOT EXISTS public.rooms (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  image_url TEXT,
  visibility room_visibility NOT NULL DEFAULT 'PRIVATE',
  invite_code VARCHAR(50) UNIQUE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  archived_at TIMESTAMP WITH TIME ZONE
);

-- Room Members
CREATE TABLE IF NOT EXISTS public.room_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id UUID NOT NULL REFERENCES public.rooms(id) ON DELETE CASCADE,
  profile_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  role room_role NOT NULL DEFAULT 'MEMBER',
  joined_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  left_at TIMESTAMP WITH TIME ZONE
);
CREATE UNIQUE INDEX IF NOT EXISTS idx_active_room_member ON public.room_members (room_id, profile_id) WHERE left_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_room_members_profile ON public.room_members(profile_id);

-- Room Habits
CREATE TABLE IF NOT EXISTS public.room_habits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id UUID NOT NULL REFERENCES public.rooms(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  archived_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_room_habits_room ON public.room_habits(room_id);

-- Room Habit Links
CREATE TABLE IF NOT EXISTS public.room_habit_links (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  room_member_id UUID NOT NULL REFERENCES public.room_members(id) ON DELETE CASCADE,
  room_habit_id UUID NOT NULL REFERENCES public.room_habits(id) ON DELETE CASCADE,
  personal_habit_id UUID NOT NULL REFERENCES public.habits(id) ON DELETE CASCADE,
  linked_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  unlinked_at TIMESTAMP WITH TIME ZONE
);
CREATE UNIQUE INDEX IF NOT EXISTS idx_active_room_habit_link ON public.room_habit_links (room_member_id, room_habit_id) WHERE unlinked_at IS NULL;
CREATE UNIQUE INDEX IF NOT EXISTS idx_active_personal_habit_link ON public.room_habit_links (room_member_id, personal_habit_id) WHERE unlinked_at IS NULL;

-- Activities
CREATE TABLE IF NOT EXISTS public.activities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_profile_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  room_id UUID REFERENCES public.rooms(id) ON DELETE CASCADE,
  room_habit_link_id UUID REFERENCES public.room_habit_links(id) ON DELETE SET NULL,
  type activity_type NOT NULL,
  message VARCHAR(500) NOT NULL,
  metadata_json JSONB,
  visibility room_visibility NOT NULL DEFAULT 'PRIVATE',
  deduplication_key VARCHAR(255) UNIQUE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_activities_room ON public.activities(room_id, created_at DESC) WHERE room_id IS NOT NULL;

-- Reactions
CREATE TABLE IF NOT EXISTS public.reactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  activity_id UUID NOT NULL REFERENCES public.activities(id) ON DELETE CASCADE,
  profile_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  type VARCHAR(50) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  UNIQUE(activity_id, profile_id, type)
);

-- Devices
CREATE TABLE IF NOT EXISTS public.devices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  platform VARCHAR(50) NOT NULL,
  push_token TEXT NOT NULL,
  token_status VARCHAR(50) NOT NULL DEFAULT 'ACTIVE',
  app_version VARCHAR(50),
  last_seen_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  UNIQUE(profile_id, push_token)
);

-- Notification Deliveries
CREATE TABLE IF NOT EXISTS public.notification_deliveries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  device_id UUID REFERENCES public.devices(id) ON DELETE SET NULL,
  type VARCHAR(50) NOT NULL,
  deduplication_key VARCHAR(255) UNIQUE NOT NULL,
  scheduled_for TIMESTAMP WITH TIME ZONE,
  sent_at TIMESTAMP WITH TIME ZONE,
  status VARCHAR(50) NOT NULL DEFAULT 'PENDING',
  provider_message_id TEXT,
  failure_reason TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Reflections
CREATE TABLE IF NOT EXISTS public.reflections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  local_date DATE NOT NULL,
  prompt TEXT NOT NULL,
  response TEXT,
  completed_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  UNIQUE(profile_id, local_date)
);


-- ==========================================================
-- 2. Row Level Security (RLS) Enablement
-- ==========================================================

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.habits ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.habit_schedule_days ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.check_ins ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.habit_stats ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rooms ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.room_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.room_habits ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.room_habit_links ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.activities ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.devices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notification_deliveries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reflections ENABLE ROW LEVEL SECURITY;


-- ==========================================================
-- 3. RLS Security Policies
-- ==========================================================

-- Helper function to prevent infinite recursion in RLS
CREATE OR REPLACE FUNCTION public.is_room_member(p_room_id UUID)
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.room_members
    WHERE room_id = p_room_id
      AND profile_id = auth.uid()
      AND left_at IS NULL
  );
$$ LANGUAGE sql SECURITY DEFINER SET search_path = public;

-- Profiles: Anyone can read, only owner can update.
CREATE POLICY profiles_select_all ON public.profiles FOR SELECT USING (true);
CREATE POLICY profiles_update_owner ON public.profiles FOR UPDATE USING (auth.uid() = id);

-- Habits: Owner CRUD only
CREATE POLICY habits_all_owner ON public.habits FOR ALL USING (auth.uid() = profile_id);

-- Habit Schedule Days: Access inherited from habits owner
CREATE POLICY schedule_days_all_owner ON public.habit_schedule_days FOR ALL 
  USING (exists (select 1 from public.habits where habits.id = habit_schedule_days.habit_id and habits.profile_id = auth.uid()));

-- Check-ins: Owner CRUD only
CREATE POLICY check_ins_all_owner ON public.check_ins FOR ALL USING (auth.uid() = profile_id);

-- Reflections: Owner CRUD only
CREATE POLICY reflections_all_owner ON public.reflections FOR ALL USING (auth.uid() = profile_id);

-- Habit Stats: Access inherited from habits owner
CREATE POLICY stats_select_owner ON public.habit_stats FOR SELECT 
  USING (exists (select 1 from public.habits where habits.id = habit_stats.habit_id and habits.profile_id = auth.uid()));

-- Rooms: Public are readable; private readable by room members only
CREATE POLICY rooms_select_visibility ON public.rooms FOR SELECT 
  USING (visibility = 'PUBLIC' OR public.is_room_member(id));
CREATE POLICY rooms_insert_owner ON public.rooms FOR INSERT WITH CHECK (auth.uid() = owner_id);
CREATE POLICY rooms_update_owner ON public.rooms FOR UPDATE USING (auth.uid() = owner_id);

-- Room Members: Members can read other active members
CREATE POLICY members_select_active ON public.room_members FOR SELECT 
  USING (public.is_room_member(room_id));
CREATE POLICY members_insert_self ON public.room_members FOR INSERT
  WITH CHECK (profile_id = auth.uid());
CREATE POLICY members_update_self ON public.room_members FOR UPDATE
  USING (profile_id = auth.uid());

-- Room Habits: Read access to members
CREATE POLICY room_habits_select_member ON public.room_habits FOR SELECT 
  USING (public.is_room_member(room_id));

-- Room Habit Links: Read access to members, Insert/Delete to link owner
CREATE POLICY links_select_member ON public.room_habit_links FOR SELECT 
  USING (exists (select 1 from public.room_members where room_members.id = room_habit_links.room_member_id and room_members.profile_id = auth.uid()));
CREATE POLICY links_insert_owner ON public.room_habit_links FOR INSERT WITH CHECK 
  (exists (select 1 from public.room_members where room_members.id = room_member_id and room_members.profile_id = auth.uid()));
CREATE POLICY links_delete_owner ON public.room_habit_links FOR DELETE 
  USING (exists (select 1 from public.room_members where room_members.id = room_member_id and room_members.profile_id = auth.uid()));

-- Activities: Global are readable; room-specific readable by room members only
CREATE POLICY activities_select_member ON public.activities FOR SELECT 
  USING (room_id is null OR public.is_room_member(room_id));

-- Reactions: Room members can read and create, only owner can delete
CREATE POLICY reactions_select_member ON public.reactions FOR SELECT 
  USING (exists (select 1 from public.activities where activities.id = reactions.activity_id and (activities.room_id is null or public.is_room_member(activities.room_id))));
CREATE POLICY reactions_insert_member ON public.reactions FOR INSERT WITH CHECK 
  (auth.uid() = profile_id and exists (select 1 from public.activities where activities.id = activity_id and (activities.room_id is null or public.is_room_member(activities.room_id))));
CREATE POLICY reactions_delete_owner ON public.reactions FOR DELETE USING (auth.uid() = profile_id);

-- Devices: Owner CRUD only
CREATE POLICY devices_all_owner ON public.devices FOR ALL USING (auth.uid() = profile_id);

-- Notification Deliveries: Owner read only
CREATE POLICY notifications_select_owner ON public.notification_deliveries FOR SELECT USING (auth.uid() = profile_id);


-- ==========================================================
-- 4. Automatic Profile Creation Trigger
-- ==========================================================

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, display_name, username, avatar_url, timezone, locale)
  VALUES (
    new.id,
    COALESCE(new.raw_user_meta_data->>'display_name', split_part(new.email, '@', 1)),
    new.raw_user_meta_data->>'username',
    new.raw_user_meta_data->>'avatar_url',
    COALESCE(new.raw_user_meta_data->>'timezone', 'UTC'),
    COALESCE(new.raw_user_meta_data->>'locale', 'en')
  );
  
  -- Create stats row if necessary, though it is usually per-habit
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE OR REPLACE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();


-- ==========================================================
-- 5. Business Logic RPC Database Functions
-- ==========================================================

------------------------------------------------------------
-- 5.1 complete_habit()
------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.complete_habit(
  p_profile_id UUID,
  p_habit_id UUID,
  p_local_date DATE,
  p_timezone TEXT,
  p_idempotency_key TEXT
)
RETURNS JSON AS $$
DECLARE
  v_habit RECORD;
  v_check_in_id UUID;
  v_total_completions INT;
  v_current_streak INT := 0;
  v_best_streak INT := 0;
  v_completion_rate NUMERIC(5,2) := 0.00;
  v_xp_earned INT := 10;
  v_new_xp INT;
  v_new_level INT;
  v_level_up BOOLEAN := false;
  v_user_display_name TEXT;
  v_active_links RECORD;
  v_check_in_dates DATE[];
  v_today DATE;
  v_start_date DATE;
  v_days_diff INT;
  v_temp_streak INT := 0;
  v_result JSON;
  i INT;
  v_scheduled_days INT[];
  v_current_day DATE;
  v_scheduled_dates DATE[];
  v_target_per_week INT;
BEGIN
  -- 1. Validate caller identity matches profile
  IF auth.uid() <> p_profile_id THEN
    RAISE EXCEPTION 'Unauthorized check-in operation';
  END IF;

  -- 2. Validate habit ownership
  SELECT * INTO v_habit FROM public.habits WHERE id = p_habit_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Habit not found';
  END IF;
  IF v_habit.profile_id <> p_profile_id THEN
    RAISE EXCEPTION 'Habit does not belong to user';
  END IF;

  -- 3. Check for duplicates / idempotency key conflict
  IF EXISTS (SELECT 1 FROM public.check_ins WHERE idempotency_key = p_idempotency_key) THEN
    RAISE EXCEPTION 'Conflict: Habit check-in idempotency key already processed';
  END IF;

  IF EXISTS (SELECT 1 FROM public.check_ins WHERE habit_id = p_habit_id AND local_date = p_local_date) THEN
    RAISE EXCEPTION 'Conflict: Habit already completed for date %', p_local_date;
  END IF;

  -- 4. Create check-in
  INSERT INTO public.check_ins (
    profile_id, habit_id, local_date, completed_at_utc, timezone_at_completion, idempotency_key
  ) VALUES (
    p_profile_id, p_habit_id, p_local_date, NOW(), p_timezone, p_idempotency_key
  ) RETURNING id INTO v_check_in_id;

  -- 5. Calculate statistics using DB query arrays
  SELECT COALESCE(array_agg(local_date ORDER BY local_date DESC), '{}')
  INTO v_check_in_dates
  FROM public.check_ins
  WHERE habit_id = p_habit_id;

  v_today := p_local_date;
  v_start_date := v_habit.start_date;
  v_total_completions := array_length(v_check_in_dates, 1);

  IF v_habit.schedule_type = 'DAILY' THEN
    -- Calculate Daily Streak
    IF v_today - v_check_in_dates[1] <= 1 THEN
      v_current_streak := 1;
      FOR i IN 1..(v_total_completions - 1) LOOP
        IF v_check_in_dates[i] - v_check_in_dates[i + 1] = 1 THEN
          v_current_streak := v_current_streak + 1;
        ELSIF v_check_in_dates[i] - v_check_in_dates[i + 1] > 1 THEN
          EXIT;
        END IF;
      END LOOP;
    END IF;

    -- Calculate Best Streak
    v_temp_streak := 1;
    v_best_streak := 1;
    FOR i IN 1..(v_total_completions - 1) LOOP
      IF v_check_in_dates[i] - v_check_in_dates[i + 1] = 1 THEN
        v_temp_streak := v_temp_streak + 1;
      ELSIF v_check_in_dates[i] - v_check_in_dates[i + 1] > 1 THEN
        v_best_streak := GREATEST(v_best_streak, v_temp_streak);
        v_temp_streak := 1;
      END IF;
    END LOOP;
    v_best_streak := GREATEST(v_best_streak, v_temp_streak, v_current_streak);

  ELSIF v_habit.schedule_type = 'SPECIFIC_DAYS' THEN
    -- Specific Days calculation
    SELECT COALESCE(array_agg(day_of_week), '{}') INTO v_scheduled_days
    FROM public.habit_schedule_days
    WHERE habit_id = p_habit_id;

    -- Build calendar array of scheduled dates
    v_current_day := v_today;
    WHILE v_current_day >= v_start_date LOOP
      IF extract(dow from v_current_day)::int = ANY(v_scheduled_days) THEN
        v_scheduled_dates := array_append(v_scheduled_dates, v_current_day);
      END IF;
      v_current_day := v_current_day - 1;
    END loop;

    -- If current day (today) is not checked, check if previous scheduled was checked to preserve active streak
    IF array_length(v_scheduled_dates, 1) > 0 THEN
      IF NOT (v_scheduled_dates[1] = ANY(v_check_in_dates)) THEN
        -- If today is the latest scheduled day, we can start counting from index 2 if today is still active (uncompleted)
        IF v_scheduled_dates[1] = v_today THEN
          i := 2;
          v_current_streak := 0;
        ELSE
          i := 1;
          v_current_streak := 0;
        END IF;
      ELSE
        i := 1;
        v_current_streak := 0;
      END IF;

      -- Calculate active streak
      IF i = 2 OR (array_length(v_scheduled_dates, 1) >= i AND v_scheduled_dates[i] = ANY(v_check_in_dates)) THEN
        IF i = 2 THEN
          -- Today not complete, but previous was
          v_current_streak := 0;
          FOR k IN 2..array_length(v_scheduled_dates, 1) LOOP
            IF v_scheduled_dates[k] = ANY(v_check_in_dates) THEN
              v_current_streak := v_current_streak + 1;
            ELSE
              EXIT;
            END IF;
          END LOOP;
        ELSE
          FOR k IN 1..array_length(v_scheduled_dates, 1) LOOP
            IF v_scheduled_dates[k] = ANY(v_check_in_dates) THEN
              v_current_streak := v_current_streak + 1;
            ELSE
              EXIT;
            END IF;
          END LOOP;
        END IF;
      END IF;

      -- Best streak
      v_temp_streak := 0;
      FOR k IN 1..array_length(v_scheduled_dates, 1) LOOP
        IF v_scheduled_dates[k] = ANY(v_check_in_dates) THEN
          v_temp_streak := v_temp_streak + 1;
          v_best_streak := GREATEST(v_best_streak, v_temp_streak);
        ELSE
          v_temp_streak := 0;
        END IF;
      END LOOP;
      v_best_streak := GREATEST(v_best_streak, v_current_streak);
    END IF;

  ELSIF v_habit.schedule_type = 'FLEXIBLE' THEN
    -- PORTING FLEXIBLE: streak of weeks where weekly target (target_per_week) met
    v_target_per_week := COALESCE(v_habit.target_per_week, 1);
    
    -- Weekly group logic using subqueries in DB for cleanliness
    -- This calculates consecutive weeks (represented as Monday start dates) that meet target
    WITH week_completions AS (
      SELECT 
        date_trunc('week', local_date)::date AS week_start,
        count(*) AS count
      FROM public.check_ins
      WHERE habit_id = p_habit_id
      GROUP BY week_start
    ),
    weeks_list AS (
      SELECT generate_series(
        date_trunc('week', v_start_date)::date,
        date_trunc('week', v_today)::date,
        '1 week'::interval
      )::date AS week_start
    ),
    consecutive_weeks AS (
      SELECT 
        wl.week_start,
        COALESCE(wc.count, 0) AS completed_count
      FROM weeks_list wl
      LEFT JOIN week_completions wc ON wl.week_start = wc.week_start
      ORDER BY wl.week_start DESC
    )
    SELECT 
      -- calculate current weekly streak
      (
        SELECT count(*) 
        FROM (
          SELECT *, row_number() OVER () as rn
          FROM consecutive_weeks
        ) cw
        WHERE cw.completed_count >= v_target_per_week 
          AND cw.rn <= (
            SELECT COALESCE(min(rn) - 1, count(*))
            FROM (SELECT *, row_number() OVER () as rn FROM consecutive_weeks) inner_cw
            WHERE inner_cw.completed_count < v_target_per_week
          )
      ),
      -- calculate best weekly streak
      (
        SELECT max(streak_len)
        FROM (
          SELECT count(*) as streak_len
          FROM (
            SELECT *, 
              sum(case when completed_count >= v_target_per_week then 0 else 1 end) OVER (ORDER BY week_start) as grp
            FROM consecutive_weeks
          ) grp_cw
          WHERE completed_count >= v_target_per_week
          GROUP BY grp
        ) best_str
      )
    INTO v_current_streak, v_best_streak;

    v_current_streak := COALESCE(v_current_streak, 0);
    v_best_streak := COALESCE(v_best_streak, 0);
  END IF;

  -- 6. Recalculate Completion Rate
  v_days_diff := GREATEST(1, v_today - v_start_date + 1);
  v_completion_rate := ROUND((v_total_completions::numeric / v_days_diff::numeric) * 100, 2);

  -- 7. Update Stats table
  INSERT INTO public.habit_stats (
    habit_id, current_streak, best_streak, total_completions, completion_rate, recalculated_at
  ) VALUES (
    p_habit_id, v_current_streak, v_best_streak, v_total_completions, v_completion_rate, NOW()
  ) ON CONFLICT (habit_id) DO UPDATE SET
    current_streak = EXCLUDED.current_streak,
    best_streak = EXCLUDED.best_streak,
    total_completions = EXCLUDED.total_completions,
    completion_rate = EXCLUDED.completion_rate,
    recalculated_at = EXCLUDED.recalculated_at;

  -- 8. Award XP & Evaluate Level
  SELECT display_name, xp, level INTO v_user_display_name, v_new_xp, v_new_level FROM public.profiles WHERE id = p_profile_id;
  v_new_xp := v_new_xp + v_xp_earned;
  v_new_level := (v_new_xp / 100) + 1;
  IF v_new_level > v_new_level THEN
    v_level_up := true;
  END IF;

  UPDATE public.profiles
  SET xp = v_new_xp, level = v_new_level, updated_at = NOW()
  WHERE id = p_profile_id;

  -- 9. Social Activity Feed Generation
  FOR v_active_links IN (
    SELECT l.id as link_id, r.id as room_id, r.name as room_name, r.visibility
    FROM public.room_habit_links l
    JOIN public.room_members m ON l.room_member_id = m.id
    JOIN public.rooms r ON m.room_id = r.id
    WHERE l.personal_habit_id = p_habit_id 
      AND l.unlinked_at IS NULL 
      AND m.left_at IS NULL
  ) LOOP
    INSERT INTO public.activities (
      actor_profile_id, room_id, room_habit_link_id, type, message, visibility, deduplication_key, metadata_json
    ) VALUES (
      p_profile_id,
      v_active_links.room_id,
      v_active_links.link_id,
      'HABIT_COMPLETED',
      v_user_display_name || ' completed "' || v_habit.name || '" satisfying room habit in "' || v_active_links.room_name || '" (Streak: ' || v_current_streak || ' days)',
      v_active_links.visibility,
      p_profile_id || ':' || p_habit_id || ':' || p_local_date || ':' || v_active_links.room_id,
      json_build_object('habitName', v_habit.name, 'currentStreak', v_current_streak, 'localDate', p_local_date)
    ) ON CONFLICT (deduplication_key) DO NOTHING;
  END LOOP;

  -- Assemble final JSON result
  v_result := json_build_object(
    'checkInId', v_check_in_id,
    'xpAwarded', v_xp_earned,
    'levelUp', v_level_up,
    'stats', json_build_object(
      'currentStreak', v_current_streak,
      'bestStreak', v_best_streak,
      'totalCompletions', v_total_completions,
      'completionRate', v_completion_rate
    )
  );

  RETURN v_result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;


------------------------------------------------------------
-- 5.2 undo_complete_habit()
------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.undo_complete_habit(
  p_profile_id UUID,
  p_habit_id UUID,
  p_check_in_id UUID
)
RETURNS JSON AS $$
DECLARE
  v_habit RECORD;
  v_check_in RECORD;
  v_check_in_dates DATE[];
  v_total_completions INT;
  v_current_streak INT := 0;
  v_best_streak INT := 0;
  v_completion_rate NUMERIC(5,2) := 0.00;
  v_start_date DATE;
  v_today DATE := CURRENT_DATE;
  v_days_diff INT;
  v_temp_streak INT := 0;
  v_scheduled_days INT[];
  v_current_day DATE;
  v_scheduled_dates DATE[];
  v_target_per_week INT;
  v_result JSON;
  i INT;
BEGIN
  -- 1. Validate caller identity
  IF auth.uid() <> p_profile_id THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;

  -- 2. Validate habit ownership
  SELECT * INTO v_habit FROM public.habits WHERE id = p_habit_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Habit not found';
  END IF;
  IF v_habit.profile_id <> p_profile_id THEN
    RAISE EXCEPTION 'Habit does not belong to user';
  END IF;

  -- 3. Get and delete check-in
  SELECT * INTO v_check_in FROM public.check_ins WHERE id = p_check_in_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Check-in not found';
  END IF;

  DELETE FROM public.check_ins WHERE id = p_check_in_id;

  -- 4. Re-calculate check-in dates
  SELECT COALESCE(array_agg(local_date ORDER BY local_date DESC), '{}')
  INTO v_check_in_dates
  FROM public.check_ins
  WHERE habit_id = p_habit_id;

  v_total_completions := COALESCE(array_length(v_check_in_dates, 1), 0);
  v_start_date := v_habit.start_date;

  IF v_total_completions > 0 THEN
    v_today := v_check_in_dates[1]; -- Set reference date to last checked day

    IF v_habit.schedule_type = 'DAILY' THEN
      IF CURRENT_DATE - v_check_in_dates[1] <= 1 THEN
        v_current_streak := 1;
        FOR i IN 1..(v_total_completions - 1) LOOP
          IF v_check_in_dates[i] - v_check_in_dates[i + 1] = 1 THEN
            v_current_streak := v_current_streak + 1;
          ELSIF v_check_in_dates[i] - v_check_in_dates[i + 1] > 1 THEN
            EXIT;
          END IF;
        END LOOP;
      END IF;

      v_temp_streak := 1;
      v_best_streak := 1;
      FOR i IN 1..(v_total_completions - 1) LOOP
        IF v_check_in_dates[i] - v_check_in_dates[i + 1] = 1 THEN
          v_temp_streak := v_temp_streak + 1;
        ELSIF v_check_in_dates[i] - v_check_in_dates[i + 1] > 1 THEN
          v_best_streak := GREATEST(v_best_streak, v_temp_streak);
          v_temp_streak := 1;
        END IF;
      END LOOP;
      v_best_streak := GREATEST(v_best_streak, v_temp_streak, v_current_streak);

    ELSIF v_habit.schedule_type = 'SPECIFIC_DAYS' THEN
      SELECT COALESCE(array_agg(day_of_week), '{}') INTO v_scheduled_days
      FROM public.habit_schedule_days
      WHERE habit_id = p_habit_id;

      v_current_day := CURRENT_DATE;
      WHILE v_current_day >= v_start_date LOOP
        IF extract(dow from v_current_day)::int = ANY(v_scheduled_days) THEN
          v_scheduled_dates := array_append(v_scheduled_dates, v_current_day);
        END IF;
        v_current_day := v_current_day - 1;
      END loop;

      IF array_length(v_scheduled_dates, 1) > 0 THEN
        IF NOT (v_scheduled_dates[1] = ANY(v_check_in_dates)) AND v_scheduled_dates[1] = CURRENT_DATE THEN
          i := 2;
        ELSE
          i := 1;
        END IF;

        IF i = 2 OR (array_length(v_scheduled_dates, 1) >= i AND v_scheduled_dates[i] = ANY(v_check_in_dates)) THEN
          IF i = 2 THEN
            FOR k IN 2..array_length(v_scheduled_dates, 1) LOOP
              IF v_scheduled_dates[k] = ANY(v_check_in_dates) THEN
                v_current_streak := v_current_streak + 1;
              ELSE
                EXIT;
              END IF;
            END LOOP;
          ELSE
            FOR k IN 1..array_length(v_scheduled_dates, 1) LOOP
              IF v_scheduled_dates[k] = ANY(v_check_in_dates) THEN
                v_current_streak := v_current_streak + 1;
              ELSE
                EXIT;
              END IF;
            END LOOP;
          END IF;
        END IF;

        v_temp_streak := 0;
        FOR k IN 1..array_length(v_scheduled_dates, 1) LOOP
          IF v_scheduled_dates[k] = ANY(v_check_in_dates) THEN
            v_temp_streak := v_temp_streak + 1;
            v_best_streak := GREATEST(v_best_streak, v_temp_streak);
          ELSE
            v_temp_streak := 0;
          END IF;
        END LOOP;
        v_best_streak := GREATEST(v_best_streak, v_current_streak);
      END IF;

    ELSIF v_habit.schedule_type = 'FLEXIBLE' THEN
      v_target_per_week := COALESCE(v_habit.target_per_week, 1);
      
      WITH week_completions AS (
        SELECT 
          date_trunc('week', local_date)::date AS week_start,
          count(*) AS count
        FROM public.check_ins
        WHERE habit_id = p_habit_id
        GROUP BY week_start
      ),
      weeks_list AS (
        SELECT generate_series(
          date_trunc('week', v_start_date)::date,
          date_trunc('week', CURRENT_DATE)::date,
          '1 week'::interval
        )::date AS week_start
      ),
      consecutive_weeks AS (
        SELECT 
          wl.week_start,
          COALESCE(wc.count, 0) AS completed_count
        FROM weeks_list wl
        LEFT JOIN week_completions wc ON wl.week_start = wc.week_start
        ORDER BY wl.week_start DESC
      )
      SELECT 
        (
          SELECT count(*) 
          FROM (
            SELECT *, row_number() OVER () as rn
            FROM consecutive_weeks
          ) cw
          WHERE cw.completed_count >= v_target_per_week 
            AND cw.rn <= (
              SELECT COALESCE(min(rn) - 1, count(*))
              FROM (SELECT *, row_number() OVER () as rn FROM consecutive_weeks) inner_cw
              WHERE inner_cw.completed_count < v_target_per_week
            )
        ),
        (
          SELECT max(streak_len)
          FROM (
            SELECT count(*) as streak_len
            FROM (
              SELECT *, 
                sum(case when completed_count >= v_target_per_week then 0 else 1 end) OVER (ORDER BY week_start) as grp
              FROM consecutive_weeks
            ) grp_cw
            WHERE completed_count >= v_target_per_week
            GROUP BY grp
          ) best_str
        )
      INTO v_current_streak, v_best_streak;

      v_current_streak := COALESCE(v_current_streak, 0);
      v_best_streak := COALESCE(v_best_streak, 0);
    END IF;
  END IF;

  v_days_diff := GREATEST(1, v_today - v_start_date + 1);
  IF v_total_completions > 0 THEN
    v_completion_rate := ROUND((v_total_completions::numeric / v_days_diff::numeric) * 100, 2);
  END IF;

  -- 5. Update Stats
  UPDATE public.habit_stats SET
    current_streak = v_current_streak,
    best_streak = v_best_streak,
    total_completions = v_total_completions,
    completion_rate = v_completion_rate,
    recalculated_at = NOW()
  WHERE habit_id = p_habit_id;

  v_result := json_build_object(
    'success', true,
    'stats', json_build_object(
      'currentStreak', v_current_streak,
      'bestStreak', v_best_streak,
      'totalCompletions', v_total_completions,
      'completionRate', v_completion_rate
    )
  );

  RETURN v_result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;
