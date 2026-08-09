-- Migration 0014: Update join_room_by_code to allow direct joins for all invite codes (bypassing JOIN_REQUEST)

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

  -- Directly join the user regardless of PUBLIC or PRIVATE when using an invite code
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
END;
$$;
