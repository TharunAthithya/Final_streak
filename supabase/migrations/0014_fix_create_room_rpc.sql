-- Migration 0014: Fix create_room RPC function signature default parameters
-- Ensures p_description has DEFAULT NULL to prevent PostgREST signature lookup errors when description is omitted.

CREATE OR REPLACE FUNCTION public.create_room(
  p_owner_id UUID,
  p_name TEXT,
  p_description TEXT DEFAULT NULL,
  p_visibility room_visibility DEFAULT 'PRIVATE'::room_visibility,
  p_duration_type TEXT DEFAULT 'PERMANENT',
  p_duration_days INT DEFAULT NULL
)
RETURNS JSON AS $$
DECLARE
  v_room_id UUID;
  v_invite_code VARCHAR(50);
  v_expires_at TIMESTAMP WITH TIME ZONE := NULL;
  v_result JSON;
BEGIN
  IF auth.uid() <> p_owner_id THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;

  -- Generate 6 character uppercase alphanumeric invite code
  v_invite_code := upper(substring(md5(random()::text) from 1 for 6));

  -- Calculate expiry if duration_days provided
  IF p_duration_days IS NOT NULL AND p_duration_days > 0 THEN
    v_expires_at := NOW() + (p_duration_days || ' days')::INTERVAL;
  END IF;

  -- Insert Room
  INSERT INTO public.rooms (
    owner_id, name, description, visibility, invite_code, duration_type, duration_days, expires_at
  ) VALUES (
    p_owner_id, p_name, p_description, p_visibility, v_invite_code, COALESCE(p_duration_type, 'PERMANENT'), p_duration_days, v_expires_at
  ) RETURNING id INTO v_room_id;

  -- Insert Creator as OWNER member
  INSERT INTO public.room_members (
    room_id, profile_id, role
  ) VALUES (
    v_room_id, p_owner_id, 'OWNER'
  );

  -- Log Activity
  INSERT INTO public.activities (
    actor_profile_id, room_id, type, message, visibility
  ) VALUES (
    p_owner_id, v_room_id, 'ROOM_JOIN', 'Room created', p_visibility
  );

  v_result := json_build_object(
    'roomId', v_room_id,
    'name', p_name,
    'inviteCode', v_invite_code,
    'durationType', p_duration_type,
    'durationDays', p_duration_days,
    'expiresAt', v_expires_at
  );

  RETURN v_result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;
