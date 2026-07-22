-- Migration 0007: Delete Habit RPC & Profile Username Guarantee

-- 1. Create SECURITY DEFINER function to delete habit safely bypassing cascade issues
CREATE OR REPLACE FUNCTION public.delete_habit(
  p_habit_id UUID
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Verify ownership
  IF NOT EXISTS (
    SELECT 1 FROM public.habits
    WHERE id = p_habit_id AND profile_id = auth.uid()
  ) THEN
    RAISE EXCEPTION 'Habit not found or unauthorized';
  END IF;

  -- Delete room habit links first to prevent cascade locks
  DELETE FROM public.room_habit_links
  WHERE personal_habit_id = p_habit_id;

  -- Delete habit (cascades to check_ins, habit_stats, habit_schedule_days)
  DELETE FROM public.habits
  WHERE id = p_habit_id AND profile_id = auth.uid();

  RETURN TRUE;
END;
$$;

-- 2. Update handle_new_user to ensure unique username is always populated
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, display_name, username, avatar_url, timezone, locale)
  VALUES (
    new.id,
    COALESCE(new.raw_user_meta_data->>'display_name', split_part(new.email, '@', 1)),
    COALESCE(
      NULLIF(new.raw_user_meta_data->>'username', ''),
      'user_' || substring(new.id::text from 1 for 8)
    ),
    new.raw_user_meta_data->>'avatar_url',
    COALESCE(new.raw_user_meta_data->>'timezone', 'UTC'),
    COALESCE(new.raw_user_meta_data->>'locale', 'en')
  )
  ON CONFLICT (id) DO UPDATE SET
    display_name = EXCLUDED.display_name,
    username = COALESCE(profiles.username, EXCLUDED.username);

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;
