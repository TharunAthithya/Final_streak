-- Patch: Add missing RPC functions and schema columns that were not included in full_rebuild.sql
-- Run this in the Supabase SQL Editor as a new query to update your active database instance.

-- 1. Ensure required schema columns exist
ALTER TABLE public.check_ins ADD COLUMN IF NOT EXISTS status VARCHAR(50) NOT NULL DEFAULT 'COMPLETED';
ALTER TABLE public.habits ADD COLUMN IF NOT EXISTS freeze_days_available INTEGER NOT NULL DEFAULT 1;
ALTER TABLE public.habits ADD COLUMN IF NOT EXISTS last_freeze_reset TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW();
ALTER TABLE public.habits ADD COLUMN IF NOT EXISTS reminder_time TIME;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS reflection_draft TEXT;

-- 2. Helper function to recalculate habit stats
CREATE OR REPLACE FUNCTION public.recalculate_habit_stats(
  p_habit_id UUID,
  p_today DATE
)
RETURNS VOID AS $$
DECLARE
  v_habit RECORD;
  v_total_completions INT;
  v_current_streak INT := 0;
  v_best_streak INT := 0;
  v_completion_rate NUMERIC(5,2) := 0.00;
  v_check_in_dates DATE[];
  v_start_date DATE;
  v_days_diff INT;
  v_temp_streak INT := 0;
  i INT;
  v_scheduled_days INT[];
  v_current_day DATE;
  v_scheduled_dates DATE[];
  v_target_per_week INT;
BEGIN
  SELECT * INTO v_habit FROM public.habits WHERE id = p_habit_id;
  IF NOT FOUND THEN
    RETURN;
  END IF;

  v_start_date := v_habit.start_date;

  SELECT COALESCE(array_agg(local_date ORDER BY local_date DESC), '{}')
  INTO v_check_in_dates
  FROM public.check_ins
  WHERE habit_id = p_habit_id;

  SELECT COUNT(*) INTO v_total_completions
  FROM public.check_ins
  WHERE habit_id = p_habit_id AND status = 'COMPLETED';

  IF v_total_completions = 0 AND NOT EXISTS (SELECT 1 FROM public.check_ins WHERE habit_id = p_habit_id AND status = 'FREEZE') THEN
    v_current_streak := 0;
    v_best_streak := 0;
  ELSE
    IF v_habit.schedule_type = 'DAILY' THEN
      IF p_today - v_check_in_dates[1] <= 1 THEN
        v_current_streak := 1;
        FOR i IN 1..(array_length(v_check_in_dates, 1) - 1) LOOP
          IF v_check_in_dates[i] - v_check_in_dates[i + 1] = 1 THEN
            v_current_streak := v_current_streak + 1;
          ELSIF v_check_in_dates[i] - v_check_in_dates[i + 1] > 1 THEN
            EXIT;
          END IF;
        END LOOP;
      END IF;

      v_temp_streak := 1;
      v_best_streak := 1;
      FOR i IN 1..(array_length(v_check_in_dates, 1) - 1) LOOP
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

      v_current_day := p_today;
      WHILE v_current_day >= v_start_date LOOP
        IF extract(dow from v_current_day)::int = ANY(v_scheduled_days) THEN
          v_scheduled_dates := array_append(v_scheduled_dates, v_current_day);
        END IF;
        v_current_day := v_current_day - 1;
      END LOOP;

      IF array_length(v_scheduled_dates, 1) > 0 THEN
        IF NOT (v_scheduled_dates[1] = ANY(v_check_in_dates)) THEN
          IF v_scheduled_dates[1] = p_today THEN
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

        IF i = 2 OR (array_length(v_scheduled_dates, 1) >= i AND v_scheduled_dates[i] = ANY(v_check_in_dates)) THEN
          IF i = 2 THEN
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
        WHERE habit_id = p_habit_id AND status = 'COMPLETED'
        GROUP BY week_start
      ),
      weeks_list AS (
        SELECT generate_series(
          date_trunc('week', v_start_date)::date,
          date_trunc('week', p_today)::date,
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

  v_days_diff := GREATEST(1, p_today - v_start_date + 1);
  v_completion_rate := ROUND((v_total_completions::numeric / v_days_diff::numeric) * 100, 2);

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
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;


-- 3. Implement freeze_habit function
CREATE OR REPLACE FUNCTION public.freeze_habit(
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
  v_result JSON;
  v_last_reset TIMESTAMP WITH TIME ZONE;
  v_freeze_days INT;
  v_scheduled_days INT[];
BEGIN
  IF auth.uid() <> p_profile_id THEN
    RAISE EXCEPTION 'Unauthorized freeze operation';
  END IF;

  SELECT * INTO v_habit FROM public.habits WHERE id = p_habit_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Habit not found';
  END IF;
  IF v_habit.profile_id <> p_profile_id THEN
    RAISE EXCEPTION 'Habit does not belong to user';
  END IF;

  v_last_reset := COALESCE(v_habit.last_freeze_reset, v_habit.created_at);
  v_freeze_days := v_habit.freeze_days_available;

  IF NOW() - v_last_reset >= INTERVAL '7 days' THEN
    v_freeze_days := 1;
    v_last_reset := NOW();
    UPDATE public.habits 
    SET freeze_days_available = 1, last_freeze_reset = v_last_reset 
    WHERE id = p_habit_id;
  END IF;

  IF v_freeze_days < 1 THEN
    RAISE EXCEPTION 'Validation failed: No freeze days available';
  END IF;

  IF p_local_date > (NOW() AT TIME ZONE p_timezone)::date THEN
    RAISE EXCEPTION 'Validation failed: Target date cannot be in the future';
  END IF;
  IF p_local_date < (NOW() AT TIME ZONE p_timezone)::date - 3 THEN
    RAISE EXCEPTION 'Validation failed: Target date is too old';
  END IF;

  IF v_habit.schedule_type = 'SPECIFIC_DAYS' THEN
    SELECT COALESCE(array_agg(day_of_week), '{}') INTO v_scheduled_days
    FROM public.habit_schedule_days
    WHERE habit_id = p_habit_id;
    IF NOT (extract(dow from p_local_date)::int = ANY(v_scheduled_days)) THEN
      RAISE EXCEPTION 'Validation failed: Target date is not a scheduled day';
    END IF;
  END IF;

  IF EXISTS (SELECT 1 FROM public.check_ins WHERE habit_id = p_habit_id AND local_date = p_local_date) THEN
    RAISE EXCEPTION 'Validation failed: Target date already has a completion or freeze';
  END IF;

  IF EXISTS (SELECT 1 FROM public.check_ins WHERE idempotency_key = p_idempotency_key) THEN
    RAISE EXCEPTION 'Conflict: Habit check-in idempotency key already processed';
  END IF;

  INSERT INTO public.check_ins (
    profile_id, habit_id, local_date, completed_at_utc, timezone_at_completion, idempotency_key, status
  ) VALUES (
    p_profile_id, p_habit_id, p_local_date, NOW(), p_timezone, p_idempotency_key, 'FREEZE'
  ) RETURNING id INTO v_check_in_id;

  UPDATE public.habits
  SET freeze_days_available = v_freeze_days - 1
  WHERE id = p_habit_id;

  PERFORM public.recalculate_habit_stats(p_habit_id, p_local_date);

  SELECT current_streak, best_streak, total_completions, completion_rate
  INTO v_current_streak, v_best_streak, v_total_completions, v_completion_rate
  FROM public.habit_stats
  WHERE habit_id = p_habit_id;

  v_result := json_build_object(
    'checkInId', v_check_in_id,
    'freezeDaysAvailable', v_freeze_days - 1,
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


-- 4. Implement undo_freeze_habit function
CREATE OR REPLACE FUNCTION public.undo_freeze_habit(
  p_profile_id UUID,
  p_habit_id UUID,
  p_check_in_id UUID
)
RETURNS JSON AS $$
DECLARE
  v_habit RECORD;
  v_check_in RECORD;
  v_total_completions INT;
  v_current_streak INT := 0;
  v_best_streak INT := 0;
  v_completion_rate NUMERIC(5,2) := 0.00;
  v_result JSON;
  v_last_check_in DATE;
  v_new_freezes INT;
BEGIN
  IF auth.uid() <> p_profile_id THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;

  SELECT * INTO v_habit FROM public.habits WHERE id = p_habit_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Habit not found';
  END IF;
  IF v_habit.profile_id <> p_profile_id THEN
    RAISE EXCEPTION 'Habit does not belong to user';
  END IF;

  SELECT * INTO v_check_in FROM public.check_ins WHERE id = p_check_in_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Check-in not found';
  END IF;
  IF v_check_in.status <> 'FREEZE' THEN
    RAISE EXCEPTION 'Cannot undo check-in as it is not a freeze';
  END IF;

  DELETE FROM public.check_ins WHERE id = p_check_in_id;

  v_new_freezes := GREATEST(1, v_habit.freeze_days_available + 1);
  UPDATE public.habits
  SET freeze_days_available = v_new_freezes
  WHERE id = p_habit_id;

  SELECT local_date INTO v_last_check_in
  FROM public.check_ins
  WHERE habit_id = p_habit_id
  ORDER BY local_date DESC
  LIMIT 1;

  IF v_last_check_in IS NULL THEN
    v_last_check_in := CURRENT_DATE;
  END IF;

  PERFORM public.recalculate_habit_stats(p_habit_id, v_last_check_in);

  SELECT current_streak, best_streak, total_completions, completion_rate
  INTO v_current_streak, v_best_streak, v_total_completions, v_completion_rate
  FROM public.habit_stats
  WHERE habit_id = p_habit_id;

  v_result := json_build_object(
    'freezeDaysAvailable', v_new_freezes,
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


-- 5. Delete habit helper RPC
CREATE OR REPLACE FUNCTION public.delete_habit(
  p_habit_id UUID
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM public.habits
    WHERE id = p_habit_id AND profile_id = auth.uid()
  ) THEN
    RAISE EXCEPTION 'Habit not found or unauthorized';
  END IF;

  DELETE FROM public.room_habit_links
  WHERE personal_habit_id = p_habit_id;

  DELETE FROM public.habits
  WHERE id = p_habit_id AND profile_id = auth.uid();

  RETURN TRUE;
END;
$$;


-- 6. Room management RPCs
CREATE OR REPLACE FUNCTION public.create_room(
  p_owner_id UUID,
  p_name TEXT,
  p_description TEXT DEFAULT NULL,
  p_visibility room_visibility DEFAULT 'PRIVATE'::room_visibility
)
RETURNS JSON AS $$
DECLARE
  v_room_id UUID;
  v_invite_code VARCHAR(50);
  v_result JSON;
BEGIN
  IF auth.uid() <> p_owner_id THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;

  v_invite_code := upper(substring(md5(random()::text) from 1 for 6));

  INSERT INTO public.rooms (
    owner_id, name, description, visibility, invite_code
  ) VALUES (
    p_owner_id, p_name, p_description, p_visibility, v_invite_code
  ) RETURNING id INTO v_room_id;

  INSERT INTO public.room_members (
    room_id, profile_id, role
  ) VALUES (
    v_room_id, p_owner_id, 'OWNER'
  );

  INSERT INTO public.activities (
    actor_profile_id, room_id, type, message, visibility
  ) VALUES (
    p_owner_id, v_room_id, 'ROOM_JOIN', 'Room created', p_visibility
  );

  v_result := json_build_object(
    'roomId', v_room_id,
    'name', p_name,
    'inviteCode', v_invite_code
  );

  RETURN v_result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;


CREATE OR REPLACE FUNCTION public.join_room(
  p_profile_id UUID,
  p_invite_code TEXT
)
RETURNS JSON AS $$
DECLARE
  v_room RECORD;
  v_member_id UUID;
  v_user_name TEXT;
  v_result JSON;
BEGIN
  IF auth.uid() <> p_profile_id THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;

  SELECT * INTO v_room FROM public.rooms WHERE invite_code = upper(p_invite_code) AND archived_at IS NULL;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Invalid invite code or Room archived';
  END IF;

  IF EXISTS (SELECT 1 FROM public.room_members WHERE room_id = v_room.id AND profile_id = p_profile_id AND left_at IS NULL) THEN
    RETURN json_build_object('roomId', v_room.id, 'alreadyMember', true);
  END IF;

  INSERT INTO public.room_members (
    room_id, profile_id, role
  ) VALUES (
    v_room.id, p_profile_id, 'MEMBER'
  ) RETURNING id INTO v_member_id;

  SELECT display_name INTO v_user_name FROM public.profiles WHERE id = p_profile_id;
  INSERT INTO public.activities (
    actor_profile_id, room_id, type, message, visibility
  ) VALUES (
    p_profile_id, v_room.id, 'ROOM_JOIN', v_user_name || ' joined the room', v_room.visibility
  );

  v_result := json_build_object(
    'roomId', v_room.id,
    'roomName', v_room.name,
    'membershipId', v_member_id
  );

  RETURN v_result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;


CREATE OR REPLACE FUNCTION public.leave_room(
  p_profile_id UUID,
  p_room_id UUID
)
RETURNS BOOLEAN AS $$
DECLARE
  v_role room_role;
  v_member_id UUID;
BEGIN
  IF auth.uid() <> p_profile_id THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;

  SELECT id, role INTO v_member_id, v_role 
  FROM public.room_members 
  WHERE room_id = p_room_id AND profile_id = p_profile_id AND left_at IS NULL;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Active membership not found';
  END IF;

  IF v_role = 'OWNER' THEN
    RAISE EXCEPTION 'Owner cannot leave without transferring ownership or deleting the room';
  END IF;

  UPDATE public.room_members
  SET left_at = NOW()
  WHERE id = v_member_id;

  UPDATE public.room_habit_links
  SET unlinked_at = NOW()
  WHERE room_member_id = v_member_id AND unlinked_at IS NULL;

  RETURN true;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;


CREATE OR REPLACE FUNCTION public.get_leaderboard(
  p_room_id UUID,
  p_period TEXT
)
RETURNS TABLE (
  profile_id UUID,
  display_name TEXT,
  avatar_url TEXT,
  score BIGINT,
  rank INT
) AS $$
DECLARE
  v_start_date DATE;
BEGIN
  IF NOT EXISTS (select 1 from public.room_members where room_id = p_room_id and room_members.profile_id = auth.uid() and left_at is null) THEN
    RAISE EXCEPTION 'Unauthorized: user is not a member of this room';
  END IF;

  IF p_period = 'weekly' THEN
    v_start_date := date_trunc('week', NOW())::date;
  ELSIF p_period = 'monthly' THEN
    v_start_date := date_trunc('month', NOW())::date;
  ELSE
    v_start_date := '1970-01-01'::date;
  END IF;

  RETURN QUERY
  WITH scores AS (
    SELECT 
      m.profile_id,
      p.display_name,
      p.avatar_url,
      count(c.id) AS raw_score
    FROM public.room_members m
    JOIN public.profiles p ON m.profile_id = p.id
    LEFT JOIN public.room_habit_links l ON l.room_member_id = m.id AND l.unlinked_at IS NULL
    LEFT JOIN public.check_ins c ON c.habit_id = l.personal_habit_id AND c.local_date >= v_start_date
    WHERE m.room_id = p_room_id AND m.left_at IS NULL
    GROUP BY m.profile_id, p.display_name, p.avatar_url
  )
  SELECT 
    scores.profile_id::UUID,
    scores.display_name::TEXT,
    scores.avatar_url::TEXT,
    scores.raw_score::BIGINT AS score,
    (DENSE_RANK() OVER (ORDER BY scores.raw_score DESC))::int AS rank
  FROM scores
  ORDER BY rank ASC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;


CREATE OR REPLACE FUNCTION public.delete_account(
  p_profile_id UUID
)
RETURNS BOOLEAN AS $$
BEGIN
  IF auth.uid() <> p_profile_id THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;

  IF EXISTS (SELECT 1 FROM public.rooms WHERE owner_id = p_profile_id AND archived_at IS NULL) THEN
    RAISE EXCEPTION 'Cannot delete account while owning active rooms. Delete or transfer rooms first';
  END IF;

  DELETE FROM public.profiles WHERE id = p_profile_id;

  RETURN true;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;


-- 7. Grant EXECUTE permissions to authenticated and service_role
GRANT EXECUTE ON FUNCTION public.recalculate_habit_stats(UUID, DATE) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.complete_habit(UUID, UUID, DATE, TEXT, TEXT) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.undo_complete_habit(UUID, UUID, UUID) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.freeze_habit(UUID, UUID, DATE, TEXT, TEXT) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.undo_freeze_habit(UUID, UUID, UUID) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.delete_habit(UUID) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.create_room(UUID, TEXT, TEXT, room_visibility) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.join_room(UUID, TEXT) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.leave_room(UUID, UUID) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.get_leaderboard(UUID, TEXT) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.delete_account(UUID) TO authenticated, service_role;

-- 8. Add room_habits RLS policies & delete_room function
ALTER TABLE public.room_habits ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS room_habits_insert_member ON public.room_habits;
CREATE POLICY room_habits_insert_member ON public.room_habits FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

CREATE OR REPLACE FUNCTION public.delete_room(
  p_room_id UUID,
  p_owner_id UUID
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.uid() <> p_owner_id THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;

  UPDATE public.rooms
  SET archived_at = NOW()
  WHERE id = p_room_id AND owner_id = p_owner_id;

  RETURN true;
END;
$$;

GRANT EXECUTE ON FUNCTION public.delete_room(UUID, UUID) TO authenticated, service_role;

-- 9. Signal PostgREST to immediately reload schema cache
NOTIFY pgrst, 'reload schema';
