-- Migration 0015: Fix get_invitation_details RPC & update respond_to_invitation notification retention
-- 1. Fixes "query has no destination for result data" error when accepting invitations (added INTO v_inviter)
-- 2. Updates respond_to_invitation so accepted notifications stay in notification center (marked read, non-actionable)
--    and rejected notifications vanish completely.

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

  -- Fetch inviter info (FIX: added INTO v_inviter)
  SELECT id, display_name, username INTO v_inviter FROM public.profiles WHERE id = v_invitation.inviter_id;

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


CREATE OR REPLACE FUNCTION public.respond_to_invitation(
  p_invitation_id UUID,
  p_accept BOOLEAN
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_invitation RECORD;
  v_status VARCHAR(20);
  v_room_name TEXT;
  v_responder_name TEXT;
  v_joiner_id UUID;
BEGIN
  -- Fetch invitation
  SELECT * INTO v_invitation FROM public.room_invitations
  WHERE id = p_invitation_id AND status = 'PENDING';

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Invitation not found or already responded';
  END IF;

  -- Authorization check:
  -- DIRECT_INVITE: only the invitee can respond
  -- JOIN_REQUEST: only the room owner can respond
  IF v_invitation.type = 'DIRECT_INVITE' THEN
    IF auth.uid() <> v_invitation.invitee_id THEN
      RAISE EXCEPTION 'Only the invitee can respond to a direct invitation';
    END IF;
    v_joiner_id := v_invitation.invitee_id;
  ELSIF v_invitation.type = 'JOIN_REQUEST' THEN
    -- Check that responder is the room owner
    IF NOT EXISTS (
      SELECT 1 FROM public.rooms
      WHERE id = v_invitation.room_id AND owner_id = auth.uid()
    ) THEN
      RAISE EXCEPTION 'Only the room owner can respond to join requests';
    END IF;
    v_joiner_id := v_invitation.inviter_id; -- the requester becomes the joiner
  ELSE
    RAISE EXCEPTION 'Unknown invitation type';
  END IF;

  -- Get names for notifications
  SELECT name INTO v_room_name FROM public.rooms WHERE id = v_invitation.room_id;
  SELECT display_name INTO v_responder_name FROM public.profiles WHERE id = auth.uid();

  IF p_accept THEN
    v_status := 'ACCEPTED';

    -- Add user to room_members
    IF EXISTS (
      SELECT 1 FROM public.room_members
      WHERE room_id = v_invitation.room_id AND profile_id = v_joiner_id
    ) THEN
      UPDATE public.room_members
      SET left_at = NULL, role = 'MEMBER'
      WHERE room_id = v_invitation.room_id AND profile_id = v_joiner_id;
    ELSE
      INSERT INTO public.room_members (room_id, profile_id, role)
      VALUES (v_invitation.room_id, v_joiner_id, 'MEMBER');
    END IF;

    -- Add activity entry for room join
    INSERT INTO public.activities (actor_profile_id, room_id, type, message)
    VALUES (v_joiner_id, v_invitation.room_id, 'ROOM_JOIN', 'joined the room');

    -- Notify the requester if this was a JOIN_REQUEST that owner accepted
    IF v_invitation.type = 'JOIN_REQUEST' THEN
      INSERT INTO public.in_app_notifications (profile_id, type, title, body, icon_name, reference_id)
      VALUES (
        v_joiner_id,
        'ROOM_JOINED',
        'You are now part of ' || v_room_name,
        'Your join request was approved by the room owner.',
        'account-check',
        v_invitation.room_id
      );
    END IF;

    -- Keep responder's notification in notification center: mark as read & convert to non-actionable type
    UPDATE public.in_app_notifications
    SET is_read = TRUE,
        type = 'ROOM_JOINED',
        reference_id = NULL
    WHERE reference_id = p_invitation_id AND profile_id = auth.uid();
  ELSE
    v_status := 'REJECTED';

    -- Notify requester if join request was declined
    IF v_invitation.type = 'JOIN_REQUEST' THEN
      INSERT INTO public.in_app_notifications (profile_id, type, title, body, icon_name, reference_id)
      VALUES (
        v_joiner_id,
        'ROOM_JOINED',
        'Your request to join ' || v_room_name || ' was declined.',
        NULL,
        'account-remove',
        v_invitation.room_id
      );
    END IF;

    -- Rejected invitation: delete notification for responder so it vanishes completely
    DELETE FROM public.in_app_notifications
    WHERE reference_id = p_invitation_id AND profile_id = auth.uid();
  END IF;

  -- Update invitation status
  UPDATE public.room_invitations
  SET status = v_status, responded_at = NOW()
  WHERE id = p_invitation_id;

  RETURN TRUE;
END;
$$;
