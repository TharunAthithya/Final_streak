-- Migration 0012: Invitation Details & Room Lookup RPCs for Habit Matching

-- RPC 1: get_invitation_details
-- Fetches invitation metadata along with the room's tracked habits so the invitee can check habit compatibility before accepting.
CREATE OR REPLACE FUNCTION public.get_invitation_details(
  p_invitation_id UUID
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_invitation RECORD;
  v_room RECORD;
  v_inviter RECORD;
  v_tracked_habits JSON;
BEGIN
  -- Fetch invitation
  SELECT * INTO v_invitation FROM public.room_invitations WHERE id = p_invitation_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Invitation not found';
  END IF;

  -- Fetch room info
  SELECT * INTO v_room FROM public.rooms WHERE id = v_invitation.room_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Room not found';
  END IF;

  -- Fetch inviter info
  SELECT id, display_name, username FROM public.profiles WHERE id = v_invitation.inviter_id;

  -- Aggregate room habits
  SELECT COALESCE(json_agg(json_build_object(
    'id', rh.id,
    'name', rh.name,
    'description', rh.description
  )), '[]'::json) INTO v_tracked_habits
  FROM public.room_habits rh
  WHERE rh.room_id = v_invitation.room_id AND rh.archived_at IS NULL;

  RETURN json_build_object(
    'invitationId', v_invitation.id,
    'roomId', v_room.id,
    'roomName', v_room.name,
    'inviterId', v_invitation.inviter_id,
    'inviterName', v_inviter.display_name,
    'type', v_invitation.type,
    'status', v_invitation.status,
    'trackedHabits', v_tracked_habits
  );
END;
$$;

-- RPC 2: get_room_by_invite_code
-- Bypasses select RLS to return room basic details and tracked habits for code-based join checks.
CREATE OR REPLACE FUNCTION public.get_room_by_invite_code(
  p_invite_code TEXT
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_clean_code TEXT;
  v_room RECORD;
  v_tracked_habits JSON;
BEGIN
  v_clean_code := upper(trim(p_invite_code));

  SELECT * INTO v_room FROM public.rooms WHERE invite_code = v_clean_code AND archived_at IS NULL;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Invalid invite code or room archived';
  END IF;

  SELECT COALESCE(json_agg(json_build_object(
    'id', rh.id,
    'name', rh.name,
    'description', rh.description
  )), '[]'::json) INTO v_tracked_habits
  FROM public.room_habits rh
  WHERE rh.room_id = v_room.id AND rh.archived_at IS NULL;

  RETURN json_build_object(
    'roomId', v_room.id,
    'roomName', v_room.name,
    'description', v_room.description,
    'visibility', v_room.visibility,
    'inviteCode', v_room.invite_code,
    'trackedHabits', v_tracked_habits
  );
END;
$$;