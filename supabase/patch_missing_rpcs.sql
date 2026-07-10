-- Patch: Add missing RPC functions that were not included in full_rebuild.sql
-- Run this in the Supabase SQL Editor as a new query.

------------------------------------------------------------
-- 5.3 create_room()
------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.create_room(
  p_owner_id UUID,
  p_name TEXT,
  p_description TEXT,
  p_visibility room_visibility
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


------------------------------------------------------------
-- 5.4 join_room()
------------------------------------------------------------
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


------------------------------------------------------------
-- 5.5 leave_room()
------------------------------------------------------------
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


------------------------------------------------------------
-- 5.6 get_leaderboard()
------------------------------------------------------------
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


------------------------------------------------------------
-- 5.7 delete_account()
------------------------------------------------------------
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
