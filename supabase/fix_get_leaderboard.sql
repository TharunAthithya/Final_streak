-- Fix for "structure of query does not match function result type" in get_leaderboard
-- Run this in the Supabase SQL Editor as a new query.

DROP FUNCTION IF EXISTS public.get_leaderboard(UUID, TEXT);

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
    (DENSE_RANK() OVER (ORDER BY scores.raw_score DESC))::INT AS rank
  FROM scores
  ORDER BY rank ASC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;
