-- Migration 0009: Join Room by Code RPC (SECURITY DEFINER to bypass SELECT RLS on private rooms)

CREATE OR REPLACE FUNCTION public.join_room_by_code(
  p_invite_code TEXT
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_room RECORD;
  v_clean_code TEXT;
  v_user_name TEXT;
  v_invitation_id UUID;
BEGIN
  v_clean_code := upper(trim(p_invite_code));

  -- Look up room by invite code ignoring SELECT RLS
  SELECT * INTO v_room FROM public.rooms
  WHERE invite_code = v_clean_code AND archived_at IS NULL;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Invalid invite code or room does not exist';
  END IF;

  -- Check if user is already an active member
  IF EXISTS (
    SELECT 1 FROM public.room_members
    WHERE room_id = v_room.id AND profile_id = auth.uid() AND left_at IS NULL
  ) THEN
    RETURN json_build_object(
      'roomId', v_room.id,
      'roomName', v_room.name,
      'alreadyMember', true
    );
  END IF;

  -- If room is PUBLIC, directly join the user
  IF v_room.visibility = 'PUBLIC' THEN
    IF EXISTS (
      SELECT 1 FROM public.room_members
      WHERE room_id = v_room.id AND profile_id = auth.uid()
    ) THEN
      UPDATE public.room_members
      SET left_at = NULL, role = 'MEMBER'
      WHERE room_id = v_room.id AND profile_id = auth.uid();
    ELSE
      INSERT INTO public.room_members (room_id, profile_id, role)
      VALUES (v_room.id, auth.uid(), 'MEMBER');
    END IF;

    SELECT display_name INTO v_user_name FROM public.profiles WHERE id = auth.uid();

    INSERT INTO public.activities (actor_profile_id, room_id, type, message)
    VALUES (auth.uid(), v_room.id, 'ROOM_JOIN', 'joined the room');

    RETURN json_build_object(
      'roomId', v_room.id,
      'roomName', v_room.name,
      'joined', true,
      'requestSent', false
    );
  END IF;

  -- If room is PRIVATE, send join request to room owner
  -- Check for existing pending request
  IF EXISTS (
    SELECT 1 FROM public.room_invitations
    WHERE room_id = v_room.id AND invitee_id = auth.uid() AND status = 'PENDING'
  ) THEN
    RETURN json_build_object(
      'roomId', v_room.id,
      'roomName', v_room.name,
      'requestSent', true
    );
  END IF;

  SELECT display_name INTO v_user_name FROM public.profiles WHERE id = auth.uid();

  -- Create join request invitation record
  INSERT INTO public.room_invitations (room_id, inviter_id, invitee_id, type, status)
  VALUES (v_room.id, auth.uid(), auth.uid(), 'JOIN_REQUEST', 'PENDING')
  RETURNING id INTO v_invitation_id;

  -- Create notification for room owner
  INSERT INTO public.in_app_notifications (profile_id, type, title, body, icon_name, reference_id)
  VALUES (
    v_room.owner_id,
    'JOIN_REQUEST',
    v_user_name || ' wants to join ' || v_room.name,
    'Approve or decline this join request.',
    'account-plus',
    v_invitation_id
  );

  RETURN json_build_object(
    'roomId', v_room.id,
    'roomName', v_room.name,
    'joined', false,
    'requestSent', true
  );
END;
$$;
