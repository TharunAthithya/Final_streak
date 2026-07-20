-- Migration to implement Habit Freeze functionality

-- 1. Alter check_ins table to add status column
ALTER TABLE public.check_ins ADD COLUMN IF NOT EXISTS status VARCHAR(50) NOT NULL DEFAULT 'COMPLETED';

-- 2. Alter habits table to add freeze tracking columns
ALTER TABLE public.habits ADD COLUMN IF NOT EXISTS freeze_days_available INTEGER NOT NULL DEFAULT 1;
ALTER TABLE public.habits ADD COLUMN IF NOT EXISTS last_freeze_reset TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW();

-- 3. Create helper function to recalculate habit stats
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
  -- Get habit details
  SELECT * INTO v_habit FROM public.habits WHERE id = p_habit_id;
  IF NOT FOUND THEN
    RETURN;
  END IF;

  v_start_date := v_habit.start_date;

  -- Aggregated check-in dates (both COMPLETED and FREEZE count for streak)
  SELECT COALESCE(array_agg(local_date ORDER BY local_date DESC), '{}')
  INTO v_check_in_dates
  FROM public.check_ins
  WHERE habit_id = p_habit_id;

  -- Total completions (ONLY status = 'COMPLETED')
  SELECT COUNT(*) INTO v_total_completions
  FROM public.check_ins
  WHERE habit_id = p_habit_id AND status = 'COMPLETED';

  -- Calculate streak depending on schedule type
  IF v_total_completions = 0 AND NOT EXISTS (SELECT 1 FROM public.check_ins WHERE habit_id = p_habit_id AND status = 'FREEZE') THEN
    v_current_streak := 0;
    v_best_streak := 0;
  ELSE
    IF v_habit.schedule_type = 'DAILY' THEN
      -- Calculate Daily Streak
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

      -- Calculate Best Streak
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
      -- Specific Days calculation
      SELECT COALESCE(array_agg(day_of_week), '{}') INTO v_scheduled_days
      FROM public.habit_schedule_days
      WHERE habit_id = p_habit_id;

      -- Build calendar array of scheduled dates
      v_current_day := p_today;
      WHILE v_current_day >= v_start_date LOOP
        IF extract(dow from v_current_day)::int = ANY(v_scheduled_days) THEN
          v_scheduled_dates := array_append(v_scheduled_dates, v_current_day);
        END IF;
        v_current_day := v_current_day - 1;
      END loop;

      -- If current day (today) is not checked/frozen, check if previous scheduled was checked/frozen to preserve active streak
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

-- 4. Redefine complete_habit using the helper
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
  v_xp_earned INT := 10;
  v_new_xp INT;
  v_new_level INT;
  v_level_up BOOLEAN := false;
  v_user_display_name TEXT;
  v_active_links RECORD;
  v_result JSON;
  v_current_streak INT;
  v_best_streak INT;
  v_completion_rate NUMERIC(5,2);
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
    RAISE EXCEPTION 'Conflict: Habit already completed or frozen for date %', p_local_date;
  END IF;

  -- 4. Create check-in
  INSERT INTO public.check_ins (
    profile_id, habit_id, local_date, completed_at_utc, timezone_at_completion, idempotency_key, status
  ) VALUES (
    p_profile_id, p_habit_id, p_local_date, NOW(), p_timezone, p_idempotency_key, 'COMPLETED'
  ) RETURNING id INTO v_check_in_id;

  -- 5. Recalculate stats using helper
  PERFORM public.recalculate_habit_stats(p_habit_id, p_local_date);

  -- 6. Fetch stats for return
  SELECT current_streak, best_streak, total_completions, completion_rate
  INTO v_current_streak, v_best_streak, v_total_completions, v_completion_rate
  FROM public.habit_stats
  WHERE habit_id = p_habit_id;

  -- 7. Award XP & Evaluate Level
  SELECT display_name, xp, level INTO v_user_display_name, v_new_xp, v_new_level FROM public.profiles WHERE id = p_profile_id;
  v_new_xp := v_new_xp + v_xp_earned;
  v_new_level := (v_new_xp / 100) + 1;
  IF v_new_level > v_new_level THEN
    v_level_up := true;
  END IF;

  UPDATE public.profiles
  SET xp = v_new_xp, level = v_new_level, updated_at = NOW()
  WHERE id = p_profile_id;

  -- 8. Social Activity Feed Generation
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

-- 5. Redefine undo_complete_habit using the helper
CREATE OR REPLACE FUNCTION public.undo_complete_habit(
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

  -- 4. Get last check-in date or CURRENT_DATE for reference today
  SELECT local_date INTO v_last_check_in
  FROM public.check_ins
  WHERE habit_id = p_habit_id
  ORDER BY local_date DESC
  LIMIT 1;

  IF v_last_check_in IS NULL THEN
    v_last_check_in := CURRENT_DATE;
  END IF;

  -- 5. Recalculate stats using helper
  PERFORM public.recalculate_habit_stats(p_habit_id, v_last_check_in);

  -- 6. Fetch stats for return
  SELECT current_streak, best_streak, total_completions, completion_rate
  INTO v_current_streak, v_best_streak, v_total_completions, v_completion_rate
  FROM public.habit_stats
  WHERE habit_id = p_habit_id;

  v_result := json_build_object(
    'currentStreak', v_current_streak,
    'bestStreak', v_best_streak,
    'totalCompletions', v_total_completions,
    'completionRate', v_completion_rate
  );

  RETURN v_result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- 6. Implement freeze_habit function
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
  -- 1. Validate caller identity
  IF auth.uid() <> p_profile_id THEN
    RAISE EXCEPTION 'Unauthorized freeze operation';
  END IF;

  -- 2. Validate habit ownership
  SELECT * INTO v_habit FROM public.habits WHERE id = p_habit_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Habit not found';
  END IF;
  IF v_habit.profile_id <> p_profile_id THEN
    RAISE EXCEPTION 'Habit does not belong to user';
  END IF;

  v_last_reset := COALESCE(v_habit.last_freeze_reset, v_habit.created_at);
  v_freeze_days := v_habit.freeze_days_available;

  -- 3. Regeneration check: if 7+ days since last reset, reset to 1
  IF NOW() - v_last_reset >= INTERVAL '7 days' THEN
    v_freeze_days := 1;
    v_last_reset := NOW();
    UPDATE public.habits 
    SET freeze_days_available = 1, last_freeze_reset = v_last_reset 
    WHERE id = p_habit_id;
  END IF;

  -- 4. Check availability
  IF v_freeze_days < 1 THEN
    RAISE EXCEPTION 'Validation failed: No freeze days available';
  END IF;

  -- 5. Validate targetDate is within previous 3 calendar days (relative to p_local_date / CURRENT_DATE)
  IF p_local_date > (NOW() AT TIME ZONE p_timezone)::date THEN
    RAISE EXCEPTION 'Validation failed: Target date cannot be in the future';
  END IF;
  IF p_local_date < (NOW() AT TIME ZONE p_timezone)::date - 3 THEN
    RAISE EXCEPTION 'Validation failed: Target date is too old';
  END IF;

  -- 6. Validate targetDate is a scheduled day for the habit
  IF v_habit.schedule_type = 'SPECIFIC_DAYS' THEN
    SELECT COALESCE(array_agg(day_of_week), '{}') INTO v_scheduled_days
    FROM public.habit_schedule_days
    WHERE habit_id = p_habit_id;
    IF NOT (extract(dow from p_local_date)::int = ANY(v_scheduled_days)) THEN
      RAISE EXCEPTION 'Validation failed: Target date is not a scheduled day';
    END IF;
  END IF;

  -- 7. Validate no existing check-in (COMPLETED or FREEZE) for that date
  IF EXISTS (SELECT 1 FROM public.check_ins WHERE habit_id = p_habit_id AND local_date = p_local_date) THEN
    RAISE EXCEPTION 'Validation failed: Target date already has a completion or freeze';
  END IF;

  -- 8. Validate idempotency key
  IF EXISTS (SELECT 1 FROM public.check_ins WHERE idempotency_key = p_idempotency_key) THEN
    RAISE EXCEPTION 'Conflict: Habit check-in idempotency key already processed';
  END IF;

  -- 9. Insert check-in with status = 'FREEZE'
  INSERT INTO public.check_ins (
    profile_id, habit_id, local_date, completed_at_utc, timezone_at_completion, idempotency_key, status
  ) VALUES (
    p_profile_id, p_habit_id, p_local_date, NOW(), p_timezone, p_idempotency_key, 'FREEZE'
  ) RETURNING id INTO v_check_in_id;

  -- 10. Deduct 1 freeze
  UPDATE public.habits
  SET freeze_days_available = v_freeze_days - 1
  WHERE id = p_habit_id;

  -- 11. Recalculate stats using helper
  PERFORM public.recalculate_habit_stats(p_habit_id, p_local_date);

  -- 12. Fetch stats for return
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

-- 7. Implement undo_freeze_habit function
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
  IF v_check_in.status <> 'FREEZE' THEN
    RAISE EXCEPTION 'Cannot undo check-in as it is not a freeze';
  END IF;

  DELETE FROM public.check_ins WHERE id = p_check_in_id;

  -- 4. Refund 1 freeze (cap at 1)
  v_new_freezes := GREATEST(1, v_habit.freeze_days_available + 1);
  UPDATE public.habits
  SET freeze_days_available = v_new_freezes
  WHERE id = p_habit_id;

  -- 5. Get last check-in date or CURRENT_DATE for reference today
  SELECT local_date INTO v_last_check_in
  FROM public.check_ins
  WHERE habit_id = p_habit_id
  ORDER BY local_date DESC
  LIMIT 1;

  IF v_last_check_in IS NULL THEN
    v_last_check_in := CURRENT_DATE;
  END IF;

  -- 6. Recalculate stats using helper
  PERFORM public.recalculate_habit_stats(p_habit_id, v_last_check_in);

  -- 7. Fetch stats for return
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
