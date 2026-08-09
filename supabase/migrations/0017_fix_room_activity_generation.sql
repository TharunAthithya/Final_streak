-- Migration 0017: Fix room activity generation in complete_habit to match habits by name and link
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
  v_new_xp := COALESCE(v_new_xp, 0) + v_xp_earned;
  v_new_level := (v_new_xp / 100) + 1;
  IF v_new_level > COALESCE(v_new_level, 1) THEN
    v_level_up := true;
  END IF;

  UPDATE public.profiles
  SET xp = v_new_xp, level = v_new_level, updated_at = NOW()
  WHERE id = p_profile_id;

  -- 8. Social Activity Feed Generation: Match by explicit links OR matching room_habits by name
  FOR v_active_links IN (
    SELECT 
      m.room_id,
      r.name as room_name,
      r.visibility
    FROM public.room_members m
    JOIN public.rooms r ON m.room_id = r.id
    JOIN public.room_habits rh ON rh.room_id = r.id
    WHERE m.profile_id = p_profile_id
      AND m.left_at IS NULL
      AND r.archived_at IS NULL
      AND rh.archived_at IS NULL
      AND LOWER(TRIM(rh.name)) = LOWER(TRIM(v_habit.name))
    UNION
    SELECT 
      r.id as room_id,
      r.name as room_name,
      r.visibility
    FROM public.room_habit_links l
    JOIN public.room_members m ON l.room_member_id = m.id
    JOIN public.rooms r ON m.room_id = r.id
    WHERE l.personal_habit_id = p_habit_id 
      AND l.unlinked_at IS NULL 
      AND m.left_at IS NULL
      AND r.archived_at IS NULL
  ) LOOP
    INSERT INTO public.activities (
      actor_profile_id, room_id, type, message, visibility, deduplication_key, metadata_json
    ) VALUES (
      p_profile_id,
      v_active_links.room_id,
      'HABIT_COMPLETED',
      COALESCE(v_user_display_name, 'A member') || ' completed "' || v_habit.name || '" (Streak: ' || v_current_streak || ' days)',
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
