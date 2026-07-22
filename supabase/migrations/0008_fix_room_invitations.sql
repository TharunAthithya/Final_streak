-- Migration 0008: Fix Room Invitations ON CONFLICT Error & Respond Flow

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

    -- Add user to room_members (Use IF EXISTS to prevent partial-index ON CONFLICT errors)
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
        'ROOM_INVITATION',
        'Your request to join ' || v_room_name || ' was accepted!',
        'You are now a member.',
        'check-circle',
        v_invitation.room_id
      );
    END IF;
  ELSE
    v_status := 'REJECTED';

    -- Notify requester if join request was declined
    IF v_invitation.type = 'JOIN_REQUEST' THEN
      INSERT INTO public.in_app_notifications (profile_id, type, title, body, icon_name, reference_id)
      VALUES (
        v_joiner_id,
        'ROOM_INVITATION',
        'Your request to join ' || v_room_name || ' was declined.',
        NULL,
        'close-circle',
        v_invitation.room_id
      );
    END IF;
  END IF;

  -- Update invitation status
  UPDATE public.room_invitations
  SET status = v_status, responded_at = NOW()
  WHERE id = p_invitation_id;

  -- Mark related notification as read
  UPDATE public.in_app_notifications
  SET is_read = TRUE
  WHERE reference_id = p_invitation_id AND profile_id = auth.uid();

  RETURN TRUE;
END;
$$;