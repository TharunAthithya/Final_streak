-- Migration 0011: Room Lifetime Duration & Expiration Support (Option C)

-- Add duration columns to public.rooms
ALTER TABLE public.rooms
  ADD COLUMN IF NOT EXISTS duration_type VARCHAR(20) DEFAULT 'PERMANENT',
  ADD COLUMN IF NOT EXISTS duration_days INTEGER,
  ADD COLUMN IF NOT EXISTS expires_at TIMESTAMP WITH TIME ZONE;

-- Update create_room RPC to compute duration and expiration
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

-- RPC: extend_room_duration (Option C — room owner extends room duration)
CREATE OR REPLACE FUNCTION public.extend_room_duration(
  p_room_id UUID,
  p_additional_days INT
)
RETURNS JSON AS $$
DECLARE
  v_room RECORD;
  v_new_expires_at TIMESTAMP WITH TIME ZONE;
  v_new_days INT;
BEGIN
  -- Validate room owner
  SELECT * INTO v_room FROM public.rooms WHERE id = p_room_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Room not found';
  END IF;

  IF v_room.owner_id <> auth.uid() THEN
    RAISE EXCEPTION 'Only the room owner can extend room lifetime';
  END IF;

  IF p_additional_days <= 0 THEN
    RAISE EXCEPTION 'Additional days must be greater than zero';
  END IF;

  -- Compute new expiration date from current expiration or now
  IF v_room.expires_at IS NOT NULL AND v_room.expires_at > NOW() THEN
    v_new_expires_at := v_room.expires_at + (p_additional_days || ' days')::INTERVAL;
  ELSE
    v_new_expires_at := NOW() + (p_additional_days || ' days')::INTERVAL;
  END IF;

  v_new_days := COALESCE(v_room.duration_days, 0) + p_additional_days;

  UPDATE public.rooms
  SET
    expires_at = v_new_expires_at,
    duration_days = v_new_days,
    duration_type = 'CUSTOM',
    updated_at = NOW()
  WHERE id = p_room_id;

  RETURN json_build_object(
    'success', true,
    'roomId', p_room_id,
    'expiresAt', v_new_expires_at,
    'durationDays', v_new_days
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;
